"use strict";

const path = require("node:path");
const express = require("express");
const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");
const { buildDashboard } = require("./lib/dashboardMapper");

const app = express();
const port = Number(process.env.PORT || 4004);
const destinationName = process.env.SAP_DESTINATION_NAME || "QAS_MITSU_DASH";
const upstreamBaseUrl = normalizeBaseUrl(process.env.SAP_ODATA_BASE_URL);
const servicePath = normalizeServicePath(
    process.env.SAP_ODATA_SERVICE_PATH || "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV"
);
const pageSize = Math.max(100, Number(process.env.SAP_ODATA_PAGE_SIZE || 2000));
const cacheTtlMs = Math.max(0, Number(process.env.SAP_ODATA_CACHE_TTL_MS || 60000));
let rawDataCache = { expiresAt: 0, data: null, pending: null };

const TYPE_MAP = {
    PREVENTIVO: "SM01",
    CORRECTIVO: "SM02",
    CALL_CENTER: "SM03"
};

const STATUS_MAP = {
    ABIERTA: "E0013",
    EN_PROCESO: "E0014",
    COMPLETADA: "E0015"
};

function normalizeBaseUrl(value) {
    return String(value || "").trim().replace(/\/+$/, "") || null;
}

const SELECTS = {
    DashboardOrdersSet: [
        "OrderId",
        "OrderTypeCode",
        "OrderTypeText",
        "PlannedStartDate",
        "PlannedFinishDate",
        "SapUserStatusCode",
        "AppStatusCode",
        "StatusText",
        "SupervisorId",
        "Mecanico",
        "Turno",
        "Zona"
    ],
    DashboardOrderCausesSet: [
        "OrderCauseId",
        "OrderId",
        "CauseCode",
        "CauseText",
        "CauseContextCode",
        "IsPrimary",
        "ValidTo"
    ],
    DashboardOrderMaterialsSet: [
        "MaterialRequirementId",
        "OrderId",
        "MaterialCategoryCode",
        "MaterialCategoryName",
        "BaseUnitCode",
        "PlannedQuantity",
        "IsPublishable"
    ],
    DashboardMaterialMovementsSet: [
        "MaterialMovementId",
        "MaterialRequirementId",
        "MovementDirectionCode",
        "MovementQuantity",
        "MovementUnitCode",
        "IsReversal"
    ],
    DashboardServiceRequestsSet: [
        "RequestId",
        "ZoneId",
        "ResponsibleId",
        "RequestedAt",
        "AttendedAt",
        "ClosedAt",
        "CurrentStatusCode"
    ],
    DashboardEquipmentBlocksSet: [
        "BlockId",
        "ZoneId",
        "SupervisorId",
        "BlockedAt",
        "ReleasedAt",
        "CurrentStatusCode",
        "IsPublishable"
    ],
    DashboardBlockOrdersSet: [
        "BlockOrderId",
        "BlockId",
        "OrderId",
        "ImpactStartAt",
        "ImpactEndAt"
    ],
    DashboardFilterCatalogSet: [
        "FilterCatalogId",
        "FilterDomain",
        "ValueId",
        "ValueText",
        "NumericValue",
        "UnitCode",
        "ScopeTypeCode",
        "ScopeId",
        "SortOrder",
        "Active"
    ],
    DashboardOrderResourcesSet: ["OrderResourceId", "OrderId", "ResourceId", "ValidTo"],
    DashboardResourceDailySet: [
        "ResourceDateId",
        "ResourceId",
        "ResourceName",
        "ResourceTypeCode",
        "WorkDate",
        "ZoneId",
        "ZoneName",
        "SupervisorId",
        "SupervisorName",
        "ShiftId",
        "ShiftName",
        "AvailabilityStatusCode",
        "CapacitySourceValidated",
        "CapacityHours"
    ],
    DashboardOrderOperationsSet: [
        "OperationKey",
        "OrderId",
        "OperationCounter",
        "PlannedSourceCode",
        "PlannedValueOriginal",
        "PlannedUnitOriginal",
        "CapacityLineNumber",
        "PlannedStartDate"
    ],
    DashboardOrderConfirmationsSet: [
        "ConfirmationId",
        "OrderId",
        "ActualValueOriginal",
        "ActualUnitOriginal",
        "ActualStartDate",
        "IncludedInCalculation"
    ]
};

function normalizeServicePath(value) {
    const path = String(value || "").trim().replace(/\/+$/, "");
    return path.startsWith("/") ? path : `/${path}`;
}

function hasValue(value) {
    const normalized = String(value || "").trim().toUpperCase();
    return normalized && !["TODOS", "TODAS", "ALL", "NULL"].includes(normalized);
}

function parseDate(value, endOfDay) {
    if (!value) {
        return null;
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const isoDate = match ? `${match[3]}-${match[2]}-${match[1]}` : text.slice(0, 10);
    const date = new Date(`${isoDate}T${endOfDay ? "23:59:59" : "00:00:00"}`);

    return Number.isNaN(date.getTime()) ? null : date;
}

function getFilterContext(query) {
    const typeKey = String(query.tipoOrden || "").toUpperCase();
    const statusKey = String(query.estadoOrden || "").toUpperCase();

    return {
        startDate: parseDate(query.fechaInicio, false),
        endDate: parseDate(query.fechaFin, true),
        zone: hasValue(query.zona) ? String(query.zona) : null,
        supervisor: hasValue(query.supervisor) ? String(query.supervisor) : null,
        orderType: hasValue(typeKey) ? TYPE_MAP[typeKey] || typeKey : null,
        shift: hasValue(query.turno) ? String(query.turno) : null,
        mechanic: hasValue(query.mecanico) ? String(query.mecanico) : null,
        status: hasValue(statusKey) ? STATUS_MAP[statusKey] || statusKey : null
    };
}

function normalizeValue(value) {
    return String(value || "").trim().toUpperCase();
}

function parseODataDate(value) {
    if (!value) {
        return null;
    }

    const match = String(value).match(/\/Date\((-?\d+)/);
    const date = match ? new Date(Number(match[1])) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function isWithinRange(value, startDate, endDate) {
    const date = parseODataDate(value);

    if (!startDate && !endDate) {
        return true;
    }
    if (!date) {
        return false;
    }

    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

function matches(value, expected) {
    return !expected || normalizeValue(value) === normalizeValue(expected);
}

function filterOrders(orders, context) {
    return orders.filter((order) =>
        ["SM01", "SM02", "SM03"].includes(normalizeValue(order.OrderTypeCode)) &&
        isWithinRange(order.PlannedStartDate, context.startDate, context.endDate) &&
        matches(order.OrderTypeCode, context.orderType) &&
        matches(order.SapUserStatusCode, context.status) &&
        matches(order.Zona, context.zone) &&
        matches(order.SupervisorId, context.supervisor) &&
        matches(order.Turno, context.shift) &&
        matches(order.Mecanico, context.mechanic)
    );
}

function filterServiceRequests(requests, context) {
    return requests.filter((request) =>
        isWithinRange(request.RequestedAt, context.startDate, context.endDate) &&
        matches(request.ZoneId, context.zone) &&
        matches(request.ResponsibleId, context.mechanic)
    );
}

function filterBlocks(blocks, context) {
    return blocks.filter((block) => {
        const blockedAt = parseODataDate(block.BlockedAt);
        const releasedAt = parseODataDate(block.ReleasedAt);
        const overlapsRange =
            (!context.endDate || !blockedAt || blockedAt <= context.endDate) &&
            (!context.startDate || !releasedAt || releasedAt >= context.startDate);

        return overlapsRange &&
            matches(block.ZoneId, context.zone) &&
            matches(block.SupervisorId, context.supervisor);
    });
}

function filterResources(resources, context) {
    return resources.filter((resource) =>
        isWithinRange(resource.WorkDate, context.startDate, context.endDate) &&
        matches(resource.ZoneId, context.zone) &&
        matches(resource.SupervisorId, context.supervisor) &&
        matches(resource.ShiftId, context.shift) &&
        matches(resource.ResourceId, context.mechanic)
    );
}

function buildUrl(entitySet, filter) {
    const params = ["$format=json", `$top=${pageSize}`];
    const select = SELECTS[entitySet];

    if (select) {
        params.push(`$select=${encodeURIComponent(select.join(","))}`);
    }
    if (filter) {
        params.push(`$filter=${encodeURIComponent(filter)}`);
    }

    const root = upstreamBaseUrl || servicePath;
    return `${root}/${entitySet}?${params.join("&")}`;
}

function normalizeNextUrl(nextUrl) {
    if (!nextUrl) {
        return null;
    }

    if (/^https?:\/\//i.test(nextUrl)) {
        const parsed = new URL(nextUrl);
        if (upstreamBaseUrl) {
            const entityAndKey = parsed.pathname.split("/").pop();
            return `${upstreamBaseUrl}/${entityAndKey}${parsed.search}`;
        }
        return `${parsed.pathname}${parsed.search}`;
    }

    if (upstreamBaseUrl) {
        return nextUrl.startsWith("/")
            ? `${new URL(upstreamBaseUrl).origin}${nextUrl}`
            : `${upstreamBaseUrl}/${nextUrl}`;
    }

    return nextUrl.startsWith("/") ? nextUrl : `${servicePath}/${nextUrl}`;
}

async function executeOData(url) {
    if (upstreamBaseUrl) {
        const response = await fetch(url, {
            method: "GET",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(45000)
        });

        if (!response.ok) {
            const error = new Error(`El API OData respondió HTTP ${response.status}`);
            error.response = { status: response.status };
            throw error;
        }

        return { data: await response.json() };
    }

    return executeHttpRequest(
        { destinationName },
        {
            method: "GET",
            url,
            headers: { Accept: "application/json" }
        },
        { fetchCsrfToken: false }
    );
}

async function fetchAll(entitySet, filter) {
    const results = [];
    let nextUrl = buildUrl(entitySet, filter);
    let page = 0;

    while (nextUrl) {
        page += 1;
        if (page > 100) {
            throw new Error(`Se excedió el límite de paginación para ${entitySet}`);
        }

        const response = await executeOData(nextUrl);
        const body = response.data || {};
        const container = body.d || body;
        const pageResults = Array.isArray(container.results)
            ? container.results
            : Array.isArray(container.value)
                ? container.value
                : [];

        results.push(...pageResults);
        nextUrl = normalizeNextUrl(container.__next || body["@odata.nextLink"]);
    }

    return results;
}

async function fetchRawDashboardData(forceRefresh) {
    const now = Date.now();

    if (!forceRefresh && rawDataCache.data && rawDataCache.expiresAt > now) {
        return rawDataCache.data;
    }
    if (!forceRefresh && rawDataCache.pending) {
        return rawDataCache.pending;
    }

    rawDataCache.pending = Promise.all([
        fetchAll("DashboardOrdersSet"),
        fetchAll("DashboardOrderCausesSet"),
        fetchAll("DashboardOrderMaterialsSet"),
        fetchAll("DashboardMaterialMovementsSet"),
        fetchAll("DashboardServiceRequestsSet"),
        fetchAll("DashboardEquipmentBlocksSet"),
        fetchAll("DashboardBlockOrdersSet"),
        fetchAll("DashboardFilterCatalogSet"),
        fetchAll("DashboardResourceDailySet"),
        fetchAll("DashboardOrderOperationsSet"),
        fetchAll("DashboardOrderConfirmationsSet")
    ]).then(([
        orders,
        causes,
        materials,
        movements,
        serviceRequests,
        blocks,
        blockOrders,
        catalogs,
        resources,
        operations,
        confirmations
    ]) => ({
        orders,
        causes,
        materials,
        movements,
        serviceRequests,
        blocks,
        blockOrders,
        catalogs,
        resources,
        operations,
        confirmations
    }));

    try {
        const data = await rawDataCache.pending;
        rawDataCache = {
            data,
            expiresAt: Date.now() + cacheTtlMs,
            pending: null
        };
        return data;
    } catch (error) {
        rawDataCache.pending = null;
        throw error;
    }
}

async function loadDashboard(query) {
    const context = getFilterContext(query);
    // El metadata publicado marca los campos como no filterable. Por eso BTP
    // obtiene registros base y aplica los filtros sin depender de $filter.
    const rawData = await fetchRawDashboardData(String(query.refresh || "").toLowerCase() === "true");
    const rawOrders = rawData.orders;
    const rawCauses = rawData.causes;
    const rawMaterials = rawData.materials;
    const rawMovements = rawData.movements;
    const rawServiceRequests = rawData.serviceRequests;
    const rawBlocks = rawData.blocks;
    const catalogs = rawData.catalogs;
    const orders = filterOrders(rawOrders, context);
    const orderIds = new Set(orders.map((order) => String(order.OrderId)));
    const nonExecutedIds = new Set(
        orders
            .filter((order) => ["E0013", "E0014"].includes(normalizeValue(order.SapUserStatusCode)))
            .map((order) => String(order.OrderId))
    );
    const causes = rawCauses.filter((cause) => nonExecutedIds.has(String(cause.OrderId)));
    const materials = rawMaterials.filter((material) =>
        orderIds.has(String(material.OrderId)) && material.IsPublishable !== false
    );
    const materialRequirementIds = new Set(
        materials.map((material) => String(material.MaterialRequirementId))
    );
    const movements = rawMovements.filter((movement) =>
        materialRequirementIds.has(String(movement.MaterialRequirementId)) && movement.IsReversal !== true
    );
    const serviceRequests = filterServiceRequests(rawServiceRequests, context);
    const blocks = filterBlocks(rawBlocks, context);
    const blockIds = new Set(blocks.map((block) => String(block.BlockId)));
    const blockOrders = rawData.blockOrders.filter((blockOrder) =>
        blockIds.has(String(blockOrder.BlockId)) &&
        orderIds.has(String(blockOrder.OrderId)) &&
        !blockOrder.ImpactEndAt
    );
    const resources = filterResources(rawData.resources, context);
    const operations = rawData.operations.filter((operation) => orderIds.has(String(operation.OrderId)));
    const confirmations = rawData.confirmations.filter((confirmation) =>
        orderIds.has(String(confirmation.OrderId)) &&
        isWithinRange(confirmation.ActualStartDate, context.startDate, context.endDate)
    );
    const dashboard = buildDashboard({
        orders,
        causes,
        materials,
        movements,
        serviceRequests,
        blocks,
        blockOrders,
        catalogs,
        resources,
        operations,
        confirmations,
        allOrders: rawOrders,
        allResources: rawData.resources,
        range: {
            startDate: context.startDate,
            endDate: context.endDate
        }
    });

    return {
        ...dashboard,
        meta: {
            source: "SAP_ODATA",
            endpoint: upstreamBaseUrl || `${destinationName}:${servicePath}`,
            generatedAt: new Date().toISOString(),
            records: {
                orders: orders.length,
                causes: causes.length,
                materials: materials.length,
                movements: movements.length,
                serviceRequests: serviceRequests.length,
                blocks: blocks.length,
                blockOrders: blockOrders.length,
                resources: resources.length,
                operations: operations.length,
                confirmations: confirmations.length
            }
        }
    };
}

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "..", "webapp")));

app.get("/api/health", (request, response) => {
    response.json({
        success: true,
        service: "dashboard-mantenimiento-api",
        transport: upstreamBaseUrl ? "DIRECT_URL" : "BTP_DESTINATION",
        destination: destinationName,
        servicePath,
        endpoint: upstreamBaseUrl || null
    });
});

app.get("/api/dashboard/mantenimiento", async (request, response) => {
    try {
        const data = await loadDashboard(request.query || {});
        response.json({ success: true, data });
    } catch (error) {
        const upstreamStatus = error.response && error.response.status;

        console.error("Error consultando SAP OData:", error.message);
        response.status(upstreamStatus && upstreamStatus < 600 ? upstreamStatus : 502).json({
            success: false,
            message: "No fue posible consultar el servicio OData de mantenimiento.",
            detail: error.message
        });
    }
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`Dashboard API ejecutándose en el puerto ${port}`);
        console.log(`Destino SAP: ${destinationName}`);
        console.log(`Servicio OData: ${upstreamBaseUrl || servicePath}`);
    });
}

module.exports = {
    app,
    loadDashboard,
    normalizeBaseUrl,
    getFilterContext,
    filterOrders,
    filterResources,
    filterServiceRequests,
    filterBlocks
};
