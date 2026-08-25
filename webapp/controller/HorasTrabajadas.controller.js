sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/ui/core/Item",
    "sap/m/HBox",
    "sap/m/VBox",
    "sap/m/Text",
    "sap/ui/core/Icon",
    "sap/m/MessageToast",
    "mantenimiento/model/HorasTrabajadasService"
], function (Controller, JSONModel, includeStylesheet, Item, HBox, VBox, Text, Icon, MessageToast, HorasTrabajadasService) {
    "use strict";

    return Controller.extend("mantenimiento.controller.HorasTrabajadas", {
        onInit: function () {
            this._filters = { periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "TODAS", supervisor: "TODOS", tipoOrden: "TODOS", turno: "TODOS", mecanico: "TODOS", estadoOrden: "TODOS" };
            this._loadStyles();
            this.getView().setModel(new JSONModel(HorasTrabajadasService.createEmpty(this._filters)), "horasModel");
            this.getView().getModel("horasModel").setSizeLimit(1000);
            this._setFilterItems(this.getView().getModel("horasModel").getData());
            this._load(false);
        },

        _loadStyles: function () {
            var id = "horasTrabajadasStylesheet";
            if (!document.getElementById(id)) {
                includeStylesheet(sap.ui.require.toUrl("mantenimiento/css/HorasTrabajadas.css") + "?v=20260824-odata", id);
            }
        },

        onAplicarFiltros: function () {
            var periodo = this._getSelect("fbPeriodo");
            var desde = this._getDatePicker("fbFechaDesde");
            var hasta = this._getDatePicker("fbFechaHasta");
            var periodKey = periodo && periodo.getSelectedKey() || "2026";
            this._filters = {
                periodo: periodKey,
                fechaDesde: desde && desde.getValue() || "01/01/2026",
                fechaHasta: hasta && hasta.getValue() || "31/12/2026",
                zona: this._selected("fbZona", "TODAS"),
                supervisor: this._selected("fbSupervisor", "TODOS"),
                tipoOrden: this._selected("fbTipoOrden", "TODOS"),
                turno: this._selected("fbTurno", "TODOS"),
                mecanico: this._selected("fbMecanico", "TODOS"),
                estadoOrden: this._selected("fbEstado", "TODOS")
            };
            if (/^\d{4}$/.test(periodKey)) {
                this._filters.fechaDesde = "01/01/" + periodKey;
                this._filters.fechaHasta = "31/12/" + periodKey;
            }
            this._load(true);
        },

        onVerDetalleTipoOrden: function () { this._navToIfExists("RouteDetalleHorasTipoOrden", "Ruta de detalle por tipo de orden no registrada."); },
        onVerDetalleZona: function () { this._navToIfExists("RouteDetalleCapacidadZona", "Ruta de detalle por zona no registrada."); },
        onDetalleZona: function () { this.onVerDetalleZona(); },
        onVerDetalleCausa: function () { this._navToIfExists("RouteDetalleDesviacionHoras", "Ruta de detalle por causa no registrada."); },

        _load: function (notify) {
            var requestId = (this._requestId || 0) + 1;
            var view = this.getView();
            this._requestId = requestId;
            view.setBusy(true);
            HorasTrabajadasService.load(this._getODataModel(), this._filters).then(function (response) {
                if (requestId !== this._requestId) { return; }
                this._showData(response.data);
                if (notify) { MessageToast.show("Horas trabajadas actualizadas con datos de SAP"); }
            }.bind(this), function (error) {
                if (requestId !== this._requestId) { return; }
                this._showData(HorasTrabajadasService.createEmpty(this._filters));
                MessageToast.show(error && error.message ? error.message : "No fue posible consultar las horas trabajadas");
            }.bind(this)).then(function () {
                if (requestId === this._requestId) { view.setBusy(false); }
            }.bind(this));
        },

        _showData: function (data) {
            this.getView().getModel("horasModel").setData(data);
            this._setFilterItems(data);
            this._renderTurnos(data.graficas.utilizacionResumen, data.kpis.capacidadComprometida);
            this._renderCharts(data);
        },

        _getODataModel: function () {
            return this.getOwnerComponent().getModel("dashboardOData") || this.getView().getModel("dashboardOData");
        },

        _getBoxControl: function (boxId, className) {
            var box = this.byId(boxId);
            var items = box && box.getItems ? box.getItems() : [];
            return items.filter(function (item) { return item.isA && item.isA(className); })[0];
        },

        _getSelect: function (boxId) { return this._getBoxControl(boxId, "sap.m.Select"); },
        _getDatePicker: function (boxId) { return this._getBoxControl(boxId, "sap.m.DatePicker"); },
        _selected: function (boxId, fallback) {
            var select = this._getSelect(boxId);
            return select && select.getSelectedKey() || fallback;
        },

        _replaceItems: function (boxId, items, key) {
            var select = this._getSelect(boxId);
            if (!select) { return; }
            select.destroyItems();
            items.forEach(function (item) { select.addItem(new Item({ key: item.key, text: item.text })); });
            select.setSelectedKey(key);
        },

        _setFilterItems: function (data) {
            var options = data.opciones || {};
            var filters = data.filtros || this._filters;
            this._replaceItems("fbPeriodo", options.periodos || [], filters.periodo);
            this._replaceItems("fbZona", options.zonas || [], filters.zona);
            this._replaceItems("fbSupervisor", options.supervisores || [], filters.supervisor);
            this._replaceItems("fbTipoOrden", options.tiposOrden || [], filters.tipoOrden);
            this._replaceItems("fbTurno", options.turnos || [{ key: "TODOS", text: "Todos" }], filters.turno);
            this._replaceItems("fbMecanico", options.mecanicos || [], filters.mecanico);
            this._replaceItems("fbEstado", options.estados || [], filters.estadoOrden);
            var desde = this._getDatePicker("fbFechaDesde");
            var hasta = this._getDatePicker("fbFechaHasta");
            if (desde) { desde.setValue(filters.fechaDesde); }
            if (hasta) { hasta.setValue(filters.fechaHasta); }
        },

        _renderTurnos: function (turns, average) {
            var card = this.byId("cardUtilizacionTurno");
            var rowsBox = card && card.getItems()[1];
            if (!rowsBox || !rowsBox.destroyItems) { return; }
            rowsBox.destroyItems();
            (turns.length ? turns : [{ turno: "Sin datos", valor: 0, valorTexto: "Sin datos", estado: "None" }]).forEach(function (turn) {
                var tone = turn.estado === "Error" ? "Error" : turn.estado === "Warning" ? "Warning" : "Success";
                rowsBox.addItem(new HBox({
                    alignItems: "Center",
                    class: "htwTurnoManualRow",
                    items: [
                        new VBox({ alignItems: "Center", justifyContent: "Center", class: "htwTurnoIconBox htwTurnoIcon" + tone, items: [new Icon({ src: tone === "Error" ? "sap-icon://appointment-2" : tone === "Warning" ? "sap-icon://lateness" : "sap-icon://light-mode" })] }),
                        new VBox({ class: "htwTurnoManualContent", items: [
                            new Text({ text: turn.turno, class: "htwTurnoManualName" }),
                            new HBox({ alignItems: "Center", class: "htwTurnoManualBarLine", items: [
                                new HBox({ class: "htwTurnoManualTrack", items: [new HBox({ width: Math.min(turn.valor, 100) + "%", class: "htwTurnoManualFill htwTurnoFill" + tone })] }),
                                new Text({ text: turn.valorTexto, class: "htwTurnoManualValue htwTurnoValue" + tone })
                            ] })
                        ] })
                    ]
                }));
            });
            this._findByClass(card, "htwPromedioValue").forEach(function (control) { control.setText(average); });
        },

        _renderCharts: function (data) {
            this._setFirstHtml(this.byId("cardCapacidadCarga"), this._donutSvg(data.kpis));
            this.byId("htmlTipoOrdenChart").setContent(this._typeSvg(data.graficas.horasPorTipoOrden));
            this.byId("htmlCapacidadZonaChart").setContent(this._zoneSvg(data.graficas.capacidadPorZona));
            this.byId("htmlProyeccionChart").setContent(this._projectionSvg(data.proyeccion));
            var projection = this.byId("cardProyeccion");
            this._findByClass(projection, "htwProjectionBigValue").forEach(function (control) { control.setText(data.proyeccion.utilizacion); });
            this._findByClass(projection, "htwAlertMainRed").forEach(function (control) { control.setText(data.proyeccion.horasProyectadas); });
            this._findByClass(projection, "htwAlertMainOrange").forEach(function (control) { control.setText(data.proyeccion.brecha); });
            this._findByClass(projection, "htwAlertMainGreen").forEach(function (control) { control.setText(data.proyeccion.riesgo); });
            this._findByClass(projection, "htwProjectionFooter").forEach(function (control) { control.setText("Proyección basada en datos hasta el " + data.proyeccion.fechaCorte); });
            this._findByClass(this.byId("cardCapacidadCarga"), "htwDonutCleanLegendSub").forEach(function (control, index) {
                control.setText([data.kpis.capacidadDisponible, data.kpis.horasProgramadas, data.kpis.horasReales][index] || "Sin datos");
            });
        },

        _setFirstHtml: function (container, content) {
            var html = this._findDescendant(container, function (control) { return control.isA && control.isA("sap.ui.core.HTML"); })[0];
            if (html) { html.setContent(content); }
        },

        _findByClass: function (container, className) {
            return this._findDescendant(container, function (control) { return control.hasStyleClass && control.hasStyleClass(className); });
        },

        _findDescendant: function (container, predicate) {
            var result = [];
            function visit(control) {
                var children = [];
                if (!control) { return; }
                if (predicate(control)) { result.push(control); }
                if (control.getItems) { children = children.concat(control.getItems() || []); }
                if (control.getContent && typeof control.getContent === "function" && !control.isA("sap.ui.core.HTML")) { children = children.concat(control.getContent() || []); }
                children.forEach(visit);
            }
            visit(container);
            return result;
        },

        _donutSvg: function (kpis) {
            var plan = Math.max(0, Math.min(100, kpis.capacidadComprometidaValor || 0));
            return '<svg class="htwDonutCleanSvg" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg"><circle cx="90" cy="90" r="58" fill="none" stroke="#edf1f5" stroke-width="22"/><g transform="rotate(-90 90 90)"><circle cx="90" cy="90" r="58" fill="none" stroke="#7c3aed" stroke-width="22" pathLength="100" stroke-dasharray="' + plan + ' ' + (100 - plan) + '"/><circle cx="90" cy="90" r="40" fill="none" stroke="#18a957" stroke-width="12" pathLength="100" stroke-dasharray="' + plan + ' ' + (100 - plan) + '"/></g><circle cx="90" cy="90" r="31" fill="#fff"/><text x="90" y="82" text-anchor="middle" class="htwDonutCleanCenterLabel">Capacidad</text><text x="90" y="105" text-anchor="middle" class="htwDonutCleanCenterValue">' + this._escape(kpis.capacidadDisponible) + '</text></svg>';
        },

        _typeSvg: function (rows) {
            var max = Math.max.apply(Math, [1].concat(rows.map(function (row) { return Math.max(row.plan, row.real); })));
            var positions = rows.map(function (row, index) { return 100 + index * (380 / Math.max(rows.length - 1, 1)); });
            var point = function (value) { return 178 - value / max * 120; };
            var planPoints = rows.map(function (row, index) { return positions[index] + "," + point(row.plan); }).join(" ");
            var realPoints = rows.map(function (row, index) { return positions[index] + "," + point(row.real); }).join(" ");
            var circles = rows.map(function (row, index) { return '<circle cx="' + positions[index] + '" cy="' + point(row.plan) + '" r="4" fill="#2563eb"/><circle cx="' + positions[index] + '" cy="' + point(row.real) + '" r="4" fill="#7c3aed"/><text x="' + positions[index] + '" y="205" text-anchor="middle" class="htwTipoXAxisText">' + this._escape(row.tipo) + '</text>'; }.bind(this)).join("");
            return '<svg class="htwTipoSvg" viewBox="0 0 560 235" xmlns="http://www.w3.org/2000/svg"><line x1="55" y1="178" x2="530" y2="178" class="htwTipoAxisLine"/><line x1="55" y1="58" x2="530" y2="58" class="htwTipoGridLine"/><line x1="55" y1="118" x2="530" y2="118" class="htwTipoGridLine"/><text x="55" y="28" class="htwTipoYAxisTitle">Horas hombre</text><polyline fill="none" stroke="#2563eb" stroke-width="3" points="' + planPoints + '"/><polyline fill="none" stroke="#7c3aed" stroke-width="3" points="' + realPoints + '"/>' + circles + '</svg>';
        },

        _zoneSvg: function (rows) {
            var shown = rows.slice(0, 5);
            var marks = shown.map(function (row, index) {
                var x = 85 + index * 92;
                var value = Math.max(0, Math.min(row.utilizacion || 0, 150));
                var y = 84 - value / 150 * 68;
                var color = value > 120 ? "#ef4444" : value >= 90 ? "#f59e0b" : "#16a34a";
                return '<line x1="' + x + '" y1="16" x2="' + x + '" y2="84" class="htwZonaV2Track"/><line x1="' + (x - 14) + '" y1="' + y + '" x2="' + (x + 14) + '" y2="' + y + '" stroke="' + color + '" stroke-width="4"/><text x="' + (x + 18) + '" y="' + y + '" class="htwZonaV2ValueGreen">' + (row.utilizacion === null ? "--" : row.utilizacion + "%") + '</text><text x="' + x + '" y="105" text-anchor="middle" class="htwZonaV2Label">' + this._escape(row.zona) + '</text>';
            }.bind(this)).join("");
            return '<svg class="htwZonaV2Svg" viewBox="0 0 500 112" xmlns="http://www.w3.org/2000/svg"><line x1="38" y1="16" x2="490" y2="16" class="htwZonaV2Grid"/><line x1="38" y1="50" x2="490" y2="50" class="htwZonaV2Grid"/><line x1="38" y1="84" x2="490" y2="84" class="htwZonaV2Base"/><text x="4" y="20" class="htwZonaV2AxisText">150%</text><text x="4" y="54" class="htwZonaV2AxisText">75%</text><text x="15" y="88" class="htwZonaV2AxisText">0%</text>' + marks + '</svg>';
        },

        _projectionSvg: function (projection) {
            var value = parseFloat(projection.utilizacion) || 0;
            var y = 155 - Math.min(value, 150) / 150 * 130;
            return '<svg class="htwProjectionSvg" viewBox="0 0 620 210" xmlns="http://www.w3.org/2000/svg"><line x1="40" y1="25" x2="600" y2="25" class="htwProjGrid"/><line x1="40" y1="90" x2="600" y2="90" class="htwProjGrid"/><line x1="40" y1="155" x2="600" y2="155" class="htwProjGrid"/><polyline points="55,145 170,130 285,112 400,95 510,' + y + '" class="htwProjLineSolid"/><polyline points="510,' + y + ' 600,' + Math.max(25, y - 8) + '" class="htwProjLineDashed"/><text x="600" y="195" text-anchor="end" class="htwProjDateText">Cierre</text></svg>';
        },

        _escape: function (value) { return String(value || "").replace(/[&<>"']/g, function (character) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]; }); },

        _navToIfExists: function (route, message) {
            var router = this.getOwnerComponent && this.getOwnerComponent().getRouter();
            if (router && router.getRoute && router.getRoute(route)) { router.navTo(route); return; }
            MessageToast.show(message);
        }
    });
});
