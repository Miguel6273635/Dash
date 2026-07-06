sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/dom/includeStylesheet",
    "sap/m/ActionSheet",
    "sap/m/Button"
], function (Controller, JSONModel, Filter, FilterOperator, includeStylesheet, ActionSheet, Button) {
    "use strict";

    return Controller.extend("mantenimiento.controller.AnalisisElevadores", {

        onInit: function () {
            var sCssPath = sap.ui.require.toUrl("mantenimiento/css/AnalisisElevadores.css");
            includeStylesheet(sCssPath);

            var oData = {
                // DATOS ENRIQUECIDOS POR MESES PARA PROBAR LOS FILTROS
                elevadores: [
                    { elevador: "EV-1024", cliente: "Torre Reforma", zona: "Centro", causa: "Carta de no mantenimiento", otAfectadas: 8, brecha: "-8", estado: "Critico", supervisor: "Juan Pérez", tipoOrden: "Correctivo", mes: "Mayo 2024" },
                    { elevador: "EV-0871", cliente: "Torre Reforma", zona: "Centro", causa: "Carta de no mantenimiento", otAfectadas: 7, brecha: "-7", estado: "Critico", supervisor: "Maria García", tipoOrden: "Emergencia", mes: "Mayo 2024" },
                    { elevador: "EV-0442", cliente: "Plaza Satélite", zona: "Norte", causa: "Falta de refacciones", otAfectadas: 6, brecha: "-6", estado: "Alto", supervisor: "Luis Sanchez", tipoOrden: "Correctivo", mes: "Abril 2024" },
                    { elevador: "EV-0615", cliente: "Hospital San José", zona: "Norte", causa: "Carta de no mantenimiento", otAfectadas: 5, brecha: "-5", estado: "Alto", supervisor: "Juan Pérez", tipoOrden: "Preventivo", mes: "Abril 2024" },
                    { elevador: "EV-0521", cliente: "Torre Mayor", zona: "Norte", causa: "Falta de refacciones", otAfectadas: 4, brecha: "-4", estado: "Medio", supervisor: "Maria García", tipoOrden: "Correctivo", mes: "Marzo 2024" },
                    { elevador: "EV-0722", cliente: "Centro Santa Fe", zona: "Centro", causa: "Cliente no disponible", otAfectadas: 3, brecha: "-3", estado: "Medio", supervisor: "Luis Sanchez", tipoOrden: "Preventivo", mes: "Marzo 2024" },
                    { elevador: "EV-0144", cliente: "Residencial Bosques", zona: "Sur", causa: "Reprogramación", otAfectadas: 3, brecha: "-3", estado: "Medio", supervisor: "Juan Pérez", tipoOrden: "Correctivo", mes: "Mayo 2024" },
                    { elevador: "EV-0833", cliente: "Plaza Galerías", zona: "Centro", causa: "Reprogramación", otAfectadas: 2, brecha: "-2", estado: "Bajo", supervisor: "Maria García", tipoOrden: "Preventivo", mes: "Abril 2024" },
                    { elevador: "EV-0911", cliente: "Edificio Insurgentes", zona: "Sur", causa: "Falta de refacciones", otAfectadas: 2, brecha: "-2", estado: "Bajo", supervisor: "Luis Sanchez", tipoOrden: "Emergencia", mes: "Marzo 2024" }
                ],
                // Opciones para los menús desplegables (AHORA POR MESES)
                opcionesPeriodo: ["Todos", "Mayo 2024", "Abril 2024", "Marzo 2024"],
                opcionesZona: ["Todas", "Norte", "Centro", "Sur"],
                opcionesSupervisor: ["Todos", "Juan Pérez", "Maria García", "Luis Sanchez"],
                opcionesTipoOrden: ["Todos", "Correctivo", "Preventivo", "Emergencia"]
            };
            this.getView().setModel(new JSONModel(oData), "dashboardModel");
        },

        onAfterRendering: function() {
            this._asignarClic("chipPeriodo", "opcionesPeriodo", "textPeriodo", "Seleccionar Periodo");
            this._asignarClic("chipZona", "opcionesZona", "textZona", "Seleccionar Zona");
            this._asignarClic("chipSupervisor", "opcionesSupervisor", "textSupervisor", "Seleccionar Supervisor");
            this._asignarClic("chipTipoOrden", "opcionesTipoOrden", "textTipoOrden", "Seleccionar Tipo de Orden");
        },

        _asignarClic: function(sChipId, sModeloOpciones, sTextoId, sTituloMenu) {
            var oChip = this.byId(sChipId);
            if (oChip) {
                oChip.addEventDelegate({
                    onclick: this._abrirMenu.bind(this, oChip, sModeloOpciones, sTextoId, sTituloMenu)
                });
            }
        },

        _abrirMenu: function(oSourceControl, sModeloOpciones, sTextoId, sTituloMenu) {
            var aOpciones = this.getView().getModel("dashboardModel").getProperty("/" + sModeloOpciones);
            
            var aBotones = aOpciones.map(sOpcion => new Button({
                text: sOpcion,
                press: () => this.byId(sTextoId).setText(sOpcion)
            }));
            
            var oActionSheet = new ActionSheet({ title: sTituloMenu, buttons: aBotones });
            this.getView().addDependent(oActionSheet);
            oActionSheet.openBy(oSourceControl);
        },

        // ===============================================================
        // LÓGICA DE FILTRADO (CORREGIDA AL 100%)
        // ===============================================================
        onAplicarFiltros: function() {
            var aFilters = [];
            
            var sPeriodo = this.byId("textPeriodo").getText();
            var sZona = this.byId("textZona").getText();
            var sSupervisor = this.byId("textSupervisor").getText();
            var sTipoOrden = this.byId("textTipoOrden").getText();

            // Ajuste por si el texto en la vista dice "Mayo 2024 (Semanal)" originalmente
            if (sPeriodo.includes("Mayo 2024")) {
                sPeriodo = "Mayo 2024";
            }

            // Filtro Periodo (Meses)
            if (sPeriodo !== "Todos") {
                aFilters.push(new Filter("mes", FilterOperator.EQ, sPeriodo));
            }
            
            // Filtro Zona (¡Solucionado el bug de "Todas" vs "Todos"!)
            if (sZona !== "Todas" && sZona !== "Todos") {
                aFilters.push(new Filter("zona", FilterOperator.EQ, sZona));
            }
            
            // Filtro Supervisor
            if (sSupervisor !== "Todos") {
                aFilters.push(new Filter("supervisor", FilterOperator.EQ, sSupervisor));
            }
            
            // Filtro Tipo Orden
            if (sTipoOrden !== "Todos") {
                aFilters.push(new Filter("tipoOrden", FilterOperator.EQ, sTipoOrden));
            }
            
            // Aplicar filtros a la tabla
            this.byId("elevatorsTable").getBinding("items").filter(aFilters);
        },

        // --- FORMATEADORES (No cambian) ---
        formatEstadoClase: function(sEstado){if(!sEstado)return"";var s=sEstado.toLowerCase().replace("í","i");switch(s){case"critico":return"estadoCritico";case"alto":return"estadoAlto";case"medio":return"estadoMedio";case"bajo":return"estadoBajo";default:return""}},
        formatEstadoTexto: function(sEstado){if(!sEstado)return"";return sEstado.charAt(0).toUpperCase()+sEstado.slice(1)},
        formatCausaIcono: function(sCausa){switch(sCausa){case"Carta de no mantenimiento":return"sap-icon://document-text";case"Falta de refacciones":return"sap-icon://wrench";case"Cliente no disponible":return"sap-icon://customer";case"Reprogramación":return"sap-icon://calendar";default:return"sap-icon://question-mark"}},
        formatCausaColor: function(sCausa){switch(sCausa){case"Carta de no mantenimiento":return"#E53E3E";case"Falta de refacciones":return"#DD6B20";case"Cliente no disponible":return"#38A169";case"Reprogramación":return"#805AD5";default:return"#718096"}},
        onSearch: function(oEvent){var a=[],s=oEvent.getSource().getValue();if(s&&s.length>0){a=new Filter({filters:[new Filter("elevador",FilterOperator.Contains,s),new Filter("cliente",FilterOperator.Contains,s),new Filter("causa",FilterOperator.Contains,s)],and:!1})}this.byId("elevatorsTable").getBinding("items").filter(a)}
    });
});
