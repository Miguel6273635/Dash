"use strict";

const SapODataRepository = require("./SapODataRepository");

const SELECTS = {
    DashboardOrdersSet: ["OrderId", "OrderTypeCode", "OrderTypeText", "PlannedStartDate", "PlannedFinishDate", "SapUserStatusCode", "AppStatusCode", "StatusText", "SupervisorId", "Mecanico", "Turno", "Zona"],
    DashboardOrderCausesSet: ["OrderCauseId", "OrderId", "CauseCode", "CauseText", "CauseContextCode", "IsPrimary", "ValidTo"],
    DashboardOrderMaterialsSet: ["MaterialRequirementId", "OrderId", "MaterialCategoryCode", "MaterialCategoryName", "BaseUnitCode", "PlannedQuantity", "IsPublishable"],
    DashboardMaterialMovementsSet: ["MaterialMovementId", "MaterialRequirementId", "MovementDirectionCode", "MovementQuantity", "MovementUnitCode", "IsReversal"],
    DashboardOrderResourcesSet: ["OrderResourceId", "OrderId", "RoutingNumber", "OperationCounter", "ResourceId", "PersonnelNumber", "RoleCode", "AssignmentTypeCode", "ValidFrom", "ValidTo"],
    DashboardOrderOperationsSet: ["OperationKey", "OrderId", "OperationCounter", "PlannedSourceCode", "PlannedValueOriginal", "PlannedUnitOriginal", "CapacityLineNumber", "PlannedStartDate"],
    DashboardOrderConfirmationsSet: ["ConfirmationId", "OrderId", "ActualValueOriginal", "ActualUnitOriginal", "ActualStartDate", "IncludedInCalculation"],
    DashboardBlockOrdersSet: ["BlockOrderId", "BlockId", "OrderId", "ImpactStartAt", "ImpactEndAt"],
    DashboardResourceDailySet: ["ResourceDateId", "ResourceId", "ResourceName", "ResourceTypeCode", "WorkDate", "ZoneId", "ZoneName", "SupervisorId", "SupervisorName", "ShiftId", "ShiftName", "AvailabilityStatusCode", "CapacitySourceValidated", "CapacityHours"],
    DashboardFilterCatalogSet: ["FilterCatalogId", "FilterDomain", "ValueId", "ValueText", "NumericValue", "UnitCode", "ScopeTypeCode", "ScopeId", "SortOrder", "Active"],
    DashboardServiceRequestsSet: ["RequestId", "ZoneId", "ResponsibleId", "RequestedAt", "AttendedAt", "ClosedAt", "CurrentStatusCode"],
    DashboardEquipmentBlocksSet: ["BlockId", "EquipmentId", "ZoneId", "SupervisorId", "BlockedAt", "ReleasedAt", "CurrentStatusCode", "IsPublishable"]
};

const RELATIONS = {
    causes: { entitySet: "DashboardOrderCausesSet", property: "OrderId" },
    materials: { entitySet: "DashboardOrderMaterialsSet", property: "OrderId" },
    assignments: { entitySet: "DashboardOrderResourcesSet", property: "OrderId" },
    operations: { entitySet: "DashboardOrderOperationsSet", property: "OrderId" },
    confirmations: { entitySet: "DashboardOrderConfirmationsSet", property: "OrderId" },
    blockOrders: { entitySet: "DashboardBlockOrdersSet", property: "OrderId" }
};

// Estas entidades no dependen de una OT. Se leen una vez y se reutilizan
// desde caché; no se ejecuta una consulta por cada orden del periodo.
const INDEPENDENT = {
    serviceRequests: { entitySet: "DashboardServiceRequestsSet" },
    blocks: { entitySet: "DashboardEquipmentBlocksSet" }
};

const POLICIES = {
    orders: { softTtlMs: 5 * 60 * 1000, hardTtlMs: 24 * 60 * 60 * 1000 },
    relation: { softTtlMs: 10 * 60 * 1000, hardTtlMs: 24 * 60 * 60 * 1000 },
    resources: { softTtlMs: 10 * 60 * 1000, hardTtlMs: 12 * 60 * 60 * 1000 },
    catalog: { softTtlMs: 60 * 60 * 1000, hardTtlMs: 7 * 24 * 60 * 60 * 1000 },
    independent: { softTtlMs: 10 * 60 * 1000, hardTtlMs: 12 * 60 * 60 * 1000 }
};

function dateAtStart(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const date = match
        ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
        : new Date(text.slice(0, 10) + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        throw new Error("Fecha inválida: " + value);
    }
    return date;
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function monthKey(date) {
    return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
}

function bucketsForRange(from, to) {
    const buckets = [];
    let cursor = startOfMonth(from);

    while (cursor <= to) {
        buckets.push({
            key: monthKey(cursor),
            from: startOfMonth(cursor),
            to: endOfMonth(cursor)
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return buckets;
}

function uniqueBy(records, property) {
    const seen = new Map();

    records.forEach((record) => {
        const value = record && record[property];
        if (value !== undefined && value !== null && value !== "") {
            seen.set(String(value), record);
        }
    });
    return Array.from(seen.values());
}

class DashboardSnapshotService {
    constructor(options) {
        const config = options || {};

        this._cache = config.cache;
        this._repository = config.repository;
        if (!this._cache || !this._repository) {
            throw new Error("DashboardSnapshotService requiere cache y repository");
        }
    }

    _key(entity, bucket) {
        return "v1:" + entity + ":" + bucket;
    }

    _ordersFilter(bucket) {
        return "PlannedStartDate eq datetime'" + SapODataRepository.odataDate(bucket.from) +
            "' and PlannedFinishDate eq datetime'" + SapODataRepository.odataDate(bucket.to) + "'";
    }

    async _cached(key, loader, policy, forceRefresh) {
        return this._cache.getOrLoad(key, loader, policy, {
            forceRefresh: Boolean(forceRefresh),
            waitForRefresh: Boolean(forceRefresh)
        });
    }

    async _orders(bucket, forceRefresh) {
        const key = this._key("orders", bucket.key);
        return this._cached(key, () => this._repository.readAll("DashboardOrdersSet", {
            filter: this._ordersFilter(bucket),
            select: SELECTS.DashboardOrdersSet
        }), POLICIES.orders, forceRefresh);
    }

    async _relation(name, bucket, orders, forceRefresh) {
        const relation = RELATIONS[name];
        const key = this._key(relation.entitySet, bucket.key);
        const orderIds = orders.map((order) => order.OrderId);

        return this._cached(key, () => this._repository.readByValues(
            relation.entitySet,
            relation.property,
            orderIds,
            { select: SELECTS[relation.entitySet] }
        ), POLICIES.relation, forceRefresh);
    }

    async _resources(bucket, forceRefresh) {
        const key = this._key("DashboardResourceDailySet", bucket.key);
        const filter = "WorkDate ge datetime'" + SapODataRepository.odataDate(bucket.from) +
            "' and WorkDate le datetime'" + SapODataRepository.odataDate(bucket.to) + "'";

        return this._cached(key, () => this._repository.readAll("DashboardResourceDailySet", {
            filter,
            select: SELECTS.DashboardResourceDailySet
        }), POLICIES.resources, forceRefresh);
    }

    async _catalogs(forceRefresh) {
        return this._cached(this._key("DashboardFilterCatalogSet", "global"), () =>
            this._repository.readAll("DashboardFilterCatalogSet", { select: SELECTS.DashboardFilterCatalogSet }),
        POLICIES.catalog, forceRefresh);
    }

    async _independent(name, forceRefresh) {
        const source = INDEPENDENT[name];
        const key = this._key(source.entitySet, "global");

        return this._cached(key, () => this._repository.readAll(source.entitySet, {
            select: SELECTS[source.entitySet]
        }), POLICIES.independent, forceRefresh);
    }

    async _movements(bucket, materials, forceRefresh) {
        const key = this._key("DashboardMaterialMovementsSet", bucket.key);
        const requirementIds = materials.map((material) => material.MaterialRequirementId);

        return this._cached(key, () => this._repository.readByValues(
            "DashboardMaterialMovementsSet",
            "MaterialRequirementId",
            requirementIds,
            { select: SELECTS.DashboardMaterialMovementsSet }
        ), POLICIES.relation, forceRefresh);
    }

    async getSnapshot(options) {
        const config = options || {};
        const from = dateAtStart(config.dateFrom);
        const to = dateAtStart(config.dateTo);
        const requested = new Set((config.include || ["orders", "catalogs"]).map(String));
        const forceRefresh = Boolean(config.forceRefresh);

        if (from > to) {
            throw new Error("La fecha desde no puede ser posterior a la fecha hasta");
        }

        const response = { meta: { cache: {}, months: [] } };
        const allRecords = {};
        const buckets = bucketsForRange(from, to);

        for (const bucket of buckets) {
            const ordersResult = await this._orders(bucket, forceRefresh);
            const orders = ordersResult.value;
            const monthly = { orders };

            response.meta.cache[this._key("orders", bucket.key)] = ordersResult.cacheStatus;
            response.meta.months.push(bucket.key);

            for (const name of Object.keys(RELATIONS)) {
                if (!requested.has(name)) {
                    continue;
                }
                const result = await this._relation(name, bucket, orders, forceRefresh);
                monthly[name] = result.value;
                response.meta.cache[this._key(RELATIONS[name].entitySet, bucket.key)] = result.cacheStatus;
            }

            if (requested.has("resources")) {
                const result = await this._resources(bucket, forceRefresh);
                monthly.resources = result.value;
                response.meta.cache[this._key("DashboardResourceDailySet", bucket.key)] = result.cacheStatus;
            }

            if (requested.has("movements")) {
                const materials = monthly.materials || (await this._relation("materials", bucket, orders, forceRefresh)).value;
                const result = await this._movements(bucket, materials, forceRefresh);
                monthly.movements = result.value;
                response.meta.cache[this._key("DashboardMaterialMovementsSet", bucket.key)] = result.cacheStatus;
            }

            Object.keys(monthly).forEach((name) => {
                allRecords[name] = (allRecords[name] || []).concat(monthly[name]);
            });
        }

        if (requested.has("catalogs")) {
            const result = await this._catalogs(forceRefresh);
            allRecords.catalogs = result.value;
            response.meta.cache[this._key("DashboardFilterCatalogSet", "global")] = result.cacheStatus;
        }

        for (const name of Object.keys(INDEPENDENT)) {
            if (!requested.has(name)) {
                continue;
            }
            const result = await this._independent(name, forceRefresh);
            allRecords[name] = result.value;
            response.meta.cache[this._key(INDEPENDENT[name].entitySet, "global")] = result.cacheStatus;
        }

        Object.keys(allRecords).forEach((name) => {
            const id = name === "orders" ? "OrderId" : null;
            response[name] = id ? uniqueBy(allRecords[name], id) : allRecords[name];
        });
        response.meta.generatedAt = new Date().toISOString();
        return response;
    }

    async refresh(options) {
        const config = options || {};
        const from = config.dateFrom ? dateAtStart(config.dateFrom) : new Date();
        const to = config.dateTo ? dateAtStart(config.dateTo) : endOfMonth(from);
        const buckets = bucketsForRange(from, to);
        const scope = config.scope || "active";

        buckets.forEach((bucket) => {
            this._cache.invalidate((key) => key.endsWith(":" + bucket.key));
        });
        if (scope === "all" || config.catalogs) {
            this._cache.invalidate(this._key("DashboardFilterCatalogSet", "global"));
        }
        if (scope === "all" || config.independent) {
            Object.keys(INDEPENDENT).forEach((name) => {
                this._cache.invalidate(this._key(INDEPENDENT[name].entitySet, "global"));
            });
        }

        // La actualización se limita al conjunto solicitado. No precarga los
        // doce meses en paralelo ni vuelve a saturar QAS.
        const snapshot = await this.getSnapshot({
            dateFrom: SapODataRepository.odataDate(from),
            dateTo: SapODataRepository.odataDate(to),
            include: config.include || ["orders", "catalogs"],
            forceRefresh: true
        });

        return { scope, months: buckets.map((bucket) => bucket.key), snapshot };
    }
}

module.exports = {
    DashboardSnapshotService,
    POLICIES,
    SELECTS,
    INDEPENDENT,
    bucketsForRange
};

