sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/Device"
], function (
    Controller,
    JSONModel,
    MessageToast,
    Device
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleOperativoSupervisores",
        {

            /**
             * Inicializa el modelo local de la pantalla.
             */
            onInit: function () {

                this._aAllSupervisors = [
                    {
                        id: "S01",
                        supervisor: "S01 - Sup. Mecánicos A",
                        manager: "Carlos Ramírez",
                        resources: 8,
                        capacity: 420,
                        programmedLoad: 360,
                        utilization: 86,
                        status: "Normal",
                        statusState: "Success",
                        overCapacity: 1,
                        compliance: 82,
                        goal: 80,
                        isTotal: false
                    },
                    {
                        id: "S02",
                        supervisor: "S02 - Sup. Mecánicos B",
                        manager: "Carlos Ramírez",
                        resources: 7,
                        capacity: 350,
                        programmedLoad: 385,
                        utilization: 110,
                        status: "Alto",
                        statusState: "Warning",
                        overCapacity: 3,
                        compliance: 76,
                        goal: 80,
                        isTotal: false
                    },
                    {
                        id: "S03",
                        supervisor: "S03 - Sup. Mecánicos C",
                        manager: "Carlos Ramírez",
                        resources: 6,
                        capacity: 300,
                        programmedLoad: 270,
                        utilization: 90,
                        status: "Normal",
                        statusState: "Success",
                        overCapacity: 0,
                        compliance: 85,
                        goal: 80,
                        isTotal: false
                    },
                    {
                        id: "S04",
                        supervisor: "S04 - Sup. Mecánicos D",
                        manager: "Carlos Ramírez",
                        resources: 7,
                        capacity: 350,
                        programmedLoad: 200,
                        utilization: 57,
                        status: "Bajo",
                        statusState: "Information",
                        overCapacity: 0,
                        compliance: 68,
                        goal: 80,
                        isTotal: false
                    }
                ];

                var oScreenData = {

                    filters: {
                        period: "2025-06",
                        dateFrom: "2025-06-01",
                        dateTo: "2025-06-30",
                        management: "G01",
                        headquarters: "J01",
                        supervisor: "ALL",
                        shift: "ALL",
                        serviceType: "ALL",
                        resourceType: "ALL",
                        zone: "ALL"
                    },

                    periods: [
                        {
                            key: "2025-06",
                            text: "Junio 2025"
                        },
                        {
                            key: "2025-05",
                            text: "Mayo 2025"
                        },
                        {
                            key: "2025-04",
                            text: "Abril 2025"
                        }
                    ],

                    managements: [
                        {
                            key: "G01",
                            text: "G01 - Gerencia Norte"
                        },
                        {
                            key: "G02",
                            text: "G02 - Gerencia Centro"
                        },
                        {
                            key: "G03",
                            text: "G03 - Gerencia Sur"
                        }
                    ],

                    headquarters: [
                        {
                            key: "J01",
                            text: "J01 - Jefatura Taller Norte"
                        },
                        {
                            key: "J02",
                            text: "J02 - Jefatura Taller Centro"
                        },
                        {
                            key: "J03",
                            text: "J03 - Jefatura Taller Sur"
                        }
                    ],

                    supervisorOptions: [
                        {
                            key: "ALL",
                            text: "Todos"
                        },
                        {
                            key: "S01",
                            text: "S01 - Sup. Mecánicos A"
                        },
                        {
                            key: "S02",
                            text: "S02 - Sup. Mecánicos B"
                        },
                        {
                            key: "S03",
                            text: "S03 - Sup. Mecánicos C"
                        },
                        {
                            key: "S04",
                            text: "S04 - Sup. Mecánicos D"
                        }
                    ],

                    shifts: [
                        {
                            key: "ALL",
                            text: "Todos"
                        },
                        {
                            key: "MORNING",
                            text: "Matutino"
                        },
                        {
                            key: "AFTERNOON",
                            text: "Vespertino"
                        },
                        {
                            key: "NIGHT",
                            text: "Nocturno"
                        }
                    ],

                    serviceTypes: [
                        {
                            key: "ALL",
                            text: "Todos"
                        },
                        {
                            key: "PREVENTIVE",
                            text: "Preventivo"
                        },
                        {
                            key: "CORRECTIVE",
                            text: "Correctivo"
                        }
                    ],

                    resourceTypes: [
                        {
                            key: "ALL",
                            text: "Todos"
                        },
                        {
                            key: "MECHANIC",
                            text: "Mecánico"
                        },
                        {
                            key: "ASSISTANT",
                            text: "Ayudante"
                        }
                    ],

                    zones: [
                        {
                            key: "ALL",
                            text: "Todas"
                        },
                        {
                            key: "NORTH",
                            text: "Norte"
                        },
                        {
                            key: "CENTER",
                            text: "Centro"
                        },
                        {
                            key: "SOUTH",
                            text: "Sur"
                        }
                    ],

                    kpis: {
                        activeSupervisors: {
                            value: "0"
                        },
                        totalResources: {
                            value: "0"
                        },
                        availableCapacity: {
                            value: "0 h"
                        },
                        programmedLoad: {
                            value: "0 h"
                        },
                        averageUtilization: {
                            value: "0%"
                        },
                        operationalCompliance: {
                            value: "0%"
                        }
                    },

                    /*
                     * Supervisores formateados después de aplicar filtros.
                     * "pageItems" contiene solamente las filas visibles.
                     */
                    supervisors: [],
                    filteredSupervisors: [],
                    pageItems: [],
                    summaryRow: null,

                    /*
                     * Valor inicial seguro. Después del renderizado,
                     * el tamaño se recalcula según la altura disponible.
                     */
                    pageSize: 2,

                    paging: {
                        currentPage: 1,
                        totalPages: 1,
                        rangeText: "0 - 0 de 0"
                    }
                };

                var oScreenModel = new JSONModel(
                    oScreenData
                );

                oScreenModel.setSizeLimit(500);

                this.getView().setModel(
                    oScreenModel,
                    "screen"
                );

                Device.resize.attachHandler(
                    this._onViewportResize,
                    this
                );

                this._setDisplayedSupervisors(
                    this._aAllSupervisors
                );
            },

            /**
             * Calcula el número de registros después de renderizar.
             */
            onAfterRendering: function () {
                this._scheduleAdaptivePageSize();
            },

            /**
             * Libera eventos y temporizadores.
             */
            onExit: function () {

                Device.resize.detachHandler(
                    this._onViewportResize,
                    this
                );

                if (this._iAdaptivePageSizeTimer) {
                    clearTimeout(
                        this._iAdaptivePageSizeTimer
                    );

                    this._iAdaptivePageSizeTimer = null;
                }
            },

            /**
             * Atiende cambios en el tamaño del navegador.
             */
            _onViewportResize: function () {
                this._scheduleAdaptivePageSize();
            },

            /**
             * Evita ejecutar varios cálculos durante un resize.
             */
            _scheduleAdaptivePageSize: function () {

                if (this._iAdaptivePageSizeTimer) {
                    clearTimeout(
                        this._iAdaptivePageSizeTimer
                    );
                }

                this._iAdaptivePageSizeTimer = setTimeout(
                    function () {
                        this._iAdaptivePageSizeTimer = null;
                        this._updateAdaptivePageSize();
                    }.bind(this),
                    120
                );
            },

            /**
             * Ajusta el pageSize usando el espacio real disponible
             * debajo de la card de la tabla.
             */
            _updateAdaptivePageSize: function () {

                var oModel =
                    this.getView().getModel("screen");

                var oTable =
                    this.byId("supervisorsTable");

                var oTableDom =
                    oTable && oTable.getDomRef();

                var oViewDom =
                    this.getView().getDomRef();

                if (
                    !oModel ||
                    !oTableDom ||
                    !oViewDom
                ) {
                    return;
                }

                var oTableCardDom =
                    oViewDom.querySelector(
                        ".dosTableCard"
                    );

                var oFirstDataRowDom =
                    oTableDom.querySelector(
                        ".sapMListTblRow:not(.dosTotalRow)"
                    ) ||
                    oTableDom.querySelector(
                        ".sapMListTblRow"
                    );

                if (!oTableCardDom) {
                    return;
                }

                var oPageViewportDom =
                    oViewDom.closest(".sapMPage");

                if (oPageViewportDom) {
                    oPageViewportDom =
                        oPageViewportDom.querySelector(
                            ".sapMPageEnableScrolling"
                        ) ||
                        oPageViewportDom.querySelector(
                            ".sapMPageScroll"
                        ) ||
                        oPageViewportDom;
                }

                var iViewportBottom;

                if (oPageViewportDom) {

                    iViewportBottom =
                        oPageViewportDom
                            .getBoundingClientRect()
                            .bottom;

                } else if (
                    window.visualViewport &&
                    window.visualViewport.height
                ) {

                    iViewportBottom =
                        window.visualViewport.height;

                } else {

                    iViewportBottom =
                        window.innerHeight ||
                        document.documentElement
                            .clientHeight ||
                        0;
                }

                var iCardBottom =
                    oTableCardDom
                        .getBoundingClientRect()
                        .bottom;

                var iRowHeight =
                    oFirstDataRowDom
                        ? oFirstDataRowDom
                            .getBoundingClientRect()
                            .height
                        : 37.6;

                var iFreeSpace =
                    iViewportBottom -
                    iCardBottom;

                var iSafetySpace = 10;

                var iCurrentPageSize =
                    Number(
                        oModel.getProperty(
                            "/pageSize"
                        )
                    ) || 2;

                var aFilteredSupervisors =
                    oModel.getProperty(
                        "/filteredSupervisors"
                    ) || [];

                var iTotalRecords =
                    aFilteredSupervisors.length;

                var iCalculatedPageSize =
                    iCurrentPageSize;

                /*
                 * Se agregan filas únicamente cuando existen más
                 * supervisores reales. Las filas nunca se agrandan
                 * para llenar artificialmente el espacio disponible.
                 */
                if (
                    iFreeSpace >
                    iRowHeight + iSafetySpace &&
                    iCurrentPageSize < iTotalRecords
                ) {

                    iCalculatedPageSize +=
                        Math.floor(
                            (
                                iFreeSpace -
                                iSafetySpace
                            ) /
                            Math.max(
                                iRowHeight,
                                1
                            )
                        );

                } else if (
                    iFreeSpace <
                    -iSafetySpace &&
                    iCurrentPageSize > 1
                ) {

                    iCalculatedPageSize -=
                        Math.ceil(
                            Math.abs(
                                iFreeSpace +
                                iSafetySpace
                            ) /
                            Math.max(
                                iRowHeight,
                                1
                            )
                        );
                }

                iCalculatedPageSize =
                    Math.max(
                        1,
                        Math.min(
                            iCalculatedPageSize,
                            Math.max(
                                1,
                                iTotalRecords
                            )
                        )
                    );

                if (
                    iCalculatedPageSize ===
                    iCurrentPageSize
                ) {
                    return;
                }

                var iCurrentPage =
                    Number(
                        oModel.getProperty(
                            "/paging/currentPage"
                        )
                    ) || 1;

                var iFirstVisibleIndex =
                    (
                        iCurrentPage -
                        1
                    ) *
                    iCurrentPageSize;

                var iNewCurrentPage =
                    Math.floor(
                        iFirstVisibleIndex /
                        iCalculatedPageSize
                    ) + 1;

                oModel.setProperty(
                    "/pageSize",
                    iCalculatedPageSize
                );

                oModel.setProperty(
                    "/paging/currentPage",
                    iNewCurrentPage
                );

                this._updatePagination();
                this._scheduleAdaptivePageSize();
            },

            /**
             * Aplica los filtros de la pantalla.
             *
             * Actualmente se simula el filtro por supervisor.
             * Los demás filtros quedan preparados para OData.
             */
            onApplyFilters: function () {

                var oModel =
                    this.getView().getModel("screen");

                var sSelectedSupervisor =
                    oModel.getProperty(
                        "/filters/supervisor"
                    );

                var aFilteredSupervisors =
                    this._aAllSupervisors.slice();

                if (
                    sSelectedSupervisor &&
                    sSelectedSupervisor !== "ALL"
                ) {
                    aFilteredSupervisors =
                        this._aAllSupervisors.filter(
                            function (oSupervisor) {
                                return (
                                    oSupervisor.id ===
                                    sSelectedSupervisor
                                );
                            }
                        );
                }

                this._setDisplayedSupervisors(
                    aFilteredSupervisors
                );

                MessageToast.show(
                    "Filtros aplicados correctamente."
                );
            },

            /**
             * Prepara las filas filtradas, calcula los totales,
             * actualiza los KPI y reinicia la paginación.
             *
             * @param {Array} aSupervisors Supervisores visibles
             * @private
             */
            _setDisplayedSupervisors: function (
                aSupervisors
            ) {

                var oModel =
                    this.getView().getModel("screen");

                var iResources =
                    this._sum(
                        aSupervisors,
                        "resources"
                    );

                var iCapacity =
                    this._sum(
                        aSupervisors,
                        "capacity"
                    );

                var iProgrammedLoad =
                    this._sum(
                        aSupervisors,
                        "programmedLoad"
                    );

                var iOverCapacity =
                    this._sum(
                        aSupervisors,
                        "overCapacity"
                    );

                var iAverageUtilization =
                    iCapacity > 0
                        ? Math.round(
                            iProgrammedLoad /
                            iCapacity *
                            100
                        )
                        : 0;

                var iAverageCompliance =
                    aSupervisors.length > 0
                        ? Math.round(
                            this._sum(
                                aSupervisors,
                                "compliance"
                            ) /
                            aSupervisors.length
                        )
                        : 0;

                var iGoal = 80;

                var iDifference =
                    iAverageCompliance -
                    iGoal;

                var aFormattedRows =
                    aSupervisors.map(
                        function (oSupervisor) {
                            return (
                                this._formatSupervisorRow(
                                    oSupervisor
                                )
                            );
                        }.bind(this)
                    );

                var oSummaryRow = null;

                if (aSupervisors.length > 0) {
                    oSummaryRow = {
                        id: "TOTAL",
                        supervisor: "Total general",
                        manager: "—",

                        resources: iResources,
                        resourcesDisplay:
                            this._formatNumber(
                                iResources
                            ),

                        capacity: iCapacity,
                        capacityDisplay:
                            this._formatNumber(
                                iCapacity
                            ),

                        programmedLoad:
                            iProgrammedLoad,
                        loadDisplay:
                            this._formatNumber(
                                iProgrammedLoad
                            ),

                        utilization:
                            iAverageUtilization,
                        utilizationDisplay:
                            iAverageUtilization + "%",

                        status: "—",
                        statusState: "None",

                        overCapacity:
                            iOverCapacity,
                        overCapacityDisplay:
                            this._formatNumber(
                                iOverCapacity
                            ),

                        compliance:
                            iAverageCompliance,
                        complianceDisplay:
                            iAverageCompliance + "%",

                        goal: iGoal,
                        goalDisplay:
                            iGoal + "%",

                        difference:
                            iDifference,
                        differenceDisplay:
                            this._formatDifference(
                                iDifference
                            ),

                        isTotal: true
                    };
                }

                oModel.setProperty(
                    "/supervisors",
                    aFormattedRows
                );

                oModel.setProperty(
                    "/filteredSupervisors",
                    aFormattedRows
                );

                oModel.setProperty(
                    "/summaryRow",
                    oSummaryRow
                );

                oModel.setProperty(
                    "/paging/currentPage",
                    1
                );

                oModel.setProperty(
                    "/kpis/activeSupervisors/value",
                    String(
                        aSupervisors.length
                    )
                );

                oModel.setProperty(
                    "/kpis/totalResources/value",
                    this._formatNumber(
                        iResources
                    )
                );

                oModel.setProperty(
                    "/kpis/availableCapacity/value",
                    this._formatNumber(
                        iCapacity
                    ) + " h"
                );

                oModel.setProperty(
                    "/kpis/programmedLoad/value",
                    this._formatNumber(
                        iProgrammedLoad
                    ) + " h"
                );

                oModel.setProperty(
                    "/kpis/averageUtilization/value",
                    iAverageUtilization + "%"
                );

                oModel.setProperty(
                    "/kpis/operationalCompliance/value",
                    iAverageCompliance + "%"
                );

                this._updatePagination();
                this._scheduleAdaptivePageSize();
            },

            /**
             * Actualiza las filas visibles y la información
             * de paginación.
             */
            _updatePagination: function () {

                var oModel =
                    this.getView().getModel("screen");

                var aFilteredSupervisors =
                    oModel.getProperty(
                        "/filteredSupervisors"
                    ) || [];

                var oSummaryRow =
                    oModel.getProperty(
                        "/summaryRow"
                    );

                var iPageSize =
                    Number(
                        oModel.getProperty(
                            "/pageSize"
                        )
                    ) || 2;

                var iCurrentPage =
                    Number(
                        oModel.getProperty(
                            "/paging/currentPage"
                        )
                    ) || 1;

                var iTotalRecords =
                    aFilteredSupervisors.length;

                var iTotalPages =
                    Math.max(
                        1,
                        Math.ceil(
                            iTotalRecords /
                            iPageSize
                        )
                    );

                if (iCurrentPage > iTotalPages) {
                    iCurrentPage = iTotalPages;
                }

                if (iCurrentPage < 1) {
                    iCurrentPage = 1;
                }

                var iStartIndex =
                    (
                        iCurrentPage -
                        1
                    ) *
                    iPageSize;

                var iEndIndex =
                    Math.min(
                        iStartIndex +
                        iPageSize,
                        iTotalRecords
                    );

                var aPageItems =
                    aFilteredSupervisors.slice(
                        iStartIndex,
                        iEndIndex
                    );

                /*
                 * La fila Total general se muestra en la última página.
                 */
                if (
                    oSummaryRow &&
                    iCurrentPage === iTotalPages
                ) {
                    aPageItems.push(
                        oSummaryRow
                    );
                }

                var iVisibleStart =
                    iTotalRecords === 0
                        ? 0
                        : iStartIndex + 1;

                var iVisibleEnd =
                    iTotalRecords === 0
                        ? 0
                        : iEndIndex;

                oModel.setProperty(
                    "/paging/currentPage",
                    iCurrentPage
                );

                oModel.setProperty(
                    "/paging/totalPages",
                    iTotalPages
                );

                oModel.setProperty(
                    "/pageItems",
                    aPageItems
                );

                oModel.setProperty(
                    "/paging/rangeText",
                    iVisibleStart +
                    " - " +
                    iVisibleEnd +
                    " de " +
                    iTotalRecords
                );
            },

            /**
             * Primera página.
             */
            onFirstPage: function () {

                var oModel =
                    this.getView().getModel("screen");

                oModel.setProperty(
                    "/paging/currentPage",
                    1
                );

                this._updatePagination();
            },

            /**
             * Página anterior.
             */
            onPreviousPage: function () {

                var oModel =
                    this.getView().getModel("screen");

                var iCurrentPage =
                    Number(
                        oModel.getProperty(
                            "/paging/currentPage"
                        )
                    ) || 1;

                if (iCurrentPage <= 1) {
                    return;
                }

                oModel.setProperty(
                    "/paging/currentPage",
                    iCurrentPage - 1
                );

                this._updatePagination();
            },

            /**
             * Página siguiente.
             */
            onNextPage: function () {

                var oModel =
                    this.getView().getModel("screen");

                var iCurrentPage =
                    Number(
                        oModel.getProperty(
                            "/paging/currentPage"
                        )
                    ) || 1;

                var iTotalPages =
                    Number(
                        oModel.getProperty(
                            "/paging/totalPages"
                        )
                    ) || 1;

                if (iCurrentPage >= iTotalPages) {
                    return;
                }

                oModel.setProperty(
                    "/paging/currentPage",
                    iCurrentPage + 1
                );

                this._updatePagination();
            },

            /**
             * Última página.
             */
            onLastPage: function () {

                var oModel =
                    this.getView().getModel("screen");

                var iTotalPages =
                    Number(
                        oModel.getProperty(
                            "/paging/totalPages"
                        )
                    ) || 1;

                oModel.setProperty(
                    "/paging/currentPage",
                    iTotalPages
                );

                this._updatePagination();
            },

            /**
             * Formatea una fila individual de supervisor.
             *
             * @param {Object} oSupervisor Información del supervisor
             * @returns {Object} Fila preparada para el modelo
             * @private
             */
            _formatSupervisorRow: function (
                oSupervisor
            ) {

                var iDifference =
                    oSupervisor.compliance -
                    oSupervisor.goal;

                return {
                    id: oSupervisor.id,

                    supervisor:
                        oSupervisor.supervisor,

                    manager:
                        oSupervisor.manager,

                    resources:
                        oSupervisor.resources,

                    resourcesDisplay:
                        this._formatNumber(
                            oSupervisor.resources
                        ),

                    capacity:
                        oSupervisor.capacity,

                    capacityDisplay:
                        this._formatNumber(
                            oSupervisor.capacity
                        ),

                    programmedLoad:
                        oSupervisor.programmedLoad,

                    loadDisplay:
                        this._formatNumber(
                            oSupervisor.programmedLoad
                        ),

                    utilization:
                        oSupervisor.utilization,

                    utilizationDisplay:
                        oSupervisor.utilization + "%",

                    status:
                        oSupervisor.status,

                    statusState:
                        oSupervisor.statusState,

                    overCapacity:
                        oSupervisor.overCapacity,

                    overCapacityDisplay:
                        this._formatNumber(
                            oSupervisor.overCapacity
                        ),

                    compliance:
                        oSupervisor.compliance,

                    complianceDisplay:
                        oSupervisor.compliance + "%",

                    goal:
                        oSupervisor.goal,

                    goalDisplay:
                        oSupervisor.goal + "%",

                    difference:
                        iDifference,

                    differenceDisplay:
                        this._formatDifference(
                            iDifference
                        ),

                    isTotal: false
                };
            },

            /**
             * Navega hacia Detalle operativo de recursos.
             */
            onViewSupervisor: function (oEvent) {

                var oSource =
                    oEvent.getSource();

                var oContext =
                    oSource.getBindingContext(
                        "screen"
                    );

                if (!oContext) {
                    return;
                }

                var sSupervisorId =
                    oContext.getProperty("id");

                var sSupervisorName =
                    oContext.getProperty(
                        "supervisor"
                    );

                var oModel =
                    this.getView().getModel(
                        "screen"
                    );

                oModel.setProperty(
                    "/selectedSupervisor",
                    {
                        id: sSupervisorId,
                        name: sSupervisorName
                    }
                );

                var oOwnerComponent =
                    this.getOwnerComponent();

                var oRouter =
                    oOwnerComponent &&
                    oOwnerComponent.getRouter
                        ? oOwnerComponent
                            .getRouter()
                        : null;

                var oDetailRoute =
                    oRouter &&
                    oRouter.getRoute
                        ? oRouter.getRoute(
                            "RouteDetalleOperativoRecursos"
                        )
                        : null;

                if (
                    oRouter &&
                    oDetailRoute
                ) {
                    oRouter.navTo(
                        "RouteDetalleOperativoRecursos"
                    );

                    return;
                }

                MessageToast.show(
                    "Supervisor seleccionado: " +
                    sSupervisorId
                );
            },

            /**
             * Agrega estilo a la fila total y vuelve a medir
             * la altura disponible.
             */
            onTableUpdateFinished: function () {

                var oTable =
                    this.byId("supervisorsTable");

                if (!oTable) {
                    return;
                }

                oTable.getItems().forEach(
                    function (oItem) {

                        var oContext =
                            oItem.getBindingContext(
                                "screen"
                            );

                        var bIsTotal =
                            oContext
                                ? Boolean(
                                    oContext.getProperty(
                                        "isTotal"
                                    )
                                )
                                : false;

                        oItem.toggleStyleClass(
                            "dosTotalRow",
                            bIsTotal
                        );
                    }
                );

                this._scheduleAdaptivePageSize();
            },

            /**
             * Suma una propiedad numérica.
             */
            _sum: function (
                aItems,
                sProperty
            ) {

                return aItems.reduce(
                    function (
                        iTotal,
                        oItem
                    ) {
                        return (
                            iTotal +
                            Number(
                                oItem[sProperty] ||
                                0
                            )
                        );
                    },
                    0
                );
            },

            /**
             * Formatea números con separador de miles.
             */
            _formatNumber: function (iValue) {

                return new Intl.NumberFormat(
                    "en-US",
                    {
                        maximumFractionDigits: 0
                    }
                ).format(
                    Number(iValue) || 0
                );
            },

            /**
             * Formatea una diferencia en puntos porcentuales.
             */
            _formatDifference: function (
                iDifference
            ) {

                var iNumericDifference =
                    Number(iDifference) || 0;

                if (iNumericDifference > 0) {
                    return (
                        "+" +
                        iNumericDifference +
                        " pp"
                    );
                }

                return (
                    iNumericDifference +
                    " pp"
                );
            }

        }
    );
});