"use strict";

/*
 * Caché LRU con dos ventanas de vigencia:
 *
 * - soft TTL: el valor puede responderse de inmediato y se actualiza en
 *   segundo plano.
 * - hard TTL: el valor ya no se entrega; se espera una nueva consulta SAP.
 *
 * No guarda errores. El límite se aplica por bytes aproximados, no solamente
 * por cantidad de claves, porque los movimientos de material pueden ocupar
 * mucho más que un catálogo.
 */
class CacheService {
    constructor(options) {
        const config = options || {};

        this._now = config.now || Date.now;
        this._maxEntries = Math.max(1, Number(config.maxEntries) || 400);
        this._maxBytes = Math.max(1024 * 1024, Number(config.maxBytes) || 128 * 1024 * 1024);
        this._entries = new Map();
        this._pending = new Map();
        this._bytes = 0;
    }

    _estimateValueBytes(value, depth) {
        const level = Number(depth || 0);

        if (value === null || value === undefined) {
            return 4;
        }
        if (typeof value === "string") {
            return Buffer.byteLength(value, "utf8");
        }
        if (typeof value === "number" || typeof value === "bigint") {
            return 8;
        }
        if (typeof value === "boolean") {
            return 4;
        }
        if (typeof value !== "object") {
            return 16;
        }

        // JSON.stringify de un arreglo masivo crea otra copia gigante del
        // payload. Esta estimación acotada preserva el límite LRU sin crear
        // esa copia transitoria en el heap.
        if (level >= 4) {
            return 32;
        }
        if (Array.isArray(value)) {
            if (!value.length) {
                return 24;
            }
            const samples = Math.min(64, value.length);
            let sampledBytes = 0;
            for (let index = 0; index < samples; index += 1) {
                const position = Math.floor(index * value.length / samples);
                sampledBytes += this._estimateValueBytes(value[position], level + 1);
            }
            return 24 + Math.ceil(sampledBytes / samples) * value.length;
        }

        return 32 + Object.keys(value).reduce((bytes, property) =>
            bytes + Buffer.byteLength(property, "utf8") +
            this._estimateValueBytes(value[property], level + 1), 0);
    }

    _estimateBytes(key, value) {
        return Buffer.byteLength(String(key), "utf8") + this._estimateValueBytes(value, 0);
    }

    _touch(key, entry) {
        this._entries.delete(key);
        entry.lastAccessedAt = this._now();
        this._entries.set(key, entry);
    }

    _evict() {
        while (this._entries.size > this._maxEntries || this._bytes > this._maxBytes) {
            const oldestKey = this._entries.keys().next().value;

            if (!oldestKey) {
                break;
            }
            this.delete(oldestKey);
        }
    }

    set(key, value, policy) {
        const now = this._now();
        const config = policy || {};
        const softTtlMs = Math.max(0, Number(config.softTtlMs) || 0);
        const hardTtlMs = Math.max(softTtlMs, Number(config.hardTtlMs) || softTtlMs);
        const bytes = this._estimateBytes(key, value);
        const previous = this._entries.get(key);

        if (previous) {
            this._bytes -= previous.bytes;
        }

        const entry = {
            value,
            bytes,
            createdAt: now,
            refreshedAt: now,
            lastAccessedAt: now,
            softExpiresAt: now + softTtlMs,
            hardExpiresAt: now + hardTtlMs
        };

        this._entries.delete(key);
        this._entries.set(key, entry);
        this._bytes += bytes;
        this._evict();
        return entry;
    }

    get(key, options) {
        const config = options || {};
        const entry = this._entries.get(key);
        const now = this._now();

        if (!entry) {
            return null;
        }
        if (!config.allowExpired && entry.hardExpiresAt <= now) {
            this.delete(key);
            return null;
        }

        this._touch(key, entry);
        return {
            value: entry.value,
            createdAt: entry.createdAt,
            refreshedAt: entry.refreshedAt,
            softExpiresAt: entry.softExpiresAt,
            hardExpiresAt: entry.hardExpiresAt,
            stale: entry.softExpiresAt <= now,
            expired: entry.hardExpiresAt <= now,
            bytes: entry.bytes
        };
    }

    async getOrLoad(key, loader, policy, options) {
        const config = options || {};
        const cached = !config.forceRefresh ? this.get(key) : null;

        if (cached && !cached.stale) {
            return { ...cached, cacheStatus: "HIT" };
        }

        if (cached && cached.stale && !config.waitForRefresh) {
            this._refreshInBackground(key, loader, policy);
            return { ...cached, cacheStatus: "STALE" };
        }

        const value = await this._loadOnce(key, loader, policy);
        const fresh = this.get(key);
        return { ...fresh, value, cacheStatus: config.forceRefresh ? "REFRESH" : "MISS" };
    }

    _refreshInBackground(key, loader, policy) {
        this._loadOnce(key, loader, policy).catch(function (error) {
            // La siguiente solicitud seguirá disponiendo de la versión anterior
            // hasta que alcance su hard TTL.
            console.warn("No fue posible actualizar la caché " + key + ": " + error.message);
        });
    }

    _loadOnce(key, loader, policy) {
        const pending = this._pending.get(key);

        if (pending) {
            return pending;
        }

        const task = Promise.resolve()
            .then(loader)
            .then((value) => {
                this.set(key, value, policy);
                return value;
            })
            .finally(() => {
                this._pending.delete(key);
            });

        this._pending.set(key, task);
        return task;
    }

    delete(key) {
        const entry = this._entries.get(key);

        if (entry) {
            this._bytes -= entry.bytes;
            this._entries.delete(key);
        }
        return Boolean(entry);
    }

    invalidate(prefix) {
        const keys = Array.from(this._entries.keys());
        const match = typeof prefix === "function"
            ? prefix
            : (key) => String(key).startsWith(String(prefix || ""));
        let removed = 0;

        keys.forEach((key) => {
            if (match(key) && this.delete(key)) {
                removed += 1;
            }
        });
        return removed;
    }

    clear() {
        const removed = this._entries.size;

        this._entries.clear();
        this._bytes = 0;
        return removed;
    }

    status() {
        const now = this._now();
        const entries = Array.from(this._entries.entries()).map(([key, entry]) => ({
            key,
            bytes: entry.bytes,
            refreshedAt: entry.refreshedAt,
            stale: entry.softExpiresAt <= now,
            expiresAt: entry.hardExpiresAt
        }));

        return {
            entries: entries.length,
            pending: this._pending.size,
            bytes: this._bytes,
            maxBytes: this._maxBytes,
            maxEntries: this._maxEntries,
            items: entries
        };
    }
}

module.exports = CacheService;

