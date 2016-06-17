var iframeDomain = 'http://localhost:9000/';
var animationDuration = 200;
var iframe;
var error;
var fonts;

/* setting up the iframe containing protypo app */
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


// variable to store current selected font sent from popup
var selectedFont = "";

// on element selection start
window.addEventListener("selection_start", function(e){
	console.log(e.detail);
	selectedFont = e.detail.font;
	if (e.detail.selection) {
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

/**
* Highlight a DOM element
* @param e - the event that called the function
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
* @param e - the event that called the function
*/
function highlightParent(e) {
	highlightEl({target: e.target.parentNode});
}

/**
* Choose a DOM element and send it as a message to the popup
* @param e - the event that called the function
*/
function chooseEl(e) {
	if (e.target === e.currentTarget) {
		e.target.style.outline = 'none';
		e.preventDefault();
		e.stopPropagation();

		var selector = OptimalSelect.select(e.target);
		/* envoyer message pour mettre à jour la popup
		self.input.value = selector;
		self.selectionModeState = false;
		self.selectionMode.classList.remove('is-active');
		selectElements(selector);
		*/
		sendChooseElQuery(selector);

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
		var style = selector + ' { font-family: ' + selectedFont + ' !important;transition: background .2s ease, color .2s ease;}';

		if (styleEl.stylesheet) {
			styleEl.stylesheet.cssText = style;
		} else {
			styleEl.appendChild(document.createTextNode(style));
		}
		console.log(styleEl);
		document.head.appendChild(styleEl);
	}
}

/* communication functions - sent to the popup */

function sendChooseElQuery(element) {
	/*chrome.storage.local.set({selectedElement: element});
	// here send the query to popup
	chrome.storage.local.get("selectedElement", function(data) {
    if(typeof data.selectedElement == "undefined") {
        throw new Error("Error while retrieving local storage");
    } else {
        console.log(data.selectedElement);
    }
	});*/
}

/* listening to protypo app worker messages */
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
