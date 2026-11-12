/* ============================================================
   DETETIVE — Mistério em Blackwood
   Jogo de dedução (2 a 6 jogadores): descubra QUEM matou, COM QUE e ONDE.
   Contra IAs ou online com amigos (anfitrião roda o jogo).
   ============================================================ */
(function () {
  'use strict';
  const { h, sleep, rand, pick, shuffle } = Core;
  class Abort extends Error { }

  // ---------------- dados ----------------
  const SUSP = [
    { n: 'Srta. Rubi', ic: '👩‍🎤', c: '#e04646', ab: 'spot', abn: 'Holofote', abd: 'Escolha quem deve refutar primeiro o seu próximo palpite.' },
    { n: 'Cel. Âmbar', ic: '🎖️', c: '#f3b63e', ab: 'march', abn: 'Marcha forçada', abd: '+6 no seu movimento neste turno (use antes de rolar).' },
    { n: 'Sra. Pérola', ic: '👵', c: '#e8e6df', ab: 'key', abn: 'Chave-mestra', abd: 'Vá direto a qualquer cômodo, sem rolar os dados.' },
    { n: 'Sr. Jade', ic: '🤵', c: '#3fae5a', ab: 'ear', abn: 'Ouvido na porta', abd: 'Espie, em segredo, uma carta aleatória da mão de um jogador.' },
    { n: 'Dra. Safira', ic: '🩺', c: '#4a7be0', ab: 'lab', abn: 'Laudo pericial', abd: 'Escolha 3 cartas da mesma categoria: descubra se uma delas está no envelope.' },
    { n: 'Prof. Ametista', ic: '🎓', c: '#a56bd9', ab: 'mind', abn: 'Dedução', abd: 'Descubra uma carta que NÃO está no envelope e que você ainda não conhecia.' }
  ];
  const WEAP = [{ n: 'Castiçal', ic: '🕯️' }, { n: 'Punhal', ic: '🗡️' }, { n: 'Revólver', ic: '🔫' }, { n: 'Corda', ic: '🪢' }, { n: 'Veneno', ic: '🧪' }, { n: 'Drone', ic: '🚁' }];
  const ROOMS = [{ n: 'Estufa', ic: '🪴' }, { n: 'Biblioteca', ic: '📚' }, { n: 'Escritório', ic: '🖋️' }, { n: 'Sala de Estar', ic: '🛋️' }, { n: 'Hall', ic: '🚪' }, { n: 'Sala de Jantar', ic: '🍽️' }, { n: 'Salão de Baile', ic: '💃' }, { n: 'Cozinha', ic: '🍳' }, { n: 'Sala de Cinema', ic: '🎬' }];
  const cardName = c => (c < 6 ? SUSP[c].n : c < 12 ? WEAP[c - 6].n : ROOMS[c - 12].n);
  const cardIc = c => (c < 6 ? SUSP[c].ic : c < 12 ? WEAP[c - 6].ic : ROOMS[c - 12].ic);
  const catOf = c => (c < 6 ? 0 : c < 12 ? 1 : 2);
  const CATS = [[0, 1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11], [12, 13, 14, 15, 16, 17, 18, 19, 20]];
  const CATN = ['Suspeitos', 'Armas', 'Cômodos'];
  const SUS_START = [6, 5, 7, 4, 0, 1];
  const PERSONAS = [{ aggr: .3, bluff: .2 }, { aggr: .6, bluff: .1 }, { aggr: .45, bluff: .3 }, { aggr: .75, bluff: .05 }, { aggr: .5, bluff: .15 }];
  const AINAMES = ['Inspetor Dias', 'Detetive Luna', 'Agente Kaito', 'Perita Íris', 'Repórter Nico'];

  // mapa: grade 3x3, corredores custam 2; passagens secretas custam 1 (0↔8 e 2↔6)
  const ADJ = Array.from({ length: 9 }, () => []);
  const edge = (a, b, w) => { ADJ[a].push([b, w]); ADJ[b].push([a, w]); };
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const i = r * 3 + c; if (c < 2) edge(i, i + 1, 2); if (r < 2) edge(i, i + 3, 2); }
  edge(0, 8, 1); edge(2, 6, 1);
  function dists(from) {
    const d = Array(9).fill(Infinity); d[from] = 0; const q = [from];
    while (q.length) { q.sort((a, b) => d[a] - d[b]); const u = q.shift(); ADJ[u].forEach(([v, w]) => { if (d[u] + w < d[v]) { d[v] = d[u] + w; q.push(v); } }); }
    return d;
  }

  const EVENTS = [
    { id: 'tip', tx: '📩 Mensagem anônima: uma carta que NÃO está no envelope foi revelada só para quem sacou.' },
    { id: 'shortcut', tx: '⚡ Atalho pelos corredores: +4 no movimento de quem sacou.' },
    { id: 'elevator', tx: '🛗 Elevador secreto: quem sacou vai a qualquer cômodo sem rolar os dados.' },
    { id: 'informant', tx: '🕵️ O informante: um jogador responde, em segredo, se tem uma carta que quem sacou ainda não conhece.' },
    { id: 'overtime', tx: '⏱️ Hora extra: quem sacou pode fazer um segundo palpite neste turno.' },
    { id: 'blackout', tx: '🔌 Apagão! O próximo jogador não poderá fazer palpites no turno dele.' },
    { id: 'leak', tx: '📣 Vazamento: um jogador aleatório mostra a todos uma de suas cartas.' }
  ];

  let G = null;   // estado da tela
  let D = null;   // motor do jogo (anfitrião / offline)

  // ================== INTELIGÊNCIA (base de conhecimento) ==================
  class KB {
    constructor(me, hand, N, hs, skill) {
      this.me = me; this.N = N; this.E = N; this.skill = skill; this.hs = hs; this.cons = []; this.envSets = []; this.poss = [];
      for (let c = 0; c < 21; c++) {
        const s = new Set();
        if (hand.includes(c)) s.add(me); else { for (let p = 0; p < N; p++) if (p !== me) s.add(p); s.add(N); }
        this.poss.push(s);
      }
      this.propagate();
    }
    setHolder(c, p) { this.poss[c] = new Set([p]); }
    remove(c, p) { if (this.poss[c].size > 1 || !this.poss[c].has(p)) this.poss[c].delete(p); if (!this.poss[c].size) this.poss[c].add(this.E); }
    cands(cat) { return CATS[cat].filter(c => this.poss[c].has(this.E)); }
    solved() { const r = [0, 1, 2].map(k => this.cands(k)); return r.every(a => a.length === 1) ? r.map(a => a[0]) : null; }
    propagate() {
      let ch = true, guard = 0;
      while (ch && guard++ < 40) {
        ch = false;
        for (const k of this.cons) {
          if (k.done) continue;
          const cand = k.set.filter(c => this.poss[c].has(k.p));
          if (cand.length === 1) { if (this.poss[cand[0]].size > 1) { this.poss[cand[0]] = new Set([k.p]); ch = true; } k.done = true; }
        }
        if (this.skill > 0) {
          for (let p = 0; p < this.N; p++) {
            if (p === this.me) continue;
            let fixed = 0; const maybe = [];
            for (let c = 0; c < 21; c++) if (this.poss[c].has(p)) { if (this.poss[c].size === 1) fixed++; else maybe.push(c); }
            if (fixed >= this.hs[p]) maybe.forEach(c => { this.poss[c].delete(p); ch = true; });
            else if (this.skill >= 2 && fixed + maybe.length === this.hs[p]) maybe.forEach(c => { this.poss[c] = new Set([p]); ch = true; });
          }
          for (const cat of CATS) {
            const cand = cat.filter(c => this.poss[c].has(this.E));
            if (cand.length === 1 && this.poss[cand[0]].size > 1) { this.poss[cand[0]] = new Set([this.E]); ch = true; }
            const fe = cat.find(c => this.poss[c].size === 1 && this.poss[c].has(this.E));
            if (fe != null) cat.forEach(c => { if (c !== fe && this.poss[c].has(this.E)) { this.poss[c].delete(this.E); ch = true; } });
          }
          for (const s of this.envSets) { const cand = s.filter(c => this.poss[c].has(this.E)); if (cand.length === 1 && this.poss[cand[0]].size > 1) { this.poss[cand[0]] = new Set([this.E]); ch = true; } }
        }
        for (let c = 0; c < 21; c++) if (!this.poss[c].size) this.poss[c].add(this.E);
      }
    }
  }

  // ================== ESTADO E MOTOR (anfitrião) ==================
  const alive = () => D.players.filter(p => !p.elim);
  const roomOf = p => D.sr[p.suspect];
  const setRoom = (p, r) => { D.sr[p.suspect] = r; };
  const wait = async ms => { const tok = G.tok; await sleep(ms * G.speed); if (!G || G.tok !== tok) throw new Abort(); };

  function newGame(cfg) {
    const N = cfg.N, order = shuffle([0, 1, 2, 3, 4, 5].filter(s => s !== cfg.mySus));
    const players = [];
    for (let i = 0; i < N; i++) {
      const isHost = i === 0 && !cfg.spectator;
      const remote = cfg.remotes && cfg.remotes[i];
      const suspect = isHost ? cfg.mySus : order.pop();
      const ai = !isHost && !remote;
      const persona = ai ? PERSONAS[i % PERSONAS.length] : null;
      players.push({
        id: i, suspect, kind: isHost ? 'local' : remote ? 'remote' : 'ai', uid: remote ? remote.uid : (isHost ? cfg.hostUid || '' : ''),
        name: isHost ? Core.settings.name : remote ? remote.name : AINAMES[i % AINAMES.length], emoji: SUSP[suspect].ic,
        hand: [], elim: false, ab: { used: false }, ai: persona
      });
    }
    const all = shuffle(Array.from({ length: 21 }, (_, i) => i));
    const env = [pick(CATS[0]), pick(CATS[1]), pick(CATS[2])];
    const rest = shuffle(all.filter(c => !env.includes(c)));
    let k = rand(0, N - 1);
    rest.forEach(c => { players[k % N].hand.push(c); k++; });
    D = {
      N, players, env, sr: SUS_START.slice(), wr: shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 6), cur: 0, round: 1, dice: null, phase: 'wait', bonus: 0,
      sugLeft: 1, spot: -1, blackout: -1, evs: [], evId: 0, noteId: 0, ask: null, askId: 0, over: null, meIdx: cfg.spectator ? -1 : 0,
      priv: players.map(p => ({ hand: p.hand.slice().sort((a, b) => a - b), seen: {}, nots: [], out: [], note: null })), skill: cfg.skill
    };
    const hs = players.map(p => p.hand.length);
    players.forEach(p => { p.kb = new KB(p.id, p.hand, N, hs, cfg.skill < 1 ? 0 : (cfg.skill > 1 ? 2 : 1)); });
    return D;
  }
  function pushEv(ev) {
    ev.id = ++D.evId; D.evs.push(ev); if (D.evs.length > 60) D.evs.shift();
    G.lastTxt = ev.t || G.lastTxt;
  }
  const say = t => pushEv({ k: 'txt', t });
  function giveNote(p, text, patch) {
    const pr = D.priv[p.id]; if (patch) patch(pr);
    pr.note = { id: ++D.noteId, text };
    if (p.kind === 'remote') syncPriv(p);
  }

  async function runEngine(tok) {
    refresh(); await wait(600);
    say('O crime aconteceu! Descubra quem, com o quê e onde.');
    while (!D.over) {
      const p = D.players[D.cur];
      if (!p.elim) await takeTurn(p);
      if (D.over) break;
      if (alive().length === 1) { const w = alive()[0]; D.over = { winner: w.id, env: D.env, reason: 'elim' }; break; }
      const prev = D.cur;
      do { D.cur = (D.cur + 1) % D.N; } while (D.players[D.cur].elim);
      if (D.cur <= prev) D.round++;
    }
    D.phase = 'over'; D.ask = null; refresh();
    if (G.online) await pubNow();
    await endGameLocal();
  }

  // ---- perguntar a um jogador (local, IA ou remoto) ----
  async function ask(p, kind, data) {
    D.ask = { id: ++D.askId, seat: p.id, kind, data }; D.phase = kind;
    refresh();
    let res;
    if (p.kind === 'local') res = await localAsk();
    else if (p.kind === 'remote') res = await remoteAsk(p);
    else { await wait(kind === 'show' ? 500 : 750); res = aiAnswer(p, kind, data); }
    D.ask = null;
    return res || {};
  }
  function localAsk() { return new Promise(res => { G.pend = res; }); }

  async function takeTurn(p) {
    D.bonus = 0; D.sugLeft = 1; D.spot = -1; D.dice = null;
    const noSug = D.blackout === p.id; if (noSug) D.blackout = -1; D.noSug = noSug;
    D.cur = p.id; say(`🎯 Vez de ${p.name} (${SUSP[p.suspect].n}).`); refresh(); await wait(450);
    let tele = false;
    if (Math.random() < .35) { const e = await drawEvent(p); if (e === 'elevator') tele = true; }
    if (D.over) return;
    for (let g0 = 0; !tele && g0 < 6; g0++) {
      const a = await ask(p, 'roll', { canAb: canAb(p, 'pre') });
      if (a.type === 'accuse') { await accuse(p, a); if (D.over || p.elim) return; continue; }
      if (a.type === 'ability') { const r = await useAbility(p, a); if (r && r.tele) tele = true; continue; }
      break;
    }
    let reach;
    if (tele) { reach = ROOMS.map((_, i) => [i, 0]); D.dice = null; }
    else {
      D.dice = [rand(1, 6), rand(1, 6)]; Core.snd('dice');
      const total = D.dice[0] + D.dice[1] + D.bonus, d = dists(roomOf(p));
      reach = []; d.forEach((c, i) => { if (c <= total) reach.push([i, c]); });
      say(`🎲 ${p.name} tirou ${D.dice[0]} + ${D.dice[1]}${D.bonus ? ' +' + D.bonus : ''} = ${total}.`); refresh(); await wait(700);
    }
    const m = await ask(p, 'move', { reach, dice: D.dice, bonus: D.bonus });
    const dest = (m.type === 'move' && reach.some(x => x[0] === m.a)) ? m.a : roomOf(p);
    if (dest !== roomOf(p)) { setRoom(p, dest); say(`🚶 ${p.name} vai para ${ROOMS[dest].n}.`); Core.snd('move'); refresh(); await wait(550); }
    else say(`${p.name} fica em ${ROOMS[dest].n}.`);
    for (let guard = 0; guard < 12; guard++) {
      const a = await ask(p, 'act', { canSug: D.sugLeft > 0 && !D.noSug, noSug: D.noSug, canAb: canAb(p, 'act'), room: roomOf(p) });
      if (a.type === 'suggest') { if (D.sugLeft > 0 && !D.noSug) { D.sugLeft--; await suggest(p, a.a, a.b); } continue; }
      if (a.type === 'accuse') { await accuse(p, a); if (D.over || p.elim) return; continue; }
      if (a.type === 'ability') { await useAbility(p, a); continue; }
      break;
    }
    D.ask = null;
  }

  function canAb(p, when) {
    if (p.ab.used) return false;
    const k = SUSP[p.suspect].ab;
    if (k === 'march' || k === 'key') return when === 'pre';
    if (k === 'spot') return when === 'act' && D.sugLeft > 0 && !D.noSug;
    return true;
  }

  // ---- palpite e refutação ----
  async function suggest(p, s, w) {
    const r = roomOf(p) + 12; s = s | 0; w = w | 0;
    if (catOf(s) !== 0 || catOf(w) !== 1) return;
    const sp = D.players.find(q => q.suspect === s);
    D.sr[s] = r - 12; D.wr[w - 6] = r - 12;
    if (sp && sp.id !== p.id) say(`${sp.name} foi chamado(a) ao ${ROOMS[r - 12].n}.`);
    say(`🔎 ${p.name} palpita: ${cardName(s)}, ${cardName(w)}, em ${ROOMS[r - 12].n}.`); Core.snd('card'); refresh(); await wait(900);
    // ordem de refutação (Holofote muda quem começa)
    let order = []; for (let k = 1; k < D.N; k++) order.push(D.players[(p.id + k) % D.N]);
    if (D.spot >= 0) { const i = order.findIndex(q => q.id === D.spot); if (i > 0) order = order.slice(i).concat(order.slice(0, i)); D.spot = -1; }
    const passed = []; let shown = -1, card = -1;
    for (const q of order) {
      const match = q.hand.filter(c => c === s || c === w || c === r);
      if (!match.length) { passed.push(q.id); say(`${q.name} não tem nenhuma das cartas.`); refresh(); await wait(450); continue; }
      let c = match[0];
      if (match.length > 1) { const a = await ask(q, 'show', { cards: match, to: p.id, sw: [s, w, r] }); c = match.includes(a.a) ? a.a : aiShowChoice(q, match, p); }
      shown = q.id; card = c; break;
    }
    const ev = { k: 'sug', by: p.id, s, w, r, passed, shown, t: shown >= 0 ? `↪ ${D.players[shown].name} mostrou uma carta a ${p.name}.` : '↪ Ninguém conseguiu refutar o palpite!' };
    ev.card = card; pushEv(ev);
    // conhecimento
    D.players.forEach(q => {
      passed.forEach(x => { if (x !== q.id) [s, w, r].forEach(c => q.kb.remove(c, x)); });
      if (shown >= 0) { if (q.id === p.id) q.kb.setHolder(card, shown); else if (q.id !== shown) q.kb.cons.push({ p: shown, set: [s, w, r] }); }
      q.kb.propagate();
    });
    if (shown >= 0) {
      const sh = D.players[shown];
      giveNote(p, `${sh.name} mostrou: ${cardIc(card)} ${cardName(card)}`, pr => { pr.seen[card] = shown; });
      D.players.forEach(q => { if (q.id === p.id) q.kb.setHolder(card, shown); });
      D.players[p.id].kb.propagate();
    } else giveNote(p, 'Ninguém mostrou carta alguma. Cuidado: as cartas podem estar no envelope… ou na sua mão.');
    if (passed.length) D.priv[p.id].nots = D.priv[p.id].nots;   // (nots derivados dos eventos públicos)
    Core.snd(shown >= 0 ? 'chip' : 'knock'); refresh(); await wait(900);
  }
  function aiShowChoice(q, match, p) {
    const seenBefore = D.evs.filter(e => e.k === 'sug' && e.shown === q.id && e.by === p.id && e.card >= 0).map(e => e.card);
    const prev = match.find(c => seenBefore.includes(c)); return prev != null ? prev : pick(match);
  }

  // ---- acusação final ----
  async function accuse(p, a) {
    const s = a.a | 0, w = a.b | 0, r = a.c | 0;
    if (catOf(s) !== 0 || catOf(w) !== 1 || catOf(r) !== 2) return;
    say(`⚖️ ${p.name} ACUSA: ${cardName(s)}, ${cardName(w)}, ${cardName(r)}!`); Core.snd('shout'); refresh(); await wait(1500);
    const ok = D.env[0] === s && D.env[1] === w && D.env[2] === r;
    pushEv({ k: 'acc', by: p.id, s, w, r, ok: ok ? 1 : 0, t: ok ? `✅ ${p.name} acertou e resolveu o caso!` : `❌ ${p.name} errou e está eliminado(a)! As cartas continuam em jogo.` });
    if (ok) { D.over = { winner: p.id, env: D.env, reason: 'solved' }; }
    else { p.elim = true; Core.snd('lose'); }
    refresh(); await wait(1200);
  }

  // ---- habilidades ----
  async function useAbility(p, a) {
    const k = SUSP[p.suspect].ab; if (p.ab.used) return {};
    const pr = D.priv[p.id], kb = p.kb;
    if (k === 'spot') { const t = D.players[a.a | 0]; if (!t || t.id === p.id) return {}; D.spot = t.id; say(`🔦 ${p.name} usa Holofote: ${t.name} refuta primeiro.`); }
    else if (k === 'march') { D.bonus += 6; say(`🪖 ${p.name} usa Marcha forçada: +6 no movimento!`); }
    else if (k === 'key') { say(`🗝️ ${p.name} usa a Chave-mestra e vai a qualquer cômodo.`); p.ab.used = true; refresh(); await wait(400); return { tele: true }; }
    else if (k === 'ear') {
      const t = D.players[a.a | 0]; if (!t || t.id === p.id || !t.hand.length) return {};
      const c = pick(t.hand); say(`👂 ${p.name} usa Ouvido na porta em ${t.name}.`);
      giveNote(p, `Você ouviu: ${t.name} tem ${cardIc(c)} ${cardName(c)}.`, x => { x.seen[c] = t.id; }); kb.setHolder(c, t.id); kb.propagate();
    } else if (k === 'lab') {
      const set = [a.a | 0, a.b | 0, a.c | 0]; if (new Set(set).size !== 3 || new Set(set.map(catOf)).size !== 1) return {};
      const n = set.filter(c => D.env.includes(c)).length; say(`🧪 ${p.name} pede um Laudo pericial.`);
      giveNote(p, `Laudo: entre ${set.map(c => cardIc(c) + ' ' + cardName(c)).join(', ')}, ${n ? 'UMA está' : 'NENHUMA está'} no envelope.`, x => { if (!n) set.forEach(c => { if (!x.out.includes(c)) x.out.push(c); }); });
      if (!n) set.forEach(c => kb.remove(c, kb.E)); else kb.envSets.push(set); kb.propagate();
    } else if (k === 'mind') { await giveInnocent(p, 'Dedução'); }
    p.ab.used = true; refresh(); await wait(500); return {};
  }
  async function giveInnocent(p, src) {
    const pr = D.priv[p.id];
    const pool = Array.from({ length: 21 }, (_, i) => i).filter(c => !D.env.includes(c) && !p.hand.includes(c) && !pr.out.includes(c) && pr.seen[c] == null);
    if (!pool.length) { giveNote(p, `${src}: nada novo a descobrir.`); return; }
    const c = pick(pool); say(`🧠 ${p.name} recebe uma pista (${src}).`);
    giveNote(p, `${src}: ${cardIc(c)} ${cardName(c)} NÃO está no envelope.`, x => { x.out.push(c); }); p.kb.remove(c, p.kb.E); p.kb.propagate();
  }

  // ---- eventos da noite ----
  async function drawEvent(p) {
    const e = pick(EVENTS); say(`🃏 EVENTO — ${e.tx}`); Core.snd('card'); refresh(); await wait(1500);
    if (e.id === 'tip') await giveInnocent(p, 'Mensagem anônima');
    else if (e.id === 'shortcut') D.bonus += 4;
    else if (e.id === 'overtime') D.sugLeft = 2;
    else if (e.id === 'blackout') { let q = D.cur; do { q = (q + 1) % D.N; } while (D.players[q].elim && q !== D.cur); if (q !== D.cur) { D.blackout = q; say(`🔌 ${D.players[q].name} ficará sem palpites no próximo turno.`); } }
    else if (e.id === 'informant') {
      const pr = D.priv[p.id], others = alive().filter(q => q.id !== p.id);
      const pool = Array.from({ length: 21 }, (_, i) => i).filter(c => !p.hand.includes(c) && pr.seen[c] == null && !pr.out.includes(c));
      if (others.length && pool.length) {
        const q = pick(others), c = pick(pool), has = q.hand.includes(c);
        giveNote(p, `Informante: ${q.name} ${has ? 'TEM' : 'NÃO tem'} ${cardIc(c)} ${cardName(c)}.`, x => { if (has) x.seen[c] = q.id; else x.nots.push([c, q.id]); });
        if (has) p.kb.setHolder(c, q.id); else p.kb.remove(c, q.id); p.kb.propagate();
      }
    } else if (e.id === 'leak') {
      const cand = alive().filter(q => q.hand.length);
      if (cand.length) { const q = pick(cand), c = pick(q.hand); pushEv({ k: 'leak', by: q.id, card: c, t: `📣 ${q.name} mostrou ${cardIc(c)} ${cardName(c)} a todos.` }); D.players.forEach(x => { if (x.id !== q.id) { x.kb.setHolder(c, q.id); x.kb.propagate(); } }); }
    }
    refresh(); await wait(500);
    return e.id;
  }

  // ================== IA ==================
  function aiAnswer(p, kind, data) {
    const kb = p.kb;
    if (kind === 'show') return { a: aiShowChoice(p, data.cards, D.players[data.to]) };
    if (kind === 'roll') {
      const sol = kb.solved(); if (sol) return { type: 'accuse', a: sol[0], b: sol[1], c: sol[2] };
      const r = aiRisk(p); if (r) return r;
      const ab = aiAbility(p, 'pre'); if (ab) return ab;
      return { type: 'roll' };
    }
    if (kind === 'move') {
      const here = roomOf(p), cr = kb.cands(2);
      let best = null, bs = -1e9;
      data.reach.forEach(([room, cost]) => {
        let sc = (cr.includes(room + 12) ? 5 : 0) + (kb.poss[room + 12].size > 1 ? 1 : 0) - cost * .18 + Math.random() * (D.skill < 1 ? 4 : .9);
        if (room === here) sc -= 1.2; if (best === null || sc > bs) { bs = sc; best = room; }
      });
      return { type: 'move', a: best == null ? here : best };
    }
    if (kind === 'act') {
      const sol = kb.solved(); if (sol) return { type: 'accuse', a: sol[0], b: sol[1], c: sol[2] };
      const r = aiRisk(p); if (r) return r;
      if (data.canAb && Math.random() < .5) { const ab = aiAbility(p, 'act'); if (ab) return ab; }
      if (data.canSug) { const [s, w] = aiPickSW(p); return { type: 'suggest', a: s, b: w }; }
      return { type: 'end' };
    }
    return {};
  }
  function aiRisk(p) {
    const kb = p.kb, S = kb.cands(0), W = kb.cands(1), R = kb.cands(2), prod = S.length * W.length * R.length;
    const lim = D.skill < 1 ? 4 : 2;
    if (prod > 1 && prod <= lim && Math.random() < (p.ai ? p.ai.aggr : .4) * (D.skill < 1 ? .7 : .35)) return { type: 'accuse', a: pick(S), b: pick(W), c: pick(R) };
    return null;
  }
  function aiPickSW(p) {
    const kb = p.kb; const S = kb.cands(0), W = kb.cands(1);
    let s = pick(S.length ? S : CATS[0]), w = pick(W.length ? W : CATS[1]);
    if (p.ai && Math.random() < p.ai.bluff && D.skill >= 1) { const mine = p.hand.filter(c => catOf(c) < 2); if (mine.length) { const c = pick(mine); if (catOf(c) === 0) s = c; else w = c; } }
    return [s, w];
  }
  function aiAbility(p, when) {
    if (p.ab.used || !canAb(p, when)) return null;
    const k = SUSP[p.suspect].ab, others = alive().filter(q => q.id !== p.id);
    if (k === 'ear' && others.length) return { type: 'ability', a: pick(others).id };
    if (k === 'mind') return { type: 'ability' };
    if (k === 'spot' && others.length && Math.random() < .5) return { type: 'ability', a: pick(others).id };
    if (k === 'lab') { for (const cat of [2, 0, 1]) { const c = p.kb.cands(cat); if (c.length >= 3) { const s = shuffle(c).slice(0, 3); return { type: 'ability', a: s[0], b: s[1], c: s[2] }; } } return null; }
    if (k === 'march' && Math.random() < .3) return { type: 'ability' };
    if (k === 'key' && Math.random() < .3) return { type: 'ability' };
    return null;
  }

  // ================== VISÃO (compartilhada por anfitrião e convidados) ==================
  function viewFromD() {
    const me = D.meIdx;
    return {
      N: D.N, round: D.round, turn: D.cur, dice: D.dice, phase: D.phase, bonus: D.bonus, sr: D.sr, wr: D.wr, ask: D.ask, evs: D.evs, over: D.over, me, blackout: D.blackout,
      players: D.players.map(p => ({ n: p.name, e: p.emoji, s: p.suspect, x: p.elim ? 1 : 0, k: p.hand.length, ab: p.ab.used ? 1 : 0, u: p.uid || '' })),
      priv: me >= 0 ? D.priv[me] : null
    };
  }
  function refresh() { if (!G || !G.ui) return; if (D && G.mode !== 'guest') G.v = viewFromD(); renderAll(); pubSchedule(); }

  // ================== INTERFACE ==================
  function mount(root) {
    G = { root, tok: {}, speed: 1, mode: null, notes: {}, lastNote: 0, shownAsk: 0, cfg: { N: Core.store.get('det.n', 4), mySus: Core.store.get('det.sus', 0), skill: Core.store.get('det.skill', 1), spectator: false } };
    root.append(Core.topbar('DETETIVE', h('button', { class: 'btn icon', title: 'Regras', onclick: showRules }, '?')));
    G.box = h('div', { class: 'dt' }); root.append(G.box);
    showSetup();
    if (Core.pendingRoom && Core.pendingRoom.game === 'detetive') { const inv = Core.pendingRoom; Core.pendingRoom = null; joinDet(inv); }
  }
  function unmount() { if (G) { if (G.lobby) G.lobby.destroy(); cleanupOnline(); G.tok = {}; } G = null; D = null; }

  function showRules() {
    Core.modal({
      title: 'Regras do Detetive', buttons: [{ text: 'Entendi', cls: 'primary', value: 1 }],
      body: h('div', { class: 'small', style: { lineHeight: 1.55 }, html:
        '<b>O caso:</b> alguém foi morto na Mansão Blackwood. Descubra <b>QUEM</b> (suspeito), <b>COM O QUÊ</b> (arma) e <b>ONDE</b> (cômodo). Essas 3 cartas estão num envelope secreto; as outras 18 foram distribuídas entre os jogadores.<br>' +
        '<b>Turno:</b> role 2 dados e mova-se pela mansão (corredores custam 2; passagens secretas custam 1). Depois, no cômodo onde está, faça um <b>palpite</b>.<br>' +
        '<b>Palpite:</b> escolha suspeito e arma (o cômodo é onde você está). Eles são trazidos para lá. Seguindo a ordem, o primeiro jogador que tiver uma das 3 cartas é obrigado a mostrá-la, <b>só para você</b>. Os demais só veem que alguém mostrou.<br>' +
        '<b>Acusação final:</b> a qualquer momento da sua vez você pode acusar (suspeito + arma + cômodo). Acertou? <b>Vence!</b> Errou? Está <b>eliminado</b> (mas suas cartas continuam refutando).<br>' +
        '<b>Bloco de notas 📓:</b> marque quem tem cada carta. Ele se preenche sozinho com o que você vê e deduz eliminações e soluções.<br>' +
        '<b>Habilidades:</b> cada suspeito tem uma habilidade de uso único.<br>' +
        '<b>Eventos da noite:</b> no início de alguns turnos uma carta de evento surge (pistas, atalhos, apagão…).<br>' +
        '<b>Dica:</b> palpites com cartas da sua própria mão ajudam a despistar!' })
    });
  }

  function showSetup() {
    G.tok = {}; G.mode = null; G.online = null; G.box.innerHTML = ''; D = null; G.v = null; G.ui = null; G.pend = null;
    if (G.lobby) { G.lobby.destroy(); G.lobby = null; }
    const seg = (arr, key, store) => {
      const wrap = h('div', { class: 'seg full' });
      arr.forEach(([k, t]) => wrap.append(h('button', { class: G.cfg[key] === k ? 'active' : '', onclick: e => { G.cfg[key] = k; Core.store.set(store, k); Core.$$('button', wrap).forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); } }, t)));
      return wrap;
    };
    const susRow = h('div', { class: 'sus-pick' }, SUSP.map((s, i) => h('button', { class: 'sus-chip' + (G.cfg.mySus === i ? ' active' : ''), style: { '--sc': s.c }, onclick: e => { G.cfg.mySus = i; Core.store.set('det.sus', i); Core.$$('.sus-chip', susRow).forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); } }, h('span', null, s.ic), h('b', null, s.n), h('small', null, s.abn))));
    const spec = h('input', { type: 'checkbox', onchange: e => { G.cfg.spectator = e.target.checked; } });
    G.lobbyBox = h('div');
    G.box.append(h('div', { class: 'tr-setup' },
      h('div', { class: 'dt-hero' }, h('div', { class: 'dt-logo' }, '🔍 BLACKWOOD'), h('div', { class: 'muted small' }, 'Um crime, uma mansão, 6 suspeitos. Quem, com o quê e onde?')),
      h('div', { class: 'panel' }, h('h3', null, 'Jogadores'), seg([[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], 'N', 'det.n'), h('div', { class: 'small muted', style: { marginTop: '6px' } }, 'Você + IAs (online, amigos contam como jogadores).')),
      h('div', { class: 'panel' }, h('h3', null, 'Seu suspeito (habilidade única)'), susRow),
      h('div', { class: 'panel' }, h('h3', null, 'Habilidade das IAs'), seg([[0.5, 'Fácil'], [1, 'Normal'], [1.6, 'Difícil']], 'skill', 'det.skill'),
        h('label', { class: 'row small', style: { marginTop: '10px' } }, h('span', { class: 'switch' }, spec, h('i')), h('span', null, 'Modo espectador (só IAs jogam)'))),
      h('button', { class: 'btn primary lg block', onclick: startOffline }, '▶ Começar o caso (contra IAs)'),
      G.lobbyBox,
      h('button', { class: 'btn block', onclick: showRules }, '📖 Ver regras')));
    if (Core.Social) {
      G.lobby = Core.Social.lobby({ game: 'detetive', multi: true, max: 5, createLabel: '🔍 Criar sala e convidar', onCreate: createDetRoom, resumeKey: 'det.room', onResume: resumeDet });
      G.lobbyBox.append(G.lobby.el);
    }
  }

  function startOffline() {
    G.tok = {}; const tok = G.tok; G.mode = 'host'; G.online = null; G.speed = 1;
    if (G.lobby) { G.lobby.destroy(); G.lobby = null; }
    newGame(Object.assign({}, G.cfg));
    buildUI(); refresh();
    runEngine(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); });
  }

  function buildUI() {
    G.box.innerHTML = '';
    const rooms = ROOMS.map((r, i) => {
      const el = h('div', { class: 'room', onclick: () => onRoom(i) },
        h('div', { class: 'rn' }, h('span', null, r.ic), ' ' + r.n), h('div', { class: 'rt' }), h('div', { class: 'rw' }),
        [0, 2, 6, 8].includes(i) ? h('span', { class: 'secret', title: 'Passagem secreta' }, '🕳️') : null, h('i', { class: 'cost' }));
      return el;
    });
    const lines = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      const cx = [14, 50, 86][c], cy = [14, 50, 86][r];
      if (c < 2) lines.push(`<line x1="${cx}" y1="${cy}" x2="${cx + 36}" y2="${cy}"/><text x="${cx + 18}" y="${cy - 1.5}">2</text>`);
      if (r < 2) lines.push(`<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + 36}"/><text x="${cx + 1.5}" y="${cy + 19}">2</text>`);
    }
    const svg = h('div', { class: 'cors', html: `<svg viewBox="0 0 100 100" preserveAspectRatio="none">${lines.join('')}<path class="sec" d="M14 14 Q50 -6 86 14 M14 86 Q50 106 86 86"/></svg>` });
    G.ui = {
      rooms, head: h('div', { class: 'dt-head' }), map: h('div', { class: 'dt-map' }, svg, h('div', { class: 'grid' }, rooms)),
      dice: h('div', { class: 'dt-dice' }), msg: h('div', { class: 'dt-msg' }), ctl: h('div', { class: 'dt-ctl' }), hand: h('div', { class: 'dt-hand' }), pl: h('div', { class: 'dt-pl' }), log: h('div', { class: 'dt-log' })
    };
    G.box.append(G.ui.head, G.ui.map, G.ui.dice, G.ui.msg, G.ui.ctl,
      h('div', { class: 'row', style: { gap: '8px' } }, h('button', { class: 'btn grow', onclick: openNotebook }, '📓 Bloco de notas'), h('button', { class: 'btn', onclick: showRules }, '?'), G.online ? h('button', { class: 'btn danger', onclick: () => leaveOnline(true) }, '⎋ Sair') : h('button', { class: 'btn', onclick: showSetup }, '⚙ Novo')),
      h('div', { class: 'panel' }, h('h3', null, 'Suas cartas'), G.ui.hand), G.ui.pl, G.ui.log);
  }

  // ---- renderização ----
  function renderAll() {
    const v = G.v; if (!v || !G.ui) return;
    G.ui.head.textContent = `Rodada ${v.round} · Vez: ${v.players[v.turn] ? v.players[v.turn].n : ''}${v.over ? ' · FIM' : ''}`;
    // mapa
    const myAsk = v.ask && v.ask.seat === v.me ? v.ask : null;
    const reach = myAsk && myAsk.kind === 'move' ? new Map(myAsk.data.reach) : null;
    G.ui.rooms.forEach((el, i) => {
      const rt = el.querySelector('.rt'), rw = el.querySelector('.rw'); rt.innerHTML = ''; rw.innerHTML = '';
      for (let s = 0; s < 6; s++) if (v.sr[s] === i) {
        const pi = v.players.findIndex(p => p.s === s);
        rt.append(h('u', { class: 'pawn' + (pi >= 0 && v.turn === pi ? ' cur' : '') + (pi < 0 ? ' npc' : '') + (pi >= 0 && v.players[pi].x ? ' dead' : ''), style: { '--sc': SUSP[s].c }, title: SUSP[s].n + (pi >= 0 ? ' — ' + v.players[pi].n : '') }, SUSP[s].ic));
      }
      for (let w = 0; w < 6; w++) if (v.wr[w] === i) rw.append(h('span', { class: 'wp', title: WEAP[w].n }, WEAP[w].ic));
      const can = reach && reach.has(i);
      el.classList.toggle('reach', !!can); el.querySelector('.cost').textContent = can ? (reach.get(i) ? reach.get(i) : '') : '';
    });
    // dados
    G.ui.dice.innerHTML = ''; if (v.dice) { G.ui.dice.append(dieEl(v.dice[0]), dieEl(v.dice[1])); if (v.bonus) G.ui.dice.append(h('span', { class: 'chip' }, '+' + v.bonus)); }
    // mensagem (último texto)
    const lastTxt = (v.evs.slice().reverse().find(e => e.t) || {}).t || ''; G.ui.msg.textContent = lastTxt;
    // mão
    G.ui.hand.innerHTML = '';
    if (v.priv) v.priv.hand.forEach(c => G.ui.hand.append(dcard(c))); else G.ui.hand.append(h('div', { class: 'muted small' }, 'Modo espectador.'));
    // jogadores
    G.ui.pl.innerHTML = '';
    v.players.forEach((p, i) => G.ui.pl.append(h('div', { class: 'dpl' + (v.turn === i ? ' turn' : '') + (p.x ? ' out' : '') },
      h('div', { class: 'dpt', style: { '--sc': SUSP[p.s].c } }, SUSP[p.s].ic), h('div', { class: 'grow' }, h('b', null, p.n + (i === v.me ? ' (você)' : '')), h('div', { class: 'small muted' }, `${SUSP[p.s].n} · ${p.k} cartas${p.x ? ' · eliminado' : ''}`)),
      p.ab ? h('span', { class: 'chip' }, 'hab. usada') : h('span', { class: 'chip on', title: SUSP[p.s].abd }, '✨ ' + SUSP[p.s].abn))));
    // log
    G.ui.log.innerHTML = ''; v.evs.slice(-7).reverse().forEach((e, i) => G.ui.log.append(h('div', { class: i ? 'old' : '' }, e.t || '')));
    renderCtl(); checkNote(); checkOver();
  }
  const dieEl = n => {
    const pat = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[n] || [];
    const d = h('div', { class: 'die' }); for (let i = 0; i < 9; i++) d.append(h('i', { class: pat.includes(i) ? 'on' : '' })); return d;
  };
  function dcard(c, o) {
    o = o || {};
    return h('div', { class: 'dcard c' + catOf(c) + (o.sel ? ' sel' : '') + (o.dim ? ' dim' : ''), onclick: o.onclick || null }, h('b', null, cardIc(c)), h('span', null, cardName(c)));
  }

  function renderCtl() {
    const v = G.v, c = G.ui.ctl; c.innerHTML = '';
    const a = v.ask && v.ask.seat === v.me ? v.ask : null;
    if (!a) {
      const who = v.ask ? v.players[v.ask.seat] : null;
      c.append(h('div', { class: 'muted small center grow' }, v.over ? 'Caso encerrado.' : (who ? `⏳ Aguardando ${who.n}…` : '⏳ …'))); return;
    }
    const send = rec => sendAct(rec);
    if (a.kind === 'roll') c.append(h('button', { class: 'btn primary lg block', onclick: () => send({ type: 'roll' }) }, '🎲 Rolar os dados'), row(abBtn(a), accBtn()));
    else if (a.kind === 'move') c.append(h('div', { class: 'small center muted' }, a.data.dice ? 'Toque num cômodo destacado para ir até ele.' : 'Escolha qualquer cômodo.'), h('button', { class: 'btn block', onclick: () => send({ type: 'move', a: v.sr[v.players[v.me].s] }) }, 'Ficar aqui'));
    else if (a.kind === 'act') {
      c.append(h('button', { class: 'btn primary lg block' + (a.data.canSug ? '' : ' disabled'), onclick: () => doSuggest(a) }, a.data.canSug ? '🔎 Fazer um palpite' : (a.data.noSug ? '🔌 Apagão: sem palpite' : '🔎 Palpite já feito')),
        row(accBtn(), abBtn(a)), h('button', { class: 'btn block', onclick: () => send({ type: 'end' }) }, '⏭ Encerrar turno'));
    }
    else if (a.kind === 'show') { if (G.shownAsk !== a.id) { G.shownAsk = a.id; setTimeout(() => doShow(a), 50); } c.append(h('div', { class: 'small center' }, '🂠 Escolha qual carta mostrar…')); }
    function row(...xs) { return h('div', { class: 'row', style: { gap: '8px', width: '100%' } }, xs.filter(Boolean)); }
    function accBtn() { return h('button', { class: 'btn grow', onclick: doAccuse }, '⚖️ Acusar'); }
    function abBtn(ask) { const me = v.players[v.me]; if (!ask.data.canAb) return h('button', { class: 'btn grow disabled' }, '✨ ' + SUSP[me.s].abn); return h('button', { class: 'btn grow good', onclick: () => doAbility(ask) }, '✨ ' + SUSP[me.s].abn); }
  }

  function sendAct(rec) {
    const v = G.v, a = v.ask; if (!a || a.seat !== v.me) return;
    if (G.mode === 'guest') {
      const O = G.online;
      O.room.child('act/' + So().user.uid).set(Object.assign({ id: a.id }, rec)).catch(e => { console.error(e); Core.toast('Falha ao enviar a jogada'); });
      v.ask = null; renderCtl();   // otimista
    } else if (G.pend) { const r = G.pend; G.pend = null; r(rec); }
  }
  function onRoom(i) {
    const v = G.v; if (!v || !v.ask || v.ask.seat !== v.me || v.ask.kind !== 'move') return;
    if (new Map(v.ask.data.reach).has(i)) sendAct({ type: 'move', a: i });
  }

  // ---- formulários (palpite, acusação, habilidade) ----
  async function pickCards(title, groups, text, confirmLabel) {
    while (true) {
      const sel = groups.map(() => null);
      const body = h('div', null, text ? h('p', { class: 'small' }, text) : null);
      const render = () => {
        body.querySelectorAll('.pk').forEach(n => n.remove());
        groups.forEach((g, gi) => body.append(h('div', { class: 'pk' }, h('div', { class: 'small muted', style: { margin: '8px 0 4px' } }, g.label),
          h('div', { class: 'pk-grid' }, g.cards.map(c => dcard(c, { sel: sel[gi] === c || (g.multi && Array.isArray(sel[gi]) && sel[gi].includes(c)), onclick: () => { if (g.multi) { sel[gi] = sel[gi] || []; const i = sel[gi].indexOf(c); if (i >= 0) sel[gi].splice(i, 1); else if (sel[gi].length < g.multi) sel[gi].push(c); } else sel[gi] = c; render(); } }))))));
      };
      render();
      const r = await Core.modal({ title, body, buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: confirmLabel || 'Confirmar', cls: 'primary', value: true }], dismiss: false });
      if (!r) return null;
      if (sel.every((x, i) => x != null && (!groups[i].multi || x.length === groups[i].multi))) return sel;
      Core.toast('Escolha todas as opções.');
    }
  }
  async function doSuggest(a) {
    const v = G.v, room = v.sr[v.players[v.me].s];
    const sel = await pickCards('🔎 Palpite', [{ label: 'Suspeito', cards: CATS[0] }, { label: 'Arma', cards: CATS[1] }], `Cômodo: ${ROOMS[room].ic} ${ROOMS[room].n}. Eles serão chamados para cá.`, 'Palpitar');
    if (sel) sendAct({ type: 'suggest', a: sel[0], b: sel[1] });
  }
  async function doAccuse() {
    const sel = await pickCards('⚖️ Acusação final', [{ label: 'Quem?', cards: CATS[0] }, { label: 'Com o quê?', cards: CATS[1] }, { label: 'Onde?', cards: CATS[2] }], '⚠ Se errar, você será ELIMINADO. Só acuse se tiver certeza!', 'ACUSAR');
    if (sel) sendAct({ type: 'accuse', a: sel[0], b: sel[1], c: sel[2] });
  }
  async function doShow(a) {
    const r = await Core.modal({ title: '🂠 Mostre uma carta', body: h('div', null, h('p', { class: 'small' }, `${G.v.players[a.data.to].n} fez um palpite. Escolha qual carta mostrar (só ele(a) verá):`), h('div', { class: 'pk-grid' }, a.data.cards.map(c => dcard(c)))), buttons: a.data.cards.map(c => ({ text: `${cardIc(c)} ${cardName(c)}`, cls: 'primary', value: c })), dismiss: false });
    sendAct({ type: 'show', a: r });
  }
  async function doAbility(ask) {
    const v = G.v, me = v.players[v.me], k = SUSP[me.s].ab;
    const others = v.players.map((p, i) => ({ p, i })).filter(x => x.i !== v.me && !x.p.x);
    if (k === 'march' || k === 'key' || k === 'mind') {
      const ok = await Core.modal({ title: '✨ ' + SUSP[me.s].abn, body: SUSP[me.s].abd + ' (uso único)', buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Usar', cls: 'primary', value: true }] });
      if (ok) sendAct({ type: 'ability' }); return;
    }
    if (k === 'ear' || k === 'spot') {
      const r = await Core.modal({ title: '✨ ' + SUSP[me.s].abn, body: SUSP[me.s].abd, buttons: others.map(x => ({ text: `${SUSP[x.p.s].ic} ${x.p.n}`, cls: 'primary', value: x.i })).concat([{ text: 'Cancelar', cls: 'ghost', value: -1 }]) });
      if (r >= 0) sendAct({ type: 'ability', a: r }); return;
    }
    if (k === 'lab') {
      const cat = await Core.modal({ title: '🧪 Laudo pericial', body: 'Escolha a categoria:', buttons: [{ text: 'Suspeitos', cls: 'primary', value: 0 }, { text: 'Armas', cls: 'primary', value: 1 }, { text: 'Cômodos', cls: 'primary', value: 2 }, { text: 'Cancelar', cls: 'ghost', value: -1 }] });
      if (cat < 0) return;
      const sel = await pickCards('🧪 Escolha 3 cartas', [{ label: 'Escolha 3', cards: CATS[cat], multi: 3 }], 'Você saberá se UMA delas está no envelope.', 'Pedir laudo');
      if (sel) sendAct({ type: 'ability', a: sel[0][0], b: sel[0][1], c: sel[0][2] });
    }
  }

  // ---- notas privadas e fim de jogo ----
  function checkNote() {
    const pr = G.v && G.v.priv; if (!pr || !pr.note || pr.note.id <= G.lastNote) return;
    G.lastNote = pr.note.id; const t = pr.note.text;
    setTimeout(() => Core.modal({ title: '🔒 Só você vê', body: h('div', { class: 'cardtxt' }, t), buttons: [{ text: 'Anotar e continuar', cls: 'primary', value: 1 }] }), 30);
  }
  function checkOver() {
    const v = G.v; if (!v || !v.over || G.overShown) return; G.overShown = true;
    const w = v.players[v.over.winner], you = v.over.winner === v.me;
    Core.snd(you ? 'win' : 'lose'); if (you) Core.addStat('detetiveWin');
    const body = h('div', null, h('p', null, v.over.reason === 'elim' ? 'Todos os outros foram eliminados.' : 'A acusação estava correta!'),
      h('div', { class: 'tcard-head', style: { background: '#33406a' } }, 'A solução'),
      h('div', { class: 'pk-grid' }, v.over.env.map(c => dcard(c))));
    setTimeout(async () => {
      const r = await Core.modal({ title: you ? 'Você resolveu o caso! 🏆' : `${w.n} resolveu o caso`, body, buttons: [{ text: 'Menu', cls: 'ghost', value: 'm' }, { text: 'Voltar', cls: 'primary', value: 'v' }], dismiss: false });
      G.overShown = false;
      if (G.online) { await leaveOnline(false); if (r === 'm') Core.go(''); } else { showSetup(); if (r === 'm') Core.go(''); }
    }, 900);
  }
  async function endGameLocal() { /* o modal é exibido por checkOver() via refresh */ }

  // ---- bloco de notas ----
  function computeMarks(v) {
    const N = v.N, mark = Array.from({ length: 21 }, () => Array(N).fill(0));   // 1 tem, 2 não tem
    const has = (c, p) => { mark[c][p] = 1; for (let q = 0; q < N; q++) if (q !== p && !mark[c][q]) mark[c][q] = 2; };
    const pr = v.priv || { hand: [], seen: {}, nots: [], out: [] };
    pr.hand.forEach(c => has(c, v.me));
    Object.keys(pr.seen || {}).forEach(c => has(+c, pr.seen[c]));
    (pr.nots || []).forEach(([c, p]) => { if (!mark[c][p]) mark[c][p] = 2; });
    v.evs.forEach(e => {
      if (e.k === 'sug') (e.passed || []).forEach(p => [e.s, e.w, e.r].forEach(c => { if (!mark[c][p]) mark[c][p] = 2; }));
      if (e.k === 'leak') has(e.card, e.by);
    });
    const out = new Set(pr.out || []); for (let c = 0; c < 21; c++) if (mark[c].includes(1)) out.add(c);
    const sol = new Set(); CATS.forEach(cat => { const cand = cat.filter(c => !out.has(c)); if (cand.length === 1) sol.add(cand[0]); });
    // carta que ninguém pode ter (todos marcados "não tem") só pode estar no envelope
    for (let c = 0; c < 21; c++) if (!out.has(c) && mark[c].every(x => x === 2)) sol.add(c);
    return { mark, out, sol };
  }
  function openNotebook() {
    const v = G.v; if (!v) return;
    const body = h('div', { class: 'nb' });
    const render = () => {
      body.innerHTML = '';
      const { mark, out, sol } = computeMarks(v);
      const tbl = h('table');
      const head = h('tr', null, h('th', null, ''));
      v.players.forEach((p, i) => head.append(h('th', { class: i === v.me ? 'me' : '' }, h('span', null, SUSP[p.s].ic), h('small', null, i === v.me ? 'eu' : p.n.split(' ')[0]))));
      head.append(h('th', null, ''));
      tbl.append(head);
      CATS.forEach((cat, ci) => {
        tbl.append(h('tr', { class: 'cat' }, h('td', { colspan: v.players.length + 2 }, CATN[ci])));
        cat.forEach(c => {
          const tr = h('tr', { class: (out.has(c) ? 'out' : '') + (sol.has(c) ? ' sol' : '') }, h('td', { class: 'nm' }, cardIc(c) + ' ' + cardName(c)));
          v.players.forEach((p, i) => {
            const key = c + ':' + i, man = G.notes[key] || 0, auto = mark[c][i];
            const st = man || auto, sym = st === 1 ? '✔' : st === 2 ? '✖' : st === 3 ? '?' : '';
            tr.append(h('td', { class: 'cell s' + st + (auto && !man ? ' auto' : ''), onclick: () => { G.notes[key] = ((G.notes[key] || 0) + 1) % 4; render(); } }, sym));
          });
          tr.append(h('td', { class: 'st' }, sol.has(c) ? '⭐' : out.has(c) ? '' : '•'));
          tbl.append(tr);
        });
      });
      body.append(h('div', { class: 'small muted', style: { marginBottom: '6px' } }, '✔ tem · ✖ não tem · ? talvez (toque para alternar). Linhas apagadas = fora do envelope; ⭐ = solução provável.'), h('div', { class: 'nb-scroll' }, tbl));
    };
    render();
    Core.modal({ title: '📓 Bloco de notas', body, buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
  }

  // ================== ONLINE ==================
  const So = () => Core.Social;
  async function createDetRoom(friends) {
    const so = So(); if (!so || !so.user || !friends.length) return;
    try {
      const n = Math.max(G.cfg.N, friends.length + 1);
      const rid = await so.createRoom('detetive', friends, { skill: G.cfg.skill, n });
      G.online = { rid, role: 'host', room: so.db.ref('rooms/' + rid), hostUid: so.user.uid, seq: 0, pres: {}, refs: [], offs: [], n };
      showWait(true);
    } catch (e) { console.error(e); Core.toast('Não foi possível criar a sala (verifique as regras do banco).', 4000); }
  }
  async function joinDet(inv) {
    const so = So();
    if (!so || !so.user) { Core.toast('Entre na sua conta para aceitar o convite'); return; }
    try {
      const room = await so.joinMemberRoom(inv);
      G.online = { rid: inv.room, role: 'guest', room: so.db.ref('rooms/' + inv.room), hostUid: room.host, refs: [], offs: [] };
      Core.store.set('det.room', { rid: inv.room });
      showWait(false);
    } catch (e) { console.error(e); Core.toast('Convite inválido ou expirado'); }
  }
  async function resumeDet() {
    const saved = Core.store.get('det.room', null), so = So(); if (!saved || !so.user) return;
    try {
      const snap = await so.db.ref('rooms/' + saved.rid).get();
      if (!snap.exists()) { Core.store.set('det.room', null); Core.toast('A sala não existe mais'); showSetup(); return; }
      const room = snap.val();
      if (room.host === so.user.uid) { Core.store.set('det.room', null); showSetup(); return; }
      G.online = { rid: saved.rid, role: 'guest', room: so.db.ref('rooms/' + saved.rid), hostUid: room.host, refs: [], offs: [] };
      if (room.status === 'playing') startGuest(); else showWait(false);
    } catch (e) { Core.store.set('det.room', null); showSetup(); }
  }
  function showWait(isHost) {
    const O = G.online;
    if (G.lobby) { G.lobby.destroy(); G.lobby = null; }
    G.box.innerHTML = '';
    O.wait = Core.Social.waitRoom({
      rid: O.rid, isHost, minReady: 1, title: '🔍 Sala do Detetive',
      onStart: uids => { O.wait.destroy(); O.wait = null; startOnlineHost(uids); },
      onPlaying: () => { if (!isHost) { O.wait.destroy(); O.wait = null; startGuest(); } },
      onLeave: closed => leaveOnline(!closed)
    });
    G.box.append(h('div', { class: 'tr-setup' }, O.wait.el));
  }
  function startOnlineHost(uids) {
    const so = So(), O = G.online;
    G.tok = {}; const tok = G.tok; G.mode = 'host'; G.speed = 1;
    O.room.child('players').get().then(snap => {
      const pl = snap.val() || {}, remotes = {};
      uids.slice(0, 5).forEach((uid, i) => { const info = pl[uid] || { name: 'Amigo', avatar: '🙂' }; remotes[i + 1] = { uid, name: info.name }; });
      const N = Math.max(O.n || G.cfg.N, uids.length + 1);
      newGame({ N, mySus: G.cfg.mySus, skill: G.cfg.skill, remotes, hostUid: so.user.uid });
      D.players[0].name = so.me.name; O.privKeys = {};
      uids.forEach(uid => O.offs.push(so.watchPresence(uid, on => { O.pres[uid] = on; })));
      buildUI(); G.v = viewFromD(); renderAll();
      pubNow().then(() => O.room.child('status').set('playing')).then(() => { runEngine(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); }); })
        .catch(e => { console.error(e); Core.toast('Erro ao iniciar a partida'); });
    });
  }
  function pubObj() {
    const v = viewFromD();
    return JSON.parse(JSON.stringify({ seq: ++G.online.seq, N: v.N, round: v.round, turn: v.turn, dice: v.dice, phase: v.phase, bonus: v.bonus, sr: v.sr, wr: v.wr, ask: v.ask ? Object.assign({ uid: D.players[v.ask.seat].uid || '' }, v.ask) : null, evs: v.evs, over: v.over, players: v.players, blackout: v.blackout }));
  }
  function syncPriv(p) {
    const O = G.online; if (!O || O.role !== 'host' || !p.uid) return;
    const key = JSON.stringify(D.priv[p.id]); if (O.privKeys[p.uid] === key) return; O.privKeys[p.uid] = key;
    So().db.ref('private/' + O.rid + '/' + p.uid).set(JSON.parse(key)).catch(e => console.error(e));
  }
  function pubNow() {
    const O = G && G.online; if (!O || O.role !== 'host' || !D) return Promise.resolve();
    clearTimeout(O.pt); O.pt = null;
    D.players.forEach(p => { if (p.kind === 'remote') syncPriv(p); });
    return O.room.child('pub').set(pubObj()).catch(e => console.error(e));
  }
  function pubSchedule() { const O = G && G.online; if (!O || O.role !== 'host' || O.pt || !D) return; O.pt = setTimeout(pubNow, 40); }
  function waitActRemote(p, id, ms) {
    const O = G.online;
    return new Promise(res => {
      const ref = O.room.child('act/' + p.uid); let done = false, t, iv, fn;
      const finish = v => { if (done) return; done = true; ref.off('value', fn); clearTimeout(t); clearInterval(iv); res(v); };
      fn = ref.on('value', s => { const v = s.val(); if (v && v.id === id) finish(v); });
      t = setTimeout(() => finish(null), ms);
      iv = setInterval(() => { if (O.pres && O.pres[p.uid] === false) finish(null); }, 1500);
    });
  }
  async function remoteAsk(p) {
    const a = D.ask; await pubNow();
    const act = await waitActRemote(p, a.id, a.kind === 'show' ? 70000 : 120000);
    if (act && act.type) {
      const t = act.type;
      if (a.kind === 'roll' && ['roll', 'ability', 'accuse'].includes(t)) return act;
      if (a.kind === 'move' && t === 'move') return act;
      if (a.kind === 'act' && ['suggest', 'accuse', 'ability', 'end'].includes(t)) return act;
      if (a.kind === 'show' && t === 'show') return act;
    }
    return aiAnswer(p, a.kind, a.data);   // tempo esgotado/offline: a IA joga por ele(a)
  }
  // ---- convidado ----
  function startGuest() {
    const so = So(), O = G.online, me = so.user.uid;
    G.tok = {}; G.mode = 'guest'; D = null; G.v = null;
    if (G.lobby) { G.lobby.destroy(); G.lobby = null; }
    G.box.innerHTML = ''; G.box.append(h('div', { class: 'muted center', style: { padding: '30px' } }, 'Conectando à mansão…'));
    O.priv = null; let built = false;
    const on = (ref, ev, fn) => { ref.on(ev, fn, e => console.error(e)); O.refs.push([ref, ev, fn]); };
    const apply = () => {
      if (!O.pub) return; const pub = O.pub;
      let mine = pub.players.findIndex(p => p.u === me); if (mine < 0) mine = -1;
      G.v = Object.assign({}, pub, { me: mine, priv: O.priv });
      if (!built) { built = true; buildUI(); }
      renderAll();
    };
    on(so.db.ref('private/' + O.rid + '/' + me), 'value', s => { O.priv = s.val() ? Object.assign({ hand: [], seen: {}, nots: [], out: [], note: null }, s.val()) : null; apply(); });
    on(O.room.child('pub'), 'value', s => { if (s.val()) { O.pub = s.val(); apply(); } });
    on(O.room.child('status'), 'value', s => { if (s.val() == null && !O.left) { Core.toast('A sala foi encerrada'); leaveOnline(false); } });
    O.offs.push(so.watchPresence(O.hostUid, online => { if (G && G.online === O && !online && O.pub && !O.pub.over) Core.toast('O anfitrião está offline…', 3500); }));
  }
  function cleanupOnline() {
    const O = G && G.online; if (!O) return; O.left = true;
    (O.refs || []).forEach(([r, ev, fn]) => { try { r.off(ev, fn); } catch (e) { /* ok */ } });
    (O.offs || []).forEach(f => { try { f(); } catch (e) { /* ok */ } });
    if (O.wait) { O.wait.destroy(); O.wait = null; } clearTimeout(O.pt); O.refs = []; O.offs = [];
  }
  async function leaveOnline(ask) {
    const O = G && G.online; if (!O) return;
    if (ask === true && O.role === 'host' && D) {
      const ok = await Core.modal({ title: 'Encerrar a partida?', body: 'Os amigos serão desconectados.', buttons: [{ text: 'Continuar', cls: 'ghost', value: false }, { text: 'Encerrar', cls: 'danger', value: true }] });
      if (!ok || !G || G.online !== O) return;
    }
    G.tok = {}; const so = So();
    try {
      if (O.role === 'host') { await Promise.all(Object.keys(O.privKeys || {}).map(u => so.db.ref('private/' + O.rid + '/' + u).remove().catch(() => { }))); await O.room.remove(); }
      else if (so.user) await so.db.ref('rooms/' + O.rid + '/ready/' + so.user.uid).set(false).catch(() => { });
    } catch (e) { console.error(e); }
    cleanupOnline(); Core.store.set('det.room', null); G.online = null; G.overShown = false; D = null;
    showSetup();
  }

  Core.register('detetive', { mount, unmount, joinRoom: inv => { if (G) joinDet(inv); } });
  window.DetetiveDebug = { state: () => D, view: () => G && G.v, KB, SUSP, WEAP, ROOMS, dists };
})();
