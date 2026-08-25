sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Filter,
    FilterOperator
) {
    "use strict";

    var PAGE_SIZE = 5000;
    var CONCURRENCY = 4;

    function parseDate(sValue) {
        var aMatch;

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

        var oDate = new Date(sValue);

        return Number.isNaN(oDate.getTime())
            ? null
            : oDate;
    }

    function buildOrdersFilters(mFilters) {
        var aFilters = [];

        var oDesde = parseDate(
            mFilters.fechaDesde
        );

        var oHasta = parseDate(
            mFilters.fechaHasta
        );

        /*
         * IMPORTANTE:
         * Este es el contrato actual del servicio ABAP.
         * Los EQ representan los extremos del periodo.
         */
        if (oDesde) {
            aFilters.push(
                new Filter(
                    "PlannedStartDate",
                    FilterOperator.EQ,
                    oDesde
                )
            );
        }

        if (oHasta) {
            aFilters.push(
                new Filter(
                    "PlannedFinishDate",
                    FilterOperator.EQ,
                    oHasta
                )
            );
        }

        return aFilters;
    }

    function readEntity(
        oModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(function (
            resolve,
            reject
        ) {
            oModel.read(sPath, {
                filters:
                    aFilters || [],

                urlParameters: {
                    "$format":
                        "json",

                    "$top":
                        String(PAGE_SIZE)
                },

                success:
                    function (oData) {
                        var aResults =
                            Array.isArray(
                                oData &&
                                oData.results
                            )
                                ? oData.results
                                : [];

                        console.log(
                            "[VD SERVICE]",
                            sPath,
                            "->",
                            aResults.length,
                            "registros"
                        );

                        resolve(
                            aResults
                        );
                    },

                error:
                    function (oError) {
                        console.error(
                            "[VD SERVICE] Error:",
                            sPath,
                            oError
                        );

                        if (bOptional) {
                            resolve([]);
                            return;
                        }

                        reject(
                            new Error(
                                "No fue posible consultar " +
                                sPath
                            )
                        );
                    }
            });
        });
    }

    function uniqueValues(aValues) {
        var mSeen =
            Object.create(null);

        return (aValues || [])
            .filter(
                function (sValue) {
                    var sKey =
                        String(
                            sValue ||
                            ""
                        );

                    if (
                        !sKey ||
                        mSeen[
                            sKey
                        ]
                    ) {
                        return false;
                    }

                    mSeen[
                        sKey
                    ] = true;

                    return true;
                }
            );
    }

    /*
     * Ejecuta las consultas detalle con concurrencia limitada
     * para no disparar cientos de requests simultáneos.
     */
    function runConcurrent(
        aValues,
        fnRequest
    ) {
        var aQueue =
            (aValues || [])
                .slice();

        var aResult = [];
        var iActive = 0;

        return new Promise(
            function (resolve) {
                function next() {
                    var sValue;

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
                            CONCURRENCY &&
                        aQueue.length
                    ) {
                        sValue =
                            aQueue.shift();

                        iActive += 1;

                        Promise
                            .resolve(
                                fnRequest(
                                    sValue
                                )
                            )
                            .then(
                                function (
                                    aRows
                                ) {
                                    if (
                                        Array.isArray(
                                            aRows
                                        )
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
                                        "[VD SERVICE] Error detalle:",
                                        oError
                                    );
                                }
                            )
                            .finally(
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

    /*
     * El documento técnico indica que estas entidades
     * deben consultarse con filtro OrderId.
     */
    function readByOrderId(
        oModel,
        sEntitySet,
        aOrderIds
    ) {
        return runConcurrent(
            uniqueValues(
                aOrderIds
            ),

            function (sOrderId) {
                return readEntity(
                    oModel,
                    sEntitySet,
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
     * MaterialMovements se obtiene mediante
     * MaterialRequirementId.
     */
    function readMaterialMovements(
        oModel,
        aRequirementIds
    ) {
        return runConcurrent(
            uniqueValues(
                aRequirementIds
            ),

            function (
                sRequirementId
            ) {
                return readEntity(
                    oModel,
                    "/DashboardMaterialMovementsSet",
                    [
                        new Filter(
                            "MaterialRequirementId",
                            FilterOperator.EQ,
                            sRequirementId
                        )
                    ],
                    true
                );
            }
        );
    }

    function getDashboardData(
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
            "[VD SERVICE] Filtros:",
            mFilters
        );

        /*
         * PASO 1
         * Obtener órdenes del periodo +
         * ResourceDaily +
         * catálogos.
         */
        return Promise.all([
            readEntity(
                oModel,
                "/DashboardOrdersSet",
                buildOrdersFilters(
                    mFilters
                ),
                false
            ),

            readEntity(
                oModel,
                "/DashboardResourceDailySet",
                [],
                false
            ),

            readEntity(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            )
        ])
            .then(
                function (
                    aBase
                ) {
                    var aOrders =
                        aBase[0] ||
                        [];

                    var aOrderIds =
                        uniqueValues(
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
                     * PASO 2
                     * Consultar detalles por OrderId.
                     */
                    return Promise.all([
                        Promise.resolve(
                            aOrders
                        ),

                        Promise.resolve(
                            aBase[1] ||
                            []
                        ),

                        Promise.resolve(
                            aBase[2] ||
                            []
                        ),

                        readByOrderId(
                            oModel,
                            "/DashboardOrderResourcesSet",
                            aOrderIds
                        ),

                        readByOrderId(
                            oModel,
                            "/DashboardOrderOperationsSet",
                            aOrderIds
                        ),

                        readByOrderId(
                            oModel,
                            "/DashboardOrderMaterialsSet",
                            aOrderIds
                        )
                    ]);
                }
            )
            .then(
                function (
                    aData
                ) {
                    var aMaterials =
                        aData[5] ||
                        [];

                    var aRequirementIds =
                        uniqueValues(
                            aMaterials.map(
                                function (
                                    oMaterial
                                ) {
                                    return (
                                        oMaterial
                                            .MaterialRequirementId
                                    );
                                }
                            )
                        );

                    /*
                     * PASO 3
                     * Obtener movimientos reales de
                     * los materiales encontrados.
                     */
                    return readMaterialMovements(
                        oModel,
                        aRequirementIds
                    ).then(
                        function (
                            aMovements
                        ) {
                            var oResult = {
                                orders:
                                    aData[0] ||
                                    [],

                                resources:
                                    aData[1] ||
                                    [],

                                catalogs:
                                    aData[2] ||
                                    [],

                                orderResources:
                                    aData[3] ||
                                    [],

                                operations:
                                    aData[4] ||
                                    [],

                                materials:
                                    aMaterials,

                                materialMovements:
                                    aMovements ||
                                    []
                            };

                            console.log(
                                "[VD SERVICE] Carga terminada:",
                                {
                                    orders:
                                        oResult
                                            .orders
                                            .length,

                                    resources:
                                        oResult
                                            .resources
                                            .length,

                                    catalogs:
                                        oResult
                                            .catalogs
                                            .length,

                                    orderResources:
                                        oResult
                                            .orderResources
                                            .length,

                                    operations:
                                        oResult
                                            .operations
                                            .length,

                                    materials:
                                        oResult
                                            .materials
                                            .length,

                                    materialMovements:
                                        oResult
                                            .materialMovements
                                            .length
                                }
                            );

                            return oResult;
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