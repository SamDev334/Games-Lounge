/* ============================================================
   Poker Texas Hold'em: torneio de mesa (você + 5 IAs)
   ============================================================ */
(function () {
  'use strict';
  const { h, sleep, rand, pick, shuffle } = Core;

  const RN = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const RV = {}; RN.forEach((r, i) => { RV[r] = i + 2; });
  const mkDeck = () => { const d = []; for (const r of RN) for (const s of 'CHSD') d.push({ r, s, v: RV[r] }); return d; };

  // ---------- avaliador de mãos (5 a 7 cartas) ----------
  function straightHigh(m) {
    if (m & (1 << 14)) m |= 2;
    for (let hi = 14; hi >= 5; hi--) { const need = 0x1F << (hi - 4); if ((m & need) === need) return hi; }
    return 0;
  }
  function evalCards(cs) {
    const cnt = new Int8Array(15), sc = { C: 0, H: 0, S: 0, D: 0 }, sm = { C: 0, H: 0, S: 0, D: 0 };
    let mask = 0;
    for (let i = 0; i < cs.length; i++) { const c = cs[i]; cnt[c.v]++; sc[c.s]++; mask |= 1 << c.v; sm[c.s] |= 1 << c.v; }
    let fs = null; for (const s in sc) if (sc[s] >= 5) fs = s;
    if (fs) { const f = straightHigh(sm[fs]); if (f) return (8 << 20) | f; }
    let q = 0; const t = [], p = [];
    for (let v = 14; v >= 2; v--) { if (cnt[v] === 4) q = v; else if (cnt[v] === 3) t.push(v); else if (cnt[v] === 2) p.push(v); }
    const kick = (ex, n) => { const out = []; for (let v = 14; v >= 2 && out.length < n; v--) if (cnt[v] && ex.indexOf(v) < 0) out.push(v); return out; };
    const pack = a => a.reduce((x, v) => (x << 4) | v, 0);
    if (q) return (7 << 20) | (q << 4) | kick([q], 1)[0];
    if (t.length && (t.length > 1 || p.length)) return (6 << 20) | (t[0] << 4) | (t.length > 1 ? Math.max(t[1], p[0] || 0) : p[0]);
    if (fs) { const a = []; for (let v = 14; v >= 2 && a.length < 5; v--) if ((sm[fs] >> v) & 1) a.push(v); return (5 << 20) | pack(a); }
    const st = straightHigh(mask); if (st) return (4 << 20) | st;
    if (t.length) { const k = kick([t[0]], 2); return (3 << 20) | (t[0] << 8) | (k[0] << 4) | k[1]; }
    if (p.length >= 2) { const k = kick([p[0], p[1]], 1); return (2 << 20) | (p[0] << 8) | (p[1] << 4) | k[0]; }
    if (p.length === 1) { const k = kick([p[0]], 3); return (1 << 20) | (p[0] << 12) | pack(k); }
    return pack(kick([], 5));
  }
  const PL = { 14: 'Ases', 13: 'Reis', 12: 'Damas', 11: 'Valetes', 10: 'Dez', 9: 'Noves', 8: 'Oitos', 7: 'Setes', 6: 'Seis', 5: 'Cincos', 4: 'Quatros', 3: 'Treses', 2: 'Dois' };
  const SG = { 14: 'Ás', 13: 'Rei', 12: 'Dama', 11: 'Valete', 10: 'Dez', 9: 'Nove', 8: 'Oito', 7: 'Sete', 6: 'Seis', 5: 'Cinco', 4: 'Quatro', 3: 'Três', 2: 'Dois' };
  function describe(sc) {
    const c = sc >> 20;
    switch (c) {
      case 8: return (sc & 15) === 14 ? 'Royal Flush!' : 'Straight Flush (até ' + SG[sc & 15] + ')';
      case 7: return 'Quadra de ' + PL[(sc >> 4) & 15];
      case 6: return 'Full House (' + PL[(sc >> 4) & 15] + ' e ' + PL[sc & 15] + ')';
      case 5: return 'Flush (' + SG[(sc >> 16) & 15] + ' alto)';
      case 4: return 'Sequência (até ' + SG[sc & 15] + ')';
      case 3: return 'Trinca de ' + PL[(sc >> 8) & 15];
      case 2: return 'Dois Pares (' + PL[(sc >> 8) & 15] + ' e ' + PL[(sc >> 4) & 15] + ')';
      case 1: return 'Par de ' + PL[(sc >> 12) & 15];
      default: return 'Carta alta (' + SG[(sc >> 16) & 15] + ')';
    }
  }
  function equity(hole, board, nOpp, sims) {
    if (nOpp < 1) return 1;
    const known = new Set(hole.concat(board).map(c => c.r + c.s));
    const deck = mkDeck().filter(c => !known.has(c.r + c.s));
    const need = 5 - board.length, k = need + 2 * nOpp;
    let win = 0, tie = 0;
    for (let i = 0; i < sims; i++) {
      for (let j = 0; j < k; j++) { const r = j + Math.floor(Math.random() * (deck.length - j)); const tmp = deck[j]; deck[j] = deck[r]; deck[r] = tmp; }
      const full = board.concat(deck.slice(0, need));
      const my = evalCards(hole.concat(full));
      let lost = false, ties = 0;
      for (let o = 0; o < nOpp; o++) {
        const sc = evalCards([deck[need + 2 * o], deck[need + 2 * o + 1]].concat(full));
        if (sc > my) { lost = true; break; } else if (sc === my) ties++;
      }
      if (!lost) { if (!ties) win++; else tie += 1 / (ties + 1); }
    }
    return (win + tie) / sims;
  }

  const PERSONAS = [
    { name: 'Tubarão', emoji: '🦈', tight: .65, aggr: .75, bluff: .15, desc: 'Tight-agressivo' },
    { name: 'Raposa', emoji: '🦊', tight: .3, aggr: .7, bluff: .55, desc: 'Blefadora' },
    { name: 'Rocha', emoji: '🪨', tight: .85, aggr: .2, bluff: .03, desc: 'Passivo e sólido' },
    { name: 'Pantera', emoji: '🐆', tight: .45, aggr: .9, bluff: .3, desc: 'Agressiva' },
    { name: 'Coruja', emoji: '🦉', tight: .6, aggr: .45, bluff: .1, desc: 'Calculista' },
    { name: 'Maluco', emoji: '🤪', tight: .1, aggr: .85, bluff: .7, desc: 'Imprevisível' }
  ];
  const BLINDS = [[10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [500, 1000]];
  const HANDS_PER_LEVEL = 5;
  const SEATPOS = [[50, 91], [9, 70], [9, 30], [50, 9], [91, 30], [91, 70]];

  let P = null;
  class Abort extends Error { }

  function mount(root) {
    P = { root, tok: {}, showEq: Core.store.get('poker.eq', false), skill: Core.store.get('poker.skill', 1), chips: Core.store.get('poker.chips', 1500) };
    root.append(Core.topbar('POKER HOLD\'EM', h('button', { class: 'btn icon', title: 'Ranking das mãos', onclick: showRanks }, '?')));
    P.box = h('div', { class: 'poker' }); root.append(P.box);
    showSetup();
  }
  function unmount() { P = null; }

  function showRanks() {
    const rows = [['Royal / Straight Flush', 'Sequência do mesmo naipe'], ['Quadra', '4 cartas iguais'], ['Full House', 'Trinca + par'], ['Flush', '5 cartas do mesmo naipe'], ['Sequência', '5 cartas seguidas'], ['Trinca', '3 cartas iguais'], ['Dois Pares', ''], ['Par', ''], ['Carta Alta', '']];
    Core.modal({ title: 'Ranking das mãos', body: h('div', { class: 'ranks' }, rows.map(([a, b], i) => h('div', { class: 'rk' }, h('b', null, (i + 1) + '. ' + a), h('span', null, b)))), buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
  }

  function showSetup() {
    P.tok = {}; P.box.innerHTML = '';
    const mk = (arr, key, store) => arr.map(([k, t, d]) => {
      const b = h('button', { class: 'opt-card' + (P[key] === k ? ' active' : ''), onclick: () => { P[key] = k; Core.store.set(store, k); Core.$$('.opt-card', b.parentNode).forEach(x => x.classList.remove('active')); b.classList.add('active'); } }, h('b', null, t), h('span', null, d));
      return b;
    });
    P.box.append(h('div', { class: 'tr-setup' },
      h('div', { class: 'panel' }, h('h3', null, 'Fichas iniciais'), h('div', { class: 'opt' }, mk([[1000, '1.000', 'Jogo rápido'], [1500, '1.500', 'Padrão'], [3000, '3.000', 'Longo']], 'chips', 'poker.chips'))),
      h('div', { class: 'panel' }, h('h3', null, 'Habilidade das IAs'), h('div', { class: 'opt' }, mk([[0.5, 'Fácil', 'Mais erros'], [1, 'Normal', 'Equilibrado'], [1.6, 'Difícil', 'Mais simulações']], 'skill', 'poker.skill'))),
      h('div', { class: 'panel' }, h('h3', null, 'Adversários'), h('div', { class: 'small muted', style: { lineHeight: 1.7 } }, PERSONAS.map(p => `${p.emoji} ${p.name} — ${p.desc}`).join(' · '))),
      h('div', { class: 'panel small muted', style: { lineHeight: 1.5 } }, 'Torneio estilo <i>sit&amp;go</i>: 6 jogadores, blinds sobem a cada ' + HANDS_PER_LEVEL + ' mãos. Vence quem ficar com todas as fichas.'.replace('&amp;', '&')),
      h('button', { class: 'btn primary lg block', onclick: startGame }, '▶ Sentar na mesa'),
      h('button', { class: 'btn block', onclick: showRanks }, '🃏 Ranking das mãos')));
  }

  // ---------------- jogo ----------------
  function startGame() {
    P.tok = {}; const tok = P.tok;
    const pool = shuffle(PERSONAS).slice(0, 5);
    P.players = [{ id: 0, name: Core.settings.name, emoji: '🙂', human: true, chips: P.chips, hole: [], out: false }]
      .concat(pool.map((s, i) => ({ id: i + 1, name: s.name, emoji: s.emoji, human: false, style: s, chips: P.chips, hole: [], out: false })));
    P.button = rand(0, 5); P.handNo = 0; P.board = []; P.stage = ''; P.pending = null;
    buildUI();
    runGame(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); });
  }

  function buildUI() {
    P.box.innerHTML = ''; P.ui = {};
    P.ui.pot = h('div', { class: 'p-pot' }, 'Pote: 0');
    P.ui.stage = h('div', { class: 'p-stage' });
    P.ui.board = h('div', { class: 'p-board' }, [0, 1, 2, 3, 4].map(() => h('div', { class: 'card-slot' })));
    P.ui.boardKeys = ['', '', '', '', ''];
    P.ui.felt = h('div', { class: 'p-felt' }, h('div', { class: 'p-mid' }, P.ui.stage, P.ui.board, P.ui.pot));
    P.ui.seats = P.players.map((p, i) => {
      const cards = h('div', { class: 'ps-cards' });
      const plate = h('div', { class: 'ps-plate' }, h('div', { class: 'av' }, p.emoji), h('div', { class: 'tx' }, h('b', null, p.name), h('span', { class: 'ch' }, '0')));
      const act = h('div', { class: 'ps-act' });
      const el = h('div', { class: 'pseat' + (p.human ? ' me' : '') }, cards, plate, act);
      el.style.left = SEATPOS[i][0] + '%'; el.style.top = SEATPOS[i][1] + '%';
      const bet = h('div', { class: 'pbet hide' });
      bet.style.left = (SEATPOS[i][0] + (50 - SEATPOS[i][0]) * .36) + '%'; bet.style.top = (SEATPOS[i][1] + (45 - SEATPOS[i][1]) * .36) + '%';
      const dealer = h('div', { class: 'dbtn hide' }, 'D');
      dealer.style.left = (SEATPOS[i][0] + (50 - SEATPOS[i][0]) * .2 + (SEATPOS[i][0] < 50 ? 9 : -9)) + '%'; dealer.style.top = (SEATPOS[i][1] + (45 - SEATPOS[i][1]) * .2) + '%';
      return { el, cards, plate, act, bet, dealer };
    });
    P.ui.table = h('div', { class: 'p-table' }, P.ui.felt);
    P.ui.seats.forEach(s => P.ui.table.append(s.el, s.bet, s.dealer));
    P.ui.hand = h('div', { class: 'p-hand' });
    P.ui.info = h('div', { class: 'p-info' });
    P.ui.log = h('div', { class: 'p-log' });
    P.ui.ctl = h('div', { class: 'p-ctl' });
    P.ui.head = h('div', { class: 'p-head' });
    const eqToggle = h('input', { type: 'checkbox', onchange: e => { P.showEq = e.target.checked; Core.store.set('poker.eq', P.showEq); } }); eqToggle.checked = P.showEq;
    P.box.append(P.ui.head, P.ui.table, P.ui.log, P.ui.hand, P.ui.info, P.ui.ctl,
      h('div', { class: 'row sb', style: { padding: '4px 8px' } },
        h('label', { class: 'row small muted' }, h('span', { class: 'switch' }, eqToggle, h('i')), h('span', null, 'Mostrar minha chance de vitória')),
        h('button', { class: 'btn sm', onclick: showSetup }, '⚙ Novo jogo')));
    renderAll();
  }

  const fmt = n => n.toLocaleString('pt-BR');
  function renderAll() {
    const bl = BLINDS[Math.min(BLINDS.length - 1, Math.floor(Math.max(0, P.handNo - 1) / HANDS_PER_LEVEL))];
    P.ui.head.innerHTML = `<span class="chip">Mão #${P.handNo}</span><span class="chip">Blinds ${fmt(bl[0])}/${fmt(bl[1])}</span><span class="chip">${P.players.filter(p => !p.out).length} jogadores</span>`;
    P.players.forEach((p, i) => {
      const s = P.ui.seats[i];
      s.plate.querySelector('.ch').textContent = p.out ? 'Eliminado' : fmt(p.chips);
      s.el.classList.toggle('folded', !!p.folded); s.el.classList.toggle('out', p.out);
      s.el.classList.toggle('turn', P.turn === i);
      s.el.classList.toggle('allin', !!p.allIn && !p.out);
      s.dealer.classList.toggle('hide', P.button !== i || p.out);
      if (p.bet > 0) { s.bet.classList.remove('hide'); s.bet.innerHTML = `<i></i>${fmt(p.bet)}`; } else s.bet.classList.add('hide');
      // cartas
      s.cards.innerHTML = '';
      if (!p.human && !p.out && p.hole.length && !p.folded) {
        p.hole.forEach(c => s.cards.append(Core.cardEl(c, { small: true, back: !p.reveal, cls: 'pc-s' })));
      }
    });
    for (let i = 0; i < 5; i++) {
      const c = P.board[i];
      const base = c ? c.r + c.s : '';
      const win = !!(c && P.winCards && P.winCards.has(base));
      const key = base + (win ? '|w' : '');
      if (P.ui.boardKeys[i] === key) continue;           // sem mudança: não recria (evita "pular")
      const isNew = P.ui.boardKeys[i].split('|')[0] !== base;
      const el = c ? Core.cardEl(c, { cls: (isNew ? 'bd-c' : '') + (win ? ' win' : '') }) : h('div', { class: 'card-slot' });
      P.ui.board.replaceChild(el, P.ui.board.children[i]);
      P.ui.boardKeys[i] = key;
    }
    P.ui.pot.textContent = 'Pote: ' + fmt(potTotal());
    P.ui.stage.textContent = P.stage || '';
    // mão do humano
    const me = P.players[0];
    const handBase = me.hole.map(c => c.r + c.s).join(',');
    const handKey = handBase + '|' + (me.folded ? 'f' : '') + '|' + me.hole.map(c => (P.winCards && P.winCards.has(c.r + c.s)) ? 'w' : '-').join('');
    if (P.ui.handKey !== handKey) {
      const isNew = P.ui.handBase !== handBase;
      P.ui.hand.innerHTML = '';
      me.hole.forEach((c, i) => {
        const el = Core.cardEl(c, { cls: 'hole' + (isNew ? ' deal' : '') + (me.folded ? ' dim' : '') + (P.winCards && P.winCards.has(c.r + c.s) ? ' win' : '') });
        if (isNew) el.style.animationDelay = (i * 120) + 'ms';
        P.ui.hand.append(el);
      });
      P.ui.handKey = handKey; P.ui.handBase = handBase;
    }
  }
  const potTotal = () => P.players.reduce((a, p) => a + (p.total || 0), 0);
  function setAct(p, text, cls) { const s = P.ui.seats[p.id]; s.act.textContent = text || ''; s.act.className = 'ps-act ' + (cls || ''); }
  function log(t) { if (P && P.ui.log) P.ui.log.textContent = t; }

  const wait = async ms => { const tok = P.tok; await sleep(ms); if (!P || P.tok !== tok) throw new Abort(); };
  function humanInput() { const tok = P.tok; return new Promise(res => { P.pending = { res, tok }; }); }
  function resolveHuman(v) { if (P.pending && P.pending.tok === P.tok) { const p = P.pending; P.pending = null; p.res(v); } }

  async function runGame(tok) {
    while (true) {
      const alive = P.players.filter(p => !p.out);
      if (alive.length <= 1 || P.players[0].out) break;
      await playHand();
      if (!P || P.tok !== tok) return;
      // eliminações
      for (const p of P.players) if (!p.out && p.chips <= 0) { p.out = true; if (!p.human) log(`${p.name} foi eliminado!`); }
      renderAll();
      if (P.players[0].out) break;
      if (P.players.filter(p => !p.out).length <= 1) break;
      await nextHandPrompt();
    }
    const won = !P.players[0].out;
    Core.snd(won ? 'win' : 'lose'); if (won) Core.addStat('pokerWin');
    const v = await Core.modal({
      title: won ? 'Você é o campeão! 🏆' : 'Você foi eliminado 😔',
      body: won ? `Você ficou com todas as fichas em ${P.handNo} mãos.` : `Você caiu na mão #${P.handNo}.`,
      buttons: [{ text: 'Menu', cls: 'ghost', value: 'm' }, { text: 'Jogar de novo', cls: 'primary', value: 'r' }]
    });
    if (!P) return;
    if (v === 'r') startGame(); else Core.go('');
  }
  async function nextHandPrompt() {
    P.ui.ctl.innerHTML = '';
    const tok = P.tok;
    await new Promise(res => {
      const b = h('button', { class: 'btn primary lg', onclick: () => { clearTimeout(t); res(); } }, 'Próxima mão ▶');
      const t = setTimeout(res, 7000);
      P.ui.ctl.append(b);
    });
    if (!P || P.tok !== tok) throw new Abort();
    P.ui.ctl.innerHTML = '';
  }

  // ---------------- uma mão ----------------
  function nextActive(from) { let i = from; do { i = (i + 1) % 6; } while (P.players[i].out); return i; }
  const canAct = p => !p.out && !p.folded && !p.allIn;
  const inHand = () => P.players.filter(p => !p.out && !p.folded);

  async function playHand() {
    P.handNo++;
    const lvl = Math.min(BLINDS.length - 1, Math.floor((P.handNo - 1) / HANDS_PER_LEVEL));
    const [SB, BB] = BLINDS[lvl]; P.SB = SB; P.BB = BB;
    P.board = []; P.winCards = null; P.stage = 'Pré-flop';
    P.players.forEach(p => { p.hole = []; p.folded = false; p.allIn = false; p.bet = 0; p.total = 0; p.reveal = false; if (!p.out) setAct(p, ''); else setAct(p, ''); });
    P.button = nextActive(P.button);
    const act = P.players.filter(p => !p.out);
    const heads = act.length === 2;
    const sbI = heads ? P.button : nextActive(P.button), bbI = nextActive(sbI);
    if (lvl > 0 && (P.handNo - 1) % HANDS_PER_LEVEL === 0) { Core.toast(`Blinds aumentaram: ${fmt(SB)}/${fmt(BB)}`, 2600); }
    // baralho
    P.deck = shuffle(mkDeck());
    const postBlind = (p, amt) => { const a = Math.min(amt, p.chips); p.chips -= a; p.bet += a; p.total += a; if (p.chips === 0) p.allIn = true; };
    postBlind(P.players[sbI], SB); postBlind(P.players[bbI], BB);
    setAct(P.players[sbI], 'SB ' + fmt(SB), 'blind'); setAct(P.players[bbI], 'BB ' + fmt(BB), 'blind');
    for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) { const p = P.players[(sbI + k) % 6]; if (!p.out) p.hole.push(P.deck.pop()); }
    P.turn = -1; renderAll(); Core.snd('deal');
    log(`Mão #${P.handNo} — ${P.players[P.button].name} é o dealer.`);
    await wait(800);

    // rodadas
    let first = heads ? P.button : nextActive(bbI);
    let currentBet = BB;
    const streets = [['Pré-flop', 0], ['Flop', 3], ['Turn', 1], ['River', 1]];
    for (let si = 0; si < 4; si++) {
      const [name, n] = streets[si];
      if (si > 0) {
        P.players.forEach(p => { p.bet = 0; if (!p.folded && !p.out && !p.allIn) setAct(p, ''); else if (!p.allIn) { /* mantém fold */ } });
        for (let k = 0; k < n; k++) P.board.push(P.deck.pop());
        P.stage = name; Core.snd('card'); renderAll();
        await wait(700);
        first = nextActive(P.button); // primeiro à esquerda do dealer
        // em heads-up, o primeiro a agir pós-flop é o BB (não o dealer)
        currentBet = 0;
      }
      if (inHand().length <= 1) break;
      const res = await bettingRound(first, currentBet, si === 0 ? BB : BB);
      if (inHand().length <= 1) break;
    }
    // resolução
    P.turn = -1;
    await resolveHand();
  }

  async function bettingRound(first, currentBet, minRaise) {
    const order = [];
    for (let k = 0; k < 6; k++) order.push((first + k) % 6);
    let needAct = new Set(order.filter(i => canAct(P.players[i])));
    const S = { currentBet, minRaise };
    while (needAct.size) {
      if (inHand().length <= 1) return;
      const can = P.players.filter(canAct);
      if (can.length === 0) return;
      if (can.length === 1 && can[0].bet >= S.currentBet) return;
      // próximo a agir
      let idx = order.find(i => needAct.has(i));
      // preserva ordem cíclica após uma aposta: procurar a partir do último ator
      if (S.last != null) { for (let k = 1; k <= 6; k++) { const j = (S.last + k) % 6; if (needAct.has(j)) { idx = j; break; } } }
      const p = P.players[idx];
      P.turn = idx; renderAll();
      let act;
      if (p.human) act = await humanTurn(p, S); else act = await aiTurn(p, S);
      applyAction(p, act, S);
      needAct.delete(idx);
      if (act.type === 'raise' && act.reopen) {
        needAct = new Set(P.players.filter(q => canAct(q) && q.id !== idx).map(q => q.id));
      }
      S.last = idx; P.turn = -1; renderAll();
      await wait(p.human ? 300 : 500);
    }
  }

  function applyAction(p, act, S) {
    const toCall = S.currentBet - p.bet;
    if (act.type === 'fold') { p.folded = true; setAct(p, 'Fold', 'fold'); log(`${p.name} desistiu.`); Core.snd('card'); }
    else if (act.type === 'call') {
      const a = Math.min(toCall, p.chips);
      p.chips -= a; p.bet += a; p.total += a; if (p.chips === 0) p.allIn = true;
      if (toCall === 0) { setAct(p, 'Check', 'check'); log(`${p.name} dá check.`); }
      else { setAct(p, p.allIn ? 'All-in ' + fmt(p.bet) : 'Call ' + fmt(a), p.allIn ? 'allin' : 'call'); log(`${p.name} paga ${fmt(a)}${p.allIn ? ' (all-in)' : ''}.`); Core.snd('chip'); }
    } else if (act.type === 'raise') {
      let to = Math.min(act.to, p.bet + p.chips);
      const a = to - p.bet;
      p.chips -= a; p.bet = to; p.total += a; if (p.chips === 0) p.allIn = true;
      const size = to - S.currentBet;
      act.reopen = true;
      if (size >= S.minRaise) S.minRaise = size;
      const wasBet = S.currentBet === 0;
      S.currentBet = to;
      setAct(p, p.allIn ? 'All-in ' + fmt(to) : (wasBet ? 'Aposta ' : 'Raise ') + fmt(to), p.allIn ? 'allin' : 'raise');
      log(`${p.name} ${p.allIn ? 'vai all-in com' : (wasBet ? 'aposta' : 'aumenta para')} ${fmt(to)}.`); Core.snd('chip');
    }
    renderAll();
  }

  // ---------------- vez do humano ----------------
  async function humanTurn(p, S) {
    const toCall = S.currentBet - p.bet;
    const callAmt = Math.min(toCall, p.chips);
    const minTo = Math.min(p.bet + p.chips, S.currentBet === 0 ? Math.max(P.BB, 1) : S.currentBet + S.minRaise);
    const maxTo = p.bet + p.chips;
    const canRaise = p.chips > toCall; // sobra algo além do call
    const pot = potTotal();
    let raiseTo = minTo;
    const ctl = P.ui.ctl; ctl.innerHTML = '';
    Core.snd('turn');
    // chance de vitória
    if (P.showEq) {
      const nOpp = inHand().length - 1;
      const eq = equity(p.hole, P.board, nOpp, 400);
      let extra = P.board.length >= 3 ? ' · ' + describe(evalCards(p.hole.concat(P.board))) : '';
      P.ui.info.innerHTML = `🎯 Chance de vitória: <b>${Math.round(eq * 100)}%</b>${extra}`;
    } else if (P.board.length >= 3) P.ui.info.innerHTML = '✋ ' + describe(evalCards(p.hole.concat(P.board)));
    else P.ui.info.innerHTML = '';
    const label = h('div', { class: 'rz-label' });
    const unit = Math.max(1, Math.floor(P.SB / 2));
    const slider = h('input', { type: 'range', min: minTo, max: maxTo, value: minTo, step: 1 });
    const btnRaise = h('button', { class: 'btn primary grow lg' });
    const upd = () => {
      let v = +slider.value;
      v = v >= maxTo - unit / 2 ? maxTo : Math.round(v / unit) * unit;
      raiseTo = Math.max(minTo, Math.min(maxTo, v));
      const allin = raiseTo >= maxTo;
      label.innerHTML = `<b>${fmt(raiseTo)}</b>` + (allin ? ' · ALL-IN' : '');
      btnRaise.textContent = allin ? 'ALL-IN' : (S.currentBet === 0 ? 'Apostar ' : 'Aumentar ') + (allin ? '' : fmt(raiseTo));
    };
    const setTo = v => { raiseTo = Math.max(minTo, Math.min(maxTo, Math.round(v))); slider.value = raiseTo; upd(); };
    slider.oninput = upd; upd();
    const preset = (t, fn) => h('button', { class: 'btn sm grow', onclick: () => setTo(fn()) }, t);
    const potRaise = f => () => S.currentBet + f * (pot + toCall);
    const raiseBox = h('div', { class: 'rz' },
      h('div', { class: 'row' }, preset('Mín', () => minTo), preset('½ Pote', potRaise(.5)), preset('¾', potRaise(.75)), preset('Pote', potRaise(1)), preset('All-in', () => maxTo)),
      h('div', { class: 'row' }, slider, label));
    const btns = h('div', { class: 'row p-btns' },
      toCall > 0 ? h('button', { class: 'btn danger lg grow', onclick: () => resolveHuman({ type: 'fold' }) }, 'Fold') : null,
      h('button', { class: 'btn blue lg grow', onclick: () => resolveHuman({ type: 'call' }) }, toCall === 0 ? 'Check' : (callAmt < toCall ? `All-in ${fmt(callAmt)}` : `Call ${fmt(callAmt)}`)),
      canRaise ? btnRaise : null);
    if (canRaise) { btnRaise.onclick = () => resolveHuman({ type: 'raise', to: raiseTo }); ctl.append(raiseBox); }
    ctl.append(btns);
    const act = await humanInput();
    ctl.innerHTML = '';
    return act;
  }

  // ---------------- IA ----------------
  async function aiTurn(p, S) {
    const st = p.style;
    log(`${p.name} está pensando…`);
    await wait(700 + rand(0, 900));
    const toCall = S.currentBet - p.bet;
    const nOpp = inHand().length - 1;
    const sims = Math.round(160 * P.skill) + 40;
    let eq = equity(p.hole, P.board, nOpp, sims);
    eq += (Math.random() - .5) * 0.12 / P.skill;
    const pot = potTotal();
    const n = nOpp + 1, fair = 1 / n;
    const potOdds = toCall / (pot + toCall || 1);
    const maxTo = p.bet + p.chips, minTo = Math.min(maxTo, S.currentBet === 0 ? P.BB : S.currentBet + S.minRaise);
    const raiseTo = f => Math.min(maxTo, Math.max(minTo, Math.round((S.currentBet + f * (pot + toCall)) / Math.max(1, P.SB / 2)) * Math.max(1, P.SB / 2)));
    const strong = fair + .22 + st.tight * .1;
    const monster = fair + .38 + st.tight * .08;
    const preflop = P.board.length === 0;
    const stackRatio = toCall / Math.max(1, p.chips + p.bet);   // quanto do stack custa pagar
    if (toCall === 0) {
      if (eq >= monster && Math.random() < .6 + st.aggr * .35) return { type: 'raise', to: raiseTo(.5 + Math.random() * .5) };
      if (eq >= strong && Math.random() < .35 + st.aggr * .5) return { type: 'raise', to: raiseTo(.4 + Math.random() * .3) };
      if (Math.random() < st.bluff * .16 && P.board.length < 5) return { type: 'raise', to: raiseTo(.45) };
      return { type: 'call' };
    }
    if (p.chips <= toCall) { // call é all-in
      if (eq >= potOdds + .02 + st.tight * .05 || Math.random() < st.bluff * .05) return { type: 'call' };
      return { type: 'fold' };
    }
    let need = potOdds + .03 + st.tight * .06 + stackRatio * .18;
    if (preflop) need += .02;
    if (eq >= monster && Math.random() < .5 + st.aggr * .45) return { type: 'raise', to: raiseTo(.75 + Math.random() * .6) };
    if (eq >= strong + .04 && Math.random() < st.aggr * .55) return { type: 'raise', to: raiseTo(.6) };
    if (Math.random() < st.bluff * .06 && toCall < p.chips * .3) return { type: 'raise', to: raiseTo(.9) };
    if (eq >= need) return { type: 'call' };
    if (Math.random() < st.bluff * .08 && stackRatio < .1) return { type: 'call' };
    return { type: 'fold' };
  }

  // ---------------- showdown / potes ----------------
  async function resolveHand() {
    const live = inHand();
    P.stage = '';
    const totals = P.players.map(p => p.total);
    let winnersInfo = [];
    if (live.length === 1) {
      const w = live[0], pot = potTotal();
      w.chips += pot; winnersInfo.push({ p: w, amt: pot });
      P.players.forEach(p => { p.bet = 0; });
      renderAll();
      log(`${w.name} leva o pote de ${fmt(pot)}.`);
      setAct(w, '+' + fmt(pot), 'win'); Core.snd(w.human ? 'win' : 'chip');
      await wait(2000);
      P.players.forEach(p => { p.total = 0; });
      return;
    }
    // completar o board se necessário (all-in antecipado)
    while (P.board.length < 5) {
      P.board.push(P.deck.pop()); P.stage = ['', '', '', 'Flop', 'Turn', 'River'][P.board.length] || ''; Core.snd('card');
      P.players.forEach(p => { if (!p.out && !p.folded) p.reveal = true; });
      renderAll(); await wait(900);
    }
    P.stage = 'Showdown';
    P.players.forEach(p => { p.bet = 0; if (!p.out && !p.folded) p.reveal = true; });
    const score = {};
    live.forEach(p => { score[p.id] = evalCards(p.hole.concat(P.board)); });
    renderAll();
    live.forEach(p => setAct(p, describe(score[p.id]), 'show'));
    await wait(1200);
    // potes (principal + laterais)
    const levels = Array.from(new Set(live.map(p => p.total))).sort((a, b) => a - b);
    let prev = 0; const won = {};
    levels.forEach((lv, li) => {
      let pot = 0;
      P.players.forEach(p => { pot += Math.max(0, Math.min(p.total, lv) - Math.min(p.total, prev)); });
      if (li === levels.length - 1) { P.players.forEach(p => { pot += Math.max(0, p.total - lv); }); } // excesso de quem desistiu
      const elig = live.filter(p => p.total >= lv);
      if (pot > 0 && elig.length) {
        const best = Math.max(...elig.map(p => score[p.id]));
        const ws = elig.filter(p => score[p.id] === best);
        const share = Math.floor(pot / ws.length); let rem = pot - share * ws.length;
        ws.forEach((p, i) => { const a = share + (i === 0 ? rem : 0); won[p.id] = (won[p.id] || 0) + a; });
      }
      prev = lv;
    });
    const wl = Object.keys(won).map(id => P.players[+id]);
    wl.forEach(p => { p.chips += won[p.id]; });
    // destaque das cartas vencedoras
    P.winCards = new Set();
    const bestW = wl.reduce((a, p) => score[p.id] > score[a.id] ? p : a, wl[0]);
    P.winCards = bestFive(bestW.hole.concat(P.board));
    P.players.forEach(p => { p.total = 0; });
    renderAll();
    wl.forEach(p => setAct(p, '+' + fmt(won[p.id]), 'win'));
    const names = wl.map(p => p.name).join(' e ');
    log(`${names} ${wl.length > 1 ? 'dividem o pote' : 'vence'} com ${describe(score[bestW.id])}.`);
    Core.snd(wl.some(p => p.human) ? 'win' : 'chip');
    await wait(2600);
  }
  function bestFive(cards) {
    // destaca as cartas que formam a melhor mão (aprox.: tenta remover 2 de 7)
    const sc = evalCards(cards); const keep = new Set(cards.map(c => c.r + c.s));
    if (cards.length <= 5) return keep;
    let bestSet = null;
    for (let i = 0; i < cards.length && !bestSet; i++) for (let j = i + 1; j < cards.length && !bestSet; j++) {
      const sub = cards.filter((_, k) => k !== i && k !== j);
      if (evalCards(sub) === sc) bestSet = new Set(sub.map(c => c.r + c.s));
    }
    return bestSet || keep;
  }

  window.PokerEval = { evalCards, describe, equity, mkDeck };
  Core.register('poker', { mount, unmount });
})();
