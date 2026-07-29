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
        "mantenimiento.controller.FichaEquipoBloqueado",
        {
            /**
             * Inicialización de la pantalla.
             */
            onInit: function () {
                var oData = {
                    equipment: {
                        id: "ELV-10234",
                        client: "Cliente A",
                        zone: "Norte",
                        supervisor: "Ana Martínez",
                        site: "Torre Reforma",
                        address: "Av. Reforma 123, CDMX",
                        type: "Elevador",
                        model: "MRL-800"
                    },

                    kpis: {
                        blockStatus: {
                            value: "Bloqueado activo",
                            label: "Estatus de bloqueo"
                        },

                        blockedDays: {
                            value: "41",
                            label: "Días bloqueado"
                        },

                        affectedOrders: {
                            value: "18",
                            label: "Órdenes afectadas"
                        },

                        pendingUnlock: {
                            value: "5",
                            label: "Pendientes de desbloqueo"
                        },

                        priority: {
                            value: "Crítica",
                            label: "Prioridad desbloqueo"
                        },

                        commitmentDate: {
                            value: "05/06/2024",
                            label: "Fecha compromiso"
                        }
                    },

                    blockInformation: {
                        reason: "Cambio a otro proveedor",
                        managementStatus: "En validación contractual",
                        blockDate: "20/04/2024",
                        responsible: "Luis Ramírez",
                        nextAction: "Reunión con cliente",
                        commitmentDate: "05/06/2024",
                        observation:
                            "Bloqueo derivado de transición contractual y validación administrativa."
                    },

                    orders: [
                        {
                            order: "OT-245678",
                            orderType: "Reparación",
                            status: "Abierta",
                            statusKey: "open",
                            date: "03/06/2024",
                            impact: "Alto",
                            impactKey: "high",
                            impactIcon: "sap-icon://arrow-top"
                        },
                        {
                            order: "OT-245701",
                            orderType: "Mantenimiento",
                            status: "Programada",
                            statusKey: "scheduled",
                            date: "04/06/2024",
                            impact: "Medio",
                            impactKey: "medium",
                            impactIcon: "sap-icon://circle-task-2"
                        },
                        {
                            order: "OT-245720",
                            orderType: "Call Center",
                            status: "En proceso",
                            statusKey: "process",
                            date: "05/06/2024",
                            impact: "Alto",
                            impactKey: "high",
                            impactIcon: "sap-icon://arrow-top"
                        },
                        {
                            order: "OT-245744",
                            orderType: "Reparación",
                            status: "Abierta",
                            statusKey: "open",
                            date: "06/06/2024",
                            impact: "Medio",
                            impactKey: "medium",
                            impactIcon: "sap-icon://circle-task-2"
                        },
                        {
                            order: "OT-245760",
                            orderType: "Inspección",
                            status: "Programada",
                            statusKey: "scheduled",
                            date: "07/06/2024",
                            impact: "Bajo",
                            impactKey: "low",
                            impactIcon: "sap-icon://arrow-bottom"
                        }
                    ],

                    pendingItems: [
                        {
                            pending: "Validación contractual",
                            responsible: "Luis Ramírez",
                            status: "En proceso",
                            statusKey: "process",
                            commitmentDate: "05/06/2024",
                            priority: "Alta",
                            priorityKey: "high"
                        },
                        {
                            pending: "Liberación administrativa",
                            responsible: "Sofía López",
                            status: "Abierto",
                            statusKey: "scheduled",
                            commitmentDate: "10/06/2024",
                            priority: "Media",
                            priorityKey: "medium"
                        },
                        {
                            pending: "Aprobación legal",
                            responsible: "María González",
                            status: "En revisión",
                            statusKey: "review",
                            commitmentDate: "12/06/2024",
                            priority: "Alta",
                            priorityKey: "high"
                        },
                        {
                            pending: "Confirmación con cliente",
                            responsible: "Carlos Méndez",
                            status: "Abierto",
                            statusKey: "scheduled",
                            commitmentDate: "06/06/2024",
                            priority: "Alta",
                            priorityKey: "high"
                        },
                        {
                            pending: "Documentación final",
                            responsible: "Ana Martínez",
                            status: "Pendiente",
                            statusKey: "pending",
                            commitmentDate: "15/06/2024",
                            priority: "Media",
                            priorityKey: "medium"
                        }
                    ],

                    history: [
                        {
                            date: "22/05/2024 09:15",
                            user: "Ana Martínez",
                            action:
                                "Se confirma solicitud de revisión contractual",
                            resultStatus: "En análisis",
                            resultStatusKey: "analysis",
                            bulletColor: "orange"
                        },
                        {
                            date: "24/05/2024 11:30",
                            user: "Luis Ramírez",
                            action:
                                "Se identifica cambio a proveedor externo",
                            resultStatus: "Bloqueado activo",
                            resultStatusKey: "blocked",
                            bulletColor: "blue"
                        },
                        {
                            date: "27/05/2024 14:05",
                            user: "Sofía López",
                            action:
                                "Se solicita liberación administrativa",
                            resultStatus: "En proceso",
                            resultStatusKey: "process",
                            bulletColor: "orange"
                        },
                        {
                            date: "29/05/2024 16:45",
                            user: "María González",
                            action:
                                "Revisión legal del contrato en curso",
                            resultStatus: "En revisión",
                            resultStatusKey: "review",
                            bulletColor: "blue"
                        },
                        {
                            date: "31/05/2024 10:20",
                            user: "Ana Martínez",
                            action:
                                "Recordatorio de seguimiento a responsables",
                            resultStatus: "Pendiente",
                            resultStatusKey: "pending",
                            bulletColor: "gray"
                        }
                    ]
                };

                var oDetailModel = new JSONModel(oData);

                oDetailModel.setSizeLimit(100);

                this.getView().setModel(
                    oDetailModel,
                    "detalle"
                );
            },

            /**
             * Selección de una orden afectada.
             *
             * @param {sap.ui.base.Event} oEvent Evento del enlace.
             */
            onOrderPress: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("detalle");

                var sOrder = oContext
                    ? oContext.getProperty("order")
                    : "";

                if (!sOrder) {
                    MessageToast.show(
                        "No fue posible identificar la orden"
                    );
                    return;
                }

                MessageToast.show(
                    "Orden seleccionada: " + sOrder
                );

                /*
                 * Cuando quieras activar la navegación:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo("RouteDetalleOrdenAfectada");
                 */
            },

            /**
             * Visualiza todas las órdenes afectadas.
             */
            onViewAllOrders: function () {
                var oModel =
                    this.getView().getModel("detalle");

                var sEquipoId = oModel
                    ? oModel.getProperty("/equipment/id")
                    : "ELV-10234";

                MessageToast.show(
                    "Consulta de órdenes afectadas del equipo " +
                    sEquipoId
                );

                /*
                 * Cuando quieras activar la navegación:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo("RouteListadoOrdenesAfectadas");
                 */
            },

            /**
             * Visualiza todos los pendientes de desbloqueo.
             */
            onViewAllPending: function () {
                var oModel =
                    this.getView().getModel("detalle");

                var sEquipoId = oModel
                    ? oModel.getProperty("/equipment/id")
                    : "ELV-10234";

                MessageToast.show(
                    "Consulta de pendientes del equipo " +
                    sEquipoId
                );

                /*
                 * Cuando quieras activar la navegación:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo("RoutePendientesDesbloqueo");
                 */
            }
        }
    );
});