"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadUi5Module(relativePath, dependencies) {
    const filename = path.resolve(__dirname, "..", "..", relativePath);
    const source = fs.readFileSync(filename, "utf8");
    let exported;
    const sandbox = {
        console,
        Date,
        Number,
        Object,
        Array,
        Set,
        String,
        Math,
        sap: {
            ui: {
                define(names, factory) {
                    exported = factory(...names.map((name) => dependencies[name]));
                }
            }
        }
    };

    vm.runInNewContext(source, sandbox, { filename });
    return exported;
}

const rules = loadUi5Module(
    "webapp/model/BlockedEquipmentRules.js",
    {}
);

const mainMapper = loadUi5Module(
    "webapp/model/EquiposBloqueadosMapper.js",
    { "mantenimiento/model/BlockedEquipmentRules": rules }
);

const detailMapper = loadUi5Module(
    "webapp/model/FichaEquipoBloqueadoMapper.js",
    { "mantenimiento/model/BlockedEquipmentRules": rules }
);

test("calcula 44 días hábiles del 13 de agosto al 15 de octubre de 2026", () => {
    assert.equal(
        rules.businessDays(
            new Date(2026, 7, 13),
            new Date(2026, 9, 15)
        ),
        44
    );
});

test("completa zona y supervisor desde órdenes y cuenta sólo órdenes activas existentes", () => {
    const blockOrders = ["1", "2", "3", "4", "5", "6"].map((id) => ({
        BlockOrderId: "B1-O" + id,
        BlockId: "B1",
        OrderId: "O" + id
    }));
    const orders = ["1", "2", "3", "4", "5"].map((id) => ({
        OrderId: "O" + id,
        EquipmentId: "EQ1",
        EquipmentName: "NEXIEZ-GPX-MRL",
        CustomerName: "Cliente prueba",
        SiteName: "Sitio prueba",
        Zona: "NORTE",
        SupervisorId: "50001",
        StatusText: id === "5" ? "" : "ABIERTA",
        SapUserStatusCode: id === "5" ? "E0015" : "E0013"
    }));
    const mapped = mainMapper.mapData({
        blocks: [{
            BlockId: "B1",
            EquipmentId: "EQ1",
            BlockedAt: new Date(2026, 7, 13),
            ReleasedAt: new Date(2026, 9, 15),
            CurrentStatusText: "BLOQUEADA"
        }],
        blockOrders,
        orders,
        events: [],
        catalogs: [],
        resources: []
    }, {
        fechaDesde: "2026-01-01",
        fechaHasta: "2026-12-31",
        zona: "TODAS",
        cliente: "TODOS",
        estatus: "TODOS",
        supervisor: "TODOS"
    });

    assert.equal(mapped.equipos[0].zona, "NORTE");
    assert.equal(mapped.equipos[0].ordenesAfectadas, 4);
    assert.equal(mapped.kpis.ordenesAfectadas, "4");
});

test("la ficha muestra eventos BLOCK_STATUS y enriquece los datos generales", () => {
    const mapped = detailMapper.mapData({
        blocks: [{
            BlockId: "B1",
            EquipmentId: "EQ1",
            BlockedAt: new Date(2026, 7, 13),
            ReleasedAt: new Date(2026, 9, 15),
            CurrentStatusText: "BLOQUEADA"
        }],
        blockOrders: [{ BlockId: "B1", OrderId: "O1" }],
        orders: [{
            OrderId: "O1",
            EquipmentId: "EQ1",
            EquipmentName: "NEXIEZ-GPX-MRL",
            CustomerName: "Cliente prueba",
            SiteName: "Sitio prueba",
            Zona: "NORTE",
            SupervisorId: "50001",
            StatusText: "ABIERTA"
        }],
        events: [{
            BlockEventId: "EV1",
            BlockId: "B1",
            RecordTypeCode: "BLOCK_STATUS",
            ActionCode: "BLOCK",
            StatusText: "BLOQUEADA",
            EventAt: "/Date(1786626548000)/",
            ResponsibleId: "USER1"
        }],
        resources: [{ ResourceId: "50001", ResourceName: "Supervisor prueba" }]
    }, { blockId: "B1" });

    assert.equal(mapped.equipment.zone, "NORTE");
    assert.equal(mapped.equipment.supervisor, "Supervisor prueba");
    assert.equal(mapped.equipment.site, "Sitio prueba");
    assert.equal(mapped.equipment.model, "NEXIEZ-GPX-MRL");
    assert.equal(mapped.kpis.blockedDays.value, "44");
    assert.equal(mapped.history.length, 1);
    assert.equal(mapped.history[0].action, "BLOCK");
});
