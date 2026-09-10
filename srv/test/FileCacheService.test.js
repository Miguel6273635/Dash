"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const FileCacheService = require("../lib/FileCacheService");

function directoryForTest() {
    return fs.mkdtempSync(path.join(os.tmpdir(), "api-dash-file-cache-"));
}

test("guarda valores fuera del heap y los recupera por clave", async function (context) {
    const directory = directoryForTest();
    const cache = new FileCacheService({
        directory,
        maxBytes: 1024 * 1024,
        maxEntries: 10
    });

    context.after(function () {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    const first = await cache.getOrLoad(
        "v1:orders:2026-08",
        async function () {
            return [{ OrderId: "0001" }, { OrderId: "0002" }];
        },
        { softTtlMs: 1000, hardTtlMs: 2000 }
    );
    const second = await cache.getOrLoad(
        "v1:orders:2026-08",
        async function () {
            throw new Error("No debe consultar SAP cuando el archivo está vigente");
        },
        { softTtlMs: 1000, hardTtlMs: 2000 }
    );

    assert.equal(first.cacheStatus, "MISS");
    assert.equal(second.cacheStatus, "HIT");
    assert.deepEqual(second.value, [{ OrderId: "0001" }, { OrderId: "0002" }]);
    assert.equal(cache.status().storage, "disk");
    assert.equal(cache.status().entries, 1);
});

test("elimina del disco las entradas LRU que exceden la cuota", function (context) {
    const directory = directoryForTest();
    const cache = new FileCacheService({
        directory,
        maxEntries: 1,
        maxBytes: 1024 * 1024
    });

    context.after(function () {
        fs.rmSync(directory, { recursive: true, force: true });
    });

    cache.set("a", { value: 1 }, { softTtlMs: 1000, hardTtlMs: 2000 });
    cache.set("b", { value: 2 }, { softTtlMs: 1000, hardTtlMs: 2000 });

    assert.equal(cache.get("a"), null);
    assert.deepEqual(cache.get("b").value, { value: 2 });
    assert.equal(fs.readdirSync(directory).filter((name) => name.endsWith(".json")).length, 1);
});
