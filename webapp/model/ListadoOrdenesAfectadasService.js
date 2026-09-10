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
    var DETAIL_CONCURRENCY = 4;

    function getRowKey(oRow) {
        return (
            oRow.BlockOrderId ||
            oRow.BlockId ||
            oRow.OrderId ||
            oRow.OrderResourceId ||
            oRow.ResourceDateId ||
            oRow.FilterCatalogId ||
            ""
        );
    }

    function getSignature(aResults) {
        if (!aResults || !aResults.length) {
            return "";
        }

        return JSON.stringify([
            getRowKey(aResults[0] || {}),
            getRowKey(aResults[aResults.length - 1] || {})
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
                    "[LOA SERVICE] Consultando:",
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
                            String(PAGE_SIZE),

                        "$skip":
                            String(iSkip)
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

                        /*
                         * Protección si el backend
                         * ignora $skip.
                         */
                        if (
                            iPage > 0 &&
                            sSignature &&
                            sSignature ===
                                sPreviousSignature
                        ) {
                            console.warn(
                                "[LOA SERVICE] " +
                                    sPath +
                                    " parece ignorar $skip."
                            );

                            resolve(aAll);
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
                                "[LOA SERVICE] " +
                                    sPath +
                                    " -> " +
                                    aAll.length +
                                    " registros"
                            );

                            resolve(aAll);
                            return;
                        }

                        iPage += 1;
                        readPage();
                    },

                    error: function (
                        oError
                    ) {
                        console.error(
                            "[LOA SERVICE] Error en " +
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
            }

            readPage();
        });
    }

    function uniqueStrings(
        aValues
    ) {
        var mSeen =
            Object.create(null);

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
                    resolve(aResult);
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
                                Array.isArray(aRows) &&
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
                                "[LOA SERVICE] Error de detalle:",
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

    function readOrdersByIds(
        oModel,
        aOrderIds
    ) {
        return runConcurrent(
            uniqueStrings(aOrderIds),
            DETAIL_CONCURRENCY,
            function (
                sOrderId
            ) {
                return fetchAll(
                    oModel,
                    "/DashboardOrdersSet",
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

    function readOrderResourcesByIds(
        oModel,
        aOrderIds
    ) {
        return runConcurrent(
            uniqueStrings(aOrderIds),
            DETAIL_CONCURRENCY,
            function (
                sOrderId
            ) {
                return fetchAll(
                    oModel,
                    "/DashboardOrderResourcesSet",
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

    function getDashboardData(
        oModel
    ) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            {},
            ["orders","assignments","blockOrders","blocks","catalogs","resources"]
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
         * PRIMERA ETAPA
         *
         * DashboardBlockOrdersSet es el puente
         * que define cuáles órdenes están afectadas.
         */
        return Promise.all([
            fetchAll(
                oModel,
                "/DashboardBlockOrdersSet",
                [],
                false
            ),

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
            var aBlockOrders =
                aBaseResponses[0] || [];

            var aBlocks =
                aBaseResponses[1] || [];

            var aCatalogs =
                aBaseResponses[2] || [];

            var aResources =
                aBaseResponses[3] || [];

            var aOrderIds =
                uniqueStrings(
                    aBlockOrders.map(
                        function (
                            oRelation
                        ) {
                            return (
                                oRelation.OrderId
                            );
                        }
                    )
                );

            console.log(
                "[LOA SERVICE] Órdenes afectadas distintas:",
                aOrderIds.length
            );

            /*
             * Si no existen relaciones bloqueo-orden,
             * no se marcan órdenes normales como afectadas.
             */
            if (!aOrderIds.length) {
                return {
                    blockOrders:
                        aBlockOrders,

                    blocks:
                        aBlocks,

                    orders:
                        [],

                    orderResources:
                        [],

                    resources:
                        aResources,

                    catalogs:
                        aCatalogs
                };
            }

            /*
             * SEGUNDA ETAPA
             *
             * Se consultan únicamente las órdenes
             * y asignaciones realmente relacionadas
             * por DashboardBlockOrdersSet.
             */
            return Promise.all([
                readOrdersByIds(
                    oModel,
                    aOrderIds
                ),

                readOrderResourcesByIds(
                    oModel,
                    aOrderIds
                )
            ]).then(function (
                aDetailResponses
            ) {
                return {
                    blockOrders:
                        aBlockOrders,

                    blocks:
                        aBlocks,

                    orders:
                        aDetailResponses[0] ||
                        [],

                    orderResources:
                        aDetailResponses[1] ||
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
            getDashboardData
    };
});
