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
  /** a raiz aparece no texto? (também tolera 1 erro de digitação em raízes de 5+ letras) */
  function kwHit(textPadded, tokens, s) {
    if (textPadded.includes(s)) return true;
    const st = s.trim();
    if (!tokens || st.length < 6 || s !== st) return false;
    return tokens.some(t => t.length >= 5 && t[0] === st[0] && Math.abs(t.length - st.length) <= 3 && [-1, 0, 1].some(d => lev(t.slice(0, st.length + d), st, 1) <= 1));
  }
  function kwScore(textPadded, groups, tokens) {
    let len = 0;
    for (const g of groups) {
      const hit = g.find(s => kwHit(textPadded, tokens, s));
      if (!hit) return 0;
      len += hit.length;
    }
    return groups.length * 100 + len;                           // mais grupos casados = mais específico
  }

  // ---- Dark Stories: entender perguntas e julgar teorias ----
  /** Questionário padrão: temas que quase todo detetive pergunta. Cada história responde com story.attrs (id -> s/n/i/q). */
  const GENERIC = [
    ['morte', 'Alguém morreu?', 'morr|morte|morto|morta|faleceu|falecer|obito|cadaver|vitima'],
    ['assassinato', 'Foi um assassinato?', 'assassin|matou|matar|homicid|mataram|crime'],
    ['suicidio', 'Foi suicídio?', 'suicid|se_matou|tirar_a_propria_vida|se_mat'],
    ['acidente', 'Foi um acidente?', 'acidente|acidental|sem_querer|por_acaso'],
    ['arma', 'Envolve alguma arma?', '_arma|revolver|pistola|_faca|_tiro|atirar|disparo|espingarda'],
    ['veneno', 'Envolve veneno ou drogas?', 'venen|intoxic|droga|overdose|poison'],
    ['animal', 'Envolve algum animal?', 'animal|cachorro|_gato|cobra|passaro|bicho|cavalo|peixe|_onca|_urso|_lobo'],
    ['sobrenatural', 'Tem algo sobrenatural?', 'sobrenatural|fantasma|espirito|magia|bruxa|assombr|demonio|milagre'],
    ['policia', 'A polícia está envolvida?', 'policia|policial|delegado|detetive|prisao|preso|prender|tribunal|juiz'],
    ['dinheiro', 'Envolve dinheiro?', 'dinheiro|heranca|_rico|pobre|pagar|pagou|divida|roubo|roubar|fortuna'],
    ['amor', 'Envolve amor ou paixão?', '_amor|apaixon|_casad|casamento|esposa|marido|namorad|ciume|traic|_ama_|_amar|amava|amou'],
    ['familia', 'Envolve família?', 'familia|filho|filha|_pai_|_mae_|irmao|_irma|parente|_avo'],
    ['noite', 'Acontece à noite?', 'noite|madrugada|escuro|escuridao|anoiteceu'],
    ['dia', 'Acontece de dia?', 'de_dia|manha|tarde|durante_o_dia'],
    ['fechado', 'Acontece em um lugar fechado?', '_quarto|_casa|dentro_de|predio|trancad|_porta|_sala|elevador|hotel|escritorio|lugar_fechado'],
    ['aberto', 'Acontece ao ar livre?', 'ao_ar_livre|rua|floresta|campo|deserto|praia|montanha|parque|ilha|lugar_aberto'],
    ['agua', 'Tem a ver com água?', 'agua|_mar_|_rio_|afog|piscina|_lago|oceano'],
    ['fogo', 'Tem a ver com fogo?', '_fogo|incendi|queimad|_chama|fumaca'],
    ['veiculo', 'Tem algum veículo?', 'carro|aviao|trem|onibus|veiculo|navio|barco|moto|helicoptero|balao'],
    ['tecnologia', 'Envolve tecnologia?', 'celular|computador|telefone|internet|camera|televisao|_radio|robo|tecnologia|_maquina'],
    ['esporte_jogo', 'Tem a ver com jogo ou esporte?', 'jogo|esporte|jogar|time_|partida|baralho|tabuleiro|cassino|aposta'],
    ['comida', 'Envolve comida ou bebida?', 'comida|comer|comeu|restaurante|sopa|bebida|beber|bebeu|jantar|almoco|cafe'],
    ['doenca', 'Envolve doença ou saúde?', 'doente|doenca|saude|hospital|medico|cancer|virus|alergia|remedio'],
    ['sono', 'Envolve sono ou sonhos?', '_sono|dormir|dormiu|sonho|sonhar|pesadelo|acordou'],
    ['mentira', 'Há alguma mentira, truque ou segredo?', 'mentir|mentira|engan|segredo|esconder|fingir|disfarce|truque|pegadinha'],
    ['vinganca', 'Há vingança ou ódio?', 'vinganca|vingar|odio|rancor|inimigo|rival'],
    ['crianca', 'Há crianças envolvidas?', 'crianca|menino|menina|bebe|adolescente'],
    ['velho', 'Há idosos envolvidos?', 'idoso|velho|velhinho|aposentado'],
    ['sozinho', 'O personagem principal está sozinho?', 'sozinho|ninguem|isolad'],
    ['varias_pessoas', 'Há várias pessoas envolvidas?', 'varias_pessoas|grupo|muitas_pessoas|multidao|outras_pessoas|duas_pessoas|testemunha'],
    ['passado', 'A explicação está no passado?', 'passado|antigamente|anos_atras|infancia|antes_disso|lembranca'],
    ['religiao', 'Tem a ver com religião ou funeral?', 'igreja|padre|religi|deus|funeral|enterro|velorio|cemiterio'],
    ['trabalho', 'Tem a ver com trabalho ou profissão?', 'trabalho|profissao|emprego|chefe|empregado|profissional'],
    ['real', 'Poderia acontecer na vida real?', 'vida_real|realista|poderia_acontecer|de_verdade|acontecer_de_verdade'],
    ['humano', 'O protagonista é uma pessoa?', 'humano|pessoa|protagonista'],
    ['clima', 'O clima ou o tempo importa?', 'chuva|tempestade|vento|neve|calor|frio|clima|temperatura']
  ];
  const kwCache = new Map();
  const groupsOf = expr => { let g = kwCache.get(expr); if (!g) { g = parseKw(expr); kwCache.set(expr, g); } return g; };
  const pad = s => ' ' + norm(s) + ' ';
  /** "morte=s acidente=n" -> { morte:'s', acidente:'n' } */
  function parseAttrs(str) { const o = {}; String(str || '').split(/\s+/).forEach(p => { const [k, v] = p.split('='); if (k && v) o[k] = v; }); return o; }
  /** acha a melhor resposta: primeiro as perguntas da própria história, depois o questionário padrão */
  function matchQuestion(story, text) {
    const t = pad(text), tk = norm(text).split(' ');
    let best = null;
    story.qa.forEach((q, i) => { const sc = kwScore(t, groupsOf(q[2]), tk); if (sc && (!best || sc + 60 > best.sc)) best = { i, sc: sc + 60, q }; });
    // conceitos centrais da solução citados em perguntas curtas ("ele tinha soluço?") => Sim
    if (!best && story.facts && tk.filter(x => x).length <= 8) story.facts.forEach((f, i) => { const sc = kwScore(t, groupsOf(f.k), tk); if (sc && (!best || sc > best.sc)) best = { i: -1, sc, q: ['Conceito central da história', 's', f.k], inferred: true }; });
    if (story.attrs) GENERIC.forEach(g => { const sc = kwScore(t, groupsOf(g[2]), tk); if (sc && (!best || sc > best.sc)) best = { i: -1, sc, q: [g[1], story.attrs[g[0]] || 'i', g[2]], generic: true }; });
    return best;
  }
  /** pergunta aberta (como/por que/qual/quem…): não dá para responder com Sim ou Não */
  function isOpen(text) {
    return /^(e |mas |entao )?(qual|quais|quem|quanto|quantos|quantas|quantas|como|por que|porque|pq|onde|quando|o que|que |me conte|me explique|explique|conte|fale|diga)\b/.test(norm(text));
  }
  /** perguntas parecidas com o que o jogador digitou (para ajudar quando o jogo não entende) */
  function suggest(story, text, n) {
    const qt = toks(text), pool = story.qa.map(q => q[0]).concat(GENERIC.map(g => g[1]));
    const scored = pool.map(q => { const t2 = toks(q); return [qt.filter(a => t2.some(b => sameTok(a, b))).length, q]; }).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
    const out = scored.slice(0, n).map(x => x[1]);
    ['Alguém morreu?', 'Foi um acidente?', 'Envolve algum animal?', 'Acontece à noite?'].forEach(b => { if (out.length < n && !out.includes(b)) out.push(b); });
    return out;
  }
  /** a teoria cobre as peças principais da solução? */
  function judgeTheory(story, text) {
    const t = pad(text), tk = norm(text).split(' ');
    if (toks(text).length < 3) return { short: true, solved: false, ratio: 0, n: 0 };
    const cov = story.facts.map(f => kwScore(t, groupsOf(f.k), tk) > 0);
    const reqOk = story.facts.every((f, i) => !f.req || cov[i]);
    const n = cov.filter(Boolean).length;
    return { solved: reqOk && n >= story.need, ratio: n / story.facts.length, n };
  }

  const api = { norm, toks, lev, sameTok, matchAnswer, parseKw, kwScore, matchQuestion, judgeTheory, suggest, parseAttrs, isOpen, GENERIC };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.TextUtil = api;
})(typeof window !== 'undefined' ? window : globalThis);
