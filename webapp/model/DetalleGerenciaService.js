sap.ui.define(["mantenimiento/model/DetalleGerenciaMapper"], function (Mapper) {
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
        var requests = [
            { entitySet: "DashboardResourceDailySet", target: "resources", filter: rangeFilter("WorkDate", filters) },
            { entitySet: "DashboardOrderResourcesSet", target: "assignments" },
            { entitySet: "DashboardOrderOperationsSet", target: "operations", filter: rangeFilter("PlannedStartDate", filters) },
            { entitySet: "DashboardOrdersSet", target: "orders", filter: ordersFilter(filters) },
            { entitySet: "DashboardOrderMaterialsSet", target: "materials", filter: rangeFilter("RequiredDate", filters) },
            { entitySet: "DashboardMaterialMovementsSet", target: "movements", filter: rangeFilter("MovementDate", filters) },
            { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
        ], raw = empty();
        if (!model || typeof model.read !== "function") { return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado")); }
        return Promise.all(requests.map(function (request) { return optional(model, request.entitySet, request.filter); })).then(function (results) {
            results.forEach(function (result, index) { raw[requests[index].target] = result.records; if (result.error) { raw.meta.unavailableEntitySets.push({ entitySet: result.entitySet, message: result.error }); } });
            raw.meta.filters = requests.map(function (request) { return { entitySet: request.entitySet, filter: request.filter || "" }; });
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }
    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
