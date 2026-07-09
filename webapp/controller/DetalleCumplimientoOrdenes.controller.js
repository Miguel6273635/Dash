sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCumplimientoOrdenes", {
        

        onInit: function () {
            var oData = {
                filtros: {
                    periodo: "mayo2024",
                    fechaDesde: "01/05/2024",
                    fechaHasta: "31/05/2024",
                    zona: "todas",
                    supervisor: "todos",
                    tipoServicio: "todos"
                },

                kpis: {
                    ordenesPlaneadas: "520",
                    ordenesPlaneadasValor: 520,

                    ordenesEjecutadas: "483",
                    ordenesEjecutadasValor: 483,

                    brecha: "-37",
                    brechaValor: -37,
                    brechaPorcentaje: 7.1,

                    cumplimientoGeneral: "92.9%",
                    cumplimientoGeneralValor: 92.9
                },

                graficas: {
                    descomposicionBrecha: [
                        { concepto: "Plan", tipo: "Plan", valor: 520 },
                        { concepto: "Falta de mantenimiento", tipo: "Brecha", valor: -12 },
                        { concepto: "Falta de refacciones", tipo: "Brecha", valor: -8 },
                        { concepto: "Cliente no disponible", tipo: "Brecha", valor: -5 },
                        { concepto: "Reprogramación", tipo: "Brecha", valor: -4 },
                        { concepto: "Mecánico no disponible", tipo: "Brecha", valor: -8 },
                        { concepto: "Resultado real", tipo: "Resultado real", valor: 483 }
                    ],

                    elevadoresDesviacion: [
                        { elevador: "EV-1024", cliente: "Torre Reforma", otNoEjecutadas: 8 },
                        { elevador: "EV-0271", cliente: "Plaza Central", otNoEjecutadas: 5 },
                        { elevador: "EV-0615", cliente: "Hospital San José", otNoEjecutadas: 4 },
                        { elevador: "EV-0442", cliente: "Corporativo Delta", otNoEjecutadas: 3 },
                        { elevador: "EV-0318", cliente: "Residencial Alvarista", otNoEjecutadas: 2 }
                    ],

                    causasZona: [
                        { causa: "Falta de mantenimiento", norte: 4, centro: 4, sur: 2, este: 1, oeste: 1, total: 12 },
                        { causa: "Falta de refacciones", norte: 3, centro: 2, sur: 2, este: 1, oeste: 0, total: 8 },
                        { causa: "Cliente no disponible", norte: 2, centro: 1, sur: 1, este: 1, oeste: 0, total: 5 },
                        { causa: "Reprogramación", norte: 1, centro: 1, sur: 1, este: 1, oeste: 0, total: 4 },
                        { causa: "Mecánico no disponible", norte: 3, centro: 1, sur: 2, este: 1, oeste: 1, total: 8 },
                        { causa: "Otras causas", norte: 1, centro: 1, sur: 0, este: 1, oeste: 0, total: 3 }
                    ],

                    responsables: [
                        { responsable: "Luis Pérez", ordenesEjecutadas: 4, enRevision: 2, areaTecnica: 1, total: 7 },
                        { responsable: "María García", ordenesEjecutadas: 3, enRevision: 2, areaTecnica: 1, total: 6 },
                        { responsable: "Carlos Herrera", ordenesEjecutadas: 2, enRevision: 2, areaTecnica: 1, total: 5 },
                        { responsable: "Pedro López", ordenesEjecutadas: 2, enRevision: 1, areaTecnica: 1, total: 4 },
                        { responsable: "Ana Martínez", ordenesEjecutadas: 1, enRevision: 1, areaTecnica: 0, total: 2 }
                    ],

                    tendenciaEjecucion: [
                        { mes: "Ene 2024", otPlaneadas: 520, otEjecutadas: 437, brecha: -83, cumplimiento: 84 },
                        { mes: "Feb 2024", otPlaneadas: 540, otEjecutadas: 493, brecha: -47, cumplimiento: 91 },
                        { mes: "Mar 2024", otPlaneadas: 560, otEjecutadas: 532, brecha: -28, cumplimiento: 95 },
                        { mes: "Abr 2024", otPlaneadas: 580, otEjecutadas: 545, brecha: -35, cumplimiento: 94 },
                        { mes: "May 2024", otPlaneadas: 520, otEjecutadas: 483, brecha: -37, cumplimiento: 92.9 }
                    ],

                    fallasServicios: [
                        { falla: "Falla mecánica", total: 7, porcentaje: 32 },
                        { falla: "Falla eléctrica", total: 5, porcentaje: 23 },
                        { falla: "Puertas / sensores", total: 4, porcentaje: 18 },
                        { falla: "Sistemas de tracción", total: 3, porcentaje: 14 },
                        { falla: "Maniobras / control", total: 2, porcentaje: 9 },
                        { falla: "Otra", total: 1, porcentaje: 4 }
                    ]
                }
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "cumplimientoModel");
        },

        onAfterRendering: function () {
            var that = this;

            setTimeout(function () {
                that._configurarGraficas();
            }, 300);
        },

        _configurarGraficas: function () {
            this._configurarColumna(
                "vfDescomposicionBrecha",
                ["#CBD5E1", "#EF4444", "#2563EB"],
                "Órdenes",
                -100,
                600
            );

            this._configurarBarraHorizontal(
                "vfElevadoresDesviacion",
                ["#6D28D9"],
                "OT no ejecutadas",
                0,
                10
            );

            this._configurarBarraApilada(
                "vfResponsables",
                ["#2563EB", "#16A34A", "#6D28D9"],
                "Órdenes",
                0,
                8
            );

            this._configurarLinea(
                "vfTendenciaEjecucion",
                ["#94A3B8", "#2563EB", "#16A34A"],
                "Órdenes / Cumplimiento",
                0,
                700
            );

            this._configurarDonut(
                "vfFallasServicios",
                ["#6D28D9", "#2563EB", "#38BDF8", "#F97316", "#9333EA", "#CBD5E1"]
            );
        },

        _configurarColumna: function (sId, aColors, sAxisTitle, iMin, iMax) {
            var oChart = this.byId(sId);

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    drawingEffect: "normal",
                    dataLabel: {
                        visible: true,
                        style: {
                            color: "#111827",
                            fontSize: "10px"
                        }
                    }
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
                        text: sAxisTitle
                    },
                    label: {
                        style: {
                            color: "#64748B",
                            fontSize: "10px"
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
                            fontSize: "9px"
                        }
                    }
                },
                tooltip: {
                    visible: true
                },
                interaction: {
                    selectability: {
                        mode: "single"
                    }
                },
                background: {
                    color: "transparent"
                }
            });
        },

        _configurarBarraHorizontal: function (sId, aColors, sAxisTitle, iMin, iMax) {
            var oChart = this.byId(sId);

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    drawingEffect: "normal",
                    dataLabel: {
                        visible: true,
                        position: "outside",
                        style: {
                            color: "#111827",
                            fontSize: "10px"
                        }
                    }
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
                        text: sAxisTitle
                    },
                    label: {
                        style: {
                            color: "#64748B",
                            fontSize: "10px"
                        }
                    },
                    scale: {
                        fixedRange: true,
                        minValue: iMin,
                        maxValue: iMax
                    },
                    gridline: {
                        visible: false
                    }
                },
                categoryAxis: {
                    title: {
                        visible: false
                    },
                    label: {
                        style: {
                            color: "#334155",
                            fontSize: "10px"
                        }
                    }
                },
                tooltip: {
                    visible: true
                },
                interaction: {
                    selectability: {
                        mode: "single"
                    }
                },
                background: {
                    color: "transparent"
                }
            });
        },

        _configurarBarraApilada: function (sId, aColors, sAxisTitle, iMin, iMax) {
            var oChart = this.byId(sId);

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    drawingEffect: "normal",
                    dataLabel: {
                        visible: false
                    }
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
                        text: sAxisTitle
                    },
                    label: {
                        style: {
                            color: "#64748B",
                            fontSize: "10px"
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
                            fontSize: "10px"
                        }
                    }
                },
                tooltip: {
                    visible: true
                },
                interaction: {
                    selectability: {
                        mode: "single"
                    }
                },
                background: {
                    color: "transparent"
                }
            });
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
                        size: 4
                    },
                    dataLabel: {
                        visible: false
                    },
                    line: {
                        width: 2
                    }
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
                        text: sAxisTitle
                    },
                    label: {
                        style: {
                            color: "#64748B",
                            fontSize: "10px"
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
                            fontSize: "10px"
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

        _configurarDonut: function (sId, aColors) {
            var oChart = this.byId(sId);

            if (!oChart) {
                return;
            }

            oChart.setVizProperties({
                plotArea: {
                    colorPalette: aColors,
                    drawingEffect: "normal",
                    dataLabel: {
                        visible: false
                    }
                },
                legend: {
                    visible: true,
                    position: "right",
                    label: {
                        style: {
                            color: "#334155",
                            fontSize: "10px"
                        }
                    }
                },
                title: {
                    visible: false
                },
                tooltip: {
                    visible: true
                },
                interaction: {
                    selectability: {
                        mode: "single"
                    }
                },
                background: {
                    color: "transparent"
                }
            });
        },

        formatEstadoCumplimiento: function (nValue) {
            var n = Number(nValue);

            if (n >= 95) {
                return "Success";
            }

            if (n >= 85) {
                return "Warning";
            }

            return "Error";
        },

        formatHeatLevel: function (nValue) {
            var n = Number(nValue);

            if (n >= 4) {
                return "4";
            }

            if (n >= 3) {
                return "3";
            }

            if (n >= 2) {
                return "2";
            }

            if (n >= 1) {
                return "1";
            }

            return "0";
        },

        onAplicarFiltros: function () {
            MessageToast.show("Filtros aplicados correctamente");
        },

        onVerElevadores: function () {
            MessageToast.show("Detalle de elevadores con desviación");
        },

        onVerDetalleZona: function () {
            MessageToast.show("Detalle de causas por zona");
        },

        onVerDetalleResponsable: function () {
            MessageToast.show("Detalle operativo por responsable");
        },

        onVerDetalleFallas: function () {
            MessageToast.show("Detalle de fallas y servicios afectados");
        }

    });
});