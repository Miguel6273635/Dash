sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/VistaJefaturaService",
    "mantenimiento/model/VistaJefaturaMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    VistaJefaturaService,
    VistaJefaturaMapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.VistaJefatura",
        {
            onInit: function () {
                this._iRequest =
                    0;

                this._oRawData =
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
                        this._oDashboardModel,
                        "dashboard"
                    );

                this._loadDashboard(
                    false
                );
            },

            onAfterRendering: function () {
                this._updateServiceDonut();
            },

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
                    ) ||
                    iYear <
                        1900 ||
                    iYear >
                        9999
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

            /*
             * El usuario puede seleccionar
             * cualquier rango de fecha.
             *
             * Sólo sincronizamos el año
             * cuando ambas fechas pertenecen
             * al mismo año.
             */

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
             * JEFATURA → SUPERVISOR
             * ================================================== */

            onHeadshipChange: function () {
                var sHeadship =
                    this._oDashboardModel
                        .getProperty(
                            "/filters/headship"
                        );

                var aSupervisorsAll =
                    this._oDashboardModel
                        .getProperty(
                            "/catalogs/supervisorsAll"
                        ) || [];

                var aFiltered =
                    aSupervisorsAll
                        .filter(
                            function (
                                oItem,
                                iIndex
                            ) {
                                if (
                                    iIndex ===
                                        0 ||
                                    !sHeadship ||
                                    sHeadship ===
                                        "ALL"
                                ) {
                                    return true;
                                }

                                return (
                                    !oItem.parentKey ||
                                    oItem.parentKey ===
                                        sHeadship
                                );
                            }
                        );

                this._oDashboardModel
                    .setProperty(
                        "/catalogs/supervisors",
                        aFiltered
                    );

                this._oDashboardModel
                    .setProperty(
                        "/filters/supervisor",
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
             * APLICAR FILTROS
             * ================================================== */

            onApplyFilters: function () {
                var oFilters =
                    this._getFilters();

                if (
                    !oFilters.dateFrom ||
                    !oFilters.dateTo
                ) {
                    MessageBox.warning(
                        "Selecciona Fecha desde y Fecha hasta."
                    );

                    return;
                }

                this._loadDashboard(
                    true
                );
            },

            /* ==================================================
             * CARGA PRINCIPAL
             * ================================================== */

            _loadDashboard: function (
                bNotify
            ) {
                var iRequest =
                    ++this._iRequest;

                var oODataModel =
                    this._getODataModel();

                var oFilters =
                    this._getFilters();

                if (
                    !oODataModel
                ) {
                    MessageBox.error(
                        "No se encontró el modelo OData del dashboard."
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
                        "/materialsBusy",
                        false
                    );

                console.log(
                    "[VJ CONTROLLER] Filtros:",
                    oFilters
                );

                VistaJefaturaService
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
                                this._iRequest
                            ) {
                                return;
                            }

                            this._oRawData =
                                oRawData;

                            oMapped =
                                VistaJefaturaMapper
                                    .mapData(
                                        oRawData,
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

                            /*
                             * Liberamos la pantalla
                             * antes de materiales.
                             */

                            this._oDashboardModel
                                .setProperty(
                                    "/busy",
                                    false
                                );

                            setTimeout(
                                this._updateServiceDonut
                                    .bind(this),
                                0
                            );

                            if (
                                bNotify
                            ) {
                                MessageToast.show(
                                    "Vista Jefatura actualizada"
                                );
                            }

                            /*
                             * Materiales continúan
                             * cargando aparte.
                             */

                            this._loadMaterialsInBackground(
                                iRequest,
                                oFilters
                            );
                        }.bind(this)
                    )
                    .catch(
                        function (
                            oError
                        ) {
                            if (
                                iRequest !==
                                this._iRequest
                            ) {
                                return;
                            }

                            console.error(
                                "[VJ CONTROLLER] Error:",
                                oError
                            );

                            this._oDashboardModel
                                .setProperty(
                                    "/busy",
                                    false
                                );

                            MessageBox.error(
                                oError &&
                                oError.message
                                    ? oError.message
                                    : "No fue posible cargar Vista Jefatura."
                            );
                        }.bind(this)
                    );
            },

            /* ==================================================
             * MATERIALES
             * ================================================== */

            _loadMaterialsInBackground: function (
                iRequest,
                oFilters
            ) {
                var oODataModel =
                    this._getODataModel();

                var aOrderIds;

                if (
                    !this._oRawData
                ) {
                    return;
                }

                aOrderIds =
                    (
                        this._oRawData
                            .orders ||
                        []
                    )
                        .map(
                            function (
                                oOrder
                            ) {
                                return (
                                    oOrder.OrderId
                                );
                            }
                        )
                        .filter(
                            Boolean
                        );

                if (
                    !aOrderIds.length
                ) {
                    return;
                }

                this._oDashboardModel
                    .setProperty(
                        "/materialsBusy",
                        true
                    );

                VistaJefaturaService
                    .getMaterialData(
                        oODataModel,
                        aOrderIds
                    )
                    .then(
                        function (
                            oMaterialData
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
                                .materials =
                                oMaterialData
                                    .materials ||
                                [];

                            this._oRawData
                                .materialMovements =
                                oMaterialData
                                    .materialMovements ||
                                [];

                            /*
                             * Reutilizamos el Mapper,
                             * pero sólo actualizamos
                             * materiales.
                             */

                            oMapped =
                                VistaJefaturaMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._oDashboardModel
                                .setProperty(
                                    "/materials",
                                    oMapped.materials
                                );
                        }.bind(this)
                    )
                    .catch(
                        function (
                            oError
                        ) {
                            console.error(
                                "[VJ CONTROLLER] Materiales:",
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
                                        "/materialsBusy",
                                        false
                                    );
                            }
                        }.bind(this)
                    );
            },

            /* ==================================================
             * PASAR MAPPER AL JSONMODEL
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
                        "/summary",
                        oMapped.summary
                    );

                this._oDashboardModel
                    .setProperty(
                        "/utilization",
                        oMapped.utilization
                    );

                this._oDashboardModel
                    .setProperty(
                        "/utilizationMeta",
                        oMapped.utilizationMeta
                    );

                this._oDashboardModel
                    .setProperty(
                        "/serviceTypes",
                        oMapped.serviceTypes
                    );

                this._oDashboardModel
                    .setProperty(
                        "/serviceTotalHours",
                        oMapped.serviceTotalHours
                    );

                this._oDashboardModel
                    .setProperty(
                        "/materials",
                        oMapped.materials
                    );

                this._oDashboardModel
                    .setProperty(
                        "/meta",
                        oMapped.meta
                    );
            },

            /* ==================================================
             * DONA DINÁMICA
             * ================================================== */

            _updateServiceDonut: function () {
                var oDonut =
                    this.byId(
                        "serviceDonut"
                    );

                var oDom =
                    oDonut &&
                    oDonut.getDomRef();

                var aServices =
                    this._oDashboardModel
                        .getProperty(
                            "/serviceTypes"
                        ) || [];

                var nFirst;
                var nSecond;
                var nEndFirst;
                var nEndSecond;

                if (!oDom) {
                    return;
                }

                nFirst =
                    parseFloat(
                        aServices[0] &&
                        aServices[0]
                            .percentage
                    );

                nSecond =
                    parseFloat(
                        aServices[1] &&
                        aServices[1]
                            .percentage
                    );

                if (
                    !Number.isFinite(
                        nFirst
                    )
                ) {
                    oDom.style.background =
                        "conic-gradient(#e8edf5 0% 100%)";

                    return;
                }

                nFirst =
                    Math.max(
                        0,
                        nFirst
                    );

                nSecond =
                    Number.isFinite(
                        nSecond
                    )
                        ? Math.max(
                            0,
                            nSecond
                        )
                        : 0;

                nEndFirst =
                    Math.min(
                        100,
                        nFirst
                    );

                nEndSecond =
                    Math.min(
                        100,
                        nFirst +
                        nSecond
                    );

                oDom.style.background =
                    "conic-gradient(" +
                    "#2f80ed 0% " +
                    nEndFirst +
                    "%," +
                    "#ff3b30 " +
                    nEndFirst +
                    "% " +
                    nEndSecond +
                    "%," +
                    "#7d3cff " +
                    nEndSecond +
                    "% 100%)";
            },

            /* ==================================================
             * NAVEGACIÓN
             * ================================================== */

            onViewSupervisor: function () {
                this._navigateOrNotify(
                    "DetalleSupervisor",

                    "La ruta DetalleSupervisor aún no está declarada."
                );
            },

            onAssignments: function () {
                this._navigateOrNotify(
                    "AsignacionesJefatura",

                    "La ruta AsignacionesJefatura aún no está declarada."
                );
            },

            onCapacityBalance: function () {
                this._navigateOrNotify(
                    "BalanceCapacidadJefatura",

                    "La ruta BalanceCapacidadJefatura aún no está declarada."
                );
            },

            _navigateOrNotify: function (
                sRouteName,
                sFallbackMessage
            ) {
                var oOwnerComponent =
                    this.getOwnerComponent();

                var oRouter =
                    oOwnerComponent &&
                    oOwnerComponent
                        .getRouter();

                if (
                    oRouter &&
                    oRouter.getRoute(
                        sRouteName
                    )
                ) {
                    oRouter.navTo(
                        sRouteName
                    );

                    return;
                }

                MessageToast.show(
                    sFallbackMessage
                );
            },

            /* ==================================================
             * ESTADO INICIAL
             * ================================================== */

            _getInitialData: function () {
                return {
                    busy:
                        false,

                    materialsBusy:
                        false,

                    filters: {
                        period:
                            "2026",

                        dateFrom:
                            "01/01/2026",

                        dateTo:
                            "31/12/2026",

                        headship:
                            "ALL",

                        supervisor:
                            "ALL",

                        shift:
                            "ALL",

                        dirty:
                            false
                    },

                    catalogs: {
                        periods: [
                            {
                                key:
                                    "2028",
                                text:
                                    "2028"
                            },
                            {
                                key:
                                    "2027",
                                text:
                                    "2027"
                            },
                            {
                                key:
                                    "2026",
                                text:
                                    "2026"
                            },
                            {
                                key:
                                    "2025",
                                text:
                                    "2025"
                            },
                            {
                                key:
                                    "2024",
                                text:
                                    "2024"
                            },
                            {
                                key:
                                    "2023",
                                text:
                                    "2023"
                            },
                            {
                                key:
                                    "2022",
                                text:
                                    "2022"
                            },
                            {
                                key:
                                    "2021",
                                text:
                                    "2021"
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

                        supervisorsAll: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos",

                                parentKey:
                                    ""
                            }
                        ],

                        supervisors: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos",

                                parentKey:
                                    ""
                            }
                        ],

                        shifts: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos",

                                parentKey:
                                    ""
                            }
                        ]
                    },

                    summary: {
                        activeSupervisors:
                            "Sin datos",

                        activeSupervisorsHelper:
                            "",

                        resourcesTotal:
                            "Sin datos",

                        capacityAvailable:
                            "Sin datos",

                        plannedLoad:
                            "Sin datos",

                        overCapacity:
                            "Sin datos",

                        compliance:
                            "Sin datos",

                        complianceMeta:
                            "Meta: 80%",

                        complianceAlert:
                            ""
                    },

                    utilization: {
                        critical:
                            [],

                        high:
                            [],

                        normal:
                            [],

                        low:
                            []
                    },

                    utilizationMeta: {
                        criticalCount:
                            "0",

                        highCount:
                            "0",

                        normalCount:
                            "0",

                        lowCount:
                            "0",

                        criticalRange:
                            "> 120%",

                        highRange:
                            "101% - 120%",

                        normalRange:
                            "71% - 100%",

                        lowRange:
                            "0% - 70%"
                    },

                    serviceTypes: [
                        {
                            label:
                                "Sin datos",

                            percentage:
                                "Sin datos",

                            hours:
                                "Sin datos"
                        },

                        {
                            label:
                                "Sin datos",

                            percentage:
                                "Sin datos",

                            hours:
                                "Sin datos"
                        },

                        {
                            label:
                                "Sin datos",

                            percentage:
                                "Sin datos",

                            hours:
                                "Sin datos"
                        }
                    ],

                    serviceTotalHours:
                        "Sin datos",

                    materials: [
                        {
                            name:
                                "Sin datos",

                            percentage:
                                "Sin datos",

                            barWidth:
                                "0%",

                            status:
                                "Sin datos",

                            statusIcon:
                                "sap-icon://question-mark"
                        },

                        {
                            name:
                                "Sin datos",

                            percentage:
                                "Sin datos",

                            barWidth:
                                "0%",

                            status:
                                "Sin datos",

                            statusIcon:
                                "sap-icon://question-mark"
                        },

                        {
                            name:
                                "Sin datos",

                            percentage:
                                "Sin datos",

                            barWidth:
                                "0%",

                            status:
                                "Sin datos",

                            statusIcon:
                                "sap-icon://question-mark"
                        },

                        {
                            name:
                                "Sin datos",

                            percentage:
                                "Sin datos",

                            barWidth:
                                "0%",

                            status:
                                "Sin datos",

                            statusIcon:
                                "sap-icon://question-mark"
                        }
                    ],

                    meta:
                        {}
                };
            }
        }
    );
});