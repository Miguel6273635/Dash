sap.ui.define([], function () {
    "use strict";

    var TYPES = ["SM01", "SM02", "SM03"];
    var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    function list(value) { return Array.isArray(value) ? value : []; }
    function norm(value) { return String(value || "").trim().toUpperCase(); }
    function simple(value) {
        var text = norm(value);
        return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
    }
    function active(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
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
    function isoWeekStart(year, week) {
        var january4 = new Date(year, 0, 4);
        var weekday = january4.getDay() || 7;
        return new Date(year, 0, 4 - weekday + 1 + (week - 1) * 7);
    }
    function isoWeek(date) {
        var local = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        var weekday = local.getDay() || 7;
        local.setDate(local.getDate() + 4 - weekday);
        var yearStart = new Date(local.getFullYear(), 0, 1);
        return { year: local.getFullYear(), week: Math.ceil((((local - yearStart) / 86400000) + 1) / 7) };
    }
    function labelDate(date) {
        return String(date.getDate()).padStart(2, "0") + " " + MONTHS[date.getMonth()] + " - " +
            String(date.getDate() + 6 > new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate() ?
                new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6).getDate() : date.getDate() + 6).padStart(2, "0") +
            " " + MONTHS[new Date(date.getFullYear(), date.getMonth(), date.getDate() + 6).getMonth()];
    }
    function lastWeekWindow(year) {
        return { startDate: isoWeekStart(year, 49), endDate: new Date(isoWeekStart(year, 53).getFullYear(), isoWeekStart(year, 53).getMonth(), isoWeekStart(year, 53).getDate() + 6, 23, 59, 59) };
    }
    function filterPeriod(key) {
        var match = String(key || "").match(/^(\d{4})-W(\d{2})$/);
        var annual = String(key || "").match(/^(\d{4})-ANUAL$/);
        var lastFive = String(key || "").match(/^(\d{4})-ULT5$/);
        var monthly = String(key || "").match(/^(\d{4})-(\d{2})$/);
        var start;
        if (match) {
            start = isoWeekStart(Number(match[1]), Number(match[2]) - 4);
            return { startDate: start, endDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 34, 23, 59, 59) };
        }
        if (annual) {
            return { startDate: new Date(Number(annual[1]), 0, 1), endDate: new Date(Number(annual[1]), 11, 31, 23, 59, 59) };
        }
        if (monthly && Number(monthly[2]) >= 1 && Number(monthly[2]) <= 12) {
            return {
                startDate: new Date(Number(monthly[1]), Number(monthly[2]) - 1, 1),
                endDate: new Date(Number(monthly[1]), Number(monthly[2]), 0, 23, 59, 59)
            };
        }
        if (lastFive) { return lastWeekWindow(Number(lastFive[1])); }
        return lastWeekWindow(2026);
    }
    function periodOptions() {
        var now = new Date();
        var previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        var result = [
            {
                key: previous.getFullYear() + "-" + String(previous.getMonth() + 1).padStart(2, "0"),
                text: MONTHS[previous.getMonth()] + " " + previous.getFullYear() + " (Mensual)"
            },
            { key: "2026-ANUAL", text: "2026 (Anual)" }
        ];
        var year;
        var week;
        var max;
        /* El año seleccionado por defecto aparece primero: semanas 1 a 53. */
        for (year = 2026; year >= 2024; year -= 1) {
            max = Math.round((isoWeekStart(year + 1, 1) - isoWeekStart(year, 1)) / 604800000);
            for (week = 1; week <= max; week += 1) {
                result.push({ key: year + "-W" + String(week).padStart(2, "0"), text: "Semana " + week + " de " + year });
            }
            if (year === 2026) {
                result.push({ key: "2026-ULT5", text: "Últimas 5 semanas de 2026" });
            }
            if (year > 2024) {
                result.push({ key: (year - 1) + "-ANUAL", text: (year - 1) + " (Anual)" });
            }
        }
        return result;
    }
    function status(order) {
        var sap = norm(order && order.SapUserStatusCode);
        var app = norm(order && order.AppStatusCode);
        var map = { "0100": "E0013", "0200": "E0014", "0300": "E0015" };
        return /^E00\d{2}$/.test(sap) ? sap : map[sap] || map[app] || "";
    }
    function executed(order) { return status(order) === "E0015" || norm(order && order.AppStatusCode) === "0300"; }
    function deviated(order) { return ["E0013", "E0014"].indexOf(status(order)) >= 0 || ["0100", "0200"].indexOf(norm(order && order.AppStatusCode)) >= 0; }
    function inRange(order, start, end) {
        var date = asDate(order && order.PlannedStartDate);
        return !!date && date >= start && date <= end;
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
    function orderZones(raw, cutOff) {
        var resources = new Map();
        var assignments = new Map();
        list(raw.resources).forEach(function (resource) {
            var id = String(resource && resource.ResourceId || "");
            if (!id) { return; }
            var old = resources.get(id);
            if (!old || Math.abs((asDate(resource.WorkDate) || new Date(0)) - cutOff) < Math.abs((asDate(old.WorkDate) || new Date(0)) - cutOff)) {
                resources.set(id, resource);
            }
        });
        list(raw.assignments).filter(function (assignment) {
            return assignment && assignment.OrderId && assignment.ResourceId && activeRecord(assignment, cutOff);
        }).forEach(function (assignment) {
            var id = String(assignment.OrderId);
            var old = assignments.get(id);
            if (!old || assignmentRank(assignment) < assignmentRank(old)) { assignments.set(id, assignment); }
        });
        return { assignments: assignments, resources: resources };
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
    function zoneOptions(raw) {
        var zones = new Map([["TODAS", "Todas"]]);
        list(raw.catalogs).filter(function (item) { return norm(item && item.FilterDomain) === "ZONE" && item.Active !== false; }).forEach(function (item) {
            zones.set(norm(item.ValueId), item.ValueText || item.ValueId);
        });
        list(raw.resources).forEach(function (resource) {
            var key = norm(resource && (resource.ZoneId || resource.ZoneName));
            if (key) { zones.set(key, resource.ZoneName || resource.ZoneId); }
        });
        return Array.from(zones.entries()).map(function (item) { return { key: item[0], text: item[1] }; });
    }
    function weeksInRange(start, end) {
        var cursor = isoWeekStart(isoWeek(start).year, isoWeek(start).week);
        var result = [];
        var index = 0;
        while (cursor <= end && result.length < 5) {
            var week = isoWeek(cursor);
            result.push({
                key: week.year + "-W" + String(week.week).padStart(2, "0"),
                week: "S" + week.week,
                start: new Date(cursor),
                end: new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 6, 23, 59, 59),
                index: index
            });
            cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
            index += 1;
        }
        return result;
    }
    function heat(value, max) {
        if (!value) { return "neutral"; }
        if (value / Math.max(max, 1) >= 0.75) { return "critical"; }
        if (value / Math.max(max, 1) >= 0.5) { return "high"; }
        if (value / Math.max(max, 1) >= 0.25) { return "medium"; }
        return "low";
    }
    function labelForWeek(item) { return item.week + " (" + labelDate(item.start) + ")"; }
    function build(raw, filters) {
        var values = Object.assign({ period: "2026-ANUAL", zona: "TODAS" }, filters || {});
        var range = filterPeriod(values.period);
        var weekData = weeksInRange(range.startDate, range.endDate);
        var zoneData = orderZones(raw, range.endDate);
        var causeMap = mainCauses(raw.causes, range.endDate);
        var buckets = new Map(weekData.map(function (week) { return [week.key, { week: week, planned: new Map(), executed: new Map(), deviations: new Map() }]; }));
        var filtered = list(raw.orders).filter(function (order) {
            var assignment = zoneData.assignments.get(String(order && order.OrderId));
            var resource = assignment && zoneData.resources.get(String(assignment.ResourceId));
            var zone = resource && (resource.ZoneId || resource.ZoneName) || order && order.Zona;
            return order && TYPES.indexOf(norm(order.OrderTypeCode)) >= 0 && inRange(order, range.startDate, range.endDate) &&
                (norm(values.zona) === "TODAS" || simple(zone) === simple(values.zona));
        });
        filtered.forEach(function (order) {
            var weekly = isoWeek(asDate(order.PlannedStartDate));
            var bucket = buckets.get(weekly.year + "-W" + String(weekly.week).padStart(2, "0"));
            if (!bucket) { return; }
            bucket.planned.set(String(order.OrderId), order);
            if (executed(order)) { bucket.executed.set(String(order.OrderId), order); }
            if (deviated(order)) { bucket.deviations.set(String(order.OrderId), order); }
        });
        var evolution = weekData.map(function (week) {
            var bucket = buckets.get(week.key);
            var planned = bucket.planned.size;
            var done = bucket.executed.size;
            var compliance = planned ? done / planned * 100 : 0;
            return { semana: week.week, fecha: labelDate(week.start), otPlaneadas: planned, otEjecutadas: done, brecha: done - planned, cumplimiento: Number(compliance.toFixed(1)) };
        });
        var comparableWeeks = evolution.filter(function (week) { return week.otPlaneadas > 0; });
        var best = comparableWeeks.slice().sort(function (a, b) { return b.cumplimiento - a.cumplimiento || b.otEjecutadas - a.otEjecutadas; })[0] || evolution[0] || { semana: "--", cumplimiento: 0, brecha: 0 };
        var worst = comparableWeeks.slice().sort(function (a, b) { return a.cumplimiento - b.cumplimiento || a.otEjecutadas - b.otEjecutadas; })[0] || evolution[0] || { semana: "--", cumplimiento: 0, brecha: 0 };
        var causeRows = new Map();
        evolution.forEach(function (week, index) {
            var bucket = buckets.get(weekData[index].key);
            Array.from(bucket.deviations.values()).forEach(function (order) {
                var cause = causeMap.get(String(order.OrderId));
                var name = cause && (cause.CauseText || cause.CauseCode) || "Sin causa registrada";
                var row = causeRows.get(name) || { causa: name, values: [0, 0, 0, 0, 0] };
                row.values[index] += 1;
                causeRows.set(name, row);
            });
        });
        var bestIndex = evolution.indexOf(best);
        var worstIndex = evolution.indexOf(worst);
        var causes = Array.from(causeRows.values()).map(function (row) {
            row.increment = (row.values[worstIndex] || 0) - (row.values[bestIndex] || 0);
            return row;
        }).sort(function (a, b) { return b.increment - a.increment || b.values[worstIndex] - a.values[worstIndex] || a.causa.localeCompare(b.causa, "es"); });
        var positiveTotal = causes.reduce(function (sum, row) { return sum + Math.max(0, row.increment); }, 0);
        var dropRows = causes.filter(function (row) { return row.increment > 0; }).map(function (row) {
            var percent = positiveTotal ? row.increment / positiveTotal * 100 : 0;
            return { causa: row.causa, incremento: "+" + row.increment, porcentajeValor: Number(percent.toFixed(1)), porcentajeTexto: percent.toFixed(0) + "%", estado: percent >= 50 ? "Error" : "Warning", tono: percent >= 50 ? "red" : "orange" };
        });
        var maxCauseValue = Math.max.apply(Math, [1].concat(causes.reduce(function (all, row) { return all.concat(row.values); }, [])));
        var heatRows = causes.map(function (row) {
            var item = { causa: row.causa, rowtype: "detail", variacion: (row.increment > 0 ? "+" : "") + row.increment, estadoVariacion: row.increment > 0 ? "Error" : row.increment < 0 ? "Success" : "None" };
            row.values.forEach(function (value, index) { item["week" + (index + 1)] = value; item["heat" + (index + 1)] = heat(value, maxCauseValue); });
            return item;
        });
        var totals = { causa: "Total OT no ejecutadas", rowtype: "total", variacion: "", estadoVariacion: "None" };
        evolution.forEach(function (week, index) { totals["week" + (index + 1)] = buckets.get(weekData[index].key).deviations.size; totals["heat" + (index + 1)] = "total"; });
        heatRows.push(totals);
        var selected = periodOptions().filter(function (option) { return option.key === values.period; })[0];

        return {
            filtros: { periodo: values.period, zona: values.zona, periodoTexto: selected ? selected.text : values.period },
            opcionesPeriodo: periodOptions(),
            opcionesZona: zoneOptions(raw),
            contexto: {
                peorSemana: worst.semana || "--",
                peorSemanaDetalle: worst.otPlaneadas ? worst.cumplimiento.toFixed(1) + "% de cumplimiento" : "Sin órdenes planeadas",
                mayorBrecha: String(worst.brecha || 0) + " OT",
                mayorBrechaDetalle: "En la semana " + (worst.semana || "--"),
                principalImpulsor: dropRows[0] ? dropRows[0].causa : "Sin datos",
                impulsorOT: dropRows[0] ? dropRows[0].incremento + " OT" : "--",
                impulsorPorcentaje: dropRows[0] ? dropRows[0].porcentajeTexto : "--",
                impulsorDetalle: "del deterioro"
            },
            evolucionSemanal: evolution,
            cabecerasSemana: weekData.map(function (week) { return { semana: week.week, fecha: labelDate(week.start) }; }),
            caidaCumplimiento: dropRows,
            totalCaida: { incremento: "+" + positiveTotal },
            evolucionCausas: heatRows,
            meta: { source: "BTP_DESTINATION_ODATA_V2", orders: filtered.length, startDate: range.startDate, endDate: range.endDate }
        };
    }

    return { build: build, period: filterPeriod };
});
