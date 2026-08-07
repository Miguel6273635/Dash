sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
  "use strict";

  return Controller.extend("mantenimiento.controller.DetalleHorasTipoOrden", {

    onInit: function () {
      var oData = this._getMockData();
      this.getView().setModel(new JSONModel(oData), "dhto");

      console.group("DETALLE DE HORAS POR TIPO DE ORDEN - MOCK");
      console.log(JSON.stringify(oData, null, 2));
      console.groupEnd();
    },

    onApplyFilters: function () {
      var oModel = this.getView().getModel("dhto");
      var oFilters = oModel.getProperty("/filters");

      console.group("FILTROS - DETALLE HORAS TIPO ORDEN");
      console.log(JSON.stringify(oFilters, null, 2));
      console.groupEnd();

      MessageToast.show("Filtros aplicados");
    },

    onExportar: function () {
      MessageToast.show("Exportación pendiente de conectar");
    },

    onColumnas: function () {
      MessageToast.show("Configuración de columnas pendiente");
    },

    onSearchOrden: function (oEvent) {
      var sValue = oEvent.getParameter("newValue") || "";
      console.log("Buscar orden:", sValue);
    },

    _getMockData: function () {
      return {
        filters: {
          periodo: "Mayo 2024",
          fechaDesde: "01/05/2024",
          fechaHasta: "31/05/2024",
          zona: "Todas",
          supervisor: "Todos",
          turno: "Todos",
          tipoOrden: "Reparación / correctivo",
          estado: "Todos"
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
            { key: "Sur", text: "Sur" }
          ],
          supervisores: [
            { key: "Todos", text: "Todos" },
            { key: "Supervisor 1", text: "Supervisor 1" },
            { key: "Supervisor 2", text: "Supervisor 2" }
          ],
          turnos: [
            { key: "Todos", text: "Todos" },
            { key: "Diurno", text: "Diurno" },
            { key: "Nocturno", text: "Nocturno" },
            { key: "Fin de semana", text: "Fin de semana" }
          ],
          tiposOrden: [
            { key: "Reparación / correctivo", text: "Reparación / correctivo" },
            { key: "Preventiva", text: "Preventiva" },
            { key: "Call Center", text: "Call Center" }
          ],
          estados: [
            { key: "Todos", text: "Todos" },
            { key: "Sobrecargado", text: "Sobrecargado" },
            { key: "Cerca de plan", text: "Cerca de plan" },
            { key: "Dentro de plan", text: "Dentro de plan" }
          ]
        },

        kpis: {
          horasProgramadas: "1,700 h",
          horasReales: "1,910 h",
          variacionHoras: "+210 h",
          variacionPct: "+12.4%",
          otRelacionadas: "95"
        },

        ordenes: [
          {
            ot: "OT-2024-0458",
            cliente: "Torre Reforma",
            elevador: "EV-1024",
            zona: "Norte",
            responsable: "Juan Pérez",
            turno: "Diurno",
            horasPlan: "3.0",
            horasReales: "4.2",
            variacionH: "+1.2",
            variacionPct: "+40.0%",
            estado: "Sobrecargado",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotRed"
          },
          {
            ot: "OT-2024-0332",
            cliente: "Plaza Satélite",
            elevador: "EV-0017",
            zona: "Centro",
            responsable: "María López",
            turno: "Diurno",
            horasPlan: "2.5",
            horasReales: "3.6",
            variacionH: "+1.1",
            variacionPct: "+44.0%",
            estado: "Sobrecargado",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotRed"
          },
          {
            ot: "OT-2024-0378",
            cliente: "Hospital Ángeles",
            elevador: "EV-0516",
            zona: "Sur",
            responsable: "Carlos Ruiz",
            turno: "Nocturno",
            horasPlan: "2.0",
            horasReales: "2.9",
            variacionH: "+0.9",
            variacionPct: "+45.0%",
            estado: "Sobrecargado",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotRed"
          },
          {
            ot: "OT-2024-0389",
            cliente: "Torre Mayor",
            elevador: "EV-0265",
            zona: "Norte",
            responsable: "Pedro López",
            turno: "Diurno",
            horasPlan: "1.8",
            horasReales: "2.2",
            variacionH: "+0.4",
            variacionPct: "+22.2%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          },
          {
            ot: "OT-2024-0411",
            cliente: "Plaza Galerías",
            elevador: "EV-0912",
            zona: "Centro",
            responsable: "Ana Martínez",
            turno: "Fin de semana",
            horasPlan: "2.0",
            horasReales: "2.3",
            variacionH: "+0.3",
            variacionPct: "+15.0%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          },
          {
            ot: "OT-2024-0373",
            cliente: "Plaza Central",
            elevador: "EV-0730",
            zona: "Sur",
            responsable: "Luis Martínez",
            turno: "Nocturno",
            horasPlan: "1.5",
            horasReales: "1.7",
            variacionH: "+0.2",
            variacionPct: "+13.3%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          },
          {
            ot: "OT-2024-0321",
            cliente: "Corporativo ABC",
            elevador: "EV-0442",
            zona: "Centro",
            responsable: "Jorge Hernández",
            turno: "Diurno",
            horasPlan: "1.6",
            horasReales: "1.5",
            variacionH: "-0.1",
            variacionPct: "-6.3%",
            estado: "Dentro de plan",
            colorClass: "dhtoGreenStrong",
            statusDotClass: "dhtoDotGreen"
          },
          {
            ot: "OT-2024-0299",
            cliente: "Universidad Anáhuac",
            elevador: "EV-0512",
            zona: "Sur",
            responsable: "Carlos Ruiz",
            turno: "Diurno",
            horasPlan: "1.3",
            horasReales: "1.1",
            variacionH: "-0.2",
            variacionPct: "-15.4%",
            estado: "Dentro de plan",
            colorClass: "dhtoGreenStrong",
            statusDotClass: "dhtoDotGreen"
          },
          {
            ot: "OT-2024-0344",
            cliente: "Parque Interlomas",
            elevador: "EV-0883",
            zona: "Norte",
            responsable: "María López",
            turno: "Nocturno",
            horasPlan: "1.2",
            horasReales: "1.0",
            variacionH: "-0.2",
            variacionPct: "-16.7%",
            estado: "Dentro de plan",
            colorClass: "dhtoGreenStrong",
            statusDotClass: "dhtoDotGreen"
          },
          {
            ot: "OT-2024-0310",
            cliente: "Centro Comercial Perisur",
            elevador: "EV-0761",
            zona: "Sur",
            responsable: "Pedro López",
            turno: "Fin de semana",
            horasPlan: "1.1",
            horasReales: "0.9",
            variacionH: "-0.2",
            variacionPct: "-18.2%",
            estado: "Dentro de plan",
            colorClass: "dhtoGreenStrong",
            statusDotClass: "dhtoDotGreen"
          }
        ],

        resumenZona: [
          {
            zona: "Norte",
            ot: "34",
            horasPlan: "640",
            horasReales: "745",
            variacionH: "+105",
            variacionPct: "+16.4%",
            estado: "Sobrecargado",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotRed"
          },
          {
            zona: "Centro",
            ot: "33",
            horasPlan: "640",
            horasReales: "720",
            variacionH: "+80",
            variacionPct: "+12.5%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          },
          {
            zona: "Sur",
            ot: "28",
            horasPlan: "420",
            horasReales: "445",
            variacionH: "+25",
            variacionPct: "+6.0%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          }
        ],

        resumenResponsable: [
          {
            responsable: "Juan Pérez",
            ot: "25",
            horasPlan: "440",
            horasReales: "515",
            variacionH: "+75",
            variacionPct: "+17.0%",
            estado: "Sobrecargado",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotRed"
          },
          {
            responsable: "María López",
            ot: "21",
            horasPlan: "380",
            horasReales: "430",
            variacionH: "+50",
            variacionPct: "+13.2%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          },
          {
            responsable: "Carlos Ruiz",
            ot: "19",
            horasPlan: "340",
            horasReales: "380",
            variacionH: "+40",
            variacionPct: "+11.1%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          },
          {
            responsable: "Pedro López",
            ot: "15",
            horasPlan: "280",
            horasReales: "300",
            variacionH: "+20",
            variacionPct: "+7.1%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          },
          {
            responsable: "Ana Martínez",
            ot: "15",
            horasPlan: "260",
            horasReales: "285",
            variacionH: "+25",
            variacionPct: "+9.6%",
            estado: "Cerca de plan",
            colorClass: "dhtoRedStrong",
            statusDotClass: "dhtoDotOrange"
          }
        ]
      };
    }

  });
});
