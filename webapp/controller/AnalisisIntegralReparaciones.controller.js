sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("mantenimiento.controller.AnalisisIntegralReparaciones", {

    onInit: function () {
      const oData = this._getMockData();
      this.getView().setModel(new JSONModel(oData), "intRep");
      this._applyFilters();
    },

    onAplicarFiltros: function () {
      this._applyFilters();

      const oRequest = {
        pantalla: "ANALISIS_INTEGRAL_REPARACIONES",
        filtros: {
          periodo: this.byId("selPeriodoIntegral").getSelectedKey(),
          fechaDesde: this.byId("dpDesdeIntegral").getValue(),
          fechaHasta: this.byId("dpHastaIntegral").getValue(),
          zona: this.byId("selZonaIntegral").getSelectedKey(),
          cliente: this.byId("selClienteIntegral").getSelectedKey(),
          responsable: this.byId("selResponsableIntegral").getSelectedKey(),
          busquedaMaterial: this.getView().getModel("intRep").getProperty("/searchQuery") || ""
        }
      };

      console.group("JSON FILTROS - ANÁLISIS INTEGRAL DE REPARACIONES");
      console.log(JSON.stringify(oRequest, null, 2));
      console.groupEnd();

      MessageToast.show("Filtros aplicados");
    },

    onBuscarMaterial: function (oEvent) {
      const sQuery = (oEvent.getParameter("newValue") || "").trim();
      this.getView().getModel("intRep").setProperty("/searchQuery", sQuery);
      this._applyFilters();
    },

    onToggleMaterial: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("intRep");

      if (!oContext) {
        return;
      }

      const sPath = oContext.getPath();
      const oModel = this.getView().getModel("intRep");
      const bExpanded = oModel.getProperty(sPath + "/expanded");

      oModel.setProperty(sPath + "/expanded", !bExpanded);
      oModel.setProperty(
        sPath + "/chevronIcon",
        !bExpanded ? "sap-icon://navigation-down-arrow" : "sap-icon://navigation-right-arrow"
      );
    },

    onVerPlaneadas: function () {
      MessageToast.show("Ya estás viendo la vista integral de órdenes planeadas");
    },

    onVerEjecutadas: function () {
      this.getOwnerComponent()
        .getRouter()
        .navTo("RouteAnalisisReparacionesPlaneadasEjecutadas");
    },

    onVerNoEjecutadas: function () {
      MessageToast.show("Después conectamos la vista de reparaciones no ejecutadas");
    },

    onVerDetalleMaterial: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("intRep");

      if (!oContext) {
        return;
      }

      const sMaterial = oContext.getProperty("material");
      const iPlaneadas = oContext.getProperty("planeadas");

      MessageToast.show("Ver las " + iPlaneadas + " órdenes de " + sMaterial);
    },

    _applyFilters: function () {
      const oModel = this.getView().getModel("intRep");
      const aOrdenesOriginales = oModel.getProperty("/ordenesOriginales") || [];
      const aMaterialesActuales = oModel.getProperty("/materiales") || [];

      const mExpanded = {};
      aMaterialesActuales.forEach(function (oMaterial) {
        mExpanded[oMaterial.material] = oMaterial.expanded;
      });

      const sPeriodo = this.byId("selPeriodoIntegral").getSelectedKey();
      const dDesde = this._getDatePickerValue("dpDesdeIntegral");
      const dHasta = this._getDatePickerValue("dpHastaIntegral");
      const sZona = this.byId("selZonaIntegral").getSelectedKey();
      const sCliente = this.byId("selClienteIntegral").getSelectedKey();
      const sResponsable = this.byId("selResponsableIntegral").getSelectedKey();
      const sSearch = (oModel.getProperty("/searchQuery") || "").toLowerCase();

      const aFiltradas = aOrdenesOriginales.filter(function (oOrden) {
        const dFecha = this._parseDate(oOrden.fechaProgramada);

        const bPeriodo =
          sPeriodo === "todos" ||
          (sPeriodo === "mayo" && dFecha.getMonth() === 4) ||
          (sPeriodo === "junio" && dFecha.getMonth() === 5);

        const bFechaDesde = !dDesde || dFecha >= dDesde;
        const bFechaHasta = !dHasta || dFecha <= dHasta;
        const bZona = sZona === "todas" || oOrden.zona === sZona;
        const bCliente = sCliente === "todos" || oOrden.cliente === sCliente;
        const bResponsable = sResponsable === "todos" || oOrden.responsable === sResponsable;
        const bSearch = !sSearch || oOrden.material.toLowerCase().includes(sSearch);

        return bPeriodo && bFechaDesde && bFechaHasta && bZona && bCliente && bResponsable && bSearch;
      }.bind(this));

      const iPlaneadas = aFiltradas.length;
      const iEjecutadas = aFiltradas.filter(function (oOrden) {
        return oOrden.estado === "Ejecutada";
      }).length;
      const iNoEjecutadas = aFiltradas.filter(function (oOrden) {
        return oOrden.estado === "No ejecutada";
      }).length;

      const mAgrupadas = {};

      aFiltradas.forEach(function (oOrden) {
        if (!mAgrupadas[oOrden.material]) {
          mAgrupadas[oOrden.material] = {
            material: oOrden.material,
            icon: oOrden.icon,
            ordenes: []
          };
        }

        mAgrupadas[oOrden.material].ordenes.push(oOrden);
      });

      const aMateriales = Object.keys(mAgrupadas).map(function (sMaterial) {
        const oGrupo = mAgrupadas[sMaterial];
        const aOrdenes = oGrupo.ordenes;

        const iMatPlaneadas = aOrdenes.length;
        const iMatEjecutadas = aOrdenes.filter(function (oOrden) {
          return oOrden.estado === "Ejecutada";
        }).length;
        const iMatNoEjecutadas = aOrdenes.filter(function (oOrden) {
          return oOrden.estado === "No ejecutada";
        }).length;

        const nCumplimiento = iMatPlaneadas > 0 ? (iMatEjecutadas / iMatPlaneadas) * 100 : 0;
        const nPorcentajeTotal = iPlaneadas > 0 ? (iMatPlaneadas / iPlaneadas) * 100 : 0;

        const bExpanded = mExpanded[oGrupo.material] !== undefined
          ? mExpanded[oGrupo.material]
          : oGrupo.material === "Sensor puerta";

        return {
          material: oGrupo.material,
          icon: oGrupo.icon,
          planeadas: iMatPlaneadas,
          ejecutadas: iMatEjecutadas,
          noEjecutadas: iMatNoEjecutadas,
          cumplimiento: this._formatPercent(nCumplimiento),
          cumplimientoValue: Number(nCumplimiento.toFixed(1)),
          cumplimientoState: this._getCumplimientoState(nCumplimiento),
          porcentajeTotal: this._formatPercent(nPorcentajeTotal),
          expanded: bExpanded,
          chevronIcon: bExpanded ? "sap-icon://navigation-down-arrow" : "sap-icon://navigation-right-arrow",
          ordenes: aOrdenes
        };
      }.bind(this)).sort(function (a, b) {
        return b.planeadas - a.planeadas;
      });

      const nCumplimientoGeneral = iPlaneadas > 0 ? (iEjecutadas / iPlaneadas) * 100 : 0;
      const nNoEjecutadasPct = iPlaneadas > 0 ? (iNoEjecutadas / iPlaneadas) * 100 : 0;

      oModel.setProperty("/materiales", aMateriales);

      oModel.setProperty("/kpis", {
        planeadas: iPlaneadas,
        ejecutadas: iEjecutadas,
        noEjecutadas: iNoEjecutadas,
        cumplimiento: this._formatPercent(nCumplimientoGeneral),
        resumen: iEjecutadas + " de " + iPlaneadas + " OT",
        ejecutadasSub: this._formatPercent(nCumplimientoGeneral) + " del total",
        noEjecutadasSub: this._formatPercent(nNoEjecutadasPct) + " del total planeado"
      });

      oModel.setProperty("/tabs", {
        planeadas: "Planeadas (" + iPlaneadas + ")",
        ejecutadas: "Ejecutadas (" + iEjecutadas + ")",
        noEjecutadas: "No ejecutadas (" + iNoEjecutadas + ")"
      });

      oModel.setProperty("/total", {
        planeadas: iPlaneadas,
        ejecutadas: iEjecutadas,
        noEjecutadas: iNoEjecutadas,
        cumplimiento: this._formatPercent(nCumplimientoGeneral),
        cumplimientoValue: Number(nCumplimientoGeneral.toFixed(1)),
        porcentajeTotal: iPlaneadas > 0 ? "100%" : "0%"
      });

      oModel.setProperty(
        "/infoMessage",
        "Vista consolidada de " + iPlaneadas + " órdenes de reparación."
      );
    },

    _getDatePickerValue: function (sId) {
      const oDatePicker = this.byId(sId);

      if (!oDatePicker) {
        return null;
      }

      return oDatePicker.getDateValue() || this._parseDate(oDatePicker.getValue());
    },

    _parseDate: function (sFecha) {
      if (!sFecha || sFecha === "—") {
        return null;
      }

      const aPartes = sFecha.split("/");
      return new Date(
        parseInt(aPartes[2], 10),
        parseInt(aPartes[1], 10) - 1,
        parseInt(aPartes[0], 10)
      );
    },

    _formatDate: function (oDate) {
      const sDia = String(oDate.getDate()).padStart(2, "0");
      const sMes = String(oDate.getMonth() + 1).padStart(2, "0");
      const sAnio = oDate.getFullYear();

      return sDia + "/" + sMes + "/" + sAnio;
    },

    _addDays: function (oDate, iDays) {
      const oNewDate = new Date(oDate.getTime());
      oNewDate.setDate(oNewDate.getDate() + iDays);
      return oNewDate;
    },

    _formatPercent: function (nValue) {
      if (!isFinite(nValue)) {
        return "0%";
      }

      return (Math.round(nValue * 10) / 10).toFixed(1).replace(".0", "") + "%";
    },

    _getCumplimientoState: function (nValue) {
      if (nValue >= 93) {
        return "Success";
      }

      if (nValue >= 85) {
        return "Warning";
      }

      return "Error";
    },

    _getMockData: function () {
      const mZonaCliente = {
        "Torre Reforma": "norte",
        "Plaza Satélite": "norte",
        "Hospital Ángeles": "centro",
        "Torre Mayor": "centro",
        "Centro Ejecutivo Sur": "sur",
        "Corporativo Norte": "norte",
        "Plaza Central": "centro",
        "Torre Prisma": "sur",
        "Hospital Norte": "norte",
        "Plaza Universidad": "sur"
      };

      const aConfig = [
        {
          material: "Sensor puerta",
          icon: "sap-icon://iphone",
          planeadas: 30,
          ejecutadas: 27,
          clientes: ["Torre Reforma", "Plaza Satélite", "Hospital Ángeles", "Torre Mayor"],
          responsables: ["Juan Pérez", "María González", "Carlos Herrera"],
          elevadores: ["EV0871", "EV1024", "EV0636", "EV0582"]
        },
        {
          material: "Rodamiento guía",
          icon: "sap-icon://target-group",
          planeadas: 20,
          ejecutadas: 18,
          clientes: ["Hospital Ángeles", "Torre Mayor", "Centro Ejecutivo Sur", "Corporativo Norte"],
          responsables: ["Carlos Herrera", "Juan Pérez", "Luis Ramírez"],
          elevadores: ["EV0636", "EV0582", "EV0912", "EV1180"]
        },
        {
          material: "Tarjeta electrónica",
          icon: "sap-icon://it-system",
          planeadas: 15,
          ejecutadas: 14,
          clientes: ["Plaza Central", "Plaza Satélite", "Hospital Ángeles"],
          responsables: ["María González", "Carlos Herrera"],
          elevadores: ["EV0710", "EV1024", "EV0636"]
        },
        {
          material: "Fusible control",
          icon: "sap-icon://electrocardiogram",
          planeadas: 12,
          ejecutadas: 12,
          clientes: ["Corporativo Norte", "Torre Reforma", "Plaza Universidad"],
          responsables: ["Carlos Herrera", "Juan Pérez"],
          elevadores: ["EV0912", "EV0871", "EV0701"]
        },
        {
          material: "Zapata freno",
          icon: "sap-icon://product",
          planeadas: 10,
          ejecutadas: 9,
          clientes: ["Torre Prisma", "Hospital Norte", "Torre Mayor"],
          responsables: ["Juan Pérez", "María González"],
          elevadores: ["EV0771", "EV0338", "EV0582"]
        },
        {
          material: "Otros materiales",
          icon: "sap-icon://add-equipment",
          planeadas: 8,
          ejecutadas: 8,
          clientes: ["Hospital Norte", "Plaza Central", "Centro Ejecutivo Sur"],
          responsables: ["Carlos Herrera", "María González", "Luis Ramírez"],
          elevadores: ["EV0338", "EV0710", "EV0912"]
        }
      ];

      const aOrdenes = [];
      let iOt = 412;

      aConfig.forEach(function (oCfg) {
        for (let i = 0; i < oCfg.planeadas; i++) {
          const bEjecutada = i < oCfg.ejecutadas;
          const sCliente = oCfg.clientes[i % oCfg.clientes.length];
          const sResponsable = oCfg.responsables[i % oCfg.responsables.length];
          const sElevador = oCfg.elevadores[i % oCfg.elevadores.length];

          const iDia = (i % 28) + 1;
          const oFechaProgramada = new Date(2024, 4, iDia);
          const oFechaEjecucion = bEjecutada ? this._addDays(oFechaProgramada, (i % 2) + 1) : null;

          aOrdenes.push({
            material: oCfg.material,
            icon: oCfg.icon,
            ot: "OT-" + String(iOt++).padStart(4, "0"),
            estado: bEjecutada ? "Ejecutada" : "No ejecutada",
            estadoState: bEjecutada ? "Success" : "Error",
            estadoIcon: bEjecutada ? "sap-icon://sys-enter-2" : "sap-icon://decline",
            cliente: sCliente,
            zona: mZonaCliente[sCliente],
            elevador: sElevador,
            fechaProgramada: this._formatDate(oFechaProgramada),
            fechaEjecucion: bEjecutada ? this._formatDate(oFechaEjecucion) : "—",
            responsable: sResponsable
          });
        }
      }.bind(this));

      return {
        periodo: {
          fechaCorte: "31/05/2024"
        },
        searchQuery: "",
        infoMessage: "",
        kpis: {
          planeadas: 0,
          ejecutadas: 0,
          noEjecutadas: 0,
          cumplimiento: "0%",
          resumen: "",
          ejecutadasSub: "",
          noEjecutadasSub: ""
        },
        tabs: {
          planeadas: "Planeadas (0)",
          ejecutadas: "Ejecutadas (0)",
          noEjecutadas: "No ejecutadas (0)"
        },
        materiales: [],
        total: {
          planeadas: 0,
          ejecutadas: 0,
          noEjecutadas: 0,
          cumplimiento: "0%",
          cumplimientoValue: 0,
          porcentajeTotal: "0%"
        },
        ordenesOriginales: aOrdenes
      };
    }

  });
});