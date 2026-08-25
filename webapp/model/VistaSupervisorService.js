sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Filter,
    FilterOperator
) {
    "use strict";

    var DETAIL_CONCURRENCY = 2;
    var MATERIAL_CONCURRENCY = 2;

    function parseInputDate(sValue) {
        var aMatch;
        var oDate;

        if (!sValue) {
            return null;
        }

        aMatch = String(sValue).match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

        if (aMatch) {
            return new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        }

        oDate = new Date(sValue);

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
    }

    function buildOrdersFilters(mFilters) {
        var aFilters = [];

        var oDateFrom =
            parseInputDate(
                mFilters &&
                mFilters.dateFrom
            );

        var oDateTo =
            parseInputDate(
                mFilters &&
                mFilters.dateTo
            );

        if (oDateFrom) {
            aFilters.push(
                new Filter(
                    "PlannedStartDate",
                    FilterOperator.EQ,
                    oDateFrom
                )
            );
        }

        if (oDateTo) {
            aFilters.push(
                new Filter(
                    "PlannedFinishDate",
                    FilterOperator.EQ,
                    oDateTo
                )
            );
        }

        return aFilters;
    }

    function readEntity(
        oModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(function (
            resolve,
            reject
        ) {
            oModel.read(sPath, {
                filters:
                    aFilters || [],

                urlParameters: {
                    "$format":
                        "json"
                },

                success:
                    function (oData) {
                        var aResults =
                            Array.isArray(
                                oData &&
                                oData.results
                            )
                                ? oData.results
                                : [];

                        console.log(
                            "[VS SERVICE] " +
                            sPath +
                            " -> " +
                            aResults.length
                        );

                        resolve(
                            aResults
                        );
                    },

                error:
                    function (oError) {
                        console.error(
                            "[VS SERVICE] Error " +
                            sPath,
                            oError
                        );

                        if (bOptional) {
                            resolve([]);
                            return;
                        }

                        reject(
                            new Error(
                                "No fue posible consultar " +
                                sPath
                            )
                        );
                    }
            });
        });
    }

    function uniqueStrings(aValues) {
        var mSeen =
            Object.create(null);

        return (aValues || [])
            .filter(function (vValue) {
                var sValue =
                    String(
                        vValue || ""
                    );

                if (
                    !sValue ||
                    mSeen[sValue]
                ) {
                    return false;
                }

                mSeen[sValue] =
                    true;

                return true;
            });
    }

    function runConcurrent(
        aValues,
        iLimit,
        fnWorker
    ) {
        var aQueue =
            (aValues || []).slice();

        var aResult = [];
        var iActive = 0;

        return new Promise(function (
            resolve
        ) {
            function next() {
                var vValue;

                if (
                    !aQueue.length &&
                    iActive === 0
                ) {
                    resolve(
                        aResult
                    );

                    return;
                }

                while (
                    iActive < iLimit &&
                    aQueue.length
                ) {
                    vValue =
                        aQueue.shift();

                    iActive += 1;

                    Promise.resolve(
                        fnWorker(vValue)
                    )
                        .then(function (
                            aRows
                        ) {
                            if (
                                Array.isArray(
                                    aRows
                                ) &&
                                aRows.length
                            ) {
                                aResult =
                                    aResult.concat(
                                        aRows
                                    );
                            }
                        })
                        .catch(function (
                            oError
                        ) {
                            console.error(
                                "[VS SERVICE] Detalle:",
                                oError
                            );
                        })
                        .then(function () {
                            iActive -= 1;
                            next();
                        });
                }
            }

            next();
        });
    }

    function readByOrderIds(
        oModel,
        sPath,
        aOrderIds,
        iConcurrency
    ) {
        return runConcurrent(
            uniqueStrings(
                aOrderIds
            ),

            iConcurrency ||
            DETAIL_CONCURRENCY,

            function (sOrderId) {
                return readEntity(
                    oModel,
                    sPath,
                    [
                        new Filter(
                            "OrderId",
                            FilterOperator.EQ,
                            sOrderId
                        )
                    ],
                    true
                );
            }
        );
    }

    function readMovements(
        oModel,
        aRequirementIds
    ) {
        return runConcurrent(
            uniqueStrings(
                aRequirementIds
            ),

            MATERIAL_CONCURRENCY,

            function (
                sRequirementId
            ) {
                return readEntity(
                    oModel,

                    "/DashboardMaterialMovementsSet",

                    [
                        new Filter(
                            "MaterialRequirementId",
                            FilterOperator.EQ,
                            sRequirementId
                        )
                    ],

                    true
                );
            }
        );
    }

    /*
     * ==================================================
     * FASE 1
     * Orders + ResourceDaily + FilterCatalog
     * ==================================================
     */

    function getBaseData(
        oModel,
        mFilters
    ) {
        if (
            !oModel ||
            typeof oModel.read !==
                "function"
        ) {
            return Promise.reject(
                new Error(
                    "No se encontró dashboardOData."
                )
            );
        }

        return Promise.all([
            readEntity(
                oModel,

                "/DashboardOrdersSet",

                buildOrdersFilters(
                    mFilters || {}
                ),

                true
            ),

            readEntity(
                oModel,

                "/DashboardResourceDailySet",

                [],

                true
            ),

            readEntity(
                oModel,

                "/DashboardFilterCatalogSet",

                [],

                true
            )
        ])
            .then(function (
                aResponses
            ) {
                return {
                    orders:
                        aResponses[0] ||
                        [],

                    resources:
                        aResponses[1] ||
                        [],

                    catalogs:
                        aResponses[2] ||
                        [],

                    orderResources:
                        [],

                    operations:
                        [],

                    materials:
                        [],

                    materialMovements:
                        []
                };
            });
    }

    /*
     * ==================================================
     * FASE 2
     * OrderResources + Operations
     * ==================================================
     */

    function getOperationalData(
        oModel,
        aOrderIds
    ) {
        var aIds =
            uniqueStrings(
                aOrderIds
            );

        if (!aIds.length) {
            return Promise.resolve({
                orderResources:
                    [],

                operations:
                    []
            });
        }

        return Promise.all([
            readByOrderIds(
                oModel,

                "/DashboardOrderResourcesSet",

                aIds,

                DETAIL_CONCURRENCY
            ),

            readByOrderIds(
                oModel,

                "/DashboardOrderOperationsSet",

                aIds,

                DETAIL_CONCURRENCY
            )
        ])
            .then(function (
                aResponses
            ) {
                return {
                    orderResources:
                        aResponses[0] ||
                        [],

                    operations:
                        aResponses[1] ||
                        []
                };
            });
    }

    /*
     * ==================================================
     * FASE 3
     * Materials + Movements
     * ==================================================
     */

    function getMaterialData(
        oModel,
        aOrderIds
    ) {
        var aIds =
            uniqueStrings(
                aOrderIds
            );

        if (!aIds.length) {
            return Promise.resolve({
                materials:
                    [],

                materialMovements:
                    []
            });
        }

        return readByOrderIds(
            oModel,

            "/DashboardOrderMaterialsSet",

            aIds,

            MATERIAL_CONCURRENCY
        )
            .then(function (
                aMaterials
            ) {
                var aRequirementIds =
                    uniqueStrings(
                        (
                            aMaterials ||
                            []
                        ).map(
                            function (
                                oMaterial
                            ) {
                                return (
                                    oMaterial
                                        .MaterialRequirementId
                                );
                            }
                        )
                    );

                return readMovements(
                    oModel,
                    aRequirementIds
                )
                    .then(function (
                        aMovements
                    ) {
                        return {
                            materials:
                                aMaterials ||
                                [],

                            materialMovements:
                                aMovements ||
                                []
                        };
                    });
            });
    }

    return {
        getBaseData:
            getBaseData,

        getOperationalData:
            getOperationalData,

        getMaterialData:
            getMaterialData,

        buildOrdersFilters:
            buildOrdersFilters
    };
});