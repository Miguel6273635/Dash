sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Filter,
    FilterOperator
) {
    "use strict";

    var PAGE_SIZE = 5000;

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
            oDate = new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        } else {
            oDate = new Date(sValue);
        }

        return Number.isNaN(oDate.getTime())
            ? null
            : oDate;
    }

    function fetchEntity(
        oODataModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(function (
            resolve,
            reject
        ) {
            console.log(
                "[DDH SERVICE] Consultando:",
                sPath
            );

            oODataModel.read(sPath, {
                filters: aFilters || [],

                urlParameters: {
                    "$format": "json",
                    "$top": String(PAGE_SIZE)
                },

                success: function (oData) {
                    var aResults =
                        Array.isArray(
                            oData &&
                            oData.results
                        )
                            ? oData.results
                            : [];

                    console.log(
                        "[DDH SERVICE] " +
                        sPath +
                        " -> " +
                        aResults.length +
                        " registros"
                    );

                    console.log(
                        "[DDH SERVICE] Muestra " +
                        sPath +
                        ":",
                        aResults.slice(0, 3)
                    );

                    resolve(aResults);
                },

                error: function (oError) {
                    console.error(
                        "[DDH SERVICE] Error en " +
                        sPath +
                        ":",
                        oError
                    );

                    /*
                     * Los EntitySets auxiliares se consideran opcionales
                     * durante la integración. Si ABAP todavía no los
                     * implementa, la pantalla sigue mostrando OrdersSet
                     * y el Mapper marca "Sin datos".
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
        });
    }

    function buildOrdersFilters(mFilters) {
        var aFilters = [];
        var oStartDate;
        var oEndDate;

        mFilters = mFilters || {};

        oStartDate =
            parseInputDate(
                mFilters.fechaDesde
            );

        oEndDate =
            parseInputDate(
                mFilters.fechaHasta
            );

        /*
         * Este servicio utiliza ambos EQ como extremos del periodo,
         * siguiendo el contrato ya utilizado por DashboardOrdersSet.
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

    function getDashboardData(
        oODataModel,
        mFilters
    ) {
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

        aOrdersFilters =
            buildOrdersFilters(
                mFilters
            );

        console.log(
            "[DDH SERVICE] Cargando Detalle de desviación de horas..."
        );

        console.log(
            "[DDH SERVICE] Filtros:",
            mFilters
        );

        /*
         * Orders es el único EntitySet obligatorio para permitir
         * mostrar la población base.
         *
         * Operations, Confirmations, OrderResources, ResourceDaily
         * y FilterCatalog quedan tolerantes a vacío/error mientras
         * ABAP completa la extracción.
         */
        return Promise.all([
            fetchEntity(
                oODataModel,
                "/DashboardOrdersSet",
                aOrdersFilters,
                false
            ),

            fetchEntity(
                oODataModel,
                "/DashboardOrderOperationsSet",
                [],
                true
            ),

            fetchEntity(
                oODataModel,
                "/DashboardOrderConfirmationsSet",
                [],
                true
            ),

            fetchEntity(
                oODataModel,
                "/DashboardOrderResourcesSet",
                [],
                true
            ),

            fetchEntity(
                oODataModel,
                "/DashboardResourceDailySet",
                [],
                true
            ),

            fetchEntity(
                oODataModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            )
        ]).then(function (aResponses) {
            var oRawData = {
                orders:
                    aResponses[0] || [],

                operations:
                    aResponses[1] || [],

                confirmations:
                    aResponses[2] || [],

                orderResources:
                    aResponses[3] || [],

                resources:
                    aResponses[4] || [],

                catalogs:
                    aResponses[5] || []
            };

            console.log(
                "[DDH SERVICE] Carga terminada:",
                {
                    orders:
                        oRawData.orders.length,

                    operations:
                        oRawData.operations.length,

                    confirmations:
                        oRawData.confirmations.length,

                    orderResources:
                        oRawData.orderResources.length,

                    resources:
                        oRawData.resources.length,

                    catalogs:
                        oRawData.catalogs.length
                }
            );

            return oRawData;
        });
    }

    return {
        getDashboardData:
            getDashboardData,

        buildOrdersFilters:
            buildOrdersFilters
    };
});