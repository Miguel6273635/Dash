sap.ui.define([], function () {
    "use strict";

    var DEFAULTS = {
        periodo: "2026",
        fechaDesde: "01/01/2026",
        fechaHasta: "31/12/2026",
        zona: "TODOS",
        turno: "TODOS",
        supervisor: "TODOS"
    };

    function list(value) { return Array.isArray(value) ? value : []; }
    function norm(value) { return String(value || "").trim().toUpperCase(); }
    function clean(value) {
        var text = norm(value);
        return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
    }
    function number(value) {
        var result = Number(String(value === undefined || value === null ? 0 : value).replace(",", "."));
        return Number.isFinite(result) ? result : 0;
    }
    function date(value) {
        var match;
        var result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ?
            new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result;
    }
    function valid(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
    function parseDate(value, fallback) {
        var parts = String(value || "").split("/");
        var result;
        if (parts.length === 3) {
            result = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            if (!Number.isNaN(result.getTime())) { return result; }
        }
        return new Date(fallback.getTime());
    }
    function context(input) {
        var filters = Object.assign({}, DEFAULTS, input || {});
        var start = parseDate(filters.fechaDesde, new Date(2026, 0, 1));
        var end = parseDate(filters.fechaHasta, new Date(2026, 11, 31));
        end.setHours(23, 59, 59, 999);
        return { filters: filters, startDate: start, endDate: end };
    }
    function inRange(value, startDate, endDate) {
        var result = date(value);
        return !!result && result >= startDate && result <= endDate;
    }
    function textDate(value) {
        return String(value.getDate()).padStart(2, "0") + "/" + String(value.getMonth() + 1).padStart(2, "0") + "/" + value.getFullYear();
    }
    function hours(value, unit) {
        var normalized = norm(unit);
        var source = number(value);
        if (["H", "HR", "HRA", "HOUR", "HOURS", "HORAS"].indexOf(normalized) >= 0) { return source; }
        if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(normalized) >= 0) { return source / 60; }
        if (["S", "SEC", "SECOND", "SECONDS"].indexOf(normalized) >= 0) { return source / 3600; }
        return 0;
    }
    function round(value, digits) {
        var factor = Math.pow(10, digits === undefined ? 1 : digits);
        return Math.round((Number(value) || 0) * factor) / factor;
    }
    function hoursText(value, signed) {
        var prefix = signed ? (value >= 0 ? "+" : "-") : "";
        return prefix + round(Math.abs(value), 1).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " h";
    }
    function percent(value) { return value === null ? "Sin datos" : round(value, 1).toFixed(1) + "%"; }
    function percentage(numerator, denominator) { return denominator > 0 ? round(numerator / denominator * 100) : null; }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function operationKey(operation) { return String(operation.OperationKey || [operation.OrderId, operation.RoutingNumber, operation.OperationCounter].join("|")); }
    function assignmentKey(item) { return [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|"); }
    function resourcePasses(resource, filters, startDate, endDate) {
        return resource && inRange(resource.WorkDate, startDate, endDate) &&
            (norm(filters.zona) === "TODOS" || clean(resource.ZoneId || resource.ZoneName) === clean(filters.zona)) &&
            (norm(filters.turno) === "TODOS" || norm(resource.ShiftId) === norm(filters.turno)) &&
            (norm(filters.supervisor) === "TODOS" || norm(resource.SupervisorId) === norm(filters.supervisor));
    }
    function isAvailable(resource) {
        return valid(resource && resource.CapacitySourceValidated) &&
            ["INACTIVE", "UNAVAILABLE", "ABSENT", "NO_DISPONIBLE", "OFF"].indexOf(clean(resource && resource.AvailabilityStatusCode)) < 0;
    }
    function activeAssignment(item, cutOff) {
        var from = date(item && item.ValidFrom);
        var to = date(item && item.ValidTo);
        return (!from || from <= cutOff) && (!to || to >= cutOff);
    }
    function assignmentRank(item) {
        return (norm(item && item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) +
            (norm(item && item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1);
    }
    function resourceReferences(resources, assignments, cutOff) {
        var byId = new Map();
        var byPersonnel = new Map();
        var byOperation = new Map();
        var byOrder = new Map();
        resources.forEach(function (resource) {
            var resourceId = String(resource.ResourceId || "");
            var personnel = String(resource.PersonnelNumber || "");
            var old = byId.get(resourceId);
            if (resourceId && (!old || (date(resource.WorkDate) || new Date(0)) > (date(old.WorkDate) || new Date(0)))) { byId.set(resourceId, resource); }
            old = byPersonnel.get(personnel);
            if (personnel && (!old || (date(resource.WorkDate) || new Date(0)) > (date(old.WorkDate) || new Date(0)))) { byPersonnel.set(personnel, resource); }
        });
        list(assignments).filter(function (item) { return item && item.ResourceId && item.OrderId && activeAssignment(item, cutOff); }).forEach(function (item) {
            var exactKey = assignmentKey(item);
            var orderKey = String(item.OrderId);
            var oldExact = byOperation.get(exactKey);
            var oldOrder = byOrder.get(orderKey);
            if (!oldExact || assignmentRank(item) < assignmentRank(oldExact)) { byOperation.set(exactKey, item); }
            if (!oldOrder || assignmentRank(item) < assignmentRank(oldOrder)) { byOrder.set(orderKey, item); }
        });
        return { byId: byId, byPersonnel: byPersonnel, byOperation: byOperation, byOrder: byOrder };
    }
    function statusThresholds(catalogs, cutOff) {
        var warning = 90;
        var overload = 100;
        list(catalogs).filter(function (item) {
            var from = date(item.ValidFrom);
            var to = date(item.ValidTo);
            return valid(item.Active) && norm(item.FilterDomain) === "CAPACITY_UTILIZATION_THRESHOLD" && (!from || from <= cutOff) && (!to || to >= cutOff);
        }).forEach(function (item) {
            if (["HIGH", "WARNING", "NEAR_SATURATION"].indexOf(norm(item.ValueId)) >= 0) { warning = number(item.NumericValue) || warning; }
            if (["OVERLOAD", "CRITICAL", "OVERLOADED"].indexOf(norm(item.ValueId)) >= 0) { overload = number(item.NumericValue) || overload; }
        });
        return { warning: warning, overload: overload };
    }
    function classify(utilization, thresholds) {
        if (utilization === null) { return "Sin datos"; }
        if (utilization >= thresholds.overload) { return "Sobrecargado"; }
        if (utilization >= thresholds.warning) { return "Cerca de saturación"; }
        return "Normal";
    }
    function options(resources, field, labelField, allText) {
        var values = new Map([["TODOS", allText]]);
        resources.forEach(function (resource) {
            var key = String(resource[field] || "");
            if (key) { values.set(key, resource[labelField] || key); }
        });
        return Array.from(values.entries()).map(function (item) { return { key: item[0], text: item[1] }; });
    }
    function operationWinner(map, operation) {
        var key = operationKey(operation);
        var old = map.get(key);
        var rank = norm(operation.PlannedSourceCode).indexOf("AFVV") >= 0 ? 0 : norm(operation.PlannedSourceCode).indexOf("KBED") >= 0 ? 1 : 2;
        var oldRank = old ? (norm(old.PlannedSourceCode).indexOf("AFVV") >= 0 ? 0 : norm(old.PlannedSourceCode).indexOf("KBED") >= 0 ? 1 : 2) : 99;
        if (!old || rank < oldRank) { map.set(key, operation); }
    }
    function detailsRows(groups, thresholds) {
        return Array.from(groups.values()).map(function (item) {
            var planUtilization = percentage(item.planned, item.capacity);
            var realUtilization = percentage(item.actual, item.capacity);
            var margin = item.capacity - item.actual;
            var variation = item.actual - item.planned;
            var variationPct = percentage(variation, item.planned);
            return {
                zona: item.zona,
                turno: item.turno,
                capacidadValor: round(item.capacity),
                programadasValor: round(item.planned),
                realesValor: round(item.actual),
                capacidad: hoursText(item.capacity),
                programadas: hoursText(item.planned),
                reales: hoursText(item.actual),
                margen: item.capacity ? hoursText(margin, true) : "Sin datos",
                utilizacion: percent(realUtilization),
                utilizacionValor: realUtilization,
                utilizacionProgramada: percent(planUtilization),
                variacionProgH: hoursText(variation, true),
                variacionProgP: variationPct === null ? "Sin datos" : (variation >= 0 ? "+" : "-") + percent(Math.abs(variationPct)),
                estado: classify(realUtilization, thresholds),
                icon: iconForTurn(item.turno)
            };
        }).sort(function (a, b) { return a.zona.localeCompare(b.zona, "es") || a.turno.localeCompare(b.turno, "es"); });
    }
    function iconForTurn(turn) {
        var value = clean(turn);
        return value.indexOf("NOCT") >= 0 ? "sap-icon://lateness" : value.indexOf("FIN") >= 0 ? "sap-icon://calendar" : "sap-icon://light-mode";
    }
    function groupKey(resource) { return [resource.ZoneName || resource.ZoneId || "Sin zona", resource.ShiftName || resource.ShiftId || "Sin turno"].join("|"); }
    function createGroup(groups, resource) {
        var key = groupKey(resource);
        var row = groups.get(key);
        if (!row) {
            row = { zona: resource.ZoneName || resource.ZoneId || "Sin zona", turno: resource.ShiftName || resource.ShiftId || "Sin turno", capacity: 0, planned: 0, actual: 0 };
            groups.set(key, row);
        }
        return row;
    }
    function build(raw, input) {
        var current = context(input);
        var filters = current.filters;
        var allResources = list(raw.resources).filter(function (resource) { return inRange(resource && resource.WorkDate, current.startDate, current.endDate); });
        var filteredResources = allResources.filter(function (resource) { return resourcePasses(resource, filters, current.startDate, current.endDate); });
        var references = resourceReferences(filteredResources, raw.assignments, current.endDate);
        var thresholds = statusThresholds(raw.catalogs, current.endDate);
        var groups = new Map();
        var selectedResourceIds = new Set();
        var operationMap = new Map();
        var plannedByGroup = new Map();
        var actualByGroup = new Map();
        var capacity;
        var planned;
        var actual;
        var margin;
        var plannedUtilization;
        var realUtilization;
        var details;

        filteredResources.forEach(function (resource) {
            var row = createGroup(groups, resource);
            selectedResourceIds.add(String(resource.ResourceId || ""));
            if (isAvailable(resource)) { row.capacity += number(resource.CapacityHours); }
        });

        list(raw.operations).filter(function (operation) {
            return operation && (!operation.PlannedStartDate || inRange(operation.PlannedStartDate, current.startDate, current.endDate));
        }).forEach(function (operation) { operationWinner(operationMap, operation); });

        operationMap.forEach(function (operation) {
            var assignment = references.byOperation.get(assignmentKey(operation)) || references.byOrder.get(String(operation.OrderId));
            var resource = assignment && references.byId.get(String(assignment.ResourceId));
            var key;
            var value;
            if (!resource || !selectedResourceIds.has(String(resource.ResourceId || ""))) { return; }
            key = groupKey(resource);
            value = hours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal);
            add(plannedByGroup, key, value);
        });

        list(raw.confirmations).filter(function (confirmation) {
            return confirmation && valid(confirmation.IncludedInCalculation) && !valid(confirmation.CancellationIndicator) && !confirmation.ReversalReference &&
                (!confirmation.ActualStartDate || inRange(confirmation.ActualStartDate, current.startDate, current.endDate));
        }).forEach(function (confirmation) {
            var resource = references.byPersonnel.get(String(confirmation.ExecutorPersonnelNumber || ""));
            var key;
            var value;
            if (!resource || !selectedResourceIds.has(String(resource.ResourceId || ""))) { return; }
            key = groupKey(resource);
            value = hours(confirmation.ActualValueOriginal, confirmation.ActualUnitOriginal);
            add(actualByGroup, key, value);
        });

        groups.forEach(function (row, key) {
            row.planned = plannedByGroup.get(key) || 0;
            row.actual = actualByGroup.get(key) || 0;
        });
        capacity = Array.from(groups.values()).reduce(function (sum, row) { return sum + row.capacity; }, 0);
        planned = Array.from(groups.values()).reduce(function (sum, row) { return sum + row.planned; }, 0);
        actual = Array.from(groups.values()).reduce(function (sum, row) { return sum + row.actual; }, 0);
        margin = capacity - planned;
        plannedUtilization = percentage(planned, capacity);
        realUtilization = percentage(actual, capacity);
        details = detailsRows(groups, thresholds);

        return {
            filtros: {
                periodo: filters.periodo,
                fechaDesde: textDate(current.startDate),
                fechaHasta: textDate(current.endDate),
                zona: filters.zona,
                turno: filters.turno,
                supervisor: filters.supervisor
            },
            catalogos: {
                periodos: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
                zonas: options(allResources, "ZoneId", "ZoneName", "Todas"),
                turnos: options(allResources.filter(function (item) { return valid(item.ShiftSourceValidated); }), "ShiftId", "ShiftName", "Todos"),
                supervisores: options(allResources, "SupervisorId", "SupervisorName", "Todos")
            },
            kpis: {
                capacidadDisponible: { valor: capacity ? hoursText(capacity) : "Sin datos" },
                horasProgramadas: { valor: hoursText(planned), subtitulo: "Utilización programada: " + percent(plannedUtilization) },
                horasReales: { valor: hoursText(actual), subtitulo: "Utilización real: " + percent(realUtilization) },
                margenDisponible: { valor: capacity ? hoursText(margin, true) : "Sin datos", subtitulo: capacity ? percent(percentage(margin, capacity)) + " de capacidad disponible" : "Capacidad no validada" },
                utilizacionReal: { valor: percent(realUtilization), subtitulo: capacity ? "Horas reales / capacidad" : "Capacidad no validada" }
            },
            resumenTurno: summarizeByTurn(details, thresholds),
            detalles: details,
            charts: donut(capacity, planned, actual),
            paginacion: { pageSize: "10", total: details.length, footerText: "Mostrando " + details.length + " resultados" },
            meta: { startDate: current.startDate, endDate: current.endDate, source: "BTP_DESTINATION_ODATA_V2" }
        };
    }
    function summarizeByTurn(details, thresholds) {
        var values = new Map();
        details.forEach(function (detail) {
            var item = values.get(detail.turno) || { turno: detail.turno, capacity: 0, planned: 0, actual: 0, icon: detail.icon };
            item.capacity += detail.capacidadValor;
            item.planned += detail.programadasValor;
            item.actual += detail.realesValor;
            values.set(detail.turno, item);
        });
        return Array.from(values.values()).map(function (item) {
            var real = percentage(item.actual, item.capacity);
            return { turno: item.turno, icon: item.icon, capacidad: hoursText(item.capacity), programadas: hoursText(item.planned), reales: hoursText(item.actual), utilizacion: percent(real), estado: classify(real, thresholds) };
        });
    }
    function donut(capacity, planned, actual) {
        var sum = capacity + planned + actual;
        var capacityPct = sum ? round(capacity / sum * 100) : 0;
        var plannedPct = sum ? round(planned / sum * 100) : 0;
        var actualPct = sum ? round(actual / sum * 100) : 0;
        return {
            total: hoursText(capacity),
            capacity: hoursText(capacity) + " (" + capacityPct.toFixed(1) + "%)",
            planned: hoursText(planned) + " (" + plannedPct.toFixed(1) + "%)",
            actual: hoursText(actual) + " (" + actualPct.toFixed(1) + "%)",
            capacityPct: capacityPct.toFixed(1) + "%",
            plannedPct: plannedPct.toFixed(1) + "%",
            actualPct: actualPct.toFixed(1) + "%"
        };
    }

    return { build: build, context: context };
});
