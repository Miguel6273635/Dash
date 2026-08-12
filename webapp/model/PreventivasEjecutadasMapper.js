sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    // Regla de la especificación de esta pantalla: las OT preventivas
    // ejecutadas pertenecen al tipo de orden SM02.
    var PREVENTIVE_ORDER_TYPE = "SM02";
    // Se conserva la homologación funcional ya aprobada: finalizada,
    // pendiente de firma y finalizada administrativa cuentan como ejecutadas.
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
        // SAP serializa Edm.DateTime sin hora a medianoche UTC. Conservamos
        // el día de SAP para no desplazarlo por el huso horario del navegador.
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
            return {
                hours: Number(aIso[1] || 0),
                minutes: Number(aIso[2] || 0),
                seconds: Number(aIso[3] || 0)
            };
        }
        if (aClock) {
            return {
                hours: Number(aClock[1]),
                minutes: Number(aClock[2]),
                seconds: Number(aClock[3] || 0)
            };
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
        return new Date(
            oDate.getFullYear(), oDate.getMonth(), oDate.getDate(),
            oTime.hours, oTime.minutes, oTime.seconds
        );
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
        var sSapStatus = DashboardDataService.canonicalStatus(oOrder);
        var sAppStatus = normalize(oOrder && oOrder.AppStatusCode);

        return EXECUTED_SAP_STATUSES.indexOf(sSapStatus) >= 0 ||
            EXECUTED_APP_STATUSES.indexOf(sAppStatus) >= 0;
    }

    function isValidConfirmation(oConfirmation) {
        return Boolean(oConfirmation && oConfirmation.OrderId) &&
            isTrue(oConfirmation.IncludedInCalculation) &&
            !isTrue(oConfirmation.CancellationIndicator) &&
            !hasValue(oConfirmation.ReversalReference);
    }

    function confirmationStart(oConfirmation) {
        return combineDateAndTime(oConfirmation.ActualStartDate, oConfirmation.ActualStartTime);
    }

    function confirmationFinish(oConfirmation) {
        return combineDateAndTime(oConfirmation.ActualFinishDate, oConfirmation.ActualFinishTime);
    }

    function buildConfirmationsByOrder(aConfirmations) {
        var mByOrder = new Map();

        asArray(aConfirmations).filter(isValidConfirmation).forEach(function (oConfirmation) {
            var sOrderId = String(oConfirmation.OrderId);
            var aItems = mByOrder.get(sOrderId) || [];

            aItems.push(Object.assign({}, oConfirmation, {
                _startAt: confirmationStart(oConfirmation),
                _finishAt: confirmationFinish(oConfirmation)
            }));
            mByOrder.set(sOrderId, aItems);
        });
        mByOrder.forEach(function (aItems) {
            aItems.sort(function (oLeft, oRight) {
                return (oLeft._finishAt || oLeft._startAt || 0) -
                    (oRight._finishAt || oRight._startAt || 0);
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

    function nearestResource(aResources, oReferenceDate) {
        var oReference = oReferenceDate instanceof Date ? oReferenceDate.getTime() : 0;

        return asArray(aResources).slice().sort(function (oLeft, oRight) {
            var iLeft = Math.abs((parseDate(oLeft.WorkDate) || new Date(0)).getTime() - oReference);
            var iRight = Math.abs((parseDate(oRight.WorkDate) || new Date(0)).getTime() - oReference);

            return iLeft - iRight;
        })[0] || {};
    }

    function getOrderExecution(aConfirmations, mResources) {
        var aStarts = asArray(aConfirmations).map(function (oConfirmation) {
            return oConfirmation._startAt;
        }).filter(Boolean).sort(function (oLeft, oRight) {
            return oLeft - oRight;
        });
        var aFinishes = asArray(aConfirmations).map(function (oConfirmation) {
            return oConfirmation._finishAt;
        }).filter(Boolean).sort(function (oLeft, oRight) {
            return oLeft - oRight;
        });
        var oLastConfirmation = asArray(aConfirmations).slice().sort(function (oLeft, oRight) {
            return (oRight._finishAt || oRight._startAt || 0) -
                (oLeft._finishAt || oLeft._startAt || 0);
        })[0] || {};
        var oStart = aStarts[0] || null;
        var oFinish = aFinishes[aFinishes.length - 1] || null;
        var sPersonnelNumber = String(oLastConfirmation.ExecutorPersonnelNumber || "");
        var oResource = nearestResource(mResources.get(sPersonnelNumber), oFinish || oStart);
        var iDurationDays = oStart && oFinish && oFinish >= oStart
            ? (oFinish.getTime() - oStart.getTime()) / 86400000
            : null;

        return {
            personnelNumber: sPersonnelNumber,
            resourceId: String(oResource.ResourceId || sPersonnelNumber || ""),
            responsibleName: String(oResource.ResourceName || oResource.PersonnelName ||
                sPersonnelNumber || "Sin responsable confirmado"),
            zoneId: String(oResource.ZoneId || ""),
            zoneName: String(oResource.ZoneName || oResource.ZoneId || ""),
            executionAt: oFinish || oStart || null,
            durationDays: iDurationDays
        };
    }

    function enrichOrders(oRawData) {
        var mConfirmations = buildConfirmationsByOrder(oRawData.confirmations);
        var mResources = buildResourcesByPersonnel(oRawData.resources);

        return uniqueBy(oRawData.orders, "OrderId").map(function (oOrder) {
            var oExecution = getOrderExecution(
                mConfirmations.get(String(oOrder.OrderId || "")) || [],
                mResources
            );

            return Object.assign({}, oOrder, {
                _responsibleId: oExecution.personnelNumber || String(oOrder.Mecanico || ""),
                _resourceId: oExecution.resourceId,
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
            return normalize(oOrder.OrderTypeCode) === PREVENTIVE_ORDER_TYPE &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endDate) &&
                matchesOne([oOrder._zoneId, oOrder.Zona], mFilters.zona) &&
                matchesOne([oOrder.CustomerId], mFilters.cliente) &&
                matchesOne([oOrder._responsibleId, oOrder._resourceId, oOrder.Mecanico], mFilters.responsable);
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

    function buildResponsibleRows(aExecutedOrders) {
        var mGroups = new Map();
        var iTotalExecuted = aExecutedOrders.length;

        aExecutedOrders.forEach(function (oOrder) {
            var sKey = oOrder._responsibleId || "SIN_RESPONSABLE";
            var oGroup = mGroups.get(sKey) || {
                id: sKey,
                nombre: oOrder._responsibleName || "Sin responsable confirmado",
                orders: []
            };

            oGroup.orders.push(oOrder);
            mGroups.set(sKey, oGroup);
        });

        return Array.from(mGroups.values()).map(function (oGroup) {
            var aDurations = oGroup.orders.map(function (oOrder) {
                return oOrder._durationDays;
            }).filter(Number.isFinite);
            var iAverageDuration = aDurations.length
                ? aDurations.reduce(function (iTotal, iValue) { return iTotal + iValue; }, 0) / aDurations.length
                : null;
            var aOrders = oGroup.orders.map(function (oOrder) {
                return {
                    ot: oOrder.OrderId || "Sin OT",
                    cliente: oOrder.CustomerName || oOrder.CustomerId || "Sin cliente",
                    elevador: oOrder.EquipmentName || oOrder.EquipmentId || "Sin elevador",
                    fecha: formatDate(oOrder._executionAt),
                    tiempo: formatDays(oOrder._durationDays),
                    _date: oOrder._executionAt || new Date(8640000000000000)
                };
            }).sort(function (oLeft, oRight) {
                return oLeft._date - oRight._date;
            }).map(function (oOrder) {
                delete oOrder._date;
                return oOrder;
            });

            return {
                id: oGroup.id,
                nombre: oGroup.nombre,
                ot: oGroup.orders.length,
                pct: formatPercentage(percentage(oGroup.orders.length, iTotalExecuted), 0, "0%"),
                clientes: new Set(oGroup.orders.map(function (oOrder) {
                    return oOrder.CustomerId;
                }).filter(Boolean)).size,
                elevadores: new Set(oGroup.orders.map(function (oOrder) {
                    return oOrder.EquipmentId;
                }).filter(Boolean)).size,
                tiempo: formatDays(iAverageDuration),
                expanded: false,
                visible: true,
                ordenes: aOrders
            };
        }).sort(function (oLeft, oRight) {
            return oRight.ot - oLeft.ot || oLeft.nombre.localeCompare(oRight.nombre, "es");
        }).map(function (oGroup, iIndex) {
            oGroup.expanded = iIndex === 0;
            return oGroup;
        });
    }

    function buildTotals(aExecutedOrders) {
        var aDurations = aExecutedOrders.map(function (oOrder) {
            return oOrder._durationDays;
        }).filter(Number.isFinite);
        var iAverageDuration = aDurations.length
            ? aDurations.reduce(function (iTotal, iValue) { return iTotal + iValue; }, 0) / aDurations.length
            : null;

        return {
            ot: aExecutedOrders.length,
            pct: aExecutedOrders.length ? "100%" : "0%",
            clientes: new Set(aExecutedOrders.map(function (oOrder) {
                return oOrder.CustomerId;
            }).filter(Boolean)).size,
            elevadores: new Set(aExecutedOrders.map(function (oOrder) {
                return oOrder.EquipmentId;
            }).filter(Boolean)).size,
            tiempo: formatDays(iAverageDuration)
        };
    }

    function buildData(oRawData, mFilters, sAnalysis) {
        var oRange = oRawData.range || {};
        var aEnrichedOrders = enrichOrders(oRawData);
        var aOrders = filterOrders(aEnrichedOrders, mFilters, oRange);
        var aExecutedOrders = aOrders.filter(isExecutedOrder);
        var aNonExecutedOrders = aOrders.filter(function (oOrder) {
            // La regla funcional acordada considera cualquier estatus distinto
            // de finalizado, incluidos los vacíos, como no ejecutado.
            return !isExecutedOrder(oOrder);
        });
        var iPlanned = aOrders.length;
        var sSelectedAnalysis = ["NO_EJECUTADAS", "EJECUTADAS", "TODAS"].indexOf(sAnalysis) >= 0
            ? sAnalysis
            : "EJECUTADAS";
        var aRows = sSelectedAnalysis === "EJECUTADAS" ? buildResponsibleRows(aExecutedOrders) : [];
        var iCompliance = percentage(aExecutedOrders.length, iPlanned);
        var iNonExecutedPct = percentage(aNonExecutedOrders.length, iPlanned);
        var sInfoMessage = sSelectedAnalysis === "EJECUTADAS"
            ? "Análisis basado en " + aExecutedOrders.length + " OT preventivas ejecutadas."
            : sSelectedAnalysis === "NO_EJECUTADAS"
                ? aNonExecutedOrders.length + " OT preventivas no ejecutadas. Consulta su pantalla de causas para el detalle."
                : iPlanned + " OT preventivas planeadas en el periodo.";

        return {
            ui: {
                selectedAnalysis: sSelectedAnalysis
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
                ejecutadas: aExecutedOrders.length,
                ejecutadasDescripcion: formatPercentage(percentage(aExecutedOrders.length, iPlanned), 1, "0.0%") + " del total",
                noEjecutadas: aNonExecutedOrders.length,
                noEjecutadasDescripcion: formatPercentage(iNonExecutedPct, 1, "0.0%") + " del total planeado",
                cumplimiento: formatPercentage(iCompliance, 1, "0.0%"),
                cumplimientoDescripcion: aExecutedOrders.length + " de " + iPlanned + " OT"
            },
            tabs: {
                noEjecutadas: "No ejecutadas (" + aNonExecutedOrders.length + ")",
                ejecutadas: "Ejecutadas (" + aExecutedOrders.length + ")",
                todas: "Todas (" + iPlanned + ")"
            },
            infoMessage: sInfoMessage,
            responsables: aRows,
            totales: buildTotals(aExecutedOrders),
            meta: {
                plannedOrders: iPlanned,
                executedOrders: aExecutedOrders.length,
                nonExecutedOrders: aNonExecutedOrders.length,
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
