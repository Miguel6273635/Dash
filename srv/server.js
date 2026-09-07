"use strict";

const express = require("express");
const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");
const CacheService = require("./lib/CacheService");
const SapODataRepository = require("./lib/SapODataRepository");
const { DashboardSnapshotService } = require("./lib/DashboardSnapshotService");
const { buildDashboard } = require("./lib/dashboardMapper");

const app = express();
const port = Number(process.env.PORT || 4004);
const destinationName = process.env.SAP_DESTINATION_NAME || "QAS_MITSU_DASH";
const servicePath = process.env.SAP_ODATA_SERVICE_PATH || "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV";
const cache = new CacheService({
    maxEntries: Number(process.env.CACHE_MAX_ENTRIES || 400),
    maxBytes: Number(process.env.CACHE_MAX_BYTES || 128 * 1024 * 1024)
});
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
const snapshots = new DashboardSnapshotService({ cache, repository });

function toArray(value, fallback) {
    if (!value) {
        return fallback || [];
    }
    return String(value).split(",").map((item) => item.trim()).filter(Boolean);
}

function normalize(value) {
    return String(value || "").trim().toUpperCase();
}

function hasValue(value) {
    return !["", "TODOS", "TODAS", "ALL", "NULL"].includes(normalize(value));
}

function parseODataDate(value) {
    const match = String(value || "").match(/\/Date\((-?\d+)/);
    const date = match ? new Date(Number(match[1])) : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(value, from, to) {
    const date = parseODataDate(value);

    return Boolean(date) && date >= from && date <= new Date(
        to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999
    );
}

function canonicalStatus(order) {
    const status = normalize(order && (order.SapUserStatusCode || order.AppStatusCode));
    const appStatus = {
        "0100": "E0013",
        "0200": "E0014",
        "0300": "E0015",
        "0400": "E0016",
        "0500": "E0017",
        "0600": "E0018",
        "0301": "E0019"
    };

    return appStatus[status] || status;
}

function mapOrderType(value) {
    const map = { PREVENTIVO: "SM01", CORRECTIVO: "SM02", CALL_CENTER: "SM03" };
    return map[normalize(value)] || value;
}

function mapStatus(value) {
    const map = { ABIERTA: "E0013", EN_PROCESO: "E0014", COMPLETADA: "E0015" };
    return map[normalize(value)] || value;
}

function matches(value, requested) {
    return !hasValue(requested) || normalize(value) === normalize(requested);
}

function filterSnapshot(snapshot, filters) {
    const from = new Date(String(filters.fechaInicio || filters.fechaDesde).slice(6, 10), Number(String(filters.fechaInicio || filters.fechaDesde).slice(3, 5)) - 1, Number(String(filters.fechaInicio || filters.fechaDesde).slice(0, 2)));
    const to = new Date(String(filters.fechaFin || filters.fechaHasta).slice(6, 10), Number(String(filters.fechaFin || filters.fechaHasta).slice(3, 5)) - 1, Number(String(filters.fechaFin || filters.fechaHasta).slice(0, 2)));
    const orderType = mapOrderType(filters.tipoOrden);
    const status = mapStatus(filters.estadoOrden);
    const orders = (snapshot.orders || []).filter((order) =>
        ["SM01", "SM02", "SM03"].includes(normalize(order.OrderTypeCode)) &&
        isWithinRange(order.PlannedStartDate, from, to) &&
        matches(order.OrderTypeCode, orderType) &&
        matches(canonicalStatus(order), status) &&
        matches(order.Zona, filters.zona) &&
        matches(order.SupervisorId, filters.supervisor) &&
        matches(order.Turno, filters.turno) &&
        matches(order.Mecanico, filters.mecanico)
    );
    const orderIds = new Set(orders.map((order) => String(order.OrderId)));
    const materialIds = new Set((snapshot.materials || [])
        .filter((material) => orderIds.has(String(material.OrderId)))
        .map((material) => String(material.MaterialRequirementId)));

    return {
        orders,
        causes: (snapshot.causes || []).filter((item) => orderIds.has(String(item.OrderId))),
        materials: (snapshot.materials || []).filter((item) => orderIds.has(String(item.OrderId))),
        movements: (snapshot.movements || []).filter((item) => materialIds.has(String(item.MaterialRequirementId))),
        assignments: (snapshot.assignments || []).filter((item) => orderIds.has(String(item.OrderId))),
        operations: (snapshot.operations || []).filter((item) => orderIds.has(String(item.OrderId))),
        confirmations: (snapshot.confirmations || []).filter((item) =>
            orderIds.has(String(item.OrderId)) && isWithinRange(item.ActualStartDate, from, to)
        ),
        blockOrders: (snapshot.blockOrders || []).filter((item) => orderIds.has(String(item.OrderId))),
        resources: (snapshot.resources || []).filter((resource) =>
            isWithinRange(resource.WorkDate, from, to) &&
            (!hasValue(filters.zona) || matches(resource.ZoneId, filters.zona) || matches(resource.ZoneName, filters.zona)) &&
            matches(resource.SupervisorId, filters.supervisor) &&
            matches(resource.ShiftId, filters.turno) &&
            matches(resource.ResourceId, filters.mecanico)
        ),
        catalogs: snapshot.catalogs || [],
        serviceRequests: [],
        blocks: [],
        range: { startDate: from, endDate: to }
    };
}

function errorResponse(response, error) {
    const status = error && error.response && error.response.status;

    console.error("Error de API de caché:", error.message);
    response.status(status && status < 600 ? status : 502).json({
        success: false,
        message: "No fue posible actualizar o consultar la caché de mantenimiento.",
        detail: error.message
    });
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.get("/health", function (request, response) {
    response.json({
        success: true,
        service: "mantenimiento-cache-api",
        destination: destinationName,
        servicePath
    });
});

app.get("/api/cache/status", function (request, response) {
    response.json({ success: true, data: cache.status() });
});

app.get("/api/dashboard/snapshot", async function (request, response) {
    try {
        const data = await snapshots.getSnapshot({
            dateFrom: request.query.fechaDesde || request.query.dateFrom,
            dateTo: request.query.fechaHasta || request.query.dateTo,
            include: toArray(request.query.include, ["orders", "catalogs"]),
            forceRefresh: String(request.query.refresh || "").toLowerCase() === "true"
        });

        response.json({ success: true, data });
    } catch (error) {
        errorResponse(response, error);
    }
});

app.get("/api/dashboard/mantenimiento", async function (request, response) {
    try {
        const filters = request.query || {};
        const snapshot = await snapshots.getSnapshot({
            dateFrom: filters.fechaInicio || filters.fechaDesde || filters.dateFrom,
            dateTo: filters.fechaFin || filters.fechaHasta || filters.dateTo,
            include: ["orders", "causes", "materials", "movements", "assignments", "operations", "confirmations", "blockOrders", "resources", "catalogs"],
            forceRefresh: String(filters.refresh || "").toLowerCase() === "true"
        });
        const dashboard = buildDashboard(filterSnapshot(snapshot, filters));

        dashboard.meta = {
            source: "MANTENIMIENTO_CACHE_API",
            generatedAt: new Date().toISOString(),
            cache: snapshot.meta.cache,
            months: snapshot.meta.months,
            records: {
                orders: dashboard.summary && dashboard.summary.plannedOrders || 0
            }
        };
        response.json({ success: true, data: dashboard });
    } catch (error) {
        errorResponse(response, error);
    }
});

app.post("/api/cache/refresh", async function (request, response) {
    try {
        const body = request.body || {};
        const result = await snapshots.refresh({
            dateFrom: body.fechaDesde || body.dateFrom,
            dateTo: body.fechaHasta || body.dateTo,
            include: Array.isArray(body.include) ? body.include : toArray(body.include, ["orders", "catalogs"]),
            scope: body.scope || "active",
            catalogs: Boolean(body.catalogs)
        });

        response.json({
            success: true,
            message: "La caché del periodo fue actualizada.",
            data: result,
            cache: cache.status()
        });
    } catch (error) {
        errorResponse(response, error);
    }
});

if (require.main === module) {
    app.listen(port, function () {
        console.log("mantenimiento-cache-api escuchando en puerto " + port);
    });
}

module.exports = { app, cache, repository, snapshots };

