sap.ui.define([
    "mantenimiento/model/CausasZonaMapper"
], function (CausasZonaMapper) {
    "use strict";

    /*
     * Carga los cinco EntitySets del contrato funcional de Causas por zona.
     * No se usa $top: los conteos y las gráficas requieren todas las OT de la
     * semana para poder aplicar COUNT DISTINCT OrderId correctamente.
     */
    var AUXILIARY_SETS = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderResourcesSet: "assignments",
        DashboardResourceDailySet: "resources",
        DashboardFilterCatalogSet: "catalogs"
    };

    function isoWeekStart(iYear, iWeek) {
        var oJanFourth = new Date(iYear, 0, 4);
        var iDay = oJanFourth.getDay() || 7;

        return new Date(
            iYear,
            0,
            4 - iDay + 1 + (iWeek - 1) * 7
        );
    }

    function parseWeek(sWeek) {
        var aMatch = String(sWeek || "").match(/^(\d{4})-W(\d{2})$/);
        var iYear;
        var iWeek;
        var oStart;
        var oEnd;

        if (!aMatch) {
            return null;
        }
        iYear = Number(aMatch[1]);
        iWeek = Number(aMatch[2]);
        if (iWeek < 1 || iWeek > 53) {
            return null;
        }
        oStart = isoWeekStart(iYear, iWeek);
        oEnd = new Date(
            oStart.getFullYear(),
            oStart.getMonth(),
            oStart.getDate() + 6,
            23,
            59,
            59
        );

        return { startDate: oStart, endDate: oEnd };
    }

    function parsePeriod(sPeriod) {
        var aAnnualMatch = String(sPeriod || "").match(/^(\d{4})-ANUAL$/);
        var iYear;

        if (aAnnualMatch) {
            iYear = Number(aAnnualMatch[1]);
            return {
                startDate: new Date(iYear, 0, 1),
                endDate: new Date(iYear, 11, 31, 23, 59, 59),
                isAnnual: true
            };
        }

        return parseWeek(sPeriod);
    }

    function parseDisplayDate(sValue) {
        var aMatch = String(sValue || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        var oDate;

        if (!aMatch) {
            return null;
        }
        oDate = new Date(
            Number(aMatch[3]),
            Number(aMatch[2]) - 1,
            Number(aMatch[1])
        );
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

    function normalize(vValue) {
        return String(vValue || "").trim().toUpperCase();
    }

    function hasValue(vValue) {
        return ["", "TODOS", "TODAS", "ALL", "NULL"].indexOf(
            normalize(vValue)
        ) < 0;
    }

    function getFilterContext(mFilters) {
        var mValues = mFilters || {};
        var sWeek = String(mValues.semana || "2026-ANUAL");
        var oWeekRange = parsePeriod(sWeek);
        var oStartDate = parseDisplayDate(mValues.fechaDesde) ||
            (oWeekRange && oWeekRange.startDate);
        var oEndDate = parseDisplayDate(mValues.fechaHasta) ||
            (oWeekRange && oWeekRange.endDate);

        return {
            startDate: oStartDate,
            endDate: oEndDate,
            filters: {
                semana: sWeek,
                fechaDesde: formatDisplayDate(oStartDate),
                fechaHasta: formatDisplayDate(oEndDate),
                zona: mValues.zona || "TODAS",
                cliente: mValues.cliente || "TODOS",
                responsable: mValues.responsable || "TODOS"
            }
        };
    }

    function buildOrdersFilter(oContext) {
        var sStart = formatODataDate(oContext.startDate);
        var sEnd = formatODataDate(oContext.endDate);
        var aClauses = [
            "(OrderTypeCode eq 'SM01' or OrderTypeCode eq 'SM02' or OrderTypeCode eq 'SM03')"
        ];

        /*
         * El servicio ABAP interpreta estos dos EQ como los extremos del
         * periodo, igual que la consulta usada por el dashboard principal.
         */
        aClauses.unshift(
            "PlannedStartDate eq datetime'" + sStart + "'"
        );
        aClauses.push(
            "PlannedFinishDate eq datetime'" + sEnd + "'"
        );

        return aClauses.join(" and ");
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
                    reject(new Error(
                        "No fue posible consultar " + sEntitySet +
                        (oError && oError.message ? ": " + oError.message : "")
                    ));
                }
            });
        });
    }

    function readOptional(oModel, sEntitySet) {
        return readEntitySet(oModel, sEntitySet, "").then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
            return {
                entitySet: sEntitySet,
                records: [],
                error: oError.message
            };
        });
    }

    function createRawData(oContext) {
        return {
            orders: [],
            causes: [],
            assignments: [],
            resources: [],
            catalogs: [],
            range: {
                startDate: oContext.startDate,
                endDate: oContext.endDate
            },
            meta: {
                source: "BTP_DESTINATION_ODATA_V2",
                destination: "QAS_MITSU_DASH",
                servicePath: "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV/",
                unavailableEntitySets: []
            }
        };
    }

    function build(oRawData, mFilters) {
        var oData = CausasZonaMapper.buildData(oRawData, mFilters);

        oData.meta = Object.assign({}, oData.meta, oRawData.meta || {});
        return oData;
    }

    function createEmpty(mFilters) {
        var oContext = getFilterContext(mFilters);

        return build(createRawData(oContext), oContext.filters);
    }

    function load(oModel, mFilters) {
        var oContext;
        var sOrdersFilter;
        var aAuxiliaryNames;

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error(
                "El modelo OData 'dashboardOData' no está configurado"
            ));
        }
        oContext = getFilterContext(mFilters);
        if (!oContext.startDate || !oContext.endDate) {
            return Promise.reject(new Error("Selecciona una semana válida"));
        }

        sOrdersFilter = buildOrdersFilter(oContext);
        aAuxiliaryNames = Object.keys(AUXILIARY_SETS);

        return Promise.all([
            readEntitySet(oModel, "DashboardOrdersSet", sOrdersFilter),
            Promise.all(aAuxiliaryNames.map(function (sEntitySet) {
                return readOptional(oModel, sEntitySet);
            }))
        ]).then(function (aResponses) {
            var oRawData = createRawData(oContext);

            oRawData.orders = aResponses[0];
            aResponses[1].forEach(function (oResponse) {
                oRawData[AUXILIARY_SETS[oResponse.entitySet]] = oResponse.records;
                if (oResponse.error) {
                    oRawData.meta.unavailableEntitySets.push({
                        entitySet: oResponse.entitySet,
                        message: oResponse.error
                    });
                }
            });
            oRawData.meta.ordersFilter = sOrdersFilter;
            oRawData.meta.generatedAt = new Date().toISOString();
            oRawData.meta.records = {
                orders: oRawData.orders.length,
                causes: oRawData.causes.length,
                assignments: oRawData.assignments.length,
                resources: oRawData.resources.length,
                catalogs: oRawData.catalogs.length
            };

            return {
                data: build(oRawData, oContext.filters),
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
