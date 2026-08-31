sap.ui.define([
    "mantenimiento/model/BalanceOperativoZonaMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (Mapper, RelatedData) {
    "use strict";

    function read(model, entitySet, filter) {
        var parameters = { "$format": "json" };
        if (filter) { parameters.$filter = filter; }
        return new Promise(function (resolve, reject) {
            model.read("/" + entitySet, {
                urlParameters: parameters,
                success: function (data) { resolve(Array.isArray(data && data.results) ? data.results : []); },
                error: function (error) {
                    reject(new Error("No fue posible consultar " + entitySet + (error && error.message ? ": " + error.message : "")));
                }
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

    /* El servicio expone el periodo del dashboard con las dos fechas exactas. */
    function buildOrdersFilter(filters) {
        var currentRange = Mapper.range(filters);
        return "PlannedStartDate eq datetime'" + odataDate(currentRange.startDate) + "' and PlannedFinishDate eq datetime'" + odataDate(currentRange.endDate) + "'";
    }

    function createEmpty(filters) { return Mapper.build(Mapper.emptyRaw(), filters); }

    function load(model, filters) {
        var currentRange = Mapper.range(filters);

        return RelatedData.load(model, {
            ordersFilter: buildOrdersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" },
                { entitySet: "DashboardOrderOperationsSet", target: "operations" },
                { entitySet: "DashboardOrderConfirmationsSet", target: "confirmations" },
                { entitySet: "DashboardOrderEventsSet", target: "events" },
                { entitySet: "DashboardOrderRequirementsSet", target: "requirements" },
                { entitySet: "DashboardOrderMaterialsSet", target: "materials" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", currentRange) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ]
        }).then(function (raw) {
            raw.meta.ordersFilter = buildOrdersFilter(filters);
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: buildOrdersFilter };
});
