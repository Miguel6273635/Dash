sap.ui.define([], function () {
    "use strict";

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
                    throw new Error(payload.detail || payload.message || "No fue posible consultar la API de caché");
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
                query.set(key, Array.isArray(value) ? value.join(",") : String(value));
            }
        });
        return query.toString();
    }

    return {
        loadMantenimiento: function (filters, forceRefresh) {
            var query = toQuery(Object.assign({}, filters || {}, {
                refresh: forceRefresh ? "true" : undefined
            }));

            return request("/api/v1/mantenimiento?" + query, { method: "GET" });
        },

        loadDashboard: function (dashboard, filters) {
            var query = toQuery(Object.assign({}, filters || {}, {
                dashboard: dashboard
            }));

            return request("/api/v1/dashboard/snapshot?" + query, { method: "GET" });
        },

        loadSnapshot: function (filters, include) {
            var query = toQuery(Object.assign({}, filters || {}, {
                include: include
            }));

            return request("/api/v1/dashboard/snapshot?" + query, { method: "GET" });
        },

        getStatus: function () {
            return request("/api/v1/cache/status", { method: "GET" });
        },

        getRefreshStatus: function () {
            return request("/api/v1/cache/refresh", { method: "GET" });
        },

        refresh: function (payload) {
            return request("/api/v1/cache/refresh", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload || {})
            });
        }
    };
});

