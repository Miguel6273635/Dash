sap.ui.define([
    "mantenimiento/model/DashboardCacheApiService"
], function (DashboardCacheApiService) {
    "use strict";

    // QAS requiere que las entidades de detalle se consulten desde las OT del
    // período. Esta utilidad evita las lecturas globales que responden vacías.
    // Los servicios QAS de detalle aceptan filtros por OrderId, pero consultas
    // con demasiados "or" pueden quedar suspendidas por el proxy de BAS.
    // Quince OT mantiene la URL corta y permite recuperar los materiales de
    // manera estable para una precarga mensual.
    var ORDER_ID_BATCH_SIZE = 15;
    // BAS puede suspender el proxy cuando se envían demasiadas consultas al
    // mismo tiempo. Se mantienen lotes cortos, pero se controla concurrencia.
    var MAX_PARALLEL_ENTITY_REQUESTS = 3;
    var MAX_PARALLEL_BATCH_REQUESTS = 1;

    var API_ENTITY_TARGETS = {
        DashboardOrderCausesSet: "causes",
        DashboardOrderMaterialsSet: "materials",
        DashboardOrderResourcesSet: "assignments",
        DashboardOrderOperationsSet: "operations",
        DashboardOrderConfirmationsSet: "confirmations",
        DashboardOrderEventsSet: "events",
        DashboardOrderRequirementsSet: "requirements",
        DashboardBlockOrdersSet: "blockOrders",
        DashboardMaterialMovementsSet: "movements",
        DashboardResourceDailySet: "resources",
        DashboardFilterCatalogSet: "catalogs",
        DashboardServiceRequestsSet: "serviceRequests",
        DashboardEquipmentBlocksSet: "blocks",
        DashboardBlockEventsSet: "blockEvents"
    };

    function unique(values) {
        return (values || []).reduce(function (result, value) {
            if (value && result.indexOf(value) < 0) {
                result.push(value);
            }
            return result;
        }, []);
    }

    function targetForEntitySet(entitySet) {
        return API_ENTITY_TARGETS[String(entitySet || "")] || null;
    }

    function datesFromFilter(filter) {
        var match;
        var expression = /datetime'(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}'/g;
        var dates = [];

        while ((match = expression.exec(String(filter || "")))) {
            dates.push(match[1]);
        }
        return dates;
    }

    function rangeFromConfig(config) {
        var filters = [config.ordersFilter || ""];

        (config.independent || []).forEach(function (item) {
            filters.push(item && item.filter || "");
        });

        var dates = filters.reduce(function (result, filter) {
            return result.concat(datesFromFilter(filter));
        }, []);

        return {
            fechaDesde: dates[0] || null,
            fechaHasta: dates[1] || dates[0] || null
        };
    }

    function includeFromConfig(config) {
        var include = ["orders"];

        (config.orderRelations || []).forEach(function (relation) {
            include.push(targetForEntitySet(relation && relation.entitySet));
        });
        (config.independent || []).forEach(function (independent) {
            include.push(targetForEntitySet(independent && independent.entitySet));
        });
        if (config.materialMovements) {
            include.push(targetForEntitySet(config.materialMovements.entitySet ||
                "DashboardMaterialMovementsSet"));
        }
        return unique(include);
    }

    function rawFromSnapshot(snapshot, config) {
        var raw = {
            orders: snapshot.orders || [],
            meta: Object.assign({}, snapshot.meta || {}, {
                source: "API_DASH",
                unavailableEntitySets: [],
                ordersFilter: config.ordersFilter || ""
            })
        };

        (config.orderRelations || []).forEach(function (relation) {
            raw[relation.target] = snapshot[targetForEntitySet(relation.entitySet)] || [];
        });
        (config.independent || []).forEach(function (independent) {
            raw[independent.target] = snapshot[targetForEntitySet(independent.entitySet)] || [];
        });
        if (config.materialMovements) {
            raw[config.materialMovements.target || "movements"] =
                snapshot[targetForEntitySet(config.materialMovements.entitySet ||
                    "DashboardMaterialMovementsSet")] || [];
        }
        return raw;
    }

    function loadFromApi(config) {
        var range = rangeFromConfig(config);

        if (!range.fechaDesde || !range.fechaHasta) {
            return Promise.reject(new Error(
                "La pantalla requiere fechas para consultar la generación publicada de API_DASH"
            ));
        }
        return DashboardCacheApiService.loadSnapshot(range, includeFromConfig(config))
            .then(function (snapshot) {
                return rawFromSnapshot(snapshot, config);
            });
    }

    function read(oModel, sEntitySet, sFilter) {
        var mParameters = { "$format": "json" };

        if (sFilter) {
            mParameters.$filter = sFilter;
        }
        return new Promise(function (resolve, reject) {
            oModel.read("/" + sEntitySet, {
                urlParameters: mParameters,
                success: function (oData) {
                    resolve(Array.isArray(oData && oData.results) ? oData.results : []);
                },
                error: function (oError) {
                    reject(new Error(
                        "No fue posible consultar " + sEntitySet +
                        (oError && oError.message ? ": " + oError.message : "")
                    ));
                }
            });
        });
    }

    function optional(oModel, sEntitySet, sFilter) {
        return read(oModel, sEntitySet, sFilter).then(function (aRecords) {
            return { entitySet: sEntitySet, records: aRecords, error: null };
        }).catch(function (oError) {
            return { entitySet: sEntitySet, records: [], error: oError.message };
        });
    }

    function escapeODataString(vValue) {
        return String(vValue).replace(/'/g, "''");
    }

    function batches(aValues) {
        var oSeen = {};
        var aDistinct = (aValues || []).filter(function (vValue) {
            var sValue = String(vValue || "").trim();

            if (!sValue || oSeen[sValue]) {
                return false;
            }
            oSeen[sValue] = true;
            return true;
        }).map(function (vValue) {
            return String(vValue);
        });
        var aBatches = [];
        var iIndex;

        for (iIndex = 0; iIndex < aDistinct.length; iIndex += ORDER_ID_BATCH_SIZE) {
            aBatches.push(aDistinct.slice(iIndex, iIndex + ORDER_ID_BATCH_SIZE));
        }
        return aBatches;
    }

    function runLimited(aTasks, iLimit) {
        var aResults = new Array(aTasks.length);
        var iNext = 0;
        var iWorkers = Math.min(Math.max(iLimit || 1, 1), aTasks.length);

        function runWorker() {
            var iCurrent = iNext;

            if (iCurrent >= aTasks.length) {
                return Promise.resolve();
            }

            iNext += 1;
            return aTasks[iCurrent]().then(function (oResult) {
                aResults[iCurrent] = oResult;
                return runWorker();
            });
        }

        return Promise.all(Array.from({ length: iWorkers }, runWorker)).then(function () {
            return aResults;
        });
    }

    function valuesFilter(sProperty, aValues) {
        return aValues.map(function (sValue) {
            return sProperty + " eq '" + escapeODataString(sValue) + "'";
        }).join(" or ");
    }

    function byValues(oModel, sEntitySet, sProperty, aValues) {
        var aBatches = batches(aValues);

        if (!aBatches.length) {
            return Promise.resolve({ entitySet: sEntitySet, records: [], error: null });
        }
        return runLimited(aBatches.map(function (aBatch) {
            return function () {
                return optional(oModel, sEntitySet, valuesFilter(sProperty, aBatch));
            };
        }), MAX_PARALLEL_BATCH_REQUESTS).then(function (aResults) {
            var aRecords = [];
            var aErrors = [];

            aResults.forEach(function (oResult) {
                aRecords = aRecords.concat(oResult.records);
                if (oResult.error) {
                    aErrors.push(oResult.error);
                }
            });
            return {
                entitySet: sEntitySet,
                records: aRecords,
                error: aErrors.length ? aErrors.join(" | ") : null
            };
        });
    }

    function formatDate(oDate) {
        return oDate.getFullYear() + "-" +
            String(oDate.getMonth() + 1).padStart(2, "0") + "-" +
            String(oDate.getDate()).padStart(2, "0") + "T00:00:00";
    }

    function rangeFilter(sProperty, oRange) {
        var aClauses = [];
        var oStart = oRange && (oRange.startDate || oRange.start);
        var oEnd = oRange && (oRange.endDate || oRange.end);

        if (oStart) {
            aClauses.push(sProperty + " ge datetime'" + formatDate(oStart) + "'");
        }
        if (oEnd) {
            aClauses.push(sProperty + " le datetime'" + formatDate(oEnd) + "'");
        }
        return aClauses.join(" and ");
    }

    function pushWarning(aWarnings, oResult) {
        if (oResult.error) {
            aWarnings.push({ entitySet: oResult.entitySet, message: oResult.error });
        }
    }

    /*
     * Secuencia oficial:
     * 1. DashboardOrdersSet con el rango seleccionado.
     * 2. Detalles por OrderId (materiales, causas, recursos, etc.).
     * 3. Movimientos por MaterialRequirementId.
     */
    function loadForOrders(oModel, aOrders, mOptions) {
        var mConfig = mOptions || {};
        var aRelations = mConfig.orderRelations || [];
        var aIndependent = mConfig.independent || [];

        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(new Error("El modelo OData 'dashboardOData' no está configurado"));
        }
        aOrders = Array.isArray(aOrders) ? aOrders : [];
        var aOrderIds = aOrders.map(function (oOrder) { return oOrder.OrderId; });
        var aReadTasks = aRelations.map(function (oRelation) {
            return function () {
                return byValues(oModel, oRelation.entitySet, oRelation.property || "OrderId", aOrderIds);
            };
        }).concat(aIndependent.map(function (oIndependent) {
            return function () {
                return optional(oModel, oIndependent.entitySet, oIndependent.filter || "");
            };
        }));

        return runLimited(aReadTasks, MAX_PARALLEL_ENTITY_REQUESTS).then(function (aResults) {
            var mRaw = { orders: aOrders, meta: { unavailableEntitySets: [] } };
            var iIndex = 0;

            aRelations.forEach(function (oRelation) {
                var oResult = aResults[iIndex++];
                mRaw[oRelation.target] = oResult.records;
                pushWarning(mRaw.meta.unavailableEntitySets, oResult);
            });
            aIndependent.forEach(function (oIndependent) {
                var oResult = aResults[iIndex++];
                mRaw[oIndependent.target] = oResult.records;
                pushWarning(mRaw.meta.unavailableEntitySets, oResult);
            });

            if (!mConfig.materialMovements) {
                return mRaw;
            }

            return byValues(
                oModel,
                mConfig.materialMovements.entitySet || "DashboardMaterialMovementsSet",
                mConfig.materialMovements.property || "MaterialRequirementId",
                (mRaw[mConfig.materialMovements.from || "materials"] || []).map(function (oMaterial) {
                    return oMaterial.MaterialRequirementId;
                })
            ).then(function (oMovements) {
                mRaw[mConfig.materialMovements.target || "movements"] = oMovements.records;
                pushWarning(mRaw.meta.unavailableEntitySets, oMovements);
                return mRaw;
            });
        });
    }

    function load(oModel, mOptions) {
        var mConfig = mOptions || {};

        // Todas las pantallas que comparten esta secuencia reciben los datos
        // desde API_DASH. No existe fallback a OData desde el navegador.
        return loadFromApi(mConfig);
    }

    return {
        load: load,
        loadForOrders: loadForOrders,
        rangeFilter: rangeFilter,
        read: read,
        byValues: byValues,
        loadFromApi: loadFromApi,
        includeFromConfig: includeFromConfig
    };
});
