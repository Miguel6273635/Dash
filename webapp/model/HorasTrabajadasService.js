sap.ui.define([
    "mantenimiento/model/HorasTrabajadasMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (HorasTrabajadasMapper, RelatedData) {
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
    function optional(model, entitySet, filter) {
        return read(model, entitySet, filter).then(function (records) {
            return { entitySet: entitySet, records: records };
        }).catch(function (error) {
            return { entitySet: entitySet, records: [], error: error.message };
        });
    }
    function odataDate(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T00:00:00";
    }
    function ordersFilter(filters) {
        var selectedRange = HorasTrabajadasMapper.range(filters);
        return [
            "PlannedStartDate eq datetime'" + odataDate(selectedRange.startDate) + "'",
            "PlannedFinishDate eq datetime'" + odataDate(selectedRange.endDate) + "'"
        ].join(" and ");
    }
    function emptyRaw() {
        return { orders: [], resources: [], assignments: [], operations: [], confirmations: [], causes: [], catalogs: [], meta: { unavailableEntitySets: [] } };
    }
    function createEmpty(filters) { return HorasTrabajadasMapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var selectedRange = HorasTrabajadasMapper.range(filters);

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" },
                { entitySet: "DashboardOrderOperationsSet", target: "operations" },
                { entitySet: "DashboardOrderConfirmationsSet", target: "confirmations" },
                { entitySet: "DashboardOrderCausesSet", target: "causes" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", selectedRange) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (raw) {
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: HorasTrabajadasMapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
