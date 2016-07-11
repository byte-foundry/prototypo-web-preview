// set the badge background color
chrome.browserAction.setBadgeBackgroundColor({ color: "#23d390" });

// listening to messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.action) {
		// update badge count
		case "update_badge_count":
			updateBadgeCount(sender.tab.id);
			break;
		default:
			sendResponse("default response from background (unrecognized request action)");
	}
});

chrome.runtime.onConnect.addListener(function(port) {
	port.onDisconnect.addListener(function(disconnectedPort) {
		if (disconnectedPort) {
			if (disconnectedPort.name === "popupConnection") {
				chrome.browserAction.setIcon({
					path: 'p-menu.svg',
				});
			}
		}
	});
});

/**
* Update badge count
*/
function updateBadgeCount(tabId) {
	// set the number of the current tab's badge
	chrome.storage.local.get('selectedElements', function(data) {
		if (data) {
			if (data.selectedElements) {
				if (data.selectedElements.length > 0) {
					chrome.browserAction.setBadgeText({ text: (data.selectedElements.length).toString(), tabId: tabId });
				} else {
					chrome.browserAction.setBadgeText({ text: '', tabId: tabId });
				}
			}
		}
	});
}
