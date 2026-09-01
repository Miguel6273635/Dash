sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "mantenimiento/model/DetalleCapacidadCargaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, includeStylesheet, MessageToast, Filter, FilterOperator, Service, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCapacidadCarga", {
        onInit: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            this._requestId = 0;
            this._filters = {
                periodo: initialPeriod.year,
                fechaDesde: initialPeriod.startDisplay,
                fechaHasta: initialPeriod.endDisplay,
                zona: "TODOS",
                turno: "TODOS",
                supervisor: "TODOS"
            };
            this._loadStyles();
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)));
            this.getView().getModel().setSizeLimit(2000);
            this._wireFilterEvents();
            this._load(false);
        },

        _loadStyles: function () {
            var id = "detalleCapacidadCargaStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleCapacidadCarga.css") + "?v=20260824-odata", id);
            }
        },

        _getODataModel: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },

        _currentFilters: function () {
            var current = this.getView().getModel().getProperty("/filtros") || {};
            return {
                periodo: current.periodo || "2026",
                fechaDesde: current.fechaDesde || "01/01/2026",
                fechaHasta: current.fechaHasta || "31/12/2026",
                zona: current.zona || "TODOS",
                turno: current.turno || "TODOS",
                supervisor: current.supervisor || "TODOS"
            };
        },

        /* La vista recibida no trae IDs en los filtros; se enlazan aquí sin cambiar su diseño XML. */
        _wireFilterEvents: function () {
            var combos = this._findDescendants(this.getView(), function (control) {
                return control.isA && control.isA("sap.m.ComboBox");
            });
            var dates = this._findDescendants(this.getView(), function (control) {
                return control.isA && control.isA("sap.m.DatePicker");
            });
            if (combos[0]) { combos[0].attachChange(this.onPeriodoChange, this); }
            dates.forEach(function (control) { control.attachChange(this.onFechaChange, this); }.bind(this));
        },

        onPeriodoChange: function (event) {
            var year = String(event.getSource().getSelectedKey() || "");
            var model = this.getView().getModel();
            if (!/^\d{4}$/.test(year)) { return; }
            model.setProperty("/filtros/periodo", year);
            model.setProperty("/filtros/fechaDesde", "01/01/" + year);
            model.setProperty("/filtros/fechaHasta", "31/12/" + year);
        },

        onFechaChange: function () {
            var filters = this._currentFilters();
            var from = String(filters.fechaDesde).match(/^\d{2}\/\d{2}\/(\d{4})$/);
            var to = String(filters.fechaHasta).match(/^\d{2}\/\d{2}\/(\d{4})$/);
            if (from && to && from[1] === to[1]) {
                this.getView().getModel().setProperty("/filtros/periodo", from[1]);
            }
        },

        onApplyFilters: function () {
            this._filters = this._currentFilters();
            this._load(true);
        },

        _load: function (notify) {
            var requestId = ++this._requestId;
            var view = this.getView();
            view.setBusy(true);
            Service.load(this._getODataModel(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                view.getModel().setData(response.data);
                this._renderDonut(response.data.charts);
                if (notify) { MessageToast.show("Detalle de capacidad actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                view.getModel().setData(Service.createEmpty(this._filters));
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el detalle de capacidad");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },

        _renderDonut: function (charts) {
            var values = this._findDescendants(this.getView(), function (control) {
                return control.hasStyleClass && control.hasStyleClass("dccLegendValue");
            });
            var html = this._findDescendants(this.getView(), function (control) {
                return control.isA && control.isA("sap.ui.core.HTML");
            })[0];
            if (html) {
                html.setContent('<div class="dccDonut"><div class="dccDonutHole"><span>Capacidad</span><strong>' + this._escape(charts.total) + '</strong></div><span class="dccDonutPercent dccPctOrange">' + this._escape(charts.plannedPct) + '</span><span class="dccDonutPercent dccPctGreen">' + this._escape(charts.capacityPct) + '</span><span class="dccDonutPercent dccPctBlue">' + this._escape(charts.actualPct) + '</span></div>');
            }
            [charts.capacity, charts.planned, charts.actual].forEach(function (value, index) {
                if (values[index]) { values[index].setText(value); }
            });
        },

        _findDescendants: function (root, predicate) {
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

        _escape: function (value) {
            return String(value || "").replace(/[&<>"']/g, function (character) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
            });
        },

        onSearch: function (event) {
            var value = event.getParameter("newValue") || event.getParameter("query") || "";
            var table = this.byId("detalleTable");
            var binding = table && table.getBinding("items");
            if (!binding) { return; }
            if (!value) { binding.filter([]); return; }
            binding.filter([new Filter({
                filters: [
                    new Filter("zona", FilterOperator.Contains, value),
                    new Filter("turno", FilterOperator.Contains, value),
                    new Filter("estado", FilterOperator.Contains, value)
                ],
                and: false
            })]);
        },

        onColumns: function () {
            MessageToast.show("Las columnas visibles corresponden al detalle de capacidad, plan, real y utilización.");
        },

        onExport: function () {
            var rows = this.getView().getModel().getProperty("/detalles") || [];
            var headers = ["Zona", "Turno", "Capacidad disponible (h)", "Horas programadas (h)", "Horas reales (h)", "Margen (h)", "Utilización real / capacidad", "Variación vs programada (h)", "Variación vs programada (%)", "Estado"];
            var csv = [headers].concat(rows.map(function (row) {
                return [row.zona, row.turno, row.capacidad, row.programadas, row.reales, row.margen, row.utilizacion, row.variacionProgH, row.variacionProgP, row.estado].map(function (value) {
                    return '"' + String(value || "").replace(/"/g, '""') + '"';
                });
            })).map(function (row) { return row.join(";"); }).join("\r\n");
            var anchor = document.createElement("a");
            var url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
            anchor.href = url;
            anchor.download = "detalle-capacidad-carga.csv";
            anchor.click();
            URL.revokeObjectURL(url);
        },

        onChangePageSize: function (event) {
            this.getView().getModel().setProperty("/paginacion/pageSize", event.getSource().getSelectedKey());
        },

        formatUtilizacionState: function (value) {
            var numberValue = Number(String(value || "").replace("%", ""));
            if (!Number.isFinite(numberValue)) { return "None"; }
            return numberValue >= 100 ? "Error" : numberValue >= 90 ? "Warning" : "Success";
        },
        formatMargenState: function (value) { return String(value || "").indexOf("-") === 0 ? "Error" : "Success"; },
        formatTrendState: function (value) { return String(value || "").indexOf("+") === 0 ? "Error" : "Success"; },
        formatEstadoState: function (value) { return value === "Sobrecargado" ? "Error" : value === "Cerca de saturación" ? "Warning" : value === "Normal" ? "Success" : "None"; },
        formatEstadoColor: function (value) { return value === "Sobrecargado" ? "#ef4444" : value === "Cerca de saturación" ? "#f59e0b" : value === "Normal" ? "#16a34a" : "#94a3b8"; },
        formatEstadoCircleVisible: function (value) { return value !== "Sin datos"; },
        formatTurnoIconColor: function (value) { return String(value || "").toUpperCase().indexOf("NOCT") >= 0 ? "#7c3aed" : String(value || "").toUpperCase().indexOf("FIN") >= 0 ? "#ef4444" : "#2563eb"; }
    });
});
