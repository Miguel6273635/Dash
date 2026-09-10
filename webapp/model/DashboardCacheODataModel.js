sap.ui.define([
    "mantenimiento/model/DashboardCacheApiService"
], function (DashboardCacheApiService) {
    "use strict";

    /*
     * Adaptador de compatibilidad para los servicios de pantalla que todavía
     * esperan un sap.ui.model.odata.v2.ODataModel. Nunca delega al modelo
     * recibido: satisface read() exclusivamente desde la generación activa de
     * API_DASH y aplica localmente los filtros simples que ya usaban esas
     * pantallas.
     */
    var ENTITY_TARGETS = {
        DashboardOrdersSet: "orders",
        DashboardOrderCausesSet: "causes",
        DashboardOrderMaterialsSet: "materials",
        DashboardMaterialMovementsSet: "movements",
        DashboardOrderResourcesSet: "assignments",
        DashboardOrderOperationsSet: "operations",
        DashboardOrderConfirmationsSet: "confirmations",
        DashboardOrderEventsSet: "events",
        DashboardOrderRequirementsSet: "requirements",
        DashboardBlockOrdersSet: "blockOrders",
        DashboardResourceDailySet: "resources",
        DashboardFilterCatalogSet: "catalogs",
        DashboardServiceRequestsSet: "serviceRequests",
        DashboardEquipmentBlocksSet: "blocks",
        DashboardBlockEventsSet: "blockEvents"
    };

    function asIsoDate(value) {
        var match;
        var date;

        if (!value) {
            return "";
        }
        if (value instanceof Date) {
            return value.getFullYear() + "-" +
                String(value.getMonth() + 1).padStart(2, "0") + "-" +
                String(value.getDate()).padStart(2, "0");
        }

        match = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (match) {
            return match[3] + "-" + match[2] + "-" + match[1];
        }

        match = String(value).match(/\/Date\((-?\d+)/);
        if (match) {
            date = new Date(Number(match[1]));
            return date.getUTCFullYear() + "-" +
                String(date.getUTCMonth() + 1).padStart(2, "0") + "-" +
                String(date.getUTCDate()).padStart(2, "0");
        }

        match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : "";
    }

    function rangeFor(filters) {
        var values = filters || {};
        var today = new Date();
        var year = today.getFullYear();
        var from = asIsoDate(
            values.fechaDesde || values.fechaInicio || values.dateFrom ||
            values.startDate || values.from
        );
        var to = asIsoDate(
            values.fechaHasta || values.fechaFin || values.dateTo ||
            values.endDate || values.to
        );

        return {
            fechaDesde: from || year + "-01-01",
            fechaHasta: to || year + "-12-31"
        };
    }

    function normalize(value) {
        return value === null || value === undefined ? "" : String(value);
    }

    function compare(left, operator, right) {
        var a = normalize(left);
        var b = normalize(right);

        if (operator === "EQ") {
            return a === b;
        }
        if (operator === "NE") {
            return a !== b;
        }
        if (operator === "GE") {
            return a >= b;
        }
        if (operator === "LE") {
            return a <= b;
        }
        if (operator === "GT") {
            return a > b;
        }
        if (operator === "LT") {
            return a < b;
        }
        return true;
    }

    function matchesUi5Filter(record, filter) {
        var children;
        var operator;
        var value;

        if (!filter) {
            return true;
        }
        children = filter.aFilters || filter.filters;
        if (Array.isArray(children) && children.length) {
            if (filter.bAnd === false) {
                return children.some(function (item) {
                    return matchesUi5Filter(record, item);
                });
            }
            return children.every(function (item) {
                return matchesUi5Filter(record, item);
            });
        }

        operator = String(filter.sOperator || filter.operator || "EQ").toUpperCase();
        value = filter.oValue1 !== undefined ? filter.oValue1 : filter.value1;
        return compare(record[filter.sPath || filter.path], operator, asIsoDate(value) || value);
    }

    function matchesTextFilter(record, expression) {
        var terms = [];
        var matcher = /(\w+)\s+(eq|ne|ge|le|gt|lt)\s+(?:datetime)?'([^']*)'/gi;
        var match;

        if (!expression) {
            return true;
        }
        while ((match = matcher.exec(expression))) {
            terms.push({
                property: match[1],
                operator: match[2].toUpperCase(),
                value: match[3]
            });
        }
        if (!terms.length) {
            return true;
        }

        if (/\s+or\s+/i.test(expression) && terms.every(function (term) {
            return term.property === terms[0].property;
        })) {
            return terms.some(function (term) {
                return compare(
                    asIsoDate(record[term.property]) || record[term.property],
                    term.operator,
                    asIsoDate(term.value) || term.value
                );
            });
        }

        return terms.every(function (term) {
            return compare(
                asIsoDate(record[term.property]) || record[term.property],
                term.operator,
                asIsoDate(term.value) || term.value
            );
        });
    }

    function filtered(records, options) {
        var config = options || {};
        var ui5Filters = config.filters || [];
        var parameters = config.urlParameters || {};
        var textFilter = parameters.$filter;
        var skip = Math.max(0, Number(parameters.$skip) || 0);
        var top = Number(parameters.$top);
        var rows = (records || []).filter(function (record) {
            return matchesTextFilter(record, textFilter) &&
                ui5Filters.every(function (filter) {
                    return matchesUi5Filter(record, filter);
                });
        });

        if (Number.isFinite(top) && top > 0) {
            return rows.slice(skip, skip + top);
        }
        return rows.slice(skip);
    }

    function sourceForPath(path) {
        return String(path || "")
            .replace(/^\//, "")
            .split("?")[0];
    }

    function wrap(model, filters, include) {
        var requested = (include || Object.keys(ENTITY_TARGETS)).slice();
        var snapshot = DashboardCacheApiService.loadSnapshot(
            rangeFor(filters),
            requested
        );

        return {
            __apiDashCache: true,
            read: function (path, settings) {
                var config = settings || {};
                var entitySet = sourceForPath(path);
                var target = ENTITY_TARGETS[entitySet];

                if (!target) {
                    config.error && config.error({
                        message: "API_DASH no reconoce el EntitySet " + entitySet
                    });
                    return;
                }

                snapshot.then(function (data) {
                    var rows = filtered(data[target] || [], config);

                    config.success && config.success({
                        results: rows
                    });
                }).catch(function (error) {
                    config.error && config.error({
                        message: error && error.message ? error.message : String(error)
                    });
                });
            }
        };
    }

    return {
        wrap: wrap,
        rangeFor: rangeFor,
        entityTargets: ENTITY_TARGETS
    };
});
