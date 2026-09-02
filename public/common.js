/**
 * Shared behaviour for every page: the decorative cursor glow, scroll reveals,
 * a small fetch wrapper, and the form helpers the three page scripts reuse.
 *
 * Exposed on `window.TC` because the site loads plain <script> tags with no
 * bundler or module graph.
 */
(function () {
  'use strict';

  /** Trades must match lib/shared.ts — the server rejects anything else. */
  var TRADES = [
    'Plumber',
    'Electrician',
    'Handyman',
    'Painter',
    'Roofer',
    'Carpenter',
    'Tiler',
    'Locksmith',
    'Appliance repair',
    'Garden & outdoor',
    'Heating & cooling'
  ];

  /**
   * JSON fetch that never throws. Callers get a uniform shape so every screen
   * can distinguish "worked", "rejected with field errors" and "network died".
   */
  async function api(path, options) {
    var settings = options || {};
    try {
      var response = await fetch(path, {
        method: settings.method || 'GET',
        headers: settings.body ? { 'Content-Type': 'application/json' } : undefined,
        body: settings.body ? JSON.stringify(settings.body) : undefined,
        credentials: 'same-origin'
      });

      var data = null;
      try {
        data = await response.json();
      } catch (error) {
        data = null;
      }

      return { ok: response.ok, status: response.status, data: data || {} };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        data: { error: 'We couldn’t reach the server. Check your connection and try again.' },
        offline: true
      };
    }
  }

  /** Toggle a button's spinner without changing its width. */
  function setBusy(button, busy) {
    if (!button) return;
    if (busy) {
      button.dataset.busy = 'true';
      button.setAttribute('aria-disabled', 'true');
    } else {
      delete button.dataset.busy;
      button.removeAttribute('aria-disabled');
    }
  }

  function showAlert(element, message, kind) {
    if (!element) return;
    element.textContent = message;
    element.className = 'form-alert form-alert-' + (kind || 'error');
    element.hidden = false;
  }

  function hideAlert(element) {
    if (!element) return;
    element.hidden = true;
    element.textContent = '';
  }

  /** Remove any error text and invalid state left over from a previous submit. */
  function clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.field-error').forEach(function (node) {
      node.remove();
    });
    form.querySelectorAll('[aria-invalid="true"]').forEach(function (field) {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    });
  }

  /**
   * Paint server-side validation errors next to the fields they belong to and
   * move focus to the first one, so keyboard and screen-reader users are taken
   * straight to the problem.
   */
  function applyFieldErrors(form, errors) {
    if (!form || !errors) return null;
    var first = null;

    Object.keys(errors).forEach(function (name) {
      var field = form.querySelector('[name="' + name + '"]');
      if (!field) return;

      field.setAttribute('aria-invalid', 'true');
      var message = document.createElement('span');
      message.className = 'field-error';
      message.id = name + '-error';
      message.textContent = errors[name];
      field.setAttribute('aria-describedby', message.id);
      (field.closest('label') || field.parentNode).appendChild(message);

      if (!first) first = field;
    });

    if (first) first.focus();
    return first;
  }

  /** Two initials from a display name, for the avatar squares in the directory. */
  function initials(name) {
    var parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return 'TC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** All directory content is user-submitted, so it is only ever set as text. */
  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function icon(id, className) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', className || 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }

  /** Scroll reveals: any .reveal element gains .in-view when it comes into frame. */
  function initReveals() {
    var targets = document.querySelectorAll('.reveal');
    if (targets.length === 0) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach(function (node) {
        node.classList.add('in-view');
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    targets.forEach(function (node) {
      observer.observe(node);
    });
  }

  /** Decorative pointer halo. Skipped entirely when motion is reduced. */
  function initCursorGlow() {
    var glow = document.querySelector('.cursor-glow');
    if (!glow) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      glow.remove();
      return;
    }

    window.addEventListener(
      'pointermove',
      function (event) {
        glow.style.transform = 'translate(' + (event.clientX - 130) + 'px, ' + (event.clientY - 130) + 'px)';
      },
      { passive: true }
    );
  }

  /**
   * A single directory card. Used by both the landing page's featured strip
   * and the full directory, so the two can never drift apart.
   */
  function proCard(pro) {
    var item = element('li', 'pro-card');

    var top = element('div', 'pro-card-top');
    top.appendChild(element('span', 'pro-initials', initials(pro.displayName)));

    var heading = element('div');
    heading.appendChild(element('h3', null, pro.displayName));
    heading.appendChild(element('p', 'pro-trade', pro.trade));
    top.appendChild(heading);
    item.appendChild(top);

    if (pro.bio) item.appendChild(element('p', 'pro-bio', pro.bio));

    var meta = element('div', 'pro-meta');
    if (pro.serviceArea) meta.appendChild(element('span', 'pro-tag pro-tag-strong', pro.serviceArea));
    if (pro.yearsExperience > 0) {
      meta.appendChild(
        element('span', 'pro-tag', pro.yearsExperience + (pro.yearsExperience === 1 ? ' year' : ' years'))
      );
    }
    if (pro.calloutFee > 0) {
      meta.appendChild(element('span', 'pro-tag', 'Call-out R' + pro.calloutFee));
    }
    if (pro.qualifications) meta.appendChild(element('span', 'pro-tag', pro.qualifications));
    if (meta.childNodes.length > 0) item.appendChild(meta);

    return item;
  }

  window.TC = {
    TRADES: TRADES,
    api: api,
    proCard: proCard,
    setBusy: setBusy,
    showAlert: showAlert,
    hideAlert: hideAlert,
    clearFieldErrors: clearFieldErrors,
    applyFieldErrors: applyFieldErrors,
    initials: initials,
    element: element,
    icon: icon
  };

  initReveals();
  initCursorGlow();
})();
