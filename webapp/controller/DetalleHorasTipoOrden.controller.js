sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/dom/includeStylesheet",
  "sap/m/MessageToast",
  "mantenimiento/model/DetalleHorasTipoOrdenService"
], function (Controller, JSONModel, includeStylesheet, MessageToast, Service) {
  "use strict";

  return Controller.extend("mantenimiento.controller.DetalleHorasTipoOrden", {
    onInit: function () {
      this._requestId = 0;
      this._allOrders = [];
      this._filters = { periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "TODOS", supervisor: "TODOS", turno: "TODOS", tipoOrden: "SM01", estado: "TODOS" };
      this._loadStyles();
      this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "dhto");
      this.getView().getModel("dhto").setSizeLimit(2000);
      this._bindDateEvents();
      this._load(false);
    },

    _loadStyles: function () {
      var id = "detalleHorasTipoOrdenStylesheet";
      if (!document.getElementById(id)) {
        includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/DetalleHorasTipoOrden.css") + "?v=20260824-odata", id);
      }
    },

    _model: function () { return this.getView().getModel("dhto"); },
    _getODataModel: function () {
      var component = this.getOwnerComponent();
      return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
    },
    _readFilters: function () {
      var filters = this._model().getProperty("/filters") || {};
      return { periodo: filters.periodo || "2026", fechaDesde: filters.fechaDesde || "01/01/2026", fechaHasta: filters.fechaHasta || "31/12/2026", zona: filters.zona || "TODOS", supervisor: filters.supervisor || "TODOS", turno: filters.turno || "TODOS", tipoOrden: filters.tipoOrden || "SM01", estado: filters.estado || "TODOS" };
    },

    /* La vista original no nombra los controles de periodo/fecha; se enlazan sin tocar el diseño. */
    _bindDateEvents: function () {
      var selects = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.Select"); });
      var dates = this._find(this.getView(), function (control) { return control.isA && control.isA("sap.m.DatePicker"); });
      if (selects[0]) { selects[0].attachChange(this.onPeriodoChange, this); }
      dates.forEach(function (control) { control.attachChange(this.onFechaChange, this); }.bind(this));
    },

    onPeriodoChange: function (event) {
      var year = String(event.getSource().getSelectedKey() || "");
      if (!/^\d{4}$/.test(year)) { return; }
      this._model().setProperty("/filters/periodo", year);
      this._model().setProperty("/filters/fechaDesde", "01/01/" + year);
      this._model().setProperty("/filters/fechaHasta", "31/12/" + year);
    },
    onFechaChange: function () {
      var filters = this._readFilters();
      var from = String(filters.fechaDesde).match(/^\d{2}\/\d{2}\/(\d{4})$/);
      var until = String(filters.fechaHasta).match(/^\d{2}\/\d{2}\/(\d{4})$/);
      if (from && until && from[1] === until[1]) { this._model().setProperty("/filters/periodo", from[1]); }
    },

    onApplyFilters: function () {
      var filters = this._readFilters();
      var start = this._localDate(filters.fechaDesde);
      var end = this._localDate(filters.fechaHasta);
      if (!start || !end || start > end) { MessageToast.show("Revisa que la fecha desde sea menor o igual a la fecha hasta."); return; }
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
        this._allOrders = response.data.ordenes || [];
        this._model().setProperty("/ordenes", this._allOrders);
        this._updateTotals();
        if (notify) { MessageToast.show("Detalle de horas actualizado con datos de SAP"); }
      }.bind(this), function (error) {
        if (requestId !== this._requestId) { return; }
        var empty = Service.createEmpty(this._filters);
        this._model().setData(empty);
        this._allOrders = [];
        this._updateTotals();
        MessageToast.show(error && error.message ? error.message : "No fue posible consultar el detalle de horas");
      }.bind(this)).then(function () {
        if (requestId === this._requestId) { view.setBusy(false); }
      }.bind(this));
    },

    onSearchOrden: function (event) {
      var term = String(event.getParameter("newValue") || event.getParameter("query") || "").trim().toLowerCase();
      var visible = this._allOrders.filter(function (order) {
        return !term || [order.ot, order.cliente, order.elevador, order.zona, order.responsable, order.turno, order.estado].join(" ").toLowerCase().indexOf(term) >= 0;
      });
      this._model().setProperty("/ordenes", visible);
    },

    onExportar: function () {
      var rows = this._model().getProperty("/ordenes") || [];
      var header = ["OT", "Cliente", "Elevador / Equipo", "Zona", "Responsable", "Turno", "Horas plan", "Horas reales", "Variación h", "Variación %", "Estado"];
      var csv = [header].concat(rows.map(function (row) { return [row.ot, row.cliente, row.elevador, row.zona, row.responsable, row.turno, row.horasPlan, row.horasReales, row.variacionH, row.variacionPct, row.estado].map(function (value) { return '"' + String(value || "").replace(/"/g, '""') + '"'; }); })).map(function (row) { return row.join(";"); }).join("\r\n");
      var url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
      var anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "detalle-horas-tipo-orden.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    },
    onColumnas: function () { MessageToast.show("La tabla muestra las columnas definidas para plan, real, variación y estado."); },

    _updateTotals: function () {
      var kpis = this._model().getProperty("/kpis") || {};
      this._find(this.getView(), function (control) { return control.hasStyleClass && control.hasStyleClass("dhtoSummaryTotal"); }).forEach(function (container) {
        var items = container.getItems ? container.getItems() : [];
        if (items[1]) { items[1].setText(kpis.otRelacionadas || "0"); }
        if (items[2]) { items[2].setText(kpis.horasProgramadas || "0 h"); }
        if (items[3]) { items[3].setText(kpis.horasReales || "0 h"); }
        if (items[4]) { items[4].setText(kpis.variacionHoras || "Sin datos"); }
        if (items[5]) { items[5].setText(kpis.variacionPct || "Sin datos"); }
        if (items[6] && items[6].getItems) {
          var statusItems = items[6].getItems();
          if (statusItems[0]) {
            ["dhtoDotRed", "dhtoDotOrange", "dhtoDotGreen"].forEach(function (className) { statusItems[0].removeStyleClass(className); });
            if (kpis.dot) { statusItems[0].addStyleClass(kpis.dot); }
          }
          if (statusItems[1]) { statusItems[1].setText(kpis.text || "Sin datos"); }
        }
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
    _localDate: function (value) { var match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null; }
  });
});
