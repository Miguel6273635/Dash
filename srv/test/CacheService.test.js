"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CacheService = require("../lib/CacheService");

test("reutiliza una entrada fresca sin ejecutar nuevamente el loader", async function () {
    let now = 1000;
    let calls = 0;
    const cache = new CacheService({ now: () => now, maxBytes: 1024 * 1024 });
    const loader = async function () { calls += 1; return [{ OrderId: "1" }]; };

    const first = await cache.getOrLoad("orders:2026-08", loader, { softTtlMs: 100, hardTtlMs: 1000 });
    now += 50;
    const second = await cache.getOrLoad("orders:2026-08", loader, { softTtlMs: 100, hardTtlMs: 1000 });

    assert.equal(first.cacheStatus, "MISS");
    assert.equal(second.cacheStatus, "HIT");
    assert.equal(calls, 1);
});

test("combina consultas simultáneas de la misma clave", async function () {
    let calls = 0;
    const cache = new CacheService({ maxBytes: 1024 * 1024 });
    const loader = async function () {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ["dato"];
    };

    const results = await Promise.all([
        cache.getOrLoad("orders:2026-08", loader, { softTtlMs: 1000, hardTtlMs: 2000 }),
        cache.getOrLoad("orders:2026-08", loader, { softTtlMs: 1000, hardTtlMs: 2000 })
    ]);

    assert.equal(calls, 1);
    assert.deepEqual(results[0].value, ["dato"]);
    assert.deepEqual(results[1].value, ["dato"]);
});

test("elimina entradas menos recientes al superar el límite de memoria", function () {
    const cache = new CacheService({ maxEntries: 2, maxBytes: 1024 * 1024 });

    cache.set("a", { value: 1 }, { softTtlMs: 1000, hardTtlMs: 2000 });
    cache.set("b", { value: 2 }, { softTtlMs: 1000, hardTtlMs: 2000 });
    cache.set("c", { value: 3 }, { softTtlMs: 1000, hardTtlMs: 2000 });

    assert.equal(cache.get("a"), null);
    assert.ok(cache.get("b"));
    assert.ok(cache.get("c"));
});

