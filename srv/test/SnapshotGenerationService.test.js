"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CacheService = require("../lib/CacheService");
const { SnapshotGenerationService } = require("../lib/SnapshotGenerationService");

function activeGeneration() {
    return {
        id: "active-v1",
        cache: new CacheService({ maxBytes: 1024 * 1024 }),
        snapshots: {
            getSnapshot: async function () { return { source: "active" }; }
        },
        publishedAt: 1
    };
}

test("mantiene A mientras llena B y publica B de forma atómica", async function () {
    let release;
    const wait = new Promise((resolve) => { release = resolve; });
    let calls = 0;
    const service = new SnapshotGenerationService({
        active: activeGeneration(),
        snapshotFactory: function (generation) {
            return {
                getSnapshot: async function () {
                    calls += 1;
                    await wait;
                    generation.cache.set(
                        generation.id + ":orders:2026-08",
                        [{ OrderId: "OT-1" }],
                        { softTtlMs: 1000, hardTtlMs: 2000 }
                    );
                    return { meta: {} };
                },
                missingCacheKeys: function () { return []; }
            };
        }
    });

    const job = service.start({
        fechaDesde: "2026-08-01",
        fechaHasta: "2026-08-31",
        profiles: ["core"]
    });

    await new Promise((resolve) => setImmediate(resolve));
    assert.equal((await service.getSnapshot()).source, "active");
    assert.equal(service.activeGeneration, "active-v1");

    release();
    const result = await service.wait(job.id);

    assert.equal(calls, 1);
    assert.equal(result.status, "COMPLETED");
    assert.notEqual(service.activeGeneration, "active-v1");
});

test("conserva A cuando B falla", async function () {
    const service = new SnapshotGenerationService({
        active: activeGeneration(),
        snapshotFactory: function () {
            return {
                getSnapshot: async function () { throw new Error("QAS no disponible"); },
                missingCacheKeys: function () { return []; }
            };
        }
    });

    const job = service.start({
        fechaDesde: "2026-08-01",
        fechaHasta: "2026-08-31",
        profiles: ["materials"]
    });
    const result = await service.wait(job.id);

    assert.equal(result.status, "FAILED");
    assert.equal(result.error, "QAS no disponible");
    assert.equal((await service.getSnapshot()).source, "active");
    assert.equal(service.activeGeneration, "active-v1");
});


test("puede validar el tamaño de B sin reemplazar A", async function () {
    const service = new SnapshotGenerationService({
        active: activeGeneration(),
        snapshotFactory: function (generation) {
            return {
                getSnapshot: async function () {
                    generation.cache.set(
                        generation.id + ":orders:2026-08",
                        [{ OrderId: "OT-1", Description: "Carga temporal" }],
                        { softTtlMs: 1000, hardTtlMs: 2000 }
                    );
                    return { meta: {} };
                },
                missingCacheKeys: function () { return []; }
            };
        }
    });

    const job = service.start({
        fechaDesde: "2026-08-01",
        fechaHasta: "2026-08-31",
        profiles: ["core"],
        publish: false
    });
    const result = await service.wait(job.id);

    assert.equal(result.status, "VALIDATED");
    assert.ok(result.cacheBytes > 0);
    assert.equal(service.activeGeneration, "active-v1");
    assert.equal((await service.getSnapshot()).source, "active");
});


test("la generación usa warmOnly para no duplicar en memoria las colecciones cacheadas", async function () {
    let received;
    const service = new SnapshotGenerationService({
        active: activeGeneration(),
        snapshotFactory: function (generation) {
            return {
                getSnapshot: async function (options) {
                    received = options;
                    generation.cache.set(
                        generation.id + ":orders:2026-08",
                        [{ OrderId: "OT-1" }],
                        { softTtlMs: 1000, hardTtlMs: 2000 }
                    );
                    return { meta: { warmOnly: options.warmOnly } };
                },
                missingCacheKeys: function () { return []; }
            };
        }
    });

    const job = service.start({
        fechaDesde: "2026-08-01",
        fechaHasta: "2026-08-31",
        profiles: ["core"],
        publish: false
    });
    await service.wait(job.id);

    assert.equal(received.warmOnly, true);
});


test("crea una caché independiente para cada generación temporal", async function () {
    const generationIds = [];
    const service = new SnapshotGenerationService({
        active: activeGeneration(),
        cacheFactory: function (options) {
            generationIds.push(options.generationId);
            return new CacheService({ maxBytes: 1024 * 1024 });
        },
        snapshotFactory: function () {
            return {
                getSnapshot: async function () { return { meta: { warmOnly: true } }; },
                missingCacheKeys: function () { return []; }
            };
        }
    });

    const job = service.start({
        fechaDesde: "2026-08-01",
        fechaHasta: "2026-08-31",
        profiles: ["core"],
        publish: false
    });

    await service.wait(job.id);
    assert.equal(generationIds.length, 1);
    assert.match(generationIds[0], /^stage-/);
});


test("conserva A hasta que termine una lectura iniciada antes de publicar B", async function () {
    let releaseRead;
    const cache = new CacheService({ maxBytes: 1024 * 1024 });
    cache.set("active:orders", [{ OrderId: "A" }], { softTtlMs: 1000, hardTtlMs: 2000 });
    const active = {
        id: "active-v1",
        cache: cache,
        snapshots: {
            getSnapshot: function () {
                return new Promise((resolve) => { releaseRead = resolve; });
            }
        },
        publishedAt: 1
    };
    const service = new SnapshotGenerationService({
        active: active,
        snapshotFactory: function () {
            return {
                getSnapshot: async function () { return { meta: { warmOnly: true } }; },
                missingCacheKeys: function () { return []; }
            };
        }
    });

    const inFlight = service.getSnapshot();
    const job = service.start({
        fechaDesde: "2026-08-01",
        fechaHasta: "2026-08-31",
        profiles: ["core"]
    });

    await service.wait(job.id);
    assert.ok(cache.get("active:orders"));

    releaseRead({ source: "old-generation" });
    assert.equal((await inFlight).source, "old-generation");
    assert.equal(cache.get("active:orders"), null);
});
