"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const { createApiDashRouter } = require("../lib/ApiDashRouter");

test("publica el catálogo versionado de módulos de API_DASH", async function () {
    const app = express();
    app.use("/api/v1", createApiDashRouter({
        cache: { status: function () { return { entries: 0 }; } },
        snapshots: {},
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

