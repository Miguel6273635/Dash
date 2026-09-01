sap.ui.define([], function () {
    "use strict";

    /*
     * Periodo liviano para la primera carga de una pantalla.
     * El selector de "Periodo" sigue siendo anual; estas fechas son las que
     * limitan la primera consulta OData. Al cambiar el selector o pulsar
     * Aplicar filtros, cada controlador conserva su comportamiento normal.
     */
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

    return { previousMonth: previousMonth };
});
