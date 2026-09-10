sap.ui.define([
    "mantenimiento/model/DashboardCacheODataModel"
], function (DashboardCacheODataModel) {
    "use strict";

    var PAGE_SIZE = 1000;
    var MAX_PAGES = 50;

    function getRowKey(oRow) {
        return (
            oRow.BlockId ||
            oRow.BlockOrderId ||
            oRow.OrderId ||
            oRow.BlockEventId ||
            oRow.ResourceDateId ||
            ""
        );
    }

    function getSignature(aRows) {
        if (!aRows || !aRows.length) {
            return "";
        }

        return JSON.stringify([
            getRowKey(aRows[0] || {}),
            getRowKey(aRows[aRows.length - 1] || {})
        ]);
    }

    function fetchAll(oModel, sPath, bOptional) {
        return new Promise(function (resolve, reject) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                var iSkip = iPage * PAGE_SIZE;

                console.log(
                    "[FICHA SERVICE] Consultando:",
                    sPath,
                    "página:",
                    iPage + 1
                );

                oModel.read(sPath, {
                    urlParameters: {
                        "$format": "json",
                        "$top": String(PAGE_SIZE),
                        "$skip": String(iSkip)
                    },

                    success: function (oData) {
                        var aResults = Array.isArray(
                            oData && oData.results
                        ) ? oData.results : [];

                        var sSignature =
                            getSignature(aResults);

                        if (
                            iPage > 0 &&
                            sSignature &&
                            sSignature === sPreviousSignature
                        ) {
                            console.warn(
                                "[FICHA SERVICE] " +
                                sPath +
                                " parece ignorar $skip."
                            );

                            resolve(aAll);
                            return;
                        }

                        sPreviousSignature =
                            sSignature;

                        aAll =
                            aAll.concat(aResults);

                        if (
                            aResults.length < PAGE_SIZE ||
                            iPage + 1 >= MAX_PAGES
                        ) {
                            console.log(
                                "[FICHA SERVICE] " +
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

                    error: function (oError) {
                        console.error(
                            "[FICHA SERVICE] Error:",
                            sPath,
                            oError
                        );

                        /*
                         * Mientras ABAP completa los EntitySets,
                         * no derribamos toda la pantalla por un
                         * EntitySet todavía vacío/no implementado.
                         */
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

    function getDashboardData(oModel) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            {},
            ["blocks","blockOrders","orders","blockEvents","resources"]
        );
        if (
            !oModel ||
            typeof oModel.read !== "function"
        ) {
            return Promise.reject(
                new Error(
                    "No se encontró el modelo OData dashboardOData."
                )
            );
        }

        return Promise.all([
            fetchAll(
                oModel,
                "/DashboardEquipmentBlocksSet",
                true
            ),

            fetchAll(
                oModel,
                "/DashboardBlockOrdersSet",
                true
            ),

            fetchAll(
                oModel,
                "/DashboardOrdersSet",
                true
            ),

            fetchAll(
                oModel,
                "/DashboardBlockEventsSet",
                true
            ),

            fetchAll(
                oModel,
                "/DashboardResourceDailySet",
                true
            )
        ]).then(function (aResponses) {
            var oResult = {
                blocks:
                    aResponses[0] || [],

                blockOrders:
                    aResponses[1] || [],

                orders:
                    aResponses[2] || [],

                events:
                    aResponses[3] || [],

                resources:
                    aResponses[4] || []
            };

            console.log(
                "[FICHA SERVICE] Resumen:",
                {
                    blocks:
                        oResult.blocks.length,

                    blockOrders:
                        oResult.blockOrders.length,

                    orders:
                        oResult.orders.length,

                    events:
                        oResult.events.length,

                    resources:
                        oResult.resources.length
                }
            );

            return oResult;
        });
    }

    return {
        getDashboardData:
            getDashboardData
    };
});