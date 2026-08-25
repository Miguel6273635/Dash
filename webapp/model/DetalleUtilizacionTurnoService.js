sap.ui.define([
    "mantenimiento/model/DetalleUtilizacionTurnoMapper"
], function (Mapper) {
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
        var definitions;
        if (!model || typeof model.read !== "function") { return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado")); }
        definitions = [
            { set: "DashboardResourceDailySet", target: "resources", filter: rangeFilter("WorkDate", filters) },
            { set: "DashboardOrderResourcesSet", target: "assignments" },
            { set: "DashboardOrderOperationsSet", target: "operations", filter: rangeFilter("PlannedStartDate", filters) },
            { set: "DashboardOrderConfirmationsSet", target: "confirmations", filter: rangeFilter("ActualStartDate", filters) },
            { set: "DashboardOrdersSet", target: "orders", filter: ordersFilter(filters) },
            { set: "DashboardFilterCatalogSet", target: "catalogs" }
        ];
        return Promise.all(definitions.map(function (item) { return optional(model, item.set, item.filter); })).then(function (result) {
            var raw = emptyRaw();
            result.forEach(function (item, index) {
                raw[definitions[index].target] = item.records;
                if (item.error) { raw.meta.unavailableEntitySets.push({ entitySet: item.entitySet, message: item.error }); }
            });
            raw.meta.filters = definitions.map(function (item) { return { entitySet: item.set, filter: item.filter || "" }; });
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
