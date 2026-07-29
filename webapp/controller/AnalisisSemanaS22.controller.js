sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/routing/History",
    "sap/ui/dom/includeStylesheet",
    "sap/ui/core/Item"
], function (
    Controller,
    JSONModel,
    History,
    includeStylesheet,
    Item
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.AnalisisSemanaS22",
        {

            /**
             * Inicialización del dashboard.
             */
            onInit: function () {
                this._loadViewStyles();

                this._iCurrentPage = 1;
                this._iPageSize = 10;
                this._sSearchValue = "";
                this._sSelectedZone = "all";

                this._aAllOrders = this._getOrders();
                this._aFilteredOrders = this._aAllOrders.slice();

                var oModel = new JSONModel({
                    results: [],

                    filters: {
                        week: "s22",
                        zone: "all",
                        search: ""
                    },

                    summary: {
                        plannedOrders: 84,
                        executedOrders: 63,
                        notExecutedOrders: 21,
                        compliance: 75,
                        clientsImpact: 61,
                        elevatorsImpact: 35,
                        zonesImpact: 71
                    },

                    pagination: {
                        currentPage: 1,
                        pageSize: 10,
                        totalPages: 3,
                        totalResults: 21,
                        from: 1,
                        to: 10,
                        canGoPrevious: false,
                        canGoNext: true,
                        summaryText: "Mostrando 1 a 10 de 21 resultados"
                    }
                });

                oModel.setSizeLimit(100);
                this.getView().setModel(oModel, "otModel");

                this._populateZoneSelect();
                this._applyFilters();
            },

            /**
             * Carga el CSS exclusivo de la vista.
             */
            _loadViewStyles: function () {
                var sStylesheetId = "analisisSemanaS22Stylesheet";

                if (!document.getElementById(sStylesheetId)) {
                    var sRootPath = sap.ui.require.toUrl("mantenimiento");

                    includeStylesheet(
                        sRootPath + "/css/AnalisisSemanaS22.css",
                        sStylesheetId
                    );
                }
            },

            /**
             * Agrega las zonas disponibles al Select.
             */
            _populateZoneSelect: function () {
                var oZoneSelect = this.byId("idZonaSelect");

                if (!oZoneSelect) {
                    return;
                }

                var aZones = this._aAllOrders
                    .map(function (oOrder) {
                        return oOrder.zona;
                    })
                    .filter(function (sZone, iIndex, aArray) {
                        return aArray.indexOf(sZone) === iIndex;
                    })
                    .sort();

                aZones.forEach(function (sZone) {
                    oZoneSelect.addItem(
                        new Item({
                            key: sZone,
                            text: sZone
                        })
                    );
                });
            },

            /**
             * Devuelve las órdenes mostradas en la tabla.
             */
            _getOrders: function () {
                var aOrders = [
                    {
                        prioridad: "CRÍTICA",
                        ot: "OT100245",
                        cliente: "Torre Reforma",
                        zona: "Centro",
                        elevador: "EV1024",
                        causa: "Carta de no mantenimiento",
                        responsable: "Juan Pérez",
                        estado: "No ejecutada",
                        contribucion: 19
                    },
                    {
                        prioridad: "CRÍTICA",
                        ot: "OT100618",
                        cliente: "Torre Reforma",
                        zona: "Centro",
                        elevador: "EV0871",
                        causa: "Carta de no mantenimiento",
                        responsable: "Juan Pérez",
                        estado: "No ejecutada",
                        contribucion: 16
                    },
                    {
                        prioridad: "ALTA",
                        ot: "OT100301",
                        cliente: "Plaza Satélite",
                        zona: "Norte",
                        elevador: "EV0442",
                        causa: "Falta de refacciones",
                        responsable: "María López",
                        estado: "No ejecutada",
                        contribucion: 10
                    },
                    {
                        prioridad: "MEDIA",
                        ot: "OT100512",
                        cliente: "Hospital San José",
                        zona: "Norte",
                        elevador: "EV0615",
                        causa: "Cliente no disponible",
                        responsable: "Carlos Ruiz",
                        estado: "No ejecutada",
                        contribucion: 7
                    },
                    {
                        prioridad: "MEDIA",
                        ot: "OT100702",
                        cliente: "Centro Comercial Perisur",
                        zona: "Sur",
                        elevador: "EV0301",
                        causa: "Falta de refacciones",
                        responsable: "Luis Martínez",
                        estado: "No ejecutada",
                        contribucion: 5
                    },
                    {
                        prioridad: "MEDIA",
                        ot: "OT100755",
                        cliente: "World Trade Center",
                        zona: "Centro",
                        elevador: "EV0920",
                        causa: "Cliente no disponible",
                        responsable: "María López",
                        estado: "No ejecutada",
                        contribucion: 4
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT100812",
                        cliente: "Plaza Satélite",
                        zona: "Norte",
                        elevador: "EV0442",
                        causa: "Carta de no mantenimiento",
                        responsable: "Carlos Ruiz",
                        estado: "No ejecutada",
                        contribucion: 4
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT100901",
                        cliente: "Hospital San José",
                        zona: "Norte",
                        elevador: "EV0615",
                        causa: "Falta de refacciones",
                        responsable: "Luis Martínez",
                        estado: "No ejecutada",
                        contribucion: 3
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101005",
                        cliente: "Torre Reforma",
                        zona: "Centro",
                        elevador: "EV1024",
                        causa: "Carta de no mantenimiento",
                        responsable: "Juan Pérez",
                        estado: "No ejecutada",
                        contribucion: 3
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101120",
                        cliente: "Centro Comercial Santa Fe",
                        zona: "Centro",
                        elevador: "EV0703",
                        causa: "Cliente no disponible",
                        responsable: "María López",
                        estado: "No ejecutada",
                        contribucion: 2
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101205",
                        cliente: "Corporativo Polanco",
                        zona: "Centro",
                        elevador: "EV0518",
                        causa: "Acceso restringido",
                        responsable: "Juan Pérez",
                        estado: "No ejecutada",
                        contribucion: 2
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101244",
                        cliente: "Plaza Universidad",
                        zona: "Sur",
                        elevador: "EV0336",
                        causa: "Cliente no disponible",
                        responsable: "Carlos Ruiz",
                        estado: "No ejecutada",
                        contribucion: 2
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101308",
                        cliente: "Hospital Ángeles",
                        zona: "Sur",
                        elevador: "EV0281",
                        causa: "Falta de refacciones",
                        responsable: "Luis Martínez",
                        estado: "No ejecutada",
                        contribucion: 2
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101355",
                        cliente: "Centro Médico Nacional",
                        zona: "Centro",
                        elevador: "EV0956",
                        causa: "Personal no disponible",
                        responsable: "María López",
                        estado: "No ejecutada",
                        contribucion: 1
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101402",
                        cliente: "Plaza Lindavista",
                        zona: "Norte",
                        elevador: "EV0417",
                        causa: "Acceso restringido",
                        responsable: "Carlos Ruiz",
                        estado: "No ejecutada",
                        contribucion: 1
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101466",
                        cliente: "Corporativo Insurgentes",
                        zona: "Sur",
                        elevador: "EV0764",
                        causa: "Cliente no disponible",
                        responsable: "Luis Martínez",
                        estado: "No ejecutada",
                        contribucion: 1
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101519",
                        cliente: "Torre Virreyes",
                        zona: "Centro",
                        elevador: "EV1082",
                        causa: "Carta de no mantenimiento",
                        responsable: "Juan Pérez",
                        estado: "No ejecutada",
                        contribucion: 1
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101578",
                        cliente: "Plaza Aragón",
                        zona: "Norte",
                        elevador: "EV0468",
                        causa: "Falta de refacciones",
                        responsable: "María López",
                        estado: "No ejecutada",
                        contribucion: 1
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101625",
                        cliente: "Hospital ABC",
                        zona: "Centro",
                        elevador: "EV0972",
                        causa: "Personal no disponible",
                        responsable: "Carlos Ruiz",
                        estado: "No ejecutada",
                        contribucion: 1
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101684",
                        cliente: "Centro Comercial Manacar",
                        zona: "Sur",
                        elevador: "EV0327",
                        causa: "Acceso restringido",
                        responsable: "Luis Martínez",
                        estado: "No ejecutada",
                        contribucion: 1
                    },
                    {
                        prioridad: "BAJA",
                        ot: "OT101742",
                        cliente: "Torre Mayor",
                        zona: "Centro",
                        elevador: "EV1016",
                        causa: "Cliente no disponible",
                        responsable: "Juan Pérez",
                        estado: "No ejecutada",
                        contribucion: 1
                    }
                ];

                /*
                 * En el diseño original, los iconos de filtro aparecen
                 * únicamente en las dos primeras órdenes.
                 */
                aOrders.forEach(function (oOrder, iIndex) {
                    oOrder.showFilterIcon = iIndex < 2;
                });

                return aOrders;
            },

            /**
             * Aplica los filtros seleccionados desde la cabecera.
             */
            onApplyFilters: function () {
                var oWeekSelect = this.byId("idSemanaSelect");
                var oZoneSelect = this.byId("idZonaSelect");
                var oModel = this.getView().getModel("otModel");

                this._sSelectedZone = oZoneSelect
                    ? oZoneSelect.getSelectedKey()
                    : "all";

                oModel.setProperty(
                    "/filters/week",
                    oWeekSelect
                        ? oWeekSelect.getSelectedKey()
                        : "s22"
                );

                oModel.setProperty(
                    "/filters/zone",
                    this._sSelectedZone
                );

                this._applyFilters();
            },

            /**
             * Busca coincidencias en todas las columnas principales.
             */
            onSearch: function (oEvent) {
                var sValue = oEvent.getParameter("newValue");

                if (sValue === undefined) {
                    sValue = oEvent.getParameter("query");
                }

                this._sSearchValue = String(sValue || "").trim();

                this.getView()
                    .getModel("otModel")
                    .setProperty(
                        "/filters/search",
                        this._sSearchValue
                    );

                this._applyFilters();
            },

            /**
             * Ejecuta búsqueda y filtrado sobre el arreglo original.
             */
            _applyFilters: function () {
                var sSearchValue = this._normalizeText(
                    this._sSearchValue
                );

                var sSelectedZone = this._sSelectedZone;

                this._aFilteredOrders = this._aAllOrders.filter(
                    function (oOrder) {
                        var bMatchesZone =
                            sSelectedZone === "all" ||
                            oOrder.zona === sSelectedZone;

                        if (!bMatchesZone) {
                            return false;
                        }

                        if (!sSearchValue) {
                            return true;
                        }

                        var aSearchableValues = [
                            oOrder.prioridad,
                            oOrder.ot,
                            oOrder.cliente,
                            oOrder.zona,
                            oOrder.elevador,
                            oOrder.causa,
                            oOrder.responsable,
                            oOrder.estado,
                            oOrder.contribucion
                        ];

                        return aSearchableValues.some(
                            function (vValue) {
                                return this
                                    ._normalizeText(vValue)
                                    .includes(sSearchValue);
                            }.bind(this)
                        );
                    }.bind(this)
                );

                this._aFilteredOrders.sort(
                    function (oOrderA, oOrderB) {
                        return (
                            Number(oOrderB.contribucion) -
                            Number(oOrderA.contribucion)
                        );
                    }
                );

                this._renderPage(1);
            },

            /**
             * Normaliza texto para búsquedas sin distinguir
             * mayúsculas ni acentos.
             */
            _normalizeText: function (vValue) {
                return String(
                    vValue === null || vValue === undefined
                        ? ""
                        : vValue
                )
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "");
            },

            /**
             * Actualiza los registros visibles según la página.
             */
            _renderPage: function (iRequestedPage) {
                var oModel = this.getView().getModel("otModel");
                var iTotalResults = this._aFilteredOrders.length;

                var iTotalPages = Math.max(
                    1,
                    Math.ceil(
                        iTotalResults / this._iPageSize
                    )
                );

                var iCurrentPage = Math.min(
                    Math.max(
                        Number(iRequestedPage) || 1,
                        1
                    ),
                    iTotalPages
                );

                var iStartIndex =
                    (iCurrentPage - 1) * this._iPageSize;

                var iEndIndex = Math.min(
                    iStartIndex + this._iPageSize,
                    iTotalResults
                );

                var aPageResults =
                    this._aFilteredOrders.slice(
                        iStartIndex,
                        iEndIndex
                    );

                var iFrom =
                    iTotalResults === 0
                        ? 0
                        : iStartIndex + 1;

                var iTo =
                    iTotalResults === 0
                        ? 0
                        : iEndIndex;

                this._iCurrentPage = iCurrentPage;

                oModel.setProperty(
                    "/results",
                    aPageResults
                );

                oModel.setProperty(
                    "/pagination/currentPage",
                    iCurrentPage
                );

                oModel.setProperty(
                    "/pagination/pageSize",
                    this._iPageSize
                );

                oModel.setProperty(
                    "/pagination/totalPages",
                    iTotalPages
                );

                oModel.setProperty(
                    "/pagination/totalResults",
                    iTotalResults
                );

                oModel.setProperty(
                    "/pagination/from",
                    iFrom
                );

                oModel.setProperty(
                    "/pagination/to",
                    iTo
                );

                oModel.setProperty(
                    "/pagination/canGoPrevious",
                    iCurrentPage > 1
                );

                oModel.setProperty(
                    "/pagination/canGoNext",
                    iCurrentPage < iTotalPages
                );

                oModel.setProperty(
                    "/pagination/summaryText",
                    "Mostrando " +
                        iFrom +
                        " a " +
                        iTo +
                        " de " +
                        iTotalResults +
                        " resultados"
                );
            },

            /**
             * Cambia la cantidad de registros por página.
             */
            onRowsPerPageChange: function (oEvent) {
                var sSelectedKey =
                    oEvent.getSource().getSelectedKey();

                var iPageSize = parseInt(
                    sSelectedKey,
                    10
                );

                this._iPageSize = Number.isNaN(iPageSize)
                    ? 10
                    : iPageSize;

                this._renderPage(1);
            },

            /**
             * Navega a una página específica.
             */
            onGoToPage: function (oEvent) {
                var iPage = parseInt(
                    oEvent.getSource().getText(),
                    10
                );

                if (!Number.isNaN(iPage)) {
                    this._renderPage(iPage);
                }
            },

            /**
             * Navega a la página anterior.
             */
            onPreviousPage: function () {
                if (this._iCurrentPage > 1) {
                    this._renderPage(
                        this._iCurrentPage - 1
                    );
                }
            },

            /**
             * Navega a la página siguiente.
             */
            onNextPage: function () {
                var oPagination = this.getView()
                    .getModel("otModel")
                    .getProperty("/pagination");

                if (
                    this._iCurrentPage <
                    oPagination.totalPages
                ) {
                    this._renderPage(
                        this._iCurrentPage + 1
                    );
                }
            },

            /**
             * Regresa a la pantalla anterior.
             */
            onNavBack: function () {
                var oHistory = History.getInstance();
                var sPreviousHash =
                    oHistory.getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
                    return;
                }

                this.getOwnerComponent()
                    .getRouter()
                    .navTo(
                        "RouteMantenimiento",
                        {},
                        true
                    );
            }
        }
    );
});