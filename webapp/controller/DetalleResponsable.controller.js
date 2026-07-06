sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleResponsable", {
        
        onInit: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetalleResponsable").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: function (oEvent) {
            var sResponsableId = oEvent.getParameter("arguments").responsableId;
            
            // Datos universales para que la tabla siempre tenga información, sin importar qué ID se pase.
            var oSelectedUser = {
                responsable: "Responsable ID: " + sResponsableId, 
                zona: "Norte",
                kpi: { otDesviadas: 6, equiposAfectados: 4, clientesAfectados: 3, cumplimiento: 78 },
                desglose: [
                  { ot: "OT-100245", equipo: "EV-1024", cliente: "Torre Reforma", tipoOt: "Preventivo", causa: "Refacciones", retraso: 5, estado: "Pendiente" },
                  { ot: "OT-100311", equipo: "EV-0871", cliente: "Torre Reforma", tipoOt: "Preventivo", causa: "Refacciones", retraso: 4, estado: "Pendiente" },
                  { ot: "OT-100412", equipo: "EV-1330", cliente: "Plaza Galerías", tipoOt: "Preventivo", causa: "Refacciones", retraso: 1, estado: "Pendiente" },
                  { ot: "OT-100555", equipo: "Montacargas B", cliente: "Parque Delta", tipoOt: "Correctivo", causa: "Planeación", retraso: 2, estado: "Pendiente" }
                ],
                resumen: { principalCausa: "Refacciones (67%)", tipoOtDominante: "Preventivo (67%)", clienteAfectado: "Torre Reforma (50%)", equipoIncidencias: "EV-1024 (33%)" }
            };

            // Nombres reales si viene de la tabla principal
            if(sResponsableId === "1") oSelectedUser.responsable = "Juan Pérez";
            if(sResponsableId === "2") oSelectedUser.responsable = "María González";
            if(sResponsableId === "3") oSelectedUser.responsable = "Carlos Herrera";
            if(sResponsableId === "4") oSelectedUser.responsable = "Pedro López";
            if(sResponsableId === "5") oSelectedUser.responsable = "Ana Martínez";
            if(sResponsableId === "6") oSelectedUser.responsable = "Luis Ramírez";

            var oDetailModel = new JSONModel(oSelectedUser);
            this.getView().setModel(oDetailModel, "detail");
        },

        onNavBack: function () {
            window.history.go(-1);
        },

        onNavToOrder: function (oEvent) {
            var sOrder = oEvent.getSource().getText();
            MessageToast.show("Navegando al detalle de la orden: " + sOrder);
        }
    });
});
