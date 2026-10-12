sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleCapacidadZonaService",
    "mantenimiento/model/DetalleCapacidadZonaMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleCapacidadZona",
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

                            estados: [
                                {
                                    key: "Todos",
                                    text: "Todos"
                                }
                            ]
                        },

                        kpis: {
                            zona: "Todas",

                            capacidadDisponible:
                                "0.0 h",

                            horasProgramadas:
                                "0.0 h",

                            horasReales:
                                "0.0 h",

                            utilizacion:
                                "0.0%",

                            utilizacionValor:
                                0,

                            utilizacionWidth:
                                "0%",

                            estado:
                                "Sin datos"
                        },

                        ordenes: [],

                        ordenesPaginadas: [],

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
                        }
                    });

                oViewModel.setSizeLimit(
                    5000
                );

                this.getView().setModel(
                    oViewModel,
                    "dcz"
                );

                this._iLoadRequest = 0;

                this._aAllOrders = [];

                this._aFilteredOrders = [];

                this._sSearchValue = "";

                this._iCurrentPage = 1;

                this._iPageSize =
                    this._getDefaultPageSize();

                this._loadData(
                    false
                );
            },


            /* =====================================================
               CATÁLOGO DE AÑOS
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
               MODELO ODATA
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
                            "dcz"
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
                            "dcz"
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
                            "dcz"
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

                this._sSearchValue = "";

                this._iCurrentPage = 1;

                var oSearch =
                    this.byId(
                        "dczSearchField"
                    );

                if (oSearch) {
                    oSearch.setValue("");
                }

                this._loadData(
                    true
                );
            },


            /* =====================================================
               CARGA SAP / ODATA
               ===================================================== */

            _loadData: function (
                bNotify
            ) {
                var oViewModel =
                    this.getView()
                        .getModel(
                            "dcz"
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

                Service.getDashboardData(
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

                            this._aAllOrders =
                                Array.isArray(
                                    oMappedData.ordenes
                                )
                                    ? oMappedData
                                        .ordenes
                                        .slice()
                                    : [];

                            this._aFilteredOrders =
                                this._aAllOrders
                                    .slice();

                            oViewModel.setProperty(
                                "/ordenes",
                                this._aAllOrders
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

                            this._iCurrentPage =
                                1;

                            this._renderPage();

                            if (bNotify) {
                                MessageToast.show(
                                    "Detalle de capacidad actualizado con datos de SAP"
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

                            this._aAllOrders =
                                [];

                            this._aFilteredOrders =
                                [];

                            oViewModel.setProperty(
                                "/ordenes",
                                []
                            );

                            oViewModel.setProperty(
                                "/ordenesPaginadas",
                                []
                            );

                            this._iCurrentPage =
                                1;

                            this._renderPage();

                            MessageToast.show(
                                oError &&
                                oError.message
                                    ? oError.message
                                    : "Error al extraer datos de SAP"
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
               BÚSQUEDA
               ===================================================== */

            onBuscarOrden: function (
                oEvent
            ) {
                var sValue =
                    oEvent.getParameter(
                        "newValue"
                    );

                if (
                    sValue ===
                    undefined
                ) {
                    sValue =
                        oEvent.getParameter(
                            "query"
                        ) || "";
                }

                this._sSearchValue =
                    String(
                        sValue || ""
                    ).trim();

                var sNormalized =
                    this._normalize(
                        this._sSearchValue
                    );

                if (!sNormalized) {
                    this._aFilteredOrders =
                        this._aAllOrders
                            .slice();
                } else {
                    this._aFilteredOrders =
                        this._aAllOrders
                            .filter(
                                function (
                                    oOrder
                                ) {
                                    var aValues = [
                                        oOrder.ot,
                                        oOrder.cliente,
                                        oOrder.elevador,
                                        oOrder.tipoOrden,
                                        oOrder.responsable,
                                        oOrder.turno,
                                        oOrder.horasPlan,
                                        oOrder.horasReales,
                                        oOrder.variacionH,
                                        oOrder.variacionPct,
                                        oOrder.estado
                                    ];

                                    return aValues
                                        .some(
                                            function (
                                                vValue
                                            ) {
                                                return (
                                                    this._normalize(
                                                        vValue
                                                    )
                                                        .indexOf(
                                                            sNormalized
                                                        ) >=
                                                    0
                                                );
                                            }.bind(
                                                this
                                            )
                                        );
                                }.bind(
                                    this
                                )
                            );
                }

                this._iCurrentPage =
                    1;

                this._renderPage();
            },


            /* =====================================================
               PAGINACIÓN
               ===================================================== */

            _getDefaultPageSize:
                function () {

                    var iHeight =
                        window.innerHeight ||
                        768;

                    if (
                        iHeight <=
                        720
                    ) {
                        return 5;
                    }

                    if (
                        iHeight <=
                        850
                    ) {
                        return 6;
                    }

                    return 8;
                },


            _renderPage: function () {
                var oModel =
                    this.getView()
                        .getModel(
                            "dcz"
                        );

                var aRows =
                    this._aFilteredOrders ||
                    [];

                var iTotal =
                    aRows.length;

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
                            1,
                            this._iCurrentPage
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
                    aRows.slice(
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
                            iPage >
                            1,

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


            onPaginaAnterior:
                function () {

                    if (
                        this._iCurrentPage <=
                        1
                    ) {
                        return;
                    }

                    this._iCurrentPage -=
                        1;

                    this._renderPage();
                },


            onPaginaSiguiente:
                function () {

                    var oPagination =
                        this.getView()
                            .getModel(
                                "dcz"
                            )
                            .getProperty(
                                "/pagination"
                            ) || {};

                    var iTotalPages =
                        Number(
                            oPagination
                                .totalPages
                        ) ||
                        1;

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


            /* =====================================================
               NAVEGACIÓN
               ===================================================== */

            onVolverHoras: function () {
                var oRouter =
                    this
                        .getOwnerComponent()
                        .getRouter();

                if (
                    oRouter.getRoute(
                        "RouteHorasTrabajadas"
                    )
                ) {
                    oRouter.navTo(
                        "RouteHorasTrabajadas"
                    );

                    return;
                }

                MessageToast.show(
                    "Ruta de horas trabajadas no encontrada."
                );
            },


            /* =====================================================
               UTILIDADES
               ===================================================== */

            _normalize: function (
                vValue
            ) {
                var sText =
                    String(
                        vValue === null ||
                        vValue ===
                        undefined
                            ? ""
                            : vValue
                    ).toLowerCase();

                return sText.normalize
                    ? sText
                        .normalize(
                            "NFD"
                        )
                        .replace(
                            /[\u0300-\u036f]/g,
                            ""
                        )
                    : sText;
            },


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