sap.ui.define([
    "mantenimiento/model/DashboardCacheODataModel"
], function (DashboardCacheODataModel) {
    "use strict";

    var PAGE_SIZE = 1000;
    var MAX_PAGES = 50;

    function getKey(oRow) {
        return (
            oRow.FilterCatalogId ||
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
            getKey(aRows[0] || {}),
            getKey(aRows[aRows.length - 1] || {})
        ]);
    }

    function fetchAll(oModel, sPath, bOptional) {
        return new Promise(function (resolve, reject) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                oModel.read(sPath, {
                    urlParameters: {
                        "$format": "json",
                        "$top": String(PAGE_SIZE),
                        "$skip": String(iPage * PAGE_SIZE)
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
                                "[EB SERVICE] " +
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
                                "[EB SERVICE]",
                                sPath,
                                aAll.length
                            );

                            resolve(aAll);
                            return;
                        }

                        iPage += 1;
                        readPage();
                    },

                    error: function (oError) {
                        console.error(
                            "[EB SERVICE] Error:",
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

    function getDashboardData(oModel) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            {},
            ["catalogs","blocks","blockOrders","orders","blockEvents","resources"]
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
                "/DashboardFilterCatalogSet",
                true
            ),

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

        ]).then(function (aResponse) {

            var oResult = {
                catalogs:
                    aResponse[0] || [],

                blocks:
                    aResponse[1] || [],

                blockOrders:
                    aResponse[2] || [],

                orders:
                    aResponse[3] || [],

                events:
                    aResponse[4] || [],

                resources:
                    aResponse[5] || []
            };

            console.log(
                "[EB SERVICE] Resumen:",
                {
                    catalogs:
                        oResult.catalogs.length,

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
        getDashboardData: getDashboardData
    };
});
