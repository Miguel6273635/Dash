"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadUi5Module(relativePath, dependencies = {}) {
    const filename = path.resolve(__dirname, "..", "..", relativePath);
    const source = fs.readFileSync(filename, "utf8");
    let exported;
    const sandbox = {
        console, Date, Number, Object, Array, Set, Map, String, Math, JSON,
        sap: { ui: { define(names, factory) {
            exported = factory(...names.map((name) => dependencies[name]));
        } } }
    };

    vm.runInNewContext(source, sandbox, { filename });
    return exported;
}

const period = loadUi5Module("webapp/model/InitialLoadPeriod.js");
const trendMapper = loadUi5Module("webapp/model/TendenciaEjecucionMapper.js");
const trendService = loadUi5Module("webapp/model/TendenciaEjecucionService.js", {
    "mantenimiento/model/TendenciaEjecucionMapper": trendMapper,
    "mantenimiento/model/ODataRelatedDataService": { rangeFilter() { return ""; } }
});
const responsibleMapper = loadUi5Module("webapp/model/ComportamientoOperativoMapper.js");

test("un periodo anual actualiza exactamente del 1 de enero al 31 de diciembre", () => {
    const filters = period.applyKey({}, "2025");

    assert.equal(filters.fechaDesde, "01/01/2025");
    assert.equal(filters.fechaHasta, "31/12/2025");
    assert.equal(period.keyForRange(filters.fechaDesde, filters.fechaHasta, true), "2025-ANUAL");
});

test("la tendencia usa periodo y no vuelve silenciosamente al anual", () => {
    const filter = trendService.buildOrdersFilter({ periodo: "2026-09" });
    const mapped = trendMapper.build({ orders: [], causes: [], assignments: [], resources: [], catalogs: [] }, {
        periodo: "2026-09", zona: "TODAS"
    });

    assert.match(filter, /2026-09-01T00:00:00/);
    assert.match(filter, /2026-09-30T00:00:00/);
    assert.equal(mapped.filtros.periodo, "2026-09");
});

test("comportamiento operativo acepta periodos mensuales heredados", () => {
    const range = responsibleMapper.parsePeriod("2026-09");

    assert.equal(period.display(range.startDate), "01/09/2026");
    assert.equal(period.display(range.endDate), "30/09/2026");
});
