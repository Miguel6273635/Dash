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

      if (this._iCacheRefreshPoll) {
        window.clearTimeout(this._iCacheRefreshPoll);
      }

      this._fnDocumentPointerDown = null;
      this._fnDocumentKeyDown = null;
      this._fnSideNavMouseEnter = null;
      this._fnSideNavMouseLeave = null;
      this._iSideNavCloseTimer = null;
      this._iCacheRefreshPoll = null;
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
     * Devuelve el intervalo de calendario completo que se refresca desde el
     * menú. La API divide internamente el año por meses y perfiles.
     *
     * @returns {object} Intervalo ISO del año vigente
     * @private
     */
    _getCurrentYearRange: function () {
      var oToday = new Date();
      var iYear = oToday.getFullYear();

      return {
        fechaDesde: iYear + "-01-01",
        fechaHasta: iYear + "-12-31",
        label: String(iYear)
      };
    },

    /**
     * Consulta el estado de la generación temporal mientras esta vista siga
     * abierta. El trabajo continúa en API_DASH si el usuario navega o cierra
     * la aplicación.
     *
     * @param {string} sJobId Identificador devuelto por API_DASH
     * @returns {Promise} Resolución cuando A se publica o rechazo si B falla
     * @private
     */
    _waitForCacheRefresh: function (sJobId) {
      return new Promise(function (resolve, reject) {
        var fnPoll = function () {
          DashboardCacheApiService.getRefreshStatus().then(function (oStatus) {
            var aJobs = (oStatus && oStatus.jobs) || [];
            var oJob = aJobs.filter(function (oItem) {
              return oItem && oItem.id === sJobId;
            }).pop();

            if (!oJob) {
              reject(new Error("No se encontró el estado de la generación en API_DASH."));
              return;
            }

            if (oJob.status === "QUEUED" || oJob.status === "RUNNING") {
              this._iCacheRefreshPoll = window.setTimeout(fnPoll, 15000);
              return;
            }

            this._iCacheRefreshPoll = null;

            if (oJob.status === "COMPLETED") {
              sap.ui.getCore().getEventBus().publish(
                "mantenimiento",
                "cacheRefreshed",
                oJob
              );
              resolve(oJob);
              return;
            }

            reject(new Error(oJob.error ||
              "La generación no pudo publicarse. La información anterior continúa activa."));
          }.bind(this)).catch(reject);
        }.bind(this);

        fnPoll();
      }.bind(this));
    },

    /**
     * Crea una generación temporal del año vigente para todos los perfiles de
     * Mantenimiento. La generación activa no se toca hasta que la temporal
     * contenga cada entidad requerida y se publique de manera atómica.
     */
    onRefreshCache: function () {
      var oRange;

      if (this._cacheRefreshPromise) {
        MessageToast.show("La información se está actualizando en segundo plano.");
        return;
      }

      oRange = this._getCurrentYearRange();

      MessageBox.confirm(
        "Se preparará " + oRange.label +
          " completo para todas las pantallas de Mantenimiento. El proceso puede tardar; los usuarios seguirán viendo la generación vigente hasta que la nueva quede completa.",
        {
          title: "Actualizar información",
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: function (sAction) {
            if (sAction !== MessageBox.Action.OK) {
              return;
            }

            this._cacheRefreshPromise = DashboardCacheApiService.refresh({
              fechaDesde: oRange.fechaDesde,
              fechaHasta: oRange.fechaHasta,
              profiles: [
                "core",
                "operational",
                "materials",
                "compliance",
                "repair",
                "equipment",
                "requests"
              ]
            }).then(function (oJob) {
              MessageToast.show(
                "La generación temporal inició. API_DASH mantiene visibles los datos vigentes."
              );
              return this._waitForCacheRefresh(oJob.id);
            }.bind(this)).then(function () {
              MessageToast.show(
                "Información actualizada. Aplique nuevamente los filtros para ver la nueva generación."
              );
            }).catch(function (oError) {
              MessageToast.show(
                "No fue posible publicar la actualización: " + oError.message
              );
            }).finally(function () {
              this._cacheRefreshPromise = null;
              this._iCacheRefreshPoll = null;
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