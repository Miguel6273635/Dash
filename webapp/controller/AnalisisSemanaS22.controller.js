sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "mantenimiento/model/AnalisisGeneralService"
], function (Controller, JSONModel, includeStylesheet, MessageToast, AnalisisGeneralService) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisSemanaS22", {
        onInit: function () {
            this._pageSize = 10;
            this._currentPage = 1;
            this._searchValue = "";
            this._filters = { week: "2026-W26", zone: "TODAS" };
            this._allRows = [];
            this._loadViewStyles();

            this.getView().setModel(new JSONModel(AnalisisGeneralService.createEmpty(this._filters)), "otModel");
            this.getView().getModel("otModel").setSizeLimit(1000);
            this._load(false);
        },

        _loadViewStyles: function () {
            var id = "analisisSemanaS22Stylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(
                    sap.ui.require.toUrl("mantenimiento/css/AnalisisSemanaS22.css") + "?v=20260824-odata",
                    id
                );
            }
        },

        onApplyFilters: function () {
            this._filters = {
                week: this.byId("idSemanaSelect").getSelectedKey() || "2026-W26",
                zone: this.byId("idZonaSelect").getSelectedKey() || "TODAS"
            };
            this._searchValue = "";
            this._currentPage = 1;
            this._load(true);
        },

        onSearch: function (event) {
            var value = event.getParameter("newValue");
            this._searchValue = String(value === undefined ? event.getParameter("query") || "" : value).trim();
            this._currentPage = 1;
            this._renderPage();
        },

        onRowsPerPageChange: function (event) {
            this._pageSize = Number(event.getSource().getSelectedKey()) || 10;
            this._currentPage = 1;
            this._renderPage();
        },

        onGoToPage: function (event) {
            this._currentPage = Number(event.getSource().getText()) || 1;
            this._renderPage();
        },

        onPreviousPage: function () {
            this._currentPage -= 1;
            this._renderPage();
        },

        onNextPage: function () {
            this._currentPage += 1;
            this._renderPage();
        },

        _load: function (notify) {
            var view = this.getView();
            var model = this._getODataModel();
            var requestFilters = Object.assign({}, this._filters);
            var requestId = (this._requestId || 0) + 1;
            this._requestId = requestId;
            view.setBusy(true);

            AnalisisGeneralService.load(model, requestFilters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._allRows = response.data.results || [];
                this.getView().getModel("otModel").setData(response.data);
                this._syncControls(response.data);
                this._renderPage();
                if (notify) { MessageToast.show("Análisis general actualizado con datos de SAP"); }
            }.bind(this)).catch(function (error) {
                if (requestId !== this._requestId) { return; }
                this._allRows = [];
                this.getView().getModel("otModel").setData(AnalisisGeneralService.createEmpty(requestFilters));
                MessageToast.show(error && error.message ? error.message : "No fue posible actualizar el análisis");
            }.bind(this)).finally(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },

        _getODataModel: function () {
            return this.getOwnerComponent().getModel("dashboardOData") || this.getView().getModel("dashboardOData");
        },

        _syncControls: function (data) {
            var filters = data.filters || {};
            this.byId("idSemanaSelect").setSelectedKey(filters.week || "2026-W26");
            this.byId("idZonaSelect").setSelectedKey(filters.zone || "TODAS");
        },

        _renderPage: function () {
            var model = this.getView().getModel("otModel");
            var text = this._normalize(this._searchValue);
            var rows = this._allRows.filter(function (row) {
                var values;
                if (!text) { return true; }
                values = [row.prioridad, row.ot, row.cliente, row.zona, row.elevador, row.causa, row.responsable, row.estado];
                return values.some(function (value) { return this._normalize(value).indexOf(text) >= 0; }.bind(this));
            }.bind(this));
            var total = rows.length;
            var pages = Math.max(1, Math.ceil(total / this._pageSize));
            var page = Math.min(Math.max(this._currentPage, 1), pages);
            var start = (page - 1) * this._pageSize;
            var end = Math.min(start + this._pageSize, total);

            this._currentPage = page;
            model.setProperty("/filters/search", this._searchValue);
            model.setProperty("/results", rows.slice(start, end));
            model.setProperty("/pagination", {
                currentPage: page,
                pageSize: this._pageSize,
                totalPages: pages,
                totalResults: total,
                from: total ? start + 1 : 0,
                to: end,
                canGoPrevious: page > 1,
                canGoNext: page < pages,
                summaryText: "Mostrando " + (total ? start + 1 : 0) + " a " + end + " de " + total + " resultados"
            });
        },

        _normalize: function (value) {
            var text = String(value === null || value === undefined ? "" : value).toLowerCase();
            return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
        }
    });
});
