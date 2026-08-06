sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/ActionSheet",
    "sap/m/Button"
], function (
    Controller,
    JSONModel,
    MessageToast,
    ActionSheet,
    Button
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleResponsable", {

        onInit: function () {
            this._iPageSize = 5;
            this._bSemanaClickAsignado = false;

            var oRouter = this.getOwnerComponent().getRouter();

            if (oRouter && oRouter.getRoute("RouteDetalleResponsable")) {
                oRouter
                    .getRoute("RouteDetalleResponsable")
                    .attachPatternMatched(this._onObjectMatched, this);
            } else {
                this._loadDetalleResponsable("1");
            }
        },

        onAfterRendering: function () {
            var oChipSemana = this.byId("chipSemana");

            if (!oChipSemana || this._bSemanaClickAsignado) {
                return;
            }

            oChipSemana.addEventDelegate({
                onclick: function () {
                    this._abrirMenuSemana(oChipSemana);
                }.bind(this)
            });

            this._bSemanaClickAsignado = true;
        },

        _onObjectMatched: function (oEvent) {
            var sResponsableId = oEvent.getParameter("arguments").responsableId || "1";
            this._loadDetalleResponsable(sResponsableId);
        },

        _loadDetalleResponsable: function (sResponsableId) {
            var oResponsable = this._getResponsableData(sResponsableId);

            var oDetailModel = new JSONModel(oResponsable);
            oDetailModel.setSizeLimit(1000);

            this.getView().setModel(oDetailModel, "detail");
            this._actualizarPaginacion();
        },

        _getResponsableData: function (sResponsableId) {
            var mResponsables = {
                "1": "Juan Pérez",
                "2": "María González",
                "3": "Carlos Herrera",
                "4": "Pedro López",
                "5": "Ana Martínez",
                "6": "Luis Ramírez"
            };

            var sNombreResponsable = mResponsables[sResponsableId] || "Responsable ID: " + sResponsableId;

            var aDesglose = [
                {
                    ot: "OT-100245",
                    equipo: "EV-1024",
                    cliente: "Torre Reforma",
                    tipoOt: "Preventivo",
                    causa: "Refacciones",
                    retraso: 5,
                    estado: "Pendiente"
                },
                {
                    ot: "OT-100311",
                    equipo: "EV-0871",
                    cliente: "Torre Reforma",
                    tipoOt: "Preventivo",
                    causa: "Refacciones",
                    retraso: 4,
                    estado: "Pendiente"
                },
                {
                    ot: "OT-100367",
                    equipo: "EV-1210",
                    cliente: "Corporativo ABC",
                    tipoOt: "Correctivo",
                    causa: "Cliente no disponible",
                    retraso: 2,
                    estado: "Reprogramada"
                },
                {
                    ot: "OT-100412",
                    equipo: "EV-1330",
                    cliente: "Plaza Galerías",
                    tipoOt: "Preventivo",
                    causa: "Refacciones",
                    retraso: 1,
                    estado: "Pendiente"
                },
                {
                    ot: "OT-100528",
                    equipo: "EV-1024",
                    cliente: "Torre Reforma",
                    tipoOt: "Correctivo",
                    causa: "Documentación",
                    retraso: 1,
                    estado: "En proceso"
                },
                {
                    ot: "OT-100579",
                    equipo: "EV-0988",
                    cliente: "Corporativo ABC",
                    tipoOt: "Preventivo",
                    causa: "Planeación",
                    retraso: 1,
                    estado: "Pendiente"
                }
            ];

            return {
                responsableId: sResponsableId,
                responsable: sNombreResponsable,
                zona: "Norte",
                semana: "Semana 18 (29 abr - 5 may 2024)",
                origenActivo: "Todas",

                filtros: {
                    semanaKey: "18",
                    semanaTexto: "Semana 18 (29 abr - 5 may 2024)",
                    zonaKey: "norte"
                },

                opcionesSemana: [
                    {
                        key: "18",
                        text: "Semana 18 (29 abr - 5 may 2024)"
                    },
                    {
                        key: "17",
                        text: "Semana 17 (22 abr - 28 abr 2024)"
                    },
                    {
                        key: "16",
                        text: "Semana 16 (15 abr - 21 abr 2024)"
                    }
                ],

                opcionesZona: [
                    {
                        key: "norte",
                        text: "Norte"
                    },
                    {
                        key: "centro",
                        text: "Centro"
                    },
                    {
                        key: "sur",
                        text: "Sur"
                    },
                    {
                        key: "todas",
                        text: "Todas"
                    }
                ],

                kpi: {
                    otDesviadas: 6,
                    equiposAfectados: 4,
                    clientesAfectados: 3,
                    cumplimiento: 78
                },

                desgloseTotal: aDesglose,
                desgloseVisibles: aDesglose.slice(0, 5),

                paginacion: {
                    texto: "Mostrando 1 a 5 de 6 OT desviadas"
                }
            };
        },

        _abrirMenuSemana: function (oSourceControl) {
            var oModel = this.getView().getModel("detail");
            var aOpciones = oModel.getProperty("/opcionesSemana") || [];
            var aBotones = [];
            var oActionSheet;

            aBotones = aOpciones.map(function (oOpcion) {
                return new Button({
                    text: oOpcion.text,
                    press: function () {
                        oModel.setProperty("/filtros/semanaKey", oOpcion.key);
                        oModel.setProperty("/filtros/semanaTexto", oOpcion.text);
                    }
                });
            });

            oActionSheet = new ActionSheet({
                title: "Seleccionar semana",
                buttons: aBotones,
                afterClose: function () {
                    oActionSheet.destroy();
                }
            });

            this.getView().addDependent(oActionSheet);
            oActionSheet.openBy(oSourceControl);
        },

        onApplyFilters: function () {
            var oModel = this.getView().getModel("detail");
            var oZonaSelect = this.byId("selectZona");
            var oZonaItem = oZonaSelect.getSelectedItem();

            oModel.setProperty("/semana", oModel.getProperty("/filtros/semanaTexto"));

            if (oZonaItem) {
                oModel.setProperty("/zona", oZonaItem.getText());
            }

            MessageToast.show("Filtros aplicados correctamente");
        },

        onPageSizeChange: function (oEvent) {
            var sSelectedKey = oEvent.getSource().getSelectedKey();
            var iPageSize = parseInt(sSelectedKey, 10);

            if (isNaN(iPageSize) || iPageSize <= 0) {
                iPageSize = 5;
            }

            this._iPageSize = iPageSize;
            this._actualizarPaginacion();
        },

        _actualizarPaginacion: function () {
            var oModel = this.getView().getModel("detail");

            if (!oModel) {
                return;
            }

            var aTotal = oModel.getProperty("/desgloseTotal") || [];
            var iTotal = aTotal.length;
            var iFinal = Math.min(this._iPageSize, iTotal);
            var aVisibles = aTotal.slice(0, this._iPageSize);
            var sTexto;

            if (iTotal === 0) {
                sTexto = "Mostrando 0 a 0 de 0 OT desviadas";
            } else {
                sTexto = "Mostrando 1 a " + iFinal + " de " + iTotal + " OT desviadas";
            }

            oModel.setProperty("/desgloseVisibles", aVisibles);
            oModel.setProperty("/paginacion/texto", sTexto);
        },

        onNavBack: function () {
            window.history.go(-1);
        },

        onNavToOrder: function (oEvent) {
            var sOrder = oEvent.getSource().getText();

            MessageToast.show("Navegando al detalle de la orden: " + sOrder);

            /*
             * Cuando tengas la ruta real del detalle de orden,
             * reemplaza este MessageToast por la navegación.
             */
        }
    });
});