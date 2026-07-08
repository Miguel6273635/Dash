sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("mantenimiento.controller.BalanceOperativoZona", {

        onInit: function () {
            this.getView().setModel(new JSONModel(this._getMockData()), "boz");
        },

        onAfterRendering: function () {
            var that = this;

            setTimeout(function () {
                that._configurarGraficaCapacidad();
            }, 250);
        },

        _getMockData: function () {
            return {
                presionZona: [
                    { zona: "Sur", valor: "92%", porcentaje: "92%", label: "Crítica", estado: "Red" },
                    { zona: "Norte", valor: "87%", porcentaje: "87%", label: "Alta", estado: "Orange" },
                    { zona: "Centro", valor: "74%", porcentaje: "74%", label: "Media", estado: "Yellow" },
                    { zona: "Este", valor: "58%", porcentaje: "58%", label: "Controlada", estado: "Green" },
                    { zona: "Oeste", valor: "42%", porcentaje: "42%", label: "Baja", estado: "GreenLight" }
                ],

                matriz: [
                    {
                        zona: "Sur",
                        carga: "41",
                        pendientes: "22",
                        vencidas: "9",
                        estadoOrdenes: "Alta",
                        estadoOrdenesKey: "Red",
                        programadas: "1,420 h",
                        reales: "1,518 h",
                        utilHoras: "107%",
                        estadoHoras: "Alta",
                        estadoHorasKey: "Red",
                        disponibles: "6",
                        utilRecursos: "96%",
                        estadoRecursos: "Bajo",
                        estadoRecursosKey: "Red"
                    },
                    {
                        zona: "Norte",
                        carga: "44",
                        pendientes: "18",
                        vencidas: "8",
                        estadoOrdenes: "Alta",
                        estadoOrdenesKey: "Red",
                        programadas: "1,680 h",
                        reales: "1,597 h",
                        utilHoras: "95%",
                        estadoHoras: "Alta",
                        estadoHorasKey: "Red",
                        disponibles: "9",
                        utilRecursos: "80%",
                        estadoRecursos: "Media",
                        estadoRecursosKey: "Yellow"
                    },
                    {
                        zona: "Centro",
                        carga: "34",
                        pendientes: "14",
                        vencidas: "5",
                        estadoOrdenes: "Media",
                        estadoOrdenesKey: "Yellow",
                        programadas: "1,280 h",
                        reales: "1,201 h",
                        utilHoras: "94%",
                        estadoHoras: "Media",
                        estadoHorasKey: "Yellow",
                        disponibles: "8",
                        utilRecursos: "67%",
                        estadoRecursos: "Media",
                        estadoRecursosKey: "Yellow"
                    },
                    {
                        zona: "Este",
                        carga: "21",
                        pendientes: "8",
                        vencidas: "2",
                        estadoOrdenes: "Baja",
                        estadoOrdenesKey: "Green",
                        programadas: "900 h",
                        reales: "765 h",
                        utilHoras: "85%",
                        estadoHoras: "Media",
                        estadoHorasKey: "Yellow",
                        disponibles: "7",
                        utilRecursos: "68%",
                        estadoRecursos: "Alta",
                        estadoRecursosKey: "Green"
                    },
                    {
                        zona: "Oeste",
                        carga: "14",
                        pendientes: "5",
                        vencidas: "0",
                        estadoOrdenes: "Baja",
                        estadoOrdenesKey: "Green",
                        programadas: "720 h",
                        reales: "540 h",
                        utilHoras: "75%",
                        estadoHoras: "Baja",
                        estadoHorasKey: "Green",
                        disponibles: "7",
                        utilRecursos: "55%",
                        estadoRecursos: "Alta",
                        estadoRecursosKey: "Green"
                    }
                ],

                composicion: [
                    { zona: "Sur", vencidas: "46%", vencidasTxt: "46%", excedidas: "14%", excedidasTxt: "14%", recursos: "17%", recursosTxt: "17%", reprogramaciones: "8%", reprogramacionesTxt: "8%", materiales: "15%", materialesTxt: "15%" },
                    { zona: "Norte", vencidas: "38%", vencidasTxt: "38%", excedidas: "18%", excedidasTxt: "18%", recursos: "20%", recursosTxt: "20%", reprogramaciones: "9%", reprogramacionesTxt: "9%", materiales: "15%", materialesTxt: "15%" },
                    { zona: "Centro", vencidas: "28%", vencidasTxt: "28%", excedidas: "17%", excedidasTxt: "17%", recursos: "20%", recursosTxt: "20%", reprogramaciones: "14%", reprogramacionesTxt: "14%", materiales: "15%", materialesTxt: "15%" },
                    { zona: "Este", vencidas: "26%", vencidasTxt: "26%", excedidas: "16%", excedidasTxt: "16%", recursos: "13%", recursosTxt: "13%", reprogramaciones: "20%", reprogramacionesTxt: "20%", materiales: "25%", materialesTxt: "25%" },
                    { zona: "Oeste", vencidas: "24%", vencidasTxt: "24%", excedidas: "14%", excedidasTxt: "14%", recursos: "21%", recursosTxt: "21%", reprogramaciones: "16%", reprogramacionesTxt: "16%", materiales: "25%", materialesTxt: "25%" }
                ],

                capacidad: [
                    { zona: "Sur", recursos: 14 },
                    { zona: "Norte", recursos: 10 },
                    { zona: "Centro", recursos: 6 },
                    { zona: "Este", recursos: 8 },
                    { zona: "Oeste", recursos: 13 }
                ],

                redistribucion: [
                    { origen: "Sur", destino: "Oeste", motivo: "Oeste tiene capacidad disponible" },
                    { origen: "Sur", destino: "Este", motivo: "Este tiene menor utilización" },
                    { origen: "Norte", destino: "Este", motivo: "Este tiene menor utilización" }
                ]
            };
        },

        _configurarGraficaCapacidad: function () {
            var oChart = this.byId("vfCapacidadDisponible");

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                plotArea: {
                    colorPalette: ["#16A34A"],
                    drawingEffect: "normal",
                    marker: {
                        visible: true,
                        size: 7
                    },
                    dataLabel: {
                        visible: false
                    },
                    line: {
                        width: 3
                    }
                },
                legend: {
                    visible: true,
                    label: {
                        style: {
                            color: "#172554",
                            fontSize: "10px"
                        }
                    }
                },
                title: {
                    visible: false
                },
                valueAxis: {
                    title: {
                        visible: true,
                        text: "Recursos disponibles (uds.)",
                        style: {
                            color: "#16A34A",
                            fontSize: "10px"
                        }
                    },
                    label: {
                        style: {
                            color: "#16A34A",
                            fontSize: "10px"
                        }
                    },
                    scale: {
                        fixedRange: true,
                        minValue: 0,
                        maxValue: 16
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
                            color: "#172554",
                            fontSize: "10px",
                            fontWeight: "bold"
                        }
                    }
                },
                tooltip: {
                    visible: true
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

        onBuscarZona: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || "";
            var oTable = this.byId("tblBalanceZona");
            var oBinding = oTable && oTable.getBinding("items");

            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            oBinding.filter([
                new Filter("zona", FilterOperator.Contains, sValue)
            ]);
        }
    });
});
