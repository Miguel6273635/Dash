sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("mantenimiento.controller.DetalleMecanicos", {

    onInit: function () {
      this._oModel = new JSONModel(this._getInitialData());
      this.getView().setModel(this._oModel, "detalle");

      this._refreshHtmlBlocks();
    },

    onApplyFilters: function () {
      var oData = this._oModel.getData();
      var f = oData.filters;

      if (!f.fechaDesde || !f.fechaHasta) {
        MessageBox.warning("Selecciona fecha desde y fecha hasta.");
        return;
      }

      this._loadData(f);
    },

    _loadData: function (filters) {
      this._oModel.setProperty("/loading", true);

      /*
      Aquí puedes conectar tu API real:

      jQuery.ajax({
        url: "/api/dashboard/detalle-mecanicos",
        method: "GET",
        data: filters,
        success: function (response) {
          this._oModel.setData(response);
          this._refreshHtmlBlocks();
          MessageToast.show("Filtros aplicados correctamente.");
        }.bind(this),
        error: function () {
          MessageBox.error("No se pudo cargar el detalle de mecánicos.");
        }.bind(this),
        complete: function () {
          this._oModel.setProperty("/loading", false);
        }.bind(this)
      });
      */

      var data = this._getInitialData();
      data.filters = filters;

      this._oModel.setData(data);
      this._refreshHtmlBlocks();
      this._oModel.setProperty("/loading", false);

      MessageToast.show("Filtros aplicados correctamente.");
    },

    _refreshHtmlBlocks: function () {
      this._oModel.setProperty("/estadoHtml", this._buildEstadoHtml());
      this._oModel.setProperty("/servicioHtml", this._buildServicioHtml());
    },

    _buildEstadoHtml: function () {
      return '' +
        '<div class="dmDonutChart">' +
          '<div class="dmDonutCenter">' +
            '<strong>76</strong>' +
            '<span>Total</span>' +
          '</div>' +
        '</div>';
    },

    _buildServicioHtml: function () {
      return '' +
        '<div class="dmServiceChart">' +

          '<div class="dmServiceGroup">' +
            '<div class="dmBars">' +
              '<div class="dmBar dmBarBlueHtml" style="height:130px;"><span>3,200</span></div>' +
              '<div class="dmBar dmBarPurpleHtml" style="height:124px;"><span>3,050</span></div>' +
            '</div>' +
            '<div class="dmServiceLabel">Mantenimiento<br/>planeado</div>' +
          '</div>' +

          '<div class="dmServiceGroup">' +
            '<div class="dmBars">' +
              '<div class="dmBar dmBarBlueHtml" style="height:76px;"><span>1,700</span></div>' +
              '<div class="dmBar dmBarPurpleHtml" style="height:85px;"><span>1,910</span></div>' +
            '</div>' +
            '<div class="dmServiceLabel">Reparación /<br/>correctivo</div>' +
          '</div>' +

          '<div class="dmServiceGroup">' +
            '<div class="dmBars">' +
              '<div class="dmBar dmBarBlueHtml" style="height:50px;"><span>1,000</span></div>' +
              '<div class="dmBar dmBarPurpleHtml" style="height:44px;"><span>882</span></div>' +
            '</div>' +
            '<div class="dmServiceLabel">Call Center</div>' +
          '</div>' +

        '</div>';
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
            { key: "HIDRAULICA", text: "Hidráulica" }
          ],
          estados: [
            { key: "TODOS", text: "Todos" },
            { key: "DISPONIBLES", text: "Disponibles" },
            { key: "DENTRO_CAPACIDAD", text: "Dentro de capacidad" },
            { key: "CERCA_SATURACION", text: "Cerca de saturación" },
            { key: "SOBRE_CAPACIDAD", text: "Sobre capacidad" }
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

        turnos: [
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

        utilTurno: [
          {
            turno: "Diurno",
            capacidad: "4,032 h",
            carga: "3,420 h",
            utilizacion: "84.9%"
          },
          {
            turno: "Nocturno",
            capacidad: "1,344 h",
            carga: "1,278 h",
            utilizacion: "95.1%"
          },
          {
            turno: "Fin de semana",
            capacidad: "1,024 h",
            carga: "1,202 h",
            utilizacion: "117.4%"
          }
        ],

        utilTotal: {
          capacidad: "6,400 h",
          carga: "5,900 h",
          utilizacion: "92.1%"
        }
      };
    }

  });
});