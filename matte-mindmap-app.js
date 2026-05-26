// Mind map — radial layout, pan/zoom, collapse/expand, hover tooltips
(function () {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const data = window.MM_DATA;

  // Radius per depth — root at 0, primaries close, then expanding outward
  const R = [0, 230, 530, 800, 1080];

  // ── Annotate tree ──────────────────────────────────────────
  let _idSeq = 0;
  function annotate(node, parent) {
    node._id = 'n' + (_idSeq++);
    node._parent = parent;
    node._collapsed = false;
    if (node.children) for (const c of node.children) annotate(c, node);
  }
  annotate(data, null);

  function countLeaves(node) {
    if (!node.children || !node.children.length) return 1;
    return node.children.reduce((s, c) => s + countLeaves(c), 0);
  }

  // ── Layout (radial, sector-proportional to leaf count) ─────
  data.x = 0; data.y = 0; data.depth = 0; data.angle = 0;
  data._side = 'root';

  const [personlig, samfunn] = data.children;
  personlig.depth = 1; personlig.angle = Math.PI;
  personlig.x = Math.cos(Math.PI) * R[1];
  personlig.y = Math.sin(Math.PI) * R[1];
  personlig._side = 'personal';

  samfunn.depth = 1; samfunn.angle = 0;
  samfunn.x = R[1]; samfunn.y = 0;
  samfunn._side = 'society';

  function layoutSubtree(parent, startA, endA, childDepth) {
    if (!parent.children) return;
    const total = parent.children.reduce((s, c) => s + countLeaves(c), 0);
    const sweep = endA - startA;
    let cur = startA;
    for (const child of parent.children) {
      const w = countLeaves(child) / total;
      const childSweep = sweep * w;
      const a = cur + childSweep / 2;
      child.depth = childDepth;
      child.angle = a;
      child.x = Math.cos(a) * R[childDepth];
      child.y = Math.sin(a) * R[childDepth];
      child._side = parent._side;
      layoutSubtree(child, cur, cur + childSweep, childDepth + 1);
      cur += childSweep;
    }
  }
  // Personlig fans through left half: π/2 (top) → 3π/2 (bottom) going through π (left)
  layoutSubtree(personlig, Math.PI / 2, 3 * Math.PI / 2, 2);
  // Samfunn fans through right half: -π/2 (top) → π/2 (bottom) going through 0 (right)
  layoutSubtree(samfunn, -Math.PI / 2, Math.PI / 2, 2);

  // Flatten all nodes
  const allNodes = [];
  (function walk(n) {
    allNodes.push(n);
    if (n.children) for (const c of n.children) walk(c);
  })(data);
  const nodeById = new Map(allNodes.map(n => [n._id, n]));

  // ── DOM refs ───────────────────────────────────────────────
  const svg     = document.getElementById('mm-svg');
  const linksG  = document.getElementById('mm-links');
  const nodesG  = document.getElementById('mm-nodes');
  const canvas  = document.getElementById('mm-canvas');
  const tooltip = document.getElementById('mm-tooltip');
  const counter = document.getElementById('mm-counter-num');

  // ── Render links ───────────────────────────────────────────
  function curvePath(p, c) {
    const pR = Math.hypot(p.x, p.y);
    const cR = Math.hypot(c.x, c.y);
    const midR = (pR + cR) / 2;
    const pAng = (pR === 0) ? c.angle : p.angle;
    const cAng = c.angle;
    const c1x = Math.cos(pAng) * midR;
    const c1y = Math.sin(pAng) * midR;
    const c2x = Math.cos(cAng) * midR;
    const c2y = Math.sin(cAng) * midR;
    return `M${p.x.toFixed(1)},${p.y.toFixed(1)} C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
  }
  function buildLinks() {
    linksG.innerHTML = '';
    for (const node of allNodes) {
      if (!node._parent) continue;
      const p = node._parent;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', curvePath(p, node));
      let klass = 'mm-link ';
      if (p._id === data._id) klass += 'mm-link--root';
      else klass += 'mm-link--' + (node._side === 'personal' ? 'personal' : 'society');
      path.setAttribute('class', klass);
      const sw = Math.max(1.0, 5.0 - node.depth * 0.9);
      path.setAttribute('stroke-width', sw.toFixed(2));
      path.dataset.nodeId = node._id;
      node._linkEl = path;
      linksG.appendChild(path);
    }
  }

  // ── Render nodes ───────────────────────────────────────────
  function estWidth(text, fs) {
    return Math.max(text.length * fs * 0.56 + 22, fs * 3);
  }
  function nodeStyle(node) {
    if (node.depth === 0) return { fs: 22, h: 60, rx: 30, klass: 'mm-node--root' };
    if (node.depth === 1) return { fs: 20, h: 50, rx: 25, klass: 'mm-node--primary' };
    if (node.depth === 2) return { fs: 15, h: 38, rx: 19, klass: 'mm-node--domain' };
    if (node.depth === 3) return { fs: 13, h: 32, rx: 16, klass: 'mm-node--subgroup' };
    return                  { fs: 12, h: 26, rx: 13, klass: 'mm-node--leaf' };
  }
  function classListFor(node) {
    const c = ['mm-node', nodeStyle(node).klass];
    if (node._side === 'personal') c.push('is-personal');
    else if (node._side === 'society') c.push('is-society');
    if (node.children) c.push('has-children');
    return c.join(' ');
  }
  function tangentRotation(node) {
    // Returns rotation in degrees so rect aligns radially & text stays right-side-up
    let deg = node.angle * 180 / Math.PI;
    while (deg > 180) deg -= 360;
    while (deg < -180) deg += 360;
    if (deg > 90) deg -= 180;
    else if (deg < -90) deg += 180;
    return deg;
  }

  function buildNodes() {
    nodesG.innerHTML = '';
    for (const node of allNodes) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${node.x.toFixed(1)},${node.y.toFixed(1)})`);
      g.setAttribute('class', classListFor(node));
      g.dataset.nodeId = node._id;

      // Root: dashed halo behind
      if (node.depth === 0) {
        const halo = document.createElementNS(SVG_NS, 'circle');
        halo.setAttribute('class', 'mm-node__halo');
        halo.setAttribute('r', 78);
        g.appendChild(halo);
      }

      // Tag subgroup (rotated radially for depth ≥ 3 so labels don't overlap)
      const tag = document.createElementNS(SVG_NS, 'g');
      if (node.depth >= 3) {
        tag.setAttribute('transform', `rotate(${tangentRotation(node).toFixed(2)})`);
      }

      const st = nodeStyle(node);
      const w = estWidth(node.label, st.fs);

      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', (-w / 2).toFixed(1));
      rect.setAttribute('y', (-st.h / 2).toFixed(1));
      rect.setAttribute('width',  w.toFixed(1));
      rect.setAttribute('height', st.h);
      rect.setAttribute('rx', st.rx);
      tag.appendChild(rect);

      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('font-size', st.fs);
      text.textContent = node.label;
      tag.appendChild(text);

      g.appendChild(tag);

      // Small "+" marker for collapsed parents (always upright; appended after tag)
      if (node.children && node.depth > 0) {
        const markerR = 9;
        // Place marker on the OUTER side of the node along the radial direction
        const mx = Math.cos(node.angle) * (Math.hypot(0,0) === 0 ? 0 : 0) + Math.cos(node.angle) * (w * 0.5 + 12);
        const my = Math.sin(node.angle) * (w * 0.5 + 12);
        // For nodes at small radius, just place near right edge of the rect tangent
        const marker = document.createElementNS(SVG_NS, 'g');
        marker.setAttribute('class', 'mm-node__plus');
        const circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('r', markerR);
        circle.setAttribute('cx', mx.toFixed(1));
        circle.setAttribute('cy', my.toFixed(1));
        circle.setAttribute('fill', '#fff');
        circle.setAttribute('stroke', node._side === 'personal' ? '#F5A623' : '#07B3C7');
        circle.setAttribute('stroke-width', '1.75');
        marker.appendChild(circle);
        const plus = document.createElementNS(SVG_NS, 'text');
        plus.setAttribute('x', mx.toFixed(1));
        plus.setAttribute('y', (my + 0.5).toFixed(1));
        plus.setAttribute('font-size', '13');
        plus.setAttribute('font-weight', '900');
        plus.setAttribute('fill', node._side === 'personal' ? '#F5A623' : '#07B3C7');
        plus.setAttribute('text-anchor', 'middle');
        plus.setAttribute('dominant-baseline', 'middle');
        plus.textContent = '+';
        marker.appendChild(plus);
        g.appendChild(marker);
        node._markerEl = marker;
      }

      nodesG.appendChild(g);
      node._el = g;
    }
  }

  buildLinks();
  buildNodes();

  // ── Visibility (collapse) ──────────────────────────────────
  function isHiddenFromCollapse(n) {
    let p = n._parent;
    while (p) {
      if (p._collapsed) return true;
      p = p._parent;
    }
    return false;
  }
  function applyVisibility() {
    let visible = 0;
    for (const n of allNodes) {
      const hidden = isHiddenFromCollapse(n);
      n._el.classList.toggle('is-hidden', hidden);
      if (!hidden) visible++;
      n._el.classList.toggle('is-collapsed', !!n._collapsed);
    }
    for (const n of allNodes) {
      if (!n._linkEl) continue;
      n._linkEl.classList.toggle('is-hidden', isHiddenFromCollapse(n));
    }
    counter.textContent = visible;
  }
  applyVisibility();

  // ── Pan & zoom ─────────────────────────────────────────────
  let tx = 0, ty = 0, scale = 0.55;
  function applyTransform() {
    svg.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  }
  function fit() {
    tx = 0; ty = 0;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    const sw = 2800, sh = 2400;
    scale = Math.min(cw / sw, ch / sh) * 0.92;
    applyTransform();
  }

  // Drag (pointer)
  let dragging = false, downX = 0, downY = 0, downTx = 0, downTy = 0, moved = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true;
    downX = e.clientX; downY = e.clientY;
    downTx = tx; downTy = ty;
    moved = 0;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
    hideTooltip();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    moved = Math.max(moved, Math.hypot(dx, dy));
    tx = downTx + dx;
    ty = downTy + dy;
    applyTransform();
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  // Wheel zoom (cursor-anchored)
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const k = Math.exp(delta);
    const newScale = Math.max(0.18, Math.min(2.6, scale * k));
    const cr = canvas.getBoundingClientRect();
    const mx = e.clientX - cr.left - cr.width / 2;
    const my = e.clientY - cr.top  - cr.height / 2;
    const f = newScale / scale;
    tx = mx - (mx - tx) * f;
    ty = my - (my - ty) * f;
    scale = newScale;
    applyTransform();
  }, { passive: false });

  function zoomBy(f) {
    const newScale = Math.max(0.18, Math.min(2.6, scale * f));
    const ratio = newScale / scale;
    tx = tx * ratio; ty = ty * ratio;
    scale = newScale;
    applyTransform();
  }
  document.getElementById('mm-zoom-in').addEventListener('click', () => zoomBy(1.2));
  document.getElementById('mm-zoom-out').addEventListener('click', () => zoomBy(1 / 1.2));
  document.getElementById('mm-zoom-reset').addEventListener('click', () => fit());

  // ── Node click → toggle collapse (only if not dragged) ─────
  nodesG.addEventListener('click', (e) => {
    if (moved > 5) return;
    const g = e.target.closest('.mm-node');
    if (!g) return;
    const node = nodeById.get(g.dataset.nodeId);
    if (!node || !node.children || node.depth === 0) return;
    node._collapsed = !node._collapsed;
    applyVisibility();
  });

  // ── Hover → tooltip (leaves only) ──────────────────────────
  let hoverId = null;
  function showTooltip(node) {
    const sideLbl = node._side === 'personal' ? 'PERSONLIG · KONKRET' : 'SAMFUNN · KONKRET';
    tooltip.innerHTML =
      `<span class="mm-tooltip__label">${sideLbl}</span>` +
      `<div class="mm-tooltip__title">${escapeHtml(node.label)}</div>` +
      `<div class="mm-tooltip__body">${escapeHtml(node.ex || '')}</div>`;
    tooltip.classList.toggle('is-society', node._side === 'society');
    tooltip.classList.add('is-visible');
    tooltip.setAttribute('aria-hidden', 'false');
    positionTooltip(node);
  }
  function hideTooltip() {
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
    hoverId = null;
  }
  function positionTooltip(node) {
    const nodeRect = node._el.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const left = nodeRect.left + nodeRect.width / 2 - canvasRect.left;
    let top  = nodeRect.top  - canvasRect.top - 8;
    tooltip.style.left = left + 'px';
    // Flip below the node if near the top of the canvas
    if (top < 80) {
      top = nodeRect.bottom - canvasRect.top + 18;
      tooltip.style.transform = 'translate(-50%, 0)';
    } else {
      tooltip.style.transform = 'translate(-50%, -110%)';
    }
    tooltip.style.top = top + 'px';
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    ));
  }
  nodesG.addEventListener('mouseover', (e) => {
    const g = e.target.closest('.mm-node');
    if (!g) return;
    const node = nodeById.get(g.dataset.nodeId);
    if (!node) return;
    // Tooltip only for leaves with an example, when visible
    if (g.classList.contains('is-hidden')) return;
    if (!node.children && node.ex) {
      hoverId = node._id;
      showTooltip(node);
    }
    // Highlight branch path (faintly de-emphasize others)
    highlightLineage(node, true);
  });
  nodesG.addEventListener('mouseout', (e) => {
    const g = e.target.closest('.mm-node');
    if (!g) return;
    hideTooltip();
    highlightLineage(null, false);
  });

  function highlightLineage(node, on) {
    if (!on || !node) {
      for (const n of allNodes) {
        n._el.classList.remove('is-faded');
        if (n._linkEl) n._linkEl.classList.remove('is-faded');
      }
      return;
    }
    // Walk up to root and collect lineage ids
    const keep = new Set();
    let cur = node;
    while (cur) { keep.add(cur._id); cur = cur._parent; }
    for (const n of allNodes) {
      const inLineage = keep.has(n._id);
      n._el.classList.toggle('is-faded', !inLineage);
      if (n._linkEl) n._linkEl.classList.toggle('is-faded', !inLineage);
    }
  }

  // ── Expand / collapse controls ─────────────────────────────
  document.getElementById('mm-expand').addEventListener('click', () => {
    for (const n of allNodes) n._collapsed = false;
    applyVisibility();
  });
  document.getElementById('mm-collapse').addEventListener('click', () => {
    // Show root + primaries only — collapse the primaries so depth 2+ disappears
    for (const n of allNodes) n._collapsed = (n.depth === 1 && !!n.children);
    applyVisibility();
  });

  // ── Resize → refit ─────────────────────────────────────────
  let resizeT = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(fit, 120);
  });

  // ── Init ───────────────────────────────────────────────────
  fit();
})();
