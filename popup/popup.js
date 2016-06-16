document.querySelectorAll(".prototypo-magic")[0].addEventListener("click",function(){
  console.log('toto');
  chrome.tabs.getSelected(null, function(tab) {
    // Send a request to the content script.
    chrome.tabs.sendRequest(tab.id, {action: "getDOM"}, function(response) {
      console.log(response.dom);
    });
  });
});

window.addEventListener("load",function(){
  var port = chrome.extension.connect({name: "Popup Communication"});
  port.postMessage("popup_loaded");
  port.onMessage.addListener(function(msg) {
          console.log("message recieved"+ msg);
  });
});
