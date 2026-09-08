"use strict";

/*
 * Catálogo único de dependencias para las pantallas de Mantenimiento.
 *
 * La UI no debe decidir qué EntitySet consultar. Cada pantalla solicita su
 * perfil a API_DASH y el backend reutiliza los datos compartidos de la
 * generación activa.
 */
const PROFILES = Object.freeze({
    core: {
        label: "Órdenes y catálogos",
        include: ["orders", "catalogs"]
    },
    operational: {
        label: "Capacidad, recursos y horas",
        include: ["assignments", "operations", "confirmations", "resources"]
    },
    materials: {
        label: "Materiales y movimientos",
        include: ["materials", "movements"]
    },
    compliance: {
        label: "Cumplimiento y causas",
        include: ["causes"]
    },
    repair: {
        label: "Eventos y requisitos de reparación",
        include: ["events", "requirements"]
    },
    equipment: {
        label: "Equipos bloqueados",
        include: ["blocks", "blockOrders", "blockEvents"]
    },
    requests: {
        label: "Solicitudes de servicio",
        include: ["serviceRequests"]
    }
});

const DASHBOARDS = Object.freeze({
    AnalisisElevadores: ["core", "operational", "compliance"],
    AnalisisFallas: ["core", "operational", "compliance"],
    AnalisisGeneral: ["core", "operational", "compliance"],
    AnalisisIntegralReparaciones: ["core", "operational", "materials", "repair"],
    AnalisisReparacionesPlaneadasNoEjecutadas: ["core", "operational", "materials", "compliance"],
    BalanceOperativoZona: ["core", "operational", "materials", "repair"],
    CausasZona: ["core", "operational", "compliance"],
    ComportamientoOperativo: ["core", "operational", "compliance"],
    ConsumoMateriales: ["core", "operational", "materials", "compliance"],
    ConsumoRealVsPlanCategoria: ["core", "operational", "materials"],
    DetalleCapacidadCarga: ["core", "operational"],
    DetalleCapacidadZona: ["core", "operational"],
    DetalleCargaCapacidadJefatura: ["core", "operational", "materials"],
    DetalleCargaSupervisor: ["core", "operational", "materials"],
    DetalleCumplimientoOrdenes: ["core", "operational", "compliance"],
    DetalleDesviacionHoras: ["core", "operational"],
    DetalleEquiposBloqueados: ["core", "operational", "equipment"],
    DetalleGerencia: ["core", "operational", "materials"],
    DetalleHorasTipoOrden: ["core", "operational"],
    DetalleMecanicos: ["core", "operational"],
    DetalleOperativoJefaturas: ["core", "operational"],
    DetalleOperativoRecursos: ["core", "operational"],
    DetalleOperativoSupervisores: ["core", "operational"],
    DetalleOperativoZonaSur: ["core", "operational", "compliance"],
    DetalleOrdenAfectada: ["core", "operational", "materials", "repair", "equipment"],
    DetalleResponsable: ["core", "operational", "compliance", "repair"],
    DetalleUtilizacionTurno: ["core", "operational"],
    EquiposBloqueados: ["core", "operational", "equipment"],
    FichaEquipoBloqueado: ["core", "operational", "equipment"],
    HistorialSeguimiento: ["core", "operational", "equipment"],
    HorasTrabajadas: ["core", "operational", "compliance"],
    ListadoOrdenesAfectadas: ["core", "operational", "equipment"],
    Mecanicos: ["core", "operational"],
    PendientesDesbloqueo: ["core", "operational", "equipment"],
    PreventivasEjecutadas: ["core", "operational"],
    PreventivasNoEjecutadas: ["core", "operational", "compliance"],
    ReparacionesPlaneadasEjecutadas: ["core", "operational", "materials"],
    ReparacionesPlaneadas: ["core", "operational", "materials", "compliance"],
    TendenciaEjecucion: ["core", "operational", "compliance"],
    VistaDireccion: ["core", "operational", "materials"],
    VistaJefatura: ["core", "operational", "materials"],
    VistaSupervisor: ["core", "operational", "materials"]
});

function unique(values) {
    return Array.from(new Set((values || []).map(String).filter(Boolean)));
}

function assertKnown(items, source, label) {
    const unknown = items.filter((item) => !source[item]);

    if (unknown.length) {
        throw new Error("Perfil o pantalla no reconocida: " + unknown.join(", "));
    }
}

function resolvePlan(options) {
    const config = options || {};
    const requestedProfiles = unique(config.profiles);
    const requestedDashboards = unique(config.dashboards);
    let profileNames = requestedProfiles.slice();

    assertKnown(requestedProfiles, PROFILES);
    assertKnown(requestedDashboards, DASHBOARDS);

    requestedDashboards.forEach((dashboard) => {
        profileNames = profileNames.concat(DASHBOARDS[dashboard]);
    });

    if (!profileNames.length) {
        profileNames = Object.keys(PROFILES);
    }

    profileNames = unique(profileNames);
    return {
        profiles: profileNames,
        dashboards: requestedDashboards,
        include: unique(profileNames.flatMap((name) => PROFILES[name].include))
    };
}

function catalog() {
    return {
        profiles: Object.keys(PROFILES).map((key) => ({
            key,
            label: PROFILES[key].label,
            include: PROFILES[key].include.slice()
        })),
        dashboards: Object.keys(DASHBOARDS).map((key) => ({
            key,
            profiles: DASHBOARDS[key].slice()
        }))
    };
}

module.exports = { PROFILES, DASHBOARDS, resolvePlan, catalog };
