"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { DashboardSnapshotService, SELECTS } = require("../lib/DashboardSnapshotService");

const REQUIRED = {
    DashboardOrdersSet: ["CustomerId", "CustomerName", "SiteId", "SiteName", "EquipmentId", "EquipmentName"],
    DashboardOrderMaterialsSet: [
        "ReservationNumber", "ReservationItem", "MaterialId", "MaterialName",
        "RequiredDate", "DataValidationStatusCode", "IsPublishable"
    ],
    DashboardResourceDailySet: ["PersonnelNumber", "ShiftSourceValidated"],
    DashboardOrderOperationsSet: ["RoutingNumber", "AssignedPersonnelNumber"],
    DashboardOrderConfirmationsSet: [
        "RoutingNumber", "OperationCounter", "ExecutorPersonnelNumber",
        "CancellationIndicator", "ReversalReference"
    ],
    DashboardEquipmentBlocksSet: [
        "EquipmentId", "EquipmentName", "CustomerId", "CustomerName",
        "BlockReasonCode", "BlockReasonText", "CurrentStatusCode",
        "CurrentStatusText", "DataValidationStatusCode", "IsPublishable"
    ],
    DashboardBlockOrdersSet: ["BlockId", "OrderId", "ImpactLevelCode"],
    DashboardBlockEventsSet: [
        "BlockId", "RecordTypeCode", "ActionCode", "EventAt", "StatusCode",
        "StatusText", "ResponsibleId", "IsCurrent"
    ]
};

function assertProjection(entitySet, select) {
    REQUIRED[entitySet].forEach(function (field) {
        assert.ok(select.includes(field), entitySet + " debe solicitar " + field);
    });
}

test("la precarga conserva cliente, equipo y campos de vinculación confirmados por QAS", async function () {
    const calls = [];
    const repository = {
        readAll: async function (entitySet, options) {
            calls.push({ entitySet, select: options.select });
            if (entitySet === "DashboardOrdersSet") {
                return [{
                    OrderId: "OT-1", CustomerId: "C-1", CustomerName: "Cliente QAS",
                    SiteId: "S-1", SiteName: "Sitio QAS",
                    EquipmentId: "E-1", EquipmentName: "Equipo QAS"
                }];
            }
            if (entitySet === "DashboardResourceDailySet") {
                return [{ ResourceDateId: "R-1", PersonnelNumber: "P-1", ShiftSourceValidated: false }];
            }
            return [];
        },
        readByValues: async function (entitySet, property, values, options) {
            calls.push({ entitySet, select: options.select });
            assert.deepEqual(values, ["OT-1"]);
            if (entitySet === "DashboardOrderOperationsSet") {
                return [{ OperationKey: "O-1", OrderId: "OT-1", RoutingNumber: "RN-1", AssignedPersonnelNumber: "P-1" }];
            }
            if (entitySet === "DashboardOrderMaterialsSet") {
                return [{
                    MaterialRequirementId: "M-1", OrderId: "OT-1", MaterialId: "MAT-1",
                    MaterialName: "Consumible QAS", IsPublishable: false
                }];
            }
            if (entitySet === "DashboardOrderConfirmationsSet") {
                return [{
                    ConfirmationId: "F-1", OrderId: "OT-1", RoutingNumber: "RN-1", OperationCounter: "0010",
                    ExecutorPersonnelNumber: "P-1", CancellationIndicator: false, ReversalReference: ""
                }];
            }
            return [];
        }
    };
    const service = new DashboardSnapshotService({
        repository,
        cache: { getOrLoad: async function (_key, loader) { return { value: await loader(), cacheStatus: "MISS" }; } }
    });
    const snapshot = await service.getSnapshot({
        dateFrom: "2026-08-01", dateTo: "2026-08-31",
        include: ["orders", "resources", "materials", "operations", "confirmations"]
    });

    [
        "DashboardOrdersSet", "DashboardOrderMaterialsSet", "DashboardResourceDailySet",
        "DashboardOrderOperationsSet", "DashboardOrderConfirmationsSet"
    ].forEach(function (entitySet) {
        const call = calls.find(function (item) { return item.entitySet === entitySet; });
        assert.ok(call, entitySet + " fue consultado");
        assertProjection(entitySet, call.select);
        assertProjection(entitySet, SELECTS[entitySet]);
    });
    assert.equal(snapshot.orders[0].CustomerName, "Cliente QAS");
    assert.equal(snapshot.orders[0].EquipmentId, "E-1");
    assert.equal(snapshot.resources[0].PersonnelNumber, "P-1");
    assert.equal(snapshot.materials[0].MaterialName, "Consumible QAS");
    assert.equal(snapshot.materials[0].IsPublishable, false);
    assert.equal(snapshot.operations[0].RoutingNumber, "RN-1");
    assert.equal(snapshot.confirmations[0].ExecutorPersonnelNumber, "P-1");
    ["DashboardEquipmentBlocksSet", "DashboardBlockOrdersSet", "DashboardBlockEventsSet"]
        .forEach(function (entitySet) { assertProjection(entitySet, SELECTS[entitySet]); });
});

test("la lectura directa de BAS solicita la misma proyección verificada", async function () {
    let service;
    const reads = [];
    const source = fs.readFileSync(path.join(__dirname, "../../webapp/model/DashboardDataService.js"), "utf8");
    vm.runInNewContext(source, {
        sap: { ui: { define: function (_dependencies, factory) {
            service = factory({ buildDashboard: function (records) { return records; } });
        } } }
    }, { filename: "DashboardDataService.js" });

    const model = { read: function (entityPath, options) {
        const entitySet = entityPath.slice(1);
        reads.push({ entitySet, select: String(options.urlParameters.$select || "").split(",") });
        const records = entitySet === "DashboardOrdersSet" ? [{
            OrderId: "OT-1", OrderTypeCode: "SM02", PlannedStartDate: "2026-08-15T00:00:00",
            CustomerId: "C-1", CustomerName: "Cliente QAS", EquipmentId: "E-1", EquipmentName: "Equipo QAS"
        }] : [];
        options.success({ results: records });
    } };

    const dashboard = await service.load(model, { fechaInicio: "01/08/2026", fechaFin: "31/08/2026" });
    [
        "DashboardOrdersSet", "DashboardOrderMaterialsSet", "DashboardResourceDailySet",
        "DashboardOrderOperationsSet", "DashboardOrderConfirmationsSet",
        "DashboardEquipmentBlocksSet", "DashboardBlockOrdersSet"
    ].forEach(function (entitySet) {
        const call = reads.find(function (item) { return item.entitySet === entitySet; });
        assert.ok(call, entitySet + " fue consultado");
        assertProjection(entitySet, call.select);
    });
    assert.equal(dashboard.orders[0].CustomerName, "Cliente QAS");
    assert.equal(dashboard.orders[0].EquipmentName, "Equipo QAS");
});
