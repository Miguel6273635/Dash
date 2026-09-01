sap.ui.define([], function () {
    "use strict";

    /*
     * Balance Operativo por Zona
     *
     * SAP entrega las entidades base. Esta capa construye el ViewModel y deja
     * explícita la regla provisional del índice: factores normalizados entre
     * zonas, ponderados con DashboardFilterCatalogSet cuando existan pesos.
     */
    function list(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return value === null || value === undefined ? "" : String(value).trim(); }
    function norm(value) { return text(value).toUpperCase(); }
    function plain(value) {
        var result = norm(value);
        return result.normalize ? result.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : result;
    }
    function number(value) {
        var parsed = Number(String(value === null || value === undefined ? 0 : value).replace(",", "."));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    function yes(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
    function date(value) {
        var matched, result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        matched = String(value).match(/\/Date\((-?\d+)/);
        result = matched ? new Date(Number(matched[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        if (result.getUTCHours() === 0 && result.getUTCMinutes() === 0) {
            return new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate());
        }
        return result;
    }
    function parseDate(value, fallback) {
        var spanish = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        var iso = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (spanish) { return new Date(Number(spanish[3]), Number(spanish[2]) - 1, Number(spanish[1])); }
        if (iso) { return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])); }
        return new Date(fallback.getTime());
    }
    function inRange(value, currentRange) {
        var current = date(value);
        return !!current && current >= currentRange.startDate && current <= currentRange.endDate;
    }
    function validInRange(row, currentRange) {
        var from = date(row && row.ValidFrom), until = date(row && row.ValidTo);
        return (!from || from <= currentRange.endDate) && (!until || until >= currentRange.startDate);
    }
    function range(input) {
        var filters = Object.assign({ periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026" }, input || {});
        var yearMatch = String(filters.periodo).match(/^(\d{4})/);
        var year = Number(yearMatch && yearMatch[1] || 2026);
        var startDate = parseDate(filters.fechaDesde, new Date(year, 0, 1));
        var endDate = parseDate(filters.fechaHasta, new Date(year, 11, 31));
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate: startDate, endDate: endDate };
    }
    function all(value) { return ["", "ALL", "TODAS", "TODOS"].indexOf(norm(value)) >= 0; }
    function matches(actual, selected) { return all(selected) || plain(actual) === plain(selected); }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function addSet(map, key, value) {
        var current = map.get(key) || new Set();
        if (value) { current.add(value); }
        map.set(key, current);
    }
    function round(value, digits) {
        var factor = Math.pow(10, digits === undefined ? 1 : digits);
        return Math.round((Number(value) || 0) * factor) / factor;
    }
    function formatNumber(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(round(value)); }
    function percent(value) { return round(value).toFixed(1) + "%"; }
    function labelForResource(row) { return text(row && (row.ZoneName || row.ZoneId)); }
    function isHour(unit) {
        var value = plain(unit);
        return !value || ["H", "HR", "HRS", "HORA", "HORAS"].indexOf(value) >= 0;
    }
    function isExecuted(order) {
        var app = norm(order && order.AppStatusCode);
        var sap = norm(order && order.SapUserStatusCode);
        return ["0300", "0400", "0301"].indexOf(app) >= 0 || ["E0015", "E0016", "E0019"].indexOf(sap) >= 0;
    }
    function isAvailable(resource) {
        var status = plain(resource && resource.AvailabilityStatusCode);
        return !["UNAVAILABLE", "NOT_AVAILABLE", "ABSENT", "AUSENTE", "NO_DISPONIBLE", "INACTIVE"].some(function (value) { return status.indexOf(value) >= 0; });
    }
    function isOpenRequirement(row) {
        var status = plain(row && (row.StatusCode || row.StatusText));
        return !date(row && row.ClosedAt) && !["CLOSED", "CERRADO", "COMPLETED", "COMPLETADO", "CANCELLED", "CANCELADO"].some(function (value) { return status.indexOf(value) >= 0; });
    }
    function isReschedule(row) {
        var code = plain((row && row.EventTypeCode) + " " + (row && row.ActionCode));
        return !yes(row && row.StatusInactive) && (code.indexOf("RESCHEDULE") >= 0 || code.indexOf("REPROGRAM") >= 0);
    }
    function hasMaterialBlock(row) {
        var requested = number(row && row.PlannedQuantity), available = number(row && row.AvailableStockQuantity);
        return (row && (row.IsPublishable === undefined || row.IsPublishable === null || yes(row.IsPublishable))) && requested > available;
    }
    function optionRows(rows, idField, textField, allText) {
        var map = new Map([["ALL", allText]]);
        rows.forEach(function (row) {
            var id = text(row && row[idField]);
            if (id) { map.set(id, text(row[textField]) || id); }
        });
        return Array.from(map.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; }).sort(function (left, right) {
            if (left.key === "ALL") { return -1; }
            if (right.key === "ALL") { return 1; }
            return left.text.localeCompare(right.text, "es");
        });
    }
    function catalogNumber(catalogs, aliases, fallback) {
        var found = list(catalogs).filter(function (row) {
            var domain = plain(row && row.FilterDomain), value = plain(row && row.ValueId);
            return row && (row.Active === undefined || row.Active === null || yes(row.Active)) && aliases.some(function (alias) {
                return domain === alias || value === alias || domain.indexOf(alias) >= 0 || value.indexOf(alias) >= 0;
            });
        })[0];
        return found && number(found.NumericValue) > 0 ? number(found.NumericValue) : fallback;
    }
    function catalogWeight(catalogs, aliases) {
        return catalogNumber(catalogs, aliases, 1);
    }
    function classifyPressure(value, thresholds) {
        if (value >= thresholds.critical) { return { label: "Crítica", state: "Red" }; }
        if (value >= thresholds.high) { return { label: "Alta", state: "Orange" }; }
        if (value >= thresholds.medium) { return { label: "Media", state: "Yellow" }; }
        return { label: value < thresholds.low ? "Baja" : "Controlada", state: "Green" };
    }
    function classifyHours(value) {
        if (value >= 100) { return { label: "Alta", state: "Red" }; }
        if (value >= 85) { return { label: "Media", state: "Yellow" }; }
        return { label: "Baja", state: "Green" };
    }
    function classifyCapacity(value) {
        if (value < 60) { return { label: "Alta", state: "Green" }; }
        if (value < 85) { return { label: "Media", state: "Yellow" }; }
        return { label: "Baja", state: "Red" };
    }
    function emptyRaw() {
        return {
            orders: [], resources: [], assignments: [], operations: [], confirmations: [], events: [], requirements: [], materials: [], catalogs: [],
            meta: { unavailableEntitySets: [] }
        };
    }
    function build(raw, input) {
        raw = raw || emptyRaw();
        var filters = Object.assign({ periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", turno: "ALL", tipoOrden: "ALL", supervisor: "ALL", zona: "ALL" }, input || {});
        var currentRange = range(filters);
        var resourcesInPeriod = list(raw.resources).filter(function (row) { return row && inRange(row.WorkDate, currentRange); });
        var resourcesById = new Map(), assignments, resourceForAssignment, orderZone, orderSupervisor, orderShift, allOrders, selectedOrders, selectedOrderIds, zoneBuckets = new Map();

        resourcesInPeriod.forEach(function (resource) {
            var id = text(resource.ResourceId), current = resourcesById.get(id) || [];
            if (id) { current.push(resource); resourcesById.set(id, current); }
        });
        assignments = list(raw.assignments).filter(function (row) { return row && text(row.OrderId) && text(row.ResourceId) && validInRange(row, currentRange); });
        resourceForAssignment = function (assignment, order) {
            var rows = resourcesById.get(text(assignment && assignment.ResourceId)) || [];
            var reference = date(order && order.PlannedStartDate), chosen = rows[0];
            rows.forEach(function (row) {
                if (!chosen || (reference && date(row.WorkDate) && Math.abs(date(row.WorkDate) - reference) < Math.abs(date(chosen.WorkDate) - reference))) { chosen = row; }
            });
            return chosen;
        };
        orderZone = function (order) {
            var direct = text(order && (order.Zona || order.ZoneName || order.ZoneId));
            var matching = assignments.filter(function (row) { return text(row.OrderId) === text(order && order.OrderId); });
            var resource = matching.length ? resourceForAssignment(matching[0], order) : null;
            return direct || labelForResource(resource) || "Sin zona";
        };
        orderSupervisor = function (order) {
            var direct = text(order && (order.SupervisorId || order.ResponsibleId));
            var matching = assignments.filter(function (row) { return text(row.OrderId) === text(order && order.OrderId); });
            var resource = matching.length ? resourceForAssignment(matching[0], order) : null;
            return direct || text(resource && (resource.SupervisorId || resource.SupervisorName)) || "";
        };
        orderShift = function (order) {
            var direct = text(order && (order.Turno || order.ShiftId || order.ShiftName));
            var matching = assignments.filter(function (row) { return text(row.OrderId) === text(order && order.OrderId); });
            var resource = matching.length ? resourceForAssignment(matching[0], order) : null;
            return direct || text(resource && (resource.ShiftId || resource.ShiftName)) || "";
        };
        allOrders = list(raw.orders).filter(function (order) { return order && inRange(order.PlannedStartDate, currentRange); });
        selectedOrders = allOrders.filter(function (order) {
            return matches(orderZone(order), filters.zona) && matches(orderSupervisor(order), filters.supervisor) && matches(orderShift(order), filters.turno) && matches(order.OrderTypeCode || order.OrderTypeText, filters.tipoOrden);
        });
        selectedOrderIds = new Set(selectedOrders.map(function (order) { return text(order.OrderId); }));

        function ensureZone(value) {
            var key = text(value) || "Sin zona";
            if (!zoneBuckets.has(key)) {
                zoneBuckets.set(key, {
                    zona: key, orders: new Set(), pending: new Set(), overdue: new Set(), scheduled: 0, actual: 0, capacity: 0,
                    availableResources: new Set(), reprogrammed: new Set(), clientBlocks: new Set(), materialBlocks: new Set(), operationKeys: new Set()
                });
            }
            return zoneBuckets.get(key);
        }
        selectedOrders.forEach(function (order) {
            var bucket = ensureZone(orderZone(order)), id = text(order.OrderId), due = date(order.PlannedFinishDate);
            bucket.orders.add(id);
            if (!isExecuted(order)) { bucket.pending.add(id); }
            if (!isExecuted(order) && due && due < currentRange.endDate) { bucket.overdue.add(id); }
        });
        resourcesInPeriod.filter(function (resource) {
            return matches(resource.ZoneId || resource.ZoneName, filters.zona) && matches(resource.SupervisorId || resource.SupervisorName, filters.supervisor) && matches(resource.ShiftId || resource.ShiftName, filters.turno);
        }).forEach(function (resource) {
            var bucket = ensureZone(labelForResource(resource)), id = text(resource.ResourceId);
            bucket.capacity += Math.max(0, number(resource.CapacityHours) - number(resource.AbsenceHours));
            if (id && isAvailable(resource) && (resource.CapacitySourceValidated === undefined || resource.CapacitySourceValidated === null || yes(resource.CapacitySourceValidated))) {
                bucket.availableResources.add(id);
            }
        });
        list(raw.operations).filter(function (row) {
            return row && selectedOrderIds.has(text(row.OrderId)) && isHour(row.PlannedUnitOriginal) && (!date(row.PlannedStartDate) || inRange(row.PlannedStartDate, currentRange));
        }).forEach(function (row) {
            var order = selectedOrders.filter(function (item) { return text(item.OrderId) === text(row.OrderId); })[0];
            var bucket = ensureZone(orderZone(order)), key = text(row.OperationKey) || text(row.OrderId) + "|" + text(row.OperationCounter || row.OperationNumber);
            if (!bucket.operationKeys.has(key)) { bucket.scheduled += number(row.PlannedValueOriginal); bucket.operationKeys.add(key); }
        });
        list(raw.confirmations).filter(function (row) {
            return row && selectedOrderIds.has(text(row.OrderId)) && isHour(row.ActualUnitOriginal) && (row.IncludedInCalculation === undefined || row.IncludedInCalculation === null || yes(row.IncludedInCalculation)) && !yes(row.CancellationIndicator) && (!date(row.ActualFinishDate) || inRange(row.ActualFinishDate, currentRange));
        }).forEach(function (row) {
            var order = selectedOrders.filter(function (item) { return text(item.OrderId) === text(row.OrderId); })[0];
            ensureZone(orderZone(order)).actual += number(row.ActualValueOriginal);
        });
        list(raw.events).filter(function (row) { return row && selectedOrderIds.has(text(row.OrderId)) && isReschedule(row) && (!date(row.EventAt) || inRange(row.EventAt, currentRange)); }).forEach(function (row) {
            var order = selectedOrders.filter(function (item) { return text(item.OrderId) === text(row.OrderId); })[0];
            ensureZone(orderZone(order)).reprogrammed.add(text(row.OrderId));
        });
        list(raw.requirements).filter(function (row) { return row && selectedOrderIds.has(text(row.OrderId)) && isOpenRequirement(row); }).forEach(function (row) {
            var order = selectedOrders.filter(function (item) { return text(item.OrderId) === text(row.OrderId); })[0];
            ensureZone(orderZone(order)).clientBlocks.add(text(row.OrderId));
        });
        list(raw.materials).filter(function (row) { return row && selectedOrderIds.has(text(row.OrderId)) && hasMaterialBlock(row) && (!date(row.RequiredDate) || inRange(row.RequiredDate, currentRange)); }).forEach(function (row) {
            var order = selectedOrders.filter(function (item) { return text(item.OrderId) === text(row.OrderId); })[0];
            ensureZone(orderZone(order)).materialBlocks.add(text(row.OrderId));
        });

        var thresholds = {
            critical: catalogNumber(raw.catalogs, ["PRESSURE_CRITICAL", "CRITICAL"], 90),
            high: catalogNumber(raw.catalogs, ["PRESSURE_HIGH", "HIGH"], 75),
            medium: catalogNumber(raw.catalogs, ["PRESSURE_MEDIUM", "MEDIUM"], 50),
            low: catalogNumber(raw.catalogs, ["PRESSURE_LOW", "LOW"], 25),
            available: catalogNumber(raw.catalogs, ["CAPACITY_AVAILABLE", "UTILIZATION_AVAILABLE"], 85)
        };
        var weights = {
            overdue: catalogWeight(raw.catalogs, ["PRESSURE_WEIGHT_OVERDUE", "WEIGHT_OVERDUE", "ORDERS_OVERDUE"]),
            excess: catalogWeight(raw.catalogs, ["PRESSURE_WEIGHT_EXCESS", "WEIGHT_EXCESS", "HOURS_EXCESS"]),
            resources: catalogWeight(raw.catalogs, ["PRESSURE_WEIGHT_RESOURCES", "WEIGHT_RESOURCES", "RESOURCE_SHORTAGE"]),
            rescheduled: catalogWeight(raw.catalogs, ["PRESSURE_WEIGHT_RESCHEDULE", "WEIGHT_RESCHEDULE", "RESCHEDULE"]),
            blocked: catalogWeight(raw.catalogs, ["PRESSURE_WEIGHT_BLOCKED", "WEIGHT_BLOCKED", "MATERIAL_CLIENT"])
        };
        var buckets = Array.from(zoneBuckets.values()).map(function (bucket) {
            bucket.factors = {
                overdue: bucket.overdue.size,
                excess: Math.max(0, bucket.actual - bucket.scheduled),
                resources: Math.max(0, bucket.scheduled - bucket.capacity),
                rescheduled: bucket.reprogrammed.size,
                blocked: new Set(Array.from(bucket.clientBlocks).concat(Array.from(bucket.materialBlocks))).size
            };
            bucket.utilHours = bucket.scheduled > 0 ? bucket.actual / bucket.scheduled * 100 : 0;
            bucket.utilResources = bucket.capacity > 0 ? bucket.scheduled / bucket.capacity * 100 : bucket.scheduled > 0 ? 100 : 0;
            return bucket;
        });
        var maxima = { overdue: 0, excess: 0, resources: 0, rescheduled: 0, blocked: 0 };
        buckets.forEach(function (bucket) { Object.keys(maxima).forEach(function (key) { maxima[key] = Math.max(maxima[key], bucket.factors[key]); }); });
        buckets.forEach(function (bucket) {
            var weighted = 0, weightTotal = 0;
            bucket.normalized = {};
            Object.keys(maxima).forEach(function (key) {
                var normalized = maxima[key] > 0 ? bucket.factors[key] / maxima[key] * 100 : 0;
                bucket.normalized[key] = normalized;
                weighted += normalized * weights[key];
                weightTotal += weights[key];
            });
            bucket.pressure = weightTotal ? weighted / weightTotal : 0;
            bucket.level = classifyPressure(bucket.pressure, thresholds);
            bucket.available = bucket.capacity > 0 && bucket.utilResources < thresholds.available;
            bucket.contributions = {};
            var contributionBase = Object.keys(maxima).reduce(function (sum, key) { return sum + bucket.normalized[key] * weights[key]; }, 0);
            Object.keys(maxima).forEach(function (key) { bucket.contributions[key] = contributionBase ? bucket.normalized[key] * weights[key] / contributionBase * 100 : 0; });
        });
        buckets.sort(function (left, right) { return right.pressure - left.pressure || left.zona.localeCompare(right.zona, "es"); });

        var pressureRows = buckets.map(function (bucket) {
            return { zona: bucket.zona, valor: percent(bucket.pressure), porcentaje: Math.max(0, Math.min(100, round(bucket.pressure))) + "%", label: bucket.level.label, estado: bucket.level.state };
        });
        var matrix = buckets.map(function (bucket) {
            var hours = classifyHours(bucket.utilHours), resources = classifyCapacity(bucket.utilResources);
            return {
                zona: bucket.zona, carga: String(bucket.orders.size), pendientes: String(bucket.pending.size), vencidas: String(bucket.overdue.size),
                estadoOrdenes: bucket.level.label, estadoOrdenesKey: bucket.level.state,
                programadas: formatNumber(bucket.scheduled) + " h", reales: formatNumber(bucket.actual) + " h", utilHoras: percent(bucket.utilHours), estadoHoras: hours.label, estadoHorasKey: hours.state,
                disponibles: String(bucket.availableResources.size), utilRecursos: percent(bucket.utilResources), estadoRecursos: resources.label, estadoRecursosKey: resources.state
            };
        });
        var composition = buckets.map(function (bucket) {
            return {
                zona: bucket.zona,
                vencidas: percent(bucket.contributions.overdue), vencidasTxt: percent(bucket.contributions.overdue),
                excedidas: percent(bucket.contributions.excess), excedidasTxt: percent(bucket.contributions.excess),
                recursos: percent(bucket.contributions.resources), recursosTxt: percent(bucket.contributions.resources),
                reprogramaciones: percent(bucket.contributions.rescheduled), reprogramacionesTxt: percent(bucket.contributions.rescheduled),
                materiales: percent(bucket.contributions.blocked), materialesTxt: percent(bucket.contributions.blocked)
            };
        });
        var capacity = buckets.map(function (bucket) { return { zona: bucket.zona, recursos: bucket.availableResources.size, vencidas: bucket.overdue.size }; });
        var critical = buckets[0], highZones = buckets.filter(function (bucket) { return bucket.pressure >= thresholds.high; }), availableZones = buckets.filter(function (bucket) { return bucket.available; }).sort(function (left, right) { return left.utilResources - right.utilResources; });
        var totalOrders = buckets.reduce(function (sum, bucket) { return sum + bucket.orders.size; }, 0);
        var globalPressure = totalOrders ? buckets.reduce(function (sum, bucket) { return sum + bucket.pressure * bucket.orders.size; }, 0) / totalOrders : 0;
        var globalLevel = classifyPressure(globalPressure, thresholds);
        var redistribucion = [], supports = availableZones.slice();
        highZones.forEach(function (source) {
            var support = supports.filter(function (target) { return target.zona !== source.zona; })[0];
            if (support) {
                redistribucion.push({ origen: source.zona, destino: support.zona, motivo: "Capacidad disponible (" + percent(Math.max(0, 100 - support.utilResources)) + ")" });
                supports = supports.filter(function (target) { return target.zona !== support.zona; });
            }
        });
        if (!redistribucion.length && highZones.length && availableZones.length) {
            redistribucion.push({ origen: highZones[0].zona, destino: availableZones[0].zona, motivo: "Menor utilización de recursos" });
        }
        var totalContributions = Object.keys(maxima).reduce(function (result, key) {
            result[key] = buckets.length ? buckets.reduce(function (sum, bucket) { return sum + bucket.contributions[key]; }, 0) / buckets.length : 0;
            return result;
        }, {});
        var zonesFromResources = resourcesInPeriod.filter(function (row) { return text(row.ZoneId || row.ZoneName); });
        var options = {
            periodos: ["2026", "2025", "2024"].map(function (year) { return { key: year, text: year + " (Anual)" }; }),
            turnos: optionRows(resourcesInPeriod, "ShiftId", "ShiftName", "Todos"),
            tiposOrden: optionRows(allOrders, "OrderTypeCode", "OrderTypeText", "Todos"),
            supervisores: optionRows(resourcesInPeriod, "SupervisorId", "SupervisorName", "Todos"),
            zonas: optionRows(zonesFromResources.concat(selectedOrders.map(function (order) { return { ZoneId: orderZone(order), ZoneName: orderZone(order) }; })), "ZoneId", "ZoneName", "Todas")
        };
        return {
            filtros: filters,
            opciones: options,
            resumen: {
                zonaCritica: { nombre: critical ? critical.zona : "Sin datos", presion: critical ? percent(critical.pressure) : "0.0%" },
                zonasPresionAlta: { total: String(highZones.length), nombres: highZones.map(function (bucket) { return bucket.zona; }).join(", ") || "Sin datos" },
                zonasCapacidadDisponible: { total: String(availableZones.length), nombres: availableZones.map(function (bucket) { return bucket.zona; }).join(", ") || "Sin datos" },
                indiceGlobal: { valor: percent(globalPressure), nivel: globalLevel.label + " · ponderado por OT" }
            },
            presionZona: pressureRows,
            matriz: matrix,
            matrizFooter: "Mostrando " + (matrix.length ? "1" : "0") + " a " + matrix.length + " de " + matrix.length + " resultados",
            composicion: composition,
            contribucionesResumen: {
                vencidas: percent(totalContributions.overdue), excedidas: percent(totalContributions.excess), recursos: percent(totalContributions.resources),
                reprogramaciones: percent(totalContributions.rescheduled), materiales: percent(totalContributions.blocked)
            },
            capacidad: capacity,
            capacidadMensaje: critical ? "La mayor presión operativa se concentra en " + critical.zona + ", con " + critical.overdue.size + " OT vencidas y " + critical.availableResources.size + " recursos disponibles." : "No hay datos de zona para determinar presión operativa.",
            panelPresion: highZones.slice(0, 2).map(function (bucket) { return { zona: bucket.zona, presion: percent(bucket.pressure) }; }),
            panelApoyo: availableZones.slice(0, 2).map(function (bucket) { return { zona: bucket.zona, presion: percent(bucket.pressure) }; }),
            redistribucion: redistribucion,
            meta: {
                unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [],
                pressureRule: "Factores normalizados por zona y pesos de catálogo; si no hay catálogo, todos los factores pesan igual.",
                thresholds: thresholds
            }
        };
    }

    return { build: build, range: range, emptyRaw: emptyRaw };
});
