sap.ui.define([
    "sap/ui/core/UIComponent",
    "mantenimiento/model/models",
    "mantenimiento/util/DashboardNavigation"
], (UIComponent, models,DashboardNavigation) => {
    "use strict";

    return UIComponent.extend("mantenimiento.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

        this._dashboardNavigation =
        DashboardNavigation.create(this);


            // enable routing
            this.getRouter().initialize();
        }
    });
});