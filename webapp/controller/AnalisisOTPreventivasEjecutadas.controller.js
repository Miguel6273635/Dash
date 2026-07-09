sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("mantenimiento.controller.AnalisisOTPreventivasEjecutadas", {

    onInit: function () {
      var oData = this._getMockData();
      this.getView().setModel(new JSONModel(oData), "otpe");

      console.group("ANÁLISIS OT PREVENTIVAS EJECUTADAS - MOCK");
      console.log(JSON.stringify(oData, null, 2));
      console.groupEnd();
    },

    onToggleMenu: function () {
      MessageToast.show("Menú lateral disponible desde la barra principal.");
    },

    onApplyFilters: function () {
      var oModel = this.getView().getModel("otpe");
      var oFilters = oModel.getProperty("/filters");

      console.group("FILTROS - OT PREVENTIVAS EJECUTADAS");
      console.log(JSON.stringify(oFilters, null, 2));
      console.groupEnd();

      MessageToast.show("Filtros aplicados");
    },

    onToggleResponsable: function (oEvent) {
      var oButton = oEvent.getSource();
      var sPath = oButton.data("path");

      if (!sPath) {
        return;
      }

      var oModel = this.getView().getModel("otpe");
      var bExpanded = !!oModel.getProperty(sPath);
      oModel.setProperty(sPath, !bExpanded);
    },

    onSelectNoEjecutadas: function () {
      var oRouter = this.getOwnerComponent().getRouter();

      if (oRouter.getRoute("RouteAnalisisOTPreventivasNoEjecutadas")) {
        oRouter.navTo("RouteAnalisisOTPreventivasNoEjecutadas");
        return;
      }

      MessageToast.show("Falta registrar RouteAnalisisOTPreventivasNoEjecutadas en el manifest.");
    },

    onSelectEjecutadas: function () {
      MessageToast.show("Ya estás viendo las OT preventivas ejecutadas.");
    },

    onSelectTodas: function () {
      MessageToast.show("Vista de todas las OT pendiente de conectar.");
    },

    onSearchResponsable: function (oEvent) {
      var sValue = oEvent.getParameter("newValue") || "";
      console.log("Buscar responsable:", sValue);
    },

    _getMockData: function () {
      return {
        filters: {
          periodo: "Mayo 2024",
          fechaDesde: "01/05/2024",
          fechaHasta: "31/05/2024",
          zona: "Todas",
          cliente: "Todos",
          responsable: "Todos"
        },

        catalogos: {
          periodos: [
            { key: "Mayo 2024", text: "Mayo 2024" },
            { key: "Junio 2024", text: "Junio 2024" }
          ],
          zonas: [
            { key: "Todas", text: "Todas" },
            { key: "Norte", text: "Norte" },
            { key: "Centro", text: "Centro" },
            { key: "Sur", text: "Sur" },
            { key: "Este", text: "Este" },
            { key: "Oeste", text: "Oeste" }
          ],
          clientes: [
            { key: "Todos", text: "Todos" },
            { key: "Torre Reforma", text: "Torre Reforma" },
            { key: "Plaza Satélite", text: "Plaza Satélite" },
            { key: "Hospital Ángeles", text: "Hospital Ángeles" }
          ],
          responsables: [
            { key: "Todos", text: "Todos" },
            { key: "Juan Pérez", text: "Juan Pérez" },
            { key: "María González", text: "María González" },
            { key: "Carlos Herrera", text: "Carlos Herrera" },
            { key: "Pedro López", text: "Pedro López" }
          ]
        },

        kpis: {
          planeadas: "260",
          ejecutadas: "248",
          noEjecutadas: "12",
          cumplimiento: "95.4%"
        },

        responsables: [
          {
            nombre: "Juan Pérez",
            ot: "54",
            pct: "22%",
            clientes: "18",
            elevadores: "42",
            tiempo: "1.2 días",
            expanded: true
          },
          {
            nombre: "María González",
            ot: "49",
            pct: "20%",
            clientes: "16",
            elevadores: "38",
            tiempo: "1.4 días",
            expanded: false
          },
          {
            nombre: "Carlos Herrera",
            ot: "43",
            pct: "17%",
            clientes: "15",
            elevadores: "35",
            tiempo: "1.6 días",
            expanded: false
          },
          {
            nombre: "Pedro López",
            ot: "38",
            pct: "15%",
            clientes: "14",
            elevadores: "31",
            tiempo: "1.5 días",
            expanded: false
          },
          {
            nombre: "Otros responsables",
            ot: "64",
            pct: "26%",
            clientes: "24",
            elevadores: "55",
            tiempo: "1.8 días",
            expanded: false
          }
        ]
      };
    }

  });
});
