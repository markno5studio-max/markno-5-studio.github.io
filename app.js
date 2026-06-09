/* ============================================================
   SITE VERSION
============================================================ */

const SITE_VERSION = '2026.06.08.04';

/* ============================================================
   STORAGE KEY
============================================================ */

var KEY = 'MK5_DATA'; // 固定 key（僅用於相容/快取，主要資料存於 Supabase）

/* ============================================================
   SUPABASE 設定（登入 + 資料庫 + 圖片/影片儲存，全部用 Supabase）
   ──────────────────────────────────────────────────────────
   • 登入  ：Supabase Auth（Google 登入）
   • 資料庫：Supabase Postgres（資料表 mk5_kv / admins / applications）
   • 檔案  ：Supabase Storage（bucket：media）；資料庫只存網址

   👉 設定步驟（只需做一次，詳見交付說明）：
     1. 到 https://supabase.com 建立免費專案。
     2. SQL Editor 執行 supabase_schema.sql（建立資料表、權限、函式）。
     3. Authentication → Providers → Google 啟用，填入 Google OAuth 用戶端 ID/密鑰，
        並在 Authentication → URL Configuration 把你的網站網址加入 Redirect URLs。
     4. Storage → New bucket「media」，打開 Public。
     5. Project Settings → API，把 Project URL 與 Publishable key 填到下方。
============================================================ */
var SUPABASE_URL      = 'https://pnuhqvciedctovibrqmu.supabase.co';        // Project URL
var SUPABASE_ANON_KEY = 'sb_publishable_NgpeQdfJufQP3wcSylXfjQ_hmQmZTlt';  // Publishable key（可公開）
var SUPABASE_BUCKET   = 'media';                                           // Storage 的 bucket 名稱（需設為 Public）

// 與 Postgres 資料表的對應；pk 是各表的主鍵欄位名稱
var _COLL = {
  'mk5_data':     { table: 'mk5_kv',       pk: 'id'  },  // 文件 main / private / analytics / secret
  'admins':       { table: 'admins',       pk: 'uid' },
  'applications': { table: 'applications', pk: 'uid' }
};
var FB_DELETE = '__MK5_DELETE_FIELD__'; // 取代舊的 FieldValue.delete()：set 時遇到此值即移除該欄位

var sb = null;                 // Supabase 用戶端（全站共用）
var db = null, storage = null, auth = null, googleProvider = { provider: 'google' };

// 把 Supabase 的 user 物件正規化成程式各處慣用的欄位（uid / email / displayName / photoURL）
function _normUser(u) {
  if (!u) return null;
  var m = u.user_metadata || {};
  return {
    uid: u.id,
    email: (u.email || m.email || '').toLowerCase(),
    displayName: m.full_name || m.name || (u.email || '').split('@')[0],
    photoURL: m.avatar_url || m.picture || ''
  };
}

// 移除值等於 FB_DELETE 的欄位（相容舊的「刪除欄位」語意）
function _stripDeletes(obj) {
  var out = {};
  for (var k in obj) { if (obj.hasOwnProperty(k) && obj[k] !== FB_DELETE) out[k] = obj[k]; }
  return out;
}

// 單一文件（doc）操作：get / set / delete，底層打 Supabase 資料表
function _doc(coll, key) {
  var c = _COLL[coll];
  return {
    get: async function() {
      var r = await sb.from(c.table).select('data').eq(c.pk, key).maybeSingle();
      if (r.error) throw r.error;
      var exists = !!r.data;
      var data = exists ? (r.data.data || {}) : null;
      return { exists: exists, id: key, data: function() { return data; } };
    },
    set: async function(obj, opts) {
      var clean = _stripDeletes(obj || {});
      var payload = clean;
      if (opts && opts.merge) {
        var cur = await sb.from(c.table).select('data').eq(c.pk, key).maybeSingle();
        var base = (cur.data && cur.data.data) || {};
        payload = Object.assign({}, base, clean);
      }
      var row = { data: payload }; row[c.pk] = key;
      // ✅ 修正：加上 onConflict 明確指定衝突欄位，避免 Supabase upsert 靜默失敗
      var w = await sb.from(c.table).upsert(row, { onConflict: c.pk });
      if (w.error) throw w.error;
    },
    delete: function() {
      return sb.from(c.table).delete().eq(c.pk, key).then(function(w) { if (w.error) throw w.error; });
    }
  };
}

// 集合（collection）操作：doc(id) 取單一文件；get() 取全部
function _collection(name) {
  var c = _COLL[name];
  return {
    doc: function(key) { return _doc(name, key); },
    get: async function() {
      var r = await sb.from(c.table).select(c.pk + ', data');
      if (r.error) throw r.error;
      var rows = r.data || [];
      return {
        empty: rows.length === 0,
        forEach: function(fn) {
          rows.forEach(function(row) {
            fn({ id: row[c.pk], data: function() { return row.data || {}; } });
          });
        }
      };
    }
  };
}

// 初始化 Supabase（登入 + 資料庫 + 儲存）
try {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('⚠️ 找不到 Supabase SDK，請確認 index.html 已載入 supabase-js');
  } else if (!SUPABASE_URL || SUPABASE_URL.indexOf('你的') !== -1 || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.indexOf('你的') !== -1) {
    console.error('⚠️ 尚未填入 Supabase 金鑰（SUPABASE_URL / SUPABASE_ANON_KEY）');
  } else {
    sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    storage = sb; // uploadToStorage 透過 storage.storage.from(...) 上傳
    db = { collection: _collection };

    // Auth 轉接層：對外維持與舊程式相同的呼叫介面，底層改用 Supabase Auth
    auth = {
      setPersistence: function() { return Promise.resolve(); },
      getRedirectResult: function() { return Promise.resolve(null); }, // Supabase 由 detectSessionInUrl 自動處理
      onAuthStateChanged: function(cb) {
        // onAuthStateChange 訂閱後會立即帶回目前 session（INITIAL_SESSION），作為唯一來源避免重複觸發
        sb.auth.onAuthStateChange(function(_evt, session) {
          cb(session ? _normUser(session.user) : null);
        });
      },
      signInWithGoogle: function() {
        return sb.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: location.origin + location.pathname,
            queryParams: { prompt: 'select_account' }
          }
        }).then(function(r) { if (r.error) throw r.error; return true; });
      },
      signOut: function() { return sb.auth.signOut(); }
    };

    console.log('🗄️ Supabase 已連線（' + SUPABASE_URL.replace('https://', '').split('.')[0] + '・bucket：' + SUPABASE_BUCKET + '）');
  }
} catch (e) {
  console.error('Supabase 初始化失敗：', e);
}

// 計算字串的 SHA-256 十六進位雜湊（緊急密碼用，不存明碼）
async function sha256(str) {
  var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2,'0'); }).join('');
}

/* ============================================================
   SUPABASE STORAGE 上傳工具
   ── 將圖片 / 影片上傳到 Supabase Storage，資料庫只保存回傳的公開網址 ──
   ── 沒有 1MB 限制；Supabase 免費方案單一檔案預設上限為 50MB ──
============================================================ */
// canvas → Blob（優先用 toBlob，後備用 dataURL 轉換）
function canvasToBlob(canvas, mime, quality) {
  return new Promise(function(resolve, reject) {
    try {
      if (canvas.toBlob) {
        canvas.toBlob(function(b) { b ? resolve(b) : reject(new Error('canvas 轉檔失敗')); }, mime, quality);
      } else {
        var dataURL = canvas.toDataURL(mime, quality);
        var parts = dataURL.split(','), bstr = atob(parts[1]);
        var n = bstr.length, u8 = new Uint8Array(n);
        while (n--) u8[n] = bstr.charCodeAt(n);
        resolve(new Blob([u8], { type: mime }));
      }
    } catch(e) { reject(e); }
  });
}

// 依副檔名推測 MIME 類型
function guessContentType(ext, blob) {
  if (blob && blob.type) return blob.type;
  ext = (ext || '').toLowerCase();
  var map = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
    gif: 'image/gif', svg: 'image/svg+xml',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/x-m4v'
  };
  return map[ext] || 'application/octet-stream';
}

// 上傳 Blob/File 到 Supabase Storage，回傳「公開下載網址」。
// folder：在 bucket 內的資料夾（例如 carousel / logo / avatars / portfolio）
// ext   ：副檔名（jpg / png / mp4 …）
async function uploadToStorage(blob, folder, ext) {
  ext = ext || 'jpg';
  if (!storage || !storage.storage) {
    throw new Error('Supabase Storage 尚未設定。請打開 app.js 最上方，把 SUPABASE_URL 與 SUPABASE_ANON_KEY 換成你自己的金鑰。');
  }
  var path = (folder || 'uploads') + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
  var contentType = guessContentType(ext, blob);
  var res = await storage.storage.from(SUPABASE_BUCKET).upload(path, blob, {
    contentType: contentType,
    cacheControl: '31536000',
    upsert: false
  });
  if (res && res.error) {
    var msg = (res.error && (res.error.message || res.error.error)) || '未知錯誤';
    if (/bucket not found/i.test(msg)) {
      // ✅ 最常見問題：Supabase Storage 的 bucket 未建立
      throw new Error('Supabase 上傳失敗：Storage bucket「' + SUPABASE_BUCKET + '」尚未建立。\n\n請到 Supabase 主控台 → Storage → New bucket，建立名稱為「' + SUPABASE_BUCKET + '」的 bucket，並打開「Public bucket」開關，再重試。');
    }
    if (/row-level security|not authorized|permission|policy/i.test(msg)) {
      msg += '（請到 Supabase → Storage → ' + SUPABASE_BUCKET + ' → Policies 新增「允許上傳」的政策）';
    }
    throw new Error('Supabase 上傳失敗：' + msg);
  }
  var pub = storage.storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  var url = pub && pub.data && pub.data.publicUrl;
  if (!url) throw new Error('上傳成功但無法取得公開網址，請確認 bucket「' + SUPABASE_BUCKET + '」已設為 Public。');
  return url;
}

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
    appEmail: 'markno.5.studio@gmail.com', // 申請通知信箱（超級執行長可改）
    emailjs: { serviceId: '', templateId: '', publicKey: '' }, // EmailJS 設定
    emergencyHash: '', // 緊急設定入口密碼的 SHA-256（不存明碼）
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
  // 帳號改用 Supabase Auth（Google 登入）。第一位以擁有者信箱登入者自動成為 super_admin（見 handleAuthState）。
  // 每筆 user 僅存 profile：{ email, role, name, permissions, online, lastSeen, avatar }，登入由 Supabase Auth 保管。
  users: []
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
var EDITABLE_ITEMS = ['introTagline','introTaglineSize','heroSubtitle','heroEnTitle','heroZhTitle','heroDesc','marqueeItems','marqueeColor','marqueeSpeed','marqueeShow','introLogoSize','datetimeSize','datetimeFont','heroEnFont','heroEnSize','heroZhSize','logo','carousel','categories','serviceDescriptions','socialFacebook','socialInstagram','socialThreads','socialYoutube','socialLine','rippleColor','rippleOpacity','rippleSize','rippleWidth','procNumOpacity','procNumHoverOpacity','dragArrowColor','dragArrowIcon','dragArrowSize','dragArrowOpacity','dragArrowHoverOpacity','dragArrowCooldown','dragArrowActiveGlow','pfGlowColor','pfGlowSize','pfGlowRange','pfGlowBrightness','pfGlowSoftness','autoLogout','autoSave','copyright','email','contactEmail','readyText'];
var EDITABLE_NAMES = {
  introTagline:'開場動畫大標題',introTaglineSize:'開場動畫大標題大小',
  heroSubtitle:'首頁 Logo 下方小標',heroEnTitle:'首頁英文大標',heroZhTitle:'首頁中文副標',heroDesc:'首頁說明文字',
  marqueeItems:'最新公告內容',marqueeColor:'跑馬文字顏色',marqueeSpeed:'跑馬速度',marqueeShow:'顯示跑馬燈',
  introLogoSize:'首頁 Logo 動畫大小',datetimeSize:'日期時間天氣大小',heroEnFont:'英文大標字體',heroEnSize:'英文大標大小',heroZhSize:'中文副標大小',
  logo:'Logo 圖片',carousel:'輪播圖片',categories:'作品分類',serviceDescriptions:'服務項目說明',
  socialFacebook:'Facebook',socialInstagram:'Instagram',socialThreads:'Threads',socialYoutube:'YouTube',socialLine:'LINE ID',
  rippleColor:'光暈顏色',rippleOpacity:'光暈亮度',rippleSize:'光暈大小',rippleWidth:'光暈粗細',
  procNumOpacity:'流程數字亮度',procNumHoverOpacity:'流程數字 Hover 亮度',
  dragArrowColor:'拖曳箭頭顏色',dragArrowIcon:'拖曳箭頭樣式',dragArrowSize:'拖曳箭頭大小',dragArrowOpacity:'拖曳箭頭透明度',dragArrowHoverOpacity:'拖曳箭頭 Hover 透明度',dragArrowCooldown:'拖曳翻頁冷卻時間',dragArrowActiveGlow:'拖曳到箭頭時發光強度',
  pfGlowColor:'拖曳發光顏色',pfGlowSize:'拖曳發光大小',pfGlowRange:'拖曳發光範圍',pfGlowBrightness:'拖曳發光明亮',pfGlowSoftness:'拖曳發光柔化',
  autoLogout:'自動登出時間',autoSave:'自動儲存時間',copyright:'版權模板',email:'發送訊息 Email',contactEmail:'聯絡資訊 Email',readyText:'準備好了嗎文字'
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
document.addEventListener('DOMContentLoaded', async function() {
  // 🔴 版本標識 — 頁面底部顯示版本，確認部署是否成功
  console.log('%c✅ MK5 app.js 版本：' + SITE_VERSION, 'color:#C9963A;font-size:16px;font-weight:bold');
  var verEl = document.getElementById('site-ver-display');
  if (verEl) verEl.textContent = 'v' + SITE_VERSION;
  document.addEventListener('click', function() { try { getAC(); } catch(e) {} }, { once: true });
  // 先讀公開內容（main + analytics）再渲染畫面
  await loadPublic();
  applyTheme();
  updateDOM();
  runIntro();
  bindEvents();

  // 監聽登入狀態（Supabase Auth 會自動保存/還原 session，並處理 Google 登入導回）
  if (auth) {
    auth.onAuthStateChanged(handleAuthState);
  }

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

/* 載入公開內容：mk5_data/main（網站內容）+ mk5_data/analytics（瀏覽統計） */
async function loadPublic() {
  try {
    if (!db) throw new Error('Supabase 尚未初始化');

    var mainSnap = await db.collection('mk5_data').doc('main').get();
    if (mainSnap.exists) {
      var p = mainSnap.data() || {};
      D = Object.assign({}, DEF, p);
      D.social = Object.assign({}, DEF.social, p.social || {});
      D.theme = Object.assign({}, DEF.theme, p.theme || {});
      D.backendSettings = Object.assign({}, DEF.backendSettings, p.backendSettings || {});
      D.backendSettings.emailjs = Object.assign({}, DEF.backendSettings.emailjs, (p.backendSettings && p.backendSettings.emailjs) || {});
      if (!D.logoData || D.logoData.length < 50) D.logoData = DEF.logoData;
      if (!D.carouselImages || !D.carouselImages.length) D.carouselImages = DEF.carouselImages.slice();
      if (!D.pfCategories || !D.pfCategories.length) D.pfCategories = DEF.pfCategories.slice();
      if (!D.formChecklist || !D.formChecklist.length) D.formChecklist = DEF.formChecklist.slice();
      console.log('☁️ 已從 Supabase 載入公開內容');
    } else {
      // 雲端尚無內容 → 套用預設值（待管理員登入後 persist 才會建立）
      D = JSON.parse(JSON.stringify(DEF));
      console.log('☁️ 雲端尚無內容，暫用預設值');
    }
    // users/editLog/inbox 屬私有或已停用資料，公開階段一律不保留
    // （避免舊版 main 文件殘留的帳號/密碼被讀入記憶體；登入後由 loadPrivate 提供 users）
    D.users = [];
    D.editLog = [];
    delete D.inbox;

    // analytics 為獨立公開文件
    try {
      var anSnap = await db.collection('mk5_data').doc('analytics').get();
      D.analytics = Object.assign({}, DEF.analytics, (anSnap.exists ? anSnap.data() : null) || {});
    } catch(e) { D.analytics = Object.assign({}, DEF.analytics); }
  } catch(e) {
    console.error('讀取公開內容失敗，套用預設值：', e);
    D = JSON.parse(JSON.stringify(DEF));
  }
}

/* 載入私有資料：editLog（mk5_data/private）+ 全部管理員（admins 集合）→ D.users */
async function loadPrivate() {
  if (!db) return;
  try {
    var snap = await db.collection('mk5_data').doc('private').get();
    var pv = (snap.exists ? snap.data() : null) || {};
    // 載入時就整理：丟棄舊版指數膨脹的巨大快照，避免占用記憶體與下次寫入超量
    D.editLog = sanitizeEditLog(pv.editLog || []);
  } catch(e) { console.error('讀取 editLog 失敗：', e); }
  try {
    var qs = await db.collection('admins').get();
    var arr = [];
    qs.forEach(function(doc) { arr.push(Object.assign({ uid: doc.id }, doc.data())); });
    D.users = arr;
  } catch(e) { console.error('讀取管理員清單失敗：', e); }
  // 邀請碼（僅 super 讀得到；其他角色規則會擋下，靜默忽略）
  try {
    var s = await db.collection('mk5_data').doc('secret').get();
    D._inviteCode = (s.exists && s.data().inviteCode) || '';
  } catch(e) { D._inviteCode = ''; }
}

// 寫入單一管理員 profile（admins 資料表）：經由 Supabase 安全函式，權限由資料庫把關
async function saveAdmin(u) {
  if (!sb || !u || !u.uid) return;
  var profile = {
    email: (u.email || '').toLowerCase(), name: u.name || '', role: u.role || 'editor',
    permissions: u.permissions || [], avatar: u.avatar || '',
    online: !!u.online, lastSeen: u.lastSeen || ''
  };
  var r = await sb.rpc('upsert_admin', { p_uid: u.uid, p_data: profile });
  if (r && r.error) throw r.error;
}

var BOOTSTRAP_OWNER_EMAIL = 'markno.5.studio@gmail.com'; // 與 supabase_schema.sql 內設定的擁有者信箱一致

/* 登入狀態變更：Google 登入後決定 已核准 / 待審核 / bootstrap */
async function handleAuthState(user) {
  if (!user) {
    CU = null;
    clearAutoLogout(); clearAutoSave();
    hidePendingScreen();
    updateDOM();
    return;
  }
  var email = (user.email || '').toLowerCase();
  var uid = user.uid;

  // ⛔ 黑名單檢查：被停權者一律登出，不得進入後台或待審畫面。
  //   （DB 端 redeem_invite 也會擋，這裡只是給使用者明確提示。函式未部署時自動略過。）
  try {
    var _bl = await sb.rpc('is_blacklisted');
    if (_bl && !_bl.error && _bl.data === true) {
      if (auth) await auth.signOut();
      CU = null; clearAutoLogout(); clearAutoSave(); hidePendingScreen(); updateDOM();
      Swal.fire({
        title: '⛔ 帳號已被停權',
        html: '您的帳號已被管理員停權，目前無法登入。<br>如有疑問，請聯絡管理者。',
        icon: 'error', confirmButtonText: '我知道了'
      });
      return;
    }
  } catch(e) {}

  // 讀自己的 admins/{uid}
  var meSnap = null;
  try { meSnap = await db.collection('admins').doc(uid).get(); } catch(e) {}

  // Bootstrap：第一位以指定信箱登入者 → 自動建立 super_admin（由 Supabase 安全函式處理）
  if ((!meSnap || !meSnap.exists) && email === BOOTSTRAP_OWNER_EMAIL) {
    try {
      var br = await sb.rpc('bootstrap_owner');
      if (br && br.error) throw br.error;
      meSnap = await db.collection('admins').doc(uid).get();
    } catch(e) {
      // 擁有者 bootstrap 失敗 → 多半是 supabase_schema.sql 尚未在 Supabase 執行
      console.error('bootstrap 失敗：', e);
      CU = null; clearAutoLogout(); clearAutoSave(); hidePendingScreen(); updateDOM();
      Swal.fire({
        title: '⚠ 初始化失敗（資料庫尚未建立）',
        html: '無法建立超級執行長帳號：<br><b style="color:#f87171">' + (e.message || e.code || e) + '</b><br><br>' +
              '請到 Supabase 主控台 → <b>SQL Editor</b>，貼上並執行 <b>supabase_schema.sql</b>（會建立資料表、權限與函式），<br>' +
              '且函式中的擁有者信箱必須是 <b>markno.5.studio@gmail.com</b>。',
        icon: 'error', confirmButtonText: '我知道了'
      });
      return;
    }
  }

  if (meSnap && meSnap.exists) {
    // ── 已核准 ──
    hidePendingScreen();
    CU = Object.assign({ uid: uid }, meSnap.data());
    await loadPrivate();
    // 更新自己的在線狀態
    CU.online = true; CU.lastSeen = new Date().toLocaleString('zh-TW');
    try { await saveAdmin(CU); } catch(e) {}
    // 清掉自己殘留的待審核申請（先前失敗嘗試留下的）
    try { db.collection('applications').doc(uid).delete().catch(function(){}); } catch(e) {}
    updateDOM();
    startAutoLogout(); startAutoSave();
    maybePromptFirstSetup(); // 超級執行長首次（EmailJS 未設定）→ 引導去設定
  } else {
    // ── 待審核 ──
    CU = null;
    clearAutoLogout(); clearAutoSave();
    try {
      await db.collection('applications').doc(uid).set({
        email: email, name: user.displayName || '', photoURL: user.photoURL || '',
        requestedAt: new Date().toISOString()
      }, { merge: true });
    } catch(e) { console.error('寫入申請失敗：', e); }
    sendApplicationEmail(user); // 自動寄通知（同 session 只寄一次）
    updateDOM();
    showPendingScreen(user);
  }
}

/* ============================================================
   申請通知 / 邀請碼寄送（EmailJS）
============================================================ */
function _getEmailjsCfg() {
  var bs = (D && D.backendSettings) || {};
  return bs.emailjs || {};
}

// 取得邀請碼（給寄信用）。順序：
//   1) 記憶體已載入 → 直接用
//   2) 安全函式 get_invite_code()（任何「已登入者」皆可，含待審核申請者；匿名訪客取不到）
//   3) 後備：直接讀 secret（僅 super 有權）
// ⚠ 需先在 Supabase 執行最新版 supabase_schema.sql（內含 get_invite_code 函式），否則步驟 2 會失敗。
async function fetchInviteCode() {
  if (D && D._inviteCode) return D._inviteCode;
  try {
    if (sb && sb.rpc) {
      var r = await sb.rpc('get_invite_code');
      if (!r.error && r.data) { D._inviteCode = r.data; return r.data; }
      if (r && r.error) console.warn('get_invite_code 失敗（請確認已執行最新 supabase_schema.sql）：', r.error.message || r.error);
    }
  } catch (e) { console.warn('get_invite_code 例外：', e); }
  try {
    var s = await db.collection('mk5_data').doc('secret').get();
    var c = (s.exists && s.data() && s.data().inviteCode) || '';
    if (c) D._inviteCode = c;
    return c;
  } catch (e) { return ''; }
}

// 新帳號申請：寄「歡迎 + 邀請碼」信給申請人（to_email = 申請人本人）。
// 申請人登入後（待審核）即可自動收到專屬邀請碼，輸入後立即成為一般編輯。
async function sendApplicationEmail(user) {
  try {
    var cfg = _getEmailjsCfg();
    if (typeof emailjs === 'undefined' || !cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
      console.log('EmailJS 尚未設定，略過寄送通知');
      return;
    }
    // 🔑 關鍵修正：先把邀請碼「真的拿到手」，拿不到就不寄、也不設旗標。
    //   舊版是「先設旗標、再抓邀請碼」——一旦第一次抓不到（例如 get_invite_code 函式
    //   尚未部署、或剛登入 session 還沒就緒），就會寄出一封「邀請碼空白」的歡迎信，
    //   而且旗標已設 → 同一個 session 之後永遠不再補寄 → 這就是「設定都對、信卻空白」的根因。
    var inviteCode = await fetchInviteCode(); // 取得邀請碼（待審核申請者也能透過 get_invite_code 取得）
    if (!inviteCode) {
      console.warn('❗ 取不到邀請碼，暫不寄出歡迎信（避免寄出空白邀請碼）。' +
        '請確認：①已在 Supabase 執行最新 supabase_schema.sql（內含 get_invite_code 函式）；' +
        '②後台設定已填入 6 位邀請碼。修好後重新整理會自動補寄。');
      return; // 不設旗標 → 邀請碼補齊後，下次登入／重新整理會自動補寄正確的信
    }

    // 🔒 防重複：確定能寄出「含邀請碼」的信之後，才設定旗標。
    //   Supabase 的 onAuthStateChange 會連續觸發多次（INITIAL_SESSION / SIGNED_IN /
    //   TOKEN_REFRESHED…），旗標可避免在第一封還沒送完前重複寄出（一次寄好幾封）。
    var flagKey = 'mk5_applied_' + (user.uid || user.email || '');
    if (sessionStorage.getItem(flagKey)) return;
    sessionStorage.setItem(flagKey, '1');

    emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email:   user.email || '',                       // 收件者＝申請人本人
      user_name:  user.displayName || '(未提供名稱)',
      user_email: user.email || '',
      site_name:  (D && D.brandName) || 'MARK NO.5',
      site_url:   location.origin,
      invite_code: inviteCode                             // ✅ 自動帶入邀請碼，不再空白
    }, { publicKey: cfg.publicKey })
      .then(function() { console.log('📧 已寄出歡迎信（含邀請碼）給', user.email); })
      .catch(function(err) {
        // 寄送失敗 → 清掉旗標，讓下次還能重試
        sessionStorage.removeItem(flagKey);
        console.warn('EmailJS 歡迎信寄送失敗：', err && (err.text || err.message || err));
      });
  } catch(e) { console.warn('sendApplicationEmail 例外：', e); }
}

// 邀請碼寄送：管理員核准後，將邀請碼寄給被核准的使用者
// ✅ 此函式在管理員（super_admin）核准 session 呼叫
// 回傳 Promise<boolean>：true = 已成功寄出含邀請碼的信；false = 未寄出（已自行提示原因）
async function sendInviteEmail(toEmail, userName) {
  var cfg = _getEmailjsCfg();
  if (typeof emailjs === 'undefined' || !cfg.serviceId || !cfg.templateId || !cfg.publicKey) {
    console.log('EmailJS 尚未設定，略過寄送邀請碼');
    if (typeof Swal !== 'undefined') {
      await Swal.fire({
        title: '⚠ 尚未設定 EmailJS',
        html: '帳號已核准，但 <b>EmailJS 尚未設定</b>，所以沒有自動寄出邀請信。<br>請到 <b>⚙️ 後台設定 → 帳號審核</b> 填入 EmailJS 的 SERVICE / TEMPLATE / PUBLIC KEY。',
        icon: 'warning', confirmButtonText: '我知道了'
      });
    }
    return false;
  }

  // 取得邀請碼（與歡迎信同一來源：記憶體 → get_invite_code() → 直接讀 secret）
  var inviteCode = await fetchInviteCode();

  // ❗ 沒有邀請碼就「不要寄出空白邀請碼的信」，改清楚提醒管理員先設定
  if (!inviteCode) {
    console.warn('❗ 尚未設定邀請碼，未寄送邀請信');
    if (typeof Swal !== 'undefined') {
      await Swal.fire({
        title: '⚠ 尚未設定邀請碼',
        html: '帳號已核准，但 <b>邀請碼尚未設定</b>，所以沒有寄出邀請信（避免寄出空白邀請碼）。<br>請到 <b>⚙️ 後台設定 → 帳號審核</b> 填入 6 位邀請碼後，再請對方索取。',
        icon: 'warning', confirmButtonText: '我知道了'
      });
    }
    return false;
  }

  try {
    await emailjs.send(cfg.serviceId, cfg.templateId, {
      to_email:   toEmail,                       // ✅ EmailJS 模板「To Email」需設為 {{to_email}}，收件者才會是被核准者
      user_name:  userName || toEmail.split('@')[0],
      user_email: toEmail,
      site_name:  (D && D.brandName) || 'MARK NO.5',
      site_url:   location.origin,
      invite_code: inviteCode                    // ✅ 正確傳入邀請碼
    }, { publicKey: cfg.publicKey });
    console.log('📧 邀請碼已寄出至', toEmail);
    return true;
  } catch (err) {
    console.warn('EmailJS 邀請碼寄送失敗：', err && (err.text || err.message || err));
    if (typeof Swal !== 'undefined') {
      await Swal.fire({
        title: '邀請信寄送失敗',
        text: (err && (err.text || err.message)) || String(err),
        icon: 'error', confirmButtonText: '我知道了'
      });
    }
    return false;
  }
}

/* ============================================================
   待審核畫面（Google 已登入但尚未核准）
============================================================ */
function hidePendingScreen() {
  var el = document.getElementById('mk5-pending');
  if (el) el.remove();
}

function showPendingScreen(user) {
  hidePendingScreen();
  var ov = document.createElement('div');
  ov.id = 'mk5-pending';
  ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(9,9,11,.97);backdrop-filter:blur(8px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;padding:24px;overflow:auto';
  var name = (user.displayName || '').toUpperCase();
  var email = user.email || '';
  ov.innerHTML =
    '<button id="mk5-emg-btn" style="width:100%;max-width:560px;background:var(--bg3);border:1px solid var(--border);color:var(--t3);padding:14px;border-radius:12px;cursor:pointer;font-family:var(--serif);font-size:.9rem;text-align:center">⚙ 管理員緊急設定入口（僅開啟後台設定）</button>' +
    '<div style="width:100%;max-width:560px;background:var(--bg2);border:1px solid var(--border-g);border-radius:16px;padding:30px 26px;text-align:center">' +
      '<div style="font-size:1.3rem;color:#5b8def;font-weight:700;margin-bottom:16px">🕐 帳號待審核</div>' +
      '<div style="font-family:var(--display);letter-spacing:.08em;color:var(--t1);font-size:1.1rem">' + (name||'NEW USER') + '</div>' +
      '<div style="color:var(--t3);font-size:.85rem;margin:4px 0 14px">（' + email + '）</div>' +
      '<div style="color:var(--t2);font-size:.9rem;line-height:1.9;margin-bottom:22px">您的帳號需要管理者審核後才能使用。<br>系統已通知管理者，請耐心等候，或向管理者索取邀請碼。</div>' +
      '<div style="font-family:var(--display);letter-spacing:.12em;color:var(--gold);font-size:.8rem;margin-bottom:8px">邀請碼（6 位）</div>' +
      '<input id="mk5-invite" maxlength="6" inputmode="numeric" placeholder="輸入邀請碼..." style="width:100%;padding:14px;background:var(--bg);border:1px solid var(--border);color:var(--t1);font-size:1.1rem;text-align:center;letter-spacing:.3em;border-radius:10px;outline:none;margin-bottom:14px">' +
      '<button id="mk5-invite-btn" style="width:100%;padding:15px;background:var(--gold);color:var(--bg);border:none;border-radius:10px;cursor:pointer;font-weight:700;font-size:1rem;margin-bottom:10px">🔑 驗證邀請碼</button>' +
      '<button id="mk5-relogin-btn" style="width:100%;padding:13px;background:var(--bg3);color:var(--t2);border:1px solid var(--border);border-radius:10px;cursor:pointer;font-size:.92rem">← 返回重新登入</button>' +
    '</div>';
  document.body.appendChild(ov);

  document.getElementById('mk5-emg-btn').addEventListener('click', emergencyEntry);
  document.getElementById('mk5-relogin-btn').addEventListener('click', function() { if (auth) auth.signOut(); });
  var inviteInput = document.getElementById('mk5-invite');
  var doVerify = function() { verifyInviteCode(user, inviteInput.value.trim()); };
  document.getElementById('mk5-invite-btn').addEventListener('click', doVerify);
  inviteInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') doVerify(); });
}

/* 驗證邀請碼：正確則由 Supabase 安全函式建立 admins 列（role=editor） */
async function verifyInviteCode(user, code) {
  if (!code || code.length < 4) { Swal.fire({ title:'請輸入邀請碼', icon:'warning' }); return; }
  Swal.fire({ title:'驗證中…', didOpen:function(){ Swal.showLoading(); }, allowOutsideClick:false });
  try {
    var r = await sb.rpc('redeem_invite', { p_code: code });
    if (r && r.error) throw r.error;
    Swal.fire({ title:'✅ 已通過！', text:'歡迎加入，正在進入後台…', icon:'success', timer:1400, showConfirmButton:false });
    setTimeout(function() { location.reload(); }, 1200);
  } catch(e) {
    Swal.fire({ title:'邀請碼錯誤或尚未開放', text:'請確認邀請碼，或聯絡管理者手動核准', icon:'error' });
  }
}

/* ============================================================
   管理員緊急設定入口（輸入緊急密碼 → 開後台設定）
============================================================ */
async function emergencyEntry() {
  var bs = (D && D.backendSettings) || {};
  if (!bs.emergencyHash) {
    Swal.fire({ title:'尚未設定緊急密碼', text:'請先以超級執行長身分登入，於後台設定緊急密碼後才能使用此入口。', icon:'info' });
    return;
  }
  var r = await Swal.fire({
    title:'⚙ 管理員緊急設定', input:'password', inputPlaceholder:'輸入緊急密碼',
    showCancelButton:true, confirmButtonText:'驗證', cancelButtonText:'取消'
  });
  if (!r.isConfirmed) return;
  var hash = await sha256(r.value || '');
  if (hash === bs.emergencyHash) {
    window.__EMERGENCY = true;
    openBackendSettings();
  } else {
    Swal.fire({ title:'密碼錯誤', icon:'error' });
  }
}

/* 超級執行長首次登入引導：EmailJS 尚未設定時，等開場動畫結束後自動開後台設定 */
// ✅ EmailJS 提示：若使用者選擇「不需要」，永久儲存到 localStorage，不再提示
var _EMAILJS_SKIP_KEY = 'MK5_EMAILJS_SKIP';
var _firstSetupPrompted = false;
function maybePromptFirstSetup() {
  if (!CU || CU.role !== 'super_admin') return;
  if (_firstSetupPrompted) return;
  // 使用者曾選「不需要 EmailJS」→ 永久不提示
  if (localStorage.getItem(_EMAILJS_SKIP_KEY) === '1') return;
  var ej = (D.backendSettings && D.backendSettings.emailjs) || {};
  if (ej.serviceId && ej.templateId && ej.publicKey) return; // 已設定 → 不再提示
  var tries = 0;
  var t = setInterval(function() {
    tries++;
    var ov = document.getElementById('intro-overlay');
    var introGone = !ov || ov.style.display === 'none' || (window.getComputedStyle(ov).display === 'none');
    if (!introGone && tries <= 40) return;
    clearInterval(t);
    if (!CU || CU.role !== 'super_admin') return;
    if (_firstSetupPrompted) return;
    if (localStorage.getItem(_EMAILJS_SKIP_KEY) === '1') return;
    var ej2 = (D.backendSettings && D.backendSettings.emailjs) || {};
    if (ej2.serviceId && ej2.templateId && ej2.publicKey) return;
    _firstSetupPrompted = true;
    Swal.fire({
      title: '👋 EmailJS 申請通知信設定',
      html: '若需要「有人申請帳號時自動通知你」的功能，請到 <b>後台設定 → 帳號審核</b> 填入 EmailJS 資訊。<br><br>若不需要此功能，點「不需要」即可永久關閉此提示。',
      icon: 'info',
      confirmButtonText: '前往設定',
      showCancelButton: true,
      cancelButtonText: '不需要 EmailJS',
      showDenyButton: false
    }).then(function(r) {
      if (r.isConfirmed) {
        openBackendSettings();
      } else {
        // 使用者選「不需要」→ 永久記錄，不再提示
        localStorage.setItem(_EMAILJS_SKIP_KEY, '1');
      }
    });
  }, 300);
}

// 計算字串的位元組大小（中文 UTF-8 為 3 bytes，需用 Blob 精算）
function byteSize(str) {
  try { return new Blob([str]).size; } catch(e) { return str.length; }
}

// 取出「公開內容」副本（排除 analytics / users / editLog，這些另存他處）
function buildMainData() {
  var m = JSON.parse(JSON.stringify(D));
  delete m.analytics;
  delete m.users;
  delete m.editLog;
  delete m.inbox; // 來信已改 mail-only，不再上雲
  delete m._inviteCode; // 邀請碼機密，存於 mk5_data/secret，絕不進公開 main
  return m;
}

// 建立「還原快照」：刻意排除 editLog / users / analytics / inbox / _inviteCode。
// ⚠ 關鍵修正：以前用 JSON.stringify(D)，而 D.editLog 內每筆又各自存了一份完整快照，
//   造成「快照包快照」的指數級膨脹（幾次編輯後體積暴增到數十 MB），
//   寫入 Supabase 時就會出現「NetworkError when attempting to fetch resource」儲存失敗。
//   還原時（restoreSnap）本來就會用「目前的 editLog / users」覆蓋快照內的同名欄位，
//   因此把這些欄位排除在快照外完全不影響還原結果，只會讓體積回到正常。
function buildSnapshot() {
  var clone = Object.assign({}, D);
  delete clone.editLog;
  delete clone.users;
  delete clone.analytics;
  delete clone.inbox;
  delete clone._inviteCode;
  return JSON.stringify(clone);
}

// 整理 editLog：限制筆數、丟棄體積過大的舊版巢狀快照，避免寫入時超量導致 NetworkError。
function sanitizeEditLog(log) {
  log = (log || []).slice(0, 30); // 最多保留 30 筆紀錄
  var MAX_SNAP = 300 * 1024;       // 單筆快照上限 300KB（超過＝舊版指數膨脹快照 → 丟棄快照，保留紀錄）
  for (var i = 0; i < log.length; i++) {
    var e = log[i];
    if (!e || !e.snapshot) continue;
    // 只有最近 10 筆保留快照；其餘或過大者一律移除（紀錄文字仍保留，只是不能「還原」）
    if (i >= 10 || byteSize(e.snapshot) > MAX_SNAP) delete e.snapshot;
  }
  return log;
}

// 實際寫入（會丟出錯誤，供呼叫端判斷成功/失敗）
async function persistRaw() {
  if (!db) throw new Error('Supabase 尚未初始化');

  // ── 公開內容 → mk5_data/main（這是「真正要保住」的網站內容） ──
  var mainData = buildMainData();
  var mainStr  = JSON.stringify(mainData);
  console.log('📤 main 體積：' + (byteSize(mainStr) / 1024).toFixed(1) + ' KB' +
              '｜emailjs：' + JSON.stringify(mainData.backendSettings && mainData.backendSettings.emailjs));

  // main 寫入失敗才算「儲存失敗」（會往外丟，讓使用者看到）
  await db.collection('mk5_data').doc('main').set(mainData);

  // ── editLog → mk5_data/private（次要：只是版本紀錄，失敗不該擋住內容儲存） ──
  // 先整理：限制筆數 + 丟棄過大的舊版巢狀快照，避免 private 文件過大。
  try {
    var editLog = sanitizeEditLog(JSON.parse(JSON.stringify(D.editLog || [])));
    D.editLog = editLog; // 記憶體也同步成精簡後版本
    var pvStr = JSON.stringify({ editLog: editLog });
    console.log('📤 private(editLog) 體積：' + (byteSize(pvStr) / 1024).toFixed(1) + ' KB｜' + editLog.length + ' 筆');
    await db.collection('mk5_data').doc('private').set({ editLog: editLog });
  } catch (e) {
    // ⚠ editLog 寫入失敗（例如歷史紀錄過大）→ 只記錄、不中斷，主要內容已存成功
    console.warn('editLog（private）寫入失敗，已略過，不影響主要內容：', e && (e.message || e));
  }

  console.log('✅ 主要內容已同步至 Supabase 雲端');
}

// 儲存：公開內容寫 main、editLog 寫 private。皆需管理員（Supabase RLS）。
// 註：管理員 profile（users）改存 admins 集合，由 saveAdmin() 個別寫入，不在這裡。
// silent = true 時（自動儲存）失敗只記 console，不彈出錯誤視窗，避免一直跳出干擾。
async function persist(silent) {
  try {
    await persistRaw();
    return true;
  } catch(e) {
    var msg = (e && (e.message || e.error_description || e.code)) || '雲端寫入失敗';
    console.error('雲端儲存失敗:', e);
    if (CU && !silent) {
      Swal.fire({
        title: '儲存失敗',
        html: '<b style="color:#f87171">' + String(msg) + '</b><br><br>' +
              '<small style="color:var(--t2);line-height:1.8">' +
              '請按 <b>F12 → Console</b> 看上方的「main 體積」與紅色錯誤。<br>常見原因：<br>' +
              '1. 內容過大（例如夾帶 base64 圖片）<br>' +
              '2. Supabase 連線/專案被暫停<br>' +
              '3. 帳號未核准或 RLS 阻擋' +
              '</small>',
        icon: 'error', confirmButtonText: '確認'
      });
    }
    return false;
  }
}

/* 訪客瀏覽統計：寫入獨立的公開文件 mk5_data/analytics（不會動到內容/帳號） */
async function persistAnalytics() {
  try {
    if (!db) return;
    // 清理 90 天前的逐日資料，避免無限成長
    if (D.analytics && D.analytics.byDate) {
      var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 90);
      var cutoffStr = cutoff.toISOString().split('T')[0];
      var cleaned = {};
      for (var date in D.analytics.byDate) if (date >= cutoffStr) cleaned[date] = D.analytics.byDate[date];
      D.analytics.byDate = cleaned;
    }
    await db.collection('mk5_data').doc('analytics').set(D.analytics || {});
  } catch(e) { console.log('analytics 寫入失敗:', e.message); }
}

/* 記錄編輯紀錄（含可還原快照）；未登入（含緊急入口）時略過 */
function logEdit(keys) {
  if (!CU) return;
  if (!D.editLog) D.editLog = [];
  D.editLog.unshift({
    user: CU.name, email: CU.email, role: CU.role,
    date: new Date().toLocaleString('zh-TW'),
    keys: keys || [], snapshot: buildSnapshot()
  });
  if (D.editLog.length > 30) D.editLog = D.editLog.slice(0, 30);
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
    // 來信改為僅寄信件（mailto），不再寫入雲端
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

    // 只要類別在 pfCategories 中，就一定顯示（與分類保持 1:1 同步）
    var svcData = D.serviceDescriptions && D.serviceDescriptions[cat];
    var desc = '專業' + cat + '製作服務';

    if (svcData) {
      if (typeof svcData === 'object') {
        desc = svcData.description || desc;
      } else {
        desc = svcData;
      }
    }
    
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
      // 頁尾服務列表也與 pfCategories 保持 1:1 同步，不過濾 show 旗標
      footerHtml += '<li><a href="#services">' + categories[i] + '</a></li>';
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
window.saveChanges = async function(showAlert) {
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
    D.editLog.unshift({ user:CU.name, email:CU.email, role:CU.role, date:new Date().toLocaleString('zh-TW'), keys:changed, snapshot:buildSnapshot() });
    if (D.editLog.length > 30) D.editLog = D.editLog.slice(0, 30);
  }
  // showAlert=true（手動 💾）→ 失敗會彈窗；showAlert=false（自動儲存）→ 靜默，不干擾
  var ok = await persist(!showAlert);
  updateDOM();
  // 只有「真的存成功」才顯示儲存成功（以前不論成敗都顯示，會與錯誤視窗一起跳出）
  if (showAlert && ok) Swal.fire({ title:'✓ 儲存成功', timer:1200, showConfirmButton:false, icon:'success' });
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

/* ============================================================
   CATEGORY TAB DRAG REORDER (admin only, direct DOM — inline handlers ok)
============================================================ */
var _dragCatIdx = -1;

window.catDragStart = function(e, idx) {
  _dragCatIdx = idx;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.45';
};
window.catDragOver = function(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  e.currentTarget.style.outline = '2px dashed var(--gold)';
};
window.catDragLeave = function(e) {
  e.currentTarget.style.outline = '';
};
window.catDrop = function(e, idx) {
  e.preventDefault();
  e.currentTarget.style.outline = '';
  if (_dragCatIdx === -1 || _dragCatIdx === idx) { _dragCatIdx = -1; return; }
  var arr = D.pfCategories;
  var moved = arr.splice(_dragCatIdx, 1)[0];
  // Adjust insertion index because removal shifted elements after the drag origin
  var insertAt = idx > _dragCatIdx ? idx - 1 : idx;
  arr.splice(insertAt, 0, moved);
  _dragCatIdx = -1;
  persist();
  renderPF();
  renderServices();
};
window.catDragEnd = function(e) {
  _dragCatIdx = -1;
  e.currentTarget.style.opacity = '';
  e.currentTarget.style.outline = '';
};

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
      // 其他分類按鈕添加包裝和刪除鈕；管理員模式下支援拖曳排序
      var catPfIdx = i - 1; // D.pfCategories 的索引（cats[0]='All' 偏移 1）
      if (CU) {
        fHtml += '<div class="filter-btn-wrap" draggable="true" ' +
          'ondragstart="catDragStart(event,' + catPfIdx + ')" ' +
          'ondragover="catDragOver(event)" ' +
          'ondragleave="catDragLeave(event)" ' +
          'ondrop="catDrop(event,' + catPfIdx + ')" ' +
          'ondragend="catDragEnd(event)" ' +
          'style="cursor:grab">';
      } else {
        fHtml += '<div class="filter-btn-wrap">';
      }
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
  }).then(function(r) { if (r.isConfirmed) { persist(); renderPF(); renderServices(); } });
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
              var mW = 1280, sc = Math.min(1, mW / img.width);
              cv.width = img.width * sc; cv.height = img.height * sc;
              cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
              // 壓縮後上傳到 Supabase Storage，資料庫只存回傳的網址
              canvasToBlob(cv, 'image/jpeg', 0.72)
                .then(function(blob) { return uploadToStorage(blob, 'carousel', 'jpg'); })
                .then(function(url) { res(url); })
                .catch(function(err) { Swal.showValidationMessage('圖片上傳失敗：' + (err.message || err)); res(false); });
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
            // 有上傳新圖示 → 縮圖後上傳 Storage，只保存網址（上傳失敗則沿用舊圖）
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
                  canvasToBlob(canvas, 'image/png', 0.9)
                    .then(function(blob) { return uploadToStorage(blob, 'service-icons', 'png'); })
                    .then(function(url) {
                      resolve({ cat: cat, description: descEl.value.trim() || ('專業' + cat + '製作服務'), show: showEl.checked, icon: url });
                    })
                    .catch(function(err) {
                      console.warn('服務圖示上傳失敗，沿用舊圖：', err.message || err);
                      resolve({ cat: cat, description: descEl.value.trim() || ('專業' + cat + '製作服務'), show: showEl.checked, icon: oldIcon });
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
    html: '<input type="file" id="lf" class="swal2-file" accept="image/*,video/*">' +
          '<p style="margin-top:8px;font-size:.78rem;color:var(--t3)">圖片建議方形 800x800 以上（PNG/JPG）；也可上傳影片 Logo（MP4/WebM）。</p>' +
          '<p style="font-size:.72rem;color:var(--t3)">（檔案會上傳到 Supabase Storage，資料庫只保存網址）</p>',
    confirmButtonText: '上傳', showCancelButton: true, showLoaderOnConfirm: true,
    allowOutsideClick: function(){ return !Swal.isLoading(); },
    preConfirm: function() {
      var file = document.getElementById('lf').files[0];
      if (!file) { Swal.showValidationMessage('請選擇檔案'); return false; }

      // 影片 Logo：直接上傳到 Supabase Storage（不壓縮），資料庫只存網址
      if (file.type.startsWith('video/')) {
        var vext = (file.name.split('.').pop() || 'mp4').toLowerCase();
        if (['mp4','webm','mov','m4v'].indexOf(vext) === -1) vext = 'mp4';
        return uploadToStorage(file, 'logo', vext)
          .then(function(url) { return { type: 'video', data: url }; })
          .catch(function(err) { Swal.showValidationMessage('影片 Logo 上傳失敗：' + (err.message || err)); return false; });
      }

      if (!file.type.startsWith('image/')) {
        Swal.showValidationMessage('請選擇圖片或影片檔'); return false;
      }

      // 圖片：縮放至 800x800 後上傳到 Supabase Storage
      return new Promise(function(res) {
        var rdr = new FileReader();
        rdr.onload = function(e) {
          var img = new Image();
          img.onload = function() {
            var cv = document.createElement('canvas');
            cv.width = cv.height = 800; // 高解析度（顯示僅 38px / 開場 300px，800px 綽綽有餘）
            var s = Math.min(img.width, img.height);
            var ctx = cv.getContext('2d');
            // 圓形裁切後背景填黑，確保 JPEG（無透明）在深色介面下自然
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 800, 800);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, 800, 800);
            canvasToBlob(cv, 'image/jpeg', 0.9)
              .then(function(blob) { return uploadToStorage(blob, 'logo', 'jpg'); })
              .then(function(url) { res({ type: 'image', data: url }); })
              .catch(function(err) { Swal.showValidationMessage('Logo 上傳失敗：' + (err.message || err)); res(false); });
          };
          img.src = e.target.result;
        };
        rdr.readAsDataURL(file);
      });
    }
  }).then(function(r) {
    if (r.value && r.value.data) {
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
    
    // 顯示名稱，靠近大頭貼
    document.getElementById('admin-info').innerHTML = '<strong>' + (CU.name || CU.email || '') + '</strong>' + roleBadge;
    
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
  if (!auth || !sb) { Swal.fire({ title:'Supabase Auth 尚未初始化', text:'請確認 app.js 已填入 Supabase 金鑰。', icon:'error' }); return; }
  Swal.fire({
    title: '後台登入',
    html: '<p style="color:var(--t2);font-size:.9rem;line-height:1.8;margin-bottom:6px">請使用 Google 帳號登入。<br>新帳號需經管理者核准或輸入邀請碼。</p>',
    showCancelButton: true,
    confirmButtonText: '<i class="fab fa-google"></i> 使用 Google 登入',
    cancelButtonText: '取消',
    showLoaderOnConfirm: true,
    preConfirm: function() {
      // Supabase Google OAuth：會整頁轉址到 Google，登入後自動導回本站並建立 session
      return auth.signInWithGoogle()
        .then(function() { return true; })
        .catch(function(err) {
          Swal.showValidationMessage('登入失敗：' + (err && (err.message || err)));
          return false;
        });
    }
  });
  // 後續由 onAuthStateChanged → handleAuthState 決定 已核准/待審核
};

/* ============================================================
   AUTO LOGOUT
============================================================ */
function startAutoLogout() {
  clearAutoLogout(); // 清除舊的計時器

  if (!CU) return; // 未登入不需要計時

  var rawMinutes = D.backendSettings && D.backendSettings.autoLogoutMinutes;
  if (rawMinutes === 0) return; // 永不登出，不設計時器
  var minutes = (rawMinutes > 0) ? rawMinutes : 5; // 預設 5 分鐘

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
      saveChanges(false); // false＝自動儲存：成功不提示、失敗也不彈窗（只記 console）
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
  if (CU && CU.uid) {
    CU.online = false; CU.lastSeen = new Date().toLocaleString('zh-TW');
    try { saveAdmin(CU); } catch(e) {} // 寫回離線狀態（仍為登入身分，可寫入）
  }
  // 由 Supabase Auth 登出；onAuthStateChanged 會把 CU 清為 null 並更新畫面
  if (auth) auth.signOut();
  Swal.fire({ title: '已登出', timer: 900, showConfirmButton: false });
};

/* ============================================================
   BACKEND SETTINGS (super_admin only)
============================================================ */
window.openBackendSettings = async function(scrollToCloud) {
  var EMERGENCY = !!window.__EMERGENCY;   // 緊急入口模式（未登入但已驗證緊急密碼）
  if (!CU && !EMERGENCY) {
    Swal.fire({title:'無權限',text:'請先登入',icon:'error'});
    return;
  }
  // 所有已登入的人都可以進入後台設定，但只能編輯有權限的項目

  // 開啟設定前，從雲端「真實」回讀邀請碼，避免「記憶體顯示已設定、雲端其實是空的」誤導。
  if (CU && CU.role === 'super_admin' && db) {
    try {
      var _s = await db.collection('mk5_data').doc('secret').get();
      D._inviteCode = (_s.exists && _s.data() && _s.data().inviteCode) || '';
    } catch (e) { console.warn('讀取邀請碼狀態失敗：', e); }
  }

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
      var isSuperAdmin = (CU && CU.role === 'super_admin') || EMERGENCY;
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
        var _logoSizePx = parseInt((t.introLogoSize || '300px')) || 300;
        h += '<div style="margin-bottom:14px">';
        h += '<div style="font-size:.85rem;margin-bottom:6px">3. 首頁 Logo 動畫大小（開場動畫 Logo 圓形尺寸）：</div>';
        h += '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">';
        h += '<input id="bs-intro-logo-range" type="range" min="100" max="600" step="10" value="' + _logoSizePx + '" style="flex:1;min-width:160px;accent-color:var(--gold)" oninput="var v=this.value;document.getElementById(\'bs-intro-logo-num\').value=v;document.getElementById(\'bs-intro-logo-size\').value=v+\'px\'">';
        h += '<input id="bs-intro-logo-num" type="number" min="100" max="600" step="10" value="' + _logoSizePx + '" style="width:72px;padding:4px 8px;background:var(--bg3);border:1px solid var(--border-g);color:var(--t1);border-radius:4px;font-size:.9rem;text-align:center" oninput="var v=this.value;document.getElementById(\'bs-intro-logo-range\').value=v;document.getElementById(\'bs-intro-logo-size\').value=v+\'px\'">';
        h += '<span style="font-size:.82rem;color:var(--t3)">px</span>';
        h += '</div>';
        h += '<input type="hidden" id="bs-intro-logo-size" value="' + _logoSizePx + 'px">';
        h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:4px">建議：手機 200px，桌機 300px，最大 600px</small>';
        h += '</div>';
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
        h += '<button onclick="changeLogo()" type="button" style="margin:0;padding:9px 22px;background:var(--gold);color:var(--bg);border:none;cursor:pointer;font-size:.85rem;font-weight:700;border-radius:3px">上傳新 Logo</button>';
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
        h += '<button onclick="manageCarousel()" type="button" style="margin-top:10px;padding:9px 22px;background:var(--gold);color:var(--bg);border:none;cursor:pointer;font-size:.85rem;font-weight:700;border-radius:3px">管理輪播圖片</button>';
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
        h += '<button onclick="editServiceDescriptions()" type="button" style="margin-top:10px;padding:9px 22px;background:var(--gold);color:var(--bg);border:none;cursor:pointer;font-size:.85rem;font-weight:700;border-radius:3px">編輯服務項目說明</button>';
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
        h += '<button onclick="manageCategories()" type="button" style="margin-top:10px;padding:9px 22px;background:var(--gold);color:var(--bg);border:none;cursor:pointer;font-size:.85rem;font-weight:700;border-radius:3px">管理作品分類</button>';
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
          var _neverLogout  = bs.autoLogoutMinutes === 0;
          var _logoutMinVal = _neverLogout ? 30 : (bs.autoLogoutMinutes > 0 ? bs.autoLogoutMinutes : 5);
          h += '<label style="display:flex;align-items:center;gap:10px;margin-bottom:10px;font-size:.85rem">46. 自動登出時間（分鐘）：';
          h += '<input id="bs-auto-logout" type="number" min="1" max="1440" value="' + _logoutMinVal + '" placeholder="30"' + (_neverLogout ? ' disabled' : '') + ' style="width:72px;padding:4px 8px;background:var(--bg3);border:1px solid var(--border-g);color:var(--t1);border-radius:4px;font-size:.9rem;text-align:center' + (_neverLogout ? ';opacity:.35' : '') + '">';
          h += '<label style="white-space:nowrap;cursor:pointer;user-select:none;font-size:.85rem"><input type="checkbox" id="bs-never-logout"' + (_neverLogout ? ' checked' : '') + ' style="margin-right:4px;cursor:pointer;accent-color:var(--gold)"> 永不登出</label>';
          h += '</label>';
        }
        if (isSuperAdmin || canEdit('autoSave')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">47. 自動儲存時間（秒）：<input id="bs-auto-save" class="swal2-input" style="margin-top:4px" type="number" min="10" max="600" value="' + (bs.autoSaveSeconds||60) + '" placeholder="60"></label>';
          h += '<small style="color:var(--t3);font-size:.75rem;display:block;margin-top:-6px;margin-bottom:10px">提示：靜置指定秒數後自動儲存設定（10-600 秒）</small>';
        }
        if (isSuperAdmin || canEdit('copyright')) {
          h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">48. 版權模板：<input id="bs-copyright" class="swal2-input" style="margin-top:4px" value="' + (bs.copyrightTemplate||'') + '" placeholder="© YEAR MARK NO.5 VIDEO STUDIO"></label>';
        }
      }

      // ─── 15. Supabase 連線狀態（資料庫 / 登入 / 儲存都在 Supabase） ───
      if (isSuperAdmin) {
        var sbStatus = sb
          ? '<span style="color:#4ade80">✅ 已連線（' + (SUPABASE_URL.replace('https://','').split('.')[0]) + '・bucket：' + SUPABASE_BUCKET + '）</span>'
          : '<span style="color:#f87171">❌ 未連線</span>';
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 🗄️ Supabase 連線</h3>';
        h += '<p style="font-size:.82rem;color:var(--t2);margin-bottom:12px;line-height:1.8">';
        h += '登入、資料庫與圖片/影片都由 Supabase 提供。點「💾 儲存」即寫入雲端，其他裝置重新整理即可看到最新內容。<br>';
        h += '連線金鑰設定於 <b>app.js</b> 頂端（SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_BUCKET）。<br>';
        h += '目前狀態：' + sbStatus + '</p>';
      }

      // ─── 16. 帳號審核 / 通知設定（僅 super_admin / 緊急入口） ───
      if (isSuperAdmin) {
        var ejs = bs.emailjs || {};
        h += '<h3 style="color:var(--gold);margin:20px 0 12px 0;font-size:1.1rem;border-bottom:2px solid var(--gold);padding-bottom:8px">▸ 🔐 帳號審核 / 通知設定</h3>';
        // 申請信箱
        h += '<label style="display:block;margin-bottom:10px;font-size:.85rem">申請信箱（新帳號申請通知寄到這裡）：<input id="bs-app-email" class="swal2-input" style="margin-top:4px" type="email" value="' + ((bs.appEmail||'').replace(/"/g,'&quot;')) + '" placeholder="markno.5.studio@gmail.com"></label>';
        // 邀請碼
        var curCode = (D && D._inviteCode) || '';
        h += '<label style="display:block;margin-bottom:4px;font-size:.85rem">邀請碼（6 位，給對方輸入即可立即成為一般編輯）：<input id="bs-invite-code" class="swal2-input" style="margin-top:4px" maxlength="6" inputmode="numeric" value="' + curCode + '" placeholder="留空＝停用邀請碼"></label>';
        h += '<small style="color:var(--t3);font-size:.72rem;display:block;margin-bottom:12px">目前：' + (curCode ? ('<b style="color:#4ade80">已設定（' + curCode + '）</b>') : '未設定') + '。清空並儲存＝停用。</small>';
        // EmailJS
        h += '<div style="font-size:.85rem;margin:6px 0 4px;color:var(--t2)"><b>EMAILJS 設定</b>（免費電郵通知服務，emailjs.com 申請）</div>';
        h += '<label style="display:block;margin-bottom:8px;font-size:.85rem">SERVICE ID：<input id="bs-emailjs-service" class="swal2-input" style="margin-top:4px" value="' + ((ejs.serviceId||'').replace(/"/g,'&quot;')) + '" placeholder="service_xxx" autocomplete="off"></label>';
        h += '<label style="display:block;margin-bottom:8px;font-size:.85rem">TEMPLATE ID：<input id="bs-emailjs-template" class="swal2-input" style="margin-top:4px" value="' + ((ejs.templateId||'').replace(/"/g,'&quot;')) + '" placeholder="template_xxx" autocomplete="off"></label>';
        h += '<label style="display:block;margin-bottom:8px;font-size:.85rem">PUBLIC KEY：<input id="bs-emailjs-public" class="swal2-input" style="margin-top:4px" value="' + ((ejs.publicKey||'').replace(/"/g,'&quot;')) + '" placeholder="xxxxxxxxxxxxx" autocomplete="off"></label>';
        h += '<small style="color:var(--t3);font-size:.72rem;display:block;margin-bottom:12px;line-height:1.7">模板變數：<b style="color:var(--gold)">{{to_email}}</b>、<b style="color:var(--gold)">{{user_name}}</b>、<b style="color:var(--gold)">{{user_email}}</b>、<b style="color:var(--gold)">{{site_name}}</b>、<b style="color:var(--gold)">{{site_url}}</b>、<b style="color:#4ade80">{{invite_code}}</b>（邀請碼，核准時自動填入）。</small>';
        // 緊急密碼
        h += '<label style="display:block;margin-bottom:4px;font-size:.85rem">管理員緊急設定密碼：<input id="bs-emergency-pw" class="swal2-input" style="margin-top:4px" type="password" placeholder="設定新密碼（留空＝不變）" autocomplete="new-password"></label>';
        h += '<small style="color:var(--t3);font-size:.72rem;display:block;margin-bottom:12px">目前：' + (bs.emergencyHash ? '<b style="color:#4ade80">已設定</b>' : '未設定') + '。用於登入畫面「緊急設定入口」（只開後台設定用）。</small>';
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
    // ✅ 修正：willClose 在 .then() 之前執行，若在此清 __EMERGENCY，
    //    .then() 裡的 isSuperAdmin 判斷會得到 false，導致 EmailJS 等設定不被儲存。
    //    改用 didClose（在 .then() 之後執行）。
    didClose: function() { window.__EMERGENCY = false; },
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
      // ✅ 永不登出 checkbox：切換時啟用/停用數字輸入框
      var neverLogoutCb = document.getElementById('bs-never-logout');
      var logoutInput   = document.getElementById('bs-auto-logout');
      if (neverLogoutCb && logoutInput) {
        neverLogoutCb.addEventListener('change', function() {
          logoutInput.disabled     = this.checked;
          logoutInput.style.opacity = this.checked ? '0.35' : '1';
        });
      }
    },
    preConfirm: function() {
      var v = {};
      var isSuperAdmin = (CU && CU.role === 'super_admin') || EMERGENCY;
      var fbChanged = false; // 保留變數（Supabase 金鑰於 app.js 設定，不在此處變更）

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
        var neverEl  = document.getElementById('bs-never-logout');
        var logoutEl = document.getElementById('bs-auto-logout');
        if (neverEl && neverEl.checked) {
          v.autoLogout = '0'; // 永不登出
        } else if (logoutEl) {
          v.autoLogout = logoutEl.value;
        }
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

      // ⚡ 超級執行長專屬欄位：必須在 preConfirm 內讀取！
      // SweetAlert 的 .then() 執行時 dialog 已關閉、DOM 元素已消失，
      // 用 getElementById 只會得到 null，導致 EmailJS / 邀請碼 / 緊急密碼永遠無法儲存。
      if (isSuperAdmin) {
        var _aeEl  = document.getElementById('bs-app-email');
        if (_aeEl)  v._appEmail         = _aeEl.value.trim();
        var _esEl  = document.getElementById('bs-emailjs-service');
        if (_esEl)  v._emailjsServiceId  = _esEl.value.trim();
        var _etEl  = document.getElementById('bs-emailjs-template');
        if (_etEl)  v._emailjsTemplateId = _etEl.value.trim();
        var _epEl  = document.getElementById('bs-emailjs-public');
        if (_epEl)  v._emailjsPublicKey  = _epEl.value.trim();
        var _icEl  = document.getElementById('bs-invite-code');
        if (_icEl)  v._inviteCode        = _icEl.value.trim();
        var _epwEl = document.getElementById('bs-emergency-pw');
        if (_epwEl) v._emergencyPw       = _epwEl.value;
      }

      return v;
    }
  }).then(async function(result) {
    if (!result.isConfirmed) return;
    try {
      var v = result.value || {};
      // ✅ 重新宣告（preConfirm 作用域不同）
      var isSuperAdmin = (CU && CU.role === 'super_admin') || (v && '_appEmail' in v);
      var fbChanged = false;
      console.log('🔧 openBackendSettings .then() 開始執行');
      console.log('🔧 CU =', CU ? (CU.email + ' / role=' + CU.role) : 'null（未登入！）');
      console.log('🔧 isSuperAdmin =', isSuperAdmin);
      console.log('🔧 v._emailjsServiceId =', v._emailjsServiceId);
      console.log('🔧 v._emailjsTemplateId =', v._emailjsTemplateId);
      console.log('🔧 v._emailjsPublicKey =', v._emailjsPublicKey);

      // 更新首頁設定
      if (v.introTagline !== undefined) D.introTagline = v.introTagline;
      if (v.introTaglineSize !== undefined) D.introTaglineSize = v.introTaglineSize;
      if (v.heroSubtitle !== undefined) D.heroSubtitle = v.heroSubtitle;
      if (v.heroEnTitle !== undefined) D.heroEnTitle = v.heroEnTitle;
      if (v.heroZhTitle !== undefined) D.heroZhTitle = v.heroZhTitle;
      if (v.heroDesc !== undefined) D.heroDesc = v.heroDesc;
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
      if (v.heroEnSize !== undefined) D.theme.heroEnSize = v.heroEnSize;
      if (v.heroZhSize !== undefined) D.theme.heroZhSize = v.heroZhSize;
      if (v.rippleColor !== undefined) D.theme.rippleColor = v.rippleColor;
      if (v.rippleOpacity !== undefined) D.theme.rippleOpacity = v.rippleOpacity;
      if (v.rippleSize !== undefined) D.theme.rippleSize = v.rippleSize;
      if (v.rippleWidth !== undefined) D.theme.rippleWidth = v.rippleWidth;
      if (v.procNumOpacity !== undefined) D.theme.procNumOpacity = v.procNumOpacity;
      if (v.procNumHoverOpacity !== undefined) D.theme.procNumHoverOpacity = v.procNumHoverOpacity;
      
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
      if (v.autoLogout !== undefined) {
        var _logoutVal = parseInt(v.autoLogout, 10);
        // 0 = 永不登出（哨兵值）；NaN 回退至預設 5 分鐘
        D.backendSettings.autoLogoutMinutes = isNaN(_logoutVal) ? 5 : _logoutVal;
      }
      if (v.autoSave !== undefined) D.backendSettings.autoSaveSeconds = parseInt(v.autoSave);
      if (v.copyright !== undefined) D.backendSettings.copyrightTemplate = v.copyright;
      if (v.email !== undefined) D.contactEmail = v.email;
      if (v.contactEmail !== undefined) D.contactEmail = v.contactEmail;

      // 🔐 帳號審核 / 通知設定（值已在 preConfirm 讀入 v._* 中，此處不再碰 DOM）
      if (isSuperAdmin) {
        if (v._appEmail !== undefined) {
          D.backendSettings.appEmail = v._appEmail || 'markno.5.studio@gmail.com';
        }
        // EmailJS：三個欄位只要有任何一個被讀到就整組更新
        if (v._emailjsServiceId !== undefined || v._emailjsTemplateId !== undefined || v._emailjsPublicKey !== undefined) {
          var oldE = D.backendSettings.emailjs || {};
          D.backendSettings.emailjs = {
            serviceId:  v._emailjsServiceId  !== undefined ? v._emailjsServiceId  : (oldE.serviceId  || ''),
            templateId: v._emailjsTemplateId !== undefined ? v._emailjsTemplateId : (oldE.templateId || ''),
            publicKey:  v._emailjsPublicKey  !== undefined ? v._emailjsPublicKey  : (oldE.publicKey  || '')
          };
        }
        // 邀請碼 → 寫入 mk5_data/secret（與 main 分開；僅 super 可寫）
        // ⚠ 重大修正：
        //   舊版「只有值改變才寫」+「fire-and-forget、catch 只 console」
        //   → 一旦某次寫入失敗，記憶體 D._inviteCode 仍是 88888（UI 顯示已設定），
        //     但雲端 secret 其實是空的；之後因「值沒變」永遠不再寫 → 邀請信永遠空白。
        //   新版：一律寫入 + await + 立即回讀驗證 + 失敗明確提示。
        if (v._inviteCode !== undefined) {
          var code = v._inviteCode;
          D._inviteCode = code;
          try {
            // merge:true → 只更新 inviteCode，保留 secret 內的 blacklist（黑名單）不被清掉
            await db.collection('mk5_data').doc('secret').set({ inviteCode: code }, { merge: true });
            var _chk   = await db.collection('mk5_data').doc('secret').get();
            var _saved = (_chk.exists && _chk.data() && _chk.data().inviteCode) || '';
            if (_saved !== code) throw new Error('回讀不一致（雲端目前為「' + _saved + '」）');
            console.log('🔑 邀請碼已確實寫入雲端 secret：', code || '(已清空＝停用)');
          } catch (e) {
            console.error('邀請碼寫入 secret 失敗：', e);
            await Swal.fire({
              title: '⚠ 邀請碼沒有存進雲端',
              html: '畫面上看起來已設定，但<b>實際沒有寫入 Supabase</b>，所以寄出的邀請信會是空白。<br><br>' +
                    '錯誤：<b style="color:#f87171">' + ((e && (e.message || e.code)) || e) + '</b><br><br>' +
                    '請確認：帳號為 super_admin、已在 Supabase 執行 supabase_schema.sql，然後再按一次儲存。',
              icon: 'error', confirmButtonText: '我知道了'
            });
          }
        }
        // 緊急密碼 → 存 SHA-256（非同步），之後再 persist 一次
        if (v._emergencyPw) {
          sha256(v._emergencyPw).then(function(hh) { D.backendSettings.emergencyHash = hh; persist(); });
        }
      }

      console.log('🔧 D.backendSettings.emailjs（準備寫入）=', JSON.stringify(D.backendSettings && D.backendSettings.emailjs));
      logEdit(['introTagline','introTaglineSize','heroSubtitle','heroEnTitle','heroZhTitle','heroDesc','theme','social','backendSettings','contactEmail']);

      // 寫入成功後才套用畫面 + 顯示「已儲存」
      var finishSave = function() {
        // ✅ 儲存成功後清除 EmailJS 首次設定旗標，避免下次開設定時重複判斷
        _firstSetupPrompted = false;
        console.log('✅ finishSave() 被呼叫，儲存流程完成');
        applyTheme();
        updateDOM();
        if (typeof applyDragArrowStyles === 'function') applyDragArrowStyles();
        if (typeof applyDragGlowStyles === 'function') applyDragGlowStyles();
        if (typeof updateDragArrowIcons === 'function') updateDragArrowIcons();
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
        if (CU) { startAutoLogout(); startAutoSave(); }
        if (fbChanged) {
          Swal.fire({
            title:'✅ 設定已儲存！',
            html:'其他設定已更新。',
            icon:'success', confirmButtonText:'立即重新整理', allowOutsideClick:false
          }).then(function(res) { if (res.isConfirmed) location.reload(); });
        } else {
          Swal.fire({title:'✅ 設定已儲存！',text:'所有後台設定已更新（已寫入 Supabase 雲端）',timer:2000,showConfirmButton:false,icon:'success'});
        }
      };

      // 已登入管理員：等雲端寫入結果，成功才 finishSave，失敗顯示真正錯誤碼。
      if (CU) {
        console.log('🔧 CU 存在，呼叫 persistRaw()...');
        try {
          await persistRaw();
          console.log('✅ persistRaw() 成功完成');
          finishSave();
        } catch(saveErr) {
          var errMsg = (saveErr && (saveErr.message || saveErr.code || JSON.stringify(saveErr))) || '未知錯誤';
          console.error('❌ persistRaw() 失敗：', errMsg, saveErr);
          Swal.fire({
            title: '❌ 儲存失敗',
            html: '<b style="color:#f87171">' + errMsg + '</b>' +
              '<br><br><small style="color:var(--t2)">請按 F12 → Console 查看詳細錯誤。<br>常見原因：<br>1. Supabase RLS 政策阻擋（帳號不在 admins 表）<br>2. Supabase 連線問題<br>3. 已在 Supabase 執行 supabase_schema.sql？</small>',
            icon: 'error', confirmButtonText: '確認'
          });
        }
      } else {
        // 緊急入口（未登入）：僅更新畫面，不寫雲端
        console.warn('⚠️ CU 為 null，跳過 persistRaw()，不寫入 Supabase！');
        finishSave();
      }
    } catch(outerErr) {
      // 捕捉 .then() 內任何意外 JS 錯誤
      var outerMsg = (outerErr && (outerErr.message || String(outerErr))) || '未知錯誤';
      console.error('❌ openBackendSettings .then() 內部錯誤：', outerMsg, outerErr);
      alert('後台設定儲存流程發生錯誤：\n' + outerMsg + '\n\n請按 F12 → Console 查看詳細資訊。');
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
      html += '<td style="padding:12px 8px"><button onclick="replyMessage(' + i + ')" type="button" style="margin:0;padding:6px 12px;font-size:.8rem;background:var(--gold);color:var(--bg);border:none;cursor:pointer;font-weight:700;border-radius:3px">回覆</button></td>';
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
      html += '<div class="user-meta">' + (u.email||'') + ' · 最後登入：' + (u.lastSeen||'從未') + '</div>';
      html += '</div>';
      html += '<div class="user-actions">';
      html += '<button class="user-action-btn" onclick="editUserAt(' + i + ')">編輯</button>';
      if (u.role !== 'super_admin') {
        html += '<button class="user-action-btn delete" onclick="banUserAt(' + i + ')">禁止登入</button>';
        html += '<button class="user-action-btn delete" onclick="delUserAt(' + i + ')">刪除</button>';
      }
      html += '</div>';
      html += '</div>';
    }
    return html;
  }

  var _isAdmin = CU && CU.role === 'super_admin';
  var _myEmail = (CU && CU.email || '').toLowerCase();

  // 超級執行長：看所有人紀錄 | 其他人：只看自己的紀錄
  var logs = D.editLog || [];
  var visibleLogs = [];
  for (var _li = 0; _li < logs.length; _li++) {
    if (_isAdmin || (logs[_li].email || '').toLowerCase() === _myEmail) {
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

  window.delUserAt = function(i) {
    var u = D.users[i]; if (!u) return;
    Swal.fire({
      title:'確定移除此管理員？',
      html:'將移除「' + (u.name || '') + '」（' + (u.email||'') + '）的後台權限。<br><small style="color:var(--t3)">註：對方的 Google 登入帳號仍存在，但會變回「待審核」；如需完全封鎖，請在 Supabase 主控台 → Authentication → Users 停用該帳號。</small>',
      icon:'warning', showCancelButton:true, confirmButtonText:'移除', cancelButtonText:'取消'
    }).then(function(r) {
      if (!r.isConfirmed) return;
      var p = (u.uid) ? db.collection('admins').doc(u.uid).delete() : Promise.resolve();
      p.then(function() {
        D.users.splice(i, 1);
        document.getElementById('ulistw').innerHTML = uLH();
      }).catch(function(e) { Swal.fire({title:'移除失敗',text:(e.message||e),icon:'error'}); });
    });
  };
  // 禁止登入（黑名單）：移除權限 + 加入黑名單，對方無法再登入或用邀請碼
  window.banUserAt = function(i) {
    var u = D.users[i]; if (!u) return;
    if (u.role === 'super_admin') { Swal.fire({ title:'無法停權', text:'超級執行長帳號不可被停權。', icon:'warning' }); return; }
    Swal.fire({
      title:'禁止此帳號登入？',
      html:'將把「' + (u.name || '') + '」（' + (u.email||'') + '）<b style="color:#f87171">加入黑名單</b>：<br>立即移除後台權限，且<b>無法再次登入或使用邀請碼</b>。<br><small style="color:var(--t3)">日後可在「⛔ 黑名單」清單按「解除」恢復。</small>',
      icon:'warning', showCancelButton:true, confirmButtonText:'禁止登入', cancelButtonText:'取消', confirmButtonColor:'#B52020'
    }).then(function(r) {
      if (!r.isConfirmed) return;
      sb.rpc('ban_user', { p_email: (u.email||'').toLowerCase() }).then(function(rr) {
        if (rr && rr.error) throw rr.error;
        D.users.splice(i, 1);
        Swal.fire({ title:'✅ 已禁止登入', timer:1300, showConfirmButton:false, icon:'success' }).then(showUsers);
      }).catch(function(e) { Swal.fire({ title:'操作失敗', text:(e.message||e), icon:'error' }); });
    });
  };
  // 解除黑名單
  window.unbanEmail = function(email) {
    Swal.fire({
      title:'解除停權？', html:'將允許 <b>' + email + '</b> 重新登入並申請帳號。',
      icon:'question', showCancelButton:true, confirmButtonText:'解除', cancelButtonText:'取消'
    }).then(function(r) {
      if (!r.isConfirmed) return;
      sb.rpc('unban_user', { p_email: email }).then(function(rr) {
        if (rr && rr.error) throw rr.error;
        Swal.fire({ title:'✅ 已解除', timer:1100, showConfirmButton:false, icon:'success' }).then(showUsers);
      }).catch(function(e) { Swal.fire({ title:'操作失敗', text:(e.message||e), icon:'error' }); });
    });
  };
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
      
      // 放寬檔案大小限制（Supabase Storage 免費方案單檔上限約 50MB）
      if (file.size > 50000000) {
        Swal.fire({title:'檔案過大',text:'請選擇小於 50MB 的圖片',icon:'error'});
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

          // 縮圖後上傳到 Storage，只保存網址
          Swal.fire({ title:'上傳中…', didOpen:function(){ Swal.showLoading(); }, allowOutsideClick:false });
          canvasToBlob(canvas, 'image/jpeg', 0.9)
            .then(function(blob) { return uploadToStorage(blob, 'avatars', 'jpg'); })
            .then(function(url) {
              D.users[userIdx].avatar = url;
              // 如果是當前用戶，也更新 CU
              if (CU && (CU.email || '').toLowerCase() === (D.users[userIdx].email || '').toLowerCase()) {
                CU.avatar = url;
                if (typeof updateAdminUI === 'function') updateAdminUI(); // 更新後台顯示
              }
              return saveAdmin(D.users[userIdx]); // 寫入該管理員 doc
            })
            .then(function() {
              document.getElementById('ulistw').innerHTML = uLH();
              Swal.fire({title:'✅ 大頭貼已上傳！',timer:1200,showConfirmButton:false,icon:'success'});
            })
            .catch(function(err) { Swal.fire({title:'上傳失敗',text:(err.message||err),icon:'error'}); });
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
            '<input id="eu-em" class="swal2-input" value="' + (u.email||'') + '" placeholder="Email（Google 登入帳號）" readonly style="opacity:.7;cursor:not-allowed">' +
            (CU.role === 'super_admin' ?
              '<select id="eu-role" class="swal2-input"><option value="editor"' + (u.role==='editor'?' selected':'') + '>一般編輯</option><option value="ops_admin"' + (u.role==='ops_admin'?' selected':'') + '>營運長</option><option value="super_admin"' + (u.role==='super_admin'?' selected':'') + '>超級執行長</option></select>' : '') +

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
        if (!nm) { Swal.showValidationMessage('顯示名稱必填'); return false; }
        var out = { name:nm };
        if (CU.role === 'super_admin') {
          var roleEl = document.getElementById('eu-role');
          if (roleEl) out.role = roleEl.value;
          var permissions = [];
          var cbs = document.querySelectorAll('.perm-cb:checked');
          for (var k = 0; k < cbs.length; k++) permissions.push(cbs[k].value);
          out.permissions = permissions;
        }
        return out; // email 不可改（= Google 帳號）；密碼由 Google 管理
      }
    }).then(function(r) {
      if (r.isConfirmed) {
        D.users[i] = Object.assign({}, D.users[i], r.value);
        if (CU && (CU.email || '').toLowerCase() === (u.email || '').toLowerCase()) { CU = Object.assign({}, CU, r.value); }
        saveAdmin(D.users[i]).then(function(){ showUsers(); })
          .catch(function(e){ Swal.fire({title:'儲存失敗',text:(e.message||e),icon:'error'}); });
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
        if (file.size > 50000000) {
          Swal.fire({title:'檔案過大',text:'請選擇小於 50MB 的圖片',icon:'error'});
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
            // 縮圖後上傳到 Storage，只保存網址
            canvasToBlob(canvas, 'image/jpeg', 0.9)
              .then(function(blob) { return uploadToStorage(blob, 'avatars', 'jpg'); })
              .then(function(url) {
                D.users[userIdx].avatar = url;
                var pv = document.getElementById('edit-avatar-preview');
                if (pv) pv.src = url;
              })
              .catch(function(err) { Swal.fire({title:'上傳失敗',text:(err.message||err),icon:'error'}); });
          };
          img.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      };
      input.click();
    };
  };

  var pendingBlock = _isAdmin
    ? '<div style="margin-top:14px;text-align:left"><strong style="color:var(--gold);font-size:.8rem;letter-spacing:.1em">⏳ 待審核申請</strong>' +
      '<div id="pending-apps" style="max-height:180px;overflow-y:auto;margin-top:6px;font-size:.82rem;color:var(--t3)">載入中…</div></div>'
    : '';

  var blacklistBlock = _isAdmin
    ? '<div style="margin-top:14px;text-align:left"><strong style="color:var(--red);font-size:.8rem;letter-spacing:.1em">⛔ 黑名單（已停權）</strong>' +
      '<div id="blacklist-box" style="max-height:160px;overflow-y:auto;margin-top:6px;font-size:.82rem;color:var(--t3)">載入中…</div></div>'
    : '';

  Swal.fire({
    title: '👥 帳號管理', width: 560,
    html: '<div id="ulistw" style="text-align:left;max-height:220px;overflow-y:auto">' + uLH() + '</div>' +
          '<button onclick="addUserDlg()" style="margin-top:12px;background:var(--bg3);border:1px solid var(--border-g);color:var(--gold);padding:8px 18px;cursor:pointer;font-size:.82rem">＋ 如何新增帳號？</button>' +
          pendingBlock +
          blacklistBlock +
          '<div style="margin-top:16px;text-align:left"><strong style="color:var(--gold);font-size:.75rem;letter-spacing:.1em">' + logSectionTitle + '</strong>' +
          '<div style="max-height:160px;overflow-y:auto;margin-top:6px">' + logRows + '</div></div>',
    confirmButtonText: '關閉', showCancelButton: false,
    didOpen: function() {
      // 新增帳號改為說明：Google 帳號無法由前端代為建立
      window.addUserDlg = function() {
        Swal.fire({
          title: '如何新增帳號',
          icon: 'info',
          html: '<div style="text-align:left;line-height:1.9;font-size:.9rem">' +
                '1. 請對方用自己的 <b>Google 帳號</b>到本網站點「後台登入」。<br>' +
                '2. 對方會看到「帳號待審核」畫面，申請通知會寄到申請信箱。<br>' +
                '3. 你可在此「⏳ 待審核申請」清單按「核准」；或把 <b>邀請碼</b>給對方，對方輸入後即可立即成為一般編輯。' +
                '</div>',
          confirmButtonText: '了解'
        });
      };

      // 核准 / 拒絕
      window.approveApp = function(uid, email, name) {
        sb.rpc('approve_application', { p_uid: uid, p_data: {
          email: (email||'').toLowerCase(), name: name || (email||'').split('@')[0],
          role: 'editor', permissions: [], avatar: '', online: false, lastSeen: ''
        }}).then(async function(r) {
          if (r && r.error) throw r.error;
          // ✅ 核准後自動寄邀請碼給被核准的使用者
          // sendInviteEmail 會在「沒寄出」時自行提示原因（未設定 EmailJS／未設定邀請碼／寄送失敗）
          var sent = await sendInviteEmail(email, name);
          if (sent) {
            await Swal.fire({ title:'✅ 已核准', text:'邀請碼已自動寄出給 ' + email, timer:2000, showConfirmButton:false, icon:'success' });
          }
          showUsers(); // 不論是否寄出都重新整理清單
        }).catch(function(e) { Swal.fire({ title:'核准失敗', text:(e.message||e), icon:'error' }); });
      };
      window.rejectApp = function(uid) {
        Swal.fire({ title:'拒絕此申請？', icon:'warning', showCancelButton:true, confirmButtonText:'拒絕' }).then(function(r) {
          if (!r.isConfirmed) return;
          db.collection('applications').doc(uid).delete()
            .then(function() { Swal.fire({ title:'已拒絕', timer:1000, showConfirmButton:false }); setTimeout(showUsers, 600); })
            .catch(function(e) { Swal.fire({ title:'操作失敗', text:(e.message||e), icon:'error' }); });
        });
      };

      // 載入待審核清單
      if (_isAdmin) {
        db.collection('applications').get().then(function(qs) {
          var box = document.getElementById('pending-apps');
          if (!box) return;
          if (qs.empty) { box.innerHTML = '<div style="padding:6px 0">目前沒有待審核申請</div>'; return; }
          var html = '';
          qs.forEach(function(doc) {
            var a = doc.data(); var uid = doc.id;
            var safeName = (a.name || '(未命名)').replace(/'/g, '');
            html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">' +
              '<div style="flex:1"><div style="color:var(--t1)">' + (a.name || '(未命名)') + '</div><div style="font-size:.72rem;color:var(--t3)">' + (a.email||'') + '</div></div>' +
              '<button onclick="approveApp(\'' + uid + '\',\'' + (a.email||'') + '\',\'' + safeName + '\')" style="background:var(--gold);border:none;color:var(--bg);padding:5px 12px;border-radius:4px;cursor:pointer;font-size:.75rem;font-weight:700">核准</button>' +
              '<button onclick="rejectApp(\'' + uid + '\')" style="background:transparent;border:1px solid var(--red);color:var(--red);padding:5px 12px;border-radius:4px;cursor:pointer;font-size:.75rem">拒絕</button>' +
            '</div>';
          });
          box.innerHTML = html;
        }).catch(function(e) {
          var box = document.getElementById('pending-apps');
          if (box) box.innerHTML = '<div style="color:var(--red)">讀取失敗：' + (e.message||e) + '</div>';
        });

        // 載入黑名單（super 可直接讀 secret.blacklist）
        db.collection('mk5_data').doc('secret').get().then(function(s) {
          var box = document.getElementById('blacklist-box');
          if (!box) return;
          var list = (s.exists && s.data() && s.data().blacklist) || [];
          if (!list.length) { box.innerHTML = '<div style="padding:6px 0">目前沒有被停權的帳號</div>'; return; }
          var html = '';
          for (var bi = 0; bi < list.length; bi++) {
            var em = list[bi] || '';
            var safeEm = em.replace(/'/g, '');
            html += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">' +
              '<div style="flex:1;color:var(--t2)">⛔ ' + em + '</div>' +
              '<button onclick="unbanEmail(\'' + safeEm + '\')" style="background:transparent;border:1px solid var(--gold);color:var(--gold);padding:5px 12px;border-radius:4px;cursor:pointer;font-size:.75rem">解除</button>' +
            '</div>';
          }
          box.innerHTML = html;
        }).catch(function(e) {
          var box = document.getElementById('blacklist-box');
          if (box) box.innerHTML = '<div style="color:var(--red)">讀取失敗：' + (e.message||e) + '</div>';
        });
      }
    }
  });
};

window.editMyProfile = function() {
  var em = (CU && CU.email || '').toLowerCase();
  var i = -1;
  for (var j = 0; j < D.users.length; j++) if ((D.users[j].email || '').toLowerCase() === em) { i = j; break; }
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
        persistAnalytics();
      }
    })
    .catch(function(e) {
      console.log('Location API unavailable:', e.message);
    });

  persistAnalytics();
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
