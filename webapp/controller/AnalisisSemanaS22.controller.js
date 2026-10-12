sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/ui/core/ResizeHandler",
    "mantenimiento/model/AnalisisGeneralService"
], function (
    Controller,
    JSONModel,
    includeStylesheet,
    MessageToast,
    ResizeHandler,
    AnalisisGeneralService
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisSemanaS22", {

        onInit: function () {
            this._pageSize = 10;
            this._currentPage = 1;
            this._searchValue = "";

            this._filters = {
                week: "2026-W26",
                zone: "TODAS"
            };

            this._allRows = [];
            this._requestId = 0;
            this._resizeHandlerId = null;
            this._resizeTimer = null;

            this._loadViewStyles();

            this.getView().setModel(
                new JSONModel(
                    AnalisisGeneralService.createEmpty(
                        this._filters
                    )
                ),
                "otModel"
            );

            this.getView()
                .getModel("otModel")
                .setSizeLimit(1000);

            this._load(false);
        },


        onAfterRendering: function () {
            var oTableCard = this.byId("idAnalisisTableCard");

            if (
                oTableCard &&
                !this._resizeHandlerId
            ) {
                this._resizeHandlerId =
                    ResizeHandler.register(
                        oTableCard,
                        this._schedulePageSizeAdapt.bind(this)
                    );
            }

            this._schedulePageSizeAdapt();
        },


        onExit: function () {
            if (this._resizeHandlerId) {
                ResizeHandler.deregister(
                    this._resizeHandlerId
                );

                this._resizeHandlerId = null;
            }

            if (this._resizeTimer) {
                window.clearTimeout(
                    this._resizeTimer
                );

                this._resizeTimer = null;
            }
        },


        _loadViewStyles: function () {
            var sId =
                "analisisSemanaS22Stylesheet";

            if (!document.getElementById(sId)) {
                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/AnalisisSemanaS22.css"
                    ) + "?v=20261002-unified-final",
                    sId
                );
            }
        },


        onApplyFilters: function () {
            this._filters = {
                week:
                    this.byId("idSemanaSelect")
                        .getSelectedKey() ||
                    "2026-W26",

                zone:
                    this.byId("idZonaSelect")
                        .getSelectedKey() ||
                    "TODAS"
            };

            this._searchValue = "";
            this._currentPage = 1;

            this._load(true);
        },


        onSearch: function (oEvent) {
            var sValue =
                oEvent.getParameter("newValue");

            if (sValue === undefined) {
                sValue =
                    oEvent.getParameter("query") ||
                    "";
            }

            this._searchValue =
                String(sValue).trim();

            this._currentPage = 1;

            this._renderPage();
        },


        onPreviousPage: function () {
            if (this._currentPage <= 1) {
                return;
            }

            this._currentPage -= 1;

            this._renderPage();
        },


        onNextPage: function () {
            var oPagination =
                this.getView()
                    .getModel("otModel")
                    .getProperty("/pagination") ||
                {};

            var iTotalPages =
                Number(
                    oPagination.totalPages
                ) || 1;

            if (
                this._currentPage >=
                iTotalPages
            ) {
                return;
            }

            this._currentPage += 1;

            this._renderPage();
        },


        _load: function (bNotify) {
            var oView = this.getView();
            var oODataModel = this._getODataModel();

            var oRequestFilters =
                Object.assign(
                    {},
                    this._filters
                );

            var iRequestId =
                ++this._requestId;

            oView.setBusy(true);

            AnalisisGeneralService.load(
                oODataModel,
                oRequestFilters
            ).then(function (oResponse) {

                if (
                    iRequestId !==
                    this._requestId
                ) {
                    return;
                }

                this._allRows =
                    oResponse.data.results ||
                    [];

                this.getView()
                    .getModel("otModel")
                    .setData(
                        oResponse.data
                    );

                this._syncControls(
                    oResponse.data
                );

                this._renderPage();

                this._schedulePageSizeAdapt();

                if (bNotify) {
                    MessageToast.show(
                        "Análisis general actualizado con datos de SAP"
                    );
                }

            }.bind(this)).catch(function (oError) {

                if (
                    iRequestId !==
                    this._requestId
                ) {
                    return;
                }

                this._allRows = [];

                var oEmptyData =
                    AnalisisGeneralService.createEmpty(
                        oRequestFilters
                    );

                this.getView()
                    .getModel("otModel")
                    .setData(
                        oEmptyData
                    );

                this._syncControls(
                    oEmptyData
                );

                this._renderPage();

                MessageToast.show(
                    oError &&
                    oError.message
                        ? oError.message
                        : "No fue posible actualizar el análisis"
                );

            }.bind(this)).finally(function () {

                if (
                    iRequestId ===
                    this._requestId
                ) {
                    oView.setBusy(false);
                }

            }.bind(this));
        },


        _getODataModel: function () {
            return (
                this.getOwnerComponent()
                    .getModel("dashboardOData") ||
                this.getView()
                    .getModel("dashboardOData")
            );
        },


        _syncControls: function (oData) {
            var oFilters =
                oData.filters || {};

            this.byId("idSemanaSelect")
                .setSelectedKey(
                    oFilters.week ||
                    "2026-W26"
                );

            this.byId("idZonaSelect")
                .setSelectedKey(
                    oFilters.zone ||
                    "TODAS"
                );
        },


        _renderPage: function () {
            var oModel =
                this.getView()
                    .getModel("otModel");

            var sSearch =
                this._normalize(
                    this._searchValue
                );

            var aRows =
                this._allRows.filter(
                    function (oRow) {
                        var aValues;

                        if (!sSearch) {
                            return true;
                        }

                        aValues = [
                            oRow.prioridad,
                            oRow.ot,
                            oRow.cliente,
                            oRow.zona,
                            oRow.elevador,
                            oRow.causa,
                            oRow.responsable,
                            oRow.estado
                        ];

                        return aValues.some(
                            function (vValue) {
                                return this
                                    ._normalize(
                                        vValue
                                    )
                                    .indexOf(
                                        sSearch
                                    ) >= 0;
                            }.bind(this)
                        );
                    }.bind(this)
                );

            var iTotal =
                aRows.length;

            var iTotalPages =
                Math.max(
                    1,
                    Math.ceil(
                        iTotal /
                        this._pageSize
                    )
                );

            var iPage =
                Math.min(
                    Math.max(
                        this._currentPage,
                        1
                    ),
                    iTotalPages
                );

            var iStart =
                (iPage - 1) *
                this._pageSize;

            var iEnd =
                Math.min(
                    iStart +
                    this._pageSize,
                    iTotal
                );

            this._currentPage =
                iPage;

            oModel.setProperty(
                "/filters/search",
                this._searchValue
            );

            oModel.setProperty(
                "/results",
                aRows.slice(
                    iStart,
                    iEnd
                )
            );

            oModel.setProperty(
                "/pagination",
                {
                    currentPage:
                        iPage,

                    pageSize:
                        this._pageSize,

                    totalPages:
                        iTotalPages,

                    totalResults:
                        iTotal,

                    from:
                        iTotal
                            ? iStart + 1
                            : 0,

                    to:
                        iEnd,

                    canGoPrevious:
                        iPage > 1,

                    canGoNext:
                        iPage <
                        iTotalPages,

                    summaryText:
                        "Mostrando " +
                        (
                            iTotal
                                ? iStart + 1
                                : 0
                        ) +
                        " a " +
                        iEnd +
                        " de " +
                        iTotal +
                        " resultados"
                }
            );
        },


        _schedulePageSizeAdapt: function () {
            if (this._resizeTimer) {
                window.clearTimeout(
                    this._resizeTimer
                );
            }

            this._resizeTimer =
                window.setTimeout(
                    function () {
                        this._resizeTimer =
                            null;

                        this._adaptPageSize();
                    }.bind(this),
                    60
                );
        },


        _adaptPageSize: function () {
            var oCard =
                this.byId(
                    "idAnalisisTableCard"
                );

            var oHeader =
                this.byId(
                    "idAnalisisTableHeader"
                );

            var oFooter =
                this.byId(
                    "idAnalisisTableFooter"
                );

            if (
                !oCard ||
                !oCard.getDomRef()
            ) {
                return;
            }

            var iCardHeight =
                oCard.getDomRef()
                    .clientHeight;

            if (iCardHeight <= 0) {
                return;
            }

            var iHeaderHeight =
                oHeader &&
                oHeader.getDomRef()
                    ? oHeader
                        .getDomRef()
                        .offsetHeight
                    : 46;

            var iFooterHeight =
                oFooter &&
                oFooter.getDomRef()
                    ? oFooter
                        .getDomRef()
                        .offsetHeight
                    : 34;

            var iTableHeaderHeight =
                34;

            var iInternalSpace =
                24;

            var iRowHeight =
                window.innerHeight <= 720
                    ? 30
                    : 34;

            var iAvailableHeight =
                iCardHeight -
                iHeaderHeight -
                iFooterHeight -
                iTableHeaderHeight -
                iInternalSpace;

            var iNewPageSize =
                Math.max(
                    5,
                    Math.min(
                        20,
                        Math.floor(
                            iAvailableHeight /
                            iRowHeight
                        )
                    )
                );

            if (
                !isFinite(iNewPageSize) ||
                iNewPageSize < 1 ||
                iNewPageSize ===
                    this._pageSize
            ) {
                return;
            }

            var iFirstVisibleIndex =
                (
                    this._currentPage -
                    1
                ) *
                this._pageSize;

            this._pageSize =
                iNewPageSize;

            this._currentPage =
                Math.floor(
                    iFirstVisibleIndex /
                    iNewPageSize
                ) + 1;

            this._renderPage();
        },


        _normalize: function (vValue) {
            var sText =
                String(
                    vValue === null ||
                    vValue === undefined
                        ? ""
                        : vValue
                ).toLowerCase();

            return sText.normalize
                ? sText
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                : sText;
        }
    });
});