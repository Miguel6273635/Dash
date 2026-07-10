sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCapacidadZona", {

        onInit: function () {
            this.getView().setModel(new JSONModel(this._getMockData()), "dcz");
        },

        onVolverHoras: function () {
            var oRouter = this.getOwnerComponent().getRouter();

            if (oRouter.getRoute("RouteHorasTrabajadas")) {
                oRouter.navTo("RouteHorasTrabajadas");
                return;
            }

            MessageToast.show("Ruta de horas trabajadas no encontrada.");
        },

        onAplicarFiltros: function () {
            var oModel = this.getView().getModel("dcz");
            var oFilters = oModel.getProperty("/filters");

            console.group("FILTROS - DETALLE CAPACIDAD POR ZONA");
            console.log(JSON.stringify(oFilters, null, 2));
            console.groupEnd();

            MessageToast.show("Filtros aplicados correctamente");
        },

        onBuscarOrden: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || "";
            var oTable = this.byId("tblOrdenesZona");
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
                        new Filter("responsable", FilterOperator.Contains, sValue),
                        new Filter("tipoOrden", FilterOperator.Contains, sValue)
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
                    zona: "Norte",
                    capacidadDisponible: "1,600 h",
                    horasProgramadas: "1,450 h",
                    horasReales: "1,620 h",
                    utilizacion: "101.3%",
                    estado: "Sobrecargado"
                },

                ordenes: [
                    {
                        ot: "OT-2024-0468",
                        cliente: "Torre Reforma",
                        elevador: "EV-1024",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Juan Pérez",
                        turno: "Diurno",
                        horasPlan: "3.0",
                        horasReales: "4.2",
                        variacionH: "+1.2",
                        variacionPct: "+40.0%",
                        estado: "Sobrecargado",
                        colorClass: "dczRedStrong",
                        statusDotClass: "dczDotRed"
                    },
                    {
                        ot: "OT-2024-0332",
                        cliente: "Plaza Satélite",
                        elevador: "EV-0871",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "María López",
                        turno: "Diurno",
                        horasPlan: "2.5",
                        horasReales: "3.6",
                        variacionH: "+1.1",
                        variacionPct: "+44.0%",
                        estado: "Sobrecargado",
                        colorClass: "dczRedStrong",
                        statusDotClass: "dczDotRed"
                    },
                    {
                        ot: "OT-2024-0378",
                        cliente: "Hospital Ángeles",
                        elevador: "EV-0516",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Carlos Ruiz",
                        turno: "Nocturno",
                        horasPlan: "2.0",
                        horasReales: "2.9",
                        variacionH: "+0.9",
                        variacionPct: "+45.0%",
                        estado: "Sobrecargado",
                        colorClass: "dczRedStrong",
                        statusDotClass: "dczDotRed"
                    },
                    {
                        ot: "OT-2024-0389",
                        cliente: "Torre Mayor",
                        elevador: "EV-0648",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Pedro López",
                        turno: "Diurno",
                        horasPlan: "1.8",
                        horasReales: "2.2",
                        variacionH: "+0.4",
                        variacionPct: "+22.2%",
                        estado: "Cerca de plan",
                        colorClass: "dczRedStrong",
                        statusDotClass: "dczDotOrange"
                    },
                    {
                        ot: "OT-2024-0411",
                        cliente: "Plaza Galerías",
                        elevador: "EV-0912",
                        tipoOrden: "Mantenimiento planeado",
                        responsable: "Ana Martínez",
                        turno: "Fin de semana",
                        horasPlan: "2.0",
                        horasReales: "2.3",
                        variacionH: "+0.3",
                        variacionPct: "+15.0%",
                        estado: "Cerca de plan",
                        colorClass: "dczRedStrong",
                        statusDotClass: "dczDotOrange"
                    },
                    {
                        ot: "OT-2024-0373",
                        cliente: "Plaza Central",
                        elevador: "EV-0730",
                        tipoOrden: "Reparación / correctivo",
                        responsable: "Luis Martínez",
                        turno: "Nocturno",
                        horasPlan: "1.5",
                        horasReales: "1.7",
                        variacionH: "+0.2",
                        variacionPct: "+13.3%",
                        estado: "Cerca de plan",
                        colorClass: "dczRedStrong",
                        statusDotClass: "dczDotOrange"
                    },
                    {
                        ot: "OT-2024-0321",
                        cliente: "Corporativo ABC",
                        elevador: "EV-0442",
                        tipoOrden: "Mantenimiento planeado",
                        responsable: "Jorge Hernández",
                        turno: "Diurno",
                        horasPlan: "1.6",
                        horasReales: "1.5",
                        variacionH: "-0.1",
                        variacionPct: "-6.3%",
                        estado: "Dentro de plan",
                        colorClass: "dczGreenStrong",
                        statusDotClass: "dczDotGreen"
                    },
                    {
                        ot: "OT-2024-0299",
                        cliente: "Universidad Anáhuac",
                        elevador: "EV-0512",
                        tipoOrden: "Call Center",
                        responsable: "Carlos Ruiz",
                        turno: "Diurno",
                        horasPlan: "1.3",
                        horasReales: "1.1",
                        variacionH: "-0.2",
                        variacionPct: "-15.4%",
                        estado: "Dentro de plan",
                        colorClass: "dczGreenStrong",
                        statusDotClass: "dczDotGreen"
                    },
                    {
                        ot: "OT-2024-0344",
                        cliente: "Parque Interlomas",
                        elevador: "EV-0883",
                        tipoOrden: "Call Center",
                        responsable: "María López",
                        turno: "Nocturno",
                        horasPlan: "1.2",
                        horasReales: "1.0",
                        variacionH: "-0.2",
                        variacionPct: "-16.7%",
                        estado: "Dentro de plan",
                        colorClass: "dczGreenStrong",
                        statusDotClass: "dczDotGreen"
                    },
                    {
                        ot: "OT-2024-0310",
                        cliente: "Centro Comercial Perisur",
                        elevador: "EV-0761",
                        tipoOrden: "Mantenimiento planeado",
                        responsable: "Pedro López",
                        turno: "Fin de semana",
                        horasPlan: "1.1",
                        horasReales: "0.9",
                        variacionH: "-0.2",
                        variacionPct: "-18.2%",
                        estado: "Dentro de plan",
                        colorClass: "dczGreenStrong",
                        statusDotClass: "dczDotGreen"
                    }
                ],

                resumenTurno: [
                    {
                        turno: "Diurno",
                        ot: "48",
                        horasPlan: "900",
                        horasReales: "1,040",
                        variacionH: "+140",
                        variacionPct: "115.6%",
                        estado: "Sobrecargado",
                        colorClass: "dczRedStrong",
                        dotClass: "dczDotBlue",
                        statusDotClass: "dczDotRed"
                    },
                    {
                        turno: "Nocturno",
                        ot: "22",
                        horasPlan: "380",
                        horasReales: "410",
                        variacionH: "+30",
                        variacionPct: "107.9%",
                        estado: "Cerca de plan",
                        colorClass: "dczRedStrong",
                        dotClass: "dczDotLightBlue",
                        statusDotClass: "dczDotOrange"
                    },
                    {
                        turno: "Fin de semana",
                        ot: "8",
                        horasPlan: "170",
                        horasReales: "170",
                        variacionH: "0",
                        variacionPct: "100.0%",
                        estado: "Dentro de plan",
                        colorClass: "dczGreenStrong",
                        dotClass: "dczDotTeal",
                        statusDotClass: "dczDotGreen"
                    }
                ],

                resumenTipoOrden: [
                    {
                        tipoOrden: "Reparación / correctivo",
                        ot: "52",
                        horasPlan: "980",
                        horasReales: "1,170",
                        variacionH: "+190",
                        variacionPct: "119.4%",
                        utilizacion: "15.1%",
                        estado: "Sobrecargado",
                        colorClass: "dczRedStrong",
                        utilClass: "dczOrangeStrong",
                        dotClass: "dczDotGreen",
                        statusDotClass: "dczDotRed"
                    },
                    {
                        tipoOrden: "Mantenimiento planeado",
                        ot: "18",
                        horasPlan: "320",
                        horasReales: "310",
                        variacionH: "-10",
                        variacionPct: "-10.0%",
                        utilizacion: "96.9%",
                        estado: "Dentro de plan",
                        colorClass: "dczGreenStrong",
                        utilClass: "dczGreenStrong",
                        dotClass: "dczDotBlue",
                        statusDotClass: "dczDotGreen"
                    },
                    {
                        tipoOrden: "Call Center",
                        ot: "8",
                        horasPlan: "150",
                        horasReales: "140",
                        variacionH: "-10",
                        variacionPct: "-10.0%",
                        utilizacion: "93.3%",
                        estado: "Dentro de plan",
                        colorClass: "dczGreenStrong",
                        utilClass: "dczGreenStrong",
                        dotClass: "dczDotPurple",
                        statusDotClass: "dczDotGreen"
                    }
                ]
            };
        }
    });
});