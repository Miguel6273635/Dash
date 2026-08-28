sap.ui.define([
    "mantenimiento/model/ConsumoRealVsPlanCategoriaMapper"
], function (Mapper) {
    "use strict";
    function read(model, entitySet, filter) {
        var params = { "$format": "json" };
        if (filter) { params.$filter = filter; }
        return new Promise(function (resolve, reject) {
            model.read("/" + entitySet, { urlParameters: params, success: function (data) { resolve(Array.isArray(data && data.results) ? data.results : []); }, error: function (error) { reject(new Error("No fue posible consultar " + entitySet + (error && error.message ? ": " + error.message : ""))); } });
        });
    }
    function optional(model, entitySet) { return read(model, entitySet).then(function (records) { return { entitySet: entitySet, records: records }; }, function (error) { return { entitySet: entitySet, records: [], error: error.message }; }); }
    function odataDate(value) { return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0") + "T00:00:00"; }
    function ordersFilter(filters) { var currentRange = Mapper.range(filters); return "PlannedStartDate eq datetime'" + odataDate(currentRange.startDate) + "' and PlannedFinishDate eq datetime'" + odataDate(currentRange.endDate) + "'"; }
    function createEmpty(filters) { return Mapper.build(Mapper.emptyRaw(), filters); }
    function load(model, filters) {
        var targets = { DashboardOrderMaterialsSet: "materials", DashboardMaterialMovementsSet: "movements", DashboardOrderResourcesSet: "assignments", DashboardResourceDailySet: "resources", DashboardFilterCatalogSet: "catalogs" };
        if (!model || typeof model.read !== "function") { return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado")); }
        return Promise.all([read(model, "DashboardOrdersSet", ordersFilter(filters)), Promise.all(Object.keys(targets).map(function (entitySet) { return optional(model, entitySet); }))]).then(function (response) {
            var raw = Mapper.emptyRaw(); raw.orders = response[0];
            response[1].forEach(function (item) { raw[targets[item.entitySet]] = item.records; if (item.error) { raw.meta.unavailableEntitySets.push({ entitySet: item.entitySet, message: item.error }); } });
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }
    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
