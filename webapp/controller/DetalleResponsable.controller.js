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
            var routeId = this._routeResourceId();
            var route = this.getOwnerComponent().getRouter().getRoute("RouteDetalleResponsable");

            if (routeId && routeId !== context.responsableId) {
                context = { responsableId: routeId };
            }

            includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleResponsable.css") + "?v=20260821-live-data");
            this._requestId = 0;
            this._rawData = null;
            this._filters = {
                responsableId: context.responsableId || "",
                periodKey: context.periodKey || "2026-ANUAL",
                fechaDesde: context.fechaDesde || "",
                fechaHasta: context.fechaHasta || "",
                zona: context.zona || "TODAS",
                origen: context.origen || "TODAS",
                page: 1,
                pageSize: 5
            };

            this.getView().setModel(new JSONModel(
                DetalleResponsableService.createEmpty(this._filters)
            ), "detail");
            this.getView().getModel("detail").setSizeLimit(1000);
            if (route) {
                route.attachPatternMatched(this._onRouteMatched, this);
                this._detailRoute = route;
            }
            if (this._filters.responsableId) {
                this._load(false);
            }
        },

        onAfterRendering: function () {
            this._paintComplianceDonut();
        },

        onApplyFilters: function () {
            var selectedPeriod = this.byId("detallePeriodo").getSelectedKey() || "2026-ANUAL";
            if (selectedPeriod !== this._filters.periodKey) {
                // Al elegir otro periodo, deja de aplicar el rango heredado de la vista anterior.
                this._filters.fechaDesde = "";
                this._filters.fechaHasta = "";
            }
            this._filters.periodKey = selectedPeriod;
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

        _routeResourceId: function () {
            var match = String(window.location.hash || "").match(/(?:^|[#/])detalle-responsable\/([^/?]+)/);
            try {
                return match ? decodeURIComponent(match[1]) : "";
            } catch (error) {
                return "";
            }
        },

        _onRouteMatched: function (event) {
            var id = event && event.getParameter("arguments") && event.getParameter("arguments").responsableId;
            var context = this._navigationContext();
            var next;

            if (!id) {
                return;
            }
            next = context.responsableId === id ? context : { responsableId: id };
            if (id === this._filters.responsableId &&
                (next.periodKey || "2026-ANUAL") === this._filters.periodKey &&
                (next.fechaDesde || "") === (this._filters.fechaDesde || "") &&
                (next.fechaHasta || "") === (this._filters.fechaHasta || "") &&
                (next.zona || "TODAS") === this._filters.zona &&
                (next.origen || "TODAS") === this._filters.origen) {
                return;
            }
            this._filters = Object.assign({}, this._filters, {
                responsableId: id,
                periodKey: next.periodKey || "2026-ANUAL",
                fechaDesde: next.fechaDesde || "",
                fechaHasta: next.fechaHasta || "",
                zona: next.zona || "TODAS",
                origen: next.origen || "TODAS",
                page: 1
            });
            this._load(false);
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
        },

        onExit: function () {
            if (this._detailRoute) {
                this._detailRoute.detachPatternMatched(this._onRouteMatched, this);
            }
        }
    });
});
