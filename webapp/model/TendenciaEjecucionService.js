sap.ui.define([
    "mantenimiento/model/TendenciaEjecucionMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (TendenciaEjecucionMapper, RelatedData) {
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
        return read(model, entitySet).then(function (records) { return { entitySet: entitySet, records: records }; }).catch(function (error) { return { entitySet: entitySet, records: [], error: error.message }; });
    }
    function odataDate(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + "T00:00:00";
    }
    function ordersFilter(filters) {
        /*
         * El servicio BTP interpreta estas dos fechas como el rango del
         * periodo. Al seleccionar una semana se envía la ventana de cinco
         * semanas que termina en ella; al seleccionar "Anual", se envía el
         * año completo. El Mapper asigna cada OT por PlannedStartDate.
         */
        var range = TendenciaEjecucionMapper.period(filters && filters.period || "2026-ANUAL");
        return [
            "PlannedStartDate eq datetime'" + odataDate(range.startDate) + "'",
            "PlannedFinishDate eq datetime'" + odataDate(range.endDate) + "'"
        ].join(" and ");
    }
    function emptyRaw() { return { orders: [], causes: [], assignments: [], resources: [], catalogs: [], meta: { unavailableEntitySets: [] } }; }
    function createEmpty(filters) { return TendenciaEjecucionMapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var range = TendenciaEjecucionMapper.period(filters && filters.period || "2026-ANUAL");

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderCausesSet", target: "causes" },
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", range) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (raw) {
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: TendenciaEjecucionMapper.build(raw, filters), rawData: raw };
        });
    }
    return { load: load, createEmpty: createEmpty, build: TendenciaEjecucionMapper.build, buildOrdersFilter: ordersFilter };
});
