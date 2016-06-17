/**
* Handle request comming from popup window
* data sent via "sendRequest" method in popup.js
*/

chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
  switch (request.action) {
    // start of selection process
    case "start_selection":
      selectionProcess(request);
      break;
    // iframe worker sent a message with character set
    case "get_libraries":
      sendResponse(fonts);
      break;
    default:
      sendResponse({});
  }
});

/**
* Starts selection process
* @param request - the request sent by the popup
*/
function selectionProcess(request) {
  var selectionStart = new CustomEvent('selection_start',{'detail' : request});
  window.dispatchEvent(selectionStart);
}

/* */
function stopSelectionProcess(request) {
  var selectionStop = new CustomEvent('selection_stop',{'detail' : request});
  window.dispatchEvent(selectionStop);
}
