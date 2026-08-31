sap.ui.define([
    "mantenimiento/model/DetalleUtilizacionTurnoMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (Mapper, RelatedData) {
    "use strict";

    function read(model, entitySet, filter) {
        var parameters = { "$format": "json" };
        if (filter) { parameters.$filter = filter; }
        return new Promise(function (resolve, reject) {
            model.read("/" + entitySet, { urlParameters: parameters, success: function (data) { resolve(Array.isArray(data && data.results) ? data.results : []); }, error: function (error) { reject(new Error("No fue posible consultar " + entitySet + (error && error.message ? ": " + error.message : ""))); } });
        });
    }
    function optional(model, entitySet, filter) {
        return read(model, entitySet, filter).then(function (records) { return { entitySet: entitySet, records: records }; }, function (error) { return { entitySet: entitySet, records: [], error: error.message }; });
    }
    function dateText(value) { return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0") + "T00:00:00"; }
    function rangeFilter(field, filters) {
        var range = Mapper.context(filters);
        return field + " ge datetime'" + dateText(range.startDate) + "' and " + field + " le datetime'" + dateText(range.endDate) + "'";
    }
    function ordersFilter(filters) {
        var range = Mapper.context(filters);
        return "PlannedStartDate eq datetime'" + dateText(range.startDate) + "' and PlannedFinishDate eq datetime'" + dateText(range.endDate) + "'";
    }
    function emptyRaw() { return { resources: [], assignments: [], operations: [], confirmations: [], orders: [], catalogs: [], meta: { unavailableEntitySets: [] } }; }
    function createEmpty(filters) { return Mapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var current = Mapper.context(filters);

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
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
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
