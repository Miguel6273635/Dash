sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/AnalisisIntegralReparacionesService"
], function (
    Controller,
    JSONModel,
    MessageToast,
    AnalisisIntegralReparacionesService
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisIntegralReparaciones", {
        onInit: function () {
            var oInitialData = AnalisisIntegralReparacionesService.createEmpty(
                this._getDefaultFilters(),
                "PLANNED"
            );
            var oModel = new JSONModel(oInitialData);

            this._iLoadRequest = 0;
            this._oRawData = null;
            this._mExpandedMaterials = {};

            oModel.setSizeLimit(5000);
            this.getView().setModel(oModel, "intRep");
            this._loadData(false);
        },

        onAplicarFiltros: function () {
            var sValidationError = this._validateDateRange();

            if (sValidationError) {
                this.getView().getModel("intRep").setProperty(
                    "/ui/errorMessage",
                    sValidationError
                );
                MessageToast.show(sValidationError);
                return;
            }
            this._loadData(true);
        },

        onPeriodoChange: function (oEvent) {
            var oModel = this.getView().getModel("intRep");
            var sPeriod = oEvent.getSource().getSelectedKey();
            var aMatch = String(sPeriod || "").match(/(\d{4})$/);
            var sYear;

            if (!aMatch) {
                return;
            }
            sYear = aMatch[1];
            oModel.setProperty("/filters/periodo", "ANUAL_" + sYear);
            oModel.setProperty("/filters/fechaDesde", "01/01/" + sYear);
            oModel.setProperty("/filters/fechaHasta", "31/12/" + sYear);
        },

        _validateDateRange: function () {
            var oStartDate = this.byId("dpDesdeIntegral").getDateValue();
            var oEndDate = this.byId("dpHastaIntegral").getDateValue();

            if (!oStartDate || !oEndDate) {
                return "Selecciona una fecha desde y una fecha hasta válidas.";
            }
            if (oStartDate.getTime() > oEndDate.getTime()) {
                return "La fecha desde no puede ser posterior a la fecha hasta.";
            }
            return "";
        },

        onBuscarMaterial: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue") || oEvent.getParameter("query") || "";
            var oModel = this.getView().getModel("intRep");

            oModel.setProperty("/filters/busquedaMaterial", sQuery.trim());
            if (this._oRawData) {
                this._rebuildFromRawData();
            }
        },

        onToggleMaterial: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("intRep");
            var oModel = this.getView().getModel("intRep");
            var sPath;
            var bExpanded;
            var sMaterialId;

            if (!oContext) {
                return;
            }
            sPath = oContext.getPath();
            bExpanded = !oModel.getProperty(sPath + "/expanded");
            sMaterialId = String(oModel.getProperty(sPath + "/materialId") ||
                oModel.getProperty(sPath + "/material") || "");
            oModel.setProperty(sPath + "/expanded", bExpanded);
            oModel.setProperty(
                sPath + "/chevronIcon",
                bExpanded ? "sap-icon://navigation-down-arrow" : "sap-icon://navigation-right-arrow"
            );
            if (sMaterialId) {
                this._mExpandedMaterials[sMaterialId] = bExpanded;
            }
        },

        onVerPlaneadas: function () {
            this._setAnalysis("PLANNED");
        },

        onVerEjecutadas: function () {
            this._setAnalysis("EXECUTED");
        },

        onVerNoEjecutadas: function () {
            this._setAnalysis("NON_EXECUTED");
        },

        onVerDetalleMaterial: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("intRep");

            if (!oContext) {
                return;
            }
            MessageToast.show(
                "Mostrando las órdenes relacionadas con " + oContext.getProperty("material")
            );
        },

        _setAnalysis: function (sAnalysis) {
            var oModel = this.getView().getModel("intRep");

            oModel.setProperty("/ui/selectedAnalysis", sAnalysis);
            if (this._oRawData) {
                this._rebuildFromRawData(sAnalysis);
            }
        },

        _loadData: function (bNotify) {
            var oODataModel = this._getODataModel();
            var mFilters = this._getFilters();
            var sAnalysis = this.getView().getModel("intRep")
                .getProperty("/ui/selectedAnalysis") || "PLANNED";
            var iRequest = ++this._iLoadRequest;

            this.getView().getModel("intRep").setProperty("/ui/errorMessage", "");
            this.getView().setBusy(true);

            AnalisisIntegralReparacionesService.load(
                oODataModel,
                mFilters,
                sAnalysis
            ).then(function (oResult) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._oRawData = oResult.rawData;
                this._applyData(oResult.data);
                this.getView().setBusy(false);

                this._observeBackgroundPromise(oResult.detailsPromise, iRequest);
                this._observeBackgroundPromise(oResult.enrichmentPromise, iRequest);

                if (bNotify) {
                    MessageToast.show("Órdenes SM01 actualizadas desde SAP");
                }
            }.bind(this)).catch(function (oError) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this.getView().setBusy(false);
                this._onLoadError(oError, bNotify);
            }.bind(this));
        },

        _observeBackgroundPromise: function (oPromise, iRequest) {
            if (!oPromise || typeof oPromise.then !== "function") {
                return;
            }
            oPromise.then(function (oRawData) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._oRawData = oRawData;
                this._rebuildFromRawData();
            }.bind(this)).catch(function (oError) {
                if (iRequest === this._iLoadRequest) {
                    this.getView().getModel("intRep").setProperty(
                        "/ui/errorMessage",
                        oError && oError.message || "No fue posible completar la consulta de SAP"
                    );
                }
            }.bind(this));
        },

        _rebuildFromRawData: function (sAnalysis) {
            var oModel = this.getView().getModel("intRep");
            var sSelectedAnalysis = sAnalysis ||
                oModel.getProperty("/ui/selectedAnalysis") || "PLANNED";
            var oData;

            if (!this._oRawData) {
                return;
            }
            this._rememberExpandedMaterials();
            oData = AnalisisIntegralReparacionesService.build(
                this._oRawData,
                this._getFilters(),
                sSelectedAnalysis
            );
            this._applyData(oData);
        },

        _applyData: function (oData) {
            var oModel = this.getView().getModel("intRep");
            var sWarning;

            (oData.materiales || []).forEach(function (oMaterial) {
                var sMaterialId = String(oMaterial.materialId || oMaterial.material || "");

                if (Object.prototype.hasOwnProperty.call(this._mExpandedMaterials, sMaterialId)) {
                    oMaterial.expanded = this._mExpandedMaterials[sMaterialId];
                    oMaterial.chevronIcon = oMaterial.expanded
                        ? "sap-icon://navigation-down-arrow"
                        : "sap-icon://navigation-right-arrow";
                }
            }.bind(this));
            oModel.setData(oData);
            sWarning = this._getCriticalWarning(oData);
            oModel.setProperty("/ui/errorMessage", sWarning);
        },

        _getCriticalWarning: function (oData) {
            var oMeta = oData.meta || {};
            var aUnavailable = oMeta.unavailableEntitySets || [];
            var oDiagnostics = oMeta.eventDiagnostics;
            var iUnclassified = oData.kpis && oData.kpis.sinClasificar;

            if (aUnavailable.length) {
                return aUnavailable.map(function (oItem) {
                    return oItem.entitySet + ": " + oItem.message;
                }).join(" | ");
            }
            if (!oData.ui || !oData.ui.detailsLoaded || !oDiagnostics) {
                return "";
            }
            if (oDiagnostics.eventosRecibidos === 0) {
                return "SAP no devolvió registros en DashboardOrderEventsSet; " +
                    "no es posible calcular ejecutadas y no ejecutadas.";
            }
            if (oDiagnostics.eventosRelacionadosConSm01 === 0) {
                return "SAP devolvió eventos, pero ninguno corresponde a los OrderId SM01 del periodo.";
            }
            if (Number(iUnclassified) > 0) {
                return iUnclassified + " órdenes SM01 no tienen un estado E0013, E0014 o E0015 reconocido.";
            }
            return "";
        },

        _rememberExpandedMaterials: function () {
            var aMaterials = this.getView().getModel("intRep").getProperty("/materiales") || [];

            aMaterials.forEach(function (oMaterial) {
                var sMaterialId = String(oMaterial.materialId || oMaterial.material || "");

                if (sMaterialId) {
                    this._mExpandedMaterials[sMaterialId] = Boolean(oMaterial.expanded);
                }
            }.bind(this));
        },

        _onLoadError: function (oError, bNotify) {
            var sMessage = oError && oError.message || "No fue posible consultar SAP";
            var oModel = this.getView().getModel("intRep");

            if (!this._oRawData) {
                this._applyData(AnalisisIntegralReparacionesService.createEmpty(
                    this._getFilters(),
                    oModel.getProperty("/ui/selectedAnalysis") || "PLANNED"
                ));
            }
            this.getView().getModel("intRep").setProperty("/ui/errorMessage", sMessage);
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
            var oModel = this.getView() && this.getView().getModel("intRep");
            var mFilters = oModel && oModel.getProperty("/filters") || this._getDefaultFilters();

            return {
                periodo: mFilters.periodo || "ANUAL_2026",
                fechaDesde: mFilters.fechaDesde || "01/01/2026",
                fechaHasta: mFilters.fechaHasta || "31/12/2026",
                zona: mFilters.zona || "TODAS",
                cliente: mFilters.cliente || "TODOS",
                responsable: mFilters.responsable || "TODOS",
                busquedaMaterial: mFilters.busquedaMaterial || ""
            };
        },

        _getDefaultFilters: function () {
            return {
                periodo: "ANUAL_2026",
                fechaDesde: "01/01/2026",
                fechaHasta: "31/12/2026",
                zona: "TODAS",
                cliente: "TODOS",
                responsable: "TODOS",
                busquedaMaterial: ""
            };
        }
    });
});
