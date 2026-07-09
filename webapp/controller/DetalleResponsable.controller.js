sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleResponsable", {

        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();

            if (oRouter && oRouter.getRoute("RouteDetalleResponsable")) {
                oRouter
                    .getRoute("RouteDetalleResponsable")
                    .attachPatternMatched(this._onObjectMatched, this);
            } else {
                this._loadDetalleResponsable("1");
            }
        },

        _onObjectMatched: function (oEvent) {
            var sResponsableId = oEvent.getParameter("arguments").responsableId || "1";
            this._loadDetalleResponsable(sResponsableId);
        },

        _loadDetalleResponsable: function (sResponsableId) {
            var oResponsable = this._getResponsableData(sResponsableId);

            var oDetailModel = new JSONModel(oResponsable);
            oDetailModel.setSizeLimit(1000);

            this.getView().setModel(oDetailModel, "detail");
        },

        _getResponsableData: function (sResponsableId) {
            var mResponsables = {
                "1": "Juan Pérez",
                "2": "María González",
                "3": "Carlos Herrera",
                "4": "Pedro López",
                "5": "Ana Martínez",
                "6": "Luis Ramírez"
            };

            var sNombreResponsable = mResponsables[sResponsableId] || "Responsable ID: " + sResponsableId;

            return {
                responsableId: sResponsableId,
                responsable: sNombreResponsable,
                zona: "Norte",
                semana: "Semana 18 (29 abr - 5 may 2024)",
                origenActivo: "Todas",

                kpi: {
                    otDesviadas: 6,
                    equiposAfectados: 4,
                    clientesAfectados: 3,
                    cumplimiento: 78
                },

                desglose: [
                    {
                        ot: "OT-100245",
                        equipo: "EV-1024",
                        cliente: "Torre Reforma",
                        tipoOt: "Preventivo",
                        causa: "Refacciones",
                        retraso: 5,
                        estado: "Pendiente"
                    },
                    {
                        ot: "OT-100311",
                        equipo: "EV-0871",
                        cliente: "Torre Reforma",
                        tipoOt: "Preventivo",
                        causa: "Refacciones",
                        retraso: 4,
                        estado: "Pendiente"
                    },
                    {
                        ot: "OT-100367",
                        equipo: "EV-1210",
                        cliente: "Corporativo ABC",
                        tipoOt: "Correctivo",
                        causa: "Cliente no disponible",
                        retraso: 2,
                        estado: "Reprogramada"
                    },
                    {
                        ot: "OT-100412",
                        equipo: "EV-1330",
                        cliente: "Plaza Galerías",
                        tipoOt: "Preventivo",
                        causa: "Refacciones",
                        retraso: 1,
                        estado: "Pendiente"
                    },
                    {
                        ot: "OT-100528",
                        equipo: "EV-1024",
                        cliente: "Torre Reforma",
                        tipoOt: "Correctivo",
                        causa: "Documentación",
                        retraso: 1,
                        estado: "En proceso"
                    },
                    {
                        ot: "OT-100579",
                        equipo: "EV-0988",
                        cliente: "Corporativo ABC",
                        tipoOt: "Preventivo",
                        causa: "Planeación",
                        retraso: 1,
                        estado: "Pendiente"
                    }
                ]
            };
        },

        onApplyFilters: function () {
            MessageToast.show("Filtros aplicados correctamente");
        },

        onNavBack: function () {
            window.history.go(-1);
        },

        onNavToOrder: function (oEvent) {
            var sOrder = oEvent.getSource().getText();

            MessageToast.show("Navegando al detalle de la orden: " + sOrder);

            /*
             * Cuando tengas la ruta real del detalle de orden,
             * puedes reemplazar el MessageToast por navegación:
             *
             * this.getOwnerComponent().getRouter().navTo("RouteDetalleOrden", {
             *     ordenId: sOrder
             * });
             */
        }

    });
});