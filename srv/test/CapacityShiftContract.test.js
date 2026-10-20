"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadMapper(name) {
    let mapper;
    const source = fs.readFileSync(path.resolve(__dirname, "../../webapp/model", name), "utf8");
    vm.runInNewContext(source, {
        sap: { ui: { define: function (dependencies, factory) { mapper = factory(); } } }
    });
    return mapper;
}

const capacityMapper = loadMapper("DetalleCapacidadCargaMapper.js");
const shiftMapper = loadMapper("DetalleUtilizacionTurnoMapper.js");

function records(validated) {
    return {
        resources: [{
            ResourceId: "R-1", WorkDate: "2026-08-01", ZoneId: "NORTE", ZoneName: "NORTE",
            ShiftId: validated ? "D" : "", ShiftName: validated ? "Diurno" : "NOLASCO SOSA ISRAEL",
            ShiftSourceValidated: validated, CapacitySourceValidated: validated,
            CapacityHours: validated ? 8 : 0, PersonnelNumber: validated ? "P-1" : ""
        }],
        assignments: [{ OrderId: "OT-1", RoutingNumber: "1", OperationCounter: "1", ResourceId: "R-1" }],
        operations: [{
            OperationKey: "OP-1", OrderId: "OT-1", RoutingNumber: "1", OperationCounter: "1",
            PlannedStartDate: "2026-08-01", PlannedValueOriginal: 120, PlannedUnitOriginal: "MIN"
        }],
        confirmations: [{
            ConfirmationId: "C-1", OrderId: "OT-1", IncludedInCalculation: true,
            ActualStartDate: "2026-08-01", ActualValueOriginal: 60, ActualUnitOriginal: "MIN",
            ExecutorPersonnelNumber: validated ? "P-1" : ""
        }],
        orders: [{ OrderId: "OT-1", PlannedStartDate: "2026-08-01", CustomerName: "Cliente real" }],
        catalogs: []
    };
}

test("sin fuentes validadas conserva el plan, pero no inventa turno, capacidad ni horas reales", function () {
    const raw = records(false);
    const capacity = capacityMapper.build(raw, { fechaDesde: "01/08/2026", fechaHasta: "31/08/2026" });
    const shift = shiftMapper.build(raw, { fechaDesde: "2026-08-01", fechaHasta: "2026-08-31" });

    assert.equal(capacity.kpis.horasProgramadas.valor, "2 h");
    assert.equal(capacity.kpis.capacidadDisponible.valor, "Sin datos");
    assert.equal(capacity.kpis.horasReales.valor, "Sin datos");
    assert.equal(capacity.resumenTurno[0].turno, "Sin turno");
    assert.equal(capacity.resumenTurno[0].reales, "Sin datos");
    assert.equal(capacity.charts.angle, null);
    assert.equal(shift.resumenTurnos[0].turno, "Sin turno");
    assert.equal(shift.resumenTurnos[0].horasProgramadas, "2 h");
    assert.equal(shift.resumenTurnos[0].horasReales, "Sin datos");
    assert.equal(shift.kpis.turnoSaturado.valor, "Sin datos");
    assert.equal(shift.kpis.sobreCapacidad.valor, "Sin datos");
    assert.equal(shift.ordenes[0].horasReal, "Sin datos");
});

test("con turno, capacidad y persona validados calcula las razones con capacidad como denominador", function () {
    const raw = records(true);
    const capacity = capacityMapper.build(raw, { fechaDesde: "01/08/2026", fechaHasta: "31/08/2026" });
    const shift = shiftMapper.build(raw, { fechaDesde: "2026-08-01", fechaHasta: "2026-08-31" });

    assert.equal(capacity.resumenTurno[0].turno, "Diurno");
    assert.equal(capacity.kpis.capacidadDisponible.valor, "8 h");
    assert.equal(capacity.kpis.horasReales.valor, "1 h");
    assert.equal(capacity.charts.angle, 90);
    assert.match(capacity.charts.planned, /25\.0% de capacidad/);
    assert.equal(shift.resumenTurnos[0].turno, "Diurno");
    assert.equal(shift.resumenTurnos[0].capacidad, "8 h");
    assert.equal(shift.resumenTurnos[0].horasReales, "1 h");
    assert.equal(shift.resumenTurnos[0].utilizacion, "12.5%");
});

test("la vista no conserva porcentajes ni horas de muestra", function () {
    const xml = fs.readFileSync(path.resolve(__dirname, "../../webapp/view/DetalleCapacidadCarga.view.xml"), "utf8");
    assert.doesNotMatch(xml, /6,400 h|5,900 h|5,842 h|31\.7%|34\.3%|31\.0%/);
});
