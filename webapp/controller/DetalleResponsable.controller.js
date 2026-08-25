sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/DetalleResponsableService"
], function (Controller, JSONModel, MessageToast, includeStylesheet, DetalleResponsableService) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleResponsable", {
        onInit: function () {
            var context = this._navigationContext();

            includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleResponsable.css") + "?v=20260821-live-data");
            this._requestId = 0;
            this._rawData = null;
            this._filters = {
                responsableId: context.responsableId || "",
                periodKey: context.periodKey || "2026-ANUAL",
                zona: context.zona || "TODAS",
                origen: context.origen || "TODAS",
                page: 1,
                pageSize: 5
            };

            this.getView().setModel(new JSONModel(
                DetalleResponsableService.createEmpty(this._filters)
            ), "detail");
            this.getView().getModel("detail").setSizeLimit(1000);
            this._load(false);
        },

        onAfterRendering: function () {
            this._paintComplianceDonut();
        },

        onApplyFilters: function () {
            this._filters.periodKey = this.byId("detallePeriodo").getSelectedKey() || "2026-W01";
            this._filters.zona = this.byId("selectZona").getSelectedKey() || "TODAS";
            this._filters.page = 1;
            this._load(true);
        },

        onPageSizeChange: function (event) {
            this._filters.pageSize = Number(event.getSource().getSelectedKey()) || 5;
            this._filters.page = 1;
            this._rebuildFromRaw();
        },

        onPreviousPage: function () {
            this._filters.page = Math.max(1, this._filters.page - 1);
            this._rebuildFromRaw();
        },

        onNextPage: function () {
            var pagination = this.getView().getModel("detail").getProperty("/paginacion") || {};
            this._filters.page = Math.min(Number(pagination.totalPages) || 1, this._filters.page + 1);
            this._rebuildFromRaw();
        },

        onNavBack: function () {
            window.history.go(-1);
        },

        onNavToOrder: function (event) {
            MessageToast.show("Detalle de la orden: " + event.getSource().getText());
        },

        _load: function (notify) {
            var requestId = ++this._requestId;
            var model = this.getView().getModel("detail");

            this.getView().setBusy(true);
            DetalleResponsableService.load(this._odata(), this._filters).then(function (result) {
                if (requestId !== this._requestId) {
                    return;
                }
                this._rawData = result.rawData;
                model.setData(result.data);
                this._syncControls(result.data);
                this._paintComplianceDonutAsync();
                if (notify) {
                    MessageToast.show("Detalle actualizado con datos de SAP");
                }
            }.bind(this)).catch(function (error) {
                if (requestId !== this._requestId) {
                    return;
                }
                model.setData(DetalleResponsableService.createEmpty(this._filters));
                this._syncControls(model.getData());
                this._paintComplianceDonutAsync();
                if (notify) {
                    MessageToast.show(error.message || "No fue posible cargar el detalle del responsable");
                }
            }.bind(this)).finally(function () {
                if (requestId === this._requestId) {
                    this.getView().setBusy(false);
                }
            }.bind(this));
        },

        _rebuildFromRaw: function () {
            var model = this.getView().getModel("detail");

            if (!this._rawData) {
                return;
            }
            model.setData(DetalleResponsableService.build(this._rawData, this._filters));
            this._syncControls(model.getData());
            this._paintComplianceDonutAsync();
        },

        _navigationContext: function () {
            var component = this.getOwnerComponent();
            var model = component && component.getModel("detalleResponsableNavigation");
            return model && model.getData ? model.getData() || {} : {};
        },

        _odata: function () {
            var component = this.getOwnerComponent();
            return component && component.getModel("dashboardOData") || this.getView().getModel("dashboardOData");
        },

        _syncControls: function (data) {
            var filters = data.filtros || {};
            this.byId("detallePeriodo").setSelectedKey(filters.periodKey || "2026-ANUAL");
            this.byId("selectZona").setSelectedKey(filters.zonaKey || "TODAS");
            this.byId("pageSizeSelect").setSelectedKey(String(this._filters.pageSize || 5));
        },

        _paintComplianceDonutAsync: function () {
            window.setTimeout(this._paintComplianceDonut.bind(this), 0);
        },

        _paintComplianceDonut: function () {
            var donut = this.byId("cumplimientoChart");
            var kpi = this.getView().getModel("detail").getProperty("/kpi") || {};
            var value = Math.max(0, Math.min(100, Number(kpi.cumplimientoNumero || 0)));

            if (donut && donut.getDomRef()) {
                donut.getDomRef().style.setProperty("--detalle-compliance-angle", (value * 3.6) + "deg");
            }
        }
    });
});
