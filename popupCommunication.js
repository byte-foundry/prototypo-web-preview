chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
 if (request.action == "start_selection") {
   selectionProcess(request);
 } else {
   sendResponse({});
 }
});

function selectionProcess(request) {
  var selectionStart = new CustomEvent('selection_start',{'detail' : request});
  window.dispatchEvent(selectionStart);
}
