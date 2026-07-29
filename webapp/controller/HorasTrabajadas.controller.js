sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.HorasTrabajadas", {

        onInit: function () {
            var oModel = new JSONModel(this._getMockData());
            oModel.setSizeLimit(500);
            this.getView().setModel(oModel, "horasModel");
        },

        onAplicarFiltros: function () {
            var oModel = this.getView().getModel("horasModel");
            var oFiltros = oModel.getProperty("/filtros");
            MessageToast.show("Filtros aplicados: " + oFiltros.fechaDesde + " - " + oFiltros.fechaHasta);
        },

        onVerDetalleTipoOrden: function () {
            this._navToIfExists("RouteDetalleHorasTipoOrden", "Ruta no registrada.");
        },

        onVerDetalleZona: function () {
            this._navToIfExists("RouteDetalleCapacidadZona", "Ruta no registrada.");
        },

        onVerDetalleCausa: function () {
            this._navToIfExists("RouteDetalleDesviacionHoras", "Ruta no registrada.");
        },

        _navToIfExists: function (sRoute, sFallbackMessage) {
            var oRouter = this.getOwnerComponent && this.getOwnerComponent().getRouter();
            if (oRouter && oRouter.getRoute && oRouter.getRoute(sRoute)) {
                oRouter.navTo(sRoute);
                return;
            }
            MessageToast.show(sFallbackMessage);
        },

        _getMockData: function () {
            return {
                filtros: { periodo: "mayo2024", fechaDesde: "01/05/2024", fechaHasta: "31/05/2024", zona: "todas", supervisor: "todos", tipoOrden: "todos", turno: "todos", mecanico: "todos", estadoOrden: "todos" },
                kpis: { capacidadComprometida: "92.1%", capacidadComprometidaValor: 92.1, margenCapacidad: "+500 h", margenCapacidadValor: 82, totalHorasExtra: "+360 h", utilizacionProyectada: "98%" },
                graficas: {
                    utilizacionResumen: [
                        { turno: "Diurno", valor: 84.9, valorTexto: "84.9%", icono: "sap-icon://light-mode", estado: "Success" },
                        { turno: "Nocturno", valor: 95.1, valorTexto: "95.1%", icono: "sap-icon://lateness", estado: "Warning" },
                        { turno: "Fin de semana", valor: 117.4, valorTexto: "117.4%", icono: "sap-icon://calendar", estado: "Error" }
                    ],
                    causasDesviacion: [
                        { causa: "Reparación compleja", horasTexto: "+120 h", porcentaje: 33, porcentajeTexto: "33%" },
                        { causa: "Falta de refacción durante servicio", horasTexto: "+80 h", porcentaje: 22, porcentajeTexto: "22%" },
                        { causa: "Reproceso", horasTexto: "+65 h", porcentaje: 18, porcentajeTexto: "18%" },
                        { causa: "Acceso tardío del cliente", horasTexto: "+40 h", porcentaje: 11, porcentajeTexto: "11%" },
                        { causa: "Diagnóstico adicional", horasTexto: "+35 h", porcentaje: 10, porcentajeTexto: "10%" },
                        { causa: "Otros", horasTexto: "+20 h", porcentaje: 6, porcentajeTexto: "6%" }
                    ]
                }
            };
        }
    });
});