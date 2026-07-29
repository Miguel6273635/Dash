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
                        shift: "ALL"
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

                    resources: [
                        {
                            name: "Juan Pérez",
                            utilization: 132,
                            resourceText: "2 recursos",
                            level: "critical"
                        },
                        {
                            name: "Ana Rodríguez",
                            utilization: 116,
                            resourceText: "1 recurso",
                            level: "high"
                        },
                        {
                            name: "Marco Chávez",
                            utilization: 97,
                            resourceText: "1 recurso",
                            level: "normal"
                        },
                        {
                            name: "Omar Campos",
                            utilization: 65,
                            resourceText: "1 recurso",
                            level: "low"
                        },
                        {
                            name: "Luis Herrera",
                            utilization: 125,
                            resourceText: "2 recursos",
                            level: "critical"
                        },
                        {
                            name: "Diego García",
                            utilization: 108,
                            resourceText: "2 recursos",
                            level: "high"
                        },
                        {
                            name: "José Vargas",
                            utilization: 89,
                            resourceText: "1 recurso",
                            level: "normal"
                        },
                        {
                            name: "Fernando López",
                            utilization: 60,
                            resourceText: "1 recurso",
                            level: "low"
                        },
                        {
                            name: "Guillermo Bautista",
                            utilization: 78,
                            resourceText: "1 recurso",
                            level: "normal"
                        },
                        {
                            name: "Ricardo Martínez",
                            utilization: 50,
                            resourceText: "1 recurso",
                            level: "low"
                        }
                    ]
                });

                oViewModel.setSizeLimit(100);

                this.getView().setModel(
                    oViewModel,
                    "supervisor"
                );
            },

            onFilterChange: function () {
                /*
                 * Los valores seleccionados se actualizan automáticamente
                 * en el JSONModel mediante el binding.
                 *
                 * Aquí se pueden agregar validaciones adicionales.
                 */
            },

            onApplyFilters: function () {
                var oModel = this.getView().getModel("supervisor");
                var oFilters = oModel.getProperty("/filters");

                /*
                 * Sustituir posteriormente por la lectura OData:
                 *
                 * this._loadSupervisorDashboard(oFilters);
                 */

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