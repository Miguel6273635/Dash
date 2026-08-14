sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    /*
     * Cálculos de la pantalla Detalle de cumplimiento general de las órdenes.
     * Los Entity Sets se unen en BTP/UI5 por OrderId y ResourceId para no
     * multiplicar las OT al tener varias causas o varias asignaciones.
     */
    var OFFICIAL_ORDER_TYPES = ["SM01", "SM02", "SM03"];
    var EXECUTED_SAP_STATUSES = ["E0015", "E0016", "E0019"];
    var EXECUTED_APP_STATUSES = ["0300", "0400", "0301"];
    var ALL_ZONES = "TODAS";
    var ALL_VALUES = "TODOS";
    var ZONES = [
        { key: "norte", text: "Norte" },
        { key: "centro", text: "Centro" },
        { key: "sur", text: "Sur" },
        { key: "este", text: "Este" },
        { key: "oeste", text: "Oeste" }
    ];
    var MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    function asArray(vValue) {
        return Array.isArray(vValue) ? vValue : [];
    }

    function normalize(vValue) {
        return String(vValue || "").trim().toUpperCase();
    }

    function hasValue(vValue) {
        var sValue = normalize(vValue);

        return Boolean(sValue) && ["TODOS", "TODAS", "ALL", "NULL"].indexOf(sValue) < 0;
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(normalize(vValue)) >= 0;
    }

    function isFalse(vValue) {
        return vValue === false || ["FALSE", "0", "NO"].indexOf(normalize(vValue)) >= 0;
    }

    function uniqueBy(aItems, sProperty) {
        var mItems = new Map();

        asArray(aItems).forEach(function (oItem) {
            var vKey = oItem && oItem[sProperty];

            if (vKey !== undefined && vKey !== null && vKey !== "") {
                mItems.set(String(vKey), oItem);
            }
        });
        return Array.from(mItems.values());
    }

    function parseDate(vValue) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }
        if (vValue instanceof Date) {
            return new Date(vValue.getTime());
        }
        aMatch = String(vValue).match(/\/Date\((-?\d+)/);
        oDate = aMatch ? new Date(Number(aMatch[1])) : new Date(vValue);
        if (Number.isNaN(oDate.getTime())) {
            return null;
        }
        // Edm.DateTime de SAP se recibe a medianoche UTC. Se conserva la fecha
        // de SAP para no desplazarla un día en la zona horaria de México.
        if (oDate.getUTCHours() === 0 && oDate.getUTCMinutes() === 0 && oDate.getUTCSeconds() === 0) {
            return new Date(oDate.getUTCFullYear(), oDate.getUTCMonth(), oDate.getUTCDate());
        }
        return oDate;
    }

    function isWithinRange(vValue, oStartDate, oEndDate) {
        var oDate = parseDate(vValue);

        return Boolean(oDate) &&
            (!oStartDate || oDate >= oStartDate) &&
            (!oEndDate || oDate <= oEndDate);
    }

    function percentage(iNumerator, iDenominator) {
        return iDenominator > 0 ? iNumerator / iDenominator * 100 : null;
    }

    function formatPercentage(iValue, iDecimals, sEmptyText) {
        return Number.isFinite(iValue)
            ? iValue.toFixed(iDecimals === undefined ? 1 : iDecimals) + "%"
            : sEmptyText || "Sin datos";
    }

    function numberOrZero(vValue) {
        var iValue = Number(vValue || 0);

        return Number.isFinite(iValue) ? iValue : 0;
    }

    function orderIsExecuted(oOrder) {
        var sCanonical = DashboardDataService.canonicalStatus(oOrder);
        var sAppStatus = normalize(oOrder && oOrder.AppStatusCode);

        // Regla acordada para el dashboard: finalizada (0300), pendiente de
        // firma (0400) y finalizada de administración (0301) son ejecutadas.
        return EXECUTED_SAP_STATUSES.indexOf(sCanonical) >= 0 ||
            EXECUTED_APP_STATUSES.indexOf(sAppStatus) >= 0;
    }

    function assignmentRank(oAssignment) {
        var sRole = normalize(oAssignment && oAssignment.RoleCode);
        var sType = normalize(oAssignment && oAssignment.AssignmentTypeCode);
        var iRole;

        if (sRole === "LEAD_MECHANIC" || sRole === "MAIN_MECHANIC") {
            iRole = 0;
        } else if (sRole === "MECHANIC") {
            iRole = 1;
        } else if (sRole === "RESPONSIBLE") {
            iRole = 2;
        } else {
            iRole = 3;
        }
        return iRole * 10 + (sType === "PLANNED" || sType === "PRIMARY" ? 0 : 1);
    }

    function isAssignmentActive(oAssignment, oReferenceDate) {
        var oValidFrom = parseDate(oAssignment && oAssignment.ValidFrom);
        var oValidTo = parseDate(oAssignment && oAssignment.ValidTo);

        return (!oValidFrom || !oReferenceDate || oValidFrom <= oReferenceDate) &&
            (!oValidTo || !oReferenceDate || oValidTo >= oReferenceDate);
    }

    function buildResourcesById(aResources, oRange) {
        var mResources = new Map();

        asArray(aResources).filter(function (oResource) {
            return !oRange || isWithinRange(oResource.WorkDate, oRange.startDate, oRange.endDate);
        }).forEach(function (oResource) {
            var sResourceId = String(oResource.ResourceId || "");
            var aItems;

            if (!sResourceId) {
                return;
            }
            aItems = mResources.get(sResourceId) || [];
            aItems.push(oResource);
            mResources.set(sResourceId, aItems);
        });
        mResources.forEach(function (aItems) {
            aItems.sort(function (oLeft, oRight) {
                return (parseDate(oLeft.WorkDate) || 0) - (parseDate(oRight.WorkDate) || 0);
            });
        });
        return mResources;
    }

    function nearestResource(aResources, vReferenceDate) {
        var oReferenceDate = parseDate(vReferenceDate) || new Date(0);

        return asArray(aResources).slice().sort(function (oLeft, oRight) {
            var iLeft = Math.abs((parseDate(oLeft.WorkDate) || new Date(0)).getTime() - oReferenceDate.getTime());
            var iRight = Math.abs((parseDate(oRight.WorkDate) || new Date(0)).getTime() - oReferenceDate.getTime());

            return iLeft - iRight;
        })[0] || {};
    }

    function buildAssignmentsByOrder(aAssignments) {
        var mAssignments = new Map();

        asArray(aAssignments).forEach(function (oAssignment) {
            var sOrderId = String(oAssignment && oAssignment.OrderId || "");
            var aItems;

            if (!sOrderId || !oAssignment.ResourceId) {
                return;
            }
            aItems = mAssignments.get(sOrderId) || [];
            aItems.push(oAssignment);
            mAssignments.set(sOrderId, aItems);
        });
        return mAssignments;
    }

    function selectPrincipalAssignment(aAssignments, vReferenceDate) {
        var aActive = asArray(aAssignments).filter(function (oAssignment) {
            return isAssignmentActive(oAssignment, parseDate(vReferenceDate));
        });

        return (aActive.length ? aActive : asArray(aAssignments)).slice().sort(function (oLeft, oRight) {
            return assignmentRank(oLeft) - assignmentRank(oRight) ||
                String(oLeft.ResourceId || "").localeCompare(String(oRight.ResourceId || ""));
        })[0] || null;
    }

    function enrichOrders(oRawData, oRange) {
        var mResources = buildResourcesById(oRawData.resources, oRange);
        var mAssignments = buildAssignmentsByOrder(oRawData.assignments);

        return uniqueBy(oRawData.orders, "OrderId").map(function (oOrder) {
            var sOrderId = String(oOrder.OrderId || "");
            var oAssignment = selectPrincipalAssignment(mAssignments.get(sOrderId), oOrder.PlannedStartDate);
            var oResource = oAssignment
                ? nearestResource(mResources.get(String(oAssignment.ResourceId)), oOrder.PlannedStartDate)
                : {};
            var sResponsibleId = String(oResource.ResourceId ||
                oAssignment && (oAssignment.ResourceId || oAssignment.PersonnelNumber) ||
                oOrder.Mecanico || "");
            var sResponsibleName = String(oResource.ResourceName || oResource.PersonnelName ||
                oAssignment && (oAssignment.PersonnelNumber || oAssignment.ResourceId) ||
                oOrder.Mecanico || "Sin responsable asignado");
            var sZoneId = String(oResource.ZoneId || oOrder.Zona || oOrder.ZoneId || "");
            var sZoneName = String(oResource.ZoneName || oOrder.Zona || oOrder.ZoneName || sZoneId || "Sin zona");
            var sSupervisorId = String(oResource.SupervisorId || oOrder.SupervisorId || "");
            var sSupervisorName = String(oResource.SupervisorName || sSupervisorId || "Sin supervisor asignado");

            return Object.assign({}, oOrder, {
                _assignment: oAssignment,
                _responsibleId: sResponsibleId,
                _responsibleName: sResponsibleName,
                _zoneId: sZoneId,
                _zoneName: sZoneName,
                _supervisorId: sSupervisorId,
                _supervisorName: sSupervisorName
            });
        });
    }

    function matchesOne(aValues, vExpected) {
        return !hasValue(vExpected) || asArray(aValues).some(function (vValue) {
            return normalize(vValue) === normalize(vExpected);
        });
    }

    function filterOrders(aOrders, mFilters, oRange) {
        return asArray(aOrders).filter(function (oOrder) {
            return OFFICIAL_ORDER_TYPES.indexOf(normalize(oOrder.OrderTypeCode)) >= 0 &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endDate) &&
                matchesOne([oOrder._zoneId, oOrder.Zona], mFilters.zona) &&
                matchesOne([oOrder._supervisorId, oOrder.SupervisorId], mFilters.supervisor) &&
                matchesOne([oOrder.OrderTypeCode], mFilters.tipoServicio);
        });
    }

    function isCauseActive(oCause, oCutoff) {
        var oValidFrom = parseDate(oCause && oCause.ValidFrom);
        var oValidTo = parseDate(oCause && oCause.ValidTo);

        return (!oValidFrom || !oCutoff || oValidFrom <= oCutoff) &&
            (!oValidTo || !oCutoff || oValidTo >= oCutoff);
    }

    function causeMatchesContext(oCause, fnContext) {
        return oCause && oCause.OrderId && fnContext(normalize(oCause.CauseContextCode));
    }

    function getPrincipalCauses(aCauses, oCutoff, fnContext) {
        var mCauses = new Map();

        asArray(aCauses).filter(function (oCause) {
            return causeMatchesContext(oCause, fnContext) &&
                isTrue(oCause.IsPrimary) && isCauseActive(oCause, oCutoff);
        }).forEach(function (oCause) {
            var sOrderId = String(oCause.OrderId);
            var oCurrent = mCauses.get(sOrderId);
            var bPreferred = isTrue(oCause.IsPrimary) && (!oCurrent || !isTrue(oCurrent.IsPrimary));
            var oCurrentValidFrom = oCurrent && parseDate(oCurrent.ValidFrom);
            var oCandidateValidFrom = parseDate(oCause.ValidFrom);

            if (!oCurrent || bPreferred ||
                (isTrue(oCause.IsPrimary) === isTrue(oCurrent.IsPrimary) &&
                    oCandidateValidFrom && (!oCurrentValidFrom || oCandidateValidFrom > oCurrentValidFrom))) {
                mCauses.set(sOrderId, oCause);
            }
        });
        return mCauses;
    }

    function isNonExecutionContext(sContext) {
        return sContext === "NON_EXECUTION" || sContext === "NO_EJECUCION" ||
            sContext === "NO_EJECUTADA" || sContext === "NONEXECUTION";
    }

    function isFailureClassificationContext(sContext) {
        return sContext === "FAILURE_CLASSIFICATION" || sContext === "FALLA_CLASIFICACION" ||
            sContext === "FAILURE" || sContext === "FALLA" ||
            (sContext.indexOf("FAIL") >= 0 && sContext.indexOf("CLASS") >= 0);
    }

    function causeLabel(oCause) {
        return String(oCause && (oCause.CauseText || oCause.CauseCode) || "Sin causa registrada");
    }

    function groupOrdersByCause(aOrders, mCauses) {
        var mGroups = new Map();

        asArray(aOrders).forEach(function (oOrder) {
            var oCause = mCauses.get(String(oOrder.OrderId));
            var sCode = String(oCause && (oCause.CauseCode || oCause.OrderCauseId) || "SIN_CAUSA");
            var sLabel = causeLabel(oCause);
            var sKey = sCode + "|" + sLabel;
            var oGroup = mGroups.get(sKey) || {
                key: sKey,
                code: sCode,
                causa: sLabel,
                orders: [],
                causes: []
            };

            oGroup.orders.push(oOrder);
            if (oCause) {
                oGroup.causes.push(oCause);
            }
            mGroups.set(sKey, oGroup);
        });
        return Array.from(mGroups.values()).sort(function (oLeft, oRight) {
            return oRight.orders.length - oLeft.orders.length ||
                oLeft.causa.localeCompare(oRight.causa, "es");
        });
    }

    function buildBreakdown(aNonExecuted, mNonExecutionCauses, iPlanned, iExecuted) {
        var aGroups = groupOrdersByCause(aNonExecuted, mNonExecutionCauses);
        var aTopGroups = aGroups.slice(0, 5);
        var aRemaining = aGroups.slice(5);
        var oPrimary = aGroups[0];
        var aItems;

        if (aRemaining.length) {
            aTopGroups[4] = {
                causa: "Otras causas",
                orders: aRemaining.concat(aTopGroups[4] ? [aTopGroups[4]] : []).reduce(function (aOrders, oGroup) {
                    return aOrders.concat(oGroup.orders);
                }, [])
            };
        }
        aItems = aTopGroups.map(function (oGroup) {
            return {
                concepto: oGroup.causa,
                valor: -oGroup.orders.length,
                tipo: "brecha"
            };
        });
        while (aItems.length < 5) {
            aItems.push({ concepto: "Sin datos", valor: 0, tipo: "brecha" });
        }
        aItems.unshift({ concepto: "Plan inicial", valor: iPlanned, tipo: "plan" });
        aItems.push({ concepto: "Resultado real", valor: iExecuted, tipo: "resultado" });

        return {
            items: aItems,
            footer: oPrimary
                ? "Principal causa: " + oPrimary.causa + ", con " + oPrimary.orders.length +
                " OT no ejecutadas (" + formatPercentage(percentage(oPrimary.orders.length, aNonExecuted.length), 0, "0%") +
                " del total de la brecha)."
                : "No hay OT no ejecutadas en el periodo seleccionado."
        };
    }

    function buildEquipmentRanking(aNonExecuted) {
        var mGroups = new Map();

        asArray(aNonExecuted).forEach(function (oOrder) {
            var sEquipment = String(oOrder.EquipmentId || oOrder.EquipmentName || "Sin equipo registrado");
            var sCustomer = String(oOrder.CustomerName || oOrder.CustomerId || "Sin cliente registrado");
            var sKey = sEquipment + "|" + sCustomer;
            var oGroup = mGroups.get(sKey) || { elevador: sEquipment, cliente: sCustomer, otNoEjecutadas: 0 };

            oGroup.otNoEjecutadas += 1;
            mGroups.set(sKey, oGroup);
        });
        return Array.from(mGroups.values()).sort(function (oLeft, oRight) {
            return oRight.otNoEjecutadas - oLeft.otNoEjecutadas ||
                oLeft.elevador.localeCompare(oRight.elevador, "es");
        }).slice(0, 5).map(function (oItem, iIndex, aItems) {
            var iMax = aItems[0] ? aItems[0].otNoEjecutadas : 0;

            return Object.assign({}, oItem, {
                barWidth: iMax ? Math.max(8, oItem.otNoEjecutadas / iMax * 100) : 0
            });
        });
    }

    function zoneKey(vZone) {
        var sZone = normalize(vZone).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return ZONES.filter(function (oZone) {
            return sZone === normalize(oZone.key) || sZone === normalize(oZone.text);
        })[0] && ZONES.filter(function (oZone) {
            return sZone === normalize(oZone.key) || sZone === normalize(oZone.text);
        })[0].key || "";
    }

    function buildCausesByZone(aNonExecuted, mNonExecutionCauses) {
        var aGroups = groupOrdersByCause(aNonExecuted, mNonExecutionCauses);

        return aGroups.map(function (oGroup) {
            var oRow = { causa: oGroup.causa, norte: 0, centro: 0, sur: 0, este: 0, oeste: 0, total: 0 };

            oGroup.orders.forEach(function (oOrder) {
                var sZone = zoneKey(oOrder._zoneName || oOrder._zoneId || oOrder.Zona);

                if (sZone) {
                    oRow[sZone] += 1;
                }
                oRow.total += 1;
            });
            return oRow;
        });
    }

    function originBucket(oCause) {
        var sOrigin = normalize(oCause && oCause.OriginCode);

        if (sOrigin === "INTERNAL" || sOrigin === "INTERNA" || sOrigin === "OPERACION") {
            return "interna";
        }
        if (sOrigin === "EXTERNAL" || sOrigin === "EXTERNA" || sOrigin === "CLIENT" || sOrigin === "PROVIDER" || sOrigin === "PROVEEDOR") {
            return "externa";
        }
        return "tecnica";
    }

    function buildResponsibleTracking(aNonExecuted, mNonExecutionCauses) {
        var mGroups = new Map();

        asArray(aNonExecuted).forEach(function (oOrder) {
            var sId = String(oOrder._responsibleId || "SIN_RESPONSABLE");
            var sName = String(oOrder._responsibleName || "Sin responsable asignado");
            var oGroup = mGroups.get(sId) || {
                responsable: sName,
                ordenesEjecutadas: 0,
                enRevision: 0,
                areaTecnica: 0,
                total: 0
            };
            var sBucket = originBucket(mNonExecutionCauses.get(String(oOrder.OrderId)));

            if (sBucket === "interna") {
                oGroup.ordenesEjecutadas += 1;
            } else if (sBucket === "externa") {
                oGroup.enRevision += 1;
            } else {
                oGroup.areaTecnica += 1;
            }
            oGroup.total += 1;
            mGroups.set(sId, oGroup);
        });
        return Array.from(mGroups.values()).sort(function (oLeft, oRight) {
            return oRight.total - oLeft.total || oLeft.responsable.localeCompare(oRight.responsable, "es");
        });
    }

    function monthStart(oDate) {
        return new Date(oDate.getFullYear(), oDate.getMonth(), 1);
    }

    function monthId(oDate) {
        return oDate.getFullYear() + "-" + String(oDate.getMonth() + 1).padStart(2, "0");
    }

    function buildTrend(aOrders, oRange) {
        var mMonths = new Map();
        var oCursor = monthStart(oRange.startDate);
        var oLast = monthStart(oRange.endDate);

        while (oCursor <= oLast) {
            mMonths.set(monthId(oCursor), {
                mes: MONTHS_SHORT[oCursor.getMonth()] + " " + oCursor.getFullYear(),
                mesCorto: MONTHS_SHORT[oCursor.getMonth()],
                otPlaneadas: 0,
                otEjecutadas: 0,
                brecha: 0,
                cumplimiento: 0
            });
            oCursor = new Date(oCursor.getFullYear(), oCursor.getMonth() + 1, 1);
        }
        asArray(aOrders).forEach(function (oOrder) {
            var oDate = parseDate(oOrder.PlannedStartDate);
            var oMonth = oDate && mMonths.get(monthId(oDate));

            if (!oMonth) {
                return;
            }
            oMonth.otPlaneadas += 1;
            if (orderIsExecuted(oOrder)) {
                oMonth.otEjecutadas += 1;
            }
        });
        return Array.from(mMonths.values()).map(function (oMonth) {
            oMonth.brecha = oMonth.otEjecutadas - oMonth.otPlaneadas;
            oMonth.cumplimiento = Number(percentage(oMonth.otEjecutadas, oMonth.otPlaneadas) || 0).toFixed(1);
            return oMonth;
        });
    }

    function buildFailureClassification(aOrders, mFailureCauses) {
        var mGroups = new Map();

        asArray(aOrders).forEach(function (oOrder) {
            var oCause = mFailureCauses.get(String(oOrder.OrderId));
            var sName;
            var oGroup;

            if (!oCause) {
                return;
            }
            sName = causeLabel(oCause);
            oGroup = mGroups.get(sName) || { falla: sName, total: 0 };
            oGroup.total += 1;
            mGroups.set(sName, oGroup);
        });
        var aGroups = Array.from(mGroups.values()).sort(function (oLeft, oRight) {
            return oRight.total - oLeft.total || oLeft.falla.localeCompare(oRight.falla, "es");
        });
        var iTotal = aGroups.reduce(function (iSum, oValue) { return iSum + oValue.total; }, 0);

        return aGroups.slice(0, 6).map(function (oItem) {

            return Object.assign({}, oItem, {
                porcentaje: Math.round(percentage(oItem.total, iTotal) || 0)
            });
        });
    }

    function optionsFromOrders(aOrders, sKey, sText, sAllKey, sAllText) {
        var aValues = asArray(aOrders).filter(function (oOrder) {
            return oOrder && oOrder[sKey];
        }).map(function (oOrder) {
            return { key: String(oOrder[sKey]), text: String(oOrder[sText] || oOrder[sKey]) };
        }).sort(function (oLeft, oRight) {
            return oLeft.text.localeCompare(oRight.text, "es");
        });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aValues, "key"));
    }

    function optionsFromCatalog(aCatalogs, aDomains, sAllKey, sAllText, oCutoff) {
        var aAllowedDomains = aDomains.map(normalize);
        var aValues = asArray(aCatalogs).filter(function (oCatalog) {
            return oCatalog && oCatalog.ValueId && !isFalse(oCatalog.Active) &&
                aAllowedDomains.indexOf(normalize(oCatalog.FilterDomain)) >= 0 &&
                isCauseActive(oCatalog, oCutoff);
        }).sort(function (oLeft, oRight) {
            return numberOrZero(oLeft.SortOrder) - numberOrZero(oRight.SortOrder) ||
                String(oLeft.ValueText || oLeft.ValueId).localeCompare(String(oRight.ValueText || oRight.ValueId), "es");
        }).map(function (oCatalog) {
            return { key: String(oCatalog.ValueId), text: String(oCatalog.ValueText || oCatalog.ValueId) };
        });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aValues, "key"));
    }

    function preferCatalog(aCatalogValues, aOrderValues) {
        return aCatalogValues.length > 1 ? aCatalogValues : aOrderValues;
    }

    function buildPeriods(aOrders, mFilters, oRange) {
        var mYears = new Map();

        asArray(aOrders).forEach(function (oOrder) {
            var oDate = parseDate(oOrder.PlannedStartDate);

            if (oDate) {
                mYears.set(String(oDate.getFullYear()), true);
            }
        });
        if (oRange.startDate) {
            mYears.set(String(oRange.startDate.getFullYear()), true);
        }
        if (/^\d{4}$/.test(String(mFilters.periodo || ""))) {
            mYears.set(String(mFilters.periodo), true);
        }
        return Array.from(mYears.keys()).sort().map(function (sYear) {
            return { key: sYear, text: sYear + " (Anual)" };
        });
    }

    function buildCatalogs(aOrders, aCatalogs, mFilters, oRange) {
        return {
            periodos: buildPeriods(aOrders, mFilters, oRange),
            zonas: preferCatalog(
                optionsFromCatalog(aCatalogs, ["ZONE"], ALL_ZONES, "Todas", oRange.endDate),
                optionsFromOrders(aOrders, "_zoneId", "_zoneName", ALL_ZONES, "Todas")
            ),
            supervisores: preferCatalog(
                optionsFromCatalog(aCatalogs, ["SUPERVISOR"], ALL_VALUES, "Todos", oRange.endDate),
                optionsFromOrders(aOrders, "_supervisorId", "_supervisorName", ALL_VALUES, "Todos")
            ),
            tiposServicio: preferCatalog(
                optionsFromCatalog(aCatalogs, ["ORDER_TYPE"], ALL_VALUES, "Todos", oRange.endDate),
                optionsFromOrders(aOrders, "OrderTypeCode", "OrderTypeText", ALL_VALUES, "Todos")
            )
        };
    }

    function getRange(oRawData) {
        return oRawData && oRawData.range || { startDate: null, endDate: null };
    }

    function buildData(oRawData, mFilters) {
        var oRaw = oRawData || {};
        var oRange = getRange(oRaw);
        var mFilterValues = Object.assign({
            periodo: "", fechaDesde: "", fechaHasta: "", zona: ALL_ZONES,
            supervisor: ALL_VALUES, tipoServicio: ALL_VALUES
        }, mFilters || {});
        var aEnriched = enrichOrders(oRaw, oRange);
        var aOrders = filterOrders(aEnriched, mFilterValues, oRange);
        var aExecuted = aOrders.filter(orderIsExecuted);
        var aNonExecuted = aOrders.filter(function (oOrder) { return !orderIsExecuted(oOrder); });
        var mNonExecutionCauses = getPrincipalCauses(oRaw.causes, oRange.endDate, isNonExecutionContext);
        var mFailureCauses = getPrincipalCauses(oRaw.causes, oRange.endDate, isFailureClassificationContext);
        var iPlanned = aOrders.length;
        var iExecuted = aExecuted.length;
        var iCompliance = percentage(iExecuted, iPlanned);
        var oBreakdown = buildBreakdown(aNonExecuted, mNonExecutionCauses, iPlanned, iExecuted);
        var aTrend = buildTrend(aOrders, oRange);

        return {
            filters: {
                periodo: mFilterValues.periodo || "",
                fechaDesde: mFilterValues.fechaDesde || "",
                fechaHasta: mFilterValues.fechaHasta || "",
                zona: mFilterValues.zona || ALL_ZONES,
                supervisor: mFilterValues.supervisor || ALL_VALUES,
                tipoServicio: mFilterValues.tipoServicio || ALL_VALUES
            },
            catalogos: buildCatalogs(aEnriched, oRaw.catalogs, mFilterValues, oRange),
            kpis: {
                ordenesPlaneadas: iPlanned,
                ordenesEjecutadas: iExecuted,
                brecha: iExecuted - iPlanned,
                cumplimientoGeneral: formatPercentage(iCompliance, 1, "Sin datos"),
                ejecucionDescripcion: iPlanned ? formatPercentage(iCompliance, 1, "0.0%") + " del total planeado" : "Sin órdenes planeadas",
                brechaDescripcion: aNonExecuted.length + " no ejecutadas en el periodo"
            },
            graficas: {
                descomposicionBrecha: oBreakdown.items,
                descomposicionBrechaPie: oBreakdown.footer,
                elevadoresDesviacion: buildEquipmentRanking(aNonExecuted),
                causasZona: buildCausesByZone(aNonExecuted, mNonExecutionCauses),
                responsables: buildResponsibleTracking(aNonExecuted, mNonExecutionCauses),
                tendenciaEjecucion: aTrend,
                fallasServicios: buildFailureClassification(aOrders, mFailureCauses)
            },
            trendMatrix: {
                meses: aTrend.map(function (oItem) { return oItem.mesCorto; }),
                planeadas: aTrend.map(function (oItem) { return oItem.otPlaneadas; }),
                ejecutadas: aTrend.map(function (oItem) { return oItem.otEjecutadas; }),
                brecha: aTrend.map(function (oItem) { return oItem.brecha; }),
                cumplimiento: aTrend.map(function (oItem) { return formatPercentage(Number(oItem.cumplimiento), 1, "0.0%"); })
            },
            meta: {
                plannedOrders: iPlanned,
                executedOrders: iExecuted,
                nonExecutedOrders: aNonExecuted.length,
                source: "BTP_DESTINATION_ODATA_V2"
            }
        };
    }

    return {
        buildData: buildData,
        orderIsExecuted: orderIsExecuted
    };
});
