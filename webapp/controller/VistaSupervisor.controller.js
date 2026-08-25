sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/VistaSupervisorService",
    "mantenimiento/model/VistaSupervisorMapper"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox,
    VistaSupervisorService,
    VistaSupervisorMapper
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.VistaSupervisor",
        {
            onInit: function () {
                this._iRequest = 0;
                this._oRawData = null;

                this._oViewModel =
                    new JSONModel(
                        this._getInitialData()
                    );

                this._oViewModel
                    .setDefaultBindingMode(
                        "TwoWay"
                    );

                this._oViewModel
                    .setSizeLimit(
                        5000
                    );

                this.getView()
                    .setModel(
                        this._oViewModel,
                        "supervisor"
                    );

                this._loadBase(
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
                    this._oViewModel
                        .getProperty(
                            "/filters"
                        ) || {}
                );
            },

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

                this._oViewModel
                    .setProperty(
                        "/filters/period",
                        String(
                            iYear
                        )
                    );

                this._oViewModel
                    .setProperty(
                        "/filters/dateFrom",
                        "01/01/" +
                        iYear
                    );

                this._oViewModel
                    .setProperty(
                        "/filters/dateTo",
                        "31/12/" +
                        iYear
                    );

                this._markDirty();
            },

            onDateChange: function () {
                var sFrom =
                    this._oViewModel
                        .getProperty(
                            "/filters/dateFrom"
                        ) || "";

                var sTo =
                    this._oViewModel
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
                    this._oViewModel
                        .setProperty(
                            "/filters/period",
                            aFrom[3]
                        );
                }

                this._markDirty();
            },

            onFilterChange: function () {
                this._markDirty();
            },

            _markDirty: function () {
                this._oViewModel
                    .setProperty(
                        "/filters/dirty",
                        true
                    );
            },

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

                this._loadBase(
                    true
                );
            },

            /*
             * FASE 1
             */

            _loadBase: function (
                bNotify
            ) {
                var iRequest =
                    ++this._iRequest;

                var oModel =
                    this._getODataModel();

                var oFilters =
                    this._getFilters();

                if (!oModel) {
                    return;
                }

                this._oViewModel
                    .setProperty(
                        "/busy",
                        true
                    );

                VistaSupervisorService
                    .getBaseData(
                        oModel,
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
                                VistaSupervisorMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._applyMappedData(
                                oMapped
                            );

                            this._oViewModel
                                .setProperty(
                                    "/busy",
                                    false
                                );

                            this._oViewModel
                                .setProperty(
                                    "/filters/dirty",
                                    false
                                );

                            if (bNotify) {
                                MessageToast.show(
                                    "Filtros aplicados"
                                );
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
                                "[VS CONTROLLER]",
                                oError
                            );

                            this._oViewModel
                                .setProperty(
                                    "/busy",
                                    false
                                );
                        }.bind(this)
                    );
            },

            /*
             * FASE 2
             */

            _loadOperational: function (
                iRequest,
                oFilters,
                aOrderIds
            ) {
                var oModel =
                    this._getODataModel();

                if (
                    !aOrderIds.length
                ) {
                    return;
                }

                this._oViewModel
                    .setProperty(
                        "/operationalBusy",
                        true
                    );

                VistaSupervisorService
                    .getOperationalData(
                        oModel,
                        aOrderIds
                    )
                    .then(
                        function (
                            oData
                        ) {
                            var oMapped;

                            if (
                                iRequest !==
                                this._iRequest
                            ) {
                                return;
                            }

                            this._oRawData
                                .orderResources =
                                oData.orderResources ||
                                [];

                            this._oRawData
                                .operations =
                                oData.operations ||
                                [];

                            oMapped =
                                VistaSupervisorMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._applyMappedData(
                                oMapped
                            );

                            setTimeout(
                                this._updateServiceDonut
                                    .bind(this),
                                0
                            );

                            this._loadMaterials(
                                iRequest,
                                oFilters,
                                aOrderIds
                            );
                        }.bind(this)
                    )
                    .finally(
                        function () {
                            if (
                                iRequest ===
                                this._iRequest
                            ) {
                                this._oViewModel
                                    .setProperty(
                                        "/operationalBusy",
                                        false
                                    );
                            }
                        }.bind(this)
                    );
            },

            /*
             * FASE 3
             */

            _loadMaterials: function (
                iRequest,
                oFilters,
                aOrderIds
            ) {
                var oModel =
                    this._getODataModel();

                this._oViewModel
                    .setProperty(
                        "/materialsBusy",
                        true
                    );

                VistaSupervisorService
                    .getMaterialData(
                        oModel,
                        aOrderIds
                    )
                    .then(
                        function (
                            oData
                        ) {
                            var oMapped;

                            if (
                                iRequest !==
                                this._iRequest
                            ) {
                                return;
                            }

                            this._oRawData
                                .materials =
                                oData.materials ||
                                [];

                            this._oRawData
                                .materialMovements =
                                oData.materialMovements ||
                                [];

                            oMapped =
                                VistaSupervisorMapper
                                    .mapData(
                                        this._oRawData,
                                        oFilters
                                    );

                            this._oViewModel
                                .setProperty(
                                    "/materials",
                                    oMapped.materials
                                );
                        }.bind(this)
                    )
                    .finally(
                        function () {
                            if (
                                iRequest ===
                                this._iRequest
                            ) {
                                this._oViewModel
                                    .setProperty(
                                        "/materialsBusy",
                                        false
                                    );
                            }
                        }.bind(this)
                    );
            },

            _applyMappedData: function (
                oMapped
            ) {
                this._oViewModel
                    .setProperty(
                        "/catalogs",
                        oMapped.catalogs
                    );

                this._oViewModel
                    .setProperty(
                        "/kpis",
                        oMapped.kpis
                    );

                this._oViewModel
                    .setProperty(
                        "/utilization",
                        oMapped.utilization
                    );

                this._oViewModel
                    .setProperty(
                        "/utilizationMeta",
                        oMapped.utilizationMeta
                    );

                this._oViewModel
                    .setProperty(
                        "/serviceTypes",
                        oMapped.serviceTypes
                    );

                this._oViewModel
                    .setProperty(
                        "/serviceTotalHours",
                        oMapped.serviceTotalHours
                    );

                this._oViewModel
                    .setProperty(
                        "/materials",
                        oMapped.materials
                    );
            },

            _updateServiceDonut: function () {
                var oDonut =
                    this.byId(
                        "serviceDonut"
                    );

                var oDom =
                    oDonut &&
                    oDonut.getDomRef();

                var aServices =
                    this._oViewModel
                        .getProperty(
                            "/serviceTypes"
                        ) || [];

                var nFirst =
                    parseFloat(
                        aServices[0] &&
                        aServices[0]
                            .percentage
                    );

                var nSecond =
                    parseFloat(
                        aServices[1] &&
                        aServices[1]
                            .percentage
                    );

                if (!oDom) {
                    return;
                }

                if (
                    !Number.isFinite(
                        nFirst
                    )
                ) {
                    oDom.style.background =
                        "conic-gradient(#e8edf5 0% 100%)";

                    return;
                }

                nSecond =
                    Number.isFinite(
                        nSecond
                    )
                        ? nSecond
                        : 0;

                var nEnd1 =
                    Math.min(
                        100,
                        nFirst
                    );

                var nEnd2 =
                    Math.min(
                        100,
                        nFirst +
                        nSecond
                    );

                oDom.style.background =
                    "conic-gradient(" +
                    "#2f80ed 0% " +
                    nEnd1 +
                    "%," +
                    "#ff3b30 " +
                    nEnd1 +
                    "% " +
                    nEnd2 +
                    "%," +
                    "#7d3cff " +
                    nEnd2 +
                    "% 100%)";
            },

            _getInitialData: function () {
                return {
                    busy:
                        false,

                    operationalBusy:
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

                        supervisor:
                            "ALL",

                        shift:
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
                            { key: "2024", text: "2024" }
                        ],

                        supervisors: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos"
                            }
                        ],

                        shifts: [
                            {
                                key:
                                    "ALL",

                                text:
                                    "Todos"
                            }
                        ]
                    },

                    kpis: {
                        assigned:
                            "Sin datos",

                        mechanics:
                            "Sin datos",

                        helpers:
                            "Sin datos",

                        availableCapacity:
                            "Sin datos",

                        scheduledLoad:
                            "Sin datos",

                        overCapacity:
                            "Sin datos",

                        compliance:
                            "Sin datos",

                        complianceTarget:
                            "Meta: 85%",

                        complianceGap:
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

                            quantity:
                                "Sin datos",

                            unit:
                                ""
                        },
                        {
                            name:
                                "Sin datos",

                            quantity:
                                "Sin datos",

                            unit:
                                ""
                        },
                        {
                            name:
                                "Sin datos",

                            quantity:
                                "Sin datos",

                            unit:
                                ""
                        },
                        {
                            name:
                                "Sin datos",

                            quantity:
                                "Sin datos",

                            unit:
                                ""
                        }
                    ]
                };
            }
        }
    );
});