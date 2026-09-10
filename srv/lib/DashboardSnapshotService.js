"use strict";

const SapODataRepository = require("./SapODataRepository");

/*
 * Campos comprobados en los mappers actuales. Las entidades nuevas de
 * requisitos y eventos de bloqueo se leen sin $select mientras ABAP define
 * su contrato final; así no se pierden datos de las vistas de detalle.
 */
const SELECTS = {
    // Contrato comprobado contra QAS durante la carga mensual inicial.
    // Los campos de detalle se solicitarán en endpoints específicos sólo
    // cuando SAP confirme el $select correspondiente.
    DashboardOrdersSet: [
        "OrderId", "OrderTypeCode", "OrderTypeText", "PlannedStartDate",
        "PlannedFinishDate", "SapUserStatusCode", "AppStatusCode",
        "StatusText", "SupervisorId", "Mecanico", "Turno", "Zona"
    ],
    DashboardOrderCausesSet: [
        "OrderCauseId", "OrderId", "CauseCode", "CauseText",
        "CauseContextCode", "IsPrimary", "ValidTo"
    ],
    DashboardOrderMaterialsSet: [
        "MaterialRequirementId", "OrderId", "MaterialCategoryCode",
        "MaterialCategoryName", "BaseUnitCode", "PlannedQuantity",
        "IsPublishable"
    ],
    DashboardMaterialMovementsSet: [
        "MaterialMovementId", "MaterialRequirementId",
        "MovementDirectionCode", "MovementQuantity", "MovementUnitCode",
        "IsReversal"
    ],
    DashboardOrderResourcesSet: [
        "OrderResourceId", "OrderId", "RoutingNumber", "OperationCounter",
        "ResourceId", "PersonnelNumber", "RoleCode", "AssignmentTypeCode",
        "ValidFrom", "ValidTo"
    ],
    DashboardOrderOperationsSet: [
        "OperationKey", "OrderId", "OperationCounter", "PlannedSourceCode",
        "PlannedValueOriginal", "PlannedUnitOriginal", "CapacityLineNumber",
        "PlannedStartDate"
    ],
    DashboardOrderConfirmationsSet: [
        "ConfirmationId", "OrderId", "ActualValueOriginal",
        "ActualUnitOriginal", "ActualStartDate", "IncludedInCalculation"
    ],
    DashboardOrderEventsSet: [
        "OrderEventId", "OrderId", "EventTypeCode", "EventAt", "UserId",
        "ActionCode", "SapStatusCode", "AppStatusCode", "StatusInactive",
        "ChangeNumber"
    ],
    DashboardBlockOrdersSet: [
        "BlockOrderId", "BlockId", "OrderId", "ImpactStartAt", "ImpactEndAt"
    ],
    DashboardResourceDailySet: [
        "ResourceDateId", "ResourceId", "ResourceName", "ResourceTypeCode",
        "WorkDate", "ZoneId", "ZoneName", "SupervisorId", "SupervisorName",
        "ShiftId", "ShiftName", "AvailabilityStatusCode",
        "CapacitySourceValidated", "CapacityHours"
    ],
    DashboardFilterCatalogSet: [
        "FilterCatalogId", "FilterDomain", "ValueId", "ValueText",
        "NumericValue", "UnitCode", "ScopeTypeCode", "ScopeId", "SortOrder",
        "Active"
    ],
    DashboardServiceRequestsSet: [
        "RequestId", "ZoneId", "ResponsibleId", "RequestedAt", "AttendedAt",
        "ClosedAt", "CurrentStatusCode"
    ],
    DashboardEquipmentBlocksSet: [
        "BlockId", "EquipmentId", "ZoneId", "SupervisorId", "BlockedAt",
        "ReleasedAt", "CurrentStatusCode", "IsPublishable"
    ]
};

const RELATIONS = {
    causes: { entitySet: "DashboardOrderCausesSet", property: "OrderId", id: "OrderCauseId" },
    materials: { entitySet: "DashboardOrderMaterialsSet", property: "OrderId", id: "MaterialRequirementId" },
    assignments: { entitySet: "DashboardOrderResourcesSet", property: "OrderId", id: "OrderResourceId" },
    operations: { entitySet: "DashboardOrderOperationsSet", property: "OrderId", id: "OperationKey" },
    confirmations: { entitySet: "DashboardOrderConfirmationsSet", property: "OrderId", id: "ConfirmationId" },
    events: { entitySet: "DashboardOrderEventsSet", property: "OrderId", id: "OrderEventId" },
    requirements: { entitySet: "DashboardOrderRequirementsSet", property: "OrderId", id: "RequirementId" },
    blockOrders: { entitySet: "DashboardBlockOrdersSet", property: "OrderId", id: "BlockOrderId" }
};

const BLOCK_RELATIONS = {
    blockEvents: { entitySet: "DashboardBlockEventsSet", property: "BlockId", id: "BlockEventId" }
};

// Estas entidades no dependen de una OT. Se leen una vez y se reutilizan
// desde caché; no se ejecuta una consulta por cada orden del periodo.
const INDEPENDENT = {
    serviceRequests: { entitySet: "DashboardServiceRequestsSet", id: "RequestId" },
    blocks: { entitySet: "DashboardEquipmentBlocksSet", id: "BlockId" }
};

const RECORD_IDS = Object.assign({
    orders: "OrderId",
    movements: "MaterialMovementId",
    resources: "ResourceDateId",
    catalogs: "FilterCatalogId"
}, Object.fromEntries(Object.entries(RELATIONS).map(([key, item]) => [key, item.id])), Object.fromEntries(
    Object.entries(BLOCK_RELATIONS).map(([key, item]) => [key, item.id])
), Object.fromEntries(Object.entries(INDEPENDENT).map(([key, item]) => [key, item.id])));

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
    if (!property) {
        return records;
    }
    const seen = new Map();
    const withoutId = [];

    records.forEach((record) => {
        const value = record && record[property];
        if (value === undefined || value === null || value === "") {
            // Nunca se descarta una fila porque ABAP use otro nombre de clave.
            // Esto protege temporalmente OrderRequirements mientras se confirma
            // su identificador final en el contrato OData.
            withoutId.push(record);
            return;
        }
        seen.set(String(value), record);
    });
    return Array.from(seen.values()).concat(withoutId);
}

function unique(values) {
    return Array.from(new Set((values || []).map(String).filter(Boolean)));
}

class DashboardSnapshotService {
    constructor(options) {
        const config = options || {};

        this._cache = config.cache;
        this._repository = config.repository;
        this._namespace = String(config.namespace || "v1");
        if (!this._cache || !this._repository) {
            throw new Error("DashboardSnapshotService requiere cache y repository");
        }
    }

    _key(entity, bucket) {
        return this._namespace + ":" + entity + ":" + bucket;
    }

    _requested(include) {
        const requested = new Set(unique(include || ["orders", "catalogs"]));

        // Un movimiento necesita primero sus requisitos de material; un evento
        // de bloqueo necesita los bloques que lo relacionan.
        if (requested.has("movements")) {
            requested.add("materials");
        }
        if (requested.has("blockEvents")) {
            requested.add("blocks");
        }
        return requested;
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

    async _blockRelation(name, blocks, forceRefresh) {
        const relation = BLOCK_RELATIONS[name];
        const key = this._key(relation.entitySet, "global");
        const blockIds = blocks.map((block) => block.BlockId);

        return this._cached(key, () => this._repository.readByValues(
            relation.entitySet,
            relation.property,
            blockIds,
            { select: SELECTS[relation.entitySet] }
        ), POLICIES.relation, forceRefresh);
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

    cacheKeysFor(options) {
        const config = options || {};
        const from = dateAtStart(config.dateFrom);
        const to = dateAtStart(config.dateTo);
        const requested = this._requested(config.include);
        const keys = [];

        bucketsForRange(from, to).forEach((bucket) => {
            keys.push(this._key("orders", bucket.key));
            Object.keys(RELATIONS).forEach((name) => {
                if (requested.has(name)) {
                    keys.push(this._key(RELATIONS[name].entitySet, bucket.key));
                }
            });
            if (requested.has("resources")) {
                keys.push(this._key("DashboardResourceDailySet", bucket.key));
            }
            if (requested.has("movements")) {
                keys.push(this._key("DashboardMaterialMovementsSet", bucket.key));
            }
        });

        if (requested.has("catalogs")) {
            keys.push(this._key("DashboardFilterCatalogSet", "global"));
        }
        Object.keys(INDEPENDENT).forEach((name) => {
            if (requested.has(name)) {
                keys.push(this._key(INDEPENDENT[name].entitySet, "global"));
            }
        });
        Object.keys(BLOCK_RELATIONS).forEach((name) => {
            if (requested.has(name)) {
                keys.push(this._key(BLOCK_RELATIONS[name].entitySet, "global"));
            }
        });
        return unique(keys);
    }

    missingCacheKeys(options) {
        return this.cacheKeysFor(options).filter((key) => !this._cache.get(key));
    }

    async getSnapshot(options) {
        const config = options || {};
        const from = dateAtStart(config.dateFrom);
        const to = dateAtStart(config.dateTo);
        const requested = this._requested(config.include);
        const forceRefresh = Boolean(config.forceRefresh);
        const warmOnly = Boolean(config.warmOnly);

        if (from > to) {
            throw new Error("La fecha desde no puede ser posterior a la fecha hasta");
        }

        // warmOnly se usa exclusivamente durante la generación B. Carga cada
        // colección en su entrada de caché, pero no crea una segunda respuesta
        // con referencias a todos los registros del mismo periodo.
        const response = { meta: {
            cache: {},
            months: [],
            namespace: this._namespace,
            warmOnly
        } };
        const allRecords = warmOnly ? null : {};
        const addRecords = function (name, records) {
            if (!warmOnly) {
                allRecords[name] = (allRecords[name] || []).concat(records);
            }
        };
        const buckets = bucketsForRange(from, to);

        for (const bucket of buckets) {
            const ordersResult = await this._orders(bucket, forceRefresh);
            const orders = ordersResult.value;
            let materials = null;

            addRecords("orders", orders);
            response.meta.cache[this._key("orders", bucket.key)] = ordersResult.cacheStatus;
            response.meta.months.push(bucket.key);

            for (const name of Object.keys(RELATIONS)) {
                if (!requested.has(name)) {
                    continue;
                }
                const result = await this._relation(name, bucket, orders, forceRefresh);
                if (name === "materials") {
                    materials = result.value;
                }
                addRecords(name, result.value);
                response.meta.cache[this._key(RELATIONS[name].entitySet, bucket.key)] = result.cacheStatus;
            }

            if (requested.has("resources")) {
                const result = await this._resources(bucket, forceRefresh);
                addRecords("resources", result.value);
                response.meta.cache[this._key("DashboardResourceDailySet", bucket.key)] = result.cacheStatus;
            }

            if (requested.has("movements")) {
                materials = materials ||
                    (await this._relation("materials", bucket, orders, forceRefresh)).value;
                const result = await this._movements(bucket, materials, forceRefresh);
                addRecords("movements", result.value);
                response.meta.cache[this._key("DashboardMaterialMovementsSet", bucket.key)] = result.cacheStatus;
            }
        }

        if (requested.has("catalogs")) {
            const result = await this._catalogs(forceRefresh);
            addRecords("catalogs", result.value);
            response.meta.cache[this._key("DashboardFilterCatalogSet", "global")] = result.cacheStatus;
        }

        let blocks = null;
        for (const name of Object.keys(INDEPENDENT)) {
            if (!requested.has(name)) {
                continue;
            }
            const result = await this._independent(name, forceRefresh);
            if (name === "blocks") {
                blocks = result.value;
            }
            addRecords(name, result.value);
            response.meta.cache[this._key(INDEPENDENT[name].entitySet, "global")] = result.cacheStatus;
        }

        for (const name of Object.keys(BLOCK_RELATIONS)) {
            if (!requested.has(name)) {
                continue;
            }
            blocks = blocks || (await this._independent("blocks", forceRefresh)).value;
            if (!warmOnly && !allRecords.blocks) {
                allRecords.blocks = blocks;
            }
            const result = await this._blockRelation(name, blocks, forceRefresh);
            addRecords(name, result.value);
            response.meta.cache[this._key(BLOCK_RELATIONS[name].entitySet, "global")] = result.cacheStatus;
        }

        if (!warmOnly) {
            Object.keys(allRecords).forEach((name) => {
                response[name] = uniqueBy(allRecords[name], RECORD_IDS[name]);
            });
        }
        response.meta.generatedAt = new Date().toISOString();
        return response;
    }

    async refresh(options) {
        const config = options || {};
        const from = config.dateFrom ? dateAtStart(config.dateFrom) : new Date();
        const to = config.dateTo ? dateAtStart(config.dateTo) : endOfMonth(from);
        const scope = config.scope || "active";

        bucketsForRange(from, to).forEach((bucket) => {
            this._cache.invalidate((key) => key.endsWith(":" + bucket.key) &&
                key.startsWith(this._namespace + ":"));
        });
        if (scope === "all" || config.catalogs) {
            this._cache.invalidate(this._key("DashboardFilterCatalogSet", "global"));
        }
        if (scope === "all" || config.independent) {
            Object.keys(INDEPENDENT).forEach((name) => {
                this._cache.invalidate(this._key(INDEPENDENT[name].entitySet, "global"));
            });
            Object.keys(BLOCK_RELATIONS).forEach((name) => {
                this._cache.invalidate(this._key(BLOCK_RELATIONS[name].entitySet, "global"));
            });
        }

        const snapshot = await this.getSnapshot({
            dateFrom: SapODataRepository.odataDate(from),
            dateTo: SapODataRepository.odataDate(to),
            include: config.include || ["orders", "catalogs"],
            forceRefresh: true
        });

        return { scope, months: bucketsForRange(from, to).map((bucket) => bucket.key), snapshot };
    }
}

module.exports = {
    DashboardSnapshotService,
    POLICIES,
    SELECTS,
    RELATIONS,
    BLOCK_RELATIONS,
    INDEPENDENT,
    bucketsForRange
};
