sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (
    Controller,
    JSONModel,
    MessageToast,
    History
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleEquiposBloqueados",
        {

            onInit: function () {
                this._aAllRows = this._getMockRows();

                var oModel = new JSONModel({
                    filters: {
                        periodo: "Personalizado",
                        fechaDesde: "2025-04-01",
                        fechaHasta: "2025-04-30",
                        zona: "Todas",
                        cliente: "Todos",
                        estatusBloqueo: "Todos",
                        supervisor: "Todos",
                        responsable: "Todos",
                        busqueda: "",
                        prioridad: "Todas"
                    },

                    kpis: {
                        equiposFiltrados: 128,
                        criticos: 42,
                        mayoresTreintaDias: 37,
                        pendientesAbiertos: 121
                    },

                    rows: this._aAllRows,

                    pagination: {
                        currentPage: 1,
                        totalPages: 7,
                        pageSize: "20",
                        totalRecords: 128,
                        rangeText: "Mostrando 1 a 20 de 128 registros"
                    }
                });

                oModel.setSizeLimit(500);

                this.getView().setModel(oModel, "dashboard");
            },

            /* =========================================================
             * FILTROS
             * ========================================================= */

            onApplyFilters: function () {
                var oModel = this.getView().getModel("dashboard");
                var oFilters = oModel.getProperty("/filters");

                var aFilteredRows = this._aAllRows.filter(function (oRow) {
                    var sSearch = (
                        oFilters.busqueda || ""
                    ).toLowerCase();

                    var bMatchesSearch =
                        !sSearch ||
                        oRow.equipo.toLowerCase().includes(sSearch) ||
                        oRow.cliente.toLowerCase().includes(sSearch);

                    var bMatchesZone =
                        oFilters.zona === "Todas" ||
                        oRow.zona === oFilters.zona;

                    var bMatchesClient =
                        oFilters.cliente === "Todos" ||
                        oRow.cliente === oFilters.cliente;

                    var bMatchesBlockStatus =
                        oFilters.estatusBloqueo === "Todos" ||
                        oRow.estatusBloqueo ===
                            oFilters.estatusBloqueo;

                    var bMatchesResponsible =
                        oFilters.responsable === "Todos" ||
                        oRow.responsable === oFilters.responsable;

                    var bMatchesPriority =
                        oFilters.prioridad === "Todas" ||
                        oRow.prioridadDesbloqueo ===
                            oFilters.prioridad;

                    return (
                        bMatchesSearch &&
                        bMatchesZone &&
                        bMatchesClient &&
                        bMatchesBlockStatus &&
                        bMatchesResponsible &&
                        bMatchesPriority
                    );
                });

                oModel.setProperty("/rows", aFilteredRows);

                MessageToast.show("Filtros aplicados");
            },

            onFilterChange: function () {
                /*
                 * Los filtros se ejecutan mediante el botón
                 * Aplicar filtros.
                 */
            },

            onEquipmentSearch: function (oEvent) {
                var sValue = oEvent.getParameter("newValue");

                if (sValue === undefined) {
                    sValue = oEvent.getParameter("query");
                }

                sValue = sValue || "";

                var oModel = this.getView().getModel("dashboard");

                oModel.setProperty(
                    "/filters/busqueda",
                    sValue
                );

                var sSearch = sValue.toLowerCase();

                var aFilteredRows = this._aAllRows.filter(
                    function (oRow) {
                        return (
                            !sSearch ||
                            oRow.equipo
                                .toLowerCase()
                                .includes(sSearch) ||
                            oRow.cliente
                                .toLowerCase()
                                .includes(sSearch)
                        );
                    }
                );

                oModel.setProperty("/rows", aFilteredRows);
            },

            onRemoveOriginChip: function () {
                MessageToast.show(
                    "Filtro de origen eliminado"
                );
            },

            onRemovePriorityChip: function () {
                var oModel = this.getView().getModel(
                    "dashboard"
                );

                oModel.setProperty(
                    "/filters/prioridad",
                    "Todas"
                );

                oModel.setProperty(
                    "/rows",
                    this._aAllRows
                );

                MessageToast.show(
                    "Filtro de prioridad eliminado"
                );
            },

            /* =========================================================
             * ACCIONES DE LA TABLA
             * ========================================================= */

            onTableAction: function (oEvent) {
                var sTooltip =
                    oEvent.getSource().getTooltip() ||
                    "Acción de tabla";

                MessageToast.show(sTooltip);
            },

            onOpenEquipment: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("dashboard");

                var sEquipment = oContext
                    ? oContext.getProperty("equipo")
                    : "";

                MessageToast.show(
                    "Detalle del equipo " + sEquipment
                );

                /*
                 * Cuando se cree la ruta de detalle individual,
                 * puede sustituirse el MessageToast por:
                 *
                 * this.getOwnerComponent()
                 *     .getRouter()
                 *     .navTo("RouteDetalleEquipoBloqueado", {
                 *         equipoId: sEquipment
                 *     });
                 */
            },

            onOpenAffectedOrders: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("dashboard");

                var sEquipment = oContext
                    ? oContext.getProperty("equipo")
                    : "";

                MessageToast.show(
                    "Órdenes afectadas de " + sEquipment
                );
            },

            onOpenNextAction: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext("dashboard");

                var sEquipment = oContext
                    ? oContext.getProperty("equipo")
                    : "";

                MessageToast.show(
                    "Próxima acción de " + sEquipment
                );
            },

            /* =========================================================
             * NAVEGACIÓN
             * ========================================================= */

            onBackToBlockedEquipment: function () {
                var sPreviousHash = History
                    .getInstance()
                    .getPreviousHash();

                if (sPreviousHash !== undefined) {
                    window.history.go(-1);
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

            /* =========================================================
             * PAGINACIÓN
             * ========================================================= */

            onPagePress: function (oEvent) {
                var iPage = parseInt(
                    oEvent.getSource().getText(),
                    10
                );

                this._setCurrentPage(iPage);
            },

            onFirstPage: function () {
                this._setCurrentPage(1);
            },

            onPreviousPage: function () {
                var oModel = this.getView().getModel(
                    "dashboard"
                );

                var iCurrentPage = oModel.getProperty(
                    "/pagination/currentPage"
                );

                this._setCurrentPage(
                    Math.max(1, iCurrentPage - 1)
                );
            },

            onNextPage: function () {
                var oModel = this.getView().getModel(
                    "dashboard"
                );

                var iCurrentPage = oModel.getProperty(
                    "/pagination/currentPage"
                );

                var iTotalPages = oModel.getProperty(
                    "/pagination/totalPages"
                );

                this._setCurrentPage(
                    Math.min(
                        iTotalPages,
                        iCurrentPage + 1
                    )
                );
            },

            onLastPage: function () {
                var iTotalPages = this
                    .getView()
                    .getModel("dashboard")
                    .getProperty(
                        "/pagination/totalPages"
                    );

                this._setCurrentPage(iTotalPages);
            },

            onPageSizeChange: function (oEvent) {
                var oModel = this.getView().getModel(
                    "dashboard"
                );

                var iPageSize = parseInt(
                    oEvent
                        .getParameter("selectedItem")
                        .getKey(),
                    10
                );

                var iTotalRecords = oModel.getProperty(
                    "/pagination/totalRecords"
                );

                var iTotalPages = Math.max(
                    1,
                    Math.ceil(
                        iTotalRecords / iPageSize
                    )
                );

                oModel.setProperty(
                    "/pagination/pageSize",
                    String(iPageSize)
                );

                oModel.setProperty(
                    "/pagination/totalPages",
                    iTotalPages
                );

                this._setCurrentPage(1);
            },

            _setCurrentPage: function (iPage) {
                var oModel = this.getView().getModel(
                    "dashboard"
                );

                var iPageSize = parseInt(
                    oModel.getProperty(
                        "/pagination/pageSize"
                    ),
                    10
                );

                var iTotalRecords = oModel.getProperty(
                    "/pagination/totalRecords"
                );

                var iTotalPages = oModel.getProperty(
                    "/pagination/totalPages"
                );

                var iSafePage = Math.max(
                    1,
                    Math.min(iPage, iTotalPages)
                );

                var iStart =
                    (iSafePage - 1) * iPageSize + 1;

                var iEnd = Math.min(
                    iSafePage * iPageSize,
                    iTotalRecords
                );

                oModel.setProperty(
                    "/pagination/currentPage",
                    iSafePage
                );

                oModel.setProperty(
                    "/pagination/rangeText",
                    "Mostrando " +
                        iStart +
                        " a " +
                        iEnd +
                        " de " +
                        iTotalRecords +
                        " registros"
                );
            },

            /* =========================================================
             * DATOS MOCK
             * Posteriormente se sustituyen por el servicio OData.
             * ========================================================= */

            _getMockRows: function () {
                return [
                    {
                        equipo: "ELEV-0001123",
                        cliente: "Torre Reforma",
                        zona: "Centro",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo:
                            "Falla de componente",
                        estadoGestion: "En gestión",
                        estadoGestionState: "Warning",
                        fechaBloqueo: "15/04/2025",
                        diasBloqueado: "15",
                        ordenesAfectadas: "3",
                        responsable: "Juan Carlos Pérez",
                        fechaCompromiso: "02/05/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Vencido",
                        estadoState: "Error"
                    },
                    {
                        equipo: "ELEV-0007987",
                        cliente:
                            "Hospital Ángeles Pedregal",
                        zona: "CDMX Sur",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo:
                            "Inspección reglamentaria",
                        estadoGestion:
                            "Pendiente de aprobación",
                        estadoGestionState: "Warning",
                        fechaBloqueo: "28/03/2025",
                        diasBloqueado: "33",
                        ordenesAfectadas: "2",
                        responsable: "María González",
                        fechaCompromiso: "30/04/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Por vencer",
                        estadoState: "Warning"
                    },
                    {
                        equipo: "ELEV-0007786",
                        cliente: "Plaza Antares",
                        zona: "Occidente",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo:
                            "Falla de motor",
                        estadoGestion: "En progreso",
                        estadoGestionState: "Success",
                        fechaBloqueo: "05/04/2025",
                        diasBloqueado: "25",
                        ordenesAfectadas: "1",
                        responsable:
                            "Luis Fernando R.",
                        fechaCompromiso: "01/05/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Por vencer",
                        estadoState: "Warning"
                    },
                    {
                        equipo: "ELEV-0007441",
                        cliente: "Torre Mayor",
                        zona: "Centro",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo:
                            "Puertas fuera de servicio",
                        estadoGestion: "En progreso",
                        estadoGestionState: "Success",
                        fechaBloqueo: "01/04/2025",
                        diasBloqueado: "29",
                        ordenesAfectadas: "4",
                        responsable: "Ana Laura Díaz",
                        fechaCompromiso: "03/05/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Por vencer",
                        estadoState: "Warning"
                    },
                    {
                        equipo: "ELEV-0007388",
                        cliente: "WTC CDMX",
                        zona: "Centro",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo:
                            "Cable de tracción",
                        estadoGestion:
                            "Pendiente de refacciones",
                        estadoGestionState: "Warning",
                        fechaBloqueo: "20/03/2025",
                        diasBloqueado: "41",
                        ordenesAfectadas: "5",
                        responsable: "Jorge Hernández",
                        fechaCompromiso: "01/05/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Vencido",
                        estadoState: "Error"
                    },
                    {
                        equipo: "ELEV-0007098",
                        cliente: "City Towers Green",
                        zona: "CDMX Sur",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo:
                            "Falla de variador",
                        estadoGestion: "En progreso",
                        estadoGestionState: "Success",
                        fechaBloqueo: "10/04/2025",
                        diasBloqueado: "20",
                        ordenesAfectadas: "2",
                        responsable: "Carlos Méndez",
                        fechaCompromiso: "04/05/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Por vencer",
                        estadoState: "Warning"
                    },
                    {
                        equipo: "ELEV-0006892",
                        cliente:
                            "Universidad Anáhuac Norte",
                        zona: "Norte",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo:
                            "Lubricación pendiente",
                        estadoGestion:
                            "Pendiente de programación",
                        estadoGestionState: "Warning",
                        fechaBloqueo: "12/04/2025",
                        diasBloqueado: "18",
                        ordenesAfectadas: "1",
                        responsable: "Rosa Jiménez",
                        fechaCompromiso: "03/05/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Por vencer",
                        estadoState: "Warning"
                    },
                    {
                        equipo: "ELEV-0006555",
                        cliente:
                            "Hotel Camino Real Polanco",
                        zona: "CDMX Poniente",
                        estatusBloqueo: "Bloqueado",
                        motivoBloqueo: "Falla de PLC",
                        estadoGestion: "En gestión",
                        estadoGestionState: "Success",
                        fechaBloqueo: "25/03/2025",
                        diasBloqueado: "36",
                        ordenesAfectadas: "3",
                        responsable:
                            "Miguel Ángel Soto",
                        fechaCompromiso: "02/05/2025",
                        prioridadDesbloqueo: "Crítica",
                        estado: "Vencido",
                        estadoState: "Error"
                    }
                ];
            }
        }
    );
});