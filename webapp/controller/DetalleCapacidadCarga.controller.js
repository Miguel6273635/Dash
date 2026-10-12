sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleCapacidadCargaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    includeStylesheet,
    MessageToast,
    Service,
    InitialLoadPeriod
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCapacidadCarga", {

        onInit: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            var initialData;

            this._requestId = 0;
            this._searchValue = "";
            this._currentPage = 1;
            this._pageSize = this._getDefaultPageSize();
            this._allDetails = [];

            this._filters = {
                periodo: initialPeriod.year,
                fechaDesde: initialPeriod.startDisplay,
                fechaHasta: initialPeriod.endDisplay,
                zona: "TODOS",
                turno: "TODOS",
                supervisor: "TODOS"
            };

            this._loadStyles();

            initialData = Service.createEmpty(this._filters);

            this.getView().setModel(
                new JSONModel(initialData)
            );

            this.getView()
                .getModel()
                .setSizeLimit(2000);

            this._allDetails =
                initialData.detalles || [];

            this._renderTable();
            this._load(false);
        },

        _loadStyles: function () {
            var id = "detalleCapacidadCargaStylesheet";
            var url =
                sap.ui.require.toUrl(
                    "mantenimiento/css/DetalleCapacidadCarga.css"
                ) + "?v=20261005-unified";

            var current =
                document.getElementById(id);

            if (current) {
                current.setAttribute("href", url);
                return;
            }

            includeStylesheet(url, id);
        },

        _getODataModel: function () {
            var component =
                this.getOwnerComponent();

            return (
                component &&
                (
                    component.getModel("dashboardOData") ||
                    component.getModel()
                )
            ) ||
            this.getView().getModel("dashboardOData");
        },

        _currentFilters: function () {
            var current =
                this.getView()
                    .getModel()
                    .getProperty("/filtros") ||
                {};

            return {
                periodo:
                    current.periodo ||
                    "2026",

                fechaDesde:
                    current.fechaDesde ||
                    "01/01/2026",

                fechaHasta:
                    current.fechaHasta ||
                    "31/12/2026",

                zona:
                    current.zona ||
                    "TODOS",

                turno:
                    current.turno ||
                    "TODOS",

                supervisor:
                    current.supervisor ||
                    "TODOS"
            };
        },

        onPeriodoChange: function (event) {
            var year =
                String(
                    event.getSource()
                        .getSelectedKey() ||
                    ""
                );

            var model =
                this.getView()
                    .getModel();

            if (!/^\d{4}$/.test(year)) {
                return;
            }

            model.setProperty(
                "/filtros/periodo",
                year
            );

            model.setProperty(
                "/filtros/fechaDesde",
                "01/01/" + year
            );

            model.setProperty(
                "/filtros/fechaHasta",
                "31/12/" + year
            );
        },

        onFechaChange: function () {
            var filters =
                this._currentFilters();

            var from =
                String(
                    filters.fechaDesde
                ).match(
                    /^\d{2}\/\d{2}\/(\d{4})$/
                );

            var to =
                String(
                    filters.fechaHasta
                ).match(
                    /^\d{2}\/\d{2}\/(\d{4})$/
                );

            if (
                from &&
                to &&
                from[1] === to[1]
            ) {
                this.getView()
                    .getModel()
                    .setProperty(
                        "/filtros/periodo",
                        from[1]
                    );
            }
        },

        onApplyFilters: function () {
            this._filters =
                this._currentFilters();

            this._searchValue = "";
            this._currentPage = 1;

            var search =
                this.byId("dccSearchField");

            if (search) {
                search.setValue("");
            }

            this._load(true);
        },

        _load: function (notify) {
            var requestId =
                ++this._requestId;

            var view =
                this.getView();

            view.setBusy(true);

            Service.load(
                this._getODataModel(),
                this._filters
            ).then(function (response) {
                var data;

                if (
                    requestId !==
                    this._requestId
                ) {
                    return;
                }

                data =
                    response &&
                    response.data
                        ? response.data
                        : Service.createEmpty(
                            this._filters
                        );

                view.getModel()
                    .setData(data);

                this._allDetails =
                    data.detalles || [];

                this._currentPage = 1;

                this._renderDonut(
                    data.charts || {}
                );

                this._renderTable();

                if (notify) {
                    MessageToast.show(
                        "Detalle de capacidad actualizado con datos de SAP"
                    );
                }

            }.bind(this), function (error) {
                var emptyData;

                if (
                    requestId !==
                    this._requestId
                ) {
                    return;
                }

                emptyData =
                    Service.createEmpty(
                        this._filters
                    );

                view.getModel()
                    .setData(emptyData);

                this._allDetails = [];
                this._currentPage = 1;

                this._renderDonut(
                    emptyData.charts || {}
                );

                this._renderTable();

                MessageToast.show(
                    error &&
                    error.message
                        ? error.message
                        : "No fue posible consultar el detalle de capacidad"
                );

            }.bind(this)).then(function () {

                if (
                    requestId ===
                    this._requestId
                ) {
                    view.setBusy(false);
                }

            }.bind(this));
        },

     _renderDonut: function (charts) {
    var html =
        this.byId("dccDonutHtml");

    var capacityValue =
        this.byId("dccLegendCapacityValue");

    var plannedValue =
        this.byId("dccLegendPlannedValue");

    var actualValue =
        this.byId("dccLegendActualValue");

    var capacityPct =
        this._percentNumber(
            charts.capacityPct
        );

    var plannedPct =
        this._percentNumber(
            charts.plannedPct
        );

    var actualPct =
        this._percentNumber(
            charts.actualPct
        );

    var totalPct =
        capacityPct +
        plannedPct +
        actualPct;

    /*
     * Normalización únicamente para dibujar la dona.
     * No modifica los datos reales mostrados.
     */
    var capacityShare =
        totalPct > 0
            ? capacityPct / totalPct * 100
            : 0;

    var plannedShare =
        totalPct > 0
            ? plannedPct / totalPct * 100
            : 0;

    var actualShare =
        totalPct > 0
            ? actualPct / totalPct * 100
            : 0;

    var stopCapacity =
        capacityShare;

    var stopPlanned =
        stopCapacity +
        plannedShare;

    var stopActual =
        stopPlanned +
        actualShare;

    var background;

    if (totalPct <= 0) {
        background =
            "conic-gradient(#edf1f5 0% 100%)";
    } else {
        background =
            "conic-gradient(" +

            "#2e8cff 0% " +
            stopCapacity +
            "%," +

            "#63bf42 " +
            stopCapacity +
            "% " +
            stopPlanned +
            "%," +

            "#8645e9 " +
            stopPlanned +
            "% " +
            stopActual +
            "%," +

            "#edf1f5 " +
            stopActual +
            "% 100%)";
    }

    var labels = "";

    /*
     * Solo mostramos porcentajes mayores a cero.
     */
    if (capacityPct > 0) {
        labels +=
            '<span class="dccDonutPercent dccPctBlue">' +
                this._escape(
                    charts.capacityPct
                ) +
            '</span>';
    }

    if (plannedPct > 0) {
        labels +=
            '<span class="dccDonutPercent dccPctGreen">' +
                this._escape(
                    charts.plannedPct
                ) +
            '</span>';
    }

    if (actualPct > 0) {
        labels +=
            '<span class="dccDonutPercent dccPctPurple">' +
                this._escape(
                    charts.actualPct
                ) +
            '</span>';
    }

    /*
     * El centro muestra el total representado por la dona.
     */
    var totalHours =
        this._getDonutTotal(
            charts
        );

    if (html) {
        html.setContent(
            '<div class="dccDonut" style="background:' +
            background +
            ';">' +

                '<div class="dccDonutHole">' +

                    '<span>Total</span>' +

                    '<strong>' +
                        this._escape(
                            totalHours
                        ) +
                    '</strong>' +

                '</div>' +

                labels +

            '</div>'
        );
    }

    if (capacityValue) {
        capacityValue.setText(
            charts.capacity ||
            "Sin datos"
        );
    }

    if (plannedValue) {
        plannedValue.setText(
            charts.planned ||
            "Sin datos"
        );
    }

    if (actualValue) {
        actualValue.setText(
            charts.actual ||
            "Sin datos"
        );
    }
},

_getDonutTotal: function (charts) {
    var values = [
        charts.capacity,
        charts.planned,
        charts.actual
    ];

    var total = values.reduce(
        function (sum, value) {
            var numberValue =
                parseFloat(
                    String(
                        value || ""
                    )
                    .replace(/,/g, "")
                    .replace(
                        /[^0-9.-]/g,
                        ""
                    )
                );

            return (
                sum +
                (
                    Number.isFinite(
                        numberValue
                    )
                        ? numberValue
                        : 0
                )
            );
        },
        0
    );

    if (!total) {
        return "0 h";
    }

    return (
        total.toLocaleString(
            "en-US",
            {
                minimumFractionDigits:
                    total % 1 === 0
                        ? 0
                        : 1,

                maximumFractionDigits: 1
            }
        ) +
        " h"
    );
},

        _percentNumber: function (value) {
            var numberValue =
                parseFloat(
                    String(
                        value === null ||
                        value === undefined
                            ? ""
                            : value
                    ).replace(
                        /[^0-9.,-]/g,
                        ""
                    ).replace(",", ".")
                );

            if (!Number.isFinite(numberValue)) {
                return 0;
            }

            return Math.max(
                0,
                Math.min(
                    100,
                    numberValue
                )
            );
        },

        onSearch: function (event) {
            var value =
                event.getParameter("newValue");

            if (value === undefined) {
                value =
                    event.getParameter("query") ||
                    "";
            }

            this._searchValue =
                String(value).trim();

            this._currentPage = 1;

            this._renderTable();
        },

        onColumns: function () {
            MessageToast.show(
                "Las columnas visibles corresponden al detalle de capacidad, plan, real y utilización."
            );
        },

        onExport: function () {
            var rows =
                this._getFilteredDetails();

            var headers = [
                "Zona",
                "Turno",
                "Capacidad disponible (h)",
                "Horas programadas (h)",
                "Horas reales (h)",
                "Margen (h)",
                "Utilización real / capacidad",
                "Variación vs programada (h)",
                "Variación vs programada (%)",
                "Estado"
            ];

            var csv =
                [headers]
                    .concat(
                        rows.map(
                            function (row) {
                                return [
                                    row.zona,
                                    row.turno,
                                    row.capacidad,
                                    row.programadas,
                                    row.reales,
                                    row.margen,
                                    row.utilizacion,
                                    row.variacionProgH,
                                    row.variacionProgP,
                                    row.estado
                                ].map(
                                    function (value) {
                                        return (
                                            '"' +
                                            String(
                                                value === null ||
                                                value === undefined
                                                    ? ""
                                                    : value
                                            ).replace(
                                                /"/g,
                                                '""'
                                            ) +
                                            '"'
                                        );
                                    }
                                );
                            }
                        )
                    )
                    .map(
                        function (row) {
                            return row.join(";");
                        }
                    )
                    .join("\r\n");

            var anchor =
                document.createElement("a");

            var url =
                URL.createObjectURL(
                    new Blob(
                        [
                            "\ufeff" +
                            csv
                        ],
                        {
                            type:
                                "text/csv;charset=utf-8"
                        }
                    )
                );

            anchor.href = url;
            anchor.download =
                "detalle-capacidad-carga.csv";

            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            URL.revokeObjectURL(url);
        },

        onChangePageSize: function (event) {
            this._pageSize =
                Number(
                    event.getSource()
                        .getSelectedKey()
                ) ||
                this._getDefaultPageSize();

            this._currentPage = 1;

            this._renderTable();
        },

        onPreviousPage: function () {
            if (this._currentPage <= 1) {
                return;
            }

            this._currentPage -= 1;

            this._renderTable();
        },

        onNextPage: function () {
            var pagination =
                this.getView()
                    .getModel()
                    .getProperty(
                        "/paginacion"
                    ) ||
                {};

            var totalPages =
                Number(
                    pagination.totalPages
                ) || 1;

            if (
                this._currentPage >=
                totalPages
            ) {
                return;
            }

            this._currentPage += 1;

            this._renderTable();
        },

        _getDefaultPageSize: function () {
            var height =
                window.innerHeight ||
                768;

            if (height <= 720) {
                return 6;
            }

            if (height <= 850) {
                return 8;
            }

            return 12;
        },

        _getFilteredDetails: function () {
            var search =
                this._normalize(
                    this._searchValue
                );

            if (!search) {
                return this._allDetails.slice();
            }

            return this._allDetails.filter(
                function (row) {
                    var values = [
                        row.zona,
                        row.turno,
                        row.capacidad,
                        row.programadas,
                        row.reales,
                        row.margen,
                        row.utilizacion,
                        row.variacionProgH,
                        row.variacionProgP,
                        row.estado
                    ];

                    return values.some(
                        function (value) {
                            return (
                                this._normalize(
                                    value
                                ).indexOf(
                                    search
                                ) >= 0
                            );
                        }.bind(this)
                    );
                }.bind(this)
            );
        },

        _renderTable: function () {
            var model =
                this.getView()
                    .getModel();

            if (!model) {
                return;
            }

            var rows =
                this._getFilteredDetails();

            var total =
                rows.length;

            var totalPages =
                Math.max(
                    1,
                    Math.ceil(
                        total /
                        this._pageSize
                    )
                );

            var page =
                Math.min(
                    Math.max(
                        this._currentPage,
                        1
                    ),
                    totalPages
                );

            var start =
                (page - 1) *
                this._pageSize;

            var end =
                Math.min(
                    start +
                    this._pageSize,
                    total
                );

            this._currentPage = page;

            model.setProperty(
                "/detalles",
                rows.slice(
                    start,
                    end
                )
            );

            model.setProperty(
                "/paginacion",
                {
                    pageSize:
                        String(
                            this._pageSize
                        ),

                    currentPage:
                        page,

                    totalPages:
                        totalPages,

                    totalResults:
                        total,

                    from:
                        total
                            ? start + 1
                            : 0,

                    to:
                        end,

                    canGoPrevious:
                        page > 1,

                    canGoNext:
                        page <
                        totalPages,

                    summaryText:
                        "Mostrando " +
                        (
                            total
                                ? start + 1
                                : 0
                        ) +
                        " a " +
                        end +
                        " de " +
                        total +
                        " resultados"
                }
            );
        },

        _normalize: function (value) {
            var text =
                String(
                    value === null ||
                    value === undefined
                        ? ""
                        : value
                ).toLowerCase();

            return text.normalize
                ? text
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                : text;
        },

        _escape: function (value) {
            return String(
                value === null ||
                value === undefined
                    ? ""
                    : value
            ).replace(
                /[&<>"']/g,
                function (character) {
                    return {
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;"
                    }[character];
                }
            );
        },

        formatUtilizacionState: function (value) {
            var numberValue =
                Number(
                    String(
                        value ||
                        ""
                    ).replace(
                        "%",
                        ""
                    )
                );

            if (
                !Number.isFinite(
                    numberValue
                )
            ) {
                return "None";
            }

            return numberValue >= 100
                ? "Error"
                : numberValue >= 90
                    ? "Warning"
                    : "Success";
        },

        formatMargenState: function (value) {
            return String(
                value ||
                ""
            ).indexOf("-") === 0
                ? "Error"
                : "Success";
        },

        formatTrendState: function (value) {
            return String(
                value ||
                ""
            ).indexOf("+") === 0
                ? "Error"
                : "Success";
        },

        formatEstadoState: function (value) {
            return value === "Sobrecargado"
                ? "Error"
                : value === "Cerca de saturación"
                    ? "Warning"
                    : value === "Normal"
                        ? "Success"
                        : "None";
        },

        formatEstadoColor: function (value) {
            return value === "Sobrecargado"
                ? "#ef4444"
                : value === "Cerca de saturación"
                    ? "#f59e0b"
                    : value === "Normal"
                        ? "#16a34a"
                        : "#94a3b8";
        },

        formatEstadoCircleVisible: function (value) {
            return value !== "Sin datos";
        },

        formatTurnoIconColor: function (value) {
            var text =
                String(
                    value ||
                    ""
                ).toUpperCase();

            return text.indexOf("NOCT") >= 0
                ? "#7c3aed"
                : text.indexOf("FIN") >= 0
                    ? "#ef4444"
                    : "#2563eb";
        }
    });
});