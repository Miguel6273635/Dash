sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/PreventivasEjecutadasService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, MessageToast, PreventivasEjecutadasService, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisOTPreventivasEjecutadas", {
        onInit: function () {
            var oInitialData = PreventivasEjecutadasService.createEmpty(
                this._getDefaultFilters(),
                "EJECUTADAS"
            );
            var oModel = new JSONModel(oInitialData);

            this._iLoadRequest = 0;
            this._oRawData = null;
            this._aAllResponsables = [];
            oModel.setSizeLimit(1000);
            this.getView().setModel(oModel, "otpe");
            this._setAllResponsables(oInitialData.responsables);
            this._loadData(false);
        },

        onApplyFilters: function () {
            this._loadData(true);
        },

        onPeriodoChange: function (oEvent) {
            var sKey = String(oEvent.getSource().getSelectedKey() || "");
            var oModel = this.getView().getModel("otpe");
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

        onSearchResponsable: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query") ||
                oEvent.getParameter("value") || "";
            var sSearch = this._normalizeText(sValue);
            var aResponsables = this._aAllResponsables;

            if (sSearch) {
                aResponsables = aResponsables.filter(function (oResponsable) {
                    return this._normalizeText(oResponsable.nombre).includes(sSearch);
                }.bind(this));
            }
            this.getView().getModel("otpe").setProperty("/responsables", this._clone(aResponsables));
        },

        onToggleResponsable: function (oEvent) {
            var oSource = oEvent.getSource();
            var oContext = oSource.getBindingContext("otpe");
            var oModel = this.getView().getModel("otpe");
            var sPath;
            var bExpanded;

            if (!oContext) {
                return;
            }
            sPath = oContext.getPath();
            bExpanded = Boolean(oModel.getProperty(sPath + "/expanded"));
            (oModel.getProperty("/responsables") || []).forEach(function (oResponsable, iIndex) {
                oModel.setProperty("/responsables/" + iIndex + "/expanded", false);
            });
            if (!bExpanded) {
                oModel.setProperty(sPath + "/expanded", true);
            }
        },

        _setAnalysisView: function (sAnalysis) {
            var oModel = this.getView().getModel("otpe");
            var oData;

            if (!this._oRawData) {
                oModel.setProperty("/ui/selectedAnalysis", sAnalysis);
                return;
            }
            oData = PreventivasEjecutadasService.build(this._oRawData, this._getFilters(), sAnalysis);
            this._applyData(oData);
        },

        _loadData: function (bNotify) {
            var oODataModel = this._getODataModel();
            var oViewModel = this.getView().getModel("otpe");
            var mFilters = this._getFilters();
            var sAnalysis = oViewModel.getProperty("/ui/selectedAnalysis") || "EJECUTADAS";
            var iRequest = ++this._iLoadRequest;

            this.getView().setBusy(true);
            PreventivasEjecutadasService.load(oODataModel, mFilters, sAnalysis).then(function (oResult) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._oRawData = oResult.rawData;
                this._applyData(oResult.data);
                if (bNotify) {
                    MessageToast.show("Análisis de OT Preventivas ejecutadas actualizado con datos de SAP");
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
            this.getView().getModel("otpe").setData(oData);
            this._setAllResponsables(oData.responsables);
        },

        _onLoadError: function (oError, bNotify) {
            var oModel = this.getView().getModel("otpe");
            var sMessage = oError && oError.message || "No fue posible consultar SAP";

            if (!this._oRawData) {
                this._applyData(PreventivasEjecutadasService.createEmpty(
                    this._getFilters(),
                    oModel.getProperty("/ui/selectedAnalysis") || "EJECUTADAS"
                ));
            }
            if (window.console && window.console.error) {
                window.console.error("Error al consultar el OData de OT Preventivas ejecutadas", oError);
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
            var mFilters = this.getView().getModel("otpe").getProperty("/filters") || {};

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
            var initialPeriod = InitialLoadPeriod.previousMonth();
            return {
                periodo: initialPeriod.year,
                fechaDesde: initialPeriod.startDisplay,
                fechaHasta: initialPeriod.endDisplay,
                zona: "TODAS",
                cliente: "TODOS",
                responsable: "TODOS"
            };
        },

        _setAllResponsables: function (aResponsables) {
            this._aAllResponsables = this._clone(aResponsables || []);
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
