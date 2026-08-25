sap.ui.define([
    "mantenimiento/model/TendenciaEjecucionMapper"
], function (TendenciaEjecucionMapper) {
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
         * SAP expone el periodo mediante igualdad de inicio/fin. Por esa
         * razón una semana no puede enviarse como "lunes - domingo": solo
         * devolvería OT que coincidan exactamente con ambas fechas. Siempre
         * se consulta el año del periodo elegido y el Mapper separa después
         * las OT por su PlannedStartDate en las semanas correspondientes.
         */
        var selectedPeriod = String(filters && filters.period || "2026-ANUAL");
        var yearMatch = selectedPeriod.match(/^(\d{4})-/);
        var range = TendenciaEjecucionMapper.period((yearMatch ? yearMatch[1] : "2026") + "-ANUAL");
        return [
            "PlannedStartDate eq datetime'" + odataDate(range.startDate) + "'",
            "PlannedFinishDate eq datetime'" + odataDate(range.endDate) + "'"
        ].join(" and ");
    }
    function emptyRaw() { return { orders: [], causes: [], assignments: [], resources: [], catalogs: [], meta: { unavailableEntitySets: [] } }; }
    function createEmpty(filters) { return TendenciaEjecucionMapper.build(emptyRaw(), filters); }
    function load(model, filters) {
        var maps = { DashboardOrderCausesSet: "causes", DashboardOrderResourcesSet: "assignments", DashboardResourceDailySet: "resources", DashboardFilterCatalogSet: "catalogs" };
        if (!model || typeof model.read !== "function") { return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado")); }
        return Promise.all([read(model, "DashboardOrdersSet", ordersFilter(filters)), Promise.all(Object.keys(maps).map(function (entitySet) { return optional(model, entitySet); }))]).then(function (response) {
            var raw = emptyRaw();
            raw.orders = response[0];
            response[1].forEach(function (item) { raw[maps[item.entitySet]] = item.records; if (item.error) { raw.meta.unavailableEntitySets.push({ entitySet: item.entitySet, message: item.error }); } });
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: TendenciaEjecucionMapper.build(raw, filters), rawData: raw };
        });
    }
    return { load: load, createEmpty: createEmpty, build: TendenciaEjecucionMapper.build, buildOrdersFilter: ordersFilter };
});
