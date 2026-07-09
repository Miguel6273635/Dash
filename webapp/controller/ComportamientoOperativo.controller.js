sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, Fragment) {
    "use strict";

    return Controller.extend("mantenimiento.controller.ComportamientoOperativo", {

        onInit: function () {
            var oData = {
                responsables: [
                    {
                        id: 1,
                        initials: "JP",
                        responsable: "Juan Pérez",
                        otDesviadas: 6,
                        porcentajeTotal: "27%",
                        causaPrincipal: "Refacciones",
                        causaDetalle: "Retrasos en entrega y disponibilidad",
                        causaIcon: "sap-icon://history",
                        tipoOt: "Preventivo",
                        cumplimiento: "78%",
                        cumplimientoValue: 78,
                        riesgo: "Alto",
                        email: "juan.perez@tellus.com",
                        telefono: "+52 55 0000 0000",
                        otAsignadas: 21,
                        equipos: [
                            { nombre: "EV-1024 Torre Reforma", ots: "2 OT" },
                            { nombre: "EV-897 Torre Reforma", ots: "1 OT" },
                            { nombre: "EV-1201 Corporativo ABC", ots: "2 OT" },
                            { nombre: "EV-1530 Plaza Galerías", ots: "1 OT" }
                        ],
                        clientes: [
                            { nombre: "Torre Reforma", ots: "3 OT" },
                            { nombre: "Corporativo ABC", ots: "2 OT" },
                            { nombre: "Plaza Galerías", ots: "1 OT" }
                        ]
                    },
                    {
                        id: 2,
                        initials: "MG",
                        responsable: "María González",
                        otDesviadas: 4,
                        porcentajeTotal: "18%",
                        causaPrincipal: "Planeación",
                        causaDetalle: "Programaciones incompletas o cambios de última hora",
                        causaIcon: "sap-icon://calendar",
                        tipoOt: "Correctivo",
                        cumplimiento: "84%",
                        cumplimientoValue: 84,
                        riesgo: "Medio",
                        email: "maria.gonzalez@tellus.com",
                        telefono: "+52 55 0000 0000",
                        otAsignadas: 18,
                        equipos: [
                            { nombre: "EV-2101 Torre Norte", ots: "1 OT" },
                            { nombre: "EV-1844 Centro Operativo", ots: "1 OT" },
                            { nombre: "EV-1703 Plaza Central", ots: "2 OT" }
                        ],
                        clientes: [
                            { nombre: "Torre Norte", ots: "1 OT" },
                            { nombre: "Centro Operativo", ots: "1 OT" },
                            { nombre: "Plaza Central", ots: "2 OT" }
                        ]
                    },
                    {
                        id: 3,
                        initials: "CH",
                        responsable: "Carlos Herrera",
                        otDesviadas: 3,
                        porcentajeTotal: "14%",
                        causaPrincipal: "Cliente no disponible",
                        causaDetalle: "Falta de acceso o personal",
                        causaIcon: "sap-icon://customer",
                        tipoOt: "Preventivo",
                        cumplimiento: "88%",
                        cumplimientoValue: 88,
                        riesgo: "Medio",
                        email: "carlos.herrera@tellus.com",
                        telefono: "+52 55 0000 0000",
                        otAsignadas: 16,
                        equipos: [
                            { nombre: "EV-1120 Corporativo ABC", ots: "1 OT" },
                            { nombre: "EV-1198 Corporativo ABC", ots: "1 OT" },
                            { nombre: "EV-1302 Torre Reforma", ots: "1 OT" }
                        ],
                        clientes: [
                            { nombre: "Corporativo ABC", ots: "2 OT" },
                            { nombre: "Torre Reforma", ots: "1 OT" }
                        ]
                    },
                    {
                        id: 4,
                        initials: "PL",
                        responsable: "Pedro López",
                        otDesviadas: 2,
                        porcentajeTotal: "9%",
                        causaPrincipal: "Documentación",
                        causaDetalle: "Información incompleta o incorrecta",
                        causaIcon: "sap-icon://document",
                        tipoOt: "Correctivo",
                        cumplimiento: "91%",
                        cumplimientoValue: 91,
                        riesgo: "Bajo",
                        email: "pedro.lopez@tellus.com",
                        telefono: "+52 55 0000 0000",
                        otAsignadas: 14,
                        equipos: [
                            { nombre: "EV-1410 Plaza Galerías", ots: "1 OT" },
                            { nombre: "EV-1425 Plaza Galerías", ots: "1 OT" }
                        ],
                        clientes: [
                            { nombre: "Plaza Galerías", ots: "2 OT" }
                        ]
                    },
                    {
                        id: 5,
                        initials: "AM",
                        responsable: "Ana Martínez",
                        otDesviadas: 2,
                        porcentajeTotal: "9%",
                        causaPrincipal: "Condiciones del equipo",
                        causaDetalle: "Equipos en mal estado o sin preparación",
                        causaIcon: "sap-icon://wrench",
                        tipoOt: "Preventivo",
                        cumplimiento: "94%",
                        cumplimientoValue: 94,
                        riesgo: "Bajo",
                        email: "ana.martinez@tellus.com",
                        telefono: "+52 55 0000 0000",
                        otAsignadas: 20,
                        equipos: [
                            { nombre: "EV-1620 Torre Médica", ots: "1 OT" },
                            { nombre: "EV-1621 Torre Médica", ots: "1 OT" }
                        ],
                        clientes: [
                            { nombre: "Torre Médica", ots: "2 OT" }
                        ]
                    },
                    {
                        id: 6,
                        initials: "LR",
                        responsable: "Luis Ramírez",
                        otDesviadas: 1,
                        porcentajeTotal: "5%",
                        causaPrincipal: "Proveedor",
                        causaDetalle: "Incumplimiento o demora del proveedor",
                        causaIcon: "sap-icon://shipping-status",
                        tipoOt: "Correctivo",
                        cumplimiento: "95%",
                        cumplimientoValue: 95,
                        riesgo: "Bajo",
                        email: "luis.ramirez@tellus.com",
                        telefono: "+52 55 0000 0000",
                        otAsignadas: 19,
                        equipos: [
                            { nombre: "EV-1908 Corporativo Norte", ots: "1 OT" }
                        ],
                        clientes: [
                            { nombre: "Corporativo Norte", ots: "1 OT" }
                        ]
                    }
                ]
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "data");
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();

            oRouter.navTo("RouteMantenimiento", {}, true);
        },

        onResponsablePress: function (oEvent) {
            var oControl = oEvent.getSource();
            var oView = this.getView();
            var oContext = oControl.getBindingContext("data");

            if (!oContext) {
                return;
            }

            var oUserData = Object.assign({}, oContext.getObject());

            var aEquipos = oUserData.equipos || [];
            var aClientes = oUserData.clientes || [];

            oUserData.otDesviadasText = oUserData.otDesviadas + " OT desviadas";
            oUserData.equiposTitulo = "Equipos afectados (" + aEquipos.length + ")";
            oUserData.clientesTitulo = "Clientes afectados (" + aClientes.length + ")";
            oUserData.equipos = aEquipos;
            oUserData.clientes = aClientes;

            if (!this._pResponsablePopover) {
                this._pResponsablePopover = Fragment.load({
                    id: oView.getId(),
                    name: "mantenimiento.view.ResponsablePopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }

            this._pResponsablePopover.then(function (oPopover) {
                var oPopoverModel = new JSONModel(oUserData);

                oPopover.setModel(oPopoverModel, "popover");
                oPopover.openBy(oControl);
            });
        },

        onVerDetalleResponsable: function () {
            var oPopover = this.getView().byId("responsablePopover");

            if (!oPopover) {
                return;
            }

            var oUserData = oPopover.getModel("popover").getData();
            var sResponsableId = oUserData.id;

            oPopover.close();

            var oRouter = this.getOwnerComponent().getRouter();

            oRouter.navTo("RouteDetalleResponsable", {
                responsableId: sResponsableId
            });
        },

        onVerDetalleCausas: function () {
            this.onVerDetalleResponsable();
        },

        formatRiesgoState: function (sRiesgo) {
            if (sRiesgo === "Alto") {
                return "Error";
            }

            if (sRiesgo === "Medio") {
                return "Warning";
            }

            return "Success";
        },

        getAvatarColor: function (sId) {
            var aColors = [
                "Accent1",
                "Accent2",
                "Accent3",
                "Accent4",
                "Accent5",
                "Accent6",
                "Accent7",
                "Accent8",
                "Accent9",
                "Accent10"
            ];

            if (!sId) {
                return "Accent1";
            }

            return aColors[sId % aColors.length];
        },

        getIconColorClass: function (sIcon) {
            switch (sIcon) {
                case "sap-icon://history":
                    return "colorIconPurple";

                case "sap-icon://calendar":
                    return "colorIconBlue";

                case "sap-icon://customer":
                    return "colorIconOrange";

                case "sap-icon://document":
                    return "colorIconPurple";

                case "sap-icon://wrench":
                    return "colorIconBlue";

                case "sap-icon://shipping-status":
                    return "colorIconGreen";

                default:
                    return "colorIconDefault";
            }
        },

        onExit: function () {
            if (this._pResponsablePopover) {
                this._pResponsablePopover.then(function (oPopover) {
                    if (oPopover) {
                        oPopover.destroy();
                    }
                });
            }
        }

    });
});