sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleOperativoZonaSur", {

        onInit: function () {
            var oMockData = this._getMockData();
            this.getView().setModel(new JSONModel(oMockData), "doz");

            console.group("DETALLE OPERATIVO DE ZONA - JSON MOCK");
            console.log(JSON.stringify(oMockData, null, 2));
            console.groupEnd();
        },

        onAplicarFiltros: function () {
            var oFiltros = this.getView().getModel("doz").getProperty("/filtros");
            var oRequest = {
                dashboard: "DETALLE_OPERATIVO_ZONA",
                tipoConsulta: "GENERAL",
                filtros: oFiltros
            };

            console.group("JSON QUE SE MANDARÍA AL BACKEND / SAP BTP");
            console.log(JSON.stringify(oRequest, null, 2));
            console.groupEnd();

            MessageToast.show("Filtros aplicados al detalle operativo");
        },

        onVerDetalleOrdenes: function () {
            this._logDetalle("ORDENES", "Resumen de carga operativa por estado");
        },

        onVerDetalleHoras: function () {
            this._logDetalle("HORAS", "Evolución de horas programadas vs reales");
        },

        onVerDetalleRecursos: function () {
            this._logDetalle("RECURSOS", "Recursos y utilización");
        },

        onVerDetalleCausa: function () {
            this._logDetalle("CAUSAS", "Principales causas de presión");
        },

        onVerDetalleCliente: function () {
            this._logDetalle("CLIENTES_ELEVADORES", "Clientes / elevadores con mayor carga");
        },

        onVerTodasProximas: function () {
            this._logDetalle("ORDENES_PROXIMAS", "Órdenes próximas a vencer");
        },

        _logDetalle: function (sSeccion, sDescripcion) {
            var oFiltros = this.getView().getModel("doz").getProperty("/filtros");
            var oRequest = {
                dashboard: "DETALLE_OPERATIVO_ZONA",
                tipoConsulta: "DETALLE",
                seccion: sSeccion,
                descripcion: sDescripcion,
                filtros: oFiltros
            };

            console.group("JSON DETALLE - " + sSeccion);
            console.log(JSON.stringify(oRequest, null, 2));
            console.groupEnd();

            MessageToast.show("Detalle: " + sDescripcion);
        },

        _getMockData: function () {
            return {
                filtros: {
                    periodo: "Mayo 2024",
                    fechaDesde: "01/05/2024",
                    fechaHasta: "31/05/2024",
                    zona: "Todas",
                    supervisor: "Todas",
                    tipoOrden: "Todas"
                },

                kpis: {
                    indicePresion: { valor: 92, texto: "92%", estado: "Crítica", nivel: "Nivel muy alto" },
                    ordenesAbiertas: { valor: 41, porcentaje: "30.2% del total" },
                    ordenesVencidas: { valor: 9, porcentaje: "22.0% de las abiertas" },
                    horasProgramadas: { valor: 1420, texto: "1,420 h" },
                    horasReales: { valor: 1518, texto: "1,518 h", variacion: "+98 h (6.9%)" },
                    recursosDisponibles: { mecanicos: 6, ayudantes: 3, texto: "6 / 3", utilizacion: "96%" }
                },

                resumenEstados: [
                    { estado: "Abiertas", cantidad: 18, porcentajeTexto: "43.9%", porcentajeNumero: 43.9, color: "blue", icon: "sap-icon://activity-individual" },
                    { estado: "En proceso", cantidad: 12, porcentajeTexto: "29.3%", porcentajeNumero: 29.3, color: "orange", icon: "sap-icon://lateness" },
                    { estado: "Reprogramadas", cantidad: 6, porcentajeTexto: "14.6%", porcentajeNumero: 14.6, color: "green", icon: "sap-icon://appointment-2" },
                    { estado: "Pendientes por cliente/material", cantidad: 5, porcentajeTexto: "12.2%", porcentajeNumero: 12.2, color: "purple", icon: "sap-icon://customer" },
                    { estado: "Vencidas", cantidad: 9, porcentajeTexto: "22.0%", porcentajeNumero: 22, color: "red", icon: "sap-icon://status-negative" }
                ],

                evolucionHoras: [
                    { semana: "Sem 18", programadas: 280, reales: 360 },
                    { semana: "Sem 19", programadas: 520, reales: 680 },
                    { semana: "Sem 20", programadas: 760, reales: 960 },
                    { semana: "Sem 21", programadas: 1030, reales: 1200 },
                    { semana: "Sem 22", programadas: 1420, reales: 1518 }
                ],

                recursos: {
                    utilizacion: 96,
                    asignados: { mecanicos: 54, ayudantes: 24 },
                    disponibles: { mecanicos: 6, ayudantes: 3 }
                },

                causasPresion: [
                    { causa: "Órdenes vencidas", impacto: 30, impactoTexto: "30%", color: "red", icon: "sap-icon://lateness" },
                    { causa: "Horas excedidas", impacto: 25, impactoTexto: "25%", color: "orange", icon: "sap-icon://time-overtime" },
                    { causa: "Falta de recursos", impacto: 20, impactoTexto: "20%", color: "yellow", icon: "sap-icon://group" },
                    { causa: "Reprogramaciones", impacto: 15, impactoTexto: "15%", color: "blue", icon: "sap-icon://calendar" },
                    { causa: "Pendientes por cliente/material", impacto: 10, impactoTexto: "10%", color: "purple", icon: "sap-icon://product" }
                ],

                clientesCarga: [
                    { cliente: "Hospital San José", elevador: "EV-0615", abiertas: 5, vencidas: 3 },
                    { cliente: "Torre Reforma", elevador: "EV-1024", abiertas: 4, vencidas: 2 },
                    { cliente: "Plaza Central", elevador: "EV-0871", abiertas: 4, vencidas: 1 },
                    { cliente: "Condominio Las Palmas", elevador: "EV-0430", abiertas: 3, vencidas: 1 },
                    { cliente: "Corporativo Delta", elevador: "EV-0988", abiertas: 3, vencidas: 1 }
                ],

                ordenesVencer: [
                    { ot: "OT-245876", tipo: "Inspección", tipoKey: "inspeccion", elevador: "EV-0615", compromiso: "03/06/2024", dias: 2, prioridad: "Alta", prioridadKey: "alta" },
                    { ot: "OT-245791", tipo: "Mantenimiento", tipoKey: "mantenimiento", elevador: "EV-1024", compromiso: "04/06/2024", dias: 3, prioridad: "Media", prioridadKey: "media" },
                    { ot: "OT-245730", tipo: "Call Center", tipoKey: "callcenter", elevador: "EV-0871", compromiso: "05/06/2024", dias: 4, prioridad: "Media", prioridadKey: "media" },
                    { ot: "OT-245728", tipo: "Inspección", tipoKey: "inspeccion", elevador: "EV-0430", compromiso: "06/06/2024", dias: 5, prioridad: "Baja", prioridadKey: "baja" },
                    { ot: "OT-245745", tipo: "Mantenimiento", tipoKey: "mantenimiento", elevador: "EV-0988", compromiso: "01/06/2024", dias: 6, prioridad: "Baja", prioridadKey: "baja" }
                ]
            };
        }
    });
});
