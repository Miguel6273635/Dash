sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/dom/includeStylesheet",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/DetalleMecanicosService",
    "mantenimiento/model/DetalleMecanicosMapper"
], function (
    Controller,
    JSONModel,
    includeStylesheet,
    MessageToast,
    MessageBox,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleMecanicos",
        {
            onInit: function () {
                var iYear =
                    new Date()
                        .getFullYear();

                this._loadScreenStyles();

                this._oModel =
                    new JSONModel(
                        this._getInitialData(
                            iYear
                        )
                    );

                this._oModel.setSizeLimit(
                    5000
                );

                this.getView()
                    .setModel(
                        this._oModel,
                        "detalle"
                    );

                this._iLoadRequest =
                    0;

                this._loadData(
                    this._getFilters(),
                    false
                );
            },

            _loadScreenStyles:
                function () {
                    var sStyleId =
                        "detalleMecanicosStyles";

                    var oOldStyle =
                        document.getElementById(
                            sStyleId
                        );

                    var sCssUrl;

                    if (
                        oOldStyle &&
                        oOldStyle.parentNode
                    ) {
                        oOldStyle.parentNode
                            .removeChild(
                                oOldStyle
                            );
                    }

                    sCssUrl =
                        sap.ui.require.toUrl(
                            "mantenimiento/css/DetalleMecanicos.css"
                        );

                    sCssUrl +=
                        "?version=20260821_01";

                    includeStylesheet(
                        sCssUrl,
                        sStyleId
                    );
                },

            _getODataModel:
                function () {
                    var oComponent =
                        this.getOwnerComponent();

                    return (
                        oComponent &&
                        oComponent.getModel(
                            "dashboardOData"
                        )
                    ) ||
                    (
                        oComponent &&
                        oComponent.getModel()
                    );
                },

            _buildYearCatalog:
                function (
                    iSelectedYear
                ) {
                    var iCurrentYear =
                        new Date()
                            .getFullYear();

                    var iStart =
                        Math.min(
                            iCurrentYear - 5,
                            Number(
                                iSelectedYear
                            ) - 2
                        );

                    var iEnd =
                        Math.max(
                            iCurrentYear + 1,
                            Number(
                                iSelectedYear
                            ) + 2
                        );

                    var aYears =
                        [];

                    var iYear;

                    for (
                        iYear = iEnd;
                        iYear >= iStart;
                        iYear--
                    ) {
                        aYears.push({
                            key:
                                String(
                                    iYear
                                ),

                            text:
                                String(
                                    iYear
                                )
                        });
                    }

                    return aYears;
                },

            _getFilters:
                function () {
                    var mFilters =
                        this._oModel
                            .getProperty(
                                "/filters"
                            ) || {};

                    return {
                        periodo:
                            mFilters.periodo,

                        fechaDesde:
                            mFilters.fechaDesde,

                        fechaHasta:
                            mFilters.fechaHasta,

                        zona:
                            mFilters.zona,

                        supervisor:
                            mFilters.supervisor,

                        turno:
                            mFilters.turno,

                        tipoServicio:
                            mFilters.tipoServicio,

                        especialidad:
                            mFilters.especialidad,

                        estado:
                            mFilters.estado
                    };
                },

            onApplyFilters:
                function () {
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

                    this._loadData(
                        oFilters,
                        true
                    );
                },

            onPeriodoChange:
                function (
                    oEvent
                ) {
                    var sYear =
                        oEvent
                            .getSource()
                            .getSelectedKey();

                    var iYear =
                        Number(
                            sYear
                        );

                    if (
                        !Number.isInteger(
                            iYear
                        ) ||
                        iYear < 1900 ||
                        iYear > 9999
                    ) {
                        return;
                    }

                    this._oModel
                        .setProperty(
                            "/filters/periodo",
                            String(
                                iYear
                            )
                        );

                    this._oModel
                        .setProperty(
                            "/filters/fechaDesde",
                            "01/01/" +
                            iYear
                        );

                    this._oModel
                        .setProperty(
                            "/filters/fechaHasta",
                            "31/12/" +
                            iYear
                        );
                },

            onFechaChange:
                function () {
                    var sDesde =
                        this._oModel
                            .getProperty(
                                "/filters/fechaDesde"
                            ) ||
                        "";

                    var sHasta =
                        this._oModel
                            .getProperty(
                                "/filters/fechaHasta"
                            ) ||
                        "";

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
                        aDesde[3] ===
                            aHasta[3]
                    ) {
                        this._oModel
                            .setProperty(
                                "/filters/periodo",
                                aDesde[3]
                            );
                    }
                },

            _loadData:
                function (
                    oFilters,
                    bNotify
                ) {
                    var iRequest =
                        ++this
                            ._iLoadRequest;

                    var oODataModel =
                        this._getODataModel();

                    this._oModel
                        .setProperty(
                            "/loading",
                            true
                        );

                    console.log(
                        "[DM CONTROLLER] _loadData:",
                        oFilters
                    );

                    Service
                        .getDashboardData(
                            oODataModel,
                            oFilters
                        )
                        .then(
                            function (
                                oRawData
                            ) {
                                var oMapped;

                                if (
                                    iRequest !==
                                    this._iLoadRequest
                                ) {
                                    return;
                                }

                                oMapped =
                                    Mapper.mapData(
                                        oRawData,
                                        oFilters
                                    );

                                this._oModel
                                    .setProperty(
                                        "/catalogos",
                                        oMapped.catalogos
                                    );

                                this._oModel
                                    .setProperty(
                                        "/kpis",
                                        oMapped.kpis
                                    );

                                this._oModel
                                    .setProperty(
                                        "/turnos",
                                        oMapped.turnos
                                    );

                                this._oModel
                                    .setProperty(
                                        "/utilTurno",
                                        oMapped.utilTurno
                                    );

                                this._oModel
                                    .setProperty(
                                        "/utilTotal",
                                        oMapped.utilTotal
                                    );

                                this._oModel
                                    .setProperty(
                                        "/zonas",
                                        oMapped.zonas
                                    );

                                this._oModel
                                    .setProperty(
                                        "/estadoPlantilla",
                                        oMapped.estadoPlantilla
                                    );

                                this._oModel
                                    .setProperty(
                                        "/servicios",
                                        oMapped.servicios
                                    );

                                this._oModel
                                    .setProperty(
                                        "/presion",
                                        oMapped.presion
                                    );

                                this._oModel
                                    .setProperty(
                                        "/meta",
                                        oMapped.meta
                                    );

                                if (bNotify) {
                                    MessageToast.show(
                                        "Detalle de mecánicos actualizado"
                                    );
                                }
                            }.bind(this)
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                if (
                                    iRequest !==
                                    this._iLoadRequest
                                ) {
                                    return;
                                }

                                console.error(
                                    "[DM CONTROLLER] Error:",
                                    oError
                                );

                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "Error al consultar los datos de SAP."
                                );
                            }.bind(this)
                        )
                        .finally(
                            function () {
                                if (
                                    iRequest ===
                                    this._iLoadRequest
                                ) {
                                    this._oModel
                                        .setProperty(
                                            "/loading",
                                            false
                                        );
                                }
                            }.bind(this)
                        );
                },

            _getInitialData:
                function (
                    iYear
                ) {
                    return {
                        loading:
                            false,

                        filters: {
                            periodo:
                                String(
                                    iYear
                                ),

                            fechaDesde:
                                "01/01/" +
                                iYear,

                            fechaHasta:
                                "31/12/" +
                                iYear,

                            zona:
                                "TODAS",

                            supervisor:
                                "TODOS",

                            turno:
                                "TODOS",

                            tipoServicio:
                                "TODAS",

                            especialidad:
                                "TODAS",

                            estado:
                                "TODOS"
                        },

                        catalogos: {
                            periodos:
                                this._buildYearCatalog(
                                    iYear
                                ),

                            zonas: [
                                {
                                    key:
                                        "TODAS",

                                    text:
                                        "Todas"
                                }
                            ],

                            supervisores: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ],

                            turnos: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ],

                            tiposServicio: [
                                {
                                    key:
                                        "TODAS",

                                    text:
                                        "Todas"
                                }
                            ],

                            especialidades: [
                                {
                                    key:
                                        "TODAS",

                                    text:
                                        "Todas"
                                }
                            ],

                            estados: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ]
                        },

                        kpis: {
                            activos:
                                "Sin datos",

                            disponibles:
                                "Sin datos",

                            disponiblesPct:
                                "Sin datos",

                            sobrecapacidad:
                                "Sin datos",

                            sobrecapacidadPct:
                                "Sin datos",

                            cobertura:
                                "Sin datos"
                        },

                        turnos: [
                            {
                                label:
                                    "Diurno",
                                value:
                                    "Sin datos",
                                pct:
                                    0,
                                pctText:
                                    "Sin datos",
                                tone:
                                    "blue"
                            },
                            {
                                label:
                                    "Nocturno",
                                value:
                                    "Sin datos",
                                pct:
                                    0,
                                pctText:
                                    "Sin datos",
                                tone:
                                    "green"
                            },
                            {
                                label:
                                    "Fin de semana",
                                value:
                                    "Sin datos",
                                pct:
                                    0,
                                pctText:
                                    "Sin datos",
                                tone:
                                    "purple"
                            }
                        ],

                        utilTurno: [
                            {
                                turno:
                                    "Diurno",
                                capacidad:
                                    "Sin datos",
                                carga:
                                    "Sin datos",
                                utilizacion:
                                    "Sin datos",
                                percentValue:
                                    0,
                                tone:
                                    "green"
                            },
                            {
                                turno:
                                    "Nocturno",
                                capacidad:
                                    "Sin datos",
                                carga:
                                    "Sin datos",
                                utilizacion:
                                    "Sin datos",
                                percentValue:
                                    0,
                                tone:
                                    "orange"
                            },
                            {
                                turno:
                                    "Fin de semana",
                                capacidad:
                                    "Sin datos",
                                carga:
                                    "Sin datos",
                                utilizacion:
                                    "Sin datos",
                                percentValue:
                                    0,
                                tone:
                                    "red"
                            }
                        ],

                        utilTotal: {
                            capacidad:
                                "Sin datos",

                            carga:
                                "Sin datos",

                            utilizacion:
                                "Sin datos",

                            percentValue:
                                0,

                            tone:
                                "gray"
                        },

                        zonas:
                            [],

                        presion:
                            [],

                        estadoPlantilla: [
                            {
                                label:
                                    "Disponibles",
                                value:
                                    "0",
                                pct:
                                    "0.0%",
                                tone:
                                    "green"
                            },
                            {
                                label:
                                    "Dentro de capacidad",
                                value:
                                    "0",
                                pct:
                                    "0.0%",
                                tone:
                                    "blue"
                            },
                            {
                                label:
                                    "Cerca de saturación",
                                value:
                                    "0",
                                pct:
                                    "0.0%",
                                tone:
                                    "orange"
                            },
                            {
                                label:
                                    "Sobre capacidad",
                                value:
                                    "0",
                                pct:
                                    "0.0%",
                                tone:
                                    "red"
                            },
                            {
                                label:
                                    "Inactivos",
                                value:
                                    "0",
                                pct:
                                    "0.0%",
                                tone:
                                    "gray"
                            }
                        ],

                        servicios: [
                            {
                                label:
                                    "Sin datos",
                                programadas:
                                    "Sin datos",
                                reales:
                                    "Sin datos",
                                programadasLevel:
                                    "8",
                                realesLevel:
                                    "8"
                            },
                            {
                                label:
                                    "Sin datos",
                                programadas:
                                    "Sin datos",
                                reales:
                                    "Sin datos",
                                programadasLevel:
                                    "8",
                                realesLevel:
                                    "8"
                            },
                            {
                                label:
                                    "Sin datos",
                                programadas:
                                    "Sin datos",
                                reales:
                                    "Sin datos",
                                programadasLevel:
                                    "8",
                                realesLevel:
                                    "8"
                            }
                        ],

                        meta:
                            {}
                    };
                }
        }
    );
});