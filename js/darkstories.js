/* ============================================================
   DARK STORIES — enigmas de mistério com perguntas de Sim/Não
   · Solo: você investiga e o jogo responde com um banco de perguntas
   · Online: um amigo narra (sabe a solução e responde Sim/Não/Irrelevante)
             ou o narrador automático responde para todo mundo
   ============================================================ */
(function () {
  'use strict';
  const { h, shuffle, pick } = Core;
  const Text = window.TextUtil;
  let G = null;

  const ANS = { s: ['✅ Sim', 's'], n: ['❌ Não', 'n'], i: ['➖ Irrelevante', 'i'], q: ['🤷 Sim e não', 'q'], p: ['🤔 Não entendi — reformule como pergunta de Sim ou Não', 'i'] };
  const DIFF = ['', 'Fácil', 'Médio', 'Difícil'];
  const starsNode = n => h('span', { class: 'st' }, [0, 1, 2].map(i => h('i', { style: { fontStyle: 'normal', opacity: i < n ? 1 : .22 } }, '★')));
  const storyById = id => window.DS_STORIES.find(s => s.id === id);
  const matchQuestion = Text.matchQuestion, judgeTheory = Text.judgeTheory;
  const starsFor = (q, hints) => (hints === 0 && q <= 12 ? 3 : hints <= 1 && q <= 25 ? 2 : 1);

  // ---------------- montagem ----------------
  function mount(root) {
    G = { root, mode: null, role: null, sel: Core.store.get('ds.sel', 'rand'), nar: Core.store.get('ds.nar', 'human') };
    root.append(Core.topbar('DARK STORIES', h('button', { class: 'btn icon', title: 'Regras', onclick: showRules }, '?')));
    G.box = h('div', { class: 'ds' }); root.append(G.box);
    G.P = Party.create({
      game: 'darkstories', title: '🌑 Sala de Dark Stories', key: 'ds.room', max: 5, box: G.box, createLabel: '🌑 Criar sala e convidar',
      extra: () => ({ mode: G.nar }),
      onHostStart: hostStart, onGuestStart: guestStart, onPub: onPub, onAct: onAct, onLeft: () => { if (G) { G.mode = null; showSetup(); } }
    });
    showSetup();
    if (Core.pendingRoom && Core.pendingRoom.game === 'darkstories') { const inv = Core.pendingRoom; Core.pendingRoom = null; G.P.join(inv); }
  }
  function unmount() { if (G) G.P.destroy(); G = null; }

  function showRules() {
    Core.modal({
      title: 'Como jogar Dark Stories', buttons: [{ text: 'Entendi', cls: 'primary', value: 1 }],
      body: h('div', { class: 'small', style: { lineHeight: 1.55 }, html:
        '<b>O enigma:</b> você recebe uma situação estranha e sombria (todas são fictícias). Descubra <b>o que realmente aconteceu</b>.<br>' +
        '<b>Perguntas:</b> só dá para perguntar o que pode ser respondido com <b>Sim</b>, <b>Não</b> ou <b>Irrelevante</b> (ex.: “O homem conhecia a vítima?”).<br>' +
        '<b>Solo:</b> o jogo responde usando um banco de perguntas. Se não entender, reformule com palavras mais diretas.<br>' +
        '<b>Teoria 🧩:</b> quando achar que sabe, escreva a explicação completa. O jogo confere se você cobriu as peças principais da solução.<br>' +
        '<b>Dicas 💡:</b> são 3 por história e custam estrelas. ⭐⭐⭐ = poucas perguntas e nenhuma dica.<br>' +
        '<b>Online:</b> um <b>narrador humano</b> (o anfitrião, que vê a solução) responde às perguntas dos amigos, ou o <b>narrador automático</b> responde a todos.<br>' +
        '<b>Aviso:</b> temas sombrios (morte, crimes), sem violência explícita. Indicado para maiores de 14 anos.' })
    });
  }

  function showSetup() {
    G.mode = null; G.D = null; G.v = null; G.ui = null; G.box.innerHTML = '';
    const stars = Core.store.get('ds.stars', {});
    const list = h('div', { class: 'ds-list' });
    const items = [{ id: 'rand', title: '🎲 Aleatória', diff: 0 }].concat(window.DS_STORIES);
    const render = () => {
      list.innerHTML = '';
      items.forEach(s => list.append(h('button', { class: 'ds-item' + (G.sel === s.id ? ' active' : ''), style: G.sel === s.id ? { borderColor: 'var(--gold)', background: 'rgba(233,196,106,.1)' } : null, onclick: () => { G.sel = s.id; Core.store.set('ds.sel', s.id); render(); } },
        h('b', null, s.title), s.diff ? h('span', { class: 'df' }, DIFF[s.diff]) : null, s.diff ? starsNode(stars[s.id] || 0) : null)));
    };
    render();
    const seg = h('div', { class: 'seg full' }, [['human', '🎭 Eu narro'], ['auto', '🤖 Narrador automático']].map(([k, t]) => h('button', { class: G.nar === k ? 'active' : '', onclick: e => { G.nar = k; Core.store.set('ds.nar', k); Core.$$('button', seg).forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); } }, t)));
    const lobby = G.P.lobbyEl();
    G.box.append(h('div', { class: 'tr-setup' },
      h('div', { class: 'ds-hero' }, h('div', { class: 'ds-logo' }, '🌑 DARK STORIES'), h('div', { class: 'muted small' }, 'Enigmas sombrios. Só perguntas de Sim ou Não.')),
      h('div', { class: 'panel' }, h('h3', null, 'História'), list),
      h('button', { class: 'btn primary lg block', onclick: startSolo }, '🔎 Investigar sozinho'),
      h('div', { class: 'panel' }, h('h3', null, '🤖 Jogar com uma IA de chat'),
        h('div', { class: 'small muted', style: { margin: '0 0 8px' } }, 'Copia o “prompt do Mestre” da história escolhida para colar no ChatGPT, Claude, Gemini… A IA vira o narrador (só responde Sim, Não ou Irrelevante).'),
        h('button', { class: 'btn block', onclick: copyPrompt }, '📋 Copiar prompt do Mestre')),
      h('div', { class: 'panel' }, h('h3', null, 'Online com amigos'), seg,
        h('div', { class: 'small muted', style: { margin: '6px 0 10px' } }, G.nar === 'human' ? 'Você (anfitrião) vê a solução e responde às perguntas dos amigos.' : 'Todos investigam juntos e o jogo responde às perguntas.'),
        lobby || h('div', { class: 'muted small' }, 'Modo online indisponível.')),
      h('button', { class: 'btn block', onclick: showRules }, '📖 Como jogar'),
      h('div', { class: 'small muted center' }, '⚠ Temas sombrios e fictícios, sem violência explícita (14+).')));
    // atualiza a descrição do modo online ao trocar o narrador
    seg.addEventListener('click', () => { const d = seg.nextSibling; if (d) d.textContent = G.nar === 'human' ? 'Você (anfitrião) vê a solução e responde às perguntas dos amigos.' : 'Todos investigam juntos e o jogo responde às perguntas.'; });
  }
  const chooseStory = () => (G.sel === 'rand' ? pick(shuffle(window.DS_STORIES)) : storyById(G.sel) || window.DS_STORIES[0]);

  /** copia o System Prompt do Mestre (com a história escolhida) para usar numa IA de chat */
  async function copyPrompt() {
    const st = chooseStory(), txt = window.DSPrompt.build(st);
    let ok = false;
    try { await navigator.clipboard.writeText(txt); ok = true; } catch (e) { ok = false; }
    const ta = h('textarea', { readonly: true, rows: 6, style: { width: '100%', background: 'rgba(0,0,0,.3)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px', fontSize: '12px' } }, txt);
    await Core.modal({
      title: ok ? '📋 Prompt copiado!' : '📋 Copie o prompt', buttons: [{ text: 'Entendi', cls: 'primary', value: 1 }],
      body: h('div', { class: 'small', style: { lineHeight: 1.5 } },
        h('p', null, 'História escolhida: ', h('b', null, st.title), '.'),
        h('p', null, ok ? 'O texto já está na área de transferência.' : 'Seu navegador não permitiu copiar sozinho: selecione o texto abaixo e copie.'),
        h('p', null, '1) Cole na IA como primeira mensagem. 2) Envie ', h('b', null, '/iniciar'), '. 3) Pergunte à vontade. Comandos: ', h('b', null, '/dica'), ' e ', h('b', null, '/revelar'), '.'),
        h('p', { class: 'bad' }, '⚠ Não leia o texto copiado: ele contém a solução!'),
        ok ? null : ta)
    });
  }

  // ---------------- estado (solo e anfitrião) ----------------
  function newGame(story, mode, names) {
    return { story, mode, log: [], pend: [], nid: 0, hintsUsed: 0, qCount: 0, heat: 0, over: null, names: names || [] };
  }
  const D_ = () => G.D;
  function logAdd(e) { const D = D_(); D.log.push(e); if (D.log.length > 90) D.log.shift(); }
  function question(name, text) {
    const D = D_(); text = String(text || '').trim().slice(0, 140); if (!text || D.over) return;
    logAdd({ k: 'q', w: name, x: text });
    if (D.mode === 'human') { D.pend.push({ id: ++D.nid, t: 'q', n: name, x: text }); return; }
    const m = matchQuestion(D.story, text);
    if (!m) logAdd({ k: 'a', a: 'p' }); else { D.qCount++; logAdd({ k: 'a', a: m.q[1], x: m.q[0] }); }
  }
  function theory(name, text) {
    const D = D_(); text = String(text || '').trim().slice(0, 160); if (!text || D.over) return;
    logAdd({ k: 't', w: name, x: text });
    if (D.mode === 'human') { D.pend.push({ id: ++D.nid, t: 't', n: name, x: text }); return; }
    const j = judgeTheory(D.story, text);
    if (j.short) { logAdd({ k: 'r', a: 'short' }); return; }
    if (j.solved) { finish(true, name); return; }
    D.heat = Math.max(D.heat, j.ratio);
    logAdd({ k: 'r', a: j.ratio >= .5 ? 'hot' : j.ratio >= .25 ? 'warm' : 'cold' });
  }
  function giveHint() {
    const D = D_(); if (D.over || D.hintsUsed >= 3) return false;
    logAdd({ k: 'h', x: `Dica ${D.hintsUsed + 1}: ${D.story.hints[D.hintsUsed]}` }); D.hintsUsed++; return true;
  }
  function finish(solved, by) {
    const D = D_(); if (D.over) return;
    D.over = { solved, by: by || '', sol: D.story.solution, facts: D.story.facts.map(f => f.t), stars: solved ? starsFor(D.qCount, D.hintsUsed) : 0 };
    if (G.mode === 'solo' || G.D.mode === 'auto') {
      if (solved) {
        const stars = Core.store.get('ds.stars', {}); if ((stars[D.story.id] || 0) < D.over.stars) { stars[D.story.id] = D.over.stars; Core.store.set('ds.stars', stars); }
      }
    }
    if (solved && (G.mode === 'solo' || (G.mode === 'host' && D.mode === 'auto' && by === Core.settings.name))) Core.addStat('darkWin');
    Core.snd(solved ? 'win' : 'lose');
  }
  /** narrador humano responde a um item da fila */
  function answerPend(id, a) {
    const D = D_(), i = D.pend.findIndex(p => p.id === id); if (i < 0) return;
    const it = D.pend.splice(i, 1)[0];
    if (it.t === 'q') { D.qCount++; logAdd({ k: 'a', a, x: it.x }); }
    else if (a === 'ok') { finish(true, it.n); }
    else logAdd({ k: 'r', a: a === 'q' ? 'warm' : 'cold' });
    refresh();
  }

  // ---------------- visões ----------------
  function viewOf(local) {
    const D = D_(), s = D.story;
    const v = { id: s.id, title: s.title, diff: s.diff, story: s.story, mode: D.mode, log: D.log.slice(-60), hints: D.hintsUsed, qn: D.qCount, heat: D.heat, np: D.pend.length, names: D.names, over: D.over };
    if (local) { v.pend = D.pend.slice(); v.solution = s.solution; v.hintList = s.hints; v.facts = s.facts.map(f => f.t); }
    return v;
  }
  function refresh() {
    if (!G || !G.D) return;
    G.v = viewOf(true); renderAll(G.v);
    if (G.mode === 'host') G.P.publish(() => viewOf(false));
  }
  const roleOf = v => (G.mode === 'host' && v.mode === 'human' ? 'nar' : 'det');

  // ---------------- interface ----------------
  function startSolo() {
    const s = chooseStory();
    G.mode = 'solo'; G.D = newGame(s, 'auto', [Core.settings.name]); buildUI(); refresh();
  }
  function buildUI() {
    G.box.innerHTML = '';
    G.ui = { story: h('div', { class: 'ds-story' }), log: h('div', { class: 'ds-log' }), ctl: h('div', { class: 'ds-ctl' }), top: h('div') };
    G.box.append(G.ui.story, G.ui.top, G.ui.log, G.ui.ctl,
      h('div', { class: 'row', style: { justifyContent: 'center' } }, h('button', { class: 'btn sm', onclick: showRules }, '📖 Regras'),
        G.mode === 'solo' ? h('button', { class: 'btn sm', onclick: showSetup }, '⚙ Outras histórias') : h('button', { class: 'btn sm danger', onclick: () => G.P.leave(true) }, '⎋ Sair')));
    G.ctlKey = null;
  }
  const ansLabel = a => ANS[a] || ANS.i;
  const heatTxt = { hot: '🔥 Quente! Você está perto da explicação.', warm: '🌤 Morno… há algo certo, mas falta bastante.', cold: '❄ Frio. Essa teoria está longe.', short: '✍ Descreva melhor a sua teoria (use uma frase completa).' };
  function renderAll(v) {
    if (!G.ui) return;
    const role = roleOf(v), over = v.over;
    G.ui.story.innerHTML = '';
    G.ui.story.append(h('h3', null, `${v.title} · ${DIFF[v.diff] || ''}`), h('div', null, v.story),
      h('div', { class: 'small muted', style: { marginTop: '8px' } }, `${v.qn} pergunta${v.qn === 1 ? '' : 's'} · ${v.hints}/3 dica${v.hints === 1 ? '' : 's'}${v.names && v.names.length > 1 ? ' · 👥 ' + v.names.join(', ') : ''}`));
    // log
    const log = G.ui.log, atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
    log.innerHTML = '';
    (v.log || []).forEach(e => {
      if (e.k === 'q') log.append(h('div', { class: 'ds-msg q' }, v.names && v.names.length > 1 ? h('small', null, e.w) : null, e.x));
      else if (e.k === 'a') { const [lab, cls] = ansLabel(e.a); log.append(h('div', { class: 'ds-msg a ' + cls }, lab, e.x && e.a !== 'p' && role !== 'nar' && v.mode === 'auto' ? h('small', { style: { fontWeight: 400 } }, 'entendi: ' + e.x) : null)); }
      else if (e.k === 't') log.append(h('div', { class: 'ds-msg q' }, h('small', null, '🧩 Teoria' + (v.names && v.names.length > 1 ? ' de ' + e.w : '')), e.x));
      else if (e.k === 'r') log.append(h('div', { class: 'ds-msg hint' }, heatTxt[e.a] || ''));
      else if (e.k === 'h') log.append(h('div', { class: 'ds-msg hint' }, '💡 ' + e.x));
      else log.append(h('div', { class: 'ds-msg sys' }, e.x));
    });
    if (!v.log || !v.log.length) log.append(h('div', { class: 'ds-msg sys' }, role === 'nar' ? 'Aguardando as perguntas dos detetives…' : 'Faça sua primeira pergunta de Sim ou Não.'));
    if (atBottom || true) log.scrollTop = log.scrollHeight;
    G.ui.top.innerHTML = '';
    if (over) G.ui.top.append(solutionBox(v));
    renderCtl(v, role);
  }
  function solutionBox(v) {
    const o = v.over;
    return h('div', { class: 'ds-sol' },
      h('b', null, o.solved ? `🏆 Resolvido${o.by ? ' por ' + o.by : ''}! ` : '📖 Solução revelada', o.solved && o.stars ? starsNode(o.stars) : null),
      h('p', { style: { margin: '8px 0' } }, o.sol),
      h('div', { class: 'small muted' }, 'Peças da solução: ' + (o.facts || []).join(' · ')));
  }
  function renderCtl(v, role) {
    const key = [role, v.over ? 1 : 0, v.np, v.hints, role === 'nar' ? (v.pend || []).map(p => p.id).join(',') : '', G.mode].join('|');
    if (G.ctlKey === key) return; G.ctlKey = key;
    const c = G.ui.ctl; c.innerHTML = '';
    if (v.over) {
      c.append(G.mode === 'solo' ? h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: showSetup }, '📚 Outras histórias'), h('button', { class: 'btn primary grow', onclick: () => { G.sel = 'rand'; startSolo(); } }, '🎲 Sortear outra'))
        : h('button', { class: 'btn primary lg block', onclick: () => G.P.leave(G.mode === 'host' ? false : false) }, 'Sair da sala'));
      return;
    }
    if (role === 'nar') {
      const D = G.D;
      c.append(h('div', { class: 'panel' }, h('h3', null, '🔒 Solução (só você vê)'), h('div', { class: 'small', style: { lineHeight: 1.5 } }, v.solution)));
      if (!v.pend.length) c.append(h('div', { class: 'muted small center', style: { padding: '6px' } }, 'Nenhuma pergunta pendente.'));
      v.pend.forEach(p => {
        const box = h('div', { class: 'ds-pend' }, h('div', { class: 'who' }, (p.t === 'q' ? '❓ ' : '🧩 Teoria de ') + p.n), h('div', { style: { margin: '4px 0 8px', fontSize: '15px' } }, p.x));
        const row = h('div', { class: 'ds-ans' });
        const mk = (t, a, cls) => row.append(h('button', { class: 'btn ' + (cls || ''), onclick: () => answerPend(p.id, a) }, t));
        if (p.t === 'q') { mk('✅ Sim', 's', 'good'); mk('❌ Não', 'n', 'danger'); mk('➖ Irrelev.', 'i'); mk('🤷 Em parte', 'q'); }
        else { mk('🏆 Correta', 'ok', 'good'); mk('🔥 Quase', 'q'); mk('❄ Errada', 'n', 'danger'); }
        box.append(row); c.append(box);
      });
      c.append(h('div', { class: 'row' },
        h('button', { class: 'btn grow' + (D.hintsUsed >= 3 ? ' disabled' : ''), onclick: () => { if (giveHint()) refresh(); } }, `💡 Enviar dica (${D.hintsUsed}/3)`),
        h('button', { class: 'btn grow danger', onclick: async () => { const ok = await Core.modal({ title: 'Revelar a solução?', body: 'A partida termina para todos.', buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Revelar', cls: 'primary', value: true }] }); if (ok) { finish(false); refresh(); } } }, '🏁 Revelar')));
      return;
    }
    // detetive
    const input = h('input', { type: 'text', maxlength: 140, autocomplete: 'off', placeholder: 'Pergunte algo de Sim ou Não…', class: 'pf-in' });
    const send = () => { const t = input.value.trim(); if (!t) return; input.value = ''; act('ask', t); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    c.append(h('div', { class: 'row' }, input, h('button', { class: 'btn primary', onclick: send }, 'Perguntar')));
    const row = h('div', { class: 'row' });
    row.append(h('button', { class: 'btn grow', onclick: askTheory }, '🧩 Tenho uma teoria'));
    if (v.mode === 'auto') {
      row.append(h('button', { class: 'btn grow' + (v.hints >= 3 ? ' disabled' : ''), onclick: () => act('hint') }, `💡 Dica (${v.hints}/3)`));
      c.append(row, h('button', { class: 'btn sm block', onclick: suggest }, '🧭 Sugerir perguntas'));
    } else c.append(row);
    if (G.mode === 'solo') c.append(h('button', { class: 'btn sm ghost block', onclick: async () => { const ok = await Core.modal({ title: 'Desistir?', body: 'A solução será revelada e você não ganha estrelas.', buttons: [{ text: 'Continuar', cls: 'ghost', value: false }, { text: 'Revelar', cls: 'primary', value: true }] }); if (ok) { finish(false); refresh(); } } }, '🏳 Desistir e ver a solução'));
  }
  /** ação do detetive: no solo e no anfitrião roda local; no convidado vai para o anfitrião */
  function act(type, text) {
    if (G.mode === 'guest') { G.P.send(type === 'hint' ? { type: 'hint' } : { type, s: String(text).slice(0, 150) }); return; }
    const me = Core.settings.name;
    if (type === 'ask') question(me, text); else if (type === 'theory') theory(me, text); else if (type === 'hint') giveHint();
    refresh();
  }
  async function askTheory() {
    const ta = h('textarea', { rows: 4, maxlength: 160, placeholder: 'Explique o que aconteceu, em poucas frases…', style: { width: '100%', background: 'rgba(0,0,0,.3)', color: 'var(--text)', border: '1px solid var(--line)', borderRadius: '12px', padding: '10px', fontFamily: 'inherit', fontSize: '15px' } });
    const r = await Core.modal({ title: '🧩 Sua teoria', body: h('div', null, h('div', { class: 'small muted', style: { marginBottom: '6px' } }, 'Conte a história completa: quem, o quê e por quê.'), ta), buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Enviar', cls: 'primary', value: true }], dismiss: false });
    if (r && ta.value.trim()) act('theory', ta.value.trim());
  }
  async function suggest() {
    const s = G.mode === 'guest' ? storyById(G.v.id) : G.D.story; if (!s) return;
    const asked = new Set((G.v.log || []).filter(e => e.k === 'a' && e.x).map(e => e.x));
    const opts = shuffle(s.qa.filter(q => !asked.has(q[0]))).slice(0, 4);
    if (!opts.length) { Core.toast('Você já fez todas as perguntas sugeridas!'); return; }
    const r = await Core.modal({ title: '🧭 Perguntas sugeridas', body: 'Toque em uma para perguntar:', buttons: opts.map(q => ({ text: q[0], cls: 'primary', value: q[0] })).concat([{ text: 'Fechar', cls: 'ghost', value: false }]) });
    if (r) act('ask', r);
  }

  // ---------------- online ----------------
  async function hostStart({ uids, players, me }) {
    const story = chooseStory(), names = [me.name].concat(uids.map(u => players[u].name));
    G.mode = 'host'; G.names = {}; uids.forEach(u => { G.names[u] = players[u].name; });
    G.D = newGame(story, G.nar === 'auto' ? 'auto' : 'human', names);
    logAdd({ k: 's', x: G.D.mode === 'human' ? `${me.name} narra esta história. Detetives, façam suas perguntas!` : 'O narrador automático está pronto. Boa investigação!' });
    buildUI(); G.v = viewOf(true); renderAll(G.v);
    await G.P.begin(viewOf(false));
  }
  function guestStart() { G.mode = 'guest'; G.v = null; G.box.innerHTML = ''; G.box.append(h('div', { class: 'muted center', style: { padding: '30px' } }, 'Conectando à investigação…')); }
  function onPub(pub) {
    if (!G || G.mode !== 'guest') return;
    if (!G.ui) buildUI();
    G.v = Object.assign({ log: [], names: [] }, pub); renderAll(G.v);
  }
  function onAct(uid, a) {                                                // anfitrião recebeu uma ação de um convidado
    if (!G || !G.D || G.mode !== 'host') return;
    const name = G.names[uid] || 'Amigo';
    if (a.type === 'ask') question(name, a.s);
    else if (a.type === 'theory') theory(name, a.s);
    else if (a.type === 'hint' && G.D.mode === 'auto') giveHint();
    else return;
    refresh();
  }

  Core.register('darkstories', { mount, unmount, joinRoom: inv => { if (G) G.P.join(inv); } });
  window.DarkDebug = { state: () => G && G.D, view: () => G && G.v, matchQuestion, judgeTheory };
})();
