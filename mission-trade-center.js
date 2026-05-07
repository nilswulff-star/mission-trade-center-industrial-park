/* =========================================================================
   Mission Trade Center Industrial Logistics Park
   svnhannasolutionscre.com
   --------------------------------------------------------------------------
   All interactive behavior lives in this file. Per the SVN | Hanna Solutions
   deploy pattern, no non-trivial JS goes inline (Cloudflare email obfuscation
   rewrites and corrupts inline scripts on every deploy).
   ========================================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     Single source of truth for pricing. Change once, propagates everywhere.
     --------------------------------------------------------------------- */
  const PRICE_PER_ACRE = 315000;

  /* ---------------------------------------------------------------------
     Lot inventory — 16 available lots, two clusters.
     Acreages confirmed against M2 Engineering layout dated 04/29/2026.
     Adjacency confirmed for Cluster A; Cluster B approximate (verify
     against engineer's drawing before final launch).
     --------------------------------------------------------------------- */
  const lots = [
    // Cluster B — Central Cul-de-Sac (Lots 1–9)
    // Adjacencies derived from M2 Engineering layout 04/29/2026.
    // Lots separated by a public road or the cul-de-sac roundabout are
    // treated as non-adjacent for build-across purposes.
    { number: 1,  cluster: 'B', acres: 3.57, sqft: 155433, status: 'available', adjacentLots: [7],          notes: '' },
    { number: 2,  cluster: 'B', acres: 3.12, sqft: 135792, status: 'available', adjacentLots: [3],          notes: 'Smallest lot in inventory' },
    { number: 3,  cluster: 'B', acres: 4.64, sqft: 202243, status: 'available', adjacentLots: [2, 4, 8],    notes: 'Largest lot in Cluster B' },
    { number: 4,  cluster: 'B', acres: 3.51, sqft: 153058, status: 'available', adjacentLots: [3, 5],       notes: '' },
    { number: 5,  cluster: 'B', acres: 3.37, sqft: 146894, status: 'available', adjacentLots: [4, 6],       notes: '' },
    { number: 6,  cluster: 'B', acres: 3.70, sqft: 161024, status: 'available', adjacentLots: [5, 9],       notes: '' },
    { number: 7,  cluster: 'B', acres: 3.93, sqft: 171367, status: 'available', adjacentLots: [1, 8, 9],    notes: '' },
    { number: 8,  cluster: 'B', acres: 3.70, sqft: 161268, status: 'available', adjacentLots: [3, 7],       notes: '' },
    { number: 9,  cluster: 'B', acres: 3.99, sqft: 173839, status: 'available', adjacentLots: [6, 7],       notes: '' },
    // Cluster A — Northeast Industrial Block (Lots 10–16)
    { number: 10, cluster: 'A', acres: 5.29, sqft: 230638, status: 'available', adjacentLots: [11, 15],     notes: '' },
    { number: 11, cluster: 'A', acres: 5.14, sqft: 223790, status: 'available', adjacentLots: [10, 12, 14], notes: '' },
    { number: 12, cluster: 'A', acres: 5.12, sqft: 222935, status: 'available', adjacentLots: [11, 13],     notes: '' },
    { number: 13, cluster: 'A', acres: 5.12, sqft: 223070, status: 'available', adjacentLots: [12, 14],     notes: '' },
    { number: 14, cluster: 'A', acres: 5.14, sqft: 223697, status: 'available', adjacentLots: [11, 13, 15, 16], notes: '' },
    { number: 15, cluster: 'A', acres: 5.13, sqft: 223381, status: 'available', adjacentLots: [10, 14, 16], notes: '' },
    { number: 16, cluster: 'A', acres: 8.39, sqft: 365620, status: 'available', adjacentLots: [14, 15],     notes: 'Cold storage anchor — Conway Ave frontage' }
  ];

  /* ---------------------------------------------------------------------
     Number formatting helpers
     --------------------------------------------------------------------- */
  const fmtPrice = n => '$' + Math.round(n).toLocaleString('en-US');
  const fmtSqft  = n => n.toLocaleString('en-US') + ' SF';
  const fmtAcres = n => n.toFixed(2) + ' AC';
  const priceOf  = lot => lot.acres * PRICE_PER_ACRE;

  /* ---------------------------------------------------------------------
     State for filter/sort/select
     --------------------------------------------------------------------- */
  const state = {
    cluster: 'all',         // 'all' | 'A' | 'B'
    sortBy: 'number',       // 'number' | 'acres' | 'price'
    sortDir: 'asc',         // 'asc' | 'desc'
    selected: new Set()     // selected lot numbers
  };

  /* ---------------------------------------------------------------------
     DOM utilities
     --------------------------------------------------------------------- */
  const $  = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* =====================================================================
     INVENTORY TABLE RENDER
     ===================================================================== */
  function getFilteredLots(cluster) {
    let list = lots.filter(l => cluster === 'all' || l.cluster === cluster);

    list.sort((a, b) => {
      let cmp;
      if (state.sortBy === 'acres')      cmp = a.acres - b.acres;
      else if (state.sortBy === 'price') cmp = priceOf(a) - priceOf(b);
      else                                cmp = a.number - b.number;
      return state.sortDir === 'desc' ? -cmp : cmp;
    });

    return list;
  }

  function renderClusterRows(clusterId, containerId, summaryId) {
    const container = document.getElementById(containerId);
    const summary   = document.getElementById(summaryId);
    if (!container) return;

    // Filter by the current top-level cluster filter intersected with this
    // section's own cluster identity
    let list = lots.filter(l => l.cluster === clusterId);
    if (state.cluster !== 'all' && state.cluster !== clusterId) {
      list = [];
    }

    list.sort((a, b) => {
      let cmp;
      if (state.sortBy === 'acres')      cmp = a.acres - b.acres;
      else if (state.sortBy === 'price') cmp = priceOf(a) - priceOf(b);
      else                                cmp = a.number - b.number;
      return state.sortDir === 'desc' ? -cmp : cmp;
    });

    container.innerHTML = '';

    if (list.length === 0) {
      container.innerHTML = '<div class="lot-empty">No lots in this cluster match the current filter.</div>';
    } else {
      list.forEach(lot => {
        const row = document.createElement('div');
        row.className = 'lot-row' + (state.selected.has(lot.number) ? ' is-selected' : '');
        row.dataset.lot = lot.number;
        row.innerHTML = `
          <div class="lot-cell lot-cell--check">
            <label class="lot-check">
              <input type="checkbox" data-lot="${lot.number}" ${state.selected.has(lot.number) ? 'checked' : ''} aria-label="Select Lot ${lot.number}">
              <span class="lot-check__box" aria-hidden="true"></span>
            </label>
          </div>
          <div class="lot-cell lot-cell--num">
            <span class="lot-num">Lot ${String(lot.number).padStart(2, '0')}</span>
            <span class="lot-cluster">Cluster ${lot.cluster}</span>
          </div>
          <div class="lot-cell lot-cell--acres">
            <span class="lot-stat">${lot.acres.toFixed(2)}</span>
            <span class="lot-unit">net acres</span>
          </div>
          <div class="lot-cell lot-cell--sqft">
            <span class="lot-stat">${lot.sqft.toLocaleString('en-US')}</span>
            <span class="lot-unit">SF</span>
          </div>
          <div class="lot-cell lot-cell--price">
            <span class="lot-stat">${fmtPrice(priceOf(lot))}</span>
            <span class="lot-unit">@ $315k/ac</span>
          </div>
          <div class="lot-cell lot-cell--adj">
            <span class="lot-unit">Adjacent to</span>
            <span class="lot-adj">${lot.adjacentLots.map(n => 'Lot ' + n).join(', ') || '—'}</span>
          </div>
          <div class="lot-cell lot-cell--cta">
            <a class="lot-inquire" href="#inquire" data-inquire-lot="${lot.number}">Inquire on Lot ${lot.number} →</a>
          </div>
        `;
        container.appendChild(row);
      });
    }

    // Summary line for this cluster
    if (summary) {
      const totalAc   = list.reduce((s, l) => s + l.acres, 0);
      const totalSqft = list.reduce((s, l) => s + l.sqft, 0);
      const totalVal  = list.reduce((s, l) => s + priceOf(l), 0);
      summary.innerHTML = `
        <span><strong>${list.length}</strong> lots shown</span>
        <span class="dot" aria-hidden="true">·</span>
        <span><strong>${totalAc.toFixed(2)}</strong> acres</span>
        <span class="dot" aria-hidden="true">·</span>
        <span><strong>${totalSqft.toLocaleString('en-US')}</strong> SF</span>
        <span class="dot" aria-hidden="true">·</span>
        <span><strong>${fmtPrice(totalVal)}</strong> total list value</span>
      `;
    }
  }

  function renderInventory() {
    renderClusterRows('A', 'lot-rows-A', 'cluster-summary-A');
    renderClusterRows('B', 'lot-rows-B', 'cluster-summary-B');
    updateSelectionBar();
    syncMasterPlanSelection();
  }

  /* =====================================================================
     MULTI-LOT SELECTION BAR
     ===================================================================== */
  function updateSelectionBar() {
    const bar = document.getElementById('selection-bar');
    if (!bar) return;

    const selectedLots = lots.filter(l => state.selected.has(l.number));
    const count = selectedLots.length;

    if (count === 0) {
      bar.classList.remove('is-active');
      bar.setAttribute('aria-hidden', 'true');
      return;
    }

    bar.classList.add('is-active');
    bar.setAttribute('aria-hidden', 'false');

    const totalAc   = selectedLots.reduce((s, l) => s + l.acres, 0);
    const totalSqft = selectedLots.reduce((s, l) => s + l.sqft, 0);
    const totalPrice = selectedLots.reduce((s, l) => s + priceOf(l), 0);
    const lotNums   = selectedLots.map(l => l.number).sort((a, b) => a - b);

    // Cross-cluster check
    const clustersUsed = new Set(selectedLots.map(l => l.cluster));
    const isCrossCluster = clustersUsed.size > 1;

    // Within-cluster non-adjacent check (only matters when a single cluster is selected and 2+ lots)
    let nonAdjacentWarning = false;
    if (!isCrossCluster && count >= 2) {
      // Build adjacency graph for the selected set; check if all are reachable
      // from any starting node via BFS through adjacency edges that lie within
      // the selection.
      const selSet = new Set(lotNums);
      const start = lotNums[0];
      const seen = new Set([start]);
      const queue = [start];
      while (queue.length) {
        const cur = queue.shift();
        const lot = lots.find(l => l.number === cur);
        if (!lot) continue;
        lot.adjacentLots.forEach(adj => {
          if (selSet.has(adj) && !seen.has(adj)) {
            seen.add(adj);
            queue.push(adj);
          }
        });
      }
      if (seen.size !== selSet.size) nonAdjacentWarning = true;
    }

    let warningHTML = '';
    if (isCrossCluster) {
      warningHTML = `
        <div class="selection-warning selection-warning--hard" role="alert">
          <strong>Cross-cluster selection.</strong>
          Cluster A and Cluster B are not contiguous — they are separated by the MEDA parcels in the south of the park.
          Multi-lot builds typically combine adjacent lots within the same cluster. Confirm with broker if you wish to acquire lots in both clusters as separate transactions.
        </div>`;
    } else if (nonAdjacentWarning) {
      warningHTML = `
        <div class="selection-warning selection-warning--soft" role="status">
          <strong>Non-adjacent selection.</strong>
          The lots you've selected within Cluster ${[...clustersUsed][0]} are not all directly adjacent. Confirm with broker whether build-across is feasible across this configuration.
        </div>`;
    }

    bar.innerHTML = `
      <div class="selection-inner">
        <div class="selection-stats">
          <div class="selection-stat">
            <span class="selection-stat__label">Selected</span>
            <span class="selection-stat__value">${count} lot${count > 1 ? 's' : ''}</span>
            <span class="selection-stat__detail">${lotNums.map(n => 'Lot ' + n).join(', ')}</span>
          </div>
          <div class="selection-stat">
            <span class="selection-stat__label">Combined acreage</span>
            <span class="selection-stat__value">${totalAc.toFixed(2)} ac</span>
            <span class="selection-stat__detail">${totalSqft.toLocaleString('en-US')} SF</span>
          </div>
          <div class="selection-stat">
            <span class="selection-stat__label">Combined price</span>
            <span class="selection-stat__value">${fmtPrice(totalPrice)}</span>
            <span class="selection-stat__detail">@ $315,000 / acre</span>
          </div>
        </div>
        ${warningHTML}
        <div class="selection-actions">
          <button type="button" class="btn btn--ghost" id="selection-clear">Clear selection</button>
          <button type="button" class="btn btn--primary" id="selection-inquire">Inquire on selected lots →</button>
        </div>
      </div>
    `;

    const clearBtn = $('#selection-clear');
    const inquireBtn = $('#selection-inquire');
    if (clearBtn) clearBtn.addEventListener('click', () => {
      state.selected.clear();
      renderInventory();
    });
    if (inquireBtn) inquireBtn.addEventListener('click', () => {
      // Capture the lot numbers from the current selection state so the
      // value is fresh even if the closure is stale.
      const currentNums = Array.from(state.selected).sort((a, b) => a - b);
      // Switch to the Resources & Contact tab FIRST so the form is visible.
      if (typeof window.__mtcNavigateToSection === 'function') {
        window.__mtcNavigateToSection('inquire');
      } else {
        const target = document.getElementById('inquire');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Then auto-fill the lots field. autoFillInquiryLots itself defers
      // via requestAnimationFrame to handle the tab-switch timing.
      autoFillInquiryLots(currentNums);
    });
  }

  /* =====================================================================
     MASTER PLAN INTERACTIVITY
     Polygons over the M2 engineer's exhibit — invisible by default,
     orange tint on hover/focus/selected. Click scrolls to the matching
     lot row in the inventory table.
     ===================================================================== */
  function syncMasterPlanSelection() {
    $$('.mp-lot-area').forEach(el => {
      const num = parseInt(el.dataset.lot, 10);
      el.classList.toggle('is-selected', state.selected.has(num));
    });
  }

  function bindMasterPlan() {
    $$('.mp-lot-area').forEach(el => {
      const num = parseInt(el.dataset.lot, 10);
      el.addEventListener('mouseenter', () => showLotTooltip(el, num));
      el.addEventListener('mouseleave', hideLotTooltip);
      el.addEventListener('focus', () => showLotTooltip(el, num));
      el.addEventListener('blur', hideLotTooltip);
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById('lot-' + num);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('lot-row--flash');
          setTimeout(() => target.classList.remove('lot-row--flash'), 1600);
        }
      });
      // Keyboard support — Enter/Space activates click on the focused polygon
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        }
      });
    });

    $$('.mp-meda-area').forEach(el => {
      el.addEventListener('mouseenter', () => showMedaTooltip(el));
      el.addEventListener('mouseleave', hideLotTooltip);
      el.addEventListener('focus', () => showMedaTooltip(el));
      el.addEventListener('blur', hideLotTooltip);
    });
  }

  function showLotTooltip(el, num) {
    const lot = lots.find(l => l.number === num);
    if (!lot) return;
    const tt = document.getElementById('mp-tooltip');
    if (!tt) return;
    tt.innerHTML = `
      <div class="mp-tt__head">Lot ${lot.number} <span class="mp-tt__cluster">Cluster ${lot.cluster}</span></div>
      <div class="mp-tt__row"><span>Acreage</span><strong>${lot.acres.toFixed(2)} AC</strong></div>
      <div class="mp-tt__row"><span>Square Feet</span><strong>${lot.sqft.toLocaleString('en-US')}</strong></div>
      <div class="mp-tt__row"><span>Price</span><strong>${fmtPrice(priceOf(lot))}</strong></div>
      <div class="mp-tt__foot">Click to view in inventory</div>
    `;
    positionTooltip(tt, el);
    tt.classList.add('is-visible');
  }

  function showMedaTooltip(el) {
    const acres = el.dataset.acres;
    const tt = document.getElementById('mp-tooltip');
    if (!tt) return;
    tt.innerHTML = `
      <div class="mp-tt__head mp-tt__head--meda">${acres} AC Parcel</div>
      <div class="mp-tt__row"><span>Status</span><strong>Under Contract</strong></div>
      <div class="mp-tt__row"><span>Buyer</span><strong>Mission EDA</strong></div>
      <div class="mp-tt__foot">Pre-sold to the City of Mission's economic development authority</div>
    `;
    positionTooltip(tt, el);
    tt.classList.add('is-visible');
  }

  function hideLotTooltip() {
    const tt = document.getElementById('mp-tooltip');
    if (tt) tt.classList.remove('is-visible');
  }

  function positionTooltip(tt, el) {
    // Tooltip's positioning context is #master-plan-wrap (position: relative).
    // We measure relative to that wrapper, not the outer section.
    const wrap = document.getElementById('master-plan-wrap');
    if (!wrap) return;
    const wrapRect = wrap.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const x = elRect.left - wrapRect.left + elRect.width / 2;
    const y = elRect.top  - wrapRect.top;
    // Clamp horizontally so the tooltip doesn't overflow the wrapper edges.
    // Tooltip min-width is 220px, so half-width ~= 120px (with padding).
    const half = 130;
    const maxX = wrap.clientWidth - half - 8;
    const minX = half + 8;
    const clampedX = Math.max(minX, Math.min(maxX, x));
    tt.style.left = clampedX + 'px';
    tt.style.top  = y + 'px';
  }

  /* =====================================================================
     FILTER + SORT CONTROLS
     ===================================================================== */
  function bindControls() {
    // Cluster filter
    $$('[data-cluster-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.cluster = btn.dataset.clusterFilter;
        $$('[data-cluster-filter]').forEach(b => b.classList.toggle('is-active', b === btn));
        renderInventory();
      });
    });

    // Sort
    const sortSel = $('#sort-by');
    const sortDirBtn = $('#sort-dir');
    if (sortSel) sortSel.addEventListener('change', () => {
      state.sortBy = sortSel.value;
      renderInventory();
    });
    if (sortDirBtn) sortDirBtn.addEventListener('click', () => {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      sortDirBtn.dataset.dir = state.sortDir;
      sortDirBtn.setAttribute('aria-label', 'Sort direction: ' + (state.sortDir === 'asc' ? 'ascending' : 'descending'));
      renderInventory();
    });

    // Inventory delegate: checkboxes + per-lot inquire links
    document.addEventListener('change', (e) => {
      if (e.target && e.target.matches('input[type="checkbox"][data-lot]')) {
        const num = parseInt(e.target.dataset.lot, 10);
        if (e.target.checked) state.selected.add(num);
        else state.selected.delete(num);
        renderInventory();
      }
    });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('[data-inquire-lot]');
      if (a) {
        const num = parseInt(a.dataset.inquireLot, 10);
        // Defer to the next frame so the tab-switch (triggered by the
        // <a href="#inquire"> link's hash navigation in bindNav) has a
        // chance to make the form visible before we set the selection.
        requestAnimationFrame(() => autoFillInquiryLots([num]));
      }
    });
  }

  /* =====================================================================
     INQUIRY FORM
     ===================================================================== */
  function autoFillInquiryLots(nums) {
    // Defer the actual selection-setting until after any tab switch has
    // had a chance to make the form visible. Browsers handle <select>
    // selection inconsistently when the element's parent is [hidden].
    const apply = () => {
      const sel = document.getElementById('inq-lots');
      if (!sel) return false;
      Array.from(sel.options).forEach(opt => {
        // For numeric options (lot numbers): match against nums.
        // For special tokens (entire-park, cluster-A, etc.): leave alone.
        const v = parseInt(opt.value, 10);
        if (!isNaN(v)) {
          opt.selected = nums.includes(v);
        }
      });
      // Some browsers need an explicit change event to update internal state
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      // Flash the field briefly so the user knows the prefill happened
      sel.classList.add('inq-lots--flash');
      setTimeout(() => sel.classList.remove('inq-lots--flash'), 1400);
      return true;
    };
    // Try immediately, then retry on next frame in case the tab is
    // still mid-switch.
    if (!apply()) {
      requestAnimationFrame(() => apply());
    } else {
      // Apply again on next frame to catch tab-switch cases where the
      // first application happened against a hidden element.
      requestAnimationFrame(() => apply());
    }
  }

  function bindForm() {
    const form = $('#inquiry-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const lotsSel = Array.from($('#inq-lots').selectedOptions).map(o => o.value);
      const payload = {
        name: fd.get('name'),
        firm: fd.get('firm'),
        email: fd.get('email'),
        phone: fd.get('phone'),
        capacity: fd.get('capacity'),
        lots: lotsSel,
        acreage: fd.get('acreage'),
        use: fd.get('use'),
        message: fd.get('message')
      };
      // [CONFIRM endpoint]: wire to existing svnhs.com inquiry handler.
      // For now, we surface a clean confirmation state and provide the
      // mailto fallback so the form is functional pre-backend.
      console.log('Inquiry payload:', payload);
      const subject = encodeURIComponent('Mission Trade Center — Inquiry' + (lotsSel.length ? ' (Lot' + (lotsSel.length > 1 ? 's' : '') + ' ' + lotsSel.join(', ') + ')' : ''));
      const body = encodeURIComponent(
        'Name: ' + (payload.name || '') + '\n' +
        'Firm: ' + (payload.firm || '') + '\n' +
        'Email: ' + (payload.email || '') + '\n' +
        'Phone: ' + (payload.phone || '') + '\n' +
        'Capacity: ' + (payload.capacity || '') + '\n' +
        'Lots of interest: ' + (lotsSel.length ? lotsSel.join(', ') : 'TBD') + '\n' +
        'Target acreage: ' + (payload.acreage || '') + '\n' +
        'Intended use: ' + (payload.use || '') + '\n\n' +
        (payload.message || '')
      );
      window.location.href = 'mailto:mark.hanna@svn.com?subject=' + subject + '&body=' + body;

      const ack = $('#inquiry-ack');
      if (ack) {
        ack.hidden = false;
        ack.textContent = 'Thank you. Your inquiry has been opened in your email client. If it does not open automatically, please call Mark Hanna directly at 956.821.8001.';
      }
    });
  }

  /* =====================================================================
     SMOOTH SCROLL + MOBILE NAV
     ===================================================================== */
  /* =====================================================================
     TABS
     Section-to-panel map lets any anchor link route to the right panel
     before scrolling. If a hash is missing here, the link falls through
     to standard smooth-scroll behavior (works fine for in-panel anchors).
     ===================================================================== */
  const SECTION_TO_PANEL = {
    summary:      'overview',
    highlights:   'overview',
    'master-plan':'park',
    inventory:    'park',
    lot16:        'lot16',
    gallery:      'gallery',
    specs:        'property',
    location:     'property',
    market:       'property',
    comps:        'property',
    usecases:     'property',
    docs:         'resources',
    team:         'resources',
    about:        'resources',
    inquire:      'resources'
  };

  function activateTab(tabId, opts = {}) {
    const buttons = $$('.tabs__btn');
    const panels  = $$('.tab-panel');
    if (!buttons.length || !panels.length) return;
    let matched = false;
    buttons.forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      if (isActive) matched = true;
    });
    if (!matched) return;
    panels.forEach(p => {
      const isActive = p.id === 'panel-' + tabId;
      p.classList.toggle('is-active', isActive);
      if (isActive) p.removeAttribute('hidden');
      else p.setAttribute('hidden', '');
    });
    if (opts.scrollTabIntoView) {
      const activeBtn = buttons.find(b => b.dataset.tab === tabId);
      if (activeBtn && activeBtn.scrollIntoView) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }

  /* Activate the panel that contains a given section id, then scroll the
     section into view. Returns true if it handled the navigation. */
  function navigateToSection(sectionId) {
    if (!sectionId) return false;
    const tabId = SECTION_TO_PANEL[sectionId];
    if (!tabId) return false;
    activateTab(tabId);
    // Wait one frame so the panel is visible before measuring scroll position.
    requestAnimationFrame(() => {
      const target = document.getElementById(sectionId);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return true;
  }

  function bindTabs() {
    // Tab button clicks
    $$('.tabs__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        activateTab(btn.dataset.tab, { scrollTabIntoView: true });
        // Update hash to the first section in that panel for deep-link support
        const firstSection = Object.keys(SECTION_TO_PANEL).find(
          sec => SECTION_TO_PANEL[sec] === btn.dataset.tab
        );
        if (firstSection && history.replaceState) {
          history.replaceState(null, '', '#' + firstSection);
        }
      });
    });

    // On load: honor any deep-link hash
    if (location.hash && location.hash.length > 1) {
      const sectionId = location.hash.slice(1);
      const tabId = SECTION_TO_PANEL[sectionId];
      if (tabId) {
        activateTab(tabId);
        // Defer scroll so layout settles
        setTimeout(() => {
          const target = document.getElementById(sectionId);
          if (target) target.scrollIntoView({ behavior: 'auto', block: 'start' });
        }, 0);
      }
    }

    // Browser back/forward
    window.addEventListener('hashchange', () => {
      const sectionId = location.hash.slice(1);
      navigateToSection(sectionId);
    });
  }

  // Expose for use by other handlers in this file
  window.__mtcNavigateToSection = navigateToSection;

  function bindNav() {
    // Smooth scroll for in-page anchors. Routes through the tab system
    // when the target section lives in a non-active panel.
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length > 1) {
          const sectionId = id.slice(1);
          const target = document.getElementById(sectionId);
          if (target) {
            e.preventDefault();
            // If the target lives in a tab panel, switch to it first.
            if (!navigateToSection(sectionId)) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            // Close mobile nav if open
            const navWrap = $('.nav__menu');
            if (navWrap && navWrap.classList.contains('is-open')) {
              navWrap.classList.remove('is-open');
              const toggle = $('.nav__toggle');
              if (toggle) toggle.setAttribute('aria-expanded', 'false');
            }
          }
        }
      });
    });

    // Mobile nav toggle
    const toggle = $('.nav__toggle');
    const menu = $('.nav__menu');
    if (toggle && menu) {
      toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    // Sticky nav shadow on scroll
    const nav = $('.nav');
    if (nav) {
      const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  /* =====================================================================
     BRIDGE CORRIDOR MAP
     Hover/focus a bridge marker to show a tooltip with the name, type,
     and detail. Tooltip is positioned relative to the .bridge-map__svg-wrap
     container and clamped horizontally so it never overflows the edges.
     ===================================================================== */
  function bindBridgeMap() {
    const wrap = document.getElementById('bridge-map');
    if (!wrap) return;
    const tt = document.getElementById('bm-tooltip');
    const svgWrap = wrap.querySelector('.bridge-map__svg-wrap');
    if (!tt || !svgWrap) return;

    function show(el) {
      const name = el.getAttribute('data-name') || '';
      const type = el.getAttribute('data-type') || '';
      const detail = el.getAttribute('data-detail') || '';
      tt.innerHTML = `
        <div class="bm-tt__name">${name}</div>
        ${type ? `<div class="bm-tt__type">${type}</div>` : ''}
        ${detail ? `<div class="bm-tt__detail">${detail}</div>` : ''}
      `;
      tt.classList.add('is-visible');
      tt.setAttribute('aria-hidden', 'false');
      // Position relative to the svg-wrap container
      const wrapRect = svgWrap.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const x = elRect.left - wrapRect.left + elRect.width / 2;
      const y = elRect.top - wrapRect.top;
      // Clamp horizontally
      const half = 145; // half max-width + padding
      const maxX = svgWrap.clientWidth - half - 8;
      const minX = half + 8;
      const cx = Math.max(minX, Math.min(maxX, x));
      tt.style.left = cx + 'px';
      tt.style.top = y + 'px';
    }
    function hide() {
      tt.classList.remove('is-visible');
      tt.setAttribute('aria-hidden', 'true');
    }
    $$('.bm-bridge', wrap).forEach(el => {
      el.addEventListener('mouseenter', () => show(el));
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focus', () => show(el));
      el.addEventListener('blur', hide);
      // Touch support — tap toggles tooltip
      el.addEventListener('click', (e) => {
        e.preventDefault();
        if (tt.classList.contains('is-visible') && tt.getAttribute('data-current') === el.getAttribute('data-name')) {
          hide();
          tt.removeAttribute('data-current');
        } else {
          show(el);
          tt.setAttribute('data-current', el.getAttribute('data-name'));
        }
      });
    });
    // Hide tooltip when clicking outside any bridge
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.bm-bridge')) {
        hide();
        tt.removeAttribute('data-current');
      }
    });
  }

  /* =====================================================================
     GALLERY
     For each .gallery-placeholder, watch the contained <img>. When the
     image loads successfully (real file at the src path), add .is-loaded
     to the placeholder so the developer-facing label hides. If the image
     fails (404 — file not yet uploaded), the placeholder stays visible.
     ===================================================================== */
  function bindGallery() {
    $$('.gallery-placeholder').forEach(ph => {
      const img = ph.querySelector('img');
      if (!img) return;
      const markLoaded = () => {
        // Only flag as loaded if the image actually has dimensions
        // (broken/404 images report naturalWidth=0 in modern browsers).
        if (img.naturalWidth > 0) ph.classList.add('is-loaded');
      };
      if (img.complete) {
        markLoaded();
      } else {
        img.addEventListener('load', markLoaded);
        // No handler on 'error' — placeholder simply stays visible.
      }
    });
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init() {
    renderInventory();
    bindControls();
    bindMasterPlan();
    bindBridgeMap();
    bindForm();
    bindTabs();
    bindGallery();
    bindNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
