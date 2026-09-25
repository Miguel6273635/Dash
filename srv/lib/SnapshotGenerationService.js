"use strict";

const CacheService = require("./CacheService");
const { DashboardSnapshotService, bucketsForRange } = require("./DashboardSnapshotService");
const { PROFILES, resolvePlan, catalog } = require("./DashboardProfileRegistry");

function dateAtStart(value, label) {
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) {
            throw new Error("Fecha inválida" + (label ? " (" + label + ")" : "") + ": " + value);
        }
        return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }

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
        cacheEntries: Number(job.cacheEntries || 0),
        promoted: Boolean(job.promoted),
        retryCount: Number(job.retryCount || 0),
        lastRetry: job.lastRetry ? Object.assign({}, job.lastRetry) : null
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
        this._allowLiveFallback = Boolean(config.allowLiveFallback);
        this._now = config.now || Date.now;
        this._sequence = 0;
        this._jobs = new Map();
        this._preloadAttempts = Math.max(1, Number(config.preloadAttempts) || 4);
        this._retryDelayMs = Math.max(0, Number(config.retryDelayMs) || 5000);
        this._sleep = config.sleep || function (delayMs) {
            return new Promise((resolve) => setTimeout(resolve, delayMs));
        };
        this._staging = null;
        this._materializers = [];
        this._snapshotFactory = config.snapshotFactory || ((generation) =>
            new DashboardSnapshotService({
                cache: generation.cache,
                repository: this._repository,
                namespace: generation.id
            }));

        this._active = config.active || this._createGeneration("active-v1");
        this._active.views = this._active.views || new Map();
        this._active.readers = Number(this._active.readers || 0);
        this._active.retired = Boolean(this._active.retired);
    }

    _createGeneration(id) {
        const generation = {
            id,
            cache: this._cacheFactory(Object.assign({}, this._cacheOptions, {
                generationId: id
            })),
            snapshots: null,
            views: new Map(),
            publishedAt: null,
            readers: 0,
            retired: false
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
            readers: Number(generation.readers || 0),
            retiring: Boolean(generation.retired),
            cache: generation.cache.status()
        };
    }

    _finishRead(generation) {
        generation.readers = Math.max(0, Number(generation.readers || 0) - 1);

        if (generation.retired && generation.readers === 0) {
            generation.cache.clear();
            generation.views.clear();
        }
    }

    _retire(generation) {
        generation.retired = true;

        if (Number(generation.readers || 0) === 0) {
            generation.cache.clear();
            generation.views.clear();
        }
    }

    addMaterializer(materializer) {
        if (typeof materializer !== "function") {
            throw new Error("El materializador debe ser una función");
        }
        this._materializers.push(materializer);
        return this;
    }

    getActiveView(key) {
        return this._active.views.get(key) || null;
    }

    getSnapshot(options) {
        // Se captura la generación actual antes de iniciar IO para que una
        // publicación posterior no mezcle conjuntos en una misma respuesta.
        // La liberación se difiere hasta que termine esa lectura; así A y B no
        // se mezclan aunque B se publique a mitad de una solicitud.
        const active = this._active;
        active.readers = Number(active.readers || 0) + 1;

        return Promise.resolve()
            .then(() => active.snapshots.getSnapshot(options))
            .catch((error) => {
                if (!this._allowLiveFallback || !options || !options.cacheOnly ||
                    !error || error.code !== "CACHE_MISS") {
                    throw error;
                }

                // La precarga B sigue aislada. Sólo esta solicitud completa
                // las entradas faltantes en A con los filtros recibidos.
                return active.snapshots.getSnapshot(Object.assign({}, options, {
                    cacheOnly: false
                }));
            })
            .finally(() => this._finishRead(active));
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

    _publish(job, staging) {
        const previous = this._active;

        if (this._staging !== staging) {
            throw new Error("La generación temporal ya no está disponible para publicación");
        }

        staging.publishedAt = this._now();
        this._active = staging;
        this._staging = null;
        this._retire(previous);
        job.status = "COMPLETED";
        job.currentMonth = null;
        job.currentProfile = null;
        job.finishedAt = this._now();
        return cloneJob(job);
    }

    _discardValidatedStaging() {
        const staging = this._staging;
        const validated = Array.from(this._jobs.values()).find((job) =>
            job.stagingGeneration === (staging && staging.id) &&
            job.status === "VALIDATED"
        );

        if (!staging || !validated) {
            return false;
        }

        staging.cache.clear();
        this._staging = null;
        return true;
    }

    async _warmWithRetry(job, staging, bucket, profileName) {
        for (let attempt = 1; attempt <= this._preloadAttempts; attempt += 1) {
            job.currentMonth = bucket.key;
            job.currentProfile = profileName;

            try {
                await staging.snapshots.getSnapshot({
                    dateFrom: isoDate(bucket.from),
                    dateTo: isoDate(bucket.to),
                    include: PROFILES[profileName].include,
                    warmOnly: true
                });
                return;
            } catch (error) {
                const message = error && error.message ? error.message : String(error);

                if (attempt >= this._preloadAttempts) {
                    throw error;
                }

                job.retryCount += 1;
                job.lastRetry = {
                    month: bucket.key,
                    profile: profileName,
                    attempt,
                    error: message,
                    at: this._now()
                };

                console.warn("API_DASH reintentará la precarga: " + JSON.stringify({
                    job: job.id,
                    month: bucket.key,
                    profile: profileName,
                    attempt,
                    retryInMs: this._retryDelayMs * attempt,
                    error: message
                }));

                await this._sleep(this._retryDelayMs * attempt);
            }
        }
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
                    await this._warmWithRetry(job, staging, bucket, profileName);
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

            for (const materialize of this._materializers) {
                job.currentMonth = null;
                job.currentProfile = "MATERIALIZING";
                await materialize({ job, generation: staging });
            }

            const cacheStatus = staging.cache.status();
            job.cacheBytes = cacheStatus.bytes;
            job.cacheEntries = cacheStatus.entries;

            if (job.publish) {
                this._publish(job, staging);
            } else {
                // La validación conserva B en disco. Si el mismo periodo se
                // publica después, se promueve esta generación sin otra ronda
                // de consultas SAP. Una solicitud distinta descarta B antes de
                // comenzar para no mezclar periodos.
                job.status = "VALIDATED";
                job.currentMonth = null;
                job.currentProfile = null;
            }
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
        const publish = config.publish !== false;

        if (existing && (existing.status === "QUEUED" || existing.status === "RUNNING")) {
            const duplicate = cloneJob(existing);
            duplicate.reused = true;
            return duplicate;
        }

        if (existing && existing.status === "VALIDATED" &&
            this._staging && this._staging.id === existing.stagingGeneration) {
            if (publish) {
                existing.publish = true;
                existing.promoted = true;
                return this._publish(existing, this._staging);
            }

            const duplicate = cloneJob(existing);
            duplicate.reused = true;
            return duplicate;
        }

        // Una validación de otro periodo no debe bloquear una actualización
        // real. B sólo vive hasta que se publica o una nueva generación la
        // sustituye de manera explícita.
        this._discardValidatedStaging();

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
            publish: publish,
            promoted: false,
            cacheBytes: 0,
            cacheEntries: 0,
            currentMonth: null,
            currentProfile: null,
            error: null,
            missingCacheKeys: [],
            startedAt: null,
            retryCount: 0,
            lastRetry: null,
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
