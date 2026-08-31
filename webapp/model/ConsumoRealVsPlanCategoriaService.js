sap.ui.define([
    "mantenimiento/model/ConsumoRealVsPlanCategoriaMapper",
    "mantenimiento/model/ODataRelatedDataService"
], function (Mapper, RelatedData) {
    "use strict";
    function odataDate(value) { return value.getFullYear() + "-" + String(value.getMonth() + 1).padStart(2, "0") + "-" + String(value.getDate()).padStart(2, "0") + "T00:00:00"; }
    function ordersFilter(filters) { var currentRange = Mapper.range(filters); return "PlannedStartDate eq datetime'" + odataDate(currentRange.startDate) + "' and PlannedFinishDate eq datetime'" + odataDate(currentRange.endDate) + "'"; }
    function createEmpty(filters) { return Mapper.build(Mapper.emptyRaw(), filters); }
    function load(model, filters) {
        var currentRange = Mapper.range(filters);

        return RelatedData.load(model, {
            ordersFilter: ordersFilter(filters),
            orderRelations: [
                { entitySet: "DashboardOrderMaterialsSet", target: "materials" },
                { entitySet: "DashboardOrderResourcesSet", target: "assignments" }
            ],
            independent: [
                { entitySet: "DashboardResourceDailySet", target: "resources", filter: RelatedData.rangeFilter("WorkDate", currentRange) },
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
