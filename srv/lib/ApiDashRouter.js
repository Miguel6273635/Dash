"use strict";

const express = require("express");

function toArray(value, fallback) {
    if (!value) { return fallback || []; }
    return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function errorResponse(response, error) {
    const status = error && error.response && error.response.status;
    console.error("Error de API_DASH:", error.message);
    response.status(status && status < 600 ? status : 502).json({
        success: false,
        message: "No fue posible actualizar o consultar API_DASH.",
        detail: error.message
    });
}

function createApiDashRouter(options) {
    const config = options || {};
    const router = express.Router();
    const snapshots = config.snapshots;
    const cache = config.cache;
    const mantenimiento = config.mantenimiento;

    router.get("/", function (request, response) {
        response.json({ success: true, data: {
            name: "API_DASH",
            version: "v1",
            modules: [
                { key: "mantenimiento", status: "ACTIVE", endpoint: "/api/v1/mantenimiento" },
                { key: "finanzas", status: "PLANNED" },
                { key: "compras", status: "PLANNED" }
            ]
        }});
    });

    router.get("/cache/status", function (request, response) {
        response.json({ success: true, data: cache.status() });
    });

    router.get("/dashboard/snapshot", async function (request, response) {
        try {
            const data = await snapshots.getSnapshot({
                dateFrom: request.query.fechaDesde || request.query.dateFrom,
                dateTo: request.query.fechaHasta || request.query.dateTo,
                include: toArray(request.query.include, ["orders", "catalogs"]),
                forceRefresh: String(request.query.refresh || "").toLowerCase() === "true"
            });
            response.json({ success: true, data });
        } catch (error) { errorResponse(response, error); }
    });

    router.get(["/mantenimiento", "/dashboard/mantenimiento"], async function (request, response) {
        try {
            const data = await mantenimiento.getDashboard(
                request.query || {},
                String(request.query.refresh || "").toLowerCase() === "true"
            );
            response.json({ success: true, data });
        } catch (error) { errorResponse(response, error); }
    });

    router.post("/cache/refresh", async function (request, response) {
        try {
            const body = request.body || {};
            const result = await snapshots.refresh({
                dateFrom: body.fechaDesde || body.dateFrom,
                dateTo: body.fechaHasta || body.dateTo,
                include: Array.isArray(body.include) ? body.include : toArray(body.include, ["orders", "catalogs"]),
                scope: body.scope || "active",
                catalogs: Boolean(body.catalogs),
                independent: Boolean(body.independent)
            });
            response.json({ success: true, message: "La caché del periodo fue actualizada.", data: result, cache: cache.status() });
        } catch (error) { errorResponse(response, error); }
    });

    return router;
}

module.exports = { createApiDashRouter };

