var previouslySelectedFont = '';
var libraryRetry = false;
var tabId = null;

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  tabId = tab.id;
});

function displayFontList(fonts) {
  document.querySelector('.prototypo-magic-loader').style.display = 'none';

  var prototypoButton = new PrototypoMagic(fonts);
  document.body.appendChild(prototypoButton.el);
  chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
      prototypoButton.container.classList.toggle('hidden');
      prototypoButton.active = !prototypoButton.active;
      sendResponse({
        isActive: prototypoButton.active,
        iconState: prototypoButton.active ? '-hover-active' : '',
      });
    }.bind(this),
  );
}

function getLibrary() {
  // We get the user library from the storage and listen for changes
  chrome.storage.local.get('user', ({ user }) => {
    if (user) {
      displayFontList(user.library);
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.user && changes.user.newValue) {
      displayFontList(changes.user.newValue.library);
    }
  });
}

// on popup load
window.addEventListener('load', function() {
  // check for Prototypo error
  chrome.tabs.query({ active: true, currentWindow: true }, function([tab]) {
    chrome.tabs.sendMessage(
      tab.id,
      {
        action: 'get_error',
      },
      // response function containing data sent by content script
      function(error) {
        if (error) {
          var prototypoError = new PrototypoError(error);
          while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
          }
          document.body.appendChild(prototypoError.el);
        }
      },
    );
  });

  getLibrary();

  // retrieve previously selected font
  chrome.storage.local.get('selectedFont', function(data) {
    if (data && data.selectedFont) {
      previouslySelectedFont = data.selectedFont;
    }
  });

  updateBadgeCount();
});

/**
* Font selector list
*/
var FontSelectorList = function() {
  this.el = document.querySelector('.prototypo-font-selector-list');
  this.list = {};
  // retrieve previously selected element
  chrome.storage.local.get({ selectedElements: [] }, ({ selectedElements }) => {
    selectedElements
      .filter(element => element.tabId === tabId)
      .forEach(element => {
        this.addFontSelector(element.selector, element.font);
      });
  });
};

/**
* Add a new font selector
* @param {string} selector
* @param {string} fontname
*/
FontSelectorList.prototype.addFontSelector = function(selector, fontname) {
  var item = new FontSelectorLink(selector, fontname, this);
  this.el.appendChild(item.el);

  this.list[selector] = item;

  if (Object.keys(this.list).length === 1) {
    document
      .querySelector('.prototypo-magic-font-list-container')
      .classList.add('scale-in');
  }

  this.el.classList.remove('hidden');
};

/**
* Remove a font selector
* @param {string} selector
*/
FontSelectorList.prototype.remove = function(selector) {
  var item = this.list[selector];
  delete this.list[selector];
  if (Object.keys(this.list).length === 0) {
    document
      .querySelector('.prototypo-magic-font-list-container')
      .classList.remove('scale-in');
    document
      .querySelector('.prototypo-magic-font-list-container')
      .classList.add('scale-out');
    var endHandler = function() {
      this.el.classList.add('hidden');
      document
        .querySelector('.prototypo-magic-font-list-container')
        .classList.remove('scale-out');
      this.el.removeChild(item.el);

      removeStyleTag(selector);

      document
        .querySelector('.prototypo-magic-font-list-container')
        .removeEventListener('animationend', endHandler);
      sendMessageToContent('unhighlight_selection', {
        selector: selector,
      });
    }.bind(this);
    document
      .querySelector('.prototypo-magic-font-list-container')
      .addEventListener('animationend', endHandler);
  } else {
    item.el.classList.remove('height-in');
    item.el.classList.add('height-out');
    item.el.addEventListener(
      'animationend',
      function() {
        this.el.removeChild(item.el);

        removeStyleTag(selector);

        sendMessageToContent('unhighlight_selection', {
          selector: selector,
        });
      }.bind(this),
    );
  }
};

/**
* FontSelectorLink
* @param {string} selector
* @param {string} fontname
* @param {string} parent
*/
var FontSelectorLink = function(selector, fontname, parent) {
  this.selector = selector;
  this.list = parent;

  this.el = document.createElement('li');
  this.el.classList.add('height-in');

  this.selectorContainer = document.createElement('div');
  this.selectorContainer.classList.add('prototypo-list-selector-container');

  this.selectorName = document.createElement('div');
  this.selectorName.classList.add('prototypo-list-selector-name');
  this.selectorName.innerText = selector;
  this.selectorName.setAttribute('title', selector);

  this.selectorDelete = document.createElement('div');
  this.selectorDelete.classList.add('prototypo-list-selector-delete');
  this.selectorDelete.style.backgroundImage =
    "url('" + chrome.extension.getURL('delete.svg') + "')";

  this.fontNameContainer = document.createElement('div');
  this.fontNameContainer.classList.add('prototypo-list-fontname-container');
  this.fontNameContainer.innerText = fontname;
  this.fontNameContainer.setAttribute('title', fontname);

  this.selectorContainer.appendChild(this.selectorName);
  this.selectorContainer.appendChild(this.selectorDelete);
  this.el.appendChild(this.selectorContainer);
  this.el.appendChild(this.fontNameContainer);

  this.el.addEventListener('mouseenter', function() {
    sendMessageToContent('highlight_selection', {
      selector: selector,
    });
  });

  this.el.addEventListener('mouseleave', function() {
    sendMessageToContent('unhighlight_selection', {
      selector: selector,
    });
  });

  this.selectorDelete.addEventListener(
    'click',
    function(e) {
      this.list.remove(this.selector);
      removeStoredElement(this.selector);
      sendMessageToContent('unselect_all_elements');
    }.bind(this),
  );
};

/**
* PrototypoMagic
* @param {array} fonts - fonts from Prototypo
*/
var PrototypoMagic = function(fonts) {
  this.active = false;

  this.el = document.querySelector('.prototypo-magic');

  this.listContainer = document.querySelector(
    '.prototypo-magic-font-list-container',
  );

  this.container = document.querySelector('.prototypo-magic-container');

  this.selectorInput = new SelectorInput();

  this.fontSelect = new FontSelect(fonts);

  this.container.addEventListener('submit', e => {
    e.preventDefault();

    if (this.selectorInput.input.value) {
      const input = this.selectorInput.input;

      input.classList.remove('in-error');
      try {
        document.querySelector(input.value);

        sendMessageToContent('apply_style', {
          selector: input.value,
          selectedFont: this.fontSelect.el.value,
        });
        storeSelectedFont({
          id: this.fontSelect.el[this.fontSelect.el.selectedIndex].id,
          name: this.fontSelect.el.value,
        });

        // update existing selector if already existing
        if (this.listFontSelector.list[input.value]) {
          this.listFontSelector.list[
            input.value
          ].fontNameContainer.innerHTML = this.fontSelect.el.value;
        } else {
          this.listFontSelector.addFontSelector(
            input.value,
            this.fontSelect.el.value,
          );
        }

        storeElement(input.value, this.fontSelect.el.value);
      } catch (error) {
        console.log(error);
        input.classList.add('in-error');
      }
      input.value = '';
    } else {
      this.selectorInput.input.classList.add('in-error');
    }
  });

  this.validFont = document.querySelector('.prototypo-magic-apply');
  this.container.appendChild(this.validFont);

  this.listFontSelector = new FontSelectorList();
  this.listContainer.appendChild(this.listFontSelector.el);
};

/**
* SelectorInput
*/
var SelectorInput = function() {
  this.el = document.querySelector('.prototypo-magic-selector');

  this.input = document.querySelector('.prototypo-magic-selector-input');

  this.selectionMode = document.querySelector(
    '.prototypo-magic-selection-mode',
  );

  this.selectionModeState = false;

  this.elementHighlighted = undefined;

  this.selectionMode.addEventListener('click', selectionProcess.bind(this));

  // launch selection process
  function selectionProcess() {
    var selection = !this.selectionModeState;
    var selectedFontOption = document.querySelector('.prototypo-magic-select');

    this.selectionModeState = !this.selectionModeState;
    this.selectionMode.classList.toggle('is-active');

    // on click, send a request to the tab to start selection process
    sendMessageToContent('unselect_all_elements');
    sendMessageToContent('start_selection', {
      selection: selection,
      font: selectedFontOption.value,
    });
    storeSelectedFont({
      id: selectedFontOption[selectedFontOption.selectedIndex].id,
      name: selectedFontOption.value,
    });
    // then close the popup
    window.close(); // idealement ici faire ça en callback apres reponse du contentScript
  }

  this.elementAffected = [];

  this.input.addEventListener('keyup', function(e) {
    var selector = e.target.value;
    if (selector) {
      try {
        document.querySelectorAll(selector);
        sendMessageToContent('select_elements', {
          selector: selector,
        });
      } catch (error) {
        console.log(error);
      }
    } else {
      sendMessageToContent('unselect_all_elements');
    }
  });
};

/**
* FontSelect
* @param {array} fonts - loaded fonts from Prototypo
*/
var FontSelect = function(fonts) {
  this.el = document.querySelector('.prototypo-magic-select');

  fonts.forEach(font => {
    font.variants.forEach(variant => {
      var variantOption = document.createElement('option');
      variantOption.id = variant.id;
      variantOption.value = font.name + ' ' + variant.name;
      variantOption.label = font.name + ' ' + variant.name;
      variantOption.innerText = font.name + ' ' + variant.name;

      this.el.appendChild(variantOption);
    });
  });

  // select previously selected font if necessary
  if (previouslySelectedFont !== '') {
    var options = document.querySelectorAll('.prototypo-magic-select option');
    Array.prototype.forEach.call(options, option => {
      if (option.value === previouslySelectedFont.name) {
        option.selected = true;
      }
    });
  }
};

/**
* PrototypoError
*/
var PrototypoError = function(message) {
  this.el = document.createElement('div');
  this.el.classList.add('prototypo-magic-error');
  this.el.innerText = message;
};

/**
* A helper function to send a message to the content script
* @param {string} action - a string representing the action to be sent
* @param {object} message - a key:value message object
*/
function sendMessageToContent(action, message) {
  if (typeof action === 'string') {
    chrome.tabs.query({ active: true, currentWindow: true }, function([tab]) {
      // send a request to the content script
      chrome.tabs.sendMessage(
        tab.id,
        {
          action: action,
          message: message,
        },
        function(response) {
          console.log(response);
        },
      );
    });
  } else {
    throw new Error(
      'sendMessageToContent - action (first parameter) must be of type string',
    );
  }
}

/**
*	Stores the selected element in chrome storage
* @param {string} selector - concerned selector stored as a string
* @param {string} font - concerned font stored as a string
*/
function storeElement(selector, font) {
  chrome.runtime.sendMessage({
    action: 'store_element',
    message: {
      selector,
      font: font,
      tabId,
    },
  });
}

/**
*	Removes the selected element from chrome storage
* @param {string} selector - concerned selector stored as a string
*/
function removeStoredElement(selector) {
  chrome.storage.local.get({ selectedElements: [] }, function({
    selectedElements,
  }) {
    chrome.storage.local.set({
      selectedElements: selectedElements.filter(
        element => element.selector !== selector && element.tabId !== tabId,
      ),
    });
    updateBadgeCount();
  });
}

/**
* Remove corresponding style tag
* @param {string} - the selector for which the tag must be removed
*/
function removeStyleTag(selector) {
  sendMessageToContent('remove_style_tag', {
    selector: selector,
  });
}

/**
* Update badge count
*/
function updateBadgeCount() {
  chrome.runtime.sendMessage({
    action: 'update_badge_count',
    message: {
      tabId,
    },
  });
}

function storeSelectedFont(selectedFont) {
  chrome.storage.local.set({ selectedFont: selectedFont });
}

window.addEventListener('load', () => {
  const emailEl = document.querySelector('.prototypo-magic-logout-email');
  const logoutLink = document.querySelector('.prototypo-magic-logout-link');

  const render = ({ email }) => {
    emailEl.innerText = email;
  };

  // init

  logoutLink.addEventListener('click', e => {
    e.preventDefault();

    chrome.storage.local.remove('token');
  });

  chrome.storage.local.get(
    { user: { email: 'email@example.com' } },
    ({ user: { email } }) => {
      render({ email });
    },
  );
});
