"use strict";

const MANTENIMIENTO_INCLUDE = [
    "orders", "causes", "materials", "movements", "assignments", "operations",
    "confirmations", "blockOrders", "resources", "catalogs", "serviceRequests", "blocks"
];

function normalize(value) { return String(value || "").trim().toUpperCase(); }
function hasValue(value) { return !["", "TODOS", "TODAS", "ALL", "NULL"].includes(normalize(value)); }

function parseODataDate(value) {
    const match = String(value || "").match(/\/Date\((-?\d+)/);
    const date = match ? new Date(Number(match[1])) : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseFilterDate(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const date = match
        ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]))
        : new Date(text.slice(0, 10) + "T00:00:00");
    if (Number.isNaN(date.getTime())) { throw new Error("Fecha de filtro inválida: " + value); }
    return date;
}

function isWithinRange(value, from, to) {
    const date = parseODataDate(value);
    const lastMoment = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    return Boolean(date) && date >= from && date <= lastMoment;
}

function overlapsRange(startValue, endValue, from, to) {
    const start = parseODataDate(startValue);
    const end = parseODataDate(endValue) || to;
    const lastMoment = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    return Boolean(start) && start <= lastMoment && end >= from;
}

function canonicalStatus(order) {
    const status = normalize(order && (order.SapUserStatusCode || order.AppStatusCode));
    const appStatus = {
        "0100": "E0013", "0200": "E0014", "0300": "E0015", "0400": "E0016",
        "0500": "E0017", "0600": "E0018", "0301": "E0019"
    };
    return appStatus[status] || status;
}

function mapOrderType(value) {
    const map = { PREVENTIVO: "SM01", CORRECTIVO: "SM02", CALL_CENTER: "SM03" };
    return map[normalize(value)] || value;
}

function mapStatus(value) {
    const map = { ABIERTA: "E0013", EN_PROCESO: "E0014", COMPLETADA: "E0015" };
    return map[normalize(value)] || value;
}

function matches(value, requested) { return !hasValue(requested) || normalize(value) === normalize(requested); }

function filterSnapshot(snapshot, filters) {
    const from = parseFilterDate(filters.fechaInicio || filters.fechaDesde || filters.dateFrom);
    const to = parseFilterDate(filters.fechaFin || filters.fechaHasta || filters.dateTo);
    const orderType = mapOrderType(filters.tipoOrden);
    const status = mapStatus(filters.estadoOrden);
    const orders = (snapshot.orders || []).filter((order) =>
        ["SM01", "SM02", "SM03"].includes(normalize(order.OrderTypeCode)) &&
        isWithinRange(order.PlannedStartDate, from, to) &&
        matches(order.OrderTypeCode, orderType) && matches(canonicalStatus(order), status) &&
        matches(order.Zona, filters.zona) && matches(order.SupervisorId, filters.supervisor) &&
        matches(order.Turno, filters.turno) && matches(order.Mecanico, filters.mecanico)
    );
    const orderIds = new Set(orders.map((order) => String(order.OrderId)));
    const materialIds = new Set((snapshot.materials || []).filter((item) => orderIds.has(String(item.OrderId))).map((item) => String(item.MaterialRequirementId)));
    const blocks = (snapshot.blocks || []).filter((block) =>
        overlapsRange(block.BlockedAt, block.ReleasedAt, from, to) &&
        (matches(block.ZoneId, filters.zona) || matches(block.ZoneName, filters.zona)) && matches(block.SupervisorId, filters.supervisor)
    );
    const blockIds = new Set(blocks.map((block) => String(block.BlockId)));

    return {
        orders,
        causes: (snapshot.causes || []).filter((item) => orderIds.has(String(item.OrderId))),
        materials: (snapshot.materials || []).filter((item) => orderIds.has(String(item.OrderId))),
        movements: (snapshot.movements || []).filter((item) => materialIds.has(String(item.MaterialRequirementId))),
        assignments: (snapshot.assignments || []).filter((item) => orderIds.has(String(item.OrderId))),
        operations: (snapshot.operations || []).filter((item) => orderIds.has(String(item.OrderId))),
        confirmations: (snapshot.confirmations || []).filter((item) => orderIds.has(String(item.OrderId)) && isWithinRange(item.ActualStartDate, from, to)),
        blockOrders: (snapshot.blockOrders || []).filter((item) => orderIds.has(String(item.OrderId)) && blockIds.has(String(item.BlockId))),
        resources: (snapshot.resources || []).filter((item) => isWithinRange(item.WorkDate, from, to) &&
            (!hasValue(filters.zona) || matches(item.ZoneId, filters.zona) || matches(item.ZoneName, filters.zona)) &&
            matches(item.SupervisorId, filters.supervisor) && matches(item.ShiftId, filters.turno) && matches(item.ResourceId, filters.mecanico)),
        catalogs: snapshot.catalogs || [],
        serviceRequests: (snapshot.serviceRequests || []).filter((item) => isWithinRange(item.RequestedAt, from, to) &&
            matches(item.ZoneId, filters.zona) && matches(item.ResponsibleId, filters.mecanico)),
        blocks,
        range: { startDate: from, endDate: to }
    };
}

class MantenimientoDashboardService {
    constructor(options) {
        this._snapshots = options.snapshots;
        this._buildDashboard = options.buildDashboard;
    }

    async getDashboard(filters, forceRefresh) {
        const snapshot = await this._snapshots.getSnapshot({
            dateFrom: filters.fechaInicio || filters.fechaDesde || filters.dateFrom,
            dateTo: filters.fechaFin || filters.fechaHasta || filters.dateTo,
            include: MANTENIMIENTO_INCLUDE,
            forceRefresh: Boolean(forceRefresh)
        });
        const dashboard = this._buildDashboard(filterSnapshot(snapshot, filters));
        dashboard.meta = Object.assign({}, dashboard.meta, {
            source: "API_DASH",
            module: "mantenimiento",
            generatedAt: new Date().toISOString(),
            cache: snapshot.meta.cache,
            months: snapshot.meta.months,
            records: { orders: dashboard.summary && dashboard.summary.plannedOrders || 0 }
        });
        return dashboard;
    }
}

module.exports = { MantenimientoDashboardService, MANTENIMIENTO_INCLUDE, filterSnapshot };

