sap.ui.define([
    "mantenimiento/model/DashboardNavigationMap",
    "sap/m/MessageToast"
], function (NavigationMap, MessageToast) {
    "use strict";

    var INTERACTIVE = "button, a, input, select, textarea, [contenteditable='true'], " +
        "[role='button'], [role='link'], [role='combobox'], .sapMBtn, .sapMLnk, .sapMLIBActive";

    function matches(oControl, oRule) {
        var oDom = oControl.getDomRef && oControl.getDomRef();
        var sText = oControl.getText ? oControl.getText() : "";

        if (!oDom || !oDom.matches(oRule.selector) ||
            (oControl.getEnabled && !oControl.getEnabled())) {
            return false;
        }
        if (oRule.text !== undefined && sText !== oRule.text) {
            return false;
        }
        if (oRule.textPrefix && sText.indexOf(oRule.textPrefix) !== 0) {
            return false;
        }
        return !oRule.data || Object.keys(oRule.data).every(function (sKey) {
            return oControl.data(sKey) === oRule.data[sKey];
        });
    }

    function Manager(oComponent) {
        this.component = oComponent;
        this.views = new Map();
        this.targets = oComponent.getRouter().getTargets();
        this.onDisplay = function (oEvent) {
            this.connectView(oEvent.getParameter("view"));
        }.bind(this);
        this.targets.attachDisplay(this.onDisplay);
    }

    Manager.prototype.connectView = function (oView) {
        var sName = oView && oView.getViewName().split(".").pop();
        var aRules = NavigationMap.views[sName];
        var oState;

        if (!aRules || !aRules.length || this.views.has(oView)) {
            return;
        }
        oState = {
            view: oView,
            controller: oView.getController(),
            rules: aRules,
            entries: new Map(),
            observer: null,
            delegate: null
        };
        oState.delegate = {
            onBeforeRendering: function () {
                if (oState.observer) {
                    oState.observer.disconnect();
                }
            },
            onAfterRendering: function () {
                this._scan(oState);
                this._observe(oState);
            }.bind(this)
        };
        oView.addEventDelegate(oState.delegate);
        this.views.set(oView, oState);
        this._scan(oState);
        this._observe(oState);
    };

    Manager.prototype._observe = function (oState) {
        var oRoot = oState.view.getDomRef();

        if (!oRoot || typeof MutationObserver === "undefined") {
            return;
        }
        if (!oState.observer) {
            // Los agregados enlazados pueden crear nuevas cards al filtrar o
            // paginar sin volver a renderizar la vista completa.
            oState.observer = new MutationObserver(function () {
                this._scan(oState);
            }.bind(this));
        }
        oState.observer.disconnect();
        oState.observer.observe(oRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class", "data-tone"]
        });
    };

    Manager.prototype._scan = function (oState) {
        var aControls = oState.view.findAggregatedObjects(true, function (oControl) {
            return !!(oControl.isA && oControl.isA("sap.ui.core.Control") &&
                oControl.getDomRef && oControl.getDomRef());
        });
        var oPresent = new Set(aControls);

        oState.entries.forEach(function (oEntry, oControl) {
            if (!oPresent.has(oControl)) {
                this._unbind(oEntry);
                oState.entries.delete(oControl);
            }
        }.bind(this));

        aControls.forEach(function (oControl) {
            var oRule = oState.rules.find(function (oCandidate) {
                return matches(oControl, oCandidate);
            });
            var oEntry = oState.entries.get(oControl);

            if (oEntry && oEntry.rule !== oRule) {
                this._unbind(oEntry);
                oState.entries.delete(oControl);
                oEntry = null;
            }
            if (!oRule) {
                return;
            }
            if (!oEntry) {
                oEntry = this._bind(oState, oControl, oRule);
                if (!oEntry) {
                    return;
                }
                oState.entries.set(oControl, oEntry);
            }
            this._setAccessibility(oEntry);
        }.bind(this));
    };

    Manager.prototype._bind = function (oState, oControl, oRule) {
        var oEntry = { control: oControl, rule: oRule, state: oState };

        if (oRule.event === "press") {
            if (!oControl.attachPress) {
                return null;
            }
            oEntry.original = oState.controller[oRule.replace];
            if (typeof oEntry.original === "function") {
                oControl.detachPress(oEntry.original, oState.controller);
            }
            oEntry.press = function (oEvent) {
                this._execute(oEntry, oEvent);
            }.bind(this);
            oControl.attachPress(oEntry.press);
        } else {
            oEntry.click = function (oEvent) {
                var oDom = oControl.getDomRef();
                var oInteractive = oEvent.target.closest && oEvent.target.closest(INTERACTIVE);

                // Conserva filtros, enlaces, botones de información y controles
                // internos. Una card anidada gestiona su propio clic.
                if (oInteractive && oInteractive !== oDom) {
                    return;
                }
                oEvent.stopPropagation();
                this._execute(oEntry);
            }.bind(this);
            oEntry.keydown = function (oEvent) {
                if (oEvent.target !== oControl.getDomRef() ||
                    (oEvent.key !== "Enter" && oEvent.key !== " ")) {
                    return;
                }
                oEvent.preventDefault();
                oEvent.stopPropagation();
                this._execute(oEntry);
            }.bind(this);
            oControl.attachBrowserEvent("click", oEntry.click);
            oControl.attachBrowserEvent("keydown", oEntry.keydown);
        }
        return oEntry;
    };

    Manager.prototype._setAccessibility = function (oEntry) {
        var oDom = oEntry.control.getDomRef();

        if (!oDom || oEntry.rule.event === "press") {
            return;
        }
        if (oEntry.dom !== oDom) {
            oEntry.dom = oDom;
            oEntry.attributes = ["role", "tabindex", "aria-label"].map(function (sName) {
                return { name: sName, value: oDom.getAttribute(sName) };
            });
        }
        oDom.setAttribute("role", "button");
        oDom.setAttribute("tabindex", "0");
        oDom.setAttribute("aria-label", oEntry.rule.label);
    };

    Manager.prototype._execute = function (oEntry, oEvent) {
        var oRule = oEntry.rule;
        var oController = oEntry.state.controller;
        var oRouter = this.component.getRouter();
        var mParameters = {};

        if (oRule.call) {
            if (typeof oController[oRule.call] === "function") {
                oController[oRule.call](oEvent || {
                    getSource: function () { return oEntry.control; }
                });
            }
            return;
        }
        if (!oRouter.getRoute(oRule.route)) {
            MessageToast.show("La pantalla de destino no está registrada.");
            return;
        }
        Object.keys(oRule.parameters || {}).forEach(function (sName) {
            var oParameter = oRule.parameters[sName];
            var oContext = oEntry.control.getBindingContext(oParameter.model);
            var vValue = oContext && oContext.getProperty(oParameter.property);

            if (vValue !== undefined && vValue !== null) {
                mParameters[sName] = String(vValue);
            }
        });
        oRouter.navTo(oRule.route, mParameters);
    };

    Manager.prototype._unbind = function (oEntry) {
        var oControl = oEntry.control;

        if (oEntry.press) {
            oControl.detachPress(oEntry.press);
            if (typeof oEntry.original === "function") {
                oControl.attachPress(oEntry.original, oEntry.state.controller);
            }
        } else {
            oControl.detachBrowserEvent("click", oEntry.click);
            oControl.detachBrowserEvent("keydown", oEntry.keydown);
            (oEntry.attributes || []).forEach(function (oAttribute) {
                if (oAttribute.value === null) {
                    oEntry.dom.removeAttribute(oAttribute.name);
                } else {
                    oEntry.dom.setAttribute(oAttribute.name, oAttribute.value);
                }
            });
        }
    };

    Manager.prototype.disconnectView = function (oView) {
        var oState = this.views.get(oView);

        if (!oState) {
            return;
        }
        if (oState.observer) {
            oState.observer.disconnect();
        }
        oView.removeEventDelegate(oState.delegate);
        oState.entries.forEach(this._unbind.bind(this));
        oState.entries.clear();
        this.views.delete(oView);
    };

    Manager.prototype.destroy = function () {
        this.targets.detachDisplay(this.onDisplay);
        Array.from(this.views.keys()).forEach(this.disconnectView.bind(this));
    };

    return {
        create: function (oComponent) { return new Manager(oComponent); },
        matches: matches
    };
});