sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/UIComponent",
    "mantenimiento/model/DashboardDataService",
    "mantenimiento/model/DashboardCacheApiService",
    "mantenimiento/model/InitialLoadPeriod"
], function (Controller, JSONModel, MessageToast, UIComponent, DashboardDataService, DashboardCacheApiService, InitialLoadPeriod) {
    "use strict";

    return Controller.extend("mantenimiento.controller.Mantenimiento", {

        onInit: function () {
            var oDashboardModel = new JSONModel(this._getDashboardData());

            this._hasLoadedDashboard = false;
            oDashboardModel.setSizeLimit(500);
            this.getView().setModel(oDashboardModel, "dash");
            this._loadDashboard(false);
        },

        /**
         * Conserva el estado de los filtros. La consulta se ejecuta desde el
         * botón para evitar múltiples llamadas mientras el usuario selecciona.
         */
        onFilterChange: function () {
            var oRequest = this._buildDashboardRequest();
            var oModel = this.getView().getModel("dash");

            oModel.setProperty("/lastRequest", oRequest);
        },

        onPeriodoChange: function () {
            var sKey = this._getSelectedKey("slPeriodo") || "";
            var oModel = this.getView().getModel("dash");
            var iYear;

            // El periodo representa un año completo. Al seleccionar un año,
            // las fechas se ajustan y la consulta se ejecuta al pulsar
            // "Aplicar filtros".
            if (/^\d{4}$/.test(sKey)) {
                iYear = Number(sKey);
                oModel.setProperty("/filtros/fechaInicio", "01/01/" + iYear);
                oModel.setProperty("/filtros/fechaFin", "31/12/" + iYear);
            }

            this.onFilterChange();
        },

        onAplicarFiltros: function () {
            this.onFilterChange();
            this._loadDashboard(true);
        },

        onVerDetalle: function (oEvent) {
            var oSource = oEvent && oEvent.getSource ? oEvent.getSource() : null;
            var sSection = oSource && oSource.data("section")
                ? oSource.data("section")
                : "general";
            var oRouter = UIComponent.getRouterFor(this);
            var sRouteName;

            if (oRouter) {
                // Compatible con el manifest compacto de esta entrega y con
                // el manifest original de la aplicación, que usa el prefijo
                // Route en los nombres de ruta.
                sRouteName = oRouter.getRoute("RouteMantenimientoDetalle")
                    ? "RouteMantenimientoDetalle"
                    : oRouter.getRoute("MantenimientoDetalle")
                        ? "MantenimientoDetalle"
                        : null;
            }

            if (sRouteName) {
                this.getView().getModel("dash").setProperty("/navigation/section", sSection);
                oRouter.navTo(sRouteName);
                return;
            }

            MessageToast.show("Detalle seleccionado: " + sSection);
        },

        _buildDashboardRequest: function () {
            return {
                dashboard: "MANTENIMIENTO",
                tipoConsulta: "GENERAL",
                filtros: {
                    periodo: this._getSelectedKey("slPeriodo"),
                    fechaInicio: this._getValue("dpInicio"),
                    fechaFin: this._getValue("dpFin"),
                    zona: this._getSelectedKey("slZona"),
                    supervisor: this._getSelectedKey("slSupervisor"),
                    tipoOrden: this._getSelectedKey("slTipoOrden"),
                    turno: this._getSelectedKey("slTurno"),
                    mecanico: this._getSelectedKey("slMecanico"),
                    estadoOrden: this._getSelectedKey("slEstadoOrden")
                }
            };
        },

        _getSelectedKey: function (sControlId) {
            var oControl = this.byId(sControlId);

            return oControl && oControl.getSelectedKey
                ? oControl.getSelectedKey() || null
                : null;
        },

        _getValue: function (sControlId) {
            var oControl = this.byId(sControlId);

            return oControl && oControl.getValue
                ? oControl.getValue() || null
                : null;
        },

        _onDashboardLoaded: function (oData) {
            var oModel = this.getView().getModel("dash");
            var oCurrentSummary;
            var oCurrentOptions;

            if (!oData) {
                return;
            }

            oCurrentSummary = oModel.getProperty("/summary") || {};
            oModel.setProperty("/summary", Object.assign({}, oCurrentSummary, oData.summary || {}));

            if (Array.isArray(oData.causes)) {
                oModel.setProperty("/causes", oData.causes);
            }
            if (Array.isArray(oData.materials)) {
                oModel.setProperty("/materials", oData.materials);
            }
            ["execution", "zonePeriods", "staff", "composition"].forEach(function (sProperty) {
                if (oData[sProperty]) {
                    oModel.setProperty("/" + sProperty, oData[sProperty]);
                }
            });

            oCurrentOptions = oModel.getProperty("/filterOptions") || {};
            Object.keys(oData.filterOptions || {}).forEach(function (sName) {
                var aOptions = oData.filterOptions[sName];

                // Se conservan los años iniciales para que el usuario pueda
                // cambiar de año aunque la consulta actual sólo haya devuelto
                // registros de un periodo.
                if (sName === "periodos" && Array.isArray(aOptions) && aOptions.length > 0) {
                    var mPeriods = new Map();

                    (oCurrentOptions.periodos || []).concat(aOptions).forEach(function (oPeriod) {
                        if (oPeriod && oPeriod.key) {
                            mPeriods.set(String(oPeriod.key), oPeriod);
                        }
                    });
                    oCurrentOptions.periodos = Array.from(mPeriods.values()).sort(function (oLeft, oRight) {
                        return Number(oLeft.key) - Number(oRight.key);
                    });
                    return;
                }

                // Un catálogo que solo contiene "Todos" no sustituye el respaldo local.
                if (Array.isArray(aOptions) && aOptions.length > 1) {
                    oCurrentOptions[sName] = aOptions;
                }
            });
            oModel.setProperty("/filterOptions", oCurrentOptions);
            oModel.setProperty("/connection", {
                status: oData.meta && oData.meta.dataQuality && oData.meta.dataQuality.level === "PARTIAL"
                    ? "PARTIAL"
                    : "CONNECTED",
                source: oData.meta && oData.meta.source || "SAP_ODATA",
                generatedAt: oData.meta && oData.meta.generatedAt || null,
                records: oData.meta && oData.meta.records || {},
                ordersUri: oData.meta && oData.meta.ordersUri || null,
                ordersFilter: oData.meta && oData.meta.ordersFilter || null,
                dataQuality: oData.meta && oData.meta.dataQuality || null,
                unavailableEntitySets: oData.meta && oData.meta.unavailableEntitySets || []
            });
        },

        _onDashboardError: function (bNotify) {
            var oModel = this.getView().getModel("dash");

            // No se conservan cifras de demostración si la primera consulta no
            // llega a SAP. Después de una carga correcta sí se conserva el
            // último resultado conocido para que el usuario no pierda contexto.
            if (!this._hasLoadedDashboard) {
                this._onDashboardLoaded(DashboardDataService.createEmpty(this._buildDashboardRequest().filtros));
            }
            oModel.setProperty("/connection", {
                status: "FALLBACK",
                source: "ODATA_ERROR"
            });

            if (bNotify) {
                MessageToast.show("No fue posible consultar SAP; se conservan los últimos datos disponibles");
            }
        },

        _loadDashboard: function (bNotify) {
            var oRequest = this._buildDashboardRequest();
            var oODataModel = this.getOwnerComponent().getModel("dashboardOData");

            this.getView().setBusy(true);

            DashboardCacheApiService.loadMantenimiento(oRequest.filtros).catch(function (oCacheError) {
                /*
                 * El fallback mantiene el modo local de BAS mientras la API
                 * todavía no está desplegada. En BTP la primera opción es la
                 * API, que reutiliza la caché mensual compartida.
                 */
                if (window.console && window.console.warn) {
                    window.console.warn("API de caché no disponible; se usará OData directo.", oCacheError);
                }
                return DashboardDataService.load(oODataModel, oRequest.filtros);
            }).then(function (oData) {
                this._onDashboardLoaded(oData);
                this._hasLoadedDashboard = true;
                if (bNotify) {
                    MessageToast.show(
                        oData.meta && oData.meta.source === "API_DASH"
                            ? "Dashboard actualizado desde API_DASH"
                            : "Dashboard actualizado con datos de SAP"
                    );
                }
            }.bind(this)).catch(function (oError) {
                if (window.console && window.console.error) {
                    window.console.error("Error al consultar el dashboard", oError);
                }
                this._onDashboardError(bNotify);
            }.bind(this)).finally(function () {
                this.getView().setBusy(false);
            }.bind(this));
        },

        _getFallbackGaugeSvg: function (fValue) {
            return '<svg viewBox="0 0 220 100" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mdComplianceBlue" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="#0867e8"/><stop offset="52%" stop-color="#1685ff"/><stop offset="100%" stop-color="#0875f5"/></linearGradient></defs><path d="M28 86 A82 64 0 0 1 192 86" pathLength="100" class="mdGaugeTrack"/><path d="M28 86 A82 64 0 0 1 192 86" pathLength="100" stroke-dasharray="' + fValue + ' 100" stroke="url(#mdComplianceBlue)" class="mdGaugeProgress"/></svg>';
        },

        _getFallbackChartSvg: function () {
            return '<svg viewBox="0 0 620 175" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><g class="mdChartGrid"><line x1="48" y1="18" x2="588" y2="18"/><line x1="48" y1="52" x2="588" y2="52"/><line x1="48" y1="86" x2="588" y2="86"/><line x1="48" y1="120" x2="588" y2="120"/><line x1="48" y1="150" x2="588" y2="150"/></g><g class="mdAxisText"><text x="8" y="22">300</text><text x="8" y="56">225</text><text x="8" y="90">150</text><text x="16" y="124">75</text><text x="24" y="154">0</text></g><polyline points="70,100 190,86 310,66 430,45 550,92" class="mdChartPlan"/><polyline points="70,122 190,108 310,88 430,69 550,116" class="mdChartReal"/><polyline points="70,72 190,70 310,39 430,37 550,78" class="mdChartRate"/><g class="mdDotsPlan"><circle cx="70" cy="100" r="4"/><circle cx="190" cy="86" r="4"/><circle cx="310" cy="66" r="4"/><circle cx="430" cy="45" r="4"/><circle cx="550" cy="92" r="4"/></g><g class="mdDotsReal"><circle cx="70" cy="122" r="4"/><circle cx="190" cy="108" r="4"/><circle cx="310" cy="88" r="4"/><circle cx="430" cy="69" r="4"/><circle cx="550" cy="116" r="4"/></g><g class="mdDotsRate"><circle cx="70" cy="72" r="4"/><circle cx="190" cy="70" r="4"/><circle cx="310" cy="39" r="4"/><circle cx="430" cy="37" r="4"/><circle cx="550" cy="78" r="4"/></g><g class="mdXAxisText"><text x="70" y="169">Sem 18</text><text x="190" y="169">Sem 19</text><text x="310" y="169">Sem 20</text><text x="430" y="169">Sem 21</text><text x="550" y="169">Sem 22</text></g></svg>';
        },

        _getDashboardData: function () {
            var initialPeriod = InitialLoadPeriod.previousMonth();
            return {
                filtros: {
                    // Primera carga: último mes completo; el selector anual mantiene su uso normal.
                    periodo: initialPeriod.year,
                    fechaInicio: initialPeriod.startDisplay,
                    fechaFin: initialPeriod.endDisplay,
                    zona: "TODAS",
                    supervisor: "TODOS",
                    tipoOrden: "TODOS",
                    turno: "TODOS",
                    mecanico: "TODOS",
                    estadoOrden: "TODOS"
                },
                filterOptions: {
                    periodos: [
                        { key: "2024", text: "2024 (Anual)" },
                        { key: "2025", text: "2025 (Anual)" },
                        { key: "2026", text: "2026 (Anual)" }
                    ],
                    zonas: [
                        { key: "TODAS", text: "Todas" },
                        { key: "NORTE", text: "Norte" },
                        { key: "CENTRO", text: "Centro" },
                        { key: "SUR", text: "Sur" },
                        { key: "ESTE", text: "Este" },
                        { key: "OESTE", text: "Oeste" }
                    ],
                    supervisores: [
                        { key: "TODOS", text: "Todos" },
                        { key: "SUP_01", text: "Supervisor 1" },
                        { key: "SUP_02", text: "Supervisor 2" }
                    ],
                    tiposOrden: [
                        { key: "TODOS", text: "Todos" },
                        { key: "SM01", text: "Preventivo" },
                        { key: "SM02", text: "Correctivo" },
                        { key: "SM03", text: "Call Center" }
                    ],
                    turnos: [
                        { key: "TODOS", text: "Todos" },
                        { key: "DIURNO", text: "Diurno" },
                        { key: "NOCTURNO", text: "Nocturno" },
                        { key: "FIN_SEMANA", text: "Fin de semana" }
                    ],
                    mecanicos: [
                        { key: "TODOS", text: "Todos" },
                        { key: "MEC_01", text: "Carlos Ruiz" },
                        { key: "MEC_02", text: "Ana López" },
                        { key: "MEC_03", text: "Miguel Torres" }
                    ],
                    estadosOrden: [
                        { key: "TODOS", text: "Todos" },
                        { key: "E0013", text: "Pendiente" },
                        { key: "E0014", text: "En proceso" },
                        { key: "E0015", text: "Finalizada" }
                    ]
                },
                summary: {
                    compliance: "94.8%",
                    complianceTargetText: "Meta ≥ 95%",
                    gaugeSvg: this._getFallbackGaugeSvg(94.8),
                    deviation: "6.4%",
                    deviationScaleMiddle: "6%",
                    deviationCaption: "Fuera de tolerancia",
                    deviationTargetText: "Meta ≤ 5%",
                    deviationMarkerHtml: '<span class="mdDevMarker" style="left:52%"></span>',
                    executed: "398 / 420",
                    forecast: "96.1%",
                    forecastExecuted: "404 / 420",
                    nonExecuted: "22",
                    nonExecutedPercent: "100%",
                    nonExecutedInfo: "22 órdenes no ejecutadas representan el 5.2% del plan.",
                    blockedOrders: "18",
                    callCenter: "63 / 66",
                    callCenterCompliance: "95.3%"
                },
                execution: {
                    chartSvg: this._getFallbackChartSvg(),
                    weeks: [
                        { dateLabel: "(28 Abr - 4 May)" },
                        { dateLabel: "(5 - 11 May)" },
                        { dateLabel: "(12 - 18 May)" },
                        { dateLabel: "(19 - 25 May)" },
                        { dateLabel: "(26 May - 1 Jun)" }
                    ]
                },
                zonePeriods: {
                    headers: ["28 Abr - 4 May", "5 - 11 May", "12 - 18 May", "19 - 25 May", "26 May - 1 Jun"],
                    rows: [
                        { zone: "Norte", periods: [{ value: "74%", tone: "yellow" }, { value: "67%", tone: "red" }, { value: "87%", tone: "green" }, { value: "87%", tone: "green" }, { value: "80%", tone: "yellow" }], total: "82%" },
                        { zone: "Centro", periods: [{ value: "64%", tone: "red" }, { value: "70%", tone: "yellow" }, { value: "85%", tone: "green" }, { value: "91%", tone: "green" }, { value: "84%", tone: "yellow" }], total: "77%" },
                        { zone: "Sur", periods: [{ value: "61%", tone: "red" }, { value: "61%", tone: "red" }, { value: "72%", tone: "yellow" }, { value: "78%", tone: "yellow" }, { value: "84%", tone: "yellow" }], total: "71%" },
                        { zone: "Este", periods: [{ value: "54%", tone: "red" }, { value: "62%", tone: "red" }, { value: "71%", tone: "yellow" }, { value: "66%", tone: "red" }, { value: "72%", tone: "yellow" }], total: "66%" },
                        { zone: "Oeste", periods: [{ value: "46%", tone: "red" }, { value: "53%", tone: "red" }, { value: "61%", tone: "red" }, { value: "71%", tone: "yellow" }, { value: "70%", tone: "yellow" }], total: "60%" }
                    ]
                },
                staff: {
                    activeTurns: "76",
                    technicians: "21",
                    currentShiftLine1: "Diurno, Nocturno",
                    currentShiftLine2: "y fin de semana",
                    capacity: "6,400 h",
                    planned: "5,800 h",
                    actual: "5,842 h",
                    capacityWidth: "100%",
                    plannedWidth: "91%",
                    actualWidth: "92%",
                    scale0: "0",
                    scale1: "2,000",
                    scale2: "4,000",
                    scale3: "6,000",
                    committed: "92.1%",
                    committedDetail: "(5,800 / 6,400 h)",
                    margin: "500 h",
                    marginDetail: "(8% disponible - Programado)",
                    shifts: [
                        { title: "Diurno", percent: "94.6%", technicians: "21", capacity: "4,200 h", programmed: "4,155 h", state: "Normal", tone: "normal" },
                        { title: "Nocturno", percent: "92.9%", technicians: "20", capacity: "1,500 h", programmed: "1,097 h", state: "Con exceso moderado", tone: "warning" },
                        { title: "Fin de semana", percent: "99.7%", technicians: "14", capacity: "600 h", programmed: "598 h", state: "Sobrecargado", tone: "error" },
                        { title: "Total", percent: "95.4%", technicians: "76", capacity: "6,400 h", programmed: "6,134 h", state: "Con exceso moderado", tone: "warning" }
                    ]
                },
                composition: {
                    preventive: { orders: "248 / 260", compliance: "95.4%" },
                    corrective: { orders: "88 / 95", compliance: "92.6%" }
                },
                causes: [
                    {
                        tone: "blue",
                        label: "Carta de no mantenimiento",
                        value: "8 (36%)",
                        width: "100%"
                    },
                    {
                        tone: "sky",
                        label: "Falta de materiales / refacciones",
                        value: "5 (23%)",
                        width: "63%"
                    },
                    {
                        tone: "green",
                        label: "Cliente no disponible",
                        value: "3 (14%)",
                        width: "38%"
                    },
                    {
                        tone: "yellow",
                        label: "Orden reprogramada",
                        value: "2 (9%)",
                        width: "25%"
                    },
                    {
                        tone: "orange",
                        label: "Mecánico no disponible",
                        value: "2 (9%)",
                        width: "25%"
                    },
                    {
                        tone: "purple",
                        label: "Información incompleta",
                        value: "1 (5%)",
                        width: "13%"
                    },
                    {
                        tone: "gray",
                        label: "Otro motivo",
                        value: "1 (4%)",
                        width: "13%"
                    }
                ],
                materials: [
                    {
                        icon: "sap-icon://action-settings",
                        name: "Refacciones",
                        unit: "(pzas)",
                        plan: "1,000 pzas",
                        real: "1,140 pzas",
                        variation: "+14%",
                        statusState: "Error",
                        planWidth: "72%",
                        realWidth: "84%"
                    },
                    {
                        icon: "sap-icon://product",
                        name: "Consumibles",
                        unit: "(pzas)",
                        plan: "600 pzas",
                        real: "570 pzas",
                        variation: "-5%",
                        statusState: "Success",
                        planWidth: "62%",
                        realWidth: "56%"
                    },
                    {
                        icon: "sap-icon://color-fill",
                        name: "Lubricantes",
                        unit: "(L)",
                        plan: "400 L",
                        real: "468 L",
                        variation: "+17%",
                        statusState: "Error",
                        planWidth: "50%",
                        realWidth: "70%"
                    },
                    {
                        icon: "sap-icon://wrench",
                        name: "Herramientas",
                        unit: "(pzas)",
                        plan: "200 pzas",
                        real: "190 pzas",
                        variation: "-5%",
                        statusState: "Success",
                        planWidth: "45%",
                        realWidth: "40%"
                    }
                ]
            };
        }
    });
});
