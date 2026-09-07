sap.ui.define([], function () {
    "use strict";

    // Solo comportamiento. Los selectores reutilizan las clases/IDs existentes;
    // no se agregan estilos, contenedores ni elementos visibles.
    function card(selector, route, label, extra) {
        return Object.assign({ selector: selector, route: route, label: label }, extra);
    }

    function action(selector, handler, route, label, extra) {
        return card(selector, route, label, Object.assign({ event: "press", replace: handler }, extra));
    }

    function local(selector, handler, label) {
        return card(selector, null, label, { call: handler });
    }

    var views = {
        Mantenimiento: [
            card(".mdComplianceCard, .mdDeviationCard, .mdDetailCard", "RouteDetalleCumplimientoOrdenes", "Abrir cumplimiento general de órdenes"),
            card(".mdCausesCard", "RouteCausasZona", "Abrir causas por zona"),
            card(".mdExecutionCard", "RouteTendenciasEjecucion", "Abrir tendencia de ejecución"),
            card(".mdHeatmapCard", "RouteBalanceOperativoZona", "Abrir balance operativo por zona"),
            card(".mdStaffCard", "RouteHorasTrabajadas", "Abrir horas trabajadas"),
            card(".mdMaterialsCard", "RouteConsumoMateriales", "Abrir consumo de materiales"),
            card(".mdBottomCardGreen", "RouteAnalisisOTPreventivasEjecutadas", "Abrir órdenes preventivas ejecutadas"),
            card(".mdBottomCardBlue", "RouteAnalisisReparacionesPlaneadasEjecutadas", "Abrir reparaciones planeadas ejecutadas"),
            card(".mdBottomCardPurple", "RouteAnalisisSolicitudesCallCenterAtendidas", "Abrir solicitudes atendidas"),
            card(".mdBlockedCard", "RouteDetalleEquiposBloqueados", "Abrir equipos bloqueados"),
            action(".mdDetailButton", "onVerDetalle", "RouteDetalleCumplimientoOrdenes", "Abrir detalle de cumplimiento"),
            action(".mdRedArrowButton", "onVerDetalle", "RouteDetalleEquiposBloqueados", "Abrir detalle de equipos bloqueados")
        ],
        VistaDireccion: [
            card(".vdKpiCard[data-tone='green'], .vdKpiCard[data-tone='orange']", "RouteDetalleGerencia", "Abrir carga y capacidad por jefatura"),
            card(".vdKpiCard, .vdUtilCard, .vdRiskCard, .vdChiefCard", "RouteDetalleOperativoJefaturas", "Abrir detalle operativo de jefaturas"),
            card(".vdServiceCard, .vdMaterialsPanel, .vdMaterialCard", "RouteDetalleGerencia", "Abrir carga, capacidad y materiales por jefatura"),
            action(".vdActionItem", "onActionPress", "RouteDetalleOperativoJefaturas", "Abrir detalle de jefaturas", { data: { action: "direccion" } }),
            action(".vdActionItem", "onActionPress", "RouteDetalleGerencia", "Abrir carga y capacidad", { data: { action: "asignaciones" } }),
            action(".vdActionItem", "onActionPress", "RouteDetalleGerencia", "Abrir balance de capacidad", { data: { action: "balance" } })
        ],
        VistaJefatura: [
            card(".vjKpiGreen, .vjKpiOrange", "RouteDetalleCargaCapacidadJefatura", "Abrir carga y capacidad de la jefatura"),
            card(".vjKpiCard, .vjUtilizationCard, .vjSupervisorTile", "RouteDetalleOperativoSupervisores", "Abrir detalle operativo de supervisores"),
            card(".vjServiceCard, .vjMaterialsCard, .vjMaterialTile", "RouteDetalleCargaCapacidadJefatura", "Abrir carga, capacidad y materiales por supervisor"),
            // Estos CustomListItem tienen tipo Inactive en el XML. Se conectan
            // con clic/teclado sin cambiar su tipo ni su presentación.
            card(".vjActionBlue", "RouteDetalleOperativoSupervisores", "Abrir supervisores"),
            card(".vjActionPurple", "RouteDetalleCargaCapacidadJefatura", "Abrir asignaciones por supervisor"),
            card(".vjActionGreen", "RouteDetalleCargaCapacidadJefatura", "Abrir balance de capacidad")
        ],
        VistaSupervisor: [
            card(".vsKpiGreen, .vsKpiOrange", "RouteDetalleCargaSupervisor", "Abrir carga y capacidad del supervisor"),
            card(".vsKpiCard, .vsUtilizationCard, .vsResourceTile", "RouteDetalleOperativoRecursos", "Abrir detalle operativo de recursos"),
            card(".vsPressureCard, .vsMaterialsCard, .vsMaterialTile", "RouteDetalleCargaSupervisor", "Abrir carga, capacidad y materiales por recurso")
        ],
        DetalleGerencia: [
            action(".dgPrimaryLink, .dgActionLink", "onViewSupervisors", "RouteDetalleCargaCapacidadJefatura", "Abrir carga y capacidad de la jefatura")
        ],
        DetalleOperativoJefaturas: [], // Ver jefatura ya navega a RouteVistaJefatura.
        DetalleOperativoSupervisores: [
            action(".dosSupervisorLink, .dosViewSupervisorButton", "onViewSupervisor", "RouteVistaSupervisor", "Abrir vista del supervisor")
        ],
        DetalleCargaCapacidadJefatura: [
            action(".jefSupervisorLink", "onSupervisorPress", "RouteDetalleCargaSupervisor", "Abrir carga y capacidad del supervisor"),
            action(".jefActionButton", "onViewResources", "RouteDetalleOperativoRecursos", "Abrir recursos del supervisor"),
            action(".jefChevronButton", "onViewMaterialDetail", "RouteDetalleCargaSupervisor", "Abrir materiales y carga del supervisor"),
            action(".jefReportButton", "onMaterialReport", "RouteConsumoMateriales", "Abrir consumo de materiales")
        ],
        DetalleCargaSupervisor: [
            action(".dcsReportButton", "onOpenMaterialsReport", "RouteConsumoMateriales", "Abrir consumo de materiales", { text: "Ver detalle de materiales" })
        ],
        DetalleOperativoRecursos: [], // No existe en el repositorio la ficha individual indicada por onViewDetail.
        Mecanicos: [
            card(".mecKpiCard, .mecCard", "RouteDetalleMecanicos", "Abrir detalle de mecánicos")
        ],
        DetalleMecanicos: [],
        HorasTrabajadas: [
            card(".htwBigKpi, .htwCapacidadCargaCard, .htwProyeccionCard", "RouteDetalleCapacidadCarga", "Abrir detalle de capacidad y carga"),
            card(".htwUtilizacionCard", "RouteDetalleUtilizacionTurno", "Abrir detalle de utilización por turno"),
            card(".htwTipoOrdenCard", "RouteDetalleHorasTipoOrden", "Abrir horas por tipo de orden"),
            card(".htwZonaCard", "RouteDetalleCapacidadZona", "Abrir capacidad por zona"),
            card(".htwCausasCard", "RouteDetalleDesviacionHoras", "Abrir causas de desviación de horas"),
            action(".htwZonaV2BottomLink", "onDetalleZona", "RouteDetalleCapacidadZona", "Abrir detalle de capacidad por zona")
        ],
        DetalleCapacidadCarga: [],
        DetalleCapacidadZona: [],
        DetalleHorasTipoOrden: [],
        DetalleDesviacionHoras: [],
        DetalleUtilizacionTurno: [],
        DetalleCumplimientoOrdenes: [
            card(".dcgoElevadoresCard", "RouteAnalisisElevadores", "Abrir elevadores con desviación"),
            card(".dcgoCausasZonaCard", "RouteCausasZona", "Abrir causas por zona"),
            card(".dcgoRespCard", "RouteComportamientoOperativo", "Abrir comportamiento operativo por responsable"),
            card(".dcgoTendenciaCard", "RouteTendenciasEjecucion", "Abrir tendencia de ejecución"),
            card(".dcgoFallasCard", "RouteAnalisisFallas", "Abrir análisis de fallas"),
            action(".dcgoElevadoresLink", "onVerElevadores", "RouteAnalisisElevadores", "Abrir todos los elevadores"),
            action(".dcgoCardLink", "onVerDetalleFallas", "RouteAnalisisFallas", "Abrir detalle de fallas")
        ],
        CausasZona: [],
        AnalisisElevadores: [],
        AnalisisFallas: [],
        ComportamientoOperativo: [
            card(".coCauseCard", "RouteDetalleResponsable", "Abrir detalle del responsable", {
                parameters: { responsableId: { model: "data", property: "id" } }
            })
        ],
        DetalleResponsable: [], // Conserva su filtro semanal y sus menús existentes.
        TendenciaEjecucion: [
            card(".tprChartCard, .tprInsightCard", "RouteAnalisisSemanaS22", "Abrir análisis de la semana")
        ],
        AnalisisSemanaS22: [],
        ConsumoMateriales: [
            card(".cmKpiCard, .cmCard", "RouteConsumoRealVsPlanCategoria", "Abrir detalle de consumo real contra plan"),
            action(".cmOtFinalLink", "onVerDetalleEstado", "RouteConsumoRealVsPlanCategoria", "Abrir detalle de consumo")
        ],
        ConsumoRealVsPlanCategoria: [], // No se indica otra pantalla de destino en este flujo.
        BalanceOperativoZona: [
            card(".bozKpiCard, .bozCard", "RouteDetalleOperativoZonaSur", "Abrir detalle operativo de la zona")
        ],
        DetalleOperativoZonaSur: [],
        EquiposBloqueados: [
            card(".ebKpiOrange", "RouteListadoOrdenesAfectadas", "Abrir órdenes afectadas"),
            card(".ebKpiGreen", "RoutePendientesDesbloqueo", "Abrir pendientes de desbloqueo"),
            card(".ebPanelDonut", "RouteListadoOrdenesAfectadas", "Abrir afectación en órdenes"),
            card(".ebKpiCard, .ebPanel, .ebAgeSummaryCard", "RouteDetalleEquiposBloqueados", "Abrir detalle de equipos bloqueados"),
            action(".ebKpiOrange .ebKpiLink", "onKpiDetail", "RouteListadoOrdenesAfectadas", "Abrir órdenes afectadas"),
            action(".ebKpiGreen .ebKpiLink", "onKpiDetail", "RoutePendientesDesbloqueo", "Abrir pendientes de desbloqueo"),
            action(".ebKpiLink", "onKpiDetail", "RouteDetalleEquiposBloqueados", "Abrir detalle de equipos bloqueados"),
            action(".ebEquipmentLink", "onEquipoPress", "RouteFichaEquipoBloqueado", "Abrir ficha del equipo"),
            action(".ebEquipmentTable .sapMListTblRow", "onEquipoPress", "RouteFichaEquipoBloqueado", "Abrir ficha del equipo")
        ],
        DetalleEquiposBloqueados: [
            action(".blockedEquipmentLink, .blockedRowArrow", "onOpenEquipment", "RouteFichaEquipoBloqueado", "Abrir ficha del equipo"),
            action(".blockedOrdersLink", "onOpenAffectedOrders", "RouteListadoOrdenesAfectadas", "Abrir órdenes afectadas"),
            action(".blockedNextActionButton", "onOpenNextAction", "RoutePendientesDesbloqueo", "Abrir pendientes de desbloqueo")
        ],
        ListadoOrdenesAfectadas: [
            action(".loaOrderLink", "onOrderPress", "RouteDetalleOrdenAfectada", "Abrir detalle de la orden afectada")
        ],
        DetalleOrdenAfectada: [
            card(".doaHistoryCard", "RouteHistorialSeguimiento", "Abrir historial de seguimientos"),
            card(".doaMaterialsCard", "RoutePendientesDesbloqueo", "Abrir pendientes de desbloqueo"),
            action(".doaKpiCard:nth-child(2) .doaKpiDetailButton", "onViewEquipment", "RouteFichaEquipoBloqueado", "Abrir equipo asociado"),
            action(".doaFooterButton", "onViewAssociatedEquipment", "RouteFichaEquipoBloqueado", "Abrir equipo asociado", { text: "Ver equipo asociado" }),
            action(".doaFooterButton", "onViewHistory", "RouteHistorialSeguimiento", "Abrir historial completo", { text: "Ver historial completo" }),
            action(".doaFooterButton", "onViewPending", "RoutePendientesDesbloqueo", "Abrir todos los pendientes", { text: "Ver todos los pendientes" })
        ],
        FichaEquipoBloqueado: [
            card(".debOrdersPanel", "RouteListadoOrdenesAfectadas", "Abrir órdenes afectadas del equipo"),
            card(".debPendingPanel", "RoutePendientesDesbloqueo", "Abrir pendientes del equipo"),
            card(".debHistoryPanel", "RouteHistorialSeguimiento", "Abrir historial de seguimiento del equipo"),
            action(".debOrderLink", "onOrderPress", "RouteDetalleOrdenAfectada", "Abrir detalle de la orden"),
            action(".debFooterButton", "onViewAllOrders", "RouteListadoOrdenesAfectadas", "Abrir todas las órdenes afectadas", { text: "Ver todas las órdenes afectadas" }),
            action(".debFooterButton", "onViewAllPending", "RoutePendientesDesbloqueo", "Abrir todos los pendientes", { text: "Ver todos los pendientes" })
        ],
        PendientesDesbloqueo: [
            action(".pdEquipmentLink, .pdDetailLink", "onVerDetalle", "RouteFichaEquipoBloqueado", "Abrir ficha del equipo bloqueado")
        ],
        HistorialSeguimiento: [
            action(".hsOrderLink", "onOrderPress", "RouteDetalleOrdenAfectada", "Abrir orden del seguimiento")
        ],
        AnalisisOTPreventivasEjecutadas: [
            card(".otpEjKpiRed", "RouteAnalisisOTPreventivasNoEjecutadas", "Abrir preventivas no ejecutadas"),
            local(".otpEjKpiBlue, .otpEjKpiPurple", "onSelectTodas", "Ver todas las órdenes preventivas"),
            local(".otpEjKpiGreen", "onSelectEjecutadas", "Ver preventivas ejecutadas")
        ],
        AnalisisOTPreventivasNoEjecutadas: [
            card(".otneKpiGreen", "RouteAnalisisOTPreventivasEjecutadas", "Abrir preventivas ejecutadas"),
            local(".otneKpiBlue, .otneKpiPurple", "onSelectTodas", "Ver todas las órdenes preventivas"),
            local(".otneKpiRed", "onSelectNoEjecutadas", "Ver preventivas no ejecutadas")
        ],
        AnalisisReparacionesPlaneadasEjecutadas: [
            card(".repaKpiRed", "RouteAnalisisReparacionesPlaneadasNoEjecutadas", "Abrir reparaciones no ejecutadas"),
            card(".repaKpiBlue, .repaKpiPurple", "RouteAnalisisIntegralReparaciones", "Abrir análisis integral de reparaciones")
        ],
        AnalisisReparacionesPlaneadasNoEjecutadas: [
            card(".otpeKpiGreen", "RouteAnalisisReparacionesPlaneadasEjecutadas", "Abrir reparaciones ejecutadas"),
            card(".otpeKpiBlue, .otpeKpiPurple", "RouteAnalisisIntegralReparaciones", "Abrir análisis integral de reparaciones"),
            local(".otpeKpiRed", "onSelectNoEjecutadas", "Ver reparaciones no ejecutadas")
        ],
        AnalisisIntegralReparaciones: [
            local(".repaIntegralKpiBlue, .repaIntegralKpiPurple", "onVerPlaneadas", "Ver reparaciones planeadas"),
            local(".repaIntegralKpiGreen", "onVerEjecutadas", "Ver reparaciones ejecutadas"),
            local(".repaIntegralKpiRed", "onVerNoEjecutadas", "Ver reparaciones no ejecutadas")
        ],
        AnalisisSolicitudesCallCenterAtendidas: [
            card(".ccAtKpiRed", "RouteCallCenterNoAtendidas", "Abrir solicitudes no atendidas"),
            action(".ccAtTabButton", "onVerNoAtendidas", "RouteCallCenterNoAtendidas", "Abrir solicitudes no atendidas", { textPrefix: "No atendidas" })
        ],
        CallCenterNoAtendidas: [
            card(".ccnaKpiGreen", "RouteAnalisisSolicitudesCallCenterAtendidas", "Abrir solicitudes atendidas"),
            action(".ccnaAnalysisButton", "onSelectAtendidas", "RouteAnalisisSolicitudesCallCenterAtendidas", "Abrir solicitudes atendidas", { textPrefix: "Atendidas" })
        ]
    };

    return {
        views: views,
        unresolved: [
            { view: "MantenimientoEjecutivo", reason: "Target registrado, pero falta MantenimientoEjecutivo.view.xml." },
            { view: "MantenimientoDetalle", reason: "Target registrado, pero falta MantenimientoDetalle.view.xml." },
            { view: "DetalleCargaSupervisor", reason: "Ver órdenes y Ver recursos de materiales usan RouteOrdenesSupervisor " +
                "y RouteDetalleMaterialesRecurso, que no existen. Falta confirmar su pantalla de destino." },
            { view: "CallCenterNoAtendidas", reason: "El detalle individual por cliente usa RouteDetalleCallCenterCliente, que no existe." },
            { view: "DetalleOperativoRecursos", reason: "La ficha individual de recurso está pendiente en el controlador y no tiene pantalla identificada en este flujo." },
            { view: "DetalleResponsable / DetalleUtilizacionTurno", reason: "El detalle de una OT general no debe enviarse automáticamente " +
                "al detalle de una OT afectada por un bloqueo. Falta esa vista o confirmar equivalencia." }
        ]
    };
});
