// (
//   () => {

//     console.log("Welcome.js successfully loaded!");

//     const F = window.FinnsWorld;
//     const form = document.getElementById('login-form');
//     const card = document.getElementById('login-card');
//     const logged = document.getElementById('logged-in-card');
//     const msg = document.getElementById('login-message');

//     function showLoggedInView(user) {
//         card.classList.add('hidden');
//         logged.classList.remove('hidden');

//         document.getElementById('logged-in-user').textContent =
//             `Signed in as ${user.username}. Your workspace is now available.`;
//     }

//     function showLoginView() {
//         logged.classList.add('hidden');
//         card.classList.remove('hidden');

//         msg.textContent =
//             'Use the account configured in the backend .env file.';

//         msg.style.color = '#8aa0b6';
//     }





//     form?.addEventListener('submit', async e => {
//       e.preventDefault();

//       msg.textContent = 'Checking credentials…';

//       try {
//         const user = await F.request('/auth/login', {
//           method: 'POST',
//           body: {
//             username: document.getElementById('login-username').value.trim(),
//             password: document.getElementById('login-password').value
//           }
//         });

//         console.log("Login API response:", user);

//         // 1. Switch the login cards first
//         card.classList.add('hidden');
//         logged.classList.remove('hidden');

//         // 2. Display the logged-in user
//         document.getElementById('logged-in-user').textContent =
//           `Signed in as ${user.username}. Your workspace is now available.`;

//         // 3. Update global authentication state
//         showLoggedInView(user);
//         F.setAuthenticated(user);

//         F.toast('Login successful');

//       } catch (err) {
//         console.error("Login error:", err);

//         msg.textContent = err.message;
//         msg.style.color = '#b91c1c';

//         F.toast(err.message, 'error');
//       }
//     });

//     document.getElementById('enter-workspace')
//       ?.addEventListener('click', () => F.loadPage('cv'));

//   }
// )();



(() => {

    console.log("Welcome.js successfully loaded!");

    const F = window.FinnsWorld;

    const form = document.getElementById('login-form');
    const card = document.getElementById('login-card');
    const logged = document.getElementById('logged-in-card');
    const msg = document.getElementById('login-message');

    // Switch to logged-in view
    function showLoggedInView(user) {
        card.classList.add('hidden');
        logged.classList.remove('hidden');

        document.getElementById('logged-in-user').textContent =
            `Signed in as ${user.username}. Your workspace is now available.`;
    }

    // Switch to login view
    function showLoginView() {
        logged.classList.add('hidden');
        card.classList.remove('hidden');

        msg.textContent =
            'Use the account configured in the backend .env file.';

        msg.style.color = '#8aa0b6';
    }

    // Check existing authentication state
    const currentUser = F.getAuthenticatedUser();

    if (currentUser) {
        showLoggedInView(currentUser);
    } else {
        showLoginView();
    }

    // Login
    form?.addEventListener('submit', async e => {
        e.preventDefault();

        msg.textContent = 'Checking credentials…';
        msg.style.color = '#8aa0b6';

        try {
            const user = await F.request('/auth/login', {
                method: 'POST',
                body: {
                    username: document.getElementById('login-username').value.trim(),
                    password: document.getElementById('login-password').value
                }
            });

            console.log("Login API response:", user);

            // Update global authentication state
            F.setAuthenticated(user);

            // Switch cards
            showLoggedInView(user);

            F.toast('Login successful');

        } catch (err) {
            console.error("Login error:", err);

            msg.textContent = err.message;
            msg.style.color = '#b91c1c';

            F.toast(err.message, 'error');
        }
    });

    // Enter workspace
    document.getElementById('enter-workspace')
        ?.addEventListener('click', () => F.loadPage('cv'));

})();
