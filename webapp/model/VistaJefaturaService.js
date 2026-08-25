sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
    "use strict";

    var PAGE_SIZE = 5000;
    var MAX_PAGES = 50;
    var DETAIL_CONCURRENCY = 4;
    var MATERIAL_CONCURRENCY = 3;

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

        /*
         * Contrato QAS actual:
         *
         * PlannedStartDate EQ fecha inicial
         * PlannedFinishDate EQ fecha final
         */

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

    function getSignature(aResults) {
        var oFirst;
        var oLast;

        if (
            !aResults ||
            !aResults.length
        ) {
            return "";
        }

        oFirst =
            aResults[0] || {};

        oLast =
            aResults[
                aResults.length - 1
            ] || {};

        return JSON.stringify([
            oFirst.OrderId ||
            oFirst.ResourceDateId ||
            oFirst.OrderResourceId ||
            oFirst.OperationKey ||
            oFirst.MaterialRequirementId ||
            oFirst.MaterialMovementId ||
            oFirst.FilterCatalogId ||
            "",

            oLast.OrderId ||
            oLast.ResourceDateId ||
            oLast.OrderResourceId ||
            oLast.OperationKey ||
            oLast.MaterialRequirementId ||
            oLast.MaterialMovementId ||
            oLast.FilterCatalogId ||
            ""
        ]);
    }

    function readAll(
        oModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(
            function (
                resolve,
                reject
            ) {
                var aAll = [];
                var iPage = 0;

                var sPreviousSignature =
                    "";

                function readPage() {
                    var iSkip =
                        iPage *
                        PAGE_SIZE;

                    oModel.read(
                        sPath,
                        {
                            filters:
                                aFilters ||
                                [],

                            urlParameters: {
                                "$format":
                                    "json",

                                "$top":
                                    String(
                                        PAGE_SIZE
                                    ),

                                "$skip":
                                    String(
                                        iSkip
                                    )
                            },

                            success:
                                function (
                                    oData
                                ) {
                                    var aResults =
                                        Array.isArray(
                                            oData &&
                                            oData.results
                                        )
                                            ? oData.results
                                            : [];

                                    var sSignature =
                                        getSignature(
                                            aResults
                                        );

                                    /*
                                     * Protección por si
                                     * backend ignora $skip.
                                     */

                                    if (
                                        iPage >
                                            0 &&
                                        sSignature &&
                                        sSignature ===
                                            sPreviousSignature
                                    ) {
                                        console.warn(
                                            "[VJ SERVICE] " +
                                            sPath +
                                            " parece ignorar $skip."
                                        );

                                        resolve(
                                            aAll
                                        );

                                        return;
                                    }

                                    sPreviousSignature =
                                        sSignature;

                                    aAll =
                                        aAll.concat(
                                            aResults
                                        );

                                    if (
                                        aResults.length <
                                            PAGE_SIZE ||
                                        iPage + 1 >=
                                            MAX_PAGES
                                    ) {
                                        console.log(
                                            "[VJ SERVICE] " +
                                            sPath +
                                            " -> " +
                                            aAll.length +
                                            " registros"
                                        );

                                        resolve(
                                            aAll
                                        );

                                        return;
                                    }

                                    iPage += 1;

                                    readPage();
                                },

                            error:
                                function (
                                    oError
                                ) {
                                    console.error(
                                        "[VJ SERVICE] Error en " +
                                        sPath,
                                        oError
                                    );

                                    if (
                                        bOptional
                                    ) {
                                        resolve(
                                            []
                                        );

                                        return;
                                    }

                                    reject(
                                        new Error(
                                            "No fue posible consultar " +
                                            sPath
                                        )
                                    );
                                }
                        }
                    );
                }

                readPage();
            }
        );
    }

    function uniqueStrings(
        aValues
    ) {
        var mSeen =
            Object.create(
                null
            );

        return (
            aValues ||
            []
        ).filter(
            function (
                vValue
            ) {
                var sValue =
                    String(
                        vValue ||
                        ""
                    );

                if (
                    !sValue ||
                    mSeen[
                        sValue
                    ]
                ) {
                    return false;
                }

                mSeen[
                    sValue
                ] = true;

                return true;
            }
        );
    }

    function runConcurrent(
        aValues,
        iLimit,
        fnWorker
    ) {
        var aQueue =
            (
                aValues ||
                []
            ).slice();

        var aResult = [];
        var iActive = 0;

        return new Promise(
            function (
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
                        iActive <
                            iLimit &&
                        aQueue.length
                    ) {
                        vValue =
                            aQueue.shift();

                        iActive +=
                            1;

                        Promise
                            .resolve(
                                fnWorker(
                                    vValue
                                )
                            )
                            .then(
                                function (
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
                                }
                            )
                            .catch(
                                function (
                                    oError
                                ) {
                                    console.error(
                                        "[VJ SERVICE] Error en detalle",
                                        oError
                                    );
                                }
                            )
                            .then(
                                function () {
                                    iActive -=
                                        1;

                                    next();
                                }
                            );
                    }
                }

                next();
            }
        );
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

            function (
                sOrderId
            ) {
                return readAll(
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

    function readMovementsByRequirementIds(
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
                return readAll(
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
     * ======================================================
     * CARGA PRINCIPAL
     * ======================================================
     */

    function getDashboardData(
        oModel,
        mFilters
    ) {
        var aOrdersFilters;

        if (
            !oModel ||
            typeof oModel.read !==
                "function"
        ) {
            return Promise.reject(
                new Error(
                    "No se encontró el modelo OData 'dashboardOData'."
                )
            );
        }

        aOrdersFilters =
            buildOrdersFilters(
                mFilters ||
                {}
            );

        console.log(
            "[VJ SERVICE] Cargando Vista Jefatura...",
            mFilters
        );

        /*
         * Primera fase:
         *
         * Orders
         * ResourceDaily
         * FilterCatalog
         *
         * Después:
         *
         * OrderResources por OrderId
         * Operations por OrderId
         *
         * Materiales NO bloquean
         * esta primera carga.
         */

        return Promise.all([
            readAll(
                oModel,
                "/DashboardOrdersSet",
                aOrdersFilters,
                false
            ),

            readAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                false
            ),

            readAll(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            )
        ])
            .then(
                function (
                    aBase
                ) {
                    var aOrders =
                        aBase[0] ||
                        [];

                    var aOrderIds =
                        uniqueStrings(
                            aOrders.map(
                                function (
                                    oOrder
                                ) {
                                    return (
                                        oOrder.OrderId
                                    );
                                }
                            )
                        );

                    return Promise.all([
                        Promise.resolve(
                            aOrders
                        ),

                        Promise.resolve(
                            aBase[1] ||
                            []
                        ),

                        Promise.resolve(
                            aBase[2] ||
                            []
                        ),

                        readByOrderIds(
                            oModel,

                            "/DashboardOrderResourcesSet",

                            aOrderIds,

                            DETAIL_CONCURRENCY
                        ),

                        readByOrderIds(
                            oModel,

                            "/DashboardOrderOperationsSet",

                            aOrderIds,

                            DETAIL_CONCURRENCY
                        )
                    ]);
                }
            )
            .then(
                function (
                    aData
                ) {
                    var oResult = {
                        orders:
                            aData[0] ||
                            [],

                        resources:
                            aData[1] ||
                            [],

                        catalogs:
                            aData[2] ||
                            [],

                        orderResources:
                            aData[3] ||
                            [],

                        operations:
                            aData[4] ||
                            [],

                        materials:
                            [],

                        materialMovements:
                            []
                    };

                    console.log(
                        "[VJ SERVICE] Carga principal terminada:",
                        {
                            orders:
                                oResult
                                    .orders
                                    .length,

                            resources:
                                oResult
                                    .resources
                                    .length,

                            catalogs:
                                oResult
                                    .catalogs
                                    .length,

                            orderResources:
                                oResult
                                    .orderResources
                                    .length,

                            operations:
                                oResult
                                    .operations
                                    .length
                        }
                    );

                    return oResult;
                }
            );
    }

    /*
     * ======================================================
     * MATERIALES EN SEGUNDO PLANO
     * ======================================================
     */

    function getMaterialData(
        oModel,
        aOrderIds
    ) {
        var aUniqueOrderIds =
            uniqueStrings(
                aOrderIds
            );

        if (
            !aUniqueOrderIds
                .length
        ) {
            return Promise.resolve({
                materials:
                    [],

                materialMovements:
                    []
            });
        }

        console.log(
            "[VJ SERVICE] Cargando materiales en segundo plano..."
        );

        return readByOrderIds(
            oModel,

            "/DashboardOrderMaterialsSet",

            aUniqueOrderIds,

            MATERIAL_CONCURRENCY
        )
            .then(
                function (
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

                    return readMovementsByRequirementIds(
                        oModel,
                        aRequirementIds
                    )
                        .then(
                            function (
                                aMovements
                            ) {
                                console.log(
                                    "[VJ SERVICE] Materiales terminados:",
                                    {
                                        materials:
                                            (
                                                aMaterials ||
                                                []
                                            ).length,

                                        materialMovements:
                                            (
                                                aMovements ||
                                                []
                                            ).length
                                    }
                                );

                                return {
                                    materials:
                                        aMaterials ||
                                        [],

                                    materialMovements:
                                        aMovements ||
                                        []
                                };
                            }
                        );
                }
            );
    }

    return {
        getDashboardData:
            getDashboardData,

        getMaterialData:
            getMaterialData,

        buildOrdersFilters:
            buildOrdersFilters
    };
});