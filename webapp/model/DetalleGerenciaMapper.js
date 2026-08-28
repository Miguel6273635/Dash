sap.ui.define([], function () {
    "use strict";

    var DEFAULTS = { period: "2026", dateFrom: "2026-01-01", dateTo: "2026-12-31", management: "ALL", headship: "ALL", zone: "ALL", serviceType: "ALL" };
    function list(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return String(value === undefined || value === null ? "" : value).trim(); }
    function normal(value) { return text(value).toUpperCase(); }
    function simple(value) { var result = normal(value); return result.normalize ? result.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : result; }
    function number(value) { var result = Number(String(value === undefined || value === null ? 0 : value).replace(",", ".")); return Number.isFinite(result) ? result : 0; }
    function yes(value) { return value === true || ["X", "1", "TRUE", "SI", "SÍ"].indexOf(normal(value)) >= 0; }
    function date(value) { var match, result; if (!value) { return null; } if (value instanceof Date) { return new Date(value.getTime()); } match = String(value).match(/\/Date\((-?\d+)/); result = match ? new Date(Number(match[1])) : new Date(value); if (Number.isNaN(result.getTime())) { return null; } return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ? new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result; }
    function iso(value, fallback) { var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(fallback.getTime()); }
    function range(input) { var filters = Object.assign({}, DEFAULTS, input || {}), start = iso(filters.dateFrom, new Date(2026, 0, 1)), end = iso(filters.dateTo, new Date(2026, 11, 31)); end.setHours(23, 59, 59, 999); return { filters: filters, start: start, end: end }; }
    function inRange(value, start, end) { var current = date(value); return Boolean(current && current >= start && current <= end); }
    function unitHours(value, unit) { var code = normal(unit), amount = number(value); if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(code) >= 0) { return amount / 60; } if (["S", "SEC", "SECOND", "SECONDS"].indexOf(code) >= 0) { return amount / 3600; } return amount; }
    function round(value) { return Math.round((Number(value) || 0) * 10) / 10; }
    function display(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(round(value)); }
    function pct(value) { return round(value).toFixed(1) + "%"; }
    function match(filter, value) { return normal(filter) === "ALL" || simple(filter) === simple(value); }
    function validAssignment(item, end) { var from = date(item && item.ValidFrom), to = date(item && item.ValidTo); return item && item.OrderId && item.ResourceId && (!from || from <= end) && (!to || to >= end); }
    function assignmentKey(item) { return [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|"); }
    function operationKey(item) { return text(item.OperationKey || [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|")); }
    function assignmentRank(item) { return (normal(item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (normal(item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1); }
    function operationRank(item) { var source = normal(item && item.PlannedSourceCode); return source.indexOf("AFVV") >= 0 ? 0 : source.indexOf("KBED") >= 0 ? 1 : 2; }
    function capacityValid(item) { return item && (item.CapacitySourceValidated === undefined || item.CapacitySourceValidated === null || item.CapacitySourceValidated === "" || yes(item.CapacitySourceValidated)); }
    function activeOrder(order) { var app = normal(order && order.AppStatusCode), sap = normal(order && order.SapUserStatusCode); return ["0100", "0200", "0400"].indexOf(app) >= 0 || ["E0013", "E0014"].indexOf(sap) >= 0; }
    function catalogOptions(rows, id, label, all) { var map = new Map([["ALL", all]]); rows.forEach(function (row) { var key = text(row[id]); if (key) { map.set(key, row[label] || key); } }); return Array.from(map.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; }); }
    function bands(catalogs, end) {
        var values = { low: 70, normal: 100, high: 120 };
        list(catalogs).filter(function (row) { var from = date(row.ValidFrom), to = date(row.ValidTo); return yes(row.Active) && ["UTILIZATION_THRESHOLD", "HEADSHIP_UTILIZATION_BAND"].indexOf(normal(row.FilterDomain)) >= 0 && (!from || from <= end) && (!to || to >= end); }).forEach(function (row) {
            var id = normal(row.ValueId), value = number(row.NumericValue);
            if (!value) { return; }
            if (["LOW", "LOW_MAX", "BAJO"].indexOf(id) >= 0) { values.low = value; }
            if (["NORMAL", "NORMAL_MAX"].indexOf(id) >= 0) { values.normal = value; }
            if (["HIGH", "HIGH_MAX", "ALTO", "CRITICAL"].indexOf(id) >= 0) { values.high = value; }
        });
        return values;
    }
    function utilizationStatus(utilization, limits) {
        if (utilization <= limits.low) { return { text: "Bajo", state: "Information" }; }
        if (utilization <= limits.normal) { return { text: "Normal", state: "Success" }; }
        if (utilization <= limits.high) { return { text: "Alto", state: "Warning" }; }
        return { text: "Crítico", state: "Error" };
    }
    function materialState(variation) { if (variation === null) { return { text: "Sin datos", state: "None" }; } if (variation > 15) { return { text: "Crítico", state: "Error" }; } if (variation > 5) { return { text: "Atención", state: "Warning" }; } return { text: "En objetivo", state: "Success" }; }
    function setAdd(map, key, value) { if (!map.has(key)) { map.set(key, new Set()); } map.get(key).add(value); }

    function build(raw, input) {
        var context = range(input), filters = context.filters, allDaily = list(raw.resources).filter(function (row) { return row && inRange(row.WorkDate, context.start, context.end); }), daily = allDaily.filter(function (row) { return match(filters.management, row.ManagementId || row.ManagementName) && match(filters.headship, row.HeadshipId || row.HeadshipName) && match(filters.zone, row.ZoneId || row.ZoneName); }), dailyByResource = new Map(), headships = new Map(), supervisors = new Map(), orders = new Map(), selectedOrders, assignments = new Map(), operations = new Map(), activeOrderIds = new Set(), limits = bands(raw.catalogs, context.end);

        daily.forEach(function (row) {
            var resource = text(row.ResourceId), headshipId = text(row.HeadshipId) || "SIN_JEFATURA", supervisorId = text(row.SupervisorId) || "SIN_SUPERVISOR", headship = headships.get(headshipId), supervisor = supervisors.get(supervisorId), current = dailyByResource.get(resource);
            if (!headship) { headship = { id: headshipId, name: row.HeadshipName || headshipId || "Sin jefatura", supervisors: new Set(), resources: new Set(), capacity: 0, load: 0, activeOrders: new Set(), overloaded: new Set() }; headships.set(headshipId, headship); }
            if (!supervisor) { supervisor = { id: supervisorId, headshipId: headshipId, capacity: 0, load: 0 }; supervisors.set(supervisorId, supervisor); }
            headship.supervisors.add(supervisorId);
            if (resource) { headship.resources.add(resource); }
            if (capacityValid(row)) { headship.capacity += number(row.CapacityHours); supervisor.capacity += number(row.CapacityHours); }
            if (resource && (!current || (date(row.WorkDate) || 0) > (date(current.WorkDate) || 0))) { dailyByResource.set(resource, row); }
        });
        list(raw.orders).filter(function (row) { return row && inRange(row.PlannedStartDate, context.start, context.end) && match(filters.serviceType, row.OrderTypeCode || row.OrderTypeText); }).forEach(function (row) { orders.set(text(row.OrderId), row); });
        selectedOrders = new Set(orders.keys());
        list(raw.assignments).filter(function (row) { return validAssignment(row, context.end) && selectedOrders.has(text(row.OrderId)) && dailyByResource.has(text(row.ResourceId)); }).forEach(function (row) { var key = assignmentKey(row), old = assignments.get(key); if (!old || assignmentRank(row) < assignmentRank(old)) { assignments.set(key, row); } });
        list(raw.operations).filter(function (row) { return row && selectedOrders.has(text(row.OrderId)) && (!row.PlannedStartDate || inRange(row.PlannedStartDate, context.start, context.end)); }).forEach(function (row) { var key = operationKey(row), old = operations.get(key); if (!old || operationRank(row) < operationRank(old)) { operations.set(key, row); } });
        assignments.forEach(function (assignment) { var resource = dailyByResource.get(text(assignment.ResourceId)), headship = resource && headships.get(text(resource.HeadshipId) || "SIN_JEFATURA"), order = orders.get(text(assignment.OrderId)); if (headship && order && activeOrder(order)) { headship.activeOrders.add(text(order.OrderId)); activeOrderIds.add(text(order.OrderId)); } });
        operations.forEach(function (operation) { var assignment = assignments.get(assignmentKey(operation)), resource, headship, supervisor, load; if (!assignment) { return; } resource = dailyByResource.get(text(assignment.ResourceId)); headship = resource && headships.get(text(resource.HeadshipId) || "SIN_JEFATURA"); supervisor = resource && supervisors.get(text(resource.SupervisorId) || "SIN_SUPERVISOR"); load = unitHours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal); if (headship) { headship.load += load; } if (supervisor) { supervisor.load += load; } });
        supervisors.forEach(function (supervisor) { var headship = headships.get(supervisor.headshipId); if (headship && supervisor.capacity > 0 && supervisor.load / supervisor.capacity * 100 > limits.normal) { headship.overloaded.add(supervisor.id); } });

        var capacityRows = Array.from(headships.values()).map(function (headship) { var utilization = headship.capacity > 0 ? headship.load / headship.capacity * 100 : 0, state = utilizationStatus(utilization, limits); return { id: headship.id, jefatura: headship.id + " - " + headship.name, supervisors: String(headship.supervisors.size), capacity: display(headship.capacity), load: display(headship.load), utilization: round(utilization), barPercent: Math.min(100, Math.max(0, round(utilization))), utilizationState: state.state, activeOrders: String(headship.activeOrders.size), overCapacity: String(headship.overloaded.size), status: state.text, statusState: state.state }; }).sort(function (a, b) { return b.utilization - a.utilization || a.jefatura.localeCompare(b.jefatura); });

        /* Materiales: cada movimiento hereda Jefatura a través de requisito -> orden -> recurso. */
        var materialReqs = new Map(), materialByHeadship = new Map(), orderHeadship = new Map(), movementIds = new Set();
        assignments.forEach(function (assignment) { var resource = dailyByResource.get(text(assignment.ResourceId)); if (resource && !orderHeadship.has(text(assignment.OrderId))) { orderHeadship.set(text(assignment.OrderId), text(resource.HeadshipId) || "SIN_JEFATURA"); } });
        list(raw.materials).filter(function (row) { return row && selectedOrders.has(text(row.OrderId)) && (row.IsPublishable === undefined || row.IsPublishable === null || yes(row.IsPublishable)); }).forEach(function (row) { materialReqs.set(text(row.MaterialRequirementId), row); });
        list(raw.movements).filter(function (movement) { return movement && movement.MaterialMovementId && inRange(movement.MovementDate, context.start, context.end) && !yes(movement.IsReversal); }).forEach(function (movement) {
            var requirement = materialReqs.get(text(movement.MaterialRequirementId)), headshipId, key, info, direction;
            if (!requirement) { return; }
            headshipId = orderHeadship.get(text(requirement.OrderId));
            if (!headshipId || !headships.has(headshipId)) { return; }
            key = headshipId + "|" + text(requirement.MaterialId || requirement.MaterialRequirementId) + "|" + text(movement.MovementUnitCode || requirement.BaseUnitCode);
            info = materialByHeadship.get(key) || { headshipId: headshipId, category: requirement.MaterialCategoryName || requirement.MaterialCategoryCode || "Sin categoría", material: requirement.MaterialName || requirement.MaterialId || "Sin material", unit: movement.MovementUnitCode || requirement.BaseUnitCode || "", actual: 0, plan: 0, orders: new Set(), materialId: requirement.MaterialId || requirement.MaterialRequirementId };
            direction = normal(movement.MovementDirectionCode);
            info.actual += direction === "RETURN" ? -number(movement.MovementQuantity) : number(movement.MovementQuantity);
            info.plan += normal(requirement.BaseUnitCode) === normal(info.unit) ? number(requirement.PlannedQuantity) : 0;
            info.orders.add(text(requirement.OrderId));
            materialByHeadship.set(key, info);
            movementIds.add(text(movement.MaterialMovementId));
        });
        var materialRows = [], categories = new Map(), materialsUsed = new Set(), consumedOrders = new Set(), critical = 0, topMaterial = null;
        Array.from(headships.values()).forEach(function (headship) {
            var values = Array.from(materialByHeadship.values()).filter(function (item) { return item.headshipId === headship.id; }).sort(function (a, b) { return Math.abs(b.actual) - Math.abs(a.actual); }), lead = values[0];
            if (!lead) { return; }
            var variation = lead.plan > 0 ? (lead.actual - lead.plan) / lead.plan * 100 : null, state = materialState(variation);
            values.forEach(function (item) {
                var categoryKey = item.category + "|" + item.unit, summary = categories.get(categoryKey) || { category: item.category, unit: item.unit, quantity: 0, rawQuantity: 0, icon: item.category.toLowerCase().indexOf("lubric") >= 0 ? "sap-icon://drop" : "sap-icon://product" };
                materialsUsed.add(text(item.materialId)); item.orders.forEach(function (id) { consumedOrders.add(id); });
                summary.rawQuantity += item.actual;
                categories.set(categoryKey, summary);
            });
            if (variation !== null && variation > 5) { critical += 1; }
            if (!topMaterial || Math.abs(lead.actual) > Math.abs(topMaterial.actual)) { topMaterial = lead; }
            materialRows.push({ id: headship.id, jefatura: headship.id + " - " + headship.name, supervisors: String(headship.supervisors.size), category: lead.category, material: lead.material, actual: display(lead.actual), unit: lead.unit, plan: lead.plan ? display(lead.plan) : "Sin datos", planUnit: lead.plan ? lead.unit : "", variation: variation === null ? "Sin datos" : (variation > 0 ? "+" : "") + pct(variation), variationState: state.state, orders: String(lead.orders.size), status: state.text, statusState: state.state });
        });
        var categoryRows = Array.from(categories.values()).sort(function (a, b) { return Math.abs(b.rawQuantity) - Math.abs(a.rawQuantity); }), maxCategory = categoryRows.length ? Math.abs(categoryRows[0].rawQuantity) : 0;
        categoryRows.forEach(function (row) { row.quantity = display(row.rawQuantity); row.percent = maxCategory ? Math.round(Math.abs(row.rawQuantity) / maxCategory * 100) : 0; });
        var totalCapacity = Array.from(headships.values()).reduce(function (sum, row) { return sum + row.capacity; }, 0), totalLoad = Array.from(headships.values()).reduce(function (sum, row) { return sum + row.load; }, 0), totalUtilization = totalCapacity > 0 ? totalLoad / totalCapacity * 100 : 0, materialVariation = topMaterial && topMaterial.plan > 0 ? (topMaterial.actual - topMaterial.plan) / topMaterial.plan * 100 : null;

        return {
            activeSection: "capacity", filters: filters,
            periodOptions: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
            managementOptions: catalogOptions(allDaily, "ManagementId", "ManagementName", "Todas"), headshipOptions: catalogOptions(allDaily.filter(function (row) { return match(filters.management, row.ManagementId || row.ManagementName); }), "HeadshipId", "HeadshipName", "Todas"), zoneOptions: catalogOptions(allDaily, "ZoneId", "ZoneName", "Todas"), serviceOptions: catalogOptions(Array.from(orders.values()), "OrderTypeCode", "OrderTypeText", "Todos"),
            kpis: {
                headships: String(capacityRows.length), supervisors: String(supervisors.size), capacity: display(totalCapacity), load: display(totalLoad), utilization: pct(totalUtilization), activeOrders: String(activeOrderIds.size), movements: String(movementIds.size),
                ordersWithMaterials: String(consumedOrders.size), materialsUsed: String(materialsUsed.size), criticalMaterials: String(critical), topMaterial: topMaterial ? topMaterial.material : "Sin datos", topQuantity: topMaterial ? display(topMaterial.actual) : "0", topUnit: topMaterial ? topMaterial.unit : "", materialVariation: materialVariation === null ? "Sin datos" : (materialVariation > 0 ? "+" : "") + pct(materialVariation)
            },
            capacityRows: capacityRows, materialRows: materialRows, categoryRows: categoryRows,
            meta: { bands: limits, unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [] }
        };
    }
    return { build: build, range: range };
});
