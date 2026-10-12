sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/dom/includeStylesheet",
    "sap/ui/core/ResizeHandler",
    "mantenimiento/model/CausasZonaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    MessageToast,
    History,
    includeStylesheet,
    ResizeHandler,
    CausasZonaService,
    InitialLoadPeriod
) {
    "use strict";

    var TYPE_LABELS = {
        TODAS: "Todas",
        SM01: "Preventivo",
        SM02: "Correctivo",
        SM03: "Call Center"
    };

    var TYPE_LEGEND = [
        {
            type: "Preventivo",
            colorClass: "czTypeBlue"
        },
        {
            type: "Correctivo",
            colorClass: "czTypeGreen"
        },
        {
            type: "Call Center",
            colorClass: "czTypeAmber"
        }
    ];

    function typeColor(sType) {
        switch (
            String(
                sType || ""
            ).toUpperCase()
        ) {
        case "PREVENTIVO":
            return "#1764e8";

        case "CORRECTIVO":
            return "#16a34a";

        case "CALL CENTER":
            return "#f4b400";

        default:
            return "#718199";
        }
    }

    return Controller.extend(
        "mantenimiento.controller.CausasZona",
        {

            /* =========================================================
               INIT
               ========================================================= */

            onInit: function () {
                var oViewModel;
                var oInitialPeriod;

                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/CausasZona.css"
                    ) + "?v=20261002-unified-dashboard-v1"
                );

                this._iLoadRequest = 0;

                this._iCurrentPage = 1;

                /*
                 * Valor provisional.
                 * Después del render se calcula automáticamente
                 * cuántas filas caben realmente.
                 */
                this._iPageSize = 8;

                this._sTypeFilter = "TODAS";

                this._sResizeHandlerId = null;
                this._iResizeTimer = null;

                oInitialPeriod =
                    InitialLoadPeriod.previousMonth();

                this._mFilters = {
                    semana:
                        oInitialPeriod.year +
                        "-ANUAL",

                    fechaDesde:
                        oInitialPeriod.startDisplay,

                    fechaHasta:
                        oInitialPeriod.endDisplay,

                    zona:
                        "TODAS",

                    cliente:
                        "TODOS",

                    responsable:
                        "TODOS"
                };

                oViewModel =
                    new JSONModel(
                        CausasZonaService.createEmpty(
                            this._mFilters
                        )
                    );

                oViewModel.setSizeLimit(1000);

                this.getView().setModel(
                    oViewModel
                );

                this._initializePagination();

                this._loadData(false);
            },

            /* =========================================================
               AFTER RENDER
               ========================================================= */

            onAfterRendering: function () {
                this._configureCharts();

                this._registerResize();

                this._scheduleTableLayout();
            },

            /* =========================================================
               EXIT
               ========================================================= */

            onExit: function () {
                if (this._sResizeHandlerId) {
                    ResizeHandler.deregister(
                        this._sResizeHandlerId
                    );

                    this._sResizeHandlerId = null;
                }

                if (this._iResizeTimer) {
                    window.clearTimeout(
                        this._iResizeTimer
                    );

                    this._iResizeTimer = null;
                }
            },

            /* =========================================================
               APLICAR FILTROS
               ========================================================= */

            onApplyFilters: function () {
                this._mFilters = {
                    semana:
                        this.byId(
                            "causasZonaWeekSelect"
                        ).getSelectedKey() ||
                        "2026-ANUAL",

                    fechaDesde:
                        this.byId(
                            "causasZonaStartDate"
                        ).getValue(),

                    fechaHasta:
                        this.byId(
                            "causasZonaEndDate"
                        ).getValue(),

                    zona:
                        this.byId(
                            "causasZonaZoneSelect"
                        ).getSelectedKey() ||
                        "TODAS",

                    cliente:
                        this.byId(
                            "causasZonaCustomerSelect"
                        ).getSelectedKey() ||
                        "TODOS",

                    responsable:
                        this.byId(
                            "causasZonaResponsibleSelect"
                        ).getSelectedKey() ||
                        "TODOS"
                };

                this._iCurrentPage = 1;

                this._sTypeFilter =
                    "TODAS";

                this.byId(
                    "causasZonaTypeSegments"
                ).setSelectedKey(
                    "TODAS"
                );

                this._loadData(true);
            },

            /* =========================================================
               PERIODO
               ========================================================= */

            onPeriodoChange: function (oEvent) {
                var sPeriodo =
                    oEvent.getSource()
                        .getSelectedKey() ||
                    "2026-ANUAL";

                var oContext =
                    CausasZonaService
                        .getFilterContext({
                            semana: sPeriodo
                        });

                var oModel =
                    this.getView()
                        .getModel();

                if (
                    !oContext.startDate ||
                    !oContext.endDate
                ) {
                    return;
                }

                oModel.setProperty(
                    "/filtros/fechaDesde",
                    this._formatDate(
                        oContext.startDate
                    )
                );

                oModel.setProperty(
                    "/filtros/fechaHasta",
                    this._formatDate(
                        oContext.endDate
                    )
                );
            },

            /* =========================================================
               FILTRO TIPO OT
               ========================================================= */

            onTypeFilterChange: function (oEvent) {
                var oItem =
                    oEvent.getParameter(
                        "item"
                    );

                this._sTypeFilter =
                    oItem
                        ? oItem.getKey()
                        : "TODAS";

                this._iCurrentPage = 1;

                this._actualizarTabla();

                this._scheduleTableLayout();
            },

            /* =========================================================
               PAGINACIÓN
               ========================================================= */

            onPreviousPage: function () {
                if (
                    this._iCurrentPage <= 1
                ) {
                    return;
                }

                this._iCurrentPage -= 1;

                this._actualizarTabla();
            },

            onNextPage: function () {
                var oModel =
                    this.getView()
                        .getModel();

                var iTotalPages =
                    Number(
                        oModel.getProperty(
                            "/paginacion/totalPaginas"
                        )
                    ) || 1;

                if (
                    this._iCurrentPage >=
                    iTotalPages
                ) {
                    return;
                }

                this._iCurrentPage += 1;

                this._actualizarTabla();
            },

            /* =========================================================
               ODATA
               ========================================================= */

            _getODataModel: function () {
                var oComponent =
                    this.getOwnerComponent();

                return (
                    oComponent &&
                    oComponent.getModel(
                        "dashboardOData"
                    )
                ) ||
                    this.getView()
                        .getModel(
                            "dashboardOData"
                        );
            },

            /* =========================================================
               CARGA DE DATOS
               ========================================================= */

            _loadData: function (bNotify) {
                var iRequest =
                    ++this._iLoadRequest;

                var oViewModel =
                    this.getView()
                        .getModel();

                var mFilters =
                    Object.assign(
                        {},
                        this._mFilters
                    );

                this.getView()
                    .setBusy(true);

                CausasZonaService
                    .load(
                        this._getODataModel(),
                        mFilters
                    )
                    .then(
                        function (oResult) {
                            if (
                                iRequest !==
                                this._iLoadRequest
                            ) {
                                return;
                            }

                            this._oRawData =
                                oResult.rawData;

                            this._prepareTypeLegend(
                                oResult.data
                            );

                            oViewModel.setData(
                                oResult.data
                            );

                            this._setFiltersOnControls(
                                oResult.data.filtros ||
                                mFilters
                            );

                            this._iCurrentPage = 1;

                            this._actualizarTabla();

                            this._configureCharts();

                            this._scheduleTableLayout();

                            if (bNotify) {
                                MessageToast.show(
                                    "Análisis por zona actualizado con datos de SAP"
                                );
                            }
                        }.bind(this)
                    )
                    .catch(
                        function (oError) {
                            var oEmpty;

                            if (
                                iRequest !==
                                this._iLoadRequest
                            ) {
                                return;
                            }

                            oEmpty =
                                CausasZonaService
                                    .createEmpty(
                                        mFilters
                                    );

                            this._prepareTypeLegend(
                                oEmpty
                            );

                            oViewModel.setData(
                                oEmpty
                            );

                            this._setFiltersOnControls(
                                mFilters
                            );

                            this._iCurrentPage = 1;

                            this._actualizarTabla();

                            this._configureCharts();

                            this._scheduleTableLayout();

                            if (bNotify) {
                                MessageToast.show(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "No fue posible cargar las causas por zona"
                                );
                            }
                        }.bind(this)
                    )
                    .finally(
                        function () {
                            if (
                                iRequest ===
                                this._iLoadRequest
                            ) {
                                this.getView()
                                    .setBusy(false);
                            }
                        }.bind(this)
                    );
            },

            /* =========================================================
               SINCRONIZAR CONTROLES
               ========================================================= */

            _setFiltersOnControls: function (mFilters) {
                mFilters =
                    mFilters || {};

                if (
                    this.byId(
                        "causasZonaWeekSelect"
                    )
                ) {
                    this.byId(
                        "causasZonaWeekSelect"
                    ).setSelectedKey(
                        mFilters.semana ||
                        "2026-ANUAL"
                    );
                }

                if (
                    this.byId(
                        "causasZonaZoneSelect"
                    )
                ) {
                    this.byId(
                        "causasZonaZoneSelect"
                    ).setSelectedKey(
                        mFilters.zona ||
                        "TODAS"
                    );
                }

                if (
                    this.byId(
                        "causasZonaCustomerSelect"
                    )
                ) {
                    this.byId(
                        "causasZonaCustomerSelect"
                    ).setSelectedKey(
                        mFilters.cliente ||
                        "TODOS"
                    );
                }

                if (
                    this.byId(
                        "causasZonaResponsibleSelect"
                    )
                ) {
                    this.byId(
                        "causasZonaResponsibleSelect"
                    ).setSelectedKey(
                        mFilters.responsable ||
                        "TODOS"
                    );
                }
            },

            /* =========================================================
               FECHA
               ========================================================= */

            _formatDate: function (oDate) {
                return String(
                    oDate.getDate()
                ).padStart(
                    2,
                    "0"
                ) +
                    "/" +
                    String(
                        oDate.getMonth() + 1
                    ).padStart(
                        2,
                        "0"
                    ) +
                    "/" +
                    oDate.getFullYear();
            },

            /* =========================================================
               LEYENDA DONUT
               ========================================================= */

            _prepareTypeLegend: function (oData) {
                var aSummary =
                    oData.ResumenTipos ||
                    [];

                oData.TiposLeyenda =
                    TYPE_LEGEND.map(
                        function (oLegend) {
                            var oType =
                                aSummary.filter(
                                    function (oItem) {
                                        return String(
                                            oItem.Tipo ||
                                            ""
                                        ).toUpperCase() ===
                                            oLegend.type
                                                .toUpperCase();
                                    }
                                )[0] || {
                                    Cantidad: 0,
                                    Porcentaje: 0
                                };

                            var iQuantity =
                                Number(
                                    oType.Cantidad ||
                                    0
                                );

                            var iPercentage =
                                Number(
                                    oType.Porcentaje ||
                                    0
                                );

                            return {
                                Tipo:
                                    oLegend.type,

                                ColorClass:
                                    oLegend.colorClass,

                                Cantidad:
                                    iQuantity,

                                Porcentaje:
                                    iPercentage,

                                LegendText:
                                    iQuantity +
                                    " OT (" +
                                    iPercentage
                                        .toFixed(0) +
                                    "%)"
                            };
                        }
                    );
            },

            /* =========================================================
               OBTENER REGISTROS SEGÚN TIPO
               ========================================================= */

            _getFilteredRows: function () {
                var oModel =
                    this.getView()
                        .getModel();

                var aRows =
                    oModel.getProperty(
                        "/IncumplimientosFull"
                    ) || [];

                if (
                    this._sTypeFilter ===
                    "TODAS"
                ) {
                    return aRows.slice();
                }

                return aRows.filter(
                    function (oRow) {
                        return (
                            oRow.TipoOTCode ===
                            this._sTypeFilter
                        );
                    }.bind(this)
                );
            },

            /* =========================================================
               PAGINACIÓN INICIAL
               ========================================================= */

            _initializePagination: function () {
                var oModel =
                    this.getView()
                        .getModel();

                if (!oModel) {
                    return;
                }

                oModel.setProperty(
                    "/IncumplimientosData",
                    []
                );

                oModel.setProperty(
                    "/VisibleCount",
                    0
                );

                oModel.setProperty(
                    "/ActiveFilterLabel",
                    "Todas"
                );

                oModel.setProperty(
                    "/paginacion",
                    {
                        pagina: 1,
                        totalPaginas: 1,
                        inicio: 0,
                        fin: 0,
                        totalRegistros: 0,
                        paginaTexto: "Página 1 de 1",
                        visible: false,
                        tieneAnterior: false,
                        tieneSiguiente: false
                    }
                );
            },

            /* =========================================================
               ACTUALIZAR TABLA
               ========================================================= */

            _actualizarTabla: function () {
                var oModel =
                    this.getView()
                        .getModel();

                if (!oModel) {
                    return;
                }

                var aFilteredRows =
                    this._getFilteredRows();

                var iTotal =
                    aFilteredRows.length;

                var iPageSize =
                    Math.max(
                        1,
                        Number(
                            this._iPageSize
                        ) || 1
                    );

                var iTotalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            iTotal /
                            iPageSize
                        )
                    );

                this._iCurrentPage =
                    Math.max(
                        1,
                        Math.min(
                            this._iCurrentPage,
                            iTotalPages
                        )
                    );

                var iStart =
                    (
                        this._iCurrentPage -
                        1
                    ) *
                    iPageSize;

                var iEnd =
                    Math.min(
                        iStart +
                        iPageSize,
                        iTotal
                    );

                var aVisibleRows =
                    aFilteredRows.slice(
                        iStart,
                        iEnd
                    );

                oModel.setProperty(
                    "/IncumplimientosData",
                    aVisibleRows
                );

                oModel.setProperty(
                    "/VisibleCount",
                    iTotal
                );

                oModel.setProperty(
                    "/ActiveFilterLabel",
                    TYPE_LABELS[
                        this._sTypeFilter
                    ] || "Todas"
                );

                oModel.setProperty(
                    "/paginacion/pagina",
                    this._iCurrentPage
                );

                oModel.setProperty(
                    "/paginacion/totalPaginas",
                    iTotalPages
                );

                oModel.setProperty(
                    "/paginacion/inicio",
                    iTotal
                        ? iStart + 1
                        : 0
                );

                oModel.setProperty(
                    "/paginacion/fin",
                    iEnd
                );

                oModel.setProperty(
                    "/paginacion/totalRegistros",
                    iTotal
                );

                oModel.setProperty(
                    "/paginacion/paginaTexto",
                    "Página " +
                    this._iCurrentPage +
                    " de " +
                    iTotalPages
                );

                /*
                 * El pie aparece solamente cuando
                 * existe más de una página.
                 */
                oModel.setProperty(
                    "/paginacion/visible",
                    iTotalPages > 1
                );

                oModel.setProperty(
                    "/paginacion/tieneAnterior",
                    this._iCurrentPage > 1
                );

                oModel.setProperty(
                    "/paginacion/tieneSiguiente",
                    this._iCurrentPage <
                    iTotalPages
                );
            },

            /* =========================================================
               RESIZE
               ========================================================= */

            _registerResize: function () {
                var oArea =
                    this.byId(
                        "causasZonaTableArea"
                    );

                if (
                    !oArea ||
                    this._sResizeHandlerId
                ) {
                    return;
                }

                this._sResizeHandlerId =
                    ResizeHandler.register(
                        oArea,
                        function () {
                            this._scheduleTableLayout();
                        }.bind(this)
                    );
            },

            _scheduleTableLayout: function () {
                if (this._iResizeTimer) {
                    window.clearTimeout(
                        this._iResizeTimer
                    );
                }

                this._iResizeTimer =
                    window.setTimeout(
                        function () {
                            this._iResizeTimer = null;

                            this._recalculateTableRows();
                        }.bind(this),
                        100
                    );
            },

            /* =========================================================
               CALCULAR FILAS QUE CABEN
               ========================================================= */

            _recalculateTableRows: function () {
                var oArea =
                    this.byId(
                        "causasZonaTableArea"
                    );

                var oTable =
                    this.byId(
                        "causasZonaIncumplimientoTable"
                    );

                var oModel =
                    this.getView()
                        .getModel();

                if (
                    !oArea ||
                    !oTable ||
                    !oModel ||
                    !oArea.getDomRef()
                ) {
                    return;
                }

                var oAreaDom =
                    oArea.getDomRef();

                var iCurrentHeight =
                    Math.floor(
                        oAreaDom.clientHeight
                    );

                if (
                    !iCurrentHeight ||
                    iCurrentHeight <= 0
                ) {
                    return;
                }

                var oTableDom =
                    oTable.getDomRef();

                var oHeader =
                    oTableDom
                        ? oTableDom.querySelector(
                            ".sapMListTblHeader"
                        )
                        : null;

                var iHeaderHeight =
                    oHeader
                        ? Math.ceil(
                            oHeader
                                .getBoundingClientRect()
                                .height
                        )
                        : (
                            window.innerHeight <= 720
                                ? 30
                                : 34
                        );

                if (
                    !Number.isFinite(
                        iHeaderHeight
                    ) ||
                    iHeaderHeight < 20
                ) {
                    iHeaderHeight =
                        window.innerHeight <= 720
                            ? 30
                            : 34;
                }

                var iMinRowHeight =
                    window.innerHeight <= 720
                        ? 34
                        : 38;

                var iFooterHeight =
                    window.innerHeight <= 720
                        ? 30
                        : 34;

                var bFooterVisible =
                    Boolean(
                        oModel.getProperty(
                            "/paginacion/visible"
                        )
                    );

                /*
                 * Si el footer está visible, la zona de tabla
                 * ya perdió su altura. La sumamos para conocer
                 * cuánto espacio habría sin paginación.
                 */
                var iHeightWithoutFooter =
                    iCurrentHeight +
                    (
                        bFooterVisible
                            ? iFooterHeight
                            : 0
                    );

                var iRowsAreaWithoutFooter =
                    Math.max(
                        0,
                        iHeightWithoutFooter -
                        iHeaderHeight -
                        2
                    );

                var aFilteredRows =
                    this._getFilteredRows();

                var iTotal =
                    aFilteredRows.length;

                var iCapacityWithoutFooter =
                    Math.max(
                        1,
                        Math.floor(
                            iRowsAreaWithoutFooter /
                            iMinRowHeight
                        )
                    );

                var iNewPageSize;
                var iRowHeight;

                /*
                 * Todos los registros caben.
                 */
                if (
                    iTotal > 0 &&
                    iTotal <=
                    iCapacityWithoutFooter
                ) {
                    iNewPageSize =
                        iTotal;

                    iRowHeight =
                        Math.floor(
                            iRowsAreaWithoutFooter /
                            iTotal
                        );

                    iRowHeight =
                        Math.max(
                            iMinRowHeight,
                            Math.min(
                                54,
                                iRowHeight
                            )
                        );
                } else {

                    /*
                     * Existen más registros que espacio.
                     * Reservamos el alto del footer.
                     */
                    var iHeightWithFooter =
                        iHeightWithoutFooter -
                        iFooterHeight;

                    var iRowsAreaWithFooter =
                        Math.max(
                            0,
                            iHeightWithFooter -
                            iHeaderHeight -
                            2
                        );

                    iNewPageSize =
                        Math.max(
                            1,
                            Math.floor(
                                iRowsAreaWithFooter /
                                iMinRowHeight
                            )
                        );

                    iRowHeight =
                        Math.floor(
                            iRowsAreaWithFooter /
                            iNewPageSize
                        );

                    iRowHeight =
                        Math.max(
                            iMinRowHeight,
                            Math.min(
                                48,
                                iRowHeight
                            )
                        );
                }

                if (iTotal === 0) {
                    iNewPageSize = 1;
                    iRowHeight = iMinRowHeight;
                }

                this._applyRowHeight(
                    iRowHeight
                );

                var bChanged =
                    this._iPageSize !==
                    iNewPageSize;

                if (bChanged) {
                    this._iPageSize =
                        iNewPageSize;

                    this._iCurrentPage = 1;
                }

                var bPreviousFooter =
                    Boolean(
                        oModel.getProperty(
                            "/paginacion/visible"
                        )
                    );

                this._actualizarTabla();

                var bNewFooter =
                    Boolean(
                        oModel.getProperty(
                            "/paginacion/visible"
                        )
                    );

                /*
                 * Mostrar u ocultar el footer cambia el espacio.
                 * Recalculamos una segunda vez sólo cuando cambia.
                 */
                if (
                    bPreviousFooter !==
                    bNewFooter
                ) {
                    window.setTimeout(
                        function () {
                            this._scheduleTableLayout();
                        }.bind(this),
                        50
                    );
                }
            },

            /* =========================================================
               ALTURA DINÁMICA DE FILAS
               ========================================================= */

            _applyRowHeight: function (iHeight) {
                var oArea =
                    this.byId(
                        "causasZonaTableArea"
                    );

                if (
                    !oArea ||
                    !oArea.getDomRef()
                ) {
                    return;
                }

                var iSafeHeight =
                    Math.max(
                        32,
                        Number(
                            iHeight
                        ) || 38
                    );

                oArea
                    .getDomRef()
                    .style
                    .setProperty(
                        "--cz-row-height",
                        iSafeHeight +
                        "px"
                    );
            },

            /* =========================================================
               GRÁFICA DE BARRAS
               ========================================================= */

            _configureCharts: function () {
                var oBar =
                    this.byId(
                        "causasZonaBarChart"
                    );

                var oModel =
                    this.getView()
                        .getModel();

                var aTypes =
                    oModel
                        ? oModel.getProperty(
                            "/ResumenTipos"
                        ) || []
                        : [];

                if (oBar) {
                    oBar.setVizProperties({
                        general: {
                            background: {
                                color:
                                    "transparent"
                            }
                        },

                        plotArea: {
                            background: {
                                color:
                                    "transparent"
                            },

                            dataLabel: {
                                visible: true,
                                position:
                                    "outside",

                                style: {
                                    color:
                                        "#26324f",

                                    fontSize:
                                        "10px",

                                    fontWeight:
                                        "bold"
                                }
                            },

                            colorPalette: [
                                "#e31b36",
                                "#f97316",
                                "#f4b400",
                                "#7c3aed",
                                "#10b981"
                            ],

                            gridline: {
                                visible:
                                    false
                            }
                        },

                        valueAxis: {
                            visible:
                                true,

                            title: {
                                visible:
                                    false
                            },

                            label: {
                                visible:
                                    true,

                                style: {
                                    color:
                                        "#7b879b",

                                    fontSize:
                                        "8px"
                                }
                            },

                            axisLine: {
                                visible:
                                    true,

                                color:
                                    "#dfe5ee"
                            }
                        },

                        categoryAxis: {
                            title: {
                                visible:
                                    false
                            },

                            label: {
                                style: {
                                    color:
                                        "#44516a",

                                    fontSize:
                                        "9px"
                                }
                            },

                            axisLine: {
                                visible:
                                    false
                            }
                        },

                        legend: {
                            visible:
                                false
                        },

                        title: {
                            visible:
                                false
                        },

                        interaction: {
                            selectability: {
                                mode:
                                    "NONE"
                            },

                            zoom: {
                                enablement:
                                    "disabled"
                            }
                        }
                    });
                }

                this._renderTypeDonut(
                    aTypes
                );
            },

            /* =========================================================
               DONUT
               ========================================================= */

            _renderTypeDonut: function (aTypes) {
                var oGraphic =
                    this.byId(
                        "causasZonaDonutGraphic"
                    );

                var iTotal =
                    aTypes.reduce(
                        function (
                            iSum,
                            oType
                        ) {
                            return (
                                iSum +
                                Number(
                                    oType.Cantidad ||
                                    0
                                )
                            );
                        },
                        0
                    );

                var iStart = 0;
                var aSegments;

                if (!oGraphic) {
                    return;
                }

                if (!iTotal) {
                    oGraphic.setContent(
                        "<div class='czPureDonut czEmptyDonut'>" +
                            "<div class='czPureDonutHole'></div>" +
                        "</div>"
                    );

                    return;
                }

                aSegments =
                    aTypes.map(
                        function (oType) {
                            var iEnd =
                                iStart +
                                Number(
                                    oType.Cantidad ||
                                    0
                                ) /
                                iTotal *
                                100;

                            var sSegment =
                                typeColor(
                                    oType.Tipo
                                ) +
                                " " +
                                iStart.toFixed(3) +
                                "% " +
                                iEnd.toFixed(3) +
                                "%";

                            iStart =
                                iEnd;

                            return sSegment;
                        }
                    );

                oGraphic.setContent(
                    "<div class='czPureDonut' " +
                    "style='background:conic-gradient(" +
                    aSegments.join(",") +
                    ")'>" +
                        "<div class='czPureDonutHole'></div>" +
                    "</div>"
                );
            },

            /* =========================================================
               REGRESAR
               ========================================================= */

            onNavBack: function () {
                var sPreviousHash =
                    History
                        .getInstance()
                        .getPreviousHash();

                var oRouter =
                    this.getOwnerComponent() &&
                    this.getOwnerComponent()
                        .getRouter();

                if (
                    sPreviousHash !==
                    undefined
                ) {
                    window.history.go(-1);
                } else if (
                    oRouter &&
                    oRouter.getRoute(
                        "RouteMantenimiento"
                    )
                ) {
                    oRouter.navTo(
                        "RouteMantenimiento",
                        {},
                        true
                    );
                }
            }
        }
    );
});