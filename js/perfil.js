/* ============================================================
   PERFIL — adivinhe a Pessoa, o Lugar, a Coisa ou o Ano
   · 20 dicas por carta, da mais vaga à mais óbvia
   · a dica 1 vale 20 pontos e cada dica nova vale 1 ponto a menos
   · modos: treino solo, contra IAs e online com amigos
   ============================================================ */
(function () {
  'use strict';
  const { h, sleep, rand, pick, shuffle } = Core;
  const Text = window.TextUtil;
  class Abort extends Error { }
  let G = null;

  const CATS = {
    pessoa: { n: 'Pessoa', ic: '🧑', c: '#e9c46a', ph: 'Quem sou eu?' },
    lugar: { n: 'Lugar', ic: '📍', c: '#6ee7b7', ph: 'Que lugar sou eu?' },
    coisa: { n: 'Coisa', ic: '🧰', c: '#93c5fd', ph: 'O que sou eu?' },
    ano: { n: 'Ano', ic: '📅', c: '#f9a8d8', ph: 'Que ano é este?' }
  };
  // k = dica em que costuma reconhecer · q = chance de acertar quando arrisca · imp = impulsividade (chuta sem saber)
  // str = especialidade por categoria (negativo = reconhece mais cedo) · fatigue = fica mais ousado quando perde
  const PERSONAS = [
    { name: 'Sabichão', emoji: '🦉', k: 8, q: .95, imp: 0, wait: 0, str: { pessoa: -1, ano: -2, lugar: 1, coisa: 2 }, desc: 'Craque em história, fraco em objetos' },
    { name: 'Palpiteira', emoji: '🦊', k: 12, q: .8, imp: .12, wait: 0, str: { coisa: -2, pessoa: -1, ano: 2, lugar: 0 }, desc: 'Chuta até sem certeza' },
    { name: 'Cautelosa', emoji: '🐢', k: 10, q: .97, imp: 0, wait: 1, str: { lugar: -1, coisa: -1, pessoa: 0, ano: 1 }, desc: 'Só arrisca com certeza' },
    { name: 'Veterano', emoji: '🦁', k: 9, q: .9, imp: .04, wait: 0, str: { pessoa: -2, lugar: -1, coisa: 1, ano: 0 }, desc: 'Experiente em gente e lugares' },
    { name: 'Curioso', emoji: '🐙', k: 11, q: .88, imp: .06, wait: 0, str: { lugar: -2, coisa: -1, ano: 1, pessoa: 1 }, desc: 'Adora viajar e inventar' },
    { name: 'Professora', emoji: '🦉', k: 9, q: .93, imp: .02, wait: 0, str: { ano: -3, pessoa: -1, coisa: 1, lugar: 0 }, desc: 'Datas e fatos na ponta da língua' }
  ];
  const TURN_MS = 45000;

  // ---------------- baralho ----------------
  function makeDeck(cat, n) {
    const seen = Core.store.get('perfil.seen', {});
    let pool = window.PERFIL_CARDS.filter(c => cat === 'todas' || c.cat === cat);
    pool = shuffle(pool).sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0));           // cartas menos vistas primeiro
    const deck = []; while (deck.length < n) deck.push(...(deck.length ? shuffle(pool) : pool));
    return deck.slice(0, n);
  }
  function markSeen(card) { const s = Core.store.get('perfil.seen', {}); s[card.id] = (s[card.id] || 0) + 1; Core.store.set('perfil.seen', s); }

  // ---------------- montagem ----------------
  function mount(root) {
    G = { root, tok: {}, mode: null, askId: 0, my: 0, cfg: { N: Core.store.get('pf.n', 3), cat: Core.store.get('pf.cat', 'todas'), rounds: Core.store.get('pf.rounds', 8), skill: Core.store.get('pf.skill', 1) } };
    root.append(Core.topbar('PERFIL', h('button', { class: 'btn icon', title: 'Regras', onclick: showRules }, '?')));
    G.box = h('div', { class: 'pf' }); root.append(G.box);
    G.P = Party.create({
      game: 'perfil', title: '🎯 Sala do Perfil', key: 'perfil.room', max: 5, box: G.box, createLabel: '🎯 Criar sala e convidar',
      extra: friends => ({ n: Math.min(6, Math.max(G.cfg.N, friends.length + 1)), skill: G.cfg.skill }),
      onHostStart: hostStart, onGuestStart: guestStart, onPub: onPub, onAct: onAct, onLeft: () => { if (G) { G.mode = null; showSetup(); } }
    });
    showSetup();
    if (Core.pendingRoom && Core.pendingRoom.game === 'perfil') { const inv = Core.pendingRoom; Core.pendingRoom = null; G.P.join(inv); }
  }
  function unmount() { if (G) { G.tok = {}; clearInterval(G.tick); G.P.destroy(); } G = null; }

  function showRules() {
    Core.modal({
      title: 'Como jogar Perfil', buttons: [{ text: 'Entendi', cls: 'primary', value: 1 }],
      body: h('div', { class: 'small', style: { lineHeight: 1.55 }, html:
        '<b>Objetivo:</b> descobrir a <b>Pessoa</b>, o <b>Lugar</b>, a <b>Coisa</b> ou o <b>Ano</b> escondido numa carta com <b>20 dicas</b>, da mais vaga à mais óbvia.<br>' +
        '<b>Pontuação:</b> a dica 1 vale <b>20 pontos</b>, a dica 2 vale 19… e a dica 20 vale apenas <b>1 ponto</b>. Quanto mais cedo acertar, mais pontos.<br>' +
        '<b>Turnos:</b> cada dica é revelada para um jogador, em sequência. Na sua vez você pode <b>chutar</b> a resposta ou <b>passar</b> para a próxima dica.<br>' +
        '<b>Errou?</b> Quem erra um palpite fica <b>fora da rodada</b> (mas continua no jogo). Se todos erram ou as 20 dicas acabam, ninguém pontua.<br>' +
        '<b>Palpites:</b> não precisa acertar a grafia exata: acentos, maiúsculas e pequenos erros de digitação são aceitos (ex.: “santos dumont”, “einstein”).<br>' +
        '<b>Treino solo:</b> sem adversários. Errar revela a próxima dica automaticamente.<br>' +
        '<b>Online:</b> convide amigos; vagas livres viram IAs. Cada jogador tem 45 s por vez.' })
    });
  }

  function showSetup() {
    G.tok = {}; G.mode = null; G.S = null; G.v = null; G.ui = null; G.act = null; clearInterval(G.tick); G.box.innerHTML = '';
    const seg = (arr, key, store) => {
      const wrap = h('div', { class: 'seg full' });
      arr.forEach(([k, t]) => wrap.append(h('button', { class: G.cfg[key] === k ? 'active' : '', onclick: e => { G.cfg[key] = k; Core.store.set(store, k); Core.$$('button', wrap).forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); } }, t)));
      return wrap;
    };
    const lobby = G.P.lobbyEl();
    G.box.append(h('div', { class: 'tr-setup' },
      h('div', { class: 'pf-hero' }, h('div', { class: 'pf-logo' }, '🎯 PERFIL'), h('div', { class: 'muted small' }, '20 dicas, 20 pontos. Quanto antes você acertar, mais ganha.')),
      h('div', { class: 'panel' }, h('h3', null, 'Categoria'), seg([['todas', 'Todas'], ['pessoa', '🧑 Pessoa'], ['lugar', '📍 Lugar'], ['coisa', '🧰 Coisa'], ['ano', '📅 Ano']], 'cat', 'pf.cat')),
      h('div', { class: 'panel' }, h('h3', null, 'Rodadas'), seg([[5, '5'], [8, '8'], [12, '12']], 'rounds', 'pf.rounds')),
      h('div', { class: 'panel' }, h('h3', null, 'Jogadores (você + IAs)'), seg([[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], 'N', 'pf.n'),
        h('h3', { style: { marginTop: '12px' } }, 'Nível das IAs'), seg([[0.6, 'Fácil'], [1, 'Normal'], [1.5, 'Difícil']], 'skill', 'pf.skill'),
        h('div', { class: 'small muted', style: { marginTop: '6px' } }, PERSONAS.map(p => `${p.emoji} ${p.name}`).join(' · '))),
      h('button', { class: 'btn primary lg block', onclick: () => startOffline(false) }, '▶ Jogar contra IAs'),
      h('button', { class: 'btn block', onclick: () => startOffline(true) }, '🎓 Treino solo'),
      lobby ? h('div', null, lobby) : null,
      h('button', { class: 'btn block', onclick: showRules }, '📖 Como jogar'),
      h('div', { class: 'small muted center' }, `Recorde no treino: ${Core.store.get('pf.best', 0)} pts · ${window.PERFIL_CARDS.length} cartas no baralho`)));
  }

  // ---------------- estado do jogo ----------------
  function newState(seats, cfg, solo) {
    const N = seats.length;
    return { N, solo: !!solo, rounds: cfg.rounds, cat: cfg.cat, skill: cfg.skill, round: 0, clueNo: 0, turn: 0, phase: 'play', ask: null, deadline: 0, reveal: null, card: null, log: [], over: null,
      deck: makeDeck(cfg.cat, cfg.rounds), players: seats.map((s, i) => Object.assign({ id: i, score: 0, locked: false }, s)) };
  }
  function seatsOffline(N) {
    const ai = shuffle(PERSONAS).slice(0, N - 1);
    return [{ name: Core.settings.name, avatar: '🙂', human: true, uid: '' }].concat(ai.map(p => ({ name: p.name, avatar: p.emoji, human: false, ai: p, uid: '' })));
  }
  function startOffline(solo) {
    G.tok = {}; const tok = G.tok; G.mode = solo ? 'solo' : 'offline'; G.my = 0; G.askId = 0;
    G.S = newState(solo ? [{ name: Core.settings.name, avatar: '🙂', human: true, uid: '' }] : seatsOffline(G.cfg.N), G.cfg, solo);
    buildUI(); refresh();
    runGame(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); });
  }
  const say = t => { const S = G.S; S.log.push(t); if (S.log.length > 12) S.log.shift(); };
  const wait = async ms => { const tok = G.tok; await sleep(ms); if (!G || G.tok !== tok) throw new Abort(); };

  // ---------------- laço do jogo (anfitrião / offline) ----------------
  async function runGame(tok) {
    const S = G.S;
    for (S.round = 1; S.round <= S.rounds; S.round++) {
      S.card = S.deck[S.round - 1]; markSeen(S.card); S.reveal = null;
      await playRound();
      S.phase = 'reveal'; S.ask = null; S.deadline = 0;
      refresh(); await pubNow();
      Core.snd(S.reveal.win ? 'win' : 'knock');
      await waitContinue();
    }
    S.phase = 'over'; S.ask = null;
    const rank = S.players.slice().sort((a, b) => b.score - a.score);
    S.over = { rank: rank.map(p => ({ n: p.name, e: p.avatar, s: p.score, u: p.uid || '', me: p.id })) };
    refresh(); await pubNow();
    finish();
  }
  async function playRound() {
    const S = G.S; S.clueNo = 1; S.phase = 'play'; S.turn = (S.round - 1) % S.N; S.players.forEach(p => { p.locked = false; });
    let win = null;
    say(`Rodada ${S.round}: ${CATS[S.card.cat].ic} ${CATS[S.card.cat].n}!`);
    for (let guard = 0; guard < 120 && S.clueNo <= 20; guard++) {
      let k = 0; while (S.players[S.turn].locked && k++ < S.N) S.turn = (S.turn + 1) % S.N;
      const p = S.players[S.turn]; if (p.locked) break;                                       // todos fora da rodada
      const remote = !!p.uid;
      S.ask = { id: ++G.askId, seat: p.id, u: p.uid || '' };
      S.deadline = remote ? Date.now() + TURN_MS : 0;
      refresh(); await pubNow();
      const a = await getAction(p);
      S.ask = null;
      if (a.type === 'guess' && a.s) {
        say(`${p.name} chutou: “${String(a.s).slice(0, 40)}”.`);
        if (Text.matchAnswer(a.s, S.card.aliases).ok) {
          const pts = 21 - S.clueNo; p.score += pts; win = { seat: p.id, pts, clue: S.clueNo };
          say(`✅ ${p.name} acertou na dica ${S.clueNo} e ganhou ${pts} ponto${pts > 1 ? 's' : ''}!`); break;
        }
        if (S.solo) say('❌ Errou! Uma nova dica foi revelada.');
        else { p.locked = true; say(`❌ ${p.name} errou e está fora desta rodada.`); }
      } else say(`${p.name} passou.`);
      S.clueNo++; S.turn = (S.turn + 1) % S.N;
      if (!S.players.some(q => !q.locked)) break;
    }
    S.clueNo = Math.min(S.clueNo, 20);
    S.reveal = { answer: S.card.answer, cat: S.card.cat, win };
    if (!win) say(`Ninguém acertou. Era: ${S.card.answer}.`);
  }
  function getAction(p) {
    if (p.human && !p.uid) return new Promise(res => { G.act = { res }; });
    if (p.uid) return waitRemote(p);
    return aiAction(p);
  }
  function waitRemote(p) {
    const askId = G.askId;
    return new Promise(res => {
      const fin = v => { if (G.waiter && G.waiter.askId === askId) { G.waiter = null; clearInterval(iv); clearTimeout(t); res(v); } };
      G.waiter = { uid: p.uid, askId, res: fin };
      const t = setTimeout(() => fin({ type: 'pass' }), TURN_MS + 1500);
      const iv = setInterval(() => { if (G.P.online[p.uid] === false) fin({ type: 'pass' }); }, 1500);
    });
  }
  function onAct(uid, act) {                                                                  // anfitrião recebeu uma ação
    const w = G && G.waiter; if (!w || w.uid !== uid || act.a !== w.askId) return;
    if (act.type === 'guess') w.res({ type: 'guess', s: String(act.s || '').slice(0, 40) }); else w.res({ type: 'pass' });
  }
  async function waitContinue() {
    const S = G.S, online = G.mode === 'host';
    await Promise.race([new Promise(res => { G.cont = res; }), online ? wait(8000) : new Promise(() => { })]);
    G.cont = null;
  }
  function finish() {
    const S = G.S, top = Math.max(...S.players.map(p => p.score));
    const me = S.players[G.my]; if (me && me.score === top && top > 0) Core.addStat('perfilWin');
    if (S.solo) { const best = Core.store.get('pf.best', 0); if (me.score > best) Core.store.set('pf.best', me.score); }
  }

  // ---------------- IA ----------------
  async function aiAction(p) {
    const S = G.S, c = S.clueNo, ai = p.ai;
    await wait(rand(900, 1700));
    if (!G.aiK) G.aiK = {};
    const key = S.round + ':' + p.id;
    if (G.aiK[key] == null) {
      const dif = ((S.card.d || 2) - 2) * 2.2;                                            // carta difícil: reconhece mais tarde
      const spec = (ai.str && ai.str[S.card.cat]) || 0;                                    // especialidade da personalidade
      G.aiK[key] = Math.max(2, Math.round(ai.k + (Math.random() * 6 - 3) + (S.skill < 1 ? 3 : S.skill > 1 ? -2 : 0) + dif + spec));
    }
    const k = G.aiK[key] + ai.wait;
    const wrongGuess = () => {
      const others = window.PERFIL_CARDS.filter(x => x.cat === S.card.cat && x.id !== S.card.id);
      const near = others.filter(x => Math.abs((x.d || 2) - (S.card.d || 2)) <= 1);
      return { type: 'guess', s: pick(near.length ? near : others).answer };
    };
    if (c >= k) return Math.random() < ai.q ? { type: 'guess', s: S.card.answer } : wrongGuess();
    if (ai.imp && Math.random() < ai.imp * (S.skill < 1 ? 1.6 : 1)) return Math.random() < .12 ? { type: 'guess', s: S.card.answer } : wrongGuess();
    return { type: 'pass' };
  }

  // ---------------- visão (o que cada jogador enxerga) ----------------
  function viewOf(me) {
    const S = G.S;
    return {
      N: S.N, solo: S.solo ? 1 : 0, round: S.round, rounds: S.rounds, cat: S.card ? S.card.cat : S.cat, clueNo: S.clueNo, phase: S.phase, turn: S.turn,
      clues: S.card && S.phase !== 'over' ? (S.phase === 'reveal' ? S.card.clues : S.card.clues.slice(0, Math.min(20, S.clueNo))) : [], ask: S.ask, deadline: S.deadline,
      players: S.players.map(p => ({ n: p.name, e: p.avatar, s: p.score, l: p.locked ? 1 : 0, u: p.uid || '' })),
      reveal: S.phase === 'reveal' ? S.reveal : null, log: S.log.slice(-6), over: S.over, me
    };
  }
  function refresh() { if (!G || !G.S) return; G.v = viewOf(G.my); renderAll(G.v); if (G.mode === 'host') pubSchedule(); }
  const pubSchedule = () => G.P.publish(() => viewOf(-1));
  const pubNow = () => (G.mode === 'host' ? G.P.publishNow(viewOf(-1)) : Promise.resolve());

  // ---------------- interface ----------------
  function buildUI() {
    G.box.innerHTML = '';
    G.ui = { head: h('div', { class: 'pf-head' }), clues: h('div', { class: 'pf-clues' }), pl: h('div', { class: 'pf-pl' }), ctl: h('div', { class: 'pf-ctl' }), log: h('div', { class: 'pf-log' }), reveal: h('div', { class: 'pf-reveal' }) };
    G.box.append(G.ui.head, G.ui.reveal, G.ui.ctl, G.ui.clues, G.ui.pl, G.ui.log,
      h('div', { class: 'row', style: { justifyContent: 'center' } },
        h('button', { class: 'btn sm', onclick: showRules }, '📖 Regras'),
        G.mode === 'host' || G.mode === 'guest' ? h('button', { class: 'btn sm danger', onclick: () => G.P.leave(true) }, '⎋ Sair') : h('button', { class: 'btn sm', onclick: showSetup }, '⚙ Novo jogo')));
    clearInterval(G.tick); G.tick = setInterval(tickTimer, 500);
  }
  const mineAsk = v => v.ask && v.me >= 0 && v.ask.seat === v.me;
  function renderAll(v) {
    if (!G.ui) return;
    const cat = CATS[v.cat] || CATS.pessoa, left = 21 - Math.min(20, v.clueNo);
    G.ui.head.innerHTML = '';
    G.ui.head.append(
      h('div', { class: 'pf-cat', style: { '--cc': cat.c } }, h('span', null, cat.ic), h('b', null, cat.n)),
      h('div', { class: 'grow small muted' }, v.phase === 'over' ? 'Fim de jogo' : `Rodada ${v.round}/${v.rounds}`),
      v.phase === 'play' ? h('div', { class: 'pf-pts' }, h('b', null, left), h('small', null, 'pontos em jogo')) : null);
    // dicas (a mais nova no topo)
    G.ui.clues.innerHTML = '';
    if (v.phase === 'over') G.ui.clues.style.display = 'none'; else G.ui.clues.style.display = '';
    const n = v.clues.length, shown = Math.min(20, v.clueNo);
    (v.phase === 'reveal' ? v.clues.map((t, i) => [t, i + 1]) : v.clues.map((t, i) => [t, i + 1]).reverse()).forEach(([t, num], i) => {
      G.ui.clues.append(h('div', { class: 'pf-clue' + (num === n && v.phase === 'play' ? ' new' : '') + (v.phase === 'reveal' && num > shown ? ' unrev' : '') }, h('b', { class: 'n' }, num), h('p', null, t), h('span', { class: 'v' }, (21 - num) + ' pts')));
    });
    // resultado da rodada
    G.ui.reveal.innerHTML = ''; G.ui.reveal.style.display = v.reveal ? '' : 'none';
    if (v.reveal) {
      const w = v.reveal.win, who = w ? v.players[w.seat] : null;
      G.ui.reveal.append(h('div', { class: 'pf-ans' + (w ? ' ok' : '') }, h('small', null, 'A resposta era'), h('b', null, v.reveal.answer),
        h('div', { class: 'small' }, w ? `${who.e} ${who.n} acertou na dica ${w.clue}: +${w.pts} pts` : 'Ninguém acertou desta vez.')));
    }
    renderCtl(v); renderPlayers(v);
    G.ui.log.innerHTML = ''; v.log.slice().reverse().forEach((l, i) => G.ui.log.append(h('div', { class: i ? 'old' : '' }, l)));
    if (v.phase === 'over' && !G.shownOver) { G.shownOver = true; showOver(v); }
    if (v.phase !== 'over') G.shownOver = false;
  }
  function renderCtl(v) {
    const key = v.phase + ':' + (v.ask ? v.ask.id : 0) + ':' + (mineAsk(v) ? 1 : 0) + ':' + v.round;
    if (G.ctlKey === key) return; G.ctlKey = key;
    const c = G.ui.ctl; c.innerHTML = '';
    if (v.phase === 'play' && mineAsk(v) && G.mode === 'guest' && G.sentAsk === v.ask.id) {
      c.append(h('div', { class: 'pf-wait' }, 'Enviado… ⏳'));
    } else if (v.phase === 'play' && mineAsk(v)) {
      const cat = CATS[v.cat] || CATS.pessoa;
      const input = h('input', { type: 'text', maxlength: 40, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false', placeholder: cat.ph, inputmode: v.cat === 'ano' ? 'numeric' : 'text', class: 'pf-in' });
      const go = () => { const t = input.value.trim(); if (!t) { Core.toast('Digite seu palpite ou toque em Passar'); return; } submit({ type: 'guess', s: t }); };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      c.append(h('div', { class: 'pf-turn' }, '🎯 Sua vez! ', h('span', { class: 'pf-timer' })),
        h('div', { class: 'row' }, input, h('button', { class: 'btn primary', onclick: go }, 'Chutar')),
        h('button', { class: 'btn block', onclick: () => submit({ type: 'pass' }) }, v.solo ? '💡 Próxima dica' : '⏭ Passar (próxima dica)'));
      setTimeout(() => { try { input.focus(); } catch (e) { /* ok */ } }, 50);
    } else if (v.phase === 'play') {
      const p = v.ask ? v.players[v.ask.seat] : null;
      c.append(h('div', { class: 'pf-wait' }, p ? `${p.e} Vez de ${p.n}… ` : '…', h('span', { class: 'pf-timer' })));
    } else if (v.phase === 'reveal') {
      c.append(G.mode === 'guest' ? h('div', { class: 'pf-wait' }, 'Próxima rodada em instantes…') : h('button', { class: 'btn primary lg block', onclick: () => { if (G.cont) G.cont(); } }, v.round >= v.rounds ? '🏁 Ver resultado' : '▶ Próxima rodada'));
    }
  }
  function tickTimer() {
    const v = G && G.v; if (!v) return;
    const el = G.ui && Core.$('.pf-timer', G.ui.ctl); if (!el) return;
    el.textContent = v.deadline ? Math.max(0, Math.ceil((v.deadline - Date.now()) / 1000)) + ' s' : '';
  }
  function renderPlayers(v) {
    G.ui.pl.innerHTML = '';
    if (v.solo) { G.ui.pl.append(h('div', { class: 'pf-p me' }, h('span', { class: 'av' }, v.players[0].e), h('b', null, v.players[0].n), h('i', null, v.players[0].s + ' pts'))); return; }
    v.players.forEach((p, i) => G.ui.pl.append(h('div', { class: 'pf-p' + (v.ask && v.ask.seat === i && v.phase === 'play' ? ' turn' : '') + (i === v.me ? ' me' : '') + (p.l ? ' out' : '') },
      h('span', { class: 'av' }, p.e), h('b', null, p.n + (i === v.me ? ' (você)' : '')), h('i', null, p.s + ' pts' + (p.l ? ' · 🔒 fora' : '')))));
  }
  function submit(a) {
    if (G.mode === 'guest') {
      const v = G.v; if (!v || !mineAsk(v)) return;
      G.sentAsk = v.ask.id; G.P.send(Object.assign({ a: v.ask.id }, a)); G.ctlKey = 'sent'; G.ui.ctl.innerHTML = ''; G.ui.ctl.append(h('div', { class: 'pf-wait' }, 'Enviado… ⏳'));
    } else if (G.act) { const r = G.act.res; G.act = null; r(a); }
  }
  async function showOver(v) {
    const rank = v.over.rank, top = rank[0];
    const meRow = rank.find(r => r.me === v.me), youWon = meRow && meRow.s === top.s && top.s > 0;
    Core.snd(youWon ? 'win' : 'lose');
    const body = h('div', null, rank.map((r, i) => h('div', { class: 'row sb', style: { padding: '4px 0' } }, h('span', null, `${i + 1}º ${r.e} ${r.n}`), h('b', null, r.s + ' pts'))));
    const buttons = G.mode === 'host' || G.mode === 'guest' ? [{ text: 'Sair da sala', cls: 'primary', value: 'leave' }] : [{ text: 'Menu', cls: 'ghost', value: 'm' }, { text: 'Jogar de novo', cls: 'primary', value: 'r' }];
    const r = await Core.modal({ title: youWon ? 'Você venceu! 🏆' : `${top.n} venceu!`, body, buttons, dismiss: false });
    if (!G) return;
    if (r === 'leave') G.P.leave(false); else if (r === 'r') showSetup(); else Core.go('');
  }

  // ---------------- online ----------------
  async function hostStart({ uids, players, me }) {
    G.tok = {}; const tok = G.tok; G.mode = 'host'; G.my = 0; G.askId = 0; G.aiK = {};
    const N = Math.min(6, Math.max(G.cfg.N, uids.length + 1));
    const seats = [{ name: me.name, avatar: me.avatar, human: true, uid: '' }];
    uids.forEach(u => seats.push({ name: players[u].name, avatar: players[u].avatar, human: true, uid: u }));
    shuffle(PERSONAS).slice(0, Math.max(0, N - seats.length)).forEach(p => seats.push({ name: p.name, avatar: p.emoji, human: false, ai: p, uid: '' }));
    G.S = newState(seats, G.cfg, false);
    G.S.round = 1; G.S.card = G.S.deck[0]; G.S.clueNo = 1;
    buildUI(); refresh();
    if (!(await G.P.begin(viewOf(-1)))) { G.P.leave(false); return; }
    runGame(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); });
  }
  function guestStart() {
    G.tok = {}; G.mode = 'guest'; G.v = null; G.my = -1; G.S = null; G.box.innerHTML = '';
    G.box.append(h('div', { class: 'muted center', style: { padding: '30px' } }, 'Conectando à partida…'));
  }
  function onPub(pub) {
    if (!G || G.mode !== 'guest') return;
    const uid = Core.Social.user.uid;
    const v = Object.assign({ clues: [], log: [], players: [] }, pub);
    v.me = v.players.findIndex(p => p.u === uid);
    if (!G.ui) buildUI();
    G.v = v; G.my = v.me; renderAll(v);
  }

  Core.register('perfil', { mount, unmount, joinRoom: inv => { if (G) G.P.join(inv); } });
  window.PerfilDebug = { state: () => G && G.S, view: () => G && G.v, CATS };
})();
