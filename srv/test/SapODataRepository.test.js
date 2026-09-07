"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const SapODataRepository = require("../lib/SapODataRepository");

test("no agrega $top y sigue la página siguiente de OData", async function () {
    const calls = [];
    const repository = new SapODataRepository({
        servicePath: "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV",
        execute: async function (url) {
            calls.push(url);
            return calls.length === 1
                ? { data: { d: { results: [{ OrderId: "1" }], __next: "/next-page" } } }
                : { data: { d: { results: [{ OrderId: "2" }] } } };
        }
    });

    const result = await repository.readAll("DashboardOrdersSet", {
        filter: "PlannedStartDate eq datetime'2026-08-01T00:00:00'",
        select: ["OrderId"]
    });

    assert.equal(result.length, 2);
    assert.equal(calls.length, 2);
    assert.equal(calls.some((url) => url.includes("$top") || url.includes("%24top")), false);
});

test("divide los detalles en lotes de máximo quince OrderId", async function () {
    const filters = [];
    const repository = new SapODataRepository({
        batchSize: 15,
        execute: async function (url) {
            filters.push(decodeURIComponent(url));
            return { data: { d: { results: [] } } };
        }
    });
    const orderIds = Array.from({ length: 16 }, function (_, index) {
        return "OT" + String(index + 1);
    });

    await repository.readByValues("DashboardOrderOperationsSet", "OrderId", orderIds);

    assert.equal(filters.length, 2);
    assert.equal((filters[0].match(/OrderId eq/g) || []).length, 15);
    assert.equal((filters[1].match(/OrderId eq/g) || []).length, 1);
});

