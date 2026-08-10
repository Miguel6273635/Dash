sap.ui.define([], function () {
    "use strict";

    const OFFICIAL_ORDER_TYPES = new Set(["SM01", "SM02", "SM03"]);
    const EXECUTED_STATUS = "E0015";
    const NON_EXECUTED_STATUSES = new Set(["E0013", "E0014"]);
    // El servicio puede entregar el STAT de SAP o el código homologado de la
    // aplicación. Todos los cálculos se realizan contra el STAT canónico.
    const APP_STATUS_TO_SAP_STATUS = Object.freeze({
        "0100": "E0013",
        "0200": "E0014",
        "0300": "E0015",
        "0400": "E0016",
        "0500": "E0017",
        "0600": "E0018",
        "0301": "E0019"
    });
    const CAUSE_TONES = ["blue", "sky", "green", "yellow", "orange", "purple", "gray"];
    const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const MONTH_KEYS = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    const DEFAULT_SHIFTS = [
        { key: "DIURNO", text: "Diurno" },
        { key: "NOCTURNO", text: "Nocturno" },
        { key: "FIN_SEMANA", text: "Fin de semana" }
    ];

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function asNumber(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function normalize(value) {
        return String(value || "").trim().toUpperCase();
    }

    function uniqueBy(items, property) {
        const map = new Map();

        asArray(items).forEach((item) => {
            const key = item && item[property];
            if (key !== undefined && key !== null && key !== "") {
                map.set(String(key), item);
            }
        });

        return Array.from(map.values());
    }

    function percentage(numerator, denominator) {
        return denominator > 0 ? (numerator / denominator) * 100 : null;
    }

    function formatPercentage(value, decimals = 1, emptyText = "Sin datos") {
        return value === null || !Number.isFinite(value)
            ? emptyText
            : `${value.toFixed(decimals)}%`;
    }

    function formatQuantity(value) {
        return new Intl.NumberFormat("es-MX", {
            maximumFractionDigits: 2
        }).format(asNumber(value));
    }

    function formatHours(value) {
        return `${formatQuantity(value)} h`;
    }

    function parseDate(value) {
        let date;

        if (!value) {
            return null;
        }

        if (value instanceof Date) {
            date = new Date(value.getTime());
        } else {
            const odataMatch = String(value).match(/\/Date\((-?\d+)/);
            date = odataMatch ? new Date(Number(odataMatch[1])) : new Date(value);
        }
        if (Number.isNaN(date.getTime())) {
            return null;
        }
        if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0) {
            return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        }
        return date;
    }

    function startOfDay(date) {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    function addDays(date, days) {
        const result = new Date(date.getTime());
        result.setDate(result.getDate() + days);
        return result;
    }

    function formatShortDate(date) {
        return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
    }

    function formatPeriodLabel(start, end) {
        if (start.getMonth() === end.getMonth()) {
            return `${start.getDate()} - ${end.getDate()} ${MONTHS[end.getMonth()]}`;
        }
        return `${formatShortDate(start)} - ${formatShortDate(end)}`;
    }

    function weekNumber(date) {
        const first = new Date(date.getFullYear(), 0, 1);
        const elapsedDays = Math.floor((startOfDay(date) - first) / 86400000);
        return Math.ceil((elapsedDays + first.getDay() + 1) / 7);
    }

    function getStatusCode(order) {
        const sapStatus = normalize(order && order.SapUserStatusCode);
        const appStatus = normalize(order && order.AppStatusCode);

        if (/^E00\d{2}$/.test(sapStatus)) {
            return sapStatus;
        }
        if (/^E00\d{2}$/.test(appStatus)) {
            return appStatus;
        }
        return APP_STATUS_TO_SAP_STATUS[sapStatus] || APP_STATUS_TO_SAP_STATUS[appStatus] || "";
    }

    function hasRecognizedStatus(order) {
        const status = getStatusCode(order);
        return status === EXECUTED_STATUS || NON_EXECUTED_STATUSES.has(status);
    }

    function getOfficialOrders(orders) {
        return uniqueBy(orders, "OrderId").filter((order) =>
            OFFICIAL_ORDER_TYPES.has(normalize(order.OrderTypeCode))
        );
    }

    function configuredTarget(catalogs, domain, fallback) {
        const candidates = asArray(catalogs).filter((catalog) =>
            catalog.Active !== false && normalize(catalog.FilterDomain) === domain
        );
        const target = candidates.find((catalog) => normalize(catalog.ScopeTypeCode) === "GLOBAL") || candidates[0];
        const value = target ? Number(target.NumericValue) : NaN;
        return Number.isFinite(value) ? value : fallback;
    }

    function buildGaugeSvg(value) {
        const progress = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

        return `<svg viewBox="0 0 220 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mdComplianceBlue" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0867e8"/><stop offset="52%" stop-color="#1685ff"/><stop offset="100%" stop-color="#0875f5"/></linearGradient></defs><path d="M28 86 A82 64 0 0 1 192 86" pathLength="100" class="mdGaugeTrack"/><path d="M28 86 A82 64 0 0 1 192 86" pathLength="100" stroke-dasharray="${progress.toFixed(1)} 100" stroke="url(#mdComplianceBlue)" class="mdGaugeProgress"/></svg>`;
    }

    function buildSummary(orders, serviceRequests, blocks, catalogs, blockOrders) {
        const officialOrders = getOfficialOrders(orders);
        const planned = officialOrders.length;
        const executed = officialOrders.filter((order) => getStatusCode(order) === EXECUTED_STATUS).length;
        const nonExecuted = officialOrders.filter((order) => NON_EXECUTED_STATUSES.has(getStatusCode(order))).length;
        const classified = officialOrders.filter(hasRecognizedStatus).length;
        const hasStatusData = classified > 0;
        const complianceValue = hasStatusData ? percentage(executed, planned) : null;
        const deviationValue = hasStatusData ? percentage(nonExecuted, planned) : null;
        const complianceTarget = configuredTarget(catalogs, "COMPLIANCE_TARGET", 95);
        const deviationTarget = configuredTarget(catalogs, "DEVIATION_TARGET", 5);
        const publishableBlockRecords = uniqueBy(blocks, "BlockId").filter((block) =>
            block.IsPublishable !== false && !block.ReleasedAt
        );
        const publishableBlockIds = new Set(publishableBlockRecords.map((block) => String(block.BlockId)));
        const impactedOrderIds = new Set(
            asArray(blockOrders)
                .filter((blockOrder) =>
                    publishableBlockIds.has(String(blockOrder.BlockId)) &&
                    blockOrder.OrderId &&
                    !blockOrder.ImpactEndAt
                )
                .map((blockOrder) => String(blockOrder.OrderId))
        );
        const stoppedOrders = impactedOrderIds.size > 0 ? impactedOrderIds.size : publishableBlockRecords.length;
        const uniqueRequests = uniqueBy(serviceRequests, "RequestId");
        const attendedRequests = uniqueRequests.filter((request) => request.AttendedAt || request.ClosedAt).length;
        const deviationPosition = Math.max(0, Math.min(100, (deviationValue || 0) / 15 * 100));

        return {
            compliance: formatPercentage(complianceValue),
            complianceValue: complianceValue || 0,
            complianceTargetText: `Meta ≥ ${formatQuantity(complianceTarget)}%`,
            gaugeSvg: buildGaugeSvg(complianceValue),
            deviation: formatPercentage(deviationValue),
            deviationValue: deviationValue || 0,
            deviationScaleMiddle: deviationValue === null ? "--" : `${Math.round(deviationValue)}%`,
            deviationCaption: deviationValue === null
                ? "Sin datos de estado"
                : deviationValue <= deviationTarget
                    ? "Dentro de tolerancia"
                    : "Fuera de tolerancia",
            deviationTargetText: `Meta ≤ ${formatQuantity(deviationTarget)}%`,
            deviationMarkerHtml: `<span class="mdDevMarker" style="left:${deviationPosition.toFixed(1)}%"></span>`,
            executed: `${hasStatusData ? executed : "--"} / ${planned}`,
            plannedOrders: planned,
            executedOrders: executed,
            classifiedOrders: classified,
            nonExecuted: hasStatusData ? String(nonExecuted) : "--",
            nonExecutedPercent: hasStatusData ? (planned > 0 ? "100%" : "0%") : "--",
            nonExecutedInfo: hasStatusData
                ? `${nonExecuted} órdenes no ejecutadas representan ${formatPercentage(deviationValue, 1, "0.0%")} del plan.`
                : `SAP devolvió ${planned} órdenes sin estado de usuario para calcular la desviación.`,
            forecast: formatPercentage(complianceValue),
            forecastExecuted: `${hasStatusData ? executed : "--"} / ${planned}`,
            blockedOrders: String(stoppedOrders),
            callCenter: `${attendedRequests} / ${uniqueRequests.length}`,
            callCenterCompliance: formatPercentage(percentage(attendedRequests, uniqueRequests.length))
        };
    }

    function buildCauses(orders, causes) {
        const nonExecutedOrderIds = new Set(
            getOfficialOrders(orders)
                .filter((order) => NON_EXECUTED_STATUSES.has(getStatusCode(order)))
                .map((order) => String(order.OrderId))
        );
        const totals = new Map();

        asArray(causes)
            .filter((cause) =>
                nonExecutedOrderIds.has(String(cause.OrderId)) &&
                normalize(cause.CauseContextCode) === "NON_EXECUTION" &&
                cause.IsPrimary !== false &&
                !cause.ValidTo
            )
            .forEach((cause) => {
                const label = cause.CauseText || cause.CauseCode || "Sin causa registrada";
                totals.set(label, (totals.get(label) || 0) + 1);
            });

        const sorted = Array.from(totals, ([label, total]) => ({ label, total }))
            .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "es"))
            .slice(0, 7);
        const causeTotal = sorted.reduce((sum, item) => sum + item.total, 0);
        const maximum = sorted.reduce((max, item) => Math.max(max, item.total), 0);

        return sorted.map((item, index) => ({
            tone: CAUSE_TONES[index],
            label: item.label,
            value: `${item.total} (${causeTotal > 0 ? Math.round(item.total / causeTotal * 100) : 0}%)`,
            width: `${maximum > 0 ? Math.max(4, Math.round(item.total / maximum * 100)) : 0}%`
        }));
    }

    function normalizeUnit(unitCode) {
        const code = normalize(unitCode);
        if (["PZA", "PZ", "PC", "EA"].includes(code)) {
            return "pzas";
        }
        if (["L", "LT", "LTR"].includes(code)) {
            return "L";
        }
        return unitCode || "";
    }

    function materialIcon(categoryCode) {
        const code = normalize(categoryCode);
        if (code.includes("LUBRIC")) {
            return "sap-icon://color-fill";
        }
        if (code.includes("CONSUM")) {
            return "sap-icon://product";
        }
        if (code.includes("HERRAM")) {
            return "sap-icon://wrench";
        }
        return "sap-icon://action-settings";
    }

    function buildMaterials(materials, movements) {
        const publishableMaterials = asArray(materials).filter((material) => material.IsPublishable !== false);
        const materialByRequirement = new Map(
            publishableMaterials.map((material) => [String(material.MaterialRequirementId), material])
        );
        const actualByRequirement = new Map();

        asArray(movements).forEach((movement) => {
            const requirementId = String(movement.MaterialRequirementId || "");
            if (!materialByRequirement.has(requirementId) || movement.IsReversal === true) {
                return;
            }

            const signedQuantity = normalize(movement.MovementDirectionCode) === "RETURN"
                ? -asNumber(movement.MovementQuantity)
                : asNumber(movement.MovementQuantity);
            actualByRequirement.set(requirementId, (actualByRequirement.get(requirementId) || 0) + signedQuantity);
        });

        const categories = new Map();
        publishableMaterials.forEach((material) => {
            const key = String(material.MaterialCategoryCode || "OTROS");
            const current = categories.get(key) || {
                categoryCode: key,
                name: material.MaterialCategoryName || key,
                unitCode: material.BaseUnitCode,
                planValue: 0,
                realValue: 0
            };

            current.planValue += asNumber(material.PlannedQuantity);
            current.realValue += actualByRequirement.get(String(material.MaterialRequirementId)) || 0;
            categories.set(key, current);
        });

        const rows = Array.from(categories.values());
        const maximum = rows.reduce((max, row) => Math.max(max, row.planValue, row.realValue), 0);

        return rows
            .sort((left, right) => right.planValue - left.planValue)
            .slice(0, 4)
            .map((row) => {
                const variationValue = row.planValue > 0
                    ? (row.realValue - row.planValue) / row.planValue * 100
                    : null;
                const unit = normalizeUnit(row.unitCode);
                return {
                    icon: materialIcon(row.categoryCode),
                    name: row.name,
                    unit: unit ? `(${unit})` : "",
                    plan: `${formatQuantity(row.planValue)}${unit ? ` ${unit}` : ""}`,
                    real: `${formatQuantity(row.realValue)}${unit ? ` ${unit}` : ""}`,
                    variation: variationValue === null
                        ? "Sin datos"
                        : `${variationValue >= 0 ? "+" : ""}${Math.round(variationValue)}%`,
                    statusState: variationValue !== null && variationValue > 0 ? "Error" : "Success",
                    planWidth: `${maximum > 0 ? Math.max(3, Math.round(row.planValue / maximum * 100)) : 0}%`,
                    realWidth: `${maximum > 0 ? Math.max(3, Math.round(row.realValue / maximum * 100)) : 0}%`
                };
            });
    }

    function getRangeStart(range, orders) {
        const configuredStart = parseDate(range && range.startDate);
        if (configuredStart) {
            return startOfDay(configuredStart);
        }

        const orderDates = getOfficialOrders(orders)
            .map((order) => parseDate(order.PlannedStartDate))
            .filter(Boolean)
            .sort((left, right) => left - right);
        return orderDates[0] ? startOfDay(orderDates[0]) : startOfDay(new Date());
    }

    function buildPeriods(range, orders) {
        const rangeStart = getRangeStart(range, orders);
        const firstSunday = addDays(rangeStart, -rangeStart.getDay());

        return Array.from({ length: 5 }, (_, index) => {
            const start = addDays(firstSunday, index * 7);
            const end = addDays(start, 6);
            return {
                start,
                end: new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999),
                headerLabel: formatPeriodLabel(start, end),
                dateLabel: `(${formatPeriodLabel(start, end)})`,
                weekLabel: `Sem ${weekNumber(start)}`
            };
        });
    }

    function ordersInPeriod(orders, period) {
        return getOfficialOrders(orders).filter((order) => {
            const date = parseDate(order.PlannedStartDate);
            return date && date >= period.start && date <= period.end;
        });
    }

    function niceMaximum(value) {
        if (value <= 10) {
            return 10;
        }
        const step = value <= 100 ? 25 : value <= 500 ? 50 : 100;
        return Math.ceil(value / step) * step;
    }

    function svgDots(points, cssClass) {
        return `<g class="${cssClass}">${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="4"/>`).join("")}</g>`;
    }

    function buildExecution(orders, periods) {
        const values = periods.map((period) => {
            const periodOrders = ordersInPeriod(orders, period);
            const executed = periodOrders.filter((order) => getStatusCode(order) === EXECUTED_STATUS).length;
            const classified = periodOrders.filter(hasRecognizedStatus).length;
            return {
                planned: periodOrders.length,
                executed,
                classified,
                rate: classified > 0 ? percentage(executed, periodOrders.length) : null
            };
        });
        const hasStatusData = values.some((value) => value.classified > 0);
        const maximum = niceMaximum(values.reduce((max, value) => Math.max(max, value.planned, value.executed), 0));
        const xPositions = [70, 190, 310, 430, 550];
        const countY = (value) => 150 - value / maximum * 132;
        const rateY = (value) => 150 - Math.max(0, Math.min(100, value)) / 100 * 132;
        const planPoints = values.map((value, index) => ({ x: xPositions[index], y: countY(value.planned).toFixed(1) }));
        const realPoints = values.map((value, index) => ({ x: xPositions[index], y: countY(value.executed).toFixed(1) }));
        const ratePoints = values.map((value, index) => ({ x: xPositions[index], y: rateY(value.rate || 0).toFixed(1) }));
        const grid = [18, 52, 86, 120, 150].map((y) => `<line x1="48" y1="${y}" x2="588" y2="${y}"/>`).join("");
        const axisValues = [maximum, maximum * 0.75, maximum * 0.5, maximum * 0.25, 0];
        const axisY = [22, 56, 90, 124, 154];
        const axis = axisValues.map((value, index) => `<text x="${value < 100 ? 16 : 8}" y="${axisY[index]}">${Math.round(value)}</text>`).join("");
        const weekLabels = periods.map((period, index) => `<text x="${xPositions[index]}" y="169">${period.weekLabel}</text>`).join("");
        const points = (items) => items.map((point) => `${point.x},${point.y}`).join(" ");

        return {
            weeks: periods.map((period, index) => ({
                weekLabel: period.weekLabel,
                dateLabel: period.dateLabel,
                planned: values[index].planned,
                executed: values[index].executed,
                rate: formatPercentage(values[index].rate, 1)
            })),
            chartSvg: `<svg viewBox="0 0 620 175" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g class="mdChartGrid">${grid}</g><g class="mdAxisText">${axis}</g><polyline points="${points(planPoints)}" class="mdChartPlan"/>${hasStatusData ? `<polyline points="${points(realPoints)}" class="mdChartReal"/><polyline points="${points(ratePoints)}" class="mdChartRate"/>` : ""}${svgDots(planPoints, "mdDotsPlan")}${hasStatusData ? `${svgDots(realPoints, "mdDotsReal")}${svgDots(ratePoints, "mdDotsRate")}` : ""}<g class="mdXAxisText">${weekLabels}</g></svg>`
        };
    }

    function heatTone(value) {
        if (value === null) {
            return "neutral";
        }
        if (value >= 95) {
            return "blue";
        }
        if (value >= 85) {
            return "green";
        }
        if (value >= 70) {
            return "yellow";
        }
        return "red";
    }

    function heatValue(executed, planned, classified) {
        const value = classified > 0 ? percentage(executed, planned) : null;
        return {
            value: formatPercentage(value, 0, "—"),
            tone: heatTone(value)
        };
    }

    function buildZonePeriods(orders, periods) {
        const zonePriority = ["NORTE", "CENTRO", "SUR", "ESTE", "OESTE"];
        const officialOrders = getOfficialOrders(orders);
        const zones = Array.from(new Set(officialOrders.map((order) => String(order.Zona || order.ZoneId || "Sin zona"))))
            .sort((left, right) => {
                const leftIndex = zonePriority.indexOf(normalize(left));
                const rightIndex = zonePriority.indexOf(normalize(right));
                if (leftIndex >= 0 || rightIndex >= 0) {
                    return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
                }
                return left.localeCompare(right, "es");
            })
            .slice(0, 5);
        const rows = zones.map((zone) => {
            const zoneOrders = officialOrders.filter((order) => String(order.Zona || order.ZoneId || "Sin zona") === zone);
            const cells = periods.map((period) => {
                const periodOrders = ordersInPeriod(zoneOrders, period);
                const executed = periodOrders.filter((order) => getStatusCode(order) === EXECUTED_STATUS).length;
                const classified = periodOrders.filter(hasRecognizedStatus).length;
                return heatValue(executed, periodOrders.length, classified);
            });
            const executedTotal = zoneOrders.filter((order) => getStatusCode(order) === EXECUTED_STATUS).length;
            const classifiedTotal = zoneOrders.filter(hasRecognizedStatus).length;
            return {
                zone,
                periods: cells,
                total: heatValue(executedTotal, zoneOrders.length, classifiedTotal).value
            };
        });

        while (rows.length < 5) {
            rows.push({
                zone: "—",
                periods: Array.from({ length: 5 }, () => ({ value: "—", tone: "neutral" })),
                total: "—"
            });
        }

        return {
            headers: periods.map((period) => period.headerLabel),
            rows
        };
    }

    function toHours(value, unit) {
        const amount = asNumber(value);
        const code = normalize(unit);
        if (["MIN", "M", "MINUTE", "MINUTES"].includes(code)) {
            return amount / 60;
        }
        if (["SEC", "S", "SECOND", "SECONDS"].includes(code)) {
            return amount / 3600;
        }
        if (["DAY", "D", "DIA", "DÍAS"].includes(code)) {
            return amount * 8;
        }
        return amount;
    }

    function deduplicateOperations(operations) {
        const priorities = { AFVV_WORK: 3, AFVV_DURATION: 2, KBED_CAPACITY: 1 };
        const selected = new Map();
        asArray(operations).forEach((operation) => {
            const key = String(operation.OperationKey || `${operation.OrderId}-${operation.OperationCounter || ""}`);
            const current = selected.get(key);
            if (!current || (priorities[normalize(operation.PlannedSourceCode)] || 0) > (priorities[normalize(current.PlannedSourceCode)] || 0)) {
                selected.set(key, operation);
            }
        });
        return Array.from(selected.values());
    }

    function shiftState(utilization) {
        if (utilization === null) {
            return "Sin datos";
        }
        if (utilization > 100) {
            return "Sobrecargado";
        }
        if (utilization > 95) {
            return "Con exceso moderado";
        }
        return "Normal";
    }

    function shiftTone(utilization) {
        if (utilization !== null && utilization > 100) {
            return "error";
        }
        if (utilization !== null && utilization > 95) {
            return "warning";
        }
        return "normal";
    }

    function buildCapacity(orders, resources, operations, confirmations) {
        const officialOrders = getOfficialOrders(orders);
        const orderById = new Map(officialOrders.map((order) => [String(order.OrderId), order]));
        const validResources = asArray(resources).filter((resource) =>
            resource.CapacitySourceValidated !== false && normalize(resource.AvailabilityStatusCode) !== "INACTIVE"
        );
        const selectedOperations = deduplicateOperations(operations);
        const validConfirmations = asArray(confirmations).filter((confirmation) => confirmation.IncludedInCalculation !== false);
        const capacityHours = validResources.reduce((sum, resource) => sum + asNumber(resource.CapacityHours), 0);
        const plannedHours = selectedOperations.reduce((sum, operation) =>
            sum + toHours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal), 0
        );
        const actualHours = validConfirmations.reduce((sum, confirmation) =>
            sum + toHours(confirmation.ActualValueOriginal, confirmation.ActualUnitOriginal), 0
        );
        const technicians = new Set(validResources.map((resource) => String(resource.ResourceId))).size;
        const activeTurns = new Set(validResources.map((resource) => String(resource.ResourceDateId || `${resource.ResourceId}-${resource.WorkDate}-${resource.ShiftId}`))).size;
        const shiftNames = Array.from(new Set(validResources.map((resource) => resource.ShiftName || resource.ShiftId).filter(Boolean)));
        const maximum = Math.max(capacityHours, plannedHours, actualHours, 0);
        const committed = percentage(plannedHours, capacityHours);
        const margin = capacityHours - plannedHours;

        const resourceShiftMap = new Map();
        validResources.forEach((resource) => {
            const key = normalize(resource.ShiftId || resource.ShiftName || "SIN_TURNO");
            const current = resourceShiftMap.get(key) || { capacity: 0, technicians: new Set(), text: resource.ShiftName || resource.ShiftId || "Sin turno" };
            current.capacity += asNumber(resource.CapacityHours);
            current.technicians.add(String(resource.ResourceId));
            resourceShiftMap.set(key, current);
        });

        const plannedByShift = new Map();
        selectedOperations.forEach((operation) => {
            const order = orderById.get(String(operation.OrderId)) || {};
            const key = normalize(order.Turno || "SIN_TURNO");
            plannedByShift.set(key, (plannedByShift.get(key) || 0) + toHours(operation.PlannedValueOriginal, operation.PlannedUnitOriginal));
        });

        const shiftKeys = [
            ...DEFAULT_SHIFTS.map((shift) => shift.key),
            ...Array.from(resourceShiftMap.keys()).filter((key) => !DEFAULT_SHIFTS.some((shift) => shift.key === key))
        ].slice(0, 3);
        const shiftCards = shiftKeys.map((key, index) => {
            const fallback = DEFAULT_SHIFTS[index];
            const resourceShift = resourceShiftMap.get(key);
            const capacity = resourceShift ? resourceShift.capacity : 0;
            const programmed = plannedByShift.get(key) || 0;
            const utilization = percentage(programmed, capacity);
            return {
                title: resourceShift ? resourceShift.text : fallback.text,
                percent: formatPercentage(utilization),
                technicians: String(resourceShift ? resourceShift.technicians.size : 0),
                capacity: formatHours(capacity),
                programmed: formatHours(programmed),
                state: shiftState(utilization),
                tone: shiftTone(utilization)
            };
        });
        shiftCards.push({
            title: "Total",
            percent: formatPercentage(committed),
            technicians: String(technicians),
            capacity: formatHours(capacityHours),
            programmed: formatHours(plannedHours),
            state: shiftState(committed),
            tone: shiftTone(committed)
        });

        const firstShiftLine = shiftNames.length > 0 ? shiftNames.slice(0, 2).join(", ") : "Sin datos";
        const secondShiftLine = shiftNames.length > 2 ? `y ${shiftNames.slice(2).join(", ")}` : "";

        return {
            activeTurns: String(activeTurns),
            technicians: String(technicians),
            currentShiftLine1: firstShiftLine,
            currentShiftLine2: secondShiftLine,
            capacity: formatHours(capacityHours),
            planned: formatHours(plannedHours),
            actual: formatHours(actualHours),
            capacityWidth: `${maximum > 0 ? capacityHours / maximum * 100 : 0}%`,
            plannedWidth: `${maximum > 0 ? plannedHours / maximum * 100 : 0}%`,
            actualWidth: `${maximum > 0 ? actualHours / maximum * 100 : 0}%`,
            scale0: "0",
            scale1: formatQuantity(maximum / 3),
            scale2: formatQuantity(maximum * 2 / 3),
            scale3: formatQuantity(maximum),
            committed: formatPercentage(committed),
            committedDetail: `(${formatQuantity(plannedHours)} / ${formatQuantity(capacityHours)} h)`,
            margin: formatHours(margin),
            marginDetail: `(${formatPercentage(capacityHours > 0 ? margin / capacityHours * 100 : null)} disponible - Programado)`,
            shifts: shiftCards
        };
    }

    function buildComposition(orders) {
        const officialOrders = getOfficialOrders(orders);
        const preventiveByText = officialOrders.filter((order) => normalize(order.OrderTypeText).includes("PREVENT"));
        const correctiveByText = officialOrders.filter((order) => normalize(order.OrderTypeText).includes("CORRECT"));
        const preventive = preventiveByText.length > 0
            ? preventiveByText
            : officialOrders.filter((order) => normalize(order.OrderTypeCode) === "SM01");
        const corrective = correctiveByText.length > 0
            ? correctiveByText
            : officialOrders.filter((order) => normalize(order.OrderTypeCode) === "SM02");

        const card = (items) => {
            const executed = items.filter((order) => getStatusCode(order) === EXECUTED_STATUS).length;
            const classified = items.filter(hasRecognizedStatus).length;
            return {
                orders: `${classified > 0 ? executed : "--"} / ${items.length}`,
                compliance: formatPercentage(classified > 0 ? percentage(executed, items.length) : null)
            };
        };

        return {
            preventive: card(preventive),
            corrective: card(corrective)
        };
    }

    function catalogOptions(catalogs, domains, allKey, allText) {
        const acceptedDomains = asArray(domains).map(normalize);
        const values = asArray(catalogs)
            .filter((catalog) => catalog.Active !== false && acceptedDomains.includes(normalize(catalog.FilterDomain)))
            .sort((left, right) => asNumber(left.SortOrder) - asNumber(right.SortOrder))
            .map((catalog) => ({ key: String(catalog.ValueId), text: catalog.ValueText || catalog.ValueId }));
        return [{ key: allKey, text: allText }, ...uniqueBy(values, "key")];
    }

    function derivedOptions(records, keyProperty, textProperty, allKey, allText) {
        const values = asArray(records)
            .filter((record) => record && record[keyProperty])
            .map((record) => ({
                key: String(record[keyProperty]),
                text: String(record[textProperty] || record[keyProperty])
            }));
        return [{ key: allKey, text: allText }, ...uniqueBy(values, "key")];
    }

    function derivedStatusOptions(orders) {
        const values = getOfficialOrders(orders)
            .map((order) => ({
                key: getStatusCode(order),
                text: order.StatusText || getStatusCode(order)
            }))
            .filter((item) => item.key);

        return [{ key: "TODOS", text: "Todos" }, ...uniqueBy(values, "key")];
    }

    function preferCatalog(catalogValues, derivedValues) {
        return catalogValues.length > 1 ? catalogValues : derivedValues;
    }

    function buildPeriodOptions(orders) {
        const periods = new Map();

        asArray(orders).forEach((order) => {
            const date = parseDate(order.PlannedStartDate);
            if (!date) {
                return;
            }
            const key = `${MONTH_KEYS[date.getMonth()]}_${date.getFullYear()}`;
            periods.set(key, {
                key,
                text: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()} (Mensual)`,
                sortValue: date.getFullYear() * 100 + date.getMonth()
            });
        });

        return Array.from(periods.values())
            .sort((left, right) => left.sortValue - right.sortValue)
            .map(({ key, text }) => ({ key, text }));
    }

    function buildFilterOptions(catalogs, orders, resources) {
        const allRecords = [...asArray(orders), ...asArray(resources)];
        return {
            periodos: buildPeriodOptions(orders),
            zonas: preferCatalog(
                catalogOptions(catalogs, ["ZONE"], "TODAS", "Todas"),
                derivedOptions(allRecords.map((record) => ({ key: record.Zona || record.ZoneId, text: record.ZoneName || record.Zona || record.ZoneId })), "key", "text", "TODAS", "Todas")
            ),
            supervisores: preferCatalog(
                catalogOptions(catalogs, ["SUPERVISOR"], "TODOS", "Todos"),
                derivedOptions(allRecords.map((record) => ({ key: record.SupervisorId, text: record.SupervisorName || record.SupervisorId })), "key", "text", "TODOS", "Todos")
            ),
            tiposOrden: preferCatalog(
                catalogOptions(catalogs, ["ORDER_TYPE"], "TODOS", "Todos"),
                derivedOptions(orders, "OrderTypeCode", "OrderTypeText", "TODOS", "Todos")
            ),
            turnos: preferCatalog(
                catalogOptions(catalogs, ["SHIFT"], "TODOS", "Todos"),
                derivedOptions(allRecords.map((record) => ({ key: record.Turno || record.ShiftId, text: record.ShiftName || record.Turno || record.ShiftId })), "key", "text", "TODOS", "Todos")
            ),
            mecanicos: preferCatalog(
                catalogOptions(catalogs, ["MECHANIC", "RESOURCE"], "TODOS", "Todos"),
                derivedOptions(allRecords.map((record) => ({ key: record.Mecanico || record.ResourceId, text: record.ResourceName || record.Mecanico || record.ResourceId })), "key", "text", "TODOS", "Todos")
            ),
            estadosOrden: preferCatalog(
                catalogOptions(catalogs, ["STATUS"], "TODOS", "Todos"),
                derivedStatusOptions(orders)
            )
        };
    }

    function buildDashboard(rawData) {
        const data = rawData || {};
        const periods = buildPeriods(data.range, data.orders);

        return {
            summary: buildSummary(data.orders, data.serviceRequests, data.blocks, data.catalogs, data.blockOrders),
            causes: buildCauses(data.orders, data.causes),
            execution: buildExecution(data.orders, periods),
            zonePeriods: buildZonePeriods(data.orders, periods),
            staff: buildCapacity(data.orders, data.resources, data.operations, data.confirmations),
            materials: buildMaterials(data.materials, data.movements),
            composition: buildComposition(data.orders),
            filterOptions: buildFilterOptions(data.catalogs, data.allOrders || data.orders, data.allResources || data.resources)
        };
    }

    return {
        buildDashboard,
        buildSummary,
        buildCauses,
        buildMaterials,
        buildExecution,
        buildZonePeriods,
        buildCapacity,
        buildComposition,
        buildFilterOptions,
        getOfficialOrders,
        getStatusCode,
        toHours
    };
});
