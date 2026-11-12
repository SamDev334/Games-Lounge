/* ============================================================
   METRÓPOLE — jogo de negociação e gerenciamento de propriedades
   (2 a 6 jogadores, contra IAs). Tema: cidade moderna.
   ============================================================ */
(function () {
  'use strict';
  const { h, sleep, rand, pick, shuffle } = Core;
  const fmt = n => '$' + Math.round(n).toLocaleString('pt-BR');
  class Abort extends Error { }
  let M = null;

  // ---------------- dados do tabuleiro ----------------
  const GR = {
    brown: { c: '#8b5a3c', n: 'Marrom', hc: 50 }, lblue: { c: '#6ec6ea', n: 'Azul-claro', hc: 50 },
    pink: { c: '#e66bb0', n: 'Rosa', hc: 100 }, orange: { c: '#f29b3b', n: 'Laranja', hc: 100 },
    red: { c: '#e04646', n: 'Vermelho', hc: 150 }, yellow: { c: '#f3d03e', n: 'Amarelo', hc: 150 },
    green: { c: '#3fae5a', n: 'Verde', hc: 200 }, dblue: { c: '#3a5fd6', n: 'Azul-escuro', hc: 200 }
  };
  const T = [];
  const def = (i, o) => { T[i] = Object.assign({ i }, o); };
  const prop = (i, n, g, p, r) => def(i, { n, t: 'prop', g, p, r });
  def(0, { n: 'Partida', t: 'start', ic: '🏁' });
  prop(1, 'Vila Esperança', 'brown', 60, [2, 10, 30, 90, 160, 250]);
  def(2, { n: 'Revés', t: 'reves', ic: '⚡' });
  prop(3, 'Beco do Porto', 'brown', 60, [4, 20, 60, 180, 320, 450]);
  def(4, { n: 'Imposto de Renda', t: 'tax', amt: 200, ic: '💸' });
  def(5, { n: 'Metrô Azul', t: 'station', p: 200, ic: '🚇' });
  prop(6, 'Rua do Mercado', 'lblue', 100, [6, 30, 90, 270, 400, 550]);
  def(7, { n: 'Sorte', t: 'sorte', ic: '🍀' });
  prop(8, 'Praça da Fonte', 'lblue', 100, [6, 30, 90, 270, 400, 550]);
  prop(9, 'Jardim das Acácias', 'lblue', 120, [8, 40, 100, 300, 450, 600]);
  def(10, { n: 'Delegacia', t: 'jail', ic: '🚓' });
  prop(11, 'Av. das Palmeiras', 'pink', 140, [10, 50, 150, 450, 625, 750]);
  def(12, { n: 'Cia. de Energia', t: 'util', p: 150, ic: '💡' });
  prop(13, 'Rua dos Ipês', 'pink', 140, [10, 50, 150, 450, 625, 750]);
  prop(14, 'Alameda Verde', 'pink', 160, [12, 60, 180, 500, 700, 900]);
  def(15, { n: 'Metrô Verde', t: 'station', p: 200, ic: '🚇' });
  prop(16, 'Vila Industrial', 'orange', 180, [14, 70, 200, 550, 750, 950]);
  def(17, { n: 'Revés', t: 'reves', ic: '⚡' });
  prop(18, 'Cais do Rio', 'orange', 180, [14, 70, 200, 550, 750, 950]);
  prop(19, 'Distrito Tech', 'orange', 200, [16, 80, 220, 600, 800, 1000]);
  def(20, { n: 'Parque Central', t: 'park', ic: '🌳' });
  prop(21, 'Av. Central', 'red', 220, [18, 90, 250, 700, 875, 1050]);
  def(22, { n: 'Sorte', t: 'sorte', ic: '🍀' });
  prop(23, 'Rua do Teatro', 'red', 220, [18, 90, 250, 700, 875, 1050]);
  prop(24, 'Parque das Artes', 'red', 240, [20, 100, 300, 750, 925, 1100]);
  def(25, { n: 'Metrô Vermelho', t: 'station', p: 200, ic: '🚇' });
  prop(26, 'Orla Sul', 'yellow', 260, [22, 110, 330, 800, 975, 1150]);
  prop(27, 'Marina Bela Vista', 'yellow', 260, [22, 110, 330, 800, 975, 1150]);
  def(28, { n: 'Cia. de Água', t: 'util', p: 150, ic: '🚰' });
  prop(29, 'Skyline Norte', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]);
  def(30, { n: 'Vá p/ Delegacia', t: 'gojail', ic: '👮' });
  prop(31, 'Torre Financeira', 'green', 300, [26, 130, 390, 900, 1100, 1275]);
  prop(32, 'Bairro Cultural', 'green', 300, [26, 130, 390, 900, 1100, 1275]);
  def(33, { n: 'Revés', t: 'reves', ic: '⚡' });
  prop(34, 'Polo Aeroespacial', 'green', 320, [28, 150, 450, 1000, 1200, 1400]);
  def(35, { n: 'Metrô Amarelo', t: 'station', p: 200, ic: '🚇' });
  def(36, { n: 'Sorte', t: 'sorte', ic: '🍀' });
  prop(37, 'Cobertura Alta', 'dblue', 350, [35, 175, 500, 1100, 1300, 1500]);
  def(38, { n: 'Taxa de Luxo', t: 'tax', amt: 100, ic: '💎' });
  prop(39, 'Arranha-Céu Prime', 'dblue', 400, [50, 200, 600, 1400, 1700, 2000]);

  const GT = {}; T.forEach(t => { if (t.g) (GT[t.g] = GT[t.g] || []).push(t.i); });
  const STATIONS = T.filter(t => t.t === 'station').map(t => t.i), UTILS = T.filter(t => t.t === 'util').map(t => t.i);
  const groupOf = t => (t.t === 'prop' ? GT[t.g] : t.t === 'station' ? STATIONS : UTILS);
  const isOwnable = t => t.t === 'prop' || t.t === 'station' || t.t === 'util';
  const gridPos = i => (i <= 10 ? [11, 11 - i] : i <= 20 ? [21 - i, 1] : i <= 30 ? [1, i - 19] : [i - 29, 11]);

  // ---------------- cartas ----------------
  const SORTE = [
    { tx: 'Seu aplicativo viralizou! Receba $150.', t: 'gain', n: 150 },
    { tx: 'Dividendos da bolsa de valores: receba $100.', t: 'gain', n: 100 },
    { tx: 'Avance até a Partida e receba $200.', t: 'moveTo', i: 0 },
    { tx: 'Avance até a Av. Central. Se passar pela Partida, receba $200.', t: 'moveTo', i: 21 },
    { tx: 'Avance até o Arranha-Céu Prime.', t: 'moveTo', i: 39 },
    { tx: 'Avance até o Metrô mais próximo. Se tiver dono, pague o DOBRO do aluguel.', t: 'nearest', k: 'station' },
    { tx: 'Avance até a Companhia mais próxima. Se tiver dono, pague 10× o valor dos dados.', t: 'nearest', k: 'util' },
    { tx: 'Saia da Delegacia de graça! Guarde esta carta.', t: 'jailcard' },
    { tx: 'Prêmio de inovação: receba $50 de cada jogador.', t: 'eachPay', n: 50 },
    { tx: 'Volte 3 casas.', t: 'back', n: 3 },
    { tx: 'Herança de um tio distante: receba $120.', t: 'gain', n: 120 },
    { tx: 'Vá direto para a Delegacia. Não passe pela Partida.', t: 'jail' },
    { tx: 'Promoção no trabalho: receba $75.', t: 'gain', n: 75 },
    { tx: 'Excursão: avance até o Metrô Azul. Se passar pela Partida, receba $200.', t: 'moveTo', i: 5 },
    { tx: 'Multa de trânsito: pague $50.', t: 'lose', n: 50 },
    { tx: 'Você ganhou na loteria da cidade! Receba $200.', t: 'gain', n: 200 }
  ];
  const REVES = [
    { tx: 'Conta de luz atrasada: pague $100.', t: 'lose', n: 100 },
    { tx: 'Reforma obrigatória: pague $25 por casa e $100 por hotel.', t: 'repairs', a: 25, b: 100 },
    { tx: 'Multa ambiental: pague $150.', t: 'lose', n: 150 },
    { tx: 'Seu carro quebrou: pague $75 à oficina.', t: 'lose', n: 75 },
    { tx: 'Festa de aniversário: pague $50 a cada jogador.', t: 'payEach', n: 50 },
    { tx: 'Vá direto para a Delegacia. Não passe pela Partida.', t: 'jail' },
    { tx: 'Volte 3 casas.', t: 'back', n: 3 },
    { tx: 'Imposto sobre grandes fortunas: pague 10% do seu dinheiro (máx. $300).', t: 'pct' },
    { tx: 'Obras públicas: pague $40 por casa e $115 por hotel.', t: 'repairs', a: 40, b: 115 },
    { tx: 'Hackers invadiram sua conta: perca $200.', t: 'lose', n: 200 },
    { tx: 'Taxa de condomínio: pague $60.', t: 'lose', n: 60 },
    { tx: 'Saia da Delegacia de graça! Guarde esta carta.', t: 'jailcard' },
    { tx: 'Restituição do imposto de renda: receba $50.', t: 'gain', n: 50 },
    { tx: 'Venda de garagem: receba $30.', t: 'gain', n: 30 }
  ];

  const TOKENS = ['🚗', '🚀', '🎩', '🐶', '🛵', '🚁'];
  const PCOL = ['#6c8cff', '#f87171', '#4ade80', '#fbbf24', '#c084fc', '#22d3ee'];
  const PERSONAS = [
    { name: 'Magnata', emoji: '🦈', aggr: .9, caution: .2, trade: .5, desc: 'Compra tudo e constrói cedo' },
    { name: 'Contador', emoji: '🦉', aggr: .4, caution: .85, trade: .3, desc: 'Guarda reserva alta' },
    { name: 'Negociante', emoji: '🦊', aggr: .6, caution: .5, trade: .95, desc: 'Vive propondo trocas' },
    { name: 'Tartaruga', emoji: '🐢', aggr: .3, caution: .9, trade: .2, desc: 'Cautelosa e paciente' },
    { name: 'Especulador', emoji: '🚀', aggr: .8, caution: .4, trade: .6, desc: 'Aposta em metrôs e empresas' },
    { name: 'Equilibrado', emoji: '🤖', aggr: .55, caution: .55, trade: .5, desc: 'Estilo balanceado' }
  ];

  // ---------------- estado ----------------
  const alive = () => M.players.filter(p => !p.bankrupt);
  const owned = p => T.filter(t => isOwnable(t) && M.props[t.i].owner === p.id);
  const hasMonopoly = (pid, g) => GT[g].every(j => M.props[j].owner === pid);
  const nOwned = (pid, list) => list.filter(j => M.props[j].owner === pid).length;
  const mortVal = t => t.p / 2;
  const unmortCost = t => Math.ceil(t.p / 2 * 1.1);
  const bldCount = p => owned(p).reduce((a, t) => a + (t.t === 'prop' ? M.props[t.i].h : 0), 0);
  function netWorth(p) {
    let v = p.cash - p.debt;
    owned(p).forEach(t => { const pr = M.props[t.i]; v += pr.mort ? t.p / 2 : t.p; if (t.t === 'prop') v += pr.h * GR[t.g].hc; });
    return v;
  }
  function rentOf(i, dice, mult) {
    const t = T[i], pr = M.props[i]; if (pr.owner < 0 || pr.mort) return 0;
    if (t.t === 'prop') return pr.h > 0 ? t.r[pr.h] : (hasMonopoly(pr.owner, t.g) ? t.r[0] * 2 : t.r[0]);
    if (t.t === 'station') return 25 * Math.pow(2, nOwned(pr.owner, STATIONS) - 1) * (mult || 1);
    const n = nOwned(pr.owner, UTILS); return (mult ? 10 : (n === 2 ? 10 : 4)) * dice;
  }
  const bumpLog = [];

  // ---------------- montagem ----------------
  function mount(root) {
    M = { root, tok: {}, speed: 1, skill: Core.store.get('metro.skill', 1), N: Core.store.get('metro.n', 4), cash: Core.store.get('metro.cash', 1500), limit: Core.store.get('metro.limit', 60), spectator: false };
    root.append(Core.topbar('METRÓPOLE', h('button', { class: 'btn icon', title: 'Regras', onclick: showRules }, '?')));
    M.box = h('div', { class: 'mp' }); root.append(M.box);
    showSetup();
  }
  function unmount() { if (M) { M.tok = {}; } M = null; }

  function showRules() {
    Core.modal({
      title: 'Regras de Metrópole', buttons: [{ text: 'Entendi', cls: 'primary', value: 1 }],
      body: h('div', { class: 'small', style: { lineHeight: 1.55 }, html:
        '<b>Objetivo:</b> ser o último investidor sem falir (ou, no modo por rodadas, ter o maior patrimônio ao final).<br>' +
        '<b>Turno:</b> role 2 dados e ande. Dobles = jogue de novo; 3 dobles seguidos = Delegacia.<br>' +
        '<b>Propriedades:</b> ao cair numa livre, compre pelo preço ou ela vai a <b>leilão</b> entre todos. Cair numa de outro jogador = pagar aluguel.<br>' +
        '<b>Monopólio:</b> com todas as de uma cor o aluguel básico dobra e você pode construir <b>casas</b> (até 4) e depois um <b>hotel</b>, sempre de forma uniforme. Estoque: 32 casas e 12 hotéis.<br>' +
        '<b>Metrôs/Empresas:</b> o aluguel cresce com quantos você possui.<br>' +
        '<b>Negociação:</b> troque propriedades e dinheiro com os adversários a qualquer momento da sua vez.<br>' +
        '<b>Hipoteca:</b> receba metade do preço (sem construções no grupo); para resgatar pague metade + 10%. Hipotecadas não rendem aluguel.<br>' +
        '<b>Empréstimo:</b> no Banco você pega até $500; paga 10% de juros cada vez que passa pela Partida.<br>' +
        '<b>Partida:</b> receba $200 a cada volta.<br>' +
        '<b>Delegacia:</b> saia pagando $50, usando uma carta, ou tirando dobles (3 tentativas, depois paga). Preso ainda cobra aluguel e negocia.<br>' +
        '<b>Falência:</b> sem como pagar (mesmo vendendo tudo), você sai e seus bens vão ao credor (ou ao banco).<br>' +
        '<b>Cartas:</b> casas 🍀 Sorte e ⚡ Revés trazem ganhos, multas, movimentos e a carta “Saia da Delegacia”.' })
    });
  }

  function showSetup() {
    M.tok = {}; M.box.innerHTML = '';
    const seg = (arr, key, store) => {
      const wrap = h('div', { class: 'seg full' });
      arr.forEach(([k, t]) => wrap.append(h('button', { class: M[key] === k ? 'active' : '', onclick: e => { M[key] = k; Core.store.set(store, k); Core.$$('button', wrap).forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); } }, t)));
      return wrap;
    };
    const spec = h('input', { type: 'checkbox', onchange: e => { M.spectator = e.target.checked; } });
    M.box.append(h('div', { class: 'tr-setup' },
      h('div', { class: 'panel' }, h('h3', null, 'Quantos jogadores?'), seg([[2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6']], 'N', 'metro.n'), h('div', { class: 'small muted', style: { marginTop: '6px' } }, 'Você + IAs. O padrão de 4 jogadores é o mais equilibrado.')),
      h('div', { class: 'panel' }, h('h3', null, 'Dinheiro inicial'), seg([[1000, '$1.000'], [1500, '$1.500'], [2500, '$2.500']], 'cash', 'metro.cash')),
      h('div', { class: 'panel' }, h('h3', null, 'Duração'), seg([[0, 'Até falir'], [40, '40 rodadas'], [60, '60 rodadas']], 'limit', 'metro.limit'),
        h('div', { class: 'small muted', style: { marginTop: '6px' } }, 'Com limite de rodadas vence quem tiver o maior patrimônio (dinheiro + imóveis + construções − dívidas).')),
      h('div', { class: 'panel' }, h('h3', null, 'Habilidade das IAs'), seg([[0.6, 'Fácil'], [1, 'Normal'], [1.4, 'Difícil']], 'skill', 'metro.skill')),
      h('div', { class: 'panel' }, h('h3', null, 'Os rivais'), h('div', { class: 'small muted', style: { lineHeight: 1.7 } }, PERSONAS.map(p => `${p.emoji} ${p.name} — ${p.desc}`).join(' · ')),
        h('label', { class: 'row small', style: { marginTop: '10px' } }, h('span', { class: 'switch' }, spec, h('i')), h('span', null, 'Modo espectador (só IAs jogam)'))),
      h('button', { class: 'btn primary lg block', onclick: startGame }, '▶ Começar partida'),
      h('button', { class: 'btn block', onclick: showRules }, '📖 Ver regras')));
  }

  function startGame() {
    M.tok = {}; const tok = M.tok;
    const N = M.N, pool = shuffle(PERSONAS), players = [];
    for (let i = 0; i < N; i++) {
      const human = i === 0 && !M.spectator;
      const st = human ? null : pool.pop();
      players.push({ id: i, name: human ? Core.settings.name : st.name, emoji: TOKENS[i], face: human ? '🙂' : st.emoji, color: PCOL[i], human, ai: st, cash: M.cash, debt: 0, pos: 0, jail: 0, jailCards: 0, bankrupt: false, lastTrade: -9 });
    }
    M.players = players; M.props = T.map(() => ({ owner: -1, h: 0, mort: false }));
    M.houses = 32; M.hotels = 12; M.turn = 0; M.round = 1; M.doubles = 0; M.dice = [0, 0]; M.speed = 1; M.log = [];
    M.decks = { sorte: shuffle(SORTE.slice()), reves: shuffle(REVES.slice()) };
    buildUI(); renderState();
    runGame(tok).catch(e => { if (!(e instanceof Abort)) console.error(e); });
  }

  // ---------------- interface ----------------
  function buildUI() {
    M.box.innerHTML = '';
    const board = h('div', { class: 'mp-board' });
    M.tileEls = T.map(t => {
      const [r, c] = gridPos(t.i);
      const side = [0, 10, 20, 30].includes(t.i) ? 'c' : t.i < 10 ? 'b' : t.i < 20 ? 'l' : t.i < 30 ? 't' : 'r';
      const label = t.ic ? (isOwnable(t) || ['start', 'jail', 'park', 'gojail'].includes(t.t) ? t.ic : t.ic) : '';
      const el = h('div', { class: `tile s-${side} t-${t.t}`, style: { gridRow: r, gridColumn: c }, onclick: () => showTile(t.i) },
        t.g ? h('i', { class: 'band', style: { background: GR[t.g].c } }) : null,
        h('span', { class: 'tn' }, label ? label + ' ' : '', t.n.length > 13 ? t.n.slice(0, 12) + '…' : t.n),
        t.p ? h('span', { class: 'tp' }, '$' + t.p) : (t.amt ? h('span', { class: 'tp' }, '$' + t.amt) : null),
        h('div', { class: 'tk' }), h('em', { class: 'own' }));
      board.append(el); return el;
    });
    M.ui = {
      dice: h('div', { class: 'mp-dice' }), msg: h('div', { class: 'mp-msg' }), info: h('div', { class: 'mp-info' }),
      players: h('div', { class: 'mp-players' }), log: h('div', { class: 'mp-log' }), ctl: h('div', { class: 'mp-ctl' })
    };
    board.append(h('div', { class: 'mp-center' }, h('div', { class: 'mp-title' }, 'METRÓPOLE'), M.ui.info, M.ui.dice, M.ui.msg));
    M.box.append(board, M.ui.ctl, M.ui.players, M.ui.log,
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn sm', onclick: showSetup }, '⚙ Novo jogo'), h('button', { class: 'btn sm', onclick: showRules }, '📖 Regras'), h('button', { class: 'btn sm', onclick: () => { M.speed = M.speed > .5 ? .25 : 1; Core.toast(M.speed < 1 ? 'Velocidade rápida' : 'Velocidade normal'); } }, '⏩ Velocidade')));
  }
  const dieEl = v => {
    const pat = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[v] || [];
    const d = h('div', { class: 'die' });
    for (let i = 0; i < 9; i++) d.append(h('i', { class: pat.includes(i) ? 'on' : '' }));
    return d;
  };
  function renderState() {
    if (!M || !M.ui) return;
    T.forEach(t => {
      const el = M.tileEls[t.i], pr = M.props[t.i];
      el.classList.toggle('mort', !!pr.mort);
      if (isOwnable(t)) {
        const o = pr.owner >= 0 ? M.players[pr.owner] : null;
        el.style.setProperty('--oc', o ? o.color : 'transparent'); el.classList.toggle('owned', !!o);
        if (t.g) { const b = el.querySelector('.band'); b.innerHTML = pr.h === 5 ? '<b class="hotel"></b>' : '<b class="hs"></b>'.repeat(pr.h); }
      }
      const tk = el.querySelector('.tk'); tk.innerHTML = '';
    });
    alive().forEach(p => {
      const tk = M.tileEls[p.pos].querySelector('.tk');
      tk.append(h('u', { class: 'tok' + (M.turn === p.id ? ' cur' : ''), style: { '--pc': p.color }, title: p.name }, p.emoji));
    });
    M.ui.info.textContent = `Rodada ${M.round}${M.limit ? ' / ' + M.limit : ''} · Vez: ${M.players[M.turn].name}`;
    M.ui.dice.innerHTML = ''; if (M.dice[0]) { M.ui.dice.append(dieEl(M.dice[0]), dieEl(M.dice[1])); }
    M.ui.players.innerHTML = '';
    M.players.forEach(p => {
      const dots = h('div', { class: 'pdots' });
      owned(p).forEach(t => dots.append(h('i', { class: M.props[t.i].mort ? 'mort' : '', style: { background: t.g ? GR[t.g].c : (t.t === 'station' ? '#9aa6c3' : '#ffd166') } })));
      M.ui.players.append(h('button', { class: 'mp-pl' + (M.turn === p.id ? ' turn' : '') + (p.bankrupt ? ' out' : ''), onclick: () => showPlayer(p) },
        h('div', { class: 'pt', style: { background: p.color } }, p.emoji),
        h('div', { class: 'grow' }, h('b', null, p.name + (p.human ? ' (você)' : '')), h('div', { class: 'pcash' }, p.bankrupt ? 'Faliu' : fmt(p.cash) + (p.debt ? ` · dívida ${fmt(p.debt)}` : '')), dots),
        p.jail ? h('span', { class: 'chip' }, '🚓') : null, p.jailCards ? h('span', { class: 'chip' }, '🎟' + p.jailCards) : null));
    });
  }
  function say(t) {
    M.log.push(t); if (M.log.length > 40) M.log.shift();
    if (M.ui) { M.ui.msg.textContent = t; M.ui.log.innerHTML = ''; M.log.slice(-5).reverse().forEach((l, i) => M.ui.log.append(h('div', { class: i ? 'old' : '' }, l))); }
  }
  const wait = async ms => { const tok = M.tok; await sleep(ms * M.speed); if (!M || M.tok !== tok) throw new Abort(); };

  function showTile(i) {
    const t = T[i], pr = M.props[i], o = pr.owner >= 0 ? M.players[pr.owner] : null;
    const body = h('div', null);
    if (t.g) {
      body.append(h('div', { class: 'tcard-head', style: { background: GR[t.g].c } }, t.n));
      const rows = [['Aluguel', t.r[0]], ['Com monopólio', t.r[0] * 2], ['1 casa', t.r[1]], ['2 casas', t.r[2]], ['3 casas', t.r[3]], ['4 casas', t.r[4]], ['Hotel', t.r[5]]];
      rows.forEach(([a, b]) => body.append(h('div', { class: 'row sb small' }, h('span', null, a), h('b', null, fmt(b)))));
      body.append(h('div', { class: 'row sb small muted', style: { marginTop: '6px' } }, h('span', null, 'Casa / hotel'), h('span', null, fmt(GR[t.g].hc))));
    } else if (t.t === 'station') body.append(h('div', { class: 'tcard-head', style: { background: '#4a5578' } }, t.n), h('p', { class: 'small' }, 'Aluguel: $25 · $50 · $100 · $200, conforme quantos metrôs o dono possui.'));
    else if (t.t === 'util') body.append(h('div', { class: 'tcard-head', style: { background: '#6a5a1f' } }, t.n), h('p', { class: 'small' }, 'Aluguel: 4× os dados (uma empresa) ou 10× os dados (as duas).'));
    else body.append(h('div', { class: 'tcard-head', style: { background: '#33406a' } }, (t.ic || '') + ' ' + t.n), h('p', { class: 'small' }, { start: 'Receba $200 ao passar por aqui.', tax: `Pague ${fmt(t.amt || 0)} ao banco.`, sorte: 'Compre uma carta de Sorte.', reves: 'Compre uma carta de Revés.', jail: 'Apenas visitando (ou preso).', park: 'Descanso. Nada acontece.', gojail: 'Vá direto para a Delegacia!' }[t.t] || ''));
    if (isOwnable(t)) {
      body.append(h('div', { class: 'small', style: { marginTop: '8px' } }, `Preço: ${fmt(t.p)} · Hipoteca: ${fmt(mortVal(t))}`));
      body.append(h('div', { class: 'small', style: { marginTop: '4px' } }, o ? `Dono: ${o.emoji} ${o.name}${pr.mort ? ' (hipotecada)' : ''}${pr.h ? ` · ${pr.h === 5 ? 'hotel' : pr.h + ' casa(s)'}` : ''}` : 'Sem dono'));
    }
    Core.modal({ title: '', body, buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
  }
  function showPlayer(p) {
    if (p.human) { openManage(p, { view: true }); return; }
    const list = owned(p);
    const body = h('div', null, h('div', { class: 'small' }, `${p.emoji} ${p.name} · ${fmt(p.cash)}${p.debt ? ` · dívida ${fmt(p.debt)}` : ''} · patrimônio ${fmt(netWorth(p))}`),
      h('div', { style: { marginTop: '8px' } }, list.length ? list.map(t => h('div', { class: 'row small', style: { padding: '3px 0' } }, h('i', { class: 'sw', style: { background: t.g ? GR[t.g].c : '#9aa6c3' } }), h('span', { class: 'grow' }, t.n), h('span', { class: 'muted' }, (M.props[t.i].mort ? 'hipotecada' : '') + (M.props[t.i].h ? (M.props[t.i].h === 5 ? ' hotel' : ' ' + M.props[t.i].h + '🏠') : '')))) : h('div', { class: 'muted small' }, 'Sem propriedades.')));
    Core.modal({ title: p.name, body, buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
  }

  // ---------------- controle do jogo ----------------
  function humanChoice() { const tok = M.tok; return new Promise(res => { M.pending = { res, tok }; }); }
  function resolveH(v) { if (M.pending && M.pending.tok === M.tok) { const p = M.pending; M.pending = null; p.res(v); } }
  function setCtl(mode, p) {
    const c = M.ui.ctl; c.innerHTML = '';
    if (mode === 'wait') { c.append(h('div', { class: 'muted small center grow' }, '⏳ Aguardando os adversários…')); return; }
    c.append(h('button', { class: 'btn primary lg block', onclick: () => resolveH(mode) }, mode === 'roll' ? (M.doubles ? '🎲 Rolar de novo' : '🎲 Rolar dados') : '⏭ Encerrar turno'),
      h('div', { class: 'row', style: { gap: '8px', width: '100%' } },
        h('button', { class: 'btn grow', onclick: () => openManage(p) }, '🏗 Gerenciar'), h('button', { class: 'btn grow', onclick: () => openTrade(p) }, '🤝 Negociar'), h('button', { class: 'btn grow', onclick: () => openBank(p) }, '🏦 Banco')));
  }

  async function runGame(tok) {
    while (true) {
      const p = M.players[M.turn];
      if (!p.bankrupt) await takeTurn(p);
      if (alive().length <= 1) break;
      const prev = M.turn;
      do { M.turn = (M.turn + 1) % M.N; } while (M.players[M.turn].bankrupt);
      if (M.turn <= prev) { M.round++; if (M.limit && M.round > M.limit) break; }
      if (!M.players.some(q => q.human && !q.bankrupt) && !M.spectator) M.speed = Math.min(M.speed, .2);
    }
    await endGame();
  }
  async function endGame() {
    const rank = M.players.slice().sort((a, b) => (b.bankrupt ? -1e9 : netWorth(b)) - (a.bankrupt ? -1e9 : netWorth(a)));
    const w = rank[0], youWon = w.human;
    renderState(); setCtl('wait');
    Core.snd(youWon ? 'win' : 'lose'); if (youWon) Core.addStat('metropoleWin');
    const body = h('div', null, h('div', null, M.limit && alive().length > 1 ? 'Fim das rodadas! Maior patrimônio vence.' : 'Último investidor de pé!'),
      h('div', { style: { marginTop: '8px' } }, rank.map((p, i) => h('div', { class: 'row sb small', style: { padding: '3px 0' } }, h('span', null, `${i + 1}º ${p.emoji} ${p.name}`), h('b', null, p.bankrupt ? 'faliu' : fmt(netWorth(p)))))));
    const v = await Core.modal({ title: youWon ? 'Você venceu! 🏆' : `${w.name} venceu!`, body, buttons: [{ text: 'Menu', cls: 'ghost', value: 'm' }, { text: 'Jogar de novo', cls: 'primary', value: 'r' }] });
    if (!M) return;
    if (v === 'r') showSetup(); else Core.go('');
  }

  async function takeTurn(p) {
    M.doubles = 0; renderState();
    say(`Vez de ${p.name}${p.jail ? ' (preso)' : ''}.`);
    if (!p.human) await aiPre(p);
    let again;
    do {
      again = false;
      let dice = null, fromJail = false;
      if (p.jail > 0) {
        const r = await jailTurn(p); if (p.bankrupt) return;
        if (r.stay) break;
        if (r.dice) { dice = r.dice; fromJail = true; }
      }
      if (!dice) { await waitRoll(p); dice = await doRoll(p); }
      const dbl = dice[0] === dice[1];
      if (dbl && !fromJail) { M.doubles++; if (M.doubles === 3) { say(`${p.name} tirou 3 dobles seguidos: Delegacia!`); await sendToJail(p); break; } }
      await moveBy(p, dice[0] + dice[1]);
      if (p.bankrupt) return;
      if (p.jail > 0) break;
      if (dbl && !fromJail) { again = true; say(`Dobles! ${p.name} joga de novo.`); await wait(500); }
    } while (again);
    if (p.bankrupt) return;
    if (p.human) { setCtl('end', p); await humanChoice(); setCtl('wait'); }
    else await aiPost(p);
  }
  async function waitRoll(p) {
    if (p.human) { renderState(); setCtl('roll', p); await humanChoice(); setCtl('wait'); } else await wait(450);
  }
  async function doRoll(p) {
    M.dice = [rand(1, 6), rand(1, 6)]; Core.snd('dice');
    M.ui.dice.innerHTML = ''; M.ui.dice.append(dieEl(M.dice[0]), dieEl(M.dice[1]));
    say(`${p.name} tirou ${M.dice[0]} e ${M.dice[1]}.`); await wait(650);
    return M.dice.slice();
  }
  async function passStart(p) {
    p.cash += 200; let msg = `${p.name} passou pela Partida: +$200`;
    if (p.debt > 0) { const i = Math.ceil(p.debt * .1); if (p.cash >= i) { p.cash -= i; msg += ` · juros −${fmt(i)}`; } else { p.debt += i; msg += ` · juros somados à dívida`; } }
    say(msg); Core.snd('chip');
  }
  async function moveBy(p, steps) {
    for (let k = 0; k < steps; k++) { p.pos = (p.pos + 1) % 40; if (p.pos === 0) await passStart(p); renderState(); await wait(110); }
    await land(p, M.dice[0] + M.dice[1]);
  }
  async function moveTo(p, target, collect) {
    let guard = 0;
    while (p.pos !== target && guard++ < 41) { p.pos = (p.pos + 1) % 40; if (p.pos === 0 && collect !== false) await passStart(p); else if (p.pos === 0) { /* sem bônus */ } renderState(); await wait(90); }
  }
  async function sendToJail(p) { p.pos = 10; p.jail = 1; M.doubles = 0; renderState(); Core.snd('knock'); await wait(500); }

  async function land(p, diceSum, opt) {
    opt = opt || {};
    const t = T[p.pos];
    if (isOwnable(t)) {
      const pr = M.props[t.i];
      if (pr.owner < 0) await offerBuy(p, t.i);
      else if (pr.owner !== p.id && !pr.mort) {
        const rent = rentOf(t.i, diceSum, opt.mult);
        const o = M.players[pr.owner];
        say(`${p.name} paga ${fmt(rent)} de aluguel a ${o.name} (${t.n}).`);
        await pay(p, o.id, rent);
      } else if (pr.owner === p.id) say(`${p.name} está em casa (${t.n}).`);
    } else if (t.t === 'tax') { say(`${p.name} paga ${fmt(t.amt)} de imposto.`); await pay(p, -1, t.amt); }
    else if (t.t === 'sorte' || t.t === 'reves') await drawCard(p, t.t);
    else if (t.t === 'gojail') { say(`${p.name} vai preso!`); await sendToJail(p); }
    else await wait(250);
  }

  // ---------------- cartas ----------------
  async function drawCard(p, kind) {
    const deck = M.decks[kind];
    const c = deck.shift();
    if (c.t !== 'jailcard') deck.push(c);
    Core.snd('card');
    const title = kind === 'sorte' ? '🍀 SORTE' : '⚡ REVÉS';
    if (p.human) await Core.modal({ title, body: h('div', { class: 'cardtxt' }, c.tx), buttons: [{ text: 'OK', cls: 'primary', value: 1 }], dismiss: false });
    else { say(`${p.name} comprou ${title}: ${c.tx}`); await wait(1700); }
    await applyCard(p, c, kind);
  }
  async function applyCard(p, c, kind) {
    switch (c.t) {
      case 'gain': p.cash += c.n; say(`${p.name} recebe ${fmt(c.n)}.`); Core.snd('chip'); break;
      case 'lose': await pay(p, -1, c.n); break;
      case 'pct': await pay(p, -1, Math.min(300, Math.round(p.cash * .1))); break;
      case 'moveTo': await moveTo(p, c.i, true); await land(p, M.dice[0] + M.dice[1]); break;
      case 'back': p.pos = (p.pos - c.n + 40) % 40; renderState(); await wait(400); await land(p, M.dice[0] + M.dice[1]); break;
      case 'jail': await sendToJail(p); break;
      case 'jailcard': p.jailCards++; say(`${p.name} guarda a carta “Saia da Delegacia”.`); break;
      case 'eachPay': for (const o of alive()) if (o.id !== p.id) { await pay(o, p.id, c.n); if (p.bankrupt) break; } break;
      case 'payEach': for (const o of alive()) if (o.id !== p.id && !p.bankrupt) await pay(p, o.id, c.n); break;
      case 'repairs': { let hs = 0, ht = 0; owned(p).forEach(t => { if (t.t === 'prop') { const k = M.props[t.i].h; if (k === 5) ht++; else hs += k; } }); const tot = hs * c.a + ht * c.b; say(`${p.name}: ${hs} casas e ${ht} hotéis = ${fmt(tot)}.`); await pay(p, -1, tot); break; }
      case 'nearest': {
        let tgt = p.pos; const list = c.k === 'station' ? STATIONS : UTILS;
        for (let k = 1; k <= 40; k++) { const q = (p.pos + k) % 40; if (list.includes(q)) { tgt = q; break; } }
        await moveTo(p, tgt, true);
        await land(p, M.dice[0] + M.dice[1], { mult: 2 }); break;
      }
      default: break;
    }
    if (c.t === 'jailcard') { /* carta fica com o jogador */ }
  }

  // ---------------- dinheiro ----------------
  async function pay(p, toId, amount) {
    amount = Math.round(amount); if (amount <= 0) return true;
    if (p.cash < amount) { await raiseFunds(p, amount, toId); if (p.bankrupt) return false; }
    p.cash -= amount; if (toId >= 0) M.players[toId].cash += amount;
    renderState(); Core.snd('chip'); await wait(250); return true;
  }
  function liquidPotential(p) {
    let v = p.cash;
    owned(p).forEach(t => { const pr = M.props[t.i]; if (t.t === 'prop') v += pr.h * GR[t.g].hc / 2; if (!pr.mort) v += mortVal(t); });
    return v;
  }
  async function raiseFunds(p, need, toId) {
    if (liquidPotential(p) < need) { await declareBankrupt(p, toId); return; }
    if (p.human) {
      while (p.cash < need) {
        const ui = manageNode(p, need);
        const r = await Core.modal({ title: `Levantar dinheiro: ${fmt(need)}`, body: ui.node, dismiss: false, buttons: [{ text: 'Declarar falência', cls: 'danger', value: 'b' }, { text: 'Pagar', cls: 'primary', value: 'p' }] });
        if (r === 'b') { await declareBankrupt(p, toId); return; }
        if (p.cash < need) Core.toast(`Você ainda precisa de ${fmt(need - p.cash)}.`);
      }
    } else aiRaise(p, need);
    if (p.cash < need) await declareBankrupt(p, toId);
  }
  async function declareBankrupt(p, toId) {
    const cred = toId >= 0 ? M.players[toId] : null;
    say(`💥 ${p.name} FALIU${cred ? ` (credor: ${cred.name})` : ''}!`); Core.snd('lose');
    // construções voltam ao estoque
    owned(p).forEach(t => { if (t.t === 'prop') { const pr = M.props[t.i]; if (pr.h === 5) { M.hotels++; } else M.houses += pr.h; pr.h = 0; } });
    if (cred) {
      cred.cash += p.cash; cred.jailCards += p.jailCards;
      owned(p).forEach(t => { const pr = M.props[t.i]; pr.owner = cred.id; if (pr.mort) { const fee = Math.ceil(mortVal(t) * .1); cred.cash -= Math.min(cred.cash, fee); } });
    } else owned(p).forEach(t => { const pr = M.props[t.i]; pr.owner = -1; pr.mort = false; });
    p.cash = 0; p.debt = 0; p.bankrupt = true; p.jailCards = 0; p.jail = 0;
    renderState(); await wait(1200);
  }

  // ---------------- compra e leilão ----------------
  async function offerBuy(p, i) {
    const t = T[i]; let choice;
    if (p.human) choice = await humanBuy(p, i); else choice = aiWantsBuy(p, i) ? 'buy' : 'auction';
    if (choice === 'buy' && p.cash >= t.p) {
      p.cash -= t.p; M.props[i].owner = p.id; say(`${p.name} comprou ${t.n} por ${fmt(t.p)}.`); Core.snd('chip'); renderState(); await wait(500);
    } else await auction(i, p);
  }
  async function humanBuy(p, i) {
    const t = T[i];
    while (true) {
      const body = h('div', null, h('div', { class: 'tcard-head', style: { background: t.g ? GR[t.g].c : '#4a5578' } }, (t.ic || '') + ' ' + t.n),
        h('p', null, `Preço: ${fmt(t.p)} · Seu dinheiro: ${fmt(p.cash)}`), t.g ? h('div', { class: 'small muted' }, `Aluguel base ${fmt(t.r[0])} (monopólio ${fmt(t.r[0] * 2)})`) : null);
      const btns = [];
      if (p.cash >= t.p) btns.push({ text: `Comprar ${fmt(t.p)}`, cls: 'primary', value: 'buy' });
      else btns.push({ text: '🏗 Levantar dinheiro', cls: 'blue', value: 'manage' });
      btns.push({ text: 'Leilão', cls: 'ghost', value: 'auction' });
      const r = await Core.modal({ title: 'Propriedade livre!', body, buttons: btns, dismiss: false });
      if (r === 'manage') { await openManage(p); continue; }
      return r;
    }
  }
  async function auction(i, starter) {
    const t = T[i]; say(`Leilão de ${t.n}!`);
    const order = []; for (let k = 1; k <= M.N; k++) { const q = M.players[(starter.id + k) % M.N]; if (!q.bankrupt) order.push(q); }
    const active = order.map(q => q.id);
    let bid = 0, leader = -1, idx = 0; const passed = new Set();
    for (let guard = 0; guard < 400; guard++) {
      const q = order[idx % order.length]; idx++;
      if (passed.has(q.id) || q.id === leader) { if (leader >= 0 && active.filter(id => !passed.has(id)).length <= 1) break; if (leader < 0 && passed.size === active.length) break; continue; }
      let nb = q.human ? await humanBid(q, i, bid, leader) : aiBid(q, i, bid);
      if (nb > bid && nb <= q.cash) { bid = nb; leader = q.id; say(`${q.name} oferece ${fmt(bid)}.`); await wait(500); }
      else passed.add(q.id);
      const remaining = active.filter(id => !passed.has(id));
      if (leader >= 0 && remaining.length <= 1) break;
      if (leader < 0 && passed.size === active.length) break;
    }
    if (leader >= 0) {
      const w = M.players[leader]; w.cash -= bid; M.props[i].owner = leader;
      say(`${w.name} arrematou ${t.n} por ${fmt(bid)}!`); Core.snd('chip');
    } else say(`Ninguém quis ${t.n}. Fica sem dono.`);
    renderState(); await wait(600);
  }
  async function humanBid(p, i, bid, leader) {
    const t = T[i];
    const opts = [10, 50, 100].filter(n => bid + n <= p.cash);
    const body = h('div', null, h('div', { class: 'tcard-head', style: { background: t.g ? GR[t.g].c : '#4a5578' } }, t.n),
      h('p', null, `Lance atual: ${bid ? fmt(bid) + ' (' + M.players[leader].name + ')' : 'nenhum'} · Preço de tabela: ${fmt(t.p)}`), h('div', { class: 'small muted' }, `Seu dinheiro: ${fmt(p.cash)}`));
    const buttons = opts.map(n => ({ text: `+${n}`, cls: 'primary', value: bid + n })); buttons.push({ text: 'Passar', cls: 'ghost', value: 0 });
    if (!opts.length && bid === 0 && p.cash >= 10) buttons.unshift({ text: `Dar ${fmt(Math.min(p.cash, 10))}`, cls: 'primary', value: Math.min(p.cash, 10) });
    return await Core.modal({ title: 'Leilão', body, buttons, dismiss: false });
  }

  // ---------------- delegacia ----------------
  async function jailTurn(p) {
    let choice = p.human ? await humanJail(p) : aiJail(p);
    if (choice === 'card' && p.jailCards > 0) { p.jailCards--; p.jail = 0; say(`${p.name} usou a carta e saiu da Delegacia.`); return { free: true }; }
    if (choice === 'pay' && p.cash >= 50) { await pay(p, -1, 50); p.jail = 0; say(`${p.name} pagou $50 e saiu da Delegacia.`); return { free: true }; }
    const d = await doRoll(p);
    if (d[0] === d[1]) { p.jail = 0; say(`${p.name} tirou dobles e saiu da Delegacia!`); return { dice: d }; }
    p.jail++;
    if (p.jail > 3) { say(`${p.name} cumpriu a pena: paga $50 e sai.`); await pay(p, -1, 50); if (p.bankrupt) return {}; p.jail = 0; return { dice: d }; }
    say(`${p.name} continua preso (${p.jail - 1}/3).`); await wait(700); return { stay: true };
  }
  async function humanJail(p) {
    const btns = [{ text: 'Tentar dobles', cls: 'ghost', value: 'roll' }];
    if (p.cash >= 50) btns.unshift({ text: 'Pagar $50', cls: 'primary', value: 'pay' });
    if (p.jailCards) btns.unshift({ text: 'Usar carta 🎟', cls: 'good', value: 'card' });
    setCtl('wait');
    return await Core.modal({ title: '🚓 Você está na Delegacia', body: `Tentativa ${p.jail} de 3. Pague $50, use uma carta ou tente tirar dobles.`, buttons: btns, dismiss: false });
  }

  // ---------------- construção / hipoteca ----------------
  function canBuild(p, i) {
    const t = T[i], pr = M.props[i]; if (t.t !== 'prop' || pr.owner !== p.id || !hasMonopoly(p.id, t.g)) return false;
    const g = GT[t.g]; if (g.some(j => M.props[j].mort) || pr.h >= 5) return false;
    if (pr.h > Math.min(...g.map(j => M.props[j].h))) return false;
    if (pr.h === 4 ? M.hotels <= 0 : M.houses <= 0) return false;
    return p.cash >= GR[t.g].hc;
  }
  function doBuild(p, i) { const pr = M.props[i], hc = GR[T[i].g].hc; pr.h++; p.cash -= hc; if (pr.h === 5) { M.hotels--; M.houses += 4; } else M.houses--; }
  function canSell(p, i) {
    const t = T[i], pr = M.props[i]; if (t.t !== 'prop' || pr.owner !== p.id || pr.h <= 0) return false;
    if (pr.h < Math.max(...GT[t.g].map(j => M.props[j].h))) return false;
    return pr.h !== 5 || M.houses >= 4;
  }
  function doSell(p, i) { const pr = M.props[i]; if (pr.h === 5) { M.hotels++; M.houses -= 4; } else M.houses++; pr.h--; p.cash += GR[T[i].g].hc / 2; }
  function canMortgage(p, i) { const t = T[i], pr = M.props[i]; return pr.owner === p.id && !pr.mort && (t.t !== 'prop' || GT[t.g].every(j => M.props[j].h === 0)); }
  function doMortgage(p, i) { M.props[i].mort = true; p.cash += mortVal(T[i]); }
  function canUnmortgage(p, i) { const pr = M.props[i]; return pr.owner === p.id && pr.mort && p.cash >= unmortCost(T[i]); }
  function doUnmortgage(p, i) { M.props[i].mort = false; p.cash -= unmortCost(T[i]); }

  /** Painel de gerenciamento (usado no menu e ao levantar dinheiro) */
  function manageNode(p, need) {
    const node = h('div', { class: 'mng' });
    const render = () => {
      node.innerHTML = '';
      node.append(h('div', { class: 'row sb', style: { marginBottom: '8px' } }, h('b', null, `Dinheiro: ${fmt(p.cash)}`), need ? h('b', { class: p.cash >= need ? 'good-t' : 'bad' }, `Precisa: ${fmt(need)}`) : h('span', { class: 'muted small' }, `Casas ${M.houses} · Hotéis ${M.hotels}`)));
      const list = owned(p);
      if (!list.length) node.append(h('p', { class: 'muted small' }, 'Você ainda não tem propriedades.'));
      const groups = {};
      list.forEach(t => { const k = t.g || (t.t === 'station' ? 'station' : 'util'); (groups[k] = groups[k] || []).push(t); });
      Object.keys(groups).forEach(k => {
        const col = GR[k] ? GR[k].c : (k === 'station' ? '#9aa6c3' : '#ffd166');
        const mono = GR[k] && hasMonopoly(p.id, k);
        node.append(h('div', { class: 'mg-head', style: { borderLeftColor: col } }, (GR[k] ? GR[k].n : k === 'station' ? 'Metrôs' : 'Empresas') + (mono ? ' ★ monopólio' : '')));
        groups[k].forEach(t => {
          const pr = M.props[t.i];
          node.append(h('div', { class: 'mg-row' },
            h('div', { class: 'grow' }, h('b', null, t.n), h('div', { class: 'small muted' }, (pr.mort ? '🔒 hipotecada' : '') + (pr.h ? (pr.h === 5 ? ' 🏨 hotel' : ' ' + '🏠'.repeat(pr.h)) : ''))),
            t.t === 'prop' && mono ? h('button', { class: 'btn sm' + (canBuild(p, t.i) ? '' : ' disabled'), onclick: () => { if (canBuild(p, t.i)) { doBuild(p, t.i); Core.snd('chip'); renderState(); render(); } } }, `＋${fmt(GR[t.g].hc)}`) : null,
            t.t === 'prop' && pr.h ? h('button', { class: 'btn sm' + (canSell(p, t.i) ? '' : ' disabled'), onclick: () => { if (canSell(p, t.i)) { doSell(p, t.i); renderState(); render(); } } }, `−+${fmt(GR[t.g].hc / 2)}`) : null,
            pr.mort ? h('button', { class: 'btn sm good' + (canUnmortgage(p, t.i) ? '' : ' disabled'), onclick: () => { if (canUnmortgage(p, t.i)) { doUnmortgage(p, t.i); renderState(); render(); } } }, `Resgatar ${fmt(unmortCost(t))}`)
              : h('button', { class: 'btn sm' + (canMortgage(p, t.i) ? '' : ' disabled'), onclick: () => { if (canMortgage(p, t.i)) { doMortgage(p, t.i); renderState(); render(); } } }, `Hipotecar +${fmt(mortVal(t))}`)));
        });
      });
    };
    render();
    return { node, render };
  }
  async function openManage(p, o) {
    if (M.manageOpen) return; M.manageOpen = true;
    const ui = manageNode(p, 0);
    await Core.modal({ title: o && o.view ? 'Seu patrimônio' : '🏗 Gerenciar propriedades', body: ui.node, buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
    M.manageOpen = false; renderState();
  }

  // ---------------- banco (empréstimos) ----------------
  const LOAN_MAX = 500;
  async function openBank(p) {
    const body = h('div', null);
    const render = () => {
      body.innerHTML = '';
      body.append(h('div', { class: 'row sb' }, h('span', null, 'Dinheiro'), h('b', null, fmt(p.cash))), h('div', { class: 'row sb' }, h('span', null, 'Dívida com o banco'), h('b', { class: p.debt ? 'bad' : '' }, fmt(p.debt))),
        h('p', { class: 'small muted' }, `Limite de empréstimo: ${fmt(LOAN_MAX)}. Juros de 10% da dívida a cada passagem pela Partida.`),
        h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '8px' } },
          [100, 200, 500].map(n => h('button', { class: 'btn sm' + (p.debt + n <= LOAN_MAX ? '' : ' disabled'), onclick: () => { if (p.debt + n <= LOAN_MAX) { p.debt += n; p.cash += n; renderState(); render(); } } }, `Pegar ${fmt(n)}`)),
          [100, 200, 500].map(n => h('button', { class: 'btn sm good' + (p.debt >= n && p.cash >= n ? '' : ' disabled'), onclick: () => { if (p.debt >= n && p.cash >= n) { p.debt -= n; p.cash -= n; renderState(); render(); } } }, `Pagar ${fmt(n)}`)),
          h('button', { class: 'btn sm good' + (p.debt > 0 && p.cash >= p.debt ? '' : ' disabled'), onclick: () => { if (p.debt > 0 && p.cash >= p.debt) { p.cash -= p.debt; p.debt = 0; renderState(); render(); } } }, 'Quitar tudo')));
    };
    render();
    await Core.modal({ title: '🏦 Banco', body, buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
  }

  // ---------------- negociação ----------------
  function tradeValue(q, i) { // valor da propriedade i para o jogador q
    const t = T[i], pr = M.props[i]; let v = t.p;
    const g = groupOf(t), mine = g.filter(j => j !== i && M.props[j].owner === q.id).length;
    if (t.t === 'prop') {
      if (mine === g.length - 1) v *= 2.2; else if (mine > 0) v *= 1.25;
      const oppSets = {}; g.forEach(j => { const o = M.props[j].owner; if (j !== i && o >= 0 && o !== q.id) oppSets[o] = (oppSets[o] || 0) + 1; });
      if (Object.values(oppSets).some(n => n === g.length - 1)) v *= 1.4;
    } else v *= 1 + .22 * mine;
    if (pr.mort) v *= .6;
    return v;
  }
  /** a IA q aceita? (get = o que q recebe; give = o que q entrega) */
  function aiAccepts(q, get, getCash, give, giveCash, from) {
    let gain = getCash, loss = giveCash;
    get.forEach(i => { gain += tradeValue(q, i); });
    give.forEach(i => { const t = T[i]; loss += Math.max(t.p, tradeValue(from, i) * .85) * (t.t === 'prop' && hasMonopoly(q.id, t.g) ? 3 : 1); });
    const need = 1.05 - (q.ai ? q.ai.aggr * .1 : 0) - (M.skill < 1 ? .1 : 0);
    return { ok: gain >= loss * need && (give.length + get.length + giveCash + getCash > 0), gain, loss };
  }
  function execTrade(a, b, aGive, aCash, bGive, bCash) {
    aGive.forEach(i => { M.props[i].owner = b.id; }); bGive.forEach(i => { M.props[i].owner = a.id; });
    a.cash += bCash - aCash; b.cash += aCash - bCash;
    // propriedade hipotecada recebida: pagar 10% de taxa
    [[aGive, b], [bGive, a]].forEach(([lst, to]) => lst.forEach(i => { if (M.props[i].mort) to.cash -= Math.min(to.cash, Math.ceil(mortVal(T[i]) * .1)); }));
    renderState(); Core.snd('chip');
  }
  const tradable = (p) => owned(p).filter(t => t.t !== 'prop' || GT[t.g].every(j => M.props[j].h === 0));
  async function openTrade(p) {
    const others = alive().filter(q => q.id !== p.id);
    if (!others.length) return;
    const pick1 = await Core.modal({ title: '🤝 Negociar com…', body: 'Escolha o adversário:', buttons: others.map(q => ({ text: `${q.emoji} ${q.name}`, cls: 'primary', value: q.id })).concat([{ text: 'Cancelar', cls: 'ghost', value: -1 }]) });
    if (pick1 < 0) return;
    const q = M.players[pick1];
    const give = new Set(), take = new Set(); let myCash = 0, hisCash = 0;
    const body = h('div', { class: 'trade' });
    const render = () => {
      body.innerHTML = '';
      const col = (title, who, set, cashGet, cashSet) => {
        const c = h('div', { class: 'tr-col' }, h('b', null, title));
        const list = tradable(who);
        if (!list.length) c.append(h('div', { class: 'muted small' }, 'sem propriedades'));
        list.forEach(t => c.append(h('button', { class: 'tr-it' + (set.has(t.i) ? ' on' : ''), onclick: () => { if (set.has(t.i)) set.delete(t.i); else set.add(t.i); render(); } }, h('i', { class: 'sw', style: { background: t.g ? GR[t.g].c : '#9aa6c3' } }), t.n)));
        c.append(h('div', { class: 'row sb', style: { marginTop: '6px' } }, h('button', { class: 'btn sm', onclick: () => { cashSet(Math.max(0, cashGet() - 50)); render(); } }, '−50'), h('b', null, fmt(cashGet())), h('button', { class: 'btn sm', onclick: () => { cashSet(Math.min(who.cash, cashGet() + 50)); render(); } }, '+50')));
        return c;
      };
      body.append(h('div', { class: 'tr-cols' }, col('Você oferece', p, give, () => myCash, v => { myCash = v; }), col(`${q.name} entrega`, q, take, () => hisCash, v => { hisCash = v; })));
    };
    render();
    const r = await Core.modal({ title: `🤝 Proposta para ${q.name}`, body, buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Propor', cls: 'primary', value: true }], dismiss: false });
    if (!r) return;
    if (!give.size && !take.size && !myCash && !hisCash) { Core.toast('Proposta vazia'); return; }
    const res = aiAccepts(q, Array.from(give), myCash, Array.from(take), hisCash, p);
    await wait(500);
    if (res.ok) { execTrade(p, q, Array.from(give), myCash, Array.from(take), hisCash); say(`🤝 ${q.name} aceitou a troca!`); Core.toast(`${q.name} aceitou!`); }
    else { say(`${q.name} recusou a proposta.`); Core.toast(`${q.name} recusou: o valor não compensa.`, 2600); }
  }
  /** a IA propõe uma troca para completar um monopólio */
  async function aiProposeTrade(p) {
    if (M.round - p.lastTrade < 3 || Math.random() > p.ai.trade + .1) return;
    let best = null;
    Object.keys(GT).forEach(g => {
      const tiles = GT[g]; const mine = tiles.filter(j => M.props[j].owner === p.id);
      if (mine.length !== tiles.length - 1) return;
      const missing = tiles.find(j => M.props[j].owner !== p.id); const o = M.props[missing].owner;
      if (o < 0 || M.players[o].bankrupt || M.props[missing].h > 0) return;
      if (!best || T[missing].p > T[best.i].p) best = { i: missing, o };
    });
    if (!best) return;
    const q = M.players[best.o], t = T[best.i];
    const cashOffer = Math.min(Math.floor(t.p * 2.1 / 10) * 10, p.cash - 40);
    if (cashOffer < t.p * 1.2) return;
    p.lastTrade = M.round;
    // oferece também uma propriedade solta, se quiser sweetener
    const extra = owned(p).filter(x => x.t !== 'prop' || (!hasMonopoly(p.id, x.g) && GT[x.g].every(j => M.props[j].h === 0))).filter(x => !(x.t === 'prop' && GT[x.g].filter(j => M.props[j].owner === p.id).length === GT[x.g].length - 1)).sort((a, b) => a.p - b.p)[0];
    const give = (extra && cashOffer < t.p * 2.0) ? [extra.i] : [];
    if (q.human) {
      const body = h('div', null, h('p', null, `${p.emoji} ${p.name} quer comprar `, h('b', null, t.n), ' por ', h('b', null, fmt(cashOffer)), give.length ? ` + ${T[give[0]].n}` : '', '.'), h('div', { class: 'small muted' }, 'Aceitar fecha o negócio imediatamente.'));
      const r = await Core.modal({ title: '🤝 Proposta recebida', body, buttons: [{ text: 'Recusar', cls: 'ghost', value: false }, { text: 'Aceitar', cls: 'primary', value: true }], dismiss: false });
      if (r) { execTrade(p, q, give, cashOffer, [best.i], 0); say(`🤝 ${q.name} vendeu ${t.n} a ${p.name} por ${fmt(cashOffer)}.`); } else say(`${q.name} recusou a oferta de ${p.name}.`);
    } else {
      const res = aiAccepts(q, give, cashOffer, [best.i], 0, p);
      if (res.ok) { execTrade(p, q, give, cashOffer, [best.i], 0); say(`🤝 ${p.name} comprou ${t.n} de ${q.name} por ${fmt(cashOffer)}.`); await wait(900); }
    }
  }

  // ---------------- IA ----------------
  const reserve = p => Math.min(420, (70 + p.ai.caution * 230) * (M.skill < 1 ? 1.25 : M.skill > 1 ? .8 : 1));
  function aiWantsBuy(p, i) {
    const t = T[i]; if (p.cash < t.p) return false;
    if (M.skill < 1 && Math.random() < .25) return false;
    const g = groupOf(t), mine = g.filter(j => M.props[j].owner === p.id).length;
    if (t.t === 'prop' && mine === g.length - 1) return true;                        // completa monopólio
    const blocks = t.t === 'prop' && Object.values(g.reduce((a, j) => { const o = M.props[j].owner; if (o >= 0) a[o] = (a[o] || 0) + 1; return a; }, {})).some(n => n === g.length - 1);
    const after = p.cash - t.p, res = reserve(p) * (1 - p.ai.aggr * .45) * (blocks ? .5 : 1);
    return after >= res;
  }
  function aiBid(p, i, bid) {
    const t = T[i];
    let maxBid = tradeValue(p, i) * (.85 + p.ai.aggr * .35) * (M.skill < 1 ? .8 : 1);
    maxBid = Math.min(maxBid, p.cash - reserve(p) * .4);
    const inc = Math.max(10, Math.round(t.p * .05 / 10) * 10);
    const nb = bid + inc; if (bid === 0 && maxBid >= 10) return Math.min(Math.max(10, Math.round(t.p * .4 / 10) * 10), Math.floor(maxBid / 10) * 10) || 0;
    return nb <= maxBid ? nb : 0;
  }
  function aiJail(p) {
    if (p.jailCards) return 'card';
    const unowned = T.filter(t => isOwnable(t) && M.props[t.i].owner < 0).length;
    const danger = T.some(t => t.t === 'prop' && M.props[t.i].owner >= 0 && M.props[t.i].owner !== p.id && M.props[t.i].h >= 2);
    if (p.cash > 300 && unowned > 6 && !danger) return 'pay';
    return 'roll';
  }
  function aiRaise(p, need) {
    let guard = 0;
    while (p.cash < need && guard++ < 80) {
      const sellable = owned(p).filter(t => t.t === 'prop' && canSell(p, t.i)).sort((a, b) => M.props[b.i].h - M.props[a.i].h);
      if (sellable.length) { doSell(p, sellable[0].i); continue; }
      const mortg = owned(p).filter(t => canMortgage(p, t.i)).sort((a, b) => (hasMono(p, a) - hasMono(p, b)) || (a.p - b.p));
      if (mortg.length) { doMortgage(p, mortg[0].i); continue; }
      break;
    }
    renderState();
  }
  const hasMono = (p, t) => (t.t === 'prop' && hasMonopoly(p.id, t.g) ? 1 : 0);
  async function aiPre(p) {
    // quita dívida com folga, resgata, constrói, propõe trocas
    if (p.debt > 0 && p.cash > p.debt + reserve(p) + 200) { p.cash -= p.debt; p.debt = 0; }
    await aiBuildAndFix(p);
    if (!p.bankrupt) await aiProposeTrade(p);
  }
  async function aiPost(p) { await aiBuildAndFix(p); }
  async function aiBuildAndFix(p) {
    const res = reserve(p) * (1 - p.ai.aggr * .3);
    // resgatar hipotecas
    owned(p).filter(t => M.props[t.i].mort).sort((a, b) => b.p - a.p).forEach(t => { if (p.cash - unmortCost(t) >= res) doUnmortgage(p, t.i); });
    // empréstimo para construir quando tem monopólio e pouco caixa
    const monos = Object.keys(GT).filter(g => hasMonopoly(p.id, g) && GT[g].every(j => !M.props[j].mort));
    if (monos.length && p.cash < res + 120 && p.debt === 0 && p.ai.aggr > .5 && M.skill >= 1) { p.debt = 300; p.cash += 300; }
    let built = 0;
    for (let guard = 0; guard < 8; guard++) {
      const cand = [];
      monos.forEach(g => GT[g].forEach(j => { if (canBuild(p, j) && p.cash - GR[g].hc >= res) cand.push(j); }));
      if (!cand.length) break;
      cand.sort((a, b) => (M.props[a].h - M.props[b].h) || (T[b].p - T[a].p));   // distribui por igual, prefere grupos mais caros
      doBuild(p, cand[0]); built++;
    }
    if (built) { say(`${p.name} construiu ${built} melhoria(s).`); Core.snd('chip'); renderState(); await wait(700); }
  }

  Core.register('metropole', { mount, unmount });
  window.MetropoleDebug = { state: () => M, T, GT };
})();
