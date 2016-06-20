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
    // apply selected font to sent element
    case "apply_style":
      applyStyle(request);
      break;
    default:
      sendResponse("default_response from content");
  }
});

/**
* Starts selection process
* @param {object} request - the request sent by the popup
*/
function selectionProcess(request) {
  var selectionStart = new CustomEvent('selection_start',{'detail' : request});
  window.dispatchEvent(selectionStart);
}

/**
* Emmit an event in order to apply styles
* Directly from selector input in the popup
* @param {object} request - the request sent by the popup
*/
function applyStyle(request) {
  var applyStyle = new CustomEvent('apply_style',{'detail' : request});
  window.dispatchEvent(applyStyle);
}
