sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/core/routing/History"
], function (Controller, JSONModel, MessageToast, History) {
    "use strict";

    return Controller.extend("mantenimiento.controller.HistorialSeguimiento", {

        onInit: function () {
            var oModel = new JSONModel(this._getInitialData());

            oModel.setSizeLimit(100);

            this.getView().setModel(oModel, "historial");

            var oRouter = this.getOwnerComponent().getRouter();
            var oRoute = oRouter.getRoute("RouteHistorialSeguimiento");

            if (oRoute) {
                oRoute.attachPatternMatched(
                    this._onRouteMatched,
                    this
                );
            }
        },

        _onRouteMatched: function (oEvent) {
            var oArguments =
                oEvent.getParameter("arguments") || {};

            var sEquipoId = oArguments.equipoId
                ? decodeURIComponent(oArguments.equipoId)
                : "ELV-10234";

            var oModel =
                this.getView().getModel("historial");

            oModel.setProperty(
                "/equipmentId",
                sEquipoId
            );

            oModel.setProperty(
                "/general/equipo",
                sEquipoId
            );
        },

        onNavBack: function () {
            var sPreviousHash =
                History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
                return;
            }

            this._navToRoute(
                "RouteFichaEquipoBloqueado"
            );
        },

        onGoToEquiposBloqueados: function () {
            this._navToRoute(
                "RouteEquiposBloqueados"
            );
        },

        onGoToDetalleEquipo: function () {
            this._navToRoute(
                "RouteFichaEquipoBloqueado"
            );
        },

        _navToRoute: function (sRouteName) {
            var oRouter =
                this.getOwnerComponent().getRouter();

            if (oRouter.getRoute(sRouteName)) {
                oRouter.navTo(sRouteName);
                return;
            }

            MessageToast.show(
                "La ruta " +
                sRouteName +
                " no está declarada en el manifest.json."
            );
        },

        onApplyFilters: function () {
            var oView = this.getView();
            var oModel =
                oView.getModel("historial");

            var oFilters = {
                dateFrom:
                    oView.byId("dateFrom").getDateValue(),

                dateTo:
                    oView.byId("dateTo").getDateValue(),

                eventType:
                    oView
                        .byId("eventTypeSelect")
                        .getSelectedKey(),

                responsible:
                    oView
                        .byId("responsibleSelect")
                        .getSelectedKey(),

                resultStatus:
                    oView
                        .byId("resultStatusSelect")
                        .getSelectedKey(),

                search:
                    oView
                        .byId("trackingSearch")
                        .getValue()
                        .trim()
                        .toLowerCase()
            };

            oModel.setProperty(
                "/timeline",
                this._filterCollection(
                    oModel.getProperty("/timelineAll"),
                    oFilters
                )
            );

            oModel.setProperty(
                "/pending",
                this._filterCollection(
                    oModel.getProperty("/pendingAll"),
                    oFilters
                )
            );

            oModel.setProperty(
                "/log",
                this._filterCollection(
                    oModel.getProperty("/logAll"),
                    oFilters
                )
            );

            MessageToast.show("Filtros aplicados");
        },

        onOrderPress: function (oEvent) {
            var sOrder =
                oEvent.getSource().getText();

            MessageToast.show(
                "Orden relacionada: " + sOrder
            );
        },

        onSearch: function () {
            this.onApplyFilters();
        },

        onSearchLive: function (oEvent) {
            var sNewValue =
                oEvent.getParameter("newValue");

            if (!sNewValue) {
                this.onApplyFilters();
            }
        },

        _filterCollection: function (
            aItems,
            oFilters
        ) {
            return (aItems || []).filter(
                function (oItem) {
                    var oItemDate =
                        this._parseIsoDate(
                            oItem.dateIso
                        );

                    var bDateFrom =
                        !oFilters.dateFrom ||
                        (
                            oItemDate &&
                            oItemDate >=
                                this._startOfDay(
                                    oFilters.dateFrom
                                )
                        );

                    var bDateTo =
                        !oFilters.dateTo ||
                        (
                            oItemDate &&
                            oItemDate <=
                                this._endOfDay(
                                    oFilters.dateTo
                                )
                        );

                    var bEventType =
                        !oFilters.eventType ||
                        oFilters.eventType === "ALL" ||
                        oItem.eventType ===
                            oFilters.eventType;

                    var bResponsible =
                        !oFilters.responsible ||
                        oFilters.responsible === "ALL" ||
                        oItem.responsibleKey ===
                            oFilters.responsible;

                    var bStatus =
                        !oFilters.resultStatus ||
                        oFilters.resultStatus === "ALL" ||
                        oItem.statusKey ===
                            oFilters.resultStatus;

                    var sSearchableText = [
                        oItem.date,
                        oItem.time,
                        oItem.user,
                        oItem.responsible,
                        oItem.pending,
                        oItem.area,
                        oItem.eventTypeText,
                        oItem.comment,
                        oItem.previousStatus,
                        oItem.resultStatus,
                        oItem.order,
                        oItem.evidence,
                        oItem.priority
                    ]
                        .join(" ")
                        .toLowerCase();

                    var bSearch =
                        !oFilters.search ||
                        sSearchableText.indexOf(
                            oFilters.search
                        ) !== -1;

                    return (
                        bDateFrom &&
                        bDateTo &&
                        bEventType &&
                        bResponsible &&
                        bStatus &&
                        bSearch
                    );
                }.bind(this)
            );
        },

        _parseIsoDate: function (sIsoDate) {
            if (!sIsoDate) {
                return null;
            }

            var aParts = sIsoDate.split("-");

            return new Date(
                Number(aParts[0]),
                Number(aParts[1]) - 1,
                Number(aParts[2])
            );
        },

        _startOfDay: function (oDate) {
            return new Date(
                oDate.getFullYear(),
                oDate.getMonth(),
                oDate.getDate(),
                0,
                0,
                0,
                0
            );
        },

        _endOfDay: function (oDate) {
            return new Date(
                oDate.getFullYear(),
                oDate.getMonth(),
                oDate.getDate(),
                23,
                59,
                59,
                999
            );
        },

        _getInitialData: function () {
            var aTimeline = [
                {
                    date: "31/05/2024 10:20",
                    dateIso: "2024-05-31",
                    user: "Ana Martínez",
                    responsibleKey: "ANA_MARTINEZ",
                    comment:
                        "Recordatorio de seguimiento a responsable",
                    eventType: "SEGUIMIENTO",
                    eventTypeText: "Seguimiento",
                    resultStatus: "Pendiente",
                    statusKey: "PENDING"
                },
                {
                    date: "29/05/2024 16:45",
                    dateIso: "2024-05-29",
                    user: "María González",
                    responsibleKey: "MARIA_GONZALEZ",
                    comment:
                        "Revisión legal del contrato en curso",
                    eventType: "REVISION",
                    eventTypeText: "Revisión",
                    resultStatus: "En proceso",
                    statusKey: "PROCESS"
                },
                {
                    date: "27/05/2024 14:05",
                    dateIso: "2024-05-27",
                    user: "Sofía López",
                    responsibleKey: "SOFIA_LOPEZ",
                    comment:
                        "Se solicita liberación administrativa",
                    eventType: "SOLICITUD",
                    eventTypeText: "Solicitud",
                    resultStatus: "En proceso",
                    statusKey: "PROCESS"
                },
                {
                    date: "24/05/2024 11:30",
                    dateIso: "2024-05-24",
                    user: "Luis Ramírez",
                    responsibleKey: "LUIS_RAMIREZ",
                    comment:
                        "Se identifica cambio a proveedor externo",
                    eventType: "ACTUALIZACION",
                    eventTypeText: "Actualización",
                    resultStatus: "Bloqueado activo",
                    statusKey: "BLOCKED"
                },
                {
                    date: "22/05/2024 09:15",
                    dateIso: "2024-05-22",
                    user: "Ana Martínez",
                    responsibleKey: "ANA_MARTINEZ",
                    comment:
                        "Se confirma solicitud de revisión contractual",
                    eventType: "VALIDACION",
                    eventTypeText: "Validación",
                    resultStatus: "En análisis",
                    statusKey: "ANALYSIS"
                },
                {
                    date: "20/04/2024 08:40",
                    dateIso: "2024-04-20",
                    user: "Sistema",
                    responsibleKey: "SISTEMA",
                    comment:
                        "Se genera bloqueo inicial del equipo",
                    eventType: "CREACION",
                    eventTypeText: "Creación",
                    resultStatus: "Bloqueado activo",
                    statusKey: "BLOCKED"
                }
            ];

            var aPending = [
                {
                    pending: "Revisión contrato",
                    responsible: "Luis Ramírez",
                    responsibleKey: "LUIS_RAMIREZ",
                    resultStatus: "Pendiente",
                    statusKey: "PENDING",
                    date: "05/06/2024",
                    dateIso: "2024-06-05",
                    priority: "Alta",
                    priorityKey: "HIGH",
                    eventType: "REVISION",
                    eventTypeText: "Revisión"
                },
                {
                    pending:
                        "Liberación administrativa",
                    responsible: "Sofía López",
                    responsibleKey: "SOFIA_LOPEZ",
                    resultStatus: "En proceso",
                    statusKey: "PROCESS",
                    date: "07/06/2024",
                    dateIso: "2024-06-07",
                    priority: "Alta",
                    priorityKey: "HIGH",
                    eventType: "SOLICITUD",
                    eventTypeText: "Solicitud"
                },
                {
                    pending: "Revisión legal",
                    responsible: "María González",
                    responsibleKey:
                        "MARIA_GONZALEZ",
                    resultStatus: "En análisis",
                    statusKey: "ANALYSIS",
                    date: "02/06/2024",
                    dateIso: "2024-06-02",
                    priority: "Media",
                    priorityKey: "MEDIUM",
                    eventType: "REVISION",
                    eventTypeText: "Revisión"
                },
                {
                    pending:
                        "Confirmación proveedor",
                    responsible: "Carlos Núñez",
                    responsibleKey: "CARLOS_NUNEZ",
                    resultStatus: "Pendiente",
                    statusKey: "PENDING",
                    date: "02/06/2024",
                    dateIso: "2024-06-02",
                    priority: "Media",
                    priorityKey: "MEDIUM",
                    eventType: "VALIDACION",
                    eventTypeText: "Validación"
                },
                {
                    pending: "Documento de alta",
                    responsible: "Ana Martínez",
                    responsibleKey: "ANA_MARTINEZ",
                    resultStatus: "Pendiente",
                    statusKey: "PENDING",
                    date: "07/06/2024",
                    dateIso: "2024-06-07",
                    priority: "Media",
                    priorityKey: "MEDIUM",
                    eventType: "SEGUIMIENTO",
                    eventTypeText: "Seguimiento"
                }
            ];

            var aLog = [
                {
                    date: "31/05/2024",
                    time: "10:20",
                    dateIso: "2024-05-31",
                    user: "Ana Martínez",
                    responsibleKey: "ANA_MARTINEZ",
                    area: "Operaciones",
                    eventType: "SEGUIMIENTO",
                    eventTypeText: "Seguimiento",
                    comment:
                        "Recordatorio de seguimiento a responsable",
                    previousStatus: "Pendiente",
                    previousStatusKey: "PENDING",
                    resultStatus: "Pendiente",
                    statusKey: "PENDING",
                    order: "N/A",
                    evidence: "Adjunto",
                    evidenceKey: "ATTACHMENT"
                },
                {
                    date: "29/05/2024",
                    time: "16:45",
                    dateIso: "2024-05-29",
                    user: "María González",
                    responsibleKey:
                        "MARIA_GONZALEZ",
                    area: "Legal",
                    eventType: "REVISION",
                    eventTypeText: "Revisión",
                    comment:
                        "Revisión legal del contrato en curso",
                    previousStatus: "En proceso",
                    previousStatusKey: "PROCESS",
                    resultStatus: "En revisión",
                    statusKey: "REVIEW",
                    order: "OT-245736",
                    evidence: "Acta",
                    evidenceKey: "ACT"
                },
                {
                    date: "27/05/2024",
                    time: "14:05",
                    dateIso: "2024-05-27",
                    user: "Sofía López",
                    responsibleKey: "SOFIA_LOPEZ",
                    area: "Administración",
                    eventType: "SOLICITUD",
                    eventTypeText: "Solicitud",
                    comment:
                        "Se solicita liberación administrativa",
                    previousStatus: "Pendiente",
                    previousStatusKey: "PENDING",
                    resultStatus: "En proceso",
                    statusKey: "PROCESS",
                    order: "OT-245720",
                    evidence: "Correo",
                    evidenceKey: "MAIL"
                },
                {
                    date: "24/05/2024",
                    time: "11:30",
                    dateIso: "2024-05-24",
                    user: "Luis Ramírez",
                    responsibleKey: "LUIS_RAMIREZ",
                    area: "Contratos",
                    eventType: "ACTUALIZACION",
                    eventTypeText: "Actualización",
                    comment:
                        "Se identifica cambio a proveedor externo",
                    previousStatus: "En análisis",
                    previousStatusKey: "ANALYSIS",
                    resultStatus:
                        "Bloqueado activo",
                    statusKey: "BLOCKED",
                    order: "OT-245437",
                    evidence: "Adjunto",
                    evidenceKey: "ATTACHMENT"
                },
                {
                    date: "22/05/2024",
                    time: "09:15",
                    dateIso: "2024-05-22",
                    user: "Ana Martínez",
                    responsibleKey: "ANA_MARTINEZ",
                    area: "Operaciones",
                    eventType: "VALIDACION",
                    eventTypeText: "Validación",
                    comment:
                        "Se confirma solicitud de revisión contractual",
                    previousStatus: "Pendiente",
                    previousStatusKey: "PENDING",
                    resultStatus: "En análisis",
                    statusKey: "ANALYSIS",
                    order: "OT-245436",
                    evidence: "Correo",
                    evidenceKey: "MAIL"
                },
                {
                    date: "20/04/2024",
                    time: "08:40",
                    dateIso: "2024-04-20",
                    user: "Sistema",
                    responsibleKey: "SISTEMA",
                    area: "Sistema",
                    eventType: "CREACION",
                    eventTypeText: "Creación",
                    comment:
                        "Se genera bloqueo inicial del equipo",
                    previousStatus: "N/A",
                    previousStatusKey: "NONE",
                    resultStatus:
                        "Bloqueado activo",
                    statusKey: "BLOCKED",
                    order: "N/A",
                    evidence: "N/A",
                    evidenceKey: "NONE"
                }
            ];

            return {
                equipmentId: "ELV-10234",

                general: {
                    equipo: "ELV-10234",
                    cliente: "Cliente A",
                    zona: "Norte",
                    supervisor: "Ana Martínez",
                    sitio: "Torre Reforma",
                    direccion:
                        "Av. Reforma 123, CDMX",
                    tipoEquipo: "Elevador",
                    modelo: "MEL-800"
                },

                summary: {
                    motivo:
                        "Cambio a otro proveedor",
                    responsableActual:
                        "Luis Ramírez",
                    fechaBloqueo: "20/04/2024",
                    estadoGestion:
                        "En validación contractual",
                    estadoKey: "PROCESS",
                    fechaCompromiso:
                        "05/06/2024",
                    observacion:
                        "Bloqueo derivado de transición contractual y validación administrativa."
                },

                eventTypes: [
                    {
                        key: "ALL",
                        text: "Todos"
                    },
                    {
                        key: "SEGUIMIENTO",
                        text: "Seguimiento"
                    },
                    {
                        key: "REVISION",
                        text: "Revisión"
                    },
                    {
                        key: "SOLICITUD",
                        text: "Solicitud"
                    },
                    {
                        key: "ACTUALIZACION",
                        text: "Actualización"
                    },
                    {
                        key: "VALIDACION",
                        text: "Validación"
                    },
                    {
                        key: "CREACION",
                        text: "Creación"
                    }
                ],

                responsibles: [
                    {
                        key: "ALL",
                        text: "Todos"
                    },
                    {
                        key: "ANA_MARTINEZ",
                        text: "Ana Martínez"
                    },
                    {
                        key: "LUIS_RAMIREZ",
                        text: "Luis Ramírez"
                    },
                    {
                        key: "MARIA_GONZALEZ",
                        text: "María González"
                    },
                    {
                        key: "SOFIA_LOPEZ",
                        text: "Sofía López"
                    },
                    {
                        key: "CARLOS_NUNEZ",
                        text: "Carlos Núñez"
                    },
                    {
                        key: "SISTEMA",
                        text: "Sistema"
                    }
                ],

                resultStatuses: [
                    {
                        key: "ALL",
                        text: "Todos"
                    },
                    {
                        key: "PENDING",
                        text: "Pendiente"
                    },
                    {
                        key: "PROCESS",
                        text: "En proceso"
                    },
                    {
                        key: "ANALYSIS",
                        text: "En análisis"
                    },
                    {
                        key: "REVIEW",
                        text: "En revisión"
                    },
                    {
                        key: "BLOCKED",
                        text: "Bloqueado activo"
                    }
                ],

                timelineAll: aTimeline,
                timeline: aTimeline.slice(),

                pendingAll: aPending,
                pending: aPending.slice(),

                logAll: aLog,
                log: aLog.slice()
            };
        }

    });
});