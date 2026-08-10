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

                this.getView().setModel(
                    oModel,
                    "otpe"
                );
            },

            onApplyFilters: function () {
                var oModel =
                    this.getView().getModel("otpe");

                var oFilters =
                    oModel.getProperty("/filters");

                console.log(
                    "Filtros Preventivas Ejecutadas:",
                    oFilters
                );

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

                var sSearch =
                    sValue
                        .trim()
                        .toLowerCase();

                var oModel =
                    this.getView().getModel("otpe");

                var aResponsables =
                    oModel.getProperty("/responsables") ||
                    [];

                aResponsables.forEach(function (
                    oResponsable,
                    iIndex
                ) {
                    var sNombre =
                        String(
                            oResponsable.nombre || ""
                        ).toLowerCase();

                    var bVisible =
                        !sSearch ||
                        sNombre.indexOf(sSearch) !== -1;

                    oModel.setProperty(
                        "/responsables/" +
                        iIndex +
                        "/visible",
                        bVisible
                    );

                    if (!bVisible) {
                        oModel.setProperty(
                            "/responsables/" +
                            iIndex +
                            "/expanded",
                            false
                        );
                    }
                });
            },

            onToggleResponsable: function (oEvent) {
                var oSource =
                    oEvent.getSource();

                var oContext =
                    oSource.getBindingContext("otpe");

                if (!oContext) {
                    return;
                }

                var oModel =
                    this.getView().getModel("otpe");

                var sPath =
                    oContext.getPath();

                var bExpanded =
                    Boolean(
                        oModel.getProperty(
                            sPath + "/expanded"
                        )
                    );

                var aResponsables =
                    oModel.getProperty("/responsables") ||
                    [];

                /*
                 * Solo dejamos un responsable desplegado.
                 * Esto mantiene controlada la altura de la
                 * pantalla y evita scroll en escritorio.
                 */
                aResponsables.forEach(function (
                    oResponsable,
                    iIndex
                ) {
                    oModel.setProperty(
                        "/responsables/" +
                        iIndex +
                        "/expanded",
                        false
                    );
                });

                if (!bExpanded) {
                    oModel.setProperty(
                        sPath + "/expanded",
                        true
                    );
                }
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

                    infoMessage:
                        "Análisis basado en 248 OT preventivas ejecutadas.",

                    totales: {
                        ot: 248,
                        pct: "100%",
                        clientes: 87,
                        elevadores: 201,
                        tiempo: "1.5 días"
                    },

                    responsables: [
                        {
                            nombre: "Juan Pérez",
                            ot: 54,
                            pct: "22%",
                            clientes: 18,
                            elevadores: 42,
                            tiempo: "1.2 días",
                            expanded: true,
                            visible: true,

                            ordenes: [
                                {
                                    ot: "OT-0412",
                                    cliente: "Torre Reforma",
                                    elevador: "EV0871",
                                    fecha: "03/05/2024",
                                    tiempo: "1 día"
                                },
                                {
                                    ot: "OT-0425",
                                    cliente: "Plaza Satélite",
                                    elevador: "EV1024",
                                    fecha: "04/05/2024",
                                    tiempo: "2 días"
                                },
                                {
                                    ot: "OT-0437",
                                    cliente: "Hospital Ángeles",
                                    elevador: "EV0636",
                                    fecha: "05/05/2024",
                                    tiempo: "1 día"
                                }
                            ]
                        },

                        {
                            nombre: "María González",
                            ot: 49,
                            pct: "20%",
                            clientes: 16,
                            elevadores: 38,
                            tiempo: "1.4 días",
                            expanded: false,
                            visible: true,
                            ordenes: []
                        },

                        {
                            nombre: "Carlos Herrera",
                            ot: 43,
                            pct: "17%",
                            clientes: 15,
                            elevadores: 35,
                            tiempo: "1.6 días",
                            expanded: false,
                            visible: true,
                            ordenes: []
                        },

                        {
                            nombre: "Pedro López",
                            ot: 38,
                            pct: "15%",
                            clientes: 14,
                            elevadores: 31,
                            tiempo: "1.5 días",
                            expanded: false,
                            visible: true,
                            ordenes: []
                        },

                        {
                            nombre: "Otros responsables",
                            ot: 64,
                            pct: "26%",
                            clientes: 24,
                            elevadores: 55,
                            tiempo: "1.8 días",
                            expanded: false,
                            visible: true,
                            ordenes: []
                        }
                    ]
                };
            }

        }
    );
});