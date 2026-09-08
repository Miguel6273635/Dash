"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { CachePrewarmService } = require("../lib/CachePrewarmService");

test("precarga meses de forma secuencial y reutiliza la misma solicitud activa", async function () {
    const calls = [];
    let concurrent = 0;
    let maxConcurrent = 0;
    const snapshots = {
        getSnapshot: async function (options) {
            concurrent += 1;
            maxConcurrent = Math.max(maxConcurrent, concurrent);
            calls.push(options);
            await new Promise((resolve) => setTimeout(resolve, 2));
            concurrent -= 1;
            return { orders: [{ OrderId: options.dateFrom }], catalogs: [] };
        }
    };
    const prewarm = new CachePrewarmService({ snapshots: snapshots });
    const first = prewarm.start({ fechaDesde: "2026-01-01", fechaHasta: "2026-03-31" });
    const second = prewarm.start({ fechaDesde: "2026-01-01", fechaHasta: "2026-03-31" });
    const result = await prewarm.wait(first.id);

    assert.equal(second.reused, true);
    assert.equal(result.status, "COMPLETED");
    assert.deepEqual(result.completedMonths, ["2026-01", "2026-02", "2026-03"]);
    assert.equal(calls.length, 3);
    assert.equal(maxConcurrent, 1);
    assert.deepEqual(calls[0].include, ["orders", "catalogs"]);
});

test("reporta el mes que falla y no continúa con los siguientes", async function () {
    const snapshots = {
        getSnapshot: async function (options) {
            if (options.dateFrom === "2026-02-01") {
                throw new Error("SAP no disponible");
            }
            return { orders: [], catalogs: [] };
        }
    };
    const prewarm = new CachePrewarmService({ snapshots: snapshots });
    const start = prewarm.start({ fechaDesde: "2026-01-01", fechaHasta: "2026-03-31" });
    const result = await prewarm.wait(start.id);

    assert.equal(result.status, "FAILED");
    assert.deepEqual(result.completedMonths, ["2026-01"]);
    assert.equal(result.failedMonth, "2026-02");
    assert.equal(result.error, "SAP no disponible");
});
