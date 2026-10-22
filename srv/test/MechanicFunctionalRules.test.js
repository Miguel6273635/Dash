"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const dashboardMapper = require("../lib/dashboardMapper");

const modelDirectory = path.resolve(__dirname, "../../webapp/model");

function loadMapper(fileName) {
    let mapper;
    vm.runInNewContext(fs.readFileSync(path.join(modelDirectory, fileName), "utf8"), {
        sap: { ui: { define: function (_dependencies, factory) { mapper = factory(); } } }
    }, { filename: fileName });
    return mapper;
}

const mechanicsMapper = loadMapper("MecanicosMapper.js");
const detailMapper = loadMapper("DetalleMecanicosMapper.js");

function rawData() {
    return {
        resources: [
            {
                ResourceDateId: "M1-20260801", ResourceId: "M1", ResourceName: "Mecánico Uno",
                ResourceTypeCode: "MECANICO", WorkDate: "/Date(1785564000000)/", Base: "B-N",
                ShiftName: "Lunes a Viernes", EmploymentStatusCode: "3"
            },
            {
                ResourceDateId: "M2-20260801", ResourceId: "M2", ResourceName: "Mecánico Dos",
                ResourceTypeCode: "MECANICO", WorkDate: "/Date(1785564000000)/", Base: "B-S",
                ShiftName: "Nombre de una persona", EmploymentStatusCode: "0"
            },
            {
                ResourceDateId: "T1-20260801", ResourceId: "T1", ResourceName: "Técnico",
                ResourceTypeCode: "TECNICO", WorkDate: "/Date(1785564000000)/", Base: "B-N",
                ShiftName: "Sábado", EmploymentStatusCode: "3"
            }
        ],
        catalogs: [
            { FilterCatalogId: "ZN", FilterDomain: "ZONE", ValueId: "NORTE", ValueText: "NORTE", ScopeId: "B-N", Active: true },
            { FilterCatalogId: "ZS", FilterDomain: "ZONE", ValueId: "SUR", ValueText: "SUR", ScopeId: "B-S", Active: true },
            { FilterCatalogId: "BAD", FilterDomain: "MECHANIC", ValueId: "T1", ValueText: "Técnico", Active: true }
        ],
        orders: [{ OrderId: "OT-1", OrderTypeCode: "SM02", PlannedStartDate: "2026-08-01" }],
        orderResources: [{ OrderResourceId: "A-1", OrderId: "OT-1", ResourceId: "M1", RoleCode: "MECHANIC" }],
        operations: [],
        confirmations: []
    };
}

const filters = {
    periodo: "2026-08", fechaDesde: "01/08/2026", fechaHasta: "31/08/2026",
    zona: "ALL", supervisor: "ALL", turno: "ALL", tipoServicio: "ALL",
    especialidad: "ALL", estado: "ALL"
};

test("la pantalla principal cuenta sólo puestos MECANICO y separa estado laboral", function () {
    const result = mechanicsMapper.mapData(rawData(), filters);

    assert.equal(result.kpis.activos, "2");
    assert.deepEqual(Array.from(result.distribucionZona, (item) => item.label).sort(), ["NORTE", "SUR"]);
    assert.deepEqual(Array.from(result.distribucionTurnos, (item) => item.label), ["Lunes a Viernes"]);
    assert.deepEqual(Array.from(result.estadoData, (item) => [item.label, item.value]), [
        ["Activos", 1], ["Inactivos", 1]
    ]);
    assert.deepEqual(Array.from(result.catalogos.estados, (item) => item.key), ["ALL", "ACTIVE", "INACTIVE"]);
});

test("detalle define activos por asociación a órdenes y no por disponibilidad", function () {
    const result = detailMapper.mapData(rawData(), Object.assign({}, filters, {
        zona: "TODAS", supervisor: "TODOS", turno: "TODOS", tipoServicio: "TODAS",
        especialidad: "TODAS", estado: "TODOS"
    }));

    assert.equal(result.kpis.totalPlantilla, "2");
    assert.equal(result.kpis.activos, "1");
    assert.deepEqual(Array.from(result.estadoPlantilla, (item) => [item.label, item.value]), [
        ["Activos", "1"], ["Inactivos", "1"]
    ]);
});

test("el filtro global de mecánicos ignora el catálogo contaminado", function () {
    const raw = rawData();
    const options = dashboardMapper.buildFilterOptions(raw.catalogs, raw.orders, raw.resources);

    assert.deepEqual(options.mecanicos.map((item) => item.key), ["TODOS", "M1", "M2"]);
    assert.deepEqual(options.turnos.map((item) => item.text), ["Todos", "Lunes a Viernes"]);
});
