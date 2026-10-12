sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/ActionSheet",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "sap/ui/core/ResizeHandler",
    "mantenimiento/model/AnalisisElevadoresService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    ActionSheet,
    Button,
    MessageToast,
    includeStylesheet,
    ResizeHandler,
    AnalisisElevadoresService,
    InitialLoadPeriod
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisElevadores", {

        onInit: function () {
            includeStylesheet(
                sap.ui.require.toUrl(
                    "mantenimiento/css/AnalisisElevadores.css"
                ) + "?v=20261002-final-auto-table-v1"
            );

            this._iLoadRequest = 0;

            /*
             * Valor inicial.
             * Después del render se calcula automáticamente
             * cuántas filas caben realmente.
             */
            this._iPageSize = 10;
            this._iCurrentPage = 1;

            this._sTextoBusqueda = "";

            this._sResizeHandlerId = null;
            this._iResizeTimer = null;

            this._bPeriodoClickAsignado = false;

            this._oFiltrosAplicados =
                this._getDefaultFilters();

            this._sPeriodoSeleccionado =
                String(
                    this._oFiltrosAplicados.periodo ||
                    "2026"
                );

            var oInitialData =
                AnalisisElevadoresService.createEmpty(
                    this._oFiltrosAplicados
                );

            var oModel =
                new JSONModel(
                    oInitialData
                );

            oModel.setSizeLimit(1000);

            this.getView().setModel(
                oModel,
                "dashboardModel"
            );

            this._inicializarPaginacion();

            this._loadData(false);
        },

        onAfterRendering: function () {
            var oPeriodo =
                this.byId("chipPeriodo");

            if (
                oPeriodo &&
                !this._bPeriodoClickAsignado
            ) {
                oPeriodo.addEventDelegate({
                    onclick: function () {
                        this._abrirMenuPeriodo(
                            oPeriodo
                        );
                    }.bind(this)
                });

                this._bPeriodoClickAsignado = true;
            }

            this._registrarResize();

            this._programarRecalculo();
        },

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

        /* ==========================================================
           FILTROS
           ========================================================== */

        onAplicarFiltros: function () {
            var oSearch =
                this.byId(
                    "searchElevadores"
                );

            this._sTextoBusqueda = "";
            this._iCurrentPage = 1;

            if (oSearch) {
                oSearch.setValue("");
            }

            this._oFiltrosAplicados = {
                periodo:
                    this._sPeriodoSeleccionado ||
                    "2026",

                fechaDesde:
                    "01/01/" +
                    (
                        this._sPeriodoSeleccionado ||
                        "2026"
                    ),

                fechaHasta:
                    "31/12/" +
                    (
                        this._sPeriodoSeleccionado ||
                        "2026"
                    ),

                zona:
                    this.byId(
                        "selectZona"
                    ).getSelectedKey() ||
                    "TODAS",

                supervisor:
                    this.byId(
                        "selectSupervisor"
                    ).getSelectedKey() ||
                    "TODOS",

                tipoOrden:
                    this.byId(
                        "selectTipoOrden"
                    ).getSelectedKey() ||
                    "TODOS"
            };

            this._loadData(true);
        },

        /* ==========================================================
           BÚSQUEDA
           ========================================================== */

        onSearch: function (oEvent) {
            var sValue =
                oEvent.getParameter(
                    "newValue"
                );

            if (
                sValue === undefined ||
                sValue === null
            ) {
                sValue =
                    oEvent.getSource()
                        .getValue();
            }

            this._sTextoBusqueda =
                String(
                    sValue || ""
                ).trim();

            this._iCurrentPage = 1;

            this._actualizarPaginaVisible();

            this._programarRecalculo();
        },

        /* ==========================================================
           PAGINACIÓN
           ========================================================== */

        onPaginaAnterior: function () {
            if (
                this._iCurrentPage <= 1
            ) {
                return;
            }

            this._iCurrentPage -= 1;

            this._actualizarPaginaVisible();
        },

        onPaginaSiguiente: function () {
            var oModel =
                this.getView()
                    .getModel(
                        "dashboardModel"
                    );

            var iTotalPaginas =
                Number(
                    oModel.getProperty(
                        "/paginacion/totalPaginas"
                    )
                ) || 1;

            if (
                this._iCurrentPage >=
                iTotalPaginas
            ) {
                return;
            }

            this._iCurrentPage += 1;

            this._actualizarPaginaVisible();
        },

        /* ==========================================================
           FILTROS PREDETERMINADOS
           ========================================================== */

        _getDefaultFilters: function () {
            var oInitialPeriod =
                InitialLoadPeriod.previousMonth();

            return {
                periodo:
                    oInitialPeriod.year,

                fechaDesde:
                    oInitialPeriod.startDisplay,

                fechaHasta:
                    oInitialPeriod.endDisplay,

                zona:
                    "TODAS",

                supervisor:
                    "TODOS",

                tipoOrden:
                    "TODOS"
            };
        },

        /* ==========================================================
           ODATA
           ========================================================== */

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

        /* ==========================================================
           CARGA DE DATOS
           ========================================================== */

        _loadData: function (bNotify) {
            var oODataModel =
                this._getODataModel();

            var oViewModel =
                this.getView()
                    .getModel(
                        "dashboardModel"
                    );

            var mFilters =
                Object.assign(
                    {},
                    this._oFiltrosAplicados
                );

            var iRequest =
                ++this._iLoadRequest;

            this.getView().setBusy(true);

            AnalisisElevadoresService
                .load(
                    oODataModel,
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

                        oViewModel.setData(
                            oResult.data
                        );

                        this._setFiltersOnControls(
                            oResult.data.filters ||
                            mFilters
                        );

                        this._iCurrentPage = 1;

                        /*
                         * Render inicial.
                         */
                        this._actualizarPaginaVisible();

                        /*
                         * Después se mide el espacio real.
                         */
                        this._programarRecalculo();

                        if (bNotify) {
                            MessageToast.show(
                                "Análisis de elevadores actualizado con datos de SAP"
                            );
                        }
                    }.bind(this)
                )
                .catch(
                    function (oError) {
                        if (
                            iRequest !==
                            this._iLoadRequest
                        ) {
                            return;
                        }

                        oViewModel.setData(
                            AnalisisElevadoresService
                                .createEmpty(
                                    mFilters
                                )
                        );

                        this._setFiltersOnControls(
                            mFilters
                        );

                        this._iCurrentPage = 1;

                        this._actualizarPaginaVisible();

                        this._programarRecalculo();

                        if (bNotify) {
                            MessageToast.show(
                                oError &&
                                oError.message
                                    ? oError.message
                                    : "No fue posible cargar los elevadores"
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

        /* ==========================================================
           CONTROLES DE FILTROS
           ========================================================== */

        _setFiltersOnControls: function (mFilters) {
            mFilters =
                mFilters || {};

            var sPeriod =
                String(
                    mFilters.periodo ||
                    "2026"
                );

            this._sPeriodoSeleccionado =
                sPeriod;

            if (
                this.byId(
                    "textPeriodo"
                )
            ) {
                this.byId(
                    "textPeriodo"
                ).setText(
                    mFilters.periodoTexto ||
                    sPeriod +
                    " (Anual)"
                );
            }

            if (
                this.byId(
                    "selectZona"
                )
            ) {
                this.byId(
                    "selectZona"
                ).setSelectedKey(
                    mFilters.zona ||
                    "TODAS"
                );
            }

            if (
                this.byId(
                    "selectSupervisor"
                )
            ) {
                this.byId(
                    "selectSupervisor"
                ).setSelectedKey(
                    mFilters.supervisor ||
                    "TODOS"
                );
            }

            if (
                this.byId(
                    "selectTipoOrden"
                )
            ) {
                this.byId(
                    "selectTipoOrden"
                ).setSelectedKey(
                    mFilters.tipoOrden ||
                    "TODOS"
                );
            }
        },

        /* ==========================================================
           MENÚ DE PERIODO
           ========================================================== */

        _abrirMenuPeriodo: function (oSource) {
            var oModel =
                this.getView()
                    .getModel(
                        "dashboardModel"
                    );

            var aOpciones =
                oModel.getProperty(
                    "/opcionesPeriodo"
                ) || [];

            var oActionSheet;

            oActionSheet =
                new ActionSheet({
                    title:
                        "Seleccionar periodo",

                    buttons:
                        aOpciones.map(
                            function (oOpcion) {
                                return new Button({
                                    text:
                                        oOpcion.text,

                                    press:
                                        function () {
                                            this._sPeriodoSeleccionado =
                                                String(
                                                    oOpcion.key
                                                );

                                            this.byId(
                                                "textPeriodo"
                                            ).setText(
                                                oOpcion.text
                                            );

                                            oActionSheet.close();
                                        }.bind(this)
                                });
                            }.bind(this)
                        ),

                    afterClose:
                        function () {
                            oActionSheet.destroy();
                        }
                });

            this.getView()
                .addDependent(
                    oActionSheet
                );

            oActionSheet.openBy(
                oSource
            );
        },

        /* ==========================================================
           RESIZE
           ========================================================== */

        _registrarResize: function () {
            var oMainCard =
                this.byId(
                    "mainCard"
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
                        this._programarRecalculo();
                    }.bind(this)
                );
        },

        _programarRecalculo: function () {
            if (this._iResizeTimer) {
                window.clearTimeout(
                    this._iResizeTimer
                );
            }

            this._iResizeTimer =
                window.setTimeout(
                    function () {
                        this._iResizeTimer = null;

                        this._recalcularFilasPorEspacio();
                    }.bind(this),
                    100
                );
        },

        /* ==========================================================
           OBTENER REGISTROS FILTRADOS
           ========================================================== */

        _obtenerElevadoresFiltrados: function () {
            var oModel =
                this.getView()
                    .getModel(
                        "dashboardModel"
                    );

            if (!oModel) {
                return [];
            }

            var aElevadores =
                oModel.getProperty(
                    "/elevadores"
                ) || [];

            var sSearch =
                this._normalizarTexto(
                    this._sTextoBusqueda
                );

            if (!sSearch) {
                return aElevadores.slice();
            }

            return aElevadores.filter(
                function (oElevador) {
                    var sRecord =
                        [
                            oElevador.elevador,
                            oElevador.cliente,
                            oElevador.zona,
                            oElevador.causa,
                            oElevador.estado
                        ].join(" ");

                    return (
                        this._normalizarTexto(
                            sRecord
                        ).indexOf(
                            sSearch
                        ) >= 0
                    );
                }.bind(this)
            );
        },

        /* ==========================================================
           CALCULAR FILAS SEGÚN ESPACIO DISPONIBLE
           ========================================================== */

        _recalcularFilasPorEspacio: function () {
            var oWrapper =
                this.byId(
                    "tableWrapper"
                );

            var oTable =
                this.byId(
                    "elevatorsTable"
                );

            var oModel =
                this.getView()
                    .getModel(
                        "dashboardModel"
                    );

            if (
                !oWrapper ||
                !oTable ||
                !oModel ||
                !oWrapper.getDomRef()
            ) {
                return;
            }

            var oWrapperDom =
                oWrapper.getDomRef();

            var iWrapperHeight =
                Math.floor(
                    oWrapperDom.clientHeight
                );

            if (
                !iWrapperHeight ||
                iWrapperHeight <= 0
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

            /*
             * Altura mínima legible.
             */
            var iMinRowHeight =
                window.innerHeight <= 720
                    ? 31
                    : 35;

            /*
             * Altura reservada por la paginación
             * cuando ésta sea necesaria.
             */
            var iFooterHeight =
                window.innerHeight <= 720
                    ? 31
                    : 34;

            var bFooterVisible =
                Boolean(
                    oModel.getProperty(
                        "/paginacion/visible"
                    )
                );

            /*
             * Si actualmente hay footer visible,
             * sumamos su alto para conocer cuánto
             * espacio tendría la tabla sin footer.
             */
            var iAvailableWithoutFooter =
                iWrapperHeight +
                (
                    bFooterVisible
                        ? iFooterHeight
                        : 0
                );

            var iRowsAreaWithoutFooter =
                Math.max(
                    0,
                    iAvailableWithoutFooter -
                    iHeaderHeight -
                    2
                );

            var aFiltered =
                this._obtenerElevadoresFiltrados();

            var iTotal =
                aFiltered.length;

            var iCapacityWithoutFooter =
                Math.max(
                    1,
                    Math.floor(
                        iRowsAreaWithoutFooter /
                        iMinRowHeight
                    )
                );

            var iNuevoPageSize;
            var iRowHeight;

            /*
             * CASO A:
             * Todos los registros caben.
             *
             * Ejemplo actual:
             * SAP devuelve 10 elevadores y los 10 caben.
             * No necesitamos paginación.
             */
            if (
                iTotal > 0 &&
                iTotal <=
                iCapacityWithoutFooter
            ) {
                iNuevoPageSize =
                    iTotal;

                /*
                 * Repartimos el espacio entre las filas.
                 */
                iRowHeight =
                    Math.floor(
                        iRowsAreaWithoutFooter /
                        iTotal
                    );

                /*
                 * Evitamos filas demasiado pequeñas
                 * o exageradamente grandes.
                 */
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
                 * CASO B:
                 * Hay más registros de los que caben.
                 * Reservamos el pie para paginación.
                 */

                var iAvailableWithFooter =
                    iAvailableWithoutFooter -
                    iFooterHeight;

                var iRowsAreaWithFooter =
                    Math.max(
                        0,
                        iAvailableWithFooter -
                        iHeaderHeight -
                        2
                    );

                iNuevoPageSize =
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
                        iNuevoPageSize
                    );

                iRowHeight =
                    Math.max(
                        iMinRowHeight,
                        Math.min(
                            46,
                            iRowHeight
                        )
                    );
            }

            /*
             * Sin registros.
             */
            if (iTotal === 0) {
                iNuevoPageSize = 1;
                iRowHeight = iMinRowHeight;
            }

            this._aplicarAlturaFilas(
                iRowHeight
            );

            if (
                this._iPageSize !==
                iNuevoPageSize
            ) {
                this._iPageSize =
                    iNuevoPageSize;

                this._iCurrentPage = 1;
            }

            this._actualizarPaginaVisible();
        },

        /* ==========================================================
           ALTURA DINÁMICA DE FILAS
           ========================================================== */

        _aplicarAlturaFilas: function (iHeight) {
            var oWrapper =
                this.byId(
                    "tableWrapper"
                );

            if (
                !oWrapper ||
                !oWrapper.getDomRef()
            ) {
                return;
            }

            var iSafeHeight =
                Math.max(
                    30,
                    Number(
                        iHeight
                    ) || 35
                );

            oWrapper
                .getDomRef()
                .style
                .setProperty(
                    "--ae-row-height",
                    iSafeHeight +
                    "px"
                );
        },

        /* ==========================================================
           PAGINACIÓN INICIAL
           ========================================================== */

        _inicializarPaginacion: function () {
            var oModel =
                this.getView()
                    .getModel(
                        "dashboardModel"
                    );

            if (!oModel) {
                return;
            }

            oModel.setProperty(
                "/elevadoresVisibles",
                []
            );

            oModel.setProperty(
                "/paginacion",
                {
                    texto:
                        "0 de 0",

                    paginaTexto:
                        "Página 1 de 1",

                    paginaActual:
                        1,

                    totalPaginas:
                        1,

                    totalRegistros:
                        0,

                    visible:
                        false,

                    tieneAnterior:
                        false,

                    tieneSiguiente:
                        false
                }
            );
        },

        /* ==========================================================
           ACTUALIZAR REGISTROS VISIBLES
           ========================================================== */

        _actualizarPaginaVisible: function () {
            var oModel =
                this.getView()
                    .getModel(
                        "dashboardModel"
                    );

            if (!oModel) {
                return;
            }

            var aFiltered =
                this._obtenerElevadoresFiltrados();

            var iTotal =
                aFiltered.length;

            var iPageSize =
                Math.max(
                    1,
                    Number(
                        this._iPageSize
                    ) || 1
                );

            var iTotalPaginas =
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
                        iTotalPaginas
                    )
                );

            var iInicio =
                (
                    this._iCurrentPage -
                    1
                ) *
                iPageSize;

            var iFin =
                Math.min(
                    iInicio +
                    iPageSize,
                    iTotal
                );

            var aVisible =
                aFiltered.slice(
                    iInicio,
                    iFin
                );

            var sTexto =
                iTotal
                    ? (
                        iInicio + 1
                    ) +
                    "–" +
                    iFin +
                    " de " +
                    iTotal
                    : "0 de 0";

            oModel.setProperty(
                "/elevadoresVisibles",
                aVisible
            );

            oModel.setProperty(
                "/paginacion/texto",
                sTexto
            );

            oModel.setProperty(
                "/paginacion/paginaActual",
                this._iCurrentPage
            );

            oModel.setProperty(
                "/paginacion/totalPaginas",
                iTotalPaginas
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
                iTotalPaginas
            );

            /*
             * IMPORTANTE:
             * No mostramos "Página 1 de 1".
             */
            oModel.setProperty(
                "/paginacion/visible",
                iTotalPaginas > 1
            );

            oModel.setProperty(
                "/paginacion/tieneAnterior",
                this._iCurrentPage > 1
            );

            oModel.setProperty(
                "/paginacion/tieneSiguiente",
                this._iCurrentPage <
                iTotalPaginas
            );
        },

        /* ==========================================================
           TEXTO
           ========================================================== */

        _normalizarTexto: function (vValue) {
            var sText =
                String(
                    vValue || ""
                ).toLowerCase();

            return sText.normalize
                ? sText
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                : sText;
        },

        /* ==========================================================
           FORMATTER
           ========================================================== */

        formatEstadoTexto: function (sEstado) {
            return (
                sEstado ||
                "Sin clasificar"
            );
        }
    });
});