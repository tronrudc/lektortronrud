/* Lektor Tronrud — juicy brain cursor with electric sparks + star trail.
   Auto-applied site-wide. Skips touch devices. Falls back gracefully. */
(function () {
  if (window.__ltBrainCursor) return;
  window.__ltBrainCursor = true;
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

  // ── Styles ───────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.id = 'lt-cursor-style';
  style.textContent = [
    'html, body { cursor: none; }',
    'a, button, [role="button"], summary, label, .yt-facade { cursor: none; }',
    'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]),',
    'textarea, [contenteditable="true"] { cursor: text; }',
    '',
    '.lt-cursor {',
    '  position: fixed; top: 0; left: 0; width: 0; height: 0;',
    '  pointer-events: none; z-index: 2147483646;',
    '  transition: opacity .25s ease;',
    '}',
    '.lt-cursor__inner {',
    '  width: 30px; height: 30px;',
    '  transform: translate(-50%, -50%) scale(1);',
    '  transition: transform .2s cubic-bezier(.34,1.56,.64,1);',
    '  filter: drop-shadow(0 4px 12px rgba(255, 111, 165, .55));',
    '}',
    '.lt-cursor.is-interactive .lt-cursor__inner { transform: translate(-50%, -50%) scale(1.32); filter: drop-shadow(0 0 16px rgba(255, 227, 74, .85)) drop-shadow(0 4px 14px rgba(255, 111, 165, .65)); }',
    '.lt-cursor.is-clicking .lt-cursor__inner { transform: translate(-50%, -50%) scale(0.82); }',
    '.lt-cursor svg { display: block; width: 100%; height: 100%; overflow: visible; }',
    '',
    '.lt-cursor .brain-glow { animation: lt-pulse 1.8s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }',
    '@keyframes lt-pulse { 0%, 100% { opacity: .45; } 50% { opacity: .9; } }',
    '.lt-cursor.is-interactive .brain-glow { animation: lt-pulse .55s ease-in-out infinite; }',
    '',
    '.lt-cursor .bolt { animation: lt-flicker 1s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }',
    '@keyframes lt-flicker { 0%, 100% { opacity: 1; transform: rotate(0); } 30% { opacity: .25; transform: rotate(-6deg); } 55% { opacity: 1; transform: rotate(4deg); } 78% { opacity: .55; } }',
    '.lt-cursor.is-interactive .bolt { animation: lt-flicker .32s ease-in-out infinite; }',
    '',
    '/* electric ring that snaps on while hovering a clickable */',
    '.lt-cursor__ring {',
    '  position: absolute; left: 50%; top: 50%; width: 32px; height: 32px;',
    '  margin: -16px 0 0 -16px; border-radius: 50%;',
    '  border: 2px dashed rgba(255, 227, 74, .9);',
    '  opacity: 0; transform: scale(.5) rotate(0deg);',
    '  transition: opacity .18s ease;',
    '}',
    '.lt-cursor.is-interactive .lt-cursor__ring { opacity: 1; animation: lt-ring-spin 1.1s linear infinite; }',
    '@keyframes lt-ring-spin { from { transform: scale(1) rotate(0deg); } to { transform: scale(1.15) rotate(360deg); } }',
    '',
    '.lt-cursor .twinkle  { animation: lt-twinkle 1.4s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }',
    '.lt-cursor.is-interactive .twinkle { animation-duration: .6s; }',
    '.lt-cursor .twinkle.t2 { animation-delay: .5s; }',
    '.lt-cursor .twinkle.t3 { animation-delay: 1.0s; }',
    '@keyframes lt-twinkle { 0%, 100% { opacity: 0; transform: scale(.25) rotate(0); } 50% { opacity: 1; transform: scale(1.1) rotate(45deg); } }',
    '',
    '.lt-spark {',
    '  position: fixed; top: 0; left: 0;',
    '  pointer-events: none; z-index: 2147483645;',
    '  will-change: transform, opacity;',
    '}',
    '.lt-spark svg { display: block; width: 100%; height: 100%; overflow: visible; }',
    '@keyframes lt-spark-fade {',
    '  0%   { opacity: 1; transform: translate(var(--ox,0), var(--oy,0)) scale(.35) rotate(0deg); }',
    '  100% { opacity: 0; transform: translate(calc(var(--ox,0) + var(--dx,0)), calc(var(--oy,0) + var(--dy,0))) scale(1.3) rotate(220deg); }',
    '}',
    '',
    '@media (prefers-reduced-motion: reduce) {',
    '  .lt-cursor .brain-glow, .lt-cursor .bolt, .lt-cursor .twinkle { animation: none; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  // ── Brain SVG ────────────────────────────────────────────────────────────
  var BRAIN_SVG = [
    '<svg viewBox="-24 -24 48 48" aria-hidden="true">',
    '  <g class="brain-glow">',
    '    <circle cx="0" cy="0" r="18" fill="#FF87B5" opacity="0.35"/>',
    '    <circle cx="0" cy="0" r="12" fill="#FFC1D8" opacity="0.55"/>',
    '  </g>',
    '  <path d="M -2 -13 C -9 -14 -15 -10 -14 -4 C -17 -2 -16 5 -12 6 C -14 11 -8 14 -4 12 C -2 14 -1 13 -1 11 L -1 -10 C -1 -12 -2 -13 -2 -13 Z" fill="#FF6FA5" stroke="#7A1F49" stroke-width="1.7" stroke-linejoin="round"/>',
    '  <path d="M 2 -13 C 9 -14 15 -10 14 -4 C 17 -2 16 5 12 6 C 14 11 8 14 4 12 C 2 14 1 13 1 11 L 1 -10 C 1 -12 2 -13 2 -13 Z" fill="#FF6FA5" stroke="#7A1F49" stroke-width="1.7" stroke-linejoin="round"/>',
    '  <g stroke="#7A1F49" stroke-width="1" fill="none" stroke-linecap="round">',
    '    <path d="M -10 -6 C -7 -8 -5 -5 -3 -7"/>',
    '    <path d="M -11 0 C -8 -2 -6 2 -3 0"/>',
    '    <path d="M -10 6 C -7 4 -5 8 -3 6"/>',
    '    <path d="M 10 -6 C 7 -8 5 -5 3 -7"/>',
    '    <path d="M 11 0 C 8 -2 6 2 3 0"/>',
    '    <path d="M 10 6 C 7 4 5 8 3 6"/>',
    '  </g>',
    '  <ellipse cx="-7" cy="-8" rx="3" ry="1.6" fill="#FFD7E5" opacity="0.85"/>',
    '  <ellipse cx="7"  cy="-8" rx="3" ry="1.6" fill="#FFD7E5" opacity="0.85"/>',
    '  <g class="bolt">',
    '    <path d="M -2.5 -5 L 2.2 -1.5 L -0.8 -0.5 L 3 4 L -1.6 0.6 L 1.1 -0.4 Z" fill="#FFE34A" stroke="#0E1A38" stroke-width="0.7" stroke-linejoin="round"/>',
    '  </g>',
    '  <g fill="#FFE34A" stroke="#E89B00" stroke-width="0.4">',
    '    <g class="twinkle"    transform="translate(-17 -15)"><path d="M 0 -3 L 0.7 -0.7 L 3 0 L 0.7 0.7 L 0 3 L -0.7 0.7 L -3 0 L -0.7 -0.7 Z"/></g>',
    '    <g class="twinkle t2" transform="translate(18 -10)"><path d="M 0 -2.5 L 0.6 -0.6 L 2.5 0 L 0.6 0.6 L 0 2.5 L -0.6 0.6 L -2.5 0 L -0.6 -0.6 Z"/></g>',
    '    <g class="twinkle t3" transform="translate(15 16)"><path d="M 0 -2 L 0.5 -0.5 L 2 0 L 0.5 0.5 L 0 2 L -0.5 0.5 L -2 0 L -0.5 -0.5 Z"/></g>',
    '  </g>',
    '</svg>'
  ].join('');

  // ── Mount ────────────────────────────────────────────────────────────────
  function mount() {
    var wrap = document.createElement('div');
    wrap.className = 'lt-cursor';
    wrap.style.opacity = '0';
    var ring = document.createElement('div');
    ring.className = 'lt-cursor__ring';
    wrap.appendChild(ring);
    var inner = document.createElement('div');
    inner.className = 'lt-cursor__inner';
    inner.innerHTML = BRAIN_SVG;
    wrap.appendChild(inner);
    document.body.appendChild(wrap);

    var isHot = false;        // hovering a clickable
    var hotSparkAt = 0;

    var x = -100, y = -100, tX = -100, tY = -100, shown = false;

    function tick() {
      x += (tX - x) * 0.32;
      y += (tY - y) * 0.32;
      wrap.style.transform = 'translate(' + x + 'px, ' + y + 'px)';
      // while hovering a clickable, keep firing electric sparks + stars
      if (isHot && shown) {
        var now = performance.now();
        if (now - hotSparkAt > 55) {
          hotSparkAt = now;
          spawnSpark(tX, tY);
          if (Math.random() < 0.5) spawnSpark(tX, tY);
        }
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    var lastSparkAt = 0;
    document.addEventListener('mousemove', function (e) {
      tX = e.clientX;
      tY = e.clientY;
      if (!shown) { wrap.style.opacity = '1'; shown = true; }
      var now = performance.now();
      if (now - lastSparkAt > 95) {
        lastSparkAt = now;
        spawnSpark(e.clientX, e.clientY);
      }
    });

    document.addEventListener('mouseleave', function () { wrap.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { wrap.style.opacity = '1'; });
    window.addEventListener('blur',  function () { wrap.style.opacity = '0'; });
    window.addEventListener('focus', function () { wrap.style.opacity = '1'; });

    document.addEventListener('mouseover', function (e) {
      var hot = e.target.closest && e.target.closest(
        'a, button, [role="button"], .yt-facade, summary, label[for], ' +
        'input[type="checkbox"], input[type="radio"], input[type="button"], ' +
        'input[type="submit"], input[type="reset"]'
      );
      isHot = !!hot;
      wrap.classList.toggle('is-interactive', isHot);
    });

    document.addEventListener('mousedown', function (e) {
      wrap.classList.add('is-clicking');
      for (var i = 0; i < 7; i++) spawnSpark(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', function () {
      wrap.classList.remove('is-clicking');
    });
  }

  function spawnSpark(cx, cy) {
    var star = document.createElement('div');
    star.className = 'lt-spark';
    var size = 6 + Math.random() * 6;
    var ox = (Math.random() - 0.5) * 30;
    var oy = (Math.random() - 0.5) * 30;
    var dx = (Math.random() - 0.5) * 30;
    var dy = -8 - Math.random() * 24;
    var roll = Math.random();
    var color = roll < 0.5 ? '#FFE34A' : (roll < 0.8 ? '#FF87B5' : '#FFFFFF');
    star.style.cssText =
      'left:' + cx + 'px; top:' + cy + 'px;' +
      'width:' + size + 'px; height:' + size + 'px;' +
      '--ox:' + ox + 'px; --oy:' + oy + 'px;' +
      '--dx:' + dx + 'px; --dy:' + dy + 'px;' +
      'transform: translate(' + ox + 'px, ' + oy + 'px) scale(.35);' +
      'animation: lt-spark-fade 780ms ease-out forwards;';
    star.innerHTML =
      '<svg viewBox="-3 -3 6 6"><path d="M 0 -3 L 0.6 -0.6 L 3 0 L 0.6 0.6 L 0 3 L -0.6 0.6 L -3 0 L -0.6 -0.6 Z" fill="' + color + '"/></svg>';
    document.body.appendChild(star);
    setTimeout(function () { star.remove(); }, 820);
  }

  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
