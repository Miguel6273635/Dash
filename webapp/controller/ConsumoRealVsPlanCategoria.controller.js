sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Item",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "mantenimiento/model/ConsumoRealVsPlanCategoriaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, Item, MessageToast, Filter, FilterOperator, Service, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.ConsumoRealVsPlanCategoria", {
        onInit: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            this._requestId = 0;
            this._filters = { periodo: initialPeriod.year, fechaDesde: initialPeriod.startDisplay, fechaHasta: initialPeriod.endDisplay, zona: "ALL", cliente: "ALL", responsable: "ALL", tipoOt: "ALL" };
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "crpc");
            this.getView().getModel("crpc").setSizeLimit(2000);
            this._setOptions(this._model().getData());
            this.byId("crpcPeriodo").attachChange(this.onPeriodoChange, this);
            this._load(false);
        },
        onAfterRendering: function () { this._updateStaticTexts(); },
        _model: function () { return this.getView().getModel("crpc"); },
        _odata: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },
        onPeriodoChange: function (event) {
            var year = String(event.getSource().getSelectedKey() || "");
            if (!/^\d{4}$/.test(year)) { return; }
            this._filters.periodo = year;
            this._filters.fechaDesde = "01/01/" + year;
            this._filters.fechaHasta = "31/12/" + year;
            this._model().setProperty("/filtros/periodo", year);
            this._model().setProperty("/filtros/fechaDesde", this._filters.fechaDesde);
            this._model().setProperty("/filtros/fechaHasta", this._filters.fechaHasta);
            this.byId("crpcFechaDesde").setValue(this._filters.fechaDesde);
            this.byId("crpcFechaHasta").setValue(this._filters.fechaHasta);
        },
        onAplicarFiltros: function () {
            this._filters = {
                periodo: this.byId("crpcPeriodo").getSelectedKey() || "2026",
                fechaDesde: this.byId("crpcFechaDesde").getValue() || "01/01/2026",
                fechaHasta: this.byId("crpcFechaHasta").getValue() || "31/12/2026",
                zona: this.byId("crpcZona").getSelectedKey() || "ALL",
                cliente: this.byId("crpcCliente").getSelectedKey() || "ALL",
                responsable: this.byId("crpcResponsable").getSelectedKey() || "ALL",
                tipoOt: this.byId("crpcTipoOt").getSelectedKey() || "ALL"
            };
            if (!this._validRange(this._filters.fechaDesde, this._filters.fechaHasta)) {
                MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta.");
                return;
            }
            this._load(true);
        },
        _load: function (notify) {
            var requestId = ++this._requestId, view = this.getView();
            view.setBusy(true);
            Service.load(this._odata(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._showData(response.data);
                if (notify) { MessageToast.show("Consumo real vs plan actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._showData(Service.createEmpty(this._filters));
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el consumo real vs plan");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },
        _showData: function (data) {
            data.tendenciaSvg = this._crearGraficaTendenciaSvg(data.tendenciaSemanal || []);
            this._model().setData(data);
            this._setOptions(data);
            this.byId("sfMaterial").setValue("");
            this.byId("tblMaterialesDesv").getBinding("items").filter([]);
            this._updateStaticTexts();
        },
        _setOptions: function (data) {
            var options = data.opciones || {}, filters = data.filtros || this._filters;
            this._replaceItems("crpcPeriodo", options.periodos || [], filters.periodo);
            this._replaceItems("crpcZona", options.zonas || [], filters.zona);
            this._replaceItems("crpcCliente", options.clientes || [], filters.cliente);
            this._replaceItems("crpcResponsable", options.responsables || [], filters.responsable);
            this._replaceItems("crpcTipoOt", options.tiposOt || [], filters.tipoOt);
            this.byId("crpcFechaDesde").setValue(filters.fechaDesde);
            this.byId("crpcFechaHasta").setValue(filters.fechaHasta);
        },
        _replaceItems: function (id, rows, key) {
            var select = this.byId(id);
            select.destroyItems();
            rows.forEach(function (row) { select.addItem(new Item({ key: row.key, text: row.text })); });
            select.setSelectedKey(key);
            if (!select.getSelectedItem() && select.getItems().length) { select.setSelectedKey(select.getItems()[0].getKey()); }
        },
        _validRange: function (from, until) {
            var start = this._parseDate(from), end = this._parseDate(until);
            return !!start && !!end && start <= end;
        },
        _parseDate: function (value) {
            var part = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            return part ? new Date(Number(part[3]), Number(part[2]) - 1, Number(part[1])) : null;
        },

        onBuscarMaterial: function (event) {
            var value = event.getParameter("newValue") || "", binding = this.byId("tblMaterialesDesv").getBinding("items");
            binding.filter(value ? [new Filter("material", FilterOperator.Contains, value)] : []);
        },
        onMaterialPress: function (event) {
            var context = event.getSource().getBindingContext("crpc"), row = context && context.getObject();
            if (row && row.key) { this._selectMaterial(row.key); }
        },
        _selectMaterial: function (key) {
            var details = this._model().getProperty("/detailsByMaterial") || {}, selection = details[key];
            if (!selection) { return; }
            this._model().setProperty("/seleccion", selection);
            this._model().setProperty("/detalleConsumo", selection.details || []);
            this._model().setProperty("/tendenciaSemanal", selection.weeks || []);
            this._model().setProperty("/tendenciaSvg", this._crearGraficaTendenciaSvg(selection.weeks || []));
            this._updateStaticTexts();
            MessageToast.show("Detalle de " + selection.material + " (" + selection.unit + ")");
        },
        onVerSemanas: function () {
            var selection = this._model().getProperty("/seleccion") || {};
            MessageToast.show("Se muestran las últimas " + ((selection.weeks || []).length || 0) + " semanas con datos del material seleccionado.");
        },

        _updateStaticTexts: function () {
            var data = this._model().getData() || {}, kpis = data.kpis || {}, summary = data.resumenTabla || {}, selected = data.seleccion || {}, titles, mini, trends, totalCells, totalZones, weekNames, weekDates, success;
            this._findByClass(this.getView(), "crpcKpiSub").forEach(function (control, index) {
                control.setText([kpis.planBase || "Totales separados por unidad", kpis.realBase || "Consumo neto por unidad", kpis.desviacionPct || "Variación por unidad"][index]);
            });
            this._findByClass(this.getView(), "crpcKpiUnit").forEach(function (control) { control.setText(""); });
            this._findByClass(this.getView(), "crpcTotalLabel").forEach(function (control) { control.setText(summary.label || "Totales por unidad"); });
            totalCells = this._findByClass(this.getView(), "crpcTotalCell");
            [summary.plan, summary.real, "Por unidad", "Por unidad", summary.ot, summary.equipos, summary.clientes, summary.deviation].forEach(function (value, index) {
                if (totalCells[index]) { totalCells[index].setText(value || "—"); }
            });
            totalZones = this._findByClass(this.getView(), "crpcTotalZones")[0];
            if (totalZones) {
                this._descendants(totalZones, function (control) { return control.isA && control.isA("sap.m.Text"); }).forEach(function (control, index) { control.setText((summary.zones || [])[index] || "—"); });
            }
            titles = this._findByClass(this.getView(), "crpcCardTitle");
            if (titles[1]) { titles[1].setText("Detalle de consumo - " + (selected.material || "Sin datos")); }
            if (titles[2]) { titles[2].setText("Tendencia semanal - " + (selected.unit || "sin unidad comparable")); }
            this._findByClass(this.getView(), "crpcPill").forEach(function (pill) {
                var label = this._descendants(pill, function (control) { return control.isA && control.isA("sap.m.Text"); })[0];
                if (label) { label.setText(selected.categoria || "Sin categoría"); }
            }.bind(this));
            mini = this._findByClass(this.getView(), "crpcMiniValue");
            [this._quantity(selected.plan, selected.unit), this._quantity(selected.real, selected.unit), this._signed(selected.deviation, selected.unit), selected.variation === null || selected.variation === undefined ? "Sin plan" : this._signedPercent(selected.variation)].forEach(function (value, index) {
                if (mini[index]) { mini[index].setText(value); }
            });
            trends = this._findByClass(this.getView(), "crpcTrendVal");
            [selected.stats && selected.stats.weeks, selected.stats && selected.stats.equipment, selected.stats && selected.stats.clients, selected.stats && selected.stats.zones].forEach(function (value, index) { if (trends[index]) { trends[index].setText(String(value || 0)); } });
            weekNames = this._findByClass(this.getView(), "crpcWeekName");
            weekDates = this._findByClass(this.getView(), "crpcWeekDate");
            (selected.weeks || []).slice(0, 5).forEach(function (week, index) { if (weekNames[index]) { weekNames[index].setText(week.semana); } if (weekDates[index]) { weekDates[index].setText(week.periodo); } });
            for (var index = (selected.weeks || []).length; index < 5; index += 1) { if (weekNames[index]) { weekNames[index].setText("Sin datos"); } if (weekDates[index]) { weekDates[index].setText("—"); } }
            success = this._findByClass(this.getView(), "crpcSuccess")[0];
            if (success) {
                var message = this._descendants(success, function (control) { return control.isA && control.isA("sap.m.Text"); })[0], weeks = selected.weeks || [], highest = weeks.slice().sort(function (a, b) { return b.variacion - a.variacion; })[0];
                if (message) { message.setText(highest && highest.variacion > 0 ? "Mayor desviación: " + highest.semana + " (" + this._signed(highest.variacion, selected.unit) + ")." : "No hay sobreconsumo positivo en las semanas visibles."); }
            }
        },
        _crearGraficaTendenciaSvg: function (rows) {
            var data = (rows || []).slice(0, 5), x = [92, 193, 293, 393, 494], maximum = Math.max.apply(Math, [1].concat(data.map(function (row) { return Math.max(Math.abs(row.plan || 0), Math.abs(row.real || 0), Math.abs(row.variacion || 0)); }))), top = 12, base = 102;
            function y(value) { return base - (Number(value) || 0) / maximum * 78; }
            function points(field) { return data.map(function (row, index) { return x[index] + "," + y(row[field]).toFixed(1); }).join(" "); }
            function marks(field, color) { return data.map(function (row, index) { return '<circle cx="' + x[index] + '" cy="' + y(row[field]).toFixed(1) + '" r="2.6" fill="' + color + '" stroke="#fff" stroke-width="0.8"/>'; }).join(""); }
            return '<div class="crpcTrendSvgInner"><svg viewBox="0 0 560 112" preserveAspectRatio="none" role="img" aria-label="Tendencia semanal del material"><line x1="42" y1="' + top + '" x2="544" y2="' + top + '" stroke="#D8E1EC"/><line x1="42" y1="57" x2="544" y2="57" stroke="#D8E1EC"/><line x1="42" y1="' + base + '" x2="544" y2="' + base + '" stroke="#D8E1EC"/><text x="31" y="' + (top + 3) + '" text-anchor="end" fill="#60738D" font-size="8">' + this._escape(this._number(maximum)) + '</text><text x="31" y="60" text-anchor="end" fill="#60738D" font-size="8">0</text><polyline points="' + points("plan") + '" fill="none" stroke="#93C5FD" stroke-width="1.5"/><polyline points="' + points("real") + '" fill="none" stroke="#2563EB" stroke-width="1.9"/><polyline points="' + points("variacion") + '" fill="none" stroke="#EF4444" stroke-width="1.6" stroke-dasharray="2 4"/>' + marks("plan", "#93C5FD") + marks("real", "#2563EB") + marks("variacion", "#EF4444") + '</svg></div>';
        },
        _quantity: function (value, unit) { return this._number(value) + (unit ? " " + unit : ""); },
        _number: function (value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(Number(value) || 0); },
        _signed: function (value, unit) { return ((Number(value) || 0) > 0 ? "+" : "") + this._quantity(value, unit); },
        _signedPercent: function (value) { return ((Number(value) || 0) > 0 ? "+" : "") + (Number(value) || 0).toFixed(1) + "%"; },
        _findByClass: function (root, className) { return this._descendants(root, function (control) { return control.hasStyleClass && control.hasStyleClass(className); }); },
        _descendants: function (root, predicate) {
            var found = [];
            function visit(control) {
                var children = [];
                if (!control) { return; }
                if (predicate(control)) { found.push(control); }
                if (control.getItems) { children = children.concat(control.getItems() || []); }
                if (control.getContent && !(control.isA && control.isA("sap.ui.core.HTML"))) { children = children.concat(control.getContent() || []); }
                children.forEach(visit);
            }
            visit(root);
            return found;
        },
        _escape: function (value) { return String(value || "").replace(/[&<>"']/g, function (character) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character]; }); }
    });
});
