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
                    { id: 1, responsable: "Juan Pérez", otDesviadas: 6, porcentajeTotal: "27%", causaPrincipal: "Refacciones", causaDetalle: "Retrasos en entrega y disponibilidad", tipoOt: "Preventivo", cumplimiento: "78%", riesgo: "Alto" },
                    { id: 2, responsable: "María González", otDesviadas: 4, porcentajeTotal: "18%", causaPrincipal: "Planeación", causaDetalle: "Programaciones incompletas o cambios de última hora", tipoOt: "Correctivo", cumplimiento: "84%", riesgo: "Medio" },
                    { id: 3, responsable: "Carlos Herrera", otDesviadas: 3, porcentajeTotal: "14%", causaPrincipal: "Cliente no disponible", causaDetalle: "Falta de acceso o personal", tipoOt: "Preventivo", cumplimiento: "88%", riesgo: "Medio" },
                    { id: 4, responsable: "Pedro López", otDesviadas: 2, porcentajeTotal: "9%", causaPrincipal: "Documentación", causaDetalle: "Información incompleta o incorrecta", tipoOt: "Correctivo", cumplimiento: "91%", riesgo: "Bajo" },
                    { id: 5, responsable: "Ana Martínez", otDesviadas: 2, porcentajeTotal: "9%", causaPrincipal: "Condiciones del equipo", causaDetalle: "Equipos en mal estado o sin preparación", tipoOt: "Preventivo", cumplimiento: "94%", riesgo: "Bajo" },
                    { id: 6, responsable: "Luis Ramírez", otDesviadas: 1, porcentajeTotal: "5%", causaPrincipal: "Proveedor", causaDetalle: "Incumplimiento o demora del proveedor", tipoOt: "Correctivo", cumplimiento: "95%", riesgo: "Bajo" }
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
            // El botón presionado es la fuente del evento. Su "abuelo" es el Popover.
            var oPopover = oEvent.getSource().getParent().getParent();
            
            // Obtenemos los datos del usuario que están en el modelo del Popover
            var oUserData = oPopover.getModel("popover").getData();
            var sResponsableId = oUserData.id;

            // 1. Cerramos el popover
            oPopover.close();
            
            // 2. Navegamos a la nueva ruta, pasando el ID del usuario como parámetro
            var oRouter = this.getOwnerComponent().getRouter();
            oRouter.navTo("RouteDetalleResponsable", {
                responsableId: sResponsableId
            }); 
        }
    });
});
