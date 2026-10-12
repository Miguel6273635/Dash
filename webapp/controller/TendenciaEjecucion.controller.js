sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/data/DimensionDefinition",
    "sap/viz/ui5/data/MeasureDefinition",
    "sap/viz/ui5/controls/common/feeds/FeedItem",
    "mantenimiento/model/TendenciaEjecucionService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    MessageToast,
    includeStylesheet,
    FlattenedDataset,
    DimensionDefinition,
    MeasureDefinition,
    FeedItem,
    Service,
    InitialLoadPeriod
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.TendenciaEjecucion",
        {
            onInit: function () {
                var initialPeriod = InitialLoadPeriod.previousMonth();

                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/TendenciaEjecucion.css"
                    ) + "?v=20261002-final"
                );

                this._requestId = 0;

                this._filters = {
                    periodo: initialPeriod.monthKey,
                    zona: "TODAS"
                };

                this.getView().setModel(
                    new JSONModel(
                        Service.createEmpty(this._filters)
                    ),
                    "trend"
                );

                this.getView()
                    .getModel("trend")
                    .setSizeLimit(1000);

                this._load(false);
            },

            onAfterRendering: function () {
                this._configureChart();
            },

            onApplyFilters: function () {
                this._filters = {
                    periodo:
                        this.byId("tendenciaSelPeriodo")
                            .getSelectedKey() ||
                        "2026-ANUAL",

                    zona:
                        this.byId("tendenciaSelZona")
                            .getSelectedKey() ||
                        "TODAS"
                };

                this._load(true);
            },

            _load: function (bNotify) {
                var iRequest = ++this._requestId;
                var oModel = this.getView().getModel("trend");

                this.getView().setBusy(true);

                Service.load(
                    this._odata(),
                    this._filters
                ).then(function (oResult) {

                    if (iRequest !== this._requestId) {
                        return;
                    }

                    this._rawData = oResult.rawData;

                    oModel.setData(
                        oResult.data
                    );

                    this._syncControls(
                        oResult.data
                    );

                    this._configureChartAsync();

                    if (bNotify) {
                        MessageToast.show(
                            "Tendencia actualizada con datos de SAP"
                        );
                    }

                }.bind(this)).catch(function (oError) {

                    if (iRequest !== this._requestId) {
                        return;
                    }

                    oModel.setData(
                        Service.createEmpty(
                            this._filters
                        )
                    );

                    this._syncControls(
                        oModel.getData()
                    );

                    this._configureChartAsync();

                    if (bNotify) {
                        MessageToast.show(
                            oError && oError.message
                                ? oError.message
                                : "No fue posible cargar la tendencia"
                        );
                    }

                }.bind(this)).finally(function () {

                    if (iRequest === this._requestId) {
                        this.getView().setBusy(false);
                    }

                }.bind(this));
            },

            _odata: function () {
                var oComponent =
                    this.getOwnerComponent();

                return (
                    oComponent &&
                    oComponent.getModel(
                        "dashboardOData"
                    )
                ) ||
                    this.getView()
                        .getModel(
                            "dashboardOData"
                        );
            },

            _syncControls: function (oData) {
                var oFilters =
                    oData.filtros || {};

                this.byId(
                    "tendenciaSelPeriodo"
                ).setSelectedKey(
                    oFilters.periodo ||
                    "2026-ANUAL"
                );

                this.byId(
                    "tendenciaSelZona"
                ).setSelectedKey(
                    oFilters.zona ||
                    "TODAS"
                );
            },

            _configureChartAsync: function () {
                window.setTimeout(
                    this._configureChart.bind(this),
                    0
                );
            },

            _configureChart: function () {
                var oVizFrame =
                    this.byId(
                        "vfEvolucionSemanal"
                    );

                var oModel =
                    this.getView()
                        .getModel("trend");

                var oDataset;

                if (!oVizFrame || !oModel) {
                    return;
                }

                oVizFrame.destroyDataset();
                oVizFrame.removeAllFeeds();

                oDataset =
                    new FlattenedDataset({

                        dimensions: [
                            new DimensionDefinition({
                                name: "Semana",
                                value: "{trend>semana}"
                            })
                        ],

                        measures: [
                            new MeasureDefinition({
                                name: "OT planeadas",
                                value: "{trend>otPlaneadas}"
                            }),

                            new MeasureDefinition({
                                name: "OT ejecutadas",
                                value: "{trend>otEjecutadas}"
                            }),

                            new MeasureDefinition({
                                name: "% cumplimiento",
                                value: "{trend>cumplimiento}"
                            })
                        ],

                        data: {
                            path:
                                "trend>/evolucionSemanal"
                        }
                    });

                oVizFrame.setDataset(
                    oDataset
                );

                oVizFrame.setModel(
                    oModel,
                    "trend"
                );

                oVizFrame.addFeed(
                    new FeedItem({
                        uid: "valueAxis",
                        type: "Measure",
                        values: [
                            "OT planeadas",
                            "OT ejecutadas"
                        ]
                    })
                );

                oVizFrame.addFeed(
                    new FeedItem({
                        uid: "valueAxis2",
                        type: "Measure",
                        values: [
                            "% cumplimiento"
                        ]
                    })
                );

                oVizFrame.addFeed(
                    new FeedItem({
                        uid: "categoryAxis",
                        type: "Dimension",
                        values: [
                            "Semana"
                        ]
                    })
                );

                oVizFrame.setVizProperties({

                    title: {
                        visible: false
                    },

                    legend: {
                        visible: true,
                        position: "top",
                        alignment: "start"
                    },

                    plotArea: {
                        drawingEffect: "normal",

                        marker: {
                            visible: true,
                            size: 6
                        },

                        dataLabel: {
                            visible: false
                        },

                        dataShape: {
                            primaryAxis: [
                                "line",
                                "line"
                            ],
                            secondaryAxis: [
                                "line"
                            ]
                        },

                        colorPalette: [
                            "#2E8CFF",
                            "#7AB8FF",
                            "#F28C00"
                        ]
                    },

                    valueAxis: {
                        title: {
                            visible: false
                        },

                        gridline: {
                            visible: true
                        }
                    },

                    valueAxis2: {
                        title: {
                            visible: false
                        },

                        scale: {
                            fixedRange: true,
                            minValue: 0,
                            maxValue: 100
                        },

                        label: {
                            formatString: "0"
                        }
                    },

                    categoryAxis: {
                        title: {
                            visible: false
                        }
                    },

                    interaction: {
                        selectability: {
                            mode: "none"
                        }
                    },

                    tooltip: {
                        visible: true
                    }
                });
            }
        }
    );
});