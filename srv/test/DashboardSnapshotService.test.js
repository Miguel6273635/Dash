"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const CacheService = require("../lib/CacheService");
const { DashboardSnapshotService } = require("../lib/DashboardSnapshotService");

test("carga y reutiliza las entidades independientes sin consultas por orden", async function () {
    const calls = [];
    const repository = {
        readAll: async function (entitySet) {
            calls.push(entitySet);
            if (entitySet === "DashboardOrdersSet") {
                return [{ OrderId: "OT-1" }, { OrderId: "OT-2" }];
            }
            if (entitySet === "DashboardServiceRequestsSet") {
                return [{ RequestId: "SR-1" }];
            }
            if (entitySet === "DashboardEquipmentBlocksSet") {
                return [{ BlockId: "BL-1" }];
            }
            return [];
        },
        readByValues: async function () {
            throw new Error("No se esperaban relaciones por OT en esta prueba");
        }
    };
    const service = new DashboardSnapshotService({
        cache: new CacheService({ maxBytes: 1024 * 1024 }),
        repository: repository
    });

    const options = {
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
        include: ["orders", "serviceRequests", "blocks"]
    };
    const first = await service.getSnapshot(options);
    const second = await service.getSnapshot(options);

    assert.equal(first.serviceRequests.length, 1);
    assert.equal(first.blocks.length, 1);
    assert.equal(second.serviceRequests[0].RequestId, "SR-1");
    assert.equal(calls.filter((item) => item === "DashboardServiceRequestsSet").length, 1);
    assert.equal(calls.filter((item) => item === "DashboardEquipmentBlocksSet").length, 1);
});

