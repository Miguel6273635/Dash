sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, History) {
    "use strict";

    return Controller.extend("mantenimiento.controller.CausasZona", {

        onInit: function () {
            // 1. Arreglo principal de la tabla (Tus datos originales)
            var aIncumplimientos = [
                { OT: "OT-100245", Equipo: "EV-1024", TipoOT: "Preventivo", Cliente: "Torre Reforma", CausaIncumplimiento: "Carta de no mantenimiento", Responsable: "Juan Pérez", DiasAtraso: 5, Estado: "No ejecutada", StatusTipo: "Preventivo", StatusCausa: "Error" },
                { OT: "OT-100311", Equipo: "EV-0871", TipoOT: "Preventivo", Cliente: "Torre Reforma", CausaIncumplimiento: "Falta de refacciones", Responsable: "Juan Pérez", DiasAtraso: 4, Estado: "No ejecutada", StatusTipo: "Preventivo", StatusCausa: "Error" },
                { OT: "OT-100198", Equipo: "EV-0615", TipoOT: "Correctivo", Cliente: "Torre Mayor", CausaIncumplimiento: "Cliente no disponible", Responsable: "Ana López", DiasAtraso: 4, Estado: "No ejecutada", StatusTipo: "Correctivo", StatusCausa: "Warning" },
                { OT: "OT-100276", Equipo: "EV-1330", TipoOT: "Preventivo", Cliente: "Corporativo ABC", CausaIncumplimiento: "Carta de no mantenimiento", Responsable: "Carlos Díaz", DiasAtraso: 3, Estado: "No ejecutada", StatusTipo: "Preventivo", StatusCausa: "Error" },
                { OT: "OT-100332", Equipo: "EV-0456", TipoOT: "Correctivo", Cliente: "Torre Reforma", CausaIncumplimiento: "Falta de refacciones", Responsable: "Juan Pérez", DiasAtraso: 3, Estado: "No ejecutada", StatusTipo: "Correctivo", StatusCausa: "Error" },
                { OT: "OT-100283", Equipo: "EV-0789", TipoOT: "Preventivo", Cliente: "Plaza Galerías", CausaIncumplimiento: "Reprogramación", Responsable: "Ana López", DiasAtraso: 2, Estado: "No ejecutada", StatusTipo: "Preventivo", StatusCausa: "Reprogramacion" }
            ];
            // --- CONFIGURACIÓN ESTÉTICA DE LOS GRÁFICOS VIZFRAME ---
            
            // 1. Configurar Gráfico de Barras Horizontales
            var oBarChart = this.getView().byId("barChartCausas");
            if(oBarChart) {
                oBarChart.setVizProperties({
                    plotArea: {
                        dataLabel: { visible: true }, // Muestra los números en las barras
                        colorPalette: ['#b91c1c', '#c2410c', '#0369a1', '#4b5563'] // Paleta de colores
                    },
                    valueAxis: { title: { visible: false } },    // Ocultar textos de ejes para diseño limpio
                    categoryAxis: { title: { visible: false } },
                    title: { visible: false },
                    legend: { visible: false } // Sin leyenda (las etiquetas ya están en el eje)
                });
            }

            // 2. Configurar Gráfico de Dona
            var oDonutChart = this.getView().byId("donutChartTipos");
            if(oDonutChart) {
                oDonutChart.setVizProperties({
                    plotArea: {
                        dataLabel: { visible: true, type: 'value' }, // Mostrar cantidad en los pedazos
                        colorPalette: ['#0369a1', '#c2410c', '#4b5563'] // Azul(Preventivo), Naranja(Correctivo)
                    },
                    title: { visible: false },
                    legend: { 
                        title: { visible: false }, // Ocultar título de la leyenda
                        drawingEffect: "glossy"
                    }
                });
            }

            // 2. Lógica experta: Generar datos de gráficos dinámicamente a partir de la tabla
            var iTotalOTs = aIncumplimientos.length;
            var oCausasMap = {};
            var oTiposMap = {};

            aIncumplimientos.forEach(function (item) {
                // Agrupar por Causa
                if (!oCausasMap[item.CausaIncumplimiento]) {
                    oCausasMap[item.CausaIncumplimiento] = { Causa: item.CausaIncumplimiento, Cantidad: 0, Color: "Neutral" };
                }
                oCausasMap[item.CausaIncumplimiento].Cantidad++;

                // Agrupar por Tipo OT
                if (!oTiposMap[item.TipoOT]) {
                    oTiposMap[item.TipoOT] = { Tipo: item.TipoOT, Cantidad: 0, Color: "Neutral" };
                }
                oTiposMap[item.TipoOT].Cantidad++;
            });

             // 3. Formatear arreglos finales para los gráficos (Calculando %)
            var aResumenCausas = Object.values(oCausasMap).map(function (obj) {
                obj.Porcentaje = Math.round((obj.Cantidad / iTotalOTs) * 100);
                // Asignar colores semánticos UI5 (MicroCharts usa Error, Critical, Good, Neutral)
                if (obj.Causa.includes("refacciones") || obj.Causa.includes("mantenimiento")) { obj.Color = "Error"; } 
                else if (obj.Causa.includes("Cliente")) { obj.Color = "Critical"; } // <--- ¡AQUÍ ESTÁ LA CORRECCIÓN!
                return obj;
            });
            aResumenCausas.sort((a, b) => b.Cantidad - a.Cantidad);

            var aResumenTipos = Object.values(oTiposMap).map(function (obj) {
                obj.Porcentaje = Math.round((obj.Cantidad / iTotalOTs) * 100);
                // Asignar colores semánticos UI5
                if (obj.Tipo === "Preventivo") { obj.Color = "Good"; } 
                else if (obj.Tipo === "Correctivo") { obj.Color = "Error"; }
                return obj;
            });
            aResumenTipos.sort((a, b) => b.Cantidad - a.Cantidad);


            // 4. Enlazamos los datos a la vista
            var oModel = new JSONModel({
                IncumplimientosData: aIncumplimientos,
                ResumenCausas: aResumenCausas, // <- Datos para InteractiveBarChart
                ResumenTipos: aResumenTipos,   // <- Datos para InteractiveDonutChart
                TotalOTs: iTotalOTs            // Útil si quieres bindear el título general
            });

            this.getView().setModel(oModel);
        },

        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("RouteMantenimiento", {}, true);
            }
        }

    });
});
