/**
 * Brazilian Portuguese Translations
 * Bluffalo - Escreva mentiras convincentes e engane seus amigos!
 */

import type { Translations } from './en';

export const ptBR: Translations = {
  presets: {
    title: 'Configurações salvas',
    namePlaceholder: 'Nome do preset…',
    save: 'Salvar',
    saved: 'Preset salvo.',
    apply: 'Aplicar este preset',
    applied: 'Configurações aplicadas.',
    delete: 'Excluir preset',
    empty: 'Salve suas configurações atuais para reutilizá-las na próxima vez.',
    signInHint: 'Entre na sua conta para salvar suas configurações favoritas.',
    errorDuplicate: 'Você já tem um preset com esse nome.',
    errorLimit: 'Limite atingido (10 presets). Exclua um primeiro.',
    errorNotInLobby: 'Presets só podem ser aplicados no lobby.',
    errorGeneric: 'Algo deu errado. Tente novamente.',
  },
  // Lobby explainer (animated demo)
  explainer: {
    bluffalo: {
      beat1: 'Uma pergunta de trivia aparece.',
      beat2: 'Cada jogador escreve uma mentira convincente.',
      beat3: 'A resposta real e embaralhada com as mentiras.',
      beat4: 'Votem em qual e a verdadeira.',
      beat5: 'Pontos por acertar a verdade — e por enganar os outros.',
    },
  },

  // Common
  common: {
    loading: 'Carregando...',
    error: 'Erro',
    close: 'Fechar',
    save: 'Salvar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    yes: 'Sim',
    no: 'Nao',
    ok: 'OK',
    back: 'Voltar',
    next: 'Proximo',
    start: 'Iniciar',
    stop: 'Parar',
    retry: 'Tentar novamente',
  },

  // Homepage
  home: {
    title: 'Bluffalo',
    createRoom: 'Criar Sala',
    joinRoom: 'Entrar na Sala',
    yourName: 'Seu Nome',
    roomCode: 'Codigo da Sala',
    enterName: 'Digite seu nome',
    enterRoomCode: 'Digite o codigo da sala',
    create: 'Criar',
    join: 'Entrar',
    createDescription: 'Comece um novo jogo e convide amigos',
    joinDescription: 'Entre em uma sala existente com um codigo',
    streamerMode: 'Modo Streamer (ocultar codigo)',
    streamerModeHint: 'Ocultar codigo da sala para transmissao',
    bigScreenMode: 'Modo Tela Grande (TV — jogadores pelo celular)',
    startBigScreen: 'Iniciar Tela Grande',
    howToPlay: 'Como Jogar',
    tip: 'Dica: Compartilhe o codigo da sala com amigos para jogar juntos!',
    multiplayerTip: 'Este e um jogo multiplayer — chame seus amigos e joguem juntos!',
    gameBuddiesBanner: 'Jogando via GameBuddies.io',
    multiplayerBadge: '{min}-{max} jogadores',
    step1Title: 'Criar uma Sala',
    step2Title: 'Compartilhar o Link',
    step3Title: 'Jogar Juntos',
    inviteFirst: 'Convidar amigos primeiro?',
    copyLink: 'Copiar Link',
    linkCopied: 'Copiado!',
    whatsapp: 'WhatsApp',
    share: 'Compartilhar',
    whatsappText: 'Vamos jogar {game}! {url}',
  },

  // Lobby
  lobby: {
    title: 'Sala de Espera',
    waitingForPlayers: 'Aguardando jogadores...',
    players: 'Jogadores',
    chat: 'Chat',
    settings: 'Configuracoes',
    startGame: 'Iniciar Jogo',
    leaveRoom: 'Sair da Sala',
    copyLink: 'Copiar Link',
    linkCopied: 'Link copiado!',
    host: 'Anfitriao',
    you: 'Voce',
    minPlayersRequired: 'Minimo de {min} jogadores necessarios',
    shareCode: 'Compartilhar Codigo',
    waitingForHost: 'Aguardando o anfitriao iniciar...',
    inviteTitle: 'Convide Seus Amigos',
    copyInviteLink: 'Copiar Link de Convite',
    scanToJoin: 'Escaneie para entrar em qualquer celular',
    needMorePlayers: 'Precisa de mais {count} jogador(es)',
    shareToInvite: 'Compartilhe o link para que seus amigos entrem!',
  },

  // Header
  header: {
    room: 'Sala:',
    tryAnotherGame: 'Outro jogo',
    tryAnotherGameTitle: 'Voltar ao GameBuddies.io para escolher outro jogo',
    streamerMode: 'Modo Streamer',
    copyRoomLink: 'Copiar link da sala',
    copyInviteLink: 'Copiar link de convite',
    login: 'Entrar',
    loginTitle: 'Entre ou cadastre-se para salvar seu progresso, GP e premium',
    logout: 'Sair',
    phaseLobby: 'CASO PENDENTE',
    phasePlaying: 'CASO ABERTO',
    phaseEnded: 'CASO ENCERRADO',
  },

  // Video
  video: {
    joinVideo: 'Entrar no video',
    settingUp: 'Configurando...',
    leaveVideo: 'Sair do video chat',
    modal: {
      // Tabs
      tabDevices: 'Dispositivos',
      tabBackground: 'Fundo',
      tabAudio: 'Áudio',
      tabAvatar: 'Avatar',
      // Titles
      titleSetup: 'Entrar no videochat',
      titleEdit: 'Configurações de vídeo',
      titleSetupMobile: 'Configurar câmera',
      titleEditMobile: 'Configurações da câmera',
      // Preview overlays
      cameraOff: 'Câmera desligada',
      loadingVirtualBg: 'Carregando fundo virtual...',
      virtualBgActive: 'Fundo virtual ativo',
      // Devices tab
      camera: 'Câmera',
      microphone: 'Microfone',
      noCameras: 'Nenhuma câmera encontrada',
      noMicrophones: 'Nenhum microfone encontrado',
      cameraFallback: 'Câmera {id}',
      microphoneFallback: 'Microfone {id}',
      audioLevel: 'Nível de áudio',
      joinMuted: 'Entrar sem som',
      joinCameraOff: 'Entrar com a câmera desligada',
      // Background tab
      vbBrowserWarning: 'Os fundos virtuais exigem Chrome 108+ ou um navegador com suporte a Insertable Streams.',
      enableVirtualBg: 'Ativar fundo virtual',
      blur: 'Desfoque',
      vbInfo: 'Os fundos virtuais usam segmentação por IA para substituir seu fundo em tempo real.',
      // Audio tab
      aiNoiseSuppression: 'Supressão de ruído com IA',
      noiseThreshold: 'Limite de ruído',
      sensitive: 'Sensível',
      aggressive: 'Agressivo',
      noiseInfo: 'Reduz ruídos de fundo como teclado, ventilador e sons ambientes durante o videochat.',
      pushToTalk: 'Aperte para falar',
      pushToTalkInfo: 'Seu microfone fica mudo até você segurar a barra de espaço para falar.',
      // Avatar tab
      faceAvatar: 'Avatar facial 3D',
      avatarRaccoon: 'Guaxinim',
      avatarMetaHuman: 'Humano',
      avatarRobot: 'Robô',
      avatarAlien: 'Alien',
      avatarCat: 'Gato',
      soon: 'Em breve',
      avatarInfo: 'Seus movimentos faciais controlam um avatar 3D usando rastreamento facial por IA. Seu rosto real nunca é mostrado.',
      // Actions
      joinVideoChat: 'Entrar no videochat',
      saveSettings: 'Salvar configurações',
    },
  },

  // Game
  game: {
    round: 'Rodada',
    score: 'Pontuacao',
    yourTurn: 'Sua Vez',
    waitingForOthers: 'Aguardando outros jogadores...',
    gameOver: 'Fim de Jogo!',
    winner: 'Vencedor',
    playAgain: 'Jogar Novamente',
    returnToLobby: 'Voltar ao Lobby',
  },

  // Big Screen (TV / PC / Discord stream mode)
  bigScreen: {
    branding: 'Tela Grande · GameBuddies.io',
    joinTheGame: 'Entrar no jogo',
    roomCode: 'Codigo da sala',
    qrAlt: 'Codigo QR para entrar na sala {code}',
    scanWithPhone: 'Escaneie com seu celular',
    playersCount: 'Jogadores ({count}/{max})',
    needMoreToStart: 'Faltam {count} para comecar',
    readyToStart: 'Pronto para comecar',
    waitingForPlayersToJoin: 'Aguardando jogadores entrarem…',
    startGame: 'Iniciar jogo',
    waitingForMorePlayers: 'Aguardando mais {count} jogador(es)…',
    bluffsIn: '{count} de {total} mentira(s) enviada(s)',
    voteBadge: 'Votacao · Rodada {round}/{total}',
    votedCount: '{count} / {total} votaram',
    continueReady: 'Continuar · {count} / {total} prontos',
    byAuthor: 'por {name}',
    noVotes: 'Sem votos',
    nextRoundReady: 'Proxima rodada · {count} / {total} prontos',
    thisRound: 'Esta rodada',
    foundTruth: 'Encontrou a verdade',
    fooledVoter: 'Enganou {name}',
    selfVote: 'Votou na propria mentira',
    gameOverBadge: 'Fim do jogo',
    playAgainReady: 'Jogar de novo · {count} / {total} prontos',
    champion: 'Campeao',
    points: '{n} pts',
    liesFooledTooltip: 'Mentiras que enganaram alguem',
    correctGuessesTooltip: 'Acertos',
  },

  // Bluffalo-specific
  bluffalo: {
    // Phases
    getReady: 'Prepare-se...',
    roundOf: 'Rodada {current} de {total}',
    // Lie input
    writeYourLie: 'Escreva sua mentira!',
    liePlaceholder: 'Digite uma resposta falsa convincente...',
    submitLie: 'Enviar Mentira',
    lieSubmitted: 'Mentira enviada!',
    waitingForLies: 'Aguardando os outros escreverem suas mentiras...',
    liesSubmitted: '{count}/{total} enviadas',
    charCount: '{count}/{max}',
    // Voting
    whichIsReal: 'Qual resposta e a verdadeira?',
    castYourVote: 'Vote Agora',
    voteSubmitted: 'Voto registrado!',
    waitingForVotes: 'Aguardando votos...',
    votesSubmitted: '{count}/{total} votaram',
    // Reveal
    theAnswerIs: 'A resposta e...',
    correctAnswer: 'Correto!',
    fooledBy: 'Escrita por {name}',
    nobodyFooled: 'Ninguem foi enganado!',
    youFoundTruth: 'Voce encontrou a verdade!',
    youWereFooled: 'Voce foi enganado!',
    youDidNotVote: 'Voce nao votou.',
    pointsEarned: '+{points}',
    // Score event reasons (server sends structured keys; client translates)
    scoreFoundTruth: 'Encontrou a verdade!',
    scoreFooled: 'Enganou {name}!',
    scoreSelfVote: 'Votou na propria mentira!',
    // Scores
    roundScores: 'Pontuacao da Rodada',
    nextRound: 'Proxima Rodada',
    // Game over
    finalStandings: 'Classificacao Final',
    champion: 'Campeao!',
    liesFooled: 'Mentiras que Enganaram',
    correctGuesses: 'Respostas Corretas',
    timesDeceived: 'Vezes Enganado',
    totalScore: 'Pontuacao Total',
    // Host settings
    hostSettings: 'Configuracoes do Jogo',
    rounds: 'Rodadas',
    lieTime: 'Tempo para Mentir',
    voteTime: 'Tempo para Votar',
    revealTime: 'Tempo de Revelacao',
    category: 'Categoria',
    pointsCorrect: 'Pontos por Acerto',
    pointsPerFool: 'Pontos por Engano',
    seconds: '{n}s',
    lowQuestionWarning: 'Apenas {count} perguntas disponiveis neste idioma - as rodadas extras serao em ingles.',
    // Categories
    catHistory: 'Historia',
    catScience: 'Ciencia',
    catGeography: 'Geografia',
    catEntertainment: 'Entretenimento',
    catSports: 'Esportes',
    catFood: 'Comida e Bebida',
    catWeird: 'Fatos Estranhos',
    catRandom: 'Aleatorio (Todos)',
    // Errors
    lieTooSimilar: 'Sua resposta e muito parecida com a verdadeira!',
    lieDuplicate: 'Alguem ja enviou essa resposta!',
    yourLie: 'Sua mentira',
    pts: 'pts',
  },

  // QR scan-to-join
  scanQr: {
    button: 'Escanear QR',
    hint: 'Aponte a câmera para o código QR na TV',
    starting: 'Iniciando câmera…',
    permissionDenied: 'Câmera indisponível — tire uma foto do código QR',
    cameraError: 'A câmera parou — tire uma foto do código QR',
    photoButton: 'Tirar uma foto do código QR',
    photoProcessing: 'Lendo a foto…',
    photoFailed: 'Nenhum código QR encontrado — chegue mais perto da tela e tente de novo',
    photoUnreadable: 'Não foi possível ler a foto — tire outra',
    libraryButton: 'Escolher das Fotos',
    joinTitle: 'Código escaneado!',
    joinSubtitle: 'Digite seu nome para entrar na sala {code}',
    joinCta: 'Entrar no jogo',
    notACode: 'Não é um código do GameBuddies',
    close: 'Fechar leitor',
  },

  // Chat
  chat: {
    typeMessage: 'Digite uma mensagem...',
    send: 'Enviar',
    noMessages: 'Nenhuma mensagem ainda',
    // AI-TRANSLATED on 2026-05-19, please review
    title: 'Chat',
    sayHello: 'Diga ola aos seus colegas!',
    slowDown: 'Mais devagar...',
    openFull: 'Abrir chat completo',
    closeChat: 'Fechar chat',
    sendMessage: 'Enviar mensagem',
  },

  // Kick toast
  // AI-TRANSLATED on 2026-05-19, please review
  kickToast: {
    title: 'Expulso da sala',
    close: 'Fechar notificacao',
  },

  // Achievement toast
  achievementToast: {
    unlocked: 'Conquista desbloqueada',
  },

  // Error boundary
  // AI-TRANSLATED on 2026-05-19, please review
  errorBoundary: {
    title: 'O arquivo do caso rasgou',
    message: 'Algo na sala de evidências quebrou.',
    overline: 'Sala de evidências',
    refresh: 'Recarregar pagina',
    goHome: 'Ir para o inicio',
  },

  // Spectator banner
  // AI-TRANSLATED on 2026-05-19, please review
  spectator: {
    viewingAs: 'Visualizando como {name}',
    spectating: 'Voce esta como espectador — clique em um jogador para ver a visao dele',
    resetView: 'Resetar visao',
    badge: 'Espectador',
  },

  // Player list
  // AI-TRANSLATED on 2026-05-19, please review
  playerList: {
    removingIn: 'Removendo em {seconds}s',
    removing: 'Removendo...',
    signInToBuyStyles: 'Entre para comprar estilos com Gabu Points',
    buyStyleInDesigner: "Desbloqueie em 'Seu estilo' com Gabu Points",
    kick: 'Expulsar',
    confirmKick: 'Confirmar expulsao',
    cancel: 'Cancelar',
    kickPlayer: 'Expulsar jogador',
    makeHost: 'Tornar anfitrião',
    confirmMakeHost: 'Confirmar transferência de anfitrião',
    premium: 'Premium',
    pro: 'Pro',
    frameLabel: 'Moldura',
    frameNone: 'Nenhuma',
    previewUnlockHint: 'Só prévia — desbloqueie no designer',
  },

  designer: {
    title: 'Seu estilo',
    cardBackTitle: 'O verso da sua carta',
    classic: 'Nenhum',
    framesTitle: 'Moldura de avatar',
    framesHint: 'contorna seu avatar aqui e no GameBuddies',
    flairsTitle: 'Estilo de nome',
    flairsHint: 'colore seu nome onde quer que você jogue',
    premiumIncluded: 'Premium — tudo está incluído para você.',
    premiumExclusive: 'Exclusivo do Premium — vem com o Premium, não com GP.',
    playerCardCaption: 'Seu cartão de jogador',
    yourGp: 'Seus Gabu Points',
    price: 'Preço',
    afterPurchase: 'Após a compra',
    gpShort: 'Faltam {gp} GP',
    buy: 'Comprar',
    buyQuestion: 'Comprar {name}?',
    buying: 'Comprando…',
    buyFor: 'Comprar · {gp} GP',
    foreverEverywhere: '{name} é seu para sempre — no GameBuddies e em todos os jogos.',
    equipped: 'EQUIPADO',
    premiumTitle: 'Exclusivos Premium',
    cardBackPreviewCaption: 'como sua mão aparece para a mesa',
  },

  // Streamer broadcast stage
  // AI-TRANSLATED on 2026-05-19, please review
  streamerStage: {
    waitingForPlayers: 'Aguardando jogadores...',
    playersInLobby: '{count} jogador(es) no lobby',
    gameInProgress: 'Jogo em andamento',
    playersLabel: '{count} jogadores',
    gameOver: 'Fim de Jogo!',
    thanksForWatching: 'Obrigado por assistir',
    phaseWaiting: 'AGUARDANDO',
    phasePlaying: 'JOGANDO',
    phaseEnded: 'FIM DE JOGO',
    resizeTiles: 'Arraste para redimensionar',
  },

  // Video controls
  // AI-TRANSLATED on 2026-05-19, please review
  videoControl: {
    expandVideos: 'Expandir videos',
    collapseVideos: 'Recolher videos',
    videosLabel: 'Videos',
    cameraOn: 'Ligar camera',
    cameraOff: 'Desligar camera',
    unmuteMic: 'Ativar microfone',
    muteMic: 'Silenciar microfone',
    videoSettings: 'Configuracoes de video',
    showVideos: 'Clique para mostrar videos',
    resizeHint: 'Arraste para redimensionar, clique duplo para recolher',
    noFeeds: 'Sem videos disponiveis',
    yourTurn: 'Sua Vez',
    connecting: 'Conectando…',
    reactions: 'Reações',
    pttLive: 'Ao vivo',
    premiumLockTooltip: 'Desbloqueie com o GameBuddies Premium',
    packSpicy: 'Picante',
    packWholesome: 'Fofo',
  },

  premiumUpsell: {
    getPremium: 'Obter Premium',
    tryTrial: 'Teste o Premium com Pontos Gabu',
  },

  // Video enhancements panel
  // AI-TRANSLATED on 2026-05-19, please review
  videoEnhancements: {
    virtualBackground: 'Fundo Virtual',
    faceAvatar: 'Avatar Facial',
    noiseSuppression: 'Supressao de Ruido',
    on: 'Ligado',
    off: 'Desligado',
    none: 'Nenhum',
    blur: 'Desfoque',
  },

  // Mobile menus
  // AI-TRANSLATED on 2026-05-19, please review
  menus: {
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    menuTitle: 'Menu',
  },

  // Mobile hamburger menu items + drawer titles
  // AI-TRANSLATED on 2026-06-12, please review
  menu: {
    login: 'Entrar / Cadastrar',
    loginSublabel: 'Salve seus GP e premium',
    logout: 'Sair',
    loggedIn: 'Conectado',
    premiumMember: 'Membro premium',
    tapToCopy: 'Toque para copiar',
    linkCopied: 'Link copiado!',
    streamerMode: 'Modo Streamer',
    chat: 'Chat',
    newMessages: '{count} mensagens novas',
    openChat: 'Abrir chat',
    players: 'Jogadores',
    videoChat: 'Videochat',
    videoOn: 'Vídeo ligado',
    videoOff: 'Vídeo desligado',
    tapToToggle: 'Toque para alternar',
    soundSettings: 'Configurações de som',
    howToPlay: 'Como jogar',
    settings: 'Configurações',
    returnToLobby: 'Voltar ao lobby',
    resetForAll: 'Reiniciar para todos',
    returnToGameBuddies: 'Voltar ao GameBuddies',
    backToLobby: 'Voltar ao lobby',
    leaveRoom: 'Sair da sala',
  },

  // Game explainer modal
  // AI-TRANSLATED on 2026-05-19, please review
  gameExplainer: {
    closeHowToPlay: 'Fechar instrucoes',
    tapForFullGuide: 'Toque para o guia completo',
  },

  // Bluffalo big-screen-only labels
  // AI-TRANSLATED on 2026-05-19, please review
  bluffaloBigScreen: {
    playersVoteContinue: 'Jogadores votam para continuar…',
    playersVoteAgain: 'Jogadores votam para jogar de novo…',
    countdownGo: 'VAI!',
  },

  // In-game feedback / bug report modal
  feedback: {
    menuLabel: 'Relatar um problema',
    title: 'Relatar um problema',
    intro: 'Encontrou um bug ou tem uma ideia? Conte pra gente — lemos cada relato.',
    typeBug: 'Bug',
    typeIdea: 'Ideia',
    typeOther: 'Outro',
    messagePlaceholder: 'O que aconteceu? Quanto mais detalhes, melhor.',
    roomLabel: 'Sala',
    stateAttachedNote: 'O estado atual do seu jogo é anexado para ajudar na depuração.',
    submit: 'Enviar relato',
    sending: 'Enviando…',
    successTitle: 'Obrigado pelo relato!',
    successBody: 'Foi direto para a equipe da GameBuddies.',
    errorMsg: 'Não foi possível enviar seu relato. Tente novamente.',
    tooShort: 'Adicione um pouco mais de detalhe, por favor.',
  },

  // Legal
  legal: {
    impressum: 'Impressum',
    privacy: 'Privacidade',
    terms: 'Termos',
    section: 'Legal',
  },

  // In-game login/signup modal (GameAuthModal)
  authModal: {
    titleSignin: 'Entrar',
    titleSignup: 'Criar conta',
    tabSignin: 'Entrar',
    tabSignup: 'Cadastrar',
    benefits: 'Salve seus GP, sequência e premium em todos os jogos GameBuddies',
    email: 'E-mail',
    password: 'Senha',
    confirmPassword: 'Confirmar senha',
    rememberMe: 'Manter conectado',
    consent: 'Tenho 16 anos ou mais e aceito os Termos e a Política de Privacidade',
    submitSignin: 'Entrar',
    submitSignup: 'Cadastrar',
    submitting: 'Aguarde…',
    orEmail: 'ou com e-mail',
    google: 'Continuar com Google',
    discord: 'Continuar com Discord',
    fillAllFields: 'Preencha todos os campos, por favor.',
    passwordMinLength: 'A senha deve ter pelo menos 6 caracteres.',
    passwordsMismatch: 'As senhas não coincidem.',
    consentRequired: 'Confirme idade e termos para continuar.',
    emailAlreadyRegistered: 'Este e-mail já está registrado — faça login.',
    authFailed: 'Falha ao entrar. Tente novamente.',
    popupClosed: 'A janela de login foi fechada antes de concluir.',
    pendingConfirmTitle: 'Verifique seu e-mail',
    pendingConfirmBody: 'Enviamos um link de confirmação. Após confirmar, você entrará automaticamente.',
    successTitle: 'Conectado!',
  },

  // Settings
  settings: {
    title: 'Configuracoes',
    general: 'Geral',
    theme: 'Tema',
    themeDark: 'Escuro',
    themeLight: 'Claro',
    audio: 'Audio',
    video: 'Video',
    language: 'Idioma',
    music: 'Musica',
    soundEffects: 'Efeitos Sonoros',
    backgroundMusic: 'Musica de Fundo',
    volume: 'Volume',
    camera: 'Camera',
    microphone: 'Microfone',
    virtualBackground: 'Fundo Virtual',
    videoDescription: 'Configure suas configuracoes de camera e microfone.',
  },

  // Invite Modal
  invite: {
    title: 'Voce foi convidado!',
    subtitle: 'Digite seu nome para entrar no jogo',
    joinGame: 'Entrar no Jogo',
  },

  // Errors
  errors: {
    connectionLost: 'Conexao perdida',
    roomNotFound: 'Sala nao encontrada',
    roomFull: 'Sala cheia',
    invalidName: 'Por favor, digite um nome valido',
    invalidRoomCode: 'Por favor, digite um codigo de sala valido',
    contentFilterTitle: 'Filtro de conteudo',
    contentFilterBody: 'Bloqueado pelo filtro de conteudo, tente outras palavras.',
    serverRejectedTitle: 'O arquivo foi rejeitado',
  },

  // Reconnect Overlay
  reconnect: {
    frozenTitle: 'INVESTIGAÇÃO INTERROMPIDA',
    frozenBody: 'O arquivo fica lacrado até a linha voltar. Nada do que você anotou se perde.',
    frozenOverline: 'Caso em espera',
    attempt: 'Tentativa {n}',
    retrying: 'Restabelecendo a linha',
    restoredOverline: 'Caso reaberto',
    title: 'Jogo restaurado',
    playersReconnected: '{connected}/{total} reconectados',
    resumeGame: 'Continuar jogo',
    waitingForHost: 'Aguardando o host continuar...',
    reloadPage: 'Recarregar página',
    reload: 'Recarregar',
  },
  homeMenu: {
    howToPlay: 'Como jogar',
    learnTheRules: 'Aprenda as regras',
    soundAndPreferences: 'Som e preferências',
  },

  // Platform profile peek card (gb:player:profile)
  playerCard: {
    level: 'Nível {level}',
    gabuPoints: 'GabuPoints',
    dailyStreak: 'Sequência diária',
    winsInGame: 'Vitórias neste jogo',
    achievements: 'Conquistas ({count})',
  },

  // Lobby invite panel (GameBuddies friends + QR)
  invitePanel: {
    friendsTitle: 'Convidar amigos',
    invite: 'Convidar',
    sent: 'Enviado!',
    failed: 'Falhou',
    qr: 'Código QR',
  },
  installPrompt: {
    title: 'Instalar jogo',
    iosSubtitle: 'Aproveite a experiência em tela cheia!',
    androidSubtitle: 'Adicione à tela inicial para jogar em tela cheia!',
    iosStep1Prefix: 'Toque no',
    iosStep1Suffix: 'botão Compartilhar abaixo',
    iosStep2: 'Role e toque em "Adicionar à Tela de Início"',
    iosStep3: 'Toque em "Adicionar" para instalar',
    installApp: 'Instalar app',
    dontShowAgain: 'Não mostrar novamente',
  },
  portalClose: {
    returningCountdown: 'Voltando ao GameBuddies em {countdown} segundos',
    returningEveryone: 'Levando todos de volta à sala...',
    returningToGameBuddies: 'Voltando ao GameBuddies...',
  },
  loadingScreen: {
    connecting: 'Conectando',
    hint1: 'Prepare-se para jogar!',
    hint2: 'Reúna seus amigos!',
    hint3: 'A diversão está prestes a começar!',
    hint4: 'Carregando uma jogabilidade incrível...',
    hint5: 'Preparando a sala de jogo!',
    hint6: 'Quase lá!',
  },
  heartsGambit: {
    cardValue: 'Valor:',
  },
  gameAd: {
    support: 'Apoie o GameBuddies',
    helpKeepFree: 'Os anúncios mantêm os jogos gratuitos!',
  },
  psDemo: {
    seenByLou: 'VISTO POR LOU',
    arrested: 'PRESO',
    peek: 'ESPIAR',
    correctArrested: '✓ CORRETO — PRESO',
  },
  xp: {
    levelUp: 'SUBIU DE NÍVEL!',
    xpGained: 'XP GANHO',
    victory: 'Vitória',
    played: 'Jogou',
    dismiss: 'Dispensar notificação',
    base: 'Base',
    win: 'Vitória',
    length: 'duração',
    streak: '{count} de sequência',
    firstWin: 'Primeira vitória',
    xpBoost: 'Bônus de XP 2×',
    lv: 'Nv',
    levelsGained: '+{count} níveis!',
  },
  // Admin ↔ player conversation (in-game inbox: header button, panel, toast).
  adminMessage: {
    title: 'Mensagens',
    dialogLabel: 'Mensagens',
    buttonLabel: 'Mensagens',
    unreadTitle: '{count} não lida(s)',
    close: 'Fechar',
    dragHint: 'Arraste para mover',
    newMessageHint: 'Clique para abrir',
    loading: 'Carregando…',
    empty: 'Ainda não há mensagens — mande um oi e a equipe GameBuddies responde.',
    unavailable: 'As mensagens estão indisponíveis no momento. Seu histórico está seguro.',
    retry: 'Tentar de novo',
    fromTeam: 'Equipe GameBuddies',
    you: 'Você',
    replyPlaceholder: 'Escreva uma resposta…',
    firstMessagePlaceholder: 'Escreva sua mensagem…',
    send: 'Enviar',
    sendFailed: 'Não enviado — toque para tentar de novo',
  },
  mute: {
    mute: 'Silenciar',
    unmute: 'Ativar som',
    muteAudio: 'Silenciar áudio do jogo',
    unmuteAudio: 'Ativar áudio do jogo',
  },
  shell: {
    collapseSidebar: 'Recolher barra lateral',
    showSidebar: 'Mostrar barra lateral',
    hideSidebar: 'Ocultar barra lateral',
    showMenu: 'Mostrar menu',
    hideMenu: 'Ocultar menu',
  },
};
