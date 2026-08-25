sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Filter,
    FilterOperator
) {
    "use strict";

    var DETAIL_CONCURRENCY = 2;

    /* =========================================================
     * GENERALES
     * ========================================================= */

    function normalize(vValue) {
        return String(
            vValue || ""
        )
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .trim()
            .toUpperCase();
    }

    function isAll(vValue) {
        return [
            "",
            "ALL",
            "TODOS",
            "TODAS"
        ].indexOf(
            normalize(vValue)
        ) >= 0;
    }

    function parseInputDate(sValue) {
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

    function uniqueStrings(aValues) {
        var mSeen =
            Object.create(null);

        return (
            aValues || []
        ).filter(
            function (vValue) {
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
            }
        );
    }

    /* =========================================================
     * FILTRO ORDERS
     * ========================================================= */

    function buildOrdersFilters(mFilters) {
        var aFilters = [];

        var oDateFrom =
            parseInputDate(
                mFilters &&
                mFilters.dateFrom
            );

        var oDateTo =
            parseInputDate(
                mFilters &&
                mFilters.dateTo
            );

        /*
         * Contrato actual publicado para OrdersSet.
         */
        if (oDateFrom) {
            aFilters.push(
                new Filter(
                    "PlannedStartDate",
                    FilterOperator.EQ,
                    oDateFrom
                )
            );
        }

        if (oDateTo) {
            aFilters.push(
                new Filter(
                    "PlannedFinishDate",
                    FilterOperator.EQ,
                    oDateTo
                )
            );
        }

        return aFilters;
    }

    /* =========================================================
     * READ
     * ========================================================= */

    function readEntity(
        oModel,
        sPath,
        aFilters
    ) {
        return new Promise(
            function (
                resolve
            ) {
                oModel.read(
                    sPath,
                    {
                        filters:
                            aFilters || [],

                        urlParameters: {
                            "$format":
                                "json"
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

                                console.log(
                                    "[DOJ SERVICE] " +
                                    sPath +
                                    " -> " +
                                    aResults.length +
                                    " registros"
                                );

                                resolve(
                                    aResults
                                );
                            },

                        error:
                            function (
                                oError
                            ) {
                                /*
                                 * No bloqueamos la pantalla.
                                 *
                                 * Actualmente QAS puede estar
                                 * indisponible. Cuando vuelva,
                                 * el mismo código empezará a
                                 * poblar los datos.
                                 */
                                console.error(
                                    "[DOJ SERVICE] Error " +
                                    sPath,
                                    oError
                                );

                                resolve(
                                    []
                                );
                            }
                    }
                );
            }
        );
    }

    /* =========================================================
     * CONCURRENCIA CONTROLADA
     * ========================================================= */

    function runConcurrent(
        aValues,
        iLimit,
        fnWorker
    ) {
        var aQueue =
            (
                aValues || []
            ).slice();

        var aResults = [];

        var iActive =
            0;

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
                            aResults
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

                        iActive +=
                            1;

                        Promise.resolve(
                            fnWorker(
                                vValue
                            )
                        )
                            .then(
                                function (
                                    aChunk
                                ) {
                                    if (
                                        Array.isArray(
                                            aChunk
                                        ) &&
                                        aChunk.length
                                    ) {
                                        aResults =
                                            aResults.concat(
                                                aChunk
                                            );
                                    }
                                }
                            )
                            .catch(
                                function (
                                    oError
                                ) {
                                    console.error(
                                        "[DOJ SERVICE] Error detalle:",
                                        oError
                                    );
                                }
                            )
                            .then(
                                function () {
                                    iActive -=
                                        1;

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
                return readEntity(
                    oModel,
                    sPath,
                    [
                        new Filter(
                            "OrderId",
                            FilterOperator.EQ,
                            sOrderId
                        )
                    ]
                );
            }
        );
    }

    /* =========================================================
     * FILTRAR ÓRDENES POR TIPO DE SERVICIO
     * ========================================================= */

    function getOrderIdsForDetails(
        aOrders,
        mFilters
    ) {
        var sServiceType =
            mFilters &&
            mFilters.serviceType;

        return uniqueStrings(
            (
                aOrders || []
            )
                .filter(
                    function (
                        oOrder
                    ) {
                        if (
                            isAll(
                                sServiceType
                            )
                        ) {
                            return true;
                        }

                        return (
                            normalize(
                                oOrder.OrderTypeCode
                            ) ===
                                normalize(
                                    sServiceType
                                ) ||
                            normalize(
                                oOrder.OrderTypeText
                            ) ===
                                normalize(
                                    sServiceType
                                )
                        );
                    }
                )
                .map(
                    function (
                        oOrder
                    ) {
                        return (
                            oOrder.OrderId
                        );
                    }
                )
        );
    }

    /* =========================================================
     * FASE 1
     * ========================================================= */

    function getBaseData(
        oModel,
        mFilters
    ) {
        if (
            !oModel ||
            typeof oModel.read !==
                "function"
        ) {
            return Promise.reject(
                new Error(
                    "No se encontró el modelo OData dashboardOData."
                )
            );
        }

        console.log(
            "[DOJ SERVICE] Carga base:",
            mFilters
        );

        return Promise.all([
            readEntity(
                oModel,

                "/DashboardOrdersSet",

                buildOrdersFilters(
                    mFilters || {}
                )
            ),

            readEntity(
                oModel,

                "/DashboardResourceDailySet",

                []
            ),

            readEntity(
                oModel,

                "/DashboardFilterCatalogSet",

                []
            )
        ])
            .then(
                function (
                    aResponses
                ) {
                    return {
                        orders:
                            aResponses[0] ||
                            [],

                        resources:
                            aResponses[1] ||
                            [],

                        catalogs:
                            aResponses[2] ||
                            [],

                        orderResources:
                            [],

                        operations:
                            []
                    };
                }
            );
    }

    /* =========================================================
     * FASE 2
     * ========================================================= */

    function getOperationalData(
        oModel,
        aOrderIds
    ) {
        var aIds =
            uniqueStrings(
                aOrderIds
            );

        if (!aIds.length) {
            return Promise.resolve({
                orderResources:
                    [],

                operations:
                    []
            });
        }

        console.log(
            "[DOJ SERVICE] Cargando detalle de " +
            aIds.length +
            " órdenes"
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
        ])
            .then(
                function (
                    aResponses
                ) {
                    return {
                        orderResources:
                            aResponses[0] ||
                            [],

                        operations:
                            aResponses[1] ||
                            []
                    };
                }
            );
    }

    return {
        getBaseData:
            getBaseData,

        getOperationalData:
            getOperationalData,

        getOrderIdsForDetails:
            getOrderIdsForDetails,

        buildOrdersFilters:
            buildOrdersFilters
    };
});