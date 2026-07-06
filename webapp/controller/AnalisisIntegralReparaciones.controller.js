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
    },

    onAplicarFiltros: function () {
      const oRequest = {
        pantalla: "ANALISIS_INTEGRAL_REPARACIONES",
        filtros: {
          periodo: this.byId("selPeriodoIntegral").getSelectedKey(),
          fechaDesde: this.byId("dpDesdeIntegral").getValue(),
          fechaHasta: this.byId("dpHastaIntegral").getValue(),
          zona: this.byId("selZonaIntegral").getSelectedKey(),
          cliente: this.byId("selClienteIntegral").getSelectedKey(),
          responsable: this.byId("selResponsableIntegral").getSelectedKey()
        }
      };

      console.group("JSON FILTROS - ANÁLISIS INTEGRAL DE REPARACIONES");
      console.log(JSON.stringify(oRequest, null, 2));
      console.groupEnd();

      MessageToast.show("Filtros aplicados");
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

    onBuscarMaterial: function (oEvent) {
      const sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();
      const oModel = this.getView().getModel("intRep");
      const aOriginales = oModel.getProperty("/materialesOriginales");

      if (!sQuery) {
        oModel.setProperty("/materiales", JSON.parse(JSON.stringify(aOriginales)));
        return;
      }

      const aFiltrados = aOriginales.filter(function (oItem) {
        return oItem.material.toLowerCase().includes(sQuery);
      });

      oModel.setProperty("/materiales", JSON.parse(JSON.stringify(aFiltrados)));
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

    _getMockData: function () {
      const aMateriales = [
        {
          material: "Sensor puerta",
          icon: "sap-icon://iphone",
          planeadas: 30,
          ejecutadas: 27,
          noEjecutadas: 3,
          cumplimiento: "90%",
          cumplimientoValue: 90,
          cumplimientoState: "Warning",
          porcentajeTotal: "31.6%",
          expanded: true,
          chevronIcon: "sap-icon://navigation-down-arrow",
          ordenes: [
            {
              ot: "OT-0412",
              estado: "Ejecutada",
              estadoState: "Success",
              estadoIcon: "sap-icon://sys-enter-2",
              cliente: "Torre Reforma",
              elevador: "EV0871",
              fechaProgramada: "12/05/2024",
              fechaEjecucion: "13/05/2024",
              responsable: "Juan Pérez"
            },
            {
              ot: "OT-0432",
              estado: "Ejecutada",
              estadoState: "Success",
              estadoIcon: "sap-icon://sys-enter-2",
              cliente: "Plaza Satélite",
              elevador: "EV1024",
              fechaProgramada: "14/05/2024",
              fechaEjecucion: "15/05/2024",
              responsable: "María González"
            },
            {
              ot: "OT-0478",
              estado: "No ejecutada",
              estadoState: "Error",
              estadoIcon: "sap-icon://decline",
              cliente: "Torre Reforma",
              elevador: "EV0871",
              fechaProgramada: "18/05/2024",
              fechaEjecucion: "—",
              responsable: "Juan Pérez"
            }
          ]
        },
        {
          material: "Rodamiento guía",
          icon: "sap-icon://target-group",
          planeadas: 20,
          ejecutadas: 18,
          noEjecutadas: 2,
          cumplimiento: "90%",
          cumplimientoValue: 90,
          cumplimientoState: "Warning",
          porcentajeTotal: "21.1%",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-0501",
              estado: "Ejecutada",
              estadoState: "Success",
              estadoIcon: "sap-icon://sys-enter-2",
              cliente: "Hospital Ángeles",
              elevador: "EV0636",
              fechaProgramada: "20/05/2024",
              fechaEjecucion: "21/05/2024",
              responsable: "Carlos Herrera"
            },
            {
              ot: "OT-0508",
              estado: "No ejecutada",
              estadoState: "Error",
              estadoIcon: "sap-icon://decline",
              cliente: "Torre Mayor",
              elevador: "EV0582",
              fechaProgramada: "22/05/2024",
              fechaEjecucion: "—",
              responsable: "Juan Pérez"
            }
          ]
        },
        {
          material: "Tarjeta electrónica",
          icon: "sap-icon://it-system",
          planeadas: 15,
          ejecutadas: 14,
          noEjecutadas: 1,
          cumplimiento: "93%",
          cumplimientoValue: 93,
          cumplimientoState: "Success",
          porcentajeTotal: "15.8%",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-0522",
              estado: "Ejecutada",
              estadoState: "Success",
              estadoIcon: "sap-icon://sys-enter-2",
              cliente: "Plaza Central",
              elevador: "EV0710",
              fechaProgramada: "23/05/2024",
              fechaEjecucion: "24/05/2024",
              responsable: "María González"
            }
          ]
        },
        {
          material: "Fusible control",
          icon: "sap-icon://electrocardiogram",
          planeadas: 12,
          ejecutadas: 12,
          noEjecutadas: 0,
          cumplimiento: "100%",
          cumplimientoValue: 100,
          cumplimientoState: "Success",
          porcentajeTotal: "12.6%",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-0540",
              estado: "Ejecutada",
              estadoState: "Success",
              estadoIcon: "sap-icon://sys-enter-2",
              cliente: "Corporativo Norte",
              elevador: "EV0912",
              fechaProgramada: "25/05/2024",
              fechaEjecucion: "25/05/2024",
              responsable: "Carlos Herrera"
            }
          ]
        },
        {
          material: "Zapata freno",
          icon: "sap-icon://product",
          planeadas: 10,
          ejecutadas: 8,
          noEjecutadas: 2,
          cumplimiento: "80%",
          cumplimientoValue: 80,
          cumplimientoState: "Error",
          porcentajeTotal: "10.5%",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-0561",
              estado: "Ejecutada",
              estadoState: "Success",
              estadoIcon: "sap-icon://sys-enter-2",
              cliente: "Torre Prisma",
              elevador: "EV0771",
              fechaProgramada: "27/05/2024",
              fechaEjecucion: "28/05/2024",
              responsable: "Juan Pérez"
            },
            {
              ot: "OT-0575",
              estado: "No ejecutada",
              estadoState: "Error",
              estadoIcon: "sap-icon://decline",
              cliente: "Hospital Norte",
              elevador: "EV0338",
              fechaProgramada: "29/05/2024",
              fechaEjecucion: "—",
              responsable: "María González"
            }
          ]
        }
      ];

      return {
        periodo: {
          fechaCorte: "31/05/2024"
        },
        kpis: {
          planeadas: 95,
          ejecutadas: 88,
          noEjecutadas: 7,
          cumplimiento: "92.6%",
          resumen: "88 de 95 OT"
        },
        materiales: aMateriales,
        materialesOriginales: JSON.parse(JSON.stringify(aMateriales)),
        total: {
          planeadas: 95,
          ejecutadas: 88,
          noEjecutadas: 7,
          cumplimiento: "92.6%",
          cumplimientoValue: 92.6,
          porcentajeTotal: "100%"
        }
      };
    }

  });
});