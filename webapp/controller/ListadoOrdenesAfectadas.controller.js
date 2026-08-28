sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/ListadoOrdenesAfectadasService",
    "mantenimiento/model/ListadoOrdenesAfectadasMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    Service,
    Mapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.ListadoOrdenesAfectadas",
        {
            onInit: function () {
                this._iPageSize = 8;

                this._aAllOrders = [];
                this._aFilteredOrders = [];

                var oViewModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                oViewModel.setSizeLimit(
                    5000
                );

                this.getView()
                    .setModel(
                        oViewModel,
                        "view"
                    );

                this._loadData(false);
            },

            _getInitialData:
                function () {
                    return {
                        busy:
                            false,

                        filters: {
                            period:
                                "CURRENT_YEAR",

                            dateFrom:
                                new Date(
                                    2026,
                                    0,
                                    1
                                ),

                            dateTo:
                                new Date(
                                    2026,
                                    11,
                                    31
                                ),

                            zone:
                                "ALL",

                            client:
                                "ALL",

                            orderType:
                                "ALL",

                            orderStatus:
                                "ALL",

                            supervisor:
                                "ALL",

                            blockStatus:
                                "ALL"
                        },

                        catalogs: {
                            periods: [
                                {
                                    key:
                                        "CURRENT_YEAR",

                                    text:
                                        "Año actual"
                                },
                                {
                                    key:
                                        "CURRENT_MONTH",

                                    text:
                                        "Mes actual"
                                },
                                {
                                    key:
                                        "PREVIOUS_MONTH",

                                    text:
                                        "Mes anterior"
                                },
                                {
                                    key:
                                        "LAST_3_MONTHS",

                                    text:
                                        "Últimos 3 meses"
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

                            clients: [
                                {
                                    key:
                                        "ALL",

                                    text:
                                        "Todos"
                                }
                            ],

                            orderTypes: [
                                {
                                    key:
                                        "ALL",

                                    text:
                                        "Todos"
                                }
                            ],

                            orderStatuses: [
                                {
                                    key:
                                        "ALL",

                                    text:
                                        "Todos"
                                }
                            ],

                            supervisors: [
                                {
                                    key:
                                        "ALL",

                                    text:
                                        "Todos"
                                }
                            ],

                            blockStatuses: [
                                {
                                    key:
                                        "ALL",

                                    text:
                                        "Todos"
                                }
                            ]
                        },

                        kpis: {
                            affected:
                                0,

                            overdue:
                                "Sin datos",

                            blockedEquipment:
                                0,

                            highImpact:
                                0
                        },

                        currentPage:
                            1,

                        visibleOrders:
                            [],

                        resultLabel:
                            "Mostrando 0 a 0 de 0 órdenes",

                        meta: {}
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

            _loadData:
                function (
                    bNotify
                ) {
                    var oModel =
                        this.getView()
                            .getModel("view");

                    var oFilters =
                        Object.assign(
                            {},
                            oModel.getProperty(
                                "/filters"
                            ) || {}
                        );

                    oModel.setProperty(
                        "/busy",
                        true
                    );

                    console.log(
                        "[LOA CONTROLLER] Filtros:",
                        oFilters
                    );

                    Service
                        .getDashboardData(
                            this._getODataModel()
                        )
                        .then(
                            function (
                                oRawData
                            ) {
                                var oMapped =
                                    Mapper.mapData(
                                        oRawData,
                                        oFilters
                                    );

                                this._aAllOrders =
                                    oMapped.rows ||
                                    [];

                                this._aFilteredOrders =
                                    this._aAllOrders
                                        .slice();

                                oModel.setProperty(
                                    "/catalogs",
                                    oMapped.catalogs
                                );

                                oModel.setProperty(
                                    "/kpis",
                                    oMapped.kpis
                                );

                                oModel.setProperty(
                                    "/meta",
                                    oMapped.meta
                                );

                                oModel.setProperty(
                                    "/currentPage",
                                    1
                                );

                                this._updateVisibleOrders();

                                console.log(
                                    "[LOA CONTROLLER] Resultado:",
                                    oMapped.meta
                                );

                                if (bNotify) {
                                    MessageToast.show(
                                        this._aFilteredOrders
                                            .length +
                                            " órdenes encontradas"
                                    );
                                }
                            }.bind(this)
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                console.error(
                                    "[LOA CONTROLLER] Error:",
                                    oError
                                );

                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "No fue posible consultar el listado de órdenes afectadas."
                                );
                            }
                        )
                        .finally(
                            function () {
                                oModel.setProperty(
                                    "/busy",
                                    false
                                );
                            }
                        );
                },

            onApplyFilters:
                function () {
                    /*
                     * Se vuelve a consultar SAP para
                     * mantener el comportamiento
                     * esperado de Aplicar filtros.
                     */
                    this._loadData(true);
                },

            onPagePress:
                function (
                    oEvent
                ) {
                    var iPage =
                        parseInt(
                            oEvent
                                .getSource()
                                .data("page"),
                            10
                        );

                    this._setCurrentPage(
                        iPage
                    );
                },

            onPreviousPage:
                function () {
                    var oModel =
                        this.getView()
                            .getModel("view");

                    var iCurrentPage =
                        oModel.getProperty(
                            "/currentPage"
                        );

                    this._setCurrentPage(
                        iCurrentPage - 1
                    );
                },

            onNextPage:
                function () {
                    var oModel =
                        this.getView()
                            .getModel("view");

                    var iCurrentPage =
                        oModel.getProperty(
                            "/currentPage"
                        );

                    this._setCurrentPage(
                        iCurrentPage + 1
                    );
                },

            onOrderPress:
                function (
                    oEvent
                ) {
                    var oContext =
                        oEvent
                            .getSource()
                            .getBindingContext(
                                "view"
                            );

                    var sOrderId =
                        oContext
                            ? oContext.getProperty(
                                "order"
                            )
                            : "";

                    var oRouter =
                        this.getOwnerComponent()
                            .getRouter();

                    if (
                        oRouter &&
                        oRouter.getRoute(
                            "RouteDetalleOrden"
                        )
                    ) {
                        oRouter.navTo(
                            "RouteDetalleOrden",
                            {
                                orderId:
                                    encodeURIComponent(
                                        sOrderId
                                    )
                            }
                        );

                        return;
                    }

                    MessageToast.show(
                        "Orden seleccionada: " +
                            sOrderId
                    );
                },

            onOpenOrderDetail:
                function () {
                    MessageToast.show(
                        "Selecciona una orden de la tabla para consultar su detalle"
                    );
                },

            _setCurrentPage:
                function (
                    iRequestedPage
                ) {
                    var iAvailablePages =
                        Math.max(
                            1,
                            Math.ceil(
                                this._aFilteredOrders
                                    .length /
                                this._iPageSize
                            )
                        );

                    var iPage =
                        Math.max(
                            1,
                            Math.min(
                                iRequestedPage,
                                iAvailablePages
                            )
                        );

                    this.getView()
                        .getModel("view")
                        .setProperty(
                            "/currentPage",
                            iPage
                        );

                    this._updateVisibleOrders();
                },

            _updateVisibleOrders:
                function () {
                    var oModel =
                        this.getView()
                            .getModel("view");

                    var iCurrentPage =
                        oModel.getProperty(
                            "/currentPage"
                        );

                    var iStartIndex =
                        (
                            iCurrentPage - 1
                        ) *
                        this._iPageSize;

                    var iEndIndex =
                        Math.min(
                            iStartIndex +
                                this._iPageSize,
                            this._aFilteredOrders
                                .length
                        );

                    var aVisibleOrders =
                        this._aFilteredOrders
                            .slice(
                                iStartIndex,
                                iEndIndex
                            );

                    var sStart =
                        this._aFilteredOrders
                            .length
                            ? this._formatNumber(
                                iStartIndex + 1
                            )
                            : "0";

                    var sEnd =
                        this._formatNumber(
                            iEndIndex
                        );

                    var sTotal =
                        this._formatNumber(
                            this._aFilteredOrders
                                .length
                        );

                    oModel.setProperty(
                        "/visibleOrders",
                        aVisibleOrders
                    );

                    oModel.setProperty(
                        "/resultLabel",
                        "Mostrando " +
                            sStart +
                            " a " +
                            sEnd +
                            " de " +
                            sTotal +
                            " órdenes"
                    );
                },

            _formatNumber:
                function (
                    iValue
                ) {
                    return new Intl.NumberFormat(
                        "es-MX"
                    ).format(
                        iValue || 0
                    );
                }
        }
    );
});
