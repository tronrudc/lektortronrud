/* ============================================================
   LEKTOR TRONRUD · KLASSELISTE-VELGER (shared picker widget)

   Drop-in selector that sits above an existing names textarea in
   any tool and binds it to a shared class list.

   Usage:
     LektorKlassePicker.mount({
       mountEl: document.querySelector('#picker-slot'),
       textarea: document.getElementById('names-input'),
       toolName: 'scrambler',                  // for analytics-free per-tool memory
       onChange: (names, group) => { ... },    // fires after a list loads
       onUnlink: () => { ... },                // fires when user disconnects
     });

   The picker:
   • Lists every class group from the shared store
   • Sets the textarea value when one is picked, dispatches 'input'
   • Shows a "linked" badge when the textarea matches the group
   • Lives quietly above whatever else is in the sidebar
   ============================================================ */
(function (global) {
  'use strict';

  const STYLE_ID = '__lt-klassepicker-styles';
  const PICKER_STORAGE_PREFIX = 'lt-picker:';

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .ltkp {
        background: linear-gradient(135deg, #F3F4F2 0%, #FFFFFF 100%);
        border: 1.5px solid var(--chalk-100, #E6E2DC);
        border-radius: var(--r-md, 10px);
        padding: 12px;
        margin-bottom: var(--s-4, 16px);
        position: relative;
      }
      .ltkp__row {
        display: flex; align-items: center; gap: 8px;
        flex-wrap: wrap;
      }
      .ltkp__label {
        font-family: var(--font-display, 'Rubik', sans-serif);
        font-size: 0.68rem; font-weight: 700;
        text-transform: uppercase; letter-spacing: 0.14em;
        color: var(--slate-500, #5B6478);
        display: inline-flex; align-items: center; gap: 6px;
        white-space: nowrap;
      }
      .ltkp__label::before {
        content: ''; width: 18px; height: 1px; background: var(--slate-300, #94A0B5);
      }
      .ltkp__select {
        flex: 1; min-width: 140px;
        font-family: var(--font-display, 'Rubik', sans-serif);
        font-size: 0.88rem; font-weight: 600;
        padding: 7px 28px 7px 10px;
        border-radius: var(--r-sm, 6px);
        border: 1.5px solid var(--space-900, #0E1A38);
        background: var(--surface, #fff) url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1 L6 6 L11 1' stroke='%230E1A38' stroke-width='2' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>") no-repeat right 10px center;
        color: var(--space-900, #0E1A38);
        cursor: pointer;
        appearance: none;
        -webkit-appearance: none;
        box-shadow: 1px 1px 0 rgba(14,26,56,0.18);
      }
      .ltkp__select:focus { outline: 2px solid var(--planet-teal, #22C8C8); outline-offset: 1px; }
      .ltkp__edit {
        font-family: var(--font-display, 'Rubik', sans-serif);
        font-size: 0.72rem; font-weight: 700;
        text-decoration: none;
        color: var(--space-900, #0E1A38);
        padding: 6px 10px;
        border-radius: var(--r-pill, 9999px);
        background: transparent;
        border: 1.5px solid transparent;
        transition: all 0.12s ease;
        white-space: nowrap;
      }
      .ltkp__edit:hover {
        background: var(--chalk-50, #EEECEA);
        border-color: var(--space-900, #0E1A38);
      }
      .ltkp__status {
        margin-top: 8px;
        display: flex; align-items: center; gap: 8px;
        font-size: 0.74rem;
        color: var(--slate-500, #5B6478);
      }
      .ltkp__status .lock {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 8px;
        border-radius: var(--r-pill, 9999px);
        background: var(--moss-green-soft, #E8F5E9);
        color: var(--moss-green-deep, #4CAF50);
        border: 1px solid var(--moss-green-deep, #4CAF50);
        font-family: var(--font-mono, monospace);
        font-size: 0.66rem; font-weight: 700;
        letter-spacing: 0.04em;
      }
      .ltkp__status .lock.--off {
        background: var(--chalk-50, #EEECEA);
        color: var(--slate-500, #5B6478);
        border-color: var(--chalk-100, #E6E2DC);
      }
      .ltkp__status .unlink {
        margin-left: auto;
        background: transparent;
        border: none;
        color: var(--slate-500, #5B6478);
        font-size: 0.72rem;
        font-family: var(--font-body, sans-serif);
        text-decoration: underline;
        cursor: pointer;
        padding: 0;
      }
      .ltkp__status .unlink:hover { color: var(--space-900, #0E1A38); }
      .ltkp__privacy {
        margin-top: 8px;
        font-size: 0.72rem;
        color: var(--slate-500, #5B6478);
        font-style: italic;
        line-height: 1.4;
        display: flex; align-items: center; gap: 6px;
      }
      .ltkp__privacy::before { content: '🔒'; font-style: normal; font-size: 12px; }
      .ltkp__empty-cta {
        display: block;
        margin-top: 6px;
        font-family: var(--font-display, 'Rubik', sans-serif);
        font-size: 0.78rem; font-weight: 700;
        color: var(--planet-teal-deep, #07B3C7);
        text-decoration: none;
      }
      .ltkp__empty-cta:hover { text-decoration: underline; }
    `;
    document.head.appendChild(s);
  }

  function mount({ mountEl, textarea, toolName, onChange, onUnlink, editHref }) {
    if (!global.LektorKlasselister) {
      console.warn('LektorKlassePicker: klasselister.js must load before this widget');
      return null;
    }
    injectStyles();

    const K = global.LektorKlasselister;
    const memKey = PICKER_STORAGE_PREFIX + (toolName || 'tool');

    // Container
    const wrap = document.createElement('div');
    wrap.className = 'ltkp';
    wrap.innerHTML = `
      <div class="ltkp__row">
        <span class="ltkp__label">Klasseliste</span>
        <select class="ltkp__select" id="ltkp-select"></select>
        <a class="ltkp__edit" href="${editHref || 'klasselister.html'}">Rediger ↗</a>
      </div>
      <div class="ltkp__status" id="ltkp-status"></div>
      <div class="ltkp__privacy">Lagret kun lokalt på din enhet.</div>
    `;
    mountEl.appendChild(wrap);

    const selectEl = wrap.querySelector('#ltkp-select');
    const statusEl = wrap.querySelector('#ltkp-status');

    // Determine initial selection: per-tool memory > global selected
    let activeId = null;
    try {
      activeId = localStorage.getItem(memKey) || null;
      if (activeId && !K.getGroup(activeId)) activeId = null;
    } catch (_) {}
    if (!activeId) {
      const sel = K.getSelected();
      if (sel) activeId = sel.id;
    }

    function rebuildOptions() {
      const groups = K.getGroups();
      selectEl.innerHTML = '';

      // First option: no group / custom
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = groups.length === 0 ? '— Ingen klasselister enda —' : '— Frittstående liste —';
      selectEl.appendChild(noneOpt);

      groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = `${g.name} (${g.names.length})`;
        selectEl.appendChild(opt);
      });

      selectEl.value = activeId || '';
      renderStatus();
    }

    function renderStatus() {
      statusEl.innerHTML = '';
      if (!activeId) {
        const groups = K.getGroups();
        if (groups.length === 0) {
          // Encourage them to start with the manager
          const a = document.createElement('a');
          a.className = 'ltkp__empty-cta';
          a.href = editHref || 'klasselister.html';
          a.textContent = '+ Lag din første klasseliste';
          statusEl.appendChild(a);
        } else {
          const span = document.createElement('span');
          span.className = 'lock --off';
          span.textContent = '○ FRITTSTÅENDE';
          statusEl.appendChild(span);
          const note = document.createElement('span');
          note.textContent = 'Endringer her påvirker ikke andre verktøy.';
          statusEl.appendChild(note);
        }
        return;
      }
      const g = K.getGroup(activeId);
      if (!g) return;

      const lock = document.createElement('span');
      lock.className = 'lock';
      lock.textContent = '● KOBLET';
      statusEl.appendChild(lock);

      const note = document.createElement('span');
      const cnt = g.names.length;
      note.textContent = `${cnt} ${cnt === 1 ? 'elev' : 'elever'} fra «${g.name}»`;
      statusEl.appendChild(note);

      const unlink = document.createElement('button');
      unlink.type = 'button';
      unlink.className = 'unlink';
      unlink.textContent = 'Koble fra';
      unlink.addEventListener('click', () => {
        activeId = null;
        try { localStorage.removeItem(memKey); } catch (_) {}
        renderStatus();
        selectEl.value = '';
        if (typeof onUnlink === 'function') onUnlink();
      });
      statusEl.appendChild(unlink);
    }

    function applyGroupToTextarea(group) {
      if (!textarea) return;
      const v = K.formatNames(group.names);
      textarea.value = v;
      // Drop the "placeholder" italic styling some tools use
      textarea.classList.remove('--placeholder');
      // Fire input event so the host tool re-parses
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      if (typeof onChange === 'function') onChange(group.names, group);
    }

    selectEl.addEventListener('change', () => {
      const id = selectEl.value || null;
      activeId = id;
      try {
        if (id) localStorage.setItem(memKey, id);
        else localStorage.removeItem(memKey);
      } catch (_) {}
      if (id) {
        K.setSelected(id);
        const g = K.getGroup(id);
        if (g) applyGroupToTextarea(g);
      }
      renderStatus();
    });

    // Cross-tab + same-tab sync: if the bound group changes, push new names into the textarea
    K.onChange(() => {
      rebuildOptions();
      if (activeId) {
        const g = K.getGroup(activeId);
        if (g) {
          // Only overwrite if textarea differs (avoid clobbering mid-typing)
          if (textarea && textarea.value !== K.formatNames(g.names)) {
            applyGroupToTextarea(g);
          }
        } else {
          // The group we were bound to got deleted
          activeId = null;
          try { localStorage.removeItem(memKey); } catch (_) {}
          renderStatus();
        }
      }
    });

    // Initial render
    rebuildOptions();

    // Apply on load if we have an active group AND the textarea is in a fresh/placeholder state.
    // If the user has already typed something custom, leave it alone.
    if (activeId) {
      const g = K.getGroup(activeId);
      if (g) {
        const txt = (textarea?.value || '').trim();
        const isPlaceholder = textarea?.classList.contains('--placeholder');
        if (isPlaceholder || !txt) {
          applyGroupToTextarea(g);
        }
      }
    }

    return {
      getActiveGroupId: () => activeId,
      refresh: rebuildOptions,
    };
  }

  global.LektorKlassePicker = { mount };
})(window);
