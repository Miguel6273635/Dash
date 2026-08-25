sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    var OFFICIAL_ORDER_TYPES = ["SM01", "SM02", "SM03"];
    var NON_EXECUTED_STATUSES = ["E0013", "E0014"];
    var EXECUTED_STATUS = "E0015";
    var ALL_ZONES = "TODAS";
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
        var sText = normalize(vValue);

        return sText.normalize ?
            sText.normalize("NFD").replace(/[\u0300-\u036f]/g, "") :
            sText;
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(
            normalize(vValue)
        ) >= 0;
    }

    function isFalse(vValue) {
        return vValue === false || ["FALSE", "0", "NO"].indexOf(
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
                oDate.getUTCFullYear(),
                oDate.getUTCMonth(),
                oDate.getUTCDate()
            );
        }
        return oDate;
    }

    function isWithinRange(vValue, oStartDate, oEndDate) {
        var oDate = parseDate(vValue);

        return Boolean(oDate) &&
            (!oStartDate || oDate >= oStartDate) &&
            (!oEndDate || oDate <= oEndDate);
    }

    function isActive(oRecord, oReferenceDate) {
        var oFrom = parseDate(oRecord && oRecord.ValidFrom);
        var oTo = parseDate(oRecord && oRecord.ValidTo);

        return (!oFrom || !oReferenceDate || oFrom <= oReferenceDate) &&
            (!oTo || !oReferenceDate || oTo >= oReferenceDate);
    }

    function percentage(iNumerator, iDenominator) {
        return iDenominator > 0 ? iNumerator / iDenominator * 100 : 0;
    }

    function formatPercentage(iValue) {
        return Number(iValue || 0).toFixed(0) + "%";
    }

    function matchesZone(oOrder, sZone) {
        var sZoneKey = normalizedComparable(sZone);

        return !sZoneKey || ["TODAS", "TODOS", "ALL"].indexOf(sZoneKey) >= 0 ||
            normalizedComparable(oOrder._zoneId) === sZoneKey ||
            normalizedComparable(oOrder._zoneName) === sZoneKey;
    }

    function matchesCustomer(oOrder, sCustomer) {
        var sCustomerKey = normalizedComparable(sCustomer);

        return !sCustomerKey || ["TODOS", "TODAS", "ALL"].indexOf(sCustomerKey) >= 0 ||
            normalizedComparable(oOrder.CustomerId) === sCustomerKey ||
            normalizedComparable(oOrder.CustomerName) === sCustomerKey;
    }

    function matchesResponsible(oOrder, sResponsible) {
        var sResponsibleKey = normalizedComparable(sResponsible);

        return !sResponsibleKey || ["TODOS", "TODAS", "ALL"].indexOf(sResponsibleKey) >= 0 ||
            normalizedComparable(oOrder._responsibleId) === sResponsibleKey ||
            normalizedComparable(oOrder._responsibleName) === sResponsibleKey;
    }

    function assignmentRank(oAssignment) {
        var sRole = normalize(oAssignment && oAssignment.RoleCode);
        var sAssignmentType = normalize(
            oAssignment && oAssignment.AssignmentTypeCode
        );
        var iRole = sRole === "LEAD_MECHANIC" || sRole === "MAIN_MECHANIC" ? 0 :
            sRole === "MECHANIC" ? 1 :
            sRole === "RESPONSIBLE" ? 2 : 3;

        return iRole * 10 + (
            sAssignmentType === "PLANNED" || sAssignmentType === "PRIMARY" ?
                0 : 1
        );
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

    function selectAssignment(aAssignments, vReferenceDate) {
        var oReferenceDate = parseDate(vReferenceDate);
        var aActive = asArray(aAssignments).filter(function (oAssignment) {
            return isActive(oAssignment, oReferenceDate);
        });

        return (aActive.length ? aActive : asArray(aAssignments)).slice().sort(
            function (oLeft, oRight) {
                return assignmentRank(oLeft) - assignmentRank(oRight) ||
                    String(oLeft.ResourceId || "").localeCompare(
                        String(oRight.ResourceId || ""), "es"
                    );
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

    function nearestResource(aResources, vReferenceDate) {
        var oReferenceDate = parseDate(vReferenceDate) || new Date(0);

        return asArray(aResources).slice().sort(function (oLeft, oRight) {
            return Math.abs(
                (parseDate(oLeft.WorkDate) || new Date(0)).getTime() -
                oReferenceDate.getTime()
            ) - Math.abs(
                (parseDate(oRight.WorkDate) || new Date(0)).getTime() -
                oReferenceDate.getTime()
            );
        })[0] || {};
    }

    function isNonExecutionCause(oCause) {
        var sContext = normalizedComparable(
            oCause && oCause.CauseContextCode
        );

        return [
            "NON_EXECUTION",
            "NO_EJECUCION",
            "NO_EJECUTADA",
            "NONEXECUTION"
        ].indexOf(sContext) >= 0;
    }

    function buildPrincipalCauses(aCauses, oReferenceDate) {
        var mCauses = new Map();

        /*
         * En QAS, DashboardOrderCausesSet todavía entrega IsPrimary=false y
         * CauseContextCode vacío. No podemos exigir esos dos valores porque
         * se perderían causas reales y la gráfica quedaría vacía. Primero se
         * prefiere una causa marcada para no ejecución/primaria si existe;
         * en caso contrario se usa la mejor causa disponible de la OT.
         */
        asArray(aCauses).filter(function (oCause) {
            return oCause && oCause.OrderId && isActive(oCause, oReferenceDate);
        }).forEach(function (oCause) {
            var sOrderId = String(oCause.OrderId);
            var oCurrent = mCauses.get(sOrderId);
            var oCurrentFrom = parseDate(oCurrent && oCurrent.ValidFrom);
            var oCandidateFrom = parseDate(oCause.ValidFrom);
            var iCurrentRank = oCurrent ?
                (isNonExecutionCause(oCurrent) ? 2 : 0) +
                (isTrue(oCurrent.IsPrimary) ? 1 : 0) : -1;
            var iCandidateRank =
                (isNonExecutionCause(oCause) ? 2 : 0) +
                (isTrue(oCause.IsPrimary) ? 1 : 0);

            if (!oCurrent || iCandidateRank > iCurrentRank || (
                iCandidateRank === iCurrentRank &&
                oCandidateFrom && (!oCurrentFrom || oCandidateFrom > oCurrentFrom)
            ) || (
                iCandidateRank === iCurrentRank &&
                (!oCandidateFrom || !oCurrentFrom ||
                    oCandidateFrom.getTime() === oCurrentFrom.getTime()) &&
                String(oCause.CauseCode || oCause.CauseText || "").localeCompare(
                    String(oCurrent.CauseCode || oCurrent.CauseText || ""),
                    "es"
                ) < 0
            )) {
                mCauses.set(sOrderId, oCause);
            }
        });
        return mCauses;
    }

    function getCauseText(oCause) {
        return String(
            oCause && (oCause.CauseText || oCause.CauseCode) ||
            "Sin causa registrada"
        );
    }

    function typeText(oOrder) {
        var sCode = normalize(oOrder && oOrder.OrderTypeCode);

        if (sCode === "SM01") {
            return "Preventivo";
        }
        if (sCode === "SM02") {
            return "Correctivo";
        }
        if (sCode === "SM03") {
            return "Call Center";
        }
        return String(oOrder && (
            oOrder.OrderTypeText || oOrder.OrderTypeCode
        ) || "Sin tipo");
    }

    function typeColorClass(sType) {
        switch (normalizedComparable(sType)) {
        case "PREVENTIVO":
            return "czTypeBlue";
        case "CORRECTIVO":
            return "czTypeGreen";
        case "CALL CENTER":
            return "czTypeAmber";
        default:
            return "czTypeSlate";
        }
    }

    function enrichOrders(oRawData) {
        var oRange = oRawData.range || {};
        var mAssignments = buildAssignmentsByOrder(oRawData.assignments);
        var mResources = buildResourcesById(oRawData.resources);
        var mOrders = new Map();

        asArray(oRawData.orders).filter(function (oOrder) {
            return oOrder && oOrder.OrderId &&
                OFFICIAL_ORDER_TYPES.indexOf(normalize(oOrder.OrderTypeCode)) >= 0 &&
                isWithinRange(
                    oOrder.PlannedStartDate,
                    oRange.startDate,
                    oRange.endDate
                );
        }).forEach(function (oOrder) {
            var oAssignment = selectAssignment(
                mAssignments.get(String(oOrder.OrderId)),
                oOrder.PlannedStartDate
            );
            var oResource = oAssignment ? nearestResource(
                mResources.get(String(oAssignment.ResourceId)),
                oOrder.PlannedStartDate
            ) : {};

            mOrders.set(String(oOrder.OrderId), Object.assign({}, oOrder, {
                /* Zona de la OT es el dato funcional del tablero. El recurso
                 * sólo se utiliza cuando SAP aún no informa Zona en la OT. */
                _zoneId: oOrder.Zona || oResource.ZoneId || "",
                _zoneName: oOrder.Zona || oResource.ZoneName ||
                    oResource.ZoneId || "Sin zona",
                _responsibleId: oResource.ResourceId ||
                    (oAssignment && oAssignment.ResourceId) ||
                    oOrder.Mecanico || "",
                _responsibleName: oResource.ResourceName ||
                    oOrder.Mecanico || "Sin responsable asignado"
            }));
        });
        return Array.from(mOrders.values());
    }

    function orderIsExecuted(oOrder) {
        return DashboardDataService.canonicalStatus(oOrder) === EXECUTED_STATUS;
    }

    function orderIsNonExecuted(oOrder) {
        return NON_EXECUTED_STATUSES.indexOf(
            DashboardDataService.canonicalStatus(oOrder)
        ) >= 0;
    }

    function daysLate(vPlannedFinishDate, oCutoffDate) {
        var oFinish = parseDate(vPlannedFinishDate);

        if (!oFinish || !oCutoffDate) {
            return null;
        }
        return Math.max(
            Math.floor((oCutoffDate.getTime() - oFinish.getTime()) / 86400000),
            0
        );
    }

    function buildRows(aNonExecuted, mCauses, oCutoffDate) {
        return asArray(aNonExecuted).map(function (oOrder) {
            var oCause = mCauses.get(String(oOrder.OrderId));
            var iDaysLate = daysLate(
                oOrder.PlannedFinishDate,
                oCutoffDate
            );

            return {
                OT: String(oOrder.OrderId),
                Equipo: String(
                    oOrder.EquipmentId || oOrder.EquipmentName || "Sin equipo"
                ),
                TipoOT: typeText(oOrder),
                TipoOTCode: String(oOrder.OrderTypeCode || ""),
                Cliente: String(
                    oOrder.CustomerName || oOrder.CustomerId || "Sin cliente"
                ),
                CausaIncumplimiento: getCauseText(oCause),
                Responsable: String(
                    oOrder._responsibleName || "Sin responsable asignado"
                ),
                DiasAtraso: iDaysLate === null ? "Sin dato" : String(iDaysLate),
                Estado: "No ejecutada",
                /*
                 * La fuente no define una severidad de causa; se usa la
                 * presentación neutral de la maqueta sin inventar prioridades.
                 */
                StatusCausa: "Information",
                Zona: String(oOrder._zoneName || "Sin zona"),
                _plannedFinish: parseDate(oOrder.PlannedFinishDate) ||
                    new Date(8640000000000000)
            };
        }).sort(function (oLeft, oRight) {
            return oRight._plannedFinish - oLeft._plannedFinish ||
                oLeft.OT.localeCompare(oRight.OT, "es");
        }).map(function (oRow) {
            delete oRow._plannedFinish;
            return oRow;
        });
    }

    function buildDistribution(aRows, sCodeKey, sTextKey, sOutputKey) {
        var mGroups = new Map();
        var iTotal = asArray(aRows).length;

        asArray(aRows).forEach(function (oRow) {
            var sCode = String(oRow[sCodeKey] || "SIN_DATO");
            var sText = String(oRow[sTextKey] || "Sin dato");
            var oGroup = mGroups.get(sCode) || {
                code: sCode,
                text: sText,
                total: 0
            };

            oGroup.total += 1;
            mGroups.set(sCode, oGroup);
        });
        return Array.from(mGroups.values()).sort(function (oLeft, oRight) {
            return oRight.total - oLeft.total ||
                oLeft.text.localeCompare(oRight.text, "es");
        }).map(function (oGroup) {
            var oOutput = {
                Cantidad: oGroup.total,
                Porcentaje: percentage(oGroup.total, iTotal)
            };

            oOutput[sOutputKey] = oGroup.text;
            return oOutput;
        });
    }

    function getIsoWeekStart(iYear, iWeek) {
        var oJanFourth = new Date(iYear, 0, 4);
        var iDay = oJanFourth.getDay() || 7;

        return new Date(iYear, 0, 4 - iDay + 1 + (iWeek - 1) * 7);
    }

    function isoWeekCount(iYear) {
        var oDate = new Date(iYear, 11, 28);
        var iDay = oDate.getDay() || 7;

        oDate.setDate(oDate.getDate() + 4 - iDay);
        return Math.ceil(
            ((oDate - new Date(oDate.getFullYear(), 0, 1)) / 86400000 + 1) / 7
        );
    }

    function formatWeekDate(oDate) {
        return String(oDate.getDate()).padStart(2, "0") + " " +
            MONTHS[oDate.getMonth()];
    }

    function buildWeekOptions(sSelectedWeek) {
        var mYears = new Map();
        var aOptions = [];

        [2024, 2025, 2026].forEach(function (iYear) {
            mYears.set(iYear, true);
        });
        if (/^\d{4}-W\d{2}$/.test(String(sSelectedWeek || ""))) {
            mYears.set(Number(String(sSelectedWeek).slice(0, 4)), true);
        }
        Array.from(mYears.keys()).sort(function (iLeft, iRight) {
            return iLeft - iRight;
        }).forEach(function (iYear) {
            var i;

            aOptions.push({
                key: iYear + "-ANUAL",
                text: String(iYear) + " (Anual)"
            });

            for (i = 1; i <= isoWeekCount(iYear); i += 1) {
                var oStart = getIsoWeekStart(iYear, i);
                var oEnd = new Date(
                    oStart.getFullYear(),
                    oStart.getMonth(),
                    oStart.getDate() + 6
                );
                aOptions.push({
                    key: iYear + "-W" + String(i).padStart(2, "0"),
                    text: String(i).padStart(2, "0") + " (" +
                        formatWeekDate(oStart) + " - " +
                        formatWeekDate(oEnd) + " " + iYear + ")"
                });
            }
        });
        return aOptions;
    }

    function uniqueOptions(aItems, sAllKey, sAllText) {
        var mItems = new Map();

        asArray(aItems).forEach(function (oItem) {
            var sKey = String(oItem && oItem.key || "").trim();

            if (sKey) {
                mItems.set(sKey, {
                    key: sKey,
                    text: String(oItem.text || sKey)
                });
            }
        });
        return [{ key: sAllKey, text: sAllText }].concat(
            Array.from(mItems.values()).sort(function (oLeft, oRight) {
                return oLeft.text.localeCompare(oRight.text, "es");
            })
        );
    }

    function buildZoneOptions(aOrders, aCatalogs, oCutoffDate) {
        /* DashboardFilterCatalogSet no es confiable para zona en QAS: puede
         * traer textos de otro dominio, por ejemplo "MANTENIMIENTO
         * REPARACIONES". La fuente válida de esta vista es OrdersSet.Zona.
         * Si la OT no la tiene, se usa como respaldo la zona del recurso. */
        var aDerivedOptions = asArray(aOrders).map(function (oOrder) {
            var sOrderZone = String(oOrder && oOrder.Zona || "").trim();
            var sFallbackZone = String(oOrder && (
                oOrder._zoneId || oOrder._zoneName
            ) || "").trim();
            var sZone = sOrderZone || sFallbackZone;

            return {
                key: sZone || "SIN_ZONA",
                text: sZone || "Sin zona"
            };
        });

        return uniqueOptions(aDerivedOptions, ALL_ZONES, "Todas");
    }

    function selectedOptionKey(aOptions, sRequestedKey, sDefaultKey) {
        var sRequested = normalizedComparable(sRequestedKey);
        var bExists = asArray(aOptions).some(function (oOption) {
            return normalizedComparable(oOption.key) === sRequested;
        });

        return bExists ? sRequestedKey : sDefaultKey;
    }

    function selectedZoneText(aOptions, sSelectedZone) {
        var oSelected = asArray(aOptions).filter(function (oOption) {
            return normalizedComparable(oOption.key) ===
                normalizedComparable(sSelectedZone);
        })[0];

        return oSelected ? oSelected.text : String(sSelectedZone || "Todas");
    }

    function buildCustomerOptions(aOrders) {
        return uniqueOptions(asArray(aOrders).map(function (oOrder) {
            return {
                key: String(oOrder.CustomerId || oOrder.CustomerName || ""),
                text: String(oOrder.CustomerName || oOrder.CustomerId || "Sin cliente")
            };
        }), "TODOS", "Todos");
    }

    function buildResponsibleOptions(aOrders) {
        return uniqueOptions(asArray(aOrders).map(function (oOrder) {
            return {
                key: String(oOrder._responsibleId || oOrder._responsibleName || ""),
                text: String(oOrder._responsibleName || oOrder._responsibleId ||
                    "Sin responsable asignado")
            };
        }), "TODOS", "Todos");
    }

    function buildData(oRawData, mFilters) {
        var oRaw = oRawData || {};
        var oRange = oRaw.range || {};
        var mValues = Object.assign({
            semana: "2026-ANUAL",
            fechaDesde: "01/01/2026",
            fechaHasta: "31/12/2026",
            zona: ALL_ZONES,
            cliente: "TODOS",
            responsable: "TODOS"
        }, mFilters || {});
        var aEnriched = enrichOrders(oRaw);
        var aZoneOptions = buildZoneOptions(
            aEnriched,
            oRaw.catalogs,
            oRange.endDate
        );
        var sSelectedZone = selectedOptionKey(
            aZoneOptions,
            mValues.zona,
            ALL_ZONES
        );
        var aFiltered = aEnriched.filter(function (oOrder) {
            return matchesZone(oOrder, sSelectedZone) &&
                matchesCustomer(oOrder, mValues.cliente) &&
                matchesResponsible(oOrder, mValues.responsable);
        });
        var aExecuted = aFiltered.filter(orderIsExecuted);
        var aNonExecuted = aFiltered.filter(orderIsNonExecuted);
        var mCauses = buildPrincipalCauses(oRaw.causes, oRange.endDate);
        var aRows = buildRows(aNonExecuted, mCauses, oRange.endDate);
        var iPlanned = aFiltered.length;
        var iExecuted = aExecuted.length;
        var iNonExecuted = aNonExecuted.length;
        var iCompliance = percentage(iExecuted, iPlanned);
        var iNonExecutedPct = percentage(iNonExecuted, iPlanned);

        return {
            filtros: {
                semana: String(mValues.semana || "2026-ANUAL"),
                fechaDesde: String(mValues.fechaDesde || ""),
                fechaHasta: String(mValues.fechaHasta || ""),
                zona: sSelectedZone,
                cliente: mValues.cliente || "TODOS",
                responsable: mValues.responsable || "TODOS"
            },
            opcionesSemana: buildWeekOptions(mValues.semana),
            opcionesZona: aZoneOptions,
            opcionesCliente: buildCustomerOptions(aEnriched),
            opcionesResponsable: buildResponsibleOptions(aEnriched),
            kpis: {
                planeadas: String(iPlanned),
                planeadasSub: "Órdenes del período",
                planeadasPct: "100%",
                ejecutadas: String(iExecuted),
                ejecutadasSub: formatPercentage(iCompliance) + " del total",
                ejecutadasPct: formatPercentage(iCompliance),
                noEjecutadas: String(iNonExecuted),
                noEjecutadasSub: formatPercentage(iNonExecutedPct) + " del total planeado",
                noEjecutadasPct: formatPercentage(iNonExecutedPct),
                cumplimiento: formatPercentage(iCompliance),
                cumplimientoSub: iExecuted + " de " + iPlanned + " OT",
                cumplimientoPct: formatPercentage(iCompliance)
            },
            IncumplimientosFull: aRows,
            IncumplimientosData: aRows.slice(0, 10),
            ResumenCausas: buildDistribution(
                aRows,
                "CausaIncumplimiento",
                "CausaIncumplimiento",
                "Causa"
            ),
            ResumenTipos: buildDistribution(
                aRows,
                "TipoOTCode",
                "TipoOT",
                "Tipo"
            ).map(function (oType) {
                oType.ColorClass = typeColorClass(oType.Tipo);
                /* Texto listo para UI: evita que el control Viz interprete
                 * la medida con una unidad de otra gráfica. */
                oType.Detalle = String(oType.Cantidad) + " OT (" +
                    formatPercentage(oType.Porcentaje) + ")";
                return oType;
            }),
            TotalOTs: iNonExecuted,
            VisibleCount: Math.min(10, iNonExecuted),
            SelectedZone: selectedZoneText(aZoneOptions, sSelectedZone),
            ActiveFilterLabel: "Todas",
            paginacion: {
                pagina: 1,
                totalPaginas: Math.max(1, Math.ceil(iNonExecuted / 10)),
                tamanoPagina: 10,
                inicio: iNonExecuted ? 1 : 0,
                fin: Math.min(10, iNonExecuted)
            },
            meta: {
                plannedOrders: iPlanned,
                executedOrders: iExecuted,
                nonExecutedOrders: iNonExecuted,
                source: "BTP_DESTINATION_ODATA_V2"
            }
        };
    }

    return {
        buildData: buildData,
        orderIsExecuted: orderIsExecuted,
        orderIsNonExecuted: orderIsNonExecuted
    };
});
