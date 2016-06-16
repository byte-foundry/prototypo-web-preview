chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
 if (request.action == "getDOM") {
   console.log(dom);
 }
 else {
   sendResponse({});
 }
});

function selectionProcess() {
  console.log("selection");

  Array.prototype.forEach.call(document.querySelectorAll('*:not([class*="prototypo-"])'), function(el) {
    el.addEventListener('mouseenter', highlightEl);
    el.addEventListener('mouseleave', highlightParent);
    el.addEventListener('click', chooseEl);
  });
}
function highlightEl(e) {
  console.log("highlight");
  if (self.elementHighlighted) {
    self.elementHighlighted.style.outline = 'none';
  }
  e.target.style.outline = 'solid 2px #29d390';
  self.elementHighlighted = e.target;
}

function highlightParent(e) {
  highlightEl({target: e.target.parentNode});
}
