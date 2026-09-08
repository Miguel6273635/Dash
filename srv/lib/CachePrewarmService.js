"use strict";

const { bucketsForRange } = require("./DashboardSnapshotService");

const BASE_INCLUDE = ["orders", "catalogs"];

function dateAtStart(value, label) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const date = match
        ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
        : new Date(text.slice(0, 10) + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
        throw new Error("Fecha inválida para precarga" + (label ? " (" + label + ")" : "") + ": " + value);
    }
    return date;
}

function isoDate(date) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function cloneJob(job) {
    return {
        id: job.id,
        status: job.status,
        dateFrom: job.dateFrom,
        dateTo: job.dateTo,
        include: job.include.slice(),
        totalMonths: job.totalMonths,
        completedMonths: job.completedMonths.slice(),
        failedMonth: job.failedMonth || null,
        error: job.error || null,
        startedAt: job.startedAt || null,
        finishedAt: job.finishedAt || null,
        reused: Boolean(job.reused)
    };
}

/*
 * Precarga deliberadamente pequeña y secuencial:
 * - Sólo órdenes y catálogos, que son la base compartida por las pantallas.
 * - Un mes por vez, sin paralelismo contra SAP.
 * - Las relaciones por OT (materiales, recursos, causas, etc.) siguen siendo
 *   bajo demanda para evitar miles de llamadas durante la precarga anual.
 *
 * El estado es de proceso: se reinicia si Cloud Foundry reinicia la app.
 */
class CachePrewarmService {
    constructor(options) {
        const config = options || {};

        if (!config.snapshots || typeof config.snapshots.getSnapshot !== "function") {
            throw new Error("CachePrewarmService requiere DashboardSnapshotService");
        }

        this._snapshots = config.snapshots;
        this._now = config.now || Date.now;
        this._jobs = new Map();
    }

    _key(from, to) {
        return "base:" + isoDate(from) + ":" + isoDate(to);
    }

    _getJob(id) {
        const job = this._jobs.get(id);
        return job ? cloneJob(job) : null;
    }

    async _run(job, buckets) {
        job.status = "RUNNING";
        job.startedAt = this._now();

        try {
            for (const bucket of buckets) {
                await this._snapshots.getSnapshot({
                    dateFrom: isoDate(bucket.from),
                    dateTo: isoDate(bucket.to),
                    include: BASE_INCLUDE
                });
                job.completedMonths.push(bucket.key);
            }
            job.status = "COMPLETED";
        } catch (error) {
            job.status = "FAILED";
            job.failedMonth = buckets[job.completedMonths.length] && buckets[job.completedMonths.length].key;
            job.error = error && error.message ? error.message : String(error);
        } finally {
            job.finishedAt = this._now();
        }

        return cloneJob(job);
    }

    start(options) {
        const config = options || {};
        const from = dateAtStart(config.fechaDesde || config.dateFrom, "fechaDesde");
        const to = dateAtStart(config.fechaHasta || config.dateTo, "fechaHasta");

        if (from > to) {
            throw new Error("La fecha desde no puede ser posterior a la fecha hasta");
        }

        const id = this._key(from, to);
        const existing = this._jobs.get(id);

        if (existing && (existing.status === "QUEUED" || existing.status === "RUNNING")) {
            const duplicate = cloneJob(existing);
            duplicate.reused = true;
            return duplicate;
        }

        const buckets = bucketsForRange(from, to);
        const job = {
            id,
            status: "QUEUED",
            dateFrom: isoDate(from),
            dateTo: isoDate(to),
            include: BASE_INCLUDE.slice(),
            totalMonths: buckets.length,
            completedMonths: [],
            failedMonth: null,
            error: null,
            startedAt: null,
            finishedAt: null,
            promise: null
        };

        this._jobs.set(id, job);
        job.promise = Promise.resolve().then(() => this._run(job, buckets));
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

    status() {
        return Array.from(this._jobs.values()).map(cloneJob);
    }
}

module.exports = { CachePrewarmService, BASE_INCLUDE };
