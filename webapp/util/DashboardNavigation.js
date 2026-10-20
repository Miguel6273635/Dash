sap.ui.define([
    "mantenimiento/model/DashboardNavigationMap",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (NavigationMap, JSONModel, MessageToast) {
    "use strict";

    var INTERACTIVE = "button, a, input, select, textarea, [contenteditable='true'], " +
        "[role='button'], [role='link'], [role='combobox'], .sapMBtn, .sapMLnk, .sapMLIBActive";
    var FILTER_MODELS = [
        "cumplimientoModel", "mantenimientoModel", "dashboard", "data", "trend",
        "fallasModel", "horasModel", "materialesModel", "crpc"
    ];

    function matches(control, rule) {
        var dom = control.getDomRef && control.getDomRef();
        var text = control.getText ? control.getText() : "";

        if (!dom || !dom.matches(rule.selector) || (control.getEnabled && !control.getEnabled())) {
            return false;
        }
        if (rule.text !== undefined && text !== rule.text) { return false; }
        if (rule.textPrefix && text.indexOf(rule.textPrefix) !== 0) { return false; }
        return !rule.data || Object.keys(rule.data).every(function (key) {
            return control.data(key) === rule.data[key];
        });
    }

    function copy(value) {
        return value && typeof value === "object" ? JSON.parse(JSON.stringify(value)) : value;
    }

    function readFilters(view) {
        var result = null;

        FILTER_MODELS.some(function (name) {
            var model = view.getModel(name);
            var value = model && (model.getProperty("/filters") || model.getProperty("/filtros"));

            if (!value || typeof value !== "object") { return false; }
            result = copy(value);
            return true;
        });
        return result;
    }

    function Manager(component) {
        this.component = component;
        this.views = new Map();
        this.targets = component.getRouter().getTargets();
        this.onDisplay = function (event) { this.connectView(event.getParameter("view")); }.bind(this);
        this.targets.attachDisplay(this.onDisplay);
    }

    Manager.prototype.connectView = function (view) {
        var name = view && view.getViewName().split(".").pop();
        var rules = NavigationMap.views[name];
        var state;

        if (!rules || !rules.length || this.views.has(view)) { return; }
        state = { view: view, controller: view.getController(), rules: rules, entries: new Map() };
        state.delegate = {
            onAfterRendering: function () { this._scan(state); }.bind(this)
        };
        view.addEventDelegate(state.delegate);
        this.views.set(view, state);
        this._scan(state);
    };

    Manager.prototype._scan = function (state) {
        var controls = state.view.findAggregatedObjects(true, function (control) {
            return !!(control.isA && control.isA("sap.ui.core.Control") && control.getDomRef && control.getDomRef());
        });

        controls.forEach(function (control) {
            var rule = state.rules.find(function (candidate) { return matches(control, candidate); });
            var current = state.entries.get(control);

            if (current && current.rule !== rule) {
                this._unbind(current);
                state.entries.delete(control);
                current = null;
            }
            if (!rule || current) { return; }
            current = this._bind(state, control, rule);
            if (current) {
                state.entries.set(control, current);
                this._setAccessibility(current);
            }
        }.bind(this));
    };

    Manager.prototype._bind = function (state, control, rule) {
        var entry = { control: control, rule: rule, state: state };

        if (rule.event === "press") {
            if (!control.attachPress) { return null; }
            entry.original = state.controller[rule.replace];
            if (typeof entry.original === "function") { control.detachPress(entry.original, state.controller); }
            entry.press = function (event) { this._execute(entry, event); }.bind(this);
            control.attachPress(entry.press);
        } else {
            entry.click = function (event) {
                var dom = control.getDomRef();
                var interactive = event.target.closest && event.target.closest(INTERACTIVE);

                if (interactive && interactive !== dom) { return; }
                event.stopPropagation();
                this._execute(entry);
            }.bind(this);
            entry.keydown = function (event) {
                if (event.target !== control.getDomRef() || (event.key !== "Enter" && event.key !== " ")) { return; }
                event.preventDefault();
                event.stopPropagation();
                this._execute(entry);
            }.bind(this);
            control.attachBrowserEvent("click", entry.click);
            control.attachBrowserEvent("keydown", entry.keydown);
        }
        return entry;
    };

    Manager.prototype._setAccessibility = function (entry) {
        var dom = entry.control.getDomRef();

        if (!dom || entry.rule.event === "press") { return; }
        entry.dom = dom;
        entry.attributes = ["role", "tabindex", "aria-label"].map(function (name) {
            return { name: name, value: dom.getAttribute(name) };
        });
        dom.setAttribute("role", "button");
        dom.setAttribute("tabindex", "0");
        dom.setAttribute("aria-label", entry.rule.label);
    };

    Manager.prototype._saveContext = function (entry) {
        var filters = readFilters(entry.state.view);

        if (!filters) { return; }
        this.component.setModel(new JSONModel({
            sourceView: entry.state.view.getViewName().split(".").pop(),
            targetRoute: entry.rule.route,
            filters: filters
        }), "dashboardNavigationContext");
    };

    Manager.prototype._execute = function (entry, event) {
        var rule = entry.rule;
        var controller = entry.state.controller;
        var router = this.component.getRouter();
        var parameters = {};

        if (rule.call) {
            if (typeof controller[rule.call] === "function") {
                controller[rule.call](event || { getSource: function () { return entry.control; } });
            }
            return;
        }
        if (!router.getRoute(rule.route)) {
            MessageToast.show("La pantalla de destino no está registrada.");
            return;
        }
        Object.keys(rule.parameters || {}).forEach(function (name) {
            var parameter = rule.parameters[name];
            var context = entry.control.getBindingContext(parameter.model);
            var value = context && context.getProperty(parameter.property);

            if (value !== undefined && value !== null) { parameters[name] = String(value); }
        });
        this._saveContext(entry);
        router.navTo(rule.route, parameters);
    };

    Manager.prototype._unbind = function (entry) {
        if (entry.press) {
            entry.control.detachPress(entry.press);
            if (typeof entry.original === "function") { entry.control.attachPress(entry.original, entry.state.controller); }
            return;
        }
        entry.control.detachBrowserEvent("click", entry.click);
        entry.control.detachBrowserEvent("keydown", entry.keydown);
        (entry.attributes || []).forEach(function (attribute) {
            if (attribute.value === null) { entry.dom.removeAttribute(attribute.name); }
            else { entry.dom.setAttribute(attribute.name, attribute.value); }
        });
    };

    Manager.prototype.destroy = function () {
        this.targets.detachDisplay(this.onDisplay);
        this.views.forEach(function (state) {
            state.view.removeEventDelegate(state.delegate);
            state.entries.forEach(this._unbind.bind(this));
        }.bind(this));
        this.views.clear();
    };

    return {
        create: function (component) { return new Manager(component); },
        matches: matches,
        readFilters: readFilters
    };
});
