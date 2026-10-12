sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "sap/ui/core/ResizeHandler",
    "mantenimiento/model/DetalleResponsableService"
], function (
    Controller,
    JSONModel,
    MessageToast,
    includeStylesheet,
    ResizeHandler,
    DetalleResponsableService
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleResponsable", {

        onInit: function () {
            var oContext = this._navigationContext();
            var oModel;

            includeStylesheet(
                sap.ui.require.toUrl(
                    "mantenimiento/css/DetalleResponsable.css"
                ) + "?v=20261002-unified"
            );

            this._requestId = 0;
            this._rawData = null;

            this._resizeHandlerId = null;
            this._resizeTimer = null;

            /*
             * Valor provisional.
             * Después del render se calcula automáticamente
             * cuántas filas caben realmente.
             */
            this._filters = {
                responsableId: oContext.responsableId || "",
                periodKey: oContext.periodKey || "2026-ANUAL",
                zona: oContext.zona || "TODAS",
                origen: oContext.origen || "TODAS",
                page: 1,
                pageSize: 6
            };

            oModel = new JSONModel(
                DetalleResponsableService.createEmpty(
                    this._filters
                )
            );

            oModel.setSizeLimit(1000);

            this.getView().setModel(
                oModel,
                "detail"
            );

            this._load(false);
        },


        /* ============================================================
           AFTER RENDERING
           ============================================================ */

        onAfterRendering: function () {
            this._paintComplianceDonut();

            this._registerResize();

            this._scheduleTableResize();
        },


        /* ============================================================
           FILTROS
           ============================================================ */

        onApplyFilters: function () {
            this._filters.periodKey =
                this.byId("detallePeriodo")
                    .getSelectedKey() ||
                "2026-ANUAL";

            this._filters.zona =
                this.byId("selectZona")
                    .getSelectedKey() ||
                "TODAS";

            this._filters.page = 1;

            this._load(true);
        },


        /* ============================================================
           PAGINACIÓN
           ============================================================ */

        onPreviousPage: function () {
            this._filters.page = Math.max(
                1,
                this._filters.page - 1
            );

            this._rebuildFromRaw();
        },

        onNextPage: function () {
            var oPagination =
                this.getView()
                    .getModel("detail")
                    .getProperty("/paginacion") || {};

            var iTotalPages =
                Number(
                    oPagination.totalPages
                ) || 1;

            this._filters.page = Math.min(
                iTotalPages,
                this._filters.page + 1
            );

            this._rebuildFromRaw();
        },


        /* ============================================================
           NAVEGACIÓN
           ============================================================ */

        onNavBack: function () {
            window.history.go(-1);
        },

        onNavToOrder: function (oEvent) {
            MessageToast.show(
                "Detalle de la orden: " +
                oEvent.getSource().getText()
            );
        },


        /* ============================================================
           CARGA SAP
           ============================================================ */

        _load: function (bNotify) {
            var iRequestId =
                ++this._requestId;

            var oModel =
                this.getView()
                    .getModel("detail");

            this.getView()
                .setBusy(true);

            DetalleResponsableService
                .load(
                    this._odata(),
                    this._filters
                )
                .then(function (oResult) {

                    if (
                        iRequestId !==
                        this._requestId
                    ) {
                        return;
                    }

                    this._rawData =
                        oResult.rawData;

                    oModel.setData(
                        oResult.data
                    );

                    this._syncControls(
                        oResult.data
                    );

                    this._paintComplianceDonutAsync();

                    this._scheduleTableResize();

                    if (bNotify) {
                        MessageToast.show(
                            "Detalle actualizado con datos de SAP"
                        );
                    }

                }.bind(this))
                .catch(function (oError) {

                    if (
                        iRequestId !==
                        this._requestId
                    ) {
                        return;
                    }

                    oModel.setData(
                        DetalleResponsableService
                            .createEmpty(
                                this._filters
                            )
                    );

                    this._syncControls(
                        oModel.getData()
                    );

                    this._paintComplianceDonutAsync();

                    this._scheduleTableResize();

                    if (bNotify) {
                        MessageToast.show(
                            oError &&
                            oError.message
                                ? oError.message
                                : "No fue posible cargar el detalle del responsable"
                        );
                    }

                }.bind(this))
                .finally(function () {

                    if (
                        iRequestId ===
                        this._requestId
                    ) {
                        this.getView()
                            .setBusy(false);
                    }

                }.bind(this));
        },


        /* ============================================================
           RECONSTRUIR DESDE LOS DATOS YA CARGADOS
           ============================================================ */

        _rebuildFromRaw: function () {
            var oModel =
                this.getView()
                    .getModel("detail");

            if (!this._rawData) {
                return;
            }

            oModel.setData(
                DetalleResponsableService.build(
                    this._rawData,
                    this._filters
                )
            );

            this._syncControls(
                oModel.getData()
            );

            this._paintComplianceDonutAsync();
        },


        /* ============================================================
           CONTEXTO DE NAVEGACIÓN
           ============================================================ */

        _navigationContext: function () {
            var oComponent =
                this.getOwnerComponent();

            var oModel =
                oComponent &&
                oComponent.getModel(
                    "detalleResponsableNavigation"
                );

            return (
                oModel &&
                oModel.getData
                    ? oModel.getData() || {}
                    : {}
            );
        },


        /* ============================================================
           ODATA
           ============================================================ */

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


        /* ============================================================
           SINCRONIZAR CONTROLES
           ============================================================ */

        _syncControls: function (oData) {
            var oFilters =
                oData.filtros || {};

            var oPeriodo =
                this.byId(
                    "detallePeriodo"
                );

            var oZona =
                this.byId(
                    "selectZona"
                );

            if (oPeriodo) {
                oPeriodo.setSelectedKey(
                    oFilters.periodKey ||
                    "2026-ANUAL"
                );
            }

            if (oZona) {
                oZona.setSelectedKey(
                    oFilters.zonaKey ||
                    "TODAS"
                );
            }
        },


        /* ============================================================
           DONUT DE CUMPLIMIENTO
           ============================================================ */

        _paintComplianceDonutAsync: function () {
            window.setTimeout(
                this._paintComplianceDonut.bind(
                    this
                ),
                0
            );
        },

        _paintComplianceDonut: function () {
            var oDonut =
                this.byId(
                    "cumplimientoChart"
                );

            var oModel =
                this.getView()
                    .getModel("detail");

            var oKpi =
                oModel
                    ? oModel.getProperty(
                        "/kpi"
                    ) || {}
                    : {};

            var iValue =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            oKpi.cumplimientoNumero ||
                            0
                        )
                    )
                );

            if (
                oDonut &&
                oDonut.getDomRef()
            ) {
                oDonut
                    .getDomRef()
                    .style
                    .setProperty(
                        "--detalle-compliance-angle",
                        (
                            iValue *
                            3.6
                        ) + "deg"
                    );
            }
        },


        /* ============================================================
           RESIZE
           ============================================================ */

        _registerResize: function () {
            var oCard =
                this.byId(
                    "detalleTableCard"
                );

            if (
                !oCard ||
                this._resizeHandlerId
            ) {
                return;
            }

            this._resizeHandlerId =
                ResizeHandler.register(
                    oCard,
                    function () {
                        this._scheduleTableResize();
                    }.bind(this)
                );
        },

        _scheduleTableResize: function () {
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

                        this._calculatePageSize();

                    }.bind(this),
                    120
                );
        },


        /* ============================================================
           FILAS AUTOMÁTICAS
           ============================================================ */

        _calculatePageSize: function () {
            var oArea =
                this.byId(
                    "detalleTableArea"
                );

            var oTable =
                this.byId(
                    "tablaOrdenesDesviadas"
                );

            if (
                !oArea ||
                !oArea.getDomRef() ||
                !oTable
            ) {
                return;
            }

            var iAvailableHeight =
                Math.floor(
                    oArea.getDomRef()
                        .clientHeight
                );

            if (
                !iAvailableHeight ||
                iAvailableHeight < 40
            ) {
                return;
            }

            var iHeaderHeight = 34;

            var oTableDom =
                oTable.getDomRef();

            if (oTableDom) {
                var oHeader =
                    oTableDom.querySelector(
                        ".sapMListTblHeader"
                    );

                if (oHeader) {
                    iHeaderHeight =
                        Math.ceil(
                            oHeader
                                .getBoundingClientRect()
                                .height
                        );
                }
            }

            /*
             * Altura mínima de fila:
             * monitor = 44px
             * laptop baja = 39px
             */
            var iRowHeight =
                window.innerHeight <= 720
                    ? 39
                    : 44;

            var iNewPageSize =
                Math.max(
                    1,
                    Math.floor(
                        (
                            iAvailableHeight -
                            iHeaderHeight -
                            2
                        ) /
                        iRowHeight
                    )
                );

            /*
             * Evitamos valores exagerados.
             */
            iNewPageSize =
                Math.min(
                    50,
                    iNewPageSize
                );

            if (
                iNewPageSize ===
                this._filters.pageSize
            ) {
                return;
            }

            this._filters.pageSize =
                iNewPageSize;

            this._filters.page = 1;

            if (this._rawData) {
                this._rebuildFromRaw();
            }
        },


        /* ============================================================
           EXIT
           ============================================================ */

        onExit: function () {
            if (
                this._resizeHandlerId
            ) {
                ResizeHandler.deregister(
                    this._resizeHandlerId
                );

                this._resizeHandlerId =
                    null;
            }

            if (
                this._resizeTimer
            ) {
                window.clearTimeout(
                    this._resizeTimer
                );

                this._resizeTimer =
                    null;
            }
        }
    });
});