sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleHorasTipoOrdenService",
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

    return Controller.extend(
        "mantenimiento.controller.DetalleHorasTipoOrden",
        {

            onInit: function () {
                var initialPeriod =
                    InitialLoadPeriod.previousMonth();

                var initialData =
                    Service.createEmpty({
                        periodo: initialPeriod.year,
                        fechaDesde: initialPeriod.startDisplay,
                        fechaHasta: initialPeriod.endDisplay,
                        zona: "TODOS",
                        supervisor: "TODOS",
                        turno: "TODOS",
                        tipoOrden: "SM01",
                        estado: "TODOS"
                    });

                this._requestId = 0;

                this._allOrders = [];
                this._filteredOrders = [];

                this._searchValue = "";

                this._currentPage = 1;

                this._pageSize =
                    this._getDefaultPageSize();

                this._filters = {
                    periodo: initialPeriod.year,
                    fechaDesde: initialPeriod.startDisplay,
                    fechaHasta: initialPeriod.endDisplay,
                    zona: "TODOS",
                    supervisor: "TODOS",
                    turno: "TODOS",
                    tipoOrden: "SM01",
                    estado: "TODOS"
                };

                initialData.pagination = {
                    currentPage: 1,
                    totalPages: 1,
                    totalResults: 0,
                    from: 0,
                    to: 0,
                    hasPrevious: false,
                    hasNext: false,
                    resultText:
                        "No se encontraron resultados"
                };

                initialData.ordenesPaginadas = [];

                this._loadStyles();

                this.getView().setModel(
                    new JSONModel(initialData),
                    "dhto"
                );

                this._model().setSizeLimit(2000);

                this._load(false);
            },


            /* =====================================================
               ESTILOS
               ===================================================== */

            _loadStyles: function () {
                var id =
                    "detalleHorasTipoOrdenStylesheet";

                var url =
                    sap.ui.require.toUrl(
                        "mantenimiento/css/DetalleHorasTipoOrden.css"
                    ) +
                    "?v=20261005-unified-final";

                var current =
                    document.getElementById(id);

                if (current) {
                    current.setAttribute(
                        "href",
                        url
                    );

                    return;
                }

                includeStylesheet(
                    url,
                    id
                );
            },


            /* =====================================================
               MODELOS
               ===================================================== */

            _model: function () {
                return this.getView()
                    .getModel("dhto");
            },


            _getODataModel: function () {
                var component =
                    this.getOwnerComponent();

                return (
                    component &&
                    (
                        component.getModel(
                            "dashboardOData"
                        ) ||
                        component.getModel()
                    )
                ) ||
                this.getView()
                    .getModel(
                        "dashboardOData"
                    );
            },


            /* =====================================================
               FILTROS
               ===================================================== */

            _readFilters: function () {
                var filters =
                    this._model()
                        .getProperty(
                            "/filters"
                        ) ||
                    {};

                return {
                    periodo:
                        filters.periodo ||
                        "2026",

                    fechaDesde:
                        filters.fechaDesde ||
                        "01/01/2026",

                    fechaHasta:
                        filters.fechaHasta ||
                        "31/12/2026",

                    zona:
                        filters.zona ||
                        "TODOS",

                    supervisor:
                        filters.supervisor ||
                        "TODOS",

                    turno:
                        filters.turno ||
                        "TODOS",

                    tipoOrden:
                        filters.tipoOrden ||
                        "SM01",

                    estado:
                        filters.estado ||
                        "TODOS"
                };
            },


            onPeriodoChange: function (event) {
                var year =
                    String(
                        event
                            .getSource()
                            .getSelectedKey() ||
                        ""
                    );

                if (!/^\d{4}$/.test(year)) {
                    return;
                }

                this._model()
                    .setProperty(
                        "/filters/periodo",
                        year
                    );

                this._model()
                    .setProperty(
                        "/filters/fechaDesde",
                        "01/01/" + year
                    );

                this._model()
                    .setProperty(
                        "/filters/fechaHasta",
                        "31/12/" + year
                    );
            },


            onFechaChange: function () {
                var filters =
                    this._readFilters();

                var from =
                    String(
                        filters.fechaDesde
                    ).match(
                        /^\d{2}\/\d{2}\/(\d{4})$/
                    );

                var until =
                    String(
                        filters.fechaHasta
                    ).match(
                        /^\d{2}\/\d{2}\/(\d{4})$/
                    );

                if (
                    from &&
                    until &&
                    from[1] === until[1]
                ) {
                    this._model()
                        .setProperty(
                            "/filters/periodo",
                            from[1]
                        );
                }
            },


            onApplyFilters: function () {
                var filters =
                    this._readFilters();

                var start =
                    this._localDate(
                        filters.fechaDesde
                    );

                var end =
                    this._localDate(
                        filters.fechaHasta
                    );

                if (
                    !start ||
                    !end ||
                    start > end
                ) {
                    MessageToast.show(
                        "Revisa que la fecha desde sea menor o igual a la fecha hasta."
                    );

                    return;
                }

                this._filters = filters;

                this._searchValue = "";

                this._currentPage = 1;

                var search =
                    this.byId(
                        "dhtoSearchField"
                    );

                if (search) {
                    search.setValue("");
                }

                this._load(true);
            },


            /* =====================================================
               CARGA ODATA
               ===================================================== */

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

                    this._model()
                        .setData(data);

                    this._allOrders =
                        Array.isArray(
                            data.ordenes
                        )
                            ? data.ordenes.slice()
                            : [];

                    this._filteredOrders =
                        this._allOrders.slice();

                    this._currentPage = 1;

                    this._renderOrders();

                    if (notify) {
                        MessageToast.show(
                            "Detalle de horas actualizado con datos de SAP"
                        );
                    }

                }.bind(this), function (error) {
                    var empty;

                    if (
                        requestId !==
                        this._requestId
                    ) {
                        return;
                    }

                    empty =
                        Service.createEmpty(
                            this._filters
                        );

                    this._model()
                        .setData(empty);

                    this._allOrders = [];
                    this._filteredOrders = [];

                    this._currentPage = 1;

                    this._renderOrders();

                    MessageToast.show(
                        error &&
                        error.message
                            ? error.message
                            : "No fue posible consultar el detalle de horas"
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


            /* =====================================================
               BÚSQUEDA
               ===================================================== */

            onSearchOrden: function (event) {
                var value =
                    event.getParameter(
                        "newValue"
                    );

                if (value === undefined) {
                    value =
                        event.getParameter(
                            "query"
                        ) ||
                        "";
                }

                this._searchValue =
                    String(
                        value
                    ).trim();

                var search =
                    this._normalize(
                        this._searchValue
                    );

                this._filteredOrders =
                    this._allOrders.filter(
                        function (order) {
                            var values;

                            if (!search) {
                                return true;
                            }

                            values = [
                                order.ot,
                                order.cliente,
                                order.elevador,
                                order.zona,
                                order.responsable,
                                order.turno,
                                order.horasPlan,
                                order.horasReales,
                                order.variacionH,
                                order.variacionPct,
                                order.estado
                            ];

                            return values.some(
                                function (item) {
                                    return (
                                        this._normalize(
                                            item
                                        ).indexOf(
                                            search
                                        ) >= 0
                                    );

                                }.bind(this)
                            );

                        }.bind(this)
                    );

                this._currentPage = 1;

                this._renderOrders();
            },


            /* =====================================================
               PAGINACIÓN
               ===================================================== */

            _getDefaultPageSize: function () {
                var height =
                    window.innerHeight ||
                    768;

                if (height <= 720) {
                    return 5;
                }

                if (height <= 850) {
                    return 7;
                }

                return 9;
            },


            _renderOrders: function () {
                var model =
                    this._model();

                if (!model) {
                    return;
                }

                var rows =
                    this._filteredOrders ||
                    [];

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

                this._currentPage =
                    page;

                model.setProperty(
                    "/ordenesPaginadas",
                    rows.slice(
                        start,
                        end
                    )
                );

                model.setProperty(
                    "/pagination",
                    {
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

                        hasPrevious:
                            page > 1,

                        hasNext:
                            page <
                            totalPages,

                        resultText:
                            total
                                ? "Mostrando " +
                                    (
                                        start +
                                        1
                                    ) +
                                    " a " +
                                    end +
                                    " de " +
                                    total +
                                    " resultados"
                                : "No se encontraron resultados"
                    }
                );
            },


            onPreviousPage: function () {
                if (
                    this._currentPage <= 1
                ) {
                    return;
                }

                this._currentPage -= 1;

                this._renderOrders();
            },


            onNextPage: function () {
                var pagination =
                    this._model()
                        .getProperty(
                            "/pagination"
                        ) ||
                    {};

                var totalPages =
                    Number(
                        pagination.totalPages
                    ) ||
                    1;

                if (
                    this._currentPage >=
                    totalPages
                ) {
                    return;
                }

                this._currentPage += 1;

                this._renderOrders();
            },


            /* =====================================================
               EXPORTAR
               ===================================================== */

            onExportar: function () {
                var rows =
                    this._filteredOrders ||
                    [];

                var header = [
                    "OT",
                    "Cliente",
                    "Elevador / Equipo",
                    "Zona",
                    "Responsable",
                    "Turno",
                    "Horas plan",
                    "Horas reales",
                    "Variación h",
                    "Variación %",
                    "Estado"
                ];

                var csv =
                    [header]
                        .concat(
                            rows.map(
                                function (row) {
                                    return [
                                        row.ot,
                                        row.cliente,
                                        row.elevador,
                                        row.zona,
                                        row.responsable,
                                        row.turno,
                                        row.horasPlan,
                                        row.horasReales,
                                        row.variacionH,
                                        row.variacionPct,
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
                                return row.join(
                                    ";"
                                );
                            }
                        )
                        .join("\r\n");

                var blob =
                    new Blob(
                        [
                            "\ufeff" +
                            csv
                        ],
                        {
                            type:
                                "text/csv;charset=utf-8"
                        }
                    );

                var url =
                    URL.createObjectURL(
                        blob
                    );

                var anchor =
                    document.createElement(
                        "a"
                    );

                anchor.href = url;

                anchor.download =
                    "detalle-horas-tipo-orden.csv";

                document.body
                    .appendChild(
                        anchor
                    );

                anchor.click();

                document.body
                    .removeChild(
                        anchor
                    );

                URL.revokeObjectURL(
                    url
                );
            },


            onColumnas: function () {
                MessageToast.show(
                    "La tabla muestra las columnas definidas para plan, real, variación y estado."
                );
            },


            /* =====================================================
               UTILIDADES
               ===================================================== */

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


            _localDate: function (value) {
                var match =
                    String(
                        value ||
                        ""
                    ).match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                return match
                    ? new Date(
                        Number(
                            match[3]
                        ),
                        Number(
                            match[2]
                        ) - 1,
                        Number(
                            match[1]
                        )
                    )
                    : null;
            }

        }
    );
});