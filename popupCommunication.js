chrome.extension.onRequest.addListener(function(request, sender, sendResponse) {
 if (request.action == "start_selection") {
   selectionProcess(request);
   window.addEventListener("selected",function(){
     sendResponse("toto");
   })
 } else {
   sendResponse({});
 }
});

function selectionProcess(request) {
  var selectionStart = new CustomEvent('selection_start',{'detail' : request});
  window.dispatchEvent(selectionStart);
  setTimeout(function(){
    window.dispatchEvent(new CustomEvent('selected'));
  },1000);
}

function stopSelectionProcess(request) {
  var selectionStop = new CustomEvent('selection_stop',{'detail' : request});
  window.dispatchEvent(selectionStop);
}
