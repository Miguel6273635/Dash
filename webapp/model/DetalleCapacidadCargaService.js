sap.ui.define([
    "mantenimiento/model/DetalleCapacidadCargaMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (Mapper, RelatedData) {
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
        }, function (error) {
            return { entitySet: entitySet, records: [], error: error.message };
        });
    }
    function odataDate(value) {
        return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0") + "T00:00:00";
    }
    function dateFilter(property, filters) {
        var current = Mapper.context(filters);
        return property + " ge datetime'" + odataDate(current.startDate) + "' and " + property + " le datetime'" + odataDate(current.endDate) + "'";
    }
    function emptyRaw() {
        return { orders: [], resources: [], assignments: [], operations: [], confirmations: [], catalogs: [], meta: { unavailableEntitySets: [] } };
    }
    function createEmpty(filters) { return Mapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var current = Mapper.context(filters);
        var orders = "PlannedStartDate eq datetime'" + odataDate(current.startDate) +
            "' and PlannedFinishDate eq datetime'" + odataDate(current.endDate) + "'";

        return RelatedData.load(model, {
            ordersFilter: orders,
            orderRelations: [
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" },
                { entitySet: "DashboardOrderOperationsSet", target: "operations" },
                { entitySet: "DashboardOrderConfirmationsSet", target: "confirmations" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", current) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (raw) {
            raw.meta.ordersFilter = orders;
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildFilter: dateFilter };
});
