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
        "mantenimiento.controller.DetalleOperativoRecursos",
        {

            /**
             * Inicialización de la pantalla.
             */
            onInit: function () {

                var aResources = [
                    {
                        id: "R001",
                        name: "Juan Pérez",
                        resourceType: "Mecánico",
                        zone: "Zona Norte",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "60.8",
                        utilization: 132,
                        assignedOrders: 6,
                        operations: 18
                    },
                    {
                        id: "R002",
                        name: "Luis Herrera",
                        resourceType: "Mecánico",
                        zone: "Zona Norte",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "55.1",
                        utilization: 120,
                        assignedOrders: 5,
                        operations: 15
                    },
                    {
                        id: "R003",
                        name: "Ana Rodríguez",
                        resourceType: "Mecánico",
                        zone: "Zona Centro",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "49.7",
                        utilization: 108,
                        assignedOrders: 4,
                        operations: 13
                    },
                    {
                        id: "R004",
                        name: "Marco Chávez",
                        resourceType: "Mecánico",
                        zone: "Zona Norte",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "39.1",
                        utilization: 85,
                        assignedOrders: 3,
                        operations: 9
                    },
                    {
                        id: "R005",
                        name: "Omar Campos",
                        resourceType: "Ayudante",
                        zone: "Zona Sur",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "29.9",
                        utilization: 65,
                        assignedOrders: 2,
                        operations: 6
                    },
                    {
                        id: "R006",
                        name: "Fernando López",
                        resourceType: "Ayudante",
                        zone: "Zona Centro",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "27.6",
                        utilization: 60,
                        assignedOrders: 2,
                        operations: 5
                    },
                    {
                        id: "R007",
                        name: "Diego García",
                        resourceType: "Mecánico",
                        zone: "Zona Sur",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "52.9",
                        utilization: 115,
                        assignedOrders: 5,
                        operations: 14
                    },
                    {
                        id: "R008",
                        name: "Eduardo Vega",
                        resourceType: "Mecánico",
                        zone: "Zona Norte",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "44.6",
                        utilization: 97,
                        assignedOrders: 4,
                        operations: 11
                    },
                    {
                        id: "R009",
                        name: "Ricardo Martínez",
                        resourceType: "Ayudante",
                        zone: "Zona Sur",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "23.0",
                        utilization: 50,
                        assignedOrders: 1,
                        operations: 4
                    },
                    {
                        id: "R010",
                        name: "José Vargas",
                        resourceType: "Ayudante",
                        zone: "Zona Centro",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "41.0",
                        utilization: 89,
                        assignedOrders: 3,
                        operations: 5
                    },
                    {
                        id: "R011",
                        name: "Pedro Torres",
                        resourceType: "Mecánico",
                        zone: "Zona Norte",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "66.7",
                        utilization: 145,
                        assignedOrders: 7,
                        operations: 20
                    },
                    {
                        id: "R012",
                        name: "Guillermo Bautista",
                        resourceType: "Ayudante",
                        zone: "Zona Sur",
                        shift: "Matutino",
                        availableCapacity: "46.0",
                        scheduledLoad: "35.9",
                        utilization: 78,
                        assignedOrders: 2,
                        operations: 7
                    }
                ];

                aResources.forEach(function (oResource) {
                    this._assignResourceStatus(oResource);
                }.bind(this));

                var oData = {

                    supervisor: {
                        id: "SUP001",
                        name: "Sergio Ramírez",
                        zone: "Zona Norte",
                        shift: "Matutino"
                    },

                    filters: {
                        zone: "ALL",
                        resourceType: "ALL",
                        shift: "ALL",
                        status: "ALL",
                        search: ""
                    },

                    filterOptions: {

                        zones: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "Zona Norte",
                                text: "Zona Norte"
                            },
                            {
                                key: "Zona Centro",
                                text: "Zona Centro"
                            },
                            {
                                key: "Zona Sur",
                                text: "Zona Sur"
                            }
                        ],

                        resourceTypes: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "Mecánico",
                                text: "Mecánico"
                            },
                            {
                                key: "Ayudante",
                                text: "Ayudante"
                            }
                        ],

                        shifts: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "Matutino",
                                text: "Matutino"
                            },
                            {
                                key: "Vespertino",
                                text: "Vespertino"
                            },
                            {
                                key: "Nocturno",
                                text: "Nocturno"
                            }
                        ],

                        statuses: [
                            {
                                key: "ALL",
                                text: "Todos"
                            },
                            {
                                key: "bajo",
                                text: "Bajo"
                            },
                            {
                                key: "normal",
                                text: "Normal"
                            },
                            {
                                key: "alto",
                                text: "Alto"
                            },
                            {
                                key: "critico",
                                text: "Crítico"
                            }
                        ]
                    },

                    resources: aResources,
                    filteredResources: [],
                    pageItems: [],

                    kpis: {
                        total: {
                            count: 0,
                            description: ""
                        },
                        low: {
                            count: 0,
                            percent: 0
                        },
                        normal: {
                            count: 0,
                            percent: 0
                        },
                        high: {
                            count: 0,
                            percent: 0
                        },
                        critical: {
                            count: 0,
                            percent: 0
                        }
                    },

                    /*
                     * Valor inicial seguro para pantallas de poca altura.
                     * Después del renderizado se recalcula automáticamente
                     * según el espacio vertical realmente disponible.
                     */
                    pageSize: 4,
                    currentPage: 1,
                    totalPages: 1,
                    totalFiltered: 0,
                    showingText: ""
                };

                var oModel = new JSONModel(oData);

                oModel.setSizeLimit(500);

                this.getView().setModel(oModel, "detalle");

                Device.resize.attachHandler(
                    this._onViewportResize,
                    this
                );

                this._applyFilters(false);
            },

            /**
             * Después de renderizar la vista se calcula cuántas filas
             * caben realmente en el espacio visible.
             */
            onAfterRendering: function () {
                this._scheduleAdaptivePageSize();
            },

            /**
             * Libera el evento y el temporizador al salir de la vista.
             */
            onExit: function () {

                Device.resize.detachHandler(
                    this._onViewportResize,
                    this
                );

                if (this._iAdaptivePageSizeTimer) {
                    clearTimeout(this._iAdaptivePageSizeTimer);
                    this._iAdaptivePageSizeTimer = null;
                }
            },

            /**
             * Atiende cambios de tamaño de la ventana.
             */
            _onViewportResize: function () {
                this._scheduleAdaptivePageSize();
            },

            /**
             * Evita ejecutar varios cálculos seguidos durante un resize.
             */
            _scheduleAdaptivePageSize: function () {

                if (this._iAdaptivePageSizeTimer) {
                    clearTimeout(this._iAdaptivePageSizeTimer);
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
             * Calcula el número de filas que caben entre la cabecera
             * de la tabla y el pie de paginación.
             *
             * El cálculo usa el alto real del viewport, no la resolución
             * física del monitor. Por eso también considera el espacio
             * ocupado por el navegador y el SAP Fiori Launchpad.
             */
            _updateAdaptivePageSize: function () {

                var oModel = this.getView().getModel("detalle");
                var oTable = this.byId("resourcesTable");
                var oTableDom = oTable && oTable.getDomRef();
                var oViewDom = this.getView().getDomRef();

                if (!oModel || !oTableDom || !oViewDom) {
                    return;
                }

                var oResourcesCardDom =
                    oViewDom.querySelector(".resourcesCard");

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

                var oFirstRowDom =
                    oTableDom.querySelector(".sapMListTblRow");

                if (!oResourcesCardDom) {
                    return;
                }

                var iRowHeight = oFirstRowDom
                    ? oFirstRowDom.getBoundingClientRect().height
                    : 29;

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
                        document.documentElement.clientHeight ||
                        0;
                }

                var iCardBottom =
                    oResourcesCardDom
                        .getBoundingClientRect()
                        .bottom;

                /*
                 * Espacio realmente libre debajo de la card.
                 * Este método también considera la altura del shell,
                 * del navegador y cualquier zoom aplicado.
                 */
                var iFreeSpace =
                    iViewportBottom -
                    iCardBottom;

                var iCurrentPageSize =
                    Number(oModel.getProperty("/pageSize")) || 4;

                var iCalculatedPageSize =
                    iCurrentPageSize;

                /*
                 * Dejamos un margen pequeño para evitar que aparezca
                 * scroll por diferencias de redondeo de uno o dos píxeles.
                 */
                var iSafetySpace = 8;

                if (iFreeSpace > iRowHeight + iSafetySpace) {

                    iCalculatedPageSize += Math.floor(
                        (iFreeSpace - iSafetySpace) /
                        Math.max(iRowHeight, 1)
                    );

                } else if (iFreeSpace < -iSafetySpace) {

                    iCalculatedPageSize -= Math.ceil(
                        Math.abs(iFreeSpace + iSafetySpace) /
                        Math.max(iRowHeight, 1)
                    );
                }

                /*
                 * Nunca se muestran menos de 3 filas ni más registros
                 * que los disponibles en el resultado filtrado.
                 */
                var iTotalFiltered =
                    Number(oModel.getProperty("/totalFiltered")) || 0;

                var iMaximumPageSize =
                    Math.max(3, Math.min(iTotalFiltered || 12, 12));

                iCalculatedPageSize = Math.max(
                    3,
                    Math.min(
                        iCalculatedPageSize,
                        iMaximumPageSize
                    )
                );

                if (
                    iCalculatedPageSize ===
                    iCurrentPageSize
                ) {
                    return;
                }

                /*
                 * Conserva, en lo posible, el primer registro que el
                 * usuario estaba viendo antes del cambio de tamaño.
                 */
                var iCurrentPage =
                    Number(oModel.getProperty("/currentPage")) || 1;

                var iFirstVisibleIndex =
                    (iCurrentPage - 1) *
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
                    "/currentPage",
                    iNewCurrentPage
                );

                this._updatePagination();

                /*
                 * Segunda medición después de que SAPUI5 renderice
                 * la nueva cantidad de filas. Esto elimina el espacio
                 * muerto restante sin provocar un ciclo infinito:
                 * cuando ya no cabe otra fila, el tamaño no cambia.
                 */
                this._scheduleAdaptivePageSize();
            },

            /**
             * Asigna estatus y colores según la utilización.
             *
             * Bajo:     0% a 70%
             * Normal:  71% a 100%
             * Alto:   101% a 120%
             * Crítico: mayor a 120%
             */
            _assignResourceStatus: function (oResource) {

                var iUtilization = Number(oResource.utilization);

                oResource.utilizationText = iUtilization + "%";

                if (iUtilization <= 70) {

                    oResource.status = "Bajo";
                    oResource.statusKey = "bajo";
                    oResource.statusState = "Success";
                    oResource.utilizationState = "Success";

                    return;
                }

                if (iUtilization <= 100) {

                    oResource.status = "Normal";
                    oResource.statusKey = "normal";
                    oResource.statusState = "Success";
                    oResource.utilizationState = "Success";

                    return;
                }

                if (iUtilization <= 120) {

                    oResource.status = "Alto";
                    oResource.statusKey = "alto";
                    oResource.statusState = "Warning";
                    oResource.utilizationState = "Warning";

                    return;
                }

                oResource.status = "Crítico";
                oResource.statusKey = "critico";
                oResource.statusState = "Error";
                oResource.utilizationState = "Error";
            },

            /**
             * Aplica los filtros seleccionados.
             */
            onApplyFilters: function () {
                this._applyFilters(true);
            },

            /**
             * Filtra al escribir en la búsqueda.
             */
            onSearch: function (oEvent) {

                var oModel = this.getView().getModel("detalle");
                var sValue = oEvent.getParameter("newValue");

                if (sValue === undefined) {
                    sValue = oEvent.getParameter("query") || "";
                }

                oModel.setProperty("/filters/search", sValue);

                this._applyFilters(false);
            },

            /**
             * Ejecuta la lógica general de filtros.
             */
            _applyFilters: function (bShowMessage) {

                var oModel = this.getView().getModel("detalle");
                var oData = oModel.getData();
                var oFilters = oData.filters;

                var sSearch = this._normalizeText(oFilters.search);

                var aFilteredResources = oData.resources.filter(function (oResource) {

                    var bZone =
                        oFilters.zone === "ALL" ||
                        oResource.zone === oFilters.zone;

                    var bResourceType =
                        oFilters.resourceType === "ALL" ||
                        oResource.resourceType === oFilters.resourceType;

                    var bShift =
                        oFilters.shift === "ALL" ||
                        oResource.shift === oFilters.shift;

                    var bStatus =
                        oFilters.status === "ALL" ||
                        oResource.statusKey === oFilters.status;

                    var sSearchableText = this._normalizeText(
                        [
                            oResource.name,
                            oResource.resourceType,
                            oResource.zone,
                            oResource.shift,
                            oResource.status
                        ].join(" ")
                    );

                    var bSearch =
                        !sSearch ||
                        sSearchableText.indexOf(sSearch) !== -1;

                    return (
                        bZone &&
                        bResourceType &&
                        bShift &&
                        bStatus &&
                        bSearch
                    );

                }.bind(this));

                oModel.setProperty("/filteredResources", aFilteredResources);
                oModel.setProperty("/totalFiltered", aFilteredResources.length);
                oModel.setProperty("/currentPage", 1);

                this._updateKpis(aFilteredResources);
                this._updatePagination();

                if (bShowMessage) {
                    MessageToast.show("Filtros aplicados");
                }
            },

            /**
             * Actualiza los KPI con base en el resultado filtrado.
             */
            _updateKpis: function (aResources) {

                var oModel = this.getView().getModel("detalle");

                var iTotal = aResources.length;
                var iMechanics = 0;
                var iAssistants = 0;
                var iLow = 0;
                var iNormal = 0;
                var iHigh = 0;
                var iCritical = 0;

                aResources.forEach(function (oResource) {

                    if (oResource.resourceType === "Mecánico") {
                        iMechanics += 1;
                    }

                    if (oResource.resourceType === "Ayudante") {
                        iAssistants += 1;
                    }

                    switch (oResource.statusKey) {

                    case "bajo":
                        iLow += 1;
                        break;

                    case "normal":
                        iNormal += 1;
                        break;

                    case "alto":
                        iHigh += 1;
                        break;

                    case "critico":
                        iCritical += 1;
                        break;

                    default:
                        break;
                    }
                });

                oModel.setProperty("/kpis/total/count", iTotal);

                oModel.setProperty(
                    "/kpis/total/description",
                    "Mecánicos " +
                        iMechanics +
                        " | Ayudantes " +
                        iAssistants
                );

                oModel.setProperty("/kpis/low/count", iLow);
                oModel.setProperty(
                    "/kpis/low/percent",
                    this._calculatePercentage(iLow, iTotal)
                );

                oModel.setProperty("/kpis/normal/count", iNormal);
                oModel.setProperty(
                    "/kpis/normal/percent",
                    this._calculatePercentage(iNormal, iTotal)
                );

                oModel.setProperty("/kpis/high/count", iHigh);
                oModel.setProperty(
                    "/kpis/high/percent",
                    this._calculatePercentage(iHigh, iTotal)
                );

                oModel.setProperty("/kpis/critical/count", iCritical);
                oModel.setProperty(
                    "/kpis/critical/percent",
                    this._calculatePercentage(iCritical, iTotal)
                );
            },

            /**
             * Calcula porcentajes redondeados.
             */
            _calculatePercentage: function (iValue, iTotal) {

                if (!iTotal) {
                    return 0;
                }

                return Math.round((iValue / iTotal) * 100);
            },

            /**
             * Actualiza los datos visibles y el texto de paginación.
             */
            _updatePagination: function () {

                var oModel = this.getView().getModel("detalle");

                var aFilteredResources =
                    oModel.getProperty("/filteredResources") || [];

                /*
                 * El valor de respaldo queda en 4. Después del renderizado
                 * se sustituye por el número de filas que realmente caben.
                 */
                var iPageSize =
                    Number(oModel.getProperty("/pageSize")) || 4;

                var iCurrentPage =
                    Number(oModel.getProperty("/currentPage")) || 1;

                var iTotalResources = aFilteredResources.length;

                var iTotalPages = Math.max(
                    1,
                    Math.ceil(iTotalResources / iPageSize)
                );

                if (iCurrentPage > iTotalPages) {
                    iCurrentPage = iTotalPages;
                }

                if (iCurrentPage < 1) {
                    iCurrentPage = 1;
                }

                var iStartIndex =
                    (iCurrentPage - 1) * iPageSize;

                var iEndIndex =
                    Math.min(iStartIndex + iPageSize, iTotalResources);

                var aPageItems =
                    aFilteredResources.slice(iStartIndex, iEndIndex);

                var iVisibleStart =
                    iTotalResources === 0 ? 0 : iStartIndex + 1;

                var iVisibleEnd =
                    iTotalResources === 0 ? 0 : iEndIndex;

                oModel.setProperty("/currentPage", iCurrentPage);
                oModel.setProperty("/totalPages", iTotalPages);
                oModel.setProperty("/pageItems", aPageItems);

                oModel.setProperty(
                    "/showingText",
                    "Mostrando " +
                        iVisibleStart +
                        " a " +
                        iVisibleEnd +
                        " de " +
                        iTotalResources +
                        " recursos"
                );
            },

            /**
             * Página anterior.
             */
            onPreviousPage: function () {

                var oModel = this.getView().getModel("detalle");
                var iCurrentPage =
                    Number(oModel.getProperty("/currentPage"));

                if (iCurrentPage <= 1) {
                    return;
                }

                oModel.setProperty(
                    "/currentPage",
                    iCurrentPage - 1
                );

                this._updatePagination();
            },

            /**
             * Página siguiente.
             */
            onNextPage: function () {

                var oModel = this.getView().getModel("detalle");

                var iCurrentPage =
                    Number(oModel.getProperty("/currentPage"));

                var iTotalPages =
                    Number(oModel.getProperty("/totalPages"));

                if (iCurrentPage >= iTotalPages) {
                    return;
                }

                oModel.setProperty(
                    "/currentPage",
                    iCurrentPage + 1
                );

                this._updatePagination();
            },

            /**
             * Acción principal: Ver detalle.
             */
            onViewDetail: function (oEvent) {

                var oContext =
                    oEvent.getSource().getBindingContext("detalle");

                if (!oContext) {
                    return;
                }

                var oResource = oContext.getObject();

                MessageToast.show(
                    "Detalle seleccionado: " + oResource.name
                );

                /*
                 * Cuando se configure la ruta en manifest.json:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo("DetalleResponsable", {
                 *         recursoId: oResource.id
                 *     });
                 */
            },

            /**
             * Botón de filtro de la card de recursos.
             */
            onTableFilter: function () {
                MessageToast.show("Filtros de recursos");
            },

            /**
             * Normaliza texto para búsquedas sin distinguir
             * mayúsculas, minúsculas o acentos.
             */
            _normalizeText: function (sValue) {

                return String(sValue || "")
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim();
            }

        }
    );
});