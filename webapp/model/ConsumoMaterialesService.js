sap.ui.define([
    "mantenimiento/model/ConsumoMaterialesMapper"
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
    function optional(model, entitySet) {
        return read(model, entitySet).then(function (records) {
            return { entitySet: entitySet, records: records };
        }, function (error) {
            return { entitySet: entitySet, records: [], error: error.message };
        });
    }
    function odataDate(value) {
        return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0") + "T00:00:00";
    }
    function ordersFilter(filters) {
        var selectedRange = Mapper.range(filters);
        return "PlannedStartDate eq datetime'" + odataDate(selectedRange.startDate) + "' and PlannedFinishDate eq datetime'" + odataDate(selectedRange.endDate) + "'";
    }
    function emptyRaw() { return Mapper.emptyRaw(); }
    function createEmpty(filters) { return Mapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var sets = {
            DashboardOrderMaterialsSet: "materials",
            DashboardMaterialMovementsSet: "movements",
            DashboardOrderCausesSet: "causes",
            DashboardOrderResourcesSet: "assignments",
            DashboardResourceDailySet: "resources",
            DashboardFilterCatalogSet: "catalogs"
        };
        if (!model || typeof model.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }
        return Promise.all([
            read(model, "DashboardOrdersSet", ordersFilter(filters)),
            Promise.all(Object.keys(sets).map(function (entitySet) { return optional(model, entitySet); }))
        ]).then(function (response) {
            var raw = emptyRaw();
            raw.orders = response[0];
            response[1].forEach(function (item) {
                raw[sets[item.entitySet]] = item.records;
                if (item.error) { raw.meta.unavailableEntitySets.push({ entitySet: item.entitySet, message: item.error }); }
            });
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
