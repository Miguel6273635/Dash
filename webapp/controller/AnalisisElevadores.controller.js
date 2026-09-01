sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/ActionSheet",
    "sap/m/Button",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/AnalisisElevadoresService",
    "mantenimiento/model/InitialLoadPeriod"
], function (
    Controller,
    JSONModel,
    ActionSheet,
    Button,
    MessageToast,
    includeStylesheet,
    AnalisisElevadoresService,
    InitialLoadPeriod
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisElevadores", {
        onInit: function () {
            includeStylesheet(
                sap.ui.require.toUrl(
                    "mantenimiento/css/AnalisisElevadores.css"
                ) + "?v=20260818-live-data"
            );

            this._iLoadRequest = 0;
            this._iPageSize = 5;
            this._sTextoBusqueda = "";
            this._sPeriodoSeleccionado = "2026";
            this._oFiltrosAplicados = this._getDefaultFilters();

            this.getView().setModel(new JSONModel(
                AnalisisElevadoresService.createEmpty(this._oFiltrosAplicados)
            ), "dashboardModel");
            this.getView().getModel("dashboardModel").setSizeLimit(1000);
            this._loadData(false);
        },

        onAfterRendering: function () {
            var oPeriodo = this.byId("chipPeriodo");

            if (!oPeriodo || this._bPeriodoClickAsignado) {
                return;
            }
            oPeriodo.addEventDelegate({
                onclick: function () {
                    this._abrirMenuPeriodo(oPeriodo);
                }.bind(this)
            });
            this._bPeriodoClickAsignado = true;
        },

        onAplicarFiltros: function () {
            this._sTextoBusqueda = "";
            this.byId("searchElevadores").setValue("");
            this._oFiltrosAplicados = {
                periodo: this._sPeriodoSeleccionado || "2026",
                fechaDesde: "01/01/" + (this._sPeriodoSeleccionado || "2026"),
                fechaHasta: "31/12/" + (this._sPeriodoSeleccionado || "2026"),
                zona: this.byId("selectZona").getSelectedKey() || "TODAS",
                supervisor: this.byId("selectSupervisor").getSelectedKey() || "TODOS",
                tipoOrden: this.byId("selectTipoOrden").getSelectedKey() || "TODOS"
            };
            this._loadData(true);
        },

        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue");

            this._sTextoBusqueda = String(
                sValue === undefined ? oEvent.getSource().getValue() : sValue
            ).trim();
            this._actualizarPaginaVisible();
        },

        onPageSizeChange: function (oEvent) {
            var iSize = Number(oEvent.getSource().getSelectedKey());

            this._iPageSize = Number.isFinite(iSize) && iSize > 0 ? iSize : 5;
            this._actualizarPaginaVisible();
        },

        _getDefaultFilters: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            return {
                periodo: initialPeriod.year,
                fechaDesde: initialPeriod.startDisplay,
                fechaHasta: initialPeriod.endDisplay,
                zona: "TODAS",
                supervisor: "TODOS",
                tipoOrden: "TODOS"
            };
        },

        _getODataModel: function () {
            var oComponent = this.getOwnerComponent();

            return (oComponent && oComponent.getModel("dashboardOData")) ||
                this.getView().getModel("dashboardOData");
        },

        _loadData: function (bNotify) {
            var oODataModel = this._getODataModel();
            var oViewModel = this.getView().getModel("dashboardModel");
            var mFilters = Object.assign({}, this._oFiltrosAplicados);
            var iRequest = ++this._iLoadRequest;

            this.getView().setBusy(true);
            AnalisisElevadoresService.load(oODataModel, mFilters).then(
                function (oResult) {
                    if (iRequest !== this._iLoadRequest) {
                        return;
                    }
                    this._oRawData = oResult.rawData;
                    oViewModel.setData(oResult.data);
                    this._setFiltersOnControls(oResult.data.filters);
                    this._actualizarPaginaVisible();
                }.bind(this)
            ).catch(function (oError) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                oViewModel.setData(
                    AnalisisElevadoresService.createEmpty(mFilters)
                );
                this._setFiltersOnControls(mFilters);
                if (bNotify) {
                    MessageToast.show(
                        oError && oError.message ?
                            oError.message :
                            "No fue posible cargar los elevadores"
                    );
                }
            }.bind(this)).finally(function () {
                if (iRequest === this._iLoadRequest) {
                    this.getView().setBusy(false);
                }
            }.bind(this));
        },

        _setFiltersOnControls: function (mFilters) {
            var sPeriod = String(mFilters.periodo || "2026");

            this._sPeriodoSeleccionado = sPeriod;
            this.byId("textPeriodo").setText(
                mFilters.periodoTexto || sPeriod + " (Anual)"
            );
            this.byId("selectZona").setSelectedKey(mFilters.zona || "TODAS");
            this.byId("selectSupervisor").setSelectedKey(
                mFilters.supervisor || "TODOS"
            );
            this.byId("selectTipoOrden").setSelectedKey(
                mFilters.tipoOrden || "TODOS"
            );
        },

        _abrirMenuPeriodo: function (oSource) {
            var oModel = this.getView().getModel("dashboardModel");
            var aOpciones = oModel.getProperty("/opcionesPeriodo") || [];
            var oActionSheet;

            oActionSheet = new ActionSheet({
                title: "Seleccionar periodo",
                buttons: aOpciones.map(function (oOpcion) {
                    return new Button({
                        text: oOpcion.text,
                        press: function () {
                            this._sPeriodoSeleccionado = String(oOpcion.key);
                            this.byId("textPeriodo").setText(oOpcion.text);
                            oActionSheet.close();
                        }.bind(this)
                    });
                }.bind(this)),
                afterClose: function () {
                    oActionSheet.destroy();
                }
            });
            this.getView().addDependent(oActionSheet);
            oActionSheet.openBy(oSource);
        },

        _actualizarPaginaVisible: function () {
            var oModel = this.getView().getModel("dashboardModel");
            var aElevadores = oModel.getProperty("/elevadores") || [];
            var sSearch = this._normalizarTexto(this._sTextoBusqueda);
            var aFiltered = aElevadores.filter(function (oElevador) {
                var sRecord = [
                    oElevador.elevador,
                    oElevador.cliente,
                    oElevador.zona,
                    oElevador.causa,
                    oElevador.estado
                ].join(" ");

                return !sSearch ||
                    this._normalizarTexto(sRecord).indexOf(sSearch) >= 0;
            }.bind(this));
            var iVisible = Math.min(this._iPageSize, aFiltered.length);
            var sPagination = aFiltered.length ?
                "1–" + iVisible + " de " + aFiltered.length :
                "0 de 0";

            oModel.setProperty(
                "/elevadoresVisibles",
                aFiltered.slice(0, this._iPageSize)
            );
            oModel.setProperty("/paginacion/texto", sPagination);
        },

        _normalizarTexto: function (vValue) {
            var sText = String(vValue || "").toLowerCase();

            return sText.normalize ?
                sText.normalize("NFD").replace(/[\u0300-\u036f]/g, "") :
                sText;
        },

        formatEstadoTexto: function (sEstado) {
            return sEstado || "Sin clasificar";
        }
    });
});
