/* ============================================================
   METRÓPOLE — jogo de negociação de imóveis no estilo do
   Banco Imobiliário brasileiro (2 a 6 jogadores, contra IAs).
   Regras principais:
   · 22 terrenos + 6 companhias, 40 casas no tabuleiro;
   · casas e hotéis se constroem DIRETO no terreno que você possui
     (não precisa completar região);
   · Sorte ou Revés, Imposto de Renda, Lucros e Dividendos, Prisão.
   ============================================================ */
(function () {
  'use strict';
  const { h, sleep, rand, pick, shuffle } = Core;
  const fmt = n => '$' + Math.round(n).toLocaleString('pt-BR');
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  class Abort extends Error { }
  let M = null;

  // ---------------- dados do tabuleiro ----------------
  const GR = {
    brown: { c: '#8b5a3c', n: 'Marrom' }, lblue: { c: '#6ec6ea', n: 'Azul-claro' },
    pink: { c: '#e66bb0', n: 'Rosa' }, orange: { c: '#f29b3b', n: 'Laranja' },
    red: { c: '#e04646', n: 'Vermelho' }, yellow: { c: '#f3d03e', n: 'Amarelo' },
    green: { c: '#3fae5a', n: 'Verde' }, dblue: { c: '#3a5fd6', n: 'Azul-escuro' }
  };
  const T = [];
  const def = (i, o) => { T[i] = Object.assign({ i }, o); };
  const rd = x => (x < 30 ? Math.max(1, Math.round(x)) : Math.round(x / 5) * 5);
  const RM = [.07, .33, .9, 2.2, 3.2, 4.2];                               // multiplicadores de aluguel (terreno, 1-4 casas, hotel)
  const prop = (i, n, s, g, p, k) => def(i, { n, s, t: 'prop', g, p, hc: Math.max(30, Math.round(p * .5 / 10) * 10), r: RM.map(m => rd(p * m * (k || 1))) });
  const comp = (i, n, s, ic, p) => def(i, { n, s, t: 'comp', ic, p });
  const sr = i => def(i, { n: 'Sorte ou Revés', s: 'Sorte ou Revés', t: 'sr', ic: '🎲' });

  def(0, { n: 'Ponto de Partida', s: 'Partida', t: 'start', ic: '🏁' });
  prop(1, 'Leblon', 'Leblon', 'lblue', 100, 1.1);
  sr(2);
  prop(3, 'Av. Presidente Vargas', 'Pres. Vargas', 'brown', 60, .9);
  prop(4, 'Av. N. S. de Copacabana', 'N.S. Copaca­bana', 'brown', 60, 1);
  comp(5, 'Companhia Ferroviária', 'Ferro­viária', '🚂', 200);
  prop(6, 'Av. Brigadeiro Faria Lima', 'Faria Lima', 'red', 240, 1);
  comp(7, 'Companhia de Viação', 'Viação', '🚌', 200);
  prop(8, 'Av. Rebouças', 'Rebouças', 'red', 220, 1);
  prop(9, 'Av. 9 de Julho', '9 de Julho', 'red', 220, .95);
  def(10, { n: 'Prisão', s: 'Prisão', t: 'jail', ic: '🚓' });
  prop(11, 'Av. Europa', 'Av. Europa', 'orange', 200, 1.05);
  sr(12);
  prop(13, 'Rua Augusta', 'R. Augusta', 'orange', 180, 1);
  prop(14, 'Av. Pacaembu', 'Pacaem­bu', 'orange', 180, .95);
  comp(15, 'Companhia de Táxi', 'Táxi', '🚕', 150);
  sr(16);
  prop(17, 'Interlagos', 'Inter­lagos', 'dblue', 350, .95);
  def(18, { n: 'Lucros e Dividendos', s: 'Lucros', t: 'divi', amt: 200, ic: '💰' });
  prop(19, 'Morumbi', 'Morumbi', 'dblue', 400, 1.05);
  def(20, { n: 'Parada Livre', s: 'Parada Livre', t: 'park', ic: '🅿️' });
  prop(21, 'Flamengo', 'Flamengo', 'lblue', 120, 1.05);
  prop(22, 'Botafogo', 'Botafogo', 'lblue', 100, 1);
  def(23, { n: 'Imposto de Renda', s: 'Imp. Renda', t: 'tax', amt: 200, ic: '💸' });
  comp(24, 'Companhia de Navegação', 'Nave­gação', '⛴️', 150);
  prop(25, 'Av. Brasil', 'Av. Brasil', 'pink', 160, .95);
  prop(26, 'Av. Paulista', 'Av. Paulista', 'pink', 140, 1.05);
  prop(27, 'Jardim Europa', 'Jd. Europa', 'pink', 140, 1);
  sr(28);
  prop(29, 'Copacabana', 'Copaca­bana', 'yellow', 260, 1.05);
  def(30, { n: 'Vá para a Prisão', s: 'Vá p/ Prisão', t: 'gojail', ic: '👮' });
  prop(31, 'Av. Vieira Souto', 'Vieira Souto', 'green', 320, 1);
  prop(32, 'Av. Atlântica', 'Av. Atlân­tica', 'green', 300, .98);
  comp(33, 'Companhia de Aviação', 'Aviação', '✈️', 200);
  prop(34, 'Ipanema', 'Ipanema', 'green', 300, 1.1);
  prop(35, 'Jardim Paulista', 'Jd. Paulista', 'yellow', 280, 1);
  sr(36);
  prop(37, 'Brooklin', 'Brooklin', 'yellow', 260, .95);
  comp(38, 'Companhia de Táxi Aéreo', 'Táxi Aéreo', '🚁', 200);
  sr(39);

  const GT = {}; T.forEach(t => { if (t.g) (GT[t.g] = GT[t.g] || []).push(t.i); });
  const COMPS = T.filter(t => t.t === 'comp').map(t => t.i);
  const COMP_MULT = [0, 8, 16, 26, 38, 52, 70];                          // aluguel da companhia = dados × multiplicador (por qtd. possuída)
  const isOwnable = t => t.t === 'prop' || t.t === 'comp';
  const gridPos = i => (i <= 10 ? [11, 11 - i] : i <= 20 ? [21 - i, 1] : i <= 30 ? [1, i - 19] : [i - 29, 11]);

  // ---------------- Sorte ou Revés (um único baralho) ----------------
  const CARDS = [
    { k: 's', tx: 'Você acertou na Mega-Sena! Receba $200.', t: 'gain', n: 200 },
    { k: 's', tx: 'Seu time foi campeão! Receba $50 de cada jogador.', t: 'eachPay', n: 50 },
    { k: 's', tx: 'Avance até o Ponto de Partida e receba $200.', t: 'moveTo', i: 0 },
    { k: 's', tx: 'Herança de um tio do interior: receba $100.', t: 'gain', n: 100 },
    { k: 's', tx: 'Você foi promovido no emprego! Receba $150.', t: 'gain', n: 150 },
    { k: 's', tx: 'Saída livre da Prisão! Guarde esta carta.', t: 'jailcard' },
    { k: 's', tx: 'Vendeu o carro velho: receba $80.', t: 'gain', n: 80 },
    { k: 's', tx: 'Avance até Interlagos. Se passar pelo Ponto de Partida, receba $200.', t: 'moveTo', i: 17 },
    { k: 's', tx: 'Restituição do Imposto de Renda: receba $120.', t: 'gain', n: 120 },
    { k: 's', tx: 'Seu aplicativo viralizou! Receba $250.', t: 'gain', n: 250 },
    { k: 's', tx: 'Avance até a companhia mais próxima. Se tiver dono, pague o DOBRO do aluguel.', t: 'nearest' },
    { k: 's', tx: 'Sua banda tocou no Rock in Rio: receba $100.', t: 'gain', n: 100 },
    { k: 's', tx: 'Passeio em Ipanema! Avance até lá. Se passar pelo Ponto de Partida, receba $200.', t: 'moveTo', i: 34 },
    { k: 's', tx: 'Ganhou o concurso de culinária: receba $60.', t: 'gain', n: 60 },
    { k: 's', tx: 'Vá até o Leblon. Se passar pelo Ponto de Partida, receba $200.', t: 'moveTo', i: 1 },
    { k: 'r', tx: 'Multa por excesso de velocidade: pague $80.', t: 'lose', n: 80 },
    { k: 'r', tx: 'Vá direto para a Prisão. Não passe pelo Ponto de Partida.', t: 'jail' },
    { k: 'r', tx: 'Mensalidade da escola: pague $150.', t: 'lose', n: 150 },
    { k: 'r', tx: 'Reformas nos seus imóveis: pague $25 por casa e $100 por hotel.', t: 'repairs', a: 25, b: 100 },
    { k: 'r', tx: 'Perdeu a aposta no jogo de futebol: pague $50 a cada jogador.', t: 'payEach', n: 50 },
    { k: 'r', tx: 'Volte 3 casas.', t: 'back', n: 3 },
    { k: 'r', tx: 'Conta do hospital: pague $100.', t: 'lose', n: 100 },
    { k: 'r', tx: 'Imposto sobre patrimônio: pague 10% do seu dinheiro (máx. $300).', t: 'pct' },
    { k: 'r', tx: 'Jantar com os amigos: pague $60.', t: 'lose', n: 60 },
    { k: 'r', tx: 'Roubaram seu celular: pague $120.', t: 'lose', n: 120 },
    { k: 'r', tx: 'Taxa de condomínio atrasada: pague $90.', t: 'lose', n: 90 },
    { k: 'r', tx: 'Obras da prefeitura: pague $40 por casa e $115 por hotel.', t: 'repairs', a: 40, b: 115 },
    { k: 'r', tx: 'A enchente alagou o térreo: pague $200.', t: 'lose', n: 200 },
    { k: 'r', tx: 'Pneu furado e guincho: pague $70.', t: 'lose', n: 70 },
    { k: 'r', tx: 'Multa ambiental: pague $150.', t: 'lose', n: 150 }
  ];

  const TOKENS = ['🚗', '🚀', '🎩', '🐶', '🛵', '🚁'];
  const PCOL = ['#6c8cff', '#f87171', '#4ade80', '#fbbf24', '#c084fc', '#22d3ee'];
  const PERSONAS = [
    { name: 'Magnata', emoji: '🦈', aggr: .9, caution: .2, trade: .5, desc: 'Compra tudo e constrói cedo' },
    { name: 'Contador', emoji: '🦉', aggr: .4, caution: .85, trade: .3, desc: 'Guarda reserva alta' },
    { name: 'Negociante', emoji: '🦊', aggr: .6, caution: .5, trade: .95, desc: 'Vive propondo trocas' },
    { name: 'Tartaruga', emoji: '🐢', aggr: .3, caution: .9, trade: .2, desc: 'Cautelosa e paciente' },
    { name: 'Especulador', emoji: '🚀', aggr: .8, caution: .4, trade: .7, desc: 'Compra barato, vende caro' },
    { name: 'Equilibrado', emoji: '🤖', aggr: .55, caution: .55, trade: .55, desc: 'Estilo balanceado' }
  ];

  // ---------------- estado ----------------
  const alive = () => M.players.filter(p => !p.bankrupt);
  const owned = p => T.filter(t => isOwnable(t) && M.props[t.i].owner === p.id);
  const nOwned = (pid, list) => list.filter(j => M.props[j].owner === pid).length;
  const mortVal = t => t.p / 2;
  const unmortCost = t => Math.ceil(t.p / 2 * 1.1);
  function netWorth(p) {
    let v = p.cash - p.debt;
    owned(p).forEach(t => { const pr = M.props[t.i]; v += pr.mort ? t.p / 2 : t.p; if (t.t === 'prop') v += pr.h * t.hc; });
    return v;
  }
  function rentOf(i, dice, mult) {
    const t = T[i], pr = M.props[i]; if (pr.owner < 0 || pr.mort) return 0;
    if (t.t === 'prop') return t.r[pr.h];
    return dice * COMP_MULT[nOwned(pr.owner, COMPS)] * (mult || 1);
  }
  const rentLabel = h => (h === 0 ? 'terreno' : h === 5 ? 'hotel' : h + (h === 1 ? ' casa' : ' casas'));

  // ---------------- montagem ----------------
  function mount(root) {
    M = { root, tok: {}, speed: 1, skill: Core.store.get('metro.skill', 1), N: Core.store.get('metro.n', 4), cash: Core.store.get('metro.cash2', 2500), limit: Core.store.get('metro.limit', 60), spectator: false };
    root.append(Core.topbar('METRÓPOLE', h('button', { class: 'btn icon', title: 'Regras', onclick: showRules }, '?')));
    M.box = h('div', { class: 'mp' }); root.append(M.box);
    showSetup();
  }
  function unmount() { if (M) { M.tok = {}; } M = null; }

  function showRules() {
    Core.modal({
      title: 'Regras de Metrópole', buttons: [{ text: 'Entendi', cls: 'primary', value: 1 }],
      body: h('div', { class: 'small', style: { lineHeight: 1.55 }, html:
        '<b>Objetivo:</b> deixar os adversários falidos e ser o último de pé (ou, no modo por rodadas, ter o maior patrimônio).<br>' +
        '<b>Turno:</b> role 2 dados e ande. Dobles = jogue de novo; 3 dobles seguidos = Prisão.<br>' +
        '<b>Terrenos e companhias:</b> ao cair numa propriedade livre, compre pelo preço ou ela vai a <b>leilão</b>. Cair numa de outro jogador = pagar aluguel.<br>' +
        '<b>Construção:</b> você pode construir <b>casas</b> (até 4) e depois um <b>hotel</b> direto em cada terreno que possui, sem precisar completar região. Cada casa/hotel aumenta muito o aluguel daquele terreno. Você pode construir ao <b>cair na sua propriedade</b> ou pelo botão 🏗 Gerenciar. Estoque do banco: 32 casas e 12 hotéis.<br>' +
        '<b>Companhias:</b> o aluguel é o valor dos dados × um multiplicador que cresce com o número de companhias do dono (são 6).<br>' +
        '<b>Negociação:</b> venda, compre ou troque propriedades e dinheiro com qualquer jogador. Se a IA recusar, ela faz uma <b>contraproposta</b> com o valor que aceitaria.<br>' +
        '<b>Hipoteca:</b> receba metade do preço (terreno sem construções); para resgatar pague metade + 10%. Hipotecadas não rendem aluguel.<br>' +
        '<b>Empréstimo:</b> no Banco você pega até $500; paga 10% de juros a cada passagem pelo Ponto de Partida.<br>' +
        '<b>Ponto de Partida:</b> receba $200 a cada volta. <b>Lucros e Dividendos:</b> receba $200. <b>Imposto de Renda:</b> pague $200.<br>' +
        '<b>Prisão:</b> saia pagando $50, usando a carta, ou tirando dobles (3 tentativas, depois paga). Preso ainda cobra aluguel e negocia.<br>' +
        '<b>Falência:</b> sem como pagar (mesmo vendendo tudo), você sai e seus bens vão ao credor (ou ao banco).<br>' +
        '<b>Sorte ou Revés:</b> cartas com prêmios, multas, movimentos e a “Saída livre da Prisão”.' })
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
      h('div', { class: 'panel' }, h('h3', null, 'Dinheiro inicial'), seg([[1500, '$1.500'], [2500, '$2.500'], [4000, '$4.000']], 'cash', 'metro.cash2')),
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
    M.houses = 32; M.hotels = 12; M.turn = 0; M.round = 1; M.doubles = 0; M.dice = [0, 0]; M.speed = 1; M.log = []; M.lastHumanOffer = -9; M.nTrades = 0; M.nBuilt = 0; M.nBank = 0; M.offers = {};
    M.deck = shuffle(CARDS.slice());
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
      const el = h('div', { class: `tile s-${side} t-${t.t}`, style: { gridRow: r, gridColumn: c }, onclick: () => showTile(t.i) },
        t.g ? h('i', { class: 'band', style: { background: GR[t.g].c } }) : null,
        h('span', { class: 'tn' }, t.ic ? t.ic + ' ' : '', t.s),
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
    M.ui.info.textContent = `Rodada ${M.round}${M.limit ? ' / ' + M.limit : ''} · Vez: ${M.players[M.turn].name} · 🏠${M.houses} 🏨${M.hotels}`;
    M.ui.dice.innerHTML = ''; if (M.dice[0]) { M.ui.dice.append(dieEl(M.dice[0]), dieEl(M.dice[1])); }
    M.ui.players.innerHTML = '';
    M.players.forEach(p => {
      const dots = h('div', { class: 'pdots' });
      owned(p).forEach(t => dots.append(h('i', { class: M.props[t.i].mort ? 'mort' : '', title: t.n, style: { background: t.g ? GR[t.g].c : '#ffd166' } }, M.props[t.i].h ? (M.props[t.i].h === 5 ? 'H' : M.props[t.i].h) : '')));
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
      [['Aluguel do terreno', 0], ['Com 1 casa', 1], ['Com 2 casas', 2], ['Com 3 casas', 3], ['Com 4 casas', 4], ['Com hotel', 5]].forEach(([a, k]) =>
        body.append(h('div', { class: 'row sb small' + (o && pr.h === k ? ' good-t' : '') }, h('span', null, a), h('b', null, fmt(t.r[k])))));
      body.append(h('div', { class: 'row sb small muted', style: { marginTop: '6px' } }, h('span', null, 'Preço de cada casa / hotel'), h('span', null, fmt(t.hc))));
    } else if (t.t === 'comp') body.append(h('div', { class: 'tcard-head', style: { background: '#6a5a1f' } }, t.ic + ' ' + t.n),
      h('p', { class: 'small' }, 'Aluguel = valor dos dados × multiplicador, conforme quantas companhias o dono possui: ' + COMP_MULT.slice(1).map((m, k) => `${k + 1} → ${m}×`).join(' · ') + '.'));
    else body.append(h('div', { class: 'tcard-head', style: { background: '#33406a' } }, (t.ic || '') + ' ' + t.n), h('p', { class: 'small' }, { start: 'Receba $200 ao passar por aqui.', tax: `Pague ${fmt(t.amt || 0)} ao banco.`, divi: `Receba ${fmt(t.amt || 0)} de lucros e dividendos.`, sr: 'Compre uma carta de Sorte ou Revés.', jail: 'Apenas visitando (ou preso).', park: 'Descanso. Nada acontece.', gojail: 'Vá direto para a Prisão!' }[t.t] || ''));
    if (isOwnable(t)) {
      body.append(h('div', { class: 'small', style: { marginTop: '8px' } }, `Preço: ${fmt(t.p)} · Hipoteca: ${fmt(mortVal(t))}`));
      body.append(h('div', { class: 'small', style: { marginTop: '4px' } }, o ? `Dono: ${o.emoji} ${o.name}${pr.mort ? ' (hipotecada)' : ''}${pr.h ? ' · ' + rentLabel(pr.h) : ''}` : 'Sem dono'));
    }
    Core.modal({ title: '', body, buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
  }
  function showPlayer(p) {
    if (p.human) { openManage(p, { view: true }); return; }
    const list = owned(p);
    const body = h('div', null, h('div', { class: 'small' }, `${p.emoji} ${p.name} · ${fmt(p.cash)}${p.debt ? ` · dívida ${fmt(p.debt)}` : ''} · patrimônio ${fmt(netWorth(p))}`),
      h('div', { style: { marginTop: '8px' } }, list.length ? list.map(t => h('div', { class: 'row small', style: { padding: '3px 0' } }, h('i', { class: 'sw', style: { background: t.g ? GR[t.g].c : '#ffd166' } }), h('span', { class: 'grow' }, t.n), h('span', { class: 'muted' }, (M.props[t.i].mort ? 'hipotecada ' : '') + (M.props[t.i].h ? rentLabel(M.props[t.i].h) : '')))) : h('div', { class: 'muted small' }, 'Sem propriedades.')));
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
    M.result = rank.map(p => ({ name: p.name, worth: p.bankrupt ? null : netWorth(p) })); M.winner = w.name; M.endRound = M.round;
    const v = await Core.modal({ title: youWon ? 'Você venceu! 🏆' : `${w.name} venceu!`, body, buttons: [{ text: 'Menu', cls: 'ghost', value: 'm' }, { text: 'Jogar de novo', cls: 'primary', value: 'r' }] });
    if (!M) return;
    if (v === 'r') showSetup(); else Core.go('');
  }

  async function takeTurn(p) {
    M.doubles = 0; renderState();
    say(`Vez de ${p.name}${p.jail ? ' (preso)' : ''}.`);
    if (!p.human) await aiPre(p);
    if (p.bankrupt) return;
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
      if (dbl && !fromJail) { M.doubles++; if (M.doubles === 3) { say(`${p.name} tirou 3 dobles seguidos: Prisão!`); await sendToJail(p); break; } }
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
    p.cash += 200; let msg = `${p.name} passou pelo Ponto de Partida: +$200`;
    if (p.debt > 0) { const i = Math.ceil(p.debt * .1); if (p.cash >= i) { p.cash -= i; msg += ` · juros −${fmt(i)}`; } else { p.debt += i; msg += ` · juros somados à dívida`; } }
    say(msg); Core.snd('chip');
  }
  async function moveBy(p, steps) {
    for (let k = 0; k < steps; k++) { p.pos = (p.pos + 1) % 40; if (p.pos === 0) await passStart(p); renderState(); await wait(110); }
    await land(p, M.dice[0] + M.dice[1]);
  }
  async function moveTo(p, target, collect) {
    let guard = 0;
    while (p.pos !== target && guard++ < 41) { p.pos = (p.pos + 1) % 40; if (p.pos === 0 && collect !== false) await passStart(p); renderState(); await wait(90); }
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
        say(`${p.name} paga ${fmt(rent)} de aluguel a ${o.name} (${t.n}${pr.h ? ', ' + rentLabel(pr.h) : ''}).`);
        await pay(p, o.id, rent);
      } else if (pr.owner === p.id) {
        say(`${p.name} está em casa (${t.n}).`);
        if (t.t === 'prop') { if (p.human) await humanBuildPrompt(p, t.i); else await aiBuild(p, t.i); }
      }
    } else if (t.t === 'tax') { say(`${p.name} paga ${fmt(t.amt)} de Imposto de Renda.`); await pay(p, -1, t.amt); }
    else if (t.t === 'divi') { p.cash += t.amt; say(`${p.name} recebe ${fmt(t.amt)} de Lucros e Dividendos.`); Core.snd('chip'); renderState(); await wait(400); }
    else if (t.t === 'sr') await drawCard(p);
    else if (t.t === 'gojail') { say(`${p.name} vai preso!`); await sendToJail(p); }
    else await wait(250);
  }

  // ---------------- cartas ----------------
  async function drawCard(p) {
    const c = M.deck.shift();
    if (c.t !== 'jailcard') M.deck.push(c);
    Core.snd('card');
    const title = c.k === 's' ? '🍀 SORTE' : '⚡ REVÉS';
    if (p.human) await Core.modal({ title, body: h('div', { class: 'cardtxt' }, c.tx), buttons: [{ text: 'OK', cls: 'primary', value: 1 }], dismiss: false });
    else { say(`${p.name} comprou ${title}: ${c.tx}`); await wait(1700); }
    await applyCard(p, c);
  }
  async function applyCard(p, c) {
    switch (c.t) {
      case 'gain': p.cash += c.n; say(`${p.name} recebe ${fmt(c.n)}.`); Core.snd('chip'); break;
      case 'lose': await pay(p, -1, c.n); break;
      case 'pct': await pay(p, -1, Math.min(300, Math.round(p.cash * .1))); break;
      case 'moveTo': await moveTo(p, c.i, true); await land(p, M.dice[0] + M.dice[1]); break;
      case 'back': p.pos = (p.pos - c.n + 40) % 40; renderState(); await wait(400); await land(p, M.dice[0] + M.dice[1]); break;
      case 'jail': await sendToJail(p); break;
      case 'jailcard': p.jailCards++; say(`${p.name} guarda a carta “Saída livre da Prisão”.`); break;
      case 'eachPay': for (const o of alive()) if (o.id !== p.id) { await pay(o, p.id, c.n); } break;
      case 'payEach': for (const o of alive()) if (o.id !== p.id && !p.bankrupt) await pay(p, o.id, c.n); break;
      case 'repairs': { let hs = 0, ht = 0; owned(p).forEach(t => { if (t.t === 'prop') { const k = M.props[t.i].h; if (k === 5) ht++; else hs += k; } }); const tot = hs * c.a + ht * c.b; say(`${p.name}: ${hs} casas e ${ht} hotéis = ${fmt(tot)}.`); await pay(p, -1, tot); break; }
      case 'nearest': {
        let tgt = p.pos;
        for (let k = 1; k <= 40; k++) { const q = (p.pos + k) % 40; if (COMPS.includes(q)) { tgt = q; break; } }
        await moveTo(p, tgt, true);
        await land(p, M.dice[0] + M.dice[1], { mult: 2 }); break;
      }
      default: break;
    }
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
    owned(p).forEach(t => { const pr = M.props[t.i]; if (t.t === 'prop') v += pr.h * t.hc / 2; if (!pr.mort) v += mortVal(t); });
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
    M.nBank = (M.nBank || 0) + 1;
    say(`💥 ${p.name} FALIU${cred ? ` (credor: ${cred.name})` : ''}!`); Core.snd('lose');
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
      const body = h('div', null, h('div', { class: 'tcard-head', style: { background: t.g ? GR[t.g].c : '#6a5a1f' } }, (t.ic || '') + ' ' + t.n),
        h('p', null, `Preço: ${fmt(t.p)} · Seu dinheiro: ${fmt(p.cash)}`),
        t.g ? h('div', { class: 'small muted' }, `Aluguel ${fmt(t.r[0])} · com hotel ${fmt(t.r[5])} · cada casa ${fmt(t.hc)}`) : h('div', { class: 'small muted' }, 'Aluguel: dados × multiplicador (cresce com o nº de companhias).'));
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
    const body = h('div', null, h('div', { class: 'tcard-head', style: { background: t.g ? GR[t.g].c : '#6a5a1f' } }, t.n),
      h('p', null, `Lance atual: ${bid ? fmt(bid) + ' (' + M.players[leader].name + ')' : 'nenhum'} · Preço de tabela: ${fmt(t.p)}`), h('div', { class: 'small muted' }, `Seu dinheiro: ${fmt(p.cash)}`));
    const buttons = opts.map(n => ({ text: `+${n}`, cls: 'primary', value: bid + n })); buttons.push({ text: 'Passar', cls: 'ghost', value: 0 });
    if (!opts.length && bid === 0 && p.cash >= 10) buttons.unshift({ text: `Dar ${fmt(Math.min(p.cash, 10))}`, cls: 'primary', value: Math.min(p.cash, 10) });
    return await Core.modal({ title: 'Leilão', body, buttons, dismiss: false });
  }

  // ---------------- prisão ----------------
  async function jailTurn(p) {
    let choice = p.human ? await humanJail(p) : aiJail(p);
    if (choice === 'card' && p.jailCards > 0) { p.jailCards--; p.jail = 0; say(`${p.name} usou a carta e saiu da Prisão.`); return { free: true }; }
    if (choice === 'pay' && p.cash >= 50) { await pay(p, -1, 50); p.jail = 0; say(`${p.name} pagou $50 e saiu da Prisão.`); return { free: true }; }
    const d = await doRoll(p);
    if (d[0] === d[1]) { p.jail = 0; say(`${p.name} tirou dobles e saiu da Prisão!`); return { dice: d }; }
    p.jail++;
    if (p.jail > 3) { say(`${p.name} cumpriu a pena: paga $50 e sai.`); await pay(p, -1, 50); if (p.bankrupt) return {}; p.jail = 0; return { dice: d }; }
    say(`${p.name} continua preso (${p.jail - 1}/3).`); await wait(700); return { stay: true };
  }
  async function humanJail(p) {
    const btns = [{ text: 'Tentar dobles', cls: 'ghost', value: 'roll' }];
    if (p.cash >= 50) btns.unshift({ text: 'Pagar $50', cls: 'primary', value: 'pay' });
    if (p.jailCards) btns.unshift({ text: 'Usar carta 🎟', cls: 'good', value: 'card' });
    setCtl('wait');
    return await Core.modal({ title: '🚓 Você está na Prisão', body: `Tentativa ${p.jail} de 3. Pague $50, use uma carta ou tente tirar dobles.`, buttons: btns, dismiss: false });
  }

  // ---------------- construção / hipoteca (direto no terreno) ----------------
  function canBuild(p, i) {
    const t = T[i], pr = M.props[i]; if (t.t !== 'prop' || pr.owner !== p.id || pr.mort || pr.h >= 5) return false;
    if (pr.h === 4 ? M.hotels <= 0 : M.houses <= 0) return false;
    return p.cash >= t.hc;
  }
  function doBuild(p, i) { const pr = M.props[i], hc = T[i].hc; M.nBuilt = (M.nBuilt || 0) + 1; pr.h++; p.cash -= hc; if (pr.h === 5) { M.hotels--; M.houses += 4; } else M.houses--; }
  function canSell(p, i) {
    const t = T[i], pr = M.props[i]; if (t.t !== 'prop' || pr.owner !== p.id || pr.h <= 0) return false;
    return pr.h !== 5 || M.houses >= 4;
  }
  function doSell(p, i) { const pr = M.props[i]; if (pr.h === 5) { M.hotels++; M.houses -= 4; } else M.houses++; pr.h--; p.cash += T[i].hc / 2; }
  function canMortgage(p, i) { const t = T[i], pr = M.props[i]; return pr.owner === p.id && !pr.mort && (t.t !== 'prop' || pr.h === 0); }
  function doMortgage(p, i) { M.props[i].mort = true; p.cash += mortVal(T[i]); }
  function canUnmortgage(p, i) { const pr = M.props[i]; return pr.owner === p.id && pr.mort && p.cash >= unmortCost(T[i]); }
  function doUnmortgage(p, i) { M.props[i].mort = false; p.cash -= unmortCost(T[i]); }

  /** Ao cair no próprio terreno o jogador pode construir */
  async function humanBuildPrompt(p, i) {
    const t = T[i];
    for (let guard = 0; guard < 6; guard++) {
      const pr = M.props[i];
      if (!canBuild(p, i)) {
        if (guard === 0 && pr.h < 5 && !pr.mort && M.props[i].owner === p.id && p.cash < t.hc) Core.toast(`Sem dinheiro para construir (${fmt(t.hc)}).`);
        return;
      }
      const hotel = pr.h === 4;
      const body = h('div', null, h('div', { class: 'tcard-head', style: { background: GR[t.g].c } }, t.n),
        h('p', null, `Hoje: ${rentLabel(pr.h)} · aluguel ${fmt(t.r[pr.h])}`),
        h('p', null, `Depois: ${rentLabel(pr.h + 1)} · aluguel `, h('b', { class: 'good-t' }, fmt(t.r[pr.h + 1]))),
        h('div', { class: 'small muted' }, `Custo ${fmt(t.hc)} · Seu dinheiro ${fmt(p.cash)}`));
      const r = await Core.modal({ title: hotel ? '🏨 Construir hotel?' : '🏠 Construir casa?', body, dismiss: false, buttons: [{ text: 'Agora não', cls: 'ghost', value: false }, { text: `Construir ${fmt(t.hc)}`, cls: 'primary', value: true }] });
      if (!r) return;
      doBuild(p, i); Core.snd('chip'); say(`${p.name} construiu ${hotel ? 'um hotel' : 'uma casa'} em ${t.n}.`); renderState(); await wait(350);
    }
  }

  /** Painel de gerenciamento (usado no menu e ao levantar dinheiro) */
  function manageNode(p, need) {
    const node = h('div', { class: 'mng' });
    const render = () => {
      node.innerHTML = '';
      node.append(h('div', { class: 'row sb', style: { marginBottom: '8px' } }, h('b', null, `Dinheiro: ${fmt(p.cash)}`), need ? h('b', { class: p.cash >= need ? 'good-t' : 'bad' }, `Precisa: ${fmt(need)}`) : h('span', { class: 'muted small' }, `Casas ${M.houses} · Hotéis ${M.hotels}`)));
      const list = owned(p);
      if (!list.length) node.append(h('p', { class: 'muted small' }, 'Você ainda não tem propriedades.'));
      const groups = {};
      list.forEach(t => { const k = t.g || 'comp'; (groups[k] = groups[k] || []).push(t); });
      Object.keys(groups).forEach(k => {
        const col = GR[k] ? GR[k].c : '#ffd166';
        node.append(h('div', { class: 'mg-head', style: { borderLeftColor: col } }, GR[k] ? GR[k].n : 'Companhias'));
        groups[k].forEach(t => {
          const pr = M.props[t.i];
          const nextR = t.t === 'prop' && pr.h < 5 ? ` → ${fmt(t.r[pr.h + 1])}` : '';
          node.append(h('div', { class: 'mg-row' },
            h('div', { class: 'grow' }, h('b', null, t.n), h('div', { class: 'small muted' }, (pr.mort ? '🔒 hipotecada' : t.t === 'prop' ? `${rentLabel(pr.h)} · aluguel ${fmt(t.r[pr.h])}${nextR}` : `${t.ic} aluguel ${COMP_MULT[nOwned(p.id, COMPS)]}× dados`))),
            t.t === 'prop' && !pr.mort && pr.h < 5 ? h('button', { class: 'btn sm' + (canBuild(p, t.i) ? '' : ' disabled'), onclick: () => { if (canBuild(p, t.i)) { doBuild(p, t.i); Core.snd('chip'); renderState(); render(); } } }, `${pr.h === 4 ? '🏨' : '🏠'} ${fmt(t.hc)}`) : null,
            t.t === 'prop' && pr.h ? h('button', { class: 'btn sm' + (canSell(p, t.i) ? '' : ' disabled'), onclick: () => { if (canSell(p, t.i)) { doSell(p, t.i); renderState(); render(); } } }, `Vender +${fmt(t.hc / 2)}`) : null,
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
        h('p', { class: 'small muted' }, `Limite de empréstimo: ${fmt(LOAN_MAX)}. Juros de 10% da dívida a cada passagem pelo Ponto de Partida.`),
        h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '8px' } },
          [100, 200, 500].map(n => h('button', { class: 'btn sm' + (p.debt + n <= LOAN_MAX ? '' : ' disabled'), onclick: () => { if (p.debt + n <= LOAN_MAX) { p.debt += n; p.cash += n; renderState(); render(); } } }, `Pegar ${fmt(n)}`)),
          [100, 200, 500].map(n => h('button', { class: 'btn sm good' + (p.debt >= n && p.cash >= n ? '' : ' disabled'), onclick: () => { if (p.debt >= n && p.cash >= n) { p.debt -= n; p.cash -= n; renderState(); render(); } } }, `Pagar ${fmt(n)}`)),
          h('button', { class: 'btn sm good' + (p.debt > 0 && p.cash >= p.debt ? '' : ' disabled'), onclick: () => { if (p.debt > 0 && p.cash >= p.debt) { p.cash -= p.debt; p.debt = 0; renderState(); render(); } } }, 'Quitar tudo')));
    };
    render();
    await Core.modal({ title: '🏦 Banco', body, buttons: [{ text: 'Fechar', cls: 'primary', value: 1 }] });
  }

  // ============================================================
  //  AVALIAÇÃO ECONÔMICA (usada pela IA para comprar, vender e negociar)
  // ============================================================
  const HIT = .175;                                         // chance de um adversário cair numa casa específica em cada turno (≈ 7/40)
  const oppCount = pid => Math.max(1, alive().filter(o => o.id !== pid).length);
  const horizon = () => (M.limit ? clamp(M.limit - M.round, 1, 4) : 4);
  const cashMult = q => 1 + clamp((350 - q.cash) / 350, 0, 1) * .45 + (q.debt ? .08 : 0) + (q.ai ? q.ai.caution * .12 : 0);   // dinheiro vale mais para quem está apertado
  const potential = q => clamp((q.cash - 300) / 1500, 0, 1);                                                                    // quem tem caixa consegue construir
  const compInc = (n, opp) => (n <= 0 ? 0 : n * 7 * COMP_MULT[n] * HIT * opp);
  /** quanto a propriedade i vale para o jogador q (em dinheiro) */
  function worth(q, i) {
    const t = T[i], pr = M.props[i], opp = oppCount(q.id), H = horizon();
    let v;
    if (t.t === 'prop') {
      const hh = pr.h;
      v = t.p + hh * t.hc * .8 + t.r[hh] * HIT * opp * H;
      if (hh < 5) v += (t.r[Math.min(5, hh + 2)] - t.r[hh]) * HIT * opp * H * .06 * (.4 + potential(q));
    } else {
      const own = pr.owner === q.id, n = nOwned(q.id, COMPS) + (own ? 0 : 1);
      v = t.p + (compInc(n, opp) - compInc(n - 1, opp)) * H;
    }
    if (pr.mort) v *= .72;
    return v * (q.ai ? .93 + q.ai.aggr * .14 : 1);
  }
  /** receio de entregar uma propriedade a um rival que está na frente */
  function denial(q, o, i) {
    const avg = alive().reduce((a, x) => a + netWorth(x), 0) / alive().length;
    let d = .03 + (netWorth(o) > avg * 1.25 ? .08 : 0);
    if (T[i].t === 'comp' && nOwned(o.id, COMPS) >= 2) d += .06;
    return d;
  }
  const mrg = q => clamp(.035 + (M.skill - 1) * .06 - ((q.ai ? q.ai.trade : .5) - .5) * .03, -.02, .12);
  const minCash = () => 30;

  /** a IA q aceita? get = o que q recebe; give = o que q entrega; o = outro jogador */
  function aiEval(q, o, get, getCash, give, giveCash) {
    const cm = cashMult(q);
    let getV = getCash * cm, giveV = giveCash * cm;
    get.forEach(i => { getV += worth(q, i); });
    give.forEach(i => { giveV += worth(q, i) * (1 + denial(q, o, i)); });
    const margin = Math.max(getV, giveV) * mrg(q), u = getV - giveV;
    const empty = !(get.length + give.length + getCash + giveCash);
    const cashAfter = q.cash + getCash - giveCash;
    const fees = get.reduce((a, i) => a + (M.props[i].mort ? Math.ceil(mortVal(T[i]) * .1) : 0), 0);
    return { ok: !empty && u >= margin && cashAfter - fees >= minCash() && q.cash >= giveCash && o.cash >= getCash, u, margin, cm, getV, giveV };
  }
  /** se a IA recusou, calcula quanto dinheiro a mais ela aceitaria (ou null se não há acordo possível) */
  function aiCounter(q, o, get, getCash, give, giveCash) {
    let e = aiEval(q, o, get, getCash, give, giveCash);
    let net = getCash - giveCash, extra = 0;
    for (let k = 0; k < 8 && !e.ok; k++) {
      extra += Math.max(10, Math.ceil((e.margin - e.u) / e.cm / 10) * 10);
      const n2 = net + extra, g2 = Math.max(0, n2), v2 = Math.max(0, -n2);
      e = aiEval(q, o, get, g2, give, v2);
      if (g2 > o.cash || v2 > q.cash - minCash()) return null;
    }
    if (!e.ok) return null;
    const n2 = net + extra;
    if (extra > Math.max(60, Math.max(e.getV, e.giveV) * 1.6)) return null;
    return { getCash: Math.max(0, n2), giveCash: Math.max(0, -n2), extra };
  }
  function execTrade(a, b, aGive, aCash, bGive, bCash) {
    M.nTrades = (M.nTrades || 0) + 1;
    aGive.forEach(i => { M.props[i].owner = b.id; }); bGive.forEach(i => { M.props[i].owner = a.id; });
    a.cash += bCash - aCash; b.cash += aCash - bCash;
    [[aGive, b], [bGive, a]].forEach(([lst, to]) => lst.forEach(i => { if (M.props[i].mort) to.cash -= Math.min(to.cash, Math.ceil(mortVal(T[i]) * .1)); }));
    renderState(); Core.snd('chip');
  }
  const describeItems = (ids, cash) => { const a = ids.map(i => T[i].n + (M.props[i].h ? ` (${rentLabel(M.props[i].h)})` : '')); if (cash) a.push(fmt(cash)); return a.length ? a.join(' + ') : 'nada'; };

  // ---------------- negociação (jogador humano) ----------------
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
        const c = h('div', { class: 'tr-col' }, h('b', null, title), h('div', { class: 'small muted' }, 'Dinheiro: ' + fmt(who.cash)));
        const list = owned(who);
        if (!list.length) c.append(h('div', { class: 'muted small' }, 'sem propriedades'));
        list.forEach(t => c.append(h('button', { class: 'tr-it' + (set.has(t.i) ? ' on' : ''), onclick: () => { if (set.has(t.i)) set.delete(t.i); else set.add(t.i); render(); } }, h('i', { class: 'sw', style: { background: t.g ? GR[t.g].c : '#ffd166' } }), h('span', { class: 'grow' }, t.s), h('span', { class: 'muted' }, (M.props[t.i].h ? (M.props[t.i].h === 5 ? '🏨' : '🏠' + M.props[t.i].h) : '') + (M.props[t.i].mort ? '🔒' : '')))));
        const st = n => h('button', { class: 'btn sm', onclick: () => { cashSet(clamp(cashGet() + n, 0, who.cash)); render(); } }, (n > 0 ? '+' : '−') + Math.abs(n));
        c.append(h('div', { class: 'tr-cash' }, h('b', null, fmt(cashGet())), h('div', { class: 'row', style: { gap: '4px', justifyContent: 'center' } }, st(-100), st(-10), st(10), st(100))));
        return c;
      };
      body.append(h('div', { class: 'tr-cols' }, col('Você oferece', p, give, () => myCash, v => { myCash = v; }), col(`${q.name} entrega`, q, take, () => hisCash, v => { hisCash = v; })),
        h('div', { class: 'small muted', style: { marginTop: '8px' } }, 'Dica: para saber quanto a IA pede por uma propriedade, marque-a do lado dela, deixe seu dinheiro em $0 e proponha — ela responde com uma contraproposta.'));
    };
    render();
    const r = await Core.modal({ title: `🤝 Proposta para ${q.name}`, body, buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Propor', cls: 'primary', value: true }], dismiss: false });
    if (!r) return;
    if (!give.size && !take.size && !myCash && !hisCash) { Core.toast('Proposta vazia'); return; }
    const G = Array.from(give), Tk = Array.from(take);
    const res = aiEval(q, p, G, myCash, Tk, hisCash);
    await wait(500);
    if (res.ok) { execTrade(p, q, G, myCash, Tk, hisCash); say(`🤝 ${q.name} aceitou a troca!`); Core.toast(`${q.name} aceitou!`); return; }
    const ctr = aiCounter(q, p, G, myCash, Tk, hisCash);
    if (ctr && ctr.getCash <= p.cash) {
      const c = ctr;
      const ok = await Core.modal({ title: `${q.emoji} Contraproposta de ${q.name}`, dismiss: false,
        body: h('div', null, h('p', null, `${q.name} recusou a proposta, mas aceita este acordo:`),
          h('div', { class: 'small' }, h('b', null, 'Você entrega: '), describeItems(G, c.getCash)), h('div', { class: 'small', style: { marginTop: '4px' } }, h('b', null, 'Você recebe: '), describeItems(Tk, c.giveCash))),
        buttons: [{ text: 'Recusar', cls: 'ghost', value: false }, { text: 'Aceitar', cls: 'primary', value: true }] });
      if (ok) { execTrade(p, q, G, c.getCash, Tk, c.giveCash); say(`🤝 ${p.name} e ${q.name} fecharam negócio.`); Core.toast('Negócio fechado!'); }
      else say(`${p.name} recusou a contraproposta de ${q.name}.`);
    } else { say(`${q.name} recusou a proposta.`); Core.toast(`${q.name} recusou: o valor está longe do que ele aceitaria.`, 2800); }
  }

  // ---------------- IA: iniciativa de negócios ----------------
  /** procura o melhor negócio possível para p (comprar, vender ou trocar) */
  function aiFindDeal(p) {
    const cmP = cashMult(p), deals = [], reserveP = reserve(p);
    const others = alive().filter(o => o.id !== p.id);
    const pOwned = owned(p);
    others.forEach(o => {
      const cmO = cashMult(o), oOwned = owned(o);
      // COMPRAR de o
      oOwned.forEach(x => {
        const wP = worth(p, x.i), wO = worth(o, x.i) * (1 + denial(o, p, x.i));
        const lo = wO * 1.05 / cmO, hi = wP * .97 / cmP;
        if (hi - lo < 25) return;
        const c = Math.ceil((lo + (hi - lo) * .35) / 10) * 10;
        if (p.cash - c < reserveP * .4 || c < 40) return;
        deals.push({ kind: 'buy', o, get: [x.i], give: [], cashIn: 0, cashOut: c, score: hi - lo });
      });
      // VENDER para o
      pOwned.forEach(y => {
        const wP = worth(p, y.i) * (1 + denial(p, o, y.i)), wO = worth(o, y.i);
        const lo = wP * 1.05 / cmP, hi = wO * .97 / cmO;
        if (hi - lo < 25) return;
        const c = Math.floor((lo + (hi - lo) * .55) / 10) * 10;
        if (o.cash - c < (o.human ? 60 : 40) || c < 40) return;
        deals.push({ kind: 'sell', o, get: [], give: [y.i], cashIn: c, cashOut: 0, score: (hi - lo) * (cmP > 1.15 ? 1.6 : .8) });
      });
      // TROCAR propriedades (com acerto em dinheiro)
      oOwned.forEach(x => pOwned.forEach(y => {
        if (T[x.i].t !== T[y.i].t) return;
        const uP = worth(p, x.i) - worth(p, y.i) * (1 + denial(p, o, y.i)), uO = worth(o, y.i) - worth(o, x.i) * (1 + denial(o, p, x.i));
        // p paga c a o (c<0 = recebe): uP − c·cmP ≥ 0.03·|uP| e uO + c·cmO ≥ 0.05·|uO|
        const cMax = (uP - Math.abs(uP) * .03) / cmP, cMin = (Math.abs(uO) * .05 - uO) / cmO;
        if (cMax - cMin < 25) return;
        const c = Math.round((cMin + (cMax - cMin) * .4) / 10) * 10;
        const out = Math.max(0, c), inn = Math.max(0, -c);
        if (out > p.cash - reserveP * .4 || inn > o.cash - 40) return;
        deals.push({ kind: 'swap', o, get: [x.i], give: [y.i], cashIn: inn, cashOut: out, score: (cMax - cMin) * .7 });
      }));
    });
    deals.sort((a, b) => b.score - a.score);
    return deals.length ? deals[0] : null;
  }
  async function aiInitiative(p) {
    if (M.round - p.lastTrade < 2 || M.round < 2) return;
    if (Math.random() > .15 + p.ai.trade * .6) return;
    const d = aiFindDeal(p); if (!d) return;
    const o = d.o;
    // com humano: no máximo uma oferta por rodada, para não encher a tela
    if (o.human && M.lastHumanOffer === M.round) return;
    p.lastTrade = M.round;
    M.offers = M.offers || {}; M.offers[d.kind + (o.human ? '_h' : '_a')] = (M.offers[d.kind + (o.human ? '_h' : '_a')] || 0) + 1;
    if (o.human) {
      M.lastHumanOffer = M.round;
      const verb = d.kind === 'buy' ? `quer comprar de você` : d.kind === 'sell' ? 'quer vender para você' : 'propõe uma troca';
      // ponto de vista do humano: entrega o que a IA quer receber (get) + paga cashIn; recebe o que a IA entrega (give) + cashOut
      const hGive = d.get, hGetItems = d.give, hPay = d.cashIn, hRecv = d.cashOut;
      const body = h('div', null, h('p', null, `${p.emoji} `, h('b', null, p.name), ` ${verb}:`),
        h('div', { class: 'small' }, h('b', null, 'Você entrega: '), describeItems(hGive, hPay)),
        h('div', { class: 'small', style: { marginTop: '4px' } }, h('b', null, 'Você recebe: '), describeItems(hGetItems, hRecv)));
      const r = await Core.modal({ title: '🤝 Proposta recebida', body, buttons: [{ text: 'Recusar', cls: 'ghost', value: false }, { text: 'Aceitar', cls: 'primary', value: true }], dismiss: false });
      if (r && hPay <= o.cash && hRecv <= p.cash) {
        execTrade(p, o, hGetItems, hRecv, hGive, hPay);              // p é "a", o (humano) é "b"
        say(`🤝 ${o.name} fechou negócio com ${p.name}.`);
      } else say(`${o.name} recusou a oferta de ${p.name}.`);
    } else {
      const res = aiEval(o, p, d.give, d.cashOut, d.get, d.cashIn);
      if (res.ok) {
        execTrade(p, o, d.give, d.cashOut, d.get, d.cashIn);
        say(`🤝 ${p.name} e ${o.name} negociaram: ${describeItems(d.give, d.cashOut)} ⇄ ${describeItems(d.get, d.cashIn)}.`); await wait(1000);
      }
    }
  }

  // ---------------- IA: reservas, compra, leilão, construção ----------------
  const hitProb = (pid, i) => {                           // chance de algum adversário cair em i logo
    let s = 0;
    alive().forEach(o => { if (o.id === pid) return; const d = (i - o.pos + 40) % 40; if (d >= 2 && d <= 12) s += (6 - Math.abs(d - 7)) / 36; else s += .02; });
    return s;
  };
  function riskAhead(p) {                                 // maior aluguel que o jogador pode encontrar nas próximas casas
    let mx = 0;
    for (let d = 2; d <= 12; d++) {
      const i = (p.pos + d) % 40, pr = M.props[i];
      if (pr.owner >= 0 && pr.owner !== p.id && !pr.mort) mx = Math.max(mx, rentOf(i, 7, 1));
    }
    return Math.min(1200, mx);
  }
  const reserve = p => {
    const base = (70 + p.ai.caution * 230) * (M.skill < 1 ? 1.25 : M.skill > 1 ? .85 : 1);
    return Math.min(900, base + riskAhead(p) * (.35 + p.ai.caution * .35));
  };
  function aiWantsBuy(p, i) {
    const t = T[i]; if (M.skill < 1 && Math.random() < .2) return false;
    if (p.cash < t.p) { if (!aiFundPurchase(p, i)) return false; }
    const w = worth(p, i), ratio = w / t.p;
    const early = M.round <= 12 || T.filter(x => isOwnable(x) && M.props[x.i].owner < 0).length > 12;
    const after = p.cash - t.p, res = reserve(p) * (early ? .3 : .75) * (1 - p.ai.aggr * .35);
    // companhia que dá maioria / terreno caro que um rival cobiçaria: vale mais
    return ratio >= 1.12 ? after >= res * .4 : after >= res;
  }
  /** hipoteca imóveis simples para conseguir comprar algo muito bom */
  function aiFundPurchase(p, i) {
    const t = T[i]; if (p.ai.aggr < .55 || M.skill < 1) return false;
    if (worth(p, i) / t.p < 1.15) return false;
    const mortgageable = owned(p).filter(x => canMortgage(p, x.i)).sort((a, b) => worth(p, a.i) / a.p - worth(p, b.i) / b.p);
    let have = p.cash; const pick = [];
    for (const x of mortgageable) { if (have >= t.p + reserve(p) * .3) break; have += mortVal(x); pick.push(x); }
    if (have < t.p + reserve(p) * .3 || !pick.length) return false;
    pick.forEach(x => doMortgage(p, x.i)); renderState(); return true;
  }
  function aiBid(p, i, bid) {
    const t = T[i];
    let maxBid = worth(p, i) * (.8 + p.ai.aggr * .3) * (M.skill < 1 ? .8 : M.skill > 1 ? 1.05 : 1);
    maxBid = Math.min(maxBid, p.cash - reserve(p) * .35);
    const inc = Math.max(10, Math.round(t.p * .05 / 10) * 10);
    if (bid === 0) { const open = Math.floor(Math.min(Math.max(10, Math.round(t.p * .4 / 10) * 10), maxBid) / 10) * 10; return open >= 10 ? open : 0; }
    const nb = bid + inc;
    return nb <= maxBid ? nb : 0;
  }
  function aiJail(p) {
    if (p.jailCards) return 'card';
    const unowned = T.filter(t => isOwnable(t) && M.props[t.i].owner < 0).length;
    if (p.cash > 350 && unowned > 6 && riskAhead(p) < 250) return 'pay';
    if (owned(p).length >= 4 && p.cash > 600 && riskAhead(p) < 150) return 'pay';
    return 'roll';
  }
  /** vende o que for menos prejudicial para levantar dinheiro */
  function aiRaise(p, need) {
    let guard = 0;
    while (p.cash < need && guard++ < 120) {
      const acts = [];
      owned(p).forEach(t => {
        const pr = M.props[t.i];
        if (t.t === 'prop' && canSell(p, t.i) && pr.h > 0) acts.push({ loss: (t.r[pr.h] - t.r[pr.h - 1]) / (t.hc / 2), run: () => doSell(p, t.i) });
        if (canMortgage(p, t.i)) acts.push({ loss: (t.t === 'prop' ? t.r[0] * 1.5 : 7 * COMP_MULT[nOwned(p.id, COMPS)] * .5) / mortVal(t) + (t.t === 'prop' ? 0.05 : 0), run: () => doMortgage(p, t.i) });
      });
      if (!acts.length) break;
      acts.sort((a, b) => a.loss - b.loss); acts[0].run();
    }
    renderState();
  }
  async function aiPre(p) {
    // quita dívida com folga, resgata hipotecas, constrói, propõe negócios
    if (p.debt > 0 && p.cash > p.debt + reserve(p) + 200) { p.cash -= p.debt; p.debt = 0; }
    await aiBuild(p);
    if (!p.bankrupt) await aiInitiative(p);
  }
  async function aiPost(p) { await aiBuild(p); }
  /** resgata hipotecas e constrói onde o retorno é maior (pode limitar a um terreno) */
  async function aiBuild(p, only) {
    const res = reserve(p) * (1 - p.ai.aggr * .4);
    owned(p).filter(t => M.props[t.i].mort).sort((a, b) => b.p - a.p).forEach(t => { if (p.cash - unmortCost(t) >= res) doUnmortgage(p, t.i); });
    const props = () => owned(p).filter(t => t.t === 'prop' && (only == null || t.i === only));
    // empréstimo para construir quando há bom retorno e pouco caixa
    if (p.ai.aggr > .55 && M.skill >= 1 && p.debt === 0 && p.cash < res + 150 && props().some(t => canBuild({ cash: 999, id: p.id }, t.i) && !M.props[t.i].mort)) { p.debt = 300; p.cash += 300; }
    let built = 0;
    for (let guard = 0; guard < 10; guard++) {
      let best = null;
      props().forEach(t => {
        if (!canBuild(p, t.i) || p.cash - t.hc < res) return;
        const pr = M.props[t.i];
        const roi = (t.r[pr.h + 1] - t.r[pr.h]) / t.hc * (.45 + hitProb(p.id, t.i) * 1.6);
        const bonus = pr.h === 4 && M.houses < 8 ? 1.25 : 1;                        // hotel libera 4 casas no estoque
        const sc = roi * bonus;
        if (!best || sc > best.sc) best = { i: t.i, sc };
      });
      if (!best) break;
      doBuild(p, best.i); built++;
    }
    if (built) { say(`${p.name} construiu ${built} melhoria(s).`); Core.snd('chip'); renderState(); await wait(700); }
  }

  Core.register('metropole', { mount, unmount });
  window.MetropoleDebug = { state: () => M, T, GT, worth, aiEval, aiCounter, aiFindDeal, rentOf, netWorth, COMP_MULT };
})();
