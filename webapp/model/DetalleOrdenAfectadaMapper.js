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
                    startOfDay(oEnd).getTime() -
                    startOfDay(oStart).getTime()
                ) /
                86400000
            )
        );
    }

    function toNumber(vValue) {
        var nValue =
            Number(vValue);

        return Number.isFinite(nValue)
            ? nValue
            : 0;
    }

    function convertToHours(
        vValue,
        sUnit
    ) {
        var nValue =
            toNumber(vValue);

        var sNormalizedUnit =
            normalize(sUnit);

        switch (sNormalizedUnit) {

        case "MIN":
        case "MINUTE":
        case "MINUTES":
            return nValue / 60;

        case "S":
        case "SEC":
        case "SECOND":
            return nValue / 3600;

        case "H":
        case "HR":
        case "HOUR":
        case "HOURS":
        case "":
            return nValue;

        default:
            /*
             * No inventamos conversión para
             * unidades desconocidas.
             */
            return nValue;
        }
    }

    function round1(nValue) {
        return Math.round(
            nValue * 10
        ) / 10;
    }

    function formatHours(nValue) {
        return (
            round1(nValue).toFixed(1) +
            " h"
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
                        oRow[sKey] || ""
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
                    !mMap[
                        "R|" + sResourceId
                    ]
                ) {
                    mMap[
                        "R|" + sResourceId
                    ] = oResource;
                }

                if (
                    sPersonnel &&
                    !mMap[
                        "P|" + sPersonnel
                    ]
                ) {
                    mMap[
                        "P|" + sPersonnel
                    ] = oResource;
                }
            }
        );

        return mMap;
    }

    function getResourceById(
        mResources,
        sResourceId
    ) {
        return (
            mResources[
                "R|" +
                String(
                    sResourceId ||
                    ""
                )
            ] ||
            null
        );
    }

    function getResourceByPersonnel(
        mResources,
        sPersonnelNumber
    ) {
        return (
            mResources[
                "P|" +
                String(
                    sPersonnelNumber ||
                    ""
                )
            ] ||
            null
        );
    }

    function getResourceName(
        mResources,
        sResourceId,
        sPersonnelNumber
    ) {
        var oResource =
            getResourceById(
                mResources,
                sResourceId
            ) ||
            getResourceByPersonnel(
                mResources,
                sPersonnelNumber
            );

        if (!oResource) {
            return (
                sResourceId ||
                sPersonnelNumber ||
                "Sin datos"
            );
        }

        return (
            oResource.ResourceName ||
            sResourceId ||
            sPersonnelNumber ||
            "Sin datos"
        );
    }

    function getResourceType(
        mResources,
        sResourceId,
        sPersonnelNumber,
        sRoleCode
    ) {
        var oResource =
            getResourceById(
                mResources,
                sResourceId
            ) ||
            getResourceByPersonnel(
                mResources,
                sPersonnelNumber
            );

        return (
            (
                oResource &&
                oResource.ResourceTypeCode
            ) ||
            sRoleCode ||
            "SIN_TIPO"
        );
    }

    function statusState(
        sStatus
    ) {
        var sValue =
            normalize(sStatus);

        if (
            sValue.indexOf("COMP") >= 0 ||
            sValue.indexOf("FINAL") >= 0 ||
            sValue.indexOf("CLOSED") >= 0
        ) {
            return "Success";
        }

        if (
            sValue.indexOf("RISK") >= 0 ||
            sValue.indexOf("RIESGO") >= 0 ||
            sValue.indexOf("ERROR") >= 0
        ) {
            return "Error";
        }

        if (
            sValue.indexOf("PROCESS") >= 0 ||
            sValue.indexOf("PROCESO") >= 0 ||
            sValue.indexOf("PEND") >= 0
        ) {
            return "Warning";
        }

        if (
            sValue.indexOf("PROGRAM") >= 0
        ) {
            return "Information";
        }

        return "None";
    }

    function getCatalogText(
        aCatalogs,
        sDomain,
        sCode
    ) {
        if (!sCode) {
            return "";
        }

        var oMatch =
            (aCatalogs || []).find(
                function (oCatalog) {
                    return (
                        oCatalog.Active !== false &&
                        normalize(
                            oCatalog.FilterDomain
                        ) ===
                        normalize(sDomain) &&
                        String(
                            oCatalog.ValueId ||
                            ""
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

    function selectOrder(
        aOrders,
        sOrderId
    ) {
        if (sOrderId) {
            return (
                (aOrders || []).find(
                    function (oOrder) {
                        return (
                            String(
                                oOrder.OrderId ||
                                ""
                            ) ===
                            String(sOrderId)
                        );
                    }
                ) ||
                null
            );
        }

        return (
            (aOrders || [])[0] ||
            null
        );
    }

    function getBlockContext(
        aBlockOrders,
        aBlocks,
        sOrderId
    ) {
        var oRelation =
            (aBlockOrders || []).find(
                function (oRow) {
                    return (
                        String(
                            oRow.OrderId ||
                            ""
                        ) ===
                        String(
                            sOrderId ||
                            ""
                        )
                    );
                }
            );

        if (!oRelation) {
            return {
                relation: null,
                block: null
            };
        }

        var oBlock =
            (aBlocks || []).find(
                function (oRow) {
                    return (
                        String(
                            oRow.BlockId ||
                            ""
                        ) ===
                        String(
                            oRelation.BlockId ||
                            ""
                        )
                    );
                }
            ) ||
            null;

        return {
            relation:
                oRelation,

            block:
                oBlock
        };
    }

    function getOperationActualHours(
        aConfirmations,
        sOrderId,
        sOperationNumber
    ) {
        return (aConfirmations || [])
            .filter(
                function (oConfirmation) {
                    return (
                        String(
                            oConfirmation.OrderId ||
                            ""
                        ) ===
                        String(sOrderId) &&
                        String(
                            oConfirmation.OperationNumber ||
                            ""
                        ) ===
                        String(sOperationNumber) &&
                        oConfirmation.IncludedInCalculation !== false &&
                        !oConfirmation.CancellationIndicator
                    );
                }
            )
            .reduce(
                function (
                    nTotal,
                    oConfirmation
                ) {
                    return (
                        nTotal +
                        convertToHours(
                            oConfirmation.ActualValueOriginal,
                            oConfirmation.ActualUnitOriginal
                        )
                    );
                },
                0
            );
    }

    function getOperationResource(
        oOperation,
        aAssignments,
        mResources,
        sOrderId
    ) {
        /*
         * Primero intentamos la persona planeada
         * publicada directamente en OperationsSet.
         */
        if (
            oOperation.AssignedPersonnelNumber
        ) {
            return getResourceName(
                mResources,
                "",
                oOperation.AssignedPersonnelNumber
            );
        }

        var oAssignment =
            (aAssignments || []).find(
                function (oRow) {
                    return (
                        String(
                            oRow.OrderId ||
                            ""
                        ) ===
                        String(sOrderId) &&
                        (
                            String(
                                oRow.OperationCounter ||
                                ""
                            ) ===
                            String(
                                oOperation.OperationNumber ||
                                ""
                            )
                        )
                    );
                }
            );

        if (!oAssignment) {
            return "Sin datos";
        }

        return getResourceName(
            mResources,
            oAssignment.ResourceId,
            oAssignment.PersonnelNumber
        );
    }

    function mapEmpty(
        oRaw
    ) {
        return {
            pageTitle:
                "Detalle de orden afectada: Sin datos",

            filters: {
                period:
                    "currentMonth",

                dateFrom:
                    "01/01/2026",

                dateTo:
                    "31/12/2026",

                orderType:
                    "all",

                supervisor:
                    "all",

                zone:
                    "all"
            },

            kpis: {
                orderStatus:
                    "Sin datos",

                equipment:
                    "Sin datos",

                orderType:
                    "Sin datos",

                commitmentDate:
                    "Sin datos",

                plannedHours:
                    "0.0 h",

                actualHours:
                    "0.0 h",

                hourDeviation:
                    "(0.0 h / 0.0%)",

                responsible:
                    "Sin datos"
            },

            summary: {
                order:
                    "Sin datos",

                orderClass:
                    "Sin datos",

                status:
                    "Sin datos",

                priority:
                    "Sin datos",

                creationDate:
                    "Sin datos",

                commitmentDate:
                    "Sin datos",

                commitmentEnd:
                    "Sin datos",

                client:
                    "Sin datos",

                zone:
                    "Sin datos",

                site:
                    "Sin datos",

                elevator:
                    "Sin datos",

                responsible:
                    "Sin datos",

                equipment:
                    "Sin datos",

                relatedAsset:
                    "Sin datos"
            },

            operations:
                [],

            history:
                [],

            materials:
                [],

            resources:
                [],

            impact: {
                reason:
                    "Sin datos",

                equipmentStatus:
                    "Sin datos",

                managementStatus:
                    "Sin datos",

                blockedDays:
                    "Sin datos"
            },

            meta: {
                catalogs:
                    (oRaw.catalogs || []).length,

                orders:
                    0,

                operations:
                    (oRaw.operations || []).length,

                confirmations:
                    (oRaw.confirmations || []).length,

                orderResources:
                    (oRaw.orderResources || []).length,

                resources:
                    (oRaw.resources || []).length,

                blocks:
                    (oRaw.blocks || []).length,

                blockOrders:
                    (oRaw.blockOrders || []).length,

                materials:
                    (oRaw.materials || []).length,

                requirements:
                    (oRaw.requirements || []).length,

                events:
                    (oRaw.events || []).length
            }
        };
    }

    function mapData(
        oRawData,
        sOrderId
    ) {
        var oRaw =
            oRawData || {};

        var oOrder =
            selectOrder(
                oRaw.orders || [],
                sOrderId
            );

        /*
         * Hoy OrdersSet está vacío.
         * No usamos ResourceDaily para fabricar una OT.
         */
        if (!oOrder) {
            return mapEmpty(oRaw);
        }

        var sSelectedOrderId =
            String(
                oOrder.OrderId ||
                ""
            );

        var mResources =
            buildResourceMap(
                oRaw.resources || []
            );

        var aOperations =
            (oRaw.operations || []).filter(
                function (oOperation) {
                    return (
                        String(
                            oOperation.OrderId ||
                            ""
                        ) ===
                        sSelectedOrderId
                    );
                }
            );

        var aConfirmations =
            (oRaw.confirmations || []).filter(
                function (oConfirmation) {
                    return (
                        String(
                            oConfirmation.OrderId ||
                            ""
                        ) ===
                        sSelectedOrderId
                    );
                }
            );

        var aAssignments =
            (oRaw.orderResources || []).filter(
                function (oAssignment) {
                    return (
                        String(
                            oAssignment.OrderId ||
                            ""
                        ) ===
                        sSelectedOrderId
                    );
                }
            );

        var oBlockContext =
            getBlockContext(
                oRaw.blockOrders || [],
                oRaw.blocks || [],
                sSelectedOrderId
            );

        var oBlock =
            oBlockContext.block;

        var oBlockRelation =
            oBlockContext.relation;

        var nPlannedHours =
            aOperations.reduce(
                function (
                    nTotal,
                    oOperation
                ) {
                    return (
                        nTotal +
                        convertToHours(
                            oOperation.PlannedValueOriginal,
                            oOperation.PlannedUnitOriginal
                        )
                    );
                },
                0
            );

        var nActualHours =
            aConfirmations
                .filter(
                    function (
                        oConfirmation
                    ) {
                        return (
                            oConfirmation.IncludedInCalculation !== false &&
                            !oConfirmation.CancellationIndicator
                        );
                    }
                )
                .reduce(
                    function (
                        nTotal,
                        oConfirmation
                    ) {
                        return (
                            nTotal +
                            convertToHours(
                                oConfirmation.ActualValueOriginal,
                                oConfirmation.ActualUnitOriginal
                            )
                        );
                    },
                    0
                );

        var nDeviation =
            nActualHours -
            nPlannedHours;

        var nDeviationPct =
            nPlannedHours > 0
                ? (
                    nDeviation /
                    nPlannedHours
                ) * 100
                : 0;

        var aMappedOperations =
            aOperations.map(
                function (oOperation) {
                    var nActual =
                        getOperationActualHours(
                            aConfirmations,
                            sSelectedOrderId,
                            oOperation.OperationNumber
                        );

                    return {
                        operation:
                            oOperation.OperationNumber ||
                            "Sin datos",

                        description:
                            oOperation.Description ||
                            "Sin datos",

                        workCenter:
                            oOperation.WorkCenterCode ||
                            "Sin datos",

                        resource:
                            getOperationResource(
                                oOperation,
                                aAssignments,
                                mResources,
                                sSelectedOrderId
                            ),

                        plannedHours:
                            formatHours(
                                convertToHours(
                                    oOperation.PlannedValueOriginal,
                                    oOperation.PlannedUnitOriginal
                                )
                            ),

                        actualHours:
                            formatHours(
                                nActual
                            ),

                        status:
                            oOperation.OperationStatusCode ||
                            "Sin datos",

                        statusState:
                            statusState(
                                oOperation.OperationStatusCode
                            ),

                        /*
                         * NO existe impacto a nivel operación.
                         */
                        impact:
                            "Sin datos",

                        impactState:
                            "None"
                    };
                }
            );

        var aHistory =
            (oRaw.events || [])
                .filter(
                    function (oEvent) {
                        return (
                            String(
                                oEvent.OrderId ||
                                ""
                            ) ===
                            sSelectedOrderId
                        );
                    }
                )
                .slice()
                .sort(
                    function (
                        a,
                        b
                    ) {
                        var oA =
                            parseDate(
                                a.EventAt
                            );

                        var oB =
                            parseDate(
                                b.EventAt
                            );

                        return (
                            (
                                oB
                                    ? oB.getTime()
                                    : 0
                            ) -
                            (
                                oA
                                    ? oA.getTime()
                                    : 0
                            )
                        );
                    }
                )
                .map(
                    function (oEvent) {
                        var sStatus =
                            oEvent.AppStatusCode ||
                            oEvent.SapStatusCode ||
                            "Sin datos";

                        return {
                            date:
                                formatDateTime(
                                    oEvent.EventAt
                                ),

                            user:
                                oEvent.UserId ||
                                "Sin datos",

                            action:
                                oEvent.ActionCode ||
                                oEvent.EventTypeCode ||
                                "Sin datos",

                            comment:
                                oEvent.Comment ||
                                "Sin datos",

                            status:
                                sStatus,

                            statusState:
                                statusState(
                                    sStatus
                                )
                        };
                    }
                );

        /*
         * MATERIAL y REQUIREMENT se mantienen separados.
         * Después se consolidan únicamente para la tabla
         * visual de la pantalla.
         */
        var aMaterialRows =
            (oRaw.materials || [])
                .filter(
                    function (oMaterial) {
                        return (
                            String(
                                oMaterial.OrderId ||
                                ""
                            ) ===
                            sSelectedOrderId
                        );
                    }
                )
                .map(
                    function (oMaterial) {
                        return {
                            type:
                                "Material pendiente",

                            description:
                                oMaterial.MaterialName ||
                                oMaterial.MaterialId ||
                                "Sin datos",

                            /*
                             * El contrato NO tiene ResponsibleId
                             * para materiales.
                             */
                            responsible:
                                "Sin datos",

                            date:
                                formatDate(
                                    oMaterial.RequiredDate
                                ),

                            /*
                             * DataValidationStatusCode no es workflow.
                             */
                            status:
                                "Sin datos",

                            statusState:
                                "None"
                        };
                    }
                );

        var aRequirementRows =
            (oRaw.requirements || [])
                .filter(
                    function (oRequirement) {
                        return (
                            String(
                                oRequirement.OrderId ||
                                ""
                            ) ===
                            sSelectedOrderId
                        );
                    }
                )
                .map(
                    function (oRequirement) {
                        return {
                            type:
                                oRequirement.RequirementTypeText ||
                                oRequirement.RequirementTypeCode ||
                                "Sin datos",

                            description:
                                oRequirement.Description ||
                                "Sin datos",

                            responsible:
                                getResourceName(
                                    mResources,
                                    oRequirement.ResponsibleId,
                                    ""
                                ),

                            date:
                                formatDate(
                                    oRequirement.CommitmentDate
                                ),

                            status:
                                oRequirement.StatusText ||
                                oRequirement.StatusCode ||
                                "Sin datos",

                            statusState:
                                statusState(
                                    oRequirement.StatusText ||
                                    oRequirement.StatusCode
                                )
                        };
                    }
                );

        var aMaterials =
            aMaterialRows.concat(
                aRequirementRows
            );

        /*
         * Agrupación de recursos.
         */
        var mResourceGroups =
            Object.create(null);

        aAssignments.forEach(
            function (oAssignment) {
                var sType =
                    getResourceType(
                        mResources,
                        oAssignment.ResourceId,
                        oAssignment.PersonnelNumber,
                        oAssignment.RoleCode
                    );

                var sKey =
                    normalize(sType) ||
                    "SIN_TIPO";

                if (!mResourceGroups[sKey]) {
                    mResourceGroups[sKey] = {
                        type:
                            sType,

                        ids:
                            Object.create(null),

                        personnel:
                            Object.create(null)
                    };
                }

                if (oAssignment.ResourceId) {
                    mResourceGroups[sKey].ids[
                        oAssignment.ResourceId
                    ] = true;
                }

                if (oAssignment.PersonnelNumber) {
                    mResourceGroups[sKey].personnel[
                        oAssignment.PersonnelNumber
                    ] = true;
                }
            }
        );

        /*
         * Horas por tipo de recurso.
         */
        Object.keys(
            mResourceGroups
        ).forEach(
            function (sKey) {
                mResourceGroups[sKey].planned = 0;
                mResourceGroups[sKey].actual = 0;
            }
        );

        aOperations.forEach(
            function (oOperation) {
                var oResource =
                    getResourceByPersonnel(
                        mResources,
                        oOperation.AssignedPersonnelNumber
                    );

                if (!oResource) {
                    return;
                }

                var sKey =
                    normalize(
                        oResource.ResourceTypeCode
                    );

                if (!mResourceGroups[sKey]) {
                    return;
                }

                mResourceGroups[sKey].planned +=
                    convertToHours(
                        oOperation.PlannedValueOriginal,
                        oOperation.PlannedUnitOriginal
                    );
            }
        );

        aConfirmations.forEach(
            function (oConfirmation) {
                if (
                    oConfirmation.IncludedInCalculation === false ||
                    oConfirmation.CancellationIndicator
                ) {
                    return;
                }

                var oResource =
                    getResourceByPersonnel(
                        mResources,
                        oConfirmation.ExecutorPersonnelNumber
                    );

                if (!oResource) {
                    return;
                }

                var sKey =
                    normalize(
                        oResource.ResourceTypeCode
                    );

                if (!mResourceGroups[sKey]) {
                    return;
                }

                mResourceGroups[sKey].actual +=
                    convertToHours(
                        oConfirmation.ActualValueOriginal,
                        oConfirmation.ActualUnitOriginal
                    );
            }
        );

        var aResources =
            Object.keys(
                mResourceGroups
            ).map(
                function (sKey) {
                    var oGroup =
                        mResourceGroups[sKey];

                    var nPlan =
                        oGroup.planned || 0;

                    var nReal =
                        oGroup.actual || 0;

                    var nDeviationType =
                        nReal - nPlan;

                    var nDeviationPctType =
                        nPlan > 0
                            ? (
                                nDeviationType /
                                nPlan
                            ) * 100
                            : 0;

                    /*
                     * La maqueta utiliza real / plan.
                     * Está marcado como regla funcional
                     * pendiente de confirmación.
                     */
                    var nUtilization =
                        nPlan > 0
                            ? (
                                nReal /
                                nPlan
                            ) * 100
                            : 0;

                    var iAssigned =
                        Object.keys(
                            oGroup.ids
                        ).length ||
                        Object.keys(
                            oGroup.personnel
                        ).length;

                    return {
                        type:
                            oGroup.type ||
                            "Sin datos",

                        assigned:
                            String(
                                iAssigned
                            ),

                        plannedHours:
                            formatHours(
                                nPlan
                            ),

                        actualHours:
                            formatHours(
                                nReal
                            ),

                        deviation:
                            (
                                nDeviationType >= 0
                                    ? "+"
                                    : ""
                            ) +
                            round1(
                                nDeviationType
                            ).toFixed(1) +
                            " h (" +
                            round1(
                                nDeviationPctType
                            ).toFixed(1) +
                            "%)",

                        utilizationBar:
                            Math.min(
                                100,
                                Math.max(
                                    0,
                                    Math.round(
                                        nUtilization
                                    )
                                )
                            ),

                        utilization:
                            Math.round(
                                nUtilization
                            ) +
                            "%"
                    };
                }
            );

        var sMainResponsible =
            "Sin datos";

        var oMainAssignment =
            aAssignments.find(
                function (oAssignment) {
                    return (
                        !oAssignment.ValidTo
                    );
                }
            ) ||
            aAssignments[0];

        if (oMainAssignment) {
            var oMainResource =
                getResourceById(
                    mResources,
                    oMainAssignment.ResourceId
                ) ||
                getResourceByPersonnel(
                    mResources,
                    oMainAssignment.PersonnelNumber
                );

            if (oMainResource) {
                sMainResponsible =
                    oMainResource.SupervisorName ||
                    oMainResource.ResourceName ||
                    "Sin datos";
            }
        }

        var oBlockedAt =
            oBlock
                ? parseDate(
                    oBlock.BlockedAt
                )
                : null;

        var oReleasedAt =
            oBlock
                ? parseDate(
                    oBlock.ReleasedAt
                )
                : null;

        var iBlockedDays =
            oBlockedAt
                ? diffDays(
                    oBlockedAt,
                    oReleasedAt ||
                    new Date()
                )
                : null;

        /*
         * IMPORTANTE:
         * Fecha compromiso de la ORDEN todavía
         * no está homologada funcionalmente.
         *
         * No inventamos una fecha.
         */
        var sCommitmentDate =
            "Sin datos";

        /*
         * Prioridad de orden tampoco existe
         * en DashboardOrdersSet.
         */
        var sOrderPriority =
            "Sin datos";

        return {
            pageTitle:
                "Detalle de orden afectada: " +
                (
                    oOrder.OrderId ||
                    "Sin datos"
                ),

            filters: {
                period:
                    "currentMonth",

                dateFrom:
                    "01/01/2026",

                dateTo:
                    "31/12/2026",

                orderType:
                    "all",

                supervisor:
                    "all",

                zone:
                    "all"
            },

            kpis: {
                /*
                 * NO mostramos "En riesgo" calculado
                 * hasta tener regla funcional aprobada.
                 */
                orderStatus:
                    oOrder.StatusText ||
                    oOrder.AppStatusCode ||
                    oOrder.SapUserStatusCode ||
                    "Sin datos",

                equipment:
                    oOrder.EquipmentId ||
                    oOrder.EquipmentName ||
                    "Sin datos",

                orderType:
                    oOrder.OrderTypeText ||
                    oOrder.OrderTypeCode ||
                    "Sin datos",

                commitmentDate:
                    sCommitmentDate,

                plannedHours:
                    formatHours(
                        nPlannedHours
                    ),

                actualHours:
                    formatHours(
                        nActualHours
                    ),

                hourDeviation:
                    "(" +
                    (
                        nDeviation >= 0
                            ? "+"
                            : ""
                    ) +
                    round1(
                        nDeviation
                    ).toFixed(1) +
                    " h / " +
                    round1(
                        nDeviationPct
                    ).toFixed(1) +
                    "%)",

                responsible:
                    sMainResponsible
            },

            summary: {
                order:
                    oOrder.OrderId ||
                    "Sin datos",

                /*
                 * Homologamos contra OrderTypeText.
                 */
                orderClass:
                    oOrder.OrderTypeText ||
                    oOrder.OrderTypeCode ||
                    "Sin datos",

                status:
                    oOrder.StatusText ||
                    oOrder.AppStatusCode ||
                    oOrder.SapUserStatusCode ||
                    "Sin datos",

                priority:
                    sOrderPriority,

                creationDate:
                    formatDateTime(
                        oOrder.CreatedAt
                    ),

                commitmentDate:
                    sCommitmentDate,

                commitmentEnd:
                    "Sin datos",

                client:
                    oOrder.CustomerName ||
                    oOrder.CustomerId ||
                    "Sin datos",

                zone:
                    /*
                     * La zona puede resolverse mejor
                     * desde ResourceDaily cuando exista
                     * la asignación correcta.
                     */
                    (
                        oMainAssignment &&
                        (
                            getResourceById(
                                mResources,
                                oMainAssignment.ResourceId
                            ) ||
                            getResourceByPersonnel(
                                mResources,
                                oMainAssignment.PersonnelNumber
                            )
                        ) &&
                        (
                            getResourceById(
                                mResources,
                                oMainAssignment.ResourceId
                            ) ||
                            getResourceByPersonnel(
                                mResources,
                                oMainAssignment.PersonnelNumber
                            )
                        ).ZoneName
                    ) ||
                    "Sin datos",

                site:
                    oOrder.SiteName ||
                    oOrder.SiteId ||
                    "Sin datos",

                elevator:
                    oOrder.EquipmentName ||
                    oOrder.EquipmentId ||
                    "Sin datos",

                responsible:
                    sMainResponsible,

                equipment:
                    oOrder.EquipmentId ||
                    oOrder.EquipmentName ||
                    "Sin datos",

                /*
                 * No existe campo específico.
                 */
                relatedAsset:
                    "Sin datos"
            },

            operations:
                aMappedOperations,

            history:
                aHistory,

            materials:
                aMaterials,

            resources:
                aResources,

            impact: {
                reason:
                    (
                        oBlock &&
                        (
                            oBlock.BlockReasonText ||
                            oBlock.BlockReasonCode
                        )
                    ) ||
                    "Sin datos",

                equipmentStatus:
                    (
                        oBlock &&
                        (
                            oBlock.CurrentStatusText ||
                            oBlock.CurrentStatusCode
                        )
                    ) ||
                    "Sin datos",

                managementStatus:
                    (
                        oBlock &&
                        (
                            getCatalogText(
                                oRaw.catalogs || [],
                                "MANAGEMENT_STATUS",
                                oBlock.ManagementStatusCode
                            )
                        )
                    ) ||
                    "Sin datos",

                blockedDays:
                    iBlockedDays === null
                        ? "Sin datos"
                        : String(
                            iBlockedDays
                        ),

                impactLevel:
                    (
                        oBlockRelation &&
                        oBlockRelation.ImpactLevelCode
                    ) ||
                    "Sin datos"
            },

            meta: {
                selectedOrderId:
                    sSelectedOrderId,

                catalogs:
                    (oRaw.catalogs || []).length,

                orders:
                    (oRaw.orders || []).length,

                operations:
                    aOperations.length,

                confirmations:
                    aConfirmations.length,

                orderResources:
                    aAssignments.length,

                resources:
                    (oRaw.resources || []).length,

                blocks:
                    (oRaw.blocks || []).length,

                blockOrders:
                    (oRaw.blockOrders || []).length,

                materials:
                    (oRaw.materials || []).length,

                requirements:
                    (oRaw.requirements || []).length,

                events:
                    (oRaw.events || []).length
            }
        };
    }

    return {
        mapData:
            mapData
    };
});