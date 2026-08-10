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
        "mantenimiento.controller.AnalisisReparacionesPlaneadasNoEjecutadas",
        {

            onInit: function () {
                var oData = this._getMockData();

                var oModel = new JSONModel(oData);
                oModel.setSizeLimit(200);

                this.getView().setModel(
                    oModel,
                    "otpe"
                );
            },

            onToggleMenu: function () {
                MessageToast.show(
                    "Menú lateral disponible desde la barra principal."
                );
            },

            onApplyFilters: function () {
                var oModel =
                    this.getView().getModel("otpe");

                var oFilters =
                    oModel.getProperty("/filters");

                console.log(
                    "Filtros:",
                    oFilters
                );

                MessageToast.show(
                    "Filtros aplicados"
                );
            },

            onToggleCausa: function (oEvent) {
                var oButton = oEvent.getSource();
                var sPath = oButton.data("path");

                if (!sPath) {
                    return;
                }

                var oModel =
                    this.getView().getModel("otpe");

                var bExpanded =
                    !!oModel.getProperty(sPath);

                /*
                 * Cierra las demás causas antes de abrir una.
                 * Así la pantalla mantiene siempre un alto controlado.
                 */

                oModel.setProperty(
                    "/causas/0/expanded",
                    false
                );

                oModel.setProperty(
                    "/causas/1/expanded",
                    false
                );

                oModel.setProperty(
                    "/causas/2/expanded",
                    false
                );

                oModel.setProperty(
                    sPath,
                    !bExpanded
                );
            },

            onSelectNoEjecutadas: function () {
                MessageToast.show(
                    "Ya estás viendo las reparaciones planeadas no ejecutadas."
                );
            },

            onSelectEjecutadas: function () {
                var oRouter =
                    this.getOwnerComponent().getRouter();

                if (
                    oRouter.getRoute(
                        "RouteAnalisisReparacionesPlaneadasEjecutadas"
                    )
                ) {
                    oRouter.navTo(
                        "RouteAnalisisReparacionesPlaneadasEjecutadas"
                    );

                    return;
                }

                MessageToast.show(
                    "Falta registrar RouteAnalisisReparacionesPlaneadasEjecutadas en el manifest."
                );
            },

            onSelectTodas: function () {
                MessageToast.show(
                    "Vista de todas las reparaciones pendiente de conectar."
                );
            },

            onSearchCausa: function (oEvent) {
                var sValue =
                    oEvent.getParameter("newValue") ||
                    "";

                console.log(
                    "Buscar causa:",
                    sValue
                );
            },

            _getMockData: function () {
                return {
                    filters: {
                        periodo: "Mayo 2024",
                        fechaDesde: "01/05/2024",
                        fechaHasta: "31/05/2024",
                        zona: "Todas",
                        cliente: "Todos",
                        responsable: "Todos"
                    },

                    catalogos: {
                        periodos: [
                            {
                                key: "Mayo 2024",
                                text: "Mayo 2024"
                            },
                            {
                                key: "Junio 2024",
                                text: "Junio 2024"
                            }
                        ],

                        zonas: [
                            {
                                key: "Todas",
                                text: "Todas"
                            },
                            {
                                key: "Norte",
                                text: "Norte"
                            },
                            {
                                key: "Centro",
                                text: "Centro"
                            },
                            {
                                key: "Sur",
                                text: "Sur"
                            },
                            {
                                key: "Este",
                                text: "Este"
                            },
                            {
                                key: "Oeste",
                                text: "Oeste"
                            }
                        ],

                        clientes: [
                            {
                                key: "Todos",
                                text: "Todos"
                            },
                            {
                                key: "Torre Reforma",
                                text: "Torre Reforma"
                            },
                            {
                                key: "Plaza Satélite",
                                text: "Plaza Satélite"
                            },
                            {
                                key: "Hospital Ángeles",
                                text: "Hospital Ángeles"
                            }
                        ],

                        responsables: [
                            {
                                key: "Todos",
                                text: "Todos"
                            },
                            {
                                key: "Juan Pérez",
                                text: "Juan Pérez"
                            },
                            {
                                key: "Carlos Herrera",
                                text: "Carlos Herrera"
                            },
                            {
                                key: "Pedro López",
                                text: "Pedro López"
                            }
                        ]
                    },

                    kpis: {
                        planeadas: "95",
                        ejecutadas: "88",
                        noEjecutadas: "7",
                        cumplimiento: "92.6%"
                    },

                    causas: [
                        {
                            causa: "Falta de refacciones",
                            material: "Sensor de puerta",
                            otNoEjecutadas: "4",
                            porcentaje: "57%",
                            equipos: "4",
                            clientes: "3",
                            dias: "6 días",
                            expanded: true
                        },
                        {
                            causa: "Espera de proveedor",
                            material: "Rodamiento guía",
                            otNoEjecutadas: "2",
                            porcentaje: "29%",
                            equipos: "2",
                            clientes: "2",
                            dias: "5 días",
                            expanded: false
                        },
                        {
                            causa: "Reprogramación",
                            material: "-",
                            otNoEjecutadas: "1",
                            porcentaje: "14%",
                            equipos: "1",
                            clientes: "1",
                            dias: "4 días",
                            expanded: false
                        }
                    ]
                };
            }

        }
    );
});