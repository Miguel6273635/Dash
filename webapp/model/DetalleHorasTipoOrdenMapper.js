sap.ui.define([], function () {
    "use strict";

    var TYPES = ["SM01", "SM02", "SM03"];
    var DEFAULTS = { periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "TODOS", supervisor: "TODOS", turno: "TODOS", tipoOrden: "SM01", estado: "TODOS" };
    function list(v) { return Array.isArray(v) ? v : []; }
    function norm(v) { return String(v || "").trim().toUpperCase(); }
    function flat(v) { var x = norm(v); return x.normalize ? x.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : x; }
    function num(v) { var x = Number(String(v === null || v === undefined ? 0 : v).replace(",", ".")); return Number.isFinite(x) ? x : 0; }
    function yes(v) { return v === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(v)) >= 0; }
    function dt(v) { var m, d; if (!v) { return null; } if (v instanceof Date) { return new Date(v.getTime()); } m = String(v).match(/\/Date\((-?\d+)/); d = m ? new Date(Number(m[1])) : new Date(v); if (Number.isNaN(d.getTime())) { return null; } return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d; }
    function parse(v, fallback) { var p = String(v || "").split("/"); var d; if (p.length === 3) { d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0])); if (!Number.isNaN(d.getTime())) { return d; } } return new Date(fallback.getTime()); }
    function range(input) { var f = Object.assign({}, DEFAULTS, input || {}); var start = parse(f.fechaDesde, new Date(2026, 0, 1)); var end = parse(f.fechaHasta, new Date(2026, 11, 31)); end.setHours(23, 59, 59, 999); return { filters: f, start: start, end: end }; }
    function between(v, start, end) { var d = dt(v); return !!d && d >= start && d <= end; }
    function dmy(d) { return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear(); }
    function toHours(v, unit) { var u = norm(unit), n = num(v); if (["H", "HR", "HRA", "HOUR", "HOURS", "HORAS"].indexOf(u) >= 0) { return n; } if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(u) >= 0) { return n / 60; } if (["S", "SEC", "SECOND", "SECONDS"].indexOf(u) >= 0) { return n / 3600; } return 0; }
    function round(v, p) { var x = Math.pow(10, p === undefined ? 1 : p); return Math.round((Number(v) || 0) * x) / x; }
    function hours(v, sign) { return (sign ? (v >= 0 ? "+" : "-") : "") + round(Math.abs(v), 1).toLocaleString("es-MX", { maximumFractionDigits: 1 }) + " h"; }
    function pct(v) { return v === null ? "Sin datos" : round(v, 1).toFixed(1) + "%"; }
    function ratio(a, b) { return b > 0 ? round(a / b * 100) : null; }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function operationKey(o) { return String(o.OperationKey || [o.OrderId, o.RoutingNumber, o.OperationCounter].join("|")); }
    function assignmentKey(o) { return [o.OrderId, o.RoutingNumber, o.OperationCounter].join("|"); }
    function active(a, end) { var from = dt(a && a.ValidFrom), to = dt(a && a.ValidTo); return (!from || from <= end) && (!to || to >= end); }
    function rank(a) { return (norm(a && a.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (norm(a && a.RoleCode) === "LEAD_MECHANIC" ? 0 : 1); }
    function refMaps(resources, assignments, end) {
        var byId = new Map(), exact = new Map(), byOrder = new Map(), byOrderCounter = new Map(), byOrderPersonnel = new Map();
        resources.forEach(function (r) { var id = String(r.ResourceId || ""), old = byId.get(id); if (id && (!old || (dt(r.WorkDate) || new Date(0)) > (dt(old.WorkDate) || new Date(0)))) { byId.set(id, r); } });
        list(assignments).filter(function (a) { return a && a.OrderId && a.ResourceId && active(a, end); }).forEach(function (a) {
            var op = assignmentKey(a), order = String(a.OrderId), counter = order + "|" + String(a.OperationCounter || ""), personnel = order + "|" + String(a.PersonnelNumber || ""), old = exact.get(op);
            if (!old || rank(a) < rank(old)) { exact.set(op, a); }
            old = byOrderCounter.get(counter);
            if (a.OperationCounter !== undefined && a.OperationCounter !== null && a.OperationCounter !== "" && (!old || rank(a) < rank(old))) { byOrderCounter.set(counter, a); }
            old = byOrderPersonnel.get(personnel);
            if (a.PersonnelNumber && (!old || rank(a) < rank(old))) { byOrderPersonnel.set(personnel, a); }
            old = byOrder.get(order);
            if (!old || rank(a) < rank(old)) { byOrder.set(order, a); }
        });
        return { byId: byId, exact: exact, byOrder: byOrder, byOrderCounter: byOrderCounter, byOrderPersonnel: byOrderPersonnel };
    }
    function resourceFilter(r, f, start, end) { return r && between(r.WorkDate, start, end) && (norm(f.zona) === "TODOS" || flat(r.ZoneId || r.ZoneName) === flat(f.zona)) && (norm(f.supervisor) === "TODOS" || norm(r.SupervisorId) === norm(f.supervisor)) && (norm(f.turno) === "TODOS" || norm(r.ShiftId) === norm(f.turno)); }
    function orderFilter(o, f, start, end) { return o && between(o.PlannedStartDate, start, end) && (norm(f.tipoOrden) === "TODOS" || norm(o.OrderTypeCode) === norm(f.tipoOrden)) && (norm(f.estado) === "TODOS" || norm(o.AppStatusCode) === norm(f.estado) || norm(o.SapUserStatusCode) === norm(f.estado)); }
    function choose(map, op) { var key = operationKey(op), current = map.get(key), r = norm(op.PlannedSourceCode).indexOf("AFVV") >= 0 ? 0 : norm(op.PlannedSourceCode).indexOf("KBED") >= 0 ? 1 : 2, old = current ? (norm(current.PlannedSourceCode).indexOf("AFVV") >= 0 ? 0 : norm(current.PlannedSourceCode).indexOf("KBED") >= 0 ? 1 : 2) : 9; if (!current || r < old) { map.set(key, op); } }
    function catalog(items, key, name, all) { var m = new Map([["TODOS", all]]); items.forEach(function (x) { var id = String(x[key] || ""); if (id) { m.set(id, x[name] || id); } }); return Array.from(m.entries()).map(function (e) { return { key: e[0], text: e[1] }; }); }
    function thresholds(catalogs, end) { var warn = 5, high = 15; list(catalogs).filter(function (x) { var a = dt(x.ValidFrom), b = dt(x.ValidTo); return yes(x.Active) && norm(x.FilterDomain) === "ORDER_VARIATION_THRESHOLD" && (!a || a <= end) && (!b || b >= end); }).forEach(function (x) { if (["WARNING", "HIGH", "NEAR_PLAN"].indexOf(norm(x.ValueId)) >= 0) { warn = num(x.NumericValue) || warn; } if (["OVERLOAD", "CRITICAL", "OVER_PLAN"].indexOf(norm(x.ValueId)) >= 0) { high = num(x.NumericValue) || high; } }); return { warn: warn, high: high }; }
    function classification(variation, variationPct, limit) { if (variationPct === null) { return { text: "Sin datos", color: "", dot: "" }; } if (variationPct >= limit.high) { return { text: "Sobrecargado", color: "dhtoRedStrong", dot: "dhtoDotRed" }; } if (variationPct >= limit.warn) { return { text: "Cerca de plan", color: "dhtoRedStrong", dot: "dhtoDotOrange" }; } return { text: "Dentro de plan", color: variation < 0 ? "dhtoGreenStrong" : "", dot: "dhtoDotGreen" }; }
    function resultRow(base, plan, real, limit) { var change = real - plan, changePct = ratio(change, plan), status = classification(change, changePct, limit); return Object.assign(base, { horasPlan: hours(plan), horasReales: hours(real), variacionH: hours(change, true), variacionPct: changePct === null ? "Sin datos" : (change >= 0 ? "+" : "-") + pct(Math.abs(changePct)), estado: status.text, colorClass: status.color, statusDotClass: status.dot, planValue: plan, realValue: real }); }
    function summarize(rows, field, title, limit) { var m = new Map(); rows.forEach(function (row) { var key = String(row[field] || title), i = m.get(key) || { key: key, label: row[field] || title, ids: new Set(), plan: 0, real: 0 }; i.ids.add(row.ot); i.plan += row.planValue; i.real += row.realValue; m.set(key, i); }); return Array.from(m.values()).map(function (i) { var base = field === "zona" ? { zona: i.label, ot: String(i.ids.size) } : { responsable: i.label, ot: String(i.ids.size) }; return resultRow(base, i.plan, i.real, limit); }).sort(function (a, b) { return b.planValue - a.planValue; }); }
    function build(raw, input) {
        var current = range(input), f = current.filters, resourcesPeriod = list(raw.resources).filter(function (r) { return between(r && r.WorkDate, current.start, current.end); }), resources = resourcesPeriod.filter(function (r) { return resourceFilter(r, f, current.start, current.end); }), refs = refMaps(resources, raw.assignments, current.end), orders = list(raw.orders).filter(function (o) { return orderFilter(o, f, current.start, current.end); }), ids = new Set(orders.map(function (o) { return String(o.OrderId); })), byOrder = new Map(orders.map(function (o) { return [String(o.OrderId), o]; })), selectedResource = new Set(resources.map(function (r) { return String(r.ResourceId || ""); })), operations = new Map(), rows = new Map(), limit = thresholds(raw.catalogs, current.end);
        list(raw.operations).filter(function (o) { return o && ids.has(String(o.OrderId)) && (!o.PlannedStartDate || between(o.PlannedStartDate, current.start, current.end)); }).forEach(function (o) { choose(operations, o); });
        operations.forEach(function (op) {
            var key = String(op.OrderId), o = byOrder.get(key), a = refs.exact.get(assignmentKey(op)) || refs.byOrder.get(key), r = a && refs.byId.get(String(a.ResourceId)), context = r || o || {}, row;
            if (r && !selectedResource.has(String(r.ResourceId || ""))) { return; }
            if (!r && (norm(f.zona) !== "TODOS" || norm(f.supervisor) !== "TODOS" || norm(f.turno) !== "TODOS")) { return; }
            row = rows.get(key) || { ot: key, cliente: o && (o.CustomerName || o.CustomerId) || "Sin cliente", elevador: o && (o.EquipmentName || o.EquipmentId) || "Sin elevador", zona: context.ZoneName || context.ZoneId || context.Zona || "Sin zona", responsable: context.ResourceName || context.PersonnelNumber || context.SupervisorId || o && o.SupervisorId || "Sin responsable", turno: context.ShiftName || context.ShiftId || context.Turno || "Sin turno", plan: 0, real: 0 };
            row.plan += toHours(op.PlannedValueOriginal, op.PlannedUnitOriginal);
            rows.set(key, row);
        });
        list(raw.confirmations).filter(function (c) { return c && ids.has(String(c.OrderId)) && yes(c.IncludedInCalculation) && !yes(c.CancellationIndicator) && !c.ReversalReference && (!c.ActualStartDate || between(c.ActualStartDate, current.start, current.end)); }).forEach(function (c) {
            var key = String(c.OrderId), o = byOrder.get(key), a = refs.byOrderCounter.get(key + "|" + String(c.OperationCounter || "")) || refs.byOrderPersonnel.get(key + "|" + String(c.ExecutorPersonnelNumber || "")) || refs.byOrder.get(key), r = a && refs.byId.get(String(a.ResourceId)), context = r || o || {}, row;
            if (r && !selectedResource.has(String(r.ResourceId || ""))) { return; }
            if (!r && (norm(f.zona) !== "TODOS" || norm(f.supervisor) !== "TODOS" || norm(f.turno) !== "TODOS")) { return; }
            row = rows.get(key) || { ot: key, cliente: o && (o.CustomerName || o.CustomerId) || "Sin cliente", elevador: o && (o.EquipmentName || o.EquipmentId) || "Sin elevador", zona: context.ZoneName || context.ZoneId || context.Zona || "Sin zona", responsable: context.ResourceName || context.PersonnelNumber || context.SupervisorId || o && o.SupervisorId || "Sin responsable", turno: context.ShiftName || context.ShiftId || context.Turno || "Sin turno", plan: 0, real: 0 };
            row.real += toHours(c.ActualValueOriginal, c.ActualUnitOriginal);
            rows.set(key, row);
        });
        rows = Array.from(rows.values()).map(function (r) { return resultRow(r, r.plan, r.real, limit); }).sort(function (a, b) { return b.planValue - a.planValue || a.ot.localeCompare(b.ot); });
        var plan = rows.reduce(function (s, r) { return s + r.planValue; }, 0), real = rows.reduce(function (s, r) { return s + r.realValue; }, 0), change = real - plan, changePct = ratio(change, plan);
        return {
            filters: { periodo: f.periodo, fechaDesde: dmy(current.start), fechaHasta: dmy(current.end), zona: f.zona, supervisor: f.supervisor, turno: f.turno, tipoOrden: f.tipoOrden, estado: f.estado },
            catalogos: { periodos: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }], zonas: catalog(resourcesPeriod, "ZoneId", "ZoneName", "Todas"), supervisores: catalog(resourcesPeriod, "SupervisorId", "SupervisorName", "Todos"), turnos: catalog(resourcesPeriod.filter(function (r) { return yes(r.ShiftSourceValidated); }), "ShiftId", "ShiftName", "Todos"), tiposOrden: [{ key: "TODOS", text: "Todos" }].concat(TYPES.map(function (t) { var item = orders.filter(function (o) { return norm(o.OrderTypeCode) === t; })[0]; return { key: t, text: item && item.OrderTypeText || t }; })), estados: [{ key: "TODOS", text: "Todos" }, { key: "0100", text: "Pendiente" }, { key: "0200", text: "En proceso" }, { key: "0300", text: "Finalizada" }, { key: "0400", text: "Pendiente de firma" }] },
            kpis: Object.assign({ horasProgramadas: hours(plan), horasReales: hours(real), variacionHoras: hours(change, true), variacionPct: changePct === null ? "Sin datos" : (change >= 0 ? "+" : "-") + pct(Math.abs(changePct)), otRelacionadas: String(rows.length) }, classification(change, changePct, limit)),
            ordenes: rows, resumenZona: summarize(rows, "zona", "Sin zona", limit), resumenResponsable: summarize(rows, "responsable", "Sin responsable", limit), meta: { startDate: current.start, endDate: current.end, source: "BTP_DESTINATION_ODATA_V2" }
        };
    }
    return { build: build, range: range };
});
