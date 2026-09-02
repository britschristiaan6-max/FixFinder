/**
 * The pro portal. Two states in one page: signup / sign in when there is no
 * session, and the profile editor when there is.
 *
 * All Identity calls happen in netlify/functions/auth.mts — this file only ever
 * talks to our own API, which is why the page needs no auth SDK in the browser.
 */
(function () {
  'use strict';

  var TC = window.TC;

  var loading = document.getElementById('portalLoading');
  var signedOutView = document.getElementById('signedOutView');
  var signedInView = document.getElementById('signedInView');

  var authAlert = document.getElementById('authAlert');
  var signupForm = document.getElementById('signupForm');
  var loginForm = document.getElementById('loginForm');
  var tabSignup = document.getElementById('tabSignup');
  var tabLogin = document.getElementById('tabLogin');

  var navAccount = document.getElementById('navAccount');
  var navAccountName = document.getElementById('navAccountName');
  var signOutButton = document.getElementById('signOutButton');

  var profileForm = document.getElementById('profileForm');
  var profileAlert = document.getElementById('profileAlert');
  var tradeSelect = document.getElementById('trade');
  var bioField = document.getElementById('bio');
  var bioCount = document.getElementById('bioCount');
  var saveState = document.getElementById('saveState');
  var checklist = document.getElementById('profileChecklist');
  var statusBadge = document.getElementById('statusBadge');
  var statusBadgeText = document.getElementById('statusBadgeText');
  var statusTitle = document.getElementById('statusTitle');
  var statusCopy = document.getElementById('statusCopy');

  /* --- View switching ---------------------------------------------------- */

  function showView(name) {
    if (loading) loading.hidden = name !== 'loading';
    if (signedOutView) signedOutView.hidden = name !== 'signedOut';
    if (signedInView) signedInView.hidden = name !== 'signedIn';
  }

  function setTab(which) {
    var signup = which === 'signup';
    if (tabSignup) tabSignup.setAttribute('aria-selected', signup ? 'true' : 'false');
    if (tabLogin) tabLogin.setAttribute('aria-selected', signup ? 'false' : 'true');
    if (signupForm) signupForm.hidden = !signup;
    if (loginForm) loginForm.hidden = signup;
    TC.hideAlert(authAlert);
  }

  if (tabSignup) tabSignup.addEventListener('click', function () { setTab('signup'); });
  if (tabLogin) tabLogin.addEventListener('click', function () { setTab('login'); });

  /* --- Signup and sign in ------------------------------------------------ */

  async function submitAuth(form, endpoint, payload, onSuccess) {
    var submit = form.querySelector('button[type="submit"]');
    TC.clearFieldErrors(form);
    TC.hideAlert(authAlert);
    TC.setBusy(submit, true);

    var result = await TC.api('/api/auth/' + endpoint, { method: 'POST', body: payload });
    TC.setBusy(submit, false);

    if (!result.ok) {
      if (result.data.errors) TC.applyFieldErrors(form, result.data.errors);
      TC.showAlert(authAlert, result.data.error || 'That didn’t work. Please try again.');
      return;
    }

    onSuccess(result.data);
  }

  if (signupForm) {
    signupForm.addEventListener('submit', function (event) {
      event.preventDefault();
      submitAuth(
        signupForm,
        'signup',
        {
          displayName: signupForm.displayName.value,
          email: signupForm.email.value,
          password: signupForm.password.value
        },
        function (data) {
          if (data.needsConfirmation) {
            // Email confirmation is on, so the account exists but isn't logged in.
            signupForm.reset();
            TC.showAlert(
              authAlert,
              'Account created. Check ' +
                (data.user && data.user.email ? data.user.email : 'your inbox') +
                ' for a confirmation link, then sign in.',
              'info'
            );
            return;
          }
          // Autoconfirm is on: the cookie is set, so reload into the editor.
          window.location.reload();
        }
      );
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', function (event) {
      event.preventDefault();
      submitAuth(
        loginForm,
        'login',
        { email: loginForm.email.value, password: loginForm.password.value },
        function () {
          // Full navigation so the browser picks up the new session cookie.
          window.location.reload();
        }
      );
    });
  }

  if (signOutButton) {
    signOutButton.addEventListener('click', async function () {
      signOutButton.disabled = true;
      await TC.api('/api/auth/logout', { method: 'POST', body: {} });
      window.location.href = 'for-pros.html';
    });
  }

  /* --- Profile editor ---------------------------------------------------- */

  function buildTradeOptions() {
    if (!tradeSelect) return;
    tradeSelect.appendChild(new Option('Choose your trade', ''));
    TC.TRADES.forEach(function (trade) {
      tradeSelect.appendChild(new Option(trade, trade));
    });
  }

  function fillForm(profile) {
    if (!profileForm || !profile) return;
    profileForm.displayName.value = profile.displayName || '';
    profileForm.trade.value = profile.trade || '';
    profileForm.serviceArea.value = profile.serviceArea || '';
    profileForm.town.value = profile.town || '';
    profileForm.phone.value = profile.phone || '';
    profileForm.bio.value = profile.bio || '';
    profileForm.qualifications.value = profile.qualifications || '';
    profileForm.yearsExperience.value = profile.yearsExperience || '';
    profileForm.calloutFee.value = profile.calloutFee || '';
    profileForm.published.checked = Boolean(profile.published);
  }

  function readForm() {
    return {
      displayName: profileForm.displayName.value,
      trade: profileForm.trade.value,
      serviceArea: profileForm.serviceArea.value,
      town: profileForm.town.value,
      phone: profileForm.phone.value,
      bio: profileForm.bio.value,
      qualifications: profileForm.qualifications.value,
      yearsExperience: profileForm.yearsExperience.value,
      calloutFee: profileForm.calloutFee.value,
      published: profileForm.published.checked
    };
  }

  /** Reflect the live form values in the sidebar checklist and status card. */
  function updateStatus() {
    if (!profileForm) return;
    var values = readForm();

    var done = {
      basics: values.displayName.trim().length > 1 && Boolean(values.trade),
      area: values.serviceArea.trim().length > 1,
      bio: values.bio.trim().length >= 40,
      contact: values.phone.replace(/\D/g, '').length >= 9,
      published: values.published
    };

    if (checklist) {
      checklist.querySelectorAll('li').forEach(function (item) {
        item.dataset.done = done[item.dataset.key] ? 'true' : 'false';
      });
    }

    var live = values.published;
    if (statusBadge) statusBadge.className = 'status-badge ' + (live ? 'status-live' : 'status-draft');
    if (statusBadgeText) statusBadgeText.textContent = live ? 'Listed publicly' : 'Not listed yet';

    if (statusTitle && statusCopy) {
      if (live) {
        statusTitle.textContent = 'You’re in the directory';
        statusCopy.textContent = 'Homeowners searching your trade and area can find you now.';
      } else {
        statusTitle.textContent = 'Finish your profile';
        statusCopy.textContent = 'Complete the steps below and tick the publish box to appear in the directory.';
      }
    }

    if (bioCount) bioCount.textContent = String(values.bio.trim().length);
  }

  if (profileForm) {
    profileForm.addEventListener('input', updateStatus);
    profileForm.addEventListener('change', updateStatus);

    profileForm.addEventListener('submit', async function (event) {
      event.preventDefault();

      var submit = profileForm.querySelector('button[type="submit"]');
      TC.clearFieldErrors(profileForm);
      TC.hideAlert(profileAlert);
      if (saveState) saveState.textContent = '';
      TC.setBusy(submit, true);

      var result = await TC.api('/api/profile', { method: 'PUT', body: readForm() });
      TC.setBusy(submit, false);

      if (!result.ok) {
        if (result.status === 401) {
          TC.showAlert(profileAlert, 'Your session expired. Sign in again to keep editing.');
          window.setTimeout(function () { window.location.reload(); }, 1800);
          return;
        }
        if (result.data.errors) TC.applyFieldErrors(profileForm, result.data.errors);
        TC.showAlert(profileAlert, result.data.error || 'We couldn’t save that. Please try again.');
        return;
      }

      fillForm(result.data.profile);
      updateStatus();
      TC.showAlert(
        profileAlert,
        result.data.profile && result.data.profile.published
          ? 'Saved. Your profile is live in the directory.'
          : 'Saved as a draft. Tick the publish box when you’re ready to be listed.',
        'success'
      );
      if (saveState) {
        saveState.textContent =
          'Last saved ' +
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    });
  }

  if (bioField) {
    bioField.addEventListener('input', function () {
      if (bioCount) bioCount.textContent = String(bioField.value.trim().length);
    });
  }

  /* --- Boot -------------------------------------------------------------- */

  /**
   * Confirmation and recovery links come back with the token in the URL hash.
   * Handle it before checking the session, then strip it from the address bar.
   */
  async function handleAuthCallback() {
    var hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;

    var params = new URLSearchParams(hash);
    var token = params.get('confirmation_token');
    if (!token) return;

    var result = await TC.api('/api/auth/confirm', { method: 'POST', body: { token: token } });
    window.history.replaceState({}, '', window.location.pathname);

    if (!result.ok) {
      showView('signedOut');
      setTab('login');
      TC.showAlert(
        authAlert,
        result.data.error || 'That confirmation link has expired. Sign in, or create the account again.'
      );
      throw new Error('confirmation-failed');
    }
  }

  async function boot() {
    buildTradeOptions();
    showView('loading');

    try {
      await handleAuthCallback();
    } catch (error) {
      return; // handleAuthCallback already rendered the failure.
    }

    var session = await TC.api('/api/auth/me');
    var user = session.data && session.data.user;

    if (!user) {
      showView('signedOut');
      setTab('signup');
      return;
    }

    if (navAccount) navAccount.hidden = false;
    if (navAccountName) navAccountName.textContent = user.email || '';

    var profileResult = await TC.api('/api/profile');
    showView('signedIn');

    if (profileResult.ok && profileResult.data.profile) {
      fillForm(profileResult.data.profile);
    } else if (!profileResult.ok) {
      TC.showAlert(
        profileAlert,
        profileResult.data.error || 'We couldn’t load your saved profile. You can still edit and save below.'
      );
    } else {
      // First visit after signup — seed the name they registered with.
      if (user.name && profileForm) profileForm.displayName.value = user.name;
    }

    updateStatus();
  }

  boot();
})();
