sap.ui.define([], function () {
    "use strict";

    var DEFAULTS = {
        periodo: "2026",
        fechaDesde: "2026-01-01",
        fechaHasta: "2026-12-31",
        gerencia: "ALL",
        jefatura: "ALL",
        supervisor: "ALL",
        tipoServicio: "ALL"
    };

    function list(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return String(value === undefined || value === null ? "" : value).trim(); }
    function normal(value) { return text(value).toUpperCase(); }
    function comparable(value) {
        var result = normal(value);
        return result.normalize ? result.normalize("NFD").replace(/[\u0300-\u036f]/g, "") : result;
    }
    function number(value) {
        var result = Number(String(value === undefined || value === null ? 0 : value).replace(",", "."));
        return Number.isFinite(result) ? result : 0;
    }
    function yes(value) { return value === true || ["X", "1", "TRUE", "SI", "SÍ"].indexOf(normal(value)) >= 0; }
    function date(value) {
        var match, result;
        if (!value) { return null; }
        if (value instanceof Date) { return new Date(value.getTime()); }
        match = String(value).match(/\/Date\((-?\d+)/);
        result = match ? new Date(Number(match[1])) : new Date(value);
        if (Number.isNaN(result.getTime())) { return null; }
        return result.getUTCHours() === 0 && result.getUTCMinutes() === 0 ? new Date(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()) : result;
    }
    function iso(value, fallback) {
        var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(fallback.getTime());
    }
    function range(input) {
        var filters = Object.assign({}, DEFAULTS, input || {}), start = iso(filters.fechaDesde, new Date(2026, 0, 1)), end = iso(filters.fechaHasta, new Date(2026, 11, 31));
        end.setHours(23, 59, 59, 999);
        return { filters: filters, start: start, end: end };
    }
    function inRange(value, start, end) { var current = date(value); return Boolean(current && current >= start && current <= end); }
    function isAll(value) { return ["ALL", "TODAS", "TODOS", ""].indexOf(normal(value)) >= 0; }
    function match(filter, value) { return isAll(filter) || comparable(filter) === comparable(value); }
    function hours(value, unit) {
        var code = normal(unit), amount = number(value);
        if (["MIN", "M", "MINUTE", "MINUTES"].indexOf(code) >= 0) { return amount / 60; }
        if (["S", "SEC", "SECOND", "SECONDS"].indexOf(code) >= 0) { return amount / 3600; }
        return amount;
    }
    function round(value) { return Math.round((Number(value) || 0) * 10) / 10; }
    function display(value) { return new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 }).format(round(value)); }
    function displayHours(value) { return display(value) + " h"; }
    function displayPercent(value) { return round(value).toFixed(1) + "%"; }
    function ratio(numerator, denominator) { return denominator > 0 ? numerator / denominator * 100 : 0; }
    function operationLinkKey(item) { return [text(item.OrderId), text(item.RoutingNumber), text(item.OperationCounter || item.OperationNumber)].join("|"); }
    function operationKey(item) { return text(item.OperationKey || operationLinkKey(item)); }
    function assignmentPriority(item) { return (normal(item.AssignmentTypeCode) === "PLANNED" ? 0 : 10) + (normal(item.RoleCode) === "LEAD_MECHANIC" ? 0 : 1); }
    function operationPriority(item) {
        var source = normal(item && item.PlannedSourceCode);
        return source.indexOf("AFVV") >= 0 ? 0 : source.indexOf("KBED") >= 0 ? 1 : 2;
    }
    function assignmentValid(item, end) {
        var from = date(item && item.ValidFrom), to = date(item && item.ValidTo);
        return item && item.OrderId && item.ResourceId && (!from || from <= end) && (!to || to >= end);
    }
    function capacityValid(item) { return item && (item.CapacitySourceValidated === undefined || item.CapacitySourceValidated === null || item.CapacitySourceValidated === "" || yes(item.CapacitySourceValidated)); }
    function activeOrder(order) {
        var app = normal(order && order.AppStatusCode), sap = normal(order && order.SapUserStatusCode);
        return ["0100", "0200", "0400"].indexOf(app) >= 0 || ["E0013", "E0014"].indexOf(sap) >= 0;
    }
    function options(records, idField, textField, allText) {
        var values = new Map([["ALL", allText]]);
        list(records).forEach(function (record) {
            var key = text(record && record[idField]);
            if (key) { values.set(key, text(record[textField]) || key); }
        });
        return Array.from(values.entries()).map(function (entry) { return { key: entry[0], text: entry[1] }; });
    }
    function limits(catalogs, end) {
        var result = { low: 70, normal: 100, high: 120 };
        list(catalogs).filter(function (row) {
            var from = date(row.ValidFrom), to = date(row.ValidTo);
            return yes(row.Active) && ["UTILIZATION_THRESHOLD", "UTILIZATION_BAND"].indexOf(normal(row.FilterDomain)) >= 0 && (!from || from <= end) && (!to || to >= end);
        }).forEach(function (row) {
            var id = normal(row.ValueId), value = number(row.NumericValue);
            if (!value) { return; }
            if (["LOW", "LOW_MAX", "BAJO"].indexOf(id) >= 0) { result.low = value; }
            if (["NORMAL", "NORMAL_MAX"].indexOf(id) >= 0) { result.normal = value; }
            if (["HIGH", "HIGH_MAX", "ALTO", "CRITICAL"].indexOf(id) >= 0) { result.high = value; }
        });
        return result;
    }
    function resourceStatus(utilization, thresholds) {
        if (utilization <= thresholds.low) { return "Bajo"; }
        if (utilization <= thresholds.normal) { return "Normal"; }
        if (utilization <= thresholds.high) { return "Alto"; }
        return "Crítico";
    }
    function materialState(variation) {
        if (variation === null) { return { text: "Sin plan", state: "Information" }; }
        if (variation > 15) { return { text: "Atención", state: "Warning" }; }
        return { text: "En objetivo", state: "Success" };
    }
    function add(map, key, value) { map.set(key, (map.get(key) || 0) + value); }
    function firstAssignmentForOrder(assignments, orderId) {
        var selected;
        assignments.forEach(function (assignment) {
            if (text(assignment.OrderId) !== orderId) { return; }
            if (!selected || assignmentPriority(assignment) < assignmentPriority(selected)) { selected = assignment; }
        });
        return selected;
    }

    function build(raw, input) {
        var context = range(input), filters = context.filters, thresholds = limits(raw.catalogs, context.end), allDaily = list(raw.resources).filter(function (row) { return row && inRange(row.WorkDate, context.start, context.end); }), daily = allDaily.filter(function (row) {
            return match(filters.gerencia, row.ManagementId || row.ManagementName) && match(filters.jefatura, row.HeadshipId || row.HeadshipName) && match(filters.supervisor, row.SupervisorId || row.SupervisorName);
        }), resourceLatest = new Map(), resourceData = new Map(), ordersById = new Map(), selectedOrderIds, assignments = new Map(), operations = new Map(), resourceLoad = new Map(), resourceOrders = new Map(), resourceServiceLoad = new Map();

        daily.forEach(function (row) {
            var resourceId = text(row.ResourceId), current = resourceLatest.get(resourceId), item = resourceData.get(resourceId);
            if (!item) {
                item = { id: resourceId, nombre: text(row.ResourceName) || resourceId || "Sin recurso", tipoRecurso: text(row.ResourceTypeName || row.ResourceTypeCode) || "Sin tipo", capacity: 0, load: 0, orders: new Set() };
                resourceData.set(resourceId, item);
            }
            if (capacityValid(row)) { item.capacity += number(row.CapacityHours); }
            if (resourceId && (!current || (date(row.WorkDate) || new Date(0)) > (date(current.WorkDate) || new Date(0)))) { resourceLatest.set(resourceId, row); }
        });
        list(raw.orders).filter(function (row) {
            return row && inRange(row.PlannedStartDate, context.start, context.end) && match(filters.tipoServicio, row.OrderTypeCode || row.OrderTypeText);
        }).forEach(function (row) { ordersById.set(text(row.OrderId), row); });
        selectedOrderIds = new Set(ordersById.keys());

        list(raw.assignments).filter(function (row) {
            return assignmentValid(row, context.end) && selectedOrderIds.has(text(row.OrderId)) && resourceData.has(text(row.ResourceId));
        }).forEach(function (row) {
            var key = operationLinkKey(row), old = assignments.get(key);
            if (!old || assignmentPriority(row) < assignmentPriority(old)) { assignments.set(key, row); }
        });
        list(raw.operations).filter(function (row) {
            return row && selectedOrderIds.has(text(row.OrderId)) && (!row.PlannedStartDate || inRange(row.PlannedStartDate, context.start, context.end));
        }).forEach(function (row) {
            var key = operationKey(row), old = operations.get(key);
            if (!old || operationPriority(row) < operationPriority(old)) { operations.set(key, row); }
        });

        assignments.forEach(function (assignment) {
            var resourceId = text(assignment.ResourceId), resource = resourceData.get(resourceId), order = ordersById.get(text(assignment.OrderId));
            if (!resource || !order) { return; }
            if (activeOrder(order)) { resource.orders.add(text(order.OrderId)); }
        });
        operations.forEach(function (operation) {
            var assignment = assignments.get(operationLinkKey(operation)), resource, order, load, type;
            if (!assignment) { return; }
            resource = resourceData.get(text(assignment.ResourceId));
            order = ordersById.get(text(operation.OrderId));
            if (!resource || !order) { return; }
            load = hours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal);
            type = text(order.OrderTypeText || order.OrderTypeCode) || "Sin tipo";
            resource.load += load;
            add(resourceLoad, text(assignment.ResourceId), load);
            if (!resourceServiceLoad.has(resource.id)) { resourceServiceLoad.set(resource.id, new Map()); }
            add(resourceServiceLoad.get(resource.id), type, load);
        });
        assignments.forEach(function (assignment) {
            var resourceId = text(assignment.ResourceId), order = ordersById.get(text(assignment.OrderId));
            if (order && activeOrder(order)) { add(resourceOrders, resourceId, 0); }
        });

        var allResources = Array.from(resourceData.values()).map(function (resource) {
            var services = resourceServiceLoad.get(resource.id) || new Map(), dominant = Array.from(services.entries()).sort(function (a, b) { return b[1] - a[1] || a[0].localeCompare(b[0]); })[0], utilization = ratio(resource.load, resource.capacity);
            return {
                id: resource.id,
                nombre: resource.nombre,
                tipoRecurso: resource.tipoRecurso,
                capacidad: displayHours(resource.capacity),
                carga: displayHours(resource.load),
                utilizacion: round(utilization),
                ordenes: display(resource.orders.size),
                /* No hay campo ni regla aprobada para criticidad de OT. */
                criticas: "—",
                servicio: dominant ? dominant[0] : "Sin órdenes",
                estatus: resourceStatus(utilization, thresholds)
            };
        }).sort(function (a, b) { return b.utilizacion - a.utilizacion || a.nombre.localeCompare(b.nombre); });

        var requirements = new Map(), materialBuckets = new Map(), movementIds = new Set(), materialIds = new Set(), materialOrders = new Set();
        list(raw.materials).filter(function (row) {
            return row && selectedOrderIds.has(text(row.OrderId)) && (!row.RequiredDate || inRange(row.RequiredDate, context.start, context.end)) && (row.IsPublishable === undefined || row.IsPublishable === null || yes(row.IsPublishable));
        }).forEach(function (row) { requirements.set(text(row.MaterialRequirementId), row); });
        list(raw.movements).filter(function (movement) {
            return movement && text(movement.MaterialMovementId) && inRange(movement.MovementDate, context.start, context.end) && !yes(movement.IsReversal);
        }).forEach(function (movement) {
            var requirement = requirements.get(text(movement.MaterialRequirementId)), resourceId = text(movement.ResourceId), assignment, unit, key, bucket, direction;
            if (!requirement) { return; }
            if (!resourceData.has(resourceId)) {
                assignment = firstAssignmentForOrder(assignments, text(requirement.OrderId));
                resourceId = assignment && text(assignment.ResourceId);
            }
            if (!resourceData.has(resourceId)) { return; }
            unit = text(movement.MovementUnitCode || requirement.BaseUnitCode);
            key = [resourceId, text(requirement.MaterialId || requirement.MaterialRequirementId), unit].join("|");
            bucket = materialBuckets.get(key) || { resourceId: resourceId, materialId: text(requirement.MaterialId || requirement.MaterialRequirementId), material: text(requirement.MaterialName) || text(requirement.MaterialId) || "Sin material", category: text(requirement.MaterialCategoryName || requirement.MaterialCategoryCode) || "Sin categoría", unit: unit, actual: 0, plan: normal(unit) === normal(requirement.BaseUnitCode) ? number(requirement.PlannedQuantity) : 0, orders: new Set([text(requirement.OrderId)]) };
            direction = normal(movement.MovementDirectionCode);
            bucket.actual += ["RETURN", "IN", "ENTRADA"].indexOf(direction) >= 0 ? -number(movement.MovementQuantity) : number(movement.MovementQuantity);
            bucket.orders.add(text(requirement.OrderId));
            materialBuckets.set(key, bucket);
            movementIds.add(text(movement.MaterialMovementId));
            materialIds.add(bucket.materialId);
            materialOrders.add(text(requirement.OrderId));
        });

        var materialsByResourceMap = new Map(), categoryByUnit = new Map(), topMaterial = null;
        materialBuckets.forEach(function (bucket) {
            var values = materialsByResourceMap.get(bucket.resourceId) || [];
            values.push(bucket);
            materialsByResourceMap.set(bucket.resourceId, values);
            if (Math.abs(bucket.actual) > 0) {
                var categoryKey = comparable(bucket.category) + "|" + normal(bucket.unit), category = categoryByUnit.get(categoryKey) || { category: bucket.category, unit: bucket.unit, actual: 0, records: 0 };
                category.actual += bucket.actual;
                category.records += 1;
                categoryByUnit.set(categoryKey, category);
            }
            if (!topMaterial || Math.abs(bucket.actual) > Math.abs(topMaterial.actual)) { topMaterial = bucket; }
        });
        var allMaterialsByResource = Array.from(materialsByResourceMap.entries()).map(function (entry) {
            var resource = resourceData.get(entry[0]), lead = entry[1].sort(function (a, b) { return Math.abs(b.actual) - Math.abs(a.actual); })[0], variation = lead.plan > 0 ? (lead.actual - lead.plan) / lead.plan * 100 : null, status = materialState(variation);
            return {
                id: entry[0] + "|" + lead.materialId,
                recursoId: resource.id,
                recurso: resource.nombre,
                tipoRecurso: resource.tipoRecurso,
                ordenesConsumo: display(lead.orders.size),
                categoriaPrincipal: lead.category,
                materialTop: lead.material,
                consumoReal: display(lead.actual),
                unidad: lead.unit,
                plan: lead.plan > 0 ? display(lead.plan) : "—",
                unidadPlan: lead.plan > 0 ? lead.unit : "",
                variacion: variation === null ? "Sin plan" : (variation > 0 ? "+" : "") + displayPercent(variation),
                variacionState: status.state,
                estatus: status.text,
                estatusMaterial: status.state
            };
        }).sort(function (a, b) { return a.recurso.localeCompare(b.recurso); });
        var categories = Array.from(categoryByUnit.values()).sort(function (a, b) { return Math.abs(b.actual) - Math.abs(a.actual); }), categorySummary = { lubricantes: "Sin datos", refacciones: "Sin datos", grasas: "Sin datos", consumibles: "Sin datos", herramientas: "Sin datos", materialesCriticos: "Sin definir", totalRegistros: display(movementIds.size) };
        categories.forEach(function (category) {
            var label = comparable(category.category), value = display(category.actual) + (category.unit ? " " + category.unit : "");
            if (label.indexOf("LUBRIC") >= 0 && categorySummary.lubricantes === "Sin datos") { categorySummary.lubricantes = value; }
            if (label.indexOf("REFACC") >= 0 && categorySummary.refacciones === "Sin datos") { categorySummary.refacciones = value; }
            if (label.indexOf("GRASA") >= 0 && categorySummary.grasas === "Sin datos") { categorySummary.grasas = value; }
            if (label.indexOf("CONSUM") >= 0 && categorySummary.consumibles === "Sin datos") { categorySummary.consumibles = value; }
            if (label.indexOf("HERRAMIENT") >= 0 && categorySummary.herramientas === "Sin datos") { categorySummary.herramientas = value; }
        });
        var totalCapacity = allResources.reduce(function (sum, item) { return sum + number(String(item.capacidad).replace(/[h,]/g, "")); }, 0), totalLoad = allResources.reduce(function (sum, item) { return sum + number(String(item.carga).replace(/[h,]/g, "")); }, 0), serviceTotals = new Map();
        resourceServiceLoad.forEach(function (services) { services.forEach(function (load, service) { add(serviceTotals, service, load); }); });
        var serviceTotalHours = Array.from(serviceTotals.values()).reduce(function (sum, value) { return sum + value; }, 0), servicePressure = Array.from(serviceTotals.entries()).map(function (entry) { return { type: entry[0], hours: entry[1], percent: ratio(entry[1], serviceTotalHours) }; }).sort(function (a, b) { return b.hours - a.hours || a.type.localeCompare(b.type); }), materialTotalActual = categories.reduce(function (sum, item) { return sum + Math.abs(item.actual); }, 0), materialCategories = categories.map(function (item) { return { category: item.category, quantity: item.actual, unit: item.unit, percent: ratio(Math.abs(item.actual), materialTotalActual) }; }), oneUnit = new Set(Array.from(materialBuckets.values()).map(function (bucket) { return normal(bucket.unit); })).size <= 1, totalPlan = Array.from(materialBuckets.values()).reduce(function (sum, item) { return sum + item.plan; }, 0), totalActual = Array.from(materialBuckets.values()).reduce(function (sum, item) { return sum + item.actual; }, 0), totalVariation = oneUnit && totalPlan > 0 ? (totalActual - totalPlan) / totalPlan * 100 : null;

        return {
            filters: filters,
            periodos: [{ key: "2026", text: "2026 (Anual)" }, { key: "2025", text: "2025 (Anual)" }, { key: "2024", text: "2024 (Anual)" }],
            gerencias: options(allDaily, "ManagementId", "ManagementName", "Todas"),
            jefaturas: options(allDaily.filter(function (row) { return match(filters.gerencia, row.ManagementId || row.ManagementName); }), "HeadshipId", "HeadshipName", "Todas"),
            supervisores: options(allDaily.filter(function (row) { return match(filters.gerencia, row.ManagementId || row.ManagementName) && match(filters.jefatura, row.HeadshipId || row.HeadshipName); }), "SupervisorId", "SupervisorName", "Todos"),
            tiposServicio: options(Array.from(ordersById.values()), "OrderTypeCode", "OrderTypeText", "Todos"),
            summary: {
                recursosAsignados: display(allResources.length),
                capacidadDisponible: displayHours(totalCapacity),
                cargaProgramada: displayHours(totalLoad),
                utilizacionPromedio: displayPercent(ratio(totalLoad, totalCapacity)),
                ordenesActivas: display(new Set([].concat.apply([], Array.from(resourceData.values()).map(function (resource) { return Array.from(resource.orders); }))).size),
                ordenesCriticas: "Sin definir"
            },
            materialsSummary: {
                ordenesConConsumo: display(materialOrders.size),
                materialesUtilizados: display(materialIds.size),
                materialesCriticos: "Sin definir",
                materialTopCantidad: topMaterial ? display(topMaterial.actual) + (topMaterial.unit ? " " + topMaterial.unit : "") : "Sin datos",
                materialTopNombre: topMaterial ? topMaterial.material : "Sin datos",
                materialTopCategoria: topMaterial ? topMaterial.category : "",
                variacionGeneral: totalVariation === null ? "Sin datos" : (totalVariation > 0 ? "+" : "") + displayPercent(totalVariation)
            },
            materialsCategorySummary: categorySummary,
            pagination: { page: 1, pageSize: "10", total: allResources.length, totalPages: 1, label: "0 - 0 de 0" },
            materialsPagination: { page: 1, pageSize: "10", total: allMaterialsByResource.length, totalPages: 1, label: "0 - 0 de 0 registros" },
            resources: [],
            materialsByResource: [],
            allResources: allResources,
            allMaterialsByResource: allMaterialsByResource,
            servicePressure: servicePressure,
            materialCategories: materialCategories,
            meta: { thresholds: thresholds, unavailableEntitySets: raw.meta && raw.meta.unavailableEntitySets || [] }
        };
    }

    return { build: build, range: range };
});
