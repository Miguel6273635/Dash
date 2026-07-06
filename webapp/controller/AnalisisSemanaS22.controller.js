sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/dom/includeStylesheet" // <-- 1. Dependencia añadida para cargar CSS
], function (Controller, JSONModel, History, includeStylesheet) { // <-- Parámetro añadido
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisSemanaS22", {

        onInit: function () {
            // 2. Cargar el CSS exclusivo para esta vista dinámica y limpiamente
            var sRootPath = sap.ui.require.toUrl("mantenimiento");
            includeStylesheet(sRootPath + "/css/AnalisisSemanaS22.css");

            // Datos de ejemplo para la tabla
            var oData = {
                results: [
                    { "prioridad": "CRITICA", "ot": "OT100245", "cliente": "Torre Reforma", "zona": "Centro", "elevador": "EV1024", "causa": "Carta de no mantenimiento", "responsable": "Juan Pérez", "estado": "No ejecutada", "contribucion": "19" },
                    { "prioridad": "CRITICA", "ot": "OT100618", "cliente": "Torre Reforma", "zona": "Centro", "elevador": "EV0871", "causa": "Carta de no mantenimiento", "responsable": "Juan Pérez", "estado": "No ejecutada", "contribucion": "16" },
                    { "prioridad": "ALTA", "ot": "OT100301", "cliente": "Plaza Satélite", "zona": "Norte", "elevador": "EV0442", "causa": "Falta de refacciones", "responsable": "María López", "estado": "No ejecutada", "contribucion": "10" },
                    { "prioridad": "MEDIA", "ot": "OT100512", "cliente": "Hospital San José", "zona": "Norte", "elevador": "EV0615", "causa": "Cliente no disponible", "responsable": "Carlos Ruiz", "estado": "No ejecutada", "contribucion": "7" },
                    { "prioridad": "MEDIA", "ot": "OT100702", "cliente": "Centro Comercial Perisur", "zona": "Sur", "elevador": "EV0301", "causa": "Falta de refacciones", "responsable": "Luis Martínez", "estado": "No ejecutada", "contribucion": "5" },
                    { "prioridad": "MEDIA", "ot": "OT100755", "cliente": "World Trade Center", "zona": "Centro", "elevador": "EV0920", "causa": "Cliente no disponible", "responsable": "María López", "estado": "No ejecutada", "contribucion": "4" }
                ]
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "otModel");
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteMantenimiento", {}, true); // Ajustado para volver a la ruta principal de tu app
            }
        }
    });
});
