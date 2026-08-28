sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/EquiposBloqueadosService",
    "mantenimiento/model/EquiposBloqueadosMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    includeStylesheet,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.EquiposBloqueados",
        {
            onInit: function () {
                this._loadExclusiveStyles();

                this._sSearchQuery = "";

                var oModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                oModel.setSizeLimit(
                    5000
                );

                this.getView().setModel(
                    oModel,
                    "dashboard"
                );

                this._loadData(false);
            },

            _getInitialData:
                function () {
                    var oNow =
                        new Date();

                    var oFirst =
                        new Date(
                            oNow.getFullYear(),
                            oNow.getMonth(),
                            1
                        );

                    var oLast =
                        new Date(
                            oNow.getFullYear(),
                            oNow.getMonth() + 1,
                            0
                        );

                    return {
                        busy:
                            false,

                        filters: {
                            periodo:
                                "ACTUAL",

                            fechaDesde:
                                this._toIsoDate(
                                    oFirst
                                ),

                            fechaHasta:
                                this._toIsoDate(
                                    oLast
                                ),

                            zona:
                                "TODAS",

                            cliente:
                                "TODOS",

                            estatus:
                                "TODOS",

                            supervisor:
                                "TODOS"
                        },

                        kpis: {
                            totalBloqueados:
                                "0",

                            ordenesAfectadas:
                                "0",

                            mayores30Dias:
                                "0",

                            criticos:
                                "0",

                            pendientesDesbloqueo:
                                "0"
                        },

                        gestionDesbloqueo:
                            [],

                        ageSummary: {
                            total:
                                0,

                            over30:
                                0,

                            percentOver30:
                                "0.0"
                        },

                        chartsData: {
                            motivos:
                                [],

                            clientes:
                                [],

                            ordenes:
                                [],

                            antiguedad:
                                [],

                            evolucion: {
                                labels: [],
                                totalBloqueos: [],
                                desbloqueos: [],
                                vigentes: []
                            },

                            matriz:
                                []
                        },

                        charts: {
                            motivos:
                                "",

                            clientes:
                                "",

                            ordenes:
                                "",

                            antiguedad:
                                "",

                            evolucion:
                                "",

                            matriz:
                                ""
                        },

                        equiposAll:
                            [],

                        equipos:
                            [],

                        lastUpdated:
                            "Sin datos",

                        meta:
                            {}
                    };
                },

            _loadExclusiveStyles:
                function () {
                    includeStylesheet(
                        sap.ui.require.toUrl(
                            "mantenimiento/css/EquiposBloqueados.css"
                        ),
                        "equipos-bloqueados-exclusive-css"
                    );
                },

            _getODataModel:
                function () {
                    var oComponent =
                        this.getOwnerComponent();

                    return (
                        oComponent &&
                        oComponent.getModel(
                            "dashboardOData"
                        )
                    ) ||
                    (
                        oComponent &&
                        oComponent.getModel()
                    );
                },

            _loadData:
                function (
                    bNotify
                ) {
                    var oModel =
                        this.getView()
                            .getModel(
                                "dashboard"
                            );

                    var oFilters =
                        Object.assign(
                            {},
                            oModel.getProperty(
                                "/filters"
                            )
                        );

                    oModel.setProperty(
                        "/busy",
                        true
                    );

                    Service
                        .getDashboardData(
                            this._getODataModel()
                        )
                        .then(
                            function (
                                oRaw
                            ) {
                                var oMapped =
                                    Mapper.mapData(
                                        oRaw,
                                        oFilters
                                    );

                                oMapped.filters =
                                    oFilters;

                                oMapped.busy =
                                    true;

                                oMapped.charts =
                                    {
                                        motivos:
                                            this._buildMotivosChart(
                                                oMapped.chartsData.motivos
                                            ),

                                        clientes:
                                            this._buildClientesChart(
                                                oMapped.chartsData.clientes
                                            ),

                                        ordenes:
                                            this._buildOrdenesChart(
                                                oMapped.chartsData.ordenes,
                                                oMapped.kpis.ordenesAfectadas
                                            ),

                                        antiguedad:
                                            this._buildAntiguedadChart(
                                                oMapped.chartsData.antiguedad
                                            ),

                                        evolucion:
                                            this._buildEvolucionChart(
                                                oMapped.chartsData.evolucion
                                            ),

                                        matriz:
                                            this._buildMatrizChart(
                                                oMapped.chartsData.matriz
                                            )
                                    };

                                oModel.setData(
                                    oMapped
                                );

                                this._applySearch();

                                console.log(
                                    "[EB CONTROLLER]",
                                    oMapped.meta
                                );

                                if (bNotify) {
                                    MessageToast.show(
                                        "Datos actualizados"
                                    );
                                }
                            }.bind(this)
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                console.error(
                                    "[EB CONTROLLER]",
                                    oError
                                );

                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "No fue posible consultar los equipos bloqueados."
                                );
                            }
                        )
                        .finally(
                            function () {
                                oModel.setProperty(
                                    "/busy",
                                    false
                                );
                            }
                        );
                },

            onApplyFilters:
                function () {
                    this._loadData(true);
                },

            onLiveSearch:
                function (
                    oEvent
                ) {
                    this._sSearchQuery =
                        (
                            oEvent.getParameter(
                                "newValue"
                            ) || ""
                        )
                            .trim()
                            .toLowerCase();

                    this._applySearch();
                },

            _applySearch:
                function () {
                    var oModel =
                        this.getView()
                            .getModel(
                                "dashboard"
                            );

                    var aRows =
                        oModel.getProperty(
                            "/equiposAll"
                        ) || [];

                    var sQuery =
                        this._sSearchQuery;

                    if (!sQuery) {
                        oModel.setProperty(
                            "/equipos",
                            aRows.slice()
                        );

                        return;
                    }

                    oModel.setProperty(
                        "/equipos",
                        aRows.filter(
                            function (oRow) {
                                return [
                                    oRow.equipo,
                                    oRow.cliente,
                                    oRow.zona,
                                    oRow.estatus,
                                    oRow.motivo,
                                    oRow.responsable,
                                    oRow.proximaAccion,
                                    oRow.prioridad
                                ]
                                    .join(" ")
                                    .toLowerCase()
                                    .indexOf(
                                        sQuery
                                    ) !== -1;
                            }
                        )
                    );
                },

            onToggleColumn:
                function (
                    oEvent
                ) {
                    var oItem =
                        oEvent.getParameter(
                            "item"
                        );

                    var sColumnId =
                        oItem &&
                        oItem.data(
                            "columnId"
                        );

                    var oColumn =
                        sColumnId &&
                        this.byId(
                            sColumnId
                        );

                    if (oColumn) {
                        oColumn.setVisible(
                            !oColumn.getVisible()
                        );
                    }
                },

            onKpiDetail:
                function (
                    oEvent
                ) {
                    var oKpiCard =
                        oEvent
                            .getSource()
                            .getParent();

                    var aLabels =
                        oKpiCard.findAggregatedObjects(
                            true,
                            function (
                                oControl
                            ) {
                                return (
                                    oControl.isA &&
                                    oControl.isA(
                                        "sap.m.Text"
                                    ) &&
                                    oControl.hasStyleClass(
                                        "ebKpiLabel"
                                    )
                                );
                            }
                        );

                    MessageToast.show(
                        aLabels[0]
                            ? "Detalle: " +
                              aLabels[0].getText()
                            : "Detalle del indicador"
                    );
                },

            onEquipoPress:
                function (
                    oEvent
                ) {
                    var oContext =
                        oEvent
                            .getSource()
                            .getBindingContext(
                                "dashboard"
                            );

                    if (
                        !oContext &&
                        oEvent
                            .getSource()
                            .getParent()
                    ) {
                        oContext =
                            oEvent
                                .getSource()
                                .getParent()
                                .getBindingContext(
                                    "dashboard"
                                );
                    }

                    if (oContext) {
                        MessageToast.show(
                            "Equipo: " +
                            oContext.getProperty(
                                "equipo"
                            )
                        );
                    }
                },

            onPagePress:
                function (
                    oEvent
                ) {
                    MessageToast.show(
                        "Página " +
                        oEvent
                            .getSource()
                            .getText()
                    );
                },

            formatDiasState:
                function (
                    iDias
                ) {
                    if (
                        Number(iDias) > 30
                    ) {
                        return "Error";
                    }

                    if (
                        Number(iDias) > 15
                    ) {
                        return "Warning";
                    }

                    return "Success";
                },

            _toIsoDate:
                function (
                    oDate
                ) {
                    return (
                        oDate.getFullYear() +
                        "-" +
                        String(
                            oDate.getMonth() + 1
                        ).padStart(2, "0") +
                        "-" +
                        String(
                            oDate.getDate()
                        ).padStart(2, "0")
                    );
                },

            _emptyChart:
                function () {
                    return [
                        "<div style='",
                        "height:100%;",
                        "display:flex;",
                        "align-items:center;",
                        "justify-content:center;",
                        "color:#8a97a8;",
                        "font-size:.5rem;'>",
                        "Sin datos",
                        "</div>"
                    ].join("");
                },

            _buildMotivosChart:
                function (
                    aItems
                ) {
                    if (
                        !aItems ||
                        !aItems.length
                    ) {
                        return this._emptyChart();
                    }

                    var iMax =
                        Math.max.apply(
                            null,
                            aItems.map(
                                function (
                                    oItem
                                ) {
                                    return (
                                        oItem.value
                                    );
                                }
                            )
                        ) || 1;

                    var sRows =
                        aItems.map(
                            function (
                                oItem
                            ) {
                                return [
                                    "<div class='ebBarChartRow'>",

                                    "<div class='ebBarLabel'>",
                                    oItem.label,
                                    "</div>",

                                    "<div class='ebBarTrack'>",

                                    "<div class='ebBarFill' style='width:",
                                    (
                                        oItem.value /
                                        iMax *
                                        100
                                    ).toFixed(1),
                                    "%;background:",
                                    oItem.color,
                                    ";'></div>",

                                    "</div>",

                                    "<div class='ebBarValue'>",
                                    oItem.value,
                                    " (",
                                    oItem.percent.toFixed(
                                        1
                                    ),
                                    "%)</div>",

                                    "</div>"
                                ].join("");
                            }
                        ).join("");

                    return [
                        "<div class='ebBarChart'>",
                        sRows,
                        "</div>"
                    ].join("");
                },

            _buildClientesChart:
                function (
                    aItems
                ) {
                    if (
                        !aItems ||
                        !aItems.length
                    ) {
                        return this._emptyChart();
                    }

                    return this._buildSingleLineSvg(
                        aItems.map(
                            function (
                                oItem
                            ) {
                                return (
                                    oItem.value
                                );
                            }
                        ),

                        aItems.map(
                            function (
                                oItem
                            ) {
                                return (
                                    oItem.label
                                );
                            }
                        ),

                        {
                            color:
                                "#22a447",

                            width:
                                520,

                            height:
                                150,

                            area:
                                true
                        }
                    );
                },

            _buildOrdenesChart:
                function (
                    aItems,
                    sTotal
                ) {
                    if (
                        !aItems ||
                        !aItems.length
                    ) {
                        return this._emptyChart();
                    }

                    var nTotal =
                        aItems.reduce(
                            function (
                                nSum,
                                oItem
                            ) {
                                return (
                                    nSum +
                                    oItem.value
                                );
                            },
                            0
                        );

                    var nOffset = 0;

                    var sCircles =
                        aItems.map(
                            function (
                                oItem
                            ) {
                                var nPercent =
                                    nTotal > 0
                                        ? (
                                            oItem.value /
                                            nTotal *
                                            100
                                        )
                                        : 0;

                                var sCircle = [
                                    "<circle ",
                                    "cx='50' cy='50' r='38' ",
                                    "fill='none' ",
                                    "stroke='",
                                    oItem.color,
                                    "' ",
                                    "stroke-width='18' ",
                                    "pathLength='100' ",
                                    "stroke-dasharray='",
                                    nPercent,
                                    " ",
                                    100 -
                                        nPercent,
                                    "' ",
                                    "stroke-dashoffset='",
                                    -nOffset,
                                    "' ",
                                    "transform='rotate(-90 50 50)'/>"
                                ].join("");

                                nOffset +=
                                    nPercent;

                                return sCircle;
                            }
                        ).join("");

                    var sLegend =
                        aItems.map(
                            function (
                                oItem
                            ) {
                                return [
                                    "<div class='ebDonutLegendRow'>",

                                    "<span class='ebDonutLegendDot' style='background:",
                                    oItem.color,
                                    ";'></span>",

                                    "<span class='ebDonutLegendLabel'>",
                                    oItem.label,
                                    "</span>",

                                    "<strong>",
                                    oItem.value,
                                    " (",
                                    oItem.percent.toFixed(
                                        1
                                    ),
                                    "%)</strong>",

                                    "</div>"
                                ].join("");
                            }
                        ).join("");

                    return [
                        "<div class='ebDonutLayout'>",

                        "<div style='",
                        "position:relative;",
                        "width:5.55rem;",
                        "height:5.55rem;",
                        "margin:auto;'>",

                        "<svg viewBox='0 0 100 100' ",
                        "style='width:100%;height:100%;display:block;'>",

                        sCircles,

                        "<circle cx='50' cy='50' r='28' fill='#fff'/>",

                        "<text x='50' y='48' ",
                        "text-anchor='middle' ",
                        "font-size='12' ",
                        "font-weight='900' ",
                        "fill='#23364e'>",
                        sTotal || nTotal,
                        "</text>",

                        "<text x='50' y='59' ",
                        "text-anchor='middle' ",
                        "font-size='6' ",
                        "font-weight='700' ",
                        "fill='#7b899c'>",
                        "Total",
                        "</text>",

                        "</svg>",
                        "</div>",

                        "<div class='ebDonutLegend'>",
                        sLegend,
                        "</div>",

                        "</div>"
                    ].join("");
                },

            _buildAntiguedadChart:
                function (
                    aItems
                ) {
                    if (
                        !aItems ||
                        !aItems.length
                    ) {
                        return this._emptyChart();
                    }

                    return this._buildSingleLineSvg(
                        aItems.map(
                            function (
                                oItem
                            ) {
                                return (
                                    oItem.value
                                );
                            }
                        ),

                        aItems.map(
                            function (
                                oItem
                            ) {
                                return (
                                    oItem.label
                                );
                            }
                        ),

                        {
                            color:
                                "#1677ff",

                            width:
                                540,

                            height:
                                150,

                            area:
                                false,

                            lastRed:
                                true
                        }
                    );
                },

            _buildEvolucionChart:
                function (
                    oData
                ) {
                    if (
                        !oData ||
                        !oData.labels ||
                        !oData.labels.length
                    ) {
                        return this._emptyChart();
                    }

                    var aSeries = [
                        {
                            name:
                                "Total bloqueos",
                            values:
                                oData.totalBloqueos,
                            color:
                                "#1677ff"
                        },
                        {
                            name:
                                "Desbloqueos",
                            values:
                                oData.desbloqueos,
                            color:
                                "#10b981"
                        },
                        {
                            name:
                                "Bloqueos vigentes",
                            values:
                                oData.vigentes,
                            color:
                                "#7c3aed"
                        }
                    ];

                    var iWidth = 590;
                    var iHeight = 185;

                    var iMax =
                        Math.max.apply(
                            null,
                            []
                                .concat(
                                    oData.totalBloqueos,
                                    oData.desbloqueos,
                                    oData.vigentes
                                )
                        ) || 1;

                    iMax =
                        Math.ceil(
                            iMax * 1.18
                        );

                    var iLeft = 42;
                    var iRight = 24;
                    var iTop = 42;
                    var iBottom = 40;

                    var sGrid =
                        this._buildGridLines(
                            iWidth,
                            iHeight,
                            iLeft,
                            iRight,
                            iTop,
                            iBottom,
                            4
                        );

                    var sLegend =
                        aSeries.map(
                            function (
                                oSeries,
                                iIndex
                            ) {
                                var iX =
                                    75 +
                                    iIndex *
                                        160;

                                return [
                                    "<line x1='",
                                    iX,
                                    "' y1='17' x2='",
                                    iX + 16,
                                    "' y2='17' stroke='",
                                    oSeries.color,
                                    "' stroke-width='3'/>",

                                    "<circle cx='",
                                    iX + 8,
                                    "' cy='17' r='3' fill='",
                                    oSeries.color,
                                    "'/>",

                                    "<text x='",
                                    iX + 22,
                                    "' y='20' class='ebSvgLegend'>",
                                    oSeries.name,
                                    "</text>"
                                ].join("");
                            }
                        ).join("");

                    var sSeries =
                        aSeries.map(
                            function (
                                oSeries
                            ) {
                                var oScale =
                                    this._chartScale(
                                        oSeries.values,
                                        iMax,
                                        iWidth,
                                        iHeight,
                                        iLeft,
                                        iRight,
                                        iTop,
                                        iBottom
                                    );

                                var sLine =
                                    oScale.points
                                        .map(
                                            function (
                                                oPoint
                                            ) {
                                                return (
                                                    oPoint.x +
                                                    "," +
                                                    oPoint.y
                                                );
                                            }
                                        )
                                        .join(" ");

                                var sDots =
                                    oScale.points.map(
                                        function (
                                            oPoint,
                                            iIndex
                                        ) {
                                            return [
                                                "<circle cx='",
                                                oPoint.x,
                                                "' cy='",
                                                oPoint.y,
                                                "' r='3.3' fill='",
                                                oSeries.color,
                                                "'/>",

                                                "<text x='",
                                                oPoint.x,
                                                "' y='",
                                                oPoint.y -
                                                    7,
                                                "' text-anchor='middle' class='ebSvgValue' fill='",
                                                oSeries.color,
                                                "'>",
                                                oSeries.values[
                                                    iIndex
                                                ],
                                                "</text>"
                                            ].join("");
                                        }
                                    ).join("");

                                return [
                                    "<polyline points='",
                                    sLine,
                                    "' fill='none' stroke='",
                                    oSeries.color,
                                    "' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'/>",
                                    sDots
                                ].join("");
                            },
                            this
                        ).join("");

                    var oLabelScale =
                        this._chartScale(
                            oData.totalBloqueos,
                            iMax,
                            iWidth,
                            iHeight,
                            iLeft,
                            iRight,
                            iTop,
                            iBottom
                        );

                    var sLabels =
                        oLabelScale.points.map(
                            function (
                                oPoint,
                                iIndex
                            ) {
                                return [
                                    "<text x='",
                                    oPoint.x,
                                    "' y='",
                                    iHeight -
                                        10,
                                    "' text-anchor='middle' class='ebSvgLabel'>",
                                    oData.labels[
                                        iIndex
                                    ],
                                    "</text>"
                                ].join("");
                            }
                        ).join("");

                    return [
                        "<svg class='ebLineSvg' viewBox='0 0 ",
                        iWidth,
                        " ",
                        iHeight,
                        "'>",
                        sLegend,
                        sGrid,
                        sSeries,
                        sLabels,
                        "</svg>"
                    ].join("");
                },

            _buildMatrizChart:
                function (
                    aRows
                ) {
                    if (
                        !aRows ||
                        !aRows.length
                    ) {
                        return this._emptyChart();
                    }

                    var aHeaders = [
                        "Zona",
                        "Crítica",
                        "Alta",
                        "Media",
                        "Baja",
                        "Total"
                    ];

                    var sHeader =
                        aHeaders.map(
                            function (
                                sText
                            ) {
                                return [
                                    "<div class='ebHeatCell ebHeatHeader'>",
                                    sText,
                                    "</div>"
                                ].join("");
                            }
                        ).join("");

                    var aTotals = [
                        0,
                        0,
                        0,
                        0
                    ];

                    var sRows =
                        aRows.map(
                            function (
                                oRow
                            ) {
                                var aValues = [
                                    oRow.critical,
                                    oRow.high,
                                    oRow.medium,
                                    oRow.low
                                ];

                                aValues.forEach(
                                    function (
                                        iValue,
                                        iIndex
                                    ) {
                                        aTotals[
                                            iIndex
                                        ] +=
                                            iValue;
                                    }
                                );

                                return [
                                    "<div class='ebHeatCell ebHeatZone'>",
                                    "<span style='background:",
                                    oRow.color,
                                    ";'></span>",
                                    oRow.zone,
                                    "</div>",

                                    aValues.map(
                                        function (
                                            iValue,
                                            iIndex
                                        ) {
                                            return [
                                                "<div class='ebHeatCell ebHeatValue' data-tone='",
                                                [
                                                    "critical",
                                                    "high",
                                                    "medium",
                                                    "low"
                                                ][
                                                    iIndex
                                                ],
                                                "'>",
                                                iValue,
                                                "</div>"
                                            ].join("");
                                        }
                                    ).join(""),

                                    "<div class='ebHeatCell ebHeatTotal'>",
                                    oRow.total,
                                    "</div>"
                                ].join("");
                            }
                        ).join("");

                    var iGrandTotal =
                        aRows.reduce(
                            function (
                                nTotal,
                                oRow
                            ) {
                                return (
                                    nTotal +
                                    oRow.total
                                );
                            },
                            0
                        );

                    var sTotals = [
                        "<div class='ebHeatCell ebHeatTotalLabel'>Total</div>",

                        aTotals.map(
                            function (
                                iValue
                            ) {
                                return [
                                    "<div class='ebHeatCell ebHeatTotal'>",
                                    iValue,
                                    "</div>"
                                ].join("");
                            }
                        ).join(""),

                        "<div class='ebHeatCell ebHeatTotal'>",
                        iGrandTotal,
                        "</div>"
                    ].join("");

                    return [
                        "<div class='ebHeatMap'>",
                        sHeader,
                        sRows,
                        sTotals,
                        "</div>"
                    ].join("");
                },

            _buildSingleLineSvg:
                function (
                    aValues,
                    aLabels,
                    oOptions
                ) {
                    if (!aValues.length) {
                        return this._emptyChart();
                    }

                    var iWidth =
                        oOptions.width;

                    var iHeight =
                        oOptions.height;

                    var iLeft = 40;
                    var iRight = 20;
                    var iTop = 24;
                    var iBottom = 34;

                    var iMax =
                        Math.max.apply(
                            null,
                            aValues
                        ) || 1;

                    iMax =
                        Math.ceil(
                            iMax * 1.15
                        );

                    var oScale =
                        this._chartScale(
                            aValues,
                            iMax,
                            iWidth,
                            iHeight,
                            iLeft,
                            iRight,
                            iTop,
                            iBottom
                        );

                    var sGrid =
                        this._buildGridLines(
                            iWidth,
                            iHeight,
                            iLeft,
                            iRight,
                            iTop,
                            iBottom,
                            4
                        );

                    var sPoints =
                        oScale.points
                            .map(
                                function (
                                    oPoint
                                ) {
                                    return (
                                        oPoint.x +
                                        "," +
                                        oPoint.y
                                    );
                                }
                            )
                            .join(" ");

                    var sArea = "";

                    if (oOptions.area) {
                        var iBase =
                            iHeight -
                            iBottom;

                        sArea = [
                            "<polygon points='",
                            iLeft,
                            ",",
                            iBase,
                            " ",
                            sPoints,
                            " ",
                            iWidth -
                                iRight,
                            ",",
                            iBase,
                            "' fill='rgba(34,164,71,.08)'/>"
                        ].join("");
                    }

                    var sDots =
                        oScale.points.map(
                            function (
                                oPoint,
                                iIndex
                            ) {
                                var sColor =
                                    (
                                        oOptions.lastRed &&
                                        iIndex ===
                                            aValues.length -
                                                1
                                    )
                                        ? "#ef4444"
                                        : oOptions.color;

                                return [
                                    "<circle cx='",
                                    oPoint.x,
                                    "' cy='",
                                    oPoint.y,
                                    "' r='4' fill='",
                                    sColor,
                                    "'/>",

                                    "<text x='",
                                    oPoint.x,
                                    "' y='",
                                    oPoint.y -
                                        9,
                                    "' text-anchor='middle' class='ebSvgValue' fill='",
                                    sColor,
                                    "'>",
                                    aValues[
                                        iIndex
                                    ],
                                    "</text>",

                                    "<text x='",
                                    oPoint.x,
                                    "' y='",
                                    iHeight -
                                        8,
                                    "' text-anchor='middle' class='ebSvgLabel'>",
                                    aLabels[
                                        iIndex
                                    ],
                                    "</text>"
                                ].join("");
                            }
                        ).join("");

                    return [
                        "<svg class='ebLineSvg' viewBox='0 0 ",
                        iWidth,
                        " ",
                        iHeight,
                        "'>",
                        sGrid,
                        sArea,
                        "<polyline points='",
                        sPoints,
                        "' fill='none' stroke='",
                        oOptions.color,
                        "' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/>",
                        sDots,
                        "</svg>"
                    ].join("");
                },

            _chartScale:
                function (
                    aValues,
                    iMax,
                    iWidth,
                    iHeight,
                    iLeft,
                    iRight,
                    iTop,
                    iBottom
                ) {
                    var iPlotWidth =
                        iWidth -
                        iLeft -
                        iRight;

                    var iPlotHeight =
                        iHeight -
                        iTop -
                        iBottom;

                    var iStep =
                        aValues.length > 1
                            ? iPlotWidth /
                              (
                                  aValues.length -
                                  1
                              )
                            : 0;

                    return {
                        points:
                            aValues.map(
                                function (
                                    iValue,
                                    iIndex
                                ) {
                                    return {
                                        x:
                                            iLeft +
                                            iStep *
                                                iIndex,

                                        y:
                                            iTop +
                                            iPlotHeight -
                                            (
                                                iValue /
                                                iMax
                                            ) *
                                            iPlotHeight
                                    };
                                }
                            )
                    };
                },

            _buildGridLines:
                function (
                    iWidth,
                    iHeight,
                    iLeft,
                    iRight,
                    iTop,
                    iBottom,
                    iCount
                ) {
                    var iPlotHeight =
                        iHeight -
                        iTop -
                        iBottom;

                    var sLines = "";

                    for (
                        var i = 0;
                        i <= iCount;
                        i += 1
                    ) {
                        var iY =
                            iTop +
                            (
                                iPlotHeight /
                                iCount
                            ) *
                            i;

                        sLines += [
                            "<line x1='",
                            iLeft,
                            "' y1='",
                            iY,
                            "' x2='",
                            iWidth -
                                iRight,
                            "' y2='",
                            iY,
                            "' stroke='#e8edf4' stroke-width='1'/>"
                        ].join("");
                    }

                    return sLines;
                }
        }
    );
});
