sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/ReparacionesPlaneadasService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, MessageToast, ReparacionesPlaneadasService, InitialLoadPeriod) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisReparacionesPlaneadasNoEjecutadas",
        {
            onInit: function () {
                var oInitialData = ReparacionesPlaneadasService.createEmpty(this._getDefaultFilters(), "NO_EJECUTADAS");
                var oModel = new JSONModel(oInitialData);

                this._iLoadRequest = 0;
                this._oRawData = null;
                oModel.setSizeLimit(1000);
                this.getView().setModel(oModel, "otpe");
                this._setAllCauses(oInitialData.causas);
                this._loadData(false);
            },

            onApplyFilters: function () {
                this._loadData(true);
            },

            onPeriodoChange: function (oEvent) {
                var sKey = oEvent.getSource().getSelectedKey();
                var aMatch = String(sKey || "").match(/^([A-ZÁÉÍÓÚÑ]+)_(\d{4})$/);
                var mMonths = {
                    ENERO: 0,
                    FEBRERO: 1,
                    MARZO: 2,
                    ABRIL: 3,
                    MAYO: 4,
                    JUNIO: 5,
                    JULIO: 6,
                    AGOSTO: 7,
                    SEPTIEMBRE: 8,
                    OCTUBRE: 9,
                    NOVIEMBRE: 10,
                    DICIEMBRE: 11
                };
                var oModel = this.getView().getModel("otpe");
                var iMonth;
                var iYear;
                var iLastDay;
                var sMonth;

                if (!aMatch || !Object.prototype.hasOwnProperty.call(mMonths, aMatch[1])) {
                    return;
                }
                iMonth = mMonths[aMatch[1]];
                iYear = Number(aMatch[2]);
                iLastDay = new Date(iYear, iMonth + 1, 0).getDate();
                sMonth = String(iMonth + 1).padStart(2, "0");
                oModel.setProperty("/filters/fechaDesde", "01/" + sMonth + "/" + iYear);
                oModel.setProperty("/filters/fechaHasta", String(iLastDay).padStart(2, "0") + "/" + sMonth + "/" + iYear);
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

            onSearchCausa: function (oEvent) {
                var sValue = oEvent.getParameter("query") ||
                    oEvent.getParameter("newValue") || "";
                var sSearch = this._normalizeText(sValue);
                var aCauses = this._aAllCauses;

                if (sSearch) {
                    aCauses = aCauses.filter(function (oCause) {
                        return [oCause.causa, oCause.material]
                            .some(function (sText) {
                                return this._normalizeText(sText).includes(sSearch);
                            }.bind(this));
                    }.bind(this));
                }
                this.getView().getModel("otpe").setProperty("/causas", this._clone(aCauses));
            },

            onToggleCausa: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext("otpe");
                var oModel = this.getView().getModel("otpe");
                var sPath;

                // La primera opción corresponde al XML dinámico entregado.
                // La segunda mantiene compatibilidad si la vista anterior aún
                // usa CustomData con una ruta de causa.
                sPath = oContext ? oContext.getPath() + "/expanded" : oSource.data("path");
                if (!sPath) {
                    return;
                }
                oModel.setProperty(sPath, !oModel.getProperty(sPath));
            },

            _setAnalysisView: function (sAnalysis) {
                var oModel = this.getView().getModel("otpe");
                var mFilters = this._getFilters();
                var oData;

                if (!this._oRawData) {
                    oModel.setProperty("/ui/selectedAnalysis", sAnalysis);
                    return;
                }
                oData = ReparacionesPlaneadasService.build(this._oRawData, mFilters, sAnalysis);
                this._applyData(oData);
            },

            _loadData: function (bNotify) {
                var oODataModel = this._getODataModel();
                var mFilters = this._getFilters();
                var sAnalysis = this.getView().getModel("otpe").getProperty("/ui/selectedAnalysis") || "NO_EJECUTADAS";
                var iRequest = ++this._iLoadRequest;

                this.getView().setBusy(true);
                ReparacionesPlaneadasService.load(oODataModel, mFilters, sAnalysis).then(function (oResult) {
                    if (iRequest !== this._iLoadRequest) {
                        return;
                    }
                    this._oRawData = oResult.rawData;
                    this._applyData(oResult.data);
                    if (bNotify) {
                        MessageToast.show("Análisis de reparaciones actualizado con datos de SAP");
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
                this._setAllCauses(oData.causas);
            },

            _onLoadError: function (oError, bNotify) {
                var oModel = this.getView().getModel("otpe");
                var sMessage = oError && oError.message || "No fue posible consultar SAP";

                if (!this._oRawData) {
                    this._applyData(ReparacionesPlaneadasService.createEmpty(
                        this._getFilters(),
                        oModel.getProperty("/ui/selectedAnalysis") || "NO_EJECUTADAS"
                    ));
                }
                if (window.console && window.console.error) {
                    window.console.error("Error al consultar el OData de reparaciones", oError);
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
                var monthKeys = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
                return {
                    periodo: monthKeys[initialPeriod.startDate.getMonth()] + "_" + initialPeriod.year,
                    fechaDesde: initialPeriod.startDisplay,
                    fechaHasta: initialPeriod.endDisplay,
                    zona: "TODAS",
                    cliente: "TODOS",
                    responsable: "TODOS"
                };
            },

            _setAllCauses: function (aCauses) {
                this._aAllCauses = this._clone(aCauses || []);
            },

            _normalizeText: function (sValue) {
                return String(sValue || "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .trim();
            },

            _clone: function (vValue) {
                return JSON.parse(JSON.stringify(vValue));
            }
        }
    );
});
