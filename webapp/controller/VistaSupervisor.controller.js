sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.VistaSupervisor",
        {
            onInit: function () {
                var oViewModel = new JSONModel({
                    filters: {
                        period: "05-2025",
                        dateFrom: "01/05/2025",
                        dateTo: "31/05/2025",
                        supervisor: "SERGIO_RAMIREZ",
                        shift: "ALL",
                        dirty: false
                    },

                    kpis: {
                        assigned: 18,
                        mechanics: 11,
                        helpers: 7,
                        availableCapacity: 828,
                        scheduledLoad: 713,
                        overCapacity: 5,
                        compliance: 78,
                        complianceTarget: 85,
                        complianceGap: 7
                    },

                    utilization: {
                        critical: [
                            {
                                name: "Juan Pérez",
                                utilization: 132,
                                resourceText: "2 recursos"
                            },
                            {
                                name: "Luis Herrera",
                                utilization: 125,
                                resourceText: "2 recursos"
                            }
                        ],

                        high: [
                            {
                                name: "Ana Rodríguez",
                                utilization: 116,
                                resourceText: "1 recurso"
                            },
                            {
                                name: "Diego García",
                                utilization: 108,
                                resourceText: "2 recursos"
                            }
                        ],

                        normal: [
                            {
                                name: "Marco Chávez",
                                utilization: 97,
                                resourceText: "1 recurso"
                            },
                            {
                                name: "José Vargas",
                                utilization: 89,
                                resourceText: "1 recurso"
                            },
                            {
                                name: "Guillermo Bautista",
                                utilization: 78,
                                resourceText: "1 recurso"
                            }
                        ],

                        low: [
                            {
                                name: "Omar Campos",
                                utilization: 65,
                                resourceText: "1 recurso"
                            },
                            {
                                name: "Fernando López",
                                utilization: 60,
                                resourceText: "1 recurso"
                            },
                            {
                                name: "Ricardo Martínez",
                                utilization: 50,
                                resourceText: "1 recurso"
                            }
                        ]
                    }
                });

                oViewModel.setDefaultBindingMode("TwoWay");
                oViewModel.setSizeLimit(100);

                this.getView().setModel(
                    oViewModel,
                    "supervisor"
                );
            },

            onFilterChange: function () {
                this.getView()
                    .getModel("supervisor")
                    .setProperty("/filters/dirty", true);
            },

            onApplyFilters: function () {
                var oModel = this.getView().getModel("supervisor");
                var oFilters = oModel.getProperty("/filters");

                /*
                 * Sustituir posteriormente por la lectura OData:
                 *
                 * this._loadSupervisorDashboard(oFilters);
                 */

                oModel.setProperty("/filters/dirty", false);

                MessageToast.show(
                    "Filtros aplicados: " +
                    oFilters.dateFrom +
                    " - " +
                    oFilters.dateTo
                );
            }
        }
    );
});