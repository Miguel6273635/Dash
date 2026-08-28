sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/FichaEquipoBloqueadoService",
    "mantenimiento/model/FichaEquipoBloqueadoMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.FichaEquipoBloqueado",
        {
            onInit: function () {
                var oDetailModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                oDetailModel.setSizeLimit(
                    5000
                );

                this.getView().setModel(
                    oDetailModel,
                    "detalle"
                );

                this._loadData();
            },

            _getInitialData:
                function () {
                    return {
                        busy:
                            false,

                        equipment: {
                            id:
                                "Sin datos",

                            client:
                                "Sin datos",

                            zone:
                                "Sin datos",

                            supervisor:
                                "Sin datos",

                            site:
                                "Sin datos",

                            address:
                                "Sin datos",

                            type:
                                "Sin datos",

                            model:
                                "Sin datos"
                        },

                        kpis: {
                            blockStatus: {
                                value:
                                    "Sin datos",

                                label:
                                    "Estatus de bloqueo"
                            },

                            blockedDays: {
                                value:
                                    "Sin datos",

                                label:
                                    "Días bloqueado"
                            },

                            affectedOrders: {
                                value:
                                    "0",

                                label:
                                    "Órdenes afectadas"
                            },

                            pendingUnlock: {
                                value:
                                    "0",

                                label:
                                    "Pendientes de desbloqueo"
                            },

                            priority: {
                                value:
                                    "Sin datos",

                                label:
                                    "Prioridad desbloqueo"
                            },

                            commitmentDate: {
                                value:
                                    "Sin datos",

                                label:
                                    "Fecha compromiso"
                            }
                        },

                        blockInformation: {
                            reason:
                                "Sin datos",

                            managementStatus:
                                "Sin datos",

                            blockDate:
                                "Sin datos",

                            responsible:
                                "Sin datos",

                            nextAction:
                                "Sin datos",

                            commitmentDate:
                                "Sin datos",

                            observation:
                                "Sin datos"
                        },

                        orders:
                            [],

                        pendingItems:
                            [],

                        history:
                            [],

                        meta:
                            {}
                    };
                },

            _getODataModel:
                function () {
                    var oComponent =
                        this.getOwnerComponent();

                    return (
                        oComponent &&
                        oComponent.getModel(
                            "dashboardOData"
                        )
                    ) ||
                    (
                        oComponent &&
                        oComponent.getModel()
                    );
                },

            _getSelection:
                function () {
                    /*
                     * Por ahora vacío porque no tenemos
                     * confirmado el parámetro de tu ruta.
                     *
                     * Cuando la navegación mande EquipmentId
                     * o BlockId, aquí lo conectamos.
                     */
                    return {
                        equipmentId:
                            "",

                        blockId:
                            ""
                    };
                },

            _loadData:
                function () {
                    var oModel =
                        this.getView()
                            .getModel(
                                "detalle"
                            );

                    oModel.setProperty(
                        "/busy",
                        true
                    );

                    Service
                        .getDashboardData(
                            this._getODataModel()
                        )
                        .then(
                            function (
                                oRawData
                            ) {
                                var oMapped =
                                    Mapper.mapData(
                                        oRawData,
                                        this._getSelection()
                                    );

                                oModel.setData(
                                    Object.assign(
                                        {
                                            busy:
                                                true
                                        },
                                        oMapped
                                    )
                                );

                                console.log(
                                    "[FICHA CONTROLLER] Resultado:",
                                    oMapped.meta
                                );
                            }.bind(this)
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                console.error(
                                    "[FICHA CONTROLLER] Error:",
                                    oError
                                );

                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "No fue posible consultar el detalle del equipo bloqueado."
                                );
                            }
                        )
                        .finally(
                            function () {
                                oModel.setProperty(
                                    "/busy",
                                    false
                                );
                            }
                        );
                },

            onOrderPress:
                function (
                    oEvent
                ) {
                    var oContext =
                        oEvent
                            .getSource()
                            .getBindingContext(
                                "detalle"
                            );

                    var sOrder =
                        oContext
                            ? oContext.getProperty(
                                "order"
                            )
                            : "";

                    if (!sOrder) {
                        MessageToast.show(
                            "No fue posible identificar la orden."
                        );

                        return;
                    }

                    MessageToast.show(
                        "Orden seleccionada: " +
                        sOrder
                    );
                },

            onViewAllOrders:
                function () {
                    var oModel =
                        this.getView()
                            .getModel(
                                "detalle"
                            );

                    var sEquipoId =
                        oModel.getProperty(
                            "/equipment/id"
                        ) ||
                        "";

                    MessageToast.show(
                        "Consulta de órdenes afectadas del equipo " +
                        sEquipoId
                    );
                },

            onViewAllPending:
                function () {
                    var oModel =
                        this.getView()
                            .getModel(
                                "detalle"
                            );

                    var sEquipoId =
                        oModel.getProperty(
                            "/equipment/id"
                        ) ||
                        "";

                    MessageToast.show(
                        "Consulta de pendientes del equipo " +
                        sEquipoId
                    );
                }
        }
    );
});