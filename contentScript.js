var iframeDomain = 'http://localhost:9000/';
var animationDuration = 200;


window.addEventListener("selection_start", function(e){
	console.log(e.detail);
	if (e.detail.selection) {
		Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
			el.addEventListener('mouseenter', sendHighlightElQuery);
			el.addEventListener('mouseleave', sendHighlightParentQuery);
			el.addEventListener('click', sendChooseElQuery);
		});
	} else {
		Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
			el.removeEventListener('mouseenter', sendHighlightElQuery);
			el.removeEventListener('mouseleave', sendHighlightParentQuery);
			el.removeEventListener('click', sendChooseElQuery);
		});
		if (self.elementHighlighted) {
			// envoyer un message
			self.elementHighlighted.style.outline = 'none';
			self.elementHighlighted = undefined;
		}
	}
});

/* communication functions - sent to the popup */

function sendHighlightElQuery() {
	// console.log('must send an query for highlightEl function');
}
function sendHighlightParentQuery() {
	// console.log('must send an query for highlightParent function');
}
function sendChooseElQuery() {
	var port = chrome.extension.connect({name: "Popup Communication"});
  port.postMessage("Hi popup");
	// forcer ouverture popup ?
	// console.log('must send an query for chooseEl function');
}
