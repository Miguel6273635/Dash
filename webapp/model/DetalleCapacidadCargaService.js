sap.ui.define([
    "mantenimiento/model/DetalleCapacidadCargaMapper"
], function (Mapper) {
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
        return { resources: [], assignments: [], operations: [], confirmations: [], catalogs: [], meta: { unavailableEntitySets: [] } };
    }
    function createEmpty(filters) { return Mapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var definitions;
        if (!model || typeof model.read !== "function") { return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado")); }
        definitions = [
            { set: "DashboardResourceDailySet", field: "resources", filter: dateFilter("WorkDate", filters) },
            { set: "DashboardOrderResourcesSet", field: "assignments" },
            { set: "DashboardOrderOperationsSet", field: "operations", filter: dateFilter("PlannedStartDate", filters) },
            { set: "DashboardOrderConfirmationsSet", field: "confirmations", filter: dateFilter("ActualStartDate", filters) },
            { set: "DashboardFilterCatalogSet", field: "catalogs" }
        ];
        return Promise.all(definitions.map(function (item) { return optional(model, item.set, item.filter); })).then(function (response) {
            var raw = emptyRaw();
            response.forEach(function (item, index) {
                raw[definitions[index].field] = item.records;
                if (item.error) { raw.meta.unavailableEntitySets.push({ entitySet: item.entitySet, message: item.error }); }
            });
            raw.meta.filters = definitions.map(function (item) { return { entitySet: item.set, filter: item.filter || "" }; });
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildFilter: dateFilter };
});
