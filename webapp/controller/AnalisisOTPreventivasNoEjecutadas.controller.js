sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/PreventivasNoEjecutadasService"
], function (Controller, JSONModel, MessageToast, PreventivasNoEjecutadasService) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisOTPreventivasNoEjecutadas", {
        onInit: function () {
            var oInitialData = PreventivasNoEjecutadasService.createEmpty(
                this._getDefaultFilters(),
                "NO_EJECUTADAS"
            );
            var oModel = new JSONModel(oInitialData);

            this._iLoadRequest = 0;
            this._oRawData = null;
            oModel.setSizeLimit(1000);
            this.getView().setModel(oModel, "otne");
            this._setAllCauses(oInitialData.causes);
            this._loadData(false);
        },

        onApplyFilters: function () {
            this._loadData(true);
        },

        onPeriodoChange: function (oEvent) {
            var sKey = String(oEvent.getSource().getSelectedKey() || "");
            var oModel = this.getView().getModel("otne");
            var aAnnualMatch = sKey.match(/^(\d{4})$/);
            var aMonthlyMatch = sKey.match(/^(\d{4})-(\d{2})$/);
            var iYear;
            var iMonth;
            var iLastDay;

            if (aAnnualMatch) {
                iYear = Number(aAnnualMatch[1]);
                oModel.setProperty("/filters/fechaDesde", "01/01/" + iYear);
                oModel.setProperty("/filters/fechaHasta", "31/12/" + iYear);
                return;
            }
            if (aMonthlyMatch) {
                iYear = Number(aMonthlyMatch[1]);
                iMonth = Number(aMonthlyMatch[2]);
                iLastDay = new Date(iYear, iMonth, 0).getDate();
                oModel.setProperty("/filters/fechaDesde", "01/" + String(iMonth).padStart(2, "0") + "/" + iYear);
                oModel.setProperty("/filters/fechaHasta", String(iLastDay).padStart(2, "0") + "/" +
                    String(iMonth).padStart(2, "0") + "/" + iYear);
            }
        },

        onSelectNoEjecutadas: function () {
            this._setAnalysisView("NO_EJECUTADAS");
        },

        onSelectEjecutadas: function () {
            this._setAnalysisView("EJECUTADAS");
        },

        onSelectTodas: function () {
            this._setAnalysisView("TODAS");
        },

        onSearchCause: function (oEvent) {
            var sValue = oEvent.getParameter("query") || oEvent.getParameter("newValue") ||
                oEvent.getParameter("value") || "";
            var sSearch = this._normalizeText(sValue);
            var aCauses = this._aAllCauses;

            if (sSearch) {
                aCauses = aCauses.filter(function (oCause) {
                    return this._normalizeText(oCause.name).includes(sSearch);
                }.bind(this));
            }
            this.getView().getModel("otne").setProperty("/causes", this._clone(aCauses));
        },

        onToggleCause: function (oEvent) {
            var oSource = oEvent.getSource();
            var oModel = this.getView().getModel("otne");
            var oContext = oSource.getBindingContext("otne");
            var sPath = oContext ? oContext.getPath() + "/expanded" : oSource.data("path");

            if (sPath) {
                oModel.setProperty(sPath, !Boolean(oModel.getProperty(sPath)));
            }
        },

        _setAnalysisView: function (sAnalysis) {
            var oModel = this.getView().getModel("otne");
            var oData;

            if (!this._oRawData) {
                oModel.setProperty("/ui/selectedAnalysis", sAnalysis);
                return;
            }
            oData = PreventivasNoEjecutadasService.build(this._oRawData, this._getFilters(), sAnalysis);
            this._applyData(oData);
        },

        _loadData: function (bNotify) {
            var oODataModel = this._getODataModel();
            var oViewModel = this.getView().getModel("otne");
            var mFilters = this._getFilters();
            var sAnalysis = oViewModel.getProperty("/ui/selectedAnalysis") || "NO_EJECUTADAS";
            var iRequest = ++this._iLoadRequest;

            this.getView().setBusy(true);
            PreventivasNoEjecutadasService.load(oODataModel, mFilters, sAnalysis).then(function (oResult) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._oRawData = oResult.rawData;
                this._applyData(oResult.data);
                if (bNotify) {
                    MessageToast.show("Análisis de OT Preventivas actualizado con datos de SAP");
                }
            }.bind(this)).catch(function (oError) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._onLoadError(oError, bNotify);
            }.bind(this)).finally(function () {
                if (iRequest === this._iLoadRequest) {
                    this.getView().setBusy(false);
                }
            }.bind(this));
        },

        _applyData: function (oData) {
            this.getView().getModel("otne").setData(oData);
            this._setAllCauses(oData.causes);
        },

        _onLoadError: function (oError, bNotify) {
            var oModel = this.getView().getModel("otne");
            var sMessage = oError && oError.message || "No fue posible consultar SAP";

            if (!this._oRawData) {
                this._applyData(PreventivasNoEjecutadasService.createEmpty(
                    this._getFilters(),
                    oModel.getProperty("/ui/selectedAnalysis") || "NO_EJECUTADAS"
                ));
            }
            if (window.console && window.console.error) {
                window.console.error("Error al consultar el OData de OT Preventivas", oError);
            }
            if (bNotify) {
                MessageToast.show(sMessage);
            }
        },

        _getODataModel: function () {
            var oComponent = this.getOwnerComponent && this.getOwnerComponent();

            return oComponent && oComponent.getModel("dashboardOData") ||
                this.getView().getModel("dashboardOData");
        },

        _getFilters: function () {
            var mFilters = this.getView().getModel("otne").getProperty("/filters") || {};

            return {
                periodo: mFilters.periodo,
                fechaDesde: mFilters.fechaDesde,
                fechaHasta: mFilters.fechaHasta,
                zona: mFilters.zona,
                cliente: mFilters.cliente,
                responsable: mFilters.responsable
            };
        },

        _getDefaultFilters: function () {
            return {
                periodo: "2026",
                fechaDesde: "01/01/2026",
                fechaHasta: "31/12/2026",
                zona: "TODAS",
                cliente: "TODOS",
                responsable: "TODOS"
            };
        },

        _setAllCauses: function (aCauses) {
            this._aAllCauses = this._clone(aCauses || []);
        },

        _normalizeText: function (sValue) {
            return String(sValue || "").normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        },

        _clone: function (vValue) {
            return JSON.parse(JSON.stringify(vValue));
        }
    });
});
