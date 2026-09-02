/**
 * Landing page: the service picker, the job request form, and the strip of
 * recently listed professionals.
 */
(function () {
  'use strict';

  var TC = window.TC;

  /* --- Service picker ---------------------------------------------------- */

  var serviceSelect = document.getElementById('service');
  var pills = Array.prototype.slice.call(document.querySelectorAll('[data-service]'));

  function selectService(name) {
    if (serviceSelect) serviceSelect.value = name;
    pills.forEach(function (pill) {
      var active = pill.dataset.service === name;
      pill.classList.toggle('selected', active);
      pill.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  pills.forEach(function (pill) {
    pill.addEventListener('click', function () {
      selectService(pill.dataset.service);
    });
  });

  if (serviceSelect) {
    serviceSelect.addEventListener('change', function () {
      selectService(serviceSelect.value);
    });
  }

  /* --- Job request form -------------------------------------------------- */

  var form = document.getElementById('jobForm');
  var alertBox = document.getElementById('formAlert');
  var success = document.getElementById('success');

  if (form) {
    form.addEventListener('submit', async function (event) {
      event.preventDefault();

      var submit = form.querySelector('button[type="submit"]');
      TC.clearFieldErrors(form);
      TC.hideAlert(alertBox);
      if (success) success.hidden = true;

      var payload = {
        service: (serviceSelect && serviceSelect.value) || '',
        area: form.area.value,
        contactName: form.contactName.value,
        contactEmail: form.contactEmail.value,
        details: form.details.value,
        urgency: form.urgency.value
      };

      TC.setBusy(submit, true);
      var result = await TC.api('/api/requests', { method: 'POST', body: payload });
      TC.setBusy(submit, false);

      if (!result.ok) {
        if (result.data.errors) {
          TC.applyFieldErrors(form, result.data.errors);
          TC.showAlert(alertBox, result.data.error || 'Please check the highlighted fields.');
        } else {
          TC.showAlert(alertBox, result.data.error || 'We couldn’t send that just now. Please try again.');
        }
        return;
      }

      form.reset();
      selectService('');

      if (success) {
        // Say something true: how many listed pros actually match this trade.
        var count = result.data.matchCount || 0;
        var area = payload.area;
        success.textContent =
          count > 0
            ? 'Request received. We’re contacting ' +
              count +
              ' listed ' +
              payload.service.toLowerCase() +
              (count === 1 ? '' : 's') +
              ' who cover ' +
              area +
              '.'
            : 'Request received. No ' +
              payload.service.toLowerCase() +
              ' is listed for ' +
              area +
              ' yet, so we’ll reach out as soon as one joins.';
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  /* --- Recently listed professionals ------------------------------------- */

  var featured = document.getElementById('featuredPros');

  async function loadFeatured() {
    if (!featured) return;

    var result = await TC.api('/api/pros?limit=3');
    featured.setAttribute('aria-busy', 'false');
    featured.innerHTML = '';

    var pros = Array.isArray(result.data.pros) ? result.data.pros : [];

    if (!result.ok || pros.length === 0) {
      var cell = TC.element('li');
      cell.style.gridColumn = '1 / -1';
      var panel = TC.element('div', 'state-panel');

      if (!result.ok) {
        // Don't dress a failed request up as "no pros yet" — say what happened.
        panel.appendChild(TC.element('h3', null, 'Listings aren’t loading'));
        panel.appendChild(
          TC.element('p', null, 'We couldn’t fetch professionals just now. You can still post a job below and we’ll match it.')
        );
      } else {
        // An empty directory is the expected state on a new site, not an error.
        panel.appendChild(TC.element('h3', null, 'The directory is just getting started'));
        panel.appendChild(
          TC.element(
            'p',
            null,
            'No professionals have published a profile yet. If you work in a trade, yours could be the first one homeowners see.'
          )
        );
        var link = TC.element('a', 'button button-primary', 'List your trade');
        link.href = 'for-pros.html';
        panel.appendChild(link);
      }

      cell.appendChild(panel);
      featured.appendChild(cell);
      return;
    }

    pros.forEach(function (pro) {
      featured.appendChild(TC.proCard(pro));
    });
  }

  loadFeatured();
})();
