sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    var REPAIR_ORDER_TYPE = "SM02";
    var EXECUTED_STATUS = "E0015";
    var NON_EXECUTED_STATUSES = ["E0013", "E0014"];
    var ALL_ZONES = "TODAS";
    var ALL_VALUES = "TODOS";

    function asArray(vValue) {
        return Array.isArray(vValue) ? vValue : [];
    }

    function normalize(vValue) {
        return String(vValue || "").trim().toUpperCase();
    }

    function hasFilterValue(vValue) {
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
        var sValue;

        if (!vValue) {
            return null;
        }
        if (vValue instanceof Date) {
            oDate = new Date(vValue.getTime());
        } else {
            sValue = String(vValue).trim();
            aMatch = sValue.match(/\/Date\((-?\d+)/);
            if (aMatch) {
                oDate = new Date(Number(aMatch[1]));
            } else {
                aMatch = sValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (aMatch) {
                    oDate = new Date(Number(aMatch[3]), Number(aMatch[2]) - 1, Number(aMatch[1]));
                } else {
                    aMatch = sValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    oDate = aMatch
                        ? new Date(Number(aMatch[1]), Number(aMatch[2]) - 1, Number(aMatch[3]))
                        : new Date(sValue);
                }
            }
        }
        if (!oDate || Number.isNaN(oDate.getTime())) {
            return null;
        }

        if (oDate.getUTCHours() === 0 && oDate.getUTCMinutes() === 0 && oDate.getUTCSeconds() === 0) {
            return new Date(oDate.getUTCFullYear(), oDate.getUTCMonth(), oDate.getUTCDate());
        }
        return oDate;
    }

    function isWithinRange(vValue, oStartDate, oEndExclusive) {
        var oDate = parseDate(vValue);

        return Boolean(oDate) &&
            (!oStartDate || oDate >= oStartDate) &&
            (!oEndExclusive || oDate < oEndExclusive);
    }

    function isValidAt(oRecord, oReferenceDate) {
        var oValidFrom = parseDate(oRecord && oRecord.ValidFrom);
        var oValidTo = parseDate(oRecord && oRecord.ValidTo);

        return (!oValidFrom || !oReferenceDate || oValidFrom <= oReferenceDate) &&
            (!oValidTo || !oReferenceDate || oValidTo >= oReferenceDate);
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

    function canonicalStatus(oOrder) {
        var sSapStatus = normalize(oOrder && oOrder.SapUserStatusCode);

        return sSapStatus || DashboardDataService.canonicalStatus(oOrder);
    }

    function matchesOne(aValues, vExpected) {
        return !hasFilterValue(vExpected) || aValues.some(function (vValue) {
            return normalize(vValue) === normalize(vExpected);
        });
    }

    function buildIndex(aItems, sProperty) {
        var mIndex = new Map();

        asArray(aItems).forEach(function (oItem) {
            var sKey = String(oItem && oItem[sProperty] || "");
            var aValues;

            if (!sKey) {
                return;
            }
            aValues = mIndex.get(sKey) || [];
            aValues.push(oItem);
            mIndex.set(sKey, aValues);
        });
        return mIndex;
    }

    function assignmentRank(oAssignment) {
        var sAssignmentType = normalize(oAssignment && oAssignment.AssignmentTypeCode);
        var sRole = normalize(oAssignment && oAssignment.RoleCode);
        var iAssignmentType = sAssignmentType === "PLANNED" ? 0 : 1;
        var iRole = sRole === "RESPONSIBLE" ? 0 : sRole === "MECHANIC" ? 1 : 2;

        return iAssignmentType * 10 + iRole;
    }

    function selectAssignment(aAssignments, oReferenceDate) {
        return asArray(aAssignments).filter(function (oAssignment) {
            return oAssignment && oAssignment.ResourceId && isValidAt(oAssignment, oReferenceDate);
        }).sort(function (oLeft, oRight) {
            var iRankDifference = assignmentRank(oLeft) - assignmentRank(oRight);

            return iRankDifference ||
                String(oLeft.OrderResourceId || oLeft.ResourceId).localeCompare(
                    String(oRight.OrderResourceId || oRight.ResourceId)
                );
        })[0] || null;
    }

    function selectResourceDaily(aResources, oReferenceDate) {
        var aCandidates = asArray(aResources).filter(function (oResource) {
            return Boolean(parseDate(oResource && oResource.WorkDate));
        });
        var iReference = oReferenceDate && oReferenceDate.getTime();

        if (!aCandidates.length) {
            return null;
        }
        return aCandidates.sort(function (oLeft, oRight) {
            var oLeftDate = parseDate(oLeft.WorkDate);
            var oRightDate = parseDate(oRight.WorkDate);
            var bLeftAfter = Number.isFinite(iReference) && oLeftDate.getTime() > iReference;
            var bRightAfter = Number.isFinite(iReference) && oRightDate.getTime() > iReference;

            if (bLeftAfter !== bRightAfter) {
                return bLeftAfter ? 1 : -1;
            }
            if (bLeftAfter) {
                return oLeftDate - oRightDate;
            }
            return oRightDate - oLeftDate ||
                String(oLeft.ShiftId || "").localeCompare(String(oRight.ShiftId || ""));
        })[0];
    }

    function isPublishableMaterial(oMaterial) {
        var sValidation = normalize(oMaterial && oMaterial.DataValidationStatusCode);

        return isTrue(oMaterial && oMaterial.IsPublishable) &&
            ["INVALID", "REJECTED", "ERROR"].indexOf(sValidation) < 0;
    }

    function selectMainMaterial(aMaterials) {
        return asArray(aMaterials).filter(isPublishableMaterial).sort(function (oLeft, oRight) {
            var oLeftDate = parseDate(oLeft.RequiredDate);
            var oRightDate = parseDate(oRight.RequiredDate);

            if (oLeftDate && oRightDate && oLeftDate.getTime() !== oRightDate.getTime()) {
                return oLeftDate - oRightDate;
            }
            if (oLeftDate && !oRightDate) {
                return -1;
            }
            if (!oLeftDate && oRightDate) {
                return 1;
            }
            return String(oLeft.MaterialRequirementId || oLeft.MaterialId || "").localeCompare(
                String(oRight.MaterialRequirementId || oRight.MaterialId || "")
            );
        })[0] || null;
    }

    function enrichOrders(oRawData) {
        var mAssignmentsByOrder = buildIndex(oRawData.assignments, "OrderId");
        var mResourcesById = buildIndex(oRawData.resources, "ResourceId");
        var mMaterialsByOrder = buildIndex(oRawData.materials, "OrderId");

        return uniqueBy(oRawData.orders, "OrderId").map(function (oOrder) {
            var sOrderId = String(oOrder.OrderId || "");
            var oReferenceDate = parseDate(oOrder.FechaInicioProg) ||
                parseDate(oOrder.PlannedStartDate) ||
                oRawData.range.endDate;
            var aAssignments = mAssignmentsByOrder.get(sOrderId) || [];
            var oAssignment = selectAssignment(aAssignments, oReferenceDate);
            var sResourceId = String(
                oAssignment && oAssignment.ResourceId ||
                oOrder.Mecanico ||
                oOrder.SupervisorId ||
                ""
            );
            var oResource = selectResourceDaily(mResourcesById.get(sResourceId), oReferenceDate) || {};
            var oMaterial = selectMainMaterial(mMaterialsByOrder.get(sOrderId));
            var aResourceIds = aAssignments.map(function (oItem) {
                return String(oItem.ResourceId || "");
            }).filter(Boolean);
            var aPersonnelNumbers = aAssignments.map(function (oItem) {
                return String(oItem.PersonnelNumber || "");
            }).filter(Boolean);

            return Object.assign({}, oOrder, {
                _resourceIds: aResourceIds,
                _personnelNumbers: aPersonnelNumbers,
                _responsibleId: sResourceId,
                _responsibleName: oResource.ResourceName ||
                    oAssignment && (oAssignment.PersonnelNumber || oAssignment.ResourceId) ||
                    oOrder.Mecanico ||
                    oOrder.SupervisorId ||
                    "Sin responsable asignado",
                _zoneId: String(oResource.ZoneId || oOrder.Zona || ""),
                _zoneName: oResource.ZoneName || oResource.ZoneId || oOrder.Zona || "Sin zona",
                _mainMaterial: oMaterial,
                _mainMaterialName: oMaterial &&
                    (oMaterial.MaterialName || oMaterial.MaterialId) ||
                    "Sin material publicable"
            });
        });
    }

    function filterOrders(aOrders, mFilters, oRange) {
        return asArray(aOrders).filter(function (oOrder) {
            return normalize(oOrder.OrderTypeCode) === REPAIR_ORDER_TYPE &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endExclusive) &&
                matchesOne([oOrder._zoneId], mFilters.zona) &&
                matchesOne([oOrder.CustomerId], mFilters.cliente) &&
                matchesOne([oOrder._responsibleId]
                    .concat(oOrder._resourceIds, oOrder._personnelNumbers), mFilters.responsable);
        });
    }

    function isCauseCandidate(oCause, oCutoffDate) {
        var sContext = normalize(oCause && oCause.CauseContextCode);

        return Boolean(oCause && oCause.OrderId) &&
            !isFalse(oCause.IsPrimary) &&
            (!sContext || sContext === "NON_EXECUTION") &&
            isValidAt(oCause, oCutoffDate);
    }

    function causeRank(oCause) {
        return isTrue(oCause && oCause.IsPrimary) ? 0 : 1;
    }

    function selectPrimaryCauses(aCauses, oCutoffDate) {
        var mByOrder = new Map();

        asArray(aCauses).filter(function (oCause) {
            return isCauseCandidate(oCause, oCutoffDate);
        }).forEach(function (oCause) {
            var sOrderId = String(oCause.OrderId);
            var aCandidates = mByOrder.get(sOrderId) || [];

            aCandidates.push(oCause);
            mByOrder.set(sOrderId, aCandidates);
        });
        mByOrder.forEach(function (aCandidates, sOrderId) {
            aCandidates.sort(function (oLeft, oRight) {
                var iRankDifference = causeRank(oLeft) - causeRank(oRight);
                var oLeftFrom = parseDate(oLeft.ValidFrom);
                var oRightFrom = parseDate(oRight.ValidFrom);

                return iRankDifference ||
                    (oRightFrom ? oRightFrom.getTime() : 0) -
                    (oLeftFrom ? oLeftFrom.getTime() : 0) ||
                    String(oLeft.OrderCauseId || "").localeCompare(String(oRight.OrderCauseId || ""));
            });
            mByOrder.set(sOrderId, aCandidates[0]);
        });
        return mByOrder;
    }

    function dayDifference(vStartDate, oEndDate) {
        var oStartDate = parseDate(vStartDate);
        var oStartDay;
        var oEndDay;

        if (!oStartDate || !oEndDate) {
            return null;
        }
        oStartDay = Date.UTC(oStartDate.getFullYear(), oStartDate.getMonth(), oStartDate.getDate());
        oEndDay = Date.UTC(oEndDate.getFullYear(), oEndDate.getMonth(), oEndDate.getDate());
        return Math.max(0, Math.floor((oEndDay - oStartDay) / 86400000));
    }

    function formatDays(iDays) {
        if (!Number.isFinite(iDays)) {
            return "Sin datos";
        }
        return Math.round(iDays) + (Math.round(iDays) === 1 ? " día" : " días");
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

    function groupMaterialName(aOrders) {
        var aMaterials = Array.from(new Set(asArray(aOrders).map(function (oOrder) {
            return oOrder._mainMaterialName;
        }).filter(Boolean)));

        return aMaterials.length === 1 ? aMaterials[0] :
            aMaterials.length > 1 ? "Varios materiales" : "Sin material publicable";
    }

    function buildCauseRows(aNonExecuted, aCauses, oRange) {
        var mPrimaryCauses = selectPrimaryCauses(aCauses, oRange.endDate);
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
                return {
                    ot: oOrder.OrderId || "Sin OT",
                    equipo: oOrder.EquipmentName || oOrder.EquipmentId || "Sin equipo",
                    cliente: oOrder.CustomerName || oOrder.CustomerId || "Sin cliente",
                    material: oOrder._mainMaterialName,
                    fechaProgramada: formatDate(oOrder.PlannedStartDate),
                    diasDetenida: formatDays(dayDifference(oOrder.PlannedStartDate, oRange.endDate)),
                    responsable: oOrder._responsibleName,
                    _plannedDate: parseDate(oOrder.PlannedStartDate) || new Date(8640000000000000)
                };
            }).sort(function (oLeft, oRight) {
                return oLeft._plannedDate - oRight._plannedDate;
            }).map(function (oDetail) {
                delete oDetail._plannedDate;
                return oDetail;
            });
            var aEquipmentIds = new Set(oGroup.orders.map(function (oOrder) {
                return oOrder.EquipmentId;
            }).filter(Boolean));
            var aCustomerIds = new Set(oGroup.orders.map(function (oOrder) {
                return oOrder.CustomerId;
            }).filter(Boolean));
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
                material: groupMaterialName(oGroup.orders),
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

    function getCatalogOptions(aCatalogs, aDomains, sAllKey, sAllText, oCutoffDate) {
        var aAllowedDomains = aDomains.map(normalize);
        var aValues = asArray(aCatalogs).filter(function (oCatalog) {
            return !isFalse(oCatalog.Active) &&
                aAllowedDomains.indexOf(normalize(oCatalog.FilterDomain)) >= 0 &&
                oCatalog.ValueId &&
                isValidAt(oCatalog, oCutoffDate);
        }).sort(function (oLeft, oRight) {
            return Number(oLeft.SortOrder || 0) - Number(oRight.SortOrder || 0);
        }).map(function (oCatalog) {
            return {
                key: String(oCatalog.ValueId),
                text: oCatalog.ValueText || String(oCatalog.ValueId)
            };
        });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aValues, "key"));
    }

    function derivedOptions(aItems, sKey, sText, sAllKey, sAllText) {
        var aValues = asArray(aItems).filter(function (oItem) {
            return oItem && oItem[sKey];
        }).map(function (oItem) {
            return {
                key: String(oItem[sKey]),
                text: String(oItem[sText] || oItem[sKey])
            };
        }).sort(function (oLeft, oRight) {
            return oLeft.text.localeCompare(oRight.text, "es");
        });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aValues, "key"));
    }

    function preferCatalog(aCatalogValues, aDerivedValues) {
        return aCatalogValues.length > 1 ? aCatalogValues : aDerivedValues;
    }

    function buildPeriodOptions(mFilters, oRange) {
        var oStartDate = oRange.startDate;

        if (!oStartDate) {
            return [];
        }
        return [{
            key: mFilters.periodo || monthKey(oStartDate),
            text: formatMonth(oStartDate)
        }];
    }

    function buildFilters(aOrders, aCatalogs, mFilters, oRange) {
        var aCatalogZones = getCatalogOptions(
            aCatalogs,
            ["ZONE"],
            ALL_ZONES,
            "Todas",
            oRange.endDate
        );
        var aCatalogClients = getCatalogOptions(
            aCatalogs,
            ["CLIENT", "CUSTOMER"],
            ALL_VALUES,
            "Todos",
            oRange.endDate
        );
        var aCatalogResources = getCatalogOptions(
            aCatalogs,
            ["RESOURCE", "RESPONSIBLE", "MECHANIC"],
            ALL_VALUES,
            "Todos",
            oRange.endDate
        );

        return {
            periodos: buildPeriodOptions(mFilters, oRange),
            zonas: preferCatalog(
                aCatalogZones,
                derivedOptions(aOrders, "_zoneId", "_zoneName", ALL_ZONES, "Todas")
            ),
            clientes: preferCatalog(
                aCatalogClients,
                derivedOptions(aOrders, "CustomerId", "CustomerName", ALL_VALUES, "Todos")
            ),
            responsables: preferCatalog(
                aCatalogResources,
                derivedOptions(aOrders, "_responsibleId", "_responsibleName", ALL_VALUES, "Todos")
            )
        };
    }

    function buildTotals(aNonExecuted, oRange, bShowCauseAnalysis) {
        var aDelays;
        var iAverageDelay;

        if (!bShowCauseAnalysis) {
            return {
                otNoEjecutadas: "—",
                porcentaje: "—",
                equipos: "—",
                clientes: "—",
                dias: "—"
            };
        }

        aDelays = aNonExecuted.map(function (oOrder) {
            return dayDifference(oOrder.PlannedStartDate, oRange.endDate);
        }).filter(Number.isFinite);
        iAverageDelay = aDelays.length
            ? aDelays.reduce(function (iSum, iDays) { return iSum + iDays; }, 0) / aDelays.length
            : null;

        return {
            otNoEjecutadas: aNonExecuted.length,
            porcentaje: aNonExecuted.length ? "100%" : "0%",
            equipos: new Set(aNonExecuted.map(function (oOrder) {
                return oOrder.EquipmentId;
            }).filter(Boolean)).size,
            clientes: new Set(aNonExecuted.map(function (oOrder) {
                return oOrder.CustomerId;
            }).filter(Boolean)).size,
            dias: formatDays(iAverageDelay)
        };
    }

    function buildDataWarning(oRawData) {
        var aUnavailable = asArray(oRawData.meta && oRawData.meta.unavailableEntitySets);

        if (!aUnavailable.length) {
            return "";
        }
        return "Datos parciales: no fue posible consultar " + aUnavailable.map(function (oItem) {
            return oItem.entitySet;
        }).join(", ") + ".";
    }

    function buildData(oRawData, mFilters, sAnalysis) {
        var oRaw = oRawData || {};
        var oRange = oRaw.range || {};
        var mActiveFilters = mFilters || {};
        var aEnriched = enrichOrders(oRaw);
        var aOrders = filterOrders(aEnriched, mActiveFilters, oRange);
        var aExecuted = aOrders.filter(function (oOrder) {
            return canonicalStatus(oOrder) === EXECUTED_STATUS;
        });
        var aNonExecuted = aOrders.filter(function (oOrder) {
            return NON_EXECUTED_STATUSES.indexOf(canonicalStatus(oOrder)) >= 0;
        });
        var aSpecial = aOrders.filter(function (oOrder) {
            var sStatus = canonicalStatus(oOrder);

            return Boolean(sStatus) &&
                sStatus !== EXECUTED_STATUS &&
                NON_EXECUTED_STATUSES.indexOf(sStatus) < 0;
        });
        var aWithoutStatus = aOrders.filter(function (oOrder) {
            return !canonicalStatus(oOrder);
        });
        var iPlanned = aOrders.length;
        var iCompliance = percentage(aExecuted.length, iPlanned);
        var sSelected = ["NO_EJECUTADAS", "EJECUTADAS", "TODAS"].indexOf(sAnalysis) >= 0
            ? sAnalysis
            : "NO_EJECUTADAS";
        var bShowCauseAnalysis = sSelected === "NO_EJECUTADAS";
        var aCauseRows = bShowCauseAnalysis
            ? buildCauseRows(aNonExecuted, oRaw.causes, oRange)
            : [];
        var sAnalysisInfo = sSelected === "NO_EJECUTADAS"
            ? "Mostrando " + aNonExecuted.length + " reparaciones planeadas no ejecutadas"
            : sSelected === "EJECUTADAS"
                ? "Mostrando " + aExecuted.length + " reparaciones planeadas ejecutadas"
                : "Mostrando " + iPlanned + " reparaciones planeadas";

        return {
            ui: {
                selectedAnalysis: sSelected,
                analysisInfo: sAnalysisInfo,
                analysisLabel: sSelected === "NO_EJECUTADAS"
                    ? "No ejecutadas"
                    : sSelected === "EJECUTADAS" ? "Ejecutadas" : "Todas",
                dataWarning: buildDataWarning(oRaw),
                errorMessage: ""
            },
            filters: {
                periodo: mActiveFilters.periodo || "",
                fechaDesde: mActiveFilters.fechaDesde || "",
                fechaHasta: mActiveFilters.fechaHasta || "",
                zona: mActiveFilters.zona || ALL_ZONES,
                cliente: mActiveFilters.cliente || ALL_VALUES,
                responsable: mActiveFilters.responsable || ALL_VALUES
            },
            catalogos: buildFilters(aEnriched, oRaw.catalogs, mActiveFilters, oRange),
            kpis: {
                planeadas: iPlanned,
                ejecutadas: aExecuted.length,
                noEjecutadas: aNonExecuted.length,
                cumplimiento: formatPercentage(iCompliance, 1),
                cumplimientoValor: iCompliance,
                hasComplianceData: iPlanned > 0
            },
            analysisTabs: {
                noEjecutadas: "No ejecutadas (" + aNonExecuted.length + ")",
                ejecutadas: "Ejecutadas (" + aExecuted.length + ")",
                todas: "Todas (" + iPlanned + ")"
            },
            tableSubtitle: bShowCauseAnalysis
                ? aCauseRows.length
                    ? aCauseRows.length + " causas de incumplimiento"
                    : "Sin información disponible"
                : "Las causas se muestran únicamente para las OT no ejecutadas.",
            causas: aCauseRows,
            totals: buildTotals(aNonExecuted, oRange, bShowCauseAnalysis),
            footerText: "Los datos se obtienen del servicio SAP.",
            meta: {
                plannedOrders: iPlanned,
                executedOrders: aExecuted.length,
                nonExecutedOrders: aNonExecuted.length,
                specialStatusOrders: aSpecial.length,
                ordersWithoutStatus: aWithoutStatus.length,
                hasStatusData: aExecuted.length + aNonExecuted.length + aSpecial.length > 0
            }
        };
    }

    return {
        buildData: buildData
    };
});
