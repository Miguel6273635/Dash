sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/PreventivasEjecutadasService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    MessageToast,
    PreventivasEjecutadasService,
    InitialLoadPeriod
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisOTPreventivasEjecutadas",
        {
            onInit: function () {
                var oInitialData =
                    PreventivasEjecutadasService.createEmpty(
                        this._getDefaultFilters(),
                        "EJECUTADAS"
                    );

                var oModel =
                    new JSONModel(oInitialData);

                this._iLoadRequest = 0;
                this._oRawData = null;

                this._aAllResponsables = [];
                this._aFilteredResponsables = [];
                this._aPages = [[]];

                this._iRowsPerPage = 8;

                this._iResizeTimer = null;
                this._iPaginationTimer = null;

                this._fnWindowResize =
                    this._onWindowResize.bind(this);

                oModel.setSizeLimit(1000);

                this.getView().setModel(
                    oModel,
                    "otpe"
                );

                this._setAllResponsables(
                    oInitialData.responsables
                );

                window.addEventListener(
                    "resize",
                    this._fnWindowResize
                );

                this._loadData(false);
            },

            onAfterRendering: function () {
                this._schedulePaginationCalculation();
            },

            onExit: function () {
                if (this._fnWindowResize) {
                    window.removeEventListener(
                        "resize",
                        this._fnWindowResize
                    );

                    this._fnWindowResize = null;
                }

                if (this._iResizeTimer) {
                    window.clearTimeout(
                        this._iResizeTimer
                    );

                    this._iResizeTimer = null;
                }

                if (this._iPaginationTimer) {
                    window.clearTimeout(
                        this._iPaginationTimer
                    );

                    this._iPaginationTimer = null;
                }
            },

            /* ==========================================================
               FILTROS
               ========================================================== */

            onApplyFilters: function () {
                this._loadData(true);
            },

            onPeriodoChange: function (oEvent) {
                var sKey =
                    String(
                        oEvent
                            .getSource()
                            .getSelectedKey() || ""
                    );

                var oModel =
                    this.getView()
                        .getModel("otpe");

                var aAnnualMatch =
                    sKey.match(
                        /^(\d{4})$/
                    );

                var aMonthlyMatch =
                    sKey.match(
                        /^(\d{4})-(\d{2})$/
                    );

                var iYear;
                var iMonth;
                var iLastDay;

                if (aAnnualMatch) {
                    iYear =
                        Number(
                            aAnnualMatch[1]
                        );

                    oModel.setProperty(
                        "/filters/fechaDesde",
                        "01/01/" + iYear
                    );

                    oModel.setProperty(
                        "/filters/fechaHasta",
                        "31/12/" + iYear
                    );

                    return;
                }

                if (aMonthlyMatch) {
                    iYear =
                        Number(
                            aMonthlyMatch[1]
                        );

                    iMonth =
                        Number(
                            aMonthlyMatch[2]
                        );

                    iLastDay =
                        new Date(
                            iYear,
                            iMonth,
                            0
                        ).getDate();

                    oModel.setProperty(
                        "/filters/fechaDesde",
                        "01/" +
                        String(iMonth).padStart(
                            2,
                            "0"
                        ) +
                        "/" +
                        iYear
                    );

                    oModel.setProperty(
                        "/filters/fechaHasta",
                        String(iLastDay).padStart(
                            2,
                            "0"
                        ) +
                        "/" +
                        String(iMonth).padStart(
                            2,
                            "0"
                        ) +
                        "/" +
                        iYear
                    );
                }
            },

            /* ==========================================================
               SELECTOR DE ANÁLISIS
               ========================================================== */

            onSelectNoEjecutadas: function () {
                this._setAnalysisView(
                    "NO_EJECUTADAS"
                );
            },

            onSelectEjecutadas: function () {
                this._setAnalysisView(
                    "EJECUTADAS"
                );
            },

            onSelectTodas: function () {
                this._setAnalysisView(
                    "TODAS"
                );
            },

            /* ==========================================================
               BUSCADOR
               ========================================================== */

            onSearchResponsable: function (oEvent) {
                var sValue =
                    oEvent.getParameter("newValue") ||
                    oEvent.getParameter("query") ||
                    oEvent.getParameter("value") ||
                    "";

                var sSearch =
                    this._normalizeText(
                        sValue
                    );

                var aResponsables =
                    this._clone(
                        this._aAllResponsables || []
                    );

                if (sSearch) {
                    aResponsables =
                        aResponsables.filter(
                            function (oResponsable) {
                                return this
                                    ._normalizeText(
                                        oResponsable.nombre
                                    )
                                    .indexOf(
                                        sSearch
                                    ) !== -1;
                            }.bind(this)
                        );
                }

                this._aFilteredResponsables =
                    aResponsables;

                this._buildPagination(1);
            },

            /* ==========================================================
               EXPANDIR RESPONSABLE
               SOLO UNO ABIERTO A LA VEZ
               ========================================================== */

            onToggleResponsable: function (oEvent) {
                var oContext =
                    oEvent
                        .getSource()
                        .getBindingContext(
                            "otpe"
                        );

                var oCurrent;
                var iSourceIndex;
                var bExpanded;
                var i;
                var iCurrentPage;

                if (!oContext) {
                    return;
                }

                oCurrent =
                    oContext.getObject();

                iSourceIndex =
                    oCurrent._sourceIndex;

                bExpanded =
                    !Boolean(
                        oCurrent.expanded
                    );

                /*
                 * Cerramos todos.
                 */
                for (
                    i = 0;
                    i < this._aAllResponsables.length;
                    i++
                ) {
                    this._aAllResponsables[i]
                        .expanded = false;
                }

                for (
                    i = 0;
                    i < this._aFilteredResponsables.length;
                    i++
                ) {
                    this._aFilteredResponsables[i]
                        .expanded = false;
                }

                /*
                 * Abrimos únicamente el seleccionado.
                 */
                if (bExpanded) {
                    for (
                        i = 0;
                        i < this._aAllResponsables.length;
                        i++
                    ) {
                        if (
                            this._aAllResponsables[i]
                                ._sourceIndex ===
                            iSourceIndex
                        ) {
                            this._aAllResponsables[i]
                                .expanded = true;

                            break;
                        }
                    }

                    for (
                        i = 0;
                        i < this._aFilteredResponsables.length;
                        i++
                    ) {
                        if (
                            this._aFilteredResponsables[i]
                                ._sourceIndex ===
                            iSourceIndex
                        ) {
                            this._aFilteredResponsables[i]
                                .expanded = true;

                            break;
                        }
                    }
                }

                iCurrentPage =
                    Number(
                        this.getView()
                            .getModel("otpe")
                            .getProperty(
                                "/pagination/page"
                            )
                    ) || 1;

                this._buildPagination(
                    iCurrentPage
                );
            },

            /* ==========================================================
               PAGINACIÓN
               ========================================================== */

            onPreviousPage: function () {
                var oModel =
                    this.getView()
                        .getModel("otpe");

                var iPage =
                    Number(
                        oModel.getProperty(
                            "/pagination/page"
                        )
                    ) || 1;

                if (iPage > 1) {
                    this._showPage(
                        iPage - 1
                    );
                }
            },

            onNextPage: function () {
                var oModel =
                    this.getView()
                        .getModel("otpe");

                var iPage =
                    Number(
                        oModel.getProperty(
                            "/pagination/page"
                        )
                    ) || 1;

                var iTotalPages =
                    Number(
                        oModel.getProperty(
                            "/pagination/totalPages"
                        )
                    ) || 1;

                if (
                    iPage <
                    iTotalPages
                ) {
                    this._showPage(
                        iPage + 1
                    );
                }
            },

            /* ==========================================================
               CAMBIO DE ANÁLISIS
               ========================================================== */

            _setAnalysisView: function (sAnalysis) {
                var oModel =
                    this.getView()
                        .getModel("otpe");

                var oData;

                if (!this._oRawData) {
                    oModel.setProperty(
                        "/ui/selectedAnalysis",
                        sAnalysis
                    );

                    return;
                }

                oData =
                    PreventivasEjecutadasService.build(
                        this._oRawData,
                        this._getFilters(),
                        sAnalysis
                    );

                this._applyData(
                    oData
                );
            },

            /* ==========================================================
               CARGA
               ========================================================== */

            _loadData: function (bNotify) {
                var oODataModel =
                    this._getODataModel();

                var oViewModel =
                    this.getView()
                        .getModel("otpe");

                var mFilters =
                    this._getFilters();

                var sAnalysis =
                    oViewModel.getProperty(
                        "/ui/selectedAnalysis"
                    ) ||
                    "EJECUTADAS";

                var iRequest =
                    ++this._iLoadRequest;

                this.getView()
                    .setBusy(true);

                PreventivasEjecutadasService
                    .load(
                        oODataModel,
                        mFilters,
                        sAnalysis
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

                            this._applyData(
                                oResult.data
                            );

                            if (bNotify) {
                                MessageToast.show(
                                    "Análisis de OT Preventivas ejecutadas actualizado con datos de SAP"
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

                            this._onLoadError(
                                oError,
                                bNotify
                            );
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

            _applyData: function (oData) {
                var oModel =
                    this.getView()
                        .getModel("otpe");

                oModel.setData(
                    oData
                );

                this._setAllResponsables(
                    oData.responsables
                );

                this._schedulePaginationCalculation();
            },

            _onLoadError: function (
                oError,
                bNotify
            ) {
                var oModel =
                    this.getView()
                        .getModel("otpe");

                var sMessage =
                    oError &&
                    oError.message ||
                    "No fue posible consultar SAP";

                if (!this._oRawData) {
                    this._applyData(
                        PreventivasEjecutadasService
                            .createEmpty(
                                this._getFilters(),
                                oModel.getProperty(
                                    "/ui/selectedAnalysis"
                                ) ||
                                "EJECUTADAS"
                            )
                    );
                }

                if (
                    window.console &&
                    window.console.error
                ) {
                    window.console.error(
                        "Error al consultar el OData de OT Preventivas ejecutadas",
                        oError
                    );
                }

                if (bNotify) {
                    MessageToast.show(
                        sMessage
                    );
                }
            },

            /* ==========================================================
               ODATA / FILTROS
               ========================================================== */

            _getODataModel: function () {
                var oComponent =
                    this.getOwnerComponent &&
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

            _getFilters: function () {
                var mFilters =
                    this.getView()
                        .getModel("otpe")
                        .getProperty(
                            "/filters"
                        ) || {};

                return {
                    periodo:
                        mFilters.periodo,

                    fechaDesde:
                        mFilters.fechaDesde,

                    fechaHasta:
                        mFilters.fechaHasta,

                    zona:
                        mFilters.zona,

                    cliente:
                        mFilters.cliente,

                    responsable:
                        mFilters.responsable
                };
            },

            _getDefaultFilters: function () {
                var initialPeriod =
                    InitialLoadPeriod
                        .previousMonth();

                return {
                    periodo:
                        initialPeriod.year,

                    fechaDesde:
                        initialPeriod.startDisplay,

                    fechaHasta:
                        initialPeriod.endDisplay,

                    zona:
                        "TODAS",

                    cliente:
                        "TODOS",

                    responsable:
                        "TODOS"
                };
            },

            /* ==========================================================
               RESPONSABLES
               ========================================================== */

            _setAllResponsables: function (
                aResponsables
            ) {
                var aData =
                    this._clone(
                        aResponsables || []
                    );

                aData.forEach(
                    function (
                        oResponsable,
                        iIndex
                    ) {
                        oResponsable._sourceIndex =
                            iIndex;

                        oResponsable.expanded =
                            Boolean(
                                oResponsable.expanded
                            );
                    }
                );

                this._aAllResponsables =
                    aData;

                this._aFilteredResponsables =
                    this._clone(
                        aData
                    );

                this._buildPagination(1);
            },

            /* ==========================================================
               RESPONSIVE
               ========================================================== */

            _onWindowResize: function () {
                if (this._iResizeTimer) {
                    window.clearTimeout(
                        this._iResizeTimer
                    );
                }

                this._iResizeTimer =
                    window.setTimeout(
                        function () {
                            this._calculatePageCapacity();

                            this._iResizeTimer =
                                null;
                        }.bind(this),
                        120
                    );
            },

            _schedulePaginationCalculation:
                function () {
                    if (this._iPaginationTimer) {
                        window.clearTimeout(
                            this._iPaginationTimer
                        );
                    }

                    this._iPaginationTimer =
                        window.setTimeout(
                            function () {
                                this._calculatePageCapacity();

                                this._iPaginationTimer =
                                    null;
                            }.bind(this),
                            120
                        );
                },

            /*
             * Calcula cuántas filas visuales
             * caben realmente en la card.
             */
            _calculatePageCapacity:
                function () {
                    var oList =
                        this.byId(
                            "otpeRespList"
                        );

                    var oDomRef;
                    var iAvailableHeight;
                    var iMinRowHeight;
                    var iCapacity;
                    var iCurrentPage;

                    if (!oList) {
                        return;
                    }

                    oDomRef =
                        oList.getDomRef();

                    if (!oDomRef) {
                        return;
                    }

                    iAvailableHeight =
                        oDomRef.clientHeight;

                    if (!iAvailableHeight) {
                        return;
                    }

                    iMinRowHeight =
                        window.innerHeight <= 720
                            ? 31
                            : 34;

                    iCapacity =
                        Math.floor(
                            iAvailableHeight /
                            iMinRowHeight
                        );

                    iCapacity =
                        Math.max(
                            4,
                            Math.min(
                                12,
                                iCapacity
                            )
                        );

                    if (
                        iCapacity ===
                        this._iRowsPerPage
                    ) {
                        return;
                    }

                    this._iRowsPerPage =
                        iCapacity;

                    iCurrentPage =
                        Number(
                            this.getView()
                                .getModel("otpe")
                                .getProperty(
                                    "/pagination/page"
                                )
                        ) || 1;

                    this._buildPagination(
                        iCurrentPage
                    );
                },

            /* ==========================================================
               CONSTRUCCIÓN DE PÁGINAS
               ========================================================== */

            _buildPagination: function (
                iRequestedPage
            ) {
                var aSource =
                    this._clone(
                        this._aFilteredResponsables ||
                        []
                    ).filter(
                        function (oResponsable) {
                            return (
                                oResponsable.visible !==
                                false
                            );
                        }
                    );

                var aPages = [];
                var aCurrentPage = [];

                var iUsedUnits = 0;

                var iCapacity =
                    Math.max(
                        4,
                        this._iRowsPerPage ||
                        8
                    );

                var oModel =
                    this.getView()
                        .getModel("otpe");

                var iTotalPages;
                var iPage;

                var fnPushPage =
                    function () {
                        if (
                            aCurrentPage.length
                        ) {
                            aPages.push(
                                aCurrentPage
                            );
                        }

                        aCurrentPage = [];
                        iUsedUnits = 0;
                    };

                aSource.forEach(
                    function (oResponsable) {
                        var aOrdenes =
                            oResponsable.ordenes ||
                            [];

                        var bExpanded =
                            Boolean(
                                oResponsable.expanded
                            );

                        var iOffset = 0;
                        var iRemaining;
                        var iTake;
                        var iPageUnits;
                        var oPageResponsable;

                        /*
                         * RESPONSABLE CERRADO
                         */
                        if (!bExpanded) {
                            if (
                                iUsedUnits + 1 >
                                    iCapacity &&
                                iUsedUnits > 0
                            ) {
                                fnPushPage();
                            }

                            oPageResponsable =
                                this._clone(
                                    oResponsable
                                );

                            oPageResponsable._pageUnits =
                                "1";

                            oPageResponsable.ordenes =
                                [];

                            aCurrentPage.push(
                                oPageResponsable
                            );

                            iUsedUnits += 1;

                            return;
                        }

                        /*
                         * ABIERTO SIN ÓRDENES
                         */
                        if (!aOrdenes.length) {
                            if (
                                iUsedUnits + 2 >
                                    iCapacity &&
                                iUsedUnits > 0
                            ) {
                                fnPushPage();
                            }

                            oPageResponsable =
                                this._clone(
                                    oResponsable
                                );

                            oPageResponsable._pageUnits =
                                "2";

                            aCurrentPage.push(
                                oPageResponsable
                            );

                            iUsedUnits += 2;

                            return;
                        }

                        /*
                         * ABIERTO CON ÓRDENES
                         *
                         * 1 = responsable
                         * 1 = cabecera detalle
                         * N = órdenes
                         */
                        while (
                            iOffset <
                            aOrdenes.length
                        ) {
                            iRemaining =
                                iCapacity -
                                iUsedUnits;

                            if (
                                iRemaining < 3 &&
                                iUsedUnits > 0
                            ) {
                                fnPushPage();

                                iRemaining =
                                    iCapacity;
                            }

                            iTake =
                                Math.min(
                                    aOrdenes.length -
                                        iOffset,

                                    Math.max(
                                        1,
                                        iRemaining - 2
                                    )
                                );

                            oPageResponsable =
                                this._clone(
                                    oResponsable
                                );

                            oPageResponsable.ordenes =
                                aOrdenes.slice(
                                    iOffset,
                                    iOffset +
                                        iTake
                                );

                            iPageUnits =
                                2 +
                                iTake;

                            /*
                             * STRING para CustomData.
                             */
                            oPageResponsable._pageUnits =
                                String(
                                    iPageUnits
                                );

                            oPageResponsable._continued =
                                iOffset > 0;

                            aCurrentPage.push(
                                oPageResponsable
                            );

                            iUsedUnits +=
                                iPageUnits;

                            iOffset +=
                                iTake;

                            if (
                                iOffset <
                                aOrdenes.length
                            ) {
                                fnPushPage();
                            }
                        }
                    }.bind(this)
                );

                if (
                    aCurrentPage.length
                ) {
                    aPages.push(
                        aCurrentPage
                    );
                }

                if (!aPages.length) {
                    aPages.push([]);
                }

                this._aPages =
                    aPages;

                iTotalPages =
                    aPages.length;

                iPage =
                    Math.min(
                        Math.max(
                            1,
                            Number(
                                iRequestedPage
                            ) || 1
                        ),
                        iTotalPages
                    );

                oModel.setProperty(
                    "/pagination",
                    {
                        page:
                            iPage,

                        totalPages:
                            iTotalPages,

                        rowsPerPage:
                            iCapacity
                    }
                );

                oModel.setProperty(
                    "/pagedResponsables",
                    this._clone(
                        aPages[
                            iPage - 1
                        ] || []
                    )
                );
            },

            _showPage: function (iPage) {
                var oModel =
                    this.getView()
                        .getModel("otpe");

                var iTotalPages =
                    this._aPages &&
                    this._aPages.length
                        ? this._aPages.length
                        : 1;

                iPage =
                    Math.min(
                        Math.max(
                            1,
                            Number(iPage) || 1
                        ),
                        iTotalPages
                    );

                oModel.setProperty(
                    "/pagination/page",
                    iPage
                );

                oModel.setProperty(
                    "/pagination/totalPages",
                    iTotalPages
                );

                oModel.setProperty(
                    "/pagedResponsables",
                    this._clone(
                        this._aPages[
                            iPage - 1
                        ] || []
                    )
                );
            },

            /* ==========================================================
               UTILIDADES
               ========================================================== */

            _normalizeText: function (sValue) {
                return String(
                    sValue || ""
                )
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                    .toLowerCase()
                    .trim();
            },

            _clone: function (vValue) {
                return JSON.parse(
                    JSON.stringify(
                        vValue
                    )
                );
            }
        }
    );
});