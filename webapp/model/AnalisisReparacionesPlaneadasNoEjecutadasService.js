sap.ui.define([], function () {
    "use strict";

    var aPreferredEntitySets = [
        "ReparacionesPlaneadasSet",
        "ReparacionesSet",
        "OrdenesMantenimientoSet"
    ];

    var mMonthNames = {
        0: "ENERO",
        1: "FEBRERO",
        2: "MARZO",
        3: "ABRIL",
        4: "MAYO",
        5: "JUNIO",
        6: "JULIO",
        7: "AGOSTO",
        8: "SEPTIEMBRE",
        9: "OCTUBRE",
        10: "NOVIEMBRE",
        11: "DICIEMBRE"
    };

    function pick(oRecord, aNames, vDefault) {
        var i;
        var vValue;

        for (i = 0; i < aNames.length; i += 1) {
            vValue = oRecord[aNames[i]];

            if (vValue !== undefined && vValue !== null && vValue !== "") {
                return vValue;
            }
        }

        return vDefault;
    }

    function normalizeText(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();
    }

    function parseDate(vValue) {
        var aParts;
        var aMatch;
        var oDate;

        if (vValue instanceof Date) {
            return vValue;
        }

        if (!vValue) {
            return null;
        }

        aMatch = String(vValue).match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);

        if (aMatch) {
            return new Date(Number(aMatch[1]));
        }

        if (/^\d{2}\/\d{2}\/\d{4}$/.test(String(vValue))) {
            aParts = String(vValue).split("/");
            return new Date(
                Number(aParts[2]),
                Number(aParts[1]) - 1,
                Number(aParts[0])
            );
        }

        oDate = new Date(vValue);

        return isNaN(oDate.getTime()) ? null : oDate;
    }

    function formatDate(vValue) {
        var oDate = parseDate(vValue);

        if (!oDate) {
            return "—";
        }

        return [
            String(oDate.getDate()).padStart(2, "0"),
            String(oDate.getMonth() + 1).padStart(2, "0"),
            oDate.getFullYear()
        ].join("/");
    }

    function toNumber(vValue) {
        var nValue = Number(vValue);

        return isNaN(nValue) ? 0 : nValue;
    }

    function uniqueCount(aRecords, sProperty) {
        var mValues = {};

        aRecords.forEach(function (oRecord) {
            var sValue = String(oRecord[sProperty] || "").trim();

            if (sValue) {
                mValues[sValue] = true;
            }
        });

        return Object.keys(mValues).length;
    }

    function createCatalog(aRecords, sProperty, sAllKey, sAllText) {
        var mValues = {};
        var aCatalog = [{
            key: sAllKey,
            text: sAllText
        }];

        aRecords.forEach(function (oRecord) {
            var sValue = String(oRecord[sProperty] || "").trim();

            if (sValue) {
                mValues[sValue] = true;
            }
        });

        Object.keys(mValues).sort().forEach(function (sValue) {
            aCatalog.push({
                key: sValue,
                text: sValue
            });
        });

        return aCatalog;
    }

    function createPeriods() {
        var aPeriods = [];
        var oNow = new Date();
        var i;

        for (i = 0; i < 24; i += 1) {
            var oDate = new Date(
                oNow.getFullYear(),
                oNow.getMonth() - i,
                1
            );
            var sKey = mMonthNames[oDate.getMonth()] +
                "_" + oDate.getFullYear();

            aPeriods.push({
                key: sKey,
                text: mMonthNames[oDate.getMonth()] +
                    " " + oDate.getFullYear()
            });
        }

        return aPeriods;
    }

    function isExecuted(oRecord) {
        var sStatus = normalizeText(oRecord.estado);
        var sExecuted = normalizeText(oRecord.ejecutada);

        if (
            sExecuted === "X" ||
            sExecuted === "SI" ||
            sExecuted === "TRUE" ||
            sExecuted === "1"
        ) {
            return true;
        }

        return [
            "EJECUTADA",
            "EJECUTADO",
            "FINALIZADA",
            "FINALIZADO",
            "CERRADA",
            "CERRADO",
            "COMPLETADA",
            "COMPLETADO",
            "TECO"
        ].some(function (sValue) {
            return sStatus.indexOf(sValue) !== -1;
        });
    }

    function normalizeRecord(oRecord, iIndex) {
        var oNormalized = {
            ot: String(pick(oRecord, [
                "Ot",
                "OT",
                "Orden",
                "OrdenMantenimiento",
                "Aufnr",
                "AUFNR"
            ], "OT-" + (iIndex + 1))),

            equipo: String(pick(oRecord, [
                "Equipo",
                "EquipoId",
                "Equnr",
                "EQUNR"
            ], "Sin equipo")),

            cliente: String(pick(oRecord, [
                "Cliente",
                "ClienteNombre",
                "Kunnr",
                "KUNNR"
            ], "Sin cliente")),

            material: String(pick(oRecord, [
                "Material",
                "MaterialDescripcion",
                "Matnr",
                "MATNR"
            ], "Sin material")),

            causa: String(pick(oRecord, [
                "Causa",
                "CausaIncumplimiento",
                "Motivo",
                "MotivoDescripcion"
            ], "Sin causa registrada")),

            zona: String(pick(oRecord, [
                "Zona",
                "ZonaDescripcion",
                "Region"
            ], "Sin zona")),

            responsable: String(pick(oRecord, [
                "Responsable",
                "ResponsableNombre",
                "Supervisor",
                "Mecanico"
            ], "Sin responsable")),

            estado: String(pick(oRecord, [
                "Estado",
                "Status",
                "Estatus",
                "Txt04"
            ], "")),

            ejecutada: pick(oRecord, [
                "Ejecutada",
                "EsEjecutada",
                "Finalizada"
            ], ""),

            fechaProgramadaRaw: pick(oRecord, [
                "FechaProgramada",
                "FechaPlanificada",
                "FechaInicio",
                "Gstrp"
            ], null),

            diasDetenida: toNumber(pick(oRecord, [
                "DiasDetenida",
                "DiasDetencion",
                "DiasParada"
            ], 0))
        };

        oNormalized.fechaProgramada =
            formatDate(oNormalized.fechaProgramadaRaw);
        oNormalized.esEjecutada = isExecuted(oNormalized);

        return oNormalized;
    }

    function filterRecords(aRecords, mFilters) {
        var oFrom = parseDate(mFilters.fechaDesde);
        var oTo = parseDate(mFilters.fechaHasta);

        if (oTo) {
            oTo.setHours(23, 59, 59, 999);
        }

        return aRecords.filter(function (oRecord) {
            var oDate = parseDate(oRecord.fechaProgramadaRaw);

            if (oFrom && oDate && oDate < oFrom) {
                return false;
            }

            if (oTo && oDate && oDate > oTo) {
                return false;
            }

            if (
                mFilters.zona &&
                mFilters.zona !== "TODAS" &&
                oRecord.zona !== mFilters.zona
            ) {
                return false;
            }

            if (
                mFilters.cliente &&
                mFilters.cliente !== "TODOS" &&
                oRecord.cliente !== mFilters.cliente
            ) {
                return false;
            }

            if (
                mFilters.responsable &&
                mFilters.responsable !== "TODOS" &&
                oRecord.responsable !== mFilters.responsable
            ) {
                return false;
            }

            return true;
        });
    }

    function groupCauses(aRecords) {
        var mGroups = {};

        aRecords.forEach(function (oRecord) {
            var sKey = oRecord.causa || "Sin causa registrada";

            if (!mGroups[sKey]) {
                mGroups[sKey] = {
                    causa: sKey,
                    records: []
                };
            }

            mGroups[sKey].records.push(oRecord);
        });

        return Object.keys(mGroups).map(function (sKey) {
            var oGroup = mGroups[sKey];
            var aGroupRecords = oGroup.records;
            var iTotalDays = aGroupRecords.reduce(function (iTotal, oRecord) {
                return iTotal + oRecord.diasDetenida;
            }, 0);

            return {
                causa: oGroup.causa,
                material: aGroupRecords[0].material,
                otNoEjecutadas: aGroupRecords.length,
                equipos: uniqueCount(aGroupRecords, "equipo"),
                clientes: uniqueCount(aGroupRecords, "cliente"),
                dias: aGroupRecords.length
                    ? (iTotalDays / aGroupRecords.length).toFixed(1) + " días"
                    : "0 días",
                diasValor: aGroupRecords.length
                    ? iTotalDays / aGroupRecords.length
                    : 0,
                icon: "sap-icon://wrench",
                expanded: false,
                details: aGroupRecords
            };
        }).sort(function (oA, oB) {
            return oB.otNoEjecutadas - oA.otNoEjecutadas;
        });
    }

    function getEntitySets(oMetadata) {
        var aEntitySets = [];
        var aSchemas = oMetadata &&
            oMetadata.dataServices &&
            oMetadata.dataServices.schema || [];

        aSchemas.forEach(function (oSchema) {
            (oSchema.entityContainer || []).forEach(function (oContainer) {
                (oContainer.entitySet || []).forEach(function (oEntitySet) {
                    if (oEntitySet.name) {
                        aEntitySets.push(oEntitySet.name);
                    }
                });
            });
        });

        return aEntitySets;
    }

    function findEntitySet(oModel) {
        var aEntitySets = getEntitySets(oModel.getServiceMetadata());
        var sEntitySet;
        var i;

        for (i = 0; i < aPreferredEntitySets.length; i += 1) {
            if (aEntitySets.indexOf(aPreferredEntitySets[i]) !== -1) {
                return aPreferredEntitySets[i];
            }
        }

        sEntitySet = aEntitySets.find(function (sName) {
            return /repar.*plane|plane.*repar/i.test(sName);
        });

        if (!sEntitySet) {
            sEntitySet = aEntitySets.find(function (sName) {
                return /reparacion/i.test(sName);
            });
        }

        if (!sEntitySet) {
            throw new Error(
                "No se encontró un EntitySet de reparaciones planeadas. " +
                "EntitySets disponibles: " + aEntitySets.join(", ")
            );
        }

        return sEntitySet;
    }

    function readOData(oModel, sEntitySet) {
        return new Promise(function (resolve, reject) {
            oModel.read("/" + sEntitySet, {
                urlParameters: {
                    "$top": "5000"
                },
                success: function (oData) {
                    resolve(oData && oData.results || []);
                },
                error: function (oError) {
                    var sMessage = "No fue posible consultar /" + sEntitySet;

                    if (oError && oError.responseText) {
                        try {
                            var oResponse = JSON.parse(oError.responseText);
                            sMessage =
                                oResponse.error.message.value || sMessage;
                        } catch (oParseError) {
                            // Se conserva el mensaje general.
                        }
                    }

                    reject(new Error(sMessage));
                }
            });
        });
    }

    function createEmpty(mFilters, sAnalysis) {
        return {
            filters: Object.assign({}, mFilters),

            ui: {
                selectedAnalysis: sAnalysis || "NO_EJECUTADAS",
                analysisLabel: "No ejecutadas",
                analysisInfo: "Mostrando reparaciones planeadas no ejecutadas"
            },

            catalogos: {
                periodos: createPeriods(),
                zonas: [{
                    key: "TODAS",
                    text: "Todas"
                }],
                clientes: [{
                    key: "TODOS",
                    text: "Todos"
                }],
                responsables: [{
                    key: "TODOS",
                    text: "Todos"
                }]
            },

            kpis: {
                planeadas: 0,
                ejecutadas: 0,
                noEjecutadas: 0,
                cumplimiento: "0%"
            },

            analysisTabs: {
                noEjecutadas: "No ejecutadas (0)",
                ejecutadas: "Ejecutadas (0)",
                todas: "Todas (0)"
            },

            causas: [],

            totals: {
                otNoEjecutadas: 0,
                porcentaje: "0%",
                equipos: 0,
                clientes: 0,
                dias: "0 días"
            },

            tableSubtitle: "Sin información disponible",
            footerText: "Los datos se obtienen del servicio SAP."
        };
    }

    function build(aRawData, mFilters, sAnalysis) {
        var aNormalized = (aRawData || []).map(normalizeRecord);
        var aFiltered = filterRecords(aNormalized, mFilters || {});
        var aExecuted = aFiltered.filter(function (oRecord) {
            return oRecord.esEjecutada;
        });
        var aNotExecuted = aFiltered.filter(function (oRecord) {
            return !oRecord.esEjecutada;
        });
        var aSelected;
        var aCauses;
        var iTotalDays;
        var iPercentage;
        var oData = createEmpty(mFilters, sAnalysis);

        if (sAnalysis === "EJECUTADAS") {
            aSelected = aExecuted;
            oData.ui.analysisLabel = "Ejecutadas";
            oData.ui.analysisInfo =
                "Mostrando reparaciones planeadas ejecutadas";
        } else if (sAnalysis === "TODAS") {
            aSelected = aFiltered;
            oData.ui.analysisLabel = "Todas";
            oData.ui.analysisInfo =
                "Mostrando todas las reparaciones planeadas";
        } else {
            aSelected = aNotExecuted;
            oData.ui.selectedAnalysis = "NO_EJECUTADAS";
        }

        aCauses = groupCauses(aSelected);

        aCauses.forEach(function (oCause) {
            oCause.porcentajeValor = aSelected.length
                ? (oCause.otNoEjecutadas / aSelected.length) * 100
                : 0;
            oCause.porcentaje = oCause.porcentajeValor.toFixed(1) + "%";
        });

        iTotalDays = aSelected.reduce(function (iTotal, oRecord) {
            return iTotal + oRecord.diasDetenida;
        }, 0);

        iPercentage = aFiltered.length
            ? (aExecuted.length / aFiltered.length) * 100
            : 0;

        oData.catalogos.zonas =
            createCatalog(aNormalized, "zona", "TODAS", "Todas");
        oData.catalogos.clientes =
            createCatalog(aNormalized, "cliente", "TODOS", "Todos");
        oData.catalogos.responsables =
            createCatalog(aNormalized, "responsable", "TODOS", "Todos");

        oData.kpis = {
            planeadas: aFiltered.length,
            ejecutadas: aExecuted.length,
            noEjecutadas: aNotExecuted.length,
            cumplimiento: iPercentage.toFixed(1) + "%"
        };

        oData.analysisTabs = {
            noEjecutadas: "No ejecutadas (" + aNotExecuted.length + ")",
            ejecutadas: "Ejecutadas (" + aExecuted.length + ")",
            todas: "Todas (" + aFiltered.length + ")"
        };

        oData.causas = aCauses;

        oData.totals = {
            otNoEjecutadas: aSelected.length,
            porcentaje: aSelected.length ? "100%" : "0%",
            equipos: uniqueCount(aSelected, "equipo"),
            clientes: uniqueCount(aSelected, "cliente"),
            dias: aSelected.length
                ? (iTotalDays / aSelected.length).toFixed(1) + " días"
                : "0 días"
        };

        oData.tableSubtitle =
            aSelected.length + " órdenes encontradas";

        return oData;
    }

    function load(oODataModel, mFilters, sAnalysis) {
        if (!oODataModel) {
            return Promise.reject(
                new Error("No se encontró el modelo OData dashboardOData")
            );
        }

        return oODataModel.metadataLoaded().then(function () {
            var sEntitySet = findEntitySet(oODataModel);

            return readOData(oODataModel, sEntitySet);
        }).then(function (aRawData) {
            return {
                rawData: aRawData,
                data: build(aRawData, mFilters, sAnalysis)
            };
        });
    }

    return {
        createEmpty: createEmpty,
        build: build,
        load: load
    };
});