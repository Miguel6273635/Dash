sap.ui.define([], function () {
    "use strict";

    var DEFAULTS = { periodo: "2026", fechaDesde: "2026-01-01", fechaHasta: "2026-12-31", zona: "TODOS", supervisor: "TODOS", mecanico: "TODOS" };

    function list(value) { return Array.isArray(value) ? value : []; }
    function norm(value) { return String(value || "").trim().toUpperCase(); }
    function plain(value) { var text = norm(value); return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text; }
    function numeric(value) { var result = Number(String(value === null || value === undefined ? 0 : value).replace(",", ".")); return Number.isFinite(result) ? result : 0; }
    function flag(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
    function asDate(value) {
        var match;
        var result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ? new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result;
    }
    function parseDate(value, fallback) {
        var stringValue = String(value || "");
        var match = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})$/) || stringValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        var result;
        if (match) {
            result = stringValue.indexOf("-") >= 0 ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
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
    function inRange(value, start, end) { var result = asDate(value); return !!result && result >= start && result <= end; }
    function isoDate(value) { return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0"); }
    function hours(value, unit) {
        var normalized = norm(unit);
        var original = numeric(value);
        if (["H", "HR", "HRA", "HOUR", "HOURS", "HORAS"].indexOf(normalized) >= 0) { return original; }
        if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(normalized) >= 0) { return original / 60; }
        if (["S", "SEC", "SECOND", "SECONDS"].indexOf(normalized) >= 0) { return original / 3600; }
        return 0;
    }
    function round(value, decimals) { var factor = Math.pow(10, decimals === undefined ? 1 : decimals); return Math.round((Number(value) || 0) * factor) / factor; }
    function hourText(value, signed) { return (signed ? (value >= 0 ? "+" : "-") : "") + round(Math.abs(value), 1).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " h"; }
    function percent(value) { return value === null ? "Sin datos" : round(value, 1).toFixed(1) + "%"; }
    function ratio(numerator, denominator) { return denominator > 0 ? round(numerator / denominator * 100) : null; }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function opKey(item) { return String(item.OperationKey || [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|")); }
    function assignmentKey(item) { return [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|"); }
    function capacityAvailable(resource) {
        return flag(resource && resource.CapacitySourceValidated) && ["INACTIVE", "UNAVAILABLE", "ABSENT", "NO_DISPONIBLE", "OFF"].indexOf(plain(resource && resource.AvailabilityStatusCode)) < 0;
    }
    function resourceMatches(resource, filters, start, end) {
        return resource && inRange(resource.WorkDate, start, end) &&
            (norm(filters.zona) === "TODOS" || plain(resource.ZoneId || resource.ZoneName) === plain(filters.zona)) &&
            (norm(filters.supervisor) === "TODOS" || norm(resource.SupervisorId) === norm(filters.supervisor)) &&
            (norm(filters.mecanico) === "TODOS" || norm(resource.ResourceId) === norm(filters.mecanico) || norm(resource.PersonnelNumber) === norm(filters.mecanico));
    }
    function activeAssignment(item, cutOff) {
        var from = asDate(item && item.ValidFrom);
        var to = asDate(item && item.ValidTo);
        return (!from || from <= cutOff) && (!to || to >= cutOff);
    }
    function assignmentRank(item) { return (norm(item && item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (norm(item && item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1); }
    function references(resources, assignments, cutOff) {
        var byId = new Map();
        var byPersonnel = new Map();
        var assignmentOperation = new Map();
        var assignmentOrder = new Map();
        resources.forEach(function (resource) {
            var resourceId = String(resource.ResourceId || "");
            var personnel = String(resource.PersonnelNumber || "");
            var old = byId.get(resourceId);
            if (resourceId && (!old || (asDate(resource.WorkDate) || new Date(0)) > (asDate(old.WorkDate) || new Date(0)))) { byId.set(resourceId, resource); }
            old = byPersonnel.get(personnel);
            if (personnel && (!old || (asDate(resource.WorkDate) || new Date(0)) > (asDate(old.WorkDate) || new Date(0)))) { byPersonnel.set(personnel, resource); }
        });
        list(assignments).filter(function (item) { return item && item.OrderId && item.ResourceId && activeAssignment(item, cutOff); }).forEach(function (item) {
            var operation = assignmentKey(item);
            var order = String(item.OrderId);
            var oldOperation = assignmentOperation.get(operation);
            var oldOrder = assignmentOrder.get(order);
            if (!oldOperation || assignmentRank(item) < assignmentRank(oldOperation)) { assignmentOperation.set(operation, item); }
            if (!oldOrder || assignmentRank(item) < assignmentRank(oldOrder)) { assignmentOrder.set(order, item); }
        });
        return { byId: byId, byPersonnel: byPersonnel, operation: assignmentOperation, order: assignmentOrder };
    }
    function thresholds(catalogs, cutOff) {
        var warning = 90;
        var overload = 100;
        list(catalogs).filter(function (item) {
            var from = asDate(item.ValidFrom);
            var to = asDate(item.ValidTo);
            return flag(item.Active) && norm(item.FilterDomain) === "CAPACITY_UTILIZATION_THRESHOLD" && (!from || from <= cutOff) && (!to || to >= cutOff);
        }).forEach(function (item) {
            if (["HIGH", "WARNING", "NEAR_SATURATION"].indexOf(norm(item.ValueId)) >= 0) { warning = numeric(item.NumericValue) || warning; }
            if (["OVERLOAD", "CRITICAL", "OVERLOADED"].indexOf(norm(item.ValueId)) >= 0) { overload = numeric(item.NumericValue) || overload; }
        });
        return { warning: warning, overload: overload };
    }
    function state(utilization, values) {
        if (utilization === null) { return { text: "Sin datos", key: "none", color: "#94a3b8" }; }
        if (utilization >= values.overload) { return { text: "Sobrecargado", key: "error", color: "#ef3340" }; }
        if (utilization >= values.warning) { return { text: "Cerca de saturación", key: "warning", color: "#f59e0b" }; }
        return { text: "Dentro de capacidad", key: "normal", color: "#16a269" };
    }
    function selectOptions(resources, property, labelProperty, allText) {
        var values = new Map([["TODOS", allText]]);
        resources.forEach(function (resource) {
            var key = String(resource[property] || "");
            if (key) { values.set(key, resource[labelProperty] || key); }
        });
        return Array.from(values.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; });
    }
    function chooseOperation(map, operation) {
        var key = opKey(operation);
        var current = map.get(key);
        var priority = norm(operation.PlannedSourceCode).indexOf("AFVV") >= 0 ? 0 : norm(operation.PlannedSourceCode).indexOf("KBED") >= 0 ? 1 : 2;
        var existing = current ? (norm(current.PlannedSourceCode).indexOf("AFVV") >= 0 ? 0 : norm(current.PlannedSourceCode).indexOf("KBED") >= 0 ? 1 : 2) : 9;
        if (!current || priority < existing) { map.set(key, operation); }
    }
    function shiftKey(resource) { return String(resource.ShiftId || resource.ShiftName || "SIN_TURNO"); }
    function shiftText(resource) { return String(resource.ShiftName || resource.ShiftId || "Sin turno"); }
    function group(groups, resource) {
        var key = shiftKey(resource);
        var item = groups.get(key);
        if (!item) { item = { key: key, turno: shiftText(resource), capacity: 0, planned: 0, actual: 0 }; groups.set(key, item); }
        return item;
    }
    function orderData(order, resource) {
        return {
            ot: order && order.OrderId || "Sin OT",
            cliente: order && (order.CustomerName || order.CustomerId) || "Sin cliente",
            elevador: order && (order.EquipmentName || order.EquipmentId) || "Sin elevador",
            zona: resource && (resource.ZoneName || resource.ZoneId) || "Sin zona",
            turno: resource && shiftText(resource) || "Sin turno",
            turnoKey: resource && shiftKey(resource) || "SIN_TURNO",
            tipoOt: order && (order.OrderTypeText || order.OrderTypeCode) || "Sin tipo",
            responsable: resource && (resource.ResourceName || resource.PersonnelNumber || resource.ResourceId) || "Sin responsable",
            supervisorId: resource && resource.SupervisorId || "",
            recursoId: resource && resource.ResourceId || "",
            fecha: order && order.PlannedStartDate ? isoDate(asDate(order.PlannedStartDate)) : "",
            plan: 0,
            real: 0
        };
    }
    function build(raw, input) {
        var current = context(input);
        var filters = current.filters;
        var periodResources = list(raw.resources).filter(function (resource) { return inRange(resource && resource.WorkDate, current.startDate, current.endDate); });
        var resources = periodResources.filter(function (resource) { return resourceMatches(resource, filters, current.startDate, current.endDate); });
        var refs = references(resources, raw.assignments, current.endDate);
        var values = thresholds(raw.catalogs, current.endDate);
        var groups = new Map();
        var operations = new Map();
        var orders = new Map(list(raw.orders).map(function (order) { return [String(order.OrderId), order]; }));
        var selectedResources = new Set();
        var rows = new Map();
        var totalCapacity;
        var totalPlan;
        var totalActual;
        var totalRealUtilization;
        var summary;
        var saturated;
        var near;

        resources.forEach(function (resource) {
            var item = group(groups, resource);
            selectedResources.add(String(resource.ResourceId || ""));
            if (capacityAvailable(resource)) { item.capacity += numeric(resource.CapacityHours); }
        });
        list(raw.operations).filter(function (operation) { return operation && (!operation.PlannedStartDate || inRange(operation.PlannedStartDate, current.startDate, current.endDate)); }).forEach(function (operation) { chooseOperation(operations, operation); });
        operations.forEach(function (operation) {
            var assignment = refs.operation.get(assignmentKey(operation)) || refs.order.get(String(operation.OrderId));
            var resource = assignment && refs.byId.get(String(assignment.ResourceId));
            var item;
            var row;
            if (!resource || !selectedResources.has(String(resource.ResourceId || ""))) { return; }
            item = group(groups, resource);
            item.planned += hours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal);
            row = rows.get(String(operation.OrderId)) || orderData(orders.get(String(operation.OrderId)), resource);
            row.plan += hours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal);
            rows.set(String(operation.OrderId), row);
        });
        list(raw.confirmations).filter(function (confirmation) {
            return confirmation && flag(confirmation.IncludedInCalculation) && !flag(confirmation.CancellationIndicator) && !confirmation.ReversalReference &&
                (!confirmation.ActualStartDate || inRange(confirmation.ActualStartDate, current.startDate, current.endDate));
        }).forEach(function (confirmation) {
            var resource = refs.byPersonnel.get(String(confirmation.ExecutorPersonnelNumber || ""));
            var item;
            var row;
            if (!resource || !selectedResources.has(String(resource.ResourceId || ""))) { return; }
            item = group(groups, resource);
            item.actual += hours(confirmation.ActualValueOriginal, confirmation.ActualUnitOriginal);
            row = rows.get(String(confirmation.OrderId)) || orderData(orders.get(String(confirmation.OrderId)), resource);
            row.real += hours(confirmation.ActualValueOriginal, confirmation.ActualUnitOriginal);
            rows.set(String(confirmation.OrderId), row);
        });
        totalCapacity = Array.from(groups.values()).reduce(function (sum, item) { return sum + item.capacity; }, 0);
        totalPlan = Array.from(groups.values()).reduce(function (sum, item) { return sum + item.planned; }, 0);
        totalActual = Array.from(groups.values()).reduce(function (sum, item) { return sum + item.actual; }, 0);
        totalRealUtilization = ratio(totalActual, totalCapacity);
        summary = Array.from(groups.values()).map(function (item) {
            var planUtilization = ratio(item.planned, item.capacity);
            var realUtilization = ratio(item.actual, item.capacity);
            var margin = item.capacity - item.actual;
            var itemState = state(realUtilization, values);
            return {
                turno: item.turno, turnoKey: item.key, capacidad: hourText(item.capacity), horasProgramadas: hourText(item.planned), horasReales: hourText(item.actual),
                utilizacion: percent(realUtilization), utilizacionProgramada: percent(planUtilization), anchoBarra: Math.min(realUtilization || 0, 100) + "%",
                margen: item.capacity ? hourText(margin, true) : "Sin datos", margenState: margin < 0 ? "Error" : margin === 0 ? "Warning" : "Success",
                estado: itemState.text, estadoKey: itemState.key, statusColor: itemState.color, esTotal: false,
                capacityValue: item.capacity, planValue: item.planned, actualValue: item.actual, planUtilizationValue: planUtilization
            };
        }).sort(function (a, b) { return a.turno.localeCompare(b.turno, "es"); });
        saturated = summary.slice().sort(function (a, b) { return (b.planUtilizationValue || 0) - (a.planUtilizationValue || 0); })[0];
        near = summary.filter(function (item) { return item.planUtilizationValue >= values.warning && item.planUtilizationValue < values.overload; }).length;
        summary.push({ turno: "Total", capacidad: hourText(totalCapacity), horasProgramadas: hourText(totalPlan), horasReales: hourText(totalActual), utilizacion: percent(totalRealUtilization), anchoBarra: "0%", margen: totalCapacity ? hourText(totalCapacity - totalActual, true) : "Sin datos", margenState: totalCapacity - totalActual < 0 ? "Error" : "Success", estado: "-", estadoKey: "none", statusColor: "#94a3b8", esTotal: true });

        rows.forEach(function (row) {
            var detail = summary.filter(function (item) { return !item.esTotal && item.turnoKey === row.turnoKey; })[0];
            var variation = row.real - row.plan;
            var variationPct = ratio(variation, row.plan);
            row.horasPlan = hourText(row.plan);
            row.horasReal = hourText(row.real);
            row.variacionHoras = hourText(variation, true);
            row.variacionPorcentaje = variationPct === null ? "Sin datos" : (variation >= 0 ? "+" : "-") + percent(Math.abs(variationPct));
            row.variacionState = variation > 0 ? "Error" : variation < 0 ? "Success" : "Warning";
            row.estado = detail && detail.estado || "Sin datos";
            row.statusColor = detail && detail.statusColor || "#94a3b8";
        });

        return {
            filtros: { periodo: filters.periodo, fechaDesde: isoDate(current.startDate), fechaHasta: isoDate(current.endDate), zona: filters.zona, supervisor: filters.supervisor, mecanico: filters.mecanico },
            catalogos: {
                periodos: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
                zonas: selectOptions(periodResources, "ZoneId", "ZoneName", "Todas"),
                supervisores: selectOptions(periodResources, "SupervisorId", "SupervisorName", "Todos"),
                mecanicos: selectOptions(periodResources, "ResourceId", "ResourceName", "Todos")
            },
            kpis: {
                utilizacionGeneral: { valor: percent(totalRealUtilization), detalle: hourText(totalActual) + " reales / " + (totalCapacity ? hourText(totalCapacity) : "capacidad sin validar") },
                turnoSaturado: { valor: saturated ? saturated.turno : "Sin datos", detalle: saturated ? "Utilización programada: " + percent(saturated.planUtilizationValue) : "Sin datos" },
                sobreCapacidad: { valor: String(summary.filter(function (item) { return !item.esTotal && item.planUtilizationValue > 100; }).length), detalle: "de " + Math.max(summary.length - 1, 0) + " turnos" },
                cercaSaturacion: { valor: String(near), detalle: "entre " + values.warning + "% y " + values.overload + "% programado" }
            },
            resumenTurnos: summary,
            ordenes: Array.from(rows.values()).sort(function (a, b) { return b.plan - a.plan || a.ot.localeCompare(b.ot); }),
            ordenesFiltradas: [], ordenesPaginadas: [], turnoSeleccionado: "",
            pagination: { currentPage: 1, pageSize: "10", totalPages: 1, totalResults: 0, hasPrevious: false, hasNext: false, showPageTwo: false, resultText: "" },
            meta: { startDate: current.startDate, endDate: current.endDate, source: "BTP_DESTINATION_ODATA_V2" }
        };
    }

    return { build: build, context: context };
});
