var iframeDomain = 'http://localhost:9000/';
var animationDuration = 200;

// on element selection start
window.addEventListener("selection_start", function(e){
	console.log(e.detail);
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

		/* envoyer message pour mettre à jour la popup et appliquer la fonte
		var selector = OptimalSelect.select(e.target);
		self.input.value = selector;
		self.selectionModeState = false;
		self.selectionMode.classList.remove('is-active');
		selectElements(selector);
		*/
		sendChooseElQuery(e.target);

		Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
			el.removeEventListener('mouseenter', highlightEl);
			el.removeEventListener('mouseleave', highlightParent);
			el.removeEventListener('click', chooseEl);
		});
	}
}

/* communication functions - sent to the popup */

function sendChooseElQuery(element) {
	chrome.storage.local.set({selectedElement: element});
	// here send the query to popup
	chrome.storage.local.get("selectedElement", function(data) {
    if(typeof data.selectedElement == "undefined") {
        throw new Error("Error while retrieving local storage");
    } else {
        console.log(data.selectedElement);
    }
});
}
