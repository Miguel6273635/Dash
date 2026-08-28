sap.ui.define([], function () {
    "use strict";

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

    function formatDate(
        vValue
    ) {
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

    function formatTime(
        vValue
    ) {
        var oDate =
            parseDate(vValue);

        if (!oDate) {
            return "";
        }

        return (
            String(
                oDate.getHours()
            ).padStart(2, "0") +
            ":" +
            String(
                oDate.getMinutes()
            ).padStart(2, "0")
        );
    }

    function formatDateTime(
        vValue
    ) {
        var sDate =
            formatDate(vValue);

        if (
            sDate ===
            "Sin datos"
        ) {
            return sDate;
        }

        return (
            sDate +
            " " +
            formatTime(vValue)
        );
    }

    function toISO(
        vValue
    ) {
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

    function startOfDay(
        oDate
    ) {
        if (!oDate) {
            return null;
        }

        return new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate()
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
                    startOfDay(
                        oTo
                    ).getTime() -
                    startOfDay(
                        oFrom
                    ).getTime()
                ) /
                86400000
            )
        );
    }

    function buildResourceMap(
        aResources
    ) {
        var mMap =
            Object.create(null);

        (aResources || []).forEach(
            function (oRow) {
                if (
                    oRow.ResourceId &&
                    !mMap[
                        oRow.ResourceId
                    ]
                ) {
                    mMap[
                        oRow.ResourceId
                    ] = oRow;
                }

                if (
                    oRow.PersonnelNumber &&
                    !mMap[
                        oRow.PersonnelNumber
                    ]
                ) {
                    mMap[
                        oRow.PersonnelNumber
                    ] = oRow;
                }
            }
        );

        return mMap;
    }

    function getResource(
        mResources,
        sId
    ) {
        return (
            mResources[
                String(
                    sId || ""
                )
            ] ||
            null
        );
    }

    function getResourceName(
        mResources,
        sId
    ) {
        var oResource =
            getResource(
                mResources,
                sId
            );

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
        var oResource =
            getResource(
                mResources,
                oBlock &&
                oBlock.SupervisorId
            );

        if (oResource) {
            return (
                oResource.ResourceName ||
                oResource.SupervisorName ||
                "Sin datos"
            );
        }

        return (
            oBlock &&
            oBlock.SupervisorId
        ) ||
        "Sin datos";
    }

    function statusKey(
        sCode,
        sText
    ) {
        var sValue =
            normalize(
                sCode ||
                sText
            );

        if (
            sValue.indexOf(
                "BLOCK"
            ) >= 0
        ) {
            return "BLOCKED";
        }

        if (
            sValue.indexOf(
                "PROCESS"
            ) >= 0 ||
            sValue.indexOf(
                "PROCES"
            ) >= 0
        ) {
            return "PROCESS";
        }

        if (
            sValue.indexOf(
                "ANAL"
            ) >= 0
        ) {
            return "ANALYSIS";
        }

        if (
            sValue.indexOf(
                "REVIEW"
            ) >= 0 ||
            sValue.indexOf(
                "REVISION"
            ) >= 0
        ) {
            return "REVIEW";
        }

        if (
            sValue.indexOf(
                "PEND"
            ) >= 0
        ) {
            return "PENDING";
        }

        return "NONE";
    }

    function priorityKey(
        sCode
    ) {
        var sValue =
            normalize(
                sCode
            );

        if (
            sValue === "HIGH" ||
            sValue === "ALTA" ||
            sValue === "CRITICAL" ||
            sValue === "CRITICA"
        ) {
            return "HIGH";
        }

        if (
            sValue === "MEDIUM" ||
            sValue === "MEDIA"
        ) {
            return "MEDIUM";
        }

        return "LOW";
    }

    function priorityText(
        sCode
    ) {
        var sKey =
            priorityKey(
                sCode
            );

        if (
            sKey === "HIGH"
        ) {
            return "Alta";
        }

        if (
            sKey === "MEDIUM"
        ) {
            return "Media";
        }

        if (
            normalize(
                sCode
            ) === "LOW"
        ) {
            return "Baja";
        }

        return (
            sCode ||
            "Sin datos"
        );
    }

    function getLatestDate(
        oBlock,
        aEvents
    ) {
        var aDates = [];

        [
            oBlock &&
                oBlock.ChangedAt
        ]
            .concat(
                (aEvents || [])
                    .map(
                        function (
                            oEvent
                        ) {
                            return (
                                oEvent.ChangedAt ||
                                oEvent.EventAt
                            );
                        }
                    )
            )
            .forEach(
                function (vDate) {
                    var oDate =
                        parseDate(
                            vDate
                        );

                    if (oDate) {
                        aDates.push(
                            oDate
                        );
                    }
                }
            );

        if (!aDates.length) {
            return null;
        }

        aDates.sort(
            function (a, b) {
                return (
                    b.getTime() -
                    a.getTime()
                );
            }
        );

        return aDates[0];
    }

    function countDistinct(
        aRows,
        sField
    ) {
        return new Set(
            (aRows || [])
                .map(
                    function (oRow) {
                        return (
                            oRow[sField] ||
                            ""
                        );
                    }
                )
                .filter(Boolean)
        ).size;
    }

    function getMostActiveResponsible(
        aEvents,
        mResources
    ) {
        var mCount =
            Object.create(null);

        (aEvents || []).forEach(
            function (oEvent) {
                var sId =
                    oEvent.ResponsibleId;

                if (!sId) {
                    return;
                }

                mCount[sId] =
                    (
                        mCount[sId] ||
                        0
                    ) + 1;
            }
        );

        var sWinner =
            Object.keys(mCount)
                .sort(
                    function (a, b) {
                        return (
                            mCount[b] -
                            mCount[a]
                        );
                    }
                )[0];

        return sWinner
            ? getResourceName(
                mResources,
                sWinner
            )
            : "Sin datos";
    }

    function buildSelectCatalog(
        aItems,
        sKeyField,
        sTextField
    ) {
        var mSeen =
            Object.create(null);

        var aResult = [
            {
                key: "ALL",
                text: "Todos"
            }
        ];

        (aItems || []).forEach(
            function (oItem) {
                var sKey =
                    String(
                        oItem[
                            sKeyField
                        ] || ""
                    );

                var sText =
                    String(
                        oItem[
                            sTextField
                        ] ||
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
                    key: sKey,
                    text: sText
                });
            }
        );

        return aResult;
    }

    function mapData(
        oRawData,
        sEquipmentId
    ) {
        var oRaw =
            oRawData || {};

        var oBlock =
            oRaw.block ||
            null;

        var aEvents =
            oRaw.events || [];

        var mResources =
            buildResourceMap(
                oRaw.resources || []
            );

        if (!oBlock) {
            return {
                equipmentId:
                    sEquipmentId ||
                    "Sin datos",

                general: {
                    equipo:
                        sEquipmentId ||
                        "Sin datos",

                    cliente:
                        "Sin datos",

                    zona:
                        "Sin datos",

                    supervisor:
                        "Sin datos",

                    sitio:
                        "Sin datos",

                    direccion:
                        "Sin datos",

                    tipoEquipo:
                        "Sin datos",

                    modelo:
                        "Sin datos"
                },

                summary: {
                    motivo:
                        "Sin datos",

                    responsableActual:
                        "Sin datos",

                    fechaBloqueo:
                        "Sin datos",

                    estadoGestion:
                        "Sin datos",

                    estadoKey:
                        "NONE",

                    fechaCompromiso:
                        "Sin datos",

                    observacion:
                        "Sin datos"
                },

                kpis: {
                    estatusActual:
                        "Sin datos",

                    diasBloqueado:
                        "Sin datos",

                    eventosRegistrados:
                        0,

                    pendientesAbiertos:
                        0,

                    ultimaActualizacion:
                        "Sin datos",

                    proximaAccion:
                        "Sin datos"
                },

                indicators: {
                    principalCausa:
                        "Sin datos",

                    ultimaActualizacion:
                        "Sin datos",

                    responsableMasActivo:
                        "Sin datos",

                    diasDesdeUltimaIntervencion:
                        "Sin datos"
                },

                eventTypes: [
                    {
                        key: "ALL",
                        text: "Todos"
                    }
                ],

                responsibles: [
                    {
                        key: "ALL",
                        text: "Todos"
                    }
                ],

                resultStatuses: [
                    {
                        key: "ALL",
                        text: "Todos"
                    }
                ],

                timelineAll:
                    [],

                timeline:
                    [],

                pendingAll:
                    [],

                pending:
                    [],

                logAll:
                    [],

                log:
                    []
            };
        }

        var aPendingEvents =
            aEvents.filter(
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
                        oEvent.IsCurrent ===
                            true &&
                        !oEvent.ClosedAt
                    );
                }
            );

        var oLatest =
            getLatestDate(
                oBlock,
                aEvents
            );

        var oBlockedAt =
            parseDate(
                oBlock.BlockedAt
            );

        var oReleasedAt =
            parseDate(
                oBlock.ReleasedAt
            );

        var iBlockedDays =
            oBlockedAt
                ? diffDays(
                    oBlockedAt,
                    oReleasedAt ||
                    new Date()
                )
                : null;

        var iDaysSinceLast =
            oLatest
                ? diffDays(
                    oLatest,
                    new Date()
                )
                : null;

        var aTimeline =
            aEvents
                .slice()
                .sort(
                    function (a, b) {
                        return (
                            (
                                parseDate(
                                    b.EventAt
                                ) ||
                                new Date(0)
                            ).getTime() -
                            (
                                parseDate(
                                    a.EventAt
                                ) ||
                                new Date(0)
                            ).getTime()
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

                            dateIso:
                                toISO(
                                    oEvent.EventAt
                                ),

                            user:
                                getResourceName(
                                    mResources,
                                    oEvent.ResponsibleId
                                ),

                            responsible:
                                getResourceName(
                                    mResources,
                                    oEvent.ResponsibleId
                                ),

                            responsibleKey:
                                oEvent.ResponsibleId ||
                                "",

                            comment:
                                oEvent.Comment ||
                                oEvent.ActionCode ||
                                "Sin datos",

                            eventType:
                                oEvent.ActionCode ||
                                oEvent.RecordTypeCode ||
                                "",

                            eventTypeText:
                                oEvent.ActionCode ||
                                oEvent.RecordTypeCode ||
                                "Sin datos",

                            resultStatus:
                                oEvent.StatusText ||
                                oEvent.StatusCode ||
                                "Sin datos",

                            statusKey:
                                statusKey(
                                    oEvent.StatusCode,
                                    oEvent.StatusText
                                )
                        };
                    }
                );

        var aPending =
            aCurrentPending.map(
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

                        responsibleKey:
                            oEvent.ResponsibleId ||
                            "",

                        resultStatus:
                            oEvent.StatusText ||
                            oEvent.StatusCode ||
                            "Sin datos",

                        statusKey:
                            statusKey(
                                oEvent.StatusCode,
                                oEvent.StatusText
                            ),

                        date:
                            formatDate(
                                oEvent.CommitmentDate
                            ),

                        dateIso:
                            toISO(
                                oEvent.CommitmentDate
                            ),

                        priority:
                            priorityText(
                                oEvent.PriorityCode
                            ),

                        priorityKey:
                            priorityKey(
                                oEvent.PriorityCode
                            ),

                        eventType:
                            oEvent.ActionCode ||
                            oEvent.PendingTypeCode ||
                            "",

                        eventTypeText:
                            oEvent.ActionCode ||
                            oEvent.PendingTypeCode ||
                            "Sin datos"
                    };
                }
            );

        var aLog =
            aEvents.map(
                function (oEvent) {
                    return {
                        date:
                            formatDate(
                                oEvent.EventAt
                            ),

                        time:
                            formatTime(
                                oEvent.EventAt
                            ),

                        dateIso:
                            toISO(
                                oEvent.EventAt
                            ),

                        user:
                            getResourceName(
                                mResources,
                                oEvent.ResponsibleId
                            ),

                        responsible:
                            getResourceName(
                                mResources,
                                oEvent.ResponsibleId
                            ),

                        responsibleKey:
                            oEvent.ResponsibleId ||
                            "",

                        area:
                            "Sin datos",

                        eventType:
                            oEvent.ActionCode ||
                            oEvent.RecordTypeCode ||
                            "",

                        eventTypeText:
                            oEvent.ActionCode ||
                            oEvent.RecordTypeCode ||
                            "Sin datos",

                        comment:
                            oEvent.Comment ||
                            "Sin datos",

                        previousStatus:
                            "Sin datos",

                        previousStatusKey:
                            "NONE",

                        resultStatus:
                            oEvent.StatusText ||
                            oEvent.StatusCode ||
                            "Sin datos",

                        statusKey:
                            statusKey(
                                oEvent.StatusCode,
                                oEvent.StatusText
                            ),

                        order:
                            "N/A",

                        evidence:
                            "N/A",

                        evidenceKey:
                            "NONE"
                    };
                }
            );

        var aResponsibleCatalog =
            buildSelectCatalog(
                (oRaw.resources || [])
                    .filter(
                        function (oResource) {
                            return (
                                oResource.ResourceId &&
                                oResource.ResourceName
                            );
                        }
                    ),
                "ResourceId",
                "ResourceName"
            );

        var aEventTypeCatalog =
            buildSelectCatalog(
                aTimeline
                    .map(
                        function (oItem) {
                            return {
                                key:
                                    oItem.eventType,

                                text:
                                    oItem.eventTypeText
                            };
                        }
                    ),
                "key",
                "text"
            );

        var aStatusCatalog =
            buildSelectCatalog(
                aTimeline
                    .map(
                        function (oItem) {
                            return {
                                key:
                                    oItem.statusKey,

                                text:
                                    oItem.resultStatus
                            };
                        }
                    ),
                "key",
                "text"
            );

        return {
            equipmentId:
                oBlock.EquipmentId ||
                sEquipmentId ||
                "Sin datos",

            general: {
                equipo:
                    oBlock.EquipmentId ||
                    "Sin datos",

                cliente:
                    oBlock.CustomerName ||
                    oBlock.CustomerId ||
                    "Sin datos",

                zona:
                    oBlock.ZoneName ||
                    oBlock.ZoneId ||
                    "Sin datos",

                supervisor:
                    getSupervisorName(
                        mResources,
                        oBlock
                    ),

                sitio:
                    oBlock.SiteName ||
                    oBlock.SiteId ||
                    "Sin datos",

                direccion:
                    "Sin datos",

                tipoEquipo:
                    "Sin datos",

                modelo:
                    "Sin datos"
            },

            summary: {
                motivo:
                    oBlock.BlockReasonText ||
                    oBlock.BlockReasonCode ||
                    "Sin datos",

                responsableActual:
                    getResourceName(
                        mResources,
                        oBlock.ResponsibleId
                    ),

                fechaBloqueo:
                    formatDate(
                        oBlock.BlockedAt
                    ),

                estadoGestion:
                    oBlock.ManagementStatusCode ||
                    "Sin datos",

                estadoKey:
                    statusKey(
                        oBlock.ManagementStatusCode,
                        ""
                    ),

                fechaCompromiso:
                    formatDate(
                        oBlock.CommitmentDate
                    ),

                observacion:
                    oBlock.GeneralObservation ||
                    "Sin datos"
            },

            kpis: {
                estatusActual:
                    oBlock.CurrentStatusText ||
                    oBlock.CurrentStatusCode ||
                    "Sin datos",

                diasBloqueado:
                    iBlockedDays === null
                        ? "Sin datos"
                        : String(
                            iBlockedDays
                        ),

                eventosRegistrados:
                    countDistinct(
                        aEvents,
                        "BlockEventId"
                    ),

                pendientesAbiertos:
                    countDistinct(
                        aCurrentPending,
                        "BlockEventId"
                    ),

                ultimaActualizacion:
                    oLatest
                        ? formatDateTime(
                            oLatest
                        )
                        : "Sin datos",

                proximaAccion:
                    oBlock.NextAction ||
                    "Sin datos"
            },

            indicators: {
                principalCausa:
                    oBlock.BlockReasonText ||
                    oBlock.BlockReasonCode ||
                    "Sin datos",

                ultimaActualizacion:
                    oLatest
                        ? formatDateTime(
                            oLatest
                        )
                        : "Sin datos",

                responsableMasActivo:
                    getMostActiveResponsible(
                        aEvents,
                        mResources
                    ),

                diasDesdeUltimaIntervencion:
                    iDaysSinceLast === null
                        ? "Sin datos"
                        : String(
                            iDaysSinceLast
                        )
            },

            eventTypes:
                aEventTypeCatalog,

            responsibles:
                aResponsibleCatalog,

            resultStatuses:
                aStatusCatalog,

            timelineAll:
                aTimeline,

            timeline:
                aTimeline.slice(),

            pendingAll:
                aPending,

            pending:
                aPending.slice(),

            logAll:
                aLog,

            log:
                aLog.slice()
        };
    }

    return {
        mapData:
            mapData
    };
});