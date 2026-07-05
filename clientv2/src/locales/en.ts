/**
 * English Translations
 * TODO: Add your game-specific translations
 */

export const en = {
  // Lobby explainer (animated demo)
  explainer: {
    bluffalo: {
      beat1: 'A tricky trivia question appears.',
      beat2: 'Every player writes a believable lie.',
      beat3: 'The real answer is mixed in with the lies.',
      beat4: 'Vote which answer is the real one.',
      beat5: 'Points for the truth — and for successful bluffs.',
    },
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    close: 'Close',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
    ok: 'OK',
    back: 'Back',
    next: 'Next',
    start: 'Start',
    stop: 'Stop',
    retry: 'Retry',
  },

  // Homepage
  home: {
    title: 'Bluffalo',
    createRoom: 'Create Room',
    joinRoom: 'Join Room',
    yourName: 'Your Name',
    roomCode: 'Room Code',
    enterName: 'Enter your name',
    enterRoomCode: 'Enter room code',
    create: 'Create',
    join: 'Join',
    createDescription: 'Start a new game and invite friends',
    joinDescription: 'Join an existing room with a code',
    streamerMode: 'Streamer Mode (hide room code)',
    streamerModeHint: 'Hide room code for streaming',
    bigScreenMode: 'Big Screen Mode (TV — players join on their phones)',
    startBigScreen: 'Start Big Screen',
    howToPlay: 'How to Play',
    tip: 'Tip: Share your room code with friends to play together!',
    multiplayerTip: 'This is a multiplayer game — grab your friends and play together!',
    gameBuddiesBanner: 'Playing via GameBuddies.io',
    multiplayerBadge: '{min}-{max} players',
    step1Title: 'Create a Room',
    step2Title: 'Share the Link',
    step3Title: 'Play Together',
    inviteFirst: 'Invite friends first?',
    copyLink: 'Copy Link',
    linkCopied: 'Copied!',
    whatsapp: 'WhatsApp',
    share: 'Share',
    whatsappText: "Let's play {game}! {url}",
  },

  // Lobby
  lobby: {
    title: 'Lobby',
    waitingForPlayers: 'Waiting for players...',
    players: 'Players',
    chat: 'Chat',
    settings: 'Settings',
    startGame: 'Start Game',
    leaveRoom: 'Leave Room',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied!',
    host: 'Host',
    you: 'You',
    minPlayersRequired: 'Minimum {min} players required',
    shareCode: 'Share Code',
    waitingForHost: 'Waiting for host to start...',
    inviteTitle: 'Invite Your Friends',
    copyInviteLink: 'Copy Invite Link',
    scanToJoin: 'Scan to join on any phone',
    needMorePlayers: 'Need {count} more player(s)',
    shareToInvite: 'Share the link so your friends can join!',
  },

  // Header
  header: {
    room: 'Room:',
    tryAnotherGame: 'Try Another Game',
    tryAnotherGameTitle: 'Return to GameBuddies.io to pick another game',
    streamerMode: 'Streamer Mode',
    copyRoomLink: 'Copy room link',
    copyInviteLink: 'Copy invite link',
  },

  // Video
  video: {
    joinVideo: 'Join Video',
    settingUp: 'Setting up...',
    leaveVideo: 'Leave video chat',
    modal: {
      // Tabs
      tabDevices: 'Devices',
      tabBackground: 'Background',
      tabAudio: 'Audio',
      tabAvatar: 'Avatar',
      // Titles
      titleSetup: 'Join Video Chat',
      titleEdit: 'Video Settings',
      titleSetupMobile: 'Camera Setup',
      titleEditMobile: 'Camera Settings',
      // Preview overlays
      cameraOff: 'Camera Off',
      loadingVirtualBg: 'Loading virtual background...',
      virtualBgActive: 'Virtual BG Active',
      // Devices tab
      camera: 'Camera',
      microphone: 'Microphone',
      noCameras: 'No cameras found',
      noMicrophones: 'No microphones found',
      cameraFallback: 'Camera {id}',
      microphoneFallback: 'Microphone {id}',
      audioLevel: 'Audio Level',
      joinMuted: 'Join Muted',
      joinCameraOff: 'Join with Camera Off',
      // Background tab
      vbBrowserWarning: 'Virtual backgrounds require Chrome 108+ or a browser with Insertable Streams support.',
      enableVirtualBg: 'Enable Virtual Background',
      blur: 'Blur',
      vbInfo: 'Virtual backgrounds use AI-powered segmentation to replace your background in real-time.',
      // Audio tab
      aiNoiseSuppression: 'AI Noise Suppression',
      noiseThreshold: 'Noise Threshold',
      sensitive: 'Sensitive',
      aggressive: 'Aggressive',
      noiseInfo: 'Reduces background noise like keyboard clicks, fans, and ambient sounds during video chat.',
      pushToTalk: 'Push-to-talk',
      pushToTalkInfo: 'Your mic stays muted until you hold the Space bar to talk.',
      // Avatar tab
      faceAvatar: '3D Face Avatar',
      avatarRaccoon: 'Raccoon',
      avatarMetaHuman: 'Human',
      avatarRobot: 'Robot',
      avatarAlien: 'Alien',
      avatarCat: 'Cat',
      soon: 'Soon',
      avatarInfo: 'Your face movements control a 3D avatar using AI-powered face tracking. Your real face is never shown.',
      // Actions
      joinVideoChat: 'Join Video Chat',
      saveSettings: 'Save Settings',
    },
  },

  // Game
  game: {
    round: 'Round',
    score: 'Score',
    yourTurn: 'Your Turn',
    waitingForOthers: 'Waiting for other players...',
    gameOver: 'Game Over!',
    winner: 'Winner',
    playAgain: 'Play Again',
    returnToLobby: 'Return to Lobby',
  },

  // Big Screen (TV / PC / Discord stream mode)
  bigScreen: {
    branding: 'Big Screen · GameBuddies.io',
    joinTheGame: 'Join the game',
    roomCode: 'Room code',
    qrAlt: 'QR code to join room {code}',
    scanWithPhone: 'Scan with your phone',
    playersCount: 'Players ({count}/{max})',
    needMoreToStart: 'Need {count} more to start',
    readyToStart: 'Ready to start',
    waitingForPlayersToJoin: 'Waiting for players to join…',
    startGame: 'Start game',
    waitingForMorePlayers: 'Waiting for {count} more player(s)…',
    bluffsIn: '{count} of {total} bluff(s) in',
    voteBadge: 'Vote · Round {round}/{total}',
    votedCount: '{count} / {total} voted',
    continueReady: 'Continue · {count} / {total} ready',
    byAuthor: 'by {name}',
    noVotes: 'No votes',
    nextRoundReady: 'Next round · {count} / {total} ready',
    thisRound: 'This round',
    foundTruth: 'Found the truth',
    fooledVoter: 'Fooled {name}',
    selfVote: 'Voted for own lie',
    gameOverBadge: 'Game over',
    playAgainReady: 'Play again · {count} / {total} ready',
    champion: 'Champion',
    points: '{n} pts',
    liesFooledTooltip: 'Lies that fooled someone',
    correctGuessesTooltip: 'Correct guesses',
  },

  // Bluffalo-specific
  bluffalo: {
    // Phases
    getReady: 'Get ready...',
    roundOf: 'Round {current} of {total}',
    // Lie input
    writeYourLie: 'Write your lie!',
    liePlaceholder: 'Type a believable fake answer...',
    submitLie: 'Submit Lie',
    lieSubmitted: 'Lie submitted!',
    waitingForLies: 'Waiting for others to write their lies...',
    liesSubmitted: '{count}/{total} submitted',
    charCount: '{count}/{max}',
    // Voting
    whichIsReal: 'Which answer is real?',
    castYourVote: 'Cast Your Vote',
    voteSubmitted: 'Vote cast!',
    waitingForVotes: 'Waiting for votes...',
    votesSubmitted: '{count}/{total} voted',
    // Reveal
    theAnswerIs: 'The answer is...',
    correctAnswer: 'Correct!',
    fooledBy: 'Written by {name}',
    nobodyFooled: 'Nobody was fooled!',
    youFoundTruth: 'You found the truth!',
    youWereFooled: 'You were fooled!',
    youDidNotVote: 'You did not vote.',
    pointsEarned: '+{points}',
    // Score event reasons (server sends structured keys; client translates)
    scoreFoundTruth: 'Found the truth!',
    scoreFooled: 'Fooled {name}!',
    scoreSelfVote: 'Voted for your own lie!',
    // Scores
    roundScores: 'Round Scores',
    nextRound: 'Next Round',
    // Game over
    finalStandings: 'Final Standings',
    champion: 'Champion!',
    liesFooled: 'Lies Fooled',
    correctGuesses: 'Correct Guesses',
    timesDeceived: 'Times Deceived',
    totalScore: 'Total Score',
    // Host settings
    hostSettings: 'Game Settings',
    rounds: 'Rounds',
    lieTime: 'Lie Time',
    voteTime: 'Vote Time',
    revealTime: 'Reveal Time',
    category: 'Category',
    pointsCorrect: 'Points for Correct',
    pointsPerFool: 'Points per Fool',
    seconds: '{n}s',
    lowQuestionWarning: 'Only {count} questions available in this language — extra rounds will be in English.',
    // Categories
    catHistory: 'History',
    catScience: 'Science',
    catGeography: 'Geography',
    catEntertainment: 'Entertainment',
    catSports: 'Sports',
    catFood: 'Food & Drink',
    catWeird: 'Weird Facts',
    catRandom: 'Random (All)',
    // Errors
    lieTooSimilar: 'Your answer is too similar to the real one!',
    lieDuplicate: 'Someone already submitted that answer!',
    yourLie: 'Your lie',
    pts: 'pts',
  },

  // Chat
  chat: {
    typeMessage: 'Type a message...',
    send: 'Send',
    noMessages: 'No messages yet',
    title: 'Chat',
    sayHello: 'Say hello to your teammates!',
    slowDown: 'Slow down...',
    openFull: 'Open full chat',
    closeChat: 'Close chat',
    sendMessage: 'Send message',
  },

  // Kick toast
  kickToast: {
    title: 'Kicked from Room',
    close: 'Close notification',
  },

  // Error boundary
  errorBoundary: {
    title: 'Something went wrong',
    message: "We're sorry, but something unexpected happened.",
    refresh: 'Refresh Page',
    goHome: 'Go Home',
  },

  // Spectator banner
  spectator: {
    viewingAs: 'Viewing as {name}',
    spectating: "You're spectating — click a player to see their view",
    resetView: 'Reset view',
    badge: 'Spectator',
  },

  // Player list
  playerList: {
    kick: 'Kick',
    confirmKick: 'Confirm kick',
    cancel: 'Cancel',
    kickPlayer: 'Kick player',
    premium: 'Premium',
    pro: 'Pro',
  },

  // Streamer broadcast stage
  streamerStage: {
    waitingForPlayers: 'Waiting for players...',
    playersInLobby: '{count} player(s) in lobby',
    gameInProgress: 'Game in progress',
    playersLabel: '{count} players',
    gameOver: 'Game Over!',
    thanksForWatching: 'Thanks for watching',
    phaseWaiting: 'WAITING',
    phasePlaying: 'PLAYING',
    phaseEnded: 'GAME OVER',
    resizeTiles: 'Drag to resize tiles',
  },

  // Video controls
  videoControl: {
    expandVideos: 'Expand videos',
    collapseVideos: 'Collapse videos',
    videosLabel: 'Videos',
    cameraOn: 'Turn on camera',
    cameraOff: 'Turn off camera',
    unmuteMic: 'Unmute microphone',
    muteMic: 'Mute microphone',
    videoSettings: 'Video settings',
    showVideos: 'Click to show videos',
    resizeHint: 'Drag to resize, double-click to collapse',
    noFeeds: 'No video feeds available',
    yourTurn: 'Your Turn',
    connecting: 'Connecting…',
    reactions: 'Reactions',
    pttLive: 'Live',
  },

  // Video enhancements panel
  videoEnhancements: {
    virtualBackground: 'Virtual Background',
    faceAvatar: 'Face Avatar',
    noiseSuppression: 'Noise Suppression',
    on: 'On',
    off: 'Off',
    none: 'None',
    blur: 'Blur',
  },

  // Mobile menus
  menus: {
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    menuTitle: 'Menu',
  },

  // Mobile hamburger menu items + drawer titles
  menu: {
    tapToCopy: 'Tap to copy',
    linkCopied: 'Link copied!',
    streamerMode: 'Streamer Mode',
    chat: 'Chat',
    newMessages: '{count} new messages',
    openChat: 'Open chat',
    players: 'Players',
    videoChat: 'Video Chat',
    videoOn: 'Video On',
    videoOff: 'Video Off',
    tapToToggle: 'Tap to toggle',
    soundSettings: 'Sound Settings',
    howToPlay: 'How to Play',
    settings: 'Settings',
    returnToLobby: 'Return to Lobby',
    resetForAll: 'Reset for all players',
    returnToGameBuddies: 'Return to GameBuddies',
    backToLobby: 'Back to Lobby',
    leaveRoom: 'Leave Room',
  },

  // Game explainer modal
  gameExplainer: {
    closeHowToPlay: 'Close how-to-play',
    tapForFullGuide: 'Tap for full guide',
  },

  // Bluffalo big-screen-only labels
  bluffaloBigScreen: {
    playersVoteContinue: 'Players vote to continue…',
    playersVoteAgain: 'Players vote to play again…',
    countdownGo: 'GO!',
  },

  // In-game feedback / bug report modal
  feedback: {
    menuLabel: 'Report a problem',
    title: 'Report a problem',
    intro: 'Found a bug or have an idea? Tell us — we read every report.',
    typeBug: 'Bug',
    typeIdea: 'Idea',
    typeOther: 'Other',
    messagePlaceholder: 'What happened? The more detail, the better.',
    roomLabel: 'Room',
    stateAttachedNote: 'Your current game state is attached to help us debug.',
    submit: 'Send report',
    sending: 'Sending…',
    successTitle: 'Thanks for the report!',
    successBody: 'It went straight to the GameBuddies team.',
    errorMsg: 'Could not send your report. Please try again.',
    tooShort: 'Please add a little more detail.',
  },

  // Settings
  settings: {
    title: 'Settings',
    general: 'General',
    theme: 'Theme',
    themeDark: 'Dark',
    themeLight: 'Light',
    audio: 'Audio',
    video: 'Video',
    language: 'Language',
    music: 'Music',
    soundEffects: 'Sound Effects',
    backgroundMusic: 'Background Music',
    volume: 'Volume',
    camera: 'Camera',
    microphone: 'Microphone',
    virtualBackground: 'Virtual Background',
    videoDescription: 'Configure your camera and microphone settings.',
  },

  // Invite Modal
  invite: {
    title: "You're Invited!",
    subtitle: 'Enter your name to join the game',
    joinGame: 'Join Game',
  },

  // Errors
  errors: {
    connectionLost: 'Connection lost',
    roomNotFound: 'Room not found',
    roomFull: 'Room is full',
    invalidName: 'Please enter a valid name',
    invalidRoomCode: 'Please enter a valid room code',
  },

  // Reconnect Overlay
  reconnect: {
    title: 'Game Restored',
    playersReconnected: '{connected}/{total} reconnected',
    resumeGame: 'Resume Game',
    waitingForHost: 'Waiting for host to resume...',
  },
  homeMenu: {
    howToPlay: 'How to Play',
    learnTheRules: 'Learn the rules',
    soundAndPreferences: 'Sound & preferences',
  },

  // Platform profile peek card (gb:player:profile)
  playerCard: {
    level: 'Level {level}',
    gabuPoints: 'GabuPoints',
    dailyStreak: 'Daily streak',
    winsInGame: 'Wins in this game',
    achievements: 'Achievements ({count})',
  },

  // Lobby invite panel (GameBuddies friends + QR)
  invitePanel: {
    friendsTitle: 'Invite friends',
    invite: 'Invite',
    sent: 'Sent!',
    failed: 'Failed',
    qr: 'QR code',
  },
};

export type Translations = typeof en;
