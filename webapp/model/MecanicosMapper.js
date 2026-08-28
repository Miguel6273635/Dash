sap.ui.define([], function () {
    "use strict";

    /*
     * Umbrales provisionales de la maqueta. Si negocio los publica
     * en FilterCatalog se toman automáticamente.
     */
    var DEFAULT_BALANCED_MAX = 90;
    var DEFAULT_NEAR_MAX = 100;
    var DEFAULT_OVER_MAX = 120;

    function norm(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
    }

    function idKey(vValue) {
        var sValue = norm(vValue).replace(/[^A-Z0-9]/g, "");
        var sNumeric;

        if (!sValue) {
            return "";
        }

        if (/^\d+$/.test(sValue)) {
            sNumeric = sValue.replace(/^0+/, "");
            return sNumeric || "0";
        }

        return sValue;
    }

    function isTrue(vValue) {
        return (
            vValue === true ||
            ["TRUE", "X", "1"].indexOf(norm(vValue)) >= 0
        );
    }

    function isAll(vValue) {
        return (
            ["", "ALL", "TODOS", "TODAS"].indexOf(norm(vValue)) >= 0
        );
    }

    function parseInputDate(vValue) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }

        aMatch = String(vValue).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

        if (aMatch) {
            return new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        }

        oDate = new Date(vValue);

        return Number.isNaN(oDate.getTime())
            ? null
            : oDate;
    }

    function parseODataDate(vValue) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }

        if (vValue instanceof Date) {
            return new Date(vValue.getTime());
        }

        aMatch = String(vValue).match(/\/Date\((-?\d+)/);

        oDate = aMatch
            ? new Date(Number(aMatch[1]))
            : new Date(vValue);

        return Number.isNaN(oDate.getTime())
            ? null
            : oDate;
    }

    function dayKey(vValue) {
        var oDate = parseODataDate(vValue);

        if (!oDate) {
            return "";
        }

        return [
            oDate.getFullYear(),
            String(oDate.getMonth() + 1).padStart(2, "0"),
            String(oDate.getDate()).padStart(2, "0")
        ].join("-");
    }

    function inRange(vValue, oFrom, oTo) {
        var oDate = parseODataDate(vValue);
        var oCheck;
        var oStart;
        var oEnd;

        if (!oDate) {
            return false;
        }

        oCheck = new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate()
        );

        if (oFrom) {
            oStart = new Date(
                oFrom.getFullYear(),
                oFrom.getMonth(),
                oFrom.getDate()
            );

            if (oCheck < oStart) {
                return false;
            }
        }

        if (oTo) {
            oEnd = new Date(
                oTo.getFullYear(),
                oTo.getMonth(),
                oTo.getDate()
            );

            if (oCheck > oEnd) {
                return false;
            }
        }

        return true;
    }

    function toHours(vValue, sUnit) {
        var nValue = Number(vValue);
        var sNormalized = norm(sUnit);

        if (!Number.isFinite(nValue)) {
            return null;
        }

        if (
            [
                "H", "HR", "HRS", "HRA",
                "HOUR", "HOURS", "STD"
            ].indexOf(sNormalized) >= 0
        ) {
            return nValue;
        }

        if (
            [
                "MIN", "MINS",
                "MINUTE", "MINUTES"
            ].indexOf(sNormalized) >= 0
        ) {
            return nValue / 60;
        }

        if (
            [
                "S", "SEC",
                "SECOND", "SECONDS"
            ].indexOf(sNormalized) >= 0
        ) {
            return nValue / 3600;
        }

        return null;
    }

    function uniqueBy(aItems, fnKey) {
        var mSeen = Object.create(null);

        return (aItems || []).filter(function (oItem) {
            var sKey = String(fnKey(oItem) || "");

            if (!sKey || mSeen[sKey]) {
                return false;
            }

            mSeen[sKey] = true;
            return true;
        });
    }

    function uniqueStrings(aValues) {
        var mSeen = Object.create(null);

        return (aValues || []).filter(function (vValue) {
            var sValue = String(vValue || "");

            if (!sValue || mSeen[sValue]) {
                return false;
            }

            mSeen[sValue] = true;
            return true;
        });
    }

    function matches(vFilter, aValues) {
        if (isAll(vFilter)) {
            return true;
        }

        return (aValues || []).some(function (vValue) {
            return norm(vValue) === norm(vFilter);
        });
    }

    function formatNumber(nValue, iDecimals) {
        if (!Number.isFinite(nValue)) {
            return "Sin datos";
        }

        return Number(nValue).toLocaleString(
            "es-MX",
            {
                minimumFractionDigits: iDecimals,
                maximumFractionDigits: iDecimals
            }
        );
    }

    function formatHours(nValue) {
        if (!Number.isFinite(nValue)) {
            return "Sin datos";
        }

        return (
            formatNumber(
                nValue,
                Math.abs(nValue) < 10 ? 2 : 0
            ) +
            " h"
        );
    }

    function formatPct(nValue) {
        return Number.isFinite(nValue)
            ? formatNumber(nValue, 1) + "%"
            : "Sin datos";
    }

    function catalogRows(aCatalogs, sDomain) {
        return (aCatalogs || [])
            .filter(function (oRow) {
                return (
                    norm(oRow.FilterDomain) === norm(sDomain) &&
                    (
                        oRow.Active === undefined ||
                        oRow.Active === null ||
                        isTrue(oRow.Active)
                    )
                );
            })
            .sort(function (a, b) {
                return (
                    Number(a.SortOrder || 0) -
                    Number(b.SortOrder || 0)
                );
            });
    }

    function makeCatalog(aRows, sAllText, bPreferTextKey) {
        var aResult = [
            {
                key: "ALL",
                text: sAllText
            }
        ];

        var mSeen = Object.create(null);

        (aRows || []).forEach(function (oRow) {
            var sText = String(
                oRow.text ||
                oRow.ValueText ||
                oRow.ValueId ||
                ""
            );

            var sKey = String(
                oRow.key ||
                (
                    bPreferTextKey
                        ? (oRow.ValueText || oRow.ValueId)
                        : (oRow.ValueId || oRow.ValueText)
                ) ||
                ""
            );

            var sDedup = norm(sKey + "|" + sText);

            if (!sKey || !sText || mSeen[sDedup]) {
                return;
            }

            mSeen[sDedup] = true;

            aResult.push({
                key: sKey,
                text: sText
            });
        });

        return aResult;
    }

    function buildPeriods() {
        var aPeriods = [];
        var iYear;

        for (iYear = 2028; iYear >= 2021; iYear -= 1) {
            aPeriods.push({
                key: String(iYear),
                text: String(iYear)
            });
        }

        return aPeriods;
    }

    function getLatestRowsByResource(aRows) {
        var mLatest = Object.create(null);

        (aRows || []).forEach(function (oRow) {
            var sResource = idKey(
                oRow.ResourceId ||
                oRow.PersonnelNumber
            );

            var oDate = parseODataDate(oRow.WorkDate);
            var oCurrentDate;

            if (!sResource) {
                return;
            }

            if (!mLatest[sResource]) {
                mLatest[sResource] = oRow;
                return;
            }

            oCurrentDate = parseODataDate(
                mLatest[sResource].WorkDate
            );

            if (
                oDate &&
                (
                    !oCurrentDate ||
                    oDate.getTime() >= oCurrentDate.getTime()
                )
            ) {
                mLatest[sResource] = oRow;
            }
        });

        return mLatest;
    }

    function getMechanicIds(oRaw) {
        var mIds = Object.create(null);

        /*
         * En QAS ResourceTypeCode puede estar vacío. Por eso se usa
         * FilterCatalog(MECHANIC) como fallback de identificación.
         */
        catalogRows(
            oRaw.catalogs,
            "MECHANIC"
        ).forEach(function (oRow) {
            var sId = idKey(oRow.ValueId);

            if (sId) {
                mIds[sId] = true;
            }
        });

        (oRaw.resources || []).forEach(function (oRow) {
            var sType = norm(oRow.ResourceTypeCode);
            var sId;

            if (
                sType === "MECHANIC" ||
                sType.indexOf("MECAN") >= 0
            ) {
                sId = idKey(
                    oRow.ResourceId ||
                    oRow.PersonnelNumber
                );

                if (sId) {
                    mIds[sId] = true;
                }
            }
        });

        (oRaw.orders || []).forEach(function (oOrder) {
            var sId = idKey(oOrder.Mecanico);

            if (sId && sId !== "0") {
                mIds[sId] = true;
            }
        });

        (oRaw.orderResources || []).forEach(function (oAssignment) {
            var sRole = norm(oAssignment.RoleCode);
            var sId;

            if (
                sRole === "MECHANIC" ||
                sRole.indexOf("MECAN") >= 0 ||
                sRole === "LEAD_MECHANIC"
            ) {
                sId = idKey(
                    oAssignment.ResourceId ||
                    oAssignment.PersonnelNumber
                );

                if (sId) {
                    mIds[sId] = true;
                }
            }
        });

        return mIds;
    }

    function isMechanicRow(oRow, mMechanicIds) {
        var sType = norm(oRow.ResourceTypeCode);
        var sResource = idKey(
            oRow.ResourceId ||
            oRow.PersonnelNumber
        );

        return (
            sType === "MECHANIC" ||
            sType.indexOf("MECAN") >= 0 ||
            Boolean(mMechanicIds[sResource])
        );
    }

    function resourceMatchesFilters(oRow, oFilters) {
        var bShiftOk =
            isAll(oFilters.turno) ||
            (
                isTrue(oRow.ShiftSourceValidated) &&
                matches(
                    oFilters.turno,
                    [
                        oRow.ShiftId,
                        oRow.ShiftName
                    ]
                )
            );

        return (
            matches(
                oFilters.zona,
                [
                    oRow.ZoneId,
                    oRow.ZoneName
                ]
            ) &&
            matches(
                oFilters.supervisor,
                [
                    oRow.SupervisorId,
                    oRow.SupervisorName
                ]
            ) &&
            bShiftOk &&
            matches(
                oFilters.especialidad,
                [
                    oRow.SpecialtyCode
                ]
            )
        );
    }

    function buildCatalogs(oRaw, aPeriodRows) {
        var aZones = catalogRows(oRaw.catalogs, "ZONE");
        var aSupervisors = catalogRows(oRaw.catalogs, "SUPERVISOR");
        var aShifts = catalogRows(oRaw.catalogs, "SHIFT");
        var aServices = catalogRows(oRaw.catalogs, "ORDER_TYPE");
        var aSpecialties = catalogRows(oRaw.catalogs, "SPECIALTY");

        /*
         * En ZONE se prioriza ValueText como key temporal porque el
         * backend documenta ValueId truncado/repetido en QAS.
         */
        if (!aZones.length) {
            aZones = uniqueBy(
                aPeriodRows
                    .filter(function (oRow) {
                        return oRow.ZoneId || oRow.ZoneName;
                    })
                    .map(function (oRow) {
                        return {
                            key: oRow.ZoneName || oRow.ZoneId,
                            text: oRow.ZoneName || oRow.ZoneId
                        };
                    }),
                function (oItem) {
                    return norm(oItem.key);
                }
            );
        }

        if (!aSupervisors.length) {
            aSupervisors = uniqueBy(
                aPeriodRows
                    .filter(function (oRow) {
                        return (
                            oRow.SupervisorId ||
                            oRow.SupervisorName
                        );
                    })
                    .map(function (oRow) {
                        return {
                            key:
                                oRow.SupervisorId ||
                                oRow.SupervisorName,
                            text:
                                oRow.SupervisorName ||
                                oRow.SupervisorId
                        };
                    }),
                function (oItem) {
                    return norm(oItem.key);
                }
            );
        }

        if (!aShifts.length) {
            aShifts = uniqueBy(
                aPeriodRows
                    .filter(function (oRow) {
                        return (
                            isTrue(oRow.ShiftSourceValidated) &&
                            (
                                oRow.ShiftId ||
                                oRow.ShiftName
                            )
                        );
                    })
                    .map(function (oRow) {
                        return {
                            key:
                                oRow.ShiftId ||
                                oRow.ShiftName,
                            text:
                                oRow.ShiftName ||
                                oRow.ShiftId
                        };
                    }),
                function (oItem) {
                    return norm(oItem.key);
                }
            );
        }

        if (!aServices.length) {
            aServices = uniqueBy(
                (oRaw.orders || [])
                    .filter(function (oOrder) {
                        return (
                            oOrder.OrderTypeCode ||
                            oOrder.OrderTypeText
                        );
                    })
                    .map(function (oOrder) {
                        return {
                            key:
                                oOrder.OrderTypeCode ||
                                oOrder.OrderTypeText,
                            text:
                                oOrder.OrderTypeText ||
                                oOrder.OrderTypeCode
                        };
                    }),
                function (oItem) {
                    return norm(oItem.key);
                }
            );
        }

        if (!aSpecialties.length) {
            aSpecialties = uniqueBy(
                aPeriodRows
                    .filter(function (oRow) {
                        return Boolean(oRow.SpecialtyCode);
                    })
                    .map(function (oRow) {
                        return {
                            key: oRow.SpecialtyCode,
                            text: oRow.SpecialtyCode
                        };
                    }),
                function (oItem) {
                    return norm(oItem.key);
                }
            );
        }

        return {
            periodos: buildPeriods(),
            zonas: makeCatalog(aZones, "Todas", true),
            supervisores: makeCatalog(aSupervisors, "Todos", false),
            turnos: makeCatalog(aShifts, "Todos", false),
            tiposServicio: makeCatalog(aServices, "Todos", false),
            especialidades: makeCatalog(aSpecialties, "Todas", false),

            estados: [
                { key: "ALL", text: "Todos" },
                { key: "AVAILABLE", text: "Disponibles" },
                { key: "BALANCED", text: "Dentro de capacidad" },
                { key: "NEAR", text: "Cerca de saturación" },
                { key: "OVER", text: "Sobre capacidad" },
                { key: "CRITICAL", text: "Crítico" },
                { key: "INACTIVE", text: "Inactivos" }
            ]
        };
    }

    function getNumericParameter(aCatalogs, aDomains, nDefault) {
        var oRow = (aCatalogs || []).find(function (oItem) {
            return (
                aDomains.indexOf(
                    norm(oItem.FilterDomain)
                ) >= 0 &&
                (
                    oItem.Active === undefined ||
                    oItem.Active === null ||
                    isTrue(oItem.Active)
                ) &&
                Number.isFinite(
                    Number(oItem.NumericValue)
                )
            );
        });

        return oRow
            ? Number(oRow.NumericValue)
            : nDefault;
    }

    function getThresholds(aCatalogs) {
        return {
            balancedMax: getNumericParameter(
                aCatalogs,
                [
                    "MECHANIC_BALANCED_MAX",
                    "UTILIZATION_BALANCED_MAX"
                ],
                DEFAULT_BALANCED_MAX
            ),

            nearMax: getNumericParameter(
                aCatalogs,
                [
                    "MECHANIC_NEAR_MAX",
                    "UTILIZATION_NEAR_MAX"
                ],
                DEFAULT_NEAR_MAX
            ),

            overMax: getNumericParameter(
                aCatalogs,
                [
                    "MECHANIC_OVER_MAX",
                    "UTILIZATION_OVER_MAX"
                ],
                DEFAULT_OVER_MAX
            )
        };
    }

    function classifyUtilization(nPct, oThresholds) {
        if (!Number.isFinite(nPct)) {
            return {
                code: "NO_DATA",
                text: "Sin datos",
                state: "None"
            };
        }

        if (nPct > oThresholds.overMax) {
            return {
                code: "CRITICAL",
                text: "Crítico",
                state: "Error"
            };
        }

        if (nPct > oThresholds.nearMax) {
            return {
                code: "OVER",
                text: "Sobrecargado",
                state: "Error"
            };
        }

        if (nPct >= oThresholds.balancedMax) {
            return {
                code: "NEAR",
                text: "Cerca de saturación",
                state: "Warning"
            };
        }

        return {
            code: "BALANCED",
            text: "Balanceado",
            state: "Success"
        };
    }

    function getAvailabilityCode(oRow) {
        var sStatus = norm(
            oRow &&
            oRow.AvailabilityStatusCode
        );

        if (!sStatus) {
            return "NO_DATA";
        }

        if (
            sStatus.indexOf("INACTIVE") >= 0 ||
            sStatus === "INACTIVO"
        ) {
            return "INACTIVE";
        }

        if (
            sStatus.indexOf("AVAILABLE") >= 0 ||
            sStatus === "DISPONIBLE"
        ) {
            return "AVAILABLE";
        }

        if (
            sStatus.indexOf("ABSENT") >= 0 ||
            sStatus.indexOf("AUSEN") >= 0
        ) {
            return "ABSENT";
        }

        return sStatus;
    }

    function pickOperationRows(aOperations) {
        var mGroups = Object.create(null);
        var aResult = [];

        (aOperations || []).forEach(function (oOperation) {
            var sKey = String(
                oOperation.OperationKey ||
                [
                    oOperation.OrderId,
                    oOperation.RoutingNumber,
                    oOperation.OperationCounter
                ].join("|")
            );

            if (!sKey) {
                return;
            }

            if (!mGroups[sKey]) {
                mGroups[sKey] = [];
            }

            mGroups[sKey].push(oOperation);
        });

        Object.keys(mGroups).forEach(function (sKey) {
            var aGroup = mGroups[sKey];

            var oSelected =
                aGroup.find(function (oRow) {
                    return (
                        norm(oRow.PlannedSourceCode) ===
                        "AFVV_WORK"
                    );
                }) ||
                aGroup.find(function (oRow) {
                    return (
                        norm(oRow.PlannedSourceCode)
                            .indexOf("AFVV") === 0
                    );
                });

            if (oSelected) {
                aResult.push(oSelected);
            }
        });

        return aResult;
    }

    function buildAssignmentMaps(aAssignments) {
        var mExact = Object.create(null);
        var mByOrder = Object.create(null);

        (aAssignments || []).forEach(function (oRow) {
            var sExact = [
                oRow.OrderId || "",
                oRow.RoutingNumber || "",
                oRow.OperationCounter || ""
            ].join("|");

            var sOrder = String(
                oRow.OrderId || ""
            );

            if (!mExact[sExact]) {
                mExact[sExact] = [];
            }

            mExact[sExact].push(oRow);

            if (sOrder) {
                if (!mByOrder[sOrder]) {
                    mByOrder[sOrder] = [];
                }

                mByOrder[sOrder].push(oRow);
            }
        });

        return {
            exact: mExact,
            byOrder: mByOrder
        };
    }

    function operationAssignments(oOperation, oMaps) {
        var sExact = [
            oOperation.OrderId || "",
            oOperation.RoutingNumber || "",
            oOperation.OperationCounter || ""
        ].join("|");

        var aExact = oMaps.exact[sExact];

        if (aExact && aExact.length) {
            return aExact;
        }

        return (
            oMaps.byOrder[
                String(
                    oOperation.OrderId || ""
                )
            ] ||
            []
        );
    }

    function groupDistinctLatest(
        mLatest,
        sIdField,
        sNameField,
        bRequireValidatedShift
    ) {
        var mGroups = Object.create(null);

        Object.keys(mLatest).forEach(function (sResource) {
            var oRow = mLatest[sResource];
            var sId;
            var sName;
            var sKey;

            if (
                bRequireValidatedShift &&
                !isTrue(oRow.ShiftSourceValidated)
            ) {
                return;
            }

            sId = String(oRow[sIdField] || "");
            sName = String(
                oRow[sNameField] ||
                sId ||
                ""
            );

            sKey = norm(
                sId ||
                sName
            );

            if (!sKey) {
                return;
            }

            if (!mGroups[sKey]) {
                mGroups[sKey] = {
                    label: sName,
                    value: 0
                };
            }

            mGroups[sKey].value += 1;
        });

        return Object.keys(mGroups).map(function (sKey) {
            return mGroups[sKey];
        });
    }

    function finalizeDistribution(aGroups, iTotal, iLimit) {
        var iMax = iLimit || 5;

        var aResult = (aGroups || [])
            .sort(function (a, b) {
                return b.value - a.value;
            })
            .slice(0, iMax)
            .map(function (oItem) {
                var nPct = iTotal > 0
                    ? (
                        oItem.value /
                        iTotal
                    ) * 100
                    : null;

                return {
                    label: oItem.label,
                    value: oItem.value,
                    pct:
                        Number.isFinite(nPct)
                            ? nPct
                            : 0,
                    pctText:
                        formatPct(nPct)
                };
            });

        /*
         * No llenamos visualmente una lista con cinco "Sin datos".
         * Si SAP todavía no publica la dimensión, mostramos una sola fila.
         */
        if (!aResult.length) {
            aResult.push({
                label: "Sin datos",
                value: "—",
                pct: 0,
                pctText: "—"
            });
        }

        return aResult;
    }

    function buildGradient(aDistribution, aColors) {
        var nCursor = 0;
        var aStops = [];

        (aDistribution || []).forEach(function (oItem, iIndex) {
            var nPct = Number(oItem.pct);
            var nEnd;

            if (
                !Number.isFinite(nPct) ||
                nPct <= 0 ||
                oItem.label === "Sin datos"
            ) {
                return;
            }

            nEnd = Math.min(
                100,
                nCursor + nPct
            );

            aStops.push(
                aColors[iIndex % aColors.length] +
                " " +
                nCursor.toFixed(2) +
                "% " +
                nEnd.toFixed(2) +
                "%"
            );

            nCursor = nEnd;
        });

        if (!aStops.length) {
            return "conic-gradient(#e8eef6 0% 100%)";
        }

        if (nCursor < 100) {
            aStops.push(
                "#e8eef6 " +
                nCursor.toFixed(2) +
                "% 100%"
            );
        }

        return (
            "conic-gradient(" +
            aStops.join(",") +
            ")"
        );
    }

    function buildStateDistribution(mPopulation, iDenominator) {
        var aDefinitions = [
            {
                codes: ["AVAILABLE"],
                label: "Disponibles"
            },
            {
                codes: ["BALANCED"],
                label: "Dentro de capacidad"
            },
            {
                codes: ["NEAR"],
                label: "Cerca de saturación"
            },
            {
                codes: ["OVER", "CRITICAL"],
                label: "Sobre capacidad"
            },
            {
                codes: ["INACTIVE"],
                label: "Inactivos"
            }
        ];

        return aDefinitions.map(function (oDef) {
            var iCount = Object.keys(mPopulation)
                .filter(function (sResource) {
                    return (
                        oDef.codes.indexOf(
                            mPopulation[
                                sResource
                            ]._mecDisplayState
                        ) >= 0
                    );
                }).length;

            var nPct = iDenominator > 0
                ? (
                    iCount /
                    iDenominator
                ) * 100
                : null;

            return {
                label: oDef.label,
                value:
                    iDenominator > 0
                        ? iCount
                        : "—",
                pct:
                    Number.isFinite(nPct)
                        ? nPct
                        : 0,
                pctText:
                    formatPct(nPct)
            };
        });
    }

    function mapData(oRawData, mFilters) {
        var oRaw = oRawData || {};

        var oFilters = Object.assign(
            {
                periodo: "2026",
                fechaDesde: "01/01/2026",
                fechaHasta: "31/12/2026",
                zona: "ALL",
                supervisor: "ALL",
                turno: "ALL",
                tipoServicio: "ALL",
                especialidad: "ALL",
                estado: "ALL"
            },
            mFilters || {}
        );

        var oFrom = parseInputDate(oFilters.fechaDesde);
        var oTo = parseInputDate(oFilters.fechaHasta);

        var mMechanicIds = getMechanicIds(oRaw);
        var oThresholds = getThresholds(oRaw.catalogs || []);

        var aPeriodRows;
        var aMechanicRows;
        var aFilteredRows;
        var mLatestAll;

        var mCapacityByResource = Object.create(null);
        var mOrderMap = Object.create(null);
        var mAssignments;
        var aOperations;
        var mLoadByResource = Object.create(null);
        var mServiceRequired = Object.create(null);

        var nTotalPlanForCoverage = 0;
        var nPlanWithMechanic = 0;

        var bAvailabilityData = false;
        var bCapacityData = false;
        var bPlanData = false;
        var bAssignmentData = false;

        var oCatalogs;
        var mPopulation;
        var aPopulationIds;
        var mActive;
        var aActiveIds;
        var iActive;

        var nAvailable = null;
        var nOver = null;
        var nTotalCapacity = null;
        var nAssignedLoad = null;
        var nGap = null;
        var nUtil = null;
        var nCoverage = null;

        var aTurnDist;
        var aSpecialtyDist;
        var aZoneDist;
        var aStateDist;
        var aCapacitySpecialty = [];
        var aPressureServices = [];
        var aHeatmapRows = [];
        var aHeatmapZones = [];

        var sGapPct = "";
        var nCapacityPct = null;
        var nLoadPct = null;

        aPeriodRows = uniqueBy(
            (oRaw.resources || [])
                .filter(function (oRow) {
                    return inRange(
                        oRow.WorkDate,
                        oFrom,
                        oTo
                    );
                }),
            function (oRow) {
                return (
                    oRow.ResourceDateId ||
                    [
                        idKey(
                            oRow.ResourceId ||
                            oRow.PersonnelNumber
                        ),
                        dayKey(oRow.WorkDate),
                        oRow.ShiftId || ""
                    ].join("|")
                );
            }
        );

        oCatalogs = buildCatalogs(
            oRaw,
            aPeriodRows
        );

        aMechanicRows = aPeriodRows.filter(function (oRow) {
            return isMechanicRow(
                oRow,
                mMechanicIds
            );
        });

        aFilteredRows = aMechanicRows.filter(function (oRow) {
            return resourceMatchesFilters(
                oRow,
                oFilters
            );
        });

        mLatestAll = getLatestRowsByResource(aFilteredRows);

        /*
         * CapacitySourceValidated=false NO es 0 h.
         * Solo se suma capacidad marcada como validada/publicable.
         */
        aFilteredRows.forEach(function (oRow) {
            var sResource = idKey(
                oRow.ResourceId ||
                oRow.PersonnelNumber
            );

            var nCapacity = Number(
                oRow.CapacityHours
            );

            if (
                !sResource ||
                !isTrue(oRow.CapacitySourceValidated) ||
                !Number.isFinite(nCapacity)
            ) {
                return;
            }

            bCapacityData = true;

            mCapacityByResource[sResource] =
                (
                    mCapacityByResource[sResource] ||
                    0
                ) +
                nCapacity;
        });

        (oRaw.orders || []).forEach(function (oOrder) {
            if (oOrder.OrderId) {
                mOrderMap[
                    String(oOrder.OrderId)
                ] = oOrder;
            }
        });

        mAssignments = buildAssignmentMaps(
            oRaw.orderResources || []
        );

        aOperations = pickOperationRows(
            oRaw.operations || []
        );

        bPlanData = aOperations.length > 0;
        bAssignmentData =
            (oRaw.orderResources || []).length > 0;

        /*
         * Planeación: solo AFVV_WORK / AFVV.
         * Nunca sumar AFVV + KBED.
         */
        aOperations.forEach(function (oOperation) {
            var oOrder = mOrderMap[
                String(
                    oOperation.OrderId ||
                    ""
                )
            ];

            var nHours = toHours(
                oOperation.PlannedValueOriginal,
                oOperation.PlannedUnitOriginal
            );

            var sServiceKey;
            var sServiceText;
            var aAssignments;
            var aResourceIds;
            var nShare;

            if (
                !oOrder ||
                !Number.isFinite(nHours)
            ) {
                return;
            }

            if (
                !matches(
                    oFilters.tipoServicio,
                    [
                        oOrder.OrderTypeCode,
                        oOrder.OrderTypeText
                    ]
                )
            ) {
                return;
            }

            nTotalPlanForCoverage += nHours;

            sServiceKey = String(
                oOrder.OrderTypeCode ||
                oOrder.OrderTypeText ||
                "SIN_SERVICIO"
            );

            sServiceText = String(
                oOrder.OrderTypeText ||
                oOrder.OrderTypeCode ||
                "Sin datos"
            );

            if (!mServiceRequired[sServiceKey]) {
                mServiceRequired[sServiceKey] = {
                    label: sServiceText,
                    hours: 0
                };
            }

            mServiceRequired[sServiceKey].hours += nHours;

            aAssignments = operationAssignments(
                oOperation,
                mAssignments
            );

            aResourceIds = uniqueStrings(
                aAssignments
                    .map(function (oAssignment) {
                        return idKey(
                            oAssignment.ResourceId ||
                            oAssignment.PersonnelNumber
                        );
                    })
                    .filter(function (sResource) {
                        return Boolean(
                            mLatestAll[sResource]
                        );
                    })
            );

            if (
                !aResourceIds.length &&
                oOperation.AssignedPersonnelNumber
            ) {
                var sAssigned = idKey(
                    oOperation.AssignedPersonnelNumber
                );

                if (mLatestAll[sAssigned]) {
                    aResourceIds = [sAssigned];
                }
            }

            if (!aResourceIds.length) {
                return;
            }

            nPlanWithMechanic += nHours;

            /*
             * La operación cuenta una sola vez. Si hay más de un recurso
             * asignado, se reparte la carga para no duplicar horas.
             */
            nShare = nHours / aResourceIds.length;

            aResourceIds.forEach(function (sResource) {
                mLoadByResource[sResource] =
                    (
                        mLoadByResource[sResource] ||
                        0
                    ) +
                    nShare;
            });
        });

        /*
         * Cuando existe filtro de servicio y ya tenemos detalle operativo,
         * la población se reduce a mecánicos realmente asignados a ese tipo.
         */
        mPopulation = Object.keys(mLatestAll)
            .reduce(function (mResult, sResource) {
                if (
                    !isAll(oFilters.tipoServicio) &&
                    bPlanData &&
                    bAssignmentData &&
                    !Number.isFinite(
                        mLoadByResource[sResource]
                    )
                ) {
                    return mResult;
                }

                mResult[sResource] =
                    mLatestAll[sResource];

                return mResult;
            }, Object.create(null));

        /*
         * Estado por recurso.
         */
        Object.keys(mPopulation).forEach(function (sResource) {
            var oRow = mPopulation[sResource];

            var sAvailability =
                getAvailabilityCode(oRow);

            var nCapacity =
                mCapacityByResource[sResource];

            var nLoad =
                mLoadByResource[sResource];

            var nPct =
                Number.isFinite(nCapacity) &&
                nCapacity > 0 &&
                Number.isFinite(nLoad)
                    ? (
                        nLoad /
                        nCapacity
                    ) * 100
                    : null;

            var oUtilState =
                classifyUtilization(
                    nPct,
                    oThresholds
                );

            if (sAvailability !== "NO_DATA") {
                bAvailabilityData = true;
            }

            oRow._mecAvailability =
                sAvailability;

            oRow._mecUtilization =
                nPct;

            oRow._mecComputedState =
                oUtilState.code;

            if (sAvailability === "INACTIVE") {
                oRow._mecDisplayState =
                    "INACTIVE";
            } else if (sAvailability === "AVAILABLE") {
                oRow._mecDisplayState =
                    "AVAILABLE";
            } else {
                oRow._mecDisplayState =
                    oUtilState.code;
            }
        });

        /*
         * Estado se filtra después del cálculo.
         */
        if (!isAll(oFilters.estado)) {
            mPopulation = Object.keys(mPopulation)
                .reduce(function (mResult, sResource) {
                    var oRow =
                        mPopulation[sResource];

                    var sFilter =
                        norm(oFilters.estado);

                    if (
                        oRow._mecDisplayState === sFilter ||
                        oRow._mecComputedState === sFilter
                    ) {
                        mResult[sResource] = oRow;
                    }

                    return mResult;
                }, Object.create(null));
        }

        aPopulationIds = Object.keys(mPopulation);

        mActive = aPopulationIds.reduce(
            function (mResult, sResource) {
                if (
                    mPopulation[
                        sResource
                    ]._mecDisplayState !==
                    "INACTIVE"
                ) {
                    mResult[sResource] =
                        mPopulation[sResource];
                }

                return mResult;
            },
            Object.create(null)
        );

        aActiveIds = Object.keys(mActive);
        iActive = aActiveIds.length;

        if (bAvailabilityData) {
            nAvailable = aActiveIds.filter(
                function (sResource) {
                    return (
                        mActive[
                            sResource
                        ]._mecAvailability ===
                        "AVAILABLE"
                    );
                }
            ).length;
        }

        if (
            bCapacityData &&
            bPlanData &&
            bAssignmentData
        ) {
            nOver = aActiveIds.filter(
                function (sResource) {
                    var nPct =
                        mActive[
                            sResource
                        ]._mecUtilization;

                    return (
                        Number.isFinite(nPct) &&
                        nPct > oThresholds.nearMax
                    );
                }
            ).length;
        }

        if (bCapacityData) {
            nTotalCapacity = aActiveIds.reduce(
                function (nTotal, sResource) {
                    var nCapacity =
                        mCapacityByResource[sResource];

                    return (
                        nTotal +
                        (
                            Number.isFinite(nCapacity)
                                ? nCapacity
                                : 0
                        )
                    );
                },
                0
            );
        }

        if (
            bPlanData &&
            bAssignmentData
        ) {
            nAssignedLoad = aActiveIds.reduce(
                function (nTotal, sResource) {
                    var nLoad =
                        mLoadByResource[sResource];

                    return (
                        nTotal +
                        (
                            Number.isFinite(nLoad)
                                ? nLoad
                                : 0
                        )
                    );
                },
                0
            );
        }

        if (
            Number.isFinite(nTotalCapacity) &&
            Number.isFinite(nAssignedLoad)
        ) {
            nGap =
                nTotalCapacity -
                nAssignedLoad;

            nUtil =
                nTotalCapacity > 0
                    ? (
                        nAssignedLoad /
                        nTotalCapacity
                    ) * 100
                    : null;

            sGapPct =
                nAssignedLoad > 0
                    ? (
                        "(" +
                        formatPct(
                            (
                                nGap /
                                nAssignedLoad
                            ) * 100
                        ) +
                        ")"
                    )
                    : "";

            nCapacityPct = 100;

            nLoadPct =
                nTotalCapacity > 0
                    ? Math.min(
                        100,
                        (
                            nAssignedLoad /
                            nTotalCapacity
                        ) * 100
                    )
                    : null;
        }

        /*
         * Cobertura: solo se calcula cuando se publique una regla explícita.
         */
        if (
            catalogRows(
                oRaw.catalogs,
                "DEMAND_COVERAGE_RULE"
            ).some(function (oRow) {
                return (
                    norm(
                        oRow.ValueId ||
                        oRow.ValueText
                    ) ===
                    "ASSIGNED_PLANNED_HOURS"
                );
            }) &&
            nTotalPlanForCoverage > 0
        ) {
            nCoverage =
                (
                    nPlanWithMechanic /
                    nTotalPlanForCoverage
                ) * 100;
        }

        aTurnDist = finalizeDistribution(
            groupDistinctLatest(
                mActive,
                "ShiftId",
                "ShiftName",
                true
            ),
            iActive,
            3
        );

        aSpecialtyDist = finalizeDistribution(
            groupDistinctLatest(
                mActive,
                "SpecialtyCode",
                "SpecialtyCode",
                false
            ),
            iActive,
            5
        );

        aZoneDist = finalizeDistribution(
            groupDistinctLatest(
                mActive,
                "ZoneId",
                "ZoneName",
                false
            ),
            iActive,
            5
        );

        aStateDist = buildStateDistribution(
            mPopulation,
            Object.keys(mPopulation).length
        );

        /*
         * Capacidad por especialidad.
         */
        (function () {
            var mGroups = Object.create(null);

            aActiveIds.forEach(function (sResource) {
                var oLatest = mActive[sResource];

                var sSpecialty = String(
                    oLatest.SpecialtyCode ||
                    ""
                );

                var sKey = norm(sSpecialty);

                var nCapacity =
                    mCapacityByResource[sResource];

                var nLoad =
                    mLoadByResource[sResource];

                if (!sKey) {
                    return;
                }

                if (!mGroups[sKey]) {
                    mGroups[sKey] = {
                        label: sSpecialty,
                        capacity: 0,
                        load: 0,
                        hasCapacity: false,
                        hasLoad: false
                    };
                }

                if (Number.isFinite(nCapacity)) {
                    mGroups[sKey].capacity +=
                        nCapacity;
                    mGroups[sKey].hasCapacity =
                        true;
                }

                if (Number.isFinite(nLoad)) {
                    mGroups[sKey].load +=
                        nLoad;
                    mGroups[sKey].hasLoad =
                        true;
                }
            });

            aCapacitySpecialty = Object.keys(mGroups)
                .map(function (sKey) {
                    var oGroup = mGroups[sKey];

                    var nPct =
                        oGroup.hasCapacity &&
                        oGroup.capacity > 0 &&
                        oGroup.hasLoad
                            ? (
                                oGroup.load /
                                oGroup.capacity
                            ) * 100
                            : null;

                    var oState =
                        classifyUtilization(
                            nPct,
                            oThresholds
                        );

                    return {
                        label: oGroup.label,

                        capacidad:
                            oGroup.hasCapacity
                                ? formatNumber(
                                    oGroup.capacity,
                                    0
                                )
                                : "Sin datos",

                        carga:
                            oGroup.hasLoad
                                ? formatNumber(
                                    oGroup.load,
                                    0
                                )
                                : "Sin datos",

                        utilizacion:
                            formatPct(nPct),

                        state:
                            oState.state,

                        stateCode:
                            oState.code,

                        capPct:
                            oGroup.hasCapacity &&
                            Number.isFinite(nTotalCapacity) &&
                            nTotalCapacity > 0
                                ? Math.min(
                                    100,
                                    (
                                        oGroup.capacity /
                                        nTotalCapacity
                                    ) * 100
                                )
                                : 0,

                        cargaPct:
                            oGroup.hasLoad &&
                            Number.isFinite(nAssignedLoad) &&
                            nAssignedLoad > 0
                                ? Math.min(
                                    100,
                                    (
                                        oGroup.load /
                                        nAssignedLoad
                                    ) * 100
                                )
                                : 0
                    };
                })
                .sort(function (a, b) {
                    var nA = Number(
                        String(
                            a.capacidad
                        ).replace(/,/g, "")
                    ) || 0;

                    var nB = Number(
                        String(
                            b.capacidad
                        ).replace(/,/g, "")
                    ) || 0;

                    return nB - nA;
                })
                .slice(0, 6);
        }());

        /*
         * Saturación por turno y zona.
         * ShiftSourceValidated=false no se publica como turno oficial.
         */
        (function () {
            var aValidShiftResources =
                aActiveIds.filter(function (sResource) {
                    return (
                        isTrue(
                            mActive[
                                sResource
                            ].ShiftSourceValidated
                        ) &&
                        (
                            mActive[
                                sResource
                            ].ShiftId ||
                            mActive[
                                sResource
                            ].ShiftName
                        ) &&
                        (
                            mActive[
                                sResource
                            ].ZoneId ||
                            mActive[
                                sResource
                            ].ZoneName
                        )
                    );
                });

            var aZones = uniqueStrings(
                aValidShiftResources
                    .map(function (sResource) {
                        var oRow =
                            mActive[sResource];

                        return String(
                            oRow.ZoneName ||
                            oRow.ZoneId ||
                            ""
                        );
                    })
                    .filter(Boolean)
            ).slice(0, 5);

            var aShifts = uniqueStrings(
                aValidShiftResources
                    .map(function (sResource) {
                        var oRow =
                            mActive[sResource];

                        return String(
                            oRow.ShiftName ||
                            oRow.ShiftId ||
                            ""
                        );
                    })
                    .filter(Boolean)
            ).slice(0, 4);

            aHeatmapZones = aZones.map(
                function (sZone) {
                    return {
                        label: sZone
                    };
                }
            );

            aHeatmapRows = aShifts.map(
                function (sShift) {
                    var aCells = aZones.map(
                        function (sZone) {
                            var aResources =
                                aValidShiftResources.filter(
                                    function (sResource) {
                                        var oRow =
                                            mActive[sResource];

                                        return (
                                            norm(
                                                oRow.ShiftName ||
                                                oRow.ShiftId
                                            ) ===
                                            norm(sShift) &&
                                            norm(
                                                oRow.ZoneName ||
                                                oRow.ZoneId
                                            ) ===
                                            norm(sZone)
                                        );
                                    }
                                );

                            var nCap = 0;
                            var nLoad = 0;
                            var bCap = false;
                            var bLoad = false;

                            aResources.forEach(
                                function (sResource) {
                                    var nC =
                                        mCapacityByResource[
                                            sResource
                                        ];

                                    var nL =
                                        mLoadByResource[
                                            sResource
                                        ];

                                    if (Number.isFinite(nC)) {
                                        nCap += nC;
                                        bCap = true;
                                    }

                                    if (Number.isFinite(nL)) {
                                        nLoad += nL;
                                        bLoad = true;
                                    }
                                }
                            );

                            var nPct =
                                bCap &&
                                bLoad &&
                                nCap > 0
                                    ? (
                                        nLoad /
                                        nCap
                                    ) * 100
                                    : null;

                            var oState =
                                classifyUtilization(
                                    nPct,
                                    oThresholds
                                );

                            return {
                                zone: sZone,
                                value: formatPct(nPct),
                                stateCode: oState.code
                            };
                        }
                    );

                    return {
                        shift: sShift,
                        cells: aCells
                    };
                }
            );

            if (
                !aHeatmapZones.length ||
                !aHeatmapRows.length
            ) {
                aHeatmapZones = [
                    {
                        label: "Sin datos"
                    }
                ];

                aHeatmapRows = [
                    {
                        shift: "Sin turno validado",
                        cells: [
                            {
                                zone: "Sin datos",
                                value: "—",
                                stateCode: "NO_DATA"
                            }
                        ]
                    }
                ];
            }
        }());

        /*
         * Presión por servicio:
         * - Horas requeridas: sí salen de Operations + Orders.
         * - Horas disponibles por servicio: NO se inventan; falta regla
         *   de atribución de capacidad cuando un mecánico participa en
         *   varios tipos.
         */
        aPressureServices = Object.keys(mServiceRequired)
            .map(function (sKey) {
                var oService =
                    mServiceRequired[sKey];

                return {
                    label: oService.label,

                    req:
                        formatNumber(
                            oService.hours,
                            1
                        ),

                    disp:
                        "Sin datos",

                    utilizacion:
                        "Sin datos",

                    state:
                        "None",

                    stateText:
                        "Regla pendiente",

                    reqPct:
                        nTotalPlanForCoverage > 0
                            ? Math.min(
                                100,
                                (
                                    oService.hours /
                                    nTotalPlanForCoverage
                                ) * 100
                            )
                            : 0,

                    dispPct:
                        0
                };
            })
            .sort(function (a, b) {
                return (
                    (
                        Number(
                            String(
                                b.req
                            ).replace(/,/g, "")
                        ) || 0
                    ) -
                    (
                        Number(
                            String(
                                a.req
                            ).replace(/,/g, "")
                        ) || 0
                    )
                );
            })
            .slice(0, 4);

        if (!aPressureServices.length) {
            aPressureServices.push({
                label: "Sin datos",
                req: "—",
                disp: "—",
                utilizacion: "—",
                state: "None",
                stateText: "",
                reqPct: 0,
                dispPct: 0
            });
        }

        console.log(
            "[MEC MAPPER] Resultado",
            {
                resourceDaily:
                    (oRaw.resources || []).length,
                recursosPeriodo:
                    aPeriodRows.length,
                mecanicosPeriodo:
                    aMechanicRows.length,
                poblacion:
                    Object.keys(mPopulation).length,
                activos:
                    iActive,
                orders:
                    (oRaw.orders || []).length,
                orderResources:
                    (oRaw.orderResources || []).length,
                operations:
                    aOperations.length,
                capacidadValidada:
                    bCapacityData,
                disponibilidadValidada:
                    bAvailabilityData
            }
        );

        return {
            catalogos: oCatalogs,

            header: {
                periodoActual:
                    String(
                        oFilters.periodo ||
                        (
                            oFrom &&
                            oFrom.getFullYear()
                        ) ||
                        2026
                    )
            },

            kpis: {
                activos:
                    aMechanicRows.length
                        ? String(iActive)
                        : "Sin datos",

                disponibles:
                    bAvailabilityData
                        ? String(nAvailable)
                        : "Sin datos",

                disponiblesPct:
                    bAvailabilityData &&
                    iActive > 0
                        ? (
                            formatPct(
                                (
                                    nAvailable /
                                    iActive
                                ) * 100
                            ) +
                            " de la plantilla"
                        )
                        : "Sin datos",

                sobrecapacidad:
                    Number.isFinite(nOver)
                        ? String(nOver)
                        : "Sin datos",

                sobrecapacidadPct:
                    Number.isFinite(nOver) &&
                    iActive > 0
                        ? (
                            formatPct(
                                (
                                    nOver /
                                    iActive
                                ) * 100
                            ) +
                            " de la plantilla"
                        )
                        : "Sin datos",

                cobertura:
                    formatPct(nCoverage),

                coberturaSub:
                    Number.isFinite(nCoverage)
                        ? "Demanda cubierta con recurso asignado"
                        : "Regla funcional pendiente"
            },

            balance: {
                capacidad:
                    formatHours(nTotalCapacity),

                capacidadPct:
                    Number.isFinite(nCapacityPct)
                        ? (
                            "(" +
                            formatPct(nCapacityPct) +
                            ")"
                        )
                        : "",

                carga:
                    formatHours(nAssignedLoad),

                cargaPct:
                    Number.isFinite(nLoadPct)
                        ? (
                            "(" +
                            formatPct(nLoadPct) +
                            ")"
                        )
                        : "",

                brecha:
                    Number.isFinite(nGap)
                        ? (
                            (
                                nGap >= 0
                                    ? "+"
                                    : "-"
                            ) +
                            formatHours(
                                Math.abs(nGap)
                            )
                        )
                        : "Sin datos",

                brechaPct:
                    sGapPct,

                utilizacion:
                    formatPct(nUtil),

                utilizacionRaw:
                    Number.isFinite(nUtil)
                        ? Math.min(
                            100,
                            Math.max(
                                0,
                                nUtil
                            )
                        )
                        : 0,

                mensaje:
                    Number.isFinite(nGap)
                        ? (
                            nGap >= 0
                                ? (
                                    "La capacidad validada supera la carga programada por " +
                                    formatHours(nGap) +
                                    "."
                                )
                                : (
                                    "La carga programada supera la capacidad validada por " +
                                    formatHours(
                                        Math.abs(nGap)
                                    ) +
                                    "."
                                )
                        )
                        : "Esperando datos validados de capacidad y carga."
            },

            distribucionTurnos:
                aTurnDist,

            distribucionEspecialidad:
                aSpecialtyDist,

            distribucionZona:
                aZoneDist,

            estadoData:
                aStateDist,

            zonaDonutGradient:
                buildGradient(
                    aZoneDist,
                    [
                        "#2488f5",
                        "#25b15f",
                        "#7c3aed",
                        "#ff8b22",
                        "#ef3c50"
                    ]
                ),

            estadoDonutGradient:
                buildGradient(
                    aStateDist,
                    [
                        "#25b15f",
                        "#2488f5",
                        "#f4ba22",
                        "#ef3c50",
                        "#94a3b8"
                    ]
                ),

            zonaTotal:
                iActive > 0
                    ? String(iActive)
                    : "—",

            especialidadMensaje:
                aSpecialtyDist[0] &&
                aSpecialtyDist[0].label !==
                "Sin datos"
                    ? (
                        "La especialidad con mayor plantilla es " +
                        aSpecialtyDist[0].label +
                        " (" +
                        aSpecialtyDist[0].pctText +
                        ")."
                    )
                    : "Especialidad pendiente de información.",

            heatmapZones:
                aHeatmapZones,

            heatmapRows:
                aHeatmapRows,

            capacidadEspecialidad:
                aCapacitySpecialty,

            capacidadTotal:
                formatPct(nUtil),

            presionServicios:
                aPressureServices,

            presionTotal: {
                req:
                    nTotalPlanForCoverage > 0
                        ? formatNumber(
                            nTotalPlanForCoverage,
                            1
                        )
                        : "Sin datos",

                disp:
                    "Sin datos",

                utilizacion:
                    "Sin datos"
            },

            meta: {
                hasMechanicPopulation:
                    aMechanicRows.length > 0,

                availabilityData:
                    bAvailabilityData,

                capacityData:
                    bCapacityData,

                planData:
                    bPlanData,

                assignmentData:
                    bAssignmentData,

                coverageRuleApproved:
                    Number.isFinite(nCoverage),

                serviceCapacityRuleApproved:
                    false,

                temporalGroupingProvisional:
                    true,

                preferredPlanSource:
                    "AFVV_WORK",

                thresholds:
                    oThresholds
            }
        };
    }

    return {
        mapData: mapData,
        toHours: toHours
    };
});
