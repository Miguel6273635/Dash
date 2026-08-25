sap.ui.define([], function () {
    "use strict";

    var OFFICIAL_ORDER_TYPES = ["SM01", "SM02", "SM03"];
    var MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

    function list(value) { return Array.isArray(value) ? value : []; }
    function norm(value) { return String(value || "").trim().toUpperCase(); }
    function simple(value) {
        var text = norm(value);
        return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
    }
    function number(value) {
        var result = Number(String(value === null || value === undefined ? 0 : value).replace(",", "."));
        return Number.isFinite(result) ? result : 0;
    }
    function asDate(value) {
        var match;
        var date;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        date = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(date.getTime())) { return null; }
        return date.getUTCHours() === 0 && date.getUTCMinutes() === 0 ?
            new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) : date;
    }
    function validFlag(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
    function dateText(date) { return String(date.getDate()).padStart(2, "0") + "/" + String(date.getMonth() + 1).padStart(2, "0") + "/" + date.getFullYear(); }
    function parseDateText(value, fallback) {
        var parts = String(value || "").split("/");
        var date;
        if (parts.length === 3) {
            date = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
            if (!Number.isNaN(date.getTime())) { return date; }
        }
        return new Date(fallback.getTime());
    }
    function range(filters) {
        var initial = filters || {};
        var from = parseDateText(initial.fechaDesde, new Date(2026, 0, 1));
        var to = parseDateText(initial.fechaHasta, new Date(2026, 11, 31));
        to.setHours(23, 59, 59, 999);
        return { startDate: from, endDate: to };
    }
    function inRange(date, selectedRange) { return !!date && date >= selectedRange.startDate && date <= selectedRange.endDate; }
    function toHours(value, unit) {
        var source = norm(unit);
        var original = number(value);
        if (["H", "HR", "HRA", "HOUR", "HOURS", "HORAS"].indexOf(source) >= 0) { return original; }
        if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(source) >= 0) { return original / 60; }
        if (["S", "SEC", "SECOND", "SECONDS"].indexOf(source) >= 0) { return original / 3600; }
        return 0;
    }
    function round(value, decimals) {
        var factor = Math.pow(10, decimals || 1);
        return Math.round((Number(value) || 0) * factor) / factor;
    }
    function formatHours(value) { return round(Math.abs(value), 1).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " h"; }
    function signedHours(value) { return (value >= 0 ? "+" : "-") + formatHours(value); }
    function percentageText(value) { return value === null ? "Sin datos" : round(value, 1).toFixed(1) + "%"; }
    function status(order) {
        var sap = norm(order && order.SapUserStatusCode);
        var app = norm(order && order.AppStatusCode);
        var appToSap = { "0100": "E0013", "0200": "E0014", "0300": "E0015" };
        return /^E00\d{2}$/.test(sap) ? sap : appToSap[app] || "";
    }
    function isIncludedConfirmation(item) {
        return validFlag(item && item.IncludedInCalculation) && !validFlag(item && item.CancellationIndicator) && !item.ReversalReference;
    }
    function assignmentRank(item) {
        return (norm(item && item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) +
            (norm(item && item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1);
    }
    function activeRecord(item, cutOff) {
        var from = asDate(item && item.ValidFrom);
        var to = asDate(item && item.ValidTo);
        return (!from || from <= cutOff) && (!to || to >= cutOff);
    }
    function operationId(item) {
        return String(item && (item.OperationKey || [item.OrderId, item.RoutingNumber, item.OperationCounter].join("|")) || "");
    }
    function assignmentId(item) { return [item && item.OrderId, item && item.RoutingNumber, item && item.OperationCounter].join("|"); }
    function resourceMaps(raw, cutOff) {
        var byId = new Map();
        var byPersonnel = new Map();
        var assignmentByOperation = new Map();
        var assignmentByOrder = new Map();
        list(raw.resources).forEach(function (resource) {
            var id = String(resource && resource.ResourceId || "");
            var personnel = String(resource && resource.PersonnelNumber || "");
            var old = byId.get(id);
            if (id && (!old || Math.abs((asDate(resource.WorkDate) || new Date(0)) - cutOff) < Math.abs((asDate(old.WorkDate) || new Date(0)) - cutOff))) { byId.set(id, resource); }
            if (personnel) { byPersonnel.set(personnel, resource); }
        });
        list(raw.assignments).filter(function (assignment) { return assignment && assignment.OrderId && assignment.ResourceId && activeRecord(assignment, cutOff); }).forEach(function (assignment) {
            var exact = assignmentId(assignment);
            var order = String(assignment.OrderId);
            var oldExact = assignmentByOperation.get(exact);
            var oldOrder = assignmentByOrder.get(order);
            if (!oldExact || assignmentRank(assignment) < assignmentRank(oldExact)) { assignmentByOperation.set(exact, assignment); }
            if (!oldOrder || assignmentRank(assignment) < assignmentRank(oldOrder)) { assignmentByOrder.set(order, assignment); }
        });
        return { byId: byId, byPersonnel: byPersonnel, assignmentByOperation: assignmentByOperation, assignmentByOrder: assignmentByOrder };
    }
    function mainTimeCauses(causes, cutOff) {
        var result = new Map();
        list(causes).filter(function (cause) { return cause && cause.OrderId && activeRecord(cause, cutOff) && norm(cause.CauseContextCode) === "TIME"; }).forEach(function (cause) {
            var id = String(cause.OrderId);
            var old = result.get(id);
            var rank = (validFlag(cause.IsPrimary) ? 10 : 0) + (cause.CauseText || cause.CauseCode ? 1 : 0);
            var oldRank = old ? (validFlag(old.IsPrimary) ? 10 : 0) + (old.CauseText || old.CauseCode ? 1 : 0) : -1;
            if (!old || rank > oldRank) { result.set(id, cause); }
        });
        return result;
    }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function selectOptions(items, keyName, textName, allKey, allText) {
        var values = new Map([[allKey, allText]]);
        items.forEach(function (item) {
            var key = String(item[keyName] || "");
            if (key) { values.set(key, item[textName] || key); }
        });
        return Array.from(values.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; });
    }
    function filterResources(resource, filters, selectedRange) {
        return resource && inRange(asDate(resource.WorkDate), selectedRange) &&
            (norm(filters.zona) === "TODAS" || simple(resource.ZoneId || resource.ZoneName) === simple(filters.zona)) &&
            (norm(filters.supervisor) === "TODOS" || norm(resource.SupervisorId) === norm(filters.supervisor)) &&
            (norm(filters.turno) === "TODOS" || norm(resource.ShiftId) === norm(filters.turno)) &&
            (norm(filters.mecanico) === "TODOS" || norm(resource.ResourceId) === norm(filters.mecanico) || norm(resource.PersonnelNumber) === norm(filters.mecanico));
    }
    function hasResourceFilter(filters) {
        return norm(filters.zona) !== "TODAS" || norm(filters.supervisor) !== "TODOS" ||
            norm(filters.turno) !== "TODOS" || norm(filters.mecanico) !== "TODOS";
    }
    function summarizeResources(resources, selectedRange) {
        var byId = new Map();
        resources.forEach(function (resource) {
            var id = String(resource.ResourceId || resource.PersonnelNumber || "");
            var item;
            var resourceDate;
            if (!id) { return; }
            item = byId.get(id) || { id: id, resource: resource, capacity: 0 };
            resourceDate = asDate(resource.WorkDate) || new Date(0);
            /* La capacidad es diaria, por eso se suma cada día; la OT se asigna una sola vez por recurso. */
            if (validFlag(resource.CapacitySourceValidated)) { item.capacity += number(resource.CapacityHours); }
            if (!item.resource || resourceDate > (asDate(item.resource.WorkDate) || new Date(0)) ||
                (resourceDate <= selectedRange.endDate && (asDate(item.resource.WorkDate) || new Date(0)) > selectedRange.endDate)) {
                item.resource = resource;
            }
            byId.set(id, item);
        });
        return Array.from(byId.values());
    }
    function build(raw, inputFilters) {
        var filters = Object.assign({ periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "TODAS", supervisor: "TODOS", tipoOrden: "TODOS", turno: "TODOS", mecanico: "TODOS", estadoOrden: "TODOS" }, inputFilters || {});
        var selectedRange = range(filters);
        var maps = resourceMaps(raw, selectedRange.endDate);
        var timeCauses = mainTimeCauses(raw.causes, selectedRange.endDate);
        var orders = list(raw.orders).filter(function (order) {
            return order && OFFICIAL_ORDER_TYPES.indexOf(norm(order.OrderTypeCode)) >= 0 && inRange(asDate(order.PlannedStartDate), selectedRange) &&
                (norm(filters.tipoOrden) === "TODOS" || norm(order.OrderTypeCode) === norm(filters.tipoOrden)) &&
                (norm(filters.estadoOrden) === "TODOS" || norm(order.AppStatusCode) === norm(filters.estadoOrden) || norm(order.SapUserStatusCode) === norm(filters.estadoOrden));
        });
        var orderIds = new Set(orders.map(function (order) { return String(order.OrderId); }));
        var orderById = new Map(orders.map(function (order) { return [String(order.OrderId), order]; }));
        var plannedByOrder = new Map();
        var plannedByType = new Map();
        var plannedByResource = new Map();
        var operations = new Map();
        var actualByOrder = new Map();
        var actualByType = new Map();
        var actualByResource = new Map();
        var periodResources = list(raw.resources).filter(function (resource) { return resource && inRange(asDate(resource.WorkDate), selectedRange); });
        var filteredResources = periodResources.filter(function (resource) { return filterResources(resource, filters, selectedRange); });
        var resourceSummary = summarizeResources(filteredResources, selectedRange);
        var capacity = resourceSummary.reduce(function (sum, item) { return sum + item.capacity; }, 0);
        var capacityValidated = resourceSummary.some(function (item) { return item.capacity > 0; });
        var resourceFilterActive = hasResourceFilter(filters);

        list(raw.operations).filter(function (operation) { return operation && orderIds.has(String(operation.OrderId)); }).forEach(function (operation) {
            var id = operationId(operation);
            if (!id || operations.has(id)) { return; }
            operations.set(id, operation);
            var hours = toHours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal);
            var order = orderById.get(String(operation.OrderId));
            var assignment = maps.assignmentByOperation.get(assignmentId(operation)) || maps.assignmentByOrder.get(String(operation.OrderId));
            var resource = assignment && maps.byId.get(String(assignment.ResourceId));
            if (resourceFilterActive && (!resource || !filterResources(resource, filters, selectedRange))) { return; }
            add(plannedByOrder, String(operation.OrderId), hours);
            add(plannedByType, norm(order && order.OrderTypeCode), hours);
            if (resource) { add(plannedByResource, String(resource.ResourceId), hours); }
        });

        list(raw.confirmations).filter(function (confirmation) { return confirmation && orderIds.has(String(confirmation.OrderId)) && isIncludedConfirmation(confirmation); }).forEach(function (confirmation) {
            var hours = toHours(confirmation.ActualValueOriginal, confirmation.ActualUnitOriginal);
            var order = orderById.get(String(confirmation.OrderId));
            var resource = maps.byPersonnel.get(String(confirmation.ExecutorPersonnelNumber || ""));
            if (resourceFilterActive && (!resource || !filterResources(resource, filters, selectedRange))) { return; }
            add(actualByOrder, String(confirmation.OrderId), hours);
            add(actualByType, norm(order && order.OrderTypeCode), hours);
            if (resource) { add(actualByResource, String(resource.ResourceId), hours); }
        });

        var planned = Array.from(plannedByOrder.values()).reduce(function (sum, value) { return sum + value; }, 0);
        var actual = Array.from(actualByOrder.values()).reduce(function (sum, value) { return sum + value; }, 0);
        var committed = capacityValidated && capacity > 0 ? round(planned / capacity * 100) : null;
        var margin = capacityValidated ? round(capacity - planned) : null;
        var turnValidation = resourceSummary.length > 0 && resourceSummary.every(function (item) { return validFlag(item.resource.ShiftSourceValidated); });
        var utilizationByTurn = new Map();
        if (turnValidation) {
            resourceSummary.forEach(function (summary) {
                var resource = summary.resource;
                var turn = String(resource.ShiftId || resource.ShiftName || "Sin turno");
                var item = utilizationByTurn.get(turn) || { turno: resource.ShiftName || resource.ShiftId || "Sin turno", capacity: 0, planned: 0 };
                item.capacity += summary.capacity;
                item.planned += plannedByResource.get(String(resource.ResourceId)) || 0;
                utilizationByTurn.set(turn, item);
            });
        }
        var utilizationRows = Array.from(utilizationByTurn.values()).map(function (item) {
            var utilization = item.capacity ? round(item.planned / item.capacity * 100) : null;
            return { turno: item.turno, valor: utilization || 0, valorTexto: percentageText(utilization), estado: utilization > 100 ? "Error" : utilization >= 90 ? "Warning" : "Success" };
        });
        var typeRows = OFFICIAL_ORDER_TYPES.map(function (type) {
            var order = orders.filter(function (item) { return norm(item.OrderTypeCode) === type; })[0];
            var plan = plannedByType.get(type) || 0;
            var real = actualByType.get(type) || 0;
            var variation = round(real - plan);
            return { tipo: type, texto: order && order.OrderTypeText || type, plan: round(plan), real: round(real), variacion: variation, porcentaje: plan ? round(variation / plan * 100) : null };
        });
        var zoneRows = new Map();
        resourceSummary.forEach(function (summary) {
            var resource = summary.resource;
            var zone = String(resource.ZoneName || resource.ZoneId || "Sin zona");
            var item = zoneRows.get(zone) || { zona: zone, capacity: 0, planned: 0 };
            item.capacity += summary.capacity;
            item.planned += plannedByResource.get(String(resource.ResourceId)) || 0;
            zoneRows.set(zone, item);
        });
        var zoneData = Array.from(zoneRows.values()).map(function (item) { return { zona: item.zona, capacidad: round(item.capacity), programado: round(item.planned), utilizacion: item.capacity ? round(item.planned / item.capacity * 100) : null }; });
        var causes = new Map();
        orders.forEach(function (order) {
            var deviation = Math.max((actualByOrder.get(String(order.OrderId)) || 0) - (plannedByOrder.get(String(order.OrderId)) || 0), 0);
            var cause = timeCauses.get(String(order.OrderId));
            if (!deviation || !cause) { return; }
            var name = cause.CauseText || cause.CauseCode || "Sin causa registrada";
            causes.set(name, (causes.get(name) || 0) + deviation);
        });
        var totalExtra = Array.from(causes.values()).reduce(function (sum, value) { return sum + value; }, 0);
        var causeRows = Array.from(causes.entries()).map(function (entry) {
            var percentage = totalExtra ? round(entry[1] / totalExtra * 100) : 0;
            return { causa: entry[0], horasTexto: signedHours(entry[1]), porcentaje: percentage, porcentajeTexto: percentage.toFixed(1) + "%" };
        }).sort(function (a, b) { return b.porcentaje - a.porcentaje || a.causa.localeCompare(b.causa, "es"); });
        var remaining = Math.max(planned - actual, 0);
        var projected = actual + remaining;
        var projectedUse = capacityValidated && capacity > 0 ? round(projected / capacity * 100) : null;
        var risk = projectedUse === null ? "Sin datos" : projectedUse > 100 ? "Alto" : projectedUse >= 90 ? "Medio" : "Bajo";

        return {
            filtros: { periodo: filters.periodo, fechaDesde: dateText(selectedRange.startDate), fechaHasta: dateText(selectedRange.endDate), zona: filters.zona, supervisor: filters.supervisor, tipoOrden: filters.tipoOrden, turno: filters.turno, mecanico: filters.mecanico, estadoOrden: filters.estadoOrden },
            opciones: {
                periodos: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
                zonas: selectOptions(periodResources, "ZoneId", "ZoneName", "TODAS", "Todas"),
                supervisores: selectOptions(periodResources, "SupervisorId", "SupervisorName", "TODOS", "Todos"),
                tiposOrden: [{ key: "TODOS", text: "Todos" }].concat(OFFICIAL_ORDER_TYPES.map(function (type) { return { key: type, text: typeRows.filter(function (row) { return row.tipo === type; })[0].texto }; })),
                turnos: selectOptions(periodResources.filter(function (resource) { return validFlag(resource.ShiftSourceValidated); }), "ShiftId", "ShiftName", "TODOS", "Todos"),
                mecanicos: selectOptions(periodResources, "ResourceId", "ResourceName", "TODOS", "Todos"),
                estados: [{ key: "TODOS", text: "Todos" }, { key: "0100", text: "Pendiente" }, { key: "0200", text: "En proceso" }, { key: "0300", text: "Finalizada" }, { key: "0400", text: "Pendiente de firma" }]
            },
            kpis: {
                capacidadComprometida: percentageText(committed), capacidadComprometidaValor: committed || 0,
                margenCapacidad: margin === null ? "Sin datos" : signedHours(margin), margenCapacidadValor: margin === null || capacity <= 0 ? 0 : Math.max(0, Math.min(100, round(margin / capacity * 100))),
                totalHorasExtra: signedHours(totalExtra), utilizacionProyectada: percentageText(projectedUse),
                capacidadDisponible: capacityValidated ? formatHours(capacity) : "Sin datos", horasProgramadas: formatHours(planned), horasReales: formatHours(actual)
            },
            graficas: { utilizacionResumen: utilizationRows, causasDesviacion: causeRows, horasPorTipoOrden: typeRows, capacidadPorZona: zoneData },
            proyeccion: { utilizacion: percentageText(projectedUse), horasReales: formatHours(actual), horasRestantes: formatHours(remaining), horasProyectadas: formatHours(projected), brecha: signedHours(capacityValidated ? capacity - projected : 0), riesgo: risk, fechaCorte: dateText(selectedRange.endDate) },
            avisos: { turno: turnValidation ? "" : "La fuente de turno no está validada; no se muestran resultados oficiales por turno.", capacidad: capacityValidated ? "" : "No hay capacidad validada para los filtros seleccionados." },
            meta: { source: "BTP_DESTINATION_ODATA_V2", startDate: selectedRange.startDate, endDate: selectedRange.endDate, orders: orders.length }
        };
    }

    return { build: build, range: range };
});
