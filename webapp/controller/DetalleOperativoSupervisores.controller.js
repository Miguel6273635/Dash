sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/ui/Device",
    "mantenimiento/model/DetalleOperativoSupervisoresService"
], function (Controller, JSONModel, includeStylesheet, MessageToast, Device, Service) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleOperativoSupervisores", {
        onInit: function () {
            this._requestId = 0;
            this._resizeTimer = null;
            this._filters = {
                period: "2026", dateFrom: "2026-01-01", dateTo: "2026-12-31",
                management: "ALL", headquarters: "ALL", supervisor: "ALL", shift: "ALL",
                serviceType: "ALL", resourceType: "ALL", zone: "ALL"
            };
            this._loadStyles();
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "screen");
            this.getView().getModel("screen").setSizeLimit(2000);
            this._bindPeriodEvents();
            Device.resize.attachHandler(this._schedulePageSize, this);
            this._load(false);
        },

        onExit: function () {
            Device.resize.detachHandler(this._schedulePageSize, this);
            if (this._resizeTimer) { clearTimeout(this._resizeTimer); }
        },

        onAfterRendering: function () { this._schedulePageSize(); },

        _loadStyles: function () {
            var id = "detalleOperativoSupervisoresStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleOperativoSupervisores.css") + "?v=20260826-odata", id);
            }
        },
        _model: function () { return this.getView().getModel("screen"); },
        _odata: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },
        _readFilters: function () {
            var values = this._model().getProperty("/filters") || {};
            return {
                period: values.period || "2026", dateFrom: values.dateFrom || "2026-01-01", dateTo: values.dateTo || "2026-12-31",
                management: values.management || "ALL", headquarters: values.headquarters || "ALL", supervisor: values.supervisor || "ALL",
                shift: values.shift || "ALL", serviceType: values.serviceType || "ALL", resourceType: values.resourceType || "ALL", zone: values.zone || "ALL"
            };
        },

        /* El XML original no asigna ids a los filtros; se enlaza el periodo sin alterar su diseño. */
        _bindPeriodEvents: function () {
            var selects = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.Select"); });
            var dates = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.DatePicker"); });
            if (selects[0]) { selects[0].attachChange(this.onPeriodChange, this); }
            dates.forEach(function (control) { control.attachChange(this.onDateChange, this); }.bind(this));
        },
        onPeriodChange: function (event) {
            var year = String(event.getSource().getSelectedKey() || "");
            if (!/^\d{4}$/.test(year)) { return; }
            this._model().setProperty("/filters/period", year);
            this._model().setProperty("/filters/dateFrom", year + "-01-01");
            this._model().setProperty("/filters/dateTo", year + "-12-31");
        },
        onDateChange: function () {
            var filters = this._readFilters(), from = String(filters.dateFrom).match(/^(\d{4})-\d{2}-\d{2}$/), until = String(filters.dateTo).match(/^(\d{4})-\d{2}-\d{2}$/);
            if (from && until && from[1] === until[1]) { this._model().setProperty("/filters/period", from[1]); }
        },

        onApplyFilters: function () {
            var filters = this._readFilters();
            if (!this._date(filters.dateFrom) || !this._date(filters.dateTo) || this._date(filters.dateFrom) > this._date(filters.dateTo)) {
                MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta.");
                return;
            }
            this._filters = filters;
            this._load(true);
        },
        _load: function (notify) {
            var requestId = ++this._requestId, view = this.getView();
            view.setBusy(true);
            Service.load(this._odata(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(response.data);
                this._setPage(1);
                this._schedulePageSize();
                if (notify) { MessageToast.show("Detalle operativo actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(Service.createEmpty(this._filters));
                this._setPage(1);
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el detalle operativo");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },

        _schedulePageSize: function () {
            if (this._resizeTimer) { clearTimeout(this._resizeTimer); }
            this._resizeTimer = setTimeout(function () {
                var table = this.byId("supervisorsTable"), tableDom = table && table.getDomRef(), pageSize;
                this._resizeTimer = null;
                if (!tableDom || !window.innerHeight) { return; }
                pageSize = Math.max(2, Math.min(10, Math.floor((window.innerHeight - tableDom.getBoundingClientRect().top - 135) / 42)));
                if (pageSize > 0 && Number(this._model().getProperty("/pageSize")) !== pageSize) {
                    this._model().setProperty("/pageSize", pageSize);
                    this._setPage(Number(this._model().getProperty("/paging/currentPage")) || 1);
                }
            }.bind(this), 120);
        },
        _setPage: function (page) {
            var model = this._model(), rows = model.getProperty("/filteredSupervisors") || [], summary = model.getProperty("/summaryRow"), size = Number(model.getProperty("/pageSize")) || 10, totalPages = Math.max(1, Math.ceil(rows.length / size)), current = Math.min(Math.max(1, page), totalPages), start = (current - 1) * size, end = Math.min(start + size, rows.length), visible = rows.slice(start, end);
            if (summary && current === totalPages) { visible.push(summary); }
            model.setProperty("/paging/currentPage", current);
            model.setProperty("/paging/totalPages", totalPages);
            model.setProperty("/paging/rangeText", (rows.length ? start + 1 : 0) + " - " + end + " de " + rows.length);
            model.setProperty("/pageItems", visible);
        },
        onFirstPage: function () { this._setPage(1); },
        onPreviousPage: function () { this._setPage((Number(this._model().getProperty("/paging/currentPage")) || 1) - 1); },
        onNextPage: function () { this._setPage((Number(this._model().getProperty("/paging/currentPage")) || 1) + 1); },
        onLastPage: function () { this._setPage(Number(this._model().getProperty("/paging/totalPages")) || 1); },

        onViewSupervisor: function (event) {
            var context = event.getSource().getBindingContext("screen"), row = context && context.getObject(), component = this.getOwnerComponent(), router;
            if (!row || row.isTotal) { return; }
            if (component && component.setModel) {
                component.setModel(new JSONModel({ filters: this._readFilters(), selectedSupervisor: { id: row.id, name: row.supervisor } }), "operationalContext");
            }
            router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute("RouteDetalleOperativoRecursos")) {
                router.navTo("RouteDetalleOperativoRecursos");
                return;
            }
            MessageToast.show("Supervisor seleccionado: " + row.supervisor);
        },
        onTableUpdateFinished: function () {
            var table = this.byId("supervisorsTable");
            if (!table) { return; }
            table.getItems().forEach(function (item) {
                var context = item.getBindingContext("screen");
                item.toggleStyleClass("dosTotalRow", Boolean(context && context.getProperty("isTotal")));
            });
        },
        _find: function (root, predicate) {
            var result = [];
            function visit(control) {
                var content;
                if (!control) { return; }
                if (predicate(control)) { result.push(control); }
                if (control.getItems) { (control.getItems() || []).forEach(visit); }
                if (control.getContent && !(control.isA && control.isA("sap.ui.core.HTML"))) { content = control.getContent(); if (Array.isArray(content)) { content.forEach(visit); } }
            }
            visit(root);
            return result;
        },
        _date: function (value) { var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null; }
    });
});
