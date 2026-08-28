sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleCargaSupervisorService"
], function (Controller, JSONModel, includeStylesheet, MessageToast, Service) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCargaSupervisor", {
        onInit: function () {
            this._requestId = 0;
            this._filters = this._initialFilters();
            this._aFilteredResources = [];
            this._aFilteredMaterialsByResource = [];
            this._loadStyles();
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)));
            this.getView().getModel().setSizeLimit(2000);
            this.getView().setModel(new JSONModel({ activeTab: "carga" }), "view");
            this.byId("selPeriodo").attachChange(this.onPeriodChange, this);
            this.byId("dpFechaDesde").attachChange(this.onDateChange, this);
            this.byId("dpFechaHasta").attachChange(this.onDateChange, this);
            this._load(false);
        },

        onAfterRendering: function () { this._scheduleVisualSummary(); },

        _loadStyles: function () {
            var id = "detalleCargaSupervisorStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleCargaSupervisor.css") + "?v=20260827-odata", id);
            }
        },
        _model: function () { return this.getView().getModel(); },
        _odata: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },
        _initialFilters: function () {
            var component = this.getOwnerComponent(), context = component && (component.getModel("operationalContext") || component.getModel("supervisorContext")), data = context && context.getData && context.getData(), inherited = data && data.filters || {}, selected = data && data.selectedSupervisor || {};
            return {
                periodo: inherited.period || "2026",
                fechaDesde: inherited.dateFrom || inherited.fechaDesde || "2026-01-01",
                fechaHasta: inherited.dateTo || inherited.fechaHasta || "2026-12-31",
                gerencia: inherited.management || inherited.gerencia || "ALL",
                jefatura: inherited.headquarters || inherited.headship || inherited.jefatura || "ALL",
                supervisor: selected.id || inherited.supervisor || "ALL",
                tipoServicio: inherited.serviceType || inherited.tipoServicio || "ALL"
            };
        },
        _readFilters: function () {
            var filters = this._model().getProperty("/filters") || {};
            return {
                periodo: filters.periodo || "2026",
                fechaDesde: filters.fechaDesde || "2026-01-01",
                fechaHasta: filters.fechaHasta || "2026-12-31",
                gerencia: filters.gerencia || "ALL",
                jefatura: filters.jefatura || "ALL",
                supervisor: filters.supervisor || "ALL",
                tipoServicio: filters.tipoServicio || "ALL"
            };
        },
        onPeriodChange: function (event) {
            var year = String(event.getSource().getSelectedKey() || "");
            if (!/^\d{4}$/.test(year)) { return; }
            this._model().setProperty("/filters/periodo", year);
            this._model().setProperty("/filters/fechaDesde", year + "-01-01");
            this._model().setProperty("/filters/fechaHasta", year + "-12-31");
        },
        onDateChange: function () {
            var filters = this._readFilters(), start = String(filters.fechaDesde).match(/^(\d{4})-\d{2}-\d{2}$/), end = String(filters.fechaHasta).match(/^(\d{4})-\d{2}-\d{2}$/);
            if (start && end && start[1] === end[1]) { this._model().setProperty("/filters/periodo", start[1]); }
        },
        onApplyFilters: function () {
            var filters = this._readFilters();
            if (!this._date(filters.fechaDesde) || !this._date(filters.fechaHasta) || this._date(filters.fechaDesde) > this._date(filters.fechaHasta)) {
                MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta.");
                return;
            }
            this._filters = filters;
            this._load(true);
        },
        _load: function (notify) {
            var requestId = ++this._requestId, view = this.getView(), activeTab = view.getModel("view").getProperty("/activeTab") || "carga";
            view.setBusy(true);
            Service.load(this._odata(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(response.data);
                this._aFilteredResources = (response.data.allResources || []).slice();
                this._aFilteredMaterialsByResource = (response.data.allMaterialsByResource || []).slice();
                this._model().setProperty("/pagination/page", 1);
                this._model().setProperty("/materialsPagination/page", 1);
                this._refreshPagination();
                this._refreshMaterialsPagination();
                this._setTab(activeTab);
                this._scheduleVisualSummary();
                if (notify) { MessageToast.show("Detalle de supervisor actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(Service.createEmpty(this._filters));
                this._aFilteredResources = [];
                this._aFilteredMaterialsByResource = [];
                this._refreshPagination();
                this._refreshMaterialsPagination();
                this._scheduleVisualSummary();
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el detalle de supervisor");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },

        onTabPress: function (event) { this._setTab(event.getSource().data("tab") || "carga"); },
        _setTab: function (tab) {
            var isLoad = tab === "carga";
            this.getView().getModel("view").setProperty("/activeTab", isLoad ? "carga" : "materiales");
            this.byId("btnTabCarga").toggleStyleClass("dcsTabActive", isLoad);
            this.byId("btnTabMateriales").toggleStyleClass("dcsTabActive", !isLoad);
            this._scheduleVisualSummary();
        },

        onPageSizeChange: function (event) {
            var item = event.getParameter("selectedItem");
            if (item) { this._model().setProperty("/pagination/pageSize", item.getKey()); }
            this._model().setProperty("/pagination/page", 1);
            this._refreshPagination();
        },
        onPaginationPress: function (event) {
            this._changePage("/pagination", event.getSource().data("action"));
            this._refreshPagination();
        },
        onMaterialsPageSizeChange: function (event) {
            var item = event.getParameter("selectedItem");
            if (item) { this._model().setProperty("/materialsPagination/pageSize", item.getKey()); }
            this._model().setProperty("/materialsPagination/page", 1);
            this._refreshMaterialsPagination();
        },
        onMaterialsPaginationPress: function (event) {
            this._changePage("/materialsPagination", event.getSource().data("action"));
            this._refreshMaterialsPagination();
        },
        _changePage: function (path, action) {
            var current = Number(this._model().getProperty(path + "/page")) || 1, total = Number(this._model().getProperty(path + "/totalPages")) || 1;
            if (action === "first" || action === "page1") { current = 1; }
            if (action === "previous") { current = Math.max(1, current - 1); }
            if (action === "page2") { current = Math.min(2, total); }
            if (action === "next") { current = Math.min(total, current + 1); }
            if (action === "last") { current = total; }
            this._model().setProperty(path + "/page", current);
        },
        _refreshPagination: function () {
            this._refreshPage("/pagination", "/resources", this._aFilteredResources, "");
        },
        _refreshMaterialsPagination: function () {
            this._refreshPage("/materialsPagination", "/materialsByResource", this._aFilteredMaterialsByResource, " registros");
        },
        _refreshPage: function (paginationPath, listPath, rows, suffix) {
            var model = this._model(), page = Number(model.getProperty(paginationPath + "/page")) || 1, size = Number(model.getProperty(paginationPath + "/pageSize")) || 10, total = rows.length, pages = Math.max(1, Math.ceil(total / size)), start;
            page = Math.max(1, Math.min(page, pages));
            start = (page - 1) * size;
            model.setProperty(listPath, rows.slice(start, start + size));
            model.setProperty(paginationPath + "/page", page);
            model.setProperty(paginationPath + "/total", total);
            model.setProperty(paginationPath + "/totalPages", pages);
            model.setProperty(paginationPath + "/label", (total ? start + 1 : 0) + " - " + Math.min(start + size, total) + " de " + total + suffix);
        },

        /* La maqueta usa leyendas HTML con texto fijo. Se actualizan sin tocar el diseño del XML/CSS. */
        _scheduleVisualSummary: function () {
            window.setTimeout(function () { this._syncVisualSummary(); }.bind(this), 0);
        },
        _syncVisualSummary: function () {
            var service = this._model().getProperty("/servicePressure") || [], materials = this._model().getProperty("/materialCategories") || [], labels = this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("dcsLegendLabel"); }), values = this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("dcsLegendValue"); }), root = this.getView().getDomRef(), donuts, colors = ["#0a6ed1", "#18a957", "#f5a700", "#14a7a1", "#7434d8"];
            service.slice(0, 3).forEach(function (item, index) {
                if (labels[index]) { labels[index].setText(item.type); }
                if (values[index]) { values[index].setText(item.percent.toFixed(1) + "% (" + this._display(item.hours) + " h)"); }
            }.bind(this));
            for (var i = service.length; i < 3; i += 1) {
                if (labels[i]) { labels[i].setText("Sin datos"); }
                if (values[i]) { values[i].setText("—"); }
            }
            materials.slice(0, 5).forEach(function (item, index) {
                var offset = index + 3;
                if (labels[offset]) { labels[offset].setText(item.category); }
                if (values[offset]) { values[offset].setText(item.percent.toFixed(1) + "% (" + this._display(item.quantity) + (item.unit ? " " + item.unit : "") + ")"); }
            }.bind(this));
            for (var j = materials.length; j < 5; j += 1) {
                var materialOffset = j + 3;
                if (labels[materialOffset]) { labels[materialOffset].setText("Sin datos"); }
                if (values[materialOffset]) { values[materialOffset].setText("—"); }
            }
            if (!root) { return; }
            donuts = root.querySelectorAll(".dcsDonutChart");
            if (donuts[0]) { donuts[0].style.background = this._gradient(service, colors); }
            if (donuts[1]) { donuts[1].style.background = this._gradient(materials, colors); }
        },
        _gradient: function (rows, colors) {
            var current = 0, parts = [];
            if (!rows.length) { return "conic-gradient(#e7edf5 0 100%)"; }
            rows.forEach(function (row, index) {
                var value = Math.max(0, Math.min(100, Number(row.percent) || 0)), next = current + value;
                parts.push(colors[index % colors.length] + " " + current + "% " + next + "%");
                current = next;
            });
            if (current < 100) { parts.push("#e7edf5 " + current + "% 100%"); }
            return "conic-gradient(" + parts.join(", ") + ")";
        },
        _display: function (value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(Number(value) || 0); },

        onOpenOrders: function (event) {
            var context = event.getSource().getBindingContext(), row = context && context.getObject(), component = this.getOwnerComponent(), router;
            if (!row) { return; }
            if (component && component.setModel) { component.setModel(new JSONModel({ filters: this._readFilters(), selectedResource: { id: row.id, name: row.nombre } }), "supervisorResourceContext"); }
            router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute("RouteOrdenesSupervisor")) { router.navTo("RouteOrdenesSupervisor", { recursoId: row.id }); return; }
            MessageToast.show("Recurso seleccionado: " + row.nombre);
        },
        onOpenMaterialResources: function (event) {
            var context = event.getSource().getBindingContext(), row = context && context.getObject(), component = this.getOwnerComponent(), router;
            if (!row) { return; }
            router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute("RouteDetalleMaterialesRecurso")) { router.navTo("RouteDetalleMaterialesRecurso", { recursoId: row.recursoId }); return; }
            MessageToast.show("Consumo seleccionado: " + row.recurso);
        },
        onOpenMaterialDetail: function (event) { this.onOpenMaterialResources(event); },
        onOpenCapacityReport: function () { this._navigate("RouteReporteCargaCapacidad", "Reporte de carga y capacidad"); },
        onOpenMaterialsReport: function () { this._navigate("RouteReporteMaterialesSupervisor", "Detalle de consumo de materiales"); },
        onBackToSupervisor: function () { this._navigate("RouteVistaSupervisor", "No se encontró la ruta de Vista Supervisor"); },
        _navigate: function (routeName, fallback) {
            var component = this.getOwnerComponent(), router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute(routeName)) { router.navTo(routeName); return; }
            MessageToast.show(fallback);
        },

        formatUtilizationState: function (value) { return Number(value) >= 90 ? "Error" : Number(value) >= 80 ? "Warning" : "Success"; },
        formatServiceState: function (service) {
            var value = String(service || "").toLowerCase();
            return value.indexOf("correct") >= 0 ? "Error" : value.indexOf("plane") >= 0 || value.indexOf("program") >= 0 ? "Success" : value.indexOf("call") >= 0 || value.indexOf("centro") >= 0 ? "Warning" : "None";
        },
        formatStatusState: function (status) { return status === "Crítico" ? "Error" : status === "Alto" ? "Warning" : status === "Normal" ? "Success" : status === "Bajo" ? "Information" : "None"; },
        formatVariationState: function (state) { return state || "None"; },
        formatMaterialStatusState: function (state) { return state || "None"; },

        _find: function (root, predicate) {
            var result = [];
            function visit(control) {
                var content;
                if (!control) { return; }
                if (predicate(control)) { result.push(control); }
                if (control.getItems) { (control.getItems() || []).forEach(visit); }
                if (control.getContent && !(control.isA && control.isA("sap.ui.core.HTML"))) {
                    content = control.getContent();
                    if (Array.isArray(content)) { content.forEach(visit); }
                }
            }
            visit(root);
            return result;
        },
        _date: function (value) {
            var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
            return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
        }
    });
});
