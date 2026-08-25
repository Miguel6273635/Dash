sap.ui.define([], function () {
    "use strict";

    var DEFAULT_LOW_MAX =
        70;

    var DEFAULT_NORMAL_MAX =
        100;

    var DEFAULT_HIGH_MAX =
        120;

    var DEFAULT_COMPLIANCE_TARGET =
        80;

    var DEFAULT_EXECUTED_STATUS = [
        "0300"
    ];

    /* =========================================================
     * FUNCIONES GENERALES
     * ========================================================= */

    function norm(vValue) {
        return String(
            vValue ||
            ""
        )
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toUpperCase();
    }

    function isTrue(vValue) {
        var sValue =
            norm(
                vValue
            );

        return (
            vValue === true ||
            [
                "TRUE",
                "X",
                "1"
            ].indexOf(
                sValue
            ) >= 0
        );
    }

    function isAll(vValue) {
        return [
            "",
            "ALL",
            "TODOS",
            "TODAS"
        ].indexOf(
            norm(
                vValue
            )
        ) >= 0;
    }

    function parseInputDate(
        vValue
    ) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }

        aMatch =
            String(
                vValue
            ).match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        if (aMatch) {
            return new Date(
                Number(
                    aMatch[3]
                ),

                Number(
                    aMatch[2]
                ) - 1,

                Number(
                    aMatch[1]
                )
            );
        }

        oDate =
            new Date(
                vValue
            );

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
    }

    function parseODataDate(
        vValue
    ) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }

        if (
            vValue instanceof
            Date
        ) {
            return new Date(
                vValue.getTime()
            );
        }

        aMatch =
            String(
                vValue
            ).match(
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

    function sameDay(
        oA,
        oB
    ) {
        return Boolean(
            oA &&
            oB &&
            oA.getFullYear() ===
                oB.getFullYear() &&
            oA.getMonth() ===
                oB.getMonth() &&
            oA.getDate() ===
                oB.getDate()
        );
    }

    function isDateInRange(
        vDate,
        oStart,
        oEnd
    ) {
        var oDate =
            parseODataDate(
                vDate
            );

        if (!oDate) {
            return false;
        }

        oDate =
            new Date(
                oDate.getFullYear(),
                oDate.getMonth(),
                oDate.getDate()
            );

        if (oStart) {
            oStart =
                new Date(
                    oStart.getFullYear(),
                    oStart.getMonth(),
                    oStart.getDate()
                );

            if (
                oDate <
                oStart
            ) {
                return false;
            }
        }

        if (oEnd) {
            oEnd =
                new Date(
                    oEnd.getFullYear(),
                    oEnd.getMonth(),
                    oEnd.getDate()
                );

            if (
                oDate >
                oEnd
            ) {
                return false;
            }
        }

        return true;
    }

    /*
     * Unidades de operación → horas.
     */

    function toHours(
        vValue,
        sUnit
    ) {
        var nValue =
            Number(
                vValue
            );

        var sNormalized =
            norm(
                sUnit
            );

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
                "HRA",
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
            return (
                nValue /
                60
            );
        }

        if (
            [
                "S",
                "SEC",
                "SECOND",
                "SECONDS"
            ].indexOf(
                sNormalized
            ) >= 0
        ) {
            return (
                nValue /
                3600
            );
        }

        return null;
    }

    function uniqueBy(
        aItems,
        fnKey
    ) {
        var mSeen =
            Object.create(
                null
            );

        return (
            aItems ||
            []
        ).filter(
            function (
                oItem
            ) {
                var sKey =
                    String(
                        fnKey(
                            oItem
                        ) ||
                        ""
                    );

                if (
                    !sKey ||
                    mSeen[
                        sKey
                    ]
                ) {
                    return false;
                }

                mSeen[
                    sKey
                ] = true;

                return true;
            }
        );
    }

    function uniqueStrings(
        aValues
    ) {
        var mSeen =
            Object.create(
                null
            );

        return (
            aValues ||
            []
        ).filter(
            function (
                vValue
            ) {
                var sValue =
                    String(
                        vValue ||
                        ""
                    );

                if (
                    !sValue ||
                    mSeen[
                        sValue
                    ]
                ) {
                    return false;
                }

                mSeen[
                    sValue
                ] = true;

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
            aValues ||
            []
        ).some(
            function (
                vValue
            ) {
                return (
                    norm(
                        vValue
                    ) ===
                    norm(
                        vFilter
                    )
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
            "en-US",
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
        if (
            !Number.isFinite(
                nValue
            )
        ) {
            return "Sin datos";
        }

        /*
         * Evita que por ejemplo
         * 5 MIN = 0.083 h
         * aparezca como 0 h.
         */

        if (
            Math.abs(
                nValue
            ) <
            10
        ) {
            return (
                formatNumber(
                    nValue,
                    2
                ) +
                " h"
            );
        }

        return (
            formatNumber(
                nValue,
                0
            ) +
            " h"
        );
    }

    function formatPct(
        nValue
    ) {
        return Number.isFinite(
            nValue
        )
            ? (
                formatNumber(
                    nValue,
                    1
                ) +
                "%"
            )
            : "Sin datos";
    }

    /* =========================================================
     * PERIODOS Y CATÁLOGOS
     * ========================================================= */

    function buildPeriods() {
        var aPeriods = [];
        var iYear;

        for (
            iYear = 2028;
            iYear >= 2021;
            iYear -= 1
        ) {
            aPeriods.push({
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

        return aPeriods;
    }

    function getCatalogRows(
        aCatalogs,
        sDomain
    ) {
        return (
            aCatalogs ||
            []
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
        sAllKey,
        sAllText
    ) {
        var aResult = [
            {
                key:
                    sAllKey,

                text:
                    sAllText,

                parentKey:
                    ""
            }
        ];

        var mSeen =
            Object.create(
                null
            );

        (
            aRows ||
            []
        ).forEach(
            function (
                oRow
            ) {
                var sKey =
                    String(
                        oRow.key ||
                        oRow.ValueId ||
                        oRow.ValueText ||
                        ""
                    );

                var sText =
                    String(
                        oRow.text ||
                        oRow.ValueText ||
                        oRow.ValueId ||
                        ""
                    );

                var sParent =
                    String(
                        oRow.parentKey ||
                        oRow.ParentValueId ||
                        ""
                    );

                var sDedup =
                    norm(
                        sKey +
                        "|" +
                        sText +
                        "|" +
                        sParent
                    );

                if (
                    !sKey ||
                    mSeen[
                        sDedup
                    ]
                ) {
                    return;
                }

                mSeen[
                    sDedup
                ] = true;

                aResult.push({
                    key:
                        sKey,

                    text:
                        sText,

                    parentKey:
                        sParent
                });
            }
        );

        return aResult;
    }

    function buildCatalogs(
        oRaw,
        aResourceRows,
        oFilters
    ) {
        var aHeadships =
            getCatalogRows(
                oRaw.catalogs,
                "HEADSHIP"
            );

        var aSupervisors =
            getCatalogRows(
                oRaw.catalogs,
                "SUPERVISOR"
            );

        var aShifts =
            getCatalogRows(
                oRaw.catalogs,
                "SHIFT"
            );

        /*
         * Si FilterCatalog no trae Jefatura,
         * se construye directamente desde
         * ResourceDaily cuando ABAP llene
         * HeadshipId/HeadshipName.
         */

        if (
            !aHeadships.length
        ) {
            aHeadships =
                uniqueBy(
                    aResourceRows
                        .filter(
                            function (
                                oRow
                            ) {
                                return (
                                    oRow.HeadshipId ||
                                    oRow.HeadshipName
                                );
                            }
                        )
                        .map(
                            function (
                                oRow
                            ) {
                                return {
                                    key:
                                        oRow.HeadshipId ||
                                        oRow.HeadshipName,

                                    text:
                                        oRow.HeadshipName ||
                                        oRow.HeadshipId
                                };
                            }
                        ),

                    function (
                        oItem
                    ) {
                        return (
                            oItem.key
                        );
                    }
                );
        }

        /*
         * Supervisores:
         * catálogo primero.
         * ResourceDaily como fallback.
         */

        if (
            !aSupervisors.length
        ) {
            aSupervisors =
                uniqueBy(
                    aResourceRows
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
                                        oRow.SupervisorId,

                                    parentKey:
                                        oRow.HeadshipId ||
                                        oRow.HeadshipName ||
                                        ""
                                };
                            }
                        ),

                    function (
                        oItem
                    ) {
                        return (
                            oItem.key +
                            "|" +
                            oItem.parentKey
                        );
                    }
                );
        }

        /*
         * Turnos:
         * sólo fallback desde ResourceDaily
         * cuando la fuente esté validada.
         */

        if (
            !aShifts.length
        ) {
            aShifts =
                uniqueBy(
                    aResourceRows
                        .filter(
                            function (
                                oRow
                            ) {
                                return (
                                    isTrue(
                                        oRow
                                            .ShiftSourceValidated
                                    ) &&
                                    (
                                        oRow.ShiftId ||
                                        oRow.ShiftName
                                    )
                                );
                            }
                        )
                        .map(
                            function (
                                oRow
                            ) {
                                return {
                                    key:
                                        oRow.ShiftId ||
                                        oRow.ShiftName,

                                    text:
                                        oRow.ShiftName ||
                                        oRow.ShiftId
                                };
                            }
                        ),

                    function (
                        oItem
                    ) {
                        return (
                            oItem.key
                        );
                    }
                );
        }

        var oCatalogs = {
            periods:
                buildPeriods(),

            headships:
                makeCatalog(
                    aHeadships,
                    "ALL",
                    "Todas"
                ),

            supervisorsAll:
                makeCatalog(
                    aSupervisors,
                    "ALL",
                    "Todos"
                ),

            shifts:
                makeCatalog(
                    aShifts,
                    "ALL",
                    "Todos"
                )
        };

        oCatalogs.supervisors =
            oCatalogs
                .supervisorsAll
                .filter(
                    function (
                        oItem,
                        iIndex
                    ) {
                        if (
                            iIndex ===
                                0 ||
                            isAll(
                                oFilters
                                    .headship
                            )
                        ) {
                            return true;
                        }

                        return (
                            !oItem.parentKey ||
                            matches(
                                oFilters
                                    .headship,
                                [
                                    oItem.parentKey
                                ]
                            )
                        );
                    }
                );

        return oCatalogs;
    }

    /* =========================================================
     * UMBRALES
     * ========================================================= */

    function getNumericParameter(
        aCatalogs,
        aDomains,
        nDefault
    ) {
        var oRow =
            (
                aCatalogs ||
                []
            ).find(
                function (
                    oCatalog
                ) {
                    return (
                        aDomains.indexOf(
                            norm(
                                oCatalog
                                    .FilterDomain
                            )
                        ) >= 0 &&
                        (
                            oCatalog.Active ===
                                undefined ||
                            oCatalog.Active ===
                                null ||
                            isTrue(
                                oCatalog.Active
                            )
                        ) &&
                        Number.isFinite(
                            Number(
                                oCatalog
                                    .NumericValue
                            )
                        )
                    );
                }
            );

        return oRow
            ? Number(
                oRow.NumericValue
            )
            : nDefault;
    }

    function getThresholds(
        aCatalogs
    ) {
        return {
            lowMax:
                getNumericParameter(
                    aCatalogs,

                    [
                        "UTILIZATION_LOW_MAX",
                        "SUPERVISOR_LOW_MAX"
                    ],

                    DEFAULT_LOW_MAX
                ),

            normalMax:
                getNumericParameter(
                    aCatalogs,

                    [
                        "UTILIZATION_NORMAL_MAX",
                        "SUPERVISOR_NORMAL_MAX"
                    ],

                    DEFAULT_NORMAL_MAX
                ),

            highMax:
                getNumericParameter(
                    aCatalogs,

                    [
                        "UTILIZATION_HIGH_MAX",
                        "SUPERVISOR_HIGH_MAX"
                    ],

                    DEFAULT_HIGH_MAX
                )
        };
    }

    function classifyUtilization(
        nPct,
        oThresholds
    ) {
        if (
            !Number.isFinite(
                nPct
            )
        ) {
            return "NO_DATA";
        }

        if (
            nPct >
            oThresholds.highMax
        ) {
            return "CRITICAL";
        }

        if (
            nPct >
            oThresholds.normalMax
        ) {
            return "HIGH";
        }

        if (
            nPct >
            oThresholds.lowMax
        ) {
            return "NORMAL";
        }

        return "LOW";
    }

    /* =========================================================
     * ÓRDENES Y ASIGNACIONES
     * ========================================================= */

    function buildOrderMap(
        aOrders
    ) {
        var mMap =
            Object.create(
                null
            );

        (
            aOrders ||
            []
        ).forEach(
            function (
                oOrder
            ) {
                var sOrderId =
                    String(
                        oOrder.OrderId ||
                        ""
                    );

                if (
                    sOrderId &&
                    !mMap[
                        sOrderId
                    ]
                ) {
                    mMap[
                        sOrderId
                    ] =
                        oOrder;
                }
            }
        );

        return mMap;
    }

    function buildAssignmentMaps(
        aAssignments
    ) {
        var mExact =
            Object.create(
                null
            );

        var mByOrder =
            Object.create(
                null
            );

        (
            aAssignments ||
            []
        ).forEach(
            function (
                oAssignment
            ) {
                var sOrderId =
                    String(
                        oAssignment.OrderId ||
                        ""
                    );

                var sExact =
                    [
                        sOrderId,

                        oAssignment.RoutingNumber ||
                        "",

                        oAssignment.OperationCounter ||
                        ""
                    ].join(
                        "|"
                    );

                if (
                    !mExact[
                        sExact
                    ]
                ) {
                    mExact[
                        sExact
                    ] = [];
                }

                mExact[
                    sExact
                ].push(
                    oAssignment
                );

                if (
                    !mByOrder[
                        sOrderId
                    ]
                ) {
                    mByOrder[
                        sOrderId
                    ] = [];
                }

                mByOrder[
                    sOrderId
                ].push(
                    oAssignment
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

    function getAssignmentsForOperation(
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
            ].join(
                "|"
            );

        if (
            oMaps.exact[
                sExact
            ] &&
            oMaps.exact[
                sExact
            ].length
        ) {
            return (
                oMaps.exact[
                    sExact
                ]
            );
        }

        return (
            oMaps.byOrder[
                sOrderId
            ] ||
            []
        );
    }

    /*
     * AFVV es la fuente actual.
     * No sumar KBED.
     */

    function isValidPlanOperation(
        oOperation
    ) {
        var sSource =
            norm(
                oOperation
                    .PlannedSourceCode
            );

        return (
            !sSource ||
            sSource.indexOf(
                "AFVV"
            ) === 0
        );
    }

    /* =========================================================
     * RESOURCE DAILY
     * ========================================================= */

    function buildResourceRowsById(
        aRows
    ) {
        var mRows =
            Object.create(
                null
            );

        (
            aRows ||
            []
        ).forEach(
            function (
                oRow
            ) {
                var sResourceId =
                    String(
                        oRow.ResourceId ||
                        ""
                    );

                if (!sResourceId) {
                    return;
                }

                if (
                    !mRows[
                        sResourceId
                    ]
                ) {
                    mRows[
                        sResourceId
                    ] = [];
                }

                mRows[
                    sResourceId
                ].push(
                    oRow
                );
            }
        );

        Object.keys(
            mRows
        ).forEach(
            function (
                sResourceId
            ) {
                mRows[
                    sResourceId
                ].sort(
                    function (
                        a,
                        b
                    ) {
                        var oA =
                            parseODataDate(
                                a.WorkDate
                            );

                        var oB =
                            parseODataDate(
                                b.WorkDate
                            );

                        return (
                            (
                                oA
                                    ? oA.getTime()
                                    : 0
                            ) -
                            (
                                oB
                                    ? oB.getTime()
                                    : 0
                            )
                        );
                    }
                );
            }
        );

        return mRows;
    }

    /*
     * Busca la fila de ResourceDaily
     * correspondiente a la fecha de la operación.
     *
     * Si no encuentra mismo día,
     * utiliza el último registro disponible
     * dentro del periodo.
     */

    function resolveResourceContext(
        mRowsByResource,
        sResourceId,
        vOperationDate
    ) {
        var aRows =
            mRowsByResource[
                String(
                    sResourceId ||
                    ""
                )
            ] || [];

        var oOperationDate =
            parseODataDate(
                vOperationDate
            );

        var oSameDay;

        if (
            !aRows.length
        ) {
            return null;
        }

        if (oOperationDate) {
            oSameDay =
                aRows.find(
                    function (
                        oRow
                    ) {
                        return sameDay(
                            parseODataDate(
                                oRow.WorkDate
                            ),

                            oOperationDate
                        );
                    }
                );

            if (oSameDay) {
                return oSameDay;
            }
        }

        return (
            aRows[
                aRows.length -
                1
            ]
        );
    }

    function resourceRowMatchesFilters(
        oRow,
        oFilters
    ) {
        if (!oRow) {
            return false;
        }

        return (
            matches(
                oFilters.headship,

                [
                    oRow.HeadshipId,
                    oRow.HeadshipName
                ]
            ) &&

            matches(
                oFilters.supervisor,

                [
                    oRow.SupervisorId,
                    oRow.SupervisorName
                ]
            ) &&

            matches(
                oFilters.shift,

                [
                    oRow.ShiftId,
                    oRow.ShiftName
                ]
            )
        );
    }

    /* =========================================================
     * CUMPLIMIENTO
     * ========================================================= */

    function getComplianceTarget(
        aCatalogs,
        sHeadship
    ) {
        var aRows =
            getCatalogRows(
                aCatalogs,
                "COMPLIANCE_TARGET"
            );

        var oScoped =
            aRows.find(
                function (
                    oRow
                ) {
                    return (
                        norm(
                            oRow.ScopeTypeCode
                        ) ===
                            "HEADSHIP" &&
                        matches(
                            sHeadship,

                            [
                                oRow.ScopeId,
                                oRow.ValueId
                            ]
                        )
                    );
                }
            );

        var oGlobal =
            aRows.find(
                function (
                    oRow
                ) {
                    return (
                        !oRow.ScopeTypeCode ||
                        norm(
                            oRow.ScopeTypeCode
                        ) ===
                            "GLOBAL"
                    );
                }
            );

        var oSelected =
            oScoped ||
            oGlobal ||
            aRows[0];

        var nValue =
            oSelected
                ? Number(
                    oSelected
                        .NumericValue
                )
                : NaN;

        return Number.isFinite(
            nValue
        )
            ? nValue
            : DEFAULT_COMPLIANCE_TARGET;
    }

    function getExecutedCodes(
        aCatalogs
    ) {
        var aRows =
            getCatalogRows(
                aCatalogs,
                "COMPLIANCE_EXECUTED_STATUS"
            );

        if (
            !aRows.length
        ) {
            return (
                DEFAULT_EXECUTED_STATUS
                    .slice()
            );
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

    function isExecutedOrder(
        oOrder,
        aCodes
    ) {
        var sAppStatus =
            norm(
                oOrder.AppStatusCode
            );

        var sText =
            norm(
                oOrder.StatusText
            );

        if (
            aCodes
                .map(
                    norm
                )
                .indexOf(
                    sAppStatus
                ) >= 0
        ) {
            return true;
        }

        return (
            sText.indexOf(
                "FINALIZAD"
            ) >= 0 ||

            sText.indexOf(
                "EJECUTAD"
            ) >= 0
        );
    }

    /* =========================================================
     * MATERIALES
     * ========================================================= */

    function initialMaterials() {
        return [
            0,
            1,
            2,
            3
        ].map(
            function () {
                return {
                    name:
                        "Sin datos",

                    percentage:
                        "Sin datos",

                    barWidth:
                        "0%",

                    status:
                        "Sin datos",

                    statusIcon:
                        "sap-icon://question-mark",

                    rawPct:
                        null
                };
            }
        );
    }

    /*
     * Regla:
     *
     * consumo neto =
     * CONSUMPTION - RETURN
     *
     * consumo vs plan =
     * consumo neto / PlannedQuantity * 100
     *
     * No sumar unidades incompatibles.
     */

    function mapMaterials(
        oRaw,
        oFilters,
        mScopeOrderIds
    ) {
        var oStart =
            parseInputDate(
                oFilters.dateFrom
            );

        var oEnd =
            parseInputDate(
                oFilters.dateTo
            );

        var mMaterialByRequirement =
            Object.create(
                null
            );

        var mGroups =
            Object.create(
                null
            );

        uniqueBy(
            oRaw.materials ||
            [],

            function (
                oMaterial
            ) {
                return (
                    oMaterial
                        .MaterialRequirementId
                );
            }
        )
            .forEach(
                function (
                    oMaterial
                ) {
                    var sRequirementId =
                        String(
                            oMaterial
                                .MaterialRequirementId ||
                            ""
                        );

                    var sOrderId =
                        String(
                            oMaterial.OrderId ||
                            ""
                        );

                    var sCategory =
                        String(
                            oMaterial
                                .MaterialCategoryName ||
                            oMaterial
                                .MaterialCategoryCode ||
                            "Sin categoría"
                        );

                    var sUnit =
                        norm(
                            oMaterial
                                .BaseUnitCode
                        );

                    var nPlan =
                        Number(
                            oMaterial
                                .PlannedQuantity
                        );

                    var sGroupKey =
                        sCategory +
                        "|" +
                        sUnit;

                    if (
                        !sRequirementId ||
                        !mScopeOrderIds[
                            sOrderId
                        ] ||
                        !Number.isFinite(
                            nPlan
                        )
                    ) {
                        return;
                    }

                    /*
                     * No descartamos
                     * IsPublishable=false
                     * mientras la gobernanza
                     * siga pendiente.
                     */

                    mMaterialByRequirement[
                        sRequirementId
                    ] =
                        oMaterial;

                    if (
                        !mGroups[
                            sGroupKey
                        ]
                    ) {
                        mGroups[
                            sGroupKey
                        ] = {
                            name:
                                sCategory,

                            unit:
                                sUnit,

                            plan:
                                0,

                            net:
                                0
                        };
                    }

                    mGroups[
                        sGroupKey
                    ].plan +=
                        nPlan;
                }
            );

        (
            oRaw.materialMovements ||
            []
        ).forEach(
            function (
                oMovement
            ) {
                var sRequirementId =
                    String(
                        oMovement
                            .MaterialRequirementId ||
                        ""
                    );

                var oMaterial =
                    mMaterialByRequirement[
                        sRequirementId
                    ];

                var sDirection =
                    norm(
                        oMovement
                            .MovementDirectionCode
                    );

                var sMovementUnit =
                    norm(
                        oMovement
                            .MovementUnitCode
                    );

                var nQty =
                    Number(
                        oMovement
                            .MovementQuantity
                    );

                var sCategory;
                var sBaseUnit;
                var sGroupKey;
                var nSigned;

                if (
                    !oMaterial ||
                    isTrue(
                        oMovement.IsReversal
                    ) ||
                    !Number.isFinite(
                        nQty
                    ) ||
                    !isDateInRange(
                        oMovement.MovementDate,
                        oStart,
                        oEnd
                    )
                ) {
                    return;
                }

                sBaseUnit =
                    norm(
                        oMaterial
                            .BaseUnitCode
                    );

                /*
                 * Sin conversión aprobada:
                 * no mezclar unidades distintas.
                 */

                if (
                    sMovementUnit &&
                    sBaseUnit &&
                    sMovementUnit !==
                        sBaseUnit
                ) {
                    return;
                }

                if (
                    sDirection ===
                    "CONSUMPTION"
                ) {
                    nSigned =
                        nQty;
                } else if (
                    sDirection ===
                    "RETURN"
                ) {
                    nSigned =
                        -nQty;
                } else {
                    return;
                }

                sCategory =
                    String(
                        oMaterial
                            .MaterialCategoryName ||
                        oMaterial
                            .MaterialCategoryCode ||
                        "Sin categoría"
                    );

                sGroupKey =
                    sCategory +
                    "|" +
                    sBaseUnit;

                if (
                    mGroups[
                        sGroupKey
                    ]
                ) {
                    mGroups[
                        sGroupKey
                    ].net +=
                        nSigned;
                }
            }
        );

        var aResult =
            Object.keys(
                mGroups
            )
                .map(
                    function (
                        sKey
                    ) {
                        var oGroup =
                            mGroups[
                                sKey
                            ];

                        var nPct =
                            oGroup.plan >
                            0
                                ? (
                                    oGroup.net /
                                    oGroup.plan
                                ) * 100
                                : null;

                        var sStatus;
                        var sStatusIcon;

                        if (
                            !Number.isFinite(
                                nPct
                            )
                        ) {
                            sStatus =
                                "Sin datos";

                            sStatusIcon =
                                "sap-icon://question-mark";
                        } else if (
                            nPct >
                            100
                        ) {
                            sStatus =
                                "Sobre plan";

                            sStatusIcon =
                                "sap-icon://message-error";
                        } else if (
                            nPct >=
                            95
                        ) {
                            sStatus =
                                "Cerca del plan";

                            sStatusIcon =
                                "sap-icon://message-warning";
                        } else {
                            sStatus =
                                "En control";

                            sStatusIcon =
                                "sap-icon://message-success";
                        }

                        return {
                            name:
                                oGroup.name,

                            percentage:
                                formatPct(
                                    nPct
                                ),

                            barWidth:
                                Number.isFinite(
                                    nPct
                                )
                                    ? (
                                        Math.min(
                                            100,

                                            Math.max(
                                                0,
                                                nPct
                                            )
                                        ) +
                                        "%"
                                    )
                                    : "0%",

                            status:
                                sStatus,

                            statusIcon:
                                sStatusIcon,

                            rawPct:
                                nPct
                        };
                    }
                )
                .filter(
                    function (
                        oItem
                    ) {
                        return (
                            Number.isFinite(
                                oItem.rawPct
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
                            b.rawPct -
                            a.rawPct
                        );
                    }
                )
                .slice(
                    0,
                    4
                );

        while (
            aResult.length <
            4
        ) {
            aResult.push(
                initialMaterials()[0]
            );
        }

        return aResult;
    }

    /* =========================================================
     * MAPPER PRINCIPAL
     * ========================================================= */

    function mapData(
        oRawData,
        mFilters
    ) {
        var oRaw =
            oRawData ||
            {};

        var oFilters =
            Object.assign(
                {
                    period:
                        "2026",

                    dateFrom:
                        "01/01/2026",

                    dateTo:
                        "31/12/2026",

                    headship:
                        "ALL",

                    supervisor:
                        "ALL",

                    shift:
                        "ALL"
                },

                mFilters ||
                {}
            );

        var oStart =
            parseInputDate(
                oFilters.dateFrom
            );

        var oEnd =
            parseInputDate(
                oFilters.dateTo
            );

        /* =====================================================
         * RESOURCE DAILY DEL PERIODO
         * ===================================================== */

        var aResourcePeriod =
            (
                oRaw.resources ||
                []
            ).filter(
                function (
                    oRow
                ) {
                    return (
                        isDateInRange(
                            oRow.WorkDate,
                            oStart,
                            oEnd
                        )
                    );
                }
            );

        var oCatalogs =
            buildCatalogs(
                oRaw,
                aResourcePeriod,
                oFilters
            );

        /*
         * Filtros organizativos.
         *
         * ALL no exige que ABAP tenga
         * Headship/Supervisor/Shift.
         */

        var aFilteredResourceRows =
            aResourcePeriod
                .filter(
                    function (
                        oRow
                    ) {
                        return (
                            resourceRowMatchesFilters(
                                oRow,
                                oFilters
                            )
                        );
                    }
                );

        var mRowsByResource =
            buildResourceRowsById(
                aFilteredResourceRows
            );

        var aResourceIds =
            uniqueStrings(
                aFilteredResourceRows
                    .map(
                        function (
                            oRow
                        ) {
                            return (
                                oRow.ResourceId
                            );
                        }
                    )
            );

        var mSelectedResourceIds =
            Object.create(
                null
            );

        var mSupervisorStats =
            Object.create(
                null
            );

        var mResourceCapacity =
            Object.create(
                null
            );

        var mResourceLoad =
            Object.create(
                null
            );

        aResourceIds
            .forEach(
                function (
                    sResourceId
                ) {
                    mSelectedResourceIds[
                        sResourceId
                    ] = true;

                    mResourceCapacity[
                        sResourceId
                    ] = {
                        value:
                            0,

                        valid:
                            false
                    };

                    mResourceLoad[
                        sResourceId
                    ] =
                        0;
                }
            );

        /*
         * =====================================================
         * SUPERVISORES + CAPACIDAD
         * =====================================================
         */

        aFilteredResourceRows
            .forEach(
                function (
                    oRow
                ) {
                    var sResourceId =
                        String(
                            oRow.ResourceId ||
                            ""
                        );

                    var sSupervisorId =
                        String(
                            oRow.SupervisorId ||
                            oRow.SupervisorName ||
                            ""
                        );

                    var nCapacity =
                        Number(
                            oRow.CapacityHours
                        );

                    if (
                        sResourceId &&
                        isTrue(
                            oRow
                                .CapacitySourceValidated
                        ) &&
                        Number.isFinite(
                            nCapacity
                        )
                    ) {
                        mResourceCapacity[
                            sResourceId
                        ].valid =
                            true;

                        mResourceCapacity[
                            sResourceId
                        ].value +=
                            nCapacity;
                    }

                    if (
                        !sSupervisorId
                    ) {
                        return;
                    }

                    if (
                        !mSupervisorStats[
                            sSupervisorId
                        ]
                    ) {
                        mSupervisorStats[
                            sSupervisorId
                        ] = {
                            id:
                                sSupervisorId,

                            name:
                                oRow.SupervisorName ||
                                oRow.SupervisorId ||
                                sSupervisorId,

                            resources:
                                Object.create(
                                    null
                                ),

                            capacity:
                                0,

                            capacityValid:
                                false,

                            load:
                                0,

                            availabilityKnown:
                                false,

                            activeResourceIds:
                                Object.create(
                                    null
                                )
                        };
                    }

                    mSupervisorStats[
                        sSupervisorId
                    ].resources[
                        sResourceId
                    ] =
                        true;

                    if (
                        isTrue(
                            oRow
                                .CapacitySourceValidated
                        ) &&
                        Number.isFinite(
                            nCapacity
                        )
                    ) {
                        mSupervisorStats[
                            sSupervisorId
                        ].capacityValid =
                            true;

                        mSupervisorStats[
                            sSupervisorId
                        ].capacity +=
                            nCapacity;
                    }

                    if (
                        oRow
                            .AvailabilityStatusCode
                    ) {
                        mSupervisorStats[
                            sSupervisorId
                        ].availabilityKnown =
                            true;

                        /*
                         * Cualquier estado informado
                         * diferente de INACTIVO
                         * se considera recurso disponible
                         * para el conteo provisional.
                         */

                        if (
                            norm(
                                oRow
                                    .AvailabilityStatusCode
                            ).indexOf(
                                "INACT"
                            ) <
                            0
                        ) {
                            mSupervisorStats[
                                sSupervisorId
                            ].activeResourceIds[
                                sResourceId
                            ] = true;
                        }
                    }
                }
            );

        /* =====================================================
         * ÓRDENES / ASIGNACIONES / OPERACIONES
         * ===================================================== */

        var mOrderMap =
            buildOrderMap(
                oRaw.orders ||
                []
            );

        var oAssignmentMaps =
            buildAssignmentMaps(
                oRaw.orderResources ||
                []
            );

        var aOperations =
            uniqueBy(
                (
                    oRaw.operations ||
                    []
                ).filter(
                    isValidPlanOperation
                ),

                function (
                    oOperation
                ) {
                    return (
                        oOperation.OperationKey ||
                        [
                            oOperation.OrderId,
                            oOperation.RoutingNumber,
                            oOperation.OperationCounter
                        ].join(
                            "|"
                        )
                    );
                }
            );

        var bOrganizationFilterApplied =
            !isAll(
                oFilters.headship
            ) ||
            !isAll(
                oFilters.supervisor
            ) ||
            !isAll(
                oFilters.shift
            );

        var mScopeOrderIds =
            Object.create(
                null
            );

        /*
         * Sin filtro organizativo:
         * todas las Orders devueltas
         * pertenecen al periodo.
         */

        if (
            !bOrganizationFilterApplied
        ) {
            (
                oRaw.orders ||
                []
            ).forEach(
                function (
                    oOrder
                ) {
                    if (
                        oOrder.OrderId
                    ) {
                        mScopeOrderIds[
                            oOrder.OrderId
                        ] = true;
                    }
                }
            );
        }

        /*
         * Con filtro organizativo:
         * delimitamos OT por ResourceId.
         */

        if (
            bOrganizationFilterApplied
        ) {
            (
                oRaw.orderResources ||
                []
            ).forEach(
                function (
                    oAssignment
                ) {
                    var sResourceId =
                        String(
                            oAssignment.ResourceId ||
                            ""
                        );

                    if (
                        mSelectedResourceIds[
                            sResourceId
                        ] &&
                        oAssignment.OrderId
                    ) {
                        mScopeOrderIds[
                            oAssignment.OrderId
                        ] = true;
                    }
                }
            );
        }

        var mServiceLoad =
            Object.create(
                null
            );

        var nTotalLoad =
            0;

        var iIncludedOperations =
            0;

        /*
         * Cada operación se suma UNA vez
         * al total ejecutivo.
         *
         * Si tiene varios recursos,
         * la carga se distribuye entre ellos
         * para no duplicarla.
         */

        aOperations
            .forEach(
                function (
                    oOperation
                ) {
                    var sOrderId =
                        String(
                            oOperation.OrderId ||
                            ""
                        );

                    var nHours =
                        toHours(
                            oOperation
                                .PlannedValueOriginal,

                            oOperation
                                .PlannedUnitOriginal
                        );

                    var aAssignments;
                    var aSelectedAssignments;
                    var bInclude;

                    if (
                        !Number.isFinite(
                            nHours
                        )
                    ) {
                        return;
                    }

                    aAssignments =
                        getAssignmentsForOperation(
                            oOperation,
                            oAssignmentMaps
                        );

                    aSelectedAssignments =
                        aAssignments.filter(
                            function (
                                oAssignment
                            ) {
                                var sResourceId =
                                    String(
                                        oAssignment.ResourceId ||
                                        ""
                                    );

                                var oContext =
                                    resolveResourceContext(
                                        mRowsByResource,

                                        sResourceId,

                                        oOperation
                                            .PlannedStartDate
                                    );

                                return (
                                    mSelectedResourceIds[
                                        sResourceId
                                    ] &&
                                    resourceRowMatchesFilters(
                                        oContext,
                                        oFilters
                                    )
                                );
                            }
                        );

                    bInclude =
                        bOrganizationFilterApplied
                            ? (
                                aSelectedAssignments.length >
                                0
                            )
                            : Boolean(
                                mOrderMap[
                                    sOrderId
                                ]
                            );

                    if (
                        !bInclude
                    ) {
                        return;
                    }

                    nTotalLoad +=
                        nHours;

                    iIncludedOperations +=
                        1;

                    mScopeOrderIds[
                        sOrderId
                    ] = true;

                    /*
                     * Tipo de servicio
                     */

                    if (
                        mOrderMap[
                            sOrderId
                        ]
                    ) {
                        var sService =
                            String(
                                mOrderMap[
                                    sOrderId
                                ].OrderTypeText ||
                                mOrderMap[
                                    sOrderId
                                ].OrderTypeCode ||
                                "Sin datos"
                            );

                        mServiceLoad[
                            sService
                        ] =
                            (
                                mServiceLoad[
                                    sService
                                ] ||
                                0
                            ) +
                            nHours;
                    }

                    /*
                     * Distribución por recurso.
                     */

                    if (
                        aSelectedAssignments.length
                    ) {
                        var aResourceAssignments =
                            uniqueBy(
                                aSelectedAssignments,

                                function (
                                    oAssignment
                                ) {
                                    return (
                                        oAssignment
                                            .ResourceId
                                    );
                                }
                            );

                        var nShare =
                            nHours /
                            aResourceAssignments
                                .length;

                        aResourceAssignments
                            .forEach(
                                function (
                                    oAssignment
                                ) {
                                    var sResourceId =
                                        String(
                                            oAssignment.ResourceId ||
                                            ""
                                        );

                                    var oContext =
                                        resolveResourceContext(
                                            mRowsByResource,

                                            sResourceId,

                                            oOperation
                                                .PlannedStartDate
                                        );

                                    var sSupervisorId;

                                    if (
                                        !oContext
                                    ) {
                                        return;
                                    }

                                    mResourceLoad[
                                        sResourceId
                                    ] =
                                        (
                                            mResourceLoad[
                                                sResourceId
                                            ] ||
                                            0
                                        ) +
                                        nShare;

                                    sSupervisorId =
                                        String(
                                            oContext.SupervisorId ||
                                            oContext.SupervisorName ||
                                            ""
                                        );

                                    if (
                                        sSupervisorId &&
                                        mSupervisorStats[
                                            sSupervisorId
                                        ]
                                    ) {
                                        mSupervisorStats[
                                            sSupervisorId
                                        ].load +=
                                            nShare;
                                    }
                                }
                            );
                    }
                }
            );

        /* =====================================================
         * SUPERVISORES ACTIVOS
         * ===================================================== */

        var aSupervisorIds =
            Object.keys(
                mSupervisorStats
            );

        var iTotalSupervisors =
            aSupervisorIds.length;

        var bAvailabilityAvailable =
            aSupervisorIds.some(
                function (
                    sSupervisorId
                ) {
                    return (
                        mSupervisorStats[
                            sSupervisorId
                        ].availabilityKnown
                    );
                }
            );

        var iActiveSupervisors =
            bAvailabilityAvailable
                ? aSupervisorIds
                    .filter(
                        function (
                            sSupervisorId
                        ) {
                            return (
                                Object.keys(
                                    mSupervisorStats[
                                        sSupervisorId
                                    ].activeResourceIds
                                ).length >
                                0
                            );
                        }
                    ).length
                : null;

        /* =====================================================
         * CAPACIDAD
         * ===================================================== */

        var bCapacityAvailable =
            aFilteredResourceRows
                .some(
                    function (
                        oRow
                    ) {
                        return isTrue(
                            oRow
                                .CapacitySourceValidated
                        );
                    }
                );

        var nTotalCapacity =
            bCapacityAvailable
                ? aFilteredResourceRows
                    .reduce(
                        function (
                            nTotal,
                            oRow
                        ) {
                            var nCapacity =
                                Number(
                                    oRow
                                        .CapacityHours
                                );

                            if (
                                isTrue(
                                    oRow
                                        .CapacitySourceValidated
                                ) &&
                                Number.isFinite(
                                    nCapacity
                                )
                            ) {
                                return (
                                    nTotal +
                                    nCapacity
                                );
                            }

                            return nTotal;
                        },

                        0
                    )
                : null;

        /* =====================================================
         * RECURSOS SOBRE CAPACIDAD
         * ===================================================== */

        var iOverCapacity =
            bCapacityAvailable
                ? aResourceIds
                    .filter(
                        function (
                            sResourceId
                        ) {
                            var oCapacity =
                                mResourceCapacity[
                                    sResourceId
                                ];

                            var nLoad =
                                mResourceLoad[
                                    sResourceId
                                ] ||
                                0;

                            return (
                                oCapacity &&
                                oCapacity.valid &&
                                oCapacity.value >
                                    0 &&
                                nLoad >
                                    oCapacity.value
                            );
                        }
                    ).length
                : null;

        /* =====================================================
         * UTILIZACIÓN POR SUPERVISOR
         * ===================================================== */

        var oThresholds =
            getThresholds(
                oRaw.catalogs ||
                []
            );

        var oUtilization = {
            critical:
                [],

            high:
                [],

            normal:
                [],

            low:
                []
        };

        aSupervisorIds
            .forEach(
                function (
                    sSupervisorId
                ) {
                    var oSupervisor =
                        mSupervisorStats[
                            sSupervisorId
                        ];

                    var nUtilization =
                        oSupervisor
                            .capacityValid &&
                        oSupervisor
                            .capacity >
                            0
                            ? (
                                oSupervisor.load /
                                oSupervisor.capacity
                            ) * 100
                            : null;

                    var sClass =
                        classifyUtilization(
                            nUtilization,
                            oThresholds
                        );

                    if (
                        sClass ===
                        "NO_DATA"
                    ) {
                        return;
                    }

                    var oTile = {
                        name:
                            oSupervisor.name,

                        percentage:
                            formatPct(
                                nUtilization
                            ),

                        resources:
                            Object.keys(
                                oSupervisor.resources
                            ).length,

                        rawPercentage:
                            nUtilization
                    };

                    if (
                        sClass ===
                        "CRITICAL"
                    ) {
                        oUtilization
                            .critical
                            .push(
                                oTile
                            );
                    } else if (
                        sClass ===
                        "HIGH"
                    ) {
                        oUtilization
                            .high
                            .push(
                                oTile
                            );
                    } else if (
                        sClass ===
                        "NORMAL"
                    ) {
                        oUtilization
                            .normal
                            .push(
                                oTile
                            );
                    } else {
                        oUtilization
                            .low
                            .push(
                                oTile
                            );
                    }
                }
            );

        [
            "critical",
            "high",
            "normal",
            "low"
        ].forEach(
            function (
                sBucket
            ) {
                oUtilization[
                    sBucket
                ].sort(
                    function (
                        a,
                        b
                    ) {
                        return (
                            b.rawPercentage -
                            a.rawPercentage
                        );
                    }
                );
            }
        );

        var oUtilizationMeta = {
            criticalCount:
                String(
                    oUtilization
                        .critical
                        .length
                ),

            highCount:
                String(
                    oUtilization
                        .high
                        .length
                ),

            normalCount:
                String(
                    oUtilization
                        .normal
                        .length
                ),

            lowCount:
                String(
                    oUtilization
                        .low
                        .length
                ),

            criticalRange:
                "> " +
                formatNumber(
                    oThresholds.highMax,
                    0
                ) +
                "%",

            highRange:
                formatNumber(
                    oThresholds.normalMax +
                    1,
                    0
                ) +
                "% - " +
                formatNumber(
                    oThresholds.highMax,
                    0
                ) +
                "%",

            normalRange:
                formatNumber(
                    oThresholds.lowMax +
                    1,
                    0
                ) +
                "% - " +
                formatNumber(
                    oThresholds.normalMax,
                    0
                ) +
                "%",

            lowRange:
                "0% - " +
                formatNumber(
                    oThresholds.lowMax,
                    0
                ) +
                "%"
        };

        /* =====================================================
         * CUMPLIMIENTO
         * ===================================================== */

        var aScopeOrders =
            Object.keys(
                mScopeOrderIds
            )
                .map(
                    function (
                        sOrderId
                    ) {
                        return (
                            mOrderMap[
                                sOrderId
                            ]
                        );
                    }
                )
                .filter(
                    Boolean
                );

        var aExecutedCodes =
            getExecutedCodes(
                oRaw.catalogs ||
                []
            );

        var bStatusAvailable =
            aScopeOrders
                .some(
                    function (
                        oOrder
                    ) {
                        return Boolean(
                            oOrder.AppStatusCode ||
                            oOrder.SapUserStatusCode ||
                            oOrder.StatusText
                        );
                    }
                );

        var nCompliance =
            aScopeOrders.length >
                0 &&
            bStatusAvailable
                ? (
                    aScopeOrders
                        .filter(
                            function (
                                oOrder
                            ) {
                                return (
                                    isExecutedOrder(
                                        oOrder,
                                        aExecutedCodes
                                    )
                                );
                            }
                        ).length /
                    aScopeOrders.length
                ) * 100
                : null;

        var nComplianceTarget =
            getComplianceTarget(
                oRaw.catalogs ||
                [],
                oFilters.headship
            );

        var nDifference =
            Number.isFinite(
                nCompliance
            )
                ? (
                    nCompliance -
                    nComplianceTarget
                )
                : null;

        /* =====================================================
         * PRESIÓN POR SERVICIO
         * ===================================================== */

        var aServiceTypes =
            Object.keys(
                mServiceLoad
            )
                .map(
                    function (
                        sService
                    ) {
                        var nHours =
                            mServiceLoad[
                                sService
                            ];

                        var nPct =
                            nTotalLoad >
                            0
                                ? (
                                    nHours /
                                    nTotalLoad
                                ) * 100
                                : null;

                        return {
                            label:
                                sService,

                            percentage:
                                formatPct(
                                    nPct
                                ),

                            hours:
                                formatHours(
                                    nHours
                                ),

                            rawHours:
                                nHours,

                            rawPct:
                                nPct
                        };
                    }
                )
                .sort(
                    function (
                        a,
                        b
                    ) {
                        return (
                            b.rawHours -
                            a.rawHours
                        );
                    }
                )
                .slice(
                    0,
                    3
                );

        while (
            aServiceTypes.length <
            3
        ) {
            aServiceTypes.push({
                label:
                    "Sin datos",

                percentage:
                    "Sin datos",

                hours:
                    "Sin datos",

                rawHours:
                    0,

                rawPct:
                    null
            });
        }

        /* =====================================================
         * MATERIALES
         * ===================================================== */

        var aMaterials =
            mapMaterials(
                oRaw,
                oFilters,
                mScopeOrderIds
            );

        console.log(
            "[VJ MAPPER] Resultado:",
            {
                period:
                    oFilters.period,

                dateFrom:
                    oFilters.dateFrom,

                dateTo:
                    oFilters.dateTo,

                resourceRowsPeriod:
                    aResourcePeriod
                        .length,

                resourceRowsFiltered:
                    aFilteredResourceRows
                        .length,

                resources:
                    aResourceIds.length,

                supervisors:
                    aSupervisorIds.length,

                orders:
                    aScopeOrders.length,

                operationsRaw:
                    (
                        oRaw.operations ||
                        []
                    ).length,

                operationsIncluded:
                    iIncludedOperations,

                totalLoad:
                    nTotalLoad,

                totalCapacity:
                    nTotalCapacity,

                materials:
                    (
                        oRaw.materials ||
                        []
                    ).length,

                movements:
                    (
                        oRaw
                            .materialMovements ||
                        []
                    ).length
            }
        );

        return {
            catalogs:
                oCatalogs,

            summary: {
                activeSupervisors:
                    Number.isFinite(
                        iActiveSupervisors
                    )
                        ? String(
                            iActiveSupervisors
                        )
                        : "Sin datos",

                activeSupervisorsHelper:
                    iTotalSupervisors >
                    0
                        ? (
                            "de " +
                            iTotalSupervisors
                        )
                        : "",

                resourcesTotal:
                    aResourceIds.length >
                    0
                        ? String(
                            aResourceIds.length
                        )
                        : "Sin datos",

                capacityAvailable:
                    Number.isFinite(
                        nTotalCapacity
                    )
                        ? formatHours(
                            nTotalCapacity
                        )
                        : "Sin datos",

                plannedLoad:
                    iIncludedOperations >
                    0
                        ? formatHours(
                            nTotalLoad
                        )
                        : "Sin datos",

                overCapacity:
                    Number.isFinite(
                        iOverCapacity
                    )
                        ? String(
                            iOverCapacity
                        )
                        : "Sin datos",

                compliance:
                    formatPct(
                        nCompliance
                    ),

                complianceMeta:
                    "Meta: " +
                    formatNumber(
                        nComplianceTarget,
                        0
                    ) +
                    "%",

                complianceAlert:
                    Number.isFinite(
                        nDifference
                    )
                        ? (
                            nDifference <
                            0
                                ? (
                                    formatNumber(
                                        Math.abs(
                                            nDifference
                                        ),
                                        1
                                    ) +
                                    " puntos por debajo de la meta"
                                )
                                : nDifference >
                                    0
                                    ? (
                                        formatNumber(
                                            nDifference,
                                            1
                                        ) +
                                        " puntos sobre la meta"
                                    )
                                    : "En la meta"
                        )
                        : ""
            },

            utilization:
                oUtilization,

            utilizationMeta:
                oUtilizationMeta,

            serviceTypes:
                aServiceTypes,

            serviceTotalHours:
                iIncludedOperations >
                0
                    ? formatHours(
                        nTotalLoad
                    )
                    : "Sin datos",

            materials:
                aMaterials,

            meta: {
                capacityAvailable:
                    bCapacityAvailable,

                availabilityAvailable:
                    bAvailabilityAvailable,

                statusAvailable:
                    bStatusAvailable,

                organizationFilterApplied:
                    bOrganizationFilterApplied
            }
        };
    }

    return {
        mapData:
            mapData,

        mapMaterials:
            mapMaterials,

        toHours:
            toHours
    };
});