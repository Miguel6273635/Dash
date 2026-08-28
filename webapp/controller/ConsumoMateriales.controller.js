sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Item",
    "sap/m/MessageToast",
    "sap/m/Popover",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/VBox",
    "mantenimiento/model/ConsumoMaterialesService"
], function (Controller, JSONModel, Item, MessageToast, Popover, Button, Text, VBox, Service) {
    "use strict";

    return Controller.extend("mantenimiento.controller.ConsumoMateriales", {
        onInit: function () {
            this._requestId = 0;
            this._filters = { periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "TODAS", supervisor: "TODOS", tipoOrden: "TODAS" };
            this.getView().setModel(new JSONModel(Service.createEmpty(this._filters)), "materialesModel");
            this.getView().getModel("materialesModel").setSizeLimit(1000);
            this._setFilterItems(this._model().getData());
            this._attachFilterEvents();
            this._load(false);
        },

        onAfterRendering: function () { this._scheduleStaticPanels(); },
        _model: function () { return this.getView().getModel("materialesModel"); },
        _odata: function () {
            var component = this.getOwnerComponent();
            return component && (component.getModel("dashboardOData") || component.getModel()) || this.getView().getModel("dashboardOData");
        },
        _attachFilterEvents: function () {
            var controls = this._filterControls();
            if (controls.periodo && !controls.periodo.data("cmPeriodAttached")) {
                controls.periodo.data("cmPeriodAttached", true);
                controls.periodo.attachChange(this.onPeriodoChange, this);
            }
        },
        _filterControls: function () {
            var boxes = this._findByClass(this.getView(), "cmFilterBox"), values = boxes.map(function (box) {
                return this._descendants(box, function (control) {
                    return control.isA && (control.isA("sap.m.Select") || control.isA("sap.m.DatePicker"));
                })[0];
            }.bind(this));
            return { periodo: values[0], desde: values[1], hasta: values[2], zona: values[3], supervisor: values[4], tipoOrden: values[5] };
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
            var controls = this._filterControls();
            if (controls.desde) { controls.desde.setValue(this._filters.fechaDesde); }
            if (controls.hasta) { controls.hasta.setValue(this._filters.fechaHasta); }
        },
        onAplicarFiltros: function () {
            var controls = this._filterControls(), desde = controls.desde && controls.desde.getValue(), hasta = controls.hasta && controls.hasta.getValue();
            this._filters = {
                periodo: controls.periodo && controls.periodo.getSelectedKey() || "2026",
                fechaDesde: desde || "01/01/2026",
                fechaHasta: hasta || "31/12/2026",
                zona: controls.zona && controls.zona.getSelectedKey() || "TODAS",
                supervisor: controls.supervisor && controls.supervisor.getSelectedKey() || "TODOS",
                tipoOrden: controls.tipoOrden && controls.tipoOrden.getSelectedKey() || "TODAS"
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
                this._model().setData(response.data);
                this._setFilterItems(response.data);
                this._scheduleStaticPanels();
                if (notify) { MessageToast.show("Consumo de materiales actualizado con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._model().setData(Service.createEmpty(this._filters));
                this._setFilterItems(this._model().getData());
                this._scheduleStaticPanels();
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar el consumo de materiales");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },
        _setFilterItems: function (data) {
            var options = data.opciones || {}, filters = data.filtros || this._filters, controls = this._filterControls();
            this._replaceItems(controls.periodo, options.periodos || [], filters.periodo);
            this._replaceItems(controls.zona, options.zonas || [], filters.zona);
            this._replaceItems(controls.supervisor, options.supervisores || [], filters.supervisor);
            this._replaceItems(controls.tipoOrden, options.tiposOrden || [], filters.tipoOrden);
            if (controls.desde) { controls.desde.setValue(filters.fechaDesde); }
            if (controls.hasta) { controls.hasta.setValue(filters.fechaHasta); }
        },
        _replaceItems: function (select, items, selectedKey) {
            if (!select) { return; }
            select.destroyItems();
            items.forEach(function (row) { select.addItem(new Item({ key: row.key, text: row.text })); });
            select.setSelectedKey(selectedKey);
            if (!select.getSelectedItem() && select.getItems().length) { select.setSelectedKey(select.getItems()[0].getKey()); }
        },
        _validRange: function (from, until) {
            var start = this._parseDate(from), end = this._parseDate(until);
            return !!start && !!end && start <= end;
        },
        _parseDate: function (value) {
            var match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
            return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
        },

        /* Algunas piezas del XML son estáticas para conservar la maqueta original.
           Se actualizan aquí con el mismo ViewModel sin tocar el diseño. */
        _scheduleStaticPanels: function () {
            window.setTimeout(function () { this._updateStaticPanels(); }.bind(this), 0);
        },
        _updateStaticPanels: function () {
            var data = this._model().getData() || {}, types = data.consumoTipoOrden || [], causes = data.otAfectadas || [], mixed = data.meta && data.meta.unitsAreMixed;
            this._findByClass(this.getView(), "cmKpiDeltaDescription").forEach(function (control) {
                control.setText(data.kpis && data.kpis.materialCriticoUnidad ? data.kpis.materialCriticoUnidad + " vs Plan" : "Sin unidad comparable");
            });
            this._setTypeOrderStaticCard(types, mixed);
            this._setCauseStaticCard(causes);
        },
        _setTypeOrderStaticCard: function (rows, hasMixedUnits) {
            var shown = rows.slice(0, 3), sum = shown.reduce(function (value, row) { return value + Math.abs(Number(row.porcentaje) || 0); }, 0), totalText, segments;
            if (!shown.length) { shown = [{ tipo: "Sin datos", totalTexto: "—", porcentajeTexto: "(0%)", porcentaje: 0, estado: "Blue" }]; }
            totalText = hasMixedUnits ? "Consumo por unidad (no aditivo)" : (shown[0] && shown[0].totalTexto || "Sin datos");
            this._findByClass(this.getView(), "cmTipoOrdenTotalText").forEach(function (control) { control.setText(totalText); });
            segments = this._findByClass(this.getView(), "cmStackSegment");
            segments.forEach(function (segment, index) {
                var row = shown[index], value = row ? Math.max(0, Math.min(100, Number(row.porcentaje) || 0)) : 0, textControl = this._descendants(segment, function (control) { return control.isA && control.isA("sap.m.Text"); })[0];
                segment.setWidth((row ? value : 0) + "%");
                if (textControl) { textControl.setText(row ? Math.round(value) + "%" : ""); }
                segment.setVisible(!!row && value > 0);
            }.bind(this));
            if (!sum) { segments.forEach(function (segment) { segment.setVisible(false); }); }
        },
        _setCauseStaticCard: function (rows) {
            var shown = rows.slice(0, 4), legendItems = this._findByClass(this.getView(), "cmOtFinalLegendItem"), html = this._findByClass(this.getView(), "cmOtFinalSvgHtml")[0];
            while (shown.length < 4) { shown.push({ estadoNombre: "Sin datos", ot: 0 }); }
            legendItems.forEach(function (item, index) {
                var label = this._descendants(item, function (control) { return control.isA && control.isA("sap.m.Text"); })[0], row = shown[index];
                if (label) { label.setText(row.estadoNombre + " (" + row.ot + " OT)"); }
            }.bind(this));
            if (html) { html.setContent(this._causesSvg(shown)); }
        },
        _causesSvg: function (rows) {
            var maximum = Math.max.apply(Math, [1].concat(rows.map(function (row) { return Number(row.ot) || 0; }))), colors = ["#ef4444", "#f97316", "#f59e0b", "#6d28d9"], x = [105, 215, 325, 430], labels, bars;
            labels = rows.map(function (row, index) {
                var label = this._escape(row.estadoNombre || "Sin datos");
                return '<text x="' + x[index] + '" y="177" text-anchor="middle" class="cmOtSvgLabel">' + label.slice(0, 18) + '</text>';
            }.bind(this)).join("");
            bars = rows.map(function (row, index) {
                var value = Number(row.ot) || 0, y = 158 - value / maximum * 125;
                return '<text x="' + x[index] + '" y="' + Math.max(18, y - 7) + '" text-anchor="middle" fill="' + colors[index] + '" font-size="10" font-weight="900">' + value + '</text><line x1="' + x[index] + '" y1="' + y + '" x2="' + x[index] + '" y2="158" class="cmOtSvgVertical"/><line x1="' + (x[index] - 14) + '" y1="' + y + '" x2="' + (x[index] + 14) + '" y2="' + y + '" stroke="' + colors[index] + '" stroke-width="5" stroke-linecap="round"/>';
            }).join("");
            return '<svg class="cmOtFinalSvg cmOtFinalSvgLarge" viewBox="0 0 470 190" xmlns="http://www.w3.org/2000/svg"><line x1="48" y1="28" x2="455" y2="28" class="cmOtSvgGrid"/><line x1="48" y1="70" x2="455" y2="70" class="cmOtSvgGrid"/><line x1="48" y1="114" x2="455" y2="114" class="cmOtSvgGrid"/><line x1="48" y1="158" x2="455" y2="158" class="cmOtSvgAxis"/><text x="18" y="25" class="cmOtSvgAxisTitle">OT</text>' + bars + labels + '</svg>';
        },

        onToggleMaterialInfo: function () {
            this._model().setProperty("/ui/materialesInfoVisible", !this._model().getProperty("/ui/materialesInfoVisible"));
        },
        onMaterialesVsPlanInfoPress: function (event) {
            this._openInfo(event.getSource(), "Materiales vs plan", "Compara el plan de DashboardOrderMaterialsSet con el consumo neto de DashboardMaterialMovementsSet. Las variaciones se calculan por categoría y unidad compatible.");
        },
        onTipoOrdenInfoPress: function (event) {
            this._openInfo(event.getSource(), "Consumo por tipo de orden", "El consumo se agrupa por tipo de orden y unidad. Las piezas y litros se muestran separados; no forman un total físico único.");
        },
        onOtAfectadasInfoPress: function (event) {
            this._openInfo(event.getSource(), "OT afectadas", "Cuenta OT únicas con CauseContextCode = MATERIAL. La fuente no define categorías excluyentes como reprogramada o parcial, por lo que no se inventan esos estados.");
        },
        onOpenOtAfectadasInfo: function () { MessageToast.show("Se cuentan OT únicas con una causa de material vigente."); },
        onTopMaterialesInfoPress: function (event) {
            this._openInfo(event.getSource(), "Mayor desviación", "El ranking se calcula por material y unidad, comparando consumo neto contra el plan del mismo material.");
        },
        onTopOrdenesMayorInfoPress: function (event) {
            this._openInfo(event.getSource(), "Órdenes con mayor consumo", "Las órdenes se muestran por unidad. No se suman ni comparan como una sola cantidad los consumos en piezas y litros.");
        },
        onTopOrdenesMenorInfoPress: function (event) {
            this._openInfo(event.getSource(), "Órdenes con menor consumo vs plan", "La variación compara consumo real y plan de cada OT dentro de la misma unidad.");
        },
        _openInfo: function (source, title, message) {
            if (this._infoPopover) { this._infoPopover.destroy(); }
            this._infoPopover = new Popover({
                title: title,
                placement: "Bottom",
                contentWidth: "340px",
                content: [new VBox({ items: [new Text({ text: message, wrapping: true }).addStyleClass("cmInfoPopoverText")] }).addStyleClass("cmInfoPopoverContent")],
                endButton: new Button({ text: "Cerrar", type: "Transparent", press: function () { this._infoPopover.close(); }.bind(this) })
            });
            this._infoPopover.addStyleClass("cmInfoPopover");
            this.getView().addDependent(this._infoPopover);
            this._infoPopover.openBy(source);
        },
        onVerDetalleEstado: function () {
            var component = this.getOwnerComponent(), router = component && component.getRouter && component.getRouter();
            if (component && component.setModel) { component.setModel(new JSONModel({ filters: this._filters, context: "MATERIAL" }), "materialesContext"); }
            if (router && router.getRoute && router.getRoute("RouteDetalleMaterialesAfectadas")) { router.navTo("RouteDetalleMaterialesAfectadas"); return; }
            MessageToast.show("No hay ruta registrada para el detalle de OT afectadas.");
        },
        onExit: function () { if (this._infoPopover) { this._infoPopover.destroy(); this._infoPopover = null; } },

        _findByClass: function (root, className) {
            return this._descendants(root, function (control) { return control.hasStyleClass && control.hasStyleClass(className); });
        },
        _descendants: function (root, predicate) {
            var result = [];
            function visit(control) {
                var children = [];
                if (!control) { return; }
                if (predicate(control)) { result.push(control); }
                if (control.getItems) { children = children.concat(control.getItems() || []); }
                if (control.getContent && !(control.isA && control.isA("sap.ui.core.HTML"))) {
                    children = children.concat(control.getContent() || []);
                }
                children.forEach(visit);
            }
            visit(root);
            return result;
        },
        _escape: function (value) {
            return String(value || "").replace(/[&<>"']/g, function (character) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[character];
            });
        }
    });
});
