sap.ui.define([], function () {
    "use strict";

    var DEFAULTS = { supervisorId: "ALL", supervisorName: "Todos", dateFrom: "2026-01-01", dateTo: "2026-12-31", zone: "ALL", resourceType: "ALL", shift: "ALL", status: "ALL", search: "" };

    function list(value) { return Array.isArray(value) ? value : []; }
    function string(value) { return String(value === undefined || value === null ? "" : value).trim(); }
    function normal(value) { return string(value).toUpperCase(); }
    function comparable(value) { var result = normal(value); return result.normalize ? result.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : result; }
    function numeric(value) { var result = Number(String(value === undefined || value === null ? 0 : value).replace(",", ".")); return Number.isFinite(result) ? result : 0; }
    function yes(value) { return value === true || ["X", "1", "TRUE", "SI", "SÍ"].indexOf(normal(value)) >= 0; }
    function date(value) { var match, result; if (!value) { return null; } if (value instanceof Date) { return new Date(value.getTime()); } match = String(value).match(/\/Date\((-?\d+)/); result = match ? new Date(Number(match[1])) : new Date(value); if (Number.isNaN(result.getTime())) { return null; } return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ? new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result; }
    function isoDate(value, fallback) { var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(fallback.getTime()); }
    function range(input) { var filters = Object.assign({}, DEFAULTS, input || {}), start = isoDate(filters.dateFrom, new Date(2026, 0, 1)), end = isoDate(filters.dateTo, new Date(2026, 11, 31)); end.setHours(23, 59, 59, 999); return { filters: filters, start: start, end: end }; }
    function inRange(value, start, end) { var current = date(value); return Boolean(current && current >= start && current <= end); }
    function hours(value, unit) { var code = normal(unit), amount = numeric(value); if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(code) >= 0) { return amount / 60; } if (["S", "SEC", "SECOND", "SECONDS"].indexOf(code) >= 0) { return amount / 3600; } return amount; }
    function format(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(Math.round((Number(value) || 0) * 10) / 10); }
    function match(filter, value) { return normal(filter) === "ALL" || comparable(filter) === comparable(value); }
    function typeText(value) { var code = normal(value); if (["MECHANIC", "MECANICO", "MECÁNICO"].indexOf(code) >= 0) { return "Mecánico"; } if (["ASSISTANT", "AYUDANTE"].indexOf(code) >= 0) { return "Ayudante"; } return string(value) || "Sin tipo"; }
    function activeAssignment(item, end) { var from = date(item && item.ValidFrom), to = date(item && item.ValidTo); return item && item.OrderId && item.ResourceId && (!from || from <= end) && (!to || to >= end); }
    function operationKey(item) { return string(item.OperationKey || [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|")); }
    function assignmentKey(item) { return [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|"); }
    function assignmentRank(item) { return (normal(item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (normal(item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1); }
    function operationRank(item) { var source = normal(item && item.PlannedSourceCode); return source.indexOf("AFVV") >= 0 ? 0 : source.indexOf("KBED") >= 0 ? 1 : 2; }
    function validatedCapacity(resource) { return resource && (resource.CapacitySourceValidated === undefined || resource.CapacitySourceValidated === null || resource.CapacitySourceValidated === "" || yes(resource.CapacitySourceValidated)); }
    function option(items, idField, textField, allText, transform) { var map = new Map([["ALL", allText]]); list(items).forEach(function (item) { var id = string(item[idField]); if (id) { map.set(id, transform ? transform(item) : (item[textField] || id)); } }); return Array.from(map.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; }); }
    function bands(catalogs, end) {
        var result = { low: 70, normal: 100, high: 120 };
        list(catalogs).filter(function (item) { var from = date(item.ValidFrom), to = date(item.ValidTo); return yes(item.Active) && normal(item.FilterDomain) === "RESOURCE_UTILIZATION_BAND" && (!from || from <= end) && (!to || to >= end); }).forEach(function (item) {
            var id = normal(item.ValueId), value = numeric(item.NumericValue);
            if (!value) { return; }
            if (["LOW", "BAJO", "LOW_MAX"].indexOf(id) >= 0) { result.low = value; }
            if (["NORMAL", "NORMAL_MAX"].indexOf(id) >= 0) { result.normal = value; }
            if (["HIGH", "ALTO", "HIGH_MAX", "CRITICAL"].indexOf(id) >= 0) { result.high = value; }
        });
        return result;
    }
    function status(utilization, limits) {
        if (utilization === null) { return { text: "Sin datos", key: "sin_datos", statusState: "None", utilizationState: "None", utilizationText: "Sin datos" }; }
        if (utilization <= limits.low) { return { text: "Bajo", key: "bajo", statusState: "Success", utilizationState: "Success", utilizationText: format(utilization) + "%" }; }
        if (utilization <= limits.normal) { return { text: "Normal", key: "normal", statusState: "Success", utilizationState: "Success", utilizationText: format(utilization) + "%" }; }
        if (utilization <= limits.high) { return { text: "Alto", key: "alto", statusState: "Warning", utilizationState: "Warning", utilizationText: format(utilization) + "%" }; }
        return { text: "Crítico", key: "critico", statusState: "Error", utilizationState: "Error", utilizationText: format(utilization) + "%" };
    }

    function build(raw, input) {
        var current = range(input), filters = current.filters, base = list(raw.resources).filter(function (item) { return item && inRange(item.WorkDate, current.start, current.end) && match(filters.supervisorId, item.SupervisorId); }), allSupervisorResources = base.slice(), selectedDaily = base.filter(function (item) { return match(filters.zone, item.ZoneId || item.ZoneName) && match(filters.resourceType, item.ResourceTypeCode || item.ResourceTypeName) && match(filters.shift, item.ShiftId || item.ShiftName); }), resources = new Map(), resourceContext = new Map(), orderMap = new Map(), orderIds, assignmentMap = new Map(), operationMap = new Map(), limits = bands(raw.catalogs, current.end), header = { id: filters.supervisorId, name: filters.supervisorName || "Todos", zone: "Todas", shift: "Todos" };

        allSupervisorResources.sort(function (a, b) { return (date(b.WorkDate) || 0) - (date(a.WorkDate) || 0); });
        if (allSupervisorResources[0]) {
            header.id = allSupervisorResources[0].SupervisorId || header.id;
            header.name = allSupervisorResources[0].SupervisorName || header.name;
            header.zone = allSupervisorResources[0].ZoneName || allSupervisorResources[0].ZoneId || header.zone;
            header.shift = allSupervisorResources[0].ShiftName || allSupervisorResources[0].ShiftId || header.shift;
        }
        selectedDaily.forEach(function (daily) {
            var id = string(daily.ResourceId), row = resources.get(id), context = resourceContext.get(id);
            if (!id) { return; }
            if (!row) { row = { id: id, name: daily.ResourceName || daily.PersonnelNumber || id, resourceType: typeText(daily.ResourceTypeCode || daily.ResourceTypeName), zone: daily.ZoneName || daily.ZoneId || "Sin zona", shift: daily.ShiftName || daily.ShiftId || "Sin turno", capacity: 0, capacityValid: false, load: 0, orders: new Set(), operations: new Set() }; resources.set(id, row); }
            if (validatedCapacity(daily)) { row.capacity += numeric(daily.CapacityHours); row.capacityValid = true; }
            if (!context || (date(daily.WorkDate) || 0) > (date(context.WorkDate) || 0)) { resourceContext.set(id, daily); }
        });
        list(raw.orders).filter(function (item) { return item && inRange(item.PlannedStartDate, current.start, current.end); }).forEach(function (item) { orderMap.set(string(item.OrderId), item); });
        orderIds = new Set(orderMap.keys());
        list(raw.assignments).filter(function (item) { return activeAssignment(item, current.end) && resources.has(string(item.ResourceId)) && orderIds.has(string(item.OrderId)); }).forEach(function (item) { var key = assignmentKey(item), currentAssignment = assignmentMap.get(key); if (!currentAssignment || assignmentRank(item) < assignmentRank(currentAssignment)) { assignmentMap.set(key, item); } });
        list(raw.operations).filter(function (item) { return item && orderIds.has(string(item.OrderId)) && (!item.PlannedStartDate || inRange(item.PlannedStartDate, current.start, current.end)); }).forEach(function (item) { var key = operationKey(item), currentOperation = operationMap.get(key); if (!currentOperation || operationRank(item) < operationRank(currentOperation)) { operationMap.set(key, item); } });
        assignmentMap.forEach(function (assignment) { var row = resources.get(string(assignment.ResourceId)); if (row) { row.orders.add(string(assignment.OrderId)); } });
        operationMap.forEach(function (operation) { var assignment = assignmentMap.get(assignmentKey(operation)), row; if (!assignment) { return; } row = resources.get(string(assignment.ResourceId)); if (row) { row.load += hours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal); row.operations.add(operationKey(operation)); } });

        var allRows = Array.from(resources.values()).map(function (row) {
            var utilization = row.capacityValid && row.capacity > 0 ? row.load / row.capacity * 100 : null, state = status(utilization, limits);
            return Object.assign(row, {
                availableCapacity: row.capacityValid ? format(row.capacity) : "Sin datos",
                scheduledLoad: format(row.load),
                utilization: utilization,
                utilizationText: state.utilizationText,
                utilizationState: state.utilizationState,
                status: state.text,
                statusKey: state.key,
                statusState: state.statusState,
                assignedOrders: String(row.orders.size),
                operations: String(row.operations.size)
            });
        }).sort(function (a, b) { return (b.utilization === null ? -1 : b.utilization) - (a.utilization === null ? -1 : a.utilization) || a.name.localeCompare(b.name); });
        var search = comparable(filters.search), rows = allRows.filter(function (row) { return (normal(filters.status) === "ALL" || normal(filters.status) === normal(row.statusKey)) && (!search || comparable([row.name, row.id, row.resourceType, row.zone, row.shift, row.status].join(" ")).indexOf(search) >= 0); }), total = rows.length, count = function (key) { return rows.filter(function (row) { return row.statusKey === key; }).length; }, mechanics = rows.filter(function (row) { return comparable(row.resourceType) === "MECANICO"; }).length, assistants = rows.filter(function (row) { return comparable(row.resourceType) === "AYUDANTE"; }).length, percentage = function (value) { return total ? Math.round(value / total * 100) : 0; };

        return {
            supervisor: header,
            filters: { zone: filters.zone, resourceType: filters.resourceType, shift: filters.shift, status: filters.status, search: filters.search },
            filterOptions: {
                zones: option(allSupervisorResources, "ZoneId", "ZoneName", "Todos"),
                resourceTypes: option(allSupervisorResources, "ResourceTypeCode", "ResourceTypeName", "Todos", function (item) { return typeText(item.ResourceTypeCode || item.ResourceTypeName); }),
                shifts: option(allSupervisorResources, "ShiftId", "ShiftName", "Todos"),
                statuses: [{ key: "ALL", text: "Todos" }, { key: "bajo", text: "Bajo" }, { key: "normal", text: "Normal" }, { key: "alto", text: "Alto" }, { key: "critico", text: "Crítico" }, { key: "sin_datos", text: "Sin datos" }]
            },
            kpis: {
                total: { count: total, description: "Mecánicos " + mechanics + " | Ayudantes " + assistants },
                low: { count: count("bajo"), percent: percentage(count("bajo")) },
                normal: { count: count("normal"), percent: percentage(count("normal")) },
                high: { count: count("alto"), percent: percentage(count("alto")) },
                critical: { count: count("critico"), percent: percentage(count("critico")) }
            },
            resources: allRows,
            filteredResources: rows,
            totalFiltered: total,
            pageItems: [], currentPage: 1, totalPages: 1, pageSize: 7, showingText: "Mostrando 0 a 0 de 0 recursos",
            meta: { context: { supervisorId: filters.supervisorId, dateFrom: filters.dateFrom, dateTo: filters.dateTo }, bands: limits, unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [] }
        };
    }

    return { build: build, range: range };
});
