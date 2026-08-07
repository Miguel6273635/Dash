sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, JSONModel, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("mantenimiento.controller.ConsumoRealVsPlanCategoria", {

        onInit: function () {
            var oData = this._getMockData();
            oData.tendenciaSvg = this._crearGraficaTendenciaSvg(oData.tendenciaSemanal);
            this.getView().setModel(new JSONModel(oData), "crpc");
        },

        _getMockData: function () {
            return {
                filtros: {
                    periodo: "mayo2024",
                    fechaDesde: "01/05/2024",
                    fechaHasta: "31/05/2024",
                    zona: "todas",
                    cliente: "todos",
                    responsable: "todos",
                    tipoOt: "todas"
                },

                kpis: {
                    planTotal: "2,200",
                    realTotal: "2,368",
                    desviacionTotal: "+168"
                },

                materialesDesviacion: [
                    {
                        id: "1",
                        material: "Aceite hidráulico",
                        icono: "sap-icon://water",
                        categoria: "Lubricantes",
                        plan: "250",
                        real: "282",
                        contribucion: 100,
                        contribucionTexto: "19.0%",
                        acumulado: "19.0%",
                        ot: "7",
                        elevadores: "5",
                        clientes: "2",
                        norte: "+19",
                        centro: "+10",
                        sur: "+3",
                        occidente: "0",
                        total: "+32",
                        estado: "Red",
                        norteEstado: "Red",
                        centroEstado: "Red",
                        surEstado: "Red",
                        occidenteEstado: "Neutral",
                        totalEstado: "Red"
                    },
                    {
                        id: "2",
                        material: "Sensor de puerta",
                        icono: "sap-icon://shipping-status",
                        categoria: "Refacciones",
                        plan: "82",
                        real: "100",
                        contribucion: 56,
                        contribucionTexto: "10.7%",
                        acumulado: "29.8%",
                        ot: "16",
                        elevadores: "12",
                        clientes: "4",
                        norte: "+12",
                        centro: "+1",
                        sur: "+2",
                        occidente: "0",
                        total: "+18",
                        estado: "Orange",
                        norteEstado: "Red",
                        centroEstado: "Red",
                        surEstado: "Red",
                        occidenteEstado: "Neutral",
                        totalEstado: "Red"
                    },
                    {
                        id: "3",
                        material: "Zapata de freno",
                        icono: "sap-icon://product",
                        categoria: "Refacciones",
                        plan: "129",
                        real: "142",
                        contribucion: 41,
                        contribucionTexto: "7.7%",
                        acumulado: "37.5%",
                        ot: "11",
                        elevadores: "8",
                        clientes: "3",
                        norte: "+6",
                        centro: "+3",
                        sur: "+2",
                        occidente: "0",
                        total: "+13",
                        estado: "Orange",
                        norteEstado: "Red",
                        centroEstado: "Red",
                        surEstado: "Red",
                        occidenteEstado: "Neutral",
                        totalEstado: "Red"
                    },
                    {
                        id: "4",
                        material: "Rodamiento guía",
                        icono: "sap-icon://technical-object",
                        categoria: "Refacciones",
                        plan: "40",
                        real: "48",
                        contribucion: 25,
                        contribucionTexto: "4.8%",
                        acumulado: "42.3%",
                        ot: "6",
                        elevadores: "5",
                        clientes: "2",
                        norte: "+5",
                        centro: "+2",
                        sur: "+1",
                        occidente: "0",
                        total: "+8",
                        estado: "Yellow",
                        norteEstado: "Red",
                        centroEstado: "Red",
                        surEstado: "Red",
                        occidenteEstado: "Neutral",
                        totalEstado: "Red"
                    },
                    {
                        id: "5",
                        material: "Fusible de control",
                        icono: "sap-icon://electrocardiogram",
                        categoria: "Consumibles",
                        plan: "67",
                        real: "51",
                        contribucion: 50,
                        contribucionTexto: "-9.5%",
                        acumulado: "32.7%",
                        ot: "5",
                        elevadores: "4",
                        clientes: "2",
                        norte: "-10",
                        centro: "-5",
                        sur: "-1",
                        occidente: "0",
                        total: "-16",
                        estado: "Green",
                        norteEstado: "Green",
                        centroEstado: "Green",
                        surEstado: "Green",
                        occidenteEstado: "Neutral",
                        totalEstado: "Green"
                    },
                    {
                        id: "6",
                        material: "Cable eléctrico",
                        icono: "sap-icon://chain-link",
                        categoria: "Consumibles",
                        plan: "60",
                        real: "58",
                        contribucion: 8,
                        contribucionTexto: "-1.2%",
                        acumulado: "31.5%",
                        ot: "4",
                        elevadores: "3",
                        clientes: "2",
                        norte: "-1",
                        centro: "-1",
                        sur: "0",
                        occidente: "0",
                        total: "-2",
                        estado: "Green",
                        norteEstado: "Green",
                        centroEstado: "Green",
                        surEstado: "Neutral",
                        occidenteEstado: "Neutral",
                        totalEstado: "Green"
                    },
                    {
                        id: "7",
                        material: "Grasa multipropósito",
                        icono: "sap-icon://lab",
                        categoria: "Lubricantes",
                        plan: "80",
                        real: "74",
                        contribucion: 19,
                        contribucionTexto: "-3.6%",
                        acumulado: "27.9%",
                        ot: "3",
                        elevadores: "3",
                        clientes: "1",
                        norte: "-3",
                        centro: "-2",
                        sur: "-1",
                        occidente: "0",
                        total: "-6",
                        estado: "Green",
                        norteEstado: "Green",
                        centroEstado: "Green",
                        surEstado: "Green",
                        occidenteEstado: "Neutral",
                        totalEstado: "Green"
                    },
                    {
                        id: "8",
                        material: "Contactores",
                        icono: "sap-icon://connected",
                        categoria: "Refacciones",
                        plan: "70",
                        real: "67",
                        contribucion: 10,
                        contribucionTexto: "-1.8%",
                        acumulado: "26.1%",
                        ot: "3",
                        elevadores: "2",
                        clientes: "1",
                        norte: "-2",
                        centro: "-1",
                        sur: "0",
                        occidente: "0",
                        total: "-3",
                        estado: "Green",
                        norteEstado: "Green",
                        centroEstado: "Green",
                        surEstado: "Neutral",
                        occidenteEstado: "Neutral",
                        totalEstado: "Green"
                    }
                ],

                detalleConsumo: [
                    {
                        fecha: "01/05/2024",
                        plan: "50.0",
                        real: "58.0",
                        zona: "Norte",
                        cliente: "Tecno Elevadores",
                        responsable: "Juan Pérez",
                        ot: "15",
                        elevador: "E-101",
                        varPzas: "+8.0",
                        varPct: "+16%"
                    },
                    {
                        fecha: "08/05/2024",
                        plan: "50.0",
                        real: "52.0",
                        zona: "Centro",
                        cliente: "Servi Ascensores",
                        responsable: "Ana Torres",
                        ot: "18",
                        elevador: "E-203",
                        varPzas: "+2.0",
                        varPct: "+4%"
                    },
                    {
                        fecha: "15/05/2024",
                        plan: "50.0",
                        real: "55.0",
                        zona: "Sur",
                        cliente: "Grupo Altura",
                        responsable: "Luis Gómez",
                        ot: "12",
                        elevador: "E-305",
                        varPzas: "+5.0",
                        varPct: "+10%"
                    },
                    {
                        fecha: "22/05/2024",
                        plan: "50.0",
                        real: "60.0",
                        zona: "Norte",
                        cliente: "Tecno Elevadores",
                        responsable: "Juan Pérez",
                        ot: "16",
                        elevador: "E-101",
                        varPzas: "+10.0",
                        varPct: "+20%"
                    },
                    {
                        fecha: "29/05/2024",
                        plan: "50.0",
                        real: "57.0",
                        zona: "Occidente",
                        cliente: "Plus Elevadores",
                        responsable: "Carla Méndez",
                        ot: "14",
                        elevador: "E-402",
                        varPzas: "+7.0",
                        varPct: "+14%"
                    }
                ],

                tendenciaSemanal: [
                    {
                        semana: "Semana 1\n29 abr - 5 may",
                        plan: 0,
                        real: 3,
                        variacion: -3
                    },
                    {
                        semana: "Semana 2\n6 - 12 may",
                        plan: 2,
                        real: 5,
                        variacion: 3
                    },
                    {
                        semana: "Semana 3\n13 - 19 may",
                        plan: 3,
                        real: 10,
                        variacion: 7
                    },
                    {
                        semana: "Semana 4\n20 - 26 may",
                        plan: 4,
                        real: 15,
                        variacion: 11
                    },
                    {
                        semana: "Semana 5\n27 may - 2 jun",
                        plan: 3,
                        real: 20,
                        variacion: 17
                    }
                ]
            };
        },

        _crearGraficaTendenciaSvg: function (aDatos) {
            var aSeries = aDatos || [];
            var aX = [92, 193, 293, 393, 494];
            var iTop = 8;
            var iBottom = 104;
            var iRange = iBottom - iTop;

            function y(iValor) {
                return iTop + ((30 - Number(iValor)) / 40) * iRange;
            }

            function puntos(sPropiedad) {
                return aSeries.map(function (oDato, iIndice) {
                    return aX[iIndice] + "," + y(oDato[sPropiedad]).toFixed(1);
                }).join(" ");
            }

            function marcadores(sPropiedad, sColor) {
                return aSeries.map(function (oDato, iIndice) {
                    return "<circle cx=\"" + aX[iIndice] + "\" cy=\"" +
                        y(oDato[sPropiedad]).toFixed(1) + "\" r=\"2.4\" fill=\"" +
                        sColor + "\" stroke=\"#FFFFFF\" stroke-width=\"0.8\"/>";
                }).join("");
            }

            function etiquetas(sPropiedad, sColor, iDesplazamientoY, iDesplazamientoX, bSigno) {
                return aSeries.map(function (oDato, iIndice) {
                    var iValor = Number(oDato[sPropiedad]);
                    var sValor = bSigno && iValor > 0 ? "+" + iValor : String(iValor);

                    return "<text x=\"" + (aX[iIndice] + iDesplazamientoX) + "\" y=\"" +
                        (y(iValor) + iDesplazamientoY).toFixed(1) + "\" text-anchor=\"middle\" " +
                        "fill=\"" + sColor + "\" font-size=\"8\" font-weight=\"800\">" +
                        sValor + "</text>";
                }).join("");
            }

            var aEscala = [30, 20, 10, 0, -10];
            var sRejilla = aEscala.map(function (iValor) {
                var iY = y(iValor).toFixed(1);
                return "<line x1=\"42\" y1=\"" + iY + "\" x2=\"544\" y2=\"" + iY +
                    "\" stroke=\"#D8E1EC\" stroke-width=\"1\"/>" +
                    "<text x=\"31\" y=\"" + (Number(iY) + 3) +
                    "\" text-anchor=\"end\" fill=\"#60738D\" font-size=\"8\">" + iValor + "</text>";
            }).join("");

            return "<div class=\"crpcTrendSvgInner\">" +
                "<svg viewBox=\"0 0 560 112\" preserveAspectRatio=\"none\" role=\"img\" " +
                "aria-label=\"Tendencia semanal: plan, real y variación\">" +
                sRejilla +
                "<polyline points=\"" + puntos("plan") +
                "\" fill=\"none\" stroke=\"#93C5FD\" stroke-width=\"1.5\"/>" +
                "<polyline points=\"" + puntos("real") +
                "\" fill=\"none\" stroke=\"#2563EB\" stroke-width=\"1.9\"/>" +
                "<polyline points=\"" + puntos("variacion") +
                "\" fill=\"none\" stroke=\"#EF4444\" stroke-width=\"1.6\" " +
                "stroke-dasharray=\"2 4\" stroke-linecap=\"round\"/>" +
                marcadores("plan", "#93C5FD") +
                marcadores("real", "#2563EB") +
                marcadores("variacion", "#EF4444") +
                etiquetas("plan", "#526781", 12, 0, false) +
                etiquetas("real", "#1D4ED8", -7, -5, false) +
                etiquetas("variacion", "#EF4444", -10, 7, true) +
                "</svg></div>";
        },

        _actualizarGraficaTendencia: function () {
            var oModel = this.getView().getModel("crpc");
            oModel.setProperty(
                "/tendenciaSvg",
                this._crearGraficaTendenciaSvg(oModel.getProperty("/tendenciaSemanal"))
            );
        },

        onAplicarFiltros: function () {
            this._actualizarGraficaTendencia();
            MessageToast.show("Filtros aplicados correctamente");
        },

        onBuscarMaterial: function (oEvent) {
            var sValue = oEvent.getParameter("newValue") || "";
            var oTable = this.byId("tblMaterialesDesv");
            var oBinding = oTable && oTable.getBinding("items");

            if (!oBinding) {
                return;
            }

            if (!sValue) {
                oBinding.filter([]);
                return;
            }

            oBinding.filter([
                new Filter("material", FilterOperator.Contains, sValue)
            ]);
        },

        onMaterialPress: function (oEvent) {
            MessageToast.show("Detalle de " + oEvent.getSource().getText());
        },

        onVerSemanas: function () {
            MessageToast.show("Ver histórico de 24 semanas");
        }

    });
});
