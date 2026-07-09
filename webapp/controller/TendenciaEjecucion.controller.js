sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/viz/ui5/data/FlattenedDataset",
    "sap/viz/ui5/data/DimensionDefinition",
    "sap/viz/ui5/data/MeasureDefinition",
    "sap/viz/ui5/controls/common/feeds/FeedItem"
], function (
    Controller,
    JSONModel,
    MessageToast,
    FlattenedDataset,
    DimensionDefinition,
    MeasureDefinition,
    FeedItem
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.TendenciaEjecucion", {

        onInit: function () {
            var oData = {
                filtros: {
                    periodo: "ULT_5_SEMANAS",
                    zona: "TODAS"
                },

                contexto: {
                    peorSemana: "S22",
                    peorSemanaDetalle: "75% de cumplimiento",

                    mayorBrecha: "-21 OT",
                    mayorBrechaDetalle: "En la semana S22",

                    principalImpulsor: "Carta de no mantenimiento",
                    impulsorOT: "+6 OT",
                    impulsorPorcentaje: "46%",
                    impulsorDetalle: "del deterioro"
                },

                evolucionSemanal: [
                    {
                        semana: "S18",
                        otPlaneadas: 84,
                        otEjecutadas: 72,
                        cumplimiento: 86
                    },
                    {
                        semana: "S19",
                        otPlaneadas: 84,
                        otEjecutadas: 77,
                        cumplimiento: 92
                    },
                    {
                        semana: "S20",
                        otPlaneadas: 84,
                        otEjecutadas: 81,
                        cumplimiento: 96
                    },
                    {
                        semana: "S21",
                        otPlaneadas: 84,
                        otEjecutadas: 68,
                        cumplimiento: 81
                    },
                    {
                        semana: "S22",
                        otPlaneadas: 84,
                        otEjecutadas: 63,
                        cumplimiento: 75
                    }
                ],

                caidaCumplimiento: [
                    {
                        causa: "Carta de no mantenimiento",
                        incremento: "+6",
                        porcentajeValor: 46,
                        porcentajeTexto: "46%",
                        estado: "Error",
                        tono: "red"
                    },
                    {
                        causa: "Cliente no disponible",
                        incremento: "+3",
                        porcentajeValor: 23,
                        porcentajeTexto: "23%",
                        estado: "Warning",
                        tono: "orange"
                    },
                    {
                        causa: "Falta de refacciones",
                        incremento: "+3",
                        porcentajeValor: 23,
                        porcentajeTexto: "23%",
                        estado: "Warning",
                        tono: "yellow"
                    },
                    {
                        causa: "Otras causas",
                        incremento: "+1",
                        porcentajeValor: 8,
                        porcentajeTexto: "8%",
                        estado: "None",
                        tono: "gray"
                    }
                ],

                totalCaida: {
                    incremento: "+13"
                },

                evolucionCausas: [
                    {
                        causa: "Carta de no mantenimiento",
                        rowtype: "detail",
                        tono: "red",
                        s18: 2,
                        s18Heat: "medium",
                        s19: 3,
                        s19Heat: "high",
                        s20: 2,
                        s20Heat: "medium",
                        s21: 4,
                        s21Heat: "high",
                        s22: 8,
                        s22Heat: "critical",
                        variacion: "+6",
                        estadoVariacion: "Error"
                    },
                    {
                        causa: "Cliente no disponible",
                        rowtype: "detail",
                        tono: "orange",
                        s18: 2,
                        s18Heat: "medium",
                        s19: 2,
                        s19Heat: "medium",
                        s20: 1,
                        s20Heat: "low",
                        s21: 2,
                        s21Heat: "medium",
                        s22: 4,
                        s22Heat: "high",
                        variacion: "+3",
                        estadoVariacion: "Error"
                    },
                    {
                        causa: "Falta de refacciones",
                        rowtype: "detail",
                        tono: "yellow",
                        s18: 1,
                        s18Heat: "low",
                        s19: 2,
                        s19Heat: "medium",
                        s20: 2,
                        s20Heat: "medium",
                        s21: 3,
                        s21Heat: "high",
                        s22: 5,
                        s22Heat: "high",
                        variacion: "+3",
                        estadoVariacion: "Error"
                    },
                    {
                        causa: "Otras causas",
                        rowtype: "detail",
                        tono: "gray",
                        s18: 1,
                        s18Heat: "low",
                        s19: 0,
                        s19Heat: "neutral",
                        s20: 1,
                        s20Heat: "low",
                        s21: 1,
                        s21Heat: "low",
                        s22: 2,
                        s22Heat: "medium",
                        variacion: "+1",
                        estadoVariacion: "Warning"
                    },
                    {
                        causa: "Total OT no ejecutadas",
                        rowtype: "total",
                        tono: "total",
                        s18: 6,
                        s18Heat: "total",
                        s19: 7,
                        s19Heat: "total",
                        s20: 6,
                        s20Heat: "total",
                        s21: 10,
                        s21Heat: "total",
                        s22: 19,
                        s22Heat: "total",
                        variacion: "+13",
                        estadoVariacion: "Error"
                    }
                ]
            };

            var oDashModel = new JSONModel(oData);
            this.getView().setModel(oDashModel, "dash");

            this._loadCatalogos();
        },

        onAfterRendering: function () {
            this._configureEvolucionSemanalChart();
        },

        _loadCatalogos: function () {
            var oCatalogos = {
                periodos: [
                    {
                        key: "ULT_5_SEMANAS",
                        text: "Últimas 5 semanas (S18 - S22)"
                    },
                    {
                        key: "MES_ACTUAL",
                        text: "Mes actual"
                    },
                    {
                        key: "TRIMESTRE",
                        text: "Trimestre"
                    }
                ],
                zonas: [
                    {
                        key: "TODAS",
                        text: "Todas"
                    },
                    {
                        key: "NORTE",
                        text: "Norte"
                    },
                    {
                        key: "METROPOLITANA",
                        text: "Metropolitana"
                    },
                    {
                        key: "FORANEO",
                        text: "Foráneo"
                    }
                ]
            };

            var oCatalogosModel = new JSONModel(oCatalogos);
            this.getView().setModel(oCatalogosModel, "catalogos");
        },

        _configureEvolucionSemanalChart: function () {
            var oVizFrame = this.byId("vfEvolucionSemanal");
            var oModel = this.getView().getModel("dash");

            if (!oVizFrame || !oModel) {
                return;
            }

            oVizFrame.destroyDataset();
            oVizFrame.removeAllFeeds();

            var oDataset = new FlattenedDataset({
                dimensions: [
                    new DimensionDefinition({
                        name: "Semana",
                        value: "{dash>semana}"
                    })
                ],
                measures: [
                    new MeasureDefinition({
                        name: "OT Planeadas",
                        value: "{dash>otPlaneadas}"
                    }),
                    new MeasureDefinition({
                        name: "OT Ejecutadas",
                        value: "{dash>otEjecutadas}"
                    }),
                    new MeasureDefinition({
                        name: "% Cumplimiento",
                        value: "{dash>cumplimiento}"
                    })
                ],
                data: {
                    path: "dash>/evolucionSemanal"
                }
            });

            oVizFrame.setDataset(oDataset);
            oVizFrame.setModel(oModel, "dash");

            oVizFrame.addFeed(new FeedItem({
                uid: "valueAxis",
                type: "Measure",
                values: ["OT Planeadas", "OT Ejecutadas"]
            }));

            oVizFrame.addFeed(new FeedItem({
                uid: "valueAxis2",
                type: "Measure",
                values: ["% Cumplimiento"]
            }));

            oVizFrame.addFeed(new FeedItem({
                uid: "categoryAxis",
                type: "Dimension",
                values: ["Semana"]
            }));

            oVizFrame.setVizProperties({
                title: {
                    visible: false
                },

                legend: {
                    visible: true,
                    position: "top",
                    alignment: "start",
                    drawingEffect: "normal",
                    label: {
                        style: {
                            color: "#14235f",
                            fontSize: "11px",
                            fontWeight: "600"
                        }
                    }
                },

                plotArea: {
                    background: {
                        color: "#ffffff"
                    },

                    drawingEffect: "normal",

                    marker: {
                        visible: true,
                        size: 8
                    },

                    dataLabel: {
                        visible: true,
                        hideWhenOverlap: false,
                        formatString: ["0", "0", "0'%'"],
                        style: {
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#14235f"
                        }
                    },

                    dataShape: {
                        primaryAxis: ["line", "line"],
                        secondaryAxis: ["line"]
                    },

                    colorPalette: [
                        "#B8BDC9",
                        "#2563EB",
                        "#16A34A"
                    ],

                    dataPointStyle: {
                        mode: "update",
                        rules: [
                            {
                                dataContext: {
                                    "OT Planeadas": "*"
                                },
                                properties: {
                                    color: "#B8BDC9",
                                    lineType: "dash",
                                    lineWidth: 2
                                },
                                displayName: "OT Planeadas (constante en 84)"
                            },
                            {
                                dataContext: {
                                    "OT Ejecutadas": "*"
                                },
                                properties: {
                                    color: "#2563EB",
                                    lineWidth: 3
                                },
                                displayName: "OT Ejecutadas"
                            },
                            {
                                dataContext: {
                                    "% Cumplimiento": "*"
                                },
                                properties: {
                                    color: "#16A34A",
                                    lineWidth: 3
                                },
                                displayName: "% Cumplimiento"
                            }
                        ]
                    }
                },

                valueAxis: {
                    title: {
                        visible: true,
                        text: "OT"
                    },
                    scale: {
                        fixedRange: true,
                        minValue: 0,
                        maxValue: 120
                    },
                    gridline: {
                        visible: true,
                        color: "#E8ECF3"
                    },
                    label: {
                        style: {
                            color: "#14235f",
                            fontSize: "11px"
                        }
                    }
                },

                valueAxis2: {
                    title: {
                        visible: true,
                        text: "%"
                    },
                    scale: {
                        fixedRange: true,
                        minValue: 0,
                        maxValue: 125
                    },
                    gridline: {
                        visible: false
                    },
                    label: {
                        formatString: "0'%'",
                        style: {
                            color: "#16A34A",
                            fontSize: "11px",
                            fontWeight: "700"
                        }
                    }
                },

                categoryAxis: {
                    title: {
                        visible: false
                    },
                    axisline: {
                        visible: false
                    },
                    tick: {
                        visible: false
                    },
                    label: {
                        visible: true,
                        style: {
                            color: "#14235f",
                            fontSize: "11px",
                            fontWeight: "700"
                        }
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
        },

        onFilterChange: function () {
            // Cambio de filtro. Aquí después se puede recalcular o llamar al OData.
        },

        onApplyFilters: function () {
            MessageToast.show("Filtros aplicados");
        },

        onClearFilters: function () {
            var oModel = this.getView().getModel("dash");

            oModel.setProperty("/filtros/periodo", "ULT_5_SEMANAS");
            oModel.setProperty("/filtros/zona", "TODAS");

            MessageToast.show("Filtros limpiados");
        },

        onRefresh: function () {
            MessageToast.show("Información actualizada");
        }

    });
});