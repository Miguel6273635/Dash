sap.ui.define([], function () {
    "use strict";

    var REPAIR_ORDER_TYPE = "SM01";
    var ANALYSIS_PLANNED = "PLANNED";
    var ANALYSIS_EXECUTED = "EXECUTED";
    var ANALYSIS_NON_EXECUTED = "NON_EXECUTED";
    var EXECUTED_CODES = ["E0015", "0300"];
    var NON_EXECUTED_CODES = ["E0013", "E0014", "0100", "0200"];
    var ALL_ZONES = "TODAS";
    var ALL_VALUES = "TODOS";

    function asArray(vValue) {
        return Array.isArray(vValue) ? vValue : [];
    }

    function normalize(vValue) {
        return String(vValue || "").trim().toUpperCase();
    }

    function canonicalOrderId(vValue) {
        var sValue = String(vValue || "").trim();

        if (/^\d+$/.test(sValue)) {
            return sValue.replace(/^0+(?=\d)/, "");
        }
        return normalize(sValue);
    }

    function hasFilterValue(vValue) {
        var sValue = normalize(vValue);

        return Boolean(sValue) && ["TODOS", "TODAS", "ALL", "NULL"].indexOf(sValue) < 0;
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(normalize(vValue)) >= 0;
    }

    function isFalse(vValue) {
        return vValue === false || ["FALSE", "0", "NO", ""].indexOf(normalize(vValue)) >= 0;
    }

    function parseDate(vValue) {
        var aMatch;
        var oDate;
        var sValue;

        if (!vValue) {
            return null;
        }
        if (vValue instanceof Date) {
            oDate = new Date(vValue.getTime());
        } else {
            sValue = String(vValue).trim();
            aMatch = sValue.match(/\/Date\((-?\d+)/);
            if (aMatch) {
                oDate = new Date(Number(aMatch[1]));
            } else {
                aMatch = sValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
                if (aMatch) {
                    oDate = new Date(Number(aMatch[3]), Number(aMatch[2]) - 1, Number(aMatch[1]));
                } else {
                    aMatch = sValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
                    oDate = aMatch
                        ? new Date(Number(aMatch[1]), Number(aMatch[2]) - 1, Number(aMatch[3]))
                        : new Date(sValue);
                }
            }
        }
        if (!oDate || Number.isNaN(oDate.getTime())) {
            return null;
        }
        if (oDate.getUTCHours() === 0 && oDate.getUTCMinutes() === 0 && oDate.getUTCSeconds() === 0) {
            oDate = new Date(oDate.getUTCFullYear(), oDate.getUTCMonth(), oDate.getUTCDate());
        }
        return oDate.getFullYear() >= 1900 ? oDate : null;
    }

    function formatDate(vValue) {
        var oDate = parseDate(vValue);

        if (!oDate) {
            return "—";
        }
        return String(oDate.getDate()).padStart(2, "0") + "/" +
            String(oDate.getMonth() + 1).padStart(2, "0") + "/" + oDate.getFullYear();
    }

    function isWithinRange(vValue, oStartDate, oEndExclusive) {
        var oDate = parseDate(vValue);

        return Boolean(oDate) &&
            (!oStartDate || oDate >= oStartDate) &&
            (!oEndExclusive || oDate < oEndExclusive);
    }

    function uniqueBy(aItems, sProperty) {
        var mItems = new Map();

        asArray(aItems).forEach(function (oItem) {
            var sKey = String(oItem && oItem[sProperty] || "");

            if (sKey && !mItems.has(sKey)) {
                mItems.set(sKey, oItem);
            }
        });
        return Array.from(mItems.values());
    }

    function buildIndex(aItems, sProperty, fnNormalizeKey) {
        var mIndex = new Map();

        asArray(aItems).forEach(function (oItem) {
            var vKey = oItem && oItem[sProperty];
            var sKey = fnNormalizeKey ? fnNormalizeKey(vKey) : String(vKey || "");
            var aValues;

            if (!sKey) {
                return;
            }
            aValues = mIndex.get(sKey) || [];
            aValues.push(oItem);
            mIndex.set(sKey, aValues);
        });
        return mIndex;
    }

    function eventIsActive(oEvent) {
        return oEvent && (oEvent.StatusInactive === undefined ||
            oEvent.StatusInactive === null || isFalse(oEvent.StatusInactive));
    }

    function eventTimestamp(oEvent) {
        var oDate = parseDate(oEvent && oEvent.EventAt);

        return oDate ? oDate.getTime() : 0;
    }

    function eventHasCode(oEvent, aCodes) {
        return [oEvent && oEvent.SapStatusCode, oEvent && oEvent.AppStatusCode].some(function (sCode) {
            return aCodes.indexOf(normalize(sCode)) >= 0;
        });
    }

    function orderHasCode(oOrder, aCodes) {
        return [oOrder && oOrder.SapUserStatusCode, oOrder && oOrder.AppStatusCode].some(function (sCode) {
            return aCodes.indexOf(normalize(sCode)) >= 0;
        });
    }

    function classifyOrder(oOrder, aEvents) {
        var aActiveEvents = asArray(aEvents).filter(eventIsActive).sort(function (oLeft, oRight) {
            return eventTimestamp(oRight) - eventTimestamp(oLeft) ||
                String(oRight.ChangeNumber || "").localeCompare(String(oLeft.ChangeNumber || ""));
        });
        var oExecutedEvent = aActiveEvents.find(function (oEvent) {
            return eventHasCode(oEvent, EXECUTED_CODES);
        });
        var oNonExecutedEvent;
        var oLatestEvent = aActiveEvents[0] || null;
        var sCode;

        if (oExecutedEvent || orderHasCode(oOrder, EXECUTED_CODES)) {
            sCode = normalize(oExecutedEvent &&
                (oExecutedEvent.SapStatusCode || oExecutedEvent.AppStatusCode) ||
                oOrder.SapUserStatusCode || oOrder.AppStatusCode);
            return {
                key: ANALYSIS_EXECUTED,
                text: "Ejecutada",
                state: "Success",
                icon: "sap-icon://sys-enter-2",
                code: sCode,
                executionDate: oExecutedEvent && oExecutedEvent.EventAt || oOrder.FechaInicioReal || null
            };
        }

        oNonExecutedEvent = aActiveEvents.find(function (oEvent) {
            return eventHasCode(oEvent, NON_EXECUTED_CODES);
        });
        if (oNonExecutedEvent || orderHasCode(oOrder, NON_EXECUTED_CODES)) {
            sCode = normalize(oNonExecutedEvent &&
                (oNonExecutedEvent.SapStatusCode || oNonExecutedEvent.AppStatusCode) ||
                oOrder.SapUserStatusCode || oOrder.AppStatusCode);
            return {
                key: ANALYSIS_NON_EXECUTED,
                text: "No ejecutada",
                state: "Error",
                icon: "sap-icon://decline",
                code: sCode,
                executionDate: null
            };
        }

        sCode = normalize(oLatestEvent &&
            (oLatestEvent.SapStatusCode || oLatestEvent.AppStatusCode) ||
            oOrder.SapUserStatusCode || oOrder.AppStatusCode);
        return {
            key: "UNCLASSIFIED",
            text: sCode ? "Sin clasificar (" + sCode + ")" : "Sin clasificar",
            state: "Warning",
            icon: "",
            code: sCode,
            executionDate: null
        };
    }

    function materialIsPublishable(oMaterial) {
        var sValidation = normalize(oMaterial && oMaterial.DataValidationStatusCode);

        return oMaterial && !isFalse(oMaterial.IsPublishable) &&
            ["INVALID", "REJECTED", "ERROR"].indexOf(sValidation) < 0;
    }

    function reservationRank(oMaterial) {
        var iReservationItem = Number(oMaterial && oMaterial.ReservationItem);

        return Number.isFinite(iReservationItem) ? iReservationItem : Number.MAX_SAFE_INTEGER;
    }

    function selectMainMaterial(aMaterials) {
        var aPublishable = asArray(aMaterials).filter(materialIsPublishable);
        var aPrimary = aPublishable.filter(function (oMaterial) {
            return isTrue(oMaterial.IsPrimary);
        });
        var aCandidates = aPrimary.length ? aPrimary : aPublishable;
        var oSelected = aCandidates.sort(function (oLeft, oRight) {
            var iReservationDifference = reservationRank(oLeft) - reservationRank(oRight);
            var oLeftDate = parseDate(oLeft.RequiredDate);
            var oRightDate = parseDate(oRight.RequiredDate);

            return iReservationDifference ||
                (oLeftDate ? oLeftDate.getTime() : Number.MAX_SAFE_INTEGER) -
                    (oRightDate ? oRightDate.getTime() : Number.MAX_SAFE_INTEGER) ||
                String(oLeft.MaterialRequirementId || oLeft.MaterialId || "").localeCompare(
                    String(oRight.MaterialRequirementId || oRight.MaterialId || "")
                );
        })[0] || null;

        return {
            material: oSelected,
            publishableCount: aPublishable.length,
            usedFallback: aPublishable.length > 1 && aPrimary.length === 0
        };
    }

    function assignmentRank(oAssignment) {
        var sType = normalize(oAssignment && oAssignment.AssignmentTypeCode);
        var sRole = normalize(oAssignment && oAssignment.RoleCode);
        var iType = sType === "EXECUTOR" ? 0 : sType === "PLANNED" ? 1 : 2;
        var iRole = sRole === "RESPONSIBLE" ? 0 : sRole === "MECHANIC" ? 1 : 2;

        return iType * 10 + iRole;
    }

    function selectAssignment(aAssignments) {
        return asArray(aAssignments).filter(function (oAssignment) {
            return Boolean(oAssignment && (oAssignment.ResourceId || oAssignment.PersonnelNumber));
        }).sort(function (oLeft, oRight) {
            return assignmentRank(oLeft) - assignmentRank(oRight) ||
                String(oLeft.OrderResourceId || "").localeCompare(String(oRight.OrderResourceId || ""));
        })[0] || null;
    }

    function selectResource(aResources, oReferenceDate) {
        var iReference = oReferenceDate ? oReferenceDate.getTime() : 0;

        return asArray(aResources).sort(function (oLeft, oRight) {
            var oLeftDate = parseDate(oLeft.WorkDate);
            var oRightDate = parseDate(oRight.WorkDate);
            var iLeftDistance = oLeftDate && iReference
                ? Math.abs(oLeftDate.getTime() - iReference)
                : Number.MAX_SAFE_INTEGER;
            var iRightDistance = oRightDate && iReference
                ? Math.abs(oRightDate.getTime() - iReference)
                : Number.MAX_SAFE_INTEGER;

            return iLeftDistance - iRightDistance;
        })[0] || null;
    }

    function enrichOrders(oRawData) {
        var mEventsByOrder = buildIndex(oRawData.events, "OrderId", canonicalOrderId);
        var mMaterialsByOrder = buildIndex(oRawData.materials, "OrderId", canonicalOrderId);
        var mAssignmentsByOrder = buildIndex(oRawData.assignments, "OrderId", canonicalOrderId);
        var mResourcesById = buildIndex(oRawData.resources, "ResourceId");
        var oQuality = {
            ordersWithoutStatus: 0,
            ordersWithoutMaterial: 0,
            ordersWithSeveralMaterials: 0,
            ordersUsingMaterialFallback: 0
        };
        var aOrders = uniqueBy(oRawData.orders, "OrderId").map(function (oOrder) {
            var sOrderId = canonicalOrderId(oOrder.OrderId);
            var oClassification = classifyOrder(oOrder, mEventsByOrder.get(sOrderId));
            var oMaterialSelection = selectMainMaterial(mMaterialsByOrder.get(sOrderId));
            var oMaterial = oMaterialSelection.material;
            var oAssignment = selectAssignment(mAssignmentsByOrder.get(sOrderId));
            var sResourceId = String(oAssignment && oAssignment.ResourceId || oOrder.Mecanico || "");
            var oReferenceDate = parseDate(oOrder.PlannedStartDate);
            var oResource = selectResource(mResourcesById.get(sResourceId), oReferenceDate) || {};

            if (oClassification.key === "UNCLASSIFIED") {
                oQuality.ordersWithoutStatus += 1;
            }
            if (!oMaterial) {
                oQuality.ordersWithoutMaterial += 1;
            }
            if (oMaterialSelection.publishableCount > 1) {
                oQuality.ordersWithSeveralMaterials += 1;
            }
            if (oMaterialSelection.usedFallback) {
                oQuality.ordersUsingMaterialFallback += 1;
            }

            return Object.assign({}, oOrder, {
                _classification: oClassification,
                _material: oMaterial,
                _materialId: String(oMaterial && oMaterial.MaterialId || "SIN_MATERIAL"),
                _materialName: oMaterial &&
                    (oMaterial.MaterialName || oMaterial.MaterialId) || "Sin material asociado",
                _materialCategory: oMaterial &&
                    (oMaterial.MaterialCategoryCode || oMaterial.MaterialCategoryName) || "",
                _responsibleId: sResourceId || String(oOrder.SupervisorId || ""),
                _responsibleName: oResource.ResourceName ||
                    oAssignment && (oAssignment.PersonnelNumber || oAssignment.ResourceId) ||
                    oOrder.Mecanico || oOrder.SupervisorId || "Sin responsable",
                _zoneId: String(oResource.ZoneId || oOrder.Zona || ""),
                _zoneName: oResource.ZoneName || oResource.ZoneId || oOrder.Zona || "Sin zona"
            });
        });

        return { orders: aOrders, quality: oQuality };
    }

    function matches(aValues, vExpected) {
        return !hasFilterValue(vExpected) || asArray(aValues).some(function (vValue) {
            return normalize(vValue) === normalize(vExpected);
        });
    }

    function filterOrders(aOrders, mFilters, oRange) {
        return asArray(aOrders).filter(function (oOrder) {
            return normalize(oOrder.OrderTypeCode) === REPAIR_ORDER_TYPE &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endExclusive) &&
                matches([oOrder._zoneId, oOrder._zoneName], mFilters.zona) &&
                matches([oOrder.CustomerId, oOrder.CustomerName], mFilters.cliente) &&
                matches([oOrder._responsibleId, oOrder._responsibleName, oOrder.Mecanico], mFilters.responsable);
        });
    }

    function percentage(iNumerator, iDenominator) {
        return iDenominator > 0 ? iNumerator / iDenominator * 100 : null;
    }

    function formatPercentage(iValue, sEmptyText) {
        if (!Number.isFinite(iValue)) {
            return sEmptyText || "Sin datos";
        }
        return iValue.toFixed(1).replace(".0", "") + "%";
    }

    function complianceState(iValue) {
        if (!Number.isFinite(iValue)) {
            return "None";
        }
        if (iValue >= 93) {
            return "Success";
        }
        if (iValue >= 85) {
            return "Warning";
        }
        return "Error";
    }

    function materialIcon(oOrder) {
        var sCategory = normalize(oOrder && oOrder._materialCategory);

        if (sCategory.indexOf("ELECT") >= 0) {
            return "sap-icon://it-system";
        }
        if (sCategory.indexOf("LUBRIC") >= 0) {
            return "sap-icon://color-fill";
        }
        if (sCategory.indexOf("HERRAM") >= 0) {
            return "sap-icon://wrench";
        }
        return "sap-icon://product";
    }

    function orderMatchesAnalysis(oOrder, sAnalysis) {
        if (sAnalysis === ANALYSIS_EXECUTED) {
            return oOrder._classification.key === ANALYSIS_EXECUTED;
        }
        if (sAnalysis === ANALYSIS_NON_EXECUTED) {
            return oOrder._classification.key === ANALYSIS_NON_EXECUTED;
        }
        return true;
    }

    function buildOrderDetail(oOrder) {
        return {
            ot: oOrder.OrderId || "Sin OT",
            estado: oOrder._classification.text,
            estadoState: oOrder._classification.state,
            estadoIcon: oOrder._classification.icon,
            cliente: oOrder.CustomerName || oOrder.CustomerId || "Sin cliente",
            elevador: oOrder.EquipmentName || oOrder.EquipmentId || "Sin equipo",
            fechaProgramada: formatDate(oOrder.FechaInicioProg || oOrder.PlannedStartDate),
            fechaEjecucion: formatDate(
                oOrder._classification.executionDate || oOrder.FechaInicioReal
            ),
            responsable: oOrder._responsibleName,
            statusCode: oOrder._classification.code
        };
    }

    function buildMaterialRows(aOrders, sAnalysis, sSearch) {
        var mGroups = new Map();
        var iTotalPlanned = aOrders.length;

        aOrders.forEach(function (oOrder) {
            var sKey = oOrder._materialId + "|" + oOrder._materialName;
            var oGroup = mGroups.get(sKey) || {
                materialId: oOrder._materialId,
                material: oOrder._materialName,
                icon: materialIcon(oOrder),
                orders: []
            };

            oGroup.orders.push(oOrder);
            mGroups.set(sKey, oGroup);
        });

        return Array.from(mGroups.values()).map(function (oGroup) {
            var aExecuted = oGroup.orders.filter(function (oOrder) {
                return oOrder._classification.key === ANALYSIS_EXECUTED;
            });
            var aNonExecuted = oGroup.orders.filter(function (oOrder) {
                return oOrder._classification.key === ANALYSIS_NON_EXECUTED;
            });
            var aVisibleOrders = oGroup.orders.filter(function (oOrder) {
                return orderMatchesAnalysis(oOrder, sAnalysis);
            });
            var iPlanned = oGroup.orders.length;
            var iCompliance = percentage(aExecuted.length, iPlanned);
            var iParticipation = percentage(iPlanned, iTotalPlanned);

            return {
                materialId: oGroup.materialId,
                material: oGroup.material,
                icon: oGroup.icon,
                planeadas: iPlanned,
                ejecutadas: aExecuted.length,
                noEjecutadas: aNonExecuted.length,
                sinClasificar: iPlanned - aExecuted.length - aNonExecuted.length,
                cumplimiento: formatPercentage(iCompliance),
                cumplimientoValue: Number.isFinite(iCompliance) ? Number(iCompliance.toFixed(1)) : 0,
                cumplimientoState: complianceState(iCompliance),
                porcentajeTotal: formatPercentage(iParticipation, "0%"),
                expanded: false,
                chevronIcon: "sap-icon://navigation-right-arrow",
                ordenes: aVisibleOrders.map(buildOrderDetail),
                _visibleCount: aVisibleOrders.length
            };
        }).filter(function (oRow) {
            var sNeedle = normalize(sSearch);
            var bMatchesSearch = !sNeedle ||
                normalize(oRow.material).indexOf(sNeedle) >= 0 ||
                normalize(oRow.materialId).indexOf(sNeedle) >= 0;

            return oRow._visibleCount > 0 && bMatchesSearch;
        }).sort(function (oLeft, oRight) {
            return oRight.planeadas - oLeft.planeadas ||
                oLeft.material.localeCompare(oRight.material, "es");
        }).map(function (oRow, iIndex) {
            delete oRow._visibleCount;
            oRow.expanded = iIndex === 0;
            oRow.chevronIcon = oRow.expanded
                ? "sap-icon://navigation-down-arrow"
                : "sap-icon://navigation-right-arrow";
            return oRow;
        });
    }

    function optionList(aOrders, aKeyProperties, aTextProperties, sAllKey, sAllText) {
        var mOptions = new Map();

        aOrders.forEach(function (oOrder) {
            var sKey = "";
            var sText = "";

            aKeyProperties.some(function (sProperty) {
                if (oOrder[sProperty]) {
                    sKey = String(oOrder[sProperty]);
                    return true;
                }
                return false;
            });
            aTextProperties.some(function (sProperty) {
                if (oOrder[sProperty]) {
                    sText = String(oOrder[sProperty]);
                    return true;
                }
                return false;
            });
            if (sKey && !mOptions.has(sKey)) {
                mOptions.set(sKey, { key: sKey, text: sText || sKey });
            }
        });

        return [{ key: sAllKey, text: sAllText }].concat(
            Array.from(mOptions.values()).sort(function (oLeft, oRight) {
                return oLeft.text.localeCompare(oRight.text, "es");
            })
        );
    }

    function buildCatalogs(aOrders) {
        var iCurrentYear = new Date().getFullYear();
        var aPeriods = [];
        var iYear;

        for (iYear = iCurrentYear; iYear >= iCurrentYear - 5; iYear -= 1) {
            aPeriods.push({
                key: "ANUAL_" + iYear,
                text: "Año " + iYear
            });
        }

        return {
            periodos: aPeriods,
            zonas: optionList(aOrders, ["_zoneId", "_zoneName"], ["_zoneName", "_zoneId"], ALL_ZONES, "Todas"),
            clientes: optionList(aOrders, ["CustomerId", "CustomerName"], ["CustomerName", "CustomerId"], ALL_VALUES, "Todos"),
            responsables: optionList(
                aOrders,
                ["_responsibleId", "_responsibleName"],
                ["_responsibleName", "_responsibleId"],
                ALL_VALUES,
                "Todos"
            )
        };
    }

    function buildData(oRawData, mFilters, sAnalysis) {
        var oRaw = oRawData || {};
        var oRange = oRaw.range || {};
        var mSelectedFilters = Object.assign({
            periodo: "ANUAL_2026",
            fechaDesde: "01/01/2026",
            fechaHasta: "31/12/2026",
            zona: ALL_ZONES,
            cliente: ALL_VALUES,
            responsable: ALL_VALUES,
            busquedaMaterial: ""
        }, mFilters || {});
        var sSelectedAnalysis = [ANALYSIS_PLANNED, ANALYSIS_EXECUTED, ANALYSIS_NON_EXECUTED]
            .indexOf(sAnalysis) >= 0 ? sAnalysis : ANALYSIS_PLANNED;
        var oEnriched = enrichOrders(oRaw);
        var aRepairOrders = oEnriched.orders.filter(function (oOrder) {
            return normalize(oOrder.OrderTypeCode) === REPAIR_ORDER_TYPE &&
                isWithinRange(oOrder.PlannedStartDate, oRange.startDate, oRange.endExclusive);
        });
        var aFiltered = filterOrders(oEnriched.orders, mSelectedFilters, oRange);
        var aExecuted = aFiltered.filter(function (oOrder) {
            return oOrder._classification.key === ANALYSIS_EXECUTED;
        });
        var aNonExecuted = aFiltered.filter(function (oOrder) {
            return oOrder._classification.key === ANALYSIS_NON_EXECUTED;
        });
        var iUnclassified = aFiltered.length - aExecuted.length - aNonExecuted.length;
        var iCompliance = percentage(aExecuted.length, aFiltered.length);
        var iNonExecutedPercentage = percentage(aNonExecuted.length, aFiltered.length);
        var bDetailsLoaded = Boolean(oRaw.meta && oRaw.meta.detailsLoaded);
        var aMaterials = buildMaterialRows(
            aFiltered,
            sSelectedAnalysis,
            mSelectedFilters.busquedaMaterial
        );
        var iVisibleOrders = sSelectedAnalysis === ANALYSIS_EXECUTED
            ? aExecuted.length
            : sSelectedAnalysis === ANALYSIS_NON_EXECUTED
                ? aNonExecuted.length
                : aFiltered.length;
        var sAnalysisText = sSelectedAnalysis === ANALYSIS_EXECUTED
            ? "ejecutadas"
            : sSelectedAnalysis === ANALYSIS_NON_EXECUTED
                ? "no ejecutadas"
                : "planeadas";
        var aWarnings = [];

        if (bDetailsLoaded && iUnclassified > 0) {
            aWarnings.push(iUnclassified + " órdenes no tienen un estado aprobado");
        }
        if (oEnriched.quality.ordersWithoutMaterial > 0 && oRaw.meta && oRaw.meta.detailsLoaded) {
            aWarnings.push(oEnriched.quality.ordersWithoutMaterial + " órdenes no tienen material publicable");
        }
        if (oEnriched.quality.ordersUsingMaterialFallback > 0) {
            aWarnings.push(
                oEnriched.quality.ordersUsingMaterialFallback +
                " órdenes tienen varios materiales y usan la primera posición como regla temporal"
            );
        }

        return {
            periodo: {
                fechaCorte: formatDate(oRange.endDate || mSelectedFilters.fechaHasta)
            },
            filters: mSelectedFilters,
            searchQuery: mSelectedFilters.busquedaMaterial,
            ui: {
                selectedAnalysis: sSelectedAnalysis,
                detailsLoaded: bDetailsLoaded,
                enrichmentLoaded: Boolean(oRaw.meta && oRaw.meta.enrichmentLoaded),
                errorMessage: ""
            },
            kpis: {
                planeadas: aFiltered.length,
                ejecutadas: bDetailsLoaded ? aExecuted.length : "…",
                noEjecutadas: bDetailsLoaded ? aNonExecuted.length : "…",
                sinClasificar: bDetailsLoaded ? iUnclassified : "…",
                cumplimiento: bDetailsLoaded ? formatPercentage(iCompliance) : "Cargando",
                resumen: bDetailsLoaded
                    ? aExecuted.length + " de " + aFiltered.length + " OT"
                    : "Esperando eventos",
                ejecutadasSub: bDetailsLoaded
                    ? formatPercentage(iCompliance, "0%") + " del total"
                    : "Consultando SAP",
                noEjecutadasSub: bDetailsLoaded
                    ? formatPercentage(iNonExecutedPercentage, "0%") + " del total planeado"
                    : "Consultando SAP"
            },
            tabs: {
                planeadas: "Planeadas (" + aFiltered.length + ")",
                ejecutadas: "Ejecutadas (" + (bDetailsLoaded ? aExecuted.length : "…") + ")",
                noEjecutadas: "No ejecutadas (" + (bDetailsLoaded ? aNonExecuted.length : "…") + ")"
            },
            infoMessage: bDetailsLoaded
                ? "Mostrando " + iVisibleOrders + " reparaciones " + sAnalysisText +
                    (iUnclassified ? ". " + iUnclassified + " sin clasificar" : "")
                : "Cargando eventos y materiales desde SAP…",
            materiales: bDetailsLoaded ? aMaterials : [],
            total: {
                planeadas: aFiltered.length,
                ejecutadas: bDetailsLoaded ? aExecuted.length : "…",
                noEjecutadas: bDetailsLoaded ? aNonExecuted.length : "…",
                sinClasificar: bDetailsLoaded ? iUnclassified : "…",
                cumplimiento: bDetailsLoaded ? formatPercentage(iCompliance) : "Cargando",
                cumplimientoValue: bDetailsLoaded && Number.isFinite(iCompliance)
                    ? Number(iCompliance.toFixed(1))
                    : 0,
                porcentajeTotal: aFiltered.length ? "100%" : "0%"
            },
            catalogos: buildCatalogs(aRepairOrders),
            meta: {
                orderType: REPAIR_ORDER_TYPE,
                records: Object.assign({}, oRaw.meta && oRaw.meta.records || {}),
                unavailableEntitySets: asArray(oRaw.meta && oRaw.meta.unavailableEntitySets),
                dataQuality: oEnriched.quality,
                warnings: aWarnings
            }
        };
    }

    return {
        buildData: buildData,
        parseDate: parseDate,
        classifyOrder: classifyOrder,
        selectMainMaterial: selectMainMaterial,
        constants: {
            orderType: REPAIR_ORDER_TYPE,
            planned: ANALYSIS_PLANNED,
            executed: ANALYSIS_EXECUTED,
            nonExecuted: ANALYSIS_NON_EXECUTED
        }
    };
});
