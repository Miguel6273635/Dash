sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet"
], function (
    Controller,
    JSONModel,
    MessageToast,
    includeStylesheet
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.VistaDireccion",
        {
            /**
             * Inicialización de Vista Dirección.
             */
            onInit: function () {

                /*
                 * El namespace "mantenimiento" representa la raíz
                 * de la carpeta webapp.
                 *
                 * Ruta física:
                 * webapp/css/VistaDireccion.css
                 *
                 * Ruta UI5:
                 * mantenimiento/css/VistaDireccion.css
                 */
                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/VistaDireccion.css"
                    ) + "?version=20260805_03",
                    "vistaDireccionCss"
                );

                var oViewModel = new JSONModel({

                    /* =====================================================
                       FILTROS
                       ===================================================== */
                    filters: {
                        periodo: "mayo2025",
                        fechaDesde: "01/05/2025",
                        fechaHasta: "31/05/2025",
                        direccion: "norte",
                        jefatura: "todas",
                        turno: "todos"
                    },

                    /* =====================================================
                       KPIs
                       ===================================================== */
                    kpis: [
                        {
                            title: "Jefaturas activas",
                            value: "4",
                            footer: "de 4",
                            note: "",
                            showFooter: true,
                            showNote: false,
                            icon: "sap-icon://group",
                            tone: "blue"
                        },
                        {
                            title: "Recursos totales",
                            value: "92",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://employee",
                            tone: "cyan"
                        },
                        {
                          title: "Capacidad disponible",
                          value: "6,880 h",
                          footer: "",
                          note: "",
                          showFooter: false,
                          showNote: false,
                          icon: "sap-icon://performance",
                          tone: "green"
                         },
                        {
                            title: "Carga programada",
                            value: "6,305 h",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://calendar",
                            tone: "orange"
                        },
                        {
                            title: "Recursos sobre capacidad",
                            value: "11",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://alert",
                            tone: "red"
                        },
                        {
                            title: "Cumplimiento operativo",
                            value: "70%",
                            footer: "Meta: 80%",
                            note: "-10 puntos por debajo de la meta",
                            showFooter: true,
                            showNote: true,
                            icon: "sap-icon://performance",
                            tone: "danger"
                        }
                    ],

                    /* =====================================================
                       CLASIFICACIÓN DE UTILIZACIÓN
                       ===================================================== */
                    riskLevels: [
                        {
                            label: "Crítico",
                            range: "> 120%",
                            count: "1",
                            icon: "sap-icon://trend-up",
                            tone: "red"
                        },
                        {
                            label: "Alto",
                            range: "101% - 120%",

                            /*
                             * Jefatura Centro y Jefatura Metropolitana.
                             */
                            count: "2",

                            icon: "sap-icon://trend-up",
                            tone: "orange"
                        },
                        {
                            label: "Normal",
                            range: "71% - 100%",
                            count: "1",
                            icon: "sap-icon://status-critical",
                            tone: "yellow"
                        },
                        {
                            label: "Bajo",
                            range: "0% - 70%",
                            count: "1",
                            icon: "sap-icon://status-positive",
                            tone: "green"
                        }
                    ],

                    /* =====================================================
                       JEFATURAS
                       
                       El orden es importante porque el CSS posiciona:
                       
                       1. Norte          → columna Crítico
                       2. Centro         → columna Alto
                       3. Oriente        → columna Normal
                       4. Poniente       → columna Bajo
                       5. Metropolitana  → segunda fila de Alto
                       ===================================================== */
                    jefaturas: [
                        {
                            name: "Jefatura Norte",
                            utilization: "132%",
                            resourceText: "2 supervisores",
                            tone: "red"
                        },
                        {
                            name: "Jefatura Centro",
                            utilization: "116%",
                            resourceText: "3 supervisores",
                            tone: "orange"
                        },
                        {
                            name: "Jefatura Oriente",
                            utilization: "78%",
                            resourceText: "18 recursos",
                            tone: "yellow"
                        },
                        {
                            name: "Jefatura Poniente",
                            utilization: "65%",
                            resourceText: "16 recursos",
                            tone: "green"
                        },
                        {
                            name: "Jefatura Metropolitana",
                            utilization: "109%",
                            resourceText: "2 supervisores",
                            tone: "orange"
                        }
                    ],

                    /* =====================================================
                       PRESIÓN POR TIPO DE SERVICIO
                       ===================================================== */
                    serviceTypes: [
                        {
                            label: "Planeado",
                            percent: "45%",
                            hours: "2,837 h",
                            icon: "sap-icon://document-text",
                            tone: "blue"
                        },
                        {
                            label: "Correctivo",
                            percent: "35%",
                            hours: "2,207 h",
                            icon: "sap-icon://wrench",
                            tone: "red"
                        },
                        {
                            label: "Call Center",
                            percent: "20%",
                            hours: "1,261 h",
                            icon: "sap-icon://customer-and-contacts",
                            tone: "purple"
                        }
                    ],

                    /* =====================================================
                       ACCIONES RÁPIDAS
                       ===================================================== */
                    actions: [
                        {
                            action: "direccion",
                            title: "Ver dirección",
                            description: "Consultar detalle de desempeño",
                            icon: "sap-icon://group",
                            tone: "blue"
                        },
                        {
                            action: "asignaciones",
                            title: "Asignaciones",
                            description: "Gestionar asignaciones de recursos",
                            icon: "sap-icon://task",
                            tone: "purple"
                        },
                        {
                            action: "balance",
                            title: "Balance de capacidad",
                            description: "Analizar capacidad vs demanda",

                            /*
                             * El CSS sustituye este icono por el medidor.
                             */
                            icon: "sap-icon://gauge",
                            tone: "green"
                        }
                    ],

                    /* =====================================================
                       CONSUMO DE MATERIALES
                       ===================================================== */
                    materials: [
                        {
                            name: "Lubricantes",
                            percent: "28%",
                            barWidth: "28%",

                            /*
                             * El CSS oculta este icono y dibuja la gota.
                             */
                            icon: "sap-icon://drop",
                            tone: "orange"
                        },
                        {
                            name: "Refacciones",
                            percent: "22%",
                            barWidth: "22%",
                            icon: "sap-icon://wrench",
                            tone: "cyan"
                        },
                        {
                            name: "Consumibles",
                            percent: "18%",
                            barWidth: "18%",
                            icon: "sap-icon://product",
                            tone: "purple"
                        }
                    ]
                });

                this.getView().setModel(oViewModel, "view");
            },

            /**
             * Maneja el botón Aplicar filtros.
             */
            onApplyFilters: function () {
                var oViewModel = this.getView().getModel("view");
                var oFilters = oViewModel.getProperty("/filters");

                MessageToast.show(
                    "Filtros aplicados: " +
                    oFilters.fechaDesde +
                    " al " +
                    oFilters.fechaHasta
                );

                /*
                 * Ejemplo para integrar posteriormente el servicio OData:
                 *
                 * this.getOwnerComponent()
                 *     .getModel()
                 *     .read("/VistaDireccionSet", {
                 *         filters: [],
                 *
                 *         success: function (oData) {
                 *             oViewModel.setProperty(
                 *                 "/kpis",
                 *                 oData.results
                 *             );
                 *         },
                 *
                 *         error: function () {
                 *             MessageToast.show(
                 *                 "Error al consultar la información"
                 *             );
                 *         }
                 *     });
                 */
            },

            /**
             * Maneja las cards de navegación lateral.
             *
             * @param {sap.ui.base.Event} oEvent Evento de selección
             */
            onActionPress: function (oEvent) {
                var sAction = oEvent
                    .getSource()
                    .data("action");

                var mMessages = {
                    direccion: "Navegación al detalle de la dirección",
                    asignaciones: "Navegación a la gestión de asignaciones",
                    balance: "Navegación al balance de capacidad"
                };

                MessageToast.show(
                    mMessages[sAction] || "Acción seleccionada"
                );

                /*
                 * Cuando tengas las rutas declaradas:
                 *
                 * var oRouter = this
                 *     .getOwnerComponent()
                 *     .getRouter();
                 *
                 * switch (sAction) {
                 *     case "direccion":
                 *         oRouter.navTo("RouteVistaJefatura");
                 *         break;
                 *
                 *     case "asignaciones":
                 *         oRouter.navTo("RouteAsignaciones");
                 *         break;
                 *
                 *     case "balance":
                 *         oRouter.navTo("RouteBalanceCapacidad");
                 *         break;
                 *
                 *     default:
                 *         break;
                 * }
                 */
            }
        }
    );
});
