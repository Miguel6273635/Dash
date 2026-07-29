sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleOperativoJefaturas",
        {
            /**
             * Inicialización de la pantalla.
             */
            onInit: function () {
                var oDashboardData = {
                    busy: false,

                    kpis: {
                        activeManagements: {
                            value: "6"
                        },

                        totalResources: {
                            value: "128"
                        },

                        availableCapacity: {
                            value: "6,305 h"
                        },

                        scheduledLoad: {
                            value: "5,245 h"
                        },

                        averageUtilization: {
                            value: "83%"
                        },

                        operationalCompliance: {
                            value: "70%"
                        }
                    },

                    rows: [
                        {
                            id: "J01",
                            jefatura: "J01 - Jefatura Taller Norte",
                            manager: "Carlos Ramírez",
                            supervisors: "4",
                            resources: "28",
                            capacity: "1,420",
                            scheduledLoad: "1,105",
                            utilization: "78%",
                            utilizationNumber: 78,
                            status: "Normal",
                            statusState: "Success",
                            overCapacity: "2",
                            compliance: "82%",
                            target: "80%",
                            difference: "+2 pp",
                            differenceState: "Success",
                            zone: "NORTH",
                            shift: "MORNING",
                            serviceType: "ALL",
                            resourceType: "ALL",
                            isTotal: false
                        },
                        {
                            id: "J02",
                            jefatura: "J02 - Jefatura Taller Centro",
                            manager: "Laura Méndez",
                            supervisors: "3",
                            resources: "24",
                            capacity: "1,180",
                            scheduledLoad: "1,180",
                            utilization: "100%",
                            utilizationNumber: 100,
                            status: "Normal",
                            statusState: "Success",
                            overCapacity: "3",
                            compliance: "75%",
                            target: "80%",
                            difference: "-5 pp",
                            differenceState: "Error",
                            zone: "CENTER",
                            shift: "MORNING",
                            serviceType: "ALL",
                            resourceType: "ALL",
                            isTotal: false
                        },
                        {
                            id: "J03",
                            jefatura: "J03 - Jefatura Taller Sur",
                            manager: "Javier Morales",
                            supervisors: "4",
                            resources: "26",
                            capacity: "1,250",
                            scheduledLoad: "1,525",
                            utilization: "122%",
                            utilizationNumber: 122,
                            status: "Crítico",
                            statusState: "Error",
                            overCapacity: "11",
                            compliance: "58%",
                            target: "80%",
                            difference: "-22 pp",
                            differenceState: "Error",
                            zone: "SOUTH",
                            shift: "AFTERNOON",
                            serviceType: "CORRECTIVE",
                            resourceType: "ALL",
                            isTotal: false
                        },
                        {
                            id: "J04",
                            jefatura: "J04 - Jefatura Campo Norte",
                            manager: "Miguel Torres",
                            supervisors: "3",
                            resources: "18",
                            capacity: "880",
                            scheduledLoad: "730",
                            utilization: "83%",
                            utilizationNumber: 83,
                            status: "Normal",
                            statusState: "Success",
                            overCapacity: "1",
                            compliance: "72%",
                            target: "80%",
                            difference: "-8 pp",
                            differenceState: "Error",
                            zone: "NORTH",
                            shift: "MORNING",
                            serviceType: "PREVENTIVE",
                            resourceType: "ALL",
                            isTotal: false
                        },
                        {
                            id: "J05",
                            jefatura: "J05 - Jefatura Campo Centro",
                            manager: "Ana Sánchez",
                            supervisors: "3",
                            resources: "16",
                            capacity: "790",
                            scheduledLoad: "850",
                            utilization: "108%",
                            utilizationNumber: 108,
                            status: "Alto",
                            statusState: "Warning",
                            overCapacity: "4",
                            compliance: "65%",
                            target: "80%",
                            difference: "-15 pp",
                            differenceState: "Error",
                            zone: "CENTER",
                            shift: "AFTERNOON",
                            serviceType: "CORRECTIVE",
                            resourceType: "MECHANIC",
                            isTotal: false
                        },
                        {
                            id: "J06",
                            jefatura: "J06 - Jefatura Campo Sur",
                            manager: "Roberto Díaz",
                            supervisors: "2",
                            resources: "16",
                            capacity: "785",
                            scheduledLoad: "855",
                            utilization: "109%",
                            utilizationNumber: 109,
                            status: "Alto",
                            statusState: "Warning",
                            overCapacity: "5",
                            compliance: "66%",
                            target: "80%",
                            difference: "-14 pp",
                            differenceState: "Error",
                            zone: "SOUTH",
                            shift: "AFTERNOON",
                            serviceType: "EMERGENCY",
                            resourceType: "ASSISTANT",
                            isTotal: false
                        },
                        {
                            id: "TOTAL",
                            jefatura: "Total general",
                            manager: "—",
                            supervisors: "19",
                            resources: "128",
                            capacity: "6,305",
                            scheduledLoad: "5,245",
                            utilization: "83%",
                            utilizationNumber: 83,
                            status: "—",
                            statusState: "None",
                            overCapacity: "26",
                            compliance: "70%",
                            target: "80%",
                            difference: "-10 pp",
                            differenceState: "Error",
                            isTotal: true
                        }
                    ]
                };

                var oDashboardModel = new JSONModel(oDashboardData);

                oDashboardModel.setSizeLimit(100);

                this.getView().setModel(oDashboardModel);
            },

            /**
             * Aplica visualmente los filtros seleccionados.
             * En la integración real, aquí se ejecutará la llamada OData.
             */
            onApplyFilters: function () {
                var oModel = this.getView().getModel();

                var oFilters = {
                    period: this.byId("periodSelect").getSelectedKey(),
                    dateFrom: this.byId("dateFromPicker").getValue(),
                    dateTo: this.byId("dateToPicker").getValue(),
                    management: this.byId("managementSelect").getSelectedKey(),
                    managementHead: this.byId(
                        "managementHeadSelect"
                    ).getSelectedKey(),
                    zone: this.byId("zoneSelect").getSelectedKey(),
                    shift: this.byId("shiftSelect").getSelectedKey(),
                    serviceType: this.byId(
                        "serviceTypeSelect"
                    ).getSelectedKey(),
                    resourceType: this.byId(
                        "resourceTypeSelect"
                    ).getSelectedKey()
                };

                oModel.setProperty("/busy", true);

                window.setTimeout(function () {
                    oModel.setProperty("/busy", false);

                    MessageToast.show(
                        "Filtros aplicados correctamente",
                        {
                            duration: 1800
                        }
                    );
                }, 450);

                /*
                 * La variable oFilters queda preparada para sustituir
                 * este comportamiento por la llamada al servicio OData.
                 *
                 * Ejemplo:
                 *
                 * this.getOwnerComponent()
                 *     .getModel()
                 *     .read("/DetalleJefaturasSet", {
                 *         filters: [...]
                 *     });
                 */

                return oFilters;
            },

            /**
             * Acción correspondiente al enlace "Adaptar filtros".
             */
            onAdaptFilters: function () {
                MessageToast.show(
                    "Los filtros visibles pueden configurarse desde esta opción"
                );
            },

            /**
             * Marca visualmente la fila de total general.
             */
            onTableUpdateFinished: function () {
                var oTable = this.byId("jefaturasTable");

                if (!oTable) {
                    return;
                }

                oTable.getItems().forEach(function (oItem) {
                    var oContext = oItem.getBindingContext();
                    var bIsTotal = false;

                    if (oContext) {
                        bIsTotal = Boolean(
                            oContext.getProperty("isTotal")
                        );
                    }

                    oItem.toggleStyleClass(
                        "dojTotalRow",
                        bIsTotal
                    );
                });
            },

            /**
             * Navegación hacia la pantalla de una jefatura.
             */
            onViewJefatura: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext();

                if (!oContext) {
                    return;
                }

                var oSelectedManagement = oContext.getObject();
                var oComponent = this.getOwnerComponent();
                var oRouter = oComponent.getRouter();

                /*
                 * Se guarda la jefatura seleccionada para que la siguiente
                 * pantalla pueda obtenerla mediante:
                 *
                 * this.getOwnerComponent()
                 *     .getModel("selectedJefatura")
                 *     .getData();
                 */
                oComponent.setModel(
                    new JSONModel(oSelectedManagement),
                    "selectedJefatura"
                );

                /*
                 * Esta ruta coincide con la Vista Jefatura trabajada
                 * previamente. Si en tu manifest tiene otro nombre,
                 * cambia únicamente "RouteVistaJefatura".
                 */
                if (
                    oRouter &&
                    oRouter.getRoute("RouteVistaJefatura")
                ) {
                    oRouter.navTo("RouteVistaJefatura");
                    return;
                }

                MessageToast.show(
                    "Jefatura seleccionada: " +
                    oSelectedManagement.jefatura
                );
            }
        }
    );
});