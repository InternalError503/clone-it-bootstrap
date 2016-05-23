/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

const {interfaces: Ci, utils: Cu, classes: Cc} = Components;
const BUTTON_ID_TAB = "toolbar_F29AA_cloneNewTab"; //Button ID for widget
const BUTTON_ID_WINDOW = "toolbar_F29AA_cloneNewWindow"; //Button ID for widget

var CustomizableUI = null;
var {Services} = Cu.import("resource://gre/modules/Services.jsm", {});

var sss = null;
var styleSheetUri = null;

function install() { }
function uninstall() { }

var CUIWidgetListener = {
	//Remove WidgetListener when widget destroyed
	onWidgetDestroyed: function (aWidgetId) {
		if (aWidgetId != BUTTON_ID_TAB || aWidgetId != BUTTON_ID_WINDOW) {
			return;
		}
		CustomizableUI.removeListener(CUIWidgetListener);
	}
};

var initStyle = {
	//Load styleSheet
	init: function () {
		try {
			sss = Cc["@mozilla.org/content/style-sheet-service;1"].getService(Ci.nsIStyleSheetService);
			styleSheetUri = Services.io.newURI('chrome://clone-it/skin/cloneStyle.css', null, null);

			// Register global so it works in all windows, including palette
			if (!sss.sheetRegistered(styleSheetUri, sss.AUTHOR_SHEET)) {
				sss.loadAndRegisterSheet(styleSheetUri, sss.AUTHOR_SHEET);
			}
		} catch (e) { }
	},
	//Unload styleSheet
	uninit: function () {
		try {
			if (sss === null) {
				return;
			}
			if (sss.sheetRegistered(styleSheetUri, sss.AUTHOR_SHEET)) {
				sss.unregisterSheet(styleSheetUri, sss.AUTHOR_SHEET);
			}
			sss = null;
			styleSheetUri = null;
		} catch (e) { }
	}
};

function CloneCurrent(type) {
	try {
		var currentWindow = Cc['@mozilla.org/appshell/window-mediator;1']
			.getService(Ci.nsIWindowMediator).getMostRecentWindow('navigator:browser');
		var uri = currentWindow.getBrowser().currentURI.spec;
		//We don't want to copy about uri's
		var blacklist = /^about:(accounts|addons|app-manager|blank|buildconfig|cache|config|customizing|downloads|home|newtab|license|logo|memory|networking|newaddon|permissions|plugins|preferences|privatebrowsing|rights|sessionrestore|support|serviceworkers|welcomeback)/i;

		if (!blacklist.test(uri)) {
			Services.wm.getEnumerator("navigator:browser").getNext().gBrowser.selectedTab = currentWindow.openUILinkIn(uri, type, { relatedToCurrent: true });
		}
	} catch (e) { }
}

function startup(data) {
	//Test for CustomizableUI support to allow running on firefox 24 and up.
	try {
		CustomizableUI = Cu.import("resource:///modules/CustomizableUI.jsm", null).CustomizableUI;
	} catch (e) { CustomizableUI = null; }

	if (CustomizableUI !== null) {
		//Add localization strings
		var STRINGS = Services.strings.createBundle("chrome://clone-it/locale/strings.locale");

		//Add CustomizableUI widget listener
		CustomizableUI.addListener(CUIWidgetListener);
		CustomizableUI.createWidget({
			id: BUTTON_ID_TAB,
			defaultArea: CustomizableUI.AREA_NAVBAR,
			label: STRINGS.GetStringFromName("clonecurrenttab.label"),
			tooltiptext: STRINGS.GetStringFromName("clonecurrenttab.label"),
			onCommand: function (aEvent) {
				CloneCurrent('tab');
			}
		});
		CustomizableUI.createWidget({
			id: BUTTON_ID_WINDOW,
			defaultArea: CustomizableUI.AREA_NAVBAR,
			label: STRINGS.GetStringFromName("clonecurrentwindow.label"),
			tooltiptext: STRINGS.GetStringFromName("clonecurrentwindow.label"),
			onCommand: function (aEvent) {
				CloneCurrent('window');
			}
		});

		//Load styleSheet
		initStyle.init();
	} else {
		throw new Error("CustomizableUI not available in this browser version.");
	}
}

function shutdown(reason) {
	if (reason === APP_SHUTDOWN) {
		// No need to cleanup; stuff will vanish anyway
		return;
	}
	if (CustomizableUI !== null) {
		//Destroy toolbar button on shutdown
		CustomizableUI.destroyWidget(BUTTON_ID_TAB);
		CustomizableUI.destroyWidget(BUTTON_ID_WINDOW);
		//Unload styleSheet
		initStyle.uninit();
	}
}