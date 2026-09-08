"use strict";

const express = require("express");
const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");
const CacheService = require("./lib/CacheService");
const SapODataRepository = require("./lib/SapODataRepository");
const { DashboardSnapshotService } = require("./lib/DashboardSnapshotService");
const { CachePrewarmService } = require("./lib/CachePrewarmService");
const { SnapshotGenerationService } = require("./lib/SnapshotGenerationService");
const { MantenimientoDashboardService } = require("./lib/MantenimientoDashboardService");
const { createApiDashRouter } = require("./lib/ApiDashRouter");
const { buildDashboard } = require("./lib/dashboardMapper");

const app = express();
const port = Number(process.env.PORT || 4004);
const destinationName = process.env.SAP_DESTINATION_NAME || "QAS_MITSU_DASH";
const servicePath = process.env.SAP_ODATA_SERVICE_PATH || "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV";
const cacheOptions = {
    maxEntries: Number(process.env.CACHE_MAX_ENTRIES || 400),
    maxBytes: Number(process.env.CACHE_MAX_BYTES || 128 * 1024 * 1024)
};
const cache = new CacheService(cacheOptions);
const repository = new SapODataRepository({
    servicePath,
    batchSize: 15,
    execute: function (url) {
        return executeHttpRequest(
            { destinationName },
            { method: "GET", url, headers: { Accept: "application/json" } },
            { fetchCsrfToken: false }
        );
    }
});
const snapshots = new DashboardSnapshotService({ cache, repository, namespace: "v1" });
const generations = new SnapshotGenerationService({
    repository,
    cacheOptions,
    active: { id: "v1", cache, snapshots, publishedAt: Date.now() }
});

// La precarga inicial mantiene el comportamiento ya comprobado (órdenes y
// catálogos). La actualización completa usa generations y nunca borra A antes
// de que B esté validada.
const prewarm = new CachePrewarmService({ snapshots: generations });
const mantenimiento = new MantenimientoDashboardService({
    snapshots: generations,
    buildDashboard
});
const api = createApiDashRouter({ generations, mantenimiento, prewarm });

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.get("/health", function (request, response) {
    response.json({
        success: true,
        service: "API_DASH",
        version: "v1",
        destination: destinationName,
        servicePath,
        activeGeneration: generations.activeGeneration
    });
});

// v1 es la interfaz estable para nuevas pantallas. La segunda ruta conserva
// compatibilidad temporal con la primera integración de Mantenimiento.
app.use("/api/v1", api);
app.use("/api", api);

if (require.main === module) {
    app.listen(port, function () {
        console.log("API_DASH escuchando en puerto " + port);
    });
}

module.exports = {
    app,
    cache,
    repository,
    snapshots,
    generations,
    prewarm,
    mantenimiento
};
