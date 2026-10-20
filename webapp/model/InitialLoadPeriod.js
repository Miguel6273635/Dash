sap.ui.define([], function () {
    "use strict";

    /* Periodos compartidos por los dashboards. El valor visible del selector
     * siempre debe describir el mismo rango que se envía a SAP. */
    function pad(value) {
        return String(value).padStart(2, "0");
    }

    function display(date) {
        return pad(date.getDate()) + "/" + pad(date.getMonth() + 1) + "/" + date.getFullYear();
    }

    function iso(date) {
        return date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    }

    function previousMonth(referenceDate) {
        var reference = referenceDate instanceof Date ? new Date(referenceDate.getTime()) : new Date();
        var start = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
        var end = new Date(reference.getFullYear(), reference.getMonth(), 0);

        return {
            year: String(start.getFullYear()),
            monthKey: start.getFullYear() + "-" + pad(start.getMonth() + 1),
            startDate: start,
            endDate: end,
            startDisplay: display(start),
            endDisplay: display(end),
            startIso: iso(start),
            endIso: iso(end)
        };
    }

    function parse(value) {
        var match = String(value || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        var isoMatch;
        var result;

        if (match) {
            result = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
            return Number.isNaN(result.getTime()) ? null : result;
        }
        isoMatch = String(value || "").trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!isoMatch) {
            return null;
        }
        result = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
        return Number.isNaN(result.getTime()) ? null : result;
    }

    function rangeForKey(value) {
        var key = String(value || "");
        var annual = key.match(/^(\d{4})(?:-ANUAL)?$/);
        var monthly = key.match(/^(\d{4})-(\d{2})$/);
        var year;
        var month;

        if (monthly && Number(monthly[2]) >= 1 && Number(monthly[2]) <= 12) {
            year = Number(monthly[1]);
            month = Number(monthly[2]) - 1;
            return {
                startDate: new Date(year, month, 1),
                endDate: new Date(year, month + 1, 0)
            };
        }
        if (!annual) {
            return null;
        }
        year = Number(annual[1]);
        return { startDate: new Date(year, 0, 1), endDate: new Date(year, 11, 31) };
    }

    function keyForRange(fromValue, toValue, annualSuffix) {
        var from = parse(fromValue);
        var to = parse(toValue);
        var sameYear;

        if (!from || !to) {
            return "";
        }
        sameYear = from.getFullYear() === to.getFullYear();
        if (sameYear && from.getMonth() === 0 && from.getDate() === 1 &&
            to.getMonth() === 11 && to.getDate() === 31) {
            return String(from.getFullYear()) + (annualSuffix ? "-ANUAL" : "");
        }
        if (sameYear && from.getMonth() === to.getMonth() && from.getDate() === 1 &&
            to.getDate() === new Date(to.getFullYear(), to.getMonth() + 1, 0).getDate()) {
            return from.getFullYear() + "-" + pad(from.getMonth() + 1);
        }
        return "";
    }

    function applyKey(target, key, useIso) {
        var range = rangeForKey(key);

        if (!range) {
            return Object.assign({}, target || {});
        }
        return Object.assign({}, target || {}, {
            fechaDesde: useIso ? iso(range.startDate) : display(range.startDate),
            fechaHasta: useIso ? iso(range.endDate) : display(range.endDate)
        });
    }

    return {
        previousMonth: previousMonth,
        parse: parse,
        rangeForKey: rangeForKey,
        keyForRange: keyForRange,
        applyKey: applyKey,
        display: display,
        iso: iso
    };
});
