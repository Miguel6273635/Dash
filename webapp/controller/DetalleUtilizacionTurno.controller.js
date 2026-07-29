sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleUtilizacionTurno",
        {

            /* ========================================================== */
            /* INICIALIZACIÓN                                             */
            /* ========================================================== */

            onInit: function () {
                var oData = {

                    filtros: {
                        periodo: "MAY_2024",
                        fechaDesde: "2024-05-01",
                        fechaHasta: "2024-05-31",
                        zona: "TODAS",
                        supervisor: "TODOS",
                        mecanico: "TODOS"
                    },

                    catalogos: {

                        periodos: [
                            {
                                key: "MAY_2024",
                                text: "Mayo 2024"
                            },
                            {
                                key: "ABR_2024",
                                text: "Abril 2024"
                            },
                            {
                                key: "MAR_2024",
                                text: "Marzo 2024"
                            }
                        ],

                        zonas: [
                            {
                                key: "TODAS",
                                text: "Todas"
                            },
                            {
                                key: "NORTE",
                                text: "Norte"
                            },
                            {
                                key: "CENTRO",
                                text: "Centro"
                            },
                            {
                                key: "SUR",
                                text: "Sur"
                            }
                        ],

                        supervisores: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            },
                            {
                                key: "SUP001",
                                text: "Juan Pérez"
                            },
                            {
                                key: "SUP002",
                                text: "María López"
                            },
                            {
                                key: "SUP003",
                                text: "Carlos Ruiz"
                            }
                        ],

                        mecanicos: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            },
                            {
                                key: "MEC001",
                                text: "Juan Pérez"
                            },
                            {
                                key: "MEC002",
                                text: "María López"
                            },
                            {
                                key: "MEC003",
                                text: "Carlos Ruiz"
                            },
                            {
                                key: "MEC004",
                                text: "Ana Martínez"
                            },
                            {
                                key: "MEC005",
                                text: "Pedro López"
                            },
                            {
                                key: "MEC006",
                                text: "Luis Martínez"
                            },
                            {
                                key: "MEC007",
                                text: "Jorge Hernández"
                            },
                            {
                                key: "CUA001",
                                text: "Cuadrilla Norte"
                            },
                            {
                                key: "CUA002",
                                text: "Cuadrilla Centro"
                            },
                            {
                                key: "CUA003",
                                text: "Cuadrilla Sur"
                            }
                        ]
                    },

                    /* ================================================== */
                    /* KPIS                                               */
                    /* ================================================== */

                    kpis: {

                        utilizacionGeneral: {
                            valor: "91.2%",
                            detalle: "5,842 h reales / 6,400 h disponibles"
                        },

                        turnoSaturado: {
                            valor: "Fin de semana",
                            detalle: "117.4% de utilización"
                        },

                        sobreCapacidad: {
                            valor: "1",
                            detalle: "De 3 turnos"
                        },

                        cercaSaturacion: {
                            valor: "1",
                            detalle: "Entre 90% y 100%"
                        }
                    },

                    /* ================================================== */
                    /* RESUMEN POR TURNO                                  */
                    /* ================================================== */

                    resumenTurnos: [
                        {
                            turno: "Diurno",
                            capacidad: "4,032",
                            horasProgramadas: "3,420",
                            horasReales: "3,380",
                            utilizacion: "84.9%",
                            porcentajeBarra: 84.9,
                            anchoBarra: "84.9%",
                            margen: "+652",
                            estado: "Normal",
                            estadoKey: "normal",
                            state: "Success",
                            margenState: "Success",
                            statusColor: "#16a269",
                            esTotal: false
                        },
                        {
                            turno: "Nocturno",
                            capacidad: "1,344",
                            horasProgramadas: "1,278",
                            horasReales: "1,310",
                            utilizacion: "95.1%",
                            porcentajeBarra: 95.1,
                            anchoBarra: "95.1%",
                            margen: "+66",
                            estado: "Cerca de saturación",
                            estadoKey: "warning",
                            state: "Warning",
                            margenState: "Success",
                            statusColor: "#f59e0b",
                            esTotal: false
                        },
                        {
                            turno: "Fin de semana",
                            capacidad: "1,024",
                            horasProgramadas: "1,202",
                            horasReales: "1,152",
                            utilizacion: "117.4%",
                            porcentajeBarra: 100,
                            anchoBarra: "100%",
                            margen: "-178",
                            estado: "Sobrecargado",
                            estadoKey: "error",
                            state: "Error",
                            margenState: "Error",
                            statusColor: "#ef3340",
                            esTotal: false
                        },
                        {
                            turno: "Total",
                            capacidad: "6,400",
                            horasProgramadas: "5,900",
                            horasReales: "5,842",
                            utilizacion: "91.2%",
                            porcentajeBarra: 91.2,
                            anchoBarra: "91.2%",
                            margen: "+558",
                            estado: "",
                            estadoKey: "normal",
                            state: "Success",
                            margenState: "Success",
                            statusColor: "",
                            esTotal: true
                        }
                    ],

                    turnoSeleccionado: "Fin de semana",

                    /* ================================================== */
                    /* ÓRDENES                                            */
                    /* ================================================== */

                    ordenes: [
                        {
                            ot: "OT-2024-0468",
                            fecha: "2024-05-04",
                            cliente: "Torre Reforma",
                            elevador: "EV-1024",
                            zona: "Norte",
                            turno: "Fin de semana",
                            supervisorId: "SUP001",
                            recursoId: "MEC001",
                            cuadrillaId: "CUA001",
                            tipoOt: "Reparación (correctivo)",
                            responsable: "Juan Pérez",
                            horasPlan: "3.0",
                            horasReal: "4.2",
                            variacionHoras: "+1.2",
                            variacionPorcentaje: "+40.0%",
                            variacionState: "Error",
                            estado: "Sobrecargado",
                            statusColor: "#ef3340"
                        },
                        {
                            ot: "OT-2024-0332",
                            fecha: "2024-05-05",
                            cliente: "Plaza Satélite",
                            elevador: "EV-0871",
                            zona: "Centro",
                            turno: "Fin de semana",
                            supervisorId: "SUP002",
                            recursoId: "MEC002",
                            cuadrillaId: "CUA002",
                            tipoOt: "Reparación (correctivo)",
                            responsable: "María López",
                            horasPlan: "2.5",
                            horasReal: "3.6",
                            variacionHoras: "+1.1",
                            variacionPorcentaje: "+44.0%",
                            variacionState: "Error",
                            estado: "Sobrecargado",
                            statusColor: "#ef3340"
                        },
                        {
                            ot: "OT-2024-0270",
                            fecha: "2024-05-11",
                            cliente: "Hospital Ángeles",
                            elevador: "EV-0615",
                            zona: "Sur",
                            turno: "Fin de semana",
                            supervisorId: "SUP003",
                            recursoId: "MEC003",
                            cuadrillaId: "CUA003",
                            tipoOt: "Reparación (correctivo)",
                            responsable: "Carlos Ruiz",
                            horasPlan: "2.0",
                            horasReal: "2.9",
                            variacionHoras: "+0.9",
                            variacionPorcentaje: "+45.0%",
                            variacionState: "Error",
                            estado: "Sobrecargado",
                            statusColor: "#ef3340"
                        },
                        {
                            ot: "OT-2024-0411",
                            fecha: "2024-05-12",
                            cliente: "Plaza Galerías",
                            elevador: "EV-0912",
                            zona: "Centro",
                            turno: "Fin de semana",
                            supervisorId: "SUP002",
                            recursoId: "MEC004",
                            cuadrillaId: "CUA002",
                            tipoOt: "Mantenimiento planeado",
                            responsable: "Ana Martínez",
                            horasPlan: "2.0",
                            horasReal: "2.3",
                            variacionHoras: "+0.3",
                            variacionPorcentaje: "+15.0%",
                            variacionState: "Error",
                            estado: "Cerca de saturación",
                            statusColor: "#f59e0b"
                        },
                        {
                            ot: "OT-2024-0360",
                            fecha: "2024-05-18",
                            cliente: "Torre Mayor",
                            elevador: "EV-0369",
                            zona: "Norte",
                            turno: "Fin de semana",
                            supervisorId: "SUP001",
                            recursoId: "MEC005",
                            cuadrillaId: "CUA001",
                            tipoOt: "Reparación (correctivo)",
                            responsable: "Pedro López",
                            horasPlan: "1.8",
                            horasReal: "2.2",
                            variacionHoras: "+0.4",
                            variacionPorcentaje: "+22.2%",
                            variacionState: "Error",
                            estado: "Cerca de saturación",
                            statusColor: "#f59e0b"
                        },
                        {
                            ot: "OT-2024-0373",
                            fecha: "2024-05-19",
                            cliente: "Plaza Central",
                            elevador: "EV-0730",
                            zona: "Sur",
                            turno: "Fin de semana",
                            supervisorId: "SUP003",
                            recursoId: "MEC006",
                            cuadrillaId: "CUA003",
                            tipoOt: "Call Center",
                            responsable: "Luis Martínez",
                            horasPlan: "1.5",
                            horasReal: "1.7",
                            variacionHoras: "+0.2",
                            variacionPorcentaje: "+13.3%",
                            variacionState: "Error",
                            estado: "Dentro de capacidad",
                            statusColor: "#16a269"
                        },
                        {
                            ot: "OT-2024-0321",
                            fecha: "2024-05-19",
                            cliente: "Corporativo ABC",
                            elevador: "EV-0442",
                            zona: "Centro",
                            turno: "Fin de semana",
                            supervisorId: "SUP002",
                            recursoId: "MEC007",
                            cuadrillaId: "CUA002",
                            tipoOt: "Mantenimiento planeado",
                            responsable: "Jorge Hernández",
                            horasPlan: "1.6",
                            horasReal: "1.5",
                            variacionHoras: "-0.1",
                            variacionPorcentaje: "-6.3%",
                            variacionState: "Success",
                            estado: "Dentro de capacidad",
                            statusColor: "#16a269"
                        },
                        {
                            ot: "OT-2024-0255",
                            fecha: "2024-05-25",
                            cliente: "World Trade Center",
                            elevador: "EV-0990",
                            zona: "Norte",
                            turno: "Fin de semana",
                            supervisorId: "SUP001",
                            recursoId: "MEC001",
                            cuadrillaId: "CUA001",
                            tipoOt: "Mantenimiento planeado",
                            responsable: "Juan Pérez",
                            horasPlan: "1.4",
                            horasReal: "1.2",
                            variacionHoras: "-0.2",
                            variacionPorcentaje: "-14.3%",
                            variacionState: "Success",
                            estado: "Dentro de capacidad",
                            statusColor: "#16a269"
                        },
                        {
                            ot: "OT-2024-0218",
                            fecha: "2024-05-25",
                            cliente: "Torre Virreyes",
                            elevador: "EV-0834",
                            zona: "Norte",
                            turno: "Fin de semana",
                            supervisorId: "SUP001",
                            recursoId: "MEC001",
                            cuadrillaId: "CUA001",
                            tipoOt: "Inspección",
                            responsable: "Juan Pérez",
                            horasPlan: "2.2",
                            horasReal: "2.0",
                            variacionHoras: "-0.2",
                            variacionPorcentaje: "-9.1%",
                            variacionState: "Success",
                            estado: "Dentro de capacidad",
                            statusColor: "#16a269"
                        },
                        {
                            ot: "OT-2024-0205",
                            fecha: "2024-05-26",
                            cliente: "Centro Comercial Sur",
                            elevador: "EV-0718",
                            zona: "Sur",
                            turno: "Fin de semana",
                            supervisorId: "SUP003",
                            recursoId: "MEC004",
                            cuadrillaId: "CUA003",
                            tipoOt: "Mantenimiento planeado",
                            responsable: "Ana Martínez",
                            horasPlan: "2.4",
                            horasReal: "2.5",
                            variacionHoras: "+0.1",
                            variacionPorcentaje: "+4.2%",
                            variacionState: "Error",
                            estado: "Cerca de saturación",
                            statusColor: "#f59e0b"
                        },
                        {
                            ot: "OT-2024-0189",
                            fecha: "2024-05-26",
                            cliente: "Plaza Universidad",
                            elevador: "EV-0672",
                            zona: "Centro",
                            turno: "Fin de semana",
                            supervisorId: "SUP003",
                            recursoId: "MEC003",
                            cuadrillaId: "CUA002",
                            tipoOt: "Reparación (correctivo)",
                            responsable: "Carlos Ruiz",
                            horasPlan: "1.8",
                            horasReal: "2.1",
                            variacionHoras: "+0.3",
                            variacionPorcentaje: "+16.7%",
                            variacionState: "Error",
                            estado: "Cerca de saturación",
                            statusColor: "#f59e0b"
                        },
                        {
                            ot: "OT-2024-0174",
                            fecha: "2024-05-31",
                            cliente: "Torre Diamante",
                            elevador: "EV-0541",
                            zona: "Norte",
                            turno: "Fin de semana",
                            supervisorId: "SUP001",
                            recursoId: "MEC005",
                            cuadrillaId: "CUA001",
                            tipoOt: "Call Center",
                            responsable: "Pedro López",
                            horasPlan: "1.5",
                            horasReal: "1.4",
                            variacionHoras: "-0.1",
                            variacionPorcentaje: "-6.7%",
                            variacionState: "Success",
                            estado: "Dentro de capacidad",
                            statusColor: "#16a269"
                        },

                        /* Datos de turno diurno */

                        {
                            ot: "OT-2024-0501",
                            fecha: "2024-05-14",
                            cliente: "Torre Latino",
                            elevador: "EV-0150",
                            zona: "Centro",
                            turno: "Diurno",
                            supervisorId: "SUP002",
                            recursoId: "MEC002",
                            cuadrillaId: "CUA002",
                            tipoOt: "Mantenimiento planeado",
                            responsable: "María López",
                            horasPlan: "3.0",
                            horasReal: "2.8",
                            variacionHoras: "-0.2",
                            variacionPorcentaje: "-6.7%",
                            variacionState: "Success",
                            estado: "Dentro de capacidad",
                            statusColor: "#16a269"
                        },
                        {
                            ot: "OT-2024-0503",
                            fecha: "2024-05-16",
                            cliente: "Plaza Insurgentes",
                            elevador: "EV-0152",
                            zona: "Sur",
                            turno: "Diurno",
                            supervisorId: "SUP003",
                            recursoId: "MEC003",
                            cuadrillaId: "CUA003",
                            tipoOt: "Inspección",
                            responsable: "Carlos Ruiz",
                            horasPlan: "2.4",
                            horasReal: "2.1",
                            variacionHoras: "-0.3",
                            variacionPorcentaje: "-12.5%",
                            variacionState: "Success",
                            estado: "Dentro de capacidad",
                            statusColor: "#16a269"
                        },

                        /* Datos de turno nocturno */

                        {
                            ot: "OT-2024-0502",
                            fecha: "2024-05-15",
                            cliente: "Plaza Norte",
                            elevador: "EV-0151",
                            zona: "Norte",
                            turno: "Nocturno",
                            supervisorId: "SUP001",
                            recursoId: "MEC001",
                            cuadrillaId: "CUA001",
                            tipoOt: "Reparación (correctivo)",
                            responsable: "Juan Pérez",
                            horasPlan: "2.0",
                            horasReal: "2.2",
                            variacionHoras: "+0.2",
                            variacionPorcentaje: "+10.0%",
                            variacionState: "Error",
                            estado: "Cerca de saturación",
                            statusColor: "#f59e0b"
                        },
                        {
                            ot: "OT-2024-0504",
                            fecha: "2024-05-22",
                            cliente: "Torre Ejecutiva",
                            elevador: "EV-0190",
                            zona: "Centro",
                            turno: "Nocturno",
                            supervisorId: "SUP002",
                            recursoId: "MEC004",
                            cuadrillaId: "CUA002",
                            tipoOt: "Call Center",
                            responsable: "Ana Martínez",
                            horasPlan: "1.8",
                            horasReal: "2.0",
                            variacionHoras: "+0.2",
                            variacionPorcentaje: "+11.1%",
                            variacionState: "Error",
                            estado: "Cerca de saturación",
                            statusColor: "#f59e0b"
                        }
                    ],

                    ordenesFiltradas: [],
                    ordenesPaginadas: [],

                    pagination: {
                        currentPage: 1,
                        pageSize: "8",
                        totalPages: 1,
                        totalResults: 0,
                        hasPrevious: false,
                        hasNext: false,
                        showPageTwo: false,
                        resultText: ""
                    }
                };

                this._sSearchValue = "";

                var oModel = new JSONModel(oData);

                oModel.setSizeLimit(1000);

                this.getView().setModel(
                    oModel,
                    "detalleTurno"
                );

                this._actualizarOrdenes();
            },

            /* ========================================================== */
            /* FILTROS GENERALES                                          */
            /* ========================================================== */

            onAplicarFiltros: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                var oFiltros =
                    oModel.getProperty("/filtros");

                if (
                    !oFiltros.fechaDesde ||
                    !oFiltros.fechaHasta
                ) {
                    MessageToast.show(
                        "Selecciona el rango de fechas antes de aplicar los filtros."
                    );

                    return;
                }

                var oFechaDesde =
                    this._crearFechaLocal(oFiltros.fechaDesde);

                var oFechaHasta =
                    this._crearFechaLocal(oFiltros.fechaHasta);

                if (
                    !oFechaDesde ||
                    !oFechaHasta
                ) {
                    MessageToast.show(
                        "El rango de fechas no tiene un formato válido."
                    );

                    return;
                }

                if (oFechaDesde > oFechaHasta) {
                    MessageToast.show(
                        "La fecha desde no puede ser mayor que la fecha hasta."
                    );

                    return;
                }

                oModel.setProperty(
                    "/pagination/currentPage",
                    1
                );

                this._actualizarOrdenes();

                MessageToast.show(
                    "Filtros aplicados correctamente."
                );
            },

            /* ========================================================== */
            /* SELECCIÓN DE TURNO                                         */
            /* ========================================================== */

            onSeleccionarTurno: function (oEvent) {
                var oListItem =
                    oEvent.getParameter("listItem");

                if (!oListItem) {
                    return;
                }

                var oContext =
                    oListItem.getBindingContext("detalleTurno");

                if (!oContext) {
                    return;
                }

                var oTurno =
                    oContext.getObject();

                if (oTurno.esTotal) {
                    return;
                }

                var oModel =
                    this.getView().getModel("detalleTurno");

                oModel.setProperty(
                    "/turnoSeleccionado",
                    oTurno.turno
                );

                oModel.setProperty(
                    "/pagination/currentPage",
                    1
                );

                this._actualizarOrdenes();
            },

            onLimpiarTurno: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                oModel.setProperty(
                    "/turnoSeleccionado",
                    ""
                );

                oModel.setProperty(
                    "/pagination/currentPage",
                    1
                );

                this._actualizarOrdenes();
            },

            /* ========================================================== */
            /* BÚSQUEDA                                                   */
            /* ========================================================== */

            onBuscarOrden: function (oEvent) {
                this._sSearchValue =
                    oEvent.getParameter("newValue") ||
                    oEvent.getParameter("query") ||
                    "";

                var oModel =
                    this.getView().getModel("detalleTurno");

                oModel.setProperty(
                    "/pagination/currentPage",
                    1
                );

                this._actualizarOrdenes();
            },

            /* ========================================================== */
            /* PAGINACIÓN                                                 */
            /* ========================================================== */

            onCambiarTamanoPagina: function (oEvent) {
                var oModel =
                    this.getView().getModel("detalleTurno");

                var sPageSize =
                    oEvent.getSource().getSelectedKey();

                oModel.setProperty(
                    "/pagination/pageSize",
                    sPageSize
                );

                oModel.setProperty(
                    "/pagination/currentPage",
                    1
                );

                this._actualizarPaginacion();
            },

            onPaginaAnterior: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                var iCurrentPage =
                    oModel.getProperty(
                        "/pagination/currentPage"
                    );

                if (iCurrentPage <= 1) {
                    return;
                }

                oModel.setProperty(
                    "/pagination/currentPage",
                    iCurrentPage - 1
                );

                this._actualizarPaginacion();
            },

            onPaginaSiguiente: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                var iCurrentPage =
                    oModel.getProperty(
                        "/pagination/currentPage"
                    );

                var iTotalPages =
                    oModel.getProperty(
                        "/pagination/totalPages"
                    );

                if (iCurrentPage >= iTotalPages) {
                    return;
                }

                oModel.setProperty(
                    "/pagination/currentPage",
                    iCurrentPage + 1
                );

                this._actualizarPaginacion();
            },

            onIrPaginaUno: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                oModel.setProperty(
                    "/pagination/currentPage",
                    1
                );

                this._actualizarPaginacion();
            },

            onIrPaginaDos: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                var iTotalPages =
                    oModel.getProperty(
                        "/pagination/totalPages"
                    );

                if (iTotalPages < 2) {
                    return;
                }

                oModel.setProperty(
                    "/pagination/currentPage",
                    2
                );

                this._actualizarPaginacion();
            },

            /* ========================================================== */
            /* ACCIONES DE TABLA                                          */
            /* ========================================================== */

            onVerOrden: function (oEvent) {
                var oContext =
                    oEvent
                        .getSource()
                        .getBindingContext("detalleTurno");

                if (!oContext) {
                    return;
                }

                var oOrden =
                    oContext.getObject();

                MessageToast.show(
                    "Orden seleccionada: " + oOrden.ot
                );

                /*
                 * Cuando tengas configurada la ruta de detalle:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo("RouteDetalleOrden", {
                 *         ordenId: oOrden.ot
                 *     });
                 */
            },

            onColumnas: function () {
                MessageToast.show(
                    "Configuración de columnas pendiente de conectar."
                );
            },

            onConfiguracion: function () {
                MessageToast.show(
                    "Configuración de tabla pendiente de conectar."
                );
            },

            /* ========================================================== */
            /* FILTRADO INTERNO                                           */
            /* ========================================================== */

            _actualizarOrdenes: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                var aOrdenes =
                    oModel.getProperty("/ordenes") || [];

                var sTurno =
                    oModel.getProperty("/turnoSeleccionado");

                var oFiltros =
                    oModel.getProperty("/filtros") || {};

                var sBusqueda =
                    (this._sSearchValue || "")
                        .trim()
                        .toLowerCase();

                var oFechaDesde =
                    this._crearFechaLocal(
                        oFiltros.fechaDesde
                    );

                var oFechaHasta =
                    this._crearFechaLocal(
                        oFiltros.fechaHasta
                    );

                var aFiltradas =
                    aOrdenes.filter(function (oOrden) {
                        var bTurno = true;
                        var bZona = true;
                        var bSupervisor = true;
                        var bMecanico = true;
                        var bFecha = true;
                        var bBusqueda = true;

                        /* Filtro por turno seleccionado */

                        if (sTurno) {
                            bTurno =
                                oOrden.turno === sTurno;
                        }

                        /* Filtro por zona */

                        if (
                            oFiltros.zona &&
                            oFiltros.zona !== "TODAS"
                        ) {
                            bZona =
                                (oOrden.zona || "")
                                    .toUpperCase() ===
                                oFiltros.zona;
                        }

                        /* Filtro por supervisor */

                        if (
                            oFiltros.supervisor &&
                            oFiltros.supervisor !== "TODOS"
                        ) {
                            bSupervisor =
                                oOrden.supervisorId ===
                                oFiltros.supervisor;
                        }

                        /* Filtro por mecánico o cuadrilla */

                        if (
                            oFiltros.mecanico &&
                            oFiltros.mecanico !== "TODOS"
                        ) {
                            bMecanico =
                                oOrden.recursoId ===
                                    oFiltros.mecanico ||
                                oOrden.cuadrillaId ===
                                    oFiltros.mecanico;
                        }

                        /* Filtro por rango de fechas */

                        if (
                            oFechaDesde &&
                            oFechaHasta &&
                            oOrden.fecha
                        ) {
                            var oFechaOrden =
                                this._crearFechaLocal(
                                    oOrden.fecha
                                );

                            bFecha =
                                oFechaOrden &&
                                oFechaOrden >= oFechaDesde &&
                                oFechaOrden <= oFechaHasta;
                        }

                        /* Búsqueda libre */

                        if (sBusqueda) {
                            var sTextoBusqueda = [
                                oOrden.ot,
                                oOrden.cliente,
                                oOrden.elevador,
                                oOrden.zona,
                                oOrden.turno,
                                oOrden.tipoOt,
                                oOrden.responsable,
                                oOrden.estado
                            ]
                                .join(" ")
                                .toLowerCase();

                            bBusqueda =
                                sTextoBusqueda.indexOf(
                                    sBusqueda
                                ) !== -1;
                        }

                        return (
                            bTurno &&
                            bZona &&
                            bSupervisor &&
                            bMecanico &&
                            bFecha &&
                            bBusqueda
                        );
                    }, this);

                oModel.setProperty(
                    "/ordenesFiltradas",
                    aFiltradas
                );

                this._actualizarPaginacion();
            },

            /* ========================================================== */
            /* PAGINACIÓN INTERNA                                         */
            /* ========================================================== */

            _actualizarPaginacion: function () {
                var oModel =
                    this.getView().getModel("detalleTurno");

                var aOrdenes =
                    oModel.getProperty(
                        "/ordenesFiltradas"
                    ) || [];

                var iPageSize =
                    parseInt(
                        oModel.getProperty(
                            "/pagination/pageSize"
                        ),
                        10
                    ) || 10;

                var iCurrentPage =
                    parseInt(
                        oModel.getProperty(
                            "/pagination/currentPage"
                        ),
                        10
                    ) || 1;

                var iTotalResults =
                    aOrdenes.length;

                var iTotalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            iTotalResults / iPageSize
                        )
                    );

                if (iCurrentPage > iTotalPages) {
                    iCurrentPage = iTotalPages;

                    oModel.setProperty(
                        "/pagination/currentPage",
                        iCurrentPage
                    );
                }

                if (iCurrentPage < 1) {
                    iCurrentPage = 1;

                    oModel.setProperty(
                        "/pagination/currentPage",
                        iCurrentPage
                    );
                }

                var iStartIndex =
                    (iCurrentPage - 1) * iPageSize;

                var iEndIndex =
                    Math.min(
                        iStartIndex + iPageSize,
                        iTotalResults
                    );

                var aPaginadas =
                    aOrdenes.slice(
                        iStartIndex,
                        iEndIndex
                    );

                var sResultText;

                if (iTotalResults === 0) {
                    sResultText =
                        "No se encontraron resultados";
                } else {
                    sResultText =
                        "Mostrando " +
                        (iStartIndex + 1) +
                        " a " +
                        iEndIndex +
                        " de " +
                        iTotalResults +
                        " resultados";
                }

                oModel.setProperty(
                    "/ordenesPaginadas",
                    aPaginadas
                );

                oModel.setProperty(
                    "/pagination/totalPages",
                    iTotalPages
                );

                oModel.setProperty(
                    "/pagination/totalResults",
                    iTotalResults
                );

                oModel.setProperty(
                    "/pagination/hasPrevious",
                    iCurrentPage > 1
                );

                oModel.setProperty(
                    "/pagination/hasNext",
                    iCurrentPage < iTotalPages
                );

                oModel.setProperty(
                    "/pagination/showPageTwo",
                    iTotalPages >= 2
                );

                oModel.setProperty(
                    "/pagination/resultText",
                    sResultText
                );
            },

            /* ========================================================== */
            /* UTILIDADES                                                 */
            /* ========================================================== */

            _crearFechaLocal: function (sFecha) {
                if (
                    !sFecha ||
                    typeof sFecha !== "string"
                ) {
                    return null;
                }

                var aPartes =
                    sFecha.split("-");

                if (aPartes.length !== 3) {
                    return null;
                }

                var iAnio =
                    parseInt(aPartes[0], 10);

                var iMes =
                    parseInt(aPartes[1], 10) - 1;

                var iDia =
                    parseInt(aPartes[2], 10);

                if (
                    isNaN(iAnio) ||
                    isNaN(iMes) ||
                    isNaN(iDia)
                ) {
                    return null;
                }

                return new Date(
                    iAnio,
                    iMes,
                    iDia,
                    0,
                    0,
                    0,
                    0
                );
            }
        }
    );
});