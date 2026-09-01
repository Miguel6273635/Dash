sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/ReparacionesPlaneadasEjecutadasService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, MessageToast, ReparacionesPlaneadasEjecutadasService, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisReparacionesPlaneadasEjecutadas", {
        onInit: function () {
            var oInitialData = ReparacionesPlaneadasEjecutadasService.createEmpty(
                this._getDefaultFilters(),
                "EJECUTADAS"
            );
            var oModel = new JSONModel(oInitialData);

            this._iLoadRequest = 0;
            this._oRawData = null;
            this._aAllMaterials = [];
            oModel.setSizeLimit(1000);
            this.getView().setModel(oModel, "repa");
            this._setAllMaterials(oInitialData.materiales);
            this._loadData(false);
        },

        onAplicarFiltros: function () {
            this._loadData(true);
        },

        onPeriodoChange: function (oEvent) {
            var sKey = String(oEvent.getSource().getSelectedKey() || "");
            var oModel = this.getView().getModel("repa");
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

        onBuscarMaterial: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || oEvent.getParameter("query") ||
                oEvent.getParameter("value") || "";
            var sSearch = this._normalizeText(sValue);
            var aMateriales = this._aAllMaterials;

            if (sSearch) {
                aMateriales = aMateriales.filter(function (oMaterial) {
                    return this._normalizeText(oMaterial.material).includes(sSearch);
                }.bind(this));
            }
            this.getView().getModel("repa").setProperty("/materiales", this._clone(aMateriales));
        },

        onToggleMaterial: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext("repa");
            var oModel = this.getView().getModel("repa");
            var sPath;
            var bExpanded;

            if (!oContext) {
                return;
            }
            sPath = oContext.getPath();
            bExpanded = Boolean(oModel.getProperty(sPath + "/expanded"));
            oModel.setProperty(sPath + "/expanded", !bExpanded);
            oModel.setProperty(sPath + "/chevronIcon", !bExpanded
                ? "sap-icon://navigation-down-arrow"
                : "sap-icon://navigation-right-arrow");
        },

        onVerNoEjecutadas: function () {
            MessageToast.show("La vista de Reparaciones No Ejecutadas conserva el mismo periodo y filtros.");
        },

        onVerTodas: function () {
            MessageToast.show("La vista Todas se habilita cuando se configure su ruta de navegación.");
        },

        _loadData: function (bNotify) {
            var oODataModel = this._getODataModel();
            var oViewModel = this.getView().getModel("repa");
            var mFilters = this._getFilters();
            var sAnalysis = oViewModel.getProperty("/ui/selectedAnalysis") || "EJECUTADAS";
            var iRequest = ++this._iLoadRequest;

            this.getView().setBusy(true);
            ReparacionesPlaneadasEjecutadasService.load(oODataModel, mFilters, sAnalysis).then(function (oResult) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._oRawData = oResult.rawData;
                this._applyData(oResult.data);
                if (bNotify) {
                    MessageToast.show("Análisis de reparaciones ejecutadas actualizado con datos de SAP");
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
            this.getView().getModel("repa").setData(oData);
            this._setAllMaterials(oData.materiales);
        },

        _onLoadError: function (oError, bNotify) {
            var oModel = this.getView().getModel("repa");
            var sMessage = oError && oError.message || "No fue posible consultar SAP";

            if (!this._oRawData) {
                this._applyData(ReparacionesPlaneadasEjecutadasService.createEmpty(
                    this._getFilters(),
                    oModel.getProperty("/ui/selectedAnalysis") || "EJECUTADAS"
                ));
            }
            if (window.console && window.console.error) {
                window.console.error("Error al consultar el OData de reparaciones ejecutadas", oError);
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
            var mFilters = this.getView().getModel("repa").getProperty("/filters") || {};

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

        _setAllMaterials: function (aMaterials) {
            this._aAllMaterials = this._clone(aMaterials || []);
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
