sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/DetalleOperativoZonaSurService",
    "mantenimiento/model/DetalleOperativoZonaSurMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    DetalleOperativoZonaSurService,
    DetalleOperativoZonaSurMapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleOperativoZonaSur",
        {
            onInit: function () {
                this._iRequest = 0;
                this._oRawData = null;

                this._oModel = new JSONModel(
                    this._getInitialData()
                );

                this._oModel.setDefaultBindingMode(
                    "TwoWay"
                );

                this._oModel.setSizeLimit(
                    5000
                );

                this.getView().setModel(
                    this._oModel,
                    "doz"
                );

                this._loadBase(
                    false
                );
            },

            onAfterRendering: function () {
                this._updateVisuals();
            },

            _getODataModel: function () {
                var oComponent =
                    this.getOwnerComponent();

                return (
                    oComponent &&
                    oComponent.getModel(
                        "dashboardOData"
                    )
                ) || (
                    oComponent &&
                    oComponent.getModel()
                );
            },

            _getFilters: function () {
                return Object.assign(
                    {},
                    this._oModel.getProperty(
                        "/filtros"
                    ) || {}
                );
            },

            onPeriodoChange: function (
                oEvent
            ) {
                var sYear =
                    oEvent.getSource()
                        .getSelectedKey();

                var iYear =
                    Number(
                        sYear
                    );

                if (
                    !Number.isInteger(
                        iYear
                    )
                ) {
                    return;
                }

                this._oModel.setProperty(
                    "/filtros/periodo",
                    String(
                        iYear
                    )
                );

                this._oModel.setProperty(
                    "/filtros/fechaDesde",
                    "01/01/" +
                    iYear
                );

                this._oModel.setProperty(
                    "/filtros/fechaHasta",
                    "31/12/" +
                    iYear
                );
            },

            onFechaChange: function () {
                var sFrom =
                    this._oModel.getProperty(
                        "/filtros/fechaDesde"
                    ) || "";

                var sTo =
                    this._oModel.getProperty(
                        "/filtros/fechaHasta"
                    ) || "";

                var aFrom =
                    sFrom.match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                var aTo =
                    sTo.match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                if (
                    aFrom &&
                    aTo &&
                    aFrom[3] ===
                        aTo[3]
                ) {
                    this._oModel.setProperty(
                        "/filtros/periodo",
                        aFrom[3]
                    );
                }
            },

            onAplicarFiltros: function () {
                var oFilters =
                    this._getFilters();

                if (
                    !oFilters.fechaDesde ||
                    !oFilters.fechaHasta
                ) {
                    MessageBox.warning(
                        "Selecciona fecha desde y fecha hasta."
                    );
                    return;
                }

                this._loadBase(
                    true
                );
            },

            _loadBase: function (
                bNotify
            ) {
                var iRequest =
                    ++this._iRequest;

                var oODataModel =
                    this._getODataModel();

                var oFilters =
                    this._getFilters();

                if (!oODataModel) {
                    MessageBox.error(
                        "No se encontró el modelo OData dashboardOData."
                    );
                    return;
                }

                this._oModel.setProperty(
                    "/busy",
                    true
                );

                this._oModel.setProperty(
                    "/operationalBusy",
                    false
                );

                this._oModel.setProperty(
                    "/confirmationBusy",
                    false
                );

                DetalleOperativoZonaSurService
                    .getBaseData(
                        oODataModel,
                        oFilters
                    )
                    .then(
                        function (
                            oRaw
                        ) {
                            var oMapped;
                            var aOrderIds;

                            if (
                                iRequest !==
                                this._iRequest
                            ) {
                                return;
                            }

                            this._oRawData =
                                oRaw;

                            oMapped =
                                DetalleOperativoZonaSurMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._applyMappedData(
                                oMapped
                            );

                            this._oModel.setProperty(
                                "/busy",
                                false
                            );

                            if (bNotify) {
                                MessageToast.show(
                                    "Filtros aplicados"
                                );
                            }

                            aOrderIds =
                                (
                                    this._oRawData.orders ||
                                    []
                                )
                                    .map(
                                        function (
                                            oOrder
                                        ) {
                                            return (
                                                oOrder.OrderId
                                            );
                                        }
                                    )
                                    .filter(
                                        Boolean
                                    );

                            if (
                                !aOrderIds.length
                            ) {
                                return;
                            }

                            this._loadOperational(
                                iRequest,
                                oFilters,
                                aOrderIds
                            );
                        }.bind(this)
                    )
                    .catch(
                        function (
                            oError
                        ) {
                            console.error(
                                "[DOZ CONTROLLER] Base:",
                                oError
                            );

                            if (
                                iRequest ===
                                this._iRequest
                            ) {
                                this._oModel.setProperty(
                                    "/busy",
                                    false
                                );
                            }

                            MessageBox.error(
                                "No fue posible cargar la información base de Detalle operativo de zona."
                            );
                        }.bind(this)
                    );
            },

            _loadOperational: function (
                iRequest,
                oFilters,
                aOrderIds
            ) {
                var oODataModel =
                    this._getODataModel();

                this._oModel.setProperty(
                    "/operationalBusy",
                    true
                );

                DetalleOperativoZonaSurService
                    .getOperationalData(
                        oODataModel,
                        aOrderIds
                    )
                    .then(
                        function (
                            oOperational
                        ) {
                            var oMapped;

                            if (
                                iRequest !==
                                    this._iRequest ||
                                !this._oRawData
                            ) {
                                return;
                            }

                            this._oRawData.orderResources =
                                oOperational.orderResources ||
                                [];

                            this._oRawData.operations =
                                oOperational.operations ||
                                [];

                            this._oRawData.causes =
                                oOperational.causes ||
                                [];

                            oMapped =
                                DetalleOperativoZonaSurMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._applyMappedData(
                                oMapped
                            );

                            /*
                             * Confirmaciones se consultan después para
                             * no bloquear la carga principal.
                             */
                            this._loadConfirmations(
                                iRequest,
                                oFilters,
                                aOrderIds
                            );
                        }.bind(this)
                    )
                    .catch(
                        function (
                            oError
                        ) {
                            console.error(
                                "[DOZ CONTROLLER] Operacional:",
                                oError
                            );
                        }
                    )
                    .then(
                        function () {
                            if (
                                iRequest ===
                                this._iRequest
                            ) {
                                this._oModel.setProperty(
                                    "/operationalBusy",
                                    false
                                );
                            }
                        }.bind(this)
                    );
            },

            _loadConfirmations: function (
                iRequest,
                oFilters,
                aOrderIds
            ) {
                var oODataModel =
                    this._getODataModel();

                this._oModel.setProperty(
                    "/confirmationBusy",
                    true
                );

                DetalleOperativoZonaSurService
                    .getConfirmationData(
                        oODataModel,
                        aOrderIds
                    )
                    .then(
                        function (
                            aConfirmations
                        ) {
                            var oMapped;

                            if (
                                iRequest !==
                                    this._iRequest ||
                                !this._oRawData
                            ) {
                                return;
                            }

                            this._oRawData.confirmations =
                                aConfirmations ||
                                [];

                            oMapped =
                                DetalleOperativoZonaSurMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._applyMappedData(
                                oMapped
                            );
                        }.bind(this)
                    )
                    .catch(
                        function (
                            oError
                        ) {
                            console.error(
                                "[DOZ CONTROLLER] Confirmaciones:",
                                oError
                            );
                        }
                    )
                    .then(
                        function () {
                            if (
                                iRequest ===
                                this._iRequest
                            ) {
                                this._oModel.setProperty(
                                    "/confirmationBusy",
                                    false
                                );
                            }
                        }.bind(this)
                    );
            },

            _applyMappedData: function (
                oMapped
            ) {
                [
                    "catalogos",
                    "kpis",
                    "totalOrdenesAbiertas",
                    "resumenEstados",
                    "evolucionHoras",
                    "horasResumen",
                    "recursos",
                    "causasPresion",
                    "clientesCarga",
                    "ordenesVencer",
                    "chart",
                    "meta"
                ].forEach(
                    function (
                        sPath
                    ) {
                        this._oModel.setProperty(
                            "/" + sPath,
                            oMapped[sPath]
                        );
                    }.bind(this)
                );

                window.setTimeout(
                    this._updateVisuals.bind(
                        this
                    ),
                    0
                );
            },

            _updateVisuals: function () {
                var oRoot =
                    this.getView()
                        .getDomRef();

                var oChart =
                    this._oModel &&
                    this._oModel.getProperty(
                        "/chart"
                    );

                var nUtilization =
                    this._oModel &&
                    this._oModel.getProperty(
                        "/recursos/utilizacion"
                    );

                if (!oRoot) {
                    return;
                }

                this._updateHoursChart(
                    oRoot,
                    oChart
                );

                this._updateGauge(
                    oRoot,
                    nUtilization
                );
            },

            _updateHoursChart: function (
                oRoot,
                oChart
            ) {
                var aPurple;
                var aGreen;
                var oPurpleLine;
                var oGreenLine;
                var aPurpleDots;
                var aGreenDots;
                var aLabels;
                var i;

                if (!oChart) {
                    return;
                }

                aPurple =
                    oChart.programadas ||
                    [];

                aGreen =
                    oChart.reales ||
                    [];

                oPurpleLine =
                    oRoot.querySelector(
                        ".dozHoursFixedLinePurple"
                    );

                oGreenLine =
                    oRoot.querySelector(
                        ".dozHoursFixedLineGreen"
                    );

                aPurpleDots =
                    oRoot.querySelectorAll(
                        ".dozHoursFixedDotPurple"
                    );

                aGreenDots =
                    oRoot.querySelectorAll(
                        ".dozHoursFixedDotGreen"
                    );

                aLabels =
                    oRoot.querySelectorAll(
                        ".dozHoursWeekLabel"
                    );

                if (oPurpleLine) {
                    oPurpleLine.setAttribute(
                        "points",
                        this._toSvgPoints(
                            aPurple
                        )
                    );
                }

                if (oGreenLine) {
                    oGreenLine.setAttribute(
                        "points",
                        this._toSvgPoints(
                            aGreen
                        )
                    );
                }

                for (
                    i = 0;
                    i < aPurpleDots.length;
                    i += 1
                ) {
                    this._setDot(
                        aPurpleDots[i],
                        aPurple[i]
                    );
                }

                for (
                    i = 0;
                    i < aGreenDots.length;
                    i += 1
                ) {
                    this._setDot(
                        aGreenDots[i],
                        aGreen[i]
                    );
                }

                for (
                    i = 0;
                    i < aLabels.length;
                    i += 1
                ) {
                    aLabels[i].textContent =
                        aPurple[i]
                            ? aPurple[i].label
                            : "";
                }
            },

            _toSvgPoints: function (
                aPoints
            ) {
                return (
                    aPoints || []
                ).map(
                    function (
                        oPoint
                    ) {
                        return (
                            oPoint.x +
                            "," +
                            oPoint.y
                        );
                    }
                ).join(" ");
            },

            _setDot: function (
                oDom,
                oPoint
            ) {
                if (!oDom) {
                    return;
                }

                if (!oPoint) {
                    oDom.setAttribute(
                        "cx",
                        "-20"
                    );
                    oDom.setAttribute(
                        "cy",
                        "-20"
                    );
                    return;
                }

                oDom.setAttribute(
                    "cx",
                    String(
                        oPoint.x
                    )
                );

                oDom.setAttribute(
                    "cy",
                    String(
                        oPoint.y
                    )
                );
            },

            _updateGauge: function (
                oRoot,
                nUtilization
            ) {
                var oNeedle =
                    oRoot.querySelector(
                        ".dozGaugeNeedle"
                    );

                var oValue =
                    oRoot.querySelector(
                        ".dozGaugeValue"
                    );

                var nSafe;
                var nAngle;

                if (
                    !Number.isFinite(
                        Number(
                            nUtilization
                        )
                    )
                ) {
                    if (oValue) {
                        oValue.textContent =
                            "Sin datos";
                    }

                    if (oNeedle) {
                        oNeedle.style.transform =
                            "rotate(-90deg)";
                    }

                    return;
                }

                nSafe =
                    Math.max(
                        0,
                        Math.min(
                            100,
                            Number(
                                nUtilization
                            )
                        )
                    );

                nAngle =
                    -90 +
                    (
                        nSafe *
                        1.8
                    );

                if (oValue) {
                    oValue.textContent =
                        nSafe.toFixed(
                            0
                        ) +
                        "%";
                }

                if (oNeedle) {
                    oNeedle.style.transform =
                        "rotate(" +
                        nAngle +
                        "deg)";
                }
            },

            onVerDetalleOrdenes: function () {
                this._logDetalle(
                    "ORDENES",
                    "Resumen de carga operativa por estado"
                );
            },

            onVerDetalleHoras: function () {
                this._logDetalle(
                    "HORAS",
                    "Evolución de horas programadas vs reales"
                );
            },

            onVerDetalleRecursos: function () {
                this._logDetalle(
                    "RECURSOS",
                    "Recursos y utilización"
                );
            },

            onVerDetalleCausa: function () {
                this._logDetalle(
                    "CAUSAS",
                    "Principales causas de presión"
                );
            },

            onVerDetalleCliente: function () {
                this._logDetalle(
                    "CLIENTES_ELEVADORES",
                    "Clientes / elevadores con mayor carga"
                );
            },

            onVerTodasProximas: function () {
                this._logDetalle(
                    "ORDENES_PROXIMAS",
                    "Órdenes próximas a vencer"
                );
            },

            _logDetalle: function (
                sSeccion,
                sDescripcion
            ) {
                console.log(
                    "[DOZ DETALLE]",
                    {
                        seccion:
                            sSeccion,
                        descripcion:
                            sDescripcion,
                        filtros:
                            this._getFilters()
                    }
                );

                MessageToast.show(
                    "Detalle: " +
                    sDescripcion
                );
            },

            _getInitialData: function () {
                return {
                    busy:
                        false,

                    operationalBusy:
                        false,

                    confirmationBusy:
                        false,

                    filtros: {
                        periodo:
                            "2026",
                        fechaDesde:
                            "01/01/2026",
                        fechaHasta:
                            "31/12/2026",
                        zona:
                            "ALL",
                        supervisor:
                            "ALL",
                        tipoOrden:
                            "ALL"
                    },

                    catalogos: {
                        periodos: [
                            {
                                key:
                                    "2028",
                                text:
                                    "2028"
                            },
                            {
                                key:
                                    "2027",
                                text:
                                    "2027"
                            },
                            {
                                key:
                                    "2026",
                                text:
                                    "2026"
                            },
                            {
                                key:
                                    "2025",
                                text:
                                    "2025"
                            },
                            {
                                key:
                                    "2024",
                                text:
                                    "2024"
                            }
                        ],

                        zonas: [
                            {
                                key:
                                    "ALL",
                                text:
                                    "Todas"
                            }
                        ],

                        supervisores: [
                            {
                                key:
                                    "ALL",
                                text:
                                    "Todos"
                            }
                        ],

                        tiposOrden: [
                            {
                                key:
                                    "ALL",
                                text:
                                    "Todos"
                            }
                        ]
                    },

                    kpis: {
                        indicePresion: {
                            texto:
                                "Sin datos",
                            estado:
                                "Pendiente",
                            nivel:
                                "Fórmula pendiente"
                        },

                        ordenesAbiertas: {
                            valor:
                                "0",
                            porcentaje:
                                "Sin datos"
                        },

                        ordenesVencidas: {
                            valor:
                                "0",
                            porcentaje:
                                "Sin datos"
                        },

                        horasProgramadas: {
                            texto:
                                "Sin datos"
                        },

                        horasReales: {
                            texto:
                                "Sin datos",
                            variacion:
                                "Sin datos"
                        },

                        recursosDisponibles: {
                            texto:
                                "Sin datos",
                            utilizacion:
                                "Utilización: Sin datos"
                        }
                    },

                    totalOrdenesAbiertas:
                        "0",

                    resumenEstados:
                        [],

                    evolucionHoras:
                        [],

                    horasResumen: {
                        programadas:
                            "Sin datos",
                        reales:
                            "Sin datos",
                        variacion:
                            "Sin datos"
                    },

                    recursos: {
                        utilizacion:
                            null,
                        utilizacionTexto:
                            "Sin datos",

                        asignados: {
                            mecanicos:
                                "Sin datos",
                            ayudantes:
                                "Sin datos"
                        },

                        disponibles: {
                            mecanicos:
                                "Sin datos",
                            ayudantes:
                                "Sin datos"
                        }
                    },

                    causasPresion:
                        [],

                    clientesCarga:
                        [],

                    ordenesVencer:
                        [],

                    chart: {
                        programadas:
                            [],
                        reales:
                            [],
                        max:
                            0
                    },

                    meta:
                        {}
                };
            }
        }
    );
});
