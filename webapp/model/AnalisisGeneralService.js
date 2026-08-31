sap.ui.define([
    "mantenimiento/model/AnalisisGeneralMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (AnalisisGeneralMapper, RelatedData) {
    "use strict";

    function read(model, entitySet, filter) {
        var parameters = { "$format": "json" };
        if (filter) { parameters.$filter = filter; }
        return new Promise(function (resolve, reject) {
            model.read("/" + entitySet, {
                urlParameters: parameters,
                success: function (data) { resolve(Array.isArray(data && data.results) ? data.results : []); },
                error: function (error) { reject(new Error("No fue posible consultar " + entitySet + (error && error.message ? ": " + error.message : ""))); }
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
    function odataDate(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T00:00:00";
    }
    function ordersFilter(filters) {
        var selectedPeriod = AnalisisGeneralMapper.period(filters && filters.week || "2026-W26");
        return [
            "PlannedStartDate eq datetime'" + odataDate(selectedPeriod.startDate) + "'",
            "PlannedFinishDate eq datetime'" + odataDate(selectedPeriod.endDate) + "'"
        ].join(" and ");
    }
    function emptyRaw() {
        return { orders: [], causes: [], assignments: [], resources: [], catalogs: [], meta: { unavailableEntitySets: [] } };
    }
    function createEmpty(filters) { return AnalisisGeneralMapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var range = AnalisisGeneralMapper.period(filters && filters.week || "2026-W26");

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderCausesSet", target: "causes" },
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", range) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (raw) {
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: AnalisisGeneralMapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
