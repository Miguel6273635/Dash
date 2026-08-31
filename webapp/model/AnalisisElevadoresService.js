sap.ui.define([
    "mantenimiento/model/AnalisisElevadoresMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (AnalisisElevadoresMapper, RelatedData) {
    "use strict";

    /*
     * Consulta únicamente los EntitySets indicados en la especificación
     * funcional. No usa $top: se requiere el universo completo del periodo
     * para agrupar y contar las OT distintas por elevador.
     */
    var AUXILIARY_SETS = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderResourcesSet: "assignments",
        DashboardResourceDailySet: "resources",
        DashboardFilterCatalogSet: "catalogs"
    };

    function parseDate(vValue, bEndOfDay) {
        var aMatch;
        var sText;
        var sDate;
        var oDate;

        if (!vValue) {
            return null;
        }
        sText = String(vValue).trim();
        aMatch = sText.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        sDate = aMatch ? aMatch[3] + "-" + aMatch[2] + "-" + aMatch[1] : sText.slice(0, 10);
        oDate = new Date(sDate + "T" + (bEndOfDay ? "23:59:59" : "00:00:00"));

        return Number.isNaN(oDate.getTime()) ? null : oDate;
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
        return ["", "TODOS", "TODAS", "ALL", "NULL"].indexOf(normalize(vValue)) < 0;
    }

    function escapeODataString(vValue) {
        return String(vValue).replace(/'/g, "''");
    }

    function getFilterContext(mFilters) {
        var mValues = mFilters || {};

        return {
            startDate: parseDate(mValues.fechaDesde, false),
            endDate: parseDate(mValues.fechaHasta, true),
            filters: {
                periodo: String(mValues.periodo || "2026"),
                fechaDesde: mValues.fechaDesde || "01/01/2026",
                fechaHasta: mValues.fechaHasta || "31/12/2026",
                zona: mValues.zona || "TODAS",
                supervisor: mValues.supervisor || "TODOS",
                tipoOrden: mValues.tipoOrden || "TODOS"
            }
        };
    }

    function buildOrdersFilter(oContext) {
        var aClauses = [
            "(OrderTypeCode eq 'SM01' or OrderTypeCode eq 'SM02' or OrderTypeCode eq 'SM03')"
        ];
        var sStart = formatODataDate(oContext.startDate);
        var sEnd = formatODataDate(oContext.endDate);

        /*
         * El GET_ENTITYSET ABAP de este servicio usa los dos EQ como extremos
         * del periodo. Este es el mismo contrato usado por la vista principal.
         */
        if (sStart) {
            aClauses.unshift("PlannedStartDate eq datetime'" + sStart + "'");
        }
        if (sEnd) {
            aClauses.push("PlannedFinishDate eq datetime'" + sEnd + "'");
        }
        if (hasValue(oContext.filters.tipoOrden)) {
            aClauses.push("OrderTypeCode eq '" +
                escapeODataString(oContext.filters.tipoOrden) + "'");
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
        return readEntitySet(oModel, sEntitySet, "").then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
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

    function build(oRawData, mFilters) {
        var oData = AnalisisElevadoresMapper.buildData(oRawData, mFilters);

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

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error(
                "El modelo OData 'dashboardOData' no está configurado"
            ));
        }
        oContext = getFilterContext(mFilters);
        if (!oContext.startDate || !oContext.endDate) {
            return Promise.reject(new Error(
                "Selecciona una fecha desde y una fecha hasta válidas"
            ));
        }
        if (oContext.startDate > oContext.endDate) {
            return Promise.reject(new Error(
                "La fecha desde no puede ser posterior a la fecha hasta"
            ));
        }

        sOrdersFilter = buildOrdersFilter(oContext);
        return RelatedData.load(oModel, {
            ordersFilter: sOrdersFilter,
            orderRelations: [
                { entitySet: "DashboardOrderCausesSet", target: "causes" },
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", oContext) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (oRelatedRaw) {
            var oRawData = createRawData(oContext);

            ["orders", "causes", "assignments", "resources", "catalogs"].forEach(function (sKey) {
                oRawData[sKey] = oRelatedRaw[sKey] || [];
            });
            oRawData.meta.unavailableEntitySets = oRelatedRaw.meta.unavailableEntitySets;
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
