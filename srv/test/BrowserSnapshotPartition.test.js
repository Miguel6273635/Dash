"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadUi5Module(file, dependency, hostname) {
    let exported;
    const context = {
        window: {
            location: { hostname: hostname || "port8082.applicationstudio.cloud.sap" },
            fetch: dependency.fetch
        },
        URLSearchParams,
        sap: { ui: { define: function (names, factory) {
            exported = factory(dependency.module);
        } } }
    };

    vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { filename: file });
    return exported;
}

const apiFile = path.resolve(__dirname, "../../webapp/model/DashboardCacheApiService.js");
const adapterFile = path.resolve(__dirname, "../../webapp/model/DashboardCacheODataModel.js");

test("la consulta anual se divide por mes y entidad sin alterar la deduplicación", async function () {
    const urls = [];
    const api = loadUi5Module(apiFile, {
        fetch: async function (url) {
            urls.push(url);
            const query = new URL(url, "https://preview.test").searchParams;
            const month = query.get("fechaDesde").slice(0, 7);
            const target = query.get("include");
            const data = { meta: { namespace: "generation-1", cacheOnly: true, cache: {} } };

            data[target] = target === "orders"
                ? [{ OrderId: "shared", month: month }, { OrderId: month }]
                : [{ FilterCatalogId: "global" }];
            return { ok: true, json: async function () { return { success: true, data: data }; } };
        }
    });

    const result = await api.loadSnapshot({
        fechaDesde: "2026-01-01",
        fechaHasta: "2026-12-31"
    }, ["orders", "catalogs"]);

    assert.equal(urls.length, 13);
    assert.equal(urls.filter((url) => url.includes("include=orders")).length, 12);
    assert.equal(urls.filter((url) => url.includes("include=catalogs")).length, 1);
    assert.equal(result.orders.length, 13);
    assert.equal(result.orders[0].month, "2026-12");
    assert.equal(result.catalogs.length, 1);
    assert.equal(result.meta.months.length, 12);
});

test("preserva las fechas parciales y rechaza mezcla de generaciones", async function () {
    const urls = [];
    const api = loadUi5Module(apiFile, {
        fetch: async function (url) {
            urls.push(url);
            const data = {
                orders: [],
                meta: {
                    namespace: urls.length === 1 ? "generation-a" : "generation-b",
                    cacheOnly: true,
                    cache: {}
                }
            };
            return { ok: true, json: async function () { return { success: true, data: data }; } };
        }
    });

    await assert.rejects(api.loadSnapshot({
        fechaDesde: "2026-01-15",
        fechaHasta: "2026-02-10"
    }, ["orders"]), /generación de caché cambió/);
    assert.match(urls[0], /fechaDesde=2026-01-15/);
    assert.match(urls[0], /fechaHasta=2026-01-31/);
    assert.match(urls[1], /fechaDesde=2026-02-01/);
    assert.match(urls[1], /fechaHasta=2026-02-10/);
});

test("el adaptador carga cada EntitySet sólo al leerlo y comparte la lectura", async function () {
    const calls = [];
    const adapter = loadUi5Module(adapterFile, {
        module: {
            loadSnapshot: function (range, targets) {
                calls.push({ range: range, targets: targets });
                return Promise.resolve({ orders: [
                    { OrderId: "A" }, { OrderId: "B" }, { OrderId: "C" }
                ] });
            }
        }
    });
    const model = adapter.wrap(null, {
        fechaDesde: "2026-01-01", fechaHasta: "2026-12-31"
    }, ["orders", "operations"]);
    const read = function (config) {
        return new Promise(function (resolve, reject) {
            model.read("/DashboardOrdersSet", Object.assign({}, config, {
                success: resolve,
                error: reject
            }));
        });
    };

    assert.equal(calls.length, 0);
    const rows = await Promise.all([
        read({ urlParameters: { $skip: 1, $top: 1 } }),
        read({ urlParameters: { $filter: "OrderId eq 'C'" } })
    ]);
    assert.equal(calls.length, 1);
    assert.deepEqual(Array.from(calls[0].targets), ["orders"]);
    assert.deepEqual(Array.from(rows[0].results, (row) => row.OrderId), ["B"]);
    assert.deepEqual(Array.from(rows[1].results, (row) => row.OrderId), ["C"]);
});
