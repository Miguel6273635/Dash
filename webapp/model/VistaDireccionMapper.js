sap.ui.define([], function () {
    "use strict";

    var DEFAULT_LOW_MAX = 70;
    var DEFAULT_NORMAL_MAX = 100;
    var DEFAULT_HIGH_MAX = 120;
    var DEFAULT_COMPLIANCE_TARGET = 80;
    var DEFAULT_EXECUTED_APP_STATUS = ["0300"];

    function norm(v) {
        return String(v || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toUpperCase();
    }

    function isTrue(v) {
        return v === true ||
            ["TRUE", "X", "1"].indexOf(norm(v)) >= 0;
    }

    function isAll(v) {
        return ["", "TODOS", "TODAS", "ALL"].indexOf(norm(v)) >= 0;
    }

    function parseInputDate(v) {
        var m;
        var d;

        if (!v) {
            return null;
        }

        m = String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

        if (m) {
            return new Date(
                Number(m[3]),
                Number(m[2]) - 1,
                Number(m[1])
            );
        }

        d = new Date(v);

        return Number.isNaN(d.getTime()) ? null : d;
    }

    function parseODataDate(v) {
        var m;
        var d;

        if (!v) {
            return null;
        }

        if (v instanceof Date) {
            return new Date(v.getTime());
        }

        m = String(v).match(/\/Date\((-?\d+)/);
        d = m ? new Date(Number(m[1])) : new Date(v);

        return Number.isNaN(d.getTime()) ? null : d;
    }

    function inRange(v, start, end) {
        var d = parseODataDate(v);

        if (!d) {
            return false;
        }

        d = new Date(
            d.getFullYear(),
            d.getMonth(),
            d.getDate()
        );

        if (start && d < new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
        )) {
            return false;
        }

        if (end && d > new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate()
        )) {
            return false;
        }

        return true;
    }

    function toHours(value, unit) {
        var n = Number(value);
        var u = norm(unit);

        if (!Number.isFinite(n)) {
            return null;
        }

        if (["H", "HR", "HRS", "HRA", "HOUR", "HOURS", "STD"].indexOf(u) >= 0) {
            return n;
        }

        if (["MIN", "MINS", "MINUTE", "MINUTES"].indexOf(u) >= 0) {
            return n / 60;
        }

        if (["S", "SEC", "SECOND", "SECONDS"].indexOf(u) >= 0) {
            return n / 3600;
        }

        return null;
    }

    function uniqueBy(items, keyFn) {
        var seen = Object.create(null);

        return (items || []).filter(function (item) {
            var key = String(keyFn(item) || "");

            if (!key || seen[key]) {
                return false;
            }

            seen[key] = true;
            return true;
        });
    }

    function uniqueStrings(items) {
        var seen = Object.create(null);

        return (items || []).filter(function (item) {
            var key = String(item || "");

            if (!key || seen[key]) {
                return false;
            }

            seen[key] = true;
            return true;
        });
    }

    function matches(filterValue, values) {
        if (isAll(filterValue)) {
            return true;
        }

        return (values || []).some(function (value) {
            return norm(value) === norm(filterValue);
        });
    }

    function formatNumber(value, decimals) {
        if (!Number.isFinite(value)) {
            return "Sin datos";
        }

        return Number(value).toLocaleString("en-US", {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function formatHours(value) {
        if (!Number.isFinite(value)) {
            return "Sin datos";
        }

        if (Math.abs(value) < 10) {
            return formatNumber(value, 2) + " h";
        }

        return formatNumber(value, 0) + " h";
    }

    function formatPct(value) {
        return Number.isFinite(value)
            ? formatNumber(value, 1) + "%"
            : "Sin datos";
    }

    function catalogRows(catalogs, domain) {
        return (catalogs || [])
            .filter(function (row) {
                return norm(row.FilterDomain) === norm(domain) &&
                    (
                        row.Active === undefined ||
                        row.Active === null ||
                        isTrue(row.Active)
                    );
            })
            .sort(function (a, b) {
                return Number(a.SortOrder || 0) -
                    Number(b.SortOrder || 0);
            });
    }

    function makeCatalog(rows, allKey, allText) {
        var result = [{
            key: allKey,
            text: allText,
            parentKey: ""
        }];

        var seen = Object.create(null);

        (rows || []).forEach(function (row) {
            var key = String(
                row.key ||
                row.ValueId ||
                row.ValueText ||
                ""
            );

            var text = String(
                row.text ||
                row.ValueText ||
                row.ValueId ||
                ""
            );

            var dedup = norm(key + "|" + text);

            if (!key || seen[dedup]) {
                return;
            }

            seen[dedup] = true;

            result.push({
                key: key,
                text: text,
                parentKey: String(
                    row.parentKey ||
                    row.ParentValueId ||
                    ""
                )
            });
        });

        return result;
    }

    function buildPeriods() {
        var result = [];
        var year;

        for (year = 2028; year >= 2021; year--) {
            result.push({
                key: String(year),
                text: String(year)
            });
        }

        return result;
    }

    function buildCatalogs(raw, resourcesPeriod) {
        var directions = catalogRows(raw.catalogs, "DIRECTION");
        var headships = catalogRows(raw.catalogs, "HEADSHIP");
        var shifts = catalogRows(raw.catalogs, "SHIFT");

        if (!directions.length) {
            directions = uniqueBy(
                resourcesPeriod
                    .filter(function (r) {
                        return r.DirectionId || r.DirectionName;
                    })
                    .map(function (r) {
                        return {
                            key: r.DirectionId || r.DirectionName,
                            text: r.DirectionName || r.DirectionId
                        };
                    }),
                function (x) {
                    return x.key;
                }
            );
        }

        if (!headships.length) {
            headships = uniqueBy(
                resourcesPeriod
                    .filter(function (r) {
                        return r.HeadshipId || r.HeadshipName;
                    })
                    .map(function (r) {
                        return {
                            key: r.HeadshipId || r.HeadshipName,
                            text: r.HeadshipName || r.HeadshipId,
                            parentKey:
                                r.DirectionId ||
                                r.DirectionName ||
                                ""
                        };
                    }),
                function (x) {
                    return x.key + "|" + x.parentKey;
                }
            );
        }

        if (!shifts.length) {
            shifts = uniqueBy(
                resourcesPeriod
                    .filter(function (r) {
                        return isTrue(r.ShiftSourceValidated) &&
                            (r.ShiftId || r.ShiftName);
                    })
                    .map(function (r) {
                        return {
                            key: r.ShiftId || r.ShiftName,
                            text: r.ShiftName || r.ShiftId
                        };
                    }),
                function (x) {
                    return x.key;
                }
            );
        }

        return {
            periods: buildPeriods(),
            directions: makeCatalog(
                directions,
                "TODAS",
                "Todas"
            ),
            headshipsAll: makeCatalog(
                headships,
                "TODAS",
                "Todas"
            ),
            shifts: makeCatalog(
                shifts,
                "TODOS",
                "Todos"
            )
        };
    }

    function getNumericCatalog(catalogs, domains, fallback) {
        var row = (catalogs || []).find(function (x) {
            return domains.indexOf(norm(x.FilterDomain)) >= 0 &&
                (
                    x.Active === undefined ||
                    x.Active === null ||
                    isTrue(x.Active)
                ) &&
                Number.isFinite(Number(x.NumericValue));
        });

        return row
            ? Number(row.NumericValue)
            : fallback;
    }

    function getThresholds(catalogs) {
        return {
            lowMax: getNumericCatalog(
                catalogs,
                ["UTILIZATION_LOW_MAX", "HEADSHIP_LOW_MAX"],
                DEFAULT_LOW_MAX
            ),
            normalMax: getNumericCatalog(
                catalogs,
                ["UTILIZATION_NORMAL_MAX", "HEADSHIP_NORMAL_MAX"],
                DEFAULT_NORMAL_MAX
            ),
            highMax: getNumericCatalog(
                catalogs,
                ["UTILIZATION_HIGH_MAX", "HEADSHIP_HIGH_MAX"],
                DEFAULT_HIGH_MAX
            )
        };
    }

    function classifyUtilization(pct, thresholds) {
        if (!Number.isFinite(pct)) {
            return {
                code: "NO_DATA",
                tone: "gray"
            };
        }

        if (pct > thresholds.highMax) {
            return {
                code: "CRITICAL",
                tone: "red"
            };
        }

        if (pct > thresholds.normalMax) {
            return {
                code: "HIGH",
                tone: "orange"
            };
        }

        if (pct > thresholds.lowMax) {
            return {
                code: "NORMAL",
                tone: "yellow"
            };
        }

        return {
            code: "LOW",
            tone: "green"
        };
    }

    function buildAssignmentMaps(assignments) {
        var exact = Object.create(null);
        var byOrder = Object.create(null);

        (assignments || []).forEach(function (a) {
            var orderId = String(a.OrderId || "");
            var exactKey = [
                orderId,
                a.RoutingNumber || "",
                a.OperationCounter || ""
            ].join("|");

            if (!exact[exactKey]) {
                exact[exactKey] = [];
            }

            exact[exactKey].push(a);

            if (!byOrder[orderId]) {
                byOrder[orderId] = [];
            }

            byOrder[orderId].push(a);
        });

        return {
            exact: exact,
            byOrder: byOrder
        };
    }

    function assignmentsForOperation(operation, maps) {
        var orderId = String(operation.OrderId || "");
        var exactKey = [
            orderId,
            operation.RoutingNumber || "",
            operation.OperationCounter || ""
        ].join("|");

        return maps.exact[exactKey] &&
            maps.exact[exactKey].length
            ? maps.exact[exactKey]
            : (maps.byOrder[orderId] || []);
    }

    function planOperationAllowed(operation) {
        var source = norm(operation.PlannedSourceCode);

        /*
         * En el corte QAS actual AFVV_WORK es la fuente prioritaria.
         * KBED no se suma.
         */
        return !source || source.indexOf("AFVV") === 0;
    }

    function buildOrderMap(orders) {
        var map = Object.create(null);

        (orders || []).forEach(function (o) {
            if (o.OrderId && !map[o.OrderId]) {
                map[o.OrderId] = o;
            }
        });

        return map;
    }

    function getComplianceTarget(catalogs, direction) {
        var rows = catalogRows(
            catalogs,
            "COMPLIANCE_TARGET"
        );

        var scoped = rows.find(function (x) {
            return norm(x.ScopeTypeCode) === "DIRECTION" &&
                matches(direction, [
                    x.ScopeId,
                    x.ValueId
                ]);
        });

        var global = rows.find(function (x) {
            return !x.ScopeTypeCode ||
                norm(x.ScopeTypeCode) === "GLOBAL";
        });

        var selected = scoped || global || rows[0];
        var value = selected
            ? Number(selected.NumericValue)
            : NaN;

        return Number.isFinite(value)
            ? value
            : DEFAULT_COMPLIANCE_TARGET;
    }

    function getExecutedCodes(catalogs) {
        var rows = catalogRows(
            catalogs,
            "COMPLIANCE_EXECUTED_STATUS"
        );

        if (!rows.length) {
            return DEFAULT_EXECUTED_APP_STATUS.slice();
        }

        return uniqueStrings(
            rows.map(function (x) {
                return x.ValueId || x.ValueText;
            })
        );
    }

    function isExecuted(order, codes) {
        var app = norm(order.AppStatusCode);
        var text = norm(order.StatusText);

        if (codes.map(norm).indexOf(app) >= 0) {
            return true;
        }

        return text.indexOf("FINALIZAD") >= 0 ||
            text.indexOf("EJECUTAD") >= 0;
    }

    function emptyKpis() {
        return [
            {
                title: "Jefaturas activas",
                value: "Sin datos",
                footer: "",
                note: "",
                showFooter: false,
                showNote: false,
                icon: "sap-icon://group",
                tone: "blue"
            },
            {
                title: "Recursos totales",
                value: "Sin datos",
                footer: "",
                note: "",
                showFooter: false,
                showNote: false,
                icon: "sap-icon://employee",
                tone: "cyan"
            },
            {
                title: "Capacidad disponible",
                value: "Sin datos",
                footer: "",
                note: "",
                showFooter: false,
                showNote: false,
                icon: "sap-icon://performance",
                tone: "green"
            },
            {
                title: "Carga programada",
                value: "Sin datos",
                footer: "",
                note: "",
                showFooter: false,
                showNote: false,
                icon: "sap-icon://calendar",
                tone: "orange"
            },
            {
                title: "Recursos sobre capacidad",
                value: "Sin datos",
                footer: "",
                note: "",
                showFooter: false,
                showNote: false,
                icon: "sap-icon://alert",
                tone: "red"
            },
            {
                title: "Cumplimiento operativo",
                value: "Sin datos",
                footer: "",
                note: "",
                showFooter: false,
                showNote: false,
                icon: "sap-icon://performance",
                tone: "danger"
            }
        ];
    }

    function mapData(rawData, filterData) {
        var raw = rawData || {};
        var filters = Object.assign({
            periodo: "2026",
            fechaDesde: "01/01/2026",
            fechaHasta: "31/12/2026",
            direccion: "TODAS",
            jefatura: "TODAS",
            turno: "TODOS"
        }, filterData || {});

        var start = parseInputDate(filters.fechaDesde);
        var end = parseInputDate(filters.fechaHasta);

        var resourcesPeriod = (raw.resources || [])
            .filter(function (r) {
                return inRange(
                    r.WorkDate,
                    start,
                    end
                );
            });

        var catalogs = buildCatalogs(
            raw,
            resourcesPeriod
        );

        /*
         * No se inventa Dirección/Jefatura desde Zona/Base.
         * Si Dirección/Jefatura/Turno están en Todos, se aprovecha
         * ResourceDaily aunque ABAP aún no haya llenado la jerarquía.
         */
        var organizedRows = resourcesPeriod.filter(
            function (r) {
                return r.DirectionId || r.DirectionName;
            }
        );

        var organizationFilterApplied =
            !isAll(filters.direccion) ||
            !isAll(filters.jefatura) ||
            !isAll(filters.turno);

        var rows = resourcesPeriod.filter(function (r) {
            var directionOk =
                isAll(filters.direccion) ||
                matches(
                    filters.direccion,
                    [r.DirectionId, r.DirectionName]
                );

            var headshipOk =
                isAll(filters.jefatura) ||
                matches(
                    filters.jefatura,
                    [r.HeadshipId, r.HeadshipName]
                );

            var shiftOk =
                isAll(filters.turno) ||
                matches(
                    filters.turno,
                    [r.ShiftId, r.ShiftName]
                );

            return directionOk && headshipOk && shiftOk;
        });

        var resources = Object.create(null);

        rows.forEach(function (r) {
            var id = String(r.ResourceId || "");
            var info;

            if (!id) {
                return;
            }

            if (!resources[id]) {
                resources[id] = {
                    id: id,
                    directionId: r.DirectionId || "",
                    directionName:
                        r.DirectionName ||
                        r.DirectionId ||
                        "",
                    headshipId: r.HeadshipId || "",
                    headshipName:
                        r.HeadshipName ||
                        r.HeadshipId ||
                        "",
                    supervisors: Object.create(null),
                    capacity: 0,
                    capacityValid: false,
                    load: 0,
                    statusKnown: false,
                    active: false
                };
            }

            info = resources[id];

            if (r.SupervisorId || r.SupervisorName) {
                info.supervisors[
                    String(
                        r.SupervisorId ||
                        r.SupervisorName
                    )
                ] = true;
            }

            if (isTrue(r.CapacitySourceValidated)) {
                info.capacityValid = true;
                info.capacity += Number(r.CapacityHours || 0);
            }

            if (r.AvailabilityStatusCode) {
                info.statusKnown = true;
                info.active =
                    norm(r.AvailabilityStatusCode) !==
                    "INACTIVE";
            }
        });

        var resourceIds = Object.keys(resources);
        var selectedResources = Object.create(null);

        resourceIds.forEach(function (id) {
            selectedResources[id] = true;
        });

        var assignments =
            buildAssignmentMaps(
                raw.orderResources || []
            );

        var orderMap =
            buildOrderMap(
                raw.orders || []
            );

        var headships = Object.create(null);

        function ensureHeadship(info) {
            var key = String(
                info.headshipId ||
                info.headshipName ||
                ""
            );

            if (!key) {
                return null;
            }

            if (!headships[key]) {
                headships[key] = {
                    id: key,
                    name:
                        info.headshipName ||
                        key,
                    resources: Object.create(null),
                    supervisors: Object.create(null),
                    capacity: 0,
                    capacityValid: false,
                    load: 0
                };
            }

            return headships[key];
        }

        resourceIds.forEach(function (id) {
            var info = resources[id];
            var h = ensureHeadship(info);

            if (!h) {
                return;
            }

            h.resources[id] = true;

            Object.keys(info.supervisors)
                .forEach(function (supervisorId) {
                    h.supervisors[supervisorId] = true;
                });

            if (info.capacityValid) {
                h.capacityValid = true;
                h.capacity += info.capacity;
            }
        });

        var operations = uniqueBy(
            (raw.operations || [])
                .filter(planOperationAllowed),
            function (op) {
                return op.OperationKey || [
                    op.OrderId,
                    op.RoutingNumber,
                    op.OperationCounter
                ].join("|");
            }
        );

        var totalLoad = 0;
        var scopedOrders = Object.create(null);
        var serviceLoad = Object.create(null);

        if (!organizationFilterApplied) {
            (raw.orders || []).forEach(function (order) {
                if (order.OrderId) {
                    scopedOrders[order.OrderId] = true;
                }
            });
        }

        operations.forEach(function (op) {
            var hours = toHours(
                op.PlannedValueOriginal,
                op.PlannedUnitOriginal
            );

            var ids;

            if (!Number.isFinite(hours)) {
                return;
            }

            ids = uniqueStrings(
                assignmentsForOperation(
                    op,
                    assignments
                )
                    .map(function (a) {
                        return String(
                            a.ResourceId ||
                            ""
                        );
                    })
                    .filter(function (id) {
                        return Boolean(
                            selectedResources[id]
                        );
                    })
            );

            if (organizationFilterApplied) {
                if (!ids.length) {
                    return;
                }
            } else if (!scopedOrders[op.OrderId]) {
                return;
            }

            /*
             * La carga ejecutiva cuenta la operación una sola vez.
             */
            totalLoad += hours;
            scopedOrders[op.OrderId] = true;

            /*
             * La distribución por recurso sólo se hace cuando
             * existe la relación con ResourceDaily.
             */
            if (ids.length) {
                var share = hours / ids.length;

                ids.forEach(function (id) {
                    var info = resources[id];
                    var h;

                    if (!info) {
                        return;
                    }

                    h = ensureHeadship(info);
                    info.load += share;

                    if (h) {
                        h.load += share;
                    }
                });
            }

            var order = orderMap[op.OrderId];
            var service = order
                ? (
                    order.OrderTypeText ||
                    order.OrderTypeCode ||
                    "Sin datos"
                )
                : "Sin datos";

            serviceLoad[service] =
                (serviceLoad[service] || 0) +
                hours;
        });

        /*
         * También se considera la relación OT-recurso
         * para delimitar cumplimiento aunque una OT no tenga operación.
         */
        if (organizationFilterApplied) {
            (raw.orderResources || [])
                .forEach(function (a) {
                    if (
                        selectedResources[
                            String(a.ResourceId || "")
                        ] &&
                        a.OrderId
                    ) {
                        scopedOrders[a.OrderId] = true;
                    }
                });
        }

        var thresholds =
            getThresholds(
                raw.catalogs || []
            );

        var jefaturas =
            Object.keys(headships)
                .map(function (key) {
                    var h = headships[key];

                    var utilization =
                        h.capacityValid &&
                        h.capacity > 0
                            ? (
                                h.load /
                                h.capacity
                            ) * 100
                            : null;

                    var cls =
                        classifyUtilization(
                            utilization,
                            thresholds
                        );

                    var supervisorCount =
                        Object.keys(
                            h.supervisors
                        ).length;

                    var resourceCount =
                        Object.keys(
                            h.resources
                        ).length;

                    return {
                        id: h.id,
                        name: h.name,
                        utilization:
                            formatPct(
                                utilization
                            ),
                        utilizationValue:
                            utilization,
                        resourceText:
                            supervisorCount > 0
                                ? supervisorCount +
                                    (
                                        supervisorCount === 1
                                            ? " supervisor"
                                            : " supervisores"
                                    )
                                : resourceCount +
                                    (
                                        resourceCount === 1
                                            ? " recurso"
                                            : " recursos"
                                    ),
                        tone: cls.tone,
                        riskCode: cls.code
                    };
                })
                .sort(function (a, b) {
                    return (
                        (
                            Number.isFinite(
                                b.utilizationValue
                            )
                                ? b.utilizationValue
                                : -1
                        ) -
                        (
                            Number.isFinite(
                                a.utilizationValue
                            )
                                ? a.utilizationValue
                                : -1
                        )
                    );
                });

        var riskCounts = {
            CRITICAL: 0,
            HIGH: 0,
            NORMAL: 0,
            LOW: 0
        };

        jefaturas.forEach(function (h) {
            if (
                Object.prototype.hasOwnProperty.call(
                    riskCounts,
                    h.riskCode
                )
            ) {
                riskCounts[h.riskCode] += 1;
            }
        });

        var riskLevels = [
            {
                label: "Crítico",
                range:
                    "> " +
                    formatNumber(
                        thresholds.highMax,
                        0
                    ) +
                    "%",
                count: String(riskCounts.CRITICAL),
                icon: "sap-icon://trend-up",
                tone: "red"
            },
            {
                label: "Alto",
                range:
                    formatNumber(
                        thresholds.normalMax + 1,
                        0
                    ) +
                    "% - " +
                    formatNumber(
                        thresholds.highMax,
                        0
                    ) +
                    "%",
                count: String(riskCounts.HIGH),
                icon: "sap-icon://trend-up",
                tone: "orange"
            },
            {
                label: "Normal",
                range:
                    formatNumber(
                        thresholds.lowMax + 1,
                        0
                    ) +
                    "% - " +
                    formatNumber(
                        thresholds.normalMax,
                        0
                    ) +
                    "%",
                count: String(riskCounts.NORMAL),
                icon: "sap-icon://status-critical",
                tone: "yellow"
            },
            {
                label: "Bajo",
                range:
                    "0% - " +
                    formatNumber(
                        thresholds.lowMax,
                        0
                    ) +
                    "%",
                count: String(riskCounts.LOW),
                icon: "sap-icon://status-positive",
                tone: "green"
            }
        ];

        var hierarchyAvailable =
            organizedRows.length > 0;

        var availabilityAvailable =
            rows.some(function (r) {
                return Boolean(
                    r.AvailabilityStatusCode
                );
            });

        var capacityAvailable =
            rows.some(function (r) {
                return isTrue(
                    r.CapacitySourceValidated
                );
            });

        var assignmentsAvailable =
            (raw.orderResources || []).length > 0;

        var operationsAvailable =
            operations.length > 0;

        var totalCapacity =
            resourceIds.reduce(
                function (sum, id) {
                    return sum +
                        (
                            resources[id].capacityValid
                                ? resources[id].capacity
                                : 0
                        );
                },
                0
            );

        var overCapacity =
            capacityAvailable &&
            assignmentsAvailable &&
            operationsAvailable
                ? resourceIds.filter(
                    function (id) {
                        var r = resources[id];

                        return r.capacityValid &&
                            r.capacity > 0 &&
                            r.load > r.capacity;
                    }
                ).length
                : null;

        var activeHeadships =
            availabilityAvailable
                ? Object.keys(headships)
                    .filter(function (headshipId) {
                        return Object.keys(
                            headships[headshipId].resources
                        ).some(function (resourceId) {
                            return resources[resourceId].active;
                        });
                    }).length
                : null;

        var scopeOrders =
            Object.keys(scopedOrders)
                .map(function (id) {
                    return orderMap[id];
                })
                .filter(Boolean);

        var executedCodes =
            getExecutedCodes(
                raw.catalogs || []
            );

        var statusAvailable =
            scopeOrders.some(function (order) {
                return order.AppStatusCode ||
                    order.SapUserStatusCode ||
                    order.StatusText;
            });

        var compliance =
            scopeOrders.length > 0 &&
            statusAvailable
                ? (
                    scopeOrders.filter(
                        function (order) {
                            return isExecuted(
                                order,
                                executedCodes
                            );
                        }
                    ).length /
                    scopeOrders.length
                ) * 100
                : null;

        var complianceTarget =
            getComplianceTarget(
                raw.catalogs || [],
                filters.direccion
            );

        var difference =
            Number.isFinite(compliance)
                ? compliance - complianceTarget
                : null;

        var kpis = emptyKpis();

        kpis[0].value =
            Number.isFinite(activeHeadships)
                ? String(activeHeadships)
                : "Sin datos";

        kpis[0].footer =
            hierarchyAvailable
                ? "de " +
                    Object.keys(headships).length
                : "";

        kpis[0].showFooter =
            Boolean(kpis[0].footer);

        kpis[1].value =
            resourceIds.length > 0
                ? String(resourceIds.length)
                : "Sin datos";

        kpis[2].value =
            capacityAvailable
                ? formatHours(totalCapacity)
                : "Sin datos";

        kpis[3].value =
            totalLoad > 0
                ? formatHours(totalLoad)
                : "Sin datos";

        kpis[4].value =
            Number.isFinite(overCapacity)
                ? String(overCapacity)
                : "Sin datos";

        kpis[5].value =
            formatPct(compliance);

        kpis[5].footer =
            "Meta: " +
            formatNumber(
                complianceTarget,
                0
            ) +
            "%";

        kpis[5].showFooter =
            Number.isFinite(compliance);

        if (Number.isFinite(difference)) {
            kpis[5].note =
                difference < 0
                    ? formatNumber(
                        Math.abs(difference),
                        1
                    ) +
                    " puntos por debajo de la meta"
                    : difference > 0
                        ? formatNumber(
                            difference,
                            1
                        ) +
                        " puntos sobre la meta"
                        : "En la meta";

            kpis[5].showNote = true;
        }

        var serviceStyles = [
            {
                tone: "blue",
                icon: "sap-icon://document-text"
            },
            {
                tone: "red",
                icon: "sap-icon://wrench"
            },
            {
                tone: "purple",
                icon: "sap-icon://customer-and-contacts"
            }
        ];

        var serviceTypes =
            Object.keys(serviceLoad)
                .map(function (name) {
                    return {
                        label: name,
                        raw: serviceLoad[name],
                        pct:
                            totalLoad > 0
                                ? (
                                    serviceLoad[name] /
                                    totalLoad
                                ) * 100
                                : null
                    };
                })
                .sort(function (a, b) {
                    return b.raw - a.raw;
                })
                .slice(0, 3)
                .map(function (x, index) {
                    return {
                        label: x.label,
                        percent: formatPct(x.pct),
                        hours: formatHours(x.raw),
                        icon: serviceStyles[index].icon,
                        tone: serviceStyles[index].tone
                    };
                });

        while (serviceTypes.length < 3) {
            var si = serviceTypes.length;

            serviceTypes.push({
                label: "Sin datos",
                percent: "Sin datos",
                hours: "Sin datos",
                icon: serviceStyles[si].icon,
                tone: serviceStyles[si].tone
            });
        }

        /*
         * Materiales:
         * consumo neto = CONSUMPTION - RETURN,
         * excluyendo reversas y agrupando por categoría.
         */
        var materialByRequirement =
            Object.create(null);

        (raw.materials || []).forEach(
            function (material) {
                if (material.MaterialRequirementId) {
                    materialByRequirement[
                        material.MaterialRequirementId
                    ] = material;
                }
            }
        );

        var categoryConsumption =
            Object.create(null);

        (raw.materialMovements || [])
            .forEach(function (movement) {
                var material =
                    materialByRequirement[
                        movement.MaterialRequirementId
                    ];

                var qty =
                    Number(
                        movement.MovementQuantity
                    );

                var direction =
                    norm(
                        movement.MovementDirectionCode
                    );

                var signedQty;
                var category;

                if (
                    !material ||
                    isTrue(movement.IsReversal) ||
                    !Number.isFinite(qty) ||
                    !inRange(
                        movement.MovementDate,
                        start,
                        end
                    ) ||
                    !scopedOrders[
                        material.OrderId
                    ]
                ) {
                    return;
                }

                if (direction === "CONSUMPTION") {
                    signedQty = qty;
                } else if (direction === "RETURN") {
                    signedQty = -qty;
                } else {
                    return;
                }

                category =
                    material.MaterialCategoryName ||
                    material.MaterialCategoryCode ||
                    "Sin categoría";

                categoryConsumption[category] =
                    (
                        categoryConsumption[category] ||
                        0
                    ) +
                    signedQty;
            });

        var totalConsumption =
            Object.keys(categoryConsumption)
                .reduce(function (sum, category) {
                    return sum +
                        Math.max(
                            0,
                            categoryConsumption[category]
                        );
                }, 0);

        var materialStyles = [
            {
                icon: "sap-icon://drop",
                tone: "orange"
            },
            {
                icon: "sap-icon://wrench",
                tone: "cyan"
            },
            {
                icon: "sap-icon://product",
                tone: "purple"
            }
        ];

        var materials =
            Object.keys(categoryConsumption)
                .map(function (category) {
                    var net = Math.max(
                        0,
                        categoryConsumption[category]
                    );

                    var pct =
                        totalConsumption > 0
                            ? (
                                net /
                                totalConsumption
                            ) * 100
                            : null;

                    return {
                        name: category,
                        raw: net,
                        pct: pct
                    };
                })
                .filter(function (x) {
                    return x.raw > 0;
                })
                .sort(function (a, b) {
                    return b.raw - a.raw;
                })
                .slice(0, 3)
                .map(function (x, index) {
                    return {
                        name: x.name,
                        percent: formatPct(x.pct),
                        barWidth:
                            Number.isFinite(x.pct)
                                ? Math.min(
                                    100,
                                    x.pct
                                ) + "%"
                                : "0%",
                        icon: materialStyles[index].icon,
                        tone: materialStyles[index].tone
                    };
                });

        while (materials.length < 3) {
            var mi = materials.length;

            materials.push({
                name: "Sin datos",
                percent: "Sin datos",
                barWidth: "0%",
                icon: materialStyles[mi].icon,
                tone: materialStyles[mi].tone
            });
        }

        catalogs.headships =
            catalogs.headshipsAll.filter(
                function (item, index) {
                    if (index === 0) {
                        return true;
                    }

                    if (isAll(filters.direccion)) {
                        return true;
                    }

                    return !item.parentKey ||
                        matches(
                            filters.direccion,
                            [item.parentKey]
                        );
                }
            );

        console.log(
            "[VD MAPPER] Resultado:",
            {
                periodo:
                    filters.periodo,
                fechaDesde:
                    filters.fechaDesde,
                fechaHasta:
                    filters.fechaHasta,
                resourcesPeriod:
                    resourcesPeriod.length,
                resourcesWithDirection:
                    organizedRows.length,
                filteredResources:
                    resourceIds.length,
                headships:
                    jefaturas.length,
                scopeOrders:
                    scopeOrders.length,
                operations:
                    operations.length,
                totalLoad:
                    totalLoad,
                totalCapacity:
                    totalCapacity
            }
        );

        return {
            catalogs: catalogs,
            kpis: kpis,
            riskLevels: riskLevels,
            jefaturas: jefaturas,
            serviceTypes: serviceTypes,
            serviceTotalHours:
                totalLoad > 0
                    ? formatHours(totalLoad)
                    : "Sin datos",
            materials: materials,
            meta: {
                hierarchyAvailable:
                    hierarchyAvailable,
                availabilityAvailable:
                    availabilityAvailable,
                capacityAvailable:
                    capacityAvailable,
                assignmentsAvailable:
                    assignmentsAvailable,
                operationsAvailable:
                    operationsAvailable,
                statusAvailable:
                    statusAvailable,
                complianceTarget:
                    complianceTarget
            }
        };
    }

    return {
        mapData: mapData,
        toHours: toHours
    };
});