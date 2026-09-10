"use strict";

/*
 * Cliente OData V2 para QAS.
 *
 * No usa $top: algunas entidades no lo soportan. Todas las páginas se siguen
 * mediante __next/@odata.nextLink. Los detalles se consultan en lotes cortos
 * de IDs para evitar URLs enormes y la suspensión del proxy de BAS.
 */
function withoutODataMetadata(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
        return record;
    }

    const compact = {};
    Object.keys(record).forEach((key) => {
        // Los enlaces y URIs de OData no participan en ningún cálculo del
        // dashboard. Eliminarlos antes de cachear reduce el consumo de heap.
        if (key !== "__metadata" && key !== "__deferred") {
            compact[key] = record[key];
        }
    });
    return compact;
}

class SapODataRepository {
    constructor(options) {
        const config = options || {};

        if (typeof config.execute !== "function") {
            throw new Error("SapODataRepository requiere una función execute");
        }

        this._execute = config.execute;
        this._servicePath = String(config.servicePath || "/sap/opu/odata/sap/ZPM_BTP_DASHMANTTO_SRV").replace(/\/+$/, "");
        this._batchSize = Math.max(1, Math.min(15, Number(config.batchSize) || 15));
    }

    _url(entitySet, filter, select) {
        const parameters = ["$format=json"];

        if (select && select.length) {
            parameters.push("$select=" + encodeURIComponent(select.join(",")));
        }
        if (filter) {
            parameters.push("$filter=" + encodeURIComponent(filter));
        }

        return this._servicePath + "/" + entitySet + "?" + parameters.join("&");
    }

    _nextUrl(nextUrl) {
        if (!nextUrl) {
            return null;
        }
        if (/^https?:\/\//i.test(nextUrl)) {
            const parsed = new URL(nextUrl);
            return parsed.pathname + parsed.search;
        }
        return nextUrl.startsWith("/") ? nextUrl : this._servicePath + "/" + nextUrl;
    }

    static escape(value) {
        return String(value).replace(/'/g, "''");
    }

    static odataDate(date) {
        return date.getFullYear() + "-" +
            String(date.getMonth() + 1).padStart(2, "0") + "-" +
            String(date.getDate()).padStart(2, "0") + "T00:00:00";
    }

    async readAll(entitySet, options) {
        const config = options || {};
        const results = [];
        let url = this._url(entitySet, config.filter, config.select);
        let page = 0;

        while (url) {
            page += 1;
            if (page > 1000) {
                throw new Error("Se excedió el límite de páginas para " + entitySet);
            }

            const response = await this._execute(url);
            const body = response && response.data ? response.data : (response || {});
            const container = body.d || body;
            const records = Array.isArray(container.results)
                ? container.results
                : (Array.isArray(container.value) ? container.value : []);

            records.forEach((record) => {
                results.push(withoutODataMetadata(record));
            });
            url = this._nextUrl(container.__next || body["@odata.nextLink"]);
        }

        return results;
    }

    async readByValues(entitySet, property, values, options) {
        const config = options || {};
        const seen = new Set();
        const distinct = (values || []).map(String).filter((value) => {
            const normalized = value.trim();

            if (!normalized || seen.has(normalized)) {
                return false;
            }
            seen.add(normalized);
            return true;
        });
        const records = [];

        for (let index = 0; index < distinct.length; index += this._batchSize) {
            const batch = distinct.slice(index, index + this._batchSize);
            const filter = batch.map((value) =>
                property + " eq '" + SapODataRepository.escape(value) + "'"
            ).join(" or ");
            const pageRecords = await this.readAll(entitySet, {
                filter,
                select: config.select
            });

            records.push(...pageRecords);
        }

        return records;
    }
}

module.exports = SapODataRepository;

