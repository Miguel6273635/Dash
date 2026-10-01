"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const backendMapper = require("../lib/dashboardMapper");

const OFFICIAL_ZONES = ["NORTE", "CENTRO", "SUR", "ESTE", "OESTE"];

function loadFrontendMapper() {
    let exported;
    const filename = path.resolve(__dirname, "../../webapp/model/dashboardMapper.js");

    vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
        sap: { ui: { define: function (_dependencies, factory) {
            exported = factory();
        } } },
        Intl
    }, { filename });
    return exported;
}

function rawData() {
    return {
        orders: [
            {
                OrderId: "OT-NORTE",
                OrderTypeCode: "SM02",
                PlannedStartDate: "2026-08-10T00:00:00",
                SapUserStatusCode: "E0015",
                Zona: "NORTE"
            },
            {
                OrderId: "OT-SIN-ZONA",
                OrderTypeCode: "SM02",
                PlannedStartDate: "2026-08-11T00:00:00",
                SapUserStatusCode: "E0013",
                Zona: ""
            }
        ],
        catalogs: [
            {
                FilterCatalogId: "INVALID",
                FilterDomain: "ZONE",
                ValueId: "MANTENIMIENTO FORANEO",
                ValueText: "MANTENIMIENTO FORANEO",
                Active: true
            }
        ].concat(OFFICIAL_ZONES.map((zone, index) => ({
            FilterCatalogId: "ZONE:" + zone,
            FilterDomain: "ZONE",
            ValueId: zone,
            ValueText: zone,
            SortOrder: index + 1,
            Active: true
        }))),
        causes: [], materials: [], movements: [], resources: [], assignments: [],
        operations: [], confirmations: [], serviceRequests: [], blocks: [], blockOrders: [],
        range: {
            startDate: new Date(2026, 7, 1),
            endDate: new Date(2026, 7, 31)
        }
    };
}

function assertZones(mapper) {
    const dashboard = mapper.buildDashboard(rawData());
    const filterKeys = dashboard.filterOptions.zonas.slice(1).map((item) => item.key);
    const rowKeys = dashboard.zonePeriods.rows.map((item) => item.zone);
    const east = dashboard.zonePeriods.rows.find((item) => item.zone === "ESTE");

    assert.equal(filterKeys.join(","), OFFICIAL_ZONES.join(","));
    assert.equal(rowKeys.join(","), OFFICIAL_ZONES.join(","));
    assert.equal(dashboard.filterOptions.zonas.some((item) => item.key === "MANTENIMIENTO FORANEO"), false);
    assert.equal(rowKeys.includes("Sin zona"), false);
    assert.equal(east.total, "—");
}

test("backend usa únicamente las cinco zonas operativas oficiales", function () {
    assertZones(backendMapper);
});

test("frontend mantiene el mismo contrato de zonas que API_DASH", function () {
    assertZones(loadFrontendMapper());
});
