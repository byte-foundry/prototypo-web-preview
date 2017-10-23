window.addEventListener('load', () => {
  const loaderElement = document.querySelector('.prototypo-loader');
  const loginElement = document.querySelector('.prototypo-login');
  const mainElement = document.querySelector('.prototypo-magic');

  const render = ({ loading = false, hasToken = false }) => {
    mainElement.style.display = hasToken && !loading ? '' : 'none';
    loginElement.style.display = !hasToken && !loading ? '' : 'none';
    loaderElement.style.display = loading ? '' : 'none';
  };

  // init

  render({ loading: true });

  document.querySelector('.prototypo-login-create-link').addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.prototypo.io/#/signin' });
  })

  chrome.storage.local.get('token', async ({ token }) => {
    if (!token) {
      render({ loading: false, hasToken: false });
      return;
    }

    const query = `
      {
        user {
          id
        }
      }
    `;

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

    if (data.errors) {
      render({ loading: false, hasToken: false });
      return;
    }

    render({ loading: false, hasToken: true });
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.token && changes.token.newValue) {
      render({ loading: false, hasToken: true });
    }
    else if (areaName === 'local' && changes.token && changes.token.oldValue) {
      render({ loading: false, hasToken: false });
    }
  });
});
