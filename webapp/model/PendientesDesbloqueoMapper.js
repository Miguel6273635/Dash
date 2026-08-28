sap.ui.define([], function () {
    "use strict";

    var DEFAULT_DUE_SOON_DAYS = 7;

    function normalize(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
    }

    function parseODataDate(vValue) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }

        if (vValue instanceof Date) {
            return new Date(vValue.getTime());
        }

        aMatch = String(vValue).match(
            /\/Date\((-?\d+)/
        );

        oDate = aMatch
            ? new Date(Number(aMatch[1]))
            : new Date(vValue);

        return Number.isNaN(oDate.getTime())
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
        var oDate = parseODataDate(vValue);

        if (!oDate) {
            return "Sin datos";
        }

        return (
            String(oDate.getDate()).padStart(2, "0") +
            "/" +
            String(oDate.getMonth() + 1).padStart(2, "0") +
            "/" +
            oDate.getFullYear()
        );
    }

    function toISO(vValue) {
        var oDate = parseODataDate(vValue);

        if (!oDate) {
            return "";
        }

        return (
            oDate.getFullYear() +
            "-" +
            String(oDate.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(oDate.getDate()).padStart(2, "0")
        );
    }

    function diffDays(oFrom, oTo) {
        if (!oFrom || !oTo) {
            return null;
        }

        return Math.max(
            0,
            Math.floor(
                (
                    startOfDay(oTo).getTime() -
                    startOfDay(oFrom).getTime()
                ) / 86400000
            )
        );
    }

    function buildFirstMap(aRows, sKey) {
        var mMap = Object.create(null);

        (aRows || []).forEach(function (oRow) {
            var sValue = String(
                oRow[sKey] || ""
            );

            if (
                sValue &&
                !mMap[sValue]
            ) {
                mMap[sValue] = oRow;
            }
        });

        return mMap;
    }

    function buildResourceMap(aResources) {
        var mMap = Object.create(null);

        (aResources || []).forEach(function (oResource) {
            var sResourceId = String(
                oResource.ResourceId || ""
            );

            var sPersonnelNumber = String(
                oResource.PersonnelNumber || ""
            );

            if (
                sResourceId &&
                !mMap[sResourceId]
            ) {
                mMap[sResourceId] = oResource;
            }

            if (
                sPersonnelNumber &&
                !mMap[sPersonnelNumber]
            ) {
                mMap[sPersonnelNumber] = oResource;
            }
        });

        return mMap;
    }

    function buildCatalogTextMap(aCatalogs) {
        var mMap = Object.create(null);

        (aCatalogs || []).forEach(function (oCatalog) {
            var sDomain = normalize(
                oCatalog.FilterDomain
            );

            var sValueId = String(
                oCatalog.ValueId || ""
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
        });

        return mMap;
    }

    function getCatalogText(
        mCatalog,
        aDomains,
        sValue
    ) {
        var sCode = String(
            sValue || ""
        );

        var i;
        var sKey;

        if (!sCode) {
            return "";
        }

        for (
            i = 0;
            i < aDomains.length;
            i += 1
        ) {
            sKey =
                normalize(aDomains[i]) +
                "|" +
                sCode;

            if (mCatalog[sKey]) {
                return mCatalog[sKey];
            }
        }

        return sCode;
    }

    function getDueSoonDays(aCatalogs) {
        var oConfig = (aCatalogs || []).find(
            function (oCatalog) {
                return (
                    normalize(
                        oCatalog.FilterDomain
                    ) ===
                    "DUE_SOON_DAYS"
                );
            }
        );

        var iValue =
            oConfig
                ? Number(
                    oConfig.NumericValue
                )
                : NaN;

        return (
            Number.isFinite(iValue) &&
            iValue > 0
        )
            ? iValue
            : DEFAULT_DUE_SOON_DAYS;
    }

    function createCatalog(
        aItems,
        sAllText
    ) {
        var mSeen =
            Object.create(null);

        var aResult = [
            {
                key: "TODOS",
                text: sAllText
            }
        ];

        (aItems || []).forEach(
            function (oItem) {
                var sKey =
                    String(
                        oItem.key || ""
                    );

                var sText =
                    String(
                        oItem.text ||
                        sKey
                    );

                if (
                    !sKey ||
                    !sText ||
                    mSeen[sKey]
                ) {
                    return;
                }

                mSeen[sKey] = true;

                aResult.push({
                    key: sKey,
                    text: sText
                });
            }
        );

        return aResult;
    }

    function buildCatalogsFromAvailableData(
        aRows,
        aResources,
        aCatalogs
    ) {
        var aZoneItems = [];
        var aClientItems = [];
        var aStatusItems = [];
        var aResponsibleItems = [];
        var aSupervisorItems = [];

        /*
         * Datos consolidados de eventos + bloqueos
         */
        (aRows || []).forEach(function (oRow) {
            aZoneItems.push({
                key:
                    oRow.zonaKey ||
                    oRow.zona,

                text:
                    oRow.zona
            });

            aClientItems.push({
                key:
                    oRow.clienteKey ||
                    oRow.cliente,

                text:
                    oRow.cliente
            });

            aStatusItems.push({
                key:
                    oRow.estadoPendienteKey ||
                    oRow.estadoPendiente,

                text:
                    oRow.estadoPendiente
            });

            aResponsibleItems.push({
                key:
                    oRow.responsableKey ||
                    oRow.responsable,

                text:
                    oRow.responsable
            });

            aSupervisorItems.push({
                key:
                    oRow.supervisorKey ||
                    oRow.supervisor,

                text:
                    oRow.supervisor
            });
        });

        /*
         * Aprovechamos ResourceDaily aunque
         * BlockEvents todavía esté vacío.
         */
        (aResources || []).forEach(
            function (oResource) {
                if (oResource.ZoneId) {
                    aZoneItems.push({
                        key:
                            oResource.ZoneId,

                        text:
                            oResource.ZoneName ||
                            oResource.ZoneId
                    });
                }

                if (
                    oResource.ResourceId &&
                    oResource.ResourceName
                ) {
                    aResponsibleItems.push({
                        key:
                            oResource.ResourceId,

                        text:
                            oResource.ResourceName
                    });
                }

                if (
                    oResource.SupervisorId &&
                    oResource.SupervisorName
                ) {
                    aSupervisorItems.push({
                        key:
                            oResource.SupervisorId,

                        text:
                            oResource.SupervisorName
                    });
                }
            }
        );

        /*
         * Aprovechamos FilterCatalog.
         */
        (aCatalogs || []).forEach(
            function (oCatalog) {
                var sDomain =
                    normalize(
                        oCatalog.FilterDomain
                    );

                if (
                    sDomain === "MECHANIC" &&
                    oCatalog.ValueId &&
                    oCatalog.ValueText
                ) {
                    aResponsibleItems.push({
                        key:
                            oCatalog.ValueId,

                        text:
                            oCatalog.ValueText
                    });
                }

                if (
                    sDomain === "PENDING_STATUS" &&
                    oCatalog.ValueId &&
                    oCatalog.ValueText
                ) {
                    aStatusItems.push({
                        key:
                            oCatalog.ValueId,

                        text:
                            oCatalog.ValueText
                    });
                }

                if (
                    sDomain === "ZONE" &&
                    oCatalog.ValueId &&
                    oCatalog.ValueText
                ) {
                    aZoneItems.push({
                        key:
                            oCatalog.ValueId,

                        text:
                            oCatalog.ValueText
                    });
                }

                if (
                    sDomain === "CUSTOMER" &&
                    oCatalog.ValueId &&
                    oCatalog.ValueText
                ) {
                    aClientItems.push({
                        key:
                            oCatalog.ValueId,

                        text:
                            oCatalog.ValueText
                    });
                }

                if (
                    sDomain === "SUPERVISOR" &&
                    oCatalog.ValueId &&
                    oCatalog.ValueText
                ) {
                    aSupervisorItems.push({
                        key:
                            oCatalog.ValueId,

                        text:
                            oCatalog.ValueText
                    });
                }
            }
        );

        return {
            zonas:
                createCatalog(
                    aZoneItems,
                    "Todos"
                ),

            clientes:
                createCatalog(
                    aClientItems,
                    "Todos"
                ),

            estadosPendiente:
                createCatalog(
                    aStatusItems,
                    "Todos"
                ),

            responsables:
                createCatalog(
                    aResponsibleItems,
                    "Todos"
                ),

            supervisores:
                createCatalog(
                    aSupervisorItems,
                    "Todos"
                )
        };
    }

    function isOpenPending(oEvent) {
        return (
            normalize(
                oEvent.RecordTypeCode
            ) ===
                "PENDING_ACTION" &&
            oEvent.IsCurrent === true &&
            !oEvent.ClosedAt
        );
    }

    function getPendingText(
        oEvent,
        mCatalog
    ) {
        return (
            getCatalogText(
                mCatalog,
                [
                    "PENDING_TYPE",
                    "PENDING_ACTION"
                ],
                oEvent.PendingTypeCode
            ) ||
            getCatalogText(
                mCatalog,
                [
                    "ACTION"
                ],
                oEvent.ActionCode
            ) ||
            oEvent.PendingTypeCode ||
            oEvent.ActionCode ||
            "Sin datos"
        );
    }

    function getPriorityState(
        sPriority
    ) {
        var sCode =
            normalize(
                sPriority
            );

        if (
            sCode === "CRITICAL" ||
            sCode === "CRITICA" ||
            sCode === "HIGH" ||
            sCode === "ALTA"
        ) {
            return "Error";
        }

        if (
            sCode === "MEDIUM" ||
            sCode === "MEDIA"
        ) {
            return "Warning";
        }

        if (
            sCode === "LOW" ||
            sCode === "BAJA"
        ) {
            return "Success";
        }

        return "None";
    }

    function getStatusState(
        bClosed,
        bExpired,
        bDueSoon,
        sStatusCode
    ) {
        var sCode =
            normalize(
                sStatusCode
            );

        if (bClosed) {
            return "Success";
        }

        if (bExpired) {
            return "Error";
        }

        if (bDueSoon) {
            return "Warning";
        }

        if (
            sCode.indexOf("VALID") >= 0 ||
            sCode.indexOf("AUTH") >= 0
        ) {
            return "Information";
        }

        return "Warning";
    }

    function matches(
        sSelected,
        aValues
    ) {
        if (
            !sSelected ||
            sSelected === "TODOS"
        ) {
            return true;
        }

        return (
            aValues || []
        ).some(function (vValue) {
            return (
                normalize(vValue) ===
                normalize(sSelected)
            );
        });
    }

    function isInsideRange(
        sISO,
        sDesde,
        sHasta
    ) {
        if (!sISO) {
            return false;
        }

        if (
            sDesde &&
            sISO < sDesde
        ) {
            return false;
        }

        if (
            sHasta &&
            sISO > sHasta
        ) {
            return false;
        }

        return true;
    }

    function applyFilters(
        aRows,
        oFilters
    ) {
        return (
            aRows || []
        ).filter(function (oRow) {
            return (
                matches(
                    oFilters.zona,
                    [
                        oRow.zonaKey,
                        oRow.zona
                    ]
                ) &&
                matches(
                    oFilters.cliente,
                    [
                        oRow.clienteKey,
                        oRow.cliente
                    ]
                ) &&
                matches(
                    oFilters.estadoPendiente,
                    [
                        oRow.estadoPendienteKey,
                        oRow.estadoPendiente
                    ]
                ) &&
                matches(
                    oFilters.responsable,
                    [
                        oRow.responsableKey,
                        oRow.responsable
                    ]
                ) &&
                matches(
                    oFilters.supervisor,
                    [
                        oRow.supervisorKey,
                        oRow.supervisor
                    ]
                ) &&
                isInsideRange(
                    oRow.fechaRegistroISO,
                    oFilters.fechaDesde,
                    oFilters.fechaHasta
                )
            );
        });
    }

    function uniqueCount(
        aRows,
        fnKey
    ) {
        var mSeen =
            Object.create(null);

        (aRows || []).forEach(
            function (oRow) {
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

    function mapData(
        oRawData,
        oFilters
    ) {
        var oRaw =
            oRawData || {};

        var mBlocks =
            buildFirstMap(
                oRaw.blocks || [],
                "BlockId"
            );

        var mResources =
            buildResourceMap(
                oRaw.resources || []
            );

        var mCatalog =
            buildCatalogTextMap(
                oRaw.catalogs || []
            );

        var iDueSoonDays =
            getDueSoonDays(
                oRaw.catalogs || []
            );

        var oCutoff =
            oFilters.fechaHasta
                ? parseODataDate(
                    oFilters.fechaHasta +
                    "T00:00:00"
                )
                : new Date();

        var aRows =
            (
                oRaw.blockEvents ||
                []
            )
                .filter(
                    function (oEvent) {
                        return (
                            normalize(
                                oEvent.RecordTypeCode
                            ) ===
                            "PENDING_ACTION"
                        );
                    }
                )
                .map(function (oEvent) {
                    var oBlock =
                        mBlocks[
                            String(
                                oEvent.BlockId ||
                                ""
                            )
                        ];

                    var sResponsibleId =
                        oEvent.ResponsibleId ||
                        (
                            oBlock &&
                            oBlock.ResponsibleId
                        ) ||
                        "";

                    var sSupervisorId =
                        oEvent.SupervisorId ||
                        (
                            oBlock &&
                            oBlock.SupervisorId
                        ) ||
                        "";

                    var oResponsible =
                        mResources[
                            String(
                                sResponsibleId
                            )
                        ];

                    var oSupervisor =
                        mResources[
                            String(
                                sSupervisorId
                            )
                        ];

                    var oEventDate =
                        parseODataDate(
                            oEvent.EventAt
                        );

                    var oCommitmentDate =
                        parseODataDate(
                            oEvent.CommitmentDate
                        );

                    var oClosedDate =
                        parseODataDate(
                            oEvent.ClosedAt
                        );

                    var bClosed =
                        !!oClosedDate;

                    var bOpen =
                        isOpenPending(
                            oEvent
                        );

                    var bExpired =
                        !!(
                            bOpen &&
                            oCommitmentDate &&
                            startOfDay(
                                oCommitmentDate
                            ) <
                            startOfDay(
                                oCutoff
                            )
                        );

                    var oDueSoonEnd =
                        new Date(
                            startOfDay(
                                oCutoff
                            ).getTime() +
                            iDueSoonDays *
                                86400000
                        );

                    var bDueSoon =
                        !!(
                            bOpen &&
                            !bExpired &&
                            oCommitmentDate &&
                            startOfDay(
                                oCommitmentDate
                            ) >=
                            startOfDay(
                                oCutoff
                            ) &&
                            startOfDay(
                                oCommitmentDate
                            ) <=
                            oDueSoonEnd
                        );

                    var iPendingDays =
                        oEventDate
                            ? diffDays(
                                oEventDate,
                                bClosed
                                    ? oClosedDate
                                    : oCutoff
                            )
                            : null;

                    var sStatusText =
                        oEvent.StatusText ||
                        (
                            bClosed
                                ? "Completado"
                                : bExpired
                                    ? "Vencido"
                                    : bDueSoon
                                        ? "Próximo a vencer"
                                        : "En gestión"
                        );

                    var sStatusKey =
                        oEvent.StatusCode ||
                        (
                            bClosed
                                ? "COMPLETADO"
                                : bExpired
                                    ? "VENCIDO"
                                    : bDueSoon
                                        ? "PROXIMO_VENCER"
                                        : "EN_GESTION"
                        );

                    var sPriorityCode =
                        oEvent.PriorityCode ||
                        (
                            oBlock &&
                            oBlock.PriorityCode
                        ) ||
                        "";

                    var sManagementCode =
                        (
                            oBlock &&
                            oBlock.ManagementStatusCode
                        ) ||
                        "";

                    return {
                        equipo:
                            (
                                oBlock &&
                                (
                                    oBlock.EquipmentId ||
                                    oBlock.EquipmentName
                                )
                            ) ||
                            "Sin datos",

                        cliente:
                            (
                                oBlock &&
                                (
                                    oBlock.CustomerName ||
                                    oBlock.CustomerId
                                )
                            ) ||
                            "Sin datos",

                        clienteKey:
                            (
                                oBlock &&
                                oBlock.CustomerId
                            ) ||
                            "",

                        zona:
                            (
                                oBlock &&
                                (
                                    oBlock.ZoneName ||
                                    oBlock.ZoneId
                                )
                            ) ||
                            "Sin datos",

                        zonaKey:
                            (
                                oBlock &&
                                oBlock.ZoneId
                            ) ||
                            "",

                        pendiente:
                            getPendingText(
                                oEvent,
                                mCatalog
                            ),

                        responsable:
                            (
                                oResponsible &&
                                oResponsible.ResourceName
                            ) ||
                            sResponsibleId ||
                            "Sin datos",

                        responsableKey:
                            sResponsibleId,

                        supervisor:
                            (
                                oSupervisor &&
                                (
                                    oSupervisor.ResourceName ||
                                    oSupervisor.SupervisorName
                                )
                            ) ||
                            (
                                oResponsible &&
                                oResponsible.SupervisorName
                            ) ||
                            sSupervisorId ||
                            "Sin datos",

                        supervisorKey:
                            sSupervisorId ||
                            (
                                oResponsible &&
                                oResponsible.SupervisorId
                            ) ||
                            "",

                        estadoPendiente:
                            sStatusText,

                        estadoPendienteKey:
                            sStatusKey,

                        estadoPendienteState:
                            getStatusState(
                                bClosed,
                                bExpired,
                                bDueSoon,
                                oEvent.StatusCode
                            ),

                        fechaRegistro:
                            formatDate(
                                oEvent.EventAt
                            ),

                        fechaRegistroISO:
                            toISO(
                                oEvent.EventAt
                            ),

                        fechaCompromiso:
                            formatDate(
                                oEvent.CommitmentDate
                            ),

                        fechaCompromisoISO:
                            toISO(
                                oEvent.CommitmentDate
                            ),

                        diasPendiente:
                            iPendingDays === null
                                ? "Sin datos"
                                : String(
                                    iPendingDays
                                ),

                        diasState:
                            bExpired
                                ? "Error"
                                : "None",

                        vencido:
                            bExpired
                                ? "Sí"
                                : "No",

                        vencidoState:
                            bExpired
                                ? "Error"
                                : "Success",

                        observacion:
                            oEvent.Comment ||
                            (
                                oBlock &&
                                oBlock.GeneralObservation
                            ) ||
                            "Sin datos",

                        prioridad:
                            getCatalogText(
                                mCatalog,
                                ["PRIORITY"],
                                sPriorityCode
                            ) ||
                            sPriorityCode ||
                            "Sin datos",

                        prioridadState:
                            getPriorityState(
                                sPriorityCode
                            ),

                        estadoGestion:
                            getCatalogText(
                                mCatalog,
                                [
                                    "MANAGEMENT_STATUS"
                                ],
                                sManagementCode
                            ) ||
                            sManagementCode ||
                            "Sin datos",

                        estadoGestionState:
                            normalize(
                                sManagementCode
                            ).indexOf(
                                "COMPLET"
                            ) >= 0
                                ? "Success"
                                : normalize(
                                    sManagementCode
                                ).indexOf(
                                    "VALID"
                                ) >= 0 ||
                                  normalize(
                                    sManagementCode
                                  ).indexOf(
                                    "AUTH"
                                  ) >= 0
                                    ? "Information"
                                    : "Warning",

                        blockId:
                            oEvent.BlockId ||
                            "",

                        blockEventId:
                            oEvent.BlockEventId ||
                            "",

                        isOpen:
                            bOpen,

                        isExpired:
                            bExpired,

                        isDueSoon:
                            bDueSoon
                    };
                });

        var oCatalogs =
            buildCatalogsFromAvailableData(
                aRows,
                oRaw.resources || [],
                oRaw.catalogs || []
            );

        var aFilteredRows =
            applyFilters(
                aRows,
                oFilters || {}
            );

        var aOpenRows =
            aFilteredRows.filter(
                function (oRow) {
                    return oRow.isOpen;
                }
            );

        return {
            rows:
                aFilteredRows,

            catalogs:
                oCatalogs,

            kpis: {
                pendientesAbiertos:
                    uniqueCount(
                        aOpenRows,
                        function (oRow) {
                            return oRow.blockEventId;
                        }
                    ),

                pendientesVencidos:
                    uniqueCount(
                        aOpenRows.filter(
                            function (oRow) {
                                return oRow.isExpired;
                            }
                        ),
                        function (oRow) {
                            return oRow.blockEventId;
                        }
                    ),

                proximosVencer:
                    uniqueCount(
                        aOpenRows.filter(
                            function (oRow) {
                                return oRow.isDueSoon;
                            }
                        ),
                        function (oRow) {
                            return oRow.blockEventId;
                        }
                    ),

                equiposPendiente:
                    uniqueCount(
                        aOpenRows.filter(
                            function (oRow) {
                                return (
                                    oRow.equipo &&
                                    oRow.equipo !==
                                        "Sin datos"
                                );
                            }
                        ),
                        function (oRow) {
                            return oRow.equipo;
                        }
                    )
            },

            meta: {
                dueSoonDays:
                    iDueSoonDays,

                blockEvents:
                    (
                        oRaw.blockEvents ||
                        []
                    ).length,

                blocks:
                    (
                        oRaw.blocks ||
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