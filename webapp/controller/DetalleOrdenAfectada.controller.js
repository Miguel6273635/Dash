sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/DetalleOrdenAfectadaService",
    "mantenimiento/model/DetalleOrdenAfectadaMapper"
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
        "mantenimiento.controller.DetalleOrdenAfectada",
        {
            onInit: function () {
                var oModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                oModel.setSizeLimit(
                    5000
                );

                this.getView().setModel(
                    oModel
                );

                this._attachRoute();
            },

            _getInitialData:
                function () {
                    return {
                        busy:
                            false,

                        pageTitle:
                            "Detalle de orden afectada",

                        selectedOrderId:
                            "",

                        filters: {
                            period:
                                "currentMonth",

                            dateFrom:
                                "01/01/2026",

                            dateTo:
                                "31/12/2026",

                            orderType:
                                "all",

                            supervisor:
                                "all",

                            zone:
                                "all"
                        },

                        kpis: {
                            orderStatus:
                                "Sin datos",

                            equipment:
                                "Sin datos",

                            orderType:
                                "Sin datos",

                            commitmentDate:
                                "Sin datos",

                            plannedHours:
                                "0.0 h",

                            actualHours:
                                "0.0 h",

                            hourDeviation:
                                "(0.0 h / 0.0%)",

                            responsible:
                                "Sin datos"
                        },

                        summary: {
                            order:
                                "Sin datos",

                            orderClass:
                                "Sin datos",

                            status:
                                "Sin datos",

                            priority:
                                "Sin datos",

                            creationDate:
                                "Sin datos",

                            commitmentDate:
                                "Sin datos",

                            commitmentEnd:
                                "Sin datos",

                            client:
                                "Sin datos",

                            zone:
                                "Sin datos",

                            site:
                                "Sin datos",

                            elevator:
                                "Sin datos",

                            responsible:
                                "Sin datos",

                            equipment:
                                "Sin datos",

                            relatedAsset:
                                "Sin datos"
                        },

                        operations:
                            [],

                        history:
                            [],

                        materials:
                            [],

                        resources:
                            [],

                        impact: {
                            reason:
                                "Sin datos",

                            equipmentStatus:
                                "Sin datos",

                            managementStatus:
                                "Sin datos",

                            blockedDays:
                                "Sin datos"
                        },

                        meta:
                            {}
                    };
                },

            _attachRoute:
                function () {
                    var oRouter =
                        this.getOwnerComponent()
                            .getRouter();

                    var oRoute =
                        oRouter.getRoute(
                            "RouteDetalleOrdenAfectada"
                        );

                    if (oRoute) {
                        oRoute.attachPatternMatched(
                            this._onRouteMatched,
                            this
                        );

                        return;
                    }

                    /*
                     * Si aún no existe parámetro en la ruta,
                     * cargamos la extracción igualmente.
                     * Cuando OrdersSet tenga registros,
                     * Mapper podrá tomar la primera OT.
                     */
                    this._loadData("");
                },

            _onRouteMatched:
                function (oEvent) {
                    var oArgs =
                        oEvent.getParameter(
                            "arguments"
                        ) || {};

                    /*
                     * Soporta distintos nombres posibles
                     * mientras se termina de homologar la ruta.
                     */
                    var sOrderId =
                        oArgs.orderId ||
                        oArgs.OrderId ||
                        oArgs.order ||
                        oArgs.otId ||
                        "";

                    try {
                        sOrderId =
                            decodeURIComponent(
                                sOrderId
                            );
                    } catch (e) {
                        // Mantener valor original.
                    }

                    this.getView()
                        .getModel()
                        .setProperty(
                            "/selectedOrderId",
                            sOrderId
                        );

                    this._loadData(
                        sOrderId
                    );
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

            _loadData:
                function (
                    sOrderId,
                    bNotify
                ) {
                    var oModel =
                        this.getView()
                            .getModel();

                    var sSelectedOrderId =
                        sOrderId ||
                        oModel.getProperty(
                            "/selectedOrderId"
                        ) ||
                        "";

                    oModel.setProperty(
                        "/busy",
                        true
                    );

                    console.log(
                        "[DOA CONTROLLER] Orden:",
                        sSelectedOrderId ||
                        "(sin OrderId)"
                    );

                    Service
                        .getDashboardData(
                            this._getODataModel(),
                            sSelectedOrderId
                        )
                        .then(
                            function (
                                oRawData
                            ) {
                                var oMapped =
                                    Mapper.mapData(
                                        oRawData,
                                        sSelectedOrderId
                                    );

                                /*
                                 * Conservamos filtros seleccionados
                                 * aunque se sustituya la información.
                                 */
                                var oFilters =
                                    oModel.getProperty(
                                        "/filters"
                                    );

                                var bBusy =
                                    oModel.getProperty(
                                        "/busy"
                                    );

                                oModel.setData(
                                    Object.assign(
                                        {},
                                        oMapped,
                                        {
                                            busy:
                                                bBusy,

                                            filters:
                                                oFilters,

                                            selectedOrderId:
                                                oMapped.meta &&
                                                oMapped.meta.selectedOrderId
                                                    ? oMapped.meta.selectedOrderId
                                                    : sSelectedOrderId
                                        }
                                    )
                                );

                                console.log(
                                    "[DOA CONTROLLER] Resultado:",
                                    oMapped.meta
                                );

                                if (bNotify) {
                                    MessageToast.show(
                                        "Datos actualizados."
                                    );
                                }
                            }
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                console.error(
                                    "[DOA CONTROLLER] Error:",
                                    oError
                                );

                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "No fue posible consultar el detalle de la orden."
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

            onApplyFilters:
                function () {
                    var oModel =
                        this.getView()
                            .getModel();

                    var sOrderId =
                        oModel.getProperty(
                            "/selectedOrderId"
                        ) ||
                        "";

                    /*
                     * Aplicar filtros vuelve a consultar SAP.
                     */
                    this._loadData(
                        sOrderId,
                        true
                    );
                },

            onViewOrderStatus:
                function () {
                    this._showDetailMessage(
                        "estatus de la orden"
                    );
                },

            onViewEquipment:
                function () {
                    var sEquipment =
                        this.getView()
                            .getModel()
                            .getProperty(
                                "/kpis/equipment"
                            );

                    this._showDetailMessage(
                        "equipo " +
                        (
                            sEquipment ||
                            ""
                        )
                    );
                },

            onViewOrderType:
                function () {
                    this._showDetailMessage(
                        "tipo de orden"
                    );
                },

            onViewCommitment:
                function () {
                    this._showDetailMessage(
                        "fecha compromiso"
                    );
                },

            onViewPlannedHours:
                function () {
                    this._showDetailMessage(
                        "horas programadas"
                    );
                },

            onViewActualHours:
                function () {
                    this._showDetailMessage(
                        "horas reales"
                    );
                },

            onViewResponsible:
                function () {
                    var sResponsible =
                        this.getView()
                            .getModel()
                            .getProperty(
                                "/kpis/responsible"
                            );

                    this._showDetailMessage(
                        "responsable " +
                        (
                            sResponsible ||
                            ""
                        )
                    );
                },

            onViewOperations:
                function () {
                    this._showDetailMessage(
                        "operaciones de la orden"
                    );
                },

            onViewHistory:
                function () {
                    this._showDetailMessage(
                        "historial completo"
                    );
                },

            onViewPending:
                function () {
                    this._showDetailMessage(
                        "materiales y pendientes"
                    );
                },

            onViewResources:
                function () {
                    this._showDetailMessage(
                        "detalle de recursos"
                    );
                },

            onViewAssociatedEquipment:
                function () {
                    var sEquipment =
                        this.getView()
                            .getModel()
                            .getProperty(
                                "/summary/equipment"
                            );

                    this._showDetailMessage(
                        "equipo asociado " +
                        (
                            sEquipment ||
                            ""
                        )
                    );
                },

            _showDetailMessage:
                function (
                    sSection
                ) {
                    MessageToast.show(
                        "Abriendo " +
                        sSection
                    );
                }
        }
    );
});