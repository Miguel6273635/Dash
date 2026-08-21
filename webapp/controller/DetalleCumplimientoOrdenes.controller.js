sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/ui/dom/includeStylesheet",
    "mantenimiento/model/DetalleCumplimientoOrdenesService"
], function (
    Controller,
    JSONModel,
    MessageToast,
    includeStylesheet,
    DetalleCumplimientoOrdenesService
) {
    "use strict";

    return Controller.extend("mantenimiento.controller.DetalleCumplimientoOrdenes", {
        onInit: function () {
            // Se cambia la versión sólo para invalidar la hoja simplificada
            // que el navegador pudo conservar en caché. El contenido que se
            // carga es el CSS original proporcionado para esta pantalla.
            includeStylesheet(sap.ui.require.toUrl(
                "mantenimiento/css/DetalleCumplimientoOrdenes.css"
            ) + "?v=20260818-original-layout");

            this._iLoadRequest = 0;
            this._oRawData = null;
            this.getView().setModel(new JSONModel(
                DetalleCumplimientoOrdenesService.createEmpty(this._getDefaultFilters())
            ), "cumplimientoModel");
            this.getView().getModel("cumplimientoModel").setSizeLimit(1000);
            this._loadData(false);
        },

        onAfterRendering: function () {
            this._renderizarVisualizaciones();
        },

        onAplicarFiltros: function () {
            this._loadData(true);
        },

        onPeriodoChange: function (oEvent) {
            var sYear = String(oEvent.getSource().getSelectedKey() || "");
            var oModel = this.getView().getModel("cumplimientoModel");

            if (!/^\d{4}$/.test(sYear)) {
                return;
            }
            oModel.setProperty("/filters/fechaDesde", "01/01/" + sYear);
            oModel.setProperty("/filters/fechaHasta", "31/12/" + sYear);
        },

        _loadData: function (bNotify) {
            var oODataModel = this._getODataModel();
            var iRequest = ++this._iLoadRequest;
            var mFilters = this._getFilters();

            this.getView().setBusy(true);
            DetalleCumplimientoOrdenesService.load(oODataModel, mFilters).then(function (oResult) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._oRawData = oResult.rawData;
                this._applyData(oResult.data);
                if (bNotify) {
                    MessageToast.show("Cumplimiento actualizado con datos de SAP");
                }
            }.bind(this)).catch(function (oError) {
                if (iRequest !== this._iLoadRequest) {
                    return;
                }
                this._onLoadError(oError, bNotify);
            }.bind(this)).finally(function () {
                if (iRequest === this._iLoadRequest) {
                    this.getView().setBusy(false);
                }
            }.bind(this));
        },

        _applyData: function (oData) {
            this.getView().getModel("cumplimientoModel").setData(oData);
            window.setTimeout(this._renderizarVisualizaciones.bind(this), 0);
        },

        _onLoadError: function (oError, bNotify) {
            var sMessage = oError && oError.message || "No fue posible consultar SAP";

            if (!this._oRawData) {
                this._applyData(DetalleCumplimientoOrdenesService.createEmpty(this._getFilters()));
            }
            if (window.console && window.console.error) {
                window.console.error("Error al consultar el detalle de cumplimiento", oError);
            }
            if (bNotify) {
                MessageToast.show(sMessage);
            }
        },

        _getODataModel: function () {
            var oComponent = this.getOwnerComponent && this.getOwnerComponent();

            return oComponent && oComponent.getModel("dashboardOData") ||
                this.getView().getModel("dashboardOData");
        },

        _getFilters: function () {
            var mFilters = this.getView().getModel("cumplimientoModel").getProperty("/filters") || {};

            return {
                periodo: mFilters.periodo,
                fechaDesde: mFilters.fechaDesde,
                fechaHasta: mFilters.fechaHasta,
                zona: mFilters.zona,
                supervisor: mFilters.supervisor,
                tipoServicio: mFilters.tipoServicio
            };
        },

        _getDefaultFilters: function () {
            return {
                periodo: "2026",
                fechaDesde: "01/01/2026",
                fechaHasta: "31/12/2026",
                zona: "TODAS",
                supervisor: "TODOS",
                tipoServicio: "TODOS"
            };
        },

        _renderizarVisualizaciones: function () {
            this._renderizarResponsables();
            this._renderizarTendencia();
            this._renderizarFallas();
        },

        _renderizarResponsables: function () {
            var oHtml = this.byId("htmlResponsables");
            var aData = this._getProperty("/graficas/responsables", []);
            var nMax = Math.max.apply(Math, [1].concat(aData.map(function (oItem) { return Number(oItem.total || 0); })));
            var sRows;

            if (!oHtml) {
                return;
            }
            if (!aData.length) {
                oHtml.setContent('<div class="dcgoEmptyChart">Sin OT no ejecutadas para los filtros seleccionados</div>');
                return;
            }
            sRows = aData.map(function (oItem) {
                var nInternal = Number(oItem.ordenesEjecutadas || 0);
                var nExternal = Number(oItem.enRevision || 0);
                var nTechnical = Number(oItem.areaTecnica || 0);
                var nTotal = Number(oItem.total || 0);
                var nWidth = nTotal / nMax * 100;

                return [
                    '<div class="dcgoRespHtmlRow">',
                    '<div class="dcgoRespHtmlName">', this._escapeHtml(oItem.responsable), '</div>',
                    '<div class="dcgoRespHtmlTrack"><div class="dcgoRespHtmlBar" style="width:', nWidth.toFixed(3), '%">',
                    '<div class="dcgoRespHtmlSegment dcgoRespInterna" style="width:', nTotal ? nInternal / nTotal * 100 : 0, '%">', nInternal || '', '</div>',
                    '<div class="dcgoRespHtmlSegment dcgoRespExterna" style="width:', nTotal ? nExternal / nTotal * 100 : 0, '%">', nExternal || '', '</div>',
                    '<div class="dcgoRespHtmlSegment dcgoRespTecnica" style="width:', nTotal ? nTechnical / nTotal * 100 : 0, '%">', nTechnical || '', '</div>',
                    '</div></div><div class="dcgoRespHtmlTotal">', nTotal, '</div></div>'
                ].join('');
            }.bind(this)).join('');

            oHtml.setContent([
                '<div class="dcgoRespHtmlRoot"><div class="dcgoRespHtmlLegend"><div class="dcgoRespHtmlLegendItems">',
                '<span><i class="dcgoRespDot dcgoRespInterna"></i>Interna (operación)</span>',
                '<span><i class="dcgoRespDot dcgoRespExterna"></i>Externa (cliente/proveedor)</span>',
                '<span><i class="dcgoRespDot dcgoRespTecnica"></i>Área técnica</span>',
                '</div><strong>Total</strong></div><div class="dcgoRespHtmlRows">', sRows, '</div></div>'
            ].join(''));
        },

        _renderizarTendencia: function () {
            var oHtml = this.byId("htmlTendenciaEjecucion");
            var aData = this._getProperty("/graficas/tendenciaEjecucion", []);
            var nWidth = 720;
            var nHeight = 265;
            var nLeft = 54;
            var nRight = 50;
            var nTop = 20;
            var nBottom = 44;
            var nPlotWidth = nWidth - nLeft - nRight;
            var nPlotHeight = nHeight - nTop - nBottom;
            var nMax;
            var aX;
            var yOrders;
            var yPercent;
            var points;
            var sGrid;
            var sContent;

            if (!oHtml) {
                return;
            }
            if (!aData.length) {
                oHtml.setContent("");
                return;
            }
            nMax = Math.max.apply(Math, [1].concat(aData.map(function (oItem) {
                return Math.max(Number(oItem.otPlaneadas || 0), Number(oItem.otEjecutadas || 0));
            })));
            nMax = Math.max(10, Math.ceil(nMax / 10) * 10);
            aX = aData.map(function (oItem, iIndex) {
                return aData.length === 1 ? nLeft + nPlotWidth / 2 : nLeft + iIndex * nPlotWidth / (aData.length - 1);
            });
            yOrders = function (iValue) { return nTop + nPlotHeight - Number(iValue || 0) / nMax * nPlotHeight; };
            yPercent = function (iValue) { return nTop + nPlotHeight - Number(iValue || 0) / 125 * nPlotHeight; };
            points = function (sField, fnY) {
                return aData.map(function (oItem, iIndex) {
                    return aX[iIndex].toFixed(1) + "," + fnY(oItem[sField]).toFixed(1);
                }).join(" ");
            };
            sGrid = [0, 1, 2, 3, 4].map(function (iIndex) {
                var iValue = nMax / 4 * iIndex;
                var iY = yOrders(iValue);

                return '<line x1="' + nLeft + '" y1="' + iY.toFixed(1) + '" x2="' + (nLeft + nPlotWidth) +
                    '" y2="' + iY.toFixed(1) + '" class="dcgoSvgGrid"/><text x="' + (nLeft - 10) + '" y="' +
                    (iY + 3).toFixed(1) + '" text-anchor="end" class="dcgoSvgAxisLabel">' + Math.round(iValue) + '</text>';
            }).join("");
            sGrid += [0, 25, 50, 75, 100, 125].map(function (iValue) {
                return '<text x="' + (nLeft + nPlotWidth + 10) + '" y="' + (yPercent(iValue) + 3).toFixed(1) +
                    '" class="dcgoSvgPctLabel">' + iValue + '%</text>';
            }).join("");
            sContent = [
                '<div class="dcgoTrendSvgWrap"><svg viewBox="0 0 ', nWidth, ' ', nHeight,
                '" preserveAspectRatio="none" class="dcgoTrendSvg" role="img" aria-label="Tendencia de ejecución">',
                '<defs><linearGradient id="dcgoExecArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2563eb" stop-opacity="0.22"/><stop offset="100%" stop-color="#2563eb" stop-opacity="0.03"/></linearGradient></defs>',
                sGrid,
                '<polygon points="', nLeft, ',', nTop + nPlotHeight, ' ', points("otEjecutadas", yOrders), ' ', nLeft + nPlotWidth, ',', nTop + nPlotHeight, '" fill="url(#dcgoExecArea)"/>',
                '<polyline points="', points("otPlaneadas", yOrders), '" class="dcgoSvgPlanLine"/>',
                '<polyline points="', points("otEjecutadas", yOrders), '" class="dcgoSvgExecLine"/>',
                '<polyline points="', points("cumplimiento", yPercent), '" class="dcgoSvgPctLine"/>',
                aData.map(function (oItem, iIndex) {
                    var iX = aX[iIndex];
                    var iPct = Number(oItem.cumplimiento || 0);

                    return '<circle cx="' + iX.toFixed(1) + '" cy="' + yOrders(oItem.otPlaneadas).toFixed(1) + '" r="3.2" class="dcgoSvgPlanPoint"/>' +
                        '<circle cx="' + iX.toFixed(1) + '" cy="' + yOrders(oItem.otEjecutadas).toFixed(1) + '" r="4" class="dcgoSvgExecPoint"/>' +
                        '<circle cx="' + iX.toFixed(1) + '" cy="' + yPercent(iPct).toFixed(1) + '" r="4" class="dcgoSvgPctPoint"/>' +
                        '<text x="' + iX.toFixed(1) + '" y="' + (yPercent(iPct) - 9).toFixed(1) + '" text-anchor="middle" class="dcgoSvgPctValue">' +
                        (iPct % 1 === 0 ? iPct : iPct.toFixed(1)) + '%</text>' +
                        '<text x="' + iX.toFixed(1) + '" y="' + (nHeight - 10) + '" text-anchor="middle" class="dcgoSvgMonth">' + this._escapeHtml(oItem.mes) + '</text>';
                }.bind(this)).join(""),
                '</svg></div>'
            ].join("");
            oHtml.setContent(sContent);
        },

        _renderizarFallas: function () {
            var oHtml = this.byId("htmlFallasDonut");
            var aData = this._getProperty("/graficas/fallasServicios", []);
            var aColors = ["#6D28D9", "#22C55E", "#4F46E5", "#38BDF8", "#F59E0B", "#94A3B8"];
            var iTotal = aData.reduce(function (iSum, oItem) { return iSum + Number(oItem.total || 0); }, 0);
            var iStart = 0;
            var aStops = [];

            if (!oHtml) {
                return;
            }
            if (!iTotal) {
                oHtml.setContent('<div class="dcgoEmptyChart">Sin clasificación de fallas</div>');
                return;
            }
            aData.forEach(function (oItem, iIndex) {
                var iEnd = iStart + Number(oItem.total || 0) / iTotal * 100;

                aStops.push(aColors[iIndex % aColors.length] + " " + iStart.toFixed(3) + "% " + iEnd.toFixed(3) + "%");
                iStart = iEnd;
            });
            oHtml.setContent('<div class="dcgoCssDonutWrap"><div class="dcgoCssDonut" style="background:conic-gradient(' +
                aStops.join(",") + ')"><div class="dcgoCssDonutHole"><strong>' + iTotal +
                '</strong><span>OT totales</span></div></div></div>');
        },

        _getProperty: function (sPath, vFallback) {
            var oModel = this.getView().getModel("cumplimientoModel");
            var vValue = oModel && oModel.getProperty(sPath);

            return vValue === undefined || vValue === null ? vFallback : vValue;
        },

        _escapeHtml: function (vValue) {
            return String(vValue == null ? "" : vValue)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\"/g, "&quot;")
                .replace(/'/g, "&#39;");
        },

        formatBarWidth: function (vValue) {
            return Math.max(0, Math.min(100, Number(vValue || 0))) + "%";
        },

        formatHeatLevel: function (vValue) {
            var iValue = Number(vValue || 0);

            return iValue >= 4 ? "4" : iValue === 3 ? "3" : iValue === 2 ? "2" : iValue === 1 ? "1" : "0";
        },

        formatFallaColorKey: function (sFalla) {
            var sValue = String(sFalla || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

            if (sValue.indexOf("mecanic") >= 0) { return "mecanica"; }
            if (sValue.indexOf("electric") >= 0) { return "electrica"; }
            if (sValue.indexOf("puerta") >= 0 || sValue.indexOf("sensor") >= 0) { return "puertas"; }
            if (sValue.indexOf("traccion") >= 0) { return "traccion"; }
            if (sValue.indexOf("maniobra") >= 0 || sValue.indexOf("control") >= 0) { return "maniobras"; }
            return "otra";
        },

        onVerElevadores: function () {
            MessageToast.show("El detalle de elevadores se calcula con las OT no ejecutadas del periodo");
        },

        onVerDetalleZona: function () {
            MessageToast.show("Las causas se agrupan por zona usando la asignación principal vigente");
        },

        onVerDetalleResponsable: function () {
            MessageToast.show("El seguimiento se agrupa por responsable y origen de la causa");
        },

        onVerDetalleFallas: function () {
            MessageToast.show("Las fallas usan las causas principales del contexto de clasificación");
        }
    });
});
