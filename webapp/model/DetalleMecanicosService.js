sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
    "use strict";

    var PAGE_SIZE = 5000;
    var MAX_PAGES = 50;

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
            oFirst.ResourceDateId ||
            oFirst.OrderResourceId ||
            oFirst.OperationKey ||
            oFirst.ConfirmationId ||
            oFirst.OrderId ||
            oFirst.FilterCatalogId ||
            "",

            oLast.ResourceDateId ||
            oLast.OrderResourceId ||
            oLast.OperationKey ||
            oLast.ConfirmationId ||
            oLast.OrderId ||
            oLast.FilterCatalogId ||
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
                    "[DM SERVICE] Consultando:",
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

                    success: function (oData) {
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
                         * Evita bucle si backend ignora $skip.
                         */
                        if (
                            iPage > 0 &&
                            sSignature &&
                            sSignature ===
                            sPreviousSignature
                        ) {
                            console.warn(
                                "[DM SERVICE] " +
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
                                "[DM SERVICE] " +
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
                            "[DM SERVICE] Error en " +
                            sPath,
                            oError
                        );

                        /*
                         * Mientras ABAP termina los EntitySets
                         * auxiliares, la pantalla no se cae.
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
                mFilters
            );

        console.log(
            "[DM SERVICE] Cargando Detalle de mecánicos...",
            mFilters
        );

        return Promise.all([
            /*
             * Principal de esta pantalla.
             */
            fetchAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                false
            ),

            fetchAll(
                oModel,
                "/DashboardOrdersSet",
                aOrdersFilters,
                false
            ),

            fetchAll(
                oModel,
                "/DashboardOrderResourcesSet",
                [],
                true
            ),

            fetchAll(
                oModel,
                "/DashboardOrderOperationsSet",
                [],
                true
            ),

            fetchAll(
                oModel,
                "/DashboardOrderConfirmationsSet",
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
            var oRaw = {
                resources:
                    aResponses[0] || [],

                orders:
                    aResponses[1] || [],

                orderResources:
                    aResponses[2] || [],

                operations:
                    aResponses[3] || [],

                confirmations:
                    aResponses[4] || [],

                catalogs:
                    aResponses[5] || []
            };

            console.log(
                "[DM SERVICE] Carga terminada:",
                {
                    resources:
                        oRaw.resources.length,

                    orders:
                        oRaw.orders.length,

                    orderResources:
                        oRaw.orderResources.length,

                    operations:
                        oRaw.operations.length,

                    confirmations:
                        oRaw.confirmations.length,

                    catalogs:
                        oRaw.catalogs.length
                }
            );

            return oRaw;
        });
    }

    return {
        getDashboardData:
            getDashboardData,

        buildOrdersFilters:
            buildOrdersFilters
    };
});