sap.ui.define([], function () {
    "use strict";

    function list(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return value === null || value === undefined ? "" : String(value).trim(); }
    function norm(value) { return text(value).toUpperCase(); }
    function comparable(value) { var valueText = norm(value); return valueText.normalize ? valueText.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : valueText; }
    function number(value) { var result = Number(String(value === null || value === undefined ? 0 : value).replace(",", ".")); return Number.isFinite(result) ? result : 0; }
    function yes(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
    function date(value) {
        var match, result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ? new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result;
    }
    function parseDate(value, fallback) {
        var part = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/), iso = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (part) { return new Date(Number(part[3]), Number(part[2]) - 1, Number(part[1])); }
        if (iso) { return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])); }
        return new Date(fallback.getTime());
    }
    function dateText(value) { return String(value.getDate()).padStart(2, "0") + "/" + String(value.getMonth() + 1).padStart(2, "0") + "/" + value.getFullYear(); }
    function dayKey(value) { var current = date(value); return current ? current.getFullYear() + "-" + String(current.getMonth() + 1).padStart(2, "0") + "-" + String(current.getDate()).padStart(2, "0") : ""; }
    function inRange(value, currentRange) { var current = date(value); return !!current && current >= currentRange.startDate && current <= currentRange.endDate; }
    function range(input) {
        var filters = Object.assign({ periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026" }, input || {}), year = String(filters.periodo).match(/^(\d{4})/), start = parseDate(filters.fechaDesde, new Date(Number(year && year[1] || 2026), 0, 1)), end = parseDate(filters.fechaHasta, new Date(Number(year && year[1] || 2026), 11, 31));
        end.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
    }
    function isAll(value) { return ["", "ALL", "TODAS", "TODOS"].indexOf(norm(value)) >= 0; }
    function matches(actual, filter) { return isAll(filter) || comparable(actual) === comparable(filter); }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function addSet(map, key, value) { var set = map.get(key) || new Set(); if (value) { set.add(value); } map.set(key, set); }
    function round(value, decimals) { var factor = Math.pow(10, decimals === undefined ? 1 : decimals); return Math.round((Number(value) || 0) * factor) / factor; }
    function quantity(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(round(value)); }
    function signed(value) { return (value > 0 ? "+" : "") + quantity(value); }
    function percent(value) { return round(value).toFixed(1) + "%"; }
    function signedPercent(value) { return (value > 0 ? "+" : "") + percent(value); }
    function options(rows, idField, textField, allText) {
        var mapped = new Map([["ALL", allText]]);
        rows.forEach(function (row) { var id = text(row && row[idField]); if (id) { mapped.set(id, text(row[textField]) || id); } });
        return Array.from(mapped.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; }).sort(function (a, b) { return a.key === "ALL" ? -1 : b.key === "ALL" ? 1 : a.text.localeCompare(b.text, "es"); });
    }
    function valid(row, currentRange) {
        var from = date(row && row.ValidFrom), until = date(row && row.ValidTo);
        return (!from || from <= currentRange.endDate) && (!until || until >= currentRange.startDate);
    }
    function assignmentRank(row) { return (norm(row && row.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (norm(row && row.RoleCode) === "LEAD_MECHANIC" ? 0 : 1); }
    function firstAssignment(assignments, orderId) {
        var chosen;
        assignments.forEach(function (row) { if (text(row.OrderId) === orderId && (!chosen || assignmentRank(row) < assignmentRank(chosen))) { chosen = row; } });
        return chosen;
    }
    function net(movement) {
        var direction = comparable(movement && movement.MovementDirectionCode), amount = number(movement && movement.MovementQuantity);
        return ["RETURN", "IN", "ENTRADA", "DEVOLUCION", "DEVOLUCION DE MATERIAL"].indexOf(direction) >= 0 ? -amount : amount;
    }
    function icon(material, category) {
        var label = comparable(material + " " + category);
        if (label.indexOf("ACEITE") >= 0 || label.indexOf("LUBRIC") >= 0 || label.indexOf("GRASA") >= 0) { return "sap-icon://water"; }
        if (label.indexOf("SENSOR") >= 0 || label.indexOf("PUERTA") >= 0) { return "sap-icon://shipping-status"; }
        if (label.indexOf("CABLE") >= 0) { return "sap-icon://chain-link"; }
        return "sap-icon://product";
    }
    function weekStart(value) {
        var current = date(value), day;
        if (!current) { return null; }
        current.setHours(0, 0, 0, 0);
        day = current.getDay() || 7;
        current.setDate(current.getDate() - day + 1);
        return current;
    }
    function weekKey(value) { var current = weekStart(value); return current ? dayKey(current) : ""; }
    function weekLabel(value) {
        var start = weekStart(value), end;
        if (!start) { return "Sin semana"; }
        end = new Date(start.getTime()); end.setDate(end.getDate() + 6);
        return String(start.getDate()).padStart(2, "0") + "/" + String(start.getMonth() + 1).padStart(2, "0") + " - " + String(end.getDate()).padStart(2, "0") + "/" + String(end.getMonth() + 1).padStart(2, "0");
    }
    function emptyRaw() { return { orders: [], materials: [], movements: [], assignments: [], resources: [], catalogs: [], meta: { unavailableEntitySets: [] } }; }

    function build(raw, input) {
        raw = raw || emptyRaw();
        var filters = Object.assign({ periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "ALL", cliente: "ALL", responsable: "ALL", tipoOt: "ALL" }, input || {}), currentRange = range(filters), daily = list(raw.resources).filter(function (row) { return row && inRange(row.WorkDate, currentRange); }), resourceById = new Map(), assignments, allOrders, ordersSelected, ordersById, requirements = new Map(), materialMap = new Map(), requirementZones = new Map(), movementZones = new Map(), detailsByMaterial = {}, periodMaterialRecords = [];

        daily.forEach(function (row) {
            var id = text(row.ResourceId), old = resourceById.get(id);
            if (id && (!old || date(row.WorkDate) > date(old.WorkDate))) { resourceById.set(id, row); }
        });
        assignments = list(raw.assignments).filter(function (row) { return row && text(row.OrderId) && text(row.ResourceId) && valid(row, currentRange); });
        allOrders = list(raw.orders).filter(function (row) { return row && inRange(row.PlannedStartDate, currentRange); });
        ordersSelected = allOrders.filter(function (order) {
            var assignment = firstAssignment(assignments, text(order.OrderId)), resource = assignment && resourceById.get(text(assignment.ResourceId)), zone = resource ? resource.ZoneId || resource.ZoneName : order.Zona || order.ZoneId || order.ZoneName, responsible = resource ? resource.ResourceId || resource.ResourceName : order.ResponsibleId || order.SupervisorId;
            return matches(zone, filters.zona) && matches(order.CustomerId || order.CustomerName, filters.cliente) && matches(responsible, filters.responsable) && matches(order.OrderTypeCode || order.OrderTypeText, filters.tipoOt);
        });
        ordersById = new Map(ordersSelected.map(function (row) { return [text(row.OrderId), row]; }));
        list(raw.materials).filter(function (row) {
            return row && ordersById.has(text(row.OrderId)) && (row.IsPublishable === undefined || row.IsPublishable === null || yes(row.IsPublishable));
        }).forEach(function (row) {
            var id = text(row.MaterialRequirementId), materialId = text(row.MaterialId || id), unit = text(row.BaseUnitCode), key = materialId + "|" + comparable(unit), bucket = materialMap.get(key), order = ordersById.get(text(row.OrderId)), assignment = firstAssignment(assignments, text(row.OrderId)), resource = assignment && resourceById.get(text(assignment.ResourceId)), zone = text(resource && (resource.ZoneName || resource.ZoneId)) || "Sin zona";
            if (!bucket) {
                bucket = { key: key, materialId: materialId, material: text(row.MaterialName || row.MaterialId) || "Sin material", categoria: text(row.MaterialCategoryName || row.MaterialCategoryCode) || "Sin categoría", unit: unit, plan: 0, real: 0, orderIds: new Set(), equipmentIds: new Set(), clientIds: new Set(), zones: new Map(), requirements: [] };
                materialMap.set(key, bucket);
            }
            bucket.plan += number(row.PlannedQuantity);
            bucket.orderIds.add(text(row.OrderId));
            bucket.equipmentIds.add(text(order && order.EquipmentId));
            bucket.clientIds.add(text(order && order.CustomerId));
            add(bucket.zones, zone, -number(row.PlannedQuantity));
            requirementZones.set(id, zone);
            requirements.set(id, row);
            bucket.requirements.push(row);
        });
        list(raw.movements).filter(function (row) { return row && text(row.MaterialMovementId) && !yes(row.IsReversal) && inRange(row.MovementDate, currentRange) && requirements.has(text(row.MaterialRequirementId)); }).forEach(function (row) {
            var requirement = requirements.get(text(row.MaterialRequirementId)), unit = text(row.MovementUnitCode || requirement.BaseUnitCode), key = text(requirement.MaterialId || requirement.MaterialRequirementId) + "|" + comparable(unit), bucket = materialMap.get(key), movementValue = net(row), assignment, resource, zone;
            if (!bucket) {
                bucket = { key: key, materialId: text(requirement.MaterialId || requirement.MaterialRequirementId), material: text(requirement.MaterialName || requirement.MaterialId) || "Sin material", categoria: text(requirement.MaterialCategoryName || requirement.MaterialCategoryCode) || "Sin categoría", unit: unit, plan: 0, real: 0, orderIds: new Set(), equipmentIds: new Set(), clientIds: new Set(), zones: new Map(), requirements: [] };
                materialMap.set(key, bucket);
            }
            bucket.real += movementValue;
            bucket.orderIds.add(text(requirement.OrderId));
            assignment = firstAssignment(assignments, text(requirement.OrderId));
            resource = resourceById.get(text(row.ResourceId)) || assignment && resourceById.get(text(assignment.ResourceId));
            zone = text(resource && (resource.ZoneName || resource.ZoneId)) || requirementZones.get(text(row.MaterialRequirementId)) || "Sin zona";
            add(bucket.zones, zone, movementValue);
            movementZones.set(text(row.MaterialMovementId), zone);
        });

        var buckets = Array.from(materialMap.values()).map(function (bucket) {
            bucket.deviation = bucket.real - bucket.plan;
            bucket.variation = bucket.plan > 0 ? bucket.deviation / bucket.plan * 100 : null;
            return bucket;
        }), totalsByUnit = new Map(), paretoByUnit = new Map();
        buckets.forEach(function (bucket) { add(totalsByUnit, comparable(bucket.unit), bucket.deviation); });
        buckets.forEach(function (bucket) {
            var unitKey = comparable(bucket.unit), rows = paretoByUnit.get(unitKey) || [];
            rows.push(bucket); paretoByUnit.set(unitKey, rows);
        });
        paretoByUnit.forEach(function (rows, unitKey) {
            var accumulated = 0, total = totalsByUnit.get(unitKey) || 0;
            rows.sort(function (a, b) { return b.deviation - a.deviation || a.material.localeCompare(b.material, "es"); }).forEach(function (bucket) {
                bucket.contribution = total ? bucket.deviation / total * 100 : 0;
                accumulated += bucket.contribution;
                bucket.accumulated = accumulated;
            });
        });
        buckets.sort(function (a, b) { return b.deviation - a.deviation || a.unit.localeCompare(b.unit) || a.material.localeCompare(b.material, "es"); });
        var shown = buckets.slice(0, 24), allZones = ["NORTE", "CENTRO", "SUR", "OCCIDENTE"], rows = shown.map(function (bucket, index) {
            var zoneValue = function (zone) { return bucket.zones.get(zone) || bucket.zones.get(zone[0] + zone.slice(1).toLowerCase()) || 0; }, status = bucket.deviation > 0 ? "Red" : bucket.deviation < 0 ? "Green" : "Neutral";
            return {
                id: String(index + 1), key: bucket.key, material: bucket.material + (bucket.unit ? " (" + bucket.unit + ")" : ""), icono: icon(bucket.material, bucket.categoria), categoria: bucket.categoria, plan: quantity(bucket.plan), real: quantity(bucket.real), contribucion: Math.min(100, Math.max(0, Math.abs(bucket.contribution || 0))), contribucionTexto: percent(bucket.contribution || 0), acumulado: percent(bucket.accumulated || 0), ot: String(bucket.orderIds.size), elevadores: String(bucket.equipmentIds.size), clientes: String(bucket.clientIds.size), norte: signed(zoneValue(allZones[0])), centro: signed(zoneValue(allZones[1])), sur: signed(zoneValue(allZones[2])), occidente: signed(zoneValue(allZones[3])), total: signed(bucket.deviation), estado: status, norteEstado: zoneValue(allZones[0]) > 0 ? "Red" : zoneValue(allZones[0]) < 0 ? "Green" : "Neutral", centroEstado: zoneValue(allZones[1]) > 0 ? "Red" : zoneValue(allZones[1]) < 0 ? "Green" : "Neutral", surEstado: zoneValue(allZones[2]) > 0 ? "Red" : zoneValue(allZones[2]) < 0 ? "Green" : "Neutral", occidenteEstado: zoneValue(allZones[3]) > 0 ? "Red" : zoneValue(allZones[3]) < 0 ? "Green" : "Neutral", totalEstado: status
            };
        });
        var planSummary = new Map(), realSummary = new Map(), deviationSummary = new Map();
        buckets.forEach(function (bucket) { add(planSummary, bucket.unit, bucket.plan); add(realSummary, bucket.unit, bucket.real); add(deviationSummary, bucket.unit, bucket.deviation); });
        function summary(map) { return Array.from(map.entries()).sort(function (a, b) { return a[0].localeCompare(b[0]); }).map(function (entry) { return quantity(entry[1]) + " " + entry[0]; }).join(" · ") || "Sin datos"; }
        function selectedDetails(bucket) {
            var byRequirement = new Map(), trend = new Map(), equipment = new Set(), clients = new Set(), zones = new Set();
            bucket.requirements.forEach(function (requirement) {
                var order = ordersById.get(text(requirement.OrderId)), assignment = firstAssignment(assignments, text(requirement.OrderId)), resource = assignment && resourceById.get(text(assignment.ResourceId)), zone = text(resource && (resource.ZoneName || resource.ZoneId)) || requirementZones.get(text(requirement.MaterialRequirementId)) || "Sin zona", key = text(requirement.MaterialRequirementId), row = { requirement: requirement, order: order, resource: resource, zone: zone, plan: number(requirement.PlannedQuantity), real: 0, movementDate: null };
                byRequirement.set(key, row);
                add(trend, weekKey(requirement.RequiredDate || order && order.PlannedStartDate), number(requirement.PlannedQuantity) * -1);
            });
            list(raw.movements).filter(function (movement) { return movement && !yes(movement.IsReversal) && requirements.has(text(movement.MaterialRequirementId)) && inRange(movement.MovementDate, currentRange); }).forEach(function (movement) {
                var requirement = requirements.get(text(movement.MaterialRequirementId)), unit = text(movement.MovementUnitCode || requirement.BaseUnitCode), key = text(requirement.MaterialId || requirement.MaterialRequirementId) + "|" + comparable(unit), detail;
                if (key !== bucket.key) { return; }
                detail = byRequirement.get(text(movement.MaterialRequirementId));
                if (detail) { detail.real += net(movement); if (!detail.movementDate) { detail.movementDate = movement.MovementDate; } }
                add(trend, weekKey(movement.MovementDate), net(movement));
            });
            var detailRows = Array.from(byRequirement.values()).map(function (row) {
                var order = row.order || {}, resource = row.resource || {}, deviation = row.real - row.plan, variation = row.plan > 0 ? deviation / row.plan * 100 : null;
                equipment.add(text(order.EquipmentId)); clients.add(text(order.CustomerId)); zones.add(row.zone);
                return { fecha: dateText(date(row.movementDate || row.requirement.RequiredDate || order.PlannedStartDate) || currentRange.startDate), plan: quantity(row.plan), real: quantity(row.real), zona: row.zone, cliente: text(order.CustomerName || order.SiteName || order.CustomerId) || "Sin cliente", responsable: text(resource.ResourceName || resource.ResourceId) || "Sin responsable", ot: text(order.OrderId), elevador: text(order.EquipmentName || order.EquipmentId) || "Sin equipo", varPzas: signed(deviation), varPct: variation === null ? "Sin plan" : signedPercent(variation) };
            }).sort(function (a, b) { return a.fecha.localeCompare(b.fecha) || a.ot.localeCompare(b.ot); });
            var weekRows = Array.from(trend.entries()).filter(function (entry) { return entry[0]; }).map(function (entry) { return { key: entry[0], start: new Date(entry[0] + "T00:00:00"), value: entry[1] }; }).sort(function (a, b) { return a.start - b.start; }).slice(-5).map(function (entry, index) { return { key: entry.key, semana: "Semana " + (index + 1), periodo: weekLabel(entry.start), plan: 0, real: 0, variacion: entry.value }; });
            /* Para conservar la serie separada, se vuelven a sumar plan y real por semana. */
            bucket.requirements.forEach(function (requirement) {
                var wk = weekKey(requirement.RequiredDate || ordersById.get(text(requirement.OrderId)) && ordersById.get(text(requirement.OrderId)).PlannedStartDate), match = weekRows.filter(function (item) { return item.key === wk; })[0];
                if (match) { match.plan += number(requirement.PlannedQuantity); }
            });
            list(raw.movements).filter(function (movement) { return movement && !yes(movement.IsReversal) && inRange(movement.MovementDate, currentRange) && requirements.has(text(movement.MaterialRequirementId)); }).forEach(function (movement) {
                var requirement = requirements.get(text(movement.MaterialRequirementId)), key = text(requirement.MaterialId || requirement.MaterialRequirementId) + "|" + comparable(text(movement.MovementUnitCode || requirement.BaseUnitCode)), match = weekRows.filter(function (item) { return item.key === weekKey(movement.MovementDate); })[0];
                if (key === bucket.key && match) { match.real += net(movement); }
            });
            weekRows.forEach(function (item) { item.variacion = item.real - item.plan; });
            return { key: bucket.key, material: bucket.material, categoria: bucket.categoria, unit: bucket.unit, plan: bucket.plan, real: bucket.real, deviation: bucket.deviation, variation: bucket.variation, details: detailRows, weeks: weekRows, stats: { weeks: weekRows.length, equipment: equipment.size, clients: clients.size, zones: zones.size } };
        }
        buckets.forEach(function (bucket) { detailsByMaterial[bucket.key] = selectedDetails(bucket); });
        var defaultKey = rows.length ? rows[0].key : "", selected = detailsByMaterial[defaultKey] || { material: "Sin datos", categoria: "Sin categoría", unit: "", plan: 0, real: 0, deviation: 0, variation: null, details: [], weeks: [], stats: { weeks: 0, equipment: 0, clients: 0, zones: 0 } }, zoneTotals = allZones.map(function (zone) { return buckets.reduce(function (sum, bucket) { return sum + (bucket.zones.get(zone) || bucket.zones.get(zone[0] + zone.slice(1).toLowerCase()) || 0); }, 0); });

        return {
            filtros: { periodo: filters.periodo, fechaDesde: dateText(currentRange.startDate), fechaHasta: dateText(currentRange.endDate), zona: filters.zona, cliente: filters.cliente, responsable: filters.responsable, tipoOt: filters.tipoOt },
            opciones: { periodos: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }], zonas: options(daily, "ZoneId", "ZoneName", "Todas"), clientes: options(allOrders, "CustomerId", "CustomerName", "Todos"), responsables: options(daily, "ResourceId", "ResourceName", "Todos"), tiposOt: options(allOrders, "OrderTypeCode", "OrderTypeText", "Todas") },
            kpis: { planTotal: summary(planSummary), realTotal: summary(realSummary), desviacionTotal: summary(deviationSummary), planBase: "Totales separados por unidad", realBase: "Consumo neto por unidad", desviacionPct: "Variación calculada por unidad" },
            materialesDesviacion: rows,
            detalleConsumo: selected.details,
            tendenciaSemanal: selected.weeks,
            seleccion: selected,
            detailsByMaterial: detailsByMaterial,
            resumenTabla: { label: "Totales por unidad (" + rows.length + " materiales)", plan: summary(planSummary), real: summary(realSummary), ot: String(new Set([].concat.apply([], buckets.map(function (bucket) { return Array.from(bucket.orderIds); }))).size), equipos: String(new Set([].concat.apply([], buckets.map(function (bucket) { return Array.from(bucket.equipmentIds); }))).size), clientes: String(new Set([].concat.apply([], buckets.map(function (bucket) { return Array.from(bucket.clientIds); }))).size), deviation: summary(deviationSummary), zones: zoneTotals.map(signed) },
            meta: { unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [], selectedMaterialKey: defaultKey, unitsMixed: planSummary.size > 1 || realSummary.size > 1 }
        };
    }
    return { build: build, range: range, emptyRaw: emptyRaw };
});
