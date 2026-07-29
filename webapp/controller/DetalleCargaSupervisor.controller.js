sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (
    Controller,
    JSONModel,
    MessageToast
) {
    "use strict";

    return Controller.extend(
        "mantenimiento.controller.DetalleCargaSupervisor",
        {
            /* ==========================================================
               INICIALIZACIÓN
               ========================================================== */

            onInit: function () {
                var oData = this._getInitialData();
                var oMainModel = new JSONModel(oData);
                var oViewModel = new JSONModel({
                    activeTab: "carga"
                });

                oMainModel.setSizeLimit(200);

                this.getView().setModel(oMainModel);
                this.getView().setModel(oViewModel, "view");

                /* Copias completas para filtros y paginación */
                this._aAllResources = oData.allResources.slice();
                this._aFilteredResources = this._aAllResources.slice();

                this._aAllMaterialsByResource =
                    oData.allMaterialsByResource.slice();

                this._aFilteredMaterialsByResource =
                    this._aAllMaterialsByResource.slice();

                this._refreshPagination();
                this._refreshMaterialsPagination();
            },

            /* ==========================================================
               MODELO INICIAL
               ========================================================== */

            _getInitialData: function () {
                return {
                    /* --------------------------------------------------
                       FILTROS
                       -------------------------------------------------- */

                    filters: {
                        periodo: "JUN2025",
                        fechaDesde: "2025-06-01",
                        fechaHasta: "2025-06-30",
                        gerencia: "G01",
                        jefatura: "J01",
                        supervisor: "S01",
                        tipoServicio: "TODAS"
                    },

                    periodos: [
                        {
                            key: "JUN2025",
                            text: "Junio 2025"
                        },
                        {
                            key: "MAY2025",
                            text: "Mayo 2025"
                        },
                        {
                            key: "ABR2025",
                            text: "Abril 2025"
                        }
                    ],

                    gerencias: [
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

                    jefaturas: [
                        {
                            key: "J01",
                            text: "J01 - Taller Norte"
                        },
                        {
                            key: "J02",
                            text: "J02 - Taller Centro"
                        },
                        {
                            key: "J03",
                            text: "J03 - Taller Sur"
                        }
                    ],

                    supervisores: [
                        {
                            key: "S01",
                            text: "S01 - Sergio Ramírez"
                        },
                        {
                            key: "S02",
                            text: "S02 - Laura Sánchez"
                        },
                        {
                            key: "S03",
                            text: "S03 - Roberto Méndez"
                        }
                    ],

                    tiposServicio: [
                        {
                            key: "TODAS",
                            text: "Todas"
                        },
                        {
                            key: "CORRECTIVO",
                            text: "Correctivo"
                        },
                        {
                            key: "PLANEADO",
                            text: "Planeado"
                        },
                        {
                            key: "CALL_CENTER",
                            text: "Call Center"
                        }
                    ],

                    /* --------------------------------------------------
                       KPIS DE CARGA Y CAPACIDAD
                       -------------------------------------------------- */

                    summary: {
                        recursosAsignados: "18",
                        capacidadDisponible: "828 h",
                        cargaProgramada: "713 h",
                        utilizacionPromedio: "86%",
                        ordenesActivas: "52",
                        ordenesCriticas: "7"
                    },

                    /* --------------------------------------------------
                       KPIS DE MATERIALES
                       -------------------------------------------------- */

                    materialsSummary: {
                        ordenesConConsumo: "41",
                        materialesUtilizados: "18",
                        materialesCriticos: "5",
                        materialTopCantidad: "680 L",
                        materialTopNombre: "Aceite hidráulico ISO 68",
                        materialTopCategoria: "Lubricantes",
                        variacionGeneral: "+3.2%"
                    },

                    /* --------------------------------------------------
                       RESUMEN LATERAL DE MATERIALES
                       -------------------------------------------------- */

                    materialsCategorySummary: {
                        lubricantes: "1,125 L",
                        refacciones: "420 pzas",
                        grasas: "210 kg",
                        consumibles: "160 pares",
                        herramientas: "48 pzas",
                        materialesCriticos: "5",
                        totalRegistros: "1,963"
                    },

                    /* --------------------------------------------------
                       PAGINACIÓN DE CARGA
                       -------------------------------------------------- */

                    pagination: {
                        page: 1,
                        pageSize: "10",
                        total: 18,
                        totalPages: 2,
                        label: "1 - 10 de 18"
                    },

                    /* --------------------------------------------------
                       PAGINACIÓN DE MATERIALES
                       -------------------------------------------------- */

                    materialsPagination: {
                        page: 1,
                        pageSize: "10",
                        total: 8,
                        totalPages: 1,
                        label: "1 - 8 de 8 registros"
                    },

                    /* Datos visibles en las tablas */
                    resources: [],
                    materialsByResource: [],

                    /* --------------------------------------------------
                       DATOS COMPLETOS DE CARGA Y CAPACIDAD
                       -------------------------------------------------- */

                    allResources: [
                        {
                            id: "REC001",
                            nombre: "Juan Pérez López",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "44 h",
                            utilizacion: 92,
                            ordenes: 5,
                            criticas: 1,
                            servicio: "Correctivo",
                            estatus: "Alto"
                        },
                        {
                            id: "REC002",
                            nombre: "Luis Martínez García",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "40 h",
                            utilizacion: 83,
                            ordenes: 4,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Normal"
                        },
                        {
                            id: "REC003",
                            nombre: "Carlos Hernández",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "46 h",
                            utilizacion: 96,
                            ordenes: 6,
                            criticas: 2,
                            servicio: "Correctivo",
                            estatus: "Crítico"
                        },
                        {
                            id: "REC004",
                            nombre: "Miguel Torres",
                            tipoRecurso: "Ayudante",
                            capacidad: "48 h",
                            carga: "34 h",
                            utilizacion: 71,
                            ordenes: 3,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Normal"
                        },
                        {
                            id: "REC005",
                            nombre: "José Ramírez",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "42 h",
                            utilizacion: 88,
                            ordenes: 5,
                            criticas: 1,
                            servicio: "Correctivo",
                            estatus: "Alto"
                        },
                        {
                            id: "REC006",
                            nombre: "Fernando Morales",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "38 h",
                            utilizacion: 79,
                            ordenes: 4,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Normal"
                        },
                        {
                            id: "REC007",
                            nombre: "Ricardo Vega",
                            tipoRecurso: "Ayudante",
                            capacidad: "48 h",
                            carga: "30 h",
                            utilizacion: 63,
                            ordenes: 2,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Bajo"
                        },
                        {
                            id: "REC008",
                            nombre: "Alejandra Ruiz",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "47 h",
                            utilizacion: 98,
                            ordenes: 4,
                            criticas: 2,
                            servicio: "Correctivo",
                            estatus: "Crítico"
                        },
                        {
                            id: "REC009",
                            nombre: "Héctor Salazar",
                            tipoRecurso: "Ayudante",
                            capacidad: "48 h",
                            carga: "28 h",
                            utilizacion: 58,
                            ordenes: 2,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Bajo"
                        },
                        {
                            id: "REC010",
                            nombre: "Daniel Navarro",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "41 h",
                            utilizacion: 85,
                            ordenes: 5,
                            criticas: 1,
                            servicio: "Correctivo",
                            estatus: "Alto"
                        },
                        {
                            id: "REC011",
                            nombre: "Raúl Mendoza",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "36 h",
                            utilizacion: 75,
                            ordenes: 3,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Normal"
                        },
                        {
                            id: "REC012",
                            nombre: "Jorge Castillo",
                            tipoRecurso: "Ayudante",
                            capacidad: "48 h",
                            carga: "31 h",
                            utilizacion: 65,
                            ordenes: 2,
                            criticas: 0,
                            servicio: "Call Center",
                            estatus: "Bajo"
                        },
                        {
                            id: "REC013",
                            nombre: "Gabriela Flores",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "45 h",
                            utilizacion: 94,
                            ordenes: 5,
                            criticas: 1,
                            servicio: "Correctivo",
                            estatus: "Alto"
                        },
                        {
                            id: "REC014",
                            nombre: "Antonio Reyes",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "39 h",
                            utilizacion: 81,
                            ordenes: 3,
                            criticas: 0,
                            servicio: "Call Center",
                            estatus: "Normal"
                        },
                        {
                            id: "REC015",
                            nombre: "Eduardo Luna",
                            tipoRecurso: "Ayudante",
                            capacidad: "48 h",
                            carga: "27 h",
                            utilizacion: 56,
                            ordenes: 2,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Bajo"
                        },
                        {
                            id: "REC016",
                            nombre: "Mariana Gómez",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "43 h",
                            utilizacion: 90,
                            ordenes: 4,
                            criticas: 1,
                            servicio: "Correctivo",
                            estatus: "Alto"
                        },
                        {
                            id: "REC017",
                            nombre: "Óscar Domínguez",
                            tipoRecurso: "Mecánico",
                            capacidad: "48 h",
                            carga: "35 h",
                            utilizacion: 73,
                            ordenes: 3,
                            criticas: 0,
                            servicio: "Planeado",
                            estatus: "Normal"
                        },
                        {
                            id: "REC018",
                            nombre: "Pablo Ortega",
                            tipoRecurso: "Ayudante",
                            capacidad: "48 h",
                            carga: "29 h",
                            utilizacion: 60,
                            ordenes: 1,
                            criticas: 0,
                            servicio: "Call Center",
                            estatus: "Bajo"
                        }
                    ],

                    /* --------------------------------------------------
                       DATOS DE CONSUMO POR RECURSO
                       -------------------------------------------------- */

                    allMaterialsByResource: [
                        {
                            id: "MATREC001",
                            recursoId: "REC001",
                            recurso: "Juan Pérez López",
                            tipoRecurso: "Mecánico",
                            ordenesConsumo: "8",
                            categoriaPrincipal: "Lubricantes",
                            materialTop: "Aceite hidráulico ISO 68",
                            consumoReal: "680",
                            unidad: "L",
                            plan: "650",
                            unidadPlan: "L",
                            variacion: "+4.6%",
                            variacionState: "Error",
                            estatus: "Atención",
                            estatusMaterial: "Warning"
                        },
                        {
                            id: "MATREC002",
                            recursoId: "REC002",
                            recurso: "Luis Martínez García",
                            tipoRecurso: "Mecánico",
                            ordenesConsumo: "6",
                            categoriaPrincipal: "Refacciones",
                            materialTop: "Filtro de aceite PF-47",
                            consumoReal: "120",
                            unidad: "pzas",
                            plan: "130",
                            unidadPlan: "pzas",
                            variacion: "-7.7%",
                            variacionState: "Success",
                            estatus: "En objetivo",
                            estatusMaterial: "Success"
                        },
                        {
                            id: "MATREC003",
                            recursoId: "REC019",
                            recurso: "Ana Rodríguez V.",
                            tipoRecurso: "Mecánico",
                            ordenesConsumo: "5",
                            categoriaPrincipal: "Grasas",
                            materialTop: "Grasa multipropósito EP2",
                            consumoReal: "85",
                            unidad: "kg",
                            plan: "90",
                            unidadPlan: "kg",
                            variacion: "-5.6%",
                            variacionState: "Success",
                            estatus: "En objetivo",
                            estatusMaterial: "Success"
                        },
                        {
                            id: "MATREC004",
                            recursoId: "REC020",
                            recurso: "Omar Campos",
                            tipoRecurso: "Ayudante",
                            ordenesConsumo: "3",
                            categoriaPrincipal: "Consumibles",
                            materialTop: "Guantes de nitrilo L",
                            consumoReal: "60",
                            unidad: "pares",
                            plan: "60",
                            unidadPlan: "pares",
                            variacion: "0.0%",
                            variacionState: "None",
                            estatus: "En objetivo",
                            estatusMaterial: "Success"
                        },
                        {
                            id: "MATREC005",
                            recursoId: "REC004",
                            recurso: "Miguel Torres",
                            tipoRecurso: "Mecánico",
                            ordenesConsumo: "4",
                            categoriaPrincipal: "Refacciones",
                            materialTop: "Banda en V A-40",
                            consumoReal: "58",
                            unidad: "pzas",
                            plan: "50",
                            unidadPlan: "pzas",
                            variacion: "+16.0%",
                            variacionState: "Error",
                            estatus: "Sobre plan",
                            estatusMaterial: "Error"
                        },
                        {
                            id: "MATREC006",
                            recursoId: "REC003",
                            recurso: "Carlos Hernández",
                            tipoRecurso: "Mecánico",
                            ordenesConsumo: "4",
                            categoriaPrincipal: "Herramientas",
                            materialTop: "Broca HSS 1/2",
                            consumoReal: "36",
                            unidad: "pzas",
                            plan: "40",
                            unidadPlan: "pzas",
                            variacion: "-10.0%",
                            variacionState: "Success",
                            estatus: "En objetivo",
                            estatusMaterial: "Success"
                        },
                        {
                            id: "MATREC007",
                            recursoId: "REC006",
                            recurso: "Fernando Morales",
                            tipoRecurso: "Mecánico",
                            ordenesConsumo: "3",
                            categoriaPrincipal: "Consumibles",
                            materialTop: "Trapos de limpieza",
                            consumoReal: "25",
                            unidad: "pzas",
                            plan: "25",
                            unidadPlan: "pzas",
                            variacion: "0.0%",
                            variacionState: "None",
                            estatus: "En objetivo",
                            estatusMaterial: "Success"
                        },
                        {
                            id: "MATREC008",
                            recursoId: "REC007",
                            recurso: "Ricardo Vega",
                            tipoRecurso: "Ayudante",
                            ordenesConsumo: "2",
                            categoriaPrincipal: "Lubricantes",
                            materialTop: "Aceite 15W-40",
                            consumoReal: "18",
                            unidad: "L",
                            plan: "20",
                            unidadPlan: "L",
                            variacion: "-10.0%",
                            variacionState: "Success",
                            estatus: "En objetivo",
                            estatusMaterial: "Success"
                        }
                    ]
                };
            },

            /* ==========================================================
               FILTROS
               ========================================================== */

            onApplyFilters: function () {
                var oModel = this.getView().getModel();
                var oFilters = oModel.getProperty("/filters");
                var sServiceKey = oFilters.tipoServicio;
                var sActiveTab = this.getView()
                    .getModel("view")
                    .getProperty("/activeTab");

                this._aFilteredResources = this._aAllResources.filter(
                    function (oResource) {
                        if (sServiceKey === "TODAS") {
                            return true;
                        }

                        return this._normalizeServiceKey(
                            oResource.servicio
                        ) === sServiceKey;
                    }.bind(this)
                );

                /*
                 * En los datos de ejemplo de materiales no se incluye
                 * tipo de servicio. Se conserva la colección completa.
                 */
                this._aFilteredMaterialsByResource =
                    this._aAllMaterialsByResource.slice();

                oModel.setProperty("/pagination/page", 1);
                oModel.setProperty("/materialsPagination/page", 1);

                this._refreshPagination();
                this._refreshMaterialsPagination();

                if (sActiveTab === "materiales") {
                    MessageToast.show(
                        this._aFilteredMaterialsByResource.length +
                        " recursos con consumo encontrados"
                    );
                } else {
                    MessageToast.show(
                        this._aFilteredResources.length +
                        " recursos encontrados"
                    );
                }
            },

            _normalizeServiceKey: function (sService) {
                switch (sService) {
                    case "Correctivo":
                        return "CORRECTIVO";

                    case "Planeado":
                        return "PLANEADO";

                    case "Call Center":
                        return "CALL_CENTER";

                    default:
                        return "";
                }
            },

            /* ==========================================================
               CAMBIO DE TAB
               ========================================================== */

            onTabPress: function (oEvent) {
                var sTab = oEvent.getSource().data("tab");
                var bCargaActive = sTab === "carga";

                this.getView()
                    .getModel("view")
                    .setProperty("/activeTab", sTab);

                this.byId("btnTabCarga").toggleStyleClass(
                    "dcsTabActive",
                    bCargaActive
                );

                this.byId("btnTabMateriales").toggleStyleClass(
                    "dcsTabActive",
                    !bCargaActive
                );
            },

            /* ==========================================================
               PAGINACIÓN DE CARGA
               ========================================================== */

            onPageSizeChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var oModel = this.getView().getModel();

                if (!oSelectedItem) {
                    return;
                }

                oModel.setProperty(
                    "/pagination/pageSize",
                    oSelectedItem.getKey()
                );

                oModel.setProperty("/pagination/page", 1);

                this._refreshPagination();
            },

            onPaginationPress: function (oEvent) {
                var sAction = oEvent.getSource().data("action");

                this._changePage(
                    "/pagination",
                    sAction
                );

                this._refreshPagination();
            },

            /* ==========================================================
               PAGINACIÓN DE MATERIALES
               ========================================================== */

            onMaterialsPageSizeChange: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                var oModel = this.getView().getModel();

                if (!oSelectedItem) {
                    return;
                }

                oModel.setProperty(
                    "/materialsPagination/pageSize",
                    oSelectedItem.getKey()
                );

                oModel.setProperty(
                    "/materialsPagination/page",
                    1
                );

                this._refreshMaterialsPagination();
            },

            onMaterialsPaginationPress: function (oEvent) {
                var sAction = oEvent.getSource().data("action");

                this._changePage(
                    "/materialsPagination",
                    sAction
                );

                this._refreshMaterialsPagination();
            },

            /**
             * Cambia la página para cualquiera de las dos tablas.
             *
             * @param {string} sPaginationPath Ruta de paginación.
             * @param {string} sAction Acción seleccionada.
             */
            _changePage: function (
                sPaginationPath,
                sAction
            ) {
                var oModel = this.getView().getModel();

                var iCurrentPage = Number(
                    oModel.getProperty(
                        sPaginationPath + "/page"
                    )
                ) || 1;

                var iTotalPages = Number(
                    oModel.getProperty(
                        sPaginationPath + "/totalPages"
                    )
                ) || 1;

                switch (sAction) {
                    case "first":
                        iCurrentPage = 1;
                        break;

                    case "previous":
                        iCurrentPage = Math.max(
                            1,
                            iCurrentPage - 1
                        );
                        break;

                    case "page1":
                        iCurrentPage = 1;
                        break;

                    case "page2":
                        iCurrentPage = Math.min(
                            2,
                            iTotalPages
                        );
                        break;

                    case "next":
                        iCurrentPage = Math.min(
                            iTotalPages,
                            iCurrentPage + 1
                        );
                        break;

                    case "last":
                        iCurrentPage = iTotalPages;
                        break;

                    default:
                        return;
                }

                oModel.setProperty(
                    sPaginationPath + "/page",
                    iCurrentPage
                );
            },

            /* ==========================================================
               REFRESCO DE TABLA DE CARGA
               ========================================================== */

            _refreshPagination: function () {
                var oModel = this.getView().getModel();

                var iPage = Number(
                    oModel.getProperty("/pagination/page")
                ) || 1;

                var iPageSize = Number(
                    oModel.getProperty("/pagination/pageSize")
                ) || 10;

                var iTotal = this._aFilteredResources.length;

                var iTotalPages = Math.max(
                    1,
                    Math.ceil(iTotal / iPageSize)
                );

                iPage = Math.min(
                    Math.max(iPage, 1),
                    iTotalPages
                );

                var iStartIndex =
                    (iPage - 1) * iPageSize;

                var iEndIndex = Math.min(
                    iStartIndex + iPageSize,
                    iTotal
                );

                var aVisibleResources =
                    this._aFilteredResources.slice(
                        iStartIndex,
                        iEndIndex
                    );

                var iVisibleStart = iTotal === 0
                    ? 0
                    : iStartIndex + 1;

                var sLabel = iVisibleStart +
                    " - " +
                    iEndIndex +
                    " de " +
                    iTotal;

                oModel.setProperty(
                    "/resources",
                    aVisibleResources
                );

                oModel.setProperty(
                    "/pagination/page",
                    iPage
                );

                oModel.setProperty(
                    "/pagination/total",
                    iTotal
                );

                oModel.setProperty(
                    "/pagination/totalPages",
                    iTotalPages
                );

                oModel.setProperty(
                    "/pagination/label",
                    sLabel
                );
            },

            /* ==========================================================
               REFRESCO DE TABLA DE MATERIALES
               ========================================================== */

            _refreshMaterialsPagination: function () {
                var oModel = this.getView().getModel();

                var iPage = Number(
                    oModel.getProperty(
                        "/materialsPagination/page"
                    )
                ) || 1;

                var iPageSize = Number(
                    oModel.getProperty(
                        "/materialsPagination/pageSize"
                    )
                ) || 10;

                var iTotal =
                    this._aFilteredMaterialsByResource.length;

                var iTotalPages = Math.max(
                    1,
                    Math.ceil(iTotal / iPageSize)
                );

                iPage = Math.min(
                    Math.max(iPage, 1),
                    iTotalPages
                );

                var iStartIndex =
                    (iPage - 1) * iPageSize;

                var iEndIndex = Math.min(
                    iStartIndex + iPageSize,
                    iTotal
                );

                var aVisibleMaterials =
                    this._aFilteredMaterialsByResource.slice(
                        iStartIndex,
                        iEndIndex
                    );

                var iVisibleStart = iTotal === 0
                    ? 0
                    : iStartIndex + 1;

                var sLabel = iVisibleStart +
                    " - " +
                    iEndIndex +
                    " de " +
                    iTotal +
                    " registros";

                oModel.setProperty(
                    "/materialsByResource",
                    aVisibleMaterials
                );

                oModel.setProperty(
                    "/materialsPagination/page",
                    iPage
                );

                oModel.setProperty(
                    "/materialsPagination/total",
                    iTotal
                );

                oModel.setProperty(
                    "/materialsPagination/totalPages",
                    iTotalPages
                );

                oModel.setProperty(
                    "/materialsPagination/label",
                    sLabel
                );
            },

            /* ==========================================================
               NAVEGACIÓN DE CARGA
               ========================================================== */

            onOpenOrders: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext();

                if (!oContext) {
                    return;
                }

                var oResource = oContext.getObject();
                var oRouter = this.getOwnerComponent().getRouter();

                if (
                    oRouter.getRoute(
                        "RouteOrdenesSupervisor"
                    )
                ) {
                    oRouter.navTo(
                        "RouteOrdenesSupervisor",
                        {
                            recursoId: oResource.id
                        }
                    );

                    return;
                }

                MessageToast.show(
                    "Recurso seleccionado: " +
                    oResource.nombre
                );
            },

            /* ==========================================================
               NAVEGACIÓN DE MATERIALES
               ========================================================== */

            onOpenMaterialResources: function (oEvent) {
                var oContext = oEvent
                    .getSource()
                    .getBindingContext();

                if (!oContext) {
                    return;
                }

                var oMaterialResource =
                    oContext.getObject();

                var oRouter =
                    this.getOwnerComponent().getRouter();

                if (
                    oRouter.getRoute(
                        "RouteDetalleMaterialesRecurso"
                    )
                ) {
                    oRouter.navTo(
                        "RouteDetalleMaterialesRecurso",
                        {
                            recursoId:
                                oMaterialResource.recursoId
                        }
                    );

                    return;
                }

                MessageToast.show(
                    "Consumo seleccionado: " +
                    oMaterialResource.recurso
                );
            },

            /*
             * Alias por compatibilidad, por si alguna versión anterior
             * del View todavía llama onOpenMaterialDetail.
             */
            onOpenMaterialDetail: function (oEvent) {
                this.onOpenMaterialResources(oEvent);
            },

            onOpenCapacityReport: function () {
                var oRouter =
                    this.getOwnerComponent().getRouter();

                if (
                    oRouter.getRoute(
                        "RouteReporteCargaCapacidad"
                    )
                ) {
                    oRouter.navTo(
                        "RouteReporteCargaCapacidad"
                    );

                    return;
                }

                MessageToast.show(
                    "Reporte de carga y capacidad"
                );
            },

            onOpenMaterialsReport: function () {
                var oRouter =
                    this.getOwnerComponent().getRouter();

                if (
                    oRouter.getRoute(
                        "RouteReporteMaterialesSupervisor"
                    )
                ) {
                    oRouter.navTo(
                        "RouteReporteMaterialesSupervisor"
                    );

                    return;
                }

                MessageToast.show(
                    "Detalle de consumo de materiales"
                );
            },

            onBackToSupervisor: function () {
                var oRouter =
                    this.getOwnerComponent().getRouter();

                if (
                    oRouter.getRoute(
                        "RouteVistaSupervisor"
                    )
                ) {
                    oRouter.navTo(
                        "RouteVistaSupervisor"
                    );

                    return;
                }

                window.history.go(-1);
            },

            /* ==========================================================
               FORMATTERS DE CARGA
               ========================================================== */

            formatUtilizationState: function (
                vUtilization
            ) {
                var iUtilization =
                    Number(vUtilization);

                if (iUtilization >= 90) {
                    return "Error";
                }

                if (iUtilization >= 80) {
                    return "Warning";
                }

                return "Success";
            },

            formatServiceState: function (sService) {
                switch (sService) {
                    case "Correctivo":
                        return "Error";

                    case "Planeado":
                        return "Success";

                    case "Call Center":
                        return "Warning";

                    default:
                        return "None";
                }
            },

            formatStatusState: function (sStatus) {
                switch (sStatus) {
                    case "Crítico":
                    case "Alto":
                        return "Error";

                    case "Normal":
                        return "Success";

                    case "Bajo":
                        return "Information";

                    default:
                        return "None";
                }
            },

            /* ==========================================================
               FORMATTERS DE MATERIALES
               ========================================================== */

            formatVariationState: function (sState) {
                switch (sState) {
                    case "Error":
                        return "Error";

                    case "Warning":
                        return "Warning";

                    case "Success":
                        return "Success";

                    default:
                        return "None";
                }
            },

            formatMaterialStatusState: function (
                sState
            ) {
                switch (sState) {
                    case "Error":
                        return "Error";

                    case "Warning":
                        return "Warning";

                    case "Success":
                        return "Success";

                    case "Information":
                        return "Information";

                    default:
                        return "None";
                }
            }
        }
    );
});