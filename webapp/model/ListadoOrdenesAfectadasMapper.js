sap.ui.define([], function () {
    "use strict";

    /*
     * REGLA DE VENCIMIENTO
     *
     * La especificación indica que todavía debe
     * confirmarse si el vencimiento se calcula con:
     *
     * - DashboardOrdersSet.PlannedFinishDate
     * - DashboardEquipmentBlocksSet.CommitmentDate
     *
     * Mientras no exista aprobación funcional,
     * no se inventa la regla.
     */
    var OVERDUE_DATE_SOURCE = null;

    function normalize(
        vValue
    ) {
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

    function parseODataDate(
        vValue
    ) {
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

        oDate = aMatch
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

    function startOfDay(
        oDate
    ) {
        return oDate
            ? new Date(
                oDate.getFullYear(),
                oDate.getMonth(),
                oDate.getDate()
            )
            : null;
    }

    function formatDate(
        vValue
    ) {
        var oDate =
            parseODataDate(vValue);

        if (!oDate) {
            return "Sin datos";
        }

        return (
            String(
                oDate.getDate()
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            String(
                oDate.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +
            "/" +
            oDate.getFullYear()
        );
    }

    function toISODate(
        vValue
    ) {
        var oDate =
            parseODataDate(vValue);

        if (!oDate) {
            return "";
        }

        return (
            oDate.getFullYear() +
            "-" +
            String(
                oDate.getMonth() + 1
            ).padStart(
                2,
                "0"
            ) +
            "-" +
            String(
                oDate.getDate()
            ).padStart(
                2,
                "0"
            )
        );
    }

    function diffDays(
        oFrom,
        oTo
    ) {
        if (
            !oFrom ||
            !oTo
        ) {
            return null;
        }

        return Math.max(
            0,
            Math.floor(
                (
                    startOfDay(oTo)
                        .getTime() -
                    startOfDay(oFrom)
                        .getTime()
                ) /
                    86400000
            )
        );
    }

    function uniqueCount(
        aRows,
        fnKey
    ) {
        var mSeen =
            Object.create(null);

        (aRows || []).forEach(
            function (
                oRow
            ) {
                var sKey =
                    String(
                        fnKey(oRow) ||
                            ""
                    );

                if (sKey) {
                    mSeen[sKey] =
                        true;
                }
            }
        );

        return Object.keys(
            mSeen
        ).length;
    }

    function buildMap(
        aRows,
        sKey
    ) {
        var mMap =
            Object.create(null);

        (aRows || []).forEach(
            function (
                oRow
            ) {
                var sValue =
                    String(
                        oRow[sKey] ||
                            ""
                    );

                if (
                    sValue &&
                    !mMap[sValue]
                ) {
                    mMap[sValue] =
                        oRow;
                }
            }
        );

        return mMap;
    }

    function buildRelationsByOrder(
        aBlockOrders
    ) {
        var mMap =
            Object.create(null);

        (aBlockOrders || []).forEach(
            function (
                oRelation
            ) {
                var sOrderId =
                    String(
                        oRelation.OrderId ||
                            ""
                    );

                if (!sOrderId) {
                    return;
                }

                if (!mMap[sOrderId]) {
                    mMap[sOrderId] = [];
                }

                mMap[sOrderId].push(
                    oRelation
                );
            }
        );

        return mMap;
    }

    function buildAssignmentsByOrder(
        aAssignments
    ) {
        var mMap =
            Object.create(null);

        (aAssignments || []).forEach(
            function (
                oAssignment
            ) {
                var sOrderId =
                    String(
                        oAssignment.OrderId ||
                            ""
                    );

                if (!sOrderId) {
                    return;
                }

                if (!mMap[sOrderId]) {
                    mMap[sOrderId] = [];
                }

                mMap[sOrderId].push(
                    oAssignment
                );
            }
        );

        return mMap;
    }

    function buildResourceMap(
        aResources
    ) {
        var mMap =
            Object.create(null);

        (aResources || []).forEach(
            function (
                oResource
            ) {
                var sResourceId =
                    String(
                        oResource.ResourceId ||
                            ""
                    );

                if (
                    sResourceId &&
                    !mMap[sResourceId]
                ) {
                    mMap[sResourceId] =
                        oResource;
                }
            }
        );

        return mMap;
    }

    function buildCatalogTextMap(
        aCatalogs
    ) {
        var mMap =
            Object.create(null);

        (aCatalogs || []).forEach(
            function (
                oCatalog
            ) {
                var sDomain =
                    normalize(
                        oCatalog.FilterDomain
                    );

                var sValueId =
                    String(
                        oCatalog.ValueId ||
                            ""
                    );

                if (
                    sDomain &&
                    sValueId
                ) {
                    mMap[
                        sDomain +
                            "|" +
                            sValueId
                    ] =
                        oCatalog.ValueText ||
                        sValueId;
                }
            }
        );

        return mMap;
    }

    function getCatalogText(
        mCatalog,
        aDomains,
        sValue
    ) {
        var sCode =
            String(
                sValue || ""
            );

        var iIndex;
        var sKey;

        if (!sCode) {
            return "";
        }

        for (
            iIndex = 0;
            iIndex <
                aDomains.length;
            iIndex += 1
        ) {
            sKey =
                normalize(
                    aDomains[iIndex]
                ) +
                "|" +
                sCode;

            if (mCatalog[sKey]) {
                return mCatalog[sKey];
            }
        }

        return sCode;
    }

    function chooseRelation(
        aRelations
    ) {
        if (
            !aRelations ||
            !aRelations.length
        ) {
            return null;
        }

        /*
         * Si existen varias relaciones para la misma OT,
         * priorizamos HIGH, luego MEDIUM y LOW.
         * Esto afecta sólo la representación visual de
         * ImpactLevelCode; los KPIs usan DISTINCT OrderId.
         */
        return aRelations
            .slice()
            .sort(function (
                a,
                b
            ) {
                var mRank = {
                    HIGH: 3,
                    MEDIUM: 2,
                    LOW: 1
                };

                return (
                    (
                        mRank[
                            normalize(
                                b.ImpactLevelCode
                            )
                        ] || 0
                    ) -
                    (
                        mRank[
                            normalize(
                                a.ImpactLevelCode
                            )
                        ] || 0
                    )
                );
            })[0];
    }

    function chooseAssignment(
        aAssignments
    ) {
        if (
            !aAssignments ||
            !aAssignments.length
        ) {
            return null;
        }

        /*
         * La especificación pide definir la regla
         * de asignación principal/vigente.
         *
         * Mientras se confirma, se prioriza una
         * asignación sin ValidTo y después la primera.
         */
        return (
            aAssignments.find(
                function (
                    oAssignment
                ) {
                    return !oAssignment.ValidTo;
                }
            ) ||
            aAssignments[0]
        );
    }

    function getOverdueData(
        oOrder,
        oBlock,
        oCutoff
    ) {
        var oDueDate;
        var iDays;

        if (!OVERDUE_DATE_SOURCE) {
            return {
                days:
                    null,

                text:
                    "Sin datos"
            };
        }

        if (
            OVERDUE_DATE_SOURCE ===
            "PLANNED_FINISH"
        ) {
            oDueDate =
                parseODataDate(
                    oOrder.PlannedFinishDate
                );
        }

        if (
            OVERDUE_DATE_SOURCE ===
            "COMMITMENT"
        ) {
            oDueDate =
                parseODataDate(
                    oBlock &&
                        oBlock.CommitmentDate
                );
        }

        if (!oDueDate) {
            return {
                days:
                    null,

                text:
                    "Sin datos"
            };
        }

        iDays =
            diffDays(
                oDueDate,
                oCutoff
            );

        return {
            days:
                iDays,

            text:
                String(iDays)
        };
    }

    function createCatalog(
        aItems,
        sAllText
    ) {
        var mSeen =
            Object.create(null);

        var aResult = [
            {
                key:
                    "ALL",

                text:
                    sAllText
            }
        ];

        (aItems || []).forEach(
            function (
                oItem
            ) {
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

                if (
                    !sKey ||
                    mSeen[sKey]
                ) {
                    return;
                }

                mSeen[sKey] =
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
        aRows
    ) {
        return {
            periods: [
                {
                    key:
                        "CURRENT_MONTH",

                    text:
                        "Mes actual"
                },
                {
                    key:
                        "PREVIOUS_MONTH",

                    text:
                        "Mes anterior"
                },
                {
                    key:
                        "LAST_3_MONTHS",

                    text:
                        "Últimos 3 meses"
                }
            ],

            zones:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.zoneCode ||
                                    oRow.zone,

                                text:
                                    oRow.zone
                            };
                        }
                    ),
                    "Todas"
                ),

            clients:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.clientCode ||
                                    oRow.client,

                                text:
                                    oRow.client
                            };
                        }
                    ),
                    "Todos"
                ),

            orderTypes:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.orderTypeCode ||
                                    oRow.orderType,

                                text:
                                    oRow.orderType
                            };
                        }
                    ),
                    "Todos"
                ),

            orderStatuses:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.orderStatusCode ||
                                    oRow.orderStatus,

                                text:
                                    oRow.orderStatus
                            };
                        }
                    ),
                    "Todos"
                ),

            supervisors:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.supervisorCode ||
                                    oRow.supervisor,

                                text:
                                    oRow.supervisor
                            };
                        }
                    ),
                    "Todos"
                ),

            blockStatuses:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.blockStatusCode ||
                                    oRow.blockStatus,

                                text:
                                    oRow.blockStatus
                            };
                        }
                    ),
                    "Todos"
                )
        };
    }

    function matches(
        sSelected,
        aValues
    ) {
        if (
            !sSelected ||
            sSelected === "ALL"
        ) {
            return true;
        }

        return (
            aValues || []
        ).some(function (
            vValue
        ) {
            return (
                normalize(vValue) ===
                normalize(sSelected)
            );
        });
    }

    function isInsideDateRange(
        oRowDate,
        oDateFrom,
        oDateTo
    ) {
        var oFrom;
        var oTo;

        if (!oRowDate) {
            return false;
        }

        if (
            oDateFrom instanceof Date &&
            !Number.isNaN(
                oDateFrom.getTime()
            )
        ) {
            oFrom =
                startOfDay(oDateFrom);

            if (
                startOfDay(oRowDate) <
                oFrom
            ) {
                return false;
            }
        }

        if (
            oDateTo instanceof Date &&
            !Number.isNaN(
                oDateTo.getTime()
            )
        ) {
            oTo =
                startOfDay(oDateTo);

            if (
                startOfDay(oRowDate) >
                oTo
            ) {
                return false;
            }
        }

        return true;
    }

    function applyFilters(
        aRows,
        oFilters
    ) {
        return (
            aRows || []
        ).filter(function (
            oRow
        ) {
            return (
                matches(
                    oFilters.zone,
                    [
                        oRow.zoneCode,
                        oRow.zone
                    ]
                ) &&
                matches(
                    oFilters.client,
                    [
                        oRow.clientCode,
                        oRow.client
                    ]
                ) &&
                matches(
                    oFilters.orderType,
                    [
                        oRow.orderTypeCode,
                        oRow.orderType
                    ]
                ) &&
                matches(
                    oFilters.orderStatus,
                    [
                        oRow.orderStatusCode,
                        oRow.orderStatus
                    ]
                ) &&
                matches(
                    oFilters.supervisor,
                    [
                        oRow.supervisorCode,
                        oRow.supervisor
                    ]
                ) &&
                matches(
                    oFilters.blockStatus,
                    [
                        oRow.blockStatusCode,
                        oRow.blockStatus
                    ]
                ) &&
                isInsideDateRange(
                    oRow.startDateRaw,
                    oFilters.dateFrom,
                    oFilters.dateTo
                )
            );
        });
    }

    function mapData(
        oRawData,
        oFilters
    ) {
        var oRaw =
            oRawData || {};

        var mOrders =
            buildMap(
                oRaw.orders || [],
                "OrderId"
            );

        var mBlocks =
            buildMap(
                oRaw.blocks || [],
                "BlockId"
            );

        var mRelations =
            buildRelationsByOrder(
                oRaw.blockOrders || []
            );

        var mAssignments =
            buildAssignmentsByOrder(
                oRaw.orderResources || []
            );

        var mResources =
            buildResourceMap(
                oRaw.resources || []
            );

        var mCatalog =
            buildCatalogTextMap(
                oRaw.catalogs || []
            );

        var oCutoff =
            (
                oFilters &&
                oFilters.dateTo instanceof
                    Date
            )
                ? oFilters.dateTo
                : new Date();

        var aRows =
            Object.keys(mRelations)
                .map(function (
                    sOrderId
                ) {
                    var oOrder =
                        mOrders[sOrderId];

                    var oRelation =
                        chooseRelation(
                            mRelations[sOrderId]
                        );

                    var oBlock =
                        oRelation
                            ? mBlocks[
                                String(
                                    oRelation.BlockId ||
                                        ""
                                )
                            ]
                            : null;

                    var oAssignment =
                        chooseAssignment(
                            mAssignments[
                                sOrderId
                            ]
                        );

                    var oResource =
                        oAssignment
                            ? mResources[
                                String(
                                    oAssignment.ResourceId ||
                                        ""
                                )
                            ]
                            : null;

                    var oOverdue;

                    if (!oOrder) {
                        return null;
                    }

                    oOverdue =
                        getOverdueData(
                            oOrder,
                            oBlock,
                            oCutoff
                        );

                    return {
                        order:
                            oOrder.OrderId ||
                            "Sin datos",

                        orderType:
                            oOrder.OrderTypeText ||
                            oOrder.OrderTypeCode ||
                            "Sin datos",

                        orderTypeCode:
                            oOrder.OrderTypeCode ||
                            "",

                        equipment:
                            oOrder.EquipmentId ||
                            oOrder.EquipmentName ||
                            (
                                oBlock &&
                                (
                                    oBlock.EquipmentId ||
                                    oBlock.EquipmentName
                                )
                            ) ||
                            "Sin datos",

                        client:
                            oOrder.CustomerName ||
                            (
                                oBlock &&
                                oBlock.CustomerName
                            ) ||
                            oOrder.CustomerId ||
                            "Sin datos",

                        clientCode:
                            oOrder.CustomerId ||
                            (
                                oBlock &&
                                oBlock.CustomerId
                            ) ||
                            "",

                        zone:
                            (
                                oBlock &&
                                (
                                    oBlock.ZoneName ||
                                    oBlock.ZoneId
                                )
                            ) ||
                            "Sin datos",

                        zoneCode:
                            (
                                oBlock &&
                                oBlock.ZoneId
                            ) ||
                            "",

                        orderStatus:
                            oOrder.StatusText ||
                            oOrder.AppStatusCode ||
                            oOrder.SapUserStatusCode ||
                            "Sin datos",

                        orderStatusCode:
                            oOrder.AppStatusCode ||
                            oOrder.SapUserStatusCode ||
                            "",

                        startDate:
                            formatDate(
                                oOrder.PlannedStartDate
                            ),

                        startDateISO:
                            toISODate(
                                oOrder.PlannedStartDate
                            ),

                        startDateRaw:
                            parseODataDate(
                                oOrder.PlannedStartDate
                            ),

                        commitmentDate:
                            formatDate(
                                oBlock &&
                                oBlock.CommitmentDate
                            ),

                        overdueDays:
                            oOverdue.days,

                        overdueDaysText:
                            oOverdue.text,

                        supervisor:
                            (
                                oResource &&
                                oResource.SupervisorName
                            ) ||
                            (
                                oBlock &&
                                oBlock.SupervisorId
                            ) ||
                            "Sin datos",

                        supervisorCode:
                            (
                                oResource &&
                                oResource.SupervisorId
                            ) ||
                            (
                                oBlock &&
                                oBlock.SupervisorId
                            ) ||
                            "",

                        assignedResource:
                            (
                                oResource &&
                                oResource.ResourceName
                            ) ||
                            (
                                oAssignment &&
                                oAssignment.ResourceId
                            ) ||
                            "Sin datos",

                        impact:
                            getCatalogText(
                                mCatalog,
                                [
                                    "BLOCK_IMPACT",
                                    "IMPACT"
                                ],
                                oRelation &&
                                oRelation.ImpactLevelCode
                            ) ||
                            (
                                oRelation &&
                                oRelation.ImpactLevelCode
                            ) ||
                            "Sin datos",

                        impactCode:
                            (
                                oRelation &&
                                oRelation.ImpactLevelCode
                            ) ||
                            "",

                        priority:
                            getCatalogText(
                                mCatalog,
                                [
                                    "PRIORITY",
                                    "BLOCK_PRIORITY"
                                ],
                                oBlock &&
                                oBlock.PriorityCode
                            ) ||
                            (
                                oBlock &&
                                oBlock.PriorityCode
                            ) ||
                            "Sin datos",

                        priorityCode:
                            (
                                oBlock &&
                                oBlock.PriorityCode
                            ) ||
                            "",

                        blockStatus:
                            (
                                oBlock &&
                                (
                                    oBlock.CurrentStatusText ||
                                    oBlock.CurrentStatusCode
                                )
                            ) ||
                            "Sin datos",

                        blockStatusCode:
                            (
                                oBlock &&
                                oBlock.CurrentStatusCode
                            ) ||
                            "",

                        blockId:
                            (
                                oRelation &&
                                oRelation.BlockId
                            ) ||
                            ""
                    };
                })
                .filter(Boolean);

        /*
         * Los catálogos se crean antes de aplicar filtros
         * para que un filtro no haga desaparecer las
         * opciones disponibles en los demás Select.
         */
        var oCatalogs =
            buildCatalogs(aRows);

        var aFilteredRows =
            applyFilters(
                aRows,
                oFilters || {}
            );

        var iHighImpact =
            uniqueCount(
                aFilteredRows.filter(
                    function (
                        oRow
                    ) {
                        return (
                            normalize(
                                oRow.impactCode
                            ) === "HIGH"
                        );
                    }
                ),
                function (
                    oRow
                ) {
                    return oRow.order;
                }
            );

        var iBlockedEquipment =
            uniqueCount(
                aFilteredRows,
                function (
                    oRow
                ) {
                    return oRow.equipment;
                }
            );

        var vOverdueKpi =
            OVERDUE_DATE_SOURCE
                ? uniqueCount(
                    aFilteredRows.filter(
                        function (
                            oRow
                        ) {
                            return (
                                Number.isFinite(
                                    oRow.overdueDays
                                ) &&
                                oRow.overdueDays >
                                    0
                            );
                        }
                    ),
                    function (
                        oRow
                    ) {
                        return oRow.order;
                    }
                )
                : "Sin datos";

        return {
            rows:
                aFilteredRows,

            catalogs:
                oCatalogs,

            kpis: {
                affected:
                    uniqueCount(
                        aFilteredRows,
                        function (
                            oRow
                        ) {
                            return oRow.order;
                        }
                    ),

                overdue:
                    vOverdueKpi,

                blockedEquipment:
                    iBlockedEquipment,

                highImpact:
                    iHighImpact
            },

            meta: {
                overdueRule:
                    OVERDUE_DATE_SOURCE ||
                    "PENDING_FUNCTIONAL_CONFIRMATION",

                relations:
                    (
                        oRaw.blockOrders ||
                        []
                    ).length,

                blocks:
                    (
                        oRaw.blocks ||
                        []
                    ).length,

                orders:
                    (
                        oRaw.orders ||
                        []
                    ).length,

                orderResources:
                    (
                        oRaw.orderResources ||
                        []
                    ).length,

                resources:
                    (
                        oRaw.resources ||
                        []
                    ).length,

                catalogs:
                    (
                        oRaw.catalogs ||
                        []
                    ).length
            }
        };
    }

    return {
        mapData:
            mapData
    };
});
