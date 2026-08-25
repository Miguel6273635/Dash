sap.ui.define([], function () {
    "use strict";

    var TYPES = ["SM01", "SM02", "SM03"];
    var TYPE_TEXT = { SM01: "Preventivo", SM02: "Correctivo", SM03: "Call Center" };
    var DEFAULT_PERIOD = "2026-ANUAL";
    var DEFAULT_ZONE = "TODAS";
    var ORIGINS = { TODAS: "Todas", INTERNAL: "Internas (operación)", EXTERNAL: "Externas (cliente/proveedor)", JUSTIFIED: "Justificadas" };
    var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    function arr(v) { return Array.isArray(v) ? v : []; }
    function norm(v) { return String(v || "").trim().toUpperCase(); }
    function comparable(v) {
        var s = norm(v);
        return s.normalize ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : s;
    }
    function yes(v) { return v === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(v)) >= 0; }
    function date(v) {
        var m, d;
        if (!v) { return null; }
        if (v instanceof Date) { return new Date(v.getTime()); }
        m = String(v).match(/\/Date\((-?\d+)/); d = m ? new Date(Number(m[1])) : new Date(v);
        if (Number.isNaN(d.getTime())) { return null; }
        return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
    }
    function parseDisplay(v) {
        var m = String(v || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/), d;
        if (!m) { return null; }
        d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return d.getFullYear() === Number(m[3]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
    }
    function display(d) { return d ? String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() : ""; }
    function weekStart(y, w) { var d = new Date(y, 0, 4), day = d.getDay() || 7; return new Date(y, 0, 4 - day + 1 + (w - 1) * 7); }
    function period(s) {
        var annual = String(s || "").match(/^(\d{4})-ANUAL$/), week = String(s || "").match(/^(\d{4})-W(\d{2})$/), start;
        if (annual) { return { startDate: new Date(Number(annual[1]), 0, 1), endDate: new Date(Number(annual[1]), 11, 31, 23, 59, 59) }; }
        if (!week) { return null; }
        start = weekStart(Number(week[1]), Number(week[2]));
        return { startDate: start, endDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59) };
    }
    function inRange(v, start, end) { var d = date(v); return !!d && (!start || d >= start) && (!end || d <= end); }
    function active(r, cutoff) { var from = date(r && r.ValidFrom), to = date(r && r.ValidTo); return (!from || !cutoff || from <= cutoff) && (!to || !cutoff || to >= cutoff); }
    function canonical(o) {
        var sap = norm(o && o.SapUserStatusCode), app = norm(o && o.AppStatusCode), map = { "0100": "E0013", "0200": "E0014", "0300": "E0015" };
        return /^E00\d{2}$/.test(sap) ? sap : map[sap] || map[app] || "";
    }
    function executed(o) { return canonical(o) === "E0015" || norm(o && o.AppStatusCode) === "0300"; }
    function deviated(o) { return ["E0013", "E0014"].indexOf(canonical(o)) >= 0 || ["0100", "0200"].indexOf(norm(o && o.AppStatusCode)) >= 0; }
    function assignmentRank(a) { return (norm(a && a.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (norm(a && a.RoleCode) === "LEAD_MECHANIC" ? 0 : 1); }
    function mapLists(raw) {
        var assignments = new Map(), resources = new Map();
        arr(raw.assignments).forEach(function (a) { var id = String(a && a.OrderId || ""), list; if (!id || !a.ResourceId) { return; } list = assignments.get(id) || []; list.push(a); assignments.set(id, list); });
        arr(raw.resources).forEach(function (r) { var id = String(r && r.ResourceId || ""), list; if (!id) { return; } list = resources.get(id) || []; list.push(r); resources.set(id, list); });
        return { assignments: assignments, resources: resources };
    }
    function enrichedOrders(raw) {
        var maps = mapLists(raw);
        return arr(raw.orders).map(function (o) {
            var copy = Object.assign({}, o), reference = date(o.PlannedFinishDate) || date(o.PlannedStartDate), choices = (maps.assignments.get(String(o.OrderId)) || []).filter(function (a) { return active(a, reference); }), a, resource;
            choices = (choices.length ? choices : maps.assignments.get(String(o.OrderId)) || []).slice().sort(function (x, y) { return assignmentRank(x) - assignmentRank(y); });
            a = choices[0];
            resource = a ? (maps.resources.get(String(a.ResourceId)) || []).slice().sort(function (x, y) { return Math.abs((date(x.WorkDate) || new Date(0)) - reference) - Math.abs((date(y.WorkDate) || new Date(0)) - reference); })[0] : null;
            copy._responsableId = a && a.ResourceId || o.Mecanico || o.SupervisorId || "SIN_ASIGNAR";
            copy._responsable = resource && resource.ResourceName || copy._responsableId;
            copy._zone = resource && (resource.ZoneId || resource.ZoneName) || o.Zona || "SIN_ZONA";
            return copy;
        });
    }
    function causeMap(causes, cutoff) {
        var out = new Map();
        arr(causes).filter(function (c) { return c && c.OrderId && active(c, cutoff); }).forEach(function (c) {
            var id = String(c.OrderId), old = out.get(id), rank = (yes(c.IsPrimary) ? 2 : 0) + (c.CauseCode || c.CauseText ? 1 : 0), oldRank = old ? (yes(old.IsPrimary) ? 2 : 0) + (old.CauseCode || old.CauseText ? 1 : 0) : -1;
            if (!old || rank > oldRank || (rank === oldRank && String(c.CauseCode || c.CauseText).localeCompare(String(old.CauseCode || old.CauseText), "es") < 0)) { out.set(id, c); }
        });
        return out;
    }
    function originMatch(cause, origin) { return origin === "TODAS" || (cause && norm(cause.OriginCode) === origin); }
    function initials(name) { return String(name || "--").split(/\s+/).filter(Boolean).slice(0, 2).map(function (p) { return p.charAt(0); }).join("").toUpperCase() || "--"; }
    function icon(cause) { var s = comparable(cause); if (s.indexOf("REFACC") >= 0) { return "sap-icon://history"; } if (s.indexOf("CLIENT") >= 0) { return "sap-icon://customer"; } if (s.indexOf("PROVEED") >= 0) { return "sap-icon://shipping-status"; } if (s.indexOf("PLAN") >= 0) { return "sap-icon://calendar"; } if (s.indexOf("DOC") >= 0) { return "sap-icon://document"; } return "sap-icon://wrench"; }
    function causeDetail(cause) { var s = comparable(cause); if (s.indexOf("REFACC") >= 0) { return "Retrasos en entrega y disponibilidad"; } if (s.indexOf("CLIENT") >= 0) { return "Falta de acceso o personal"; } if (s.indexOf("PROVEED") >= 0) { return "Incumplimiento o demora del proveedor"; } if (s.indexOf("PLAN") >= 0) { return "Programaciones incompletas o cambios de última hora"; } return cause === "Sin causa registrada" ? "SAP no entregó una causa para la OT" : "Causa registrada en SAP"; }
    function mainByCount(items, get) { var counts = new Map(); items.forEach(function (x) { var key = get(x) || ""; if (key) { counts.set(key, (counts.get(key) || 0) + 1); } }); return Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0], "es"); })[0]; }
    function periodOptions(selected) {
        var options = [], y, w, start, end;
        [2024, 2025, 2026].forEach(function (year) { options.push({ key: year + "-ANUAL", text: year + " (Anual)" }); });
        for (y = 2024; y <= 2026; y += 1) { for (w = 1; w <= 52; w += 1) { start = weekStart(y, w); end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6); options.push({ key: y + "-W" + String(w).padStart(2, "0"), text: "Semana " + w + " (" + String(start.getDate()).padStart(2, "0") + " " + MONTHS[start.getMonth()] + " - " + String(end.getDate()).padStart(2, "0") + " " + MONTHS[end.getMonth()] + " " + end.getFullYear() + ")" }); } }
        return options;
    }
    function zoneOptions(orders) { var m = new Map([["TODAS", "Todas"]]); arr(orders).forEach(function (o) { var key = norm(o._zone); if (key && key !== "SIN_ZONA") { m.set(key, o._zone); } }); return Array.from(m.entries()).map(function (e) { return { key: e[0], text: e[1] }; }); }
    function buildData(raw, filters) {
        var values = Object.assign({ periodo: DEFAULT_PERIOD, zona: DEFAULT_ZONE, origen: "TODAS" }, filters || {}), base = period(values.periodo), start = parseDisplay(values.fechaDesde) || raw.range.startDate || base.startDate, end = parseDisplay(values.fechaHasta) || raw.range.endDate || base.endDate, orders = enrichedOrders(raw).filter(function (o) { return TYPES.indexOf(norm(o.OrderTypeCode)) >= 0 && inRange(o.PlannedFinishDate || o.PlannedStartDate, start, end) && (norm(values.zona) === "TODAS" || comparable(o._zone) === comparable(values.zona)); }), causes = causeMap(raw.causes, end), groups = new Map(), allDeviated, total;
        orders.forEach(function (o) { var id = o._responsableId, g = groups.get(id); if (!g) { g = { id: id, name: o._responsable, planned: new Map(), executed: new Map(), deviations: new Map() }; groups.set(id, g); } g.planned.set(String(o.OrderId), o); if (executed(o)) { g.executed.set(String(o.OrderId), o); } if (deviated(o) && originMatch(causes.get(String(o.OrderId)), values.origen)) { g.deviations.set(String(o.OrderId), o); } });
        allDeviated = Array.from(groups.values()).reduce(function (list, g) { return list.concat(Array.from(g.deviations.values())); }, []); total = new Set(allDeviated.map(function (o) { return String(o.OrderId); })).size;
        return {
            filtros: { periodo: values.periodo, fechaDesde: display(start), fechaHasta: display(end), zona: values.zona, origen: values.origen }, opcionesPeriodo: periodOptions(values.periodo), opcionesZona: zoneOptions(orders), opcionesOrigen: Object.keys(ORIGINS).map(function (k) { return { key: k, text: ORIGINS[k] }; }),
            responsables: Array.from(groups.values()).filter(function (g) { return g.deviations.size; }).map(function (g) { var deviations = Array.from(g.deviations.values()), cause = mainByCount(deviations, function (o) { var c = causes.get(String(o.OrderId)); return c && (c.CauseText || c.CauseCode) || "Sin causa registrada"; }), type = mainByCount(Array.from(g.planned.values()), function (o) { return norm(o.OrderTypeCode); }), pct = total ? deviations.length / total * 100 : 0, compliance = g.planned.size ? g.executed.size / g.planned.size * 100 : null, risk = compliance === null ? "Sin datos" : compliance < 80 ? "Alto" : compliance < 90 ? "Medio" : "Bajo", equipment = new Map(), customers = new Map(); deviations.forEach(function (o) { var eq = o.EquipmentName || o.EquipmentId, customer = o.CustomerName || o.CustomerId; if (eq) { equipment.set(String(o.EquipmentId || eq), { nombre: eq + (customer ? " · " + customer : ""), ots: "1 OT" }); } if (customer) { var old = customers.get(String(o.CustomerId || customer)) || { nombre: customer, count: 0 }; old.count += 1; customers.set(String(o.CustomerId || customer), old); } }); return { responsableId: g.id, responsable: g.name || "Sin responsable asignado", initials: initials(g.name), otDesviadas: deviations.length, porcentajeTotal: pct.toFixed(0) + "%", causaPrincipal: cause ? cause[0] : "Sin causa registrada", causaDetalle: causeDetail(cause ? cause[0] : "Sin causa registrada"), causaIcon: icon(cause ? cause[0] : ""), tipoOt: type ? (TYPE_TEXT[type[0]] || type[0]) : "Sin datos", cumplimiento: compliance === null ? "--" : compliance.toFixed(0) + "%", cumplimientoValue: compliance === null ? 0 : Number(compliance.toFixed(1)), riesgo: risk, riesgoState: risk === "Alto" ? "Error" : risk === "Medio" ? "Warning" : risk === "Bajo" ? "Success" : "None", equipos: Array.from(equipment.values()), clientes: Array.from(customers.values()).sort(function (a, b) { return b.count - a.count; }).map(function (c) { return { nombre: c.nombre, ots: c.count + " OT" }; }), otAsignadas: g.planned.size }; }).sort(function (a, b) { return b.otDesviadas - a.otDesviadas || a.responsable.localeCompare(b.responsable, "es"); }).map(function (r, i) { r.id = i + 1; return r; }),
            resumen: { totalOTDesviadas: total, totalResponsables: Array.from(groups.values()).filter(function (g) { return g.deviations.size; }).length }, meta: { source: "BTP_DESTINATION_ODATA_V2", orders: orders.length, deviations: total }
        };
    }
    return { buildData: buildData, parsePeriod: period };
});
