sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("mantenimiento.controller.Mecanicos", {

    onInit: function () {
      this._oModel = new JSONModel(this._getInitialData());
      this.getView().setModel(this._oModel, "dashboard");

      this._refreshHtmlBlocks();
    },

    onApplyFilters: function () {
      var oData = this._oModel.getData();
      var f = oData.filters;

      if (!f.fechaDesde || !f.fechaHasta) {
        MessageBox.warning("Selecciona fecha desde y fecha hasta.");
        return;
      }

      this._loadDashboardData(f);
    },

    _loadDashboardData: function (filters) {
      this._oModel.setProperty("/loading", true);

      /*
        AQUÍ PUEDES CONECTAR TU API REAL.

        Ejemplo:

        jQuery.ajax({
          url: "/api/dashboard/mecanicos",
          method: "GET",
          data: filters,
          success: function (response) {
            this._oModel.setData(response);
            this._refreshHtmlBlocks();
            MessageToast.show("Filtros aplicados correctamente.");
          }.bind(this),
          error: function () {
            MessageBox.error("No se pudo cargar la información de mecánicos.");
          }.bind(this),
          complete: function () {
            this._oModel.setProperty("/loading", false);
          }.bind(this)
        });
      */

      var newData = this._calculateMockByFilters(filters);

      this._oModel.setData(newData);
      this._refreshHtmlBlocks();

      this._oModel.setProperty("/loading", false);

      MessageToast.show("Filtros aplicados correctamente.");
    },

    _calculateMockByFilters: function (filters) {
      var data = this._getInitialData();
      data.filters = filters;

      var factor = 1;

      if (filters.zona && filters.zona !== "TODAS") {
        factor -= 0.08;
      }

      if (filters.turno && filters.turno !== "TODOS") {
        factor -= 0.12;
      }

      if (filters.especialidad && filters.especialidad !== "TODAS") {
        factor -= 0.10;
      }

      if (filters.tipoServicio && filters.tipoServicio !== "TODAS") {
        factor -= 0.06;
      }

      if (filters.estado && filters.estado !== "TODOS") {
        factor -= 0.04;
      }

      if (factor < 0.55) {
        factor = 0.55;
      }

      var activos = Math.round(76 * factor);
      var disponibles = Math.max(6, Math.round(14 * factor));
      var sobre = Math.max(2, Math.round(9 * factor));

      var dentroCapacidad = Math.max(1, Math.round(activos * 0.566));
      var cercaSaturacion = Math.max(1, Math.round(activos * 0.132));
      var inactivos = 0;

      var sumaEstado = disponibles + dentroCapacidad + cercaSaturacion + sobre + inactivos;

      if (sumaEstado !== activos) {
        dentroCapacidad = Math.max(0, dentroCapacidad + (activos - sumaEstado));
      }

      var capacidad = Math.round(6400 * factor);
      var carga = Math.round(5900 * factor);
      var brecha = capacidad - carga;
      var cobertura = carga > 0 ? Math.round((capacidad / carga) * 100) : 0;

      data.kpis.activos = activos;
      data.kpis.disponibles = disponibles;
      data.kpis.disponiblesPct = this._formatPercent(disponibles, activos) + " de la plantilla";
      data.kpis.sobrecapacidad = sobre;
      data.kpis.sobrecapacidadPct = this._formatPercent(sobre, activos) + " de la plantilla";
      data.kpis.cobertura = cobertura + "%";

      data.balance.capacidad = this._formatHours(capacidad);
      data.balance.carga = this._formatHours(carga);
      data.balance.brecha = (brecha >= 0 ? "+" : "-") + this._formatHours(Math.abs(brecha));
      data.balance.capacidadPct = "(62.1%)";
      data.balance.cargaPct = "(57.1%)";
      data.balance.brechaPct = brecha >= 0 ? "(8.5%)" : "(-8.5%)";
      data.balance.mensaje = brecha >= 0
        ? "La plantilla cubre el " + cobertura + "% de la demanda programada. Brecha positiva de " + this._formatHours(brecha) + " (8.5%)."
        : "La plantilla no cubre la demanda programada. Brecha negativa de " + this._formatHours(Math.abs(brecha)) + ".";

      data.distribucionTurnos = [
        {
          label: "Diurno",
          value: Math.round(activos * 0.632),
          pct: 63.2,
          pctText: "63.2%"
        },
        {
          label: "Nocturno",
          value: Math.round(activos * 0.211),
          pct: 21.1,
          pctText: "21.1%"
        },
        {
          label: "Fin de semana",
          value: 0,
          pct: 15.8,
          pctText: "15.8%"
        }
      ];

      data.distribucionTurnos[2].value =
        activos - data.distribucionTurnos[0].value - data.distribucionTurnos[1].value;

      data.estadoData = [
        {
          label: "Disponibles",
          value: disponibles,
          pctText: this._formatPercent(disponibles, activos)
        },
        {
          label: "Dentro de capacidad",
          value: dentroCapacidad,
          pctText: this._formatPercent(dentroCapacidad, activos)
        },
        {
          label: "Cerca de saturación",
          value: cercaSaturacion,
          pctText: this._formatPercent(cercaSaturacion, activos)
        },
        {
          label: "Sobre capacidad",
          value: sobre,
          pctText: this._formatPercent(sobre, activos)
        },
        {
          label: "Inactivos",
          value: inactivos,
          pctText: "0.0%"
        }
      ];

      var estadoOptimo = disponibles + dentroCapacidad;
      data.estadoMensaje =
        "El " + this._formatPercent(estadoOptimo, activos) +
        " de los mecánicos se encuentra dentro o por debajo de la capacidad óptima.";

      data.distribucionEspecialidad = [
        {
          label: "Mecánica",
          value: Math.round(activos * 0.368),
          pct: 36.8,
          pctText: "36.8%"
        },
        {
          label: "Eléctrica",
          value: Math.round(activos * 0.263),
          pct: 26.3,
          pctText: "26.3%"
        },
        {
          label: "Electrónica",
          value: Math.round(activos * 0.211),
          pct: 21.1,
          pctText: "21.1%"
        },
        {
          label: "Hidráulica",
          value: Math.round(activos * 0.105),
          pct: 10.5,
          pctText: "10.5%"
        },
        {
          label: "Otras",
          value: 0,
          pct: 5.3,
          pctText: "5.3%"
        }
      ];

      data.distribucionEspecialidad[4].value =
        activos -
        data.distribucionEspecialidad[0].value -
        data.distribucionEspecialidad[1].value -
        data.distribucionEspecialidad[2].value -
        data.distribucionEspecialidad[3].value;

      data.capacidadTotal = "92.1%";

      return data;
    },

    _refreshHtmlBlocks: function () {
      var data = this._oModel.getData();

      this._oModel.setProperty("/balanceHtml", this._buildBalanceHtml(data));
      this._oModel.setProperty("/estadoDonutHtml", this._buildEstadoDonutHtml(data));
      this._oModel.setProperty("/heatmapHtml", this._buildHeatmapHtml(data));
    },

    _buildBalanceHtml: function (data) {
      return '' +
        '<div class="balanceRange">' +
          '<div class="rangeTrack">' +
            '<span class="rangeDot left"></span>' +
            '<span class="rangeFill"></span>' +
            '<span class="rangeDot middle"></span>' +
            '<span class="rangeDot right"></span>' +
          '</div>' +
          '<div class="rangeLabels">' +
            '<span>0</span>' +
            '<span>' + data.balance.carga + '</span>' +
            '<span>' + data.balance.capacidad + '</span>' +
            '<span>6,900 h</span>' +
          '</div>' +
        '</div>';
    },

    _buildEstadoDonutHtml: function (data) {
      var total = data && data.kpis && data.kpis.activos ? data.kpis.activos : 76;

      return '' +
        '<div class="estadoDonutChart">' +
          '<div class="estadoDonutCenter">' +
            '<span class="estadoDonutIcon">👥</span>' +
            '<strong>' + total + '</strong>' +
            '<span>Total</span>' +
          '</div>' +
        '</div>';
    },

    _buildHeatmapHtml: function () {
      return '' +
        '<div class="heatTable">' +

          '<div class="heatRow heatHead">' +
            '<div></div>' +
            '<div>Norte</div>' +
            '<div>Centro</div>' +
            '<div>Sur</div>' +
            '<div>Este</div>' +
            '<div>Oeste</div>' +
          '</div>' +

          '<div class="heatRow">' +
            '<div class="heatLabel"><span>☼</span> Diurno</div>' +
            '<div class="heatCell ok">84%</div>' +
            '<div class="heatCell ok">93%</div>' +
            '<div class="heatCell warn">112%</div>' +
            '<div class="heatCell ok">78%</div>' +
            '<div class="heatCell ok">65%</div>' +
          '</div>' +

          '<div class="heatRow">' +
            '<div class="heatLabel"><span>☾</span> Nocturno</div>' +
            '<div class="heatCell ok">92%</div>' +
            '<div class="heatCell ok">98%</div>' +
            '<div class="heatCell warn">115%</div>' +
            '<div class="heatCell ok">82%</div>' +
            '<div class="heatCell ok">70%</div>' +
          '</div>' +

          '<div class="heatRow">' +
            '<div class="heatLabel"><span>▣</span> Fin de semana</div>' +
            '<div class="heatCell near">101%</div>' +
            '<div class="heatCell danger">118%</div>' +
            '<div class="heatCell critical">142%</div>' +
            '<div class="heatCell near">96%</div>' +
            '<div class="heatCell ok">76%</div>' +
          '</div>' +

          '<div class="heatLegend">' +
            '<span><i class="dot okDot"></i> &lt; 90% Balanceado</span>' +
            '<span><i class="dot nearDot"></i> 90% - 100% Cerca de saturación</span>' +
            '<span><i class="dot warnDot"></i> 100% - 120% Sobrecargado</span>' +
            '<span><i class="dot dangerDot"></i> &gt; 120% Crítico</span>' +
          '</div>' +

        '</div>';
    },

    _formatHours: function (value) {
      var abs = Math.abs(value);
      return abs.toLocaleString("es-MX") + " h";
    },

    _formatPercent: function (value, total) {
      if (!total || total === 0) {
        return "0.0%";
      }

      return ((value / total) * 100).toFixed(1) + "%";
    },

    _getInitialData: function () {
      return {
        loading: false,

        filters: {
          periodo: "2024-05",
          fechaDesde: "01/05/2024",
          fechaHasta: "31/05/2024",
          zona: "TODAS",
          supervisor: "TODOS",
          turno: "TODOS",
          tipoServicio: "TODAS",
          especialidad: "TODAS",
          estado: "TODOS"
        },

        catalogos: {
          periodos: [
            { key: "2024-05", text: "Mayo 2024" },
            { key: "2024-06", text: "Junio 2024" },
            { key: "2024-07", text: "Julio 2024" }
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
            { key: "SUP01", text: "Supervisor 01" },
            { key: "SUP02", text: "Supervisor 02" }
          ],
          turnos: [
            { key: "TODOS", text: "Todos" },
            { key: "DIURNO", text: "Diurno" },
            { key: "NOCTURNO", text: "Nocturno" },
            { key: "FIN_SEMANA", text: "Fin de semana" }
          ],
          tiposServicio: [
            { key: "TODAS", text: "Todas" },
            { key: "MANTENIMIENTO", text: "Mantenimiento planeado" },
            { key: "REPARACION", text: "Reparación / correctivo" },
            { key: "CALL_CENTER", text: "Call Center" }
          ],
          especialidades: [
            { key: "TODAS", text: "Todas" },
            { key: "MECANICA", text: "Mecánica" },
            { key: "ELECTRICA", text: "Eléctrica" },
            { key: "ELECTRONICA", text: "Electrónica" },
            { key: "HIDRAULICA", text: "Hidráulica" },
            { key: "OTRAS", text: "Otras" }
          ],
          estados: [
            { key: "TODOS", text: "Todos" },
            { key: "DISPONIBLES", text: "Disponibles" },
            { key: "DENTRO_CAPACIDAD", text: "Dentro de capacidad" },
            { key: "CERCA_SATURACION", text: "Cerca de saturación" },
            { key: "SOBRE_CAPACIDAD", text: "Sobre capacidad" },
            { key: "INACTIVOS", text: "Inactivos" }
          ]
        },

        kpis: {
          activos: 76,
          disponibles: 14,
          disponiblesPct: "18.4% de la plantilla",
          sobrecapacidad: 9,
          sobrecapacidadPct: "11.8% de la plantilla",
          cobertura: "94%"
        },

        balance: {
          capacidad: "6,400 h",
          capacidadPct: "(62.1%)",
          carga: "5,900 h",
          cargaPct: "(57.1%)",
          brecha: "+500 h",
          brechaPct: "(8.5%)",
          mensaje: "La plantilla cubre el 94% de la demanda programada. Brecha positiva de 500 h (8.5%)."
        },

        distribucionTurnos: [
          {
            label: "Diurno",
            value: 48,
            pct: 63.2,
            pctText: "63.2%"
          },
          {
            label: "Nocturno",
            value: 16,
            pct: 21.1,
            pctText: "21.1%"
          },
          {
            label: "Fin de semana",
            value: 12,
            pct: 15.8,
            pctText: "15.8%"
          }
        ],

        estadoData: [
          {
            label: "Disponibles",
            value: 14,
            pctText: "18.4%"
          },
          {
            label: "Dentro de capacidad",
            value: 43,
            pctText: "56.6%"
          },
          {
            label: "Cerca de saturación",
            value: 10,
            pctText: "13.2%"
          },
          {
            label: "Sobre capacidad",
            value: 9,
            pctText: "11.8%"
          },
          {
            label: "Inactivos",
            value: 0,
            pctText: "0.0%"
          }
        ],

        estadoMensaje: "El 75.0% de los mecánicos se encuentra dentro o por debajo de la capacidad óptima.",

        distribucionEspecialidad: [
          {
            label: "Mecánica",
            value: 28,
            pct: 36.8,
            pctText: "36.8%"
          },
          {
            label: "Eléctrica",
            value: 20,
            pct: 26.3,
            pctText: "26.3%"
          },
          {
            label: "Electrónica",
            value: 16,
            pct: 21.1,
            pctText: "21.1%"
          },
          {
            label: "Hidráulica",
            value: 8,
            pct: 10.5,
            pctText: "10.5%"
          },
          {
            label: "Otras",
            value: 4,
            pct: 5.3,
            pctText: "5.3%"
          }
        ],

        capacidadEspecialidad: [
          {
            label: "Mecánica",
            capacidad: "2,400",
            carga: "2,220",
            utilizacion: "92.5%",
            capPct: 85,
            cargaPct: 80,
            utilClass: "utilOk"
          },
          {
            label: "Eléctrica",
            capacidad: "1,200",
            carga: "1,310",
            utilizacion: "102.3%",
            capPct: 55,
            cargaPct: 63,
            utilClass: "utilDanger"
          },
          {
            label: "Hidráulico",
            capacidad: "800",
            carga: "680",
            utilizacion: "85.0%",
            capPct: 40,
            cargaPct: 34,
            utilClass: "utilOk"
          },
          {
            label: "Puertas / Sensores",
            capacidad: "640",
            carga: "610",
            utilizacion: "95.3%",
            capPct: 34,
            cargaPct: 31,
            utilClass: "utilWarn"
          },
          {
            label: "Maniobra / Control",
            capacidad: "640",
            carga: "530",
            utilizacion: "82.8%",
            capPct: 34,
            cargaPct: 29,
            utilClass: "utilOk"
          },
          {
            label: "Otros",
            capacidad: "640",
            carga: "550",
            utilizacion: "85.9%",
            capPct: 34,
            cargaPct: 30,
            utilClass: "utilOk"
          }
        ],

        capacidadTotal: "92.1%",

        presionServicios: [
          {
            label: "Mantenimiento planeado",
            req: "32.0",
            disp: "33.5",
            utilizacion: "95%",
            estado: "Normal",
            reqPct: 70,
            dispPct: 75,
            utilClass: "utilCircleOk"
          },
          {
            label: "Reparación / correctivo",
            req: "38.5",
            disp: "34.2",
            utilizacion: "112%",
            estado: "Riesgo",
            reqPct: 85,
            dispPct: 76,
            utilClass: "utilCircleDanger"
          },
          {
            label: "Call Center",
            req: "13.0",
            disp: "14.7",
            utilizacion: "88%",
            estado: "Normal",
            reqPct: 40,
            dispPct: 45,
            utilClass: "utilCircleOk"
          }
        ],

        presionTotal: {
          req: "83.5",
          disp: "82.4",
          utilizacion: "101%"
        }
      };
    }

  });
});