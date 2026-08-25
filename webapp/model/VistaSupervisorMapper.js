sap.ui.define([], function () {
    "use strict";

    var DEFAULT_LOW_MAX = 70;
    var DEFAULT_NORMAL_MAX = 100;
    var DEFAULT_HIGH_MAX = 120;

    var DEFAULT_COMPLIANCE_TARGET = 85;

    var DEFAULT_EXECUTED_STATUS = [
        "0300"
    ];

    /* =========================================================
     * GENERALES
     * ========================================================= */

    function norm(vValue) {
        return String(
            vValue || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toUpperCase();
    }

    function isTrue(vValue) {
        var sValue =
            norm(vValue);

        return (
            vValue === true ||
            sValue === "TRUE" ||
            sValue === "X" ||
            sValue === "1"
        );
    }

    function isAll(vValue) {
        return [
            "",
            "ALL",
            "TODOS",
            "TODAS"
        ].indexOf(
            norm(vValue)
        ) >= 0;
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
                    Number(aMatch[1])
                )
                : new Date(vValue);

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
    }

    function inRange(
        vValue,
        oStart,
        oEnd
    ) {
        var oDate =
            parseODataDate(vValue);

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
                oDate < oStart
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
                oDate > oEnd
            ) {
                return false;
            }
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
            return nValue / 60;
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
            aItems ||
            []
        ).filter(
            function (oItem) {
                var sKey =
                    String(
                        fnKey(oItem) ||
                        ""
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
            aValues ||
            []
        ).filter(
            function (vValue) {
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
            isAll(vFilter)
        ) {
            return true;
        }

        return (
            aValues ||
            []
        ).some(
            function (vValue) {
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

        if (
            Math.abs(nValue) < 10
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

    function formatQuantity(
        nValue
    ) {
        if (
            !Number.isFinite(
                nValue
            )
        ) {
            return "Sin datos";
        }

        if (
            Math.abs(
                nValue % 1
            ) < 0.000001
        ) {
            return formatNumber(
                nValue,
                0
            );
        }

        return formatNumber(
            nValue,
            2
        );
    }

    /* =========================================================
     * PERIODOS
     * ========================================================= */

    function buildPeriods() {
        var aPeriods = [];
        var iYear;

        for (
            iYear = 2028;
            iYear >= 2021;
            iYear--
        ) {
            aPeriods.push({
                key:
                    String(iYear),

                text:
                    String(iYear)
            });
        }

        return aPeriods;
    }

    /* =========================================================
     * CATÁLOGOS
     * ========================================================= */

    function getCatalogRows(
        aCatalogs,
        sDomain
    ) {
        return (
            aCatalogs ||
            []
        )
            .filter(
                function (oRow) {
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
                function (a, b) {
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
                    sAllText
            }
        ];

        var mSeen =
            Object.create(null);

        (
            aRows ||
            []
        ).forEach(
            function (oRow) {
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

                var sDedup =
                    norm(
                        sKey +
                        "|" +
                        sText
                    );

                if (
                    !sKey ||
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

    function buildCatalogs(
        oRaw,
        aResourceRows
    ) {
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
         * Si SUPERVISOR no viene completo en FilterCatalog,
         * tomamos ResourceDaily como fallback.
         */
        if (
            !aSupervisors.length
        ) {
            aSupervisors =
                uniqueBy(
                    aResourceRows
                        .filter(
                            function (oRow) {
                                return (
                                    oRow.SupervisorId ||
                                    oRow.SupervisorName
                                );
                            }
                        )
                        .map(
                            function (oRow) {
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

                    function (oItem) {
                        return (
                            oItem.key
                        );
                    }
                );
        }

        /*
         * Turno sólo se toma de ResourceDaily
         * cuando esté validado.
         */
        if (
            !aShifts.length
        ) {
            aShifts =
                uniqueBy(
                    aResourceRows
                        .filter(
                            function (oRow) {
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
                            function (oRow) {
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

                    function (oItem) {
                        return (
                            oItem.key
                        );
                    }
                );
        }

        return {
            periods:
                buildPeriods(),

            supervisors:
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
    }

    /* =========================================================
     * PARÁMETROS
     * ========================================================= */

    function getNumericParameter(
        aCatalogs,
        aDomains,
        nDefault,
        sSupervisor
    ) {
        var aRows =
            (
                aCatalogs ||
                []
            ).filter(
                function (oRow) {
                    return (
                        aDomains.indexOf(
                            norm(
                                oRow.FilterDomain
                            )
                        ) >= 0 &&
                        Number.isFinite(
                            Number(
                                oRow.NumericValue
                            )
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
            );

        var oScoped =
            aRows.find(
                function (oRow) {
                    return (
                        norm(
                            oRow.ScopeTypeCode
                        ) ===
                            "SUPERVISOR" &&
                        matches(
                            sSupervisor,
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
                function (oRow) {
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

        return oSelected
            ? Number(
                oSelected.NumericValue
            )
            : nDefault;
    }

    function getThresholds(
        aCatalogs,
        sSupervisor
    ) {
        return {
            lowMax:
                getNumericParameter(
                    aCatalogs,
                    [
                        "UTILIZATION_LOW_MAX",
                        "RESOURCE_LOW_MAX"
                    ],
                    DEFAULT_LOW_MAX,
                    sSupervisor
                ),

            normalMax:
                getNumericParameter(
                    aCatalogs,
                    [
                        "UTILIZATION_NORMAL_MAX",
                        "RESOURCE_NORMAL_MAX"
                    ],
                    DEFAULT_NORMAL_MAX,
                    sSupervisor
                ),

            highMax:
                getNumericParameter(
                    aCatalogs,
                    [
                        "UTILIZATION_HIGH_MAX",
                        "RESOURCE_HIGH_MAX"
                    ],
                    DEFAULT_HIGH_MAX,
                    sSupervisor
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
     * RELACIONES
     * ========================================================= */

    function buildOrderMap(
        aOrders
    ) {
        var mMap =
            Object.create(null);

        (
            aOrders ||
            []
        ).forEach(
            function (oOrder) {
                var sOrderId =
                    String(
                        oOrder.OrderId ||
                        ""
                    );

                if (
                    sOrderId &&
                    !mMap[sOrderId]
                ) {
                    mMap[sOrderId] =
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
            Object.create(null);

        var mByOrder =
            Object.create(null);

        (
            aAssignments ||
            []
        ).forEach(
            function (oAssignment) {
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
                    ].join("|");

                if (
                    !mExact[sExact]
                ) {
                    mExact[sExact] =
                        [];
                }

                mExact[sExact].push(
                    oAssignment
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
            ] ||
            []
        );
    }

    function isValidPlanOperation(
        oOperation
    ) {
        var sSource =
            norm(
                oOperation
                    .PlannedSourceCode
            );

        /*
         * Fuente actual:
         * AFVV_WORK
         *
         * No sumar KBED.
         */
        return (
            !sSource ||
            sSource.indexOf(
                "AFVV"
            ) === 0
        );
    }

    /* =========================================================
     * CUMPLIMIENTO
     * ========================================================= */

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
                function (oRow) {
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
        var sApp =
            norm(
                oOrder.AppStatusCode
            );

        var sText =
            norm(
                oOrder.StatusText
            );

        if (
            aCodes
                .map(norm)
                .indexOf(
                    sApp
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

    function emptyMaterials() {
        return [
            {
                name:
                    "Sin datos",

                quantity:
                    "Sin datos",

                unit:
                    ""
            },

            {
                name:
                    "Sin datos",

                quantity:
                    "Sin datos",

                unit:
                    ""
            },

            {
                name:
                    "Sin datos",

                quantity:
                    "Sin datos",

                unit:
                    ""
            },

            {
                name:
                    "Sin datos",

                quantity:
                    "Sin datos",

                unit:
                    ""
            }
        ];
    }

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

        var mRequirement =
            Object.create(null);

        var mGroups =
            Object.create(null);

        (
            oRaw.materials ||
            []
        ).forEach(
            function (oMaterial) {
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

                if (
                    sRequirementId &&
                    mScopeOrderIds[
                        sOrderId
                    ]
                ) {
                    mRequirement[
                        sRequirementId
                    ] =
                        oMaterial;
                }
            }
        );

        (
            oRaw.materialMovements ||
            []
        ).forEach(
            function (oMovement) {
                var sRequirementId =
                    String(
                        oMovement
                            .MaterialRequirementId ||
                        ""
                    );

                var oMaterial =
                    mRequirement[
                        sRequirementId
                    ];

                var nQty =
                    Number(
                        oMovement
                            .MovementQuantity
                    );

                var sDirection =
                    norm(
                        oMovement
                            .MovementDirectionCode
                    );

                var nSigned;
                var sUnit;
                var sName;
                var sKey;

                if (
                    !oMaterial ||
                    !Number.isFinite(
                        nQty
                    ) ||
                    isTrue(
                        oMovement.IsReversal
                    ) ||
                    !inRange(
                        oMovement.MovementDate,
                        oStart,
                        oEnd
                    )
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

                sUnit =
                    String(
                        oMovement
                            .MovementUnitCode ||
                        oMaterial
                            .BaseUnitCode ||
                        ""
                    );

                sName =
                    String(
                        oMaterial
                            .MaterialName ||
                        oMaterial
                            .MaterialCategoryName ||
                        oMaterial
                            .MaterialId ||
                        oMaterial
                            .MaterialCategoryCode ||
                        "Sin material"
                    );

                /*
                 * No mezclar unidades diferentes.
                 */
                sKey =
                    String(
                        oMaterial.MaterialId ||
                        sName
                    ) +
                    "|" +
                    norm(
                        sUnit
                    );

                if (
                    !mGroups[sKey]
                ) {
                    mGroups[sKey] = {
                        name:
                            sName,

                        quantity:
                            0,

                        unit:
                            sUnit
                    };
                }

                mGroups[
                    sKey
                ].quantity +=
                    nSigned;
            }
        );

        var aResult =
            Object.keys(
                mGroups
            )
                .map(
                    function (sKey) {
                        return (
                            mGroups[sKey]
                        );
                    }
                )
                .filter(
                    function (oItem) {
                        return (
                            oItem.quantity >
                            0
                        );
                    }
                )
                .sort(
                    function (a, b) {
                        return (
                            b.quantity -
                            a.quantity
                        );
                    }
                )
                .slice(
                    0,
                    4
                )
                .map(
                    function (oItem) {
                        return {
                            name:
                                oItem.name,

                            quantity:
                                formatQuantity(
                                    oItem.quantity
                                ),

                            unit:
                                oItem.unit
                        };
                    }
                );

        while (
            aResult.length < 4
        ) {
            aResult.push(
                emptyMaterials()[
                    aResult.length
                ]
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
            oRawData || {};

        var oFilters =
            Object.assign(
                {
                    period:
                        "2026",

                    dateFrom:
                        "01/01/2026",

                    dateTo:
                        "31/12/2026",

                    supervisor:
                        "ALL",

                    shift:
                        "ALL"
                },

                mFilters || {}
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
         * RESOURCE DAILY
         * ===================================================== */

        var aResourcePeriod =
            (
                oRaw.resources ||
                []
            ).filter(
                function (oRow) {
                    return inRange(
                        oRow.WorkDate,
                        oStart,
                        oEnd
                    );
                }
            );

        var oCatalogs =
            buildCatalogs(
                oRaw,
                aResourcePeriod
            );

        /*
         * ALL permite utilizar ResourceDaily aunque Supervisor
         * o Turno todavía estén vacíos.
         */
        var aResourceRows =
            aResourcePeriod.filter(
                function (oRow) {
                    return (
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
            );

        var aResourceIds =
            uniqueStrings(
                aResourceRows.map(
                    function (oRow) {
                        return (
                            oRow.ResourceId
                        );
                    }
                )
            );

        var mSelectedResources =
            Object.create(null);

        var mResources =
            Object.create(null);

        aResourceRows.forEach(
            function (oRow) {
                var sId =
                    String(
                        oRow.ResourceId ||
                        ""
                    );

                var nCapacity =
                    Number(
                        oRow.CapacityHours
                    );

                var sType =
                    norm(
                        oRow.ResourceTypeCode
                    );

                if (!sId) {
                    return;
                }

                mSelectedResources[
                    sId
                ] = true;

                if (
                    !mResources[sId]
                ) {
                    mResources[sId] = {
                        id:
                            sId,

                        name:
                            oRow.ResourceName ||
                            sId,

                        types:
                            Object.create(
                                null
                            ),

                        capacity:
                            0,

                        capacityValid:
                            false,

                        load:
                            0
                    };
                }

                if (sType) {
                    mResources[
                        sId
                    ].types[
                        sType
                    ] = true;
                }

                /*
                 * Sólo usar capacidad cuando ABAP la marque
                 * explícitamente como validada.
                 */
                if (
                    isTrue(
                        oRow
                            .CapacitySourceValidated
                    ) &&
                    Number.isFinite(
                        nCapacity
                    )
                ) {
                    mResources[
                        sId
                    ].capacityValid =
                        true;

                    mResources[
                        sId
                    ].capacity +=
                        nCapacity;
                }
            }
        );

        /* =====================================================
         * MECÁNICOS / AYUDANTES
         * ===================================================== */

        var bResourceTypeAvailable =
            aResourceRows.some(
                function (oRow) {
                    return Boolean(
                        oRow.ResourceTypeCode
                    );
                }
            );

        var iMechanics =
            bResourceTypeAvailable
                ? aResourceIds
                    .filter(
                        function (sId) {
                            return Object.keys(
                                mResources[
                                    sId
                                ].types
                            ).some(
                                function (sType) {
                                    return (
                                        sType.indexOf(
                                            "MECAN"
                                        ) >= 0 ||
                                        sType.indexOf(
                                            "MECHAN"
                                        ) >= 0
                                    );
                                }
                            );
                        }
                    ).length
                : null;

        var iHelpers =
            bResourceTypeAvailable
                ? aResourceIds
                    .filter(
                        function (sId) {
                            return Object.keys(
                                mResources[
                                    sId
                                ].types
                            ).some(
                                function (sType) {
                                    return (
                                        sType.indexOf(
                                            "AYUD"
                                        ) >= 0 ||
                                        sType.indexOf(
                                            "HELP"
                                        ) >= 0
                                    );
                                }
                            );
                        }
                    ).length
                : null;

        /* =====================================================
         * ORDERS / OPERATIONS
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
                        ].join("|")
                    );
                }
            );

        var bResourceFilterApplied =
            !isAll(
                oFilters.supervisor
            ) ||
            !isAll(
                oFilters.shift
            );

        var mScopeOrderIds =
            Object.create(null);

        /*
         * Sin filtro Supervisor/Turno:
         * todas las Orders que devuelve el periodo entran al scope.
         */
        if (
            !bResourceFilterApplied
        ) {
            (
                oRaw.orders ||
                []
            ).forEach(
                function (oOrder) {
                    if (
                        oOrder.OrderId
                    ) {
                        mScopeOrderIds[
                            oOrder.OrderId
                        ] = true;
                    }
                }
            );
        } else {
            /*
             * Con filtro Supervisor/Turno:
             * la OT debe estar relacionada a uno de los recursos filtrados.
             */
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
                        mSelectedResources[
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

        var nTotalLoad = 0;
        var iIncludedOperations = 0;

        var mServiceLoad =
            Object.create(null);

        aOperations.forEach(
            function (oOperation) {
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

                var aResourceAssignmentIds;

                var bInclude;

                if (
                    !Number.isFinite(
                        nHours
                    )
                ) {
                    return;
                }

                aResourceAssignmentIds =
                    uniqueStrings(
                        getAssignmentsForOperation(
                            oOperation,
                            oAssignmentMaps
                        )
                            .map(
                                function (
                                    oAssignment
                                ) {
                                    return String(
                                        oAssignment.ResourceId ||
                                        ""
                                    );
                                }
                            )
                            .filter(
                                function (
                                    sResourceId
                                ) {
                                    return Boolean(
                                        mSelectedResources[
                                            sResourceId
                                        ]
                                    );
                                }
                            )
                    );

                bInclude =
                    bResourceFilterApplied
                        ? (
                            aResourceAssignmentIds
                                .length > 0
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

                /*
                 * Total ejecutivo:
                 * cada operación se suma una vez.
                 */
                nTotalLoad +=
                    nHours;

                iIncludedOperations +=
                    1;

                mScopeOrderIds[
                    sOrderId
                ] = true;

                /* --------------------------
                 * TIPO DE SERVICIO
                 * -------------------------- */

                var oOrder =
                    mOrderMap[
                        sOrderId
                    ];

                var sService =
                    oOrder
                        ? String(
                            oOrder.OrderTypeText ||
                            oOrder.OrderTypeCode ||
                            "Sin datos"
                        )
                        : "Sin datos";

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

                /* --------------------------
                 * CARGA POR RECURSO
                 * -------------------------- */

                if (
                    aResourceAssignmentIds.length
                ) {
                    var nShare =
                        nHours /
                        aResourceAssignmentIds
                            .length;

                    aResourceAssignmentIds
                        .forEach(
                            function (
                                sResourceId
                            ) {
                                if (
                                    mResources[
                                        sResourceId
                                    ]
                                ) {
                                    mResources[
                                        sResourceId
                                    ].load +=
                                        nShare;
                                }
                            }
                        );
                }
            }
        );

        var bOperationalAvailable =
            iIncludedOperations >
            0;

        /* =====================================================
         * CAPACIDAD
         * ===================================================== */

        var bCapacityAvailable =
            aResourceIds.some(
                function (sId) {
                    return (
                        mResources[sId]
                            .capacityValid
                    );
                }
            );

        var nTotalCapacity =
            bCapacityAvailable
                ? aResourceIds.reduce(
                    function (
                        nTotal,
                        sId
                    ) {
                        var oResource =
                            mResources[
                                sId
                            ];

                        return (
                            nTotal +
                            (
                                oResource.capacityValid
                                    ? oResource.capacity
                                    : 0
                            )
                        );
                    },

                    0
                )
                : null;

        /* =====================================================
         * SOBRE CAPACIDAD
         * ===================================================== */

        var iOverCapacity =
            bCapacityAvailable &&
            bOperationalAvailable
                ? aResourceIds
                    .filter(
                        function (sId) {
                            var oResource =
                                mResources[
                                    sId
                                ];

                            return (
                                oResource.capacityValid &&
                                oResource.capacity >
                                    0 &&
                                oResource.load >
                                    oResource.capacity
                            );
                        }
                    ).length
                : null;

        /* =====================================================
         * UTILIZACIÓN
         * ===================================================== */

        var oThresholds =
            getThresholds(
                oRaw.catalogs ||
                [],
                oFilters.supervisor
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

        if (
            bOperationalAvailable
        ) {
            aResourceIds.forEach(
                function (sId) {
                    var oResource =
                        mResources[
                            sId
                        ];

                    var nPct =
                        oResource
                            .capacityValid &&
                        oResource.capacity >
                            0
                            ? (
                                oResource.load /
                                oResource.capacity
                            ) * 100
                            : null;

                    var sState =
                        classifyUtilization(
                            nPct,
                            oThresholds
                        );

                    var oTile;

                    if (
                        sState ===
                        "NO_DATA"
                    ) {
                        return;
                    }

                    oTile = {
                        name:
                            oResource.name,

                        utilizationText:
                            formatPct(
                                nPct
                            ),

                        resourceText:
                            "1 recurso",

                        raw:
                            nPct
                    };

                    if (
                        sState ===
                        "CRITICAL"
                    ) {
                        oUtilization
                            .critical
                            .push(
                                oTile
                            );
                    } else if (
                        sState ===
                        "HIGH"
                    ) {
                        oUtilization
                            .high
                            .push(
                                oTile
                            );
                    } else if (
                        sState ===
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
        }

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
                            b.raw -
                            a.raw
                        );
                    }
                );
            }
        );

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
            aScopeOrders.some(
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
            getNumericParameter(
                oRaw.catalogs ||
                [],

                [
                    "COMPLIANCE_TARGET"
                ],

                DEFAULT_COMPLIANCE_TARGET,

                oFilters.supervisor
            );

        var nGap =
            Number.isFinite(
                nCompliance
            )
                ? (
                    nCompliance -
                    nComplianceTarget
                )
                : null;

        /* =====================================================
         * SERVICIOS
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
                                ) *
                                100
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
                                nHours
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
                    0
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

        /* =====================================================
         * LOG
         * ===================================================== */

        console.log(
            "[VS MAPPER] Resultado:",
            {
                period:
                    oFilters.period,

                dateFrom:
                    oFilters.dateFrom,

                dateTo:
                    oFilters.dateTo,

                supervisor:
                    oFilters.supervisor,

                shift:
                    oFilters.shift,

                resourceRowsPeriod:
                    aResourcePeriod
                        .length,

                resourceRowsFiltered:
                    aResourceRows
                        .length,

                distinctResources:
                    aResourceIds
                        .length,

                ordersScope:
                    aScopeOrders
                        .length,

                orderResources:
                    (
                        oRaw.orderResources ||
                        []
                    ).length,

                operationsRaw:
                    (
                        oRaw.operations ||
                        []
                    ).length,

                operationsIncluded:
                    iIncludedOperations,

                capacity:
                    nTotalCapacity,

                plannedLoad:
                    nTotalLoad,

                materials:
                    (
                        oRaw.materials ||
                        []
                    ).length,

                movements:
                    (
                        oRaw.materialMovements ||
                        []
                    ).length
            }
        );

        /* =====================================================
         * RESPUESTA
         * ===================================================== */

        return {
            catalogs:
                oCatalogs,

            kpis: {
                assigned:
                    aResourceIds.length >
                    0
                        ? String(
                            aResourceIds.length
                        )
                        : "Sin datos",

                mechanics:
                    Number.isFinite(
                        iMechanics
                    )
                        ? String(
                            iMechanics
                        )
                        : "Sin datos",

                helpers:
                    Number.isFinite(
                        iHelpers
                    )
                        ? String(
                            iHelpers
                        )
                        : "Sin datos",

                availableCapacity:
                    Number.isFinite(
                        nTotalCapacity
                    )
                        ? formatHours(
                            nTotalCapacity
                        )
                        : "Sin datos",

                scheduledLoad:
                    bOperationalAvailable
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

                complianceTarget:
                    "Meta: " +
                    formatNumber(
                        nComplianceTarget,
                        0
                    ) +
                    "%",

                complianceGap:
                    Number.isFinite(
                        nGap
                    )
                        ? (
                            nGap < 0
                                ? (
                                    formatNumber(
                                        Math.abs(
                                            nGap
                                        ),
                                        1
                                    ) +
                                    " puntos por debajo de la meta"
                                )
                                : nGap > 0
                                    ? (
                                        formatNumber(
                                            nGap,
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

            utilizationMeta: {
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
            },

            serviceTypes:
                aServiceTypes,

            serviceTotalHours:
                bOperationalAvailable
                    ? formatHours(
                        nTotalLoad
                    )
                    : "Sin datos",

            materials:
                aMaterials,

            meta: {
                resourceTypeAvailable:
                    bResourceTypeAvailable,

                capacityAvailable:
                    bCapacityAvailable,

                operationalAvailable:
                    bOperationalAvailable,

                statusAvailable:
                    bStatusAvailable,

                resourceFilterApplied:
                    bResourceFilterApplied
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