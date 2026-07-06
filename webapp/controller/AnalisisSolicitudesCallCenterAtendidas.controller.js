sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("mantenimiento.controller.AnalisisSolicitudesCallCenterAtendidas", {

    onInit: function () {
      const oData = this._getMockData();
      this.getView().setModel(new JSONModel(oData), "ccAt");
    },

    onAplicarFiltros: function () {
      const oRequest = {
        pantalla: "ANALISIS_SOLICITUDES_CALL_CENTER_ATENDIDAS",
        filtros: {
          periodo: this.byId("selPeriodoCallAt").getSelectedKey(),
          fechaDesde: this.byId("dpDesdeCallAt").getValue(),
          fechaHasta: this.byId("dpHastaCallAt").getValue(),
          zona: this.byId("selZonaCallAt").getSelectedKey(),
          cliente: this.byId("selClienteCallAt").getSelectedKey(),
          responsable: this.byId("selResponsableCallAt").getSelectedKey()
        }
      };

      console.group("JSON FILTROS - CALL CENTER ATENDIDAS");
      console.log(JSON.stringify(oRequest, null, 2));
      console.groupEnd();

      MessageToast.show("Filtros aplicados");
    },

    onToggleCliente: function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext("ccAt");

      if (!oContext) {
        return;
      }

      const sPath = oContext.getPath();
      const oModel = this.getView().getModel("ccAt");
      const bExpanded = oModel.getProperty(sPath + "/expanded");

      oModel.setProperty(sPath + "/expanded", !bExpanded);
      oModel.setProperty(
        sPath + "/chevronIcon",
        !bExpanded ? "sap-icon://navigation-down-arrow" : "sap-icon://navigation-right-arrow"
      );
    },

    onBuscarCliente: function (oEvent) {
      const sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();
      const oModel = this.getView().getModel("ccAt");
      const aOriginales = oModel.getProperty("/clientesOriginales");

      if (!sQuery) {
        oModel.setProperty("/clientes", JSON.parse(JSON.stringify(aOriginales)));
        return;
      }

      const aFiltrados = aOriginales.filter(function (oCliente) {
        return oCliente.cliente.toLowerCase().includes(sQuery) ||
          oCliente.responsable.toLowerCase().includes(sQuery);
      });

      oModel.setProperty("/clientes", JSON.parse(JSON.stringify(aFiltrados)));
    },

    onVerNoAtendidas: function () {
      MessageToast.show("Después conectamos la vista de solicitudes no atendidas");
    },

    onVerAtendidas: function () {
      MessageToast.show("Ya estás viendo solicitudes atendidas");
    },

    _getMockData: function () {
      const aClientes = [
        {
          cliente: "Torre Reforma",
          icon: "sap-icon://building",
          solicitudes: 8,
          elevadores: 5,
          porcentaje: "12.9%",
          tiempo: "1.3 días",
          responsable: "Juan Pérez",
          expanded: true,
          chevronIcon: "sap-icon://navigation-down-arrow",
          detalle: [
            {
              ot: "OT-0542",
              elevador: "EV0871",
              fechaSolicitud: "02/05/2024 09:15",
              fechaAtencion: "03/05/2024 10:20",
              tiempoRespuesta: "1 día",
              tiempoState: "Success",
              responsable: "Juan Pérez"
            },
            {
              ot: "OT-0558",
              elevador: "EV1024",
              fechaSolicitud: "05/05/2024 11:40",
              fechaAtencion: "06/05/2024 09:30",
              tiempoRespuesta: "1 día",
              tiempoState: "Success",
              responsable: "Juan Pérez"
            },
            {
              ot: "OT-0567",
              elevador: "EV0636",
              fechaSolicitud: "07/05/2024 14:25",
              fechaAtencion: "09/05/2024 10:15",
              tiempoRespuesta: "2 días",
              tiempoState: "Error",
              responsable: "Juan Pérez"
            }
          ]
        },
        {
          cliente: "Plaza Satélite",
          icon: "sap-icon://building",
          solicitudes: 6,
          elevadores: 4,
          porcentaje: "9.7%",
          tiempo: "1.4 días",
          responsable: "María González",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          detalle: [
            {
              ot: "OT-0581",
              elevador: "EV1021",
              fechaSolicitud: "08/05/2024 08:40",
              fechaAtencion: "09/05/2024 09:10",
              tiempoRespuesta: "1 día",
              tiempoState: "Success",
              responsable: "María González"
            },
            {
              ot: "OT-0588",
              elevador: "EV1024",
              fechaSolicitud: "10/05/2024 12:15",
              fechaAtencion: "12/05/2024 10:00",
              tiempoRespuesta: "2 días",
              tiempoState: "Error",
              responsable: "María González"
            }
          ]
        },
        {
          cliente: "Hospital Ángeles",
          icon: "sap-icon://building",
          solicitudes: 5,
          elevadores: 3,
          porcentaje: "8.1%",
          tiempo: "1.6 días",
          responsable: "Carlos Herrera",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          detalle: [
            {
              ot: "OT-0602",
              elevador: "EV0636",
              fechaSolicitud: "11/05/2024 13:10",
              fechaAtencion: "12/05/2024 15:00",
              tiempoRespuesta: "1 día",
              tiempoState: "Success",
              responsable: "Carlos Herrera"
            }
          ]
        },
        {
          cliente: "Torre Mayor",
          icon: "sap-icon://building",
          solicitudes: 4,
          elevadores: 2,
          porcentaje: "6.5%",
          tiempo: "1.7 días",
          responsable: "Pedro López",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          detalle: [
            {
              ot: "OT-0611",
              elevador: "EV0582",
              fechaSolicitud: "13/05/2024 10:30",
              fechaAtencion: "15/05/2024 09:45",
              tiempoRespuesta: "2 días",
              tiempoState: "Error",
              responsable: "Pedro López"
            }
          ]
        },
        {
          cliente: "Plaza Universidad",
          icon: "sap-icon://building",
          solicitudes: 4,
          elevadores: 3,
          porcentaje: "6.5%",
          tiempo: "1.5 días",
          responsable: "María González",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          detalle: [
            {
              ot: "OT-0625",
              elevador: "EV0701",
              fechaSolicitud: "15/05/2024 16:10",
              fechaAtencion: "16/05/2024 17:00",
              tiempoRespuesta: "1 día",
              tiempoState: "Success",
              responsable: "María González"
            }
          ]
        },
        {
          cliente: "Otros clientes (21)",
          icon: "sap-icon://building",
          solicitudes: 35,
          elevadores: 27,
          porcentaje: "56.3%",
          tiempo: "1.6 días",
          responsable: "—",
          expanded: false,
          chevronIcon: "sap-icon://navigation-right-arrow",
          detalle: [
            {
              ot: "OT-0639",
              elevador: "EV0901",
              fechaSolicitud: "20/05/2024 09:10",
              fechaAtencion: "21/05/2024 10:20",
              tiempoRespuesta: "1 día",
              tiempoState: "Success",
              responsable: "Equipo Call Center"
            }
          ]
        }
      ];

      return {
        kpis: {
          planeadas: 65,
          atendidas: 62,
          noAtendidas: 3,
          cumplimiento: "95.3%",
          resumen: "62 de 65 solicitudes"
        },
        clientes: aClientes,
        clientesOriginales: JSON.parse(JSON.stringify(aClientes)),
        total: {
          solicitudes: 62,
          elevadores: 44,
          porcentaje: "100%",
          tiempo: "1.5 días",
          responsable: "—"
        }
      };
    }

  });
});