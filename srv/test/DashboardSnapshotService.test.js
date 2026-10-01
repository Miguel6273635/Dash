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

test("una colección global no consulta ni devuelve órdenes del mes", async function () {
    const calls = [];
    const service = new DashboardSnapshotService({
        cache: new CacheService({ maxBytes: 1024 * 1024 }),
        repository: {
            readAll: async function (entitySet) {
                calls.push(entitySet);
                if (entitySet === "DashboardOrdersSet") {
                    throw new Error("No se deben consultar órdenes para un catálogo global");
                }
                return [{ FilterCatalogId: "CAT-1" }];
            },
            readByValues: async function () {
                throw new Error("No se esperaban relaciones por OT");
            }
        }
    });

    const snapshot = await service.getSnapshot({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["catalogs"]
    });

    assert.deepEqual(calls, ["DashboardFilterCatalogSet"]);
    assert.equal(snapshot.catalogs[0].FilterCatalogId, "CAT-1");
    assert.equal("orders" in snapshot, false);
    assert.deepEqual(service.cacheKeysFor({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["catalogs"]
    }), ["v1:DashboardFilterCatalogSet:global"]);
});

test("reemplaza el falso dominio de zonas con DashboardZonasSet", async function () {
    const catalogCalls = [];
    const service = new DashboardSnapshotService({
        cache: new CacheService({ maxBytes: 1024 * 1024 }),
        repository: {
            readAll: async function () {
                return [
                    {
                        FilterCatalogId: "OLD-ZONE",
                        FilterDomain: "ZONE",
                        ValueId: "MANTENIMIENTO D.F.",
                        ValueText: "MANTENIMIENTO D.F.",
                        Active: true
                    },
                    {
                        FilterCatalogId: "STATUS-1",
                        FilterDomain: "STATUS",
                        ValueId: "E0015",
                        ValueText: "Completada",
                        Active: true
                    }
                ];
            },
            readByValues: async function () { return []; }
        },
        catalogRepository: {
            readAll: async function (entitySet, options) {
                catalogCalls.push({ entitySet, select: options.select });
                return ["CENTRO", "ESTE", "NORTE", "OESTE", "SUR"].map((zone) => ({
                    ZonaId: "", Zona: zone, Base: ""
                }));
            }
        }
    });

    const snapshot = await service.getSnapshot({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["catalogs"]
    });
    const zones = snapshot.catalogs.filter((item) => item.FilterDomain === "ZONE");

    assert.equal(catalogCalls[0].entitySet, "DashboardZonasSet");
    assert.deepEqual(catalogCalls[0].select, ["ZonaId", "Zona", "Base"]);
    assert.deepEqual(zones.map((item) => item.ValueId).sort(), ["CENTRO", "ESTE", "NORTE", "OESTE", "SUR"]);
    assert.equal(snapshot.catalogs.some((item) => item.ValueId === "MANTENIMIENTO D.F."), false);
    assert.equal(snapshot.catalogs.some((item) => item.FilterDomain === "STATUS"), true);
});

test("una relación usa órdenes internamente pero no las repite en la respuesta", async function () {
    const service = new DashboardSnapshotService({
        cache: new CacheService({ maxBytes: 1024 * 1024 }),
        repository: {
            readAll: async function (entitySet) {
                return entitySet === "DashboardOrdersSet" ? [{ OrderId: "OT-1" }] : [];
            },
            readByValues: async function (entitySet, property, values) {
                assert.equal(entitySet, "DashboardOrderCausesSet");
                assert.equal(property, "OrderId");
                assert.deepEqual(values, ["OT-1"]);
                return [{ OrderCauseId: "CAUSE-1", OrderId: "OT-1" }];
            }
        }
    });

    const snapshot = await service.getSnapshot({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["causes"]
    });

    assert.equal(snapshot.causes[0].OrderCauseId, "CAUSE-1");
    assert.equal("orders" in snapshot, false);
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
