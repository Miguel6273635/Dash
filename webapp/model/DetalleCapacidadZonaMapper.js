sap.ui.define([], function () {
    "use strict";

    function normalize(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
    }

    function isAll(vValue) {
        return ["", "TODOS", "TODAS", "ALL"].indexOf(normalize(vValue)) >= 0;
    }

    function isTrue(vValue) {
        var sValue = normalize(vValue);

        return (
            vValue === true ||
            sValue === "TRUE" ||
            sValue === "X" ||
            sValue === "1"
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

        return Number.isNaN(oDate.getTime()) ? null : oDate;
    }

    function parseODataDate(vValue) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }

        if (vValue instanceof Date) {
            oDate = new Date(vValue.getTime());
        } else {
            aMatch = String(vValue).match(/\/Date\((-?\d+)/);

            oDate = aMatch
                ? new Date(Number(aMatch[1]))
                : new Date(vValue);
        }

        if (Number.isNaN(oDate.getTime())) {
            return null;
        }

        if (
            oDate.getUTCHours() === 0 &&
            oDate.getUTCMinutes() === 0 &&
            oDate.getUTCSeconds() === 0
        ) {
            return new Date(
                oDate.getUTCFullYear(),
                oDate.getUTCMonth(),
                oDate.getUTCDate()
            );
        }

        return oDate;
    }

    function normalizeDateOnly(oDate) {
        if (!(oDate instanceof Date)) {
            return null;
        }

        return new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate()
        );
    }

    function isDateInRange(vDate, oStart, oEnd) {
        var oDate = normalizeDateOnly(parseODataDate(vDate));

        if (!oDate) {
            return false;
        }

        if (oStart && oDate < normalizeDateOnly(oStart)) {
            return false;
        }

        if (oEnd && oDate > normalizeDateOnly(oEnd)) {
            return false;
        }

        return true;
    }

    function toHours(vValue, sUnit) {
        var nValue = parseFloat(vValue);
        var sUnitNormalized = normalize(sUnit);

        if (Number.isNaN(nValue)) {
            return 0;
        }

        switch (sUnitNormalized) {
        case "H":
        case "HR":
        case "HRS":
        case "HOUR":
        case "HOURS":
        case "STD":
            return nValue;

        case "MIN":
        case "MINS":
        case "MINUTE":
        case "MINUTES":
            return nValue / 60;

        case "S":
        case "SEC":
        case "SECOND":
        case "SECONDS":
            return nValue / 3600;

        default:
            console.warn(
                "[MAPPER] Unidad no reconocida:",
                sUnit,
                "Valor:",
                vValue
            );
            return 0;
        }
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

    function groupBy(aItems, sProperty) {
        var mResult = Object.create(null);

        (aItems || []).forEach(function (oItem) {
            var sKey = String(
                oItem &&
                oItem[sProperty] ||
                ""
            );

            if (!sKey) {
                return;
            }

            if (!mResult[sKey]) {
                mResult[sKey] = [];
            }

            mResult[sKey].push(oItem);
        });

        return mResult;
    }

    function matchesFilter(vFilter, aValues) {
        var sFilter;

        if (isAll(vFilter)) {
            return true;
        }

        sFilter = normalize(vFilter);

        return (aValues || []).some(function (vValue) {
            return normalize(vValue) === sFilter;
        });
    }

    function assignmentPriority(oAssignment) {
        var sType = normalize(
            oAssignment &&
            oAssignment.AssignmentTypeCode
        );

        var sRole = normalize(
            oAssignment &&
            oAssignment.RoleCode
        );

        var iPriority = 0;

        if (sType === "PRIMARY") {
            iPriority += 100;
        }

        if (sRole === "TECHNICIAN") {
            iPriority += 50;
        } else if (sRole === "MECHANIC") {
            iPriority += 40;
        } else if (sRole === "RESPONSIBLE") {
            iPriority += 30;
        }

        if (oAssignment && !oAssignment.ValidTo) {
            iPriority += 20;
        }

        return iPriority;
    }

    function chooseAssignment(aAssignments) {
        var aSorted = (aAssignments || []).slice();

        aSorted.sort(function (a, b) {
            return assignmentPriority(b) - assignmentPriority(a);
        });

        return aSorted[0] || null;
    }

    function sameCalendarDate(oDateA, oDateB) {
        return Boolean(
            oDateA &&
            oDateB &&
            oDateA.getFullYear() === oDateB.getFullYear() &&
            oDateA.getMonth() === oDateB.getMonth() &&
            oDateA.getDate() === oDateB.getDate()
        );
    }

    function chooseResourceRow(sResourceId, aResourceRows, oOrder) {
        var aRows = (aResourceRows || []).filter(function (oResource) {
            return (
                String(oResource.ResourceId || "") ===
                String(sResourceId || "")
            );
        });

        var oOrderDate = parseODataDate(
            oOrder &&
            (
                oOrder.PlannedStartDate ||
                oOrder.PlannedFinishDate
            )
        );

        var oExact;

        if (!aRows.length) {
            return null;
        }

        if (!oOrderDate) {
            return aRows[0];
        }

        oExact = aRows.find(function (oResource) {
            return sameCalendarDate(
                parseODataDate(oResource.WorkDate),
                oOrderDate
            );
        });

        if (oExact) {
            return oExact;
        }

        aRows.sort(function (a, b) {
            var oDateA = parseODataDate(a.WorkDate);
            var oDateB = parseODataDate(b.WorkDate);

            var nDiffA = oDateA
                ? Math.abs(oDateA.getTime() - oOrderDate.getTime())
                : Number.MAX_VALUE;

            var nDiffB = oDateB
                ? Math.abs(oDateB.getTime() - oOrderDate.getTime())
                : Number.MAX_VALUE;

            return nDiffA - nDiffB;
        });

        return aRows[0];
    }

    function getResourceInfo(oOrder, mAssignments, aResources) {
        var sOrderId = String(oOrder.OrderId || "");
        var oAssignment = chooseAssignment(mAssignments[sOrderId] || []);
        var oResource;

        if (!oAssignment) {
            return {
                resourceId: "",
                responsable: "Sin Asignar",
                zonaId: "",
                zona: "Sin Zona",
                supervisorId: "",
                supervisor: "Sin Supervisor",
                turnoId: "",
                turno: "Sin Turno"
            };
        }

        oResource = chooseResourceRow(
            oAssignment.ResourceId,
            aResources,
            oOrder
        );

        if (!oResource) {
            return {
                resourceId: oAssignment.ResourceId || "",
                responsable:
                    oAssignment.PersonnelNumber ||
                    oAssignment.ResourceId ||
                    "Sin Asignar",
                zonaId: "",
                zona: "Sin Zona",
                supervisorId: "",
                supervisor: "Sin Supervisor",
                turnoId: "",
                turno: "Sin Turno"
            };
        }

        return {
            resourceId:
                oResource.ResourceId ||
                oAssignment.ResourceId ||
                "",

            responsable:
                oResource.ResourceName ||
                oAssignment.PersonnelNumber ||
                oResource.ResourceId ||
                "Sin Asignar",

            zonaId:
                oResource.ZoneId || "",

            zona:
                oResource.ZoneName ||
                oResource.ZoneId ||
                "Sin Zona",

            supervisorId:
                oResource.SupervisorId || "",

            supervisor:
                oResource.SupervisorName ||
                oResource.SupervisorId ||
                "Sin Supervisor",

            turnoId:
                oResource.ShiftId || "",

            turno:
                oResource.ShiftName ||
                oResource.ShiftId ||
                "Sin Turno"
        };
    }

    function sumPlannedHours(sOrderId, mOperations) {
        return (mOperations[sOrderId] || []).reduce(
            function (nTotal, oOperation) {
                return nTotal + toHours(
                    oOperation.PlannedValueOriginal,
                    oOperation.PlannedUnitOriginal
                );
            },
            0
        );
    }

    function sumActualHours(sOrderId, mConfirmations) {
        return (mConfirmations[sOrderId] || [])
            .filter(function (oConfirmation) {
                return isTrue(
                    oConfirmation.IncludedInCalculation
                );
            })
            .reduce(function (nTotal, oConfirmation) {
                return nTotal + toHours(
                    oConfirmation.ActualValueOriginal,
                    oConfirmation.ActualUnitOriginal
                );
            }, 0);
    }

    /*
     * Regla provisional hasta aprobación de umbrales funcionales.
     */
    function classifyVariation(nVariation) {
        if (nVariation > 0) {
            return {
                estado: "Sobrecargado",
                colorClass: "dczRedStrong",
                statusDotClass: "dczDotRed"
            };
        }

        return {
            estado: "Dentro de plan",
            colorClass: "dczGreenStrong",
            statusDotClass: "dczDotGreen"
        };
    }

    function classifyUtilization(nUtilization) {
        return nUtilization > 100
            ? "Sobrecargado"
            : "Dentro de plan";
    }

    function getTurnDotClass(sTurn) {
        var sValue = normalize(sTurn);

        if (sValue.indexOf("NOCT") >= 0) {
            return "dczDotLightBlue";
        }

        if (sValue.indexOf("FIN") >= 0) {
            return "dczDotTeal";
        }

        return "dczDotBlue";
    }

    function getTypeDotClass(iIndex) {
        var aClasses = [
            "dczDotGreen",
            "dczDotBlue",
            "dczDotPurple",
            "dczDotTeal"
        ];

        return aClasses[iIndex % aClasses.length];
    }

    function buildSummary(aRows, sGroupProperty, sOutputProperty) {
        var mGroups = Object.create(null);

        aRows.forEach(function (oRow) {
            var sKey = oRow[sGroupProperty] || "Sin definir";

            if (!mGroups[sKey]) {
                mGroups[sKey] = {
                    orders: Object.create(null),
                    plan: 0,
                    real: 0
                };
            }

            mGroups[sKey].orders[oRow.ot] = true;
            mGroups[sKey].plan += Number(oRow._horasPlan) || 0;
            mGroups[sKey].real += Number(oRow._horasReales) || 0;
        });

        return Object.keys(mGroups).map(function (sKey, iIndex) {
            var oGroup = mGroups[sKey];
            var nVariation = oGroup.real - oGroup.plan;

            var nVariationPct = oGroup.plan > 0
                ? (nVariation / oGroup.plan) * 100
                : 0;

            var oState = classifyVariation(nVariation);

            var oResult = {
                ot: String(Object.keys(oGroup.orders).length),
                horasPlan: oGroup.plan.toFixed(1),
                horasReales: oGroup.real.toFixed(1),

                variacionH:
                    (nVariation > 0 ? "+" : "") +
                    nVariation.toFixed(1),

                variacionPct:
                    (nVariationPct > 0 ? "+" : "") +
                    nVariationPct.toFixed(1) +
                    "%",

                estado: oState.estado,
                colorClass: oState.colorClass,
                statusDotClass: oState.statusDotClass
            };

            oResult[sOutputProperty] = sKey;

            if (sOutputProperty === "turno") {
                oResult.dotClass = getTurnDotClass(sKey);
            } else {
                oResult.dotClass = getTypeDotClass(iIndex);
            }

            return oResult;
        });
    }

    function getCatalogValues(aCatalogs, aDomains) {
        var aNormalizedDomains = aDomains.map(normalize);

        return (aCatalogs || [])
            .filter(function (oItem) {
                var bActive =
                    oItem.Active === undefined ||
                    oItem.Active === null ||
                    isTrue(oItem.Active);

                return (
                    bActive &&
                    aNormalizedDomains.indexOf(
                        normalize(oItem.FilterDomain)
                    ) >= 0
                );
            })
            .map(function (oItem) {
                return {
                    key: String(
                        oItem.ValueId ||
                        oItem.ValueText ||
                        ""
                    ),

                    text: String(
                        oItem.ValueText ||
                        oItem.ValueId ||
                        ""
                    )
                };
            });
    }

    function createUniqueCatalog(aValues, sAllKey, sAllText) {
        var mSeen = Object.create(null);

        var aResult = [
            {
                key: sAllKey,
                text: sAllText
            }
        ];

        (aValues || []).forEach(function (oItem) {
            var sKey = String(oItem.key || "");
            var sText = String(oItem.text || sKey);
            var sNormalized = normalize(sKey);

            if (!sKey || mSeen[sNormalized]) {
                return;
            }

            mSeen[sNormalized] = true;

            aResult.push({
                key: sKey,
                text: sText
            });
        });

        return aResult;
    }

    function buildYearCatalog(mFilters) {
        var iCurrentYear = new Date().getFullYear();

        var iSelectedYear =
            Number(mFilters.periodo) ||
            (
                parseInputDate(mFilters.fechaDesde) ||
                new Date()
            ).getFullYear();

        var iStartYear = Math.min(
            iCurrentYear - 5,
            iSelectedYear - 2
        );

        var iEndYear = Math.max(
            iCurrentYear + 1,
            iSelectedYear + 2
        );

        var aYears = [];
        var iYear;

        for (iYear = iEndYear; iYear >= iStartYear; iYear--) {
            aYears.push({
                key: String(iYear),
                text: String(iYear)
            });
        }

        return aYears;
    }

    function buildCatalogs(oRaw, mFilters, aOrders, aResources) {
        var aZones = getCatalogValues(
            oRaw.catalogs,
            ["ZONE", "ZONA"]
        );

        var aSupervisors = getCatalogValues(
            oRaw.catalogs,
            ["SUPERVISOR"]
        );

        var aShifts = getCatalogValues(
            oRaw.catalogs,
            ["SHIFT", "TURNO"]
        );

        var aTypes = getCatalogValues(
            oRaw.catalogs,
            [
                "ORDER_TYPE",
                "ORDERTYPE",
                "TIPO_ORDEN"
            ]
        );

        var aStatuses = getCatalogValues(
            oRaw.catalogs,
            [
                "ORDER_STATUS",
                "STATUS",
                "ESTADO_ORDEN"
            ]
        );

        if (!aZones.length) {
            aZones = aResources.map(function (oResource) {
                return {
                    key:
                        oResource.ZoneId ||
                        oResource.ZoneName,

                    text:
                        oResource.ZoneName ||
                        oResource.ZoneId
                };
            });
        }

        if (!aSupervisors.length) {
            aSupervisors = aResources.map(function (oResource) {
                return {
                    key:
                        oResource.SupervisorId ||
                        oResource.SupervisorName,

                    text:
                        oResource.SupervisorName ||
                        oResource.SupervisorId
                };
            });
        }

        if (!aShifts.length) {
            aShifts = aResources.map(function (oResource) {
                return {
                    key:
                        oResource.ShiftId ||
                        oResource.ShiftName,

                    text:
                        oResource.ShiftName ||
                        oResource.ShiftId
                };
            });
        }

        if (!aTypes.length) {
            aTypes = aOrders.map(function (oOrder) {
                return {
                    key:
                        oOrder.OrderTypeCode ||
                        oOrder.OrderTypeText,

                    text:
                        oOrder.OrderTypeText ||
                        oOrder.OrderTypeCode
                };
            });
        }

        if (!aStatuses.length) {
            aStatuses = aOrders.map(function (oOrder) {
                return {
                    key:
                        oOrder.SapUserStatusCode ||
                        oOrder.AppStatusCode ||
                        oOrder.StatusText,

                    text:
                        oOrder.StatusText ||
                        oOrder.SapUserStatusCode ||
                        oOrder.AppStatusCode
                };
            });
        }

        return {
            periodos:
                buildYearCatalog(mFilters),

            zonas:
                createUniqueCatalog(
                    aZones,
                    "Todos",
                    "Todos"
                ),

            supervisores:
                createUniqueCatalog(
                    aSupervisors,
                    "Todos",
                    "Todos"
                ),

            turnos:
                createUniqueCatalog(
                    aShifts,
                    "Todos",
                    "Todos"
                ),

            tiposOrden:
                createUniqueCatalog(
                    aTypes,
                    "Todos",
                    "Todos"
                ),

            estados:
                createUniqueCatalog(
                    aStatuses,
                    "Todos",
                    "Todos"
                )
        };
    }

    function mapData(oRawData, mFilters) {
        var oRaw = oRawData || {};

        var oFilters = Object.assign(
            {
                periodo: String(new Date().getFullYear()),
                fechaDesde: "",
                fechaHasta: "",
                zona: "Todos",
                supervisor: "Todos",
                turno: "Todos",
                tipoOrden: "Todos",
                estado: "Todos"
            },
            mFilters || {}
        );

        var oStartDate =
            parseInputDate(oFilters.fechaDesde);

        var oEndDate =
            parseInputDate(oFilters.fechaHasta);

        var aOrders = uniqueBy(
            oRaw.orders || [],
            function (oOrder) {
                return oOrder.OrderId;
            }
        );

        var aResourcesInPeriod =
            (oRaw.resources || []).filter(
                function (oResource) {
                    return isDateInRange(
                        oResource.WorkDate,
                        oStartDate,
                        oEndDate
                    );
                }
            );

        var aSelectedResources =
            aResourcesInPeriod.filter(
                function (oResource) {
                    return (
                        matchesFilter(
                            oFilters.zona,
                            [
                                oResource.ZoneId,
                                oResource.ZoneName
                            ]
                        ) &&
                        matchesFilter(
                            oFilters.supervisor,
                            [
                                oResource.SupervisorId,
                                oResource.SupervisorName
                            ]
                        ) &&
                        matchesFilter(
                            oFilters.turno,
                            [
                                oResource.ShiftId,
                                oResource.ShiftName
                            ]
                        )
                    );
                }
            );

        var mOperations =
            groupBy(
                oRaw.operations || [],
                "OrderId"
            );

        var mConfirmations =
            groupBy(
                oRaw.confirmations || [],
                "OrderId"
            );

        var mAssignments =
            groupBy(
                oRaw.orderResources || [],
                "OrderId"
            );

        var aTableData = [];

        aOrders.forEach(function (oOrder) {
            var sOrderId = String(oOrder.OrderId || "");

            /*
             * Para filtros "Todos", una OT sin asignación sigue apareciendo.
             * Solo se excluye por zona/supervisor/turno cuando el usuario
             * realmente selecciona un valor concreto.
             */
            var oResource =
                getResourceInfo(
                    oOrder,
                    mAssignments,
                    aResourcesInPeriod
                );

            var bMatchesOrganization =
                matchesFilter(
                    oFilters.zona,
                    [
                        oResource.zonaId,
                        oResource.zona
                    ]
                ) &&
                matchesFilter(
                    oFilters.supervisor,
                    [
                        oResource.supervisorId,
                        oResource.supervisor
                    ]
                ) &&
                matchesFilter(
                    oFilters.turno,
                    [
                        oResource.turnoId,
                        oResource.turno
                    ]
                );

            var bMatchesType =
                matchesFilter(
                    oFilters.tipoOrden,
                    [
                        oOrder.OrderTypeCode,
                        oOrder.OrderTypeText
                    ]
                );

            var bMatchesStatus =
                matchesFilter(
                    oFilters.estado,
                    [
                        oOrder.SapUserStatusCode,
                        oOrder.AppStatusCode,
                        oOrder.StatusText
                    ]
                );

            var nHorasPlan;
            var nHorasReales;
            var nVariation;
            var nVariationPct;
            var oState;

            if (
                !bMatchesOrganization ||
                !bMatchesType ||
                !bMatchesStatus
            ) {
                return;
            }

            nHorasPlan =
                sumPlannedHours(
                    sOrderId,
                    mOperations
                );

            nHorasReales =
                sumActualHours(
                    sOrderId,
                    mConfirmations
                );

            nVariation =
                nHorasReales -
                nHorasPlan;

            nVariationPct =
                nHorasPlan > 0
                    ? (
                        nVariation /
                        nHorasPlan
                    ) * 100
                    : 0;

            oState =
                classifyVariation(
                    nVariation
                );

            aTableData.push({
                ot: sOrderId,

                cliente:
                    oOrder.CustomerName ||
                    oOrder.CustomerId ||
                    "Sin Cliente",

                elevador:
                    oOrder.EquipmentName ||
                    oOrder.EquipmentId ||
                    "Sin Equipo",

                tipoOrden:
                    oOrder.OrderTypeText ||
                    oOrder.OrderTypeCode ||
                    "Sin Tipo",

                estadoSAP:
                    oOrder.StatusText ||
                    oOrder.SapUserStatusCode ||
                    oOrder.AppStatusCode ||
                    "",

                responsable:
                    oResource.responsable,

                turno:
                    oResource.turno,

                horasPlan:
                    nHorasPlan.toFixed(1),

                horasReales:
                    nHorasReales.toFixed(1),

                variacionH:
                    (nVariation > 0 ? "+" : "") +
                    nVariation.toFixed(1),

                variacionPct:
                    (nVariationPct > 0 ? "+" : "") +
                    nVariationPct.toFixed(1) +
                    "%",

                estado:
                    oState.estado,

                colorClass:
                    oState.colorClass,

                statusDotClass:
                    oState.statusDotClass,

                _horasPlan:
                    nHorasPlan,

                _horasReales:
                    nHorasReales
            });
        });

        var nTotalPlan =
            aTableData.reduce(
                function (nTotal, oRow) {
                    return nTotal + oRow._horasPlan;
                },
                0
            );

        var nTotalReal =
            aTableData.reduce(
                function (nTotal, oRow) {
                    return nTotal + oRow._horasReales;
                },
                0
            );

        var aUniqueResources =
            uniqueBy(
                aSelectedResources,
                function (oResource) {
                    return (
                        oResource.ResourceDateId ||
                        [
                            oResource.ResourceId,
                            String(oResource.WorkDate || ""),
                            oResource.ShiftId
                        ].join("|")
                    );
                }
            );

        var aValidatedCapacity =
            aUniqueResources.filter(
                function (oResource) {
                    return isTrue(
                        oResource.CapacitySourceValidated
                    );
                }
            );

        var bCapacityAvailable =
            aValidatedCapacity.length > 0;

        var nTotalCapacity =
            bCapacityAvailable
                ? aValidatedCapacity.reduce(
                    function (nTotal, oResource) {
                        return (
                            nTotal +
                            (
                                parseFloat(
                                    oResource.CapacityHours
                                ) || 0
                            )
                        );
                    },
                    0
                )
                : 0;

        var nUtilization =
            bCapacityAvailable &&
            nTotalCapacity > 0
                ? (
                    nTotalReal /
                    nTotalCapacity
                ) * 100
                : null;

        var nUtilizationBar =
            nUtilization !== null &&
            Number.isFinite(nUtilization)
                ? Math.max(
                    0,
                    Math.min(
                        100,
                        nUtilization
                    )
                )
                : 0;

        var oZoneResource =
            aSelectedResources[0] || null;

        var sSelectedZone =
            isAll(oFilters.zona)
                ? "Todas"
                : (
                    oZoneResource &&
                    (
                        oZoneResource.ZoneName ||
                        oZoneResource.ZoneId
                    )
                ) ||
                String(
                    oFilters.zona ||
                    "Todas"
                );

        var oKpis = {
            zona:
                sSelectedZone,

            capacidadDisponible:
                bCapacityAvailable
                    ? nTotalCapacity.toFixed(1) + " h"
                    : "Sin datos",

            horasProgramadas:
                Number.isFinite(nTotalPlan)
                    ? nTotalPlan.toFixed(1) + " h"
                    : "0.0 h",

            horasReales:
                Number.isFinite(nTotalReal)
                    ? nTotalReal.toFixed(1) + " h"
                    : "0.0 h",

            utilizacion:
                nUtilization !== null &&
                Number.isFinite(nUtilization)
                    ? nUtilization.toFixed(1) + "%"
                    : "Sin datos",

            utilizacionValor:
                nUtilizationBar,

            utilizacionWidth:
                nUtilizationBar.toFixed(1) + "%",

            estado:
                nUtilization !== null &&
                Number.isFinite(nUtilization)
                    ? classifyUtilization(nUtilization)
                    : "Sin datos"
        };

        var aSummaryTurn =
            buildSummary(
                aTableData,
                "turno",
                "turno"
            );

        var aSummaryType =
            buildSummary(
                aTableData,
                "tipoOrden",
                "tipoOrden"
            );

        var aPublicRows =
            aTableData.map(function (oRow) {
                var oCopy =
                    Object.assign(
                        {},
                        oRow
                    );

                delete oCopy._horasPlan;
                delete oCopy._horasReales;

                return oCopy;
            });

        console.log(
            "[MAPPER] Resultado final:",
            {
                filtros: oFilters,
                recursosPeriodo: aResourcesInPeriod.length,
                recursosSeleccionados: aSelectedResources.length,
                ordenesResultado: aPublicRows.length,
                capacidad: nTotalCapacity,
                horasPlan: nTotalPlan,
                horasReal: nTotalReal,
                utilizacion: nUtilization
            }
        );

        return {
            filters:
                oFilters,

            catalogos:
                buildCatalogs(
                    oRaw,
                    oFilters,
                    aOrders,
                    aResourcesInPeriod
                ),

            kpis:
                oKpis,

            ordenes:
                aPublicRows,

            resumenTurno:
                aSummaryTurn,

            resumenTipoOrden:
                aSummaryType,

            footerText:
                "Mostrando " +
                aPublicRows.length +
                " resultados"
        };
    }

    return {
        mapData: mapData,
        toHours: toHours
    };
});