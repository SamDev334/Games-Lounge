/* ============================================================
   DARK STORIES — banco de histórias
   Cada história:
     story     o enigma (o que todos leem)
     solution  a explicação (só aparece no final)
     hints[3]  dicas progressivas
     facts[]   "peças" da solução, usadas para julgar teorias digitadas
               {t: descrição, k: palavras-chave, req: 1 se obrigatória}
     need      quantas peças (no total) a teoria precisa cobrir
     qa[]      banco de perguntas do modo automático: [pergunta, resposta, palavras-chave]
               resposta: 's' = Sim · 'n' = Não · 'i' = Irrelevante · 'q' = Sim e não / em parte
   Sintaxe das palavras-chave (texto sem acento e em minúsculas):
     "a|b&c|d"  =>  (a OU b) E (c OU d).   "_" vira espaço (ex.: guarda_chuva)
   ============================================================ */
window.DS_STORIES = [
  {
    id: 'soluco', title: 'O Pedido no Bar', diff: 1,
    story: 'Um homem entra num bar e pede um copo d\'água ao barman. O barman saca uma arma e aponta para ele. O homem agradece e vai embora.',
    solution: 'O homem estava com soluço e pediu água para tentar curá-lo. O barman percebeu e, em vez de dar a água, tomou um grande susto de propósito apontando uma arma — um truque conhecido para fazer o soluço passar. Funcionou: o homem agradeceu, já curado, e foi embora.',
    hints: ['Pense num incômodo comum do dia a dia que passa sozinho ou com um truque.', 'O copo d\'água era um remédio caseiro.', 'O barman fez aquilo de propósito, para ajudar.'],
    facts: [
      { t: 'O homem estava com soluço', k: 'soluc', req: 1 },
      { t: 'O barman o assustou de propósito', k: 'susto|assust|surpre|espant|medo' },
      { t: 'O susto serviu para curar o soluço', k: 'cura|curar|curou|parar|parou|passa|passou|acabar|acabou|livrar|tratar' }
    ], need: 2,
    qa: [
      ['O homem estava doente?', 'q', 'doente|doenca|enfermo|saude'],
      ['O barman queria matar o homem?', 'n', 'barman|garcom|atendente|bartender|dono&mat|assassin|ferir|machuc'],
      ['O barman atirou?', 'n', 'atir|dispar|tiro'],
      ['A arma estava carregada?', 'i', 'carregad|bala|municao|de_verdade|de_mentira|brinquedo'],
      ['O homem ficou assustado?', 's', 'assust|susto|medo|apavor|espant'],
      ['O barman queria ajudar o homem?', 's', 'ajud|_favor_|bem_ao|boa_inten|curar'],
      ['O homem queria mesmo beber a água?', 's', 'agua&beber|tomar|queria'],
      ['O homem estava com sede?', 'n', 'sede'],
      ['Eles já se conheciam?', 'n', 'conhec|amig|inimig|familia|parente'],
      ['O homem chamou a polícia?', 'n', 'policia|delegacia|prend|denunc'],
      ['O homem ficou bravo com o barman?', 'n', 'bravo|raiva|irritad|furioso|zangad|brigou|briga'],
      ['O homem foi embora satisfeito?', 's', 'satisf|feliz|contente|agradec|alivi'],
      ['Foi um truque ou brincadeira?', 's', 'truque|pegadinha|brincadeira|metodo|tecnica|de_proposito'],
      ['O problema do homem era no estômago?', 'n', 'estomago|barriga|fome|intoxic|enjoo'],
      ['A água ajudaria o homem?', 's', 'agua&ajud|resolv|curar|melhor|adiant'],
      ['Tem algo a ver com a respiração?', 'q', 'respir|engasg|garganta'],
      ['Era de noite?', 'i', 'noite|madrugada|manha|tarde']
    ]
  },
  {
    id: 'carro-hotel', title: 'O Carro e o Hotel', diff: 1,
    story: 'Um homem empurra o seu carro até chegar a um hotel. No instante em que o vê, ele perde todo o seu dinheiro e fica falido.',
    solution: 'O homem está jogando um jogo de tabuleiro, como Banco Imobiliário ou Monopoly. O "carro" é o pino do jogo, que ele empurra pelo tabuleiro até cair numa propriedade com um hotel, cujo aluguel altíssimo o deixa sem dinheiro.',
    hints: ['O carro não é um carro de verdade.', 'Pense numa brincadeira com dados e dinheiro de mentira.', 'É um jogo de tabuleiro famoso.'],
    facts: [
      { t: 'É um jogo de tabuleiro (Banco Imobiliário / Monopoly)', k: 'jogo|tabuleiro|monopoly|monopolio|banco_imobiliario|metropole|dados', req: 1 },
      { t: 'O "carro" é um pino/peça do jogo', k: 'pino|peca|miniatura|peao|ficha|brinquedo|carrinho|token|marcador' },
      { t: 'Ele pagou um aluguel caro e faliu no jogo', k: 'aluguel|pagar|pagou|falir|falencia|faliu|quebrou|quebrar' }
    ], need: 2,
    qa: [
      ['É um jogo?', 's', 'jogo|brincad|tabuleiro|partida'],
      ['O carro é de verdade?', 'n', 'carro|automovel&verdade|real'],
      ['O homem estava dirigindo?', 'n', 'dirig|motorista|guiar'],
      ['O carro quebrou?', 'n', 'quebr|pane|defeito|enguic'],
      ['O dinheiro dele foi roubado?', 'n', 'roub|assalt|furt'],
      ['Alguém se machucou?', 'n', 'machuc|ferid|morr|morte|acident'],
      ['Há outras pessoas envolvidas?', 's', 'outras_pessoas|outro_jogador|adversari|jogadores|outros'],
      ['O hotel é de verdade?', 'n', 'hotel&verdade|real|hospedar|dormir'],
      ['O homem perdeu dinheiro de verdade?', 'n', 'dinheiro&verdade|real'],
      ['Ele pagou alguma coisa ao dono do hotel?', 's', 'pag|aluguel|diaria|cobr'],
      ['Tem a ver com um tabuleiro?', 's', 'tabuleiro'],
      ['O carro é um brinquedo?', 's', 'carro&brinquedo|miniatura|pequen|peca|pino'],
      ['Ele sabia que ia perder?', 'i', 'sabia|previa|esperava'],
      ['Isso aconteceu num lugar público?', 'i', 'publico|rua|praca']
    ]
  },
  {
    id: 'elevador', title: 'O Botão do 20º', diff: 1,
    story: 'Um homem mora no 20º andar de um prédio. Todo dia ele pega o elevador até o térreo para ir ao trabalho. Na volta, ele sobe de elevador só até o 10º andar e vai o resto do caminho a pé — exceto nos dias de chuva, quando sobe direto até o 20º.',
    solution: 'O homem é muito baixo e só consegue alcançar o botão do 10º andar. Nos dias de chuva, ele leva um guarda-chuva e usa a ponta dele para apertar o botão do 20º.',
    hints: ['Não é questão de saúde nem de exercício físico.', 'O problema é de alcance.', 'Nos dias de chuva, ele carrega um objeto extra.'],
    facts: [
      { t: 'O homem é muito baixo', k: 'baixo|baixinho|pequen|altura|estatura|nanismo|crianca|nao_alcanc|nao_chega|nao_consegue_alcanc', req: 1 },
      { t: 'Ele só alcança o botão do 10º andar', k: 'botao|apertar|alcanc|chega' },
      { t: 'Na chuva, usa o guarda-chuva para apertar o 20º', k: 'guarda_chuva|guardachuva|sombrinha' }
    ], need: 2,
    qa: [
      ['O homem tem problema de saúde nas pernas?', 'n', 'perna|saude|doente|doenca|cadeira_de_rodas|deficien'],
      ['O elevador funciona normalmente?', 's', 'elevador&funcion|quebrad|normal|defeito'],
      ['Ele sobe a pé por exercício?', 'n', 'exercicio|academia|saudavel|emagrec'],
      ['Tem relação com a altura dele?', 's', 'altura|baixo|alto|estatura|tamanho'],
      ['Ele leva algum objeto nos dias de chuva?', 's', 'objeto|leva|carrega|traz|usa&chuva'],
      ['Esse objeto é usado só para se proteger da chuva?', 'q', 'objeto&protege|proteger|molhar|usar'],
      ['Ele tem medo de alguma coisa?', 'n', 'medo|fobia|claustro'],
      ['Ele quer encontrar alguém na escada?', 'n', 'encontrar|alguem&escada'],
      ['Tem a ver com o botão do elevador?', 's', 'botao'],
      ['Ele consegue apertar o botão do 20º sem ajuda de nada?', 'n', 'consegue|alcanca|aperta&20|vinte|ultimo'],
      ['É um homem adulto?', 's', 'adulto'],
      ['Ele mora com alguém?', 'i', 'mora_com|sozinho|familia|esposa'],
      ['O prédio tem só um elevador?', 'i', 'um_elevador|so_um|varios_elevadores']
    ]
  },
  {
    id: 'palito', title: 'O Palito Mais Curto', diff: 2,
    story: 'Um homem é encontrado morto no meio de um campo aberto. Não há sinais de briga nem de arma, não há nenhum veículo por perto e, na mão, ele segura um palito de fósforo curto.',
    solution: 'O homem estava num balão de ar quente que perdia altura e ia cair. Para aliviar o peso, os ocupantes combinaram sortear com palitos: quem tirasse o menor teria que saltar. Ele tirou o palito mais curto e pulou do balão — morreu na queda.',
    hints: ['A morte foi consequência de uma decisão tomada em grupo.', 'Ele estava num veículo que flutua.', 'Alguém precisou saltar para os outros se salvarem.'],
    facts: [
      { t: 'Estavam num balão', k: 'balao|baloes', req: 1 },
      { t: 'O balão perdia altura e precisava ficar mais leve', k: 'peso|altura|perdendo|cair|caindo|descend|aliviar|leve|jogar' },
      { t: 'Fizeram um sorteio com palitos', k: 'sorteio|sortear|sorte|palito|fosforo|escolher|tirar' },
      { t: 'Ele tirou o palito curto, saltou e morreu na queda', k: 'saltou|pulou|pular|saltar|queda|caiu|morreu|sacrific' }
    ], need: 3,
    qa: [
      ['Ele foi assassinado?', 'n', 'assassin|matou|matar|morto_por'],
      ['Foi suicídio?', 'n', 'suicid|se_matou'],
      ['Foi um acidente?', 'q', 'acidente'],
      ['Ele estava sozinho antes de morrer?', 'n', 'sozinho'],
      ['Ele caiu de um lugar alto?', 's', 'caiu|queda|alto|altura|cair'],
      ['Ele estava dentro de um veículo antes?', 's', 'veiculo'],
      ['Ele estava num avião?', 'n', 'aviao|jato'],
      ['Ele estava num helicóptero?', 'n', 'helicoptero'],
      ['Tem a ver com sorte ou sorteio?', 's', 'sorteio|sorte|escolh|palito'],
      ['O fósforo tem a ver com fogo ou incêndio?', 'n', '_fogo|incendi|queimad|_chama'],
      ['Alguém o empurrou?', 'n', 'empurr'],
      ['Outras pessoas participaram da decisão?', 's', 'outras|decid|combin|grupo|junto'],
      ['Ele tinha uma doença?', 'n', 'doenca|doente|infarto|coracao'],
      ['Ele estava voando?', 's', 'voando|voar|voo'],
      ['O palito é importante para a explicação?', 's', 'palito|fosforo&import|pista|relacion']
    ]
  },
  {
    id: 'mochila', title: 'A Mochila Fechada', diff: 2,
    story: 'Um homem é encontrado morto numa floresta, com uma mochila fechada nas costas. A polícia não encontra pegadas ao redor do corpo e nenhuma outra pessoa estava por perto.',
    solution: 'A mochila era um paraquedas que não abriu. O homem saltou de um avião e o equipamento falhou; por isso ele caiu do céu direto na floresta, sem deixar pegadas de chegada.',
    hints: ['Ele não carregava comida nem roupas.', 'O que ele carregava deveria ter salvado a vida dele.', 'Ele veio do céu.'],
    facts: [
      { t: 'A mochila era um paraquedas', k: 'paraquedas|paraquedismo|para_quedas|saltou_de_aviao|salto_de_aviao|saltar_de_aviao', req: 1 },
      { t: 'O paraquedas não abriu / falhou', k: 'nao_abriu|falh|defeito|nao_funcion|travou|nao_abr|nao_abre' }
    ], need: 2,
    qa: [
      ['Ele foi assassinado?', 'n', 'assassin|matou|matar|morto_por'],
      ['A mochila estava cheia de objetos pessoais?', 'n', 'cheia|objetos|roupa|comida|pertences'],
      ['O que havia na mochila é importante para a morte dele?', 's', 'mochila&import|relacion|causa|explic'],
      ['Ele caiu de um lugar alto?', 's', 'caiu|cair|queda|alto'],
      ['Ele estava caminhando pela floresta?', 'n', 'caminh|trilha|andando|acampar'],
      ['Ele estava praticando um esporte?', 's', 'esporte|radical|aventura'],
      ['Ele veio de avião ou helicóptero?', 's', 'aviao|helicoptero'],
      ['Um animal estava envolvido?', 'n', 'animal|onca|cobra|lobo|urso'],
      ['A mochila tinha comida ou água?', 'n', 'comida|agua|lanche'],
      ['A mochila deveria ter sido aberta?', 's', 'mochila&abrir|abert|abrisse'],
      ['Foi suicídio?', 'n', 'suicid|se_matou'],
      ['Foi veneno?', 'n', 'venen'],
      ['A mochila é um equipamento especial?', 's', 'equipamento|mochila&especial|seguranc|salvar|vida'],
      ['Alguém sabotou o equipamento?', 'i', 'sabot|propositalmente|de_proposito']
    ]
  },
  {
    id: 'arma-gelo', title: 'A Arma que Sumiu', diff: 2,
    story: 'Um homem é encontrado morto, com um ferimento fundo no peito, no meio do próprio escritório trancado por dentro. A polícia revista a sala inteira, mas não encontra a arma do crime. A única coisa estranha é uma poça d\'água no tapete.',
    solution: 'A arma era uma lâmina de gelo (um grande pingente de gelo afiado). O assassino a usou e foi embora; o gelo derreteu, restando apenas a poça d\'água no tapete — e nenhuma arma para ser encontrada.',
    hints: ['Pense no que desaparece com o tempo e deixa só água.', 'A arma não era de metal.', 'O assassino nem precisou levar a arma embora.'],
    facts: [
      { t: 'A arma era feita de gelo', k: 'gelo|congelad|geada|glacial|estalactite|pingente', req: 1 },
      { t: 'O gelo derreteu e virou a poça d\'água', k: 'derret|descongel|sumiu|desaparec|virou_agua|poca' }
    ], need: 2,
    qa: [
      ['Foi um acidente?', 'n', 'acidente'],
      ['Foi uma arma de fogo?', 'n', 'arma_de_fogo|pistola|revolver|tiro|bala'],
      ['A arma parecia uma faca?', 'q', 'faca|punhal|adaga|lamina|perfur|pontiaguda'],
      ['A arma ainda está na sala?', 'n', 'arma&sala|local|ainda|encontr'],
      ['A poça d\'água tem a ver com a morte?', 's', 'poca|agua'],
      ['O assassino levou a arma embora?', 'n', 'levou|escondeu|carreg'],
      ['A arma desapareceu sozinha?', 's', 'sozinha|desapareceu|sumiu|derreteu'],
      ['A temperatura é importante?', 's', 'temperatura|calor|frio|gelad|quente'],
      ['Foi envenenamento?', 'n', 'venen'],
      ['O assassino conhecia a vítima?', 'i', 'conhec|amig|inimig|familia'],
      ['O assassino estava na sala quando a polícia chegou?', 'n', 'assassino&estava|ainda|escondido'],
      ['O crime foi planejado?', 's', 'planej|premedit'],
      ['A arma foi comprada numa loja?', 'n', 'comprad|loja|compra'],
      ['Era inverno?', 'i', 'inverno|verao|estacao']
    ]
  },
  {
    id: 'albatroz', title: 'A Sopa de Albatroz', diff: 3,
    story: 'Um homem entra num restaurante à beira-mar e pede sopa de albatroz. Depois de tomar a primeira colherada, ele fica em silêncio, começa a chorar, paga a conta e vai embora. Nunca mais voltou a pedir esse prato.',
    solution: 'Anos antes, o homem naufragou numa ilha deserta com a esposa e outros sobreviventes. Famintos, os companheiros lhe serviram uma "sopa de albatroz" — mas era feita da carne da esposa dele, que havia morrido. Ao provar a sopa de albatroz de verdade, notou que o gosto era diferente e entendeu o que realmente havia comido naquela ilha.',
    hints: ['A resposta está no passado do homem.', 'Ele já tinha passado por um naufrágio.', 'O que lhe serviram na ilha não era albatroz.'],
    facts: [
      { t: 'Ele foi náufrago / ficou isolado e com fome', k: 'naufrag|ilha|barco|navio|deserta|isolad|perdid|fome', req: 1 },
      { t: 'Serviram-lhe carne humana (canibalismo) sem ele saber', k: 'canibal|carne_humana|carne|comeram|alimentaram|humana' },
      { t: 'A carne era de alguém querido que morreu (a esposa)', k: 'espos|mulher|amigo|companheiro|morto|morta|falecid|parente|filho|querid' },
      { t: 'O gosto da sopa verdadeira o fez perceber a verdade', k: 'gosto|sabor|diferente|percebeu|descobriu|verdade|enganad|mentira' }
    ], need: 3,
    qa: [
      ['O homem já tinha provado essa sopa antes?', 's', 'ja_|antes|prov&sopa|albatroz'],
      ['A sopa estava envenenada?', 'n', 'venen'],
      ['A sopa estava estragada?', 'n', 'estragad|podre|azeda|vencid'],
      ['O gosto da sopa foi importante?', 's', 'gosto|sabor'],
      ['Alguém do restaurante tinha algo contra ele?', 'n', 'garcom|cozinheiro|dono|restaurante&contra|vinganca|inimig'],
      ['Tem relação com o passado do homem?', 's', 'passado|antes|anos|antigamente|historia'],
      ['Ele já esteve perdido ou isolado em algum lugar?', 's', 'perdido|isolad|ilha|barco|naufrag'],
      ['Alguém morreu no passado?', 's', 'alguem&morr|morte|faleceu'],
      ['Ele foi enganado no passado?', 's', 'engan|mentir|mentiu|mentira'],
      ['O homem ficou triste?', 's', 'triste|chor|choro|emocion|abalad|choc'],
      ['Ele conhecia o dono do restaurante?', 'n', 'conhec&dono|cozinheiro|garcom'],
      ['O albatroz é uma ave?', 's', 'albatroz&ave|passaro|bicho|animal'],
      ['O restaurante fica perto do mar?', 's', '_mar_|praia|litoral|beira'],
      ['Ele tinha alguma doença?', 'n', 'doenca|doente|alergia'],
      ['Ele passou fome no passado?', 's', 'fome|faminto|comida|sobreviv']
    ]
  },
  {
    id: 'faroleiro', title: 'O Faroleiro', diff: 2,
    story: 'Numa noite de tempestade, um faroleiro dorme tranquilamente no alto do farol. Quando acorda de manhã, descobre que dezenas de pessoas morreram durante a noite.',
    solution: 'O faroleiro tinha a obrigação de manter a luz do farol acesa durante a noite, mas dormiu sem acendê-la. Um navio, sem enxergar a costa na tempestade, bateu nas rochas e naufragou; vários tripulantes e passageiros morreram.',
    hints: ['O trabalho do faroleiro era muito importante naquela noite.', 'Quem morreu estava no mar.', 'O que um farol precisa estar fazendo à noite?'],
    facts: [
      { t: 'O faroleiro não acendeu a luz do farol', k: 'luz|lampada|acender|acendeu|acesa|apagad|desligad|esqueceu', req: 1 },
      { t: 'Um navio/barco estava no mar', k: 'navio|barco|embarcac|naufrag|marinheiro|tripulac', req: 1 },
      { t: 'O navio bateu nas rochas e naufragou', k: 'pedra|rocha|bateu|colid|encalh|naufrag|batida|costa|recife|afog' }
    ], need: 2,
    qa: [
      ['O faroleiro matou alguém com as próprias mãos?', 'n', 'matou|assassin|mao|maos'],
      ['Foi culpa do faroleiro?', 's', 'culpa|responsa|errou|falha'],
      ['O farol estava quebrado?', 'n', 'farol&quebrad|defeito|estragad|pane'],
      ['As pessoas morreram afogadas?', 's', 'afog'],
      ['Havia um navio ou barco envolvido?', 's', 'navio|barco|embarcacao'],
      ['O faroleiro devia ter feito algo antes de dormir?', 's', 'deveria|devia|obrigac|tarefa|dever|trabalho'],
      ['A luz do farol era importante?', 's', 'luz|farol&import|essencial|serve'],
      ['Foi um terremoto ou tsunami?', 'n', 'terremoto|tsunami|onda_gigante'],
      ['A tempestade teve influência?', 'q', 'tempestade|chuva|vento|clima'],
      ['Ele dormiu de propósito para que as pessoas morressem?', 'n', 'proposito|intencao|querendo|vontade'],
      ['Ele dormiu sem acender a luz?', 's', 'dormiu|dormindo|sono&_sem_|acender|acendeu|luz'],
      ['O faroleiro foi punido?', 'i', 'punid|preso|demitid|castig'],
      ['Era noite?', 's', 'noite|escuro|escuridao'],
      ['As pessoas morreram dentro do farol?', 'n', 'dentro_do_farol|no_farol']
    ]
  },
  {
    id: 'funeral', title: 'O Funeral', diff: 3,
    story: 'Uma mulher vai ao funeral da própria mãe e lá conhece um homem encantador, o homem dos sonhos dela. Mas ela não pega o telefone dele e nunca mais o vê. Alguns dias depois, ela mata a própria irmã.',
    solution: 'A mulher queria muito reencontrar aquele homem e achou que só o veria de novo em outro funeral da família. Para provocar um novo funeral, matou a irmã.',
    hints: ['O crime foi planejado com frieza e por causa de uma paixão.', 'O funeral é a chave.', 'Ela queria reencontrar um homem específico.'],
    facts: [
      { t: 'Ela queria reencontrar o homem do funeral', k: 'reencontr|rever|ver_de_novo|ver_novamente|encontrar_de_novo|encontrar_novamente|voltar_a_ver|outra_vez|apaixon|paixao|amor', req: 1 },
      { t: 'Ele só apareceria de novo em outro funeral', k: 'outro_funeral|novo_funeral|outro_enterro|funeral_da_irma|segundo_funeral|nova_ocasiao|outro_velorio' },
      { t: 'Ela matou a irmã para provocar esse funeral', k: 'irma&mat|assassin|provocar|causar|criar|motivo' }
    ], need: 3,
    qa: [
      ['Ela odiava a irmã?', 'n', 'odi|inveja|rancor|raiva'],
      ['Foi por dinheiro ou herança?', 'n', 'dinheiro|heranca|grana|fortuna'],
      ['O homem do funeral é importante para o crime?', 's', 'homem&import|motivo|razao|causa|relacion'],
      ['Ela queria ver o homem de novo?', 's', 'ver&novo|novamente|outra_vez|reencontr|rever|encontrar'],
      ['O homem era parente delas?', 'n', 'parente|primo|tio|irmao|familia'],
      ['A irmã sabia da intenção dela?', 'n', 'irma&sabia|desconfi'],
      ['Ela matou a irmã por impulso ou raiva?', 'n', 'impulso|raiva|discuss'],
      ['A morte da irmã criaria uma nova ocasião de funeral?', 's', 'funeral|enterro|velorio&outro|novo|nova|criar|causar|provoc|ocasiao'],
      ['O crime foi planejado?', 's', 'planej|premedit'],
      ['Ela estava apaixonada?', 's', 'apaixon|amor|paixao|gostou'],
      ['Ela tem algum problema mental?', 'q', 'mental|louca|psicopata|doente'],
      ['Ela conseguiu reencontrar o homem depois?', 'i', 'conseguiu&reencontr|ver|encontrar'],
      ['A irmã tinha uma doença?', 'n', 'doenca|doente|terminal'],
      ['A mãe delas foi assassinada?', 'n', 'mae&assassin|matou|matar']
    ]
  },
  {
    id: 'beisebol', title: 'A Casa e os Mascarados', diff: 2,
    story: 'Um homem sai de casa e vira à esquerda. Vira à esquerda de novo e mais uma vez à esquerda. Quando está voltando para casa, encontra dois homens de máscara esperando por ele.',
    solution: 'O homem é um jogador de beisebol. Depois de rebater a bola, corre pelas três bases, virando à esquerda a cada uma, até voltar à "casa" (home plate), onde estão o receptor (catcher) e o árbitro — os dois usam máscara de proteção.',
    hints: ['Não há crime nenhum nessa história.', 'Pense num esporte com bola e taco.', 'A "casa" é um ponto do campo.'],
    facts: [
      { t: 'É um jogo de beisebol', k: 'beisebol|baseball|basebol|taco|rebater|rebatedor|batedor|pitcher|arremess', req: 1 },
      { t: 'Ele corre pelas bases até a "casa"', k: 'base|volta|losango|diamante|correr|corrida|home' },
      { t: 'Os mascarados são o receptor e o árbitro', k: 'catcher|receptor|arbitro|juiz|mascara|protec' }
    ], need: 2,
    qa: [
      ['Os homens de máscara eram criminosos?', 'n', 'criminos|bandido|ladrao|assalt'],
      ['É um esporte?', 's', 'esporte|jogo|competic|partida'],
      ['A casa é uma moradia de verdade?', 'n', 'casa&verdade|moradia|real|lar'],
      ['O homem estava correndo?', 's', 'corr'],
      ['Ele corre em círculo ou losango?', 's', 'circulo|losango|quadrado|diamante|volta'],
      ['Ele usava um taco?', 's', 'taco|bastao'],
      ['Há plateia?', 's', 'plateia|publico|torcida|estadio'],
      ['Ele corria perigo?', 'n', 'perigo|risco|ameaca'],
      ['As máscaras servem de proteção?', 's', 'protec|protege|seguranc|proteger'],
      ['É um jogo com bola?', 's', 'bola'],
      ['O local é um campo ou estádio?', 's', 'campo|estadio|arena'],
      ['Aconteceu de madrugada?', 'i', 'madrugada|noite|manha'],
      ['O homem é um jogador profissional?', 'i', 'profissional|amador']
    ]
  }
];
