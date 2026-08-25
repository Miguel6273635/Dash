sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/data/DimensionDefinition",
    "sap/viz/ui5/data/MeasureDefinition",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "mantenimiento/model/TendenciaEjecucionService"
], function (Controller, JSONModel, MessageToast, includeStylesheet, FlattenedDataset, DimensionDefinition, MeasureDefinition, FeedItem, Service) {
    "use strict";

    return Controller.extend("mantenimiento.controller.TendenciaEjecucion", {
        onInit: function () {
            includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/TendenciaEjecucion.css") + "?v=20260821-live-data");
            this._requestId = 0;
            this._filters = { periodo: "2026-ANUAL", zona: "TODAS" };
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "trend");
            this.getView().getModel("trend").setSizeLimit(1000);
            this._load(false);
        },

        onAfterRendering: function () {
            this._configureChart();
        },

        onApplyFilters: function () {
            this._filters = {
                periodo: this.byId("tendenciaSelPeriodo").getSelectedKey() || "2026-ANUAL",
                zona: this.byId("tendenciaSelZona").getSelectedKey() || "TODAS"
            };
            this._load(true);
        },

        _load: function (notify) {
            var request = ++this._requestId;
            var model = this.getView().getModel("trend");

            this.getView().setBusy(true);
            Service.load(this._odata(), this._filters).then(function (result) {
                if (request !== this._requestId) { return; }
                this._rawData = result.rawData;
                model.setData(result.data);
                this._syncControls(result.data);
                this._configureChartAsync();
                if (notify) { MessageToast.show("Tendencia actualizada con datos de SAP"); }
            }.bind(this)).catch(function (error) {
                if (request !== this._requestId) { return; }
                model.setData(Service.createEmpty(this._filters));
                this._syncControls(model.getData());
                this._configureChartAsync();
                if (notify) { MessageToast.show(error.message || "No fue posible cargar la tendencia"); }
            }.bind(this)).finally(function () {
                if (request === this._requestId) { this.getView().setBusy(false); }
            }.bind(this));
        },

        _odata: function () {
            var component = this.getOwnerComponent();
            return component && component.getModel("dashboardOData") || this.getView().getModel("dashboardOData");
        },

        _syncControls: function (data) {
            var filters = data.filtros || {};
            this.byId("tendenciaSelPeriodo").setSelectedKey(filters.periodo || "2026-ANUAL");
            this.byId("tendenciaSelZona").setSelectedKey(filters.zona || "TODAS");
        },

        _configureChartAsync: function () {
            window.setTimeout(this._configureChart.bind(this), 0);
        },

        _configureChart: function () {
            var vizFrame = this.byId("vfEvolucionSemanal");
            var model = this.getView().getModel("trend");
            var dataset;

            if (!vizFrame || !model) { return; }
            vizFrame.destroyDataset();
            vizFrame.removeAllFeeds();
            dataset = new FlattenedDataset({
                dimensions: [new DimensionDefinition({ name: "Semana", value: "{trend>semana}" })],
                measures: [
                    new MeasureDefinition({ name: "OT planeadas", value: "{trend>otPlaneadas}" }),
                    new MeasureDefinition({ name: "OT ejecutadas", value: "{trend>otEjecutadas}" }),
                    new MeasureDefinition({ name: "% cumplimiento", value: "{trend>cumplimiento}" })
                ],
                data: { path: "trend>/evolucionSemanal" }
            });
            vizFrame.setDataset(dataset);
            vizFrame.setModel(model, "trend");
            vizFrame.addFeed(new FeedItem({ uid: "valueAxis", type: "Measure", values: ["OT planeadas", "OT ejecutadas"] }));
            vizFrame.addFeed(new FeedItem({ uid: "valueAxis2", type: "Measure", values: ["% cumplimiento"] }));
            vizFrame.addFeed(new FeedItem({ uid: "categoryAxis", type: "Dimension", values: ["Semana"] }));
            vizFrame.setVizProperties({
                title: { visible: false },
                legend: { visible: true, position: "top", alignment: "start" },
                plotArea: {
                    drawingEffect: "normal",
                    marker: { visible: true, size: 6 },
                    dataLabel: { visible: false },
                    dataShape: { primaryAxis: ["line", "line"], secondaryAxis: ["line"] },
                    colorPalette: ["#94a3b8", "#2563eb", "#16a34a"]
                },
                valueAxis: { title: { visible: false }, gridline: { visible: true } },
                valueAxis2: { title: { visible: false }, scale: { fixedRange: true, minValue: 0, maxValue: 100 }, label: { formatString: "0'%'" } },
                categoryAxis: { title: { visible: false } },
                interaction: { selectability: { mode: "none" } },
                tooltip: { visible: true }
            });
        }
    });
});
