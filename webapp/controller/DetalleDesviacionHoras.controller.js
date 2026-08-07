sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleDesviacionHoras", {

        onInit: function () {
            this.getView().setModel(new JSONModel(this._getMockData()), "ddh");

            console.group("DETALLE DE DESVIACIÓN DE HORAS - MOCK");
            console.log(JSON.stringify(this._getMockData(), null, 2));
            console.groupEnd();
        },

        onAplicarFiltros: function () {
            var oModel = this.getView().getModel("ddh");
            var oFilters = oModel.getProperty("/filters");

            console.group("FILTROS - DETALLE DESVIACIÓN DE HORAS");
            console.log(JSON.stringify(oFilters, null, 2));
            console.groupEnd();

            MessageToast.show("Filtros aplicados correctamente");
        },

        onBuscarOrden: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || "";
            var oTable = this.byId("tblDesviacionHoras");
            var oBinding = oTable && oTable.getBinding("items");

            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            oBinding.filter([
                new Filter({
                    filters: [
                        new Filter("ot", FilterOperator.Contains, sValue),
                        new Filter("cliente", FilterOperator.Contains, sValue),
                        new Filter("elevador", FilterOperator.Contains, sValue),
                        new Filter("zona", FilterOperator.Contains, sValue),
                        new Filter("tipoOrden", FilterOperator.Contains, sValue),
                        new Filter("responsable", FilterOperator.Contains, sValue),
                        new Filter("turno", FilterOperator.Contains, sValue),
                        new Filter("estado", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })
            ]);
        },

        _getMockData: function () {
            return {
                filters: {
                    periodo: "Mayo 2024",
                    fechaDesde: "01/05/2024",
                    fechaHasta: "31/05/2024",
                    zona: "Norte",
                    supervisor: "Todos",
                    turno: "Todos",
                    tipoOrden: "Todos",
                    estado: "Todos"
                },

                kpis: {
                    otDesviacion: "68",
                    horasPlanificadas: "5,460 h",
                    horasReales: "6,172 h",
                    desviacionTotal: "+712 h",
                    desviacionPromedio: "+13.0%"
                },

                ordenes: [
                    {
                        ot: "OT-2024-0008",
                        cliente: "Torre Reforma",
                        elevador: "EV-3324",
                        zona: "Norte",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Juan Pérez",
                        turno: "Diurno",
                        horasPlan: "2.0",
                        horasReales: "5.2",
                        variacionH: "+3.2",
                        variacionPct: "+171.7%",
                        estado: "Sobrecargado",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotRed"
                    },
                    {
                        ot: "OT-2024-0123",
                        cliente: "Plaza Satélite",
                        elevador: "EV-0871",
                        zona: "Centro",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "María López",
                        turno: "Diurno",
                        horasPlan: "2.5",
                        horasReales: "3.6",
                        variacionH: "+1.1",
                        variacionPct: "+44.0%",
                        estado: "Sobrecargado",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotRed"
                    },
                    {
                        ot: "OT-2024-0290",
                        cliente: "Hospital Ángeles",
                        elevador: "EV-4153",
                        zona: "Sur",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Carlos Ruiz",
                        turno: "Nocturno",
                        horasPlan: "2.0",
                        horasReales: "2.9",
                        variacionH: "+0.9",
                        variacionPct: "+45.0%",
                        estado: "Sobrecargado",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotRed"
                    },
                    {
                        ot: "OT-2024-0450",
                        cliente: "Torre Mayor",
                        elevador: "EV-0262",
                        zona: "Norte",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Pedro López",
                        turno: "Diurno",
                        horasPlan: "1.8",
                        horasReales: "2.2",
                        variacionH: "+0.4",
                        variacionPct: "+22.2%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        ot: "OT-2024-0451",
                        cliente: "Plaza Galerías",
                        elevador: "EV-0292",
                        zona: "Centro",
                        tipoOrden: "Mantenimiento planeado",
                        responsable: "Ana Martínez",
                        turno: "Fin de semana",
                        horasPlan: "2.0",
                        horasReales: "2.3",
                        variacionH: "+0.3",
                        variacionPct: "+15.0%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        ot: "OT-2024-0471",
                        cliente: "Parque Carso",
                        elevador: "EV-0760",
                        zona: "Sur",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Luis Martínez",
                        turno: "Nocturno",
                        horasPlan: "1.5",
                        horasReales: "1.7",
                        variacionH: "+0.2",
                        variacionPct: "+13.3%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        ot: "OT-2024-0490",
                        cliente: "Centro Comercial Perisur",
                        elevador: "EV-6751",
                        zona: "Sur",
                        tipoOrden: "Mantenimiento planeado",
                        responsable: "Patris Núñez",
                        turno: "Fin de semana",
                        horasPlan: "1.3",
                        horasReales: "1.5",
                        variacionH: "+0.2",
                        variacionPct: "+13.3%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        ot: "OT-2024-0540",
                        cliente: "Universidad Anáhuac",
                        elevador: "EV-9281",
                        zona: "Sur",
                        tipoOrden: "Call Center",
                        responsable: "Pablo López",
                        turno: "Diurno",
                        horasPlan: "1.3",
                        horasReales: "1.5",
                        variacionH: "+0.2",
                        variacionPct: "+15.4%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        ot: "OT-2024-0644",
                        cliente: "Parque Lindavista",
                        elevador: "EV-0283",
                        zona: "Norte",
                        tipoOrden: "Call Center",
                        responsable: "María López",
                        turno: "Nocturno",
                        horasPlan: "1.2",
                        horasReales: "1.4",
                        variacionH: "+0.2",
                        variacionPct: "+16.7%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        ot: "OT-2024-6451",
                        cliente: "Walmart Polanco",
                        elevador: "EV-0881",
                        zona: "Centro",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Jorge Hernández",
                        turno: "Diurno",
                        horasPlan: "1.0",
                        horasReales: "1.2",
                        variacionH: "+0.2",
                        variacionPct: "+20.0%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    }
                ],

                resumenZona: [
                    {
                        zona: "Norte",
                        ot: "14",
                        horasPlan: "1,825",
                        horasReales: "2,140",
                        variacionH: "+315",
                        variacionPct: "+17.3%",
                        estado: "Sobrecargado",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotRed"
                    },
                    {
                        zona: "Centro",
                        ot: "22",
                        horasPlan: "1,796",
                        horasReales: "1,988",
                        variacionH: "+192",
                        variacionPct: "+11.3%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        zona: "Sur",
                        ot: "22",
                        horasPlan: "1,750",
                        horasReales: "1,936",
                        variacionH: "+186",
                        variacionPct: "+10.6%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    }
                ],

                resumenTurno: [
                    {
                        turno: "Diurno",
                        ot: "36",
                        horasPlan: "3,330",
                        horasReales: "3,550",
                        variacionH: "+220",
                        variacionPct: "+6.6%",
                        estado: "Sobrecargado",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotRed"
                    },
                    {
                        turno: "Nocturno",
                        ot: "19",
                        horasPlan: "1,630",
                        horasReales: "1,851",
                        variacionH: "+221",
                        variacionPct: "+13.6%",
                        estado: "Sobrecargado",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotRed"
                    },
                    {
                        turno: "Fin de semana",
                        ot: "13",
                        horasPlan: "730",
                        horasReales: "771",
                        variacionH: "+41",
                        variacionPct: "+5.6%",
                        estado: "Dentro de plan",
                        colorClass: "ddhGreenStrong",
                        statusDotClass: "ddhDotGreen"
                    }
                ],

                resumenTipoOrden: [
                    {
                        tipoOrden: "Reparación / correctivo",
                        ot: "48",
                        horasPlan: "3,840",
                        horasReales: "4,661",
                        variacionH: "+821",
                        variacionPct: "+21.4%",
                        estado: "Sobrecargado",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotRed"
                    },
                    {
                        tipoOrden: "Mantenimiento planeado",
                        ot: "13",
                        horasPlan: "960",
                        horasReales: "1,088",
                        variacionH: "+128",
                        variacionPct: "+13.3%",
                        estado: "Cerca de plan",
                        colorClass: "ddhRedStrong",
                        statusDotClass: "ddhDotOrange"
                    },
                    {
                        tipoOrden: "Call Center",
                        ot: "7",
                        horasPlan: "660",
                        horasReales: "688",
                        variacionH: "+28",
                        variacionPct: "+4.2%",
                        estado: "Dentro de plan",
                        colorClass: "ddhGreenStrong",
                        statusDotClass: "ddhDotGreen"
                    }
                ]
            };
        }
    });
});
