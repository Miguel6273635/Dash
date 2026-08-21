sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "mantenimiento/model/DetalleCapacidadZonaService",
    "mantenimiento/model/DetalleCapacidadZonaMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    Filter,
    FilterOperator,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleCapacidadZona",
        {
            onInit: function () {
                var iYear = new Date().getFullYear();

                var oViewModel =
                    new JSONModel({
                        isBusy: false,

                        /*
                         * El año controla inicialmente el rango completo.
                         * Después el usuario puede cambiar fecha desde/hasta
                         * manualmente con los calendarios.
                         */
                        filters: {
                            periodo: String(iYear),

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
                                this._buildYearCatalog(iYear),

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
                            capacidadDisponible: "0.0 h",
                            horasProgramadas: "0.0 h",
                            horasReales: "0.0 h",
                            utilizacion: "0.0%",
                            utilizacionValor: 0,
                            utilizacionWidth: "0%",
                            estado: "Sin datos"
                        },

                        ordenes: [],
                        resumenTurno: [],
                        resumenTipoOrden: [],
                        footerText:
                            "Mostrando 0 resultados"
                    });

                oViewModel.setSizeLimit(5000);

                this.getView().setModel(
                    oViewModel,
                    "dcz"
                );

                this._iLoadRequest = 0;

                /*
                 * En 2026 esto consulta automáticamente:
                 * 01/01/2026 - 31/12/2026
                 */
                this._loadData(false);
            },

            _buildYearCatalog: function (
                iSelectedYear
            ) {
                var iCurrentYear =
                    new Date().getFullYear();

                var iStartYear =
                    Math.min(
                        iCurrentYear - 5,
                        Number(iSelectedYear) - 2
                    );

                var iEndYear =
                    Math.max(
                        iCurrentYear + 1,
                        Number(iSelectedYear) + 2
                    );

                var aYears = [];
                var iYear;

                for (
                    iYear = iEndYear;
                    iYear >= iStartYear;
                    iYear--
                ) {
                    aYears.push({
                        key: String(iYear),
                        text: String(iYear)
                    });
                }

                return aYears;
            },

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

            _getFilters: function () {
                var oModel =
                    this.getView()
                        .getModel("dcz");

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

            _loadData: function (bNotify) {
                var oViewModel =
                    this.getView()
                        .getModel("dcz");

                var oODataModel =
                    this._getODataModel();

                var mFilters =
                    this._getFilters();

                var iRequest =
                    ++this._iLoadRequest;

                console.log(
                    "[CONTROLLER] Iniciando _loadData...",
                    mFilters
                );

                oViewModel.setProperty(
                    "/isBusy",
                    true
                );

                Service.getDashboardData(
                    oODataModel,
                    mFilters
                )
                    .then(
                        function (oRawData) {
                            var oMappedData;

                            if (
                                iRequest !==
                                this._iLoadRequest
                            ) {
                                return;
                            }

                            console.log(
                                "[CONTROLLER] Datos crudos recibidos:",
                                oRawData
                            );

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
                                "/ordenes",
                                oMappedData.ordenes
                            );

                            oViewModel.setProperty(
                                "/resumenTurno",
                                oMappedData.resumenTurno
                            );

                            oViewModel.setProperty(
                                "/resumenTipoOrden",
                                oMappedData.resumenTipoOrden
                            );

                            oViewModel.setProperty(
                                "/footerText",
                                oMappedData.footerText
                            );

                            console.log(
                                "[CONTROLLER] Modelo 'dcz' actualizado correctamente."
                            );

                            if (bNotify) {
                                MessageToast.show(
                                    "Detalle de capacidad actualizado con datos de SAP"
                                );
                            }
                        }.bind(this)
                    )
                    .catch(
                        function (oError) {
                            if (
                                iRequest !==
                                this._iLoadRequest
                            ) {
                                return;
                            }

                            console.error(
                                "[CONTROLLER] Error:",
                                oError
                            );

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
                                oViewModel.setProperty(
                                    "/isBusy",
                                    false
                                );
                            }
                        }.bind(this)
                    );
            },

            /*
             * Selección de AÑO:
             * 2026 -> 01/01/2026 y 31/12/2026.
             * No ejecutamos SAP hasta presionar Aplicar filtros.
             */
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
                        .getModel("dcz");

                if (
                    !Number.isInteger(iYear) ||
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
                    "01/01/" + iYear
                );

                oModel.setProperty(
                    "/filters/fechaHasta",
                    "31/12/" + iYear
                );
            },

            /*
             * Si el usuario cambia manualmente las fechas y ambas
             * pertenecen al mismo año, sincronizamos el combo Año.
             * Si cruza años, conservamos el rango manual.
             */
            onFechaChange: function () {
                var oModel =
                    this.getView()
                        .getModel("dcz");

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
                    aDesde[3] === aHasta[3]
                ) {
                    oModel.setProperty(
                        "/filters/periodo",
                        aDesde[3]
                    );
                }
            },

            onAplicarFiltros: function () {
                console.group(
                    "FILTROS - DETALLE CAPACIDAD POR ZONA"
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
                 * Siempre consulta SAP usando las fechas que están
                 * actualmente en los DatePicker.
                 */
                this._loadData(true);
            },

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

            onBuscarOrden: function (
                oEvent
            ) {
                var sValue =
                    oEvent.getParameter(
                        "newValue"
                    ) || "";

                var oTable =
                    this.byId(
                        "tblOrdenesZona"
                    );

                var oBinding =
                    oTable &&
                    oTable.getBinding(
                        "items"
                    );

                if (!oBinding) {
                    return;
                }

                if (!sValue) {
                    oBinding.filter([]);
                    return;
                }

                oBinding.filter([
                    new Filter({
                        filters: [
                            new Filter(
                                "ot",
                                FilterOperator.Contains,
                                sValue
                            ),

                            new Filter(
                                "cliente",
                                FilterOperator.Contains,
                                sValue
                            ),

                            new Filter(
                                "elevador",
                                FilterOperator.Contains,
                                sValue
                            ),

                            new Filter(
                                "responsable",
                                FilterOperator.Contains,
                                sValue
                            ),

                            new Filter(
                                "tipoOrden",
                                FilterOperator.Contains,
                                sValue
                            )
                        ],
                        and: false
                    })
                ]);
            }
        }
    );
});