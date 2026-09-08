sap.ui.define([
    "mantenimiento/model/DashboardDataService"
], function (DashboardDataService) {
    "use strict";

    /*
     * ViewModel de Análisis de Elevadores con Desviación.
     * No añade campos a ABAP: OTAfectadas, BrechaOT, Estado y paginación se
     * derivan de los cinco EntitySets descritos en la especificación.
     */
    var OFFICIAL_ORDER_TYPES = ["SM01", "SM02", "SM03"];
    var AFFECTED_STATUSES = ["E0013", "E0014"];
    var ALL_ZONES = "TODAS";
    var ALL_VALUES = "TODOS";

    function asArray(vValue) {
        return Array.isArray(vValue) ? vValue : [];
    }

    function normalize(vValue) {
        return String(vValue || "").trim().toUpperCase();
    }

    function normalizeComparable(vValue) {
        var sText = normalize(vValue);

        return sText.normalize ?
            sText.normalize("NFD").replace(/[\u0300-\u036f]/g, "") :
            sText;
    }

    function isTrue(vValue) {
        return vValue === true || ["TRUE", "X", "1", "SI", "SÍ"].indexOf(normalize(vValue)) >= 0;
    }

    function isFalse(vValue) {
        return vValue === false || ["FALSE", "0", "NO"].indexOf(normalize(vValue)) >= 0;
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
        aMatch = String(vValue).match(/\/Date\((-?\d+)/);
        oDate = aMatch ? new Date(Number(aMatch[1])) : new Date(vValue);
        if (Number.isNaN(oDate.getTime())) {
            return null;
        }
        /*
         * Una fecha Edm.DateTime a medianoche UTC es una fecha SAP, no una
         * fecha que deba desplazarse por la zona horaria del navegador.
         */
        if (oDate.getUTCHours() === 0 && oDate.getUTCMinutes() === 0 &&
            oDate.getUTCSeconds() === 0) {
            return new Date(
                oDate.getUTCFullYear(),
                oDate.getUTCMonth(),
                oDate.getUTCDate()
            );
        }
        return oDate;
    }

    function isWithinRange(vValue, oStartDate, oEndDate) {
        var oDate = parseDate(vValue);

        return Boolean(oDate) &&
            (!oStartDate || oDate >= oStartDate) &&
            (!oEndDate || oDate <= oEndDate);
    }

    function isActive(oRecord, oReferenceDate) {
        var oFrom = parseDate(oRecord && oRecord.ValidFrom);
        var oTo = parseDate(oRecord && oRecord.ValidTo);

        return (!oFrom || !oReferenceDate || oFrom <= oReferenceDate) &&
            (!oTo || !oReferenceDate || oTo >= oReferenceDate);
    }

    function equalsFilter(vActual, vSelected) {
        var sSelected = normalizeComparable(vSelected);
        var sActual = normalizeComparable(vActual);

        return !sSelected || ["TODAS", "TODOS", "ALL"].indexOf(sSelected) >= 0 ||
            sActual === sSelected;
    }

    function orderIsAffected(oOrder) {
        /*
         * Regla de esta pantalla: únicamente E0013/0100 y E0014/0200 son
         * desviación. E0016-E0019 requieren una regla funcional específica,
         * por lo que no se mezclan automáticamente aquí.
         */
        return AFFECTED_STATUSES.indexOf(
            DashboardDataService.canonicalStatus(oOrder)
        ) >= 0;
    }

    function assignmentRank(oAssignment) {
        var sRole = normalize(oAssignment && oAssignment.RoleCode);
        var sType = normalize(oAssignment && oAssignment.AssignmentTypeCode);
        var iRole = sRole === "LEAD_MECHANIC" || sRole === "MAIN_MECHANIC" ? 0 :
            sRole === "MECHANIC" ? 1 :
            sRole === "RESPONSIBLE" ? 2 : 3;

        return iRole * 10 + (
            sType === "PLANNED" || sType === "PRIMARY" ? 0 : 1
        );
    }

    function buildAssignmentsByOrder(aAssignments) {
        var mByOrder = new Map();

        asArray(aAssignments).forEach(function (oAssignment) {
            var sOrderId = String(oAssignment && oAssignment.OrderId || "");
            var aItems;

            if (!sOrderId || !oAssignment.ResourceId) {
                return;
            }
            aItems = mByOrder.get(sOrderId) || [];
            aItems.push(oAssignment);
            mByOrder.set(sOrderId, aItems);
        });
        return mByOrder;
    }

    function selectAssignment(aAssignments, vReferenceDate) {
        var oReferenceDate = parseDate(vReferenceDate);
        var aActive = asArray(aAssignments).filter(function (oAssignment) {
            return isActive(oAssignment, oReferenceDate);
        });

        return (aActive.length ? aActive : asArray(aAssignments)).slice().sort(
            function (oLeft, oRight) {
                return assignmentRank(oLeft) - assignmentRank(oRight) ||
                    String(oLeft.ResourceId || "").localeCompare(
                        String(oRight.ResourceId || ""), "es"
                    );
            }
        )[0] || null;
    }

    function buildResourcesById(aResources) {
        var mByResource = new Map();

        asArray(aResources).forEach(function (oResource) {
            var sResourceId = String(oResource && oResource.ResourceId || "");
            var aItems;

            if (!sResourceId) {
                return;
            }
            aItems = mByResource.get(sResourceId) || [];
            aItems.push(oResource);
            mByResource.set(sResourceId, aItems);
        });
        return mByResource;
    }

    function nearestResource(aResources, vReferenceDate) {
        var oReferenceDate = parseDate(vReferenceDate) || new Date(0);

        return asArray(aResources).slice().sort(function (oLeft, oRight) {
            var iLeft = Math.abs(
                (parseDate(oLeft.WorkDate) || new Date(0)).getTime() -
                oReferenceDate.getTime()
            );
            var iRight = Math.abs(
                (parseDate(oRight.WorkDate) || new Date(0)).getTime() -
                oReferenceDate.getTime()
            );

            return iLeft - iRight;
        })[0] || {};
    }

    function isNonExecutionContext(oCause) {
        var sContext = normalizeComparable(oCause && oCause.CauseContextCode);

        return [
            "NON_EXECUTION",
            "NO_EJECUCION",
            "NO_EJECUTADA",
            "NONEXECUTION"
        ].indexOf(sContext) >= 0;
    }

    function buildPrincipalCausesByOrder(aCauses, oReferenceDate) {
        var mByOrder = new Map();

        asArray(aCauses).filter(function (oCause) {
            return oCause && oCause.OrderId && isTrue(oCause.IsPrimary) &&
                isActive(oCause, oReferenceDate) && isNonExecutionContext(oCause);
        }).forEach(function (oCause) {
            var sOrderId = String(oCause.OrderId);
            var oCurrent = mByOrder.get(sOrderId);
            var oCurrentFrom = parseDate(oCurrent && oCurrent.ValidFrom);
            var oCandidateFrom = parseDate(oCause.ValidFrom);

            if (!oCurrent || (
                oCandidateFrom && (!oCurrentFrom || oCandidateFrom > oCurrentFrom)
            )) {
                mByOrder.set(sOrderId, oCause);
            }
        });
        return mByOrder;
    }

    function causeLabel(oCause) {
        return String(oCause && (oCause.CauseText || oCause.CauseCode) ||
            "Sin causa registrada");
    }

    function enrichOrders(oRawData) {
        var oRange = oRawData.range || {};
        var mAssignments = buildAssignmentsByOrder(oRawData.assignments);
        var mResources = buildResourcesById(oRawData.resources);

        return asArray(oRawData.orders).filter(function (oOrder) {
            return oOrder && oOrder.OrderId &&
                OFFICIAL_ORDER_TYPES.indexOf(normalize(oOrder.OrderTypeCode)) >= 0 &&
                isWithinRange(
                    oOrder.PlannedStartDate,
                    oRange.startDate,
                    oRange.endDate
                );
        }).map(function (oOrder) {
            var oAssignment = selectAssignment(
                mAssignments.get(String(oOrder.OrderId)),
                oOrder.PlannedStartDate
            );
            var oResource = oAssignment ? nearestResource(
                mResources.get(String(oAssignment.ResourceId)),
                oOrder.PlannedStartDate
            ) : {};

            return Object.assign({}, oOrder, {
                _zoneId: oResource.ZoneId || oOrder.Zona || "",
                _zoneName: oResource.ZoneName || oResource.ZoneId ||
                    oOrder.Zona || "Sin zona",
                _supervisorId: oResource.SupervisorId || oOrder.SupervisorId || "",
                _supervisorName: oResource.SupervisorName ||
                    oOrder.SupervisorName || oOrder.SupervisorId ||
                    "Sin supervisor asignado"
            });
        });
    }

    function filterOrders(aOrders, mFilters) {
        return asArray(aOrders).filter(function (oOrder) {
            return equalsFilter(oOrder._zoneId, mFilters.zona) ||
                equalsFilter(oOrder._zoneName, mFilters.zona);
        }).filter(function (oOrder) {
            return equalsFilter(oOrder._supervisorId, mFilters.supervisor) ||
                equalsFilter(oOrder._supervisorName, mFilters.supervisor);
        }).filter(function (oOrder) {
            return equalsFilter(oOrder.OrderTypeCode, mFilters.tipoOrden);
        });
    }

    function mostFrequent(aValues, sFallback) {
        var mCounts = new Map();

        asArray(aValues).forEach(function (vValue) {
            var sValue = String(vValue || "").trim();

            if (sValue) {
                mCounts.set(sValue, (mCounts.get(sValue) || 0) + 1);
            }
        });
        return Array.from(mCounts.entries()).sort(function (aLeft, aRight) {
            return aRight[1] - aLeft[1] || aLeft[0].localeCompare(aRight[0], "es");
        })[0] ? Array.from(mCounts.entries()).sort(function (aLeft, aRight) {
            return aRight[1] - aLeft[1] || aLeft[0].localeCompare(aRight[0], "es");
        })[0][0] : sFallback;
    }

    function buildElevators(aAffectedOrders, mCauses) {
        var mByEquipment = new Map();

        asArray(aAffectedOrders).forEach(function (oOrder) {
            var sEquipmentId = String(
                oOrder.EquipmentId || oOrder.EquipmentName || "SIN_EQUIPO"
            );
            var oGroup = mByEquipment.get(sEquipmentId) || {
                elevador: sEquipmentId,
                customerNames: [],
                zones: [],
                orders: [],
                causes: []
            };
            var oCause = mCauses.get(String(oOrder.OrderId));

            oGroup.orders.push(oOrder);
            oGroup.customerNames.push(
                oOrder.CustomerName || oOrder.CustomerId || "Sin cliente"
            );
            oGroup.zones.push(oOrder._zoneName || "Sin zona");
            oGroup.causes.push(causeLabel(oCause));
            mByEquipment.set(sEquipmentId, oGroup);
        });

        return Array.from(mByEquipment.values()).map(function (oGroup) {
            var iAffected = new Set(oGroup.orders.map(function (oOrder) {
                return String(oOrder.OrderId);
            })).size;

            return {
                elevador: oGroup.elevador,
                cliente: mostFrequent(oGroup.customerNames, "Sin cliente"),
                zona: mostFrequent(oGroup.zones, "Sin zona"),
                causa: mostFrequent(oGroup.causes, "Sin causa registrada"),
                otAfectadas: iAffected,
                brecha: "-" + iAffected,
                /*
                 * El contrato no define umbrales para Crítico/Alto/Medio/Bajo.
                 * Se conserva un valor neutral hasta recibir la regla oficial.
                 */
                estado: "Sin clasificar"
            };
        }).sort(function (oLeft, oRight) {
            return oRight.otAfectadas - oLeft.otAfectadas ||
                oLeft.elevador.localeCompare(oRight.elevador, "es");
        });
    }

    function uniqueOptions(aItems, sAllKey, sAllText) {
        var mByKey = new Map();

        asArray(aItems).forEach(function (oItem) {
            var sKey = String(oItem && oItem.key || "").trim();

            if (sKey) {
                mByKey.set(sKey, {
                    key: sKey,
                    text: String(oItem.text || sKey)
                });
            }
        });
        return [{ key: sAllKey, text: sAllText }].concat(
            Array.from(mByKey.values()).sort(function (oLeft, oRight) {
                return oLeft.text.localeCompare(oRight.text, "es");
            })
        );
    }

    function activeCatalogOptions(aCatalogs, aDomains, sAllKey, sAllText, oCutoff) {
        var aDomainsNormalized = aDomains.map(normalize);

        return uniqueOptions(asArray(aCatalogs).filter(function (oCatalog) {
            return oCatalog && oCatalog.ValueId && !isFalse(oCatalog.Active) &&
                aDomainsNormalized.indexOf(normalize(oCatalog.FilterDomain)) >= 0 &&
                isActive(oCatalog, oCutoff);
        }).sort(function (oLeft, oRight) {
            return Number(oLeft.SortOrder || 0) - Number(oRight.SortOrder || 0);
        }).map(function (oCatalog) {
            return {
                key: String(oCatalog.ValueId),
                text: String(oCatalog.ValueText || oCatalog.ValueId)
            };
        }), sAllKey, sAllText);
    }

    function optionsFromOrders(aOrders, sKey, sText, sAllKey, sAllText) {
        return uniqueOptions(asArray(aOrders).map(function (oOrder) {
            return {
                key: oOrder[sKey],
                text: oOrder[sText] || oOrder[sKey]
            };
        }), sAllKey, sAllText);
    }

    function chooseOptions(aCatalogOptions, aOrderOptions) {
        return aCatalogOptions.length > 1 ? aCatalogOptions : aOrderOptions;
    }

    function buildPeriods(aOrders, mFilters, oRange) {
        var mYears = new Map();

        /*
         * El catálogo visual del dashboard maneja años completos. Se incluyen
         * los años del alcance actual y se agregan los que lleguen en SAP; al
         * elegir uno, el controlador vuelve a consultar enero–diciembre.
         */
        ["2024", "2025", "2026"].forEach(function (sYear) {
            mYears.set(sYear, true);
        });
        asArray(aOrders).forEach(function (oOrder) {
            var oDate = parseDate(oOrder.PlannedStartDate);

            if (oDate) {
                mYears.set(String(oDate.getFullYear()), true);
            }
        });
        if (oRange.startDate) {
            mYears.set(String(oRange.startDate.getFullYear()), true);
        }
        if (/^\d{4}$/.test(String(mFilters.periodo || ""))) {
            mYears.set(String(mFilters.periodo), true);
        }
        return Array.from(mYears.keys()).sort().map(function (sYear) {
            return { key: sYear, text: sYear + " (Anual)" };
        });
    }

    function buildData(oRawData, mFilters) {
        var oRaw = oRawData || {};
        var oRange = oRaw.range || {};
        var mValues = Object.assign({
            periodo: "2026",
            fechaDesde: "03/08/2026", //cambio para pruebas de navegacion Tania 08/09/2026
            fechaHasta: "07/08/2026",
            zona: ALL_ZONES,
            supervisor: ALL_VALUES,
            tipoOrden: ALL_VALUES
        }, mFilters || {});
        var aEnriched = enrichOrders(oRaw);
        var aOrders = filterOrders(aEnriched, mValues);
        var aAffected = aOrders.filter(orderIsAffected);
        var mCauses = buildPrincipalCausesByOrder(oRaw.causes, oRange.endDate);
        var aElevators = buildElevators(aAffected, mCauses);
        var aCatalogZones = activeCatalogOptions(
            oRaw.catalogs, ["ZONE"], ALL_ZONES, "Todas", oRange.endDate
        );
        var aCatalogSupervisors = activeCatalogOptions(
            oRaw.catalogs, ["SUPERVISOR"], ALL_VALUES, "Todos", oRange.endDate
        );
        var aCatalogTypes = activeCatalogOptions(
            oRaw.catalogs, ["ORDER_TYPE"], ALL_VALUES, "Todos", oRange.endDate
        );

        return {
            filters: Object.assign({}, mValues, {
                periodoTexto: String(mValues.periodo || "2026") + " (Anual)"
            }),
            opcionesPeriodo: buildPeriods(aEnriched, mValues, oRange),
            opcionesZona: chooseOptions(
                aCatalogZones,
                optionsFromOrders(aEnriched, "_zoneId", "_zoneName", ALL_ZONES, "Todas")
            ),
            opcionesSupervisor: chooseOptions(
                aCatalogSupervisors,
                optionsFromOrders(
                    aEnriched,
                    "_supervisorId",
                    "_supervisorName",
                    ALL_VALUES,
                    "Todos"
                )
            ),
            opcionesTipoOrden: chooseOptions(
                aCatalogTypes,
                optionsFromOrders(
                    aEnriched,
                    "OrderTypeCode",
                    "OrderTypeText",
                    ALL_VALUES,
                    "Todos"
                )
            ),
            kpis: {
                elevadores: String(aElevators.length),
                otAfectadas: String(aAffected.length),
                brecha: "-" + aAffected.length + " OT",
                criticos: "--",
                criticosDescripcion: "Umbral pendiente de definición funcional"
            },
            elevadores: aElevators,
            elevadoresVisibles: aElevators.slice(0, 5),
            paginacion: {
                texto: aElevators.length ?
                    "1–" + Math.min(5, aElevators.length) + " de " + aElevators.length :
                    "0 de 0"
            },
            meta: {
                plannedOrders: aOrders.length,
                affectedOrders: aAffected.length,
                affectedElevators: aElevators.length,
                source: "BTP_DESTINATION_ODATA_V2"
            }
        };
    }

    return {
        buildData: buildData,
        orderIsAffected: orderIsAffected
    };
});
