sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent"
], function (Controller, JSONModel, MessageToast, UIComponent) {
    "use strict";

    return Controller.extend("mantenimiento.controller.Mantenimiento", {

        onInit: function () {
            var oModel = new JSONModel(this._getMockDashboardData());

            oModel.setSizeLimit(200);
            this.getView().setModel(oModel, "dash");
        },

        onFilterChange: function () {
            var oRequest = this._buildDashboardRequest();

            console.group(
                "DASHBOARD EJECUTIVO DE MANTENIMIENTO - FILTROS"
            );
            console.log(JSON.stringify(oRequest, null, 2));
            console.groupEnd();
        },

        onActualizar: function () {
            this.onFilterChange();
            MessageToast.show("Dashboard actualizado");
        },

        onVerDetalle: function (oEvent) {
            var sSection =
                oEvent.getSource().data("section") || "general";

            var oRouter =
                UIComponent.getRouterFor(this);

            console.log(
                "Detalle solicitado:",
                sSection
            );

            if (!oRouter) {
                MessageToast.show(
                    "No se encontró el router de la aplicación"
                );
                return;
            }

            /*
             * Habilitar cuando exista la ruta de detalle:
             *
             * oRouter.navTo("MantenimientoDetalle", {
             *     section: sSection
             * });
             */

            MessageToast.show(
                "Detalle seleccionado: " + sSection
            );
        },

        _buildDashboardRequest: function () {
            return {
                dashboard: "MANTENIMIENTO",
                tipoConsulta: "GENERAL",

                filtros: {
                    periodo:
                        this.byId("slPeriodo")
                            .getSelectedKey() || null,

                    fechaInicio:
                        this.byId("dpInicio")
                            .getValue() || null,

                    fechaFin:
                        this.byId("dpFin")
                            .getValue() || null,

                    zona:
                        this.byId("slZona")
                            .getSelectedKey() || null,

                    supervisor:
                        this.byId("slSupervisor")
                            .getSelectedKey() || null,

                    tipoOrden:
                        this.byId("slTipoOrden")
                            .getSelectedKey() || null,

                    turno:
                        this.byId("slTurno")
                            .getSelectedKey() || null
                }
            };
        },

        _getMockDashboardData: function () {
            return {
                summary: {
                    compliance: "94.8",
                    deviation: "6.4",
                    executed: 398,
                    planned: 420,
                    forecast: "96.1",
                    forecastExecuted: 404,
                    nonExecuted: 22,
                    nonExecutedPercent: "5.2",
                    blockedOrders: 18
                },

                capacity: {
                    mechanics: 76,
                    workdays: 21,
                    availableHours: "6,400",
                    scheduledHours: "5,900",
                    usedHours: "5,842",
                    committedPercent: "92.1",
                    availableMargin: 500
                }
            };
        }
    });
});