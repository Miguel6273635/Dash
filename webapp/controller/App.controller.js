/*sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("mantenimiento.controller.App", {
      onInit() {
      }
  });
});

*/

sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast"
], (BaseController, MessageToast) => {
  "use strict";

  return BaseController.extend("mantenimiento.controller.App", {

    onInit() {
      this.byId("sideNavigation").setSelectedKey("RouteMantenimiento");
    },

    onToggleSideNav() {
      const oToolPage = this.byId("toolPage");
      const bExpanded = oToolPage.getSideExpanded();
      oToolPage.setSideExpanded(!bExpanded);
    },
onMenuSelect: function (oEvent) {
    // 1. Obtenemos el item del menú al que se le hizo clic.
    const oItem = oEvent.getParameter("item");
    // 2. Sacamos su 'key', que es el nombre de la ruta (ej: "RouteCausasZona").
    const sKey = oItem.getKey();

    // 3. Si el elemento no tiene una 'key' (como un título de sección), no hacemos nada y salimos.
    if (!sKey) {
        return;
    }

    // 4. Esta es la magia: Obtenemos el router y navegamos DIRECTAMENTE a la ruta que viene en la 'key', sin preguntar cuál es.
    // Si tiene una 'key', está definida en el manifest.json.
    this.getOwnerComponent().getRouter().navTo(sKey);
}

  });
});