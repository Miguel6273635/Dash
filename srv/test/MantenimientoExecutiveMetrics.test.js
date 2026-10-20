"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const serverMapper = require("../lib/dashboardMapper");

function loadBrowserMapper() {
    let mapper;
    const source = fs.readFileSync(
        path.resolve(__dirname, "../../webapp/model/dashboardMapper.js"),
        "utf8"
    );
    vm.runInNewContext(source, {
        sap: { ui: { define: function (_dependencies, factory) { mapper = factory(); } } }
    });
    return mapper;
}

const browserMapper = loadBrowserMapper();

function statusData() {
    return {
        orders: [
            { OrderId: "P-1", OrderTypeCode: "SM01", OrderTypeText: "Preventivo", Zona: "NORTE" },
            { OrderId: "C-1", OrderTypeCode: "SM02", SapUserStatusCode: "E0015", Zona: "NORTE" },
            { OrderId: "C-2", OrderTypeCode: "SM02", AppStatusCode: "0400", Zona: "SUR" },
            { OrderId: "C-3", OrderTypeCode: "SM02", SapUserStatusCode: "E0019", Zona: "OESTE" },
            { OrderId: "C-4", OrderTypeCode: "SM02", AppStatusCode: "0600", Zona: "CENTRO" }
        ],
        catalogs: [], serviceRequests: [], blocks: [], blockOrders: []
    };
}

test("API y navegador homologan estados y calculan la desviación sobre todo el plan", function () {
    [serverMapper, browserMapper].forEach(function (mapper) {
        const raw = statusData();
        const summary = mapper.buildSummary(
            raw.orders, raw.serviceRequests, raw.blocks, raw.catalogs, raw.blockOrders
        );
        const composition = mapper.buildComposition(raw.orders);

        assert.equal(summary.executed, "3 / 5");
        assert.equal(summary.compliance, "60.0%");
        assert.equal(summary.nonExecuted, "2");
        assert.equal(summary.deviation, "40.0%");
        assert.equal(summary.nonExecutedPercent, "40.0%");
        assert.equal(summary.classifiedOrders, 5);
        assert.equal(composition.preventive.orders, "0 / 1");
        assert.equal(composition.corrective.orders, "3 / 4");
    });
});

function staffingData() {
    return {
        orders: [
            { OrderId: "O-1", OrderTypeCode: "SM02", Mecanico: "M-1", Turno: "Lunes a viernes" },
            { OrderId: "O-2", OrderTypeCode: "SM02", Mecanico: "M-2", Turno: "Sábado" },
            { OrderId: "O-3", OrderTypeCode: "SM02", Mecanico: "M-3", Turno: "Dominical" },
            { OrderId: "O-4", OrderTypeCode: "SM02", Mecanico: "M-4", Turno: "Nocturno" }
        ],
        resources: [
            {
                ResourceDateId: "R-1-20260801", ResourceId: "R-1", ResourceTypeCode: "MECANICO",
                CapacitySourceValidated: false, ShiftSourceValidated: false, CapacityHours: 0
            },
            {
                ResourceDateId: "R-1-20260802", ResourceId: "R-1", ResourceTypeCode: "MECANICO",
                CapacitySourceValidated: false, ShiftSourceValidated: false, CapacityHours: 0
            },
            {
                ResourceDateId: "R-2-20260801", ResourceId: "R-2", ResourceTypeCode: "TECNICO",
                CapacitySourceValidated: false, ShiftSourceValidated: false, CapacityHours: 0
            },
            {
                ResourceDateId: "S-1-20260801", ResourceId: "S-1", ResourceTypeCode: "SUPERVISOR",
                CapacitySourceValidated: false, ShiftSourceValidated: false, CapacityHours: 0
            }
        ],
        assignments: [],
        operations: [
            { OperationKey: "OP-1", OrderId: "O-1", PlannedValueOriginal: 120, PlannedUnitOriginal: "MIN" },
            { OperationKey: "OP-2", OrderId: "O-2", PlannedValueOriginal: 60, PlannedUnitOriginal: "MIN" },
            { OperationKey: "OP-3", OrderId: "O-3", PlannedValueOriginal: 60, PlannedUnitOriginal: "MIN" },
            { OperationKey: "OP-4", OrderId: "O-4", PlannedValueOriginal: 60, PlannedUnitOriginal: "MIN" }
        ],
        confirmations: []
    };
}

test("muestra técnicos y turnos observados sin fabricar capacidad", function () {
    [serverMapper, browserMapper].forEach(function (mapper) {
        const raw = staffingData();
        const staff = mapper.buildCapacity(
            raw.orders, raw.resources, raw.assignments, raw.operations, raw.confirmations
        );

        assert.equal(staff.technicians, "6");
        assert.equal(staff.activeTurns, "3");
        assert.equal(staff.capacity, "Sin datos");
        assert.equal(staff.committed, "Sin datos");
        assert.equal(staff.margin, "Sin datos");
        assert.equal(staff.shifts[0].title, "Diurno");
        assert.equal(staff.shifts[0].programmed, "2 h");
        assert.equal(staff.shifts[1].title, "Nocturno");
        assert.equal(staff.shifts[1].programmed, "1 h");
        assert.equal(staff.shifts[2].title, "Fin de semana");
        assert.equal(staff.shifts[2].programmed, "2 h");
        assert.equal(staff.shifts[3].capacity, "Sin datos");
    });
});
