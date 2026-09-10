sap.ui.define([

    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "mantenimiento/model/DashboardCacheODataModel"
], function (
    Filter,
    FilterOperator,
    DashboardCacheODataModel
) {
    "use strict";

    var PAGE_SIZE = 5000;

    function parseInputDate(sValue) {
        var aMatch;
        var oDate;

        if (!sValue) {
            return null;
        }

        aMatch = String(sValue).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

        if (aMatch) {
            oDate = new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        } else {
            oDate = new Date(sValue);
        }

        return Number.isNaN(oDate.getTime()) ? null : oDate;
    }

    function fetchEntity(oODataModel, sPath, aFilters, bOptional) {
        return new Promise(function (resolve, reject) {
            console.log("[SERVICE] Iniciando petición a:", sPath);

            oODataModel.read(sPath, {
                filters: aFilters || [],
                urlParameters: {
                    "$format": "json",
                    "$top": String(PAGE_SIZE)
                },

                success: function (oData) {
                    var aResults = Array.isArray(oData && oData.results)
                        ? oData.results
                        : [];

                    console.log(
                        "[SERVICE] Éxito en " + sPath + ". Registros:",
                        aResults.length
                    );

                    console.log(
                        "[SERVICE] Muestra " + sPath + ":",
                        aResults.slice(0, 3)
                    );

                    resolve(aResults);
                },

                error: function (oError) {
                    console.error(
                        "[SERVICE] Fallo en " + sPath + ":",
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
        });
    }

    function buildOrdersFilters(mFilters) {
        var aFilters = [];
        var oStartDate;
        var oEndDate;

        mFilters = mFilters || {};

        oStartDate = parseInputDate(mFilters.fechaDesde);
        oEndDate = parseInputDate(mFilters.fechaHasta);

        /*
         * El GET_ENTITYSET actual de DashboardOrdersSet utiliza
         * estos dos filtros EQ como extremos del periodo solicitado.
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

    function getDashboardData(oODataModel, mFilters) {
        oODataModel = DashboardCacheODataModel.wrap(
            oODataModel,
            mFilters,
            ["orders","operations","confirmations","resources","assignments","catalogs"]
        );

        var aOrdersFilters;

        if (
            !oODataModel ||
            typeof oODataModel.read !== "function"
        ) {
            return Promise.reject(
                new Error(
                    "No se encontró el modelo OData 'dashboardOData'."
                )
            );
        }

        aOrdersFilters = buildOrdersFilters(mFilters);

        console.log(
            "[SERVICE] Iniciando carga de Detalle Capacidad Zona (6 EntitySets)..."
        );

        console.log(
            "[SERVICE] Filtros enviados:",
            mFilters
        );

        return Promise.all([
            fetchEntity(
                oODataModel,
                "/DashboardOrdersSet",
                aOrdersFilters,
                false
            ),

            /*
             * Los auxiliares se relacionan en BTP por OrderId/ResourceId.
             * No mandamos filtros de PlannedStartDate a Confirmations,
             * porque ese EntitySet usa ActualStartDate/ActualFinishDate.
             */
            fetchEntity(
                oODataModel,
                "/DashboardOrderOperationsSet",
                [],
                false
            ),

            fetchEntity(
                oODataModel,
                "/DashboardOrderConfirmationsSet",
                [],
                false
            ),

            fetchEntity(
                oODataModel,
                "/DashboardResourceDailySet",
                [],
                false
            ),

            fetchEntity(
                oODataModel,
                "/DashboardOrderResourcesSet",
                [],
                false
            ),

            fetchEntity(
                oODataModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            )
        ]).then(function (aResponses) {
            var oRawData = {
                orders: aResponses[0] || [],
                operations: aResponses[1] || [],
                confirmations: aResponses[2] || [],
                resources: aResponses[3] || [],
                orderResources: aResponses[4] || [],
                catalogs: aResponses[5] || []
            };

            console.log(
                "[SERVICE] Carga terminada:",
                {
                    orders: oRawData.orders.length,
                    operations: oRawData.operations.length,
                    confirmations: oRawData.confirmations.length,
                    resources: oRawData.resources.length,
                    orderResources: oRawData.orderResources.length,
                    catalogs: oRawData.catalogs.length
                }
            );

            return oRawData;
        });
    }

    return {
        getDashboardData: getDashboardData,
        buildOrdersFilters: buildOrdersFilters
    };
});