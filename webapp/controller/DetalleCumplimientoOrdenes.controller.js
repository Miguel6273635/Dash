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

                this._crearModelo();
            },

            onAfterRendering: function () {
                var that = this;

                window.setTimeout(function () {
                    that._renderizarVisualizaciones();
                }, 80);
            },

            _crearModelo: function () {
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
                        ordenesPlaneadas: 520,
                        ordenesEjecutadas: 483,
                        brecha: -37,
                        cumplimientoGeneral: "92.9%"
                    },

                    graficas: {
                        descomposicionBrecha: [
                            {
                                concepto: "Plan inicial",
                                valor: 520,
                                tipo: "plan"
                            },
                            {
                                concepto: "Falta de mantenimiento",
                                valor: -12,
                                tipo: "brecha"
                            },
                            {
                                concepto: "Falta de refacciones",
                                valor: -8,
                                tipo: "brecha"
                            },
                            {
                                concepto: "Cliente no disponible",
                                valor: -5,
                                tipo: "brecha"
                            },
                            {
                                concepto: "Reprogramación",
                                valor: -4,
                                tipo: "brecha"
                            },
                            {
                                concepto: "Mecánico no disponible",
                                valor: -8,
                                tipo: "brecha"
                            },
                            {
                                concepto: "Resultado real",
                                valor: 483,
                                tipo: "resultado"
                            }
                        ],

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
                                ordenesEjecutadas: 2,
                                enRevision: 4,
                                areaTecnica: 1,
                                total: 7,
                                unidades: [
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "true",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "tecnica",
                                        inicio: "false",
                                        fin: "true"
                                    }
                                ]
                            },

                            {
                                responsable: "María García",
                                ordenesEjecutadas: 2,
                                enRevision: 3,
                                areaTecnica: 1,
                                total: 6,
                                unidades: [
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "true",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "tecnica",
                                        inicio: "false",
                                        fin: "true"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    }
                                ]
                            },

                            {
                                responsable: "Carlos Herrera",
                                ordenesEjecutadas: 2,
                                enRevision: 2,
                                areaTecnica: 1,
                                total: 5,
                                unidades: [
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "true",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "tecnica",
                                        inicio: "false",
                                        fin: "true"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    }
                                ]
                            },

                            {
                                responsable: "Pedro López",
                                ordenesEjecutadas: 1,
                                enRevision: 1,
                                areaTecnica: 1,
                                total: 3,
                                unidades: [
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "true",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "tecnica",
                                        inicio: "false",
                                        fin: "true"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    }
                                ]
                            },

                            {
                                responsable: "Ana Martínez",
                                ordenesEjecutadas: 1,
                                enRevision: 1,
                                areaTecnica: 0,
                                total: 2,
                                unidades: [
                                    {
                                        tipo: "ejecutadas",
                                        inicio: "true",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "revision",
                                        inicio: "false",
                                        fin: "true"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    },
                                    {
                                        tipo: "vacia",
                                        inicio: "false",
                                        fin: "false"
                                    }
                                ]
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

                var oModel = new JSONModel(oData);

                oModel.setSizeLimit(100);

                this.getView().setModel(
                    oModel,
                    "cumplimientoModel"
                );
            },

            _renderizarVisualizaciones: function () {
                this._renderizarResponsables();
                this._renderizarTendencia();
                this._renderizarFallas();
            },

            _renderizarResponsables: function () {
                var oHtml = this.byId("htmlResponsables");
                var oModel = this.getView().getModel(
                    "cumplimientoModel"
                );
                var aData;
                var nMax = 7;
                var sRows;
                var sContent;

                if (!oHtml || !oModel) {
                    return;
                }

                aData = oModel.getProperty(
                    "/graficas/responsables"
                ) || [];

                sRows = aData.map(function (oItem) {
                    var nInterna = Number(
                        oItem.ordenesEjecutadas || 0
                    );
                    var nExterna = Number(
                        oItem.enRevision || 0
                    );
                    var nTecnica = Number(
                        oItem.areaTecnica || 0
                    );
                    var nTotal = Number(
                        oItem.total || 0
                    );
                    var nWidth = nTotal / nMax * 100;
                    var nInternaWidth = nTotal ?
                        nInterna / nTotal * 100 : 0;
                    var nExternaWidth = nTotal ?
                        nExterna / nTotal * 100 : 0;
                    var nTecnicaWidth = nTotal ?
                        nTecnica / nTotal * 100 : 0;

                    return [
                        '<div class="dcgoRespHtmlRow">',
                            '<div class="dcgoRespHtmlName">',
                                this._escapeHtml(
                                    oItem.responsable
                                ),
                            '</div>',
                            '<div class="dcgoRespHtmlTrack">',
                                '<div class="dcgoRespHtmlBar" ',
                                    'style="width:',
                                    nWidth.toFixed(3),
                                    '%">',
                                    '<div class="dcgoRespHtmlSegment dcgoRespInterna" ',
                                        'style="width:',
                                        nInternaWidth.toFixed(3),
                                        '%">',
                                        nInterna || '',
                                    '</div>',
                                    '<div class="dcgoRespHtmlSegment dcgoRespExterna" ',
                                        'style="width:',
                                        nExternaWidth.toFixed(3),
                                        '%">',
                                        nExterna || '',
                                    '</div>',
                                    '<div class="dcgoRespHtmlSegment dcgoRespTecnica" ',
                                        'style="width:',
                                        nTecnicaWidth.toFixed(3),
                                        '%">',
                                        nTecnica || '',
                                    '</div>',
                                '</div>',
                            '</div>',
                            '<div class="dcgoRespHtmlTotal">',
                                nTotal,
                            '</div>',
                        '</div>'
                    ].join('');
                }.bind(this)).join('');

                sContent = [
                    '<div class="dcgoRespHtmlRoot">',
                        '<div class="dcgoRespHtmlLegend">',
                            '<div class="dcgoRespHtmlLegendItems">',
                                '<span><i class="dcgoRespDot dcgoRespInterna"></i>',
                                    'Interna (operación)</span>',
                                '<span><i class="dcgoRespDot dcgoRespExterna"></i>',
                                    'Externa (cliente/proveedor)</span>',
                                '<span><i class="dcgoRespDot dcgoRespTecnica"></i>',
                                    'Área técnica</span>',
                            '</div>',
                            '<strong>Total</strong>',
                        '</div>',
                        '<div class="dcgoRespHtmlRows">',
                            sRows,
                        '</div>',
                        '<div class="dcgoRespHtmlFooter">',
                            '<span class="dcgoRespInfoMark">i</span>',
                            'Las barras destacan representación (%) ',
                            'del total de la desviación.',
                        '</div>',
                    '</div>'
                ].join('');

                oHtml.setContent(sContent);
            },

            _renderizarTendencia: function () {
                var oHtml = this.byId(
                    "htmlTendenciaEjecucion"
                );
                var oModel = this.getView().getModel(
                    "cumplimientoModel"
                );
                var aData;
                var nWidth = 720;
                var nHeight = 265;
                var nLeft = 54;
                var nRight = 50;
                var nTop = 20;
                var nBottom = 44;
                var nPlotWidth = nWidth - nLeft - nRight;
                var nPlotHeight = nHeight - nTop - nBottom;
                var nOtMax = 800;
                var nPctMax = 125;
                var aX;
                var fnYOT;
                var fnYPct;
                var fnPoints;
                var sPlanPoints;
                var sExecutedPoints;
                var sCompliancePoints;
                var sAreaPoints;
                var sGrid;
                var sMonths;
                var sMarkers;
                var sContent;

                if (!oHtml || !oModel) {
                    return;
                }

                aData = oModel.getProperty(
                    "/graficas/tendenciaEjecucion"
                ) || [];

                if (!aData.length) {
                    oHtml.setContent("");
                    return;
                }

                aX = aData.map(function (oItem, iIndex) {
                    if (aData.length === 1) {
                        return nLeft + nPlotWidth / 2;
                    }

                    return nLeft +
                        iIndex * nPlotWidth /
                        (aData.length - 1);
                });

                fnYOT = function (nValue) {
                    return nTop + nPlotHeight -
                        Number(nValue || 0) /
                        nOtMax * nPlotHeight;
                };

                fnYPct = function (nValue) {
                    return nTop + nPlotHeight -
                        Number(nValue || 0) /
                        nPctMax * nPlotHeight;
                };

                fnPoints = function (sProperty, fnY) {
                    return aData.map(function (oItem, iIndex) {
                        return aX[iIndex].toFixed(1) + "," +
                            fnY(oItem[sProperty]).toFixed(1);
                    }).join(" ");
                };

                sPlanPoints = fnPoints(
                    "otPlaneadas",
                    fnYOT
                );
                sExecutedPoints = fnPoints(
                    "otEjecutadas",
                    fnYOT
                );
                sCompliancePoints = fnPoints(
                    "cumplimiento",
                    fnYPct
                );
                sAreaPoints = [
                    nLeft + "," + (nTop + nPlotHeight),
                    sExecutedPoints,
                    (nLeft + nPlotWidth) + "," +
                        (nTop + nPlotHeight)
                ].join(" ");

                sGrid = [0, 200, 400, 600, 800].map(
                    function (nValue) {
                        var nY = fnYOT(nValue);

                        return [
                            '<line x1="', nLeft,
                                '" y1="', nY.toFixed(1),
                                '" x2="',
                                (nLeft + nPlotWidth),
                                '" y2="', nY.toFixed(1),
                                '" class="dcgoSvgGrid"/>',
                            '<text x="', (nLeft - 10),
                                '" y="', (nY + 3).toFixed(1),
                                '" text-anchor="end" ',
                                'class="dcgoSvgAxisLabel">',
                                nValue,
                            '</text>'
                        ].join('');
                    }
                ).join('');

                sGrid += [0, 25, 50, 75, 100, 125].map(
                    function (nValue) {
                        var nY = fnYPct(nValue);

                        return [
                            '<text x="',
                                (nLeft + nPlotWidth + 10),
                                '" y="', (nY + 3).toFixed(1),
                                '" class="dcgoSvgPctLabel">',
                                nValue, '%',
                            '</text>'
                        ].join('');
                    }
                ).join('');

                sMonths = aData.map(
                    function (oItem, iIndex) {
                        return [
                            '<text x="', aX[iIndex].toFixed(1),
                                '" y="', (nHeight - 10),
                                '" text-anchor="middle" ',
                                'class="dcgoSvgMonth">',
                                this._escapeHtml(oItem.mes),
                            '</text>'
                        ].join('');
                    }.bind(this)
                ).join('');

                sMarkers = aData.map(
                    function (oItem, iIndex) {
                        var nX = aX[iIndex];
                        var nPlanY = fnYOT(
                            oItem.otPlaneadas
                        );
                        var nExecY = fnYOT(
                            oItem.otEjecutadas
                        );
                        var nPctY = fnYPct(
                            oItem.cumplimiento
                        );
                        var sPct = Number(
                            oItem.cumplimiento
                        ) % 1 === 0 ?
                            Number(oItem.cumplimiento) :
                            Number(oItem.cumplimiento)
                                .toFixed(1);

                        return [
                            '<circle cx="', nX.toFixed(1),
                                '" cy="', nPlanY.toFixed(1),
                                '" r="3.2" class="dcgoSvgPlanPoint"/>',
                            '<circle cx="', nX.toFixed(1),
                                '" cy="', nExecY.toFixed(1),
                                '" r="4" class="dcgoSvgExecPoint"/>',
                            '<circle cx="', nX.toFixed(1),
                                '" cy="', nPctY.toFixed(1),
                                '" r="4" class="dcgoSvgPctPoint"/>',
                            '<text x="', nX.toFixed(1),
                                '" y="', (nPctY - 9).toFixed(1),
                                '" text-anchor="middle" ',
                                'class="dcgoSvgPctValue">',
                                sPct, '%',
                            '</text>'
                        ].join('');
                    }
                ).join('');

                sContent = [
                    '<div class="dcgoTrendSvgWrap">',
                        '<svg viewBox="0 0 ', nWidth, ' ', nHeight,
                            '" preserveAspectRatio="none" ',
                            'class="dcgoTrendSvg" ',
                            'role="img" ',
                            'aria-label="Tendencia de ejecución">',
                            '<defs>',
                                '<linearGradient id="dcgoExecArea" ',
                                    'x1="0" y1="0" x2="0" y2="1">',
                                    '<stop offset="0%" ',
                                        'stop-color="#2563eb" ',
                                        'stop-opacity="0.22"/>',
                                    '<stop offset="100%" ',
                                        'stop-color="#2563eb" ',
                                        'stop-opacity="0.03"/>',
                                '</linearGradient>',
                            '</defs>',
                            sGrid,
                            '<polygon points="', sAreaPoints,
                                '" fill="url(#dcgoExecArea)"/>',
                            '<polyline points="', sPlanPoints,
                                '" class="dcgoSvgPlanLine"/>',
                            '<polyline points="', sExecutedPoints,
                                '" class="dcgoSvgExecLine"/>',
                            '<polyline points="', sCompliancePoints,
                                '" class="dcgoSvgPctLine"/>',
                            sMarkers,
                            sMonths,
                        '</svg>',
                    '</div>'
                ].join('');

                oHtml.setContent(sContent);
            },

            _renderizarFallas: function () {
                var oHtml = this.byId(
                    "htmlFallasDonut"
                );
                var oModel = this.getView().getModel(
                    "cumplimientoModel"
                );
                var aData;
                var aColors = [
                    "#6D28D9",
                    "#22C55E",
                    "#4F46E5",
                    "#38BDF8",
                    "#F59E0B",
                    "#94A3B8"
                ];
                var nTotal;
                var nStart = 0;
                var aStops = [];
                var sContent;

                if (!oHtml || !oModel) {
                    return;
                }

                aData = oModel.getProperty(
                    "/graficas/fallasServicios"
                ) || [];

                nTotal = aData.reduce(function (nSum, oItem) {
                    return nSum + Number(oItem.total || 0);
                }, 0);

                aData.forEach(function (oItem, iIndex) {
                    var nPercent = nTotal ?
                        Number(oItem.total || 0) /
                        nTotal * 100 : 0;
                    var nEnd = nStart + nPercent;
                    var sColor = aColors[
                        iIndex % aColors.length
                    ];

                    aStops.push(
                        sColor + " " +
                        nStart.toFixed(3) + "% " +
                        nEnd.toFixed(3) + "%"
                    );

                    nStart = nEnd;
                });

                sContent = [
                    '<div class="dcgoCssDonutWrap">',
                        '<div class="dcgoCssDonut" style="background:',
                            'conic-gradient(',
                            aStops.join(','),
                            ')">',
                            '<div class="dcgoCssDonutHole">',
                                '<strong>', nTotal, '</strong>',
                                '<span>OT totales</span>',
                            '</div>',
                        '</div>',
                    '</div>'
                ].join('');

                oHtml.setContent(sContent);
            },

            _escapeHtml: function (vValue) {
                return String(vValue == null ? "" : vValue)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/\"/g, "&quot;")
                    .replace(/'/g, "&#39;");
            },

            formatBarWidth: function (vValue) {
                var nValue = parseFloat(vValue);
                var nPercent;

                if (isNaN(nValue) || nValue <= 0) {
                    return "0%";
                }

                nPercent = nValue / 8 * 100;

                if (nPercent > 100) {
                    nPercent = 100;
                }

                return nPercent + "%";
            },

            formatHeatLevel: function (vValue) {
                var nValue = parseInt(
                    vValue,
                    10
                );

                if (isNaN(nValue) || nValue <= 0) {
                    return "0";
                }

                if (nValue >= 4) {
                    return "4";
                }

                if (nValue === 3) {
                    return "3";
                }

                if (nValue === 2) {
                    return "2";
                }

                return "1";
            },

            formatFallaColorKey: function (sFalla) {
                if (sFalla === "Falla mecánica") {
                    return "mecanica";
                }

                if (sFalla === "Falla eléctrica") {
                    return "electrica";
                }

                if (sFalla === "Puertas / sensores") {
                    return "puertas";
                }

                if (sFalla === "Sistemas de tracción") {
                    return "traccion";
                }

                if (sFalla === "Maniobras / control") {
                    return "maniobras";
                }

                return "otra";
            },

            onAplicarFiltros: function () {
                MessageToast.show(
                    "Filtros aplicados correctamente"
                );

                this._renderizarVisualizaciones();
            },

            onVerElevadores: function () {
                MessageToast.show(
                    "Detalle de elevadores con mayor desviación"
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