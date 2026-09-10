"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CacheService = require("../lib/CacheService");
const { DashboardSnapshotService } = require("../lib/DashboardSnapshotService");

test("carga y reutiliza las entidades independientes sin consultas por orden", async function () {
    const calls = [];
    const repository = {
        readAll: async function (entitySet) {
            calls.push(entitySet);
            if (entitySet === "DashboardOrdersSet") {
                return [{ OrderId: "OT-1" }, { OrderId: "OT-2" }];
            }
            if (entitySet === "DashboardServiceRequestsSet") {
                return [{ RequestId: "SR-1" }];
            }
            if (entitySet === "DashboardEquipmentBlocksSet") {
                return [{ BlockId: "BL-1" }];
            }
            return [];
        },
        readByValues: async function () {
            throw new Error("No se esperaban relaciones por OT en esta prueba");
        }
    };
    const service = new DashboardSnapshotService({
        cache: new CacheService({ maxBytes: 1024 * 1024 }),
        repository: repository
    });

    const options = {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["orders", "serviceRequests", "blocks"]
    };
    const first = await service.getSnapshot(options);
    const second = await service.getSnapshot(options);

    assert.equal(first.serviceRequests.length, 1);
    assert.equal(first.blocks.length, 1);
    assert.equal(second.serviceRequests[0].RequestId, "SR-1");
    assert.equal(calls.filter((item) => item === "DashboardServiceRequestsSet").length, 1);
    assert.equal(calls.filter((item) => item === "DashboardEquipmentBlocksSet").length, 1);
});



test("conserva requisitos sin identificador conocido y carga eventos de bloqueo por BlockId", async function () {
    const calls = [];
    const repository = {
        readAll: async function (entitySet) {
            calls.push(entitySet);
            if (entitySet === "DashboardOrdersSet") {
                return [{ OrderId: "OT-1" }];
            }
            if (entitySet === "DashboardEquipmentBlocksSet") {
                return [{ BlockId: "BL-1" }];
            }
            return [];
        },
        readByValues: async function (entitySet, property, values) {
            calls.push(entitySet + ":" + property + ":" + values.join(","));
            if (entitySet === "DashboardOrderRequirementsSet") {
                return [{ OrderId: "OT-1", RequirementCode: "REQ-1" }];
            }
            if (entitySet === "DashboardBlockEventsSet") {
                return [{ BlockEventId: "EV-1", BlockId: "BL-1" }];
            }
            return [];
        }
    };
    const service = new DashboardSnapshotService({
        cache: new CacheService({ maxBytes: 1024 * 1024 }),
        repository: repository
    });

    const snapshot = await service.getSnapshot({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["requirements", "blockEvents"]
    });

    assert.equal(snapshot.requirements.length, 1);
    assert.equal(snapshot.requirements[0].RequirementCode, "REQ-1");
    assert.equal(snapshot.blockEvents[0].BlockEventId, "EV-1");
    assert.ok(calls.includes("DashboardOrderRequirementsSet:OrderId:OT-1"));
    assert.ok(calls.includes("DashboardBlockEventsSet:BlockId:BL-1"));
});


test("calienta la caché sin materializar una segunda respuesta de datos", async function () {
    const cache = new CacheService({ maxBytes: 1024 * 1024 });
    const service = new DashboardSnapshotService({
        cache,
        repository: {
            readAll: async function (entitySet) {
                if (entitySet === "DashboardOrdersSet") {
                    return [{ OrderId: "OT-1" }];
                }
                if (entitySet === "DashboardEquipmentBlocksSet") {
                    return [{ BlockId: "BL-1" }];
                }
                return [];
            },
            readByValues: async function (entitySet) {
                if (entitySet === "DashboardOrderRequirementsSet") {
                    return [{ OrderId: "OT-1", RequirementCode: "REQ-1" }];
                }
                if (entitySet === "DashboardBlockEventsSet") {
                    return [{ BlockId: "BL-1", BlockEventId: "EV-1" }];
                }
                return [];
            }
        }
    });

    const warmup = await service.getSnapshot({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["requirements", "blockEvents"],
        warmOnly: true
    });

    assert.equal(warmup.meta.warmOnly, true);
    assert.equal("orders" in warmup, false);
    assert.equal("requirements" in warmup, false);
    assert.equal(cache.status().entries, 4);
});


test("la consulta de una pantalla no hace OData cuando falta una entrada activa", async function () {
    let reads = 0;
    const cache = new CacheService({ maxBytes: 1024 * 1024 });
    const service = new DashboardSnapshotService({
        cache,
        repository: {
            readAll: async function () { reads += 1; return []; },
            readByValues: async function () { reads += 1; return []; }
        }
    });

    await assert.rejects(
        service.getSnapshot({
            dateFrom: "2026-08-01",
            dateTo: "2026-08-31",
            include: ["orders"],
            cacheOnly: true
        }),
        (error) => error && error.code === "CACHE_MISS"
    );
    assert.equal(reads, 0);
});
