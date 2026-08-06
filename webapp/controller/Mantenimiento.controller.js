sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent"
], function (Controller, JSONModel, MessageToast, UIComponent) {
    "use strict";

    return Controller.extend("mantenimiento.controller.Mantenimiento", {

        onInit: function () {
            var oDashboardModel = new JSONModel(this._getDashboardData());

            oDashboardModel.setSizeLimit(500);
            this.getView().setModel(oDashboardModel, "dash");
        },

        /**
         * Los filtros actualizan el request inmediatamente. Sustituye la parte
         * marcada para llamar a tu servicio OData/REST cuando esté disponible.
         */
        onFilterChange: function () {
            var oRequest = this._buildDashboardRequest();
            var oModel = this.getView().getModel("dash");

            oModel.setProperty("/lastRequest", oRequest);

            // Ejemplo de integración real:
            // this.getOwnerComponent().getModel().read("/DashboardMantenimiento", {
            //     urlParameters: oRequest.filtros,
            //     success: this._onDashboardLoaded.bind(this),
            //     error: this._onDashboardError.bind(this)
            // });
        },

        onAplicarFiltros: function () {
            this.onFilterChange();
            MessageToast.show("Filtros actualizados");
        },

        onVerDetalle: function (oEvent) {
            var oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            var sSection = oSource && oSource.data("section")
                ? oSource.data("section")
                : "general";
            var oRouter = UIComponent.getRouterFor(this);

            if (oRouter && oRouter.getRoute("MantenimientoDetalle")) {
                oRouter.navTo("MantenimientoDetalle", {
                    section: sSection
                });
                return;
            }

            MessageToast.show("Detalle seleccionado: " + sSection);
        },

        _buildDashboardRequest: function () {
            return {
                dashboard: "MANTENIMIENTO",
                tipoConsulta: "GENERAL",
                filtros: {
                    periodo: this._getSelectedKey("slPeriodo"),
                    fechaInicio: this._getValue("dpInicio"),
                    fechaFin: this._getValue("dpFin"),
                    zona: this._getSelectedKey("slZona"),
                    supervisor: this._getSelectedKey("slSupervisor"),
                    tipoOrden: this._getSelectedKey("slTipoOrden"),
                    turno: this._getSelectedKey("slTurno"),
                    mecanico: this._getSelectedKey("slMecanico"),
                    estadoOrden: this._getSelectedKey("slEstadoOrden")
                }
            };
        },

        _getSelectedKey: function (sControlId) {
            var oControl = this.byId(sControlId);

            return oControl && oControl.getSelectedKey
                ? oControl.getSelectedKey() || null
                : null;
        },

        _getValue: function (sControlId) {
            var oControl = this.byId(sControlId);

            return oControl && oControl.getValue
                ? oControl.getValue() || null
                : null;
        },

        _onDashboardLoaded: function (oData) {
            var oModel = this.getView().getModel("dash");

            if (!oData) {
                return;
            }

            Object.keys(oData).forEach(function (sProperty) {
                oModel.setProperty("/" + sProperty, oData[sProperty]);
            });
        },

        _onDashboardError: function () {
            MessageToast.show("No fue posible actualizar el dashboard");
        },

        _getDashboardData: function () {
            return {
                filtros: {
                    periodo: "MAYO_2024",
                    fechaInicio: "01/05/2024",
                    fechaFin: "31/05/2024",
                    zona: "TODAS",
                    supervisor: "TODOS",
                    tipoOrden: "TODOS",
                    turno: "TODOS",
                    mecanico: "TODOS",
                    estadoOrden: "TODOS"
                },
                summary: {
                    compliance: "94.8%",
                    deviation: "6.4%",
                    executed: "398 / 420",
                    forecast: "96.1%",
                    forecastExecuted: "404 / 420",
                    nonExecuted: "22",
                    nonExecutedPercent: "100%",
                    blockedOrders: "18"
                },
                causes: [
                    {
                        tone: "blue",
                        label: "Carta de no mantenimiento",
                        value: "8 (36%)",
                        width: "100%"
                    },
                    {
                        tone: "sky",
                        label: "Falta de materiales / refacciones",
                        value: "5 (23%)",
                        width: "63%"
                    },
                    {
                        tone: "green",
                        label: "Cliente no disponible",
                        value: "3 (14%)",
                        width: "38%"
                    },
                    {
                        tone: "yellow",
                        label: "Orden reprogramada",
                        value: "2 (9%)",
                        width: "25%"
                    },
                    {
                        tone: "orange",
                        label: "Mecánico no disponible",
                        value: "2 (9%)",
                        width: "25%"
                    },
                    {
                        tone: "purple",
                        label: "Información incompleta",
                        value: "1 (5%)",
                        width: "13%"
                    },
                    {
                        tone: "gray",
                        label: "Otro motivo",
                        value: "1 (4%)",
                        width: "13%"
                    }
                ],
                materials: [
                    {
                        icon: "sap-icon://action-settings",
                        name: "Refacciones",
                        unit: "(pzas)",
                        plan: "1,000 pzas",
                        real: "1,140 pzas",
                        variation: "+14%",
                        statusState: "Error",
                        planWidth: "72%",
                        realWidth: "84%"
                    },
                    {
                        icon: "sap-icon://product",
                        name: "Consumibles",
                        unit: "(pzas)",
                        plan: "600 pzas",
                        real: "570 pzas",
                        variation: "-5%",
                        statusState: "Success",
                        planWidth: "62%",
                        realWidth: "56%"
                    },
                    {
                        icon: "sap-icon://color-fill",
                        name: "Lubricantes",
                        unit: "(L)",
                        plan: "400 L",
                        real: "468 L",
                        variation: "+17%",
                        statusState: "Error",
                        planWidth: "50%",
                        realWidth: "70%"
                    },
                    {
                        icon: "sap-icon://wrench",
                        name: "Herramientas",
                        unit: "(pzas)",
                        plan: "200 pzas",
                        real: "190 pzas",
                        variation: "-5%",
                        statusState: "Success",
                        planWidth: "45%",
                        realWidth: "40%"
                    }
                ]
            };
        }
    });
});
