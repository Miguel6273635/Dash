sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/VistaDireccionService",
    "mantenimiento/model/VistaDireccionMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    includeStylesheet,
    VistaDireccionService,
    VistaDireccionMapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.VistaDireccion",
        {
            onInit: function () {
                this._loadStyles();

                this._oViewModel = new JSONModel(
                    this._getInitialData()
                );

                this._oViewModel.setSizeLimit(5000);

                this.getView().setModel(
                    this._oViewModel,
                    "view"
                );

                this._iRequest = 0;

                this._loadData(false);
            },

            _loadStyles: function () {
                var sStyleId = "vistaDireccionCss";
                var oOldStyle = document.getElementById(sStyleId);
                var sCssUrl;

                if (oOldStyle && oOldStyle.parentNode) {
                    oOldStyle.parentNode.removeChild(oOldStyle);
                }

                sCssUrl =
                    sap.ui.require.toUrl(
                        "mantenimiento/css/VistaDireccion.css"
                    ) +
                    "?version=20260821_01";

                includeStylesheet(
                    sCssUrl,
                    sStyleId
                );
            },

            _getODataModel: function () {
                var oComponent = this.getOwnerComponent();

                return (
                    oComponent &&
                    oComponent.getModel("dashboardOData")
                ) || (
                    oComponent &&
                    oComponent.getModel()
                );
            },

            _getFilters: function () {
                return Object.assign(
                    {},
                    this._oViewModel.getProperty("/filters") || {}
                );
            },

            onPeriodoChange: function (oEvent) {
                var sYear =
                    oEvent.getSource().getSelectedKey();

                var iYear =
                    Number(sYear);

                if (
                    !Number.isInteger(iYear) ||
                    iYear < 1900 ||
                    iYear > 9999
                ) {
                    return;
                }

                this._oViewModel.setProperty(
                    "/filters/periodo",
                    String(iYear)
                );

                this._oViewModel.setProperty(
                    "/filters/fechaDesde",
                    "01/01/" + iYear
                );

                this._oViewModel.setProperty(
                    "/filters/fechaHasta",
                    "31/12/" + iYear
                );
            },

            onDateChange: function () {
                var sDesde =
                    this._oViewModel.getProperty(
                        "/filters/fechaDesde"
                    ) || "";

                var sHasta =
                    this._oViewModel.getProperty(
                        "/filters/fechaHasta"
                    ) || "";

                var aDesde =
                    sDesde.match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                var aHasta =
                    sHasta.match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                if (
                    aDesde &&
                    aHasta &&
                    aDesde[3] === aHasta[3]
                ) {
                    this._oViewModel.setProperty(
                        "/filters/periodo",
                        aDesde[3]
                    );
                }
            },

            onDirectionChange: function () {
                var sDirection =
                    this._oViewModel.getProperty(
                        "/filters/direccion"
                    );

                var aAll =
                    this._oViewModel.getProperty(
                        "/catalogs/headshipsAll"
                    ) || [];

                var aFiltered =
                    aAll.filter(function (oItem, iIndex) {
                        if (iIndex === 0) {
                            return true;
                        }

                        if (
                            !sDirection ||
                            sDirection === "TODAS"
                        ) {
                            return true;
                        }

                        return (
                            !oItem.parentKey ||
                            oItem.parentKey === sDirection
                        );
                    });

                this._oViewModel.setProperty(
                    "/catalogs/headships",
                    aFiltered
                );

                this._oViewModel.setProperty(
                    "/filters/jefatura",
                    "TODAS"
                );
            },

            onApplyFilters: function () {
                var oFilters = this._getFilters();

                if (
                    !oFilters.fechaDesde ||
                    !oFilters.fechaHasta
                ) {
                    MessageBox.warning(
                        "Selecciona Fecha desde y Fecha hasta."
                    );
                    return;
                }

                this._loadData(true);
            },

            _loadData: function (bNotify) {
                var iRequest = ++this._iRequest;
                var oFilters = this._getFilters();
                var oODataModel = this._getODataModel();

                this._oViewModel.setProperty(
                    "/busy",
                    true
                );

                VistaDireccionService
                    .getDashboardData(
                        oODataModel,
                        oFilters
                    )
                    .then(function (oRawData) {
                        var oMapped;

                        if (iRequest !== this._iRequest) {
                            return;
                        }

                        oMapped =
                            VistaDireccionMapper.mapData(
                                oRawData,
                                oFilters
                            );

                        this._oViewModel.setProperty(
                            "/catalogs",
                            oMapped.catalogs
                        );

                        this._oViewModel.setProperty(
                            "/kpis",
                            oMapped.kpis
                        );

                        this._oViewModel.setProperty(
                            "/riskLevels",
                            oMapped.riskLevels
                        );

                        this._oViewModel.setProperty(
                            "/jefaturas",
                            oMapped.jefaturas
                        );

                        this._oViewModel.setProperty(
                            "/serviceTypes",
                            oMapped.serviceTypes
                        );

                        this._oViewModel.setProperty(
                            "/serviceTotalHours",
                            oMapped.serviceTotalHours
                        );

                        this._oViewModel.setProperty(
                            "/materials",
                            oMapped.materials
                        );

                        this._oViewModel.setProperty(
                            "/meta",
                            oMapped.meta
                        );

                        if (bNotify) {
                            MessageToast.show(
                                "Vista Dirección actualizada"
                            );
                        }
                    }.bind(this))
                    .catch(function (oError) {
                        if (iRequest !== this._iRequest) {
                            return;
                        }

                        console.error(
                            "[VD CONTROLLER] Error:",
                            oError
                        );

                        MessageBox.error(
                            oError && oError.message
                                ? oError.message
                                : "No fue posible cargar Vista Dirección."
                        );
                    }.bind(this))
                    .finally(function () {
                        if (iRequest === this._iRequest) {
                            this._oViewModel.setProperty(
                                "/busy",
                                false
                            );
                        }
                    }.bind(this));
            },

            onActionPress: function (oEvent) {
                var sAction =
                    oEvent.getSource().data("action");

                var mMessages = {
                    direccion:
                        "Navegación al detalle de la dirección",
                    asignaciones:
                        "Navegación a la gestión de asignaciones",
                    balance:
                        "Navegación al balance de capacidad"
                };

                MessageToast.show(
                    mMessages[sAction] ||
                    "Acción seleccionada"
                );
            },

            _getInitialData: function () {
                var iDefaultYear = 2026;

                return {
                    busy: false,

                    filters: {
                        periodo: String(iDefaultYear),
                        fechaDesde: "01/01/" + iDefaultYear,
                        fechaHasta: "31/12/" + iDefaultYear,
                        direccion: "TODAS",
                        jefatura: "TODAS",
                        turno: "TODOS"
                    },

                    catalogs: {
                        periods: [
                            { key: "2028", text: "2028" },
                            { key: "2027", text: "2027" },
                            { key: "2026", text: "2026" },
                            { key: "2025", text: "2025" },
                            { key: "2024", text: "2024" },
                            { key: "2023", text: "2023" },
                            { key: "2022", text: "2022" },
                            { key: "2021", text: "2021" }
                        ],
                        directions: [
                            {
                                key: "TODAS",
                                text: "Todas"
                            }
                        ],
                        headshipsAll: [
                            {
                                key: "TODAS",
                                text: "Todas",
                                parentKey: ""
                            }
                        ],
                        headships: [
                            {
                                key: "TODAS",
                                text: "Todas",
                                parentKey: ""
                            }
                        ],
                        shifts: [
                            {
                                key: "TODOS",
                                text: "Todos"
                            }
                        ]
                    },

                    kpis: [
                        {
                            title: "Jefaturas activas",
                            value: "Sin datos",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://group",
                            tone: "blue"
                        },
                        {
                            title: "Recursos totales",
                            value: "Sin datos",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://employee",
                            tone: "cyan"
                        },
                        {
                            title: "Capacidad disponible",
                            value: "Sin datos",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://performance",
                            tone: "green"
                        },
                        {
                            title: "Carga programada",
                            value: "Sin datos",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://calendar",
                            tone: "orange"
                        },
                        {
                            title: "Recursos sobre capacidad",
                            value: "Sin datos",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://alert",
                            tone: "red"
                        },
                        {
                            title: "Cumplimiento operativo",
                            value: "Sin datos",
                            footer: "",
                            note: "",
                            showFooter: false,
                            showNote: false,
                            icon: "sap-icon://performance",
                            tone: "danger"
                        }
                    ],

                    riskLevels: [
                        {
                            label: "Crítico",
                            range: "> 120%",
                            count: "0",
                            icon: "sap-icon://trend-up",
                            tone: "red"
                        },
                        {
                            label: "Alto",
                            range: "101% - 120%",
                            count: "0",
                            icon: "sap-icon://trend-up",
                            tone: "orange"
                        },
                        {
                            label: "Normal",
                            range: "71% - 100%",
                            count: "0",
                            icon: "sap-icon://status-critical",
                            tone: "yellow"
                        },
                        {
                            label: "Bajo",
                            range: "0% - 70%",
                            count: "0",
                            icon: "sap-icon://status-positive",
                            tone: "green"
                        }
                    ],

                    jefaturas: [],

                    serviceTypes: [
                        {
                            label: "Sin datos",
                            percent: "Sin datos",
                            hours: "Sin datos",
                            icon: "sap-icon://document-text",
                            tone: "blue"
                        },
                        {
                            label: "Sin datos",
                            percent: "Sin datos",
                            hours: "Sin datos",
                            icon: "sap-icon://wrench",
                            tone: "red"
                        },
                        {
                            label: "Sin datos",
                            percent: "Sin datos",
                            hours: "Sin datos",
                            icon: "sap-icon://customer-and-contacts",
                            tone: "purple"
                        }
                    ],

                    serviceTotalHours: "Sin datos",

                    actions: [
                        {
                            action: "direccion",
                            title: "Ver dirección",
                            description:
                                "Consultar detalle de desempeño",
                            icon: "sap-icon://group",
                            tone: "blue"
                        },
                        {
                            action: "asignaciones",
                            title: "Asignaciones",
                            description:
                                "Gestionar asignaciones de recursos",
                            icon: "sap-icon://task",
                            tone: "purple"
                        },
                        {
                            action: "balance",
                            title: "Balance de capacidad",
                            description:
                                "Analizar capacidad vs demanda",
                            icon: "sap-icon://gauge",
                            tone: "green"
                        }
                    ],

                    materials: [
                        {
                            name: "Sin datos",
                            percent: "Sin datos",
                            barWidth: "0%",
                            icon: "sap-icon://drop",
                            tone: "orange"
                        },
                        {
                            name: "Sin datos",
                            percent: "Sin datos",
                            barWidth: "0%",
                            icon: "sap-icon://wrench",
                            tone: "cyan"
                        },
                        {
                            name: "Sin datos",
                            percent: "Sin datos",
                            barWidth: "0%",
                            icon: "sap-icon://product",
                            tone: "purple"
                        }
                    ],

                    meta: {}
                };
            }
        }
    );
});