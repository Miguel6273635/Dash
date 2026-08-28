sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
    "use strict";

    var PAGE_SIZE = 1000;
    var MAX_PAGES = 50;

    function getRowKey(oRow) {
        return oRow.BlockEventId ||
            oRow.BlockId ||
            oRow.ResourceDateId ||
            oRow.FilterCatalogId ||
            "";
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

    function fetchAll(oModel, sPath, aFilters, bOptional) {
        return new Promise(function (resolve, reject) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                var iSkip = iPage * PAGE_SIZE;

                console.log(
                    "[PD SERVICE] Consultando:",
                    sPath,
                    "página:",
                    iPage + 1
                );

                oModel.read(sPath, {
                    filters: aFilters || [],

                    urlParameters: {
                        "$format": "json",
                        "$top": String(PAGE_SIZE),
                        "$skip": String(iSkip)
                    },

                    success: function (oData) {
                        var aResults = Array.isArray(
                            oData && oData.results
                        ) ? oData.results : [];

                        var sSignature = getSignature(aResults);

                        if (
                            iPage > 0 &&
                            sSignature &&
                            sSignature === sPreviousSignature
                        ) {
                            console.warn(
                                "[PD SERVICE] " +
                                sPath +
                                " parece ignorar $skip."
                            );

                            resolve(aAll);
                            return;
                        }

                        sPreviousSignature = sSignature;
                        aAll = aAll.concat(aResults);

                        if (
                            aResults.length < PAGE_SIZE ||
                            iPage + 1 >= MAX_PAGES
                        ) {
                            console.log(
                                "[PD SERVICE] " +
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
                            "[PD SERVICE] Error en " + sPath,
                            oError
                        );

                        if (bOptional) {
                            resolve([]);
                            return;
                        }

                        reject(
                            new Error(
                                "No fue posible consultar " + sPath
                            )
                        );
                    }
                });
            }

            readPage();
        });
    }

    function getDashboardData(oModel) {
        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(
                new Error(
                    "No se encontró el modelo OData 'dashboardOData'."
                )
            );
        }

        return Promise.all([
            fetchAll(
                oModel,
                "/DashboardBlockEventsSet",
                [],
                true
            ),

            fetchAll(
                oModel,
                "/DashboardEquipmentBlocksSet",
                [],
                true
            ),

            fetchAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                true
            ),

            fetchAll(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            )
        ]).then(function (aResponses) {
            var oResult = {
                blockEvents: aResponses[0] || [],
                blocks: aResponses[1] || [],
                resources: aResponses[2] || [],
                catalogs: aResponses[3] || []
            };

            console.log(
                "[PD SERVICE] Resumen:",
                {
                    blockEvents: oResult.blockEvents.length,
                    blocks: oResult.blocks.length,
                    resources: oResult.resources.length,
                    catalogs: oResult.catalogs.length
                }
            );

            return oResult;
        });
    }

    return {
        getDashboardData: getDashboardData
    };
});