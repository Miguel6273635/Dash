sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "mantenimiento/model/PendientesDesbloqueoService",
    "mantenimiento/model/PendientesDesbloqueoMapper"
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
        "mantenimiento.controller.PendientesDesbloqueo",
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
                        oModel
                    );

                this._loadData(
                    false
                );
            },

            _getInitialData:
                function () {
                    return {
                        busy:
                            false,

                        filtros: {
                            periodo:
                                "ANIO_ACTUAL",

                            fechaDesde:
                                "2026-01-01",

                            fechaHasta:
                                "2026-12-31",

                            zona:
                                "TODOS",

                            cliente:
                                "TODOS",

                            estadoPendiente:
                                "TODOS",

                            responsable:
                                "TODOS",

                            supervisor:
                                "TODOS"
                        },

                        catalogs: {
                            zonas: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ],

                            clientes: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ],

                            estadosPendiente: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ],

                            responsables: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ],

                            supervisores: [
                                {
                                    key:
                                        "TODOS",

                                    text:
                                        "Todos"
                                }
                            ]
                        },

                        kpis: {
                            pendientesAbiertos:
                                0,

                            pendientesVencidos:
                                0,

                            proximosVencer:
                                0,

                            equiposPendiente:
                                0
                        },

                        paginacion: {
                            filasPorPagina:
                                "10",

                            textoResultados:
                                "Mostrando 0 resultados"
                        },

                        pendientes:
                            [],

                        meta:
                            {}
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
                            .getModel();

                    var oFiltros =
                        Object.assign(
                            {},
                            oModel.getProperty(
                                "/filtros"
                            ) || {}
                        );

                    oModel.setProperty(
                        "/busy",
                        true
                    );

                    console.log(
                        "[PD CONTROLLER] Filtros:",
                        oFiltros
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
                                        oFiltros
                                    );

                                oModel.setProperty(
                                    "/pendientes",
                                    oMapped.rows ||
                                    []
                                );

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

                                this._actualizarTextoResultados();

                                console.log(
                                    "[PD CONTROLLER] Resultado:",
                                    oMapped.meta
                                );

                                if (
                                    bNotify
                                ) {
                                    MessageToast.show(
                                        (
                                            oMapped.rows ||
                                            []
                                        ).length +
                                        " pendientes encontrados"
                                    );
                                }
                            }.bind(this)
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                console.error(
                                    "[PD CONTROLLER] Error:",
                                    oError
                                );

                                MessageBox.error(
                                    oError &&
                                    oError.message
                                        ? oError.message
                                        : "No fue posible consultar los pendientes de desbloqueo."
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

            onFiltroChange:
                function () {
                    // Los filtros se aplican con el botón.
                },

            onAplicarFiltros:
                function () {
                    this._loadData(
                        true
                    );
                },

            onLimpiarFiltros:
                function () {
                    var oModel =
                        this.getView()
                            .getModel();

                    oModel.setProperty(
                        "/filtros",
                        {
                            periodo:
                                "ANIO_ACTUAL",

                            fechaDesde:
                                "2026-01-01",

                            fechaHasta:
                                "2026-12-31",

                            zona:
                                "TODOS",

                            cliente:
                                "TODOS",

                            estadoPendiente:
                                "TODOS",

                            responsable:
                                "TODOS",

                            supervisor:
                                "TODOS"
                        }
                    );

                    this._loadData(
                        false
                    );

                    MessageToast.show(
                        "Filtros restablecidos."
                    );
                },

            onAbrirCalendario:
                function () {
                    MessageToast.show(
                        "Consulta de fechas compromiso."
                    );
                },

            onConfigurarTabla:
                function () {
                    MessageToast.show(
                        "Configuración de columnas."
                    );
                },

            onVerDetalle:
                function (
                    oEvent
                ) {
                    var oContext =
                        oEvent
                            .getSource()
                            .getBindingContext();

                    if (
                        !oContext
                    ) {
                        return;
                    }

                    var oPendiente =
                        oContext.getObject();

                    MessageToast.show(
                        "Detalle del equipo " +
                        (
                            oPendiente.equipo ||
                            ""
                        )
                    );
                },

            onFilasPorPaginaChange:
                function (
                    oEvent
                ) {
                    var sFilas =
                        oEvent
                            .getSource()
                            .getSelectedKey();

                    this.getView()
                        .getModel()
                        .setProperty(
                            "/paginacion/filasPorPagina",
                            sFilas
                        );

                    this._actualizarTextoResultados();
                },

            _actualizarTextoResultados:
                function () {
                    var oModel =
                        this.getView()
                            .getModel();

                    var aRows =
                        oModel.getProperty(
                            "/pendientes"
                        ) || [];

                    var iFilas =
                        parseInt(
                            oModel.getProperty(
                                "/paginacion/filasPorPagina"
                            ),
                            10
                        ) || 10;

                    var iTotal =
                        aRows.length;

                    var iHasta =
                        Math.min(
                            iFilas,
                            iTotal
                        );

                    var sTexto =
                        iTotal === 0
                            ? "Mostrando 0 resultados"
                            : "Mostrando 1 a " +
                              iHasta +
                              " de " +
                              iTotal +
                              " resultados";

                    oModel.setProperty(
                        "/paginacion/textoResultados",
                        sTexto
                    );
                }
        }
    );
});