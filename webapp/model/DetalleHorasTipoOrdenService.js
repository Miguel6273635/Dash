sap.ui.define(["mantenimiento/model/DetalleHorasTipoOrdenMapper"], function (Mapper) {
    "use strict";
    function read(model, set, filter) { var p = { "$format": "json" }; if (filter) { p.$filter = filter; } return new Promise(function (resolve, reject) { model.read("/" + set, { urlParameters: p, success: function (d) { resolve(Array.isArray(d && d.results) ? d.results : []); }, error: function (e) { reject(new Error("No fue posible consultar " + set + (e && e.message ? ": " + e.message : ""))); } }); }); }
    function optional(model, set, filter) { return read(model, set, filter).then(function (records) { return { set: set, records: records }; }, function (error) { return { set: set, records: [], error: error.message }; }); }
    function odata(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "T00:00:00"; }
    function dateFilter(prop, f) { var r = Mapper.range(f); return prop + " ge datetime'" + odata(r.start) + "' and " + prop + " le datetime'" + odata(r.end) + "'"; }
    function ordersFilter(f) { var r = Mapper.range(f); return "PlannedStartDate eq datetime'" + odata(r.start) + "' and PlannedFinishDate eq datetime'" + odata(r.end) + "'"; }
    function empty() { return { orders: [], resources: [], assignments: [], operations: [], confirmations: [], catalogs: [], meta: { unavailableEntitySets: [] } }; }
    function createEmpty(f) { return Mapper.build(empty(), f); }
    function load(model, f) {
        var sets;
        if (!model || typeof model.read !== "function") { return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado")); }
        sets = [{ set: "DashboardOrdersSet", target: "orders", filter: ordersFilter(f) }, { set: "DashboardResourceDailySet", target: "resources", filter: dateFilter("WorkDate", f) }, { set: "DashboardOrderResourcesSet", target: "assignments" }, { set: "DashboardOrderOperationsSet", target: "operations", filter: dateFilter("PlannedStartDate", f) }, { set: "DashboardOrderConfirmationsSet", target: "confirmations", filter: dateFilter("ActualStartDate", f) }, { set: "DashboardFilterCatalogSet", target: "catalogs" }];
        return Promise.all(sets.map(function (x) { return optional(model, x.set, x.filter); })).then(function (result) { var raw = empty(); result.forEach(function (item, i) { raw[sets[i].target] = item.records; if (item.error) { raw.meta.unavailableEntitySets.push({ entitySet: item.set, message: item.error }); } }); raw.meta.filters = sets.map(function (x) { return { entitySet: x.set, filter: x.filter || "" }; }); return { data: Mapper.build(raw, f), rawData: raw }; });
    }
    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
