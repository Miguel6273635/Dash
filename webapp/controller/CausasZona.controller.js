sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/CausasZonaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    MessageToast,
    History,
    includeStylesheet,
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
        { type: "Preventivo", colorClass: "czTypeBlue" },
        { type: "Correctivo", colorClass: "czTypeGreen" },
        { type: "Call Center", colorClass: "czTypeAmber" }
    ];

    function typeColor(sType) {
        switch (String(sType || "").toUpperCase()) {
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

    return Controller.extend("mantenimiento.controller.CausasZona", {
        onInit: function () {
            var oViewModel;
            var initialPeriod;

            includeStylesheet(
                sap.ui.require.toUrl(
                    "mantenimiento/css/CausasZona.css"
                ) + "?v=20260818-live-data"
            );

            this._iLoadRequest = 0;
            this._iCurrentPage = 1;
            this._sTypeFilter = "TODAS";
            initialPeriod = InitialLoadPeriod.previousMonth();
            this._mFilters = {
                /* El selector conserva el año; la primera lectura se limita al mes anterior. */
                semana: initialPeriod.year + "-ANUAL",
                fechaDesde: initialPeriod.startDisplay,
                fechaHasta: initialPeriod.endDisplay,
                zona: "TODAS",
                cliente: "TODOS",
                responsable: "TODOS"
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
                    "2026-ANUAL",
                fechaDesde: this.byId("causasZonaStartDate").getValue(),
                fechaHasta: this.byId("causasZonaEndDate").getValue(),
                zona: this.byId("causasZonaZoneSelect").getSelectedKey() ||
                    "TODAS",
                cliente: this.byId("causasZonaCustomerSelect").getSelectedKey() ||
                    "TODOS",
                responsable: this.byId("causasZonaResponsibleSelect").getSelectedKey() ||
                    "TODOS"
            };
            this._iCurrentPage = 1;
            this._sTypeFilter = "TODAS";
            this.byId("causasZonaTypeSegments").setSelectedKey("TODAS");
            this._loadData(true);
        },

        onPeriodoChange: function (oEvent) {
            var sPeriodo = oEvent.getSource().getSelectedKey() || "2026-ANUAL";
            var oContext = CausasZonaService.getFilterContext({ semana: sPeriodo });
            var oModel = this.getView().getModel();

            if (!oContext.startDate || !oContext.endDate) {
                return;
            }
            oModel.setProperty("/filtros/fechaDesde", this._formatDate(oContext.startDate));
            oModel.setProperty("/filtros/fechaHasta", this._formatDate(oContext.endDate));
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
                this._prepareTypeLegend(oResult.data);
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
                mFilters.semana || "2026-ANUAL"
            );
            this.byId("causasZonaZoneSelect").setSelectedKey(
                mFilters.zona || "TODAS"
            );
            this.byId("causasZonaCustomerSelect").setSelectedKey(
                mFilters.cliente || "TODOS"
            );
            this.byId("causasZonaResponsibleSelect").setSelectedKey(
                mFilters.responsable || "TODOS"
            );
        },

        _formatDate: function (oDate) {
            return String(oDate.getDate()).padStart(2, "0") + "/" +
                String(oDate.getMonth() + 1).padStart(2, "0") + "/" +
                oDate.getFullYear();
        },

        _prepareTypeLegend: function (oData) {
            var aSummary = oData.ResumenTipos || [];

            oData.TiposLeyenda = TYPE_LEGEND.map(function (oLegend) {
                var oType = aSummary.filter(function (oItem) {
                    return String(oItem.Tipo || "").toUpperCase() ===
                        oLegend.type.toUpperCase();
                })[0] || { Cantidad: 0, Porcentaje: 0 };
                var iQuantity = Number(oType.Cantidad || 0);
                var iPercentage = Number(oType.Porcentaje || 0);

                return {
                    Tipo: oLegend.type,
                    ColorClass: oLegend.colorClass,
                    Cantidad: iQuantity,
                    Porcentaje: iPercentage,
                    LegendText: iQuantity + " OT (" +
                        iPercentage.toFixed(0) + "%)"
                };
            });
        },

        _actualizarTabla: function () {
            var oModel = this.getView().getModel();
            var aRows = oModel.getProperty("/IncumplimientosFull") || [];
            var aFilteredRows = this._sTypeFilter === "TODAS" ?
                aRows :
                aRows.filter(function (oRow) {
                    return oRow.TipoOTCode === this._sTypeFilter;
                }.bind(this));
            var iTotal = aFilteredRows.length;

            /* La tabla conserva todas las OT del filtro y el usuario navega
             * con su barra vertical; no se ocultan registros por páginas. */
            oModel.setProperty("/IncumplimientosData", aFilteredRows);
            oModel.setProperty("/VisibleCount", iTotal);
            oModel.setProperty(
                "/ActiveFilterLabel",
                TYPE_LABELS[this._sTypeFilter] || "Todas"
            );
            oModel.setProperty("/paginacion/pagina", 1);
            oModel.setProperty("/paginacion/totalPaginas", 1);
            oModel.setProperty("/paginacion/inicio", iTotal ? 1 : 0);
            oModel.setProperty("/paginacion/fin", iTotal);
        },

        _configureCharts: function () {
            var oBar = this.byId("causasZonaBarChart");
            var aTypes = this.getView().getModel().getProperty("/ResumenTipos") || [];

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
            this._renderTypeDonut(aTypes);
        },

        _renderTypeDonut: function (aTypes) {
            var oGraphic = this.byId("causasZonaDonutGraphic");
            var iTotal = aTypes.reduce(function (iSum, oType) {
                return iSum + Number(oType.Cantidad || 0);
            }, 0);
            var iStart = 0;
            var aSegments;

            if (!oGraphic) {
                return;
            }
            if (!iTotal) {
                oGraphic.setContent(
                    "<div class='czPureDonut czEmptyDonut'><div " +
                    "class='czPureDonutHole'></div></div>"
                );
                return;
            }
            aSegments = aTypes.map(function (oType) {
                var iEnd = iStart + Number(oType.Cantidad || 0) / iTotal * 100;
                var sSegment = typeColor(oType.Tipo) + " " +
                    iStart.toFixed(3) + "% " + iEnd.toFixed(3) + "%";

                iStart = iEnd;
                return sSegment;
            });
            oGraphic.setContent(
                "<div class='czPureDonut' style=\"background:conic-gradient(" +
                aSegments.join(",") + ")\"><div class='czPureDonutHole'>" +
                "</div></div>"
            );
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
