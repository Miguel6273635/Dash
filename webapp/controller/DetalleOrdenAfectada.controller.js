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
        "mantenimiento.controller.DetalleOrdenAfectada",
        {
            onInit: function () {
                var oData = {
                    filters: {
                        period: "currentMonth",
                        dateFrom: "01/05/2024",
                        dateTo: "31/05/2024",
                        orderType: "all",
                        supervisor: "all",
                        zone: "all"
                    },

                    kpis: {
                        orderStatus: "En riesgo",
                        equipment: "ELV-0615",
                        orderType: "Reparación correctiva",
                        commitmentDate: "03/06/2024",
                        plannedHours: "18 h",
                        actualHours: "21 h",
                        hourDeviation: "(+3 h / 16.7%)",
                        responsible: "Ana Martínez"
                    },

                    summary: {
                        order: "OT-245678",
                        orderClass: "PM Preventiva",
                        status: "En riesgo",
                        priority: "Alta",
                        creationDate: "24/05/2024 09:15",
                        commitmentDate: "03/06/2024",
                        commitmentEnd: "03/06/2024",
                        client: "Hospital San José",
                        zone: "Torre Reforma",
                        site: "Sur",
                        elevator: "Sala Rameau",
                        responsible: "Ana Martínez",
                        equipment: "ELV-0615",
                        relatedAsset: "AN-1025134"
                    },

                    operations: [
                        {
                            operation: "0010",
                            description: "Inicio de orden",
                            workCenter: "CT-ELV-01",
                            resource: "María Gómez",
                            plannedHours: "1.0 h",
                            actualHours: "1.2 h",
                            status: "Completa",
                            statusState: "Success",
                            impact: "Afectado",
                            impactState: "Error"
                        },
                        {
                            operation: "0020",
                            description: "Inspección general",
                            workCenter: "CT-ELV-02",
                            resource: "Carlos Reng",
                            plannedHours: "4.5 h",
                            actualHours: "4.5 h",
                            status: "En proceso",
                            statusState: "Warning",
                            impact: "Alto",
                            impactState: "Error"
                        },
                        {
                            operation: "0030",
                            description: "Reparación de freno",
                            workCenter: "CT-ELV-03",
                            resource: "Jorge Torres",
                            plannedHours: "6.0 h",
                            actualHours: "10.0 h",
                            status: "En riesgo",
                            statusState: "Warning",
                            impact: "Alto",
                            impactState: "Error"
                        },
                        {
                            operation: "0040",
                            description: "Prueba final",
                            workCenter: "CT-ELV-04",
                            resource: "Sofía López",
                            plannedHours: "3.0 h",
                            actualHours: "3.3 h",
                            status: "En proceso",
                            statusState: "Information",
                            impact: "Medio",
                            impactState: "Warning"
                        },
                        {
                            operation: "0050",
                            description: "Cierre de orden",
                            workCenter: "CT-ELV-05",
                            resource: "Ana Martínez",
                            plannedHours: "2.0 h",
                            actualHours: "2.0 h",
                            status: "Pendiente",
                            statusState: "None",
                            impact: "Bajo",
                            impactState: "Success"
                        }
                    ],

                    history: [
                        {
                            date: "24/05/2024 11:30",
                            user: "Ana Martínez",
                            action: "Cambio de estatus",
                            comment: "Se actualiza a en riesgo por retraso en refacción",
                            status: "En riesgo",
                            statusState: "Warning"
                        },
                        {
                            date: "23/05/2024 10:15",
                            user: "Luis Torres",
                            action: "Asignación de recurso",
                            comment: "Asignación de técnico y ayudante",
                            status: "Completa",
                            statusState: "Success"
                        },
                        {
                            date: "21/05/2024 16:45",
                            user: "Mario Gómez",
                            action: "Inicio de orden",
                            comment: "Se inicia inspección general del equipo",
                            status: "Completa",
                            statusState: "Success"
                        },
                        {
                            date: "20/05/2024 14:20",
                            user: "Carlos Reng",
                            action: "Reprogramación",
                            comment: "Reprogramación por retraso en refacción",
                            status: "En riesgo",
                            statusState: "Warning"
                        },
                        {
                            date: "24/05/2024 09:15",
                            user: "Sofía López",
                            action: "Registro",
                            comment: "Se crea la orden según detección de falla",
                            status: "Completa",
                            statusState: "Success"
                        }
                    ],

                    materials: [
                        {
                            type: "Material pendiente",
                            description: "Freno de seguridad",
                            responsible: "Almacén Central",
                            date: "02/06/2024",
                            status: "En proceso",
                            statusState: "Warning"
                        },
                        {
                            type: "Autorización",
                            description: "Aprobación de gasto",
                            responsible: "María González",
                            date: "03/06/2024",
                            status: "Pendiente",
                            statusState: "Information"
                        },
                        {
                            type: "Visita cliente",
                            description: "Verificación en sitio",
                            responsible: "Luis Ramírez",
                            date: "01/06/2024",
                            status: "Programada",
                            statusState: "Success"
                        },
                        {
                            type: "Validación legal",
                            description: "Revisión de contrato",
                            responsible: "Legal",
                            date: "02/06/2024",
                            status: "En proceso",
                            statusState: "Warning"
                        }
                    ],

                    resources: [
                        {
                            type: "Mecánicos",
                            assigned: "2",
                            plannedHours: "14.0 h",
                            actualHours: "16.5 h",
                            deviation: "+2.5 h (17.9%)",
                            utilizationBar: 88,
                            utilization: "118%"
                        },
                        {
                            type: "Ayudantes",
                            assigned: "2",
                            plannedHours: "4.0 h",
                            actualHours: "4.5 h",
                            deviation: "+0.5 h (12.5%)",
                            utilizationBar: 84,
                            utilization: "113%"
                        }
                    ],

                    impact: {
                        reason: "Ausencia de contrato",
                        equipmentStatus: "Bloqueado activo",
                        managementStatus: "En validación",
                        blockedDays: "69"
                    }
                };

                var oModel = new JSONModel(oData);

                oModel.setSizeLimit(100);

                this.getView().setModel(oModel);
            },

            onApplyFilters: function () {
                var oFilters = this.getView()
                    .getModel()
                    .getProperty("/filters");

                MessageToast.show(
                    "Filtros aplicados: " +
                    oFilters.dateFrom +
                    " al " +
                    oFilters.dateTo
                );
            },

            onViewOrderStatus: function () {
                this._showDetailMessage("estatus de la orden");
            },

            onViewEquipment: function () {
                this._showDetailMessage("equipo ELV-0615");
            },

            onViewOrderType: function () {
                this._showDetailMessage("tipo de orden");
            },

            onViewCommitment: function () {
                this._showDetailMessage("fecha compromiso");
            },

            onViewPlannedHours: function () {
                this._showDetailMessage("horas programadas");
            },

            onViewActualHours: function () {
                this._showDetailMessage("horas reales");
            },

            onViewResponsible: function () {
                this._showDetailMessage("responsable Ana Martínez");
            },

            onViewOperations: function () {
                this._showDetailMessage("operaciones de la orden");
            },

            onViewHistory: function () {
                this._showDetailMessage("historial completo");
            },

            onViewPending: function () {
                this._showDetailMessage("materiales y pendientes");
            },

            onViewResources: function () {
                this._showDetailMessage("detalle de recursos");
            },

            onViewAssociatedEquipment: function () {
                this._showDetailMessage("equipo asociado ELV-0615");
            },

            _showDetailMessage: function (sSection) {
                MessageToast.show("Abriendo " + sSection);
            }
        }
    );
});