"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createApiDashRouter } = require("../lib/ApiDashRouter");

function generationsStub() {
    return {
        activeGeneration: "active-v1",
        catalog: function () { return { profiles: [], dashboards: [] }; },
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
