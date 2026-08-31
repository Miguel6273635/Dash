sap.ui.define([
    "mantenimiento/model/AnalisisFallasMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (AnalisisFallasMapper, RelatedData) {
    "use strict";

    var AUXILIARY_SETS = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderResourcesSet: "assignments",
        DashboardResourceDailySet: "resources",
        DashboardFilterCatalogSet: "catalogs"
    };

    function parseDisplayDate(sValue) {
        var aMatch = String(sValue || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        var oDate;

        if (!aMatch) {
            return null;
        }
        oDate = new Date(Number(aMatch[3]), Number(aMatch[2]) - 1, Number(aMatch[1]));
        return oDate.getFullYear() === Number(aMatch[3]) &&
            oDate.getMonth() === Number(aMatch[2]) - 1 &&
            oDate.getDate() === Number(aMatch[1]) ? oDate : null;
    }

    function formatDisplayDate(oDate) {
        if (!(oDate instanceof Date) || Number.isNaN(oDate.getTime())) {
            return "";
        }
        return String(oDate.getDate()).padStart(2, "0") + "/" +
            String(oDate.getMonth() + 1).padStart(2, "0") + "/" +
            oDate.getFullYear();
    }

    function formatODataDate(oDate) {
        if (!(oDate instanceof Date) || Number.isNaN(oDate.getTime())) {
            return null;
        }
        return oDate.getFullYear() + "-" +
            String(oDate.getMonth() + 1).padStart(2, "0") + "-" +
            String(oDate.getDate()).padStart(2, "0") + "T00:00:00";
    }

    function getFilterContext(mFilters) {
        var mValues = mFilters || {};
        var sPeriod = String(mValues.periodo || "2026-ANUAL");
        var oPeriodRange = AnalisisFallasMapper.parsePeriod(sPeriod);
        var oStart = parseDisplayDate(mValues.fechaDesde) ||
            (oPeriodRange && oPeriodRange.startDate);
        var oEnd = parseDisplayDate(mValues.fechaHasta) ||
            (oPeriodRange && oPeriodRange.endDate);

        return {
            startDate: oStart,
            endDate: oEnd,
            filters: {
                periodo: sPeriod,
                fechaDesde: formatDisplayDate(oStart),
                fechaHasta: formatDisplayDate(oEnd),
                zona: mValues.zona || "TODAS"
            }
        };
    }

    function buildOrdersFilter(oRange) {
        var sStart = formatODataDate(oRange.startDate);
        var sEnd = formatODataDate(oRange.endDate);

        return [
            "PlannedStartDate eq datetime'" + sStart + "'",
            "(OrderTypeCode eq 'SM01' or OrderTypeCode eq 'SM02' or OrderTypeCode eq 'SM03')",
            "PlannedFinishDate eq datetime'" + sEnd + "'"
        ].join(" and ");
    }

    function readEntitySet(oModel, sEntitySet, sFilter) {
        var mUrlParameters = { "$format": "json" };

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
                    reject(new Error("No fue posible consultar " + sEntitySet +
                        (oError && oError.message ? ": " + oError.message : "")));
                }
            });
        });
    }

    function readOptional(oModel, sEntitySet) {
        return readEntitySet(oModel, sEntitySet, "").then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
            return { entitySet: sEntitySet, records: [], error: oError.message };
        });
    }

    function previousRanges(oContext) {
        var iLength = Math.round((oContext.endDate.getTime() -
            oContext.startDate.getTime()) / 86400000) + 1;
        var oCursor = new Date(oContext.startDate.getFullYear(),
            oContext.startDate.getMonth(), oContext.startDate.getDate() - 1);
        var aRanges = [];
        var iIndex;
        var oStart;

        for (iIndex = 0; iIndex < 4; iIndex += 1) {
            oStart = new Date(oCursor.getFullYear(), oCursor.getMonth(),
                oCursor.getDate() - iLength + 1);
            aRanges.unshift({
                key: "previous-" + (4 - iIndex),
                startDate: oStart,
                endDate: new Date(oCursor.getFullYear(), oCursor.getMonth(),
                    oCursor.getDate(), 23, 59, 59)
            });
            oCursor = new Date(oStart.getFullYear(), oStart.getMonth(),
                oStart.getDate() - 1);
        }
        aRanges.push({
            key: "current",
            startDate: oContext.startDate,
            endDate: oContext.endDate
        });
        return aRanges;
    }

    function createRawData(oContext) {
        return {
            orders: [],
            trendOrders: [],
            trendPeriods: previousRanges(oContext),
            causes: [],
            assignments: [],
            resources: [],
            catalogs: [],
            range: { startDate: oContext.startDate, endDate: oContext.endDate },
            meta: {
                source: "BTP_DESTINATION_ODATA_V2",
                destination: "QAS_MITSU_DASH",
                servicePath: "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV/",
                unavailableEntitySets: []
            }
        };
    }

    function build(oRawData, mFilters) {
        var oData = AnalisisFallasMapper.buildData(oRawData, mFilters);

        oData.meta = Object.assign({}, oData.meta, oRawData.meta || {});
        return oData;
    }

    function createEmpty(mFilters) {
        var oContext = getFilterContext(mFilters);

        return build(createRawData(oContext), oContext.filters);
    }

    function load(oModel, mFilters) {
        var oContext;
        var aPeriods;

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error(
                "El modelo OData 'dashboardOData' no está configurado"
            ));
        }
        oContext = getFilterContext(mFilters);
        if (!oContext.startDate || !oContext.endDate) {
            return Promise.reject(new Error("Selecciona un periodo válido"));
        }
        if (oContext.startDate > oContext.endDate) {
            return Promise.reject(new Error(
                "La fecha desde no puede ser posterior a la fecha hasta"
            ));
        }
        aPeriods = previousRanges(oContext);

        return Promise.all(aPeriods.map(function (oRange) {
            return readEntitySet(oModel, "DashboardOrdersSet", buildOrdersFilter(oRange));
        })).then(function (aOrdersByPeriod) {
            var mSeen = new Map();
            var oTrendRange = {
                startDate: aPeriods[0].startDate,
                endDate: oContext.endDate
            };

            aOrdersByPeriod.forEach(function (aOrders) {
                aOrders.forEach(function (oOrder) {
                    mSeen.set(String(oOrder.OrderId), oOrder);
                });
            });
            return RelatedData.loadForOrders(oModel, Array.from(mSeen.values()), {
                orderRelations: [
                    { entitySet: "DashboardOrderCausesSet", target: "causes" },
                    { entitySet: "DashboardOrderResourcesSet", target: "assignments" }
                ],
                independent: [
                    { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", oTrendRange) },
                    { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
                ]
            }).then(function (oRelatedRaw) {
                return { ordersByPeriod: aOrdersByPeriod, relatedRaw: oRelatedRaw };
            });
        }).then(function (oResponse) {
            var oRawData = createRawData(oContext);
            var aOrdersByPeriod = oResponse.ordersByPeriod;
            var oRelatedRaw = oResponse.relatedRaw;

            oRawData.orders = aOrdersByPeriod[aOrdersByPeriod.length - 1] || [];
            oRawData.trendOrders = oRelatedRaw.orders;
            oRawData.trendPeriods = aPeriods;
            ["causes", "assignments", "resources", "catalogs"].forEach(function (sKey) {
                oRawData[sKey] = oRelatedRaw[sKey] || [];
            });
            oRawData.meta.unavailableEntitySets = oRelatedRaw.meta.unavailableEntitySets;
            oRawData.meta.ordersFilter = buildOrdersFilter(aPeriods[aPeriods.length - 1]);
            oRawData.meta.generatedAt = new Date().toISOString();
            oRawData.meta.records = {
                orders: oRawData.orders.length,
                trendOrders: oRawData.trendOrders.length,
                causes: oRawData.causes.length,
                assignments: oRawData.assignments.length,
                resources: oRawData.resources.length,
                catalogs: oRawData.catalogs.length
            };

            return { data: build(oRawData, oContext.filters), rawData: oRawData };
        });
    }

    return {
        load: load,
        build: build,
        createEmpty: createEmpty,
        buildOrdersFilter: buildOrdersFilter,
        getFilterContext: getFilterContext
    };
});
