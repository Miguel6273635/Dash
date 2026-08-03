sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/Popover",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/VBox"
], function (
    Controller,
    JSONModel,
    MessageToast,
    Popover,
    Button,
    Text,
    VBox
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.ConsumoMateriales", {

        onInit: function () {
            var oData = {
                filtros: {
                    periodo: "mayo2024",
                    fechaDesde: "01/05/2024",
                    fechaHasta: "31/05/2024",
                    zona: "todas",
                    supervisor: "todos",
                    tipoOrden: "todas"
                },

                ui: {
                    materialesInfoVisible: false
                },

                kpis: {
                    otAfectadas: "16",
                    materialCritico: "Sensor de puerta",
                    materialCriticoDelta: "+18",
                    categoriasSobrePlan: "3 de 4"
                },

                materialesVsPlan: [
                    {
                        material: "Refacciones generales",
                        icono: "sap-icon://action-settings",
                        iconoTexto: "",
                        esEmoji: false,
                        planTexto: "1,000 pzas",
                        realTexto: "1,140 pzas",
                        planPorcentaje: 78,
                        realPorcentaje: 90,
                        variacionTexto: "+14%",
                        estado: "Error"
                    },
                    {
                        material: "Consumibles generales",
                        icono: "sap-icon://product",
                        iconoTexto: "",
                        esEmoji: false,
                        planTexto: "600 pzas",
                        realTexto: "570 pzas",
                        planPorcentaje: 54,
                        realPorcentaje: 50,
                        variacionTexto: "-5%",
                        estado: "Success"
                    },
                    {
                        material: "Lubricantes en general",
                        icono: "sap-icon://blur",
                        iconoTexto: "",
                        esEmoji: false,
                        planTexto: "400 L",
                        realTexto: "468 L",
                        planPorcentaje: 40,
                        realPorcentaje: 52,
                        variacionTexto: "+17%",
                        estado: "Error"
                    },
                    {
                        material: "Herramientas generales",
                        icono: "sap-icon://wrench",
                        iconoTexto: "",
                        esEmoji: false,
                        planTexto: "200 pzas",
                        realTexto: "190 pzas",
                        planPorcentaje: 25,
                        realPorcentaje: 22,
                        variacionTexto: "-5%",
                        estado: "Success"
                    }
                ],

                consumoTipoOrden: [
                    {
                        tipo: "Mantenimiento planeado",
                        totalTexto: "1,210 pzas / L",
                        porcentajeTexto: "(56%)",
                        estado: "Blue"
                    },
                    {
                        tipo: "Reparación",
                        totalTexto: "668 pzas / L",
                        porcentajeTexto: "(31%)",
                        estado: "Green"
                    },
                    {
                        tipo: "Call Center",
                        totalTexto: "290 pzas / L",
                        porcentajeTexto: "(13%)",
                        estado: "Orange"
                    }
                ],

                otAfectadas: [
                    {
                        estadoNombre: "No atendidas",
                        ot: 12
                    },
                    {
                        estadoNombre: "Reprogramadas",
                        ot: 6
                    },
                    {
                        estadoNombre: "Pendiente material",
                        ot: 5
                    },
                    {
                        estadoNombre: "Parciales",
                        ot: 3
                    }
                ],

                topMateriales: [
                    {
                        id: "1",
                        material: "Sensor de puerta",
                        plan: "82 pzas",
                        real: "100 pzas",
                        variacion: "+22%",
                        estado: "Error"
                    },
                    {
                        id: "2",
                        material: "Zapata de freno",
                        plan: "120 pzas",
                        real: "142 pzas",
                        variacion: "+18%",
                        estado: "Error"
                    },
                    {
                        id: "3",
                        material: "Aceite hidráulico",
                        plan: "200 L",
                        real: "232 L",
                        variacion: "+16%",
                        estado: "Error"
                    },
                    {
                        id: "4",
                        material: "Fusible de control",
                        plan: "60 pzas",
                        real: "51 pzas",
                        variacion: "-15%",
                        estado: "Success"
                    },
                    {
                        id: "5",
                        material: "Rodamiento guía",
                        plan: "40 pzas",
                        real: "33 pzas",
                        variacion: "-18%",
                        estado: "Success"
                    }
                ],

                topOrdenesMayorConsumo: [
                    {
                        id: "1",
                        ot: "OT-2024-0448",
                        tipo: "Mantenimiento planeado",
                        cliente: "Torre Reforma",
                        consumo: "186 pzas / L"
                    },
                    {
                        id: "2",
                        ot: "OT-2024-0428",
                        tipo: "Reparación",
                        cliente: "Plaza Satélite",
                        consumo: "154 pzas / L"
                    },
                    {
                        id: "3",
                        ot: "OT-2024-0411",
                        tipo: "Reparación",
                        cliente: "Hospital Águila",
                        consumo: "138 pzas / L"
                    },
                    {
                        id: "4",
                        ot: "OT-2024-0454",
                        tipo: "Mantenimiento planeado",
                        cliente: "Torre Mayor",
                        consumo: "129 pzas / L"
                    },
                    {
                        id: "5",
                        ot: "OT-2024-0446",
                        tipo: "Call Center",
                        cliente: "Plaza Galerías",
                        consumo: "118 pzas / L"
                    }
                ],

                topOrdenesMenorConsumo: [
                    {
                        id: "1",
                        ot: "OT-2024-0377",
                        plan: "85 pzas / L",
                        real: "132 pzas / L",
                        variacion: "+55%",
                        estado: "Success"
                    },
                    {
                        id: "2",
                        ot: "OT-2024-0429",
                        plan: "70 pzas / L",
                        real: "35 pzas / L",
                        variacion: "-50%",
                        estado: "Success"
                    },
                    {
                        id: "3",
                        ot: "OT-2024-0450",
                        plan: "62 pzas / L",
                        real: "33 pzas / L",
                        variacion: "-47%",
                        estado: "Success"
                    },
                    {
                        id: "4",
                        ot: "OT-2024-0391",
                        plan: "55 pzas / L",
                        real: "29 pzas / L",
                        variacion: "-47%",
                        estado: "Success"
                    },
                    {
                        id: "5",
                        ot: "OT-2024-0413",
                        plan: "48 pzas / L",
                        real: "26 pzas / L",
                        variacion: "-46%",
                        estado: "Success"
                    }
                ],

                consumoZona: [
                    {
                        zona: "Norte",
                        zonaKey: "norte",
                        refacciones: "412",
                        consumibles: "215",
                        lubricantes: "186",
                        herramientas: "72",
                        total: "885"
                    },
                    {
                        zona: "Centro",
                        zonaKey: "centro",
                        refacciones: "368",
                        consumibles: "178",
                        lubricantes: "154",
                        herramientas: "63",
                        total: "763"
                    },
                    {
                        zona: "Sur",
                        zonaKey: "sur",
                        refacciones: "254",
                        consumibles: "126",
                        lubricantes: "98",
                        herramientas: "41",
                        total: "519"
                    },
                    {
                        zona: "Este",
                        zonaKey: "este",
                        refacciones: "112",
                        consumibles: "68",
                        lubricantes: "46",
                        herramientas: "22",
                        total: "248"
                    },
                    {
                        zona: "Oeste",
                        zonaKey: "oeste",
                        refacciones: "94",
                        consumibles: "34",
                        lubricantes: "22",
                        herramientas: "12",
                        total: "162"
                    }
                ]
            };

            var oModel = new JSONModel(oData);
            oModel.setSizeLimit(1000);

            this.getView().setModel(oModel, "materialesModel");
        },

        onAfterRendering: function () {
            var that = this;

            setTimeout(function () {
                that._configurarGraficas();
            }, 300);
        },

        _configurarGraficas: function () {
            var oChart = this.byId("vfOtAfectadas");

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                plotArea: {
                    colorPalette: [
                        "#EF4444",
                        "#F97316",
                        "#F59E0B",
                        "#6D28D9"
                    ],
                    dataLabel: {
                        visible: true,
                        style: {
                            color: "#0F172A",
                            fontSize: "10px"
                        }
                    },
                    drawingEffect: "normal"
                },
                legend: {
                    visible: false
                },
                title: {
                    visible: false
                },
                valueAxis: {
                    title: {
                        visible: true,
                        text: "OT"
                    },
                    label: {
                        style: {
                            color: "#475569",
                            fontSize: "10px"
                        }
                    },
                    scale: {
                        fixedRange: true,
                        minValue: 0,
                        maxValue: 14
                    },
                    gridline: {
                        visible: true
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    },
                    label: {
                        style: {
                            color: "#334155",
                            fontSize: "9px"
                        }
                    }
                },
                background: {
                    color: "transparent"
                },
                interaction: {
                    selectability: {
                        mode: "single"
                    }
                }
            });
        },

        onToggleMaterialInfo: function () {
            var oModel = this.getView().getModel("materialesModel");

            if (!oModel) {
                MessageToast.show("No se encontró el modelo de materiales");
                return;
            }

            var bVisible = Boolean(
                oModel.getProperty("/ui/materialesInfoVisible")
            );

            oModel.setProperty(
                "/ui/materialesInfoVisible",
                !bVisible
            );
        },

        onTopMaterialesInfoPress: function (oEvent) {
            var oSource = oEvent.getSource();

            if (!this._oTopMaterialesInfoPopover) {
                var oText1 = new Text({
                    text: "Esta sección muestra los materiales con mayor diferencia entre el consumo planeado y el consumo real del periodo.",
                    wrapping: true
                });
                oText1.addStyleClass("cmInfoPopoverText");

                var oText2 = new Text({
                    text: "Las variaciones positivas indican que se consumió más material del plan. Las variaciones negativas indican que se consumió menos material de lo planeado.",
                    wrapping: true
                });
                oText2.addStyleClass("cmInfoPopoverText");

                var oText3 = new Text({
                    text: "Sirve para identificar materiales críticos, sobreconsumo, desviaciones operativas y posibles ajustes en la planeación.",
                    wrapping: true
                });
                oText3.addStyleClass("cmInfoPopoverText");
                oText3.addStyleClass("cmInfoPopoverTextLast");

                var oContent = new VBox({
                    items: [
                        oText1,
                        oText2,
                        oText3
                    ]
                });
                oContent.addStyleClass("cmInfoPopoverContent");

                this._oTopMaterialesInfoPopover = new Popover({
                    title: "Materiales con mayor variación",
                    placement: "Bottom",
                    contentWidth: "340px",
                    content: [
                        oContent
                    ],
                    endButton: new Button({
                        text: "Cerrar",
                        type: "Transparent",
                        press: function () {
                            this._oTopMaterialesInfoPopover.close();
                        }.bind(this)
                    })
                });

                this._oTopMaterialesInfoPopover.addStyleClass("cmInfoPopover");
                this.getView().addDependent(this._oTopMaterialesInfoPopover);
            }

            this._oTopMaterialesInfoPopover.openBy(oSource);
        },
        onTopOrdenesMayorInfoPress: function (oEvent) {
            var oSource = oEvent.getSource();

            if (!this._oTopOrdenesMayorInfoPopover) {
                var oText1 = new Text({
                    text: "Esta sección muestra las órdenes de trabajo que registraron el mayor consumo total de materiales durante el periodo seleccionado.",
                    wrapping: true
                });
                oText1.addStyleClass("cmInfoPopoverText");

                var oText2 = new Text({
                    text: "El consumo total considera las cantidades utilizadas en la orden, agrupando refacciones, consumibles, lubricantes y herramientas según corresponda.",
                    wrapping: true
                });
                oText2.addStyleClass("cmInfoPopoverText");

                var oText3 = new Text({
                    text: "Sirve para identificar órdenes con alto uso de material, posibles desviaciones operativas y oportunidades de control en la planeación.",
                    wrapping: true
                });
                oText3.addStyleClass("cmInfoPopoverText");
                oText3.addStyleClass("cmInfoPopoverTextLast");

                var oContent = new VBox({
                    items: [
                        oText1,
                        oText2,
                        oText3
                    ]
                });
                oContent.addStyleClass("cmInfoPopoverContent");

                this._oTopOrdenesMayorInfoPopover = new Popover({
                    title: "Órdenes con mayor consumo",
                    placement: "Bottom",
                    contentWidth: "340px",
                    content: [
                        oContent
                    ],
                    endButton: new Button({
                        text: "Cerrar",
                        type: "Transparent",
                        press: function () {
                            this._oTopOrdenesMayorInfoPopover.close();
                        }.bind(this)
                    })
                });

                this._oTopOrdenesMayorInfoPopover.addStyleClass("cmInfoPopover");
                this.getView().addDependent(this._oTopOrdenesMayorInfoPopover);
            }

            this._oTopOrdenesMayorInfoPopover.openBy(oSource);
        },
        onTopOrdenesMenorInfoPress: function (oEvent) {
            var oSource = oEvent.getSource();

            if (!this._oTopOrdenesMenorInfoPopover) {
                var oText1 = new Text({
                    text: "Esta sección muestra las órdenes de trabajo con menor consumo real de materiales en comparación con lo planeado.",
                    wrapping: true
                });
                oText1.addStyleClass("cmInfoPopoverText");

                var oText2 = new Text({
                    text: "Permite identificar órdenes donde el consumo fue menor al plan, lo que puede indicar ahorro, subejecución, diferencias de planeación o consumo pendiente.",
                    wrapping: true
                });
                oText2.addStyleClass("cmInfoPopoverText");

                var oText3 = new Text({
                    text: "Sirve para revisar desviaciones contra el plan y validar si la diferencia corresponde a una mejora operativa o a una posible inconsistencia en la ejecución.",
                    wrapping: true
                });
                oText3.addStyleClass("cmInfoPopoverText");
                oText3.addStyleClass("cmInfoPopoverTextLast");

                var oContent = new VBox({
                    items: [
                        oText1,
                        oText2,
                        oText3
                    ]
                });
                oContent.addStyleClass("cmInfoPopoverContent");

                this._oTopOrdenesMenorInfoPopover = new Popover({
                    title: "Órdenes con menor consumo",
                    placement: "Bottom",
                    contentWidth: "340px",
                    content: [
                        oContent
                    ],
                    endButton: new Button({
                        text: "Cerrar",
                        type: "Transparent",
                        press: function () {
                            this._oTopOrdenesMenorInfoPopover.close();
                        }.bind(this)
                    })
                });

                this._oTopOrdenesMenorInfoPopover.addStyleClass("cmInfoPopover");
                this.getView().addDependent(this._oTopOrdenesMenorInfoPopover);
            }

            this._oTopOrdenesMenorInfoPopover.openBy(oSource);
        },
        onOpenOtAfectadasInfo: function () {
            sap.m.MessageBox.information(
                "Órdenes afectadas parcialmente o con riesgo de atraso por falta de material.\n\n" +
                "Esta vista muestra:\n" +
                "• No atendidas\n" +
                "• Reprogramadas\n" +
                "• Pendientes de material\n" +
                "• Parciales",
                {
                    title: "Información de órdenes afectadas"
                }
            );
        },
        onOtAfectadasInfoPress: function (oEvent) {
            var oSource = oEvent.getSource();

            if (!this._oOtAfectadasInfoPopover) {
                var oText1 = new Text({
                    text: "Órdenes",
                    wrapping: true
                });
                oText1.addStyleClass("cmInfoPopoverTitleText");

                var oText2 = new Text({
                    text: "Afectadas parcialmente o con riesgo de atraso por falta de material.",
                    wrapping: true
                });
                oText2.addStyleClass("cmInfoPopoverText");

                var oText3 = new Text({
                    text: "Esta gráfica muestra las OT agrupadas por estado: No atendidas, Reprogramadas, Pendientes de material y Parciales.",
                    wrapping: true
                });
                oText3.addStyleClass("cmInfoPopoverText");

                var oText4 = new Text({
                    text: "Sirve para identificar qué órdenes requieren atención para evitar atrasos en la ejecución.",
                    wrapping: true
                });
                oText4.addStyleClass("cmInfoPopoverText");
                oText4.addStyleClass("cmInfoPopoverTextLast");

                var oContent = new VBox({
                    items: [
                        oText1,
                        oText2,
                        oText3,
                        oText4
                    ]
                });
                oContent.addStyleClass("cmInfoPopoverContent");

                this._oOtAfectadasInfoPopover = new Popover({
                    title: "Órdenes afectadas",
                    placement: "Bottom",
                    contentWidth: "340px",
                    content: [
                        oContent
                    ],
                    endButton: new Button({
                        text: "Cerrar",
                        type: "Transparent",
                        press: function () {
                            this._oOtAfectadasInfoPopover.close();
                        }.bind(this)
                    })
                });

                this._oOtAfectadasInfoPopover.addStyleClass("cmInfoPopover");
                this.getView().addDependent(this._oOtAfectadasInfoPopover);
            }

            this._oOtAfectadasInfoPopover.openBy(oSource);
        },

        onMaterialesVsPlanInfoPress: function (oEvent) {
            var oSource = oEvent.getSource();

            if (!this._oMaterialesVsPlanInfoPopover) {
                var oText1 = new Text({
                    text: "Esta sección compara el consumo planeado contra el consumo real de materiales por categoría.",
                    wrapping: true
                });
                oText1.addStyleClass("cmInfoPopoverText");

                var oText2 = new Text({
                    text: "La columna Plan muestra la cantidad programada para el periodo. La columna Real muestra la cantidad consumida.",
                    wrapping: true
                });
                oText2.addStyleClass("cmInfoPopoverText");

                var oText3 = new Text({
                    text: "La variación permite identificar materiales con sobreconsumo o consumo menor al plan.",
                    wrapping: true
                });
                oText3.addStyleClass("cmInfoPopoverText");
                oText3.addStyleClass("cmInfoPopoverTextLast");

                var oContent = new VBox({
                    items: [
                        oText1,
                        oText2,
                        oText3
                    ]
                });
                oContent.addStyleClass("cmInfoPopoverContent");

                this._oMaterialesVsPlanInfoPopover = new Popover({
                    title: "Materiales vs plan",
                    placement: "Bottom",
                    contentWidth: "340px",
                    content: [
                        oContent
                    ],
                    endButton: new Button({
                        text: "Cerrar",
                        type: "Transparent",
                        press: function () {
                            this._oMaterialesVsPlanInfoPopover.close();
                        }.bind(this)
                    })
                });

                this._oMaterialesVsPlanInfoPopover.addStyleClass("cmInfoPopover");
                this.getView().addDependent(this._oMaterialesVsPlanInfoPopover);
            }

            this._oMaterialesVsPlanInfoPopover.openBy(oSource);
        },

        onTipoOrdenInfoPress: function (oEvent) {
            var oSource = oEvent.getSource();

            if (!this._oTipoOrdenInfoPopover) {
                var oText1 = new Text({
                    text: "Esta sección muestra la distribución del consumo total de materiales por tipo de orden.",
                    wrapping: true
                });
                oText1.addStyleClass("cmInfoPopoverText");

                var oText2 = new Text({
                    text: "La barra superior representa el porcentaje de consumo correspondiente a cada tipo: mantenimiento planeado, reparación y centro de llamadas.",
                    wrapping: true
                });
                oText2.addStyleClass("cmInfoPopoverText");

                var oText3 = new Text({
                    text: "Sirve para identificar qué tipo de orden concentra más consumo de refacciones, consumibles, lubricantes o herramientas.",
                    wrapping: true
                });
                oText3.addStyleClass("cmInfoPopoverText");
                oText3.addStyleClass("cmInfoPopoverTextLast");

                var oContent = new VBox({
                    items: [
                        oText1,
                        oText2,
                        oText3
                    ]
                });
                oContent.addStyleClass("cmInfoPopoverContent");

                this._oTipoOrdenInfoPopover = new Popover({
                    title: "Consumo por tipo de orden",
                    placement: "Bottom",
                    contentWidth: "340px",
                    content: [
                        oContent
                    ],
                    endButton: new Button({
                        text: "Cerrar",
                        type: "Transparent",
                        press: function () {
                            this._oTipoOrdenInfoPopover.close();
                        }.bind(this)
                    })
                });

                this._oTipoOrdenInfoPopover.addStyleClass("cmInfoPopover");
                this.getView().addDependent(this._oTipoOrdenInfoPopover);
            }

            this._oTipoOrdenInfoPopover.openBy(oSource);
        },
        onAplicarFiltros: function () {
            MessageToast.show("Filtros aplicados correctamente");
        },

        onVerDetalleEstado: function () {
            MessageToast.show("Detalle por estado");
        },

        onExit: function () {
            if (this._oTopMaterialesInfoPopover) {
                this._oTopMaterialesInfoPopover.destroy();
                this._oTopMaterialesInfoPopover = null;
            }

            if (this._oTopOrdenesMayorInfoPopover) {
                this._oTopOrdenesMayorInfoPopover.destroy();
                this._oTopOrdenesMayorInfoPopover = null;
            }

            if (this._oTopOrdenesMenorInfoPopover) {
                this._oTopOrdenesMenorInfoPopover.destroy();
                this._oTopOrdenesMenorInfoPopover = null;
            }

            if (this._oOtAfectadasInfoPopover) {
                this._oOtAfectadasInfoPopover.destroy();
                this._oOtAfectadasInfoPopover = null;
            }

            if (this._oMaterialesVsPlanInfoPopover) {
                this._oMaterialesVsPlanInfoPopover.destroy();
                this._oMaterialesVsPlanInfoPopover = null;
            }

            if (this._oTipoOrdenInfoPopover) {
                this._oTipoOrdenInfoPopover.destroy();
                this._oTipoOrdenInfoPopover = null;
            }
        }
    });
});