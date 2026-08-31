sap.ui.define([
    "mantenimiento/model/ConsumoMaterialesMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (Mapper, RelatedData) {
    "use strict";

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
        var selectedRange = Mapper.range(filters);

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderMaterialsSet", target: "materials" },
                { entitySet: "DashboardOrderCausesSet", target: "causes" },
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", selectedRange) },
                { entitySet: "DashboardFilterCatalogSet", target: "catalogs" }
            ],
            materialMovements: { entitySet: "DashboardMaterialMovementsSet", target: "movements", from: "materials" }
        }).then(function (raw) {
            raw.meta.ordersFilter = ordersFilter(filters);
            return { data: Mapper.build(raw, filters), rawData: raw };
        });
    }

    return { load: load, createEmpty: createEmpty, buildOrdersFilter: ordersFilter };
});
