/* ============================================================
   Gamão (Backgammon) com IA — "Bukkagamon"
   Jogador 0 (você, claras): 24 → 1.  Jogador 1 (IA, escuras): 1 → 24.
   ============================================================ */
(function () {
  'use strict';
  const { h, sleep, rand, pick } = Core;

  // ---------------- regras ----------------
  const A = (p, r) => (p === 0 ? r : 25 - r);           // posição relativa -> absoluta
  const R = (p, a) => (p === 0 ? a : 25 - a);           // absoluta -> relativa
  function startState() {
    const pts = new Array(26).fill(0);
    pts[24] = 2; pts[13] = 5; pts[8] = 3; pts[6] = 5;        // jogador 0
    pts[1] = -2; pts[12] = -5; pts[17] = -3; pts[19] = -5;   // jogador 1
    return { pts, bar: [0, 0], off: [0, 0] };
  }
  const clone = st => ({ pts: st.pts.slice(), bar: st.bar.slice(), off: st.off.slice() });

  function singleMoves(st, p, d) {
    const s = p ? -1 : 1, out = [];
    if (st.bar[p] > 0) {
      const t = 25 - d;
      if (st.pts[A(p, t)] * s > -2) out.push({ f: 25, t, d });
      return out;
    }
    let allHome = true, highest = 0;
    for (let r = 24; r >= 1; r--) if (st.pts[A(p, r)] * s > 0) { if (r > 6) allHome = false; if (r > highest) highest = r; }
    for (let r = 1; r <= 24; r++) {
      if (st.pts[A(p, r)] * s <= 0) continue;
      const t = r - d;
      if (t >= 1) { if (st.pts[A(p, t)] * s > -2) out.push({ f: r, t, d }); }
      else if (allHome && (t === 0 || r === highest)) out.push({ f: r, t: 0, d });
    }
    return out;
  }
  function applyMove(st, p, m) {
    const s = p ? -1 : 1;
    if (m.f === 25) st.bar[p]--; else st.pts[A(p, m.f)] -= s;
    if (m.t === 0) { st.off[p]++; return false; }
    const a = A(p, m.t); let hit = false;
    if (st.pts[a] * s === -1) { st.pts[a] = 0; st.bar[p ^ 1]++; hit = true; }
    st.pts[a] += s; return hit;
  }
  const mkey = m => m.f + '-' + m.t + '-' + m.d;
  const stateKey = st => st.pts.join(',') + '|' + st.bar + '|' + st.off;

  /** todas as sequências legais (máximo de dados usados) */
  function genSequences(st, p, dice) {
    const dbl = dice[0] === dice[1];
    const orders = dbl ? [[dice[0], dice[0], dice[0], dice[0]]] : [[dice[0], dice[1]], [dice[1], dice[0]]];
    let results = [], maxLen = 0;
    function rec(seq, s) {
      if (seq.length > maxLen) { maxLen = seq.length; results = []; }
      if (seq.length === maxLen) results.push({ moves: seq.slice(), state: s });
    }
    function dfs(s, order, i, seq, lastF) {
      if (i === order.length) { rec(seq, s); return; }
      let ms = singleMoves(s, p, order[i]);
      if (dbl && lastF != null) ms = ms.filter(m => m.f <= lastF);   // canonicaliza dobles
      if (!ms.length) { rec(seq, s); return; }
      for (const m of ms) { const n = clone(s); applyMove(n, p, m); seq.push(m); dfs(n, order, i + 1, seq, m.f); seq.pop(); }
    }
    for (const o of orders) dfs(st, o, 0, [], null);
    // com um único dado jogável: deve usar o maior
    if (!dbl && maxLen === 1) {
      const big = Math.max(dice[0], dice[1]);
      const withBig = results.filter(r => r.moves[0].d === big);
      if (withBig.length) results = withBig;
    }
    return maxLen === 0 ? [] : results;
  }
  const pips = (st, p) => {
    const s = p ? -1 : 1; let n = st.bar[p] * 25;
    for (let a = 1; a <= 24; a++) if (st.pts[a] * s > 0) n += st.pts[a] * s * R(p, a);
    return n;
  };

  // ---------------- IA ----------------
  const SHOT = [0, 11, 12, 14, 15, 15, 17, 6, 6, 5, 3, 2, 3, 0, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0, 1];
  function evaluate(st, p) {
    const q = p ^ 1, sp = p ? -1 : 1;
    let pipP = st.bar[p] * 25, pipQ = st.bar[q] * 25, score = 0;
    const oppPos = [];
    for (let a = 1; a <= 24; a++) {
      const v = st.pts[a] * sp;
      if (v > 0) pipP += v * R(p, a); else if (v < 0) { pipQ += -v * R(q, a); oppPos.push(a); }
    }
    score += (pipQ - pipP);
    let run = 0, bestRun = 0, homeMade = 0;
    for (let r = 1; r <= 24; r++) {
      const a = A(p, r), v = st.pts[a] * sp;
      if (v >= 2) {
        run++; if (run > bestRun) bestRun = run;
        score += 3 + (r <= 6 ? 4 : r <= 12 ? 1.5 : r >= 19 ? 3 : 0);
        if (r <= 6) homeMade++;
        if (v > 5) score -= (v - 5) * 1.5;
      } else run = 0;
      if (v === 1) {
        // probabilidade de ser acertado
        let miss = 1;
        const seen = {};
        if (st.bar[q] > 0) {
          const d = q === 1 ? a : 25 - a; if (d <= 6 && SHOT[d]) miss *= 1 - SHOT[d] / 36;
        } else {
          for (let i = 0; i < oppPos.length; i++) {
            const b = oppPos[i], d = q === 1 ? a - b : b - a;
            if (d > 0 && d <= 24 && !seen[d]) { seen[d] = 1; if (SHOT[d]) miss *= 1 - SHOT[d] / 36; }
          }
        }
        const prob = 1 - miss;
        score -= prob * ((25 - r) * .9 + 14);
        if (r <= 6) score -= 1.5; // blot em casa é mais perigoso
      }
    }
    if (bestRun >= 3) score += bestRun * bestRun * 1.2;
    score -= st.bar[p] * (22 + homeMadeOpp(st, p) * 3);
    score += st.bar[q] * (16 + homeMade * 2);
    score += st.off[p] * 1.5;
    return score;
  }
  function homeMadeOpp(st, p) { // pontos fortes do adversário no seu tabuleiro (onde eu entraria)
    const q = p ^ 1, sq = q ? -1 : 1; let n = 0;
    for (let r = 1; r <= 6; r++) if (st.pts[A(q, r)] * sq >= 2) n++;
    return n;
  }
  async function lookahead(st, p) {
    // média, sobre os 21 lançamentos do oponente, do valor (pela minha ótica) após a melhor resposta dele
    const q = p ^ 1; let tot = 0;
    for (let d1 = 1; d1 <= 6; d1++) for (let d2 = d1; d2 <= 6; d2++) {
      const w = d1 === d2 ? 1 : 2;
      const seqs = genSequences(st, q, [d1, d2]);
      let v;
      if (!seqs.length) v = evaluate(st, p);
      else {
        let best = null, bv = -1e9;
        for (const s of seqs) { const e = evaluate(s.state, q); if (e > bv) { bv = e; best = s; } }
        v = evaluate(best.state, p);
      }
      tot += v * w;
    }
    return tot / 36;
  }

  // ---------------- estado/UI ----------------
  let G = null;
  class Abort extends Error { }
  const LEVELS = [['Fácil', 'IA comete erros'], ['Médio', 'Boa estratégia'], ['Difícil', 'Analisa as respostas']];

  function mount(root) {
    G = {
      root, tok: {}, level: Core.store.get('gamao.level', 1), theme: Core.store.get('gamao.theme', 'classic'),
      portrait: window.innerWidth < 720, st: startState(), turn: 0, dice: [], avail: [], cands: [], sel: null, undo: [], last: null, phase: 'idle', msg: ''
    };
    G.onResize = () => { const pt = window.innerWidth < 720; if (pt !== G.portrait) { G.portrait = pt; renderBoard(); } };
    window.addEventListener('resize', G.onResize);
    root.append(Core.topbar('GAMÃO', h('button', { class: 'btn icon', title: 'Regras', onclick: showRules }, '?')));
    G.box = h('div', { class: 'gamao', 'data-gt': G.theme }); root.append(G.box);
    showSetup();
  }
  function unmount() { if (G) window.removeEventListener('resize', G.onResize); G = null; }

  function showRules() {
    Core.modal({
      title: 'Regras do Gamão', buttons: [{ text: 'Entendi', cls: 'primary', value: 1 }],
      body: '<div class="small" style="line-height:1.6">' +
        '• <b>Objetivo:</b> levar seus 15 checkers (claros) para o seu tabuleiro de casa (pontos 1–6, canto inferior direito) e retirá-los. A IA (escura) vai no sentido oposto.<br>' +
        '• Role os dois dados e mova de acordo com cada valor. <b>Dobles</b> (dados iguais) valem 4 movimentos.<br>' +
        '• Não pode pousar em ponto com <b>2 ou mais</b> checkers adversários. Pousar sobre um <b>blot</b> (1 checker) o envia para a <b>barra</b>.<br>' +
        '• Checkers na barra devem entrar antes de qualquer outro movimento, no tabuleiro de casa do adversário.<br>' +
        '• Você é obrigado a usar o máximo de dados possível (se só um puder ser usado, o maior).<br>' +
        '• Só pode retirar checkers (bear off) quando todos estão no seu tabuleiro de casa.<br>' +
        '• <b>Gammon</b> (adversário sem nenhum fora) vale 2; <b>Backgammon</b> (ainda na barra/casa inimiga) vale 3. Esta versão não usa o cubo de dobra.<br>' +
        '<br><b>Como jogar:</b> toque num checker brilhante para selecioná-lo e depois no destino destacado.</div>'
    });
  }

  function showSetup() {
    G.tok = {}; G.box.innerHTML = ''; G.phase = 'idle';
    const lv = LEVELS.map(([t, d], i) => h('button', { class: 'opt-card' + (G.level === i ? ' active' : ''), onclick: e => { G.level = i; Core.store.set('gamao.level', i); Core.$$('.opt-card', e.currentTarget.parentNode).forEach(x => x.classList.remove('active')); e.currentTarget.classList.add('active'); } }, h('b', null, t), h('span', null, d)));
    const th = [['classic', 'Madeira'], ['blue', 'Azul'], ['dark', 'Noturno'], ['green', 'Verde']].map(([k, t]) => h('button', { class: 'opt-card' + (G.theme === k ? ' active' : ''), onclick: e => { G.theme = k; Core.store.set('gamao.theme', k); G.box.dataset.gt = k; Core.$$('.opt-card', e.currentTarget.parentNode).forEach(x => x.classList.remove('active')); e.currentTarget.classList.add('active'); } }, h('b', null, t)));
    G.box.append(h('div', { class: 'tr-setup' },
      h('div', { class: 'panel' }, h('h3', null, 'Nível da IA'), h('div', { class: 'opt' }, lv)),
      h('div', { class: 'panel' }, h('h3', null, 'Tabuleiro'), h('div', { class: 'opt' }, th)),
      h('button', { class: 'btn primary lg block', onclick: startGame }, '▶ Jogar'),
      h('button', { class: 'btn block', onclick: showRules }, '📖 Regras')));
  }

  function startGame() {
    G.tok = {}; const tok = G.tok;
    G.st = startState(); G.undo = []; G.sel = null; G.last = null; G.cands = []; G.dice = []; G.avail = [];
    buildUI(); renderBoard();
    runGame(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); });
  }

  function buildUI() {
    G.box.innerHTML = '';
    G.ui = {
      info: h('div', { class: 'g-info' }), boardWrap: h('div', { class: 'g-board' }), dice: h('div', { class: 'g-dice' }),
      msg: h('div', { class: 'g-msg' }), btns: h('div', { class: 'g-btns' })
    };
    G.box.append(G.ui.info, G.ui.boardWrap, G.ui.msg, G.ui.dice, G.ui.btns,
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn sm', onclick: showSetup }, '⚙ Novo jogo'), h('button', { class: 'btn sm', onclick: showRules }, '📖 Regras')));
    G.ui.boardWrap.addEventListener('click', onBoardClick);
  }

  const wait = async ms => { const tok = G.tok; await sleep(ms); if (!G || G.tok !== tok) throw new Abort(); };
  const say = t => { G.msg = t; if (G.ui) G.ui.msg.textContent = t; };
  function humanInput() { const tok = G.tok; return new Promise(res => { G.pending = { res, tok }; }); }
  function resolveHuman(v) { if (G.pending && G.pending.tok === G.tok) { const p = G.pending; G.pending = null; p.res(v); } }
  const rollDie = () => rand(1, 6);

  async function runGame(tok) {
    // lance de abertura
    let a, b;
    say('Lance de abertura: cada um rola um dado…');
    renderInfo();
    await wait(600);
    do { a = rollDie(); b = rollDie(); } while (a === b);
    Core.snd('dice');
    G.dice = [a, b]; G.avail = []; renderDice(true, [a, b]);
    G.turn = a > b ? 0 : 1;
    say(`Você tirou ${a}, a IA tirou ${b}. ${G.turn === 0 ? 'Você começa!' : 'A IA começa!'}`);
    await wait(1700);
    let pre = [a, b];
    while (true) {
      if (G.turn === 0) await humanTurn(pre); else await aiTurn(pre);
      pre = null;
      if (G.st.off[G.turn] === 15) break;
      G.turn ^= 1;
    }
    const w = G.turn, loser = w ^ 1;
    let pts = 1, kind = 'Vitória simples';
    if (G.st.off[loser] === 0) {
      pts = 2; kind = 'Gammon!';
      let back = G.st.bar[loser] > 0;
      const s = loser ? -1 : 1;
      for (let r = 19; r <= 24 && !back; r++) if (G.st.pts[A(loser, r)] * s > 0) back = true;
      if (back) { pts = 3; kind = 'Backgammon!'; }
    }
    G.phase = 'over'; renderBoard(); renderDice(false); G.ui.btns.innerHTML = '';
    Core.snd(w === 0 ? 'win' : 'lose'); if (w === 0) Core.addStat('gamaoWin');
    const v = await Core.modal({
      title: w === 0 ? 'Você venceu! 🏆' : 'A IA venceu 😔', body: `${kind} — <b>${pts}</b> ponto${pts > 1 ? 's' : ''}.`,
      buttons: [{ text: 'Menu', cls: 'ghost', value: 'm' }, { text: 'Jogar de novo', cls: 'primary', value: 'r' }]
    });
    if (!G) return;
    if (v === 'r') startGame(); else Core.go('');
  }

  // ---------------- turno do humano ----------------
  async function humanTurn(preDice) {
    G.phase = 'human'; G.sel = null; G.undo = [];
    renderInfo();
    let dice = preDice;
    if (!dice) {
      G.dice = []; G.avail = [];
      say('Sua vez! Role os dados.');
      G.ui.btns.innerHTML = '';
      G.ui.btns.append(h('button', { class: 'btn primary lg', onclick: () => resolveHuman('roll') }, '🎲 Rolar dados'));
      renderDice(false);
      await humanInput();
      G.ui.btns.innerHTML = '';
      dice = [rollDie(), rollDie()];
      Core.snd('dice'); renderDice(true, dice); await wait(750);
    }
    G.dice = dice;
    G.avail = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice();
    const seqs = genSequences(G.st, 0, dice);
    renderDice(false);
    if (!seqs.length) {
      say('Sem jogadas possíveis. Você passa a vez.');
      renderBoard(); await wait(1700); return;
    }
    G.cands = seqs.map(s => ({ rem: s.moves.slice(), state: s.state }));
    // remove duplicatas óbvias (mesmo conjunto de movimentos)
    const seen = new Set(); G.cands = G.cands.filter(c => { const k = c.rem.map(mkey).sort().join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
    say('Escolha um checker brilhante para mover.');
    renderBoard(); renderButtons();
    while (G.cands[0].rem.length > 0) {
      const act = await humanInput();
      if (act && act.type === 'move') {
        pushUndo();
        const hit = applyMove(G.st, 0, act.m);
        const k = mkey(act.m);
        G.cands = G.cands.map(c => { const i = c.rem.findIndex(x => mkey(x) === k); if (i < 0) return null; const rem = c.rem.slice(); rem.splice(i, 1); return { rem, state: c.state }; }).filter(Boolean);
        const di = G.avail.indexOf(act.m.d); if (di >= 0) G.avail.splice(di, 1);
        G.last = { to: act.m.t, p: 0 }; G.sel = null;
        Core.snd(hit ? 'capture' : (act.m.t === 0 ? 'chip' : 'move'));
        if (hit) say('Você acertou um checker adversário! 💥');
        renderBoard(); renderDice(false); renderButtons(); renderInfo();
        if (G.st.off[0] === 15) return;
        if (G.cands[0].rem.length === 0) break;
      } else if (act && act.type === 'undo') {
        doUndo();
      }
    }
    G.ui.btns.innerHTML = ''; G.sel = null; renderBoard();
    await wait(500);
  }
  function pushUndo() { G.undo.push({ st: clone(G.st), cands: G.cands, avail: G.avail.slice(), last: G.last }); }
  function doUndo() {
    const u = G.undo.pop(); if (!u) return;
    G.st = u.st; G.cands = u.cands; G.avail = u.avail; G.last = u.last; G.sel = null;
    Core.snd('select'); renderBoard(); renderDice(false); renderButtons(); renderInfo();
  }
  function renderButtons() {
    G.ui.btns.innerHTML = '';
    if (G.phase !== 'human' || !G.cands.length) return;
    G.ui.btns.append(
      h('button', { class: 'btn' + (G.undo.length ? '' : ' disabled'), onclick: () => resolveHuman({ type: 'undo' }) }, '↶ Desfazer'),
      h('button', { class: 'btn', onclick: hint }, '💡 Dica'));
  }
  function hint() {
    if (G.phase !== 'human' || !G.cands.length) return;
    let best = null, bv = -1e9;
    for (const c of G.cands) { const v = evaluate(c.state, 0); if (v > bv) { bv = v; best = c; } }
    const legal = firstMoves();
    const m = best.rem.find(x => legal.has(mkey(x)));
    if (m) { G.sel = m.f; say(`Dica: mova de ${m.f === 25 ? 'barra' : m.f} para ${m.t === 0 ? 'fora' : m.t}.`); renderBoard(); }
  }
  /** movimentos que podem ser jogados agora (interseção entre legais e candidatos) */
  function firstMoves() {
    const map = new Map();
    for (const c of G.cands) for (const m of c.rem) {
      const k = mkey(m);
      if (!map.has(k) && singleMoves(G.st, 0, m.d).some(x => mkey(x) === k)) map.set(k, m);
    }
    return map;
  }

  function onBoardClick(e) {
    if (G.phase !== 'human' || !G.cands.length || !G.pending) return;
    const el = e.target.closest('[data-pt]'); if (!el) return;
    const q = +el.dataset.pt;
    const fm = firstMoves();
    const moves = Array.from(fm.values());
    const sources = new Set(moves.map(m => m.f));
    const fromSel = G.sel != null ? moves.filter(m => m.f === G.sel) : [];
    const dest = fromSel.filter(m => m.t === q);
    if (dest.length) {
      const m = dest.sort((a, b) => a.d - b.d)[0];
      resolveHuman({ type: 'move', m }); return;
    }
    if (sources.has(q) && G.sel !== q) { G.sel = q; Core.snd('select'); renderBoard(); return; }
    if (G.sel === null) {
      // toque direto no destino quando só há uma origem possível
      const dm = moves.filter(m => m.t === q);
      const fs = new Set(dm.map(m => m.f));
      if (dm.length && fs.size === 1) { resolveHuman({ type: 'move', m: dm.sort((a, b) => a.d - b.d)[0] }); return; }
    }
    G.sel = null; renderBoard();
  }

  // ---------------- turno da IA ----------------
  async function aiTurn(preDice) {
    G.phase = 'ai'; G.sel = null; G.ui.btns.innerHTML = ''; renderInfo();
    let dice = preDice;
    if (!dice) {
      G.dice = []; G.avail = [];
      say('A IA está rolando os dados…'); renderDice(false); await wait(800);
      dice = [rollDie(), rollDie()]; Core.snd('dice'); renderDice(true, dice); await wait(800);
    }
    G.dice = dice; G.avail = dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : dice.slice(); renderDice(false);
    const seqs = genSequences(G.st, 1, dice);
    if (!seqs.length) { say('A IA não tem jogadas e passa a vez.'); await wait(1600); return; }
    say('A IA está pensando…'); await wait(450);
    const best = await aiPick(seqs);
    for (const m of best.moves) {
      const hit = applyMove(G.st, 1, m);
      const di = G.avail.indexOf(m.d); if (di >= 0) G.avail.splice(di, 1);
      G.last = { to: m.t, p: 1, from: m.f };
      Core.snd(hit ? 'capture' : (m.t === 0 ? 'chip' : 'move'));
      if (hit) say('A IA acertou um dos seus checkers! 💥'); else say(`A IA move ${m.f === 25 ? 'da barra' : m.f} → ${m.t === 0 ? 'fora' : m.t}`);
      renderBoard(); renderDice(false); renderInfo();
      await wait(650);
    }
  }
  async function aiPick(seqs) {
    const map = new Map();
    for (const s of seqs) { const k = stateKey(s.state); if (!map.has(k)) map.set(k, s); }
    const uniq = Array.from(map.values());
    if (uniq.length === 1) return uniq[0];
    const lv = G.level;
    if (lv === 0 && Math.random() < .25) return pick(uniq);
    const scored = uniq.map(s => ({ s, v: evaluate(s.state, 1) }));
    if (lv === 0) scored.forEach(x => { x.v += (Math.random() - .5) * 45; });
    else if (lv === 1) scored.forEach(x => { x.v += (Math.random() - .5) * 7; });
    scored.sort((a, b) => b.v - a.v);
    if (lv === 2) {
      const top = scored.slice(0, 6);
      for (const x of top) { x.v2 = await lookahead(x.s.state, 1); await sleep(0); if (!G) throw new Abort(); }
      top.sort((a, b) => b.v2 - a.v2); return top[0].s;
    }
    return scored[0].s;
  }

  // ---------------- renderização ----------------
  function renderInfo() {
    if (!G.ui) return;
    const you = pips(G.st, 0), ai = pips(G.st, 1);
    G.ui.info.innerHTML =
      `<div class="gi you ${G.turn === 0 && G.phase === 'human' ? 'on' : ''}"><span class="dot c0"></span><b>Você</b><small>${you} pips · fora ${G.st.off[0]}</small></div>` +
      `<div class="gi ai ${G.phase === 'ai' ? 'on' : ''}"><span class="dot c1"></span><b>IA ${LEVELS[G.level][0]}</b><small>${ai} pips · fora ${G.st.off[1]}</small></div>`;
  }
  function dieEl(v, used, rolling) {
    const pat = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[v];
    const d = h('div', { class: 'die' + (used ? ' used' : '') + (rolling ? ' rolling' : '') });
    for (let i = 0; i < 9; i++) d.append(h('i', { class: pat.includes(i) ? 'on' : '' }));
    return d;
  }
  function renderDice(rolling, show) {
    if (!G.ui) return;
    G.ui.dice.innerHTML = '';
    if (show) { show.forEach(v => G.ui.dice.append(dieEl(v, false, rolling))); return; }
    const d = G.dice; if (!d || !d.length) return;
    if (d[0] === d[1]) { for (let i = 0; i < 4; i++) G.ui.dice.append(dieEl(d[0], i >= G.avail.length, false)); return; }
    const av = G.avail.slice();
    d.forEach(v => { const i = av.indexOf(v); const used = i < 0; if (!used) av.splice(i, 1); G.ui.dice.append(dieEl(v, used, false)); });
  }

  function renderBoard() {
    if (!G || !G.ui) return;
    const P = G.portrait, W = 1040, Hh = 720;
    const st = G.st;
    const fm = (G.phase === 'human' && G.cands.length && G.cands[0].rem.length) ? Array.from(firstMoves().values()) : [];
    const sources = new Set(fm.map(m => m.f));
    const dests = new Set(G.sel != null ? fm.filter(m => m.f === G.sel).map(m => m.t) : []);
    const colX = c => 20 + c * 70 + (c >= 6 ? 60 : 0);
    const ptCol = p => (p <= 12 ? 12 - p : p - 13);
    const isTop = p => p >= 13;
    const unrot = (cx, cy, inner) => `<g transform="translate(${cx} ${cy})"><g${P ? ' transform="matrix(0,1,1,0,0,0)"' : ''}>${inner}</g></g>`;
    let s = `<svg viewBox="0 0 ${P ? Hh : W} ${P ? W : Hh}" preserveAspectRatio="xMidYMid meet"><defs>
      <radialGradient id="gmW" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#ece4d0"/><stop offset="1" stop-color="#b9ae92"/></radialGradient>
      <radialGradient id="gmB" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#8a5a5a"/><stop offset=".55" stop-color="#3d1d1d"/><stop offset="1" stop-color="#150808"/></radialGradient></defs>
      <g${P ? ' transform="matrix(0,1,1,0,0,0)"' : ''}>
      <rect class="gm-frame" x="0" y="0" width="${W}" height="${Hh}" rx="22"/>
      <rect class="gm-bg" x="20" y="20" width="400" height="680" rx="0" style="display:none"/>
      <rect class="gm-bg" x="20" y="20" width="420" height="680"/><rect class="gm-bg" x="500" y="20" width="420" height="680"/>
      <rect class="gm-bar" x="440" y="0" width="60" height="${Hh}"/>
      <rect class="gm-tray" x="930" y="20" width="90" height="680" rx="6"/>`;
    // triângulos
    for (let p = 1; p <= 24; p++) {
      const c = ptCol(p), x = colX(c), top = isTop(p), xc = x + 35;
      const pts = top ? `${x},20 ${x + 70},20 ${xc},320` : `${x},700 ${x + 70},700 ${xc},400`;
      const dest = dests.has(p);
      s += `<polygon class="tri ${(p % 2) ? 'tri-a' : 'tri-b'}${dest ? ' dest' : ''}" points="${pts}" data-pt="${p}"/>`;
      s += `<rect class="hit" x="${x}" y="${top ? 20 : 400}" width="70" height="300" data-pt="${p}"/>`;
      const label = p;
      s += unrot(xc, top ? 11 : 711, `<text class="pnum" text-anchor="middle" dominant-baseline="middle">${label}</text>`);
    }
    // checkers nos pontos
    const R_ = 31;
    for (let p = 1; p <= 24; p++) {
      const v = st.pts[p]; if (!v) continue;
      const pl = v > 0 ? 0 : 1, n = Math.abs(v), c = ptCol(p), xc = colX(c) + 35, top = isTop(p);
      const sp = n <= 5 ? 62 : Math.min(62, (290 - 62) / (n - 1));
      for (let i = 0; i < n; i++) {
        const cy = top ? 20 + R_ + i * sp + 1 : 700 - R_ - i * sp - 1;
        const isTopChecker = i === n - 1;
        const cls = `ck c${pl}${isTopChecker && pl === 0 && sources.has(p) ? ' src' : ''}${isTopChecker && G.sel === p ? ' sel' : ''}${isTopChecker && G.last && G.last.to === p && G.last.p === pl ? ' last' : ''}`;
        s += `<circle class="${cls}" cx="${xc}" cy="${cy}" r="${R_ - 2}" data-pt="${p}"/><circle class="ring" cx="${xc}" cy="${cy}" r="${R_ - 11}"/>`;
        if (isTopChecker && n > 5) s += unrot(xc, cy, `<text class="cnt cnt${pl}" text-anchor="middle" dominant-baseline="central">${n}</text>`);
      }
      if (dests.has(p)) {
        const cy = top ? 20 + R_ + n * sp : 700 - R_ - n * sp;
        s += `<circle class="ghost" cx="${xc}" cy="${Math.max(50, Math.min(670, cy))}" r="${R_ - 8}" data-pt="${p}"/>`;
      }
    }
    // barra
    s += `<rect class="hit" x="440" y="400" width="60" height="300" data-pt="25"/>`;
    for (let i = 0; i < st.bar[0]; i++) {
      const cy = 440 + i * 62, top = i === st.bar[0] - 1;
      s += `<circle class="ck c0${top && sources.has(25) ? ' src' : ''}${top && G.sel === 25 ? ' sel' : ''}" cx="470" cy="${cy}" r="29" data-pt="25"/><circle class="ring" cx="470" cy="${cy}" r="20"/>`;
    }
    for (let i = 0; i < st.bar[1]; i++) {
      const cy = 280 - i * 62;
      s += `<circle class="ck c1" cx="470" cy="${cy}" r="29"/><circle class="ring" cx="470" cy="${cy}" r="20"/>`;
    }
    s += unrot(470, 360, `<text class="pnum big" text-anchor="middle" dominant-baseline="middle">BAR</text>`);
    // bandeja (fora)
    const offDest = dests.has(0);
    s += `<rect class="tray-hit${offDest ? ' dest' : ''}" x="930" y="400" width="90" height="300" rx="6" data-pt="0"/>`;
    for (let i = 0; i < st.off[0]; i++) s += `<rect class="offck c0" x="938" y="${686 - i * 19}" width="74" height="15" rx="4"/>`;
    for (let i = 0; i < st.off[1]; i++) s += `<rect class="offck c1" x="938" y="${24 + i * 19}" width="74" height="15" rx="4"/>`;
    if (offDest) s += unrot(975, 550, `<text class="pnum big on" text-anchor="middle" dominant-baseline="middle">TIRAR</text>`);
    s += '</g></svg>';
    G.ui.boardWrap.innerHTML = s;
    G.ui.boardWrap.classList.toggle('portrait', P);
  }

  Core.register('gamao', { mount, unmount });
  window.GamaoEngine = { genSequences, startState, evaluate, applyMove, singleMoves, pips };
})();
