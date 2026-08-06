sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisOTPreventivasEjecutadas",
        {
            onInit: function () {
                var oModel = new JSONModel(
                    this._getInitialData()
                );

                oModel.setSizeLimit(1000);
                this.getView().setModel(oModel, "otpe");
            },

            onApplyFilters: function () {
                MessageToast.show(
                    "Filtros aplicados correctamente."
                );
            },

            onSelectNoEjecutadas: function () {
                MessageToast.show(
                    "Vista: No ejecutadas."
                );
            },

            onSelectEjecutadas: function () {
                MessageToast.show(
                    "Vista: Ejecutadas."
                );
            },

            onSelectTodas: function () {
                MessageToast.show(
                    "Vista: Todas."
                );
            },

            onSearchResponsable: function (oEvent) {
                var sValue =
                    oEvent.getParameter("newValue") ||
                    oEvent.getParameter("query") ||
                    "";

                console.log(
                    "Buscar responsable:",
                    sValue
                );
            },

            onToggleResponsable: function (oEvent) {
                var oButton = oEvent.getSource();
                var sPath = oButton.data("path");
                var oModel =
                    this.getView().getModel("otpe");

                if (!sPath || !oModel) {
                    return;
                }

                oModel.setProperty(
                    sPath,
                    !Boolean(
                        oModel.getProperty(sPath)
                    )
                );
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

                        clientes: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            },
                            {
                                key: "TORRE_REFORMA",
                                text: "Torre Reforma"
                            },
                            {
                                key: "PLAZA_SATELITE",
                                text: "Plaza Satélite"
                            },
                            {
                                key: "HOSPITAL_ANGELES",
                                text: "Hospital Ángeles"
                            }
                        ],

                        responsables: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            },
                            {
                                key: "JUAN_PEREZ",
                                text: "Juan Pérez"
                            },
                            {
                                key: "MARIA_GONZALEZ",
                                text: "María González"
                            },
                            {
                                key: "CARLOS_HERRERA",
                                text: "Carlos Herrera"
                            },
                            {
                                key: "PEDRO_LOPEZ",
                                text: "Pedro López"
                            }
                        ]
                    },

                    kpis: {
                        planeadas: 260,
                        ejecutadas: 248,
                        noEjecutadas: 12,
                        cumplimiento: "95.4%"
                    },

                    responsables: [
                        {
                            nombre: "Juan Pérez",
                            ot: 54,
                            pct: "22%",
                            clientes: 18,
                            elevadores: 42,
                            tiempo: "1.2 días",
                            expanded: true
                        },
                        {
                            nombre: "María González",
                            ot: 49,
                            pct: "20%",
                            clientes: 16,
                            elevadores: 38,
                            tiempo: "1.4 días",
                            expanded: false
                        },
                        {
                            nombre: "Carlos Herrera",
                            ot: 43,
                            pct: "17%",
                            clientes: 15,
                            elevadores: 35,
                            tiempo: "1.6 días",
                            expanded: false
                        },
                        {
                            nombre: "Pedro López",
                            ot: 38,
                            pct: "15%",
                            clientes: 14,
                            elevadores: 31,
                            tiempo: "1.5 días",
                            expanded: false
                        },
                        {
                            nombre: "Otros responsables",
                            ot: 64,
                            pct: "26%",
                            clientes: 24,
                            elevadores: 55,
                            tiempo: "1.8 días",
                            expanded: false
                        }
                    ]
                };
            }
        }
    );
});