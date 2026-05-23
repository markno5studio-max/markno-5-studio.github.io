/* ============================================================
   SITE VERSION
============================================================ */

const SITE_VERSION = '2026.05.23.08';

/* ============================================================
   STORAGE KEY
============================================================ */

var KEY = 'MK5_DATA'; // 固定 key，不隨版本改變，避免資料遺失

/* ============================================================
   CLOUD SYNC CONFIG（雲端同步，存於管理員裝置的 localStorage）
============================================================ */
var CLOUD = (function() {
  try {
    var s = localStorage.getItem('MK5_CLOUD');
    return s ? Object.assign({ token:'', owner:'', repo:'', branch:'main' }, JSON.parse(s))
             : { token:'', owner:'', repo:'', branch:'main' };
  } catch(e) { return { token:'', owner:'', repo:'', branch:'main' }; }
})();

/* ============================================================
   FORCE CLEAR OLD CACHE
============================================================ */

(async function () {

  const CACHE_KEY = 'MK5_SITE_VERSION';
  const savedVersion = localStorage.getItem(CACHE_KEY);

  if (savedVersion !== SITE_VERSION) {

    console.log('偵測到新版本 ' + SITE_VERSION + '，更新瀏覽器快取...');

    // ✅ 只清除瀏覽器快取（Cache Storage、Service Worker）
    // ✅ 不清除 localStorage 資料（MK5_DATA），避免用戶設定遺失

    // 清除 Cache Storage
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }

    // 清除 Service Worker
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
      }
    }

    // 儲存新版本號
    localStorage.setItem(CACHE_KEY, SITE_VERSION);

    // 強制重新載入（清除 HTTP 快取）
    const url = new URL(window.location.href);
    url.searchParams.set('_mk5v', SITE_VERSION);
    window.location.replace(url.toString());

  }

})();

var EDITOR_KEYS = {
  'aboutDesc':1,'readyDesc':1,'card1Desc':1,'card2Desc':1,'readyTitle':1,
  'aboutTitle':1,'missionTitle':1,'card1Title':1,'card2Title':1,'card1SubDesc':1,
  'svc1Title':1,'svc2Title':1,'svc3Title':1,'svc4Title':1,'svc5Title':1,'svc6Title':1,'svc7Title':1,
  'svc1Desc':1,'svc2Desc':1,'svc3Desc':1,'svc4Desc':1,'svc5Desc':1,'svc6Desc':1,'svc7Desc':1,
  'procTitle1':1,'procTitle2':1,'procTitle3':1,'procTitle4':1,
  'procTitle5':1,'procTitle6':1,'procTitle7':1,'procTitle8':1,
  'procDesc1':1,'procDesc2':1,'procDesc3':1,'procDesc4':1,
  'procDesc5':1,'procDesc6':1,'procDesc7':1,'procDesc8':1,
  'contactTitle':1,'contactDesc':1,'contactEmail':1,'formNote':1,
  'social.facebookLink':1,'social.instagramLink':1,'social.lineId':1
};

/* 營運長不能修改的欄位（超級執行長專屬） */
var OPS_ADMIN_RESTRICTED = {
  'heroEnTitle':1, 'heroZhTitle':1, 'brandName':1,
  'label01':1, 'label02':1, 'label03':1, 'label04':1, 'label05':1
};

var DEF = {
  logoData: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0NSIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQzk5NjNBIiBzdHJva2Utd2lkdGg9IjQiLz48dGV4dCB4PSI1MCIgeT0iNjQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtc2l6ZT0iNDIiIGZvbnQtZmFtaWx5PSJzZXJpZiIgZmlsbD0iI0M5OTYzQSIgZm9udC13ZWlnaHQ9IjkwMCI+NTwvdGV4dD48L3N2Zz4=',
  logoType: 'image',
  brandName: '馬克伍號影像工作室',
  introTagline: 'MARK NO.5.STUDIO',
  introTaglineSize: '1rem',
  marqueeItems: ['🎬 歡迎光臨馬克伍號影像工作室', '✨ 專業影像製作服務', '📹 打造令人難忘的視覺作品'],
  marqueeColor: '#FFFFFF',
  marqueeSpeed: 30,
  marqueeShow: true,
  heroSubtitle: 'MARK NO.5.STUDIO',
  heroEnTitle: 'MARK NO.5',
  heroZhTitle: '讓影像，真正為品牌帶來價值',
  heroDesc: '馬克伍號影像工作室，專注於將影像轉化為品牌溝通工具，不只是製作影片，而是協助企業精準傳遞訊息、建立信任、提升轉換。',
  label01: '01 · THE STORY', label02: '02 · WHAT WE DO', label03: '03 · HOW WE WORK',
  label04: '04 · SELECTED WORKS', label05: '05 · GET IN TOUCH',
  aboutHeading: '關於馬克伍號',
  aboutDesc: '馬克伍號影像工作室，由 馬克斯（Marcus） 創立。 19 年影像製作經驗，從電視產業後期出發， 穿越節目製作、商業廣告與視覺設計領域。\n這不是單一技術的累積， 而是一種對影像語言的長時間觀察與理解。\n我們理解畫面如何說話， 也理解觀眾如何感受。',
  aboutTitle: '打造卓越視覺的<span style="color:var(--gold)">專業影像夥伴</span>',
  readyDesc: '我們的起點，來自於早期參與知名電視節目後期製作，在高強度製作環境中，磨練出對節奏、敘事與細節的極致要求。隨著經驗累積，逐步拓展至：<ul><li>節目製作與內容企劃</li><li>商業廣告與品牌形象影片</li><li>動畫設計與視覺特效（VFX / Motion Graphics）</li><li>數位內容與新媒體影像整合</li></ul><p style="margin-top:10px;font-size:.88rem;color:var(--t3)">這些歷程，不只是技術的累積，更是對影像語言與市場溝通方式的深度理解。</p>',
  readyTitle: '"Ready." 準備好，創造價值',
  card1Desc: '從客戶接洽的第一刻起，我們都已準備好以最專業的姿態，為您創造價值。',
  missionTitle: '我們的理念與承諾',
  card1Title: '經驗與專業的累積', card1SubDesc: '創辦人擁有近 19 年深厚資歷，累積豐富實戰經驗與業界人脈。',
  card2Title: '「伍號」的承諾與精神', card2Desc: '在任何拍攝現場，五秒倒數是徹底準備與專業到位的訊號。',
  servicesHeading: '專業服務項目', servicesSub: '每個項目，都是一次精心策劃的視覺旅程。',
  svc1Title: '動態影像拍攝', svc1Desc: '高規格攝影器材與專業運鏡，呈現電影級視覺質感。',
  svc2Title: '商業廣告製作', svc2Desc: '從腳本發想到完片，精準傳遞品牌商業價值。',
  svc3Title: '企業形象影片', svc3Desc: '打造具備深度的企業故事，全面提升品牌信任感。',
  svc4Title: '創意動畫製作', svc4Desc: '2D/3D 動畫特效設計，突破實拍限制的視覺想像。',
  svc5Title: '活動紀錄', svc5Desc: '典禮、發表會、演唱會等各類型活動現場專業多機記錄。',
  svc6Title: '音樂錄影帶', svc6Desc: '融合視覺敘事與音樂情感，打造令人印象深刻的 MV 作品。',
  svc7Title: '短影音製作', svc7Desc: '針對 Reels、TikTok、YouTube Shorts 平台優化的短影音內容。',
  processHeading: '服務流程', processSub: '每個環節透明清晰，讓合作無後顧之憂。',
  procTitle1: '概念討論', procTitle2: '報價與簽約', procTitle3: '腳本發想', procTitle4: '前期規劃',
  procTitle5: '拍攝執行', procTitle6: '後製剪輯', procTitle7: '結案交付', procTitle8: '尾款支付',
  procDesc1: '聆聽需求，確認影片風格與預算範圍。', procDesc2: '提供詳細報價，雙方確認後簽署合約。',
  procDesc3: '編寫分鏡腳本，將概念轉化為畫面語言。', procDesc4: '確認場地、演員、道具與拍攝時程表。',
  procDesc5: '專業團隊進駐，執行高規格影像拍攝。', procDesc6: '剪輯、調色、特效與音效，初剪審核修整。',
  procDesc7: '確認成品無誤，交付高畫質影片檔案。', procDesc8: '完成結案後結清剩餘款項，期待再合作。',
  portfolioHeading: '精選作品集',
  contactTitle: '準備好開始了嗎？', contactDesc: '歡迎填寫表單，或透過以下方式直接聯繫我們。',
  contactEmail: 'markno.5.studio@gmail.com',
  formNote: '送出後將開啟您的郵件軟體，請確認內容後寄出。我們通常在 24 小時內回覆。',
  pfLabelUrl: 'YouTube 連結', pfLabelTitle: '標題', pfLabelCat: '分類', pfLabelDesc: '說明',
  footerTagline: '我們不追求過度表現，\n而是精準。\n不堆疊效果，\n而是選擇。\n不只是完成影像，\n而是讓影像成立。',
  readyText: '準備好了嗎？<br>讓我們一起創造<br>令人難忘的視覺作品。',
  footerCompany: '馬克伍號影像工作室．統一編號：82150195',
  footerCopyTpl: '© 2017–{YEAR} All Rights Reserved.',
  social: { 
    facebookLink: 'https://www.facebook.com/markno.5.studio',
    facebookShow: true,
    instagramLink: 'https://www.instagram.com/mark_no.5_studio/',
    instagramShow: true,
    threadsLink: 'https://www.threads.net/@mark_no.5_studio',
    threadsShow: true,
    youtubeLink: 'https://www.youtube.com/@markno5studio',
    youtubeShow: true,
    lineId: 'marcus0403_c',
    lineShow: true
  },
  pfCategories: ['品牌形象廣告','企業形象廣告','募資影片','活動紀錄','短影音','音樂錄影帶','動畫製作'],
  serviceDescriptions: {
    '品牌形象廣告': { description: '專業品牌形象廣告製作服務', show: true, icon: 'fa-solid fa-camera' },
    '企業形象廣告': { description: '專業企業形象廣告製作服務', show: true, icon: 'fa-solid fa-clapperboard' },
    '募資影片': { description: '專業募資影片製作服務', show: true, icon: 'fa-solid fa-film' },
    '活動紀錄': { description: '專業活動紀錄製作服務', show: true, icon: 'fa-solid fa-calendar-check' },
    '短影音': { description: '專業短影音製作服務', show: true, icon: 'fa-solid fa-mobile-screen-button' },
    '音樂錄影帶': { description: '專業音樂錄影帶製作服務', show: true, icon: 'fa-solid fa-music' },
    '動畫製作': { description: '專業動畫製作製作服務', show: true, icon: 'fa-regular fa-lightbulb' }
  },
  formChecklist: ['拍攝影片','後期剪輯','動畫製作','4K 規格','HD 規格','直式影片','橫式影片','影片長度討論','2D 動畫','3D 動畫','燈光設備','專業收音','讀稿機','特殊需求'],
  carouselImages: [
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1800&q=80',
    'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=1800&q=80',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1800&q=80',
    'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1800&q=80',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1800&q=80'
  ],
  portfolio: [
    { url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title:'年度品牌形象廣告', cat:'品牌形象廣告', description:'主軸強調品牌核心價值與社會責任，採紀實影像風格拍攝。' },
    { url:'https://youtu.be/D-g8PIdXy2c', title:'科技公司企業形象影片', cat:'企業形象廣告', description:'強調創新與未來性，以光影特效呈現品牌科技感。' },
    { url:'https://www.youtube.com/watch?v=9bZkp7q19f0', title:'獨立樂團音樂錄影帶', cat:'音樂錄影帶', description:'採用一鏡到底的超現實風格，呈現樂團獨特的音樂靈魂。' },
    { url:'https://www.youtube.com/watch?v=3S3c_H6qW40', title:'國際論壇活動紀錄', cat:'活動紀錄', description:'捕捉講者精彩瞬間與現場熱烈氣氛，完整紀錄歷史時刻。' },
    { url:'https://www.youtube.com/watch?v=kY8c2_nL-5Q', title:'產品介紹動畫', cat:'動畫製作', description:'清晰展示新產品運作原理與優勢，提升消費者購買意願。' }
  ],
  theme: { bgColor:'#09090B', bg2Color:'#0F0F12', bg3Color:'#161618', goldColor:'#C9963A', t1Color:'#F0EBE2', t2Color:'#C8C2B6', t3Color:'#9A948C', heroEnFont:'Google Sans Flex', heroEnSize:'7.5rem', heroZhSize:'2.6rem', scrollColor:'rgba(255,255,255,0.55)', scrollSize:'1rem', scrollFont:'Bebas Neue', labelSize:'0.92rem',
    rippleColor:'rgba(201,150,58,0.85)', rippleOpacity:'0.85', rippleSize:'86px', rippleWidth:'3px',
    procNumOpacity:'0.18', procNumHoverOpacity:'1.0',
    introLogoSize:'300px',
    datetimeSize:'.78rem',
    datetimeFont:'Bebas Neue'
  },
  backendSettings: {
    autoLogoutMinutes: 5, // 預設 5 分鐘後自動登出
    autoSaveSeconds: 60, // 預設 60 秒後自動儲存
    copyrightTemplate: '',
    sendMessageEmail: '',
    inboxGmailUrl: '',
    dragArrowColor: '#C9963A',
    dragArrowSize: 60,
    dragArrowOpacity: 0.4,
    dragArrowHoverOpacity: 0.9,
    dragArrowCooldown: 300,
    dragArrowActiveGlow: 20,
    dragArrowIcon: 'chevron',
    pfGlowColor: '#C9963A',
    pfGlowSize: 28,
    pfGlowRange: 56,
    pfGlowBrightness: 0.75,
    pfGlowSoftness: 0.4
  },
  gmailUrl: 'https://mail.google.com/mail/u/2/#inbox',
  mailToAddress: '',
  inbox: [],
  editLog: [],
  analytics: { pageViews:0, byDate:{}, byDevice:{}, bySource:{} },
  users: [
    { username:'mark', password:'mark888', role:'super_admin', name:'超級執行長 Mark', online:false, lastSeen:'', avatar:'', permissions:[] },
    { username:'ops',  password:'ops888',  role:'ops_admin',   name:'營運長',           online:false, lastSeen:'', avatar:'', permissions:[] },
    { username:'pro',  password:'pro123',  role:'editor',      name:'優秀人員',         online:false, lastSeen:'', avatar:'', permissions:[] }
  ]
};

/* ============================================================
   STATE
============================================================ */
// 已發布內容的時間戳記（來自 content.js）
var PUBLISHED_AT = (window.MK5_PUBLISHED && window.MK5_PUBLISHED._publishedAt) ? window.MK5_PUBLISHED._publishedAt : '';

var D = null, CU = null, CF = 'All', SQ = '', carIdx = 0, carTimer = null, PF_PAGE = 0;
var PF_PER_PAGE = 12; // 4x3 佈局
var autoLogoutTimer = null; // 自動登出計時器

// 權限管理 - 可編輯項目（28項）
var EDITABLE_ITEMS = ['introTagline','introTaglineSize','heroSubtitle','heroEnTitle','heroZhTitle','heroDesc','marqueeItems','marqueeColor','marqueeSpeed','marqueeShow','introLogoSize','datetimeSize','datetimeFont','heroEnFont','heroEnSize','heroZhSize','logo','carousel','categories','serviceDescriptions','socialFacebook','socialInstagram','socialThreads','socialYoutube','socialLine','rippleColor','rippleOpacity','rippleSize','rippleWidth','procNumOpacity','procNumHoverOpacity','dragArrowColor','dragArrowIcon','dragArrowSize','dragArrowOpacity','dragArrowHoverOpacity','dragArrowCooldown','dragArrowActiveGlow','pfGlowColor','pfGlowSize','pfGlowRange','pfGlowBrightness','pfGlowSoftness','autoLogout','autoSave','copyright','email','contactEmail','readyText','cloudSync'];
var EDITABLE_NAMES = {
  introTagline:'開場動畫大標題',introTaglineSize:'開場動畫大標題大小',
  heroSubtitle:'首頁 Logo 下方小標',heroEnTitle:'首頁英文大標',heroZhTitle:'首頁中文副標',heroDesc:'首頁說明文字',
  marqueeItems:'最新公告內容',marqueeColor:'跑馬文字顏色',marqueeSpeed:'跑馬速度',marqueeShow:'顯示跑馬燈',
  introLogoSize:'開場動畫 Logo 大小',datetimeSize:'日期時間天氣大小',heroEnFont:'英文大標字體',heroEnSize:'英文大標大小',heroZhSize:'中文副標大小',
  logo:'Logo 圖片',carousel:'輪播圖片',categories:'作品分類',serviceDescriptions:'服務項目說明',
  socialFacebook:'Facebook',socialInstagram:'Instagram',socialThreads:'Threads',socialYoutube:'YouTube',socialLine:'LINE ID',
  rippleColor:'光暈顏色',rippleOpacity:'光暈亮度',rippleSize:'光暈大小',rippleWidth:'光暈粗細',
  procNumOpacity:'流程數字亮度',procNumHoverOpacity:'流程數字 Hover 亮度',
  dragArrowColor:'拖曳箭頭顏色',dragArrowIcon:'拖曳箭頭樣式',dragArrowSize:'拖曳箭頭大小',dragArrowOpacity:'拖曳箭頭透明度',dragArrowHoverOpacity:'拖曳箭頭 Hover 透明度',dragArrowCooldown:'拖曳翻頁冷卻時間',dragArrowActiveGlow:'拖曳到箭頭時發光強度',
  pfGlowColor:'拖曳發光顏色',pfGlowSize:'拖曳發光大小',pfGlowRange:'拖曳發光範圍',pfGlowBrightness:'拖曳發光明亮',pfGlowSoftness:'拖曳發光柔化',
  autoLogout:'自動登出時間',autoSave:'自動儲存時間',copyright:'版權模板',email:'發送訊息 Email',contactEmail:'聯絡資訊 Email',readyText:'準備好了嗎文字',
  cloudSync:'☁️ 雲端同步設定（49–52）'
};

/* ============================================================
   AUDIO ENGINE (no closures that break, pure functions)
============================================================ */
var _ac = null;
function getAC() {
  if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
  return _ac;
}
function playTone(freq, type, vol, dur) {
  var a = getAC(); if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.connect(g); g.connect(a.destination);
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}
function playNoise(freq, vol, dur) {
  var a = getAC(); if (!a) return;
  var sr = a.sampleRate, buf = a.createBuffer(1, sr * dur, sr);
  var dat = buf.getChannelData(0);
  for (var i = 0; i < dat.length; i++) dat[i] = (Math.random() * 2 - 1) * Math.sin(i / dat.length * Math.PI) * 0.5;
  var src = a.createBufferSource(), g = a.createGain(), fi = a.createBiquadFilter();
  fi.type = 'bandpass'; fi.frequency.value = freq; fi.Q.value = 4;
  src.buffer = buf; src.connect(fi); fi.connect(g); g.connect(a.destination);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  src.start();
}
function playHit() {
  var freqs = [600, 900, 1400, 2200];
  for (var i = 0; i < freqs.length; i++) playTone(freqs[i], 'triangle', 0.14 / (i + 1), 0.8 / (i + 1));
}
function playSweep(f1, f2, dur, vol) {
  var a = getAC(); if (!a) return;
  var o = a.createOscillator(), g = a.createGain();
  o.connect(g); g.connect(a.destination);
  o.type = 'sine';
  o.frequency.setValueAtTime(f1, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + dur);
  g.gain.setValueAtTime(0, a.currentTime);
  g.gain.linearRampToValueAtTime(vol, a.currentTime + dur * 0.1);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
  o.start(); o.stop(a.currentTime + dur);
}

/* Sound schedule: [frame, function_name, args] */
var SOUNDS = [
  [5,  'noise', [180, 0.06, 0.08]], [15, 'noise', [220, 0.07, 0.09]],
  [28, 'noise', [260, 0.08, 0.10]], [28, 'tone',  [1200,'square',0.08,0.04]],
  [44, 'noise', [300, 0.09, 0.10]], [58, 'noise', [340, 0.10, 0.11]],
  [58, 'tone',  [900,'square',0.10,0.05]], [72, 'noise', [400,0.11,0.11]],
  [82, 'tone',  [1600,'square',0.18,0.08]],
  [95, 'tone',  [1800,'square',0.16,0.06]], [95, 'noise', [500,0.08,0.06]],
  [115,'tone',  [2000,'square',0.18,0.07]], [115,'tone', [1200,'square',0.13,0.05]],
  [138,'sweep', [400,3200,0.3,0.06]], [188,'hit', []],
  [225,'sweep', [800,200,0.5,0.05]], [275,'sweep',[300,2800,0.7,0.07]]
];
function fireSound(frame) {
  for (var i = 0; i < SOUNDS.length; i++) {
    if (SOUNDS[i][0] !== frame) continue;
    var type = SOUNDS[i][1], args = SOUNDS[i][2];
    if (type === 'tone')  playTone(args[0], args[1], args[2], args[3]);
    if (type === 'noise') playNoise(args[0], args[1], args[2]);
    if (type === 'hit')   playHit();
    if (type === 'sweep') playSweep(args[0], args[1], args[2], args[3]);
  }
}

/* ============================================================
   CINEMATIC INTRO
============================================================ */
function runIntro() {
  var ov = document.getElementById('intro-overlay');
  var cv = document.getElementById('intro-canvas');
  var logo = document.getElementById('intro-logo-el');
  var logoVideo = document.getElementById('intro-logo-video');
  var tag = document.getElementById('intro-tagline');
  if (tag && D.introTagline) tag.textContent = D.introTagline;
  if (!ov || !cv) return;
  
  // 判斷是影片還是圖片
  if (D.logoType === 'video' && logoVideo) {
    logoVideo.src = D.logoData;
    logoVideo.style.display = 'block';
    logo.style.display = 'none';
  } else {
    logo.src = D.logoData;
    logo.style.display = 'block';
    if (logoVideo) logoVideo.style.display = 'none';
  }
  
  var ctx = cv.getContext('2d');
  var W, H;
  function sz() { W = cv.width = window.innerWidth; H = cv.height = window.innerHeight; }
  sz(); window.addEventListener('resize', sz);

  var N = 24;
  var segs = [];
  for (var si = 0; si < N; si++) {
    segs.push({ i: si, angle: si / N * Math.PI * 2, at: Math.floor(Math.random() * 60 + 5), wop: 0 });
  }

  var frame = 0, raf;
  var P = { wire:80, fill:135, iris:185, flash:215, rev:270, hold:350, out:390 };

  function eO(t) { return 1 - (1-t)*(1-t); }
  function eIO(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
  function lerp(a, b, t) { return a + (b-a)*t; }

  function drawSeg(cx, cy, R, s, ic, wA, fA) {
    var a1 = s.angle, a2 = a1 + Math.PI*2/N - 0.02;
    var ir = R * 0.28 * (1 - ic * 0.9);
    ctx.beginPath(); ctx.arc(cx,cy,R,a1,a2); ctx.arc(cx,cy,ir,a2,a1,true); ctx.closePath();
    if (fA > 0) {
      var gr = ctx.createRadialGradient(cx,cy,ir,cx,cy,R);
      gr.addColorStop(0, 'hsla(' + ((s.i/N)*30+10) + ',55%,' + (10+s.i*0.5) + '%,' + fA + ')');
      gr.addColorStop(1, 'hsla(38,40%,4%,' + fA + ')');
      ctx.fillStyle = gr; ctx.fill();
    }
    if (wA > 0) { ctx.strokeStyle = 'rgba(201,150,58,' + wA + ')'; ctx.lineWidth = 1; ctx.stroke(); }
  }

  function drawHalo(cx, cy, R, prog, alpha) {
    var ang = -Math.PI/2 + prog * Math.PI*2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,R, ang-0.65, ang);
    ctx.strokeStyle = 'rgba(201,150,58,' + (alpha*0.9) + ')'; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + Math.cos(ang)*R, cy + Math.sin(ang)*R, 4, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,220,140,' + alpha + ')'; ctx.fill();
    ctx.restore();
  }

  function drawFlare(cx, cy, R, fx, alpha) {
    if (alpha <= 0) return;
    ctx.save();
    var g = ctx.createRadialGradient(fx,cy,0,fx,cy,R*0.5);
    g.addColorStop(0, 'rgba(255,240,200,' + (alpha*0.7) + ')');
    g.addColorStop(0.3, 'rgba(255,200,120,' + (alpha*0.3) + ')');
    g.addColorStop(1, 'rgba(201,150,58,0)');
    ctx.beginPath(); ctx.arc(fx,cy,R*0.5,0,Math.PI*2); ctx.fillStyle = g; ctx.fill();
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle = 'rgba(255,240,200,0.6)'; ctx.fillRect(fx - W*0.5, cy-1, W, 2);
    ctx.restore();
  }

  function anim() {
    raf = requestAnimationFrame(anim);
    frame++;
    fireSound(frame);
    ctx.clearRect(0,0,W,H); ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    var cx = W/2, cy = H/2, R = Math.min(W,H) * 0.28;

    if (frame <= P.wire) {
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        if (frame < s.at) continue;
        var st = Math.min(1, (frame - s.at) / 12);
        s.wop = eO(st) * 0.7;
        drawSeg(cx, cy, R, s, 0, s.wop, 0);
      }
    } else if (frame <= P.fill) {
      var t = (frame - P.wire) / (P.fill - P.wire);
      for (var i = 0; i < segs.length; i++) {
        var s = segs[i];
        var st = Math.min(1, Math.max(0, (t - i/segs.length*0.5) * 3));
        var fa = eO(st) * 0.85;
        drawSeg(cx, cy, R, s, 0, s.wop * (1 - t*0.5), fa);
        if (st > 0.5 && st < 0.7) {
          var a = s.angle + Math.PI/N;
          ctx.beginPath();
          ctx.arc(cx + Math.cos(a)*R*0.65, cy + Math.sin(a)*R*0.65, 3, 0, Math.PI*2);
          ctx.fillStyle = 'rgba(255,230,160,' + ((0.7-st)/0.2*0.8) + ')'; ctx.fill();
        }
      }
    } else if (frame <= P.iris) {
      var t = eIO((frame - P.fill) / (P.iris - P.fill));
      for (var i = 0; i < segs.length; i++) drawSeg(cx, cy, R, segs[i], t, 0, 0.85);
    } else if (frame <= P.flash) {
      var t = (frame - P.iris) / (P.flash - P.iris);
      for (var i = 0; i < segs.length; i++) drawSeg(cx, cy, R, segs[i], 1, 0, 0.85);
      var fa = Math.sin(t * Math.PI);
      var fg = ctx.createRadialGradient(cx,cy,0,cx,cy,R*2);
      fg.addColorStop(0, 'rgba(255,235,180,' + (fa*0.95) + ')');
      fg.addColorStop(0.3, 'rgba(201,150,58,' + (fa*0.5) + ')');
      fg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(cx,cy,R*2,0,Math.PI*2); ctx.fillStyle = fg; ctx.fill();
    } else if (frame <= P.rev) {
      var t = eO((frame - P.flash) / (P.rev - P.flash));
      var la = Math.min(1, t * 1.5);
      for (var i = 0; i < segs.length; i++) drawSeg(cx, cy, R, segs[i], 1, 0, 0.85*(1-t*0.6));
      logo.style.opacity = la;
      logo.style.filter = 'blur(' + lerp(6,0,t) + 'px)';
      logo.style.transform = 'scale(' + lerp(1.06,1,t) + ')';
      logo.style.border = '2px solid rgba(201,150,58,' + (la*0.9) + ')';
      logo.style.boxShadow = '0 0 ' + (40*la) + 'px rgba(201,150,58,' + (la*0.6) + '),0 0 ' + (80*la) + 'px rgba(201,150,58,' + (la*0.18) + ')';
      tag.style.opacity = Math.max(0, t - 0.5) * 2;
      tag.style.transform = 'translateY(' + (1 - Math.max(0, t-0.3)) * 15 + 'px)';
    } else if (frame <= P.hold) {
      var t = (frame - P.rev) / (P.hold - P.rev);
      logo.style.opacity = '1'; logo.style.filter = 'blur(0px)'; logo.style.transform = 'scale(1)';
      for (var i = 0; i < segs.length; i++) drawSeg(cx, cy, R, segs[i], 1, 0, Math.max(0, 0.3-t*0.3));
      if (t < 0.7) drawHalo(cx, cy, R*1.02, t/0.7, 0.9 * (1 - Math.max(0, (t/0.7 - 0.85) / 0.15)));
      if (t > 0.3 && t < 0.85) {
        var fp = (t - 0.3) / 0.55;
        drawFlare(cx, cy, R, lerp(cx-W*0.4, cx+W*0.4, fp), Math.sin(fp * Math.PI) * 0.7);
      }
      tag.style.opacity = '1';
    } else {
      var t = eIO((frame - P.hold) / (P.out - P.hold));
      logo.style.opacity = 1 - t;
      logo.style.transform = 'scale(' + (1 - t*0.06) + ')';
      tag.style.opacity = 1 - t;
      ctx.fillStyle = 'rgba(0,0,0,' + t + ')'; ctx.fillRect(0,0,W,H);
      if (frame >= P.out) {
        cancelAnimationFrame(raf);
        ov.style.transition = 'opacity .4s ease';
        ov.style.opacity = '0';
        setTimeout(function() { ov.style.display = 'none'; initPage(); }, 440);
      }
    }
  }
  requestAnimationFrame(anim);
}

/* ============================================================
   BOOT
============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function() { try { getAC(); } catch(e) {} }, { once: true });
  loadData();
  applyTheme();
  updateDOM();
  runIntro();
  bindEvents();
  // ☁️ 非同步從 GitHub 拉取最新內容（不阻擋初始渲染）
  setTimeout(function() { cloudPull(); }, 800);
  
  // ESC 鍵關閉影片 modal
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' || e.keyCode === 27) {
      var modal = document.getElementById('video-modal');
      if (modal && modal.classList.contains('active')) {
        closeVideoModal();
      }
    }
  });
  
  // 用戶活動監聽 - 重置自動登出計時器
  var activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  activityEvents.forEach(function(event) {
    document.addEventListener(event, function() {
      resetAutoLogout();
    }, { passive: true });
  });
});

function loadData() {
  try {
    var s = localStorage.getItem(KEY); // KEY = 'MK5_DATA'（固定）

    // ── 舊版本資料遷移：若 MK5_DATA 不存在，從 MK5_20xx.xx.xx 格式遷移 ──
    if (!s) {
      var oldKeys = Object.keys(localStorage).filter(function(k) {
        return /^MK5_20\d{2}/.test(k);
      });
      if (oldKeys.length > 0) {
        oldKeys.sort();
        s = localStorage.getItem(oldKeys[oldKeys.length - 1]);
        if (s) {
          console.log('✅ 已從舊版本遷移資料：' + oldKeys[oldKeys.length - 1]);
          localStorage.setItem(KEY, s);
          oldKeys.forEach(function(k) { localStorage.removeItem(k); });
        }
      }
    }

    if (s) {
      var p = JSON.parse(s);
      D = Object.assign({}, DEF, p);
      D.social = Object.assign({}, DEF.social, p.social || {});
      D.analytics = Object.assign({}, DEF.analytics, p.analytics || {});
      D.theme = Object.assign({}, DEF.theme, p.theme || {});
      if (!D.logoData || D.logoData.length < 50) D.logoData = DEF.logoData;
      if (!D.carouselImages || !D.carouselImages.length) D.carouselImages = DEF.carouselImages.slice();
      if (!D.pfCategories || !D.pfCategories.length) D.pfCategories = DEF.pfCategories.slice();
      if (!D.formChecklist || !D.formChecklist.length) D.formChecklist = DEF.formChecklist.slice();
      if (!D.users || !D.users.length) D.users = JSON.parse(JSON.stringify(DEF.users));
      if (!D.editLog) D.editLog = [];

      // ── 檢查是否有比 localStorage 更新的發布內容（content.js）──
      var savedPublishedAt = D._publishedAt || '';
      if (PUBLISHED_AT && PUBLISHED_AT > savedPublishedAt) {
        mergePublishedContent();
      }

    } else {
      // 沒有 localStorage 資料 → 使用 content.js 發布內容，或 DEF 預設值
      if (window.MK5_PUBLISHED && typeof window.MK5_PUBLISHED === 'object') {
        D = Object.assign({}, DEF, window.MK5_PUBLISHED);
        D.social = Object.assign({}, DEF.social, window.MK5_PUBLISHED.social || {});
        D.analytics = Object.assign({}, DEF.analytics);
        D.theme = Object.assign({}, DEF.theme, window.MK5_PUBLISHED.theme || {});
        if (!D.logoData || D.logoData.length < 50) D.logoData = DEF.logoData;
        if (!D.carouselImages || !D.carouselImages.length) D.carouselImages = DEF.carouselImages.slice();
        if (!D.users || !D.users.length) D.users = JSON.parse(JSON.stringify(DEF.users));
        if (!D.editLog) D.editLog = [];
        D._publishedAt = PUBLISHED_AT;
        console.log('✅ 已載入已發布內容（content.js）');
      } else {
        D = JSON.parse(JSON.stringify(DEF));
      }
      persist();
    }
  } catch(e) {
    D = JSON.parse(JSON.stringify(DEF));
  }
  try { var cu = sessionStorage.getItem('mk5cu'); if (cu) CU = JSON.parse(cu); } catch(e) {}
  
  // 如果已登入，啟動自動登出計時器
  if (CU) {
    startAutoLogout(); startAutoSave();
  }
}

/* ============================================================
   MERGE PUBLISHED CONTENT（同步 content.js 發布的資料）
============================================================ */
function mergePublishedContent() {
  if (!window.MK5_PUBLISHED || typeof window.MK5_PUBLISHED !== 'object') return;
  var pub = window.MK5_PUBLISHED;

  // 只更新內容欄位，不覆蓋用戶帳號、來信、分析資料
  var contentFields = [
    'logoData','logoType','brandName','introTagline','introTaglineSize',
    'marqueeItems','marqueeColor','marqueeSpeed','marqueeShow',
    'heroSubtitle','heroEnTitle','heroZhTitle','heroDesc',
    'label01','label02','label03','label04','label05',
    'aboutHeading','aboutDesc','aboutTitle','readyDesc','readyTitle',
    'card1Desc','missionTitle','card1Title','card1SubDesc','card2Title','card2Desc',
    'servicesHeading','servicesSub','processHeading','processSub',
    'svc1Title','svc1Desc','svc2Title','svc2Desc','svc3Title','svc3Desc',
    'svc4Title','svc4Desc','svc5Title','svc5Desc','svc6Title','svc6Desc','svc7Title','svc7Desc',
    'procTitle1','procTitle2','procTitle3','procTitle4','procTitle5','procTitle6','procTitle7','procTitle8',
    'procDesc1','procDesc2','procDesc3','procDesc4','procDesc5','procDesc6','procDesc7','procDesc8',
    'portfolioHeading','contactTitle','contactDesc','contactEmail','formNote',
    'footerTagline','readyText','footerCompany','footerCopyTpl',
    'portfolio','pfCategories','serviceDescriptions','formChecklist','carouselImages',
    'gmailUrl','mailToAddress'
  ];

  contentFields.forEach(function(field) {
    if (pub[field] !== undefined) D[field] = pub[field];
  });

  if (pub.social) D.social = Object.assign({}, D.social, pub.social);
  if (pub.theme)  D.theme  = Object.assign({}, D.theme,  pub.theme);
  if (pub.backendSettings) D.backendSettings = Object.assign({}, D.backendSettings, pub.backendSettings);

  D._publishedAt = PUBLISHED_AT;
  persist();
  console.log('✅ 已套用最新發布內容（' + PUBLISHED_AT + '）');
}

/* ============================================================
   GENERATE PUBLISH FILE（生成 content.js，讓手機也能看到最新內容）
============================================================ */
// 備用：手動下載 content.js（無法設定 GitHub Token 時使用）
window.generatePublishFile = function() {
  if (!CU || CU.role !== 'super_admin') {
    Swal.fire({ title: '無權限', text: '只有超級執行長才能執行此操作', icon: 'error' });
    return;
  }
  var pub  = buildPublishData();
  var date = new Date().toLocaleString('zh-TW');
  var jsContent =
    '/* ================================================================\n' +
    '   馬克伍號影像工作室 - 發布內容 (content.js)\n' +
    '   發布時間：' + date + '\n' +
    '   ⚠ 此檔案由後台自動生成，請勿手動修改\n' +
    '================================================================ */\n\n' +
    'window.MK5_PUBLISHED = ' + JSON.stringify(pub, null, 2) + ';\n';
  var blob = new Blob([jsContent], { type: 'text/javascript;charset=utf-8' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href = url; a.download = 'content.js';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
  Swal.fire({ title: '📥 content.js 已下載', text: '請將此檔案上傳到 GitHub 以同步到所有裝置', icon: 'success', timer: 3000, showConfirmButton: false });
};

/* ============================================================
   BUILD PUBLISH DATA（建立可發布的公開資料，排除敏感資訊）
============================================================ */
function buildPublishData() {
  var pub = JSON.parse(JSON.stringify(D));
  delete pub.users;
  delete pub.inbox;
  delete pub.analytics;
  delete pub.editLog;
  pub._publishedAt = new Date().toISOString();
  // 將雲端來源資訊寫入，讓所有裝置知道從哪裡拉取最新資料
  if (CLOUD.owner && CLOUD.repo) {
    pub._cloudOwner  = CLOUD.owner;
    pub._cloudRepo   = CLOUD.repo;
    pub._cloudBranch = CLOUD.branch || 'main';
  }
  return pub;
}

/* ============================================================
   CLOUD PUSH 輔助工具
============================================================ */
// 帶 timeout 的 fetch（預設 20 秒），超時自動中止並拋出 ETIMEOUT 錯誤
function fetchWithTimeout(url, options, ms) {
  ms = ms || 20000;
  var ctrl = new AbortController();
  var tid = setTimeout(function() { ctrl.abort(); }, ms);
  return fetch(url, Object.assign({}, options, { signal: ctrl.signal }))
    .then(function(r)  { clearTimeout(tid); return r; })
    .catch(function(e) {
      clearTimeout(tid);
      if (e.name === 'AbortError') {
        throw new Error('ETIMEOUT:GitHub API 回應逾時（' + Math.round(ms / 1000) + ' 秒），請檢查網路連線後重試');
      }
      throw e;
    });
}

// Promise 版 sleep
function cloudSleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// 同步鎖定旗標：避免同時多個 cloudPush 互搶 SHA
var _cloudPushRunning  = false;  // 目前是否有同步進行中
var _cloudPushPending  = false;  // 同步進行中時又收到新請求，記錄為 pending
var _cloudPushDebounce = null;   // saveChanges 的防抖 timer

/* ============================================================
   CLOUD PUSH（儲存時自動同步到 GitHub，更新 content.js）
   ── 防並發 ── 自動重試（最多 3 次）── 超時保護 ──
============================================================ */
async function cloudPush(silent) {
  if (!CLOUD.token || !CLOUD.owner || !CLOUD.repo) {
    if (!silent) {
      Swal.fire({
        title: '☁️ 尚未設定雲端同步',
        html: '只需設定一次 GitHub Token，之後每次儲存都會自動同步。<br><br>' +
              '<button onclick="Swal.close();setTimeout(function(){openBackendSettings(true);},100)" ' +
              'style="padding:8px 20px;background:var(--gold);color:#000;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:.9rem">⚙️ 前往設定</button>',
        icon: 'info', showConfirmButton: false, showCancelButton: true, cancelButtonText: '稍後再說'
      });
    }
    return false;
  }

  // ── 防並發鎖定 ──────────────────────────────────────────
  if (_cloudPushRunning) {
    // 若已有推送進行中，標記 pending 並直接返回；
    // 本次推送完成後會自動補推一次
    _cloudPushPending = true;
    console.log('☁️ 已有同步進行中，稍後補推');
    return false;
  }
  _cloudPushRunning = true;
  _cloudPushPending = false;

  var branch  = CLOUD.branch || 'main';
  var apiUrl  = 'https://api.github.com/repos/' + CLOUD.owner + '/' + CLOUD.repo + '/contents/content.js';
  var headers = {
    'Authorization': 'Bearer ' + CLOUD.token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };

  showSyncStatus('☁️ 同步中…', 'syncing');

  var MAX_RETRIES = 3;
  var lastError   = null;

  for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // ── 步驟 1：取得目前檔案 SHA ──────────────────────
      var sha = null;
      var shaRes = await fetchWithTimeout(apiUrl + '?ref=' + branch, { headers: headers }, 15000);

      if (shaRes.ok) {
        var shaData = await shaRes.json();
        sha = shaData.sha;
        console.log('☁️ SHA（第 ' + attempt + ' 次）：' + sha);
      } else if (shaRes.status === 404) {
        sha = null; // content.js 不存在，首次建立
      } else if (shaRes.status === 401) {
        throw new Error('EAUTH:Token 驗證失敗（401），請重新輸入正確的 GitHub Token。');
      } else if (shaRes.status === 403) {
        throw new Error('EPERM:Token 權限不足（403），請確認已勾選「Contents: Read and Write」。');
      } else if (shaRes.status === 404) {
        throw new Error('ENOREPO:找不到儲存庫，請確認用戶名稱與儲存庫名稱是否正確。');
      } else if (shaRes.status === 429) {
        // GitHub API 請求頻率限制
        var retryAfter = parseInt(shaRes.headers.get('Retry-After') || '30', 10);
        if (attempt < MAX_RETRIES) {
          console.log('☁️ 請求頻率限制（429），等待 ' + retryAfter + ' 秒後重試');
          await cloudSleep(Math.min(retryAfter * 1000, 30000));
          continue;
        }
        throw new Error('請求頻率過高（429），請稍後再試。');
      } else if (shaRes.status >= 500) {
        // GitHub 伺服器錯誤，稍後重試
        if (attempt < MAX_RETRIES) {
          console.log('☁️ GitHub 伺服器錯誤（' + shaRes.status + '），' + (attempt * 2) + ' 秒後重試');
          await cloudSleep(attempt * 2000);
          continue;
        }
        throw new Error('GitHub 伺服器錯誤（HTTP ' + shaRes.status + '），請稍後再試。');
      } else {
        throw new Error('無法取得檔案資訊（HTTP ' + shaRes.status + '）');
      }

      // ── 步驟 2：產生 content.js 內容 ──────────────────
      var pub      = buildPublishData();
      var date     = new Date().toLocaleString('zh-TW');
      var jsContent =
        '/* ================================================================\n' +
        '   MK5 - Published Content (content.js)\n' +
        '   Published: ' + date + '\n' +
        '   Auto-generated. Do not edit manually.\n' +
        '================================================================ */\n\n' +
        'window.MK5_PUBLISHED = ' + JSON.stringify(pub, null, 2) + ';\n';

      // ── 步驟 3：Base64 編碼（支援 UTF-8 中文） ─────────
      var encoded = btoa(unescape(encodeURIComponent(jsContent)));

      // ── 步驟 4：PUT 上傳 ─────────────────────────────
      var body = {
        message: 'chore: auto-sync content ' + new Date().toISOString(),
        content: encoded,
        branch: branch
      };
      if (sha) body.sha = sha;

      console.log('☁️ PUT（第 ' + attempt + ' 次）→ sha:', sha || '(新建)');
      var res = await fetchWithTimeout(apiUrl, {
        method: 'PUT', headers: headers, body: JSON.stringify(body)
      }, 25000);

      if (!res.ok) {
        var errData = {};
        try { errData = await res.json(); } catch(ee) {}
        console.warn('☁️ PUT 回應 ' + res.status + '：', errData);

        if (res.status === 401) throw new Error('EAUTH:Token 驗證失敗，請確認 Token 是否正確或已過期。');
        if (res.status === 403) throw new Error('EPERM:Token 無寫入權限，請確認已勾選「Contents: Read and Write」。');
        if (res.status === 404) throw new Error('ENOREPO:找不到儲存庫或 Token 未授權此 Repo。\n請確認：①用戶名稱、儲存庫名稱是否正確 ②建立 Token 時是否有選取此儲存庫 ③是否勾選「Contents: Read and Write」');
        if (res.status === 409) {
          // SHA 衝突（並發寫入或 SHA 已過期）→ 重新取得 SHA 並立刻重試
          if (attempt < MAX_RETRIES) {
            console.log('☁️ SHA 衝突（409），重新取得 SHA 並重試（第 ' + attempt + ' 次）');
            await cloudSleep(400);
            continue;
          }
          throw new Error('多次 SHA 衝突，可能有其他裝置同時更新。請再次點擊「💾 儲存」。');
        }
        if (res.status === 422) throw new Error('內容格式錯誤（422）：' + (errData.message || ''));
        if (res.status === 429) {
          if (attempt < MAX_RETRIES) { await cloudSleep(30000); continue; }
          throw new Error('請求頻率過高（429），請稍後再試。');
        }
        if (res.status >= 500) {
          if (attempt < MAX_RETRIES) { await cloudSleep(attempt * 2000); continue; }
        }
        throw new Error((errData.message || '未知錯誤') + '（HTTP ' + res.status + '）');
      }

      // ── 步驟 5：成功，更新本地時間戳 ─────────────────
      D._publishedAt = pub._publishedAt;
      window.MK5_PUBLISHED = pub;
      PUBLISHED_AT = pub._publishedAt;
      persist();

      showSyncStatus('☁️ 已同步 ✓', 'success');
      console.log('☁️ 同步成功（第 ' + attempt + ' 次嘗試）！時間：', pub._publishedAt);
      _cloudPushRunning = false;

      // 若同步期間有新的儲存請求（pending），800ms 後補推一次
      if (_cloudPushPending) {
        _cloudPushPending = false;
        console.log('☁️ 執行 pending 補推…');
        setTimeout(function() { cloudPush(true); }, 800);
      }

      if (!silent) {
        Swal.fire({
          title: '☁️ 同步成功！',
          html: '內容已自動上傳到 GitHub<br><small style="color:var(--t3)">手機重新整理即可看到最新內容 ✅</small>',
          icon: 'success', timer: 2500, showConfirmButton: false
        });
      }
      return true;

    } catch(e) {
      lastError = e;
      var msg = e.message || '';
      // 永久性錯誤（憑證問題、設定錯誤）→ 不重試
      if (msg.startsWith('EAUTH:') || msg.startsWith('EPERM:') || msg.startsWith('ENOREPO:')) {
        break;
      }
      if (attempt < MAX_RETRIES) {
        console.warn('☁️ 第 ' + attempt + ' 次失敗，' + (attempt * 1500) + 'ms 後重試：', msg);
        await cloudSleep(attempt * 1500);
      }
    }
  } // end retry loop

  // ── 所有重試均失敗 ──────────────────────────────────
  _cloudPushRunning = false;
  _cloudPushPending = false;
  console.error('☁️ cloudPush 最終失敗：', lastError && lastError.message);
  showSyncStatus('⚠️ 同步失敗', 'error');

  if (!silent) {
    var errMsg  = (lastError && lastError.message) || '未知錯誤';
    var errHint = '';
    if (errMsg.startsWith('EAUTH:'))    { errMsg = errMsg.slice(6);  errHint = '請至後台設定重新輸入正確的 GitHub Token。'; }
    else if (errMsg.startsWith('EPERM:'))   { errMsg = errMsg.slice(6);  errHint = '請重新建立 Token，在「Repository permissions」將「Contents」設為「Read and Write」。'; }
    else if (errMsg.startsWith('ENOREPO:')) { errMsg = errMsg.slice(8); }
    else if (errMsg.startsWith('ETIMEOUT:')){ errMsg = errMsg.slice(9); errHint = '請確認網路連線正常，或稍後再試。'; }
    else { errHint = '請至後台設定確認 GitHub Token、用戶名稱、儲存庫名稱是否正確。'; }

    Swal.fire({
      title: '☁️ 同步失敗',
      html: '<div style="text-align:left;line-height:1.8;font-size:.88rem">' +
            '<b style="color:#f87171">' + errMsg.replace(/\n/g, '<br>') + '</b>' +
            (errHint ? '<br><br><span style="color:var(--t2)">' + errHint + '</span>' : '') +
            '</div>',
      icon: 'error',
      confirmButtonText: '⚙️ 前往設定',
      showCancelButton: true,
      cancelButtonText: '關閉'
    }).then(function(r) { if (r.isConfirmed) openBackendSettings(true); });
  }
  return false;
}

/* ============================================================
   CLOUD PULL（頁面載入時從 GitHub API 拉取最新 content.js）
============================================================ */
async function cloudPull() {
  // 從 content.js 或 CLOUD 設定取得來源資訊
  var owner  = (window.MK5_PUBLISHED && window.MK5_PUBLISHED._cloudOwner)  || CLOUD.owner;
  var repo   = (window.MK5_PUBLISHED && window.MK5_PUBLISHED._cloudRepo)   || CLOUD.repo;
  var branch = (window.MK5_PUBLISHED && window.MK5_PUBLISHED._cloudBranch) || CLOUD.branch || 'main';

  if (!owner || !repo) return; // 尚未設定，跳過

  // Session 快取（3 分鐘內不重複請求）
  var cacheKey = 'MK5_PULL_' + owner + '_' + repo + '_' + branch;
  try {
    var cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      var cObj = JSON.parse(cached);
      if (Date.now() - (cObj._cachedAt || 0) < 3 * 60 * 1000) {
        if (cObj._publishedAt && cObj._publishedAt > (D._publishedAt || '')) {
          window.MK5_PUBLISHED = cObj;
          PUBLISHED_AT = cObj._publishedAt;
          mergePublishedContent();
          updateDOM();
        }
        return;
      }
    }
  } catch(e) {}

  var apiUrl  = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/content.js?ref=' + branch;
  var headers = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (CLOUD.token) headers['Authorization'] = 'Bearer ' + CLOUD.token;

  try {
    var res = await fetch(apiUrl, { headers: headers });
    if (!res.ok) return;

    var data = await res.json();
    if (!data.content) return;

    // 解碼 base64（GitHub API 回傳有換行符）
    var decoded = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));

    // 從 JS 字串中抽取 JSON 物件
    var match = decoded.match(/window\.MK5_PUBLISHED\s*=\s*(\{[\s\S]*?\});\s*$/);
    if (!match) return;

    var remote = JSON.parse(match[1]);

    // 存入 session 快取
    remote._cachedAt = Date.now();
    try { sessionStorage.setItem(cacheKey, JSON.stringify(remote)); } catch(e) {}

    // 若遠端版本比本地新，套用並重繪
    if (remote._publishedAt && remote._publishedAt > (D._publishedAt || '')) {
      console.log('☁️ 已從 GitHub 同步最新內容（' + remote._publishedAt + '）');
      window.MK5_PUBLISHED = remote;
      PUBLISHED_AT = remote._publishedAt;
      mergePublishedContent();
      updateDOM();
    }

  } catch(e) {
    console.log('cloudPull 失敗：', e.message);
  }
}

/* ============================================================
   SYNC STATUS BAR（管理列同步狀態提示）
============================================================ */
function showSyncStatus(msg, type) {
  var el = document.getElementById('mk5-sync-status');
  if (!el) {
    el = document.createElement('div');
    el.id = 'mk5-sync-status';
    el.style.cssText =
      'position:fixed;bottom:20px;right:20px;padding:10px 20px;border-radius:10px;' +
      'font-size:.88rem;z-index:2147483647;transition:opacity .6s;pointer-events:none;' +
      'backdrop-filter:blur(10px);font-weight:600;letter-spacing:.04em;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
    document.body.appendChild(el);
  }
  el.style.opacity = '1';
  el.textContent = msg;
  if (type === 'success') {
    el.style.background  = 'rgba(0,160,80,0.18)';
    el.style.border      = '1px solid rgba(74,222,128,0.45)';
    el.style.color       = '#4ade80';
  } else if (type === 'error') {
    el.style.background  = 'rgba(181,32,32,0.18)';
    el.style.border      = '1px solid rgba(248,113,113,0.45)';
    el.style.color       = '#f87171';
  } else { // syncing
    el.style.background  = 'rgba(201,150,58,0.18)';
    el.style.border      = '1px solid rgba(201,150,58,0.45)';
    el.style.color       = '#C9963A';
  }
  clearTimeout(el._hideTimer);
  el._hideTimer = setTimeout(function() {
    el.style.opacity = '0';
  }, type === 'success' ? 6000 : type === 'error' ? 8000 : 60000);
}

/* ============================================================
   TEST CLOUD CONNECTION（測試 GitHub 連線 — 顯示於表單內，不開新 Swal）
============================================================ */
window.testCloudConnection = async function() {
  var ownerEl  = document.getElementById('bs-cloud-owner');
  var repoEl   = document.getElementById('bs-cloud-repo');
  var tokenEl  = document.getElementById('bs-cloud-token');
  var resultEl = document.getElementById('bs-cloud-test-result');
  if (!resultEl) return;

  // 即時存入 CLOUD（不需等 preConfirm）
  if (ownerEl)  CLOUD.owner  = ownerEl.value.trim();
  if (repoEl)   CLOUD.repo   = repoEl.value.trim();
  if (tokenEl)  CLOUD.token  = tokenEl.value.trim();
  try { localStorage.setItem('MK5_CLOUD', JSON.stringify(CLOUD)); } catch(e) {}

  // ✅ 用 var 賦值（不用 function 宣告），避免 async 函數內巢狀宣告問題
  var setResult = function(icon, msg, ok) {
    resultEl.style.display = 'block';
    resultEl.style.background = ok === null ? 'rgba(201,150,58,0.12)' :
                                ok ? 'rgba(0,160,80,0.15)' : 'rgba(181,32,32,0.15)';
    resultEl.style.border     = ok === null ? '1px solid rgba(201,150,58,0.4)' :
                                ok ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(248,113,113,0.4)';
    resultEl.style.color      = ok === null ? '#C9963A' : ok ? '#4ade80' : '#f87171';
    resultEl.innerHTML        = icon + ' ' + msg;
  };

  if (!CLOUD.owner || !CLOUD.repo || !CLOUD.token) {
    setResult('⚠️', '請先填入所有欄位', false);
    return;
  }

  setResult('🔄', '測試中…', null);

  var authHeaders = {
    'Authorization': 'Bearer ' + CLOUD.token,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  try {
    // 第一步：確認 Token 有效 + 儲存庫存在（可存取）
    var repoRes = await fetch('https://api.github.com/repos/' + CLOUD.owner + '/' + CLOUD.repo, { headers: authHeaders });

    if (repoRes.status === 401) {
      setResult('❌', 'Token 無效，請確認 GitHub Token 正確且未過期。', false);
      return;
    }
    if (repoRes.status === 403) {
      setResult('❌', 'Token 權限不足，請確認 Token 已勾選「Contents: Read and Write」。', false);
      return;
    }
    if (repoRes.status === 404) {
      setResult('❌',
        '找不到儲存庫「' + CLOUD.owner + '/' + CLOUD.repo + '」<br>' +
        '請確認以下事項：<br>' +
        '① 用戶名稱與儲存庫名稱拼寫是否正確<br>' +
        '② Fine-grained Token 建立時「Repository access」是否已選取此儲存庫<br>' +
        '③ 需選「Only select repositories」並手動加入此 Repo',
        false);
      return;
    }
    if (!repoRes.ok) {
      setResult('❌', '無法連接到儲存庫（HTTP ' + repoRes.status + '）', false);
      return;
    }

    // 第二步：確認 content.js 是否存在
    var fileRes = await fetch('https://api.github.com/repos/' + CLOUD.owner + '/' + CLOUD.repo + '/contents/content.js', { headers: authHeaders });

    if (fileRes.ok) {
      setResult('✅', '連線成功！已找到 content.js，可以正常同步 🎉', true);
    } else if (fileRes.status === 404) {
      setResult('✅', '連線成功！儲存庫已連通，首次點擊「💾 儲存」時會自動建立 content.js 🎉', true);
    } else {
      setResult('⚠️', '儲存庫連通，但讀取 content.js 時發生問題（HTTP ' + fileRes.status + '）', false);
    }
  } catch(e) {
    setResult('❌', '網路錯誤：' + (e.message || '無法連接到 GitHub'), false);
  }
};

function persist() {
  try {
    // 建立一個副本用於儲存，避免修改原始資料
    var dataToSave = JSON.parse(JSON.stringify(D));
    
    // 限制 editLog 最多保留 50 筆（原本 100 筆太多）
    if (dataToSave.editLog && dataToSave.editLog.length > 50) {
      dataToSave.editLog = dataToSave.editLog.slice(0, 50);
      D.editLog = dataToSave.editLog; // 同步更新原始資料
    }
    
    // 限制 inbox 最多保留 100 筆
    if (dataToSave.inbox && dataToSave.inbox.length > 100) {
      dataToSave.inbox = dataToSave.inbox.slice(0, 100);
      D.inbox = dataToSave.inbox;
    }
    
    // 清理 analytics 中過舊的資料（只保留最近 90 天）
    if (dataToSave.analytics && dataToSave.analytics.byDate) {
      var cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);
      var cutoffStr = cutoffDate.toISOString().split('T')[0];
      
      var cleanedByDate = {};
      for (var date in dataToSave.analytics.byDate) {
        if (date >= cutoffStr) {
          cleanedByDate[date] = dataToSave.analytics.byDate[date];
        }
      }
      dataToSave.analytics.byDate = cleanedByDate;
      D.analytics.byDate = cleanedByDate;
    }
    
    localStorage.setItem(KEY, JSON.stringify(dataToSave));
  }
  catch(e) { 
    if (e.name === 'QuotaExceededError') {
      console.log('儲存空間不足，開始清理...');
      
      // 第一次清理：減少 editLog 和 inbox
      D.editLog = D.editLog ? D.editLog.slice(0, 20) : [];
      D.inbox = D.inbox ? D.inbox.slice(0, 50) : [];
      if (D.analytics) D.analytics.byDate = {};
      
      try {
        localStorage.setItem(KEY, JSON.stringify(D));
        console.log('清理後儲存成功');
        return; // 儲存成功，直接返回
      } catch(e2) {
        console.log('第一次清理後仍失敗，進行深度清理...');
        
        // 第二次清理：更激進
        D.editLog = [];
        D.inbox = [];
        if (D.analytics) {
          D.analytics.byDate = {};
          D.analytics.byDevice = {};
          D.analytics.bySource = {};
        }
        
        try {
          localStorage.setItem(KEY, JSON.stringify(D));
          console.log('深度清理後儲存成功');
          Swal.fire({ 
            title:'✅ 已儲存', 
            html:'系統已清理舊資料以騰出空間',
            timer: 2000,
            icon:'success'
          });
          return;
        } catch(e3) {
          console.error('深度清理後仍失敗:', e3);
          Swal.fire({ 
            title:'儲存失敗', 
            html:'資料量過大無法儲存。<br>建議：<br>1. 減少作品集數量<br>2. 清除瀏覽器快取後重試', 
            icon:'error' 
          });
        }
      }
    } else {
      console.error('persist 發生其他錯誤:', e);
      Swal.fire({ title:'儲存錯誤', text: e.message, icon:'error' });
    }
  }
}

/* ============================================================
   THEME
============================================================ */
function applyTheme() {
  var t = D.theme || DEF.theme;
  var r = document.documentElement.style;
  r.setProperty('--bg', t.bgColor);
  r.setProperty('--bg2', t.bg2Color);
  r.setProperty('--bg3', t.bg3Color);
  r.setProperty('--gold', t.goldColor);
  r.setProperty('--t1', t.t1Color);
  r.setProperty('--t2', t.t2Color);
  r.setProperty('--t3', t.t3Color);
  r.setProperty('--hero-en-font', "'" + (t.heroEnFont || 'Iansui') + "','Noto Serif TC',sans-serif");
  r.setProperty('--hero-en-size', t.heroEnSize || '7.5rem');
  r.setProperty('--hero-zh-size', t.heroZhSize || '2.6rem');
  r.setProperty('--scroll-color', t.scrollColor || 'rgba(255,255,255,0.55)');
  r.setProperty('--scroll-size', t.scrollSize || '1rem');
  r.setProperty('--scroll-font', "'" + (t.scrollFont || 'Bebas Neue') + "',sans-serif");
  r.setProperty('--label-size', t.labelSize || '0.92rem');
  /* Ripple settings */
  var rippleOpacity = parseFloat(t.rippleOpacity || '0.85');
  var rippleColorBase = t.rippleColor || 'rgba(201,150,58,0.85)';
  
  // 如果顏色包含 rgba，替換 alpha 值；否則使用原值
  var rippleColorFinal = rippleColorBase;
  if (rippleColorBase.indexOf('rgba') === 0) {
    // 提取 rgb 部分並重新組合
    var rgbMatch = rippleColorBase.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      rippleColorFinal = 'rgba(' + rgbMatch[1] + ',' + rgbMatch[2] + ',' + rgbMatch[3] + ',' + rippleOpacity + ')';
    }
  }
  
  r.setProperty('--ripple-color', rippleColorFinal);
  r.setProperty('--ripple-size', t.rippleSize || '86px');
  r.setProperty('--ripple-width', t.rippleWidth || '3px');
  r.setProperty('--intro-logo-size', t.introLogoSize || '300px');
  r.setProperty('--datetime-size', t.datetimeSize || '.78rem');
  r.setProperty('--datetime-font', t.datetimeFont || 'Bebas Neue');
  r.setProperty('--intro-tagline-size', D.introTaglineSize || '1rem');
  /* Process number dim */
  var pno = parseFloat(t.procNumOpacity || '0.18');
  var pnho = parseFloat(t.procNumHoverOpacity || '1.0');
  document.querySelectorAll('.proc-num').forEach(function(el) {
    el.style.color = 'rgba(255,255,255,' + pno + ')';
  });
  // Add a <style> block for hover state
  var styleId = 'proc-hover-style';
  var existing = document.getElementById(styleId);
  if (existing) existing.remove();
  var st = document.createElement('style');
  st.id = styleId;
  st.textContent = '.process-step:hover .proc-num{color:rgba(201,150,58,' + pnho + ')!important}';
  document.head.appendChild(st);
}

function applyDragArrowStyles() {
  var bs = D.backendSettings || {};
  var color = bs.dragArrowColor || '#C9963A';
  var size = bs.dragArrowSize || 60;
  var opacity = bs.dragArrowOpacity || 0.4;
  var hoverOpacity = bs.dragArrowHoverOpacity || 0.9;
  var glowPx = bs.dragArrowActiveGlow !== undefined ? bs.dragArrowActiveGlow : 20;

  var styleId = 'drag-arrow-style';
  var existing = document.getElementById(styleId);
  if (existing) existing.remove();

  var st = document.createElement('style');
  st.id = styleId;
  st.textContent =
    '.drag-arrow{color:' + color + ';width:' + size + 'px;height:' + (size * 1.33) + 'px}' +
    '.drag-arrow.show{opacity:' + opacity + '}' +
    '.drag-arrow.show:hover,.drag-arrow.edge-hover{opacity:' + hoverOpacity + '}' +
    '.drag-arrow.edge-hover{filter:drop-shadow(0 0 ' + glowPx + 'px ' + color + ') brightness(1.8)!important;transform:translateY(-50%) scale(1.15)!important}';
  document.head.appendChild(st);
}

function getDragArrowSVG(dir, type) {
  var t = type || 'chevron';
  if (dir === 'left') {
    if (t === 'triangle') return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polygon points="28,12 12,30 28,48" fill="currentColor"/></svg>';
    if (t === 'angle') return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polyline points="26,18 14,30 26,42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (t === 'double') return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polyline points="28,15 18,30 28,45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="20,15 10,30 20,45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polyline points="24,15 13,30 24,45" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="13" y1="30" x2="30" y2="30" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/></svg>';
  } else {
    if (t === 'triangle') return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polygon points="12,12 28,30 12,48" fill="currentColor"/></svg>';
    if (t === 'angle') return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polyline points="14,18 26,30 14,42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (t === 'double') return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polyline points="12,15 22,30 12,45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="20,15 30,30 20,45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    return '<svg width="100%" height="100%" viewBox="0 0 40 60"><polyline points="16,15 27,30 16,45" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="27" y1="30" x2="10" y2="30" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/></svg>';
  }
}

function updateDragArrowIcons() {
  var bs = D.backendSettings || {};
  var iconType = bs.dragArrowIcon || 'chevron';
  var leftArrow = document.getElementById('drag-arrow-left');
  var rightArrow = document.getElementById('drag-arrow-right');
  if (leftArrow) leftArrow.innerHTML = getDragArrowSVG('left', iconType);
  if (rightArrow) rightArrow.innerHTML = getDragArrowSVG('right', iconType);
}

function applyDragGlowStyles() {
  var bs = D.backendSettings || {};
  var color = bs.pfGlowColor || '#C9963A';
  var size = bs.pfGlowSize !== undefined ? bs.pfGlowSize : 28;
  var range = bs.pfGlowRange !== undefined ? bs.pfGlowRange : 56;
  var brightness = bs.pfGlowBrightness !== undefined ? bs.pfGlowBrightness : 0.75;
  var softness = bs.pfGlowSoftness !== undefined ? bs.pfGlowSoftness : 0.4;

  var r = parseInt(color.slice(1,3),16)||201;
  var g = parseInt(color.slice(3,5),16)||150;
  var b = parseInt(color.slice(5,7),16)||58;

  var styleId = 'drag-glow-style';
  var existing = document.getElementById(styleId);
  if (existing) existing.remove();

  var st = document.createElement('style');
  st.id = styleId;
  st.textContent =
    '.pf-item.dragging{outline:3px solid ' + color + '!important;' +
    'box-shadow:0 0 ' + size + 'px rgba(' + r + ',' + g + ',' + b + ',' + brightness + '),0 0 ' + range + 'px rgba(' + r + ',' + g + ',' + b + ',' + softness + ')!important;z-index:20;transform:scale(1.02)}' +
    '.pf-item.drag-over{outline:3px solid ' + color + '!important;' +
    'box-shadow:0 0 ' + Math.round(size*0.7) + 'px rgba(' + r + ',' + g + ',' + b + ',' + (softness*1.2).toFixed(2) + ')!important}';
  document.head.appendChild(st);
}

function positionDragArrows() {
  var grid = document.getElementById('portfolio-list');
  var leftArrow = document.getElementById('drag-arrow-left');
  var rightArrow = document.getElementById('drag-arrow-right');
  if (!grid || !leftArrow || !rightArrow) return;
  var items = grid.querySelectorAll('.pf-item');
  var centerY;
  if (items.length >= 5) {
    // 第二行第一格（4欄格局，index 4）的垂直中心
    var r = items[4].getBoundingClientRect();
    centerY = r.top + r.height / 2;
  } else if (items.length > 0) {
    var r0 = items[0].getBoundingClientRect();
    var rN = items[items.length - 1].getBoundingClientRect();
    centerY = (r0.top + rN.bottom) / 2;
  } else {
    var rect = grid.getBoundingClientRect();
    centerY = rect.top + rect.height / 2;
  }
  leftArrow.style.top = centerY + 'px';
  rightArrow.style.top = centerY + 'px';
  leftArrow.style.transform = 'translateY(-50%)';
  rightArrow.style.transform = 'translateY(-50%)';
}

/* ============================================================
   INIT PAGE (runs after intro)
============================================================ */
function initPage() {
  updateDOM();
  initCarousel();
  initHeaderScroll();
  initReveal();
  initRipple();
  trackVisit();
  renderChecklist();
  renderFooterCopy();
  initClock();
  initWeather();
  initAdminBarHover();
  applyDragArrowStyles();
  applyDragGlowStyles();
  updateDragArrowIcons();
}

/* ============================================================
   EVENTS
============================================================ */
function bindEvents() {
  document.getElementById('pf-search').addEventListener('input', function(e) {
    SQ = e.target.value.toLowerCase().trim(); CF = 'All'; renderPF();
  });
  document.getElementById('contact-form').addEventListener('submit', function(e) {
    e.preventDefault();
    var nm = document.getElementById('f-name').value;
    var em = document.getElementById('f-email').value;
    var ph = document.getElementById('f-phone') ? document.getElementById('f-phone').value : '';
    var mg = document.getElementById('f-msg').value;
    var checks = document.querySelectorAll('#form-checks input:checked');
    var needsArr = [];
    for (var i = 0; i < checks.length; i++) needsArr.push(checks[i].value);
    var times = document.querySelectorAll('input[name="time"]:checked');
    var timeArr = [];
    for (var i = 0; i < times.length; i++) timeArr.push(times[i].value);
    var needsStr = needsArr.length ? '\n\n專案需求：' + needsArr.join('、') : '';
    var timeStr = timeArr.length ? '\n可聯繫時間：' + timeArr.join('、') : '';
    var phoneStr = ph ? '\n電話：' + ph : '';
    // Save to inbox
    if (!D.inbox) D.inbox = [];
    D.inbox.unshift({ 
      date: new Date().toLocaleString('zh-TW'), 
      time: new Date().toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      name: nm, 
      email: em, 
      phone: ph, 
      subject: '影像合作詢問',
      msg: mg, 
      needs: needsArr, 
      times: timeArr, 
      replied: false,
      read: false // 新訊息標記為未讀
    });
    if (D.inbox.length > 200) D.inbox = D.inbox.slice(0, 200);
    persist();
    updateInboxBadge(); // 更新徽章
    var toAddr = D.mailToAddress || D.contactEmail;
    var sub = encodeURIComponent('【影像合作詢問】來自 ' + nm);
    var bod = encodeURIComponent('姓名：' + nm + '\n信箱：' + em + phoneStr + needsStr + timeStr + '\n\n補充說明：\n' + mg);
    window.location.href = 'mailto:' + toAddr + '?subject=' + sub + '&body=' + bod;
  });
  var cb = document.getElementById('hero-contact-btn');
  if (cb) cb.addEventListener('mouseenter', function() {
    var b = document.getElementById('header-brand');
    if (b) { b.style.animation = 'none'; requestAnimationFrame(function() { b.style.animation = 'brandShake .55s ease'; }); }
  });
}

/* ============================================================
   ROLE CHECK
============================================================ */
function canEdit(key) {
  if (!CU) return false;
  
  // 超級執行長：可編輯所有欄位
  if (CU.role === 'super_admin') return true;
  
  // 營運長和優秀人員：都必須檢查自定義權限
  // 只有超級執行長勾選的項目才能編輯
  if (CU.permissions && CU.permissions.length > 0) {
    return CU.permissions.indexOf(key) !== -1;
  }
  
  // 如果沒有自定義權限，則無法編輯任何項目
  return false;
}

/* ============================================================
   DOM UPDATE
============================================================ */
function getVal(obj, key) {
  if (key.indexOf('.') !== -1) {
    var parts = key.split('.'); return obj[parts[0]] ? obj[parts[0]][parts[1]] : undefined;
  }
  return obj[key];
}

function updateDOM() {
  var logos = ['site-logo','footer-logo'];
  for (var i = 0; i < logos.length; i++) {
    var el = document.getElementById(logos[i]);
    if (el) el.src = D.logoData;
  }
  var ee = document.getElementById('email-link'), fe = document.getElementById('footer-email');
  if (ee) { ee.href = 'mailto:' + D.contactEmail; ee.textContent = D.contactEmail; }
  if (fe) { fe.href = 'mailto:' + D.contactEmail; fe.textContent = D.contactEmail; }

  var lh = 'https://line.me/ti/p/~' + (D.social.lineId || '');
  var lineIds = ['nav-line-btn','mobile-line-btn'];
  for (var i = 0; i < lineIds.length; i++) { var el = document.getElementById(lineIds[i]); if (el) el.href = lh; }

  var pu = encodeURIComponent(location.href);
  var sfb = document.getElementById('share-fb'), sln = document.getElementById('share-line');
  var sig = document.getElementById('share-ig'), sth = document.getElementById('share-threads'), syt = document.getElementById('share-youtube');
  
  if (sfb) {
    sfb.href = 'https://www.facebook.com/sharer/sharer.php?u=' + pu;
    sfb.style.display = (D.social && D.social.facebookShow === false) ? 'none' : '';
  }
  if (sln) {
    sln.href = 'https://social-plugins.line.me/lineit/share?url=' + pu;
    sln.style.display = (D.social && D.social.lineShow === false) ? 'none' : '';
  }
  if (sig && D.social) {
    sig.href = D.social.instagramLink || 'https://www.instagram.com/';
    sig.style.display = (D.social.instagramShow === false) ? 'none' : '';
  }
  if (sth && D.social) {
    sth.href = D.social.threadsLink || 'https://www.threads.net/';
    sth.style.display = (D.social.threadsShow === false) ? 'none' : '';
  }
  if (syt && D.social) {
    syt.href = D.social.youtubeLink || 'https://www.youtube.com/';
    syt.style.display = (D.social.youtubeShow === false) ? 'none' : '';
  }

  var els = document.querySelectorAll('[data-key]');
  for (var i = 0; i < els.length; i++) {
    var el = els[i], k = el.getAttribute('data-key'), v = getVal(D, k);
    if (v !== undefined && v !== null) {
      if (el.getAttribute('data-type') === 'html') el.innerHTML = v;
      else el.textContent = v;
    }
    var editable = canEdit(k);
    el.contentEditable = editable ? 'true' : 'false';
    el.style.cursor = editable ? 'text' : '';
  }
  renderFooterCopy();
  renderSocial();
  renderFooterSocial();
  renderPF();
  renderServices();
  renderMarquee();
  updateAdminUI();
  if (CU) updateInboxBadge();
}

// 渲染跑馬燈
function renderMarquee() {
  var marquee = document.getElementById('news-marquee');
  var container = document.getElementById('news-marquee-content');
  if (!marquee || !container) return;
  
  // 檢查是否顯示
  if (D.marqueeShow === false) {
    marquee.style.display = 'none';
    return;
  }
  
  var items = D.marqueeItems || [];
  if (items.length === 0) {
    marquee.style.display = 'none';
    return;
  }
  
  marquee.style.display = 'block';
  
  var html = '';
  for (var i = 0; i < items.length; i++) {
    html += '<span style="margin:0 60px;color:' + (D.marqueeColor || '#FFFFFF') + ';font-size:.9rem;font-weight:500">' + items[i] + '</span>';
  }
  // 重複一次讓跑馬無縫循環
  html += html;
  
  container.innerHTML = html;
  
  // 設定速度
  var speed = D.marqueeSpeed || 30;
  container.style.animation = 'marquee ' + speed + 's linear infinite';
}

// 根據作品分類自動生成服務項目
function renderServices() {
  var container = document.querySelector('.services-grid');
  if (!container) return;
  
  var categories = D.pfCategories || [];
  if (categories.length === 0) return;
  
  var icons = {
    '品牌形象廣告': 'fa-solid fa-camera',
    '企業形象廣告': 'fa-solid fa-clapperboard',
    '音樂錄影帶': 'fa-solid fa-music',
    '活動紀錄': 'fa-solid fa-calendar-check',
    '動畫製作': 'fa-regular fa-lightbulb',
    '短影音': 'fa-solid fa-mobile-screen-button',
    '商業廣告': 'fa-regular fa-building'
  };
  
  var html = '';
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    
    // 檢查是否要顯示此服務項目
    var svcData = D.serviceDescriptions && D.serviceDescriptions[cat];
    var shouldShow = true; // 預設顯示
    var desc = '專業' + cat + '製作服務';
    
    if (svcData) {
      // 新格式：{ description: '...', show: true/false }
      if (typeof svcData === 'object') {
        shouldShow = svcData.show !== false; // 只有明確設為 false 才不顯示
        desc = svcData.description || desc;
      } else {
        // 舊格式：字串（預設顯示）
        desc = svcData;
        shouldShow = true;
      }
    }
    // 如果沒有 svcData，代表是新分類，預設顯示
    
    if (!shouldShow) continue; // 跳過不顯示的項目
    
    // 取得 icon
    var icon = icons[cat] || 'fa-solid fa-film';
    var iconHtml = '';
    
    if (svcData && typeof svcData === 'object' && svcData.icon) {
      // 如果有自訂 icon
      if (svcData.icon.startsWith('data:image') || svcData.icon.startsWith('http')) {
        // 圖片格式
        iconHtml = '<img src="' + svcData.icon + '" style="width:100%;height:100%;object-fit:contain">';
      } else {
        // Font Awesome class
        icon = svcData.icon;
        iconHtml = '<i class="' + icon + '"></i>';
      }
    } else {
      iconHtml = '<i class="' + icon + '"></i>';
    }
    
    html += '<div class="service-card reveal"><div class="svc-icon">' + iconHtml + '</div>';
    html += '<div class="svc-body"><h3>' + cat + '</h3><p>' + desc + '</p></div></div>';
  }
  
  container.innerHTML = html;
  
  // 同時更新尾頁服務項目（也要過濾）
  var footerServices = document.getElementById('footer-services');
  if (footerServices) {
    var footerHtml = '';
    for (var i = 0; i < categories.length; i++) {
      var cat = categories[i];
      var svcData = D.serviceDescriptions && D.serviceDescriptions[cat];
      var shouldShow = true; // 預設顯示
      
      if (svcData && typeof svcData === 'object') {
        shouldShow = svcData.show !== false; // 只有明確設為 false 才不顯示
      }
      
      if (shouldShow) {
        footerHtml += '<li><a href="#services">' + cat + '</a></li>';
      }
    }
    footerServices.innerHTML = footerHtml;
  }
}

function renderFooterCopy() {
  var el = document.getElementById('footer-copy-el'); if (!el) return;
  var tpl = D.footerCopyTpl || DEF.footerCopyTpl;
  el.textContent = tpl.replace('{YEAR}', new Date().getFullYear());

  // 更新 hero subtitle
  var heroSub = document.querySelector('.hero-subtitle, #hero-subtitle');
  if (heroSub && D.heroSubtitle) {
    heroSub.textContent = D.heroSubtitle;
  }
}

/* ============================================================
   SAVE
============================================================ */
window.saveChanges = function(showAlert) {
  if (showAlert === undefined) showAlert = true;
  var changed = [];
  var els = document.querySelectorAll('[data-key]');
  for (var i = 0; i < els.length; i++) {
    var el = els[i], k = el.getAttribute('data-key');
    if (!canEdit(k)) continue;
    var v = el.getAttribute('data-type') === 'html' ? el.innerHTML : el.innerText.trim();
    var old = getVal(D, k);
    if (k.indexOf('.') !== -1) { var p = k.split('.'); if (D[p[0]]) D[p[0]][p[1]] = v; }
    else D[k] = v;
    if (String(old) !== String(v)) changed.push(k);
  }
  if (CU && changed.length) {
    D.editLog.unshift({ user:CU.name, username:CU.username, role:CU.role, date:new Date().toLocaleString('zh-TW'), keys:changed, snapshot:JSON.stringify(D) });
    if (D.editLog.length > 100) D.editLog = D.editLog.slice(0, 100);
  }
  persist(); updateDOM();
  if (showAlert) Swal.fire({ title:'✓ 儲存成功', timer:1200, showConfirmButton:false, icon:'success' });
  // ☁️ 自動同步到 GitHub（靜默，防抖 800ms：連續快速儲存只觸發一次推送）
  if (CU && CLOUD.token && CLOUD.owner && CLOUD.repo) {
    clearTimeout(_cloudPushDebounce);
    _cloudPushDebounce = setTimeout(function() { cloudPush(true); }, 800);
  }
};

/* ============================================================
   CAROUSEL
============================================================ */
function initCarousel() {
  var tr = document.getElementById('carousel-track'), dt = document.getElementById('carousel-dots');
  if (!tr || !dt) return;
  tr.innerHTML = ''; dt.innerHTML = '';
  for (var i = 0; i < D.carouselImages.length; i++) {
    (function(idx, src) {
      var s = document.createElement('div');
      s.className = 'carousel-slide' + (idx === 0 ? ' active pan-r' : '');
      s.style.backgroundImage = "url('" + src + "')";
      tr.appendChild(s);
      var d = document.createElement('button');
      d.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
      d.onclick = function() { goSlide(idx); };
      dt.appendChild(d);
    })(i, D.carouselImages[i]);
  }
  carTimer = setInterval(function() { goSlide((carIdx + 1) % D.carouselImages.length); }, 6000);
}
function goSlide(idx) {
  var slides = document.querySelectorAll('.carousel-slide'), dots = document.querySelectorAll('.carousel-dot');
  if (!slides.length) return;
  slides[carIdx].className = 'carousel-slide';
  dots[carIdx].className = 'carousel-dot';
  carIdx = idx;
  slides[carIdx].className = 'carousel-slide active ' + (carIdx % 2 === 0 ? 'pan-r' : 'pan-l');
  dots[carIdx].className = 'carousel-dot active';
  clearInterval(carTimer);
  carTimer = setInterval(function() { goSlide((carIdx + 1) % D.carouselImages.length); }, 6000);
}

/* ============================================================
   RIPPLE — fixed centering with transform
============================================================ */
function initRipple() {
  document.addEventListener('click', function(e) {
    var r = document.createElement('div');
    r.className = 'mk5-ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    r.addEventListener('animationend', function() { if (r.parentNode) r.parentNode.removeChild(r); });
  }, { passive: true });
}

/* ============================================================
   ADMIN BAR HOVER (滑鼠移至底部時滑出)
============================================================ */
function initAdminBarHover() {
  var adminBar = document.getElementById('admin-bar');
  if (!adminBar) return;
  
  var hoverThreshold = 100; // 底部 100px 範圍
  var checkTimer = null;
  
  document.addEventListener('mousemove', function(e) {
    if (!CU) return; // 未登入時不啟用
    
    var windowHeight = window.innerHeight;
    var mouseY = e.clientY;
    var distanceFromBottom = windowHeight - mouseY;
    
    if (distanceFromBottom <= hoverThreshold) {
      adminBar.classList.add('hover');
      
      // 清除計時器
      if (checkTimer) clearTimeout(checkTimer);
    } else {
      // 延遲移除，避免閃爍
      if (checkTimer) clearTimeout(checkTimer);
      checkTimer = setTimeout(function() {
        if (!adminBar.matches(':hover')) {
          adminBar.classList.remove('hover');
        }
      }, 300);
    }
  });
  
  // 當滑鼠離開 admin bar 時，檢查滑鼠位置
  adminBar.addEventListener('mouseleave', function() {
    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = setTimeout(function() {
      adminBar.classList.remove('hover');
    }, 300);
  });
}

/* ============================================================
   SOCIAL
============================================================ */
function renderSocial() {
  var c = document.getElementById('social-container'), ed = document.getElementById('social-edit');
  if (!c) return;
  var defs = [
    { k:'facebookLink', i:'fab fa-facebook-f', l:'Facebook' },
    { k:'instagramLink', i:'fab fa-instagram', l:'Instagram' },
    { k:'lineId', i:'fab fa-line', l:'LINE', pre:'https://line.me/ti/p/~', isId:true }
  ];
  var html = '';
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i], v = D.social[d.k] || '', h = d.isId ? d.pre + v : v;
    html += '<a href="' + h + '" target="_blank" rel="noopener" class="social-btn" title="' + d.l + '"><i class="' + d.i + '"></i></a>';
  }
  c.innerHTML = html;
  var lh = 'https://line.me/ti/p/~' + (D.social.lineId || '');
  var lineEls = ['nav-line-btn','mobile-line-btn'];
  for (var i = 0; i < lineEls.length; i++) { var el = document.getElementById(lineEls[i]); if (el) el.href = lh; }
  if (CU && ed) {
    ed.classList.add('show');
    var edHtml = '<strong style="color:var(--gold)">社群連結設定：</strong><br>';
    for (var i = 0; i < defs.length; i++) {
      var d = defs[i];
      edHtml += '<div style="margin-top:8px"><span style="color:var(--gold);font-size:.75rem">' + d.l + ':</span> ';
      edHtml += '<span contenteditable="true" data-sk="' + d.k + '" style="color:var(--t2);font-size:.75rem;outline:1px dashed rgba(201,150,58,.3);padding:2px 4px">' + (D.social[d.k] || '') + '</span></div>';
    }
    ed.innerHTML = edHtml;
    var spans = ed.querySelectorAll('[data-sk]');
    for (var i = 0; i < spans.length; i++) {
      (function(span) {
        span.addEventListener('blur', function() { D.social[span.getAttribute('data-sk')] = span.textContent.trim(); renderSocial(); renderFooterSocial(); });
      })(spans[i]);
    }
  } else if (ed) ed.classList.remove('show');
}
function renderFooterSocial() {
  var c = document.getElementById('footer-social'); if (!c) return;
  var defs = [
    { k:'facebookLink', i:'fab fa-facebook-f' },
    { k:'instagramLink', i:'fab fa-instagram' },
    { k:'lineId', i:'fab fa-line', isId:true, pre:'https://line.me/ti/p/~' }
  ];
  var html = '';
  for (var i = 0; i < defs.length; i++) {
    var d = defs[i], v = D.social[d.k] || '', h = d.isId ? d.pre + v : v;
    html += '<a href="' + h + '" target="_blank" rel="noopener" class="fsocial-btn"><i class="' + d.i + '"></i></a>';
  }
  c.innerHTML = html;
}

/* ============================================================
   PORTFOLIO — click-to-play with youtube-nocookie.com
============================================================ */
function getYTId(url) {
  if (!url) return '';
  var m = url.match(/(?:v=|\/embed\/|\/v\/|youtu\.be\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : (url.length === 11 ? url : '');
}

/* Portfolio drag and drop */
var draggedItem = null;
var draggedIndex = -1;
var autoScrollTimer = null;
var lastScrollDirection = null;
var lastDragOverItem = null;

function handleDragStart(e) {
  draggedItem = this;
  draggedIndex = parseInt(this.dataset.index);
  this.style.opacity = '0.9';
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';

  var totalItems = D.portfolio.length;
  var totalPages = Math.ceil(totalItems / PF_PER_PAGE);
  if (totalPages > 1) {
    var leftArrow = document.getElementById('drag-arrow-left');
    var rightArrow = document.getElementById('drag-arrow-right');
    if (leftArrow) leftArrow.classList.add('show');
    if (rightArrow) rightArrow.classList.add('show');
    positionDragArrows();
  }
}

function handleDragOver(e) {
  if (e.preventDefault) e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  // 檢查滑鼠位置，自動翻頁
  var viewportWidth = window.innerWidth;
  var mouseX = e.clientX;
  var edgeThreshold = 100; // 邊緣觸發區域 100px
  
  var totalPages = Math.ceil(D.portfolio.length / PF_PER_PAGE);
  var direction = null;
  
  // 滑鼠在右邊緣 - 下一頁
  if (mouseX > viewportWidth - edgeThreshold && PF_PAGE < totalPages - 1) {
    direction = 'next';
  }
  // 滑鼠在左邊緣 - 上一頁
  else if (mouseX < edgeThreshold && PF_PAGE > 0) {
    direction = 'prev';
  }
  
  // 更新箭頭的 edge-hover 樣式
  var leftArrow = document.getElementById('drag-arrow-left');
  var rightArrow = document.getElementById('drag-arrow-right');
  if (leftArrow) leftArrow.classList.toggle('edge-hover', direction === 'prev');
  if (rightArrow) rightArrow.classList.toggle('edge-hover', direction === 'next');

  // 如果方向改變，清除舊計時器並設置新的
  var cooldown = (D.backendSettings && D.backendSettings.dragArrowCooldown) || 300;
  if (direction && direction !== lastScrollDirection) {
    if (autoScrollTimer) {
      clearTimeout(autoScrollTimer);
    }

    lastScrollDirection = direction;
    autoScrollTimer = setTimeout(function() {
      if (direction === 'next') {
        PF_PAGE++;
      } else if (direction === 'prev') {
        PF_PAGE--;
      }
      renderPF();
      document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
      autoScrollTimer = null;
      lastScrollDirection = null;
    }, cooldown);
  }
  // 如果離開邊緣，清除計時器
  else if (!direction && lastScrollDirection) {
    if (autoScrollTimer) {
      clearTimeout(autoScrollTimer);
      autoScrollTimer = null;
    }
    lastScrollDirection = null;
  }
  
  return false;
}

function handleDragEnter(e) {
  if (this !== draggedItem) {
    if (lastDragOverItem && lastDragOverItem !== this) {
      lastDragOverItem.classList.remove('drag-over');
    }
    this.classList.add('drag-over');
    lastDragOverItem = this;
  }
}

function handleDragLeave(e) {
  // 拖曳離開時保留發光，直到拖曳到新位置或結束
}

function handleDrop(e) {
  if (e.stopPropagation) e.stopPropagation();
  if (lastDragOverItem) { lastDragOverItem.classList.remove('drag-over'); lastDragOverItem = null; }
  
  // 清除翻頁計時器
  if (autoScrollTimer) {
    clearTimeout(autoScrollTimer);
    autoScrollTimer = null;
    lastScrollDirection = null;
  }
  
  if (draggedItem !== this && draggedIndex !== -1) {
    var dropIndex = parseInt(this.dataset.index);
    
    // 移除原位置的項目
    var item = D.portfolio.splice(draggedIndex, 1)[0];
    
    // 插入到新位置
    D.portfolio.splice(dropIndex, 0, item);
    
    persist();
    renderPF();
  }
  
  return false;
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  this.classList.remove('dragging');
  var items = document.querySelectorAll('.pf-item');
  items.forEach(function(item) {
    item.style.border = '';
    item.style.boxShadow = '';
    item.classList.remove('dragging');
  });

  // 清除拖曳目標發光
  if (lastDragOverItem) { lastDragOverItem.classList.remove('drag-over'); lastDragOverItem = null; }

  // 隱藏箭頭，清除 edge-hover
  var leftArrow = document.getElementById('drag-arrow-left');
  var rightArrow = document.getElementById('drag-arrow-right');
  if (leftArrow) { leftArrow.classList.remove('show'); leftArrow.classList.remove('edge-hover'); }
  if (rightArrow) { rightArrow.classList.remove('show'); rightArrow.classList.remove('edge-hover'); }

  // 清除翻頁計時器
  if (autoScrollTimer) {
    clearTimeout(autoScrollTimer);
    autoScrollTimer = null;
    lastScrollDirection = null;
  }
}

// 在登入後為作品集項目添加拖曳事件
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('dragstart', function(e) {
    if (e.target.classList.contains('pf-item') && CU) {
      handleDragStart.call(e.target, e);
    }
  });
  
  document.addEventListener('dragover', function(e) {
    if (e.target.closest('.pf-item') && CU) {
      handleDragOver.call(e.target.closest('.pf-item'), e);
    }
  });
  
  document.addEventListener('dragenter', function(e) {
    if (e.target.closest('.pf-item') && CU) {
      handleDragEnter.call(e.target.closest('.pf-item'), e);
    }
  });
  
  document.addEventListener('dragleave', function(e) {
    if (e.target.closest('.pf-item') && CU) {
      handleDragLeave.call(e.target.closest('.pf-item'), e);
    }
  });
  
  document.addEventListener('drop', function(e) {
    if (e.target.closest('.pf-item') && CU) {
      handleDrop.call(e.target.closest('.pf-item'), e);
    }
  });
  
  document.addEventListener('dragend', function(e) {
    if (e.target.classList.contains('pf-item') && CU) {
      handleDragEnd.call(e.target, e);
    }
  });

  // 箭頭拖曳事件：拖曳進入箭頭時立即翻頁 + 發光
  var arrowLeft = document.getElementById('drag-arrow-left');
  var arrowRight = document.getElementById('drag-arrow-right');
  function setupArrowDragNav(arrowEl, dir) {
    if (!arrowEl) return;
    arrowEl.addEventListener('dragenter', function(e) {
      if (!CU || !draggedItem) return;
      e.preventDefault();
      if (autoScrollTimer) { clearTimeout(autoScrollTimer); autoScrollTimer = null; lastScrollDirection = null; }
      arrowEl.classList.add('edge-hover');
      window.pfArrowNav(dir);
      setTimeout(positionDragArrows, 50);
    });
    arrowEl.addEventListener('dragleave', function(e) {
      arrowEl.classList.remove('edge-hover');
    });
    arrowEl.addEventListener('dragover', function(e) {
      if (!CU || !draggedItem) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
  }
  setupArrowDragNav(arrowLeft, -1);
  setupArrowDragNav(arrowRight, 1);

  // 捲動時重新定位箭頭，維持在作品集欄位正中間
  window.addEventListener('scroll', function() {
    var pfSection = document.getElementById('portfolio');
    if (!pfSection) return;
    var r = pfSection.getBoundingClientRect();
    if (r.bottom > 0 && r.top < window.innerHeight) positionDragArrows();
  }, { passive: true });
});

function renderPF() {
  var c = document.getElementById('portfolio-list'), f = document.getElementById('pf-filters');
  var paginationDiv = document.getElementById('pf-pagination');
  if (!c || !f) return;

  var cats = ['All'].concat(D.pfCategories);
  var fHtml = '';
  for (var i = 0; i < cats.length; i++) {
    var ct = cats[i];
    if (ct === 'All') {
      // 「全部」按鈕沒有刪除功能
      fHtml += '<button class="filter-btn' + (ct === CF ? ' active' : '') + '" onclick="setFilter(\'' + ct + '\')">' + '全部' + '</button>';
    } else {
      // 其他分類按鈕添加包裝和刪除鈕
      fHtml += '<div class="filter-btn-wrap">';
      fHtml += '<button class="filter-btn' + (ct === CF ? ' active' : '') + '" onclick="setFilter(\'' + ct.replace(/'/g, "\\'") + '\')">' + ct + '</button>';
      if (CU) {
        fHtml += '<button class="filter-del-btn" onclick="event.stopPropagation();deleteCategory(\'' + ct.replace(/'/g, "\\'") + '\')" title="刪除此分類">×</button>';
      }
      fHtml += '</div>';
    }
  }
  f.innerHTML = fHtml;

  var items = D.portfolio.slice();
  if (SQ) {
    items = items.filter(function(item) {
      return item.title.toLowerCase().indexOf(SQ) !== -1 || item.cat.toLowerCase().indexOf(SQ) !== -1 || item.description.toLowerCase().indexOf(SQ) !== -1;
    });
  } else if (CF !== 'All') {
    items = items.filter(function(item) { return item.cat === CF; });
  }

  if (!items.length) { 
    c.innerHTML = '<div class="pf-empty">沒有找到符合的作品</div>'; 
    if (paginationDiv) paginationDiv.innerHTML = '';
    return; 
  }

  // 計算分頁
  var totalPages = Math.ceil(items.length / PF_PER_PAGE);
  if (PF_PAGE >= totalPages) PF_PAGE = totalPages - 1;
  if (PF_PAGE < 0) PF_PAGE = 0;
  
  var start = PF_PAGE * PF_PER_PAGE;
  var end = Math.min(start + PF_PER_PAGE, items.length);
  var pageItems = items.slice(start, end);

  var html = '';
  for (var i = 0; i < pageItems.length; i++) {
    var item = pageItems[i], vid = getYTId(item.url);
    if (!vid) continue;
    var idx = D.portfolio.indexOf(item);
    var thumb = 'https://img.youtube.com/vi/' + vid + '/hqdefault.jpg';
    var isVertical = item.cat === '短影音';
    html += '<div class="pf-item' + (isVertical ? ' pf-item-vertical' : '') + '" data-vid="' + vid + '" data-index="' + idx + '" onmouseenter="startHoverPreview(this)" onmouseleave="stopHoverPreview(this)">';
    html += '<div class="pf-admin-btns' + (CU ? ' show' : '') + '">';
    html += '<button class="pf-admin-btn" onclick="event.stopPropagation();editPortfolio(' + idx + ')"><i class="fa-solid fa-pen fa-xs"></i></button>';
    html += '<button class="pf-admin-btn del" onclick="event.stopPropagation();delPortfolio(' + idx + ')"><i class="fa-solid fa-trash fa-xs"></i></button>';
    html += '</div>';
    html += '<div class="pf-thumb-wrap" onclick="playVid(this)">';
    html += '<div class="pf-thumb" style="background-image:url(\'' + thumb + '\')"></div>';
    html += '<div class="pf-overlay"><i class="fa-brands fa-youtube pf-play-icon"></i></div>';
    html += '<button class="pf-close-btn" onclick="event.stopPropagation();closeVid(this)"><i class="fa-solid fa-xmark"></i></button>';
    html += '<span class="pf-badge">' + item.cat + '</span>';
    html += '</div>';
    html += '<div class="pf-info"><h3>' + item.title + '</h3><p>' + item.description + '</p></div>';
    html += '</div>';
  }
  c.innerHTML = html;
  
  // 渲染分頁按鈕
  if (paginationDiv && totalPages > 1) {
    var pagHtml = '';
    
    // 上一頁按鈕
    pagHtml += '<button class="pf-page-btn" onclick="goToPage(' + Math.max(0, PF_PAGE - 1) + ')" ' + (PF_PAGE === 0 ? 'disabled' : '') + '>◀</button>';
    
    // 頁碼按鈕
    var maxButtons = 10;
    var startPage = Math.max(0, PF_PAGE - 4);
    var endPage = Math.min(totalPages, startPage + maxButtons);
    
    if (endPage - startPage < maxButtons) {
      startPage = Math.max(0, endPage - maxButtons);
    }
    
    for (var p = startPage; p < endPage; p++) {
      pagHtml += '<button class="pf-page-btn' + (p === PF_PAGE ? ' active' : '') + '" onclick="goToPage(' + p + ')">' + (p + 1) + '</button>';
    }
    
    if (endPage < totalPages) {
      pagHtml += '<span style="color:var(--t3);padding:0 8px">...</span>';
    }
    
    // 下一頁按鈕
    pagHtml += '<button class="pf-page-btn" onclick="goToPage(' + Math.min(totalPages - 1, PF_PAGE + 1) + ')" ' + (PF_PAGE === totalPages - 1 ? 'disabled' : '') + '>▶</button>';
    
    paginationDiv.innerHTML = pagHtml;
  } else if (paginationDiv) {
    paginationDiv.innerHTML = '';
  }
  
  // 拖曳中才顯示箭頭（page flip 後維持 show）
  var pfLeft = document.getElementById('drag-arrow-left');
  var pfRight = document.getElementById('drag-arrow-right');
  if (pfLeft && pfRight) {
    pfLeft.classList.toggle('show', totalPages > 1 && !!draggedItem);
    pfRight.classList.toggle('show', totalPages > 1 && !!draggedItem);
  }

  // 啟用拖曳排序（只有登入用戶）
  if (CU) {
    setTimeout(function() {
      var items = document.querySelectorAll('.pf-item');
      items.forEach(function(item) {
        item.setAttribute('draggable', 'true');
        item.style.cursor = 'move';
      });
      positionDragArrows();
    }, 100);
  } else {
    setTimeout(positionDragArrows, 100);
  }
}

window.goToPage = function(page) {
  PF_PAGE = page;
  renderPF();
  document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
};

window.pfArrowNav = function(dir) {
  var items = D.portfolio.slice();
  if (CF !== 'All') items = items.filter(function(item) { return item.cat === CF; });
  if (SQ) items = items.filter(function(item) {
    return item.title.toLowerCase().indexOf(SQ) !== -1 || item.cat.toLowerCase().indexOf(SQ) !== -1;
  });
  var totalPages = Math.ceil(items.length / PF_PER_PAGE);
  var newPage = PF_PAGE + dir;
  if (newPage >= 0 && newPage < totalPages) {
    PF_PAGE = newPage;
    renderPF();
    document.getElementById('portfolio').scrollIntoView({ behavior: 'smooth' });
  }
};

/* Hover preview system */
var hoverTimeouts = {};

/* Hover preview disabled - using static thumbnails instead */
window.startHoverPreview = function(item) {
  // 不再載入 YouTube iframe 進行預覽
  // 改用靜態封面圖，節省資源並避免衝突
};

window.stopHoverPreview = function(item) {
  // 預覽功能已停用
};

window.playVid = function(wrap) {
  var item = wrap.parentElement;
  var vid = item.getAttribute('data-vid');
  if (!vid) return;
  
  // 停止 hover 預覽
  var prevIframe = item.querySelector('.pf-preview-iframe');
  if (prevIframe) prevIframe.parentNode.removeChild(prevIframe);
  item.classList.remove('hovering');
  
  // 打開 modal 播放
  openVideoModal(vid);
};

window.openVideoModal = function(videoId) {
  var modal = document.getElementById('video-modal');
  var player = document.getElementById('video-modal-player');
  
  // 創建 iframe - 使用最穩定的格式
  // 移除會衝突的 credentialless
  // 移除會出錯的 origin 驗證
  // 改回最穩定 youtube.com/embed
  var iframe = document.createElement('iframe');
  iframe.src = 'https://www.youtube.com/embed/' + videoId + 
    '?autoplay=1&mute=0&rel=0&modestbranding=1';
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('frameborder', '0');
  
  player.innerHTML = '';
  player.appendChild(iframe);
  modal.classList.add('active');
  
  // 防止背景滾動
  document.body.style.overflow = 'hidden';
};

window.closeVideoModal = function() {
  var modal = document.getElementById('video-modal');
  var player = document.getElementById('video-modal-player');
  
  player.innerHTML = '';
  modal.classList.remove('active');
  
  // 恢復背景滾動
  document.body.style.overflow = '';
};

window.closeVid = function(btn) {
  var item = btn.parentElement ? btn.parentElement.parentElement : null;
  if (!item) return;
  var iframe = item.querySelector('.pf-yt-iframe');
  if (iframe) iframe.parentNode.removeChild(iframe);
  item.classList.remove('playing');
};

window.setFilter = function(ct) { CF = ct; SQ = ''; PF_PAGE = 0; document.getElementById('pf-search').value = ''; renderPF(); };

window.deleteCategory = function(catName) {
  // 確認刪除
  Swal.fire({
    title: '確定刪除分類？',
    html: '分類：<strong>' + catName + '</strong><br><br>⚠️ 此操作將：<br>• 從分類列表中移除<br>• 該分類的作品不會被刪除<br>• 服務項目說明會被移除',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: '確定刪除',
    cancelButtonText: '取消',
    confirmButtonColor: '#B52020'
  }).then(function(result) {
    if (result.isConfirmed) {
      // 從 pfCategories 中移除
      var idx = D.pfCategories.indexOf(catName);
      if (idx !== -1) {
        D.pfCategories.splice(idx, 1);
      }
      
      // 從 serviceDescriptions 中移除
      if (D.serviceDescriptions && D.serviceDescriptions[catName]) {
        delete D.serviceDescriptions[catName];
      }
      
      // 如果當前篩選是這個分類，切換到「全部」
      if (CF === catName) {
        CF = 'All';
      }
      
      // 儲存並重新渲染
      persist();
      renderPF();
      renderServices();
      
      Swal.fire({
        title: '✅ 已刪除',
        text: '分類「' + catName + '」已移除',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    }
  });
};

window.editPortfolio = function(idx) {
  var item = idx === -1 ? { url:'', title:'', cat:'', description:'' } : D.portfolio[idx];
  var catOpts = '';
  for (var i = 0; i < D.pfCategories.length; i++) {
    catOpts += '<option value="' + D.pfCategories[i] + '"' + (D.pfCategories[i] === item.cat ? ' selected' : '') + '>' + D.pfCategories[i] + '</option>';
  }
  catOpts += '<option value="__custom__">＋ 自訂分類</option>';
  Swal.fire({
    title: idx === -1 ? '新增作品' : '編輯作品', width: 540,
    html: '<input id="pu" class="swal2-input" value="' + (item.url||'') + '" placeholder="YouTube 完整網址">' +
          '<input id="pt" class="swal2-input" value="' + (item.title||'') + '" placeholder="作品標題">' +
          '<select id="pc" class="swal2-input">' + catOpts + '</select>' +
          '<input id="pc2" class="swal2-input" placeholder="自訂分類名稱" style="display:none;margin:4px auto 0">' +
          '<textarea id="pd" class="swal2-textarea" placeholder="說明">' + (item.description||'') + '</textarea>',
    didOpen: function() {
      document.getElementById('pc').onchange = function() {
        document.getElementById('pc2').style.display = this.value === '__custom__' ? 'block' : 'none';
      };
    },
    showCancelButton: true, confirmButtonText: idx === -1 ? '新增' : '儲存', cancelButtonText: '取消',
    preConfirm: function() {
      var url = document.getElementById('pu').value.trim();
      var title = document.getElementById('pt').value.trim();
      var sel = document.getElementById('pc').value;
      var cat = sel === '__custom__' ? document.getElementById('pc2').value.trim() : sel;
      if (!url || !title || !cat) { Swal.showValidationMessage('請填寫所有必填欄位'); return false; }
      if (!getYTId(url)) { Swal.showValidationMessage('請輸入有效的 YouTube 連結'); return false; }
      if (sel === '__custom__' && cat && D.pfCategories.indexOf(cat) === -1) D.pfCategories.push(cat);
      return { url:url, title:title, cat:cat, description:document.getElementById('pd').value.trim() };
    }
  }).then(function(r) {
    if (r.isConfirmed && r.value) {
      if (idx === -1) D.portfolio.push(r.value); else D.portfolio[idx] = r.value;
      saveChanges(false);
    }
  });
};

window.delPortfolio = function(idx) {
  Swal.fire({ title:'確定刪除？', text:'「' + D.portfolio[idx].title + '」', icon:'warning', showCancelButton:true, confirmButtonText:'刪除', cancelButtonText:'取消', confirmButtonColor:'#B52020' })
  .then(function(r) { if (r.isConfirmed) { D.portfolio.splice(idx, 1); saveChanges(false); } });
};

/* ============================================================
   CHECKLIST
============================================================ */
function renderChecklist() {
  var w = document.getElementById('form-checks'); if (!w) return;
  var html = '';
  var list = D.formChecklist || [];
  for (var i = 0; i < list.length; i++) {
    html += '<label class="form-check-item"><input type="checkbox" name="need" value="' + list[i] + '"><span>' + list[i] + '</span></label>';
  }
  w.innerHTML = html;
}

window.manageChecklist = function() {
  function lh() {
    var list = D.formChecklist || [], html = '';
    for (var i = 0; i < list.length; i++) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">' +
        '<span style="flex:1;font-size:.85rem;color:var(--t1)">' + list[i] + '</span>' +
        '<button onclick="clD(' + i + ')" style="background:transparent;border:1px solid rgba(181,32,32,.4);color:var(--red);padding:2px 10px;cursor:pointer;font-size:.78rem">刪除</button></div>';
    }
    return html;
  }
  window.clD = function(i) { D.formChecklist.splice(i, 1); document.getElementById('clw').innerHTML = lh(); };
  Swal.fire({
    title: '☑ 管理表單選項', width: 460,
    html: '<div id="clw" style="text-align:left;max-height:260px;overflow-y:auto">' + lh() + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:12px"><input id="clni" class="swal2-input" style="flex:1;margin:0" placeholder="新選項名稱">' +
          '<button onclick="if(document.getElementById(\'clni\').value.trim()){if(!D.formChecklist)D.formChecklist=[];D.formChecklist.push(document.getElementById(\'clni\').value.trim());document.getElementById(\'clw\').innerHTML=lh();document.getElementById(\'clni\').value=\'\'}" style="background:var(--gold);border:none;color:var(--bg);padding:0 16px;cursor:pointer;font-weight:700">新增</button></div>',
    showCancelButton: true, confirmButtonText: '儲存'
  }).then(function(r) { if (r.isConfirmed) { persist(); renderChecklist(); } });
};

/* ============================================================
   CATEGORIES
============================================================ */
window.manageCategories = function() {
  function lh() {
    var html = '';
    for (var i = 0; i < D.pfCategories.length; i++) {
      html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)">' +
        '<span style="flex:1;font-size:.85rem;color:var(--t1)">' + D.pfCategories[i] + '</span>' +
        '<button onclick="mcU(' + i + ')" style="background:var(--bg3);border:1px solid var(--border);color:var(--t2);padding:3px 8px;cursor:pointer">↑</button>' +
        '<button onclick="mcDn(' + i + ')" style="background:var(--bg3);border:1px solid var(--border);color:var(--t2);padding:3px 8px;cursor:pointer">↓</button>' +
        '<button onclick="mcDl(' + i + ')" style="background:transparent;border:1px solid rgba(181,32,32,.4);color:var(--red);padding:3px 8px;cursor:pointer">刪</button></div>';
    }
    return html;
  }
  window.mcU = function(i) { if (i>0){var t=D.pfCategories[i];D.pfCategories[i]=D.pfCategories[i-1];D.pfCategories[i-1]=t;document.getElementById('catw').innerHTML=lh();} };
  window.mcDn = function(i) { if (i<D.pfCategories.length-1){var t=D.pfCategories[i];D.pfCategories[i]=D.pfCategories[i+1];D.pfCategories[i+1]=t;document.getElementById('catw').innerHTML=lh();} };
  window.mcDl = function(i) { if(D.pfCategories.length>1){D.pfCategories.splice(i,1);document.getElementById('catw').innerHTML=lh();} };
  Swal.fire({
    title: '🏷 管理作品分類', width: 480,
    html: '<div id="catw" style="text-align:left;max-height:260px;overflow-y:auto">' + lh() + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:12px"><input id="catn" class="swal2-input" style="flex:1;margin:0" placeholder="新分類名稱">' +
          '<button onclick="if(document.getElementById(\'catn\').value.trim()){D.pfCategories.push(document.getElementById(\'catn\').value.trim());document.getElementById(\'catw\').innerHTML=lh();document.getElementById(\'catn\').value=\'\'}" style="background:var(--gold);border:none;color:var(--bg);padding:0 16px;cursor:pointer;font-weight:700">新增</button></div>',
    showCancelButton: true, confirmButtonText: '儲存'
  }).then(function(r) { if (r.isConfirmed) { persist(); renderPF(); } });
};

/* ============================================================
   CAROUSEL MANAGER
============================================================ */
window.manageCarousel = function() {
  var imgs = D.carouselImages;
  var thumbs = '';
  for (var i = 0; i < imgs.length; i++) {
    var src = imgs[i];
    thumbs += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">' +
      '<img src="' + src + '" style="width:80px;height:45px;object-fit:cover;border:1px solid var(--border-g)">' +
      '<div style="flex:1;font-size:.72rem;color:var(--t3);word-break:break-all">' + (src.length > 55 ? src.slice(0,55)+'…' : src) + '</div>' +
      '<button onclick="dlCar(' + i + ')" style="background:var(--red);border:none;color:#fff;padding:4px 10px;cursor:pointer;font-size:.72rem">刪除</button></div>';
  }
  window.dlCar = function(i) {
    if (D.carouselImages.length <= 1) return;
    D.carouselImages.splice(i, 1); persist(); carIdx = 0; clearInterval(carTimer); initCarousel();
    Swal.close(); setTimeout(window.manageCarousel, 200);
  };
  Swal.fire({
    title: '🖼 管理輪播圖片', width: 620,
    html: '<div style="max-height:240px;overflow-y:auto;text-align:left">' + thumbs + '</div>' +
          '<hr style="border-color:var(--border);margin:12px 0">' +
          '<p style="color:var(--gold);font-size:.78rem;text-align:left;margin-bottom:8px">新增圖片</p>' +
          '<input id="curl" class="swal2-input" placeholder="https://example.com/photo.jpg" style="margin-bottom:8px">' +
          '<input type="file" id="cfile" accept="image/*" class="swal2-file">',
    showCancelButton: true, confirmButtonText: '新增', cancelButtonText: '關閉',
    preConfirm: function() {
      var urlV = document.getElementById('curl').value.trim();
      var file = document.getElementById('cfile').files[0];
      if (urlV) return Promise.resolve(urlV);
      if (file) {
        return new Promise(function(res) {
          var rdr = new FileReader();
          rdr.onload = function(e) {
            var img = new Image();
            img.onload = function() {
              var cv = document.createElement('canvas');
              var mW = 1200, sc = Math.min(1, mW / img.width);
              cv.width = img.width * sc; cv.height = img.height * sc;
              cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
              res(cv.toDataURL('image/jpeg', 0.82));
            };
            img.src = e.target.result;
          };
          rdr.readAsDataURL(file);
        });
      }
      Swal.showValidationMessage('請輸入網址或選擇圖片'); return false;
    }
  }).then(function(r) {
    if (r.isConfirmed && r.value) {
      D.carouselImages.push(r.value); persist(); carIdx = 0; clearInterval(carTimer); initCarousel();
      Swal.fire({ title:'已新增！', timer:900, showConfirmButton:false, icon:'success' });
    }
  });
};

/* ============================================================
   SERVICE DESCRIPTIONS EDITOR
   ============================================================ */
window.previewServiceIcon = function(idx) {
  var fileInput = document.getElementById('svc-icon-' + idx);
  var preview = document.getElementById('svc-icon-preview-' + idx);
  var img = document.getElementById('svc-icon-img-' + idx);
  
  if (fileInput.files && fileInput.files[0]) {
    var reader = new FileReader();
    reader.onload = function(e) {
      img.src = e.target.result;
      img.style.display = 'block';
      
      // 添加刪除按鈕（如果還沒有）
      var existingBtn = preview.querySelector('button');
      if (!existingBtn) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.onclick = function() { deleteServiceIcon(idx); };
        btn.style.cssText = 'position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:#B52020;color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0';
        btn.textContent = '×';
        preview.appendChild(btn);
      }
    };
    reader.readAsDataURL(fileInput.files[0]);
  }
};

window.deleteServiceIcon = function(idx) {
  var fileInput = document.getElementById('svc-icon-' + idx);
  var preview = document.getElementById('svc-icon-preview-' + idx);
  var img = document.getElementById('svc-icon-img-' + idx);
  
  // 清除檔案選擇
  fileInput.value = '';
  
  // 隱藏圖片
  img.style.display = 'none';
  img.src = '';
  
  // 移除刪除按鈕
  var btn = preview.querySelector('button');
  if (btn) btn.remove();
};

window.editServiceDescriptions = function() {
  var categories = D.pfCategories || [];
  if (categories.length === 0) {
    Swal.fire('提示', '請先設定作品分類', 'info');
    return;
  }
  
  var html = '<div style="max-height:500px;overflow-y:auto">';
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var svcData = D.serviceDescriptions && D.serviceDescriptions[cat];
    var desc = '專業' + cat + '製作服務';
    var show = true;
    var icon = '';
    
    if (svcData) {
      if (typeof svcData === 'object') {
        desc = svcData.description || desc;
        show = svcData.show !== false;
        icon = svcData.icon || '';
      } else {
        desc = svcData;
      }
    }
    
    var num = (i + 1);
    html += '<div style="border:1px solid var(--border);padding:12px;margin-bottom:12px;border-radius:4px">';
    html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">';
    html += '<strong style="color:var(--gold);font-size:.9rem">' + num + '. ' + cat + '</strong>';
    html += '<label style="margin-left:auto;white-space:nowrap">';
    html += '<input type="checkbox" id="svc-show-' + i + '"' + (show ? ' checked' : '') + '> 顯示';
    html += '</label>';
    html += '</div>';
    
    html += '<input id="svc-desc-' + i + '" class="swal2-input" style="margin-bottom:8px" value="' + desc + '" placeholder="服務說明">';
    
    html += '<div style="display:flex;gap:8px;align-items:center">';
    html += '<input type="file" id="svc-icon-' + i + '" accept="image/*" onchange="previewServiceIcon(' + i + ')" style="font-size:.8rem;flex:1">';
    html += '<div id="svc-icon-preview-' + i + '" style="position:relative">';
    if (icon && (icon.startsWith('data:image') || icon.startsWith('http'))) {
      html += '<img id="svc-icon-img-' + i + '" src="' + icon + '" style="width:80px;height:80px;object-fit:contain;border:1px solid var(--border);border-radius:4px;display:block">';
      html += '<button type="button" onclick="deleteServiceIcon(' + i + ')" style="position:absolute;top:-8px;right:-8px;width:24px;height:24px;border-radius:50%;background:#B52020;color:#fff;border:none;cursor:pointer;font-size:14px;line-height:1;padding:0">×</button>';
    } else {
      html += '<img id="svc-icon-img-' + i + '" style="width:80px;height:80px;object-fit:contain;border:1px solid var(--border);border-radius:4px;display:none">';
    }
    html += '</div>';
    html += '</div>';
    html += '<small style="color:var(--t3);font-size:.72rem;display:block;margin-top:4px">上傳圖示（選填，不上傳則使用預設圖標）</small>';
    html += '</div>';
  }
  html += '</div>';
  
  Swal.fire({
    title: '編輯服務項目說明',
    html: html,
    width: 700,
    confirmButtonText: '💾 儲存',
    showCancelButton: true,
    cancelButtonText: '取消',
    preConfirm: function() {
      var promises = [];
      
      for (var i = 0; i < categories.length; i++) {
        (function(idx) {
          var descEl = document.getElementById('svc-desc-' + idx);
          var showEl = document.getElementById('svc-show-' + idx);
          var iconFile = document.getElementById('svc-icon-' + idx).files[0];
          var cat = categories[idx];
          var oldIcon = '';
          
          if (D.serviceDescriptions && D.serviceDescriptions[cat] && typeof D.serviceDescriptions[cat] === 'object') {
            oldIcon = D.serviceDescriptions[cat].icon || '';
          }
          
          if (iconFile) {
            // 有上傳新圖示
            var promise = new Promise(function(resolve) {
              var reader = new FileReader();
              reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                  var canvas = document.createElement('canvas');
                  var size = 120;
                  canvas.width = canvas.height = size;
                  var ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0, size, size);
                  resolve({
                    cat: cat,
                    description: descEl.value.trim() || ('專業' + cat + '製作服務'),
                    show: showEl.checked,
                    icon: canvas.toDataURL('image/png', 0.9)
                  });
                };
                img.src = e.target.result;
              };
              reader.readAsDataURL(iconFile);
            });
            promises.push(promise);
          } else {
            // 沒有上傳新檔案
            var imgEl = document.getElementById('svc-icon-img-' + idx);
            var useOldIcon = oldIcon;
            
            // 如果圖片被隱藏（刪除後），清空 icon 使用預設
            if (imgEl && imgEl.style.display === 'none') {
              useOldIcon = '';
            }
            
            promises.push(Promise.resolve({
              cat: cat,
              description: descEl.value.trim() || ('專業' + cat + '製作服務'),
              show: showEl.checked,
              icon: useOldIcon
            }));
          }
        })(i);
      }
      
      return Promise.all(promises);
    }
  }).then(function(result) {
    if (result.isConfirmed && result.value) {
      if (!D.serviceDescriptions) D.serviceDescriptions = {};
      
      result.value.forEach(function(item) {
        D.serviceDescriptions[item.cat] = {
          description: item.description,
          show: item.show,
          icon: item.icon
        };
      });
      
      persist();
      renderServices();
      Swal.fire({title:'✅ 已儲存！',text:'服務項目說明已更新',timer:1500,showConfirmButton:false,icon:'success'});
    }
  });
};

/* ============================================================
   LOGO
============================================================ */
window.changeLogo = function() {
  Swal.fire({
    title: '🔄 更換 Logo',
    html: '<input type="file" id="lf" class="swal2-file" accept="image/*,video/mp4,video/quicktime">' +
          '<p style="margin-top:8px;font-size:.78rem;color:var(--t3)">支援圖片（PNG/JPG）或影片（MP4/MOV）</p>' +
          '<p style="font-size:.78rem;color:var(--t3)">圖片建議方形，解析度 800x800 以上</p>',
    confirmButtonText: '上傳', showCancelButton: true,
    preConfirm: function() {
      var file = document.getElementById('lf').files[0]; 
      if (!file) return null;
      
      // 檢查是否為影片
      if (file.type.startsWith('video/')) {
        return new Promise(function(res) {
          var rdr = new FileReader();
          rdr.onload = function(e) {
            res({ type: 'video', data: e.target.result });
          };
          rdr.readAsDataURL(file);
        });
      }
      
      // 圖片處理 - 提高解析度到 800x800
      return new Promise(function(res) {
        var rdr = new FileReader();
        rdr.onload = function(e) {
          var img = new Image();
          img.onload = function() {
            var cv = document.createElement('canvas'); 
            cv.width = cv.height = 800; // 提高解析度
            var s = Math.min(img.width, img.height);
            var ctx = cv.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, 800, 800);
            res({ type: 'image', data: cv.toDataURL('image/png', 0.95) }); // 使用 PNG 和更高品質
          };
          img.src = e.target.result;
        };
        rdr.readAsDataURL(file);
      });
    }
  }).then(function(r) { 
    if (r.value) { 
      D.logoData = r.value.data;
      D.logoType = r.value.type; // 記錄類型
      saveChanges(false); 
    } 
  });
};

/* ============================================================
   THEME EDITOR
============================================================ */
window.openThemeEditor = function() {
  var t = D.theme || DEF.theme;
  Swal.fire({
    title: '🎨 外觀設定', width: 620,
    html: '<div style="text-align:left;display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div><label style="color:var(--gold);font-size:.72rem">背景色（深）</label><input type="color" id="t-bg" value="' + t.bgColor + '" style="width:100%;height:36px;cursor:pointer;background:none;border:1px solid var(--border-g)"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">背景色（次）</label><input type="color" id="t-bg2" value="' + t.bg2Color + '" style="width:100%;height:36px;cursor:pointer;background:none;border:1px solid var(--border-g)"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">強調色（金）</label><input type="color" id="t-gold" value="' + t.goldColor + '" style="width:100%;height:36px;cursor:pointer;background:none;border:1px solid var(--border-g)"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">主要文字色</label><input type="color" id="t-t1" value="' + t.t1Color + '" style="width:100%;height:36px;cursor:pointer;background:none;border:1px solid var(--border-g)"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">次要文字色</label><input type="color" id="t-t2" value="' + t.t2Color + '" style="width:100%;height:36px;cursor:pointer;background:none;border:1px solid var(--border-g)"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">淡化文字色</label><input type="color" id="t-t3" value="' + t.t3Color + '" style="width:100%;height:36px;cursor:pointer;background:none;border:1px solid var(--border-g)"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">SCROLL 顏色</label><input id="t-sc" class="swal2-input" value="' + t.scrollColor + '" style="margin:4px 0;height:34px"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">SCROLL 大小</label><input id="t-ss" class="swal2-input" value="' + t.scrollSize + '" style="margin:4px 0;height:34px"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">SCROLL 字體</label><input id="t-sf" class="swal2-input" value="' + t.scrollFont + '" style="margin:4px 0;height:34px"></div>' +
      '<div><label style="color:var(--gold);font-size:.72rem">標籤文字大小</label><input id="t-lbl" class="swal2-input" value="' + (t.labelSize||'0.92rem') + '" style="margin:4px 0;height:34px"></div>' +
      '<div style="grid-column:1/-1"><label style="color:var(--gold);font-size:.72rem">版權文字模板（{YEAR} 自動年度）</label><input id="t-cpy" class="swal2-input" value="' + (D.footerCopyTpl||DEF.footerCopyTpl) + '" style="margin:4px 0;height:34px"></div>' +
      '</div>',
    showCancelButton: true, confirmButtonText: '套用', cancelButtonText: '取消',
    preConfirm: function() {
      D.theme.bgColor   = document.getElementById('t-bg').value;
      D.theme.bg2Color  = document.getElementById('t-bg2').value;
      D.theme.goldColor = document.getElementById('t-gold').value;
      D.theme.t1Color   = document.getElementById('t-t1').value;
      D.theme.t2Color   = document.getElementById('t-t2').value;
      D.theme.t3Color   = document.getElementById('t-t3').value;
      D.theme.scrollColor = document.getElementById('t-sc').value;
      D.theme.scrollSize  = document.getElementById('t-ss').value;
      D.theme.scrollFont  = document.getElementById('t-sf').value;
      D.theme.labelSize   = document.getElementById('t-lbl').value;
      D.footerCopyTpl = document.getElementById('t-cpy').value;
      return true;
    }
  }).then(function(r) {
    if (r.isConfirmed) { applyTheme(); persist(); renderFooterCopy(); Swal.fire({ title:'外觀已更新！', timer:1000, showConfirmButton:false, icon:'success' }); }
  });
};

/* ============================================================
   HERO EDITOR (super_admin)
============================================================ */
window.openHeroEditor = function() {
  var t = D.theme || DEF.theme;
  Swal.fire({
    title: '✏ 首頁文字設定', width: 560,
    html: '<label style="color:var(--gold);font-size:.72rem;display:block;text-align:left;margin-bottom:4px">英文大標文字</label>' +
          '<input id="he-en" class="swal2-input" value="' + (D.heroEnTitle||'') + '">' +
          '<label style="color:var(--gold);font-size:.72rem;display:block;text-align:left;margin:8px 0 4px">英文字體名稱（Google Fonts）</label>' +
          '<input id="he-ef" class="swal2-input" value="' + (t.heroEnFont||'Iansui') + '">' +
          '<label style="color:var(--gold);font-size:.72rem;display:block;text-align:left;margin:8px 0 4px">英文字體大小（如 7.5rem）</label>' +
          '<input id="he-es" class="swal2-input" value="' + (t.heroEnSize||'7.5rem') + '">' +
          '<label style="color:var(--gold);font-size:.72rem;display:block;text-align:left;margin:8px 0 4px">中文副標文字</label>' +
          '<input id="he-zh" class="swal2-input" value="' + (D.heroZhTitle||'') + '">' +
          '<label style="color:var(--gold);font-size:.72rem;display:block;text-align:left;margin:8px 0 4px">中文副標大小</label>' +
          '<input id="he-zs" class="swal2-input" value="' + (t.heroZhSize||'2.6rem') + '">' +
          '<label style="color:var(--gold);font-size:.72rem;display:block;text-align:left;margin:8px 0 4px">副標說明文字</label>' +
          '<textarea id="he-sub" class="swal2-textarea">' + (D.heroDesc||'') + '</textarea>',
    showCancelButton: true, confirmButtonText: '儲存',
    preConfirm: function() {
      return {
        en: document.getElementById('he-en').value,
        ef: document.getElementById('he-ef').value,
        es: document.getElementById('he-es').value,
        zh: document.getElementById('he-zh').value,
        zs: document.getElementById('he-zs').value,
        sub: document.getElementById('he-sub').value
      };
    }
  }).then(function(r) {
    if (r.isConfirmed) {
      D.heroEnTitle = r.value.en; D.heroZhTitle = r.value.zh; D.heroDesc = r.value.sub;
      D.theme.heroEnFont = r.value.ef; D.theme.heroEnSize = r.value.es; D.theme.heroZhSize = r.value.zs;
      applyTheme(); persist(); updateDOM();
      Swal.fire({ title:'首頁已更新！', timer:1000, showConfirmButton:false, icon:'success' });
    }
  });
};

/* ============================================================
   ADMIN UI
============================================================ */
function updateAdminUI() {
  var bar = document.getElementById('admin-bar');
  var lb  = document.getElementById('float-login-btn');
  var le  = document.getElementById('label-editor');
  var avatarDiv = document.getElementById('admin-avatar');
  var avatarImg = document.getElementById('admin-avatar-img');
  
  if (CU) {
    bar.classList.add('show'); lb.style.display = 'none';
    
    // 角色徽章樣式
    var roleBadge = '';
    if (CU.role === 'super_admin') {
      roleBadge = '<span style="background:linear-gradient(135deg,#C9963A,#E4B86A);color:#fff;font-size:.62rem;padding:2px 8px;border-radius:10px;margin-left:6px;font-weight:600">超級執行長</span>';
    } else if (CU.role === 'ops_admin') {
      roleBadge = '<span style="background:linear-gradient(135deg,#4A90E2,#67B5F5);color:#fff;font-size:.62rem;padding:2px 8px;border-radius:10px;margin-left:6px;font-weight:600">營運長</span>';
    } else {
      roleBadge = '<span style="background:linear-gradient(135deg,#9A948C,#B8B2A8);color:#fff;font-size:.62rem;padding:2px 8px;border-radius:10px;margin-left:6px;font-weight:600">優秀人員</span>';
    }
    
    // 顯示帳號，靠近大頭貼
    document.getElementById('admin-info').innerHTML = '<strong>' + CU.username + '</strong>' + roleBadge;
    
    // 右邊顯示大頭貼
    if (CU.avatar && avatarDiv && avatarImg) {
      avatarDiv.style.display = 'block';
      avatarImg.src = CU.avatar;
    } else if (avatarDiv) {
      avatarDiv.style.display = 'none';
    }
    
    // 按鈕權限控制
    var btns = document.querySelectorAll('.admin-btn');
    for (var i = 0; i < btns.length; i++) {
      var btnId = btns[i].id;
      var req = btns[i].getAttribute('data-role') || 'editor';
      var ok = false;
      
      // 後台設定按鈕：所有已登入用戶都可以進入
      if (btnId === 'backend-settings-btn') {
        ok = true;
      } else if (req === 'editor') {
        ok = true; // 所有角色都可以使用 editor 級別的按鈕
      } else if (req === 'ops_admin') {
        ok = (CU.role === 'super_admin' || CU.role === 'ops_admin');
      } else if (req === 'super_admin') {
        ok = (CU.role === 'super_admin');
      }
      
      if (ok) btns[i].classList.add('show'); 
      else btns[i].classList.remove('show');
    }
    
    if (le) le.classList.add('show');
  } else {
    bar.classList.remove('show'); lb.style.display = 'block';
    if (avatarDiv) avatarDiv.style.display = 'none';
    var btns = document.querySelectorAll('.admin-btn');
    for (var i = 0; i < btns.length; i++) btns[i].classList.remove('show');
    if (le) le.classList.remove('show');
  }
}

window.showLoginModal = function() {
  Swal.fire({
    title: '後台登入',
    html: '<input id="su" class="swal2-input" placeholder="帳號" autocomplete="username"><input id="sp" type="password" class="swal2-input" placeholder="密碼" autocomplete="current-password">',
    confirmButtonText: '登入', showCancelButton: true, cancelButtonText: '取消',
    didOpen: function() {
      // 監聽 ENTER 鍵
      var passwordInput = document.getElementById('sp');
      var usernameInput = document.getElementById('su');
      
      var handleEnter = function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          Swal.clickConfirm();
        }
      };
      
      usernameInput.addEventListener('keypress', handleEnter);
      passwordInput.addEventListener('keypress', handleEnter);
      
      // 自動 focus 到帳號欄位
      usernameInput.focus();
    },
    preConfirm: function() { return { u: document.getElementById('su').value, p: document.getElementById('sp').value }; }
  }).then(function(r) {
    if (r.isConfirmed) {
      var found = null;
      for (var i = 0; i < D.users.length; i++) {
        if (D.users[i].username === r.value.u && D.users[i].password === r.value.p) { found = D.users[i]; break; }
      }
      if (found) {
        CU = found;
        var ui = -1; for (var i = 0; i < D.users.length; i++) if (D.users[i].username === CU.username) { ui = i; break; }
        if (ui >= 0) { D.users[ui].online = true; D.users[ui].lastSeen = new Date().toLocaleString('zh-TW'); }
        sessionStorage.setItem('mk5cu', JSON.stringify(CU)); persist(); updateDOM();
        startAutoLogout(); startAutoSave(); // 啟動自動登出計時器
        Swal.fire({ title: '歡迎，' + found.name + '！', timer: 1200, showConfirmButton: false, icon: 'success' });
      } else Swal.fire({ title: '帳號或密碼錯誤', icon: 'error' });
    }
  });
};

/* ============================================================
   AUTO LOGOUT
============================================================ */
function startAutoLogout() {
  clearAutoLogout(); // 清除舊的計時器
  
  if (!CU) return; // 未登入不需要計時
  
  var minutes = (D.backendSettings && D.backendSettings.autoLogoutMinutes) || 5;
  var milliseconds = minutes * 60 * 1000;
  
  autoLogoutTimer = setTimeout(function() {
    if (CU) {
      adminLogout();
      Swal.fire({
        title: '已自動登出',
        text: '閒置 ' + minutes + ' 分鐘，已自動登出',
        icon: 'info',
        timer: 3000
      });
    }
  }, milliseconds);
}

function clearAutoLogout() {
  if (autoLogoutTimer) {
    clearTimeout(autoLogoutTimer);
    autoLogoutTimer = null;
  }
}

function resetAutoLogout() {
  if (CU) {
    startAutoLogout();
    startAutoSave();
  }
}

// 自動儲存功能
var autoSaveTimer = null;

function startAutoSave() {
  clearAutoSave(); // 清除舊的計時器
  
  if (!CU) return; // 未登入不需要計時
  
  var seconds = (D.backendSettings && D.backendSettings.autoSaveSeconds) || 60;
  var milliseconds = seconds * 1000;
  
  autoSaveTimer = setTimeout(function() {
    if (CU) {
      saveChanges(true); // true 表示自動儲存，不顯示提示
    }
  }, milliseconds);
}

function clearAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
}

/* ============================================================
   LOGOUT
============================================================ */
window.adminLogout = function() {
  clearAutoLogout(); // 登出時清除計時器
  saveChanges(false);
  if (CU) {
    var ui = -1; for (var i = 0; i < D.users.length; i++) if (D.users[i].username === CU.username) { ui = i; break; }
    if (ui >= 0) { D.users[ui].online = false; D.users[ui].lastSeen = new Date().toLocaleString('zh-TW'); }
  }
  CU = null; sessionStorage.removeItem('mk5cu'); persist(); updateDOM();
  Swal.fire({ title: '已登出', timer: 900, showConfirmButton: false });
};

/* ============================================================
   BACKEND SETTINGS (super_admin only)
============================================================ */
window.openBackendSettings = function(scrollToCloud) {
  if (!CU) {
    Swal.fire({title:'無權限',text:'請先登入',icon:'error'});
    return;
  }
  // 所有已登入的人都可以進入後台設定，但只能編輯有權限的項目
  
  var t = D.theme || {};
  var bs = D.backendSettings || {};
  var social = D.social || {};
  
  // 準備輪播圖片列表
  var carouselHtml = '';
  if (D.carousel && D.carousel.length > 0) {
    carouselHtml = '<div style="max-height:150px;overflow-y:auto;border:1px solid var(--t3);padding:8px;margin-top:8px">';
    for (var i = 0; i < D.carousel.length; i++) {
      carouselHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
        '<img src="' + D.carousel[i] + '" style="width:60px;height:40px;object-fit:cover">' +
        '<span style="font-size:.75rem;color:var(--t2)">圖片 ' + (i+1) + '</span>' +
        '</div>';
    }
    carouselHtml += '</div>';
  } else {
    carouselHtml = '<div style="color:var(--t3);font-size:.8rem;margin-top:8px">尚未上傳輪播圖片</div>';
  }
  
  // 準備分類列表
  var categoriesHtml = '';
  if (D.pfCategories && D.pfCategories.length > 0) {
    categoriesHtml = '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">';
    for (var i = 0; i < D.pfCategories.length; i++) {
      categoriesHtml += '<span style="padding:4px 10px;background:var(--bg3);border:1px solid var(--gold);color:var(--gold);font-size:.75rem;border-radius:4px">' + D.pfCategories[i] + '</span>';
    }
    categoriesHtml += '</div>';
  } else {
    categoriesHtml = '<div style="color:var(--t3);font-size:.8rem;margin-top:8px">尚未設定分類</div>';
  }
  
  Swal.fire({
    title: '⚙️ 後台設定',
    width: 920,
    html: (function() {
      var h = '<div style="text-align:left;color:var(--t2);font-size:.88rem;max-height:680px;overflow-y:auto;padding:10px">';
      var isSuperAdmin = CU && CU.role === 'super_admin';
      var t = D.theme || {};
      var bs = D.backendSettings || {};
      var social = D.social || {};

      // ─── 1. 開場動畫設定 ───
      h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 開場動畫設定</h3>';
      if (isSuperAdmin || canEdit('introTagline')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">1. 開場動畫大標題：<input id="bs-intro-tagline" class="swal2-input" style="margin-top:4px" value="' + (D.introTagline||'') + '" placeholder="MARK NO.5.STUDIO"></label>';
      }
      if (isSuperAdmin || canEdit('introTaglineSize')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">2. 開場動畫大標題大小：<input id="bs-intro-tagline-size" class="swal2-input" style="margin-top:4px" value="' + (D.introTaglineSize||'') + '" placeholder="1rem"></label>';
      }
      if (isSuperAdmin || canEdit('introLogoSize')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">3. 開場動畫 Logo 大小：<input id="bs-intro-logo-size" class="swal2-input" style="margin-top:4px" value="' + (t.introLogoSize||'') + '" placeholder="300px"></label>';
      }

      // ─── 2. 頂端資訊欄 ───
      h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 頂端資訊欄</h3>';
      if (isSuperAdmin || canEdit('datetimeSize')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">4. 日期時間天氣大小：<input id="bs-datetime-size" class="swal2-input" style="margin-top:4px" value="' + (t.datetimeSize||'') + '" placeholder=".78rem"></label>';
      }
      if (isSuperAdmin || canEdit('datetimeFont')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">5. 日期時間天氣字型：<input id="bs-datetime-font" class="swal2-input" style="margin-top:4px" value="' + (t.datetimeFont||'') + '" placeholder="Bebas Neue"></label>';
      }

      // ─── 3. Logo 設定 ───
      if (isSuperAdmin || canEdit('logo')) {
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 6. Logo 設定</h3>';
        h += '<p style="font-size:.85rem;color:var(--t2);margin-bottom:10px">目前 Logo：</p>';
        h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">';
        h += '<img src="' + (D.logoData || '') + '" style="width:60px;height:60px;border-radius:50%;border:2px solid var(--gold)">';
        h += '<button onclick="changeLogo()" class="swal2-confirm swal2-styled" style="margin:0">上傳新 Logo</button>';
        h += '</div>';
        h += '<small style="color:var(--t3);font-size:.75rem">提示：Logo 會顯示在網站左上角（38x38px）和開場動畫</small>';
      }

      // ─── 4. 首頁英雄區 ───
      h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 首頁英雄區</h3>';
      if (isSuperAdmin || canEdit('heroSubtitle')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">7. Logo 下方小標：<input id="bs-hero-subtitle" class="swal2-input" style="margin-top:4px" value="' + (D.heroSubtitle||'') + '" placeholder="MARK NO.5.STUDIO"></label>';
      }
      if (isSuperAdmin || canEdit('heroEnTitle')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">8. 英文大標：<input id="bs-hero-en" class="swal2-input" style="margin-top:4px" value="' + (D.heroEnTitle||'') + '" placeholder="MARK NO.5"></label>';
      }
      if (isSuperAdmin || canEdit('heroZhTitle')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">9. 中文副標：<input id="bs-hero-zh" class="swal2-input" style="margin-top:4px" value="' + (D.heroZhTitle||'') + '" placeholder="馬克伍號影像工作室"></label>';
      }
      if (isSuperAdmin || canEdit('heroDesc')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">10. 首頁說明：<textarea id="bs-hero-desc" class="swal2-textarea" style="margin-top:4px;min-height:60px">' + (D.heroDesc||'') + '</textarea></label>';
      }
      if (isSuperAdmin || canEdit('heroEnFont')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">11. 英文大標字體：<input id="bs-hero-en-font" class="swal2-input" style="margin-top:4px" value="' + (t.heroEnFont||'') + '" placeholder="Google Sans Flex"></label>';
      }
      if (isSuperAdmin || canEdit('heroEnSize')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">12. 英文大標大小：<input id="bs-hero-en-size" class="swal2-input" style="margin-top:4px" value="' + (t.heroEnSize||'') + '" placeholder="clamp(3rem,8vw,7.5rem)"></label>';
      }
      if (isSuperAdmin || canEdit('heroZhSize')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">13. 中文副標大小：<input id="bs-hero-zh-size" class="swal2-input" style="margin-top:4px" value="' + (t.heroZhSize||'') + '" placeholder="clamp(1.5rem,3vw,2.6rem)"></label>';
      }

      // ─── 5. 輪播設定 ───
      if (isSuperAdmin || canEdit('carousel')) {
        var carouselHtml = '';
        if (D.carousel && D.carousel.length > 0) {
          carouselHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
          for (var i = 0; i < D.carousel.length; i++) {
            carouselHtml += '<img src="' + D.carousel[i] + '" style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid var(--border)">';
          }
          carouselHtml += '</div>';
        } else {
          carouselHtml = '<div style="color:var(--t3);font-size:.8rem;margin-top:8px">尚未上傳輪播圖片</div>';
        }
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 14. 輪播設定</h3>';
        h += '<p style="font-size:.85rem;color:var(--t2);margin-bottom:8px">目前輪播圖片（' + (D.carousel ? D.carousel.length : 0) + ' 張）：</p>';
        h += carouselHtml;
        h += '<button onclick="manageCarousel()" class="swal2-confirm swal2-styled" style="margin-top:10px">管理輪播圖片</button>';
      }

      // ─── 6. 最新公告跑馬燈 ───
      h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 最新公告</h3>';
      if (isSuperAdmin || canEdit('marqueeItems')) {
        var marqueeList = (D.marqueeItems || []).join('\n');
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">15. 公告內容：<textarea id="bs-marquee-items" class="swal2-textarea" style="margin-top:4px;min-height:80px" placeholder="每行一則公告（支援 emoji）">' + marqueeList + '</textarea></label>';
        h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:-6px;margin-bottom:10px">提示：每行一則公告，可使用 emoji</small>';
      }
      if (isSuperAdmin || canEdit('marqueeColor')) {
        var marqueeColor = D.marqueeColor || '#FFFFFF';
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">16. 跑馬文字顏色：';
        h += '<div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
        h += '<div id="bs-marquee-swatch" style="width:50px;height:40px;border-radius:4px;border:1px solid var(--border-g);background:' + marqueeColor + ';flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)"></div>';
        h += '<input id="bs-marquee-color" type="text" style="margin:0;width:88px;background:var(--bg2);border:1px solid var(--border-g);color:var(--t1);padding:6px 8px;border-radius:4px;font-family:monospace;font-size:.85rem;outline:none" value="' + marqueeColor + '" maxlength="7" placeholder="#FFFFFF" oninput="var s=document.getElementById(\'bs-marquee-swatch\');if(s&&/^#[0-9a-fA-F]{6}$/.test(this.value))s.style.background=this.value">';
        h += '<div style="display:flex;gap:5px;flex-wrap:wrap">';
        var mqPresets = ['#FFFFFF','#C9963A','#E4B86A','#F0EBE2','#888888','#B52020'];
        for (var mpi = 0; mpi < mqPresets.length; mpi++) {
          var mpc = mqPresets[mpi];
          h += '<div onclick="document.getElementById(\'bs-marquee-color\').value=\'' + mpc + '\';document.getElementById(\'bs-marquee-swatch\').style.background=\'' + mpc + '\'" style="width:24px;height:24px;background:' + mpc + ';border-radius:3px;cursor:pointer;border:1px solid rgba(255,255,255,0.2);transition:transform .1s" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'\'" title="' + mpc + '"></div>';
        }
        h += '</div></div></label>';
      }
      if (isSuperAdmin || canEdit('marqueeSpeed')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">17. 跑馬速度（秒）：<input id="bs-marquee-speed" type="number" class="swal2-input" style="margin-top:4px" value="' + (D.marqueeSpeed||30) + '" placeholder="30" min="5" max="60"></label>';
        h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:-6px;margin-bottom:10px">提示：數字越小速度越快（5-60 秒）</small>';
      }
      if (isSuperAdmin || canEdit('marqueeShow')) {
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem"><input id="bs-marquee-show" type="checkbox" style="margin-right:8px"' + (D.marqueeShow !== false ? ' checked' : '') + '>18. 顯示跑馬燈</label>';
      }

      // ─── 7. 服務項目說明 ───
      if (isSuperAdmin || canEdit('serviceDescriptions')) {
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 19. 服務項目說明</h3>';
        h += '<button onclick="editServiceDescriptions()" class="swal2-confirm swal2-styled" style="margin-top:10px">編輯服務項目說明</button>';
      }

      // ─── 8. 流程數字亮度 ───
      var hasProcPermission = isSuperAdmin || canEdit('procNumOpacity') || canEdit('procNumHoverOpacity');
      if (hasProcPermission) {
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 流程數字亮度</h3>';
        if (isSuperAdmin || canEdit('procNumOpacity')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">20. 流程數字預設亮度：<input id="bs-proc-dim" class="swal2-input" style="margin-top:4px" type="number" step="0.1" min="0" max="1" value="' + (t.procNumOpacity||'') + '" placeholder="0.15"></label>';
        }
        if (isSuperAdmin || canEdit('procNumHoverOpacity')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">21. 流程數字 Hover 亮度：<input id="bs-proc-hover" class="swal2-input" style="margin-top:4px" type="number" step="0.1" min="0" max="1" value="' + (t.procNumHoverOpacity||'') + '" placeholder="0.5"></label>';
        }
      }

      // ─── 9. 作品集設定 ───
      if (isSuperAdmin || canEdit('categories')) {
        var categoriesHtml = '';
        if (D.pfCategories && D.pfCategories.length > 0) {
          categoriesHtml = '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">';
          for (var i = 0; i < D.pfCategories.length; i++) {
            categoriesHtml += '<span style="padding:4px 10px;background:var(--bg2);border:1px solid var(--border);border-radius:12px;font-size:.8rem">' + D.pfCategories[i] + '</span>';
          }
          categoriesHtml += '</div>';
        } else {
          categoriesHtml = '<div style="color:var(--t3);font-size:.8rem;margin-top:8px">尚未設定作品分類</div>';
        }
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 22. 作品分類設定</h3>';
        h += '<p style="font-size:.85rem;color:var(--t2);margin-bottom:8px">目前作品分類（' + (D.pfCategories ? D.pfCategories.length : 0) + ' 個）：</p>';
        h += categoriesHtml;
        h += '<button onclick="manageCategories()" class="swal2-confirm swal2-styled" style="margin-top:10px">管理作品分類</button>';
      }

      // ─── 10. 拖曳箭頭設定 ───
      var hasArrowPermission = isSuperAdmin || canEdit('dragArrowColor') || canEdit('dragArrowSize') || canEdit('dragArrowOpacity') || canEdit('dragArrowHoverOpacity') || canEdit('dragArrowCooldown') || canEdit('dragArrowActiveGlow');
      if (hasArrowPermission) {
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 作品拖曳發光效果</h3>';
        var hasGlowPermission = isSuperAdmin || canEdit('pfGlowColor') || canEdit('pfGlowSize') || canEdit('pfGlowRange') || canEdit('pfGlowBrightness') || canEdit('pfGlowSoftness');
        if (hasGlowPermission) {
          if (isSuperAdmin || canEdit('pfGlowColor')) {
            var pfGlowColorVal = (bs.pfGlowColor || '#C9963A');
            h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">23. 拖曳發光顏色：';
            h += '<div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
            h += '<div id="bs-pf-glow-swatch" style="width:50px;height:40px;border-radius:4px;border:1px solid var(--border-g);background:' + pfGlowColorVal + ';flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)"></div>';
            h += '<input id="bs-pf-glow-color" type="text" style="margin:0;width:88px;background:var(--bg2);border:1px solid var(--border-g);color:var(--t1);padding:6px 8px;border-radius:4px;font-family:monospace;font-size:.85rem;outline:none" value="' + pfGlowColorVal + '" maxlength="7" placeholder="#C9963A" oninput="var s=document.getElementById(\'bs-pf-glow-swatch\');if(s&&/^#[0-9a-fA-F]{6}$/.test(this.value))s.style.background=this.value">';
            h += '<div style="display:flex;gap:5px;flex-wrap:wrap">';
            var pgPresets = ['#C9963A','#E4B86A','#FFFFFF','#F0EBE2','#888888','#B52020'];
            for (var pgi = 0; pgi < pgPresets.length; pgi++) {
              var pgc = pgPresets[pgi];
              h += '<div onclick="document.getElementById(\'bs-pf-glow-color\').value=\'' + pgc + '\';document.getElementById(\'bs-pf-glow-swatch\').style.background=\'' + pgc + '\'" style="width:24px;height:24px;background:' + pgc + ';border-radius:3px;cursor:pointer;border:1px solid rgba(255,255,255,0.2);transition:transform .1s" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'\'" title="' + pgc + '"></div>';
            }
            h += '</div></div></label>';
          }
          if (isSuperAdmin || canEdit('pfGlowSize')) {
            h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">24. 發光大小（px）：<input id="bs-pf-glow-size" class="swal2-input" style="margin-top:4px" type="number" min="0" max="120" value="' + (bs.pfGlowSize !== undefined ? bs.pfGlowSize : 28) + '" placeholder="28"></label>';
          }
          if (isSuperAdmin || canEdit('pfGlowRange')) {
            h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">25. 發光範圍（px）：<input id="bs-pf-glow-range" class="swal2-input" style="margin-top:4px" type="number" min="0" max="200" value="' + (bs.pfGlowRange !== undefined ? bs.pfGlowRange : 56) + '" placeholder="56"></label>';
          }
          if (isSuperAdmin || canEdit('pfGlowBrightness')) {
            h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">26. 發光明亮（0-1）：<input id="bs-pf-glow-brightness" class="swal2-input" style="margin-top:4px" type="number" step="0.05" min="0" max="1" value="' + (bs.pfGlowBrightness !== undefined ? bs.pfGlowBrightness : 0.75) + '" placeholder="0.75"></label>';
          }
          if (isSuperAdmin || canEdit('pfGlowSoftness')) {
            h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">27. 發光柔化（0-1）：<input id="bs-pf-glow-softness" class="swal2-input" style="margin-top:4px" type="number" step="0.05" min="0" max="1" value="' + (bs.pfGlowSoftness !== undefined ? bs.pfGlowSoftness : 0.4) + '" placeholder="0.4"></label>';
            h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:-6px;margin-bottom:10px">提示：數字越小外層光暈越柔和</small>';
          }
        }
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 作品集翻頁箭頭</h3>';
        if (isSuperAdmin || canEdit('dragArrowColor')) {
          var arrowColor = bs.dragArrowColor || '#C9963A';
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">28. 箭頭顏色：';
          h += '<div style="margin-top:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">';
          h += '<div id="bs-arrow-swatch" style="width:50px;height:40px;border-radius:4px;border:1px solid var(--border-g);background:' + arrowColor + ';flex-shrink:0;box-shadow:inset 0 0 0 1px rgba(0,0,0,.3)"></div>';
          h += '<input id="bs-arrow-color" type="text" style="margin:0;width:88px;background:var(--bg2);border:1px solid var(--border-g);color:var(--t1);padding:6px 8px;border-radius:4px;font-family:monospace;font-size:.85rem;outline:none" value="' + arrowColor + '" maxlength="7" placeholder="#C9963A" oninput="var s=document.getElementById(\'bs-arrow-swatch\');if(s&&/^#[0-9a-fA-F]{6}$/.test(this.value))s.style.background=this.value">';
          h += '<div style="display:flex;gap:5px;flex-wrap:wrap">';
          var presets = ['#C9963A','#E4B86A','#FFFFFF','#F0EBE2','#888888','#B52020'];
          for (var pi = 0; pi < presets.length; pi++) {
            var pc = presets[pi];
            h += '<div onclick="document.getElementById(\'bs-arrow-color\').value=\'' + pc + '\';document.getElementById(\'bs-arrow-swatch\').style.background=\'' + pc + '\'" style="width:24px;height:24px;background:' + pc + ';border-radius:3px;cursor:pointer;border:1px solid rgba(255,255,255,0.2);transition:transform .1s" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'\'" title="' + pc + '"></div>';
          }
          h += '</div></div></label>';
        }
        if (isSuperAdmin || canEdit('dragArrowIcon')) {
          var currentIconType = bs.dragArrowIcon || 'chevron';
          var iconOpts = [{t:'chevron',l:'細緻'},{t:'triangle',l:'實心'},{t:'angle',l:'簡約'},{t:'double',l:'雙層'}];
          h += '<label style="display:block;margin-bottom:12px;font-size:.85rem">29. 箭頭樣式：<div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">';
          for (var ik=0;ik<iconOpts.length;ik++){
            var io=iconOpts[ik];
            var isSel=io.t===currentIconType;
            h+='<div data-icon="'+io.t+'" onclick="this.parentNode.querySelectorAll(\'[data-icon]\').forEach(function(d){d.style.borderColor=\'var(--border-g)\';d.style.background=\'var(--bg2)\'});this.style.borderColor=\'var(--gold)\';this.style.background=\'rgba(201,150,58,0.1)\';document.getElementById(\'bs-arrow-icon\').value=\''+io.t+'\'" style="width:52px;text-align:center;cursor:pointer;border:1px solid '+(isSel?'var(--gold)':'var(--border-g)')+';border-radius:6px;background:'+(isSel?'rgba(201,150,58,0.1)':'var(--bg2)')+';padding:5px 4px">';
            h+='<svg width="24" height="36" viewBox="0 0 40 60" style="color:var(--gold);display:block;margin:0 auto">';
            if(io.t==='chevron')h+='<polyline points="24,15 13,30 24,45" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="13" y1="30" x2="30" y2="30" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity="0.35"/>';
            if(io.t==='triangle')h+='<polygon points="28,12 12,30 28,48" fill="currentColor"/>';
            if(io.t==='angle')h+='<polyline points="26,18 14,30 26,42" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>';
            if(io.t==='double')h+='<polyline points="28,15 18,30 28,45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="20,15 10,30 20,45" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
            h+='</svg><div style="font-size:.6rem;color:var(--t3);margin-top:3px">'+io.l+'</div></div>';
          }
          h+='</div><input type="hidden" id="bs-arrow-icon" value="'+currentIconType+'"></label>';
        }
        if (isSuperAdmin || canEdit('dragArrowSize')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">30. 箭頭大小（px）：<input id="bs-arrow-size" class="swal2-input" style="margin-top:4px" type="number" min="30" max="120" value="' + (bs.dragArrowSize||60) + '" placeholder="60"></label>';
        }
        if (isSuperAdmin || canEdit('dragArrowOpacity')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">31. 箭頭透明度（0-1）：<input id="bs-arrow-opacity" class="swal2-input" style="margin-top:4px" type="number" step="0.1" min="0" max="1" value="' + (bs.dragArrowOpacity||0.4) + '" placeholder="0.4"></label>';
        }
        if (isSuperAdmin || canEdit('dragArrowHoverOpacity')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">32. 拖曳到箭頭時透明度（0-1）：<input id="bs-arrow-hover-opacity" class="swal2-input" style="margin-top:4px" type="number" step="0.1" min="0" max="1" value="' + (bs.dragArrowHoverOpacity||0.9) + '" placeholder="0.9"></label>';
        }
        if (isSuperAdmin || canEdit('dragArrowCooldown')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">33. 翻頁冷卻時間（毫秒）：<input id="bs-arrow-cooldown" class="swal2-input" style="margin-top:4px" type="number" min="100" max="1000" step="50" value="' + (bs.dragArrowCooldown||300) + '" placeholder="300"></label>';
          h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:-6px;margin-bottom:10px">提示：拖曳翻頁後的冷卻時間（100-1000 毫秒）</small>';
        }
        if (isSuperAdmin || canEdit('dragArrowActiveGlow')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">34. 拖曳到箭頭時發光強度（px）：<input id="bs-arrow-active-glow" class="swal2-input" style="margin-top:4px" type="number" min="0" max="60" step="2" value="' + (bs.dragArrowActiveGlow !== undefined ? bs.dragArrowActiveGlow : 20) + '" placeholder="20"></label>';
          h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:-6px;margin-bottom:10px">提示：拖曳影片靠近箭頭時的光暈半徑，0 為無發光（0-60 px）</small>';
        }
      }

      // ─── 11. 社群連結 ───
      h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 社群連結</h3>';
      if (isSuperAdmin || canEdit('socialFacebook')) {
        h += '<div style="margin-bottom:10px"><div style="display:flex;gap:10px;align-items:end"><label style="flex:1"><span style="display:block;margin-bottom:4px;font-size:.85rem">35. Facebook：</span><input id="bs-fb-link" class="swal2-input" style="margin:0" value="' + (social.facebookLink||'') + '"></label><label style="white-space:nowrap;padding-bottom:8px"><input type="checkbox" id="bs-fb-show" ' + (social.facebookShow !== false ? 'checked' : '') + '> 顯示</label></div></div>';
      }
      if (isSuperAdmin || canEdit('socialInstagram')) {
        h += '<div style="margin-bottom:10px"><div style="display:flex;gap:10px;align-items:end"><label style="flex:1"><span style="display:block;margin-bottom:4px;font-size:.85rem">36. Instagram：</span><input id="bs-ig-link" class="swal2-input" style="margin:0" value="' + (social.instagramLink||'') + '"></label><label style="white-space:nowrap;padding-bottom:8px"><input type="checkbox" id="bs-ig-show" ' + (social.instagramShow !== false ? 'checked' : '') + '> 顯示</label></div></div>';
      }
      if (isSuperAdmin || canEdit('socialThreads')) {
        h += '<div style="margin-bottom:10px"><div style="display:flex;gap:10px;align-items:end"><label style="flex:1"><span style="display:block;margin-bottom:4px;font-size:.85rem">37. Threads：</span><input id="bs-threads-link" class="swal2-input" style="margin:0" value="' + (social.threadsLink||'') + '"></label><label style="white-space:nowrap;padding-bottom:8px"><input type="checkbox" id="bs-threads-show" ' + (social.threadsShow !== false ? 'checked' : '') + '> 顯示</label></div></div>';
      }
      if (isSuperAdmin || canEdit('socialYoutube')) {
        h += '<div style="margin-bottom:10px"><div style="display:flex;gap:10px;align-items:end"><label style="flex:1"><span style="display:block;margin-bottom:4px;font-size:.85rem">38. YouTube：</span><input id="bs-youtube-link" class="swal2-input" style="margin:0" value="' + (social.youtubeLink||'') + '"></label><label style="white-space:nowrap;padding-bottom:8px"><input type="checkbox" id="bs-youtube-show" ' + (social.youtubeShow !== false ? 'checked' : '') + '> 顯示</label></div></div>';
      }
      if (isSuperAdmin || canEdit('socialLine')) {
        h += '<div style="margin-bottom:10px"><div style="display:flex;gap:10px;align-items:end"><label style="flex:1"><span style="display:block;margin-bottom:4px;font-size:.85rem">39. LINE ID：</span><input id="bs-line-id" class="swal2-input" style="margin:0" value="' + (social.lineId||'') + '"></label><label style="white-space:nowrap;padding-bottom:8px"><input type="checkbox" id="bs-line-show" ' + (social.lineShow !== false ? 'checked' : '') + '> 顯示</label></div></div>';
      }

      // ─── 12. 聯絡資訊 ───
      var hasContactPermission = isSuperAdmin || canEdit('contactEmail') || canEdit('email');
      if (hasContactPermission) {
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 聯絡資訊</h3>';
        if (isSuperAdmin || canEdit('contactEmail')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">40. 聯絡資訊 Email：<input id="bs-contact-email" class="swal2-input" style="margin-top:4px" type="email" value="' + (D.contactEmail||'') + '" placeholder="markno.5.studio@gmail.com"></label>';
        }
        if (isSuperAdmin || canEdit('email')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">41. 發送訊息 Email：<input id="bs-send-email" class="swal2-input" style="margin-top:4px" type="email" value="' + (D.contactEmail||'') + '" placeholder="your@email.com"></label>';
        }
      }

      // ─── 13. 光暈效果 ───
      var hasRipplePermission = isSuperAdmin || canEdit('rippleColor') || canEdit('rippleOpacity') || canEdit('rippleSize') || canEdit('rippleWidth');
      if (hasRipplePermission) {
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 點擊光暈效果</h3>';
        if (isSuperAdmin || canEdit('rippleColor')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">42. 光暈顏色：<input id="bs-ripple-color" class="swal2-input" style="margin-top:4px" value="' + (t.rippleColor||'') + '" placeholder="#C9963A"></label>';
        }
        if (isSuperAdmin || canEdit('rippleOpacity')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">43. 光暈亮度：<input id="bs-ripple-opacity" class="swal2-input" style="margin-top:4px" type="number" step="0.1" min="0" max="1" value="' + (t.rippleOpacity||'') + '" placeholder="0.35"></label>';
        }
        if (isSuperAdmin || canEdit('rippleSize')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">44. 光暈大小：<input id="bs-ripple-size" class="swal2-input" style="margin-top:4px" value="' + (t.rippleSize||'') + '" placeholder="160px"></label>';
        }
        if (isSuperAdmin || canEdit('rippleWidth')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">45. 光暈粗細：<input id="bs-ripple-width" class="swal2-input" style="margin-top:4px" value="' + (t.rippleWidth||'') + '" placeholder="3px"></label>';
        }
      }

      // ─── 14. 系統設定 ───
      var hasSysPermission = isSuperAdmin || canEdit('autoLogout') || canEdit('autoSave') || canEdit('copyright');
      if (hasSysPermission) {
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 系統設定</h3>';
        if (isSuperAdmin || canEdit('autoLogout')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">46. 自動登出時間（分鐘）：<input id="bs-auto-logout" class="swal2-input" style="margin-top:4px" type="number" min="1" max="120" value="' + (bs.autoLogoutMinutes||5) + '" placeholder="5"></label>';
        }
        if (isSuperAdmin || canEdit('autoSave')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">47. 自動儲存時間（秒）：<input id="bs-auto-save" class="swal2-input" style="margin-top:4px" type="number" min="10" max="600" value="' + (bs.autoSaveSeconds||60) + '" placeholder="60"></label>';
          h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:-6px;margin-bottom:10px">提示：靜置指定秒數後自動儲存設定（10-600 秒）</small>';
        }
        if (isSuperAdmin || canEdit('copyright')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">48. 版權模板：<input id="bs-copyright" class="swal2-input" style="margin-top:4px" value="' + (bs.copyrightTemplate||'') + '" placeholder="© YEAR MARK NO.5 VIDEO STUDIO"></label>';
        }
      }

      // ─── 15. 雲端同步設定（super_admin 或擁有 cloudSync 權限者可見） ───
      if (isSuperAdmin || canEdit('cloudSync')) {
        // 重新從 localStorage 取得最新 CLOUD 設定（確保顯示已儲存的值）
        try {
          var savedCloud = localStorage.getItem('MK5_CLOUD');
          if (savedCloud) { Object.assign(CLOUD, JSON.parse(savedCloud)); }
        } catch(e) {}
        var cloudOk = CLOUD.token && CLOUD.owner && CLOUD.repo;
        var cloudStatus = cloudOk
          ? '<span style="color:#4ade80">✅ 已設定（' + CLOUD.owner + '/' + CLOUD.repo + '）</span>'
          : '<span style="color:var(--t3)">⚪ 尚未設定</span>';
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ ☁️ 雲端同步設定</h3>';
        h += '<p style="font-size:.82rem;color:var(--t2);margin-bottom:14px;line-height:1.8">';
        h += '設定後，每次點擊「💾 儲存」將自動把最新內容同步到 GitHub。<br>';
        h += '其他裝置（手機等）重新整理網站即可看到最新資訊，無需手動操作。<br>';
        h += '目前狀態：' + cloudStatus + '</p>';
        // ⚠️ 注意：SweetAlert2 用 DOMPurify 消毒 HTML，會移除所有 oninput/onclick 屬性
        //    所以這裡不放 oninput，改在 didOpen 用 addEventListener 掛載
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">49. GitHub 用戶名稱：<input id="bs-cloud-owner" class="swal2-input" style="margin-top:4px" value="' + (CLOUD.owner||'') + '" placeholder="your-github-username" autocomplete="off"></label>';
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">50. 儲存庫名稱：<input id="bs-cloud-repo" class="swal2-input" style="margin-top:4px" value="' + (CLOUD.repo||'') + '" placeholder="your-repo.github.io" autocomplete="off"></label>';
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">51. 分支（Branch）：<input id="bs-cloud-branch" class="swal2-input" style="margin-top:4px" value="' + (CLOUD.branch||'main') + '" placeholder="main" autocomplete="off"></label>';
        // Token 欄位：用 text 顯示（避免瀏覽器密碼管理器覆蓋 value）
        var tokenDisplay = CLOUD.token ? CLOUD.token : '';
        h += '<label style="display:block;margin-bottom:6px;font-size:.85rem">52. GitHub Token（Personal Access Token）：</label>';
        h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">';
        h += '<input id="bs-cloud-token" class="swal2-input" style="margin:0;flex:1" type="text" value="' + tokenDisplay + '" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" autocomplete="off" spellcheck="false">';
        h += '</div>';
        h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-bottom:12px;line-height:1.7">';
        h += '如何取得 Token：GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens<br>';
        h += '需要勾選：Repository → Contents → Read and Write 權限<br>';
        h += '<b style="color:var(--gold)">⚠ Token 僅儲存在此裝置的 localStorage，不會上傳到 GitHub</b></small>';
        h += '<button type="button" id="bs-cloud-test-btn" style="padding:7px 18px;background:var(--bg3);border:1px solid var(--gold);color:var(--gold);border-radius:6px;cursor:pointer;font-size:.85rem;transition:background .2s">🔌 測試連線</button>';
        h += '<div id="bs-cloud-test-result" style="display:none;margin-top:10px;padding:9px 14px;border-radius:6px;font-size:.85rem;line-height:1.5"></div>';
      }

      h += '</div>';
      return h;
    })(),
    confirmButtonText: '💾 儲存所有設定',
    showCancelButton: true,
    cancelButtonText: '取消',
    allowOutsideClick: false,
    allowEscapeKey: false,
    customClass: {
      container: 'backend-settings-modal'
    },
    didOpen: function() {
      var modal = document.querySelector('.swal2-popup');
      if (modal) {
        modal.addEventListener('keypress', function(e) {
          // 只有在非 textarea/input 時才用 Enter 確認，避免打字時誤觸儲存
          if (e.key === 'Enter' && !e.shiftKey &&
              e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            Swal.clickConfirm();
          }
        });
      }
      // 若從「☁️ 同步」按鈕進入，自動捲動到雲端同步設定區塊
      if (scrollToCloud) {
        var container = document.querySelector('.swal2-html-container');
        var cloudH3 = container && Array.from(container.querySelectorAll('h3'))
          .find(function(el) { return el.textContent.includes('雲端同步'); });
        if (cloudH3) {
          setTimeout(function() {
            cloudH3.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // 金色閃爍提示
            cloudH3.style.transition = 'background .3s';
            cloudH3.style.background = 'rgba(201,150,58,0.2)';
            setTimeout(function() { cloudH3.style.background = ''; }, 1500);
          }, 200);
        }
      }
      // ✅ 測試連線按鈕：SweetAlert2 會移除 onclick 屬性（DOMPurify sanitize），
      //    必須在 didOpen 裡用 addEventListener 掛事件
      var testBtn = document.getElementById('bs-cloud-test-btn');
      if (testBtn) {
        testBtn.addEventListener('mouseover', function() { this.style.background = 'rgba(201,150,58,0.15)'; });
        testBtn.addEventListener('mouseout',  function() { this.style.background = 'var(--bg3)'; });
        testBtn.addEventListener('click', window.testCloudConnection);
      }
      // ✅ 雲端設定欄位即時儲存：DOMPurify 同樣移除 oninput，改用 addEventListener
      var saveCloudFields = function() {
        var o = document.getElementById('bs-cloud-owner');
        var r = document.getElementById('bs-cloud-repo');
        var b = document.getElementById('bs-cloud-branch');
        var t = document.getElementById('bs-cloud-token');
        if (o) CLOUD.owner  = o.value.trim();
        if (r) CLOUD.repo   = r.value.trim();
        if (b) CLOUD.branch = b.value.trim() || 'main';
        if (t) CLOUD.token  = t.value.trim();
        try { localStorage.setItem('MK5_CLOUD', JSON.stringify(CLOUD)); } catch(e) {}
      };
      ['bs-cloud-owner', 'bs-cloud-repo', 'bs-cloud-branch', 'bs-cloud-token'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', saveCloudFields);
      });
    },
    preConfirm: function() {
      var v = {};
      var isSuperAdmin = CU && CU.role === 'super_admin';
      
      // 超級執行長或有權限的人才收集
      if (isSuperAdmin || canEdit('introTagline')) {
        var el = document.getElementById('bs-intro-tagline');
        if (el) v.introTagline = el.value;
      }
      if (isSuperAdmin || canEdit('introTaglineSize')) {
        var el = document.getElementById('bs-intro-tagline-size');
        if (el) v.introTaglineSize = el.value;
      }
      if (isSuperAdmin || canEdit('heroSubtitle')) {
        var el = document.getElementById('bs-hero-subtitle');
        if (el) v.heroSubtitle = el.value;
      }
      if (isSuperAdmin || canEdit('heroEnTitle')) {
        var el = document.getElementById('bs-hero-en');
        if (el) v.heroEnTitle = el.value;
      }
      if (isSuperAdmin || canEdit('heroZhTitle')) {
        var el = document.getElementById('bs-hero-zh');
        if (el) v.heroZhTitle = el.value;
      }
      if (isSuperAdmin || canEdit('heroDesc')) {
        var el = document.getElementById('bs-hero-desc');
        if (el) v.heroDesc = el.value;
      }
      if (isSuperAdmin || canEdit('marqueeItems')) {
        var el = document.getElementById('bs-marquee-items');
        if (el) v.marqueeItems = el.value.split('\n').filter(function(x) { return x.trim(); });
      }
      if (isSuperAdmin || canEdit('marqueeColor')) {
        var el = document.getElementById('bs-marquee-color');
        if (el) v.marqueeColor = el.value;
      }
      if (isSuperAdmin || canEdit('marqueeSpeed')) {
        var el = document.getElementById('bs-marquee-speed');
        if (el) v.marqueeSpeed = parseInt(el.value) || 30;
      }
      if (isSuperAdmin || canEdit('marqueeShow')) {
        var el = document.getElementById('bs-marquee-show');
        if (el) v.marqueeShow = el.checked;
      }
      if (isSuperAdmin || canEdit('introLogoSize')) {
        var el = document.getElementById('bs-intro-logo-size');
        if (el) v.introLogoSize = el.value;
      }
      if (isSuperAdmin || canEdit('datetimeSize')) {
        var el = document.getElementById('bs-datetime-size');
        if (el) v.datetimeSize = el.value;
      }
      if (isSuperAdmin || canEdit('datetimeFont')) {
        var el = document.getElementById('bs-datetime-font');
        if (el) v.datetimeFont = el.value;
      }
      if (isSuperAdmin || canEdit('heroEnFont')) {
        var el = document.getElementById('bs-hero-en-font');
        if (el) v.heroEnFont = el.value;
      }
      if (isSuperAdmin || canEdit('heroEnSize')) {
        var el = document.getElementById('bs-hero-en-size');
        if (el) v.heroEnSize = el.value;
      }
      if (isSuperAdmin || canEdit('heroZhSize')) {
        var el = document.getElementById('bs-hero-zh-size');
        if (el) v.heroZhSize = el.value;
      }
      if (isSuperAdmin || canEdit('socialFacebook')) {
        var link = document.getElementById('bs-fb-link');
        var show = document.getElementById('bs-fb-show');
        if (link) v.facebookLink = link.value;
        if (show) v.facebookShow = show.checked;
      }
      if (isSuperAdmin || canEdit('socialInstagram')) {
        var link = document.getElementById('bs-ig-link');
        var show = document.getElementById('bs-ig-show');
        if (link) v.instagramLink = link.value;
        if (show) v.instagramShow = show.checked;
      }
      if (isSuperAdmin || canEdit('socialThreads')) {
        var link = document.getElementById('bs-threads-link');
        var show = document.getElementById('bs-threads-show');
        if (link) v.threadsLink = link.value;
        if (show) v.threadsShow = show.checked;
      }
      if (isSuperAdmin || canEdit('socialYoutube')) {
        var link = document.getElementById('bs-youtube-link');
        var show = document.getElementById('bs-youtube-show');
        if (link) v.youtubeLink = link.value;
        if (show) v.youtubeShow = show.checked;
      }
      if (isSuperAdmin || canEdit('socialLine')) {
        var link = document.getElementById('bs-line-id');
        var show = document.getElementById('bs-line-show');
        if (link) v.lineId = link.value;
        if (show) v.lineShow = show.checked;
      }
      
      // 光暈設定
      if (isSuperAdmin || canEdit('rippleColor')) {
        var el = document.getElementById('bs-ripple-color');
        if (el) v.rippleColor = el.value;
      }
      if (isSuperAdmin || canEdit('rippleOpacity')) {
        var el = document.getElementById('bs-ripple-opacity');
        if (el) v.rippleOpacity = el.value;
      }
      if (isSuperAdmin || canEdit('rippleSize')) {
        var el = document.getElementById('bs-ripple-size');
        if (el) v.rippleSize = el.value;
      }
      if (isSuperAdmin || canEdit('rippleWidth')) {
        var el = document.getElementById('bs-ripple-width');
        if (el) v.rippleWidth = el.value;
      }
      
      // 流程數字
      if (isSuperAdmin || canEdit('procNumOpacity')) {
        var el = document.getElementById('bs-proc-dim');
        if (el) v.procNumOpacity = el.value;
      }
      if (isSuperAdmin || canEdit('procNumHoverOpacity')) {
        var el = document.getElementById('bs-proc-hover');
        if (el) v.procNumHoverOpacity = el.value;
      }
      
      // 拖曳發光設定
      if (isSuperAdmin || canEdit('pfGlowColor')) {
        var el = document.getElementById('bs-pf-glow-color');
        if (el) v.pfGlowColor = el.value;
      }
      if (isSuperAdmin || canEdit('pfGlowSize')) {
        var el = document.getElementById('bs-pf-glow-size');
        if (el) v.pfGlowSize = el.value;
      }
      if (isSuperAdmin || canEdit('pfGlowRange')) {
        var el = document.getElementById('bs-pf-glow-range');
        if (el) v.pfGlowRange = el.value;
      }
      if (isSuperAdmin || canEdit('pfGlowBrightness')) {
        var el = document.getElementById('bs-pf-glow-brightness');
        if (el) v.pfGlowBrightness = el.value;
      }
      if (isSuperAdmin || canEdit('pfGlowSoftness')) {
        var el = document.getElementById('bs-pf-glow-softness');
        if (el) v.pfGlowSoftness = el.value;
      }

      // 拖曳箭頭設定
      if (isSuperAdmin || canEdit('dragArrowColor')) {
        var el = document.getElementById('bs-arrow-color');
        if (el) v.dragArrowColor = el.value;
      }
      if (isSuperAdmin || canEdit('dragArrowIcon')) {
        var el = document.getElementById('bs-arrow-icon');
        if (el) v.dragArrowIcon = el.value;
      }
      if (isSuperAdmin || canEdit('dragArrowSize')) {
        var el = document.getElementById('bs-arrow-size');
        if (el) v.dragArrowSize = el.value;
      }
      if (isSuperAdmin || canEdit('dragArrowOpacity')) {
        var el = document.getElementById('bs-arrow-opacity');
        if (el) v.dragArrowOpacity = el.value;
      }
      if (isSuperAdmin || canEdit('dragArrowHoverOpacity')) {
        var el = document.getElementById('bs-arrow-hover-opacity');
        if (el) v.dragArrowHoverOpacity = el.value;
      }
      if (isSuperAdmin || canEdit('dragArrowCooldown')) {
        var el = document.getElementById('bs-arrow-cooldown');
        if (el) v.dragArrowCooldown = el.value;
      }
      if (isSuperAdmin || canEdit('dragArrowActiveGlow')) {
        var el = document.getElementById('bs-arrow-active-glow');
        if (el) v.dragArrowActiveGlow = el.value;
      }

      // 系統設定
      if (isSuperAdmin || canEdit('autoLogout')) {
        var el = document.getElementById('bs-auto-logout');
        if (el) v.autoLogout = el.value;
      }
      if (isSuperAdmin || canEdit('autoSave')) {
        var el = document.getElementById('bs-auto-save');
        if (el) v.autoSave = el.value;
      }
      if (isSuperAdmin || canEdit('copyright')) {
        var el = document.getElementById('bs-copyright');
        if (el) v.copyright = el.value;
      }
      if (isSuperAdmin || canEdit('email')) {
        var el = document.getElementById('bs-send-email');
        if (el) v.email = el.value;
      }
      if (isSuperAdmin || canEdit('contactEmail')) {
        var el = document.getElementById('bs-contact-email');
        if (el) v.contactEmail = el.value;
      }
      
      return v;
    }
  }).then(function(result) {
    if (result.isConfirmed) {
      var v = result.value;
      
      // 更新首頁設定
      if (v.introTagline !== undefined) D.introTagline = v.introTagline;
      if (v.introTaglineSize !== undefined) D.introTaglineSize = v.introTaglineSize;
      if (v.heroSubtitle !== undefined) D.heroSubtitle = v.heroSubtitle;
      if (v.heroEnTitle !== undefined) D.heroEnTitle = v.heroEnTitle;
      D.heroZhTitle = v.heroZhTitle;
      D.heroDesc = v.heroDesc;
      if (v.marqueeItems !== undefined) D.marqueeItems = v.marqueeItems;
      if (v.marqueeColor !== undefined) D.marqueeColor = v.marqueeColor;
      if (v.marqueeSpeed !== undefined) D.marqueeSpeed = v.marqueeSpeed;
      if (v.marqueeShow !== undefined) D.marqueeShow = v.marqueeShow;
      
      // 更新 theme
      if (!D.theme) D.theme = {};
      if (v.introLogoSize !== undefined) D.theme.introLogoSize = v.introLogoSize;
      if (v.datetimeSize !== undefined) D.theme.datetimeSize = v.datetimeSize;
      if (v.datetimeFont !== undefined) D.theme.datetimeFont = v.datetimeFont;
      if (v.heroEnFont !== undefined) D.theme.heroEnFont = v.heroEnFont;
      D.theme.heroEnSize = v.heroEnSize;
      D.theme.heroZhSize = v.heroZhSize;
      D.theme.rippleColor = v.rippleColor;
      D.theme.rippleOpacity = v.rippleOpacity;
      D.theme.rippleSize = v.rippleSize;
      D.theme.rippleWidth = v.rippleWidth;
      D.theme.procNumOpacity = v.procNumOpacity;
      D.theme.procNumHoverOpacity = v.procNumHoverOpacity;
      
      // 更新社群連結
      if (!D.social) D.social = {};
      if (v.facebookLink !== undefined) D.social.facebookLink = v.facebookLink;
      if (v.facebookShow !== undefined) D.social.facebookShow = v.facebookShow;
      if (v.instagramLink !== undefined) D.social.instagramLink = v.instagramLink;
      if (v.instagramShow !== undefined) D.social.instagramShow = v.instagramShow;
      if (v.threadsLink !== undefined) D.social.threadsLink = v.threadsLink;
      if (v.threadsShow !== undefined) D.social.threadsShow = v.threadsShow;
      if (v.youtubeLink !== undefined) D.social.youtubeLink = v.youtubeLink;
      if (v.youtubeShow !== undefined) D.social.youtubeShow = v.youtubeShow;
      if (v.lineId !== undefined) D.social.lineId = v.lineId;
      if (v.lineShow !== undefined) D.social.lineShow = v.lineShow;
      
      // 更新系統設定
      if (!D.backendSettings) D.backendSettings = {};
      if (v.pfGlowColor !== undefined) D.backendSettings.pfGlowColor = v.pfGlowColor;
      if (v.pfGlowSize !== undefined) D.backendSettings.pfGlowSize = parseInt(v.pfGlowSize);
      if (v.pfGlowRange !== undefined) D.backendSettings.pfGlowRange = parseInt(v.pfGlowRange);
      if (v.pfGlowBrightness !== undefined) D.backendSettings.pfGlowBrightness = parseFloat(v.pfGlowBrightness);
      if (v.pfGlowSoftness !== undefined) D.backendSettings.pfGlowSoftness = parseFloat(v.pfGlowSoftness);
      if (v.dragArrowColor !== undefined) D.backendSettings.dragArrowColor = v.dragArrowColor;
      if (v.dragArrowIcon !== undefined) D.backendSettings.dragArrowIcon = v.dragArrowIcon;
      if (v.dragArrowSize !== undefined) D.backendSettings.dragArrowSize = parseInt(v.dragArrowSize);
      if (v.dragArrowOpacity !== undefined) D.backendSettings.dragArrowOpacity = parseFloat(v.dragArrowOpacity);
      if (v.dragArrowHoverOpacity !== undefined) D.backendSettings.dragArrowHoverOpacity = parseFloat(v.dragArrowHoverOpacity);
      if (v.dragArrowCooldown !== undefined) D.backendSettings.dragArrowCooldown = parseInt(v.dragArrowCooldown);
      if (v.dragArrowActiveGlow !== undefined) D.backendSettings.dragArrowActiveGlow = parseInt(v.dragArrowActiveGlow);
      if (v.autoLogout !== undefined) D.backendSettings.autoLogoutMinutes = parseInt(v.autoLogout);
      if (v.autoSave !== undefined) D.backendSettings.autoSaveSeconds = parseInt(v.autoSave);
      if (v.copyright !== undefined) D.backendSettings.copyrightTemplate = v.copyright;
      if (v.email !== undefined) D.contactEmail = v.email;
      if (v.contactEmail !== undefined) D.contactEmail = v.contactEmail;

      // ☁️ 雲端同步設定（只存在此裝置，不進入 D）
      if (isSuperAdmin) {
        var cOwner  = document.getElementById('bs-cloud-owner');
        var cRepo   = document.getElementById('bs-cloud-repo');
        var cBranch = document.getElementById('bs-cloud-branch');
        var cToken  = document.getElementById('bs-cloud-token');
        if (cOwner)  CLOUD.owner  = cOwner.value.trim();
        if (cRepo)   CLOUD.repo   = cRepo.value.trim();
        if (cBranch) CLOUD.branch = cBranch.value.trim() || 'main';
        if (cToken)  CLOUD.token  = cToken.value.trim();
        try { localStorage.setItem('MK5_CLOUD', JSON.stringify(CLOUD)); } catch(e) {}
      }

      logEdit(['introTagline','introTaglineSize','heroSubtitle','heroEnTitle','heroZhTitle','heroDesc','theme','social','backendSettings','contactEmail']);
      persist();
      applyTheme();
      updateDOM();
      if (typeof applyDragArrowStyles === 'function') applyDragArrowStyles();
      if (typeof applyDragGlowStyles === 'function') applyDragGlowStyles();
      if (typeof updateDragArrowIcons === 'function') updateDragArrowIcons();

      // 短暫顯示箭頭讓用戶確認設定效果（3秒後自動隱藏）
      (function() {
        var pl = document.getElementById('drag-arrow-left');
        var pr = document.getElementById('drag-arrow-right');
        if (pl && pr) {
          positionDragArrows();
          pl.classList.add('show'); pr.classList.add('show');
          setTimeout(function() {
            if (!draggedItem) { pl.classList.remove('show'); pr.classList.remove('show'); }
          }, 3000);
        }
      })();

      // 重新啟動自動登出和自動儲存計時器
      if (CU) {
        startAutoLogout();
        startAutoSave();
      }

      Swal.fire({title:'✅ 設定已儲存！',text:'所有後台設定已更新',timer:2000,showConfirmButton:false,icon:'success'});
      // ☁️ 自動同步到 GitHub
      if (CLOUD.token && CLOUD.owner && CLOUD.repo) cloudPush(true);
    }
  });
};

/* ============================================================
   USER MANAGER
============================================================ */
/* ============================================================
   INBOX / MESSAGES
   ============================================================ */
/* ============================================================
   INBOX - UNREAD COUNT
   ============================================================ */
function getUnreadCount() {
  var messages = D.inbox || [];
  var count = 0;
  for (var i = 0; i < messages.length; i++) {
    if (!messages[i].read) count++;
  }
  return count;
}

function updateInboxBadge() {
  var btn = document.querySelector('.admin-btn[onclick="showInbox()"]');
  if (!btn) return;
  
  var count = getUnreadCount();
  var existingBadge = btn.querySelector('.inbox-badge');
  
  if (count > 0) {
    var displayCount = count > 100 ? '100' : count.toString();
    if (existingBadge) {
      existingBadge.textContent = displayCount;
    } else {
      var badge = document.createElement('span');
      badge.className = 'inbox-badge';
      badge.textContent = displayCount;
      btn.appendChild(badge);
    }
  } else {
    if (existingBadge) {
      existingBadge.remove();
    }
  }
}

/* ============================================================
   INBOX - SHOW
   ============================================================ */
window.showInbox = function() {
  if (!CU) return;
  
  var messages = D.inbox || [];
  
  var html = '<div style="max-height:500px;overflow-y:auto">';
  
  if (messages.length === 0) {
    html += '<div style="text-align:center;padding:40px;color:var(--t3)">目前沒有來信</div>';
  } else {
    html += '<table style="width:100%;border-collapse:collapse">';
    html += '<thead><tr style="border-bottom:2px solid var(--border);text-align:left">';
    html += '<th style="padding:12px 8px;font-size:.85rem;color:var(--t2)">時間</th>';
    html += '<th style="padding:12px 8px;font-size:.85rem;color:var(--t2)">客戶信箱</th>';
    html += '<th style="padding:12px 8px;font-size:.85rem;color:var(--t2)">主旨</th>';
    html += '<th style="padding:12px 8px;font-size:.85rem;color:var(--t2)">操作</th>';
    html += '</tr></thead><tbody>';
    
    for (var i = messages.length - 1; i >= 0; i--) {
      var msg = messages[i];
      var unreadDot = msg.read ? '' : '<span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;margin-right:8px"></span>';
      html += '<tr style="border-bottom:1px solid var(--border-dim)">';
      html += '<td style="padding:12px 8px;font-size:.8rem;color:var(--t3)">' + unreadDot + (msg.time || '') + '</td>';
      html += '<td style="padding:12px 8px;font-size:.85rem">' + (msg.email || '') + '</td>';
      html += '<td style="padding:12px 8px;font-size:.85rem">' + (msg.subject || '') + '</td>';
      html += '<td style="padding:12px 8px"><button onclick="replyMessage(' + i + ')" class="swal2-confirm swal2-styled" style="margin:0;padding:6px 12px;font-size:.8rem">回覆</button></td>';
      html += '</tr>';
    }
    
    html += '</tbody></table>';
  }
  
  html += '</div>';
  
  // 標記所有訊息為已讀
  for (var i = 0; i < messages.length; i++) {
    messages[i].read = true;
  }
  persist();
  updateInboxBadge();
  
  Swal.fire({
    title: '📧 來信統計',
    html: html,
    width: 800,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: '關閉'
  });
};

window.replyMessage = function(idx) {
  var messages = D.inbox || [];
  var msg = messages[idx];
  if (!msg) return;
  
  Swal.fire({
    title: '回覆來信',
    html: '<div style="text-align:left;margin-bottom:12px">' +
          '<div style="font-size:.85rem;color:var(--t3);margin-bottom:4px">收件人：<span style="color:var(--t1)">' + msg.email + '</span></div>' +
          '<div style="font-size:.85rem;color:var(--t3);margin-bottom:12px">主旨：<span style="color:var(--t1)">' + msg.subject + '</span></div>' +
          '</div>' +
          '<textarea id="reply-message" class="swal2-textarea" placeholder="輸入回覆內容" style="height:200px"></textarea>',
    showCancelButton: true,
    confirmButtonText: '發送回覆',
    cancelButtonText: '取消',
    preConfirm: function() {
      var reply = document.getElementById('reply-message').value.trim();
      if (!reply) {
        Swal.showValidationMessage('請輸入回覆內容');
        return false;
      }
      return { email: msg.email, subject: 'Re: ' + msg.subject, message: reply };
    }
  }).then(function(result) {
    if (result.isConfirmed) {
      var r = result.value;
      var mailtoLink = 'mailto:' + r.email + '?subject=' + encodeURIComponent(r.subject) + '&body=' + encodeURIComponent(r.message);
      window.location.href = mailtoLink;
      
      Swal.fire({
        title: '✅ 已開啟郵件軟體',
        text: '請在您的郵件軟體中完成發送',
        timer: 2000,
        showConfirmButton: false,
        icon: 'success'
      });
    }
  });
};

/* ============================================================
   USER MANAGER
   ============================================================ */
window.showUsers = function() {
  function uLH() {
    var html = '';
    var roleMap = {
      'super_admin':'超級執行長',
      'ops_admin':'營運長',
      'editor':'一般編輯'
    };
    
    for (var i = 0; i < D.users.length; i++) {
      var u = D.users[i];
      var roleName = roleMap[u.role] || '一般編輯';
      var roleClass = u.role || 'editor';
      
      // 預設大頭貼（灰色圓圈）
      var avatarSrc = u.avatar || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCI+PGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9IiM5QTk0OEMiLz48L3N2Zz4=';
      
      html += '<div class="user-card">';
      html += '<div class="user-avatar-wrap">';
      html += '<img src="' + avatarSrc + '" class="user-avatar-large' + (u.online?' online':'') + '" alt="' + u.name + '">';
      html += '<button class="upload-avatar-btn" onclick="uploadAvatar(' + i + ')"><i class="fa-solid fa-camera"></i></button>';
      html += '</div>';
      html += '<div class="user-info">';
      html += '<div class="user-name">';
      html += u.name;
      html += '<span class="user-role-badge ' + roleClass + '">' + roleName + '</span>';
      if (u.online) html += '<span class="user-online-status">● 在線</span>';
      html += '</div>';
      html += '<div class="user-meta">' + u.username + ' · 最後登入：' + (u.lastSeen||'從未') + '</div>';
      html += '</div>';
      html += '<div class="user-actions">';
      html += '<button class="user-action-btn" onclick="editUserAt(' + i + ')">編輯</button>';
      if (u.role !== 'super_admin') {
        html += '<button class="user-action-btn delete" onclick="delUserAt(' + i + ')">刪除</button>';
      }
      html += '</div>';
      html += '</div>';
    }
    return html;
  }

  var _isAdmin = CU && CU.role === 'super_admin';
  var _myName  = CU && CU.username;

  // 超級執行長：看所有人紀錄 | 其他人：只看自己的紀錄
  var logs = D.editLog || [];
  var visibleLogs = [];
  for (var _li = 0; _li < logs.length; _li++) {
    if (_isAdmin || logs[_li].username === _myName) {
      visibleLogs.push({ log: logs[_li], idx: _li });
    }
  }

  var logRows = '';
  var logSectionTitle = _isAdmin ? '全員編輯紀錄' : '我的編輯紀錄';
  for (var i = 0; i < Math.min(visibleLogs.length, 15); i++) {
    var _entry = visibleLogs[i];
    var l = _entry.log;
    var _origIdx = _entry.idx;
    logRows +=
      '<div style="padding:5px 0;border-bottom:1px solid var(--border);font-size:.72rem;color:var(--t3);display:flex;justify-content:space-between;align-items:center">' +
        '<div>' +
          // 超級執行長看到名字，其他人只看時間（都是自己的）
          (_isAdmin ? '<span style="color:var(--gold)">' + l.user + '</span> · ' : '') +
          l.date +
          '<br><span>' + (l.keys||[]).slice(0, 4).join(', ') + ((l.keys||[]).length > 4 ? '…' : '') + '</span>' +
        '</div>' +
        // 還原按鈕：僅超級執行長可見
        (_isAdmin && l.snapshot ? '<button onclick="restoreSnap(' + _origIdx + ')" style="background:transparent;border:1px solid var(--border-g);color:var(--t2);padding:2px 8px;cursor:pointer;font-size:.7rem;flex-shrink:0">還原</button>' : '') +
      '</div>';
  }
  if (!logRows) {
    logRows = '<div style="color:var(--t3);font-size:.78rem;padding:8px 0">' +
      (_isAdmin ? '尚無任何編輯紀錄' : '您尚無任何編輯紀錄') + '</div>';
  }

  window.delUserAt = function(i) { D.users.splice(i, 1); persist(); document.getElementById('ulistw').innerHTML = uLH(); };
  window.restoreSnap = function(li) {
    Swal.fire({ title:'確定還原？', text:'將還原至此版本', icon:'warning', showCancelButton:true, confirmButtonText:'確定還原', cancelButtonText:'取消' }).then(function(r2) {
      if (r2.isConfirmed) {
        try {
          var snap = JSON.parse(D.editLog[li].snapshot);
          var savedLog = D.editLog, savedUsers = D.users;
          D = snap; D.editLog = savedLog; D.users = savedUsers;
          persist(); applyTheme(); updateDOM();
          Swal.fire({ title:'已還原！', timer:1200, showConfirmButton:false, icon:'success' });
        } catch(e) { Swal.fire({ title:'還原失敗', icon:'error' }); }
      }
    });
  };
  
  /* 大頭貼上傳函數 */
  window.uploadAvatar = function(userIdx) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*'; // 支援所有圖片格式
    input.onchange = function(e) {
      var file = e.target.files[0];
      if (!file) return;
      
      // 檢查是否為圖片
      if (!file.type.startsWith('image/')) {
        Swal.fire({title:'格式錯誤',text:'請選擇圖片檔案',icon:'error'});
        return;
      }
      
      // 放寬檔案大小限制到 5MB
      if (file.size > 5000000) {
        Swal.fire({title:'檔案過大',text:'請選擇小於 5MB 的圖片',icon:'error'});
        return;
      }
      
      var reader = new FileReader();
      reader.onload = function(evt) {
        var img = new Image();
        img.onload = function() {
          // 創建 canvas 調整為 80x80
          var canvas = document.createElement('canvas');
          canvas.width = 80;
          canvas.height = 80;
          var ctx = canvas.getContext('2d');
          
          // 計算裁切（保持中心）
          var size = Math.min(img.width, img.height);
          var x = (img.width - size) / 2;
          var y = (img.height - size) / 2;
          
          ctx.drawImage(img, x, y, size, size, 0, 0, 80, 80);
          
          // 轉為 JPEG base64（高品質壓縮）
          var avatarData = canvas.toDataURL('image/jpeg', 0.9);
          D.users[userIdx].avatar = avatarData;
          
          // 如果是當前用戶，也更新 CU
          if (CU && CU.username === D.users[userIdx].username) {
            CU.avatar = avatarData;
            sessionStorage.setItem('mk5cu', JSON.stringify(CU));
            updateAdminUI(); // 更新後台顯示
          }
          
          logEdit(['users']);
          persist();
          document.getElementById('ulistw').innerHTML = uLH();
          Swal.fire({title:'✅ 大頭貼已上傳！',timer:1200,showConfirmButton:false,icon:'success'});
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };
  
  window.editUserAt = function(i) {
    var u = D.users[i];
    var avatarSrc = u.avatar || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCI+PGNpcmNsZSBjeD0iMjUiIGN5PSIyNSIgcj0iMjAiIGZpbGw9IiM5QTk0OEMiLz48L3N2Zz4=';
    
    Swal.fire({
      title: '編輯帳號',
      html: '<div style="text-align:center;margin-bottom:16px">' +
            '<div style="position:relative;display:inline-block">' +
            '<img id="edit-avatar-preview" src="' + avatarSrc + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid var(--gold)">' +
            '<button onclick="editUploadAvatar(' + i + ')" style="position:absolute;bottom:-5px;right:-5px;width:28px;height:28px;border-radius:50%;background:var(--gold);border:2px solid var(--bg);color:var(--bg);cursor:pointer;font-size:.75rem"><i class="fa-solid fa-camera"></i></button>' +
            '</div></div>' +
            '<input id="eu-nm" class="swal2-input" value="' + u.name + '" placeholder="顯示名稱">' +
            '<input id="eu-un" class="swal2-input" value="' + u.username + '" placeholder="帳號">' +
            '<input id="eu-pw" type="password" class="swal2-input" placeholder="新密碼（留空不變）">' +

            (CU.role === 'super_admin' ? '<div style="margin-top:16px;text-align:left"><strong style="color:var(--gold);font-size:.9rem;display:block;margin-bottom:8px">可編輯項目：</strong><div style="max-height:200px;overflow-y:auto;border:1px solid var(--border);padding:10px;background:var(--bg2)" id="perm-list"></div></div>' : ''),
      showCancelButton: true, confirmButtonText: '儲存',
      didOpen: function() {
        if (CU.role === 'super_admin') {
          var permList = document.getElementById('perm-list');
          if (permList) {
            var uPerms = u.permissions || [];
            var html = '';
            for (var j = 0; j < EDITABLE_ITEMS.length; j++) {
              var itemId = EDITABLE_ITEMS[j];
              var itemName = EDITABLE_NAMES[itemId] || itemId;
              var checked = uPerms.indexOf(itemId) >= 0 ? ' checked' : '';
              html += '<label style="display:block;margin-bottom:6px;font-size:.85rem;cursor:pointer"><input type="checkbox" class="perm-cb" value="' + itemId + '"' + checked + '> ' + (j + 1) + '. ' + itemName + '</label>';
            }
            permList.innerHTML = html;
          }
        }
      },
      preConfirm: function() {
        var nm = document.getElementById('eu-nm').value.trim();
        var un = document.getElementById('eu-un').value.trim();
        var pw = document.getElementById('eu-pw').value;
        var role = u.role; // 角色不可修改
        if (!nm || !un) { Swal.showValidationMessage('名稱和帳號必填'); return false; }
        var permissions = [];
        var cbs = document.querySelectorAll('.perm-cb:checked');
        for (var k = 0; k < cbs.length; k++) permissions.push(cbs[k].value);
        return { name:nm, username:un, password:pw||u.password, role:role, permissions:permissions };
      }
    }).then(function(r) {
      if (r.isConfirmed) {
        D.users[i] = Object.assign({}, D.users[i], r.value);
        if (CU && CU.username === u.username) { CU = Object.assign({}, CU, r.value); sessionStorage.setItem('mk5cu', JSON.stringify(CU)); }
        persist(); showUsers();
      }
    });
    
    // 編輯時的大頭貼上傳函數
    window.editUploadAvatar = function(userIdx) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;
        if (file.size > 5000000) {
          Swal.fire({title:'檔案過大',text:'請選擇小於 5MB 的圖片',icon:'error'});
          return;
        }
        var reader = new FileReader();
        reader.onload = function(evt) {
          var img = new Image();
          img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = 80;
            canvas.height = 80;
            var ctx = canvas.getContext('2d');
            var size = Math.min(img.width, img.height);
            var x = (img.width - size) / 2;
            var y = (img.height - size) / 2;
            ctx.drawImage(img, x, y, size, size, 0, 0, 80, 80);
            var avatarData = canvas.toDataURL('image/jpeg', 0.9);
            D.users[userIdx].avatar = avatarData;
            document.getElementById('edit-avatar-preview').src = avatarData;
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };
  };

  Swal.fire({
    title: '👥 帳號管理', width: 560,
    html: '<div id="ulistw" style="text-align:left;max-height:220px;overflow-y:auto">' + uLH() + '</div>' +
          '<button onclick="addUserDlg()" style="margin-top:12px;background:var(--gold);border:none;color:var(--bg);padding:8px 18px;cursor:pointer;font-size:.82rem;font-weight:700">＋ 新增帳號</button>' +
          '<div style="margin-top:16px;text-align:left"><strong style="color:var(--gold);font-size:.75rem;letter-spacing:.1em">' + logSectionTitle + '</strong>' +
          '<div style="max-height:160px;overflow-y:auto;margin-top:6px">' + logRows + '</div></div>',
    confirmButtonText: '關閉', showCancelButton: false,
    didOpen: function() {
      window.addUserDlg = function() {
        Swal.fire({
          title: '新增帳號',
          html: '<input id="nu-nm" class="swal2-input" placeholder="顯示名稱">' +
                '<input id="nu-un" class="swal2-input" placeholder="帳號（英文）">' +
                '<input id="nu-pw" type="password" class="swal2-input" placeholder="密碼">' +
                '<select id="nu-ro" class="swal2-input">' +
                  '<option value="editor">一般編輯</option>' +
                  '<option value="ops_admin">營運長</option>' +
                  '<option value="super_admin">超級執行長</option>' +
                '</select>',
          showCancelButton: true, confirmButtonText: '新增',
          preConfirm: function() {
            var nm = document.getElementById('nu-nm').value.trim();
            var un = document.getElementById('nu-un').value.trim();
            var pw = document.getElementById('nu-pw').value;
            if (!nm || !un || !pw) { Swal.showValidationMessage('請填寫所有欄位'); return false; }
            for (var i = 0; i < D.users.length; i++) if (D.users[i].username === un) { Swal.showValidationMessage('帳號已存在'); return false; }
            return { name:nm, username:un, password:pw, role:document.getElementById('nu-ro').value, online:false, lastSeen:'' };
          }
        }).then(function(r2) { if (r2.isConfirmed) { D.users.push(r2.value); persist(); showUsers(); } });
      };
    }
  });
};

window.editMyProfile = function() {
  var i = -1;
  for (var j = 0; j < D.users.length; j++) if (D.users[j].username === (CU && CU.username)) { i = j; break; }
  if (i >= 0) editUserAt(i);
};

/* ============================================================
   CLOCK & WEATHER
============================================================ */
function initClock() {
  updateClock();
  setInterval(updateClock, 1000);
}

function updateClock() {
  var now = new Date();
  var y = now.getFullYear();
  var m = String(now.getMonth() + 1).padStart(2, '0');
  var d = String(now.getDate()).padStart(2, '0');
  var hh = String(now.getHours()).padStart(2, '0');
  var mm = String(now.getMinutes()).padStart(2, '0');
  var ss = String(now.getSeconds()).padStart(2, '0');
  var str = y + '/' + m + '/' + d + ' ' + hh + ':' + mm + ':' + ss;
  var el = document.getElementById('clock-display');
  if (el) el.textContent = str;
}

function initWeather() {
  var lat = 25.04, lon = 121.56;
  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lon + '&current_weather=true';
  fetch(url)
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.current_weather) {
        var wc = data.current_weather.weathercode;
        var icon = getWeatherIcon(wc);
        var label = getWeatherLabel(wc);
        var el = document.getElementById('weather-icon');
        if (el) el.textContent = icon + ' ' + label;
      }
    })
    .catch(function(e) { 
      console.error('Weather API error:', e);
      var el = document.getElementById('weather-icon');
      if (el) el.textContent = '☀️ 晴天';
    });
}

function getWeatherIcon(code) {
  if (code === 0) return '☀️';
  if (code >= 1 && code <= 3) return '☁️';
  if (code >= 51 && code <= 67) return '☂️';
  if (code >= 80 && code <= 99) return '⚡';
  return '☀️';
}

function getWeatherLabel(code) {
  if (code === 0) return '晴天';
  if (code >= 1 && code <= 3) return '陰天';
  if (code >= 51 && code <= 67) return '降雨';
  if (code >= 80 && code <= 99) return '打雷';
  return '晴天';
}

/* ============================================================
   ANALYTICS
============================================================ */
function trackVisit() {
  if (!D.analytics) D.analytics = { pageViews:0, byDate:{}, byDevice:{}, bySource:{} };
  D.analytics.pageViews = (D.analytics.pageViews || 0) + 1;
  var today = new Date().toLocaleDateString('zh-TW');
  D.analytics.byDate[today] = (D.analytics.byDate[today] || 0) + 1;
  var keys = Object.keys(D.analytics.byDate);
  if (keys.length > 30) delete D.analytics.byDate[keys[0]];
  var dev = /Tablet|iPad/i.test(navigator.userAgent) ? '平板' : /Mobi|Android/i.test(navigator.userAgent) ? '手機' : '桌上型電腦';
  D.analytics.byDevice[dev] = (D.analytics.byDevice[dev] || 0) + 1;
  var src = '直接輸入';
  if (document.referrer) {
    if (/google|bing|yahoo/i.test(document.referrer)) src = '搜尋引擎';
    else if (/facebook|instagram|line|youtube/i.test(document.referrer)) src = '社群媒體';
    else src = '外部連結';
  }
  D.analytics.bySource[src] = (D.analytics.bySource[src] || 0) + 1;
  
  // 地區追蹤（使用 ipapi.co）
  if (!D.analytics.byLocation) D.analytics.byLocation = {};
  fetch('https://ipapi.co/json/')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      if (data && data.country_name) {
        var loc = data.country_name + (data.city ? ' / ' + data.city : '');
        D.analytics.byLocation[loc] = (D.analytics.byLocation[loc] || 0) + 1;
        persist();
      }
    })
    .catch(function(e) { 
      console.log('Location API unavailable:', e.message); 
    });
  
  persist();
}

/* Excel 匯出函數 */
window.exportAnalyticsExcel = function() {
  if (typeof XLSX === 'undefined') {
    Swal.fire({title:'功能未啟用',html:'Excel 匯出需要 SheetJS library<br>請確認網頁已載入相關資源',icon:'info'});
    return;
  }
  
  var a = D.analytics || {};
  var wb = XLSX.utils.book_new();
  
  // 日期數據
  var dateData = [['日期', '瀏覽次數']];
  var dates = Object.keys(a.byDate || {}).sort();
  for (var i = 0; i < dates.length; i++) {
    dateData.push([dates[i], a.byDate[dates[i]]]);
  }
  var ws1 = XLSX.utils.aoa_to_sheet(dateData);
  XLSX.utils.book_append_sheet(wb, ws1, '日期趨勢');
  
  // 裝置數據
  var deviceData = [['裝置類型', '次數']];
  var devices = Object.keys(a.byDevice || {});
  for (var i = 0; i < devices.length; i++) {
    deviceData.push([devices[i], a.byDevice[devices[i]]]);
  }
  var ws2 = XLSX.utils.aoa_to_sheet(deviceData);
  XLSX.utils.book_append_sheet(wb, ws2, '裝置類型');
  
  // 流量來源
  var sourceData = [['流量來源', '次數']];
  var sources = Object.keys(a.bySource || {});
  for (var i = 0; i < sources.length; i++) {
    sourceData.push([sources[i], a.bySource[sources[i]]]);
  }
  var ws3 = XLSX.utils.aoa_to_sheet(sourceData);
  XLSX.utils.book_append_sheet(wb, ws3, '流量來源');
  
  // 地區分布
  if (a.byLocation) {
    var locData = [['地區', '次數']];
    var locs = Object.keys(a.byLocation);
    for (var i = 0; i < locs.length; i++) {
      locData.push([locs[i], a.byLocation[locs[i]]]);
    }
    var ws4 = XLSX.utils.aoa_to_sheet(locData);
    XLSX.utils.book_append_sheet(wb, ws4, '地區分布');
  }
  
  XLSX.writeFile(wb, 'analytics_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  Swal.fire({title:'✅ Excel 已匯出！',timer:1200,showConfirmButton:false,icon:'success'});
};

/* PDF 匯出函數 */
window.exportAnalyticsPDF = function() {
  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    Swal.fire({title:'功能未啟用',html:'PDF 匯出需要 jsPDF library<br>請確認網頁已載入相關資源',icon:'info'});
    return;
  }
  
  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();
  var a = D.analytics || {};
  
  // 標題
  doc.setFontSize(16);
  doc.text('瀏覽數據分析報告', 14, 20);
  doc.setFontSize(10);
  doc.text('匯出日期：' + new Date().toLocaleDateString('zh-TW'), 14, 28);
  
  // 日期趨勢表格
  var dateRows = [];
  var dates = Object.keys(a.byDate || {}).sort().slice(-30); // 最近30天
  for (var i = 0; i < dates.length; i++) {
    dateRows.push([dates[i], a.byDate[dates[i]]]);
  }
  
  if (dateRows.length) {
    doc.autoTable({
      head: [['日期', '瀏覽次數']],
      body: dateRows,
      startY: 35,
      theme: 'grid',
      headStyles: {fillColor: [201, 150, 58]}
    });
  }
  
  // 裝置類型
  var deviceRows = [];
  var devices = Object.keys(a.byDevice || {});
  for (var i = 0; i < devices.length; i++) {
    deviceRows.push([devices[i], a.byDevice[devices[i]]]);
  }
  
  if (deviceRows.length) {
    doc.autoTable({
      head: [['裝置類型', '次數']],
      body: deviceRows,
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 35,
      theme: 'grid',
      headStyles: {fillColor: [201, 150, 58]}
    });
  }
  
  // 流量來源
  var sourceRows = [];
  var sources = Object.keys(a.bySource || {});
  for (var i = 0; i < sources.length; i++) {
    sourceRows.push([sources[i], a.bySource[sources[i]]]);
  }
  
  if (sourceRows.length) {
    doc.autoTable({
      head: [['流量來源', '次數']],
      body: sourceRows,
      startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 35,
      theme: 'grid',
      headStyles: {fillColor: [201, 150, 58]}
    });
  }
  
  doc.save('analytics_' + new Date().toISOString().slice(0, 10) + '.pdf');
  Swal.fire({title:'✅ PDF 已匯出！',timer:1200,showConfirmButton:false,icon:'success'});
};

window.showAnalytics = function() {
  var a = D.analytics || {};
  var byDate = a.byDate || {};
  var dk = Object.keys(byDate).slice(-7);
  var mx = 1;
  for (var i = 0; i < dk.length; i++) if (byDate[dk[i]] > mx) mx = byDate[dk[i]];

  var dr = '';
  if (dk.length) {
    for (var i = 0; i < dk.length; i++) {
      var v = byDate[dk[i]], w = Math.round(v / mx * 100);
      dr += '<div class="anl-bar-row"><div class="anl-bar-label" style="width:90px">' + dk[i] + '</div><div class="anl-bar-track"><div class="anl-bar-fill" data-w="' + w + '%" style="width:0%"></div></div><div class="anl-bar-val">' + v + '</div></div>';
    }
  } else dr = '<p style="color:var(--t3);font-size:.78rem;padding:10px 0">尚無數據</p>';

  function ms(title, obj) {
    var entries = Object.keys(obj || {}), tot = 0;
    for (var i = 0; i < entries.length; i++) tot += obj[entries[i]];
    if (!tot) tot = 1;
    var html = '<div style="margin-bottom:14px"><h4 style="font-size:.7rem;letter-spacing:.18em;color:var(--gold);margin-bottom:10px;font-family:var(--display)">' + title + '</h4>';
    for (var i = 0; i < entries.length; i++) {
      var k = entries[i], v = obj[k], w = Math.round(v / tot * 100);
      html += '<div class="anl-bar-row"><div class="anl-bar-label">' + k + '</div><div class="anl-bar-track"><div class="anl-bar-fill" data-w="' + w + '%" style="width:0%"></div></div><div class="anl-bar-val">' + v + '</div></div>';
    }
    return html + '</div>';
  }

  var now = new Date(), thisMonth = 0;
  var entries = Object.keys(byDate);
  for (var i = 0; i < entries.length; i++) {
    var parts = entries[i].split('/');
    if (parseInt(parts[1]) === now.getMonth()+1 && parseInt(parts[0]) === now.getFullYear()) thisMonth += byDate[entries[i]];
  }
  var todayStr = dk.length ? byDate[dk[dk.length-1]] || 0 : 0;

  Swal.fire({
    title: '📊 瀏覽數據', width: 700,
    html: '<div style="margin-bottom:16px;text-align:center">' +
          '<button onclick="exportAnalytics(\'csv\')" style="background:var(--gold);color:var(--bg);border:none;padding:6px 14px;cursor:pointer;font-size:.8rem;margin-right:6px;border-radius:3px">📥 匯出 CSV</button>' +
          '<button onclick="exportAnalytics(\'json\')" style="background:var(--bg3);color:var(--t1);border:1px solid var(--border);padding:6px 14px;cursor:pointer;font-size:.8rem;margin-right:6px;border-radius:3px">📥 匯出 JSON</button>' +
          '<button onclick="exportAnalyticsExcel()" style="background:#10793F;color:#fff;border:none;padding:6px 14px;cursor:pointer;font-size:.8rem;margin-right:6px;border-radius:3px">📊 匯出 Excel</button>' +
          '<button onclick="exportAnalyticsPDF()" style="background:#DC4C41;color:#fff;border:none;padding:6px 14px;cursor:pointer;font-size:.8rem;border-radius:3px">📄 匯出 PDF</button>' +
          '</div>' +
          '<div class="anl-grid">' +
          '<div class="anl-stat"><div class="anl-stat-num">' + (a.pageViews||0) + '</div><div class="anl-stat-lbl">累積瀏覽</div></div>' +
          '<div class="anl-stat"><div class="anl-stat-num">' + thisMonth + '</div><div class="anl-stat-lbl">本月瀏覽</div></div>' +
          '<div class="anl-stat"><div class="anl-stat-num">' + todayStr + '</div><div class="anl-stat-lbl">今日瀏覽</div></div></div>' +
          '<div style="margin-bottom:14px"><h4 style="font-size:.7rem;letter-spacing:.18em;color:var(--gold);margin-bottom:10px;font-family:var(--display)">近 7 日趨勢</h4>' + dr + '</div>' +
          ms('裝置類型', a.byDevice) + ms('流量來源', a.bySource) +
          (a.byLocation ? ms('地區分布', a.byLocation) : '') +
          '<p style="font-size:.72rem;color:var(--t3);margin-top:4px">* 本機瀏覽器數據，建議同時使用 Google Analytics。</p>',
    confirmButtonText: '關閉',
    didOpen: function() {
      setTimeout(function() {
        var bars = document.querySelectorAll('.anl-bar-fill[data-w]');
        for (var i = 0; i < bars.length; i++) bars[i].style.width = bars[i].getAttribute('data-w');
      }, 80);
    }
  });
};

/* ============================================================
   SCROLL REVEAL + HEADER
============================================================ */
function initReveal() {
  var obs = new IntersectionObserver(function(entries) {
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].isIntersecting) { entries[i].target.classList.add('in'); obs.unobserve(entries[i].target); }
    }
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  var els = document.querySelectorAll('.reveal,.stagger');
  for (var i = 0; i < els.length; i++) obs.observe(els[i]);
}

function initHeaderScroll() {
  var hdr = document.getElementById('site-header'), lastY = 0, ticking = false;
  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(function() {
        var y = window.scrollY;
        hdr.classList.toggle('scrolled', y > 60);
        if (y > 200) { hdr.classList.toggle('hide', y > lastY + 10); if (y < lastY - 10) hdr.classList.remove('hide'); }
        else hdr.classList.remove('hide');
        lastY = y; ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ============================================================
   SHARE
============================================================ */
window.shareNative = function() {
  if (navigator.share) { navigator.share({ title: document.title, url: location.href }).catch(function() {}); }
  else copyLink();
};
window.copyLink = function() {
  navigator.clipboard.writeText(location.href).then(function() {
    Swal.fire({ title: '連結已複製！', timer: 900, showConfirmButton: false, icon: 'success' });
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = location.href; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    Swal.fire({ title: '連結已複製！', timer: 900, showConfirmButton: false, icon: 'success' });
  });
};

/* ============================================================
   MOBILE NAV
============================================================ */
window.openMobileNav = function() { document.getElementById('mobile-nav').classList.add('open'); };
window.closeMobileNav = function() { document.getElementById('mobile-nav').classList.remove('open'); };
