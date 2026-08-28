sap.ui.define([], function () {
    "use strict";

    var DEFAULT_OPEN_STATUS = [
        "0100",
        "0200",
        "0400",
        "0500"
    ];

    function norm(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
    }

    function isTrue(vValue) {
        return (
            vValue === true ||
            [
                "TRUE",
                "X",
                "1"
            ].indexOf(
                norm(vValue)
            ) >= 0
        );
    }

    function isAll(vValue) {
        return (
            [
                "",
                "ALL",
                "TODAS",
                "TODOS"
            ].indexOf(
                norm(vValue)
            ) >= 0
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

        oDate =
            new Date(vValue);

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

        if (
            vValue instanceof Date
        ) {
            return new Date(
                vValue.getTime()
            );
        }

        aMatch =
            String(vValue).match(
                /\/Date\((-?\d+)/
            );

        oDate =
            aMatch
                ? new Date(
                    Number(
                        aMatch[1]
                    )
                )
                : new Date(
                    vValue
                );

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
    }

    function inRange(
        vValue,
        oFrom,
        oTo
    ) {
        var oDate =
            parseODataDate(
                vValue
            );

        var oCheck;

        if (!oDate) {
            return false;
        }

        oCheck =
            new Date(
                oDate.getFullYear(),
                oDate.getMonth(),
                oDate.getDate()
            );

        if (
            oFrom &&
            oCheck <
                new Date(
                    oFrom.getFullYear(),
                    oFrom.getMonth(),
                    oFrom.getDate()
                )
        ) {
            return false;
        }

        if (
            oTo &&
            oCheck >
                new Date(
                    oTo.getFullYear(),
                    oTo.getMonth(),
                    oTo.getDate()
                )
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
            Number(vValue);

        var sNormalized =
            norm(sUnit);

        if (
            !Number.isFinite(
                nValue
            )
        ) {
            return null;
        }

        if (
            [
                "H",
                "HR",
                "HRS",
                "HOUR",
                "HOURS",
                "STD"
            ].indexOf(
                sNormalized
            ) >= 0
        ) {
            return nValue;
        }

        if (
            [
                "MIN",
                "MINS",
                "MINUTE",
                "MINUTES"
            ].indexOf(
                sNormalized
            ) >= 0
        ) {
            return nValue / 60;
        }

        if (
            [
                "SEC",
                "SECOND",
                "SECONDS",
                "S"
            ].indexOf(
                sNormalized
            ) >= 0
        ) {
            return nValue / 3600;
        }

        return null;
    }

    function uniqueBy(
        aItems,
        fnKey
    ) {
        var mSeen =
            Object.create(null);

        return (
            aItems || []
        ).filter(
            function (
                oItem
            ) {
                var sKey =
                    String(
                        fnKey(
                            oItem
                        ) || ""
                    );

                if (
                    !sKey ||
                    mSeen[sKey]
                ) {
                    return false;
                }

                mSeen[sKey] =
                    true;

                return true;
            }
        );
    }

    function uniqueStrings(
        aValues
    ) {
        var mSeen =
            Object.create(null);

        return (
            aValues || []
        ).filter(
            function (
                vValue
            ) {
                var sValue =
                    String(
                        vValue || ""
                    );

                if (
                    !sValue ||
                    mSeen[sValue]
                ) {
                    return false;
                }

                mSeen[sValue] =
                    true;

                return true;
            }
        );
    }

    function matches(
        vFilter,
        aValues
    ) {
        if (
            isAll(
                vFilter
            )
        ) {
            return true;
        }

        return (
            aValues || []
        ).some(
            function (
                vValue
            ) {
                return (
                    norm(vValue) ===
                    norm(vFilter)
                );
            }
        );
    }

    function formatNumber(
        nValue,
        iDecimals
    ) {
        if (
            !Number.isFinite(
                nValue
            )
        ) {
            return "Sin datos";
        }

        return Number(
            nValue
        ).toLocaleString(
            "es-MX",
            {
                minimumFractionDigits:
                    iDecimals,
                maximumFractionDigits:
                    iDecimals
            }
        );
    }

    function formatHours(
        nValue
    ) {
        return Number.isFinite(
            nValue
        )
            ? formatNumber(
                nValue,
                Math.abs(
                    nValue
                ) < 10
                    ? 2
                    : 0
            ) + " h"
            : "Sin datos";
    }

    function formatPct(
        nValue
    ) {
        return Number.isFinite(
            nValue
        )
            ? formatNumber(
                nValue,
                1
            ) + "%"
            : "Sin datos";
    }

    function formatDate(
        vValue
    ) {
        var oDate =
            parseODataDate(
                vValue
            );

        if (!oDate) {
            return "Sin datos";
        }

        return [
            String(
                oDate.getDate()
            ).padStart(
                2,
                "0"
            ),
            String(
                oDate.getMonth() +
                1
            ).padStart(
                2,
                "0"
            ),
            oDate.getFullYear()
        ].join("/");
    }

    function catalogRows(
        aCatalogs,
        sDomain
    ) {
        return (
            aCatalogs || []
        )
            .filter(
                function (
                    oRow
                ) {
                    return (
                        norm(
                            oRow.FilterDomain
                        ) ===
                            norm(
                                sDomain
                            ) &&
                        (
                            oRow.Active ===
                                undefined ||
                            oRow.Active ===
                                null ||
                            isTrue(
                                oRow.Active
                            )
                        )
                    );
                }
            )
            .sort(
                function (
                    a,
                    b
                ) {
                    return (
                        Number(
                            a.SortOrder ||
                            0
                        ) -
                        Number(
                            b.SortOrder ||
                            0
                        )
                    );
                }
            );
    }

    function makeCatalog(
        aRows,
        sAllText,
        bTextAsKey
    ) {
        var aResult = [
            {
                key:
                    "ALL",
                text:
                    sAllText
            }
        ];

        var mSeen =
            Object.create(null);

        (
            aRows || []
        ).forEach(
            function (
                oRow
            ) {
                var sText =
                    String(
                        oRow.text ||
                        oRow.ValueText ||
                        oRow.ValueId ||
                        ""
                    );

                var sKey =
                    String(
                        oRow.key ||
                        (
                            bTextAsKey
                                ? (
                                    oRow.ValueText ||
                                    oRow.ValueId
                                )
                                : (
                                    oRow.ValueId ||
                                    oRow.ValueText
                                )
                        ) ||
                        ""
                    );

                var sDedup =
                    norm(
                        sKey +
                        "|" +
                        sText
                    );

                if (
                    !sKey ||
                    !sText ||
                    mSeen[sDedup]
                ) {
                    return;
                }

                mSeen[sDedup] =
                    true;

                aResult.push({
                    key:
                        sKey,
                    text:
                        sText
                });
            }
        );

        return aResult;
    }

    function buildPeriods() {
        var aResult = [];
        var iYear;

        for (
            iYear = 2028;
            iYear >= 2021;
            iYear -= 1
        ) {
            aResult.push({
                key:
                    String(
                        iYear
                    ),
                text:
                    String(
                        iYear
                    )
            });
        }

        return aResult;
    }

    function buildCatalogs(
        oRaw,
        aResourcePeriod
    ) {
        var aZones =
            catalogRows(
                oRaw.catalogs,
                "ZONE"
            );

        var aSupervisors =
            catalogRows(
                oRaw.catalogs,
                "SUPERVISOR"
            );

        var aTypes =
            catalogRows(
                oRaw.catalogs,
                "ORDER_TYPE"
            );

        if (!aZones.length) {
            aZones =
                uniqueBy(
                    aResourcePeriod
                        .filter(
                            function (
                                oRow
                            ) {
                                return (
                                    oRow.ZoneId ||
                                    oRow.ZoneName
                                );
                            }
                        )
                        .map(
                            function (
                                oRow
                            ) {
                                return {
                                    key:
                                        oRow.ZoneName ||
                                        oRow.ZoneId,
                                    text:
                                        oRow.ZoneName ||
                                        oRow.ZoneId
                                };
                            }
                        ),
                    function (
                        oItem
                    ) {
                        return norm(
                            oItem.key
                        );
                    }
                );
        }

        if (!aSupervisors.length) {
            aSupervisors =
                uniqueBy(
                    aResourcePeriod
                        .filter(
                            function (
                                oRow
                            ) {
                                return (
                                    oRow.SupervisorId ||
                                    oRow.SupervisorName
                                );
                            }
                        )
                        .map(
                            function (
                                oRow
                            ) {
                                return {
                                    key:
                                        oRow.SupervisorId ||
                                        oRow.SupervisorName,
                                    text:
                                        oRow.SupervisorName ||
                                        oRow.SupervisorId
                                };
                            }
                        ),
                    function (
                        oItem
                    ) {
                        return norm(
                            oItem.key
                        );
                    }
                );
        }

        if (!aTypes.length) {
            aTypes =
                uniqueBy(
                    (
                        oRaw.orders || []
                    )
                        .filter(
                            function (
                                oOrder
                            ) {
                                return (
                                    oOrder.OrderTypeCode ||
                                    oOrder.OrderTypeText
                                );
                            }
                        )
                        .map(
                            function (
                                oOrder
                            ) {
                                return {
                                    key:
                                        oOrder.OrderTypeCode ||
                                        oOrder.OrderTypeText,
                                    text:
                                        oOrder.OrderTypeText ||
                                        oOrder.OrderTypeCode
                                };
                            }
                        ),
                    function (
                        oItem
                    ) {
                        return norm(
                            oItem.key
                        );
                    }
                );
        }

        return {
            periodos:
                buildPeriods(),

            zonas:
                makeCatalog(
                    aZones,
                    "Todas",
                    true
                ),

            supervisores:
                makeCatalog(
                    aSupervisors,
                    "Todos",
                    false
                ),

            tiposOrden:
                makeCatalog(
                    aTypes,
                    "Todos",
                    false
                )
        };
    }

    function getOpenStatusCodes(
        aCatalogs
    ) {
        var aRows =
            catalogRows(
                aCatalogs,
                "OPEN_ORDER_STATUS"
            );

        if (!aRows.length) {
            return DEFAULT_OPEN_STATUS.slice();
        }

        return uniqueStrings(
            aRows.map(
                function (
                    oRow
                ) {
                    return (
                        oRow.ValueId ||
                        oRow.ValueText
                    );
                }
            )
        );
    }

    function isOpenOrder(
        oOrder,
        aOpenCodes
    ) {
        return (
            aOpenCodes
                .map(norm)
                .indexOf(
                    norm(
                        oOrder.AppStatusCode
                    )
                ) >= 0
        );
    }

    function pickOperations(
        aOperations
    ) {
        var mGroup =
            Object.create(null);

        var aResult = [];

        (
            aOperations || []
        ).forEach(
            function (
                oOperation
            ) {
                var sKey =
                    String(
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

                if (
                    !mGroup[sKey]
                ) {
                    mGroup[sKey] =
                        [];
                }

                mGroup[sKey].push(
                    oOperation
                );
            }
        );

        Object.keys(
            mGroup
        ).forEach(
            function (
                sKey
            ) {
                var aRows =
                    mGroup[sKey];

                var oSelected =
                    aRows.find(
                        function (
                            oRow
                        ) {
                            return (
                                norm(
                                    oRow.PlannedSourceCode
                                ) ===
                                "AFVV_WORK"
                            );
                        }
                    ) ||
                    aRows.find(
                        function (
                            oRow
                        ) {
                            return (
                                norm(
                                    oRow.PlannedSourceCode
                                ).indexOf(
                                    "AFVV"
                                ) === 0
                            );
                        }
                    );

                if (oSelected) {
                    aResult.push(
                        oSelected
                    );
                }
            }
        );

        return aResult;
    }

    function buildAssignmentMaps(
        aAssignments
    ) {
        var mExact =
            Object.create(null);

        var mByOrder =
            Object.create(null);

        (
            aAssignments || []
        ).forEach(
            function (
                oRow
            ) {
                var sOrderId =
                    String(
                        oRow.OrderId ||
                        ""
                    );

                var sExact =
                    [
                        sOrderId,
                        oRow.RoutingNumber ||
                            "",
                        oRow.OperationCounter ||
                            ""
                    ].join("|");

                if (
                    !mExact[sExact]
                ) {
                    mExact[sExact] =
                        [];
                }

                mExact[sExact].push(
                    oRow
                );

                if (
                    !mByOrder[sOrderId]
                ) {
                    mByOrder[sOrderId] =
                        [];
                }

                mByOrder[
                    sOrderId
                ].push(
                    oRow
                );
            }
        );

        return {
            exact:
                mExact,
            byOrder:
                mByOrder
        };
    }

    function assignmentsForOperation(
        oOperation,
        oMaps
    ) {
        var sOrderId =
            String(
                oOperation.OrderId ||
                ""
            );

        var sExact =
            [
                sOrderId,
                oOperation.RoutingNumber ||
                    "",
                oOperation.OperationCounter ||
                    ""
            ].join("|");

        if (
            oMaps.exact[sExact] &&
            oMaps.exact[sExact].length
        ) {
            return (
                oMaps.exact[sExact]
            );
        }

        return (
            oMaps.byOrder[
                sOrderId
            ] || []
        );
    }

    function resourceId(
        oRow
    ) {
        return String(
            oRow.ResourceId ||
            oRow.PersonnelNumber ||
            ""
        );
    }

    function buildResourceScope(
        aResourcePeriod,
        oFilters
    ) {
        var mScope =
            Object.create(null);

        (
            aResourcePeriod || []
        )
            .filter(
                function (
                    oRow
                ) {
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
                        )
                    );
                }
            )
            .forEach(
                function (
                    oRow
                ) {
                    var sId =
                        resourceId(
                            oRow
                        );

                    if (sId) {
                        mScope[sId] =
                            true;
                    }
                }
            );

        return mScope;
    }

    function orderInResourceScope(
        sOrderId,
        oMaps,
        mResourceScope,
        bSpecificResourceFilter
    ) {
        var aAssignments;

        if (
            !bSpecificResourceFilter
        ) {
            return true;
        }

        aAssignments =
            oMaps.byOrder[
                String(
                    sOrderId ||
                    ""
                )
            ] || [];

        return aAssignments.some(
            function (
                oAssignment
            ) {
                return Boolean(
                    mResourceScope[
                        resourceId(
                            oAssignment
                        )
                    ]
                );
            }
        );
    }

    function buildWeeklyEvolution(
        aOperations,
        aConfirmations,
        mAllowedOrders
    ) {
        var mWeeks =
            Object.create(null);

        function getWeekKey(
            vDate
        ) {
            var oDate =
                parseODataDate(
                    vDate
                );

            var oThursday;
            var iWeek;
            var iYear;

            if (!oDate) {
                return null;
            }

            oThursday =
                new Date(
                    oDate.getTime()
                );

            oThursday.setHours(
                0,
                0,
                0,
                0
            );

            oThursday.setDate(
                oThursday.getDate() +
                3 -
                (
                    (
                        oThursday.getDay() +
                        6
                    ) % 7
                )
            );

            iYear =
                oThursday.getFullYear();

            iWeek =
                1 +
                Math.round(
                    (
                        (
                            oThursday.getTime() -
                            new Date(
                                iYear,
                                0,
                                4
                            ).getTime()
                        ) /
                        86400000 -
                        3 +
                        (
                            (
                                new Date(
                                    iYear,
                                    0,
                                    4
                                ).getDay() +
                                6
                            ) % 7
                        )
                    ) /
                    7
                );

            return {
                key:
                    iYear +
                    "-" +
                    String(
                        iWeek
                    ).padStart(
                        2,
                        "0"
                    ),
                label:
                    "Sem " +
                    iWeek
            };
        }

        function ensureWeek(
            oWeek
        ) {
            if (
                !mWeeks[
                    oWeek.key
                ]
            ) {
                mWeeks[
                    oWeek.key
                ] = {
                    key:
                        oWeek.key,
                    semana:
                        oWeek.label,
                    programadas:
                        0,
                    reales:
                        0
                };
            }

            return (
                mWeeks[
                    oWeek.key
                ]
            );
        }

        aOperations.forEach(
            function (
                oOperation
            ) {
                var oWeek;
                var nHours;

                if (
                    !mAllowedOrders[
                        String(
                            oOperation.OrderId ||
                            ""
                        )
                    ]
                ) {
                    return;
                }

                oWeek =
                    getWeekKey(
                        oOperation.PlannedStartDate ||
                        oOperation.PlannedFinishDate
                    );

                nHours =
                    toHours(
                        oOperation.PlannedValueOriginal,
                        oOperation.PlannedUnitOriginal
                    );

                if (
                    !oWeek ||
                    !Number.isFinite(
                        nHours
                    )
                ) {
                    return;
                }

                ensureWeek(
                    oWeek
                ).programadas +=
                    nHours;
            }
        );

        aConfirmations.forEach(
            function (
                oConfirmation
            ) {
                var oWeek;
                var nHours;

                if (
                    !mAllowedOrders[
                        String(
                            oConfirmation.OrderId ||
                            ""
                        )
                    ] ||
                    !isTrue(
                        oConfirmation.IncludedInCalculation
                    )
                ) {
                    return;
                }

                oWeek =
                    getWeekKey(
                        oConfirmation.ActualStartDate ||
                        oConfirmation.ActualFinishDate
                    );

                nHours =
                    toHours(
                        oConfirmation.ActualValueOriginal,
                        oConfirmation.ActualUnitOriginal
                    );

                if (
                    !oWeek ||
                    !Number.isFinite(
                        nHours
                    )
                ) {
                    return;
                }

                ensureWeek(
                    oWeek
                ).reales +=
                    nHours;
            }
        );

        var aWeeks =
            Object.keys(
                mWeeks
            )
                .sort()
                .map(
                    function (
                        sKey
                    ) {
                        return (
                            mWeeks[
                                sKey
                            ]
                        );
                    }
                )
                .slice(
                    -5
                );

        var nProgramadasAcum =
            0;

        var nRealesAcum =
            0;

        aWeeks.forEach(
            function (
                oWeek
            ) {
                nProgramadasAcum +=
                    oWeek.programadas;

                nRealesAcum +=
                    oWeek.reales;

                oWeek.programadas =
                    nProgramadasAcum;

                oWeek.reales =
                    nRealesAcum;
            }
        );

        return aWeeks;
    }

    function buildChart(
        aEvolution
    ) {
        var aData =
            (
                aEvolution || []
            ).slice(
                -5
            );

        var aX = [
            70,
            180,
            290,
            400,
            510
        ];

        var nMax = 0;
        var aProgramadas = [];
        var aReales = [];

        aData.forEach(
            function (
                oItem
            ) {
                nMax =
                    Math.max(
                        nMax,
                        Number(
                            oItem.programadas ||
                            0
                        ),
                        Number(
                            oItem.reales ||
                            0
                        )
                    );
            }
        );

        if (nMax <= 0) {
            nMax = 1;
        }

        function yFor(
            nValue
        ) {
            return (
                170 -
                (
                    Number(
                        nValue ||
                        0
                    ) /
                    nMax
                ) *
                130
            );
        }

        aData.forEach(
            function (
                oItem,
                iIndex
            ) {
                aProgramadas.push({
                    x:
                        aX[iIndex],
                    y:
                        yFor(
                            oItem.programadas
                        ),
                    label:
                        oItem.semana
                });

                aReales.push({
                    x:
                        aX[iIndex],
                    y:
                        yFor(
                            oItem.reales
                        ),
                    label:
                        oItem.semana
                });
            }
        );

        return {
            programadas:
                aProgramadas,
            reales:
                aReales,
            max:
                nMax
        };
    }

    function getTypeCode(
        oRow
    ) {
        return norm(
            oRow.ResourceTypeCode
        );
    }

    function countResourceType(
        mLatest,
        fnFilter
    ) {
        return Object.keys(
            mLatest
        ).filter(
            function (
                sId
            ) {
                return fnFilter(
                    mLatest[
                        sId
                    ]
                );
            }
        ).length;
    }

    function getLatestRows(
        aRows
    ) {
        var mLatest =
            Object.create(null);

        (
            aRows || []
        ).forEach(
            function (
                oRow
            ) {
                var sId =
                    resourceId(
                        oRow
                    );

                var oDate =
                    parseODataDate(
                        oRow.WorkDate
                    );

                var oCurrent;

                if (!sId) {
                    return;
                }

                if (
                    !mLatest[sId]
                ) {
                    mLatest[sId] =
                        oRow;

                    return;
                }

                oCurrent =
                    parseODataDate(
                        mLatest[
                            sId
                        ].WorkDate
                    );

                if (
                    oDate &&
                    (
                        !oCurrent ||
                        oDate.getTime() >=
                            oCurrent.getTime()
                    )
                ) {
                    mLatest[sId] =
                        oRow;
                }
            }
        );

        return mLatest;
    }

    function priorityFromCatalog(
        aCatalogs,
        iDays
    ) {
        var aRows =
            catalogRows(
                aCatalogs,
                "ORDER_DUE_PRIORITY"
            );

        var oMatch =
            aRows.find(
                function (
                    oRow
                ) {
                    return (
                        Number.isFinite(
                            Number(
                                oRow.NumericValue
                            )
                        ) &&
                        iDays <=
                            Number(
                                oRow.NumericValue
                            )
                    );
                }
            );

        if (!oMatch) {
            return {
                text:
                    "Sin datos",
                key:
                    "pendiente"
            };
        }

        return {
            text:
                oMatch.ValueText ||
                oMatch.ValueId ||
                "Sin datos",
            key:
                norm(
                    oMatch.ValueId ||
                    oMatch.ValueText
                ).toLowerCase()
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
                        "2026",
                    fechaDesde:
                        "01/01/2026",
                    fechaHasta:
                        "31/12/2026",
                    zona:
                        "ALL",
                    supervisor:
                        "ALL",
                    tipoOrden:
                        "ALL"
                },
                mFilters || {}
            );

        var oFrom =
            parseInputDate(
                oFilters.fechaDesde
            );

        var oTo =
            parseInputDate(
                oFilters.fechaHasta
            );

        var aResourcePeriod =
            (
                oRaw.resources || []
            ).filter(
                function (
                    oRow
                ) {
                    return inRange(
                        oRow.WorkDate,
                        oFrom,
                        oTo
                    );
                }
            );

        var oCatalogs =
            buildCatalogs(
                oRaw,
                aResourcePeriod
            );

        var mResourceScope =
            buildResourceScope(
                aResourcePeriod,
                oFilters
            );

        var bSpecificResourceFilter =
            !isAll(
                oFilters.zona
            ) ||
            !isAll(
                oFilters.supervisor
            );

        var oAssignmentMaps =
            buildAssignmentMaps(
                oRaw.orderResources ||
                []
            );

        var aOpenCodes =
            getOpenStatusCodes(
                oRaw.catalogs ||
                []
            );

        var aOrders =
            uniqueBy(
                (
                    oRaw.orders || []
                ).filter(
                    function (
                        oOrder
                    ) {
                        return (
                            matches(
                                oFilters.tipoOrden,
                                [
                                    oOrder.OrderTypeCode,
                                    oOrder.OrderTypeText
                                ]
                            ) &&
                            orderInResourceScope(
                                oOrder.OrderId,
                                oAssignmentMaps,
                                mResourceScope,
                                bSpecificResourceFilter
                            )
                        );
                    }
                ),
                function (
                    oOrder
                ) {
                    return (
                        oOrder.OrderId
                    );
                }
            );

        var mAllowedOrders =
            Object.create(null);

        aOrders.forEach(
            function (
                oOrder
            ) {
                if (
                    oOrder.OrderId
                ) {
                    mAllowedOrders[
                        String(
                            oOrder.OrderId
                        )
                    ] = true;
                }
            }
        );

        var aOpenOrders =
            aOrders.filter(
                function (
                    oOrder
                ) {
                    return isOpenOrder(
                        oOrder,
                        aOpenCodes
                    );
                }
            );

        var oCutoff =
            oTo ||
            new Date();

        var aOverdue =
            aOpenOrders.filter(
                function (
                    oOrder
                ) {
                    var oFinish =
                        parseODataDate(
                            oOrder.PlannedFinishDate
                        );

                    return (
                        oFinish &&
                        oFinish <
                            oCutoff
                    );
                }
            );

        var aOperations =
            pickOperations(
                oRaw.operations ||
                []
            ).filter(
                function (
                    oOperation
                ) {
                    return Boolean(
                        mAllowedOrders[
                            String(
                                oOperation.OrderId ||
                                ""
                            )
                        ]
                    );
                }
            );

        var nPlannedHours =
            aOperations.reduce(
                function (
                    nTotal,
                    oOperation
                ) {
                    var nHours =
                        toHours(
                            oOperation.PlannedValueOriginal,
                            oOperation.PlannedUnitOriginal
                        );

                    return (
                        nTotal +
                        (
                            Number.isFinite(
                                nHours
                            )
                                ? nHours
                                : 0
                        )
                    );
                },
                0
            );

        var aConfirmations =
            (
                oRaw.confirmations ||
                []
            ).filter(
                function (
                    oConfirmation
                ) {
                    return (
                        mAllowedOrders[
                            String(
                                oConfirmation.OrderId ||
                                ""
                            )
                        ] &&
                        isTrue(
                            oConfirmation.IncludedInCalculation
                        )
                    );
                }
            );

        var nActualHours =
            aConfirmations.reduce(
                function (
                    nTotal,
                    oConfirmation
                ) {
                    var nHours =
                        toHours(
                            oConfirmation.ActualValueOriginal,
                            oConfirmation.ActualUnitOriginal
                        );

                    return (
                        nTotal +
                        (
                            Number.isFinite(
                                nHours
                            )
                                ? nHours
                                : 0
                        )
                    );
                },
                0
            );

        var bPlanAvailable =
            aOperations.length >
            0;

        var bActualAvailable =
            aConfirmations.length >
            0;

        var aFilteredResourceRows =
            aResourcePeriod.filter(
                function (
                    oRow
                ) {
                    return Boolean(
                        mResourceScope[
                            resourceId(
                                oRow
                            )
                        ]
                    );
                }
            );

        var mLatestResources =
            getLatestRows(
                aFilteredResourceRows
            );

        var bTypeAvailable =
            Object.keys(
                mLatestResources
            ).some(
                function (
                    sId
                ) {
                    return Boolean(
                        getTypeCode(
                            mLatestResources[
                                sId
                            ]
                        )
                    );
                }
            );

        var iAssignedMechanics =
            bTypeAvailable
                ? countResourceType(
                    mLatestResources,
                    function (
                        oRow
                    ) {
                        var sType =
                            getTypeCode(
                                oRow
                            );

                        return (
                            sType.indexOf(
                                "MECAN"
                            ) >= 0 ||
                            sType.indexOf(
                                "MECHAN"
                            ) >= 0
                        );
                    }
                )
                : null;

        var iAssignedHelpers =
            bTypeAvailable
                ? countResourceType(
                    mLatestResources,
                    function (
                        oRow
                    ) {
                        var sType =
                            getTypeCode(
                                oRow
                            );

                        return (
                            sType.indexOf(
                                "AYUD"
                            ) >= 0 ||
                            sType.indexOf(
                                "HELP"
                            ) >= 0
                        );
                    }
                )
                : null;

        var bAvailabilityAvailable =
            Object.keys(
                mLatestResources
            ).some(
                function (
                    sId
                ) {
                    return Boolean(
                        mLatestResources[
                            sId
                        ].AvailabilityStatusCode
                    );
                }
            );

        var iAvailableMechanics =
            bAvailabilityAvailable &&
            bTypeAvailable
                ? countResourceType(
                    mLatestResources,
                    function (
                        oRow
                    ) {
                        var sType =
                            getTypeCode(
                                oRow
                            );

                        return (
                            norm(
                                oRow.AvailabilityStatusCode
                            ).indexOf(
                                "AVAILABLE"
                            ) >= 0 &&
                            (
                                sType.indexOf(
                                    "MECAN"
                                ) >= 0 ||
                                sType.indexOf(
                                    "MECHAN"
                                ) >= 0
                            )
                        );
                    }
                )
                : null;

        var iAvailableHelpers =
            bAvailabilityAvailable &&
            bTypeAvailable
                ? countResourceType(
                    mLatestResources,
                    function (
                        oRow
                    ) {
                        var sType =
                            getTypeCode(
                                oRow
                            );

                        return (
                            norm(
                                oRow.AvailabilityStatusCode
                            ).indexOf(
                                "AVAILABLE"
                            ) >= 0 &&
                            (
                                sType.indexOf(
                                    "AYUD"
                                ) >= 0 ||
                                sType.indexOf(
                                    "HELP"
                                ) >= 0
                            )
                        );
                    }
                )
                : null;

        var bCapacityAvailable =
            aFilteredResourceRows.some(
                function (
                    oRow
                ) {
                    return (
                        isTrue(
                            oRow.CapacitySourceValidated
                        ) &&
                        Number.isFinite(
                            Number(
                                oRow.CapacityHours
                            )
                        )
                    );
                }
            );

        var nCapacity =
            bCapacityAvailable
                ? aFilteredResourceRows.reduce(
                    function (
                        nTotal,
                        oRow
                    ) {
                        var nValue =
                            Number(
                                oRow.CapacityHours
                            );

                        return (
                            nTotal +
                            (
                                isTrue(
                                    oRow.CapacitySourceValidated
                                ) &&
                                Number.isFinite(
                                    nValue
                                )
                                    ? nValue
                                    : 0
                            )
                        );
                    },
                    0
                )
                : null;

        var nUtilization =
            Number.isFinite(
                nCapacity
            ) &&
            nCapacity > 0 &&
            bPlanAvailable
                ? (
                    nPlannedHours /
                    nCapacity
                ) * 100
                : null;

        var nVariation =
            bPlanAvailable &&
            bActualAvailable
                ? (
                    nActualHours -
                    nPlannedHours
                )
                : null;

        var nVariationPct =
            Number.isFinite(
                nVariation
            ) &&
            nPlannedHours > 0
                ? (
                    nVariation /
                    nPlannedHours
                ) * 100
                : null;

        /*
         * Índice de presión:
         * la especificación indica que la fórmula/pesos aún deben
         * aprobarse. No se inventa.
         */
        var oPressure = {
            texto:
                "Sin datos",
            estado:
                "Pendiente",
            nivel:
                "Fórmula pendiente"
        };

        /*
         * Resumen por estado.
         * Vencidas es subconjunto de abiertas y no se suma al total.
         * Reprogramadas / pendiente cliente-material solo se reconocen
         * cuando el texto de estatus lo permite.
         */
        var aStatusDefinition = [
            {
                estado:
                    "Abiertas",
                color:
                    "blue",
                icon:
                    "sap-icon://activity-individual",
                matcher:
                    function (
                        oOrder
                    ) {
                        return (
                            norm(
                                oOrder.AppStatusCode
                            ) ===
                            "0100"
                        );
                    }
            },
            {
                estado:
                    "En proceso",
                color:
                    "orange",
                icon:
                    "sap-icon://lateness",
                matcher:
                    function (
                        oOrder
                    ) {
                        return (
                            norm(
                                oOrder.AppStatusCode
                            ) ===
                            "0200"
                        );
                    }
            },
            {
                estado:
                    "Reprogramadas",
                color:
                    "green",
                icon:
                    "sap-icon://appointment-2",
                matcher:
                    function (
                        oOrder
                    ) {
                        return (
                            norm(
                                oOrder.StatusText
                            ).indexOf(
                                "REPROGRAM"
                            ) >= 0
                        );
                    }
            },
            {
                estado:
                    "Pendientes por cliente/material",
                color:
                    "purple",
                icon:
                    "sap-icon://customer",
                matcher:
                    function (
                        oOrder
                    ) {
                        var sText =
                            norm(
                                oOrder.StatusText
                            );

                        return (
                            sText.indexOf(
                                "CLIENTE"
                            ) >= 0 ||
                            sText.indexOf(
                                "MATERIAL"
                            ) >= 0
                        );
                    }
            }
        ];

        var aResumenEstados =
            aStatusDefinition.map(
                function (
                    oDefinition
                ) {
                    var iCount =
                        aOpenOrders.filter(
                            oDefinition.matcher
                        ).length;

                    var nPct =
                        aOpenOrders.length >
                        0
                            ? (
                                iCount /
                                aOpenOrders.length
                            ) * 100
                            : null;

                    return {
                        estado:
                            oDefinition.estado,
                        cantidad:
                            String(
                                iCount
                            ),
                        porcentajeTexto:
                            formatPct(
                                nPct
                            ),
                        porcentajeNumero:
                            Number.isFinite(
                                nPct
                            )
                                ? nPct
                                : 0,
                        color:
                            oDefinition.color,
                        icon:
                            oDefinition.icon
                    };
                }
            );

        aResumenEstados.push({
            estado:
                "Vencidas",
            cantidad:
                String(
                    aOverdue.length
                ),
            porcentajeTexto:
                aOpenOrders.length >
                    0
                    ? formatPct(
                        (
                            aOverdue.length /
                            aOpenOrders.length
                        ) * 100
                    )
                    : "Sin datos",
            porcentajeNumero:
                aOpenOrders.length >
                    0
                    ? (
                        aOverdue.length /
                        aOpenOrders.length
                    ) * 100
                    : 0,
            color:
                "red",
            icon:
                "sap-icon://status-negative"
        });

        /*
         * Causas: impacto relativo por frecuencia de OT con causa.
         * El índice compuesto de presión sigue pendiente.
         */
        var mCause =
            Object.create(null);

        (
            oRaw.causes || []
        ).forEach(
            function (
                oCause
            ) {
                var sOrderId =
                    String(
                        oCause.OrderId ||
                        ""
                    );

                var sCause =
                    String(
                        oCause.CauseText ||
                        oCause.CauseCode ||
                        ""
                    );

                var sKey =
                    norm(
                        sCause
                    );

                if (
                    !mAllowedOrders[
                        sOrderId
                    ] ||
                    !sKey
                ) {
                    return;
                }

                if (
                    !mCause[sKey]
                ) {
                    mCause[sKey] = {
                        causa:
                            sCause,
                        orders:
                            Object.create(
                                null
                            )
                    };
                }

                mCause[
                    sKey
                ].orders[
                    sOrderId
                ] = true;
            }
        );

        var aCauseColors = [
            "red",
            "orange",
            "yellow",
            "blue",
            "purple"
        ];

        var aCauseIcons = [
            "sap-icon://lateness",
            "sap-icon://time-overtime",
            "sap-icon://group",
            "sap-icon://calendar",
            "sap-icon://product"
        ];

        var aCausasPresion =
            Object.keys(
                mCause
            )
                .map(
                    function (
                        sKey
                    ) {
                        return {
                            causa:
                                mCause[
                                    sKey
                                ].causa,
                            count:
                                Object.keys(
                                    mCause[
                                        sKey
                                    ].orders
                                ).length
                        };
                    }
                )
                .sort(
                    function (
                        a,
                        b
                    ) {
                        return (
                            b.count -
                            a.count
                        );
                    }
                )
                .slice(
                    0,
                    5
                );

        var iCauseTotal =
            aCausasPresion.reduce(
                function (
                    nTotal,
                    oItem
                ) {
                    return (
                        nTotal +
                        oItem.count
                    );
                },
                0
            );

        aCausasPresion =
            aCausasPresion.map(
                function (
                    oItem,
                    iIndex
                ) {
                    var nPct =
                        iCauseTotal > 0
                            ? (
                                oItem.count /
                                iCauseTotal
                            ) * 100
                            : 0;

                    return {
                        causa:
                            oItem.causa,
                        impacto:
                            nPct,
                        impactoTexto:
                            formatPct(
                                nPct
                            ),
                        color:
                            aCauseColors[
                                iIndex %
                                aCauseColors.length
                            ],
                        icon:
                            aCauseIcons[
                                iIndex %
                                aCauseIcons.length
                            ]
                    };
                }
            );

        /*
         * Cliente / equipo.
         */
        var mClient =
            Object.create(null);

        aOpenOrders.forEach(
            function (
                oOrder
            ) {
                var sClient =
                    String(
                        oOrder.CustomerName ||
                        oOrder.SiteName ||
                        oOrder.CustomerId ||
                        "Sin cliente"
                    );

                var sEquipment =
                    String(
                        oOrder.EquipmentName ||
                        oOrder.EquipmentId ||
                        "Sin equipo"
                    );

                var sKey =
                    norm(
                        sClient +
                        "|" +
                        sEquipment
                    );

                if (
                    !mClient[sKey]
                ) {
                    mClient[sKey] = {
                        cliente:
                            sClient,
                        elevador:
                            sEquipment,
                        open:
                            Object.create(
                                null
                            ),
                        overdue:
                            Object.create(
                                null
                            )
                    };
                }

                mClient[
                    sKey
                ].open[
                    oOrder.OrderId
                ] = true;

                if (
                    aOverdue.some(
                        function (
                            oOverdue
                        ) {
                            return (
                                oOverdue.OrderId ===
                                oOrder.OrderId
                            );
                        }
                    )
                ) {
                    mClient[
                        sKey
                    ].overdue[
                        oOrder.OrderId
                    ] = true;
                }
            }
        );

        var aClientesCarga =
            Object.keys(
                mClient
            )
                .map(
                    function (
                        sKey
                    ) {
                        return {
                            cliente:
                                mClient[
                                    sKey
                                ].cliente,
                            elevador:
                                mClient[
                                    sKey
                                ].elevador,
                            abiertas:
                                Object.keys(
                                    mClient[
                                        sKey
                                    ].open
                                ).length,
                            vencidas:
                                Object.keys(
                                    mClient[
                                        sKey
                                    ].overdue
                                ).length
                        };
                    }
                )
                .sort(
                    function (
                        a,
                        b
                    ) {
                        if (
                            b.abiertas !==
                            a.abiertas
                        ) {
                            return (
                                b.abiertas -
                                a.abiertas
                            );
                        }

                        return (
                            b.vencidas -
                            a.vencidas
                        );
                    }
                )
                .slice(
                    0,
                    5
                );

        /*
         * Próximas a vencer: fecha de corte = fechaHasta.
         */
        var oSevenDays =
            new Date(
                oCutoff.getTime()
            );

        oSevenDays.setDate(
            oSevenDays.getDate() +
            7
        );

        var aOrdenesVencer =
            aOpenOrders
                .filter(
                    function (
                        oOrder
                    ) {
                        var oFinish =
                            parseODataDate(
                                oOrder.PlannedFinishDate
                            );

                        return (
                            oFinish &&
                            oFinish >=
                                oCutoff &&
                            oFinish <=
                                oSevenDays
                        );
                    }
                )
                .map(
                    function (
                        oOrder
                    ) {
                        var oFinish =
                            parseODataDate(
                                oOrder.PlannedFinishDate
                            );

                        var iDays =
                            Math.ceil(
                                (
                                    oFinish.getTime() -
                                    oCutoff.getTime()
                                ) /
                                86400000
                            );

                        var oPriority =
                            priorityFromCatalog(
                                oRaw.catalogs ||
                                [],
                                iDays
                            );

                        return {
                            ot:
                                oOrder.OrderId ||
                                "Sin datos",
                            tipo:
                                oOrder.OrderTypeText ||
                                oOrder.OrderTypeCode ||
                                "Sin datos",
                            tipoKey:
                                norm(
                                    oOrder.OrderTypeText ||
                                    oOrder.OrderTypeCode
                                ).toLowerCase(),
                            elevador:
                                oOrder.EquipmentName ||
                                oOrder.EquipmentId ||
                                "Sin datos",
                            compromiso:
                                formatDate(
                                    oOrder.PlannedFinishDate
                                ),
                            dias:
                                String(
                                    iDays
                                ),
                            prioridad:
                                oPriority.text,
                            prioridadKey:
                                oPriority.key
                        };
                    }
                )
                .sort(
                    function (
                        a,
                        b
                    ) {
                        return (
                            Number(
                                a.dias
                            ) -
                            Number(
                                b.dias
                            )
                        );
                    }
                )
                .slice(
                    0,
                    5
                );

        var aEvolution =
            buildWeeklyEvolution(
                aOperations,
                aConfirmations,
                mAllowedOrders
            );

        var oChart =
            buildChart(
                aEvolution
            );

        console.log(
            "[DOZ MAPPER] Resultado:",
            {
                orders:
                    aOrders.length,
                open:
                    aOpenOrders.length,
                overdue:
                    aOverdue.length,
                resources:
                    Object.keys(
                        mLatestResources
                    ).length,
                operations:
                    aOperations.length,
                confirmations:
                    aConfirmations.length,
                causes:
                    (
                        oRaw.causes || []
                    ).length
            }
        );

        return {
            catalogos:
                oCatalogs,

            kpis: {
                indicePresion: {
                    texto:
                        oPressure.texto,
                    estado:
                        oPressure.estado,
                    nivel:
                        oPressure.nivel
                },

                ordenesAbiertas: {
                    valor:
                        String(
                            aOpenOrders.length
                        ),
                    porcentaje:
                        aOrders.length >
                            0
                            ? formatPct(
                                (
                                    aOpenOrders.length /
                                    aOrders.length
                                ) * 100
                            ) +
                            " del total"
                            : "Sin datos"
                },

                ordenesVencidas: {
                    valor:
                        String(
                            aOverdue.length
                        ),
                    porcentaje:
                        aOpenOrders.length >
                            0
                            ? formatPct(
                                (
                                    aOverdue.length /
                                    aOpenOrders.length
                                ) * 100
                            ) +
                            " de las abiertas"
                            : "Sin datos"
                },

                horasProgramadas: {
                    texto:
                        bPlanAvailable
                            ? formatHours(
                                nPlannedHours
                            )
                            : "Sin datos"
                },

                horasReales: {
                    texto:
                        bActualAvailable
                            ? formatHours(
                                nActualHours
                            )
                            : "Sin datos",

                    variacion:
                        Number.isFinite(
                            nVariation
                        )
                            ? (
                                (
                                    nVariation >= 0
                                        ? "+"
                                        : "-"
                                ) +
                                formatHours(
                                    Math.abs(
                                        nVariation
                                    )
                                ) +
                                (
                                    Number.isFinite(
                                        nVariationPct
                                    )
                                        ? (
                                            " (" +
                                            formatPct(
                                                Math.abs(
                                                    nVariationPct
                                                )
                                            ) +
                                            ")"
                                        )
                                        : ""
                                )
                            )
                            : "Sin datos"
                },

                recursosDisponibles: {
                    texto:
                        Number.isFinite(
                            iAvailableMechanics
                        ) &&
                        Number.isFinite(
                            iAvailableHelpers
                        )
                            ? (
                                iAvailableMechanics +
                                " / " +
                                iAvailableHelpers
                            )
                            : "Sin datos",

                    utilizacion:
                        Number.isFinite(
                            nUtilization
                        )
                            ? (
                                "Utilización: " +
                                formatPct(
                                    nUtilization
                                )
                            )
                            : "Utilización: Sin datos"
                }
            },

            totalOrdenesAbiertas:
                String(
                    aOpenOrders.length
                ),

            resumenEstados:
                aResumenEstados,

            evolucionHoras:
                aEvolution,

            horasResumen: {
                programadas:
                    bPlanAvailable
                        ? formatHours(
                            nPlannedHours
                        )
                        : "Sin datos",

                reales:
                    bActualAvailable
                        ? formatHours(
                            nActualHours
                        )
                        : "Sin datos",

                variacion:
                    Number.isFinite(
                        nVariation
                    )
                        ? (
                            (
                                nVariation >= 0
                                    ? "+"
                                    : "-"
                            ) +
                            formatHours(
                                Math.abs(
                                    nVariation
                                )
                            ) +
                            (
                                Number.isFinite(
                                    nVariationPct
                                )
                                    ? (
                                        " (" +
                                        formatPct(
                                            Math.abs(
                                                nVariationPct
                                            )
                                        ) +
                                        ")"
                                    )
                                    : ""
                            )
                        )
                        : "Sin datos"
            },

            recursos: {
                utilizacion:
                    Number.isFinite(
                        nUtilization
                    )
                        ? nUtilization
                        : null,

                utilizacionTexto:
                    formatPct(
                        nUtilization
                    ),

                asignados: {
                    mecanicos:
                        Number.isFinite(
                            iAssignedMechanics
                        )
                            ? String(
                                iAssignedMechanics
                            )
                            : "Sin datos",

                    ayudantes:
                        Number.isFinite(
                            iAssignedHelpers
                        )
                            ? String(
                                iAssignedHelpers
                            )
                            : "Sin datos"
                },

                disponibles: {
                    mecanicos:
                        Number.isFinite(
                            iAvailableMechanics
                        )
                            ? String(
                                iAvailableMechanics
                            )
                            : "Sin datos",

                    ayudantes:
                        Number.isFinite(
                            iAvailableHelpers
                        )
                            ? String(
                                iAvailableHelpers
                            )
                            : "Sin datos"
                }
            },

            causasPresion:
                aCausasPresion,

            clientesCarga:
                aClientesCarga,

            ordenesVencer:
                aOrdenesVencer,

            chart:
                oChart,

            meta: {
                planAvailable:
                    bPlanAvailable,

                actualAvailable:
                    bActualAvailable,

                capacityAvailable:
                    bCapacityAvailable,

                availabilityAvailable:
                    bAvailabilityAvailable,

                typeAvailable:
                    bTypeAvailable,

                pressureFormulaApproved:
                    false,

                openStatusFallbackUsed:
                    catalogRows(
                        oRaw.catalogs,
                        "OPEN_ORDER_STATUS"
                    ).length ===
                    0
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
