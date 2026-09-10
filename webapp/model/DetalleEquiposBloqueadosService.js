sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
,
    "mantenimiento/model/DashboardCacheODataModel"
], function (
    Filter,
    FilterOperator
,
    DashboardCacheODataModel
) {    "use strict";

    var PAGE_SIZE = 1000;
    var MAX_PAGES = 50;
    var DETAIL_CONCURRENCY = 3;

    function parseInputDate(sValue) {
        var aMatch;
        var oDate;

        if (!sValue) {
            return null;
        }

        aMatch = String(sValue).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (aMatch) {
            return new Date(
                Number(aMatch[1]),
                Number(aMatch[2]) - 1,
                Number(aMatch[3])
            );
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
        var oStartDate;
        var oEndDate;

        mFilters = mFilters || {};

        oStartDate = parseInputDate(
            mFilters.fechaDesde
        );

        oEndDate = parseInputDate(
            mFilters.fechaHasta
        );

        /*
         * Se conserva el patrón que ya funciona
         * en el servicio QAS actual.
         */
        if (oStartDate) {
            aFilters.push(
                new Filter(
                    "PlannedStartDate",
                    FilterOperator.EQ,
                    oStartDate
                )
            );
        }

        if (oEndDate) {
            aFilters.push(
                new Filter(
                    "PlannedFinishDate",
                    FilterOperator.EQ,
                    oEndDate
                )
            );
        }

        return aFilters;
    }

    function getSignature(aResults) {
        var oFirst;
        var oLast;

        if (!aResults || !aResults.length) {
            return "";
        }

        oFirst = aResults[0] || {};
        oLast = aResults[aResults.length - 1] || {};

        return JSON.stringify([
            oFirst.BlockId ||
                oFirst.BlockOrderId ||
                oFirst.BlockEventId ||
                oFirst.ResourceDateId ||
                oFirst.FilterCatalogId ||
                oFirst.OrderId ||
                "",

            oLast.BlockId ||
                oLast.BlockOrderId ||
                oLast.BlockEventId ||
                oLast.ResourceDateId ||
                oLast.FilterCatalogId ||
                oLast.OrderId ||
                ""
        ]);
    }

    function fetchAll(
        oModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(function (
            resolve,
            reject
        ) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                var iSkip =
                    iPage * PAGE_SIZE;

                console.log(
                    "[DEB SERVICE] Consultando:",
                    sPath,
                    "página:",
                    iPage + 1
                );

                oModel.read(sPath, {
                    filters:
                        aFilters || [],

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

                    success: function (
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

                        if (
                            iPage > 0 &&
                            sSignature &&
                            sSignature ===
                                sPreviousSignature
                        ) {
                            console.warn(
                                "[DEB SERVICE] " +
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
                                "[DEB SERVICE] " +
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

                    error: function (
                        oError
                    ) {
                        console.error(
                            "[DEB SERVICE] Error en " +
                                sPath,
                            oError
                        );

                        if (bOptional) {
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
                });
            }

            readPage();
        });
    }

    function uniqueStrings(aValues) {
        var mSeen =
            Object.create(
                null
            );

        return (
            aValues || []
        ).filter(function (
            vValue
        ) {
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
            (
                aValues || []
            ).slice();

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
                    iActive <
                        iLimit &&
                    aQueue.length
                ) {
                    vValue =
                        aQueue.shift();

                    iActive += 1;

                    Promise.resolve(
                        fnWorker(
                            vValue
                        )
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
                                "[DEB SERVICE] Error detalle:",
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

    function readByBlockIds(
        oModel,
        sPath,
        aBlockIds
    ) {
        return runConcurrent(
            uniqueStrings(
                aBlockIds
            ),

            DETAIL_CONCURRENCY,

            function (
                sBlockId
            ) {
                return fetchAll(
                    oModel,
                    sPath,
                    [
                        new Filter(
                            "BlockId",
                            FilterOperator.EQ,
                            sBlockId
                        )
                    ],
                    true
                );
            }
        );
    }

    function getDashboardData(
        oModel,
        mFilters
    ) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            mFilters,
            ["blocks","catalogs","resources","blockOrders","blockEvents","orders"]
        );
        var aOrdersFilters =
            buildOrdersFilters(
                mFilters
            );

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

        /*
         * PASO 1
         * Siempre intentamos primero la fuente oficial.
         */
        return Promise.all([
            fetchAll(
                oModel,
                "/DashboardEquipmentBlocksSet",
                [],
                false
            ),

            fetchAll(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            ),

            fetchAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                true
            )
        ]).then(function (
            aBaseResponses
        ) {
            var aBlocks =
                aBaseResponses[0] ||
                [];

            var aCatalogs =
                aBaseResponses[1] ||
                [];

            var aResources =
                aBaseResponses[2] ||
                [];

            var aBlockIds =
                uniqueStrings(
                    aBlocks.map(
                        function (
                            oBlock
                        ) {
                            return (
                                oBlock.BlockId
                            );
                        }
                    )
                );

            /*
             * MODO OFICIAL
             *
             * Si ABAP ya entrega bloqueos,
             * se ignora por completo el fallback.
             */
            if (
                aBlockIds.length
            ) {
                console.log(
                    "[DEB SERVICE] Fuente utilizada: BLOCKS"
                );

                return Promise.all([
                    readByBlockIds(
                        oModel,
                        "/DashboardBlockOrdersSet",
                        aBlockIds
                    ),

                    readByBlockIds(
                        oModel,
                        "/DashboardBlockEventsSet",
                        aBlockIds
                    )
                ]).then(function (
                    aDetailResponses
                ) {
                    return {
                        sourceMode:
                            "BLOCKS",

                        blocks:
                            aBlocks,

                        ordersFallback:
                            [],

                        blockOrders:
                            aDetailResponses[0] ||
                            [],

                        blockEvents:
                            aDetailResponses[1] ||
                            [],

                        resources:
                            aResources,

                        catalogs:
                            aCatalogs
                    };
                });
            }

            /*
             * FALLBACK TEMPORAL
             *
             * Sólo se ejecuta cuando
             * DashboardEquipmentBlocksSet está vacío.
             *
             * No consulta Operations, Confirmations
             * ni OrderResources.
             */
            console.warn(
                "[DEB SERVICE] DashboardEquipmentBlocksSet vacío."
            );

            console.log(
                "[DEB SERVICE] Fuente utilizada: ORDERS_FALLBACK"
            );

            return fetchAll(
                oModel,
                "/DashboardOrdersSet",
                aOrdersFilters,
                true
            ).then(function (
                aOrders
            ) {
                return {
                    sourceMode:
                        "ORDERS_FALLBACK",

                    blocks:
                        [],

                    ordersFallback:
                        aOrders || [],

                    blockOrders:
                        [],

                    blockEvents:
                        [],

                    resources:
                        aResources,

                    catalogs:
                        aCatalogs
                };
            });
        });
    }

    return {
        getDashboardData:
            getDashboardData,

        buildOrdersFilters:
            buildOrdersFilters
    };
});
