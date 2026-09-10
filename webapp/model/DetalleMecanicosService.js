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

    function parseInputDate(
        sValue
    ) {
        var aMatch;
        var oDate;

        if (!sValue) {
            return null;
        }

        aMatch =
            String(sValue).match(
                /^(\d{2})\/(\d{2})\/(\d{4})$/
            );

        if (aMatch) {
            return new Date(
                Number(aMatch[3]),
                Number(aMatch[2]) - 1,
                Number(aMatch[1])
            );
        }

        oDate =
            new Date(sValue);

        return Number.isNaN(
            oDate.getTime()
        )
            ? null
            : oDate;
    }

    function buildOrdersFilters(
        mFilters
    ) {
        var aFilters = [];
        var oStartDate;
        var oEndDate;

        mFilters =
            mFilters || {};

        oStartDate =
            parseInputDate(
                mFilters.fechaDesde
            );

        oEndDate =
            parseInputDate(
                mFilters.fechaHasta
            );

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

    function getSignature(
        aResults
    ) {
        var oFirst;
        var oLast;

        if (
            !aResults ||
            !aResults.length
        ) {
            return "";
        }

        oFirst =
            aResults[0] ||
            {};

        oLast =
            aResults[
                aResults.length - 1
            ] ||
            {};

        return JSON.stringify([
            oFirst.ResourceDateId ||
            oFirst.OrderResourceId ||
            oFirst.OperationKey ||
            oFirst.ConfirmationId ||
            oFirst.OrderId ||
            oFirst.FilterCatalogId ||
            "",

            oLast.ResourceDateId ||
            oLast.OrderResourceId ||
            oLast.OperationKey ||
            oLast.ConfirmationId ||
            oLast.OrderId ||
            oLast.FilterCatalogId ||
            ""
        ]);
    }

    function fetchAll(
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
                    iPage *
                    PAGE_SIZE;

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
                                var aResults =
                                    Array.isArray(
                                        oData &&
                                        oData.results
                                    )
                                        ? oData.results
                                        : [];

                                var sSignature =
                                    getSignature(
                                        aResults
                                    );

                                if (
                                    iPage > 0 &&
                                    sSignature &&
                                    sSignature ===
                                    sPreviousSignature
                                ) {
                                    resolve(
                                        aAll
                                    );

                                    return;
                                }

                                sPreviousSignature =
                                    sSignature;

                                aAll =
                                    aAll.concat(
                                        aResults
                                    );

                                if (
                                    aResults.length <
                                    PAGE_SIZE ||
                                    iPage + 1 >=
                                    MAX_PAGES
                                ) {
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
                                    "[DM SERVICE] Error en " +
                                    sPath,
                                    oError
                                );

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
        ).filter(
            function (
                vValue
            ) {
                var sValue =
                    String(
                        vValue ||
                        ""
                    );

                if (
                    !sValue ||
                    mSeen[
                        sValue
                    ]
                ) {
                    return false;
                }

                mSeen[
                    sValue
                ] = true;

                return true;
            }
        );
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

        return new Promise(
            function (
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
                        iActive <
                        iLimit &&
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
                                        "[DM SERVICE] Error detalle:",
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
            }
        );
    }

    function readByOrderIds(
        oModel,
        sPath,
        aOrderIds
    ) {
        return runConcurrent(
            uniqueStrings(
                aOrderIds
            ),

            DETAIL_CONCURRENCY,

            function (
                sOrderId
            ) {
                return fetchAll(
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

    function getDashboardData(
        oModel,
        mFilters,
        bInitialLoad
    ) {
        oModel = DashboardCacheODataModel.wrap(
            oModel,
            mFilters,
            ["resources","orders","catalogs","assignments","operations","confirmations"]
        );

        var oEffectiveFilters =
            Object.assign(
                {},
                mFilters || {}
            );

        var aOrdersFilters;

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

        /*
         * SOLO PRIMERA CONSULTA:
         * 01/08/2026 - 25/08/2026
         *
         * Después se usan las fechas que mande el Controller.
         */
        if (bInitialLoad) {
            oEffectiveFilters.periodo =
                "2026";

            oEffectiveFilters.fechaDesde =
                "01/08/2026";

            oEffectiveFilters.fechaHasta =
                "25/08/2026";
        }

        aOrdersFilters =
            buildOrdersFilters(
                oEffectiveFilters
            );

        console.log(
            "[DM SERVICE] Consulta:",
            {
                initial:
                    Boolean(
                        bInitialLoad
                    ),

                filters:
                    oEffectiveFilters
            }
        );

        /*
         * FASE 1
         */
        return Promise.all([
            fetchAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                false
            ),

            fetchAll(
                oModel,
                "/DashboardOrdersSet",
                aOrdersFilters,
                false
            ),

            fetchAll(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            )
        ]).then(
            function (
                aBase
            ) {
                var aResources =
                    aBase[0] ||
                    [];

                var aOrders =
                    aBase[1] ||
                    [];

                var aCatalogs =
                    aBase[2] ||
                    [];

                var aOrderIds =
                    uniqueStrings(
                        aOrders.map(
                            function (
                                oOrder
                            ) {
                                return (
                                    oOrder.OrderId
                                );
                            }
                        )
                    );
/*
 * Primera carga rápida:
 * muestra órdenes, recursos y catálogos sin disparar
 * consultas individuales por cada OrderId.
 */
if (bInitialLoad) {
    return {
        resources: aResources,
        orders: aOrders,
        orderResources: [],
        operations: [],
        confirmations: [],
        catalogs: aCatalogs
    };
}
                /*
                 * Si no hay órdenes, NO dispara
                 * consultas pesadas de detalle.
                 */
                if (
                    !aOrderIds.length
                ) {
                    return {
                        resources:
                            aResources,

                        orders:
                            aOrders,

                        orderResources:
                            [],

                        operations:
                            [],

                        confirmations:
                            [],

                        catalogs:
                            aCatalogs
                    };
                }

                /*
                 * FASE 2
                 * Sólo detalles de las OT encontradas.
                 */
                return Promise.all([
                    readByOrderIds(
                        oModel,
                        "/DashboardOrderResourcesSet",
                        aOrderIds
                    ),

                    readByOrderIds(
                        oModel,
                        "/DashboardOrderOperationsSet",
                        aOrderIds
                    ),

                    readByOrderIds(
                        oModel,
                        "/DashboardOrderConfirmationsSet",
                        aOrderIds
                    )
                ]).then(
                    function (
                        aDetail
                    ) {
                        return {
                            resources:
                                aResources,

                            orders:
                                aOrders,

                            orderResources:
                                aDetail[0] ||
                                [],

                            operations:
                                aDetail[1] ||
                                [],

                            confirmations:
                                aDetail[2] ||
                                [],

                            catalogs:
                                aCatalogs
                        };
                    }
                );
            }
        );
    }

    return {
        getDashboardData:
            getDashboardData,

        buildOrdersFilters:
            buildOrdersFilters
    };
});
