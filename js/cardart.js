/* ============================================================
   Cartas realistas (SVG): naipes, disposição clássica dos símbolos
   e figuras de Valete, Dama e Rei de face dupla.
   Sobrescreve Core.cardEl (usado por Truco e Poker).
   ============================================================ */
(function () {
  'use strict';
  const RED = '#d6232f', INK = '#17171c', SKIN = '#f6d7b4';
  const PAL = {
    H: { a: '#d6232f', b: '#2a4a9c', c: '#f4c430' },
    D: { a: '#f4c430', b: '#d6232f', c: '#2a4a9c' },
    S: { a: '#1c1c24', b: '#2a4a9c', c: '#f4c430' },
    C: { a: '#2a4a9c', b: '#1c1c24', c: '#f4c430' }
  };

  // ---------- naipes (viewBox 0 0 24 24) ----------
  const SUIT = {
    H: '<path d="M12 21.5C5 15.5 2 12 2 8.3A5 5 0 0 1 12 6.4 5 5 0 0 1 22 8.3C22 12 19 15.5 12 21.5Z"/>',
    D: '<path d="M12 1.8 21.2 12 12 22.2 2.8 12Z"/>',
    S: '<path d="M12 1.6C12 1.6 3 9.2 3 14.4A4.6 4.6 0 0 0 11.2 17.2C10.9 19.6 9.7 21.2 8 22.4H16C14.3 21.2 13.1 19.6 12.8 17.2A4.6 4.6 0 0 0 21 14.4C21 9.2 12 1.6 12 1.6Z"/>',
    C: '<circle cx="12" cy="7.3" r="4.6"/><circle cx="6.3" cy="14.2" r="4.6"/><circle cx="17.7" cy="14.2" r="4.6"/><path d="M12 11.5V16C12 19.4 10.2 21.2 7.6 22.4H16.4C13.8 21.2 12 19.4 12 16Z"/>'
  };
  const suitSvg = (s, cls) => `<svg class="${cls || 'ss'}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${SUIT[s]}</svg>`;
  const isRed = s => s === 'H' || s === 'D';

  // ---------- símbolos (cartas de número) ----------
  const COL = [36, 50, 70], ROWS4 = [26, 56, 86, 116];
  const LAYOUT = {
    A: [[50, 71, 0, 46]],
    '2': [[50, 28], [50, 114, 1]],
    '3': [[50, 28], [50, 71], [50, 114, 1]],
    '4': [[36, 28], [64, 28], [36, 114, 1], [64, 114, 1]],
    '5': [[36, 28], [64, 28], [50, 71], [36, 114, 1], [64, 114, 1]],
    '6': [[36, 28], [64, 28], [36, 71], [64, 71], [36, 114, 1], [64, 114, 1]],
    '7': [[36, 28], [64, 28], [50, 49], [36, 71], [64, 71], [36, 114, 1], [64, 114, 1]],
    '8': [[36, 28], [64, 28], [50, 49], [36, 71], [64, 71], [50, 93, 1], [36, 114, 1], [64, 114, 1]],
    '9': [[36, ROWS4[0]], [64, ROWS4[0]], [36, ROWS4[1]], [64, ROWS4[1]], [50, 71], [36, ROWS4[2], 1], [64, ROWS4[2], 1], [36, ROWS4[3], 1], [64, ROWS4[3], 1]],
    '10': [[36, ROWS4[0]], [64, ROWS4[0]], [50, 41], [36, ROWS4[1]], [64, ROWS4[1]], [36, ROWS4[2], 1], [64, ROWS4[2], 1], [50, 101, 1], [36, ROWS4[3], 1], [64, ROWS4[3], 1]]
  };
  function pipsArt(r, s) {
    const key = r === 'T' ? '10' : r, lay = LAYOUT[key] || [];
    const col = isRed(s) ? RED : INK;
    const base = (key === '9' || key === '10') ? 17 : 20;
    const pips = lay.map(([x, y, rot, size]) => {
      const k = (size || base) / 24;
      return `<g transform="translate(${x} ${y})${rot ? ' rotate(180)' : ''} scale(${k}) translate(-12 -12)" fill="${col}">${SUIT[s]}</g>`;
    }).join('');
    return `<svg class="art" viewBox="0 0 100 142">${pips}</svg>`;
  }

  // ---------- figuras (meia figura em 68 x 57) ----------
  function half(r, s) {
    const P = PAL[s], a = P.a, b = P.b, c = P.c;
    const hair = r === 'K' ? '#cfcfd8' : r === 'Q' ? '#d99a2b' : '#7a4a22';
    let g = '';
    // corpo (dois tons) e galões
    g += `<path d="M4 57 8 43Q14 38 26 36L34 38V57Z" fill="${a}" stroke="${INK}" stroke-width="1"/>`;
    g += `<path d="M34 38 42 36Q54 38 60 43L64 57H34Z" fill="${b}" stroke="${INK}" stroke-width="1"/>`;
    g += `<rect x="31" y="38" width="6" height="19" fill="${c}" stroke="${INK}" stroke-width=".6"/>`;
    [43, 51].forEach(y => { g += `<path d="M34 ${y - 2.5} 36.2 ${y} 34 ${y + 2.5} 31.8 ${y}Z" fill="${a}" stroke="${INK}" stroke-width=".4"/>`; });
    g += `<path d="M4 54.3H64" stroke="${c}" stroke-width="2.2"/><path d="M8 43Q14 38 26 36M60 43Q54 38 42 36" stroke="${c}" stroke-width="1.8" fill="none"/>`;
    // cabelo / barba atrás
    if (r === 'K') g += `<path d="M24 24Q23 11 34 11Q45 11 44 24L45.5 37Q34 33 22.5 37Z" fill="${hair}" stroke="${INK}" stroke-width=".8"/>`;
    else if (r === 'Q') g += `<path d="M23 22Q22 10 34 10Q46 10 45 22L48.5 45Q40 41 38 34H30Q28 41 19.5 45Z" fill="${hair}" stroke="${INK}" stroke-width=".8"/>`;
    else g += `<path d="M24 22Q23 11 34 11Q45 11 44 22L46.5 35Q40 32 34 34Q28 32 21.5 35Z" fill="${hair}" stroke="${INK}" stroke-width=".8"/>`;
    // colarinho
    g += `<path d="M26 36Q34 41.5 42 36L40.4 34Q34 38 27.6 34Z" fill="#fff" stroke="${INK}" stroke-width=".6"/>`;
    // rosto
    g += `<ellipse cx="34" cy="25" rx="7.6" ry="9" fill="${SKIN}" stroke="${INK}" stroke-width=".8"/>`;
    g += `<ellipse cx="30.6" cy="23.6" rx="1.1" ry="1.5" fill="${INK}"/><ellipse cx="37.4" cy="23.6" rx="1.1" ry="1.5" fill="${INK}"/>`;
    g += `<path d="M28.4 21Q30.6 19.6 32.6 21M35.4 21Q37.4 19.6 39.6 21" stroke="${INK}" stroke-width=".8" fill="none"/>`;
    g += `<path d="M34 24Q35.8 27 33.6 28.2" stroke="#b57a4f" stroke-width=".8" fill="none"/>`;
    if (r === 'K') {
      g += `<path d="M26.4 28Q27 38.5 34 41.5Q41 38.5 41.6 28Q38 33.5 34 33.5Q30 33.5 26.4 28Z" fill="#e8e8f0" stroke="${INK}" stroke-width=".7"/>`;
      g += `<path d="M29 29.6Q34 27.6 39 29.6Q34 31.5 29 29.6Z" fill="#f4f4fa" stroke="${INK}" stroke-width=".6"/>`;
    } else {
      g += `<path d="M31.4 29.6Q34 31.6 36.6 29.6" stroke="#b3262f" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
      g += `<ellipse cx="29.6" cy="27.4" rx="1.8" ry="1" fill="#f0a08a" opacity=".55"/><ellipse cx="38.4" cy="27.4" rx="1.8" ry="1" fill="#f0a08a" opacity=".55"/>`;
    }
    // coroa / chapéu
    if (r === 'K') {
      g += `<path d="M24 17.5V9L28.5 13.5 34 6.5 39.5 13.5 44 9V17.5Z" fill="${c}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>`;
      g += `<rect x="24" y="15.4" width="20" height="3.2" fill="${a}" stroke="${INK}" stroke-width=".6"/><circle cx="34" cy="5.4" r="1.7" fill="${c}" stroke="${INK}" stroke-width=".6"/>`;
      [29, 34, 39].forEach(x => { g += `<circle cx="${x}" cy="17" r=".9" fill="#fff"/>`; });
    } else if (r === 'Q') {
      g += `<path d="M24.5 17 23.5 8.5 28 12.5 31 7 34 11.5 37 7 40 12.5 44.5 8.5 43.5 17Z" fill="${c}" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>`;
      g += `<rect x="24.2" y="15.2" width="19.6" height="3.2" fill="${b}" stroke="${INK}" stroke-width=".6"/>`;
      [[23.5, 7.6], [31, 6], [37, 6], [44.5, 7.6]].forEach(([x, y]) => { g += `<circle cx="${x}" cy="${y}" r="1.4" fill="#fff" stroke="${INK}" stroke-width=".5"/>`; });
    } else {
      g += `<path d="M23 16Q23 5.5 34 6.5Q46 7.5 45 16Q34 13 23 16Z" fill="${b}" stroke="${INK}" stroke-width=".9"/>`;
      g += `<path d="M23 16Q34 13 45 16V18.2Q34 15.6 23 18.2Z" fill="${c}" stroke="${INK}" stroke-width=".6"/>`;
      g += `<path d="M41 8.5Q52 1.5 55 11.5Q49 7 42.5 12Z" fill="#fff" stroke="${INK}" stroke-width=".7"/>`;
    }
    // objeto na mão + marca do naipe
    const mark = (x, y, k) => `<g transform="translate(${x} ${y}) scale(${k})" fill="${isRed(s) ? RED : INK}">${SUIT[s]}</g>`;
    if (r === 'K') {
      g += `<rect x="51.5" y="6" width="3" height="40" fill="#dfe1ea" stroke="${INK}" stroke-width=".7"/><path d="M51.5 6 53 2 54.5 6Z" fill="#dfe1ea" stroke="${INK}" stroke-width=".7"/>`;
      g += `<rect x="47.5" y="44" width="11" height="2.7" rx="1" fill="${c}" stroke="${INK}" stroke-width=".7"/><rect x="51.8" y="46.6" width="2.4" height="6" fill="${a}" stroke="${INK}" stroke-width=".6"/>`;
      g += `<circle cx="53" cy="49" r="3.2" fill="${SKIN}" stroke="${INK}" stroke-width=".7"/>` + mark(5, 5, .6);
    } else if (r === 'Q') {
      g += `<path d="M52 56Q50.5 47 53 39" stroke="#2f7d32" stroke-width="1.6" fill="none"/><path d="M52 50Q47 47 46 51Q50 52 52 50Z" fill="#3a9a3d" stroke="${INK}" stroke-width=".5"/>`;
      g += `<circle cx="53" cy="36.5" r="3.7" fill="${RED}" stroke="${INK}" stroke-width=".7"/><circle cx="53" cy="36.5" r="1.4" fill="${c}"/>`;
      g += `<circle cx="52" cy="48" r="3.1" fill="${SKIN}" stroke="${INK}" stroke-width=".7"/>` + mark(5, 5, .6);
    } else {
      g += `<path d="M13 3V56" stroke="#8a6a3a" stroke-width="1.9"/><path d="M13 7Q3.5 5.5 3.5 16.5Q9 14 13 16.5Z" fill="#dfe1ea" stroke="${INK}" stroke-width=".7"/>`;
      g += `<circle cx="13" cy="47" r="3.2" fill="${SKIN}" stroke="${INK}" stroke-width=".7"/>` + mark(50, 17, .6);
    }
    return g;
  }
  function courtArt(r, s) {
    const f = half(r, s);
    return `<svg class="art" viewBox="0 0 100 142">
      <rect x="20" y="22" width="60" height="98" rx="2.5" fill="#fffdf4" stroke="${INK}" stroke-width=".9"/>
      <g transform="translate(20 22) scale(.86)">${f}</g>
      <g transform="rotate(180 50 71) translate(20 22) scale(.86)">${f}</g>
      <path d="M20 71H80" stroke="${INK}" stroke-width=".7"/>
    </svg>`;
  }
  const cache = {};
  function art(c) {
    const k = c.r + c.s;
    if (!cache[k]) cache[k] = 'KQJ'.includes(c.r) ? courtArt(c.r, c.s) : pipsArt(c.r, c.s);
    return cache[k];
  }

  Core.suitSvg = suitSvg;
  /** cardEl({r:'A', s:'S'}, {back, small, cls}) -> elemento .card */
  Core.cardEl = function (c, o) {
    o = o || {};
    const el = document.createElement('div');
    el.className = 'card' + (o.small ? ' small' : '') + (o.cls ? ' ' + o.cls : '');
    if (!c || o.back || !c.r) { el.classList.add('back'); el.innerHTML = '<i></i><svg class="bk" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 21 12 12 21 3 12Z" opacity=".9"/></svg>'; return el; }
    const lab = c.r === 'T' ? '10' : c.r;
    el.classList.add(isRed(c.s) ? 'red' : 'blk');
    el.dataset.r = c.r; el.dataset.s = c.s;
    el.innerHTML = `<b class="tl"><span>${lab}</span>${suitSvg(c.s)}</b><b class="br"><span>${lab}</span>${suitSvg(c.s)}</b>${art(c)}`;
    return el;
  };
})();
