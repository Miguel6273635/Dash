sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisOTPreventivasNoEjecutadas",
        {
            onInit: function () {
                var oInitialData = this._getInitialData();
                var oModel = new JSONModel(oInitialData);

                oModel.setSizeLimit(1000);
                this.getView().setModel(oModel, "otne");

                this._aAllCauses = this._clone(oInitialData.causes);
            },

            onApplyFilters: function () {
                MessageToast.show("Filtros aplicados correctamente.");
            },

            onToggleMenu: function () {
                MessageToast.show("Menú lateral.");
            },

            onSelectNoEjecutadas: function () {
                this._setAnalysisView(
                    "NO_EJECUTADAS",
                    "No ejecutadas"
                );
            },

            onSelectEjecutadas: function () {
                this._setAnalysisView(
                    "EJECUTADAS",
                    "Ejecutadas"
                );
            },

            onSelectTodas: function () {
                this._setAnalysisView(
                    "TODAS",
                    "Todas"
                );
            },

            onSearchCause: function (oEvent) {
                var sValue =
                    oEvent.getParameter("query") ||
                    oEvent.getParameter("newValue") ||
                    oEvent.getParameter("value") ||
                    "";

                var sSearch = this._normalizeText(sValue);
                var aCauses;

                if (!sSearch) {
                    aCauses = this._clone(this._aAllCauses);
                } else {
                    aCauses = this._aAllCauses.filter(function (oCause) {
                        return this._normalizeText(oCause.name)
                            .includes(sSearch);
                    }.bind(this));
                }

                this.getView()
                    .getModel("otne")
                    .setProperty("/causes", this._clone(aCauses));
            },

            onToggleCause: function (oEvent) {
                var oButton = oEvent.getSource();
                var oModel = this.getView().getModel("otne");
                var oContext = oButton.getBindingContext("otne");
                var sPath = oButton.data("path");

                if (!sPath && oContext) {
                    sPath = oContext.getPath() + "/expanded";
                }

                if (!sPath) {
                    return;
                }

                oModel.setProperty(
                    sPath,
                    !Boolean(oModel.getProperty(sPath))
                );
            },

            _setAnalysisView: function (sKey, sText) {
                var oModel = this.getView().getModel("otne");

                oModel.setProperty("/ui/selectedAnalysis", sKey);
                MessageToast.show("Vista: " + sText + ".");
            },

            _normalizeText: function (sValue) {
                return String(sValue || "")
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase()
                    .trim();
            },

            _clone: function (vValue) {
                return JSON.parse(JSON.stringify(vValue));
            },

            _getInitialData: function () {
                return {
                    ui: {
                        selectedAnalysis: "NO_EJECUTADAS",
                        analysisInfo:
                            "Análisis basado en 12 OT Preventivas no ejecutadas."
                    },

                    header: {
                        titlePrefix: "Análisis de OT Preventivas",
                        titleStatus: "No Ejecutadas",
                        dateNote: "n: 31/05/2024"
                    },

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
                            { key: "2024-05", text: "Mayo 2024" },
                            { key: "2024-06", text: "Junio 2024" },
                            { key: "2024-07", text: "Julio 2024" }
                        ],

                        zonas: [
                            { key: "TODAS", text: "Todas" },
                            { key: "NORTE", text: "Norte" },
                            { key: "CENTRO", text: "Centro" },
                            { key: "SUR", text: "Sur" },
                            { key: "ESTE", text: "Este" },
                            { key: "OESTE", text: "Oeste" }
                        ],

                        clientes: [
                            { key: "TODOS", text: "Todos" },
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
                            },
                            {
                                key: "TORRE_MAYOR",
                                text: "Torre Mayor"
                            },
                            {
                                key: "PLAZA_UNIVERSIDAD",
                                text: "Plaza Universidad"
                            }
                        ],

                        responsables: [
                            { key: "TODOS", text: "Todos" },
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
                        planeadasLabel: "Planeadas",
                        planeadasDescription: "Órdenes del periodo",

                        ejecutadas: 248,
                        ejecutadasLabel: "Ejecutadas",
                        ejecutadasDescription: "95.4% del total",

                        noEjecutadas: 12,
                        noEjecutadasLabel: "No ejecutadas",
                        noEjecutadasDescription:
                            "4.6% del total planeado",

                        cumplimiento: "95.4%",
                        cumplimientoLabel: "Cumplimiento",
                        cumplimientoDescription: "248 de 260 OT"
                    },

                    analysisTabs: {
                        noEjecutadas: "No ejecutadas (12)",
                        ejecutadas: "Ejecutadas (248)",
                        todas: "Todas (260)"
                    },

                    causes: [
                        {
                            name: "Carta de no mantenimiento",
                            icon: "sap-icon://document-text",
                            ot: 6,
                            pct: "50%",
                            clientes: 3,
                            elevadores: 5,
                            dias: "6 días",
                            expanded: true,
                            details: [
                                {
                                    ot: "OT-0468",
                                    cliente: "Torre Reforma",
                                    elevador: "EV1024",
                                    responsable: "Juan Pérez",
                                    fechaProgramada: "02/05/2024",
                                    diasDetenida: "8 días"
                                },
                                {
                                    ot: "OT-0411",
                                    cliente: "Torre Reforma",
                                    elevador: "EV0871",
                                    responsable: "Juan Pérez",
                                    fechaProgramada: "05/05/2024",
                                    diasDetenida: "6 días"
                                },
                                {
                                    ot: "OT-0391",
                                    cliente: "Plaza Satélite",
                                    elevador: "EV0778",
                                    responsable: "María González",
                                    fechaProgramada: "07/05/2024",
                                    diasDetenida: "5 días"
                                },
                                {
                                    ot: "OT-0477",
                                    cliente: "Hospital Ángeles",
                                    elevador: "EV0636",
                                    responsable: "Carlos Herrera",
                                    fechaProgramada: "08/05/2024",
                                    diasDetenida: "4 días"
                                },
                                {
                                    ot: "OT-0483",
                                    cliente: "Torre Mayor",
                                    elevador: "EV0582",
                                    responsable: "Pedro López",
                                    fechaProgramada: "09/05/2024",
                                    diasDetenida: "3 días"
                                },
                                {
                                    ot: "OT-0492",
                                    cliente: "Plaza Universidad",
                                    elevador: "EV0441",
                                    responsable: "María González",
                                    fechaProgramada: "10/05/2024",
                                    diasDetenida: "2 días"
                                }
                            ]
                        },

                        {
                            name: "Cliente no disponible",
                            icon: "sap-icon://customer",
                            ot: 3,
                            pct: "25%",
                            clientes: 2,
                            elevadores: 3,
                            dias: "5 días",
                            expanded: false,
                            details: []
                        },

                        {
                            name: "Reprogramación",
                            icon: "sap-icon://calendar",
                            ot: 2,
                            pct: "17%",
                            clientes: 2,
                            elevadores: 2,
                            dias: "4 días",
                            expanded: false,
                            details: []
                        },

                        {
                            name: "Falta de refacciones",
                            icon: "sap-icon://inventory",
                            ot: 1,
                            pct: "8%",
                            clientes: 1,
                            elevadores: 1,
                            dias: "3 días",
                            expanded: false,
                            details: []
                        }
                    ],

                    totals: {
                        name: "Total",
                        ot: 12,
                        pct: "100%",
                        clientes: 6,
                        elevadores: 11,
                        dias: "5 días"
                    },

                    footerText:
                        "Las causas están ordenadas por el número de OT no ejecutadas (descendente)."
                };
            }
        }
    );
});