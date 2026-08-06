sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/ActionSheet",
    "sap/m/Button"
], function (
    Controller,
    JSONModel,
    includeStylesheet,
    ActionSheet,
    Button
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisElevadores",
        {

            /* ==========================================================
               INICIALIZACIÓN
               ========================================================== */

            onInit: function () {
                var sCssPath = sap.ui.require.toUrl(
                    "mantenimiento/css/AnalisisElevadores.css"
                );

                includeStylesheet(sCssPath);

                /*
                 * Periodo seleccionado visualmente.
                 * La tabla inicia mostrando todos los registros.
                 */
                this._sPeriodoSeleccionado = "Mayo 2024";

                /*
                 * Filtros que ya fueron confirmados con
                 * el botón Aplicar filtros.
                 */
                this._oFiltrosAplicados = {
                    periodo: "Todos",
                    zona: "Todas",
                    supervisor: "Todos",
                    tipoOrden: "Todos"
                };

                /*
                 * Configuración inicial de búsqueda y paginación.
                 */
                this._sTextoBusqueda = "";
                this._iPageSize = 5;
                this._aRegistrosFiltrados = [];
                this._bPeriodoClickAsignado = false;

                var aElevadores = [
                    {
                        elevador: "EV-1024",
                        cliente: "Torre Reforma",
                        zona: "Centro",
                        causa: "Carta de no mantenimiento",
                        otAfectadas: 8,
                        brecha: "-8",
                        estado: "Critico",
                        supervisor: "Juan Pérez",
                        tipoOrden: "Correctivo",
                        mes: "Mayo 2024"
                    },
                    {
                        elevador: "EV-0871",
                        cliente: "Torre Reforma",
                        zona: "Centro",
                        causa: "Carta de no mantenimiento",
                        otAfectadas: 7,
                        brecha: "-7",
                        estado: "Critico",
                        supervisor: "María García",
                        tipoOrden: "Emergencia",
                        mes: "Mayo 2024"
                    },
                    {
                        elevador: "EV-0442",
                        cliente: "Plaza Satélite",
                        zona: "Norte",
                        causa: "Falta de refacciones",
                        otAfectadas: 6,
                        brecha: "-6",
                        estado: "Alto",
                        supervisor: "Luis Sánchez",
                        tipoOrden: "Correctivo",
                        mes: "Abril 2024"
                    },
                    {
                        elevador: "EV-0615",
                        cliente: "Hospital San José",
                        zona: "Norte",
                        causa: "Carta de no mantenimiento",
                        otAfectadas: 5,
                        brecha: "-5",
                        estado: "Alto",
                        supervisor: "Juan Pérez",
                        tipoOrden: "Preventivo",
                        mes: "Abril 2024"
                    },
                    {
                        elevador: "EV-0521",
                        cliente: "Torre Mayor",
                        zona: "Norte",
                        causa: "Falta de refacciones",
                        otAfectadas: 4,
                        brecha: "-4",
                        estado: "Medio",
                        supervisor: "María García",
                        tipoOrden: "Correctivo",
                        mes: "Marzo 2024"
                    },
                    {
                        elevador: "EV-0722",
                        cliente: "Centro Santa Fe",
                        zona: "Centro",
                        causa: "Cliente no disponible",
                        otAfectadas: 3,
                        brecha: "-3",
                        estado: "Medio",
                        supervisor: "Luis Sánchez",
                        tipoOrden: "Preventivo",
                        mes: "Marzo 2024"
                    },
                    {
                        elevador: "EV-0144",
                        cliente: "Residencial Bosques",
                        zona: "Sur",
                        causa: "Reprogramación",
                        otAfectadas: 3,
                        brecha: "-3",
                        estado: "Medio",
                        supervisor: "Juan Pérez",
                        tipoOrden: "Correctivo",
                        mes: "Mayo 2024"
                    },
                    {
                        elevador: "EV-0833",
                        cliente: "Plaza Galerías",
                        zona: "Centro",
                        causa: "Reprogramación",
                        otAfectadas: 2,
                        brecha: "-2",
                        estado: "Bajo",
                        supervisor: "María García",
                        tipoOrden: "Preventivo",
                        mes: "Abril 2024"
                    },
                    {
                        elevador: "EV-0911",
                        cliente: "Edificio Insurgentes",
                        zona: "Sur",
                        causa: "Falta de refacciones",
                        otAfectadas: 2,
                        brecha: "-2",
                        estado: "Bajo",
                        supervisor: "Luis Sánchez",
                        tipoOrden: "Emergencia",
                        mes: "Marzo 2024"
                    }
                ];

                var oData = {
                    /*
                     * Lista completa.
                     */
                    elevadores: aElevadores,

                    /*
                     * Lista mostrada en la tabla.
                     * Inicia con cinco registros.
                     */
                    elevadoresVisibles: aElevadores.slice(0, 5),

                    opcionesPeriodo: [
                        {
                            key: "Todos",
                            text: "Todos"
                        },
                        {
                            key: "Mayo 2024",
                            text: "Mayo 2024 (Semanal)"
                        },
                        {
                            key: "Abril 2024",
                            text: "Abril 2024 (Semanal)"
                        },
                        {
                            key: "Marzo 2024",
                            text: "Marzo 2024 (Semanal)"
                        }
                    ],

                    opcionesZona: [
                        {
                            key: "Todas",
                            text: "Todas"
                        },
                        {
                            key: "Norte",
                            text: "Norte"
                        },
                        {
                            key: "Centro",
                            text: "Centro"
                        },
                        {
                            key: "Sur",
                            text: "Sur"
                        }
                    ],

                    opcionesSupervisor: [
                        {
                            key: "Todos",
                            text: "Todos"
                        },
                        {
                            key: "Juan Pérez",
                            text: "Juan Pérez"
                        },
                        {
                            key: "María García",
                            text: "María García"
                        },
                        {
                            key: "Luis Sánchez",
                            text: "Luis Sánchez"
                        }
                    ],

                    opcionesTipoOrden: [
                        {
                            key: "Todos",
                            text: "Todos"
                        },
                        {
                            key: "Correctivo",
                            text: "Correctivo"
                        },
                        {
                            key: "Preventivo",
                            text: "Preventivo"
                        },
                        {
                            key: "Emergencia",
                            text: "Emergencia"
                        }
                    ],

                    kpis: {
                        elevadores: "9",
                        otAfectadas: "40",
                        brecha: "-40 OT",
                        criticos: "2"
                    },

                    paginacion: {
                        texto: "1–5 de 9"
                    }
                };

                this.getView().setModel(
                    new JSONModel(oData),
                    "dashboardModel"
                );

                this._aRegistrosFiltrados = aElevadores.slice(0);

                this._actualizarIndicadores(
                    this._aRegistrosFiltrados
                );

                this._actualizarPaginaVisible();
            },

            /* ==========================================================
               EVENTO DEL FILTRO PERIODO
               ========================================================== */

            onAfterRendering: function () {
                var oPeriodo = this.byId("chipPeriodo");

                if (
                    !oPeriodo ||
                    this._bPeriodoClickAsignado
                ) {
                    return;
                }

                oPeriodo.addEventDelegate({
                    onclick: function () {
                        this._abrirMenuPeriodo(oPeriodo);
                    }.bind(this)
                });

                this._bPeriodoClickAsignado = true;
            },

            /**
             * Abre las opciones del periodo.
             *
             * @param {sap.ui.core.Control} oSource Control de periodo.
             */
            _abrirMenuPeriodo: function (oSource) {
                var oModel = this.getView().getModel(
                    "dashboardModel"
                );

                var aOpciones = oModel.getProperty(
                    "/opcionesPeriodo"
                ) || [];

                var oActionSheet;
                var aBotones = [];
                var i;

                for (i = 0; i < aOpciones.length; i += 1) {
                    aBotones.push(
                        this._crearBotonPeriodo(
                            aOpciones[i]
                        )
                    );
                }

                oActionSheet = new ActionSheet({
                    title: "Seleccionar periodo",
                    buttons: aBotones,

                    afterClose: function () {
                        oActionSheet.destroy();
                    }
                });

                this.getView().addDependent(oActionSheet);
                oActionSheet.openBy(oSource);
            },

            /**
             * Crea cada botón del selector de periodo.
             *
             * @param {Object} oOpcion Opción del periodo.
             * @returns {sap.m.Button} Botón generado.
             */
            _crearBotonPeriodo: function (oOpcion) {
                return new Button({
                    text: oOpcion.text,

                    press: function () {
                        this._sPeriodoSeleccionado =
                            oOpcion.key;

                        this.byId("textPeriodo").setText(
                            oOpcion.text
                        );
                    }.bind(this)
                });
            },

            /* ==========================================================
               APLICAR FILTROS
               ========================================================== */

            onAplicarFiltros: function () {
                var oZona = this.byId("selectZona");
                var oSupervisor = this.byId(
                    "selectSupervisor"
                );
                var oTipoOrden = this.byId(
                    "selectTipoOrden"
                );

                this._oFiltrosAplicados = {
                    periodo:
                        this._sPeriodoSeleccionado ||
                        "Todos",

                    zona:
                        oZona.getSelectedKey() ||
                        "Todas",

                    supervisor:
                        oSupervisor.getSelectedKey() ||
                        "Todos",

                    tipoOrden:
                        oTipoOrden.getSelectedKey() ||
                        "Todos"
                };

                this._filtrarRegistros();
            },

            /* ==========================================================
               BÚSQUEDA
               ========================================================== */

            onSearch: function (oEvent) {
                var sValue = oEvent.getParameter(
                    "newValue"
                );

                if (sValue === undefined) {
                    sValue = oEvent.getSource().getValue();
                }

                this._sTextoBusqueda = (
                    sValue || ""
                ).trim();

                this._filtrarRegistros();
            },

            /* ==========================================================
               PAGINACIÓN
               ========================================================== */

            onPageSizeChange: function (oEvent) {
                var sSelectedKey = oEvent.getSource()
                    .getSelectedKey();

                var iPageSize = parseInt(
                    sSelectedKey,
                    10
                );

                if (
                    isNaN(iPageSize) ||
                    iPageSize <= 0
                ) {
                    iPageSize = 5;
                }

                this._iPageSize = iPageSize;

                this._actualizarPaginaVisible();
            },

            /**
             * Actualiza los registros mostrados en la tabla.
             */
            _actualizarPaginaVisible: function () {
                var oModel = this.getView().getModel(
                    "dashboardModel"
                );

                var aRegistros =
                    this._aRegistrosFiltrados || [];

                var iTotal = aRegistros.length;

                var iFinal = Math.min(
                    this._iPageSize,
                    iTotal
                );

                var aVisibles = aRegistros.slice(
                    0,
                    this._iPageSize
                );

                var sTextoPagina;

                if (iTotal === 0) {
                    sTextoPagina = "0 de 0";
                } else {
                    sTextoPagina =
                        "1–" +
                        iFinal +
                        " de " +
                        iTotal;
                }

                oModel.setProperty(
                    "/elevadoresVisibles",
                    aVisibles
                );

                oModel.setProperty(
                    "/paginacion/texto",
                    sTextoPagina
                );
            },

            /* ==========================================================
               FILTRADO COMBINADO
               ========================================================== */

            _filtrarRegistros: function () {
                var oModel = this.getView().getModel(
                    "dashboardModel"
                );

                var aElevadores = oModel.getProperty(
                    "/elevadores"
                ) || [];

                var oFiltros = this._oFiltrosAplicados;
                var sBusqueda = this._normalizarTexto(
                    this._sTextoBusqueda
                );

                this._aRegistrosFiltrados =
                    aElevadores.filter(
                        function (oElevador) {
                            var bPeriodo =
                                oFiltros.periodo ===
                                    "Todos" ||
                                oElevador.mes ===
                                    oFiltros.periodo;

                            var bZona =
                                oFiltros.zona ===
                                    "Todas" ||
                                oFiltros.zona ===
                                    "Todos" ||
                                oElevador.zona ===
                                    oFiltros.zona;

                            var bSupervisor =
                                oFiltros.supervisor ===
                                    "Todos" ||
                                oElevador.supervisor ===
                                    oFiltros.supervisor;

                            var bTipoOrden =
                                oFiltros.tipoOrden ===
                                    "Todos" ||
                                oElevador.tipoOrden ===
                                    oFiltros.tipoOrden;

                            var sTextoRegistro =
                                this._normalizarTexto(
                                    [
                                        oElevador.elevador,
                                        oElevador.cliente,
                                        oElevador.zona,
                                        oElevador.causa,
                                        oElevador.supervisor,
                                        oElevador.tipoOrden
                                    ].join(" ")
                                );

                            var bBusqueda =
                                !sBusqueda ||
                                sTextoRegistro.indexOf(
                                    sBusqueda
                                ) !== -1;

                            return (
                                bPeriodo &&
                                bZona &&
                                bSupervisor &&
                                bTipoOrden &&
                                bBusqueda
                            );
                        }.bind(this)
                    );

                this._actualizarIndicadores(
                    this._aRegistrosFiltrados
                );

                this._actualizarPaginaVisible();
            },

            /**
             * Normaliza textos para permitir búsquedas sin considerar
             * mayúsculas, minúsculas o acentos.
             *
             * @param {string} sTexto Texto original.
             * @returns {string} Texto normalizado.
             */
            _normalizarTexto: function (sTexto) {
                var sResultado = String(
                    sTexto || ""
                ).toLowerCase();

                /*
                 * Se usa normalize únicamente cuando está disponible.
                 */
                if (sResultado.normalize) {
                    sResultado = sResultado
                        .normalize("NFD")
                        .replace(
                            /[\u0300-\u036f]/g,
                            ""
                        );
                }

                return sResultado;
            },

            /* ==========================================================
               ACTUALIZACIÓN DE KPI
               ========================================================== */

            _actualizarIndicadores: function (aRegistros) {
                var oModel = this.getView().getModel(
                    "dashboardModel"
                );

                var iElevadores = aRegistros.length;
                var iOtAfectadas = 0;
                var iBrecha = 0;
                var iCriticos = 0;
                var i;

                for (i = 0; i < aRegistros.length; i += 1) {
                    iOtAfectadas += Number(
                        aRegistros[i].otAfectadas || 0
                    );

                    iBrecha += Number(
                        aRegistros[i].brecha || 0
                    );

                    if (
                        aRegistros[i].estado === "Critico"
                    ) {
                        iCriticos += 1;
                    }
                }

                oModel.setProperty(
                    "/kpis/elevadores",
                    String(iElevadores)
                );

                oModel.setProperty(
                    "/kpis/otAfectadas",
                    String(iOtAfectadas)
                );

                oModel.setProperty(
                    "/kpis/brecha",
                    String(iBrecha) + " OT"
                );

                oModel.setProperty(
                    "/kpis/criticos",
                    String(iCriticos)
                );
            },

            /* ==========================================================
               FORMATEADOR DE ESTADO
               ========================================================== */

            formatEstadoTexto: function (sEstado) {
                if (!sEstado) {
                    return "";
                }

                if (sEstado === "Critico") {
                    return "Crítico";
                }

                return sEstado;
            }
        }
    );
});