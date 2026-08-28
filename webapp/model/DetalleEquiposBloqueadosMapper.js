sap.ui.define([], function () {
    "use strict";

    var NEAR_DUE_DAYS = 3;

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
            "ALL",
            "PERSONALIZADO"
        ].indexOf(
            normalize(vValue)
        ) >= 0;
    }

    function parseODataDate(vValue) {
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

        aMatch = String(vValue).match(
            /\/Date\((-?\d+)/
        );

        oDate = aMatch
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

    function parseInputDate(sValue) {
        var aMatch;
        var oDate;

        if (!sValue) {
            return null;
        }

        aMatch = String(sValue).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

        if (aMatch) {
            return new Date(
                Number(aMatch[1]),
                Number(aMatch[2]) - 1,
                Number(aMatch[3])
            );
        }

        aMatch = String(sValue).match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

        if (aMatch) {
            return new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        }

        oDate = new Date(
            sValue
        );

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
    }

    function startOfDay(oDate) {
        return oDate
            ? new Date(
                oDate.getFullYear(),
                oDate.getMonth(),
                oDate.getDate()
            )
            : null;
    }

    function formatDate(vValue) {
        var oDate =
            parseODataDate(
                vValue
            );

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

    function uniqueCount(
        aItems,
        fnKey
    ) {
        var mSeen =
            Object.create(
                null
            );

        (aItems || []).forEach(
            function (
                oItem
            ) {
                var sKey =
                    String(
                        fnKey(
                            oItem
                        ) || ""
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

    function matches(
        vFilter,
        aValues
    ) {
        var sFilter =
            normalize(
                vFilter
            );

        if (isAll(vFilter)) {
            return true;
        }

        return (
            aValues || []
        ).some(function (
            vValue
        ) {
            return (
                normalize(
                    vValue
                ) ===
                sFilter
            );
        });
    }

    function getCatalogTextMap(
        aCatalogs
    ) {
        var mMap =
            Object.create(
                null
            );

        (aCatalogs || []).forEach(
            function (
                oItem
            ) {
                var sDomain =
                    normalize(
                        oItem.FilterDomain
                    );

                var sValue =
                    String(
                        oItem.ValueId ||
                            ""
                    );

                if (
                    sDomain &&
                    sValue
                ) {
                    mMap[
                        sDomain +
                            "|" +
                            sValue
                    ] =
                        oItem.ValueText ||
                        sValue;
                }
            }
        );

        return mMap;
    }

    function catalogText(
        mMap,
        aDomains,
        sValue
    ) {
        var sKey =
            String(
                sValue || ""
            );

        var iIndex;

        if (!sKey) {
            return "";
        }

        for (
            iIndex = 0;
            iIndex <
                aDomains.length;
            iIndex++
        ) {
            if (
                mMap[
                    normalize(
                        aDomains[
                            iIndex
                        ]
                    ) +
                        "|" +
                        sKey
                ]
            ) {
                return mMap[
                    normalize(
                        aDomains[
                            iIndex
                        ]
                    ) +
                        "|" +
                        sKey
                ];
            }
        }

        return sKey;
    }

    function buildResourceMap(
        aResources
    ) {
        var mMap =
            Object.create(
                null
            );

        (aResources || []).forEach(
            function (
                oItem
            ) {
                var sId =
                    String(
                        oItem.ResourceId ||
                            ""
                    );

                if (
                    sId &&
                    !mMap[sId]
                ) {
                    mMap[sId] =
                        oItem.ResourceName ||
                        sId;
                }
            }
        );

        return mMap;
    }

    function buildOrdersByBlock(
        aBlockOrders
    ) {
        var mMap =
            Object.create(
                null
            );

        (aBlockOrders || []).forEach(
            function (
                oItem
            ) {
                var sBlockId =
                    String(
                        oItem.BlockId ||
                            ""
                    );

                var sOrderId =
                    String(
                        oItem.OrderId ||
                            ""
                    );

                if (
                    !sBlockId ||
                    !sOrderId
                ) {
                    return;
                }

                if (
                    !mMap[
                        sBlockId
                    ]
                ) {
                    mMap[
                        sBlockId
                    ] =
                        Object.create(
                            null
                        );
                }

                mMap[
                    sBlockId
                ][
                    sOrderId
                ] =
                    true;
            }
        );

        return mMap;
    }

    function buildCurrentEventMap(
        aEvents
    ) {
        var mMap =
            Object.create(
                null
            );

        (aEvents || []).forEach(
            function (
                oEvent
            ) {
                var sBlockId =
                    String(
                        oEvent.BlockId ||
                            ""
                    );

                var bCurrent =
                    oEvent.IsCurrent ===
                        true ||
                    normalize(
                        oEvent.IsCurrent
                    ) ===
                        "TRUE" ||
                    normalize(
                        oEvent.IsCurrent
                    ) ===
                        "X";

                if (
                    sBlockId &&
                    bCurrent
                ) {
                    mMap[
                        sBlockId
                    ] =
                        oEvent;
                }
            }
        );

        return mMap;
    }

    function createCatalog(
        aItems,
        sAllKey,
        sAllText
    ) {
        var mSeen =
            Object.create(
                null
            );

        var aResult = [
            {
                key:
                    sAllKey,

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

                var sNormalized =
                    normalize(
                        sKey
                    );

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
                ] =
                    true;

                aResult.push({
                    key:
                        sKey,

                    text:
                        String(
                            oItem.text ||
                                sKey
                        )
                });
            }
        );

        return aResult;
    }

    function getManagementState(
        sText
    ) {
        var sValue =
            normalize(
                sText
            );

        if (
            sValue.indexOf(
                "CERR"
            ) >= 0 ||
            sValue.indexOf(
                "COMPLET"
            ) >= 0
        ) {
            return "Success";
        }

        if (
            sValue.indexOf(
                "PEND"
            ) >= 0
        ) {
            return "Warning";
        }

        return "Information";
    }

    function getCommitmentState(
        oCommitment,
        oCutoff
    ) {
        var iDays;

        if (
            !oCommitment ||
            !oCutoff
        ) {
            return {
                text:
                    "Sin datos",

                state:
                    "None"
            };
        }

        if (
            startOfDay(
                oCommitment
            ) <
            startOfDay(
                oCutoff
            )
        ) {
            return {
                text:
                    "Vencido",

                state:
                    "Error"
            };
        }

        iDays =
            diffDays(
                oCutoff,
                oCommitment
            );

        if (
            Number.isFinite(
                iDays
            ) &&
            iDays <=
                NEAR_DUE_DAYS
        ) {
            return {
                text:
                    "Por vencer",

                state:
                    "Warning"
            };
        }

        return {
            text:
                "En fecha",

            state:
                "Success"
        };
    }

    function applyVisibleFilters(
        aRows,
        oFilters
    ) {
        return (
            aRows || []
        ).filter(function (
            oRow
        ) {
            var sSearch =
                normalize(
                    oFilters.busqueda
                );

            return (
                matches(
                    oFilters.zona,
                    [
                        oRow.zona,
                        oRow.zonaId
                    ]
                ) &&
                matches(
                    oFilters.cliente,
                    [
                        oRow.cliente,
                        oRow.clienteId
                    ]
                ) &&
                matches(
                    oFilters.estatusBloqueo,
                    [
                        oRow.estatusBloqueo,
                        oRow.estatusBloqueoCode
                    ]
                ) &&
                matches(
                    oFilters.supervisor,
                    [
                        oRow.supervisor,
                        oRow.supervisorId
                    ]
                ) &&
                matches(
                    oFilters.responsable,
                    [
                        oRow.responsable,
                        oRow.responsableId
                    ]
                ) &&
                matches(
                    oFilters.prioridad,
                    [
                        oRow.prioridadDesbloqueo,
                        oRow.prioridadCode
                    ]
                ) &&
                (
                    !sSearch ||
                    normalize(
                        oRow.equipo
                    ).indexOf(
                        sSearch
                    ) >= 0 ||
                    normalize(
                        oRow.cliente
                    ).indexOf(
                        sSearch
                    ) >= 0
                )
            );
        });
    }

    function buildCatalogs(
        aRows
    ) {
        return {
            zonas:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.zonaId ||
                                    oRow.zona,

                                text:
                                    oRow.zona
                            };
                        }
                    ),
                    "Todas",
                    "Todas"
                ),

            clientes:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.clienteId ||
                                    oRow.cliente,

                                text:
                                    oRow.cliente
                            };
                        }
                    ),
                    "Todos",
                    "Todos"
                ),

            estatusBloqueo:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.estatusBloqueoCode ||
                                    oRow.estatusBloqueo,

                                text:
                                    oRow.estatusBloqueo
                            };
                        }
                    ),
                    "Todos",
                    "Todos"
                ),

            supervisores:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.supervisorId ||
                                    oRow.supervisor,

                                text:
                                    oRow.supervisor
                            };
                        }
                    ),
                    "Todos",
                    "Todos"
                ),

            responsables:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.responsableId ||
                                    oRow.responsable,

                                text:
                                    oRow.responsable
                            };
                        }
                    ),
                    "Todos",
                    "Todos"
                ),

            prioridades:
                createCatalog(
                    aRows.map(
                        function (
                            oRow
                        ) {
                            return {
                                key:
                                    oRow.prioridadCode ||
                                    oRow.prioridadDesbloqueo,

                                text:
                                    oRow.prioridadDesbloqueo
                            };
                        }
                    ),
                    "Todas",
                    "Todas"
                )
        };
    }

    function mapBlocks(
        oRaw,
        oFilters
    ) {
        var oStart =
            parseInputDate(
                oFilters.fechaDesde
            );

        var oEnd =
            parseInputDate(
                oFilters.fechaHasta
            );

        var oCutoff =
            oEnd ||
            new Date();

        var mCatalogText =
            getCatalogTextMap(
                oRaw.catalogs ||
                    []
            );

        var mResource =
            buildResourceMap(
                oRaw.resources ||
                    []
            );

        var mOrdersByBlock =
            buildOrdersByBlock(
                oRaw.blockOrders ||
                    []
            );

        var mCurrentEvent =
            buildCurrentEventMap(
                oRaw.blockEvents ||
                    []
            );

        var aRows =
            (
                oRaw.blocks || []
            ).map(function (
                oBlock
            ) {
                var sBlockId =
                    String(
                        oBlock.BlockId ||
                            ""
                    );

                var oCurrent =
                    mCurrentEvent[
                        sBlockId
                    ] || {};

                var sPriority =
                    oCurrent.PriorityCode ||
                    oBlock.PriorityCode ||
                    "";

                var sResponsibleId =
                    oCurrent.ResponsibleId ||
                    oBlock.ResponsibleId ||
                    "";

                var vCommitment =
                    oCurrent.CommitmentDate ||
                    oBlock.CommitmentDate;

                var oBlockedAt =
                    parseODataDate(
                        oBlock.BlockedAt
                    );

                var oReleasedAt =
                    parseODataDate(
                        oBlock.ReleasedAt
                    );

                var nDays =
                    diffDays(
                        oBlockedAt,
                        oReleasedAt ||
                            oCutoff
                    );

                var oCommitmentState =
                    getCommitmentState(
                        parseODataDate(
                            vCommitment
                        ),
                        oCutoff
                    );

                var sManagementText =
                    catalogText(
                        mCatalogText,
                        [
                            "MANAGEMENT_STATUS",
                            "BLOCK_MANAGEMENT_STATUS"
                        ],
                        oBlock.ManagementStatusCode
                    ) ||
                    oBlock.ManagementStatusCode ||
                    "Sin datos";

                return {
                    sourceMode:
                        "BLOCKS",

                    blockId:
                        sBlockId,

                    orderIds:
                        Object.keys(
                            mOrdersByBlock[
                                sBlockId
                            ] || {}
                        ),

                    equipo:
                        oBlock.EquipmentId ||
                        oBlock.EquipmentName ||
                        "Sin datos",

                    cliente:
                        oBlock.CustomerName ||
                        oBlock.CustomerId ||
                        "Sin datos",

                    clienteId:
                        oBlock.CustomerId ||
                        "",

                    zona:
                        oBlock.ZoneName ||
                        oBlock.ZoneId ||
                        "Sin datos",

                    zonaId:
                        oBlock.ZoneId ||
                        "",

                    estatusBloqueo:
                        oBlock.CurrentStatusText ||
                        catalogText(
                            mCatalogText,
                            [
                                "BLOCK_STATUS",
                                "STATUS"
                            ],
                            oBlock.CurrentStatusCode
                        ) ||
                        oBlock.CurrentStatusCode ||
                        "Sin datos",

                    estatusBloqueoCode:
                        oBlock.CurrentStatusCode ||
                        "",

                    motivoBloqueo:
                        oBlock.BlockReasonText ||
                        catalogText(
                            mCatalogText,
                            [
                                "BLOCK_REASON"
                            ],
                            oBlock.BlockReasonCode
                        ) ||
                        oBlock.BlockReasonCode ||
                        "Sin datos",

                    estadoGestion:
                        sManagementText,

                    estadoGestionState:
                        getManagementState(
                            sManagementText
                        ),

                    fechaBloqueo:
                        formatDate(
                            oBlock.BlockedAt
                        ),

                    fechaBloqueoRaw:
                        oBlockedAt,

                    diasBloqueado:
                        Number.isFinite(
                            nDays
                        )
                            ? String(
                                nDays
                            )
                            : "Sin datos",

                    diasBloqueadoNum:
                        Number.isFinite(
                            nDays
                        )
                            ? nDays
                            : null,

                    ordenesAfectadas:
                        String(
                            Object.keys(
                                mOrdersByBlock[
                                    sBlockId
                                ] || {}
                            ).length
                        ),

                    responsable:
                        mResource[
                            sResponsibleId
                        ] ||
                        sResponsibleId ||
                        "Sin datos",

                    responsableId:
                        sResponsibleId,

                    supervisor:
                        mResource[
                            oCurrent.SupervisorId ||
                            oBlock.SupervisorId
                        ] ||
                        oCurrent.SupervisorId ||
                        oBlock.SupervisorId ||
                        "Sin datos",

                    supervisorId:
                        oCurrent.SupervisorId ||
                        oBlock.SupervisorId ||
                        "",

                    proximaAccion:
                        oBlock.NextAction ||
                        oCurrent.Comment ||
                        oCurrent.ActionCode ||
                        "Sin datos",

                    fechaCompromiso:
                        formatDate(
                            vCommitment
                        ),

                    prioridadDesbloqueo:
                        catalogText(
                            mCatalogText,
                            [
                                "PRIORITY"
                            ],
                            sPriority
                        ) ||
                        sPriority ||
                        "Sin datos",

                    prioridadCode:
                        sPriority,

                    criticalityCode:
                        oBlock.CriticalityCode ||
                        "",

                    currentEvent:
                        oCurrent,

                    estado:
                        oCommitmentState.text,

                    estadoState:
                        oCommitmentState.state
                };
            });

        /*
         * Para el flujo oficial, el periodo
         * se aplica sobre BlockedAt.
         */
        aRows =
            aRows.filter(function (
                oRow
            ) {
                if (
                    oStart &&
                    (
                        !oRow.fechaBloqueoRaw ||
                        startOfDay(
                            oRow.fechaBloqueoRaw
                        ) <
                            startOfDay(
                                oStart
                            )
                    )
                ) {
                    return false;
                }

                if (
                    oEnd &&
                    (
                        !oRow.fechaBloqueoRaw ||
                        startOfDay(
                            oRow.fechaBloqueoRaw
                        ) >
                            startOfDay(
                                oEnd
                            )
                    )
                ) {
                    return false;
                }

                return true;
            });

        return applyVisibleFilters(
            aRows,
            oFilters
        );
    }

    function mapOrdersFallback(
        oRaw,
        oFilters
    ) {
        var mByEquipment =
            Object.create(
                null
            );

        (
            oRaw.ordersFallback || []
        ).forEach(function (
            oOrder
        ) {
            var sEquipment =
                String(
                    oOrder.EquipmentId ||
                    oOrder.EquipmentName ||
                    ""
                );

            var sKey;
            var oItem;

            /*
             * Una fila debe representar un equipo.
             * Si no hay EquipmentId, no fabricamos uno.
             */
            if (!sEquipment) {
                return;
            }

            sKey =
                sEquipment;

            if (
                !mByEquipment[
                    sKey
                ]
            ) {
                mByEquipment[
                    sKey
                ] = {
                    sourceMode:
                        "ORDERS_FALLBACK",

                    blockId:
                        "",

                    orderIds:
                        [],

                    equipo:
                        oOrder.EquipmentId ||
                        oOrder.EquipmentName,

                    cliente:
                        oOrder.CustomerName ||
                        oOrder.CustomerId ||
                        "Sin datos",

                    clienteId:
                        oOrder.CustomerId ||
                        "",

                    zona:
                        oOrder.Zona ||
                        "Sin datos",

                    zonaId:
                        oOrder.Zona ||
                        "",

                    estatusBloqueo:
                        "Sin datos",

                    estatusBloqueoCode:
                        "",

                    motivoBloqueo:
                        "Sin datos",

                    estadoGestion:
                        "Sin datos",

                    estadoGestionState:
                        "None",

                    fechaBloqueo:
                        "Sin datos",

                    fechaBloqueoRaw:
                        null,

                    diasBloqueado:
                        "Sin datos",

                    diasBloqueadoNum:
                        null,

                    ordenesAfectadas:
                        "0",

                    responsable:
                        "Sin datos",

                    responsableId:
                        "",

                    supervisor:
                        "Sin datos",

                    supervisorId:
                        oOrder.SupervisorId &&
                        oOrder.SupervisorId !==
                            "0000000000"
                            ? oOrder.SupervisorId
                            : "",

                    proximaAccion:
                        "Sin datos",

                    fechaCompromiso:
                        "Sin datos",

                    prioridadDesbloqueo:
                        "Sin datos",

                    prioridadCode:
                        "",

                    criticalityCode:
                        "",

                    currentEvent:
                        {},

                    estado:
                        "Sin datos",

                    estadoState:
                        "None"
                };
            }

            oItem =
                mByEquipment[
                    sKey
                ];

            if (
                oOrder.OrderId &&
                oItem.orderIds.indexOf(
                    oOrder.OrderId
                ) < 0
            ) {
                oItem.orderIds.push(
                    oOrder.OrderId
                );
            }

            oItem.ordenesAfectadas =
                String(
                    oItem.orderIds.length
                );
        });

        return applyVisibleFilters(
            Object.keys(
                mByEquipment
            ).map(function (
                sKey
            ) {
                return (
                    mByEquipment[
                        sKey
                    ]
                );
            }),
            oFilters
        );
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
                        "Personalizado",

                    fechaDesde:
                        "",

                    fechaHasta:
                        "",

                    zona:
                        "Todas",

                    cliente:
                        "Todos",

                    estatusBloqueo:
                        "Todos",

                    supervisor:
                        "Todos",

                    responsable:
                        "Todos",

                    busqueda:
                        "",

                    prioridad:
                        "Todas"
                },
                mFilters || {}
            );

        var bBlocksMode =
            oRaw.sourceMode ===
                "BLOCKS";

        var aRows =
            bBlocksMode
                ? mapBlocks(
                    oRaw,
                    oFilters
                )
                : mapOrdersFallback(
                    oRaw,
                    oFilters
                );

        var oKpis;

        if (bBlocksMode) {
            oKpis = {
                equiposFiltrados:
                    uniqueCount(
                        aRows,
                        function (
                            oRow
                        ) {
                            return (
                                oRow.equipo
                            );
                        }
                    ),

                criticos:
                    uniqueCount(
                        aRows.filter(
                            function (
                                oRow
                            ) {
                                return (
                                    normalize(
                                        oRow.criticalityCode
                                    ) ===
                                    "CRITICAL"
                                );
                            }
                        ),
                        function (
                            oRow
                        ) {
                            return (
                                oRow.equipo
                            );
                        }
                    ),

                mayoresTreintaDias:
                    uniqueCount(
                        aRows.filter(
                            function (
                                oRow
                            ) {
                                return (
                                    Number.isFinite(
                                        oRow.diasBloqueadoNum
                                    ) &&
                                    oRow.diasBloqueadoNum >
                                        30
                                );
                            }
                        ),
                        function (
                            oRow
                        ) {
                            return (
                                oRow.equipo
                            );
                        }
                    ),

                pendientesAbiertos:
                    uniqueCount(
                        aRows.filter(
                            function (
                                oRow
                            ) {
                                var oEvent =
                                    oRow.currentEvent ||
                                    {};

                                return (
                                    normalize(
                                        oEvent.RecordTypeCode
                                    ) ===
                                        "PENDING_ACTION" &&
                                    normalize(
                                        oEvent.StatusCode
                                    ) ===
                                        "OPEN" &&
                                    !oEvent.ClosedAt
                                );
                            }
                        ),
                        function (
                            oRow
                        ) {
                            return (
                                oRow.equipo
                            );
                        }
                    )
            };
        } else {
            /*
             * En fallback sólo Equipos filtrados
             * es un KPI válido.
             *
             * Los otros tres requieren datos
             * específicos de bloqueo.
             */
            oKpis = {
                equiposFiltrados:
                    uniqueCount(
                        aRows,
                        function (
                            oRow
                        ) {
                            return (
                                oRow.equipo
                            );
                        }
                    ),

                criticos:
                    "Sin datos",

                mayoresTreintaDias:
                    "Sin datos",

                pendientesAbiertos:
                    "Sin datos"
            };
        }

        console.log(
            "[DEB MAPPER] Fuente:",
            oRaw.sourceMode
        );

        console.log(
            "[DEB MAPPER] Filas:",
            aRows.length
        );

        return {
            filters:
                oFilters,

            rows:
                aRows,

            kpis:
                oKpis,

            catalogos:
                buildCatalogs(
                    aRows
                ),

            meta: {
                sourceMode:
                    oRaw.sourceMode ||
                    "UNKNOWN",

                blocks:
                    (
                        oRaw.blocks ||
                        []
                    ).length,

                ordersFallback:
                    (
                        oRaw.ordersFallback ||
                        []
                    ).length,

                blockOrders:
                    (
                        oRaw.blockOrders ||
                        []
                    ).length,

                blockEvents:
                    (
                        oRaw.blockEvents ||
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