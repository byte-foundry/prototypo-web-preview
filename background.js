var activationList = {
};

chrome.browserAction.setIcon({ path: 'p-menu.svg' });

chrome.browserAction.onClicked.addListener(function(e) {

	chrome.tabs.sendMessage(e.id, {activate: true}, function(response) {
		if (response) {
			chrome.browserAction.setIcon({
				path: 'p-menu' + response.iconState + '.svg',
			});

			if (response.isActive) {
				activationList[e.id] = true;
			}
			else {
				activationList[e.id] = false;
			}
		}
	});

	// adding a popup
	chrome.browserAction.setPopup({popup: "popup/popup.html"});
});

chrome.tabs.onActivated.addListener(function(tab) {
	if (activationList[tab.tabId]) {
		chrome.browserAction.setIcon({
			path: 'p-menu-hover-active.svg',
		});
	}
	else {
		chrome.browserAction.setIcon({
			path: 'p-menu.svg',
		});
	}
});
