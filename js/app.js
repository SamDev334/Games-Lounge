/* ============================================================
   Hub (menu principal) e inicialização
   ============================================================ */
(function () {
  'use strict';
  const { h } = Core;

  const ART = {
    chess: `<svg viewBox="0 0 220 130"><defs><linearGradient id="hk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#e5b53c"/><stop offset="1" stop-color="#8a5f10"/></linearGradient></defs>
      <g transform="translate(10 10)">${Array.from({ length: 16 }, (_, i) => `<rect x="${(i % 4) * 28}" y="${Math.floor(i / 4) * 28}" width="28" height="28" fill="${(i + Math.floor(i / 4)) % 2 ? '#8a6a42' : '#e8d3a8'}"/>`).join('')}</g>
      <g transform="translate(105 -4) scale(1.15)" fill="url(#hk)" stroke="#5a3d08" stroke-width="2.5" stroke-linejoin="round">
      <path d="M28 80 C28 62 34 50 46 42 C40 42 34 44 26 52 L22 48 C22 40 28 34 34 30 L34 20 L42 26 C46 20 54 16 62 20 C76 28 78 56 74 80Z"/><rect x="22" y="80" width="56" height="12" rx="4"/><circle cx="41" cy="37" r="2.6" fill="#3a2705" stroke="none"/></g></svg>`,
    truco: `<svg viewBox="0 0 220 130">${[[-22, 40, '4', '♣', '#111'], [0, 78, '7', '♥', '#c3202e'], [22, 116, 'A', '♠', '#111']].map(([r, x, n, s, c]) =>
      `<g transform="translate(${x + 20} 70) rotate(${r})"><rect x="-32" y="-58" width="64" height="94" rx="9" fill="#fbf8ef" stroke="#c9bfa5" stroke-width="2"/><text x="-23" y="-36" font-size="22" font-weight="700" fill="${c}" font-family="Georgia,serif">${n}</text><text x="0" y="-2" font-size="42" text-anchor="middle" fill="${c}">${s}</text></g>`).join('')}</svg>`,
    poker: `<svg viewBox="0 0 220 130"><g transform="translate(40 18) rotate(-12)"><rect width="56" height="80" rx="8" fill="#fbf8ef" stroke="#c9bfa5" stroke-width="2"/><text x="8" y="26" font-size="22" font-weight="700" fill="#111" font-family="Georgia,serif">A</text><text x="28" y="60" font-size="34" text-anchor="middle" fill="#111">♠</text></g>
      <g transform="translate(86 14) rotate(8)"><rect width="56" height="80" rx="8" fill="#fbf8ef" stroke="#c9bfa5" stroke-width="2"/><text x="8" y="26" font-size="22" font-weight="700" fill="#c3202e" font-family="Georgia,serif">K</text><text x="28" y="60" font-size="34" text-anchor="middle" fill="#c3202e">♥</text></g>
      ${[['#d1233f', 150, 100], ['#2563eb', 175, 92], ['#16a34a', 160, 78]].map(([c, x, y]) => `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="6" rx="24" ry="9" fill="#0006"/><ellipse cx="0" cy="0" rx="24" ry="9" fill="${c}" stroke="#fff" stroke-width="2" stroke-dasharray="6 6"/><ellipse cx="0" cy="-3" rx="24" ry="9" fill="${c}" stroke="#fff6" stroke-width="1.5"/></g>`).join('')}</svg>`,
    gamao: `<svg viewBox="0 0 220 130"><rect x="6" y="6" width="208" height="118" rx="8" fill="#5a3a22"/><rect x="12" y="12" width="196" height="106" rx="4" fill="#d9c49a"/>
      ${Array.from({ length: 10 }, (_, i) => `<path d="M${16 + i * 19} 12 l9.5 46 l9.5 -46z" fill="${i % 2 ? '#7a2e2e' : '#222'}"/><path d="M${16 + i * 19} 118 l9.5 -46 l9.5 46z" fill="${i % 2 ? '#222' : '#7a2e2e'}"/>`).join('')}
      ${[[35, 100], [35, 80], [92, 24], [92, 44], [148, 100], [148, 80], [148, 60]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="10" fill="${i < 2 || i > 3 ? '#f4efe3' : '#2a2a30'}" stroke="#0007" stroke-width="2"/>`).join('')}</svg>`
  };

  const CARDS = [
    { id: 'chess', title: 'Xadrez', desc: 'IA com 8 níveis, tabuleiros e peças em vários estilos e tutorial das principais aberturas.', tags: ['IA 8 níveis', 'Tutorial', '9 temas'], bg: 'linear-gradient(135deg,#3b2a14,#7a5a2a 60%,#2a1c0b)' },
    { id: 'truco', title: 'Truco Paulista', desc: 'Jogue 1x1 ou em dupla com IAs de personalidades diferentes. Truco, seis, nove e doze!', tags: ['1x1', '2x2', 'Mão de onze'], bg: 'linear-gradient(135deg,#0f3b2a,#1f7a52 60%,#0a2418)' },
    { id: 'poker', title: 'Poker Texas Hold\'em', desc: 'Torneio de mesa com 6 jogadores. Adversários que blefam, calculam odds e mudam de estilo.', tags: ['6 jogadores', 'Blinds crescentes', 'Side pots'], bg: 'linear-gradient(135deg,#3b0f1c,#8a1f3a 60%,#220811)' },
    { id: 'gamao', title: 'Gamão (Bukkagamon)', desc: 'O clássico jogo de dados e estratégia com regras completas e IA em 3 níveis.', tags: ['Backgammon', 'IA 3 níveis', 'Gammon'], bg: 'linear-gradient(135deg,#142a4a,#2c5b9c 60%,#0b1830)' }
  ];

  Core.register('hub', {
    mount(root) {
      const grid = h('div', { class: 'games' }, CARDS.map(c =>
        h('button', { class: 'game-card', style: { '--cg': c.bg }, onclick: () => { Core.snd('select'); Core.go(c.id); } },
          h('div', { class: 'art', html: ART[c.id] }),
          h('h3', null, c.title), h('p', null, c.desc),
          h('div', { class: 'tags' }, c.tags.map(t => h('span', { class: 'chip' }, t))))));

      const nameInput = h('input', { type: 'text', value: Core.settings.name, maxlength: 14, placeholder: 'Seu nome', oninput: e => { Core.settings.name = e.target.value.trim() || 'Você'; Core.saveSettings(); } });
      const sw = h('input', { type: 'checkbox', onchange: e => { Core.settings.sound = e.target.checked; Core.saveSettings(); } });
      sw.checked = Core.settings.sound;
      const st = Core.stats;
      const stats = h('div', { class: 'small muted', html:
        `Vitórias — Xadrez: <b class="gold">${st.chessWin || 0}</b> · Truco: <b class="gold">${st.trucoWin || 0}</b> · Poker: <b class="gold">${st.pokerWin || 0}</b> · Gamão: <b class="gold">${st.gamaoWin || 0}</b>` });

      const So = Core.Social;
      const loginBtn = h('button', { class: 'btn', style: { position: 'relative' }, onclick: () => So && So.openPanel({}) });
      const updLogin = () => {
        if (!So || !So.enabled) { loginBtn.style.display = 'none'; return; }
        loginBtn.style.display = '';
        if (So.user && So.me) { const n = So.requests.length + So.invites.length; loginBtn.innerHTML = `${So.me.avatar} ${So.me.name}` + (n ? `<span class="badge">${n}</span>` : ''); }
        else loginBtn.textContent = '👥 Entrar / Amigos';
      };
      this.unsub = So ? So.on(updLogin) : null; updLogin();
      if (So && !So.authReady) setTimeout(updLogin, 1500);

      root.append(h('div', { class: 'hub' },
        h('div', { class: 'row', style: { justifyContent: 'flex-end', minHeight: '38px' } }, loginBtn),
        h('div', { class: 'hub-head' },
          h('div', { class: 'logo' }, 'SALÃO DOS JOGOS'),
          h('p', null, 'Xadrez · Truco · Poker · Gamão — tudo no seu navegador'),
          h('div', { class: 'suits' }, '♠ ♥ ♣ ♦')),
        grid,
        h('div', { class: 'settings-bar' },
          h('div', { class: 'panel' }, h('h3', null, 'Jogador'), nameInput),
          h('div', { class: 'panel' }, h('h3', null, 'Som'), h('div', { class: 'row sb' }, h('span', null, 'Efeitos sonoros'), h('label', { class: 'switch' }, sw, h('i')))),
          h('div', { class: 'panel' }, h('h3', null, 'Placar'), stats)),
        h('div', { class: 'footer' }, 'Jogue offline ou entre com Google para jogar online com amigos · Seu progresso fica salvo no seu aparelho')));
    },
    unmount() { if (this.unsub) { this.unsub(); this.unsub = null; } }
  });

  // símbolos flutuantes no fundo
  const fx = Core.$('#bgfx');
  ['♠', '♥', '♣', '♦', '♞', '♜', '♛', '⚀', '⚃', '♚'].forEach((s, i) => {
    const e = document.createElement('span');
    e.textContent = s; e.style.left = (i * 10 + Math.random() * 6) + '%';
    e.style.animationDuration = (28 + Math.random() * 30) + 's'; e.style.animationDelay = (-Math.random() * 40) + 's';
    e.style.fontSize = (28 + Math.random() * 40) + 'px';
    fx.append(e);
  });

  Core.route();
})();
