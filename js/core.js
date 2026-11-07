/* ============================================================
   Núcleo: utilidades, configurações, sons, modais e rotas
   ============================================================ */
(function () {
  'use strict';
  const Core = {};
  window.Core = Core;

  Core.$ = (s, r) => (r || document).querySelector(s);
  Core.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  Core.sleep = ms => new Promise(r => setTimeout(r, ms));
  Core.rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  Core.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  Core.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  Core.shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /** h('div', {class:'x', onclick:fn, style:{..}, html:'..'}, ...children) */
  Core.h = function (tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      e.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return e;
  };

  // ---------- armazenamento ----------
  Core.store = {
    get(k, def) { try { const v = localStorage.getItem('salao.' + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; } },
    set(k, v) { try { localStorage.setItem('salao.' + k, JSON.stringify(v)); } catch (e) { /* ignora */ } }
  };
  Core.settings = Object.assign({ sound: true, name: 'Você' }, Core.store.get('settings', {}));
  Core.saveSettings = () => Core.store.set('settings', Core.settings);
  Core.stats = Object.assign({}, Core.store.get('stats', {}));
  Core.addStat = (key, n) => { Core.stats[key] = (Core.stats[key] || 0) + (n || 1); Core.store.set('stats', Core.stats); };

  // ---------- sons (sintetizados, sem arquivos) ----------
  let ac = null;
  function ctx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(freq, dur, type, vol, when, slideTo) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, when, hp) {
    const c = ctx(); if (!c) return;
    const t = c.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = hp || 1800; f.Q.value = 0.8;
    const g = c.createGain(); g.gain.value = vol || 0.2;
    s.connect(f).connect(g).connect(c.destination); s.start(t);
  }
  const SOUNDS = {
    move() { tone(220, .09, 'triangle', .22, 0, 120); noise(.05, .15, 0, 900); },
    capture() { tone(160, .14, 'triangle', .3, 0, 70); noise(.12, .3, 0, 1200); },
    check() { tone(660, .12, 'square', .1); tone(880, .16, 'square', .1, .1); },
    castle() { SOUNDS.move(); setTimeout(SOUNDS.move, 120); },
    select() { tone(520, .05, 'sine', .08); },
    error() { tone(140, .18, 'sawtooth', .12, 0, 90); },
    card() { noise(.09, .35, 0, 3200); },
    deal() { noise(.07, .25, 0, 2600); },
    chip() { tone(1700, .05, 'square', .06); tone(2300, .04, 'square', .05, .035); noise(.04, .12, 0, 5000); },
    dice() { for (let i = 0; i < 6; i++) { noise(.04, .22, i * .06, 900 + Math.random() * 900); tone(200 + Math.random() * 100, .04, 'triangle', .1, i * .06); } },
    knock() { tone(110, .12, 'sine', .45, 0, 60); noise(.06, .3, 0, 500); },
    shout() { tone(300, .25, 'sawtooth', .13, 0, 520); tone(300, .25, 'square', .05, 0, 260); },
    win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, .22, 'triangle', .18, i * .11)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, .26, 'triangle', .16, i * .14)); },
    draw() { tone(440, .2, 'triangle', .14); tone(440, .2, 'triangle', .14, .22); },
    turn() { tone(880, .06, 'sine', .08); }
  };
  Core.snd = name => { if (Core.settings.sound && SOUNDS[name]) { try { SOUNDS[name](); } catch (e) { /* ignora */ } } };
  document.addEventListener('pointerdown', () => { ctx(); }, { once: true });

  // ---------- modal / toast ----------
  /** modal({title, body: string|Node, buttons:[{text, cls, value}], dismiss:true}) -> Promise<value> */
  Core.modal = function (o) {
    return new Promise(resolve => {
      const root = Core.$('#modal-root');
      const done = v => { back.remove(); resolve(v); };
      const btns = (o.buttons || [{ text: 'OK', cls: 'primary', value: true }]).map(b =>
        Core.h('button', { class: 'btn ' + (b.cls || ''), onclick: () => done(b.value) }, b.text));
      const body = Core.h('div', { class: 'body' });
      if (typeof o.body === 'string') body.innerHTML = o.body; else if (o.body) body.append(o.body);
      const box = Core.h('div', { class: 'modal' }, o.title ? Core.h('h3', null, o.title) : null, body, Core.h('div', { class: 'btns' }, btns));
      const back = Core.h('div', { class: 'modal-back', onclick: e => { if (e.target === back && o.dismiss !== false) done(o.dismissValue); } }, box);
      root.append(back);
    });
  };
  Core.toast = function (text, ms) {
    const t = Core.h('div', { class: 'toast' }, text);
    Core.$('#toast-root').append(t);
    setTimeout(() => t.remove(), ms || 2200);
  };


  // ---------- cartas (compartilhado: truco e poker) ----------
  Core.SUIT = { C: '♣', H: '♥', S: '♠', D: '♦' };
  /** cardEl({r:'A', s:'S'}, {back, small, cls}) -> elemento .card */
  Core.cardEl = function (c, o) {
    o = o || {};
    const el = document.createElement('div');
    el.className = 'card' + (o.small ? ' small' : '') + (o.cls ? ' ' + o.cls : '');
    if (!c || o.back) { el.classList.add('back'); el.innerHTML = '<i></i>'; return el; }
    const red = c.s === 'H' || c.s === 'D';
    const lab = c.r === 'T' ? '10' : c.r;
    const face = 'KQJ'.includes(c.r);
    el.classList.add(red ? 'red' : 'blk');
    el.dataset.r = c.r; el.dataset.s = c.s;
    el.innerHTML = `<b class="tl">${lab}<u>${Core.SUIT[c.s]}</u></b><b class="br">${lab}<u>${Core.SUIT[c.s]}</u></b>` +
      (face ? `<span class="ctr face"><em>${c.r}</em><u>${Core.SUIT[c.s]}</u></span>` : `<span class="ctr">${Core.SUIT[c.s]}</span>`);
    return el;
  };

  // ---------- rotas ----------
  Core.games = {};
  Core.register = (id, def) => { Core.games[id] = def; };
  let current = null;
  Core.go = id => { location.hash = id ? '#' + id : '#'; };
  Core.route = function () {
    const id = location.hash.replace('#', '');
    const view = Core.$('#view');
    if (current && current.unmount) { try { current.unmount(); } catch (e) { console.error(e); } }
    view.innerHTML = ''; window.scrollTo(0, 0);
    current = Core.games[id] || Core.games.hub;
    current.mount(view);
  };
  window.addEventListener('hashchange', Core.route);

  /** Cabeçalho padrão dos jogos */
  Core.topbar = function (title, extra) {
    return Core.h('div', { class: 'topbar' },
      Core.h('button', { class: 'btn icon', title: 'Menu', onclick: () => Core.go('') }, '←'),
      Core.h('h2', null, title),
      extra || Core.h('button', {
        class: 'btn icon', title: 'Som', onclick: e => { Core.settings.sound = !Core.settings.sound; Core.saveSettings(); e.currentTarget.textContent = Core.settings.sound ? '🔊' : '🔇'; }
      }, Core.settings.sound ? '🔊' : '🔇'));
  };
})();
