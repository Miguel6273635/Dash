/* Declaración del controlador e importación de librerías requeridas */
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, History) {
    "use strict";

    return Controller.extend("mantenimiento.controller.CausasZona", {
        
        /* Se ejecuta automáticamente una sola vez cuando la pantalla carga */
        onInit: function () {
            // 1. Preparamos la lista de datos idéntica a tu diseño
            var aIncumplimientos = [
                { 
                    OT: "OT-100245", 
                    Equipo: "EV-1024", 
                    TipoOT: "Preventivo", 
                    Cliente: "Torre Reforma", 
                    CausaIncumplimiento: "Carta de no mantenimiento", 
                    Responsable: "Juan Pérez", 
                    DiasAtraso: 5, 
                    Estado: "No ejecutada", 
                    StatusCausa: "Error", 
                    StatusTipo: "Preventivo" 
                },
                { 
                    OT: "OT-100311", 
                    Equipo: "EV-0871", 
                    TipoOT: "Preventivo", 
                    Cliente: "Torre Reforma", 
                    CausaIncumplimiento: "Falta de refacciones", 
                    Responsable: "Juan Pérez", 
                    DiasAtraso: 4, 
                    Estado: "No ejecutada", 
                    StatusCausa: "Error", 
                    StatusTipo: "Preventivo" 
                },
                { 
                    OT: "OT-100198", 
                    Equipo: "EV-0615", 
                    TipoOT: "Correctivo", 
                    Cliente: "Torre Mayor", 
                    CausaIncumplimiento: "Cliente no disponible", 
                    Responsable: "Ana López", 
                    DiasAtraso: 4, 
                    Estado: "No ejecutada", 
                    StatusCausa: "Warning", 
                    StatusTipo: "Correctivo" 
                }
            ];

            // 2. Creamos el modelo JSON y guardamos los datos bajo la propiedad "IncumplimientosData"
            var oModel = new JSONModel({
                IncumplimientosData: aIncumplimientos
            });

            // 3. Asignamos el modelo a la vista para que el XML pueda leerlo
            this.getView().setModel(oModel);
        },

        /* onNavBack: Permite que el link de Volver funcione correctamente */
        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteMantenimiento", {}, true);
            }
        }
    });
});
