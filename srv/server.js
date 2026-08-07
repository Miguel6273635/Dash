"use strict";

const path = require("node:path");
const express = require("express");
const { executeHttpRequest } = require("@sap-cloud-sdk/http-client");
const { buildDashboard } = require("./lib/dashboardMapper");

const app = express();
const port = Number(process.env.PORT || 4004);
const destinationName = process.env.SAP_DESTINATION_NAME || "QAS_MITSU_DASH";
const servicePath = normalizeServicePath(
    process.env.SAP_ODATA_SERVICE_PATH || "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV"
);
const pageSize = Math.max(100, Number(process.env.SAP_ODATA_PAGE_SIZE || 2000));
const cacheTtlMs = Math.max(0, Number(process.env.SAP_ODATA_CACHE_TTL_MS || 60000));
const ordersCache = new Map();
let auxiliaryDataCache = { expiresAt: 0, data: null, pending: null };

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

function formatODataDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00`;
}

function escapeODataString(value) {
    return String(value).replace(/'/g, "''");
}

function buildOrdersFilter(context) {
    const clauses = [];
    const startDate = formatODataDate(context.startDate);
    const endDate = formatODataDate(context.endDate);

    // El GET_ENTITYSET ABAP usa estos campos como parámetros de rango.
    // Por eso se conserva `eq` (aunque no sea un rango OData convencional).
    if (startDate) {
        clauses.push(`PlannedStartDate eq datetime'${startDate}'`);
    }
    if (endDate) {
        clauses.push(`PlannedFinishDate eq datetime'${endDate}'`);
    }
    if (context.zone) {
        clauses.push(`Zona eq '${escapeODataString(context.zone)}'`);
    }
    if (context.orderType) {
        clauses.push(`OrderTypeCode eq '${escapeODataString(context.orderType)}'`);
    }
    if (context.supervisor) {
        clauses.push(`SupervisorId eq '${escapeODataString(context.supervisor)}'`);
    }
    if (context.mechanic) {
        clauses.push(`Mecanico eq '${escapeODataString(context.mechanic)}'`);
    }
    if (context.shift) {
        clauses.push(`Turno eq '${escapeODataString(context.shift)}'`);
    }

    return clauses.join(" and ");
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
        matches(order.SapUserStatusCode || order.AppStatusCode, context.status) &&
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

    return `${servicePath}/${entitySet}?${params.join("&")}`;
}

function normalizeNextUrl(nextUrl) {
    if (!nextUrl) {
        return null;
    }

    if (/^https?:\/\//i.test(nextUrl)) {
        const parsed = new URL(nextUrl);
        return `${parsed.pathname}${parsed.search}`;
    }

    return nextUrl.startsWith("/") ? nextUrl : `${servicePath}/${nextUrl}`;
}

async function executeOData(url) {
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

async function fetchOptional(entitySet) {
    try {
        return { entitySet, records: await fetchAll(entitySet), error: null };
    } catch (error) {
        console.warn(`EntitySet auxiliar no disponible (${entitySet}): ${error.message}`);
        return { entitySet, records: [], error: error.message };
    }
}

async function fetchOrders(orderFilter, forceRefresh) {
    const now = Date.now();
    const cacheKey = orderFilter || "__ALL__";
    const cached = ordersCache.get(cacheKey);

    if (!forceRefresh && cached && cached.data && cached.expiresAt > now) {
        return cached.data;
    }
    if (!forceRefresh && cached && cached.pending) {
        return cached.pending;
    }

    const pending = fetchAll("DashboardOrdersSet", orderFilter);
    ordersCache.set(cacheKey, { expiresAt: 0, data: null, pending });

    try {
        const data = await pending;
        ordersCache.set(cacheKey, {
            data,
            expiresAt: Date.now() + cacheTtlMs,
            pending: null
        });
        return data;
    } catch (error) {
        ordersCache.delete(cacheKey);
        throw error;
    }
}

async function fetchAuxiliaryData(forceRefresh) {
    const now = Date.now();

    if (!forceRefresh && auxiliaryDataCache.data && auxiliaryDataCache.expiresAt > now) {
        return auxiliaryDataCache.data;
    }
    if (!forceRefresh && auxiliaryDataCache.pending) {
        return auxiliaryDataCache.pending;
    }

    const entitySets = [
        "DashboardOrderCausesSet",
        "DashboardOrderMaterialsSet",
        "DashboardMaterialMovementsSet",
        "DashboardServiceRequestsSet",
        "DashboardEquipmentBlocksSet",
        "DashboardBlockOrdersSet",
        "DashboardFilterCatalogSet",
        "DashboardResourceDailySet",
        "DashboardOrderOperationsSet",
        "DashboardOrderConfirmationsSet"
    ];
    const propertyByEntitySet = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderMaterialsSet: "materials",
        DashboardMaterialMovementsSet: "movements",
        DashboardServiceRequestsSet: "serviceRequests",
        DashboardEquipmentBlocksSet: "blocks",
        DashboardBlockOrdersSet: "blockOrders",
        DashboardFilterCatalogSet: "catalogs",
        DashboardResourceDailySet: "resources",
        DashboardOrderOperationsSet: "operations",
        DashboardOrderConfirmationsSet: "confirmations"
    };

    auxiliaryDataCache.pending = Promise.all(entitySets.map(fetchOptional)).then((responses) => {
        const data = { warnings: [] };

        responses.forEach((response) => {
            data[propertyByEntitySet[response.entitySet]] = response.records;
            if (response.error) {
                data.warnings.push({ entitySet: response.entitySet, message: response.error });
            }
        });

        return data;
    });

    try {
        const data = await auxiliaryDataCache.pending;
        auxiliaryDataCache = {
            data,
            expiresAt: Date.now() + cacheTtlMs,
            pending: null
        };
        return data;
    } catch (error) {
        auxiliaryDataCache.pending = null;
        throw error;
    }
}

async function fetchRawDashboardData(forceRefresh, orderFilter) {
    const [orders, auxiliaryData] = await Promise.all([
        fetchOrders(orderFilter, forceRefresh),
        fetchAuxiliaryData(forceRefresh)
    ]);

    return { orders, ...auxiliaryData };
}

function analyzeOrderData(orders) {
    const officialOrders = orders.filter((order) =>
        ["SM01", "SM02", "SM03"].includes(normalizeValue(order.OrderTypeCode))
    );
    const total = officialOrders.length;
    const countMissing = (property) => officialOrders.filter((order) => !String(order[property] || "").trim()).length;
    const placeholderPeople = officialOrders.filter((order) =>
        [order.SupervisorId, order.Mecanico].some((value) => /^0+$/.test(String(value || "").trim()))
    ).length;
    const missingStatus = officialOrders.filter((order) =>
        !String(order.SapUserStatusCode || order.AppStatusCode || "").trim()
    ).length;
    const fields = {
        status: { missing: missingStatus, total },
        zone: { missing: countMissing("Zona"), total },
        shift: { missing: countMissing("Turno"), total },
        peopleWithPlaceholderId: { count: placeholderPeople, total }
    };
    const warnings = [];

    if (total > 0 && fields.status.missing > 0) {
        warnings.push(`${fields.status.missing} de ${total} órdenes no incluyen SapUserStatusCode`);
    }
    if (total > 0 && fields.zone.missing > 0) {
        warnings.push(`${fields.zone.missing} de ${total} órdenes no incluyen Zona`);
    }
    if (total > 0 && fields.shift.missing > 0) {
        warnings.push(`${fields.shift.missing} de ${total} órdenes no incluyen Turno`);
    }
    if (placeholderPeople > 0) {
        warnings.push(`${placeholderPeople} de ${total} órdenes contienen identificadores de persona en ceros`);
    }

    return {
        level: warnings.length > 0 ? "PARTIAL" : "COMPLETE",
        fields,
        warnings
    };
}

async function loadDashboard(query) {
    const context = getFilterContext(query);
    const orderFilter = buildOrdersFilter(context);
    const rawData = await fetchRawDashboardData(
        String(query.refresh || "").toLowerCase() === "true",
        orderFilter
    );
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
            .filter((order) => ["E0013", "E0014"].includes(normalizeValue(order.SapUserStatusCode || order.AppStatusCode)))
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
            endpoint: `${destinationName}:${servicePath}`,
            ordersUri: buildUrl("DashboardOrdersSet", orderFilter),
            ordersFilter: orderFilter,
            generatedAt: new Date().toISOString(),
            dataQuality: analyzeOrderData(orders),
            unavailableEntitySets: rawData.warnings,
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
        transport: "BTP_DESTINATION",
        destination: destinationName,
        servicePath
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
        console.log(`Servicio OData: ${servicePath}`);
    });
}

module.exports = {
    app,
    loadDashboard,
    getFilterContext,
    buildOrdersFilter,
    formatODataDate,
    buildUrl,
    filterOrders,
    filterResources,
    filterServiceRequests,
    filterBlocks
};
