sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("mantenimiento.controller.Mantenimiento", {

    onInit: function () {
      const oMockData = this._getMockDashboardData();

      this.getView().setModel(new JSONModel(oMockData), "dash");

      this._configurarGraficas();

      console.group("DASHBOARD MANTENIMIENTO - JSON RECIBIDO MOCK");
      console.log(JSON.stringify(oMockData, null, 2));
      console.groupEnd();
    },

    onAfterRendering: function () {
      this._activarCardsComoBotones();
    },

    _activarCardsComoBotones: function () {
      const aCards = [
        { id: "cardPlantilla", section: "plantilla" },
        { id: "cardTiempo", section: "tiempo" },
        { id: "cardMateriales", section: "materiales" },
        { id: "cardEficiencia", section: "eficiencia" },
        { id: "cardEstatus", section: "estatus" },
        { id: "cardCostos", section: "costos" },
        { id: "cardOrdenes", section: "ordenes" }
      ];

      aCards.forEach((oItem) => {
        const oCard = this.byId(oItem.id);

        if (oCard && !oCard.data("clickActivo")) {
          oCard.attachBrowserEvent("click", () => {
            this._irADetalle(oItem.section);
          });

          oCard.data("clickActivo", true);
        }
      });
    },

    _irADetalle: function (sSection) {
      console.log("CLICK CARD:", sSection);

      const oDetalleRequest = {
        dashboard: "MANTENIMIENTO",
        tipoConsulta: "DETALLE",
        seccion: sSection,
        filtros: {
          fechaInicio: this.byId("dpInicio").getValue() || null,
          fechaFin: this.byId("dpFin").getValue() || null,
          sociedad: "MX01",
          centro: "SERVICIO"
        }
      };

      console.group("JSON DETALLE QUE SE MANDARÍA AL BACKEND / SAP");
      console.log(JSON.stringify(oDetalleRequest, null, 2));
      console.groupEnd();

      const oRouter = sap.ui.core.UIComponent.getRouterFor(this);

      if (!oRouter) {
        MessageToast.show("No se encontró el router");
        return;
      }

      oRouter.navTo("MantenimientoDetalle", {
        section: sSection
      });
    },

    _configurarGraficas: function () {
      const aCharts = [
        "chartPlantilla",
        "chartTiempo",
        "chartMateriales",
        "chartEficiencia",
        "chartEstatus",
        "chartCostos",
        "chartOrdenes"
      ];

      aCharts.forEach((sId) => {
        const oChart = this.byId(sId);

        if (oChart) {
          oChart.setVizProperties({
            plotArea: {
              dataLabel: {
                visible: true
              }
            },
            legend: {
              visible: true
            },
            title: {
              visible: false
            },
            valueAxis: {
              title: {
                visible: false
              }
            },
            categoryAxis: {
              title: {
                visible: false
              }
            }
          });
        }
      });
    },

    onActualizar: function () {
      const sFechaInicio = this.byId("dpInicio").getValue();
      const sFechaFin = this.byId("dpFin").getValue();

      const oRequestJson = {
        dashboard: "MANTENIMIENTO",
        tipoConsulta: "GENERAL",
        filtros: {
          fechaInicio: sFechaInicio || null,
          fechaFin: sFechaFin || null,
          sociedad: "MX01",
          centro: "SERVICIO"
        }
      };

      console.group("JSON GENERAL QUE SE MANDARÍA AL BACKEND / SAP");
      console.log(JSON.stringify(oRequestJson, null, 2));
      console.groupEnd();

      MessageToast.show("Dashboard actualizado con datos mock");
    },

    _getMockDashboardData: function () {
      return {
        kpis: {
          ordenesAbiertas: 82,
          ordenesCerradas: 156,
          eficienciaPromedio: 87,
          costoReal: 248500
        },

        plantilla: [
          { tipo: "Mecánicos", cantidad: 45 },
          { tipo: "Supervisores", cantidad: 8 },
          { tipo: "Zona Norte", cantidad: 15 },
          { tipo: "Zona Centro", cantidad: 20 },
          { tipo: "Zona Sur", cantidad: 18 }
        ],

        tiempoHoras: [
          { concepto: "Por servicio", horas: 320 },
          { concepto: "Turno", horas: 480 },
          { concepto: "Planeado", horas: 410 },
          { concepto: "Real", horas: 455 }
        ],

        materiales: [
          { material: "Aceite", cantidad: 120 },
          { material: "Grasa", cantidad: 85 },
          { material: "Filtros", cantidad: 60 },
          { material: "Tornillería", cantidad: 140 },
          { material: "Consumibles", cantidad: 210 }
        ],

        eficiencia: [
          { mecanico: "Mecánico 1", porcentaje: 92 },
          { mecanico: "Mecánico 2", porcentaje: 85 },
          { mecanico: "Mecánico 3", porcentaje: 78 },
          { mecanico: "Mecánico 4", porcentaje: 96 },
          { mecanico: "Mecánico 5", porcentaje: 88 }
        ],

        estatusOrdenes: [
          { estatus: "Pendientes", total: 82 },
          { estatus: "En proceso", total: 47 },
          { estatus: "Pendientes firma", total: 34 },
          { estatus: "Cerradas", total: 156 }
        ],

        costos: [
          { mes: "Enero", planeado: 120000, real: 135000, facturado: 145000 },
          { mes: "Febrero", planeado: 140000, real: 132000, facturado: 150000 },
          { mes: "Marzo", planeado: 160000, real: 170000, facturado: 180000 },
          { mes: "Abril", planeado: 155000, real: 148000, facturado: 165000 }
        ],

        ordenes: [
          { tipo: "Preventivas", total: 120 },
          { tipo: "Correctivas", total: 38 },
          { tipo: "No mantenimiento", total: 12 },
          { tipo: "Reprogramadas", total: 25 }
        ]
      };
    }

  });
});