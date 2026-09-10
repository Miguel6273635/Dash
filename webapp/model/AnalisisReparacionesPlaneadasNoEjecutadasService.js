/* global Promise */

sap.ui.define([

    "mantenimiento/model/AnalisisReparacionesPlaneadasNoEjecutadasMapper",
    "mantenimiento/model/DashboardCacheODataModel"
], function (AnalisisReparacionesPlaneadasNoEjecutadasMapper,
    DashboardCacheODataModel
) {
    "use strict";

    var ID_CHUNK_SIZE = 30;
    var MAX_CONCURRENT_CHUNKS = 4;
    var FIXED_PERIOD = "ANUAL_2026";
    var FIXED_START_DATE = "01/01/2026";
    var FIXED_END_DATE = "31/12/2026";
    var LOG_PREFIX = "[ARPNO][Service]";
    var SELECTS = {
        DashboardOrdersSet: [
            "OrderId", "OrderTypeCode", "OrderTypeText", "PlannedStartDate",
            "PlannedFinishDate", "SapUserStatusCode", "AppStatusCode", "StatusText",
            "CustomerId", "CustomerName", "EquipmentId", "EquipmentName",
            "SupervisorId", "Mecanico", "Turno", "Zona", "FechaInicioProg",
            "FechaInicioReal"
        ],
        DashboardOrderCausesSet: [
            "OrderCauseId", "OrderId", "CauseCode", "CauseText", "CauseContextCode",
            "OriginCode", "IsPrimary", "ValidFrom", "ValidTo"
        ],
        DashboardOrderMaterialsSet: [
            "MaterialRequirementId", "OrderId", "MaterialId", "MaterialName",
            "PlannedQuantity", "RequiredDate", "MaterialCriticalityCode",
            "AvailableStockQuantity", "DataValidationStatusCode", "IsPublishable"
        ],
        DashboardOrderResourcesSet: [
            "OrderResourceId", "OrderId", "ResourceId", "PersonnelNumber", "RoleCode",
            "AssignmentTypeCode", "ValidFrom", "ValidTo"
        ],
        DashboardResourceDailySet: [
            "ResourceDateId", "ResourceId", "ResourceName", "WorkDate", "ZoneId",
            "ZoneName", "SupervisorId", "SupervisorName", "ShiftId", "ShiftName"
        ],
        DashboardFilterCatalogSet: [
            "FilterCatalogId", "FilterDomain", "ValueId", "ValueText", "ParentValueId",
            "ScopeTypeCode", "ScopeId", "ValidFrom", "ValidTo", "SortOrder", "Active"
        ]
    };

    function log(sLevel, sMessage, oDetails) {
        var oConsole = window.console;
        var sMethod = oConsole && typeof oConsole[sLevel] === "function"
            ? sLevel
            : "log";

        if (!oConsole || typeof oConsole[sMethod] !== "function") {
            return;
        }
        if (oDetails === undefined) {
            oConsole[sMethod](LOG_PREFIX + " " + sMessage);
            return;
        }
        oConsole[sMethod](LOG_PREFIX + " " + sMessage, oDetails);
    }

    function getServiceUrl(oModel) {
        return String(oModel && oModel.sServiceUrl || "");
    }

    function buildDebugUrl(oModel, sEntitySet, mUrlParameters) {
        var sBaseUrl = getServiceUrl(oModel);
        var aQuery = Object.keys(mUrlParameters || {}).filter(function (sKey) {
            return mUrlParameters[sKey] !== undefined && mUrlParameters[sKey] !== null;
        }).map(function (sKey) {
            return encodeURIComponent(sKey) + "=" + encodeURIComponent(mUrlParameters[sKey]);
        });

        if (sBaseUrl && !sBaseUrl.endsWith("/")) {
            sBaseUrl += "/";
        }
        return sBaseUrl + sEntitySet + (aQuery.length ? "?" + aQuery.join("&") : "");
    }

    function decodeDebugUrl(sUrl) {
        try {
            return decodeURIComponent(sUrl);
        } catch {
            return sUrl;
        }
    }

    function getErrorDetails(oError, sFallbackUrl) {
        var vResponseBody = oError && oError.responseText || "";

        if (vResponseBody) {
            try {
                vResponseBody = JSON.parse(vResponseBody);
            } catch {
                // Se conserva el texto original cuando SAP no devuelve JSON.
            }
        }
        return {
            message: oError && oError.message || "Error OData sin mensaje",
            statusCode: oError && oError.statusCode,
            statusText: oError && oError.statusText,
            requestUri: oError && oError.requestUri || sFallbackUrl,
            responseBody: vResponseBody,
            headers: oError && oError.headers,
            rawError: oError
        };
    }

    function parseDate(vValue) {
        var aDateParts;
        var oDate;
        var sValue;

        if (!vValue) {
            return null;
        }
        if (vValue instanceof Date) {
            return Number.isNaN(vValue.getTime())
                ? null
                : new Date(vValue.getFullYear(), vValue.getMonth(), vValue.getDate());
        }

        sValue = String(vValue).trim();
        aDateParts = sValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (aDateParts) {
            oDate = new Date(
                Number(aDateParts[3]),
                Number(aDateParts[2]) - 1,
                Number(aDateParts[1])
            );
        } else {
            aDateParts = sValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
            oDate = aDateParts
                ? new Date(
                    Number(aDateParts[1]),
                    Number(aDateParts[2]) - 1,
                    Number(aDateParts[3])
                )
                : null;
        }

        return oDate && !Number.isNaN(oDate.getTime()) ? oDate : null;
    }

    function addDays(oDate, iDays) {
        var oResult = new Date(oDate.getTime());

        oResult.setDate(oResult.getDate() + iDays);
        return oResult;
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

    function getFilterContext(mFilters) {
        var mValues = mFilters || {};
        var oStartDate = parseDate(FIXED_START_DATE);
        var oEndDate = parseDate(FIXED_END_DATE);

        return {
            startDate: oStartDate,
            endDate: oEndDate,
            endExclusive: oEndDate ? addDays(oEndDate, 1) : null,
            filters: {
                periodo: FIXED_PERIOD,
                fechaDesde: FIXED_START_DATE,
                fechaHasta: FIXED_END_DATE,
                zona: mValues.zona || "TODAS",
                cliente: mValues.cliente || "TODOS",
                responsable: mValues.responsable || "TODOS"
            }
        };
    }

    function buildOrdersFilter(oContext) {
        var aClauses = [];
        var sStartDate = formatODataDate(oContext.startDate);
        var sEndDate = formatODataDate(oContext.endDate);

        if (sStartDate) {
            aClauses.push("PlannedStartDate eq datetime'" + sStartDate + "'");
        }
        if (sEndDate) {
            aClauses.push("PlannedFinishDate eq datetime'" + sEndDate + "'");
        }
        return aClauses.join(" and ");
    }

    function escapeODataString(vValue) {
        return String(vValue).replace(/'/g, "''");
    }

    function uniqueStrings(aValues) {
        return Array.from(new Set((aValues || []).map(function (vValue) {
            return String(vValue || "").trim();
        }).filter(Boolean)));
    }

    function splitIntoChunks(aValues, iChunkSize) {
        var aChunks = [];
        var iIndex;

        for (iIndex = 0; iIndex < aValues.length; iIndex += iChunkSize) {
            aChunks.push(aValues.slice(iIndex, iIndex + iChunkSize));
        }
        return aChunks;
    }

    function buildIdFilter(sProperty, aValues) {
        var aUniqueValues = uniqueStrings(aValues);
        var aClauses = aUniqueValues.map(function (sValue) {
            return sProperty + " eq '" + escapeODataString(sValue) + "'";
        });

        if (aClauses.length === 0) {
            return "";
        }
        return aClauses.length === 1 ? aClauses[0] : "(" + aClauses.join(" or ") + ")";
    }

    function combineFilters() {
        var aFilters = Array.prototype.slice.call(arguments).filter(Boolean);

        return aFilters.map(function (sFilter) {
            return "(" + sFilter + ")";
        }).join(" and ");
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
        var sDebugUrl = buildDebugUrl(oModel, sEntitySet, mUrlParameters);
        var iStartedAt = Date.now();

        log("info", "REQUEST " + sEntitySet, {
            uri: sDebugUrl,
            uriDecodificada: decodeDebugUrl(sDebugUrl),
            parametros: Object.assign({}, mUrlParameters)
        });

        return new Promise(function (resolve, reject) {
            oModel.read("/" + sEntitySet, {
                urlParameters: mUrlParameters,
                success: function (oData, oResponse) {
                    var aRecords = Array.isArray(oData && oData.results)
                        ? oData.results
                        : [];

                    log("info", "RESPONSE " + sEntitySet, {
                        statusCode: oResponse && oResponse.statusCode,
                        statusText: oResponse && oResponse.statusText,
                        requestUri: oResponse && oResponse.requestUri || sDebugUrl,
                        duracionMs: Date.now() - iStartedAt,
                        cantidad: aRecords.length,
                        siguientePagina: oData && oData.__next || null,
                        muestraPrimeros3: aRecords.slice(0, 3),
                        respuestaRaw: oData
                    });

                    resolve({
                        records: aRecords,
                        next: oData && oData.__next
                    });
                },
                error: function (oError) {
                    var sMessage = "No fue posible consultar " + sEntitySet;

                    log("error", "ERROR " + sEntitySet, Object.assign(
                        {
                            duracionMs: Date.now() - iStartedAt,
                            uriDecodificada: decodeDebugUrl(sDebugUrl)
                        },
                        getErrorDetails(oError, sDebugUrl)
                    ));

                    if (oError && oError.message) {
                        sMessage += ": " + oError.message;
                    }
                    reject(new Error(sMessage));
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

    function readByIds(oModel, sEntitySet, sIdProperty, aIds, mParameters) {
        var aChunks = splitIntoChunks(uniqueStrings(aIds), ID_CHUNK_SIZE);

        function readChunkGroup(iStart, aAccumulated) {
            var aGroup = aChunks.slice(iStart, iStart + MAX_CONCURRENT_CHUNKS);

            if (aGroup.length === 0) {
                return Promise.resolve(aAccumulated);
            }
            return Promise.all(aGroup.map(function (aChunk) {
                var mChunkParameters = Object.assign({}, mParameters || {});

                mChunkParameters.$filter = combineFilters(
                    buildIdFilter(sIdProperty, aChunk),
                    mChunkParameters.$filter
                );
                return readEntitySet(oModel, sEntitySet, mChunkParameters);
            })).then(function (aResults) {
                var aMerged = aResults.reduce(function (aAll, aCurrent) {
                    return aAll.concat(aCurrent);
                }, aAccumulated);

                return readChunkGroup(iStart + MAX_CONCURRENT_CHUNKS, aMerged);
            });
        }

        return aChunks.length ? readChunkGroup(0, []) : Promise.resolve([]);
    }

    function readOptional(sEntitySet, oPromise) {
        return oPromise.then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
            return {
                entitySet: sEntitySet,
                records: [],
                error: oError && oError.message || "Error de lectura"
            };
        });
    }

    function createRawData(oContext) {
        return {
            orders: [],
            causes: [],
            materials: [],
            assignments: [],
            resources: [],
            catalogs: [],
            range: {
                startDate: oContext.startDate,
                endDate: oContext.endDate,
                endExclusive: oContext.endExclusive
            },
            meta: {
                source: "BTP_DESTINATION_ODATA_V2",
                destination: "QAS_MITSU_DASH",
                servicePath: "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV/",
                unavailableEntitySets: []
            }
        };
    }

    function applyOptionalResult(oRawData, sProperty, oResult) {
        oRawData[sProperty] = oResult.records;
        if (oResult.error) {
            oRawData.meta.unavailableEntitySets.push({
                entitySet: oResult.entitySet,
                message: oResult.error
            });
        }
    }

    function build(oRawData, mFilters, sAnalysis) {
        var oData = AnalisisReparacionesPlaneadasNoEjecutadasMapper.buildData(
            oRawData,
            mFilters,
            sAnalysis
        );

        oData.meta = Object.assign({}, oData.meta, oRawData.meta || {});
        oData.filters.periodo = FIXED_PERIOD;
        oData.filters.fechaDesde = FIXED_START_DATE;
        oData.filters.fechaHasta = FIXED_END_DATE;
        oData.catalogos.periodos = [{
            key: FIXED_PERIOD,
            text: "Año 2026"
        }];
        return oData;
    }

    function createEmpty(mFilters, sAnalysis) {
        var oContext = getFilterContext(mFilters);

        return build(createRawData(oContext), oContext.filters, sAnalysis);
    }

    function validateContext(oContext) {
        if (!oContext.startDate || !oContext.endDate) {
            throw new Error("Selecciona una fecha desde y una fecha hasta válidas");
        }
        if (oContext.startDate > oContext.endDate) {
            throw new Error("La fecha desde no puede ser posterior a la fecha hasta");
        }
    }

    function load(oModel, mFilters, sAnalysis) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            mFilters,
            ["orders","causes","materials","assignments","resources","catalogs"]
        );

        var oContext;
        var oRawData;
        var oCatalogPromise;

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }

        oContext = getFilterContext(mFilters);
        try {
            validateContext(oContext);
        } catch (oError) {
            return Promise.reject(oError);
        }

        oRawData = createRawData(oContext);
        oRawData.meta.ordersFilter = buildOrdersFilter(oContext);
        log("info", "INICIO DE CARGA", {
            serviceUrl: getServiceUrl(oModel),
            rangoFijo: {
                fechaDesde: FIXED_START_DATE,
                fechaHasta: FIXED_END_DATE
            },
            filtroDashboardOrdersSet: oRawData.meta.ordersFilter,
            filtrosPantalla: oContext.filters
        });
        oCatalogPromise = readOptional(
            "DashboardFilterCatalogSet",
            readEntitySet(oModel, "DashboardFilterCatalogSet", {
                "$select": SELECTS.DashboardFilterCatalogSet.join(","),
                "$filter": "Active eq true",
                "$orderby": "FilterDomain,SortOrder"
            })
        );

        return Promise.all([
            readEntitySet(oModel, "DashboardOrdersSet", {
                "$select": SELECTS.DashboardOrdersSet.join(","),
                "$filter": oRawData.meta.ordersFilter,
                "$orderby": "PlannedStartDate,OrderId"
            }),
            oCatalogPromise
        ]).then(function (aInitialResults) {
            var aOrderIds;

            oRawData.orders = aInitialResults[0];
            applyOptionalResult(oRawData, "catalogs", aInitialResults[1]);
            aOrderIds = uniqueStrings(oRawData.orders.map(function (oOrder) {
                return oOrder.OrderId;
            }));

            return Promise.all([
                readOptional(
                    "DashboardOrderCausesSet",
                    readByIds(
                        oModel,
                        "DashboardOrderCausesSet",
                        "OrderId",
                        aOrderIds,
                        { "$select": SELECTS.DashboardOrderCausesSet.join(",") }
                    )
                ),
                readOptional(
                    "DashboardOrderMaterialsSet",
                    readByIds(
                        oModel,
                        "DashboardOrderMaterialsSet",
                        "OrderId",
                        aOrderIds,
                        { "$select": SELECTS.DashboardOrderMaterialsSet.join(",") }
                    )
                ),
                readOptional(
                    "DashboardOrderResourcesSet",
                    readByIds(
                        oModel,
                        "DashboardOrderResourcesSet",
                        "OrderId",
                        aOrderIds,
                        { "$select": SELECTS.DashboardOrderResourcesSet.join(",") }
                    )
                )
            ]);
        }).then(function (aRelatedResults) {
            var aResourceIds;
            var sResourceDateFilter = combineFilters(
                "WorkDate ge datetime'" + formatODataDate(oContext.startDate) + "'",
                "WorkDate lt datetime'" + formatODataDate(oContext.endExclusive) + "'"
            );

            applyOptionalResult(oRawData, "causes", aRelatedResults[0]);
            applyOptionalResult(oRawData, "materials", aRelatedResults[1]);
            applyOptionalResult(oRawData, "assignments", aRelatedResults[2]);
            aResourceIds = uniqueStrings(oRawData.assignments.map(function (oAssignment) {
                return oAssignment.ResourceId;
            }));

            return readOptional(
                "DashboardResourceDailySet",
                readByIds(
                    oModel,
                    "DashboardResourceDailySet",
                    "ResourceId",
                    aResourceIds,
                    {
                        "$select": SELECTS.DashboardResourceDailySet.join(","),
                        "$filter": sResourceDateFilter,
                        "$orderby": "ResourceId,WorkDate"
                    }
                )
            );
        }).then(function (oResourceResult) {
            applyOptionalResult(oRawData, "resources", oResourceResult);
            oRawData.meta.generatedAt = new Date().toISOString();
            oRawData.meta.records = {
                orders: oRawData.orders.length,
                causes: oRawData.causes.length,
                materials: oRawData.materials.length,
                assignments: oRawData.assignments.length,
                resources: oRawData.resources.length,
                catalogs: oRawData.catalogs.length
            };

            log("info", "FIN DE CARGA", {
                generadoEn: oRawData.meta.generatedAt,
                registros: oRawData.meta.records,
                entidadesNoDisponibles: oRawData.meta.unavailableEntitySets,
                filtroDashboardOrdersSet: oRawData.meta.ordersFilter
            });

            return {
                data: build(oRawData, oContext.filters, sAnalysis),
                rawData: oRawData
            };
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
