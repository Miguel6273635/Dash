sap.ui.define([], function () {
    "use strict";

    var ORDER_TYPES = ["SM01", "SM02", "SM03"];
    var TYPE_TEXT = {
        SM01: "Correctivo",
        SM02: "Preventivo",
        SM03: "Centro de llamadas"
    };
    var ORIGIN_TEXT = {
        TODAS: "Todas",
        INTERNAL: "Internas (operación)",
        EXTERNAL: "Externas (cliente/proveedor)",
        JUSTIFIED: "Justificadas"
    };
    var MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

    function array(value) {
        return Array.isArray(value) ? value : [];
    }

    function norm(value) {
        return String(value || "").trim().toUpperCase();
    }

    function comparable(value) {
        var text = norm(value);
        return text.normalize ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : text;
    }

    function yes(value) {
        return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0;
    }

    function parseDate(value) {
        var match;
        var result;

        if (!value) {
            return null;
        }
        if (value instanceof Date) {
            return new Date(value.getTime());
        }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);

        if (Number.isNaN(result.getTime())) {
            return null;
        }
        if (result.getUTCHours() === 0 && result.getUTCMinutes() === 0) {
            return new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate());
        }
        return result;
    }

    function displayDate(value) {
        var date = parseDate(value);
        return date ? String(date.getDate()).padStart(2, "0") + "/" +
            String(date.getMonth() + 1).padStart(2, "0") + "/" + date.getFullYear() : "";
    }

    function weekStart(year, week) {
        var january4 = new Date(year, 0, 4);
        var weekday = january4.getDay() || 7;
        return new Date(year, 0, 4 - weekday + 1 + (week - 1) * 7);
    }

    function period(key) {
        var annual = String(key || "").match(/^(\d{4})-ANUAL$/);
        var weekly = String(key || "").match(/^(\d{4})-W(\d{2})$/);
        var start;

        if (annual) {
            return {
                startDate: new Date(Number(annual[1]), 0, 1),
                endDate: new Date(Number(annual[1]), 11, 31, 23, 59, 59)
            };
        }
        if (!weekly) {
            return null;
        }
        start = weekStart(Number(weekly[1]), Number(weekly[2]));
        return {
            startDate: start,
            endDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59)
        };
    }

    function periodOptions() {
        var result = [];
        var year;
        var week;
        var start;
        var end;

        [2024, 2025, 2026].forEach(function (currentYear) {
            result.push({ key: currentYear + "-ANUAL", text: currentYear + " (Anual)" });
        });

        for (year = 2024; year <= 2026; year += 1) {
            /* ISO 2026 tiene semana 53; se calcula en lugar de fijar 52. */
            var totalWeeks = Math.round((weekStart(year + 1, 1) - weekStart(year, 1)) / 604800000);
            for (week = 1; week <= totalWeeks; week += 1) {
                start = weekStart(year, week);
                end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
                result.push({
                    key: year + "-W" + String(week).padStart(2, "0"),
                    text: "Semana " + week + " (" + String(start.getDate()).padStart(2, "0") + " " +
                        MONTHS[start.getMonth()] + " - " + String(end.getDate()).padStart(2, "0") + " " +
                        MONTHS[end.getMonth()] + " " + end.getFullYear() + ")"
                });
            }
        }
        return result;
    }

    function isActive(record, cutoff) {
        var from = parseDate(record && record.ValidFrom);
        var to = parseDate(record && record.ValidTo);
        return (!from || !cutoff || from <= cutoff) && (!to || !cutoff || to >= cutoff);
    }

    function canonicalStatus(order) {
        var sap = norm(order && order.SapUserStatusCode);
        var app = norm(order && order.AppStatusCode);
        var appMap = { "0100": "E0013", "0200": "E0014", "0300": "E0015" };

        if (/^E00\d{2}$/.test(sap)) {
            return sap;
        }
        return appMap[sap] || appMap[app] || "";
    }

    function isExecuted(order) {
        return canonicalStatus(order) === "E0015" || norm(order && order.AppStatusCode) === "0300";
    }

    function isDeviated(order) {
        return ["E0013", "E0014"].indexOf(canonicalStatus(order)) >= 0 ||
            ["0100", "0200"].indexOf(norm(order && order.AppStatusCode)) >= 0;
    }

    function orderInPeriod(order, start, end) {
        var planned = parseDate(order && (order.PlannedStartDate || order.PlannedFinishDate));
        return !!planned && planned >= start && planned <= end;
    }

    function assignmentRank(assignment) {
        return (norm(assignment && assignment.AssignmentTypeCode) === "PLANNED" ? 0 : 10) +
            (norm(assignment && assignment.RoleCode) === "LEAD_MECHANIC" ? 0 : 1);
    }

    function resolveAssignments(assignments, resourceId, cutoff) {
        var result = new Map();

        array(assignments).filter(function (assignment) {
            return assignment && assignment.OrderId && String(assignment.ResourceId || "") === String(resourceId || "") && isActive(assignment, cutoff);
        }).forEach(function (assignment) {
            var id = String(assignment.OrderId);
            var current = result.get(id);

            if (!current || assignmentRank(assignment) < assignmentRank(current)) {
                result.set(id, assignment);
            }
        });
        return result;
    }

    function resolveResource(resources, resourceId, start, end) {
        var candidates = array(resources).filter(function (resource) {
            var workDate = parseDate(resource && resource.WorkDate);
            return resource && String(resource.ResourceId || "") === String(resourceId || "") &&
                (!workDate || (workDate >= start && workDate <= end));
        });

        if (!candidates.length) {
            candidates = array(resources).filter(function (resource) {
                return resource && String(resource.ResourceId || "") === String(resourceId || "");
            });
        }
        return candidates.sort(function (left, right) {
            return (parseDate(right.WorkDate) || new Date(0)) - (parseDate(left.WorkDate) || new Date(0));
        })[0] || null;
    }

    function causesByOrder(causes, cutoff) {
        var result = new Map();

        array(causes).filter(function (cause) {
            return cause && cause.OrderId && isActive(cause, cutoff) &&
                (!cause.CauseContextCode || norm(cause.CauseContextCode) === "NON_EXECUTION");
        }).forEach(function (cause) {
            var id = String(cause.OrderId);
            var current = result.get(id);
            var rank = (yes(cause.IsPrimary) ? 10 : 0) + (cause.CauseText || cause.CauseCode ? 1 : 0);
            var currentRank = current ? (yes(current.IsPrimary) ? 10 : 0) + (current.CauseText || current.CauseCode ? 1 : 0) : -1;

            if (!current || rank > currentRank) {
                result.set(id, cause);
            }
        });
        return result;
    }

    function isOriginMatch(cause, origin) {
        return norm(origin) === "TODAS" || (cause && norm(cause.OriginCode) === norm(origin));
    }

    function reprogrammedIds(events) {
        var result = new Set();
        array(events).forEach(function (event) {
            if (event && event.OrderId && norm(event.ActionCode) === "RESCHEDULED" && !yes(event.StatusInactive)) {
                result.add(String(event.OrderId));
            }
        });
        return result;
    }

    function typeText(order) {
        var code = norm(order && order.OrderTypeCode);
        return TYPE_TEXT[code] || order.OrderTypeText || code || "Sin datos";
    }

    function statusText(order, isReprogrammed) {
        var app = norm(order && order.AppStatusCode);
        var fallback = { "0100": "Pendiente", "0200": "En proceso", "0300": "Finalizada", "0400": "Pendiente de firma" };
        return isReprogrammed ? "Reprogramada" : order.StatusText || fallback[app] || "Sin datos";
    }

    function daysLate(order, cutoff) {
        var planned = parseDate(order && order.PlannedFinishDate);
        var milliseconds;

        if (!planned || !cutoff) {
            return null;
        }
        milliseconds = new Date(cutoff.getFullYear(), cutoff.getMonth(), cutoff.getDate()) -
            new Date(planned.getFullYear(), planned.getMonth(), planned.getDate());
        return Math.max(Math.floor(milliseconds / 86400000), 0);
    }

    function zoneOptions(catalogs, resources) {
        var result = new Map([["TODAS", "Todas"]]);

        array(catalogs).filter(function (item) {
            return norm(item && item.FilterDomain) === "ZONE" && item.Active !== false;
        }).forEach(function (item) {
            result.set(norm(item.ValueId), item.ValueText || item.ValueId);
        });
        array(resources).forEach(function (resource) {
            var id = norm(resource && (resource.ZoneId || resource.ZoneName));
            if (id) {
                result.set(id, resource.ZoneName || resource.ZoneId);
            }
        });
        return Array.from(result.entries()).map(function (entry) {
            return { key: entry[0], text: entry[1] };
        });
    }

    function page(items, pageNumber, pageSize) {
        var total = items.length;
        var size = Math.max(1, Number(pageSize) || 5);
        var pages = Math.max(1, Math.ceil(total / size));
        var current = Math.min(Math.max(1, Number(pageNumber) || 1), pages);
        var first = total ? (current - 1) * size + 1 : 0;
        var last = Math.min(current * size, total);

        return {
            rows: items.slice((current - 1) * size, current * size),
            pagination: {
                page: current,
                pageSize: size,
                total: total,
                totalPages: pages,
                hasPrevious: current > 1,
                hasNext: current < pages,
                text: "Mostrando " + first + " a " + last + " de " + total + " OT desviadas"
            }
        };
    }

    function firstResourceId(raw) {
        var assignment = array(raw.assignments)[0];
        var resource = array(raw.resources)[0];
        return assignment && assignment.ResourceId || resource && resource.ResourceId || "";
    }

    function build(raw, filters) {
        var values = Object.assign({ periodKey: "2026-ANUAL", zona: "TODAS", origen: "TODAS", page: 1, pageSize: 5 }, filters || {});
        var range = period(values.periodKey) || period("2026-ANUAL");
        var resourceId = values.responsableId || firstResourceId(raw);
        var resource = resolveResource(raw.resources, resourceId, range.startDate, range.endDate);
        var assignments = resolveAssignments(raw.assignments, resourceId, range.endDate);
        var causeMap = causesByOrder(raw.causes, range.endDate);
        var rescheduled = reprogrammedIds(raw.events);
        var resourceZone = resource && (resource.ZoneId || resource.ZoneName);
        var allOrders = array(raw.orders).filter(function (order) {
            return order && assignments.has(String(order.OrderId)) && ORDER_TYPES.indexOf(norm(order.OrderTypeCode)) >= 0 &&
                orderInPeriod(order, range.startDate, range.endDate);
        });
        var orders = allOrders.filter(function (order) {
            return norm(values.zona) === "TODAS" || comparable(resourceZone || order.Zona) === comparable(values.zona);
        });
        var deviatedOrders = orders.filter(function (order) {
            return isDeviated(order) && isOriginMatch(causeMap.get(String(order.OrderId)), values.origen);
        });
        var planned = new Set(orders.map(function (order) { return String(order.OrderId); })).size;
        var executed = new Set(orders.filter(isExecuted).map(function (order) { return String(order.OrderId); })).size;
        var equipment = new Set();
        var customers = new Set();
        var rows;
        var pageData;
        var selectedOption = periodOptions().filter(function (item) { return item.key === values.periodKey; })[0];

        rows = deviatedOrders.map(function (order) {
            var cause = causeMap.get(String(order.OrderId));
            var late = daysLate(order, range.endDate);
            var orderId = String(order.OrderId || "");

            if (order.EquipmentId || order.EquipmentName) {
                equipment.add(String(order.EquipmentId || order.EquipmentName));
            }
            if (order.CustomerId || order.CustomerName) {
                customers.add(String(order.CustomerId || order.CustomerName));
            }

            return {
                orderId: orderId,
                ot: orderId ? "OT-" + orderId.replace(/^0+/, "") : "Sin dato",
                equipo: order.EquipmentName || order.EquipmentId || "Sin dato",
                cliente: order.CustomerName || order.CustomerId || "Sin dato",
                tipoOt: typeText(order),
                causa: cause && (cause.CauseText || cause.CauseCode) || "Sin causa registrada",
                retraso: late === null ? "Sin datos" : late + (late === 1 ? " día" : " días"),
                retrasoNumero: late === null ? -1 : late,
                estado: statusText(order, rescheduled.has(orderId))
            };
        }).sort(function (left, right) {
            return right.retrasoNumero - left.retrasoNumero || left.ot.localeCompare(right.ot, "es");
        });

        pageData = page(rows, values.page, values.pageSize);

        return {
            responsableId: resourceId || "Sin responsable",
            responsable: resource && resource.ResourceName || resourceId || "Sin responsable asignado",
            zona: resource ? (resource.ZoneName || resource.ZoneId || "Sin zona") :
                (values.zona === "TODAS" ? "Todas" : values.zona),
            semana: selectedOption ? selectedOption.text : values.periodKey,
            origenActivo: ORIGIN_TEXT[norm(values.origen)] || ORIGIN_TEXT.TODAS,
            filtros: {
                periodKey: values.periodKey,
                periodoTexto: selectedOption ? selectedOption.text : values.periodKey,
                zonaKey: values.zona,
                origen: values.origen,
                fechaDesde: displayDate(range.startDate),
                fechaHasta: displayDate(range.endDate)
            },
            opcionesPeriodo: periodOptions(),
            opcionesZona: zoneOptions(raw.catalogs, raw.resources),
            kpi: {
                otDesviadas: rows.length,
                equiposAfectados: equipment.size,
                clientesAfectados: customers.size,
                cumplimiento: planned ? (executed / planned * 100).toFixed(1) : "--",
                cumplimientoNumero: planned ? Number((executed / planned * 100).toFixed(1)) : 0,
                otPlaneadas: planned,
                otEjecutadas: executed
            },
            desgloseTotal: rows,
            desgloseVisibles: pageData.rows,
            paginacion: pageData.pagination,
            meta: {
                source: "BTP_DESTINATION_ODATA_V2",
                resourceId: resourceId,
                orders: orders.length,
                deviations: rows.length
            }
        };
    }

    return {
        build: build,
        period: period
    };
});
