sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("mantenimiento.controller.AnalisisOTPreventivasNoEjecutadas", {

    onInit: function () {
      var oModel = new JSONModel(this._getInitialData());
      this.getView().setModel(oModel, "otne");
    },

    onApplyFilters: function () {
      MessageToast.show("Filtros aplicados correctamente.");
    },

    onToggleMenu: function () {
      MessageToast.show("Menú lateral.");
    },

    onSelectNoEjecutadas: function () {
      MessageToast.show("Vista: No ejecutadas.");
    },

    onSelectEjecutadas: function () {
      MessageToast.show("Vista: Ejecutadas.");
    },

    onSelectTodas: function () {
      MessageToast.show("Vista: Todas.");
    },

    onSearchCause: function (oEvent) {
      var sValue = oEvent.getParameter("newValue") || "";
      console.log("Buscar causa:", sValue);
    },

    onToggleCause: function (oEvent) {
      var oButton = oEvent.getSource();
      var sPath = oButton.data("path");

      if (!sPath) {
        return;
      }

      var oModel = this.getView().getModel("otne");
      var bCurrent = oModel.getProperty(sPath);

      oModel.setProperty(sPath, !bCurrent);
    },

    _getInitialData: function () {
      return {
        filters: {
          periodo: "2024-05",
          fechaDesde: "01/05/2024",
          fechaHasta: "31/05/2024",
          zona: "TODAS",
          cliente: "TODOS",
          responsable: "TODOS"
        },

        catalogos: {
          periodos: [
            { key: "2024-05", text: "Mayo 2024" },
            { key: "2024-06", text: "Junio 2024" },
            { key: "2024-07", text: "Julio 2024" }
          ],
          zonas: [
            { key: "TODAS", text: "Todas" },
            { key: "NORTE", text: "Norte" },
            { key: "CENTRO", text: "Centro" },
            { key: "SUR", text: "Sur" },
            { key: "ESTE", text: "Este" },
            { key: "OESTE", text: "Oeste" }
          ],
          clientes: [
            { key: "TODOS", text: "Todos" },
            { key: "TORRE_REFORMA", text: "Torre Reforma" },
            { key: "PLAZA_SATELITE", text: "Plaza Satélite" },
            { key: "HOSPITAL_ANGELES", text: "Hospital Ángeles" }
          ],
          responsables: [
            { key: "TODOS", text: "Todos" },
            { key: "JUAN_PEREZ", text: "Juan Pérez" },
            { key: "MARIA_GONZALEZ", text: "María González" },
            { key: "CARLOS_HERRERA", text: "Carlos Herrera" },
            { key: "PEDRO_LOPEZ", text: "Pedro López" }
          ]
        },

        kpis: {
          planeadas: 260,
          ejecutadas: 248,
          noEjecutadas: 12,
          cumplimiento: "95.4%"
        },

        causes: [
          {
            name: "Carta de no mantenimiento",
            ot: 6,
            pct: "50%",
            clientes: 3,
            elevadores: 5,
            dias: "6 días",
            expanded: true
          },
          {
            name: "Cliente no disponible",
            ot: 3,
            pct: "25%",
            clientes: 2,
            elevadores: 3,
            dias: "5 días",
            expanded: false
          },
          {
            name: "Reprogramación",
            ot: 2,
            pct: "17%",
            clientes: 2,
            elevadores: 2,
            dias: "4 días",
            expanded: false
          },
          {
            name: "Falta de refacciones",
            ot: 1,
            pct: "8%",
            clientes: 1,
            elevadores: 1,
            dias: "3 días",
            expanded: false
          }
        ]
      };
    }

  });
});