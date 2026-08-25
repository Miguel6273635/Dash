sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleDesviacionHorasService",
    "mantenimiento/model/DetalleDesviacionHorasMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleDesviacionHoras",
        {
            onInit: function () {
                var iYear =
                    new Date()
                        .getFullYear();

                var oViewModel =
                    new JSONModel({
                        isBusy:
                            false,

                        filters: {
                            periodo:
                                String(iYear),

                            fechaDesde:
                                "01/01/" +
                                iYear,

                            fechaHasta:
                                "31/12/" +
                                iYear,

                            zona:
                                "Todos",

                            supervisor:
                                "Todos",

                            turno:
                                "Todos",

                            tipoOrden:
                                "Todos",

                            estado:
                                "Todos"
                        },

                        catalogos: {
                            periodos:
                                this._buildYearCatalog(
                                    iYear
                                ),

                            zonas: [
                                {
                                    key:
                                        "Todos",
                                    text:
                                        "Todos"
                                }
                            ],

                            supervisores: [
                                {
                                    key:
                                        "Todos",
                                    text:
                                        "Todos"
                                }
                            ],

                            turnos: [
                                {
                                    key:
                                        "Todos",
                                    text:
                                        "Todos"
                                }
                            ],

                            tiposOrden: [
                                {
                                    key:
                                        "Todos",
                                    text:
                                        "Todos"
                                }
                            ],

                            estadosOrden: [
                                {
                                    key:
                                        "Todos",
                                    text:
                                        "Todos"
                                }
                            ]
                        },

                        kpis: {
                            otDesviacion:
                                "Sin datos",

                            horasPlanificadas:
                                "Sin datos",

                            horasReales:
                                "Sin datos",

                            desviacionTotal:
                                "Sin datos",

                            desviacionPromedio:
                                "Sin datos"
                        },

                        totales: {
                            ot:
                                "Sin datos",

                            horasPlan:
                                "Sin datos",

                            horasReales:
                                "Sin datos",

                            variacionH:
                                "—",

                            variacionPct:
                                "—",

                            estado:
                                "Sin datos"
                        },

                        ordenes:
                            [],

                        resumenZona:
                            [],

                        resumenTurno:
                            [],

                        resumenTipoOrden:
                            [],

                        footerText:
                            "Mostrando 0 resultados",

                        meta: {
                            planDisponible:
                                false,

                            realDisponible:
                                false,

                            asignacionesDisponibles:
                                false
                        }
                    });

                oViewModel.setSizeLimit(
                    5000
                );

                this.getView()
                    .setModel(
                        oViewModel,
                        "ddh"
                    );

                this._iLoadRequest = 0;

                /*
                 * En 2026 inicia automáticamente:
                 * 01/01/2026 - 31/12/2026.
                 */
                this._loadData(false);
            },

            _buildYearCatalog:
                function (
                    iSelectedYear
                ) {
                    var iCurrentYear =
                        new Date()
                            .getFullYear();

                    var iStartYear =
                        Math.min(
                            iCurrentYear - 5,
                            Number(
                                iSelectedYear
                            ) - 2
                        );

                    var iEndYear =
                        Math.max(
                            iCurrentYear + 1,
                            Number(
                                iSelectedYear
                            ) + 2
                        );

                    var aYears = [];
                    var iYear;

                    for (
                        iYear = iEndYear;
                        iYear >= iStartYear;
                        iYear--
                    ) {
                        aYears.push({
                            key:
                                String(iYear),

                            text:
                                String(iYear)
                        });
                    }

                    return aYears;
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

            _getFilters:
                function () {
                    var oModel =
                        this.getView()
                            .getModel(
                                "ddh"
                            );

                    var mFilters =
                        oModel.getProperty(
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

                        tipoOrden:
                            mFilters.tipoOrden,

                        estado:
                            mFilters.estado
                    };
                },

            _loadData:
                function (
                    bNotify
                ) {
                    var oViewModel =
                        this.getView()
                            .getModel(
                                "ddh"
                            );

                    var oODataModel =
                        this._getODataModel();

                    var mFilters =
                        this._getFilters();

                    var iRequest =
                        ++this
                            ._iLoadRequest;

                    console.log(
                        "[DDH CONTROLLER] _loadData:",
                        mFilters
                    );

                    oViewModel.setProperty(
                        "/isBusy",
                        true
                    );

                    Service
                        .getDashboardData(
                            oODataModel,
                            mFilters
                        )
                        .then(
                            function (
                                oRawData
                            ) {
                                var oMappedData;

                                if (
                                    iRequest !==
                                    this._iLoadRequest
                                ) {
                                    return;
                                }

                                oMappedData =
                                    Mapper.mapData(
                                        oRawData,
                                        mFilters
                                    );

                                oViewModel.setProperty(
                                    "/catalogos",
                                    oMappedData
                                        .catalogos
                                );

                                oViewModel.setProperty(
                                    "/kpis",
                                    oMappedData
                                        .kpis
                                );

                                oViewModel.setProperty(
                                    "/totales",
                                    oMappedData
                                        .totales
                                );

                                oViewModel.setProperty(
                                    "/ordenes",
                                    oMappedData
                                        .ordenes
                                );

                                oViewModel.setProperty(
                                    "/resumenZona",
                                    oMappedData
                                        .resumenZona
                                );

                                oViewModel.setProperty(
                                    "/resumenTurno",
                                    oMappedData
                                        .resumenTurno
                                );

                                oViewModel.setProperty(
                                    "/resumenTipoOrden",
                                    oMappedData
                                        .resumenTipoOrden
                                );

                                oViewModel.setProperty(
                                    "/footerText",
                                    oMappedData
                                        .footerText
                                );

                                oViewModel.setProperty(
                                    "/meta",
                                    oMappedData.meta
                                );

                                console.log(
                                    "[DDH CONTROLLER] Modelo actualizado."
                                );

                                if (bNotify) {
                                    MessageToast.show(
                                        "Detalle de desviación actualizado"
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
                                    "[DDH CONTROLLER] Error:",
                                    oError
                                );

                                MessageToast.show(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "Error al consultar los datos de SAP"
                                );
                            }.bind(this)
                        )
                        .finally(
                            function () {
                                if (
                                    iRequest ===
                                    this._iLoadRequest
                                ) {
                                    oViewModel
                                        .setProperty(
                                            "/isBusy",
                                            false
                                        );
                                }
                            }.bind(this)
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
                        Number(sYear);

                    var oModel =
                        this.getView()
                            .getModel(
                                "ddh"
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

                    oModel.setProperty(
                        "/filters/periodo",
                        String(iYear)
                    );

                    oModel.setProperty(
                        "/filters/fechaDesde",
                        "01/01/" +
                        iYear
                    );

                    oModel.setProperty(
                        "/filters/fechaHasta",
                        "31/12/" +
                        iYear
                    );
                },

            onFechaChange:
                function () {
                    var oModel =
                        this.getView()
                            .getModel(
                                "ddh"
                            );

                    var sDesde =
                        oModel.getProperty(
                            "/filters/fechaDesde"
                        ) || "";

                    var sHasta =
                        oModel.getProperty(
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
                        aDesde[3] ===
                        aHasta[3]
                    ) {
                        oModel.setProperty(
                            "/filters/periodo",
                            aDesde[3]
                        );
                    }
                },

            onAplicarFiltros:
                function () {
                    console.group(
                        "FILTROS - DETALLE DESVIACIÓN DE HORAS"
                    );

                    console.log(
                        JSON.stringify(
                            this._getFilters(),
                            null,
                            2
                        )
                    );

                    console.groupEnd();

                    /*
                     * Los DatePicker siguen siendo editables.
                     * La consulta usa exactamente el rango visible.
                     */
                    this._loadData(true);
                }
        }
    );
});

