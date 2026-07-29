sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/export/Spreadsheet"
], function (
    Controller,
    JSONModel,
    Filter,
    FilterOperator,
    MessageToast,
    Spreadsheet
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCapacidadCarga", {

        onInit: function () {
            var oData = {
                filtros: {
                    periodo: "MAYO_2024",
                    fechaDesde: "01/05/2024",
                    fechaHasta: "31/05/2024",
                    zona: "TODAS",
                    turno: "TODOS",
                    supervisor: "TODOS"
                },

                catalogos: {
                    periodos: [
                        { key: "MAYO_2024", text: "Mayo 2024" },
                        { key: "ABRIL_2024", text: "Abril 2024" },
                        { key: "JUNIO_2024", text: "Junio 2024" }
                    ],
                    zonas: [
                        { key: "TODAS", text: "Todas" },
                        { key: "NORTE", text: "Norte" },
                        { key: "CENTRO", text: "Centro" },
                        { key: "SUR", text: "Sur" },
                        { key: "OESTE", text: "Oeste" }
                    ],
                    turnos: [
                        { key: "TODOS", text: "Todos" },
                        { key: "DIURNO", text: "Diurno" },
                        { key: "NOCTURNO", text: "Nocturno" },
                        { key: "FIN_SEMANA", text: "Fin de semana" }
                    ],
                    supervisores: [
                        { key: "TODOS", text: "Todos" },
                        { key: "SUP_01", text: "Supervisor 01" },
                        { key: "SUP_02", text: "Supervisor 02" },
                        { key: "SUP_03", text: "Supervisor 03" }
                    ]
                },

                kpis: {
                    capacidadDisponible: {
                        valor: "6,400 h"
                    },
                    horasProgramadas: {
                        valor: "5,900 h",
                        subtitulo: "92.2% de la capacidad"
                    },
                    horasReales: {
                        valor: "5,842 h",
                        subtitulo: "91.2% de la capacidad"
                    },
                    margenDisponible: {
                        valor: "+500 h",
                        subtitulo: "7.8% de la capacidad"
                    },
                    utilizacionReal: {
                        valor: "91.2%",
                        subtitulo: "< 100% de la capacidad"
                    }
                },

                resumenTurno: [
                    {
                        icon: "sap-icon://light-mode",
                        turno: "Diurno",
                        capacidad: "4,032 h",
                        programadas: "3,470 h",
                        reales: "3,380 h",
                        utilizacion: "84.9%",
                        estado: "Normal"
                    },
                    {
                        icon: "sap-icon://lateness",
                        turno: "Nocturno",
                        capacidad: "1,344 h",
                        programadas: "1,278 h",
                        reales: "1,310 h",
                        utilizacion: "95.1%",
                        estado: "Cerca de saturación"
                    },
                    {
                        icon: "sap-icon://calendar",
                        turno: "Fin de semana",
                        capacidad: "1,024 h",
                        programadas: "1,202 h",
                        reales: "1,152 h",
                        utilizacion: "117.4%",
                        estado: "Sobrecargado"
                    },
                    {
                        icon: "sap-icon://sum",
                        turno: "Total",
                        capacidad: "6,400 h",
                        programadas: "5,900 h",
                        reales: "5,842 h",
                        utilizacion: "91.2%",
                        estado: "-"
                    }
                ],

                detalles: [
                    {
                        zona: "Norte",
                        turno: "Diurno",
                        capacidad: "900",
                        programadas: "860",
                        reales: "875",
                        margen: "25",
                        utilizacion: "97.2%",
                        variacionProgH: "+15",
                        variacionProgP: "+1.7%",
                        estado: "Cerca de saturación"
                    },
                    {
                        zona: "Norte",
                        turno: "Nocturno",
                        capacidad: "300",
                        programadas: "320",
                        reales: "355",
                        margen: "-55",
                        utilizacion: "118.3%",
                        variacionProgH: "+35",
                        variacionProgP: "+10.9%",
                        estado: "Sobrecargado"
                    },
                    {
                        zona: "Norte",
                        turno: "Fin de semana",
                        capacidad: "300",
                        programadas: "340",
                        reales: "365",
                        margen: "-65",
                        utilizacion: "121.7%",
                        variacionProgH: "+25",
                        variacionProgP: "+7.4%",
                        estado: "Sobrecargado"
                    },
                    {
                        zona: "Centro",
                        turno: "Diurno",
                        capacidad: "1,100",
                        programadas: "940",
                        reales: "920",
                        margen: "180",
                        utilizacion: "83.6%",
                        variacionProgH: "-20",
                        variacionProgP: "-2.1%",
                        estado: "Normal"
                    },
                    {
                        zona: "Centro",
                        turno: "Nocturno",
                        capacidad: "400",
                        programadas: "360",
                        reales: "380",
                        margen: "20",
                        utilizacion: "95.0%",
                        variacionProgH: "+20",
                        variacionProgP: "+5.6%",
                        estado: "Cerca de saturación"
                    },
                    {
                        zona: "Centro",
                        turno: "Fin de semana",
                        capacidad: "300",
                        programadas: "320",
                        reales: "315",
                        margen: "-15",
                        utilizacion: "105.0%",
                        variacionProgH: "-5",
                        variacionProgP: "-1.6%",
                        estado: "Sobrecargado"
                    },
                    {
                        zona: "Sur",
                        turno: "Diurno",
                        capacidad: "1,000",
                        programadas: "930",
                        reales: "900",
                        margen: "100",
                        utilizacion: "90.0%",
                        variacionProgH: "-30",
                        variacionProgP: "-3.2%",
                        estado: "Normal"
                    },
                    {
                        zona: "Sur",
                        turno: "Nocturno",
                        capacidad: "300",
                        programadas: "320",
                        reales: "335",
                        margen: "-35",
                        utilizacion: "111.7%",
                        variacionProgH: "+15",
                        variacionProgP: "+4.7%",
                        estado: "Sobrecargado"
                    },
                    {
                        zona: "Sur",
                        turno: "Fin de semana",
                        capacidad: "258",
                        programadas: "280",
                        reales: "270",
                        margen: "-12",
                        utilizacion: "104.7%",
                        variacionProgH: "-10",
                        variacionProgP: "-3.6%",
                        estado: "Sobrecargado"
                    },
                    {
                        zona: "Oeste",
                        turno: "Diurno",
                        capacidad: "398",
                        programadas: "690",
                        reales: "615",
                        margen: "-217",
                        utilizacion: "154.5%",
                        variacionProgH: "-75",
                        variacionProgP: "-10.9%",
                        estado: "Sobrecargado"
                    },
                    {
                        zona: "Oeste",
                        turno: "Nocturno",
                        capacidad: "374",
                        programadas: "350",
                        reales: "330",
                        margen: "44",
                        utilizacion: "88.2%",
                        variacionProgH: "-20",
                        variacionProgP: "-5.7%",
                        estado: "Normal"
                    },
                    {
                        zona: "Oeste",
                        turno: "Fin de semana",
                        capacidad: "274",
                        programadas: "262",
                        reales: "237",
                        margen: "37",
                        utilizacion: "86.5%",
                        variacionProgH: "-25",
                        variacionProgP: "-9.5%",
                        estado: "Normal"
                    }
                ],

                paginacion: {
                    pageSize: "10",
                    paginaActual: 1
                }
            };

            var oModel = new JSONModel(oData);
            this.getView().setModel(oModel);
        },

        onApplyFilters: function () {
            MessageToast.show("Filtros aplicados");

            /*
             * Aquí después conectas tu OData.
             *
             * Ejemplo:
             * var oFiltros = this.getView().getModel().getProperty("/filtros");
             * this._consultarDetalleCapacidad(oFiltros);
             */
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");

            if (sQuery === undefined) {
                sQuery = oEvent.getParameter("newValue") || "";
            }

            var oTable = this.byId("detalleTable");
            var oBinding = oTable.getBinding("items");

            if (!sQuery) {
                oBinding.filter([]);
                return;
            }

            var oFilter = new Filter({
                filters: [
                    new Filter("zona", FilterOperator.Contains, sQuery),
                    new Filter("turno", FilterOperator.Contains, sQuery),
                    new Filter("estado", FilterOperator.Contains, sQuery)
                ],
                and: false
            });

            oBinding.filter([oFilter]);
        },

        onColumns: function () {
            MessageToast.show("Configuración de columnas pendiente");
        },

        onChangePageSize: function () {
            MessageToast.show("Tamaño de página actualizado");
        },

        onExport: function () {
            var oModel = this.getView().getModel();
            var aData = oModel.getProperty("/detalles");

            var aColumns = [
                { label: "Zona", property: "zona" },
                { label: "Turno", property: "turno" },
                { label: "Capacidad disponible (h)", property: "capacidad" },
                { label: "Horas programadas (h)", property: "programadas" },
                { label: "Horas reales (h)", property: "reales" },
                { label: "Margen (h)", property: "margen" },
                { label: "Utilización real / capacidad", property: "utilizacion" },
                { label: "Variación vs programada (h)", property: "variacionProgH" },
                { label: "Variación vs programada (%)", property: "variacionProgP" },
                { label: "Estado", property: "estado" }
            ];

            var oSheet = new Spreadsheet({
                workbook: {
                    columns: aColumns
                },
                dataSource: aData,
                fileName: "Detalle_Capacidad_vs_Carga_Programada.xlsx"
            });

            oSheet.build()
                .then(function () {
                    MessageToast.show("Archivo exportado correctamente");
                })
                .finally(function () {
                    oSheet.destroy();
                });
        },

        /* ========================================================= */
        /* Formatters - Resumen por turno                            */
        /* ========================================================= */

        formatTurnoIconColor: function (sTurno) {
            switch (sTurno) {
                case "Diurno":
                    return "#f59e0b";
                case "Nocturno":
                    return "#2563eb";
                case "Fin de semana":
                    return "#0d6efd";
                case "Total":
                    return "#2563eb";
                default:
                    return "#64748b";
            }
        },

        formatEstadoColor: function (sEstado) {
            switch (sEstado) {
                case "Normal":
                    return "#16a34a";
                case "Cerca de saturación":
                    return "#f59e0b";
                case "Sobrecargado":
                    return "#ef4444";
                default:
                    return "#64748b";
            }
        },

        formatEstadoCircleVisible: function (sEstado) {
            return sEstado === "Normal" ||
                sEstado === "Cerca de saturación" ||
                sEstado === "Sobrecargado";
        },

        /* ========================================================= */
        /* Formatters generales                                      */
        /* ========================================================= */

        formatUtilizacionState: function (sValue) {
            var fValue = this._parsePercent(sValue);

            if (fValue >= 100) {
                return "Error";
            }

            if (fValue >= 95) {
                return "Warning";
            }

            return "Success";
        },

        formatMargenState: function (sValue) {
            var fValue = this._parseNumber(sValue);

            if (fValue < 0) {
                return "Error";
            }

            if (fValue <= 30) {
                return "Warning";
            }

            return "Success";
        },

        formatTrendState: function (sValue) {
            var fValue = this._parseNumber(sValue);

            if (fValue > 0) {
                return "Error";
            }

            if (fValue < 0) {
                return "Success";
            }

            return "None";
        },

        formatEstadoState: function (sEstado) {
            switch (sEstado) {
                case "Normal":
                    return "Success";
                case "Cerca de saturación":
                    return "Warning";
                case "Sobrecargado":
                    return "Error";
                default:
                    return "None";
            }
        },

        formatEstadoIcon: function (sEstado) {
            switch (sEstado) {
                case "Normal":
                    return "sap-icon://sys-enter-2";
                case "Cerca de saturación":
                    return "sap-icon://alert";
                case "Sobrecargado":
                    return "sap-icon://error";
                default:
                    return "";
            }
        },

        _parsePercent: function (sValue) {
            if (!sValue) {
                return 0;
            }

            return parseFloat(
                String(sValue)
                    .replace("%", "")
                    .replace(",", "")
                    .trim()
            ) || 0;
        },

        _parseNumber: function (sValue) {
            if (!sValue) {
                return 0;
            }

            return parseFloat(
                String(sValue)
                    .replace("%", "")
                    .replace(",", "")
                    .replace("+", "")
                    .trim()
            ) || 0;
        }

    });
});