"use strict";

const express = require("express");

function toArray(value, fallback) {
    if (!value) { return fallback || []; }
    return Array.isArray(value)
        ? value.map(String).map((item) => item.trim()).filter(Boolean)
        : String(value).split(",").map((item) => item.trim()).filter(Boolean);
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
    const generations = config.generations;
    const mantenimiento = config.mantenimiento;
    const prewarm = config.prewarm;

    if (!generations) {
        throw new Error("createApiDashRouter requiere SnapshotGenerationService");
    }

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

    router.get("/dashboards", function (request, response) {
        response.json({ success: true, data: generations.catalog() });
    });

    router.get("/cache/status", function (request, response) {
        const generationStatus = generations.status();
        // Conserva entries/bytes en la raíz para clientes ya desplegados y
        // expone el detalle de A/B para la nueva administración de caché.
        const status = Object.assign({}, generationStatus.active.cache, {
            activeGeneration: generationStatus.active.id,
            generations: generationStatus
        });
        if (prewarm) {
            status.prewarm = prewarm.status();
        }
        response.json({ success: true, data: status });
    });

    router.get("/cache/prewarm", function (request, response) {
        if (!prewarm) {
            response.status(501).json({ success: false, message: "La precarga no está configurada." });
            return;
        }
        response.json({ success: true, data: prewarm.status() });
    });

    router.post("/cache/prewarm", function (request, response) {
        try {
            if (!prewarm) {
                response.status(501).json({ success: false, message: "La precarga no está configurada." });
                return;
            }
            const body = request.body || {};
            const job = prewarm.start({
                fechaDesde: body.fechaDesde || body.dateFrom,
                fechaHasta: body.fechaHasta || body.dateTo
            });
            response.status(job.reused ? 200 : 202).json({
                success: true,
                message: job.reused
                    ? "Ya existe una precarga base activa para el periodo solicitado."
                    : "La precarga base inició en segundo plano, un mes a la vez.",
                data: job
            });
        } catch (error) { errorResponse(response, error); }
    });

    router.get("/cache/refresh", function (request, response) {
        response.json({ success: true, data: generations.status() });
    });

    router.post("/cache/refresh", function (request, response) {
        try {
            const body = request.body || {};
            const job = generations.start({
                fechaDesde: body.fechaDesde || body.dateFrom,
                fechaHasta: body.fechaHasta || body.dateTo,
                profiles: toArray(body.profiles),
                dashboards: toArray(body.dashboards)
            });
            response.status(job.reused ? 200 : 202).json({
                success: true,
                message: job.reused
                    ? "Ya existe una actualización para ese periodo y conjunto de pantallas."
                    : "La generación temporal inició. Los usuarios continúan consultando la información vigente hasta la publicación atómica.",
                data: job
            });
        } catch (error) { errorResponse(response, error); }
    });

    router.get("/dashboard/snapshot", async function (request, response) {
        try {
            const data = await generations.getSnapshot({
                dateFrom: request.query.fechaDesde || request.query.dateFrom,
                dateTo: request.query.fechaHasta || request.query.dateTo,
                include: toArray(request.query.include, ["orders", "catalogs"])
            });
            response.json({
                success: true,
                data,
                meta: { activeGeneration: generations.activeGeneration }
            });
        } catch (error) { errorResponse(response, error); }
    });

    router.get(["/mantenimiento", "/dashboard/mantenimiento"], async function (request, response) {
        try {
            // refresh=true dejó de forzar lecturas contra SAP desde la pantalla.
            // La actualización siempre se solicita con POST /cache/refresh.
            const data = await mantenimiento.getDashboard(request.query || {}, false);
            response.json({
                success: true,
                data,
                meta: { activeGeneration: generations.activeGeneration }
            });
        } catch (error) { errorResponse(response, error); }
    });

    return router;
}

module.exports = { createApiDashRouter };
