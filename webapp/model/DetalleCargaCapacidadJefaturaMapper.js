sap.ui.define([], function () {
    "use strict";

    /*
     * Detalle de carga, capacidad, ordenes y materiales de Jefatura.
     * El servicio entrega datos base; este mapper consolida por SupervisorId.
     */
    var DEFAULTS = {
        period: "2026",
        from: "2026-01-01",
        to: "2026-12-31",
        management: "ALL", // En el XML original este filtro representa HeadshipId.
        supervisor: "ALL",
        shift: "ALL",
        service: "ALL"
    };

    function list(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return String(value === undefined || value === null ? "" : value).trim(); }
    function normal(value) { return text(value).toUpperCase(); }
    function comparable(value) {
        var result = normal(value);
        return result.normalize ? result.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : result;
    }
    function number(value) {
        var result = Number(String(value === undefined || value === null ? 0 : value).replace(",", "."));
        return Number.isFinite(result) ? result : 0;
    }
    function yes(value) { return value === true || ["X", "1", "TRUE", "SI", "SÍ"].indexOf(normal(value)) >= 0; }
    function date(value) {
        var match, result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ?
            new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result;
    }
    function isoDate(value, fallback) {
        var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(fallback.getTime());
    }
    function range(input) {
        var filters = Object.assign({}, DEFAULTS, input || {}), start = isoDate(filters.from, new Date(2026, 0, 1)), end = isoDate(filters.to, new Date(2026, 11, 31));
        end.setHours(23, 59, 59, 999);
        return { filters: filters, start: start, end: end };
    }
    function inRange(value, start, end) {
        var current = date(value);
        return Boolean(current && current >= start && current <= end);
    }
    function match(filter, value) { return normal(filter) === "ALL" || comparable(filter) === comparable(value); }
    function hours(value, unit) {
        var unitCode = normal(unit), amount = number(value);
        if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(unitCode) >= 0) { return amount / 60; }
        if (["S", "SEC", "SECOND", "SECONDS"].indexOf(unitCode) >= 0) { return amount / 3600; }
        return amount;
    }
    function round(value) { return Math.round((Number(value) || 0) * 10) / 10; }
    function display(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(round(value)); }
    function percent(value) { return round(value).toFixed(1) + "%"; }
    function ratio(numerator, denominator) { return denominator > 0 ? numerator / denominator * 100 : 0; }
    function assignmentKey(item) { return [text(item.OrderId), text(item.RoutingNumber), text(item.OperationCounter || item.OperationNumber)].join("|"); }
    function operationKey(item) { return text(item.OperationKey || assignmentKey(item)); }
    function assignmentPriority(item) {
        return (normal(item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (normal(item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1);
    }
    function operationPriority(item) {
        var source = normal(item && item.PlannedSourceCode);
        return source.indexOf("AFVV") >= 0 ? 0 : source.indexOf("KBED") >= 0 ? 1 : 2;
    }
    function assignmentIsValid(item, end) {
        var from = date(item && item.ValidFrom), to = date(item && item.ValidTo);
        return item && item.OrderId && item.ResourceId && (!from || from <= end) && (!to || to >= end);
    }
    function capacityIsValid(item) {
        return item && (item.CapacitySourceValidated === undefined || item.CapacitySourceValidated === null || item.CapacitySourceValidated === "" || yes(item.CapacitySourceValidated));
    }
    function activeOrder(order) {
        var application = normal(order && order.AppStatusCode), sap = normal(order && order.SapUserStatusCode);
        return ["0100", "0200", "0400"].indexOf(application) >= 0 || ["E0013", "E0014"].indexOf(sap) >= 0;
    }
    function options(records, idField, labelField, allText) {
        var values = new Map([["ALL", allText]]);
        list(records).forEach(function (record) {
            var id = text(record && record[idField]);
            if (id) { values.set(id, text(record[labelField]) || id); }
        });
        return Array.from(values.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; });
    }
    function utilizationLimits(catalogs, end) {
        var values = { low: 70, normal: 100, high: 120 };
        list(catalogs).filter(function (row) {
            var from = date(row.ValidFrom), to = date(row.ValidTo);
            return yes(row.Active) && ["UTILIZATION_THRESHOLD", "UTILIZATION_BAND", "HEADSHIP_UTILIZATION_BAND"].indexOf(normal(row.FilterDomain)) >= 0 &&
                (!from || from <= end) && (!to || to >= end);
        }).forEach(function (row) {
            var id = normal(row.ValueId), value = number(row.NumericValue);
            if (!value) { return; }
            if (["LOW", "LOW_MAX", "BAJO"].indexOf(id) >= 0) { values.low = value; }
            if (["NORMAL", "NORMAL_MAX"].indexOf(id) >= 0) { values.normal = value; }
            if (["HIGH", "HIGH_MAX", "ALTO", "CRITICAL"].indexOf(id) >= 0) { values.high = value; }
        });
        return values;
    }
    function utilizationStatus(value, limits) {
        if (value <= limits.low) { return { text: "Bajo", state: "Success" }; }
        if (value <= limits.normal) { return { text: "Normal", state: "Information" }; }
        if (value <= limits.high) { return { text: "Alto", state: "Warning" }; }
        return { text: "Crítico", state: "Error" };
    }
    function materialStatus(variation, critical) {
        if (critical || (variation !== null && variation > 15)) { return { text: "Crítico", state: "Error" }; }
        if (variation !== null && variation > 5) { return { text: "Atención", state: "Warning" }; }
        if (variation === null) { return { text: "Sin plan", state: "None" }; }
        return { text: "En objetivo", state: "Success" };
    }
    function categoryIcon(category) {
        var label = comparable(category).toLowerCase();
        if (label.indexOf("lubric") >= 0) { return "sap-icon://drop"; }
        if (label.indexOf("refacc") >= 0) { return "sap-icon://action-settings"; }
        if (label.indexOf("herramient") >= 0) { return "sap-icon://wrench"; }
        return "sap-icon://product";
    }
    function addSet(map, key, value) {
        if (!map.has(key)) { map.set(key, new Set()); }
        if (value) { map.get(key).add(value); }
    }

    function build(raw, input) {
        var context = range(input), filters = context.filters, limits = utilizationLimits(raw.catalogs, context.end), allResources = list(raw.resources).filter(function (row) { return row && inRange(row.WorkDate, context.start, context.end); }), resources = allResources.filter(function (row) {
            return match(filters.management, row.HeadshipId || row.HeadshipName) && match(filters.supervisor, row.SupervisorId || row.SupervisorName) && match(filters.shift, row.ShiftId || row.ShiftName);
        }), resourceLatest = new Map(), resourceCapacity = new Map(), supervisorData = new Map(), orderById = new Map(), selectedOrderIds, assignmentByOperation = new Map(), operationByKey = new Map(), resourceLoad = new Map();

        resources.forEach(function (row) {
            var resourceId = text(row.ResourceId), supervisorId = text(row.SupervisorId) || "SIN_SUPERVISOR", supervisor = supervisorData.get(supervisorId), current = resourceLatest.get(resourceId);
            if (!supervisor) {
                supervisor = {
                    id: supervisorId,
                    name: text(row.SupervisorName) || supervisorId || "Sin supervisor",
                    resources: new Set(), capacity: 0, load: 0, activeOrders: new Set(), overCapacity: new Set()
                };
                supervisorData.set(supervisorId, supervisor);
            }
            if (resourceId) {
                supervisor.resources.add(resourceId);
                if (!current || (date(row.WorkDate) || new Date(0)) > (date(current.WorkDate) || new Date(0))) { resourceLatest.set(resourceId, row); }
            }
            if (capacityIsValid(row)) {
                supervisor.capacity += number(row.CapacityHours);
                resourceCapacity.set(resourceId, (resourceCapacity.get(resourceId) || 0) + number(row.CapacityHours));
            }
        });

        list(raw.orders).filter(function (row) {
            return row && inRange(row.PlannedStartDate, context.start, context.end) && match(filters.service, row.OrderTypeCode || row.OrderTypeText);
        }).forEach(function (row) { orderById.set(text(row.OrderId), row); });
        selectedOrderIds = new Set(orderById.keys());

        list(raw.assignments).filter(function (row) {
            return assignmentIsValid(row, context.end) && selectedOrderIds.has(text(row.OrderId)) && resourceLatest.has(text(row.ResourceId));
        }).forEach(function (row) {
            var key = assignmentKey(row), previous = assignmentByOperation.get(key);
            if (!previous || assignmentPriority(row) < assignmentPriority(previous)) { assignmentByOperation.set(key, row); }
        });
        list(raw.operations).filter(function (row) {
            return row && selectedOrderIds.has(text(row.OrderId)) && (!row.PlannedStartDate || inRange(row.PlannedStartDate, context.start, context.end));
        }).forEach(function (row) {
            var key = operationKey(row), previous = operationByKey.get(key);
            if (!previous || operationPriority(row) < operationPriority(previous)) { operationByKey.set(key, row); }
        });

        assignmentByOperation.forEach(function (assignment) {
            var resource = resourceLatest.get(text(assignment.ResourceId)), supervisor = resource && supervisorData.get(text(resource.SupervisorId) || "SIN_SUPERVISOR"), order = orderById.get(text(assignment.OrderId));
            if (supervisor && order && activeOrder(order)) { supervisor.activeOrders.add(text(order.OrderId)); }
        });
        operationByKey.forEach(function (operation) {
            var assignment = assignmentByOperation.get(assignmentKey(operation)), resource, supervisor, load;
            if (!assignment) { return; }
            resource = resourceLatest.get(text(assignment.ResourceId));
            supervisor = resource && supervisorData.get(text(resource.SupervisorId) || "SIN_SUPERVISOR");
            if (!supervisor) { return; }
            load = hours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal);
            supervisor.load += load;
            resourceLoad.set(text(assignment.ResourceId), (resourceLoad.get(text(assignment.ResourceId)) || 0) + load);
        });
        resourceLatest.forEach(function (resource, resourceId) {
            var supervisor = supervisorData.get(text(resource.SupervisorId) || "SIN_SUPERVISOR"), capacity = resourceCapacity.get(resourceId) || 0;
            if (supervisor && capacity > 0 && (resourceLoad.get(resourceId) || 0) / capacity * 100 > 100) { supervisor.overCapacity.add(resourceId); }
        });

        var loadRows = Array.from(supervisorData.values()).map(function (supervisor) {
            var utilization = ratio(supervisor.load, supervisor.capacity), status = utilizationStatus(utilization, limits);
            return {
                supervisorId: supervisor.id,
                supervisor: supervisor.name,
                resources: display(supervisor.resources.size),
                available: display(supervisor.capacity),
                scheduled: display(supervisor.load),
                utilization: round(utilization),
                utilPercent: Math.min(100, Math.max(0, round(utilization))),
                utilState: status.state,
                activeOrders: display(supervisor.activeOrders.size),
                overCapacity: display(supervisor.overCapacity.size),
                status: status.text,
                statusState: status.state
            };
        }).sort(function (a, b) { return b.utilization - a.utilization || a.supervisor.localeCompare(b.supervisor); });

        /* Materiales: el requisito aporta plan; el movimiento aporta consumo real.
         * Se toma el recurso del movimiento. Si no existe, se usa la asignacion primaria de la orden. */
        var requirementById = new Map(), materialBuckets = new Map(), materialIds = new Set(), movementIds = new Set(), consumedOrders = new Set();
        list(raw.materials).filter(function (row) {
            return row && selectedOrderIds.has(text(row.OrderId)) && (row.IsPublishable === undefined || row.IsPublishable === null || yes(row.IsPublishable)) && (!row.RequiredDate || inRange(row.RequiredDate, context.start, context.end));
        }).forEach(function (row) {
            var assignment = Array.from(assignmentByOperation.values()).find(function (item) { return text(item.OrderId) === text(row.OrderId); }), resourceId = assignment && text(assignment.ResourceId), resource = resourceLatest.get(resourceId), supervisorId = resource && (text(resource.SupervisorId) || "SIN_SUPERVISOR"), key, bucket;
            requirementById.set(text(row.MaterialRequirementId), row);
            if (!supervisorId || !supervisorData.has(supervisorId)) { return; }
            key = [supervisorId, text(row.MaterialId || row.MaterialRequirementId), text(row.BaseUnitCode)].join("|");
            bucket = materialBuckets.get(key) || { supervisorId: supervisorId, materialId: text(row.MaterialId || row.MaterialRequirementId), material: text(row.MaterialName) || text(row.MaterialId) || "Sin material", category: text(row.MaterialCategoryName || row.MaterialCategoryCode) || "Sin categoría", unit: text(row.BaseUnitCode), actual: 0, plan: 0, orders: new Set(), critical: normal(row.MaterialCriticalityCode) === "CRITICAL" };
            bucket.plan += number(row.PlannedQuantity);
            bucket.orders.add(text(row.OrderId));
            materialBuckets.set(key, bucket);
        });
        list(raw.movements).filter(function (movement) {
            return movement && text(movement.MaterialMovementId) && inRange(movement.MovementDate, context.start, context.end) && !yes(movement.IsReversal);
        }).forEach(function (movement) {
            var requirement = requirementById.get(text(movement.MaterialRequirementId)), resource = resourceLatest.get(text(movement.ResourceId)), assignment, supervisorId, key, bucket, direction;
            if (!requirement) { return; }
            if (!resource) {
                assignment = Array.from(assignmentByOperation.values()).find(function (item) { return text(item.OrderId) === text(requirement.OrderId); });
                resource = assignment && resourceLatest.get(text(assignment.ResourceId));
            }
            supervisorId = resource && (text(resource.SupervisorId) || "SIN_SUPERVISOR");
            if (!supervisorId || !supervisorData.has(supervisorId)) { return; }
            key = [supervisorId, text(requirement.MaterialId || requirement.MaterialRequirementId), text(movement.MovementUnitCode || requirement.BaseUnitCode)].join("|");
            bucket = materialBuckets.get(key) || { supervisorId: supervisorId, materialId: text(requirement.MaterialId || requirement.MaterialRequirementId), material: text(requirement.MaterialName) || text(requirement.MaterialId) || "Sin material", category: text(requirement.MaterialCategoryName || requirement.MaterialCategoryCode) || "Sin categoría", unit: text(movement.MovementUnitCode || requirement.BaseUnitCode), actual: 0, plan: normal(movement.MovementUnitCode || requirement.BaseUnitCode) === normal(requirement.BaseUnitCode) ? number(requirement.PlannedQuantity) : 0, orders: new Set([text(requirement.OrderId)]), critical: normal(requirement.MaterialCriticalityCode) === "CRITICAL" };
            direction = normal(movement.MovementDirectionCode);
            bucket.actual += ["RETURN", "IN", "ENTRADA"].indexOf(direction) >= 0 ? -number(movement.MovementQuantity) : number(movement.MovementQuantity);
            bucket.orders.add(text(requirement.OrderId));
            materialBuckets.set(key, bucket);
            movementIds.add(text(movement.MaterialMovementId));
            materialIds.add(text(requirement.MaterialId || requirement.MaterialRequirementId));
            consumedOrders.add(text(requirement.OrderId));
        });

        var bySupervisor = new Map(), categoryTotals = new Map(), criticalMaterials = new Set(), topMaterial = null;
        materialBuckets.forEach(function (bucket) {
            var values = bySupervisor.get(bucket.supervisorId) || [];
            values.push(bucket);
            bySupervisor.set(bucket.supervisorId, values);
            if (Math.abs(bucket.actual) > 0) {
                var categoryKey = bucket.category + "|" + bucket.unit, category = categoryTotals.get(categoryKey) || { category: bucket.category, unit: bucket.unit, actual: 0, icon: categoryIcon(bucket.category) };
                category.actual += bucket.actual;
                categoryTotals.set(categoryKey, category);
            }
            if (bucket.critical) { criticalMaterials.add(bucket.materialId); }
            if (!topMaterial || Math.abs(bucket.actual) > Math.abs(topMaterial.actual)) { topMaterial = bucket; }
        });
        var materialRows = Array.from(bySupervisor.entries()).map(function (entry) {
            var supervisor = supervisorData.get(entry[0]), lead = entry[1].sort(function (a, b) { return Math.abs(b.actual) - Math.abs(a.actual); })[0], variation = lead.plan > 0 ? (lead.actual - lead.plan) / lead.plan * 100 : null, status = materialStatus(variation, lead.critical);
            if (variation !== null && variation > 15) { criticalMaterials.add(lead.materialId); }
            return {
                supervisorId: supervisor.id,
                supervisor: supervisor.name,
                resources: display(supervisor.resources.size),
                category: lead.category,
                categoryIcon: categoryIcon(lead.category),
                material: lead.material,
                actual: display(lead.actual) + (lead.unit ? " " + lead.unit : ""),
                plan: lead.plan > 0 ? display(lead.plan) + (lead.unit ? " " + lead.unit : "") : "Sin plan",
                variation: variation === null ? "Sin datos" : (variation > 0 ? "+" : "") + percent(variation),
                variationState: status.state,
                orders: display(lead.orders.size),
                status: status.text,
                statusState: status.state
            };
        }).sort(function (a, b) { return a.supervisor.localeCompare(b.supervisor); });

        var categories = Array.from(categoryTotals.values()).sort(function (a, b) { return Math.abs(b.actual) - Math.abs(a.actual); }), absoluteTotal = categories.reduce(function (sum, row) { return sum + Math.abs(row.actual); }, 0), participation = categories.map(function (row) {
            var share = absoluteTotal > 0 ? Math.abs(row.actual) / absoluteTotal * 100 : 0;
            return { category: row.category, icon: row.icon, consumption: display(row.actual) + (row.unit ? " " + row.unit : ""), share: percent(share), percent: round(share) };
        });
        var totalCapacity = loadRows.reduce(function (sum, row) { return sum + number(String(row.available).replace(/,/g, "")); }, 0), totalLoad = loadRows.reduce(function (sum, row) { return sum + number(String(row.scheduled).replace(/,/g, "")); }, 0), totalUtilization = ratio(totalLoad, totalCapacity), topVariation = topMaterial && topMaterial.plan > 0 ? (topMaterial.actual - topMaterial.plan) / topMaterial.plan * 100 : null;

        return {
            activeTab: "carga",
            pageSize: "10",
            filters: filters,
            periodOptions: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
            headshipOptions: options(allResources, "HeadshipId", "HeadshipName", "Todas"),
            supervisorOptions: options(resources, "SupervisorId", "SupervisorName", "Todos"),
            shiftOptions: options(resources, "ShiftId", "ShiftName", "Todos"),
            serviceOptions: options(Array.from(orderById.values()), "OrderTypeCode", "OrderTypeText", "Todos"),
            kpis: {
                supervisors: display(loadRows.length),
                resources: display(new Set(Array.from(resourceLatest.keys())).size),
                capacity: display(totalCapacity),
                load: display(totalLoad),
                utilization: percent(totalUtilization),
                activeOrders: display(new Set([].concat.apply([], Array.from(supervisorData.values()).map(function (item) { return Array.from(item.activeOrders); }))).size),
                movements: display(movementIds.size),
                ordersWithMaterials: display(consumedOrders.size),
                materialsUsed: display(materialIds.size),
                criticalMaterials: display(criticalMaterials.size),
                topMaterial: topMaterial ? topMaterial.material : "Sin datos",
                topQuantity: topMaterial ? display(topMaterial.actual) : "0",
                topUnit: topMaterial ? topMaterial.unit : "",
                materialVariation: topVariation === null ? "Sin datos" : (topVariation > 0 ? "+" : "") + percent(topVariation)
            },
            loadRows: loadRows,
            materialRows: materialRows,
            participation: participation,
            meta: { bands: limits, unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [] }
        };
    }

    return { build: build, range: range };
});
