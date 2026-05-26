/* Classroom Scrambler — full rebuild with zone-pinning + læringspar */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const namesEl       = $('names');
  const nameCount     = $('name-count');
  const pairsList     = $('pairs-list');
  const pairAdd       = $('pair-add');
  const pairHint      = $('pair-hint');
  const canvas        = $('canvas');
  const emptyState    = $('empty-state');
  const canvasTitle   = $('canvas-title');
  const canvasSub     = $('canvas-sub');
  const conflictWarn  = $('conflict-warn');
  const toastEl       = $('toast');

  let mode        = 'bundles';
  let bundleSize  = 4;
  let pairWidth   = 3;
  let extraEmpty  = 0;
  let pairMode    = 'forbidden';
  let forbiddenPairs = [['', '']];
  let learningPairs  = [['', '']];
  let currentOrder  = [];
  let currentLayout = null;
  // pins: name -> { type: 'seat'|'zone', value }
  let pins = new Map();
  let isPlaceholder = true; // first edit clears the HP placeholder styling

  const ZONE_LABELS = {
    'front':       'Foran',
    'back':        'Bak',
    'front-left':  'Foran til venstre',
    'front-right': 'Foran til høyre',
    'back-left':   'Bak til venstre',
    'back-right':  'Bak til høyre',
  };
  const ZONE_ORDER = ['front', 'front-left', 'front-right', 'back-left', 'back-right', 'back'];

  // ── Parsing ──
  function parseNames(raw) {
    return raw.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
  }
  function shuffle(a) {
    a = [...a];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pairKey(a, b) {
    const A = a.toLowerCase(), B = b.toLowerCase();
    return A < B ? A + '|' + B : B + '|' + A;
  }
  function buildPairSet(pairs) {
    const set = new Set();
    pairs.forEach(([a, b]) => { if (a && b) set.add(pairKey(a, b)); });
    return set;
  }
  function isPair(a, b, set) {
    if (!a || !b) return false;
    return set.has(pairKey(a, b));
  }

  // ── Counts + name list ──
  function updateCounts() {
    nameCount.textContent = parseNames(namesEl.value).length;
  }
  namesEl.addEventListener('focus', () => {
    if (isPlaceholder) {
      namesEl.classList.remove('--placeholder');
    }
  });
  namesEl.addEventListener('input', () => {
    if (isPlaceholder) {
      isPlaceholder = false;
      namesEl.classList.remove('--placeholder');
    }
    updateCounts();
    renderPairsList();
  });
  updateCounts();

  // ── Pair UI ──
  function getCurrentPairs() {
    return pairMode === 'forbidden' ? forbiddenPairs : learningPairs;
  }
  function renderPairsList() {
    const students = parseNames(namesEl.value);
    const list = getCurrentPairs();
    pairsList.innerHTML = '';
    list.forEach((pair, idx) => {
      const row = document.createElement('div');
      row.className = 'pair-row';
      const sel1 = makePairSelect(students, pair[0]);
      const sep = document.createElement('span');
      sep.className = 'pair-row__sep ' + (pairMode === 'learning' ? '--learning' : '--forbidden');
      sep.textContent = pairMode === 'learning' ? '↔' : '✕';
      const sel2 = makePairSelect(students, pair[1]);
      const rm = document.createElement('button');
      rm.className = 'pair-row__rm';
      rm.title = 'Fjern par';
      rm.textContent = '×';
      sel1.addEventListener('change', () => { list[idx][0] = sel1.value; });
      sel2.addEventListener('change', () => { list[idx][1] = sel2.value; });
      rm.addEventListener('click', () => {
        list.splice(idx, 1);
        if (list.length === 0) list.push(['', '']); // keep one empty row
        renderPairsList();
      });
      row.append(sel1, sep, sel2, rm);
      pairsList.appendChild(row);
    });
  }
  function makePairSelect(students, current) {
    const sel = document.createElement('select');
    const opt0 = document.createElement('option');
    opt0.value = ''; opt0.textContent = '— velg elev —';
    sel.appendChild(opt0);
    students.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      if (s === current) o.selected = true;
      sel.appendChild(o);
    });
    return sel;
  }

  document.querySelectorAll('.pair-tab').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.pair-tab').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      pairMode = b.dataset.pairTab;
      pairHint.textContent = pairMode === 'learning'
        ? 'Læringspar settes ved siden av hverandre når det er mulig.'
        : 'Forbudte par skal ikke sitte ved siden av hverandre eller på samme bord.';
      renderPairsList();
    });
  });
  pairAdd.addEventListener('click', () => {
    getCurrentPairs().push(['', '']);
    renderPairsList();
  });
  renderPairsList();

  // ── Mode switching ──
  document.querySelectorAll('.mode').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.mode').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      mode = b.dataset.mode;
      const showSize = mode === 'bundles';
      const showPW   = mode === 'pairs';
      $('bundle-size').style.display = showSize ? 'flex' : 'none';
      $('bundle-size-hint').style.display = showSize ? 'block' : 'none';
      $('pair-width').style.display = showPW ? 'flex' : 'none';
      $('pair-width-hint').style.display = showPW ? 'block' : 'none';
    });
  });
  document.querySelectorAll('#bundle-size .chip-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#bundle-size .chip-btn').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      bundleSize = parseInt(b.dataset.size, 10);
    });
  });
  document.querySelectorAll('#pair-width .chip-btn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('#pair-width .chip-btn').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      pairWidth = parseInt(b.dataset.pwidth, 10);
    });
  });
  document.querySelectorAll('[data-extra]').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-extra]').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      extraEmpty = parseInt(b.dataset.extra, 10);
    });
  });

  // ── Choose # grid columns for desk grid ──
  function deskGridCols(nDesks) {
    if (nDesks <= 2) return nDesks;
    if (nDesks <= 4) return 2;
    if (nDesks <= 9) return 3;
    return 4;
  }

  // ── Neighbor maps per layout ──
  function pairsNeighbors(n) {
    const desks = [];
    if (n === 0) return { neighbors: [], desks };
    if (n % 2 === 1 && n >= 3) {
      for (let i = 0; i < n - 3; i += 2) desks.push([i, i + 1]);
      desks.push([n - 3, n - 2, n - 1]);
    } else {
      for (let i = 0; i < n; i += 2) {
        if (i + 1 < n) desks.push([i, i + 1]); else desks.push([i]);
      }
    }
    const neighbors = [];
    desks.forEach(d => {
      for (let i = 0; i < d.length; i++)
        for (let j = i + 1; j < d.length; j++) neighbors.push([d[i], d[j]]);
    });
    return { neighbors, desks };
  }
  function bundlesNeighbors(n, size) {
    const desks = [];
    for (let i = 0; i < n; i += size) {
      const d = [];
      for (let k = 0; k < size && i + k < n; k++) d.push(i + k);
      desks.push(d);
    }
    const neighbors = [];
    desks.forEach(d => {
      for (let i = 0; i < d.length; i++)
        for (let j = i + 1; j < d.length; j++) neighbors.push([d[i], d[j]]);
    });
    return { neighbors, desks };
  }
  function computeHorseshoe(n) {
    let top = Math.max(2, Math.ceil(n / 3));
    let rem = Math.max(0, n - top);
    let sRight = Math.floor(rem / 2);
    let sLeft = rem - sRight;
    const rows = 1 + Math.max(sLeft, sRight, 1);
    const cols = top;
    const slots = [];
    for (let c = 0; c < cols; c++) slots.push({ r: 0, c });
    for (let r = 1; r <= sRight; r++) slots.push({ r, c: cols - 1 });
    for (let r = 1; r <= sLeft; r++) slots.push({ r, c: 0 });
    const id = (r, c) => r + ',' + c;
    const idx = new Map(); slots.forEach((p, i) => idx.set(id(p.r, p.c), i));
    const neighbors = [];
    for (let c = 0; c < cols - 1; c++) {
      const a = idx.get(id(0, c)), b = idx.get(id(0, c + 1));
      if (a != null && b != null) neighbors.push([a, b]);
    }
    if (idx.has(id(0, cols - 1)) && idx.has(id(1, cols - 1))) neighbors.push([idx.get(id(0, cols - 1)), idx.get(id(1, cols - 1))]);
    for (let r = 1; r < rows - 1; r++) {
      const a = idx.get(id(r, cols - 1)), b = idx.get(id(r + 1, cols - 1));
      if (a != null && b != null) neighbors.push([a, b]);
    }
    if (idx.has(id(0, 0)) && idx.has(id(1, 0))) neighbors.push([idx.get(id(0, 0)), idx.get(id(1, 0))]);
    for (let r = 1; r < rows - 1; r++) {
      const a = idx.get(id(r, 0)), b = idx.get(id(r + 1, 0));
      if (a != null && b != null) neighbors.push([a, b]);
    }
    return { slots, rows, cols, neighbors };
  }

  // ── Layout assembly ──
  function computeLayout(numSeats) {
    if (mode === 'pairs') {
      const { neighbors, desks } = pairsNeighbors(numSeats);
      return { kind: 'pairs', neighbors, desks, gridCols: Math.min(pairWidth, desks.length || 1) };
    } else if (mode === 'bundles') {
      const { neighbors, desks } = bundlesNeighbors(numSeats, bundleSize);
      return { kind: 'bundles', neighbors, desks, size: bundleSize, gridCols: deskGridCols(desks.length) };
    } else {
      return { kind: 'horseshoe', ...computeHorseshoe(numSeats) };
    }
  }

  // ── Zone mapping per seat ──
  function seatZone(seatIdx, layout) {
    if (layout.kind === 'horseshoe') {
      const slot = layout.slots[seatIdx];
      if (!slot) return null;
      const { r, c } = slot;
      if (r === 0) {
        if (c === 0) return 'front-left';
        if (c === layout.cols - 1) return 'front-right';
        return 'front';
      }
      if (c === 0) return 'back-left';
      if (c === layout.cols - 1) return 'back-right';
      return null;
    }
    // pairs / bundles
    let deskIdx = -1;
    for (let i = 0; i < layout.desks.length; i++) {
      if (layout.desks[i].includes(seatIdx)) { deskIdx = i; break; }
    }
    if (deskIdx < 0) return null;
    const cols = layout.gridCols;
    const total = layout.desks.length;
    const maxRow = Math.floor((total - 1) / cols);
    const dRow = Math.floor(deskIdx / cols);
    const dCol = deskIdx % cols;
    const colsInRow = (dRow === maxRow) ? (total - dRow * cols) : cols;
    const isFront = dRow === 0;
    const isBack  = dRow === maxRow && maxRow > 0;
    const isLeft  = dCol === 0;
    const isRight = dCol === colsInRow - 1;
    if (isFront && isLeft && cols > 1)  return 'front-left';
    if (isFront && isRight && cols > 1) return 'front-right';
    if (isBack  && isLeft)  return 'back-left';
    if (isBack  && isRight) return 'back-right';
    if (isFront) return 'front';
    if (isBack)  return 'back';
    return null;
  }
  function seatsInZone(zone, layout, N) {
    const out = [];
    for (let i = 0; i < N; i++) {
      const z = seatZone(i, layout);
      if (!z) continue;
      // 'front' matches front-left / front-right too
      if (zone === 'front'      && (z === 'front' || z === 'front-left' || z === 'front-right')) out.push(i);
      else if (zone === 'back'  && (z === 'back'  || z === 'back-left'  || z === 'back-right'))  out.push(i);
      else if (zone === z) out.push(i);
    }
    return out;
  }

  // ── Scoring ──
  function scoreOrder(order, neighbors, fset, lset, missingTargets) {
    let forbHit = 0;
    for (const [i, j] of neighbors) {
      if (!order[i] || !order[j]) continue;
      if (isPair(order[i], order[j], fset)) forbHit++;
    }
    let missingLearn = 0;
    if (lset.size && missingTargets && missingTargets.length) {
      const seen = new Set();
      for (const [i, j] of neighbors) {
        if (!order[i] || !order[j]) continue;
        if (isPair(order[i], order[j], lset)) seen.add(pairKey(order[i], order[j]));
      }
      missingTargets.forEach(([a, b]) => {
        if (!seen.has(pairKey(a, b))) missingLearn++;
      });
    }
    return forbHit * 100 + missingLearn * 50;
  }

  // ── Scramble with pins ──
  function scrambleWithPins(allSeats, layout, fset, lset) {
    const N = allSeats.length;
    const order = new Array(N).fill(null);
    const usedNames = new Set();
    const usedIdx = new Set();
    const learnPairs = learningPairs.filter(([a, b]) => a && b);

    // 1. Apply seat-pins (exact)
    for (const [name, pin] of pins) {
      if (pin.type === 'seat' && pin.value < N) {
        order[pin.value] = name;
        usedNames.add(name);
        usedIdx.add(pin.value);
      }
    }
    // 2. Apply zone-pins: place in random free seat of that zone
    for (const [name, pin] of pins) {
      if (pin.type !== 'zone') continue;
      const candidates = seatsInZone(pin.value, layout, N).filter(i => !usedIdx.has(i));
      if (candidates.length === 0) continue;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      order[pick] = name;
      usedNames.add(name);
      usedIdx.add(pick);
    }
    // 3. Free seats and remaining names
    const freeIdx = [];
    for (let i = 0; i < N; i++) if (!usedIdx.has(i)) freeIdx.push(i);
    const remaining = allSeats.filter(x => !usedNames.has(x));

    let best = null, bestScore = Infinity;
    for (let t = 0; t < 800; t++) {
      const trial = [...order];
      const sh = shuffle(remaining);
      sh.forEach((name, k) => { trial[freeIdx[k]] = name; });
      const s = scoreOrder(trial, layout.neighbors, fset, lset, learnPairs);
      if (s < bestScore) { best = trial; bestScore = s; if (s === 0) break; }
    }
    // Local-swap improvement over free seats
    if (bestScore > 0 && best) {
      const o = [...best];
      for (let pass = 0; pass < 4; pass++) {
        let improved = false;
        for (let a = 0; a < freeIdx.length; a++) {
          for (let b = a + 1; b < freeIdx.length; b++) {
            const i = freeIdx[a], j = freeIdx[b];
            const before = scoreOrder(o, layout.neighbors, fset, lset, learnPairs);
            [o[i], o[j]] = [o[j], o[i]];
            const after = scoreOrder(o, layout.neighbors, fset, lset, learnPairs);
            if (after < before) improved = true;
            else [o[i], o[j]] = [o[j], o[i]];
          }
        }
        if (!improved) break;
      }
      best = o;
      bestScore = scoreOrder(o, layout.neighbors, fset, lset, learnPairs);
    }
    return { order: best || order, score: bestScore };
  }

  function countForbidden(order, neighbors, fset) {
    let c = 0;
    for (const [i, j] of neighbors) if (isPair(order[i], order[j], fset)) c++;
    return c;
  }

  function buildSeats() {
    const names = parseNames(namesEl.value);
    const seats = [...names];
    for (let i = 0; i < extraEmpty; i++) seats.push(null);
    return seats;
  }

  function pruneInvalidPins(validNames) {
    for (const [name] of [...pins]) if (!validNames.has(name)) pins.delete(name);
  }

  function doScramble() {
    const seats = buildSeats();
    if (seats.length === 0) { showToast('Skriv inn elever først!'); return; }
    const layout = computeLayout(seats.length);
    pruneInvalidPins(new Set(seats.filter(Boolean)));
    const fset = buildPairSet(forbiddenPairs);
    const lset = buildPairSet(learningPairs);
    const result = scrambleWithPins(seats, layout, fset, lset);
    currentOrder = result.order;
    currentLayout = layout;
    const forbHit = countForbidden(currentOrder, layout.neighbors, fset);
    conflictWarn.classList.toggle('is-visible', result.score > 0);
    if (result.score > 0) {
      conflictWarn.textContent = forbHit > 0
        ? `⚠️ ${forbHit} forbudte par måtte plasseres sammen. Prøv igjen eller dra manuelt.`
        : '⚠️ Klarte ikke plassere alle læringspar ved siden av hverandre.';
    }
    render();
    updateHead(forbHit);
  }

  function updateHead(forbHit) {
    if (!currentOrder.length) return;
    const named = currentOrder.filter(x => x).length;
    let label = '';
    if (mode === 'pairs') label = `Par-oppsett · ${currentLayout.desks.length} bord · ${named} elever`;
    else if (mode === 'bundles') label = `Grupper på ${currentLayout.size} · ${currentLayout.desks.length} bord · ${named} elever`;
    else label = `Hestesko · ${named} elever`;
    if (extraEmpty > 0) label += ` · ${extraEmpty} tomme`;
    if (pins.size > 0) label += ` · ${pins.size} 📌`;
    canvasTitle.textContent = label;
    canvasSub.textContent = forbHit === 0
      ? '✓ Klikk en plass for å låse en elev der eller til en sone. Dra elever for å justere.'
      : `⚠️ ${forbHit} forbudte par sitter ved siden av hverandre.`;
  }

  // ── Render ──
  function render() {
    canvas.innerHTML = '';
    if (currentOrder.length === 0) { canvas.appendChild(emptyState); return; }
    // Always show "Tavle" at front
    const front = document.createElement('div');
    front.className = 'front-indicator';
    front.textContent = 'Tavle';
    canvas.appendChild(front);

    if (mode === 'pairs') renderPairs();
    else if (mode === 'bundles') renderBundles();
    else renderHorseshoe();
    attachDragAndDrop();
  }

  function getConflictSet() {
    const fset = buildPairSet(forbiddenPairs);
    const conf = new Set();
    if (!currentLayout) return conf;
    for (const [i, j] of currentLayout.neighbors) {
      if (isPair(currentOrder[i], currentOrder[j], fset)) { conf.add(i); conf.add(j); }
    }
    return conf;
  }

  function makeSeat(idx, name, conflict) {
    const el = document.createElement('div');
    el.className = 'seat';
    if (name === null || name === undefined) {
      el.classList.add('--empty');
      el.textContent = '';
    } else {
      el.textContent = name;
      el.setAttribute('draggable', 'true');
    }
    if (conflict) el.classList.add('--conflict');
    if (name && pins.has(name)) el.classList.add('--pinned');
    el.dataset.index = idx;
    el.addEventListener('click', (e) => openContextMenu(e, idx, name));
    return el;
  }

  function applyDeskGrid(grid, cols) {
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    grid.style.gap = 'var(--s-6)';
    grid.style.justifyContent = 'center';
    grid.style.justifyItems = 'center';
    grid.style.maxWidth = '1100px';
    grid.style.margin = '0 auto';
  }

  function renderPairs() {
    const grid = document.createElement('div');
    grid.className = 'desk-grid --pairs';
    applyDeskGrid(grid, currentLayout.gridCols);
    const conf = getConflictSet();
    currentLayout.desks.forEach((d, di) => {
      const desk = document.createElement('div');
      desk.className = 'desk';
      desk.classList.add(d.length === 3 ? 'desk--triple' : 'desk--pair');
      const num = document.createElement('div');
      num.className = 'desk__num';
      num.textContent = String(di + 1).padStart(2, '0');
      desk.appendChild(num);
      d.forEach((i, posIdx) => {
        const s = makeSeat(i, currentOrder[i], conf.has(i));
        const cols = d.length;
        s.style.borderRight = posIdx === cols - 1 ? 'none' : '1.5px solid var(--chalk-100)';
        s.style.borderBottom = 'none';
        desk.appendChild(s);
      });
      grid.appendChild(desk);
    });
    canvas.appendChild(grid);
  }

  function renderBundles() {
    const grid = document.createElement('div');
    grid.className = 'desk-grid --bundles';
    applyDeskGrid(grid, currentLayout.gridCols);
    const conf = getConflictSet();
    currentLayout.desks.forEach((d, di) => {
      const desk = document.createElement('div');
      desk.className = 'desk';
      const size = d.length;
      let cols, rows;
      if (size <= 1) { cols = 1; rows = 1; }
      else if (size === 2) { cols = 2; rows = 1; }
      else if (size === 3) { cols = 3; rows = 1; }
      else if (size === 4) { cols = 2; rows = 2; }
      else if (size === 5) { cols = 3; rows = 2; }
      else if (size === 6) { cols = 3; rows = 2; }
      else { cols = 3; rows = Math.ceil(size / 3); }
      desk.style.display = 'grid';
      desk.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
      desk.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
      desk.style.height = (rows === 1 ? 110 : 200) + 'px';
      const num = document.createElement('div');
      num.className = 'desk__num';
      num.textContent = String(di + 1).padStart(2, '0');
      desk.appendChild(num);
      const finalRow = Math.floor((d.length - 1) / cols);
      d.forEach((i, posIdx) => {
        const s = makeSeat(i, currentOrder[i], conf.has(i));
        const col = posIdx % cols;
        const row = Math.floor(posIdx / cols);
        s.style.borderRight = col === cols - 1 ? 'none' : '1.5px solid var(--chalk-100)';
        s.style.borderBottom = row === finalRow ? 'none' : '1.5px solid var(--chalk-100)';
        desk.appendChild(s);
      });
      grid.appendChild(desk);
    });
    canvas.appendChild(grid);
  }

  function renderHorseshoe() {
    const { slots, rows, cols } = currentLayout;
    const wrap = document.createElement('div');
    wrap.className = 'horseshoe';
    wrap.style.gridTemplateColumns = `repeat(${cols}, 110px)`;
    const conf = getConflictSet();
    const slotMap = new Map();
    slots.forEach((p, i) => slotMap.set(p.r + ',' + p.c, i));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = slotMap.get(r + ',' + c);
        if (idx == null) {
          const ph = document.createElement('div'); ph.className = 'placeholder';
          wrap.appendChild(ph); continue;
        }
        const name = currentOrder[idx];
        const box = document.createElement('div');
        box.className = 'seat-box';
        if (name === null || name === undefined) {
          box.classList.add('--empty');
        } else {
          box.textContent = name;
          box.setAttribute('draggable', 'true');
        }
        if (conf.has(idx)) box.classList.add('--conflict');
        if (name && pins.has(name)) box.classList.add('--pinned');
        box.dataset.index = idx;
        const numEl = document.createElement('span');
        numEl.className = 'num';
        numEl.textContent = idx + 1;
        box.appendChild(numEl);
        box.addEventListener('click', (e) => openContextMenu(e, idx, name));
        wrap.appendChild(box);
      }
    }
    canvas.appendChild(wrap);
  }

  // ── Context menu ──
  let openMenu = null;
  function closeMenu() {
    if (openMenu) { openMenu.remove(); openMenu = null; }
    document.removeEventListener('click', outsideClose, true);
  }
  function outsideClose(e) { if (openMenu && !openMenu.contains(e.target)) closeMenu(); }

  function availableZones() {
    if (!currentLayout) return [];
    const N = currentOrder.length;
    const zones = [];
    ZONE_ORDER.forEach(z => {
      if (seatsInZone(z, currentLayout, N).length > 0) zones.push(z);
    });
    return zones;
  }

  function openContextMenu(e, idx, name) {
    if (!name) return;
    e.stopPropagation();
    closeMenu();
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';

    const pin = pins.get(name);
    if (pin) {
      const b = document.createElement('button');
      const label = pin.type === 'seat'
        ? `📌  Lås opp ${name}`
        : `📍  Lås opp ${name} (${ZONE_LABELS[pin.value]})`;
      b.textContent = label;
      b.className = '--danger';
      b.addEventListener('click', () => { pins.delete(name); closeMenu(); doRefresh(); });
      menu.appendChild(b);
      menu.appendChild(divider());
    }

    // Lås her (exact seat)
    const here = document.createElement('button');
    here.textContent = `📌  Lås ${name} på denne plassen`;
    here.addEventListener('click', () => {
      for (const [n, p] of [...pins]) if (p.type === 'seat' && p.value === idx) pins.delete(n);
      pins.set(name, { type: 'seat', value: idx });
      closeMenu(); doRefresh();
      showToast('Låst ' + name + ' på denne plassen');
    });
    menu.appendChild(here);
    menu.appendChild(divider());

    // Zone options
    availableZones().forEach(z => {
      const zb = document.createElement('button');
      zb.textContent = `📍  Lås ${name} til ${ZONE_LABELS[z]}`;
      zb.addEventListener('click', () => {
        pins.set(name, { type: 'zone', value: z });
        closeMenu(); doScramble();
        showToast(`Låst ${name} til ${ZONE_LABELS[z]}`);
      });
      menu.appendChild(zb);
    });

    document.body.appendChild(menu);
    const rect = e.currentTarget.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.left = Math.min(rect.left, window.innerWidth - 260) + 'px';
    menu.style.top = (rect.bottom + 4) + 'px';
    openMenu = menu;
    setTimeout(() => document.addEventListener('click', outsideClose, true), 0);
  }
  function divider() {
    const d = document.createElement('div');
    d.style.height = '1px';
    d.style.background = 'var(--chalk-100)';
    d.style.margin = '4px 0';
    return d;
  }

  function doRefresh() {
    const layout = computeLayout(currentOrder.length);
    currentLayout = layout;
    render();
    const fset = buildPairSet(forbiddenPairs);
    updateHead(countForbidden(currentOrder, layout.neighbors, fset));
  }

  // ── Drag & drop ──
  let dragFromIdx = null;
  function attachDragAndDrop() {
    canvas.querySelectorAll('[draggable="true"]').forEach(el => {
      el.addEventListener('dragstart', onDragStart);
      el.addEventListener('dragover', onDragOver);
      el.addEventListener('dragleave', onDragLeave);
      el.addEventListener('drop', onDrop);
      el.addEventListener('dragend', onDragEnd);
    });
    canvas.querySelectorAll('.seat.--empty, .seat-box.--empty').forEach(el => {
      el.addEventListener('dragover', onDragOver);
      el.addEventListener('dragleave', onDragLeave);
      el.addEventListener('drop', onDrop);
    });
  }
  function onDragStart(e) {
    this.classList.add('dragging');
    dragFromIdx = parseInt(this.dataset.index, 10);
    try { e.dataTransfer.setData('text/plain', String(dragFromIdx)); } catch (_) {}
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragOver(e) { e.preventDefault(); this.classList.add('drop-target'); e.dataTransfer.dropEffect = 'move'; }
  function onDragLeave() { this.classList.remove('drop-target'); }
  function onDrop(e) {
    e.preventDefault();
    this.classList.remove('drop-target');
    const to = parseInt(this.dataset.index, 10);
    if (dragFromIdx == null || isNaN(to) || to === dragFromIdx) return;
    const nameA = currentOrder[dragFromIdx];
    const nameB = currentOrder[to];
    [currentOrder[dragFromIdx], currentOrder[to]] = [currentOrder[to], currentOrder[dragFromIdx]];
    // Update seat-pins to follow
    if (nameA) { const p = pins.get(nameA); if (p && p.type === 'seat') p.value = to; }
    if (nameB) { const p = pins.get(nameB); if (p && p.type === 'seat') p.value = dragFromIdx; }
    dragFromIdx = null;
    doRefresh();
  }
  function onDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.drop-target').forEach(x => x.classList.remove('drop-target'));
  }

  // ── Toast ──
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
  }

  // ── Export ──
  $('export-text').addEventListener('click', async () => {
    if (!currentOrder.length) { showToast('Ingenting å eksportere ennå.'); return; }
    let txt = '';
    if (mode === 'pairs') {
      currentLayout.desks.forEach((d, i) => {
        const names = d.map(idx => currentOrder[idx] || '(tom)').join(' · ');
        txt += `Bord ${i + 1}: ${names}\n`;
      });
    } else if (mode === 'bundles') {
      currentLayout.desks.forEach((d, i) => {
        const names = d.map(idx => currentOrder[idx] || '(tom)').join(', ');
        txt += `Gruppe ${i + 1}: ${names}\n`;
      });
    } else {
      currentOrder.forEach((n, i) => { txt += `Plass ${i + 1}: ${n || '(tom)'}\n`; });
    }
    try { await navigator.clipboard.writeText(txt); showToast('✓ Kopiert til utklippstavle'); }
    catch { showToast('Kunne ikke kopiere.'); }
  });

  $('export-pdf').addEventListener('click', async () => {
    if (!currentOrder.length) { showToast('Ingenting å eksportere ennå.'); return; }
    showToast('Lager PDF…');
    canvas.classList.add('--hide-pins');
    try {
      const cv = await html2canvas(canvas, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const img = cv.toDataURL('image/png');
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 36;
      let imgW = pageW - margin * 2;
      let imgH = cv.height * imgW / cv.width;
      const maxH = pageH - margin * 2 - 40;
      if (imgH > maxH) { imgH = maxH; imgW = cv.width * imgH / cv.height; }
      pdf.addImage(img, 'PNG', (pageW - imgW) / 2, (pageH - imgH) / 2, imgW, imgH);
      pdf.save('klassekart.pdf');
      showToast('✓ PDF lastet ned');
    } catch (err) {
      console.error(err);
      showToast('Noe gikk galt under PDF-eksport.');
    } finally {
      canvas.classList.remove('--hide-pins');
    }
  });

  $('scramble').addEventListener('click', doScramble);

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); doScramble(); }
    if (e.key === 'Escape') closeMenu();
  });

  // Auto-generate on load
  doScramble();
})();
