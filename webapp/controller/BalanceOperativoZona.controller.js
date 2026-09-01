sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Item",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "mantenimiento/model/BalanceOperativoZonaService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, Item, includeStylesheet, MessageToast, Filter, FilterOperator, Service, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.BalanceOperativoZona", {
        onInit: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            this._requestId = 0;
            this._filters = {
                periodo: initialPeriod.year,
                fechaDesde: initialPeriod.startDisplay,
                fechaHasta: initialPeriod.endDisplay,
                turno: "ALL",
                tipoOrden: "ALL",
                supervisor: "ALL",
                zona: "ALL"
            };
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "boz");
            this.getView().getModel("boz").setSizeLimit(2000);
            this._includeStyles();
            this._setOptions(this._model().getData());
            this._load(false);
        },

        onAfterRendering: function () {
            this._configurarGraficaCapacidad();
        },

        _includeStyles: function () {
            var styleId = this.getView().getId() + "--balance-operativo-zona-css";
            if (!document.getElementById(styleId)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/BalanceOperativoZona.css") + "?v=20260827-odata", styleId);
            }
        },

        _model: function () { return this.getView().getModel("boz"); },
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
            this.byId("bozFechaDesde").setValue(this._filters.fechaDesde);
            this.byId("bozFechaHasta").setValue(this._filters.fechaHasta);
        },

        onAplicarFiltros: function () {
            this._filters = {
                periodo: this.byId("bozPeriodo").getSelectedKey() || "2026",
                fechaDesde: this.byId("bozFechaDesde").getValue() || "01/01/2026",
                fechaHasta: this.byId("bozFechaHasta").getValue() || "31/12/2026",
                turno: this.byId("bozTurno").getSelectedKey() || "ALL",
                tipoOrden: this.byId("bozTipoOrden").getSelectedKey() || "ALL",
                supervisor: this.byId("bozSupervisor").getSelectedKey() || "ALL",
                zona: this.byId("bozZona").getSelectedKey() || "ALL"
            };
            if (!this._validRange(this._filters.fechaDesde, this._filters.fechaHasta)) {
                MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta.");
                return;
            }
            this._load(true);
        },

        _load: function (notify) {
            var requestId = ++this._requestId;
            this.getView().setBusy(true);
            Service.load(this._odata(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._showData(response.data);
                if (notify) { MessageToast.show("Balance operativo actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._showData(Service.createEmpty(this._filters));
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el balance operativo por zona");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { this.getView().setBusy(false); }
            }.bind(this));
        },

        _showData: function (data) {
            this._model().setData(data);
            this._setOptions(data);
            this._configurarGraficaCapacidad();
        },

        _setOptions: function (data) {
            var options = data.opciones || {};
            var filters = data.filtros || this._filters;
            this._replaceItems("bozPeriodo", options.periodos || [], filters.periodo);
            this._replaceItems("bozTurno", options.turnos || [], filters.turno);
            this._replaceItems("bozTipoOrden", options.tiposOrden || [], filters.tipoOrden);
            this._replaceItems("bozSupervisor", options.supervisores || [], filters.supervisor);
            this._replaceItems("bozZona", options.zonas || [], filters.zona);
            this.byId("bozFechaDesde").setValue(filters.fechaDesde);
            this.byId("bozFechaHasta").setValue(filters.fechaHasta);
        },

        _replaceItems: function (id, rows, selectedKey) {
            var select = this.byId(id);
            if (!select) { return; }
            select.destroyItems();
            rows.forEach(function (row) { select.addItem(new Item({ key: row.key, text: row.text })); });
            select.setSelectedKey(selectedKey);
            if (!select.getSelectedItem() && select.getItems().length) {
                select.setSelectedKey(select.getItems()[0].getKey());
            }
        },

        _validRange: function (from, until) {
            var start = this._parseDate(from), end = this._parseDate(until);
            return !!start && !!end && start <= end;
        },

        _parseDate: function (value) {
            var match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
        },

        _configurarGraficaCapacidad: function () {
            var chart = this.byId("vfCapacidadDisponible");
            if (!chart) { return; }
            chart.setVizProperties({
                plotArea: {
                    colorPalette: ["#16A34A"],
                    drawingEffect: "normal",
                    marker: { visible: true, size: 7 },
                    dataLabel: { visible: false },
                    line: { width: 3 }
                },
                legend: { visible: true, label: { style: { color: "#172554", fontSize: "10px" } } },
                title: { visible: false },
                valueAxis: {
                    title: { visible: true, text: "Recursos disponibles (uds.)", style: { color: "#16A34A", fontSize: "10px" } },
                    label: { style: { color: "#16A34A", fontSize: "10px" } },
                    gridline: { visible: true }
                },
                categoryAxis: { title: { visible: false }, label: { style: { color: "#172554", fontSize: "10px", fontWeight: "bold" } } },
                tooltip: { visible: true },
                background: { color: "transparent" },
                interaction: { selectability: { mode: "single" } }
            });
        },

        onBuscarZona: function (event) {
            var value = event.getParameter("newValue") || "";
            var table = this.byId("tblBalanceZona");
            var binding = table && table.getBinding("items");
            if (!binding) { return; }
            binding.filter(value ? [new Filter("zona", FilterOperator.Contains, value)] : []);
        }
    });
});
