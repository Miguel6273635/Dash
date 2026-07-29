sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast,
    includeStylesheet
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.EquiposBloqueados",
        {
            onInit: function () {
                this._loadExclusiveStyles();

                this._aDashboardFilters = [];
                this._sSearchQuery = "";

                var oData = {
                    filters: {
                        periodo: "ACTUAL",
                        fechaDesde: "2024-05-01",
                        fechaHasta: "2024-05-31",
                        zona: "TODAS",
                        cliente: "TODOS",
                        estatus: "TODOS",
                        supervisor: "TODOS"
                    },

                    kpis: {
                        totalBloqueados: "248",
                        ordenesAfectadas: "1,342",
                        mayores30Dias: "86",
                        criticos: "42",
                        pendientesDesbloqueo: "176"
                    },

                    gestionDesbloqueo: [
                        {
                            estado: "En confirmación pendiente",
                            equipos: 62,
                            porcentaje: "25.0%",
                            tono: "red"
                        },
                        {
                            estado: "En análisis",
                            equipos: 52,
                            porcentaje: "21.0%",
                            tono: "orange"
                        },
                        {
                            estado: "En ejecución",
                            equipos: 38,
                            porcentaje: "15.3%",
                            tono: "yellow"
                        },
                        {
                            estado: "En contacto con cliente",
                            equipos: 34,
                            porcentaje: "13.7%",
                            tono: "blue"
                        },
                        {
                            estado: "En autorización cliente",
                            equipos: 32,
                            porcentaje: "12.9%",
                            tono: "purple"
                        },
                        {
                            estado: "Desbloqueado",
                            equipos: 30,
                            porcentaje: "12.1%",
                            tono: "green"
                        }
                    ],

                    equipos: [
                        {
                            equipo: "ELV-10234",
                            cliente: "Cliente A",
                            zona: "Norte",
                            estatus: "Bloqueado",
                            estatusKey: "blocked",
                            motivo: "Cambio a estado parado",
                            fechaBloqueo: "20/04/2024",
                            fechaBloqueoISO: "2024-04-20",
                            diasBloqueado: 41,
                            ordenesAfectadas: 16,
                            responsable: "Ana Martínez",
                            proximaAccion: "Reunión con cliente",
                            fechaCompromiso: "05/06/2024",
                            prioridad: "Crítica",
                            prioridadKey: "critical"
                        },
                        {
                            equipo: "ELV-09782",
                            cliente: "Cliente B",
                            zona: "Centro",
                            estatus: "En gestión",
                            estatusKey: "management",
                            motivo: "Ausencia de operador",
                            fechaBloqueo: "08/05/2024",
                            fechaBloqueoISO: "2024-05-08",
                            diasBloqueado: 19,
                            ordenesAfectadas: 12,
                            responsable: "Luis Ramírez",
                            proximaAccion: "Gestión contractual",
                            fechaCompromiso: "02/06/2024",
                            prioridad: "Alta",
                            prioridadKey: "high"
                        },
                        {
                            equipo: "ELV-10365",
                            cliente: "Cliente C",
                            zona: "Sur",
                            estatus: "En gestión",
                            estatusKey: "management",
                            motivo: "Documentación pendiente",
                            fechaBloqueo: "13/05/2024",
                            fechaBloqueoISO: "2024-05-13",
                            diasBloqueado: 16,
                            ordenesAfectadas: 9,
                            responsable: "Mario Gómez",
                            proximaAccion: "Enviar documentación",
                            fechaCompromiso: "13/06/2024",
                            prioridad: "Media",
                            prioridadKey: "medium"
                        },
                        {
                            equipo: "ELV-09211",
                            cliente: "Cliente D",
                            zona: "Este",
                            estatus: "Bloqueado",
                            estatusKey: "blocked",
                            motivo: "Bloqueo administrativo",
                            fechaBloqueo: "10/04/2024",
                            fechaBloqueoISO: "2024-04-10",
                            diasBloqueado: 51,
                            ordenesAfectadas: 21,
                            responsable: "Carlos Pérez",
                            proximaAccion: "Liberación administrativa",
                            fechaCompromiso: "10/06/2024",
                            prioridad: "Crítica",
                            prioridadKey: "critical"
                        },
                        {
                            equipo: "ELV-10567",
                            cliente: "Cliente E",
                            zona: "Oeste",
                            estatus: "En gestión",
                            estatusKey: "management",
                            motivo: "Ausencia de contrato",
                            fechaBloqueo: "22/05/2024",
                            fechaBloqueoISO: "2024-05-22",
                            diasBloqueado: 9,
                            ordenesAfectadas: 7,
                            responsable: "Sofía Torres",
                            proximaAccion: "Validación legal",
                            fechaCompromiso: "08/06/2024",
                            prioridad: "Baja",
                            prioridadKey: "low"
                        }
                    ],

                    charts: {
                        motivos: this._buildMotivosChart(),
                        clientes: this._buildClientesChart(),
                        ordenes: this._buildOrdenesChart(),
                        antiguedad: this._buildAntiguedadChart(),
                        evolucion: this._buildEvolucionChart(),
                        matriz: this._buildMatrizChart()
                    },

                    lastUpdated: "31/05/2024 11:30 a. m."
                };

                this.getView().setModel(
                    new JSONModel(oData),
                    "dashboard"
                );
            },

            _loadExclusiveStyles: function () {
                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/EquiposBloqueados.css"
                    ),
                    "equipos-bloqueados-exclusive-css"
                );
            },

            onApplyFilters: function () {
                var oModel = this.getView().getModel("dashboard");
                var oFilters = oModel.getProperty("/filters");
                var aFilters = [];

                if (oFilters.zona !== "TODAS") {
                    aFilters.push(
                        new Filter(
                            "zona",
                            FilterOperator.EQ,
                            oFilters.zona
                        )
                    );
                }

                if (oFilters.cliente !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "cliente",
                            FilterOperator.EQ,
                            oFilters.cliente
                        )
                    );
                }

                if (oFilters.estatus !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "estatus",
                            FilterOperator.EQ,
                            oFilters.estatus
                        )
                    );
                }

                if (oFilters.supervisor !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "responsable",
                            FilterOperator.EQ,
                            oFilters.supervisor
                        )
                    );
                }

                if (oFilters.fechaDesde) {
                    aFilters.push(
                        new Filter(
                            "fechaBloqueoISO",
                            FilterOperator.GE,
                            oFilters.fechaDesde
                        )
                    );
                }

                if (oFilters.fechaHasta) {
                    aFilters.push(
                        new Filter(
                            "fechaBloqueoISO",
                            FilterOperator.LE,
                            oFilters.fechaHasta
                        )
                    );
                }

                this._aDashboardFilters = aFilters;
                this._applyTableFilters();

                oModel.setProperty(
                    "/lastUpdated",
                    this._formatNow()
                );

                MessageToast.show(
                    "Filtros aplicados correctamente"
                );
            },

            onLiveSearch: function (oEvent) {
                this._sSearchQuery = (
                    oEvent.getParameter("newValue") || ""
                ).trim();

                this._applyTableFilters();
            },

            _applyTableFilters: function () {
                var oBinding = this
                    .byId("equiposTable")
                    .getBinding("items");

                var aCombinedFilters =
                    this._aDashboardFilters.slice();

                if (this._sSearchQuery) {
                    var sQuery = this._sSearchQuery;

                    aCombinedFilters.push(
                        new Filter({
                            filters: [
                                new Filter(
                                    "equipo",
                                    FilterOperator.Contains,
                                    sQuery
                                ),
                                new Filter(
                                    "cliente",
                                    FilterOperator.Contains,
                                    sQuery
                                ),
                                new Filter(
                                    "zona",
                                    FilterOperator.Contains,
                                    sQuery
                                ),
                                new Filter(
                                    "motivo",
                                    FilterOperator.Contains,
                                    sQuery
                                ),
                                new Filter(
                                    "responsable",
                                    FilterOperator.Contains,
                                    sQuery
                                ),
                                new Filter(
                                    "proximaAccion",
                                    FilterOperator.Contains,
                                    sQuery
                                ),
                                new Filter(
                                    "prioridad",
                                    FilterOperator.Contains,
                                    sQuery
                                )
                            ],
                            and: false
                        })
                    );
                }

                oBinding.filter(
                    aCombinedFilters,
                    "Application"
                );
            },

            onToggleColumn: function (oEvent) {
                var oItem = oEvent.getParameter("item");
                var sColumnId =
                    oItem && oItem.data("columnId");

                var oColumn =
                    sColumnId && this.byId(sColumnId);

                if (oColumn) {
                    oColumn.setVisible(
                        !oColumn.getVisible()
                    );
                }
            },

            onKpiDetail: function (oEvent) {
                var oKpiCard = oEvent.getSource().getParent();

                var aLabels =
                    oKpiCard.findAggregatedObjects(
                        true,
                        function (oControl) {
                            return (
                                oControl.isA &&
                                oControl.isA("sap.m.Text") &&
                                oControl.hasStyleClass(
                                    "ebKpiLabel"
                                )
                            );
                        }
                    );

                var oLabel = aLabels[0];

                MessageToast.show(
                    oLabel
                        ? "Detalle: " + oLabel.getText()
                        : "Abrir detalle del indicador"
                );
            },

            onEquipoPress: function (oEvent) {
                var oSource = oEvent.getSource();

                var oContext =
                    oSource.getBindingContext("dashboard");

                if (!oContext && oSource.getParent()) {
                    oContext = oSource
                        .getParent()
                        .getBindingContext("dashboard");
                }

                if (oContext) {
                    MessageToast.show(
                        "Abrir detalle del equipo " +
                        oContext.getProperty("equipo")
                    );
                }
            },

            onPagePress: function (oEvent) {
                MessageToast.show(
                    "Página " +
                    oEvent.getSource().getText()
                );
            },

            formatDiasState: function (iDias) {
                if (iDias > 30) {
                    return "Error";
                }

                if (iDias > 15) {
                    return "Warning";
                }

                return "Success";
            },

            _formatNow: function () {
                var oNow = new Date();

                return new Intl.DateTimeFormat(
                    "es-MX",
                    {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                ).format(oNow);
            },

            _buildMotivosChart: function () {
                var aItems = [
                    {
                        label: "Cambio a estado parado",
                        value: 90,
                        percent: "36.3%",
                        color: "#1677ff"
                    },
                    {
                        label: "Ausencia de operador",
                        value: 86,
                        percent: "34.7%",
                        color: "#ff7a00"
                    },
                    {
                        label: "Bloqueo administrativo",
                        value: 52,
                        percent: "21.0%",
                        color: "#f59e0b"
                    },
                    {
                        label: "Reducción planificada",
                        value: 18,
                        percent: "7.3%",
                        color: "#7c3aed"
                    },
                    {
                        label: "Otros",
                        value: 2,
                        percent: "0.7%",
                        color: "#10b981"
                    }
                ];

                var iMax = 100;

                var sRows = aItems.map(function (oItem) {
                    var fWidth =
                        (oItem.value / iMax) * 100;

                    return [
                        "<div class='ebBarChartRow'>",
                        "<div class='ebBarLabel'>",
                        oItem.label,
                        "</div>",
                        "<div class='ebBarTrack'>",
                        "<div class='ebBarFill' style='width:",
                        fWidth,
                        "%;background:",
                        oItem.color,
                        ";'></div>",
                        "</div>",
                        "<div class='ebBarValue'>",
                        oItem.value,
                        " (",
                        oItem.percent,
                        ")</div>",
                        "</div>"
                    ].join("");
                }).join("");

                return [
                    "<div class='ebBarChart'>",
                    sRows,
                    "<div class='ebBarAxis'>",
                    "<span>0</span>",
                    "<span>20</span>",
                    "<span>40</span>",
                    "<span>60</span>",
                    "<span>80</span>",
                    "<span>100</span>",
                    "</div>",
                    "<div class='ebBarAxisTitle'>",
                    "Equipos",
                    "</div>",
                    "</div>"
                ].join("");
            },

            _buildClientesChart: function () {
                var aValues = [
                    97,
                    149,
                    169,
                    212,
                    284
                ];

                var aLabels = [
                    "Cliente A",
                    "Cliente B",
                    "Cliente C",
                    "Cliente D",
                    "Cliente E"
                ];

                return this._buildSingleLineSvg(
                    aValues,
                    aLabels,
                    {
                        color: "#22a447",
                        max: 300,
                        width: 520,
                        height: 150,
                        area: true
                    }
                );
            },

            _buildOrdenesChart: function () {
                var aLegend = [
                    {
                        label: "Abiertas",
                        value: "512 (38.2%)",
                        color: "#1677ff"
                    },
                    {
                        label: "En proceso",
                        value: "336 (25.0%)",
                        color: "#ff7a00"
                    },
                    {
                        label: "Programadas",
                        value: "268 (20.0%)",
                        color: "#10b981"
                    },
                    {
                        label: "Cerradas",
                        value: "196 (14.6%)",
                        color: "#7c3aed"
                    },
                    {
                        label: "Canceladas",
                        value: "30 (2.2%)",
                        color: "#ef4444"
                    }
                ];

                var sLegend = aLegend.map(
                    function (oItem) {
                        return [
                            "<div class='ebDonutLegendRow'>",
                            "<span class='ebDonutLegendDot' ",
                            "style='background:",
                            oItem.color,
                            ";'></span>",
                            "<span class='ebDonutLegendLabel'>",
                            oItem.label,
                            "</span>",
                            "<strong>",
                            oItem.value,
                            "</strong>",
                            "</div>"
                        ].join("");
                    }
                ).join("");

                return [
                    "<div class='ebDonutLayout'>",
                    "<div class='ebDonutChart'>",
                    "<div class='ebDonutCenter'>",
                    "<strong>1,342</strong>",
                    "<span>Total</span>",
                    "</div>",
                    "</div>",
                    "<div class='ebDonutLegend'>",
                    sLegend,
                    "</div>",
                    "</div>"
                ].join("");
            },

            _buildAntiguedadChart: function () {
                var aValues = [
                    38,
                    52,
                    72,
                    86
                ];

                var aLabels = [
                    "0 - 7 días",
                    "8 - 15 días",
                    "16 - 30 días",
                    "> 30 días"
                ];

                var iWidth = 540;
                var iHeight = 150;

                var oScale = this._chartScale(
                    aValues,
                    100,
                    iWidth,
                    iHeight,
                    42,
                    22,
                    22,
                    34
                );

                var aPoints = oScale.points;

                var sGrid = this._buildGridLines(
                    iWidth,
                    iHeight,
                    42,
                    22,
                    22,
                    34,
                    4
                );

                var sBlue = aPoints
                    .slice(0, 3)
                    .map(function (oPoint) {
                        return (
                            oPoint.x +
                            "," +
                            oPoint.y
                        );
                    })
                    .join(" ");

                var sRed = aPoints
                    .slice(2)
                    .map(function (oPoint) {
                        return (
                            oPoint.x +
                            "," +
                            oPoint.y
                        );
                    })
                    .join(" ");

                var sPoints = aPoints.map(
                    function (oPoint, iIndex) {
                        var sColor =
                            iIndex ===
                            aPoints.length - 1
                                ? "#ef4444"
                                : "#1677ff";

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
                            oPoint.y - 10,
                            "' text-anchor='middle' ",
                            "class='ebSvgValue' fill='",
                            sColor,
                            "'>",
                            aValues[iIndex],
                            "</text>",

                            "<text x='",
                            oPoint.x,
                            "' y='",
                            iHeight - 8,
                            "' text-anchor='middle' ",
                            "class='ebSvgLabel'>",
                            aLabels[iIndex],
                            "</text>"
                        ].join("");
                    }
                ).join("");

                return [
                    "<svg class='ebLineSvg' ",
                    "viewBox='0 0 ",
                    iWidth,
                    " ",
                    iHeight,
                    "' role='img' ",
                    "aria-label='Antigüedad de equipos bloqueados'>",

                    sGrid,

                    "<polyline points='",
                    sBlue,
                    "' fill='none' ",
                    "stroke='#1677ff' ",
                    "stroke-width='3' ",
                    "stroke-linecap='round' ",
                    "stroke-linejoin='round'/>",

                    "<polyline points='",
                    sRed,
                    "' fill='none' ",
                    "stroke='#ef4444' ",
                    "stroke-width='3' ",
                    "stroke-linecap='round' ",
                    "stroke-linejoin='round'/>",

                    sPoints,
                    "</svg>"
                ].join("");
            },

            _buildEvolucionChart: function () {
                var aLabels = [
                    "Ene 2024",
                    "Feb 2024",
                    "Mar 2024",
                    "Abr 2024",
                    "May 2024"
                ];

                var aSeries = [
                    {
                        name: "Total bloqueos",
                        values: [
                            77,
                            68,
                            79,
                            81,
                            85
                        ],
                        color: "#1677ff"
                    },
                    {
                        name: "Desbloqueos",
                        values: [
                            32,
                            34,
                            37,
                            39,
                            41
                        ],
                        color: "#10b981"
                    },
                    {
                        name: "Bloqueos vigentes",
                        values: [
                            216,
                            218,
                            230,
                            244,
                            248
                        ],
                        color: "#7c3aed"
                    }
                ];

                var iWidth = 590;
                var iHeight = 185;
                var iMax = 280;
                var iLeft = 42;
                var iRight = 20;
                var iTop = 38;
                var iBottom = 34;

                var sGrid = this._buildGridLines(
                    iWidth,
                    iHeight,
                    iLeft,
                    iRight,
                    iTop,
                    iBottom,
                    4
                );

                var sLegend = aSeries.map(
                    function (oSeries, iIndex) {
                        var iX =
                            88 + iIndex * 150;

                        return [
                            "<line x1='",
                            iX,
                            "' y1='16' x2='",
                            iX + 16,
                            "' y2='16' ",
                            "stroke='",
                            oSeries.color,
                            "' stroke-width='3'/>",

                            "<circle cx='",
                            iX + 8,
                            "' cy='16' r='3' ",
                            "fill='",
                            oSeries.color,
                            "'/>",

                            "<text x='",
                            iX + 23,
                            "' y='20' ",
                            "class='ebSvgLegend'>",
                            oSeries.name,
                            "</text>"
                        ].join("");
                    }
                ).join("");

                var sSeries = aSeries.map(
                    function (oSeries) {
                        var oScale = this._chartScale(
                            oSeries.values,
                            iMax,
                            iWidth,
                            iHeight,
                            iLeft,
                            iRight,
                            iTop,
                            iBottom
                        );

                        var sPolyline =
                            oScale.points
                                .map(function (oPoint) {
                                    return (
                                        oPoint.x +
                                        "," +
                                        oPoint.y
                                    );
                                })
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
                                        "' r='3.5' fill='",
                                        oSeries.color,
                                        "'/>",

                                        "<text x='",
                                        oPoint.x,
                                        "' y='",
                                        oPoint.y - 8,
                                        "' text-anchor='middle' ",
                                        "class='ebSvgValue' fill='",
                                        oSeries.color,
                                        "'>",
                                        oSeries.values[iIndex],
                                        "</text>"
                                    ].join("");
                                }
                            ).join("");

                        return [
                            "<polyline points='",
                            sPolyline,
                            "' fill='none' ",
                            "stroke='",
                            oSeries.color,
                            "' stroke-width='2.5' ",
                            "stroke-linecap='round' ",
                            "stroke-linejoin='round'/>",
                            sDots
                        ].join("");
                    },
                    this
                ).join("");

                var oLabelScale =
                    this._chartScale(
                        aSeries[0].values,
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
                                iHeight - 8,
                                "' text-anchor='middle' ",
                                "class='ebSvgLabel'>",
                                aLabels[iIndex],
                                "</text>"
                            ].join("");
                        }
                    ).join("");

                return [
                    "<svg class='ebLineSvg' ",
                    "viewBox='0 0 ",
                    iWidth,
                    " ",
                    iHeight,
                    "' role='img' ",
                    "aria-label='Evolución de bloqueos y desbloqueos'>",
                    sLegend,
                    sGrid,
                    sSeries,
                    sLabels,
                    "</svg>"
                ].join("");
            },

            _buildMatrizChart: function () {
                var aRows = [
                    {
                        zone: "Norte",
                        color: "#ef4444",
                        values: [
                            12,
                            28,
                            21,
                            11
                        ],
                        total: 72
                    },
                    {
                        zone: "Centro",
                        color: "#1677ff",
                        values: [
                            15,
                            22,
                            16,
                            10
                        ],
                        total: 63
                    },
                    {
                        zone: "Sur",
                        color: "#84cc16",
                        values: [
                            7,
                            18,
                            14,
                            15
                        ],
                        total: 54
                    },
                    {
                        zone: "Este",
                        color: "#7c3aed",
                        values: [
                            2,
                            12,
                            6,
                            9
                        ],
                        total: 29
                    },
                    {
                        zone: "Oeste",
                        color: "#10b981",
                        values: [
                            6,
                            7,
                            6,
                            11
                        ],
                        total: 30
                    }
                ];

                var aColumnTotals = [
                    42,
                    87,
                    63,
                    56
                ];

                var aHeaders = [
                    "Zona",
                    "Crítica",
                    "Alta",
                    "Media",
                    "Baja",
                    "Total"
                ];

                var sHeader = aHeaders.map(
                    function (sHeaderText) {
                        return [
                            "<div class='ebHeatCell ebHeatHeader'>",
                            sHeaderText,
                            "</div>"
                        ].join("");
                    }
                ).join("");

                var sRows = aRows.map(
                    function (oRow) {
                        var sZone = [
                            "<div class='ebHeatCell ebHeatZone'>",
                            "<span style='background:",
                            oRow.color,
                            ";'></span>",
                            oRow.zone,
                            "</div>"
                        ].join("");

                        var sValues =
                            oRow.values.map(
                                function (
                                    iValue,
                                    iIndex
                                ) {
                                    var sTone = [
                                        "critical",
                                        "high",
                                        "medium",
                                        "low"
                                    ][iIndex];

                                    return [
                                        "<div class='ebHeatCell ebHeatValue' ",
                                        "data-tone='",
                                        sTone,
                                        "' data-value='",
                                        iValue,
                                        "'>",
                                        iValue,
                                        "</div>"
                                    ].join("");
                                }
                            ).join("");

                        return [
                            sZone,
                            sValues,
                            "<div class='ebHeatCell ebHeatTotal'>",
                            oRow.total,
                            "</div>"
                        ].join("");
                    }
                ).join("");

                var sTotals = [
                    "<div class='ebHeatCell ebHeatTotalLabel'>",
                    "Total",
                    "</div>",

                    aColumnTotals.map(
                        function (iValue) {
                            return [
                                "<div class='ebHeatCell ebHeatTotal'>",
                                iValue,
                                "</div>"
                            ].join("");
                        }
                    ).join(""),

                    "<div class='ebHeatCell ebHeatTotal'>",
                    "248",
                    "</div>"
                ].join("");

                return [
                    "<div class='ebHeatMap'>",
                    sHeader,
                    sRows,
                    sTotals,
                    "</div>",

                    "<div class='ebHeatLegend'>",

                    "<span>",
                    "<i style='background:#ef4444'></i>",
                    "&gt; 80% del máximo",
                    "</span>",

                    "<span>",
                    "<i style='background:#f97316'></i>",
                    "60% - 79%",
                    "</span>",

                    "<span>",
                    "<i style='background:#facc15'></i>",
                    "40% - 59%",
                    "</span>",

                    "<span>",
                    "<i style='background:#a3e635'></i>",
                    "20% - 39%",
                    "</span>",

                    "<span>",
                    "<i style='background:#22c55e'></i>",
                    "&lt; 20% del máximo",
                    "</span>",

                    "</div>"
                ].join("");
            },

            _buildSingleLineSvg: function (
                aValues,
                aLabels,
                oOptions
            ) {
                var iWidth = oOptions.width;
                var iHeight = oOptions.height;
                var iLeft = 40;
                var iRight = 18;
                var iTop = 24;
                var iBottom = 34;

                var oScale = this._chartScale(
                    aValues,
                    oOptions.max,
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
                        3
                    );

                var sPolyline =
                    oScale.points.map(
                        function (oPoint) {
                            return (
                                oPoint.x +
                                "," +
                                oPoint.y
                            );
                        }
                    ).join(" ");

                var sArea = "";

                if (oOptions.area) {
                    var iBaseline =
                        iHeight - iBottom;

                    var sAreaPoints = [
                        iLeft,
                        ",",
                        iBaseline,
                        " ",
                        sPolyline,
                        " ",
                        iWidth - iRight,
                        ",",
                        iBaseline
                    ].join("");

                    sArea = [
                        "<polygon points='",
                        sAreaPoints,
                        "' fill='rgba(34,164,71,0.08)'/>"
                    ].join("");
                }

                var sPoints =
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
                                "' r='4' fill='",
                                oOptions.color,
                                "'/>",

                                "<text x='",
                                oPoint.x,
                                "' y='",
                                oPoint.y - 9,
                                "' text-anchor='middle' ",
                                "class='ebSvgValue' fill='",
                                oOptions.color,
                                "'>",
                                aValues[iIndex],
                                "</text>",

                                "<text x='",
                                oPoint.x,
                                "' y='",
                                iHeight - 8,
                                "' text-anchor='middle' ",
                                "class='ebSvgLabel'>",
                                aLabels[iIndex],
                                "</text>"
                            ].join("");
                        }
                    ).join("");

                return [
                    "<svg class='ebLineSvg' ",
                    "viewBox='0 0 ",
                    iWidth,
                    " ",
                    iHeight,
                    "' role='img'>",

                    sGrid,
                    sArea,

                    "<polyline points='",
                    sPolyline,
                    "' fill='none' ",
                    "stroke='",
                    oOptions.color,
                    "' stroke-width='3' ",
                    "stroke-linecap='round' ",
                    "stroke-linejoin='round'/>",

                    sPoints,
                    "</svg>"
                ].join("");
            },

            _chartScale: function (
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
                    iWidth - iLeft - iRight;

                var iPlotHeight =
                    iHeight - iTop - iBottom;

                var iStep =
                    aValues.length > 1
                        ? iPlotWidth /
                          (aValues.length - 1)
                        : 0;

                return {
                    points: aValues.map(
                        function (
                            iValue,
                            iIndex
                        ) {
                            return {
                                x:
                                    iLeft +
                                    iStep * iIndex,

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

            _buildGridLines: function (
                iWidth,
                iHeight,
                iLeft,
                iRight,
                iTop,
                iBottom,
                iCount
            ) {
                var iPlotHeight =
                    iHeight - iTop - iBottom;

                var sLines = "";

                for (
                    var iIndex = 0;
                    iIndex <= iCount;
                    iIndex += 1
                ) {
                    var iY =
                        iTop +
                        (
                            iPlotHeight /
                            iCount
                        ) *
                        iIndex;

                    sLines += [
                        "<line x1='",
                        iLeft,
                        "' y1='",
                        iY,
                        "' x2='",
                        iWidth - iRight,
                        "' y2='",
                        iY,
                        "' stroke='#e8edf4' ",
                        "stroke-width='1'/>"
                    ].join("");
                }

                return sLines;
            }
        }
    );
});