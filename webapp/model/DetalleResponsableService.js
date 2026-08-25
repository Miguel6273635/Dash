sap.ui.define([
    "mantenimiento/model/DetalleResponsableMapper"
], function (DetalleResponsableMapper) {
    "use strict";

    function read(model, entitySet, filter) {
        var parameters = { "$format": "json" };
        if (filter) {
            parameters.$filter = filter;
        }
        return new Promise(function (resolve, reject) {
            model.read("/" + entitySet, {
                urlParameters: parameters,
                success: function (data) {
                    resolve(Array.isArray(data && data.results) ? data.results : []);
                },
                error: function (error) {
                    reject(new Error("No fue posible consultar " + entitySet +
                        (error && error.message ? ": " + error.message : "")));
                }
            });
        });
    }

    function optional(model, entitySet) {
        return read(model, entitySet).then(function (records) {
            return { entitySet: entitySet, records: records };
        }).catch(function (error) {
            return { entitySet: entitySet, records: [], error: error.message };
        });
    }

    function asODataDate(date) {
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0") + "T00:00:00";
    }

    function ordersFilter(filters) {
        var range = DetalleResponsableMapper.period(filters.periodKey || "2026-ANUAL");
        return [
            "PlannedStartDate ge datetime'" + asODataDate(range.startDate) + "'",
            "PlannedStartDate le datetime'" + asODataDate(range.endDate) + "'",
            "(OrderTypeCode eq 'SM01' or OrderTypeCode eq 'SM02' or OrderTypeCode eq 'SM03')"
        ].join(" and ");
    }

    function raw(range) {
        return {
            orders: [],
            causes: [],
            assignments: [],
            resources: [],
            catalogs: [],
            events: [],
            range: range,
            meta: { unavailableEntitySets: [] }
        };
    }

    function createEmpty(filters) {
        return DetalleResponsableMapper.build(raw(null), filters);
    }

    function load(model, filters) {
        var names = {
            DashboardOrderCausesSet: "causes",
            DashboardOrderResourcesSet: "assignments",
            DashboardResourceDailySet: "resources",
            DashboardFilterCatalogSet: "catalogs",
            DashboardOrderEventsSet: "events"
        };
        var range = DetalleResponsableMapper.period(filters.periodKey || "2026-ANUAL");

        if (!model || typeof model.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }
        return Promise.all([
            read(model, "DashboardOrdersSet", ordersFilter(filters)),
            Promise.all(Object.keys(names).map(function (entitySet) { return optional(model, entitySet); }))
        ]).then(function (result) {
            var data = raw(range);
            data.orders = result[0];
            result[1].forEach(function (item) {
                data[names[item.entitySet]] = item.records;
                if (item.error) {
                    data.meta.unavailableEntitySets.push({ entitySet: item.entitySet, message: item.error });
                }
            });
            data.meta.ordersFilter = ordersFilter(filters);
            return { data: DetalleResponsableMapper.build(data, filters), rawData: data };
        });
    }

    return {
        load: load,
        createEmpty: createEmpty,
        buildOrdersFilter: ordersFilter,
        build: DetalleResponsableMapper.build
    };
});
