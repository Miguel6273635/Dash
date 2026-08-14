sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/AnalisisReparacionesPlaneadasNoEjecutadasService"
], function (
    Controller,
    JSONModel,
    MessageToast,
    AnalisisReparacionesPlaneadasNoEjecutadasService
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisReparacionesPlaneadasNoEjecutadas",
        {
            onInit: function () {
                var oInitialData = AnalisisReparacionesPlaneadasNoEjecutadasService.createEmpty(
                    this._getDefaultFilters(),
                    "NO_EJECUTADAS"
                );
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

            onPeriodoChange: function () {
                this._setFixedDateRange();
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
                    oEvent.getParameter("newValue") ||
                    "";
                var sSearch = this._normalizeText(sValue);
                var aCauses = this._aAllCauses;

                if (sSearch) {
                    aCauses = aCauses.filter(function (oCause) {
                        return [oCause.causa, oCause.material].some(function (sText) {
                            return this._normalizeText(sText).includes(sSearch);
                        }.bind(this));
                    }.bind(this));
                }

                this.getView().getModel("otpe").setProperty(
                    "/causas",
                    this._clone(aCauses)
                );
            },

            onToggleCausa: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext("otpe");
                var oModel = this.getView().getModel("otpe");
                var sPath = oContext
                    ? oContext.getPath() + "/expanded"
                    : oSource.data("path");

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

                oData = AnalisisReparacionesPlaneadasNoEjecutadasService.build(
                    this._oRawData,
                    mFilters,
                    sAnalysis
                );

                this._applyData(oData);
            },

            _loadData: function (bNotify) {
                this._setFixedDateRange();

                var oODataModel = this._getODataModel();
                var mFilters = this._getFilters();
                var sAnalysis = this.getView()
                    .getModel("otpe")
                    .getProperty("/ui/selectedAnalysis") || "NO_EJECUTADAS";
                var iRequest = ++this._iLoadRequest;

                this._log("info", "INICIO DE CONSULTA", {
                    numeroSolicitud: iRequest,
                    serviceUrl: oODataModel && oODataModel.sServiceUrl,
                    filtros: mFilters,
                    analisis: sAnalysis
                });

                this.getView().getModel("otpe").setProperty("/ui/errorMessage", "");
                this.getView().setBusy(true);

                AnalisisReparacionesPlaneadasNoEjecutadasService.load(
                    oODataModel,
                    mFilters,
                    sAnalysis
                ).then(function (oResult) {
                    if (iRequest !== this._iLoadRequest) {
                        return;
                    }

                    this._oRawData = oResult.rawData;
                    this._applyData(oResult.data);

                    this._log("info", "CONSULTA COMPLETADA", {
                        numeroSolicitud: iRequest,
                        registrosOData: oResult.rawData && oResult.rawData.meta &&
                            oResult.rawData.meta.records,
                        filtroEnviado: oResult.rawData && oResult.rawData.meta &&
                            oResult.rawData.meta.ordersFilter,
                        kpisCalculados: oResult.data && oResult.data.kpis,
                        entidadesNoDisponibles: oResult.rawData && oResult.rawData.meta &&
                            oResult.rawData.meta.unavailableEntitySets
                    });

                    if (bNotify) {
                        MessageToast.show(
                            "Análisis de reparaciones actualizado con datos de SAP"
                        );
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
                var sMessage = oError && oError.message ||
                    "No fue posible consultar SAP";

                this._log("error", "FALLO DE CONSULTA", {
                    mensaje: sMessage,
                    error: oError
                });

                if (!this._oRawData) {
                    this._applyData(
                        AnalisisReparacionesPlaneadasNoEjecutadasService.createEmpty(
                            this._getFilters(),
                            oModel.getProperty("/ui/selectedAnalysis") ||
                            "NO_EJECUTADAS"
                        )
                    );
                }
                oModel = this.getView().getModel("otpe");
                oModel.setProperty("/ui/errorMessage", sMessage);

                if (window.console && window.console.error) {
                    window.console.error(
                        "Error al consultar el OData de reparaciones",
                        oError
                    );
                }

                if (bNotify) {
                    MessageToast.show(sMessage);
                }
            },

            _getODataModel: function () {
                var oComponent = this.getOwnerComponent && this.getOwnerComponent();

                return (oComponent && oComponent.getModel("dashboardOData")) ||
                    this.getView().getModel("dashboardOData");
            },

            _getFilters: function () {
                var mFilters = this.getView()
                    .getModel("otpe")
                    .getProperty("/filters") || {};

                return {
                    periodo: "ANUAL_2026",
                    fechaDesde: "01/01/2026",
                    fechaHasta: "31/12/2026",
                    zona: mFilters.zona,
                    cliente: mFilters.cliente,
                    responsable: mFilters.responsable
                };
            },

            _getDefaultFilters: function () {
                return {
                    periodo: "ANUAL_2026",
                    fechaDesde: "01/01/2026",
                    fechaHasta: "31/12/2026",
                    zona: "TODAS",
                    cliente: "TODOS",
                    responsable: "TODOS"
                };
            },

            _setFixedDateRange: function () {
                var oModel = this.getView().getModel("otpe");

                if (!oModel) {
                    return;
                }
                oModel.setProperty("/filters/periodo", "ANUAL_2026");
                oModel.setProperty("/filters/fechaDesde", "01/01/2026");
                oModel.setProperty("/filters/fechaHasta", "31/12/2026");
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
            },

            _log: function (sLevel, sMessage, oDetails) {
                var oConsole = window.console;
                var sMethod = oConsole && typeof oConsole[sLevel] === "function"
                    ? sLevel
                    : "log";

                if (!oConsole || typeof oConsole[sMethod] !== "function") {
                    return;
                }
                oConsole[sMethod](
                    "[ARPNO][Controller] " + sMessage,
                    oDetails
                );
            }
        }
    );
});
