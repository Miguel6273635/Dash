sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleGerenciaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, includeStylesheet, MessageToast, Service, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleGerencia", {
        onInit: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            this._requestId = 0;
            this._filters = { period: initialPeriod.year, dateFrom: initialPeriod.startIso, dateTo: initialPeriod.endIso, management: "ALL", headship: "ALL", zone: "ALL", serviceType: "ALL" };
            this._loadStyles();
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "view");
            this.getView().getModel("view").setSizeLimit(2000);
            this._bindDateEvents();
            this._load(false);
        },

        _loadStyles: function () {
            var id = "detalleGerenciaStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleGerencia.css") + "?v=20260827-odata", id);
            }
        },
        _model: function () { return this.getView().getModel("view"); },
        _odata: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },
        _readFilters: function () {
            var values = this._model().getProperty("/filters") || {};
            return { period: values.period || "2026", dateFrom: values.dateFrom || "2026-01-01", dateTo: values.dateTo || "2026-12-31", management: values.management || "ALL", headship: values.headship || "ALL", zone: values.zone || "ALL", serviceType: values.serviceType || "ALL" };
        },
        _bindDateEvents: function () {
            var selects = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.Select"); }), dates = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.DatePicker"); });
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
            if (!this._date(filters.dateFrom) || !this._date(filters.dateTo) || this._date(filters.dateFrom) > this._date(filters.dateTo)) { MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta."); return; }
            this._filters = filters;
            this._load(true);
        },
        _load: function (notify) {
            var requestId = ++this._requestId, view = this.getView(), section = this._model().getProperty("/activeSection") || "capacity";
            view.setBusy(true);
            Service.load(this._odata(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                response.data.activeSection = section;
                this._model().setData(response.data);
                this._updateStaticKpis();
                if (notify) { MessageToast.show("Detalle de gerencia actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                var empty = Service.createEmpty(this._filters);
                empty.activeSection = section;
                this._model().setData(empty);
                this._updateStaticKpis();
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el detalle de gerencia");
            }.bind(this)).then(function () { if (requestId === this._requestId) { view.setBusy(false); } }.bind(this));
        },

        /* El diseño recibido tiene KPI estáticos. Se actualizan por clase, sin modificar el XML de diseño. */
        _updateStaticKpis: function () {
            var kpis = this._model().getProperty("/kpis") || {}, numbers = this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("dgKpiNumber"); }), values = [kpis.headships, kpis.supervisors, kpis.capacity, kpis.load, kpis.utilization, kpis.activeOrders, kpis.movements, kpis.ordersWithMaterials, kpis.materialsUsed, kpis.criticalMaterials, kpis.topQuantity, kpis.materialVariation];
            numbers.forEach(function (control, index) { if (values[index] !== undefined) { control.setNumber(values[index]); } });
            if (numbers[10]) { numbers[10].setUnit(kpis.topUnit || ""); }
            this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("dgKpiHighlightText"); }).forEach(function (control) { control.setText(kpis.topMaterial || "Sin datos"); });
            this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("dgKpiCaptionAlert"); }).forEach(function (control) { control.setText("Con variación mayor a 5%"); });
            this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("dgKpiCaptionSuccess"); }).forEach(function (control) { control.setText("Basado en material principal"); });
        },

        onOpenMaterials: function () { this._setActiveSection("materials"); },
        onBackToCapacity: function () { this._setActiveSection("capacity"); },
        _setActiveSection: function (section) { if (["capacity", "materials"].indexOf(section) >= 0) { this._model().setProperty("/activeSection", section); } },

        onViewSupervisors: function (event) {
            var context = event.getSource().getBindingContext("view"), row = context && context.getObject(), component = this.getOwnerComponent(), router, headshipId = row && row.id || this._readFilters().headship;
            if (component && component.setModel) { component.setModel(new JSONModel({ filters: this._readFilters(), selectedHeadship: { id: headshipId, name: row && row.jefatura || "Todas" } }), "managementOperationalContext"); }
            router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute("RouteDetalleOperativoSupervisores")) { router.navTo("RouteDetalleOperativoSupervisores"); return; }
            MessageToast.show("Jefatura seleccionada: " + (row && row.jefatura || "Todas"));
        },
        onViewTotals: function () { MessageToast.show("Los totales se calculan con las jefaturas del filtro aplicado."); },
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
