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
        "mantenimiento.controller.DetalleGerencia",
        {

            /* ============================================================
               INICIALIZACIÓN
               ============================================================ */

            onInit: function () {
                includeStylesheet(
                    sap.ui.require.toUrl(
                        "mantenimiento/css/DetalleGerencia.css"
                    )
                );

                var oViewModel = new JSONModel({

                    /*
                     * Apartado visible inicialmente.
                     *
                     * capacity  = Carga y capacidad por jefatura
                     * materials = Consumo de materiales por jefatura
                     */
                    activeSection: "capacity",

                    /* ====================================================
                       FILTROS COMPARTIDOS
                       ==================================================== */

                    filters: {
                        period: "2025-06",
                        dateFrom: "2025-06-01",
                        dateTo: "2025-06-30",
                        management: "G01",
                        headship: "ALL",
                        zone: "ALL",
                        serviceType: "ALL"
                    },

                    periodOptions: [
                        {
                            key: "2025-04",
                            text: "Abril 2025"
                        },
                        {
                            key: "2025-05",
                            text: "Mayo 2025"
                        },
                        {
                            key: "2025-06",
                            text: "Junio 2025"
                        }
                    ],

                    managementOptions: [
                        {
                            key: "G01",
                            text: "G01 - Gerencia Norte"
                        },
                        {
                            key: "G02",
                            text: "G02 - Gerencia Centro"
                        },
                        {
                            key: "G03",
                            text: "G03 - Gerencia Sur"
                        }
                    ],

                    headshipOptions: [
                        {
                            key: "ALL",
                            text: "Todas"
                        },
                        {
                            key: "J01",
                            text: "J01 - Taller Norte"
                        },
                        {
                            key: "J02",
                            text: "J02 - Taller Centro"
                        },
                        {
                            key: "J03",
                            text: "J03 - Taller Sur"
                        },
                        {
                            key: "J04",
                            text: "J04 - Taller Oriente"
                        },
                        {
                            key: "J05",
                            text: "J05 - Taller Poniente"
                        },
                        {
                            key: "J06",
                            text: "J06 - Taller Noroeste"
                        }
                    ],

                    zoneOptions: [
                        {
                            key: "ALL",
                            text: "Todas"
                        },
                        {
                            key: "NORTH",
                            text: "Norte"
                        },
                        {
                            key: "CENTER",
                            text: "Centro"
                        },
                        {
                            key: "SOUTH",
                            text: "Sur"
                        }
                    ],

                    serviceOptions: [
                        {
                            key: "ALL",
                            text: "Todos"
                        },
                        {
                            key: "PREVENTIVE",
                            text: "Preventivo"
                        },
                        {
                            key: "CORRECTIVE",
                            text: "Correctivo"
                        },
                        {
                            key: "EMERGENCY",
                            text: "Emergencia"
                        }
                    ],

                    /* ====================================================
                       TABLA: CARGA Y CAPACIDAD
                       ==================================================== */

                    capacityRows: [
                        {
                            jefatura: "J01 - Taller Norte",
                            supervisors: "8",
                            capacity: "5,320",
                            load: "4,850",
                            utilization: 91,
                            barPercent: 91,
                            utilizationState: "Success",
                            activeOrders: "42",
                            overCapacity: "2",
                            status: "Normal",
                            statusState: "Success"
                        },
                        {
                            jefatura: "J02 - Taller Centro",
                            supervisors: "5",
                            capacity: "4,860",
                            load: "5,450",
                            utilization: 112,
                            barPercent: 100,
                            utilizationState: "Warning",
                            activeOrders: "38",
                            overCapacity: "3",
                            status: "Alto",
                            statusState: "Warning"
                        },
                        {
                            jefatura: "J03 - Taller Sur",
                            supervisors: "6",
                            capacity: "3,720",
                            load: "3,150",
                            utilization: 85,
                            barPercent: 85,
                            utilizationState: "Success",
                            activeOrders: "26",
                            overCapacity: "1",
                            status: "Normal",
                            statusState: "Success"
                        },
                        {
                            jefatura: "J04 - Taller Oriente",
                            supervisors: "4",
                            capacity: "2,240",
                            load: "2,610",
                            utilization: 117,
                            barPercent: 100,
                            utilizationState: "Warning",
                            activeOrders: "18",
                            overCapacity: "2",
                            status: "Alto",
                            statusState: "Warning"
                        },
                        {
                            jefatura: "J05 - Taller Poniente",
                            supervisors: "3",
                            capacity: "1,680",
                            load: "1,280",
                            utilization: 76,
                            barPercent: 76,
                            utilizationState: "Success",
                            activeOrders: "12",
                            overCapacity: "0",
                            status: "Normal",
                            statusState: "Success"
                        },
                        {
                            jefatura: "J06 - Taller Noroeste",
                            supervisors: "2",
                            capacity: "880",
                            load: "650",
                            utilization: 74,
                            barPercent: 74,
                            utilizationState: "Success",
                            activeOrders: "6",
                            overCapacity: "0",
                            status: "Bajo",
                            statusState: "Information"
                        }
                    ],

                    /* ====================================================
                       TABLA: CONSUMO DE MATERIALES
                       ==================================================== */

                    materialRows: [
                        {
                            jefatura: "J01 - Taller Norte",
                            supervisors: "8",
                            category: "Lubricantes",
                            material: "Aceite hidráulico ISO 68",
                            actual: "8,950",
                            unit: "L",
                            plan: "9,500",
                            planUnit: "L",
                            variation: "-5.8%",
                            variationState: "Success",
                            orders: "42",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            jefatura: "J02 - Taller Centro",
                            supervisors: "5",
                            category: "Refacciones",
                            material: "Filtro de aceite PF-47",
                            actual: "3,240",
                            unit: "pzas",
                            plan: "3,400",
                            planUnit: "pzas",
                            variation: "-4.7%",
                            variationState: "Success",
                            orders: "38",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            jefatura: "J03 - Taller Sur",
                            supervisors: "6",
                            category: "Consumibles",
                            material: "Guantes nitrilo L",
                            actual: "2,860",
                            unit: "pzas",
                            plan: "2,780",
                            planUnit: "pzas",
                            variation: "+2.9%",
                            variationState: "Warning",
                            orders: "26",
                            status: "Atención",
                            statusState: "Warning"
                        },
                        {
                            jefatura: "J04 - Taller Oriente",
                            supervisors: "4",
                            category: "Herramientas",
                            material: "Broca HSS 1/2\"",
                            actual: "620",
                            unit: "pzas",
                            plan: "650",
                            planUnit: "pzas",
                            variation: "-4.6%",
                            variationState: "Success",
                            orders: "18",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            jefatura: "J05 - Taller Poniente",
                            supervisors: "3",
                            category: "Refacciones",
                            material: "Banda en V A-40",
                            actual: "1,560",
                            unit: "pzas",
                            plan: "1,700",
                            planUnit: "pzas",
                            variation: "-8.2%",
                            variationState: "Success",
                            orders: "12",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            jefatura: "J06 - Taller Noroeste",
                            supervisors: "2",
                            category: "Grasas",
                            material: "Grasa multipropósito EP2",
                            actual: "840",
                            unit: "kg",
                            plan: "900",
                            planUnit: "kg",
                            variation: "-6.7%",
                            variationState: "Success",
                            orders: "6",
                            status: "En objetivo",
                            statusState: "Success"
                        }
                    ],

                    /* ====================================================
                       PANEL LATERAL DE CATEGORÍAS
                       ==================================================== */

                    categoryRows: [
                        {
                            category: "Lubricantes",
                            quantity: "13,900",
                            unit: "L",
                            percent: 100,
                            icon: "sap-icon://drop"
                        },
                        {
                            category: "Refacciones",
                            quantity: "8,440",
                            unit: "pzas",
                            percent: 61,
                            icon: "sap-icon://action-settings"
                        },
                        {
                            category: "Consumibles",
                            quantity: "5,610",
                            unit: "pzas",
                            percent: 40,
                            icon: "sap-icon://suitcase"
                        },
                        {
                            category: "Herramientas",
                            quantity: "1,360",
                            unit: "pzas",
                            percent: 10,
                            icon: "sap-icon://wrench"
                        },
                        {
                            category: "Grasas",
                            quantity: "840",
                            unit: "kg",
                            percent: 6,
                            icon: "sap-icon://product"
                        }
                    ]
                });

                oViewModel.setSizeLimit(100);

                this.getView().setModel(
                    oViewModel,
                    "view"
                );
            },

            /* ============================================================
               FILTROS
               ============================================================ */

            onApplyFilters: function () {
                var oViewModel = this.getView().getModel("view");
                var oFilters = oViewModel.getProperty("/filters");

                /*
                 * Aquí puedes consumir el servicio correspondiente usando
                 * los valores de oFilters.
                 *
                 * Ejemplo:
                 *
                 * oFilters.period
                 * oFilters.dateFrom
                 * oFilters.dateTo
                 * oFilters.management
                 * oFilters.headship
                 * oFilters.zone
                 * oFilters.serviceType
                 */

                MessageToast.show("Filtros aplicados");
            },

            /* ============================================================
               CAMBIO ENTRE APARTADOS
               No utiliza Router ni cambia de pantalla.
               ============================================================ */

            onOpenMaterials: function () {
                this._setActiveSection("materials");
            },

            onBackToCapacity: function () {
                this._setActiveSection("capacity");
            },

            /**
             * Cambia exclusivamente el contenido dinámico de la pantalla.
             *
             * La cabecera, los filtros y las pestañas permanecen renderizados.
             *
             * @param {string} sSection Apartado que se desea mostrar.
             * @private
             */
            _setActiveSection: function (sSection) {
                var oViewModel = this.getView().getModel("view");
                var aAllowedSections = [
                    "capacity",
                    "materials"
                ];

                if (
                    !oViewModel ||
                    aAllowedSections.indexOf(sSection) === -1
                ) {
                    return;
                }

                if (
                    oViewModel.getProperty("/activeSection") ===
                    sSection
                ) {
                    return;
                }

                oViewModel.setProperty(
                    "/activeSection",
                    sSection
                );
            },

            /* ============================================================
               ACCIONES DE TABLA
               ============================================================ */

            onViewSupervisors: function (oEvent) {
                var oSource = oEvent.getSource();
                var oContext = oSource.getBindingContext("view");
                var sHeadship =
                    "la jefatura seleccionada";
                var sHeadshipId = "";

                if (oContext) {
                    sHeadship =
                        oContext.getProperty("jefatura") ||
                        sHeadship;

                    sHeadshipId =
                        sHeadship.split(" - ")[0];
                }

                MessageToast.show(
                    "Abrir detalle de supervisores: " +
                    sHeadship
                );

                /*
                 * Cuando ya tengas declarada la ruta real en manifest.json,
                 * sustituye el MessageToast por:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo(
                 *         "RouteDetalleSupervisores",
                 *         {
                 *             jefaturaId: sHeadshipId
                 *         }
                 *     );
                 */
            },

            onViewTotals: function () {
                MessageToast.show(
                    "Abrir totales consolidados de la gerencia"
                );
            }
        }
    );
});