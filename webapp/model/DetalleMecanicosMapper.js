sap.ui.define([], function () {
    "use strict";

    /*
     * Valores provisionales.
     * Cuando funcional confirme los umbrales,
     * únicamente se modifican aquí.
     */
    var NEAR_SATURATION_PCT = 90;
    var OVER_CAPACITY_PCT = 100;

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
            "ALL"
        ].indexOf(
            normalize(vValue)
        ) >= 0;
    }

    function isTrue(vValue) {
        var sValue =
            normalize(vValue);

        return (
            vValue === true ||
            sValue === "TRUE" ||
            sValue === "X" ||
            sValue === "1"
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

        if (vValue instanceof Date) {
            oDate =
                new Date(
                    vValue.getTime()
                );
        } else {
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
        }

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
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

        var oDay;

        if (!oDate) {
            return false;
        }

        oDay =
            new Date(
                oDate.getFullYear(),
                oDate.getMonth(),
                oDate.getDate()
            );

        if (
            oStart &&
            oDay <
            new Date(
                oStart.getFullYear(),
                oStart.getMonth(),
                oStart.getDate()
            )
        ) {
            return false;
        }

        if (
            oEnd &&
            oDay >
            new Date(
                oEnd.getFullYear(),
                oEnd.getMonth(),
                oEnd.getDate()
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
            parseFloat(vValue);

        var sNormalized =
            normalize(sUnit);

        if (
            Number.isNaN(nValue)
        ) {
            return null;
        }

        switch (sNormalized) {
        case "H":
        case "HR":
        case "HRS":
        case "HRA":
        case "HOUR":
        case "HOURS":
        case "STD":
            return nValue;

        case "MIN":
        case "MINS":
        case "MINUTE":
        case "MINUTES":
            return nValue / 60;

        case "S":
        case "SEC":
        case "SECOND":
        case "SECONDS":
            return nValue / 3600;

        default:
            return null;
        }
    }

    function uniqueBy(
        aItems,
        fnKey
    ) {
        var mSeen =
            Object.create(null);

        return (aItems || [])
            .filter(function (oItem) {
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
            });
    }

    function matchesFilter(
        vFilter,
        aValues
    ) {
        var sFilter;

        if (isAll(vFilter)) {
            return true;
        }

        sFilter =
            normalize(vFilter);

        return (aValues || [])
            .some(function (vValue) {
                return (
                    normalize(vValue) ===
                    sFilter
                );
            });
    }

    function formatNumber(
        nValue,
        iDecimals
    ) {
        if (
            !Number.isFinite(nValue)
        ) {
            return "Sin datos";
        }

        return Number(nValue)
            .toLocaleString(
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
        return Number.isFinite(
            nValue
        )
            ? formatNumber(
                nValue,
                0
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

    /*
     * DashboardFilterCatalogSet actualmente ya
     * publica MECHANIC aunque ResourceTypeCode
     * pueda llegar vacío.
     */
    function getMechanicCatalogMap(
        aCatalogs
    ) {
        var mMap =
            Object.create(null);

        (aCatalogs || [])
            .forEach(function (oItem) {
                if (
                    normalize(
                        oItem.FilterDomain
                    ) === "MECHANIC" &&
                    (
                        oItem.Active ===
                            undefined ||
                        oItem.Active ===
                            null ||
                        isTrue(
                            oItem.Active
                        )
                    )
                ) {
                    mMap[
                        String(
                            oItem.ValueId ||
                            ""
                        )
                    ] = true;
                }
            });

        return mMap;
    }

    function isMechanic(
        oResource,
        mMechanicCatalog
    ) {
        var sType =
            normalize(
                oResource.ResourceTypeCode
            );

        var sResourceId =
            String(
                oResource.ResourceId ||
                ""
            );

        return (
            sType === "MECHANIC" ||
            (
                !sType &&
                Boolean(
                    mMechanicCatalog[
                        sResourceId
                    ]
                )
            )
        );
    }

    function getOrderMap(
        aOrders
    ) {
        var mOrders =
            Object.create(null);

        (aOrders || [])
            .forEach(function (oOrder) {
                var sId =
                    String(
                        oOrder.OrderId ||
                        ""
                    );

                if (
                    sId &&
                    !mOrders[sId]
                ) {
                    mOrders[sId] =
                        oOrder;
                }
            });

        return mOrders;
    }

    function getServiceText(
        oOrder
    ) {
        return (
            oOrder &&
            (
                oOrder.OrderTypeText ||
                oOrder.OrderTypeCode
            )
        ) ||
        "Sin datos";
    }

    /*
     * AFVV y KBED no deben sumarse.
     */
    function selectPlanRows(
        aOperations
    ) {
        var mByOperation =
            Object.create(null);

        var aResult = [];

        (aOperations || [])
            .forEach(function (oRow) {
                var sKey = [
                    oRow.OrderId ||
                        "",
                    oRow.RoutingNumber ||
                        "",
                    oRow.OperationCounter ||
                        "",
                    oRow.OperationNumber ||
                        ""
                ].join("|");

                if (
                    !mByOperation[
                        sKey
                    ]
                ) {
                    mByOperation[
                        sKey
                    ] = [];
                }

                mByOperation[
                    sKey
                ].push(
                    oRow
                );
            });

        Object.keys(
            mByOperation
        ).forEach(function (sKey) {
            var aRows =
                mByOperation[
                    sKey
                ];

            var aSources =
                Array.from(
                    new Set(
                        aRows.map(
                            function (oRow) {
                                return normalize(
                                    oRow.PlannedSourceCode
                                );
                            }
                        ).filter(Boolean)
                    )
                );

            /*
             * Si existe una sola fuente, se usa.
             * Si ABAP entrega alternativas simultáneas,
             * preferimos AFVV temporalmente.
             */
            if (
                aSources.length <= 1
            ) {
                aResult =
                    aResult.concat(
                        aRows
                    );

                return;
            }

            var aAFVV =
                aRows.filter(
                    function (oRow) {
                        return (
                            normalize(
                                oRow.PlannedSourceCode
                            ) === "AFVV"
                        );
                    }
                );

            if (aAFVV.length) {
                aResult =
                    aResult.concat(
                        aAFVV
                    );
            }
        });

        return aResult;
    }

    function getAssignmentsByOrder(
        aAssignments
    ) {
        var mMap =
            Object.create(null);

        (aAssignments || [])
            .forEach(function (
                oAssignment
            ) {
                var sOrder =
                    String(
                        oAssignment.OrderId ||
                        ""
                    );

                if (!sOrder) {
                    return;
                }

                if (!mMap[sOrder]) {
                    mMap[sOrder] =
                        [];
                }

                mMap[sOrder].push(
                    oAssignment
                );
            });

        return mMap;
    }

    function getToneByUtilization(
        nPct
    ) {
        if (
            !Number.isFinite(
                nPct
            )
        ) {
            return "gray";
        }

        if (
            nPct >
            OVER_CAPACITY_PCT
        ) {
            return "red";
        }

        if (
            nPct >=
            NEAR_SATURATION_PCT
        ) {
            return "orange";
        }

        return "green";
    }

    function getResourceState(
        oResource
    ) {
        var nUtilization;

        if (
            oResource.inactive
        ) {
            return "INACTIVOS";
        }

        if (
            oResource.available
        ) {
            return "DISPONIBLES";
        }

        if (
            !Number.isFinite(
                oResource.capacity
            ) ||
            oResource.capacity <= 0
        ) {
            return "SIN_DATOS";
        }

        nUtilization =
            (
                oResource.load /
                oResource.capacity
            ) * 100;

        if (
            nUtilization >
            OVER_CAPACITY_PCT
        ) {
            return "SOBRE_CAPACIDAD";
        }

        if (
            nUtilization >=
            NEAR_SATURATION_PCT
        ) {
            return "CERCA_SATURACION";
        }

        return "DENTRO_CAPACIDAD";
    }

    function getStateLabel(
        sState
    ) {
        switch (sState) {
        case "DISPONIBLES":
            return "Disponibles";

        case "DENTRO_CAPACIDAD":
            return "Dentro de capacidad";

        case "CERCA_SATURACION":
            return "Cerca de saturación";

        case "SOBRE_CAPACIDAD":
            return "Sobre capacidad";

        case "INACTIVOS":
            return "Inactivos";

        default:
            return "Sin datos";
        }
    }

    function getStateTone(
        sState
    ) {
        switch (sState) {
        case "DISPONIBLES":
            return "green";

        case "DENTRO_CAPACIDAD":
            return "blue";

        case "CERCA_SATURACION":
            return "orange";

        case "SOBRE_CAPACIDAD":
            return "red";

        case "INACTIVOS":
            return "gray";

        default:
            return "gray";
        }
    }

    function getCatalogValues(
        aCatalogs,
        aDomains
    ) {
        var aDomainsNormalized =
            aDomains.map(
                normalize
            );

        return (aCatalogs || [])
            .filter(function (oItem) {
                return (
                    (
                        oItem.Active ===
                            undefined ||
                        oItem.Active ===
                            null ||
                        isTrue(
                            oItem.Active
                        )
                    ) &&
                    aDomainsNormalized
                        .indexOf(
                            normalize(
                                oItem.FilterDomain
                            )
                        ) >= 0
                );
            })
            .map(function (oItem) {
                return {
                    key:
                        String(
                            oItem.ValueId ||
                            oItem.ValueText ||
                            ""
                        ),

                    text:
                        String(
                            oItem.ValueText ||
                            oItem.ValueId ||
                            ""
                        )
                };
            });
    }

    function createCatalog(
        aValues,
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

        (aValues || [])
            .forEach(function (oItem) {
                var sKey =
                    String(
                        oItem.key ||
                        ""
                    );

                var sNormalized =
                    normalize(sKey);

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
                ] = true;

                aResult.push({
                    key:
                        sKey,

                    text:
                        String(
                            oItem.text ||
                            sKey
                        )
                });
            });

        return aResult;
    }

    function buildYearCatalog(
        mFilters
    ) {
        var iCurrentYear =
            new Date()
                .getFullYear();

        var iSelectedYear =
            Number(
                mFilters.periodo
            ) ||
            (
                parseInputDate(
                    mFilters.fechaDesde
                ) ||
                new Date()
            ).getFullYear();

        var iStart =
            Math.min(
                iCurrentYear - 5,
                iSelectedYear - 2
            );

        var iEnd =
            Math.max(
                iCurrentYear + 1,
                iSelectedYear + 2
            );

        var aYears = [];
        var iYear;

        for (
            iYear = iEnd;
            iYear >= iStart;
            iYear--
        ) {
            aYears.push({
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

        return aYears;
    }

    function buildCatalogs(
        oRaw,
        oFilters,
        aResources,
        aOrders
    ) {
        var aZones =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "ZONE",
                    "ZONA"
                ]
            );

        var aSupervisors =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "SUPERVISOR"
                ]
            );

        var aTurnos =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "SHIFT",
                    "TURNO"
                ]
            );

        var aSpecialties =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "SPECIALTY",
                    "ESPECIALIDAD"
                ]
            );

        var aServices =
            getCatalogValues(
                oRaw.catalogs,
                [
                    "ORDER_TYPE",
                    "SERVICE_TYPE",
                    "TIPO_SERVICIO",
                    "TIPO_ORDEN"
                ]
            );

        if (!aZones.length) {
            aZones =
                aResources.map(
                    function (oResource) {
                        return {
                            key:
                                oResource.ZoneId ||
                                oResource.ZoneName,

                            text:
                                oResource.ZoneName ||
                                oResource.ZoneId
                        };
                    }
                );
        }

        if (!aSupervisors.length) {
            aSupervisors =
                aResources.map(
                    function (oResource) {
                        return {
                            key:
                                oResource.SupervisorId ||
                                oResource.SupervisorName,

                            text:
                                oResource.SupervisorName ||
                                oResource.SupervisorId
                        };
                    }
                );
        }

        if (!aTurnos.length) {
            aTurnos =
                aResources
                    .filter(
                        function (oResource) {
                            return isTrue(
                                oResource.ShiftSourceValidated
                            );
                        }
                    )
                    .map(
                        function (oResource) {
                            return {
                                key:
                                    oResource.ShiftId ||
                                    oResource.ShiftName,

                                text:
                                    oResource.ShiftName ||
                                    oResource.ShiftId
                            };
                        }
                    );
        }

        if (!aSpecialties.length) {
            aSpecialties =
                aResources.map(
                    function (oResource) {
                        return {
                            key:
                                oResource.SpecialtyCode,

                            text:
                                oResource.SpecialtyCode
                        };
                    }
                );
        }

        if (!aServices.length) {
            aServices =
                aOrders.map(
                    function (oOrder) {
                        return {
                            key:
                                oOrder.OrderTypeCode ||
                                oOrder.OrderTypeText,

                            text:
                                oOrder.OrderTypeText ||
                                oOrder.OrderTypeCode
                        };
                    }
                );
        }

        return {
            periodos:
                buildYearCatalog(
                    oFilters
                ),

            zonas:
                createCatalog(
                    aZones,
                    "TODAS",
                    "Todas"
                ),

            supervisores:
                createCatalog(
                    aSupervisors,
                    "TODOS",
                    "Todos"
                ),

            turnos:
                createCatalog(
                    aTurnos,
                    "TODOS",
                    "Todos"
                ),

            tiposServicio:
                createCatalog(
                    aServices,
                    "TODAS",
                    "Todas"
                ),

            especialidades:
                createCatalog(
                    aSpecialties,
                    "TODAS",
                    "Todas"
                ),

            estados: [
                {
                    key: "TODOS",
                    text: "Todos"
                },
                {
                    key: "DISPONIBLES",
                    text: "Disponibles"
                },
                {
                    key: "DENTRO_CAPACIDAD",
                    text: "Dentro de capacidad"
                },
                {
                    key: "CERCA_SATURACION",
                    text: "Cerca de saturación"
                },
                {
                    key: "SOBRE_CAPACIDAD",
                    text: "Sobre capacidad"
                },
                {
                    key: "INACTIVOS",
                    text: "Inactivos"
                }
            ]
        };
    }

    function ensureThree(
        aRows,
        aDefaults
    ) {
        var aResult =
            (aRows || [])
                .slice(
                    0,
                    3
                );

        while (
            aResult.length < 3
        ) {
            aResult.push(
                aDefaults[
                    aResult.length
                ]
            );
        }

        return aResult;
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
                        String(
                            new Date()
                                .getFullYear()
                        ),

                    fechaDesde:
                        "",

                    fechaHasta:
                        "",

                    zona:
                        "TODAS",

                    supervisor:
                        "TODOS",

                    turno:
                        "TODOS",

                    tipoServicio:
                        "TODAS",

                    especialidad:
                        "TODAS",

                    estado:
                        "TODOS"
                },
                mFilters || {}
            );

        var oStart =
            parseInputDate(
                oFilters.fechaDesde
            );

        var oEnd =
            parseInputDate(
                oFilters.fechaHasta
            );

        var mMechanicCatalog =
            getMechanicCatalogMap(
                oRaw.catalogs ||
                []
            );

        /*
         * 1. Población de mecánicos en periodo.
         */
        var aResourcesPeriod =
            (oRaw.resources || [])
                .filter(
                    function (oResource) {
                        return (
                            isDateInRange(
                                oResource.WorkDate,
                                oStart,
                                oEnd
                            ) &&
                            isMechanic(
                                oResource,
                                mMechanicCatalog
                            )
                        );
                    }
                );

        /*
         * 2. Filtros organizativos.
         */
        var aResourcesFiltered =
            aResourcesPeriod
                .filter(
                    function (oResource) {
                        return (
                            matchesFilter(
                                oFilters.zona,
                                [
                                    oResource.ZoneId,
                                    oResource.ZoneName
                                ]
                            ) &&
                            matchesFilter(
                                oFilters.supervisor,
                                [
                                    oResource.SupervisorId,
                                    oResource.SupervisorName
                                ]
                            ) &&
                            matchesFilter(
                                oFilters.turno,
                                [
                                    oResource.ShiftId,
                                    oResource.ShiftName
                                ]
                            ) &&
                            matchesFilter(
                                oFilters.especialidad,
                                [
                                    oResource.SpecialtyCode
                                ]
                            )
                        );
                    }
                );

        var aOrders =
            uniqueBy(
                oRaw.orders ||
                [],
                function (oOrder) {
                    return oOrder.OrderId;
                }
            );

        var mOrders =
            getOrderMap(
                aOrders
            );

        var aOperations =
            selectPlanRows(
                oRaw.operations ||
                []
            );

        var mAssignments =
            getAssignmentsByOrder(
                oRaw.orderResources ||
                []
            );

        var mSelectedResourceIds =
            Object.create(null);

        aResourcesFiltered
            .forEach(function (oResource) {
                var sId =
                    String(
                        oResource.ResourceId ||
                        ""
                    );

                if (sId) {
                    mSelectedResourceIds[
                        sId
                    ] = true;
                }
            });

        /*
         * 3. Consolidación por ResourceId.
         */
        var mResources =
            Object.create(null);

        aResourcesFiltered
            .forEach(function (oRow) {
                var sId =
                    String(
                        oRow.ResourceId ||
                        ""
                    );

                if (!sId) {
                    return;
                }

                if (!mResources[sId]) {
                    mResources[sId] = {
                        id:
                            sId,

                        name:
                            oRow.ResourceName ||
                            sId,

                        zone:
                            oRow.ZoneName ||
                            oRow.ZoneId ||
                            "Sin datos",

                        zoneId:
                            oRow.ZoneId ||
                            "",

                        capacity:
                            null,

                        load:
                            0,

                        available:
                            false,

                        inactive:
                            false,

                        shifts:
                            Object.create(
                                null
                            )
                    };
                }

                if (
                    normalize(
                        oRow.AvailabilityStatusCode
                    ) === "AVAILABLE"
                ) {
                    mResources[
                        sId
                    ].available =
                        true;
                }

                if (
                    normalize(
                        oRow.AvailabilityStatusCode
                    ) === "INACTIVE"
                ) {
                    mResources[
                        sId
                    ].inactive =
                        true;
                }

                if (
                    isTrue(
                        oRow.CapacitySourceValidated
                    )
                ) {
                    if (
                        !Number.isFinite(
                            mResources[
                                sId
                            ].capacity
                        )
                    ) {
                        mResources[
                            sId
                        ].capacity =
                            0;
                    }

                    mResources[
                        sId
                    ].capacity +=
                        parseFloat(
                            oRow.CapacityHours
                        ) || 0;
                }

                if (
                    isTrue(
                        oRow.ShiftSourceValidated
                    ) &&
                    (
                        oRow.ShiftName ||
                        oRow.ShiftId
                    )
                ) {
                    mResources[
                        sId
                    ].shifts[
                        oRow.ShiftName ||
                        oRow.ShiftId
                    ] = true;
                }
            });

        /*
         * 4. Plan por recurso.
         */
        var nTotalPlan =
            0;

        var nAssignedPlan =
            0;

        var mPlanByService =
            Object.create(null);

        aOperations
            .forEach(function (oOperation) {
                var nHours =
                    toHours(
                        oOperation.PlannedValueOriginal,
                        oOperation.PlannedUnitOriginal
                    );

                var sOrder =
                    String(
                        oOperation.OrderId ||
                        ""
                    );

                var oOrder =
                    mOrders[sOrder];

                var sService =
                    getServiceText(
                        oOrder
                    );

                var aAssignments =
                    mAssignments[
                        sOrder
                    ] || [];

                var aValid;
                var nShare;

                if (
                    !Number.isFinite(
                        nHours
                    )
                ) {
                    return;
                }

                if (
                    !matchesFilter(
                        oFilters.tipoServicio,
                        [
                            oOrder &&
                            oOrder.OrderTypeCode,

                            oOrder &&
                            oOrder.OrderTypeText
                        ]
                    )
                ) {
                    return;
                }

                nTotalPlan +=
                    nHours;

                if (
                    !mPlanByService[
                        sService
                    ]
                ) {
                    mPlanByService[
                        sService
                    ] = 0;
                }

                mPlanByService[
                    sService
                ] += nHours;

                aValid =
                    aAssignments
                        .filter(
                            function (oAssignment) {
                                return Boolean(
                                    mSelectedResourceIds[
                                        String(
                                            oAssignment.ResourceId ||
                                            ""
                                        )
                                    ]
                                );
                            }
                        );

                if (!aValid.length) {
                    return;
                }

                nAssignedPlan +=
                    nHours;

                /*
                 * Si la misma operación tiene varios
                 * mecánicos, divide horas para evitar duplicar.
                 */
                nShare =
                    nHours /
                    aValid.length;

                aValid
                    .forEach(
                        function (oAssignment) {
                            var sResourceId =
                                String(
                                    oAssignment.ResourceId ||
                                    ""
                                );

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
            });

        var aResourceSummaries =
            Object.keys(
                mResources
            ).map(function (sId) {
                var oResource =
                    mResources[
                        sId
                    ];

                oResource.state =
                    getResourceState(
                        oResource
                    );

                return oResource;
            });

        if (!isAll(oFilters.estado)) {
            aResourceSummaries =
                aResourceSummaries
                    .filter(
                        function (oResource) {
                            return (
                                normalize(
                                    oResource.state
                                ) ===
                                normalize(
                                    oFilters.estado
                                )
                            );
                        }
                    );
        }

        var iActive =
            aResourceSummaries.length;

        var bAvailabilityData =
            aResourcesFiltered.some(
                function (oResource) {
                    return Boolean(
                        oResource.AvailabilityStatusCode
                    );
                }
            );

        var iAvailable =
            bAvailabilityData
                ? aResourceSummaries
                    .filter(
                        function (oResource) {
                            return (
                                oResource.available
                            );
                        }
                    ).length
                : null;

        var bCapacityData =
            aResourcesFiltered.some(
                function (oResource) {
                    return isTrue(
                        oResource.CapacitySourceValidated
                    );
                }
            );

        var bPlanData =
            (oRaw.operations || [])
                .length > 0;

        var bAssignmentData =
            (oRaw.orderResources || [])
                .length > 0;

        var bActualData =
            (oRaw.confirmations || [])
                .length > 0;

        var iOverCapacity =
            bCapacityData &&
            bPlanData &&
            bAssignmentData
                ? aResourceSummaries
                    .filter(
                        function (oResource) {
                            return (
                                oResource.state ===
                                "SOBRE_CAPACIDAD"
                            );
                        }
                    ).length
                : null;

        var nCoverageDemand =
            bPlanData &&
            bAssignmentData &&
            nTotalPlan > 0
                ? (
                    nAssignedPlan /
                    nTotalPlan
                ) * 100
                : null;

        var oKpis = {
            activos:
                iActive > 0
                    ? String(
                        iActive
                    )
                    : "Sin datos",

            disponibles:
                Number.isFinite(
                    iAvailable
                )
                    ? String(
                        iAvailable
                    )
                    : "Sin datos",

            disponiblesPct:
                Number.isFinite(
                    iAvailable
                ) &&
                iActive > 0
                    ? formatPct(
                        (
                            iAvailable /
                            iActive
                        ) * 100
                    ) +
                    " de la plantilla"
                    : "Sin datos",

            sobrecapacidad:
                Number.isFinite(
                    iOverCapacity
                )
                    ? String(
                        iOverCapacity
                    )
                    : "Sin datos",

            sobrecapacidadPct:
                Number.isFinite(
                    iOverCapacity
                ) &&
                iActive > 0
                    ? formatPct(
                        (
                            iOverCapacity /
                            iActive
                        ) * 100
                    ) +
                    " de la plantilla"
                    : "Sin datos",

            cobertura:
                formatPct(
                    nCoverageDemand
                )
        };

        /*
         * 5. Distribución por turno.
         */
        var mShiftResources =
            Object.create(null);

        aResourcesFiltered
            .filter(function (oResource) {
                return isTrue(
                    oResource.ShiftSourceValidated
                );
            })
            .forEach(function (oResource) {
                var sShift =
                    oResource.ShiftName ||
                    oResource.ShiftId;

                if (!sShift) {
                    return;
                }

                if (
                    !mShiftResources[
                        sShift
                    ]
                ) {
                    mShiftResources[
                        sShift
                    ] =
                        Object.create(
                            null
                        );
                }

                mShiftResources[
                    sShift
                ][
                    oResource.ResourceId
                ] = true;
            });

        var aTurnos =
            Object.keys(
                mShiftResources
            ).map(
                function (
                    sShift,
                    iIndex
                ) {
                    var iCount =
                        Object.keys(
                            mShiftResources[
                                sShift
                            ]
                        ).length;

                    var nPct =
                        iActive > 0
                            ? (
                                iCount /
                                iActive
                            ) * 100
                            : null;

                    return {
                        label:
                            sShift,

                        value:
                            String(
                                iCount
                            ),

                        pct:
                            Number.isFinite(
                                nPct
                            )
                                ? Math.min(
                                    100,
                                    nPct
                                )
                                : 0,

                        pctText:
                            formatPct(
                                nPct
                            ),

                        tone:
                            [
                                "blue",
                                "green",
                                "purple"
                            ][
                                iIndex %
                                3
                            ]
                    };
                }
            );

        aTurnos = ensureThree(
            aTurnos,
            [
                {
                    label: "Diurno",
                    value: "Sin datos",
                    pct: 0,
                    pctText: "Sin datos",
                    tone: "blue"
                },
                {
                    label: "Nocturno",
                    value: "Sin datos",
                    pct: 0,
                    pctText: "Sin datos",
                    tone: "green"
                },
                {
                    label: "Fin de semana",
                    value: "Sin datos",
                    pct: 0,
                    pctText: "Sin datos",
                    tone: "purple"
                }
            ]
        );

        /*
         * 6. Métricas por turno.
         */
        var mShiftMetrics =
            Object.create(null);

        aResourcesFiltered
            .filter(function (oResource) {
                return isTrue(
                    oResource.ShiftSourceValidated
                );
            })
            .forEach(function (oResource) {
                var sShift =
                    oResource.ShiftName ||
                    oResource.ShiftId;

                if (!sShift) {
                    return;
                }

                if (
                    !mShiftMetrics[
                        sShift
                    ]
                ) {
                    mShiftMetrics[
                        sShift
                    ] = {
                        capacity:
                            0,

                        validCapacity:
                            false,

                        load:
                            0
                    };
                }

                if (
                    isTrue(
                        oResource.CapacitySourceValidated
                    )
                ) {
                    mShiftMetrics[
                        sShift
                    ].validCapacity =
                        true;

                    mShiftMetrics[
                        sShift
                    ].capacity +=
                        parseFloat(
                            oResource.CapacityHours
                        ) || 0;
                }
            });

        aResourceSummaries
            .forEach(function (oResource) {
                var aShifts =
                    Object.keys(
                        oResource.shifts ||
                        {}
                    );

                /*
                 * Sólo asigna automáticamente la carga
                 * al turno si hay un único turno validado.
                 */
                if (
                    aShifts.length === 1 &&
                    mShiftMetrics[
                        aShifts[0]
                    ]
                ) {
                    mShiftMetrics[
                        aShifts[0]
                    ].load +=
                        oResource.load;
                }
            });

        var aUtilTurno =
            Object.keys(
                mShiftMetrics
            ).map(function (sShift) {
                var oMetric =
                    mShiftMetrics[
                        sShift
                    ];

                var nUtil =
                    oMetric.validCapacity &&
                    bPlanData &&
                    bAssignmentData &&
                    oMetric.capacity > 0
                        ? (
                            oMetric.load /
                            oMetric.capacity
                        ) * 100
                        : null;

                return {
                    turno:
                        sShift,

                    capacidad:
                        oMetric.validCapacity
                            ? formatHours(
                                oMetric.capacity
                            )
                            : "Sin datos",

                    carga:
                        bPlanData &&
                        bAssignmentData
                            ? formatHours(
                                oMetric.load
                            )
                            : "Sin datos",

                    utilizacion:
                        formatPct(
                            nUtil
                        ),

                    percentValue:
                        Number.isFinite(
                            nUtil
                        )
                            ? Math.min(
                                100,
                                nUtil
                            )
                            : 0,

                    tone:
                        getToneByUtilization(
                            nUtil
                        )
                };
            });

        aUtilTurno = ensureThree(
            aUtilTurno,
            [
                {
                    turno: "Diurno",
                    capacidad: "Sin datos",
                    carga: "Sin datos",
                    utilizacion: "Sin datos",
                    percentValue: 0,
                    tone: "green"
                },
                {
                    turno: "Nocturno",
                    capacidad: "Sin datos",
                    carga: "Sin datos",
                    utilizacion: "Sin datos",
                    percentValue: 0,
                    tone: "orange"
                },
                {
                    turno: "Fin de semana",
                    capacidad: "Sin datos",
                    carga: "Sin datos",
                    utilizacion: "Sin datos",
                    percentValue: 0,
                    tone: "red"
                }
            ]
        );

        var nTotalCapacity =
            aResourceSummaries
                .reduce(
                    function (
                        nTotal,
                        oResource
                    ) {
                        return (
                            nTotal +
                            (
                                Number.isFinite(
                                    oResource.capacity
                                )
                                    ? oResource.capacity
                                    : 0
                            )
                        );
                    },
                    0
                );

        var nTotalLoad =
            aResourceSummaries
                .reduce(
                    function (
                        nTotal,
                        oResource
                    ) {
                        return (
                            nTotal +
                            oResource.load
                        );
                    },
                    0
                );

        var nTotalUtil =
            bCapacityData &&
            bPlanData &&
            bAssignmentData &&
            nTotalCapacity > 0
                ? (
                    nTotalLoad /
                    nTotalCapacity
                ) * 100
                : null;

        var oUtilTotal = {
            capacidad:
                bCapacityData
                    ? formatHours(
                        nTotalCapacity
                    )
                    : "Sin datos",

            carga:
                bPlanData &&
                bAssignmentData
                    ? formatHours(
                        nTotalLoad
                    )
                    : "Sin datos",

            utilizacion:
                formatPct(
                    nTotalUtil
                ),

            percentValue:
                Number.isFinite(
                    nTotalUtil
                )
                    ? Math.min(
                        100,
                        nTotalUtil
                    )
                    : 0,

            tone:
                getToneByUtilization(
                    nTotalUtil
                )
        };

        /*
         * 7. Cobertura y presión por zona.
         */
        var mZones =
            Object.create(null);

        aResourceSummaries
            .forEach(function (oResource) {
                var sZone =
                    oResource.zone ||
                    "Sin datos";

                if (!mZones[sZone]) {
                    mZones[sZone] = {
                        resources:
                            Object.create(
                                null
                            ),

                        capacity:
                            0,

                        validCapacity:
                            false,

                        load:
                            0,

                        orders:
                            Object.create(
                                null
                            )
                    };
                }

                mZones[
                    sZone
                ].resources[
                    oResource.id
                ] = true;

                if (
                    Number.isFinite(
                        oResource.capacity
                    )
                ) {
                    mZones[
                        sZone
                    ].validCapacity =
                        true;

                    mZones[
                        sZone
                    ].capacity +=
                        oResource.capacity;
                }

                mZones[
                    sZone
                ].load +=
                    oResource.load;
            });

        (oRaw.orderResources || [])
            .forEach(function (oAssignment) {
                var sResourceId =
                    String(
                        oAssignment.ResourceId ||
                        ""
                    );

                var oResource =
                    mResources[
                        sResourceId
                    ];

                if (
                    !oResource ||
                    !oAssignment.OrderId
                ) {
                    return;
                }

                if (
                    mZones[
                        oResource.zone
                    ]
                ) {
                    mZones[
                        oResource.zone
                    ].orders[
                        oAssignment.OrderId
                    ] = true;
                }
            });

        var aZonas =
            Object.keys(
                mZones
            ).map(function (sZone) {
                var oMetric =
                    mZones[
                        sZone
                    ];

                var nCoverage =
                    oMetric.validCapacity &&
                    bPlanData &&
                    bAssignmentData &&
                    oMetric.load > 0
                        ? (
                            oMetric.capacity /
                            oMetric.load
                        ) * 100
                        : null;

                var sState =
                    "Sin datos";

                var sTone =
                    "gray";

                if (
                    Number.isFinite(
                        nCoverage
                    )
                ) {
                    if (
                        nCoverage < 100
                    ) {
                        sState =
                            "Falta capacidad";

                        sTone =
                            "red";
                    } else if (
                        nCoverage <= 120
                    ) {
                        sState =
                            "Balance adecuado";

                        sTone =
                            "orange";
                    } else {
                        sState =
                            "Capacidad disponible";

                        sTone =
                            "green";
                    }
                }

                return {
                    zona:
                        sZone,

                    mecanicos:
                        String(
                            Object.keys(
                                oMetric.resources
                            ).length
                        ),

                    horasDisponibles:
                        oMetric.validCapacity
                            ? formatHours(
                                oMetric.capacity
                            )
                            : "Sin datos",

                    carga:
                        bPlanData &&
                        bAssignmentData
                            ? formatHours(
                                oMetric.load
                            )
                            : "Sin datos",

                    cobertura:
                        formatPct(
                            nCoverage
                        ),

                    percentValue:
                        Number.isFinite(
                            nCoverage
                        )
                            ? Math.min(
                                100,
                                nCoverage
                            )
                            : 0,

                    estado:
                        sState,

                    tone:
                        sTone
                };
            });

        /*
         * 8. Estado de plantilla.
         */
        var aStateCodes = [
            "DISPONIBLES",
            "DENTRO_CAPACIDAD",
            "CERCA_SATURACION",
            "SOBRE_CAPACIDAD",
            "INACTIVOS"
        ];

        var aEstadoPlantilla =
            aStateCodes
                .map(function (sState) {
                    var iCount =
                        aResourceSummaries
                            .filter(
                                function (oResource) {
                                    return (
                                        oResource.state ===
                                        sState
                                    );
                                }
                            ).length;

                    var nPct =
                        iActive > 0
                            ? (
                                iCount /
                                iActive
                            ) * 100
                            : null;

                    return {
                        label:
                            getStateLabel(
                                sState
                            ),

                        value:
                            String(
                                iCount
                            ),

                        pct:
                            formatPct(
                                nPct
                            ),

                        tone:
                            getStateTone(
                                sState
                            )
                    };
                });

        /*
         * 9. Horas reales por tipo de servicio.
         */
        var mActualByService =
            Object.create(null);

        (oRaw.confirmations || [])
            .filter(
                function (oConfirmation) {
                    return isTrue(
                        oConfirmation.IncludedInCalculation
                    );
                }
            )
            .forEach(function (oConfirmation) {
                var nHours =
                    toHours(
                        oConfirmation.ActualValueOriginal,
                        oConfirmation.ActualUnitOriginal
                    );

                var oOrder =
                    mOrders[
                        String(
                            oConfirmation.OrderId ||
                            ""
                        )
                    ];

                var sService =
                    getServiceText(
                        oOrder
                    );

                if (
                    !Number.isFinite(
                        nHours
                    )
                ) {
                    return;
                }

                if (
                    !mActualByService[
                        sService
                    ]
                ) {
                    mActualByService[
                        sService
                    ] = 0;
                }

                mActualByService[
                    sService
                ] +=
                    nHours;
            });

        var aServiceNames =
            Array.from(
                new Set(
                    Object.keys(
                        mPlanByService
                    ).concat(
                        Object.keys(
                            mActualByService
                        )
                    )
                )
            );

        var nMaxService =
            Math.max(
                1,
                ...aServiceNames.map(
                    function (sService) {
                        return Math.max(
                            mPlanByService[
                                sService
                            ] || 0,

                            mActualByService[
                                sService
                            ] || 0
                        );
                    }
                )
            );

        var aServicios =
            aServiceNames
                .map(function (sService) {
                    var nPlan =
                        mPlanByService[
                            sService
                        ] || 0;

                    var nReal =
                        mActualByService[
                            sService
                        ] || 0;

                    return {
                        label:
                            sService,

                        programadas:
                            bPlanData
                                ? formatNumber(
                                    nPlan,
                                    0
                                )
                                : "Sin datos",

                        reales:
                            bActualData
                                ? formatNumber(
                                    nReal,
                                    0
                                )
                                : "Sin datos",

                        programadasLevel:
                            bPlanData
                                ? String(
                                    Math.max(
                                        8,
                                        Math.round(
                                            (
                                                nPlan /
                                                nMaxService
                                            ) * 100
                                        )
                                    )
                                )
                                : "8",

                        realesLevel:
                            bActualData
                                ? String(
                                    Math.max(
                                        8,
                                        Math.round(
                                            (
                                                nReal /
                                                nMaxService
                                            ) * 100
                                        )
                                    )
                                )
                                : "8"
                    };
                });

        aServicios =
            ensureThree(
                aServicios,
                [
                    {
                        label: "Sin datos",
                        programadas: "Sin datos",
                        reales: "Sin datos",
                        programadasLevel: "8",
                        realesLevel: "8"
                    },
                    {
                        label: "Sin datos",
                        programadas: "Sin datos",
                        reales: "Sin datos",
                        programadasLevel: "8",
                        realesLevel: "8"
                    },
                    {
                        label: "Sin datos",
                        programadas: "Sin datos",
                        reales: "Sin datos",
                        programadasLevel: "8",
                        realesLevel: "8"
                    }
                ]
            );

        /*
         * 10. Presión operativa.
         */
        var aPresion =
            Object.keys(
                mZones
            ).map(function (sZone) {
                var oMetric =
                    mZones[
                        sZone
                    ];

                var iMechanics =
                    Object.keys(
                        oMetric.resources
                    ).length;

                var iOrders =
                    Object.keys(
                        oMetric.orders
                    ).length;

                var nUtilization =
                    oMetric.validCapacity &&
                    bPlanData &&
                    bAssignmentData &&
                    oMetric.capacity > 0
                        ? (
                            oMetric.load /
                            oMetric.capacity
                        ) * 100
                        : null;

                var nOrdersPerMechanic =
                    iMechanics > 0 &&
                    bAssignmentData
                        ? (
                            iOrders /
                            iMechanics
                        )
                        : null;

                var sState =
                    "Sin datos";

                var sTone =
                    "gray";

                if (
                    Number.isFinite(
                        nUtilization
                    )
                ) {
                    if (
                        nUtilization > 110
                    ) {
                        sState =
                            "Crítico";

                        sTone =
                            "red";
                    } else if (
                        nUtilization > 100
                    ) {
                        sState =
                            "Sobrecargado";

                        sTone =
                            "red";
                    } else if (
                        nUtilization >=
                        NEAR_SATURATION_PCT
                    ) {
                        sState =
                            "Cerca de saturación";

                        sTone =
                            "orange";
                    } else if (
                        nUtilization >= 60
                    ) {
                        sState =
                            "Balanceado";

                        sTone =
                            "green";
                    } else {
                        sState =
                            "Capacidad disponible";

                        sTone =
                            "green";
                    }
                }

                return {
                    zona:
                        sZone,

                    utilizacion:
                        formatPct(
                            nUtilization
                        ),

                    percentValue:
                        Number.isFinite(
                            nUtilization
                        )
                            ? Math.min(
                                100,
                                nUtilization
                            )
                            : 0,

                    ordenes:
                        Number.isFinite(
                            nOrdersPerMechanic
                        )
                            ? formatNumber(
                                nOrdersPerMechanic,
                                1
                            )
                            : "Sin datos",

                    estado:
                        sState,

                    tone:
                        sTone
                };
            });

        console.log(
            "[DM MAPPER] Resultado:",
            {
                filtros:
                    oFilters,

                recursosPeriodo:
                    aResourcesPeriod.length,

                mecanicos:
                    aResourceSummaries.length,

                orders:
                    aOrders.length,

                operations:
                    (oRaw.operations || [])
                        .length,

                confirmations:
                    (oRaw.confirmations || [])
                        .length,

                orderResources:
                    (oRaw.orderResources || [])
                        .length
            }
        );

        return {
            filters:
                oFilters,

            catalogos:
                buildCatalogs(
                    oRaw,
                    oFilters,
                    aResourcesPeriod,
                    aOrders
                ),

            kpis:
                oKpis,

            turnos:
                aTurnos,

            utilTurno:
                aUtilTurno,

            utilTotal:
                oUtilTotal,

            zonas:
                aZonas,

            estadoPlantilla:
                aEstadoPlantilla,

            servicios:
                aServicios,

            presion:
                aPresion,

            meta: {
                availabilityData:
                    bAvailabilityData,

                capacityData:
                    bCapacityData,

                planData:
                    bPlanData,

                actualData:
                    bActualData,

                assignmentsData:
                    bAssignmentData
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