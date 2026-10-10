// ═══════════════════════════════════════════
// app.js — Logic utama Money Management
// by AL-HAZA Production
// ═══════════════════════════════════════════

/* ─────────────────────────────────────────
   LOADING SCREEN ULTRA ANIMATION
───────────────────────────────────────── */
(function initLoadingAnim() {
  const screen = document.getElementById('loading-screen');
  if (!screen) return;

  const coinColors = [
    {bg:'rgba(123,158,248,0.15)',bd:'rgba(123,158,248,0.5)',tx:'#7B9EF8'},
    {bg:'rgba(61,219,160,0.15)', bd:'rgba(61,219,160,0.5)', tx:'#3DDBA0'},
    {bg:'rgba(255,184,48,0.15)', bd:'rgba(255,184,48,0.5)', tx:'#FFB830'},
    {bg:'rgba(255,112,104,0.12)',bd:'rgba(255,112,104,0.5)',tx:'#FF7068'},
    {bg:'rgba(167,139,250,0.15)',bd:'rgba(167,139,250,0.5)',tx:'#A78BFA'},
    {bg:'rgba(251,146,60,0.15)', bd:'rgba(251,146,60,0.5)', tx:'#FB923C'},
  ];
  const sizes = [18,22,26,30,24,20,28,16];
  for (let i = 0; i < 18; i++) {
    const coin = document.createElement('div');
    coin.className = 'ld-coin';
    const sz  = sizes[i % sizes.length];
    const col = coinColors[i % coinColors.length];
    const dur = 5 + Math.random() * 7;
    const del = -(Math.random() * 8);
    const lft = 2 + Math.random() * 96;
    coin.style.cssText = `
      width:${sz}px;height:${sz}px;font-size:${Math.round(sz*.48)}px;
      left:${lft}%;background:${col.bg};border:1.5px solid ${col.bd};
      color:${col.tx};animation-duration:${dur}s;animation-delay:${del}s;
      text-shadow:0 0 6px ${col.tx};
    `;
    coin.textContent = '$';
    screen.appendChild(coin);
  }

  const sparkColors = ['#7B9EF8','#3DDBA0','#FFB830','#FF7068','#A78BFA'];
  for (let i = 0; i < 12; i++) {
    const spark = document.createElement('div');
    spark.className = 'ld-spark';
    const col = sparkColors[i % sparkColors.length];
    const left = 20 + Math.random() * 60;
    const dur  = 1.5 + Math.random() * 2;
    const del  = -(Math.random() * 3);
    spark.style.cssText = `
      left:${left}%;bottom:80px;background:${col};
      box-shadow:0 0 4px ${col};
      animation-duration:${dur}s;animation-delay:${del}s;
    `;
    screen.appendChild(spark);
  }

  const bar   = document.getElementById('ld-bar');
  const pctEl = document.getElementById('ld-pct');
  const msgEl = document.getElementById('loading-msg');
  const msgs  = [
    'Memulai aplikasi…',
    'Menghubungkan Firebase…',
    'Memuat akun & kategori…',
    'Menyiapkan kalender…',
    'Mengatur tampilan…',
    'Hampir selesai…',
    'Selamat datang! 🎉'
  ];
  let prog = 0, lastMsgIdx = -1;

  const tick = setInterval(() => {
    prog = Math.min(prog + (2 + Math.random() * 7), 92);
    const p = Math.round(prog);
    if (bar)   bar.style.width = prog + '%';
    if (pctEl) pctEl.textContent = p + '%';
    const idx = Math.min(Math.floor((prog / 100) * msgs.length), msgs.length - 1);
    if (msgEl && idx !== lastMsgIdx) {
      lastMsgIdx = idx;
      msgEl.style.animation = 'none';
      void msgEl.offsetWidth;
      msgEl.style.animation = '';
      msgEl.textContent = msgs[idx];
    }
    if (prog >= 92) clearInterval(tick);
  }, 190);

  window._ldTick = tick;
  window._finishLoading = function() {
    clearInterval(tick);
    if (bar)   bar.style.width   = '100%';
    if (pctEl) pctEl.textContent = '100%';
    if (msgEl) { msgEl.textContent = msgs[msgs.length - 1]; }
  };
})();

/* ─────────────────────────────────────────
   FIREBASE (instance diimpor dari firebase.js)
───────────────────────────────────────── */
import { auth, db, googleProvider } from './firebase.js';
import {
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, doc, addDoc, updateDoc, deleteDoc, setDoc,
  getDocs, writeBatch, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ─────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────── */
const MO      = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MO_FULL = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const CHART_COLORS = ['#7B9EF8','#3DDBA0','#FFB830','#FF7068','#A78BFA','#FB923C','#EC4899','#22D3EE','#4ADE80','#F43F5E','#14B8A6','#8B5CF6'];

const DEF_CATS = [
  {id:'c1',name:'Gaji',type:'income',icon:'fa-briefcase',color:'#3DDBA0'},
  {id:'c2',name:'Freelance',type:'income',icon:'fa-laptop-code',color:'#22D3EE'},
  {id:'c3',name:'Investasi',type:'income',icon:'fa-chart-line',color:'#A78BFA'},
  {id:'c4',name:'Bonus',type:'income',icon:'fa-gift',color:'#FFB830'},
  {id:'c5',name:'Bisnis',type:'income',icon:'fa-store',color:'#4ADE80'},
  {id:'c6',name:'Lainnya',type:'income',icon:'fa-ellipsis',color:'#8A90A8'},
  {id:'c7',name:'Makanan',type:'expense',icon:'fa-utensils',color:'#FF7068'},
  {id:'c8',name:'Transportasi',type:'expense',icon:'fa-car',color:'#FB923C'},
  {id:'c9',name:'Belanja',type:'expense',icon:'fa-shopping-bag',color:'#EC4899'},
  {id:'c10',name:'Hiburan',type:'expense',icon:'fa-film',color:'#A78BFA'},
  {id:'c11',name:'Tagihan',type:'expense',icon:'fa-file-invoice',color:'#22D3EE'},
  {id:'c12',name:'Kesehatan',type:'expense',icon:'fa-heart-pulse',color:'#F43F5E'},
  {id:'c13',name:'Pendidikan',type:'expense',icon:'fa-graduation-cap',color:'#7B9EF8'},
  {id:'c14',name:'Tempat Tinggal',type:'expense',icon:'fa-house',color:'#4ADE80'},
  {id:'c15',name:'Transfer',type:'expense',icon:'fa-right-left',color:'#8A90A8'},
  {id:'c16',name:'Lainnya',type:'expense',icon:'fa-ellipsis',color:'#8A90A8'}
];
const DEF_ACCS = [
  {id:'a1',name:'Dompet',type:'cash',icon:'fa-money-bill-wave',color:'#4ADE80'},
  {id:'a2',name:'Bank BCA',type:'bank',icon:'fa-building-columns',color:'#22D3EE'},
  {id:'a3',name:'GoPay',type:'ewallet',icon:'fa-mobile-screen',color:'#A78BFA'}
];

/* ─────────────────────────────────────────
   STATE
───────────────────────────────────────── */
let currentUser = null;
let S = {
  page: 'dashboard',
  accounts:     JSON.parse(JSON.stringify(DEF_ACCS)),
  categories:   JSON.parse(JSON.stringify(DEF_CATS)),
  transactions: [],
  budgets:      [],
  goals:        [],
  debts:        [],
  targets:      [],
  settings:     { theme: 'dark', currency: 'Rp' }
};
let txnFilter  = { type: 'all', search: '', month: '', categoryId: '', debtId: '', from: '', to: '' };
let _settingsDocId = null;
let _loadingData = false;
let reportRange = 3;
let debtFilter = 'all'; // all | hutang | piutang
let _targetTab = 'harian'; // harian | mingguan | bulanan | tahunan
let _txnType   = 'expense';
let _charts    = {};
let _unsubscribers = [];
let _pendingDeleteId = null;

window._txnType = _txnType;

// Bersihkan SELURUH data di memori (dipanggil saat logout / ganti akun) supaya data akun lama
// tidak pernah tampil atau tercampur ke akun lain.
function resetState() {
  S.page = 'dashboard';
  S.accounts     = JSON.parse(JSON.stringify(DEF_ACCS));
  S.categories   = JSON.parse(JSON.stringify(DEF_CATS));
  S.transactions = []; S.budgets = []; S.goals = []; S.debts = []; S.targets = [];
  S.settings     = { theme: S.settings?.theme || 'dark', currency: 'Rp' };
  txnFilter = { type: 'all', search: '', month: '', categoryId: '', debtId: '', from: '', to: '' };
  debtFilter = 'all'; _settingsDocId = null; _fxCache = null;
  document.getElementById('modal-overlay')?.classList.remove('show');
  const pt = document.getElementById('page-title'); if (pt) pt.textContent = 'Dashboard';
  const pc = document.getElementById('page-content'); if (pc) pc.innerHTML = '';
}
function resetAuthForms() {
  ['login-email','login-pw','reg-email','reg-pw'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['btn-login','btn-reg'].forEach(id => { const b = document.getElementById(id); if (b) { b.classList.remove('btn-loading'); b.disabled = false; } });
  document.querySelectorAll('.btn-google').forEach(b => { b.disabled = false; b.style.opacity = '1'; });
}

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const uid    = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2,8);
function localDateStr(d) {
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), dd = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${dd}`;
}
const today  = () => localDateStr(new Date());
const CUR_LOCALE = {
  'Rp': { locale:'id-ID', decimals:0 },
  '$':  { locale:'en-US', decimals:2 },
  '€':  { locale:'de-DE', decimals:2 },
  '¥':  { locale:'ja-JP', decimals:0 },
  '£':  { locale:'en-GB', decimals:2 }
};
// ── Kurs mata uang asing (Dashboard & Pengaturan) ──
// Basis = mata uang yg dipilih user di Pengaturan (dianggap mewakili "negara asal"nya).
const CUR_ISO = { 'Rp':'IDR', '$':'USD', '€':'EUR', '¥':'JPY', '£':'GBP' };
const FX_MAJORS = ['USD','EUR','GBP','JPY','SGD','AUD','MYR','CNY'];
let _fxCache = null;
// Cache di localStorage 6 jam supaya hemat kuota API & tetap tampil (walau agak basi) kalau offline/API down.
// Provider 1: Frankfurter (ECB). Base bisa currency apapun krn dihitung cross-rate via EUR.
async function fetchFxFromFrankfurter(baseIso) {
  const symbols = FX_MAJORS.filter(c=>c!==baseIso).join(',');
  const res = await fetch(`https://api.frankfurter.app/latest?from=${baseIso}&to=${symbols}`);
  if (!res.ok) throw new Error('Frankfurter HTTP '+res.status);
  const data = await res.json();
  const rates = {};
  Object.entries(data.rates||{}).forEach(([k,v]) => { if (v>0) rates[k] = 1/v; }); // invert: "1 IDR=0.00006 USD" → "1 USD=X IDR"
  if (!Object.keys(rates).length) throw new Error('Frankfurter: data kosong');
  return { rates, date: data.date };
}
// Provider 2 (cadangan kalau provider 1 down/limit): open.er-api.com — juga gratis, tanpa API key.
async function fetchFxFromErApi(baseIso) {
  const res = await fetch(`https://open.er-api.com/v6/latest/${baseIso}`);
  if (!res.ok) throw new Error('ER-API HTTP '+res.status);
  const data = await res.json();
  if (data.result !== 'success') throw new Error('ER-API: respons gagal');
  const rates = {};
  FX_MAJORS.filter(c=>c!==baseIso).forEach(c => { const v = data.rates?.[c]; if (v>0) rates[c] = 1/v; });
  if (!Object.keys(rates).length) throw new Error('ER-API: data kosong');
  const date = data.time_last_update_utc ? new Date(data.time_last_update_utc).toISOString().slice(0,10) : null;
  return { rates, date };
}
// Cache 6 jam di localStorage + 2 provider berurutan, supaya kurs SELALU berhasil tampil
// kecuali keduanya down bersamaan DAN belum pernah berhasil fetch sebelumnya di device ini.
async function fetchFxRates(baseIso) {
  const cacheKey = 'mm_fx_' + baseIso;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || 'null'); } catch(e) {}
  if (cached && (Date.now() - cached.fetchedAt) < 6*3600*1000) { _fxCache = cached; return cached; }
  for (const provider of [fetchFxFromFrankfurter, fetchFxFromErApi]) {
    try {
      const { rates, date } = await provider(baseIso);
      const result = { base: baseIso, rates, date, fetchedAt: Date.now() };
      try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch(e) {}
      _fxCache = result;
      return result;
    } catch(e) { /* coba provider berikutnya */ }
  }
  if (cached) { _fxCache = cached; return cached; } // stale tapi lebih baik drpd kosong
  return null;
}
const fmt = n => {
  const cur = S.settings?.currency || 'Rp';
  const conf = CUR_LOCALE[cur] || CUR_LOCALE['Rp'];
  const num = Number(n) || 0;
  const val = Math.abs(num);
  const neg = num < 0 && val >= (conf.decimals ? 0.005 : 0.5);
  return (neg ? '−' : '') + cur + ' ' + val.toLocaleString(conf.locale, { minimumFractionDigits: conf.decimals, maximumFractionDigits: conf.decimals });
};
// Tanggal 'YYYY-MM-DD' → teks lokal TANPA pergeseran zona waktu (new Date('YYYY-MM-DD') dibaca UTC → bisa mundur 1 hari di sebagian zona).
const fmtDate = (dateStr, opts) => new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', opts);
// Warna CSS variable → nilai nyata (canvas Chart.js TIDAK mengerti var(--x)).
const cssVar = name => (getComputedStyle(document.documentElement).getPropertyValue(name) || '').trim() || '#8A90A8';
function groupInt(n) {
  n = Math.round(Number(n) || 0);
  const cur = S.settings?.currency || 'Rp';
  const conf = CUR_LOCALE[cur] || CUR_LOCALE['Rp'];
  return n.toLocaleString(conf.locale, { maximumFractionDigits: 0 });
}
window.liveFormatAmount = function(el) {
  const digits = el.value.replace(/[^\d]/g, '');
  el.value = digits ? groupInt(parseInt(digits, 10)) : '';
};
const fmtS   = n => { n=Number(n)||0; const sg=n<0?'−':''; n=Math.abs(n); if(n>=1e9) return sg+(n/1e9).toFixed(1)+'M'; if(n>=1e6) return sg+(n/1e6).toFixed(1)+'Jt'; if(n>=1e3) return sg+(n/1e3).toFixed(0)+'Rb'; return sg+Math.round(n).toString() };
const catObj = id => S.categories.find(c=>c.id===id) || {name:'(Kategori Dihapus)',icon:'fa-question',color:'#8A90A8',type:'expense'};
const accObj = id => S.accounts.find(a=>a.id===id)    || {name:'(Akun Dihapus)',icon:'fa-question',color:'#8A90A8',type:'cash'};
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function monthTxns(ago = 0) {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() - ago, 1);
  return txnsInMonth(d.getFullYear(), d.getMonth() + 1);
}
// Transaksi pada 1 hari spesifik (dipakai untuk Target Harian)
function dayTxns(dateStr) {
  return S.transactions.filter(t => t.date === dateStr);
}
// Transaksi dalam 1 tahun kalender, `ago` = berapa tahun ke belakang (dipakai untuk Target Tahunan)
function yearTxns(ago = 0) {
  const y = new Date().getFullYear() - ago;
  return S.transactions.filter(t => t.date.startsWith(String(y)));
}

/* ═══════════════════════════════════════════
   HELPER PERIODE EKSPLISIT — dipakai Anggaran & Target Berkala
   supaya harian/mingguan/bulanan/tahunan semua bisa saling connect.
═══════════════════════════════════════════ */
function txnsOnDate(dateStr) { return S.transactions.filter(t => t.date === dateStr); }
// Senin sbg awal minggu. Input tanggal apapun, hasil = tanggal Senin di minggu yg sama.
function weekStartOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0=Min..6=Sab
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return localDateStr(d);
}
function txnsInWeek(weekStartStr) {
  const start = new Date(weekStartStr + 'T00:00:00');
  const end = new Date(start); end.setDate(end.getDate() + 6);
  return S.transactions.filter(t => { const d = new Date(t.date+'T00:00:00'); return d >= start && d <= end; });
}
function txnsInMonth(y, m) { // m: 1-12
  const mm = String(m).padStart(2,'0');
  return S.transactions.filter(t => t.date.startsWith(`${y}-${mm}`));
}
function txnsInYear(y) { return S.transactions.filter(t => t.date.startsWith(String(y))); }

const PERIOD_DAYS = { harian:1, mingguan:7, bulanan:30, tahunan:365 };
const PERIOD_LABEL = { harian:'Harian', mingguan:'Mingguan', bulanan:'Bulanan', tahunan:'Tahunan' };
// Konversi kasar nominal antar periode (mis. hemat 50rb/hari ≈ berapa/bulan, berapa/tahun)
function convertPeriodAmount(amount, fromPeriod, toPeriod) {
  if (fromPeriod === toPeriod) return amount;
  const dailyRate = amount / PERIOD_DAYS[fromPeriod];
  return dailyRate * PERIOD_DAYS[toPeriod];
}
function sumType(arr, type) { return arr.filter(t=>t.type===type).reduce((s,t)=>s+t.amount,0); }
function totalBal() { return S.transactions.reduce((s,t)=>s+(t.type==='income'?t.amount:-t.amount), 0); }
function accBal(id) { return S.transactions.filter(t=>t.accountId===id).reduce((s,t)=>s+(t.type==='income'?t.amount:-t.amount), 0); }

// ── Hutang & Piutang: helper ringkasan ──
// 'hutang'  = saya berhutang ke orang lain (liability)
// 'piutang' = orang lain berhutang ke saya (asset)
function debtRemaining(d) { return Math.max(0, d.amount - (d.paid || 0)); }
function totalHutang()  { return S.debts.filter(d=>d.type==='hutang').reduce((s,d)=>s+debtRemaining(d),0); }
function totalPiutang() { return S.debts.filter(d=>d.type==='piutang').reduce((s,d)=>s+debtRemaining(d),0); }
function netWorth() { return totalBal() + totalPiutang() - totalHutang(); }

// ── PEMISAHAN ARUS KAS RIIL vs ARUS KAS HUTANG-PIUTANG ──
// Uang yang diterima dari berhutang, atau uang yang dikeluarkan untuk
// meminjamkan (piutang), BUKAN pendapatan/pengeluaran riil — itu cuma
// pergerakan kas yang diimbangi kewajiban/aset (hutang/piutang).
// Transaksi dengan flow:'hutang' TETAP masuk hitungan saldo akun (uangnya
// memang nyata berpindah), tapi DIKECUALIKAN dari semua statistik
// pendapatan/pengeluaran/tabungan supaya angkanya jujur dan tidak bias.
function isRealFlow(t) { return t.flow !== 'hutang' && t.flow !== 'transfer'; }
function filterReal(arr) { return arr.filter(isRealFlow); }

// Kategori khusus (lazy-create) — dibuat otomatis sekali saja per akun user,
// supaya user lama pun ikut dapat tanpa perlu migrasi manual.
async function ensureCategoryByName(name, type, icon, color) {
  let cat = S.categories.find(c => c.name === name && c.type === type);
  if (cat) return cat;
  icon = icon || 'fa-tag'; color = color || '#8A90A8';
  const ref = await addDoc(col('categories'), { name, type, icon, color });
  cat = { id: ref.id, name, type, icon, color };
  S.categories.push(cat);
  return cat;
}
async function ensureDebtCategory(type) {
  return ensureCategoryByName('Hutang/Piutang', type, 'fa-hand-holding-dollar', '#8A90A8');
}

/* ═══════════════════════════════════════════
   TANGGA KEKAYAAN ABADI (Wealth Ladder)
   7 tahap financial freedom. SETIAP status di sini dihitung LANGSUNG
   dari data transaksi/hutang/tabungan yang sudah ada — TIDAK ADA status
   yang bisa ditandai "selesai" hanya dengan klik. Tombol "Update" pada
   tiap tangga hanya memicu perhitungan ulang (recheck), bukan klaim manual.
═══════════════════════════════════════════ */
const LADDER_META = [
  { step:1, title:'Nabung Cash 10 Juta',              icon:'fa-piggy-bank',        color:'#8A90A8' },
  { step:2, title:'Lunasi Semua Hutang Kecil',        icon:'fa-hand-holding-dollar', color:'#B08D57' },
  { step:3, title:'Dana Darurat 3× Pengeluaran Bulanan', icon:'fa-shield-halved',  color:'#3DDBA0' },
  { step:4, title:'Investasi Minimal 20% dari Income', icon:'fa-chart-line',       color:'#22D3EE' },
  { step:5, title:'Dana Pendidikan Anak',             icon:'fa-graduation-cap',   color:'#A78BFA' },
  { step:6, title:'Lunasi KPR Secepat Mungkin',       icon:'fa-house',            color:'#FFB830' },
  { step:7, title:'Kekayaan Abadi & Berbagi',         icon:'fa-crown',            color:'#3DDBA0' },
];

// Rata-rata pengeluaran RIIL 3 bulan terakhir — dipakai sbg dasar target Dana Darurat (tangga 3)
function avgMonthlyRealExpense() {
  const m = [filterReal(monthTxns(1)), filterReal(monthTxns(2)), filterReal(monthTxns(3))].map(a => sumType(a,'expense'));
  const valid = m.filter(v=>v>0);
  return valid.length ? valid.reduce((s,v)=>s+v,0)/valid.length : sumType(filterReal(monthTxns(0)),'expense');
}

// Hasil selalu dihitung ULANG dari data asli setiap kali dipanggil — inilah "sinkron"-nya.
function computeLadderProgress(g) {
  const step = g.ladderStep;
  if (step === 1) {
    const savingsId = S.settings.wealthLadder?.savingsAccountId;
    const target = g.target || 10000000;
    if (!savingsId) {
      return { actual:0, target, pct:0, done:false, needsAccount:true,
        detail:'Belum ada akun tabungan yang terhubung. Nabung Cash dihitung dari saldo akun TABUNGAN Anda saja — bukan total semua akun (supaya uang buat transaksi harian tidak ikut kehitung sebagai tabungan).' };
    }
    const acc = S.accounts.find(a=>a.id===savingsId);
    if (!acc) return { actual:0, target, pct:0, done:false, needsAccount:true, detail:'Akun tabungan yang tersambung sudah tidak ada. Hubungkan ulang.' };
    const actual = accBal(savingsId);
    return { actual, target, pct: Math.min(Math.max(actual/target,0)*100,100), done: actual >= target,
      detail: `Saldo akun tabungan "${esc(acc.name)}" saat ini: ${fmt(actual)}. (Bukan total semua akun — supaya gajian yang lewat untuk transaksi harian tidak ikut kehitung sbg tabungan.)` };
  }
  if (step === 2) {
    const list = S.debts.filter(d => d.type==='hutang' && !d.isKPR);
    if (!list.length) return { actual:1, target:1, pct:100, done:true, detail:'Tidak ada catatan hutang kecil tercatat — dianggap bebas hutang kecil.' };
    const totalAmt = list.reduce((s,d)=>s+d.amount,0);
    const totalPaid = list.reduce((s,d)=>s+Math.min(d.paid||0,d.amount),0);
    const done = list.every(d => debtRemaining(d) <= 0);
    return { actual: totalPaid, target: totalAmt, pct: totalAmt>0?(totalPaid/totalAmt*100):100, done,
      detail: `Terbayar ${fmt(totalPaid)} dari ${fmt(totalAmt)} total hutang kecil (${list.filter(d=>debtRemaining(d)<=0).length}/${list.length} lunas).` };
  }
  if (step === 3) {
    const target = Math.round(avgMonthlyRealExpense() * 3);
    const actual = g.current || 0;
    return { actual, target: target||g.target||1, pct: target>0?Math.min(actual/target*100,100):0, done: target>0 && actual>=target,
      detail: `Target dihitung otomatis: 3× rata-rata pengeluaran riil bulanan Anda (${fmt(target)}). Tabungan darurat terkumpul: ${fmt(actual)}.` };
  }
  if (step === 4) {
    const cat = S.categories.find(c=>c.name==='Investasi' && c.type==='expense');
    if (!cat) return { actual:0, target:20, pct:0, done:false, needsCategory:true,
      detail:'Belum ada kategori pengeluaran "Investasi". Buat dulu supaya bisa dilacak otomatis dari transaksi Anda.' };
    const lm = filterReal(monthTxns(1));
    const invested = lm.filter(t=>t.categoryId===cat.id).reduce((s,t)=>s+t.amount,0);
    const income = sumType(lm,'income');
    const ratio = income>0 ? (invested/income*100) : 0;
    return { actual: Math.round(ratio*10)/10, target: 20, pct: Math.min(ratio/20*100,100), done: income>0 && ratio>=20,
      detail: income>0 ? `Bulan lalu Anda alokasikan ${fmt(invested)} untuk investasi dari ${fmt(income)} pendapatan riil (${ratio.toFixed(1)}%).` : 'Belum ada data pendapatan bulan lalu untuk dihitung rasionya.' };
  }
  if (step === 5) {
    const target = g.target || 0;
    const actual = g.current || 0;
    if (!target) return { actual, target:0, pct:0, done:false, needsTarget:true, detail:'Set dulu target dana pendidikan anak lewat tombol Edit pada tangga ini.' };
    return { actual, target, pct: Math.min(actual/target*100,100), done: actual>=target,
      detail: `Dana pendidikan anak terkumpul ${fmt(actual)} dari target ${fmt(target)}.` };
  }
  if (step === 6) {
    const kpr = S.debts.find(d => d.id === S.settings.wealthLadder?.kprDebtId);
    if (S.settings.wealthLadder?.hasKPR === false) return { actual:1, target:1, pct:100, done:true, detail:'Anda menandai tidak memiliki KPR — tangga ini otomatis terpenuhi.' };
    if (!kpr) return { actual:0, target:1, pct:0, done:false, needsKpr:true, detail:'Tandai salah satu Hutang Anda sebagai KPR di halaman Hutang & Piutang, atau tandai "Tidak punya KPR" di Pengaturan.' };
    const remaining = debtRemaining(kpr);
    const paid = Math.min(kpr.paid||0, kpr.amount);
    return { actual: paid, target: kpr.amount, pct: kpr.amount>0?(paid/kpr.amount*100):100, done: remaining<=0,
      detail: `KPR "${esc(kpr.person)}": terbayar ${fmt(paid)} dari ${fmt(kpr.amount)}.` };
  }
  // step 7 — puncak: tercapai kalau tangga 1-6 semua tercapai
  const prior = S.goals.filter(x => x.ladderStep >= 1 && x.ladderStep <= 6);
  const doneCount = prior.filter(x => computeLadderProgress(x).done).length;
  const done = prior.length>0 && doneCount === prior.length;
  return { actual: doneCount, target: prior.length||6, pct: prior.length?doneCount/prior.length*100:0, done,
    detail: done ? 'Selamat! Semua tangga fondasi sudah tercapai. Ini puncaknya — kekayaan abadi & berbagi.' : `${doneCount}/${prior.length} tangga fondasi sudah tercapai. Teruskan!` };
}

// Hitung progres nominal target dari data transaksi ASLI (bukan input manual) — inilah "sinkronnya"
// Digeneralisasi supaya bisa dipakai utk periode MANAPUN (bukan cuma "sekarang") — dipakai navigasi kalender Target Berkala.
function targetProgressForKey(t, pKey) {
  if (t.mode !== 'nominal') return null;
  const arr = filterReal(periodTxnsForKey(t.period, pKey));
  if (t.basis === 'kategori' && t.incomeCatId) {
    // mis. "Invest 20% dari income Ngojol" — persentase dihitung dari kategori SPESIFIK, bukan total
    const incomeAmt = arr.filter(x=>x.type==='income' && x.categoryId===t.incomeCatId).reduce((s,x)=>s+x.amount,0);
    const spentAmt  = t.expenseCatId ? arr.filter(x=>x.type==='expense' && x.categoryId===t.expenseCatId).reduce((s,x)=>s+x.amount,0) : 0;
    const ratio = incomeAmt>0 ? (spentAmt/incomeAmt*100) : 0;
    return { actual: Math.round(ratio*10)/10, target: t.amount, pct: t.amount>0?Math.min(ratio/t.amount*100,100):0, isPercent:true, incomeAmt, spentAmt };
  }
  const inc = sumType(arr,'income'), exp = sumType(arr,'expense');
  const actual = t.goalType === 'hemat' ? (inc - exp) : exp; // 'hemat'=net saving, 'batas'=total pengeluaran
  return { actual, target: t.amount, pct: t.amount>0 ? Math.min(Math.max(actual/t.amount,0)*100,100) : 0 };
}

// Navigasi kalender per-tab Target Berkala — setiap tab ingat tanggal/minggu/bulan/tahun yg sedang dilihat
let _targetHarianDate  = today();
let _targetMingguMonth = { y: new Date().getFullYear(), m: new Date().getMonth()+1 };
let _targetMingguKey   = weekStartOf(today());
let _targetBulanYear   = new Date().getFullYear();
let _targetBulanKey    = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`;
let _targetTahunYear   = new Date().getFullYear();

// ── Target Berkala mode 'jadwal': jadwal harian ala rencana pribadi, beda hari kerja/Sabtu/Minggu ──
function scheduleBlocksFor(t, variantKey) { return (t.schedules && t.schedules[variantKey]) || []; }
// Parse teks "05:00-07:00 Mandi, sholat, makan" (satu baris = satu blok waktu).
// STRICT: baris yang formatnya salah DILAPORKAN (bukan dibuang diam-diam seperti sebelumnya).
function parseScheduleStrict(text) {
  const blocks = [], bad = [];
  String(text || '').split('\n').map(l => l.trim()).filter(Boolean).forEach(line => {
    const m = line.match(/^(\d{1,2})[:.](\d{2})\s*[-–]\s*(\d{1,2})[:.](\d{2})\s*(.*)$/);
    const ok = m && +m[1] <= 24 && +m[3] <= 24 && +m[2] < 60 && +m[4] < 60;
    if (!ok) { bad.push(line); return; }
    blocks.push({ start: `${m[1].padStart(2,'0')}:${m[2]}`, end: `${m[3].padStart(2,'0')}:${m[4]}`, activity: (m[5].trim() || '(tanpa judul)').slice(0, 80) });
  });
  return { blocks, bad };
}
function scheduleToText(blocks) { return (blocks||[]).map(b=>`${b.start}-${b.end} ${b.activity}`).join('\n'); }
// Centang blok jadwal disimpan berdasarkan "jam mulai-selesai" (bukan nomor urut) supaya tidak bergeser kalau jadwal diedit.
// Data lama berupa angka (indeks) tetap terbaca.
function blockKey(b) { return `${b.start}-${b.end}`; }
function isBlockDone(doneList, b, i) { return doneList.includes(blockKey(b)) || doneList.includes(i); }

// ── Rekap berjenjang: harian → mingguan → bulanan → tahunan ──
function weeksInMonth(y, m) {
  const weeks = new Set();
  const first = new Date(y, m-1, 1), last = new Date(y, m, 0);
  for (let d = new Date(first); d <= last; d.setDate(d.getDate()+1)) weeks.add(weekStartOf(localDateStr(d)));
  return [...weeks];
}
function daysOfWeekKeys(weekStart) {
  const out = [];
  for (let i = 0; i < 7; i++) { const d = new Date(weekStart + 'T00:00:00'); d.setDate(d.getDate() + i); out.push(localDateStr(d)); }
  return out;
}
function periodTxnsForKey(period, key) {
  if (period === 'harian')   return dayTxns(key);
  if (period === 'mingguan') return txnsInWeek(key);
  if (period === 'bulanan')  { const [y,m] = key.split('-').map(Number); return txnsInMonth(y,m); }
  return txnsInYear(Number(key));
}
function periodStartStr(period, key) {
  if (period === 'bulanan') return key + '-01';
  if (period === 'tahunan') return key + '-01-01';
  return key;                                   // harian & mingguan: key = tanggal (Senin utk mingguan)
}
function periodEndStr(period, key) {
  if (period === 'mingguan') { const e = new Date(key + 'T00:00:00'); e.setDate(e.getDate() + 6); return localDateStr(e); }
  if (period === 'bulanan')  { const [y,m] = key.split('-').map(Number); return localDateStr(new Date(y, m, 0)); }
  if (period === 'tahunan')  return key + '-12-31';
  return key;
}
// 'future' = belum dimulai, 'current' = sedang berjalan, 'past' = sudah lewat
function periodState(period, key) {
  const t = today();
  if (periodStartStr(period, key) > t) return 'future';
  if (periodEndStr(period, key) < t) return 'past';
  return 'current';
}
// Cakupan target harian: semua hari / hari tertentu tiap minggu / satu tanggal saja
function targetAppliesToDate(t, dateStr) {
  if (t.specificDate) return t.specificDate === dateStr;
  if (t.daysOfWeek && t.daysOfWeek.length) return t.daysOfWeek.includes(new Date(dateStr + 'T00:00:00').getDay());
  return true;
}
// Apakah target ini "ikut dihitung" pada periode tsb (jadwal kosong di hari tertentu tidak dihitung)
function targetAppliesToKey(t, key) {
  if (t.period !== 'harian') return true;
  if (t.mode === 'jadwal') return scheduleBlocksForDate(t, key).length > 0;
  return targetAppliesToDate(t, key);
}
function jadwalProgress(t, dateStr) {
  const blocks = scheduleBlocksForDate(t, dateStr);
  const doneList = (t.completedBlocks && t.completedBlocks[dateStr]) || [];
  return { total: blocks.length, done: blocks.filter((b,i) => isBlockDone(doneList, b, i)).length };
}
// Evaluasi satu target pada satu periode — SELALU dihitung ulang dari transaksi riil/centang asli (bukan snapshot).
//  counts=false → tidak boleh dihitung "tercapai" (mis. batas pengeluaran tapi belum ada data sama sekali di periode itu)
function targetEvalForKey(t, key) {
  const state = periodState(t.period, key);
  const ev = { state, achieved: false, counts: true, hasData: true, p: null, blocksDone: 0, blocksTotal: 0 };
  if (t.mode === 'checklist') { ev.achieved = (t.completedPeriods || []).includes(key); return ev; }
  if (t.mode === 'jadwal') {
    const j = jadwalProgress(t, key);
    ev.blocksDone = j.done; ev.blocksTotal = j.total; ev.achieved = j.total > 0 && j.done === j.total;
    return ev;
  }
  const p = targetProgressForKey(t, key); ev.p = p;
  ev.hasData = filterReal(periodTxnsForKey(t.period, key)).length > 0;
  if (t.basis === 'kategori')           { ev.achieved = !!(p.incomeAmt > 0 && p.actual >= p.target); }
  else if (t.goalType === 'hemat')      { ev.achieved = p.actual >= p.target; }
  else                                  { ev.achieved = p.actual <= p.target; ev.counts = ev.hasData; }   // batas pengeluaran
  return ev;
}
// Rekap: berapa target tercapai dari yang seharusnya dihitung. Periode yang BELUM dimulai tidak ikut dihitung.
function recapFor(period, keys) {
  const list = S.targets.filter(t => t.period === period);
  if (!list.length) return null;
  let done = 0, total = 0;
  keys.forEach(k => {
    if (periodState(period, k) === 'future') return;
    list.forEach(t => {
      if (!targetAppliesToKey(t, k)) return;
      const ev = targetEvalForKey(t, k); total++;
      if (ev.achieved && ev.counts) done++;
    });
  });
  return total ? { done, total } : null;
}
function rekapHarianUntukMinggu(weekStart) { return recapFor('harian', daysOfWeekKeys(weekStart)); }
function rekapMingguanUntukBulan(y, m) { return recapFor('mingguan', weeksInMonth(y, m)); }
function rekapBulananUntukTahun(y) { return recapFor('bulanan', Array.from({length:12}, (_, i) => `${y}-${String(i+1).padStart(2,'0')}`)); }

function setSyncDot(state) {
  const d = document.getElementById('sync-dot');
  if (!d) return;
  d.className = 'sync-dot' + (state === 'syncing' ? ' syncing' : state === 'error' ? ' error' : '');
  d.title = state === 'syncing' ? 'Menyinkronkan…' : state === 'error' ? 'Gagal sinkron' : 'Tersinkron';
}

/* ─────────────────────────────────────────
   THEME
───────────────────────────────────────── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  S.settings.theme = t;
  const isDark = t === 'dark';
  ['auth-theme-icon','dash-theme-icon'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = isDark ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
  });
  destroyAllCharts();
  renderCharts();
}
window.getTheme = () => document.documentElement.getAttribute('data-theme') || 'dark';
window.toggleTheme = function() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  if (currentUser) saveSettings();
};
['auth-theme-toggle','dash-theme-toggle'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) btn.addEventListener('click', window.toggleTheme);
});
applyTheme(S.settings.theme);

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
window.toast = function(msg, type = 'success') {
  const c = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast toast-${type} fade-in`;
  const ic = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle' };
  el.innerHTML = `<i class="fa-solid ${ic[type]||ic.success}"></i><span>${esc(msg)}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.animation = 'tOut .25s ease forwards'; setTimeout(() => el.remove(), 250); }, 2800);
};

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */
window.openModal = function(h) { document.getElementById('modal-box').innerHTML = h; document.getElementById('modal-overlay').classList.add('show'); };
window.closeModal = function() { document.getElementById('modal-overlay').classList.remove('show'); };

window.confirmDel = function(msg, cb) {
  openModal(`<div class="confirm-box neu">
    <span class="ci"><i class="fa-solid fa-triangle-exclamation" style="color:var(--expense)"></i></span>
    <h4>Konfirmasi Hapus</h4>
    <p>${esc(msg)}</p>
    <div style="display:flex;gap:9px;justify-content:center">
      <button class="btn" onclick="closeModal()">Batal</button>
      <button class="btn btn-danger" id="cfm-yes">Ya, Hapus</button>
    </div>
  </div>`);
  document.getElementById('cfm-yes').onclick = () => { closeModal(); cb(); };
};

window.confirmAction = function(msg, cb, opts = {}) {
  const icon = opts.icon || 'fa-circle-question';
  const title = opts.title || 'Konfirmasi';
  const okLabel = opts.okLabel || 'Ya, Lanjutkan';
  openModal(`<div class="confirm-box neu">
    <span class="ci"><i class="fa-solid ${icon}" style="color:var(--acc)"></i></span>
    <h4>${esc(title)}</h4>
    <p>${esc(msg)}</p>
    <div style="display:flex;gap:9px;justify-content:center">
      <button class="btn" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="cfm-ok">${esc(okLabel)}</button>
    </div>
  </div>`);
  document.getElementById('cfm-ok').onclick = () => { closeModal(); cb(); };
};

/* ─────────────────────────────────────────
   PASSWORD TOGGLE
───────────────────────────────────────── */
window.togglePw = function(inputId, btn) {
  const inp = document.getElementById(inputId);
  const ic  = btn.querySelector('i');
  if (inp.type === 'password') { inp.type = 'text'; ic.className = 'fa-solid fa-eye-slash'; }
  else { inp.type = 'password'; ic.className = 'fa-solid fa-eye'; }
};

/* ─────────────────────────────────────────
   RIPPLE
───────────────────────────────────────── */
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  btn.classList.remove('rippling');
  void btn.offsetWidth;
  btn.classList.add('rippling');
  btn.addEventListener('animationend', () => btn.classList.remove('rippling'), { once: true });
});

/* ─────────────────────────────────────────
   3D CARD TILT
───────────────────────────────────────── */
let _cardTiltInit = false;
function initCardTilt() {
  if (_cardTiltInit) return;
  if (!window.matchMedia || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  _cardTiltInit = true;
  document.addEventListener('mousemove', e => {
    const card = e.target.closest && e.target.closest('.card, .ai-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.transform = `perspective(800px) rotateX(${(-py * 5).toFixed(2)}deg) rotateY(${(px * 5).toFixed(2)}deg) translateZ(2px)`;
  });
  document.addEventListener('mouseout', e => {
    const card = e.target.closest && e.target.closest('.card, .ai-card');
    if (!card) return;
    const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.card, .ai-card');
    if (to !== card) card.style.transform = '';
  });
}

/* ─────────────────────────────────────────
   COUNT-UP
───────────────────────────────────────── */
function countUp(id, endVal, formatFn, duration = 900) {
  const el = document.getElementById(id);
  if (!el) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = formatFn(endVal); return;
  }
  const t0 = performance.now();
  function tick(now) {
    const p = Math.min((now - t0) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = formatFn(endVal * eased);
    if (p < 1) requestAnimationFrame(tick);
    else { el.textContent = formatFn(endVal); el.classList.add('count-glow'); setTimeout(()=>el.classList.remove('count-glow'), 550); }
  }
  requestAnimationFrame(tick);
}

/* ─────────────────────────────────────────
   CONFETTI
───────────────────────────────────────── */
window.spawnConfetti = function(count = 70) {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#7B9EF8','#3DDBA0','#FFB830','#FF7068','#A78BFA','#FB923C'];
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const c = colors[i % colors.length];
    const left = Math.random() * 100;
    const dur = 2.2 + Math.random() * 1.6;
    const delay = Math.random() * 0.35;
    p.style.cssText = `left:${left}vw;background:${c};animation-duration:${dur}s;animation-delay:${delay}s;transform:rotate(${Math.round(Math.random()*360)}deg)`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), (dur + delay) * 1000 + 250);
  }
};

/* ─────────────────────────────────────────
   AUTH
───────────────────────────────────────── */
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.auth-form-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
  });
});

window.doLogin = async function() {
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-pw').value;
  if (!email || !pw) { toast('Harap isi email dan kata sandi', 'error'); return; }
  const btn = document.getElementById('btn-login');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (e) {
    btn.classList.remove('btn-loading'); btn.disabled = false;
    const msgs = {
      'auth/user-not-found': 'Email tidak terdaftar.',
      'auth/wrong-password': 'Kata sandi salah.',
      'auth/invalid-credential': 'Email atau kata sandi salah.',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Tunggu sebentar.',
      'auth/invalid-email': 'Format email tidak valid.'
    };
    toast(msgs[e.code] || 'Login gagal: ' + e.message, 'error');
  }
};

window.doRegister = async function() {
  const email = document.getElementById('reg-email').value.trim();
  const pw    = document.getElementById('reg-pw').value;
  if (!email || !pw) { toast('Harap isi email dan kata sandi', 'error'); return; }
  if (pw.length < 6) { toast('Kata sandi minimal 6 karakter', 'error'); return; }
  const btn = document.getElementById('btn-reg');
  btn.classList.add('btn-loading'); btn.disabled = true;
  try {
    await createUserWithEmailAndPassword(auth, email, pw);
    toast('Akun berhasil dibuat! Selamat datang 🎉', 'success');
  } catch (e) {
    btn.classList.remove('btn-loading'); btn.disabled = false;
    const msgs = {
      'auth/email-already-in-use': 'Email sudah digunakan.',
      'auth/invalid-email': 'Format email tidak valid.',
      'auth/weak-password': 'Kata sandi terlalu lemah.'
    };
    toast(msgs[e.code] || 'Registrasi gagal: ' + e.message, 'error');
  }
};

['login-email','login-pw'].forEach(id => document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') window.doLogin(); }));
['reg-email','reg-pw'].forEach(id => document.getElementById(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') window.doRegister(); }));

window.handleLogout = async function() {
  confirmAction(
    'Anda akan keluar dari akun ini. Semua data tetap aman tersimpan dan akan muncul kembali saat Anda masuk lagi.',
    async () => {
      _unsubscribers.forEach(u => u());
      _unsubscribers = [];
      await signOut(auth);
      toast('Berhasil keluar', 'info');
    },
    { icon: 'fa-right-from-bracket', title: 'Konfirmasi Keluar', okLabel: 'Ya, Keluar' }
  );
};

window.doGoogleLogin = async function(btn) {
  if (btn) { btn.disabled = true; btn.style.opacity = '.7'; }
  try {
    await signInWithPopup(auth, googleProvider);
    toast('Berhasil masuk dengan Google 🎉', 'success');
  } catch (e) {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
    const msgs = {
      'auth/popup-closed-by-user': 'Login Google dibatalkan.',
      'auth/popup-blocked': 'Popup diblokir browser. Izinkan popup dan coba lagi.',
      'auth/cancelled-popup-request': 'Login dibatalkan.',
    };
    toast(msgs[e.code] || 'Google login gagal: ' + e.message, 'error');
  }
};
// Ganti akun Google TANPA logout manual dulu — paksa Google munculkan pemilih akun.
window.switchGoogleAccount = async function() {
  try {
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, googleProvider);
    toast('Berhasil ganti akun 🎉', 'success');
  } catch (e) {
    const msgs = {
      'auth/popup-closed-by-user': 'Dibatalkan.',
      'auth/popup-blocked': 'Popup diblokir browser. Izinkan popup dan coba lagi.',
    };
    toast(msgs[e.code] || 'Gagal ganti akun: ' + e.message, 'error');
  }
};

/* ─────────────────────────────────────────
   AUTH STATE OBSERVER
───────────────────────────────────────── */
const LOAD_MIN_MS = 2600;
const _loadStartTs = performance.now();
function finishLoadingScreen() {
  const loading = document.getElementById('loading-screen');
  const elapsed = performance.now() - _loadStartTs;
  const wait = Math.max(0, LOAD_MIN_MS - elapsed);
  setTimeout(() => {
    if (window._finishLoading) window._finishLoading();
    loading.classList.add('fade-out');
    setTimeout(() => loading.style.display = 'none', 650);
  }, wait);
}

onAuthStateChanged(auth, async user => {
  if (user) {
    resetState();            // jangan pernah mewarisi data akun sebelumnya
    resetAuthForms();        // hapus password dari kolom input + pulihkan tombol
    currentUser = user;
    document.getElementById('loading-msg').textContent = 'Memuat data keuangan...';
    setSyncDot('syncing');

    const initial = user.email?.[0]?.toUpperCase() || 'U';
    document.getElementById('user-avatar-side').textContent = initial;
    document.getElementById('user-name-side').textContent   = user.displayName || user.email?.split('@')[0] || 'Pengguna';
    document.getElementById('user-email-side').textContent  = user.email || '';

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('sidebar').style.display = '';
    document.getElementById('main').style.display = '';

    await loadAllData();
    initCardTilt();

    finishLoadingScreen();
    setSyncDot('ok');
  } else {
    currentUser = null;
    resetState();
    resetAuthForms();        // tombol Masuk tidak boleh tetap 'loading' setelah logout
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('sidebar').style.display = 'none';
    document.getElementById('main').style.display = 'none';
    finishLoadingScreen();
  }
});

/* ─────────────────────────────────────────
   FIRESTORE DATA LAYER
───────────────────────────────────────── */
function col(name) { return collection(db, `users/${currentUser.uid}/${name}`); }

async function loadAllData() {
  if (_loadingData) return;
  _loadingData = true;
  try {
    const settSnap = await getDocs(col('settings'));
    settSnap.forEach(d => { if (!_settingsDocId) _settingsDocId = d.id; S.settings = { ...S.settings, ...d.data() }; });
    applyTheme(S.settings.theme || 'dark');

    const accSnap = await getDocs(col('accounts'));
    if (accSnap.size > 0) {
      S.accounts = accSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      for (const a of DEF_ACCS) {
        await addDoc(col('accounts'), { name:a.name, type:a.type, icon:a.icon, color:a.color });
      }
      const fresh = await getDocs(col('accounts'));
      S.accounts = fresh.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const catSnap = await getDocs(col('categories'));
    if (catSnap.size > 0) {
      S.categories = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else {
      for (const c of DEF_CATS) {
        await addDoc(col('categories'), { name:c.name, type:c.type, icon:c.icon, color:c.color });
      }
      const fresh = await getDocs(col('categories'));
      S.categories = fresh.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const txSnap = await getDocs(col('transactions'));
    S.transactions = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const budSnap = await getDocs(col('budgets'));
    S.budgets = budSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const goalSnap = await getDocs(col('goals'));
    S.goals = goalSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const debtSnap = await getDocs(col('debts'));
    S.debts = debtSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const targetSnap = await getDocs(col('targets'));
    S.targets = targetSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderNav();
    renderPage();
    checkBudgetAlerts();
  } catch (err) {
    toast('Gagal memuat data: ' + err.message, 'error');
    setSyncDot('error');
  } finally { _loadingData = false; }
}

async function saveSettings() {
  if (!currentUser) return;
  try {
    const id = _settingsDocId || 'main';
    // JSON round-trip membuang nilai undefined (Firestore menolaknya)
    await setDoc(doc(db, `users/${currentUser.uid}/settings/${id}`), JSON.parse(JSON.stringify(S.settings)));
    _settingsDocId = id;
  } catch(e) { toast('Pengaturan belum tersimpan ke cloud: ' + e.message, 'error'); }
}

async function fbAddTxn(data) {
  setSyncDot('syncing');
  try {
    const ref = await addDoc(col('transactions'), { ...data, createdAt: serverTimestamp() });
    S.transactions.push({ id: ref.id, ...data });
    setSyncDot('ok'); return ref.id;
  } catch(e) { setSyncDot('error'); throw e; }
}
async function fbUpdateTxn(id, data) {
  setSyncDot('syncing');
  try {
    await updateDoc(doc(db, `users/${currentUser.uid}/transactions/${id}`), data);
    const i = S.transactions.findIndex(t => t.id === id);
    if (i >= 0) S.transactions[i] = { ...S.transactions[i], ...data };
    setSyncDot('ok');
  } catch(e) { setSyncDot('error'); throw e; }
}
async function fbSaveAcc(data, editId) {
  setSyncDot('syncing');
  try {
    let id = editId;
    if (editId) {
      await updateDoc(doc(db, `users/${currentUser.uid}/accounts/${editId}`), data);
      const i = S.accounts.findIndex(a => a.id === editId);
      if (i >= 0) S.accounts[i] = { ...S.accounts[i], ...data };
    } else {
      const ref = await addDoc(col('accounts'), data);
      id = ref.id;
      S.accounts.push({ id: ref.id, ...data });
    }
    setSyncDot('ok');
    return id;
  } catch(e) { setSyncDot('error'); throw e; }
}
async function fbDelAcc(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/accounts/${id}`));
  S.accounts = S.accounts.filter(a => a.id !== id);
}

async function fbSaveCat(data, editId) {
  if (editId) {
    await updateDoc(doc(db, `users/${currentUser.uid}/categories/${editId}`), data);
    const i = S.categories.findIndex(c => c.id === editId);
    if (i >= 0) S.categories[i] = { ...S.categories[i], ...data };
    return editId;
  }
  const ref = await addDoc(col('categories'), data);
  S.categories.push({ id: ref.id, ...data });
  return ref.id;
}
async function fbDelCat(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/categories/${id}`));
  S.categories = S.categories.filter(c => c.id !== id);
}

async function fbSaveBud(data, editId) {
  if (editId) {
    await updateDoc(doc(db, `users/${currentUser.uid}/budgets/${editId}`), data);
    const i = S.budgets.findIndex(b => b.id === editId);
    if (i >= 0) S.budgets[i] = { ...S.budgets[i], ...data };
    return editId;
  }
  const ref = await addDoc(col('budgets'), data);
  S.budgets.push({ id: ref.id, ...data });
  return ref.id;
}
async function fbDelBud(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/budgets/${id}`));
  S.budgets = S.budgets.filter(b => b.id !== id);
}

async function fbSaveGoal(data, editId) {
  if (editId) {
    await updateDoc(doc(db, `users/${currentUser.uid}/goals/${editId}`), data);
    const i = S.goals.findIndex(g => g.id === editId);
    if (i >= 0) S.goals[i] = { ...S.goals[i], ...data };
    return editId;
  }
  const ref = await addDoc(col('goals'), data);
  S.goals.push({ id: ref.id, ...data });
  return ref.id;
}
async function fbDelGoal(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/goals/${id}`));
  S.goals = S.goals.filter(g => g.id !== id);
}

/* ── OPERASI ATOMIK ──
   Satu "paket" perubahan (transaksi + hutang/piutang) dikirim lewat writeBatch:
   semuanya berhasil atau semuanya batal — tidak ada lagi saldo & sisa hutang yang tidak sinkron
   gara-gara satu langkah gagal di tengah. State lokal baru diubah SETELAH cloud sukses. */
const newId = name => doc(col(name)).id;
const docPath = (name, id) => `users/${currentUser.uid}/${name}/${id}`;
async function commitPlan(plan) {
  setSyncDot('syncing');
  try {
    const batch = writeBatch(db), after = [];
    (plan.addDebts||[]).forEach(({id,data}) => { batch.set(doc(db, docPath('debts',id)), data); after.push(() => S.debts.push({ id, ...data })); });
    (plan.setDebts||[]).forEach(({id,data,local}) => { batch.update(doc(db, docPath('debts',id)), data); after.push(() => { const i = S.debts.findIndex(d=>d.id===id); if (i>=0) S.debts[i] = { ...S.debts[i], ...(local||data) }; }); });
    (plan.delDebts||[]).forEach(id => { batch.delete(doc(db, docPath('debts',id))); after.push(() => { S.debts = S.debts.filter(d=>d.id!==id); }); });
    (plan.addTxns||[]).forEach(({id,data}) => { batch.set(doc(db, docPath('transactions',id)), { ...data, createdAt: serverTimestamp() }); after.push(() => S.transactions.push({ id, ...data })); });
    (plan.setTxns||[]).forEach(({id,data}) => { batch.update(doc(db, docPath('transactions',id)), data); after.push(() => { const i = S.transactions.findIndex(t=>t.id===id); if (i>=0) S.transactions[i] = { ...S.transactions[i], ...data }; }); });
    (plan.delTxns||[]).forEach(id => { batch.delete(doc(db, docPath('transactions',id))); after.push(() => { S.transactions = S.transactions.filter(t=>t.id!==id); }); });
    await batch.commit();
    after.forEach(f => f());
    setSyncDot('ok');
  } catch(e) { setSyncDot('error'); throw e; }
}
// Peran sebuah transaksi terhadap catatan hutang/piutang:
//  'disburse' = pencairan awal (terima pinjaman / beri pinjaman)   → tidak mengubah sisa hutang
//  'payment'  = cicilan/pelunasan pokok                             → mengurangi sisa hutang
//  'interest' = bunga/denda (arus kas riil)                         → tidak mengubah sisa hutang
// Data lama (sebelum ada field debtRole) dikenali lewat flow + pola deskripsi.
function txnDebtRole(t) {
  if (!t || !t.debtId) return null;
  if (t.debtRole) return t.debtRole;
  if (t.flow === 'hutang') return /^(Menerima pinjaman dari|Memberi pinjaman ke) /.test(t.description || '') ? 'disburse' : 'payment';
  return 'interest';
}

/* ── HUTANG & PIUTANG ── */
async function fbSaveDebt(data, editId) {
  setSyncDot('syncing');
  try {
    if (editId) {
      await updateDoc(doc(db, `users/${currentUser.uid}/debts/${editId}`), data);
      const i = S.debts.findIndex(d => d.id === editId);
      if (i >= 0) S.debts[i] = { ...S.debts[i], ...data };
      setSyncDot('ok');
      return editId;
    } else {
      const ref = await addDoc(col('debts'), data);
      S.debts.push({ id: ref.id, ...data });
      setSyncDot('ok');
      return ref.id;
    }
  } catch(e) { setSyncDot('error'); throw e; }
}
async function fbDelDebt(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/debts/${id}`));
  S.debts = S.debts.filter(d => d.id !== id);
}

/* ── TARGET BERKALA ── */
async function fbSaveTarget(data, editId) {
  setSyncDot('syncing');
  try {
    let id = editId;
    if (editId) {
      await updateDoc(doc(db, `users/${currentUser.uid}/targets/${editId}`), data);
      const i = S.targets.findIndex(t => t.id === editId);
      if (i >= 0) S.targets[i] = { ...S.targets[i], ...data };
    } else {
      const ref = await addDoc(col('targets'), data);
      id = ref.id;
      S.targets.push({ id: ref.id, ...data });
    }
    setSyncDot('ok');
    return id;
  } catch(e) { setSyncDot('error'); throw e; }
}
async function fbDelTarget(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/targets/${id}`));
  S.targets = S.targets.filter(t => t.id !== id);
}

/* ─────────────────────────────────────────
   BUDGET ALERTS
───────────────────────────────────────── */
// Anggaran punya SATU periode "native" (harian/mingguan/bulanan/tahunan) — periode lain
// hanya dikonversi (perkiraan) dari sini, supaya semuanya connect ke satu sumber.
function budgetPeriod(b) { return b.period || 'bulanan'; }
function budgetNativeSpent(b) {
  const period = budgetPeriod(b);
  let arr;
  if (period === 'harian') arr = txnsOnDate(today());
  else if (period === 'mingguan') arr = txnsInWeek(weekStartOf(today()));
  else if (period === 'tahunan') arr = txnsInYear(new Date().getFullYear());
  else arr = monthTxns(0);
  return filterReal(arr).filter(t=>t.categoryId===b.categoryId && t.type==='expense').reduce((s,t)=>s+t.amount,0);
}
function checkBudgetAlerts() {
  const overBudget = S.budgets.filter(b => budgetNativeSpent(b) > b.amount);
  const overdueDebts = S.debts.filter(d => d.dueDate && d.dueDate <= today() && debtRemaining(d) > 0);
  const dot = document.getElementById('notif-dot');
  if (dot) dot.classList.toggle('hidden', overBudget.length === 0 && overdueDebts.length === 0);
}

document.getElementById('notif-btn').addEventListener('click', () => {
  const over = S.budgets.filter(b => budgetNativeSpent(b) > b.amount);
  const soonCutoff = (() => { const d=new Date(); d.setDate(d.getDate()+3); return localDateStr(d); })();
  const overdueDebts = S.debts.filter(d => d.dueDate && d.dueDate < today() && debtRemaining(d) > 0);
  const soonDebts = S.debts.filter(d => d.dueDate && d.dueDate >= today() && d.dueDate <= soonCutoff && debtRemaining(d) > 0);
  if (!over.length && !overdueDebts.length && !soonDebts.length) { toast('Semua anggaran & jatuh tempo masih aman', 'info'); return; }
  openModal(`
    <div class="modal-header"><h3><i class="fa-solid fa-bell" style="color:var(--expense);margin-right:8px"></i>Notifikasi</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      ${overdueDebts.length ? `<div style="font-size:11px;font-weight:800;color:var(--expense);letter-spacing:.4px;margin-bottom:8px">HUTANG/PIUTANG LEWAT JATUH TEMPO</div>
      ${overdueDebts.map(d=>`<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--expense-l);color:var(--expense);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0"><i class="fa-solid fa-hourglass-end"></i></div>
        <div style="flex:1"><div style="font-weight:600;font-size:12.5px">${esc(d.person)} (${d.type==='hutang'?'Hutang Saya':'Piutang Saya'})</div>
        <div style="font-size:11px;color:var(--expense)">Jatuh tempo ${new Date(d.dueDate+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'})} — ${fmt(debtRemaining(d))}</div></div>
      </div>`).join('')}` : ''}
      ${soonDebts.length ? `<div style="font-size:11px;font-weight:800;color:var(--gold);letter-spacing:.4px;margin:14px 0 8px">SEGERA JATUH TEMPO (3 HARI)</div>
      ${soonDebts.map(d=>`<div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)">
        <div style="width:34px;height:34px;border-radius:9px;background:var(--gold-l);color:var(--gold);display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0"><i class="fa-solid fa-clock"></i></div>
        <div style="flex:1"><div style="font-weight:600;font-size:12.5px">${esc(d.person)} (${d.type==='hutang'?'Hutang Saya':'Piutang Saya'})</div>
        <div style="font-size:11px;color:var(--gold)">Jatuh tempo ${new Date(d.dueDate+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'})} — ${fmt(debtRemaining(d))}</div></div>
      </div>`).join('')}` : ''}
      ${over.length ? `<div style="font-size:11px;font-weight:800;color:var(--expense);letter-spacing:.4px;margin:14px 0 8px">ANGGARAN MELEBIHI BATAS</div>
      ${over.map(b => {
        const c = catObj(b.categoryId);
        const spent = budgetNativeSpent(b);
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:38px;height:38px;border-radius:10px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0"><i class="fa-solid ${c.icon}"></i></div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(c.name)} <span style="font-weight:400;color:var(--txm);font-size:10.5px">(${PERIOD_LABEL[budgetPeriod(b)]})</span></div>
          <div style="font-size:11.5px;color:var(--expense)">Terpakai ${fmt(spent)} dari anggaran ${fmt(b.amount)}</div></div>
          <span class="badge" style="background:var(--expense-l);color:var(--expense)">+${fmt(spent-b.amount)} over</span>
        </div>`;
      }).join('')}` : ''}
    </div>
    <div class="modal-footer">
      ${(overdueDebts.length||soonDebts.length)?`<button class="btn" onclick="closeModal();nav('debts')">Kelola Hutang</button>`:''}
      ${over.length?`<button class="btn btn-primary" onclick="closeModal();nav('budgets')">Kelola Anggaran</button>`:''}
    </div>`);
});

/* ─────────────────────────────────────────
   SIDEBAR & NAV
───────────────────────────────────────── */
const NAV = [
  {id:'dashboard',icon:'fa-chart-line',label:'Dashboard'},
  {id:'calendar',icon:'fa-calendar-days',label:'Kalender'},
  {id:'transactions',icon:'fa-right-left',label:'Transaksi'},
  {id:'budgets',icon:'fa-wallet',label:'Anggaran'},
  {id:'debts',icon:'fa-hand-holding-dollar',label:'Hutang Piutang'},
  {id:'accounts',icon:'fa-building-columns',label:'Akun'},
  {id:'goals',icon:'fa-bullseye',label:'Impian & Tabungan'},
  {id:'targets',icon:'fa-list-check',label:'Target Berkala'},
  {id:'reports',icon:'fa-chart-pie',label:'Laporan'},
  {id:'aireport',icon:'fa-brain',label:'Laporan AI'},
  {id:'settings',icon:'fa-gear',label:'Pengaturan'}
];

function renderNav() {
  const overCount = S.budgets.filter(b => budgetNativeSpent(b) > b.amount).length;

  document.getElementById('nav-menu').innerHTML = NAV.map(n =>
    `<div class="nav-item${S.page===n.id?' active':''}" data-p="${n.id}">
      <i class="fa-solid ${n.icon}"></i>
      <span>${n.label}</span>
      ${n.id==='budgets'&&overCount>0?`<span class="nav-badge">${overCount}</span>`:''}
    </div>`
  ).join('');
  document.querySelectorAll('.nav-item').forEach(el => {
    el.onclick = () => { nav(el.dataset.p); if(window.innerWidth<=768) closeSidebar(); };
  });
}

window.nav = function(page) {
  S.page = page;
  document.getElementById('page-title').textContent = NAV.find(n=>n.id===page)?.label || '';
  renderNav();
  destroyAllCharts();
  renderPage();
};

window.toggleSidebar = function() {
  const sb = document.getElementById('sidebar'), ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.style.display = sb.classList.contains('open') ? 'block' : 'none';
};
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').style.display = 'none';
}
document.getElementById('sidebar-overlay').onclick = closeSidebar;

/* ─────────────────────────────────────────
   CHARTS
───────────────────────────────────────── */
function destroyAllCharts() {
  Object.keys(_charts).forEach(k => { if(_charts[k]) { try { _charts[k].destroy(); } catch(e){} delete _charts[k]; } });
}

function chartBaseOpts(extra = {}) {
  const dk = getTheme() === 'dark';
  const tc = dk ? '#8890B8' : '#5A6180';
  const gc = dk ? 'rgba(80,88,120,0.2)' : 'rgba(182,186,196,0.25)';
  return {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' },
    plugins: {
      legend: { labels: { color: tc, usePointStyle: true, pointStyle: 'circle', font: { size: 11, family: 'DM Sans' }, padding: 12, ...(extra.legendLabels||{}) }, ...(extra.legend||{}) },
      tooltip: {
        backgroundColor: dk ? '#22263A' : '#FFFFFF',
        titleColor: dk ? '#E8ECFF' : '#2C3149',
        bodyColor: dk ? '#8890B8' : '#5A6180',
        borderColor: dk ? 'rgba(80,88,120,0.5)' : 'rgba(182,186,196,0.5)',
        borderWidth: 1,
        padding: 10,
        callbacks: extra.tooltipCallbacks || {}
      }
    },
    scales: extra.noScales ? undefined : {
      x: { grid: { display: false }, ticks: { color: tc, font: { size: 10 } } },
      y: { grid: { color: gc, drawBorder: false }, ticks: { color: tc, font: { size: 10 }, callback: v => fmtS(v) }, beginAtZero: true, ...(extra.yScale||{}) }
    },
    ...(extra.chartExtra||{})
  };
}

function renderCharts() {
  requestAnimationFrame(() => {
    destroyAllCharts();
    if (typeof Chart === 'undefined') return;   // CDN Chart.js gagal dimuat: halaman tetap jalan tanpa grafik
    if (S.page === 'dashboard') renderDashCharts();
    if (S.page === 'reports')   renderReportCharts();
  });
}

/* ─────────────────────────────────────────
   RENDER PAGES
───────────────────────────────────────── */
function renderPage() {
  renderNav(); checkBudgetAlerts();
  const el = document.getElementById('page-content');
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
  destroyAllCharts();
  switch (S.page) {
    case 'dashboard':    rDash(el);    break;
    case 'calendar':     rCal(el);     break;
    case 'transactions': rTxn(el);     break;
    case 'budgets':      rBud(el);     break;
    case 'debts':        rDebt(el);    break;
    case 'accounts':     rAcc(el);     break;
    case 'goals':        rGoal(el);    break;
    case 'targets':      rTargets(el); break;
    case 'reports':      rRep(el);     break;
    case 'aireport':     rAIReport(el); break;
    case 'settings':     rSet(el);     break;
  }
  setTimeout(renderCharts, 80);
}

/* ─────────────────────────────────────────
   AI FINANCIAL ANALYSIS ENGINE (PRO)
───────────────────────────────────────── */
function computeAIAnalysis() {
  const tm = filterReal(monthTxns(0)), lm = filterReal(monthTxns(1)), lm2 = filterReal(monthTxns(2)), lm3 = filterReal(monthTxns(3));
  const inc = sumType(tm,'income'), exp = sumType(tm,'expense');
  const savingsRate = inc > 0 ? (inc-exp)/inc : (exp>0?-1:0);

  const histMonths = [lm, lm2, lm3].map(a => sumType(a,'expense'));
  const histAvg = histMonths.reduce((s,v)=>s+v,0) / (histMonths.filter(v=>v>0).length || 1);
  const histValid = histMonths.filter(v=>v>0);
  const histVariance = histValid.length ? histValid.reduce((s,v)=>s+Math.pow(v-histAvg,2),0)/histValid.length : 0;
  const histStd = Math.sqrt(histVariance);
  const volatilityRatio = histAvg > 0 ? histStd/histAvg : 0;

  const expThisMonth = tm.filter(t=>t.type==='expense');
  let budgetScorePct = 100, overBudgetCats = [];
  if (S.budgets.length) {
    let withinCount = 0;
    S.budgets.forEach(b => {
      const spent = budgetNativeSpent(b);
      if (spent <= b.amount) withinCount++;
      else overBudgetCats.push({ cat: catObj(b.categoryId), spent, limit: b.amount });
    });
    budgetScorePct = (withinCount/S.budgets.length)*100;
  }

  const catAvg3mo = {};
  [lm, lm2, lm3].forEach(arr => {
    arr.filter(t=>t.type==='expense').forEach(t => { catAvg3mo[t.categoryId] = (catAvg3mo[t.categoryId]||0) + t.amount; });
  });
  Object.keys(catAvg3mo).forEach(k => catAvg3mo[k] = catAvg3mo[k] / 3);
  const spikes = [];
  const catThisMonth = {};
  expThisMonth.forEach(t => { catThisMonth[t.categoryId] = (catThisMonth[t.categoryId]||0) + t.amount; });
  Object.keys(catThisMonth).forEach(cid => {
    const avg = catAvg3mo[cid] || 0;
    const cur = catThisMonth[cid];
    if (avg > 0 && cur > avg * 1.35 && (cur-avg) > 20000) {
      spikes.push({ cat: catObj(cid), avg, cur, pct: ((cur-avg)/avg)*100 });
    }
  });
  spikes.sort((a,b)=>b.pct-a.pct);

  // Dana cadangan = tabungan target biasa + tangga 3 (Dana Darurat). Tangga lain (mis. pendidikan anak) bukan dana darurat.
  const totalGoalSaved = S.goals.filter(g=>!g.ladderStep || g.ladderStep===3).reduce((s,g)=>s+(g.current||0),0);
  const emergencyTarget = histAvg * 3;
  const emergencyCoverage = emergencyTarget > 0 ? Math.min(totalGoalSaved/emergencyTarget,1) : (totalGoalSaved>0?1:0.5);

  // ── Kesadaran Hutang/Piutang (supaya SATU mesin AI ini konsisten dipakai
  //    di Dashboard maupun Laporan AI — tidak ada logika ganda) ──
  const hutang = totalHutang(), piutang = totalPiutang();
  const overdueDebts = S.debts.filter(d => d.dueDate && d.dueDate < today() && debtRemaining(d) > 0);
  // KPR (cicilan jangka panjang) dikecualikan dari rasio beban hutang — kalau tidak, pemilik KPR selalu kena penalti & peringatan palsu.
  const hutangKecil = S.debts.filter(d=>d.type==='hutang' && !d.isKPR).reduce((s,d)=>s+debtRemaining(d),0);
  const debtToIncomeRatio = inc > 0 ? hutangKecil/inc : (hutangKecil>0 ? 2 : 0);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysElapsed = now.getDate();
  const dailyBurn = daysElapsed > 0 ? exp/daysElapsed : 0;
  const projectedExp = dailyBurn * daysInMonth;
  const totalBudget = S.budgets.reduce((s,b)=>s+convertPeriodAmount(b.amount, budgetPeriod(b), 'bulanan'),0); // semua anggaran disetarakan ke per-bulan

  let score = 0;
  score += Math.max(0, Math.min(1, savingsRate/0.2)) * 35;
  score += (S.budgets.length ? budgetScorePct/100 : 0.7) * 30;
  score += Math.max(0, 1 - Math.min(volatilityRatio,1)) * 20;
  score += emergencyCoverage * 15;
  // Penalti hutang: keterlambatan bayar & beban hutang tinggi menurunkan skor kesehatan finansial riil
  let debtPenalty = 0;
  if (overdueDebts.length) debtPenalty += Math.min(overdueDebts.length * 8, 20);
  if (debtToIncomeRatio > 3) debtPenalty += 10; else if (debtToIncomeRatio > 1.5) debtPenalty += 5;
  score = Math.round(Math.max(0, Math.min(100, score - debtPenalty)));

  let grade, gradeColor;
  if (score>=90){grade='A+';gradeColor='var(--income)';}
  else if (score>=80){grade='A';gradeColor='var(--income)';}
  else if (score>=70){grade='B';gradeColor='var(--income)';}
  else if (score>=60){grade='C';gradeColor='var(--gold)';}
  else if (score>=45){grade='D';gradeColor='var(--gold)';}
  else {grade='E';gradeColor='var(--expense)';}

  const strengths = [], risks = [], tips = [];

  // Hutang/piutang — prioritas paling depan karena paling mendesak & paling nyata risikonya
  if (overdueDebts.length) {
    risks.unshift(`${overdueDebts.length} hutang/piutang sudah lewat jatuh tempo, total ${fmt(overdueDebts.reduce((s,d)=>s+debtRemaining(d),0))}. Ini aktif menurunkan skor kesehatan finansial Anda.`);
  }
  if (hutangKecil > 0 && debtToIncomeRatio > 1.5) {
    risks.unshift(`Sisa hutang non-KPR (${fmt(hutangKecil)}) cukup besar dibanding pendapatan bulan ini (${fmt(inc)}). Prioritaskan pelunasan sebelum menambah komitmen baru.`);
  } else if (S.debts.some(d=>d.type==='hutang') && hutang === 0) {
    strengths.push('Semua hutang Anda sudah lunas — bebas kewajiban.');
  }
  if (piutang > 0) {
    tips.push(`Anda memiliki piutang ${fmt(piutang)} yang belum tertagih. Tagih segera agar bisa dialokasikan ke tabungan/investasi.`);
  }

  if (savingsRate >= 0.2) strengths.push(`Tingkat tabungan sehat: ${(savingsRate*100).toFixed(1)}% dari pemasukan bulan ini berhasil disisihkan.`);
  else if (savingsRate < 0) risks.push(`Pengeluaran melebihi pemasukan bulan ini sebesar ${fmt(Math.abs(inc-exp))}. Arus kas negatif perlu segera dikoreksi.`);
  else if (savingsRate < 0.1) risks.push(`Tingkat tabungan rendah (${(savingsRate*100).toFixed(1)}%). Idealnya minimal 20% dari pemasukan disisihkan.`);

  if (overBudgetCats.length) {
    overBudgetCats.slice(0,3).forEach(o => risks.push(`Kategori "${esc(o.cat.name)}" melebihi anggaran sebesar ${fmt(o.spent-o.limit)}.`));
  } else if (S.budgets.length) {
    strengths.push(`Seluruh ${S.budgets.length} anggaran kategori masih terkendali bulan ini.`);
  } else {
    tips.push('Belum ada anggaran yang diatur. Buat anggaran per kategori agar AI dapat memantau risiko pengeluaran lebih akurat.');
  }

  if (spikes.length) {
    const s0 = spikes[0];
    risks.push(`Pengeluaran "${esc(s0.cat.name)}" naik ${s0.pct.toFixed(0)}% dibanding rata-rata 3 bulan terakhir (${fmt(s0.cur)} vs biasanya ${fmt(s0.avg)}).`);
  }

  if (volatilityRatio < 0.15 && histAvg>0) strengths.push('Pola pengeluaran bulanan stabil dan konsisten dalam 3 bulan terakhir.');
  else if (volatilityRatio > 0.4) tips.push('Pengeluaran bulanan cukup fluktuatif. Coba identifikasi pengeluaran tidak rutin agar arus kas lebih dapat diprediksi.');

  if (emergencyCoverage < 0.5 && histAvg>0) tips.push(`Dana darurat masih ${fmt(totalGoalSaved)} dari target ideal ${fmt(emergencyTarget)} (≈3x pengeluaran bulanan). Pertimbangkan menambah target tabungan.`);
  else if (emergencyCoverage >= 1) strengths.push('Dana cadangan sudah mencapai setara 3 bulan pengeluaran — bantalan darurat yang kuat.');

  if (totalBudget > 0 && projectedExp > totalBudget * 1.05 && daysElapsed >= 5) {
    risks.push(`Proyeksi pengeluaran akhir bulan (${fmt(projectedExp)}) diperkirakan melebihi total anggaran (${fmt(totalBudget)}) jika pola belanja saat ini berlanjut.`);
  }

  if (!strengths.length) strengths.push('Terus catat setiap transaksi agar AI dapat memberi analisis yang lebih tajam dari waktu ke waktu.');
  if (!tips.length) tips.push('Pertahankan kebiasaan mencatat transaksi secara rutin untuk menjaga kualitas analisis ini.');

  const summary = score>=80
    ? 'Kondisi keuangan Anda sangat baik. Pertahankan disiplin menabung dan pantau kategori dengan kenaikan mendadak.'
    : score>=60
    ? 'Kondisi keuangan Anda cukup baik namun ada ruang perbaikan, terutama pada konsistensi anggaran dan tabungan.'
    : 'Kondisi keuangan memerlukan perhatian. Fokus pada menekan pengeluaran yang melebihi anggaran dan menaikkan tingkat tabungan.';

  return {
    score, grade, gradeColor, summary,
    savingsRate, inc, exp, projectedExp, totalBudget,
    hutang, hutangKecil, piutang, overdueDebts, debtToIncomeRatio,
    strengths: strengths.slice(0,4), risks: risks.slice(0,4), tips: tips.slice(0,3)
  };
}

function renderAIAnalysis() {
  const wrap = document.getElementById('ai-analysis-wrap');
  if (!wrap) return;
  const a = computeAIAnalysis();
  const r = 50, circ = 2*Math.PI*r, off = circ - (a.score/100)*circ;
  wrap.innerHTML = `
  <div class="ai-card">
    <div class="ai-head">
      <span class="ai-badge"><i class="fa-solid fa-microchip"></i> AI ANALYSIS PRO</span>
      <span style="font-size:11px;color:var(--txm)">Diperbarui otomatis berdasarkan data terbaru Anda</span>
    </div>
    <div class="ai-score-wrap">
      <div class="ai-ring">
        <svg width="118" height="118">
          <circle cx="59" cy="59" r="${r}" fill="none" stroke="${getTheme()==='dark'?'rgba(80,88,120,0.3)':'rgba(182,186,196,0.35)'}" stroke-width="9"/>
          <circle cx="59" cy="59" r="${r}" fill="none" stroke="${a.gradeColor}" stroke-width="9" stroke-dasharray="${circ}" stroke-dashoffset="${off}" stroke-linecap="round"/>
        </svg>
        <div class="ai-ring-mid">
          <div class="ai-ring-grade" style="color:${a.gradeColor}">${a.grade}</div>
          <div class="ai-ring-score">${a.score}/100</div>
        </div>
      </div>
      <div class="ai-summary-text">${esc(a.summary)}</div>
    </div>
    <div class="ai-grid">
      <div class="ai-metric"><div class="aim-val" style="color:${a.savingsRate>=0?'var(--income)':'var(--expense)'}">${(a.savingsRate*100).toFixed(1)}%</div><div class="aim-lbl">Tingkat Tabungan</div></div>
      <div class="ai-metric"><div class="aim-val">${fmtS(a.projectedExp)}</div><div class="aim-lbl">Proyeksi Pengeluaran</div></div>
      <div class="ai-metric"><div class="aim-val">${a.totalBudget>0?Math.round((a.exp/a.totalBudget)*100)+'%':'—'}</div><div class="aim-lbl">Realisasi Anggaran</div></div>
    </div>
    ${a.strengths.length?`<div class="ai-section-title"><i class="fa-solid fa-circle-check" style="color:var(--income)"></i> KEKUATAN</div>${a.strengths.map(s=>`<div class="ai-insight strength"><i class="fa-solid fa-check"></i><span>${s}</span></div>`).join('')}`:''}
    ${a.risks.length?`<div class="ai-section-title"><i class="fa-solid fa-triangle-exclamation" style="color:var(--expense)"></i> RISIKO</div>${a.risks.map(s=>`<div class="ai-insight risk"><i class="fa-solid fa-exclamation"></i><span>${s}</span></div>`).join('')}`:''}
    ${a.tips.length?`<div class="ai-section-title"><i class="fa-solid fa-lightbulb" style="color:var(--gold)"></i> REKOMENDASI</div>${a.tips.map(s=>`<div class="ai-insight tip"><i class="fa-solid fa-arrow-right"></i><span>${s}</span></div>`).join('')}`:''}
  </div>`;
}

/* ═══════════════════════════════════════════
   LAPORAN AI — analisis penuh + rekap + saran prioritas
   Menyatukan SEMUA data yang sudah sinkron: transaksi riil (filterReal),
   hutang/piutang, anggaran, dan progres Tangga Kekayaan Abadi.
═══════════════════════════════════════════ */
function computeFullAIReport() {
  const base = computeAIAnalysis(); // skor, grade, strengths/risks/tips inti

  // ── Rekap periode (bulan berjalan) ──
  const tm = filterReal(monthTxns(0));
  const txCount = tm.length;
  const catTotals = {};
  tm.filter(t=>t.type==='expense').forEach(t => { const c=catObj(t.categoryId); catTotals[c.name]=(catTotals[c.name]||0)+t.amount; });
  const topCatEntries = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
  const topCat = topCatEntries[0] || null;

  const lastMonthNW = (() => {
    // Kekayaan bersih bulan lalu: estimasi dari saldo dikurangi transaksi bulan ini (kasar, tapi cukup utk tren)
    const thisMonthNet = sumType(tm,'income') - sumType(tm,'expense');
    return netWorth() - thisMonthNet;
  })();
  const nwChange = netWorth() - lastMonthNW;

  // ── Hutang/Piutang (pakai hasil dari mesin AI inti — satu sumber kebenaran) ──
  const hutang = base.hutang, piutang = base.piutang;
  const overdue = base.overdueDebts;

  // ── Tangga Kekayaan Abadi ──
  const ladderGoals = S.goals.filter(g=>g.ladderStep).sort((a,b)=>a.ladderStep-b.ladderStep);
  const ladderProgress = ladderGoals.map(g => ({ g, p: computeLadderProgress(g) }));
  const currentRung = ladderProgress.find(x => !x.p.done); // tangga pertama yang belum tercapai

  // ── Rekomendasi: tiap masalah dijabarkan MASALAH → BEBERAPA SOLUSI → SOLUSI TERBAIK ──
  const priorities = [];
  const overdueH = overdue.filter(d=>d.type==='hutang'), overdueP = overdue.filter(d=>d.type==='piutang');
  const totalOverdueAmt = overdueH.reduce((s,d)=>s+debtRemaining(d),0);
  if (overdueP.length) {
    priorities.push({ level:'high', icon:'fa-hand-holding-dollar',
      problem: `${overdueP.length} piutang sudah lewat jatuh tempo dan belum tertagih, total ${fmt(overdueP.reduce((s,d)=>s+debtRemaining(d),0))}.`,
      solutions: ['Hubungi peminjam hari ini dan sepakati tanggal pembayaran yang pasti.', 'Tawarkan cicilan agar sebagian uang segera kembali.', 'Catat penerimaan lewat tombol "Terima" supaya saldo & laporan langsung sinkron.'],
      bestSolution: 'Hubungi peminjam terlama dulu dan minta kepastian tanggal — lalu catat setiap pembayaran lewat tombol "Terima" di halaman Hutang & Piutang.'
    });
  }
  if (overdueH.length) {
    const canPayNow = totalBal() >= totalOverdueAmt;
    priorities.push({ level:'urgent', icon:'fa-triangle-exclamation',
      problem: `${overdueH.length} hutang sudah lewat jatuh tempo, total ${fmt(totalOverdueAmt)}.`,
      solutions: [
        `Lunasi sekarang dari saldo Anda saat ini (${fmt(totalBal())}) kalau mencukupi.`,
        'Hubungi pihak terkait untuk menyepakati tanggal bayar baru (restrukturisasi).',
        'Cicil sebagian dulu untuk menunjukkan iktikad baik, sisanya menyusul bertahap.'
      ],
      bestSolution: canPayNow
        ? `Lunasi sekarang — saldo Anda (${fmt(totalBal())}) masih mencukupi utk menutup ${fmt(totalOverdueAmt)} ini, daripada berlarut jadi masalah kepercayaan.`
        : 'Hubungi pihak terkait dulu untuk kesepakatan tanggal baru, sambil cicil semampunya — saldo saat ini belum cukup untuk melunasi sekaligus.'
    });
  }
  if (base.savingsRate < 0) {
    const deficit = Math.abs(base.inc - base.exp);
    priorities.push({ level:'urgent', icon:'fa-circle-exclamation',
      problem: `Pengeluaran riil (${fmt(base.exp)}) melebihi pendapatan (${fmt(base.inc)}) bulan ini — minus ${fmt(deficit)}.`,
      solutions: [
        topCat ? `Audit kategori pengeluaran terbesar Anda ("${esc(topCat[0])}", ${fmt(topCat[1])}) dan pangkas yang tidak esensial.` : 'Audit kategori pengeluaran terbesar dan pangkas yang tidak esensial.',
        'Cari tambahan pendapatan jangka pendek untuk menutup selisihnya.',
        'Tunda pembelian besar yang tidak mendesak sampai bulan depan.'
      ],
      bestSolution: topCat
        ? `Mulai dari kategori "${esc(topCat[0])}" — di situ potensi penghematan Anda paling besar (${fmt(topCat[1])} bulan ini).`
        : 'Tinjau seluruh transaksi bulan ini dan pangkas pengeluaran non-esensial dulu sebelum mencari pendapatan tambahan.'
    });
  }
  if (base.hutangKecil > 0 && base.hutangKecil > piutang) {
    const severe = base.debtToIncomeRatio > 1.5;
    priorities.push({ level:'high', icon:'fa-hand-holding-dollar',
      problem: `Sisa hutang non-KPR (${fmt(base.hutangKecil)}) lebih besar dari piutang (${fmt(piutang)}).`,
      solutions: [
        'Metode Avalanche: lunasi dulu hutang dengan bunga tertinggi — paling hemat secara total.',
        'Metode Snowball: lunasi dulu hutang terkecil biar cepat selesai & termotivasi.',
        'Tagih piutang yang sudah jatuh tempo untuk menyeimbangkan arus kas Anda.'
      ],
      bestSolution: severe
        ? 'Beban hutang Anda cukup besar dibanding pendapatan bulan ini — prioritaskan Avalanche (bunga tertinggi dulu) dan tunda dulu tabungan/investasi baru sampai beban turun.'
        : 'Beban hutang masih wajar — pilih Snowball (hutang terkecil dulu) kalau butuh motivasi cepat, sambil tetap menabung seperti biasa.'
    });
  }
  if (currentRung) {
    const stepSolutions = {
      needsAccount: ['Hubungkan akun tabungan yang sudah ada lewat Pengaturan.', 'Buat akun baru khusus tabungan dulu di halaman Akun, lalu hubungkan.', 'Lewati dulu tangga ini dan fokus ke tangga lain sambil menyiapkan akun tabungan.'],
      needsCategory: ['Buat kategori "Investasi" sekali klik lewat tombol di halaman Impian & Tabungan.', 'Catat manual transaksi investasi dengan kategori yang sudah ada dulu.', 'Tunggu sampai siap rutin berinvestasi baru buat kategorinya.'],
      needsKpr: ['Tandai salah satu Hutang yang sudah dicatat sebagai KPR.', 'Catat dulu KPR Anda di halaman Hutang & Piutang kalau belum ada.', 'Tandai "Tidak punya KPR" di Pengaturan kalau memang tidak relevan.'],
      needsTarget: ['Set target nominal Dana Pendidikan Anak lewat tombol Edit pada tangga ini.', 'Riset dulu estimasi biaya pendidikan yang realistis sebelum menentukan angka.', 'Mulai dengan angka perkiraan dulu, sesuaikan nanti setelah riset.'],
    };
    const needKey = ['needsAccount','needsCategory','needsKpr','needsTarget'].find(k=>currentRung.p[k]);
    priorities.push({ level:'medium', icon: currentRung.g.icon,
      problem: `Fokus Tangga Kekayaan Abadi Anda saat ini: "${esc(currentRung.g.name.replace(/^Tangga \d+: /,''))}" — ${currentRung.p.detail}`,
      solutions: needKey ? stepSolutions[needKey] : [`Tambah tabungan rutin ke tangga ini.`, `Cek progres berkala lewat tombol "Cek" di halaman Impian & Tabungan.`, `Sesuaikan target kalau dirasa kurang realistis.`],
      bestSolution: needKey ? stepSolutions[needKey][0] : 'Alokasikan sebagian pendapatan rutin ke tangga ini setiap kali gajian/dapat penghasilan, sekecil apapun — konsistensi lebih penting daripada besar nominal.'
    });
  }
  if (!priorities.length) {
    priorities.push({ level:'good', icon:'fa-thumbs-up',
      problem: 'Tidak ada isu mendesak yang terdeteksi dari data Anda saat ini.',
      solutions: ['Pertahankan kebiasaan mencatat transaksi secara rutin.', 'Tinjau ulang target & anggaran Anda tiap bulan.', 'Mulai pertimbangkan target finansial yang lebih ambisius.'],
      bestSolution: 'Pertahankan konsistensi mencatat transaksi — itu fondasi semua analisis di halaman ini tetap akurat.'
    });
  }

  return { ...base, txCount, topCat, nwChange, hutang, piutang, overdue, ladderProgress, currentRung, priorities };
}

function rAIReport(el) {
  const r = computeFullAIReport();
  const lvColor = { urgent:'var(--expense)', high:'#FB923C', medium:'var(--gold)', good:'var(--income)' };
  const lvBg    = { urgent:'var(--expense-l)', high:'rgba(251,146,60,0.12)', medium:'var(--gold-l)', good:'var(--income-l)' };

  el.innerHTML = `
  <div style="margin-bottom:18px">
    <h3 style="font-size:17px;font-weight:700"><i class="fa-solid fa-brain" style="color:var(--acc);margin-right:8px"></i>Laporan AI</h3>
    <p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Analisis menyeluruh & rekomendasi — disinkronkan dari transaksi riil, hutang/piutang, anggaran, dan Tangga Kekayaan Abadi</p>
  </div>

  <div class="card" style="margin-bottom:16px">
    <h4 style="font-size:13px;font-weight:800;letter-spacing:.4px;margin-bottom:14px;color:var(--tx2)">🎯 MASALAH, SOLUSI & REKOMENDASI</h4>
    ${r.priorities.map((p,idx) => `<div style="border-radius:12px;margin-bottom:${idx<r.priorities.length-1?'16px':'0'};overflow:hidden;border:1px solid var(--border)">
      <div style="display:flex;gap:11px;align-items:flex-start;padding:12px 14px;background:${lvBg[p.level]}">
        <i class="fa-solid ${p.icon}" style="color:${lvColor[p.level]};margin-top:2px;flex-shrink:0"></i>
        <div>
          <div style="font-size:10px;font-weight:800;letter-spacing:.5px;color:${lvColor[p.level]};text-transform:uppercase;margin-bottom:3px">${p.level==='good'?'STATUS':'MASALAH'}</div>
          <span style="font-size:12.5px;color:var(--tx);line-height:1.5;font-weight:600">${p.problem}</span>
        </div>
      </div>
      ${p.solutions && p.solutions.length ? `<div style="padding:12px 14px;background:var(--bg)">
        <div style="font-size:10px;font-weight:800;letter-spacing:.5px;color:var(--txm);text-transform:uppercase;margin-bottom:8px">Beberapa Solusi</div>
        ${p.solutions.map(s=>`<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:6px;font-size:12px;color:var(--tx2);line-height:1.5">
          <i class="fa-regular fa-circle" style="font-size:6px;margin-top:5px;flex-shrink:0;color:var(--txm)"></i><span>${s}</span>
        </div>`).join('')}
        ${p.bestSolution ? `<div style="display:flex;gap:9px;align-items:flex-start;margin-top:10px;padding:10px 12px;border-radius:9px;background:var(--income-l)">
          <i class="fa-solid fa-star" style="color:var(--income);margin-top:2px;flex-shrink:0"></i>
          <div><div style="font-size:10px;font-weight:800;letter-spacing:.4px;color:var(--income);text-transform:uppercase;margin-bottom:3px">Solusi Terbaik</div>
          <span style="font-size:12.5px;color:var(--tx);line-height:1.5">${p.bestSolution}</span></div>
        </div>` : ''}
      </div>` : ''}
    </div>`).join('')}
  </div>

  <div class="grid-4" style="margin-bottom:16px">
    <div class="card"><div class="stat-label">Transaksi Bulan Ini</div><div class="stat-value" style="font-size:20px">${r.txCount}</div></div>
    <div class="card"><div class="stat-label">Kategori Terbesar</div><div class="stat-value" style="font-size:16px;color:var(--expense)">${r.topCat?esc(r.topCat[0]):'—'}</div><span class="stat-change trend-neu">${r.topCat?fmt(r.topCat[1]):'Belum ada data'}</span></div>
    <div class="card"><div class="stat-label">Perubahan Kekayaan Bersih</div><div class="stat-value" style="font-size:18px;color:${r.nwChange>=0?'var(--income)':'var(--expense)'}">${r.nwChange>=0?'+':''}${fmt(r.nwChange)}</div><span class="stat-change trend-neu">vs awal bulan</span></div>
    <div class="card"><div class="stat-label">Hutang vs Piutang</div><div class="stat-value" style="font-size:16px"><span style="color:var(--expense)">${fmtS(r.hutang)}</span> / <span style="color:var(--income)">${fmtS(r.piutang)}</span></div></div>
  </div>

  <div id="ai-full-analysis-wrap" style="margin-bottom:16px"></div>

  ${r.ladderProgress.length ? `
  <div class="card" style="margin-bottom:16px">
    <h4 style="font-size:13px;font-weight:800;letter-spacing:.4px;margin-bottom:12px;color:var(--tx2)"><i class="fa-solid fa-crown" style="color:var(--gold);margin-right:5px"></i>PROGRES TANGGA KEKAYAAN ABADI</h4>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${r.ladderProgress.map(({g,p}) => `<div title="${esc(p.detail)}" style="flex:1;min-width:90px;text-align:center;padding:10px 6px;border-radius:10px;background:${p.done?'var(--income-l)':'var(--bg2)'};border:1px solid var(--border)">
        <div style="font-family:'Outfit';font-weight:800;font-size:15px;color:${p.done?'var(--income)':'var(--tx2)'}">${g.ladderStep}</div>
        <div style="font-size:9.5px;color:var(--txm);margin-top:2px">${p.pct.toFixed(0)}%</div>
      </div>`).join('')}
    </div>
  </div>` : `
  <div class="card" style="margin-bottom:16px;text-align:center">
    <i class="fa-solid fa-crown" style="color:var(--gold);font-size:22px;margin-bottom:8px;display:block"></i>
    <p style="font-size:12.5px;color:var(--tx2);margin-bottom:10px">Anda belum mengaktifkan Template Kekayaan Abadi.</p>
    <button class="btn btn-primary btn-sm" onclick="nav('settings')">Aktifkan di Pengaturan</button>
  </div>`}

  ${r.overdue.length ? `
  <div class="card">
    <h4 style="font-size:13px;font-weight:800;letter-spacing:.4px;margin-bottom:12px;color:var(--expense)"><i class="fa-solid fa-triangle-exclamation"></i> HUTANG/PIUTANG JATUH TEMPO</h4>
    ${r.overdue.map(d=>`<div style="display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border);font-size:12.5px">
      <span>${esc(d.person)} (${d.type==='hutang'?'Hutang Saya':'Piutang Saya'})</span>
      <b style="color:var(--expense)">${fmt(debtRemaining(d))}</b>
    </div>`).join('')}
    <button class="btn btn-sm" style="margin-top:10px" onclick="nav('debts')">Kelola Hutang & Piutang</button>
  </div>` : ''}
  `;

  // Reuse render AI Analysis Pro card (skor/grade/kekuatan/risiko) di dalam Laporan AI ini juga,
  // supaya SATU sumber kebenaran (tidak ada logika ganda yang bisa beda hasil).
  const wrap = document.getElementById('ai-full-analysis-wrap');
  if (wrap) { wrap.id = 'ai-analysis-wrap'; renderAIAnalysis(); }
}

// Preview kurs ringkas di Pengaturan — pakai cache/mekanisme yg sama dgn Dashboard (satu sumber kebenaran).
async function fillSettingsFxPreview() {
  const wrap = document.getElementById('settings-fx-preview'); if (!wrap) return;
  const homeIso = CUR_ISO[S.settings.currency || 'Rp'] || 'IDR';
  wrap.innerHTML = `<div style="font-size:11.5px;color:var(--txm)"><i class="fa-solid fa-spinner fa-spin"></i> Memuat kurs terkini…</div>`;
  const data = await fetchFxRates(homeIso);
  if (!document.getElementById('settings-fx-preview')) return;
  if (!data) { wrap.innerHTML = `<div style="font-size:11.5px;color:var(--txm)">Kurs belum bisa dimuat saat ini.</div>`; return; }
  const sample = FX_MAJORS.find(c=>c!==homeIso && data.rates[c]);
  if (!sample) { wrap.innerHTML = ''; return; }
  wrap.innerHTML = `<div style="font-size:12px;color:var(--tx2)">Contoh kurs saat ini: <b>1 ${sample} = ${fmt(data.rates[sample])}</b> <span style="color:var(--txm);font-size:10.5px">(per ${esc(data.date||'-')})</span></div>
    <div style="margin-top:4px"><a href="#" onclick="nav('dashboard');return false" style="color:var(--acc);font-size:11px">Lihat semua kurs di Dashboard →</a></div>`;
}

/* ── DASHBOARD ── */
// Widget kurs: basis = mata uang pilihan user di Pengaturan. Async & aman gagal (tidak merusak dashboard).
async function fillFxRatesWidget() {
  const wrap = document.getElementById('fx-rates-wrap'); if (!wrap) return;
  const homeIso = CUR_ISO[S.settings.currency || 'Rp'] || 'IDR';
  wrap.innerHTML = `<div class="card"><div style="text-align:center;padding:10px;color:var(--txm);font-size:12px"><i class="fa-solid fa-spinner fa-spin"></i> Memuat kurs mata uang…</div></div>`;
  const data = await fetchFxRates(homeIso);
  if (!document.getElementById('fx-rates-wrap')) return; // user sudah pindah halaman
  if (!data) {
    wrap.innerHTML = `<div class="card"><div style="text-align:center;padding:10px;color:var(--txm);font-size:12px"><i class="fa-solid fa-wifi"></i> Kurs belum bisa dimuat (offline / layanan sedang sibuk). <a href="#" onclick="fillFxRatesWidget();return false" style="color:var(--acc)">Coba lagi</a></div></div>`;
    return;
  }
  const majors = FX_MAJORS.filter(c => c !== homeIso && data.rates[c]);
  const fresh = (Date.now() - data.fetchedAt) < 6*3600*1000;
  wrap.innerHTML = `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:6px">
      <h4 style="font-size:14px"><i class="fa-solid fa-money-bill-transfer" style="color:var(--acc);margin-right:7px"></i>Kurs Mata Uang → ${homeIso}</h4>
      <span style="font-size:10.5px;color:var(--txm)">${fresh?'':'⚠ data tersimpan · '}Per ${esc(data.date||'-')} · <a href="#" onclick="nav('settings');return false" style="color:var(--acc)">Ubah negara/mata uang</a></span>
    </div>
    <div class="fx-grid">
      ${majors.map(c => `<div class="fx-item">
        <div class="fx-code">1 ${c}</div>
        <div class="fx-val">${fmt(data.rates[c])}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

window.openTargetsToday = function() { _targetTab = 'harian'; _targetHarianDate = today(); nav('targets'); };
function dashTargetsHtml() {
  const d0 = today();
  const items = S.targets.filter(t => t.period === 'harian' && targetAppliesToKey(t, d0));
  if (!items.length) return '';
  let doneN = 0;
  const rows = items.map(t => {
    const ev = targetEvalForKey(t, d0), ok = ev.achieved && ev.counts;
    if (ok) doneN++;
    let right;
    if (t.mode === 'jadwal') right = `${ev.blocksDone}/${ev.blocksTotal} blok`;
    else if (t.mode === 'nominal' && ev.p) right = ev.p.isPercent ? `${ev.p.actual}% / ${ev.p.target}%` : `${fmtS(ev.p.actual)} / ${fmtS(ev.p.target)}`;
    else right = ok ? 'Selesai' : 'Belum';
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <i class="fa-solid ${ok?'fa-circle-check':'fa-circle'}" style="color:${ok?'var(--income)':'var(--txm)'}"></i>
      <span style="flex:1;min-width:0;font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.title)}</span>
      <span style="font-size:11.5px;color:var(--tx2);white-space:nowrap">${right}</span>
    </div>`;
  }).join('');
  return `<div class="card" style="margin-bottom:20px;cursor:pointer" onclick="openTargetsToday()" title="Buka Target Berkala">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <h4 style="font-size:15px"><i class="fa-solid fa-list-check" style="color:var(--acc);margin-right:7px"></i>Target Hari Ini</h4>
      <span class="badge" style="background:${doneN===items.length?'var(--income-l)':'var(--gold-l)'};color:${doneN===items.length?'var(--income)':'var(--gold)'}">${doneN}/${items.length} tercapai</span>
    </div>${rows}</div>`;
}

/* ── DASHBOARD ── */
function rDash(el) {
  const tm = filterReal(monthTxns(0)), lm = filterReal(monthTxns(1));
  const inc = sumType(tm,'income'), exp = sumType(tm,'expense');
  const li  = sumType(lm,'income'), le  = sumType(lm,'expense');
  const sav = inc - exp;
  const sr  = inc > 0 ? ((sav/inc)*100).toFixed(1) : 0;
  const bal = totalBal();
  const hutang = totalHutang(), piutang = totalPiutang(), nw = netWorth();

  const recent = [...S.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 7);

  el.innerHTML = `
  <div class="grid-4" style="margin-bottom:14px">
    <div class="card">
      <div class="stat-icon" style="background:var(--acc-l);color:var(--acc)"><i class="fa-solid fa-vault"></i></div>
      <div class="stat-label" style="margin-top:10px">Total Saldo</div>
      <div class="stat-value" id="stat-bal" style="color:${bal>=0?'var(--income)':'var(--expense)'}">${fmt(0)}</div>
      <span class="stat-change trend-neu">Seluruh waktu</span>
    </div>
    <div class="card">
      <div class="stat-icon" style="background:var(--income-l);color:var(--income)"><i class="fa-solid fa-arrow-trend-up"></i></div>
      <div class="stat-label" style="margin-top:10px">Pemasukan Bulan Ini</div>
      <div class="stat-value" id="stat-inc" style="color:var(--income)">${fmt(0)}</div>
      <span class="stat-change ${inc>=li?'trend-up':'trend-down'}"><i class="fa-solid fa-arrow-${inc>=li?'up':'down'}"></i> ${li>0?Math.abs(((inc-li)/li)*100).toFixed(1):'0'}%</span>
    </div>
    <div class="card">
      <div class="stat-icon" style="background:var(--expense-l);color:var(--expense)"><i class="fa-solid fa-arrow-trend-down"></i></div>
      <div class="stat-label" style="margin-top:10px">Pengeluaran Bulan Ini</div>
      <div class="stat-value" id="stat-exp" style="color:var(--expense)">${fmt(0)}</div>
      <span class="stat-change ${exp<=le?'trend-up':'trend-down'}"><i class="fa-solid fa-arrow-${exp<=le?'down':'up'}"></i> ${le>0?Math.abs(((exp-le)/le)*100).toFixed(1):'0'}%</span>
    </div>
    <div class="card">
      <div class="stat-icon" style="background:var(--gold-l);color:var(--gold)"><i class="fa-solid fa-piggy-bank"></i></div>
      <div class="stat-label" style="margin-top:10px">Tingkat Tabungan</div>
      <div class="stat-value" id="stat-sr" style="color:var(--gold)">0%</div>
      <span class="stat-change" style="background:var(--gold-l);color:var(--gold)">${fmt(Math.max(0,sav))} disimpan</span>
    </div>
  </div>

  <div class="card" style="margin-bottom:20px;cursor:pointer" onclick="nav('debts')" title="Lihat detail Hutang & Piutang">
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="stat-icon" style="background:${nw>=0?'var(--income-l)':'var(--expense-l)'};color:${nw>=0?'var(--income)':'var(--expense)'}"><i class="fa-solid fa-scale-balanced"></i></div>
        <div>
          <div style="font-size:12px;color:var(--tx2);font-weight:600">Kekayaan Bersih <span style="color:var(--txm);font-weight:400">(Saldo + Piutang − Hutang)</span></div>
          <div style="font-family:'Outfit';font-size:20px;font-weight:800;color:${nw>=0?'var(--income)':'var(--expense)'}">${fmt(nw)}</div>
        </div>
      </div>
      <div style="display:flex;gap:18px;flex-wrap:wrap">
        <div><div style="font-size:10.5px;color:var(--txm);font-weight:700;text-transform:uppercase">Piutang</div><div style="font-weight:700;color:var(--income)">${fmt(piutang)}</div></div>
        <div><div style="font-size:10.5px;color:var(--txm);font-weight:700;text-transform:uppercase">Hutang</div><div style="font-weight:700;color:var(--expense)">${fmt(hutang)}</div></div>
      </div>
    </div>
  </div>

  <div id="ai-analysis-wrap" style="margin-bottom:20px"></div>
  <div id="fx-rates-wrap" style="margin-bottom:20px"></div>
  ${dashTargetsHtml()}

  <div class="grid-2-1" style="margin-bottom:20px">
    <div class="card"><h4 style="font-size:15px;margin-bottom:14px">Pemasukan vs Pengeluaran (6 Bulan)</h4><div class="chart-wrap" style="height:230px"><canvas id="ch-bar"></canvas></div></div>
    <div class="card"><h4 style="font-size:15px;margin-bottom:14px">Pengeluaran per Kategori</h4><div class="chart-wrap" style="height:230px"><canvas id="ch-donut"></canvas></div></div>
  </div>

  <div class="grid-2">
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h4 style="font-size:15px">Transaksi Terbaru</h4>
        <button class="btn btn-sm" onclick="nav('transactions')" style="font-size:11.5px">Lihat Semua</button>
      </div>
      <div id="dash-recent"></div>
    </div>
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <h4 style="font-size:15px">Akun Saya</h4>
        <button class="btn btn-sm" onclick="nav('accounts')" style="font-size:11.5px">Kelola</button>
      </div>
      <div id="dash-accs"></div>
    </div>
  </div>`;

  renderAIAnalysis();
  fillFxRatesWidget(); // async, tidak memblokir render dashboard
  countUp('stat-bal', bal, v => fmt(v));
  countUp('stat-inc', inc, v => fmt(v));
  countUp('stat-exp', exp, v => fmt(v));
  countUp('stat-sr', Number(sr), v => v.toFixed(1) + '%');

  const recentEl = document.getElementById('dash-recent');
  recentEl.innerHTML = recent.length ? recent.map((t, i) => {
    const c = catObj(t.categoryId);
    return `<div class="txn-row-enter" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);animation-delay:${i*.04}s">
      <div style="width:36px;height:36px;border-radius:10px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${c.icon}"></i></div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.description)}</div><div style="font-size:10.5px;color:var(--txm)">${fmtDate(t.date,{day:'numeric',month:'short'})} · ${esc(accObj(t.accountId).name)}</div></div>
      <div style="font-size:12.5px;font-weight:700;color:${t.type==='income'?'var(--income)':'var(--expense)'};white-space:nowrap">${t.type==='income'?'+':'−'}${fmt(t.amount)}</div>
    </div>`;
  }).join('') : '<div class="empty-state"><i class="fa-solid fa-receipt"></i><p>Belum ada transaksi</p></div>';

  document.getElementById('dash-accs').innerHTML = S.accounts.map(a => {
    const b = accBal(a.id);
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:38px;height:38px;border-radius:11px;background:${a.color}18;color:${a.color};display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${a.icon}"></i></div>
      <div style="flex:1"><div style="font-size:12.5px;font-weight:600">${esc(a.name)}</div><div style="font-size:10.5px;color:var(--txm)">${a.type==='cash'?'Tunai':a.type==='bank'?'Bank':'E-Wallet'}</div></div>
      <div style="font-size:13px;font-weight:700;color:${b>=0?'var(--income)':'var(--expense)'}">${fmt(b)}</div>
    </div>`;
  }).join('');
}

function renderDashCharts() {
  const bc = document.getElementById('ch-bar');
  if (bc) {
    const labels=[], incD=[], expD=[];
    for (let i=5;i>=0;i--) {
      const n0=new Date(), d=new Date(n0.getFullYear(), n0.getMonth()-i, 1);
      labels.push(MO[d.getMonth()]);
      const tx=filterReal(monthTxns(i));
      incD.push(sumType(tx,'income')); expD.push(sumType(tx,'expense'));
    }
    _charts.bar = new Chart(bc, {
      type:'bar',
      data:{ labels, datasets:[
        {label:'Pemasukan',data:incD,backgroundColor:'rgba(61,219,160,.6)',borderColor:cssVar('--income'),borderWidth:1,borderRadius:6,barPercentage:.42},
        {label:'Pengeluaran',data:expD,backgroundColor:'rgba(255,112,104,.6)',borderColor:cssVar('--expense'),borderWidth:1,borderRadius:6,barPercentage:.42}
      ]},
      options: chartBaseOpts({ tooltipCallbacks:{ label: ctx => ctx.dataset.label + ': ' + fmt(ctx.raw) } })
    });
  }

  const dc = document.getElementById('ch-donut');
  if (dc) {
    const tx = filterReal(monthTxns(0)).filter(t=>t.type==='expense');
    const cm = {}; tx.forEach(t => { const c=catObj(t.categoryId); cm[c.name]=(cm[c.name]||0)+t.amount; });
    const lbs=Object.keys(cm), vals=Object.values(cm);
    if (lbs.length) {
      _charts.donut = new Chart(dc, {
        type:'doughnut',
        data:{ labels:lbs, datasets:[{data:vals,backgroundColor:CHART_COLORS.slice(0,lbs.length),borderWidth:0,hoverOffset:8}] },
        options: chartBaseOpts({ noScales:true, legend:{ position:'bottom' }, tooltipCallbacks:{ label: ctx => ctx.label+': '+fmt(ctx.raw) }, chartExtra:{ cutout:'68%' } })
      });
    } else {
      dc.parentElement.innerHTML = '<div class="empty-state" style="padding:20px"><i class="fa-solid fa-chart-pie" style="font-size:30px"></i><p style="font-size:12px">Belum ada pengeluaran</p></div>';
    }
  }
}

/* ── CALENDAR ── */
let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth();

function rCal(el) {
  const todayStr = today();
  const y = _calYear, m = _calMonth;
  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrev  = new Date(y, m, 0).getDate();

  const txnsByDate = {};
  S.transactions.forEach(t => {
    if (!txnsByDate[t.date]) txnsByDate[t.date] = [];
    txnsByDate[t.date].push(t);
  });
  // Jatuh tempo hutang/piutang yang masih berjalan — disinkronkan ke tampilan kalender
  const debtsByDue = {};
  S.debts.forEach(d => { if (d.dueDate && debtRemaining(d) > 0) { (debtsByDue[d.dueDate] = debtsByDue[d.dueDate]||[]).push(d); } });

  const monthTx  = filterReal(S.transactions.filter(t => t.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)));
  const monthInc = sumType(monthTx,'income');
  const monthExp = sumType(monthTx,'expense');
  const monthNet = monthInc - monthExp;
  const txnCount = (S.transactions.filter(t => t.date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`))).length;

  const DOW = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];

  let cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push({ day: daysInPrev - firstDay + 1 + i, type: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const txns = txnsByDate[dateStr] || [];
    const realTxns = filterReal(txns);
    const inc  = sumType(realTxns,'income');
    const exp  = sumType(realTxns,'expense');
    const hasDebtFlow = txns.some(t => !isRealFlow(t));
    const dueDebts = debtsByDue[dateStr] || [];
    cells.push({ day: d, type: 'current', dateStr, txns, inc, exp, hasDebtFlow, dueDebts });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, type: 'next' });

  el.innerHTML = `
  <div class="cal-summary">
    <div class="cal-sum-card">
      <div class="cal-sum-icon" style="background:var(--income-l);color:var(--income)">
        <i class="fa-solid fa-arrow-down"></i>
      </div>
      <div>
        <div class="cal-sum-label">Pemasukan</div>
        <div class="cal-sum-value" style="color:var(--income)">${fmt(monthInc)}</div>
      </div>
    </div>
    <div class="cal-sum-card">
      <div class="cal-sum-icon" style="background:var(--expense-l);color:var(--expense)">
        <i class="fa-solid fa-arrow-up"></i>
      </div>
      <div>
        <div class="cal-sum-label">Pengeluaran</div>
        <div class="cal-sum-value" style="color:var(--expense)">${fmt(monthExp)}</div>
      </div>
    </div>
    <div class="cal-sum-card">
      <div class="cal-sum-icon" style="background:${monthNet>=0?'var(--income-l)':'var(--expense-l)'};color:${monthNet>=0?'var(--income)':'var(--expense)'}">
        <i class="fa-solid fa-scale-balanced"></i>
      </div>
      <div>
        <div class="cal-sum-label">Saldo Net</div>
        <div class="cal-sum-value" style="color:${monthNet>=0?'var(--income)':'var(--expense)'}">
          ${monthNet>=0?'+':''}${fmt(monthNet)}
        </div>
      </div>
    </div>
  </div>

  <div class="cal-nav">
    <button class="btn-icon" onclick="calPrev()" title="Bulan sebelumnya">
      <i class="fa-solid fa-chevron-left"></i>
    </button>
    <div class="cal-month-title">
      ${MO_FULL[m]} ${y}
      <small>${txnCount} transaksi</small>
    </div>
    <button class="btn-icon" onclick="calNext()" title="Bulan berikutnya">
      <i class="fa-solid fa-chevron-right"></i>
    </button>
  </div>

  <div class="cal-grid" style="margin-bottom:6px">
    ${DOW.map(d=>`<div class="cal-day-header">${d}</div>`).join('')}
  </div>

  <div class="cal-grid" id="cal-cells">
    ${cells.map(c => {
      if (c.type !== 'current') {
        return `<div class="cal-cell other-month"><div class="cal-date"><span>${c.day}</span></div></div>`;
      }
      const isToday = c.dateStr === todayStr;
      const hasTxn  = c.txns.length > 0;
      const hasInc  = c.inc > 0;
      const hasExp  = c.exp > 0;
      return `<div class="cal-cell${isToday?' today':''}${hasTxn?' has-txn':''}" onclick="calDayClick('${c.dateStr}')">
        ${hasTxn ? `<div class="cal-txn-count">${c.txns.length}</div>` : ''}
        <div class="cal-date">
          ${isToday
            ? `<div class="cal-today-badge">${c.day}</div>`
            : `<span>${c.day}</span>`
          }
        </div>
        ${hasInc ? `<div class="cal-income-pill"><i class="fa-solid fa-plus" style="font-size:7px"></i>${fmtS(c.inc)}</div>` : ''}
        ${hasExp ? `<div class="cal-expense-pill"><i class="fa-solid fa-minus" style="font-size:7px"></i>${fmtS(c.exp)}</div>` : ''}
        ${hasTxn && !hasInc && !hasExp ? `<div style="width:5px;height:5px;border-radius:50%;background:var(--acc);margin:4px auto 0;box-shadow:0 0 4px var(--acc)"></div>` : ''}
        ${c.hasDebtFlow ? `<div title="Ada arus kas Hutang/Piutang/Transfer di hari ini" style="width:5px;height:5px;border-radius:50%;background:#8A90A8;margin:3px auto 0"></div>` : ''}
        ${c.dueDebts && c.dueDebts.length ? `<div class="badge" title="Jatuh tempo: ${c.dueDebts.map(d=>esc(d.person)).join(', ')}" style="background:var(--expense-l);color:var(--expense);font-size:8px;padding:1px 5px;margin-top:2px"><i class="fa-solid fa-hourglass-end" style="font-size:7px"></i> ${c.dueDebts.length>1?c.dueDebts.length+'x tempo':'Tempo'}</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

window.calPrev = function() {
  _calMonth--;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  nav('calendar');
};
window.calNext = function() {
  _calMonth++;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  nav('calendar');
};

window.calDayClick = function(dateStr) {
  const txns = S.transactions.filter(t => t.date === dateStr).sort((a,b) => {
    if (a.type !== b.type) return a.type === 'income' ? -1 : 1;
    return b.amount - a.amount;
  });
  const d     = new Date(dateStr + 'T00:00:00');
  const label = d.toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  const realTxns = filterReal(txns);
  const inc   = sumType(realTxns,'income');
  const exp   = sumType(realTxns,'expense');
  const net   = inc - exp;
  const flowCount = txns.length - realTxns.length;
  const flowNote = flowCount ? `<div style="font-size:11px;color:var(--txm);margin-bottom:12px"><i class="fa-solid fa-hand-holding-dollar"></i> ${flowCount} transaksi arus kas Hutang/Piutang/Transfer tidak ikut dihitung di ringkasan ini (tetap memengaruhi saldo akun).</div>` : '';
  const dueDebts = S.debts.filter(dt => dt.dueDate === dateStr && debtRemaining(dt) > 0);
  const dueNotice = dueDebts.length ? `
    <div style="padding:12px;border-radius:10px;background:var(--expense-l);margin-bottom:16px">
      <div style="font-weight:700;font-size:12.5px;color:var(--expense);margin-bottom:6px"><i class="fa-solid fa-hourglass-end"></i> Jatuh Tempo Hari Ini</div>
      ${dueDebts.map(dt=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;font-size:12px">
        <span>${esc(dt.person)} (${dt.type==='hutang'?'Hutang Saya':'Piutang Saya'})</span>
        <button class="btn btn-sm btn-primary" style="padding:4px 10px" onclick="openPayDebtModal('${dt.id}')">${dt.type==='hutang'?'Bayar':'Terima'} ${fmt(debtRemaining(dt))}</button>
      </div>`).join('')}
    </div>` : '';

  if (!txns.length) {
    openModal(`
      <div class="modal-header">
        <div>
          <h3 style="font-size:15px">${label}</h3>
          <div style="font-size:11.5px;color:var(--txm);margin-top:2px">Tidak ada transaksi</div>
        </div>
        <button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="modal-body">
        ${dueNotice}
        <div class="empty-state" style="padding:24px 0">
          <i class="fa-solid fa-calendar-xmark" style="font-size:36px;opacity:.3"></i>
          <p style="font-size:13px;margin-top:10px;color:var(--txm)">Tidak ada transaksi pada tanggal ini</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Tutup</button>
        <button class="btn btn-primary" onclick="closeModal();openTxnModal(null,'${dateStr}')">
          <i class="fa-solid fa-plus"></i> Tambah Transaksi
        </button>
      </div>`);
    return;
  }

  const incTxns = txns.filter(t=>t.type==='income');
  const expTxns = txns.filter(t=>t.type==='expense');

  const txnRow = t => {
    const c = catObj(t.categoryId), a = accObj(t.accountId);
    const isDebtFlow = t.flow === 'hutang';
    return `<div style="display:flex;align-items:center;gap:11px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:38px;height:38px;border-radius:11px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;box-shadow:var(--neu-pressed-sm)">
        <i class="fa-solid ${c.icon}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:600;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.description)}</div>
        <div style="font-size:11px;color:var(--txm);margin-top:2px;display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span class="badge" style="background:${c.color}18;color:${c.color};font-size:9.5px"><i class="fa-solid ${c.icon}" style="font-size:8px"></i> ${esc(c.name)}</span>
          <span style="font-size:10px"><i class="fa-solid ${a.icon}" style="color:${a.color}"></i> ${esc(a.name)}</span>
          ${isDebtFlow?`<span class="badge" style="background:#8A90A818;color:#8A90A8;font-size:9px" title="Arus kas hutang/piutang — tidak dihitung sebagai pendapatan/pengeluaran"><i class="fa-solid fa-hand-holding-dollar" style="font-size:8px"></i> Hutang/Piutang</span>`:''}
        </div>
        ${t.note?`<div style="font-size:10.5px;color:var(--txm);margin-top:2px;font-style:italic">"${esc(t.note)}"</div>`:''}
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:13.5px;font-weight:800;color:${t.type==='income'?'var(--income)':'var(--expense)'}">
          ${t.type==='income'?'+':'−'}${fmt(t.amount)}
        </div>
        <div style="display:flex;gap:4px;margin-top:5px;justify-content:flex-end">
          <button class="btn-icon" style="width:24px;height:24px" onclick="closeModal();openTxnModal('${t.id}')"><i class="fa-solid fa-pen" style="font-size:8px"></i></button>
          <button class="btn-icon" style="width:24px;height:24px;color:var(--expense)" onclick="closeModal();delTxn('${t.id}')"><i class="fa-solid fa-trash" style="font-size:8px"></i></button>
        </div>
      </div>
    </div>`;
  };

  openModal(`
    <div class="modal-header">
      <div>
        <h3 style="font-size:15px">${label}</h3>
        <div style="font-size:11.5px;color:var(--txm);margin-top:2px">${txns.length} transaksi</div>
      </div>
      <button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="modal-body">

      ${dueNotice}
      ${flowNote}
      <div class="cal-summary-chips3" style="display:grid;gap:8px;margin-bottom:18px">
        <div style="padding:10px;border-radius:10px;background:var(--income-l);border:1px solid rgba(61,219,160,0.2);text-align:center">
          <div style="font-size:9.5px;font-weight:700;color:var(--income);letter-spacing:.4px;text-transform:uppercase;margin-bottom:4px">
            <i class="fa-solid fa-arrow-down" style="margin-right:3px"></i>Pemasukan
          </div>
          <div style="font-family:'Outfit';font-size:15px;font-weight:800;color:var(--income)">${fmt(inc)}</div>
        </div>
        <div style="padding:10px;border-radius:10px;background:var(--expense-l);border:1px solid rgba(255,112,104,0.2);text-align:center">
          <div style="font-size:9.5px;font-weight:700;color:var(--expense);letter-spacing:.4px;text-transform:uppercase;margin-bottom:4px">
            <i class="fa-solid fa-arrow-up" style="margin-right:3px"></i>Pengeluaran
          </div>
          <div style="font-family:'Outfit';font-size:15px;font-weight:800;color:var(--expense)">${fmt(exp)}</div>
        </div>
        <div style="padding:10px;border-radius:10px;background:${net>=0?'var(--income-l)':'var(--expense-l)'};border:1px solid ${net>=0?'rgba(61,219,160,0.2)':'rgba(255,112,104,0.2)'};text-align:center">
          <div style="font-size:9.5px;font-weight:700;color:${net>=0?'var(--income)':'var(--expense)'};letter-spacing:.4px;text-transform:uppercase;margin-bottom:4px">
            <i class="fa-solid fa-scale-balanced" style="margin-right:3px"></i>Net
          </div>
          <div style="font-family:'Outfit';font-size:15px;font-weight:800;color:${net>=0?'var(--income)':'var(--expense)'}">${net>=0?'+':''}${fmt(net)}</div>
        </div>
      </div>

      ${incTxns.length ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:3px;height:14px;border-radius:2px;background:var(--income)"></div>
          <span style="font-size:11.5px;font-weight:700;color:var(--income);letter-spacing:.3px">PEMASUKAN</span>
          <span style="font-size:11px;color:var(--txm)">(${incTxns.length})</span>
        </div>
        ${incTxns.map(txnRow).join('')}
        <div style="margin-bottom:14px"></div>
      ` : ''}

      ${expTxns.length ? `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;${incTxns.length?'margin-top:4px':''}">
          <div style="width:3px;height:14px;border-radius:2px;background:var(--expense)"></div>
          <span style="font-size:11.5px;font-weight:700;color:var(--expense);letter-spacing:.3px">PENGELUARAN</span>
          <span style="font-size:11px;color:var(--txm)">(${expTxns.length})</span>
        </div>
        ${expTxns.map(txnRow).join('')}
      ` : ''}

    </div>
    <div class="modal-footer">
      <button class="btn" onclick="closeModal()">Tutup</button>
      <button class="btn btn-primary" onclick="closeModal();openTxnModal(null,'${dateStr}')">
        <i class="fa-solid fa-plus"></i> Tambah
      </button>
    </div>`);
};

/* ── TRANSACTIONS ── */
function rTxn(el) {
  el.innerHTML = `
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center">
      <div style="flex:1;min-width:160px;position:relative">
        <i class="fa-solid fa-search" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--txm);font-size:12px"></i>
        <input type="text" class="form-input" id="txn-search" placeholder="Cari transaksi..." value="${esc(txnFilter.search)}" style="padding-left:34px">
      </div>
      <select class="form-input" id="txn-ftype" style="width:140px">
        <option value="all"${txnFilter.type==='all'?' selected':''}>Semua Tipe</option>
        <option value="income"${txnFilter.type==='income'?' selected':''}>Pemasukan</option>
        <option value="expense"${txnFilter.type==='expense'?' selected':''}>Pengeluaran</option>
      </select>
      <select class="form-input" id="txn-fmonth" style="width:165px"><option value="">Semua Bulan</option></select>
      <button class="btn btn-sm" onclick="openTransferModal()"><i class="fa-solid fa-right-left"></i> Transfer</button>
      <button class="btn btn-primary btn-sm" onclick="openTxnModal()"><i class="fa-solid fa-plus"></i> Tambah</button>
    </div>
  </div>
  <div id="txn-chips"></div>
  <div class="card" style="overflow-x:auto">
    <table class="data-table">
      <thead><tr><th>Tanggal</th><th>Deskripsi</th><th>Kategori</th><th>Akun</th><th style="text-align:right">Jumlah</th><th style="text-align:center">Aksi</th></tr></thead>
      <tbody id="txn-tb"></tbody>
    </table>
  </div>`;

  const ms = new Set(); S.transactions.forEach(t => ms.add(t.date.slice(0,7)));
  const sel = document.getElementById('txn-fmonth');
  [...ms].sort().reverse().forEach(m => {
    const [y,mo]=m.split('-'); const o=document.createElement('option');
    o.value=m; o.textContent=MO_FULL[+mo-1]+' '+y;
    if(txnFilter.month===m) o.selected=true; sel.appendChild(o);
  });

  document.getElementById('txn-search').oninput  = e => { txnFilter.search=e.target.value.toLowerCase(); fillTxnTable(); };
  document.getElementById('txn-ftype').onchange   = e => { txnFilter.type=e.target.value;  fillTxnTable(); };
  document.getElementById('txn-fmonth').onchange  = e => { txnFilter.month=e.target.value; fillTxnTable(); };
  fillTxnTable();
}

function renderTxnChips() {
  const el = document.getElementById('txn-chips'); if (!el) return;
  const chips = [];
  const D = { day:'numeric', month:'short', year:'numeric' };
  if (txnFilter.categoryId) chips.push(['categoryId', 'Kategori: ' + catObj(txnFilter.categoryId).name]);
  if (txnFilter.debtId) { const d = S.debts.find(x => x.id === txnFilter.debtId); chips.push(['debtId', d ? (d.type==='hutang'?'Hutang: ':'Piutang: ') + d.person : 'Hutang/Piutang (sudah dihapus)']); }
  if (txnFilter.from || txnFilter.to) chips.push(['range', 'Rentang: ' + (txnFilter.from ? fmtDate(txnFilter.from, D) : '…') + (txnFilter.to && txnFilter.to !== txnFilter.from ? ' – ' + fmtDate(txnFilter.to, D) : '')]);
  el.innerHTML = chips.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${chips.map(([k,l]) => `<span class="chip">${esc(l)} <button type="button" onclick="clearTxnChip('${k}')" aria-label="Hapus filter"><i class="fa-solid fa-xmark"></i></button></span>`).join('')}</div>` : '';
}
window.clearTxnChip = function(k) {
  if (k === 'range') { txnFilter.from = ''; txnFilter.to = ''; } else txnFilter[k] = '';
  fillTxnTable();
};

function fillTxnTable() {
  let txns = [...S.transactions].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (txnFilter.type !== 'all')  txns = txns.filter(t => t.type === txnFilter.type);
  if (txnFilter.month)           txns = txns.filter(t => t.date.startsWith(txnFilter.month));
  if (txnFilter.categoryId)      txns = txns.filter(t => t.categoryId === txnFilter.categoryId);
  if (txnFilter.debtId)          txns = txns.filter(t => t.debtId === txnFilter.debtId);
  if (txnFilter.from)            txns = txns.filter(t => t.date >= txnFilter.from);
  if (txnFilter.to)              txns = txns.filter(t => t.date <= txnFilter.to);
  renderTxnChips();
  if (txnFilter.search)          txns = txns.filter(t =>
    t.description.toLowerCase().includes(txnFilter.search) ||
    catObj(t.categoryId).name.toLowerCase().includes(txnFilter.search) ||
    (t.note||'').toLowerCase().includes(txnFilter.search)
  );
  const tb = document.getElementById('txn-tb'); if (!tb) return;
  tb.innerHTML = txns.length ? txns.map(t => {
    const c=catObj(t.categoryId), a=accObj(t.accountId);
    return `<tr>
      <td style="white-space:nowrap;font-size:12px;color:var(--tx2)">${fmtDate(t.date,{day:'numeric',month:'short',year:'numeric'})}</td>
      <td><div style="font-weight:600;font-size:13px">${esc(t.description)}${t.transferId?' <i class="fa-solid fa-right-left" style="font-size:9px;color:var(--txm)" title="Transfer"></i>':''}${t.flow === 'hutang'?' <span class="badge" style="background:#8A90A818;color:#8A90A8;font-size:9px" title="Tidak dihitung sebagai pendapatan/pengeluaran"><i class="fa-solid fa-hand-holding-dollar" style="font-size:8px"></i> H/P</span>':''}</div>${t.note?`<div style="font-size:10.5px;color:var(--txm);margin-top:1px">${esc(t.note)}</div>`:''}</td>
      <td><span class="badge" style="background:${c.color}18;color:${c.color}"><i class="fa-solid ${c.icon}" style="font-size:9px"></i> ${esc(c.name)}</span></td>
      <td style="font-size:12.5px;color:var(--tx2)"><i class="fa-solid ${a.icon}" style="color:${a.color};margin-right:4px"></i>${esc(a.name)}</td>
      <td style="text-align:right;font-weight:700;font-size:13px;color:${t.type==='income'?'var(--income)':'var(--expense)'};white-space:nowrap">${t.type==='income'?'+':'−'}${fmt(t.amount)}</td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn-icon" style="width:29px;height:29px" onclick="openTxnModal('${t.id}')"><i class="fa-solid fa-pen" style="font-size:10px"></i></button>
        <button class="btn-icon" style="width:29px;height:29px;color:var(--expense)" onclick="delTxn('${t.id}')"><i class="fa-solid fa-trash" style="font-size:10px"></i></button>
      </td>
    </tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-receipt"></i><p>Tidak ada transaksi ditemukan</p></div></td></tr>`;
}

/* ── TXN MODAL ── */
window.openTxnModal = function(editId, presetDate) {
  const t = editId ? S.transactions.find(x => x.id === editId) : null;
  // Tanggal awal form: transaksi yg diedit > tanggal yg diklik di kalender > hari ini (tetap bisa diubah user)
  const initDate = t ? t.date : (/^\d{4}-\d{2}-\d{2}$/.test(presetDate||'') ? presetDate : today());
  if (t && t.transferId) { toast('Transaksi transfer tidak bisa diedit satuan (agar kedua sisi tetap seimbang). Hapus lalu buat transfer baru.','info'); return; }
  const tRole = t ? txnDebtRole(t) : null;
  const tLocked = tRole === 'disburse' || tRole === 'payment';
  const tDebt = tLocked ? S.debts.find(d => d.id === t.debtId) : null;
  _txnType = t ? t.type : 'expense';

  openModal(`
  <div class="modal-header"><h3>${t?'Edit':'Tambah'} Transaksi</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Tipe</label>
      <div class="type-toggle" id="ttog">
        <button class="${_txnType==='income'?'sel-income':''}" data-t="income"><i class="fa-solid fa-arrow-down" style="margin-right:4px;font-size:10px"></i>Pemasukan</button>
        <button class="${_txnType==='expense'?'sel-expense':''}" data-t="expense"><i class="fa-solid fa-arrow-up" style="margin-right:4px;font-size:10px"></i>Pengeluaran</button>
      </div>
      ${tLocked ? `<p style="font-size:10.5px;color:var(--gold);margin-top:7px"><i class="fa-solid fa-link"></i> Transaksi ini terhubung ke ${tDebt?(tDebt.type==='hutang'?'hutang':'piutang')+' "'+esc(tDebt.person)+'"':'catatan hutang/piutang'} (${tRole==='disburse'?'pencairan awal':'pembayaran'}). Tipe & kategori dikunci; mengubah jumlah ikut menyesuaikan catatan hutang/piutangnya.</p>` : ''}
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Tanggal</label><input type="date" class="form-input" id="tf-date" value="${initDate}"></div>
      <div class="form-group"><label class="form-label">Jumlah</label><input type="text" class="form-input" id="tf-amt" placeholder="0" value="${t?groupInt(t.amount):''}" inputmode="numeric" oninput="liveFormatAmount(this)"></div>
    </div>
    <div class="form-group"><label class="form-label">Deskripsi</label><input type="text" class="form-input" id="tf-desc" placeholder="Contoh: Gaji bulanan" value="${esc(t?t.description:'')}" maxlength="120"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Kategori</label><select class="form-input" id="tf-cat"></select></div>
      <div class="form-group"><label class="form-label">Akun</label><select class="form-input" id="tf-acc">${S.accounts.map(a=>`<option value="${a.id}"${t&&t.accountId===a.id?' selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Catatan <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="tf-note" placeholder="Catatan tambahan..." value="${esc(t?t.note||'':'')}" maxlength="200"></div>
    ${!editId ? `
    <div id="tf-debtlink-wrap" style="padding:12px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);display:none">
      <div id="tf-debtlink-hint" style="display:none;font-size:11.5px;color:var(--gold);font-weight:600;margin-bottom:8px"></div>
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--tx2);cursor:pointer;margin-bottom:0">
        <input type="checkbox" id="tf-debtlink-chk" style="width:16px;height:16px" onchange="toggleTxnDebtLinkUI(this.checked)">
        <span id="tf-debtlink-label">Ini pembayaran Hutang Saya?</span>
      </label>
      <div id="tf-debtlink-sel" style="display:none;margin-top:10px">
        <select class="form-input" id="tf-debtlink-debtid"></select>
        <p style="font-size:10.5px;color:var(--txm);margin-top:6px">Jumlah di atas akan mengurangi sisa hutang ini dan DIKECUALIKAN dari statistik pendapatan/pengeluaran (cuma pergerakan kas). Kalau lunas, otomatis pindah ke Riwayat di halaman Hutang & Piutang.</p>
      </div>
    </div>` : ''}
  </div>
  <div class="modal-footer">
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" id="save-txn-btn" onclick="saveTxn('${editId||''}')">${t?'Simpan Perubahan':'Tambah Transaksi'}</button>
  </div>`);

  fillCatSelect(t ? t.categoryId : null);
  if (!editId) refreshTxnDebtLinkOptions();
  if (tLocked) {
    document.querySelectorAll('#ttog button').forEach(b => b.disabled = true);
    const cs = document.getElementById('tf-cat'); if (cs) cs.disabled = true;
  }
  document.getElementById('tf-date')?.addEventListener('change', () => { if (!editId) refreshTxnDebtLinkOptions(); });
  document.querySelectorAll('#ttog button').forEach(btn => {
    btn.onclick = () => {
      _txnType = btn.dataset.t;
      document.querySelectorAll('#ttog button').forEach(b => b.className = '');
      btn.className = _txnType === 'income' ? 'sel-income' : 'sel-expense';
      fillCatSelect(null);
      if (!editId) refreshTxnDebtLinkOptions();
    };
  });
  setTimeout(() => document.getElementById('tf-amt')?.focus(), 80);
};

// Dropdown "Hubungkan ke Hutang/Piutang" — hanya tampil kalau ADA hutang/piutang aktif
// yg relevan dgn arah transaksi (Pengeluaran→Hutang Saya, Pemasukan→Piutang Saya).
function refreshTxnDebtLinkOptions() {
  const wrap = document.getElementById('tf-debtlink-wrap'); if (!wrap) return;
  const relevantType = _txnType === 'expense' ? 'hutang' : 'piutang';
  const dateVal = document.getElementById('tf-date')?.value || today();
  const candidates = S.debts.filter(d => d.type === relevantType && debtRemaining(d) > 0)
    .sort((a,b) => ((a.dueDate===dateVal)?0:1) - ((b.dueDate===dateVal)?0:1) || String(a.dueDate||'9999').localeCompare(String(b.dueDate||'9999')));
  const chk = document.getElementById('tf-debtlink-chk');
  const sel = document.getElementById('tf-debtlink-debtid');
  const hint = document.getElementById('tf-debtlink-hint');
  const prevChecked = !!(chk && chk.checked), prevId = sel ? sel.value : '';
  if (!candidates.length) { wrap.style.display = 'none'; if (chk) chk.checked = false; toggleTxnDebtLinkUI(false); return; }
  wrap.style.display = '';
  const lbl = document.getElementById('tf-debtlink-label');
  if (lbl) lbl.textContent = _txnType === 'expense' ? 'Ini pembayaran Hutang Saya?' : 'Ini penerimaan dari Piutang Saya?';
  if (sel) sel.innerHTML = candidates.map(d => `<option value="${d.id}">${esc(d.person)} — sisa ${fmt(debtRemaining(d))}${d.dueDate===dateVal?' · JATUH TEMPO HARI INI':''}</option>`).join('');
  const keep = prevChecked && candidates.some(d => d.id === prevId);
  if (chk) chk.checked = keep;
  if (keep && sel) sel.value = prevId;
  toggleTxnDebtLinkUI(keep);
  const dueToday = candidates.filter(d => d.dueDate === dateVal);
  if (hint) {
    if (dueToday.length && !keep) { hint.style.display = ''; hint.innerHTML = `<i class="fa-solid fa-lightbulb"></i> Tanggal ini jatuh tempo ${esc(dueToday.map(d=>d.person).join(', '))}. Centang di bawah supaya langsung tercatat sebagai ${_txnType==='expense'?'pembayaran':'penerimaan'} dan sisa ${relevantType} ikut berkurang.`; }
    else hint.style.display = 'none';
  }
}
window.toggleTxnDebtLinkUI = function(checked) {
  const el = document.getElementById('tf-debtlink-sel'); if (el) el.style.display = checked ? '' : 'none';
  const cs = document.getElementById('tf-cat'); if (cs) cs.disabled = !!checked;   // kategori otomatis "Hutang/Piutang"
};
function toggleTxnDebtLinkUI(c) { window.toggleTxnDebtLinkUI(c); }

function fillCatSelect(selId) {
  const sel = document.getElementById('tf-cat'); if (!sel) return;
  sel.innerHTML = S.categories.filter(c => c.type === _txnType)
    .map(c => `<option value="${c.id}"${selId===c.id?' selected':''}>${esc(c.name)}</option>`).join('');
}

function parseAmount(raw) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0 || n >= 999999999999) return null;
  return n;
}

window.saveTxn = async function(editId) {
  const date   = document.getElementById('tf-date').value;
  const desc   = document.getElementById('tf-desc').value.trim();
  const amount = parseAmount(document.getElementById('tf-amt').value);
  const catId  = document.getElementById('tf-cat').value;
  const accId  = document.getElementById('tf-acc').value;
  const note   = document.getElementById('tf-note').value.trim();
  if (!date||!desc||!amount) { toast('Harap isi semua field dengan benar','error'); return; }
  if (!catId) { toast('Pilih kategori dulu (buat kategori di Pengaturan bila belum ada)','error'); return; }

  const existing = editId ? S.transactions.find(x => x.id === editId) : null;
  const role = existing ? txnDebtRole(existing) : null;
  const locked = role === 'disburse' || role === 'payment';
  const exDebt = role && existing ? S.debts.find(d => d.id === existing.debtId) : null;

  // Dihubungkan ke Hutang/Piutang? (hanya relevan utk transaksi BARU)
  const linkChk = !editId && document.getElementById('tf-debtlink-chk');
  const isLinked = !!(linkChk && linkChk.checked);
  let linkedDebt = null;
  if (isLinked) {
    const debtId = document.getElementById('tf-debtlink-debtid').value;
    linkedDebt = S.debts.find(d => d.id === debtId);
    if (!linkedDebt) { toast('Hutang/Piutang yang dipilih tidak ditemukan','error'); return; }
    const remaining = debtRemaining(linkedDebt);
    if (amount > remaining) { toast(`Jumlah melebihi sisa ${linkedDebt.type==='hutang'?'hutang':'piutang'} ini (${fmt(remaining)}). Sesuaikan jumlahnya dulu.`,'error'); return; }
  }

  // Rencana perubahan (atomik) untuk EDIT transaksi, termasuk sinkron ke catatan hutang/piutang
  let editPlan = null;
  if (editId) {
    const data = { date, description:desc, amount, accountId:accId, note };
    if (!locked) { data.categoryId = catId; data.type = _txnType; }
    editPlan = { setTxns: [{ id: editId, data }] };
    if (exDebt && role === 'payment' && amount !== existing.amount) {
      const delta = amount - existing.amount;
      const newPaid = (exDebt.paid || 0) + delta;
      if (newPaid > exDebt.amount) { toast(`Jumlah baru membuat total terbayar melebihi pokok ${exDebt.type==='hutang'?'hutang':'piutang'} (maks. tambahan ${fmt(exDebt.amount-(exDebt.paid||0))}).`,'error'); return; }
      editPlan.setDebts = [{ id: exDebt.id, data: { paid: Math.max(0,newPaid) }, local: { paid: Math.max(0,newPaid) } }];
    }
    if (exDebt && role === 'disburse' && (amount !== exDebt.amount || date !== exDebt.borrowDate)) {
      if (amount < (exDebt.paid || 0)) { toast('Jumlah pencairan tidak boleh lebih kecil dari yang sudah dibayar.','error'); return; }
      if (exDebt.dueDate && exDebt.dueDate < date) { toast('Tanggal pencairan tidak boleh setelah jatuh tempo.','error'); return; }
      editPlan.setDebts = [{ id: exDebt.id, data: { amount, borrowDate: date } }];
    }
  }

  const btn = document.getElementById('save-txn-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; }
  try {
    if (editId) {
      await commitPlan(editPlan); toast('Transaksi diperbarui' + (editPlan.setDebts ? ' & catatan hutang/piutang disesuaikan' : ''));
    } else if (isLinked) {
      // Cicilan/pelunasan: pokok → flow:'hutang' (dikecualikan dari statistik pendapatan/pengeluaran),
      // kategori otomatis "Hutang/Piutang", dan sisa hutang berkurang — SEMUA dalam satu operasi atomik.
      const debtCat = await ensureDebtCategory(_txnType);
      const newPaid = (linkedDebt.paid||0) + amount;
      await commitPlan({
        addTxns: [{ id: newId('transactions'), data: { date, description:desc, amount, categoryId:debtCat.id, accountId:accId, note,
          type:_txnType, flow:'hutang', debtId:linkedDebt.id, debtRole:'payment' } }],
        setDebts: [{ id: linkedDebt.id, data: { paid: increment(amount) }, local: { paid: newPaid } }]
      });
      const nowRemaining = linkedDebt.amount - newPaid;
      if (nowRemaining <= 0) {
        toast(`🎉 ${linkedDebt.type==='hutang'?'Hutang':'Piutang'} dengan ${linkedDebt.person} LUNAS! Dipindah ke Riwayat di halaman Hutang & Piutang.`, 'success');
      } else {
        toast(`Transaksi dicatat & sisa ${linkedDebt.type==='hutang'?'hutang':'piutang'} ${linkedDebt.person} kini ${fmt(nowRemaining)}`);
      }
    } else {
      await fbAddTxn({ date, description:desc, amount, categoryId:catId, accountId:accId, note, type:_txnType, flow:'real' });
      toast('Transaksi ditambahkan');
    }
    closeModal(); renderPage();
  } catch(e) { toast('Gagal menyimpan: ' + e.message, 'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan Perubahan':'Tambah Transaksi';} }
};

window.delTxn = function(id) {
  const t = S.transactions.find(x=>x.id===id); if (!t) return;
  const role = txnDebtRole(t);
  const debt = role ? S.debts.find(d => d.id === t.debtId) : null;
  let msg = 'Yakin ingin menghapus transaksi ini?';
  if (t.transferId) msg = 'Ini adalah transaksi transfer — kedua sisi transfer akan ikut terhapus. Lanjutkan?';
  else if (role === 'payment' && debt) msg = `Transaksi ini tercatat sebagai ${debt.type==='hutang'?'pembayaran hutang':'penerimaan piutang'} "${debt.person}". Jika dihapus, sisa ${debt.type==='hutang'?'hutang':'piutang'} otomatis bertambah ${fmt(t.amount)} dan saldo akun ikut berubah. Lanjutkan?`;
  else if (role === 'disburse' && debt) msg = `Transaksi ini adalah pencairan awal ${debt.type==='hutang'?'hutang':'piutang'} "${debt.person}". Catatan hutang/piutangnya tetap ada; hanya arus kas di akun yang terhapus. Lanjutkan?`;
  confirmDel(msg, async () => {
    try {
      const plan = { delTxns: [id] };
      if (t.transferId) S.transactions.filter(x => x.transferId === t.transferId && x.id !== id).forEach(x => plan.delTxns.push(x.id));
      if (role === 'payment' && debt) {
        const cur = debt.paid || 0;
        plan.setDebts = [{ id: debt.id, data: { paid: cur >= t.amount ? increment(-t.amount) : 0 }, local: { paid: Math.max(0, cur - t.amount) } }];
      }
      await commitPlan(plan);
      toast('Transaksi dihapus' + (plan.setDebts ? ' & sisa ' + (debt.type==='hutang'?'hutang':'piutang') + ' diperbarui' : ''),'info');
      renderPage();
    } catch(e) { toast('Gagal menghapus: ' + e.message,'error'); }
  });
};

/* ── TRANSFER ANTAR AKUN ── */
window.openTransferModal = function() {
  if (S.accounts.length < 2) { toast('Butuh minimal 2 akun untuk transfer','error'); return; }
  openModal(`
  <div class="modal-header"><h3>Transfer Antar Akun</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Dari Akun</label><select class="form-input" id="tr-from">${S.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">Ke Akun</label><select class="form-input" id="tr-to">${S.accounts.map(a=>`<option value="${a.id}"${a===S.accounts[1]?' selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Tanggal</label><input type="date" class="form-input" id="tr-date" value="${today()}"></div>
    <div class="form-group"><label class="form-label">Jumlah</label><input type="text" class="form-input" id="tr-amt" placeholder="0" inputmode="numeric" oninput="liveFormatAmount(this)"></div>
    <div class="form-group"><label class="form-label">Catatan <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="tr-note" placeholder="Contoh: Tarik tunai" maxlength="200"></div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="tr-save-btn" onclick="saveTransfer()">Transfer</button></div>`);
};
window.saveTransfer = async function() {
  const from = document.getElementById('tr-from').value;
  const to   = document.getElementById('tr-to').value;
  const date = document.getElementById('tr-date').value;
  const amount = parseAmount(document.getElementById('tr-amt').value);
  const note = document.getElementById('tr-note').value.trim();
  if (from === to) { toast('Akun asal dan tujuan harus berbeda','error'); return; }
  if (!date || !amount) { toast('Harap isi jumlah dengan benar','error'); return; }
  const transferId = uid();
  const btn = document.getElementById('tr-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }
  try {
    const catExp = await ensureCategoryByName('Transfer','expense','fa-right-left','#8A90A8');
    const catInc = await ensureCategoryByName('Transfer','income','fa-right-left','#8A90A8');
    // Kedua sisi transfer ditulis sekaligus (atomik): tidak mungkin uang "hilang" di satu akun tanpa masuk ke akun lain.
    await commitPlan({ addTxns: [
      { id: newId('transactions'), data: { date, description:`Transfer ke ${accObj(to).name}`, amount, categoryId:catExp.id, accountId:from, note, type:'expense', transferId, flow:'transfer' } },
      { id: newId('transactions'), data: { date, description:`Transfer dari ${accObj(from).name}`, amount, categoryId:catInc.id, accountId:to, note, type:'income', transferId, flow:'transfer' } }
    ]});
    toast('Transfer berhasil'); closeModal(); renderPage();
  } catch(e) { toast('Gagal transfer: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent='Transfer';} }
};

/* ── BUDGETS ── */
function rBud(el) {
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">
    <div><h3 style="font-size:17px;font-weight:700">Anggaran</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Harian, mingguan, bulanan, tahunan — semua saling terhubung dari satu angka</p></div>
    <button class="btn btn-primary btn-sm" onclick="openBudModal()"><i class="fa-solid fa-plus"></i> Tambah Anggaran</button>
  </div>
  <div class="grid-auto" id="bud-grid"></div>`;

  const grid = document.getElementById('bud-grid');
  if (!S.budgets.length) {
    grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wallet"></i><p>Belum ada anggaran. Tambahkan untuk memantau pengeluaran.</p></div>'; return;
  }
  grid.innerHTML = S.budgets.map(b => {
    const c = catObj(b.categoryId);
    const period = budgetPeriod(b);
    const spent = budgetNativeSpent(b);
    const pct   = Math.min((spent/b.amount)*100, 100);
    const over  = spent > b.amount;
    const bc    = over ? 'var(--expense)' : pct>75 ? 'var(--gold)' : c.color;
    const others = ['harian','mingguan','bulanan','tahunan'].filter(p=>p!==period);
    return `<div class="card${over?' pulse-red':''}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;border-radius:10px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${c.icon}"></i></div>
          <div>
            <div style="font-weight:600;font-size:13.5px">${esc(c.name)} <span class="badge" style="background:var(--acc-l);color:var(--acc);font-size:9px;margin-left:2px">${PERIOD_LABEL[period]}</span></div>
            <div style="font-size:11px;color:${over?'var(--expense)':pct>75?'var(--gold)':'var(--txm)'}">${over?'⚠ Melebihi anggaran!':pct>75?'Hati-hati, hampir batas':'Aman'}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" style="width:27px;height:27px" onclick="openBudgetDetailModal('${b.id}')" title="Lihat detail per periode"><i class="fa-solid fa-magnifying-glass" style="font-size:9px"></i></button>
          <button class="btn-icon" style="width:27px;height:27px" onclick="openBudModal('${b.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
          <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delBud('${b.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
        </div>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${bc}"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:12.5px">
        <span style="color:${over?'var(--expense)':'var(--tx2)'};font-weight:600">${fmt(spent)} terpakai</span>
        <span style="color:var(--txm)">${fmt(b.amount)}</span>
      </div>
      <div style="text-align:right;font-size:11.5px;margin-top:3px;color:${over?'var(--expense)':'var(--income)'};font-weight:600">${over?'+'+fmt(spent-b.amount)+' over':'Sisa: '+fmt(b.amount-spent)}</div>
      <div style="margin-top:10px;padding-top:9px;border-top:1px solid var(--border);font-size:10.5px;color:var(--txm);display:flex;gap:10px;flex-wrap:wrap">
        ${others.map(p=>`<span>≈ ${fmt(convertPeriodAmount(b.amount,period,p))}<span style="opacity:.7">/${PERIOD_LABEL[p].toLowerCase()}</span></span>`).join('')}
      </div>
    </div>`;
  }).join('');
}

const BUD_PERIODS = ['harian','mingguan','bulanan','tahunan'];
window.openBudModal = function(editId) {
  const b = editId ? S.budgets.find(x=>x.id===editId) : null;
  const existing = S.budgets.filter(x=>x.id!==editId).map(x=>x.categoryId);
  const avail = S.categories.filter(c=>c.type==='expense'&&!existing.includes(c.id));
  if (!avail.length && !b) { toast('Semua kategori sudah memiliki anggaran','info'); return; }
  const opts = b ? S.categories.filter(c=>c.type==='expense') : avail;
  const period = b ? budgetPeriod(b) : 'bulanan';
  openModal(`
  <div class="modal-header"><h3>${b?'Edit':'Tambah'} Anggaran</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Kategori</label><select class="form-input" id="bf-cat">${opts.map(c=>`<option value="${c.id}"${b&&b.categoryId===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Periode</label>
      <select class="form-input" id="bf-period">${BUD_PERIODS.map(p=>`<option value="${p}"${period===p?' selected':''}>${PERIOD_LABEL[p]}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label class="form-label">Jumlah Anggaran</label><input type="text" class="form-input" id="bf-amt" placeholder="0" inputmode="numeric" value="${b?groupInt(b.amount):''}" oninput="liveFormatAmount(this)"></div>
    <p style="font-size:10.5px;color:var(--txm)">Angka lain (harian/mingguan/bulanan/tahunan) otomatis dikonversi dari sini — tidak perlu diisi manual satu-satu.</p>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="bf-save-btn" onclick="saveBud('${editId||''}')">${b?'Simpan':'Tambah'}</button></div>`);
};
window.saveBud = async function(editId) {
  const categoryId = document.getElementById('bf-cat').value;
  const period = document.getElementById('bf-period').value;
  const amount = parseAmount(document.getElementById('bf-amt').value);
  if (!categoryId||!amount) { toast('Harap isi dengan benar','error'); return; }
  const btn = document.getElementById('bf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try { await fbSaveBud({categoryId,amount,period}, editId||null); toast(editId?'Anggaran diperbarui':'Anggaran ditambahkan'); closeModal(); renderPage(); checkBudgetAlerts(); }
  catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delBud = function(id) {
  confirmDel('Hapus anggaran ini?', async () => { await fbDelBud(id); toast('Anggaran dihapus','info'); renderPage(); checkBudgetAlerts(); });
};

/* ── DRILL-DOWN ANGGARAN: Harian / Mingguan / Bulanan / Tahunan yang saling connect ──
   Klik sel bulan/minggu/hari manapun → pilih mau lihat di Transaksi atau Kalender. */
let _budDetailTab = 'bulanan';
let _budDetailYear = new Date().getFullYear();
window.openBudgetDetailModal = function(budgetId) {
  _budDetailTab = budgetPeriod(S.budgets.find(x=>x.id===budgetId)) || 'bulanan';
  _budDetailYear = new Date().getFullYear();
  renderBudgetDetail(budgetId);
};
function renderBudgetDetail(budgetId) {
  const b = S.budgets.find(x=>x.id===budgetId); if (!b) return;
  const c = catObj(b.categoryId);
  openModal(`
  <div class="modal-header"><h3><i class="fa-solid ${c.icon}" style="color:${c.color};margin-right:6px"></i>${esc(c.name)}</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="type-toggle" id="budd-tabs" style="margin-bottom:16px">
      ${BUD_PERIODS.map(p=>`<button class="${_budDetailTab===p?'sel-active':''}" data-p="${p}">${PERIOD_LABEL[p]}</button>`).join('')}
    </div>
    <div id="budd-body"></div>
  </div>
  <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Tutup</button></div>`);
  document.querySelectorAll('#budd-tabs button').forEach(btn => {
    btn.onclick = () => { _budDetailTab = btn.dataset.p; renderBudgetDetail(budgetId); };
  });
  fillBudgetDetailBody(b);
}
window.budDetailShiftYear = function(budgetId, dir) {
  _budDetailYear += dir;
  fillBudgetDetailBody(S.budgets.find(x => x.id === budgetId));
};
function fillBudgetDetailBody(b) {
  const body = document.getElementById('budd-body'); if (!body) return;
  const target = convertPeriodAmount(b.amount, budgetPeriod(b), _budDetailTab);

  if (_budDetailTab === 'tahunan') {
    const years = [_budDetailYear-1, _budDetailYear, _budDetailYear+1];
    body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px">
        <button class="btn-icon" onclick="budDetailShiftYear('${b.id}',-1)"><i class="fa-solid fa-chevron-left"></i></button>
        <b style="font-family:'Outfit';font-size:16px">${_budDetailYear}</b>
        <button class="btn-icon" onclick="budDetailShiftYear('${b.id}',1)"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      ${years.filter(y=>y===_budDetailYear).map(y => {
        const spent = filterReal(txnsInYear(y)).filter(t=>t.categoryId===b.categoryId&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
        const over = spent > target;
        return `<div class="card" style="cursor:pointer" onclick="openPeriodChoice('${b.categoryId}','tahunan',{y:${y}})">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div><div style="font-weight:700">Tahun ${y}</div><div style="font-size:11px;color:var(--txm)">Target ≈ ${fmt(target)}</div></div>
            <div style="text-align:right"><div style="font-weight:800;color:${over?'var(--expense)':'var(--income)'}">${fmt(spent)}</div>${over?`<span class="badge" style="background:var(--expense-l);color:var(--expense)">Over</span>`:`<span class="badge" style="background:var(--income-l);color:var(--income)">Aman</span>`}</div>
          </div>
        </div>`;
      }).join('')}
      <p style="font-size:10.5px;color:var(--txm);margin-top:10px;text-align:center">Klik kartu tahun untuk lihat rincian transaksinya.</p>`;
    return;
  }

  if (_budDetailTab === 'bulanan') {
    body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px">
        <button class="btn-icon" onclick="budDetailShiftYear('${b.id}',-1)"><i class="fa-solid fa-chevron-left"></i></button>
        <b style="font-family:'Outfit';font-size:16px">${_budDetailYear}</b>
        <button class="btn-icon" onclick="budDetailShiftYear('${b.id}',1)"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
      <div class="budd-month-grid" style="display:grid;gap:8px">
        ${MO_FULL.map((mLabel,i) => {
          const spent = filterReal(txnsInMonth(_budDetailYear, i+1)).filter(t=>t.categoryId===b.categoryId&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
          const hasData = spent > 0;
          const over = spent > target;
          const bg = !hasData ? 'var(--bg2)' : over ? 'var(--expense-l)' : 'var(--income-l)';
          const clr = !hasData ? 'var(--txm)' : over ? 'var(--expense)' : 'var(--income)';
          return `<div style="padding:10px 6px;border-radius:10px;background:${bg};text-align:center;cursor:pointer;border:1px solid var(--border)" onclick="openPeriodChoice('${b.categoryId}','bulanan',{y:${_budDetailYear},m:${i+1}})">
            <div style="font-size:11px;font-weight:700;color:${clr}">${MO[i]}</div>
            <div style="font-size:10px;color:${clr};margin-top:2px">${hasData?fmtS(spent):'—'}</div>
            ${hasData?`<div style="font-size:8.5px;margin-top:2px">${over?'⚠ over':'✓'}</div>`:''}
          </div>`;
        }).join('')}
      </div>
      <p style="font-size:10.5px;color:var(--txm);margin-top:10px;text-align:center">Target per bulan ≈ ${fmt(target)} · Klik bulan untuk lihat rincian.</p>`;
    return;
  }

  if (_budDetailTab === 'mingguan') {
    // 8 minggu terakhir (termasuk minggu berjalan)
    const weeks = [];
    let ws = weekStartOf(today());
    for (let i=0;i<8;i++){ weeks.unshift(ws); const d=new Date(ws+'T00:00:00'); d.setDate(d.getDate()-7); ws=localDateStr(d); }
    body.innerHTML = weeks.map(w => {
      const end = new Date(w+'T00:00:00'); end.setDate(end.getDate()+6);
      const spent = filterReal(txnsInWeek(w)).filter(t=>t.categoryId===b.categoryId&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const over = spent > target;
      const isThisWeek = w === weekStartOf(today());
      return `<div class="card" style="cursor:pointer;margin-bottom:8px;${isThisWeek?'border-color:var(--acc)':''}" onclick="openPeriodChoice('${b.categoryId}','mingguan',{start:'${w}'})">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-weight:600;font-size:12.5px">${new Date(w+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'})} – ${end.toLocaleDateString('id-ID',{day:'numeric',month:'short'})}${isThisWeek?' <span style=\"color:var(--acc)\">(minggu ini)</span>':''}</div><div style="font-size:10.5px;color:var(--txm)">Target ≈ ${fmt(target)}</div></div>
          <div style="font-weight:800;color:${over?'var(--expense)':'var(--income)'}">${fmt(spent)}</div>
        </div>
      </div>`;
    }).join('');
    return;
  }

  // harian — 14 hari terakhir
  const days = []; for (let i=13;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); days.push(localDateStr(d)); }
  body.innerHTML = `<div class="budd-day-grid" style="display:grid;gap:6px">
    ${days.map(dateStr => {
      const spent = filterReal(txnsOnDate(dateStr)).filter(t=>t.categoryId===b.categoryId&&t.type==='expense').reduce((s,t)=>s+t.amount,0);
      const hasData = spent > 0;
      const over = spent > target;
      const isToday = dateStr === today();
      const bg = !hasData ? 'var(--bg2)' : over ? 'var(--expense-l)' : 'var(--income-l)';
      const clr = !hasData ? 'var(--txm)' : over ? 'var(--expense)' : 'var(--income)';
      return `<div style="padding:8px 4px;border-radius:8px;background:${bg};text-align:center;cursor:pointer;border:1px solid ${isToday?'var(--acc)':'var(--border)'}" onclick="openPeriodChoice('${b.categoryId}','harian',{date:'${dateStr}'})">
        <div style="font-size:9.5px;color:var(--txm)">${new Date(dateStr+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</div>
        <div style="font-size:10px;font-weight:700;color:${clr};margin-top:3px">${hasData?fmtS(spent):'—'}</div>
      </div>`;
    }).join('')}
  </div>
  <p style="font-size:10.5px;color:var(--txm);margin-top:10px;text-align:center">Target per hari ≈ ${fmt(target)} · Klik hari untuk lihat rincian.</p>`;
}

// Pilihan lihat di Transaksi atau Kalender — sesuai permintaan: user pilih dulu mau lihat di mana
window.openPeriodChoice = function(categoryId, periodType, key) {
  const c = catObj(categoryId);
  openModal(`
  <div class="modal-header"><h3>Lihat "${esc(c.name)}"</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body" style="display:flex;flex-direction:column;gap:10px">
    <button class="btn" style="justify-content:center;padding:14px" onclick='goToTransaksiFiltered(${JSON.stringify(categoryId)},${JSON.stringify(periodType)},${JSON.stringify(key)})'><i class="fa-solid fa-right-left"></i> Lihat di Transaksi</button>
    <button class="btn" style="justify-content:center;padding:14px" onclick='goToKalenderFiltered(${JSON.stringify(periodType)},${JSON.stringify(key)})'><i class="fa-solid fa-calendar-days"></i> Lihat di Kalender</button>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button></div>`);
};
window.goToTransaksiFiltered = function(categoryId, periodType, key) {
  // Rentang tanggal PERSIS sesuai yang diklik (hari / minggu / bulan / tahun) + kategori yang tepat (bukan pencarian teks)
  let from, to;
  if (periodType === 'harian')        { from = to = key.date; }
  else if (periodType === 'mingguan') { const e = new Date(key.start+'T00:00:00'); e.setDate(e.getDate()+6); from = key.start; to = localDateStr(e); }
  else if (periodType === 'bulanan')  { from = `${key.y}-${String(key.m).padStart(2,'0')}-01`; to = localDateStr(new Date(key.y, key.m, 0)); }
  else                                { from = `${key.y}-01-01`; to = `${key.y}-12-31`; }
  txnFilter = { type:'expense', search:'', month:'', categoryId, debtId:'', from, to };
  closeModal(); nav('transactions');
};
window.goToKalenderFiltered = function(periodType, key) {
  let y, m, dateStr = null;
  if (periodType === 'bulanan') { y=key.y; m=key.m-1; }
  else if (periodType === 'tahunan') { y=key.y; m=0; }
  else if (periodType === 'harian') { const d=new Date(key.date+'T00:00:00'); y=d.getFullYear(); m=d.getMonth(); dateStr=key.date; }
  else { const d=new Date(key.start+'T00:00:00'); y=d.getFullYear(); m=d.getMonth(); }
  _calYear = y; _calMonth = m;
  closeModal(); nav('calendar');
  if (dateStr) setTimeout(() => calDayClick(dateStr), 120);
};

/* ── HUTANG & PIUTANG ──
   type: 'hutang'  = saya berhutang ke orang lain (liability)
         'piutang' = orang lain berhutang ke saya (asset)
   Melunasi/menerima pembayaran BISA otomatis membuat transaksi supaya
   saldo & laporan tetap sinkron dengan kondisi keuangan sebenarnya. */
function rDebt(el) {
  const hutang  = totalHutang();
  const piutang = totalPiutang();
  const net = piutang - hutang;
  el.innerHTML = `
  <div class="grid-2-1" style="margin-bottom:18px;align-items:stretch">
    <div class="debt3d-wrap" id="debt3d-wrap" onclick="flipDebt3D()" title="Klik untuk membalik kartu">
      <div class="debt3d-card" id="debt3d-card">
        <div class="debt3d-face debt3d-front">
          <div class="debt3d-icon"><i class="fa-solid fa-arrow-up-from-bracket"></i></div>
          <div class="debt3d-label">Total Hutang Saya</div>
          <div class="debt3d-value">${fmt(hutang)}</div>
          <div class="debt3d-sub">Yang harus saya bayar</div>
          <div class="debt3d-hint"><i class="fa-solid fa-rotate"></i> Klik untuk lihat Piutang</div>
        </div>
        <div class="debt3d-face debt3d-back">
          <div class="debt3d-icon"><i class="fa-solid fa-arrow-down-to-bracket"></i></div>
          <div class="debt3d-label">Total Piutang Saya</div>
          <div class="debt3d-value">${fmt(piutang)}</div>
          <div class="debt3d-sub">Yang harus saya tagih</div>
          <div class="debt3d-hint"><i class="fa-solid fa-rotate"></i> Klik untuk lihat Hutang</div>
        </div>
      </div>
    </div>
    <div class="card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
      <div class="stat-icon" style="background:${net>=0?'var(--income-l)':'var(--expense-l)'};color:${net>=0?'var(--income)':'var(--expense)'}"><i class="fa-solid fa-scale-balanced"></i></div>
      <div class="stat-label" style="margin-top:10px">Selisih Bersih</div>
      <div class="stat-value" style="color:${net>=0?'var(--income)':'var(--expense)'}">${net>=0?'+':''}${fmt(net)}</div>
      <span class="stat-change trend-neu">Piutang − Hutang</span>
    </div>
  </div>

  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between">
      <div class="type-toggle" id="debt-ftog" style="max-width:340px">
        <button class="${debtFilter==='all'?'sel-active':''}" data-f="all">Semua</button>
        <button class="${debtFilter==='hutang'?'sel-expense':''}" data-f="hutang">Hutang Saya</button>
        <button class="${debtFilter==='piutang'?'sel-income':''}" data-f="piutang">Piutang Saya</button>
      </div>
      <button class="btn btn-primary btn-sm" onclick="openDebtModal()"><i class="fa-solid fa-plus"></i> Catat Baru</button>
    </div>
  </div>

  <div class="grid-auto" id="debt-grid"></div>

  <div style="margin-top:22px">
    <button class="btn btn-sm" id="debt-history-toggle" onclick="toggleDebtHistorySection()">
      <i class="fa-solid fa-clock-rotate-left"></i> <span id="debt-history-toggle-label">Riwayat (Lunas)</span>
    </button>
    <div id="debt-history-grid" class="grid-auto" style="margin-top:14px;display:none"></div>
  </div>`;

  document.querySelectorAll('#debt-ftog button').forEach(b => {
    b.onclick = () => { debtFilter = b.dataset.f; renderPage(); };
  });
  fillDebtGrid();
  fillDebtHistoryGrid();
}

window.flipDebt3D = function() {
  const card = document.getElementById('debt3d-card');
  if (card) card.classList.toggle('flipped');
};

let _debtHistoryOpen = false;
window.toggleDebtHistorySection = function() {
  _debtHistoryOpen = !_debtHistoryOpen;
  const grid = document.getElementById('debt-history-grid');
  if (grid) grid.style.display = _debtHistoryOpen ? '' : 'none';
};

function debtCardHtml(d, { isHistory }) {
  const remaining = debtRemaining(d);
  const isLunas   = remaining <= 0;
  const isOverdue = !isLunas && d.dueDate && d.dueDate < today();
  const pct = d.amount>0 ? Math.min(((d.paid||0)/d.amount)*100,100) : 0;
  const isHutang = d.type === 'hutang';
  const color = isHutang ? 'var(--expense)' : 'var(--income)';
  const statusBadge = isLunas
    ? `<span class="badge" style="background:var(--income-l);color:var(--income)"><i class="fa-solid fa-check"></i> Lunas</span>`
    : isOverdue
    ? `<span class="badge" style="background:var(--expense-l);color:var(--expense)"><i class="fa-solid fa-triangle-exclamation"></i> Jatuh Tempo</span>`
    : `<span class="badge" style="background:${color}18;color:${color}">Berjalan</span>`;
  return `<div class="card${isOverdue?' pulse-red':''}${isHistory?' fade-in':''}" style="${isHistory?'opacity:.85':''}">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:38px;height:38px;border-radius:10px;background:${color}18;color:${color};display:flex;align-items:center;justify-content:center;box-shadow:var(--neu-pressed-sm)">
          <i class="fa-solid ${isHutang?'fa-arrow-up-from-bracket':'fa-arrow-down-to-bracket'}"></i>
        </div>
        <div>
          <div style="font-weight:700;font-size:14px">${esc(d.person)}</div>
          <div style="font-size:11px;color:var(--txm)">${isHutang?'Saya berhutang':'Berhutang ke saya'}${d.borrowDate?' · Pinjam '+new Date(d.borrowDate+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):''}${!isLunas&&d.dueDate?' · Jatuh tempo '+new Date(d.dueDate+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):''}</div>
        </div>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn-icon" style="width:27px;height:27px" onclick="openDebtHistoryModal('${d.id}')" title="Riwayat transaksi"><i class="fa-solid fa-clock-rotate-left" style="font-size:9px"></i></button>
        <button class="btn-icon" style="width:27px;height:27px" onclick="openDebtModal('${d.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
        <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delDebt('${d.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
      </div>
    </div>
    ${d.note?`<div style="font-size:11.5px;color:var(--tx2);margin-bottom:8px;font-style:italic">"${esc(d.note)}"</div>`:''}
    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:12.5px">
      <span style="color:var(--tx2);font-weight:600">Terbayar ${fmt(d.paid||0)}</span>
      <span style="color:var(--txm)">dari ${fmt(d.amount)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
      ${statusBadge}
      ${!isLunas?`<button class="btn btn-sm btn-primary" onclick="openPayDebtModal('${d.id}')">${isHutang?'Bayar':'Terima'}</button>`:''}
    </div>
  </div>`;
}

// Hanya yang MASIH BERJALAN (belum lunas) — yang lunas otomatis pindah ke Riwayat di bawah.
function fillDebtGrid() {
  const grid = document.getElementById('debt-grid'); if (!grid) return;
  let list = S.debts.filter(d => debtRemaining(d) > 0);
  if (debtFilter !== 'all') list = list.filter(d => d.type === debtFilter);
  list.sort((a,b) => debtRemaining(b) - debtRemaining(a));
  if (!list.length) { grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-hand-holding-dollar"></i><p>Belum ada hutang/piutang yang berjalan.</p></div>'; return; }
  grid.innerHTML = list.map(d => debtCardHtml(d, {isHistory:false})).join('');
}

// Riwayat: hutang/piutang yang SUDAH LUNAS — disembunyikan default, biar halaman utama fokus ke yg aktif.
function fillDebtHistoryGrid() {
  const grid = document.getElementById('debt-history-grid'); if (!grid) return;
  let list = S.debts.filter(d => debtRemaining(d) <= 0);
  if (debtFilter !== 'all') list = list.filter(d => d.type === debtFilter);
  const toggleLbl = document.getElementById('debt-history-toggle-label');
  if (toggleLbl) toggleLbl.textContent = `Riwayat (Lunas) · ${list.length}`;
  if (!list.length) { grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-box-archive"></i><p>Belum ada hutang/piutang yang lunas.</p></div>'; return; }
  grid.innerHTML = list.map(d => debtCardHtml(d, {isHistory:true})).join('');
}

const DEBT_TYPE_LABEL = { hutang: 'Hutang (Saya Berhutang)', piutang: 'Piutang (Orang Berhutang ke Saya)' };
window.openDebtModal = function(editId) {
  const d = editId ? S.debts.find(x=>x.id===editId) : null;
  const type = d ? d.type : 'hutang';
  const hasLinked = !!(d && S.transactions.some(t => t.debtId === d.id));
  openModal(`
  <div class="modal-header"><h3>${d?'Edit':'Catat'} Hutang / Piutang</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Jenis</label>
      <div class="type-toggle" id="dtog">
        <button class="${type==='hutang'?'sel-expense':''}" data-t="hutang" ${hasLinked?'disabled':''}><i class="fa-solid fa-arrow-up-from-bracket" style="margin-right:4px;font-size:10px"></i>Hutang Saya</button>
        <button class="${type==='piutang'?'sel-income':''}" data-t="piutang" ${hasLinked?'disabled':''}><i class="fa-solid fa-arrow-down-to-bracket" style="margin-right:4px;font-size:10px"></i>Piutang Saya</button>
      </div>
      ${hasLinked ? '<p style="font-size:10.5px;color:var(--gold);margin-top:6px"><i class="fa-solid fa-link"></i> Jenis dikunci karena sudah ada transaksi yang terhubung. Perubahan jumlah & tanggal pinjam ikut menyesuaikan transaksi pencairannya.</p>' : ''}
    </div>
    <div class="form-group"><label class="form-label">Nama Orang / Pihak</label><input type="text" class="form-input" id="df-person" placeholder="Contoh: Budi" value="${esc(d?d.person:'')}" maxlength="60"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Jumlah Pokok</label><input type="text" class="form-input" id="df-amt" placeholder="0" inputmode="numeric" value="${d?groupInt(d.amount):''}" oninput="liveFormatAmount(this)"></div>
      <div class="form-group"><label class="form-label">Sudah Dibayar</label><input type="text" class="form-input" id="df-paid" placeholder="0" inputmode="numeric" value="${d?groupInt(d.paid||0):'0'}" ${d?'':'disabled'} oninput="liveFormatAmount(this)"></div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label" id="df-borrow-label">Tanggal Pinjam</label><input type="date" class="form-input" id="df-borrowdate" value="${d?d.borrowDate||today():today()}"></div>
      <div class="form-group"><label class="form-label">Jatuh Tempo <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="date" class="form-input" id="df-due" value="${d?d.dueDate||'':''}"></div>
    </div>
    <div class="form-group"><label class="form-label">Catatan <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="df-note" placeholder="Contoh: Pinjam untuk modal usaha" value="${esc(d?d.note||'':'')}" maxlength="200"></div>
    <div id="df-kpr-wrap" style="${type==='hutang'?'':'display:none'}">
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--tx2);cursor:pointer;margin-bottom:10px">
        <input type="checkbox" id="df-iskpr" ${d&&d.isKPR?'checked':''} style="width:16px;height:16px">
        Ini adalah KPR (Kredit Pemilikan Rumah) <span style="color:var(--txm);font-weight:400">— dipakai utk tangga 6 Kekayaan Abadi</span>
      </label>
    </div>
    ${!d ? `
    <div style="padding:12px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);margin-top:6px">
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--tx2);cursor:pointer;margin-bottom:0">
        <input type="checkbox" id="df-astxn" checked style="width:16px;height:16px" onchange="document.getElementById('df-astxn-fields').style.display=this.checked?'':'none'">
        <span id="df-astxn-label">Catat juga penerimaan dana ke akun (uang benar-benar masuk ke dompet saya)</span>
      </label>
      <div id="df-astxn-fields" style="margin-top:10px">
        <div class="form-group" style="margin-bottom:0"><label class="form-label">Akun</label><select class="form-input" id="df-acc">${S.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
        <p style="font-size:10.5px;color:var(--txm);margin-top:6px;margin-bottom:0">Pakai tanggal "Tanggal Pinjam" di atas — otomatis tersambung ke Kalender & Transaksi di tanggal itu juga.</p>
      </div>
      <p style="font-size:10.5px;color:var(--txm);margin-top:8px;margin-bottom:0">Dana ini <b>tidak</b> dihitung sebagai pendapatan/pengeluaran di Dashboard & Laporan — cuma pergerakan kas nyata.</p>
    </div>` : ''}
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="df-save-btn" onclick="saveDebt('${editId||''}')">${d?'Simpan':'Catat'}</button></div>`);

  let _dType = type;
  const updateAstxnLabel = () => {
    const lbl = document.getElementById('df-astxn-label');
    const bl  = document.getElementById('df-borrow-label');
    if (lbl) lbl.textContent = _dType === 'hutang'
      ? 'Catat juga penerimaan dana ke akun (uang benar-benar masuk ke dompet saya)'
      : 'Catat juga pengeluaran dana dari akun (uang benar-benar keluar dari dompet saya)';
    if (bl) bl.textContent = _dType === 'hutang' ? 'Tanggal Pinjam (terima uang)' : 'Tanggal Beri Pinjaman';
  };
  updateAstxnLabel();
  document.querySelectorAll('#dtog button').forEach(btn => {
    btn.onclick = () => {
      _dType = btn.dataset.t;
      document.querySelectorAll('#dtog button').forEach(b => b.className = '');
      btn.className = _dType === 'hutang' ? 'sel-expense' : 'sel-income';
      updateAstxnLabel();
      const kw = document.getElementById('df-kpr-wrap');
      if (kw) kw.style.display = _dType === 'hutang' ? '' : 'none';
    };
  });
  window._dtypeGetter = () => _dType;
};
window.saveDebt = async function(editId) {
  const type   = window._dtypeGetter ? window._dtypeGetter() : 'hutang';
  const person = document.getElementById('df-person').value.trim();
  const amount = parseAmount(document.getElementById('df-amt').value);
  const paid   = parseAmount(document.getElementById('df-paid').value) ?? 0;
  const borrowDate = document.getElementById('df-borrowdate').value || today();
  const dueDate= document.getElementById('df-due').value || null;
  const note   = document.getElementById('df-note').value.trim();
  const isKPR  = type === 'hutang' && document.getElementById('df-iskpr').checked;
  if (!person || !amount) { toast('Harap isi nama & jumlah dengan benar','error'); return; }
  if (paid > amount) { toast('Jumlah terbayar tidak boleh melebihi total','error'); return; }
  if (dueDate && dueDate < borrowDate) { toast('Jatuh tempo tidak boleh sebelum tanggal pinjam','error'); return; }
  const btn = document.getElementById('df-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try {
    const debtId = editId || newId('debts');
    const data = { type, person, amount, paid, borrowDate, dueDate, note, isKPR };
    const plan = {};
    if (editId) {
      plan.setDebts = [{ id: editId, data }];
      // Sinkron ke transaksi pencairan awal (jumlah, tanggal, nama) supaya saldo akun & Kalender ikut akurat
      const disb = S.transactions.find(t => t.debtId === editId && txnDebtRole(t) === 'disburse');
      if (disb) {
        const desc = (type === 'hutang' ? 'Menerima pinjaman dari ' : 'Memberi pinjaman ke ') + person;
        const upd = {};
        if (disb.amount !== amount) upd.amount = amount;
        if (disb.date !== borrowDate) upd.date = borrowDate;
        if (disb.description !== desc) upd.description = desc;
        if (Object.keys(upd).length) plan.setTxns = [{ id: disb.id, data: upd }];
      }
    } else {
      plan.addDebts = [{ id: debtId, data }];
      // Pencatatan BARU + centang "catat dana ke akun": buat transaksi flow:'hutang' (saldo akurat, statistik riil tidak tercemar).
      // Tanggalnya = Tanggal Pinjam → otomatis muncul di Kalender & Transaksi pada hari itu.
      const astxnBox = document.getElementById('df-astxn');
      if (astxnBox && astxnBox.checked) {
        const accId = document.getElementById('df-acc').value;
        const isHutang = type === 'hutang';
        const cat = await ensureDebtCategory(isHutang ? 'income' : 'expense');
        plan.addTxns = [{ id: newId('transactions'), data: {
          date: borrowDate, amount, categoryId: cat.id, accountId: accId,
          description: (isHutang ? 'Menerima pinjaman dari ' : 'Memberi pinjaman ke ') + person,
          note: '', type: isHutang ? 'income' : 'expense', flow: 'hutang', debtId, debtRole: 'disburse'
        } }];
      }
    }
    await commitPlan(plan);

    // Sinkronkan penanda KPR dgn Pengaturan Tangga Kekayaan Abadi (tangga 6)
    const wl = S.settings.wealthLadder || {};
    if (isKPR) {
      S.settings.wealthLadder = { ...wl, hasKPR:true, kprDebtId:debtId };
      await saveSettings();
    } else if (wl.kprDebtId === debtId) {
      S.settings.wealthLadder = { ...wl, kprDebtId:null };
      await saveSettings();
    }

    toast(editId?'Data diperbarui' + (plan.setTxns ? ' & transaksi terkait disesuaikan' : ''):'Dicatat'); closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Catat';} }
};

// Hapus catatan: pilih hapus catatan saja, atau sekalian semua transaksi terhubung (supaya saldo akun kembali bersih)
window.delDebt = function(id) {
  const d = S.debts.find(x => x.id === id); if (!d) return;
  const linked = S.transactions.filter(t => t.debtId === id);
  openModal(`<div class="confirm-box neu">
    <span class="ci"><i class="fa-solid fa-triangle-exclamation" style="color:var(--expense)"></i></span>
    <h4>Hapus catatan "${esc(d.person)}"?</h4>
    <p>${linked.length
      ? `Ada <b>${linked.length} transaksi</b> yang terhubung (pencairan/cicilan). Jika hanya catatan yang dihapus, transaksi tetap ada di akun & Kalender sebagai arus kas biasa. Jika ikut dihapus, saldo akun kembali seperti sebelum hutang/piutang ini dicatat.`
      : 'Catatan ini tidak punya transaksi terhubung.'}</p>
    <div style="display:flex;gap:9px;justify-content:center;flex-wrap:wrap">
      <button class="btn" onclick="closeModal()">Batal</button>
      <button class="btn btn-danger" onclick="doDelDebt('${id}',false)">Hapus Catatan Saja</button>
      ${linked.length ? `<button class="btn btn-danger" onclick="doDelDebt('${id}',true)">Hapus + ${linked.length} Transaksi</button>` : ''}
    </div>
  </div>`);
};
window.doDelDebt = async function(id, withTxns) {
  closeModal();
  try {
    const plan = { delDebts: [id] };
    if (withTxns) plan.delTxns = S.transactions.filter(t => t.debtId === id).map(t => t.id);
    await commitPlan(plan);
    const wl = S.settings.wealthLadder;
    if (wl && wl.kprDebtId === id) { S.settings.wealthLadder = { ...wl, kprDebtId: null }; await saveSettings(); }
    toast(withTxns ? 'Catatan & transaksi terkait dihapus' : 'Catatan dihapus','info'); renderPage();
  } catch(e) { toast('Gagal menghapus: '+e.message,'error'); }
};

// Riwayat lengkap transaksi yang terhubung ke catatan hutang/piutang ini
// (pencairan awal + semua cicilan) — klik salah satu utk lompat ke Kalender.
window.openDebtHistoryModal = function(id) {
  const d = S.debts.find(x=>x.id===id); if (!d) return;
  const linked = S.transactions.filter(t => t.debtId === id).sort((a,b)=>new Date(a.date)-new Date(b.date));
  openModal(`
  <div class="modal-header"><h3>Riwayat "${esc(d.person)}"</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div style="display:flex;gap:16px;margin-bottom:14px;font-size:12px;color:var(--tx2);flex-wrap:wrap">
      <span><i class="fa-solid fa-calendar-plus" style="color:var(--acc)"></i> Pinjam: ${d.borrowDate?new Date(d.borrowDate+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'—'}</span>
      ${d.dueDate?`<span><i class="fa-solid fa-calendar-day" style="color:var(--expense)"></i> Jatuh tempo: ${new Date(d.dueDate+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</span>`:''}
    </div>
    ${!linked.length ? `<div class="empty-state" style="padding:16px"><p style="font-size:12.5px">Belum ada transaksi tersambung (dana awal tidak dicatat sbg transaksi, atau belum ada cicilan).</p></div>` :
    linked.map(t => `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="closeModal();goToKalenderFiltered('harian',{date:'${t.date}'})">
      <div><div style="font-size:12.5px;font-weight:600">${esc(t.description)}</div><div style="font-size:10.5px;color:var(--txm)">${new Date(t.date+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</div></div>
      <div style="font-weight:700;color:${t.type==='income'?'var(--income)':'var(--expense)'}">${t.type==='income'?'+':'−'}${fmt(t.amount)}</div>
    </div>`).join('')}
    <p style="font-size:10.5px;color:var(--txm);margin-top:10px;text-align:center">Klik salah satu baris untuk lompat ke tanggalnya di Kalender.</p>
  </div>
  <div class="modal-footer">
    <button class="btn" onclick="closeModal();goToTransaksiByDebt('${d.id}')">Lihat di Transaksi</button>
    <button class="btn btn-primary" onclick="closeModal()">Tutup</button>
  </div>`);
};
window.goToTransaksiByDebt = function(debtId) {
  txnFilter = { type:'all', search:'', month:'', categoryId:'', debtId, from:'', to:'' };
  nav('transactions');
};

// Pembayaran sebagian/lunas — pokok dicatat sbg flow:'hutang' (tidak masuk statistik),
// bunga/biaya (jika ada) dicatat TERPISAH sbg flow:'real' (memang pendapatan/pengeluaran riil).
window.openPayDebtModal = function(id) {
  const d = S.debts.find(x=>x.id===id); if (!d) return;
  const remaining = debtRemaining(d);
  const isHutang = d.type === 'hutang';
  openModal(`
  <div class="modal-header"><h3>${isHutang?'Bayar Hutang':'Terima Pembayaran'} — ${esc(d.person)}</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <p style="font-size:12.5px;color:var(--tx2);margin-bottom:14px">Sisa pokok: <b style="color:${isHutang?'var(--expense)':'var(--income)'}">${fmt(remaining)}</b></p>
    <div class="form-group"><label class="form-label">Jumlah Pokok ${isHutang?'Dibayar':'Diterima'}</label><input type="text" class="form-input" id="pd-amt" placeholder="0" inputmode="numeric" value="${groupInt(remaining)}" oninput="liveFormatAmount(this)"></div>
    <div class="form-group"><label class="form-label">${isHutang?'Bunga / Denda':'Bunga / Keuntungan'} <span style="font-weight:400;color:var(--txm)">(opsional, dihitung sbg ${isHutang?'pengeluaran':'pendapatan'} riil)</span></label><input type="text" class="form-input" id="pd-interest" placeholder="0" inputmode="numeric" value="0" oninput="liveFormatAmount(this)"></div>
    <div class="form-group"><label class="form-label">Tanggal</label><input type="date" class="form-input" id="pd-date" value="${today()}"></div>
    <div class="form-group"><label class="form-label">Akun ${isHutang?'Sumber Dana':'Penerima Dana'}</label><select class="form-input" id="pd-acc">${S.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--tx2);cursor:pointer">
      <input type="checkbox" id="pd-astxn" checked style="width:16px;height:16px" onchange="document.getElementById('pd-interest').disabled=!this.checked">
      Catat sebagai transaksi kas nyata (pokok dikecualikan dari statistik, bunga tetap dihitung)
    </label>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="pd-save-btn" onclick="savePayDebt('${id}')">Simpan</button></div>`);
};
window.savePayDebt = async function(id) {
  const d = S.debts.find(x=>x.id===id); if (!d) return;
  const amt = parseAmount(document.getElementById('pd-amt').value);
  const interest = parseAmount(document.getElementById('pd-interest').value) ?? 0;
  const date = document.getElementById('pd-date').value;
  const accId = document.getElementById('pd-acc').value;
  const asTxn = document.getElementById('pd-astxn').checked;
  const remaining = debtRemaining(d);
  if (!amt || amt > remaining) { toast('Jumlah pokok tidak valid (melebihi sisa)','error'); return; }
  if (!date) { toast('Tanggal harus diisi','error'); return; }
  const btn = document.getElementById('pd-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try {
    const isHutang = d.type === 'hutang';
    const newPaid = (d.paid||0) + amt;
    const plan = { setDebts: [{ id, data: { paid: increment(amt) }, local: { paid: newPaid } }] };
    if (asTxn) {
      // Pokok → flow:'hutang' (cuma pergerakan kas, dikecualikan dari statistik)
      const debtCat = await ensureDebtCategory(isHutang ? 'expense' : 'income');
      plan.addTxns = [{ id: newId('transactions'), data: {
        date, description: (isHutang?'Bayar pokok hutang ke ':'Terima pokok piutang dari ')+d.person,
        amount: amt, categoryId: debtCat.id, accountId: accId, note: '',
        type: isHutang?'expense':'income', flow:'hutang', debtId: id, debtRole: 'payment'
      } }];
      // Bunga/biaya (kalau diisi) → flow:'real' (memang pengeluaran/pendapatan riil) di kategori khusus
      if (interest > 0) {
        const realCat = isHutang
          ? await ensureCategoryByName('Bunga/Denda', 'expense', 'fa-percent', '#FF7068')
          : await ensureCategoryByName('Bunga/Keuntungan', 'income', 'fa-percent', '#3DDBA0');
        plan.addTxns.push({ id: newId('transactions'), data: {
          date, description: (isHutang?'Bunga/denda hutang ke ':'Bunga/keuntungan piutang dari ')+d.person,
          amount: interest, categoryId: realCat.id, accountId: accId, note: '',
          type: isHutang?'expense':'income', flow:'real', debtId: id, debtRole: 'interest'
        } });
      }
    }
    await commitPlan(plan);
    if (d.amount - newPaid <= 0) toast(`🎉 ${isHutang?'Hutang':'Piutang'} dengan ${d.person} LUNAS! Dipindah ke Riwayat.`, 'success');
    else toast('Pembayaran dicatat');
    closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent='Simpan';} }
};

/* ── ACCOUNTS ── */
function rAcc(el) {
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <div><h3 style="font-size:17px;font-weight:700">Akun Keuangan</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Kelola dompet, bank, dan e-wallet — pisahkan akun transaksi harian dari tabungan</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="openTransferModal()"><i class="fa-solid fa-right-left"></i> Transfer</button>
      <button class="btn btn-primary btn-sm" onclick="openAccModal()"><i class="fa-solid fa-plus"></i> Tambah Akun</button>
    </div>
  </div>
  <div class="grid-auto">${S.accounts.map(a => {
    const b = accBal(a.id);
    const tl = a.type==='cash'?'Tunai':a.type==='bank'?'Bank':'E-Wallet';
    const purpose = a.purpose || 'transaksi';
    const purposeLabel = { transaksi:'Transaksi Harian', tabungan:'Tabungan', lainnya:'Lainnya' }[purpose];
    const purposeColor = purpose==='tabungan' ? 'var(--income)' : purpose==='transaksi' ? 'var(--acc)' : 'var(--txm)';
    return `<div class="card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:${a.color}0a"></div>
      <div style="display:flex;justify-content:space-between;align-items:start;position:relative;z-index:1">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:46px;height:46px;border-radius:13px;background:${a.color}18;color:${a.color};display:flex;align-items:center;justify-content:center;font-size:19px;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${a.icon}"></i></div>
          <div>
            <div style="font-weight:700;font-size:15px">${esc(a.name)}</div>
            <div style="font-size:11px;color:var(--txm)">${tl}${a.bankName?' · '+esc(a.bankName):''}</div>
            ${a.accountNumber?`<div style="font-size:10.5px;color:var(--txm);font-family:monospace">${esc(a.accountNumber)}</div>`:''}
          </div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" style="width:27px;height:27px" onclick="openAccModal('${a.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
          <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delAcc('${a.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
        </div>
      </div>
      <div style="margin-top:14px;font-family:'Outfit';font-size:24px;font-weight:800;color:${b>=0?'var(--income)':'var(--expense)'};position:relative;z-index:1">${fmt(b)}</div>
      <div style="margin-top:8px;position:relative;z-index:1"><span class="badge" style="background:${purposeColor}18;color:${purposeColor}"><i class="fa-solid ${purpose==='tabungan'?'fa-piggy-bank':purpose==='transaksi'?'fa-cart-shopping':'fa-tag'}" style="font-size:9px"></i> ${purposeLabel}</span></div>
    </div>`;
  }).join('')}</div>`;
}

const ACC_COLORS = ['#4ADE80','#22D3EE','#A78BFA','#FFB830','#FF7068','#EC4899','#FB923C','#7B9EF8'];
const ACC_ICONS  = [['fa-money-bill-wave','Tunai'],['fa-building-columns','Bank'],['fa-mobile-screen','E-Wallet'],['fa-credit-card','Kartu Kredit'],['fa-piggy-bank','Tabungan']];
let _accColor = '#4ADE80';

window.openAccModal = function(editId) {
  const a = editId ? S.accounts.find(x=>x.id===editId) : null;
  _accColor = a ? a.color : ACC_COLORS[0];
  const purpose = a ? (a.purpose||'transaksi') : 'transaksi';
  openModal(`
  <div class="modal-header"><h3>${a?'Edit':'Tambah'} Akun</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Nama Akun</label><input type="text" class="form-input" id="af-name" placeholder="Contoh: BCA Harian / BCA Tabungan" value="${esc(a?a.name:'')}" maxlength="40"></div>
    <div class="form-group"><label class="form-label">Tipe</label><select class="form-input" id="af-icon">${ACC_ICONS.map(([ic,lb])=>`<option value="${ic}"${a&&a.icon===ic?' selected':''}>${lb}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Dipakai untuk apa?</label>
      <div class="type-toggle" id="af-purpose-tog">
        <button class="${purpose==='transaksi'?'sel-active':''}" data-p="transaksi">Transaksi Harian</button>
        <button class="${purpose==='tabungan'?'sel-active':''}" data-p="tabungan">Tabungan</button>
        <button class="${purpose==='lainnya'?'sel-active':''}" data-p="lainnya">Lainnya</button>
      </div>
      <p style="font-size:10.5px;color:var(--txm);margin-top:6px">Penting kalau Anda punya 2 akun bank yang sama (mis. BCA untuk transaksi & BCA lain khusus nabung) — supaya tidak tertukar, terutama utk Tangga Kekayaan Abadi.</p>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Nama Bank/E-Wallet <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="af-bankname" placeholder="Contoh: BCA / DANA" value="${esc(a?a.bankName||'':'')}" maxlength="30"></div>
      <div class="form-group"><label class="form-label">No. Rekening/ATM/HP <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="af-accnum" placeholder="Contoh: 1234567890" value="${esc(a?a.accountNumber||'':'')}" maxlength="30"></div>
    </div>
    <div class="form-group"><label class="form-label">Warna</label><div style="display:flex;gap:7px;flex-wrap:wrap" id="af-colors">${ACC_COLORS.map(cl=>`<div style="width:30px;height:30px;border-radius:8px;background:${cl};cursor:pointer;border:3px solid ${_accColor===cl?'white':'transparent'};transition:all .15s;box-shadow:var(--neu-raised-sm)" onclick="pickAccC(this,'${cl}')"></div>`).join('')}</div></div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="af-save-btn" onclick="saveAcc('${editId||''}')">${a?'Simpan':'Tambah'}</button></div>`);
  let _accPurpose = purpose;
  document.querySelectorAll('#af-purpose-tog button').forEach(btn => {
    btn.onclick = () => { _accPurpose = btn.dataset.p; document.querySelectorAll('#af-purpose-tog button').forEach(b=>b.className=''); btn.className='sel-active'; };
  });
  window._accPurposeGetter = () => _accPurpose;
};
window.pickAccC = function(el, cl) {
  _accColor = cl;
  el.parentElement.querySelectorAll('div').forEach(d => d.style.borderColor = 'transparent');
  el.style.borderColor = 'white';
};
window.saveAcc = async function(editId) {
  const name = document.getElementById('af-name').value.trim();
  const icon = document.getElementById('af-icon').value;
  const type = icon==='fa-money-bill-wave'?'cash':icon==='fa-building-columns'?'bank':'ewallet';
  const purpose = window._accPurposeGetter ? window._accPurposeGetter() : 'transaksi';
  const bankName = document.getElementById('af-bankname').value.trim();
  const accountNumber = document.getElementById('af-accnum').value.trim();
  if (!name) { toast('Nama akun harus diisi','error'); return; }
  const btn = document.getElementById('af-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try { await fbSaveAcc({name,icon,color:_accColor,type,purpose,bankName,accountNumber}, editId||null); toast(editId?'Akun diperbarui':'Akun ditambahkan'); closeModal(); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delAcc = function(id) {
  if (S.accounts.length <= 1) { toast('Minimal harus ada 1 akun','error'); return; }
  if (S.transactions.some(t => t.accountId === id)) { toast('Tidak bisa menghapus akun yang memiliki transaksi','error'); return; }
  confirmDel('Hapus akun ini?', async () => {
    try {
      await fbDelAcc(id);
      if (S.settings.wealthLadder?.savingsAccountId === id) {
        S.settings.wealthLadder = { ...S.settings.wealthLadder, savingsAccountId:null };
        await saveSettings();
      }
      toast('Akun dihapus','info'); renderPage();
    } catch(e) { toast('Gagal','error'); }
  });
};

/* ── TANGGA KEKAYAAN ABADI: aktivasi/nonaktivasi ── */
window.openLadderActivationModal = function() {
  const hutangDebts = S.debts.filter(d => d.type==='hutang');
  const savingsAccs = S.accounts.filter(a => (a.purpose||'transaksi')==='tabungan');
  const otherAccs = S.accounts.filter(a => (a.purpose||'transaksi')!=='tabungan');
  openModal(`
  <div class="modal-header"><h3><i class="fa-solid fa-crown" style="color:var(--gold);margin-right:6px"></i>Aktifkan Template Kekayaan Abadi</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <p style="font-size:12.5px;color:var(--tx2);margin-bottom:16px">Ini akan menambahkan <b>7 target tangga</b> ke halaman <b>Impian & Tabungan</b>. Progres setiap tangga dihitung otomatis dari data Anda yang sebenarnya (saldo, hutang, transaksi) — bukan yang bisa Anda tandai selesai sendiri.</p>

    <div style="padding:12px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);margin-bottom:14px">
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--tx2);cursor:pointer;margin-bottom:8px">
        <input type="checkbox" id="wl-hassavings" style="width:16px;height:16px" ${savingsAccs.length?'checked':''} onchange="document.getElementById('wl-savings-sel').style.display=this.checked?'':'none'">
        Untuk saat ini, apakah Anda punya akun tabungan terpisah?
      </label>
      <div id="wl-savings-sel" style="display:${savingsAccs.length?'':'none'}">
        <select class="form-input" id="wl-savingsacc">
          ${savingsAccs.length?`<optgroup label="Akun bertanda Tabungan">${savingsAccs.map(a=>`<option value="${a.id}">${esc(a.name)}${a.bankName?' — '+esc(a.bankName):''}</option>`).join('')}</optgroup>`:''}
          ${otherAccs.length?`<optgroup label="Akun lain">${otherAccs.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</optgroup>`:''}
        </select>
        <p style="font-size:10.5px;color:var(--txm);margin-top:6px">Nabung Cash 10 Juta akan dihitung dari SALDO AKUN INI SAJA — bukan total semua akun — supaya gajian yang lewat untuk transaksi harian tidak ikut kehitung sbg tabungan.</p>
      </div>
      <p id="wl-noacc-note" style="font-size:10.5px;color:var(--txm);${savingsAccs.length?'display:none':''}">Kalau belum ada / dilewati, tangga 1 akan minta Anda menghubungkan akun nanti (bisa kapan saja lewat halaman ini).</p>
    </div>

    <div class="form-group"><label class="form-label">Target Dana Pendidikan Anak (tangga 5) <span style="font-weight:400;color:var(--txm)">(bisa diubah nanti)</span></label><input type="text" class="form-input" id="wl-edu" placeholder="Contoh: 50.000.000" inputmode="numeric" oninput="liveFormatAmount(this)"></div>
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--tx2);cursor:pointer;margin-bottom:8px">
      <input type="checkbox" id="wl-haskpr" style="width:16px;height:16px" onchange="document.getElementById('wl-kpr-sel').style.display=this.checked?'':'none'">
      Saya punya KPR (Kredit Pemilikan Rumah) — tangga 6
    </label>
    <div id="wl-kpr-sel" style="display:none;margin-bottom:6px">
      <select class="form-input" id="wl-kprdebt">
        <option value="">— Pilih dari Hutang yang sudah dicatat —</option>
        ${hutangDebts.map(d=>`<option value="${d.id}">${esc(d.person)} (${fmt(d.amount)})</option>`).join('')}
      </select>
      <p style="font-size:10.5px;color:var(--txm);margin-top:6px">Belum ada di daftar? Catat dulu di halaman Hutang & Piutang dengan centang "Ini KPR", nanti otomatis tersambung.</p>
    </div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="confirmActivateLadder()">Aktifkan</button></div>`);
};
window.confirmActivateLadder = function() {
  const eduTarget = parseAmount(document.getElementById('wl-edu').value) || 0;
  const hasKPR = document.getElementById('wl-haskpr').checked;
  const kprDebtId = hasKPR ? (document.getElementById('wl-kprdebt').value || null) : null;
  const hasSavings = document.getElementById('wl-hassavings').checked;
  const savingsAccountId = hasSavings ? (document.getElementById('wl-savingsacc').value || null) : null;
  closeModal();
  confirmAction(
    'Fitur ini akan melacak progres Anda secara otomatis dan tidak bisa ditandai selesai secara manual. Aktifkan Template Kekayaan Abadi sekarang?',
    async () => { await activateWealthLadder(eduTarget, hasKPR, kprDebtId, savingsAccountId); },
    { icon:'fa-crown', title:'Konfirmasi Aktivasi', okLabel:'Ya, Aktifkan' }
  );
};
async function activateWealthLadder(eduTarget, hasKPR, kprDebtId, savingsAccountId) {
  try {
    for (const m of LADDER_META) {
      if (S.goals.some(g => g.ladderStep === m.step)) continue;
      const data = { name:`Tangga ${m.step}: ${m.title}`, icon:m.icon, color:m.color, ladderStep:m.step, autoTrack:true,
        target: m.step===1?10000000:(m.step===5?eduTarget:0), current:0, deadline:'' };
      await fbSaveGoal(data, null);
    }
    S.settings.wealthLadder = { enabled:true, hasKPR, kprDebtId, savingsAccountId, activatedAt: today() };
    await saveSettings();
    toast('Template Kekayaan Abadi diaktifkan! 🎉','success');
    nav('goals');
  } catch(e) { toast('Gagal mengaktifkan: '+e.message,'error'); }
}
// Hubungkan/ganti akun tabungan kapan saja — dipakai baik saat aktivasi maupun belakangan dari tangga 1
window.openConnectSavingsAccModal = function() {
  const savingsAccs = S.accounts.filter(a => (a.purpose||'transaksi')==='tabungan');
  const otherAccs = S.accounts.filter(a => (a.purpose||'transaksi')!=='tabungan');
  if (!S.accounts.length) { toast('Belum ada akun sama sekali. Buat akun dulu di halaman Akun.','error'); return; }
  openModal(`
  <div class="modal-header"><h3>Hubungkan Akun Tabungan</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Pilih Akun</label>
      <select class="form-input" id="cs-acc">
        ${savingsAccs.length?`<optgroup label="Akun bertanda Tabungan">${savingsAccs.map(a=>`<option value="${a.id}">${esc(a.name)}${a.bankName?' — '+esc(a.bankName):''}</option>`).join('')}</optgroup>`:''}
        ${otherAccs.length?`<optgroup label="Akun lain">${otherAccs.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</optgroup>`:''}
      </select>
    </div>
    <p style="font-size:10.5px;color:var(--txm)">Tips: tandai akun ini sbg "Tabungan" di halaman Akun supaya tidak tertukar dengan akun transaksi harian.</p>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="saveConnectSavingsAcc()">Hubungkan</button></div>`);
};
window.saveConnectSavingsAcc = async function() {
  const accId = document.getElementById('cs-acc').value;
  try {
    S.settings.wealthLadder = { ...(S.settings.wealthLadder||{}), savingsAccountId: accId };
    await saveSettings();
    toast('Akun tabungan terhubung'); closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); }
};
window.deactivateWealthLadder = function() {
  confirmDel('Nonaktifkan Template Kekayaan Abadi? Semua 7 target tangga akan dihapus dari Impian & Tabungan (tabungan Dana Darurat/Pendidikan yang sudah terkumpul juga ikut hilang).', async () => {
    try {
      const ladderGoals = S.goals.filter(g => g.ladderStep);
      for (const g of ladderGoals) await fbDelGoal(g.id);
      S.settings.wealthLadder = { enabled:false, hasKPR:null, kprDebtId:null };
      await saveSettings();
      toast('Template dinonaktifkan','info'); renderPage();
    } catch(e) { toast('Gagal: '+e.message,'error'); }
  });
};
// Tombol "Update" per tangga — HANYA memicu hitung ulang dari data asli + tampilkan
// penjelasan sumber angkanya. Tidak pernah menandai selesai hanya karena diklik.
window.recheckLadderStep = function(goalId) {
  const g = S.goals.find(x=>x.id===goalId); if (!g) return;
  const p = computeLadderProgress(g);
  openModal(`
  <div class="modal-header"><h3>Cek Ulang: ${esc(g.name)}</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:34px;font-weight:900;font-family:'Outfit';color:${p.done?'var(--income)':'var(--gold)'}">${p.pct.toFixed(0)}%</div>
      <span class="badge" style="background:${p.done?'var(--income-l)':'var(--gold-l)'};color:${p.done?'var(--income)':'var(--gold)'}">${p.done?'✅ Tercapai':'🔄 Berjalan'}</span>
    </div>
    <p style="font-size:12.5px;color:var(--tx2);line-height:1.6">${p.detail}</p>
    <p style="font-size:10.5px;color:var(--txm);margin-top:12px">Angka ini dihitung langsung dari data Anda saat ini (bukan klaim manual) — akan berubah otomatis begitu Anda mencatat transaksi/hutang/tabungan baru.</p>
    ${p.needsCategory?`<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="closeModal();quickCreateInvestCategory()">Buat Kategori "Investasi" Sekarang</button>`:''}
    ${p.needsKpr?`<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="closeModal();nav('debts')">Ke Halaman Hutang</button>`:''}
    ${p.needsTarget?`<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="closeModal();openGoalModal('${g.id}')">Set Target Sekarang</button>`:''}
    ${p.needsAccount?`<button class="btn btn-primary btn-sm" style="margin-top:10px" onclick="closeModal();openConnectSavingsAccModal()">Hubungkan Akun Tabungan</button>`:''}
  </div>
  <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal();renderPage()">Tutup</button></div>`);
};
window.quickCreateInvestCategory = async function() {
  try { await ensureCategoryByName('Investasi','expense','fa-chart-line','#22D3EE'); toast('Kategori "Investasi" dibuat. Mulai catat transaksi investasi Anda!'); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); }
};

/* ── GOALS ── */
function rGoal(el) {
  const ladderGoals = S.goals.filter(g => g.ladderStep).sort((a,b)=>a.ladderStep-b.ladderStep);
  const normalGoals = S.goals.filter(g => !g.ladderStep);
  const ladderOn = !!S.settings.wealthLadder?.enabled;

  el.innerHTML = `
  ${ladderOn && ladderGoals.length ? `
  <div class="card" style="margin-bottom:22px;position:relative;overflow:hidden">
    <div style="position:absolute;top:-50px;right:-50px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(255,184,48,0.1) 0%,transparent 70%)"></div>
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:4px;position:relative">
      <i class="fa-solid fa-crown" style="color:var(--gold);font-size:17px"></i>
      <h3 style="font-size:16px;font-weight:800">Tangga Kekayaan Abadi</h3>
    </div>
    <p style="font-size:11.5px;color:var(--txm);margin-bottom:18px">Progres dihitung otomatis dari data Anda — klik "Cek" untuk melihat sumber angkanya.</p>
    <div class="ladder-track">
      ${ladderGoals.map((g,i) => {
        const p = computeLadderProgress(g);
        const statusColor = p.done ? 'var(--income)' : (p.pct>0 ? 'var(--gold)' : 'var(--txm)');
        return `<div class="ladder-step${p.done?' done':''}">
          <div class="ladder-step-num" style="background:${p.done?'var(--income)':'var(--bg)'};color:${p.done?'#fff':statusColor};box-shadow:${p.done?'0 0 0 3px var(--income-l)':'var(--neu-raised-sm)'}">${p.done?'<i class="fa-solid fa-check"></i>':g.ladderStep}</div>
          <div class="ladder-step-body">
            <div style="display:flex;justify-content:space-between;align-items:start;gap:10px;flex-wrap:wrap">
              <div>
                <div style="font-weight:700;font-size:13.5px"><i class="fa-solid ${g.icon}" style="color:${g.color};margin-right:6px"></i>${esc(g.name.replace(/^Tangga \d+: /,''))}</div>
                <div style="font-size:11px;color:var(--txm);margin-top:2px">${p.pct.toFixed(0)}% · ${fmt(p.actual)} / ${fmt(p.target)}</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
                ${[3,5].includes(g.ladderStep)&&!p.done?`<button class="btn btn-sm" style="padding:5px 10px" onclick="addToGoal('${g.id}')"><i class="fa-solid fa-plus"></i></button>`:''}
                <button class="btn btn-sm" style="padding:5px 10px" onclick="recheckLadderStep('${g.id}')"><i class="fa-solid fa-magnifying-glass"></i> Cek</button>
              </div>
            </div>
            <div class="progress-bar" style="margin-top:8px"><div class="progress-fill" style="width:${p.pct}%;background:${statusColor}"></div></div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>` : ''}

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <div><h3 style="font-size:17px;font-weight:700">Impian & Tabungan</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Pantau progres tujuan keuangan Anda</p></div>
    <button class="btn btn-primary btn-sm" onclick="openGoalModal()"><i class="fa-solid fa-plus"></i> Tambah Target</button>
  </div>
  <div class="grid-auto" id="goal-grid"></div>`;

  const grid = document.getElementById('goal-grid');
  if (!normalGoals.length) { grid.innerHTML='<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-bullseye"></i><p>Belum ada target tabungan/impian. Mulai rencanakan sekarang!</p></div>'; return; }

  grid.innerHTML = normalGoals.map(g => {
    const pct  = g.target>0 ? Math.min((g.current/g.target)*100, 100) : 0;
    const rem  = g.target - g.current;
    const dl   = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 864e5)) : null;
    const r    = 33, circ = 2*Math.PI*r, off = circ - (pct/100)*circ;
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div style="display:flex;align-items:center;gap:14px">
          <div class="goal-ring">
            <svg width="72" height="72"><circle cx="36" cy="36" r="${r}" fill="none" stroke="${getTheme()==='dark'?'rgba(80,88,120,0.3)':'rgba(182,186,196,0.35)'}" stroke-width="5"/><circle cx="36" cy="36" r="${r}" fill="none" stroke="${g.color}" stroke-width="5" stroke-dasharray="${circ}" stroke-dashoffset="${off}" stroke-linecap="round"/></svg>
            <div class="goal-pct" style="color:${g.color}">${pct.toFixed(0)}%</div>
          </div>
          <div>
            <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:7px"><i class="fa-solid ${g.icon}" style="color:${g.color}"></i> ${esc(g.name)}</div>
            <div style="font-size:12.5px;color:var(--tx2);margin-top:3px">${fmt(g.current)} dari ${fmt(g.target)}</div>
            <div style="font-size:11px;color:var(--txm);margin-top:2px">Sisa ${fmt(rem)}${dl!==null?' · '+dl+' hari lagi':''}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn-icon" style="width:27px;height:27px" onclick="openGoalModal('${g.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
          <button class="btn-icon" style="width:27px;height:27px;color:var(--gold)" onclick="addToGoal('${g.id}')" title="Tambah tabungan"><i class="fa-solid fa-plus" style="font-size:9px"></i></button>
          <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delGoal('${g.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

const GOAL_ICONS  = ['fa-shield','fa-plane','fa-laptop','fa-house','fa-car','fa-graduation-cap','fa-ring','fa-baby','fa-motorcycle','fa-heart'];
const GOAL_COLORS = ['#3DDBA0','#22D3EE','#FFB830','#A78BFA','#FF7068','#EC4899','#4ADE80','#7B9EF8'];
let _goalIcon = 'fa-shield', _goalColor = '#3DDBA0';

window.openGoalModal = function(editId) {
  const g = editId ? S.goals.find(x=>x.id===editId) : null;
  _goalIcon = g?g.icon:GOAL_ICONS[0]; _goalColor = g?g.color:GOAL_COLORS[0];
  openModal(`
  <div class="modal-header"><h3>${g?'Edit':'Tambah'} Target</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Nama Target</label><input type="text" class="form-input" id="gf-name" placeholder="Contoh: Dana Darurat" value="${esc(g?g.name:'')}" maxlength="40"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Jumlah Target</label><input type="text" class="form-input" id="gf-target" placeholder="0" inputmode="numeric" value="${g?groupInt(g.target):''}" oninput="liveFormatAmount(this)"></div>
      <div class="form-group"><label class="form-label">Sudah Terkumpul</label><input type="text" class="form-input" id="gf-cur" placeholder="0" inputmode="numeric" value="${g?groupInt(g.current):'0'}" oninput="liveFormatAmount(this)"></div>
    </div>
    <div class="form-group"><label class="form-label">Deadline</label><input type="date" class="form-input" id="gf-dl" value="${g?g.deadline:''}"></div>
    <div class="form-group"><label class="form-label">Ikon</label><div style="display:flex;gap:6px;flex-wrap:wrap">${GOAL_ICONS.map(ic=>`<div style="width:34px;height:34px;border-radius:8px;background:var(--bg);box-shadow:var(--neu-raised-sm);display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid ${_goalIcon===ic?'var(--acc)':'transparent'}" onclick="pickGI(this,'${ic}')"><i class="fa-solid ${ic}" style="font-size:12px"></i></div>`).join('')}</div></div>
    <div class="form-group"><label class="form-label">Warna</label><div style="display:flex;gap:6px;flex-wrap:wrap">${GOAL_COLORS.map(cl=>`<div style="width:28px;height:28px;border-radius:6px;background:${cl};cursor:pointer;border:2px solid ${_goalColor===cl?'white':'transparent'};box-shadow:var(--neu-raised-sm)" onclick="pickGC(this,'${cl}')"></div>`).join('')}</div></div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="gf-save-btn" onclick="saveGoal('${editId||''}')">${g?'Simpan':'Tambah'}</button></div>`);
};
window.pickGI = (el,ic) => { _goalIcon=ic; el.parentElement.querySelectorAll('div').forEach(d=>d.style.borderColor='transparent'); el.style.borderColor='var(--acc)'; };
window.pickGC = (el,cl) => { _goalColor=cl; el.parentElement.querySelectorAll('div').forEach(d=>d.style.borderColor='transparent'); el.style.borderColor='white'; };
window.saveGoal = async function(editId) {
  const name=document.getElementById('gf-name').value.trim();
  const target=parseAmount(document.getElementById('gf-target').value);
  const current=parseAmount(document.getElementById('gf-cur').value) ?? 0;
  const deadline=document.getElementById('gf-dl').value;
  if(!name||!target){toast('Isi nama dan jumlah target dengan benar','error');return}
  const btn = document.getElementById('gf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try { await fbSaveGoal({name,target,current,deadline,icon:_goalIcon,color:_goalColor},editId||null); toast(editId?'Target diperbarui':'Target ditambahkan'); closeModal();renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.addToGoal = function(id) {
  openModal(`<div class="modal-header"><h3>Tambah Tabungan</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body"><div class="form-group"><label class="form-label">Jumlah</label><input type="text" class="form-input" id="gf-add" placeholder="0" inputmode="numeric" oninput="liveFormatAmount(this)"></div></div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" onclick="doAddGoal('${id}')">Tambah</button></div>`);
};
window.doAddGoal = async function(id) {
  const amt = parseAmount(document.getElementById('gf-add').value);
  if(!amt){toast('Masukkan jumlah valid','error');return}
  const g = S.goals.find(x=>x.id===id);
  if(g){
    // Tangga Dana Darurat (target dihitung otomatis, tersimpan 0) tidak boleh dibatasi oleh target tersimpan.
    const cap = g.target > 0 ? g.target : Infinity;
    const newCur = Math.min((g.current||0) + amt, cap);
    const justReached = g.target > 0 && (g.current||0) < g.target && newCur >= g.target;
    try { await fbSaveGoal({ current: newCur }, id); }   // hanya field 'current' — tidak lagi menyelipkan field 'id' ke dokumen
    catch(e) { toast('Gagal menyimpan: '+e.message,'error'); return; }
    closeModal(); renderPage();
    if (justReached) { spawnConfetti(); toast(`🎉 Target "${g.name}" tercapai! Selamat!`, 'success'); }
    else toast('Tabungan ditambahkan');
  }
};
window.delGoal = function(id) {
  confirmDel('Hapus target tabungan ini?', async ()=>{ await fbDelGoal(id); toast('Target dihapus','info'); renderPage(); });
};

/* ── TARGET BERKALA (Harian / Bulanan / Tahunan) ──
   mode 'nominal'  → progres OTOMATIS dihitung dari transaksi asli (sinkron, bukan manual)
   mode 'checklist'→ target bebas (jadwal/kebiasaan), ditandai selesai manual per periode */
const TARGET_TABS = [
  { id:'harian',   label:'Harian',   icon:'fa-sun' },
  { id:'mingguan', label:'Mingguan', icon:'fa-calendar-week' },
  { id:'bulanan',  label:'Bulanan',  icon:'fa-calendar-days' },
  { id:'tahunan',  label:'Tahunan',  icon:'fa-calendar' }
];
function rTargets(el) {
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div><h3 style="font-size:17px;font-weight:700">Target Berkala</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Klik tanggal/minggu/bulan/tahun untuk lihat & isi target periode itu — rekap berjenjang harian → mingguan → bulanan → tahunan</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="openBulkChecklistModal()"><i class="fa-solid fa-list-ul"></i> Tambah Banyak</button>
      <button class="btn btn-primary btn-sm" onclick="openTargetModal()"><i class="fa-solid fa-plus"></i> Tambah Target</button>
    </div>
  </div>
  <div class="type-toggle" id="target-tabs" style="max-width:520px;margin-bottom:18px">
    ${TARGET_TABS.map(t=>`<button class="${_targetTab===t.id?'sel-active':''}" data-tab="${t.id}"><i class="fa-solid ${t.icon}" style="margin-right:5px;font-size:10px"></i>${t.label}</button>`).join('')}
  </div>
  <div class="grid-auto" id="target-grid"></div>`;

  document.querySelectorAll('#target-tabs button').forEach(b => {
    b.onclick = () => { _targetTab = b.dataset.tab; renderPage(); };
  });
  fillTargetGrid();
}

function fillTargetGrid() {
  if (_targetTab === 'harian')   return fillTargetHarian();
  if (_targetTab === 'mingguan') return fillTargetMingguan();
  if (_targetTab === 'bulanan')  return fillTargetBulanan();
  return fillTargetTahunan();
}

// Kartu rekap (x/y target tercapai + bar) — dipakai di semua tab
function recapCardHtml(label, icon, r) {
  if (!r) return '';
  const pct = Math.round(r.done / r.total * 100);
  const color = pct >= 80 ? 'var(--income)' : pct >= 50 ? 'var(--gold)' : 'var(--expense)';
  return `<div class="card" style="grid-column:1/-1">
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div class="stat-icon" style="background:var(--acc-l);color:${color};width:38px;height:38px;font-size:15px"><i class="fa-solid ${icon}"></i></div>
      <div style="flex:1;min-width:200px">
        <div style="font-size:12.5px"><b>${label}</b> ${r.done}/${r.total} target tercapai <span style="color:${color};font-weight:800">(${pct}%)</span></div>
        <div class="progress-bar" style="margin-top:7px"><div class="progress-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>
    </div></div>`;
}
function targetStatusBadge(t, ev) {
  const B = (bg, c, txt, ic) => `<span class="badge" style="background:${bg};color:${c}">${ic?`<i class="fa-solid ${ic}"></i> `:''}${txt}</span>`;
  if (ev.state === 'future') return B('var(--bg2)', 'var(--txm)', 'Belum dimulai', 'fa-hourglass-start');
  const isBatas = t.mode === 'nominal' && t.basis !== 'kategori' && t.goalType === 'batas';
  if (isBatas) {
    if (!ev.hasData) return B('var(--bg2)', 'var(--txm)', 'Belum ada data', 'fa-circle-minus');
    return ev.achieved ? B('var(--income-l)', 'var(--income)', ev.state === 'past' ? 'Tercapai' : 'Aman', 'fa-check') : B('var(--expense-l)', 'var(--expense)', 'Melebihi batas', 'fa-triangle-exclamation');
  }
  if (ev.achieved) return B('var(--income-l)', 'var(--income)', 'Tercapai', 'fa-check');
  return ev.state === 'past' ? B('var(--expense-l)', 'var(--expense)', 'Terlewat', 'fa-xmark') : B('var(--gold-l)', 'var(--gold)', 'Berjalan', 'fa-spinner');
}

/* ── HARIAN: pilih tanggal spesifik (Senin–Minggu per minggu), jadwal & target dievaluasi utk tanggal itu ── */
function fillTargetHarian() {
  const grid = document.getElementById('target-grid'); if (!grid) return;
  const wsMon = weekStartOf(_targetHarianDate);
  const days = daysOfWeekKeys(wsMon);
  const DOWSHORT = ['Sen','Sel','Rab','Kam','Jum','Sab','Min'];
  const monthLabel = fmtDate(_targetHarianDate, {month:'long',year:'numeric'});

  const navHtml = `
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:12px">
      <button class="btn-icon" onclick="targetHarianShiftWeek(-1)"><i class="fa-solid fa-chevron-left"></i></button>
      <b style="font-family:'Outfit'">${monthLabel}</b>
      <button class="btn-icon" onclick="targetHarianShiftWeek(1)"><i class="fa-solid fa-chevron-right"></i></button>
      ${_targetHarianDate !== today() ? `<button class="btn btn-sm" onclick="targetHarianSelectDate('${today()}')">Hari ini</button>` : ''}
    </div>
    <div class="target-week-grid" style="display:grid;gap:6px;margin-bottom:16px">
      ${days.map((d,i)=>{
        const isSel = d === _targetHarianDate;
        const isToday = d === today();
        const dnum = new Date(d+'T00:00:00').getDate();
        const s = recapFor('harian', [d]);
        const dot = s ? (s.done === s.total ? 'var(--income)' : (periodState('harian',d)==='past' ? 'var(--expense)' : 'var(--gold)')) : null;
        return `<div onclick="targetHarianSelectDate('${d}')" style="text-align:center;padding:10px 4px;border-radius:10px;cursor:pointer;background:${isSel?'var(--acc)':'var(--bg)'};color:${isSel?'#fff':'var(--tx)'};border:1px solid ${isToday&&!isSel?'var(--acc)':'var(--border)'};box-shadow:var(--neu-raised-sm)">
          <div style="font-size:10px;font-weight:700;opacity:.8">${DOWSHORT[i]}</div>
          <div style="font-size:15px;font-weight:800;margin-top:3px">${dnum}</div>
          <div style="height:5px;margin-top:4px">${dot?`<span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${isSel?'#fff':dot}"></span>`:''}</div>
        </div>`;
      }).join('')}
    </div>`;

  const dateStr = _targetHarianDate;
  const dateLabel = fmtDate(dateStr, {weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const allHarian = S.targets.filter(t => t.period === 'harian');
  const jadwalList = allHarian.filter(t => t.mode === 'jadwal');
  const others = allHarian.filter(t => t.mode !== 'jadwal' && targetAppliesToDate(t, dateStr));
  const shown = jadwalList.length + others.length;

  grid.innerHTML = `<div style="grid-column:1/-1">${navHtml}
    <div style="font-weight:700;font-size:13px;color:var(--tx2);margin-bottom:10px">${dateStr===today()?'📍 Hari Ini — ':''}${dateLabel}</div>
  </div>` + recapCardHtml('Hari ini:', 'fa-bullseye', recapFor('harian', [dateStr])) +
    (!allHarian.length ? `<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-list-check"></i><p>Belum ada target harian. Bisa Nominal, Checklist, atau Jadwal (jam per jam — bisa disetel beda tiap hari kalau perlu).</p></div>` :
    !shown ? `<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-calendar-xmark"></i><p>Tidak ada target yang dijadwalkan utk hari ini. Ada target lain yang dikhususkan utk hari/tanggal lain.</p></div>` :
    jadwalList.map(t => renderJadwalCardForDate(t, dateStr)).join('') + others.map(t => renderTargetCardForKey(t, dateStr)).join(''));
}
window.targetHarianShiftWeek = function(dir) {
  const d = new Date(_targetHarianDate+'T00:00:00'); d.setDate(d.getDate()+dir*7);
  _targetHarianDate = localDateStr(d); fillTargetHarian();
};
window.targetHarianSelectDate = function(d) { _targetHarianDate = d; fillTargetHarian(); };

/* ── MINGGUAN: pilih bulan dulu, lalu salah satu minggu di bulan itu — rekap harian minggu terpilih ── */
function fillTargetMingguan() {
  const grid = document.getElementById('target-grid'); if (!grid) return;
  const { y, m } = _targetMingguMonth;
  const weeks = weeksInMonth(y, m);
  if (!weeks.includes(_targetMingguKey)) _targetMingguKey = weeks[0];
  const navHtml = `
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px">
      <button class="btn-icon" onclick="targetMingguShiftMonth(-1)"><i class="fa-solid fa-chevron-left"></i></button>
      <b style="font-family:'Outfit'">${MO_FULL[m-1]} ${y}</b>
      <button class="btn-icon" onclick="targetMingguShiftMonth(1)"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">
      ${weeks.map((wk,i) => {
        const end = new Date(wk+'T00:00:00'); end.setDate(end.getDate()+6);
        const isSel = wk === _targetMingguKey;
        return `<button class="btn ${isSel?'btn-primary':''} btn-sm" onclick="targetMingguSelectWeek('${wk}')">Minggu ${i+1}: ${fmtDate(wk,{day:'numeric',month:'short'})}–${end.toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</button>`;
      }).join('')}
    </div>`;

  const list = S.targets.filter(t => t.period === 'mingguan');
  const pKey = _targetMingguKey;
  grid.innerHTML = `<div style="grid-column:1/-1">${navHtml}</div>` +
    recapCardHtml('Rekap Harian minggu ini:', 'fa-layer-group', rekapHarianUntukMinggu(pKey)) +
    recapCardHtml('Target mingguan terpilih:', 'fa-bullseye', recapFor('mingguan', [pKey])) +
    (!list.length ? `<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-list-check"></i><p>Belum ada target mingguan. Contoh: "Gym 1x/minggu", "Invest 20% dari income Ngojol".</p></div>` :
    list.map(t => renderTargetCardForKey(t, pKey)).join(''));
}
window.targetMingguShiftMonth = function(dir) {
  let { y, m } = _targetMingguMonth; m += dir; if (m<1){m=12;y--;} if(m>12){m=1;y++;}
  _targetMingguMonth = { y, m };
  _targetMingguKey = weeksInMonth(y,m)[0];
  fillTargetMingguan();
};
window.targetMingguSelectWeek = function(wk) { _targetMingguKey = wk; fillTargetMingguan(); };

/* ── BULANAN: pilih tahun dulu, lalu salah satu dari 12 bulan — plus rekap mingguan bulan itu ── */
function fillTargetBulanan() {
  const grid = document.getElementById('target-grid'); if (!grid) return;
  const y = _targetBulanYear;
  const navHtml = `
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px">
      <button class="btn-icon" onclick="targetBulanShiftYear(-1)"><i class="fa-solid fa-chevron-left"></i></button>
      <b style="font-family:'Outfit'">${y}</b>
      <button class="btn-icon" onclick="targetBulanShiftYear(1)"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="target-month-grid" style="display:grid;gap:8px;margin-bottom:14px">
      ${MO_FULL.map((label,i)=>{
        const mk = `${y}-${String(i+1).padStart(2,'0')}`;
        const isSel = mk === _targetBulanKey;
        return `<button class="btn ${isSel?'btn-primary':''} btn-sm" style="justify-content:center" onclick="targetBulanSelectMonth('${mk}')">${MO[i]}</button>`;
      }).join('')}
    </div>`;
  const [selY, selM] = _targetBulanKey.split('-').map(Number);
  const list = S.targets.filter(t => t.period === 'bulanan');
  grid.innerHTML = `<div style="grid-column:1/-1">${navHtml}</div>` +
    recapCardHtml(`Rekap Mingguan ${MO_FULL[selM-1]} ${selY}:`, 'fa-layer-group', rekapMingguanUntukBulan(selY, selM)) +
    recapCardHtml('Target bulanan terpilih:', 'fa-bullseye', recapFor('bulanan', [_targetBulanKey])) +
    (!list.length ? `<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-list-check"></i><p>Belum ada target bulanan. Contoh: "Income 3jt kotor".</p></div>` :
    list.map(t => renderTargetCardForKey(t, _targetBulanKey)).join(''));
}
window.targetBulanShiftYear = function(dir) {
  _targetBulanYear += dir; _targetBulanKey = `${_targetBulanYear}-${_targetBulanKey.split('-')[1]}`; fillTargetBulanan();
};
window.targetBulanSelectMonth = function(mk) { _targetBulanKey = mk; fillTargetBulanan(); };

/* ── TAHUNAN: pilih tahun — evaluasi apa saja yang tercapai tahun itu, plus rekap bulanan ── */
function fillTargetTahunan() {
  const grid = document.getElementById('target-grid'); if (!grid) return;
  const y = _targetTahunYear;
  const navHtml = `
    <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px">
      <button class="btn-icon" onclick="targetTahunShift(-1)"><i class="fa-solid fa-chevron-left"></i></button>
      <b style="font-family:'Outfit';font-size:20px">${y}</b>
      <button class="btn-icon" onclick="targetTahunShift(1)"><i class="fa-solid fa-chevron-right"></i></button>
    </div>`;
  const list = S.targets.filter(t => t.period === 'tahunan');
  grid.innerHTML = `<div style="grid-column:1/-1">${navHtml}</div>` +
    recapCardHtml(`Rekap Bulanan ${y}:`, 'fa-layer-group', rekapBulananUntukTahun(y)) +
    recapCardHtml('Target tahunan:', 'fa-bullseye', recapFor('tahunan', [String(y)])) +
    (!list.length ? `<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-list-check"></i><p>Belum ada target tahunan. Contoh: "Tercapai tabungan 10jt".</p></div>` :
    list.map(t => renderTargetCardForKey(t, String(y))).join(''));
}
window.targetTahunShift = function(dir) { _targetTahunYear += dir; fillTargetTahunan(); };

// ── Kartu generik Nominal/Checklist utk PERIODE MANAPUN ──
function scopeLabel(t) {
  if (t.period !== 'harian') return '';
  if (t.specificDate) return `<span class="badge" style="background:var(--gold-l);color:var(--gold);font-size:9px;margin-left:6px"><i class="fa-solid fa-calendar-day" style="font-size:8px"></i> ${fmtDate(t.specificDate,{day:'numeric',month:'short'})} saja</span>`;
  if (t.daysOfWeek && t.daysOfWeek.length) return `<span class="badge" style="background:var(--acc-l);color:var(--acc);font-size:9px;margin-left:6px">${t.daysOfWeek.map(d=>DOW_LABELS[d]).join(',')}</span>`;
  return '';
}
function renderTargetCardForKey(t, pKey) {
  const ev = targetEvalForKey(t, pKey);
  const actions = `<div style="display:flex;gap:4px">
      <button class="btn-icon" style="width:27px;height:27px" onclick="openTargetModal('${t.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
      <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delTarget('${t.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
    </div>`;
  if (t.mode === 'nominal') {
    const p = ev.p;
    const isBatas = t.basis !== 'kategori' && t.goalType === 'batas';
    const exceeded = isBatas && p.actual > p.target;
    const ok = ev.achieved && ev.counts;
    const color = exceeded ? 'var(--expense)' : ok ? 'var(--income)' : (p.pct >= 80 ? 'var(--gold)' : 'var(--acc)');
    let diff;
    if (isBatas) diff = exceeded ? `Lebih ${fmt(p.actual - p.target)} dari batas` : `Sisa batas ${fmt(p.target - p.actual)}`;
    else if (p.isPercent) diff = p.actual >= p.target ? 'Target persentase tercapai' : `Kurang ${(p.target - p.actual).toFixed(1)}%`;
    else diff = p.actual >= p.target ? `Lebih ${fmt(p.actual - p.target)}` : `Kurang ${fmt(p.target - p.actual)}`;
    const detail = t.basis === 'kategori'
      ? `% dari kategori "${esc(catObj(t.incomeCatId).name)}" → "${esc(catObj(t.expenseCatId).name)}"` + (p.incomeAmt ? ` · pemasukan ${fmt(p.incomeAmt)}, dialokasikan ${fmt(p.spentAmt)}` : ' · belum ada pemasukan di kategori itu pada periode ini')
      : (t.goalType === 'hemat' ? 'Target hemat (pemasukan − pengeluaran)' : 'Batas maksimal pengeluaran');
    return `<div class="card">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;gap:8px">
        <div style="min-width:0">
          <div style="font-weight:700;font-size:14px">${esc(t.title)}${scopeLabel(t)}</div>
          <div style="font-size:11px;color:var(--txm)">${detail} · otomatis dari transaksi riil</div>
        </div>${actions}
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${p.pct}%;background:${color}"></div></div>
      <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:12.5px">
        <span style="color:${color};font-weight:600">${p.isPercent?p.actual+'%':fmt(p.actual)}</span>
        <span style="color:var(--txm)">target ${p.isPercent?p.target+'%':fmt(p.target)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px;flex-wrap:wrap">
        ${targetStatusBadge(t, ev)}<span style="font-size:11px;color:var(--txm)">${ev.state==='future'?'':diff}</span>
      </div>
    </div>`;
  }
  const done = ev.achieved;
  return `<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;gap:8px">
      <div style="min-width:0">
        <div style="font-weight:700;font-size:14px">${esc(t.title)}${scopeLabel(t)}</div>
        ${t.description?`<div style="font-size:11.5px;color:var(--tx2);margin-top:3px">${esc(t.description)}</div>`:''}
      </div>${actions}
    </div>
    <button class="btn ${done?'btn-primary':''} btn-sm" style="width:100%;justify-content:center" ${ev.state==='future'?'disabled':''} onclick="toggleTargetDoneForKey('${t.id}','${pKey}')">
      <i class="fa-solid ${done?'fa-check-circle':'fa-circle'}"></i> ${ev.state==='future'?'Belum dimulai':(done?'Selesai periode ini':'Tandai Selesai')}
    </button>
    ${ev.state==='past'&&!done?`<div style="margin-top:8px">${targetStatusBadge(t, ev)}</div>`:''}
  </div>`;
}

// ── Kartu mode Jadwal utk TANGGAL SPESIFIK — pakai override kalau ada, kalau tidak pakai default hari itu ──
function dayOfWeekVariant(dateStr) {
  const day = new Date(dateStr+'T00:00:00').getDay(); // 0=Min..6=Sab
  if (day === 6) return 'saturday';
  if (day === 0) return 'sunday';
  return 'weekday';
}
function scheduleBlocksForDate(t, dateStr) {
  if (t.overrides && t.overrides[dateStr]) return t.overrides[dateStr];
  return scheduleBlocksFor(t, dayOfWeekVariant(dateStr));
}
function renderJadwalCardForDate(t, dateStr) {
  const variant = dayOfWeekVariant(dateStr);
  const variantLabel = { weekday:'Senin–Jumat', saturday:'Sabtu', sunday:'Minggu' }[variant];
  const hasOverride = !!(t.overrides && t.overrides[dateStr]);
  const blocks = scheduleBlocksForDate(t, dateStr);
  const doneList = (t.completedBlocks && t.completedBlocks[dateStr]) || [];
  const { done: doneCount } = jadwalProgress(t, dateStr);
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  const isNow = b => dateStr === today() && (toMin(b.start) <= toMin(b.end) ? (nowMin >= toMin(b.start) && nowMin < toMin(b.end)) : (nowMin >= toMin(b.start) || nowMin < toMin(b.end)));
  return `<div class="card" style="grid-column:1/-1">
    <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <div>
        <div style="font-weight:700;font-size:14px"><i class="fa-solid fa-clock" style="color:${t.color||'var(--acc)'};margin-right:6px"></i>${esc(t.title)}</div>
        <div style="font-size:11px;color:var(--txm)">${hasOverride?'⚡ Jadwal khusus tanggal ini':'Jadwal default ('+variantLabel+')'} · ${doneCount}/${blocks.length} selesai</div>
      </div>
      <div style="display:flex;gap:4px">
        <button class="btn btn-sm" onclick="openScheduleOverrideModal('${t.id}','${dateStr}')">${hasOverride?'Edit Jadwal Ini':'Jadwal Beda Hari Ini'}</button>
        <button class="btn-icon" style="width:27px;height:27px" onclick="openTargetModal('${t.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
        <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delTarget('${t.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
      </div>
    </div>
    ${!blocks.length ? `<div class="empty-state" style="padding:14px"><p style="font-size:12px">Belum ada jadwal untuk ${variantLabel}. Klik edit target untuk mengisi jadwal default, atau "Jadwal Beda Hari Ini" untuk tanggal ini saja.</p></div>` :
    `<div class="ladder-track">${blocks.map((b,i)=>{
      const done = isBlockDone(doneList, b, i);
      return `<div class="ladder-step${done?' done':''}">
        <div class="ladder-step-num" style="background:${done?'var(--income)':'var(--bg)'};color:${done?'#fff':'var(--tx2)'};box-shadow:${done?'0 0 0 3px var(--income-l)':'var(--neu-raised-sm)'};font-size:9.5px;cursor:pointer" onclick="toggleScheduleBlock('${t.id}',${i},'${dateStr}')">${done?'<i class="fa-solid fa-check"></i>':i+1}</div>
        <div class="ladder-step-body">
          <div style="font-size:12.5px;${done?'text-decoration:line-through;color:var(--txm)':''}"><b>${b.start}–${b.end}</b> ${esc(b.activity)} ${isNow(b)?'<span class="badge" style="background:var(--acc-l);color:var(--acc);font-size:9px">SEKARANG</span>':''}</div>
        </div>
      </div>`;
    }).join('')}</div>`}
  </div>`;
}
window.toggleScheduleBlock = async function(id, idx, dateStr) {
  dateStr = dateStr || today();
  if (dateStr > today()) { toast('Jadwal hari yang belum tiba belum bisa dicentang','info'); return; }
  const t = S.targets.find(x=>x.id===id); if (!t) return;
  const blocks = scheduleBlocksForDate(t, dateStr);
  const b = blocks[idx]; if (!b) return;
  const cb = { ...(t.completedBlocks||{}) };
  // normalisasi data lama (indeks angka) ke kunci "jam" sebelum di-toggle
  let list = (cb[dateStr] || []).map(x => typeof x === 'number' ? (blocks[x] ? blockKey(blocks[x]) : null) : x).filter(Boolean);
  const k = blockKey(b);
  list = list.includes(k) ? list.filter(x => x !== k) : [...list, k];
  cb[dateStr] = [...new Set(list)];
  try { await fbSaveTarget({ completedBlocks: cb }, id); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); }
};
// Jadwal KHUSUS 1 tanggal — tidak mengubah jadwal default hari itu (utk jaga-jaga kalau rutinitas berubah dadakan)
window.openScheduleOverrideModal = function(id, dateStr) {
  const t = S.targets.find(x=>x.id===id); if (!t) return;
  const existing = (t.overrides && t.overrides[dateStr]) || null;
  const label = fmtDate(dateStr, {weekday:'long',day:'numeric',month:'long'});
  openModal(`
  <div class="modal-header"><h3>Jadwal Khusus — ${label}</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <p style="font-size:11px;color:var(--txm);margin-bottom:8px">Isi jadwal KHUSUS untuk tanggal ini saja — tidak mengubah jadwal default hari biasa. Format: <code>05:00-07:00 Aktivitas</code>, satu baris per blok. Kosongkan lalu simpan untuk hapus override & balik ke jadwal default.</p>
    <textarea class="form-input" id="so-text" rows="8">${esc(scheduleToText(existing))}</textarea>
  </div>
  <div class="modal-footer">
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" onclick="saveScheduleOverride('${id}','${dateStr}')">Simpan</button>
  </div>`);
};
window.saveScheduleOverride = async function(id, dateStr) {
  const t = S.targets.find(x=>x.id===id); if (!t) return;
  const { blocks, bad } = parseScheduleStrict(document.getElementById('so-text').value);
  if (bad.length) { toast(`Format salah di baris: "${bad[0].slice(0,40)}". Gunakan 05:00-07:00 Aktivitas`,'error'); return; }
  const overrides = { ...(t.overrides||{}) };
  if (blocks.length) overrides[dateStr] = blocks; else delete overrides[dateStr];
  // Firestore update() menimpa field penuh → pastikan override terhapus dengan menulis ulang seluruh map
  try { await fbSaveTarget({ overrides }, id); toast('Jadwal khusus disimpan'); closeModal(); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); }
};

let _targetMode = 'nominal';
let _targetBasis = 'total';
let _targetScope = 'all'; // all | days | date — cakupan khusus utk target periode Harian
const DOW_LABELS = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
window.openTargetModal = function(editId) {
  const t = editId ? S.targets.find(x=>x.id===editId) : null;
  _targetMode = t ? t.mode : 'nominal';
  _targetBasis = t ? (t.basis||'total') : 'total';
  const period = t ? t.period : (_targetTab==='harian'||_targetTab==='mingguan'||_targetTab==='bulanan'||_targetTab==='tahunan' ? _targetTab : 'harian');
  // Cakupan: kalau edit, pakai yg tersimpan. Kalau BARU dan dibuka dari tab Harian, otomatis
  // sarankan hari yg SEDANG DILIHAT (mis. lagi lihat Sabtu → GYM otomatis tersaran utk Sabtu saja).
  let _scopeDays;
  if (t) {
    _targetScope = t.specificDate ? 'date' : (t.daysOfWeek && t.daysOfWeek.length ? 'days' : 'all');
    _scopeDays = new Set(t.daysOfWeek || []);
  } else if (_targetTab === 'harian') {
    _targetScope = 'days';
    _scopeDays = new Set([ new Date(_targetHarianDate+'T00:00:00').getDay() ]);
  } else {
    _targetScope = 'all';
    _scopeDays = new Set();
  }
  window._scopeDaysSet = _scopeDays;
  const incomeCats = S.categories.filter(c=>c.type==='income');
  const expenseCats = S.categories.filter(c=>c.type==='expense');
  openModal(`
  <div class="modal-header"><h3>${t?'Edit':'Tambah'} Target</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Periode</label>
      <select class="form-input" id="tf-period">${TARGET_TABS.map(x=>`<option value="${x.id}"${period===x.id?' selected':''}>${x.label}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label class="form-label">Mode</label>
      <div class="type-toggle" id="tmtog">
        <button class="${_targetMode==='nominal'?'sel-active':''}" data-m="nominal">Nominal</button>
        <button class="${_targetMode==='checklist'?'sel-active':''}" data-m="checklist">Checklist</button>
        <button class="${_targetMode==='jadwal'?'sel-active':''}" data-m="jadwal">Jadwal Harian</button>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Judul Target</label><input type="text" class="form-input" id="tf-title" placeholder="Contoh: Hemat harian / Jadwal Harian / Invest dari Ngojol" value="${esc(t?t.title:'')}" maxlength="60"></div>

    <div id="tf-scope-wrap" style="${period==='harian' && _targetMode!=='jadwal' ? '' : 'display:none'}">
      <div class="form-group"><label class="form-label">Terapkan Ke</label>
        <div class="type-toggle" id="tscopetog">
          <button class="${_targetScope==='all'?'sel-active':''}" data-s="all">Semua Hari</button>
          <button class="${_targetScope==='days'?'sel-active':''}" data-s="days">Hari Tertentu</button>
          <button class="${_targetScope==='date'?'sel-active':''}" data-s="date">Tanggal Tertentu</button>
        </div>
      </div>
      <div id="tf-scope-days" style="${_targetScope!=='days'?'display:none':''};margin-bottom:14px">
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${[1,2,3,4,5,6,0].map(d=>`<button type="button" class="btn btn-sm scope-day-btn ${_scopeDays.has(d)?'btn-primary':''}" data-day="${d}" style="min-width:44px;justify-content:center">${DOW_LABELS[d]}</button>`).join('')}
        </div>
        <p style="font-size:10.5px;color:var(--txm);margin-top:6px">Target ini cuma muncul & dihitung pada hari yang dipilih.</p>
      </div>
      <div id="tf-scope-date" style="${_targetScope!=='date'?'display:none':''};margin-bottom:14px">
        <input type="date" class="form-input" id="tf-scope-datepick" value="${t&&t.specificDate?t.specificDate:_targetHarianDate}">
        <p style="font-size:10.5px;color:var(--txm);margin-top:6px">Target ini cuma berlaku SEKALI, di tanggal ini saja.</p>
      </div>
    </div>

    <div id="tf-nominal-fields" style="${_targetMode!=='nominal'?'display:none':''}">
      <div class="form-group"><label class="form-label">Basis Perhitungan</label>
        <div class="type-toggle" id="tbtog">
          <button class="${_targetBasis==='total'?'sel-active':''}" data-b="total">Total Keseluruhan</button>
          <button class="${_targetBasis==='kategori'?'sel-active':''}" data-b="kategori">% dari Kategori Tertentu</button>
        </div>
      </div>
      <div id="tf-total-fields" style="${_targetBasis!=='total'?'display:none':''}">
        <div class="form-group"><label class="form-label">Jenis</label>
          <select class="form-input" id="tf-goaltype">
            <option value="hemat"${t&&t.goalType==='hemat'?' selected':''}>Target Hemat (pemasukan − pengeluaran ≥ nominal)</option>
            <option value="batas"${t&&t.goalType==='batas'?' selected':''}>Batas Pengeluaran (pengeluaran ≤ nominal)</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Jumlah Target (Rp)</label><input type="text" class="form-input" id="tf-amount" placeholder="0" inputmode="numeric" value="${t&&t.basis!=='kategori'&&t.amount?groupInt(t.amount):''}" oninput="liveFormatAmount(this)"></div>
      </div>
      <div id="tf-kategori-fields" style="${_targetBasis!=='kategori'?'display:none':''}">
        <p style="font-size:11px;color:var(--txm);margin-bottom:8px">Contoh: "Invest 20% dari income Ngojol" → pilih kategori pemasukan "Ngojol"/"Freelance", kategori pengeluaran "Investasi", target 20%.</p>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Kategori Pemasukan (penyebut)</label><select class="form-input" id="tf-inccat">${incomeCats.map(c=>`<option value="${c.id}"${t&&t.incomeCatId===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Kategori Pengeluaran (pembilang)</label><select class="form-input" id="tf-expcat">${expenseCats.map(c=>`<option value="${c.id}"${t&&t.expenseCatId===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Target Persentase (%)</label><input type="number" class="form-input" id="tf-pct" placeholder="20" min="1" max="100" value="${t&&t.basis==='kategori'?t.amount:''}"></div>
      </div>
    </div>
    <div id="tf-checklist-fields" style="${_targetMode!=='checklist'?'display:none':''}">
      <div class="form-group"><label class="form-label">Deskripsi <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="tf-desc" placeholder="Contoh: Jalan kaki 30 menit" value="${esc(t?t.description||'':'')}" maxlength="150"></div>
    </div>
    <div id="tf-jadwal-fields" style="${_targetMode!=='jadwal'?'display:none':''}">
      <p style="font-size:11px;color:var(--txm);margin-bottom:8px">Satu baris = satu blok waktu, format: <code>05:00-07:00 Aktivitas</code>. Jadwal Sabtu &amp; Minggu opsional (kalau kosong, hari itu tidak menampilkan jadwal).</p>
      <div class="form-group"><label class="form-label">Senin – Jumat</label><textarea class="form-input" id="tf-sched-weekday" rows="5" placeholder="05:00-07:00 Mandi, sholat, makan, meditasi, OTW PPL
07:30-17:00 PPL, sela waktu belajar hal baru
17:30-18:30 Mandi, makan, sholat, siap-siap pantau market
18:40-00:00 Belajar hal baru, fokus trading
00:00-05:00 Siap-siap tidur">${esc(scheduleToText(t?.schedules?.weekday))}</textarea></div>
      <div class="form-group"><label class="form-label">Sabtu</label><textarea class="form-input" id="tf-sched-saturday" rows="4" placeholder="09:00-16:30 Full ngojol
17:00-18:00 Mandi, makan, sholat
18:30-02:00 Belajar hal baru, fokus trading
02:00-05:00 Tidur">${esc(scheduleToText(t?.schedules?.saturday))}</textarea></div>
      <div class="form-group"><label class="form-label">Minggu <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><textarea class="form-input" id="tf-sched-sunday" rows="3" placeholder="16:00-18:00 Gym">${esc(scheduleToText(t?.schedules?.sunday))}</textarea></div>
    </div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="tf-save-btn" onclick="saveTarget('${editId||''}')">${t?'Simpan':'Tambah'}</button></div>`);

  document.querySelectorAll('#tmtog button').forEach(btn => {
    btn.onclick = () => {
      _targetMode = btn.dataset.m;
      document.querySelectorAll('#tmtog button').forEach(b => b.className = '');
      btn.className = 'sel-active';
      document.getElementById('tf-nominal-fields').style.display   = _targetMode==='nominal'?'':'none';
      document.getElementById('tf-checklist-fields').style.display = _targetMode==='checklist'?'':'none';
      document.getElementById('tf-jadwal-fields').style.display    = _targetMode==='jadwal'?'':'none';
      const periodNow = document.getElementById('tf-period').value;
      document.getElementById('tf-scope-wrap').style.display = (periodNow==='harian' && _targetMode!=='jadwal') ? '' : 'none';
      if (_targetMode === 'jadwal') { document.getElementById('tf-period').value='harian'; document.getElementById('tf-period').disabled=true; }
      else { document.getElementById('tf-period').disabled=false; }
    };
  });
  document.querySelectorAll('#tbtog button').forEach(btn => {
    btn.onclick = () => {
      _targetBasis = btn.dataset.b;
      document.querySelectorAll('#tbtog button').forEach(b => b.className = '');
      btn.className = 'sel-active';
      document.getElementById('tf-total-fields').style.display    = _targetBasis==='total'?'':'none';
      document.getElementById('tf-kategori-fields').style.display = _targetBasis==='kategori'?'':'none';
    };
  });
  document.getElementById('tf-period').addEventListener('change', (e) => {
    document.getElementById('tf-scope-wrap').style.display = (e.target.value==='harian' && _targetMode!=='jadwal') ? '' : 'none';
  });
  document.querySelectorAll('#tscopetog button').forEach(btn => {
    btn.onclick = () => {
      _targetScope = btn.dataset.s;
      document.querySelectorAll('#tscopetog button').forEach(b => b.className = '');
      btn.className = 'sel-active';
      document.getElementById('tf-scope-days').style.display = _targetScope==='days'?'':'none';
      document.getElementById('tf-scope-date').style.display = _targetScope==='date'?'':'none';
    };
  });
  document.querySelectorAll('.scope-day-btn').forEach(btn => {
    btn.onclick = () => {
      const d = Number(btn.dataset.day);
      if (window._scopeDaysSet.has(d)) { window._scopeDaysSet.delete(d); btn.classList.remove('btn-primary'); }
      else { window._scopeDaysSet.add(d); btn.classList.add('btn-primary'); }
    };
  });
  if (_targetMode === 'jadwal') document.getElementById('tf-period').disabled = true;
};
window.saveTarget = async function(editId) {
  const period = document.getElementById('tf-period').value;
  const title  = document.getElementById('tf-title').value.trim();
  if (!title) { toast('Judul target harus diisi','error'); return; }
  let data = { period: _targetMode==='jadwal'?'harian':period, mode:_targetMode, title };
  // Cakupan hari/tanggal — hanya relevan utk target periode Harian yg bukan mode jadwal
  if (data.period === 'harian' && _targetMode !== 'jadwal') {
    if (_targetScope === 'days') {
      const days = [...(window._scopeDaysSet||[])];
      if (!days.length) { toast('Pilih minimal 1 hari','error'); return; }
      data.daysOfWeek = days; data.specificDate = null;
    } else if (_targetScope === 'date') {
      const dp = document.getElementById('tf-scope-datepick').value;
      if (!dp) { toast('Pilih tanggalnya','error'); return; }
      data.specificDate = dp; data.daysOfWeek = null;
    } else {
      data.daysOfWeek = null; data.specificDate = null;
    }
  }
  if (!(data.period === 'harian' && _targetMode !== 'jadwal')) { data.daysOfWeek = null; data.specificDate = null; }   // buang sisa cakupan lama
  if (_targetMode === 'nominal') {
    data.basis = _targetBasis;
    if (_targetBasis === 'kategori') {
      const pct = parseInt(document.getElementById('tf-pct').value, 10);
      if (!pct || pct<=0) { toast('Isi target persentase dengan benar','error'); return; }
      data.incomeCatId = document.getElementById('tf-inccat').value;
      data.expenseCatId = document.getElementById('tf-expcat').value;
      if (!data.incomeCatId || !data.expenseCatId) { toast('Pilih kategori pemasukan & pengeluaran (buat dulu di Pengaturan bila belum ada)','error'); return; }
      data.amount = pct;
    } else {
      const amount = parseAmount(document.getElementById('tf-amount').value);
      if (!amount) { toast('Isi jumlah target dengan benar','error'); return; }
      data.goalType = document.getElementById('tf-goaltype').value;
      data.amount = amount;
    }
  } else if (_targetMode === 'checklist') {
    data.description = document.getElementById('tf-desc').value.trim();
    data.completedPeriods = editId ? (S.targets.find(x=>x.id===editId)?.completedPeriods || []) : [];
  } else { // jadwal
    const parsed = { weekday: parseScheduleStrict(document.getElementById('tf-sched-weekday').value), saturday: parseScheduleStrict(document.getElementById('tf-sched-saturday').value), sunday: parseScheduleStrict(document.getElementById('tf-sched-sunday').value) };
    const badLine = [...parsed.weekday.bad, ...parsed.saturday.bad, ...parsed.sunday.bad][0];
    if (badLine) { toast(`Format jadwal salah: "${badLine.slice(0,40)}". Gunakan 05:00-07:00 Aktivitas`,'error'); return; }
    data.schedules = { weekday: parsed.weekday.blocks, saturday: parsed.saturday.blocks, sunday: parsed.sunday.blocks };
    data.completedBlocks = editId ? (S.targets.find(x=>x.id===editId)?.completedBlocks || {}) : {};
  }
  const btn = document.getElementById('tf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try {
    await fbSaveTarget(data, editId||null);
    _targetTab = data.period;
    toast(editId?'Target diperbarui':'Target ditambahkan'); closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delTarget = function(id) {
  const t = S.targets.find(x=>x.id===id);
  const scopeNote = t && t.specificDate ? ` (target ini khusus tanggal ${new Date(t.specificDate+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})})`
    : t && t.daysOfWeek && t.daysOfWeek.length ? ` (target ini khusus hari ${t.daysOfWeek.map(d=>DOW_LABELS[d]).join(', ')})` : '';
  confirmDel(`Hapus target ini sepenuhnya${scopeNote}? Tindakan ini tidak bisa dibatalkan.`, async ()=>{ await fbDelTarget(id); toast('Target dihapus','info'); renderPage(); });
};
window.toggleTargetDoneForKey = async function(id, pKey) {
  const t = S.targets.find(x=>x.id===id); if (!t) return;
  if (periodState(t.period, pKey) === 'future') { toast('Periode ini belum dimulai — belum bisa ditandai selesai','info'); return; }
  const list = new Set(t.completedPeriods || []);
  if (list.has(pKey)) list.delete(pKey); else list.add(pKey);
  try { await fbSaveTarget({ completedPeriods: [...list] }, id); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); }
};

// ── Tambah banyak checklist sekaligus (mis. MAXIM / KULIAH / BELAJAR HAL BARU / IBADAH) ──
window.openBulkChecklistModal = function() {
  openModal(`
  <div class="modal-header"><h3>Tambah Banyak Target Checklist</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Periode</label>
      <select class="form-input" id="bc-period">${TARGET_TABS.map(x=>`<option value="${x.id}"${_targetTab===x.id?' selected':''}>${x.label}</option>`).join('')}</select>
    </div>
    <div id="bc-scope-wrap" style="${_targetTab==='harian'?'':'display:none'}">
      <div class="form-group"><label class="form-label">Terapkan Ke <span style="font-weight:400;color:var(--txm)">(berlaku utk semua judul di bawah)</span></label>
        <div class="type-toggle" id="bctscopetog">
          <button class="sel-active" data-s="all">Semua Hari</button>
          <button data-s="days">Hari Tertentu</button>
        </div>
      </div>
      <div id="bc-scope-days" style="display:none;margin-bottom:12px">
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${[1,2,3,4,5,6,0].map(d=>`<button type="button" class="btn btn-sm bc-scope-day-btn" data-day="${d}" style="min-width:44px;justify-content:center">${DOW_LABELS[d]}</button>`).join('')}
        </div>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Satu judul per baris</label><textarea class="form-input" id="bc-titles" rows="6" placeholder="MAXIM
KULIAH
BELAJAR HAL BARU
IBADAH"></textarea></div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="bc-save-btn" onclick="saveBulkChecklist()">Tambah Semua</button></div>`);
  document.getElementById('bc-period').addEventListener('change', e => {
    document.getElementById('bc-scope-wrap').style.display = e.target.value==='harian' ? '' : 'none';
  });
  window._bcScope = 'all'; window._bcScopeDays = new Set();
  document.querySelectorAll('#bctscopetog button').forEach(btn => {
    btn.onclick = () => {
      window._bcScope = btn.dataset.s;
      document.querySelectorAll('#bctscopetog button').forEach(b=>b.className='');
      btn.className = 'sel-active';
      document.getElementById('bc-scope-days').style.display = window._bcScope==='days' ? '' : 'none';
    };
  });
  document.querySelectorAll('.bc-scope-day-btn').forEach(btn => {
    btn.onclick = () => {
      const d = Number(btn.dataset.day);
      if (window._bcScopeDays.has(d)) { window._bcScopeDays.delete(d); btn.classList.remove('btn-primary'); }
      else { window._bcScopeDays.add(d); btn.classList.add('btn-primary'); }
    };
  });
};
window.saveBulkChecklist = async function() {
  const period = document.getElementById('bc-period').value;
  const titles = document.getElementById('bc-titles').value.split('\n').map(s=>s.trim().slice(0,60)).filter(Boolean);
  if (!titles.length) { toast('Isi minimal 1 judul','error'); return; }
  if (period === 'harian' && window._bcScope === 'days' && !window._bcScopeDays.size) { toast('Pilih minimal 1 hari','error'); return; }
  const daysOfWeek = (period==='harian' && window._bcScope==='days') ? [...window._bcScopeDays] : null;
  const btn = document.getElementById('bc-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; }
  try {
    for (const title of titles) {
      const data = { period, mode:'checklist', title, description:'', completedPeriods:[] };
      if (daysOfWeek) { data.daysOfWeek = daysOfWeek; data.specificDate = null; }
      await fbSaveTarget(data, null);
    }
    _targetTab = period;
    toast(`${titles.length} target ditambahkan`); closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent='Tambah Semua';} }
};

/* ── REPORTS ── */
function rRep(el) {
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">
    <div><h3 style="font-size:17px;font-weight:700">Laporan Keuangan</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Analisis mendalam kondisi keuangan (arus kas hutang/piutang dikecualikan agar akurat)</p></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <select class="form-input" id="rep-range" style="width:130px">
        <option value="3"${reportRange===3?' selected':''}>3 Bulan</option>
        <option value="6"${reportRange===6?' selected':''}>6 Bulan</option>
        <option value="12"${reportRange===12?' selected':''}>1 Tahun</option>
      </select>
      <button class="btn btn-sm" onclick="exportCSV()"><i class="fa-solid fa-download"></i> Ekspor CSV</button>
    </div>
  </div>
  <div class="grid-2" style="margin-bottom:16px">
    <div class="card"><h4 style="font-size:14px;margin-bottom:12px">Tren Pemasukan vs Pengeluaran</h4><div class="chart-wrap" style="height:240px"><canvas id="ch-line"></canvas></div></div>
    <div class="card"><h4 style="font-size:14px;margin-bottom:12px">Komposisi Pengeluaran</h4><div class="chart-wrap" style="height:240px"><canvas id="ch-pie"></canvas></div></div>
  </div>
  <div class="card" style="margin-bottom:16px"><h4 style="font-size:14px;margin-bottom:12px">Rincian per Kategori</h4><div id="rep-cat-tbl" style="overflow-x:auto"></div></div>
  <div class="grid-2" style="margin-bottom:16px">
    <div class="card"><h4 style="font-size:14px;margin-bottom:12px">Top 5 Pengeluaran Terbesar</h4><div id="rep-top5"></div></div>
    <div class="card"><h4 style="font-size:14px;margin-bottom:12px">Distribusi per Akun</h4><div class="chart-wrap" style="height:220px"><canvas id="ch-acc"></canvas></div></div>
  </div>
  <div class="card">
    <h4 style="font-size:14px;margin-bottom:4px"><i class="fa-solid fa-hand-holding-dollar" style="color:#8A90A8;margin-right:6px"></i>Arus Kas Hutang/Piutang (periode ini)</h4>
    <p style="font-size:11.5px;color:var(--txm);margin-bottom:12px">Angka ini TIDAK termasuk dalam grafik & laporan di atas — murni pergerakan kas, bukan pendapatan/pengeluaran riil.</p>
    <div id="rep-debtflow" class="grid-2"></div>
  </div>`;

  document.getElementById('rep-range').onchange = e => { reportRange=+e.target.value; destroyAllCharts(); renderPage(); };

  const allTxns=[]; for(let i=0;i<reportRange;i++) allTxns.push(...monthTxns(i));
  const txns = filterReal(allTxns);
  const debtTxns = allTxns.filter(t => t.flow === 'hutang');
  const ec={}, ic={};
  txns.filter(t=>t.type==='expense').forEach(t=>{const c=catObj(t.categoryId);ec[c.name]=(ec[c.name]||0)+t.amount});
  txns.filter(t=>t.type==='income').forEach(t=>{const c=catObj(t.categoryId);ic[c.name]=(ic[c.name]||0)+t.amount});
  const te=Object.values(ec).reduce((s,v)=>s+v,0);
  const ti=Object.values(ic).reduce((s,v)=>s+v,0);

  document.getElementById('rep-cat-tbl').innerHTML=`<table class="data-table"><thead><tr><th>Kategori</th><th>Tipe</th><th style="text-align:right">Total</th><th style="text-align:right">%</th></tr></thead><tbody>
    ${Object.entries(ic).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td style="font-weight:600">${esc(k)}</td><td><span class="badge" style="background:var(--income-l);color:var(--income)">Pemasukan</span></td><td style="text-align:right;font-weight:600;color:var(--income)">+${fmt(v)}</td><td style="text-align:right;color:var(--tx2)">${ti>0?(v/ti*100).toFixed(1):'0'}%</td></tr>`).join('')}
    ${Object.entries(ec).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td style="font-weight:600">${esc(k)}</td><td><span class="badge" style="background:var(--expense-l);color:var(--expense)">Pengeluaran</span></td><td style="text-align:right;font-weight:600;color:var(--expense)">-${fmt(v)}</td><td style="text-align:right;color:var(--tx2)">${te>0?(v/te*100).toFixed(1):'0'}%</td></tr>`).join('')}
  </tbody></table>`;

  const top5=[...txns].filter(t=>t.type==='expense').sort((a,b)=>b.amount-a.amount).slice(0,5);
  document.getElementById('rep-top5').innerHTML=top5.map((t,i)=>{
    const c=catObj(t.categoryId);
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;${i<4?'border-bottom:1px solid var(--border)':''}">
      <div style="width:28px;height:28px;border-radius:7px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${c.icon}"></i></div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.description)}</div><div style="font-size:10.5px;color:var(--txm)">${fmtDate(t.date,{day:'numeric',month:'short',year:'numeric'})}</div></div>
      <div style="font-size:12.5px;font-weight:700;color:var(--expense)">${fmt(t.amount)}</div>
    </div>`;
  }).join('')||'<div style="text-align:center;padding:16px;color:var(--txm);font-size:12.5px">Tidak ada data</div>';

  const debtIn  = sumType(debtTxns,'income');   // uang masuk dari: terima pinjaman baru + terima cicilan piutang
  const debtOut = sumType(debtTxns,'expense');  // uang keluar untuk: bayar cicilan hutang + memberi pinjaman baru
  document.getElementById('rep-debtflow').innerHTML = `
    <div style="padding:12px;border-radius:10px;background:var(--bg2);border:1px solid var(--border)">
      <div style="font-size:10.5px;font-weight:700;color:var(--txm);text-transform:uppercase;margin-bottom:4px">Uang Masuk (hutang baru / cicilan piutang)</div>
      <div style="font-family:'Outfit';font-size:16px;font-weight:800;color:var(--tx2)">${fmt(debtIn)}</div>
    </div>
    <div style="padding:12px;border-radius:10px;background:var(--bg2);border:1px solid var(--border)">
      <div style="font-size:10.5px;font-weight:700;color:var(--txm);text-transform:uppercase;margin-bottom:4px">Uang Keluar (beri pinjaman / cicilan hutang)</div>
      <div style="font-family:'Outfit';font-size:16px;font-weight:800;color:var(--tx2)">${fmt(debtOut)}</div>
    </div>`;
}

function renderReportCharts() {
  const c1=document.getElementById('ch-line'), c2=document.getElementById('ch-pie'), c3=document.getElementById('ch-acc');
  if(c1){
    const lbs=[],incD=[],expD=[],balD=[];let rb=0;
    for(let i=reportRange-1;i>=0;i--){const n0=new Date(), d=new Date(n0.getFullYear(), n0.getMonth()-i, 1);lbs.push(MO[d.getMonth()]+" '"+d.getFullYear().toString().slice(2));const tx=filterReal(monthTxns(i));const inc=sumType(tx,'income'),exp=sumType(tx,'expense');incD.push(inc);expD.push(exp);rb+=(inc-exp);balD.push(rb)}
    _charts.rLine=new Chart(c1,{type:'line',data:{labels:lbs,datasets:[
      {label:'Pemasukan',data:incD,borderColor:cssVar('--income'),backgroundColor:'rgba(61,219,160,.08)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:cssVar('--income'),borderWidth:2},
      {label:'Pengeluaran',data:expD,borderColor:cssVar('--expense'),backgroundColor:'rgba(255,112,104,.08)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:cssVar('--expense'),borderWidth:2},
      {label:'Saldo',data:balD,borderColor:cssVar('--gold'),backgroundColor:'transparent',borderDash:[5,5],tension:.4,pointRadius:3,pointBackgroundColor:cssVar('--gold'),borderWidth:2}
    ]},options:chartBaseOpts({tooltipCallbacks:{label:ctx=>ctx.dataset.label+': '+fmt(ctx.raw)}})});
  }
  if(c2){const txns=[];for(let i=0;i<reportRange;i++)txns.push(...filterReal(monthTxns(i)));const ec={};txns.filter(t=>t.type==='expense').forEach(t=>{const c=catObj(t.categoryId);ec[c.name]=(ec[c.name]||0)+t.amount});const lbs=Object.keys(ec),vals=Object.values(ec);if(lbs.length)_charts.rPie=new Chart(c2,{type:'pie',data:{labels:lbs,datasets:[{data:vals,backgroundColor:CHART_COLORS.slice(0,lbs.length),borderWidth:0}]},options:chartBaseOpts({noScales:true,legend:{position:'bottom'},tooltipCallbacks:{label:ctx=>ctx.label+': '+fmt(ctx.raw)}})})}
  if(c3){const txns=[];for(let i=0;i<reportRange;i++)txns.push(...filterReal(monthTxns(i)));const am={};txns.filter(t=>t.type==='expense').forEach(t=>{const a=accObj(t.accountId);am[a.name]=(am[a.name]||0)+t.amount});const lbs=Object.keys(am),vals=Object.values(am);const cls=S.accounts.filter(a=>am[a.name]).map(a=>a.color);if(lbs.length)_charts.rAcc=new Chart(c3,{type:'doughnut',data:{labels:lbs,datasets:[{data:vals,backgroundColor:cls,borderWidth:0}]},options:chartBaseOpts({noScales:true,legend:{position:'bottom'},tooltipCallbacks:{label:ctx=>ctx.label+': '+fmt(ctx.raw)},chartExtra:{cutout:'62%'}})})}
}

window.renderPage = renderPage;
window.fillFxRatesWidget = fillFxRatesWidget;

/* ── SETTINGS ── */
function rSet(el) {
  const isGoogle = currentUser?.providerData?.[0]?.providerId === 'google.com';
  const initial = currentUser?.email?.[0]?.toUpperCase() || 'U';
  const dispName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Pengguna';
  el.innerHTML = `
  <div style="max-width:580px">
    <div class="card" style="margin-bottom:16px">
      <h4 style="font-size:15px;margin-bottom:14px">Akun Login</h4>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
        <div class="user-avatar" style="width:48px;height:48px;font-size:17px;flex-shrink:0">${esc(initial)}</div>
        <div style="min-width:0">
          <div style="font-weight:700;font-size:14.5px">${esc(dispName)}</div>
          <div style="font-size:11.5px;color:var(--txm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(currentUser?.email||'')}</div>
          <span class="badge" style="background:var(--acc-l);color:var(--acc);margin-top:5px;font-size:10px"><i class="${isGoogle?'fa-brands fa-google':'fa-solid fa-envelope'}"></i> ${isGoogle?'Masuk dengan Google':'Email & Kata Sandi'}</span>
        </div>
      </div>
      <p style="font-size:11px;color:var(--txm);margin-bottom:12px">Semua data keuangan Anda tersimpan di cloud, terikat pada akun ini, dan hanya bisa diakses lewat login ini.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${isGoogle?`<button class="btn btn-sm" onclick="switchGoogleAccount()"><i class="fa-solid fa-right-left"></i> Ganti Akun</button>`:''}
        <button class="btn btn-sm btn-danger" onclick="handleLogout()"><i class="fa-solid fa-right-from-bracket"></i> Keluar</button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h4 style="font-size:15px;margin-bottom:16px">Tampilan</h4>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border)">
        <div><div style="font-weight:600;font-size:13.5px">Mode Gelap / Terang</div><div style="font-size:11.5px;color:var(--txm)">Beralih antara tema Neumorphism gelap dan terang</div></div>
        <button class="theme-toggle" onclick="toggleTheme()" style="flex-shrink:0">
          <div class="theme-toggle-track"></div>
          <div class="theme-toggle-knob"><i class="fa-solid ${getTheme()==='dark'?'fa-moon':'fa-sun'}"></i></div>
        </button>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h4 style="font-size:15px;margin-bottom:6px">Mata Uang & Negara Asal</h4>
      <p style="font-size:11.5px;color:var(--tx2);margin-bottom:12px">Ini jadi basis tampilan angka di seluruh aplikasi, DAN basis perbandingan kurs mata uang asing di Dashboard.</p>
      <select class="form-input" id="sf-cur" style="width:220px" onchange="changeCurrency(this.value)">
        <option value="Rp"${S.settings.currency==='Rp'?' selected':''}>Rp — Indonesia (Rupiah)</option>
        <option value="$"${S.settings.currency==='$'?' selected':''}>$ — Amerika Serikat (Dollar)</option>
        <option value="€"${S.settings.currency==='€'?' selected':''}>€ — Kawasan Euro (Euro)</option>
        <option value="¥"${S.settings.currency==='¥'?' selected':''}>¥ — Jepang (Yen)</option>
        <option value="£"${S.settings.currency==='£'?' selected':''}>£ — Inggris (Pound)</option>
      </select>
      <div id="settings-fx-preview" style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)"></div>
    </div>

    <div class="card" style="margin-bottom:16px;position:relative;overflow:hidden">
      <div style="position:absolute;top:-40px;right:-40px;width:130px;height:130px;border-radius:50%;background:radial-gradient(circle,rgba(255,184,48,0.12) 0%,transparent 70%)"></div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;position:relative">
        <i class="fa-solid fa-crown" style="color:var(--gold);font-size:18px"></i>
        <h4 style="font-size:15px">Template Kekayaan Abadi</h4>
        ${S.settings.wealthLadder?.enabled?'<span class="badge" style="background:var(--income-l);color:var(--income);margin-left:auto">Aktif</span>':''}
      </div>
      <p style="font-size:12px;color:var(--tx2);margin-bottom:12px">7 tahap tangga kebebasan finansial (Nabung Cash → Bebas Hutang → Dana Darurat → Investasi 20% → Dana Pendidikan → Lunasi KPR → Kekayaan Abadi & Berbagi). Progresnya <b>otomatis dihitung dari data transaksi, hutang, dan tabungan Anda yang sebenarnya</b> — tidak bisa ditandai selesai secara manual.</p>
      ${S.settings.wealthLadder?.enabled ? `
        <button class="btn btn-sm" onclick="nav('goals')" style="margin-right:8px"><i class="fa-solid fa-stairs"></i> Lihat Progres</button>
        <button class="btn btn-sm" onclick="openConnectSavingsAccModal()" style="margin-right:8px"><i class="fa-solid fa-piggy-bank"></i> ${S.settings.wealthLadder?.savingsAccountId?'Ganti':'Hubungkan'} Akun Tabungan</button>
        <button class="btn btn-sm btn-danger" onclick="deactivateWealthLadder()"><i class="fa-solid fa-power-off"></i> Nonaktifkan</button>
      ` : `
        <button class="btn btn-primary btn-sm" onclick="openLadderActivationModal()"><i class="fa-solid fa-crown"></i> Aktifkan Template</button>
      `}
    </div>

    <div class="card" style="margin-bottom:16px">
      <h4 style="font-size:15px;margin-bottom:6px">Kategori</h4>
      <p style="font-size:12px;color:var(--tx2);margin-bottom:12px">Kelola kategori pemasukan dan pengeluaran</p>
      <div style="display:flex;gap:7px;margin-bottom:12px">
        <button class="btn btn-sm" onclick="openCatModal('income')"><i class="fa-solid fa-plus"></i> Pemasukan</button>
        <button class="btn btn-sm" onclick="openCatModal('expense')"><i class="fa-solid fa-plus"></i> Pengeluaran</button>
      </div>
      <div id="set-cats"></div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h4 style="font-size:15px;margin-bottom:6px">Data & Sinkronisasi</h4>
      <p style="font-size:11.5px;color:var(--tx2);margin-bottom:12px">Ekspor CSV siap dibuka rapi di Excel/Google Sheets (kolom Jumlah tetap angka, bisa langsung di-SUM).</p>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn btn-sm" onclick="exportCSV()"><i class="fa-solid fa-file-csv"></i> Ekspor CSV</button>
        <button class="btn btn-sm" onclick="exportJSON()"><i class="fa-solid fa-file-export"></i> Ekspor Backup JSON</button>
        <button class="btn btn-sm" onclick="importData()"><i class="fa-solid fa-upload"></i> Impor Data</button>
      </div>
      <button class="btn btn-sm btn-danger" onclick="resetAll()"><i class="fa-solid fa-trash"></i> Hapus Semua Data Akun Ini</button>
      <p style="font-size:10.5px;color:var(--txm);margin-top:8px">Tindakan ini menghapus seluruh data di cloud (Firebase) untuk akun yang sedang login — bukan sekadar cache lokal — dan tidak dapat dibatalkan.</p>
    </div>

    <div class="card">
      <h4 style="font-size:15px;margin-bottom:8px">Tentang Money Management</h4>
      <p style="font-size:12.5px;color:var(--tx2)">Pencatat keuangan pribadi dengan sinkronisasi Firebase Firestore dan tampilan Kalender interaktif.</p>
      <p style="font-size:11px;color:var(--txm);margin-top:6px">Versi 5.1 · Firebase Cloud Sync · Neumorphism UI · Kalender · AI Analysis Pro</p>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--txm)">
        <i class="fa-solid fa-dollar-sign" style="color:var(--gold);margin-right:5px"></i>
        Diproduksi oleh <strong style="color:var(--gold)">AL-HAZA Production</strong>
      </div>
    </div>
  </div>`;
  fillSetCats();
  fillSettingsFxPreview();
}

window.changeCurrency = function(v) {
  if (!CUR_LOCALE[v]) return;
  S.settings.currency = v; _fxCache = null;
  saveSettings(); renderPage();
};

function fillSetCats() {
  const el = document.getElementById('set-cats'); if (!el) return;
  el.innerHTML = ['income','expense'].map(type => {
    const cats = S.categories.filter(c=>c.type===type);
    const lb = type==='income'?'Pemasukan':'Pengeluaran';
    return `<div style="margin-bottom:14px">
      <div style="font-size:12px;font-weight:700;color:var(--tx2);margin-bottom:8px;letter-spacing:.4px">${lb.toUpperCase()}</div>
      ${cats.map(c=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:28px;height:28px;border-radius:7px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${c.icon}"></i></div>
        <span style="flex:1;font-size:12.5px;font-weight:500">${esc(c.name)}</span>
        <button class="btn-icon" style="width:26px;height:26px" onclick="openCatModal('${type}','${c.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
        <button class="btn-icon" style="width:26px;height:26px;color:var(--expense)" onclick="delCat('${c.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
      </div>`).join('')}
    </div>`;
  }).join('');
}

const CAT_ICONS  = ['fa-briefcase','fa-laptop-code','fa-chart-line','fa-gift','fa-store','fa-utensils','fa-car','fa-shopping-bag','fa-film','fa-file-invoice','fa-heart-pulse','fa-graduation-cap','fa-house','fa-shirt','fa-dumbbell','fa-plane','fa-paw','fa-ellipsis'];
const CAT_COLORS = ['#3DDBA0','#22D3EE','#A78BFA','#FFB830','#FF7068','#FB923C','#EC4899','#4ADE80','#7B9EF8','#F43F5E','#14B8A6','#8B5CF6','#EF4444','#8A90A8'];
let _catIcon='fa-ellipsis', _catColor='#8A90A8';

window.openCatModal = function(type, editId) {
  const c = editId ? S.categories.find(x=>x.id===editId) : null;
  _catIcon=c?c.icon:CAT_ICONS[0]; _catColor=c?c.color:CAT_COLORS[0];
  openModal(`
  <div class="modal-header"><h3>${c?'Edit':'Tambah'} Kategori</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Nama</label><input type="text" class="form-input" id="cf-name" value="${esc(c?c.name:'')}" placeholder="Nama kategori" maxlength="30"></div>
    <div class="form-group"><label class="form-label">Ikon</label><div style="display:flex;gap:5px;flex-wrap:wrap">${CAT_ICONS.map(ic=>`<div style="width:34px;height:34px;border-radius:8px;background:var(--bg);box-shadow:var(--neu-raised-sm);display:flex;align-items:center;justify-content:center;cursor:pointer;border:2px solid ${_catIcon===ic?'var(--acc)':'transparent'}" onclick="pickCI(this,'${ic}')"><i class="fa-solid ${ic}" style="font-size:12px"></i></div>`).join('')}</div></div>
    <div class="form-group"><label class="form-label">Warna</label><div style="display:flex;gap:5px;flex-wrap:wrap">${CAT_COLORS.map(cl=>`<div style="width:26px;height:26px;border-radius:5px;background:${cl};cursor:pointer;border:2px solid ${_catColor===cl?'white':'transparent'};box-shadow:var(--neu-raised-sm)" onclick="pickCC(this,'${cl}')"></div>`).join('')}</div></div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="cf-save-btn" onclick="saveCat('${type}','${editId||''}')">${c?'Simpan':'Tambah'}</button></div>`);
};
window.pickCI = (el,ic) => { _catIcon=ic; el.parentElement.querySelectorAll('div').forEach(d=>d.style.borderColor='transparent'); el.style.borderColor='var(--acc)'; };
window.pickCC = (el,cl) => { _catColor=cl; el.parentElement.querySelectorAll('div').forEach(d=>d.style.borderColor='transparent'); el.style.borderColor='white'; };
window.saveCat = async function(type, editId) {
  const name = document.getElementById('cf-name').value.trim();
  if (!name) { toast('Nama kategori harus diisi','error'); return; }
  if (S.categories.some(c => c.type === type && c.id !== editId && c.name.toLowerCase() === name.toLowerCase())) { toast('Kategori dengan nama itu sudah ada','error'); return; }
  const btn = document.getElementById('cf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try { await fbSaveCat({name,type,icon:_catIcon,color:_catColor}, editId||null); toast(editId?'Kategori diperbarui':'Kategori ditambahkan'); closeModal(); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delCat = function(id) {
  if (S.transactions.some(t=>t.categoryId===id)) { toast('Tidak bisa menghapus kategori yang memiliki transaksi','error'); return; }
  if (S.budgets.some(b=>b.categoryId===id)) { toast('Tidak bisa menghapus kategori yang masih dipakai di anggaran. Hapus anggarannya dahulu.','error'); return; }
  if (S.targets.some(t=>t.incomeCatId===id || t.expenseCatId===id)) { toast('Kategori ini masih dipakai di Target Berkala. Ubah/hapus targetnya dahulu.','error'); return; }
  confirmDel('Hapus kategori ini?', async ()=>{ await fbDelCat(id); toast('Kategori dihapus','info'); renderPage(); });
};

/* ── EXPORT / IMPORT ── */
/* ── EXPORT / IMPORT ──
   CSV dibuat mengikuti RFC 4180 (CRLF, field teks di-quote, field angka polos
   supaya tetap numeric & bisa langsung di-SUM di Excel/Sheets — bukan text).
   Field teks yg diawali =,+,-,@ diberi prefiks ' utk cegah CSV/formula injection
   saat dibuka di Excel (angka Jumlah tidak disentuh krn memang murni angka). */
function csvText(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g,'""')}"`;
}
window.exportCSV = function() {
  const h = ['Tanggal','Tipe','Kategori','Akun','Deskripsi','Jumlah','Catatan','Jenis Arus'].map(csvText);
  const rows = [...S.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t => [
    csvText(t.date),
    csvText(t.type==='income'?'Pemasukan':'Pengeluaran'),
    csvText(catObj(t.categoryId).name),
    csvText(accObj(t.accountId).name),
    csvText(t.description),
    Number(t.amount)||0,
    csvText(t.note||''),
    csvText(t.flow==='hutang' ? 'Hutang/Piutang' : t.flow==='transfer' ? 'Transfer' : 'Riil')
  ].join(','));
  const csv = '\uFEFF' + [h.join(','), ...rows].join('\r\n');
  const b = new Blob([csv], { type:'text/csv;charset=utf-8;' });
  const u = URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`money-management_transaksi_${today()}.csv`; a.click(); URL.revokeObjectURL(u);
  toast('Data diekspor ke CSV — siap dibuka rapi di Excel/Sheets');
};
window.exportJSON = function() {
  const d=JSON.stringify({version:2,accounts:S.accounts,categories:S.categories,transactions:S.transactions,budgets:S.budgets,goals:S.goals,debts:S.debts,targets:S.targets,settings:S.settings},null,2);
  const b=new Blob([d],{type:'application/json'});
  const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`money-management_backup_${today()}.json`; a.click(); URL.revokeObjectURL(u);
  toast('Backup JSON diekspor');
};
window.importData = function() {
  openModal(`<div class="modal-header"><h3>Impor Data</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body"><p style="font-size:12.5px;color:var(--tx2);margin-bottom:10px">Paste data JSON backup. Data ini akan <b>ditambahkan</b> ke akun cloud Anda saat ini (bukan hanya tampilan lokal).</p>
  <textarea class="form-input" id="imp-json" rows="8" placeholder='{"accounts":[...]}'></textarea></div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="imp-btn" onclick="doImport()">Impor</button></div>`);
};
window.doImport = async function() {
  const btn = document.getElementById('imp-btn');
  let d;
  try { d = JSON.parse(document.getElementById('imp-json').value); }
  catch(e) { toast('Format JSON tidak valid','error'); return; }
  if (!d || typeof d !== 'object' || Array.isArray(d)) { toast('Isi backup tidak dikenali','error'); return; }
  const arr = k => Array.isArray(d[k]) ? d[k] : [];
  const isDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const str = (v, max) => String(v ?? '').slice(0, max);
  const money = v => { const n = Number(v); return Number.isFinite(n) && n > 0 && n < 999999999999 ? n : null; };

  // 1) VALIDASI SEMUA DULU — tidak ada impor setengah jalan
  const txIn = arr('transactions');
  const badTx = txIn.filter(t => !(t && isDate(t.date) && ['income','expense'].includes(t.type) && money(t.amount) && typeof t.description === 'string' && t.description.trim())).length;
  if (badTx) { toast(`${badTx} transaksi di backup tidak valid (tanggal/jumlah/tipe/deskripsi). Perbaiki file backup dulu.`,'error'); return; }

  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor...'; }
  try {
    const stat = { tx:0, txSkip:0, other:0 };
    // 2) Akun & kategori: pakai yang sudah ada (nama sama) — kalau tidak ada baru dibuat. ID lama → ID baru dipetakan.
    const accMap = {}, catMap = {}, debtMap = {};
    for (const a of arr('accounts')) {
      const name = str(a.name, 50).trim(); if (!name) continue;
      let ex = S.accounts.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!ex) {
        const data = { name, type: ['cash','bank','ewallet'].includes(a.type) ? a.type : 'cash', icon: str(a.icon || 'fa-money-bill-wave', 40), color: str(a.color || '#4ADE80', 20) };
        if (['transaksi','tabungan','lainnya'].includes(a.purpose)) data.purpose = a.purpose;
        if (a.bankName) data.bankName = str(a.bankName, 30);
        if (a.accountNumber) data.accountNumber = str(a.accountNumber, 30);
        const nid = await fbSaveAcc(data); ex = S.accounts.find(x => x.id === nid); stat.other++;
      }
      if (a.id) accMap[a.id] = ex.id;
    }
    for (const c of arr('categories')) {
      const name = str(c.name, 40).trim(); if (!name || !['income','expense'].includes(c.type)) continue;
      let ex = S.categories.find(x => x.type === c.type && x.name.toLowerCase() === name.toLowerCase());
      if (!ex) { const nid = await fbSaveCat({ name, type: c.type, icon: str(c.icon || 'fa-tag', 40), color: str(c.color || '#8A90A8', 20) }); ex = S.categories.find(x => x.id === nid); stat.other++; }
      if (c.id) catMap[c.id] = ex.id;
    }
    const mapCat = (oldId, type) => catMap[oldId] || (S.categories.find(c => c.id === oldId)?.id) || null;
    const fallbackCat = async type => (S.categories.find(c => c.type === type && c.name === 'Lainnya') || await ensureCategoryByName('Lainnya', type)).id;

    // 3) Hutang/Piutang (sebelum transaksi, agar debtId bisa dipetakan)
    for (const x of arr('debts')) {
      if (!x || !['hutang','piutang'].includes(x.type) || !str(x.person,60).trim() || !money(x.amount)) continue;
      const person = str(x.person, 60).trim(), amount = Number(x.amount), paid = Math.min(Math.max(Number(x.paid)||0, 0), amount);
      const dup = S.debts.find(y => y.type === x.type && y.person === person && y.amount === amount && (y.borrowDate||'') === (x.borrowDate||''));
      if (dup) { if (x.id) debtMap[x.id] = dup.id; continue; }
      const data = { type: x.type, person, amount, paid, borrowDate: isDate(x.borrowDate) ? x.borrowDate : today(), dueDate: isDate(x.dueDate) ? x.dueDate : null, note: str(x.note, 200), isKPR: !!x.isKPR };
      const nid = await fbSaveDebt(data, null); if (x.id) debtMap[x.id] = nid; stat.other++;
    }

    // 4) Transaksi: lewati duplikat persis, tulis per 400 operasi
    const sig = t => `${t.date}|${t.type}|${t.amount}|${t.accountId}|${t.description}`;
    const seen = new Set(S.transactions.map(sig));
    const toAdd = [];
    for (const t of txIn) {
      const accountId = accMap[t.accountId] || (S.accounts.find(a => a.id === t.accountId)?.id) || S.accounts[0].id;
      const categoryId = mapCat(t.categoryId, t.type) || await fallbackCat(t.type);
      const data = { date: t.date, description: str(t.description, 200).trim(), amount: Number(t.amount), categoryId, accountId, note: str(t.note, 300), type: t.type,
        flow: ['real','hutang','transfer'].includes(t.flow) ? t.flow : 'real' };
      if (typeof t.transferId === 'string' && t.transferId) data.transferId = t.transferId;
      if (t.debtId && debtMap[t.debtId]) { data.debtId = debtMap[t.debtId]; if (['disburse','payment','interest'].includes(t.debtRole)) data.debtRole = t.debtRole; }
      const s = sig(data);
      if (seen.has(s)) { stat.txSkip++; continue; }
      seen.add(s); toAdd.push({ id: newId('transactions'), data });
    }
    for (let i = 0; i < toAdd.length; i += 400) { await commitPlan({ addTxns: toAdd.slice(i, i + 400) }); }
    stat.tx = toAdd.length;

    // 5) Anggaran, target tabungan, target berkala
    for (const b of arr('budgets')) {
      const categoryId = mapCat(b.categoryId); if (!categoryId || !money(b.amount) || S.budgets.some(x => x.categoryId === categoryId)) continue;
      await fbSaveBud({ categoryId, amount: Number(b.amount), period: ['harian','mingguan','bulanan','tahunan'].includes(b.period) ? b.period : 'bulanan' }); stat.other++;
    }
    for (const g of arr('goals')) {
      if (g.ladderStep) continue;   // tangga kekayaan terikat pengaturan akun → diaktifkan ulang lewat Pengaturan
      const name = str(g.name, 60).trim(); if (!name || S.goals.some(x => x.name === name)) continue;
      await fbSaveGoal({ name, target: Math.max(0, Number(g.target)||0), current: Math.max(0, Number(g.current)||0), deadline: str(g.deadline, 10), icon: str(g.icon || 'fa-bullseye', 40), color: str(g.color || '#3DDBA0', 20) }); stat.other++;
    }
    for (const t of arr('targets')) {
      if (!t || !['harian','mingguan','bulanan','tahunan'].includes(t.period) || !['nominal','checklist','jadwal'].includes(t.mode) || !str(t.title,60).trim()) continue;
      const title = str(t.title, 60).trim();
      if (S.targets.some(x => x.period === t.period && x.mode === t.mode && x.title === title)) continue;
      const data = { period: t.period, mode: t.mode, title };
      if (typeof t.description === 'string') data.description = t.description.slice(0, 150);
      if (['hemat','batas'].includes(t.goalType)) data.goalType = t.goalType;
      if (['total','kategori'].includes(t.basis)) data.basis = t.basis;
      if (money(t.amount)) data.amount = Number(t.amount);
      if (t.incomeCatId && mapCat(t.incomeCatId)) data.incomeCatId = mapCat(t.incomeCatId);
      if (t.expenseCatId && mapCat(t.expenseCatId)) data.expenseCatId = mapCat(t.expenseCatId);
      if (Array.isArray(t.completedPeriods)) data.completedPeriods = t.completedPeriods.filter(v => typeof v === 'string');
      if (Array.isArray(t.daysOfWeek)) data.daysOfWeek = t.daysOfWeek.filter(v => Number.isInteger(v) && v >= 0 && v <= 6);
      if (isDate(t.specificDate)) data.specificDate = t.specificDate;
      ['schedules','overrides','completedBlocks'].forEach(k => { if (t[k] && typeof t[k] === 'object' && !Array.isArray(t[k])) data[k] = JSON.parse(JSON.stringify(t[k])); });
      if (data.mode === 'nominal' && !data.amount) continue;
      await fbSaveTarget(data, null); stat.other++;
    }
    closeModal();
    toast(`Impor selesai: ${stat.tx} transaksi baru${stat.txSkip ? ` (${stat.txSkip} duplikat dilewati)` : ''}, ${stat.other} data lain ditambahkan`);
    renderPage();
  } catch(e) { toast('Gagal impor: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent='Impor';} }
};
async function deleteWholeCollection(name) {
  const snap = await getDocs(col(name));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach(d => batch.delete(doc(db, `users/${currentUser.uid}/${name}/${d.id}`)));
    await batch.commit();
  }
}
window.resetAll = function() {
  confirmDel('Yakin ingin menghapus SEMUA data akun ini secara permanen dari cloud (transaksi, anggaran, target, hutang/piutang, target berkala, akun, kategori)? Tindakan ini tidak bisa dibatalkan!', async () => {
    setSyncDot('syncing');
    try {
      for (const name of ['transactions','budgets','goals','debts','targets','accounts','categories']) await deleteWholeCollection(name);
      S.transactions=[]; S.budgets=[]; S.goals=[]; S.debts=[]; S.targets=[];
      S.accounts=JSON.parse(JSON.stringify(DEF_ACCS));
      S.categories=JSON.parse(JSON.stringify(DEF_CATS));
      S.settings.wealthLadder = { enabled:false, hasKPR:null, kprDebtId:null, savingsAccountId:null };   // ID lama sudah tidak ada
      await saveSettings();
      await loadAllData();   // memuat ulang; akun & kategori default dibuat otomatis bila kosong
      setSyncDot('ok');
      toast('Seluruh data akun ini telah dihapus & direset ke default','info');
    } catch(e) { setSyncDot('error'); toast('Gagal reset: '+e.message,'error'); }
  });
};

/* ─────────────────────────────────────────
   KEYBOARD SHORTCUTS
───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key==='Escape') closeModal();
  if (e.key==='n' && currentUser && !e.ctrlKey && !e.metaKey && !e.altKey && !document.querySelector('#modal-overlay.show') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
    e.preventDefault(); openTxnModal();
  }
});

/* ─────────────────────────────────────────
   RESIZE CHART RE-RENDER
───────────────────────────────────────── */
let _resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => { if(currentUser) renderCharts(); }, 300);
});

// Sidebar & main initially hidden until auth resolves
document.getElementById('sidebar').style.display = 'none';
document.getElementById('main').style.display = 'none';
