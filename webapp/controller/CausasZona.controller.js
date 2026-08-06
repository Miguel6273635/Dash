sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, Filter, FilterOperator, History) {
    "use strict";

    return Controller.extend("mantenimiento.controller.CausasZona", {
        onInit: function () {
            var aData = [
                { OT: "OT-100245", Equipo: "EV-1024", TipoOT: "Preventivo", Cliente: "Torre Reforma", CausaIncumplimiento: "Carta de no mantenimiento", Responsable: "Juan Pérez", DiasAtraso: 5, Estado: "No ejecutada", StatusCausa: "Error", Zona: "Norte" },
                { OT: "OT-100311", Equipo: "EV-0871", TipoOT: "Preventivo", Cliente: "Torre Reforma", CausaIncumplimiento: "Falta de refacciones", Responsable: "Juan Pérez", DiasAtraso: 4, Estado: "No ejecutada", StatusCausa: "Error", Zona: "Norte" },
                { OT: "OT-100198", Equipo: "EV-0615", TipoOT: "Correctivo", Cliente: "Torre Mayor", CausaIncumplimiento: "Cliente no disponible", Responsable: "Ana López", DiasAtraso: 4, Estado: "No ejecutada", StatusCausa: "Warning", Zona: "Norte" },
                { OT: "OT-100276", Equipo: "EV-1330", TipoOT: "Preventivo", Cliente: "Corporativo ABC", CausaIncumplimiento: "Carta de no mantenimiento", Responsable: "Carlos Díaz", DiasAtraso: 3, Estado: "No ejecutada", StatusCausa: "Error", Zona: "Norte" },
                { OT: "OT-100332", Equipo: "EV-0456", TipoOT: "Correctivo", Cliente: "Torre Reforma", CausaIncumplimiento: "Falta de refacciones", Responsable: "Juan Pérez", DiasAtraso: 3, Estado: "No ejecutada", StatusCausa: "Error", Zona: "Norte" },
                { OT: "OT-100283", Equipo: "EV-0789", TipoOT: "Preventivo", Cliente: "Plaza Galerías", CausaIncumplimiento: "Reprogramación", Responsable: "Ana López", DiasAtraso: 2, Estado: "No ejecutada", StatusCausa: "Information", Zona: "Norte" },
                { OT: "OT-100341", Equipo: "EV-0911", TipoOT: "Correctivo", Cliente: "Torre Reforma", CausaIncumplimiento: "Cliente no disponible", Responsable: "Carlos Díaz", DiasAtraso: 2, Estado: "No ejecutada", StatusCausa: "Warning", Zona: "Norte" },
                { OT: "OT-100367", Equipo: "EV-1210", TipoOT: "Call Center", Cliente: "Corporativo ABC", CausaIncumplimiento: "Falta de refacciones", Responsable: "Juan Pérez", DiasAtraso: 1, Estado: "No ejecutada", StatusCausa: "Error", Zona: "Norte" }
            ];

            this._aAllRows = aData;
            this.getView().setModel(new JSONModel({
                IncumplimientosData: aData,
                ResumenCausas: [
                    { Causa: "Carta de no mantenimiento", Cantidad: 8 },
                    { Causa: "Falta de refacciones", Cantidad: 5 },
                    { Causa: "Cliente no disponible", Cantidad: 3 },
                    { Causa: "Reprogramación", Cantidad: 2 },
                    { Causa: "Otra causa", Cantidad: 2 }
                ],
                ResumenTipos: [
                    { Tipo: "Preventivo", Cantidad: 12 },
                    { Tipo: "Correctivo", Cantidad: 7 },
                    { Tipo: "Call Center", Cantidad: 3 }
                ],
                TotalOTs: 22,
                VisibleCount: aData.length,
                SelectedZone: "Norte",
                ActiveFilterLabel: "Todas"
            }));
            this.getView().addEventDelegate({ onAfterRendering: this._configureCharts.bind(this) });
        },

        _configureCharts: function () {
            var oBar = this.byId("causasZonaBarChart");
            var oDonut = this.byId("causasZonaDonutChart");
            if (oBar) {
                oBar.setVizProperties({
                    general: { background: { color: "transparent" } },
                    plotArea: {
                        background: { color: "transparent" },
                        dataLabel: { visible: true, position: "outside", style: { color: "#26324f", fontSize: "10px", fontWeight: "bold" } },
                        colorPalette: ["#e31b36", "#f97316", "#f4b400", "#7c3aed", "#10b981"],
                        dataPointStyle: {
                            rules: [
                                { dataContext: { Causa: "Carta de no mantenimiento" }, properties: { color: "#ef1f3a" } },
                                { dataContext: { Causa: "Falta de refacciones" }, properties: { color: "#ff7a18" } },
                                { dataContext: { Causa: "Cliente no disponible" }, properties: { color: "#f5b700" } },
                                { dataContext: { Causa: "Reprogramación" }, properties: { color: "#7c3aed" } },
                                { dataContext: { Causa: "Otra causa" }, properties: { color: "#18a96b" } }
                            ]
                        },
                        gridline: { visible: false }
                    },
                    valueAxis: { visible: true, title: { visible: false }, label: { visible: true, style: { color: "#7b879b", fontSize: "8px" } }, axisLine: { visible: true, color: "#dfe5ee" } },
                    categoryAxis: {
                        title: { visible: false },
                        label: { style: { color: "#44516a", fontSize: "9px" } },
                        axisLine: { visible: false }
                    },
                    legend: { visible: false },
                    title: { visible: false },
                    interaction: { selectability: { mode: "NONE" }, zoom: { enablement: "disabled" } }
                });
            }
            if (oDonut) {
                oDonut.setVizProperties({
                    general: { background: { color: "transparent" } },
                    plotArea: {
                        background: { color: "transparent" },
                        dataLabel: { visible: true, type: "percentage", style: { color: "#26324f", fontSize: "11px", fontWeight: "bold" } },
                        colorPalette: ["#1764e8", "#16a34a", "#f4b400"],
                        innerRadius: "56%"
                    },
                    legend: {
                        visible: true,
                        position: "right",
                        title: { visible: false },
                        label: { style: { color: "#44516a", fontSize: "9px" } }
                    },
                    title: { visible: false },
                    interaction: { selectability: { mode: "NONE" } }
                });
            }
        },

        onTypeFilterChange: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var oBinding = this.byId("causasZonaIncumplimientoTable").getBinding("items");
            oBinding.filter(sKey === "todas" ? [] : [new Filter("TipoOT", FilterOperator.EQ, sKey)]);
            this.getView().getModel().setProperty("/ActiveFilterLabel", sKey === "todas" ? "Todas" : sKey);
        },

        onApplyFilters: function () {
            var sZone = this.byId("causasZonaZoneSelect").getSelectedKey();
            this.getView().getModel().setProperty("/SelectedZone", sZone);
        },

        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            if (sPreviousHash !== undefined) { window.history.go(-1); }
            else { this.getOwnerComponent().getRouter().navTo("RouteMantenimiento", {}, true); }
        }
    });
});