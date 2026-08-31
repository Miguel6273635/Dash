sap.ui.define([
    "mantenimiento/model/dashboardMapper"
], function (DashboardMapper) {
    "use strict";

    // Las entidades dependientes se consultan por lotes de OT ya filtradas.
    // No se usa $top: el servicio debe devolver todos los registros del rango.
    var ORDER_FILTER_BATCH_SIZE = 40;
    var TYPE_MAP = {
        PREVENTIVO: "SM01",
        CORRECTIVO: "SM02",
        CALL_CENTER: "SM03"
    };
    var STATUS_MAP = {
        ABIERTA: "E0013",
        EN_PROCESO: "E0014",
        COMPLETADA: "E0015"
    };
    var APP_STATUS_TO_SAP_STATUS = {
        "0100": "E0013",
        "0200": "E0014",
        "0300": "E0015",
        "0400": "E0016",
        "0500": "E0017",
        "0600": "E0018",
        "0301": "E0019"
    };
    var SELECTS = {
        DashboardOrdersSet: [
            "OrderId", "OrderTypeCode", "OrderTypeText", "PlannedStartDate",
            "PlannedFinishDate", "SapUserStatusCode", "AppStatusCode", "StatusText",
            "SupervisorId", "Mecanico", "Turno", "Zona"
        ],
        DashboardOrderCausesSet: [
            "OrderCauseId", "OrderId", "CauseCode", "CauseText", "CauseContextCode",
            "IsPrimary", "ValidTo"
        ],
        DashboardOrderMaterialsSet: [
            "MaterialRequirementId", "OrderId", "MaterialCategoryCode", "MaterialCategoryName",
            "BaseUnitCode", "PlannedQuantity", "IsPublishable"
        ],
        DashboardOrderResourcesSet: [
            "OrderResourceId", "OrderId", "RoutingNumber", "OperationCounter", "ResourceId",
            "PersonnelNumber", "RoleCode", "AssignmentTypeCode", "ValidFrom", "ValidTo"
        ],
        DashboardMaterialMovementsSet: [
            "MaterialMovementId", "MaterialRequirementId", "MovementDirectionCode",
            "MovementQuantity", "MovementUnitCode", "IsReversal"
        ],
        DashboardServiceRequestsSet: [
            "RequestId", "ZoneId", "ResponsibleId", "RequestedAt", "AttendedAt", "ClosedAt",
            "CurrentStatusCode"
        ],
        DashboardEquipmentBlocksSet: [
            "BlockId", "ZoneId", "SupervisorId", "BlockedAt", "ReleasedAt",
            "CurrentStatusCode", "IsPublishable"
        ],
        DashboardBlockOrdersSet: [
            "BlockOrderId", "BlockId", "OrderId", "ImpactStartAt", "ImpactEndAt"
        ],
        DashboardFilterCatalogSet: [
            "FilterCatalogId", "FilterDomain", "ValueId", "ValueText", "NumericValue",
            "UnitCode", "ScopeTypeCode", "ScopeId", "SortOrder", "Active"
        ],
        DashboardResourceDailySet: [
            "ResourceDateId", "ResourceId", "ResourceName", "ResourceTypeCode", "WorkDate",
            "ZoneId", "ZoneName", "SupervisorId", "SupervisorName", "ShiftId", "ShiftName",
            "AvailabilityStatusCode", "CapacitySourceValidated", "CapacityHours"
        ],
        DashboardOrderOperationsSet: [
            "OperationKey", "OrderId", "OperationCounter", "PlannedSourceCode",
            "PlannedValueOriginal", "PlannedUnitOriginal", "CapacityLineNumber", "PlannedStartDate"
        ],
        DashboardOrderConfirmationsSet: [
            "ConfirmationId", "OrderId", "ActualValueOriginal", "ActualUnitOriginal",
            "ActualStartDate", "IncludedInCalculation"
        ]
    };
    var INDEPENDENT_SETS = {
        DashboardServiceRequestsSet: "serviceRequests",
        DashboardEquipmentBlocksSet: "blocks",
        DashboardFilterCatalogSet: "catalogs"
    };
    var ORDER_DEPENDENT_SETS = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderMaterialsSet: "materials",
        DashboardOrderResourcesSet: "assignments",
        DashboardBlockOrdersSet: "blockOrders",
        DashboardOrderOperationsSet: "operations",
        DashboardOrderConfirmationsSet: "confirmations"
    };

    function hasValue(vValue) {
        var sValue = String(vValue || "").trim().toUpperCase();
        return Boolean(sValue) && ["TODOS", "TODAS", "ALL", "NULL"].indexOf(sValue) < 0;
    }

    function normalizeValue(vValue) {
        return String(vValue || "").trim().toUpperCase();
    }

    function canonicalStatus(oOrder) {
        var sSapStatus = normalizeValue(oOrder && oOrder.SapUserStatusCode);
        var sAppStatus = normalizeValue(oOrder && oOrder.AppStatusCode);

        if (/^E00\d{2}$/.test(sSapStatus)) {
            return sSapStatus;
        }
        if (/^E00\d{2}$/.test(sAppStatus)) {
            return sAppStatus;
        }
        return APP_STATUS_TO_SAP_STATUS[sSapStatus] || APP_STATUS_TO_SAP_STATUS[sAppStatus] || "";
    }

    function parseDate(vValue, bEndOfDay) {
        var sText;
        var aMatch;
        var sIsoDate;
        var oDate;

        if (!vValue) {
            return null;
        }
        sText = String(vValue).trim();
        aMatch = sText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        sIsoDate = aMatch ? aMatch[3] + "-" + aMatch[2] + "-" + aMatch[1] : sText.slice(0, 10);
        oDate = new Date(sIsoDate + "T" + (bEndOfDay ? "23:59:59" : "00:00:00"));
        return Number.isNaN(oDate.getTime()) ? null : oDate;
    }

    function parseODataDate(vValue) {
        var aMatch;
        var oDate;

        if (!vValue) {
            return null;
        }
        if (vValue instanceof Date) {
            oDate = new Date(vValue.getTime());
        } else {
            aMatch = String(vValue).match(/\/Date\((-?\d+)/);
            oDate = aMatch ? new Date(Number(aMatch[1])) : new Date(vValue);
        }
        if (Number.isNaN(oDate.getTime())) {
            return null;
        }
        // SAP serializa Edm.DateTime sin zona como medianoche UTC. Para filtros
        // de calendario se conserva la fecha SAP y se evita el desfase de México.
        if (oDate.getUTCHours() === 0 && oDate.getUTCMinutes() === 0 && oDate.getUTCSeconds() === 0) {
            return new Date(oDate.getUTCFullYear(), oDate.getUTCMonth(), oDate.getUTCDate());
        }
        return oDate;
    }

    function formatODataDate(oDate) {
        if (!(oDate instanceof Date) || Number.isNaN(oDate.getTime())) {
            return null;
        }
        return [
            oDate.getFullYear(),
            String(oDate.getMonth() + 1).padStart(2, "0"),
            String(oDate.getDate()).padStart(2, "0")
        ].join("-") + "T00:00:00";
    }

    function escapeODataString(vValue) {
        return String(vValue).replace(/'/g, "''");
    }

    function getFilterContext(mFilters) {
        var mValues = mFilters || {};
        var sType = normalizeValue(mValues.tipoOrden);
        var sStatus = normalizeValue(mValues.estadoOrden);

        return {
            startDate: parseDate(mValues.fechaInicio, false),
            endDate: parseDate(mValues.fechaFin, true),
            zone: hasValue(mValues.zona) ? String(mValues.zona) : null,
            supervisor: hasValue(mValues.supervisor) ? String(mValues.supervisor) : null,
            orderType: hasValue(sType) ? TYPE_MAP[sType] || sType : null,
            shift: hasValue(mValues.turno) ? String(mValues.turno) : null,
            mechanic: hasValue(mValues.mecanico) ? String(mValues.mecanico) : null,
            status: hasValue(sStatus) ? STATUS_MAP[sStatus] || sStatus : null
        };
    }

    function buildOrdersFilter(mContext) {
        var aClauses = [];
        var sStart = formatODataDate(mContext.startDate);
        var sEnd = formatODataDate(mContext.endDate);

        // El GET_ENTITYSET ABAP compartido usa EQ como parámetro de rango.
        if (sStart) {
            aClauses.push("PlannedStartDate eq datetime'" + sStart + "'");
        }
        if (sEnd) {
            aClauses.push("PlannedFinishDate eq datetime'" + sEnd + "'");
        }
        if (mContext.zone) {
            aClauses.push("Zona eq '" + escapeODataString(mContext.zone) + "'");
        }
        if (mContext.orderType) {
            aClauses.push("OrderTypeCode eq '" + escapeODataString(mContext.orderType) + "'");
        }
        if (mContext.supervisor) {
            aClauses.push("SupervisorId eq '" + escapeODataString(mContext.supervisor) + "'");
        }
        if (mContext.mechanic) {
            aClauses.push("Mecanico eq '" + escapeODataString(mContext.mechanic) + "'");
        }
        if (mContext.shift) {
            aClauses.push("Turno eq '" + escapeODataString(mContext.shift) + "'");
        }
        return aClauses.join(" and ");
    }

    function readEntitySet(oModel, sEntitySet, sFilter) {
        var mUrlParameters = { "$format": "json" };

        if (SELECTS[sEntitySet]) {
            mUrlParameters.$select = SELECTS[sEntitySet].join(",");
        }
        if (sFilter) {
            mUrlParameters.$filter = sFilter;
        }

        return new Promise(function (resolve, reject) {
            oModel.read("/" + sEntitySet, {
                urlParameters: mUrlParameters,
                success: function (oData) {
                    resolve(Array.isArray(oData && oData.results) ? oData.results : []);
                },
                error: function (oError) {
                    var sMessage = "No fue posible consultar " + sEntitySet;
                    if (oError && oError.message) {
                        sMessage += ": " + oError.message;
                    }
                    reject(new Error(sMessage));
                }
            });
        });
    }

    function readOptional(oModel, sEntitySet, sFilter) {
        return readEntitySet(oModel, sEntitySet, sFilter || "").then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
            return { entitySet: sEntitySet, records: [], error: oError.message };
        });
    }

    function buildValuesFilter(sField, aValues) {
        return aValues.map(function (vValue) {
            return sField + " eq '" + escapeODataString(vValue) + "'";
        }).join(" or ");
    }

    function createBatches(aValues) {
        var aDistinct = Array.from(new Set((aValues || []).filter(function (vValue) {
            return String(vValue || "").trim() !== "";
        }).map(function (vValue) {
            return String(vValue);
        })));
        var aBatches = [];
        var iIndex;

        for (iIndex = 0; iIndex < aDistinct.length; iIndex += ORDER_FILTER_BATCH_SIZE) {
            aBatches.push(aDistinct.slice(iIndex, iIndex + ORDER_FILTER_BATCH_SIZE));
        }
        return aBatches;
    }

    function readByValues(oModel, sEntitySet, sField, aValues) {
        var aBatches = createBatches(aValues);

        if (!aBatches.length) {
            return Promise.resolve({ entitySet: sEntitySet, records: [], error: null });
        }

        return Promise.all(aBatches.map(function (aBatch) {
            return readEntitySet(oModel, sEntitySet, buildValuesFilter(sField, aBatch)).then(function (aRecords) {
                return { records: aRecords, error: null };
            }).catch(function (oError) {
                return { records: [], error: oError.message };
            });
        })).then(function (aResults) {
            var aRecords = [];
            var aErrors = [];

            aResults.forEach(function (oResult) {
                aRecords = aRecords.concat(oResult.records);
                if (oResult.error) {
                    aErrors.push(oResult.error);
                }
            });
            return {
                entitySet: sEntitySet,
                records: aRecords,
                error: aErrors.length ? aErrors.join(" | ") : null
            };
        });
    }

    function buildDateRangeFilter(sField, mContext) {
        var aClauses = [];
        var sStart = formatODataDate(mContext.startDate);
        var sEnd = formatODataDate(mContext.endDate);

        if (sStart) {
            aClauses.push(sField + " ge datetime'" + sStart + "'");
        }
        if (sEnd) {
            aClauses.push(sField + " le datetime'" + sEnd + "'");
        }
        return aClauses.join(" and ");
    }

    function isExecutedOrder(oOrder) {
        return ["E0015", "E0016", "E0019"].indexOf(canonicalStatus(oOrder)) >= 0;
    }

    function isWithinRange(vValue, oStartDate, oEndDate) {
        var oDate = parseODataDate(vValue);
        if (!oStartDate && !oEndDate) {
            return true;
        }
        return Boolean(oDate) && (!oStartDate || oDate >= oStartDate) && (!oEndDate || oDate <= oEndDate);
    }

    function matches(vValue, vExpected) {
        return !vExpected || normalizeValue(vValue) === normalizeValue(vExpected);
    }

    function filterOrders(aOrders, mContext) {
        return aOrders.filter(function (oOrder) {
            return ["SM01", "SM02", "SM03"].indexOf(normalizeValue(oOrder.OrderTypeCode)) >= 0 &&
                isWithinRange(oOrder.PlannedStartDate, mContext.startDate, mContext.endDate) &&
                matches(oOrder.OrderTypeCode, mContext.orderType) &&
                matches(canonicalStatus(oOrder), mContext.status) &&
                matches(oOrder.Zona, mContext.zone) &&
                matches(oOrder.SupervisorId, mContext.supervisor) &&
                matches(oOrder.Turno, mContext.shift) &&
                matches(oOrder.Mecanico, mContext.mechanic);
        });
    }

    function filterResources(aResources, mContext) {
        return aResources.filter(function (oResource) {
            return isWithinRange(oResource.WorkDate, mContext.startDate, mContext.endDate) &&
                matches(oResource.ZoneId, mContext.zone) &&
                matches(oResource.SupervisorId, mContext.supervisor) &&
                matches(oResource.ShiftId, mContext.shift) &&
                matches(oResource.ResourceId, mContext.mechanic);
        });
    }

    function filterServiceRequests(aRequests, mContext) {
        return aRequests.filter(function (oRequest) {
            return isWithinRange(oRequest.RequestedAt, mContext.startDate, mContext.endDate) &&
                matches(oRequest.ZoneId, mContext.zone) &&
                matches(oRequest.ResponsibleId, mContext.mechanic);
        });
    }

    function filterBlocks(aBlocks, mContext) {
        return aBlocks.filter(function (oBlock) {
            var oBlockedAt = parseODataDate(oBlock.BlockedAt);
            var oReleasedAt = parseODataDate(oBlock.ReleasedAt);
            var bOverlaps = (!mContext.endDate || !oBlockedAt || oBlockedAt <= mContext.endDate) &&
                (!mContext.startDate || !oReleasedAt || oReleasedAt >= mContext.startDate);

            return bOverlaps && matches(oBlock.ZoneId, mContext.zone) &&
                matches(oBlock.SupervisorId, mContext.supervisor);
        });
    }

    function analyzeOrderData(aOrders) {
        var aOfficial = aOrders.filter(function (oOrder) {
            return ["SM01", "SM02", "SM03"].indexOf(normalizeValue(oOrder.OrderTypeCode)) >= 0;
        });
        var iTotal = aOfficial.length;
        var fnMissing = function (sProperty) {
            return aOfficial.filter(function (oOrder) {
                return !String(oOrder[sProperty] || "").trim();
            }).length;
        };
        var iMissingStatus = aOfficial.filter(function (oOrder) {
            return !canonicalStatus(oOrder);
        }).length;
        var iPlaceholderPeople = aOfficial.filter(function (oOrder) {
            return [oOrder.SupervisorId, oOrder.Mecanico].some(function (vValue) {
                return /^0+$/.test(String(vValue || "").trim());
            });
        }).length;
        var aWarnings = [];

        if (iTotal && iMissingStatus) {
            aWarnings.push(iMissingStatus + " de " + iTotal + " órdenes no incluyen SapUserStatusCode");
        }
        if (iTotal && fnMissing("Zona")) {
            aWarnings.push(fnMissing("Zona") + " de " + iTotal + " órdenes no incluyen Zona");
        }
        if (iTotal && fnMissing("Turno")) {
            aWarnings.push(fnMissing("Turno") + " de " + iTotal + " órdenes no incluyen Turno");
        }
        if (iPlaceholderPeople) {
            aWarnings.push(iPlaceholderPeople + " de " + iTotal + " órdenes contienen IDs de persona en ceros");
        }
        return {
            level: aWarnings.length ? "PARTIAL" : "COMPLETE",
            warnings: aWarnings,
            fields: {
                status: { missing: iMissingStatus, total: iTotal },
                zone: { missing: fnMissing("Zona"), total: iTotal },
                shift: { missing: fnMissing("Turno"), total: iTotal },
                peopleWithPlaceholderId: { count: iPlaceholderPeople, total: iTotal }
            }
        };
    }

    function createEmpty(mFilters) {
        var mContext = getFilterContext(mFilters);

        return DashboardMapper.buildDashboard({
            orders: [],
            causes: [],
            materials: [],
            movements: [],
            serviceRequests: [],
            blocks: [],
            blockOrders: [],
            catalogs: [],
            resources: [],
            assignments: [],
            operations: [],
            confirmations: [],
            range: {
                startDate: mContext.startDate,
                endDate: mContext.endDate
            }
        });
    }

    function load(oModel, mFilters) {
        var mContext;
        var sOrderFilter;

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }

        mContext = getFilterContext(mFilters);
        if (mContext.startDate && mContext.endDate && mContext.startDate > mContext.endDate) {
            return Promise.reject(new Error("La fecha desde no puede ser posterior a la fecha hasta"));
        }
        sOrderFilter = buildOrdersFilter(mContext);

        // Primero se obtienen las OT del período. Los Entity Sets como causas,
        // operaciones, confirmaciones y materiales requieren el OrderId en QAS;
        // una lectura global de esas entidades devuelve vacío aunque existan datos.
        return readEntitySet(oModel, "DashboardOrdersSet", sOrderFilter).then(function (aRawOrders) {
            var mRaw = { warnings: [] };
            var aOrders;
            var oOrderIds;
            var oNonExecutedIds;
            var aCauses;
            var aMaterials;
            var oMaterialIds;
            var aMovements;
            var aRequests;
            var aBlocks;
            var oBlockIds;
            var aBlockOrders;
            var aResources;
            var aOperations;
            var aConfirmations;
            var oDashboard;
            var aInitialReads;

            aOrders = filterOrders(aRawOrders, mContext);
            oOrderIds = new Set(aOrders.map(function (oOrder) { return String(oOrder.OrderId); }));
            oNonExecutedIds = new Set(aOrders.filter(function (oOrder) {
                return !isExecutedOrder(oOrder);
            }).map(function (oOrder) { return String(oOrder.OrderId); }));

            aInitialReads = Object.keys(INDEPENDENT_SETS).map(function (sEntitySet) {
                return readOptional(oModel, sEntitySet);
            });
            aInitialReads.push(readOptional(
                oModel,
                "DashboardResourceDailySet",
                buildDateRangeFilter("WorkDate", mContext)
            ));
            Object.keys(ORDER_DEPENDENT_SETS).forEach(function (sEntitySet) {
                aInitialReads.push(readByValues(oModel, sEntitySet, "OrderId", Array.from(oOrderIds)));
            });

            return Promise.all(aInitialReads).then(function (aResponses) {
                aResponses.forEach(function (oResponse) {
                    var sModelProperty = INDEPENDENT_SETS[oResponse.entitySet] ||
                        ORDER_DEPENDENT_SETS[oResponse.entitySet] ||
                        (oResponse.entitySet === "DashboardResourceDailySet" ? "resources" : "");

                    if (sModelProperty) {
                        mRaw[sModelProperty] = oResponse.records;
                    }
                    if (oResponse.error) {
                        mRaw.warnings.push({ entitySet: oResponse.entitySet, message: oResponse.error });
                    }
                });

                aMaterials = (mRaw.materials || []).filter(function (oMaterial) {
                    return oOrderIds.has(String(oMaterial.OrderId)) && oMaterial.IsPublishable !== false;
                });
                oMaterialIds = new Set(aMaterials.map(function (oMaterial) {
                    return String(oMaterial.MaterialRequirementId);
                }));

                return readByValues(
                    oModel,
                    "DashboardMaterialMovementsSet",
                    "MaterialRequirementId",
                    Array.from(oMaterialIds)
                );
            }).then(function (oMovementResponse) {
                mRaw.movements = oMovementResponse.records;
                if (oMovementResponse.error) {
                    mRaw.warnings.push({ entitySet: oMovementResponse.entitySet, message: oMovementResponse.error });
                }

                aCauses = (mRaw.causes || []).filter(function (oCause) {
                    return oNonExecutedIds.has(String(oCause.OrderId));
                });
                aMaterials = (mRaw.materials || []).filter(function (oMaterial) {
                    return oOrderIds.has(String(oMaterial.OrderId)) && oMaterial.IsPublishable !== false;
                });
                oMaterialIds = new Set(aMaterials.map(function (oMaterial) {
                    return String(oMaterial.MaterialRequirementId);
                }));
                aMovements = (mRaw.movements || []).filter(function (oMovement) {
                    return oMaterialIds.has(String(oMovement.MaterialRequirementId)) && oMovement.IsReversal !== true;
                });
                aRequests = filterServiceRequests(mRaw.serviceRequests || [], mContext);
                aBlocks = filterBlocks(mRaw.blocks || [], mContext);
                oBlockIds = new Set(aBlocks.map(function (oBlock) { return String(oBlock.BlockId); }));
                aBlockOrders = (mRaw.blockOrders || []).filter(function (oBlockOrder) {
                    return (oBlockIds.size === 0 || oBlockIds.has(String(oBlockOrder.BlockId))) &&
                        oOrderIds.has(String(oBlockOrder.OrderId)) && !oBlockOrder.ImpactEndAt;
                });
                aResources = filterResources(mRaw.resources || [], mContext);
                mRaw.assignments = (mRaw.assignments || []).filter(function (oAssignment) {
                    return oOrderIds.has(String(oAssignment.OrderId));
                });
                aOperations = (mRaw.operations || []).filter(function (oOperation) {
                    return oOrderIds.has(String(oOperation.OrderId));
                });
                aConfirmations = (mRaw.confirmations || []).filter(function (oConfirmation) {
                    return oOrderIds.has(String(oConfirmation.OrderId)) &&
                        isWithinRange(oConfirmation.ActualStartDate, mContext.startDate, mContext.endDate);
                });

                oDashboard = DashboardMapper.buildDashboard({
                    orders: aOrders,
                    causes: aCauses,
                    materials: aMaterials,
                    movements: aMovements,
                    serviceRequests: aRequests,
                    blocks: aBlocks,
                    blockOrders: aBlockOrders,
                    catalogs: mRaw.catalogs || [],
                    resources: aResources,
                    assignments: mRaw.assignments,
                    operations: aOperations,
                    confirmations: aConfirmations,
                    allOrders: aRawOrders,
                    allResources: mRaw.resources || [],
                    range: { startDate: mContext.startDate, endDate: mContext.endDate }
                });
                oDashboard.meta = {
                    source: "BTP_DESTINATION_ODATA_V2",
                    destination: "QAS_MITSU_DASH",
                    servicePath: "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV/",
                    ordersFilter: sOrderFilter,
                    generatedAt: new Date().toISOString(),
                    dataQuality: analyzeOrderData(aOrders),
                    unavailableEntitySets: mRaw.warnings,
                    records: {
                        orders: aOrders.length,
                        causes: aCauses.length,
                        materials: aMaterials.length,
                        movements: aMovements.length,
                        serviceRequests: aRequests.length,
                        blocks: aBlocks.length,
                        blockOrders: aBlockOrders.length,
                        resources: aResources.length,
                        assignments: mRaw.assignments.length,
                        operations: aOperations.length,
                        confirmations: aConfirmations.length
                    }
                };
                return oDashboard;
            });
        });
    }

    return {
        load: load,
        createEmpty: createEmpty,
        buildOrdersFilter: buildOrdersFilter,
        getFilterContext: getFilterContext,
        canonicalStatus: canonicalStatus
    };
});
