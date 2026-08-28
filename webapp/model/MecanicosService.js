sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Filter, FilterOperator) {
    "use strict";

    var PAGE_SIZE = 1000;
    var MAX_PAGES = 50;
    var DETAIL_CONCURRENCY = 2;
    var ORDER_CHUNK_SIZE = 12;

    function parseInputDate(sValue) {
        var aMatch, oDate;
        if (!sValue) { return null; }

        aMatch = String(sValue).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (aMatch) {
            return new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        }

        oDate = new Date(sValue);
        return Number.isNaN(oDate.getTime()) ? null : oDate;
    }

    function buildOrdersFilters(mFilters) {
        var aFilters = [];
        var oStartDate;
        var oEndDate;

        mFilters = mFilters || {};
        oStartDate = parseInputDate(mFilters.fechaDesde);
        oEndDate = parseInputDate(mFilters.fechaHasta);

        /* Contrato QAS vigente: ambos extremos se envían como EQ. */
        if (oStartDate) {
            aFilters.push(
                new Filter(
                    "PlannedStartDate",
                    FilterOperator.EQ,
                    oStartDate
                )
            );
        }

        if (oEndDate) {
            aFilters.push(
                new Filter(
                    "PlannedFinishDate",
                    FilterOperator.EQ,
                    oEndDate
                )
            );
        }

        return aFilters;
    }

    function getSignature(aResults) {
        var oFirst, oLast;

        if (!aResults || !aResults.length) {
            return "";
        }

        oFirst = aResults[0] || {};
        oLast = aResults[aResults.length - 1] || {};

        return JSON.stringify([
            oFirst.ResourceDateId ||
                oFirst.FilterCatalogId ||
                oFirst.OrderId ||
                oFirst.OrderResourceId ||
                oFirst.OperationKey || "",
            oLast.ResourceDateId ||
                oLast.FilterCatalogId ||
                oLast.OrderId ||
                oLast.OrderResourceId ||
                oLast.OperationKey || ""
        ]);
    }

    function readAll(oModel, sPath, aFilters, bOptional) {
        return new Promise(function (resolve, reject) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                var iSkip = iPage * PAGE_SIZE;

                oModel.read(sPath, {
                    filters: aFilters || [],
                    urlParameters: {
                        "$format": "json",
                        "$top": String(PAGE_SIZE),
                        "$skip": String(iSkip)
                    },

                    success: function (oData) {
                        var aResults = Array.isArray(oData && oData.results)
                            ? oData.results
                            : [];
                        var sSignature = getSignature(aResults);

                        if (
                            iPage > 0 &&
                            sSignature &&
                            sSignature === sPreviousSignature
                        ) {
                            console.warn(
                                "[MEC SERVICE] " + sPath +
                                " parece ignorar $skip. Se detiene la paginación."
                            );
                            resolve(aAll);
                            return;
                        }

                        sPreviousSignature = sSignature;
                        aAll = aAll.concat(aResults);

                        if (
                            aResults.length < PAGE_SIZE ||
                            iPage + 1 >= MAX_PAGES
                        ) {
                            console.log(
                                "[MEC SERVICE] " + sPath +
                                " -> " + aAll.length + " registros"
                            );
                            resolve(aAll);
                            return;
                        }

                        iPage += 1;
                        readPage();
                    },

                    error: function (oError) {
                        console.error(
                            "[MEC SERVICE] Error en " + sPath,
                            oError
                        );

                        /*
                         * La pantalla queda lista aunque QAS esté temporalmente
                         * caído. Cuando el EntitySet responda, se llenará sin
                         * cambiar este código.
                         */
                        if (bOptional) {
                            resolve([]);
                            return;
                        }

                        reject(
                            new Error(
                                "No fue posible consultar " + sPath
                            )
                        );
                    }
                });
            }

            readPage();
        });
    }

    function uniqueStrings(aValues) {
        var mSeen = Object.create(null);

        return (aValues || []).filter(function (vValue) {
            var sValue = String(vValue || "");

            if (!sValue || mSeen[sValue]) {
                return false;
            }

            mSeen[sValue] = true;
            return true;
        });
    }

    function splitChunks(aValues, iSize) {
        var aChunks = [];
        var i;

        for (i = 0; i < aValues.length; i += iSize) {
            aChunks.push(aValues.slice(i, i + iSize));
        }

        return aChunks;
    }

    function runConcurrent(aValues, iLimit, fnWorker) {
        var aQueue = (aValues || []).slice();
        var aResult = [];
        var iActive = 0;

        return new Promise(function (resolve) {
            function next() {
                var vValue;

                if (!aQueue.length && iActive === 0) {
                    resolve(aResult);
                    return;
                }

                while (iActive < iLimit && aQueue.length) {
                    vValue = aQueue.shift();
                    iActive += 1;

                    Promise.resolve(fnWorker(vValue))
                        .then(function (aRows) {
                            if (Array.isArray(aRows) && aRows.length) {
                                aResult = aResult.concat(aRows);
                            }
                        })
                        .catch(function (oError) {
                            console.error(
                                "[MEC SERVICE] Error cargando detalle:",
                                oError
                            );
                        })
                        .then(function () {
                            iActive -= 1;
                            next();
                        });
                }
            }

            next();
        });
    }

    function readSingleOrderIds(oModel, sPath, aOrderIds) {
        return runConcurrent(
            uniqueStrings(aOrderIds),
            DETAIL_CONCURRENCY,
            function (sOrderId) {
                return readAll(
                    oModel,
                    sPath,
                    [
                        new Filter(
                            "OrderId",
                            FilterOperator.EQ,
                            sOrderId
                        )
                    ],
                    true
                );
            }
        );
    }

    function readByOrderIds(oModel, sPath, aOrderIds) {
        var aIds = uniqueStrings(aOrderIds);

        if (!aIds.length) {
            return Promise.resolve([]);
        }

        /*
         * Contrato recomendado por backend:
         * cargar el detalle por OrderId con concurrencia controlada.
         * Evitamos filtros OR grandes porque QAS puede responder 502
         * o no interpretarlos de forma consistente.
         */
        return readSingleOrderIds(
            oModel,
            sPath,
            aIds
        );
    }

    function getBaseData(oModel, mFilters) {
        if (!oModel || typeof oModel.read !== "function") {
            return Promise.reject(
                new Error(
                    "No se encontró el modelo OData 'dashboardOData'."
                )
            );
        }

        console.log("[MEC SERVICE] Cargando datos base...", mFilters);

        return Promise.all([
            readAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                true
            ),
            readAll(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            ),
            readAll(
                oModel,
                "/DashboardOrdersSet",
                buildOrdersFilters(mFilters || {}),
                true
            )
        ]).then(function (aData) {
            return {
                resources: aData[0] || [],
                catalogs: aData[1] || [],
                orders: aData[2] || [],
                orderResources: [],
                operations: []
            };
        });
    }

    function getOperationalData(oModel, aOrderIds) {
        var aIds = uniqueStrings(aOrderIds);

        if (!aIds.length) {
            return Promise.resolve({
                orderResources: [],
                operations: []
            });
        }

        console.log(
            "[MEC SERVICE] Cargando detalle de " +
            aIds.length + " órdenes..."
        );

        return Promise.all([
            readByOrderIds(
                oModel,
                "/DashboardOrderResourcesSet",
                aIds
            ),
            readByOrderIds(
                oModel,
                "/DashboardOrderOperationsSet",
                aIds
            )
        ]).then(function (aData) {
            return {
                orderResources: aData[0] || [],
                operations: aData[1] || []
            };
        });
    }

    return {
        getBaseData: getBaseData,
        getOperationalData: getOperationalData,
        buildOrdersFilters: buildOrdersFilters
    };
});
