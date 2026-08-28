sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/routing/History",
    "mantenimiento/model/HistorialSeguimientoService",
    "mantenimiento/model/HistorialSeguimientoMapper"
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
        "mantenimiento.controller.HistorialSeguimiento",
        {
            onInit: function () {
                var oModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                oModel.setSizeLimit(
                    5000
                );

                this.getView()
                    .setModel(
                        oModel,
                        "historial"
                    );

                var oRouter =
                    this.getOwnerComponent()
                        .getRouter();

                var oRoute =
                    oRouter.getRoute(
                        "RouteHistorialSeguimiento"
                    );

                if (oRoute) {
                    oRoute.attachPatternMatched(
                        this._onRouteMatched,
                        this
                    );
                }
            },

            _onRouteMatched:
                function (oEvent) {
                    var oArguments =
                        oEvent.getParameter(
                            "arguments"
                        ) || {};

                    var sEquipoId =
                        oArguments.equipoId
                            ? decodeURIComponent(
                                oArguments.equipoId
                            )
                            : "";

                    var oModel =
                        this.getView()
                            .getModel(
                                "historial"
                            );

                    oModel.setProperty(
                        "/equipmentId",
                        sEquipoId
                    );

                    this._loadData(
                        sEquipoId
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

            _loadData:
                function (
                    sEquipoId
                ) {
                    var oModel =
                        this.getView()
                            .getModel(
                                "historial"
                            );

                    oModel.setProperty(
                        "/busy",
                        true
                    );

                    Service
                        .getDashboardData(
                            this._getODataModel(),
                            sEquipoId
                        )
                        .then(
                            function (
                                oRaw
                            ) {
                                var oMapped =
                                    Mapper.mapData(
                                        oRaw,
                                        sEquipoId
                                    );

                                oMapped.busy =
                                    true;

                                oModel.setData(
                                    oMapped
                                );
                            }
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "No fue posible consultar el historial."
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
                    var oView =
                        this.getView();

                    var oModel =
                        oView.getModel(
                            "historial"
                        );

                    var oFilters = {
                        dateFrom:
                            oView
                                .byId(
                                    "dateFrom"
                                )
                                .getDateValue(),

                        dateTo:
                            oView
                                .byId(
                                    "dateTo"
                                )
                                .getDateValue(),

                        eventType:
                            oView
                                .byId(
                                    "eventTypeSelect"
                                )
                                .getSelectedKey(),

                        responsible:
                            oView
                                .byId(
                                    "responsibleSelect"
                                )
                                .getSelectedKey(),

                        resultStatus:
                            oView
                                .byId(
                                    "resultStatusSelect"
                                )
                                .getSelectedKey(),

                        search:
                            oView
                                .byId(
                                    "trackingSearch"
                                )
                                .getValue()
                                .trim()
                                .toLowerCase()
                    };

                    oModel.setProperty(
                        "/timeline",
                        this._filterCollection(
                            oModel.getProperty(
                                "/timelineAll"
                            ),
                            oFilters
                        )
                    );

                    oModel.setProperty(
                        "/pending",
                        this._filterCollection(
                            oModel.getProperty(
                                "/pendingAll"
                            ),
                            oFilters
                        )
                    );

                    oModel.setProperty(
                        "/log",
                        this._filterCollection(
                            oModel.getProperty(
                                "/logAll"
                            ),
                            oFilters
                        )
                    );

                    MessageToast.show(
                        "Filtros aplicados"
                    );
                },

            onSearch:
                function () {
                    this.onApplyFilters();
                },

            onSearchLive:
                function (oEvent) {
                    if (
                        !oEvent.getParameter(
                            "newValue"
                        )
                    ) {
                        this.onApplyFilters();
                    }
                },

            _filterCollection:
                function (
                    aItems,
                    oFilters
                ) {
                    return (
                        aItems || []
                    ).filter(
                        function (
                            oItem
                        ) {
                            var oItemDate =
                                this._parseIsoDate(
                                    oItem.dateIso
                                );

                            var bDateFrom =
                                !oFilters.dateFrom ||
                                (
                                    oItemDate &&
                                    oItemDate >=
                                        this._startOfDay(
                                            oFilters.dateFrom
                                        )
                                );

                            var bDateTo =
                                !oFilters.dateTo ||
                                (
                                    oItemDate &&
                                    oItemDate <=
                                        this._endOfDay(
                                            oFilters.dateTo
                                        )
                                );

                            var bEventType =
                                !oFilters.eventType ||
                                oFilters.eventType ===
                                    "ALL" ||
                                oItem.eventType ===
                                    oFilters.eventType;

                            var bResponsible =
                                !oFilters.responsible ||
                                oFilters.responsible ===
                                    "ALL" ||
                                oItem.responsibleKey ===
                                    oFilters.responsible;

                            var bStatus =
                                !oFilters.resultStatus ||
                                oFilters.resultStatus ===
                                    "ALL" ||
                                oItem.statusKey ===
                                    oFilters.resultStatus;

                            var sSearch =
                                [
                                    oItem.date,
                                    oItem.time,
                                    oItem.user,
                                    oItem.responsible,
                                    oItem.pending,
                                    oItem.area,
                                    oItem.eventTypeText,
                                    oItem.comment,
                                    oItem.previousStatus,
                                    oItem.resultStatus,
                                    oItem.order,
                                    oItem.evidence,
                                    oItem.priority
                                ]
                                    .join(" ")
                                    .toLowerCase();

                            return (
                                bDateFrom &&
                                bDateTo &&
                                bEventType &&
                                bResponsible &&
                                bStatus &&
                                (
                                    !oFilters.search ||
                                    sSearch.indexOf(
                                        oFilters.search
                                    ) !== -1
                                )
                            );
                        }.bind(this)
                    );
                },

            _parseIsoDate:
                function (
                    sIsoDate
                ) {
                    if (!sIsoDate) {
                        return null;
                    }

                    var aParts =
                        sIsoDate.split(
                            "-"
                        );

                    return new Date(
                        Number(
                            aParts[0]
                        ),
                        Number(
                            aParts[1]
                        ) - 1,
                        Number(
                            aParts[2]
                        )
                    );
                },

            _startOfDay:
                function (
                    oDate
                ) {
                    return new Date(
                        oDate.getFullYear(),
                        oDate.getMonth(),
                        oDate.getDate(),
                        0,
                        0,
                        0,
                        0
                    );
                },

            _endOfDay:
                function (
                    oDate
                ) {
                    return new Date(
                        oDate.getFullYear(),
                        oDate.getMonth(),
                        oDate.getDate(),
                        23,
                        59,
                        59,
                        999
                    );
                },

            onOrderPress:
                function (
                    oEvent
                ) {
                    MessageToast.show(
                        "Orden relacionada: " +
                        oEvent
                            .getSource()
                            .getText()
                    );
                },

            onNavBack:
                function () {
                    var sPreviousHash =
                        History.getInstance()
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

                    this._navToRoute(
                        "RouteFichaEquipoBloqueado"
                    );
                },

            onGoToEquiposBloqueados:
                function () {
                    this._navToRoute(
                        "RouteEquiposBloqueados"
                    );
                },

            onGoToDetalleEquipo:
                function () {
                    this._navToRoute(
                        "RouteFichaEquipoBloqueado"
                    );
                },

            _navToRoute:
                function (
                    sRouteName
                ) {
                    var oRouter =
                        this.getOwnerComponent()
                            .getRouter();

                    if (
                        oRouter.getRoute(
                            sRouteName
                        )
                    ) {
                        oRouter.navTo(
                            sRouteName
                        );
                    }
                },

            _getInitialData:
                function () {
                    return {
                        busy:
                            false,

                        equipmentId:
                            "",

                        general: {
                            equipo:
                                "Sin datos",

                            cliente:
                                "Sin datos",

                            zona:
                                "Sin datos",

                            supervisor:
                                "Sin datos",

                            sitio:
                                "Sin datos",

                            direccion:
                                "Sin datos",

                            tipoEquipo:
                                "Sin datos",

                            modelo:
                                "Sin datos"
                        },

                        summary: {
                            motivo:
                                "Sin datos",

                            responsableActual:
                                "Sin datos",

                            fechaBloqueo:
                                "Sin datos",

                            estadoGestion:
                                "Sin datos",

                            estadoKey:
                                "NONE",

                            fechaCompromiso:
                                "Sin datos",

                            observacion:
                                "Sin datos"
                        },

                        kpis: {
                            estatusActual:
                                "Sin datos",

                            diasBloqueado:
                                "Sin datos",

                            eventosRegistrados:
                                0,

                            pendientesAbiertos:
                                0,

                            ultimaActualizacion:
                                "Sin datos",

                            proximaAccion:
                                "Sin datos"
                        },

                        indicators: {
                            principalCausa:
                                "Sin datos",

                            ultimaActualizacion:
                                "Sin datos",

                            responsableMasActivo:
                                "Sin datos",

                            diasDesdeUltimaIntervencion:
                                "Sin datos"
                        },

                        eventTypes: [
                            {
                                key:
                                    "ALL",
                                text:
                                    "Todos"
                            }
                        ],

                        responsibles: [
                            {
                                key:
                                    "ALL",
                                text:
                                    "Todos"
                            }
                        ],

                        resultStatuses: [
                            {
                                key:
                                    "ALL",
                                text:
                                    "Todos"
                            }
                        ],

                        timelineAll:
                            [],

                        timeline:
                            [],

                        pendingAll:
                            [],

                        pending:
                            [],

                        logAll:
                            [],

                        log:
                            []
                    };
                }
        }
    );
});