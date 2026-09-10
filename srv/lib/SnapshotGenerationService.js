"use strict";

const CacheService = require("./CacheService");
const { DashboardSnapshotService, bucketsForRange } = require("./DashboardSnapshotService");
const { PROFILES, resolvePlan, catalog } = require("./DashboardProfileRegistry");

function dateAtStart(value, label) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const date = match
        ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
        : new Date(text.slice(0, 10) + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        throw new Error("Fecha inválida" + (label ? " (" + label + ")" : "") + ": " + value);
    }
    return date;
}

function isoDate(value) {
    return value.getFullYear() + "-" +
        String(value.getMonth() + 1).padStart(2, "0") + "-" +
        String(value.getDate()).padStart(2, "0");
}

function cloneJob(job) {
    return {
        id: job.id,
        status: job.status,
        activeGeneration: job.activeGeneration,
        stagingGeneration: job.stagingGeneration,
        dateFrom: job.dateFrom,
        dateTo: job.dateTo,
        profiles: job.profiles.slice(),
        dashboards: job.dashboards.slice(),
        include: job.include.slice(),
        totalTasks: job.totalTasks,
        completedTasks: job.completedTasks,
        currentMonth: job.currentMonth || null,
        currentProfile: job.currentProfile || null,
        error: job.error || null,
        missingCacheKeys: (job.missingCacheKeys || []).slice(0, 20),
        startedAt: job.startedAt || null,
        finishedAt: job.finishedAt || null,
        reused: Boolean(job.reused),
        publish: Boolean(job.publish),
        cacheBytes: Number(job.cacheBytes || 0),
        cacheEntries: Number(job.cacheEntries || 0)
    };
}

/*
 * Mantiene dos generaciones independientes:
 *
 * A (active)  -> la que consultan los usuarios.
 * B (staging) -> la que se llena de manera secuencial en segundo plano.
 *
 * Sólo se intercambia A por B cuando B tiene todas las claves requeridas.
 * En un fallo B se descarta y A permanece intacta. El caché anterior se
 * libera justo después del intercambio; una petición ya iniciada conserva
 * su snapshot en memoria local y no ve datos mezclados.
 */
class SnapshotGenerationService {
    constructor(options) {
        const config = options || {};

        if (!config.repository && !config.active) {
            throw new Error("SnapshotGenerationService requiere repository o generación activa");
        }

        this._repository = config.repository;
        this._cacheOptions = Object.assign({
            maxEntries: 400,
            maxBytes: 128 * 1024 * 1024
        }, config.cacheOptions || {});
        this._cacheFactory = config.cacheFactory || ((cacheOptions) => new CacheService(cacheOptions));
        this._now = config.now || Date.now;
        this._sequence = 0;
        this._jobs = new Map();
        this._staging = null;
        this._snapshotFactory = config.snapshotFactory || ((generation) =>
            new DashboardSnapshotService({
                cache: generation.cache,
                repository: this._repository,
                namespace: generation.id
            }));

        this._active = config.active || this._createGeneration("active-v1");
    }

    _createGeneration(id) {
        const generation = {
            id,
            cache: this._cacheFactory(Object.assign({}, this._cacheOptions, {
                generationId: id
            })),
            snapshots: null,
            publishedAt: null
        };
        generation.snapshots = this._snapshotFactory(generation);
        return generation;
    }

    _newGenerationId() {
        this._sequence += 1;
        return "stage-" + this._now() + "-" + this._sequence;
    }

    _defaultRange() {
        const today = new Date();
        return {
            from: new Date(today.getFullYear(), 0, 1),
            to: new Date(today.getFullYear(), 11, 31)
        };
    }

    _jobKey(from, to, plan) {
        return isoDate(from) + ":" + isoDate(to) + ":" + plan.profiles.join(",");
    }

    _getJob(id) {
        const job = this._jobs.get(id);
        return job ? cloneJob(job) : null;
    }

    _statusGeneration(generation) {
        if (!generation) {
            return null;
        }
        return {
            id: generation.id,
            publishedAt: generation.publishedAt,
            cache: generation.cache.status()
        };
    }

    getSnapshot(options) {
        // Se captura la generación actual antes de iniciar IO para que una
        // publicación posterior no mezcle conjuntos en una misma respuesta.
        const active = this._active;
        return active.snapshots.getSnapshot(options);
    }

    getActiveSnapshots() {
        return this._active.snapshots;
    }

    get activeGeneration() {
        return this._active.id;
    }

    get isRefreshing() {
        return Boolean(this._staging);
    }

    catalog() {
        return catalog();
    }

    plan(options) {
        return resolvePlan(options);
    }

    status() {
        return {
            active: this._statusGeneration(this._active),
            staging: this._statusGeneration(this._staging),
            jobs: Array.from(this._jobs.values()).map(cloneJob)
        };
    }

    async _run(job, staging, buckets) {
        job.status = "RUNNING";
        job.startedAt = this._now();

        try {
            for (const bucket of buckets) {
                for (const profileName of job.profiles) {
                    job.currentMonth = bucket.key;
                    job.currentProfile = profileName;
                    console.info("API_DASH precarga iniciada: " + JSON.stringify({
                        job: job.id,
                        month: bucket.key,
                        profile: profileName
                    }));
                    await staging.snapshots.getSnapshot({
                        dateFrom: isoDate(bucket.from),
                        dateTo: isoDate(bucket.to),
                        include: PROFILES[profileName].include,
                        warmOnly: true
                    });
                    const cacheStatus = staging.cache.status();
                    console.info("API_DASH precarga completada: " + JSON.stringify({
                        job: job.id,
                        month: bucket.key,
                        profile: profileName,
                        entries: cacheStatus.entries,
                        bytes: cacheStatus.bytes
                    }));
                    job.completedTasks += 1;
                }
            }

            const missing = staging.snapshots.missingCacheKeys({
                dateFrom: job.dateFrom,
                dateTo: job.dateTo,
                include: job.include
            });
            if (missing.length) {
                job.missingCacheKeys = missing;
                throw new Error(
                    "La generación temporal excedió la capacidad disponible; faltan " +
                    missing.length + " entradas de caché."
                );
            }

            const cacheStatus = staging.cache.status();
            job.cacheBytes = cacheStatus.bytes;
            job.cacheEntries = cacheStatus.entries;

            if (job.publish) {
                const previous = this._active;
                staging.publishedAt = this._now();
                this._active = staging;
                this._staging = null;

                // Después del cambio atómico la generación anterior ya no es
                // consultada. Liberarla evita duplicar el consumo de memoria.
                previous.cache.clear();
                job.status = "COMPLETED";
            } else {
                // Validación de capacidad: conserva la métrica del escenario,
                // pero no modifica A ni mantiene una segunda copia en memoria.
                staging.cache.clear();
                this._staging = null;
                job.status = "VALIDATED";
            }
            job.currentMonth = null;
            job.currentProfile = null;
        } catch (error) {
            job.status = "FAILED";
            job.error = error && error.message ? error.message : String(error);

            if (this._staging === staging) {
                this._staging = null;
            }
            staging.cache.clear();
        } finally {
            job.finishedAt = this._now();
        }

        return cloneJob(job);
    }

    start(options) {
        const config = options || {};
        const defaults = this._defaultRange();
        const from = dateAtStart(config.fechaDesde || config.dateFrom || defaults.from, "fechaDesde");
        const to = dateAtStart(config.fechaHasta || config.dateTo || defaults.to, "fechaHasta");

        if (from > to) {
            throw new Error("La fecha desde no puede ser posterior a la fecha hasta");
        }

        const plan = resolvePlan({
            profiles: config.profiles,
            dashboards: config.dashboards
        });
        const key = this._jobKey(from, to, plan);
        const existing = this._jobs.get(key);

        if (existing && (existing.status === "QUEUED" || existing.status === "RUNNING")) {
            const duplicate = cloneJob(existing);
            duplicate.reused = true;
            return duplicate;
        }
        if (this._staging) {
            throw new Error(
                "Ya existe una actualización en segundo plano. Espere a que finalice antes de iniciar otra."
            );
        }

        const buckets = bucketsForRange(from, to);
        const staging = this._createGeneration(this._newGenerationId());
        const job = {
            id: key,
            status: "QUEUED",
            activeGeneration: this._active.id,
            stagingGeneration: staging.id,
            dateFrom: isoDate(from),
            dateTo: isoDate(to),
            profiles: plan.profiles,
            dashboards: plan.dashboards,
            include: plan.include,
            totalTasks: buckets.length * plan.profiles.length,
            completedTasks: 0,
            publish: config.publish !== false,
            cacheBytes: 0,
            cacheEntries: 0,
            currentMonth: null,
            currentProfile: null,
            error: null,
            missingCacheKeys: [],
            startedAt: null,
            finishedAt: null,
            promise: null
        };

        this._jobs.set(key, job);
        this._staging = staging;
        job.promise = Promise.resolve().then(() => this._run(job, staging, buckets));
        return cloneJob(job);
    }

    async wait(id) {
        const job = this._jobs.get(id);
        if (!job) {
            return null;
        }
        await job.promise;
        return cloneJob(job);
    }
}

module.exports = { SnapshotGenerationService };
