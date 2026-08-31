sap.ui.define([
    "mantenimiento/model/ComportamientoOperativoMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (ComportamientoOperativoMapper, RelatedData) {
    "use strict";

    var AUXILIARY = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderResourcesSet: "assignments",
        DashboardResourceDailySet: "resources",
        DashboardFilterCatalogSet: "catalogs"
    };

    function displayDate(s) {
        var m = String(s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/), d;
        if (!m) { return null; }
        d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        return d.getFullYear() === Number(m[3]) && d.getMonth() === Number(m[2]) - 1 ? d : null;
    }
    function display(d) { return d ? String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear() : ""; }
    function odata(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + "T00:00:00"; }
    function context(filters) {
        var f = filters || {}, p = ComportamientoOperativoMapper.parsePeriod(f.periodo || "2026-ANUAL"), start = displayDate(f.fechaDesde) || (p && p.startDate), end = displayDate(f.fechaHasta) || (p && p.endDate);
        return { startDate: start, endDate: end, filters: { periodo: f.periodo || "2026-ANUAL", fechaDesde: display(start), fechaHasta: display(end), zona: f.zona || "TODAS", origen: f.origen || "TODAS" } };
    }
    function ordersFilter(c) { return ["PlannedStartDate eq datetime'" + odata(c.startDate) + "'", "(OrderTypeCode eq 'SM01' or OrderTypeCode eq 'SM02' or OrderTypeCode eq 'SM03')", "PlannedFinishDate eq datetime'" + odata(c.endDate) + "'"].join(" and "); }
    function read(model, set, filter) {
        var parameters = { "$format": "json" };
        if (filter) { parameters.$filter = filter; }
        return new Promise(function (resolve, reject) {
            model.read("/" + set, { urlParameters: parameters, success: function (data) { resolve(Array.isArray(data && data.results) ? data.results : []); }, error: function (error) { reject(new Error("No fue posible consultar " + set + (error && error.message ? ": " + error.message : ""))); } });
        });
    }
    function optional(model, set) { return read(model, set, "").then(function (records) { return { set: set, records: records }; }).catch(function (error) { return { set: set, records: [], error: error.message }; }); }
    function raw(c) { return { orders: [], causes: [], assignments: [], resources: [], catalogs: [], range: { startDate: c.startDate, endDate: c.endDate }, meta: { source: "BTP_DESTINATION_ODATA_V2", unavailableEntitySets: [] } }; }
    function build(rawData, filters) { var data = ComportamientoOperativoMapper.buildData(rawData, filters); data.meta = Object.assign({}, data.meta, rawData.meta); return data; }
    function createEmpty(filters) { var c = context(filters); return build(raw(c), c.filters); }
    function load(model, filters) {
        var c;
        c = context(filters);
        if (!c.startDate || !c.endDate) { return Promise.reject(new Error("Selecciona un periodo válido")); }
        if (c.startDate > c.endDate) { return Promise.reject(new Error("La fecha desde no puede ser posterior a la fecha hasta")); }

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(c),
            orderRelations: [
                { entitySet: "DashboardOrderCausesSet", target: "causes" },
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", c) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (response) {
            var data = raw(c);
            ["orders", "causes", "assignments", "resources", "catalogs"].forEach(function (sKey) {
                data[sKey] = response[sKey] || [];
            });
            data.meta.unavailableEntitySets = response.meta.unavailableEntitySets;
            data.meta.ordersFilter = ordersFilter(c); data.meta.records = { orders: data.orders.length, causes: data.causes.length, assignments: data.assignments.length, resources: data.resources.length, catalogs: data.catalogs.length };
            return { data: build(data, c.filters), rawData: data };
        });
    }
    return { load: load, build: build, createEmpty: createEmpty, getFilterContext: context, buildOrdersFilter: ordersFilter };
});
