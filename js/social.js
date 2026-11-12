/* ============================================================
   Social online (Firebase): login, perfil, amigos, presença, convites
   ============================================================ */
(function () {
  'use strict';
  const { h } = Core;
  const AVATARS = ['🙂', '😎', '🤠', '🧐', '🦊', '🦈', '🐆', '🦉', '🐼', '🐯', '🦁', '🐸', '🎩', '👑', '🤖', '👻', '🔥', '⭐', '🍀', '🎲'];
  const GAMENAME = { chess: 'Xadrez', gamao: 'Gamão', poker: 'Poker', truco: 'Truco', detetive: 'Detetive', metropole: 'Metrópole' };

  const S = { enabled: false, authReady: false, user: null, me: null, friends: new Map(), requests: [], invites: [], subs: new Set(), _w: {}, error: '' };
  Core.Social = S;
  S.AVATARS = AVATARS;
  S.on = fn => { S.subs.add(fn); return () => S.subs.delete(fn); };
  const emit = () => S.subs.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
  S.emit = emit;

  S.init = function () {
    if (!window.firebase || !window.FIREBASE_CONFIG) { S.enabled = false; S.authReady = true; emit(); return; }
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
      S.auth = firebase.auth(); S.db = firebase.database(); S.TS = firebase.database.ServerValue.TIMESTAMP;
      S.enabled = true;
      S.auth.onAuthStateChanged(onUser);
      setTimeout(() => { if (!S.authReady) { S.authReady = true; emit(); } }, 7000);
    } catch (e) { console.error(e); S.enabled = false; S.authReady = true; emit(); }
  };

  // ---------- conta ----------
  S.signIn = async function () {
    const provider = new firebase.auth.GoogleAuthProvider();
    try { await S.auth.signInWithPopup(provider); }
    catch (e) {
      if (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') { await S.auth.signInWithRedirect(provider); return; }
      if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
      if (e.code === 'auth/unauthorized-domain') Core.toast('Domínio não autorizado no Firebase (Authentication → Settings → Authorized domains).', 5000);
      else Core.toast('Não foi possível entrar: ' + (e.message || e.code), 4000);
      console.error(e);
    }
  };
  S.signOut = async function () {
    try { if (S.user) await S.db.ref('presence/' + S.user.uid).set({ online: false, ts: S.TS }); } catch (e) { /* ok */ }
    stopListeners();
    await S.auth.signOut();
  };

  async function onUser(user) {
    stopListeners();
    S.user = user; S.me = null; S.error = '';
    if (!user) { S.authReady = true; emit(); return; }
    try { await ensureProfile(); startListeners(); }
    catch (e) { console.error(e); S.error = 'Erro ao carregar perfil: ' + (e.message || e); }
    S.authReady = true; emit();
  }

  function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  async function ensureProfile() {
    const uid = S.user.uid;
    const snap = await S.db.ref('users/' + uid).get();
    if (snap.exists()) { S.me = Object.assign({ uid }, snap.val()); return; }
    const name = ((S.user.displayName || 'Jogador').trim().split(/\s+/)[0] || 'Jogador').slice(0, 16);
    const avatar = Core.pick(AVATARS);
    let code = null;
    for (let i = 0; i < 10 && !code; i++) {
      const c = genCode();
      try { await S.db.ref('codes/' + c).set(uid); code = c; } catch (e) { /* colisão: tenta outro */ }
    }
    if (!code) throw new Error('não foi possível gerar o código de amigo');
    await S.db.ref('users/' + uid).set({ name, avatar, code });
    S.me = { uid, name, avatar, code };
  }
  S.updateProfile = async function (patch) {
    const p = {};
    if (patch.name != null) p.name = String(patch.name).trim().slice(0, 20) || S.me.name;
    if (patch.avatar != null) p.avatar = patch.avatar;
    await S.db.ref('users/' + S.user.uid).update(p);
    Object.assign(S.me, p); emit();
  };

  // ---------- listeners ----------
  const seenInv = new Map(); // chave -> elemento do banner
  function startListeners() {
    const db = S.db, uid = S.user.uid, W = S._w = {};
    W.conn = db.ref('.info/connected');
    W.conn.on('value', s => {
      if (!s.val()) return;
      const pr = db.ref('presence/' + uid);
      pr.onDisconnect().set({ online: false, ts: S.TS }).then(() => pr.set({ online: true, ts: S.TS })).catch(e => console.error(e));
    });
    W.friends = db.ref('friends/' + uid);
    W.friends.on('value', snap => syncFriends(Object.keys(snap.val() || {})), e => console.error(e));
    W.req = db.ref('friendRequests/' + uid);
    W.req.on('value', snap => {
      const v = snap.val() || {};
      S.requests = Object.keys(v).map(k => Object.assign({ uid: k }, v[k])).sort((a, b) => (b.ts || 0) - (a.ts || 0));
      emit();
    }, e => console.error(e));
    W.inv = db.ref('invites/' + uid);
    W.inv.on('value', snap => {
      const v = snap.val() || {}, now = Date.now();
      const list = [];
      Object.keys(v).forEach(k => {
        const inv = Object.assign({ from: k }, v[k]);
        if (inv.ts && Math.abs(now - inv.ts) > 15 * 60 * 1000) { S.clearInvite(k); return; } // expirado
        list.push(inv);
      });
      S.invites = list;
      // banners
      list.forEach(inv => { const key = inv.from + '|' + inv.room; if (!seenInv.has(key)) showInvite(inv, key); });
      for (const [key, el] of Array.from(seenInv)) if (!list.some(i => i.from + '|' + i.room === key)) { el.remove(); seenInv.delete(key); }
      emit();
    }, e => console.error(e));
  }
  function stopListeners() {
    const W = S._w || {};
    try { if (W.conn) W.conn.off(); if (W.friends) W.friends.off(); if (W.req) W.req.off(); if (W.inv) W.inv.off(); } catch (e) { /* ok */ }
    S.friends.forEach(f => f._off && f._off());
    S.friends = new Map(); S.requests = []; S.invites = []; S._w = {};
    seenInv.forEach(el => el.remove()); seenInv.clear();
  }
  function syncFriends(ids) {
    const db = S.db, old = S.friends, next = new Map();
    for (const [id, f] of old) if (!ids.includes(id)) f._off && f._off();
    ids.forEach(id => {
      if (old.has(id)) { next.set(id, old.get(id)); return; }
      const f = { uid: id, name: '…', avatar: '🙂', online: false };
      const uref = db.ref('users/' + id), pref = db.ref('presence/' + id);
      const uh = uref.on('value', s => { const v = s.val(); if (v) { f.name = v.name; f.avatar = v.avatar; f.code = v.code; } emit(); });
      const ph = pref.on('value', s => { const v = s.val(); f.online = !!(v && v.online); emit(); });
      f._off = () => { uref.off('value', uh); pref.off('value', ph); };
      next.set(id, f);
    });
    S.friends = next; emit();
  }

  // ---------- amigos ----------
  S.addByCode = async function (raw) {
    const code = String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) throw new Error('Digite o código de amigo.');
    const snap = await S.db.ref('codes/' + code).get();
    if (!snap.exists()) throw new Error('Código não encontrado.');
    const fid = snap.val(), me = S.user.uid;
    if (fid === me) throw new Error('Esse é o seu próprio código.');
    if (S.friends.has(fid)) throw new Error('Vocês já são amigos.');
    if (S.requests.some(r => r.uid === fid)) { await S.acceptRequest(fid); return 'Pedido dele(a) aceito: vocês agora são amigos!'; }
    await S.db.ref('friendRequests/' + fid + '/' + me).set({ name: S.me.name, avatar: S.me.avatar, ts: S.TS });
    return 'Pedido de amizade enviado!';
  };
  S.acceptRequest = async function (fid) {
    const me = S.user.uid, up = {};
    up['friends/' + me + '/' + fid] = true; up['friends/' + fid + '/' + me] = true; up['friendRequests/' + me + '/' + fid] = null;
    await S.db.ref().update(up);
  };
  S.declineRequest = fid => S.db.ref('friendRequests/' + S.user.uid + '/' + fid).remove();
  S.removeFriend = async function (fid) {
    const me = S.user.uid, up = {};
    up['friends/' + me + '/' + fid] = null; up['friends/' + fid + '/' + me] = null;
    await S.db.ref().update(up);
  };

  // ---------- convites ----------
  S.sendInvite = (toUid, game, room) =>
    S.db.ref('invites/' + toUid + '/' + S.user.uid).set({ game, room, name: S.me.name, avatar: S.me.avatar, ts: S.TS });
  S.clearInvite = from => S.db.ref('invites/' + S.user.uid + '/' + from).remove().catch(() => { });
  S.acceptInvite = function (inv) {
    S.clearInvite(inv.from);
    S.closePanel();
    const cur = location.hash.replace('#', '');
    const g = Core.games[inv.game];
    if (cur === inv.game && g && g.joinRoom) g.joinRoom(inv);
    else { Core.pendingRoom = inv; Core.go(inv.game); }
  };
  function showInvite(inv, key) {
    let root = Core.$('#invite-root');
    if (!root) { root = h('div', { id: 'invite-root' }); document.body.append(root); }
    const el = h('div', { class: 'inv-banner' },
      h('div', { class: 'av' }, inv.avatar || '🙂'),
      h('div', { class: 'grow' }, h('b', null, inv.name || 'Amigo'), h('span', null, ' te chamou para ' + (GAMENAME[inv.game] || inv.game))),
      h('button', { class: 'btn sm good', onclick: () => { el.remove(); seenInv.delete(key); S.acceptInvite(inv); } }, 'Aceitar'),
      h('button', { class: 'btn sm ghost', onclick: () => { el.remove(); S.clearInvite(inv.from); } }, '✕'));
    root.append(el); seenInv.set(key, el); Core.snd('turn');
  }

  // ---------- painel (folha) ----------
  let sheet = null, tab = 'friends', opts = {}, unsub = null;
  S.closePanel = function () { if (sheet) { sheet.remove(); sheet = null; } if (unsub) { unsub(); unsub = null; } };
  S.openPanel = function (o) {
    opts = o || {};
    if (!sheet) {
      sheet = h('div', { class: 'sheet-back', onclick: e => { if (e.target === sheet) S.closePanel(); } });
      Core.$('#modal-root').append(sheet);
      unsub = S.on(() => { const a = document.activeElement; if (sheet && !(a && a.tagName === 'INPUT' && sheet.contains(a))) render(); });
    }
    render();
  };
  function copy(text, msg) {
    const ok = () => Core.toast(msg || 'Copiado!');
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok, () => Core.toast(text)); else Core.toast(text);
  }
  function render() {
    if (!sheet) return;
    const box = h('div', { class: 'sheet' });
    box.append(h('div', { class: 'row sb', style: { marginBottom: '10px' } }, h('h3', { class: 'sh-title' }, '👥 Amigos & Online'), h('button', { class: 'btn icon', onclick: S.closePanel }, '✕')));
    if (!S.enabled) box.append(h('p', { class: 'muted' }, 'O modo online não está disponível agora (sem conexão com o serviço).'));
    else if (!S.authReady) box.append(h('p', { class: 'muted' }, 'Conectando…'));
    else if (!S.user || !S.me) {
      box.append(
        h('p', null, 'Entre para adicionar amigos, ver quem está online e jogar partidas em tempo real, de qualquer lugar.'),
        h('button', { class: 'btn primary lg block', onclick: S.signIn }, '🔐 Entrar com Google'),
        S.error ? h('p', { class: 'bad small' }, S.error) : '',
        h('p', { class: 'small muted', style: { lineHeight: 1.5 } }, 'Os outros jogadores só veem seu apelido e avatar. Seu e-mail não é compartilhado com ninguém. Você pode sair a qualquer momento.'));
    } else {
      const me = S.me;
      const nameIn = h('input', { type: 'text', value: me.name, maxlength: 20, onchange: e => S.updateProfile({ name: e.target.value }).catch(() => Core.toast('Não foi possível salvar o nome')) });
      const avRow = h('div', { class: 'av-pick hide' }, AVATARS.map(a => h('button', { class: 'btn icon' + (a === me.avatar ? ' primary' : ''), onclick: () => { S.updateProfile({ avatar: a }); } }, a)));
      box.append(
        h('div', { class: 'me-card' },
          h('button', { class: 'av big', title: 'Trocar avatar', onclick: () => avRow.classList.toggle('hide') }, me.avatar),
          h('div', { class: 'grow' }, nameIn,
            h('div', { class: 'small muted', style: { marginTop: '6px' } }, 'Seu código de amigo: ', h('b', { class: 'gold code' }, me.code), ' ', h('button', { class: 'btn sm', onclick: () => copy(me.code, 'Código copiado!') }, 'Copiar')))),
        avRow);
      const nReq = S.requests.length;
      const tabs = h('div', { class: 'seg full', style: { margin: '10px 0' } },
        [['friends', `Amigos (${S.friends.size})`], ['requests', `Pedidos${nReq ? ' (' + nReq + ')' : ''}`], ['add', 'Adicionar']].map(([k, t]) =>
          h('button', { class: tab === k ? 'active' : '', onclick: () => { tab = k; render(); } }, t)));
      box.append(tabs);
      if (tab === 'friends') {
        const list = Array.from(S.friends.values()).sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
        if (!list.length) box.append(h('p', { class: 'muted center' }, 'Você ainda não tem amigos. Vá em "Adicionar" e use o código de um amigo, ou envie o seu.'));
        list.forEach(f => box.append(h('div', { class: 'f-row' },
          h('div', { class: 'av' }, f.avatar), h('span', { class: 'dot-st ' + (f.online ? 'on' : '') }),
          h('div', { class: 'grow' }, h('b', null, f.name), h('div', { class: 'small muted' }, f.online ? 'online' : 'offline')),
          opts.invite ? h('button', { class: 'btn sm primary' + (f.online ? '' : ' disabled'), onclick: () => { S.closePanel(); opts.invite(f); } }, '⚔ Desafiar') : null,
          h('button', { class: 'btn sm ghost', title: 'Remover', onclick: async () => { if (await Core.modal({ title: 'Remover amigo?', body: `Remover ${f.name} da sua lista?`, buttons: [{ text: 'Cancelar', cls: 'ghost', value: false }, { text: 'Remover', cls: 'danger', value: true }] })) S.removeFriend(f.uid); } }, '🗑'))));
      } else if (tab === 'requests') {
        if (!S.requests.length) box.append(h('p', { class: 'muted center' }, 'Nenhum pedido de amizade pendente.'));
        S.requests.forEach(r => box.append(h('div', { class: 'f-row' },
          h('div', { class: 'av' }, r.avatar || '🙂'), h('div', { class: 'grow' }, h('b', null, r.name), h('div', { class: 'small muted' }, 'quer ser seu amigo')),
          h('button', { class: 'btn sm good', onclick: () => S.acceptRequest(r.uid).catch(() => Core.toast('Erro ao aceitar')) }, 'Aceitar'),
          h('button', { class: 'btn sm ghost', onclick: () => S.declineRequest(r.uid) }, '✕'))));
      } else {
        const inp = h('input', { type: 'text', placeholder: 'Código do amigo (ex.: K7M2QX)', maxlength: 12, style: { textTransform: 'uppercase' } });
        const msg = h('div', { class: 'small', style: { minHeight: '20px', marginTop: '8px' } });
        const go = async () => {
          msg.className = 'small muted'; msg.textContent = 'Enviando…';
          try { msg.textContent = '✅ ' + await S.addByCode(inp.value); msg.className = 'small good-t'; inp.value = ''; }
          catch (e) { msg.textContent = '⚠ ' + (e.message || 'Erro'); msg.className = 'small bad'; }
        };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
        box.append(h('p', { class: 'small muted' }, 'Peça o código ao seu amigo (ele fica no topo deste painel) e digite abaixo:'),
          h('div', { class: 'row' }, inp, h('button', { class: 'btn primary', onclick: go }, 'Enviar')), msg);
      }
      box.append(h('div', { class: 'row sb', style: { marginTop: '14px' } }, h('span', { class: 'small muted' }, 'Conectado como ' + me.name), h('button', { class: 'btn sm ghost', onclick: () => { S.signOut(); } }, 'Sair da conta')));
    }
    sheet.innerHTML = ''; sheet.append(box);
  }

  // ---------- utilitários compartilhados pelos jogos online ----------
  S.watchPresence = function (uid, cb) {
    const ref = S.db.ref('presence/' + uid);
    const fn = ref.on('value', s => { const v = s.val(); cb(!!(v && v.online)); });
    return () => ref.off('value', fn);
  };
  /** cria sala multi-jogador (Poker/Truco): host + amigos convidados */
  S.createRoom = async function (game, friends, extra) {
    const db = S.db, me = S.user.uid;
    const rid = db.ref('rooms').push().key;
    const members = {}, players = {};
    players[me] = { name: S.me.name, avatar: S.me.avatar };
    friends.forEach(f => { members[f.uid] = true; players[f.uid] = { name: f.name, avatar: f.avatar }; });
    const room = Object.assign({ game, host: me, hostName: S.me.name, hostAvatar: S.me.avatar, members, players, created: S.TS, status: 'waiting' }, extra || {});
    await db.ref('rooms/' + rid).set(room);
    await Promise.all(friends.map(f => S.sendInvite(f.uid, game, rid)));
    return rid;
  };
  /** convidado aceita entrar na sala multi-jogador */
  S.joinMemberRoom = async function (inv) {
    const me = S.user.uid;
    const snap = await S.db.ref('rooms/' + inv.room).get();
    if (!snap.exists()) throw new Error('Convite expirado');
    const room = snap.val();
    if (!(room.members && room.members[me]) && room.guest !== me) throw new Error('Convite inválido');
    await S.db.ref('rooms/' + inv.room + '/ready/' + me).set(true);
    return room;
  };

  /** Lobby embutido na tela inicial de cada jogo.
      opts: {game, multi, max, createLabel, onCreate(friends[]), resumeKey, onResume()} -> {el, destroy} */
  S.lobby = function (opts) {
    const el = h('div', { class: 'panel' });
    const sel = new Set();
    const render = () => {
      el.innerHTML = '';
      el.append(h('h3', null, '🌐 Jogar online com amigos'));
      if (!S.enabled) { el.append(h('p', { class: 'muted small' }, 'Modo online indisponível no momento.')); return; }
      if (!S.authReady) { el.append(h('p', { class: 'muted small' }, 'Conectando…')); return; }
      if (!S.user || !S.me) {
        el.append(h('p', { class: 'small muted' }, 'Entre com sua conta Google para convidar amigos e jogar em tempo real.'),
          h('button', { class: 'btn primary block', onclick: () => S.openPanel({}) }, '🔐 Entrar / Amigos'));
        return;
      }
      el.append(h('div', { class: 'row sb', style: { marginBottom: '8px' } },
        h('div', { class: 'olrow' }, h('div', { class: 'av' }, S.me.avatar), h('b', null, S.me.name)),
        h('button', { class: 'btn sm', onclick: () => S.openPanel({}) }, '👥 Amigos' + (S.requests.length ? ` (${S.requests.length})` : ''))));
      const saved = opts.resumeKey ? Core.store.get(opts.resumeKey, null) : null;
      if (saved && opts.onResume) el.append(h('div', { class: 'plan', style: { margin: '6px 0 10px' } }, 'Partida online em andamento. ',
        h('button', { class: 'btn sm primary', onclick: opts.onResume }, '↻ Retomar'), ' ',
        h('button', { class: 'btn sm ghost', onclick: () => { Core.store.set(opts.resumeKey, null); render(); } }, 'Descartar')));
      const friends = Array.from(S.friends.values()).sort((a, b) => (b.online - a.online) || a.name.localeCompare(b.name));
      if (!friends.length) { el.append(h('p', { class: 'muted small' }, 'Você ainda não tem amigos. Toque em "Amigos" para adicionar com o código.')); return; }
      const max = opts.max || 1;
      friends.forEach(f => {
        const chosen = sel.has(f.uid);
        el.append(h('div', { class: 'f-row' },
          h('div', { class: 'av' }, f.avatar), h('span', { class: 'dot-st ' + (f.online ? 'on' : '') }),
          h('div', { class: 'grow' }, h('b', null, f.name), h('div', { class: 'small muted' }, f.online ? 'online' : 'offline')),
          opts.multi
            ? h('button', { class: 'btn sm' + (chosen ? ' good' : '') + (f.online ? '' : ' disabled'), onclick: () => { if (chosen) sel.delete(f.uid); else if (sel.size < max) sel.add(f.uid); else Core.toast('Máximo de ' + max + ' amigos'); render(); } }, chosen ? '✓ Convidado' : '+ Convidar')
            : h('button', { class: 'btn sm primary' + (f.online ? '' : ' disabled'), onclick: () => opts.onCreate([f]) }, '⚔ Desafiar')));
      });
      if (opts.multi) el.append(h('button', { class: 'btn primary block' + (sel.size ? '' : ' disabled'), style: { marginTop: '10px' }, onclick: () => opts.onCreate(Array.from(sel).map(id => S.friends.get(id)).filter(Boolean)) }, opts.createLabel || 'Criar sala'));
    };
    const unsub = S.on(render); render();
    return { el, destroy: unsub };
  };

  /** Sala de espera (multi-jogador). o: {rid, isHost, minReady, title, onStart(readyUids), onPlaying(room), onLeave()} -> {el, destroy} */
  S.waitRoom = function (o) {
    const ref = S.db.ref('rooms/' + o.rid);
    const el = h('div', { class: 'panel' });
    let room = null, fired = false;
    const render = () => {
      el.innerHTML = '';
      el.append(h('h3', null, o.title || 'Sala de espera'));
      if (!room) { el.append(h('p', { class: 'muted' }, 'Carregando…')); return; }
      const ready = room.ready || {}, uids = Object.keys(room.players || {});
      const nReady = uids.filter(u => u !== room.host && ready[u]).length;
      uids.forEach(u => {
        const p = room.players[u];
        el.append(h('div', { class: 'f-row' }, h('div', { class: 'av' }, p.avatar || '🙂'),
          h('div', { class: 'grow' }, h('b', null, p.name), h('div', { class: 'small muted' }, u === room.host ? '👑 anfitrião' : (ready[u] ? '✅ pronto' : '⏳ aguardando aceitar'))),
          u === S.user.uid ? h('span', { class: 'chip' }, 'você') : null));
      });
      el.append(h('div', { class: 'small muted', style: { margin: '8px 0' } }, o.isHost ? 'Quando seus amigos estiverem prontos, inicie. Vagas livres são ocupadas por IAs.' : 'Aguardando o anfitrião iniciar a partida…'));
      el.append(h('div', { class: 'row' },
        o.isHost ? h('button', { class: 'btn primary grow' + (nReady >= (o.minReady || 1) ? '' : ' disabled'), onclick: () => o.onStart(uids.filter(u => u !== room.host && ready[u])) }, '▶ Iniciar partida') : null,
        h('button', { class: 'btn ghost' + (o.isHost ? '' : ' grow'), onclick: () => o.onLeave() }, o.isHost ? 'Cancelar' : 'Sair')));
    };
    const fn = ref.on('value', s => {
      room = s.val();
      if (!room) { if (!fired) { fired = true; Core.toast('A sala foi encerrada'); o.onLeave(true); } return; }
      render();
      if (room.status === 'playing' && !fired) { fired = true; o.onPlaying && o.onPlaying(room); }
    });
    render();
    return { el, destroy: () => ref.off('value', fn) };
  };

  // (?nofb na URL desliga o init automático — usado só nos testes automatizados)
  window.addEventListener('load', () => { if (!/[?&]nofb/.test(location.search)) S.init(); });
})();
