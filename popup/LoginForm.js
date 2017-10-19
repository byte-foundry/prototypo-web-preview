window.addEventListener('load', () => {
  const form = document.querySelector('.prototypo-login-form');
  const errorElement = document.querySelector('.prototypo-login-form-error');

  const render = ({ error }) => {
    errorElement.innerText = '';

    if (error) {
      errorElement.innerText = error;
    }
  };

  // init

  form.addEventListener('submit', async e => {
    e.preventDefault();

    render({ loading: true });

    const email = e.target.email.value;
    const password = e.target.password.value;

    console.log('loading', email, password);

    const query = `
      mutation {
        authenticateEmailUser(email: "${email}", password: "${password}") {
          token
        }
      }
    `;

    const response = await fetch(
      'https://api.graph.cool/simple/v1/prototypo-new-dev',
      {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query }),
      },
    );

    const data = await response.json();

    if (data.errors) {
      render({ error: data.errors[0].functionError });

      return;
    }

    chrome.storage.local.set({ token: data.data.authenticateEmailUser.token });
  });
});
