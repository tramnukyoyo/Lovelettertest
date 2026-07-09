import type { Translations } from './en';

export const zhHant: Translations = {
  // Lobby explainer (animated demo)
  explainer: {
    bluffalo: {
      beat1: '出現一道刁鑽的冷知識問題。',
      beat2: '每位玩家寫下一個以假亂真的謊言。',
      beat3: '真正的答案會混在謊言之中。',
      beat4: '投票選出哪個才是真正的答案。',
      beat5: '猜中真相得分，成功騙人也得分。',
    },
  },

  // Common
  common: {
    loading: '載入中…',
    error: '錯誤',
    close: '關閉',
    save: '儲存',
    cancel: '取消',
    confirm: '確認',
    yes: '是',
    no: '否',
    ok: '好',
    back: '返回',
    next: '下一步',
    start: '開始',
    stop: '停止',
    retry: '重試',
  },

  // Homepage
  home: {
    title: 'Bluffalo',
    createRoom: '建立房間',
    joinRoom: '加入房間',
    yourName: '你的名字',
    roomCode: '房間代碼',
    enterName: '輸入你的名字',
    enterRoomCode: '輸入房間代碼',
    create: '建立',
    join: '加入',
    createDescription: '開一場新遊戲並邀請好友',
    joinDescription: '用代碼加入現有房間',
    streamerMode: '實況模式（隱藏房間代碼）',
    streamerModeHint: '直播時隱藏房間代碼',
    bigScreenMode: '大螢幕模式（電視 — 玩家用手機加入）',
    startBigScreen: '開始大螢幕',
    howToPlay: '怎麼玩',
    tip: '小提示：把房間代碼分享給好友一起玩！',
    multiplayerTip: '這是多人遊戲 — 揪上好友一起玩吧！',
    gameBuddiesBanner: '透過 GameBuddies.io 遊玩',
    multiplayerBadge: '{min}-{max} 位玩家',
    step1Title: '建立房間',
    step2Title: '分享連結',
    step3Title: '一起遊玩',
    inviteFirst: '要先邀請好友嗎？',
    copyLink: '複製連結',
    linkCopied: '已複製！',
    whatsapp: 'WhatsApp',
    share: '分享',
    whatsappText: '一起來玩 {game} 吧！{url}',
  },

  // Lobby
  lobby: {
    title: '大廳',
    waitingForPlayers: '等待玩家加入…',
    players: '玩家',
    chat: '聊天',
    settings: '設定',
    startGame: '開始遊戲',
    leaveRoom: '離開房間',
    copyLink: '複製連結',
    linkCopied: '連結已複製！',
    host: '房主',
    you: '你',
    minPlayersRequired: '至少需要 {min} 位玩家',
    shareCode: '分享代碼',
    waitingForHost: '等待房主開始…',
    inviteTitle: '邀請你的好友',
    copyInviteLink: '複製邀請連結',
    scanToJoin: '掃描即可用任何手機加入',
    needMorePlayers: '還需要 {count} 位玩家',
    shareToInvite: '分享連結讓好友加入吧！',
  },

  // Header
  header: {
    room: '房間：',
    tryAnotherGame: '玩別款遊戲',
    tryAnotherGameTitle: '回到 GameBuddies.io 挑選另一款遊戲',
    streamerMode: '實況模式',
    copyRoomLink: '複製房間連結',
    copyInviteLink: '複製邀請連結',
    login: '登入',
    loginTitle: '登入或註冊以保存你的進度、GP 和高級會員資格',
    logout: '登出',
  },

  // Video
  video: {
    joinVideo: '加入視訊',
    settingUp: '設定中…',
    leaveVideo: '離開視訊聊天',
    modal: {
      // Tabs
      tabDevices: '裝置',
      tabBackground: '背景',
      tabAudio: '音訊',
      tabAvatar: '虛擬角色',
      // Titles
      titleSetup: '加入視訊聊天',
      titleEdit: '視訊設定',
      titleSetupMobile: '相機設定',
      titleEditMobile: '相機設定',
      // Preview overlays
      cameraOff: '相機關閉',
      loadingVirtualBg: '載入虛擬背景中…',
      virtualBgActive: '虛擬背景已啟用',
      // Devices tab
      camera: '相機',
      microphone: '麥克風',
      noCameras: '找不到相機',
      noMicrophones: '找不到麥克風',
      cameraFallback: '相機 {id}',
      microphoneFallback: '麥克風 {id}',
      audioLevel: '音量大小',
      joinMuted: '靜音加入',
      joinCameraOff: '關閉相機加入',
      // Background tab
      vbBrowserWarning: '虛擬背景需要 Chrome 108 以上，或支援 Insertable Streams 的瀏覽器。',
      enableVirtualBg: '啟用虛擬背景',
      blur: '模糊',
      vbInfo: '虛擬背景運用 AI 影像分割技術，即時替換你的背景。',
      // Audio tab
      aiNoiseSuppression: 'AI 降噪',
      noiseThreshold: '噪音門檻',
      sensitive: '靈敏',
      aggressive: '強力',
      noiseInfo: '在視訊聊天時降低背景噪音，例如鍵盤聲、風扇聲與環境音。',
      pushToTalk: '按鍵說話',
      pushToTalkInfo: '麥克風會保持靜音，按住空白鍵才會發話。',
      // Avatar tab
      faceAvatar: '3D 臉部虛擬角色',
      avatarRaccoon: '浣熊',
      avatarMetaHuman: '人類',
      avatarRobot: '機器人',
      avatarAlien: '外星人',
      avatarCat: '貓咪',
      soon: '即將推出',
      avatarInfo: '你的臉部動作會透過 AI 臉部追蹤操控 3D 虛擬角色，絕不會顯示你的真實臉孔。',
      // Actions
      joinVideoChat: '加入視訊聊天',
      saveSettings: '儲存設定',
    },
  },

  // Game
  game: {
    round: '回合',
    score: '分數',
    yourTurn: '輪到你了',
    waitingForOthers: '等待其他玩家…',
    gameOver: '遊戲結束！',
    winner: '贏家',
    playAgain: '再玩一次',
    returnToLobby: '回到大廳',
  },

  // Big Screen (TV / PC / Discord stream mode)
  bigScreen: {
    branding: '大螢幕 · GameBuddies.io',
    joinTheGame: '加入遊戲',
    roomCode: '房間代碼',
    qrAlt: '加入房間 {code} 的 QR 碼',
    scanWithPhone: '用你的手機掃描',
    playersCount: '玩家（{count}/{max}）',
    needMoreToStart: '還需要 {count} 位才能開始',
    readyToStart: '準備就緒，可以開始',
    waitingForPlayersToJoin: '等待玩家加入…',
    startGame: '開始遊戲',
    waitingForMorePlayers: '還在等 {count} 位玩家…',
    bluffsIn: '{count} / {total} 個謊言已交出',
    voteBadge: '投票 · 第 {round}/{total} 回合',
    votedCount: '{count} / {total} 已投票',
    continueReady: '繼續 · {count} / {total} 已準備',
    byAuthor: '作者：{name}',
    noVotes: '沒有人投票',
    nextRoundReady: '下一回合 · {count} / {total} 已準備',
    thisRound: '本回合',
    foundTruth: '找到了真相',
    fooledVoter: '騙過了 {name}',
    selfVote: '投給了自己的謊言',
    gameOverBadge: '遊戲結束',
    playAgainReady: '再玩一次 · {count} / {total} 已準備',
    champion: '冠軍',
    points: '{n} 點',
    liesFooledTooltip: '騙到別人的謊言',
    correctGuessesTooltip: '猜對的次數',
  },

  // Bluffalo-specific
  bluffalo: {
    // Phases
    getReady: '準備好…',
    roundOf: '第 {current} / {total} 回合',
    // Lie input
    writeYourLie: '寫下你的謊言！',
    liePlaceholder: '輸入一個以假亂真的假答案…',
    submitLie: '送出謊言',
    lieSubmitted: '謊言已送出！',
    waitingForLies: '等待其他人寫下謊言…',
    liesSubmitted: '{count}/{total} 已送出',
    charCount: '{count}/{max}',
    // Voting
    whichIsReal: '哪個答案是真的？',
    castYourVote: '投下你的一票',
    voteSubmitted: '已投票！',
    waitingForVotes: '等待投票…',
    votesSubmitted: '{count}/{total} 已投票',
    // Reveal
    theAnswerIs: '答案是…',
    correctAnswer: '答對了！',
    fooledBy: '作者：{name}',
    nobodyFooled: '沒有人被騙到！',
    youFoundTruth: '你找到了真相！',
    youWereFooled: '你被騙了！',
    youDidNotVote: '你沒有投票。',
    pointsEarned: '+{points}',
    // Score event reasons (server sends structured keys; client translates)
    scoreFoundTruth: '找到了真相！',
    scoreFooled: '騙過了 {name}！',
    scoreSelfVote: '投給了自己的謊言！',
    // Scores
    roundScores: '回合分數',
    nextRound: '下一回合',
    // Game over
    finalStandings: '最終排名',
    champion: '冠軍！',
    liesFooled: '騙到人的謊言',
    correctGuesses: '猜對次數',
    timesDeceived: '被騙次數',
    totalScore: '總分',
    // Host settings
    hostSettings: '遊戲設定',
    rounds: '回合數',
    lieTime: '說謊時間',
    voteTime: '投票時間',
    revealTime: '揭曉時間',
    category: '類別',
    pointsCorrect: '答對得分',
    pointsPerFool: '每騙一人得分',
    seconds: '{n} 秒',
    lowQuestionWarning: '此語言只有 {count} 道題目 — 多出來的回合將使用英文。',
    // Categories
    catHistory: '歷史',
    catScience: '科學',
    catGeography: '地理',
    catEntertainment: '娛樂',
    catSports: '運動',
    catFood: '美食與飲品',
    catWeird: '冷知識',
    catRandom: '隨機（全部）',
    // Errors
    lieTooSimilar: '你的答案和正確答案太像了！',
    lieDuplicate: '已經有人送出這個答案了！',
    yourLie: '你的謊言',
    pts: '點',
  },

  // Chat
  chat: {
    typeMessage: '輸入訊息…',
    send: '送出',
    noMessages: '還沒有訊息',
    title: '聊天',
    sayHello: '跟隊友打聲招呼吧！',
    slowDown: '慢一點…',
    openFull: '開啟完整聊天',
    closeChat: '關閉聊天',
    sendMessage: '送出訊息',
  },

  // Kick toast
  kickToast: {
    title: '已被踢出房間',
    close: '關閉通知',
  },

  // Error boundary
  errorBoundary: {
    title: '發生了一些問題',
    message: '很抱歉，發生了預期之外的錯誤。',
    refresh: '重新整理頁面',
    goHome: '回到首頁',
  },

  // Spectator banner
  spectator: {
    viewingAs: '以 {name} 的視角觀看',
    spectating: '你正在觀戰 — 點選玩家即可看到他的視角',
    resetView: '重設視角',
    badge: '觀眾',
  },

  // Player list
  playerList: {
    removingIn: '{seconds} 秒後移除',
    removing: '移除中...',
    kick: '踢出',
    confirmKick: '確認踢出',
    cancel: '取消',
    kickPlayer: '踢出玩家',
    makeHost: '設為房主',
    confirmMakeHost: '確認移交房主',
    premium: 'Premium',
    pro: 'Pro',
    gameSkinLabel: '牌背造型',
    gameSkinSameAsCardStyle: '與卡牌樣式相同',
    gameSkinNone: '無',
    gameSkinNeon: '霓虹',
    gameSkinGold: '黃金',
    gameSkinHolo: '全息',
    gameSkinInk: '墨韻',
    gameSkinPreviewCaption: '預覽',
  },

  // Streamer broadcast stage
  streamerStage: {
    waitingForPlayers: '等待玩家加入…',
    playersInLobby: '大廳中有 {count} 位玩家',
    gameInProgress: '遊戲進行中',
    playersLabel: '{count} 位玩家',
    gameOver: '遊戲結束！',
    thanksForWatching: '感謝觀看',
    phaseWaiting: '等待中',
    phasePlaying: '遊戲中',
    phaseEnded: '遊戲結束',
    resizeTiles: '拖曳以調整方塊大小',
  },

  // Video controls
  videoControl: {
    expandVideos: '展開視訊',
    collapseVideos: '收合視訊',
    videosLabel: '視訊',
    cameraOn: '開啟相機',
    cameraOff: '關閉相機',
    unmuteMic: '取消靜音麥克風',
    muteMic: '靜音麥克風',
    videoSettings: '視訊設定',
    showVideos: '點選以顯示視訊',
    resizeHint: '拖曳調整大小，雙擊收合',
    noFeeds: '沒有可用的視訊畫面',
    yourTurn: '輪到你了',
    connecting: '連線中…',
    reactions: '表情反應',
    pttLive: '即時',
    premiumLockTooltip: '訂閱 GameBuddies Premium 解鎖',
    packSpicy: '辛辣',
    packWholesome: '暖心',
  },

  // Video enhancements panel
  videoEnhancements: {
    virtualBackground: '虛擬背景',
    faceAvatar: '臉部虛擬角色',
    noiseSuppression: '降噪',
    on: '開啟',
    off: '關閉',
    none: '無',
    blur: '模糊',
  },

  // Mobile menus
  menus: {
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
    menuTitle: '選單',
  },

  // Mobile hamburger menu items + drawer titles
  menu: {
    login: '登入／註冊',
    loginSublabel: '保存你的 GP 和高級會員資格',
    logout: '登出',
    loggedIn: '已登入',
    premiumMember: '高級會員',
    tapToCopy: '點一下即可複製',
    linkCopied: '連結已複製！',
    streamerMode: '實況模式',
    chat: '聊天',
    newMessages: '{count} 則新訊息',
    openChat: '開啟聊天',
    players: '玩家',
    videoChat: '視訊聊天',
    videoOn: '視訊開啟',
    videoOff: '視訊關閉',
    tapToToggle: '點一下即可切換',
    soundSettings: '音效設定',
    howToPlay: '怎麼玩',
    settings: '設定',
    returnToLobby: '回到大廳',
    resetForAll: '為所有玩家重設',
    returnToGameBuddies: '回到 GameBuddies',
    backToLobby: '返回大廳',
    leaveRoom: '離開房間',
  },

  // Game explainer modal
  gameExplainer: {
    closeHowToPlay: '關閉玩法說明',
    tapForFullGuide: '點一下看完整說明',
  },

  // Bluffalo big-screen-only labels
  bluffaloBigScreen: {
    playersVoteContinue: '玩家投票決定是否繼續…',
    playersVoteAgain: '玩家投票決定是否再玩一次…',
    countdownGo: '開始！',
  },

  // Settings
  settings: {
    title: '設定',
    general: '一般',
    theme: '主題',
    themeDark: '深色',
    themeLight: '淺色',
    audio: '音訊',
    video: '視訊',
    language: '語言',
    music: '音樂',
    soundEffects: '音效',
    backgroundMusic: '背景音樂',
    volume: '音量',
    camera: '相機',
    microphone: '麥克風',
    virtualBackground: '虛擬背景',
    videoDescription: '設定你的相機與麥克風。',
  },

  // Invite Modal
  invite: {
    title: '你被邀請了！',
    subtitle: '輸入你的名字以加入遊戲',
    joinGame: '加入遊戲',
  },

  // Errors
  errors: {
    connectionLost: '連線中斷',
    roomNotFound: '找不到房間',
    roomFull: '房間已滿',
    invalidName: '請輸入有效的名字',
    invalidRoomCode: '請輸入有效的房間代碼',
  },

  // Reconnect Overlay
  reconnect: {
    title: '遊戲已復原',
    playersReconnected: '{connected}/{total} 已重新連線',
    resumeGame: '繼續遊戲',
    waitingForHost: '等待房主繼續…',
    reloadPage: '重新載入頁面',
    reload: '重新載入',
  },
  homeMenu: {
    howToPlay: '怎麼玩',
    learnTheRules: '了解規則',
    soundAndPreferences: '音效與偏好設定',
  },
  installPrompt: {
    title: '安裝遊戲',
    iosSubtitle: '享受全螢幕體驗！',
    androidSubtitle: '加入主畫面享受全螢幕遊玩！',
    iosStep1Prefix: '點擊',
    iosStep1Suffix: '下方的分享按鈕',
    iosStep2: '捲動並點擊「加入主畫面」',
    iosStep3: '點擊「加入」完成安裝',
    installApp: '安裝應用程式',
    dontShowAgain: '不要再顯示',
  },
  portalClose: {
    returningCountdown: '{countdown} 秒後返回 GameBuddies',
    returningEveryone: '正在將所有人帶回大廳...',
    returningToGameBuddies: '正在返回 GameBuddies...',
  },
  loadingScreen: {
    connecting: '連線中',
    hint1: '準備開始遊玩！',
    hint2: '揪你的朋友一起來！',
    hint3: '樂趣即將展開！',
    hint4: '正在載入精彩玩法...',
    hint5: '正在準備遊戲房間！',
    hint6: '快好了！',
  },
  heartsGambit: {
    cardValue: '數值：',
  },
  gameAd: {
    support: '支持 GameBuddies',
    helpKeepFree: '廣告讓遊戲保持免費！',
  },
  psDemo: {
    seenByLou: 'LOU 已看過',
    arrested: '已逮捕',
    peek: '偷看',
    correctArrested: '✓ 正確 — 已逮捕',
  },
  xp: {
    levelUp: '升級了！',
    xpGained: '獲得經驗值',
    victory: '🏆 勝利',
    played: '💪 已遊玩',
    dismiss: '關閉通知',
    base: '基礎',
    win: '勝利',
    length: '時長',
    streak: '連勝 {count}',
    firstWin: '首勝',
    xpBoost: '2× 經驗值加成',
    lv: '等級',
    levelsGained: '+{count} 級！',
  },
  adminMessage: {
    title: '來自 GameBuddies 的訊息',
    replySent: '回覆已送出 ✓',
    replyPlaceholder: '回覆 GameBuddies…',
    sendReply: '送出回覆',
  },
  mute: {
    mute: '靜音',
    unmute: '取消靜音',
    muteAudio: '將遊戲音訊靜音',
    unmuteAudio: '取消遊戲音訊靜音',
  },
  shell: {
    collapseSidebar: '收合側邊欄',
    showSidebar: '顯示側邊欄',
    hideSidebar: '隱藏側邊欄',
  },

  // QR join scanner
  scanQr: {
    button: '掃描 QR Code',
    hint: '將相機對準電視上的 QR Code',
    starting: '正在啟動相機…',
    permissionDenied: '無法使用相機——請改為拍下 QR Code 的照片',
    cameraError: '相機停止運作——請改為拍下 QR Code 的照片',
    photoButton: '拍下 QR Code 的照片',
    photoProcessing: '正在讀取照片…',
    photoFailed: '找不到 QR Code——請靠近螢幕一點再試一次',
    photoUnreadable: '無法讀取這張照片——請重新拍攝',
    libraryButton: '從照片圖庫選擇',
    joinTitle: '掃描成功！',
    joinSubtitle: '輸入你的名字加入房間 {code}',
    joinCta: '加入遊戲',
    notACode: '這不是 GameBuddies 代碼',
    close: '關閉掃描器',
  },

  // Problem / idea report modal
  feedback: {
    menuLabel: '回報問題',
    title: '回報問題',
    intro: '發現錯誤或有想法嗎？告訴我們——每一則回報我們都會看。',
    typeBug: '錯誤',
    typeIdea: '點子',
    typeOther: '其他',
    messagePlaceholder: '發生了什麼事？越詳細越好。',
    roomLabel: '房間',
    stateAttachedNote: '會附上你目前的遊戲狀態，幫助我們除錯。',
    submit: '送出回報',
    sending: '傳送中…',
    successTitle: '感謝你的回報！',
    successBody: '已直接送達 GameBuddies 團隊。',
    errorMsg: '無法送出回報，請再試一次。',
    tooShort: '請再多補充一些細節。',
  },

  // Legal
  legal: {
    impressum: 'Impressum',
    privacy: '隱私權政策',
    terms: '服務條款',
    section: '法律資訊',
  },

  // In-game login/signup modal (GameAuthModal)
  authModal: {
    titleSignin: '登入',
    titleSignup: '建立帳號',
    tabSignin: '登入',
    tabSignup: '註冊',
    benefits: '在所有 GameBuddies 遊戲中保存你的 GP、連勝紀錄和高級會員資格',
    email: '電子郵件',
    password: '密碼',
    confirmPassword: '確認密碼',
    rememberMe: '保持登入',
    consent: '我已年滿 16 歲，並接受服務條款與隱私權政策',
    submitSignin: '登入',
    submitSignup: '註冊',
    submitting: '請稍候…',
    orEmail: '或使用電子郵件',
    google: '使用 Google 繼續',
    discord: '使用 Discord 繼續',
    fillAllFields: '請填寫所有欄位。',
    passwordMinLength: '密碼至少需要 6 個字元。',
    passwordsMismatch: '兩次輸入的密碼不一致。',
    consentRequired: '請先確認年齡並接受條款。',
    emailAlreadyRegistered: '這個電子郵件已經註冊過——請改用登入。',
    authFailed: '登入失敗，請再試一次。',
    popupClosed: '登入視窗在完成前被關閉了。',
    pendingConfirmTitle: '請查看你的電子郵件',
    pendingConfirmBody: '我們已寄出確認連結。確認後你將自動登入。',
    successTitle: '登入成功！',
  },

  // Platform profile peek card (gb:player:profile)
  playerCard: {
    level: '等級 {level}',
    gabuPoints: 'GabuPoints',
    dailyStreak: '每日連續登入',
    winsInGame: '本遊戲勝場',
    achievements: '成就（{count}）',
  },

  // Lobby invite panel (GameBuddies friends + QR)
  invitePanel: {
    friendsTitle: '邀請好友',
    invite: '邀請',
    sent: '已送出！',
    failed: '失敗',
    qr: 'QR Code',
  },
};
