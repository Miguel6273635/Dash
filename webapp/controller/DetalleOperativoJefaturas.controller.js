sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "mantenimiento/model/DetalleOperativoJefaturasService",
    "mantenimiento/model/DetalleOperativoJefaturasMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    DetalleOperativoJefaturasService,
    DetalleOperativoJefaturasMapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleOperativoJefaturas",
        {
            onInit: function () {
                this._iRequest =
                    0;

                this._iPageSize =
                    6;

                this._oRawData =
                    null;

                this._aAllRows =
                    [];

                this._oTotalRow =
                    null;

                this._oDashboardModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                this._oDashboardModel
                    .setDefaultBindingMode(
                        "TwoWay"
                    );

                this._oDashboardModel
                    .setSizeLimit(
                        5000
                    );

                this.getView()
                    .setModel(
                        this._oDashboardModel
                    );

                this._loadBase(
                    false
                );

                this._startAutoRefresh();
            },

            onExit: function () {
                if (
                    this._iRefreshTimer
                ) {
                    window.clearInterval(
                        this._iRefreshTimer
                    );

                    this._iRefreshTimer =
                        null;
                }
            },

            /* ==================================================
             * ODATA
             * ================================================== */

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
                    this._oDashboardModel
                        .getProperty(
                            "/filters"
                        ) || {}
                );
            },

            /* ==================================================
             * PERIODO
             * ================================================== */

            onPeriodChange: function (
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
                    )
                ) {
                    return;
                }

                this._oDashboardModel
                    .setProperty(
                        "/filters/period",
                        String(
                            iYear
                        )
                    );

                this._oDashboardModel
                    .setProperty(
                        "/filters/dateFrom",
                        "01/01/" +
                        iYear
                    );

                this._oDashboardModel
                    .setProperty(
                        "/filters/dateTo",
                        "31/12/" +
                        iYear
                    );

                this._markDirty();
            },

            onDateChange: function () {
                var sFrom =
                    this._oDashboardModel
                        .getProperty(
                            "/filters/dateFrom"
                        ) || "";

                var sTo =
                    this._oDashboardModel
                        .getProperty(
                            "/filters/dateTo"
                        ) || "";

                var aFrom =
                    sFrom.match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                var aTo =
                    sTo.match(
                        /^(\d{2})\/(\d{2})\/(\d{4})$/
                    );

                /*
                 * Las fechas NO se modifican.
                 * Sólo sincronizamos el Select año.
                 */
                if (
                    aFrom &&
                    aTo &&
                    aFrom[3] ===
                        aTo[3]
                ) {
                    this._oDashboardModel
                        .setProperty(
                            "/filters/period",
                            aFrom[3]
                        );
                }

                this._markDirty();
            },

            /* ==================================================
             * GERENCIA → JEFATURA
             * ================================================== */

            onManagementChange: function () {
                var sManagement =
                    this._oDashboardModel
                        .getProperty(
                            "/filters/management"
                        );

                var aAll =
                    this._oDashboardModel
                        .getProperty(
                            "/catalogs/headshipsAll"
                        ) || [];

                var aFiltered =
                    aAll.filter(
                        function (
                            oItem,
                            iIndex
                        ) {
                            if (
                                iIndex === 0 ||
                                !sManagement ||
                                sManagement ===
                                    "ALL"
                            ) {
                                return true;
                            }

                            return (
                                !oItem.parentKey ||
                                oItem.parentKey ===
                                    sManagement
                            );
                        }
                    );

                this._oDashboardModel
                    .setProperty(
                        "/catalogs/headships",
                        aFiltered
                    );

                this._oDashboardModel
                    .setProperty(
                        "/filters/headship",
                        "ALL"
                    );

                this._markDirty();
            },

            onFilterChange: function () {
                this._markDirty();
            },

            _markDirty: function () {
                this._oDashboardModel
                    .setProperty(
                        "/filters/dirty",
                        true
                    );
            },

            /* ==================================================
             * APLICAR
             * ================================================== */

            onApplyFilters: function () {
                this._oDashboardModel
                    .setProperty(
                        "/pagination/currentPage",
                        1
                    );

                this._loadBase(
                    true
                );
            },

            /* ==================================================
             * FASE 1
             * ================================================== */

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
                    console.error(
                        "[DOJ CONTROLLER] No existe dashboardOData"
                    );

                    return;
                }

                this._oDashboardModel
                    .setProperty(
                        "/busy",
                        true
                    );

                this._oDashboardModel
                    .setProperty(
                        "/operationalBusy",
                        false
                    );

                DetalleOperativoJefaturasService
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
                                DetalleOperativoJefaturasMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._applyMappedData(
                                oMapped
                            );

                            this._oDashboardModel
                                .setProperty(
                                    "/filters/dirty",
                                    false
                                );

                            this._oDashboardModel
                                .setProperty(
                                    "/busy",
                                    false
                                );

                            if (bNotify) {
                                MessageToast.show(
                                    "Filtros aplicados"
                                );
                            }

                            /*
                             * MUY IMPORTANTE:
                             *
                             * Si ABAP aún no llena Jefatura,
                             * NO hacemos cientos de llamadas
                             * a Operations/OrderResources.
                             */
                            if (
                                !oMapped.meta
                                    .canLoadOperationalDetails
                            ) {
                                console.log(
                                    "[DOJ CONTROLLER] Jerarquía de Jefatura aún no disponible. Se omite carga detalle."
                                );

                                return;
                            }

                            aOrderIds =
                                DetalleOperativoJefaturasService
                                    .getOrderIdsForDetails(
                                        this._oRawData
                                            .orders ||
                                            [],

                                        oFilters
                                    );

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
                                "[DOJ CONTROLLER] Base:",
                                oError
                            );

                            if (
                                iRequest ===
                                this._iRequest
                            ) {
                                this._oDashboardModel
                                    .setProperty(
                                        "/busy",
                                        false
                                    );
                            }
                        }.bind(this)
                    );
            },

            /* ==================================================
             * FASE 2
             * ================================================== */

            _loadOperational: function (
                iRequest,
                oFilters,
                aOrderIds
            ) {
                var oODataModel =
                    this._getODataModel();

                if (
                    !aOrderIds ||
                    !aOrderIds.length
                ) {
                    return;
                }

                this._oDashboardModel
                    .setProperty(
                        "/operationalBusy",
                        true
                    );

                DetalleOperativoJefaturasService
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

                            this._oRawData
                                .orderResources =
                                oOperational
                                    .orderResources ||
                                [];

                            this._oRawData
                                .operations =
                                oOperational
                                    .operations ||
                                [];

                            oMapped =
                                DetalleOperativoJefaturasMapper
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
                                "[DOJ CONTROLLER] Operacional:",
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
                                this._oDashboardModel
                                    .setProperty(
                                        "/operationalBusy",
                                        false
                                    );
                            }
                        }.bind(this)
                    );
            },

            /* ==================================================
             * MAPPER
             * ================================================== */

            _applyMappedData: function (
                oMapped
            ) {
                this._oDashboardModel
                    .setProperty(
                        "/catalogs",
                        oMapped.catalogs
                    );

                this._oDashboardModel
                    .setProperty(
                        "/kpis",
                        oMapped.kpis
                    );

                this._oDashboardModel
                    .setProperty(
                        "/meta",
                        oMapped.meta
                    );

                this._aAllRows =
                    oMapped.headshipRows ||
                    [];

                this._oTotalRow =
                    oMapped.totalRow ||
                    null;

                this._applyPagination();
            },

            /* ==================================================
             * PAGINACIÓN
             * ================================================== */

            _applyPagination: function () {
                var iTotal =
                    this._aAllRows.length;

                var iTotalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            iTotal /
                            this._iPageSize
                        )
                    );

                var iCurrentPage =
                    Number(
                        this._oDashboardModel
                            .getProperty(
                                "/pagination/currentPage"
                            )
                    ) || 1;

                if (
                    iCurrentPage >
                    iTotalPages
                ) {
                    iCurrentPage =
                        iTotalPages;
                }

                if (
                    iCurrentPage < 1
                ) {
                    iCurrentPage =
                        1;
                }

                var iStart =
                    (
                        iCurrentPage -
                        1
                    ) *
                    this._iPageSize;

                var iEnd =
                    Math.min(
                        iStart +
                        this._iPageSize,
                        iTotal
                    );

                var aPageRows =
                    this._aAllRows.slice(
                        iStart,
                        iEnd
                    );

                /*
                 * Total general siempre al final.
                 */
                if (
                    this._oTotalRow
                ) {
                    aPageRows.push(
                        this._oTotalRow
                    );
                }

                var sSummary =
                    iTotal > 0
                        ? (
                            (
                                iStart +
                                1
                            ) +
                            " - " +
                            iEnd +
                            " de " +
                            iTotal
                        )
                        : "0 - 0 de 0";

                this._oDashboardModel
                    .setProperty(
                        "/rows",
                        aPageRows
                    );

                this._oDashboardModel
                    .setProperty(
                        "/pagination/currentPage",
                        iCurrentPage
                    );

                this._oDashboardModel
                    .setProperty(
                        "/pagination/totalPages",
                        iTotalPages
                    );

                this._oDashboardModel
                    .setProperty(
                        "/pagination/totalRecords",
                        iTotal
                    );

                this._oDashboardModel
                    .setProperty(
                        "/pagination/summary",
                        sSummary
                    );

                this._oDashboardModel
                    .setProperty(
                        "/pagination/hasPrev",
                        iCurrentPage >
                            1
                    );

                this._oDashboardModel
                    .setProperty(
                        "/pagination/hasNext",
                        iCurrentPage <
                            iTotalPages
                    );
            },

            onFirstPage: function () {
                this._oDashboardModel
                    .setProperty(
                        "/pagination/currentPage",
                        1
                    );

                this._applyPagination();
            },

            onPreviousPage: function () {
                var iCurrent =
                    Number(
                        this._oDashboardModel
                            .getProperty(
                                "/pagination/currentPage"
                            )
                    ) || 1;

                this._oDashboardModel
                    .setProperty(
                        "/pagination/currentPage",
                        Math.max(
                            1,
                            iCurrent - 1
                        )
                    );

                this._applyPagination();
            },

            onNextPage: function () {
                var iCurrent =
                    Number(
                        this._oDashboardModel
                            .getProperty(
                                "/pagination/currentPage"
                            )
                    ) || 1;

                var iTotalPages =
                    Number(
                        this._oDashboardModel
                            .getProperty(
                                "/pagination/totalPages"
                            )
                    ) || 1;

                this._oDashboardModel
                    .setProperty(
                        "/pagination/currentPage",
                        Math.min(
                            iTotalPages,
                            iCurrent + 1
                        )
                    );

                this._applyPagination();
            },

            onLastPage: function () {
                var iTotalPages =
                    Number(
                        this._oDashboardModel
                            .getProperty(
                                "/pagination/totalPages"
                            )
                    ) || 1;

                this._oDashboardModel
                    .setProperty(
                        "/pagination/currentPage",
                        iTotalPages
                    );

                this._applyPagination();
            },

            /* ==================================================
             * REFRESCO 15 MIN
             * ================================================== */

            _startAutoRefresh: function () {
                var iRefreshMilliseconds =
                    15 *
                    60 *
                    1000;

                this._iRefreshTimer =
                    window.setInterval(
                        function () {
                            var bBusy =
                                Boolean(
                                    this._oDashboardModel
                                        .getProperty(
                                            "/busy"
                                        )
                                );

                            var bOperationalBusy =
                                Boolean(
                                    this._oDashboardModel
                                        .getProperty(
                                            "/operationalBusy"
                                        )
                                );

                            if (
                                !bBusy &&
                                !bOperationalBusy
                            ) {
                                this._loadBase(
                                    false
                                );
                            }
                        }.bind(this),

                        iRefreshMilliseconds
                    );
            },

            /* ==================================================
             * TOTAL ROW
             * ================================================== */

            onTableUpdateFinished: function () {
                var oTable =
                    this.byId(
                        "jefaturasTable"
                    );

                if (!oTable) {
                    return;
                }

                oTable
                    .getItems()
                    .forEach(
                        function (
                            oItem
                        ) {
                            var oContext =
                                oItem
                                    .getBindingContext();

                            var bIsTotal =
                                false;

                            if (
                                oContext
                            ) {
                                bIsTotal =
                                    Boolean(
                                        oContext
                                            .getProperty(
                                                "isTotal"
                                            )
                                    );
                            }

                            oItem.toggleStyleClass(
                                "dojTotalRow",
                                bIsTotal
                            );
                        }
                    );
            },

            /* ==================================================
             * NAVEGACIÓN
             * ================================================== */

            onViewJefatura: function (
                oEvent
            ) {
                var oContext =
                    oEvent
                        .getSource()
                        .getBindingContext();

                if (!oContext) {
                    return;
                }

                var oSelected =
                    oContext.getObject();

                if (
                    !oSelected ||
                    oSelected.isTotal
                ) {
                    return;
                }

                var oComponent =
                    this.getOwnerComponent();

                var oRouter =
                    oComponent.getRouter();

                oComponent.setModel(
                    new JSONModel(
                        oSelected
                    ),

                    "selectedJefatura"
                );

                if (
                    oRouter &&
                    oRouter.getRoute(
                        "RouteVistaJefatura"
                    )
                ) {
                    oRouter.navTo(
                        "RouteVistaJefatura"
                    );

                    return;
                }

                MessageToast.show(
                    "Jefatura seleccionada: " +
                    oSelected.jefatura
                );
            },

            onAdaptFilters: function () {
                MessageToast.show(
                    "Los filtros visibles se encuentran preparados para el contexto operativo."
                );
            },

            /* ==================================================
             * MODELO INICIAL
             * ================================================== */

            _getInitialData: function () {
                return {
                    busy:
                        false,

                    operationalBusy:
                        false,

                    filters: {
                        period:
                            "2026",

                        dateFrom:
                            "01/01/2026",

                        dateTo:
                            "31/12/2026",

                        management:
                            "ALL",

                        headship:
                            "ALL",

                        zone:
                            "ALL",

                        shift:
                            "ALL",

                        serviceType:
                            "ALL",

                        resourceType:
                            "ALL",

                        dirty:
                            false
                    },

                    catalogs: {
                        periods: [
                            { key: "2028", text: "2028" },
                            { key: "2027", text: "2027" },
                            { key: "2026", text: "2026" },
                            { key: "2025", text: "2025" },
                            { key: "2024", text: "2024" },
                            { key: "2023", text: "2023" }
                        ],

                        managements: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todas"
                            }
                        ],

                        headshipsAll: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todas",

                                parentKey:
                                    ""
                            }
                        ],

                        headships: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todas",

                                parentKey:
                                    ""
                            }
                        ],

                        zones: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todas"
                            }
                        ],

                        shifts: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos"
                            }
                        ],

                        serviceTypes: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos"
                            }
                        ],

                        resourceTypes: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos"
                            }
                        ]
                    },

                    kpis: {
                        activeHeadships: {
                            value:
                                "Sin datos",

                            description:
                                "Total jefaturas"
                        },

                        totalResources: {
                            value:
                                "Sin datos",

                            description:
                                "Mecánicos y ayudantes"
                        },

                        availableCapacity: {
                            value:
                                "Sin datos",

                            description:
                                "Total disponible"
                        },

                        scheduledLoad: {
                            value:
                                "Sin datos",

                            description:
                                "Total programada"
                        },

                        averageUtilization: {
                            value:
                                "Sin datos",

                            description:
                                "Sin datos suficientes"
                        },

                        operationalCompliance: {
                            value:
                                "Sin datos",

                            description:
                                "Sin datos suficientes"
                        }
                    },

                    rows:
                        [],

                    pagination: {
                        currentPage:
                            1,

                        totalPages:
                            1,

                        totalRecords:
                            0,

                        summary:
                            "0 - 0 de 0",

                        hasPrev:
                            false,

                        hasNext:
                            false
                    },

                    meta:
                        {}
                };
            }
        }
    );
});