sap.ui.define([], function () {
    "use strict";

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

    function startOfDay(oDate) {
        if (!oDate) {
            return null;
        }

        return new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate()
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

    function diffDays(
        oStart,
        oEnd
    ) {
        if (
            !oStart ||
            !oEnd
        ) {
            return null;
        }

        return Math.max(
            0,
            Math.floor(
                (
                    startOfDay(
                        oEnd
                    ).getTime() -
                    startOfDay(
                        oStart
                    ).getTime()
                ) /
                86400000
            )
        );
    }

    function buildMap(
        aRows,
        sKey
    ) {
        var mMap =
            Object.create(null);

        (aRows || []).forEach(
            function (oRow) {
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

    function buildResourceMap(
        aResources
    ) {
        var mMap =
            Object.create(null);

        (aResources || []).forEach(
            function (oResource) {
                var sResourceId =
                    String(
                        oResource.ResourceId ||
                        ""
                    );

                var sPersonnel =
                    String(
                        oResource.PersonnelNumber ||
                        ""
                    );

                if (
                    sResourceId &&
                    !mMap[sResourceId]
                ) {
                    mMap[sResourceId] =
                        oResource;
                }

                if (
                    sPersonnel &&
                    !mMap[sPersonnel]
                ) {
                    mMap[sPersonnel] =
                        oResource;
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
        sSupervisorId
    ) {
        var oResource =
            mResources[
                String(
                    sSupervisorId ||
                    ""
                )
            ];

        if (oResource) {
            return (
                oResource.ResourceName ||
                oResource.SupervisorName ||
                sSupervisorId
            );
        }

        return (
            sSupervisorId ||
            "Sin datos"
        );
    }

    function getPriorityText(
        sPriority
    ) {
        switch (
            normalize(sPriority)
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
                sPriority ||
                "Sin datos"
            );
        }
    }

    function getPriorityKey(
        sPriority
    ) {
        switch (
            normalize(sPriority)
        ) {
        case "CRITICAL":
        case "CRITICA":
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
            return "none";
        }
    }

    function getImpactText(
        sImpact
    ) {
        switch (
            normalize(sImpact)
        ) {
        case "HIGH":
            return "Alto";

        case "MEDIUM":
            return "Medio";

        case "LOW":
            return "Bajo";

        default:
            return (
                sImpact ||
                "Sin datos"
            );
        }
    }

    function getImpactKey(
        sImpact
    ) {
        switch (
            normalize(sImpact)
        ) {
        case "HIGH":
            return "high";

        case "MEDIUM":
            return "medium";

        case "LOW":
            return "low";

        default:
            return "none";
        }
    }

    function getImpactIcon(
        sImpact
    ) {
        switch (
            normalize(sImpact)
        ) {
        case "HIGH":
            return "sap-icon://arrow-top";

        case "MEDIUM":
            return "sap-icon://circle-task-2";

        case "LOW":
            return "sap-icon://arrow-bottom";

        default:
            return "";
        }
    }

    function getStatusKey(
        sStatus
    ) {
        var sValue =
            normalize(sStatus);

        if (
            sValue.indexOf(
                "BLOCK"
            ) >= 0
        ) {
            return "blocked";
        }

        if (
            sValue.indexOf(
                "PROCESS"
            ) >= 0 ||
            sValue.indexOf(
                "PROCESO"
            ) >= 0
        ) {
            return "process";
        }

        if (
            sValue.indexOf(
                "PROGRAM"
            ) >= 0
        ) {
            return "scheduled";
        }

        if (
            sValue.indexOf(
                "REVIEW"
            ) >= 0 ||
            sValue.indexOf(
                "REVISION"
            ) >= 0
        ) {
            return "review";
        }

        if (
            sValue.indexOf(
                "ANAL"
            ) >= 0
        ) {
            return "analysis";
        }

        if (
            sValue.indexOf(
                "PEND"
            ) >= 0
        ) {
            return "pending";
        }

        return "open";
    }

    function selectBlock(
        aBlocks,
        sEquipmentId,
        sBlockId
    ) {
        var aCandidates =
            aBlocks || [];

        if (sBlockId) {
            return (
                aCandidates.find(
                    function (oBlock) {
                        return (
                            String(
                                oBlock.BlockId ||
                                ""
                            ) ===
                            String(sBlockId)
                        );
                    }
                ) ||
                null
            );
        }

        if (sEquipmentId) {
            return (
                aCandidates.find(
                    function (oBlock) {
                        return (
                            String(
                                oBlock.EquipmentId ||
                                ""
                            ) ===
                            String(
                                sEquipmentId
                            )
                        );
                    }
                ) ||
                null
            );
        }

        /*
         * Temporal:
         * si todavía no viene un equipo desde navegación,
         * usamos el primer bloqueo recibido.
         *
         * Cuando conectes la navegación, enviar EquipmentId
         * o BlockId es lo correcto.
         */
        return (
            aCandidates[0] ||
            null
        );
    }

    function mapData(
        oRawData,
        oSelection
    ) {
        var oRaw =
            oRawData || {};

        var oSelectionData =
            oSelection || {};

        var oBlock =
            selectBlock(
                oRaw.blocks || [],
                oSelectionData.equipmentId,
                oSelectionData.blockId
            );

        var mResources =
            buildResourceMap(
                oRaw.resources || []
            );

        var mOrders =
            buildMap(
                oRaw.orders || [],
                "OrderId"
            );

        /*
         * Mientras EquipmentBlocks esté vacío,
         * no inventamos un equipo.
         */
        if (!oBlock) {
            return {
                equipment: {
                    id:
                        "Sin datos",

                    client:
                        "Sin datos",

                    zone:
                        "Sin datos",

                    supervisor:
                        "Sin datos",

                    site:
                        "Sin datos",

                    address:
                        "Sin datos",

                    type:
                        "Sin datos",

                    model:
                        "Sin datos"
                },

                kpis: {
                    blockStatus: {
                        value:
                            "Sin datos",
                        label:
                            "Estatus de bloqueo"
                    },

                    blockedDays: {
                        value:
                            "Sin datos",
                        label:
                            "Días bloqueado"
                    },

                    affectedOrders: {
                        value:
                            "0",
                        label:
                            "Órdenes afectadas"
                    },

                    pendingUnlock: {
                        value:
                            "0",
                        label:
                            "Pendientes de desbloqueo"
                    },

                    priority: {
                        value:
                            "Sin datos",
                        label:
                            "Prioridad desbloqueo"
                    },

                    commitmentDate: {
                        value:
                            "Sin datos",
                        label:
                            "Fecha compromiso"
                    }
                },

                blockInformation: {
                    reason:
                        "Sin datos",

                    managementStatus:
                        "Sin datos",

                    blockDate:
                        "Sin datos",

                    responsible:
                        "Sin datos",

                    nextAction:
                        "Sin datos",

                    commitmentDate:
                        "Sin datos",

                    observation:
                        "Sin datos"
                },

                orders:
                    [],

                pendingItems:
                    [],

                history:
                    [],

                meta: {
                    blocks:
                        (
                            oRaw.blocks ||
                            []
                        ).length,

                    blockOrders:
                        (
                            oRaw.blockOrders ||
                            []
                        ).length,

                    orders:
                        (
                            oRaw.orders ||
                            []
                        ).length,

                    events:
                        (
                            oRaw.events ||
                            []
                        ).length,

                    resources:
                        (
                            oRaw.resources ||
                            []
                        ).length
                }
            };
        }

        var sBlockId =
            String(
                oBlock.BlockId ||
                ""
            );

        var aRelations =
            (
                oRaw.blockOrders ||
                []
            ).filter(
                function (oRelation) {
                    return (
                        String(
                            oRelation.BlockId ||
                            ""
                        ) ===
                        sBlockId
                    );
                }
            );

        var aBlockEvents =
            (
                oRaw.events ||
                []
            ).filter(
                function (oEvent) {
                    return (
                        String(
                            oEvent.BlockId ||
                            ""
                        ) ===
                        sBlockId
                    );
                }
            );

        var aPendingEvents =
            aBlockEvents.filter(
                function (oEvent) {
                    return (
                        normalize(
                            oEvent.RecordTypeCode
                        ) ===
                        "PENDING_ACTION"
                    );
                }
            );

        var aCurrentPending =
            aPendingEvents.filter(
                function (oEvent) {
                    return (
                        oEvent.IsCurrent === true &&
                        !oEvent.ClosedAt
                    );
                }
            );

        var aHistoryEvents =
            aBlockEvents.filter(
                function (oEvent) {
                    return (
                        normalize(
                            oEvent.RecordTypeCode
                        ) ===
                        "HISTORY_EVENT"
                    );
                }
            );

        var aOrders =
            aRelations.map(
                function (oRelation) {
                    var oOrder =
                        mOrders[
                            String(
                                oRelation.OrderId ||
                                ""
                            )
                        ] || {};

                    return {
                        order:
                            oRelation.OrderId ||
                            oOrder.OrderId ||
                            "Sin datos",

                        orderType:
                            oOrder.OrderTypeText ||
                            oOrder.OrderTypeCode ||
                            "Sin datos",

                        status:
                            oOrder.StatusText ||
                            oOrder.AppStatusCode ||
                            oOrder.SapUserStatusCode ||
                            "Sin datos",

                        statusKey:
                            getStatusKey(
                                oOrder.StatusText ||
                                oOrder.AppStatusCode
                            ),

                        date:
                            formatDate(
                                oOrder.PlannedStartDate
                            ),

                        impact:
                            getImpactText(
                                oRelation.ImpactLevelCode
                            ),

                        impactKey:
                            getImpactKey(
                                oRelation.ImpactLevelCode
                            ),

                        impactIcon:
                            getImpactIcon(
                                oRelation.ImpactLevelCode
                            )
                    };
                }
            );

        var aPendingItems =
            aPendingEvents.map(
                function (oEvent) {
                    return {
                        pending:
                            oEvent.PendingTypeCode ||
                            oEvent.ActionCode ||
                            "Sin datos",

                        responsible:
                            getResourceName(
                                mResources,
                                oEvent.ResponsibleId
                            ),

                        status:
                            oEvent.StatusText ||
                            oEvent.StatusCode ||
                            "Sin datos",

                        statusKey:
                            getStatusKey(
                                oEvent.StatusText ||
                                oEvent.StatusCode
                            ),

                        commitmentDate:
                            formatDate(
                                oEvent.CommitmentDate
                            ),

                        priority:
                            getPriorityText(
                                oEvent.PriorityCode
                            ),

                        priorityKey:
                            getPriorityKey(
                                oEvent.PriorityCode
                            )
                    };
                }
            );

        var aHistory =
            aHistoryEvents
                .slice()
                .sort(
                    function (
                        a,
                        b
                    ) {
                        var oDateA =
                            parseDate(
                                a.EventAt
                            );

                        var oDateB =
                            parseDate(
                                b.EventAt
                            );

                        return (
                            (
                                oDateB
                                    ? oDateB.getTime()
                                    : 0
                            ) -
                            (
                                oDateA
                                    ? oDateA.getTime()
                                    : 0
                            )
                        );
                    }
                )
                .map(
                    function (oEvent) {
                        return {
                            date:
                                formatDateTime(
                                    oEvent.EventAt
                                ),

                            user:
                                getResourceName(
                                    mResources,
                                    oEvent.ResponsibleId
                                ),

                            action:
                                oEvent.Comment ||
                                oEvent.ActionCode ||
                                "Sin datos",

                            resultStatus:
                                oEvent.StatusText ||
                                oEvent.StatusCode ||
                                "Sin datos",

                            resultStatusKey:
                                getStatusKey(
                                    oEvent.StatusText ||
                                    oEvent.StatusCode
                                ),

                            bulletColor:
                                "blue"
                        };
                    }
                );

        var oBlockedAt =
            parseDate(
                oBlock.BlockedAt
            );

        var oReleasedAt =
            parseDate(
                oBlock.ReleasedAt
            );

        var oCutoff =
            oReleasedAt ||
            new Date();

        var iBlockedDays =
            diffDays(
                oBlockedAt,
                oCutoff
            );

        /*
         * Fecha compromiso:
         * hasta que se confirme la regla funcional,
         * priorizamos el pendiente vigente cuando exista.
         * Si no, usamos CommitmentDate del bloqueo.
         */
        var oPrimaryPending =
            aCurrentPending[0] ||
            null;

        var vCommitment =
            (
                oPrimaryPending &&
                oPrimaryPending.CommitmentDate
            ) ||
            oBlock.CommitmentDate;

        var sPriority =
            (
                oPrimaryPending &&
                oPrimaryPending.PriorityCode
            ) ||
            oBlock.PriorityCode;

        var bActive =
            !oBlock.ReleasedAt;

        return {
            equipment: {
                id:
                    oBlock.EquipmentId ||
                    oBlock.EquipmentName ||
                    "Sin datos",

                client:
                    oBlock.CustomerName ||
                    oBlock.CustomerId ||
                    "Sin datos",

                zone:
                    oBlock.ZoneName ||
                    oBlock.ZoneId ||
                    "Sin datos",

                supervisor:
                    getSupervisorName(
                        mResources,
                        oBlock.SupervisorId
                    ),

                site:
                    oBlock.SiteName ||
                    oBlock.SiteId ||
                    "Sin datos",

                /*
                 * Estos campos aún no existen
                 * en el contrato actual.
                 */
                address:
                    oBlock.EquipmentAddress ||
                    "Sin datos",

                type:
                    oBlock.EquipmentTypeText ||
                    oBlock.EquipmentTypeCode ||
                    "Sin datos",

                model:
                    oBlock.EquipmentModel ||
                    "Sin datos"
            },

            kpis: {
                blockStatus: {
                    value:
                        oBlock.CurrentStatusText ||
                        (
                            bActive
                                ? "Bloqueado activo"
                                : "Liberado"
                        ),

                    label:
                        "Estatus de bloqueo"
                },

                blockedDays: {
                    value:
                        iBlockedDays === null
                            ? "Sin datos"
                            : String(
                                iBlockedDays
                            ),

                    label:
                        "Días bloqueado"
                },

                affectedOrders: {
                    value:
                        String(
                            new Set(
                                aRelations
                                    .map(
                                        function (
                                            oRelation
                                        ) {
                                            return (
                                                oRelation.OrderId ||
                                                ""
                                            );
                                        }
                                    )
                                    .filter(Boolean)
                            ).size
                        ),

                    label:
                        "Órdenes afectadas"
                },

                pendingUnlock: {
                    value:
                        String(
                            new Set(
                                aCurrentPending
                                    .map(
                                        function (
                                            oEvent
                                        ) {
                                            return (
                                                oEvent.BlockEventId ||
                                                ""
                                            );
                                        }
                                    )
                                    .filter(Boolean)
                            ).size
                        ),

                    label:
                        "Pendientes de desbloqueo"
                },

                priority: {
                    value:
                        getPriorityText(
                            sPriority
                        ),

                    label:
                        "Prioridad desbloqueo"
                },

                commitmentDate: {
                    value:
                        formatDate(
                            vCommitment
                        ),

                    label:
                        "Fecha compromiso"
                }
            },

            blockInformation: {
                reason:
                    oBlock.BlockReasonText ||
                    oBlock.BlockReasonCode ||
                    "Sin datos",

                managementStatus:
                    oBlock.ManagementStatusCode ||
                    "Sin datos",

                blockDate:
                    formatDate(
                        oBlock.BlockedAt
                    ),

                responsible:
                    getResourceName(
                        mResources,
                        oBlock.ResponsibleId
                    ),

                nextAction:
                    oBlock.NextAction ||
                    "Sin datos",

                commitmentDate:
                    formatDate(
                        vCommitment
                    ),

                observation:
                    oBlock.GeneralObservation ||
                    "Sin datos"
            },

            orders:
                aOrders,

            pendingItems:
                aPendingItems,

            history:
                aHistory,

            meta: {
                selectedBlockId:
                    sBlockId,

                blocks:
                    (
                        oRaw.blocks ||
                        []
                    ).length,

                blockOrders:
                    (
                        oRaw.blockOrders ||
                        []
                    ).length,

                orders:
                    (
                        oRaw.orders ||
                        []
                    ).length,

                events:
                    (
                        oRaw.events ||
                        []
                    ).length,

                resources:
                    (
                        oRaw.resources ||
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