sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "mantenimiento/model/DashboardCacheApiService"
], function (BaseController, MessageToast, MessageBox, DashboardCacheApiService) {
  "use strict";

  return BaseController.extend("mantenimiento.controller.App", {

    /**
     * Inicializa el router y deja el menú lateral contraído.
     */
    onInit: function () {
      this.oRouter = this.getOwnerComponent().getRouter();

      this._fnDocumentPointerDown =
        this._onDocumentPointerDown.bind(this);

      this._fnDocumentKeyDown =
        this._onDocumentKeyDown.bind(this);

      this._fnSideNavMouseEnter =
        this._onSideNavigationMouseEnter.bind(this);

      this._fnSideNavMouseLeave =
        this._onSideNavigationMouseLeave.bind(this);

      document.addEventListener(
        "pointerdown",
        this._fnDocumentPointerDown,
        true
      );

      document.addEventListener(
        "keydown",
        this._fnDocumentKeyDown,
        true
      );

      this._setSideNavigationExpanded(false);

      var oSideNavigation = this.byId("sideNavigation");

      if (oSideNavigation) {
        oSideNavigation.setSelectedKey(
          "RouteMantenimiento"
        );

        oSideNavigation.attachBrowserEvent(
          "mouseenter",
          this._fnSideNavMouseEnter
        );

        oSideNavigation.attachBrowserEvent(
          "mouseleave",
          this._fnSideNavMouseLeave
        );
      }
    },

    /**
     * Libera los eventos globales al destruir la vista.
     */
    onExit: function () {
      if (this._fnDocumentPointerDown) {
        document.removeEventListener(
          "pointerdown",
          this._fnDocumentPointerDown,
          true
        );
      }

      if (this._fnDocumentKeyDown) {
        document.removeEventListener(
          "keydown",
          this._fnDocumentKeyDown,
          true
        );
      }

      var oSideNavigation =
        this.byId("sideNavigation");

      if (oSideNavigation) {
        if (this._fnSideNavMouseEnter) {
          oSideNavigation.detachBrowserEvent(
            "mouseenter",
            this._fnSideNavMouseEnter
          );
        }

        if (this._fnSideNavMouseLeave) {
          oSideNavigation.detachBrowserEvent(
            "mouseleave",
            this._fnSideNavMouseLeave
          );
        }
      }

      if (this._iSideNavCloseTimer) {
        window.clearTimeout(
          this._iSideNavCloseTimer
        );
      }

      this._fnDocumentPointerDown = null;
      this._fnDocumentKeyDown = null;
      this._fnSideNavMouseEnter = null;
      this._fnSideNavMouseLeave = null;
      this._iSideNavCloseTimer = null;
    },

    /**
     * Abre o cierra el menú lateral.
     */
    onToggleSideNav: function () {
      var oToolPage = this.byId("toolPage");

      if (!oToolPage) {
        return;
      }

      this._setSideNavigationExpanded(
        !oToolPage.getSideExpanded()
      );
    },

    /**
     * Navega a la ruta seleccionada y contrae el menú.
     */
    onMenuSelect: function (oEvent) {
      var oItem = oEvent.getParameter("item");

      if (!oItem) {
        MessageToast.show(
          "No se encontró la opción seleccionada."
        );
        return;
      }

      var sKey = oItem.getKey();

      if (sKey === "cacheRefresh") {
        this.onRefreshCache();
        return;
      }

      /*
       * Los elementos padre sin key únicamente despliegan
       * o contraen sus opciones internas.
       */
      if (!sKey) {
        return;
      }

      console.log("Ruta seleccionada:", sKey);

      var oRouter =
        this.oRouter ||
        this.getOwnerComponent().getRouter();

      if (!oRouter.getRoute(sKey)) {
        MessageToast.show(
          "La ruta no existe en el manifest: " +
          sKey
        );

        console.error(
          "Ruta no encontrada en manifest.json:",
          sKey
        );

        return;
      }

      oRouter.navTo(sKey);
      this._closeSideNavigation();
    },

    /**
     * Cancela el cierre automático cuando el mouse vuelve
     * a entrar en el área del menú.
     *
     * @private
     */
    _onSideNavigationMouseEnter: function () {
      if (!this._iSideNavCloseTimer) {
        return;
      }

      window.clearTimeout(
        this._iSideNavCloseTimer
      );

      this._iSideNavCloseTimer = null;
    },

    /**
     * Contrae el menú cuando el mouse sale completamente
     * del área que ocupa la navegación lateral.
     *
     * Se utiliza una espera breve para evitar que el menú
     * se cierre por movimientos accidentales en el borde.
     *
     * @private
     */
    _onSideNavigationMouseLeave: function () {
      var oToolPage = this.byId("toolPage");

      if (
        !oToolPage ||
        !oToolPage.getSideExpanded()
      ) {
        return;
      }

      if (this._iSideNavCloseTimer) {
        window.clearTimeout(
          this._iSideNavCloseTimer
        );
      }

      this._iSideNavCloseTimer =
        window.setTimeout(
          function () {
            this._closeSideNavigation();
            this._iSideNavCloseTimer = null;
          }.bind(this),
          180
        );
    },

    /**
     * Cierra el menú al hacer clic fuera de él.
     *
     * No se utiliza una capa oscura.
     *
     * @param {PointerEvent} oEvent Evento del documento
     * @private
     */
    _onDocumentPointerDown: function (oEvent) {
      var oToolPage = this.byId("toolPage");

      if (
        !oToolPage ||
        !oToolPage.getSideExpanded()
      ) {
        return;
      }

      var oAsideDom =
        oToolPage.getDomRef("aside");

      var oToggleButton =
        this.byId("sideNavToggleButton");

      var oToggleButtonDom =
        oToggleButton &&
        oToggleButton.getDomRef();

      var oTarget = oEvent.target;

      var bInsideMenu =
        oAsideDom &&
        oAsideDom.contains(oTarget);

      var bInsideToggleButton =
        oToggleButtonDom &&
        oToggleButtonDom.contains(oTarget);

      if (
        !bInsideMenu &&
        !bInsideToggleButton
      ) {
        this._closeSideNavigation();
      }
    },

    /**
     * Cierra el menú cuando el usuario presiona Escape.
     *
     * @param {KeyboardEvent} oEvent Evento de teclado
     * @private
     */
    _onDocumentKeyDown: function (oEvent) {
      if (oEvent.key !== "Escape") {
        return;
      }

      this._closeSideNavigation();
    },

    /**
     * Actualiza de forma centralizada el estado del menú.
     *
     * @param {boolean} bExpanded Estado solicitado
     * @private
     */
    _setSideNavigationExpanded: function (
      bExpanded
    ) {
      var oToolPage = this.byId("toolPage");

      if (!oToolPage) {
        return;
      }

      oToolPage.setSideExpanded(
        Boolean(bExpanded)
      );

      oToolPage.toggleStyleClass(
        "appSideNavExpanded",
        Boolean(bExpanded)
      );
    },

    /**
     * Contrae el menú lateral.
     *
     * @private
     */
    _closeSideNavigation: function () {
      this._setSideNavigationExpanded(false);
    },

    /**
     * Recarga la aplicación.
     */
    onRefreshCache: function () {
      if (this._cacheRefreshPromise) {
        MessageToast.show("La información se está actualizando.");
        return;
      }

      MessageBox.confirm(
        "Se consultará SAP para actualizar los datos del mes vigente. Las demás consultas usarán la nueva caché.",
        {
          title: "Actualizar información",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) {
              return;
            }

            this._cacheRefreshPromise = DashboardCacheApiService.refresh({
              scope: "active",
              include: ["orders", "catalogs", "serviceRequests", "blocks"],
              independent: true
            }).then(function (result) {
              sap.ui.getCore().getEventBus().publish(
                "mantenimiento",
                "cacheRefreshed",
                result
              );
              MessageToast.show("Información actualizada. Aplique nuevamente los filtros para ver los datos renovados.");
            }).catch(function (error) {
              MessageToast.show("No fue posible actualizar la información: " + error.message);
            }).finally(function () {
              this._cacheRefreshPromise = null;
            }.bind(this));
          }.bind(this)
        }
      );
    },

    onRefresh: function () {
      window.location.reload();
    }

  });
});