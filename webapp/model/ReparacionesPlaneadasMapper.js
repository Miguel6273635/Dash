sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    // El JSON QAS contiene las reparaciones en SM01 y las órdenes con
    // avance/estatus operativo en SM02. Ambas forman parte del análisis.
    var REPAIR_ORDER_TYPES = ["SM01", "SM02"];
    // Trabajo realizado: finalizada, pendiente de firma y finalizada ADMÓN.
    var EXECUTED_STATUSES = ["E0015", "E0016", "E0019"];
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
            return new Date(vValue.getTime());
        }
        aMatch = String(vValue).match(/\/Date\((-?\d+)/);
        oDate = aMatch ? new Date(Number(aMatch[1])) : new Date(vValue);
        if (Number.isNaN(oDate.getTime())) {
            return null;
        }
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

    function formatMonth(oDate) {
        var aMonths = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        return aMonths[oDate.getMonth()] + " " + oDate.getFullYear();
    }

    function monthKey(oDate) {
        var aMonths = [
            "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
            "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"
        ];

        return aMonths[oDate.getMonth()] + "_" + oDate.getFullYear();
    }

    function percentage(iNumerator, iDenominator) {
        return iDenominator > 0 ? iNumerator / iDenominator * 100 : null;
    }

    function formatPercentage(iValue, iDecimals, sEmptyText) {
        return Number.isFinite(iValue)
            ? iValue.toFixed(iDecimals === undefined ? 1 : iDecimals) + "%"
            : sEmptyText || "Sin datos";
    }

    function isFalse(vValue) {
        return vValue === false || ["FALSE", "0", "NO"].indexOf(normalize(vValue)) >= 0;
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(normalize(vValue)) >= 0;
    }

    function isValidMaterial(oMaterial) {
        var sValidation = normalize(oMaterial && oMaterial.DataValidationStatusCode);

        return isTrue(oMaterial && oMaterial.IsPublishable) &&
            (!sValidation || sValidation === "VALIDATED");
    }

    function getCatalogOptions(aCatalogs, aDomains, sAllKey, sAllText) {
        var aAllowed = aDomains.map(normalize);
        var aValues = asArray(aCatalogs)
            .filter(function (oCatalog) {
                return !isFalse(oCatalog.Active) &&
                    aAllowed.indexOf(normalize(oCatalog.FilterDomain)) >= 0 &&
                    oCatalog.ValueId;
            })
            .sort(function (oLeft, oRight) {
                return Number(oLeft.SortOrder || 0) - Number(oRight.SortOrder || 0);
            })
            .map(function (oCatalog) {
                return {
                    key: String(oCatalog.ValueId),
                    text: oCatalog.ValueText || String(oCatalog.ValueId)
                };
            });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aValues, "key"));
    }

    function derivedOptions(aItems, sKey, sText, sAllKey, sAllText) {
        var aValues = asArray(aItems)
            .filter(function (oItem) { return oItem && oItem[sKey]; })
            .map(function (oItem) {
                return {
                    key: String(oItem[sKey]),
                    text: String(oItem[sText] || oItem[sKey])
                };
            })
            .sort(function (oLeft, oRight) {
                return oLeft.text.localeCompare(oRight.text, "es");
            });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aValues, "key"));
    }

    function preferCatalog(aCatalogValues, aDerivedValues) {
        return aCatalogValues.length > 1 ? aCatalogValues : aDerivedValues;
    }

    function assignmentRank(oAssignment) {
        var sRole = normalize(oAssignment.RoleCode);
        var sType = normalize(oAssignment.AssignmentTypeCode);
        var iRole = sRole === "MECHANIC" ? 0 : sRole === "RESPONSIBLE" ? 1 : 2;
        var iType = sType === "PLANNED" ? 0 : 1;

        return iRole * 10 + iType;
    }

    function buildResourceIndex(aResources, oRange) {
        var mByResource = new Map();

        asArray(aResources)
            .filter(function (oResource) {
                return !oRange || isWithinRange(oResource.WorkDate, oRange.startDate, oRange.endDate);
            })
            .forEach(function (oResource) {
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

    function buildAssignmentsByOrder(aAssignments) {
        var mByOrder = new Map();

        asArray(aAssignments).forEach(function (oAssignment) {
            var sOrderId = String(oAssignment.OrderId || "");
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

    function buildMaterialsByOrder(aMaterials) {
        var mByOrder = new Map();

        asArray(aMaterials).filter(isValidMaterial).forEach(function (oMaterial) {
            var sOrderId = String(oMaterial.OrderId || "");
            var aItems;

            if (!sOrderId) {
                return;
            }
            aItems = mByOrder.get(sOrderId) || [];
            aItems.push(oMaterial);
            mByOrder.set(sOrderId, aItems);
        });

        return mByOrder;
    }

    function materialRank(oMaterial) {
        var sCriticality = normalize(oMaterial.MaterialCriticalityCode);
        var iCriticality = sCriticality === "HIGH" ? 0 : sCriticality === "MEDIUM" ? 1 : 2;

        return iCriticality * 1000000 - Number(oMaterial.PlannedQuantity || 0);
    }

    function getMainMaterial(aMaterials) {
        var aSorted = asArray(aMaterials).slice().sort(function (oLeft, oRight) {
            return materialRank(oLeft) - materialRank(oRight);
        });
        var oMaterial = aSorted[0];

        return oMaterial
            ? oMaterial.MaterialName || oMaterial.MaterialCategoryName || oMaterial.MaterialId || "Sin material asociado"
            : "Sin material asociado";
    }

    function enrichOrders(oRaw, oRange) {
        var mResources = buildResourceIndex(oRaw.resources, oRange);
        var mAssignments = buildAssignmentsByOrder(oRaw.assignments);
        var mMaterials = buildMaterialsByOrder(oRaw.materials);

        return uniqueBy(oRaw.orders, "OrderId").map(function (oOrder) {
            var sOrderId = String(oOrder.OrderId || "");
            var aAssignments = mAssignments.get(sOrderId) || [];
            var oAssignment = aAssignments[0];
            var aResourceDates = oAssignment ? mResources.get(String(oAssignment.ResourceId)) || [] : [];
            var oResource = aResourceDates[0] || {};
            var aResourceIds = aAssignments.map(function (oItem) { return String(oItem.ResourceId); });
            var aPersonnelNumbers = aAssignments.map(function (oItem) { return String(oItem.PersonnelNumber || ""); });
            var sResponsibleId = oAssignment && (oAssignment.ResourceId || oAssignment.PersonnelNumber) || oOrder.Mecanico || "";
            var sResponsibleName = oResource.ResourceName || oAssignment && (oAssignment.PersonnelNumber || oAssignment.ResourceId) || oOrder.Mecanico || "Sin responsable asignado";
            var sZoneId = oResource.ZoneId || oOrder.Zona || oOrder.ZoneId || "";
            var sZoneName = oResource.ZoneName || oOrder.Zona || oOrder.ZoneName || sZoneId || "Sin zona";

            return Object.assign({}, oOrder, {
                _resourceIds: aResourceIds,
                _personnelNumbers: aPersonnelNumbers,
                _responsibleId: String(sResponsibleId),
                _responsibleName: String(sResponsibleName),
                _zoneId: String(sZoneId),
                _zoneName: String(sZoneName),
                _materials: mMaterials.get(sOrderId) || [],
                _mainMaterial: getMainMaterial(mMaterials.get(sOrderId) || [])
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
            return REPAIR_ORDER_TYPES.indexOf(normalize(oOrder.OrderTypeCode)) >= 0 &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endDate) &&
                matchesOne([oOrder._zoneId, oOrder.Zona], mFilters.zona) &&
                matchesOne([oOrder.CustomerId], mFilters.cliente) &&
                matchesOne([oOrder._responsibleId, oOrder.Mecanico].concat(oOrder._resourceIds, oOrder._personnelNumbers), mFilters.responsable);
        });
    }

    function isExecutedOrder(oOrder) {
        var sStatus = DashboardDataService.canonicalStatus(oOrder);
        var sAppStatus = normalize(oOrder && oOrder.AppStatusCode);

        return EXECUTED_STATUSES.indexOf(sStatus) >= 0 ||
            EXECUTED_APP_STATUSES.indexOf(sAppStatus) >= 0;
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
            return oCause.OrderId && isCauseActive(oCause, oCutoff);
        }).forEach(function (oCause) {
            var sOrderId = String(oCause.OrderId);
            var oCurrent = mByOrder.get(sOrderId);
            var bPreferred = isTrue(oCause.IsPrimary) && (!oCurrent || !isTrue(oCurrent.IsPrimary));
            var oCurrentDate = oCurrent && parseDate(oCurrent.ValidFrom);
            var oCandidateDate = parseDate(oCause.ValidFrom);

            if (!oCurrent || bPreferred || (oCandidateDate && (!oCurrentDate || oCandidateDate > oCurrentDate))) {
                mByOrder.set(sOrderId, oCause);
            }
        });
        return mByOrder;
    }

    function dayDifference(oStartValue, oEndDate) {
        var oStartDate = parseDate(oStartValue);
        var iMilliseconds;

        if (!oStartDate || !oEndDate) {
            return null;
        }
        iMilliseconds = oEndDate.getTime() - oStartDate.getTime();
        return Math.max(0, Math.floor(iMilliseconds / 86400000));
    }

    function iconForCause(sCause) {
        var sText = normalize(sCause);

        if (sText.indexOf("MATERIAL") >= 0 || sText.indexOf("REFACC") >= 0) {
            return "sap-icon://product";
        }
        if (sText.indexOf("PROVEEDOR") >= 0) {
            return "sap-icon://shipping-status";
        }
        if (sText.indexOf("REPROGRAM") >= 0) {
            return "sap-icon://calendar";
        }
        return "sap-icon://alert";
    }

    function mostFrequentMaterial(aOrders) {
        var mTotals = new Map();

        asArray(aOrders).forEach(function (oOrder) {
            var sMaterial = oOrder._mainMaterial || "Sin material asociado";
            mTotals.set(sMaterial, (mTotals.get(sMaterial) || 0) + 1);
        });
        return Array.from(mTotals.entries()).sort(function (aLeft, aRight) {
            return aRight[1] - aLeft[1] || aLeft[0].localeCompare(aRight[0], "es");
        })[0][0];
    }

    function formatDays(iDays) {
        return Number.isFinite(iDays) ? Math.round(iDays) + " días" : "Sin datos";
    }

    function buildCauseRows(aNonExecuted, aCauses, oRange) {
        var mPrimaryCauses = getPrimaryCauses(aCauses, oRange.endDate);
        var mGroups = new Map();
        var iTotal = aNonExecuted.length;

        aNonExecuted.forEach(function (oOrder) {
            var oCause = mPrimaryCauses.get(String(oOrder.OrderId));
            var sCode = oCause && (oCause.CauseCode || oCause.OrderCauseId) || "SIN_CAUSA";
            var sCause = oCause && (oCause.CauseText || oCause.CauseCode) || "Sin causa registrada";
            var sKey = String(sCode) + "|" + String(sCause);
            var oGroup = mGroups.get(sKey) || { code: sCode, cause: sCause, orders: [] };

            oGroup.orders.push(oOrder);
            mGroups.set(sKey, oGroup);
        });

        return Array.from(mGroups.values()).map(function (oGroup) {
            var aDetails = oGroup.orders.map(function (oOrder) {
                var iDays = dayDifference(oOrder.PlannedStartDate, oRange.endDate);

                return {
                    ot: oOrder.OrderId || "Sin OT",
                    equipo: oOrder.EquipmentId || oOrder.EquipmentName || "Sin equipo",
                    cliente: oOrder.CustomerName || oOrder.CustomerId || "Sin cliente",
                    material: oOrder._mainMaterial || "Sin material asociado",
                    fechaProgramada: formatDate(oOrder.PlannedStartDate),
                    diasDetenida: formatDays(iDays),
                    responsable: oOrder._responsibleName || "Sin responsable asignado",
                    _plannedDate: parseDate(oOrder.PlannedStartDate) || new Date(8640000000000000)
                };
            }).sort(function (oLeft, oRight) {
                return oLeft._plannedDate - oRight._plannedDate;
            }).map(function (oDetail) {
                delete oDetail._plannedDate;
                return oDetail;
            });
            var aEquipmentIds = new Set(oGroup.orders.map(function (oOrder) { return oOrder.EquipmentId; }).filter(Boolean));
            var aCustomerIds = new Set(oGroup.orders.map(function (oOrder) { return oOrder.CustomerId; }).filter(Boolean));
            var aDelays = oGroup.orders.map(function (oOrder) {
                return dayDifference(oOrder.PlannedStartDate, oRange.endDate);
            }).filter(Number.isFinite);
            var iAverageDelay = aDelays.length
                ? aDelays.reduce(function (iSum, iDays) { return iSum + iDays; }, 0) / aDelays.length
                : null;
            var iCount = oGroup.orders.length;
            var iShare = percentage(iCount, iTotal);

            return {
                causa: oGroup.cause,
                material: mostFrequentMaterial(oGroup.orders),
                icon: iconForCause(oGroup.cause),
                otNoEjecutadas: iCount,
                porcentaje: formatPercentage(iShare, 0, "0%"),
                porcentajeValor: Number.isFinite(iShare) ? Math.round(iShare) : 0,
                equipos: aEquipmentIds.size,
                clientes: aCustomerIds.size,
                dias: formatDays(iAverageDelay),
                expanded: false,
                details: aDetails
            };
        }).sort(function (oLeft, oRight) {
            return oRight.otNoEjecutadas - oLeft.otNoEjecutadas ||
                oLeft.causa.localeCompare(oRight.causa, "es");
        }).map(function (oGroup, iIndex) {
            oGroup.expanded = iIndex === 0;
            return oGroup;
        });
    }

    function buildPeriodOptions(aOrders, mFilters, oRange) {
        var mPeriods = new Map();

        asArray(aOrders).forEach(function (oOrder) {
            var oDate = parseDate(oOrder.PlannedStartDate);
            if (oDate) {
                mPeriods.set(monthKey(oDate), { key: monthKey(oDate), text: formatMonth(oDate) });
            }
        });
        if (mPeriods.size === 0 && oRange.startDate) {
            mPeriods.set(monthKey(oRange.startDate), {
                key: monthKey(oRange.startDate),
                text: formatMonth(oRange.startDate)
            });
        }
        if (mFilters.periodo && !mPeriods.has(mFilters.periodo) && oRange.startDate) {
            mPeriods.set(mFilters.periodo, { key: mFilters.periodo, text: formatMonth(oRange.startDate) });
        }
        return Array.from(mPeriods.values()).sort(function (oLeft, oRight) {
            return oLeft.key.localeCompare(oRight.key);
        });
    }

    function buildFilters(aOrders, aCatalogs, mFilters, oRange) {
        var aCatalogZones = getCatalogOptions(aCatalogs, ["ZONE"], ALL_ZONES, "Todas");
        var aCatalogClients = getCatalogOptions(aCatalogs, ["CLIENT", "CUSTOMER"], ALL_VALUES, "Todos");
        var aCatalogResources = getCatalogOptions(aCatalogs, ["RESOURCE", "RESPONSIBLE", "MECHANIC"], ALL_VALUES, "Todos");

        return {
            periodos: buildPeriodOptions(aOrders, mFilters, oRange),
            zonas: preferCatalog(aCatalogZones, derivedOptions(aOrders, "_zoneId", "_zoneName", ALL_ZONES, "Todas")),
            clientes: preferCatalog(aCatalogClients, derivedOptions(aOrders, "CustomerId", "CustomerName", ALL_VALUES, "Todos")),
            responsables: preferCatalog(aCatalogResources, derivedOptions(aOrders, "_responsibleId", "_responsibleName", ALL_VALUES, "Todos"))
        };
    }

    function buildTotals(aNonExecuted, bHasStatusData, oRange) {
        var aDelays = aNonExecuted.map(function (oOrder) {
            return dayDifference(oOrder.PlannedStartDate, oRange.endDate);
        }).filter(Number.isFinite);
        var iAverageDelay = aDelays.length
            ? aDelays.reduce(function (iSum, iDays) { return iSum + iDays; }, 0) / aDelays.length
            : null;

        return {
            otNoEjecutadas: bHasStatusData ? aNonExecuted.length : "--",
            porcentaje: bHasStatusData && aNonExecuted.length ? "100%" : bHasStatusData ? "0%" : "--",
            equipos: new Set(aNonExecuted.map(function (oOrder) { return oOrder.EquipmentId; }).filter(Boolean)).size,
            clientes: new Set(aNonExecuted.map(function (oOrder) { return oOrder.CustomerId; }).filter(Boolean)).size,
            dias: formatDays(iAverageDelay)
        };
    }

    function buildData(oRaw, mFilters, sAnalysis) {
        var oRange = oRaw.range || {};
        var aEnriched = enrichOrders(oRaw, oRange);
        var aOrders = filterOrders(aEnriched, mFilters, oRange);
        var aExecuted = aOrders.filter(isExecutedOrder);
        var aNonExecuted = aOrders.filter(function (oOrder) {
            // Regla solicitada: todo lo que no esté finalizado, incluso una
            // OT sin estatus SAP, se considera no ejecutada.
            return !isExecutedOrder(oOrder);
        });
        var iClassified = aExecuted.length + aNonExecuted.length;
        var bHasStatusData = iClassified > 0;
        var iPlanned = aOrders.length;
        var iCompliance = bHasStatusData ? percentage(aExecuted.length, iPlanned) : null;
        var iNonExecutedPct = bHasStatusData ? percentage(aNonExecuted.length, iPlanned) : null;
        var sSelected = ["NO_EJECUTADAS", "EJECUTADAS", "TODAS"].indexOf(sAnalysis) >= 0
            ? sAnalysis
            : "NO_EJECUTADAS";
        var aCauses = sSelected === "NO_EJECUTADAS" && bHasStatusData
            ? buildCauseRows(aNonExecuted, oRaw.causes, oRange)
            : [];
        var sInfo = sSelected === "NO_EJECUTADAS"
            ? bHasStatusData
                ? aNonExecuted.length + " OT no ejecutadas agrupadas por causa"
                : "Sin datos de estatus para identificar OT no ejecutadas"
            : sSelected === "EJECUTADAS"
                ? aExecuted.length + " OT ejecutadas en el periodo seleccionado"
                : iPlanned + " OT planeadas en el periodo seleccionado";

        return {
            ui: {
                selectedAnalysis: sSelected,
                analysisInfo: sInfo,
                analysisLabel: sSelected === "NO_EJECUTADAS"
                    ? "No ejecutadas"
                    : sSelected === "EJECUTADAS"
                        ? "Ejecutadas"
                        : "Todas"
            },
            filters: {
                periodo: mFilters.periodo || "",
                fechaDesde: mFilters.fechaDesde || "",
                fechaHasta: mFilters.fechaHasta || "",
                zona: mFilters.zona || ALL_ZONES,
                cliente: mFilters.cliente || ALL_VALUES,
                responsable: mFilters.responsable || ALL_VALUES
            },
            catalogos: buildFilters(aEnriched, oRaw.catalogs, mFilters, oRange),
            kpis: {
                planeadas: iPlanned,
                ejecutadas: bHasStatusData ? aExecuted.length : "--",
                ejecutadasDescripcion: bHasStatusData ? formatPercentage(percentage(aExecuted.length, iPlanned), 1, "0.0%") + " del total" : "Sin datos de estatus",
                noEjecutadas: bHasStatusData ? aNonExecuted.length : "--",
                noEjecutadasDescripcion: bHasStatusData ? formatPercentage(iNonExecutedPct, 1, "0.0%") + " del total planeado" : "Sin datos de estatus",
                cumplimiento: formatPercentage(iCompliance, 1),
                cumplimientoDescripcion: bHasStatusData ? aExecuted.length + " de " + iPlanned + " OT" : "Sin datos de estatus"
            },
            analysisTabs: {
                noEjecutadas: "No ejecutadas (" + (bHasStatusData ? aNonExecuted.length : "--") + ")",
                ejecutadas: "Ejecutadas (" + (bHasStatusData ? aExecuted.length : "--") + ")",
                todas: "Todas (" + iPlanned + ")"
            },
            tableSubtitle: sSelected === "NO_EJECUTADAS"
                ? "Reparaciones planeadas no ejecutadas"
                : "Las causas de incumplimiento se presentan únicamente para las OT no ejecutadas.",
            causas: aCauses,
            totals: buildTotals(aNonExecuted, bHasStatusData, oRange),
            footerText: "Las causas están ordenadas por el número de OT no ejecutadas, de mayor a menor.",
            meta: {
                plannedOrders: iPlanned,
                executedOrders: aExecuted.length,
                nonExecutedOrders: aNonExecuted.length,
                hasStatusData: bHasStatusData
            }
        };
    }

    return {
        buildData: buildData
    };
});
