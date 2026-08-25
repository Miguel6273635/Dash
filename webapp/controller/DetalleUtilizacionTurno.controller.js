sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleUtilizacionTurnoService"
], function (Controller, JSONModel, includeStylesheet, MessageToast, Service) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleUtilizacionTurno", {
        onInit: function () {
            this._requestId = 0;
            this._search = "";
            this._filters = { periodo: "2026", fechaDesde: "2026-01-01", fechaHasta: "2026-12-31", zona: "TODOS", supervisor: "TODOS", mecanico: "TODOS" };
            this._loadStyles();
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "detalleTurno");
            this.getView().getModel("detalleTurno").setSizeLimit(2000);
            this._bindFilterEvents();
            this._load(false);
        },

        _loadStyles: function () {
            var id = "detalleUtilizacionTurnoStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleUtilizacionTurno.css") + "?v=20260824-odata", id);
            }
        },

        _bindFilterEvents: function () {
            var period = this.byId("periodoSelect");
            var from = this.byId("fechaDesdeDatePicker");
            var until = this.byId("fechaHastaDatePicker");
            if (period) { period.attachChange(this.onPeriodoChange, this); }
            if (from) { from.attachChange(this.onFechaChange, this); }
            if (until) { until.attachChange(this.onFechaChange, this); }
        },

        _model: function () { return this.getView().getModel("detalleTurno"); },
        _getODataModel: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },
        _readFilters: function () {
            var filters = this._model().getProperty("/filtros") || {};
            return { periodo: filters.periodo || "2026", fechaDesde: filters.fechaDesde || "2026-01-01", fechaHasta: filters.fechaHasta || "2026-12-31", zona: filters.zona || "TODOS", supervisor: filters.supervisor || "TODOS", mecanico: filters.mecanico || "TODOS" };
        },

        onPeriodoChange: function (event) {
            var year = String(event.getSource().getSelectedKey() || "");
            var model = this._model();
            if (!/^\d{4}$/.test(year)) { return; }
            model.setProperty("/filtros/periodo", year);
            model.setProperty("/filtros/fechaDesde", year + "-01-01");
            model.setProperty("/filtros/fechaHasta", year + "-12-31");
        },

        onFechaChange: function () {
            var filters = this._readFilters();
            var from = String(filters.fechaDesde).match(/^(\d{4})-/);
            var until = String(filters.fechaHasta).match(/^(\d{4})-/);
            if (from && until && from[1] === until[1]) { this._model().setProperty("/filtros/periodo", from[1]); }
        },

        onAplicarFiltros: function () {
            var filters = this._readFilters();
            if (!this._localDate(filters.fechaDesde) || !this._localDate(filters.fechaHasta) || this._localDate(filters.fechaDesde) > this._localDate(filters.fechaHasta)) {
                MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta.");
                return;
            }
            this._filters = filters;
            this._load(true);
        },

        _load: function (notify) {
            var requestId = ++this._requestId;
            var view = this.getView();
            view.setBusy(true);
            Service.load(this._getODataModel(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(response.data);
                this._search = "";
                this._updateOrders();
                if (notify) { MessageToast.show("Utilización por turno actualizada con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(Service.createEmpty(this._filters));
                this._updateOrders();
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar la utilización por turno");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },

        onSeleccionarTurno: function (event) {
            var item = event.getParameter("listItem");
            var context = item && item.getBindingContext("detalleTurno");
            var row = context && context.getObject();
            if (!row || row.esTotal) { return; }
            this._model().setProperty("/turnoSeleccionado", row.turno);
            this._model().setProperty("/pagination/currentPage", 1);
            this._updateOrders();
        },

        onLimpiarTurno: function () {
            this._model().setProperty("/turnoSeleccionado", "");
            this._model().setProperty("/pagination/currentPage", 1);
            this._updateOrders();
        },

        onBuscarOrden: function (event) {
            this._search = event.getParameter("newValue") || event.getParameter("query") || "";
            this._model().setProperty("/pagination/currentPage", 1);
            this._updateOrders();
        },

        onCambiarTamanoPagina: function (event) {
            this._model().setProperty("/pagination/pageSize", event.getSource().getSelectedKey());
            this._model().setProperty("/pagination/currentPage", 1);
            this._updatePagination();
        },
        onPaginaAnterior: function () { this._model().setProperty("/pagination/currentPage", Math.max(1, Number(this._model().getProperty("/pagination/currentPage")) - 1)); this._updatePagination(); },
        onPaginaSiguiente: function () { this._model().setProperty("/pagination/currentPage", Math.min(Number(this._model().getProperty("/pagination/totalPages")), Number(this._model().getProperty("/pagination/currentPage")) + 1)); this._updatePagination(); },
        onIrPaginaUno: function () { this._model().setProperty("/pagination/currentPage", 1); this._updatePagination(); },
        onIrPaginaDos: function () { if (Number(this._model().getProperty("/pagination/totalPages")) >= 2) { this._model().setProperty("/pagination/currentPage", 2); this._updatePagination(); } },

        _updateOrders: function () {
            var model = this._model();
            var orders = model.getProperty("/ordenes") || [];
            var selectedShift = model.getProperty("/turnoSeleccionado") || "";
            var search = String(this._search || "").trim().toLowerCase();
            var filtered = orders.filter(function (order) {
                var searchable;
                if (selectedShift && order.turno !== selectedShift) { return false; }
                if (!search) { return true; }
                searchable = [order.ot, order.cliente, order.elevador, order.zona, order.turno, order.tipoOt, order.responsable, order.estado].join(" ").toLowerCase();
                return searchable.indexOf(search) >= 0;
            });
            model.setProperty("/ordenesFiltradas", filtered);
            this._updatePagination();
        },

        _updatePagination: function () {
            var model = this._model();
            var rows = model.getProperty("/ordenesFiltradas") || [];
            var size = Number(model.getProperty("/pagination/pageSize")) || 10;
            var totalPages = Math.max(1, Math.ceil(rows.length / size));
            var current = Math.min(Math.max(1, Number(model.getProperty("/pagination/currentPage")) || 1), totalPages);
            var start = (current - 1) * size;
            var end = Math.min(start + size, rows.length);
            model.setProperty("/ordenesPaginadas", rows.slice(start, end));
            model.setProperty("/pagination/currentPage", current);
            model.setProperty("/pagination/totalPages", totalPages);
            model.setProperty("/pagination/totalResults", rows.length);
            model.setProperty("/pagination/hasPrevious", current > 1);
            model.setProperty("/pagination/hasNext", current < totalPages);
            model.setProperty("/pagination/showPageTwo", totalPages >= 2);
            model.setProperty("/pagination/resultText", rows.length ? "Mostrando " + (start + 1) + " a " + end + " de " + rows.length + " resultados" : "No se encontraron resultados");
        },

        onVerOrden: function (event) {
            var context = event.getSource().getBindingContext("detalleTurno");
            var row = context && context.getObject();
            var router = this.getOwnerComponent() && this.getOwnerComponent().getRouter();
            if (row && router && router.getRoute && router.getRoute("RouteDetalleOrden")) { router.navTo("RouteDetalleOrden", { ordenId: row.ot }); return; }
            MessageToast.show(row ? "Orden seleccionada: " + row.ot : "No se encontró la orden.");
        },
        onColumnas: function () { MessageToast.show("La tabla muestra OT, cliente, elevador, zona, responsable, plan, real y variación."); },
        onConfiguracion: function () { MessageToast.show("La configuración visual de tabla se conserva para esta vista."); },

        _localDate: function (value) {
            var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
            return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
        }
    });
});
