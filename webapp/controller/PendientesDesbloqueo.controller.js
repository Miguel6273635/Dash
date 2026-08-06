sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.PendientesDesbloqueo",
        {

            onInit: function () {
                var oData = {
                    filtros: {
                        periodo: "MES_ACTUAL",
                        fechaDesde: "2025-05-01",
                        fechaHasta: "2025-05-31",
                        zona: "TODOS",
                        cliente: "TODOS",
                        estadoPendiente: "TODOS",
                        responsable: "TODOS",
                        supervisor: "TODOS"
                    },

                    kpis: {
                        pendientesAbiertos: 176,
                        pendientesVencidos: 54,
                        proximosVencer: 38,
                        equiposPendiente: 129
                    },

                    paginacion: {
                        filasPorPagina: "10",
                        textoResultados: "Mostrando 1 a 10 de 10 resultados"
                    },

                    pendientes: [
                        {
                            equipo: "ELV-9034",
                            cliente: "Grupo Alfa S.A.",
                            clienteKey: "GRUPO_ALFA",
                            zona: "Norte",
                            zonaKey: "NORTE",
                            pendiente: "Validación administrativa",
                            responsable: "Luis Hernández",
                            responsableKey: "LUIS_HERNANDEZ",
                            supervisorKey: "SUP_NORTE",
                            estadoPendiente: "En gestión",
                            estadoPendienteKey: "EN_GESTION",
                            estadoPendienteState: "Warning",
                            fechaRegistro: "15/05/2025",
                            fechaRegistroISO: "2025-05-15",
                            fechaCompromiso: "22/05/2025",
                            fechaCompromisoISO: "2025-05-22",
                            diasPendiente: "10",
                            diasState: "None",
                            vencido: "No",
                            vencidoState: "Success",
                            observacion: "Falta sellos en actas",
                            prioridad: "Alta",
                            prioridadState: "Error",
                            estadoGestion: "En gestión",
                            estadoGestionState: "Warning"
                        },
                        {
                            equipo: "ELV-3011",
                            cliente: "Inmuebles del Norte",
                            clienteKey: "INMUEBLES_NORTE",
                            zona: "Norte",
                            zonaKey: "NORTE",
                            pendiente: "Documentación pendiente",
                            responsable: "María González",
                            responsableKey: "MARIA_GONZALEZ",
                            supervisorKey: "SUP_NORTE",
                            estadoPendiente: "Vencido",
                            estadoPendienteKey: "VENCIDO",
                            estadoPendienteState: "Error",
                            fechaRegistro: "10/05/2025",
                            fechaRegistroISO: "2025-05-10",
                            fechaCompromiso: "15/05/2025",
                            fechaCompromisoISO: "2025-05-15",
                            diasPendiente: "16",
                            diasState: "Error",
                            vencido: "Sí",
                            vencidoState: "Error",
                            observacion: "Falta carta responsiva",
                            prioridad: "Crítica",
                            prioridadState: "Error",
                            estadoGestion: "En validación",
                            estadoGestionState: "Information"
                        },
                        {
                            equipo: "ELV-9076",
                            cliente: "Plaza Central",
                            clienteKey: "PLAZA_CENTRAL",
                            zona: "Centro",
                            zonaKey: "CENTRO",
                            pendiente: "Reunión con cliente",
                            responsable: "Carlos Ramírez",
                            responsableKey: "CARLOS_RAMIREZ",
                            supervisorKey: "SUP_CENTRO",
                            estadoPendiente: "Próximo a vencer",
                            estadoPendienteKey: "PROXIMO_VENCER",
                            estadoPendienteState: "Warning",
                            fechaRegistro: "16/05/2025",
                            fechaRegistroISO: "2025-05-16",
                            fechaCompromiso: "24/05/2025",
                            fechaCompromisoISO: "2025-05-24",
                            diasPendiente: "8",
                            diasState: "None",
                            vencido: "No",
                            vencidoState: "Success",
                            observacion: "Coordinar con seguridad",
                            prioridad: "Alta",
                            prioridadState: "Error",
                            estadoGestion: "En gestión",
                            estadoGestionState: "Warning"
                        },
                        {
                            equipo: "ELV-3087",
                            cliente: "Hospital San José",
                            clienteKey: "HOSPITAL_SAN_JOSE",
                            zona: "Centro",
                            zonaKey: "CENTRO",
                            pendiente: "Liberación interna",
                            responsable: "Ana Duarte",
                            responsableKey: "ANA_DUARTE",
                            supervisorKey: "SUP_CENTRO",
                            estadoPendiente: "Vencido",
                            estadoPendienteKey: "VENCIDO",
                            estadoPendienteState: "Error",
                            fechaRegistro: "08/05/2025",
                            fechaRegistroISO: "2025-05-08",
                            fechaCompromiso: "14/05/2025",
                            fechaCompromisoISO: "2025-05-14",
                            diasPendiente: "17",
                            diasState: "Error",
                            vencido: "Sí",
                            vencidoState: "Error",
                            observacion: "Aprobación de compras",
                            prioridad: "Crítica",
                            prioridadState: "Error",
                            estadoGestion: "En autorización",
                            estadoGestionState: "Information"
                        },
                        {
                            equipo: "ELV-1123",
                            cliente: "Torres del Sol",
                            clienteKey: "TORRES_SOL",
                            zona: "Sur",
                            zonaKey: "SUR",
                            pendiente: "Documentación pendiente",
                            responsable: "Jorge Castillo",
                            responsableKey: "JORGE_CASTILLO",
                            supervisorKey: "SUP_SUR",
                            estadoPendiente: "En gestión",
                            estadoPendienteKey: "EN_GESTION",
                            estadoPendienteState: "Warning",
                            fechaRegistro: "17/05/2025",
                            fechaRegistroISO: "2025-05-17",
                            fechaCompromiso: "26/05/2025",
                            fechaCompromisoISO: "2025-05-26",
                            diasPendiente: "6",
                            diasState: "None",
                            vencido: "No",
                            vencidoState: "Success",
                            observacion: "Faltan manuales",
                            prioridad: "Media",
                            prioridadState: "Warning",
                            estadoGestion: "En gestión",
                            estadoGestionState: "Warning"
                        },
                        {
                            equipo: "ELV-3456",
                            cliente: "Centro Comercial Río",
                            clienteKey: "CENTRO_RIO",
                            zona: "Este",
                            zonaKey: "ESTE",
                            pendiente: "Firma de convenio",
                            responsable: "Paola Méndez",
                            responsableKey: "PAOLA_MENDEZ",
                            supervisorKey: "SUP_ESTE",
                            estadoPendiente: "Próximo a vencer",
                            estadoPendienteKey: "PROXIMO_VENCER",
                            estadoPendienteState: "Warning",
                            fechaRegistro: "19/05/2025",
                            fechaRegistroISO: "2025-05-19",
                            fechaCompromiso: "27/05/2025",
                            fechaCompromisoISO: "2025-05-27",
                            diasPendiente: "5",
                            diasState: "None",
                            vencido: "No",
                            vencidoState: "Success",
                            observacion: "Pendiente firma legal",
                            prioridad: "Alta",
                            prioridadState: "Error",
                            estadoGestion: "En validación",
                            estadoGestionState: "Information"
                        },
                        {
                            equipo: "ELV-9912",
                            cliente: "Logística del Pacífico",
                            clienteKey: "LOGISTICA_PACIFICO",
                            zona: "Oeste",
                            zonaKey: "OESTE",
                            pendiente: "Revisión legal",
                            responsable: "Ricardo Salazar",
                            responsableKey: "RICARDO_SALAZAR",
                            supervisorKey: "SUP_OESTE",
                            estadoPendiente: "En gestión",
                            estadoPendienteKey: "EN_GESTION",
                            estadoPendienteState: "Warning",
                            fechaRegistro: "14/05/2025",
                            fechaRegistroISO: "2025-05-14",
                            fechaCompromiso: "19/05/2025",
                            fechaCompromisoISO: "2025-05-19",
                            diasPendiente: "2",
                            diasState: "None",
                            vencido: "No",
                            vencidoState: "Success",
                            observacion: "Revisión de cláusulas",
                            prioridad: "Media",
                            prioridadState: "Warning",
                            estadoGestion: "En gestión",
                            estadoGestionState: "Warning"
                        },
                        {
                            equipo: "ELV-1109",
                            cliente: "Universidad del Valle",
                            clienteKey: "UNIVERSIDAD_VALLE",
                            zona: "Sur",
                            zonaKey: "SUR",
                            pendiente: "Validación administrativa",
                            responsable: "Sofía López",
                            responsableKey: "SOFIA_LOPEZ",
                            supervisorKey: "SUP_SUR",
                            estadoPendiente: "Completado",
                            estadoPendienteKey: "COMPLETADO",
                            estadoPendienteState: "Success",
                            fechaRegistro: "12/05/2025",
                            fechaRegistroISO: "2025-05-12",
                            fechaCompromiso: "20/05/2025",
                            fechaCompromisoISO: "2025-05-20",
                            diasPendiente: "-2",
                            diasState: "Success",
                            vencido: "No",
                            vencidoState: "Success",
                            observacion: "Documentación completa",
                            prioridad: "Baja",
                            prioridadState: "Success",
                            estadoGestion: "Completado",
                            estadoGestionState: "Success"
                        },
                        {
                            equipo: "ELV-3657",
                            cliente: "Hotel Horizonte",
                            clienteKey: "HOTEL_HORIZONTE",
                            zona: "Este",
                            zonaKey: "ESTE",
                            pendiente: "Liberación interna",
                            responsable: "Miguel Torres",
                            responsableKey: "MIGUEL_TORRES",
                            supervisorKey: "SUP_ESTE",
                            estadoPendiente: "Próximo a vencer",
                            estadoPendienteKey: "PROXIMO_VENCER",
                            estadoPendienteState: "Warning",
                            fechaRegistro: "18/05/2025",
                            fechaRegistroISO: "2025-05-18",
                            fechaCompromiso: "26/05/2025",
                            fechaCompromisoISO: "2025-05-26",
                            diasPendiente: "7",
                            diasState: "None",
                            vencido: "No",
                            vencidoState: "Success",
                            observacion: "Pendiente visto bueno",
                            prioridad: "Media",
                            prioridadState: "Warning",
                            estadoGestion: "En autorización",
                            estadoGestionState: "Information"
                        },
                        {
                            equipo: "ELV-5078",
                            cliente: "La Industrial S.A.",
                            clienteKey: "LA_INDUSTRIAL",
                            zona: "Centro",
                            zonaKey: "CENTRO",
                            pendiente: "Documentación pendiente",
                            responsable: "Daniela Vargas",
                            responsableKey: "DANIELA_VARGAS",
                            supervisorKey: "SUP_CENTRO",
                            estadoPendiente: "Vencido",
                            estadoPendienteKey: "VENCIDO",
                            estadoPendienteState: "Error",
                            fechaRegistro: "09/05/2025",
                            fechaRegistroISO: "2025-05-09",
                            fechaCompromiso: "16/05/2025",
                            fechaCompromisoISO: "2025-05-16",
                            diasPendiente: "15",
                            diasState: "Error",
                            vencido: "Sí",
                            vencidoState: "Error",
                            observacion: "Falta póliza actualizada",
                            prioridad: "Crítica",
                            prioridadState: "Error",
                            estadoGestion: "En validación",
                            estadoGestionState: "Information"
                        }
                    ]
                };

                var oModel = new JSONModel(oData);

                oModel.setSizeLimit(500);

                this.getView().setModel(oModel);
            },

            onFiltroChange: function () {
                // Los filtros se aplican desde el botón principal.
            },

            onAplicarFiltros: function () {
                var oModel = this.getView().getModel();
                var oFiltros = oModel.getProperty("/filtros");
                var oTable = this.byId("pendientesTable");
                var oBinding = oTable.getBinding("items");
                var aFilters = [];

                if (oFiltros.zona !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "zonaKey",
                            FilterOperator.EQ,
                            oFiltros.zona
                        )
                    );
                }

                if (oFiltros.cliente !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "clienteKey",
                            FilterOperator.EQ,
                            oFiltros.cliente
                        )
                    );
                }

                if (oFiltros.estadoPendiente !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "estadoPendienteKey",
                            FilterOperator.EQ,
                            oFiltros.estadoPendiente
                        )
                    );
                }

                if (oFiltros.responsable !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "responsableKey",
                            FilterOperator.EQ,
                            oFiltros.responsable
                        )
                    );
                }

                if (oFiltros.supervisor !== "TODOS") {
                    aFilters.push(
                        new Filter(
                            "supervisorKey",
                            FilterOperator.EQ,
                            oFiltros.supervisor
                        )
                    );
                }

                if (
                    oFiltros.fechaDesde &&
                    oFiltros.fechaHasta
                ) {
                    aFilters.push(
                        new Filter(
                            "fechaRegistroISO",
                            FilterOperator.BT,
                            oFiltros.fechaDesde,
                            oFiltros.fechaHasta
                        )
                    );
                } else if (oFiltros.fechaDesde) {
                    aFilters.push(
                        new Filter(
                            "fechaRegistroISO",
                            FilterOperator.GE,
                            oFiltros.fechaDesde
                        )
                    );
                } else if (oFiltros.fechaHasta) {
                    aFilters.push(
                        new Filter(
                            "fechaRegistroISO",
                            FilterOperator.LE,
                            oFiltros.fechaHasta
                        )
                    );
                }

                oBinding.filter(
                    aFilters,
                    "Application"
                );

                this._actualizarTextoResultados();

                MessageToast.show(
                    "Filtros aplicados correctamente."
                );
            },

            onLimpiarFiltros: function () {
                var oModel = this.getView().getModel();
                var oTable = this.byId("pendientesTable");
                var oBinding = oTable.getBinding("items");

                oModel.setProperty("/filtros", {
                    periodo: "MES_ACTUAL",
                    fechaDesde: "2025-05-01",
                    fechaHasta: "2025-05-31",
                    zona: "TODOS",
                    cliente: "TODOS",
                    estadoPendiente: "TODOS",
                    responsable: "TODOS",
                    supervisor: "TODOS"
                });

                oBinding.filter(
                    [],
                    "Application"
                );

                oModel.setProperty(
                    "/paginacion/textoResultados",
                    "Mostrando 1 a 10 de 10 resultados"
                );

                MessageToast.show(
                    "Filtros restablecidos."
                );
            },

            onAbrirCalendario: function () {
                MessageToast.show(
                    "Consulta de fechas compromiso."
                );
            },

            onConfigurarTabla: function () {
                MessageToast.show(
                    "Configuración de columnas."
                );
            },

            onVerDetalle: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext();

                if (!oContext) {
                    return;
                }

                var oPendiente = oContext.getObject();

                MessageToast.show(
                    "Detalle del equipo " +
                    oPendiente.equipo
                );
            },

            onFilasPorPaginaChange: function (oEvent) {
                var sFilas = oEvent
                    .getSource()
                    .getSelectedKey();

                this.getView()
                    .getModel()
                    .setProperty(
                        "/paginacion/filasPorPagina",
                        sFilas
                    );

                this._actualizarTextoResultados();
            },

            _actualizarTextoResultados: function () {
                var oModel = this.getView().getModel();
                var oTable = this.byId("pendientesTable");
                var oBinding = oTable.getBinding("items");
                var iFilas = parseInt(
                    oModel.getProperty(
                        "/paginacion/filasPorPagina"
                    ),
                    10
                );

                window.setTimeout(function () {
                    var iTotal = oBinding.getLength();
                    var iHasta = Math.min(
                        iFilas,
                        iTotal
                    );
                    var sTexto;

                    if (iTotal === 0) {
                        sTexto = "Mostrando 0 resultados";
                    } else {
                        sTexto =
                            "Mostrando 1 a " +
                            iHasta +
                            " de " +
                            iTotal +
                            " resultados";
                    }

                    oModel.setProperty(
                        "/paginacion/textoResultados",
                        sTexto
                    );
                }, 0);
            }

        }
    );
});