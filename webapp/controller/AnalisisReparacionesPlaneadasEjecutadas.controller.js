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
    },

    onAplicarFiltros: function () {
      const oRequest = {
        pantalla: "ANALISIS_REPARACIONES_PLANEADAS_EJECUTADAS",
        filtros: {
          periodo: this.byId("selPeriodo").getSelectedKey(),
          fechaDesde: this.byId("dpDesde").getValue(),
          fechaHasta: this.byId("dpHasta").getValue(),
          zona: this.byId("selZona").getSelectedKey(),
          cliente: this.byId("selCliente").getSelectedKey(),
          responsable: this.byId("selResponsable").getSelectedKey()
        }
      };

      console.group("JSON FILTROS - REPARACIONES EJECUTADAS");
      console.log(JSON.stringify(oRequest, null, 2));
      console.groupEnd();

      MessageToast.show("Filtros aplicados");
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

    onBuscarMaterial: function (oEvent) {
      const sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();
      const oModel = this.getView().getModel("repa");
      const aOriginales = oModel.getProperty("/materialesOriginales");

      if (!sQuery) {
        oModel.setProperty("/materiales", aOriginales);
        return;
      }

      const aFiltrados = aOriginales.filter(function (oItem) {
        return oItem.material.toLowerCase().includes(sQuery);
      });

      oModel.setProperty("/materiales", aFiltrados);
    },

    onVerNoEjecutadas: function () {
      MessageToast.show("Después conectamos la vista de reparaciones no ejecutadas");
    },

    onVerTodas: function () {
      MessageToast.show("Después conectamos la vista de todas las reparaciones");
    },

    _getMockData: function () {
      const aMateriales = [
        {
          material: "Sensor de puerta",
          icon: "sap-icon://iphone",
          ejecutadas: 24,
          porcentaje: "27%",
          equipos: 22,
          clientes: 8,
          dias: "2.1 días",
          expanded: true,
          chevronIcon: "sap-icon://navigation-down-arrow",
          ordenes: [
            {
              ot: "OT-2024-0412",
              equipo: "EV0871",
              cliente: "Torre Reforma",
              fecha: "03/05/2024",
              tecnico: "Juan Pérez",
              dias: "1 día"
            },
            {
              ot: "OT-2024-0425",
              equipo: "EV1024",
              cliente: "Plaza Satélite",
              fecha: "04/05/2024",
              tecnico: "María González",
              dias: "2 días"
            },
            {
              ot: "OT-2024-0437",
              equipo: "EV0636",
              cliente: "Hospital Ángeles",
              fecha: "05/05/2024",
              tecnico: "Juan Pérez",
              dias: "1 día"
            },
            {
              ot: "OT-2024-0444",
              equipo: "EV0582",
              cliente: "Torre Mayor",
              fecha: "06/05/2024",
              tecnico: "Carlos Herrera",
              dias: "2 días"
            }
          ]
        },
        {
          material: "Rodamiento guía",
          icon: "sap-icon://target-group",
          ejecutadas: 18,
          porcentaje: "20%",
          equipos: 17,
          clientes: 6,
          dias: "2.8 días",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-2024-0451",
              equipo: "EV0912",
              cliente: "Centro Ejecutivo Sur",
              fecha: "08/05/2024",
              tecnico: "Luis Ramírez",
              dias: "3 días"
            },
            {
              ot: "OT-2024-0466",
              equipo: "EV1180",
              cliente: "Corporativo Norte",
              fecha: "10/05/2024",
              tecnico: "Carlos Herrera",
              dias: "2 días"
            }
          ]
        },
        {
          material: "Tarjeta electrónica",
          icon: "sap-icon://it-system",
          ejecutadas: 14,
          porcentaje: "16%",
          equipos: 13,
          clientes: 5,
          dias: "3.2 días",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-2024-0472",
              equipo: "EV0450",
              cliente: "Plaza Central",
              fecha: "12/05/2024",
              tecnico: "María González",
              dias: "4 días"
            }
          ]
        },
        {
          material: "Contactor principal",
          icon: "sap-icon://energy-saving-lightbulb",
          ejecutadas: 11,
          porcentaje: "13%",
          equipos: 10,
          clientes: 4,
          dias: "2.5 días",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-2024-0488",
              equipo: "EV0771",
              cliente: "Torre Prisma",
              fecha: "15/05/2024",
              tecnico: "Juan Pérez",
              dias: "2 días"
            }
          ]
        },
        {
          material: "Otros materiales",
          icon: "sap-icon://add-equipment",
          ejecutadas: 21,
          porcentaje: "24%",
          equipos: 18,
          clientes: 7,
          dias: "2.7 días",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          ordenes: [
            {
              ot: "OT-2024-0495",
              equipo: "EV0338",
              cliente: "Hospital Norte",
              fecha: "18/05/2024",
              tecnico: "Carlos Herrera",
              dias: "3 días"
            }
          ]
        }
      ];

      return {
        kpis: {
          planeadas: 95,
          ejecutadas: 88,
          noEjecutadas: 7,
          cumplimiento: "92.6%",
          resumen: "88 de 95 OT"
        },
        materiales: aMateriales,
        materialesOriginales: JSON.parse(JSON.stringify(aMateriales))
      };
    }

  });
});