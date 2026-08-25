sap.ui.define([], function () {
    "use strict";

    var DEFAULT_LOW_MAX = 70;
    var DEFAULT_NORMAL_MAX = 100;
    var DEFAULT_HIGH_MAX = 120;

    /*
     * Fallback funcional de la maqueta.
     *
     * Cuando FilterCatalog entregue
     * COMPLIANCE_TARGET, se utiliza
     * automáticamente en lugar de 80.
     */
    var DEFAULT_COMPLIANCE_TARGET = 80;

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
        oStart,
        oEnd
    ) {
        var oDate =
            parseODataDate(
                vValue
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
        nValue,
        bWithUnit
    ) {
        var sValue;

        if (
            !Number.isFinite(
                nValue
            )
        ) {
            return "Sin datos";
        }

        if (
            Math.abs(
                nValue
            ) < 10
        ) {
            sValue =
                formatNumber(
                    nValue,
                    2
                );
        } else {
            sValue =
                formatNumber(
                    nValue,
                    0
                );
        }

        return bWithUnit
            ? sValue + " h"
            : sValue;
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

    function formatDifference(
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
            nValue > 0
        ) {
            return (
                "+" +
                formatNumber(
                    nValue,
                    1
                ) +
                " pp"
            );
        }

        if (
            nValue < 0
        ) {
            return (
                formatNumber(
                    nValue,
                    1
                ) +
                " pp"
            );
        }

        return "0 pp";
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

    /* =========================================================
     * CATÁLOGOS
     * ========================================================= */

    function getCatalogRows(
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
            Object.create(null);

        (
            aRows || []
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
        var aManagements =
            getCatalogRows(
                oRaw.catalogs,
                "MANAGEMENT"
            );

        var aHeadships =
            getCatalogRows(
                oRaw.catalogs,
                "HEADSHIP"
            );

        var aZones =
            getCatalogRows(
                oRaw.catalogs,
                "ZONE"
            );

        var aShifts =
            getCatalogRows(
                oRaw.catalogs,
                "SHIFT"
            );

        var aServices =
            getCatalogRows(
                oRaw.catalogs,
                "ORDER_TYPE"
            );

        var aResourceTypes =
            getCatalogRows(
                oRaw.catalogs,
                "RESOURCE_TYPE"
            );

        /*
         * GERENCIA
         */
        if (!aManagements.length) {
            aManagements =
                uniqueBy(
                    aResourceRows
                        .filter(
                            function (
                                oRow
                            ) {
                                return (
                                    oRow.ManagementId ||
                                    oRow.ManagementName
                                );
                            }
                        )
                        .map(
                            function (
                                oRow
                            ) {
                                return {
                                    key:
                                        oRow.ManagementId ||
                                        oRow.ManagementName,

                                    text:
                                        oRow.ManagementName ||
                                        oRow.ManagementId
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
         * JEFATURA
         */
        if (!aHeadships.length) {
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
                                        oRow.HeadshipId,

                                    parentKey:
                                        oRow.ManagementId ||
                                        oRow.ManagementName ||
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
         * ZONA
         */
        if (!aZones.length) {
            aZones =
                uniqueBy(
                    aResourceRows
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
                        return (
                            oItem.key
                        );
                    }
                );
        } else {
            /*
             * QAS tiene nota de truncamiento
             * en ValueId de ZONE.
             * Para UI preferimos ValueText.
             */
            aZones =
                aZones.map(
                    function (
                        oRow
                    ) {
                        return {
                            key:
                                oRow.ValueText ||
                                oRow.ValueId,

                            text:
                                oRow.ValueText ||
                                oRow.ValueId
                        };
                    }
                );
        }

        /*
         * TURNO
         */
        if (!aShifts.length) {
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

        /*
         * SERVICIO
         */
        if (!aServices.length) {
            aServices =
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
                        return (
                            oItem.key
                        );
                    }
                );
        }

        /*
         * TIPO RECURSO
         */
        if (!aResourceTypes.length) {
            aResourceTypes =
                uniqueBy(
                    aResourceRows
                        .filter(
                            function (
                                oRow
                            ) {
                                return Boolean(
                                    oRow.ResourceTypeCode
                                );
                            }
                        )
                        .map(
                            function (
                                oRow
                            ) {
                                return {
                                    key:
                                        oRow.ResourceTypeCode,

                                    text:
                                        oRow.ResourceTypeCode
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

            managements:
                makeCatalog(
                    aManagements,
                    "ALL",
                    "Todas"
                ),

            headshipsAll:
                makeCatalog(
                    aHeadships,
                    "ALL",
                    "Todas"
                ),

            zones:
                makeCatalog(
                    aZones,
                    "ALL",
                    "Todas"
                ),

            shifts:
                makeCatalog(
                    aShifts,
                    "ALL",
                    "Todos"
                ),

            serviceTypes:
                makeCatalog(
                    aServices,
                    "ALL",
                    "Todos"
                ),

            resourceTypes:
                makeCatalog(
                    aResourceTypes,
                    "ALL",
                    "Todos"
                )
        };

        oCatalogs.headships =
            oCatalogs
                .headshipsAll
                .filter(
                    function (
                        oItem,
                        iIndex
                    ) {
                        if (
                            iIndex === 0 ||
                            isAll(
                                oFilters.management
                            )
                        ) {
                            return true;
                        }

                        return (
                            !oItem.parentKey ||
                            matches(
                                oFilters.management,
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
     * CONFIGURACIÓN
     * ========================================================= */

    function getNumericParameter(
        aCatalogs,
        aDomains,
        nDefault,
        sHeadship,
        sManagement
    ) {
        var aRows =
            (
                aCatalogs || []
            ).filter(
                function (
                    oRow
                ) {
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

        var oHeadship =
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

        var oManagement =
            aRows.find(
                function (
                    oRow
                ) {
                    return (
                        norm(
                            oRow.ScopeTypeCode
                        ) ===
                            "MANAGEMENT" &&
                        matches(
                            sManagement,
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
            oHeadship ||
            oManagement ||
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
        sManagement
    ) {
        return {
            lowMax:
                getNumericParameter(
                    aCatalogs,
                    [
                        "UTILIZATION_LOW_MAX",
                        "HEADSHIP_LOW_MAX"
                    ],
                    DEFAULT_LOW_MAX,
                    "",
                    sManagement
                ),

            normalMax:
                getNumericParameter(
                    aCatalogs,
                    [
                        "UTILIZATION_NORMAL_MAX",
                        "HEADSHIP_NORMAL_MAX"
                    ],
                    DEFAULT_NORMAL_MAX,
                    "",
                    sManagement
                ),

            highMax:
                getNumericParameter(
                    aCatalogs,
                    [
                        "UTILIZATION_HIGH_MAX",
                        "HEADSHIP_HIGH_MAX"
                    ],
                    DEFAULT_HIGH_MAX,
                    "",
                    sManagement
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
            return {
                text:
                    "Sin datos",

                state:
                    "None",

                code:
                    "NO_DATA"
            };
        }

        if (
            nPct >
            oThresholds.highMax
        ) {
            return {
                text:
                    "Crítico",

                state:
                    "Error",

                code:
                    "CRITICAL"
            };
        }

        if (
            nPct >
            oThresholds.normalMax
        ) {
            return {
                text:
                    "Alto",

                state:
                    "Warning",

                code:
                    "HIGH"
            };
        }

        if (
            nPct >
            oThresholds.lowMax
        ) {
            return {
                text:
                    "Normal",

                state:
                    "Success",

                code:
                    "NORMAL"
            };
        }

        return {
            text:
                "Bajo",

            state:
                "Information",

            code:
                "LOW"
        };
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
            aOrders || []
        ).forEach(
            function (
                oOrder
            ) {
                var sId =
                    String(
                        oOrder.OrderId ||
                        ""
                    );

                if (
                    sId &&
                    !mMap[sId]
                ) {
                    mMap[sId] =
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
            aAssignments || []
        ).forEach(
            function (
                oAssignment
            ) {
                var sOrderId =
                    String(
                        oAssignment.OrderId ||
                        ""
                    );

                var sKey =
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
                    !mExact[sKey]
                ) {
                    mExact[sKey] =
                        [];
                }

                mExact[sKey].push(
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

        var sKey =
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
            oMaps.exact[sKey] &&
            oMaps.exact[sKey].length
        ) {
            return (
                oMaps.exact[sKey]
            );
        }

        return (
            oMaps.byOrder[
                sOrderId
            ] || []
        );
    }

    function validPlanOperation(
        oOperation
    ) {
        var sSource =
            norm(
                oOperation
                    .PlannedSourceCode
            );

        /*
         * Publicación QAS actual:
         * AFVV es la fuente prioritaria.
         */
        return (
            !sSource ||
            sSource.indexOf(
                "AFVV"
            ) === 0
        );
    }

    /* =========================================================
     * CONTEXTO DEL RECURSO SEGÚN FECHA
     * ========================================================= */

    function buildRowsByResource(
        aRows
    ) {
        var mRows =
            Object.create(null);

        (
            aRows || []
        ).forEach(
            function (
                oRow
            ) {
                var sId =
                    String(
                        oRow.ResourceId ||
                        ""
                    );

                if (!sId) {
                    return;
                }

                if (
                    !mRows[sId]
                ) {
                    mRows[sId] =
                        [];
                }

                mRows[sId].push(
                    oRow
                );
            }
        );

        Object.keys(
            mRows
        ).forEach(
            function (
                sId
            ) {
                mRows[sId].sort(
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

    function resolveResourceContext(
        mRowsByResource,
        sResourceId,
        vReferenceDate
    ) {
        var aRows =
            mRowsByResource[
                String(
                    sResourceId ||
                    ""
                )
            ] || [];

        var oReference =
            parseODataDate(
                vReferenceDate
            );

        var oCandidate =
            null;

        if (!aRows.length) {
            return null;
        }

        if (oReference) {
            aRows.forEach(
                function (
                    oRow
                ) {
                    var oDate =
                        parseODataDate(
                            oRow.WorkDate
                        );

                    if (
                        oDate &&
                        oDate.getTime() <=
                            oReference.getTime()
                    ) {
                        oCandidate =
                            oRow;
                    }
                }
            );

            if (oCandidate) {
                return (
                    oCandidate
                );
            }
        }

        return (
            aRows[
                aRows.length - 1
            ]
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

        if (!aRows.length) {
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

    function orderMatchesService(
        oOrder,
        sServiceType
    ) {
        if (
            isAll(
                sServiceType
            )
        ) {
            return true;
        }

        return (
            norm(
                oOrder.OrderTypeCode
            ) ===
                norm(
                    sServiceType
                ) ||
            norm(
                oOrder.OrderTypeText
            ) ===
                norm(
                    sServiceType
                )
        );
    }

    /* =========================================================
     * PRINCIPAL
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

                    management:
                        "ALL",

                    headship:
                        "ALL",

                    zone:
                        "ALL",

                    shift:
                        "ALL",

                    serviceType:
                        "ALL",

                    resourceType:
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
         * RESOURCE DAILY DEL PERIODO
         * ===================================================== */

        var aResourcePeriod =
            (
                oRaw.resources || []
            ).filter(
                function (
                    oRow
                ) {
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
                aResourcePeriod,
                oFilters
            );

        /*
         * ALL nunca obliga a tener el campo lleno.
         *
         * Un filtro específico sí requiere
         * coincidencia real.
         */
        var aFilteredRows =
            aResourcePeriod.filter(
                function (
                    oRow
                ) {
                    return (
                        matches(
                            oFilters.management,
                            [
                                oRow.ManagementId,
                                oRow.ManagementName
                            ]
                        ) &&

                        matches(
                            oFilters.headship,
                            [
                                oRow.HeadshipId,
                                oRow.HeadshipName
                            ]
                        ) &&

                        matches(
                            oFilters.zone,
                            [
                                oRow.ZoneId,
                                oRow.ZoneName
                            ]
                        ) &&

                        matches(
                            oFilters.shift,
                            [
                                oRow.ShiftId,
                                oRow.ShiftName
                            ]
                        ) &&

                        matches(
                            oFilters.resourceType,
                            [
                                oRow.ResourceTypeCode
                            ]
                        )
                    );
                }
            );

        var aHeadshipRows =
            aFilteredRows.filter(
                function (
                    oRow
                ) {
                    return Boolean(
                        oRow.HeadshipId ||
                        oRow.HeadshipName
                    );
                }
            );

        var bHierarchyAvailable =
            aHeadshipRows.length >
            0;

        var mRowsByResource =
            buildRowsByResource(
                aFilteredRows
            );

        /* =====================================================
         * JEFATURAS
         * ===================================================== */

        var mHeadships =
            Object.create(null);

        var mGlobalResources =
            Object.create(null);

        var mGlobalSupervisors =
            Object.create(null);

        var nTotalCapacity =
            0;

        var bCapacityAvailable =
            false;

        function ensureHeadship(
            oRow
        ) {
            var sKey =
                String(
                    oRow.HeadshipId ||
                    oRow.HeadshipName ||
                    ""
                );

            if (!sKey) {
                return null;
            }

            if (
                !mHeadships[sKey]
            ) {
                mHeadships[sKey] = {
                    id:
                        sKey,

                    name:
                        oRow.HeadshipName ||
                        oRow.HeadshipId ||
                        sKey,

                    managementId:
                        oRow.ManagementId ||
                        "",

                    managementName:
                        oRow.ManagementName ||
                        "",

                    manager:
                        oRow.HeadshipManagerName ||
                        oRow.HeadshipResponsibleName ||
                        "",

                    supervisors:
                        Object.create(
                            null
                        ),

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

                    resourceStats:
                        Object.create(
                            null
                        ),

                    orderIds:
                        Object.create(
                            null
                        )
                };
            }

            return (
                mHeadships[sKey]
            );
        }

        aFilteredRows.forEach(
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

                var oHeadship =
                    ensureHeadship(
                        oRow
                    );

                if (sResourceId) {
                    mGlobalResources[
                        sResourceId
                    ] = true;
                }

                if (sSupervisorId) {
                    mGlobalSupervisors[
                        sSupervisorId
                    ] = true;
                }

                if (
                    isTrue(
                        oRow
                            .CapacitySourceValidated
                    ) &&
                    Number.isFinite(
                        nCapacity
                    )
                ) {
                    bCapacityAvailable =
                        true;

                    nTotalCapacity +=
                        nCapacity;
                }

                if (!oHeadship) {
                    return;
                }

                if (sSupervisorId) {
                    oHeadship
                        .supervisors[
                            sSupervisorId
                        ] = true;
                }

                if (sResourceId) {
                    oHeadship
                        .resources[
                            sResourceId
                        ] = true;

                    if (
                        !oHeadship
                            .resourceStats[
                                sResourceId
                            ]
                    ) {
                        oHeadship
                            .resourceStats[
                                sResourceId
                            ] = {
                                capacity:
                                    0,

                                capacityValid:
                                    false,

                                load:
                                    0
                            };
                    }
                }

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
                    oHeadship
                        .capacityValid =
                            true;

                    oHeadship
                        .capacity +=
                            nCapacity;

                    oHeadship
                        .resourceStats[
                            sResourceId
                        ].capacityValid =
                            true;

                    oHeadship
                        .resourceStats[
                            sResourceId
                        ].capacity +=
                            nCapacity;
                }
            }
        );

        /* =====================================================
         * ORDERS
         * ===================================================== */

        var aOrders =
            uniqueBy(
                oRaw.orders || [],
                function (
                    oOrder
                ) {
                    return (
                        oOrder.OrderId
                    );
                }
            );

        var mOrderMap =
            buildOrderMap(
                aOrders
            );

        var mAllowedOrderIds =
            Object.create(null);

        aOrders.forEach(
            function (
                oOrder
            ) {
                if (
                    oOrder.OrderId &&
                    orderMatchesService(
                        oOrder,
                        oFilters.serviceType
                    )
                ) {
                    mAllowedOrderIds[
                        oOrder.OrderId
                    ] = true;
                }
            }
        );

        /* =====================================================
         * ORDER RESOURCES
         * ===================================================== */

        var aAssignments =
            oRaw.orderResources ||
            [];

        var oAssignmentMaps =
            buildAssignmentMaps(
                aAssignments
            );

        /*
         * Relacionamos órdenes con jefaturas
         * independientemente de que tengan
         * operación publicada, porque el
         * cumplimiento se calcula por OT.
         */
        aAssignments.forEach(
            function (
                oAssignment
            ) {
                var sOrderId =
                    String(
                        oAssignment.OrderId ||
                        ""
                    );

                var sResourceId =
                    String(
                        oAssignment.ResourceId ||
                        ""
                    );

                var oOrder =
                    mOrderMap[
                        sOrderId
                    ];

                var oContext;

                var oHeadship;

                if (
                    !mAllowedOrderIds[
                        sOrderId
                    ] ||
                    !oOrder ||
                    !sResourceId
                ) {
                    return;
                }

                oContext =
                    resolveResourceContext(
                        mRowsByResource,
                        sResourceId,
                        oOrder.PlannedStartDate
                    );

                if (!oContext) {
                    return;
                }

                oHeadship =
                    ensureHeadship(
                        oContext
                    );

                if (oHeadship) {
                    oHeadship
                        .orderIds[
                            sOrderId
                        ] = true;
                }
            }
        );

        /* =====================================================
         * OPERATIONS
         * ===================================================== */

        var aOperations =
            uniqueBy(
                (
                    oRaw.operations || []
                ).filter(
                    validPlanOperation
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

        var nTotalLoad =
            0;

        var iIncludedOperations =
            0;

        aOperations.forEach(
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

                var aResources;

                var aMapped;

                if (
                    !mAllowedOrderIds[
                        sOrderId
                    ] ||
                    !Number.isFinite(
                        nHours
                    )
                ) {
                    return;
                }

                aResources =
                    uniqueStrings(
                        getAssignmentsForOperation(
                            oOperation,
                            oAssignmentMaps
                        )
                            .map(
                                function (
                                    oAssignment
                                ) {
                                    return (
                                        oAssignment.ResourceId
                                    );
                                }
                            )
                    );

                aMapped = [];

                aResources.forEach(
                    function (
                        sResourceId
                    ) {
                        var oContext =
                            resolveResourceContext(
                                mRowsByResource,
                                sResourceId,
                                oOperation
                                    .PlannedStartDate
                            );

                        var oHeadship;

                        if (!oContext) {
                            return;
                        }

                        oHeadship =
                            ensureHeadship(
                                oContext
                            );

                        if (!oHeadship) {
                            return;
                        }

                        aMapped.push({
                            resourceId:
                                String(
                                    sResourceId
                                ),

                            headship:
                                oHeadship
                        });
                    }
                );

                aMapped =
                    uniqueBy(
                        aMapped,
                        function (
                            oItem
                        ) {
                            return (
                                oItem
                                    .resourceId
                            );
                        }
                    );

                /*
                 * Esta pantalla es por Jefatura.
                 * Si no podemos relacionar la
                 * operación con una Jefatura,
                 * no inventamos la asignación.
                 */
                if (!aMapped.length) {
                    return;
                }

                nTotalLoad +=
                    nHours;

                iIncludedOperations +=
                    1;

                var nShare =
                    nHours /
                    aMapped.length;

                aMapped.forEach(
                    function (
                        oItem
                    ) {
                        var oHeadship =
                            oItem.headship;

                        var sResourceId =
                            oItem.resourceId;

                        oHeadship.load +=
                            nShare;

                        if (
                            !oHeadship
                                .resourceStats[
                                    sResourceId
                                ]
                        ) {
                            oHeadship
                                .resourceStats[
                                    sResourceId
                                ] = {
                                    capacity:
                                        0,

                                    capacityValid:
                                        false,

                                    load:
                                        0
                                };
                        }

                        oHeadship
                            .resourceStats[
                                sResourceId
                            ].load +=
                                nShare;
                    }
                );
            }
        );

        var bOperationalAvailable =
            iIncludedOperations >
            0;

        /* =====================================================
         * CONFIGURACIÓN
         * ===================================================== */

        var oThresholds =
            getThresholds(
                oRaw.catalogs ||
                [],
                oFilters.management
            );

        var aExecutedCodes =
            getExecutedCodes(
                oRaw.catalogs ||
                []
            );

        /* =====================================================
         * FILAS
         * ===================================================== */

        var aRows = [];

        Object.keys(
            mHeadships
        ).forEach(
            function (
                sHeadshipId
            ) {
                var oHeadship =
                    mHeadships[
                        sHeadshipId
                    ];

                var aHeadshipOrderIds =
                    Object.keys(
                        oHeadship.orderIds
                    );

                var aHeadshipOrders =
                    aHeadshipOrderIds
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

                var nUtilization =
                    oHeadship
                        .capacityValid &&
                    oHeadship.capacity >
                        0 &&
                    bOperationalAvailable
                        ? (
                            oHeadship.load /
                            oHeadship.capacity
                        ) * 100
                        : null;

                var oStatus =
                    classifyUtilization(
                        nUtilization,
                        oThresholds
                    );

                var iOverCapacity =
                    oHeadship
                        .capacityValid &&
                    bOperationalAvailable
                        ? Object.keys(
                            oHeadship
                                .resourceStats
                        )
                            .filter(
                                function (
                                    sResourceId
                                ) {
                                    var oStats =
                                        oHeadship
                                            .resourceStats[
                                                sResourceId
                                            ];

                                    return (
                                        oStats
                                            .capacityValid &&
                                        oStats.load >
                                            oStats.capacity
                                    );
                                }
                            ).length
                        : null;

                var bStatusAvailable =
                    aHeadshipOrders.some(
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
                    aHeadshipOrders.length >
                        0 &&
                    bStatusAvailable
                        ? (
                            aHeadshipOrders
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
                            aHeadshipOrders.length
                        ) * 100
                        : null;

                var nTarget =
                    getNumericParameter(
                        oRaw.catalogs ||
                        [],
                        [
                            "COMPLIANCE_TARGET"
                        ],
                        DEFAULT_COMPLIANCE_TARGET,
                        oHeadship.id,
                        oHeadship.managementId ||
                        oFilters.management
                    );

                var nDifference =
                    Number.isFinite(
                        nCompliance
                    )
                        ? (
                            nCompliance -
                            nTarget
                        )
                        : null;

                aRows.push({
                    id:
                        oHeadship.id,

                    jefatura:
                        (
                            oHeadship.id
                                ? (
                                    oHeadship.id +
                                    " - "
                                )
                                : ""
                        ) +
                        oHeadship.name,

                    manager:
                        oHeadship.manager ||
                        "Sin datos",

                    supervisors:
                        String(
                            Object.keys(
                                oHeadship
                                    .supervisors
                            ).length
                        ),

                    resources:
                        String(
                            Object.keys(
                                oHeadship
                                    .resources
                            ).length
                        ),

                    capacity:
                        oHeadship
                            .capacityValid
                            ? formatHours(
                                oHeadship.capacity,
                                false
                            )
                            : "Sin datos",

                    scheduledLoad:
                        bOperationalAvailable
                            ? formatHours(
                                oHeadship.load,
                                false
                            )
                            : "Sin datos",

                    utilization:
                        formatPct(
                            nUtilization
                        ),

                    utilizationNumber:
                        nUtilization,

                    status:
                        oStatus.text,

                    statusState:
                        oStatus.state,

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

                    target:
                        Number.isFinite(
                            nTarget
                        )
                            ? (
                                formatNumber(
                                    nTarget,
                                    0
                                ) +
                                "%"
                            )
                            : "Sin datos",

                    difference:
                        formatDifference(
                            nDifference
                        ),

                    differenceState:
                        Number.isFinite(
                            nDifference
                        )
                            ? (
                                nDifference >= 0
                                    ? "Success"
                                    : "Error"
                            )
                            : "None",

                    isTotal:
                        false
                });
            }
        );

        aRows.sort(
            function (
                a,
                b
            ) {
                return String(
                    a.jefatura
                ).localeCompare(
                    String(
                        b.jefatura
                    ),
                    "es"
                );
            }
        );

        /* =====================================================
         * GLOBALES
         * ===================================================== */

        var aScopeOrderIds =
            uniqueStrings(
                aRows.reduce(
                    function (
                        aAccumulator,
                        oRow
                    ) {
                        var oHeadship =
                            mHeadships[
                                oRow.id
                            ];

                        return aAccumulator.concat(
                            Object.keys(
                                oHeadship
                                    .orderIds
                            )
                        );
                    },
                    []
                )
            );

        var aScopeOrders =
            aScopeOrderIds
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

        var bGlobalStatusAvailable =
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

        var nGlobalCompliance =
            aScopeOrders.length >
                0 &&
            bGlobalStatusAvailable
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

        var nGlobalTarget =
            getNumericParameter(
                oRaw.catalogs ||
                [],
                [
                    "COMPLIANCE_TARGET"
                ],
                DEFAULT_COMPLIANCE_TARGET,
                "",
                oFilters.management
            );

        var nGlobalDifference =
            Number.isFinite(
                nGlobalCompliance
            )
                ? (
                    nGlobalCompliance -
                    nGlobalTarget
                )
                : null;

        var nAverageUtilization =
            bCapacityAvailable &&
            nTotalCapacity >
                0 &&
            bOperationalAvailable
                ? (
                    nTotalLoad /
                    nTotalCapacity
                ) * 100
                : null;

        var oAverageStatus =
            classifyUtilization(
                nAverageUtilization,
                oThresholds
            );

        var iTotalOverCapacity =
            aRows.reduce(
                function (
                    nTotal,
                    oRow
                ) {
                    var nValue =
                        Number(
                            oRow.overCapacity
                        );

                    return (
                        nTotal +
                        (
                            Number.isFinite(
                                nValue
                            )
                                ? nValue
                                : 0
                        )
                    );
                },
                0
            );

        var oTotalRow = {
            id:
                "TOTAL",

            jefatura:
                "Total general",

            manager:
                "—",

            supervisors:
                bHierarchyAvailable
                    ? String(
                        Object.keys(
                            mGlobalSupervisors
                        ).length
                    )
                    : "Sin datos",

            resources:
                Object.keys(
                    mGlobalResources
                ).length >
                    0
                    ? String(
                        Object.keys(
                            mGlobalResources
                        ).length
                    )
                    : "Sin datos",

            capacity:
                bCapacityAvailable
                    ? formatHours(
                        nTotalCapacity,
                        false
                    )
                    : "Sin datos",

            scheduledLoad:
                bOperationalAvailable
                    ? formatHours(
                        nTotalLoad,
                        false
                    )
                    : "Sin datos",

            utilization:
                formatPct(
                    nAverageUtilization
                ),

            utilizationNumber:
                nAverageUtilization,

            status:
                "—",

            statusState:
                "None",

            overCapacity:
                bCapacityAvailable &&
                bOperationalAvailable
                    ? String(
                        iTotalOverCapacity
                    )
                    : "Sin datos",

            compliance:
                formatPct(
                    nGlobalCompliance
                ),

            target:
                formatNumber(
                    nGlobalTarget,
                    0
                ) +
                "%",

            difference:
                formatDifference(
                    nGlobalDifference
                ),

            differenceState:
                Number.isFinite(
                    nGlobalDifference
                )
                    ? (
                        nGlobalDifference >= 0
                            ? "Success"
                            : "Error"
                    )
                    : "None",

            isTotal:
                true
        };

        /* =====================================================
         * KPI DESCRIPTIONS
         * ===================================================== */

        var sUtilizationDescription =
            Number.isFinite(
                nAverageUtilization
            )
                ? (
                    "Rango " +
                    oAverageStatus.text
                )
                : "Sin datos suficientes";

        var sComplianceDescription =
            Number.isFinite(
                nGlobalDifference
            )
                ? (
                    nGlobalDifference < 0
                        ? (
                            formatNumber(
                                Math.abs(
                                    nGlobalDifference
                                ),
                                1
                            ) +
                            " pp por debajo de la meta"
                        )
                        : nGlobalDifference > 0
                            ? (
                                formatNumber(
                                    nGlobalDifference,
                                    1
                                ) +
                                " pp sobre la meta"
                            )
                            : "En la meta"
                )
                : "Sin datos suficientes";

        /* =====================================================
         * LOG
         * ===================================================== */

        console.log(
            "[DOJ MAPPER] Resultado:",
            {
                period:
                    oFilters.period,

                dateFrom:
                    oFilters.dateFrom,

                dateTo:
                    oFilters.dateTo,

                management:
                    oFilters.management,

                headship:
                    oFilters.headship,

                resourcePeriod:
                    aResourcePeriod.length,

                filteredResources:
                    aFilteredRows.length,

                hierarchyAvailable:
                    bHierarchyAvailable,

                headships:
                    aRows.length,

                orders:
                    aScopeOrders.length,

                assignments:
                    aAssignments.length,

                operations:
                    aOperations.length,

                operationsIncluded:
                    iIncludedOperations,

                totalCapacity:
                    nTotalCapacity,

                totalLoad:
                    nTotalLoad,

                utilization:
                    nAverageUtilization,

                compliance:
                    nGlobalCompliance
            }
        );

        return {
            catalogs:
                oCatalogs,

            kpis: {
                activeHeadships: {
                    value:
                        bHierarchyAvailable
                            ? String(
                                aRows.length
                            )
                            : "Sin datos",

                    description:
                        "Total jefaturas"
                },

                totalResources: {
                    value:
                        Object.keys(
                            mGlobalResources
                        ).length >
                            0
                            ? String(
                                Object.keys(
                                    mGlobalResources
                                ).length
                            )
                            : "Sin datos",

                    description:
                        "Mecánicos y ayudantes"
                },

                availableCapacity: {
                    value:
                        bCapacityAvailable
                            ? formatHours(
                                nTotalCapacity,
                                true
                            )
                            : "Sin datos",

                    description:
                        "Total disponible"
                },

                scheduledLoad: {
                    value:
                        bOperationalAvailable
                            ? formatHours(
                                nTotalLoad,
                                true
                            )
                            : "Sin datos",

                    description:
                        "Total programada"
                },

                averageUtilization: {
                    value:
                        formatPct(
                            nAverageUtilization
                        ),

                    description:
                        sUtilizationDescription
                },

                operationalCompliance: {
                    value:
                        formatPct(
                            nGlobalCompliance
                        ),

                    description:
                        sComplianceDescription
                }
            },

            headshipRows:
                aRows,

            totalRow:
                oTotalRow,

            meta: {
                hierarchyAvailable:
                    bHierarchyAvailable,

                capacityAvailable:
                    bCapacityAvailable,

                operationalAvailable:
                    bOperationalAvailable,

                statusAvailable:
                    bGlobalStatusAvailable,

                canLoadOperationalDetails:
                    bHierarchyAvailable &&
                    Object.keys(
                        mGlobalResources
                    ).length >
                        0,

                totalRecords:
                    aRows.length
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