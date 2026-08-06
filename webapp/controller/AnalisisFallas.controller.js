sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/ValueState",
    "sap/m/MessageToast"
], function (Controller, JSONModel, ValueState, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisFallas", {

        onInit: function () {
            var oFallasData = {
                clasificaciones: [
                    {
                        id: 1,
                        nombre: "Falla mecánica",
                        icon: "sap-icon://wrench",
                        otAfectadas: 7,
                        equiposAfectados: 5,
                        clientesAfectados: 3,
                        impacto: 32,
                        impactoState: ValueState.Error,
                        tendenciaTexto: "En aumento",
                        tendenciaColor: "Error",
                        tendenciaData: [{ x: 0, y: 10 }, { x: 1, y: 12 }, { x: 2, y: 15 }, { x: 3, y: 20 }]
                    },
                    {
                        id: 2,
                        nombre: "Falla eléctrica",
                            icon: "sap-icon://lightbulb",
                        otAfectadas: 4,
                        equiposAfectados: 3,
                        clientesAfectados: 3,
                        impacto: 23,
                        impactoState: ValueState.Warning,
                        tendenciaTexto: "En aumento",
                        tendenciaColor: "Critical",
                        tendenciaData: [{ x: 0, y: 8 }, { x: 1, y: 10 }, { x: 2, y: 13 }, { x: 3, y: 18 }]
                    },
                    {
                        id: 3,
                        nombre: "Puertas / sensores",
                        icon: "sap-icon://BusinessSuiteInAppSymbols/icon-door",
                        otAfectadas: 3,
                        equiposAfectados: 2,
                        clientesAfectados: 2,
                        impacto: 18,
                        impactoState: ValueState.Warning,
                        tendenciaTexto: "Estable",
                        tendenciaColor: "Critical",
                        tendenciaData: [{ x: 0, y: 10 }, { x: 1, y: 11 }, { x: 2, y: 10 }, { x: 3, y: 12 }]
                    },
                    {
                        id: 4,
                        nombre: "Sistema de tracción",
                        icon: "sap-icon://chain-link",
                        otAfectadas: 2,
                        equiposAfectados: 2,
                        clientesAfectados: 2,
                        impacto: 14,
                        impactoState: ValueState.Warning,
                        tendenciaTexto: "Estable",
                        tendenciaColor: "Critical",
                        tendenciaData: [{ x: 0, y: 9 }, { x: 1, y: 8 }, { x: 2, y: 9 }, { x: 3, y: 10 }]
                    },
                    {
                        id: 5,
                        nombre: "Maniobra / control",
                        icon: "sap-icon://customize",
                        otAfectadas: 2,
                        equiposAfectados: 1,
                        clientesAfectados: 1,
                        impacto: 9,
                        impactoState: ValueState.Success,
                        tendenciaTexto: "A la baja",
                        tendenciaColor: "Good",
                        tendenciaData: [{ x: 0, y: 15 }, { x: 1, y: 12 }, { x: 2, y: 10 }, { x: 3, y: 8 }]
                    },
                    {
                        id: 6,
                        nombre: "Otra",
                        icon: "sap-icon://multiselect-all",
                        otAfectadas: 1,
                        equiposAfectados: 1,
                        clientesAfectados: 1,
                        impacto: 4,
                        impactoState: ValueState.Success,
                        tendenciaTexto: "A la baja",
                        tendenciaColor: "Good",
                        tendenciaData: [{ x: 0, y: 10 }, { x: 1, y: 8 }, { x: 2, y: 6 }, { x: 3, y: 4 }]
                    }
                ]
            };

            this.getView().setModel(new JSONModel(oFallasData), "fallasModel");
        },

        onApplyFilters: function () {
            var sSemana = this.byId("analisisFallasWeekSelect").getSelectedItem().getText();
            var sZona = this.byId("analisisFallasZoneSelect").getSelectedItem().getText();

            MessageToast.show("Filtros aplicados: " + sSemana + " · Zona " + sZona);
        }
    });
});