sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/ui/Device",
    "mantenimiento/model/DetalleOperativoRecursosMapper",
    "mantenimiento/model/DetalleOperativoRecursosService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, includeStylesheet, MessageToast, Device, Mapper, Service, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleOperativoRecursos", {
        onInit: function () {
            this._requestId = 0;
            this._resizeTimer = null;
            this._rawData = null;
            this._context = this._getParentContext();
            this._loadStyles();
            this.getView().setModel(new JSONModel(Service.createEmpty(this._context)), "detalle");
            this.getView().getModel("detalle").setSizeLimit(2000);
            Device.resize.attachHandler(this._schedulePageSize, this);
            this._load();
        },

        onExit: function () {
            Device.resize.detachHandler(this._schedulePageSize, this);
            if (this._resizeTimer) { clearTimeout(this._resizeTimer); }
        },
        onAfterRendering: function () { this._schedulePageSize(); },

        _loadStyles: function () {
            var id = "detalleOperativoRecursosStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleOperativoRecursos.css") + "?v=20260827-odata", id);
            }
        },
        _getParentContext: function () {
            var component = this.getOwnerComponent(), model = component && component.getModel && component.getModel("operationalContext"), data = model && model.getData && model.getData() || {}, parentFilters = data.filters || {}, selected = data.selectedSupervisor || {}, initialPeriod = InitialLoadPeriod.previousMonth();
            return {
                supervisorId: selected.id || "ALL",
                supervisorName: selected.name || "Todos",
                dateFrom: parentFilters.dateFrom || initialPeriod.startIso,
                dateTo: parentFilters.dateTo || initialPeriod.endIso,
                zone: "ALL", resourceType: "ALL", shift: "ALL", status: "ALL", search: ""
            };
        },
        _model: function () { return this.getView().getModel("detalle"); },
        _odata: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },
        _currentFilters: function () {
            var visible = this._model().getProperty("/filters") || {};
            return Object.assign({}, this._context, {
                zone: visible.zone || "ALL", resourceType: visible.resourceType || "ALL", shift: visible.shift || "ALL", status: visible.status || "ALL", search: visible.search || ""
            });
        },
        _load: function () {
            var requestId = ++this._requestId, view = this.getView();
            view.setBusy(true);
            Service.load(this._odata(), this._context).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._rawData = response.rawData;
                this._setData(Mapper.build(this._rawData, this._context), 1);
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._rawData = null;
                this._setData(Service.createEmpty(this._context), 1);
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el detalle de recursos");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },
        _setData: function (data, page) {
            this._model().setData(data);
            this._setPage(page || 1);
            this._schedulePageSize();
        },

        onApplyFilters: function () {
            this._context = this._currentFilters();
            if (this._rawData) {
                this._setData(Mapper.build(this._rawData, this._context), 1);
            }
            MessageToast.show("Filtros aplicados");
        },
        onSearch: function (event) {
            var value = event.getParameter("newValue");
            if (value === undefined) { value = event.getParameter("query") || ""; }
            this._model().setProperty("/filters/search", value);
            this._context = this._currentFilters();
            if (this._rawData) { this._setData(Mapper.build(this._rawData, this._context), 1); }
        },
        onTableFilter: function () { MessageToast.show("Usa los filtros de zona, tipo, turno y estatus de la parte superior."); },

        _schedulePageSize: function () {
            if (this._resizeTimer) { clearTimeout(this._resizeTimer); }
            this._resizeTimer = setTimeout(function () {
                var table = this.byId("resourcesTable"), tableDom = table && table.getDomRef(), size;
                this._resizeTimer = null;
                if (!tableDom || !window.innerHeight) { return; }
                size = Math.max(3, Math.min(10, Math.floor((window.innerHeight - tableDom.getBoundingClientRect().top - 115) / 45)));
                if (size > 0 && Number(this._model().getProperty("/pageSize")) !== size) {
                    this._model().setProperty("/pageSize", size);
                    this._setPage(Number(this._model().getProperty("/currentPage")) || 1);
                }
            }.bind(this), 120);
        },
        _setPage: function (page) {
            var model = this._model(), rows = model.getProperty("/filteredResources") || [], size = Number(model.getProperty("/pageSize")) || 7, totalPages = Math.max(1, Math.ceil(rows.length / size)), current = Math.min(Math.max(1, page), totalPages), start = (current - 1) * size, end = Math.min(start + size, rows.length);
            model.setProperty("/currentPage", current);
            model.setProperty("/totalPages", totalPages);
            model.setProperty("/pageItems", rows.slice(start, end));
            model.setProperty("/showingText", "Mostrando " + (rows.length ? start + 1 : 0) + " a " + end + " de " + rows.length + " recursos");
        },
        onPreviousPage: function () { this._setPage((Number(this._model().getProperty("/currentPage")) || 1) - 1); },
        onNextPage: function () { this._setPage((Number(this._model().getProperty("/currentPage")) || 1) + 1); },

        onViewDetail: function (event) {
            var context = event.getSource().getBindingContext("detalle"), row = context && context.getObject(), component = this.getOwnerComponent(), router;
            if (!row) { return; }
            if (component && component.setModel) { component.setModel(new JSONModel({ context: this._context, selectedResource: { id: row.id, name: row.name } }), "resourceOperationalContext"); }
            router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute("RouteDetalleRecurso")) {
                router.navTo("RouteDetalleRecurso");
                return;
            }
            MessageToast.show("Recurso seleccionado: " + row.name);
        }
    });
});
