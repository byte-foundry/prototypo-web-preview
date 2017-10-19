var animationDuration = 200;
var error;
var elementHighlighted;
// available fonts from prototypo
var fonts;
// variable to store current selected font sent from popup
var selectedFont = '';

// clear previously stored values on page load
chrome.storage.local.remove(['selectedFont', 'selectedElements']);

// on element selection start
window.addEventListener('selection_start', function(e) {
  // here we store the font that was selected in the popup
  selectedFont = e.detail.message.font;

  if (e.detail.message.selection) {
    Array.prototype.forEach.call(
      document.querySelectorAll('*:not([class*="prototypo-"])'),
      function(el) {
        el.addEventListener('mouseenter', highlightEl);
        el.addEventListener('mouseleave', highlightParent);
        el.addEventListener('click', chooseEl);
      },
    );
  } else {
    Array.prototype.forEach.call(
      document.querySelectorAll('*:not([class*="prototypo-"])'),
      function(el) {
        el.removeEventListener('mouseenter', highlightEl);
        el.removeEventListener('mouseleave', highlightParent);
        el.removeEventListener('click', chooseEl);
      },
    );
  }
});
// on echap, stop selection
window.addEventListener('keyup', function(e) {
  if (e.keyCode === 27) {
    unselectAllElements();
    Array.prototype.forEach.call(
      document.querySelectorAll('*:not([class*="prototypo-"])'),
      function(el) {
        el.removeEventListener('mouseenter', highlightEl);
        el.removeEventListener('mouseleave', highlightParent);
        el.removeEventListener('click', chooseEl);
      },
    );
  }
});

// on click on popup 'apply' button
window.addEventListener('apply_style', function(e) {
  selectedFont = e.detail.message.selectedFont;

  // apply style to element
  applyStyleToEl(e.detail.message.selector, selectedFont);
});

// on keyup in popup selection input
window.addEventListener('select_elements', function(e) {
  var highlightedElements = document.querySelectorAll('.prototypo-selected');
  var elementsToHighlight = document.querySelectorAll(
    e.detail.message.selector,
  );

  // un-highlight previously highlighted elements
  Array.prototype.forEach.call(highlightedElements, function(el) {
    el.classList.remove('prototypo-selected');
  });

  // highlight concerned elements
  Array.prototype.forEach.call(elementsToHighlight, function(el) {
    el.classList.add('prototypo-selected');
  });
});
window.addEventListener('unselect_all_elements', function(e) {
  var highlightedElements = document.querySelectorAll('.prototypo-highlight');
  var selectedElements = document.querySelectorAll('.prototypo-selected');
  var outlinedElements = document.querySelectorAll('.prototypo-outlined');

  // un-highlight previously highlighted elements
  highlightedElements.forEach(el => {
    el.classList.remove('prototypo-highlight');
  });
  // un-select previously selected elements
  selectedElements.forEach(item => {
    item.classList.remove('prototypo-selected');
  });
  // un-outline previously outlined elements
  outlinedElements.forEach(el => {
    el.classList.remove('prototypo-outlined');
  });
});

// listening to highlight
window.addEventListener('highlight_selection', function(e) {
  var items = document.querySelectorAll(e.detail.message.selector);
  Array.prototype.forEach.call(items, function(item) {
    item.classList.add('prototypo-highlight');
  });
});
// listening to unhighlight
window.addEventListener('unhighlight_selection', function(e) {
  var items = document.querySelectorAll(e.detail.message.selector);
  Array.prototype.forEach.call(items, function(item) {
    item.classList.remove('prototypo-highlight');
  });
});
// listening to style tag removal
window.addEventListener('remove_style_tag', function(e) {
  removeStyleTags(e.detail.message.selector);
});
// listening to Prototypo app worker messages
window.addEventListener(
  'message',
  function(e) {
    if (error) {
      document.body.removeChild(error.el);
    }

    switch (e.data.type) {
      case 'library':
        // we store recieved data in a global variable
        // that will be queried by the popup on load
        fonts = e.data;
        break;
      case 'error':
        console.log('receiving error', e.data);
        error = e.data.message;
        break;
    }
  },
  false,
);

/**
* Highlight a DOM element
* @param {object} e - the event that called the function
*/
function highlightEl(e) {
  if (elementHighlighted) {
    if (elementHighlighted.classList) {
      elementHighlighted.classList.remove('prototypo-outlined');
    }
  }

  if (e.target.classList) {
    e.target.classList.add('prototypo-outlined');
  }

  elementHighlighted = e.target;
}

/**
* Highlight a DOM element's parent
* @param {object} e - the event that called the function
*/
function highlightParent(e) {
  highlightEl({ target: e.target.parentNode });
}

/**
* Choose a DOM element and store in chrome local data
* @param {object} e - the event that called the function
*/
function chooseEl(e) {
  if (e.target === e.currentTarget) {
    e.target.classList.remove('prototypo-outlined');
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    }

    var selector = OptimalSelect.select(e.target, {
      ignore: {
        class: function(className) {
          return className === '';
        },
      },
    });

    storeElement(selector, selectedFont);

    Array.prototype.forEach.call(
      document.querySelectorAll('*:not([class*="prototypo-"])'),
      function(el) {
        el.removeEventListener('mouseenter', highlightEl);
        el.removeEventListener('mouseleave', highlightParent);
        el.removeEventListener('click', chooseEl);
      },
    );

    // apply selected font
    removeStyleTags(selector);
    addStyleTag(selector);
  }
}

/**
* Apply a style to a given set of elements
* @param {string} selector - the selector
* @param {string} font - the selected font
*/
function applyStyleToEl(selector, font) {
  var elements = document.querySelectorAll(selector);

  Array.prototype.forEach.call(elements, function(element) {
    element.classList.remove('prototypo-outlined');
    element.classList.remove('prototypo-selected');
  });

  // apply selected font
  removeStyleTags(selector);
  addStyleTag(selector);
}

/**
* Adds a style tag for a selector
* @param {string} selector - the selector
*/
function addStyleTag(selector) {
  var styleEl = document.createElement('style');
  var style = `
    ${selector} {
      font-family: "${selectedFont}" !important;
      transition: background .2s ease, color .2s ease;
    }
  `;
  styleEl.setAttribute('data-selector', selector.replace(/ /g, ''));

  if (styleEl.stylesheet) {
    styleEl.stylesheet.cssText = style;
  } else {
    styleEl.appendChild(document.createTextNode(style));
  }
  document.head.appendChild(styleEl);

  // add loader to elements while the font is loading
  document.fonts.load('12px ' + selectedFont).then(([isLoaded]) => {
    if (isLoaded) {
      return;
    }

    document.querySelectorAll(selector).forEach(node => {
      const loader = document.createElement('div');
      loader.appendChild(document.createElement('div'));
      loader.classList.add('prototypo-font-loader');
      loader.setAttribute('data-font', selectedFont);

      const position = node.getBoundingClientRect();
      loader.style.top = position.top + 'px';
      loader.style.left = position.left + 'px';
      loader.style.width = position.width + 'px';
      loader.style.height = position.height + 'px';

      document.body.appendChild(loader);
    });
  });
}

/**
* Removes all style tags for a selector
* @param {string} selector - the selector
*/
function removeStyleTags(selector) {
  var tags = document.getElementsByTagName('style');
  var trimedSelector = selector.replace(/ /g, '');
  var tagsToDelete = [];

  // here we have to loop over the tags and get the attribute 'by hand'
  // because querySelectorAll will not allow string containing special characters
  for (var i = 0; i < tags.length; i++) {
    if (tags[i].getAttribute('data-selector') === trimedSelector) {
      tagsToDelete.push(tags[i]);
    }
  }
  if (tagsToDelete.length > 0) {
    for (var i = 0; i < tagsToDelete.length; i++) {
      document.head.removeChild(tagsToDelete[i]);
    }
  }
}

/**
*	Stores the selected element in chrome storage
* @param {string} selector - concerned selector stored as a string
*/

function storeElement(selector, font) {
  sendMessageToBackground('store_element', {
    selector,
    font,
  });
}

/**
* A helper function to send a message to the background script
* @param {string} action - a string representing the action to be sent
* @param {object} message - a key:value message object
*/
function sendMessageToBackground(action, message) {
  if (typeof action === 'string') {
    // send a request to the background script
    chrome.runtime.sendMessage({
      action: action,
      message: message,
    });
  } else {
    throw new Error(
      'sendMessageToBackground - action (first parameter) must be of type string',
    );
  }
}

window.addEventListener('rawfont', e => {
  const rawfont = e.detail;

  // remove all loaders
  document
    .querySelectorAll(`.prototypo-font-loader[data-font="${rawfont.name}"]`)
    .forEach(node => {
      node.remove();
    });

  document.fonts.add(new FontFace(rawfont.name, rawfont.source));
});
