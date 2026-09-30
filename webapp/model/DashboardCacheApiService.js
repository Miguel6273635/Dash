sap.ui.define([], function () {
    "use strict";

    var API_BASE = window.location.hostname.indexOf(".applicationstudio.cloud.sap") !== -1
        ? "/api/v1"
        : "/dynamic_dest/api-dash/api/v1";
    var GLOBAL_COLLECTIONS = {
        catalogs: true,
        blocks: true,
        blockEvents: true,
        serviceRequests: true
    };
    var RECORD_IDS = {
        orders: "OrderId",
        causes: "OrderCauseId",
        materials: "MaterialRequirementId",
        movements: "MaterialMovementId",
        assignments: "OrderResourceId",
        operations: "OperationKey",
        confirmations: "ConfirmationId",
        events: "OrderEventId",
        requirements: "RequirementId",
        blockOrders: "BlockOrderId",
        resources: "ResourceDateId",
        catalogs: "FilterCatalogId",
        serviceRequests: "RequestId",
        blocks: "BlockId",
        blockEvents: "BlockEventId"
    };

    function request(path, options) {
        var config = options || {};
        var headers = Object.assign({ Accept: "application/json" }, config.headers || {});

        return window.fetch(path, Object.assign({}, config, {
            credentials: "same-origin",
            headers: headers
        })).then(function (response) {
            return response.json().catch(function () {
                return {};
            }).then(function (payload) {
                if (!response.ok || payload.success === false) {
                    throw new Error(
                        payload.detail ||
                        payload.message ||
                        "No fue posible consultar la API de caché"
                    );
                }

                return payload.data;
            });
        });
    }

    function toQuery(filters) {
        var query = new URLSearchParams();

        Object.keys(filters || {}).forEach(function (key) {
            var value = filters[key];

            if (value !== undefined && value !== null && value !== "") {
                query.set(
                    key,
                    Array.isArray(value) ? value.join(",") : String(value)
                );
            }
        });

        return query.toString();
    }

    function isoDate(value, label) {
        var match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
        var parsed;

        if (!match) {
            throw new Error("Fecha inválida (" + label + "): " + value);
        }
        parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
        if (parsed.toISOString().slice(0, 10) !== match[0]) {
            throw new Error("Fecha inválida (" + label + "): " + value);
        }
        return match[0];
    }

    function monthRanges(filters) {
        var from = isoDate(filters && filters.fechaDesde, "fechaDesde");
        var to = isoDate(filters && filters.fechaHasta, "fechaHasta");
        var cursor = new Date(from.slice(0, 4) + "-" + from.slice(5, 7) + "-01T00:00:00Z");
        var ranges = [];
        var end;
        var monthEnd;

        if (from > to) {
            throw new Error("La fecha desde no puede ser posterior a la fecha hasta");
        }
        while (cursor.toISOString().slice(0, 10) <= to) {
            end = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0));
            monthEnd = end.toISOString().slice(0, 10);
            ranges.push({
                fechaDesde: from > cursor.toISOString().slice(0, 10)
                    ? from : cursor.toISOString().slice(0, 10),
                fechaHasta: to < monthEnd ? to : monthEnd,
                month: cursor.toISOString().slice(0, 7)
            });
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
        return ranges;
    }

    function targetsFor(include) {
        var values = Array.isArray(include) ? include : String(include || "orders,catalogs").split(",");

        return values.map(function (value) { return String(value).trim(); })
            .filter(function (value, index, all) {
                return value && all.indexOf(value) === index;
            });
    }

    // El backend conserva la precarga anual, pero serializar todas las
    // colecciones del año en una respuesta supera el límite de V8. Pedimos
    // una entidad por mes; los catálogos y otros conjuntos globales, una vez.
    function loadSnapshotPartitioned(filters, include) {
        var ranges;
        var targets;

        try {
            ranges = monthRanges(filters);
            targets = targetsFor(include);
        } catch (error) {
            return Promise.reject(error);
        }

        var output = { meta: { cache: {}, months: ranges.map(function (item) {
            return item.month;
        }), cacheOnly: true } };
        var indexed = {};
        var unkeyed = {};
        var generation = null;
        var tasks = [];

        targets.forEach(function (target) {
            output[target] = [];
            indexed[target] = new Map();
            unkeyed[target] = [];
            (GLOBAL_COLLECTIONS[target] ? ranges.slice(0, 1) : ranges).forEach(function (range) {
                tasks.push({ target: target, range: range });
            });
        });

        // Serie deliberada: una entidad mensual puede rondar 100 MB. No
        // mantenemos varias respuestas grandes simultáneamente en memoria.
        return tasks.reduce(function (chain, task) {
            return chain.then(function () {
                var query = toQuery({
                    fechaDesde: task.range.fechaDesde,
                    fechaHasta: task.range.fechaHasta,
                    include: task.target
                });

                return request(API_BASE + "/dashboard/snapshot?" + query, {
                    method: "GET"
                }).then(function (part) {
                    var meta = part && part.meta || {};
                    var id = RECORD_IDS[task.target];
                    var rows = part && part[task.target] || [];

                    if (generation && meta.namespace && generation !== meta.namespace) {
                        throw new Error("La generación de caché cambió durante la consulta; vuelve a cargar la vista.");
                    }
                    generation = generation || meta.namespace || null;
                    output.meta.namespace = generation;
                    output.meta.cacheOnly = output.meta.cacheOnly && meta.cacheOnly !== false;
                    Object.assign(output.meta.cache, meta.cache || {});
                    rows.forEach(function (row) {
                        var key = id && row && row[id];

                        if (key === undefined || key === null || key === "") {
                            unkeyed[task.target].push(row);
                        } else {
                            indexed[task.target].set(String(key), row);
                        }
                    });
                });
            });
        }, Promise.resolve()).then(function () {
            targets.forEach(function (target) {
                output[target] = Array.from(indexed[target].values()).concat(unkeyed[target]);
            });
            output.meta.generatedAt = new Date().toISOString();
            return output;
        });
    }

    return {
        loadMantenimiento: function (filters, forceRefresh) {
            var query = toQuery(Object.assign({}, filters || {}, {
                refresh: forceRefresh ? "true" : undefined
            }));

            return request(API_BASE + "/mantenimiento?" + query, {
                method: "GET"
            });
        },

        loadDashboard: function (dashboard, filters) {
            var query = toQuery(Object.assign({}, filters || {}, {
                dashboard: dashboard
            }));

            return request(API_BASE + "/dashboard/snapshot?" + query, {
                method: "GET"
            });
        },

        loadSnapshot: function (filters, include) {
            return loadSnapshotPartitioned(filters, include);
        },

        getStatus: function () {
            return request(API_BASE + "/cache/status", {
                method: "GET"
            });
        },

        getRefreshStatus: function () {
            return request(API_BASE + "/cache/refresh", {
                method: "GET"
            });
        },

        refresh: function (payload) {
            return request(API_BASE + "/cache/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload || {})
            });
        }
    };
});
