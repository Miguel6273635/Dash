sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Controller,
    JSONModel,
    includeStylesheet,
    MessageToast,
    MessageBox
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleMecanicos",
        {

            onInit: function () {
                this._loadScreenStyles();

                this._oModel = new JSONModel(
                    this._getInitialData()
                );

                this._oModel.setSizeLimit(1000);

                this.getView().setModel(
                    this._oModel,
                    "detalle"
                );
            },

            /**
             * Carga el CSS exclusivo de la pantalla.
             * La versión evita que el navegador conserve estilos anteriores.
             */
            _loadScreenStyles: function () {
                var sStyleId = "detalleMecanicosStyles";
                var oOldStyle = document.getElementById(sStyleId);

                if (oOldStyle && oOldStyle.parentNode) {
                    oOldStyle.parentNode.removeChild(oOldStyle);
                }

                var sCssUrl = sap.ui.require.toUrl(
                    "mantenimiento/css/DetalleMecanicos.css"
                );

                sCssUrl += "?version=20260805_04";

                includeStylesheet(
                    sCssUrl,
                    sStyleId
                );
            },

            onApplyFilters: function () {
                var oFilters = this._cloneObject(
                    this._oModel.getProperty("/filters")
                );

                if (!oFilters.fechaDesde || !oFilters.fechaHasta) {
                    MessageBox.warning(
                        "Selecciona fecha desde y fecha hasta."
                    );

                    return;
                }

                this._loadData(oFilters);
            },

            _loadData: function (oFilters) {
                this._oModel.setProperty(
                    "/loading",
                    true
                );

                /*
                 * Sustituir este bloque por la llamada OData
                 * cuando el servicio backend esté disponible.
                 */
                window.setTimeout(
                    function () {
                        var oData = this._getInitialData();

                        oData.filters = this._cloneObject(
                            oFilters
                        );

                        oData.loading = false;

                        this._oModel.setData(oData);

                        MessageToast.show(
                            "Filtros aplicados correctamente."
                        );
                    }.bind(this),
                    120
                );
            },

            _cloneObject: function (oObject) {
                return JSON.parse(
                    JSON.stringify(oObject)
                );
            },

            _getInitialData: function () {
                return {
                    loading: false,

                    filters: {
                        periodo: "2024-05",
                        fechaDesde: "01/05/2024",
                        fechaHasta: "31/05/2024",
                        zona: "TODAS",
                        supervisor: "TODOS",
                        turno: "TODOS",
                        tipoServicio: "TODAS",
                        especialidad: "TODAS",
                        estado: "TODOS"
                    },

                    catalogos: {
                        periodos: [
                            {
                                key: "2024-05",
                                text: "Mayo 2024"
                            },
                            {
                                key: "2024-06",
                                text: "Junio 2024"
                            },
                            {
                                key: "2024-07",
                                text: "Julio 2024"
                            }
                        ],

                        zonas: [
                            {
                                key: "TODAS",
                                text: "Todas"
                            },
                            {
                                key: "NORTE",
                                text: "Norte"
                            },
                            {
                                key: "CENTRO",
                                text: "Centro"
                            },
                            {
                                key: "SUR",
                                text: "Sur"
                            },
                            {
                                key: "ESTE",
                                text: "Este"
                            },
                            {
                                key: "OESTE",
                                text: "Oeste"
                            }
                        ],

                        supervisores: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            },
                            {
                                key: "SUP01",
                                text: "Supervisor 01"
                            },
                            {
                                key: "SUP02",
                                text: "Supervisor 02"
                            }
                        ],

                        turnos: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            },
                            {
                                key: "DIURNO",
                                text: "Diurno"
                            },
                            {
                                key: "NOCTURNO",
                                text: "Nocturno"
                            },
                            {
                                key: "FIN_SEMANA",
                                text: "Fin de semana"
                            }
                        ],

                        tiposServicio: [
                            {
                                key: "TODAS",
                                text: "Todas"
                            },
                            {
                                key: "MANTENIMIENTO",
                                text: "Mantenimiento planeado"
                            },
                            {
                                key: "REPARACION",
                                text: "Reparación / correctivo"
                            },
                            {
                                key: "CALL_CENTER",
                                text: "Call Center"
                            }
                        ],

                        especialidades: [
                            {
                                key: "TODAS",
                                text: "Todas"
                            },
                            {
                                key: "MECANICA",
                                text: "Mecánica"
                            },
                            {
                                key: "ELECTRICA",
                                text: "Eléctrica"
                            },
                            {
                                key: "ELECTRONICA",
                                text: "Electrónica"
                            },
                            {
                                key: "HIDRAULICA",
                                text: "Hidráulica"
                            }
                        ],

                        estados: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            },
                            {
                                key: "DISPONIBLES",
                                text: "Disponibles"
                            },
                            {
                                key: "DENTRO_CAPACIDAD",
                                text: "Dentro de capacidad"
                            },
                            {
                                key: "CERCA_SATURACION",
                                text: "Cerca de saturación"
                            },
                            {
                                key: "SOBRE_CAPACIDAD",
                                text: "Sobre capacidad"
                            }
                        ]
                    },

                    kpis: {
                        activos: 76,
                        disponibles: 14,
                        disponiblesPct: "18.4% de la plantilla",
                        sobrecapacidad: 9,
                        sobrecapacidadPct: "11.8% de la plantilla",
                        cobertura: "94%"
                    },

                    turnos: [
                        {
                            label: "Diurno",
                            value: 48,
                            pct: 63.2,
                            pctText: "63.2%",
                            tone: "blue"
                        },
                        {
                            label: "Nocturno",
                            value: 16,
                            pct: 21.1,
                            pctText: "21.1%",
                            tone: "green"
                        },
                        {
                            label: "Fin de semana",
                            value: 12,
                            pct: 15.8,
                            pctText: "15.8%",
                            tone: "purple"
                        }
                    ],

                    utilTurno: [
                        {
                            turno: "Diurno",
                            capacidad: "4,032 h",
                            carga: "3,420 h",
                            utilizacion: "84.9%",
                            percentValue: 84.9,
                            tone: "green"
                        },
                        {
                            turno: "Nocturno",
                            capacidad: "1,344 h",
                            carga: "1,278 h",
                            utilizacion: "95.1%",
                            percentValue: 95.1,
                            tone: "orange"
                        },
                        {
                            turno: "Fin de semana",
                            capacidad: "1,024 h",
                            carga: "1,202 h",
                            utilizacion: "117.4%",
                            percentValue: 100,
                            tone: "red"
                        }
                    ],

                    utilTotal: {
                        capacidad: "6,400 h",
                        carga: "5,900 h",
                        utilizacion: "92.1%",
                        percentValue: 92.1,
                        tone: "green"
                    },

                    /*
                     * Datos para la card:
                     * Cobertura de mecánicos por zona.
                     *
                     * cobertura:
                     * texto mostrado junto a la gráfica.
                     *
                     * percentValue:
                     * valor usado por ProgressIndicator.
                     * SAPUI5 acepta un máximo visual de 100.
                     *
                     * tone:
                     * controla el color de la barra, porcentaje,
                     * punto y texto del estado.
                     */
                    zonas: [
                        {
                            zona: "Norte",
                            mecanicos: "18",
                            horasDisponibles: "1,800 h",
                            carga: "1,450 h",
                            cobertura: "100%",
                            percentValue: 100,
                            estado: "Balanceado",
                            tone: "green"
                        },
                        {
                            zona: "Centro",
                            mecanicos: "15",
                            horasDisponibles: "1,500 h",
                            carga: "1,300 h",
                            cobertura: "100%",
                            percentValue: 100,
                            estado: "Balanceado",
                            tone: "green"
                        },
                        {
                            zona: "Sur",
                            mecanicos: "14",
                            horasDisponibles: "1,200 h",
                            carga: "960 h",
                            cobertura: "120%",
                            percentValue: 100,
                            estado: "Balance adecuado",
                            tone: "orange"
                        },
                        {
                            zona: "Este",
                            mecanicos: "12",
                            horasDisponibles: "1,100 h",
                            carga: "780 h",
                            cobertura: "100%",
                            percentValue: 100,
                            estado: "Capacidad disponible",
                            tone: "green"
                        },
                        {
                            zona: "Oeste",
                            mecanicos: "17",
                            horasDisponibles: "1,200 h",
                            carga: "620 h",
                            cobertura: "100%",
                            percentValue: 100,
                            estado: "Capacidad disponible",
                            tone: "green"
                        }
                    ],

                    estadoPlantilla: [
                        {
                            label: "Disponibles",
                            value: "14",
                            pct: "18.4%",
                            tone: "green"
                        },
                        {
                            label: "Dentro de capacidad",
                            value: "43",
                            pct: "56.6%",
                            tone: "blue"
                        },
                        {
                            label: "Cerca de saturación",
                            value: "10",
                            pct: "13.2%",
                            tone: "orange"
                        },
                        {
                            label: "Sobre capacidad",
                            value: "9",
                            pct: "11.8%",
                            tone: "red"
                        },
                        {
                            label: "Inactivos",
                            value: "0",
                            pct: "0.0%",
                            tone: "gray"
                        }
                    ],

                    servicios: [
                        {
                            label: "Mantenimiento planeado",
                            programadas: "3,200",
                            reales: "3,050",
                            programadasLevel: "100",
                            realesLevel: "95"
                        },
                        {
                            label: "Reparación / correctivo",
                            programadas: "1,700",
                            reales: "1,910",
                            programadasLevel: "54",
                            realesLevel: "60"
                        },
                        {
                            label: "Call Center",
                            programadas: "1,000",
                            reales: "882",
                            programadasLevel: "32",
                            realesLevel: "28"
                        }
                    ],

                    presion: [
                        {
                            zona: "Sur",
                            utilizacion: "117.4%",
                            percentValue: 100,
                            ordenes: "8.8",
                            estado: "Crítico",
                            tone: "red"
                        },
                        {
                            zona: "Norte",
                            utilizacion: "101.3%",
                            percentValue: 100,
                            ordenes: "7.1",
                            estado: "Sobrecargado",
                            tone: "red"
                        },
                        {
                            zona: "Centro",
                            utilizacion: "95.1%",
                            percentValue: 95.1,
                            ordenes: "6.4",
                            estado: "Cerca de saturación",
                            tone: "orange"
                        },
                        {
                            zona: "Este",
                            utilizacion: "64.6%",
                            percentValue: 64.6,
                            ordenes: "4.2",
                            estado: "Balanceado",
                            tone: "green"
                        },
                        {
                            zona: "Oeste",
                            utilizacion: "48.3%",
                            percentValue: 48.3,
                            ordenes: "3.1",
                            estado: "Capacidad disponible",
                            tone: "green"
                        }
                    ]
                };
            }

        }
    );
});