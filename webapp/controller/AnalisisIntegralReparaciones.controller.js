sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/AnalisisIntegralReparacionesService"
], function (
    Controller,
    JSONModel,
    MessageToast,
    AnalisisIntegralReparacionesService
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisIntegralReparaciones",
        {
            onInit: function () {
                var oInitialData =
                    AnalisisIntegralReparacionesService.createEmpty(
                        this._getDefaultFilters(),
                        "PLANNED"
                    );

                var oModel = new JSONModel(oInitialData);

                this._iLoadRequest = 0;
                this._oRawData = null;

                this._mExpandedMaterials = {};
                this._mMaterialPages = {};

                /*
                 * Máximo de OT visibles por página
                 */
                this._iDetailPageSize = 5;

                oModel.setSizeLimit(5000);

                this.getView().setModel(
                    oModel,
                    "intRep"
                );

                this._loadData(false);
            },

            /* ==========================================================
               FILTROS
               ========================================================== */

            onAplicarFiltros: function () {
                var sValidationError =
                    this._validateDateRange();

                if (sValidationError) {
                    this.getView()
                        .getModel("intRep")
                        .setProperty(
                            "/ui/errorMessage",
                            sValidationError
                        );

                    MessageToast.show(
                        sValidationError
                    );

                    return;
                }

                this._loadData(true);
            },

            onPeriodoChange: function (oEvent) {
                var oModel =
                    this.getView()
                        .getModel("intRep");

                var sPeriod =
                    oEvent.getSource()
                        .getSelectedKey();

                var aMatch =
                    String(
                        sPeriod || ""
                    ).match(/(\d{4})$/);

                var sYear;

                if (!aMatch) {
                    return;
                }

                sYear = aMatch[1];

                oModel.setProperty(
                    "/filters/periodo",
                    "ANUAL_" + sYear
                );

                oModel.setProperty(
                    "/filters/fechaDesde",
                    "01/01/" + sYear
                );

                oModel.setProperty(
                    "/filters/fechaHasta",
                    "31/12/" + sYear
                );
            },

            _validateDateRange: function () {
                var oStartDate =
                    this.byId(
                        "dpDesdeIntegral"
                    ).getDateValue();

                var oEndDate =
                    this.byId(
                        "dpHastaIntegral"
                    ).getDateValue();

                if (
                    !oStartDate ||
                    !oEndDate
                ) {
                    return "Selecciona una fecha desde y una fecha hasta válidas.";
                }

                if (
                    oStartDate.getTime() >
                    oEndDate.getTime()
                ) {
                    return "La fecha desde no puede ser posterior a la fecha hasta.";
                }

                return "";
            },

            /* ==========================================================
               BUSCADOR
               ========================================================== */

            onBuscarMaterial: function (oEvent) {
                var sQuery =
                    oEvent.getParameter("newValue") ||
                    oEvent.getParameter("query") ||
                    "";

                var oModel =
                    this.getView()
                        .getModel("intRep");

                oModel.setProperty(
                    "/filters/busquedaMaterial",
                    sQuery.trim()
                );

                if (this._oRawData) {
                    this._rebuildFromRawData();
                }
            },

            /* ==========================================================
               EXPANDIR MATERIAL
               ========================================================== */

            onToggleMaterial: function (oEvent) {
                var oContext =
                    oEvent.getSource()
                        .getBindingContext("intRep");

                var oModel =
                    this.getView()
                        .getModel("intRep");

                var sPath;
                var bExpanded;
                var sMaterialId;

                if (!oContext) {
                    return;
                }

                sPath =
                    oContext.getPath();

                bExpanded =
                    !Boolean(
                        oModel.getProperty(
                            sPath + "/expanded"
                        )
                    );

                sMaterialId =
                    String(
                        oModel.getProperty(
                            sPath + "/materialId"
                        ) ||
                        oModel.getProperty(
                            sPath + "/material"
                        ) ||
                        ""
                    );

                oModel.setProperty(
                    sPath + "/expanded",
                    bExpanded
                );

                oModel.setProperty(
                    sPath + "/chevronIcon",
                    bExpanded
                        ? "sap-icon://navigation-down-arrow"
                        : "sap-icon://navigation-right-arrow"
                );

                if (sMaterialId) {
                    this._mExpandedMaterials[
                        sMaterialId
                    ] = bExpanded;
                }
            },

            /* ==========================================================
               SELECTOR DE ANÁLISIS
               ========================================================== */

            onVerPlaneadas: function () {
                this._setAnalysis(
                    "PLANNED"
                );
            },

            onVerEjecutadas: function () {
                this._setAnalysis(
                    "EXECUTED"
                );
            },

            onVerNoEjecutadas: function () {
                this._setAnalysis(
                    "NON_EXECUTED"
                );
            },

            _setAnalysis: function (sAnalysis) {
                var oModel =
                    this.getView()
                        .getModel("intRep");

                oModel.setProperty(
                    "/ui/selectedAnalysis",
                    sAnalysis
                );

                /*
                 * Al cambiar el tipo de análisis,
                 * regresamos cada detalle a página 1.
                 */
                this._mMaterialPages = {};

                if (this._oRawData) {
                    this._rebuildFromRawData(
                        sAnalysis
                    );
                }
            },

            /* ==========================================================
               PAGINACIÓN
               ========================================================== */

            onPaginaAnteriorMaterial: function (oEvent) {
                this._cambiarPaginaMaterial(
                    oEvent,
                    -1
                );
            },

            onPaginaSiguienteMaterial: function (oEvent) {
                this._cambiarPaginaMaterial(
                    oEvent,
                    1
                );
            },

            _cambiarPaginaMaterial: function (
                oEvent,
                iDireccion
            ) {
                var oContext =
                    oEvent.getSource()
                        .getBindingContext("intRep");

                var oModel =
                    this.getView()
                        .getModel("intRep");

                var sPath;
                var oMaterial;

                var aOrdenes;

                var iPageSize;
                var iPaginaActual;
                var iTotalPaginas;
                var iNuevaPagina;

                var iInicio;
                var iFin;

                var sMaterialId;

                if (!oContext) {
                    return;
                }

                sPath =
                    oContext.getPath();

                oMaterial =
                    oModel.getProperty(
                        sPath
                    );

                if (!oMaterial) {
                    return;
                }

                aOrdenes =
                    Array.isArray(
                        oMaterial.ordenes
                    )
                        ? oMaterial.ordenes
                        : [];

                iPageSize =
                    Number(
                        oMaterial.pageSize
                    ) ||
                    this._iDetailPageSize ||
                    5;

                iPaginaActual =
                    Number(
                        oMaterial.paginaActual
                    ) || 1;

                iTotalPaginas =
                    Math.max(
                        1,
                        Math.ceil(
                            aOrdenes.length /
                            iPageSize
                        )
                    );

                iNuevaPagina =
                    iPaginaActual +
                    iDireccion;

                iNuevaPagina =
                    Math.max(
                        1,
                        Math.min(
                            iNuevaPagina,
                            iTotalPaginas
                        )
                    );

                if (
                    iNuevaPagina ===
                    iPaginaActual
                ) {
                    return;
                }

                iInicio =
                    (
                        iNuevaPagina - 1
                    ) *
                    iPageSize;

                iFin =
                    Math.min(
                        iInicio +
                        iPageSize,
                        aOrdenes.length
                    );

                oModel.setProperty(
                    sPath +
                    "/paginaActual",
                    iNuevaPagina
                );

                oModel.setProperty(
                    sPath +
                    "/totalPaginas",
                    iTotalPaginas
                );

                oModel.setProperty(
                    sPath +
                    "/ordenesPagina",
                    aOrdenes.slice(
                        iInicio,
                        iFin
                    )
                );

                oModel.setProperty(
                    sPath +
                    "/tieneAnterior",
                    iNuevaPagina > 1
                );

                oModel.setProperty(
                    sPath +
                    "/tieneSiguiente",
                    iNuevaPagina <
                    iTotalPaginas
                );

                oModel.setProperty(
                    sPath +
                    "/paginaTexto",
                    "Página " +
                    iNuevaPagina +
                    " de " +
                    iTotalPaginas
                );

                oModel.setProperty(
                    sPath +
                    "/rangoTexto",
                    aOrdenes.length
                        ? "Mostrando " +
                          (
                              iInicio + 1
                          ) +
                          " - " +
                          iFin +
                          " de " +
                          aOrdenes.length
                        : "Sin órdenes"
                );

                sMaterialId =
                    String(
                        oMaterial.materialId ||
                        oMaterial.material ||
                        ""
                    );

                if (sMaterialId) {
                    this._mMaterialPages[
                        sMaterialId
                    ] = iNuevaPagina;
                }
            },

            _prepareMaterialPagination: function (
                oMaterial
            ) {
                var aOrdenes =
                    Array.isArray(
                        oMaterial.ordenes
                    )
                        ? oMaterial.ordenes
                        : [];

                var iPageSize =
                    this._iDetailPageSize ||
                    5;

                var iTotal =
                    aOrdenes.length;

                var iTotalPaginas =
                    Math.max(
                        1,
                        Math.ceil(
                            iTotal /
                            iPageSize
                        )
                    );

                var sMaterialId =
                    String(
                        oMaterial.materialId ||
                        oMaterial.material ||
                        ""
                    );

                var iPaginaActual =
                    Number(
                        this._mMaterialPages[
                            sMaterialId
                        ]
                    ) || 1;

                var iInicio;
                var iFin;

                iPaginaActual =
                    Math.max(
                        1,
                        Math.min(
                            iPaginaActual,
                            iTotalPaginas
                        )
                    );

                iInicio =
                    (
                        iPaginaActual - 1
                    ) *
                    iPageSize;

                iFin =
                    Math.min(
                        iInicio +
                        iPageSize,
                        iTotal
                    );

                oMaterial.pageSize =
                    iPageSize;

                oMaterial.paginaActual =
                    iPaginaActual;

                oMaterial.totalPaginas =
                    iTotalPaginas;

                oMaterial.ordenesPagina =
                    aOrdenes.slice(
                        iInicio,
                        iFin
                    );

                oMaterial.tieneAnterior =
                    iPaginaActual > 1;

                oMaterial.tieneSiguiente =
                    iPaginaActual <
                    iTotalPaginas;

                oMaterial.paginaTexto =
                    "Página " +
                    iPaginaActual +
                    " de " +
                    iTotalPaginas;

                oMaterial.rangoTexto =
                    iTotal
                        ? "Mostrando " +
                          (
                              iInicio + 1
                          ) +
                          " - " +
                          iFin +
                          " de " +
                          iTotal
                        : "Sin órdenes";

                if (sMaterialId) {
                    this._mMaterialPages[
                        sMaterialId
                    ] = iPaginaActual;
                }
            },

            /* ==========================================================
               CARGA DE DATOS
               ========================================================== */

            _loadData: function (bNotify) {
                var oODataModel =
                    this._getODataModel();

                var mFilters =
                    this._getFilters();

                var sAnalysis =
                    this.getView()
                        .getModel("intRep")
                        .getProperty(
                            "/ui/selectedAnalysis"
                        ) ||
                    "PLANNED";

                var iRequest =
                    ++this._iLoadRequest;

                if (bNotify) {
                    this._mExpandedMaterials = {};
                    this._mMaterialPages = {};
                }

                this.getView()
                    .getModel("intRep")
                    .setProperty(
                        "/ui/errorMessage",
                        ""
                    );

                this.getView()
                    .setBusy(true);

                AnalisisIntegralReparacionesService
                    .load(
                        oODataModel,
                        mFilters,
                        sAnalysis
                    )
                    .then(
                        function (oResult) {
                            if (
                                iRequest !==
                                this._iLoadRequest
                            ) {
                                return;
                            }

                            this._oRawData =
                                oResult.rawData;

                            this._applyData(
                                oResult.data
                            );

                            this.getView()
                                .setBusy(false);

                            this._observeBackgroundPromise(
                                oResult.detailsPromise,
                                iRequest
                            );

                            this._observeBackgroundPromise(
                                oResult.enrichmentPromise,
                                iRequest
                            );

                            if (bNotify) {
                                MessageToast.show(
                                    "Órdenes SM01 actualizadas desde SAP"
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

                            this.getView()
                                .setBusy(false);

                            this._onLoadError(
                                oError,
                                bNotify
                            );
                        }.bind(this)
                    );
            },

            _observeBackgroundPromise: function (
                oPromise,
                iRequest
            ) {
                if (
                    !oPromise ||
                    typeof oPromise.then !==
                    "function"
                ) {
                    return;
                }

                oPromise
                    .then(
                        function (oRawData) {
                            if (
                                iRequest !==
                                this._iLoadRequest
                            ) {
                                return;
                            }

                            this._oRawData =
                                oRawData;

                            this._rebuildFromRawData();
                        }.bind(this)
                    )
                    .catch(
                        function (oError) {
                            if (
                                iRequest ===
                                this._iLoadRequest
                            ) {
                                this.getView()
                                    .getModel("intRep")
                                    .setProperty(
                                        "/ui/errorMessage",
                                        oError &&
                                        oError.message ||
                                        "No fue posible completar la consulta de SAP"
                                    );
                            }
                        }.bind(this)
                    );
            },

            _rebuildFromRawData: function (
                sAnalysis
            ) {
                var oModel =
                    this.getView()
                        .getModel("intRep");

                var sSelectedAnalysis =
                    sAnalysis ||
                    oModel.getProperty(
                        "/ui/selectedAnalysis"
                    ) ||
                    "PLANNED";

                var oData;

                if (!this._oRawData) {
                    return;
                }

                this._rememberExpandedMaterials();

                oData =
                    AnalisisIntegralReparacionesService.build(
                        this._oRawData,
                        this._getFilters(),
                        sSelectedAnalysis
                    );

                this._applyData(
                    oData
                );
            },

            /* ==========================================================
               APLICAR DATOS
               ========================================================== */

            _applyData: function (oData) {
                var oModel =
                    this.getView()
                        .getModel("intRep");

                var sWarning;

                (
                    oData.materiales ||
                    []
                ).forEach(
                    function (oMaterial) {
                        var sMaterialId =
                            String(
                                oMaterial.materialId ||
                                oMaterial.material ||
                                ""
                            );

                        if (
                            Object.prototype
                                .hasOwnProperty.call(
                                    this._mExpandedMaterials,
                                    sMaterialId
                                )
                        ) {
                            oMaterial.expanded =
                                this._mExpandedMaterials[
                                    sMaterialId
                                ];

                            oMaterial.chevronIcon =
                                oMaterial.expanded
                                    ? "sap-icon://navigation-down-arrow"
                                    : "sap-icon://navigation-right-arrow";
                        }

                        this._prepareMaterialPagination(
                            oMaterial
                        );
                    }.bind(this)
                );

                oModel.setData(
                    oData
                );

                sWarning =
                    this._getCriticalWarning(
                        oData
                    );

                oModel.setProperty(
                    "/ui/errorMessage",
                    sWarning
                );
            },

            /* ==========================================================
               ADVERTENCIAS
               ========================================================== */

            _getCriticalWarning: function (oData) {
                var oMeta =
                    oData.meta || {};

                var aUnavailable =
                    oMeta.unavailableEntitySets ||
                    [];

                var oDiagnostics =
                    oMeta.eventDiagnostics;

                var iUnclassified =
                    oData.kpis &&
                    oData.kpis.sinClasificar;

                if (aUnavailable.length) {
                    return aUnavailable
                        .map(
                            function (oItem) {
                                return (
                                    oItem.entitySet +
                                    ": " +
                                    oItem.message
                                );
                            }
                        )
                        .join(" | ");
                }

                if (
                    !oData.ui ||
                    !oData.ui.detailsLoaded ||
                    !oDiagnostics
                ) {
                    return "";
                }

                if (
                    oDiagnostics
                        .eventosRecibidos === 0
                ) {
                    return (
                        "SAP no devolvió registros en DashboardOrderEventsSet; " +
                        "no es posible calcular ejecutadas y no ejecutadas."
                    );
                }

                if (
                    oDiagnostics
                        .eventosRelacionadosConSm01 === 0
                ) {
                    return (
                        "SAP devolvió eventos, pero ninguno corresponde " +
                        "a los OrderId SM01 del periodo."
                    );
                }

                if (
                    Number(
                        iUnclassified
                    ) > 0
                ) {
                    return (
                        iUnclassified +
                        " órdenes SM01 no tienen un estado E0013, E0014 o E0015 reconocido."
                    );
                }

                return "";
            },

            /* ==========================================================
               CONSERVAR EXPANSIÓN Y PÁGINA
               ========================================================== */

            _rememberExpandedMaterials: function () {
                var aMaterials =
                    this.getView()
                        .getModel("intRep")
                        .getProperty(
                            "/materiales"
                        ) || [];

                aMaterials.forEach(
                    function (oMaterial) {
                        var sMaterialId =
                            String(
                                oMaterial.materialId ||
                                oMaterial.material ||
                                ""
                            );

                        if (sMaterialId) {
                            this._mExpandedMaterials[
                                sMaterialId
                            ] =
                                Boolean(
                                    oMaterial.expanded
                                );

                            this._mMaterialPages[
                                sMaterialId
                            ] =
                                Number(
                                    oMaterial.paginaActual
                                ) || 1;
                        }
                    }.bind(this)
                );
            },

            /* ==========================================================
               ERRORES
               ========================================================== */

            _onLoadError: function (
                oError,
                bNotify
            ) {
                var sMessage =
                    oError &&
                    oError.message ||
                    "No fue posible consultar SAP";

                var oModel =
                    this.getView()
                        .getModel("intRep");

                if (!this._oRawData) {
                    this._applyData(
                        AnalisisIntegralReparacionesService
                            .createEmpty(
                                this._getFilters(),
                                oModel.getProperty(
                                    "/ui/selectedAnalysis"
                                ) ||
                                "PLANNED"
                            )
                    );
                }

                oModel.setProperty(
                    "/ui/errorMessage",
                    sMessage
                );

                if (bNotify) {
                    MessageToast.show(
                        sMessage
                    );
                }
            },

            /* ==========================================================
               ODATA
               ========================================================== */

            _getODataModel: function () {
                var oComponent =
                    this.getOwnerComponent &&
                    this.getOwnerComponent();

                return (
                    oComponent &&
                    oComponent.getModel(
                        "dashboardOData"
                    )
                ) ||
                this.getView()
                    .getModel(
                        "dashboardOData"
                    );
            },

            /* ==========================================================
               FILTROS ACTIVOS
               ========================================================== */

            _getFilters: function () {
                var oModel =
                    this.getView() &&
                    this.getView()
                        .getModel("intRep");

                var mFilters =
                    oModel &&
                    oModel.getProperty(
                        "/filters"
                    ) ||
                    this._getDefaultFilters();

                return {
                    periodo:
                        mFilters.periodo ||
                        "ANUAL_2026",

                    fechaDesde:
                        mFilters.fechaDesde ||
                        "01/01/2026",

                    fechaHasta:
                        mFilters.fechaHasta ||
                        "31/12/2026",

                    zona:
                        mFilters.zona ||
                        "TODAS",

                    cliente:
                        mFilters.cliente ||
                        "TODOS",

                    responsable:
                        mFilters.responsable ||
                        "TODOS",

                    busquedaMaterial:
                        mFilters.busquedaMaterial ||
                        ""
                };
            },

            _getDefaultFilters: function () {
                return {
                    periodo:
                        "ANUAL_2026",

                    fechaDesde:
                        "01/01/2026",

                    fechaHasta:
                        "31/12/2026",

                    zona:
                        "TODAS",

                    cliente:
                        "TODOS",

                    responsable:
                        "TODOS",

                    busquedaMaterial:
                        ""
                };
            }
        }
    );
});