sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet"
], function (
    Controller,
    JSONModel,
    MessageToast,
    includeStylesheet
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleCumplimientoOrdenes",
        {

            onInit: function () {
                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/DetalleCumplimientoOrdenes.css"
                    )
                );

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
                        ordenesEjecutadas: "483",
                        brecha: "-37",
                        cumplimientoGeneral: "92.9%"
                    },

                    graficas: {
                        elevadoresDesviacion: [
                            {
                                elevador: "EV-1024",
                                cliente: "Torre Reforma",
                                otNoEjecutadas: 8
                            },
                            {
                                elevador: "EV-0271",
                                cliente: "Plaza Central",
                                otNoEjecutadas: 5
                            },
                            {
                                elevador: "EV-0615",
                                cliente: "Hospital San José",
                                otNoEjecutadas: 4
                            },
                            {
                                elevador: "EV-0442",
                                cliente: "Corporativo Delta",
                                otNoEjecutadas: 3
                            },
                            {
                                elevador: "EV-0318",
                                cliente: "Residencial Alvarista",
                                otNoEjecutadas: 2
                            }
                        ],

                        causasZona: [
                            {
                                causa: "Falta de mantenimiento",
                                norte: 4,
                                centro: 4,
                                sur: 2,
                                este: 1,
                                oeste: 1,
                                total: 12
                            },
                            {
                                causa: "Falta de refacciones",
                                norte: 3,
                                centro: 2,
                                sur: 2,
                                este: 1,
                                oeste: 0,
                                total: 8
                            },
                            {
                                causa: "Cliente no disponible",
                                norte: 2,
                                centro: 1,
                                sur: 1,
                                este: 1,
                                oeste: 0,
                                total: 5
                            },
                            {
                                causa: "Reprogramación",
                                norte: 1,
                                centro: 1,
                                sur: 1,
                                este: 1,
                                oeste: 0,
                                total: 4
                            },
                            {
                                causa: "Mecánico no disponible",
                                norte: 3,
                                centro: 1,
                                sur: 2,
                                este: 1,
                                oeste: 1,
                                total: 8
                            },
                            {
                                causa: "Otras causas",
                                norte: 1,
                                centro: 1,
                                sur: 0,
                                este: 1,
                                oeste: 0,
                                total: 3
                            }
                        ],

                        responsables: [
                            {
                                responsable: "Luis Pérez",
                                ordenesEjecutadas: 4,
                                enRevision: 2,
                                areaTecnica: 1
                            },
                            {
                                responsable: "María García",
                                ordenesEjecutadas: 3,
                                enRevision: 2,
                                areaTecnica: 1
                            },
                            {
                                responsable: "Carlos Herrera",
                                ordenesEjecutadas: 2,
                                enRevision: 2,
                                areaTecnica: 1
                            },
                            {
                                responsable: "Pedro López",
                                ordenesEjecutadas: 2,
                                enRevision: 1,
                                areaTecnica: 1
                            },
                            {
                                responsable: "Ana Martínez",
                                ordenesEjecutadas: 1,
                                enRevision: 1,
                                areaTecnica: 0
                            }
                        ],

                        tendenciaEjecucion: [
                            {
                                mes: "Ene 2024",
                                otPlaneadas: 520,
                                otEjecutadas: 437,
                                cumplimiento: 84
                            },
                            {
                                mes: "Feb 2024",
                                otPlaneadas: 540,
                                otEjecutadas: 493,
                                cumplimiento: 91
                            },
                            {
                                mes: "Mar 2024",
                                otPlaneadas: 560,
                                otEjecutadas: 532,
                                cumplimiento: 95
                            },
                            {
                                mes: "Abr 2024",
                                otPlaneadas: 580,
                                otEjecutadas: 545,
                                cumplimiento: 94
                            },
                            {
                                mes: "May 2024",
                                otPlaneadas: 520,
                                otEjecutadas: 483,
                                cumplimiento: 92.9
                            }
                        ],

                        fallasServicios: [
                            {
                                falla: "Falla mecánica",
                                total: 7,
                                porcentaje: 32
                            },
                            {
                                falla: "Falla eléctrica",
                                total: 5,
                                porcentaje: 23
                            },
                            {
                                falla: "Puertas / sensores",
                                total: 4,
                                porcentaje: 18
                            },
                            {
                                falla: "Sistemas de tracción",
                                total: 3,
                                porcentaje: 14
                            },
                            {
                                falla: "Maniobras / control",
                                total: 2,
                                porcentaje: 9
                            },
                            {
                                falla: "Otra",
                                total: 1,
                                porcentaje: 4
                            }
                        ]
                    }
                };

                this.getView().setModel(
                    new JSONModel(oData),
                    "cumplimientoModel"
                );
            },

            onAfterRendering: function () {
                if (this._iChartTimer) {
                    clearTimeout(this._iChartTimer);
                }

                this._iChartTimer = setTimeout(
                    function () {
                        this._configurarGraficas();
                    }.bind(this),
                    200
                );
            },

            onExit: function () {
                if (this._iChartTimer) {
                    clearTimeout(this._iChartTimer);
                    this._iChartTimer = null;
                }
            },

            _configurarGraficas: function () {
                this._configurarBarraApilada(
                    "vfResponsables"
                );

                this._configurarLineaDual(
                    "vfTendenciaEjecucion"
                );

                this._configurarDonut(
                    "vfFallasServicios"
                );
            },

            _configurarBarraApilada: function (sId) {
                var oChart = this.byId(sId);

                if (!oChart) {
                    return;
                }

                oChart.setVizProperties({
                    plotArea: {
                        colorPalette: [
                            "#2563EB",
                            "#16A34A",
                            "#6D28D9"
                        ],

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
                            visible: false
                        },

                        scale: {
                            fixedRange: true,
                            minValue: 0,
                            maxValue: 8
                        },

                        gridline: {
                            visible: true
                        },

                        label: {
                            style: {
                                color: "#64748B",
                                fontSize: "8px"
                            }
                        }
                    },

                    categoryAxis: {
                        title: {
                            visible: false
                        },

                        label: {
                            style: {
                                color: "#334155",
                                fontSize: "8px"
                            }
                        }
                    },

                    interaction: {
                        zoom: {
                            enablement: "disabled"
                        },

                        selectability: {
                            mode: "single"
                        }
                    },

                    background: {
                        color: "transparent"
                    }
                });
            },

            _configurarLineaDual: function (sId) {
                var oChart = this.byId(sId);

                if (!oChart) {
                    return;
                }

                oChart.setVizProperties({
                    plotArea: {
                        colorPalette: [
                            "#94A3B8",
                            "#2563EB",
                            "#16A34A"
                        ],

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
                            visible: false
                        },

                        scale: {
                            fixedRange: true,
                            minValue: 0,
                            maxValue: 700
                        },

                        gridline: {
                            visible: true
                        },

                        label: {
                            style: {
                                color: "#64748B",
                                fontSize: "8px"
                            }
                        }
                    },

                    valueAxis2: {
                        title: {
                            visible: false
                        },

                        scale: {
                            fixedRange: true,
                            minValue: 0,
                            maxValue: 120
                        },

                        gridline: {
                            visible: false
                        },

                        label: {
                            style: {
                                color: "#16A34A",
                                fontSize: "8px"
                            }
                        }
                    },

                    categoryAxis: {
                        title: {
                            visible: false
                        },

                        label: {
                            style: {
                                color: "#334155",
                                fontSize: "8px"
                            }
                        }
                    },

                    interaction: {
                        zoom: {
                            enablement: "disabled"
                        },

                        selectability: {
                            mode: "single"
                        }
                    },

                    background: {
                        color: "transparent"
                    }
                });
            },

            _configurarDonut: function (sId) {
                var oChart = this.byId(sId);

                if (!oChart) {
                    return;
                }

                oChart.setVizProperties({
                    plotArea: {
                        colorPalette: [
                            "#6D28D9",
                            "#2563EB",
                            "#38BDF8",
                            "#F97316",
                            "#9333EA",
                            "#CBD5E1"
                        ],

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

            formatBarPercent: function (nValue) {
                var nPercent = Number(nValue) / 8 * 100;

                return Math.max(
                    0,
                    Math.min(100, nPercent)
                );
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

            formatFallaColorKey: function (sFalla) {
                switch (sFalla) {
                    case "Falla mecánica":
                        return "mecanica";

                    case "Falla eléctrica":
                        return "electrica";

                    case "Puertas / sensores":
                        return "puertas";

                    case "Sistemas de tracción":
                        return "traccion";

                    case "Maniobras / control":
                        return "maniobras";

                    default:
                        return "otra";
                }
            },

            onAplicarFiltros: function () {
                MessageToast.show(
                    "Filtros aplicados correctamente"
                );
            },

            onVerElevadores: function () {
                MessageToast.show(
                    "Detalle de elevadores con desviación"
                );
            },

            onVerDetalleZona: function () {
                MessageToast.show(
                    "Detalle de causas por zona"
                );
            },

            onVerDetalleResponsable: function () {
                MessageToast.show(
                    "Detalle operativo por responsable"
                );
            },

            onVerDetalleFallas: function () {
                MessageToast.show(
                    "Detalle de fallas y servicios afectados"
                );
            }

        }
    );
});