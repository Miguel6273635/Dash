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
                    { id: 1, initials: "JP", responsable: "Juan Pérez", otDesviadas: 6, porcentajeTotal: "27%", causaPrincipal: "Refacciones", causaDetalle: "Retrasos en entrega y disponibilidad", causaIcon: "sap-icon://history", tipoOt: "Preventivo", cumplimiento: "78%", cumplimientoValue: 78, riesgo: "Alto" },
                    { id: 2, initials: "MG", responsable: "María González", otDesviadas: 4, porcentajeTotal: "18%", causaPrincipal: "Planeación", causaDetalle: "Programaciones incompletas o cambios de última hora", causaIcon: "sap-icon://calendar", tipoOt: "Correctivo", cumplimiento: "84%", cumplimientoValue: 84, riesgo: "Medio" },
                    { id: 3, initials: "CH", responsable: "Carlos Herrera", otDesviadas: 3, porcentajeTotal: "14%", causaPrincipal: "Cliente no disponible", causaDetalle: "Falta de acceso o personal", causaIcon: "sap-icon://customer", tipoOt: "Preventivo", cumplimiento: "88%", cumplimientoValue: 88, riesgo: "Medio" },
                    { id: 4, initials: "PL", responsable: "Pedro López", otDesviadas: 2, porcentajeTotal: "9%", causaPrincipal: "Documentación", causaDetalle: "Información incompleta o incorrecta", causaIcon: "sap-icon://document", tipoOt: "Correctivo", cumplimiento: "91%", cumplimientoValue: 91, riesgo: "Bajo" },
                    { id: 5, initials: "AM", responsable: "Ana Martínez", otDesviadas: 2, porcentajeTotal: "9%", causaPrincipal: "Condiciones del equipo", causaDetalle: "Equipos en mal estado o sin preparación", causaIcon: "sap-icon://wrench", tipoOt: "Preventivo", cumplimiento: "94%", cumplimientoValue: 94, riesgo: "Bajo" },
                    { id: 6, initials: "LR", responsable: "Luis Ramírez", otDesviadas: 1, porcentajeTotal: "5%", causaPrincipal: "Proveedor", causaDetalle: "Incumplimiento o demora del proveedor", causaIcon: "sap-icon://shipping-status", tipoOt: "Correctivo", cumplimiento: "95%", cumplimientoValue: 95, riesgo: "Bajo" }
                ]
            };
            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel, "data");
        },

        onNavBack: function () {
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteMantenimiento", {}, true);
        },

        formatRiesgoState: function (sRiesgo) {
            if (sRiesgo === "Alto") { return "Error"; }
            if (sRiesgo === "Medio") { return "Warning"; }
            return "Success";
        },

        onResponsablePress: function (oEvent) {
            var oControl = oEvent.getSource();
            var oView = this.getView();
            var oContext = oControl.getBindingContext("data");
            var oUserData = oContext.getObject();

            oUserData.email = oUserData.responsable.split(" ")[0].toLowerCase() + "@tellus.com";
            oUserData.telefono = "+52 55 0000 0000";
            oUserData.otAsignadas = Math.floor(Math.random() * 20) + 10;

            if (!this._pPopover) {
                this._pPopover = Fragment.load({
                    id: oView.getId(),
                    name: "mantenimiento.view.ResponsablePopover",
                    controller: this
                }).then(function (oPopover) {
                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }
            this._pPopover.then(function (oPopover) {
                var oPopoverModel = new JSONModel(oUserData);
                oPopover.setModel(oPopoverModel, "popover");
                oPopover.openBy(oControl);
            });
        },

        onVerDetalleCausas: function (oEvent) {
            var oPopover = oEvent.getSource().getParent().getParent();
            var oUserData = oPopover.getModel("popover").getData();
            var sResponsableId = oUserData.id;

            oPopover.close();
            
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDetalleResponsable", {
                responsableId: sResponsableId
            }); 
        },

        getAvatarColor: function (sId) {
            var aColors = ["Accent1", "Accent2", "Accent3", "Accent4", "Accent5", "Accent6", "Accent7", "Accent8", "Accent9", "Accent10"];
            if (!sId) { return "Accent1"; }
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
        }

    });
});
