sap.ui.define([
    "mantenimiento/model/DetalleResponsableMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (DetalleResponsableMapper, RelatedData) {
    "use strict";

    function read(model, entitySet, filter) {
        var parameters = { "$format": "json" };
        if (filter) {
            parameters.$filter = filter;
        }
        return new Promise(function (resolve, reject) {
            model.read("/" + entitySet, {
                urlParameters: parameters,
                success: function (data) {
                    resolve(Array.isArray(data && data.results) ? data.results : []);
                },
                error: function (error) {
                    reject(new Error("No fue posible consultar " + entitySet +
                        (error && error.message ? ": " + error.message : "")));
                }
            });
        });
    }

    function optional(model, entitySet) {
        return read(model, entitySet).then(function (records) {
            return { entitySet: entitySet, records: records };
        }).catch(function (error) {
            return { entitySet: entitySet, records: [], error: error.message };
        });
    }

    function asODataDate(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0") + "T00:00:00";
    }

    function ordersFilter(filters) {
        var range = DetalleResponsableMapper.period(filters.periodKey || "2026-ANUAL");
        return [
            "PlannedStartDate ge datetime'" + asODataDate(range.startDate) + "'",
            "PlannedStartDate le datetime'" + asODataDate(range.endDate) + "'",
            "(OrderTypeCode eq 'SM01' or OrderTypeCode eq 'SM02' or OrderTypeCode eq 'SM03')"
        ].join(" and ");
    }

    function raw(range) {
        return {
            orders: [],
            causes: [],
            assignments: [],
            resources: [],
            catalogs: [],
            events: [],
            range: range,
            meta: { unavailableEntitySets: [] }
        };
    }

    function createEmpty(filters) {
        return DetalleResponsableMapper.build(raw(null), filters);
    }

    function load(model, filters) {
        var range = DetalleResponsableMapper.period(filters.periodKey || "2026-ANUAL");

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderCausesSet", target: "causes" },
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" },
                { entitySet: "DashboardOrderEventsSet", target: "events" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", range) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (result) {
            var data = raw(range);
            ["orders", "causes", "assignments", "resources", "catalogs", "events"].forEach(function (sKey) {
                data[sKey] = result[sKey] || [];
            });
            data.meta.unavailableEntitySets = result.meta.unavailableEntitySets;
            data.meta.ordersFilter = ordersFilter(filters);
            return { data: DetalleResponsableMapper.build(data, filters), rawData: data };
        });
    }

    return {
        load: load,
        createEmpty: createEmpty,
        buildOrdersFilter: ordersFilter,
        build: DetalleResponsableMapper.build
    };
});
