sap.ui.define([
    "mantenimiento/model/DetalleHorasTipoOrdenMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (Mapper, RelatedData) {
    "use strict";
    function read(model, set, filter) { var p = { "$format": "json" }; if (filter) { p.$filter = filter; } return new Promise(function (resolve, reject) { model.read("/" + set, { urlParameters: p, success: function (d) { resolve(Array.isArray(d && d.results) ? d.results : []); }, error: function (e) { reject(new Error("No fue posible consultar " + set + (e && e.message ? ": " + e.message : ""))); } }); }); }
    function optional(model, set, filter) { return read(model, set, filter).then(function (records) { return { set: set, records: records }; }, function (error) { return { set: set, records: [], error: error.message }; }); }
    function odata(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "T00:00:00"; }
    function dateFilter(prop, f) { var r = Mapper.range(f); return prop + " ge datetime'" + odata(r.start) + "' and " + prop + " le datetime'" + odata(r.end) + "'"; }
    function ordersFilter(f) { var r = Mapper.range(f); return "PlannedStartDate eq datetime'" + odata(r.start) + "' and PlannedFinishDate eq datetime'" + odata(r.end) + "'"; }
    function empty() { return { orders: [], resources: [], assignments: [], operations: [], confirmations: [], catalogs: [], meta: { unavailableEntitySets: [] } }; }
    function createEmpty(f) { return Mapper.build(empty(), f); }
    function load(model, f) {
        var current = Mapper.range(f);

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(f),
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
            raw.meta.ordersFilter = ordersFilter(f);
            return { data: Mapper.build(raw, f), rawData: raw };
        });
    }
    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
