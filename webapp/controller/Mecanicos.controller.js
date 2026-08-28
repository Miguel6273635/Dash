sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/MecanicosService",
    "mantenimiento/model/MecanicosMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    includeStylesheet,
    MecanicosService,
    MecanicosMapper
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.Mecanicos", {

        onInit: function () {
            this._loadScreenStyles();

            this._iRequest = 0;
            this._oRawData = null;

            this._oModel = new JSONModel(this._getInitialData());
            this._oModel.setDefaultBindingMode("TwoWay");
            this._oModel.setSizeLimit(5000);

            this.getView().setModel(this._oModel, "dashboard");

            this._loadBase(false);
        },

        onAfterRendering: function () {
            this._applyDynamicVisuals();
        },

        _loadScreenStyles: function () {
            var sStyleId = "mantenimiento-mecanicos-css-runtime";
            var oOldStyle = document.getElementById(sStyleId);
            var sCssUrl;

            if (oOldStyle && oOldStyle.parentNode) {
                oOldStyle.parentNode.removeChild(oOldStyle);
            }

            sCssUrl = sap.ui.require.toUrl(
                "mantenimiento/css/Mecanicos.css"
            ) + "?version=20260825_03";

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
                this._oModel.getProperty("/filters") || {}
            );
        },

        onPeriodChange: function (oEvent) {
            var sYear = oEvent.getSource().getSelectedKey();
            var iYear = Number(sYear);

            if (!Number.isInteger(iYear)) {
                return;
            }

            this._oModel.setProperty(
                "/filters/periodo",
                String(iYear)
            );

            this._oModel.setProperty(
                "/filters/fechaDesde",
                "01/01/" + iYear
            );

            this._oModel.setProperty(
                "/filters/fechaHasta",
                "31/12/" + iYear
            );

            this._oModel.setProperty(
                "/header/periodoActual",
                String(iYear)
            );

            this._markDirty();
        },

        onDateChange: function () {
            var sFrom =
                this._oModel.getProperty("/filters/fechaDesde") || "";

            var sTo =
                this._oModel.getProperty("/filters/fechaHasta") || "";

            var aFrom =
                sFrom.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

            var aTo =
                sTo.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

            if (
                aFrom &&
                aTo &&
                aFrom[3] === aTo[3]
            ) {
                this._oModel.setProperty(
                    "/filters/periodo",
                    aFrom[3]
                );

                this._oModel.setProperty(
                    "/header/periodoActual",
                    aFrom[3]
                );
            }

            this._markDirty();
        },

        onFilterChange: function () {
            this._markDirty();
        },

        _markDirty: function () {
            this._oModel.setProperty(
                "/filters/dirty",
                true
            );
        },

        onApplyFilters: function () {
            var oFilters = this._getFilters();

            if (
                !oFilters.fechaDesde ||
                !oFilters.fechaHasta
            ) {
                MessageBox.warning(
                    "Selecciona fecha desde y fecha hasta."
                );
                return;
            }

            this._loadBase(true);
        },

        _loadBase: function (bNotify) {
            var iRequest = ++this._iRequest;
            var oODataModel = this._getODataModel();
            var oFilters = this._getFilters();

            if (!oODataModel) {
                MessageBox.error(
                    "No se encontró el modelo OData dashboardOData."
                );
                return;
            }

            this._oModel.setProperty(
                "/loading",
                true
            );

            this._oModel.setProperty(
                "/operationalLoading",
                false
            );

            MecanicosService
                .getBaseData(
                    oODataModel,
                    oFilters
                )
                .then(function (oRaw) {
                    var oMapped;
                    var aOrderIds;

                    if (iRequest !== this._iRequest) {
                        return;
                    }

                    this._oRawData = oRaw;

                    oMapped = MecanicosMapper.mapData(
                        this._oRawData,
                        oFilters
                    );

                    this._applyMappedData(oMapped);

                    this._oModel.setProperty(
                        "/filters/dirty",
                        false
                    );

                    this._oModel.setProperty(
                        "/loading",
                        false
                    );

                    if (bNotify) {
                        MessageToast.show(
                            "Filtros aplicados"
                        );
                    }

                    aOrderIds = (
                        this._oRawData.orders || []
                    ).map(function (oOrder) {
                        return oOrder.OrderId;
                    }).filter(Boolean);

                    if (!aOrderIds.length) {
                        return;
                    }

                    this._loadOperational(
                        iRequest,
                        oFilters,
                        aOrderIds
                    );
                }.bind(this))
                .catch(function (oError) {
                    console.error(
                        "[MEC CONTROLLER] Base:",
                        oError
                    );

                    if (iRequest === this._iRequest) {
                        this._oModel.setProperty(
                            "/loading",
                            false
                        );
                    }

                    MessageBox.error(
                        "No fue posible cargar la información base de Mecánicos."
                    );
                }.bind(this));
        },

        _loadOperational: function (
            iRequest,
            oFilters,
            aOrderIds
        ) {
            var oODataModel = this._getODataModel();

            this._oModel.setProperty(
                "/operationalLoading",
                true
            );

            MecanicosService
                .getOperationalData(
                    oODataModel,
                    aOrderIds
                )
                .then(function (oOperational) {
                    var oMapped;

                    if (
                        iRequest !== this._iRequest ||
                        !this._oRawData
                    ) {
                        return;
                    }

                    this._oRawData.orderResources =
                        oOperational.orderResources || [];

                    this._oRawData.operations =
                        oOperational.operations || [];

                    oMapped = MecanicosMapper.mapData(
                        this._oRawData,
                        oFilters
                    );

                    this._applyMappedData(oMapped);
                }.bind(this))
                .catch(function (oError) {
                    console.error(
                        "[MEC CONTROLLER] Operacional:",
                        oError
                    );
                })
                .then(function () {
                    if (iRequest === this._iRequest) {
                        this._oModel.setProperty(
                            "/operationalLoading",
                            false
                        );
                    }
                }.bind(this));
        },

        _applyMappedData: function (oMapped) {
            [
                "catalogos",
                "header",
                "kpis",
                "balance",
                "distribucionTurnos",
                "distribucionEspecialidad",
                "distribucionZona",
                "estadoData",
                "zonaDonutGradient",
                "estadoDonutGradient",
                "zonaTotal",
                "especialidadMensaje",
                "heatmapZones",
                "heatmapRows",
                "capacidadEspecialidad",
                "capacidadTotal",
                "presionServicios",
                "presionTotal",
                "meta"
            ].forEach(function (sPath) {
                this._oModel.setProperty(
                    "/" + sPath,
                    oMapped[sPath]
                );
            }.bind(this));

            window.setTimeout(
                this._applyDynamicVisuals.bind(this),
                0
            );
        },

        _applyDynamicVisuals: function () {
            var oZoneDonut = this.byId("zoneDonut");
            var oStateDonut = this.byId("stateDonut");

            var oZoneDom =
                oZoneDonut &&
                oZoneDonut.getDomRef();

            var oStateDom =
                oStateDonut &&
                oStateDonut.getDomRef();

            var sZoneGradient =
                this._oModel &&
                this._oModel.getProperty(
                    "/zonaDonutGradient"
                );

            var sStateGradient =
                this._oModel &&
                this._oModel.getProperty(
                    "/estadoDonutGradient"
                );

            if (oZoneDom && sZoneGradient) {
                oZoneDom.style.background =
                    sZoneGradient;
            }

            if (oStateDom && sStateGradient) {
                oStateDom.style.background =
                    sStateGradient;
            }
        },

        _getInitialData: function () {
            return {
                loading: false,
                operationalLoading: false,

                header: {
                    periodoActual: "2026"
                },

                filters: {
                    periodo: "2026",
                    fechaDesde: "01/01/2026",
                    fechaHasta: "31/12/2026",
                    zona: "ALL",
                    supervisor: "ALL",
                    turno: "ALL",
                    tipoServicio: "ALL",
                    especialidad: "ALL",
                    estado: "ALL",
                    dirty: false
                },

                catalogos: {
                    periodos: [
                        { key: "2028", text: "2028" },
                        { key: "2027", text: "2027" },
                        { key: "2026", text: "2026" },
                        { key: "2025", text: "2025" },
                        { key: "2024", text: "2024" }
                    ],
                    zonas: [
                        { key: "ALL", text: "Todas" }
                    ],
                    supervisores: [
                        { key: "ALL", text: "Todos" }
                    ],
                    turnos: [
                        { key: "ALL", text: "Todos" }
                    ],
                    tiposServicio: [
                        { key: "ALL", text: "Todos" }
                    ],
                    especialidades: [
                        { key: "ALL", text: "Todas" }
                    ],
                    estados: [
                        { key: "ALL", text: "Todos" },
                        { key: "AVAILABLE", text: "Disponibles" },
                        { key: "BALANCED", text: "Dentro de capacidad" },
                        { key: "NEAR", text: "Cerca de saturación" },
                        { key: "OVER", text: "Sobre capacidad" },
                        { key: "CRITICAL", text: "Crítico" },
                        { key: "INACTIVE", text: "Inactivos" }
                    ]
                },

                kpis: {
                    activos: "Sin datos",
                    disponibles: "Sin datos",
                    disponiblesPct: "Sin datos",
                    sobrecapacidad: "Sin datos",
                    sobrecapacidadPct: "Sin datos",
                    cobertura: "Sin datos",
                    coberturaSub: "Regla funcional pendiente"
                },

                balance: {
                    capacidad: "Sin datos",
                    capacidadPct: "",
                    carga: "Sin datos",
                    cargaPct: "",
                    brecha: "Sin datos",
                    brechaPct: "",
                    utilizacion: "Sin datos",
                    utilizacionRaw: 0,
                    mensaje:
                        "Esperando datos validados de capacidad y carga."
                },

                distribucionTurnos:
                    this._emptyDistribution(3),

                distribucionEspecialidad:
                    this._emptyDistribution(5),

                distribucionZona:
                    this._emptyDistribution(5),

                estadoData:
                    this._emptyState(),

                zonaDonutGradient:
                    "conic-gradient(#e8eef6 0% 100%)",

                estadoDonutGradient:
                    "conic-gradient(#e8eef6 0% 100%)",

                zonaTotal: "—",

                especialidadMensaje:
                    "Especialidad pendiente de información.",

                heatmapZones: [
                    { label: "Sin datos" }
                ],

                heatmapRows: [
                    {
                        shift: "Sin turno validado",
                        cells: [
                            {
                                zone: "Sin datos",
                                value: "—",
                                stateCode: "NO_DATA"
                            }
                        ]
                    }
                ],

                capacidadEspecialidad: [],

                capacidadTotal: "Sin datos",

                presionServicios: [
                    this._emptyPressure(),
                    this._emptyPressure(),
                    this._emptyPressure()
                ],

                presionTotal: {
                    req: "Sin datos",
                    disp: "Sin datos",
                    utilizacion: "Sin datos"
                },

                meta: {}
            };
        },

        _emptyDistribution: function (iCount) {
            var aResult = [];
            var i;

            for (i = 0; i < iCount; i += 1) {
                aResult.push({
                    label: "Sin datos",
                    value: "—",
                    pct: 0,
                    pctText: "—"
                });
            }

            return aResult;
        },

        _emptyState: function () {
            return [
                {
                    label: "Disponibles",
                    value: "—",
                    pct: 0,
                    pctText: "—"
                },
                {
                    label: "Dentro de capacidad",
                    value: "—",
                    pct: 0,
                    pctText: "—"
                },
                {
                    label: "Cerca de saturación",
                    value: "—",
                    pct: 0,
                    pctText: "—"
                },
                {
                    label: "Sobre capacidad",
                    value: "—",
                    pct: 0,
                    pctText: "—"
                },
                {
                    label: "Inactivos",
                    value: "—",
                    pct: 0,
                    pctText: "—"
                }
            ];
        },

        _emptyPressure: function () {
            return {
                label: "Sin datos",
                req: "—",
                disp: "—",
                utilizacion: "—",
                state: "None",
                stateText: "",
                reqPct: 0,
                dispPct: 0
            };
        }
    });
});
