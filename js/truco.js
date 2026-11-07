/* ============================================================
   Truco Paulista com IA (1x1 ou 2x2 com jogadores IA)
   ============================================================ */
(function () {
  'use strict';
  const { h, sleep, pick, shuffle, rand } = Core;

  const RANKS = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
  const BASEPOW = { '4': 1, '5': 2, '6': 3, '7': 4, 'Q': 5, 'J': 6, 'K': 7, 'A': 8, '2': 9, '3': 10 };
  function power(c) {
    if (c.r === '4' && c.s === 'C') return 14; // Zap
    if (c.r === '7' && c.s === 'H') return 13; // Copas
    if (c.r === 'A' && c.s === 'S') return 12; // Espadilha
    if (c.r === '7' && c.s === 'D') return 11; // Ouros
    return BASEPOW[c.r];
  }
  const MANILHA = { 14: 'Zap', 13: 'Copas', 12: 'Espadilha', 11: 'Ouros' };
  const BETNAME = { 3: 'TRUCO!', 6: 'SEIS!', 9: 'NOVE!', 12: 'DOZE!' };
  const nextVal = v => (v === 1 ? 3 : v + 3);

  const PERSONAS = [
    { name: 'Seu Zé', emoji: '🤠', aggr: .25, bluff: .1, cover: .3, desc: 'Cauteloso' },
    { name: 'Dona Marta', emoji: '👵', aggr: .4, bluff: .95, cover: .5, desc: 'Blefadora' },
    { name: 'Tião', emoji: '😎', aggr: .95, bluff: .5, cover: .2, desc: 'Agressivo' },
    { name: 'Bia', emoji: '🧐', aggr: .5, bluff: .2, cover: .4, desc: 'Calculista' },
    { name: 'Chico', emoji: '🎩', aggr: .6, bluff: .4, cover: .35, desc: 'Equilibrado' },
    { name: 'Rafa', emoji: '🤖', aggr: .7, bluff: .3, cover: .25, desc: 'Ousado' }
  ];

  let G = null;
  class Abort extends Error { }

  function mount(root) {
    G = { root, tok: {}, mode: Core.store.get('truco.mode', '2v2'), skill: Core.store.get('truco.skill', 1), cover: false };
    root.append(Core.topbar('TRUCO PAULISTA', h('button', { class: 'btn icon', title: 'Regras', onclick: showRules }, '?')));
    G.box = h('div', { class: 'truco' }); root.append(G.box);
    showSetup();
  }
  function unmount() { G = null; }

  // ---------------- setup ----------------
  function showSetup() {
    G.tok = {}; G.box.innerHTML = '';
    const modeBtns = [['1v1', '1 x 1', 'Você contra uma IA'], ['2v2', '2 x 2', 'Você + IA parceira contra 2 IAs']].map(([k, t, d]) =>
      h('button', { class: 'opt-card' + (G.mode === k ? ' active' : ''), onclick: e => { G.mode = k; Core.store.set('truco.mode', k); sel(e.currentTarget, modeBtns); } }, h('b', null, t), h('span', null, d)));
    const skillBtns = [[0.3, 'Fácil', 'IAs erram mais'], [1, 'Normal', 'Equilibrado'], [1.6, 'Difícil', 'IAs calculam melhor']].map(([k, t, d]) =>
      h('button', { class: 'opt-card' + (G.skill === k ? ' active' : ''), onclick: e => { G.skill = k; Core.store.set('truco.skill', k); sel(e.currentTarget, skillBtns); } }, h('b', null, t), h('span', null, d)));
    function sel(el, group) { group.forEach(b => b.classList.remove('active')); el.classList.add('active'); }
    G.box.append(h('div', { class: 'tr-setup' },
      h('div', { class: 'panel' }, h('h3', null, 'Modo de jogo'), h('div', { class: 'opt' }, modeBtns)),
      h('div', { class: 'panel' }, h('h3', null, 'Habilidade das IAs'), h('div', { class: 'opt' }, skillBtns)),
      h('div', { class: 'panel' }, h('h3', null, 'Os jogadores'),
        h('div', { class: 'small muted', style: { lineHeight: 1.6 } }, PERSONAS.map(p => `${p.emoji} ${p.name} — ${p.desc}`).join(' · '))),
      h('button', { class: 'btn primary lg block', onclick: startMatch }, '▶ Começar partida'),
      h('button', { class: 'btn block', onclick: showRules }, '📖 Ver regras e ordem das cartas')));
  }

  function showRules() {
    const order = [['4', 'C'], ['7', 'H'], ['A', 'S'], ['7', 'D'], ['3', 'H'], ['2', 'H'], ['A', 'H'], ['K', 'H'], ['J', 'H'], ['Q', 'H'], ['7', 'S'], ['6', 'H'], ['5', 'H'], ['4', 'H']];
    const labels = ['Zap', 'Copas', 'Espad.', 'Ouros', '3', '2', 'Ases', 'Reis', 'Valetes', 'Damas', '7', '6', '5', '4'];
    const leg = h('div', { class: 'legend' }, order.map(([r, s], i) => h('div', null, Core.cardEl({ r, s }), h('small', null, labels[i]))));
    const body = h('div', null,
      h('p', null, '<b>Objetivo:</b> chegar a 12 pontos. Cada mão vale 1 ponto e é decidida em até 3 rodadas (ganha quem vencer 2).'),
      h('div', { html: '<b>Cartas (da mais forte à mais fraca):</b>' }), leg,
      h('div', { class: 'small', style: { lineHeight: 1.55, marginTop: '10px' }, html:
        '• <b>Truco</b>: vale 3. O adversário pode <b>aceitar</b>, <b>correr</b> (você ganha os pontos de antes) ou <b>aumentar</b> para 6, depois 9 e 12.<br>' +
        '• <b>Empate (embuchada)</b>: se a 1ª rodada empata, quem ganhar a 2ª leva a mão. Se empatar depois de uma vitória, quem venceu antes leva.<br>' +
        '• <b>Cobrir</b>: a partir da 2ª rodada você pode jogar a carta virada (ela não vence nada).<br>' +
        '• <b>Mão de onze</b>: com 11 pontos você vê as cartas e decide jogar (vale 3) ou correr. Não pode pedir truco.<br>' +
        '• <b>Mão de ferro</b>: 11 x 11, joga-se sem ver as cartas, vale 1 ponto.' }));
    Core.modal({ title: 'Regras do Truco Paulista', body, buttons: [{ text: 'Entendi', cls: 'primary', value: true }] });
  }

  // ---------------- partida ----------------
  function posOf(seat) {
    if (G.N === 2) return seat === 0 ? 'bottom' : 'top';
    return ['bottom', 'left', 'top', 'right'][seat];
  }
  function startMatch() {
    G.tok = {}; const tok = G.tok;
    G.N = G.mode === '1v1' ? 2 : 4;
    const pool = shuffle(PERSONAS);
    G.seats = [];
    for (let i = 0; i < G.N; i++) {
      const team = i % 2;
      if (i === 0) G.seats.push({ id: 0, name: Core.settings.name, emoji: '🙂', team: 0, human: true, hand: [] });
      else {
        const p = pool.pop();
        G.seats.push({ id: i, name: i === 2 ? p.name + ' (parceiro)' : p.name, short: p.name, emoji: p.emoji, team, human: false, style: p, hand: [] });
      }
    }
    G.score = [0, 0]; G.dealer = rand(0, G.N - 1); G.H = null;
    buildUI();
    runMatch(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); });
  }

  function buildUI() {
    const box = G.box; box.innerHTML = '';
    G.ui = {};
    G.ui.scoreUs = h('div', { class: 'pt' }, '0'); G.ui.scoreThem = h('div', { class: 'pt' }, '0');
    G.ui.pipsUs = h('div', { class: 'pips' }); G.ui.pipsThem = h('div', { class: 'pips' });
    G.ui.val = h('div', { class: 'hand-val' }, h('small', null, 'Mão vale'), h('b', null, '1'));
    G.ui.table = h('div', { class: 't-table' });
    G.ui.center = h('div', { class: 'center' });
    G.ui.pips = h('div', { class: 'pips-t' });
    G.ui.seatEls = G.seats.map(p => {
      const el = h('div', { class: `seat pos-${posOf(p.id)} team${p.team}` },
        h('div', { class: 'who' }, h('div', { class: 'av' }, p.emoji), h('span', null, p.name)),
        h('div', { class: 'backs' }));
      G.ui.table.append(el); return el;
    });
    G.ui.table.append(G.ui.center, G.ui.pips);
    G.ui.hand = h('div', { class: 't-hand' });
    G.ui.actions = h('div', { class: 't-actions' });
    G.ui.log = h('div', { class: 't-log' });
    box.append(
      h('div', { class: 't-score' },
        h('div', { class: 'sc-box us' }, h('div', { class: 'lb' }, 'Nós'), G.ui.scoreUs, G.ui.pipsUs), G.ui.val,
        h('div', { class: 'sc-box them' }, h('div', { class: 'lb' }, 'Eles'), G.ui.scoreThem, G.ui.pipsThem)),
      G.ui.table, G.ui.log, G.ui.hand, G.ui.actions,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn sm', onclick: showSetup }, '⚙ Novo jogo'), h('button', { class: 'btn sm', onclick: showRules }, '📖 Regras')));
    renderScore();
  }

  function renderScore() {
    G.ui.scoreUs.textContent = G.score[0]; G.ui.scoreThem.textContent = G.score[1];
    const pips = (el, n) => { el.innerHTML = ''; for (let i = 0; i < 12; i++) el.append(h('i', { class: i < n ? 'on' : '' })); };
    pips(G.ui.pipsUs, G.score[0]); pips(G.ui.pipsThem, G.score[1]);
  }
  function renderVal() {
    const b = G.ui.val.querySelector('b'); b.textContent = G.H ? G.H.value : 1;
    G.ui.val.classList.remove('bump'); void G.ui.val.offsetWidth; G.ui.val.classList.add('bump');
  }
  function renderSeats() {
    G.seats.forEach(p => {
      const el = G.ui.seatEls[p.id], backs = el.querySelector('.backs');
      backs.innerHTML = '';
      if (!p.human) for (let i = 0; i < p.hand.length; i++) backs.append(Core.cardEl(null, { back: true }));
      el.classList.toggle('turn', G.H && G.H.turnSeat === p.id);
    });
  }
  function renderHand(myTurn) {
    const hd = G.ui.hand; hd.innerHTML = '';
    const me = G.seats[0];
    hd.classList.toggle('my-turn', !!myTurn);
    me.hand.forEach((c, i) => {
      const el = Core.cardEl(c, { back: G.H && G.H.ferro, cls: G.H && G.H.justDealt ? 'deal' : '' });
      if (G.H && G.H.justDealt) el.style.animationDelay = (i * 120) + 'ms';
      el.addEventListener('click', () => onCard(c));
      hd.append(el);
    });
  }
  function renderActions(myTurn) {
    const a = G.ui.actions; a.innerHTML = '';
    if (!myTurn || !G.H) return;
    if (canRaise(0)) a.append(h('button', { class: 'btn primary truco', onclick: () => resolveHuman({ type: 'truco' }) }, BETNAME[nextVal(G.H.value)]));
    if (G.H.trick > 0) {
      const b = h('button', { class: 'btn' + (G.cover ? ' blue' : ''), onclick: () => { G.cover = !G.cover; renderActions(true); } }, G.cover ? '🂠 Cobrir: SIM' : '🂠 Cobrir: não');
      a.append(b);
    }
  }
  function log(t) { if (G && G.ui.log) G.ui.log.textContent = t; }
  function say(seat, text, cls) {
    const pos = posOf(seat);
    const w = h('div', { class: 'bw bw-' + pos }, h('div', { class: 'bubble ' + (cls || '') }, text));
    G.ui.table.append(w); setTimeout(() => w.remove(), 1950);
  }

  // ---------------- controle assíncrono ----------------
  function aliveCheck(tok) { if (!G || G.tok !== tok) throw new Abort(); }
  const wait = async ms => { const tok = G.tok; await sleep(ms); aliveCheck(tok); };
  function humanInput() { const tok = G.tok; return new Promise(res => { G.pending = { res, tok }; }); }
  function resolveHuman(v) { if (G.pending && G.pending.tok === G.tok) { const p = G.pending; G.pending = null; p.res(v); } }
  function onCard(c) {
    if (!G.pending || !G.H) return;
    resolveHuman({ type: 'play', card: c, covered: G.cover && G.H.trick > 0 });
  }

  async function runMatch(tok) {
    while (G.score[0] < 12 && G.score[1] < 12) {
      await playHand();
      aliveCheck(tok);
      G.dealer = (G.dealer + 1) % G.N;
      if (G.score[0] >= 12 || G.score[1] >= 12) break;
      await wait(1400);
    }
    const won = G.score[0] >= 12;
    Core.snd(won ? 'win' : 'lose'); if (won) Core.addStat('trucoWin');
    const v = await Core.modal({
      title: won ? 'Vitória! 🏆' : 'Derrota 😔', body: `Placar final: <b>Nós ${G.score[0]} × ${G.score[1]} Eles</b>`,
      buttons: [{ text: 'Menu', cls: 'ghost', value: 'm' }, { text: 'Jogar de novo', cls: 'primary', value: 'r' }]
    });
    if (!G) return;
    if (v === 'r') startMatch(); else Core.go('');
  }

  // ---------------- regras da mão ----------------
  function canRaise(team) {
    const H = G.H;
    return H && !H.ferro && !H.noRaise && H.value < 12 && H.lastRaiser !== team && !H.ended;
  }
  function resolveResults(r, mao) {
    if (r.length >= 2) {
      if (r[0] !== 'T' && r[1] === r[0]) return r[0];
      if (r[0] !== 'T' && r[1] === 'T') return r[0];
      if (r[0] === 'T' && r[1] !== 'T') return r[1];
    }
    if (r.length === 3) {
      if (r[2] !== 'T') return r[2];
      if (r[0] !== 'T') return r[0];
      return mao;
    }
    return null;
  }
  function trickWinner() {
    const t = G.H.table; let max = -2;
    t.forEach(x => { if (x.pw > max) max = x.pw; });
    if (max < 0) return { team: 'T', seat: t[0].seat };
    const tops = t.filter(x => x.pw === max);
    const teams = new Set(tops.map(x => G.seats[x.seat].team));
    if (teams.size > 1) return { team: 'T', seat: t[0].seat };
    return { team: [...teams][0], seat: tops[0].seat };
  }

  async function playHand() {
    const N = G.N;
    const H = G.H = { value: 1, lastRaiser: null, results: [], table: [], trick: 0, mao: (G.dealer + 1) % N, ended: false, winner: null, points: 1, ferro: false, noRaise: false, turnSeat: -1, justDealt: true };
    // distribuir
    const deck = [];
    for (const r of RANKS) for (const s of 'CHSD') deck.push({ r, s });
    const sh = shuffle(deck);
    G.seats.forEach(p => { p.hand = sh.splice(0, 3).map(c => Object.assign(c, { pw: power(c) })).sort((a, b) => b.pw - a.pw); });
    G.ui.center.innerHTML = ''; G.ui.pips.innerHTML = ''; G.cover = false;
    renderVal(); renderSeats(); renderHand(false); renderActions(false); Core.snd('deal');
    log(`Mão de ${G.seats[H.mao].short || G.seats[H.mao].name} começa.`);
    await wait(900); H.justDealt = false;

    // mão de onze / ferro
    const eleven = [0, 1].filter(t => G.score[t] === 11);
    if (eleven.length === 2) { H.ferro = true; renderHand(false); log('MÃO DE FERRO! 11 × 11 — jogam sem ver as cartas.'); await wait(1500); }
    else if (eleven.length === 1) { await onzeDecision(eleven[0]); }

    let leader = H.mao;
    for (let t = 0; t < 3 && !H.ended; t++) {
      H.trick = t; H.table = [];
      for (let k = 0; k < N && !H.ended; k++) {
        const seat = (leader + k) % N;
        await takeTurn(seat);
      }
      if (H.ended) break;
      const res = trickWinner();
      H.results.push(res.team);
      showTrickResult(res);
      const w = resolveResults(H.results, G.seats[H.mao].team);
      await wait(1300);
      clearTable();
      if (w !== null) { H.ended = true; H.winner = w; H.points = H.onzeTeam != null ? 3 : H.value; break; }
      if (res.team !== 'T') leader = res.seat;
    }
    // fim da mão
    H.turnSeat = -1; renderSeats(); renderHand(false); renderActions(false);
    const teamName = H.winner === 0 ? 'Vocês' : 'Eles';
    G.score[H.winner] = Math.min(12, G.score[H.winner] + H.points);
    renderScore();
    log(`${teamName} ganharam a mão (+${H.points}).`);
    Core.snd(H.winner === 0 ? 'chip' : 'turn');
    G.ui.table.querySelectorAll('.tcard').forEach(e => e.remove());
    await wait(900);
  }

  function showTrickResult(res) {
    const pip = h('i', { class: res.team === 'T' ? 'tie' : (res.team === 0 ? 'us' : 'them') });
    G.ui.pips.append(pip);
    if (res.team === 'T') log('Rodada empatada (embuchou)!');
    else log(res.team === 0 ? 'Nós ganhamos a rodada.' : 'Eles ganharam a rodada.');
    if (res.team !== 'T') {
      const top = G.H.table.find(x => x.seat === res.seat);
      if (top && top.el) top.el.firstChild.classList.add('win');
    }
  }
  function clearTable() {
    const els = G.H.table.map(x => x.el).filter(Boolean);
    els.forEach(e => e.classList.add('fade'));
    setTimeout(() => els.forEach(e => e.remove()), 520);
  }

  async function onzeDecision(team) {
    const H = G.H;
    H.onzeTeam = team; H.noRaise = true;
    const mates = G.seats.filter(p => p.team === team);
    const humanOn = mates.some(p => p.human);
    let play;
    if (humanOn) {
      const cards = h('div', { class: 'show-hand' });
      mates.forEach(p => p.hand.forEach(c => cards.append(Core.cardEl(c))));
      G.ui.table.append(askBox('MÃO DE ONZE', 'Você tem 11 pontos. Valendo 3 pontos. Jogar ou correr (adversário ganha 1)?', cards,
        [{ text: 'Jogar (vale 3)', cls: 'primary', v: true }, { text: 'Correr', cls: 'danger', v: false }]));
      play = await askResult();
    } else {
      log('Eles estão com 11 pontos e olham as cartas…');
      await wait(1600);
      const ais = mates;
      const s = ais.reduce((a, p) => a + strengthOf(p, true), 0) / ais.length;
      play = s >= 0.42 - (G.skill > 1 ? 0 : 0.03);
      say(ais[0].id, play ? 'Vamos jogar!' : 'Corro!', play ? 'good' : 'bad');
      await wait(1100);
    }
    if (play) { H.value = 3; renderVal(); log('Mão de onze: vale 3 pontos, sem truco.'); await wait(700); }
    else { H.ended = true; H.winner = team ^ 1; H.points = 1; }
  }

  // ---------------- turnos ----------------
  async function takeTurn(seat) {
    const H = G.H, p = G.seats[seat];
    H.turnSeat = seat; renderSeats();
    while (true) {
      let act;
      if (p.human) {
        renderHand(true); renderActions(true); Core.snd('turn');
        log('Sua vez de jogar.');
        act = await humanInput();
        renderHand(false); renderActions(false);
      } else {
        log(`Vez de ${p.short}…`);
        act = await aiAction(seat);
      }
      if (act.type === 'truco') {
        await doBet(seat);
        if (H.ended) return;
        continue;
      }
      playCard(seat, act.card, act.covered);
      await wait(p.human ? 450 : 350);
      return;
    }
  }

  function playCard(seat, card, covered) {
    const H = G.H, p = G.seats[seat];
    p.hand = p.hand.filter(c => c !== card);
    const cardEl = Core.cardEl(card, { back: covered, cls: covered ? 'covered' : '' });
    const el = h('div', { class: 'tcard s-' + posOf(seat) }, cardEl);
    G.ui.center.append(el);
    H.table.push({ seat, card, covered, pw: covered ? -1 : card.pw, el });
    Core.snd('card');
    renderSeats(); renderHand(false);
    if (covered) say(seat, 'Cobri', '');
    G.cover = false;
  }

  // ---------------- apostas ----------------
  async function doBet(callerSeat) {
    const H = G.H;
    let caller = callerSeat, callerTeam = G.seats[caller].team;
    while (true) {
      const prop = nextVal(H.value);
      say(caller, BETNAME[prop], 'shout'); Core.snd('shout');
      log(`${G.seats[caller].short || G.seats[caller].name}: ${BETNAME[prop]}`);
      await wait(1100);
      const resp = await respond(callerTeam, prop, caller);
      if (resp.r === 'run') {
        say(resp.seat, 'Corro!', 'bad'); await wait(1000);
        H.ended = true; H.winner = callerTeam; H.points = H.value; return;
      }
      if (resp.r === 'accept') {
        say(resp.seat, 'Desce!', 'good'); H.value = prop; H.lastRaiser = callerTeam; renderVal(); Core.snd('knock'); await wait(900); return;
      }
      // aumentar
      H.value = prop; H.lastRaiser = callerTeam ^ 1; renderVal();
      callerTeam ^= 1; caller = resp.seat;
    }
  }
  function askBox(title, text, extra, buttons) {
    const box = h('div', { class: 't-ask' }, h('h3', null, title), h('p', null, text), extra || null,
      h('div', { class: 'btns' }, buttons.map(b => h('button', { class: 'btn lg ' + (b.cls || ''), onclick: () => { box.remove(); G.askRes && G.askRes(b.v); } }, b.text))));
    return box;
  }
  function askResult() { return new Promise(res => { G.askRes = res; }); }

  async function respond(callerTeam, prop, callerId) {
    const rt = callerTeam ^ 1;
    const team = G.seats.filter(p => p.team === rt);
    const human = team.find(p => p.human);
    if (human) {
      const canUp = prop < 12;
      const btns = [{ text: 'Aceitar', cls: 'good', v: 'accept' }, { text: 'Correr', cls: 'danger', v: 'run' }];
      if (canUp) btns.splice(1, 0, { text: BETNAME[nextVal(prop)].replace('!', '') + '!', cls: 'primary', v: 'raise' });
      const who = G.seats[callerId];
      G.ui.table.append(askBox(BETNAME[prop], `${who.short || who.name} pediu ${BETNAME[prop].replace('!', '')}. Vale ${prop} pontos. E agora?`, null, btns));
      const r = await askResult();
      return { r, seat: human.id };
    }
    // IA responde
    await wait(900 + rand(0, 700));
    const spk = team[0];
    let s = team.reduce((a, p) => a + strengthOf(p), 0) / team.length;
    s += (Math.random() - .5) * 0.18 / G.skill;
    const thr = { 3: .40, 6: .52, 9: .64, 12: .73 }[prop] - spk.style.aggr * .09 + (G.skill < 1 ? -.04 : 0);
    let r;
    if (prop < 12 && s >= thr + .22 && Math.random() < .55 + spk.style.aggr * .3) r = 'raise';
    else if (s >= thr) r = 'accept';
    else if (prop <= 6 && Math.random() < spk.style.bluff * .3) r = 'accept'; // blefe
    else r = 'run';
    // para 'aumentar' precisa poder
    return { r, seat: spk.id };
  }

  // ---------------- IA ----------------
  const wgt = pw => pw >= 14 ? 1 : pw >= 13 ? .88 : pw >= 12 ? .78 : pw >= 11 ? .64 : pw === 10 ? .48 : pw === 9 ? .34 : pw === 8 ? .2 : pw === 7 ? .12 : .05;
  function strengthOf(p, full) {
    const H = G.H, team = p.team;
    const ws = p.hand.map(c => wgt(c.pw)).sort((a, b) => b - a);
    const res = H.results;
    if (!ws.length) return .3;
    let s;
    if (res.length === 0 || full) {
      s = ws[0] * .45 + (ws[1] || 0) * .33 + (ws[2] || 0) * .22;
      if (ws[0] >= .64 && (ws[1] || 0) >= .48) s += .12;
    } else if (res.length === 1) {
      if (res[0] === team) s = .35 + .65 * ws[0];
      else if (res[0] === 'T') s = .2 + .8 * ws[0];
      else s = Math.min(1, Math.pow(ws[0], .7) * Math.pow(ws[1] || 0, .7) * 1.1);
    } else s = ws[0];
    return Math.max(0, Math.min(1, s));
  }
  async function aiAction(seat) {
    const p = G.seats[seat], H = G.H;
    await wait(650 + rand(0, 550));
    if (canRaise(p.team)) {
      const s = strengthOf(p) + (Math.random() - .5) * .16 / G.skill;
      const prop = nextVal(H.value);
      const need = { 3: .62, 6: .74, 9: .84, 12: .9 }[prop] - p.style.aggr * .08;
      if (s >= need && Math.random() < .5 + p.style.aggr * .3) return { type: 'truco' };
      if (prop === 3 && s < .28 && Math.random() < p.style.bluff * .09) return { type: 'truco' };
    }
    return Object.assign({ type: 'play' }, aiChoose(seat));
  }
  function aiChoose(seat) {
    const p = G.seats[seat], H = G.H, N = G.N;
    const hand = p.hand.slice().sort((a, b) => b.pw - a.pw);
    const t = H.trick, table = H.table, myTeam = p.team;
    if (H.ferro) return { card: pick(hand), covered: false };
    const weakest = hand[hand.length - 1];
    let card, covered = false;
    // modo "fácil": às vezes joga aleatório
    if (G.skill < 1 && Math.random() < .25) return { card: pick(hand), covered: false };
    if (!table.length) {
      if (t === 0) {
        if (hand[0].pw >= 13 && p.style.aggr < .5 && hand.length > 1) card = hand[1];
        else if (Math.random() < .3 + p.style.aggr * .3) card = hand[0];
        else card = hand[Math.min(1, hand.length - 1)];
      } else {
        const first = H.results[0];
        if (first === myTeam && hand.length > 1 && Math.random() < .3) card = weakest;
        else card = hand[0];
      }
    } else {
      let best = table[0];
      table.forEach(x => { if (x.pw > best.pw) best = x; });
      const bestTeam = G.seats[best.seat].team;
      const winners = hand.filter(c => c.pw > best.pw).sort((a, b) => a.pw - b.pw);
      let oppLeft = 0;
      for (let k = table.length; k < N; k++) { const s2 = (table[0].seat + k) % N; if (G.seats[s2].team !== myTeam) oppLeft++; }
      if (bestTeam === myTeam) {
        if (oppLeft === 0 || best.pw >= 11) card = weakest;
        else card = winners.length ? winners[0] : weakest;
      } else if (winners.length) card = winners[0];
      else {
        const eq = hand.find(c => c.pw === best.pw);
        card = (eq && t === 0) ? eq : weakest;
        if (t > 0 && card.pw < best.pw && Math.random() < p.style.cover) covered = true;
      }
    }
    return { card, covered };
  }

  Core.register('truco', { mount, unmount });
})();
