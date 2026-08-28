sap.ui.define([
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Filter,
    FilterOperator
) {
    "use strict";

    var PAGE_SIZE = 1000;
    var MAX_PAGES = 50;

    function getKey(oRow) {
        return (
            oRow.FilterCatalogId ||
            oRow.BlockId ||
            oRow.BlockEventId ||
            oRow.ResourceDateId ||
            oRow.BlockOrderId ||
            oRow.OrderId ||
            ""
        );
    }

    function getSignature(aRows) {
        if (!aRows || !aRows.length) {
            return "";
        }

        return JSON.stringify([
            getKey(aRows[0] || {}),
            getKey(aRows[aRows.length - 1] || {})
        ]);
    }

    function fetchAll(
        oModel,
        sPath,
        aFilters,
        bOptional
    ) {
        return new Promise(function (resolve, reject) {
            var aAll = [];
            var iPage = 0;
            var sPreviousSignature = "";

            function readPage() {
                oModel.read(sPath, {
                    filters: aFilters || [],

                    urlParameters: {
                        "$format": "json",
                        "$top": String(PAGE_SIZE),
                        "$skip": String(
                            iPage * PAGE_SIZE
                        )
                    },

                    success: function (oData) {
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
                            resolve(aAll);
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
                            resolve(aAll);
                            return;
                        }

                        iPage += 1;
                        readPage();
                    },

                    error: function (oError) {
                        console.error(
                            "[HS SERVICE]",
                            sPath,
                            oError
                        );

                        if (bOptional) {
                            resolve([]);
                            return;
                        }

                        reject(
                            new Error(
                                "Error consultando " +
                                sPath
                            )
                        );
                    }
                });
            }

            readPage();
        });
    }

    function eq(
        sField,
        sValue
    ) {
        if (!sValue) {
            return [];
        }

        return [
            new Filter(
                sField,
                FilterOperator.EQ,
                sValue
            )
        ];
    }

    function selectCurrentBlock(
        aBlocks
    ) {
        var aCopy =
            (aBlocks || []).slice();

        if (!aCopy.length) {
            return null;
        }

        var oOpen =
            aCopy.find(function (oBlock) {
                return !oBlock.ReleasedAt;
            });

        if (oOpen) {
            return oOpen;
        }

        aCopy.sort(
            function (a, b) {
                return (
                    new Date(
                        b.BlockedAt || 0
                    ).getTime() -
                    new Date(
                        a.BlockedAt || 0
                    ).getTime()
                );
            }
        );

        return aCopy[0];
    }

    function fetchOrdersByIds(
        oModel,
        aOrderIds
    ) {
        if (!aOrderIds.length) {
            return Promise.resolve([]);
        }

        return Promise.all(
            aOrderIds.map(
                function (sOrderId) {
                    return fetchAll(
                        oModel,
                        "/DashboardOrdersSet",
                        eq(
                            "OrderId",
                            sOrderId
                        ),
                        true
                    );
                }
            )
        ).then(
            function (aResponses) {
                return [].concat.apply(
                    [],
                    aResponses
                );
            }
        );
    }

    function getDashboardData(
        oModel,
        sEquipmentId
    ) {
        if (
            !oModel ||
            typeof oModel.read !==
                "function"
        ) {
            return Promise.reject(
                new Error(
                    "Modelo OData no disponible."
                )
            );
        }

        return Promise.all([
            fetchAll(
                oModel,
                "/DashboardFilterCatalogSet",
                [],
                true
            ),

            fetchAll(
                oModel,
                "/DashboardEquipmentBlocksSet",
                eq(
                    "EquipmentId",
                    sEquipmentId
                ),
                true
            ),

            fetchAll(
                oModel,
                "/DashboardResourceDailySet",
                [],
                true
            )
        ]).then(function (aBase) {
            var aCatalogs =
                aBase[0] || [];

            var aBlocks =
                aBase[1] || [];

            var aResources =
                aBase[2] || [];

            var oBlock =
                selectCurrentBlock(
                    aBlocks
                );

            if (!oBlock) {
                return {
                    catalogs:
                        aCatalogs,

                    blocks:
                        aBlocks,

                    block:
                        null,

                    events:
                        [],

                    resources:
                        aResources,

                    blockOrders:
                        [],

                    orders:
                        []
                };
            }

            var sBlockId =
                oBlock.BlockId;

            return Promise.all([
                fetchAll(
                    oModel,
                    "/DashboardBlockEventsSet",
                    eq(
                        "BlockId",
                        sBlockId
                    ),
                    true
                ),

                fetchAll(
                    oModel,
                    "/DashboardBlockOrdersSet",
                    eq(
                        "BlockId",
                        sBlockId
                    ),
                    true
                )
            ]).then(
                function (aDetail) {
                    var aEvents =
                        aDetail[0] || [];

                    var aBlockOrders =
                        aDetail[1] || [];

                    var aOrderIds =
                        Array.from(
                            new Set(
                                aBlockOrders
                                    .map(
                                        function (
                                            oRow
                                        ) {
                                            return (
                                                oRow.OrderId ||
                                                ""
                                            );
                                        }
                                    )
                                    .filter(
                                        Boolean
                                    )
                            )
                        );

                    return fetchOrdersByIds(
                        oModel,
                        aOrderIds
                    ).then(
                        function (
                            aOrders
                        ) {
                            return {
                                catalogs:
                                    aCatalogs,

                                blocks:
                                    aBlocks,

                                block:
                                    oBlock,

                                events:
                                    aEvents,

                                resources:
                                    aResources,

                                blockOrders:
                                    aBlockOrders,

                                orders:
                                    aOrders
                            };
                        }
                    );
                }
            );
        });
    }

    return {
        getDashboardData:
            getDashboardData
    };
});