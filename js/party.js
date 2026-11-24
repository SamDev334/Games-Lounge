/* ============================================================
   Party — sessão online "anfitrião + amigos" reutilizável
   (usada por Perfil e Dark Stories; mesmo desenho do Detetive).

   O ANFITRIÃO roda o jogo e publica o estado em rooms/<rid>/pub.
   Os CONVIDADOS só leem o estado e enviam ações em rooms/<rid>/act/<uid>.

   const P = Party.create({
     game, title, key, max, box,            // box: elemento onde aparece a sala de espera
     createLabel, extra() -> {n, mode…},    // campos extras gravados na sala
     onHostStart({uids, players}),          // anfitrião clicou em "Iniciar": monte o jogo e chame P.begin(pub)
     onGuestStart(),                        // convidado entrou: monte a interface
     onPub(pub),                            // convidado recebeu um novo estado
     onAct(uid, act),                       // anfitrião recebeu uma ação de um convidado
     onLeft()                               // sessão encerrada: volte para a tela inicial
   });
   ============================================================ */
(function () {
  'use strict';
  const { h } = Core;

  function create(o) {
    const So = () => Core.Social;
    const S = { game: o.game, role: null, rid: null, room: null, hostUid: null, uids: [], players: {}, online: {}, refs: [], offs: [], last: {}, wait: null, lobby: null, left: false, seq: 0, n: 0, started: false };

    // ---------- tela inicial: lobby de amigos ----------
    S.lobbyEl = function () {
      if (!So()) return null;
      killLobby();
      S.lobby = So().lobby({ game: o.game, multi: true, max: o.max || 5, createLabel: o.createLabel || 'Criar sala e convidar', onCreate: createRoom, resumeKey: o.key, onResume: resume });
      return S.lobby.el;
    };
    function killLobby() { if (S.lobby) { S.lobby.destroy(); S.lobby = null; } }

    async function createRoom(friends) {
      const so = So(); if (!so || !so.user || !friends.length) return;
      try {
        const extra = o.extra ? o.extra(friends) : {};
        const rid = await so.createRoom(o.game, friends, extra);
        Object.assign(S, { role: 'host', rid, room: so.db.ref('rooms/' + rid), hostUid: so.user.uid, left: false });
        showWait(true);
      } catch (e) { console.error(e); Core.toast('Não foi possível criar a sala: ' + (e.message || 'verifique as regras do banco.'), 5000); }
    }
    S.join = async function (inv) {
      const so = So();
      if (!so || !so.user) { Core.toast('Entre na sua conta para aceitar o convite'); return; }
      try {
        const room = await so.joinMemberRoom(inv);
        Object.assign(S, { role: 'guest', rid: inv.room, room: so.db.ref('rooms/' + inv.room), hostUid: room.host, left: false });
        Core.store.set(o.key, { rid: inv.room });
        showWait(false);
      } catch (e) { console.error(e); Core.toast(e.message || 'Convite inválido ou expirado', 5000); o.onLeft && o.onLeft(); }
    };
    async function resume() {
      const saved = Core.store.get(o.key, null), so = So(); if (!saved || !so.user) return;
      try {
        const snap = await so.db.ref('rooms/' + saved.rid).get();
        if (!snap.exists()) { Core.store.set(o.key, null); Core.toast('A sala não existe mais'); o.onLeft && o.onLeft(); return; }
        const room = snap.val();
        if (room.host === so.user.uid) { Core.store.set(o.key, null); o.onLeft && o.onLeft(); return; }
        Object.assign(S, { role: 'guest', rid: saved.rid, room: so.db.ref('rooms/' + saved.rid), hostUid: room.host, left: false });
        if (room.status === 'playing') guestStart(); else showWait(false);
      } catch (e) { Core.store.set(o.key, null); o.onLeft && o.onLeft(); }
    }

    // ---------- sala de espera ----------
    function showWait(isHost) {
      killLobby();
      o.box.innerHTML = '';
      S.wait = So().waitRoom({
        rid: S.rid, isHost, minReady: 1, title: o.title,
        onStart: uids => { S.wait.destroy(); S.wait = null; hostStart(uids); },
        onPlaying: () => { if (!isHost) { S.wait.destroy(); S.wait = null; guestStart(); } },
        onLeave: closed => S.leave(!closed ? false : null, closed)
      });
      o.box.append(h('div', { class: 'tr-setup' }, S.wait.el));
    }

    // ---------- anfitrião ----------
    async function hostStart(uids) {
      const so = So();
      try {
        const snap = await S.room.child('players').get();
        const pl = snap.val() || {};
        S.uids = uids.slice(0, o.max || 5); S.players = {};
        S.uids.forEach(u => { S.players[u] = pl[u] || { name: 'Amigo', avatar: '🙂' }; });
        S.players[so.user.uid] = pl[so.user.uid] || { name: so.me.name, avatar: so.me.avatar };
        await o.onHostStart({ uids: S.uids, players: S.players, me: so.me });
      } catch (e) { console.error(e); Core.toast('Erro ao iniciar a partida'); }
    }
    /** anfitrião: publica o estado inicial, abre a sala para os convidados e passa a ouvir as ações */
    S.begin = async function (pub) {
      const so = So();
      S.uids.forEach(uid => {
        S.offs.push(so.watchPresence(uid, on => { S.online[uid] = on; }));
        const ref = S.room.child('act/' + uid);
        const fn = ref.on('value', s => { const v = s.val(); if (v && v.id !== S.last[uid]) { S.last[uid] = v.id; try { o.onAct && o.onAct(uid, v); } catch (e) { console.error(e); } } });
        S.refs.push([ref, 'value', fn]);
      });
      S.started = true;
      const okPub = await S.publishNow(pub, true);
      if (!okPub) { Core.toast('Não foi possível iniciar: o banco recusou a gravação (publique as regras de database.rules.json no Firebase).', 7000); return false; }
      await S.room.child('status').set('playing');
      return true;
    };
    S.publishNow = function (pub, strict) {
      if (S.role !== 'host' || !S.room) return Promise.resolve(false);
      clearTimeout(S.pt); S.pt = null; S.pending = null;
      return S.room.child('pub').set(JSON.parse(JSON.stringify(Object.assign({}, pub, { seq: ++S.seq })))).then(() => true).catch(e => {
        console.error(e);
        if (!strict && !S.warned) { S.warned = true; Core.toast('Falha ao sincronizar com os amigos: ' + (e.message || e), 5000); }
        return false;
      });
    };
    /** publicação com pequeno atraso (agrupa várias mudanças seguidas); recebe uma função que gera o estado */
    S.publish = function (getPub) {
      if (S.role !== 'host' || !S.started) return;
      S.pending = getPub; if (S.pt) return;
      S.pt = setTimeout(() => { S.pt = null; const g = S.pending; S.pending = null; if (g && !S.left) S.publishNow(g()); }, 40);
    };
    S.isOnline = uid => S.online[uid] !== false;

    // ---------- convidado ----------
    function guestStart() {
      killLobby(); S.started = true;
      const so = So();
      o.onGuestStart && o.onGuestStart();
      const on = (ref, ev, fn) => { ref.on(ev, fn, e => console.error(e)); S.refs.push([ref, ev, fn]); };
      on(S.room.child('pub'), 'value', s => { if (s.val() && !S.left) o.onPub && o.onPub(s.val()); });
      on(S.room.child('status'), 'value', s => { if (s.val() == null && !S.left) { Core.toast('A sala foi encerrada'); S.leave(false, true); } });
      S.offs.push(so.watchPresence(S.hostUid, online => { if (!S.left && !online) Core.toast('O anfitrião está offline…', 3500); }));
    }
    S.send = function (act) {
      if (S.role !== 'guest' || !S.room || !So().user) return Promise.resolve();
      return S.room.child('act/' + So().user.uid).set(Object.assign({ id: Date.now() * 10 + (S.n++ % 10) }, act)).catch(e => {
        console.error(e); Core.toast(/permission/i.test(e.message || '') ? 'O banco recusou sua jogada: peça ao anfitrião para publicar as regras (database.rules.json) no Firebase.' : 'Falha ao enviar a jogada.', 6000);
      });
    };

    // ---------- encerramento ----------
    function cleanup() {
      S.left = true;
      S.refs.forEach(([r, ev, fn]) => { try { r.off(ev, fn); } catch (e) { /* ok */ } });
      S.offs.forEach(f => { try { f(); } catch (e) { /* ok */ } });
      if (S.wait) { S.wait.destroy(); S.wait = null; }
      killLobby(); clearTimeout(S.pt); S.refs = []; S.offs = []; S.started = false;
    }
    /** ask === true: pede confirmação ao anfitrião */
    S.leave = async function (ask, silent) {
      if (!S.role) return;
      if (ask === true && S.role === 'host' && S.started) {
        const ok = await Core.modal({ title: 'Encerrar a partida?', body: 'Os amigos serão desconectados.', buttons: [{ text: 'Continuar', cls: 'ghost', value: false }, { text: 'Encerrar', cls: 'danger', value: true }] });
        if (!ok) return;
      }
      const so = So(), role = S.role, room = S.room, rid = S.rid;
      cleanup(); S.role = null;
      try {
        if (role === 'host') await room.remove();
        else if (so && so.user && !silent) await so.db.ref('rooms/' + rid + '/ready/' + so.user.uid).set(false).catch(() => { });
      } catch (e) { console.error(e); }
      Core.store.set(o.key, null);
      o.onLeft && o.onLeft();
    };
    /** chamada no unmount: solta os ouvintes sem apagar a sala de quem só saiu da tela */
    S.destroy = function () { const had = S.role; cleanup(); if (had === 'host' && S.room) S.room.remove().catch(() => { }); S.role = null; };
    return S;
  }
  window.Party = { create };
})();
