/* global Promise */

sap.ui.define([

    "mantenimiento/model/AnalisisIntegralReparacionesMapper",
    "mantenimiento/model/DashboardCacheODataModel"
], function (AnalisisIntegralReparacionesMapper,
    DashboardCacheODataModel
) {
    "use strict";

    var DEFAULT_PERIOD = "ANUAL_2026";
    var DEFAULT_START_DATE = "01/01/2026";
    var DEFAULT_END_DATE = "31/12/2026";
    var CACHE_TTL_MS = 120000;
    var mCache = new Map();
    var SELECTS = {
        DashboardOrdersSet: [
            "OrderId", "OrderTypeCode", "OrderTypeText", "Description",
            "PlannedStartDate", "PlannedFinishDate", "SapUserStatusCode",
            "AppStatusCode", "StatusText", "CustomerId", "CustomerName",
            "EquipmentId", "EquipmentName", "SupervisorId", "Mecanico",
            "Turno", "Zona", "FechaInicioProg", "FechaInicioReal"
        ],
        DashboardOrderEventsSet: [
            "OrderEventId", "OrderId", "EventTypeCode", "EventAt", "UserId",
            "ActionCode", "SapStatusCode", "AppStatusCode", "StatusInactive",
            "ChangeNumber"
        ],
        DashboardOrderMaterialsSet: [
            "MaterialRequirementId", "OrderId", "ReservationNumber",
            "ReservationItem", "MaterialId", "MaterialName",
            "MaterialCategoryCode", "MaterialCategoryName", "BaseUnitCode",
            "PlannedQuantity", "RequiredDate", "DataValidationStatusCode",
            "IsPublishable"
        ],
        DashboardOrderResourcesSet: [
            "OrderResourceId", "OrderId", "ResourceId", "PersonnelNumber",
            "RoleCode", "AssignmentTypeCode", "ValidFrom", "ValidTo"
        ],
        DashboardResourceDailySet: [
            "ResourceDateId", "ResourceId", "PersonnelNumber", "ResourceName",
            "WorkDate", "ZoneId", "ZoneName", "SupervisorId",
            "SupervisorName", "ShiftId", "ShiftName", "AvailabilityStatusCode"
        ]
    };

    function getServiceUrl(oModel) {
        return String(oModel && oModel.sServiceUrl || "");
    }

    function buildDebugUrl(oModel, sEntitySet, mUrlParameters) {
        var sBaseUrl = getServiceUrl(oModel);
        var aQuery = Object.keys(mUrlParameters || {}).map(function (sKey) {
            return encodeURIComponent(sKey) + "=" + encodeURIComponent(mUrlParameters[sKey]);
        });

        if (sBaseUrl && !sBaseUrl.endsWith("/")) {
            sBaseUrl += "/";
        }
        return sBaseUrl + sEntitySet + (aQuery.length ? "?" + aQuery.join("&") : "");
    }

    function parseError(oError, sFallbackUrl) {
        var vResponse = oError && oError.responseText || "";

        if (vResponse) {
            try {
                vResponse = JSON.parse(vResponse);
            } catch {
                // SAP también puede devolver el error en XML o texto plano.
            }
        }
        return {
            message: oError && oError.message || "Error OData sin mensaje",
            statusCode: oError && oError.statusCode,
            statusText: oError && oError.statusText,
            requestUri: oError && oError.requestUri || sFallbackUrl,
            responseBody: vResponse
        };
    }

    function parseDate(vValue) {
        var aParts;
        var oDate;

        if (vValue instanceof Date) {
            return Number.isNaN(vValue.getTime()) ? null : new Date(vValue.getTime());
        }
        aParts = String(vValue || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (!aParts) {
            return null;
        }
        oDate = new Date(Number(aParts[3]), Number(aParts[2]) - 1, Number(aParts[1]));
        return Number.isNaN(oDate.getTime()) ? null : oDate;
    }

    function addDays(oDate, iDays) {
        var oResult = new Date(oDate.getTime());

        oResult.setDate(oResult.getDate() + iDays);
        return oResult;
    }

    function formatODataDate(oDate) {
        return [
            oDate.getFullYear(),
            String(oDate.getMonth() + 1).padStart(2, "0"),
            String(oDate.getDate()).padStart(2, "0")
        ].join("-") + "T00:00:00";
    }

    function getFilterContext(mFilters) {
        var mValues = mFilters || {};
        var sPeriod = mValues.periodo || DEFAULT_PERIOD;
        var aPeriodMatch = String(sPeriod).match(/(\d{4})$/);
        var sYear = aPeriodMatch ? aPeriodMatch[1] : "2026";
        var sStartDate = mValues.fechaDesde || "01/01/" + sYear;
        var sEndDate = mValues.fechaHasta || "31/12/" + sYear;
        var oStartDate = parseDate(sStartDate) || parseDate(DEFAULT_START_DATE);
        var oEndDate = parseDate(sEndDate) || parseDate(DEFAULT_END_DATE);

        return {
            startDate: oStartDate,
            endDate: oEndDate,
            endExclusive: addDays(oEndDate, 1),
            filters: {
                periodo: sPeriod,
                fechaDesde: sStartDate,
                fechaHasta: sEndDate,
                zona: mValues.zona || "TODAS",
                cliente: mValues.cliente || "TODOS",
                responsable: mValues.responsable || "TODOS",
                busquedaMaterial: mValues.busquedaMaterial || ""
            }
        };
    }

    function buildOrdersFilter(oContext) {
        return "PlannedStartDate eq datetime'" + formatODataDate(oContext.startDate) + "' and " +
            "PlannedFinishDate eq datetime'" + formatODataDate(oContext.endDate) + "'";
    }

    function decodeUrlPart(sValue) {
        try {
            return decodeURIComponent(String(sValue || "").replace(/\+/g, "%20"));
        } catch {
            return String(sValue || "");
        }
    }

    function getNextPageParameters(sNextLink) {
        var sQuery = String(sNextLink || "").split("?")[1] || "";
        var mPaging = {};

        sQuery.split("&").forEach(function (sPart) {
            var iSeparator = sPart.indexOf("=");
            var sKey = decodeUrlPart(iSeparator >= 0 ? sPart.slice(0, iSeparator) : sPart);
            var sValue = decodeUrlPart(iSeparator >= 0 ? sPart.slice(iSeparator + 1) : "");

            if (sKey === "$skiptoken" || sKey === "$skip") {
                mPaging[sKey] = sValue;
            }
        });
        return Object.keys(mPaging).length ? mPaging : null;
    }

    function readPage(oModel, sEntitySet, mUrlParameters) {
        var sUrl = buildDebugUrl(oModel, sEntitySet, mUrlParameters);

        return new Promise(function (resolve, reject) {
            oModel.read("/" + sEntitySet, {
                urlParameters: mUrlParameters,
                success: function (oData, oResponse) {
                    var aRecords = Array.isArray(oData && oData.results) ? oData.results : [];

                    resolve({ records: aRecords, next: oData && oData.__next });
                },
                error: function (oError) {
                    var oDetails = parseError(oError, sUrl);
                    var oException = new Error(
                        "No fue posible consultar " + sEntitySet + ": " + oDetails.message
                    );

                    oException.details = oDetails;
                    reject(oException);
                }
            });
        });
    }

    function readEntitySet(oModel, sEntitySet, mParameters) {
        var mBaseParameters = Object.assign({ "$format": "json" }, mParameters || {});
        var mSeenPages = {};

        function readNext(mPageParameters, aAccumulated) {
            return readPage(oModel, sEntitySet, mPageParameters).then(function (oPage) {
                var aRecords = aAccumulated.concat(oPage.records);
                var mNext = getNextPageParameters(oPage.next);
                var sPageKey;

                if (!mNext) {
                    return aRecords;
                }
                sPageKey = JSON.stringify(mNext);
                if (mSeenPages[sPageKey]) {
                    throw new Error("SAP devolvió una paginación repetida para " + sEntitySet);
                }
                mSeenPages[sPageKey] = true;
                return readNext(Object.assign({}, mBaseParameters, mNext), aRecords);
            });
        }

        return readNext(mBaseParameters, []);
    }

    function cacheKey(oModel, sEntitySet, mParameters) {
        return getServiceUrl(oModel) + "|" + sEntitySet + "|" + JSON.stringify(mParameters || {});
    }

    function readCached(oModel, sEntitySet, mParameters) {
        var sKey = cacheKey(oModel, sEntitySet, mParameters);
        var oCached = mCache.get(sKey);
        var iNow = Date.now();
        var oPromise;

        if (oCached && oCached.records && oCached.expiresAt > iNow) {
            return Promise.resolve(oCached.records);
        }
        if (oCached && oCached.promise) {
            return oCached.promise;
        }

        oPromise = readEntitySet(oModel, sEntitySet, mParameters).then(function (aRecords) {
            mCache.set(sKey, {
                records: aRecords,
                expiresAt: Date.now() + CACHE_TTL_MS,
                promise: null
            });
            return aRecords;
        }).catch(function (oError) {
            mCache.delete(sKey);
            throw oError;
        });
        mCache.set(sKey, { records: null, expiresAt: 0, promise: oPromise });
        return oPromise;
    }

    function readWithSelectFallback(oModel, sEntitySet, mParameters) {
        var mSelectedParameters = Object.assign({}, mParameters || {}, {
            "$select": SELECTS[sEntitySet].join(",")
        });

        return readCached(oModel, sEntitySet, mSelectedParameters).catch(function (oSelectError) {
            return readCached(oModel, sEntitySet, mParameters || {});
        });
    }

    function readOptional(oModel, sEntitySet, mParameters) {
        return readWithSelectFallback(oModel, sEntitySet, mParameters).then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
            return {
                entitySet: sEntitySet,
                records: [],
                error: oError.message,
                details: oError.details
            };
        });
    }

    function createRawData(oContext) {
        return {
            orders: [],
            events: [],
            materials: [],
            assignments: [],
            resources: [],
            range: {
                startDate: oContext.startDate,
                endDate: oContext.endDate,
                endExclusive: oContext.endExclusive
            },
            meta: {
                source: "BTP_DESTINATION_ODATA_V2",
                destination: "QAS_MITSU_DASH",
                servicePath: "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV/",
                detailsLoaded: false,
                enrichmentLoaded: false,
                unavailableEntitySets: [],
                optionalWarnings: [],
                records: {}
            }
        };
    }

    function updateCounters(oRawData) {
        oRawData.meta.records = {
            orders: oRawData.orders.length,
            events: oRawData.events.length,
            materials: oRawData.materials.length,
            assignments: oRawData.assignments.length,
            resources: oRawData.resources.length
        };
    }

    function canonicalOrderId(vValue) {
        var sValue = String(vValue || "").trim();

        return /^\d+$/.test(sValue)
            ? sValue.replace(/^0+(?=\d)/, "")
            : sValue.toUpperCase();
    }

    function countBy(aItems, sProperty) {
        var mCounts = {};

        aItems.forEach(function (oItem) {
            var vValue = oItem && oItem[sProperty];
            var sKey = vValue === undefined || vValue === null || vValue === ""
                ? "<vacío>"
                : String(vValue).trim();

            mCounts[sKey] = (mCounts[sKey] || 0) + 1;
        });
        return mCounts;
    }

    function analyzeEventRelationship(oRawData) {
        var mSm01Ids = new Set(oRawData.orders.filter(function (oOrder) {
            return String(oOrder.OrderTypeCode || "").trim().toUpperCase() === "SM01";
        }).map(function (oOrder) {
            return canonicalOrderId(oOrder.OrderId);
        }));
        var aMatchedEvents = oRawData.events.filter(function (oEvent) {
            return mSm01Ids.has(canonicalOrderId(oEvent.OrderId));
        });

        return {
            ordenesSm01: mSm01Ids.size,
            eventosRecibidos: oRawData.events.length,
            eventosRelacionadosConSm01: aMatchedEvents.length,
            ordenesSm01ConEvento: new Set(aMatchedEvents.map(function (oEvent) {
                return canonicalOrderId(oEvent.OrderId);
            })).size,
            sapStatusCode: countBy(aMatchedEvents, "SapStatusCode"),
            appStatusCode: countBy(aMatchedEvents, "AppStatusCode"),
            statusInactive: countBy(aMatchedEvents, "StatusInactive")
        };
    }

    function applyOptional(oRawData, sProperty, oResult, bCritical) {
        oRawData[sProperty] = oResult.records;
        if (oResult.error) {
            (bCritical
                ? oRawData.meta.unavailableEntitySets
                : oRawData.meta.optionalWarnings).push({
                entitySet: oResult.entitySet,
                message: oResult.error,
                details: oResult.details
            });
        }
    }

    function build(oRawData, mFilters, sAnalysis) {
        var oData = AnalisisIntegralReparacionesMapper.buildData(
            oRawData,
            getFilterContext(mFilters).filters,
            sAnalysis
        );

        oData.meta = Object.assign({}, oData.meta, {
            source: oRawData.meta.source,
            destination: oRawData.meta.destination,
            servicePath: oRawData.meta.servicePath,
            ordersFilter: oRawData.meta.ordersFilter,
            generatedAt: oRawData.meta.generatedAt,
            detailsLoadedAt: oRawData.meta.detailsLoadedAt,
            unavailableEntitySets: oRawData.meta.unavailableEntitySets,
            optionalWarnings: oRawData.meta.optionalWarnings,
            eventDiagnostics: oRawData.meta.eventDiagnostics,
            records: oRawData.meta.records
        });
        return oData;
    }

    function createEmpty(mFilters, sAnalysis) {
        var oContext = getFilterContext(mFilters);

        return build(createRawData(oContext), oContext.filters, sAnalysis || "PLANNED");
    }

    function loadCriticalDetails(oModel, oRawData) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            {},
            ["orders","events","materials","assignments","resources"]
        );

        return Promise.all([
            readOptional(oModel, "DashboardOrderEventsSet", {}),
            readOptional(oModel, "DashboardOrderMaterialsSet", {})
        ]).then(function (aResults) {
            applyOptional(oRawData, "events", aResults[0], true);
            applyOptional(oRawData, "materials", aResults[1], true);
            oRawData.meta.detailsLoaded = true;
            oRawData.meta.detailsLoadedAt = new Date().toISOString();
            oRawData.meta.eventDiagnostics = analyzeEventRelationship(oRawData);
            updateCounters(oRawData);
            return oRawData;
        });
    }

    function loadResponsibleEnrichment(oModel, oRawData) {
        oRawData.assignments = [];
        return readOptional(oModel, "DashboardResourceDailySet", {}).then(function (oResult) {
            applyOptional(oRawData, "resources", oResult, false);
            oRawData.meta.enrichmentLoaded = true;
            oRawData.meta.enrichmentLoadedAt = new Date().toISOString();
            updateCounters(oRawData);
            return oRawData;
        });
    }

    function load(oModel, mFilters, sAnalysis) {
        var oContext;
        var oRawData;
        var sOrdersFilter;

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }

        oContext = getFilterContext(mFilters);
        oRawData = createRawData(oContext);
        sOrdersFilter = buildOrdersFilter(oContext);
        oRawData.meta.ordersFilter = sOrdersFilter;

        return readWithSelectFallback(oModel, "DashboardOrdersSet", {
            "$filter": sOrdersFilter
        }).then(function (aOrders) {
            var oDetailsPromise;
            var oEnrichmentPromise;

            oRawData.orders = aOrders;
            oRawData.meta.generatedAt = new Date().toISOString();
            updateCounters(oRawData);

            oDetailsPromise = loadCriticalDetails(oModel, oRawData);
            oEnrichmentPromise = oDetailsPromise.then(function () {
                return loadResponsibleEnrichment(oModel, oRawData);
            });

            return {
                data: build(oRawData, oContext.filters, sAnalysis || "PLANNED"),
                rawData: oRawData,
                detailsPromise: oDetailsPromise,
                enrichmentPromise: oEnrichmentPromise
            };
        });
    }

    function clearCache() {
        mCache.clear();
    }

    return {
        load: load,
        build: build,
        createEmpty: createEmpty,
        buildOrdersFilter: buildOrdersFilter,
        getFilterContext: getFilterContext,
        clearCache: clearCache
    };
});
