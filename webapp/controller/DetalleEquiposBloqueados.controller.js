sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "mantenimiento/model/DetalleEquiposBloqueadosService",
    "mantenimiento/model/DetalleEquiposBloqueadosMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    History,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleEquiposBloqueados",
        {
            onInit: function () {
                this._oModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                this._oModel.setSizeLimit(
                    5000
                );

                this.getView()
                    .setModel(
                        this._oModel,
                        "dashboard"
                    );

                this._aAllRows =
                    [];

                this._iLoadRequest =
                    0;

                this._loadData(
                    false
                );
            },

            _getInitialData:
                function () {
                    return {
                        loading:
                            false,

                        filters: {
                            periodo:
                                "Personalizado",

                            fechaDesde:
                                "2026-01-01",

                            fechaHasta:
                                "2026-12-31",

                            zona:
                                "Todas",

                            cliente:
                                "Todos",

                            estatusBloqueo:
                                "Todos",

                            supervisor:
                                "Todos",

                            responsable:
                                "Todos",

                            busqueda:
                                "",

                            prioridad:
                                "Todas"
                        },

                        catalogos: {
                            zonas: [
                                {
                                    key:
                                        "Todas",
                                    text:
                                        "Todas"
                                }
                            ],

                            clientes: [
                                {
                                    key:
                                        "Todos",
                                    text:
                                        "Todos"
                                }
                            ],

                            estatusBloqueo: [
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

                            responsables: [
                                {
                                    key:
                                        "Todos",
                                    text:
                                        "Todos"
                                }
                            ],

                            prioridades: [
                                {
                                    key:
                                        "Todas",
                                    text:
                                        "Todas"
                                }
                            ]
                        },

                        kpis: {
                            equiposFiltrados:
                                0,

                            criticos:
                                "Sin datos",

                            mayoresTreintaDias:
                                "Sin datos",

                            pendientesAbiertos:
                                "Sin datos"
                        },

                        rows:
                            [],

                        allRows:
                            [],

                        pagination: {
                            currentPage:
                                1,

                            totalPages:
                                1,

                            pageSize:
                                "20",

                            totalRecords:
                                0,

                            rangeText:
                                "Mostrando 0 a 0 de 0 registros"
                        },

                        meta: {
                            sourceMode:
                                "UNKNOWN"
                        }
                    };
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
                    return Object.assign(
                        {},
                        this._oModel
                            .getProperty(
                                "/filters"
                            ) || {}
                    );
                },

            _loadData:
                function (
                    bNotify
                ) {
                    var iRequest =
                        ++this
                            ._iLoadRequest;

                    var oODataModel =
                        this._getODataModel();

                    var oFilters =
                        this._getFilters();

                    this._oModel
                        .setProperty(
                            "/loading",
                            true
                        );

                    console.log(
                        "[DEB CONTROLLER] Filtros:",
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

                                this._aAllRows =
                                    oMapped.rows ||
                                    [];

                                this._oModel
                                    .setProperty(
                                        "/allRows",
                                        this._aAllRows
                                    );

                                this._oModel
                                    .setProperty(
                                        "/kpis",
                                        oMapped.kpis
                                    );

                                this._oModel
                                    .setProperty(
                                        "/catalogos",
                                        oMapped.catalogos
                                    );

                                this._oModel
                                    .setProperty(
                                        "/meta",
                                        oMapped.meta
                                    );

                                console.log(
                                    "[DEB CONTROLLER] Fuente final:",
                                    oMapped.meta.sourceMode
                                );

                                this._resetPagination();

                                if (bNotify) {
                                    MessageToast.show(
                                        oMapped.meta.sourceMode ===
                                            "BLOCKS"
                                            ? "Datos de bloqueos actualizados"
                                            : "Datos temporales de órdenes actualizados"
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
                                    "[DEB CONTROLLER] Error:",
                                    oError
                                );

                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "Error al consultar Detalle de Equipos Bloqueados."
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

            onApplyFilters:
                function () {
                    this._loadData(
                        true
                    );
                },

            onFilterChange:
                function () {
                    /*
                     * Los filtros se ejecutan
                     * con Aplicar filtros.
                     */
                },

            onEquipmentSearch:
                function (
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
                            );
                    }

                    this._oModel
                        .setProperty(
                            "/filters/busqueda",
                            sValue || ""
                        );
                },

            onRemoveOriginChip:
                function () {
                    MessageToast.show(
                        "Filtro de origen eliminado"
                    );
                },

            onRemovePriorityChip:
                function () {
                    this._oModel
                        .setProperty(
                            "/filters/prioridad",
                            "Todas"
                        );

                    this._loadData(
                        false
                    );
                },

            onTableAction:
                function (
                    oEvent
                ) {
                    MessageToast.show(
                        oEvent
                            .getSource()
                            .getTooltip() ||
                        "Acción de tabla"
                    );
                },

            onOpenEquipment:
                function (
                    oEvent
                ) {
                    var oContext =
                        oEvent
                            .getSource()
                            .getBindingContext(
                                "dashboard"
                            );

                    var sEquipment =
                        oContext
                            ? oContext.getProperty(
                                "equipo"
                            )
                            : "";

                    MessageToast.show(
                        "Detalle del equipo " +
                        sEquipment
                    );
                },

            onOpenAffectedOrders:
                function (
                    oEvent
                ) {
                    var oContext =
                        oEvent
                            .getSource()
                            .getBindingContext(
                                "dashboard"
                            );

                    var aOrderIds =
                        oContext
                            ? oContext.getProperty(
                                "orderIds"
                            ) || []
                            : [];

                    if (
                        !aOrderIds.length
                    ) {
                        MessageToast.show(
                            "Sin órdenes relacionadas"
                        );

                        return;
                    }

                    MessageToast.show(
                        "Órdenes: " +
                        aOrderIds.join(
                            ", "
                        )
                    );
                },

            onOpenNextAction:
                function (
                    oEvent
                ) {
                    var oContext =
                        oEvent
                            .getSource()
                            .getBindingContext(
                                "dashboard"
                            );

                    var sNextAction =
                        oContext
                            ? oContext.getProperty(
                                "proximaAccion"
                            )
                            : "";

                    MessageToast.show(
                        sNextAction ||
                        "Sin próxima acción"
                    );
                },

            onBackToBlockedEquipment:
                function () {
                    var sPreviousHash =
                        History
                            .getInstance()
                            .getPreviousHash();

                    if (
                        sPreviousHash !==
                        undefined
                    ) {
                        window.history.go(
                            -1
                        );

                        return;
                    }

                    this.getOwnerComponent()
                        .getRouter()
                        .navTo(
                            "RouteEquiposBloqueados",
                            {},
                            true
                        );
                },

            _resetPagination:
                function () {
                    var iPageSize =
                        parseInt(
                            this._oModel
                                .getProperty(
                                    "/pagination/pageSize"
                                ),
                            10
                        ) ||
                        20;

                    var iTotal =
                        this._aAllRows.length;

                    var iTotalPages =
                        Math.max(
                            1,
                            Math.ceil(
                                iTotal /
                                iPageSize
                            )
                        );

                    this._oModel
                        .setProperty(
                            "/pagination/totalRecords",
                            iTotal
                        );

                    this._oModel
                        .setProperty(
                            "/pagination/totalPages",
                            iTotalPages
                        );

                    this._setCurrentPage(
                        1
                    );
                },

            onPagePress:
                function (
                    oEvent
                ) {
                    this._setCurrentPage(
                        parseInt(
                            oEvent
                                .getSource()
                                .getText(),
                            10
                        )
                    );
                },

            onFirstPage:
                function () {
                    this._setCurrentPage(
                        1
                    );
                },

            onPreviousPage:
                function () {
                    var iCurrent =
                        this._oModel
                            .getProperty(
                                "/pagination/currentPage"
                            );

                    this._setCurrentPage(
                        Math.max(
                            1,
                            iCurrent - 1
                        )
                    );
                },

            onNextPage:
                function () {
                    var iCurrent =
                        this._oModel
                            .getProperty(
                                "/pagination/currentPage"
                            );

                    var iTotalPages =
                        this._oModel
                            .getProperty(
                                "/pagination/totalPages"
                            );

                    this._setCurrentPage(
                        Math.min(
                            iTotalPages,
                            iCurrent + 1
                        )
                    );
                },

            onLastPage:
                function () {
                    this._setCurrentPage(
                        this._oModel
                            .getProperty(
                                "/pagination/totalPages"
                            )
                    );
                },

            onPageSizeChange:
                function (
                    oEvent
                ) {
                    var oSelected =
                        oEvent.getParameter(
                            "selectedItem"
                        );

                    var sKey =
                        oSelected
                            ? oSelected.getKey()
                            : "20";

                    this._oModel
                        .setProperty(
                            "/pagination/pageSize",
                            sKey
                        );

                    this._resetPagination();
                },

            _setCurrentPage:
                function (
                    iPage
                ) {
                    var iPageSize =
                        parseInt(
                            this._oModel
                                .getProperty(
                                    "/pagination/pageSize"
                                ),
                            10
                        ) ||
                        20;

                    var iTotal =
                        this._aAllRows.length;

                    var iTotalPages =
                        Math.max(
                            1,
                            Math.ceil(
                                iTotal /
                                iPageSize
                            )
                        );

                    var iSafePage =
                        Math.max(
                            1,
                            Math.min(
                                iPage || 1,
                                iTotalPages
                            )
                        );

                    var iFrom =
                        iTotal === 0
                            ? 0
                            : (
                                iSafePage - 1
                            ) *
                            iPageSize;

                    var iTo =
                        Math.min(
                            iFrom +
                            iPageSize,
                            iTotal
                        );

                    this._oModel
                        .setProperty(
                            "/rows",
                            this._aAllRows
                                .slice(
                                    iFrom,
                                    iTo
                                )
                        );

                    this._oModel
                        .setProperty(
                            "/pagination/currentPage",
                            iSafePage
                        );

                    this._oModel
                        .setProperty(
                            "/pagination/totalPages",
                            iTotalPages
                        );

                    this._oModel
                        .setProperty(
                            "/pagination/rangeText",
                            "Mostrando " +
                            (
                                iTotal === 0
                                    ? 0
                                    : iFrom + 1
                            ) +
                            " a " +
                            iTo +
                            " de " +
                            iTotal +
                            " registros"
                        );
                }
        }
    );
});