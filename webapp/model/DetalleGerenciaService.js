sap.ui.define([
    "mantenimiento/model/DetalleGerenciaMapper",
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
    function optional(model, entitySet, filter) { return read(model, entitySet, filter).then(function (records) { return { entitySet: entitySet, records: records }; }, function (error) { return { entitySet: entitySet, records: [], error: error.message }; }); }
    function odataDate(value) { return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0") + "T00:00:00"; }
    function rangeFilter(property, filters) { var current = Mapper.range(filters); return property + " ge datetime'" + odataDate(current.start) + "' and " + property + " le datetime'" + odataDate(current.end) + "'"; }
    function ordersFilter(filters) { var current = Mapper.range(filters); return "PlannedStartDate eq datetime'" + odataDate(current.start) + "' and PlannedFinishDate eq datetime'" + odataDate(current.end) + "'"; }
    function empty() { return { resources: [], assignments: [], operations: [], orders: [], materials: [], movements: [], catalogs: [], meta: { unavailableEntitySets: [] } }; }
    function createEmpty(filters) { return Mapper.build(empty(), filters); }
    function load(model, filters) {
        var current = Mapper.range(filters);

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" },
                { entitySet: "DashboardOrderOperationsSet", target: "operations" },
                { entitySet: "DashboardOrderMaterialsSet", target: "materials" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", current) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ],
            materialMovements: { entitySet: "DashboardMaterialMovementsSet", target: "movements", from: "materials" }
        }).then(function (raw) {
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }
    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
