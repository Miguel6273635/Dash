sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, MessageToast, History) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleCargaCapacidadJefatura",
        {

            onInit: function () {
                var oViewModel = new JSONModel({
                    activeTab: "carga",
                    pageSize: "10",

                    filters: {
                        period: "2025-06",
                        from: "2025-06-01",
                        to: "2025-06-30",
                        management: "J01",
                        supervisor: "ALL",
                        shift: "ALL",
                        service: "ALL"
                    },

                    loadRows: [
                        {
                            supervisorId: "SUP-001",
                            supervisor: "Sergio Ramírez",
                            resources: "12",
                            available: "820",
                            scheduled: "1,082",
                            utilization: 132,
                            utilPercent: 100,
                            utilState: "Error",
                            activeOrders: "24",
                            overCapacity: "3",
                            status: "Crítico",
                            statusState: "Error"
                        },
                        {
                            supervisorId: "SUP-002",
                            supervisor: "María Gómez",
                            resources: "11",
                            available: "760",
                            scheduled: "882",
                            utilization: 116,
                            utilPercent: 100,
                            utilState: "Error",
                            activeOrders: "18",
                            overCapacity: "2",
                            status: "Alto",
                            statusState: "Warning"
                        },
                        {
                            supervisorId: "SUP-003",
                            supervisor: "Carlos López",
                            resources: "10",
                            available: "720",
                            scheduled: "785",
                            utilization: 109,
                            utilPercent: 100,
                            utilState: "Warning",
                            activeOrders: "16",
                            overCapacity: "1",
                            status: "Alto",
                            statusState: "Warning"
                        },
                        {
                            supervisorId: "SUP-004",
                            supervisor: "Patricia Soto",
                            resources: "10",
                            available: "960",
                            scheduled: "749",
                            utilization: 78,
                            utilPercent: 78,
                            utilState: "Warning",
                            activeOrders: "17",
                            overCapacity: "0",
                            status: "Normal",
                            statusState: "Information"
                        },
                        {
                            supervisorId: "SUP-005",
                            supervisor: "Jorge Martínez",
                            resources: "12",
                            available: "900",
                            scheduled: "639",
                            utilization: 71,
                            utilPercent: 71,
                            utilState: "Warning",
                            activeOrders: "21",
                            overCapacity: "0",
                            status: "Normal",
                            statusState: "Information"
                        },
                        {
                            supervisorId: "SUP-006",
                            supervisor: "Luis Herrera",
                            resources: "12",
                            available: "1,100",
                            scheduled: "715",
                            utilization: 65,
                            utilPercent: 65,
                            utilState: "Success",
                            activeOrders: "14",
                            overCapacity: "0",
                            status: "Bajo",
                            statusState: "Success"
                        },
                        {
                            supervisorId: "SUP-007",
                            supervisor: "Ana Torres",
                            resources: "8",
                            available: "700",
                            scheduled: "434",
                            utilization: 62,
                            utilPercent: 62,
                            utilState: "Success",
                            activeOrders: "13",
                            overCapacity: "0",
                            status: "Bajo",
                            statusState: "Success"
                        },
                        {
                            supervisorId: "SUP-008",
                            supervisor: "Roberto Díaz",
                            resources: "7",
                            available: "600",
                            scheduled: "360",
                            utilization: 60,
                            utilPercent: 60,
                            utilState: "Success",
                            activeOrders: "13",
                            overCapacity: "0",
                            status: "Bajo",
                            statusState: "Success"
                        }
                    ],

                    materialRows: [
                        {
                            supervisorId: "SUP-001",
                            supervisor: "Sergio Ramírez",
                            resources: "12",
                            category: "Lubricantes",
                            categoryIcon: "sap-icon://drop",
                            material: "Aceite hidráulico ISO 68",
                            actual: "4,320 L",
                            plan: "4,500 L",
                            variation: "-4.0%",
                            variationState: "Success",
                            orders: "46",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            supervisorId: "SUP-002",
                            supervisor: "María Gómez",
                            resources: "11",
                            category: "Refacciones",
                            categoryIcon: "sap-icon://action-settings",
                            material: "Filtro de aceite PF-47",
                            actual: "1,280 pzas",
                            plan: "1,350 pzas",
                            variation: "-5.2%",
                            variationState: "Success",
                            orders: "38",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            supervisorId: "SUP-003",
                            supervisor: "Carlos López",
                            resources: "10",
                            category: "Consumibles",
                            categoryIcon: "sap-icon://product",
                            material: "Grasa multipropósito EP2",
                            actual: "680 kg",
                            plan: "700 kg",
                            variation: "-2.9%",
                            variationState: "Success",
                            orders: "31",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            supervisorId: "SUP-004",
                            supervisor: "Patricia Soto",
                            resources: "10",
                            category: "Herramientas",
                            categoryIcon: "sap-icon://wrench",
                            material: "Broca HSS 1/2\"",
                            actual: "420 pzas",
                            plan: "450 pzas",
                            variation: "-6.7%",
                            variationState: "Success",
                            orders: "25",
                            status: "En objetivo",
                            statusState: "Success"
                        },
                        {
                            supervisorId: "SUP-005",
                            supervisor: "Jorge Martínez",
                            resources: "12",
                            category: "Refacciones",
                            categoryIcon: "sap-icon://action-settings",
                            material: "Banda en V A-40",
                            actual: "420 pzas",
                            plan: "380 pzas",
                            variation: "+10.5%",
                            variationState: "Error",
                            orders: "33",
                            status: "Atención",
                            statusState: "Warning"
                        },
                        {
                            supervisorId: "SUP-006",
                            supervisor: "Luis Herrera",
                            resources: "9",
                            category: "Lubricantes",
                            categoryIcon: "sap-icon://drop",
                            material: "Aceite de motor 15W-40",
                            actual: "380 L",
                            plan: "360 L",
                            variation: "+5.6%",
                            variationState: "Error",
                            orders: "21",
                            status: "Crítico",
                            statusState: "Error"
                        }
                    ],

                    participation: [
                        {
                            category: "Lubricantes",
                            icon: "sap-icon://drop",
                            consumption: "5,180 L",
                            share: "45.2%",
                            percent: 45.2
                        },
                        {
                            category: "Refacciones",
                            icon: "sap-icon://action-settings",
                            consumption: "2,120 pzas",
                            share: "28.3%",
                            percent: 28.3
                        },
                        {
                            category: "Consumibles",
                            icon: "sap-icon://product",
                            consumption: "1,100 kg",
                            share: "18.7%",
                            percent: 18.7
                        },
                        {
                            category: "Herramientas",
                            icon: "sap-icon://wrench",
                            consumption: "480 pzas",
                            share: "7.8%",
                            percent: 7.8
                        }
                    ]
                });

                oViewModel.setSizeLimit(100);
                this.getView().setModel(oViewModel, "view");
            },

            onAfterRendering: function () {
                this._syncTabStyles();
            },

            onShowCarga: function () {
                this._setActiveTab("carga");
            },

            onShowMateriales: function () {
                this._setActiveTab("materiales");
            },

            _setActiveTab: function (sTab) {
                this.getView()
                    .getModel("view")
                    .setProperty("/activeTab", sTab);

                this._syncTabStyles();
            },

            _syncTabStyles: function () {
                var sActiveTab = this.getView()
                    .getModel("view")
                    .getProperty("/activeTab");

                var aCargaButtons = [
                    "tabCargaInCard",
                    "tabCargaTop"
                ];

                var aMaterialButtons = [
                    "tabMaterialesInCard",
                    "tabMaterialesTop"
                ];

                aCargaButtons.forEach(function (sId) {
                    var oButton = this.byId(sId);

                    if (oButton) {
                        oButton.toggleStyleClass(
                            "jefTabActive",
                            sActiveTab === "carga"
                        );
                    }
                }.bind(this));

                aMaterialButtons.forEach(function (sId) {
                    var oButton = this.byId(sId);

                    if (oButton) {
                        oButton.toggleStyleClass(
                            "jefTabActive",
                            sActiveTab === "materiales"
                        );
                    }
                }.bind(this));
            },

            onApplyFilters: function () {
                var oView = this.getView();

                oView.setBusy(true);

                window.setTimeout(function () {
                    if (!oView.bIsDestroyed) {
                        oView.setBusy(false);
                        MessageToast.show(
                            "Filtros aplicados correctamente"
                        );
                    }
                }, 450);
            },

            onSupervisorPress: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("view");

                var sSupervisor = oContext
                    ? oContext.getProperty("supervisor")
                    : "Supervisor";

                MessageToast.show(
                    "Supervisor seleccionado: " + sSupervisor
                );
            },

            onViewResources: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("view");

                var sSupervisor = oContext
                    ? oContext.getProperty("supervisor")
                    : "Supervisor";

                MessageToast.show(
                    "Abrir detalle de recursos de " + sSupervisor
                );

                /*
                 * Cuando tengas la ruta definitiva, reemplaza
                 * el MessageToast por:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo("RouteDetalleOperativoRecursos", {
                 *         supervisorId:
                 *             oContext.getProperty("supervisorId")
                 *     });
                 */
            },

            onViewMaterialDetail: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("view");

                var sSupervisor = oContext
                    ? oContext.getProperty("supervisor")
                    : "Supervisor";

                MessageToast.show(
                    "Abrir consumo de materiales de " + sSupervisor
                );
            },

            onMaterialReport: function () {
                MessageToast.show(
                    "Abrir reporte completo de materiales"
                );
            },

            onPageSizeChange: function (oEvent) {
                MessageToast.show(
                    "Registros por página: " +
                    oEvent.getSource().getSelectedKey()
                );
            },

            onFirstPage: function () {
                MessageToast.show(
                    "Ya estás en la primera página"
                );
            },

            onPreviousPage: function () {
                MessageToast.show(
                    "Ya estás en la primera página"
                );
            },

            onNextPage: function () {
                MessageToast.show(
                    "No hay más páginas"
                );
            },

            onLastPage: function () {
                MessageToast.show(
                    "Ya estás en la última página"
                );
            },

            onBackToJefatura: function () {
                var oHistory = History.getInstance();
                var sPreviousHash = oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                    return;
                }

                var oOwnerComponent = this.getOwnerComponent();
                var oRouter = oOwnerComponent &&
                    oOwnerComponent.getRouter();

                if (
                    oRouter &&
                    oRouter.getRoute("RouteVistaJefatura")
                ) {
                    oRouter.navTo(
                        "RouteVistaJefatura",
                        {},
                        true
                    );
                } else {
                    MessageToast.show(
                        "No se encontró la ruta de Vista Jefatura"
                    );
                }
            }
        }
    );
});