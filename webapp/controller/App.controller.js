sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], function (BaseController, MessageToast) {
  "use strict";

  return BaseController.extend("mantenimiento.controller.App", {

    onInit: function () {
      this.oRouter = this.getOwnerComponent().getRouter();

      var oSideNavigation = this.byId("sideNavigation");

      if (oSideNavigation) {
        oSideNavigation.setSelectedKey("RouteMantenimiento");
      }
    },

    onToggleSideNav: function () {
      var oToolPage = this.byId("toolPage");

      if (!oToolPage) {
        return;
      }

      var bExpanded = oToolPage.getSideExpanded();
      oToolPage.setSideExpanded(!bExpanded);
    },

    onMenuSelect: function (oEvent) {
      var oItem = oEvent.getParameter("item");

      if (!oItem) {
        MessageToast.show("No se encontró la opción seleccionada.");
        return;
      }

      var sKey = oItem.getKey();

      if (!sKey) {
        return;
      }

      console.log("Ruta seleccionada:", sKey);

      var oRouter = this.getOwnerComponent().getRouter();

      if (!oRouter.getRoute(sKey)) {
        MessageToast.show("La ruta no existe en el manifest: " + sKey);
        console.error("Ruta no encontrada en manifest.json:", sKey);
        return;
      }

      oRouter.navTo(sKey);
    },

    onRefresh: function () {
      window.location.reload();
    }

  });
});