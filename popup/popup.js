// on popup load
window.addEventListener("load", function() {
  // retrieve fonts loaded by content script
  chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.sendRequest(
      tab.id,
      {
        action: "get_libraries"
      },
      function(fonts) {
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
      }
    );
  });
});

/* FontSelectorList */

var FontSelectorList = function() {
  this.el = document.querySelector(".prototypo-font-selector-list")
	this.list = {};
};

FontSelectorList.prototype.addFontSelector = function(selector, fontname) {
	var item = new FontSelectorLink(selector, fontname, this);
	this.el.appendChild(item.el);

  // envoyer un message, vérifier qu'il n'agit que sur le bon tab
	// document.head.appendChild(item.styleEl);

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
        // envoyer un message
				// document.head.removeChild(item.styleEl);
				document.querySelector('.prototypo-magic-font-list-container').removeEventListener('animationend', endHandler);
        // envoyer un message ?
				var items = document.querySelectorAll(selector);
				Array.prototype.forEach.call(items, function(item) {
					item.classList.remove('prototypo-highlight');
				});
		}.bind(this);
		document.querySelector('.prototypo-magic-font-list-container').addEventListener('animationend', endHandler);
	} else {
		item.el.classList.remove('height-in');
		item.el.classList.add('height-out');
		item.el.addEventListener('animationend', function() {
			this.el.removeChild(item.el);
      // envoyer un message
			// document.head.removeChild(item.styleEl);
      // envoyer un message ?
			var items = document.querySelectorAll(selector);
			Array.prototype.forEach.call(items, function(item) {
				item.classList.remove('prototypo-highlight');
			});
		}.bind(this));
	}
}

/* FontSelectorLink */

var FontSelectorLink = function(selector, fontname, parent) {
	this.selector = selector;
	this.list = parent;

	this.el = document.createElement('li');
	this.el.classList.add('height-in');

  this.selectorContainer = document.querySelector('.prototypo-list-selector-container');

  this.selectorName = document.querySelector('.prototypo-list-selector-name');
	this.selectorName.innerText = selector;

  this.selectorDelete = document.querySelector('.prototypo-list-selector-delete');
	this.selectorDelete.style.backgroundImage = 'url(\'' + chrome.extension.getURL('delete.svg') + '\')';

  this.fontNameContainer = document.querySelector('.prototypo-list-fontname-container')
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

/* PrototypoMagic */

var PrototypoMagic = function(fonts) {
	this.active = false;

  this.el = document.querySelector('.prototypo-magic');

  this.listContainer = document.querySelector('.prototypo-magic-font-list-container');

  this.container = document.querySelector('.prototypo-magic-container');

	this.selectorInput = new SelectorInput();

	this.fontSelect = new FontSelect(fonts);

  this.validFont = document.querySelector('.prototypo-magic-apply');
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
}

/* SelectorInput */

var SelectorInput = function() {
  this.el = document.querySelector('.prototypo-magic-selector')

  this.input = document.querySelector('.prototypo-magic-selector-input');

  this.selectionMode = document.querySelector('.prototypo-magic-selection-mode');

	this.selectionModeState = false;

	this.elementHighlighted = undefined;

	var self = this;

	function highlightEl(e) {
		if (self.elementHighlighted) {
			self.elementHighlighted.style.outline = 'none';
		}
    // envoyer un message ?
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

	this.selectionMode.addEventListener('click', selectionProcess.bind(this));

	function selectionProcess() {
      var selection = !this.selectionModeState;
      var selectedFont = document.querySelector('.prototypo-magic-select').value;

			this.selectionModeState = !this.selectionModeState;
			this.selectionMode.classList.toggle('is-active');

      // on click, send a request to the tab to start selection process
      chrome.tabs.getSelected(null, function(tab) {
        // send a request to the content script
        chrome.tabs.sendRequest(
          tab.id,
          {
            action: "start_selection",
            selection: selection,
            self: self,
            font: selectedFont
          },
          function(response) {
            console.log(response);
          }
        );
      });
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

/* FontSelect */

var FontSelect = function(fonts) {

	this.el = document.querySelector('.prototypo-magic-select');

	fonts.forEach(function(font) {
		font.variants.forEach(function(variant) {
			var variantOption = document.createElement('option');
			variantOption.value = variant.db;
			variantOption.label = font.name + ' ' + variant.name;

			this.el.appendChild(variantOption);

		}.bind(this));
	}.bind(this));
}

/* PrototypoError */

var PrototypoError = function(message) {
	this.el = document.createElement('div');
	this.el.classList.add('prototypo-magic-error');
	this.el.innerText = message;
}
