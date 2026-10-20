"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadModule(relativePath, dependencies) {
    let exported;
    const filename = path.resolve(__dirname, "../..", relativePath);
    const context = {
        sap: { ui: { define: function (names, factory) {
            exported = factory.apply(null, dependencies || []);
        } } }
    };

    vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
    return exported;
}

test("análisis general no cuenta faltantes como clientes o elevadores ni confunde estado con causa", function () {
    const mapper = loadModule("webapp/model/AnalisisGeneralMapper.js");
    const raw = {
        orders: [{
            OrderId: "1", OrderTypeCode: "SM01", PlannedStartDate: "2026-06-23",
            SapUserStatusCode: "E0013", AppStatusCode: "0100"
        }],
        causes: [{
            OrderId: "1", CauseCode: "I0002", CauseText: "Liberados",
            CauseContextCode: "", IsPrimary: true
        }],
        assignments: [], resources: [], catalogs: []
    };
    const unknown = mapper.build(raw, { week: "2026-W26", zone: "TODAS" });

    assert.equal(unknown.summary.clientsCount, 0);
    assert.equal(unknown.summary.clientsImpact, 0);
    assert.equal(unknown.summary.elevatorsCount, 0);
    assert.equal(unknown.results[0].causa, "Sin causa registrada");

    raw.orders[0].CustomerName = "Cliente real";
    raw.orders[0].EquipmentId = "EQ-1";
    raw.causes[0].CauseContextCode = "NON_EXECUTION";
    const known = mapper.build(raw, { week: "2026-W26", zone: "TODAS" });
    assert.equal(known.summary.clientsCount, 1);
    assert.equal(known.summary.elevatorsCount, 1);
    assert.equal(known.results[0].causa, "Liberados");
});

test("elevadores sin identificador no se cuentan como un elevador real", function () {
    const mapper = loadModule("webapp/model/AnalisisElevadoresMapper.js", [{
        canonicalStatus: function (order) { return order.SapUserStatusCode; }
    }]);
    const raw = {
        orders: [{ OrderId: "1", OrderTypeCode: "SM02", PlannedStartDate: "2026-08-03", SapUserStatusCode: "E0013" }],
        assignments: [], resources: [], causes: [], catalogs: [], range: {}
    };
    const filters = {
        periodo: "2026", fechaDesde: "01/08/2026", fechaHasta: "31/08/2026",
        zona: "TODAS", supervisor: "TODOS", tipoOrden: "TODOS"
    };
    const unknown = mapper.buildData(raw, filters);
    assert.equal(unknown.kpis.elevadores, "Sin datos");
    assert.equal(unknown.meta.affectedElevators, 0);
    assert.equal(unknown.meta.ordersWithoutEquipment, 1);
    assert.equal(unknown.elevadores[0].elevador, "Sin equipo identificado");
    assert.equal(unknown.filters.periodoTexto, "01/08/2026 - 31/08/2026");

    raw.orders[0].EquipmentId = "EQ-1";
    const known = mapper.buildData(raw, filters);
    assert.equal(known.kpis.elevadores, "1");
    assert.equal(known.meta.ordersWithoutEquipment, 0);
});

test("reparaciones distingue material no publicable de ausencia de material", function () {
    const mapper = loadModule("webapp/model/AnalisisIntegralReparacionesMapper.js");
    const raw = {
        orders: [{
            OrderId: "000030009829", OrderTypeCode: "SM01", PlannedStartDate: "2026-08-03",
            SapUserStatusCode: "E0013"
        }],
        materials: [{
            OrderId: "000030009829", MaterialId: "MAT-1", MaterialName: "Consumible real",
            IsPublishable: false
        }],
        events: [], assignments: [], resources: [],
        range: {}, meta: { detailsLoaded: true }
    };
    const withUnpublishable = mapper.buildData(raw);
    assert.equal(withUnpublishable.materiales[0].material, "Sin material publicable");
    assert.equal(withUnpublishable.materiales[0].materialId, "SIN_MATERIAL_PUBLICABLE");

    raw.materials = [];
    const withoutMaterial = mapper.buildData(raw);
    assert.equal(withoutMaterial.materiales[0].material, "Sin material asociado");
});
