sap.ui.define([

    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "mantenimiento/model/DashboardCacheODataModel"
], function (
    Filter,
    FilterOperator,
    DashboardCacheODataModel
) {
    "use strict";

    var PAGE_SIZE = 1000;
    var MAX_PAGES = 50;
    var DETAIL_CONCURRENCY = 3;
    var CONFIRMATION_CONCURRENCY = 2;

    function parseInputDate(sValue) {
        var aMatch;
        var oDate;

        if (!sValue) {
            return null;
        }

        aMatch = String(sValue).match(
            /^(\d{2})\/(\d{2})\/(\d{4})$/
        );

        if (aMatch) {
            return new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        }

        oDate = new Date(sValue);

        return Number.isNaN(oDate.getTime())
            ? null
            : oDate;
    }

    function buildOrdersFilters(mFilters) {
        var aFilters = [];
        var oFrom;
        var oTo;

        mFilters = mFilters || {};

        oFrom = parseInputDate(
            mFilters.fechaDesde
        );

        oTo = parseInputDate(
            mFilters.fechaHasta
        );

        /*
         * Contrato QAS actual de DashboardOrdersSet.
         * Se mantienen ambos extremos con EQ.
         */
        if (oFrom) {
            aFilters.push(
                new Filter(
                    "PlannedStartDate",
                    FilterOperator.EQ,
                    oFrom
                )
            );
        }

        if (oTo) {
            aFilters.push(
                new Filter(
                    "PlannedFinishDate",
                    FilterOperator.EQ,
                    oTo
                )
            );
        }

        return aFilters;
    }

    function getSignature(aRows) {
        var oFirst;
        var oLast;

        if (!aRows || !aRows.length) {
            return "";
        }

        oFirst = aRows[0] || {};
        oLast = aRows[aRows.length - 1] || {};

        return JSON.stringify([
            oFirst.OrderId ||
                oFirst.ResourceDateId ||
                oFirst.FilterCatalogId ||
                oFirst.OrderResourceId ||
                oFirst.OperationKey ||
                oFirst.ConfirmationId ||
                oFirst.OrderCauseId ||
                "",
            oLast.OrderId ||
                oLast.ResourceDateId ||
                oLast.FilterCatalogId ||
                oLast.OrderResourceId ||
                oLast.OperationKey ||
                oLast.ConfirmationId ||
                oLast.OrderCauseId ||
                ""
        ]);
    }

    function readAll(
        oModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(function (
            resolve,
            reject
        ) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                var iSkip =
                    iPage * PAGE_SIZE;

                oModel.read(
                    sPath,
                    {
                        filters:
                            aFilters || [],

                        urlParameters: {
                            "$format":
                                "json",
                            "$top":
                                String(
                                    PAGE_SIZE
                                ),
                            "$skip":
                                String(
                                    iSkip
                                )
                        },

                        success:
                            function (
                                oData
                            ) {
                                var aRows =
                                    Array.isArray(
                                        oData &&
                                        oData.results
                                    )
                                        ? oData.results
                                        : [];

                                var sSignature =
                                    getSignature(
                                        aRows
                                    );

                                if (
                                    iPage > 0 &&
                                    sSignature &&
                                    sSignature ===
                                        sPreviousSignature
                                ) {
                                    console.warn(
                                        "[DOZ SERVICE] " +
                                        sPath +
                                        " parece ignorar $skip. Se detiene la paginación."
                                    );

                                    resolve(
                                        aAll
                                    );

                                    return;
                                }

                                sPreviousSignature =
                                    sSignature;

                                aAll =
                                    aAll.concat(
                                        aRows
                                    );

                                if (
                                    aRows.length <
                                        PAGE_SIZE ||
                                    iPage + 1 >=
                                        MAX_PAGES
                                ) {
                                    console.log(
                                        "[DOZ SERVICE] " +
                                        sPath +
                                        " -> " +
                                        aAll.length +
                                        " registros"
                                    );

                                    resolve(
                                        aAll
                                    );

                                    return;
                                }

                                iPage += 1;
                                readPage();
                            },

                        error:
                            function (
                                oError
                            ) {
                                console.error(
                                    "[DOZ SERVICE] Error en " +
                                    sPath,
                                    oError
                                );

                                /*
                                 * QAS puede estar temporalmente inestable.
                                 * Los objetos opcionales se devuelven vacíos
                                 * para que la pantalla permanezca disponible.
                                 */
                                if (bOptional) {
                                    resolve(
                                        []
                                    );

                                    return;
                                }

                                reject(
                                    new Error(
                                        "No fue posible consultar " +
                                        sPath
                                    )
                                );
                            }
                    }
                );
            }

            readPage();
        });
    }

    function uniqueStrings(
        aValues
    ) {
        var mSeen =
            Object.create(null);

        return (
            aValues || []
        ).filter(function (
            vValue
        ) {
            var sValue =
                String(
                    vValue || ""
                );

            if (
                !sValue ||
                mSeen[sValue]
            ) {
                return false;
            }

            mSeen[sValue] =
                true;

            return true;
        });
    }

    function runConcurrent(
        aValues,
        iLimit,
        fnWorker
    ) {
        var aQueue =
            (
                aValues || []
            ).slice();

        var aResult = [];
        var iActive = 0;

        return new Promise(function (
            resolve
        ) {
            function next() {
                var vValue;

                if (
                    !aQueue.length &&
                    iActive === 0
                ) {
                    resolve(
                        aResult
                    );

                    return;
                }

                while (
                    iActive < iLimit &&
                    aQueue.length
                ) {
                    vValue =
                        aQueue.shift();

                    iActive += 1;

                    Promise.resolve(
                        fnWorker(
                            vValue
                        )
                    )
                        .then(
                            function (
                                aRows
                            ) {
                                if (
                                    Array.isArray(
                                        aRows
                                    ) &&
                                    aRows.length
                                ) {
                                    aResult =
                                        aResult.concat(
                                            aRows
                                        );
                                }
                            }
                        )
                        .catch(
                            function (
                                oError
                            ) {
                                console.error(
                                    "[DOZ SERVICE] Error de detalle:",
                                    oError
                                );
                            }
                        )
                        .then(
                            function () {
                                iActive -= 1;
                                next();
                            }
                        );
                }
            }

            next();
        });
    }

    function readByOrderIds(
        oModel,
        sPath,
        aOrderIds,
        iConcurrency
    ) {
        return runConcurrent(
            uniqueStrings(
                aOrderIds
            ),

            iConcurrency,

            function (
                sOrderId
            ) {
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

    /*
     * FASE 1:
     * filtros + población de OT + recursos.
     */
    function getBaseData(
        oModel,
        mFilters
    ) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            mFilters,
            ["orders","resources","catalogs","assignments","operations","causes","confirmations"]
        );

        if (
            !oModel ||
            typeof oModel.read !==
                "function"
        ) {
            return Promise.reject(
                new Error(
                    "No se encontró el modelo OData 'dashboardOData'."
                )
            );
        }

        return Promise.all([
            readAll(
                oModel,
                "/DashboardOrdersSet",
                buildOrdersFilters(
                    mFilters || {}
                ),
                true
            ),

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
            )
        ]).then(
            function (
                aResponse
            ) {
                return {
                    orders:
                        aResponse[0] ||
                        [],

                    resources:
                        aResponse[1] ||
                        [],

                    catalogs:
                        aResponse[2] ||
                        [],

                    orderResources:
                        [],

                    operations:
                        [],

                    causes:
                        [],

                    confirmations:
                        []
                };
            }
        );
    }

    /*
     * FASE 2:
     * se consulta únicamente el detalle de las OT del periodo.
     */
    function getOperationalData(
        oModel,
        aOrderIds
    ) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            {},
            ["orders","resources","catalogs","assignments","operations","causes","confirmations"]
        );

        var aIds =
            uniqueStrings(
                aOrderIds
            );

        if (!aIds.length) {
            return Promise.resolve({
                orderResources:
                    [],
                operations:
                    [],
                causes:
                    []
            });
        }

        return Promise.all([
            readByOrderIds(
                oModel,
                "/DashboardOrderResourcesSet",
                aIds,
                DETAIL_CONCURRENCY
            ),

            readByOrderIds(
                oModel,
                "/DashboardOrderOperationsSet",
                aIds,
                DETAIL_CONCURRENCY
            ),

            readByOrderIds(
                oModel,
                "/DashboardOrderCausesSet",
                aIds,
                DETAIL_CONCURRENCY
            )
        ]).then(
            function (
                aResponse
            ) {
                return {
                    orderResources:
                        aResponse[0] ||
                        [],

                    operations:
                        aResponse[1] ||
                        [],

                    causes:
                        aResponse[2] ||
                        []
                };
            }
        );
    }

    /*
     * FASE 3:
     * Confirmations puede ser lento, por eso se carga aparte.
     */
    function getConfirmationData(
        oModel,
        aOrderIds
    ) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            {},
            ["orders","resources","catalogs","assignments","operations","causes","confirmations"]
        );

        var aIds =
            uniqueStrings(
                aOrderIds
            );

        if (!aIds.length) {
            return Promise.resolve([]);
        }

        return readByOrderIds(
            oModel,
            "/DashboardOrderConfirmationsSet",
            aIds,
            CONFIRMATION_CONCURRENCY
        );
    }

    return {
        getBaseData:
            getBaseData,

        getOperationalData:
            getOperationalData,

        getConfirmationData:
            getConfirmationData,

        buildOrdersFilters:
            buildOrdersFilters
    };
});
