/**
 * Brazilian Portuguese Translations
 * Bluffalo - Escreva mentiras convincentes e engane seus amigos!
 */

import type { Translations } from './en';

export const ptBR: Translations = {
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

  // Error boundary
  // AI-TRANSLATED on 2026-05-19, please review
  errorBoundary: {
    title: 'Algo deu errado',
    message: 'Desculpe, mas algo inesperado aconteceu.',
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
    kick: 'Expulsar',
    confirmKick: 'Confirmar expulsao',
    cancel: 'Cancelar',
    kickPlayer: 'Expulsar jogador',
    premium: 'Premium',
    pro: 'Pro',
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
  },

  // Reconnect Overlay
  reconnect: {
    title: 'Jogo restaurado',
    playersReconnected: '{connected}/{total} reconectados',
    resumeGame: 'Continuar jogo',
    waitingForHost: 'Aguardando o host continuar...',
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
};
