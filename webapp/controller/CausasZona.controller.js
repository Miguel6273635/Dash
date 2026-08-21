sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/CausasZonaService"
], function (
    Controller,
    JSONModel,
    MessageToast,
    History,
    includeStylesheet,
    CausasZonaService
) {
    "use strict";

    var TYPE_LABELS = {
        TODAS: "Todas",
        SM01: "Preventivo",
        SM02: "Correctivo",
        SM03: "Call Center"
    };

    return Controller.extend("mantenimiento.controller.CausasZona", {
        onInit: function () {
            var oViewModel;

            includeStylesheet(
                sap.ui.require.toUrl(
                    "mantenimiento/css/CausasZona.css"
                ) + "?v=20260818-live-data"
            );

            this._iLoadRequest = 0;
            this._iCurrentPage = 1;
            this._sTypeFilter = "TODAS";
            this._mFilters = {
                semana: "2026-W01",
                zona: "TODAS"
            };

            /*
             * Debe ejecutarse antes de setModel. Si se hace después, el Select
             * puede quedar enlazado con el límite estándar de 100 elementos:
             * 52 semanas de 2024 + 48 semanas de 2025, sin llegar a 2026.
             */
            oViewModel = new JSONModel(
                CausasZonaService.createEmpty(this._mFilters)
            );
            oViewModel.setSizeLimit(1000);
            this.getView().setModel(oViewModel);
            this._loadData(false);
        },

        onAfterRendering: function () {
            this._configureCharts();
        },

        onApplyFilters: function () {
            this._mFilters = {
                semana: this.byId("causasZonaWeekSelect").getSelectedKey() ||
                    "2026-W01",
                zona: this.byId("causasZonaZoneSelect").getSelectedKey() ||
                    "TODAS"
            };
            this._iCurrentPage = 1;
            this._sTypeFilter = "TODAS";
            this.byId("causasZonaTypeSegments").setSelectedKey("TODAS");
            this._loadData(true);
        },

        onTypeFilterChange: function (oEvent) {
            var oItem = oEvent.getParameter("item");

            this._sTypeFilter = oItem ? oItem.getKey() : "TODAS";
            this._iCurrentPage = 1;
            this._actualizarTabla();
        },

        onPreviousPage: function () {
            if (this._iCurrentPage > 1) {
                this._iCurrentPage -= 1;
                this._actualizarTabla();
            }
        },

        onNextPage: function () {
            var iTotalPages = Number(
                this.getView().getModel().getProperty("/paginacion/totalPaginas")
            ) || 1;

            if (this._iCurrentPage < iTotalPages) {
                this._iCurrentPage += 1;
                this._actualizarTabla();
            }
        },

        onGoToPage: function (oEvent) {
            var iPage = Number(oEvent.getSource().getText());
            var iTotalPages = Number(
                this.getView().getModel().getProperty("/paginacion/totalPaginas")
            ) || 1;

            if (Number.isFinite(iPage) && iPage >= 1 && iPage <= iTotalPages) {
                this._iCurrentPage = iPage;
                this._actualizarTabla();
            }
        },

        onPageSizeChange: function (oEvent) {
            var iPageSize = Number(oEvent.getSource().getSelectedKey());

            this.getView().getModel().setProperty(
                "/paginacion/tamanoPagina",
                Number.isFinite(iPageSize) && iPageSize > 0 ? iPageSize : 10
            );
            this._iCurrentPage = 1;
            this._actualizarTabla();
        },

        _getODataModel: function () {
            var oComponent = this.getOwnerComponent();

            return (oComponent && oComponent.getModel("dashboardOData")) ||
                this.getView().getModel("dashboardOData");
        },

        _loadData: function (bNotify) {
            var iRequest = ++this._iLoadRequest;
            var oViewModel = this.getView().getModel();
            var mFilters = Object.assign({}, this._mFilters);

            this.getView().setBusy(true);
            CausasZonaService.load(
                this._getODataModel(),
                mFilters
            ).then(function (oResult) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._oRawData = oResult.rawData;
                oViewModel.setData(oResult.data);
                this._setFiltersOnControls(oResult.data.filtros);
                this._actualizarTabla();
                this._configureCharts();
            }.bind(this)).catch(function (oError) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                oViewModel.setData(CausasZonaService.createEmpty(mFilters));
                this._setFiltersOnControls(mFilters);
                if (bNotify) {
                    MessageToast.show(
                        oError && oError.message ?
                            oError.message :
                            "No fue posible cargar las causas por zona"
                    );
                }
            }.bind(this)).finally(function () {
                if (iRequest === this._iLoadRequest) {
                    this.getView().setBusy(false);
                }
            }.bind(this));
        },

        _setFiltersOnControls: function (mFilters) {
            this.byId("causasZonaWeekSelect").setSelectedKey(
                mFilters.semana || "2026-W01"
            );
            this.byId("causasZonaZoneSelect").setSelectedKey(
                mFilters.zona || "TODAS"
            );
        },

        _actualizarTabla: function () {
            var oModel = this.getView().getModel();
            var aRows = oModel.getProperty("/IncumplimientosFull") || [];
            var iPageSize = Number(
                oModel.getProperty("/paginacion/tamanoPagina")
            ) || 10;
            var aFilteredRows = this._sTypeFilter === "TODAS" ?
                aRows :
                aRows.filter(function (oRow) {
                    return oRow.TipoOTCode === this._sTypeFilter;
                }.bind(this));
            var iTotalPages = Math.max(
                1,
                Math.ceil(aFilteredRows.length / iPageSize)
            );
            var iStart;
            var iEnd;

            this._iCurrentPage = Math.min(this._iCurrentPage, iTotalPages);
            iStart = (this._iCurrentPage - 1) * iPageSize;
            iEnd = Math.min(iStart + iPageSize, aFilteredRows.length);

            oModel.setProperty("/IncumplimientosData", aFilteredRows.slice(
                iStart,
                iEnd
            ));
            oModel.setProperty("/VisibleCount", iEnd);
            oModel.setProperty(
                "/ActiveFilterLabel",
                TYPE_LABELS[this._sTypeFilter] || "Todas"
            );
            oModel.setProperty("/paginacion/pagina", this._iCurrentPage);
            oModel.setProperty("/paginacion/totalPaginas", iTotalPages);
            oModel.setProperty("/paginacion/inicio", aFilteredRows.length ? iStart + 1 : 0);
            oModel.setProperty("/paginacion/fin", iEnd);
        },

        _configureCharts: function () {
            var oBar = this.byId("causasZonaBarChart");
            var oDonut = this.byId("causasZonaDonutChart");

            if (oBar) {
                oBar.setVizProperties({
                    general: { background: { color: "transparent" } },
                    plotArea: {
                        background: { color: "transparent" },
                        dataLabel: {
                            visible: true,
                            position: "outside",
                            style: {
                                color: "#26324f",
                                fontSize: "10px",
                                fontWeight: "bold"
                            }
                        },
                        colorPalette: [
                            "#e31b36", "#f97316", "#f4b400", "#7c3aed", "#10b981"
                        ],
                        gridline: { visible: false }
                    },
                    valueAxis: {
                        visible: true,
                        title: { visible: false },
                        label: {
                            visible: true,
                            style: { color: "#7b879b", fontSize: "8px" }
                        },
                        axisLine: { visible: true, color: "#dfe5ee" }
                    },
                    categoryAxis: {
                        title: { visible: false },
                        label: {
                            style: { color: "#44516a", fontSize: "9px" }
                        },
                        axisLine: { visible: false }
                    },
                    legend: { visible: false },
                    title: { visible: false },
                    interaction: {
                        selectability: { mode: "NONE" },
                        zoom: { enablement: "disabled" }
                    }
                });
            }
            if (oDonut) {
                oDonut.setVizProperties({
                    general: { background: { color: "transparent" } },
                    plotArea: {
                        background: { color: "transparent" },
                        dataLabel: {
                            visible: true,
                            type: "percentage",
                            style: {
                                color: "#26324f",
                                fontSize: "11px",
                                fontWeight: "bold"
                            }
                        },
                        colorPalette: ["#1764e8", "#16a34a", "#f4b400"],
                        innerRadius: "56%"
                    },
                    legend: {
                        visible: true,
                        position: "right",
                        title: { visible: false },
                        label: {
                            style: { color: "#44516a", fontSize: "9px" }
                        }
                    },
                    title: { visible: false },
                    interaction: { selectability: { mode: "NONE" } }
                });
            }
        },

        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();
            var oRouter = this.getOwnerComponent() &&
                this.getOwnerComponent().getRouter();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else if (oRouter && oRouter.getRoute("RouteMantenimiento")) {
                oRouter.navTo("RouteMantenimiento", {}, true);
            }
        }
    });
});
