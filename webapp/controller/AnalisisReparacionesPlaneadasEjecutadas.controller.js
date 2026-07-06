sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("mantenimiento.controller.AnalisisReparacionesPlaneadasEjecutadas", {

    onInit: function () {
      const oData = this._getMockData();
      this.getView().setModel(new JSONModel(oData), "repa");
      this._applyFilters();
    },

    onAplicarFiltros: function () {
      this._applyFilters();
      MessageToast.show("Filtros aplicados");
    },

    onBuscarMaterial: function (oEvent) {
      const sQuery = (oEvent.getParameter("newValue") || "").trim();
      this.getView().getModel("repa").setProperty("/searchQuery", sQuery);
      this._applyFilters();
    },

    onToggleMaterial: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("repa");
      if (!oContext) {
        return;
      }

      const sPath = oContext.getPath();
      const oModel = this.getView().getModel("repa");
      const bExpanded = oModel.getProperty(sPath + "/expanded");

      oModel.setProperty(sPath + "/expanded", !bExpanded);
      oModel.setProperty(
        sPath + "/chevronIcon",
        !bExpanded ? "sap-icon://navigation-down-arrow" : "sap-icon://navigation-right-arrow"
      );
    },

    onVerNoEjecutadas: function () {
      MessageToast.show("Después conectamos la vista de reparaciones no ejecutadas");
    },

    onVerTodas: function () {
      MessageToast.show("Después conectamos la vista de todas las reparaciones");
    },

    _applyFilters: function () {
      const oModel = this.getView().getModel("repa");
      const aOrdenesOriginales = oModel.getProperty("/ordenesOriginales") || [];
      const aMaterialesActuales = oModel.getProperty("/materiales") || [];

      const mExpanded = {};
      aMaterialesActuales.forEach(function (oMat) {
        mExpanded[oMat.material] = oMat.expanded;
      });

      const sPeriodo = this.byId("selPeriodo").getSelectedKey();
      const dDesde = this.byId("dpDesde").getDateValue();
      const dHasta = this.byId("dpHasta").getDateValue();
      const sZona = this.byId("selZona").getSelectedKey();
      const sCliente = this.byId("selCliente").getSelectedKey();
      const sResponsable = this.byId("selResponsable").getSelectedKey();
      const sSearch = (oModel.getProperty("/searchQuery") || "").toLowerCase();

      let aFiltradas = aOrdenesOriginales.filter(function (oOrden) {
        const dFecha = this._parseDate(oOrden.fecha);
        const bPeriodo =
          sPeriodo === "todos" ||
          (sPeriodo === "mayo" && dFecha.getMonth() === 4) ||
          (sPeriodo === "junio" && dFecha.getMonth() === 5);

        const bFechaDesde = !dDesde || dFecha >= dDesde;
        const bFechaHasta = !dHasta || dFecha <= dHasta;
        const bZona = sZona === "todas" || oOrden.zona === sZona;
        const bCliente = sCliente === "todos" || oOrden.cliente === sCliente;
        const bResponsable = sResponsable === "todos" || oOrden.tecnico === sResponsable;
        const bSearch = !sSearch || oOrden.material.toLowerCase().includes(sSearch);

        return bPeriodo && bFechaDesde && bFechaHasta && bZona && bCliente && bResponsable && bSearch;
      }.bind(this));

      const aEjecutadasFiltradas = aFiltradas.filter(function (oOrden) {
        return oOrden.estado === "EJECUTADA";
      });

      const aNoEjecutadasFiltradas = aFiltradas.filter(function (oOrden) {
        return oOrden.estado === "NO_EJECUTADA";
      });

      const mAgrupadas = {};

      aFiltradas.forEach(function (oOrden) {
        if (!mAgrupadas[oOrden.material]) {
          mAgrupadas[oOrden.material] = {
            material: oOrden.material,
            icon: oOrden.icon,
            ejecutadasRows: [],
            noEjecutadasRows: []
          };
        }

        if (oOrden.estado === "EJECUTADA") {
          mAgrupadas[oOrden.material].ejecutadasRows.push(oOrden);
        } else {
          mAgrupadas[oOrden.material].noEjecutadasRows.push(oOrden);
        }
      });

      const iTotalEjecutadas = aEjecutadasFiltradas.length;
      const iTotalPlaneadas = aFiltradas.length;
      const iTotalNoEjecutadas = aNoEjecutadasFiltradas.length;

      const aMateriales = Object.keys(mAgrupadas)
        .map(function (sMaterial) {
          const oGrupo = mAgrupadas[sMaterial];
          const aRows = oGrupo.ejecutadasRows.slice().sort(function (a, b) {
            return this._parseDate(a.fecha) - this._parseDate(b.fecha);
          }.bind(this));

          if (!aRows.length) {
            return null;
          }

          const aEquiposUnicos = [...new Set(aRows.map(function (o) { return o.equipo; }))];
          const aClientesUnicos = [...new Set(aRows.map(function (o) { return o.cliente; }))];
          const nPromedioDias = aRows.reduce(function (acc, o) {
            return acc + this._parseDays(o.dias);
          }.bind(this), 0) / aRows.length;

          const nPorcentaje = iTotalEjecutadas > 0
            ? (aRows.length / iTotalEjecutadas) * 100
            : 0;

          return {
            material: oGrupo.material,
            icon: oGrupo.icon,
            ejecutadas: aRows.length,
            porcentaje: this._formatPercent(nPorcentaje),
            equipos: aEquiposUnicos.length,
            clientes: aClientesUnicos.length,
            dias: this._formatAverageDays(nPromedioDias),
            expanded: mExpanded[oGrupo.material] !== undefined ? mExpanded[oGrupo.material] : (oGrupo.material === "Sensor de puerta"),
            chevronIcon: (mExpanded[oGrupo.material] !== undefined ? mExpanded[oGrupo.material] : (oGrupo.material === "Sensor de puerta"))
              ? "sap-icon://navigation-down-arrow"
              : "sap-icon://navigation-right-arrow",
            ordenes: aRows.map(function (o) {
              return {
                ot: o.ot,
                equipo: o.equipo,
                cliente: o.cliente,
                fecha: o.fecha,
                tecnico: o.tecnico,
                dias: o.dias
              };
            })
          };
        }.bind(this))
        .filter(Boolean)
        .sort(function (a, b) {
          return b.ejecutadas - a.ejecutadas;
        });

      const nCumplimiento = iTotalPlaneadas > 0 ? (iTotalEjecutadas / iTotalPlaneadas) * 100 : 0;

      oModel.setProperty("/materiales", aMateriales);
      oModel.setProperty("/kpis", {
        planeadas: iTotalPlaneadas,
        ejecutadas: iTotalEjecutadas,
        noEjecutadas: iTotalNoEjecutadas,
        cumplimiento: this._formatPercent(nCumplimiento),
        resumen: iTotalEjecutadas + " de " + iTotalPlaneadas + " OT"
      });

      oModel.setProperty(
        "/infoMessage",
        "Análisis basado en " + iTotalEjecutadas + " OT ejecutadas en el periodo seleccionado."
      );
    },

    _parseDate: function (sFecha) {
      if (!sFecha) {
        return null;
      }
      const aPartes = sFecha.split("/");
      return new Date(
        parseInt(aPartes[2], 10),
        parseInt(aPartes[1], 10) - 1,
        parseInt(aPartes[0], 10)
      );
    },

    _parseDays: function (sDias) {
      if (!sDias) {
        return 0;
      }
      const n = parseFloat(String(sDias).replace(",", "."));
      return isNaN(n) ? 0 : n;
    },

    _formatPercent: function (n) {
      return (Math.round(n * 10) / 10).toFixed(1).replace(".0", "") + "%";
    },

    _formatAverageDays: function (n) {
      const s = (Math.round(n * 10) / 10).toFixed(1).replace(".0", "");
      return s + (s === "1" ? " día" : " días");
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
        "Hospital Norte": "norte"
      };

      const aConfig = [
        {
          material: "Sensor de puerta",
          icon: "sap-icon://iphone",
          ejecutadas: 24,
          noEjecutadas: 2,
          clientes: ["Torre Reforma", "Plaza Satélite", "Hospital Ángeles", "Torre Mayor"],
          responsables: ["Juan Pérez", "María González", "Carlos Herrera"],
          dias: [1, 2, 1, 2]
        },
        {
          material: "Rodamiento guía",
          icon: "sap-icon://target-group",
          ejecutadas: 18,
          noEjecutadas: 1,
          clientes: ["Centro Ejecutivo Sur", "Corporativo Norte", "Torre Reforma"],
          responsables: ["Luis Ramírez", "Carlos Herrera", "Juan Pérez"],
          dias: [3, 2, 2, 4]
        },
        {
          material: "Tarjeta electrónica",
          icon: "sap-icon://it-system",
          ejecutadas: 14,
          noEjecutadas: 1,
          clientes: ["Plaza Central", "Hospital Ángeles", "Plaza Satélite"],
          responsables: ["María González", "Carlos Herrera"],
          dias: [4, 3, 2]
        },
        {
          material: "Contactor principal",
          icon: "sap-icon://energy-saving-lightbulb",
          ejecutadas: 11,
          noEjecutadas: 1,
          clientes: ["Torre Prisma", "Torre Reforma", "Hospital Norte"],
          responsables: ["Juan Pérez", "Carlos Herrera"],
          dias: [2, 3, 2]
        },
        {
          material: "Otros materiales",
          icon: "sap-icon://add-equipment",
          ejecutadas: 21,
          noEjecutadas: 2,
          clientes: ["Hospital Norte", "Torre Mayor", "Plaza Central", "Plaza Satélite"],
          responsables: ["Carlos Herrera", "María González", "Juan Pérez"],
          dias: [3, 2, 4, 2]
        }
      ];

      const aOrdenes = [];
      let iOt = 412;
      let iEquipo = 871;

      aConfig.forEach(function (oCfg) {
        for (let i = 0; i < oCfg.ejecutadas; i++) {
          const sCliente = oCfg.clientes[i % oCfg.clientes.length];
          const sResponsable = oCfg.responsables[i % oCfg.responsables.length];
          const iDia = (i % 28) + 1;
          const iDuracion = oCfg.dias[i % oCfg.dias.length];

          aOrdenes.push({
            material: oCfg.material,
            icon: oCfg.icon,
            estado: "EJECUTADA",
            ot: "OT-2024-" + String(iOt++).padStart(4, "0"),
            equipo: "EV" + String(iEquipo++).padStart(4, "0"),
            cliente: sCliente,
            zona: mZonaCliente[sCliente],
            fecha: String(iDia).padStart(2, "0") + "/05/2024",
            tecnico: sResponsable,
            dias: iDuracion + (iDuracion === 1 ? " día" : " días")
          });
        }

        for (let j = 0; j < oCfg.noEjecutadas; j++) {
          const sClienteNo = oCfg.clientes[j % oCfg.clientes.length];
          const sResponsableNo = oCfg.responsables[j % oCfg.responsables.length];
          const iDiaNo = ((j + 10) % 28) + 1;

          aOrdenes.push({
            material: oCfg.material,
            icon: oCfg.icon,
            estado: "NO_EJECUTADA",
            ot: "OT-2024-" + String(iOt++).padStart(4, "0"),
            equipo: "EV" + String(iEquipo++).padStart(4, "0"),
            cliente: sClienteNo,
            zona: mZonaCliente[sClienteNo],
            fecha: String(iDiaNo).padStart(2, "0") + "/05/2024",
            tecnico: sResponsableNo,
            dias: "0 días"
          });
        }
      });

      return {
        searchQuery: "",
        infoMessage: "",
        kpis: {
          planeadas: 0,
          ejecutadas: 0,
          noEjecutadas: 0,
          cumplimiento: "0%",
          resumen: ""
        },
        materiales: [],
        ordenesOriginales: aOrdenes
      };
    }

  });
});