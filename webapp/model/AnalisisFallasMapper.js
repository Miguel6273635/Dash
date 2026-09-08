sap.ui.define([], function () {
    "use strict";

    var OFFICIAL_ORDER_TYPES = ["SM01", "SM02", "SM03"];
    var EXECUTED_SAP_STATUSES = ["E0015", "E0016", "E0019"];
    var EXECUTED_APP_STATUSES = ["0300", "0400", "0301"];
    var DEFAULT_PERIOD = "2026-ANUAL";
    var DEFAULT_START_DATE = "03/08/2026";
    var DEFAULT_END_DATE = "07/08/2026";
    var DEFAULT_ZONE = "TODAS";
    var KNOWN_ZONES = ["CENTRO", "ESTE", "NORTE", "SUR"];
    var MONTHS = [
        "ene", "feb", "mar", "abr", "may", "jun",
        "jul", "ago", "sep", "oct", "nov", "dic"
    ];

    function asArray(vValue) {
        return Array.isArray(vValue) ? vValue : [];
    }

    function normalize(vValue) {
        return String(vValue || "").trim().toUpperCase();
    }

    function normalizedComparable(vValue) {
        var sValue = normalize(vValue);

        return sValue.normalize ?
            sValue.normalize("NFD").replace(/[\u0300-\u036f]/g, "") :
            sValue;
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(
            normalize(vValue)
        ) >= 0;
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
        if (oDate.getUTCHours() === 0 && oDate.getUTCMinutes() === 0 &&
            oDate.getUTCSeconds() === 0) {
            return new Date(
                oDate.getUTCFullYear(), oDate.getUTCMonth(), oDate.getUTCDate()
            );
        }
        return oDate;
    }

    function parseDisplayDate(sValue) {
        var aMatch = String(sValue || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        var oDate;

        if (!aMatch) {
            return null;
        }
        oDate = new Date(Number(aMatch[3]), Number(aMatch[2]) - 1, Number(aMatch[1]));
        return oDate.getFullYear() === Number(aMatch[3]) &&
            oDate.getMonth() === Number(aMatch[2]) - 1 &&
            oDate.getDate() === Number(aMatch[1]) ? oDate : null;
    }

    function formatDisplayDate(oDate) {
        if (!(oDate instanceof Date) || Number.isNaN(oDate.getTime())) {
            return "";
        }
        return String(oDate.getDate()).padStart(2, "0") + "/" +
            String(oDate.getMonth() + 1).padStart(2, "0") + "/" +
            oDate.getFullYear();
    }

    function isoWeekStart(iYear, iWeek) {
        var oJanFourth = new Date(iYear, 0, 4);
        var iDay = oJanFourth.getDay() || 7;

        return new Date(iYear, 0, 4 - iDay + 1 + (iWeek - 1) * 7);
    }

    function parsePeriod(sPeriod) {
        var aAnnual = String(sPeriod || "").match(/^(\d{4})-ANUAL$/);
        var aWeek = String(sPeriod || "").match(/^(\d{4})-W(\d{2})$/);
        var oStart;
        var oEnd;

        if (aAnnual) {
            return {
                startDate: new Date(Number(aAnnual[1]), 0, 1),
                endDate: new Date(Number(aAnnual[1]), 11, 31, 23, 59, 59)
            };
        }
        if (!aWeek) {
            return null;
        }
        oStart = isoWeekStart(Number(aWeek[1]), Number(aWeek[2]));
        oEnd = new Date(
            oStart.getFullYear(), oStart.getMonth(), oStart.getDate() + 6,
            23, 59, 59
        );
        return { startDate: oStart, endDate: oEnd };
    }

  function getRange(mFilters, oRawData) {
    var oPeriodRange = parsePeriod(mFilters.periodo || DEFAULT_PERIOD);

    var oStart = parseDisplayDate(mFilters.fechaDesde) ||
        parseDisplayDate(DEFAULT_START_DATE) ||
        (oRawData.range && oRawData.range.startDate) ||
        (oPeriodRange && oPeriodRange.startDate);

    var oEnd = parseDisplayDate(mFilters.fechaHasta) ||
        parseDisplayDate(DEFAULT_END_DATE) ||
        (oRawData.range && oRawData.range.endDate) ||
        (oPeriodRange && oPeriodRange.endDate);

    if (oEnd) {
        oEnd.setHours(23, 59, 59, 999);
    }

    return {
        startDate: oStart,
        endDate: oEnd
    };
}

    function isWithinRange(vValue, oStart, oEnd) {
        var oDate = parseDate(vValue);

        return Boolean(oDate) && (!oStart || oDate >= oStart) && (!oEnd || oDate <= oEnd);
    }

    function isActive(oRecord, oReferenceDate) {
        var oFrom = parseDate(oRecord && oRecord.ValidFrom);
        var oTo = parseDate(oRecord && oRecord.ValidTo);

        return (!oFrom || !oReferenceDate || oFrom <= oReferenceDate) &&
            (!oTo || !oReferenceDate || oTo >= oReferenceDate);
    }

    function orderStatus(oOrder) {
        var sSap = normalize(oOrder && oOrder.SapUserStatusCode);
        var sApp = normalize(oOrder && oOrder.AppStatusCode);
        var mAppToSap = {
            "0100": "E0013", "0200": "E0014", "0300": "E0015",
            "0400": "E0016", "0301": "E0019"
        };

        if (/^E00\d{2}$/.test(sSap)) {
            return sSap;
        }
        return mAppToSap[sSap] || mAppToSap[sApp] || "";
    }

    function isAffectedOrder(oOrder) {
        var sStatus = orderStatus(oOrder);
        var sApp = normalize(oOrder && oOrder.AppStatusCode);

        return EXECUTED_SAP_STATUSES.indexOf(sStatus) < 0 &&
            EXECUTED_APP_STATUSES.indexOf(sApp) < 0;
    }

    function assignmentRank(oAssignment) {
        var sRole = normalize(oAssignment && oAssignment.RoleCode);
        var sType = normalize(oAssignment && oAssignment.AssignmentTypeCode);
        var iRole = sRole === "LEAD_MECHANIC" || sRole === "MAIN_MECHANIC" ? 0 :
            sRole === "MECHANIC" ? 1 : sRole === "RESPONSIBLE" ? 2 : 3;

        return iRole * 10 + (sType === "PRIMARY" || sType === "PLANNED" ? 0 : 1);
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

    function selectAssignment(aAssignments, oReferenceDate) {
        var aActive = asArray(aAssignments).filter(function (oAssignment) {
            return isActive(oAssignment, oReferenceDate);
        });

        return (aActive.length ? aActive : asArray(aAssignments)).slice().sort(
            function (oLeft, oRight) {
                return assignmentRank(oLeft) - assignmentRank(oRight);
            }
        )[0] || null;
    }

    function buildResourcesById(aResources) {
        var mResources = new Map();

        asArray(aResources).forEach(function (oResource) {
            var sResourceId = String(oResource && oResource.ResourceId || "");
            var aItems;

            if (!sResourceId) {
                return;
            }
            aItems = mResources.get(sResourceId) || [];
            aItems.push(oResource);
            mResources.set(sResourceId, aItems);
        });
        return mResources;
    }

    function nearestResource(aResources, oReferenceDate) {
        var oReference = oReferenceDate || new Date(0);

        return asArray(aResources).slice().sort(function (oLeft, oRight) {
            return Math.abs((parseDate(oLeft.WorkDate) || new Date(0)).getTime() -
                oReference.getTime()) - Math.abs(
                    (parseDate(oRight.WorkDate) || new Date(0)).getTime() -
                    oReference.getTime()
                );
        })[0] || null;
    }

    function enrichOrders(aOrders, oRawData) {
        var mAssignments = buildAssignmentsByOrder(oRawData.assignments);
        var mResources = buildResourcesById(oRawData.resources);

        return asArray(aOrders).map(function (oOrder) {
            var oCopy = Object.assign({}, oOrder);
            var oReference = parseDate(oOrder.PlannedFinishDate) ||
                parseDate(oOrder.PlannedStartDate);
            var oAssignment = selectAssignment(
                mAssignments.get(String(oOrder.OrderId)), oReference
            );
            var oResource = oAssignment ? nearestResource(
                mResources.get(String(oAssignment.ResourceId)), oReference
            ) : null;

            oCopy._zoneId = oResource && oResource.ZoneId || oOrder.Zona || "";
            oCopy._zoneName = oResource && (oResource.ZoneName || oResource.ZoneId) ||
                oOrder.Zona || "Sin zona";
            return oCopy;
        });
    }

    function matchesZone(oOrder, sZone) {
        var sSelected = normalizedComparable(sZone);

        return !sSelected || ["TODAS", "TODOS", "ALL"].indexOf(sSelected) >= 0 ||
            normalizedComparable(oOrder._zoneId) === sSelected ||
            normalizedComparable(oOrder._zoneName) === sSelected;
    }

    function isFailureContext(oCause) {
        var sContext = normalizedComparable(oCause && oCause.CauseContextCode);

        return [
            "FAILURE_CLASSIFICATION", "FAILURE", "FALLA", "CLASIFICACION_FALLA"
        ].indexOf(sContext) >= 0;
    }

    function causeRank(oCause) {
        var iRank = 0;

        if (isFailureContext(oCause)) {
            iRank += 4;
        }
        if (isTrue(oCause && oCause.IsPrimary)) {
            iRank += 2;
        }
        if (oCause && (oCause.CauseCode || oCause.CauseText)) {
            iRank += 1;
        }
        return iRank;
    }

    function buildPrincipalCauses(aCauses, oReferenceDate) {
        var mCauses = new Map();

        asArray(aCauses).filter(function (oCause) {
            return oCause && oCause.OrderId &&
                (oCause.CauseCode || oCause.CauseText) &&
                isActive(oCause, oReferenceDate);
        }).forEach(function (oCause) {
            var sOrderId = String(oCause.OrderId);
            var oCurrent = mCauses.get(sOrderId);

            /* QAS puede entregar vacío CauseContextCode e IsPrimary. En ese
             * caso se conserva la causa disponible, sin duplicar la OT. */
            if (!oCurrent || causeRank(oCause) > causeRank(oCurrent) || (
                causeRank(oCause) === causeRank(oCurrent) &&
                String(oCause.CauseCode || oCause.CauseText).localeCompare(
                    String(oCurrent.CauseCode || oCurrent.CauseText), "es"
                ) < 0
            )) {
                mCauses.set(sOrderId, oCause);
            }
        });
        return mCauses;
    }

    function causeIdentity(oCause) {
        var sCode = String(oCause && oCause.CauseCode || "").trim();
        var sText = String(oCause && (oCause.CauseText || oCause.CauseCode) ||
            "Sin clasificación").trim();

        return { code: sCode || sText, text: sText || "Sin clasificación" };
    }

    function getIcon(sText) {
        var sValue = normalizedComparable(sText);

        if (sValue.indexOf("MECAN") >= 0) { return "sap-icon://wrench"; }
        if (sValue.indexOf("ELECTR") >= 0) { return "sap-icon://lightbulb"; }
        if (sValue.indexOf("PUERTA") >= 0 || sValue.indexOf("SENSOR") >= 0) {
            return "sap-icon://unlocked";
        }
        if (sValue.indexOf("TRACC") >= 0) { return "sap-icon://chain-link"; }
        if (sValue.indexOf("CONTROL") >= 0 || sValue.indexOf("MANIOBRA") >= 0) {
            return "sap-icon://settings";
        }
        return "sap-icon://alert";
    }

    function getImpactState(iPercentage) {
        if (iPercentage >= 30) { return "Error"; }
        if (iPercentage >= 10) { return "Warning"; }
        return "Success";
    }

    function getTrend(iCurrent, aPrevious) {
        var iAverage = aPrevious.length ? aPrevious.reduce(function (iSum, iValue) {
            return iSum + iValue;
        }, 0) / aPrevious.length : 0;
        var iDifference = iCurrent - iAverage;

        if (!iAverage && !iCurrent) {
            return { text: "Sin datos", color: "Neutral" };
        }
        if (!iAverage || iDifference / iAverage > 0.1) {
            return { text: "En aumento", color: "Error" };
        }
        if (iDifference / iAverage < -0.1) {
            return { text: "A la baja", color: "Good" };
        }
        return { text: "Estable", color: "Critical" };
    }

    function trendPoints(aValues) {
        return aValues.map(function (iValue, iIndex) {
            return { x: iIndex, y: iValue };
        });
    }

    function getOrdersForRange(aOrders, oRange) {
        return asArray(aOrders).filter(function (oOrder) {
            return OFFICIAL_ORDER_TYPES.indexOf(normalize(oOrder.OrderTypeCode)) >= 0 &&
                isWithinRange(oOrder.PlannedFinishDate || oOrder.PlannedStartDate,
                    oRange.startDate, oRange.endDate) && isAffectedOrder(oOrder);
        });
    }

    function buildPeriods(oCurrentRange, aTrendPeriods) {
        var aBase = asArray(aTrendPeriods).slice();

        if (aBase.length) {
            return aBase;
        }
        return [{
            key: "current",
            startDate: oCurrentRange.startDate,
            endDate: oCurrentRange.endDate
        }];
    }

    function displayPeriod(sPeriod, oRange) {
        var aAnnual = String(sPeriod || "").match(/^(\d{4})-ANUAL$/);
        var aWeek = String(sPeriod || "").match(/^\d{4}-W(\d{2})$/);

        if (aAnnual) {
            return aAnnual[1] + " (Anual)";
        }
        if (aWeek) {
            return "Semana " + Number(aWeek[1]) + " (" +
                String(oRange.startDate.getDate()).padStart(2, "0") + " " +
                MONTHS[oRange.startDate.getMonth()] + " - " +
                String(oRange.endDate.getDate()).padStart(2, "0") + " " +
                MONTHS[oRange.endDate.getMonth()] + " " +
                oRange.endDate.getFullYear() + ")";
        }
        return "Periodo seleccionado";
    }

    function buildPeriodOptions(sSelected) {
        var aOptions = [];
        var iYear;
        var iWeek;
        var oStart;
        var oEnd;

        [2024, 2025, 2026].forEach(function (iAnnualYear) {
            aOptions.push({ key: iAnnualYear + "-ANUAL", text: iAnnualYear + " (Anual)" });
        });
        for (iYear = 2024; iYear <= 2026; iYear += 1) {
            for (iWeek = 1; iWeek <= 53; iWeek += 1) {
                oStart = isoWeekStart(iYear, iWeek);
                oEnd = new Date(oStart.getFullYear(), oStart.getMonth(),
                    oStart.getDate() + 6);
                if (oStart.getFullYear() !== iYear && iWeek > 52) {
                    continue;
                }
                aOptions.push({
                    key: iYear + "-W" + String(iWeek).padStart(2, "0"),
                    text: "Semana " + iWeek + " (" +
                        String(oStart.getDate()).padStart(2, "0") + " " +
                        MONTHS[oStart.getMonth()] + " - " +
                        String(oEnd.getDate()).padStart(2, "0") + " " +
                        MONTHS[oEnd.getMonth()] + " " + oEnd.getFullYear() + ")"
                });
            }
        }
        if (!aOptions.some(function (oOption) { return oOption.key === sSelected; })) {
            aOptions.unshift({ key: sSelected, text: sSelected });
        }
        return aOptions;
    }

    function buildZoneOptions(aOrders, aCatalogs) {
        var mZones = new Map();

        mZones.set(DEFAULT_ZONE, "Todas");
        KNOWN_ZONES.forEach(function (sZone) { mZones.set(sZone, sZone.charAt(0) + sZone.slice(1).toLowerCase()); });
        asArray(aCatalogs).filter(function (oCatalog) {
            return normalize(oCatalog.FilterDomain) === "ZONE" &&
                oCatalog.Active !== false && oCatalog.Active !== "false";
        }).forEach(function (oCatalog) {
            var sId = normalize(oCatalog.ValueId);
            if (KNOWN_ZONES.indexOf(sId) >= 0) {
                mZones.set(sId, oCatalog.ValueText || sId);
            }
        });
        asArray(aOrders).forEach(function (oOrder) {
            var sId = normalize(oOrder._zoneId);
            if (KNOWN_ZONES.indexOf(sId) >= 0) {
                mZones.set(sId, oOrder._zoneName || sId);
            }
        });
        return Array.from(mZones.entries()).map(function (aEntry) {
            return { key: aEntry[0], text: aEntry[1] };
        });
    }

    function buildData(oRawData, mFilters) {
        var mValues = Object.assign({ periodo: DEFAULT_PERIOD, zona: DEFAULT_ZONE }, mFilters || {});
        var oRange = getRange(mValues, oRawData);
        var aEnriched = enrichOrders(oRawData.orders, oRawData);
        var aAffected = getOrdersForRange(aEnriched, oRange).filter(function (oOrder) {
            return matchesZone(oOrder, mValues.zona);
        });
        var mPrincipalCauses = buildPrincipalCauses(oRawData.causes, oRange.endDate);
        var mGroups = new Map();
        var aPeriods = buildPeriods(oRange, oRawData.trendPeriods);
        var aTrendOrders = enrichOrders(oRawData.trendOrders || oRawData.orders, oRawData);
        var mTrendCauses = buildPrincipalCauses(oRawData.causes, oRange.endDate);
        var aRows;
        var iTotal;
        var oPrincipal;

        aAffected.forEach(function (oOrder) {
            var oCause = mPrincipalCauses.get(String(oOrder.OrderId));
            var oIdentity;
            var oGroup;

            if (!oCause) {
                /* La OT sigue siendo una desviación aunque SAP todavía no
                 * haya enviado una clasificación. Antes se descartaba y el
                 * resultado era 0 OT en la tabla, aun cuando las cards ya
                 * mostraban su equipo y cliente. */
                oCause = {
                    CauseCode: "UNCLASSIFIED",
                    CauseText: "Sin clasificación registrada"
                };
            }
            oIdentity = causeIdentity(oCause);
            oGroup = mGroups.get(oIdentity.code);
            if (!oGroup) {
                oGroup = {
                    code: oIdentity.code,
                    text: oIdentity.text,
                    orderIds: new Set(),
                    equipmentIds: new Set(),
                    customerIds: new Set()
                };
                mGroups.set(oIdentity.code, oGroup);
            }
            oGroup.orderIds.add(String(oOrder.OrderId));
            if (oOrder.EquipmentId) { oGroup.equipmentIds.add(String(oOrder.EquipmentId)); }
            if (oOrder.CustomerId) { oGroup.customerIds.add(String(oOrder.CustomerId)); }
        });

        iTotal = Array.from(mGroups.values()).reduce(function (iSum, oGroup) {
            return iSum + oGroup.orderIds.size;
        }, 0);
        aRows = Array.from(mGroups.values()).map(function (oGroup) {
            var aSeries = aPeriods.map(function (oPeriod) {
                var mIds = new Set();
                getOrdersForRange(aTrendOrders, oPeriod).filter(function (oOrder) {
                    return matchesZone(oOrder, mValues.zona);
                }).forEach(function (oOrder) {
                    var oCause = mTrendCauses.get(String(oOrder.OrderId));
                    var sCauseCode = oCause ? causeIdentity(oCause).code :
                        "UNCLASSIFIED";
                    if (sCauseCode === oGroup.code) {
                        mIds.add(String(oOrder.OrderId));
                    }
                });
                return mIds.size;
            });
            var oTrend = getTrend(aSeries[aSeries.length - 1] || 0, aSeries.slice(0, -1));
            var iCount = oGroup.orderIds.size;
            var iImpact = iTotal ? iCount / iTotal * 100 : 0;

            return {
                id: 0,
                codigo: oGroup.code,
                nombre: oGroup.text,
                icon: getIcon(oGroup.text),
                otAfectadas: iCount,
                equiposAfectados: oGroup.equipmentIds.size,
                clientesAfectados: oGroup.customerIds.size,
                impacto: Number(iImpact.toFixed(1)),
                impactoTexto: iImpact.toFixed(0) + "%",
                impactoState: getImpactState(iImpact),
                tendenciaTexto: oTrend.text,
                tendenciaColor: oTrend.color,
                tendenciaData: trendPoints(aSeries),
                equiposMuestra: Array.from(oGroup.equipmentIds).slice(0, 5),
                clientesMuestra: Array.from(oGroup.customerIds).slice(0, 5)
            };
        }).sort(function (oLeft, oRight) {
            return oRight.otAfectadas - oLeft.otAfectadas ||
                oLeft.nombre.localeCompare(oRight.nombre, "es");
        }).map(function (oRow, iIndex) {
            oRow.id = iIndex + 1;
            return oRow;
        });

        oPrincipal = aRows[0] || null;
        return {
            filtros: {
                periodo: mValues.periodo,
                periodoTexto: displayPeriod(mValues.periodo, oRange),
                zona: mValues.zona || DEFAULT_ZONE,
                fechaDesde: formatDisplayDate(oRange.startDate),
                fechaHasta: formatDisplayDate(oRange.endDate)
            },
            opcionesPeriodo: buildPeriodOptions(mValues.periodo),
            opcionesZona: buildZoneOptions(aEnriched, oRawData.catalogs),
            clasificaciones: aRows,
            totalClasificaciones: aRows.length,
            resumen: {
                TotalOTAfectadas: iTotal,
                ClasificacionPrincipalTexto: oPrincipal ? oPrincipal.nombre : "Sin datos",
                ClasificacionPrincipalPorcentaje: oPrincipal ? oPrincipal.impactoTexto : "0%",
                TotalEquiposAfectados: new Set(aAffected.map(function (oOrder) {
                    return oOrder.EquipmentId;
                }).filter(Boolean)).size,
                TotalClientesAfectados: new Set(aAffected.map(function (oOrder) {
                    return oOrder.CustomerId;
                }).filter(Boolean)).size
            },
            paginacion: {
                pagina: 1,
                tamanoPagina: 10,
                totalRegistros: aRows.length,
                totalPaginas: Math.max(1, Math.ceil(aRows.length / 10))
            },
            meta: {
                affectedOrders: iTotal,
                currentOrders: aAffected.length,
                source: "BTP_DESTINATION_ODATA_V2"
            }
        };
    }

    return {
        buildData: buildData,
        parsePeriod: parsePeriod,
        isAffectedOrder: isAffectedOrder
    };
});
