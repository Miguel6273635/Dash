sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.CallCenterNoAtendidas", {

        onInit: function () {
            var oModel = new JSONModel(this._getInitialData());
            this.getView().setModel(oModel);
        },

        _getInitialData: function () {
            return {
                filters: {
                    periodo: "2024-05",
                    fechaDesde: "2024-05-01",
                    fechaHasta: "2024-05-31",
                    zona: "TODAS",
                    cliente: "TODOS",
                    responsable: "TODOS"
                },

                selectedSegment: "NO_ATENDIDAS",

                analysisInfo: "Análisis basado en 3 solicitudes no atendidas.",

                kpis: {
                    planeadas: {
                        value: "65",
                        title: "Solicitudes Planeadas",
                        subtitle: ""
                    },
                    atendidas: {
                        value: "62",
                        title: "Atendidas",
                        subtitle: "95.3% del total"
                    },
                    noAtendidas: {
                        value: "3",
                        title: "No atendidas",
                        subtitle: "4.7% del total planeado"
                    },
                    cumplimiento: {
                        value: "95.3%",
                        title: "Cumplimiento",
                        subtitle: "62 de 65 solicitudes"
                    }
                },

                totales: {
                    pendientes: 3,
                    elevadores: 3,
                    promedioDias: "3 días promedio"
                },

                clientes: [
                    {
                        id: "CLI001",
                        cliente: "Torre Reforma",
                        pendientes: 1,
                        elevadores: 1,
                        dias: 4,
                        diasLabel: "4 días",
                        diasState: "Error",
                        motivo: "Cliente no disponible",
                        estado: "Crítico",
                        estadoState: "Error",
                        estadoDotClass: "ccnaDotRed",
                        expanded: true,
                        detalle: [
                            {
                                ot: "OT0582",
                                elevador: "EV0871",
                                fechaSolicitud: "27/05/2024 10:25",
                                diasLabel: "4 días",
                                diasState: "Error",
                                responsable: "Juan Pérez",
                                motivo: "Cliente no disponible",
                                notas: "Pendiente de coordinación con cliente"
                            }
                        ]
                    },
                    {
                        id: "CLI002",
                        cliente: "Plaza Satélite",
                        pendientes: 1,
                        elevadores: 1,
                        dias: 3,
                        diasLabel: "3 días",
                        diasState: "Warning",
                        motivo: "Reprogramación",
                        estado: "Alto",
                        estadoState: "Warning",
                        estadoDotClass: "ccnaDotOrange",
                        expanded: false,
                        detalle: [
                            {
                                ot: "OT0614",
                                elevador: "EV1023",
                                fechaSolicitud: "28/05/2024 09:40",
                                diasLabel: "3 días",
                                diasState: "Warning",
                                responsable: "María Gómez",
                                motivo: "Reprogramación",
                                notas: "Pendiente por disponibilidad operativa"
                            }
                        ]
                    },
                    {
                        id: "CLI003",
                        cliente: "Hospital Ángeles",
                        pendientes: 1,
                        elevadores: 1,
                        dias: 2,
                        diasLabel: "2 días",
                        diasState: "Warning",
                        motivo: "Cliente no disponible",
                        estado: "Medio",
                        estadoState: "Warning",
                        estadoDotClass: "ccnaDotYellow",
                        expanded: false,
                        detalle: [
                            {
                                ot: "OT0731",
                                elevador: "EV0448",
                                fechaSolicitud: "29/05/2024 12:15",
                                diasLabel: "2 días",
                                diasState: "Warning",
                                responsable: "Carlos Ruiz",
                                motivo: "Cliente no disponible",
                                notas: "Pendiente de confirmación del cliente"
                            }
                        ]
                    }
                ]
            };
        },

        onApplyFilters: function () {
            this._applyClientSearch();
            MessageToast.show("Filtros aplicados correctamente");
        },

        onSearchClient: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            this._applyClientSearch(sValue);
        },

        _applyClientSearch: function (sSearchValue) {
            var oList = this.byId("clientList");
            var oBinding = oList.getBinding("items");
            var aFilters = [];

            if (sSearchValue) {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("cliente", FilterOperator.Contains, sSearchValue),
                        new Filter("motivo", FilterOperator.Contains, sSearchValue),
                        new Filter("estado", FilterOperator.Contains, sSearchValue)
                    ],
                    and: false
                }));
            }

            oBinding.filter(aFilters);
        },

        onToggleCliente: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();

            if (!oContext) {
                return;
            }

            var oModel = this.getView().getModel();
            var sPath = oContext.getPath();
            var bExpanded = oModel.getProperty(sPath + "/expanded");

            oModel.setProperty(sPath + "/expanded", !bExpanded);
        },

        onOpenCliente: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();

            if (!oContext) {
                return;
            }

            var oCliente = oContext.getObject();

            MessageToast.show("Abrir detalle de solicitudes para: " + oCliente.cliente);

            /*
            Si después creas una pantalla detalle, puedes navegar así:

            this.getOwnerComponent().getRouter().navTo("RouteDetalleCallCenterCliente", {
                clienteId: oCliente.id
            });
            */
        },

        onSegmentChange: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var oModel = this.getView().getModel();

            if (sKey === "NO_ATENDIDAS") {
                oModel.setProperty("/analysisInfo", "Análisis basado en 3 solicitudes no atendidas.");
            } else {
                oModel.setProperty("/analysisInfo", "Análisis basado en 62 solicitudes atendidas.");
            }
        },

        onToggleMenu: function () {
            /*
            Déjalo conectado al menú lateral si tu layout principal usa SideNavigation.
            Si no aplica, puedes quitar este método y el botón.
            */
            MessageToast.show("Menú");
        },
        onSelectNoAtendidas: function () {
    var oModel = this.getView().getModel();

    oModel.setProperty("/selectedSegment", "NO_ATENDIDAS");
    oModel.setProperty("/analysisInfo", "Análisis basado en 3 solicitudes no atendidas.");
},

onSelectAtendidas: function () {
    var oModel = this.getView().getModel();

    oModel.setProperty("/selectedSegment", "ATENDIDAS");
    oModel.setProperty("/analysisInfo", "Análisis basado en 62 solicitudes atendidas.");
},

    });
});