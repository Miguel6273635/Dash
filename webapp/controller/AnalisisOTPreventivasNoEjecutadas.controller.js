sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/PreventivasNoEjecutadasService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    MessageToast,
    PreventivasNoEjecutadasService,
    InitialLoadPeriod
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisOTPreventivasNoEjecutadas",
        {
            onInit: function () {
                var oInitialData =
                    PreventivasNoEjecutadasService.createEmpty(
                        this._getDefaultFilters(),
                        "NO_EJECUTADAS"
                    );

                var oModel =
                    new JSONModel(oInitialData);

                this._iLoadRequest = 0;
                this._oRawData = null;

                this._aAllCauses = [];
                this._aFilteredCauses = [];
                this._aPages = [[]];

                this._iRowsPerPage = 8;

                this._iResizeTimer = null;
                this._iPaginationTimer = null;

                this._fnWindowResize =
                    this._onWindowResize.bind(this);

                oModel.setSizeLimit(1000);

                this.getView().setModel(
                    oModel,
                    "otne"
                );

                this._setAllCauses(
                    oInitialData.causes
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
                        .getModel("otne");

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

            onSearchCause: function (oEvent) {
                var sValue =
                    oEvent.getParameter("query") ||
                    oEvent.getParameter("newValue") ||
                    oEvent.getParameter("value") ||
                    "";

                var sSearch =
                    this._normalizeText(
                        sValue
                    );

                var aCauses =
                    this._clone(
                        this._aAllCauses || []
                    );

                if (sSearch) {
                    aCauses =
                        aCauses.filter(
                            function (oCause) {
                                return this
                                    ._normalizeText(
                                        oCause.name
                                    )
                                    .indexOf(
                                        sSearch
                                    ) !== -1;
                            }.bind(this)
                        );
                }

                this._aFilteredCauses =
                    aCauses;

                this._buildPagination(1);
            },

            onToggleCause: function (oEvent) {
                var oContext =
                    oEvent
                        .getSource()
                        .getBindingContext(
                            "otne"
                        );

                var oPageCause;
                var iSourceIndex;
                var bExpanded;
                var i;
                var iCurrentPage;

                if (!oContext) {
                    return;
                }

                oPageCause =
                    oContext.getObject();

                iSourceIndex =
                    oPageCause._sourceIndex;

                bExpanded =
                    !Boolean(
                        oPageCause.expanded
                    );

                for (
                    i = 0;
                    i < this._aAllCauses.length;
                    i++
                ) {
                    if (
                        this._aAllCauses[i]
                            ._sourceIndex ===
                        iSourceIndex
                    ) {
                        this._aAllCauses[i]
                            .expanded =
                            bExpanded;

                        break;
                    }
                }

                for (
                    i = 0;
                    i < this._aFilteredCauses.length;
                    i++
                ) {
                    if (
                        this._aFilteredCauses[i]
                            ._sourceIndex ===
                        iSourceIndex
                    ) {
                        this._aFilteredCauses[i]
                            .expanded =
                            bExpanded;

                        break;
                    }
                }

                iCurrentPage =
                    Number(
                        this.getView()
                            .getModel("otne")
                            .getProperty(
                                "/pagination/page"
                            )
                    ) || 1;

                this._buildPagination(
                    iCurrentPage
                );
            },

            onPreviousPage: function () {
                var oModel =
                    this.getView()
                        .getModel("otne");

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
                        .getModel("otne");

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

            _setAnalysisView: function (
                sAnalysis
            ) {
                var oModel =
                    this.getView()
                        .getModel("otne");

                var oData;

                if (!this._oRawData) {
                    oModel.setProperty(
                        "/ui/selectedAnalysis",
                        sAnalysis
                    );

                    return;
                }

                oData =
                    PreventivasNoEjecutadasService.build(
                        this._oRawData,
                        this._getFilters(),
                        sAnalysis
                    );

                this._applyData(
                    oData
                );
            },

            _loadData: function (bNotify) {
                var oODataModel =
                    this._getODataModel();

                var oViewModel =
                    this.getView()
                        .getModel("otne");

                var mFilters =
                    this._getFilters();

                var sAnalysis =
                    oViewModel.getProperty(
                        "/ui/selectedAnalysis"
                    ) ||
                    "NO_EJECUTADAS";

                var iRequest =
                    ++this._iLoadRequest;

                this.getView()
                    .setBusy(true);

                PreventivasNoEjecutadasService
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
                                    "Análisis de OT Preventivas actualizado con datos de SAP"
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
                        .getModel("otne");

                oModel.setData(
                    oData
                );

                this._setAllCauses(
                    oData.causes
                );

                this._schedulePaginationCalculation();
            },

            _onLoadError: function (
                oError,
                bNotify
            ) {
                var oModel =
                    this.getView()
                        .getModel("otne");

                var sMessage =
                    oError &&
                    oError.message ||
                    "No fue posible consultar SAP";

                if (!this._oRawData) {
                    this._applyData(
                        PreventivasNoEjecutadasService
                            .createEmpty(
                                this._getFilters(),
                                oModel.getProperty(
                                    "/ui/selectedAnalysis"
                                ) ||
                                "NO_EJECUTADAS"
                            )
                    );
                }

                if (
                    window.console &&
                    window.console.error
                ) {
                    window.console.error(
                        "Error al consultar el OData de OT Preventivas",
                        oError
                    );
                }

                if (bNotify) {
                    MessageToast.show(
                        sMessage
                    );
                }
            },

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
                        .getModel("otne")
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

            _setAllCauses: function (
                aCauses
            ) {
                var aData =
                    this._clone(
                        aCauses || []
                    );

                aData.forEach(
                    function (
                        oCause,
                        iIndex
                    ) {
                        oCause._sourceIndex =
                            iIndex;
                    }
                );

                this._aAllCauses =
                    aData;

                this._aFilteredCauses =
                    this._clone(
                        aData
                    );

                this._buildPagination(1);
            },

            _onWindowResize: function () {
                if (
                    this._iResizeTimer
                ) {
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
                    if (
                        this._iPaginationTimer
                    ) {
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

            _calculatePageCapacity:
                function () {
                    var oList =
                        this.byId(
                            "otneCauseList"
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

                    if (
                        !iAvailableHeight
                    ) {
                        return;
                    }

                    iMinRowHeight =
                        window.innerHeight <=
                        720
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
                                .getModel("otne")
                                .getProperty(
                                    "/pagination/page"
                                )
                        ) || 1;

                    this._buildPagination(
                        iCurrentPage
                    );
                },

            _buildPagination: function (
                iRequestedPage
            ) {
                var aSource =
                    this._clone(
                        this._aFilteredCauses ||
                        []
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
                        .getModel("otne");

                var iTotalPages;
                var iPage;

                var fnPushCurrentPage =
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
                    function (oCause) {
                        var aDetails =
                            oCause.details ||
                            [];

                        var bExpanded =
                            Boolean(
                                oCause.expanded
                            );

                        var iOffset = 0;
                        var iRemaining;
                        var iTake;
                        var iPageUnits;
                        var oPageCause;

                        if (!bExpanded) {
                            if (
                                iUsedUnits + 1 >
                                    iCapacity &&
                                iUsedUnits > 0
                            ) {
                                fnPushCurrentPage();
                            }

                            oPageCause =
                                this._clone(
                                    oCause
                                );

                            oPageCause._pageUnits =
                                "1";

                            oPageCause.details =
                                [];

                            aCurrentPage.push(
                                oPageCause
                            );

                            iUsedUnits += 1;

                            return;
                        }

                        if (
                            !aDetails.length
                        ) {
                            if (
                                iUsedUnits + 2 >
                                    iCapacity &&
                                iUsedUnits > 0
                            ) {
                                fnPushCurrentPage();
                            }

                            oPageCause =
                                this._clone(
                                    oCause
                                );

                            oPageCause._pageUnits =
                                "2";

                            aCurrentPage.push(
                                oPageCause
                            );

                            iUsedUnits += 2;

                            return;
                        }

                        while (
                            iOffset <
                            aDetails.length
                        ) {
                            iRemaining =
                                iCapacity -
                                iUsedUnits;

                            if (
                                iRemaining < 3 &&
                                iUsedUnits > 0
                            ) {
                                fnPushCurrentPage();

                                iRemaining =
                                    iCapacity;
                            }

                            iTake =
                                Math.min(
                                    aDetails.length -
                                        iOffset,

                                    Math.max(
                                        1,
                                        iRemaining -
                                            2
                                    )
                                );

                            oPageCause =
                                this._clone(
                                    oCause
                                );

                            oPageCause.details =
                                aDetails.slice(
                                    iOffset,
                                    iOffset +
                                        iTake
                                );

                            iPageUnits =
                                2 +
                                iTake;

                            /*
                             * IMPORTANTE:
                             * Se guarda como texto para CustomData.
                             */
                            oPageCause._pageUnits =
                                String(
                                    iPageUnits
                                );

                            oPageCause._continued =
                                iOffset > 0;

                            aCurrentPage.push(
                                oPageCause
                            );

                            iUsedUnits +=
                                iPageUnits;

                            iOffset +=
                                iTake;

                            if (
                                iOffset <
                                aDetails.length
                            ) {
                                fnPushCurrentPage();
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
                    "/pagedCauses",
                    this._clone(
                        aPages[
                            iPage - 1
                        ] || []
                    )
                );
            },

            _showPage: function (
                iPage
            ) {
                var oModel =
                    this.getView()
                        .getModel("otne");

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
                    "/pagedCauses",
                    this._clone(
                        this._aPages[
                            iPage - 1
                        ] || []
                    )
                );
            },

            _normalizeText: function (
                sValue
            ) {
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

            _clone: function (
                vValue
            ) {
                return JSON.parse(
                    JSON.stringify(
                        vValue
                    )
                );
            }
        }
    );
});