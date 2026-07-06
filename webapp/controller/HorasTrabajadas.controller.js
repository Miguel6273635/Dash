sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.HorasTrabajadas", {

        onInit: function () {
            var oData = {
                filtros: {
                    periodo: "mayo2024",
                    fechaDesde: "01/05/2024",
                    fechaHasta: "31/05/2024",
                    zona: "todas",
                    supervisor: "todos",
                    tipoOrden: "todos",
                    turno: "todos",
                    mecanico: "todos",
                    estadoOrden: "todos"
                },

                kpis: {
                    capacidadComprometida: "92.1%",
                    capacidadComprometidaValor: 92.1,
                    margenCapacidad: "+500 h",
                    margenCapacidadValor: 82,
                    totalHorasExtra: "+360 h",
                    utilizacionProyectada: "98%"
                },

                graficas: {
                    capacidadCarga: [
                        {
                            mes: "Ene",
                            capacidadDisponible: 5000,
                            horasProgramadas: 4300,
                            horasReales: 3500
                        },
                        {
                            mes: "Feb",
                            capacidadDisponible: 5400,
                            horasProgramadas: 4700,
                            horasReales: 3900
                        },
                        {
                            mes: "Mar",
                            capacidadDisponible: 5600,
                            horasProgramadas: 4800,
                            horasReales: 3900
                        },
                        {
                            mes: "Abr",
                            capacidadDisponible: 5900,
                            horasProgramadas: 5100,
                            horasReales: 4550
                        },
                        {
                            mes: "May",
                            capacidadDisponible: 6200,
                            horasProgramadas: 5500,
                            horasReales: 5000
                        },
                        {
                            mes: "Jun",
                            capacidadDisponible: 6400,
                            horasProgramadas: 5900,
                            horasReales: 5342
                        }
                    ],

                    utilizacionTurno: [
                        {
                            mes: "Ene",
                            diurno: 72,
                            nocturno: 42,
                            finSemana: 109
                        },
                        {
                            mes: "Feb",
                            diurno: 78,
                            nocturno: 45,
                            finSemana: 112
                        },
                        {
                            mes: "Mar",
                            diurno: 74,
                            nocturno: 44,
                            finSemana: 108
                        },
                        {
                            mes: "Abr",
                            diurno: 84.9,
                            nocturno: 54.1,
                            finSemana: 117.4
                        },
                        {
                            mes: "May",
                            diurno: 80,
                            nocturno: 46,
                            finSemana: 116
                        },
                        {
                            mes: "Jun",
                            diurno: 82,
                            nocturno: 48,
                            finSemana: 112
                        }
                    ],

                    horasTipoOrden: [
                        {
                            tipo: "Implementación planeada",
                            horasProgramadas: 3100,
                            horasReales: 2950,
                            variacion: -4.8,
                            variacionTexto: "-4.8%"
                        },
                        {
                            tipo: "Reparación correctiva",
                            horasProgramadas: 1700,
                            horasReales: 1900,
                            variacion: 11.8,
                            variacionTexto: "+11.8%"
                        },
                        {
                            tipo: "Call Center",
                            horasProgramadas: 692,
                            horasReales: 620,
                            variacion: 11.3,
                            variacionTexto: "+11.3%"
                        }
                    ],

                    capacidadZona: [
                        {
                            zona: "Norte",
                            utilizacion: 101.3,
                            utilizacionTexto: "101.3%"
                        },
                        {
                            zona: "Centro",
                            utilizacion: 81.5,
                            utilizacionTexto: "81.5%"
                        },
                        {
                            zona: "Sur",
                            utilizacion: 85.8,
                            utilizacionTexto: "85.8%"
                        },
                        {
                            zona: "Este",
                            utilizacion: 64.5,
                            utilizacionTexto: "64.5%"
                        },
                        {
                            zona: "Oeste",
                            utilizacion: 48.3,
                            utilizacionTexto: "48.3%"
                        }
                    ],

                    causasDesviacion: [
                        {
                            causa: "Reparación compleja",
                            horas: 120,
                            horasTexto: "+120 h",
                            porcentaje: 33,
                            porcentajeTexto: "33%"
                        },
                        {
                            causa: "Falta de refacción durante servicio",
                            horas: 80,
                            horasTexto: "+80 h",
                            porcentaje: 22,
                            porcentajeTexto: "22%"
                        },
                        {
                            causa: "Reproceso",
                            horas: 65,
                            horasTexto: "+65 h",
                            porcentaje: 18,
                            porcentajeTexto: "18%"
                        },
                        {
                            causa: "Acceso tardío del cliente",
                            horas: 40,
                            horasTexto: "+40 h",
                            porcentaje: 11,
                            porcentajeTexto: "11%"
                        },
                        {
                            causa: "Diagnóstico adicional",
                            horas: 35,
                            horasTexto: "+35 h",
                            porcentaje: 10,
                            porcentajeTexto: "10%"
                        },
                        {
                            causa: "Otros",
                            horas: 20,
                            horasTexto: "+20 h",
                            porcentaje: 6,
                            porcentajeTexto: "6%"
                        }
                    ],

                    proyeccionCierre: [
                        {
                            fecha: "01 May",
                            utilizacion: 62
                        },
                        {
                            fecha: "04 May",
                            utilizacion: 78
                        },
                        {
                            fecha: "08 May",
                            utilizacion: 71
                        },
                        {
                            fecha: "11 May",
                            utilizacion: 88
                        },
                        {
                            fecha: "15 May",
                            utilizacion: 84
                        },
                        {
                            fecha: "18 May",
                            utilizacion: 94
                        },
                        {
                            fecha: "22 May",
                            utilizacion: 98
                        },
                        {
                            fecha: "26 May",
                            utilizacion: 104
                        },
                        {
                            fecha: "31 May",
                            utilizacion: 112
                        }
                    ]
                }
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "horasModel");
        },

        onAfterRendering: function () {
            this._configurarGraficas();
        },

        _configurarGraficas: function () {
            this._configurarLinea(
                "vfCapacidadCarga",
                [
                    "#2563EB",
                    "#16A34A",
                    "#6D28D9"
                ],
                "Horas hombre",
                0,
                8000
            );

            this._configurarLinea(
                "vfUtilizacionTurno",
                [
                    "#16A34A",
                    "#F59E0B",
                    "#EF4444"
                ],
                "Utilización (%)",
                0,
                150
            );

            this._configurarLinea(
                "vfHorasTipoOrden",
                [
                    "#2563EB",
                    "#7C3AED"
                ],
                "Horas hombre",
                0,
                4000
            );

            this._configurarLinea(
                "vfProyeccionCierre",
                [
                    "#3B82F6"
                ],
                "Utilización (%)",
                0,
                150
            );
        },

        _configurarLinea: function (sId, aColors, sAxisTitle, iMin, iMax) {
            var oChart = this.byId(sId);

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    drawingEffect: "normal",
                    marker: {
                        visible: true,
                        size: 6
                    },
                    dataLabel: {
                        visible: false
                    },
                    line: {
                        width: 3
                    }
                },
                legend: {
                    visible: false
                },
                legendGroup: {
                    layout: {
                        position: "top"
                    }
                },
                title: {
                    visible: false
                },
                valueAxis: {
                    title: {
                        visible: true,
                        text: sAxisTitle
                    },
                    label: {
                        style: {
                            color: "#64748B",
                            fontSize: "11px"
                        }
                    },
                    scale: {
                        fixedRange: true,
                        minValue: iMin,
                        maxValue: iMax
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
                            fontSize: "11px"
                        }
                    }
                },
                interaction: {
                    selectability: {
                        mode: "single"
                    }
                },
                tooltip: {
                    visible: true
                },
                background: {
                    color: "transparent"
                }
            });
        },

        formatUtilizacionState: function (nValue) {
            var n = Number(nValue);

            if (n >= 100) {
                return "Error";
            }

            if (n >= 90) {
                return "Warning";
            }

            if (n < 50) {
                return "None";
            }

            return "Success";
        },

        onAplicarFiltros: function () {
            MessageToast.show("Filtros aplicados correctamente");
        },

        onVerDetalleTipoOrden: function () {
            MessageToast.show("Detalle por tipo de orden");
        },

        onVerDetalleZona: function () {
            MessageToast.show("Detalle por zona");
        },

        onVerDetalleCausa: function () {
            MessageToast.show("Detalle por causa");
        }

    });
});