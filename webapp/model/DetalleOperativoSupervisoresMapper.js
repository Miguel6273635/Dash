sap.ui.define([], function () {
    "use strict";

    var DEFAULTS = {
        period: "2026",
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
        management: "ALL",
        headquarters: "ALL",
        supervisor: "ALL",
        shift: "ALL",
        serviceType: "ALL",
        resourceType: "ALL",
        zone: "ALL"
    };

    function list(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return String(value === undefined || value === null ? "" : value).trim(); }
    function normal(value) { return text(value).toUpperCase(); }
    function comparable(value) { var result = normal(value); return result.normalize ? result.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : result; }
    function number(value) { var result = Number(String(value === undefined || value === null ? 0 : value).replace(",", ".")); return Number.isFinite(result) ? result : 0; }
    function yes(value) { return value === true || ["X", "1", "TRUE", "SI", "SÍ"].indexOf(normal(value)) >= 0; }
    function date(value) {
        var match, result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ? new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result;
    }
    function dateFromIso(value, fallback) {
        var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(fallback.getTime());
    }
    function range(filters) {
        var values = Object.assign({}, DEFAULTS, filters || {}), start = dateFromIso(values.dateFrom, new Date(2026, 0, 1)), end = dateFromIso(values.dateTo, new Date(2026, 11, 31));
        end.setHours(23, 59, 59, 999);
        return { filters: values, start: start, end: end };
    }
    function inRange(value, start, end) { var current = date(value); return Boolean(current && current >= start && current <= end); }
    function hours(value, unit) {
        var u = normal(unit), amount = number(value);
        if (["H", "HR", "HRA", "HOUR", "HOURS", "HORAS"].indexOf(u) >= 0) { return amount; }
        if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(u) >= 0) { return amount / 60; }
        if (["S", "SEC", "SECOND", "SECONDS"].indexOf(u) >= 0) { return amount / 3600; }
        return amount;
    }
    function round(value, decimals) { var factor = Math.pow(10, decimals === undefined ? 1 : decimals); return Math.round((Number(value) || 0) * factor) / factor; }
    function displayNumber(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(round(value, 1)); }
    function displayHours(value) { return displayNumber(value) + " h"; }
    function displayPct(value) { return round(value, 1).toFixed(1) + "%"; }
    function displayDifference(value) { return (value > 0 ? "+" : "") + round(value, 1).toFixed(1) + " pp"; }
    function ratio(numerator, denominator) { return denominator > 0 ? numerator / denominator * 100 : 0; }
    function valueMatch(filter, value) { return normal(filter) === "ALL" || comparable(filter) === comparable(value); }
    function validAssignment(item, end) {
        var from = date(item && item.ValidFrom), to = date(item && item.ValidTo);
        return item && item.OrderId && item.ResourceId && (!from || from <= end) && (!to || to >= end);
    }
    function assignmentPriority(item) {
        return (normal(item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (normal(item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1);
    }
    function operationKey(item) { return text(item.OperationKey || [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|")); }
    function assignmentKey(item) { return [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|"); }
    function operationPriority(item) {
        var source = normal(item && item.PlannedSourceCode);
        return source.indexOf("AFVV") >= 0 ? 0 : source.indexOf("KBED") >= 0 ? 1 : 2;
    }
    function isExecuted(order) { return normal(order && order.AppStatusCode) === "0300" || normal(order && order.SapUserStatusCode) === "E0015"; }
    function resourceIsPublishable(resource) {
        return resource && (resource.CapacitySourceValidated === undefined || resource.CapacitySourceValidated === null || resource.CapacitySourceValidated === "" || yes(resource.CapacitySourceValidated));
    }

    function filterResources(records, filters, start, end) {
        return list(records).filter(function (resource) {
            return resource && inRange(resource.WorkDate, start, end) &&
                valueMatch(filters.management, resource.ManagementId || resource.ManagementName) &&
                valueMatch(filters.headquarters, resource.HeadshipId || resource.HeadshipName) &&
                valueMatch(filters.supervisor, resource.SupervisorId || resource.SupervisorName) &&
                valueMatch(filters.shift, resource.ShiftId || resource.ShiftName) &&
                valueMatch(filters.resourceType, resource.ResourceTypeCode || resource.ResourceTypeName) &&
                valueMatch(filters.zone, resource.ZoneId || resource.ZoneName);
        });
    }
    function filterOrders(records, filters, start, end) {
        return list(records).filter(function (order) {
            return order && inRange(order.PlannedStartDate, start, end) && valueMatch(filters.serviceType, order.OrderTypeCode || order.OrderTypeText);
        });
    }
    function optionList(records, idField, textField, allText) {
        var map = new Map([["ALL", allText]]);
        list(records).forEach(function (record) {
            var id = text(record && record[idField]);
            if (id) { map.set(id, record[textField] || id); }
        });
        return Array.from(map.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; });
    }
    function selectedGoal(catalogs, filters, end) {
        var candidates = list(catalogs).filter(function (item) {
            var from = date(item.ValidFrom), to = date(item.ValidTo), scope = normal(item.ScopeTypeCode);
            return yes(item.Active) && normal(item.FilterDomain) === "COMPLIANCE_TARGET" && (!from || from <= end) && (!to || to >= end) &&
                (!scope || scope === "GLOBAL" || (scope === "HEADSHIP" && (normal(filters.headquarters) === "ALL" || normal(item.ScopeId) === normal(filters.headquarters))));
        }).sort(function (a, b) { return (normal(a.ScopeTypeCode) === "HEADSHIP" ? -1 : 1) - (normal(b.ScopeTypeCode) === "HEADSHIP" ? -1 : 1); });
        return candidates.length && number(candidates[0].NumericValue) ? number(candidates[0].NumericValue) : 80;
    }
    function utilizationBands(catalogs, end) {
        var bands = { low: 70, normal: 100, high: 120 };
        list(catalogs).filter(function (item) {
            var from = date(item.ValidFrom), to = date(item.ValidTo);
            return yes(item.Active) && normal(item.FilterDomain) === "UTILIZATION_THRESHOLD" && (!from || from <= end) && (!to || to >= end);
        }).forEach(function (item) {
            var id = normal(item.ValueId), value = number(item.NumericValue);
            if (!value) { return; }
            if (["LOW", "LOW_MAX", "BAJO"].indexOf(id) >= 0) { bands.low = value; }
            if (["NORMAL", "NORMAL_MAX"].indexOf(id) >= 0) { bands.normal = value; }
            if (["HIGH", "HIGH_MAX", "ALTO"].indexOf(id) >= 0) { bands.high = value; }
        });
        return bands;
    }
    function statusFor(utilization, bands) {
        if (utilization <= bands.low) { return { text: "Bajo", state: "Information" }; }
        if (utilization <= bands.normal) { return { text: "Normal", state: "Success" }; }
        if (utilization <= bands.high) { return { text: "Alto", state: "Warning" }; }
        return { text: "Crítico", state: "Error" };
    }
    function buildAssignments(assignments, operations, allowedOrderIds, allowedResources, end) {
        var assignmentByOperation = new Map(), operationByKey = new Map();
        list(assignments).filter(function (item) { return validAssignment(item, end) && allowedOrderIds.has(text(item.OrderId)) && allowedResources.has(text(item.ResourceId)); }).forEach(function (item) {
            var key = assignmentKey(item), current = assignmentByOperation.get(key);
            if (!current || assignmentPriority(item) < assignmentPriority(current)) { assignmentByOperation.set(key, item); }
        });
        list(operations).filter(function (item) { return item && allowedOrderIds.has(text(item.OrderId)); }).forEach(function (item) {
            var key = operationKey(item), current = operationByKey.get(key);
            if (!current || operationPriority(item) < operationPriority(current)) { operationByKey.set(key, item); }
        });
        return { assignmentByOperation: assignmentByOperation, operationByKey: operationByKey };
    }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function createSupervisor(raw, goal, bands) {
        var capacity = raw.capacity, load = raw.load, utilization = ratio(load, capacity), compliance = ratio(raw.executedOrders.size, raw.orders.size), state = statusFor(utilization, bands), difference = compliance - goal;
        return {
            id: raw.id,
            supervisor: raw.name || raw.id,
            manager: "Jefe sin definir",
            resources: raw.resources.size,
            resourcesDisplay: displayNumber(raw.resources.size),
            capacity: capacity,
            capacityDisplay: displayNumber(capacity),
            programmedLoad: load,
            loadDisplay: displayNumber(load),
            utilization: utilization,
            utilizationDisplay: displayPct(utilization),
            status: state.text,
            statusState: state.state,
            overCapacity: raw.overCapacity.size,
            overCapacityDisplay: displayNumber(raw.overCapacity.size),
            compliance: compliance,
            complianceDisplay: displayPct(compliance),
            goal: goal,
            goalDisplay: displayPct(goal),
            difference: difference,
            differenceDisplay: displayDifference(difference),
            plannedOrders: raw.orders.size,
            executedOrders: raw.executedOrders.size,
            isTotal: false
        };
    }
    function totalRow(rows, goal, bands) {
        var resources = new Set(), orders = new Set(), executed = new Set(), capacity = 0, load = 0, overCapacity = 0;
        rows.forEach(function (row) { resources.add(row.id + "|" + row.resources); capacity += row.capacity; load += row.programmedLoad; overCapacity += row.overCapacity; });
        /* Los datos únicos se reconstruyen en build; estas propiedades sólo se usan para la presentación. */
        var utilization = ratio(load, capacity), state = statusFor(utilization, bands);
        return {
            id: "TOTAL", supervisor: "Total general", manager: "—", resources: rows.reduce(function (sum, row) { return sum + row.resources; }, 0),
            resourcesDisplay: displayNumber(rows.reduce(function (sum, row) { return sum + row.resources; }, 0)), capacity: capacity, capacityDisplay: displayNumber(capacity), programmedLoad: load, loadDisplay: displayNumber(load),
            utilization: utilization, utilizationDisplay: displayPct(utilization), status: state.text, statusState: "None", overCapacity: overCapacity, overCapacityDisplay: displayNumber(overCapacity),
            compliance: 0, complianceDisplay: "0.0%", goal: goal, goalDisplay: displayPct(goal), difference: -goal, differenceDisplay: displayDifference(-goal), isTotal: true,
            _orders: orders, _executed: executed
        };
    }

    function build(raw, input) {
        var context = range(input), filters = context.filters, allResources = list(raw.resources).filter(function (item) { return item && inRange(item.WorkDate, context.start, context.end); }), resources = filterResources(allResources, filters, context.start, context.end), orders = filterOrders(raw.orders, filters, context.start, context.end), resourceById = new Map(), rawBySupervisor = new Map(), orderById = new Map(), orderIds, links, goal, bands, supervisorRows, total, allOrders = new Set(), allExecuted = new Set(), resourceLoad = new Map();

        resources.forEach(function (resource) {
            var resourceId = text(resource.ResourceId), supervisorId = text(resource.SupervisorId) || "SIN_SUPERVISOR", supervisor = rawBySupervisor.get(supervisorId), current = resourceById.get(resourceId);
            if (!supervisor) {
                supervisor = { id: supervisorId, name: resource.SupervisorName || supervisorId || "Sin supervisor", resources: new Set(), capacity: 0, load: 0, orders: new Set(), executedOrders: new Set(), overCapacity: new Set() };
                rawBySupervisor.set(supervisorId, supervisor);
            }
            if (resourceId) { supervisor.resources.add(resourceId); }
            if (resourceIsPublishable(resource)) { supervisor.capacity += number(resource.CapacityHours); }
            if (resourceId && (!current || (date(resource.WorkDate) || new Date(0)) > (date(current.WorkDate) || new Date(0)))) { resourceById.set(resourceId, resource); }
        });
        orders.forEach(function (order) { orderById.set(text(order.OrderId), order); });
        orderIds = new Set(orderById.keys());
        links = buildAssignments(raw.assignments, raw.operations, orderIds, new Set(resourceById.keys()), context.end);
        links.operationByKey.forEach(function (operation) {
            var assignment = links.assignmentByOperation.get(assignmentKey(operation)), resource, supervisor, load;
            if (!assignment) { return; }
            resource = resourceById.get(text(assignment.ResourceId));
            supervisor = resource && rawBySupervisor.get(text(resource.SupervisorId) || "SIN_SUPERVISOR");
            if (!supervisor) { return; }
            load = hours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal);
            supervisor.load += load;
            add(resourceLoad, text(assignment.ResourceId), load);
        });
        list(raw.assignments).filter(function (assignment) { return validAssignment(assignment, context.end) && orderIds.has(text(assignment.OrderId)) && resourceById.has(text(assignment.ResourceId)); }).forEach(function (assignment) {
            var resource = resourceById.get(text(assignment.ResourceId)), supervisor = resource && rawBySupervisor.get(text(resource.SupervisorId) || "SIN_SUPERVISOR"), order = orderById.get(text(assignment.OrderId));
            if (!supervisor || !order) { return; }
            supervisor.orders.add(text(order.OrderId));
            if (isExecuted(order)) { supervisor.executedOrders.add(text(order.OrderId)); }
        });
        resourceById.forEach(function (resource, resourceId) {
            var supervisor = rawBySupervisor.get(text(resource.SupervisorId) || "SIN_SUPERVISOR"), capacity = 0;
            resources.forEach(function (daily) { if (text(daily.ResourceId) === resourceId && resourceIsPublishable(daily)) { capacity += number(daily.CapacityHours); } });
            if (supervisor && resourceLoad.get(resourceId) > capacity && capacity > 0) { supervisor.overCapacity.add(resourceId); }
        });
        goal = selectedGoal(raw.catalogs, filters, context.end);
        bands = utilizationBands(raw.catalogs, context.end);
        supervisorRows = Array.from(rawBySupervisor.values()).map(function (item) { item.orders.forEach(function (id) { allOrders.add(id); }); item.executedOrders.forEach(function (id) { allExecuted.add(id); }); return createSupervisor(item, goal, bands); }).sort(function (a, b) { return b.programmedLoad - a.programmedLoad || a.supervisor.localeCompare(b.supervisor); });
        total = totalRow(supervisorRows, goal, bands);
        total.compliance = ratio(allExecuted.size, allOrders.size);
        total.complianceDisplay = displayPct(total.compliance);
        total.difference = total.compliance - goal;
        total.differenceDisplay = displayDifference(total.difference);

        return {
            filters: filters,
            periods: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
            managements: optionList(allResources, "ManagementId", "ManagementName", "Todas"),
            headquarters: optionList(allResources, "HeadshipId", "HeadshipName", "Todas"),
            supervisorOptions: optionList(allResources, "SupervisorId", "SupervisorName", "Todos"),
            shifts: optionList(allResources, "ShiftId", "ShiftName", "Todos"),
            serviceTypes: optionList(orders, "OrderTypeCode", "OrderTypeText", "Todos"),
            resourceTypes: optionList(allResources, "ResourceTypeCode", "ResourceTypeName", "Todos"),
            zones: optionList(allResources, "ZoneId", "ZoneName", "Todas"),
            kpis: {
                activeSupervisors: { value: String(supervisorRows.length) },
                totalResources: { value: displayNumber(total.resources) },
                availableCapacity: { value: displayHours(total.capacity) },
                programmedLoad: { value: displayHours(total.programmedLoad) },
                averageUtilization: { value: displayPct(total.utilization) },
                operationalCompliance: { value: displayPct(total.compliance) }
            },
            supervisors: supervisorRows,
            filteredSupervisors: supervisorRows,
            pageItems: [],
            summaryRow: supervisorRows.length ? total : null,
            pageSize: 10,
            paging: { currentPage: 1, totalPages: 1, rangeText: "0 - 0 de 0" },
            meta: { goal: goal, bands: bands, unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [] }
        };
    }

    return { build: build, range: range };
});
