"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createApiDashRouter } = require("../lib/ApiDashRouter");

function generationsStub() {
    return {
        activeGeneration: "active-v1",
        catalog: function () { return { profiles: [], dashboards: [] }; },
        plan: function (options) {
            return {
                dashboards: options.dashboards || [],
                profiles: options.profiles || [],
                include: ["orders", "materials"]
            };
        },
        status: function () { return { active: { id: "active-v1", cache: { entries: 0 } }, staging: null, jobs: [] }; },
        getSnapshot: async function () { return { orders: [], meta: {} }; },
        start: function () { return { id: "job-1", reused: false }; }
    };
}

test("publica el catálogo versionado de módulos de API_DASH", async function () {
    const app = express();
    app.use("/api/v1", createApiDashRouter({
        generations: generationsStub(),
        mantenimiento: {}
    }));
    const server = await new Promise(function (resolve) {
        const activeServer = app.listen(0, "127.0.0.1", function () {
            resolve(activeServer);
        });
    });

    try {
        const response = await fetch("http://127.0.0.1:" + server.address().port + "/api/v1/");
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.equal(body.data.name, "API_DASH");
        assert.equal(body.data.version, "v1");
        assert.equal(body.data.modules[0].key, "mantenimiento");
        assert.equal(body.data.modules[1].status, "PLANNED");
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});


test("la ruta de una pantalla usa sólo la generación activa y su perfil", async function () {
    const calls = [];
    const generations = generationsStub();
    generations.getSnapshot = async function (options) {
        calls.push(options);
        return { orders: [{ OrderId: "OT-1" }], materials: [], meta: {} };
    };
    const app = express();
    app.use("/api/v1", createApiDashRouter({ generations, mantenimiento: {} }));
    const server = await new Promise((resolve) => {
        const activeServer = app.listen(0, "127.0.0.1", () => resolve(activeServer));
    });

    try {
        const response = await fetch("http://127.0.0.1:" + server.address().port +
            "/api/v1/dashboard/snapshot?dashboard=ConsumoMateriales&fechaInicio=2026-08-01&fechaFin=2026-08-31");
        const body = await response.json();

        assert.equal(response.status, 200);
        assert.deepEqual(calls[0].include, ["orders", "materials"]);
        assert.equal(calls[0].cacheOnly, true);
        assert.equal(calls[0].dateFrom, "2026-08-01");
        assert.equal(calls[0].dateTo, "2026-08-31");
        assert.deepEqual(body.meta.dashboards, ["ConsumoMateriales"]);
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});
