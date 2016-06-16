var iframeDomain = 'http://localhost:9000/';
var animationDuration = 200;

var FontSelectorList = function() {
	this.el = document.createElement('ul');
	this.el.classList.add('prototypo-font-selector-list');
	this.el.classList.add('hidden');
	this.list = {};
};

FontSelectorList.prototype.addFontSelector = function(selector, fontname) {
	var item = new FontSelectorLink(selector, fontname, this);
	this.el.appendChild(item.el);
	document.head.appendChild(item.styleEl);

	if (iframe) {
		var textInSelected = '';
		Array.prototype.forEach.call(document.querySelectorAll(selector), function(el) {
			textInSelected += el.innerText;
		});
		iframe.contentWindow.postMessage({type: 'subset', data: textInSelected, add: true},iframeDomain);
	}

	this.list[selector] = item;

	if (Object.keys(this.list).length === 1) {
		document.querySelector('.prototypo-magic-font-list-container').classList.add('scale-in');
	}

	this.el.classList.remove('hidden');
};

FontSelectorList.prototype.remove = function(selector) {
	var item = this.list[selector];
	delete this.list[selector];
	if (Object.keys(this.list).length === 0) {
		document.querySelector('.prototypo-magic-font-list-container').classList.remove('scale-in');
		document.querySelector('.prototypo-magic-font-list-container').classList.add('scale-out');
		var endHandler = function() {
				this.el.classList.add('hidden');
				document.querySelector('.prototypo-magic-font-list-container').classList.remove('scale-out');
				this.el.removeChild(item.el);
				document.head.removeChild(item.styleEl);
				document.querySelector('.prototypo-magic-font-list-container').removeEventListener('animationend', endHandler);
				var items = document.querySelectorAll(selector);
				Array.prototype.forEach.call(items, function(item) {
					item.classList.remove('prototypo-highlight');
				});
		}.bind(this);
		document.querySelector('.prototypo-magic-font-list-container').addEventListener('animationend',
			endHandler);
	}
	else {
		item.el.classList.remove('height-in');
		item.el.classList.add('height-out');
		item.el.addEventListener('animationend', function() {
			this.el.removeChild(item.el);
			document.head.removeChild(item.styleEl);
			var items = document.querySelectorAll(selector);
			Array.prototype.forEach.call(items, function(item) {
				item.classList.remove('prototypo-highlight');
			});
		}.bind(this));
	}
}

var FontSelectorLink = function(selector, fontname, parent) {
	this.selector = selector;
	this.list = parent;

	this.styleEl = document.createElement('style');
	var style = selector + ' { font-family: ' + fontname + ' !important;transition: background .2s ease, color .2s ease;}';

	if (this.styleEl.stylesheet) {
		this.styleEl.stylesheet.cssText = style;
	}
	else {
		this.styleEl.appendChild(document.createTextNode(style));
	}

	this.el = document.createElement('li');
	this.el.classList.add('height-in');
	this.selectorContainer = document.createElement('div');
	this.selectorContainer.classList.add('prototypo-list-selector-container');

	this.selectorName = document.createElement('div');
	this.selectorName.classList.add('prototypo-list-selector-name');
	this.selectorName.innerText = selector;

	this.selectorDelete = document.createElement('div');
	this.selectorDelete.classList.add('prototypo-list-selector-delete');
	this.selectorDelete.style.backgroundImage = 'url(\'' + chrome.extension.getURL('delete.svg') + '\')';

	this.selectorContainer.appendChild(this.selectorName);
	this.selectorContainer.appendChild(this.selectorDelete);

	this.fontNameContainer = document.createElement('div');
	this.fontNameContainer.classList.add('prototypo-list-fontname-container');
	this.fontNameContainer.innerText = fontname;
	this.el.appendChild(this.selectorContainer);
	this.el.appendChild(this.fontNameContainer);

	this.el.addEventListener('mouseenter', function() {
		var items = document.querySelectorAll(selector);
		Array.prototype.forEach.call(items, function(item) {
			item.classList.add('prototypo-highlight');
		});
	});

	this.el.addEventListener('mouseleave', function() {
		var items = document.querySelectorAll(selector);
		Array.prototype.forEach.call(items, function(item) {
			item.classList.remove('prototypo-highlight');
		});
	});

	this.selectorDelete.addEventListener('click', function(e) {
		this.list.remove(this.selector);
	}.bind(this));
};

var PrototypoMagic = function(fonts) {
	this.active = false;
	this.el = document.createElement('div');
	this.el.classList.add('prototypo-magic');

	this.listContainer = document.createElement('div');
	this.listContainer.classList.add('prototypo-magic-font-list-container');
	this.el.appendChild(this.listContainer);

	this.container = document.createElement('div');
	this.container.classList.add('prototypo-magic-container');
	this.container.classList.add('hidden');

	this.selectorInput = new SelectorInput();
	this.container.appendChild(this.selectorInput.el);

	this.fontSelect = new FontSelect(fonts);
	this.container.appendChild(this.fontSelect.el);

	this.validFont = document.createElement('button');
	this.validFont.classList.add('prototypo-magic-apply');
	this.validFont.innerText = 'Apply';
	this.validFont.addEventListener('click', function(e) {
		if (this.selectorInput.input.value) {
			e.stopPropagation();
			this.selectorInput.input.classList.remove('in-error');
			this.listFontSelector.addFontSelector(this.selectorInput.input.value, this.fontSelect.el.value);
			this.selectorInput.clear();
		}
		else {
			this.selectorInput.input.classList.add('in-error');
		}
	}.bind(this));

	this.container.appendChild(this.validFont);

	this.listFontSelector = new FontSelectorList();
	this.listContainer.appendChild(this.listFontSelector.el);
	this.el.appendChild(this.container);
}

var SelectorInput = function() {
	this.el = document.createElement('div');
	this.el.classList.add('prototypo-magic-selector');
	this.input = document.createElement('input');
	this.input.classList.add('prototypo-magic-selector-input');
	this.input.placeholder = 'Add a CSS selector...';
	this.selectionMode = document.createElement('div');
	this.selectionMode.classList.add('prototypo-magic-selection-mode');
	this.el.appendChild(this.selectionMode);
	this.el.appendChild(this.input);
	this.selectionModeState = false;

	this.elementHighlighted = undefined;
	var self = this;
	function highlightEl(e) {
		if (self.elementHighlighted) {
			self.elementHighlighted.style.outline = 'none';
		}
		e.target.style.outline = 'solid 2px #29d390';
		self.elementHighlighted = e.target;
	}

	function highlightParent(e) {
		highlightEl({target: e.target.parentNode});
	}

	function chooseEl(e) {
		if (e.target === e.currentTarget) {
			e.target.style.outline = 'none';
			e.preventDefault();
			e.stopPropagation();
			var selector = OptimalSelect.select(e.target);
			self.input.value = selector;
			self.selectionModeState = false;
			self.selectionMode.classList.remove('is-active');
			Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
				el.removeEventListener('mouseenter', highlightEl);
				el.removeEventListener('mouseleave', highlightParent);
				el.removeEventListener('click', chooseEl);
			});

			selectElements(selector);
		}
	}

	/*this.selectionMode.addEventListener('click', function(e) {
		this.selectionModeState = !this.selectionModeState;
		this.selectionMode.classList.toggle('is-active');

		if (this.selectionModeState) {
			Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
				el.addEventListener('mouseenter', highlightEl);
				el.addEventListener('mouseleave', highlightParent);
				el.addEventListener('click', chooseEl);
			});
		}
		else {
			Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
				el.removeEventListener('mouseenter', highlightEl);
				el.removeEventListener('mouseleave', highlightParent);
				el.removeEventListener('click', chooseEl);
			});
			if (self.elementHighlighted) {
				self.elementHighlighted.style.outline = 'none';
				self.elementHighlighted = undefined;
			}
		}
	}.bind(this));*/

	this.selectionMode.addEventListener('click', selectionProcess.bind(this));

	function selectionProcess() {

			this.selectionModeState = !this.selectionModeState;
			this.selectionMode.classList.toggle('is-active');

			if (this.selectionModeState) {
				Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
					el.addEventListener('mouseenter', highlightEl);
					el.addEventListener('mouseleave', highlightParent);
					el.addEventListener('click', chooseEl);
				});
			}
			else {
				Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
					el.removeEventListener('mouseenter', highlightEl);
					el.removeEventListener('mouseleave', highlightParent);
					el.removeEventListener('click', chooseEl);
				});
				if (self.elementHighlighted) {
					self.elementHighlighted.style.outline = 'none';
					self.elementHighlighted = undefined;
				}
			}
	}

	this.elementAffected = [];

	function selectElements(selector) {
		Array.prototype.forEach.call(self.elementAffected, function(el) {
			el.classList.remove('prototypo-selected');
		});

		self.elementAffected = document.querySelectorAll(selector);
		Array.prototype.forEach.call(self.elementAffected, function(el) {
			el.classList.add('prototypo-selected');
		});
	}

	this.input.addEventListener('keyup', function(e) {
		var selector = e.target.value;

		selectElements(selector);
	});
}

SelectorInput.prototype.clear = function() {
	Array.prototype.forEach.call(this.elementAffected, function(el) {
		el.classList.remove('prototypo-selected');
	});

	if (this.elementHighlighted) {
		this.elementHighlighted.style.outline = 'none';
	}

	this.input.value = '';
}

var FontSelect = function(fonts) {
	this.el = document.createElement('select');
	this.el.classList.add('prototypo-magic-select');

	fonts.forEach(function(font) {

		font.variants.forEach(function(variant) {
			var variantOption = document.createElement('option');
			variantOption.value = variant.db;
			variantOption.label = font.name + ' ' + variant.name;

			this.el.appendChild(variantOption);
		}.bind(this));
	}.bind(this));
}

var PrototypoError = function(message) {
	this.el = document.createElement('div');
	this.el.classList.add('prototypo-magic-error');
	this.el.innerText = message;
}

var iframe;
var error;
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
			var fonts = e.data;
			var prototypoButton = new PrototypoMagic(fonts.values);
			document.body.appendChild(prototypoButton.el);
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				prototypoButton.container.classList.toggle('hidden');
				prototypoButton.active = !prototypoButton.active;
				sendResponse({
					isActive: prototypoButton.active,
					iconState: prototypoButton.active ? '-hover-active' : ''
				});
			}.bind(this));
			break;
		case 'error':
			chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
				var prototypoError = error = new PrototypoError(e.data.message);
				document.body.appendChild(prototypoError.el);
				sendResponse({
					isActive: false,
					iconState: ''
				});
			}.bind(this));
			break;
	}
}, false);

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
