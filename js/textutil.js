/* ============================================================
   TextUtil — normalização e comparação de texto em português
   (usado pelo Perfil para validar palpites e pelo Dark Stories
   para entender perguntas e teorias)
   ============================================================ */
(function (root) {
  'use strict';
  const STOP = new Set(['o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do', 'das', 'dos', 'e', 'ano', 'em', 'no', 'na', 'nos', 'nas', 'eh', 'foi', 'era', 'seria', 'sera', 'acho', 'que', 'sou', 'eu', 'meu', 'nome', 'pra', 'para', 'por', 'talvez', 'resposta', 'ele', 'ela', 'isso', 'seja', 'quem', 'qual', 'essa', 'esse', 'e', 'o', 'ou']);

  /** minúsculas, sem acentos, só letras/números separados por um espaço */
  function norm(s) {
    return String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }
  /** palavras relevantes (sem artigos e preposições) */
  function toks(s) { return norm(s).split(' ').filter(t => t && !STOP.has(t)); }

  /** distância de edição (inserir, apagar, trocar e inverter letras vizinhas contam 1) */
  function lev(a, b, max) {
    if (a === b) return 0;
    if (Math.abs(a.length - b.length) > max) return max + 1;
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 0; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }
  /** erros de digitação tolerados conforme o tamanho da palavra */
  const tol = len => (len <= 3 ? 0 : len <= 7 ? 1 : 2);
  function sameTok(a, g) {
    if (a === g) return true;
    if (/^\d+$/.test(a) || /^\d+$/.test(g)) return false;       // números: só exatos
    return lev(a, g, tol(a.length)) <= tol(a.length);
  }

  /** O palpite equivale a alguma das respostas aceitas? */
  function matchAnswer(guess, aliases) {
    const gt = toks(guess);
    if (!gt.length) return { ok: false };
    for (const al of aliases) {
      const at = toks(al);
      if (!at.length || gt.length > at.length + 3) continue;
      if (at.every(a => gt.some(g => sameTok(a, g)))) return { ok: true, alias: al };
      // palavras coladas ou separadas a mais ("guardachuva", "machu pichu")
      const aj = at.join(''), gj = gt.join('');
      if (aj.length >= 5 && !/\d/.test(aj) && lev(gj, aj, tol(aj.length)) <= tol(aj.length)) return { ok: true, alias: al };
    }
    return { ok: false };
  }

  /** expressão "a|b&c|d" => todos os grupos (separados por &) precisam ter ao menos uma raiz (separadas por |) no texto */
  function parseKw(expr) { return expr.split('&').map(g => g.split('|').map(s => s.replace(/_/g, ' '))); }
  function kwScore(textPadded, groups) {
    let len = 0;
    for (const g of groups) {
      const hit = g.find(s => textPadded.includes(s));
      if (!hit) return 0;
      len += hit.length;
    }
    return groups.length * 100 + len;                           // mais grupos casados = mais específico
  }

  // ---- Dark Stories: entender perguntas e julgar teorias ----
  const kwCache = new Map();
  const groupsOf = expr => { let g = kwCache.get(expr); if (!g) { g = parseKw(expr); kwCache.set(expr, g); } return g; };
  const pad = s => ' ' + norm(s) + ' ';
  /** acha a pergunta do banco da história que melhor casa com o texto digitado */
  function matchQuestion(story, text) {
    const t = pad(text); let best = null;
    story.qa.forEach((q, i) => { const sc = kwScore(t, groupsOf(q[2])); if (sc && (!best || sc > best.sc)) best = { i, sc, q }; });
    return best;
  }
  /** a teoria cobre as peças principais da solução? */
  function judgeTheory(story, text) {
    const t = pad(text);
    if (toks(text).length < 3) return { short: true, solved: false, ratio: 0, n: 0 };
    const cov = story.facts.map(f => kwScore(t, groupsOf(f.k)) > 0);
    const reqOk = story.facts.every((f, i) => !f.req || cov[i]);
    const n = cov.filter(Boolean).length;
    return { solved: reqOk && n >= story.need, ratio: n / story.facts.length, n };
  }

  const api = { norm, toks, lev, sameTok, matchAnswer, parseKw, kwScore, matchQuestion, judgeTheory };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TextUtil = api;
})(typeof window !== 'undefined' ? window : globalThis);
