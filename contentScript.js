var iframeDomain = 'http://localhost:9000/';
var animationDuration = 200;
var iframe;
var error;
// available fonts from prototypo
var fonts;
// variable to store current selected font sent from popup
var selectedFont = "";

// clear previously stored values on page load
chrome.storage.local.clear();

// setting up the iframe containing protypo app
var extensionOrigin = 'chrome-extension://' + chrome.runtime.id;
if (!location.ancestorOrigins.contains(extensionOrigin)) {

	var iframe = document.createElement('iframe');
	// Must be declared at web_accessible_resources in manifest.json
	iframe.src = iframeDomain + 'iframe.html';

	// Some styles for a fancy sidebar
	iframe.style.cssText = 'position:fixed;top:0;left:0;display:block;' +
	'width:0px;height:0px;';
	document.body.appendChild(iframe);
}

//Here we send a message to the iframe to close the worker port
window.addEventListener('unload', function() {
	iframe.post({type: 'close'}, iframeDomain);
});


// on element selection start
window.addEventListener("selection_start", function(e) {
	// here we store the font that was selected in the popup
	selectedFont = e.detail.message.font;
	storeSelectedFont(selectedFont);

	if (e.detail.message.selection) {
		Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
			el.addEventListener('mouseenter', highlightEl);
			el.addEventListener('mouseleave', highlightParent);
			el.addEventListener('click', chooseEl);
		});
	} else {
		Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
			el.removeEventListener('mouseenter', highlightEl);
			el.removeEventListener('mouseleave', highlightParent);
			el.removeEventListener('click', chooseEl);
		});
		if (self.elementHighlighted) {
			// envoyer un message
			if (self.elementHighlighted.style) {
				self.elementHighlighted.style.outline = 'none';
			}
			self.elementHighlighted = undefined;
		}
	}
});

// on click on popup "apply" button
window.addEventListener("apply_style", function(e) {
	var selection = document.querySelectorAll(e.detail.message.selector);
	selectedFont = e.detail.message.selectedFont;

	// store relative data
	storeElement(e.detail.message.selector);
	storeSelectedFont(selectedFont);

	Array.prototype.forEach.call(selection, function(element) {
		chooseEl({target: element, currentTarget: element});
	});
});

// on keyup in popup selection input
window.addEventListener("select_elements", function(e) {
		var highlightedElements = document.querySelectorAll('.prototypo-selected');
		var elementsToHighlight = document.querySelectorAll(e.detail.message.selector);

		// un-highlight previously highlighted elements
		Array.prototype.forEach.call(highlightedElements, function(el) {
			el.classList.remove('prototypo-selected');
		});

		// highlight concerned elements
		Array.prototype.forEach.call(elementsToHighlight, function(el) {
			el.classList.add('prototypo-selected');
		});
});

// listening to highlight
window.addEventListener("highlight_selection", function(e) {
	var items = document.querySelectorAll(e.detail.message.selector);
	Array.prototype.forEach.call(items, function(item) {
		item.classList.add('prototypo-highlight');
	});
});
// listening to unhighlight
window.addEventListener("unhighlight_selection", function(e) {
	var items = document.querySelectorAll(e.detail.message.selector);
	Array.prototype.forEach.call(items, function(item) {
		item.classList.remove('prototypo-highlight');
	});
});
// listening to style tag removal
window.addEventListener("remove_style_tag", function(e) {
	var tags = document.getElementsByTagName("style");
	for(var i = 0; i < tags.length; i++) {
		if (tags[i].getAttribute("data-selector") === e.detail.message.selector.replace(/ /g,"")) {
			document.head.removeChild(tags[i]);
		}
	}
});

// listening to Prototypo app worker messages
window.addEventListener('message', function(e) {
	if (!iframe) {
		iframe = e.source.parent.iframe;
	}

	if (error) {
		document.body.removeChild(error.el);
	}

	switch(e.data.type) {
		case 'font':
			document.fonts.add(new FontFace(e.data.font[1], e.data.font[0]));
			break;
		case 'library':
			// we store recieved data in a global variable
			// that will be queried by the popup on load
			fonts = e.data;
			break;
		case 'error':
			/* probablement envoyer un message a la popup egalement
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				var prototypoError = error = new PrototypoError(e.data.message);
				document.body.appendChild(prototypoError.el);
				sendResponse({
					isActive: false,
					iconState: ''
				});
			}.bind(this));
			*/
			break;
	}
}, false);

/**
* Highlight a DOM element
* @param {object} e - the event that called the function
*/
function highlightEl(e) {
	if (self.elementHighlighted) {
		if (self.elementHighlighted.style) {
			self.elementHighlighted.style.outline = 'none';
		}
	}

	if (e.target.style) {
		e.target.style.outline = 'solid 2px #29d390';
	}
	self.elementHighlighted = e.target;
}

/**
* Highlight a DOM element's parent
* @param {object} e - the event that called the function
*/
function highlightParent(e) {
	highlightEl({target: e.target.parentNode});
}

/**
* Choose a DOM element and send it as a message to the popup
* @param {object} e - the event that called the function
*/
function chooseEl(e) {
	if (e.target === e.currentTarget) {
		e.target.style.outline = 'none';
		if (e.preventDefault){
			e.preventDefault();
		}
		if (e.stopPropagation) {
			e.stopPropagation();
		}

		var selector = OptimalSelect.select(e.target);
		/* envoyer message pour mettre à jour la popup
		self.selectionModeState = false;
		self.selectionMode.classList.remove('is-active');
		selectElements(selector);
		*/
		storeElement(selector);

		Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
			el.removeEventListener('mouseenter', highlightEl);
			el.removeEventListener('mouseleave', highlightParent);
			el.removeEventListener('click', chooseEl);
		});

		// asking iframe worker
		if (iframe) {
			var textInSelected = '';
			// getting every piece of text containing characters to load
			Array.prototype.forEach.call(document.querySelectorAll(selector), function(el) {
				textInSelected += el.innerText;
			});
			// sending a message to the iframe worker
			// in order to retrieve every character of selected fonts
			// will make the iframe worker send a message back
			iframe.contentWindow.postMessage({type: 'subset', data: textInSelected, add: true},iframeDomain);
		}

		// apply selected font
		var styleEl = document.createElement('style');
		var style = selector + ' {font-family: ' + selectedFont + ' !important;transition: background .2s ease, color .2s ease;}';
		styleEl.setAttribute("data-selector", selector.replace(/ /g,""));

		if (styleEl.stylesheet) {
			styleEl.stylesheet.cssText = style;
		} else {
			styleEl.appendChild(document.createTextNode(style));
		}
		document.head.appendChild(styleEl);
	}
}

/**
*	Stores the selected element in chrome storage
* @param {string} selector - concerned selector stored as a string
*/
function storeElement(selector) {
	chrome.storage.local.get("selectedElements", function(data) {
		if (data) {
			if (data.selectedElements) {
				data.selectedElements.push({ selector: selector, font: selectedFont });
				chrome.storage.local.set({ selectedElements: data.selectedElements });
			} else {
				chrome.storage.local.set({ selectedElements: [{ selector: selector, font: selectedFont }] });
			}
		}
	});
}

/**
*	Stores the selected font in chrome storage
* @param {string} selectedFont - concerned font stored as a string
*/
function storeSelectedFont(selectedFont) {
	chrome.storage.local.set({selectedFont: selectedFont});
}
