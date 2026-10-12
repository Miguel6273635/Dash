sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/dom/includeStylesheet",
    "sap/ui/core/ResizeHandler",
    "mantenimiento/model/ComportamientoOperativoService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    MessageToast,
    Fragment,
    includeStylesheet,
    ResizeHandler,
    Service,
    InitialLoadPeriod
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.ComportamientoOperativo",
        {

            /* =========================================================
               INIT
               ========================================================= */

            onInit: function () {
                var oModel;
                var oInitialPeriod;
                var oInitialData;

                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/ComportamientoOperativo.css"
                    ) + "?v=20261002-unified-v1"
                );

                oInitialPeriod =
                    InitialLoadPeriod.previousMonth();

                this._request = 0;

                this._origin = "TODAS";

                this._iCurrentPage = 1;

                /*
                 * Se recalcula automáticamente después del render.
                 */
                this._iPageSize = 7;

                this._aResponsablesFull = [];

                this._sResizeHandlerId = null;
                this._iResizeTimer = null;

                this._filters = {
                    periodo:
                        oInitialPeriod.year +
                        "-ANUAL",

                    fechaDesde:
                        oInitialPeriod.startDisplay,

                    fechaHasta:
                        oInitialPeriod.endDisplay,

                    zona:
                        "TODAS",

                    origen:
                        "TODAS"
                };

                oInitialData =
                    Service.createEmpty(
                        this._filters
                    );

                oModel =
                    new JSONModel(
                        oInitialData
                    );

                oModel.setSizeLimit(1000);

                this.getView().setModel(
                    oModel,
                    "data"
                );

                this._initializePagination();

                this._load(false);
            },

            /* =========================================================
               AFTER RENDERING
               ========================================================= */

            onAfterRendering: function () {
                this._registerResize();

                this._scheduleTableLayout();
            },

            /* =========================================================
               CAMBIO DE PERIODO
               ========================================================= */

            onPeriodoChange: function (oEvent) {
                var sKey =
                    oEvent.getSource()
                        .getSelectedKey() ||
                    "2026-ANUAL";

                var oContext =
                    Service.getFilterContext({
                        periodo: sKey
                    });

                var oModel =
                    this.getView()
                        .getModel("data");

                if (
                    oContext.startDate &&
                    oContext.endDate
                ) {
                    oModel.setProperty(
                        "/filtros/fechaDesde",
                        this._date(
                            oContext.startDate
                        )
                    );

                    oModel.setProperty(
                        "/filtros/fechaHasta",
                        this._date(
                            oContext.endDate
                        )
                    );
                }
            },

            /* =========================================================
               APLICAR FILTROS
               ========================================================= */

            onApplyFilters: function () {
                var oModel =
                    this.getView()
                        .getModel("data");

                this._filters = {
                    periodo:
                        this.byId(
                            "coPeriod"
                        ).getSelectedKey() ||
                        "2026-ANUAL",

                    fechaDesde:
                        oModel.getProperty(
                            "/filtros/fechaDesde"
                        ),

                    fechaHasta:
                        oModel.getProperty(
                            "/filtros/fechaHasta"
                        ),

                    zona:
                        this.byId(
                            "coZone"
                        ).getSelectedKey() ||
                        "TODAS",

                    origen:
                        this._origin
                };

                this._iCurrentPage = 1;

                this._load(true);
            },

            /* =========================================================
               TABS DE ORIGEN
               ========================================================= */

            onOriginTabPress: function (oEvent) {
                this._origin =
                    oEvent.getSource()
                        .data("origin") ||
                    "TODAS";

                this.byId(
                    "coOrigin"
                ).setSelectedKey(
                    this._origin
                );

                this._iCurrentPage = 1;

                this._rebuild();

                this._paintTabs();
            },

            /* =========================================================
               SELECT DE ORIGEN
               ========================================================= */

            onOriginSelectChange: function (oEvent) {
                this._origin =
                    oEvent.getSource()
                        .getSelectedKey() ||
                    "TODAS";

                this._iCurrentPage = 1;

                this._rebuild();

                this._paintTabs();
            },

            /* =========================================================
               RESPONSABLE
               ========================================================= */

            onResponsablePress: function (oEvent) {
                var oSource =
                    oEvent.getSource();

                var oContext =
                    oSource.getBindingContext(
                        "data"
                    );

                var oView =
                    this.getView();

                if (!oContext) {
                    return;
                }

                if (!this._popover) {
                    this._popover =
                        Fragment.load({
                            id:
                                oView.getId(),

                            name:
                                "mantenimiento.view.ResponsablePopover",

                            controller:
                                this
                        }).then(
                            function (oPopover) {
                                oView.addDependent(
                                    oPopover
                                );

                                return oPopover;
                            }
                        );
                }

                this._popover.then(
                    function (oPopover) {
                        oPopover.setModel(
                            new JSONModel(
                                oContext.getObject()
                            ),
                            "popover"
                        );

                        oPopover.openBy(
                            oSource
                        );
                    }
                );
            },

            /* =========================================================
               DETALLE RESPONSABLE
               ========================================================= */

            onVerDetalleResponsable: function () {
                var oPopover =
                    this.byId(
                        "responsablePopover"
                    );

                var oData =
                    oPopover &&
                    oPopover.getModel(
                        "popover"
                    ).getData();

                var oComponent =
                    this.getOwnerComponent();

                var oFilters =
                    this.getView()
                        .getModel("data")
                        .getProperty(
                            "/filtros"
                        ) || {};

                if (oPopover) {
                    oPopover.close();
                }

                if (!oData) {
                    MessageToast.show(
                        "Detalle no disponible"
                    );

                    return;
                }

                oComponent.setModel(
                    new JSONModel({
                        responsableId:
                            oData.responsableId,

                        periodKey:
                            oFilters.periodo ||
                            "2026-ANUAL",

                        zona:
                            oFilters.zona ||
                            "TODAS",

                        origen:
                            oFilters.origen ||
                            this._origin ||
                            "TODAS"
                    }),
                    "detalleResponsableNavigation"
                );

                MessageToast.show(
                    "Contexto preparado para el detalle de " +
                    oData.responsable
                );
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

                this._updateVisibleRows();
            },

            onNextPage: function () {
                var oModel =
                    this.getView()
                        .getModel("data");

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

                this._updateVisibleRows();
            },

            /* =========================================================
               LOAD
               ========================================================= */

            _load: function (bNotify) {
                var iRequest =
                    ++this._request;

                var oModel =
                    this.getView()
                        .getModel("data");

                var oFilters =
                    Object.assign(
                        {},
                        this._filters,
                        {
                            origen:
                                this._origin
                        }
                    );

                this.getView()
                    .setBusy(true);

                Service.load(
                    this._odata(),
                    oFilters
                ).then(
                    function (oResult) {
                        if (
                            iRequest !==
                            this._request
                        ) {
                            return;
                        }

                        this._raw =
                            oResult.rawData;

                        oModel.setData(
                            oResult.data
                        );

                        this._setControls(
                            oResult.data.filtros
                        );

                        this._setFullResponsables(
                            oModel.getProperty(
                                "/responsables"
                            ) || []
                        );

                        this._iCurrentPage = 1;

                        this._updateVisibleRows();

                        this._paintTabs();

                        this._scheduleTableLayout();

                        if (bNotify) {
                            MessageToast.show(
                                "Comportamiento operativo actualizado con datos de SAP"
                            );
                        }
                    }.bind(this)
                ).catch(
                    function (oError) {
                        var oEmpty;

                        if (
                            iRequest !==
                            this._request
                        ) {
                            return;
                        }

                        oEmpty =
                            Service.createEmpty(
                                oFilters
                            );

                        oModel.setData(
                            oEmpty
                        );

                        this._setControls(
                            oFilters
                        );

                        this._setFullResponsables(
                            []
                        );

                        this._iCurrentPage = 1;

                        this._updateVisibleRows();

                        this._paintTabs();

                        if (bNotify) {
                            MessageToast.show(
                                oError &&
                                oError.message
                                    ? oError.message
                                    : "No fue posible cargar los responsables"
                            );
                        }
                    }.bind(this)
                ).finally(
                    function () {
                        if (
                            iRequest ===
                            this._request
                        ) {
                            this.getView()
                                .setBusy(false);
                        }
                    }.bind(this)
                );
            },

            /* =========================================================
               REBUILD POR ORIGEN
               ========================================================= */

            _rebuild: function () {
                var oModel =
                    this.getView()
                        .getModel("data");

                var oFilters;

                var oData;

                if (!this._raw) {
                    return;
                }

                oFilters =
                    Object.assign(
                        {},
                        this._filters,
                        {
                            origen:
                                this._origin
                        }
                    );

                oData =
                    Service.build(
                        this._raw,
                        oFilters
                    );

                oModel.setData(
                    oData
                );

                this._setControls(
                    oModel.getProperty(
                        "/filtros"
                    )
                );

                this._setFullResponsables(
                    oModel.getProperty(
                        "/responsables"
                    ) || []
                );

                this._iCurrentPage = 1;

                this._updateVisibleRows();

                this._scheduleTableLayout();
            },

            /* =========================================================
               RESPONSABLES COMPLETOS
               ========================================================= */

            _setFullResponsables: function (aResponsables) {
                this._aResponsablesFull =
                    Array.isArray(
                        aResponsables
                    )
                        ? aResponsables.slice()
                        : [];
            },

            /* =========================================================
               PAGINACIÓN INICIAL
               ========================================================= */

            _initializePagination: function () {
                var oModel =
                    this.getView()
                        .getModel("data");

                if (!oModel) {
                    return;
                }

                oModel.setProperty(
                    "/responsablesVisibles",
                    []
                );

                oModel.setProperty(
                    "/paginacion",
                    {
                        paginaActual:
                            1,

                        totalPaginas:
                            1,

                        inicio:
                            0,

                        fin:
                            0,

                        totalRegistros:
                            0,

                        paginaTexto:
                            "Página 1 de 1",

                        visible:
                            false,

                        tieneAnterior:
                            false,

                        tieneSiguiente:
                            false
                    }
                );
            },

            /* =========================================================
               ACTUALIZAR FILAS VISIBLES
               ========================================================= */

            _updateVisibleRows: function () {
                var oModel =
                    this.getView()
                        .getModel("data");

                if (!oModel) {
                    return;
                }

                var aResponsables =
                    this._aResponsablesFull ||
                    [];

                var iTotal =
                    aResponsables.length;

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

                oModel.setProperty(
                    "/responsablesVisibles",
                    aResponsables.slice(
                        iStart,
                        iEnd
                    )
                );

                oModel.setProperty(
                    "/paginacion/paginaActual",
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
                 * Sólo aparece cuando realmente hay
                 * más de una página.
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
                var oMainCard =
                    this.byId(
                        "coMainCard"
                    );

                if (
                    !oMainCard ||
                    this._sResizeHandlerId
                ) {
                    return;
                }

                this._sResizeHandlerId =
                    ResizeHandler.register(
                        oMainCard,
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

                            this._recalculateRows();
                        }.bind(this),
                        100
                    );
            },

            /* =========================================================
               CALCULAR CUÁNTAS FILAS CABEN
               ========================================================= */

            _recalculateRows: function () {
                var oArea =
                    this.byId(
                        "coTableArea"
                    );

                var oTable =
                    this.byId(
                        "idResponsablesTable"
                    );

                var oModel =
                    this.getView()
                        .getModel("data");

                if (
                    !oArea ||
                    !oTable ||
                    !oModel ||
                    !oArea.getDomRef()
                ) {
                    return;
                }

                var iAreaHeight =
                    Math.floor(
                        oArea.getDomRef()
                            .clientHeight
                    );

                if (
                    !iAreaHeight ||
                    iAreaHeight <= 0
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
                        : 34;

                if (
                    !Number.isFinite(
                        iHeaderHeight
                    ) ||
                    iHeaderHeight < 20
                ) {
                    iHeaderHeight = 34;
                }

                /*
                 * Altura mínima para que avatar,
                 * causa, porcentaje y riesgo sigan
                 * siendo legibles.
                 */
                var iMinRowHeight =
                    window.innerHeight <= 720
                        ? 46
                        : 50;

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
                 * Recuperamos el espacio que ocuparía
                 * el footer si actualmente está visible.
                 */
                var iWithoutFooter =
                    iAreaHeight +
                    (
                        bFooterVisible
                            ? iFooterHeight
                            : 0
                    );

                var iRowsWithoutFooter =
                    Math.max(
                        0,
                        iWithoutFooter -
                        iHeaderHeight -
                        2
                    );

                var iTotal =
                    this._aResponsablesFull.length;

                var iCapacity =
                    Math.max(
                        1,
                        Math.floor(
                            iRowsWithoutFooter /
                            iMinRowHeight
                        )
                    );

                var iNewPageSize;
                var iRowHeight;

                /*
                 * Todos caben:
                 * se distribuye el espacio disponible.
                 */
                if (
                    iTotal > 0 &&
                    iTotal <= iCapacity
                ) {
                    iNewPageSize =
                        iTotal;

                    iRowHeight =
                        Math.floor(
                            iRowsWithoutFooter /
                            iTotal
                        );

                    iRowHeight =
                        Math.max(
                            iMinRowHeight,
                            Math.min(
                                66,
                                iRowHeight
                            )
                        );
                } else {

                    /*
                     * Existen más registros:
                     * reservamos espacio para paginación.
                     */
                    var iWithFooter =
                        iWithoutFooter -
                        iFooterHeight;

                    var iRowsWithFooter =
                        Math.max(
                            0,
                            iWithFooter -
                            iHeaderHeight -
                            2
                        );

                    iNewPageSize =
                        Math.max(
                            1,
                            Math.floor(
                                iRowsWithFooter /
                                iMinRowHeight
                            )
                        );

                    iRowHeight =
                        Math.floor(
                            iRowsWithFooter /
                            iNewPageSize
                        );

                    iRowHeight =
                        Math.max(
                            iMinRowHeight,
                            Math.min(
                                58,
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

                if (
                    this._iPageSize !==
                    iNewPageSize
                ) {
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

                this._updateVisibleRows();

                var bNewFooter =
                    Boolean(
                        oModel.getProperty(
                            "/paginacion/visible"
                        )
                    );

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
               ALTURA DINÁMICA
               ========================================================= */

            _applyRowHeight: function (iHeight) {
                var oArea =
                    this.byId(
                        "coTableArea"
                    );

                if (
                    !oArea ||
                    !oArea.getDomRef()
                ) {
                    return;
                }

                var iSafeHeight =
                    Math.max(
                        44,
                        Number(
                            iHeight
                        ) || 50
                    );

                oArea
                    .getDomRef()
                    .style
                    .setProperty(
                        "--co-row-height",
                        iSafeHeight +
                        "px"
                    );
            },

            /* =========================================================
               ODATA
               ========================================================= */

            _odata: function () {
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
               CONTROLES
               ========================================================= */

            _setControls: function (oFilters) {
                oFilters =
                    oFilters || {};

                if (
                    this.byId(
                        "coPeriod"
                    )
                ) {
                    this.byId(
                        "coPeriod"
                    ).setSelectedKey(
                        oFilters.periodo ||
                        "2026-ANUAL"
                    );
                }

                if (
                    this.byId(
                        "coZone"
                    )
                ) {
                    this.byId(
                        "coZone"
                    ).setSelectedKey(
                        oFilters.zona ||
                        "TODAS"
                    );
                }

                if (
                    this.byId(
                        "coOrigin"
                    )
                ) {
                    this.byId(
                        "coOrigin"
                    ).setSelectedKey(
                        this._origin
                    );
                }
            },

            /* =========================================================
               PINTAR TABS
               ========================================================= */

            _paintTabs: function () {
                [
                    "Todas",
                    "Internas",
                    "Externas",
                    "Justificadas"
                ].forEach(
                    function (sId) {
                        var oButton =
                            this.byId(
                                "coTab" +
                                sId
                            );

                        var sOrigin =
                            oButton &&
                            oButton.data(
                                "origin"
                            );

                        if (!oButton) {
                            return;
                        }

                        oButton.toggleStyleClass(
                            "coTabButtonActive",
                            sOrigin ===
                            this._origin
                        );

                        oButton.setType(
                            sOrigin ===
                            this._origin
                                ? "Emphasized"
                                : "Transparent"
                        );
                    }.bind(this)
                );
            },

            /* =========================================================
               FECHA
               ========================================================= */

            _date: function (oDate) {
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
               AVATAR
               ========================================================= */

            getAvatarColor: function (vValue) {
                var iValue =
                    String(
                        vValue || ""
                    )
                        .split("")
                        .reduce(
                            function (
                                iSum,
                                sChar
                            ) {
                                return (
                                    iSum +
                                    sChar.charCodeAt(
                                        0
                                    )
                                );
                            },
                            0
                        );

                return (
                    "Accent" +
                    (
                        iValue % 10 +
                        1
                    )
                );
            },

            /* =========================================================
               EXIT
               ========================================================= */

            onExit: function () {
                if (
                    this._sResizeHandlerId
                ) {
                    ResizeHandler.deregister(
                        this._sResizeHandlerId
                    );

                    this._sResizeHandlerId =
                        null;
                }

                if (
                    this._iResizeTimer
                ) {
                    window.clearTimeout(
                        this._iResizeTimer
                    );

                    this._iResizeTimer =
                        null;
                }

                if (this._popover) {
                    this._popover.then(
                        function (oPopover) {
                            oPopover.destroy();
                        }
                    );
                }
            }
        }
    );
});