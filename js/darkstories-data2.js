/* ============================================================
   DARK STORIES — complemento do banco
   · DS_ATTRS: a "ficha" de cada história para o questionário padrão
     (temas como morte, animal, noite… → s=Sim n=Não i=Irrelevante q=Em parte)
   · 6 histórias novas (total 16)
   Carregue DEPOIS de darkstories-data.js e textutil.js.
   ============================================================ */
(function () {
  'use strict';
  const S = window.DS_STORIES;

  // ---------- histórias novas ----------
  S.push(
    {
      id: 'sapato', title: 'O Outro Sapato', diff: 1,
      story: 'Um homem chega em casa de madrugada. Tira um sapato e o larga no chão, fazendo barulho. De repente ele se lembra de uma coisa e tira o outro sapato com todo o cuidado, sem fazer ruído. Pouco depois, alguém bate à porta dele, irritado.',
      solution: 'O homem mora num prédio. Ao largar o primeiro sapato, acordou o vizinho de baixo. Lembrando que era tarde, tirou o segundo em silêncio. O vizinho, que ficou esperando o outro sapato cair para poder voltar a dormir, perdeu a paciência e foi bater à porta dele.',
      hints: ['A vizinhança é importante.', 'O barulho do primeiro sapato teve consequência para outra pessoa.', 'Alguém ficou esperando um segundo barulho que nunca veio.'],
      facts: [
        { t: 'Ele mora em prédio, com um vizinho embaixo', k: 'vizinh|predio|apartamento|embaixo|debaixo|andar_de_baixo', req: 1 },
        { t: 'O barulho do sapato acordou o vizinho', k: 'acord|barulho|ruido|som|incomod' },
        { t: 'O vizinho esperava o outro sapato cair', k: 'esper|outro_sapato|segundo_sapato|aguard' }
      ], need: 3,
      qa: [
        ['Alguém se machucou?', 'n', 'machuc|ferid|morr|acidente'],
        ['Quem bateu à porta é um vizinho?', 's', 'vizinh|predio|apartamento'],
        ['O homem estava com raiva?', 'n', 'homem&raiva|bravo|irritad|nervos'],
        ['Quem bateu à porta estava irritado?', 's', 'bateu|batia&raiva|bravo|irritad|furioso'],
        ['O barulho tem a ver com a história?', 's', 'barulho|som|ruido'],
        ['O homem sabia que havia alguém dormindo?', 'q', 'sabia&dormindo|dormir|acordado'],
        ['O sapato é importante?', 's', 'sapato'],
        ['Ele tirou o segundo sapato em silêncio de propósito?', 's', 'proposito|silencio|cuidado|quieto'],
        ['O vizinho estava dormindo antes?', 's', 'vizinho&dormindo|dormir|acordad|sono'],
        ['O vizinho estava esperando alguma coisa?', 's', 'esper|aguard'],
        ['O homem mora numa casa?', 'n', 'casa&mora|moram|morava'],
        ['Era de dia?', 'n', '_dia_|manha|tarde']
      ],
      attrs: 'morte=n assassinato=n suicidio=n acidente=n arma=n veneno=n animal=n sobrenatural=n policia=n dinheiro=n amor=n familia=i noite=s dia=n fechado=s aberto=n agua=n fogo=n veiculo=n tecnologia=n esporte_jogo=n comida=n doenca=n sono=s mentira=n vinganca=n crianca=n velho=i sozinho=q varias_pessoas=s passado=n religiao=n trabalho=n real=s humano=s clima=i'
    },
    {
      id: 'sexta', title: 'A Viagem de Sexta', diff: 1,
      story: 'Um homem chega a cavalo a uma cidade na sexta-feira, fica três dias e vai embora, também a cavalo, na sexta-feira.',
      solution: 'Sexta-feira é o nome do cavalo dele. O homem chegou na cidade “em Sexta-feira” (montado no cavalo), ficou três dias e foi embora do mesmo jeito, de modo que a história não tem nada a ver com o dia da semana.',
      hints: ['Ele não ficou três dias contados de sexta a sexta.', 'Uma palavra da história tem dois sentidos.', 'O cavalo tem um nome.'],
      facts: [{ t: 'Sexta-feira é o nome do cavalo', k: 'cavalo&nome|chama|chamad|batiz|apelido', req: 1 }], need: 1,
      qa: [
        ['O homem está mentindo?', 'n', 'mentindo|mentiu|mentira'],
        ['Tem a ver com o nome de alguém?', 's', 'nome|chama|chamad'],
        ['O cavalo é importante?', 's', 'cavalo'],
        ['O cavalo tem nome?', 's', 'cavalo&nome|chama|chamad'],
        ['O homem ficou mesmo três dias na cidade?', 's', 'tres_dias|ficou'],
        ['Aconteceu algo ruim?', 'n', 'ruim|crime|morr|perigo|problema|tragedia'],
        ['É uma pegadinha de palavras?', 's', 'pegadinha|trocadilho|palavra|jogo_de_palavras|truque'],
        ['Ele viajou de trem ou carro?', 'n', 'trem|carro|aviao|onibus'],
        ['Ele chegou numa sexta-feira de verdade, do calendário?', 'n', 'sexta&verdade|calendario|dia_da_semana|dia_real'],
        ['Tem a ver com o calendário?', 'q', 'calendario|semana|dias']
      ],
      attrs: 'morte=n assassinato=n suicidio=n acidente=n arma=n veneno=n animal=s sobrenatural=n policia=n dinheiro=n amor=n familia=n noite=i dia=i fechado=n aberto=s agua=n fogo=n veiculo=q tecnologia=n esporte_jogo=n comida=n doenca=n sono=n mentira=q vinganca=n crianca=n velho=i sozinho=s varias_pessoas=n passado=n religiao=n trabalho=i real=s humano=s clima=i'
    },
    {
      id: 'gemeas', title: 'Mesmo Dia, Mesma Mãe', diff: 1,
      story: 'Duas irmãs nascem da mesma mãe, no mesmo dia, no mesmo mês e no mesmo ano. Mesmo assim, elas não são gêmeas.',
      solution: 'Elas são trigêmeas (ou mais): nasceram juntas com uma terceira irmã (ou irmão). Quando se fala só “nas duas”, parecem gêmeas, mas fazem parte de um parto de três ou mais bebês.',
      hints: ['Ninguém foi adotado e não há mentira.', 'Pense na quantidade de bebês do parto.', 'Há uma terceira pessoa nesse nascimento.'],
      facts: [{ t: 'Eram trigêmeas: nasceram três (ou mais) bebês no mesmo parto', k: 'trigemeo|trigemea|tres_bebes|tres_irmas|tres_filhos|terceira|quadrigemeo|mais_de_duas|outra_irma|mais_um_bebe|mais_bebes', req: 1 }], need: 1,
      qa: [
        ['Uma das duas foi adotada?', 'n', 'adotad'],
        ['Elas nasceram do mesmo parto?', 's', 'mesmo_parto|parto'],
        ['Existe uma terceira irmã nascida junto?', 's', 'terceira|tres|outra_irma|outro_irmao|mais_um'],
        ['Elas têm pais diferentes?', 'n', 'pais_diferentes|outro_pai|outra_mae|mae_diferente'],
        ['Uma nasceu um dia depois da outra?', 'n', 'um_dia_depois|dia_depois|outro_dia|virada'],
        ['Tem a ver com a quantidade de bebês?', 's', 'quantidade|numero_de_bebes|quantos|bebes'],
        ['Aconteceu algo trágico?', 'n', 'tragic|morr|doente|acidente'],
        ['São gêmeas idênticas?', 'i', 'identica|iguais|parecid'],
        ['Alguém está mentindo?', 'n', 'mentir|mentindo|engan']
      ],
      attrs: 'morte=n assassinato=n suicidio=n acidente=n arma=n veneno=n animal=n sobrenatural=n policia=n dinheiro=n amor=n familia=s noite=i dia=i fechado=i aberto=i agua=n fogo=n veiculo=n tecnologia=n esporte_jogo=n comida=n doenca=n sono=n mentira=n vinganca=n crianca=s velho=n sozinho=n varias_pessoas=s passado=s religiao=n trabalho=n real=s humano=s clima=i'
    },
    {
      id: 'peixes', title: 'Duas Vítimas na Sala', diff: 2,
      story: 'Numa sala de estar, a polícia encontra duas vítimas mortas no chão, ao lado de vidro quebrado e de uma grande poça d\'água. A porta e as janelas estavam trancadas por dentro e ninguém mais entrou na casa.',
      solution: 'As duas “vítimas” eram peixes de aquário. O gato da casa derrubou o aquário da mesa: o vidro quebrou, a água se espalhou e os peixes morreram fora d\'água. Não houve crime nenhum.',
      hints: ['Nem toda vítima é uma pessoa.', 'Elas viviam na água.', 'Algum bicho de estimação derrubou algo.'],
      facts: [
        { t: 'As vítimas eram peixes (de aquário)', k: 'peixe|peixes|aquario|peixinho|peixinhos', req: 1 },
        { t: 'O aquário caiu e quebrou (derrubado por um bicho)', k: 'gato|cachorro|animal|derrub|caiu|quebr|vento|queda' }
      ], need: 2,
      qa: [
        ['As vítimas eram humanas?', 'n', 'humano|pessoa|gente|homem|mulher|crianca'],
        ['As vítimas eram animais?', 's', 'animal|animais|bicho'],
        ['Foi um crime?', 'n', 'crime|assassin|matou|homicid'],
        ['Alguém entrou na sala?', 'n', 'entrou|invadiu|ladrao|invasor'],
        ['O vidro quebrado é importante?', 's', 'vidro&import|relacion|causa|explic'],
        ['A água é importante?', 's', 'agua|poca'],
        ['As vítimas viviam na água?', 's', 'viviam&agua|aquario|peixe'],
        ['Foi um acidente?', 's', 'acidente|sem_querer'],
        ['Um animal causou o acidente?', 's', 'animal&causou|gato|cachorro|derrub'],
        ['Foi veneno?', 'n', 'venen'],
        ['Foi incêndio?', 'n', 'incendi|_fogo|queimad'],
        ['As vítimas eram bichos de estimação?', 's', 'estimacao|domestic|bichinho|pet']
      ],
      attrs: 'morte=s assassinato=n suicidio=n acidente=s arma=n veneno=n animal=s sobrenatural=n policia=s dinheiro=n amor=n familia=n noite=i dia=i fechado=s aberto=n agua=s fogo=n veiculo=n tecnologia=n esporte_jogo=n comida=n doenca=n sono=n mentira=n vinganca=n crianca=n velho=n sozinho=s varias_pessoas=n passado=n religiao=n trabalho=n real=s humano=n clima=i'
    },
    {
      id: 'mergulhador', title: 'O Mergulhador na Floresta', diff: 2,
      story: 'Bombeiros encontram um homem morto no meio de uma floresta recém-queimada, a muitos quilômetros do mar. Ele veste roupa de mergulho completa, com máscara e nadadeiras. Não há lago nem rio por perto.',
      solution: 'O mergulhador estava no mar quando um avião de combate a incêndios, que recolhe água do mar para despejar sobre o fogo, o sugou junto com a água. Ele foi jogado sobre a floresta em chamas.',
      hints: ['Ele não andou até lá: foi levado.', 'Pense em quem combate incêndios usando água.', 'Um avião tem a ver com a história.'],
      facts: [
        { t: 'Um avião (ou helicóptero) de combate a incêndio', k: 'aviao|helicoptero|aeronave', req: 1 },
        { t: 'Ele recolheu a água do mar e levou o mergulhador junto', k: 'sugou|sugad|recolh|agua_do_mar|coletou|encheu|tanque|levou|carregou|junto|pegou' },
        { t: 'Despejou-o sobre a floresta em chamas', k: 'despej|jogou|largou|soltou|caiu|derramou|floresta' }
      ], need: 2,
      qa: [
        ['Ele foi assassinado?', 'n', 'assassin|matou|matar'],
        ['Foi um acidente?', 's', 'acidente|sem_querer'],
        ['Ele estava mergulhando antes?', 's', 'mergulh|_mar_|oceano'],
        ['Ele foi levado por alguma máquina?', 's', 'maquina|aviao|helicoptero|levado|carregado'],
        ['Ele caminhou até a floresta?', 'n', 'caminh|andou|andando|trilha'],
        ['A água é importante?', 's', 'agua'],
        ['Alguém o jogou lá de propósito?', 'n', 'proposito|de_proposito|intencao'],
        ['O incêndio é importante?', 's', 'incendi|_fogo|queimad'],
        ['Ele sabia o que ia acontecer?', 'n', 'sabia|previa|esperava'],
        ['Ele estava num rio ou lago antes?', 'n', '_rio_|lago|piscina'],
        ['Um animal tem a ver com a morte?', 'n', 'animal|bicho']
      ],
      attrs: 'morte=s assassinato=n suicidio=n acidente=s arma=n veneno=n animal=n sobrenatural=n policia=i dinheiro=n amor=n familia=n noite=i dia=i fechado=n aberto=s agua=s fogo=s veiculo=s tecnologia=s esporte_jogo=s comida=n doenca=n sono=n mentira=n vinganca=n crianca=n velho=i sozinho=s varias_pessoas=n passado=n religiao=n trabalho=q real=s humano=s clima=q'
    },
    {
      id: 'drinque', title: 'O Drinque Lento', diff: 2,
      story: 'Dois homens, num bar, pedem ao mesmo tempo o mesmo drinque com gelo. O primeiro bebe tudo muito depressa e sai tranquilo. O segundo toma devagar, durante a conversa — e passa mal e morre.',
      solution: 'O veneno estava nas pedras de gelo. O primeiro homem bebeu rápido, antes de o gelo derreter e soltar o veneno. O segundo bebeu devagar, deixou o gelo derreter e tomou a bebida já envenenada.',
      hints: ['A bebida em si não tinha nada de errado, no começo.', 'A pressa de um salvou a vida dele.', 'Pense no que acontece com o gelo no copo.'],
      facts: [
        { t: 'O veneno estava no gelo', k: 'gelo|pedra_de_gelo|cubo', req: 1 },
        { t: 'O gelo derreteu e soltou o veneno na bebida', k: 'derret|liber|dissolv|misturou|soltou' },
        { t: 'Um bebeu rápido e o outro devagar', k: 'rapido|devagar|pressa|lento|tempo|demor|depressa' }
      ], need: 3,
      qa: [
        ['A bebida tinha veneno desde o início?', 'n', 'bebida|drinque|copo&veneno&desde|inicio|comeco|principio'],
        ['O veneno estava na bebida?', 'q', 'veneno&bebida|copo|drinque'],
        ['Foi um acidente?', 'n', 'acidente|sem_querer'],
        ['O gelo é importante?', 's', 'gelo'],
        ['O tempo é importante?', 's', 'tempo|demora|devagar|rapido|pressa'],
        ['O primeiro homem sabia do veneno?', 'n', 'primeiro&sabia|conhecia'],
        ['A velocidade com que beberam importa?', 's', 'velocidade|depressa|rapido|devagar|lento'],
        ['O gelo derreteu?', 's', 'derret'],
        ['O veneno foi colocado de propósito?', 's', 'proposito|intencao|planej|premedit'],
        ['O garçom serviu bebidas diferentes?', 'n', 'diferente|outra_bebida|mesmo_drinque']
      ],
      attrs: 'morte=s assassinato=s suicidio=n acidente=n arma=n veneno=s animal=n sobrenatural=n policia=i dinheiro=i amor=i familia=i noite=i dia=i fechado=s aberto=n agua=s fogo=n veiculo=n tecnologia=n esporte_jogo=n comida=s doenca=n sono=n mentira=s vinganca=i crianca=n velho=i sozinho=n varias_pessoas=s passado=n religiao=n trabalho=i real=s humano=s clima=i'
    }
  );

  // ---------- ficha (questionário padrão) das histórias originais ----------
  const ATTRS = {
    soluco: 'morte=n assassinato=n suicidio=n acidente=n arma=s veneno=n animal=n sobrenatural=n policia=n dinheiro=n amor=n familia=n noite=i dia=i fechado=s aberto=n agua=s fogo=n veiculo=n tecnologia=n esporte_jogo=n comida=s doenca=q sono=n mentira=q vinganca=n crianca=n velho=i sozinho=n varias_pessoas=n passado=n religiao=n trabalho=s real=s humano=s clima=i',
    'carro-hotel': 'morte=n assassinato=n suicidio=n acidente=n arma=n veneno=n animal=n sobrenatural=n policia=n dinheiro=s amor=n familia=n noite=i dia=i fechado=i aberto=i agua=n fogo=n veiculo=q tecnologia=n esporte_jogo=s comida=n doenca=n sono=n mentira=n vinganca=n crianca=i velho=i sozinho=n varias_pessoas=s passado=n religiao=n trabalho=n real=n humano=s clima=i',
    elevador: 'morte=n assassinato=n suicidio=n acidente=n arma=n veneno=n animal=n sobrenatural=n policia=n dinheiro=n amor=n familia=i noite=i dia=i fechado=s aberto=n agua=n fogo=n veiculo=n tecnologia=q esporte_jogo=n comida=n doenca=n sono=n mentira=n vinganca=n crianca=n velho=n sozinho=s varias_pessoas=n passado=n religiao=n trabalho=s real=s humano=s clima=s',
    palito: 'morte=s assassinato=n suicidio=n acidente=q arma=n veneno=n animal=n sobrenatural=n policia=n dinheiro=n amor=n familia=n noite=i dia=i fechado=n aberto=s agua=n fogo=n veiculo=s tecnologia=q esporte_jogo=q comida=n doenca=n sono=n mentira=n vinganca=n crianca=n velho=i sozinho=n varias_pessoas=s passado=n religiao=n trabalho=n real=s humano=s clima=i',
    mochila: 'morte=s assassinato=n suicidio=n acidente=s arma=n veneno=n animal=n sobrenatural=n policia=i dinheiro=n amor=n familia=n noite=i dia=i fechado=n aberto=s agua=n fogo=n veiculo=s tecnologia=s esporte_jogo=s comida=n doenca=n sono=n mentira=n vinganca=n crianca=n velho=i sozinho=s varias_pessoas=n passado=n religiao=n trabalho=i real=s humano=s clima=i',
    'arma-gelo': 'morte=s assassinato=s suicidio=n acidente=n arma=s veneno=n animal=n sobrenatural=n policia=s dinheiro=i amor=i familia=i noite=i dia=i fechado=s aberto=n agua=s fogo=n veiculo=n tecnologia=n esporte_jogo=n comida=n doenca=n sono=n mentira=q vinganca=i crianca=n velho=i sozinho=n varias_pessoas=n passado=n religiao=n trabalho=i real=s humano=s clima=q',
    albatroz: 'morte=s assassinato=n suicidio=n acidente=q arma=n veneno=n animal=s sobrenatural=n policia=n dinheiro=n amor=s familia=s noite=i dia=i fechado=i aberto=i agua=s fogo=n veiculo=s tecnologia=n esporte_jogo=n comida=s doenca=n sono=n mentira=s vinganca=n crianca=n velho=i sozinho=n varias_pessoas=s passado=s religiao=n trabalho=n real=s humano=s clima=i',
    faroleiro: 'morte=s assassinato=n suicidio=n acidente=s arma=n veneno=n animal=n sobrenatural=n policia=n dinheiro=n amor=n familia=n noite=s dia=n fechado=i aberto=s agua=s fogo=n veiculo=s tecnologia=s esporte_jogo=n comida=n doenca=n sono=s mentira=n vinganca=n crianca=i velho=i sozinho=s varias_pessoas=s passado=n religiao=n trabalho=s real=s humano=s clima=s',
    funeral: 'morte=s assassinato=s suicidio=n acidente=n arma=i veneno=i animal=n sobrenatural=n policia=i dinheiro=n amor=s familia=s noite=i dia=i fechado=i aberto=i agua=n fogo=n veiculo=n tecnologia=n esporte_jogo=n comida=n doenca=n sono=n mentira=q vinganca=n crianca=n velho=i sozinho=n varias_pessoas=s passado=n religiao=s trabalho=n real=s humano=s clima=i',
    beisebol: 'morte=n assassinato=n suicidio=n acidente=n arma=n veneno=n animal=n sobrenatural=n policia=n dinheiro=i amor=n familia=n noite=i dia=i fechado=n aberto=s agua=n fogo=n veiculo=n tecnologia=n esporte_jogo=s comida=n doenca=n sono=n mentira=n vinganca=n crianca=n velho=i sozinho=n varias_pessoas=s passado=n religiao=n trabalho=i real=s humano=s clima=i'
  };
  S.forEach(st => { if (ATTRS[st.id]) st.attrs = window.TextUtil.parseAttrs(ATTRS[st.id]); else if (typeof st.attrs === 'string') st.attrs = window.TextUtil.parseAttrs(st.attrs); });
})();
