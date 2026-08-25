sap.ui.define([], function () {
    "use strict";

    /*
     * Reglas provisionales centralizadas.
     *
     * La EF no define todavía tolerancia mínima ni umbrales visuales
     * definitivos. Se dejan aislados aquí para que después solo se
     * modifique esta sección o se sustituyan por valores de catálogo.
     */
    var DEFAULT_DEVIATION_TOLERANCE_HOURS = 0;
    var DEFAULT_NEAR_PLAN_PCT = 10;
    var DEFAULT_OVERLOAD_PCT = 20;

    function normalize(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toUpperCase();
    }

    function isAll(vValue) {
        return [
            "",
            "TODOS",
            "TODAS",
            "ALL"
        ].indexOf(
            normalize(vValue)
        ) >= 0;
    }

    function isTrue(vValue) {
        var sValue =
            normalize(vValue);

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

        aMatch =
            String(vValue).match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        if (aMatch) {
            return new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        }

        oDate = new Date(vValue);

        return Number.isNaN(
            oDate.getTime()
        )
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
            oDate =
                new Date(
                    vValue.getTime()
                );
        } else {
            aMatch =
                String(vValue).match(
                    /\/Date\((-?\d+)/
                );

            oDate = aMatch
                ? new Date(
                    Number(aMatch[1])
                )
                : new Date(vValue);
        }

        if (
            Number.isNaN(
                oDate.getTime()
            )
        ) {
            return null;
        }

        /*
         * Conserva la fecha calendario de un Edm.DateTime a medianoche.
         */
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

    function dateOnly(oDate) {
        if (!(oDate instanceof Date)) {
            return null;
        }

        return new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate()
        );
    }

    function isDateInRange(
        vDate,
        oStart,
        oEnd
    ) {
        var oDate =
            dateOnly(
                parseODataDate(
                    vDate
                )
            );

        if (!oDate) {
            return false;
        }

        if (
            oStart &&
            oDate < dateOnly(oStart)
        ) {
            return false;
        }

        if (
            oEnd &&
            oDate > dateOnly(oEnd)
        ) {
            return false;
        }

        return true;
    }

    function toHours(
        vValue,
        sUnit
    ) {
        var nValue =
            parseFloat(vValue);

        var sNormalizedUnit =
            normalize(sUnit);

        if (
            Number.isNaN(nValue)
        ) {
            return null;
        }

        switch (
            sNormalizedUnit
        ) {
        case "H":
        case "HR":
        case "HRS":
        case "HRA":
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
                "[DDH MAPPER] Unidad no homologada:",
                sUnit,
                "valor:",
                vValue
            );

            return null;
        }
    }

    function uniqueBy(
        aItems,
        fnKey
    ) {
        var mSeen =
            Object.create(null);

        return (aItems || [])
            .filter(function (oItem) {
                var sKey =
                    String(
                        fnKey(oItem) || ""
                    );

                if (
                    !sKey ||
                    mSeen[sKey]
                ) {
                    return false;
                }

                mSeen[sKey] = true;
                return true;
            });
    }

    function groupBy(
        aItems,
        fnKey
    ) {
        var mResult =
            Object.create(null);

        (aItems || [])
            .forEach(function (oItem) {
                var sKey =
                    String(
                        typeof fnKey === "function"
                            ? fnKey(oItem)
                            : oItem &&
                              oItem[fnKey] ||
                              ""
                    );

                if (!sKey) {
                    return;
                }

                if (!mResult[sKey]) {
                    mResult[sKey] = [];
                }

                mResult[sKey].push(
                    oItem
                );
            });

        return mResult;
    }

    function matchesFilter(
        vFilter,
        aValues
    ) {
        var sFilter;

        if (isAll(vFilter)) {
            return true;
        }

        sFilter =
            normalize(vFilter);

        return (aValues || [])
            .some(function (vValue) {
                return (
                    normalize(vValue) ===
                    sFilter
                );
            });
    }

    function findCatalogRecord(
        aCatalogs,
        aDomains
    ) {
        var aNormalized =
            aDomains.map(normalize);

        return (aCatalogs || [])
            .find(function (oItem) {
                return (
                    (
                        oItem.Active === undefined ||
                        oItem.Active === null ||
                        isTrue(oItem.Active)
                    ) &&
                    aNormalized.indexOf(
                        normalize(
                            oItem.FilterDomain
                        )
                    ) >= 0
                );
            }) || null;
    }

    function getPreferredPlannedSource(
        aCatalogs
    ) {
        var oRecord =
            findCatalogRecord(
                aCatalogs,
                [
                    "PLANNED_SOURCE",
                    "PLAN_SOURCE",
                    "PLANNED_SOURCE_CODE",
                    "HOURS_PLAN_SOURCE"
                ]
            );

        return oRecord
            ? String(
                oRecord.ValueId ||
                oRecord.ValueText ||
                ""
            )
            : "";
    }

    function getDeviationTolerance(
        aCatalogs
    ) {
        var oRecord =
            findCatalogRecord(
                aCatalogs,
                [
                    "DEVIATION_TOLERANCE",
                    "HOUR_DEVIATION_TOLERANCE",
                    "DEVIATION_THRESHOLD"
                ]
            );

        var nValue =
            oRecord
                ? parseFloat(
                    oRecord.NumericValue
                )
                : NaN;

        if (
            oRecord &&
            Number.isFinite(nValue)
        ) {
            return {
                configured: true,
                value:
                    Math.abs(nValue),
                unit:
                    normalize(
                        oRecord.UnitCode ||
                        "H"
                    )
            };
        }

        return {
            configured: false,
            value:
                DEFAULT_DEVIATION_TOLERANCE_HOURS,
            unit:
                "H"
        };
    }

    function getStatusThresholds(
        aCatalogs
    ) {
        var oNear =
            findCatalogRecord(
                aCatalogs,
                [
                    "DEVIATION_NEAR_PCT",
                    "NEAR_PLAN_PCT"
                ]
            );

        var oOverload =
            findCatalogRecord(
                aCatalogs,
                [
                    "DEVIATION_OVERLOAD_PCT",
                    "OVERLOAD_PCT"
                ]
            );

        var nNear =
            oNear
                ? parseFloat(
                    oNear.NumericValue
                )
                : NaN;

        var nOverload =
            oOverload
                ? parseFloat(
                    oOverload.NumericValue
                )
                : NaN;

        return {
            configured:
                Number.isFinite(nNear) &&
                Number.isFinite(nOverload),

            nearPct:
                Number.isFinite(nNear)
                    ? Math.abs(nNear)
                    : DEFAULT_NEAR_PLAN_PCT,

            overloadPct:
                Number.isFinite(nOverload)
                    ? Math.abs(nOverload)
                    : DEFAULT_OVERLOAD_PCT
        };
    }

    function buildOperationIdentity(
        oOperation
    ) {
        return [
            oOperation.RoutingNumber ||
            "",
            oOperation.OperationCounter ||
            "",
            oOperation.OperationNumber ||
            "",
            oOperation.OperationKey ||
            ""
        ].join("|");
    }

    function aggregatePlan(
        aOrderOperations,
        sPreferredSource
    ) {
        var aOperations =
            aOrderOperations || [];

        var mByOperation;
        var nTotal = 0;
        var bAvailable = true;
        var bAmbiguous = false;

        if (!aOperations.length) {
            return {
                available: false,
                ambiguous: false,
                hours: null
            };
        }

        mByOperation =
            groupBy(
                aOperations,
                buildOperationIdentity
            );

        Object.keys(mByOperation)
            .forEach(function (sOperationKey) {
                var aRows =
                    mByOperation[
                        sOperationKey
                    ];

                var aSourceCodes =
                    Array.from(
                        new Set(
                            aRows
                                .map(function (oRow) {
                                    return normalize(
                                        oRow.PlannedSourceCode
                                    );
                                })
                                .filter(Boolean)
                        )
                    );

                var aSelectedRows =
                    aRows;

                var nOperationHours = 0;

                if (sPreferredSource) {
                    aSelectedRows =
                        aRows.filter(
                            function (oRow) {
                                return (
                                    normalize(
                                        oRow.PlannedSourceCode
                                    ) ===
                                    normalize(
                                        sPreferredSource
                                    )
                                );
                            }
                        );

                    /*
                     * Si la fuente configurada no aparece pero solo existe
                     * una fuente en la operación, se permite utilizarla.
                     */
                    if (
                        !aSelectedRows.length &&
                        aSourceCodes.length <= 1
                    ) {
                        aSelectedRows =
                            aRows;
                    }
                } else if (
                    aSourceCodes.length > 1
                ) {
                    /*
                     * AFVV y KBED no deben sumarse.
                     * Sin fuente aprobada y con más de una fuente presente,
                     * se marca el plan como ambiguo en vez de inventarlo.
                     */
                    bAvailable = false;
                    bAmbiguous = true;
                    return;
                }

                if (!aSelectedRows.length) {
                    bAvailable = false;
                    return;
                }

                aSelectedRows
                    .forEach(function (oRow) {
                        var nHours =
                            toHours(
                                oRow.PlannedValueOriginal,
                                oRow.PlannedUnitOriginal
                            );

                        if (nHours === null) {
                            bAvailable = false;
                            return;
                        }

                        nOperationHours +=
                            nHours;
                    });

                nTotal +=
                    nOperationHours;
            });

        return {
            available:
                bAvailable,
            ambiguous:
                bAmbiguous,
            hours:
                bAvailable
                    ? nTotal
                    : null
        };
    }

    function aggregateActual(
        aOrderConfirmations,
        bGlobalConfirmationData
    ) {
        var aConfirmations =
            aOrderConfirmations || [];

        var nTotal = 0;
        var bAvailable =
            bGlobalConfirmationData;

        if (!bGlobalConfirmationData) {
            return {
                available: false,
                hours: null
            };
        }

        aConfirmations
            .filter(function (oConfirmation) {
                return isTrue(
                    oConfirmation.IncludedInCalculation
                );
            })
            .forEach(function (oConfirmation) {
                var nHours =
                    toHours(
                        oConfirmation.ActualValueOriginal,
                        oConfirmation.ActualUnitOriginal
                    );

                if (nHours === null) {
                    bAvailable = false;
                    return;
                }

                nTotal += nHours;
            });

        return {
            available:
                bAvailable,
            hours:
                bAvailable
                    ? nTotal
                    : null
        };
    }

    function assignmentPriority(
        oAssignment
    ) {
        var sType =
            normalize(
                oAssignment &&
                oAssignment.AssignmentTypeCode
            );

        var sRole =
            normalize(
                oAssignment &&
                oAssignment.RoleCode
            );

        var iPriority = 0;

        if (sType === "PLANNED") {
            iPriority += 100;
        } else if (
            sType === "EXECUTOR"
        ) {
            iPriority += 50;
        }

        if (
            sRole === "MECHANIC" ||
            sRole === "TECHNICIAN"
        ) {
            iPriority += 40;
        }

        if (
            oAssignment &&
            !oAssignment.ValidTo
        ) {
            iPriority += 10;
        }

        return iPriority;
    }

    function chooseAssignment(
        aAssignments
    ) {
        var aSorted =
            (aAssignments || [])
                .slice();

        aSorted.sort(
            function (a, b) {
                return (
                    assignmentPriority(b) -
                    assignmentPriority(a)
                );
            }
        );

        return aSorted[0] || null;
    }

    function sameCalendarDate(
        oDateA,
        oDateB
    ) {
        return Boolean(
            oDateA &&
            oDateB &&
            oDateA.getFullYear() ===
                oDateB.getFullYear() &&
            oDateA.getMonth() ===
                oDateB.getMonth() &&
            oDateA.getDate() ===
                oDateB.getDate()
        );
    }

    function chooseResourceRow(
        sResourceId,
        aResources,
        oOrder
    ) {
        var aRows =
            (aResources || [])
                .filter(function (oResource) {
                    return (
                        String(
                            oResource.ResourceId ||
                            ""
                        ) ===
                        String(
                            sResourceId ||
                            ""
                        )
                    );
                });

        var oOrderDate =
            parseODataDate(
                oOrder.PlannedStartDate ||
                oOrder.PlannedFinishDate
            );

        var oExact;

        if (!aRows.length) {
            return null;
        }

        if (!oOrderDate) {
            return aRows[0];
        }

        /*
         * Prioriza registro exacto del día de la OT.
         */
        oExact =
            aRows.find(function (oResource) {
                return sameCalendarDate(
                    parseODataDate(
                        oResource.WorkDate
                    ),
                    oOrderDate
                );
            });

        if (oExact) {
            return oExact;
        }

        /*
         * Si no existe registro exacto, toma el más cercano.
         */
        aRows.sort(
            function (a, b) {
                var oDateA =
                    parseODataDate(
                        a.WorkDate
                    );

                var oDateB =
                    parseODataDate(
                        b.WorkDate
                    );

                var nDiffA =
                    oDateA
                        ? Math.abs(
                            oDateA.getTime() -
                            oOrderDate.getTime()
                        )
                        : Number.MAX_VALUE;

                var nDiffB =
                    oDateB
                        ? Math.abs(
                            oDateB.getTime() -
                            oOrderDate.getTime()
                        )
                        : Number.MAX_VALUE;

                return nDiffA -
                    nDiffB;
            }
        );

        return aRows[0];
    }

    function getOrganizationInfo(
        oOrder,
        mOrderResources,
        aResources
    ) {
        var sOrderId =
            String(
                oOrder.OrderId ||
                ""
            );

        var oAssignment =
            chooseAssignment(
                mOrderResources[
                    sOrderId
                ] || []
            );

        var oResource;

        if (!oAssignment) {
            return {
                responsable:
                    "Sin datos",
                resourceId:
                    "",
                zonaId:
                    "",
                zona:
                    "Sin datos",
                supervisorId:
                    "",
                supervisor:
                    "Sin datos",
                turnoId:
                    "",
                turno:
                    "Sin datos",
                turnoValidado:
                    false
            };
        }

        oResource =
            chooseResourceRow(
                oAssignment.ResourceId,
                aResources,
                oOrder
            );

        if (!oResource) {
            return {
                responsable:
                    oAssignment.PersonnelNumber ||
                    "Sin datos",

                resourceId:
                    oAssignment.ResourceId ||
                    "",

                zonaId:
                    "",
                zona:
                    "Sin datos",

                supervisorId:
                    "",
                supervisor:
                    "Sin datos",

                turnoId:
                    "",
                turno:
                    "Sin datos",

                turnoValidado:
                    false
            };
        }

        return {
            responsable:
                oResource.ResourceName ||
                oAssignment.PersonnelNumber ||
                oResource.ResourceId ||
                "Sin datos",

            resourceId:
                oResource.ResourceId ||
                oAssignment.ResourceId ||
                "",

            zonaId:
                oResource.ZoneId ||
                "",

            zona:
                oResource.ZoneName ||
                oResource.ZoneId ||
                "Sin datos",

            supervisorId:
                oResource.SupervisorId ||
                "",

            supervisor:
                oResource.SupervisorName ||
                oResource.SupervisorId ||
                "Sin datos",

            turnoId:
                isTrue(
                    oResource.ShiftSourceValidated
                )
                    ? (
                        oResource.ShiftId ||
                        ""
                    )
                    : "",

            turno:
                isTrue(
                    oResource.ShiftSourceValidated
                )
                    ? (
                        oResource.ShiftName ||
                        oResource.ShiftId ||
                        "Sin datos"
                    )
                    : "Sin datos",

            turnoValidado:
                isTrue(
                    oResource.ShiftSourceValidated
                )
        };
    }

    function hasDeviation(
        nVariationHours,
        nVariationPct,
        oTolerance
    ) {
        if (
            !Number.isFinite(
                nVariationHours
            )
        ) {
            return false;
        }

        if (
            oTolerance &&
            oTolerance.unit === "PCT"
        ) {
            return (
                Math.abs(
                    nVariationPct || 0
                ) >
                oTolerance.value
            );
        }

        return (
            Math.abs(
                nVariationHours
            ) >
            (
                oTolerance
                    ? oTolerance.value
                    : DEFAULT_DEVIATION_TOLERANCE_HOURS
            )
        );
    }

    function classifyStatus(
        nVariationPct,
        oThresholds
    ) {
        var nAbsPct;

        if (
            !Number.isFinite(
                nVariationPct
            )
        ) {
            return {
                estado:
                    "Sin datos",
                colorClass:
                    "ddhDarkStrong",
                statusDotClass:
                    ""
            };
        }

        nAbsPct =
            Math.abs(
                nVariationPct
            );

        /*
         * Si después ABAP/catálogo entrega umbrales, se tomarán.
         * Mientras tanto se usan valores provisionales centralizados.
         */
        if (
            nAbsPct >=
            oThresholds.overloadPct
        ) {
            return {
                estado:
                    "Sobrecargado",
                colorClass:
                    "ddhRedStrong",
                statusDotClass:
                    "ddhDotRed"
            };
        }

        if (
            nAbsPct >
            oThresholds.nearPct
        ) {
            return {
                estado:
                    "Cerca de plan",
                colorClass:
                    "ddhRedStrong",
                statusDotClass:
                    "ddhDotOrange"
            };
        }

        return {
            estado:
                "Dentro de plan",
            colorClass:
                "ddhGreenStrong",
            statusDotClass:
                "ddhDotGreen"
        };
    }

    function formatNumber(
        nValue,
        iDecimals
    ) {
        if (
            !Number.isFinite(nValue)
        ) {
            return "Sin datos";
        }

        return Number(nValue)
            .toLocaleString(
                "en-US",
                {
                    minimumFractionDigits:
                        iDecimals,
                    maximumFractionDigits:
                        iDecimals
                }
            );
    }

    function formatSignedNumber(
        nValue,
        iDecimals
    ) {
        if (
            !Number.isFinite(nValue)
        ) {
            return "—";
        }

        return (
            nValue > 0
                ? "+"
                : ""
        ) +
        formatNumber(
            nValue,
            iDecimals
        );
    }

    function formatSignedPct(
        nValue
    ) {
        if (
            !Number.isFinite(nValue)
        ) {
            return "—";
        }

        return (
            nValue > 0
                ? "+"
                : ""
        ) +
        formatNumber(
            nValue,
            1
        ) +
        "%";
    }

    function getCatalogValues(
        aCatalogs,
        aDomains
    ) {
        var aNormalizedDomains =
            aDomains.map(normalize);

        return (aCatalogs || [])
            .filter(function (oItem) {
                return (
                    (
                        oItem.Active === undefined ||
                        oItem.Active === null ||
                        isTrue(oItem.Active)
                    ) &&
                    aNormalizedDomains
                        .indexOf(
                            normalize(
                                oItem.FilterDomain
                            )
                        ) >= 0
                );
            })
            .map(function (oItem) {
                return {
                    key:
                        String(
                            oItem.ValueId ||
                            oItem.ValueText ||
                            ""
                        ),

                    text:
                        String(
                            oItem.ValueText ||
                            oItem.ValueId ||
                            ""
                        )
                };
            });
    }

    function createUniqueCatalog(
        aValues,
        sAllKey,
        sAllText
    ) {
        var mSeen =
            Object.create(null);

        var aResult = [
            {
                key:
                    sAllKey,
                text:
                    sAllText
            }
        ];

        (aValues || [])
            .forEach(function (oItem) {
                var sKey =
                    String(
                        oItem.key ||
                        ""
                    );

                var sText =
                    String(
                        oItem.text ||
                        sKey
                    );

                var sNormalized =
                    normalize(sKey);

                if (
                    !sKey ||
                    mSeen[
                        sNormalized
                    ]
                ) {
                    return;
                }

                mSeen[
                    sNormalized
                ] = true;

                aResult.push({
                    key:
                        sKey,
                    text:
                        sText
                });
            });

        return aResult;
    }

    function buildYearCatalog(
        mFilters
    ) {
        var iCurrentYear =
            new Date().getFullYear();

        var iSelectedYear =
            Number(
                mFilters.periodo
            ) ||
            (
                parseInputDate(
                    mFilters.fechaDesde
                ) ||
                new Date()
            ).getFullYear();

        var iStartYear =
            Math.min(
                iCurrentYear - 5,
                iSelectedYear - 2
            );

        var iEndYear =
            Math.max(
                iCurrentYear + 1,
                iSelectedYear + 2
            );

        var aYears = [];
        var iYear;

        for (
            iYear = iEndYear;
            iYear >= iStartYear;
            iYear--
        ) {
            aYears.push({
                key:
                    String(iYear),
                text:
                    String(iYear)
            });
        }

        return aYears;
    }

    function buildCatalogs(
        oRaw,
        mFilters,
        aOrders,
        aResources
    ) {
        var aZones =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "ZONE",
                    "ZONA"
                ]
            );

        var aSupervisors =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "SUPERVISOR"
                ]
            );

        var aShifts =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "SHIFT",
                    "TURNO"
                ]
            );

        var aTypes =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "ORDER_TYPE",
                    "ORDERTYPE",
                    "TIPO_ORDEN"
                ]
            );

        var aStatuses =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "STATUS",
                    "ORDER_STATUS",
                    "ESTADO_ORDEN"
                ]
            );

        if (!aZones.length) {
            aZones =
                aResources.map(
                    function (oResource) {
                        return {
                            key:
                                oResource.ZoneId ||
                                oResource.ZoneName,

                            text:
                                oResource.ZoneName ||
                                oResource.ZoneId
                        };
                    }
                );
        }

        if (!aSupervisors.length) {
            aSupervisors =
                aResources.map(
                    function (oResource) {
                        return {
                            key:
                                oResource.SupervisorId ||
                                oResource.SupervisorName,

                            text:
                                oResource.SupervisorName ||
                                oResource.SupervisorId
                        };
                    }
                );
        }

        if (!aShifts.length) {
            aShifts =
                aResources
                    .filter(
                        function (oResource) {
                            return isTrue(
                                oResource.ShiftSourceValidated
                            );
                        }
                    )
                    .map(
                        function (oResource) {
                            return {
                                key:
                                    oResource.ShiftId ||
                                    oResource.ShiftName,

                                text:
                                    oResource.ShiftName ||
                                    oResource.ShiftId
                            };
                        }
                    );
        }

        if (!aTypes.length) {
            aTypes =
                aOrders.map(
                    function (oOrder) {
                        return {
                            key:
                                oOrder.OrderTypeCode ||
                                oOrder.OrderTypeText,

                            text:
                                oOrder.OrderTypeText ||
                                oOrder.OrderTypeCode
                        };
                    }
                );
        }

        if (!aStatuses.length) {
            aStatuses =
                aOrders.map(
                    function (oOrder) {
                        return {
                            key:
                                oOrder.AppStatusCode ||
                                oOrder.SapUserStatusCode ||
                                oOrder.StatusText,

                            text:
                                oOrder.StatusText ||
                                oOrder.AppStatusCode ||
                                oOrder.SapUserStatusCode
                        };
                    }
                );
        }

        return {
            periodos:
                buildYearCatalog(
                    mFilters
                ),

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

            estadosOrden:
                createUniqueCatalog(
                    aStatuses,
                    "Todos",
                    "Todos"
                )
        };
    }

    function buildSummary(
        aRows,
        sProperty,
        sOutputProperty,
        oThresholds
    ) {
        var mGroups =
            Object.create(null);

        aRows.forEach(
            function (oRow) {
                var sKey =
                    oRow[
                        sProperty
                    ] ||
                    "Sin datos";

                if (!mGroups[sKey]) {
                    mGroups[sKey] = {
                        orders:
                            Object.create(
                                null
                            ),
                        plan:
                            0,
                        real:
                            0
                    };
                }

                mGroups[sKey]
                    .orders[
                        oRow.ot
                    ] = true;

                mGroups[sKey].plan +=
                    oRow._horasPlan;

                mGroups[sKey].real +=
                    oRow._horasReales;
            }
        );

        return Object.keys(
            mGroups
        ).map(
            function (sKey) {
                var oGroup =
                    mGroups[sKey];

                var nVariation =
                    oGroup.real -
                    oGroup.plan;

                var nPct =
                    oGroup.plan !== 0
                        ? (
                            nVariation /
                            oGroup.plan
                        ) * 100
                        : 0;

                var oStatus =
                    classifyStatus(
                        nPct,
                        oThresholds
                    );

                var oResult = {
                    ot:
                        String(
                            Object.keys(
                                oGroup.orders
                            ).length
                        ),

                    horasPlan:
                        formatNumber(
                            oGroup.plan,
                            1
                        ),

                    horasReales:
                        formatNumber(
                            oGroup.real,
                            1
                        ),

                    variacionH:
                        formatSignedNumber(
                            nVariation,
                            1
                        ),

                    variacionPct:
                        formatSignedPct(
                            nPct
                        ),

                    estado:
                        oStatus.estado,

                    colorClass:
                        oStatus.colorClass,

                    statusDotClass:
                        oStatus.statusDotClass
                };

                oResult[
                    sOutputProperty
                ] = sKey;

                return oResult;
            }
        );
    }

    function buildEmptyTotals() {
        return {
            ot:
                "Sin datos",
            horasPlan:
                "Sin datos",
            horasReales:
                "Sin datos",
            variacionH:
                "—",
            variacionPct:
                "—",
            estado:
                "Sin datos"
        };
    }

    function mapData(
        oRawData,
        mFilters
    ) {
        var oRaw =
            oRawData || {};

        var oFilters =
            Object.assign(
                {
                    periodo:
                        String(
                            new Date()
                                .getFullYear()
                        ),

                    fechaDesde:
                        "",

                    fechaHasta:
                        "",

                    zona:
                        "Todos",

                    supervisor:
                        "Todos",

                    turno:
                        "Todos",

                    tipoOrden:
                        "Todos",

                    estado:
                        "Todos"
                },
                mFilters || {}
            );

        var oStartDate =
            parseInputDate(
                oFilters.fechaDesde
            );

        var oEndDate =
            parseInputDate(
                oFilters.fechaHasta
            );

        var aOrders =
            uniqueBy(
                oRaw.orders || [],
                function (oOrder) {
                    return oOrder.OrderId;
                }
            );

        var aResourcesInPeriod =
            (oRaw.resources || [])
                .filter(
                    function (oResource) {
                        return isDateInRange(
                            oResource.WorkDate,
                            oStartDate,
                            oEndDate
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

        var mOrderResources =
            groupBy(
                oRaw.orderResources || [],
                "OrderId"
            );

        var sPreferredPlanSource =
            getPreferredPlannedSource(
                oRaw.catalogs || []
            );

        var oTolerance =
            getDeviationTolerance(
                oRaw.catalogs || []
            );

        var oThresholds =
            getStatusThresholds(
                oRaw.catalogs || []
            );

        var bGlobalPlanData =
            (oRaw.operations || [])
                .length > 0;

        var bGlobalActualData =
            (oRaw.confirmations || [])
                .length > 0;

        var aAllFilteredRows = [];
        var aDeviationRows = [];

        aOrders.forEach(
            function (oOrder) {
                var sOrderId =
                    String(
                        oOrder.OrderId ||
                        ""
                    );

                var oOrganization =
                    getOrganizationInfo(
                        oOrder,
                        mOrderResources,
                        aResourcesInPeriod
                    );

                var bMatchesOrganization =
                    matchesFilter(
                        oFilters.zona,
                        [
                            oOrganization.zonaId,
                            oOrganization.zona
                        ]
                    ) &&
                    matchesFilter(
                        oFilters.supervisor,
                        [
                            oOrganization.supervisorId,
                            oOrganization.supervisor
                        ]
                    ) &&
                    matchesFilter(
                        oFilters.turno,
                        [
                            oOrganization.turnoId,
                            oOrganization.turno
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

                var bMatchesOrderStatus =
                    matchesFilter(
                        oFilters.estado,
                        [
                            oOrder.AppStatusCode,
                            oOrder.SapUserStatusCode,
                            oOrder.StatusText
                        ]
                    );

                var oPlan;
                var oActual;
                var bHoursAvailable;
                var nVariationHours = null;
                var nVariationPct = null;
                var bDeviation = false;
                var oStatus;
                var oRow;

                if (
                    !bMatchesOrganization ||
                    !bMatchesType ||
                    !bMatchesOrderStatus
                ) {
                    return;
                }

                oPlan =
                    bGlobalPlanData
                        ? aggregatePlan(
                            mOperations[
                                sOrderId
                            ] || [],
                            sPreferredPlanSource
                        )
                        : {
                            available:
                                false,
                            ambiguous:
                                false,
                            hours:
                                null
                        };

                oActual =
                    aggregateActual(
                        mConfirmations[
                            sOrderId
                        ] || [],
                        bGlobalActualData
                    );

                bHoursAvailable =
                    oPlan.available &&
                    oActual.available;

                if (bHoursAvailable) {
                    nVariationHours =
                        oActual.hours -
                        oPlan.hours;

                    nVariationPct =
                        oPlan.hours !== 0
                            ? (
                                nVariationHours /
                                oPlan.hours
                            ) * 100
                            : 0;

                    bDeviation =
                        hasDeviation(
                            nVariationHours,
                            nVariationPct,
                            oTolerance
                        );
                }

                oStatus =
                    bHoursAvailable
                        ? classifyStatus(
                            nVariationPct,
                            oThresholds
                        )
                        : {
                            estado:
                                "Sin datos",
                            colorClass:
                                "ddhDarkStrong",
                            statusDotClass:
                                ""
                        };

                oRow = {
                    ot:
                        sOrderId,

                    cliente:
                        oOrder.CustomerName ||
                        oOrder.CustomerId ||
                        "Sin datos",

                    elevador:
                        oOrder.EquipmentName ||
                        oOrder.EquipmentId ||
                        "Sin datos",

                    zona:
                        oOrganization.zona,

                    tipoOrden:
                        oOrder.OrderTypeText ||
                        oOrder.OrderTypeCode ||
                        "Sin datos",

                    responsable:
                        oOrganization.responsable,

                    turno:
                        oOrganization.turno,

                    horasPlan:
                        oPlan.available
                            ? formatNumber(
                                oPlan.hours,
                                1
                            )
                            : "Sin datos",

                    horasReales:
                        oActual.available
                            ? formatNumber(
                                oActual.hours,
                                1
                            )
                            : "Sin datos",

                    variacionH:
                        bHoursAvailable
                            ? formatSignedNumber(
                                nVariationHours,
                                1
                            )
                            : "—",

                    variacionPct:
                        bHoursAvailable
                            ? formatSignedPct(
                                nVariationPct
                            )
                            : "—",

                    estado:
                        oStatus.estado,

                    colorClass:
                        oStatus.colorClass,

                    statusDotClass:
                        oStatus.statusDotClass,

                    planAmbiguo:
                        Boolean(
                            oPlan.ambiguous
                        ),

                    _horasPlan:
                        oPlan.hours,

                    _horasReales:
                        oActual.hours,

                    _variacionH:
                        nVariationHours,

                    _variacionPct:
                        nVariationPct,

                    _horasDisponibles:
                        bHoursAvailable,

                    _conDesviacion:
                        bDeviation
                };

                aAllFilteredRows.push(
                    oRow
                );

                if (
                    bHoursAvailable &&
                    bDeviation
                ) {
                    aDeviationRows.push(
                        oRow
                    );
                }
            }
        );

        /*
         * Mientras Operations o Confirmations sigan vacíos,
         * se muestran las órdenes base con "Sin datos".
         *
         * En cuanto ambos EntitySets tengan información,
         * la pantalla cambia automáticamente a mostrar solo las
         * órdenes que cumplen la regla de desviación.
         */
        var aDisplayRows =
            bGlobalPlanData &&
            bGlobalActualData
                ? aDeviationRows
                : aAllFilteredRows;

        var bTotalsAvailable =
            bGlobalPlanData &&
            bGlobalActualData;

        var oTotals =
            buildEmptyTotals();

        var oKpis = {
            otDesviacion:
                "Sin datos",

            horasPlanificadas:
                "Sin datos",

            horasReales:
                "Sin datos",

            desviacionTotal:
                "Sin datos",

            desviacionPromedio:
                "Sin datos"
        };

        var aSummaryZona = [];
        var aSummaryTurno = [];
        var aSummaryTipo = [];

        if (bTotalsAvailable) {
            var nTotalPlan =
                aDeviationRows.reduce(
                    function (
                        nTotal,
                        oRow
                    ) {
                        return (
                            nTotal +
                            oRow._horasPlan
                        );
                    },
                    0
                );

            var nTotalReal =
                aDeviationRows.reduce(
                    function (
                        nTotal,
                        oRow
                    ) {
                        return (
                            nTotal +
                            oRow._horasReales
                        );
                    },
                    0
                );

            var nTotalVariation =
                nTotalReal -
                nTotalPlan;

            var nTotalPct =
                nTotalPlan !== 0
                    ? (
                        nTotalVariation /
                        nTotalPlan
                    ) * 100
                    : 0;

            var oTotalStatus =
                classifyStatus(
                    nTotalPct,
                    oThresholds
                );

            oKpis = {
                otDesviacion:
                    String(
                        aDeviationRows.length
                    ),

                horasPlanificadas:
                    formatNumber(
                        nTotalPlan,
                        1
                    ) +
                    " h",

                horasReales:
                    formatNumber(
                        nTotalReal,
                        1
                    ) +
                    " h",

                desviacionTotal:
                    formatSignedNumber(
                        nTotalVariation,
                        1
                    ) +
                    " h",

                desviacionPromedio:
                    formatSignedPct(
                        nTotalPct
                    )
            };

            oTotals = {
                ot:
                    String(
                        aDeviationRows.length
                    ),

                horasPlan:
                    formatNumber(
                        nTotalPlan,
                        1
                    ),

                horasReales:
                    formatNumber(
                        nTotalReal,
                        1
                    ),

                variacionH:
                    formatSignedNumber(
                        nTotalVariation,
                        1
                    ),

                variacionPct:
                    formatSignedPct(
                        nTotalPct
                    ),

                estado:
                    oTotalStatus.estado
            };

            aSummaryZona =
                buildSummary(
                    aDeviationRows,
                    "zona",
                    "zona",
                    oThresholds
                );

            aSummaryTurno =
                buildSummary(
                    aDeviationRows,
                    "turno",
                    "turno",
                    oThresholds
                );

            aSummaryTipo =
                buildSummary(
                    aDeviationRows,
                    "tipoOrden",
                    "tipoOrden",
                    oThresholds
                );
        }

        var aPublicRows =
            aDisplayRows.map(
                function (oRow) {
                    var oCopy =
                        Object.assign(
                            {},
                            oRow
                        );

                    delete oCopy._horasPlan;
                    delete oCopy._horasReales;
                    delete oCopy._variacionH;
                    delete oCopy._variacionPct;
                    delete oCopy._horasDisponibles;
                    delete oCopy._conDesviacion;

                    return oCopy;
                }
            );

        console.log(
            "[DDH MAPPER] Resultado:",
            {
                filtros:
                    oFilters,

                orders:
                    aOrders.length,

                operations:
                    (oRaw.operations || [])
                        .length,

                confirmations:
                    (oRaw.confirmations || [])
                        .length,

                orderResources:
                    (oRaw.orderResources || [])
                        .length,

                resourcesPeriodo:
                    aResourcesInPeriod.length,

                filasMostradas:
                    aPublicRows.length,

                filasConDesviacion:
                    aDeviationRows.length,

                fuentePlanPreferida:
                    sPreferredPlanSource ||
                    "No configurada",

                tolerancia:
                    oTolerance,

                umbralesEstado:
                    oThresholds
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

            totales:
                oTotals,

            ordenes:
                aPublicRows,

            resumenZona:
                aSummaryZona,

            resumenTurno:
                aSummaryTurno,

            resumenTipoOrden:
                aSummaryTipo,

            footerText:
                "Mostrando " +
                aPublicRows.length +
                " resultados",

            meta: {
                planDisponible:
                    bGlobalPlanData,

                realDisponible:
                    bGlobalActualData,

                asignacionesDisponibles:
                    (oRaw.orderResources || [])
                        .length > 0,

                fuentePlanPreferida:
                    sPreferredPlanSource ||
                    "",

                toleranciaConfigurada:
                    oTolerance.configured,

                umbralesConfigurados:
                    oThresholds.configured
            }
        };
    }

    return {
        mapData:
            mapData,

        toHours:
            toHours
    };
});
