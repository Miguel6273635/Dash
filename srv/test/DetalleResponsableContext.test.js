"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadModule(relativePath, dependencies, globals) {
    let exported;
    const filename = path.resolve(__dirname, "../..", relativePath);
    const context = Object.assign({
        sap: { ui: { define: function (names, factory) {
            exported = factory.apply(null, dependencies || []);
        } } }
    }, globals || {});

    vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
    return exported;
}

const mapper = loadModule("webapp/model/DetalleResponsableMapper.js");

function sampleRaw() {
    return {
        orders: [{
            OrderId: "0001", OrderTypeCode: "SM01", SapUserStatusCode: "E0013",
            PlannedStartDate: "2026-07-25", PlannedFinishDate: "2026-08-12",
            CustomerName: "Cliente real", EquipmentId: "EQ-1"
        }],
        assignments: [
            { OrderId: "0001", ResourceId: "R-A", AssignmentTypeCode: "PLANNED", RoleCode: "LEAD_MECHANIC" },
            { OrderId: "0001", ResourceId: "R-B", AssignmentTypeCode: "OTHER", RoleCode: "SECONDARY" }
        ],
        resources: [{ ResourceId: "R-A", ResourceName: "Responsable A", WorkDate: "2026-08-12" }],
        causes: [], events: [], catalogs: []
    };
}

test("detalle conserva el rango heredado y no selecciona al primer responsable por omisión", function () {
    const filters = { periodKey: "2026-ANUAL", fechaDesde: "01/08/2026", fechaHasta: "31/08/2026", zona: "TODAS" };
    const range = mapper.selectedRange(filters);
    const unselected = mapper.build(sampleRaw(), filters);
    const selected = mapper.build(sampleRaw(), Object.assign({}, filters, { responsableId: "R-A" }));
    const secondary = mapper.build(sampleRaw(), Object.assign({}, filters, { responsableId: "R-B" }));

    assert.equal(range.startDate.getMonth(), 7);
    assert.equal(range.endDate.getDate(), 31);
    assert.equal(unselected.kpi.otDesviadas, 0);
    assert.equal(selected.kpi.otDesviadas, 1);
    assert.equal(selected.kpi.clientesAfectados, 1);
    assert.equal(selected.filtros.periodoTexto, "01/08/2026 - 31/08/2026");
    assert.equal(secondary.kpi.otDesviadas, 0);
});

test("servicio consulta agosto, no los doce meses, al recibir fechas del origen", async function () {
    let config;
    const related = {
        rangeFilter: function (name, range) {
            return name + " ge datetime'2026-08-01T00:00:00' and " +
                name + " le datetime'2026-08-31T00:00:00'";
        },
        load: async function (model, request) {
            config = request;
            return Object.assign(sampleRaw(), { meta: { unavailableEntitySets: [] } });
        }
    };
    const service = loadModule("webapp/model/DetalleResponsableService.js", [mapper, related]);
    const result = await service.load({}, {
        responsableId: "R-A", periodKey: "2026-ANUAL",
        fechaDesde: "01/08/2026", fechaHasta: "31/08/2026", zona: "TODAS"
    });

    assert.match(config.ordersFilter, /PlannedStartDate eq datetime'2026-08-01T00:00:00'/);
    assert.match(config.ordersFilter, /PlannedFinishDate eq datetime'2026-08-31T00:00:00'/);
    assert.doesNotMatch(config.ordersFilter, /PlannedStartDate ge|PlannedFinishDate le/);
    assert.doesNotMatch(config.ordersFilter, /2026-01-01|2026-12-31/);
    assert.equal(result.data.kpi.otDesviadas, 1);
    await assert.rejects(service.load({}, { periodKey: "2026-ANUAL" }), /responsable identificado/);
});

test("navegación envía el ResourceId real y conserva las fechas aplicadas", function () {
    const navigations = [];
    const models = {};
    const controller = loadModule("webapp/controller/ComportamientoOperativo.controller.js", [
        { extend: function (name, methods) { return methods; } },
        function JSONModel(data) { this.data = data; },
        { show: function () {} }, {}, function () {}, {}, {}
    ]);
    const instance = {
        _origin: "TODAS",
        getOwnerComponent: function () {
            return {
                getRouter: function () {
                    return {
                        getRoute: function () { return {}; },
                        navTo: function (name, args) { navigations.push({ name, args }); }
                    };
                },
                setModel: function (model, name) { models[name] = model.data; }
            };
        },
        getView: function () {
            return { getModel: function () {
                return { getProperty: function () {
                    return { periodo: "2026-ANUAL", fechaDesde: "01/08/2026",
                        fechaHasta: "31/08/2026", zona: "NORTE", origen: "TODAS" };
                } };
            } };
        }
    };

    controller._openResponsible.call(instance, { responsableId: "R-A", id: 7 });
    assert.equal(navigations.length, 1);
    assert.equal(navigations[0].name, "RouteDetalleResponsable");
    assert.equal(navigations[0].args.responsableId, "R-A");
    assert.equal(models.detalleResponsableNavigation.fechaDesde, "01/08/2026");
    assert.equal(models.detalleResponsableNavigation.fechaHasta, "31/08/2026");

    controller._openResponsible.call(instance, { responsableId: "" });
    assert.equal(navigations.length, 1, "no navega con un ResourceId vacío");
});

test("el detalle no expande agosto al año sólo por aplicar un filtro de zona", function () {
    const controller = loadModule("webapp/controller/DetalleResponsable.controller.js", [
        { extend: function (name, methods) { return methods; } },
        function JSONModel() {}, {}, function () {}, {}
    ]);
    const state = {
        _filters: {
            responsableId: "R-A", periodKey: "2026-ANUAL",
            fechaDesde: "01/08/2026", fechaHasta: "31/08/2026",
            zona: "TODAS", page: 2
        },
        byId: function (id) {
            return { getSelectedKey: function () {
                return id === "detallePeriodo" ? "2026-ANUAL" : "NORTE";
            } };
        },
        _load: function () { this.loaded = true; }
    };

    controller.onApplyFilters.call(state);
    assert.equal(state._filters.fechaDesde, "01/08/2026");
    assert.equal(state._filters.fechaHasta, "31/08/2026");
    assert.equal(state._filters.zona, "NORTE");
    assert.equal(state._filters.page, 1);
    assert.equal(state.loaded, true);
});
