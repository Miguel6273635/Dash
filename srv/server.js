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

function parseFilterDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const date = match
        ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
        : new Date(text.slice(0, 10) + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        throw new Error("Fecha de filtro inválida: " + value);
    }
    return date;
}

function isWithinRange(value, from, to) {
    const date = parseODataDate(value);

    return Boolean(date) && date >= from && date <= new Date(
        to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999
    );
}

function overlapsRange(startValue, endValue, from, to) {
    const start = parseODataDate(startValue);
    const end = parseODataDate(endValue) || to;
    const lastMoment = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);

    return Boolean(start) && start <= lastMoment && end >= from;
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
    const from = parseFilterDate(filters.fechaInicio || filters.fechaDesde || filters.dateFrom);
    const to = parseFilterDate(filters.fechaFin || filters.fechaHasta || filters.dateTo);
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
    const blocks = (snapshot.blocks || []).filter((block) =>
        overlapsRange(block.BlockedAt, block.ReleasedAt, from, to) &&
        (matches(block.ZoneId, filters.zona) || matches(block.ZoneName, filters.zona)) &&
        matches(block.SupervisorId, filters.supervisor)
    );
    const blockIds = new Set(blocks.map((block) => String(block.BlockId)));

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
        blockOrders: (snapshot.blockOrders || []).filter((item) =>
            orderIds.has(String(item.OrderId)) && blockIds.has(String(item.BlockId))
        ),
        resources: (snapshot.resources || []).filter((resource) =>
            isWithinRange(resource.WorkDate, from, to) &&
            (!hasValue(filters.zona) || matches(resource.ZoneId, filters.zona) || matches(resource.ZoneName, filters.zona)) &&
            matches(resource.SupervisorId, filters.supervisor) &&
            matches(resource.ShiftId, filters.turno) &&
            matches(resource.ResourceId, filters.mecanico)
        ),
        catalogs: snapshot.catalogs || [],
        serviceRequests: (snapshot.serviceRequests || []).filter((request) =>
            isWithinRange(request.RequestedAt, from, to) &&
            matches(request.ZoneId, filters.zona) &&
            matches(request.ResponsibleId, filters.mecanico)
        ),
        blocks,
        range: { startDate: from, endDate: to }
    };
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

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.get("/health", function (request, response) {
    response.json({
        success: true,
        service: "API_DASH",
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
            include: ["orders", "causes", "materials", "movements", "assignments", "operations", "confirmations", "blockOrders", "resources", "catalogs", "serviceRequests", "blocks"],
            forceRefresh: String(filters.refresh || "").toLowerCase() === "true"
        });
        const dashboard = buildDashboard(filterSnapshot(snapshot, filters));

        dashboard.meta = {
            source: "API_DASH",
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
            catalogs: Boolean(body.catalogs),
            independent: Boolean(body.independent)
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
        console.log("API_DASH escuchando en puerto " + port);
    });
}

module.exports = { app, cache, repository, snapshots };

