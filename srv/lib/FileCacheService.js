"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

/*
 * Caché LRU respaldada por el disco efímero de la instancia Cloud Foundry.
 *
 * El índice y las promesas pendientes permanecen en memoria; cada valor se
 * serializa en un archivo independiente. Esto permite precargar un período
 * grande sin retener todos los payloads OData en el heap de Node.js.
 *
 * No sustituye una base de datos: la información se limpia al reiniciar o
 * volver a desplegar la aplicación. Su finalidad es sostener una generación
 * activa y otra temporal dentro de la misma instancia, sin depender de un
 * servicio adicional.
 */
class FileCacheService {
    constructor(options) {
        const config = options || {};
        const requestedDirectory = config.directory ||
            path.join(process.env.TMPDIR || os.tmpdir(), "api-dash-cache");
        const directory = path.resolve(requestedDirectory);

        if (directory === path.parse(directory).root) {
            throw new Error("CACHE_STORAGE_DIR no puede ser el directorio raíz");
        }

        this._now = config.now || Date.now;
        this._maxEntries = Math.max(1, Number(config.maxEntries) || 800);
        this._maxBytes = Math.max(1024 * 1024, Number(config.maxBytes) || 512 * 1024 * 1024);
        this._directory = directory;
        this._entries = new Map();
        this._pending = new Map();
        this._bytes = 0;

        // Un proceso nuevo no tiene el índice de una ejecución anterior; se
        // limpian sólo los archivos de su generación para no servir datos sin
        // vigencia comprobada ni ocupar cuota innecesariamente.
        if (config.resetOnStart !== false) {
            fs.rmSync(this._directory, { recursive: true, force: true });
        }
        fs.mkdirSync(this._directory, { recursive: true });
    }

    _fileForKey(key) {
        const digest = crypto.createHash("sha256").update(String(key)).digest("hex");
        return path.join(this._directory, digest + ".json");
    }

    _touch(key, entry) {
        this._entries.delete(key);
        entry.lastAccessedAt = this._now();
        this._entries.set(key, entry);
    }

    _removeFile(entry) {
        if (entry && entry.file) {
            fs.rmSync(entry.file, { force: true });
        }
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
        const serialized = JSON.stringify(value);

        if (serialized === undefined) {
            throw new Error("La caché de disco sólo admite valores serializables en JSON");
        }

        const now = this._now();
        const config = policy || {};
        const softTtlMs = Math.max(0, Number(config.softTtlMs) || 0);
        const hardTtlMs = Math.max(softTtlMs, Number(config.hardTtlMs) || softTtlMs);
        const file = this._fileForKey(key);
        const temporary = file + "." + process.pid + "." + Date.now() + ".tmp";
        const bytes = Buffer.byteLength(serialized, "utf8") + Buffer.byteLength(String(key), "utf8");
        const previous = this._entries.get(key);

        fs.writeFileSync(temporary, serialized, "utf8");
        fs.renameSync(temporary, file);

        if (previous) {
            this._bytes -= previous.bytes;
            this._entries.delete(key);
        }

        const entry = {
            file,
            bytes,
            createdAt: now,
            refreshedAt: now,
            lastAccessedAt: now,
            softExpiresAt: now + softTtlMs,
            hardExpiresAt: now + hardTtlMs
        };

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

        try {
            const value = JSON.parse(fs.readFileSync(entry.file, "utf8"));

            this._touch(key, entry);
            return {
                value,
                createdAt: entry.createdAt,
                refreshedAt: entry.refreshedAt,
                softExpiresAt: entry.softExpiresAt,
                hardExpiresAt: entry.hardExpiresAt,
                stale: entry.softExpiresAt <= now,
                expired: entry.hardExpiresAt <= now,
                bytes: entry.bytes
            };
        } catch (error) {
            this.delete(key);
            return null;
        }
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
            console.warn("No fue posible actualizar la caché de disco " + key + ": " + error.message);
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
            this._removeFile(entry);
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
        fs.rmSync(this._directory, { recursive: true, force: true });
        fs.mkdirSync(this._directory, { recursive: true });
        return removed;
    }

    status() {
        const now = this._now();
        const items = Array.from(this._entries.entries()).map(([key, entry]) => ({
            key,
            bytes: entry.bytes,
            refreshedAt: entry.refreshedAt,
            stale: entry.softExpiresAt <= now,
            expiresAt: entry.hardExpiresAt
        }));

        return {
            storage: "disk",
            directory: this._directory,
            entries: items.length,
            pending: this._pending.size,
            bytes: this._bytes,
            maxBytes: this._maxBytes,
            maxEntries: this._maxEntries,
            items
        };
    }
}

module.exports = FileCacheService;
