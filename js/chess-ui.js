/* ============================================================
   Xadrez: interface (tabuleiro, estilos, jogo vs IA, tutorial)
   ============================================================ */
(function () {
  'use strict';
  const { h, $, sleep } = Core;
  const E = window.ChessEngine;
  const OP = window.ChessOpenings;

  // ---------------- peças em SVG (viewBox 100x100) ----------------
  const BASE = '<rect x="22" y="78" width="56" height="12" rx="5"/>';
  const PIECES = {
    1: `<circle cx="50" cy="29" r="12"/><path d="M50 41C41 41 37 48 41 54C35 58 31 69 29 78L71 78C69 69 65 58 59 54C63 48 59 41 50 41Z"/>${BASE}<path class="d" d="M40 54H60"/>`,
    2: `<path d="M27 78C27 61 33 50 45 42C39 42 33 44 25 52L21 47C21 39 27 33 33 29L33 18L42 25C46 19 54 15 62 19C77 27 79 56 74 78Z"/>${BASE}<circle class="e" cx="42" cy="35" r="2.8"/><path class="d" d="M26 49L31 51M52 27C60 30 66 40 66 52"/>`,
    3: `<circle cx="50" cy="15" r="5.5"/><path d="M50 22C65 31 71 44 62 55L38 55C29 44 35 31 50 22Z"/><path d="M33 55H67V63H33Z"/><path d="M42 63H58L67 78H33Z"/>${BASE}<path class="d" d="M45 33L55 45"/>`,
    4: `<path d="M26 14H38V23H44V14H56V23H62V14H74V38H26Z"/><path d="M32 38H68L64 49H36Z"/><path d="M36 49H64L68 78H32Z"/>${BASE}<path class="d" d="M38 58H62"/>`,
    5: `<circle cx="19" cy="30" r="5"/><circle cx="35" cy="21" r="5"/><circle cx="50" cy="17" r="5"/><circle cx="65" cy="21" r="5"/><circle cx="81" cy="30" r="5"/><path d="M26 78L19 33L35 55L36 25L45 53L50 22L55 53L64 25L65 55L81 33L74 78Z"/>${BASE}<path class="d" d="M32 66H68"/>`,
    6: `<path d="M45 6H55V14H63V23H55V31H45V23H37V14H45Z"/><path d="M50 33C71 33 80 46 71 58C77 66 75 72 72 78H28C25 72 23 66 29 58C20 46 29 33 50 33Z"/>${BASE}<path class="d" d="M33 58H67M50 40V52"/>`
  };
  const GLYPH = { 1: '♟', 2: '♞', 3: '♝', 4: '♜', 5: '♛', 6: '♚' };
  const pieceSvg = t => `<svg viewBox="0 0 100 100">${PIECES[t]}</svg>`;

  const THEMES = [
    ['walnut', 'Madeira Nobre'], ['tournament', 'Torneio Verde'], ['ocean', 'Oceano'], ['marble', 'Mármore'],
    ['neon', 'Neon Cyber'], ['parchment', 'Pergaminho'], ['candy', 'Candy'], ['ice', 'Gelo'], ['obsidian', 'Obsidiana']
  ];
  const PIECESETS = [['classic', 'Clássico'], ['flat', 'Moderno'], ['gold', 'Ouro & Prata'], ['gems', 'Gemas'], ['neon', 'Neon'], ['glyph', 'Tipográfico']];

  // ---------------- cliente da IA (Web Worker com plano B) ----------------
  const AI = {
    worker: null, id: 0, pending: new Map(),
    ensure() {
      if (this.worker || this.failed) return;
      try {
        this.worker = new Worker('js/chess-worker.js');
        this.worker.onmessage = ev => { const p = this.pending.get(ev.data.id); if (p) { this.pending.delete(ev.data.id); p(ev.data); } };
        this.worker.onerror = () => { this.worker = null; this.failed = true; const ps = Array.from(this.pending.values()); this.pending.clear(); ps.forEach(f => f(null)); };
      } catch (e) { this.failed = true; }
    },
    cancel() { if (this.worker) { this.worker.terminate(); this.worker = null; } this.pending.clear(); },
    think(game, opts) {
      this.ensure();
      const moves = game.history.map(x => x.m);
      if (this.worker) {
        const id = ++this.id;
        return new Promise(res => {
          this.pending.set(id, d => {
            if (d) res(d.move); else res(this.sync(game, opts));
          });
          this.worker.postMessage({ id, fen: game.startFen, moves, opts });
        });
      }
      return new Promise(res => setTimeout(() => res(this.sync(game, opts)), 30));
    },
    sync(game, opts) { const r = new E.Search(game.pos).run(opts); return r ? r.move : 0; }
  };

  // ---------------- tabuleiro ----------------
  class BoardView {
    constructor(cb) {
      this.cb = cb || {};
      this.flipped = false; this.els = new Map(); this.sqEls = new Map();
      this.el = h('div', { class: 'board', 'data-theme': 'walnut', 'data-pieces': 'classic' });
      this.inner = h('div', { class: 'bd-inner' });
      this.grid = h('div', { class: 'bd-grid' });
      this.layer = h('div', { class: 'bd-pieces' });
      this.arrows = h('div', { class: 'bd-arrows' });
      this.files = h('div', { class: 'bd-files' }); this.ranks = h('div', { class: 'bd-ranks' });
      this.inner.append(this.grid, this.arrows, this.layer);
      this.el.append(this.files, this.ranks, this.inner);
      this.buildSquares();
      this.bindPointer();
    }
    colRow(sq) { const c = sq & 7, r = sq >> 4; return this.flipped ? [7 - c, 7 - r] : [c, r]; }
    buildSquares() {
      this.grid.innerHTML = ''; this.sqEls.clear();
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
        const sq = this.flipped ? (7 - row) * 16 + (7 - col) : row * 16 + col;
        const r = sq >> 4, c = sq & 7;
        const d = h('div', { class: 'sq ' + (((r + c) & 1) ? 'd' : 'l') });
        this.sqEls.set(sq, d); this.grid.append(d);
      }
      const F = 'abcdefgh';
      this.files.innerHTML = ''; this.ranks.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        this.files.append(h('span', null, this.flipped ? F[7 - i] : F[i]));
        this.ranks.append(h('span', null, this.flipped ? i + 1 : 8 - i));
      }
    }
    setFlipped(f) {
      if (this.flipped === f) return;
      this.flipped = f; this.buildSquares();
      this.els.forEach((el, sq) => this.place(el, sq));
      if (this.marks) this.setMarks(this.marks);
      if (this.arrowList) this.setArrows(this.arrowList);
    }
    place(el, sq) { const [c, r] = this.colRow(sq); el.style.left = c * 12.5 + '%'; el.style.top = r * 12.5 + '%'; }
    create(sq, p) {
      const el = h('div', { class: 'pc ' + ((p >> 3) ? 'b' : 'w'), 'data-p': p, 'data-g': GLYPH[p & 7] + '︎', html: pieceSvg(p & 7) });
      this.place(el, sq); this.layer.append(el); this.els.set(sq, el); return el;
    }
    removeEl(el, fade) { if (fade) { el.classList.add('gone'); setTimeout(() => el.remove(), 220); } else el.remove(); }
    setPosition(b, move, animate) {
      const els = this.els;
      if (move && animate) {
        const mover = els.get(move.from);
        if (mover) {
          const cap = els.get(move.to); if (cap) { this.removeEl(cap, true); els.delete(move.to); }
          if (move.flag === 2) { const cs = move.to + (move.color === 0 ? 16 : -16); const ce = els.get(cs); if (ce) { this.removeEl(ce, true); els.delete(cs); } }
          els.delete(move.from); els.set(move.to, mover); this.place(mover, move.to);
          const rk = (a, z) => { const r = els.get(a); if (r) { els.delete(a); els.set(z, r); this.place(r, z); } };
          if (move.flag === 3) rk(move.to + 1, move.to - 1); else if (move.flag === 4) rk(move.to - 2, move.to + 1);
        }
      }
      for (const [sq, el] of Array.from(els)) if (+el.dataset.p !== b[sq]) { el.remove(); els.delete(sq); }
      for (let sq = 0; sq < 128; sq++) { if (sq & 0x88) { sq += 7; continue; } if (b[sq] && !els.has(sq)) this.create(sq, b[sq]); }
    }
    setMarks(m) {
      this.marks = m;
      const targets = new Set(m.targets || []), caps = new Set(m.caps || []);
      this.sqEls.forEach((d, sq) => {
        const base = d.classList.contains('l') ? 'sq l' : 'sq d';
        let c = base;
        if (m.last && (sq === m.last[0] || sq === m.last[1])) c += ' last';
        if (m.hint && (sq === m.hint[0] || sq === m.hint[1])) c += ' hint';
        if (m.sel === sq) c += ' sel';
        if (m.check === sq) c += ' check';
        if (targets.has(sq)) c += caps.has(sq) ? ' target cap' : ' target';
        d.className = c;
      });
    }
    setArrows(list) {
      this.arrowList = list;
      const pts = sq => { const [c, r] = this.colRow(sq); return [c + .5, r + .5]; };
      let s = '<svg viewBox="0 0 8 8">';
      for (const a of list) {
        const [x1, y1] = pts(a.from), [x2, y2] = pts(a.to);
        const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const hx = x2 - ux * .12, hy = y2 - uy * .12, bx = x2 - ux * .42, by = y2 - uy * .42;
        const px = -uy * .2, py = ux * .2;
        s += `<g fill="${a.color || '#4aa3ff'}" stroke="${a.color || '#4aa3ff'}" opacity=".85"><line x1="${x1}" y1="${y1}" x2="${bx}" y2="${by}" stroke-width=".16" stroke-linecap="round"/><polygon stroke="none" points="${hx},${hy} ${bx + px},${by + py} ${bx - px},${by - py}"/></g>`;
      }
      this.arrows.innerHTML = s + '</svg>';
    }
    sqFromEvent(e) {
      const r = this.inner.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * 8, y = (e.clientY - r.top) / r.height * 8;
      if (x < 0 || y < 0 || x >= 8 || y >= 8) return -1;
      const col = Math.floor(x), row = Math.floor(y);
      return this.flipped ? (7 - row) * 16 + (7 - col) : row * 16 + col;
    }
    bindPointer() {
      const inner = this.inner;
      inner.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        const sq = this.sqFromEvent(e); if (sq < 0) return;
        const kind = this.cb.onDown ? this.cb.onDown(sq) : null;
        this.down = { sq, x: e.clientX, y: e.clientY, drag: false, canDrag: kind === 'drag', id: e.pointerId };
      });
      inner.addEventListener('pointermove', e => {
        const d = this.down; if (!d || !d.canDrag) return;
        const el = this.els.get(d.sq); if (!el) return;
        if (!d.drag && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
          d.drag = true; el.classList.add('drag'); try { inner.setPointerCapture(d.id); } catch (er) { /* ok */ }
        }
        if (d.drag) {
          const r = inner.getBoundingClientRect(), s = r.width / 8;
          el.style.left = (e.clientX - r.left - s / 2) + 'px'; el.style.top = (e.clientY - r.top - s / 2 - s * .15) + 'px';
        }
      });
      const up = e => {
        const d = this.down; if (!d) return; this.down = null;
        const el = this.els.get(d.sq);
        if (d.drag) {
          if (el) { el.classList.remove('drag'); el.classList.add('nomove'); this.place(el, d.sq); setTimeout(() => el.classList.remove('nomove'), 30); }
          const to = this.sqFromEvent(e);
          if (to >= 0 && this.cb.onDrop) this.cb.onDrop(d.sq, to);
        } else if (e.type === 'pointerup') {
          const sq = this.sqFromEvent(e);
          if (sq >= 0 && this.cb.onTap) this.cb.onTap(sq);
        }
      };
      inner.addEventListener('pointerup', up);
      inner.addEventListener('pointercancel', up);
    }
    setStyle(theme, pieces, coords) {
      this.el.dataset.theme = theme; this.el.dataset.pieces = pieces;
      this.el.classList.toggle('nocoords', !coords);
    }
    shake() { this.el.classList.remove('shake'); void this.el.offsetWidth; this.el.classList.add('shake'); }
  }

  // ---------------- módulo principal ----------------
  let S = null; // estado da tela
  const LV = E.LEVELS;

  function bookMove(game, lvIdx) {
    const lv = LV[lvIdx];
    if (Math.random() > lv.book || game.history.length > 14) return 0;
    const hs = game.history.map(x => x.san);
    const cands = [];
    for (const o of OP.list) {
      if (o.cat === 'trap') continue;
      const ms = o.moves.map(m => m[0]);
      if (ms.length <= hs.length) continue;
      let ok = true;
      for (let i = 0; i < hs.length; i++) if (ms[i] !== hs[i].replace(/[+#]/g, '')) { ok = false; break; }
      if (ok) cands.push(ms[hs.length]);
    }
    if (!cands.length) return 0;
    return game.parseSAN(Core.pick(cands));
  }

  function mount(root) {
    const saved = Core.store.get('chess', {});
    S = {
      root, mode: 'play', game: new E.Game(), level: saved.level != null ? saved.level : 3, humanColor: 0, colorPref: saved.color || 'w',
      sel: null, targets: new Map(), over: false, thinking: false, token: 0, last: null, hint: null,
      style: Object.assign({ theme: 'walnut', pieces: 'classic', coords: true, legal: true, anim: true }, saved.style),
      tut: { op: null, step: 0, practice: false, side: 'w', fails: 0, correct: 0, tries: 0, auto: false, done: false },
      started: false
    };
    S.board = new BoardView({ onDown: onDown, onTap: onTap, onDrop: onDrop });
    S.board.setStyle(S.style.theme, S.style.pieces, S.style.coords);

    S.topBar = h('div', { class: 'cbar top' }); S.botBar = h('div', { class: 'cbar bottom' });
    S.status = h('div', { class: 'cstatus' });
    S.holder = h('div', { class: 'board-holder' }, S.board.el);
    S.panel = h('div', { class: 'cside-body' });
    S.tabs = h('div', { class: 'seg full' },
      [['play', '♟ Jogar'], ['tutorial', '🎓 Tutorial'], ['style', '🎨 Estilos'], ['online', '🌐 Online']].map(([k, t]) =>
        h('button', { dataset: { k }, class: k === 'play' ? 'active' : '', onclick: () => setMode(k) }, t)));

    root.append(
      Core.topbar('XADREZ'),
      h('div', { class: 'chess-wrap' },
        h('div', { class: 'chess-main' }, S.topBar, S.holder, S.botBar, S.status),
        h('div', { class: 'chess-side' }, S.tabs, S.panel)));

    newGame(true);
    renderPanel();
    if (Core.Social) S.unSocial = Core.Social.on(() => { if (S && S.mode === 'online') renderPanel(); });
    if (Core.pendingRoom && Core.pendingRoom.game === 'chess') { const inv = Core.pendingRoom; Core.pendingRoom = null; setMode('online'); joinRoom(inv); }
  }

  function unmount() {
    if (S) {
      S.token++; AI.cancel(); clearInterval(S.autoTimer);
      if (S.unSocial) S.unSocial();
      if (S.online) cleanupOnline();
    }
    S = null;
  }

  function setMode(k) {
    if (S.mode === k) return;
    if (S.online && k !== 'online' && k !== 'style') { Core.toast('Saia da partida online primeiro (botão Sair).'); return; }
    S.token++; AI.cancel(); S.thinking = false; clearInterval(S.autoTimer); S.tut.auto = false;
    S.mode = k;
    Core.$$('button', S.tabs).forEach(b => b.classList.toggle('active', b.dataset.k === k));
    S.root.classList.toggle('mode-tut', k === 'tutorial');
    if (k === 'play') { restorePlayBoard(); }
    else if (k === 'tutorial') { if (S.tut.op) tutSetStep(S.tut.step, false, true); else { resetBoard(new E.Game()); } }
    else if (k === 'style') { /* mantém o tabuleiro atual */ }
    else if (k === 'online') { if (!S.online) restorePlayBoard(); }
    renderPanel();
  }

  // ---------- jogo contra a IA ----------
  function newGame(initial, fromGame) {
    S.token++; AI.cancel(); S.thinking = false;
    S.colorPref = S.colorPref || 'w';
    S.humanColor = S.colorPref === 'r' ? Core.rand(0, 1) : (S.colorPref === 'b' ? 1 : 0);
    if (fromGame) { S.game = fromGame; S.humanColor = fromGame.humanColor; }
    else S.game = new E.Game();
    S.over = false; S.sel = null; S.targets = new Map(); S.last = null; S.hint = null;
    const hl = S.game.history[S.game.history.length - 1];
    if (hl) S.last = [hl.from, hl.to];
    S.board.setFlipped(S.humanColor === 1);
    S.board.setPosition(S.game.pos.b, null, false);
    refreshMarks(); updateBars(); updateStatus();
    if (!initial || true) maybeAI();
  }
  function restorePlayBoard() {
    S.board.setFlipped(S.humanColor === 1);
    S.board.setPosition(S.game.pos.b, null, false);
    S.board.setArrows([]); refreshMarks(); updateBars(); updateStatus(); maybeAI();
  }
  function resetBoard(g) { S.board.setFlipped(false); S.board.setPosition(g.pos.b, null, false); S.board.setMarks({}); S.board.setArrows([]); }

  function humanTurn() {
    const ok = (S.mode === 'play' && !S.online) || (S.mode === 'online' && S.online && S.online.live);
    return ok && !S.over && !S.thinking && S.game.pos.turn === S.humanColor;
  }

  function refreshMarks() {
    const pos = S.game.pos, m = { last: S.last, hint: S.hint, sel: S.sel };
    if (S.sel != null && S.style.legal) { m.targets = Array.from(S.targets.keys()); m.caps = m.targets.filter(t => pos.b[t] || S.targets.get(t).some(x => ((x >> 17) & 7) === 2)); }
    if (pos.inCheck()) m.check = pos.kp[pos.turn];
    S.board.setMarks(m);
  }
  function select(sq) {
    const pos = S.game.pos, map = new Map();
    for (const m of S.game.legal()) if ((m & 127) === sq) { const to = (m >> 7) & 127; if (!map.has(to)) map.set(to, []); map.get(to).push(m); }
    S.sel = sq; S.targets = map; Core.snd('select'); refreshMarks();
  }
  function deselect() { S.sel = null; S.targets = new Map(); refreshMarks(); }

  function onDown(sq) {
    if (S.mode === 'tutorial') return tutDown(sq);
    if (!humanTurn()) return null;
    if (S.sel != null && S.targets.has(sq)) return null;
    const p = S.game.pos.b[sq];
    if (p && (p >> 3) === S.humanColor) { select(sq); return 'drag'; }
    if (S.sel != null) deselect();
    return null;
  }
  function onTap(sq) {
    if (S.mode === 'tutorial') return tutTap(sq);
    if (!humanTurn()) return;
    if (S.sel != null && S.targets.has(sq)) attempt(S.sel, sq);
  }
  function onDrop(from, to) {
    if (S.mode === 'tutorial') return tutDrop(from, to);
    if (!humanTurn()) return;
    if (from !== to && S.targets.has(to)) attempt(from, to);
  }
  async function attempt(from, to) {
    let ms = S.targets.get(to) || S.game.pos.legalMoves().filter(m => (m & 127) === from && ((m >> 7) & 127) === to);
    if (!ms.length) return;
    let m = ms[0];
    if (ms.length > 1) { const pr = await askPromotion(S.humanColor); m = ms.find(x => ((x >> 14) & 7) === pr) || ms[0]; }
    humanPlay(m);
  }
  function askPromotion(color) {
    return new Promise(res => {
      const box = h('div', { class: 'promo' },
        h('div', { class: 'promo-t' }, 'Promover para:'),
        h('div', { class: 'promo-row' }, [5, 4, 3, 2].map(t =>
          h('button', { class: 'pc-btn ' + (color ? 'b' : 'w'), html: pieceSvg(t), onclick: () => { box.remove(); res(t); } }))));
      S.holder.append(h('div', { class: 'promo-back' }, box));
      const back = S.holder.lastChild;
      box.addEventListener('click', e => e.stopPropagation());
      box.querySelectorAll('.pc-btn').forEach(b => b.addEventListener('click', () => back.remove()));
    });
  }
  function humanPlay(m) {
    if (S.online) { sendMove(m); return; }
    if (!S.game.play(m)) return;
    S.hint = null; S.sel = null; S.targets = new Map(); S.board.setArrows([]);
    afterMove();
  }
  function afterMove() {
    const g = S.game, hl = g.history[g.history.length - 1];
    S.last = [hl.from, hl.to]; S.hint = null;
    S.board.setPosition(g.pos.b, { from: hl.from, to: hl.to, flag: E.mFlag(hl.m), color: hl.color }, S.style.anim);
    const flag = E.mFlag(hl.m);
    if (/[+#]$/.test(hl.san)) Core.snd('check'); else if (hl.cap) Core.snd('capture'); else if (flag === 3 || flag === 4) Core.snd('castle'); else Core.snd('move');
    refreshMarks(); updateBars(); updateStatus(); updateMoves();
    const st = g.status();
    if (st.over) { S.over = true; updateStatus(); setTimeout(() => finish(st), 450); return; }
    maybeAI();
  }
  function maybeAI() {
    if (S.mode !== 'play' || S.over || S.online) return;
    if (S.game.pos.turn !== S.humanColor) aiMove();
  }
  async function aiMove() {
    const tok = ++S.token; S.thinking = true; updateStatus(); updateBars();
    await sleep(320);
    if (tok !== S.token) return;
    let m = bookMove(S.game, S.level);
    if (m) await sleep(250 + Math.random() * 450);
    else {
      const lv = LV[S.level];
      const legal = S.game.legal();
      if (lv.blunder && Math.random() < lv.blunder) { m = Core.pick(legal); await sleep(300); }
      else m = await AI.think(S.game, { depth: lv.depth, time: lv.time, noise: lv.noise });
    }
    if (tok !== S.token || !S || S.mode !== 'play') return;
    S.thinking = false;
    if (!m || !S.game.play(m)) { S.thinking = false; updateStatus(); return; }
    afterMove();
  }

  function finish(st) {
    let title, msg, snd;
    const you = S.humanColor;
    if (st.kind === 'mate') {
      if (st.winner === you) { title = 'Xeque-mate! Você venceu 🏆'; msg = S.online ? `Boa partida contra ${S.online.oppName}.` : 'Excelente partida contra o nível ' + LV[S.level].name + '.'; snd = 'win'; Core.addStat('chessWin'); }
      else { title = S.online ? `Xeque-mate. ${S.online.oppName} venceu` : 'Xeque-mate. A IA venceu'; msg = S.online ? 'Boa partida!' : 'Tente de novo ou diminua o nível para treinar.'; snd = 'lose'; }
    } else if (st.kind === 'resign') {
      title = st.winner === you ? 'Vitória!' : 'Você desistiu'; msg = st.winner === you ? (S.online ? `${S.online.oppName} desistiu.` : 'A IA abandonou.') : 'Partida encerrada.'; snd = st.winner === you ? 'win' : 'lose';
    } else {
      title = 'Empate'; snd = 'draw';
      msg = { stalemate: 'Rei afogado: o jogador da vez não tem lances legais.', material: 'Material insuficiente para dar mate.', fifty: 'Regra dos 50 lances sem captura ou lance de peão.', repetition: 'Tripla repetição de posição.', agreed: 'Empate por acordo.' }[st.kind] || '';
    }
    S.over = true; S.lastResult = title; updateStatus();
    Core.snd(snd);
    const online = !!S.online;
    if (online) { S.online.live = false; updateOnlineStatus(); }
    Core.modal({ title, body: msg, buttons: [{ text: 'Rever partida', cls: 'ghost', value: 'r' }, online ? { text: 'Voltar ao lobby', cls: 'primary', value: 'l' } : { text: 'Nova partida', cls: 'primary', value: 'n' }] })
      .then(v => { if (!S) return; if (v === 'n') newGame(); else if (v === 'l') leaveOnline(false); });
  }

  // ---------- barras de jogador / status / lances ----------
  const NAMES = ['', 'P', 'N', 'B', 'R', 'Q', 'K'];
  function capturedHtml(color) {
    // peças capturadas PELO jogador "color"
    const hist = S.game.history.filter(x => x.color === color && x.cap);
    const order = { 5: 0, 4: 1, 3: 2, 2: 3, 1: 4 };
    const caps = hist.map(x => x.cap).sort((a, b) => order[a & 7] - order[b & 7]);
    return caps.map(p => `<span class="mini pc ${(p >> 3) ? 'b' : 'w'}">${pieceSvg(p & 7)}</span>`).join('');
  }
  function material(color) {
    let s = 0; const b = S.game.pos.b;
    for (let q = 0; q < 128; q++) { if (q & 0x88) { q += 7; continue; } const p = b[q]; if (p && (p & 7) !== 6 && (p >> 3) === color) s += E.PV[p & 7] / 100; }
    return s;
  }
  function updateBars() {
    if (!S || S.mode === 'tutorial') return;
    const bottomColor = S.board.flipped ? 1 : 0, topColor = bottomColor ^ 1;
    const fill = (bar, color) => {
      const isYou = color === S.humanColor;
      const lv = LV[S.level], o = S.online, so = Core.Social;
      const diff = material(color) - material(color ^ 1);
      bar.innerHTML = '';
      bar.append(
        h('div', { class: 'av ' + (color ? 'blk' : 'wht') }, isYou ? (o && so && so.me ? so.me.avatar : '🙂') : (o ? o.oppAvatar : '🤖')),
        h('div', { class: 'grow' },
          h('div', { class: 'nm' }, isYou ? (o && so && so.me ? so.me.name : Core.settings.name) : (o ? o.oppName : `IA · ${lv.name}`), (!isYou && S.thinking && !o) ? h('span', { class: 'dots' }, ' pensando') : null),
          h('div', { class: 'cap', html: capturedHtml(color) + (diff > 0 ? `<b class="adv">+${diff}</b>` : '') })),
        h('div', { class: 'sub' }, isYou ? (color ? 'Pretas' : 'Brancas') : (o ? (o.oppOnline ? '🟢 online' : '⚪ offline') : `~${lv.elo} Elo`)));
      bar.classList.toggle('turn', S.game.pos.turn === color && !S.over);
    };
    fill(S.topBar, topColor); fill(S.botBar, bottomColor);
  }
  function updateStatus() {
    if (!S) return;
    let t;
    const pos = S.game.pos;
    if (S.over) t = S.lastResult || 'Fim de jogo';
    else if (S.thinking) t = '🤖 IA pensando…';
    else if (S.online && !S.online.live) t = '⏳ Aguardando ' + S.online.oppName + '…';
    else if (S.mode === 'play' || S.online) t = (pos.turn === S.humanColor ? 'Sua vez' : (S.online ? 'Vez de ' + S.online.oppName : 'Vez da IA')) + (pos.inCheck() ? ' — XEQUE!' : '');
    else t = '';
    S.status.textContent = t;
    S.status.classList.toggle('alert', !S.over && pos.inCheck());
  }
  function updateMoves() {
    if (!S.movesEl) return;
    S.movesEl.innerHTML = '';
    const hs = S.game.history;
    for (let i = 0; i < hs.length; i += 2) {
      S.movesEl.append(h('span', { class: 'mn' }, (i / 2 + 1) + '.'), h('span', { class: 'mv' + (i === hs.length - 1 ? ' cur' : '') }, hs[i].san),
        hs[i + 1] ? h('span', { class: 'mv' + (i + 1 === hs.length - 1 ? ' cur' : '') }, hs[i + 1].san) : h('span'));
    }
    S.movesEl.scrollTop = S.movesEl.scrollHeight;
  }

  // ---------- painéis ----------
  function renderPanel() {
    S.panel.innerHTML = '';
    if (S.mode === 'play') panelPlay(); else if (S.mode === 'tutorial') panelTutorial(); else if (S.mode === 'online') panelOnline(); else panelStyle();
    S.topBar.classList.toggle('hide', S.mode === 'tutorial'); S.botBar.classList.toggle('hide', S.mode === 'tutorial');
    if (S.mode === 'play' || S.mode === 'online') { updateBars(); updateMoves(); }
    updateStatus();
  }
  function saveChess() { Core.store.set('chess', { level: S.level, color: S.colorPref, style: S.style }); }

  function panelPlay() {
    const lv = LV[S.level];
    const lvLabel = h('div', { class: 'lvl-label' });
    const setLbl = () => { const l = LV[S.level]; lvLabel.innerHTML = `<b>Nível ${S.level + 1}</b> · ${l.name} <span class="muted">(~${l.elo} Elo)</span>`; };
    setLbl();
    const slider = h('input', { type: 'range', min: 0, max: LV.length - 1, value: S.level, oninput: e => { S.level = +e.target.value; setLbl(); saveChess(); updateBars(); } });
    const colorSeg = h('div', { class: 'seg full' }, [['w', '⚪ Brancas'], ['r', '🎲 Sorteio'], ['b', '⚫ Pretas']].map(([k, t]) =>
      h('button', { class: S.colorPref === k ? 'active' : '', onclick: e => { S.colorPref = k; saveChess(); Core.$$('button', colorSeg).forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); } }, t)));
    S.movesEl = h('div', { class: 'moves' });
    S.panel.append(
      h('div', { class: 'panel' }, h('h3', null, 'Partida'),
        lvLabel, slider, h('div', { class: 'row sb small muted', style: { marginTop: '4px' } }, h('span', null, 'Iniciante'), h('span', null, 'Máximo')),
        h('div', { style: { height: '12px' } }), colorSeg,
        h('button', { class: 'btn primary block', style: { marginTop: '12px' }, onclick: () => newGame() }, '▶ Nova partida')),
      h('div', { class: 'panel' }, h('h3', null, 'Controles'),
        h('div', { class: 'ctl-grid' },
          h('button', { class: 'btn sm', onclick: undo }, '↶ Desfazer'),
          h('button', { class: 'btn sm', onclick: hint }, '💡 Dica'),
          h('button', { class: 'btn sm', onclick: () => { S.board.setFlipped(!S.board.flipped); updateBars(); } }, '⇅ Girar'),
          h('button', { class: 'btn sm', onclick: offerDraw }, '🤝 Empate'),
          h('button', { class: 'btn sm', onclick: copyPGN }, '📋 PGN'),
          h('button', { class: 'btn sm danger', onclick: resign }, '🏳 Desistir'))),
      h('div', { class: 'panel' }, h('h3', null, 'Lances'), S.movesEl));
    updateMoves();
  }
  async function undo() {
    if (S.mode !== 'play' || !S.game.history.length) return;
    S.token++; AI.cancel(); S.thinking = false;
    S.over = false;
    S.game.undo();
    if (S.game.history.length && S.game.pos.turn !== S.humanColor) S.game.undo();
    const hl = S.game.history[S.game.history.length - 1];
    S.last = hl ? [hl.from, hl.to] : null; S.hint = null; S.sel = null; S.targets = new Map();
    S.board.setArrows([]); S.board.setPosition(S.game.pos.b, null, false);
    refreshMarks(); updateBars(); updateStatus(); updateMoves(); Core.snd('select');
    maybeAI();
  }
  async function hint() {
    if (!humanTurn()) { Core.toast('Aguarde sua vez'); return; }
    Core.toast('Analisando…', 1000);
    const tok = ++S.token;
    const m = await AI.think(S.game, { depth: 6, time: 1200, noise: 0 });
    if (tok !== S.token || !S || !m) return;
    S.hint = [m & 127, (m >> 7) & 127]; S.board.setArrows([{ from: S.hint[0], to: S.hint[1], color: '#2fbf6c' }]); refreshMarks();
  }
  async function offerDraw() {
    if (!humanTurn()) return;
    const tok = ++S.token;
    const lv = LV[S.level];
    const r = new E.Search(S.game.pos).run({ depth: Math.min(4, lv.depth), time: 500, noise: 0 });
    // r.score é da perspectiva de quem joga (o humano). IA aceita se estiver pior.
    const accept = r && r.score >= 60 && S.game.history.length > 20;
    if (tok !== S.token) return;
    if (accept) finish({ over: true, kind: 'agreed', winner: -1 }); else Core.toast('A IA recusou o empate');
  }
  function copyPGN() {
    const hs = S.game.history; let pgn = '';
    for (let i = 0; i < hs.length; i++) pgn += (i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + hs[i].san + ' ';
    const done = () => Core.toast('PGN copiado!');
    if (navigator.clipboard) navigator.clipboard.writeText(pgn.trim()).then(done, () => Core.modal({ title: 'PGN', body: pgn || '(vazio)' })); else Core.modal({ title: 'PGN', body: pgn || '(vazio)' });
  }
  async function resign() {
    if (S.over || !S.game.history.length) return;
    const v = await Core.modal({ title: 'Desistir?', body: 'Você perderá esta partida.', buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Desistir', cls: 'danger', value: true }] });
    if (v) { S.token++; AI.cancel(); S.thinking = false; finish({ over: true, kind: 'resign', winner: S.humanColor ^ 1 }); }
  }

  // ---------- estilos ----------
  function miniBoard(theme, pieces) {
    const b = h('div', { class: 'board mini-board', 'data-theme': theme, 'data-pieces': pieces || 'classic' });
    const inner = h('div', { class: 'bd-inner' });
    const grid = h('div', { class: 'bd-grid' });
    for (let i = 0; i < 64; i++) grid.append(h('div', { class: 'sq ' + (((i >> 3) + i) & 1 ? 'd' : 'l') }));
    inner.append(grid);
    if (pieces) {
      const layer = h('div', { class: 'bd-pieces' });
      [[2, 1, 6, 0], [5, 1, 2, 1], [1, 5, 5, 0], [4, 4, 4, 1]].forEach(([c, r, t, col]) => {
        const e = h('div', { class: 'pc ' + (col ? 'b' : 'w'), 'data-g': GLYPH[t] + '︎', html: pieceSvg(t) });
        e.style.left = c * 12.5 + '%'; e.style.top = r * 12.5 + '%'; layer.append(e);
      });
      inner.append(layer);
    }
    b.append(inner); return b;
  }
  function panelStyle() {
    const apply = () => { S.board.setStyle(S.style.theme, S.style.pieces, S.style.coords); saveChess(); };
    const themeGrid = h('div', { class: 'style-grid' }, THEMES.map(([k, n]) => {
      const b = h('button', { class: 'style-item' + (S.style.theme === k ? ' active' : ''), onclick: () => { S.style.theme = k; apply(); Core.$$('.style-item', themeGrid).forEach(x => x.classList.remove('active')); b.classList.add('active'); } },
        miniBoard(k, null), h('span', null, n));
      return b;
    }));
    const pieceGrid = h('div', { class: 'style-grid' }, PIECESETS.map(([k, n]) => {
      const b = h('button', { class: 'style-item' + (S.style.pieces === k ? ' active' : ''), onclick: () => { S.style.pieces = k; apply(); Core.$$('.style-item', pieceGrid).forEach(x => x.classList.remove('active')); b.classList.add('active'); } },
        miniBoard(S.style.theme, k), h('span', null, n));
      return b;
    }));
    const tog = (label, key, extra) => {
      const c = h('input', { type: 'checkbox', onchange: e => { S.style[key] = e.target.checked; apply(); if (extra) extra(); } });
      c.checked = S.style[key];
      return h('div', { class: 'row sb', style: { padding: '6px 0' } }, h('span', null, label), h('label', { class: 'switch' }, c, h('i')));
    };
    S.panel.append(
      h('div', { class: 'panel' }, h('h3', null, 'Tabuleiro'), themeGrid),
      h('div', { class: 'panel' }, h('h3', null, 'Peças'), pieceGrid),
      h('div', { class: 'panel' }, h('h3', null, 'Opções'),
        tog('Coordenadas (a–h, 1–8)', 'coords'),
        tog('Mostrar lances legais', 'legal', () => S.board.setMarks && refreshMarks()),
        tog('Animar movimento das peças', 'anim')));
  }

  // ---------- tutorial ----------
  function panelTutorial() {
    const T = S.tut;
    if (!T.op) {
      // lista
      S.panel.append(h('div', { class: 'panel' }, h('h3', null, 'Princípios da abertura'),
        h('div', { class: 'principles' }, OP.principles.map((p, i) => h('div', { class: 'princ' }, h('b', null, (i + 1) + '. ' + p.t), h('span', null, p.d))))));
      for (const c of OP.cats) {
        const items = OP.list.filter(o => o.cat === c.id);
        S.panel.append(h('div', { class: 'panel' }, h('h3', null, c.name),
          h('div', { class: 'op-list' }, items.map(o =>
            h('button', { class: 'op-item', onclick: () => openOpening(o) },
              h('div', { class: 'grow' }, h('b', null, o.name), h('div', { class: 'small muted' }, o.eco + ' · aluno joga de ' + (o.side === 'w' ? 'Brancas' : 'Pretas'))),
              h('span', { class: 'chip ' + o.lvl }, o.lvl))))));
      }
      return;
    }
    const op = T.op;
    T.stepEl = h('div', { class: 'tut-step' });
    T.commentEl = h('div', { class: 'tut-comment' });
    T.movesEl = h('div', { class: 'tut-moves' });
    const nav = h('div', { class: 'tut-nav' },
      h('button', { class: 'btn icon', title: 'Início', onclick: () => tutSetStep(0, false) }, '⏮'),
      h('button', { class: 'btn icon', title: 'Voltar', onclick: () => tutSetStep(T.step - 1, false) }, '◀'),
      h('button', { class: 'btn primary', id: 'tut-play', onclick: tutToggleAuto }, T.auto ? '⏸ Pausar' : '▶ Reproduzir'),
      h('button', { class: 'btn icon', title: 'Avançar', onclick: () => tutSetStep(T.step + 1, true) }, '▶'),
      h('button', { class: 'btn icon', title: 'Fim', onclick: () => tutSetStep(op.moves.length, false) }, '⏭'));
    const modeSeg = h('div', { class: 'seg full' },
      h('button', { class: T.practice ? '' : 'active', onclick: () => tutMode(false) }, '👁 Assistir'),
      h('button', { class: T.practice ? 'active' : '', onclick: () => tutMode(true) }, '🎯 Praticar'));
    const sideSeg = h('div', { class: 'seg full', style: { marginTop: '8px' } },
      h('button', { class: T.side === 'w' ? 'active' : '', onclick: () => { T.side = 'w'; tutMode(true); } }, '⚪ Brancas'),
      h('button', { class: T.side === 'b' ? 'active' : '', onclick: () => { T.side = 'b'; tutMode(true); } }, '⚫ Pretas'));
    T.practiceUI = h('div', { class: T.practice ? '' : 'hide' }, sideSeg,
      h('div', { class: 'row', style: { marginTop: '8px' } },
        h('button', { class: 'btn sm grow', onclick: tutHint }, '💡 Mostrar lance'),
        h('button', { class: 'btn sm grow', onclick: () => tutMode(true) }, '↻ Reiniciar')));
    S.panel.append(
      h('div', { class: 'panel' }, h('div', { class: 'row sb', style: { marginBottom: '10px' } }, h('button', { class: 'btn sm ghost', onclick: closeOpening }, '← Aberturas'), h('b', { class: 'gold' }, op.name), h('span', { class: 'chip ' + op.lvl }, op.lvl)), modeSeg, T.practiceUI, h('div', { style: { height: '10px' } }), T.stepEl, T.commentEl, nav, T.movesEl),
      h('div', { class: 'panel' },
        h('h2', { class: 'op-title' }, op.name), h('div', { class: 'small muted' }, op.eco),
        h('p', { class: 'op-desc' }, op.desc),
        h('div', { class: 'plan' }, h('b', null, '🎯 Plano: '), op.plan)));
    tutRefreshUI();
  }
  function openOpening(o) {
    const T = S.tut; T.op = o; T.step = 0; T.practice = false; T.side = o.side; T.auto = false; T.done = false;
    S.board.setFlipped(false);
    S.tutGame = new E.Game();
    resetTutBoard();
    renderPanel(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function closeOpening() { clearInterval(S.autoTimer); S.tut.op = null; S.tut.auto = false; resetBoard(new E.Game()); renderPanel(); }
  function resetTutBoard() {
    S.tutGame = new E.Game(); S.board.setPosition(S.tutGame.pos.b, null, false); S.board.setMarks({}); S.board.setArrows([]);
  }
  function tutRebuild(step) {
    S.tutGame = new E.Game();
    for (let i = 0; i < step; i++) { const m = S.tutGame.parseSAN(S.tut.op.moves[i][0]); S.tutGame.play(m); }
  }
  function tutSetStep(n, animate, force) {
    const T = S.tut, op = T.op; if (!op) return;
    n = Core.clamp(n, 0, op.moves.length);
    if (n === T.step && !force) { return; }
    if (animate && n === T.step + 1 && S.tutGame && S.tutGame.history.length === T.step) {
      const m = S.tutGame.parseSAN(op.moves[T.step][0]); S.tutGame.play(m);
      const hl = S.tutGame.history[S.tutGame.history.length - 1];
      S.board.setPosition(S.tutGame.pos.b, { from: hl.from, to: hl.to, flag: E.mFlag(hl.m), color: hl.color }, true);
      T.step = n;
      Core.snd(hl.cap ? 'capture' : 'move');
    } else {
      tutRebuild(n); T.step = n; S.board.setPosition(S.tutGame.pos.b, null, false);
    }
    const hl = S.tutGame.history[S.tutGame.history.length - 1];
    S.board.setMarks({ last: hl ? [hl.from, hl.to] : null, check: S.tutGame.pos.inCheck() ? S.tutGame.pos.kp[S.tutGame.pos.turn] : undefined });
    S.board.setArrows([]);
    tutRefreshUI();
  }
  function tutRefreshUI() {
    const T = S.tut, op = T.op; if (!op || !T.stepEl) return;
    const n = T.step, total = op.moves.length;
    T.stepEl.innerHTML = `Lance <b>${n}</b> de ${total}` + `<div class="bar"><i style="width:${total ? n / total * 100 : 0}%"></i></div>`;
    if (n === 0) T.commentEl.innerHTML = T.practice ? '<b>Sua vez de jogar!</b> Faça o primeiro lance da abertura.' : 'Pressione <b>Reproduzir</b> ou <b>▶</b> para ver o primeiro lance.';
    else {
      const [san, com] = op.moves[n - 1];
      const num = Math.ceil(n / 2), dots = n % 2 ? '.' : '...';
      T.commentEl.innerHTML = `<div class="mvbig">${num}${dots} ${san}</div><div>${com}</div>`;
    }
    if (T.practice && !T.done) {
      const mine = tutMyTurn();
      if (mine && n < total) T.commentEl.innerHTML += `<div class="your-turn">⮕ Sua vez: jogue o lance da teoria.</div>`;
    }
    T.movesEl.innerHTML = '';
    for (let i = 0; i < total; i++) {
      if (i % 2 === 0) T.movesEl.append(h('span', { class: 'mn' }, (i / 2 + 1) + '.'));
      T.movesEl.append(h('button', { class: 'mv' + (i === n - 1 ? ' cur' : '') + (i >= n ? ' future' : ''), onclick: () => { stopAuto(); tutSetStep(i + 1, false); } }, T.practice && i >= n ? '?' : op.moves[i][0]));
    }
    const pb = $('#tut-play'); if (pb) pb.textContent = T.auto ? '⏸ Pausar' : (n >= total ? '↻ Rever' : '▶ Reproduzir');
  }
  function stopAuto() { clearInterval(S.autoTimer); S.tut.auto = false; const pb = $('#tut-play'); if (pb) pb.textContent = '▶ Reproduzir'; }
  function tutToggleAuto() {
    const T = S.tut;
    if (T.practice) { tutMode(false); }
    if (T.auto) { stopAuto(); return; }
    if (T.step >= T.op.moves.length) tutSetStep(0, false);
    T.auto = true;
    const tick = () => {
      if (!S || S.mode !== 'tutorial') return;
      if (T.step >= T.op.moves.length) { stopAuto(); tutRefreshUI(); return; }
      tutSetStep(T.step + 1, true);
    };
    tick(); S.autoTimer = setInterval(tick, 2600);
    tutRefreshUI();
  }
  function tutMode(practice) {
    const T = S.tut; stopAuto();
    T.practice = practice; T.done = false; T.fails = 0; T.correct = 0; T.tries = 0;
    S.board.setFlipped(practice && T.side === 'b');
    tutRebuild(0); T.step = 0; S.board.setPosition(S.tutGame.pos.b, null, false); S.board.setMarks({}); S.board.setArrows([]);
    renderPanel();
    if (practice) tutOpponentAdvance();
  }
  function tutMyTurn() { const T = S.tut; return T.practice && ((T.step % 2 === 0) === (T.side === 'w')); }
  async function tutOpponentAdvance() {
    const T = S.tut, op = T.op;
    while (S && T.practice && T.op === op && !T.done && T.step < op.moves.length && !tutMyTurn()) {
      await sleep(650);
      if (!S || !T.practice || T.op !== op) return;
      tutSetStep(T.step + 1, true);
    }
    if (S && T.practice && T.step >= op.moves.length && !T.done) tutFinish();
    else tutRefreshUI();
  }
  function tutFinish() {
    const T = S.tut; T.done = true; Core.snd('win');
    tutRefreshUI();
    const pct = T.tries ? Math.round(T.correct / T.tries * 100) : 100;
    Core.modal({
      title: 'Linha concluída! 🎓',
      body: `Você completou a <b>${T.op.name}</b>.<br>Acertos de primeira: <b>${T.correct}</b> de <b>${T.tries}</b> (${pct}%).<br><br>Quer testar na prática contra a IA a partir desta posição?`,
      buttons: [{ text: 'Repetir', cls: 'ghost', value: 'r' }, { text: 'Jogar contra a IA', cls: 'primary', value: 'p' }]
    }).then(v => { if (!S) return; if (v === 'r') tutMode(true); else if (v === 'p') playFromTutorial(); });
  }
  function playFromTutorial() {
    const T = S.tut, g = new E.Game();
    for (let i = 0; i < T.step; i++) g.play(g.parseSAN(T.op.moves[i][0]));
    g.humanColor = T.side === 'b' ? 1 : 0;
    S.mode = 'play'; S.root.classList.remove('mode-tut');
    Core.$$('button', S.tabs).forEach(b => b.classList.toggle('active', b.dataset.k === 'play'));
    newGame(false, g); renderPanel(); updateMoves();
  }
  function tutHint() {
    const T = S.tut; if (!T.practice || !tutMyTurn() || T.step >= T.op.moves.length) return;
    const m = S.tutGame.parseSAN(T.op.moves[T.step][0]);
    S.board.setArrows([{ from: m & 127, to: (m >> 7) & 127, color: '#2fbf6c' }]);
    T.hinted = true;
  }
  function tutDown(sq) {
    const T = S.tut; if (!T.op || !T.practice || T.done || !tutMyTurn()) return null;
    const p = S.tutGame.pos.b[sq], col = T.side === 'w' ? 0 : 1;
    if (p && (p >> 3) === col) {
      T.sel = sq; const map = new Map();
      for (const m of S.tutGame.legal()) if ((m & 127) === sq) map.set((m >> 7) & 127, 1);
      T.targets = map;
      S.board.setMarks({ last: S.board.marks && S.board.marks.last, sel: sq, targets: S.style.legal ? Array.from(map.keys()) : [], caps: Array.from(map.keys()).filter(t => S.tutGame.pos.b[t]) });
      Core.snd('select');
      return 'drag';
    }
    return null;
  }
  function tutTap(sq) { const T = S.tut; if (T.sel != null && T.targets && T.targets.has(sq)) tutTry(T.sel, sq); }
  function tutDrop(from, to) { const T = S.tut; if (from !== to && T.targets && T.targets.has(to)) tutTry(from, to); }
  async function tutTry(from, to) {
    const T = S.tut, op = T.op;
    const want = S.tutGame.parseSAN(op.moves[T.step][0]);
    T.sel = null;
    let ms = S.tutGame.legal().filter(m => (m & 127) === from && ((m >> 7) & 127) === to);
    if (!ms.length) return;
    let m = ms[0];
    if (ms.length > 1) { const pr = await askPromotion(T.side === 'b' ? 1 : 0); m = ms.find(x => ((x >> 14) & 7) === pr) || ms[0]; }
    if (m === want) {
      T.tries++; if (!T.failedThis) T.correct++; T.failedThis = false; T.hinted = false;
      tutSetStep(T.step + 1, true); Core.snd('select');
      if (T.step >= op.moves.length) { tutFinish(); return; }
      tutOpponentAdvance();
    } else {
      T.failedThis = true; T.hinted = true;
      S.board.setMarks({ last: S.board.marks && S.board.marks.last }); S.board.shake(); Core.snd('error');
      T.commentEl.innerHTML = `<div class="bad">❌ Esse não é o lance da teoria.</div><div>Pense no objetivo da abertura e tente de novo. Use <b>💡 Mostrar lance</b> se precisar.</div>`;
      tutRebuildBoardOnly();
    }
  }
  function tutRebuildBoardOnly() { S.board.setPosition(S.tutGame.pos.b, null, false); }

  // ======================= ONLINE (Firebase) =======================
  const So = () => Core.Social;
  function myUid() { return So().user.uid; }

  function panelOnline() {
    const so = So();
    const box = h('div', { class: 'panel' }); S.panel.append(box);
    box.append(h('h3', null, 'Jogar online com amigos'));
    if (!so || !so.enabled) { box.append(h('p', { class: 'muted' }, 'O modo online não está disponível agora (sem conexão com o serviço).')); return; }
    if (!so.authReady) { box.append(h('p', { class: 'muted' }, 'Conectando…')); return; }
    if (!so.user || !so.me) {
      box.append(h('p', null, 'Entre com sua conta Google para adicionar amigos e jogar xadrez em tempo real, de qualquer lugar.'),
        h('button', { class: 'btn primary block', onclick: () => so.openPanel({}) }, '🔐 Entrar / Criar conta'));
      return;
    }
    if (S.online) { panelRoom(box); return; }
    S.onlineColor = S.onlineColor || 'r';
    const colorSeg = h('div', { class: 'seg full' }, [['w', '⚪ Brancas'], ['r', '🎲 Sorteio'], ['b', '⚫ Pretas']].map(([k, t]) =>
      h('button', { class: S.onlineColor === k ? 'active' : '', onclick: e => { S.onlineColor = k; Core.$$('button', colorSeg).forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); } }, t)));
    const me = so.me;
    box.append(
      h('div', { class: 'olrow' }, h('div', { class: 'av' }, me.avatar), h('div', { class: 'grow' }, h('b', null, me.name), h('div', { class: 'small muted' }, 'Código: ', h('b', { class: 'gold' }, me.code))),
        h('button', { class: 'btn sm', onclick: () => so.openPanel({ invite: challenge }) }, '👥 Amigos' + ((so.requests.length) ? ` (${so.requests.length})` : ''))),
      h('div', { style: { height: '10px' } }), h('div', { class: 'small muted', style: { marginBottom: '6px' } }, 'Suas peças ao desafiar:'), colorSeg);
    const saved = Core.store.get('chess.room', null);
    if (saved) box.append(h('div', { class: 'plan', style: { marginTop: '12px' } }, 'Você tem uma partida online em andamento. ',
      h('button', { class: 'btn sm primary', onclick: resumeRoom }, '↻ Retomar'), ' ', h('button', { class: 'btn sm ghost', onclick: () => { Core.store.set('chess.room', null); renderPanel(); } }, 'Descartar')));
    const friends = Array.from(so.friends.values()).sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
    const list = h('div', { style: { marginTop: '12px' } });
    if (!friends.length) list.append(h('p', { class: 'muted small' }, 'Você ainda não tem amigos adicionados. Toque em "Amigos" para adicionar com o código.'));
    friends.forEach(f => list.append(h('div', { class: 'f-row' },
      h('div', { class: 'av' }, f.avatar), h('span', { class: 'dot-st ' + (f.online ? 'on' : '') }),
      h('div', { class: 'grow' }, h('b', null, f.name), h('div', { class: 'small muted' }, f.online ? 'online' : 'offline')),
      h('button', { class: 'btn sm primary' + (f.online ? '' : ' disabled'), onclick: () => challenge(f) }, '⚔ Desafiar'))));
    box.append(list);
  }

  function panelRoom(box) {
    const O = S.online;
    O.statusEl = h('div', { class: 'small muted' });
    box.append(
      h('div', { class: 'olrow' }, h('div', { class: 'av' }, O.oppAvatar), h('div', { class: 'grow' }, h('b', null, O.oppName), O.statusEl)),
      h('div', { class: 'ctl-grid', style: { marginTop: '12px' } },
        h('button', { class: 'btn sm danger', onclick: resignOnline }, '🏳 Desistir'),
        h('button', { class: 'btn sm', onclick: offerDrawOnline }, '🤝 Empate'),
        (O.leaveBtn = h('button', { class: 'btn sm', onclick: () => leaveOnline(true) }, '← Voltar'))));
    S.movesEl = h('div', { class: 'moves' });
    S.panel.append(h('div', { class: 'panel' }, h('h3', null, 'Lances'), S.movesEl));
    updateMoves(); updateOnlineStatus();
  }
  function updateOnlineStatus() {
    const O = S && S.online; if (!O || !O.statusEl) return;
    if (O.leaveBtn) O.leaveBtn.textContent = S.over ? '← Voltar' : (O.live ? '⎋ Sair' : '✕ Cancelar');
    O.statusEl.textContent = S.over ? 'Partida encerrada' : (!O.live ? '⏳ Aguardando o convite ser aceito…' : (O.oppOnline ? '🟢 online' : '⚪ offline (reconectando?)'));
  }

  async function challenge(f) {
    const so = So(); if (!so || !so.user) return;
    if (S.online) { Core.toast('Termine a partida atual primeiro'); return; }
    if (S.mode !== 'online') setMode('online');
    if (!f.online) { Core.toast(f.name + ' está offline'); return; }
    const me = myUid(), db = so.db;
    const hostColor = S.onlineColor === 'b' ? 1 : S.onlineColor === 'w' ? 0 : Core.rand(0, 1);
    const rid = db.ref('rooms').push().key;
    try {
      await db.ref('rooms/' + rid).set({ game: 'chess', host: me, guest: f.uid, hostColor, hostName: so.me.name, hostAvatar: so.me.avatar, guestName: f.name, guestAvatar: f.avatar, created: so.TS, status: 'waiting' });
      await so.sendInvite(f.uid, 'chess', rid);
    } catch (e) { console.error(e); Core.toast('Não foi possível criar a partida (verifique as regras do banco).', 4000); return; }
    startOnline({ rid, role: 'host', hostColor, oppUid: f.uid, oppName: f.name, oppAvatar: f.avatar });
    Core.toast('Convite enviado para ' + f.name);
  }
  async function joinRoom(inv) {
    const so = So();
    if (!so || !so.user) { Core.toast('Entre na sua conta para aceitar o convite'); return; }
    if (S.online) { Core.toast('Você já está em uma partida online'); return; }
    try {
      const snap = await so.db.ref('rooms/' + inv.room).get();
      if (!snap.exists()) { Core.toast('Convite expirado'); return; }
      const r = snap.val();
      if (r.guest !== so.user.uid) { Core.toast('Convite inválido'); return; }
      startOnline({ rid: inv.room, role: 'guest', hostColor: r.hostColor, oppUid: r.host, oppName: r.hostName || 'Amigo', oppAvatar: r.hostAvatar || '🙂' });
    } catch (e) { console.error(e); Core.toast('Convite inválido ou expirado'); }
  }
  async function resumeRoom() {
    const saved = Core.store.get('chess.room', null), so = So(); if (!saved || !so.user) return;
    try {
      const snap = await so.db.ref('rooms/' + saved.rid).get();
      if (!snap.exists()) { Core.store.set('chess.room', null); Core.toast('A partida não existe mais'); renderPanel(); return; }
      const r = snap.val(), me = so.user.uid, host = r.host === me;
      startOnline({ rid: saved.rid, role: host ? 'host' : 'guest', hostColor: r.hostColor, oppUid: host ? r.guest : r.host, oppName: (host ? r.guestName : r.hostName) || 'Amigo', oppAvatar: (host ? r.guestAvatar : r.hostAvatar) || '🙂' });
    } catch (e) { Core.store.set('chess.room', null); Core.toast('Não foi possível retomar a partida'); renderPanel(); }
  }

  function startOnline(info) {
    const so = So(), db = so.db;
    S.token++; AI.cancel(); S.thinking = false;
    S.aiSave = { game: S.game, humanColor: S.humanColor, over: S.over, last: S.last, lastResult: S.lastResult };
    const myColor = info.role === 'host' ? info.hostColor : info.hostColor ^ 1;
    const O = S.online = { rid: info.rid, role: info.role, myColor, oppUid: info.oppUid, oppName: info.oppName, oppAvatar: info.oppAvatar, live: false, oppOnline: false, refs: [], drawOffered: false };
    S.game = new E.Game(); S.humanColor = myColor; S.over = false; S.sel = null; S.targets = new Map(); S.last = null; S.hint = null; S.lastResult = '';
    if (S.mode !== 'online') { S.mode = 'online'; Core.$$('button', S.tabs).forEach(b => b.classList.toggle('active', b.dataset.k === 'online')); S.root.classList.remove('mode-tut'); }
    S.board.setFlipped(myColor === 1); S.board.setPosition(S.game.pos.b, null, false); S.board.setArrows([]); refreshMarks();
    Core.store.set('chess.room', { rid: info.rid, role: info.role });
    const room = O.room = db.ref('rooms/' + info.rid);
    const on = (ref, ev, fn) => { ref.on(ev, fn, e => console.error(e)); O.refs.push([ref, ev, fn]); };
    renderPanel(); updateBars(); updateStatus();
    room.child('moves').get().then(snap => {
      if (!S || S.online !== O) return;
      const mv = snap.val() || {};
      Object.keys(mv).map(Number).sort((a, b) => a - b).forEach(n => { if (n === S.game.history.length) S.game.play(mv[n].m); });
      syncBoardFromGame();
      on(room.child('moves'), 'child_added', s => applyRemote(+s.key, s.val()));
      on(room.child('moves'), 'child_removed', () => { if (!S.over) resync(); });
      on(room.child('status'), 'value', s => {
        if (s.val() === 'playing' && !O.live) {
          O.live = true; Core.snd('turn');
          if (O.role === 'host') Core.toast(O.oppName + ' entrou! Boa partida.');
          updateBars(); updateStatus(); updateOnlineStatus();
        }
      });
      on(room.child('result'), 'value', s => handleResult(s.val()));
      on(room.child('drawOffer'), 'value', s => handleDraw(s.val()));
      on(db.ref('presence/' + O.oppUid), 'value', s => { const v = s.val(); O.oppOnline = !!(v && v.online); if (S && S.online === O) { updateBars(); updateOnlineStatus(); } });
      if (O.role === 'guest') room.child('status').set('playing').catch(e => console.error(e));
    }).catch(e => { console.error(e); Core.toast('Erro ao entrar na sala'); if (S && S.online === O) leaveOnline(false); });
  }
  function syncBoardFromGame() {
    const hl = S.game.history[S.game.history.length - 1];
    S.last = hl ? [hl.from, hl.to] : null;
    S.board.setPosition(S.game.pos.b, null, false);
    const st = S.game.status(); if (st.over) { S.over = true; S.lastResult = st.kind === 'mate' ? 'Xeque-mate' : 'Empate'; }
    refreshMarks(); updateBars(); updateStatus(); updateMoves();
  }
  function applyRemote(n, val) {
    const O = S && S.online; if (!O || S.over || !val) return;
    const g = S.game;
    if (n < g.history.length) return;
    if (n > g.history.length) { resync(); return; }
    const me = myUid(), expected = g.pos.turn === O.myColor ? me : O.oppUid;
    if (val.by !== expected) return;
    if (!g.play(val.m)) { Core.toast('Lance inválido recebido'); return; }
    S.sel = null; S.targets = new Map(); S.hint = null; S.board.setArrows([]);
    afterMove();
  }
  function sendMove(m) {
    const O = S.online, n = S.game.history.length;
    S.sel = null; S.targets = new Map(); S.hint = null; S.board.setArrows([]);
    O.room.child('moves/' + n).set({ by: myUid(), m }).catch(e => { console.error(e); Core.toast('Falha ao enviar o lance'); });
  }
  async function resync() {
    const O = S.online; if (!O) return;
    const snap = await O.room.child('moves').get();
    if (!S || S.online !== O) return;
    const g = new E.Game(), mv = snap.val() || {};
    Object.keys(mv).map(Number).sort((a, b) => a - b).forEach(n => { if (n === g.history.length) g.play(mv[n].m); });
    S.game = g; syncBoardFromGame();
  }
  function handleResult(res) {
    const O = S && S.online; if (!O || S.over || !res) return;
    if (res.type === 'resign') finish({ over: true, kind: 'resign', winner: res.by === myUid() ? O.myColor ^ 1 : O.myColor });
    else if (res.type === 'draw') finish({ over: true, kind: 'agreed', winner: -1 });
  }
  function handleDraw(v) {
    const O = S && S.online; if (!O || S.over) return;
    const me = myUid();
    if (!v) { if (O.drawOffered) { O.drawOffered = false; Core.toast('Empate recusado'); } return; }
    if (v === me) { O.drawOffered = true; return; }
    Core.modal({ title: 'Proposta de empate', body: `${O.oppName} propõe empate. Aceitar?`, buttons: [{ text: 'Recusar', cls: 'ghost', value: false }, { text: 'Aceitar', cls: 'primary', value: true }] }).then(ok => {
      if (!S || S.online !== O || S.over) return;
      if (ok) O.room.child('result').set({ type: 'draw', by: me }); else O.room.child('drawOffer').remove();
    });
  }
  async function resignOnline() {
    const O = S.online; if (!O || !O.live || S.over) return;
    const ok = await Core.modal({ title: 'Desistir?', body: 'Você perderá esta partida.', buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Desistir', cls: 'danger', value: true }] });
    if (ok && S && S.online === O && !S.over) O.room.child('result').set({ type: 'resign', by: myUid() });
  }
  function offerDrawOnline() {
    const O = S.online; if (!O || !O.live || S.over) return;
    O.room.child('drawOffer').set(myUid()).then(() => Core.toast('Empate proposto')).catch(() => Core.toast('Erro ao propor empate'));
  }
  function cleanupOnline() {
    const O = S && S.online; if (!O) return;
    O.refs.forEach(([ref, ev, fn]) => { try { ref.off(ev, fn); } catch (e) { /* ok */ } });
    O.refs = [];
  }
  async function leaveOnline(ask) {
    const O = S.online; if (!O) return;
    if (ask && O.live && !S.over) {
      const ok = await Core.modal({ title: 'Sair da partida?', body: 'Sair agora conta como desistência.', buttons: [{ text: 'Continuar jogando', cls: 'ghost', value: false }, { text: 'Sair', cls: 'danger', value: true }] });
      if (!ok || !S || S.online !== O) return;
    }
    const me = So().user && So().user.uid;
    try {
      if (O.live && !S.over && me) await O.room.child('result').set({ type: 'resign', by: me });
      if (O.role === 'host' && (!O.live || S.over)) { await O.room.remove(); await So().db.ref('invites/' + O.oppUid + '/' + me).remove(); }
    } catch (e) { console.error(e); }
    cleanupOnline(); Core.store.set('chess.room', null);
    const sv = S.aiSave; S.online = null;
    if (sv) { S.game = sv.game; S.humanColor = sv.humanColor; S.over = sv.over; S.last = sv.last; S.lastResult = sv.lastResult; }
    S.sel = null; S.targets = new Map(); S.hint = null;
    S.board.setFlipped(S.humanColor === 1); S.board.setPosition(S.game.pos.b, null, false); S.board.setArrows([]);
    refreshMarks(); updateBars(); updateStatus(); renderPanel();
  }

  Core.register('chess', { mount, unmount, joinRoom: inv => { if (S) { if (S.mode !== 'online') setMode('online'); joinRoom(inv); } } });

})();
