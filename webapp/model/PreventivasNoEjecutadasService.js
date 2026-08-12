sap.ui.define([
    "mantenimiento/model/PreventivasNoEjecutadasMapper"
], function (PreventivasNoEjecutadasMapper) {
    "use strict";

    var AUXILIARY_SETS = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderResourcesSet: "assignments",
        DashboardResourceDailySet: "resources",
        DashboardFilterCatalogSet: "catalogs"
    };

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

        return {
            startDate: parseDate(mValues.fechaDesde, false),
            endDate: parseDate(mValues.fechaHasta, true),
            filters: {
                periodo: mValues.periodo || "",
                fechaDesde: mValues.fechaDesde || "",
                fechaHasta: mValues.fechaHasta || "",
                zona: mValues.zona || "TODAS",
                cliente: mValues.cliente || "TODOS",
                responsable: mValues.responsable || "TODOS"
            }
        };
    }

    function buildOrdersFilter(oContext) {
        var aClauses = ["OrderTypeCode eq 'SM01'"];
        var sStartDate = formatODataDate(oContext.startDate);
        var sEndDate = formatODataDate(oContext.endDate);

        // El servicio ABAP usa EQ en los dos extremos para resolver el rango
        // de fechas planeadas. No se envía $top: se procesa todo el periodo.
        if (sStartDate) {
            aClauses.unshift("PlannedStartDate eq datetime'" + sStartDate + "'");
        }
        if (sEndDate) {
            aClauses.push("PlannedFinishDate eq datetime'" + sEndDate + "'");
        }
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
                    reject(new Error("No fue posible consultar " + sEntitySet +
                        (oError && oError.message ? ": " + oError.message : "")));
                }
            });
        });
    }

    function readOptional(oModel, sEntitySet) {
        return readEntitySet(oModel, sEntitySet).then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
            // Las tarjetas y KPIs siguen funcionando si SAP aún no publica
            // alguno de los Entity Sets auxiliares.
            return { entitySet: sEntitySet, records: [], error: oError.message };
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

    function build(oRawData, mFilters, sAnalysis) {
        var oData = PreventivasNoEjecutadasMapper.buildData(oRawData, mFilters, sAnalysis);

        oData.meta = Object.assign({}, oData.meta, oRawData.meta || {});
        return oData;
    }

    function createEmpty(mFilters, sAnalysis) {
        var oContext = getFilterContext(mFilters);

        return build(createRawData(oContext), oContext.filters, sAnalysis);
    }

    function load(oModel, mFilters, sAnalysis) {
        var oContext;
        var sOrdersFilter;
        var aAuxiliaryNames;

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }
        oContext = getFilterContext(mFilters);
        if (!oContext.startDate || !oContext.endDate) {
            return Promise.reject(new Error("Selecciona una fecha desde y una fecha hasta válidas"));
        }
        if (oContext.startDate > oContext.endDate) {
            return Promise.reject(new Error("La fecha desde no puede ser posterior a la fecha hasta"));
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
