sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/AnalisisFallasService"
], function (
    Controller,
    JSONModel,
    MessageToast,
    includeStylesheet,
    AnalisisFallasService
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisFallas", {
        onInit: function () {
            var oModel;

            includeStylesheet(
                sap.ui.require.toUrl("mantenimiento/css/AnalisisFallas.css") +
                "?v=20260821-live-data"
            );

            this._iLoadRequest = 0;
            this._mFilters = this._getDefaultFilters();
            oModel = new JSONModel(
                AnalisisFallasService.createEmpty(this._mFilters)
            );
            oModel.setSizeLimit(1000);
            this.getView().setModel(oModel, "fallasModel");
            this._loadData(false);
        },

        onPeriodoChange: function (oEvent) {
            var sPeriod = oEvent.getSource().getSelectedKey() || "2026-ANUAL";
            var oContext = AnalisisFallasService.getFilterContext({
                periodo: sPeriod
            });
            var oModel = this.getView().getModel("fallasModel");

            if (!oContext.startDate || !oContext.endDate) {
                return;
            }
            oModel.setProperty(
                "/filtros/fechaDesde", this._formatDate(oContext.startDate)
            );
            oModel.setProperty(
                "/filtros/fechaHasta", this._formatDate(oContext.endDate)
            );
        },

        onApplyFilters: function () {
            var oModel = this.getView().getModel("fallasModel");

            this._mFilters = {
                periodo: this.byId("analisisFallasPeriodSelect").getSelectedKey() ||
                    "2026-ANUAL",
                fechaDesde: oModel.getProperty("/filtros/fechaDesde"),
                fechaHasta: oModel.getProperty("/filtros/fechaHasta"),
                zona: this.byId("analisisFallasZoneSelect").getSelectedKey() ||
                    "TODAS"
            };
            this._loadData(true);
        },

        _getDefaultFilters: function () {
            return {
                periodo: "2026-ANUAL",
                fechaDesde: "01/01/2026",
                fechaHasta: "31/12/2026",
                zona: "TODAS"
            };
        },

        _getODataModel: function () {
            var oComponent = this.getOwnerComponent();

            return (oComponent && oComponent.getModel("dashboardOData")) ||
                this.getView().getModel("dashboardOData");
        },

        _loadData: function (bNotify) {
            var iRequest = ++this._iLoadRequest;
            var oModel = this.getView().getModel("fallasModel");
            var mFilters = Object.assign({}, this._mFilters);

            this.getView().setBusy(true);
            AnalisisFallasService.load(this._getODataModel(), mFilters).then(
                function (oResult) {
                    if (iRequest !== this._iLoadRequest) {
                        return;
                    }
                    this._oRawData = oResult.rawData;
                    oModel.setData(oResult.data);
                    this._setFiltersOnControls(oResult.data.filtros);
                }.bind(this)
            ).catch(function (oError) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                oModel.setData(AnalisisFallasService.createEmpty(mFilters));
                this._setFiltersOnControls(mFilters);
                if (bNotify) {
                    MessageToast.show(
                        oError && oError.message ? oError.message :
                            "No fue posible cargar el análisis de fallas"
                    );
                }
            }.bind(this)).finally(function () {
                if (iRequest === this._iLoadRequest) {
                    this.getView().setBusy(false);
                }
            }.bind(this));
        },

        _setFiltersOnControls: function (mFilters) {
            var oPeriod = this.byId("analisisFallasPeriodSelect");
            var oZone = this.byId("analisisFallasZoneSelect");

            if (oPeriod) {
                oPeriod.setSelectedKey(mFilters.periodo || "2026-ANUAL");
            }
            if (oZone) {
                oZone.setSelectedKey(mFilters.zona || "TODAS");
            }
        },

        _formatDate: function (oDate) {
            return String(oDate.getDate()).padStart(2, "0") + "/" +
                String(oDate.getMonth() + 1).padStart(2, "0") + "/" +
                oDate.getFullYear();
        }
    });
});
