sap.ui.define([], function () {
    "use strict";

    /*
     * Consumo de materiales - reglas del ViewModel.
     * El plan pertenece a DashboardOrderMaterialsSet y el consumo real a
     * DashboardMaterialMovementsSet. Las cantidades nunca se suman entre
     * unidades distintas (por ejemplo PZA y L).
     */
    function list(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return value === null || value === undefined ? "" : String(value).trim(); }
    function norm(value) { return text(value).toUpperCase(); }
    function comparable(value) {
        var valueText = norm(value);
        return valueText.normalize ? valueText.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : valueText;
    }
    function number(value) {
        var parsed = Number(String(value === null || value === undefined ? 0 : value).replace(",", "."));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    function yes(value) { return value === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(norm(value)) >= 0; }
    function date(value) {
        var match, result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ?
            new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result;
    }
    function parseDate(value, fallback) {
        var match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/), iso;
        if (match) { return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])); }
        iso = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (iso) { return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3])); }
        return new Date(fallback.getTime());
    }
    function dateText(value) { return String(value.getDate()).padStart(2, "0") + "/" + String(value.getMonth() + 1).padStart(2, "0") + "/" + value.getFullYear(); }
    function inRange(value, range) {
        var current = date(value);
        return !!current && current >= range.startDate && current <= range.endDate;
    }
    function range(input) {
        var filters = Object.assign({ periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026" }, input || {}), year = String(filters.periodo || "").match(/^(\d{4})/), start, end;
        start = parseDate(filters.fechaDesde, new Date(Number(year && year[1] || 2026), 0, 1));
        end = parseDate(filters.fechaHasta, new Date(Number(year && year[1] || 2026), 11, 31));
        end.setHours(23, 59, 59, 999);
        return { startDate: start, endDate: end };
    }
    function isAll(value) { return ["", "ALL", "TODAS", "TODOS"].indexOf(norm(value)) >= 0; }
    function matches(value, filter) { return isAll(filter) || comparable(value) === comparable(filter); }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function round(value, decimals) {
        var factor = Math.pow(10, decimals === undefined ? 1 : decimals);
        return Math.round((Number(value) || 0) * factor) / factor;
    }
    function quantity(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(round(value)); }
    function quantityWithUnit(value, unit) { return quantity(value) + (text(unit) ? " " + text(unit) : ""); }
    function signedQuantity(value, unit) { return (value > 0 ? "+" : "") + quantityWithUnit(value, unit); }
    function percent(value) { return round(value).toFixed(1) + "%"; }
    function signedPercent(value) { return (value > 0 ? "+" : "") + percent(value); }
    function ratio(value, total) { return total > 0 ? value / total * 100 : 0; }
    function activeInRange(row, currentRange) {
        var from = date(row && row.ValidFrom), until = date(row && row.ValidTo);
        return (!from || from <= currentRange.endDate) && (!until || until >= currentRange.startDate);
    }
    function assignmentRank(row) {
        return (norm(row && row.AssignmentTypeCode) === "PLANNED" ? 0 : 10) +
            (norm(row && row.RoleCode) === "LEAD_MECHANIC" ? 0 : 1);
    }
    function firstAssignment(assignments, orderId) {
        var chosen;
        assignments.forEach(function (row) {
            if (text(row.OrderId) !== orderId) { return; }
            if (!chosen || assignmentRank(row) < assignmentRank(chosen)) { chosen = row; }
        });
        return chosen;
    }
    function orderInfo(order) {
        return {
            typeCode: text(order && order.OrderTypeCode),
            type: text(order && (order.OrderTypeText || order.OrderTypeCode)) || "Sin tipo",
            client: text(order && (order.SiteName || order.CustomerName || order.SiteId || order.CustomerId)) || "Sin cliente / sitio"
        };
    }
    function categoryIcon(name) {
        var category = comparable(name);
        if (category.indexOf("REFACC") >= 0) { return "sap-icon://action-settings"; }
        if (category.indexOf("CONSUM") >= 0) { return "sap-icon://product"; }
        if (category.indexOf("LUBRIC") >= 0 || category.indexOf("ACEITE") >= 0 || category.indexOf("GRASA") >= 0) { return "sap-icon://blur"; }
        if (category.indexOf("HERRAMIENT") >= 0) { return "sap-icon://wrench"; }
        return "sap-icon://product";
    }
    function optionRows(records, idField, labelField, allKey, allText) {
        var map = new Map([[allKey, allText]]);
        records.forEach(function (row) {
            var id = text(row && row[idField]);
            if (id) { map.set(id, text(row[labelField]) || id); }
        });
        return Array.from(map.entries()).map(function (item) { return { key: item[0], text: item[1] }; })
            .sort(function (a, b) { return a.key === allKey ? -1 : b.key === allKey ? 1 : a.text.localeCompare(b.text, "es"); });
    }
    function materialCause(cause, currentRange) {
        return cause && activeInRange(cause, currentRange) && comparable(cause.CauseContextCode) === "MATERIAL";
    }
    function netMovement(movement) {
        var direction = comparable(movement && movement.MovementDirectionCode), value = number(movement && movement.MovementQuantity);
        return ["RETURN", "IN", "ENTRADA", "DEVOLUCION", "DEVOLUCION DE MATERIAL"].indexOf(direction) >= 0 ? -value : value;
    }
    function categoryBucket(buckets, category, unit) {
        var categoryName = text(category) || "Sin categoría", unitName = text(unit), key = comparable(categoryName) + "|" + comparable(unitName), bucket = buckets.get(key);
        if (!bucket) {
            bucket = { key: key, category: categoryName, unit: unitName, plan: 0, real: 0, requirementIds: new Set(), materialIds: new Set(), orderIds: new Set() };
            buckets.set(key, bucket);
        }
        return bucket;
    }
    function materialBucket(buckets, requirement, unit) {
        var materialId = text(requirement.MaterialId || requirement.MaterialRequirementId), unitName = text(unit), key = materialId + "|" + comparable(unitName), bucket = buckets.get(key);
        if (!bucket) {
            bucket = {
                key: key,
                materialId: materialId,
                material: text(requirement.MaterialName || requirement.MaterialId) || "Sin material",
                category: text(requirement.MaterialCategoryName || requirement.MaterialCategoryCode) || "Sin categoría",
                criticality: comparable(requirement.MaterialCriticalityCode),
                unit: unitName,
                plan: 0,
                real: 0,
                orderIds: new Set(),
                requirementIds: new Set()
            };
            buckets.set(key, bucket);
        }
        return bucket;
    }
    function stateForVariation(value) { return value > 0 ? "Error" : "Success"; }
    function emptyRaw() {
        return { orders: [], materials: [], movements: [], causes: [], assignments: [], resources: [], catalogs: [], meta: { unavailableEntitySets: [] } };
    }

    function build(raw, input) {
        raw = raw || emptyRaw();
        var filters = Object.assign({ periodo: "2026", fechaDesde: "01/01/2026", fechaHasta: "31/12/2026", zona: "TODAS", supervisor: "TODOS", tipoOrden: "TODAS" }, input || {}), currentRange = range(filters), periodResources = list(raw.resources).filter(function (row) { return row && inRange(row.WorkDate, currentRange); }), resourcesById = new Map(), allAssignments, allOrders, selectedOrders, selectedOrderIds, requirements = new Map(), selectedRequirements, categoryBuckets = new Map(), materialBuckets = new Map(), orderBuckets = new Map(), zoneBuckets = new Map(), movementIds = new Set(), materialCauseOrderIds = new Set();

        periodResources.forEach(function (row) {
            var id = text(row.ResourceId), old = resourcesById.get(id), currentDate = date(row.WorkDate), oldDate = old && date(old.WorkDate);
            if (id && (!old || currentDate > oldDate)) { resourcesById.set(id, row); }
        });

        allAssignments = list(raw.assignments).filter(function (row) { return row && text(row.OrderId) && text(row.ResourceId) && activeInRange(row, currentRange); });
        allOrders = list(raw.orders).filter(function (row) { return row && inRange(row.PlannedStartDate, currentRange); });
        selectedOrders = allOrders.filter(function (order) {
            var assignment, resource, orderZone = order.Zona || order.ZoneId || order.ZoneName, orderSupervisor = order.SupervisorId || order.SupervisorName;
            if (!matches(order.OrderTypeCode || order.OrderTypeText, filters.tipoOrden)) { return false; }
            assignment = firstAssignment(allAssignments, text(order.OrderId));
            resource = assignment && resourcesById.get(text(assignment.ResourceId));
            if (!matches(resource ? (resource.ZoneId || resource.ZoneName) : orderZone, filters.zona)) { return false; }
            if (!matches(resource ? (resource.SupervisorId || resource.SupervisorName) : orderSupervisor, filters.supervisor)) { return false; }
            return true;
        });
        selectedOrderIds = new Set(selectedOrders.map(function (row) { return text(row.OrderId); }));

        list(raw.causes).filter(function (cause) { return materialCause(cause, currentRange) && selectedOrderIds.has(text(cause.OrderId)); }).forEach(function (cause) {
            materialCauseOrderIds.add(text(cause.OrderId));
        });

        list(raw.materials).filter(function (row) {
            return row && selectedOrderIds.has(text(row.OrderId)) && (row.IsPublishable === undefined || row.IsPublishable === null || yes(row.IsPublishable));
        }).forEach(function (row) { requirements.set(text(row.MaterialRequirementId), row); });
        selectedRequirements = Array.from(requirements.values());

        selectedRequirements.forEach(function (requirement) {
            var unit = text(requirement.BaseUnitCode), category = categoryBucket(categoryBuckets, requirement.MaterialCategoryName || requirement.MaterialCategoryCode, unit), material = materialBucket(materialBuckets, requirement, unit), orderKey = text(requirement.OrderId) + "|" + comparable(unit), orderBucket = orderBuckets.get(orderKey);
            category.plan += number(requirement.PlannedQuantity);
            category.requirementIds.add(text(requirement.MaterialRequirementId));
            category.materialIds.add(text(requirement.MaterialId || requirement.MaterialRequirementId));
            category.orderIds.add(text(requirement.OrderId));
            material.plan += number(requirement.PlannedQuantity);
            material.orderIds.add(text(requirement.OrderId));
            material.requirementIds.add(text(requirement.MaterialRequirementId));
            if (!orderBucket) {
                orderBucket = { orderId: text(requirement.OrderId), unit: unit, plan: 0, real: 0, materialIds: new Set(), categories: new Set() };
                orderBuckets.set(orderKey, orderBucket);
            }
            orderBucket.plan += number(requirement.PlannedQuantity);
            orderBucket.materialIds.add(text(requirement.MaterialId || requirement.MaterialRequirementId));
            orderBucket.categories.add(text(requirement.MaterialCategoryName || requirement.MaterialCategoryCode) || "Sin categoría");
        });

        list(raw.movements).filter(function (movement) {
            return movement && text(movement.MaterialMovementId) && !yes(movement.IsReversal) && inRange(movement.MovementDate, currentRange) && requirements.has(text(movement.MaterialRequirementId));
        }).forEach(function (movement) {
            var requirement = requirements.get(text(movement.MaterialRequirementId)), unit = text(movement.MovementUnitCode || requirement.BaseUnitCode), net = netMovement(movement), category = categoryBucket(categoryBuckets, requirement.MaterialCategoryName || requirement.MaterialCategoryCode, unit), material = materialBucket(materialBuckets, requirement, unit), orderKey = text(requirement.OrderId) + "|" + comparable(unit), orderBucket = orderBuckets.get(orderKey), resource, zone, zoneBucket;
            category.real += net;
            category.requirementIds.add(text(requirement.MaterialRequirementId));
            category.materialIds.add(text(requirement.MaterialId || requirement.MaterialRequirementId));
            category.orderIds.add(text(requirement.OrderId));
            material.real += net;
            material.orderIds.add(text(requirement.OrderId));
            material.requirementIds.add(text(requirement.MaterialRequirementId));
            if (!orderBucket) {
                orderBucket = { orderId: text(requirement.OrderId), unit: unit, plan: 0, real: 0, materialIds: new Set(), categories: new Set() };
                orderBuckets.set(orderKey, orderBucket);
            }
            orderBucket.real += net;
            orderBucket.materialIds.add(text(requirement.MaterialId || requirement.MaterialRequirementId));
            orderBucket.categories.add(text(requirement.MaterialCategoryName || requirement.MaterialCategoryCode) || "Sin categoría");
            resource = resourcesById.get(text(movement.ResourceId));
            if (!resource) {
                var assignment = firstAssignment(allAssignments, text(requirement.OrderId));
                resource = assignment && resourcesById.get(text(assignment.ResourceId));
            }
            zone = text(resource && (resource.ZoneName || resource.ZoneId)) || "Sin zona";
            zoneBucket = zoneBuckets.get(zone) || { zona: zone, zonaKey: comparable(zone).toLowerCase().replace(/[^a-z0-9]+/g, "-"), categories: new Map(), units: new Set() };
            add(zoneBucket.categories, comparable(requirement.MaterialCategoryName || requirement.MaterialCategoryCode) + "|" + comparable(unit), net);
            zoneBucket.units.add(unit);
            zoneBuckets.set(zone, zoneBucket);
            movementIds.add(text(movement.MaterialMovementId));
        });

        var categoryRows = Array.from(categoryBuckets.values()).map(function (row) {
            var variation = row.plan > 0 ? (row.real - row.plan) / row.plan * 100 : null;
            return Object.assign(row, { variation: variation });
        }).sort(function (a, b) { return Math.abs(b.real - b.plan) - Math.abs(a.real - a.plan) || a.category.localeCompare(b.category, "es"); });
        var visualMaximum = Math.max.apply(Math, [1].concat(categoryRows.map(function (row) { return Math.max(row.plan, row.real); })));
        var materialRows = Array.from(materialBuckets.values()).map(function (row) {
            var variation = row.plan > 0 ? (row.real - row.plan) / row.plan * 100 : null;
            return Object.assign(row, { variation: variation });
        });
        var materialCritical = materialRows.filter(function (row) { return ["HIGH", "CRITICAL", "ALTA", "CRITICA", "CRÍTICA"].indexOf(row.criticality) >= 0 && row.variation !== null && row.variation > 0; })
            .sort(function (a, b) { return b.variation - a.variation || b.real - b.plan; })[0];
        var overPlan = categoryRows.filter(function (row) { return row.plan > 0 && row.real > row.plan; });
        var materialsVsPlan = categoryRows.slice(0, 5).map(function (row) {
            return {
                material: row.category + (row.unit ? " (" + row.unit + ")" : ""),
                icono: categoryIcon(row.category),
                planTexto: quantityWithUnit(row.plan, row.unit),
                realTexto: quantityWithUnit(row.real, row.unit),
                planPorcentaje: Math.min(100, Math.max(0, row.plan / visualMaximum * 100)),
                realPorcentaje: Math.min(100, Math.max(0, row.real / visualMaximum * 100)),
                variacionTexto: row.variation === null ? "Sin plan" : signedPercent(row.variation),
                estado: row.variation === null ? "None" : stateForVariation(row.variation)
            };
        });
        var typeBuckets = new Map();
        Array.from(orderBuckets.values()).forEach(function (row) {
            var order = selectedOrders.filter(function (item) { return text(item.OrderId) === row.orderId; })[0], info = orderInfo(order), key = info.typeCode + "|" + comparable(row.unit), bucket = typeBuckets.get(key);
            if (!bucket) { bucket = { tipo: info.type, typeCode: info.typeCode, unit: row.unit, real: 0, orderIds: new Set() }; typeBuckets.set(key, bucket); }
            bucket.real += row.real;
            bucket.orderIds.add(row.orderId);
        });
        var typeRows = Array.from(typeBuckets.values()).filter(function (row) { return row.real !== 0; }).sort(function (a, b) { return a.tipo.localeCompare(b.tipo, "es") || a.unit.localeCompare(b.unit); });
        var totalAbsConsumption = typeRows.reduce(function (sum, row) { return sum + Math.abs(row.real); }, 0);
        var colors = ["Blue", "Green", "Orange", "Purple", "Red"];
        var consumoTipoOrden = typeRows.map(function (row, index) {
            var visual = ratio(Math.abs(row.real), totalAbsConsumption);
            return { tipo: row.tipo + (row.unit ? " (" + row.unit + ")" : ""), totalTexto: quantityWithUnit(row.real, row.unit), porcentajeTexto: "(" + round(visual).toFixed(0) + "%)", porcentaje: visual, estado: colors[index % colors.length] };
        });
        var topMateriales = materialRows.filter(function (row) { return row.variation !== null; }).sort(function (a, b) { return b.variation - a.variation || Math.abs(b.real - b.plan) - Math.abs(a.real - a.plan); }).slice(0, 5).map(function (row, index) {
            return { id: String(index + 1), material: row.material + (row.unit ? " (" + row.unit + ")" : ""), plan: quantityWithUnit(row.plan, row.unit), real: quantityWithUnit(row.real, row.unit), variacion: signedPercent(row.variation), estado: stateForVariation(row.variation) };
        });
        var topOrdenesMayorConsumo = Array.from(orderBuckets.values()).filter(function (row) { return row.real > 0; }).sort(function (a, b) { return a.unit.localeCompare(b.unit) || b.real - a.real || a.orderId.localeCompare(b.orderId); }).slice(0, 5).map(function (row, index) {
            var info = orderInfo(selectedOrders.filter(function (order) { return text(order.OrderId) === row.orderId; })[0]);
            return { id: String(index + 1), ot: row.orderId, tipo: info.type, cliente: info.client, consumo: quantityWithUnit(row.real, row.unit) };
        });
        var topOrdenesMenorConsumo = Array.from(orderBuckets.values()).filter(function (row) { return row.plan > 0; }).map(function (row) { return Object.assign(row, { variation: (row.real - row.plan) / row.plan * 100 }); }).sort(function (a, b) { return a.unit.localeCompare(b.unit) || a.variation - b.variation || a.orderId.localeCompare(b.orderId); }).slice(0, 5).map(function (row, index) {
            return { id: String(index + 1), ot: row.orderId, plan: quantityWithUnit(row.plan, row.unit), real: quantityWithUnit(row.real, row.unit), variacion: signedPercent(row.variation), estado: stateForVariation(row.variation) };
        });
        var categoryAliases = { refacciones: ["REFACC"], consumibles: ["CONSUM"], lubricantes: ["LUBRIC", "ACEITE", "GRASA"], herramientas: ["HERRAMIENT"] };
        var consumoZona = Array.from(zoneBuckets.values()).sort(function (a, b) { return a.zona.localeCompare(b.zona, "es"); }).map(function (row) {
            var result = { zona: row.zona, zonaKey: row.zonaKey, refacciones: "—", consumibles: "—", lubricantes: "—", herramientas: "—", total: row.units.size <= 1 ? "0" : "No aditivo" };
            Object.keys(categoryAliases).forEach(function (field) {
                var sum = 0, units = new Set();
                row.categories.forEach(function (value, key) {
                    var parts = key.split("|"), isMatch = categoryAliases[field].some(function (alias) { return parts[0].indexOf(alias) >= 0; });
                    if (isMatch) { sum += value; units.add(parts[1]); }
                });
                if (units.size === 1) { result[field] = quantity(sum); }
            });
            if (row.units.size <= 1) {
                var total = 0;
                row.categories.forEach(function (value) { total += value; });
                result.total = quantity(total) + (Array.from(row.units)[0] ? " " + Array.from(row.units)[0] : "");
            }
            return result;
        });
        var causesByText = new Map();
        list(raw.causes).filter(function (cause) { return materialCause(cause, currentRange) && selectedOrderIds.has(text(cause.OrderId)); }).forEach(function (cause) {
            var causeName = text(cause.CauseText || cause.CauseCode) || "Causa de material";
            var current = causesByText.get(causeName) || new Set();
            current.add(text(cause.OrderId));
            causesByText.set(causeName, current);
        });
        var otAfectadas = Array.from(causesByText.entries()).map(function (entry) { return { estadoNombre: entry[0], ot: entry[1].size }; }).sort(function (a, b) { return b.ot - a.ot || a.estadoNombre.localeCompare(b.estadoNombre, "es"); });

        return {
            filtros: { periodo: filters.periodo, fechaDesde: dateText(currentRange.startDate), fechaHasta: dateText(currentRange.endDate), zona: filters.zona, supervisor: filters.supervisor, tipoOrden: filters.tipoOrden },
            opciones: {
                periodos: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
                zonas: optionRows(periodResources, "ZoneId", "ZoneName", "TODAS", "Todas"),
                supervisores: optionRows(periodResources, "SupervisorId", "SupervisorName", "TODOS", "Todos"),
                tiposOrden: optionRows(allOrders, "OrderTypeCode", "OrderTypeText", "TODAS", "Todas")
            },
            ui: { materialesInfoVisible: false },
            kpis: {
                otAfectadas: String(materialCauseOrderIds.size),
                materialCritico: materialCritical ? materialCritical.material : "Sin definir",
                materialCriticoDelta: materialCritical ? signedQuantity(materialCritical.real - materialCritical.plan, materialCritical.unit) : "Sin datos",
                materialCriticoUnidad: materialCritical ? materialCritical.unit : "",
                categoriasSobrePlan: overPlan.length + " de " + categoryRows.length
            },
            materialesVsPlan: materialsVsPlan,
            consumoTipoOrden: consumoTipoOrden,
            otAfectadas: otAfectadas,
            topMateriales: topMateriales,
            topOrdenesMayorConsumo: topOrdenesMayorConsumo,
            topOrdenesMenorConsumo: topOrdenesMenorConsumo,
            consumoZona: consumoZona,
            meta: {
                orders: selectedOrders.length,
                materialRequirements: selectedRequirements.length,
                movementCount: movementIds.size,
                unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [],
                unitsAreMixed: new Set(categoryRows.map(function (row) { return comparable(row.unit); })).size > 1
            }
        };
    }

    return { build: build, range: range, emptyRaw: emptyRaw };
});
