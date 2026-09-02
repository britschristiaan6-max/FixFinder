/**
 * The public directory: trade filters, a debounced search, and the result grid.
 * Filter state is mirrored into the URL so a filtered view can be linked to —
 * which is what the "Popular right now" links on the landing page rely on.
 */
(function () {
  'use strict';

  var TC = window.TC;

  var filterList = document.getElementById('tradeFilters');
  var searchInput = document.getElementById('proSearch');
  var results = document.getElementById('proResults');
  var countLabel = document.getElementById('resultsCount');
  var statePanel = document.getElementById('proState');

  var activeTrade = '';
  var searchTerm = '';
  var searchTimer = null;
  var requestToken = 0;

  /* --- Filters ----------------------------------------------------------- */

  function buildFilters() {
    if (!filterList) return;

    [''].concat(TC.TRADES).forEach(function (trade) {
      var item = TC.element('li');
      var button = TC.element('button', null, trade || 'All trades');
      button.type = 'button';
      button.dataset.trade = trade;
      button.setAttribute('aria-pressed', trade === activeTrade ? 'true' : 'false');
      button.addEventListener('click', function () {
        activeTrade = trade;
        syncFilterButtons();
        writeUrl();
        load();
      });
      item.appendChild(button);
      filterList.appendChild(item);
    });
  }

  function syncFilterButtons() {
    if (!filterList) return;
    filterList.querySelectorAll('button').forEach(function (button) {
      button.setAttribute('aria-pressed', button.dataset.trade === activeTrade ? 'true' : 'false');
    });
  }

  function readUrl() {
    var params = new URLSearchParams(window.location.search);
    var trade = params.get('trade') || '';
    activeTrade = TC.TRADES.indexOf(trade) === -1 ? '' : trade;
    searchTerm = params.get('q') || '';
    if (searchInput) searchInput.value = searchTerm;
  }

  function writeUrl() {
    var params = new URLSearchParams();
    if (activeTrade) params.set('trade', activeTrade);
    if (searchTerm) params.set('q', searchTerm);
    var query = params.toString();
    window.history.replaceState({}, '', query ? '?' + query : window.location.pathname);
  }

  /* --- States ------------------------------------------------------------ */

  function showState(title, body, iconId, actionLabel, actionHref) {
    if (!statePanel) return;
    statePanel.innerHTML = '';

    var panel = TC.element('div', 'state-panel');
    var iconWrap = TC.element('div', 'state-icon' + (iconId === 'i-warn' ? ' warn' : ''));
    iconWrap.appendChild(TC.icon(iconId));
    panel.appendChild(iconWrap);
    panel.appendChild(TC.element('h3', null, title));
    panel.appendChild(TC.element('p', null, body));

    if (actionLabel) {
      if (actionHref) {
        var link = TC.element('a', 'button button-primary', actionLabel);
        link.href = actionHref;
        panel.appendChild(link);
      } else {
        var button = TC.element('button', 'button button-primary', actionLabel);
        button.type = 'button';
        button.addEventListener('click', function () {
          activeTrade = '';
          searchTerm = '';
          if (searchInput) searchInput.value = '';
          syncFilterButtons();
          writeUrl();
          load();
        });
        panel.appendChild(button);
      }
    }

    statePanel.appendChild(panel);
    statePanel.hidden = false;
  }

  function hideState() {
    if (!statePanel) return;
    statePanel.hidden = true;
    statePanel.innerHTML = '';
  }

  function skeletons(n) {
    if (!results) return;
    results.setAttribute('aria-busy', 'true');
    results.innerHTML = '';
    for (var i = 0; i < n; i += 1) {
      var card = TC.element('li', 'skeleton-card');
      card.setAttribute('aria-hidden', 'true');
      ['block', 'mid', 'short', 'wide', 'mid'].forEach(function (size) {
        card.appendChild(TC.element('div', 'skeleton-line ' + size));
      });
      results.appendChild(card);
    }
  }

  /* --- Loading ----------------------------------------------------------- */

  async function load() {
    if (!results) return;

    var token = requestToken + 1;
    requestToken = token;

    hideState();
    skeletons(4);
    if (countLabel) countLabel.textContent = 'Searching…';

    var params = new URLSearchParams();
    if (activeTrade) params.set('trade', activeTrade);
    if (searchTerm) params.set('q', searchTerm);
    var query = params.toString();

    var result = await TC.api('/api/pros' + (query ? '?' + query : ''));

    // A slower earlier request must not overwrite a newer one's results.
    if (token !== requestToken) return;

    results.setAttribute('aria-busy', 'false');
    results.innerHTML = '';

    if (!result.ok) {
      if (countLabel) countLabel.textContent = '';
      showState(
        'We couldn’t load the directory',
        result.data.error || 'Something went wrong fetching professionals. Try again in a moment.',
        'i-warn',
        'Retry'
      );
      return;
    }

    var pros = Array.isArray(result.data.pros) ? result.data.pros : [];

    if (pros.length === 0) {
      if (countLabel) countLabel.textContent = 'No matches';
      if (activeTrade || searchTerm) {
        showState(
          'Nobody matches that yet',
          'No published profile fits those filters. Try a wider search, or post your job and we’ll go looking.',
          'i-search',
          'Clear filters'
        );
      } else {
        showState(
          'The directory is just getting started',
          'No professionals have published a profile yet. If you work in a trade, yours could be the first one homeowners see.',
          'i-search',
          'List your trade',
          'for-pros.html'
        );
      }
      return;
    }

    if (countLabel) {
      countLabel.textContent =
        pros.length + (pros.length === 1 ? ' professional' : ' professionals') + (activeTrade ? ' · ' + activeTrade : '');
    }

    pros.forEach(function (pro) {
      results.appendChild(TC.proCard(pro));
    });
  }

  /* --- Wire up ----------------------------------------------------------- */

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      window.clearTimeout(searchTimer);
      // Debounced so typing an area name doesn't fire a request per keystroke.
      searchTimer = window.setTimeout(function () {
        searchTerm = searchInput.value.trim();
        writeUrl();
        load();
      }, 280);
    });
  }

  readUrl();
  buildFilters();
  load();
})();
