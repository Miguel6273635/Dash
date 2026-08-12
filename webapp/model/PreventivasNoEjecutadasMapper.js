sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    var PREVENTIVE_ORDER_TYPE = "SM01";
    var EXECUTED_SAP_STATUSES = ["E0015", "E0016", "E0019"];
    var EXECUTED_APP_STATUSES = ["0300", "0400", "0301"];
    var ALL_ZONES = "TODAS";
    var ALL_VALUES = "TODOS";

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
            oDate = new Date(vValue.getTime());
        } else {
            aMatch = String(vValue).match(/\/Date\((-?\d+)/);
            oDate = aMatch ? new Date(Number(aMatch[1])) : new Date(vValue);
        }
        if (Number.isNaN(oDate.getTime())) {
            return null;
        }
        // Las fechas Edm.DateTime de SAP llegan como medianoche UTC. Se
        // conserva el día SAP para no desplazarlo por la zona horaria local.
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

    function formatDate(vValue) {
        var oDate = parseDate(vValue);

        if (!oDate) {
            return "Sin fecha";
        }
        return String(oDate.getDate()).padStart(2, "0") + "/" +
            String(oDate.getMonth() + 1).padStart(2, "0") + "/" + oDate.getFullYear();
    }

    function formatPercentage(iValue, iDecimals, sEmptyText) {
        return Number.isFinite(iValue)
            ? iValue.toFixed(iDecimals === undefined ? 1 : iDecimals) + "%"
            : sEmptyText || "Sin datos";
    }

    function percentage(iNumerator, iDenominator) {
        return iDenominator > 0 ? iNumerator / iDenominator * 100 : null;
    }

    function isFalse(vValue) {
        return vValue === false || ["FALSE", "0", "NO"].indexOf(normalize(vValue)) >= 0;
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(normalize(vValue)) >= 0;
    }

    function isExecutedOrder(oOrder) {
        var sCanonicalStatus = DashboardDataService.canonicalStatus(oOrder);
        var sAppStatus = normalize(oOrder && oOrder.AppStatusCode);

        return EXECUTED_SAP_STATUSES.indexOf(sCanonicalStatus) >= 0 ||
            EXECUTED_APP_STATUSES.indexOf(sAppStatus) >= 0;
    }

    function assignmentRank(oAssignment) {
        var sRole = normalize(oAssignment && oAssignment.RoleCode);
        var sType = normalize(oAssignment && oAssignment.AssignmentTypeCode);
        var iRole = sRole === "MECHANIC" ? 0 : sRole === "RESPONSIBLE" ? 1 : 2;
        var iType = sType === "PLANNED" ? 0 : 1;

        return iRole * 10 + iType;
    }

    function buildAssignmentsByOrder(aAssignments) {
        var mByOrder = new Map();

        asArray(aAssignments).forEach(function (oAssignment) {
            var sOrderId = String(oAssignment && oAssignment.OrderId || "");
            var aItems;

            if (!sOrderId || !oAssignment.ResourceId) {
                return;
            }
            aItems = mByOrder.get(sOrderId) || [];
            aItems.push(oAssignment);
            mByOrder.set(sOrderId, aItems);
        });
        mByOrder.forEach(function (aItems) {
            aItems.sort(function (oLeft, oRight) {
                return assignmentRank(oLeft) - assignmentRank(oRight);
            });
        });
        return mByOrder;
    }

    function buildResourcesById(aResources, oRange) {
        var mByResource = new Map();

        asArray(aResources).filter(function (oResource) {
            return !oRange || !oResource.WorkDate ||
                isWithinRange(oResource.WorkDate, oRange.startDate, oRange.endDate);
        }).forEach(function (oResource) {
            var sResourceId = String(oResource.ResourceId || "");
            var aItems;

            if (!sResourceId) {
                return;
            }
            aItems = mByResource.get(sResourceId) || [];
            aItems.push(oResource);
            mByResource.set(sResourceId, aItems);
        });
        mByResource.forEach(function (aItems) {
            aItems.sort(function (oLeft, oRight) {
                return (parseDate(oLeft.WorkDate) || 0) - (parseDate(oRight.WorkDate) || 0);
            });
        });
        return mByResource;
    }

    function enrichOrders(oRawData) {
        var oRange = oRawData.range || {};
        var mAssignments = buildAssignmentsByOrder(oRawData.assignments);
        var mResources = buildResourcesById(oRawData.resources, oRange);

        return uniqueBy(oRawData.orders, "OrderId").map(function (oOrder) {
            var sOrderId = String(oOrder.OrderId || "");
            var aAssignments = mAssignments.get(sOrderId) || [];
            var oAssignment = aAssignments[0] || {};
            var aResourceIds = aAssignments.map(function (oItem) {
                return String(oItem.ResourceId || "");
            }).filter(Boolean);
            var aPersonnelNumbers = aAssignments.map(function (oItem) {
                return String(oItem.PersonnelNumber || "");
            }).filter(Boolean);
            var oResource = mResources.get(String(oAssignment.ResourceId || "")) || [];
            var oDailyResource = oResource[0] || {};
            var sResponsibleId = oAssignment.PersonnelNumber || oAssignment.ResourceId || oOrder.Mecanico || "";
            var sResponsibleName = oDailyResource.ResourceName || oDailyResource.PersonnelName ||
                oAssignment.PersonnelName || oOrder.Mecanico || sResponsibleId || "Sin responsable asignado";
            var sZoneId = oDailyResource.ZoneId || oOrder.Zona || oOrder.ZoneId || "";
            var sZoneName = oDailyResource.ZoneName || oOrder.Zona || oOrder.ZoneName || sZoneId || "Sin zona";

            return Object.assign({}, oOrder, {
                _resourceIds: aResourceIds,
                _personnelNumbers: aPersonnelNumbers,
                _responsibleId: String(sResponsibleId),
                _responsibleName: String(sResponsibleName),
                _zoneId: String(sZoneId),
                _zoneName: String(sZoneName)
            });
        });
    }

    function matchesOne(aValues, vExpected) {
        return !hasValue(vExpected) || aValues.some(function (vValue) {
            return normalize(vValue) === normalize(vExpected);
        });
    }

    function filterOrders(aOrders, mFilters, oRange) {
        return asArray(aOrders).filter(function (oOrder) {
            return normalize(oOrder.OrderTypeCode) === PREVENTIVE_ORDER_TYPE &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endDate) &&
                matchesOne([oOrder._zoneId, oOrder.Zona], mFilters.zona) &&
                matchesOne([oOrder.CustomerId], mFilters.cliente) &&
                matchesOne([oOrder._responsibleId, oOrder.Mecanico]
                    .concat(oOrder._resourceIds, oOrder._personnelNumbers), mFilters.responsable);
        });
    }

    function isCauseActive(oCause, oCutoff) {
        var oValidFrom = parseDate(oCause.ValidFrom);
        var oValidTo = parseDate(oCause.ValidTo);

        return !isFalse(oCause.IsPrimary) &&
            (!oValidFrom || !oCutoff || oValidFrom <= oCutoff) &&
            (!oValidTo || !oCutoff || oValidTo >= oCutoff);
    }

    function getPrimaryCauses(aCauses, oCutoff) {
        var mByOrder = new Map();

        asArray(aCauses).filter(function (oCause) {
            return oCause && oCause.OrderId && isCauseActive(oCause, oCutoff);
        }).forEach(function (oCause) {
            var sOrderId = String(oCause.OrderId);
            var oCurrent = mByOrder.get(sOrderId);
            var oCurrentDate = oCurrent && parseDate(oCurrent.ValidFrom);
            var oCandidateDate = parseDate(oCause.ValidFrom);
            var bPreferred = isTrue(oCause.IsPrimary) && (!oCurrent || !isTrue(oCurrent.IsPrimary));

            if (!oCurrent || bPreferred || (oCandidateDate && (!oCurrentDate || oCandidateDate > oCurrentDate))) {
                mByOrder.set(sOrderId, oCause);
            }
        });
        return mByOrder;
    }

    function dayDifference(vStartDate, oEndDate) {
        var oStartDate = parseDate(vStartDate);

        if (!oStartDate || !oEndDate) {
            return null;
        }
        return Math.max(0, Math.floor((oEndDate.getTime() - oStartDate.getTime()) / 86400000));
    }

    function formatDays(iDays) {
        return Number.isFinite(iDays) ? Math.round(iDays) + " días" : "Sin datos";
    }

    function iconForCause(sCause) {
        var sText = normalize(sCause);

        if (sText.indexOf("REFACC") >= 0 || sText.indexOf("MATERIAL") >= 0) {
            return "sap-icon://inventory";
        }
        if (sText.indexOf("CLIENT") >= 0) {
            return "sap-icon://customer";
        }
        if (sText.indexOf("REPROGRAM") >= 0) {
            return "sap-icon://calendar";
        }
        if (sText.indexOf("CARTA") >= 0 || sText.indexOf("DOCUMENT") >= 0) {
            return "sap-icon://document-text";
        }
        return "sap-icon://alert";
    }

    function buildCauseRows(aNonExecuted, aCauses, oRange) {
        var mPrimaryCauses = getPrimaryCauses(aCauses, oRange.endDate);
        var mGroups = new Map();
        var iTotal = aNonExecuted.length;

        aNonExecuted.forEach(function (oOrder) {
            var oCause = mPrimaryCauses.get(String(oOrder.OrderId));
            var sCauseCode = oCause && (oCause.CauseCode || oCause.OrderCauseId) || "SIN_CAUSA";
            var sCauseName = oCause && (oCause.CauseText || oCause.CauseCode) || "Sin causa registrada";
            var sGroupKey = String(sCauseCode) + "|" + String(sCauseName);
            var oGroup = mGroups.get(sGroupKey) || {
                code: sCauseCode,
                name: sCauseName,
                orders: []
            };

            oGroup.orders.push(oOrder);
            mGroups.set(sGroupKey, oGroup);
        });

        return Array.from(mGroups.values()).map(function (oGroup) {
            var aDelays = oGroup.orders.map(function (oOrder) {
                return dayDifference(oOrder.PlannedStartDate, oRange.endDate);
            }).filter(Number.isFinite);
            var iAverageDelay = aDelays.length
                ? aDelays.reduce(function (iTotalDays, iDays) { return iTotalDays + iDays; }, 0) / aDelays.length
                : null;
            var aDetails = oGroup.orders.map(function (oOrder) {
                return {
                    ot: oOrder.OrderId || "Sin OT",
                    cliente: oOrder.CustomerName || oOrder.CustomerId || "Sin cliente",
                    elevador: oOrder.EquipmentName || oOrder.EquipmentId || "Sin elevador",
                    responsable: oOrder._responsibleName || "Sin responsable asignado",
                    fechaProgramada: formatDate(oOrder.PlannedStartDate),
                    diasDetenida: formatDays(dayDifference(oOrder.PlannedStartDate, oRange.endDate)),
                    _plannedDate: parseDate(oOrder.PlannedStartDate) || new Date(8640000000000000)
                };
            }).sort(function (oLeft, oRight) {
                return oLeft._plannedDate - oRight._plannedDate;
            }).map(function (oDetail) {
                delete oDetail._plannedDate;
                return oDetail;
            });

            return {
                name: oGroup.name,
                icon: iconForCause(oGroup.name),
                ot: oGroup.orders.length,
                pct: formatPercentage(percentage(oGroup.orders.length, iTotal), 0, "0%"),
                clientes: new Set(oGroup.orders.map(function (oOrder) {
                    return oOrder.CustomerId;
                }).filter(Boolean)).size,
                elevadores: new Set(oGroup.orders.map(function (oOrder) {
                    return oOrder.EquipmentId;
                }).filter(Boolean)).size,
                dias: formatDays(iAverageDelay),
                expanded: false,
                details: aDetails
            };
        }).sort(function (oLeft, oRight) {
            return oRight.ot - oLeft.ot || oLeft.name.localeCompare(oRight.name, "es");
        }).map(function (oGroup, iIndex) {
            oGroup.expanded = iIndex === 0;
            return oGroup;
        });
    }

    function getCatalogOptions(aCatalogs, aDomains, sAllKey, sAllText) {
        var aAllowedDomains = aDomains.map(normalize);
        var aOptions = asArray(aCatalogs).filter(function (oCatalog) {
            return !isFalse(oCatalog.Active) && oCatalog.ValueId &&
                aAllowedDomains.indexOf(normalize(oCatalog.FilterDomain)) >= 0;
        }).sort(function (oLeft, oRight) {
            return Number(oLeft.SortOrder || 0) - Number(oRight.SortOrder || 0);
        }).map(function (oCatalog) {
            return {
                key: String(oCatalog.ValueId),
                text: oCatalog.ValueText || String(oCatalog.ValueId)
            };
        });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aOptions, "key"));
    }

    function derivedOptions(aItems, sKey, sText, sAllKey, sAllText) {
        var aOptions = asArray(aItems).filter(function (oItem) {
            return oItem && oItem[sKey];
        }).map(function (oItem) {
            return {
                key: String(oItem[sKey]),
                text: String(oItem[sText] || oItem[sKey])
            };
        }).sort(function (oLeft, oRight) {
            return oLeft.text.localeCompare(oRight.text, "es");
        });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aOptions, "key"));
    }

    function preferredOptions(aCatalogOptions, aDerivedOptions) {
        return aCatalogOptions.length > 1 ? aCatalogOptions : aDerivedOptions;
    }

    function buildPeriods(aOrders, mFilters, oRange) {
        var mYears = new Map();

        asArray(aOrders).forEach(function (oOrder) {
            var oDate = parseDate(oOrder.PlannedStartDate);

            if (oDate) {
                mYears.set(String(oDate.getFullYear()), oDate.getFullYear());
            }
        });
        if (oRange.startDate) {
            mYears.set(String(oRange.startDate.getFullYear()), oRange.startDate.getFullYear());
        }
        if (/^\d{4}$/.test(String(mFilters.periodo || ""))) {
            mYears.set(String(mFilters.periodo), Number(mFilters.periodo));
        }
        return Array.from(mYears.keys()).sort().map(function (sYear) {
            return { key: sYear, text: sYear + " (Anual)" };
        });
    }

    function buildCatalogs(aOrders, aCatalogs, mFilters, oRange) {
        var aCatalogZones = getCatalogOptions(aCatalogs, ["ZONE"], ALL_ZONES, "Todas");
        var aCatalogCustomers = getCatalogOptions(aCatalogs, ["CLIENT", "CUSTOMER"], ALL_VALUES, "Todos");
        var aCatalogResponsible = getCatalogOptions(aCatalogs, ["RESOURCE", "RESPONSIBLE", "MECHANIC"], ALL_VALUES, "Todos");

        return {
            periodos: buildPeriods(aOrders, mFilters, oRange),
            zonas: preferredOptions(aCatalogZones,
                derivedOptions(aOrders, "_zoneId", "_zoneName", ALL_ZONES, "Todas")),
            clientes: preferredOptions(aCatalogCustomers,
                derivedOptions(aOrders, "CustomerId", "CustomerName", ALL_VALUES, "Todos")),
            responsables: preferredOptions(aCatalogResponsible,
                derivedOptions(aOrders, "_responsibleId", "_responsibleName", ALL_VALUES, "Todos"))
        };
    }

    function buildTotals(aNonExecuted, oRange) {
        var aDelays = aNonExecuted.map(function (oOrder) {
            return dayDifference(oOrder.PlannedStartDate, oRange.endDate);
        }).filter(Number.isFinite);
        var iAverageDelay = aDelays.length
            ? aDelays.reduce(function (iTotalDays, iDays) { return iTotalDays + iDays; }, 0) / aDelays.length
            : null;

        return {
            name: "Total",
            ot: aNonExecuted.length,
            pct: aNonExecuted.length ? "100%" : "0%",
            clientes: new Set(aNonExecuted.map(function (oOrder) {
                return oOrder.CustomerId;
            }).filter(Boolean)).size,
            elevadores: new Set(aNonExecuted.map(function (oOrder) {
                return oOrder.EquipmentId;
            }).filter(Boolean)).size,
            dias: formatDays(iAverageDelay)
        };
    }

    function buildData(oRawData, mFilters, sAnalysis) {
        var oRange = oRawData.range || {};
        var aEnrichedOrders = enrichOrders(oRawData);
        var aOrders = filterOrders(aEnrichedOrders, mFilters, oRange);
        var aExecutedOrders = aOrders.filter(isExecutedOrder);
        // Regla aprobada: sin estatus también significa no ejecutada.
        var aNonExecutedOrders = aOrders.filter(function (oOrder) {
            return !isExecutedOrder(oOrder);
        });
        var iPlanned = aOrders.length;
        var iCompliance = percentage(aExecutedOrders.length, iPlanned);
        var iNonExecutedPct = percentage(aNonExecutedOrders.length, iPlanned);
        var sSelectedAnalysis = ["NO_EJECUTADAS", "EJECUTADAS", "TODAS"].indexOf(sAnalysis) >= 0
            ? sAnalysis
            : "NO_EJECUTADAS";
        var aCauses = sSelectedAnalysis === "NO_EJECUTADAS"
            ? buildCauseRows(aNonExecutedOrders, oRawData.causes, oRange)
            : [];
        var sCutoff = formatDate(oRange.endDate);

        return {
            ui: {
                selectedAnalysis: sSelectedAnalysis,
                analysisInfo: sSelectedAnalysis === "NO_EJECUTADAS"
                    ? "Análisis basado en " + aNonExecutedOrders.length + " OT Preventivas no ejecutadas."
                    : sSelectedAnalysis === "EJECUTADAS"
                        ? aExecutedOrders.length + " OT Preventivas ejecutadas en el periodo."
                        : iPlanned + " OT Preventivas planeadas en el periodo."
            },
            header: {
                titlePrefix: "Análisis de OT Preventivas",
                titleStatus: "No Ejecutadas",
                dateNote: "Corte: " + sCutoff
            },
            filters: {
                periodo: mFilters.periodo || "",
                fechaDesde: mFilters.fechaDesde || "",
                fechaHasta: mFilters.fechaHasta || "",
                zona: mFilters.zona || ALL_ZONES,
                cliente: mFilters.cliente || ALL_VALUES,
                responsable: mFilters.responsable || ALL_VALUES
            },
            catalogos: buildCatalogs(aEnrichedOrders, oRawData.catalogs, mFilters, oRange),
            kpis: {
                planeadas: iPlanned,
                planeadasLabel: "Planeadas",
                planeadasDescription: "Órdenes del periodo",
                ejecutadas: aExecutedOrders.length,
                ejecutadasLabel: "Ejecutadas",
                ejecutadasDescription: formatPercentage(percentage(aExecutedOrders.length, iPlanned), 1, "0.0%") + " del total",
                noEjecutadas: aNonExecutedOrders.length,
                noEjecutadasLabel: "No ejecutadas",
                noEjecutadasDescription: formatPercentage(iNonExecutedPct, 1, "0.0%") + " del total planeado",
                cumplimiento: formatPercentage(iCompliance, 1, "0.0%"),
                cumplimientoLabel: "Cumplimiento",
                cumplimientoDescription: aExecutedOrders.length + " de " + iPlanned + " OT"
            },
            analysisTabs: {
                noEjecutadas: "No ejecutadas (" + aNonExecutedOrders.length + ")",
                ejecutadas: "Ejecutadas (" + aExecutedOrders.length + ")",
                todas: "Todas (" + iPlanned + ")"
            },
            causes: aCauses,
            totals: buildTotals(aNonExecutedOrders, oRange),
            footerText: "Las causas están ordenadas por el número de OT no ejecutadas (descendente).",
            meta: {
                plannedOrders: iPlanned,
                executedOrders: aExecutedOrders.length,
                nonExecutedOrders: aNonExecutedOrders.length,
                unavailableEntitySets: oRawData.meta && oRawData.meta.unavailableEntitySets || []
            }
        };
    }

    return {
        buildData: buildData
    };
});
