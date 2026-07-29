sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.VistaJefatura",
        {
            onInit: function () {
                var oDashboardData = {
                    filters: {
                        period: "2025-05",
                        dateFrom: "01/05/2025",
                        dateTo: "31/05/2025",
                        management: "NORTE",
                        supervisor: "ALL",
                        shift: "ALL",
                        dirty: false
                    },

                    utilization: {
                        critical: [
                            {
                                name: "Sergio Ramírez",
                                percentage: "132%",
                                resources: 12
                            }
                        ],

                        high: [
                            {
                                name: "María Gómez",
                                percentage: "116%",
                                resources: 11
                            },
                            {
                                name: "Carlos López",
                                percentage: "109%",
                                resources: 10
                            }
                        ],

                        normal: [
                            {
                                name: "Patricia Soto",
                                percentage: "78%",
                                resources: 10
                            },
                            {
                                name: "Jorge Martínez",
                                percentage: "71%",
                                resources: 12
                            }
                        ],

                        low: [
                            {
                                name: "Luis Herrera",
                                percentage: "65%",
                                resources: 12
                            },
                            {
                                name: "Ana Torres",
                                percentage: "62%",
                                resources: 8
                            },
                            {
                                name: "Roberto Díaz",
                                percentage: "60%",
                                resources: 7
                            }
                        ]
                    }
                };

                var oDashboardModel = new JSONModel(oDashboardData);

                oDashboardModel.setDefaultBindingMode("TwoWay");

                this.getView().setModel(
                    oDashboardModel,
                    "dashboard"
                );
            },

            onFilterChange: function () {
                this.getView()
                    .getModel("dashboard")
                    .setProperty("/filters/dirty", true);
            },

            onApplyFilters: function () {
                var oModel = this.getView().getModel("dashboard");
                var oFilters = oModel.getProperty("/filters");

                /*
                 * Aquí puedes sustituir los datos locales por una
                 * llamada al servicio OData.
                 *
                 * Ejemplo:
                 *
                 * this.getView().getModel().read("/VistaJefaturaSet", {
                 *     filters: aFilters,
                 *     success: this._onDashboardLoaded.bind(this),
                 *     error: this._onDashboardLoadError.bind(this)
                 * });
                 */

                oModel.setProperty("/filters/dirty", false);

                MessageToast.show(
                    "Filtros aplicados: " +
                    oFilters.dateFrom +
                    " - " +
                    oFilters.dateTo
                );
            },

            onViewSupervisor: function () {
                this._navigateOrNotify(
                    "DetalleSupervisor",
                    "La ruta DetalleSupervisor aún no está declarada."
                );
            },

            onAssignments: function () {
                this._navigateOrNotify(
                    "AsignacionesJefatura",
                    "La ruta AsignacionesJefatura aún no está declarada."
                );
            },

            onCapacityBalance: function () {
                this._navigateOrNotify(
                    "BalanceCapacidadJefatura",
                    "La ruta BalanceCapacidadJefatura aún no está declarada."
                );
            },

            _navigateOrNotify: function (
                sRouteName,
                sFallbackMessage
            ) {
                var oOwnerComponent = this.getOwnerComponent();
                var oRouter =
                    oOwnerComponent &&
                    oOwnerComponent.getRouter();

                if (
                    oRouter &&
                    oRouter.getRoute(sRouteName)
                ) {
                    oRouter.navTo(sRouteName);
                    return;
                }

                MessageToast.show(sFallbackMessage);
            }
        }
    );
});