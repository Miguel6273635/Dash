sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.ListadoOrdenesAfectadas",
        {
            onInit: function () {
                this._iPageSize = 8;
                this._iMaximumPrototypePage = 10;

                this._aAllOrders = this._buildMockOrders(1342);
                this._aFilteredOrders = this._aAllOrders.slice();

                var oViewModel = new JSONModel({
                    busy: false,

                    filters: {
                        period: "CURRENT_MONTH",
                        dateFrom: new Date(2024, 4, 1),
                        dateTo: new Date(2024, 4, 31),
                        zone: "ALL",
                        client: "ALL",
                        orderType: "ALL",
                        orderStatus: "ALL",
                        supervisor: "ALL",
                        blockStatus: "ALL"
                    },

                    catalogs: {
                        periods: [
                            {
                                key: "CURRENT_MONTH",
                                text: "Mes actual"
                            },
                            {
                                key: "PREVIOUS_MONTH",
                                text: "Mes anterior"
                            },
                            {
                                key: "LAST_3_MONTHS",
                                text: "Últimos 3 meses"
                            }
                        ],

                        zones: [
                            {
                                key: "ALL",
                                text: "Todas"
                            },
                            {
                                key: "SUR",
                                text: "Sur"
                            },
                            {
                                key: "CENTRO",
                                text: "Centro"
                            },
                            {
                                key: "NORTE",
                                text: "Norte"
                            },
                            {
                                key: "ESTE",
                                text: "Este"
                            },
                            {
                                key: "OESTE",
                                text: "Oeste"
                            }
                        ],

                        clients: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "HOSPITAL_SAN_JOSE",
                                text: "Hospital San José"
                            },
                            {
                                key: "CENTRO_COMERCIAL",
                                text: "Centro Comercial Plaza"
                            },
                            {
                                key: "HOTEL_VISTA_AZUL",
                                text: "Hotel Vista Azul"
                            },
                            {
                                key: "CLINICA_SANTA_MARIA",
                                text: "Clínica Santa María"
                            },
                            {
                                key: "UNIVERSIDAD_CENTRAL",
                                text: "Universidad Central"
                            }
                        ],

                        orderTypes: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "PREVENTIVE",
                                text: "PM Preventivo"
                            },
                            {
                                key: "CORRECTIVE",
                                text: "PM Correctivo"
                            }
                        ],

                        orderStatuses: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "PROCESS",
                                text: "En proceso"
                            },
                            {
                                key: "OPEN",
                                text: "Abierta"
                            },
                            {
                                key: "SCHEDULED",
                                text: "Programada"
                            },
                            {
                                key: "WAITING",
                                text: "En espera"
                            },
                            {
                                key: "CANCELLED",
                                text: "Cancelada"
                            }
                        ],

                        supervisors: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "MARIA_GOMEZ",
                                text: "María Gómez"
                            },
                            {
                                key: "LUIS_RAMIREZ",
                                text: "Luis Ramírez"
                            },
                            {
                                key: "ANA_MARTINEZ",
                                text: "Ana Martínez"
                            },
                            {
                                key: "CARLOS_PEREZ",
                                text: "Carlos Pérez"
                            },
                            {
                                key: "SOFIA_LOPEZ",
                                text: "Sofía López"
                            },
                            {
                                key: "JORGE_TORRES",
                                text: "Jorge Torres"
                            }
                        ],

                        blockStatuses: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "BLOCKED",
                                text: "Bloqueada"
                            },
                            {
                                key: "IN_MANAGEMENT",
                                text: "En gestión"
                            },
                            {
                                key: "RESOLVED",
                                text: "Resuelto"
                            }
                        ]
                    },

                    kpis: {
                        affected: "1,342",
                        overdue: "186",
                        blockedEquipment: "248",
                        highImpact: "94"
                    },

                    currentPage: 1,
                    visibleOrders: [],
                    resultLabel: ""
                });

                oViewModel.setSizeLimit(1500);

                this.getView().setModel(oViewModel, "view");

                this._updateVisibleOrders();
            },

            onApplyFilters: function () {
                var oModel = this.getView().getModel("view");
                var oFilters = oModel.getProperty("/filters");
                var bHasActiveFilters = this._hasActiveFilters(oFilters);

                oModel.setProperty("/busy", true);

                this._aFilteredOrders = this._aAllOrders.filter(
                    function (oOrder) {
                        return (
                            this._matchesSelectFilter(
                                oFilters.zone,
                                oOrder.zoneCode
                            ) &&
                            this._matchesSelectFilter(
                                oFilters.client,
                                oOrder.clientCode
                            ) &&
                            this._matchesSelectFilter(
                                oFilters.orderType,
                                oOrder.orderTypeCode
                            ) &&
                            this._matchesSelectFilter(
                                oFilters.orderStatus,
                                oOrder.orderStatusCode
                            ) &&
                            this._matchesSelectFilter(
                                oFilters.supervisor,
                                oOrder.supervisorCode
                            ) &&
                            this._matchesSelectFilter(
                                oFilters.blockStatus,
                                oOrder.blockStatusCode
                            ) &&
                            this._isInsideDateRange(
                                oOrder.startDateISO,
                                oFilters.dateFrom,
                                oFilters.dateTo
                            )
                        );
                    }.bind(this)
                );

                oModel.setProperty("/currentPage", 1);

                this._updateKpis(bHasActiveFilters);
                this._updateVisibleOrders();

                oModel.setProperty("/busy", false);

                MessageToast.show(
                    this._aFilteredOrders.length +
                        " órdenes encontradas"
                );
            },

            onPagePress: function (oEvent) {
                var iPage = parseInt(
                    oEvent.getSource().data("page"),
                    10
                );

                this._setCurrentPage(iPage);
            },

            onPreviousPage: function () {
                var oModel = this.getView().getModel("view");
                var iCurrentPage = oModel.getProperty("/currentPage");

                this._setCurrentPage(iCurrentPage - 1);
            },

            onNextPage: function () {
                var oModel = this.getView().getModel("view");
                var iCurrentPage = oModel.getProperty("/currentPage");

                this._setCurrentPage(iCurrentPage + 1);
            },

            onOrderPress: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("view");

                var sOrderId = oContext
                    ? oContext.getProperty("order")
                    : "";

                var oRouter = this.getOwnerComponent().getRouter();

                if (
                    oRouter &&
                    oRouter.getRoute("RouteDetalleOrden")
                ) {
                    oRouter.navTo("RouteDetalleOrden", {
                        orderId: encodeURIComponent(sOrderId)
                    });

                    return;
                }

                MessageToast.show(
                    "Orden seleccionada: " + sOrderId
                );
            },

            onOpenOrderDetail: function () {
                MessageToast.show(
                    "Selecciona una orden de la tabla para consultar su detalle"
                );
            },

            _setCurrentPage: function (iRequestedPage) {
                var iAvailablePages = Math.max(
                    1,
                    Math.ceil(
                        this._aFilteredOrders.length /
                            this._iPageSize
                    )
                );

                var iUpperLimit = Math.min(
                    iAvailablePages,
                    this._iMaximumPrototypePage
                );

                var iPage = Math.max(
                    1,
                    Math.min(iRequestedPage, iUpperLimit)
                );

                this.getView()
                    .getModel("view")
                    .setProperty("/currentPage", iPage);

                this._updateVisibleOrders();
            },

            _updateVisibleOrders: function () {
                var oModel = this.getView().getModel("view");
                var iCurrentPage =
                    oModel.getProperty("/currentPage");

                var iStartIndex =
                    (iCurrentPage - 1) * this._iPageSize;

                var iEndIndex = Math.min(
                    iStartIndex + this._iPageSize,
                    this._aFilteredOrders.length
                );

                var aVisibleOrders =
                    this._aFilteredOrders.slice(
                        iStartIndex,
                        iEndIndex
                    );

                var sStart = this._aFilteredOrders.length
                    ? this._formatNumber(iStartIndex + 1)
                    : "0";

                var sEnd = this._formatNumber(iEndIndex);

                var sTotal = this._formatNumber(
                    this._aFilteredOrders.length
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

            _updateKpis: function (bHasActiveFilters) {
                var oModel = this.getView().getModel("view");

                /*
                 * En la vista inicial conservamos los valores
                 * presentados en el diseño de referencia.
                 */
                if (!bHasActiveFilters) {
                    oModel.setProperty("/kpis", {
                        affected: "1,342",
                        overdue: "186",
                        blockedEquipment: "248",
                        highImpact: "94"
                    });

                    return;
                }

                var iOverdue =
                    this._aFilteredOrders.filter(
                        function (oOrder) {
                            return oOrder.overdueDays > 0;
                        }
                    ).length;

                var iHighImpact =
                    this._aFilteredOrders.filter(
                        function (oOrder) {
                            return oOrder.impactCode === "HIGH";
                        }
                    ).length;

                var mEquipment = {};

                this._aFilteredOrders.forEach(
                    function (oOrder) {
                        if (
                            oOrder.blockStatusCode !== "RESOLVED"
                        ) {
                            mEquipment[oOrder.equipment] = true;
                        }
                    }
                );

                oModel.setProperty("/kpis", {
                    affected: this._formatNumber(
                        this._aFilteredOrders.length
                    ),
                    overdue: this._formatNumber(iOverdue),
                    blockedEquipment: this._formatNumber(
                        Object.keys(mEquipment).length
                    ),
                    highImpact:
                        this._formatNumber(iHighImpact)
                });
            },

            _hasActiveFilters: function (oFilters) {
                var bDefaultFrom =
                    oFilters.dateFrom instanceof Date &&
                    oFilters.dateFrom.getFullYear() === 2024 &&
                    oFilters.dateFrom.getMonth() === 4 &&
                    oFilters.dateFrom.getDate() === 1;

                var bDefaultTo =
                    oFilters.dateTo instanceof Date &&
                    oFilters.dateTo.getFullYear() === 2024 &&
                    oFilters.dateTo.getMonth() === 4 &&
                    oFilters.dateTo.getDate() === 31;

                return (
                    oFilters.period !== "CURRENT_MONTH" ||
                    !bDefaultFrom ||
                    !bDefaultTo ||
                    oFilters.zone !== "ALL" ||
                    oFilters.client !== "ALL" ||
                    oFilters.orderType !== "ALL" ||
                    oFilters.orderStatus !== "ALL" ||
                    oFilters.supervisor !== "ALL" ||
                    oFilters.blockStatus !== "ALL"
                );
            },

            _matchesSelectFilter: function (
                sSelectedKey,
                sRowKey
            ) {
                return (
                    sSelectedKey === "ALL" ||
                    sSelectedKey === sRowKey
                );
            },

            _isInsideDateRange: function (
                sDateISO,
                oDateFrom,
                oDateTo
            ) {
                var oRowDate = new Date(
                    sDateISO + "T00:00:00"
                );

                var iRowTime = oRowDate.getTime();
                var iFromTime;
                var iToTime;

                if (
                    oDateFrom instanceof Date &&
                    !isNaN(oDateFrom.getTime())
                ) {
                    iFromTime = new Date(
                        oDateFrom.getFullYear(),
                        oDateFrom.getMonth(),
                        oDateFrom.getDate()
                    ).getTime();

                    if (iRowTime < iFromTime) {
                        return false;
                    }
                }

                if (
                    oDateTo instanceof Date &&
                    !isNaN(oDateTo.getTime())
                ) {
                    iToTime = new Date(
                        oDateTo.getFullYear(),
                        oDateTo.getMonth(),
                        oDateTo.getDate(),
                        23,
                        59,
                        59
                    ).getTime();

                    if (iRowTime > iToTime) {
                        return false;
                    }
                }

                return true;
            },

            _formatNumber: function (iValue) {
                return new Intl.NumberFormat("es-MX").format(
                    iValue || 0
                );
            },

            _buildMockOrders: function (iTotal) {
                var aBaseOrders = [
                    {
                        order: "OT-245678",
                        orderType: "PM Preventivo",
                        orderTypeCode: "PREVENTIVE",
                        equipment: "EV-0615",
                        client: "Hospital San José",
                        clientCode: "HOSPITAL_SAN_JOSE",
                        zone: "Sur",
                        zoneCode: "SUR",
                        orderStatus: "En proceso",
                        orderStatusCode: "PROCESS",
                        startDate: "15/05/2024",
                        startDateISO: "2024-05-15",
                        commitmentDate: "24/05/2024",
                        overdueDays: 5,
                        supervisor: "María Gómez",
                        supervisorCode: "MARIA_GOMEZ",
                        assignedResource: "Técnico A",
                        impact: "Alto",
                        impactCode: "HIGH",
                        priority: "Alta",
                        priorityCode: "HIGH",
                        blockStatus: "Bloqueada",
                        blockStatusCode: "BLOCKED"
                    },
                    {
                        order: "OT-245679",
                        orderType: "PM Correctivo",
                        orderTypeCode: "CORRECTIVE",
                        equipment: "EV-0782",
                        client: "Centro Comercial Plaza",
                        clientCode: "CENTRO_COMERCIAL",
                        zone: "Centro",
                        zoneCode: "CENTRO",
                        orderStatus: "Abierta",
                        orderStatusCode: "OPEN",
                        startDate: "18/05/2024",
                        startDateISO: "2024-05-18",
                        commitmentDate: "22/05/2024",
                        overdueDays: 3,
                        supervisor: "Luis Ramírez",
                        supervisorCode: "LUIS_RAMIREZ",
                        assignedResource: "Técnico B",
                        impact: "Medio",
                        impactCode: "MEDIUM",
                        priority: "Media",
                        priorityCode: "MEDIUM",
                        blockStatus: "En gestión",
                        blockStatusCode: "IN_MANAGEMENT"
                    },
                    {
                        order: "OT-245680",
                        orderType: "PM Preventivo",
                        orderTypeCode: "PREVENTIVE",
                        equipment: "EV-0431",
                        client: "Hotel Vista Azul",
                        clientCode: "HOTEL_VISTA_AZUL",
                        zone: "Norte",
                        zoneCode: "NORTE",
                        orderStatus: "Programada",
                        orderStatusCode: "SCHEDULED",
                        startDate: "20/05/2024",
                        startDateISO: "2024-05-20",
                        commitmentDate: "28/05/2024",
                        overdueDays: 0,
                        supervisor: "Ana Martínez",
                        supervisorCode: "ANA_MARTINEZ",
                        assignedResource: "Técnico C",
                        impact: "Bajo",
                        impactCode: "LOW",
                        priority: "Baja",
                        priorityCode: "LOW",
                        blockStatus: "Bloqueada",
                        blockStatusCode: "BLOCKED"
                    },
                    {
                        order: "OT-245681",
                        orderType: "PM Correctivo",
                        orderTypeCode: "CORRECTIVE",
                        equipment: "EV-0920",
                        client: "Clínica Santa María",
                        clientCode: "CLINICA_SANTA_MARIA",
                        zone: "Este",
                        zoneCode: "ESTE",
                        orderStatus: "En espera",
                        orderStatusCode: "WAITING",
                        startDate: "12/05/2024",
                        startDateISO: "2024-05-12",
                        commitmentDate: "17/05/2024",
                        overdueDays: 8,
                        supervisor: "Carlos Pérez",
                        supervisorCode: "CARLOS_PEREZ",
                        assignedResource: "Técnico A",
                        impact: "Alto",
                        impactCode: "HIGH",
                        priority: "Alta",
                        priorityCode: "HIGH",
                        blockStatus: "Bloqueada",
                        blockStatusCode: "BLOCKED"
                    },
                    {
                        order: "OT-245682",
                        orderType: "PM Preventivo",
                        orderTypeCode: "PREVENTIVE",
                        equipment: "EV-0154",
                        client: "Universidad Central",
                        clientCode: "UNIVERSIDAD_CENTRAL",
                        zone: "Oeste",
                        zoneCode: "OESTE",
                        orderStatus: "En proceso",
                        orderStatusCode: "PROCESS",
                        startDate: "22/05/2024",
                        startDateISO: "2024-05-22",
                        commitmentDate: "30/05/2024",
                        overdueDays: 0,
                        supervisor: "Sofía López",
                        supervisorCode: "SOFIA_LOPEZ",
                        assignedResource: "Técnico D",
                        impact: "Medio",
                        impactCode: "MEDIUM",
                        priority: "Media",
                        priorityCode: "MEDIUM",
                        blockStatus: "En gestión",
                        blockStatusCode: "IN_MANAGEMENT"
                    },
                    {
                        order: "OT-245683",
                        orderType: "PM Correctivo",
                        orderTypeCode: "CORRECTIVE",
                        equipment: "EV-0703",
                        client: "Edificio Corporativo 360",
                        clientCode: "CENTRO_COMERCIAL",
                        zone: "Centro",
                        zoneCode: "CENTRO",
                        orderStatus: "Abierta",
                        orderStatusCode: "OPEN",
                        startDate: "19/05/2024",
                        startDateISO: "2024-05-19",
                        commitmentDate: "23/05/2024",
                        overdueDays: 4,
                        supervisor: "Jorge Torres",
                        supervisorCode: "JORGE_TORRES",
                        assignedResource: "Técnico B",
                        impact: "Alto",
                        impactCode: "HIGH",
                        priority: "Alta",
                        priorityCode: "HIGH",
                        blockStatus: "Bloqueada",
                        blockStatusCode: "BLOCKED"
                    },
                    {
                        order: "OT-245684",
                        orderType: "PM Preventivo",
                        orderTypeCode: "PREVENTIVE",
                        equipment: "EV-0338",
                        client: "Planta Industrial Alfa",
                        clientCode: "HOSPITAL_SAN_JOSE",
                        zone: "Sur",
                        zoneCode: "SUR",
                        orderStatus: "Programada",
                        orderStatusCode: "SCHEDULED",
                        startDate: "25/05/2024",
                        startDateISO: "2024-05-25",
                        commitmentDate: "02/06/2024",
                        overdueDays: 0,
                        supervisor: "María Gómez",
                        supervisorCode: "MARIA_GOMEZ",
                        assignedResource: "Técnico E",
                        impact: "Bajo",
                        impactCode: "LOW",
                        priority: "Baja",
                        priorityCode: "LOW",
                        blockStatus: "En gestión",
                        blockStatusCode: "IN_MANAGEMENT"
                    },
                    {
                        order: "OT-245685",
                        orderType: "PM Correctivo",
                        orderTypeCode: "CORRECTIVE",
                        equipment: "EV-0881",
                        client: "Residencial Los Pinos",
                        clientCode: "HOTEL_VISTA_AZUL",
                        zone: "Norte",
                        zoneCode: "NORTE",
                        orderStatus: "Cancelada",
                        orderStatusCode: "CANCELLED",
                        startDate: "10/05/2024",
                        startDateISO: "2024-05-10",
                        commitmentDate: "14/05/2024",
                        overdueDays: 12,
                        supervisor: "Luis Ramírez",
                        supervisorCode: "LUIS_RAMIREZ",
                        assignedResource: "Técnico C",
                        impact: "Medio",
                        impactCode: "MEDIUM",
                        priority: "Media",
                        priorityCode: "MEDIUM",
                        blockStatus: "Resuelto",
                        blockStatusCode: "RESOLVED"
                    }
                ];

                var aOrders = [];
                var i;

                for (i = 0; i < iTotal; i += 1) {
                    var oTemplate =
                        aBaseOrders[
                            i % aBaseOrders.length
                        ];

                    var oOrder = Object.assign(
                        {},
                        oTemplate
                    );

                    if (i >= aBaseOrders.length) {
                        oOrder.order =
                            "OT-" +
                            String(245678 + i);

                        oOrder.equipment =
                            "EV-" +
                            String(
                                1000 + (i % 9000)
                            ).padStart(4, "0");
                    }

                    aOrders.push(oOrder);
                }

                return aOrders;
            }
        }
    );
});