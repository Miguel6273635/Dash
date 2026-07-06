/*global QUnit*/

sap.ui.define([
	"mantenimiento/controller/Mantenimiento.controller"
], function (Controller) {
	"use strict";

	QUnit.module("Mantenimiento Controller");

	QUnit.test("I should test the Mantenimiento controller", function (assert) {
		var oAppController = new Controller();
		oAppController.onInit();
		assert.ok(oAppController);
	});

});
