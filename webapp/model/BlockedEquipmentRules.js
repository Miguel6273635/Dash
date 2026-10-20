sap.ui.define([], function () {
    "use strict";

    function normalize(vValue) {
        return String(vValue || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
    }

    function startOfDay(oDate) {
        if (!(oDate instanceof Date) || Number.isNaN(oDate.getTime())) {
            return null;
        }

        return new Date(
            oDate.getFullYear(),
            oDate.getMonth(),
            oDate.getDate()
        );
    }

    function nthMonday(iYear, iMonth, iOccurrence) {
        var oDate = new Date(iYear, iMonth, 1);
        var iOffset = (8 - oDate.getDay()) % 7;

        return new Date(
            iYear,
            iMonth,
            1 + iOffset + (iOccurrence - 1) * 7
        );
    }

    function dateKey(oDate) {
        return [
            oDate.getFullYear(),
            String(oDate.getMonth() + 1).padStart(2, "0"),
            String(oDate.getDate()).padStart(2, "0")
        ].join("-");
    }

    function mexicanMandatoryHolidays(iYear) {
        var aDates = [
            new Date(iYear, 0, 1),
            nthMonday(iYear, 1, 1),
            nthMonday(iYear, 2, 3),
            new Date(iYear, 4, 1),
            new Date(iYear, 8, 16),
            nthMonday(iYear, 10, 3),
            new Date(iYear, 11, 25)
        ];

        /* El cambio de Poder Ejecutivo es día obligatorio cada seis años. */
        if (iYear >= 2024 && (iYear - 2024) % 6 === 0) {
            aDates.push(new Date(iYear, 9, 1));
        }

        return aDates.reduce(function (mResult, oDate) {
            mResult[dateKey(oDate)] = true;
            return mResult;
        }, Object.create(null));
    }

    function businessDays(oStart, oEnd) {
        var oFrom = startOfDay(oStart);
        var oTo = startOfDay(oEnd);
        var oCursor;
        var mHolidayCache = Object.create(null);
        var iTotal = 0;

        if (!oFrom || !oTo) {
            return null;
        }

        if (oTo <= oFrom) {
            return 0;
        }

        /*
         * Días transcurridos: no cuenta el día del bloqueo y sí el día de
         * corte. Se excluyen sábados, domingos y descansos obligatorios MX.
         */
        oCursor = new Date(oFrom.getTime());
        oCursor.setDate(oCursor.getDate() + 1);

        while (oCursor <= oTo) {
            var iDay = oCursor.getDay();
            var iYear = oCursor.getFullYear();

            if (!mHolidayCache[iYear]) {
                mHolidayCache[iYear] = mexicanMandatoryHolidays(iYear);
            }

            if (
                iDay !== 0 &&
                iDay !== 6 &&
                !mHolidayCache[iYear][dateKey(oCursor)]
            ) {
                iTotal += 1;
            }

            oCursor.setDate(oCursor.getDate() + 1);
        }

        return iTotal;
    }

    function isUsableId(vValue) {
        var sValue = String(vValue || "").trim();

        return !!sValue && !/^0+$/.test(sValue);
    }

    function isClosedOrder(oOrder) {
        var sStatus = normalize([
            oOrder && oOrder.StatusText,
            oOrder && oOrder.AppStatusCode,
            oOrder && oOrder.SapUserStatusCode
        ].join(" "));

        return [
            "CANCEL",
            "FINALIZ",
            "CERRAD",
            "COMPLET",
            "TERMIN",
            "TECO",
            "E0015",
            "0300"
        ].some(function (sMarker) {
            return sStatus.indexOf(sMarker) >= 0;
        });
    }

    function distinctRelationsForBlock(aRelations, sBlockId) {
        var mSeen = Object.create(null);

        return (aRelations || []).filter(function (oRelation) {
            var sOrderId = String(oRelation.OrderId || "");

            if (
                String(oRelation.BlockId || "") !== String(sBlockId || "") ||
                !sOrderId ||
                mSeen[sOrderId]
            ) {
                return false;
            }

            mSeen[sOrderId] = true;
            return true;
        });
    }

    function buildOrderMap(aOrders) {
        return (aOrders || []).reduce(function (mResult, oOrder) {
            var sOrderId = String(oOrder.OrderId || "");

            if (sOrderId && !mResult[sOrderId]) {
                mResult[sOrderId] = oOrder;
            }

            return mResult;
        }, Object.create(null));
    }

    function getRelatedOrders(oBlock, aRelations, aOrders) {
        var mOrders = buildOrderMap(aOrders);
        var aBlockRelations = distinctRelationsForBlock(
            aRelations,
            oBlock && oBlock.BlockId
        );
        var aMatched = aBlockRelations
            .map(function (oRelation) {
                return mOrders[String(oRelation.OrderId || "")];
            })
            .filter(Boolean);

        if (!aMatched.length && oBlock && oBlock.EquipmentId) {
            aMatched = (aOrders || []).filter(function (oOrder) {
                return String(oOrder.EquipmentId || "") ===
                    String(oBlock.EquipmentId || "");
            });
        }

        return {
            relations: aBlockRelations,
            orders: aMatched,
            activeOrders: aMatched.filter(function (oOrder) {
                return !isClosedOrder(oOrder);
            })
        };
    }

    function chooseOrder(aOrders) {
        function orderDate(oOrder) {
            var vDate = oOrder.ChangedAt ||
                oOrder.PlannedStartDate || oOrder.CreatedAt || 0;
            var aMatch = String(vDate).match(/\/Date\((-?\d+)/);
            var oDate = aMatch ? new Date(Number(aMatch[1])) : new Date(vDate);

            return Number.isNaN(oDate.getTime()) ? 0 : oDate.getTime();
        }

        return (aOrders || [])
            .slice()
            .sort(function (a, b) {
                return orderDate(b) - orderDate(a);
            })[0] || {};
    }

    function enrichBlock(oBlock, aRelations, aOrders) {
        var oContext = getRelatedOrders(oBlock, aRelations, aOrders);
        var oOrder = chooseOrder(
            oContext.activeOrders.length ? oContext.activeOrders : oContext.orders
        );
        var oResult = Object.assign({}, oBlock || {});

        oResult.CustomerId = oResult.CustomerId || oOrder.CustomerId || "";
        oResult.CustomerName = oResult.CustomerName || oOrder.CustomerName || "";
        oResult.SiteId = oResult.SiteId || oOrder.SiteId ||
            oOrder.FunctionalLocationId || "";
        oResult.SiteName = oResult.SiteName || oOrder.SiteName ||
            oOrder.FunctionalLocationName || "";
        oResult.EquipmentName = oResult.EquipmentName || oOrder.EquipmentName || "";
        oResult.ZoneId = oResult.ZoneId || oOrder.ZoneId || oOrder.Zona || "";
        oResult.ZoneName = oResult.ZoneName || oOrder.ZoneName || oOrder.Zona || "";

        if (!isUsableId(oResult.SupervisorId) && isUsableId(oOrder.SupervisorId)) {
            oResult.SupervisorId = oOrder.SupervisorId;
        }

        oResult.EquipmentAddress = oResult.EquipmentAddress ||
            oOrder.EquipmentAddress || oOrder.SiteAddress || oOrder.Address || "";
        oResult.EquipmentTypeText = oResult.EquipmentTypeText ||
            oOrder.EquipmentTypeText || oOrder.EquipmentType || "";
        oResult.EquipmentTypeCode = oResult.EquipmentTypeCode ||
            oOrder.EquipmentTypeCode || "";
        oResult.EquipmentModel = oResult.EquipmentModel ||
            oOrder.EquipmentModel || oOrder.Model || oOrder.EquipmentName || "";
        oResult._relatedOrders = oContext.orders;
        oResult._activeOrders = oContext.activeOrders;
        oResult._relations = oContext.relations;

        return oResult;
    }

    function affectedOrderIds(oBlock) {
        var aMatched = (oBlock && oBlock._relatedOrders) || [];
        var aActive = (oBlock && oBlock._activeOrders) || [];
        var aRelations = (oBlock && oBlock._relations) || [];
        var aSource;

        if (aMatched.length) {
            aSource = aActive;
        } else {
            aSource = aRelations;
        }

        return Array.from(new Set(aSource.map(function (oItem) {
            return String(oItem.OrderId || "");
        }).filter(Boolean)));
    }

    return {
        businessDays: businessDays,
        enrichBlock: enrichBlock,
        affectedOrderIds: affectedOrderIds,
        isClosedOrder: isClosedOrder,
        isUsableId: isUsableId
    };
});
