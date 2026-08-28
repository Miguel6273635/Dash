sap.ui.define([], function () {
    "use strict";

    var COLORS = [
        "#1677ff",
        "#ff7a00",
        "#f59e0b",
        "#7c3aed",
        "#10b981",
        "#ef4444",
        "#06b6d4"
    ];

    function normalize(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
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

        aMatch =
            String(vValue).match(
                /\/Date\((-?\d+)/
            );

        oDate =
            aMatch
                ? new Date(Number(aMatch[1]))
                : new Date(vValue);

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
    }

    function parseInputDate(sValue) {
        if (!sValue) {
            return null;
        }

        var aParts =
            String(sValue).split("-");

        if (aParts.length !== 3) {
            return parseDate(sValue);
        }

        return new Date(
            Number(aParts[0]),
            Number(aParts[1]) - 1,
            Number(aParts[2])
        );
    }

    function startOfDay(oDate) {
        if (!oDate) {
            return null;
        }

        return new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate(),
            0,
            0,
            0,
            0
        );
    }

    function endOfDay(oDate) {
        if (!oDate) {
            return null;
        }

        return new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate(),
            23,
            59,
            59,
            999
        );
    }

    function formatDate(vValue) {
        var oDate =
            parseDate(vValue);

        if (!oDate) {
            return "Sin datos";
        }

        return (
            String(
                oDate.getDate()
            ).padStart(2, "0") +
            "/" +
            String(
                oDate.getMonth() + 1
            ).padStart(2, "0") +
            "/" +
            oDate.getFullYear()
        );
    }

    function toIsoDate(vValue) {
        var oDate =
            parseDate(vValue);

        if (!oDate) {
            return "";
        }

        return (
            oDate.getFullYear() +
            "-" +
            String(
                oDate.getMonth() + 1
            ).padStart(2, "0") +
            "-" +
            String(
                oDate.getDate()
            ).padStart(2, "0")
        );
    }

    function formatDateTime(vValue) {
        var oDate =
            parseDate(vValue);

        if (!oDate) {
            return "Sin datos";
        }

        return (
            formatDate(oDate) +
            " " +
            String(
                oDate.getHours()
            ).padStart(2, "0") +
            ":" +
            String(
                oDate.getMinutes()
            ).padStart(2, "0")
        );
    }

    function diffDays(oStart, oEnd) {
        if (!oStart || !oEnd) {
            return 0;
        }

        return Math.max(
            0,
            Math.floor(
                (
                    startOfDay(oEnd).getTime() -
                    startOfDay(oStart).getTime()
                ) /
                86400000
            )
        );
    }

    function overlaps(
        vStart,
        vEnd,
        oFrom,
        oTo
    ) {
        var oStart =
            parseDate(vStart);

        var oEnd =
            parseDate(vEnd);

        if (!oStart) {
            return false;
        }

        if (
            oTo &&
            oStart.getTime() >
                endOfDay(oTo).getTime()
        ) {
            return false;
        }

        if (
            oEnd &&
            oFrom &&
            oEnd.getTime() <
                startOfDay(oFrom).getTime()
        ) {
            return false;
        }

        return true;
    }

    function formatInteger(iValue) {
        return Number(
            iValue || 0
        ).toLocaleString("es-MX");
    }

    function buildResourceMap(aRows) {
        var mMap =
            Object.create(null);

        (aRows || []).forEach(
            function (oRow) {

                if (
                    oRow.ResourceId &&
                    !mMap[
                        String(
                            oRow.ResourceId
                        )
                    ]
                ) {
                    mMap[
                        String(
                            oRow.ResourceId
                        )
                    ] = oRow;
                }

                if (
                    oRow.PersonnelNumber &&
                    !mMap[
                        String(
                            oRow.PersonnelNumber
                        )
                    ]
                ) {
                    mMap[
                        String(
                            oRow.PersonnelNumber
                        )
                    ] = oRow;
                }
            }
        );

        return mMap;
    }

    function getResourceName(
        mResources,
        sId
    ) {
        var oResource =
            mResources[
                String(sId || "")
            ];

        return (
            oResource &&
            oResource.ResourceName
        ) ||
        sId ||
        "Sin datos";
    }

    function getSupervisorName(
        mResources,
        oBlock
    ) {
        if (!oBlock) {
            return "Sin datos";
        }

        var oResource =
            mResources[
                String(
                    oBlock.SupervisorId ||
                    ""
                )
            ];

        if (oResource) {
            return (
                oResource.ResourceName ||
                oResource.SupervisorName ||
                oBlock.SupervisorId
            );
        }

        return (
            oBlock.SupervisorId ||
            "Sin datos"
        );
    }

    function getCatalogText(
        aCatalogs,
        aDomains,
        sCode
    ) {
        if (!sCode) {
            return "";
        }

        var aNormalizedDomains =
            (aDomains || []).map(
                normalize
            );

        var oMatch =
            (aCatalogs || []).find(
                function (oRow) {
                    return (
                        oRow.Active !== false &&
                        aNormalizedDomains.indexOf(
                            normalize(
                                oRow.FilterDomain
                            )
                        ) >= 0 &&
                        String(
                            oRow.ValueId || ""
                        ) ===
                        String(sCode)
                    );
                }
            );

        return (
            oMatch &&
            oMatch.ValueText
        ) ||
        sCode;
    }

    function priorityText(
        aCatalogs,
        sCode
    ) {
        var sCatalog =
            getCatalogText(
                aCatalogs,
                [
                    "PRIORITY",
                    "BLOCK_PRIORITY"
                ],
                sCode
            );

        if (
            sCatalog &&
            sCatalog !== sCode
        ) {
            return sCatalog;
        }

        switch (
            normalize(sCode)
        ) {
        case "CRITICAL":
        case "CRITICA":
            return "Crítica";

        case "HIGH":
        case "ALTA":
            return "Alta";

        case "MEDIUM":
        case "MEDIA":
            return "Media";

        case "LOW":
        case "BAJA":
            return "Baja";

        default:
            return (
                sCode ||
                "Sin datos"
            );
        }
    }

    function priorityKey(sCode) {
        switch (
            normalize(sCode)
        ) {
        case "CRITICAL":
        case "CRITICA":
            return "critical";

        case "HIGH":
        case "ALTA":
            return "high";

        case "MEDIUM":
        case "MEDIA":
            return "medium";

        case "LOW":
        case "BAJA":
            return "low";

        default:
            return "low";
        }
    }

    function statusKey(
        sCode,
        sText
    ) {
        var sValue =
            normalize(
                sText ||
                sCode
            );

        if (
            sValue.indexOf(
                "BLOCK"
            ) >= 0 ||
            sValue.indexOf(
                "BLOQUE"
            ) >= 0
        ) {
            return "blocked";
        }

        return "management";
    }

    function criticalityKey(sCode) {
        switch (
            normalize(sCode)
        ) {
        case "CRITICAL":
        case "CRITICA":
            return "critical";

        case "HIGH":
        case "ALTA":
            return "high";

        case "MEDIUM":
        case "MEDIA":
            return "medium";

        case "LOW":
        case "BAJA":
            return "low";

        default:
            return "low";
        }
    }

    function uniqueRepresentativeBlocks(
        aBlocks
    ) {
        var mByEquipment =
            Object.create(null);

        (aBlocks || []).forEach(
            function (oBlock) {
                var sEquipment =
                    String(
                        oBlock.EquipmentId ||
                        oBlock.BlockId ||
                        ""
                    );

                if (!sEquipment) {
                    return;
                }

                var oCurrent =
                    mByEquipment[
                        sEquipment
                    ];

                if (!oCurrent) {
                    mByEquipment[
                        sEquipment
                    ] = oBlock;

                    return;
                }

                var bNewOpen =
                    !oBlock.ReleasedAt;

                var bCurrentOpen =
                    !oCurrent.ReleasedAt;

                if (
                    bNewOpen &&
                    !bCurrentOpen
                ) {
                    mByEquipment[
                        sEquipment
                    ] = oBlock;

                    return;
                }

                if (
                    bNewOpen ===
                    bCurrentOpen
                ) {
                    var oNewDate =
                        parseDate(
                            oBlock.BlockedAt
                        );

                    var oCurrentDate =
                        parseDate(
                            oCurrent.BlockedAt
                        );

                    if (
                        oNewDate &&
                        (
                            !oCurrentDate ||
                            oNewDate >
                                oCurrentDate
                        )
                    ) {
                        mByEquipment[
                            sEquipment
                        ] = oBlock;
                    }
                }
            }
        );

        return Object.keys(
            mByEquipment
        ).map(
            function (sKey) {
                return (
                    mByEquipment[sKey]
                );
            }
        );
    }

    function distinctCount(
        aRows,
        fnValue
    ) {
        return new Set(
            (aRows || [])
                .map(fnValue)
                .filter(Boolean)
        ).size;
    }

    function groupDistinct(
        aRows,
        fnGroup,
        fnDistinct
    ) {
        var mGroups =
            Object.create(null);

        (aRows || []).forEach(
            function (oRow) {
                var sGroup =
                    String(
                        fnGroup(oRow) ||
                        "Sin datos"
                    );

                if (!mGroups[sGroup]) {
                    mGroups[sGroup] =
                        new Set();
                }

                var sDistinct =
                    String(
                        fnDistinct(oRow) ||
                        ""
                    );

                if (sDistinct) {
                    mGroups[sGroup].add(
                        sDistinct
                    );
                }
            }
        );

        return mGroups;
    }

    function buildMonths(
        oFrom,
        oTo
    ) {
        var aMonths = [];

        if (!oFrom || !oTo) {
            return aMonths;
        }

        var oCursor =
            new Date(
                oFrom.getFullYear(),
                oFrom.getMonth(),
                1
            );

        var oEnd =
            new Date(
                oTo.getFullYear(),
                oTo.getMonth(),
                1
            );

        while (
            oCursor.getTime() <=
            oEnd.getTime()
        ) {
            aMonths.push(
                new Date(
                    oCursor.getTime()
                )
            );

            oCursor.setMonth(
                oCursor.getMonth() + 1
            );
        }

        return aMonths;
    }

    function monthLabel(oDate) {
        var sLabel =
            new Intl.DateTimeFormat(
                "es-MX",
                {
                    month: "short",
                    year: "numeric"
                }
            ).format(oDate);

        return (
            sLabel.charAt(0)
                .toUpperCase() +
            sLabel.slice(1)
        );
    }

    function latestChangedAt(
        aBlocks,
        aEvents,
        aResources
    ) {
        var aDates = [];

        []
            .concat(
                aBlocks || [],
                aEvents || [],
                aResources || []
            )
            .forEach(
                function (oRow) {
                    var oDate =
                        parseDate(
                            oRow.ChangedAt ||
                            oRow.EventAt ||
                            oRow.WorkDate
                        );

                    if (oDate) {
                        aDates.push(
                            oDate
                        );
                    }
                }
            );

        if (!aDates.length) {
            return "Sin datos";
        }

        aDates.sort(
            function (a, b) {
                return (
                    b.getTime() -
                    a.getTime()
                );
            }
        );

        return formatDateTime(
            aDates[0]
        );
    }

    function mapData(
        oRawData,
        oFilters
    ) {
        var oRaw =
            oRawData || {};

        var oFilterData =
            oFilters || {};

        var oFrom =
            parseInputDate(
                oFilterData.fechaDesde
            );

        var oTo =
            parseInputDate(
                oFilterData.fechaHasta
            );

        var mResources =
            buildResourceMap(
                oRaw.resources || []
            );

        var aFilteredBlocks =
            (oRaw.blocks || [])
                .filter(
                    function (oBlock) {
                        return (
                            oBlock.IsPublishable !==
                                false &&
                            overlaps(
                                oBlock.BlockedAt,
                                oBlock.ReleasedAt,
                                oFrom,
                                oTo
                            )
                        );
                    }
                )
                .filter(
                    function (oBlock) {

                        if (
                            oFilterData.zona &&
                            oFilterData.zona !==
                                "TODAS"
                        ) {
                            if (
                                normalize(
                                    oBlock.ZoneName ||
                                    oBlock.ZoneId
                                ) !==
                                normalize(
                                    oFilterData.zona
                                )
                            ) {
                                return false;
                            }
                        }

                        if (
                            oFilterData.cliente &&
                            oFilterData.cliente !==
                                "TODOS"
                        ) {
                            if (
                                normalize(
                                    oBlock.CustomerName ||
                                    oBlock.CustomerId
                                ) !==
                                normalize(
                                    oFilterData.cliente
                                )
                            ) {
                                return false;
                            }
                        }

                        if (
                            oFilterData.estatus &&
                            oFilterData.estatus !==
                                "TODOS"
                        ) {
                            if (
                                normalize(
                                    oBlock.CurrentStatusText ||
                                    oBlock.CurrentStatusCode
                                ) !==
                                normalize(
                                    oFilterData.estatus
                                )
                            ) {
                                return false;
                            }
                        }

                        if (
                            oFilterData.supervisor &&
                            oFilterData.supervisor !==
                                "TODOS"
                        ) {
                            if (
                                normalize(
                                    getSupervisorName(
                                        mResources,
                                        oBlock
                                    )
                                ) !==
                                normalize(
                                    oFilterData.supervisor
                                )
                            ) {
                                return false;
                            }
                        }

                        return true;
                    }
                );

        var aRepresentative =
            uniqueRepresentativeBlocks(
                aFilteredBlocks
            );

        var mBlockIds =
            Object.create(null);

        aFilteredBlocks.forEach(
            function (oBlock) {
                if (oBlock.BlockId) {
                    mBlockIds[
                        String(
                            oBlock.BlockId
                        )
                    ] = true;
                }
            }
        );

        var aRelations =
            (oRaw.blockOrders || [])
                .filter(
                    function (oRelation) {
                        return !!mBlockIds[
                            String(
                                oRelation.BlockId ||
                                ""
                            )
                        ];
                    }
                )
                .filter(
                    function (oRelation) {
                        if (
                            !oRelation.ImpactStartAt &&
                            !oRelation.ImpactEndAt
                        ) {
                            return true;
                        }

                        return overlaps(
                            oRelation.ImpactStartAt,
                            oRelation.ImpactEndAt,
                            oFrom,
                            oTo
                        );
                    }
                );

        var mOrderIds =
            Object.create(null);

        aRelations.forEach(
            function (oRelation) {
                if (oRelation.OrderId) {
                    mOrderIds[
                        String(
                            oRelation.OrderId
                        )
                    ] = true;
                }
            }
        );

        var aOrders =
            (oRaw.orders || [])
                .filter(
                    function (oOrder) {
                        return !!mOrderIds[
                            String(
                                oOrder.OrderId ||
                                ""
                            )
                        ];
                    }
                );

        var aCurrentPending =
            (oRaw.events || [])
                .filter(
                    function (oEvent) {
                        return (
                            !!mBlockIds[
                                String(
                                    oEvent.BlockId ||
                                    ""
                                )
                            ] &&
                            normalize(
                                oEvent.RecordTypeCode
                            ) ===
                                "PENDING_ACTION" &&
                            oEvent.IsCurrent ===
                                true &&
                            !oEvent.ClosedAt
                        );
                    }
                );

        var iTotalEquipos =
            distinctCount(
                aRepresentative,
                function (oBlock) {
                    return (
                        oBlock.EquipmentId
                    );
                }
            );

        var iOrdenesAfectadas =
            distinctCount(
                aRelations,
                function (oRelation) {
                    return (
                        oRelation.OrderId
                    );
                }
            );

        var iMas30 =
            distinctCount(
                aRepresentative.filter(
                    function (oBlock) {
                        var oStart =
                            parseDate(
                                oBlock.BlockedAt
                            );

                        var oEnd =
                            parseDate(
                                oBlock.ReleasedAt
                            ) ||
                            oTo ||
                            new Date();

                        return (
                            diffDays(
                                oStart,
                                oEnd
                            ) > 30
                        );
                    }
                ),
                function (oBlock) {
                    return (
                        oBlock.EquipmentId
                    );
                }
            );

        var iCriticos =
            distinctCount(
                aRepresentative.filter(
                    function (oBlock) {
                        return (
                            normalize(
                                oBlock.CriticalityCode
                            ) ===
                            "CRITICAL"
                        );
                    }
                ),
                function (oBlock) {
                    return (
                        oBlock.EquipmentId
                    );
                }
            );

        var iPendientes =
            distinctCount(
                aCurrentPending,
                function (oEvent) {
                    return (
                        oEvent.BlockId
                    );
                }
            );

        var mMotivos =
            groupDistinct(
                aRepresentative,
                function (oBlock) {
                    return (
                        oBlock.BlockReasonText ||
                        oBlock.BlockReasonCode ||
                        "Sin datos"
                    );
                },
                function (oBlock) {
                    return (
                        oBlock.EquipmentId
                    );
                }
            );

        var aMotivos =
            Object.keys(mMotivos)
                .map(
                    function (
                        sReason,
                        iIndex
                    ) {
                        var iValue =
                            mMotivos[
                                sReason
                            ].size;

                        return {
                            label:
                                sReason,

                            value:
                                iValue,

                            percent:
                                iTotalEquipos > 0
                                    ? (
                                        iValue /
                                        iTotalEquipos
                                    ) * 100
                                    : 0,

                            color:
                                COLORS[
                                    iIndex %
                                    COLORS.length
                                ]
                        };
                    }
                )
                .sort(
                    function (a, b) {
                        return (
                            b.value -
                            a.value
                        );
                    }
                )
                .slice(0, 5);

        var mGestion =
            groupDistinct(
                aRepresentative,
                function (oBlock) {
                    return (
                        oBlock.ManagementStatusCode ||
                        "SIN_ESTATUS"
                    );
                },
                function (oBlock) {
                    return (
                        oBlock.EquipmentId
                    );
                }
            );

        var aTones = [
            "red",
            "orange",
            "yellow",
            "blue",
            "purple",
            "green"
        ];

        var aGestion =
            Object.keys(mGestion)
                .map(
                    function (
                        sCode,
                        iIndex
                    ) {
                        var iValue =
                            mGestion[
                                sCode
                            ].size;

                        return {
                            estado:
                                getCatalogText(
                                    oRaw.catalogs,
                                    [
                                        "MANAGEMENT_STATUS",
                                        "BLOCK_MANAGEMENT_STATUS"
                                    ],
                                    sCode
                                ) ||
                                sCode,

                            equipos:
                                iValue,

                            porcentaje:
                                (
                                    iTotalEquipos > 0
                                        ? (
                                            iValue /
                                            iTotalEquipos
                                        ) * 100
                                        : 0
                                ).toFixed(1) +
                                "%",

                            tono:
                                aTones[
                                    iIndex %
                                    aTones.length
                                ]
                        };
                    }
                )
                .sort(
                    function (a, b) {
                        return (
                            b.equipos -
                            a.equipos
                        );
                    }
                );

        var mBlockById =
            Object.create(null);

        aFilteredBlocks.forEach(
            function (oBlock) {
                if (oBlock.BlockId) {
                    mBlockById[
                        String(
                            oBlock.BlockId
                        )
                    ] = oBlock;
                }
            }
        );

        var mClientes =
            Object.create(null);

        aRelations.forEach(
            function (oRelation) {
                var oBlock =
                    mBlockById[
                        String(
                            oRelation.BlockId ||
                            ""
                        )
                    ];

                if (!oBlock) {
                    return;
                }

                var sClient =
                    oBlock.CustomerName ||
                    oBlock.CustomerId ||
                    "Sin datos";

                if (!mClientes[sClient]) {
                    mClientes[sClient] =
                        new Set();
                }

                if (oRelation.OrderId) {
                    mClientes[sClient].add(
                        String(
                            oRelation.OrderId
                        )
                    );
                }
            }
        );

        var aClientes =
            Object.keys(mClientes)
                .map(
                    function (sClient) {
                        return {
                            label:
                                sClient,

                            value:
                                mClientes[
                                    sClient
                                ].size
                        };
                    }
                )
                .sort(
                    function (a, b) {
                        return (
                            b.value -
                            a.value
                        );
                    }
                )
                .slice(0, 5);

        var mEstadosOrden =
            Object.create(null);

        aOrders.forEach(
            function (oOrder) {
                var sStatus =
                    oOrder.StatusText ||
                    oOrder.AppStatusCode ||
                    oOrder.SapUserStatusCode ||
                    "Sin datos";

                if (!mEstadosOrden[sStatus]) {
                    mEstadosOrden[sStatus] =
                        new Set();
                }

                if (oOrder.OrderId) {
                    mEstadosOrden[
                        sStatus
                    ].add(
                        String(
                            oOrder.OrderId
                        )
                    );
                }
            }
        );

        var aOrdenes =
            Object.keys(
                mEstadosOrden
            )
                .map(
                    function (
                        sStatus,
                        iIndex
                    ) {
                        var iValue =
                            mEstadosOrden[
                                sStatus
                            ].size;

                        return {
                            label:
                                sStatus,

                            value:
                                iValue,

                            percent:
                                iOrdenesAfectadas >
                                    0
                                    ? (
                                        iValue /
                                        iOrdenesAfectadas
                                    ) * 100
                                    : 0,

                            color:
                                COLORS[
                                    iIndex %
                                    COLORS.length
                                ]
                        };
                    }
                )
                .sort(
                    function (a, b) {
                        return (
                            b.value -
                            a.value
                        );
                    }
                );

        var aAgeRanges = [
            {
                label: "0 - 7 días",
                min: 0,
                max: 7,
                value: 0
            },
            {
                label: "8 - 15 días",
                min: 8,
                max: 15,
                value: 0
            },
            {
                label: "16 - 30 días",
                min: 16,
                max: 30,
                value: 0
            },
            {
                label: "> 30 días",
                min: 31,
                max: Infinity,
                value: 0
            }
        ];

        aRepresentative.forEach(
            function (oBlock) {
                var iDays =
                    diffDays(
                        parseDate(
                            oBlock.BlockedAt
                        ),
                        parseDate(
                            oBlock.ReleasedAt
                        ) ||
                        oTo ||
                        new Date()
                    );

                aAgeRanges.some(
                    function (oRange) {
                        if (
                            iDays >=
                                oRange.min &&
                            iDays <=
                                oRange.max
                        ) {
                            oRange.value += 1;
                            return true;
                        }

                        return false;
                    }
                );
            }
        );

        var aMonths =
            buildMonths(
                oFrom,
                oTo
            );

        var aEvolutionLabels = [];
        var aTotalBloqueos = [];
        var aDesbloqueos = [];
        var aVigentes = [];

        aMonths.forEach(
            function (oMonth) {
                var oMonthStart =
                    new Date(
                        oMonth.getFullYear(),
                        oMonth.getMonth(),
                        1
                    );

                var oMonthEnd =
                    new Date(
                        oMonth.getFullYear(),
                        oMonth.getMonth() + 1,
                        0,
                        23,
                        59,
                        59,
                        999
                    );

                aEvolutionLabels.push(
                    monthLabel(
                        oMonth
                    )
                );

                aTotalBloqueos.push(
                    distinctCount(
                        aFilteredBlocks.filter(
                            function (oBlock) {
                                var oDate =
                                    parseDate(
                                        oBlock.BlockedAt
                                    );

                                return (
                                    oDate &&
                                    oDate >=
                                        oMonthStart &&
                                    oDate <=
                                        oMonthEnd
                                );
                            }
                        ),
                        function (oBlock) {
                            return (
                                oBlock.EquipmentId
                            );
                        }
                    )
                );

                aDesbloqueos.push(
                    distinctCount(
                        aFilteredBlocks.filter(
                            function (oBlock) {
                                var oDate =
                                    parseDate(
                                        oBlock.ReleasedAt
                                    );

                                return (
                                    oDate &&
                                    oDate >=
                                        oMonthStart &&
                                    oDate <=
                                        oMonthEnd
                                );
                            }
                        ),
                        function (oBlock) {
                            return (
                                oBlock.EquipmentId
                            );
                        }
                    )
                );

                aVigentes.push(
                    distinctCount(
                        aFilteredBlocks.filter(
                            function (oBlock) {
                                var oBlocked =
                                    parseDate(
                                        oBlock.BlockedAt
                                    );

                                var oReleased =
                                    parseDate(
                                        oBlock.ReleasedAt
                                    );

                                return (
                                    oBlocked &&
                                    oBlocked <=
                                        oMonthEnd &&
                                    (
                                        !oReleased ||
                                        oReleased >
                                            oMonthEnd
                                    )
                                );
                            }
                        ),
                        function (oBlock) {
                            return (
                                oBlock.EquipmentId
                            );
                        }
                    )
                );
            }
        );

        var mMatrix =
            Object.create(null);

        aRepresentative.forEach(
            function (oBlock) {
                var sZone =
                    oBlock.ZoneName ||
                    oBlock.ZoneId ||
                    "Sin datos";

                if (!mMatrix[sZone]) {
                    mMatrix[sZone] = {
                        zone:
                            sZone,
                        critical:
                            new Set(),
                        high:
                            new Set(),
                        medium:
                            new Set(),
                        low:
                            new Set()
                    };
                }

                var sLevel =
                    criticalityKey(
                        oBlock.CriticalityCode
                    );

                mMatrix[sZone][
                    sLevel
                ].add(
                    String(
                        oBlock.EquipmentId ||
                        oBlock.BlockId
                    )
                );
            }
        );

        var aMatrix =
            Object.keys(mMatrix)
                .map(
                    function (
                        sZone,
                        iIndex
                    ) {
                        var oRow =
                            mMatrix[
                                sZone
                            ];

                        var iCritical =
                            oRow.critical.size;

                        var iHigh =
                            oRow.high.size;

                        var iMedium =
                            oRow.medium.size;

                        var iLow =
                            oRow.low.size;

                        return {
                            zone:
                                sZone,

                            color:
                                COLORS[
                                    iIndex %
                                    COLORS.length
                                ],

                            critical:
                                iCritical,

                            high:
                                iHigh,

                            medium:
                                iMedium,

                            low:
                                iLow,

                            total:
                                iCritical +
                                iHigh +
                                iMedium +
                                iLow
                        };
                    }
                )
                .sort(
                    function (a, b) {
                        return (
                            b.total -
                            a.total
                        );
                    }
                );

        var mBlocksByEquipment =
            Object.create(null);

        aFilteredBlocks.forEach(
            function (oBlock) {
                var sEquipment =
                    String(
                        oBlock.EquipmentId ||
                        ""
                    );

                if (!sEquipment) {
                    return;
                }

                if (!mBlocksByEquipment[
                    sEquipment
                ]) {
                    mBlocksByEquipment[
                        sEquipment
                    ] = [];
                }

                mBlocksByEquipment[
                    sEquipment
                ].push(
                    oBlock
                );
            }
        );

        var aEquipos =
            aRepresentative.map(
                function (oBlock) {
                    var sEquipment =
                        String(
                            oBlock.EquipmentId ||
                            ""
                        );

                    var aEquipmentBlocks =
                        mBlocksByEquipment[
                            sEquipment
                        ] || [];

                    var mEquipmentBlockIds =
                        Object.create(null);

                    aEquipmentBlocks.forEach(
                        function (oItem) {
                            if (
                                oItem.BlockId
                            ) {
                                mEquipmentBlockIds[
                                    String(
                                        oItem.BlockId
                                    )
                                ] = true;
                            }
                        }
                    );

                    var iAffected =
                        distinctCount(
                            aRelations.filter(
                                function (
                                    oRelation
                                ) {
                                    return !!mEquipmentBlockIds[
                                        String(
                                            oRelation.BlockId ||
                                            ""
                                        )
                                    ];
                                }
                            ),
                            function (
                                oRelation
                            ) {
                                return (
                                    oRelation.OrderId
                                );
                            }
                        );

                    var iDays =
                        diffDays(
                            parseDate(
                                oBlock.BlockedAt
                            ),
                            parseDate(
                                oBlock.ReleasedAt
                            ) ||
                            oTo ||
                            new Date()
                        );

                    return {
                        equipo:
                            oBlock.EquipmentId ||
                            oBlock.EquipmentName ||
                            "Sin datos",

                        cliente:
                            oBlock.CustomerName ||
                            oBlock.CustomerId ||
                            "Sin datos",

                        zona:
                            oBlock.ZoneName ||
                            oBlock.ZoneId ||
                            "Sin datos",

                        estatus:
                            oBlock.CurrentStatusText ||
                            oBlock.CurrentStatusCode ||
                            "Sin datos",

                        estatusKey:
                            statusKey(
                                oBlock.CurrentStatusCode,
                                oBlock.CurrentStatusText
                            ),

                        motivo:
                            oBlock.BlockReasonText ||
                            oBlock.BlockReasonCode ||
                            "Sin datos",

                        fechaBloqueo:
                            formatDate(
                                oBlock.BlockedAt
                            ),

                        fechaBloqueoISO:
                            toIsoDate(
                                oBlock.BlockedAt
                            ),

                        diasBloqueado:
                            iDays,

                        ordenesAfectadas:
                            iAffected,

                        responsable:
                            getResourceName(
                                mResources,
                                oBlock.ResponsibleId
                            ),

                        proximaAccion:
                            oBlock.NextAction ||
                            "Sin datos",

                        fechaCompromiso:
                            formatDate(
                                oBlock.CommitmentDate
                            ),

                        prioridad:
                            priorityText(
                                oRaw.catalogs,
                                oBlock.PriorityCode
                            ),

                        prioridadKey:
                            priorityKey(
                                oBlock.PriorityCode
                            )
                    };
                }
            )
            .sort(
                function (a, b) {
                    return (
                        b.diasBloqueado -
                        a.diasBloqueado
                    );
                }
            );

        return {
            kpis: {
                totalBloqueados:
                    formatInteger(
                        iTotalEquipos
                    ),

                ordenesAfectadas:
                    formatInteger(
                        iOrdenesAfectadas
                    ),

                mayores30Dias:
                    formatInteger(
                        iMas30
                    ),

                criticos:
                    formatInteger(
                        iCriticos
                    ),

                pendientesDesbloqueo:
                    formatInteger(
                        iPendientes
                    )
            },

            gestionDesbloqueo:
                aGestion,

            chartsData: {
                motivos:
                    aMotivos,

                clientes:
                    aClientes,

                ordenes:
                    aOrdenes,

                antiguedad:
                    aAgeRanges,

                evolucion: {
                    labels:
                        aEvolutionLabels,

                    totalBloqueos:
                        aTotalBloqueos,

                    desbloqueos:
                        aDesbloqueos,

                    vigentes:
                        aVigentes
                },

                matriz:
                    aMatrix
            },

            ageSummary: {
                total:
                    iTotalEquipos,

                over30:
                    iMas30,

                percentOver30:
                    iTotalEquipos > 0
                        ? (
                            iMas30 /
                            iTotalEquipos *
                            100
                        ).toFixed(1)
                        : "0.0"
            },

            equiposAll:
                aEquipos,

            equipos:
                aEquipos,

            lastUpdated:
                latestChangedAt(
                    aFilteredBlocks,
                    oRaw.events,
                    oRaw.resources
                ),

            meta: {
                blocks:
                    aFilteredBlocks.length,

                uniqueEquipment:
                    iTotalEquipos,

                blockOrders:
                    aRelations.length,

                orders:
                    aOrders.length,

                events:
                    aCurrentPending.length
            }
        };
    }

    return {
        mapData: mapData
    };
});
