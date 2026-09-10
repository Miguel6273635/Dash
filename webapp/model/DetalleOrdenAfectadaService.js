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

    function getKey(oRow) {
        return (
            oRow.FilterCatalogId ||
            oRow.OrderId ||
            oRow.OperationKey ||
            oRow.ConfirmationId ||
            oRow.OrderResourceId ||
            oRow.ResourceDateId ||
            oRow.BlockId ||
            oRow.BlockOrderId ||
            oRow.MaterialRequirementId ||
            oRow.RequirementId ||
            oRow.OrderEventId ||
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

    function fetchAll(
        oModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(function (resolve, reject) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                var iSkip = iPage * PAGE_SIZE;

                console.log(
                    "[DOA SERVICE] Consultando:",
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
                        )
                            ? oData.results
                            : [];

                        var sSignature =
                            getSignature(aResults);

                        if (
                            iPage > 0 &&
                            sSignature &&
                            sSignature === sPreviousSignature
                        ) {
                            console.warn(
                                "[DOA SERVICE] " +
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
                                "[DOA SERVICE] " +
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
                            "[DOA SERVICE] Error en " +
                            sPath,
                            oError
                        );

                        /*
                         * Mientras ABAP termina de poblar los EntitySets,
                         * una entidad vacía/no disponible no debe romper
                         * toda la pantalla.
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

    function createOrderFilter(sOrderId) {
        if (!sOrderId) {
            return [];
        }

        return [
            new Filter(
                "OrderId",
                FilterOperator.EQ,
                sOrderId
            )
        ];
    }

    function getDashboardData(
        oModel,
        sOrderId
    ) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            {},
            ["catalogs","orders","operations","confirmations","assignments","resources","blocks","blockOrders","materials","requirements","events"]
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

        var aOrderFilters =
            createOrderFilter(sOrderId);

        /*
         * Se consultan los 11 EntitySets definidos
         * por la especificación funcional.
         *
         * Las entidades relacionadas a OrderId se filtran
         * cuando la pantalla recibe una orden concreta.
         */
        return Promise.all([

            // 1. Catálogos
            fetchAll(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            ),

            // 2. Orden principal
            fetchAll(
                oModel,
                "/DashboardOrdersSet",
                aOrderFilters,
                true
            ),

            // 3. Operaciones
            fetchAll(
                oModel,
                "/DashboardOrderOperationsSet",
                aOrderFilters,
                true
            ),

            // 4. Confirmaciones
            fetchAll(
                oModel,
                "/DashboardOrderConfirmationsSet",
                aOrderFilters,
                true
            ),

            // 5. Recursos asignados
            fetchAll(
                oModel,
                "/DashboardOrderResourcesSet",
                aOrderFilters,
                true
            ),

            // 6. Maestro/recurso diario
            fetchAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                true
            ),

            // 7. Bloqueos
            fetchAll(
                oModel,
                "/DashboardEquipmentBlocksSet",
                [],
                true
            ),

            // 8. Relación bloqueo-orden
            fetchAll(
                oModel,
                "/DashboardBlockOrdersSet",
                aOrderFilters,
                true
            ),

            // 9. Materiales
            fetchAll(
                oModel,
                "/DashboardOrderMaterialsSet",
                aOrderFilters,
                true
            ),

            // 10. Requisitos
            fetchAll(
                oModel,
                "/DashboardOrderRequirementsSet",
                aOrderFilters,
                true
            ),

            // 11. Historial
            fetchAll(
                oModel,
                "/DashboardOrderEventsSet",
                aOrderFilters,
                true
            )

        ]).then(function (aResponse) {

            var oResult = {
                catalogs:
                    aResponse[0] || [],

                orders:
                    aResponse[1] || [],

                operations:
                    aResponse[2] || [],

                confirmations:
                    aResponse[3] || [],

                orderResources:
                    aResponse[4] || [],

                resources:
                    aResponse[5] || [],

                blocks:
                    aResponse[6] || [],

                blockOrders:
                    aResponse[7] || [],

                materials:
                    aResponse[8] || [],

                requirements:
                    aResponse[9] || [],

                events:
                    aResponse[10] || []
            };

            console.log(
                "[DOA SERVICE] Resumen extracción:",
                {
                    catalogs:
                        oResult.catalogs.length,

                    orders:
                        oResult.orders.length,

                    operations:
                        oResult.operations.length,

                    confirmations:
                        oResult.confirmations.length,

                    orderResources:
                        oResult.orderResources.length,

                    resources:
                        oResult.resources.length,

                    blocks:
                        oResult.blocks.length,

                    blockOrders:
                        oResult.blockOrders.length,

                    materials:
                        oResult.materials.length,

                    requirements:
                        oResult.requirements.length,

                    events:
                        oResult.events.length
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