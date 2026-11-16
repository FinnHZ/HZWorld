(() => {
  const API_BASE = window.FINNS_WORLD_API_BASE || 'http://127.0.0.1:5000/api';
  const host = document.getElementById('page-container');
  const navItems = [...document.querySelectorAll('.nav-item')];
  const authStatus = document.getElementById('auth-status');
  const logoutBtn = document.getElementById('logout-btn');
  // let currentPage = null;
  // let currentScript = null;
  // let currentStyle = null;
  let currentPage = null;
  let currentScript = null;
  let currentStyle = null;
  let currentUser = null;


  window.FinnsWorld = {
    API_BASE,
    currentUser: null,  // !!!!Global authenticated user information
    async request(path, options = {}) {
      const config = {...options, credentials: 'include', headers: {...(options.headers || {})}};
      if (config.body && !(config.body instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(config.body);
      }
      const response = await fetch(`${API_BASE}${path}`, config);
      let payload = null;
      try { payload = await response.json(); } catch (_) {}
      if (!response.ok || payload?.success === false) {
        const message = payload?.message || `Request failed (${response.status})`;
        const error = new Error(message); error.status = response.status; throw error;
      }
      return payload?.data ?? payload;
    },
    toast(message, type = 'success') {
      const el = document.createElement('div'); el.className = `toast ${type === 'error' ? 'error' : ''}`; el.textContent = message;
      document.getElementById('toast-stack').appendChild(el); setTimeout(() => el.remove(), 3200);
    },
    escape(value) { return String(value ?? '').replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); },

    setAuthenticated(user) {
        currentUser = user || null;

        // IMPORTANT: Synchronise the global authenticated user.
        window.FinnsWorld.currentUser = currentUser;

        const enabled = !!currentUser;
        const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
        // navItems.forEach(item => {
        //     const page = item.dataset.page;
        //     const allowed = page === 'welcome' || (enabled && (page !== 'everyday' || isAdmin));
        //     item.disabled = !allowed;
        //     item.hidden = page === 'everyday' && !isAdmin;
        //     item.classList.toggle('locked', !allowed);
        // });

        navItems.forEach(item => {
              const page = item.dataset.page;

              if (page === 'welcome') {
                  item.disabled = false;
                  return;
              }

              if (page === 'everyday') {
                  // Everyone can see and click Everyday
                  item.hidden = false;
                  item.disabled = false;

                  // Show lock for non-admin users
                  item.classList.toggle('locked', !isAdmin);

                  const lock = item.querySelector('.lock');
                  if (lock) {
                      lock.classList.toggle('hidden', isAdmin);
                  }

                  return;
              }

            // Other pages retain original authentication logic
            item.disabled = !enabled;
            item.classList.toggle('locked', !enabled);
        });

        // authStatus.textContent = enabled
        //     ? `${currentUser.username} · ${currentUser.role}`
        //     : 'Please login';


        if (authStatus) {
          authStatus.textContent = enabled
              ? `${currentUser.username} · ${currentUser.role}`
              : 'Please login';
}


        document.querySelector('.status-dot')
            ?.classList.toggle('online', enabled);

        // logoutBtn.classList.toggle('hidden', !enabled);
        logoutBtn?.classList.toggle('hidden', !enabled);

      },

    getAuthenticatedUser() {
        return currentUser;
    },
    
    async loadPage(page, push = true) {
      const isAdmin = String(currentUser?.role || '').toLowerCase() === 'admin';
      if (page === 'everyday' && !isAdmin) {
        window.alert('Permission Required');
        await this.loadPage('welcome', false);
        return;
      }
      if (page !== 'welcome' && !currentUser) {
        window.alert('Please login first.');
        await this.loadPage('welcome', false);
        return;
      }
      if (page !== 'welcome' && navItems.find(x => x.dataset.page === page)?.disabled) return;
      if (window.FinnsWorldEverydayCleanup) window.FinnsWorldEverydayCleanup();
      if (currentScript) { currentScript.remove(); currentScript = null; }
      if (currentStyle) { currentStyle.remove(); currentStyle = null; }
      host.classList.add('loading');
      try {
        const html = await fetch(`pages/${page}.html`).then(r => { if (!r.ok) throw new Error(`Cannot load ${page}.html`); return r.text(); });
        const tpl = document.createElement('template'); tpl.innerHTML = html;
        const fragment = tpl.content;
        const scriptPath = fragment.querySelector('[data-page-script]')?.dataset.pageScript;
        const stylePath = fragment.querySelector('[data-page-style]')?.dataset.pageStyle;
        fragment.querySelectorAll('[data-page-script],[data-page-style]').forEach(
          n => {
            n.removeAttribute('data-page-script');
            n.removeAttribute('data-page-style');
          } 
        );
        host.replaceChildren(fragment);
        if (stylePath) { currentStyle = document.createElement('link'); currentStyle.rel='stylesheet'; currentStyle.href=new URL(stylePath, new URL(`pages/${page}.html`, document.baseURI)).href; document.head.appendChild(currentStyle); }
        currentPage = page;
        navItems.forEach(item => item.classList.toggle('active', item.dataset.page === page));
        if (push) history.replaceState({page}, '', `#${page}`);
        if (scriptPath) await new Promise((resolve,reject) => { currentScript=document.createElement('script'); currentScript.src=new URL(scriptPath, new URL(`pages/${page}.html`, document.baseURI)).href; currentScript.onload=resolve; currentScript.onerror=reject; document.body.appendChild(currentScript); });
      } catch (error) { host.innerHTML = `<section class="error-page"><h2>Unable to load page</h2><p>${window.FinnsWorld.escape(error.message)}</p><button onclick="location.reload()">Retry</button></section>`; }
      finally { host.classList.remove('loading'); }
    }
  };

  navItems.forEach(item => item.addEventListener('click', () => window.FinnsWorld.loadPage(item.dataset.page)));
  // logoutBtn.addEventListener('click', async () => { try { await window.FinnsWorld.request('/auth/logout',{method:'POST'}); window.FinnsWorld.setAuthenticated(null); await window.FinnsWorld.loadPage('welcome'); } catch(e){ window.FinnsWorld.toast(e.message,'error'); } });
  logoutBtn.addEventListener('click', async () => {
    try {
        await window.FinnsWorld.request('/auth/logout', {
            method: 'POST'
        });

        window.FinnsWorld.setAuthenticated(null);

        await window.FinnsWorld.loadPage('welcome');

        window.FinnsWorld.toast('Logged out successfully');

    } catch(e) {
        window.FinnsWorld.toast(e.message, 'error');
    }
  });
  
  window.addEventListener('popstate', () => window.FinnsWorld.loadPage(location.hash.slice(1) || 'welcome', false));

  // (async () => {
  //   let user = null;
  //   try { user = await window.FinnsWorld.request('/auth/me'); } catch (_) {}
  //   window.FinnsWorld.setAuthenticated(user);
  //   const requested = location.hash.slice(1) || 'welcome';
  //   const isAdmin = String(user?.role || '').toLowerCase() === 'admin';
  //   const permitted = user && (['cv','lotto','calendar-note'].includes(requested) || (requested === 'everyday' && isAdmin));
  //   if (requested === 'everyday' && !isAdmin && user) window.alert('Permission Required');
  //   await window.FinnsWorld.loadPage(permitted ? requested : 'welcome', false);
  // })();
  (async () => {
      let user = null;

      // Restore login session
      try {
          user = await window.FinnsWorld.request('/auth/me');
      } catch (error) {
          console.log('No active login session:', error.message);
      }

      window.FinnsWorld.setAuthenticated(user);

      const requested = location.hash.slice(1) || 'welcome';

      // Always allow Welcome
      if (requested === 'welcome') {
          await window.FinnsWorld.loadPage('welcome', false);
          return;
      }

      // Everyday: Admin only
      if (requested === 'everyday') {
          if (String(user?.role || '').toLowerCase() !== 'admin') {
              window.alert('Permission Required');
              await window.FinnsWorld.loadPage('welcome', false);
              return;
          }

          await window.FinnsWorld.loadPage('everyday', false);
          return;
      }

      // Other pages require login
      if (!user) {
          await window.FinnsWorld.loadPage('welcome', false);
          return;
      }

      const allowedPages = [
          'cv',
          'lotto',
          'calendar-note'
      ];

      if (allowedPages.includes(requested)) {
          await window.FinnsWorld.loadPage(requested, false);
      } else {
          await window.FinnsWorld.loadPage('welcome', false);
      }
  })();
})();
