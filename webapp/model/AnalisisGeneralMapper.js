sap.ui.define([], function () {
    "use strict";

    var OFFICIAL_ORDER_TYPES = ["SM01", "SM02", "SM03"];
    var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    function list(value) { return Array.isArray(value) ? value : []; }
    function norm(value) { return String(value || "").trim().toUpperCase(); }
    function simple(value) {
        var text = norm(value);
        return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
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
    function active(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
    function isoWeekStart(year, week) {
        var january4 = new Date(year, 0, 4);
        var weekday = january4.getDay() || 7;
        return new Date(year, 0, 4 - weekday + 1 + (week - 1) * 7);
    }
    function weekCount(year) {
        return Math.round((isoWeekStart(year + 1, 1) - isoWeekStart(year, 1)) / 604800000);
    }
    function formatDate(date) {
        return String(date.getDate()).padStart(2, "0") + " " + MONTHS[date.getMonth()];
    }
    function period(key) {
        var match = String(key || "").match(/^(\d{4})-W(\d{2})$/);
        var year = match ? Number(match[1]) : 2026;
        var week = match ? Number(match[2]) : 26;
        var start = isoWeekStart(year, week);
        return {
            startDate: start,
            endDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59),
            key: year + "-W" + String(week).padStart(2, "0"),
            week: "S" + week
        };
    }
    function weekOptions() {
        var options = [];
        var year;
        var week;
        var item;
        for (year = 2026; year >= 2024; year -= 1) {
            for (week = 1; week <= weekCount(year); week += 1) {
                item = period(year + "-W" + String(week).padStart(2, "0"));
                options.push({
                    key: item.key,
                    text: item.week + " (" + formatDate(item.startDate) + " - " + formatDate(item.endDate) + " " + year + ")"
                });
            }
        }
        return options;
    }
    function status(order) {
        var sap = norm(order && order.SapUserStatusCode);
        var app = norm(order && order.AppStatusCode);
        var appToSap = { "0100": "E0013", "0200": "E0014", "0300": "E0015" };
        return /^E00\d{2}$/.test(sap) ? sap : appToSap[app] || "";
    }
    function isExecuted(order) {
        return status(order) === "E0015" || norm(order && order.AppStatusCode) === "0300";
    }
    function isInPeriod(order, selectedPeriod) {
        var date = asDate(order && order.PlannedStartDate);
        return !!date && date >= selectedPeriod.startDate && date <= selectedPeriod.endDate;
    }
    function activeRecord(record, cutOff) {
        var validFrom = asDate(record && record.ValidFrom);
        var validTo = asDate(record && record.ValidTo);
        return (!validFrom || validFrom <= cutOff) && (!validTo || validTo >= cutOff);
    }
    function assignmentRank(item) {
        return (norm(item && item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) +
            (["LEAD_MECHANIC", "RESPONSIBLE"].indexOf(norm(item && item.RoleCode)) >= 0 ? 0 : 1);
    }
    function resourceContext(raw, cutOff) {
        var resources = new Map();
        var assignments = new Map();
        list(raw.resources).forEach(function (resource) {
            var resourceId = String(resource && resource.ResourceId || "");
            var old;
            if (!resourceId) { return; }
            old = resources.get(resourceId);
            if (!old || Math.abs((asDate(resource.WorkDate) || new Date(0)) - cutOff) < Math.abs((asDate(old.WorkDate) || new Date(0)) - cutOff)) {
                resources.set(resourceId, resource);
            }
        });
        list(raw.assignments).filter(function (assignment) {
            return assignment && assignment.OrderId && assignment.ResourceId && activeRecord(assignment, cutOff);
        }).forEach(function (assignment) {
            var id = String(assignment.OrderId);
            var old = assignments.get(id);
            if (!old || assignmentRank(assignment) < assignmentRank(old)) { assignments.set(id, assignment); }
        });
        return { resources: resources, assignments: assignments };
    }
    function mainCauses(causes, cutOff) {
        var result = new Map();
        list(causes).filter(function (cause) {
            return cause && cause.OrderId && activeRecord(cause, cutOff) &&
                (!cause.CauseContextCode || norm(cause.CauseContextCode) === "NON_EXECUTION");
        }).forEach(function (cause) {
            var id = String(cause.OrderId);
            var old = result.get(id);
            var rank = (active(cause.IsPrimary) ? 10 : 0) + (cause.CauseText || cause.CauseCode ? 1 : 0);
            var oldRank = old ? (active(old.IsPrimary) ? 10 : 0) + (old.CauseText || old.CauseCode ? 1 : 0) : -1;
            if (!old || rank > oldRank) { result.set(id, cause); }
        });
        return result;
    }
    function resolveOrderContext(order, context) {
        var assignment = context.assignments.get(String(order && order.OrderId));
        var resource = assignment && context.resources.get(String(assignment.ResourceId));
        return {
            zone: resource && (resource.ZoneName || resource.ZoneId) || order && order.Zona || "Sin zona",
            responsible: resource && (resource.ResourceName || resource.PersonnelName) ||
                assignment && (assignment.PersonnelNumber || assignment.ResourceId) ||
                order && (order.SupervisorId || order.Mecanico) || "Sin responsable"
        };
    }
    function zoneOptions(raw) {
        var zones = new Map([["TODAS", "Todas"]]);
        list(raw.catalogs).filter(function (item) {
            return norm(item && item.FilterDomain) === "ZONE" && item.Active !== false;
        }).forEach(function (item) { zones.set(norm(item.ValueId), item.ValueText || item.ValueId); });
        list(raw.resources).forEach(function (resource) {
            var id = norm(resource && (resource.ZoneId || resource.ZoneName));
            if (id) { zones.set(id, resource.ZoneName || resource.ZoneId); }
        });
        list(raw.orders).forEach(function (order) {
            var id = norm(order && order.Zona);
            if (id) { zones.set(id, order.Zona); }
        });
        return Array.from(zones.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; });
    }
    function topConcentration(rows, property, total) {
        var counts = new Map();
        rows.forEach(function (row) {
            var value = String(row[property] || "Sin dato");
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        var top = Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], "es"); }).slice(0, 2);
        var count = top.reduce(function (sum, entry) { return sum + entry[1]; }, 0);
        return { count: top.length, percentage: total ? Number((count / total * 100).toFixed(1)) : 0, labels: top.map(function (entry) { return entry[0]; }) };
    }
    function provisionalPriority(order, cause) {
        if (norm(order && order.AppStatusCode) === "0100" && cause && active(cause.IsPrimary)) { return "ALTA"; }
        if (norm(order && order.AppStatusCode) === "0100") { return "MEDIA"; }
        return "BAJA";
    }
    function build(raw, filters) {
        var values = Object.assign({ week: "2026-W26", zone: "TODAS" }, filters || {});
        var selectedPeriod = period(values.week);
        var context = resourceContext(raw, selectedPeriod.endDate);
        var causes = mainCauses(raw.causes, selectedPeriod.endDate);
        var orders = list(raw.orders).filter(function (order) {
            var orderContext = resolveOrderContext(order, context);
            return order && OFFICIAL_ORDER_TYPES.indexOf(norm(order.OrderTypeCode)) >= 0 &&
                isInPeriod(order, selectedPeriod) &&
                (norm(values.zone) === "TODAS" || simple(orderContext.zone) === simple(values.zone));
        });
        var executed = orders.filter(isExecuted);
        var notExecuted = orders.filter(function (order) { return !isExecuted(order); });
        var contribution = notExecuted.length ? Number((100 / notExecuted.length).toFixed(1)) : 0;
        var rows = notExecuted.map(function (order, index) {
            var orderContext = resolveOrderContext(order, context);
            var cause = causes.get(String(order.OrderId));
            return {
                prioridad: provisionalPriority(order, cause),
                ot: String(order.OrderId || "--"),
                cliente: order.CustomerName || order.CustomerId || "Sin cliente",
                zona: orderContext.zone,
                elevador: order.EquipmentName || order.EquipmentId || "Sin elevador",
                causa: cause && (cause.CauseText || cause.CauseCode) || "Sin causa registrada",
                responsable: orderContext.responsible,
                estado: order.StatusText || "No ejecutada",
                contribucion: contribution,
                showFilterIcon: index < 2
            };
        }).sort(function (a, b) { return b.contribucion - a.contribucion || a.ot.localeCompare(b.ot); });
        var clients = topConcentration(rows, "cliente", notExecuted.length);
        var elevators = topConcentration(rows, "elevador", notExecuted.length);
        var zones = topConcentration(rows, "zona", notExecuted.length);
        var compliance = orders.length ? Number((executed.length / orders.length * 100).toFixed(1)) : 0;
        return {
            filters: { week: selectedPeriod.key, zone: norm(values.zone) || "TODAS", search: "" },
            weekOptions: weekOptions(),
            zoneOptions: zoneOptions(raw),
            summary: {
                plannedOrders: orders.length,
                executedOrders: executed.length,
                notExecutedOrders: notExecuted.length,
                compliance: compliance,
                executedDescription: compliance.toFixed(1) + "% del total",
                notExecutedDescription: orders.length ? (100 - compliance).toFixed(1) + "% del total" : "Sin órdenes",
                clientsCount: clients.count,
                clientsImpact: clients.percentage,
                elevatorsCount: elevators.count,
                elevatorsImpact: elevators.percentage,
                zonesLabel: zones.labels.join(" y ") || "Sin zona",
                zonesImpact: zones.percentage
            },
            results: rows,
            pagination: { currentPage: 1, pageSize: 10, totalPages: 1, totalResults: rows.length, from: 0, to: 0, canGoPrevious: false, canGoNext: false, summaryText: "Mostrando 0 a 0 de " + rows.length + " resultados" },
            meta: { source: "BTP_DESTINATION_ODATA_V2", startDate: selectedPeriod.startDate, endDate: selectedPeriod.endDate, orders: orders.length }
        };
    }

    return { build: build, period: period };
});
