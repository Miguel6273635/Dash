sap.ui.define([
    "mantenimiento/model/HorasTrabajadasMapper"
], function (HorasTrabajadasMapper) {
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
        var entitySets = {
            DashboardResourceDailySet: "resources",
            DashboardOrderResourcesSet: "assignments",
            DashboardOrderOperationsSet: "operations",
            DashboardOrderConfirmationsSet: "confirmations",
            DashboardOrderCausesSet: "causes",
            DashboardFilterCatalogSet: "catalogs"
        };
        if (!model || typeof model.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }
        return Promise.all([
            read(model, "DashboardOrdersSet", ordersFilter(filters)),
            Promise.all(Object.keys(entitySets).map(function (entitySet) { return optional(model, entitySet); }))
        ]).then(function (response) {
            var raw = emptyRaw();
            raw.orders = response[0];
            response[1].forEach(function (item) {
                raw[entitySets[item.entitySet]] = item.records;
                if (item.error) { raw.meta.unavailableEntitySets.push({ entitySet: item.entitySet, message: item.error }); }
            });
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: HorasTrabajadasMapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
