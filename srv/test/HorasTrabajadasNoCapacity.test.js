"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modelDirectory = path.resolve(__dirname, "../../webapp/model");
let mapper;

vm.runInNewContext(fs.readFileSync(path.join(modelDirectory, "HorasTrabajadasMapper.js"), "utf8"), {
    sap: { ui: { define: function (dependencies, factory) { mapper = factory(); } } }
});

test("muestra horas reales sin inventar capacidad ni brecha", function () {
    const result = mapper.build({
        orders: [{ OrderId: "OT-1", OrderTypeCode: "SM02", PlannedStartDate: "2026-08-01" }],
        operations: [{ OperationKey: "OP-1", OrderId: "OT-1", PlannedValueOriginal: 120, PlannedUnitOriginal: "MIN" }],
        confirmations: [{ ConfirmationId: "C-1", OrderId: "OT-1", ActualValueOriginal: 60, ActualUnitOriginal: "MIN", IncludedInCalculation: true }],
        resources: [{ ResourceDateId: "R-1", ResourceId: "R-1", WorkDate: "2026-08-01", CapacitySourceValidated: false, CapacityHours: 0 }]
    }, { fechaDesde: "01/08/2026", fechaHasta: "31/08/2026" });

    assert.equal(result.kpis.horasProgramadas, "2 h");
    assert.equal(result.kpis.horasReales, "1 h");
    assert.equal(result.kpis.capacidadDisponible, "Sin datos");
    assert.equal(result.proyeccion.utilizacion, "Sin datos");
    assert.equal(result.proyeccion.brecha, "Sin datos");
});

test("la vista no conserva cifras de ejemplo", function () {
    const xml = fs.readFileSync(path.resolve(__dirname, "../../webapp/view/HorasTrabajadas.view.xml"), "utf8");

    assert.doesNotMatch(xml, /122% de utilización promedio|250 h|31\/05\/2024/);
});
