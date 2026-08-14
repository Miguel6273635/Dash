sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    // Debe coincidir con ReparacionesPlaneadasNoEjecutadas: ambas pantallas
    // analizan la misma población y se separan únicamente por estatus.
    var REPAIR_ORDER_TYPES = ["SM01", "SM02"];
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
        if (oDate.getUTCHours() === 0 && oDate.getUTCMinutes() === 0 && oDate.getUTCSeconds() === 0) {
            return new Date(oDate.getUTCFullYear(), oDate.getUTCMonth(), oDate.getUTCDate());
        }
        return oDate;
    }

    function parseTime(vValue) {
        var sTime = String(vValue || "").trim();
        var aIso = sTime.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
        var aClock = sTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

        if (aIso) {
            return { hours: Number(aIso[1] || 0), minutes: Number(aIso[2] || 0), seconds: Number(aIso[3] || 0) };
        }
        if (aClock) {
            return { hours: Number(aClock[1]), minutes: Number(aClock[2]), seconds: Number(aClock[3] || 0) };
        }
        return null;
    }

    function combineDateAndTime(vDate, vTime) {
        var oDate = parseDate(vDate);
        var oTime = parseTime(vTime);

        if (!oDate) {
            return null;
        }
        if (!oTime) {
            return oDate;
        }
        return new Date(oDate.getFullYear(), oDate.getMonth(), oDate.getDate(),
            oTime.hours, oTime.minutes, oTime.seconds);
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

    function percentage(iNumerator, iDenominator) {
        return iDenominator > 0 ? iNumerator / iDenominator * 100 : null;
    }

    function formatPercentage(iValue, iDecimals, sEmptyText) {
        return Number.isFinite(iValue)
            ? iValue.toFixed(iDecimals === undefined ? 1 : iDecimals) + "%"
            : sEmptyText || "Sin datos";
    }

    function formatDays(iDays) {
        var iRounded;
        var sValue;

        if (!Number.isFinite(iDays)) {
            return "Sin datos";
        }
        iRounded = Math.round(iDays * 10) / 10;
        sValue = Number.isInteger(iRounded) ? String(iRounded) : iRounded.toFixed(1);
        return sValue + (iRounded === 1 ? " día" : " días");
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(normalize(vValue)) >= 0;
    }

    function isFalse(vValue) {
        return vValue === false || ["FALSE", "0", "NO"].indexOf(normalize(vValue)) >= 0;
    }

    function isExecutedOrder(oOrder) {
        var sStatus = DashboardDataService.canonicalStatus(oOrder);
        var sAppStatus = normalize(oOrder && oOrder.AppStatusCode);

        return EXECUTED_SAP_STATUSES.indexOf(sStatus) >= 0 ||
            EXECUTED_APP_STATUSES.indexOf(sAppStatus) >= 0;
    }

    function isValidMaterial(oMaterial) {
        var sValidation = normalize(oMaterial && oMaterial.DataValidationStatusCode);

        return !isFalse(oMaterial && oMaterial.IsPublishable) &&
            (!sValidation || sValidation === "VALIDATED");
    }

    function getMaterialName(oMaterial) {
        return oMaterial && (
            oMaterial.MaterialName || oMaterial.MaterialText || oMaterial.MaterialCategoryName ||
            oMaterial.MaterialId || oMaterial.MaterialCategoryCode
        ) || "Sin material registrado";
    }

    function materialRank(oMaterial) {
        return -Number(oMaterial && (oMaterial.PlannedQuantity || oMaterial.RequiredQuantity) || 0);
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
        mByOrder.forEach(function (aItems) {
            aItems.sort(function (oLeft, oRight) {
                return materialRank(oLeft) - materialRank(oRight) ||
                    getMaterialName(oLeft).localeCompare(getMaterialName(oRight), "es");
            });
        });
        return mByOrder;
    }

    function isValidConfirmation(oConfirmation) {
        return Boolean(oConfirmation && oConfirmation.OrderId) &&
            isTrue(oConfirmation.IncludedInCalculation) &&
            !isTrue(oConfirmation.CancellationIndicator) &&
            !hasValue(oConfirmation.ReversalReference);
    }

    function buildConfirmationsByOrder(aConfirmations) {
        var mByOrder = new Map();

        asArray(aConfirmations).filter(isValidConfirmation).forEach(function (oConfirmation) {
            var sOrderId = String(oConfirmation.OrderId);
            var aItems = mByOrder.get(sOrderId) || [];

            aItems.push(Object.assign({}, oConfirmation, {
                _startAt: combineDateAndTime(oConfirmation.ActualStartDate, oConfirmation.ActualStartTime),
                _finishAt: combineDateAndTime(oConfirmation.ActualFinishDate, oConfirmation.ActualFinishTime)
            }));
            mByOrder.set(sOrderId, aItems);
        });
        mByOrder.forEach(function (aItems) {
            aItems.sort(function (oLeft, oRight) {
                return (oLeft._finishAt || oLeft._startAt || 0) - (oRight._finishAt || oRight._startAt || 0);
            });
        });
        return mByOrder;
    }

    function buildResourcesByPersonnel(aResources) {
        var mByPersonnel = new Map();

        asArray(aResources).forEach(function (oResource) {
            var sPersonnelNumber = String(oResource.PersonnelNumber || oResource.ResourceId || "");
            var aItems;

            if (!sPersonnelNumber) {
                return;
            }
            aItems = mByPersonnel.get(sPersonnelNumber) || [];
            aItems.push(oResource);
            mByPersonnel.set(sPersonnelNumber, aItems);
        });
        return mByPersonnel;
    }

    function nearestResource(aResources, oReference) {
        var iReference = oReference instanceof Date ? oReference.getTime() : 0;

        return asArray(aResources).slice().sort(function (oLeft, oRight) {
            var iLeft = Math.abs((parseDate(oLeft.WorkDate) || new Date(0)).getTime() - iReference);
            var iRight = Math.abs((parseDate(oRight.WorkDate) || new Date(0)).getTime() - iReference);

            return iLeft - iRight;
        })[0] || {};
    }

    function getExecutionData(aConfirmations, mResources) {
        var aStarts = asArray(aConfirmations).map(function (oConfirmation) {
            return oConfirmation._startAt;
        }).filter(Boolean).sort(function (oLeft, oRight) { return oLeft - oRight; });
        var aFinishes = asArray(aConfirmations).map(function (oConfirmation) {
            return oConfirmation._finishAt;
        }).filter(Boolean).sort(function (oLeft, oRight) { return oLeft - oRight; });
        var oLastConfirmation = asArray(aConfirmations).slice().sort(function (oLeft, oRight) {
            return (oRight._finishAt || oRight._startAt || 0) - (oLeft._finishAt || oLeft._startAt || 0);
        })[0] || {};
        var oStartAt = aStarts[0] || null;
        var oFinishAt = aFinishes[aFinishes.length - 1] || null;
        var sPersonnelNumber = String(oLastConfirmation.ExecutorPersonnelNumber || "");
        var oResource = nearestResource(mResources.get(sPersonnelNumber), oFinishAt || oStartAt);

        return {
            responsibleId: sPersonnelNumber,
            responsibleName: String(oResource.ResourceName || oResource.PersonnelName || sPersonnelNumber || "Sin responsable confirmado"),
            zoneId: String(oResource.ZoneId || ""),
            zoneName: String(oResource.ZoneName || oResource.ZoneId || ""),
            executionAt: oFinishAt || oStartAt,
            durationDays: oStartAt && oFinishAt && oFinishAt >= oStartAt
                ? (oFinishAt.getTime() - oStartAt.getTime()) / 86400000
                : null
        };
    }

    function enrichOrders(oRawData) {
        var mMaterials = buildMaterialsByOrder(oRawData.materials);
        var mConfirmations = buildConfirmationsByOrder(oRawData.confirmations);
        var mResources = buildResourcesByPersonnel(oRawData.resources);

        return uniqueBy(oRawData.orders, "OrderId").map(function (oOrder) {
            var sOrderId = String(oOrder.OrderId || "");
            var aMaterials = mMaterials.get(sOrderId) || [];
            var oMainMaterial = aMaterials[0] || null;
            var oExecution = getExecutionData(mConfirmations.get(sOrderId) || [], mResources);
            var sResponsibleId = oExecution.responsibleId || String(oOrder.Mecanico || "");

            return Object.assign({}, oOrder, {
                _material: getMaterialName(oMainMaterial),
                _responsibleId: sResponsibleId,
                _responsibleName: oExecution.responsibleName === "Sin responsable confirmado" && oOrder.Mecanico
                    ? String(oOrder.Mecanico)
                    : oExecution.responsibleName,
                _zoneId: oExecution.zoneId || String(oOrder.Zona || oOrder.ZoneId || ""),
                _zoneName: oExecution.zoneName || String(oOrder.Zona || oOrder.ZoneName || oOrder.ZoneId || "Sin zona"),
                _executionAt: oExecution.executionAt,
                _durationDays: oExecution.durationDays
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
            return REPAIR_ORDER_TYPES.indexOf(normalize(oOrder.OrderTypeCode)) >= 0 &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endDate) &&
                matchesOne([oOrder._zoneId, oOrder.Zona], mFilters.zona) &&
                matchesOne([oOrder.CustomerId], mFilters.cliente) &&
                matchesOne([oOrder._responsibleId, oOrder.Mecanico], mFilters.responsable);
        });
    }

    function getCatalogOptions(aCatalogs, aDomains, sAllKey, sAllText) {
        var aDomainsNormalized = aDomains.map(normalize);
        var aOptions = asArray(aCatalogs).filter(function (oCatalog) {
            return !isFalse(oCatalog.Active) && oCatalog.ValueId &&
                aDomainsNormalized.indexOf(normalize(oCatalog.FilterDomain)) >= 0;
        }).sort(function (oLeft, oRight) {
            return Number(oLeft.SortOrder || 0) - Number(oRight.SortOrder || 0);
        }).map(function (oCatalog) {
            return { key: String(oCatalog.ValueId), text: oCatalog.ValueText || String(oCatalog.ValueId) };
        });

        return [{ key: sAllKey, text: sAllText }].concat(uniqueBy(aOptions, "key"));
    }

    function derivedOptions(aItems, sKey, sText, sAllKey, sAllText) {
        var aOptions = asArray(aItems).filter(function (oItem) {
            return oItem && oItem[sKey];
        }).map(function (oItem) {
            return { key: String(oItem[sKey]), text: String(oItem[sText] || oItem[sKey]) };
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
            zonas: preferredOptions(
                getCatalogOptions(aCatalogs, ["ZONE"], ALL_ZONES, "Todas"),
                derivedOptions(aOrders, "_zoneId", "_zoneName", ALL_ZONES, "Todas")
            ),
            clientes: preferredOptions(
                getCatalogOptions(aCatalogs, ["CLIENT", "CUSTOMER"], ALL_VALUES, "Todos"),
                derivedOptions(aOrders, "CustomerId", "CustomerName", ALL_VALUES, "Todos")
            ),
            responsables: preferredOptions(
                getCatalogOptions(aCatalogs, ["RESOURCE", "RESPONSIBLE", "MECHANIC"], ALL_VALUES, "Todos"),
                derivedOptions(aOrders, "_responsibleId", "_responsibleName", ALL_VALUES, "Todos")
            )
        };
    }

    function iconForMaterial(sMaterial) {
        var sText = normalize(sMaterial);

        if (sText.indexOf("SENSOR") >= 0) {
            return "sap-icon://iphone";
        }
        if (sText.indexOf("RODAMIENTO") >= 0) {
            return "sap-icon://target-group";
        }
        if (sText.indexOf("TARJETA") >= 0 || sText.indexOf("ELECTR") >= 0) {
            return "sap-icon://it-system";
        }
        if (sText.indexOf("CONTACTOR") >= 0) {
            return "sap-icon://energy-saving-lightbulb";
        }
        return "sap-icon://product";
    }

    function buildMaterialRows(aExecutedOrders) {
        var mGroups = new Map();
        var iTotalExecuted = aExecutedOrders.length;

        aExecutedOrders.forEach(function (oOrder) {
            var sMaterial = oOrder._material || "Sin material registrado";
            var oGroup = mGroups.get(sMaterial) || { material: sMaterial, orders: [] };

            oGroup.orders.push(oOrder);
            mGroups.set(sMaterial, oGroup);
        });

        return Array.from(mGroups.values()).map(function (oGroup) {
            var aDurations = oGroup.orders.map(function (oOrder) {
                return oOrder._durationDays;
            }).filter(Number.isFinite);
            var iAverageDuration = aDurations.length
                ? aDurations.reduce(function (iSum, iValue) { return iSum + iValue; }, 0) / aDurations.length
                : null;
            var aOrders = oGroup.orders.map(function (oOrder) {
                return {
                    ot: oOrder.OrderId || "Sin OT",
                    equipo: oOrder.EquipmentName || oOrder.EquipmentId || "Sin equipo",
                    cliente: oOrder.CustomerName || oOrder.CustomerId || "Sin cliente",
                    fecha: formatDate(oOrder._executionAt),
                    tecnico: oOrder._responsibleName || "Sin responsable confirmado",
                    dias: formatDays(oOrder._durationDays),
                    _date: oOrder._executionAt || new Date(8640000000000000)
                };
            }).sort(function (oLeft, oRight) {
                return oLeft._date - oRight._date;
            }).map(function (oOrder) {
                delete oOrder._date;
                return oOrder;
            });

            return {
                material: oGroup.material,
                icon: iconForMaterial(oGroup.material),
                ejecutadas: oGroup.orders.length,
                porcentaje: formatPercentage(percentage(oGroup.orders.length, iTotalExecuted), 1, "0.0%"),
                equipos: new Set(oGroup.orders.map(function (oOrder) { return oOrder.EquipmentId; }).filter(Boolean)).size,
                clientes: new Set(oGroup.orders.map(function (oOrder) { return oOrder.CustomerId; }).filter(Boolean)).size,
                dias: formatDays(iAverageDuration),
                expanded: false,
                chevronIcon: "sap-icon://navigation-right-arrow",
                ordenes: aOrders
            };
        }).sort(function (oLeft, oRight) {
            return oRight.ejecutadas - oLeft.ejecutadas || oLeft.material.localeCompare(oRight.material, "es");
        }).map(function (oGroup, iIndex) {
            oGroup.expanded = iIndex === 0;
            oGroup.chevronIcon = iIndex === 0
                ? "sap-icon://navigation-down-arrow"
                : "sap-icon://navigation-right-arrow";
            return oGroup;
        });
    }

    function buildData(oRawData, mFilters, sAnalysis) {
        var oRange = oRawData.range || {};
        var aEnrichedOrders = enrichOrders(oRawData);
        var aOrders = filterOrders(aEnrichedOrders, mFilters, oRange);
        var aExecutedOrders = aOrders.filter(isExecutedOrder);
        var aNonExecutedOrders = aOrders.filter(function (oOrder) {
            // Regla aprobada para las pantallas actuales: todo estatus que no
            // sea finalizado, incluido el vacío, se considera no ejecutado.
            return !isExecutedOrder(oOrder);
        });
        var iPlanned = aOrders.length;
        var sSelectedAnalysis = ["NO_EJECUTADAS", "EJECUTADAS", "TODAS"].indexOf(sAnalysis) >= 0
            ? sAnalysis
            : "EJECUTADAS";
        var iCompliance = percentage(aExecutedOrders.length, iPlanned);
        var iNonExecutedPct = percentage(aNonExecutedOrders.length, iPlanned);
        var aMateriales = sSelectedAnalysis === "EJECUTADAS" ? buildMaterialRows(aExecutedOrders) : [];

        return {
            ui: { selectedAnalysis: sSelectedAnalysis },
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
                ejecutadas: aExecutedOrders.length,
                noEjecutadas: aNonExecutedOrders.length,
                cumplimiento: formatPercentage(iCompliance, 1, "0.0%"),
                ejecutadasDescripcion: formatPercentage(iCompliance, 1, "0.0%") + " del total",
                noEjecutadasDescripcion: formatPercentage(iNonExecutedPct, 1, "0.0%") + " del total planeado",
                resumen: aExecutedOrders.length + " de " + iPlanned + " OT"
            },
            infoMessage: sSelectedAnalysis === "EJECUTADAS"
                ? "Análisis basado en " + aExecutedOrders.length + " OT ejecutadas en el periodo seleccionado."
                : sSelectedAnalysis === "NO_EJECUTADAS"
                    ? aNonExecutedOrders.length + " OT no ejecutadas. Consulta la vista de causas para el detalle."
                    : iPlanned + " OT planeadas en el periodo seleccionado.",
            materiales: aMateriales,
            meta: {
                plannedOrders: iPlanned,
                executedOrders: aExecutedOrders.length,
                nonExecutedOrders: aNonExecutedOrders.length,
                missingMaterialOrders: aExecutedOrders.filter(function (oOrder) {
                    return oOrder._material === "Sin material registrado";
                }).length,
                missingConfirmationOrders: aExecutedOrders.filter(function (oOrder) {
                    return !oOrder._executionAt;
                }).length,
                unavailableEntitySets: oRawData.meta && oRawData.meta.unavailableEntitySets || []
            }
        };
    }

    return {
        buildData: buildData
    };
});
