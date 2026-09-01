sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Item",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History",
    "mantenimiento/model/DetalleCargaCapacidadJefaturaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, Item, includeStylesheet, MessageToast, History, Service, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCargaCapacidadJefatura", {
        onInit: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            this._requestId = 0;
            this._page = 1;
            this._allLoadRows = [];
            this._allMaterialRows = [];
            this._filters = {
                period: initialPeriod.year, from: initialPeriod.startIso, to: initialPeriod.endIso,
                management: "ALL", supervisor: "ALL", shift: "ALL", service: "ALL"
            };

            this._loadStyles();
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "view");
            this._model().setSizeLimit(2000);
            this._configureFilters();
            this._bindDateEvents();
            this._load(false);
        },

        onAfterRendering: function () {
            this._syncTabStyles();
            this._updatePaginationText();
        },

        _loadStyles: function () {
            var id = "detalleCargaCapacidadJefaturaStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleCargaCapacidadJefatura.css") + "?v=20260827-odata", id);
            }
        },

        _model: function () { return this.getView().getModel("view"); },

        _odata: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },

        /* El XML recibido tenía listas mock. Se sustituyen al iniciar por las opciones OData,
         * conservando el mismo control Select y su mismo diseño. */
        _configureFilters: function () {
            var selects = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.Select"); }), paths = ["/periodOptions", "/headshipOptions", "/supervisorOptions", "/shiftOptions", "/serviceOptions"];
            selects.slice(0, paths.length).forEach(function (select, index) {
                select.unbindItems();
                select.destroyItems();
                select.bindItems({
                    path: "view>" + paths[index],
                    template: new Item({ key: "{view>key}", text: "{view>text}" })
                });
            });
        },

        _bindDateEvents: function () {
            var selects = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.Select"); }), dates = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.DatePicker"); });
            if (selects[0]) { selects[0].attachChange(this.onPeriodChange, this); }
            dates.forEach(function (control) { control.attachChange(this.onDateChange, this); }.bind(this));
        },

        _readFilters: function () {
            var values = this._model().getProperty("/filters") || {};
            return {
                period: values.period || "2026",
                from: values.from || "2026-01-01",
                to: values.to || "2026-12-31",
                management: values.management || "ALL",
                supervisor: values.supervisor || "ALL",
                shift: values.shift || "ALL",
                service: values.service || "ALL"
            };
        },

        onPeriodChange: function (event) {
            var year = String(event.getSource().getSelectedKey() || "");
            if (!/^\d{4}$/.test(year)) { return; }
            this._model().setProperty("/filters/period", year);
            this._model().setProperty("/filters/from", year + "-01-01");
            this._model().setProperty("/filters/to", year + "-12-31");
        },

        onDateChange: function () {
            var filters = this._readFilters(), start = String(filters.from).match(/^(\d{4})-\d{2}-\d{2}$/), end = String(filters.to).match(/^(\d{4})-\d{2}-\d{2}$/);
            if (start && end && start[1] === end[1]) { this._model().setProperty("/filters/period", start[1]); }
        },

        onApplyFilters: function () {
            var filters = this._readFilters();
            if (!this._date(filters.from) || !this._date(filters.to) || this._date(filters.from) > this._date(filters.to)) {
                MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta.");
                return;
            }
            this._filters = filters;
            this._load(true);
        },

        _load: function (notify) {
            var requestId = ++this._requestId, view = this.getView(), activeTab = this._model().getProperty("/activeTab") || "carga";
            view.setBusy(true);
            Service.load(this._odata(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                response.data.activeTab = activeTab;
                this._model().setData(response.data);
                this._allLoadRows = (response.data.loadRows || []).slice();
                this._allMaterialRows = (response.data.materialRows || []).slice();
                this._page = 1;
                this._renderPage();
                this._updateStaticKpis();
                if (notify) { MessageToast.show("Detalle de jefatura actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(Service.createEmpty(this._filters));
                this._allLoadRows = [];
                this._allMaterialRows = [];
                this._page = 1;
                this._renderPage();
                this._updateStaticKpis();
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el detalle de jefatura");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },

        /* El diseño trae ObjectNumber estáticos; se actualizan por clase sin cambiar el XML. */
        _updateStaticKpis: function () {
            var kpis = this._model().getProperty("/kpis") || {}, values = [
                kpis.supervisors, kpis.resources, kpis.capacity, kpis.load, kpis.utilization,
                kpis.activeOrders, kpis.movements, kpis.ordersWithMaterials, kpis.materialsUsed,
                kpis.criticalMaterials, kpis.topQuantity, kpis.materialVariation
            ], numbers = this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("jefKpiValue"); });
            numbers.forEach(function (control, index) {
                if (values[index] !== undefined) { control.setNumber(values[index]); }
            });
            if (numbers[10]) { numbers[10].setUnit(kpis.topUnit || ""); }
            this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("jefKpiSubline"); }).forEach(function (control) {
                control.setText(kpis.topMaterial || "Sin datos");
            });
            this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("jefKpiNote"); }).forEach(function (control, index) {
                var notes = ["Órdenes distintas con movimiento", "Materiales distintos", "Criticidad o variación mayor a 15%", "Total consumido", kpis.materialVariation && kpis.materialVariation.charAt(0) === "+" ? "Por encima del plan" : "Por debajo del plan"];
                if (notes[index]) { control.setText(notes[index]); }
            });
        },

        onShowCarga: function () { this._setActiveTab("carga"); },
        onShowMateriales: function () { this._setActiveTab("materiales"); },
        _setActiveTab: function (tab) {
            this._model().setProperty("/activeTab", tab);
            this._page = 1;
            this._renderPage();
            this._syncTabStyles();
        },
        _syncTabStyles: function () {
            var activeTab = this._model().getProperty("/activeTab") || "carga";
            ["tabCargaInCard", "tabCargaTop"].forEach(function (id) {
                var control = this.byId(id);
                if (control) { control.toggleStyleClass("jefTabActive", activeTab === "carga"); }
            }.bind(this));
            ["tabMaterialesInCard", "tabMaterialesTop"].forEach(function (id) {
                var control = this.byId(id);
                if (control) { control.toggleStyleClass("jefTabActive", activeTab === "materiales"); }
            }.bind(this));
        },

        onPageSizeChange: function () {
            this._page = 1;
            this._renderPage();
        },
        onFirstPage: function () { this._page = 1; this._renderPage(); },
        onPreviousPage: function () { this._page -= 1; this._renderPage(); },
        onNextPage: function () { this._page += 1; this._renderPage(); },
        onLastPage: function () {
            var rows = this._activeRows(), size = Number(this._model().getProperty("/pageSize")) || 10;
            this._page = Math.max(1, Math.ceil(rows.length / size));
            this._renderPage();
        },
        _activeRows: function () {
            return (this._model().getProperty("/activeTab") || "carga") === "materiales" ? this._allMaterialRows : this._allLoadRows;
        },
        _renderPage: function () {
            var rows = this._activeRows(), size = Number(this._model().getProperty("/pageSize")) || 10, pages = Math.max(1, Math.ceil(rows.length / size)), current = Math.max(1, Math.min(this._page, pages)), start = (current - 1) * size, slice = rows.slice(start, start + size);
            this._page = current;
            if ((this._model().getProperty("/activeTab") || "carga") === "materiales") {
                this._model().setProperty("/materialRows", slice);
            } else {
                this._model().setProperty("/loadRows", slice);
            }
            this._model().setProperty("/paging", { current: current, total: pages, start: rows.length ? start + 1 : 0, end: Math.min(start + size, rows.length), count: rows.length });
            this._updatePaginationText();
        },
        _updatePaginationText: function () {
            var paging = this._model().getProperty("/paging") || { current: 1, total: 1, start: 0, end: 0, count: 0 };
            this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("jefRecordCount"); }).forEach(function (control) {
                control.setText(paging.start + " - " + paging.end + " de " + paging.count + " registros");
            });
            this._find(this.getView(), function (control) {
                return control.isA && control.isA("sap.m.Button") && control.getType && control.getType() === "Emphasized" && control.getText && /^\d+$/.test(control.getText()) && !control.hasStyleClass("jefApplyButton");
            }).forEach(function (control) { control.setText(String(paging.current)); });
        },

        onSupervisorPress: function (event) {
            var context = event.getSource().getBindingContext("view"), row = context && context.getObject();
            MessageToast.show("Supervisor seleccionado: " + (row && row.supervisor || "Sin supervisor"));
        },
        onViewResources: function (event) {
            var context = event.getSource().getBindingContext("view"), row = context && context.getObject(), component = this.getOwnerComponent(), router, filters = this._readFilters();
            if (component && component.setModel && row) {
                component.setModel(new JSONModel({
                    filters: {
                        period: filters.period, dateFrom: filters.from, dateTo: filters.to,
                        headquarters: filters.management, supervisor: row.supervisorId,
                        shift: filters.shift, serviceType: filters.service
                    },
                    selectedSupervisor: { id: row.supervisorId, name: row.supervisor }
                }), "operationalContext");
            }
            router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute("RouteDetalleOperativoRecursos")) {
                router.navTo("RouteDetalleOperativoRecursos");
                return;
            }
            MessageToast.show("Abrir detalle de recursos de " + (row && row.supervisor || "Supervisor"));
        },
        onViewMaterialDetail: function (event) {
            var context = event.getSource().getBindingContext("view"), row = context && context.getObject();
            MessageToast.show("Consumo de materiales de " + (row && row.supervisor || "Supervisor"));
        },
        onMaterialReport: function () { MessageToast.show("El reporte usa los materiales del período filtrado."); },

        onBackToJefatura: function () {
            var previous = History.getInstance().getPreviousHash(), component, router;
            if (previous !== undefined) { window.history.go(-1); return; }
            component = this.getOwnerComponent();
            router = component && component.getRouter && component.getRouter();
            if (router && router.getRoute && router.getRoute("RouteVistaJefatura")) { router.navTo("RouteVistaJefatura", {}, true); return; }
            MessageToast.show("No se encontró la ruta de Vista Jefatura");
        },

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
