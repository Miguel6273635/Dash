sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/ComportamientoOperativoService"
], function (Controller, JSONModel, MessageToast, Fragment, includeStylesheet, Service) {
    "use strict";
    return Controller.extend("mantenimiento.controller.ComportamientoOperativo", {
        onInit: function () {
            var model;
            includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/ComportamientoOperativo.css") + "?v=20260821-live-data");
            this._request = 0; this._origin = "TODAS"; this._filters = { periodo: "2026-ANUAL", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "TODAS", origen: "TODAS" };
            model = new JSONModel(Service.createEmpty(this._filters)); model.setSizeLimit(1000); this.getView().setModel(model, "data"); this._load(false);
        },
        onPeriodoChange: function (event) {
            var key = event.getSource().getSelectedKey() || "2026-ANUAL", c = Service.getFilterContext({ periodo: key }), model = this.getView().getModel("data");
            if (c.startDate && c.endDate) { model.setProperty("/filtros/fechaDesde", this._date(c.startDate)); model.setProperty("/filtros/fechaHasta", this._date(c.endDate)); }
        },
        onApplyFilters: function () {
            var model = this.getView().getModel("data");
            this._filters = { periodo: this.byId("coPeriod").getSelectedKey() || "2026-ANUAL", fechaDesde: model.getProperty("/filtros/fechaDesde"), fechaHasta: model.getProperty("/filtros/fechaHasta"), zona: this.byId("coZone").getSelectedKey() || "TODAS", origen: this._origin };
            this._load(true);
        },
        onOriginTabPress: function (event) { this._origin = event.getSource().data("origin") || "TODAS"; this.byId("coOrigin").setSelectedKey(this._origin); this._rebuild(); this._paintTabs(); },
        onOriginSelectChange: function (event) { this._origin = event.getSource().getSelectedKey() || "TODAS"; this._rebuild(); this._paintTabs(); },
        onResponsablePress: function (event) {
            var source = event.getSource(), context = source.getBindingContext("data"), view = this.getView();
            if (!context) { return; }
            if (!this._popover) { this._popover = Fragment.load({ id: view.getId(), name: "mantenimiento.view.ResponsablePopover", controller: this }).then(function (popover) { view.addDependent(popover); return popover; }); }
            this._popover.then(function (popover) { popover.setModel(new JSONModel(context.getObject()), "popover"); popover.openBy(source); });
        },
        onVerDetalleResponsable: function () {
            var popover = this.byId("responsablePopover");
            var data = popover && popover.getModel("popover").getData();
            var component = this.getOwnerComponent();
            var filters = this.getView().getModel("data").getProperty("/filtros") || {};

            if (popover) {
                popover.close();
            }
            if (!data) {
                MessageToast.show("Detalle no disponible");
                return;
            }

            /*
             * El detalle recibe el ResourceId real, no el nombre mostrado.
             * Al agregar la ruta de DetalleResponsable, este mismo modelo queda
             * disponible para que la nueva vista cargue al responsable correcto.
             */
            component.setModel(new JSONModel({
                responsableId: data.responsableId,
                periodKey: filters.periodo || "2026-ANUAL",
                zona: filters.zona || "TODAS",
                origen: filters.origen || this._origin || "TODAS"
            }), "detalleResponsableNavigation");

            MessageToast.show("Contexto preparado para el detalle de " + data.responsable);
        },
        _load: function (notify) {
            var request = ++this._request, model = this.getView().getModel("data"), filters = Object.assign({}, this._filters, { origen: this._origin });
            this.getView().setBusy(true);
            Service.load(this._odata(), filters).then(function (result) { if (request !== this._request) { return; } this._raw = result.rawData; model.setData(result.data); this._setControls(result.data.filtros); this._paintTabs(); }.bind(this)).catch(function (error) { if (request !== this._request) { return; } model.setData(Service.createEmpty(filters)); this._setControls(filters); if (notify) { MessageToast.show(error.message || "No fue posible cargar los responsables"); } }.bind(this)).finally(function () { if (request === this._request) { this.getView().setBusy(false); } }.bind(this));
        },
        _rebuild: function () { var model = this.getView().getModel("data"), filters; if (!this._raw) { return; } filters = Object.assign({}, this._filters, { origen: this._origin }); model.setData(Service.build(this._raw, filters)); this._setControls(model.getProperty("/filtros")); },
        _odata: function () { var component = this.getOwnerComponent(); return component && component.getModel("dashboardOData") || this.getView().getModel("dashboardOData"); },
        _setControls: function (f) { this.byId("coPeriod").setSelectedKey(f.periodo || "2026-ANUAL"); this.byId("coZone").setSelectedKey(f.zona || "TODAS"); this.byId("coOrigin").setSelectedKey(this._origin); },
        _paintTabs: function () { ["Todas", "Internas", "Externas", "Justificadas"].forEach(function (id) { var button = this.byId("coTab" + id), origin = button && button.data("origin"); if (!button) { return; } button.toggleStyleClass("coTabButtonActive", origin === this._origin); button.setType(origin === this._origin ? "Emphasized" : "Transparent"); }.bind(this)); },
        _date: function (d) { return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); },
        getAvatarColor: function (value) { var n = String(value || "").split("").reduce(function (sum, c) { return sum + c.charCodeAt(0); }, 0); return "Accent" + (n % 10 + 1); },
        onExit: function () { if (this._popover) { this._popover.then(function (p) { p.destroy(); }); } }
    });
});
