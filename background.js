// set the badge background color
chrome.browserAction.setBadgeBackgroundColor({ color: '#23d390' });

chrome.browserAction.onClicked.addListener(function(tab) { alert('icon clicked')});

// listening to messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.action) {
    // update badge count
    case 'store_element':
      storeElement(
        request.message.selector,
        request.message.font,
        sender.tab ? sender.tab.id : request.message.tabId,
      );
      break;
    case 'update_badge_count':
      updateBadgeCount(sender.tab ? sender.tab.id : request.message.tabId);
      break;
    default:
      sendResponse(
        'default response from background (unrecognized request action)',
      );
  }
});

/**
*	Stores the selected element in chrome storage
* @param {string} selector - concerned selector stored as a string
* @param {string} font - concerned font stored as a string
*/
function storeElement(selector, font, tabId) {
  var isStored = false;
  chrome.storage.local.get({ selectedElements: [] }, ({ selectedElements }) => {
    // look up the array to see if selector is already in
    selectedElements.forEach(element => {
      if (element) {
        // if the selector was already in the array
        if (element.selector === selector && element.tabId === tabId) {
          isStored = true;
          element.font = font;
        }
      }
    });
    // if the selector was not present, add it
    if (!isStored) {
      selectedElements.push({ selector: selector, font: font, tabId });
    }

    chrome.storage.local.set({ selectedElements });
    updateBadgeCount(tabId);
  });
}

/**
* Update badge count
*/
function updateBadgeCount(tabId) {
  // set the number of the current tab's badge
  chrome.storage.local.get({ selectedElements: [] }, function(data) {
    const selectedElementsInTab = data.selectedElements.filter(
      element => element.tabId === tabId,
    );
    chrome.browserAction.setBadgeText({
      text:
        selectedElementsInTab.length > 0
          ? selectedElementsInTab.length.toString()
          : '',
      tabId: tabId,
    });
  });
}

var iframe = document.createElement('iframe');
// Must be declared at web_accessible_resources in manifest.json
iframe.src = 'http://localhost:5000/iframe.html';
document.body.appendChild(iframe);

window.addEventListener('message', function(event) {
  const font = event.data;

  const blob = new Blob([font.source], { type: 'application/octet-stream' });
  font.source = URL.createObjectURL(blob); // Chrome only?

  // TODO: send to all pages that have this font

  chrome.tabs.query({}, tabs => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'update_font', font });
    });
  });
});

// Socket client to subscribe to changes
const wsClient = new SubscriptionsTransportWs.SubscriptionClient(
  `wss://subscriptions.graph.cool/v1/prototypo-new-dev`,
  {
    reconnect: true,
  },
);

function loadAndConnect() {
  chrome.storage.local.get('token', async ({ token }) => {
    if (!token) {
      return;
    }

    const query = `{
			user {
				id
				email
				library {
					id
          name
          template
					variants {
						id
						name
						values
					}
				}
			}
		}`;

    // until graphql-request UMD is available
    const response = await fetch(
      'https://api.graph.cool/simple/v1/prototypo-new-dev',
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({ query: query }),
      },
    );

    const data = await response.json();
    const { data: { user }, errors } = data;

    if (errors) {
      console.error('Login error. What should we do?');
      return;
    }

    // const gqlClient = new GraphQLClient('https://api.graph.cool/simple/v1/prototypo-new-dev', {
    // 	headers: {
    // 		Authorization: 'Bearer ' + token,
    // 	},
    // });

    // const {user} = await gqlClient.request(query);

    chrome.storage.local.set({ user });

    wsClient.unsubscribeAll();
    wsClient
      .request({
        query: `
					subscription getVariants {
						Variant(filter: {
							node: {family: {owner: {id: "${user.id}"}}}
						}) {
							mutation
							node {
								id
								name
								values
								family {
									id
									name
									template
								}
							}
						}
					}
				`,
      })
      .subscribe({
        next: ({ data }) => {
          const variant = data.Variant.node;
          const family = user.library.find(
            family => family.id === variant.family.id,
          );

          if (!family) {
            return;
          }

          switch (data.Variant.mutation) {
            case 'CREATED':
              family.variants.push({
                id: variant.id,
                name: variant.name,
                values: variant.values,
              });
              chrome.storage.local.set({ user });
              break;
            case 'UPDATED':
              family.variants = family.variants.filter(
                v => v.id !== variant.id,
              );
              family.variants.push({
                id: variant.id,
                name: variant.name,
                values: variant.values,
              });
              chrome.storage.local.set({ user });

              // TODO: check if the font is used
              buildFont(
                variant.id,
                variant.family.name + ' ' + variant.name,
                variant.family.template,
                variant.values,
              );
              break;
            case 'DELETED':
              family.variants = family.variants.filter(
                v => v.id !== variant.id,
              );
              chrome.storage.local.set({ user });

              // TODO: send a message to content scripts to remove the fonts
              break;
          }
        },
        error: err => console.log('error', err),
      });
  });
}

loadAndConnect();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    if (changes.token) {
      chrome.storage.local.remove('user');
      if (changes.token.newValue) {
        loadAndConnect();
      }
    }

    if (changes.selectedElements && changes.selectedElements.newValue) {
      chrome.storage.local.get('selectedFont', ({ selectedFont }) => {
        if (selectedFont) {
          buildCachedFont(selectedFont.id);
        }
      });
    }
  }
});

function buildCachedFont(variantId) {
  chrome.storage.local.get('user', ({ user }) => {
    user.library.find(family => {
      const variant = family.variants.find(variant => {
        if (variant.id === variantId) {
          return true;
        }
      });

      if (variant) {
        buildFont(
          variant.id,
          family.name + ' ' + variant.name,
          family.template,
          variant.values,
        );
        return true;
      }

      return false;
    });
  });
}

function buildFont(id, name, template, values) {
  iframe.contentWindow.postMessage(
    {
      id,
      name,
      values,
      template,
    },
    '*',
  );
}
