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
                    new Date().getFullYear();

                var oViewModel =
                    new JSONModel({

                        isBusy: false,

                        filters: {
                            periodo:
                                String(iYear),

                            fechaDesde:
                                "01/01/" + iYear,

                            fechaHasta:
                                "31/12/" + iYear,

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
                                    key: "Todos",
                                    text: "Todos"
                                }
                            ],

                            supervisores: [
                                {
                                    key: "Todos",
                                    text: "Todos"
                                }
                            ],

                            turnos: [
                                {
                                    key: "Todos",
                                    text: "Todos"
                                }
                            ],

                            tiposOrden: [
                                {
                                    key: "Todos",
                                    text: "Todos"
                                }
                            ],

                            estadosOrden: [
                                {
                                    key: "Todos",
                                    text: "Todos"
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

                        ordenes: [],

                        ordenesPaginadas: [],

                        resumenZona: [],

                        resumenTurno: [],

                        resumenTipoOrden: [],

                        footerText:
                            "Mostrando 0 resultados",

                        pagination: {
                            currentPage: 1,
                            totalPages: 1,
                            totalResults: 0,
                            hasPrevious: false,
                            hasNext: false,
                            resultText:
                                "Mostrando 0 resultados"
                        },

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

                this.getView().setModel(
                    oViewModel,
                    "ddh"
                );

                this._iLoadRequest = 0;

                this._aAllOrders = [];

                this._iCurrentPage = 1;

                this._iPageSize =
                    this._getDefaultPageSize();

                this._loadData(false);
            },


            /* =====================================================
               CATÁLOGO DE PERIODOS
               ===================================================== */

            _buildYearCatalog: function (
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


            /* =====================================================
               ODATA
               ===================================================== */

            _getODataModel: function () {
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


            /* =====================================================
               FILTROS
               ===================================================== */

            _getFilters: function () {
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


            onPeriodoChange: function (
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


            onFechaChange: function () {
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


            onAplicarFiltros: function () {
                var mFilters =
                    this._getFilters();

                var oDesde =
                    this._localDate(
                        mFilters.fechaDesde
                    );

                var oHasta =
                    this._localDate(
                        mFilters.fechaHasta
                    );

                if (
                    !oDesde ||
                    !oHasta ||
                    oDesde > oHasta
                ) {
                    MessageToast.show(
                        "Revisa que la fecha desde sea menor o igual a la fecha hasta."
                    );

                    return;
                }

                this._iCurrentPage = 1;

                this._loadData(true);
            },


            /* =====================================================
               CARGA SAP
               ===================================================== */

            _loadData: function (
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
                    ++this._iLoadRequest;

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
                                oMappedData.catalogos
                            );

                            oViewModel.setProperty(
                                "/kpis",
                                oMappedData.kpis
                            );

                            oViewModel.setProperty(
                                "/totales",
                                oMappedData.totales
                            );

                            this._aAllOrders =
                                Array.isArray(
                                    oMappedData.ordenes
                                )
                                    ? oMappedData
                                        .ordenes
                                        .slice()
                                    : [];

                            oViewModel.setProperty(
                                "/ordenes",
                                this._aAllOrders
                            );

                            oViewModel.setProperty(
                                "/resumenZona",
                                oMappedData
                                    .resumenZona ||
                                []
                            );

                            oViewModel.setProperty(
                                "/resumenTurno",
                                oMappedData
                                    .resumenTurno ||
                                []
                            );

                            oViewModel.setProperty(
                                "/resumenTipoOrden",
                                oMappedData
                                    .resumenTipoOrden ||
                                []
                            );

                            oViewModel.setProperty(
                                "/footerText",
                                oMappedData
                                    .footerText ||
                                "Mostrando 0 resultados"
                            );

                            oViewModel.setProperty(
                                "/meta",
                                oMappedData.meta
                            );

                            this._iCurrentPage =
                                1;

                            this._renderPage();

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

                            this._aAllOrders = [];

                            this._iCurrentPage = 1;

                            oViewModel.setProperty(
                                "/ordenes",
                                []
                            );

                            this._renderPage();

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


            /* =====================================================
               PAGINACIÓN
               ===================================================== */

            _getDefaultPageSize: function () {
                var iHeight =
                    window.innerHeight ||
                    768;

                if (
                    iHeight <= 720
                ) {
                    return 7;
                }

                if (
                    iHeight <= 850
                ) {
                    return 9;
                }

                return 11;
            },


            _renderPage: function () {
                var oModel =
                    this.getView()
                        .getModel(
                            "ddh"
                        );

                var aOrders =
                    this._aAllOrders ||
                    [];

                var iTotal =
                    aOrders.length;

                var iTotalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            iTotal /
                            this._iPageSize
                        )
                    );

                var iPage =
                    Math.min(
                        Math.max(
                            this._iCurrentPage,
                            1
                        ),
                        iTotalPages
                    );

                var iStart =
                    (
                        iPage - 1
                    ) *
                    this._iPageSize;

                var iEnd =
                    Math.min(
                        iStart +
                        this._iPageSize,
                        iTotal
                    );

                this._iCurrentPage =
                    iPage;

                oModel.setProperty(
                    "/ordenesPaginadas",
                    aOrders.slice(
                        iStart,
                        iEnd
                    )
                );

                oModel.setProperty(
                    "/pagination",
                    {
                        currentPage:
                            iPage,

                        totalPages:
                            iTotalPages,

                        totalResults:
                            iTotal,

                        hasPrevious:
                            iPage > 1,

                        hasNext:
                            iPage <
                            iTotalPages,

                        resultText:
                            iTotal === 0
                                ? "Mostrando 0 resultados"
                                : (
                                    "Mostrando " +
                                    (
                                        iStart +
                                        1
                                    ) +
                                    " a " +
                                    iEnd +
                                    " de " +
                                    iTotal +
                                    " resultados"
                                )
                    }
                );
            },


            onPaginaAnterior: function () {
                if (
                    this._iCurrentPage <= 1
                ) {
                    return;
                }

                this._iCurrentPage -=
                    1;

                this._renderPage();
            },


            onPaginaSiguiente: function () {
                var oPagination =
                    this.getView()
                        .getModel(
                            "ddh"
                        )
                        .getProperty(
                            "/pagination"
                        ) || {};

                var iTotalPages =
                    Number(
                        oPagination
                            .totalPages
                    ) || 1;

                if (
                    this._iCurrentPage >=
                    iTotalPages
                ) {
                    return;
                }

                this._iCurrentPage +=
                    1;

                this._renderPage();
            },


            onColumnas: function () {
                MessageToast.show(
                    "La tabla muestra OT, cliente, equipo, zona, tipo de orden, responsable, turno, horas, variación y estado."
                );
            },


            /* =====================================================
               UTILIDADES
               ===================================================== */

            _localDate: function (
                sValue
            ) {
                var aMatch =
                    String(
                        sValue || ""
                    ).match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                return aMatch
                    ? new Date(
                        Number(
                            aMatch[3]
                        ),
                        Number(
                            aMatch[2]
                        ) - 1,
                        Number(
                            aMatch[1]
                        )
                    )
                    : null;
            }

        }
    );
});