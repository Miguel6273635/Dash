sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
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

                kpis: {
                    otAfectadas: "16",
                    materialCritico: "Sensor de puerta",
                    materialCriticoDelta: "+18",
                    categoriasSobrePlan: "3 de 4"
                },

               materialesVsPlan: [
    {
        material: "Refacciones generales",
        icono: "sap-icon://technical-object",
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
        icono: "sap-icon://shipping-status",
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
        icono: "",
        iconoTexto: "💧",
        esEmoji: true,
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

            this.getView().setModel(new JSONModel(oData), "materialesModel");
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

        onAplicarFiltros: function () {
            MessageToast.show("Filtros aplicados correctamente");
        },

        onVerDetalleEstado: function () {
            MessageToast.show("Detalle por estado");
        }

    });
});
