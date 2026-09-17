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
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, where, onSnapshot, writeBatch, serverTimestamp
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
let txnFilter  = { type: 'all', search: '', month: '' };
let reportRange = 3;
let debtFilter = 'all'; // all | hutang | piutang
let _targetTab = 'harian'; // harian | bulanan | tahunan
let _txnType   = 'expense';
let _charts    = {};
let _unsubscribers = [];
let _pendingDeleteId = null;

window._txnType = _txnType;

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
const fmt = n => {
  const cur = S.settings?.currency || 'Rp';
  const conf = CUR_LOCALE[cur] || CUR_LOCALE['Rp'];
  const val = Math.abs(n||0);
  return cur + ' ' + val.toLocaleString(conf.locale, { minimumFractionDigits: conf.decimals, maximumFractionDigits: conf.decimals });
};
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
const fmtS   = n => { n=n||0; if(n>=1e9) return (n/1e9).toFixed(1)+'M'; if(n>=1e6) return (n/1e6).toFixed(1)+'Jt'; if(n>=1e3) return (n/1e3).toFixed(0)+'Rb'; return n.toString() };
const catObj = id => S.categories.find(c=>c.id===id) || {name:'(Kategori Dihapus)',icon:'fa-question',color:'#8A90A8',type:'expense'};
const accObj = id => S.accounts.find(a=>a.id===id)    || {name:'(Akun Dihapus)',icon:'fa-question',color:'#8A90A8',type:'cash'};
function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function monthTxns(ago = 0) {
  const n = new Date(), y = n.getFullYear(), m = n.getMonth() - ago;
  const s = new Date(y, m, 1), e = new Date(y, m+1, 0);
  return S.transactions.filter(t => { const d = new Date(t.date); return d >= s && d <= e; });
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

// Kategori khusus utk transaksi arus-kas hutang/piutang — dibuat otomatis
// sekali saja per akun user (lazy-create), supaya user lama pun ikut dapat
// tanpa perlu migrasi manual.
async function ensureDebtCategory(type) {
  let cat = S.categories.find(c => c.name === 'Hutang/Piutang' && c.type === type);
  if (cat) return cat;
  const icon = 'fa-hand-holding-dollar', color = '#8A90A8';
  const ref = await addDoc(col('categories'), { name:'Hutang/Piutang', type, icon, color });
  cat = { id: ref.id, name:'Hutang/Piutang', type, icon, color };
  S.categories.push(cat);
  return cat;
}

// ── Target Berkala: kunci periode berjalan (dipakai utk cek "sudah selesai periode ini?") ──
function currentPeriodKey(period) {
  const n = new Date();
  if (period === 'harian')  return today();
  if (period === 'bulanan') return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`;
  return String(n.getFullYear()); // tahunan
}
// Hitung progres nominal target dari data transaksi ASLI (bukan input manual) — inilah "sinkronnya"
function targetProgress(t) {
  if (t.mode !== 'nominal') return null;
  let arr;
  if (t.period === 'harian')  arr = dayTxns(today());
  else if (t.period === 'bulanan') arr = monthTxns(0);
  else arr = yearTxns(0);
  arr = filterReal(arr);
  const inc = sumType(arr,'income'), exp = sumType(arr,'expense');
  const actual = t.goalType === 'hemat' ? (inc - exp) : exp; // 'hemat'=net saving, 'batas'=total pengeluaran
  return { actual, target: t.amount, pct: t.amount>0 ? Math.min(Math.max(actual/t.amount,0)*100,100) : 0 };
}

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
    S.transactions = []; S.budgets = []; S.goals = [];
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
  try {
    const settSnap = await getDocs(col('settings'));
    settSnap.forEach(d => { S.settings = { ...S.settings, ...d.data() }; });
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

    const txSnap = await getDocs(query(col('transactions')));
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
  }
}

async function saveSettings() {
  try {
    const snap = await getDocs(col('settings'));
    if (snap.size > 0) {
      await updateDoc(doc(db, `users/${currentUser.uid}/settings/${snap.docs[0].id}`), S.settings);
    } else {
      await addDoc(col('settings'), S.settings);
    }
  } catch(e) { /* silent */ }
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
async function fbDelTxn(id) {
  setSyncDot('syncing');
  try {
    const t = S.transactions.find(x => x.id === id);
    await deleteDoc(doc(db, `users/${currentUser.uid}/transactions/${id}`));
    S.transactions = S.transactions.filter(t => t.id !== id);
    if (t && t.transferId) {
      const pair = S.transactions.find(x => x.transferId === t.transferId);
      if (pair) {
        await deleteDoc(doc(db, `users/${currentUser.uid}/transactions/${pair.id}`));
        S.transactions = S.transactions.filter(x => x.id !== pair.id);
      }
    }
    setSyncDot('ok');
  } catch(e) { setSyncDot('error'); throw e; }
}

async function fbSaveAcc(data, editId) {
  setSyncDot('syncing');
  try {
    if (editId) {
      await updateDoc(doc(db, `users/${currentUser.uid}/accounts/${editId}`), data);
      const i = S.accounts.findIndex(a => a.id === editId);
      if (i >= 0) S.accounts[i] = { ...S.accounts[i], ...data };
    } else {
      const ref = await addDoc(col('accounts'), data);
      S.accounts.push({ id: ref.id, ...data });
    }
    setSyncDot('ok');
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
  } else {
    const ref = await addDoc(col('categories'), data);
    S.categories.push({ id: ref.id, ...data });
  }
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
  } else {
    const ref = await addDoc(col('budgets'), data);
    S.budgets.push({ id: ref.id, ...data });
  }
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
  } else {
    const ref = await addDoc(col('goals'), data);
    S.goals.push({ id: ref.id, ...data });
  }
}
async function fbDelGoal(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/goals/${id}`));
  S.goals = S.goals.filter(g => g.id !== id);
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
    if (editId) {
      await updateDoc(doc(db, `users/${currentUser.uid}/targets/${editId}`), data);
      const i = S.targets.findIndex(t => t.id === editId);
      if (i >= 0) S.targets[i] = { ...S.targets[i], ...data };
    } else {
      const ref = await addDoc(col('targets'), data);
      S.targets.push({ id: ref.id, ...data });
    }
    setSyncDot('ok');
  } catch(e) { setSyncDot('error'); throw e; }
}
async function fbDelTarget(id) {
  await deleteDoc(doc(db, `users/${currentUser.uid}/targets/${id}`));
  S.targets = S.targets.filter(t => t.id !== id);
}

/* ─────────────────────────────────────────
   BUDGET ALERTS
───────────────────────────────────────── */
function checkBudgetAlerts() {
  const tm = filterReal(monthTxns(0)).filter(t => t.type === 'expense');
  const overBudget = S.budgets.filter(b => {
    const spent = tm.filter(t => t.categoryId === b.categoryId).reduce((s,t) => s+t.amount, 0);
    return spent > b.amount;
  });
  const dot = document.getElementById('notif-dot');
  if (dot) dot.classList.toggle('hidden', overBudget.length === 0);
}

document.getElementById('notif-btn').addEventListener('click', () => {
  const tm = filterReal(monthTxns(0)).filter(t => t.type === 'expense');
  const over = S.budgets.filter(b => {
    const spent = tm.filter(t => t.categoryId === b.categoryId).reduce((s,t) => s+t.amount, 0);
    return spent > b.amount;
  });
  if (!over.length) { toast('Semua anggaran masih aman', 'info'); return; }
  openModal(`
    <div class="modal-header"><h3><i class="fa-solid fa-bell" style="color:var(--expense);margin-right:8px"></i>Peringatan Anggaran</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="modal-body">
      ${over.map(b => {
        const c = catObj(b.categoryId);
        const spent = tm.filter(t => t.categoryId === b.categoryId).reduce((s,t) => s+t.amount, 0);
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
          <div style="width:38px;height:38px;border-radius:10px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0"><i class="fa-solid ${c.icon}"></i></div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${esc(c.name)}</div>
          <div style="font-size:11.5px;color:var(--expense)">Terpakai ${fmt(spent)} dari anggaran ${fmt(b.amount)}</div></div>
          <span class="badge" style="background:var(--expense-l);color:var(--expense)">+${fmt(spent-b.amount)} over</span>
        </div>`;
      }).join('')}
    </div>
    <div class="modal-footer"><button class="btn btn-primary" onclick="closeModal();nav('budgets')">Kelola Anggaran</button></div>`);
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
  {id:'settings',icon:'fa-gear',label:'Pengaturan'}
];

function renderNav() {
  const tm = monthTxns(0).filter(t => t.type === 'expense');
  const overCount = S.budgets.filter(b => {
    const spent = tm.filter(t => t.categoryId === b.categoryId).reduce((s,t) => s+t.amount, 0);
    return spent > b.amount;
  }).length;

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
    if (S.page === 'dashboard') renderDashCharts();
    if (S.page === 'reports')   renderReportCharts();
  });
}

/* ─────────────────────────────────────────
   RENDER PAGES
───────────────────────────────────────── */
function renderPage() {
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
  const histVariance = histMonths.length ? histMonths.reduce((s,v)=>s+Math.pow(v-histAvg,2),0)/histMonths.length : 0;
  const histStd = Math.sqrt(histVariance);
  const volatilityRatio = histAvg > 0 ? histStd/histAvg : 0;

  const expThisMonth = tm.filter(t=>t.type==='expense');
  let budgetScorePct = 100, overBudgetCats = [];
  if (S.budgets.length) {
    let withinCount = 0;
    S.budgets.forEach(b => {
      const spent = expThisMonth.filter(t=>t.categoryId===b.categoryId).reduce((s,t)=>s+t.amount,0);
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

  const totalGoalSaved = S.goals.reduce((s,g)=>s+(g.current||0),0);
  const emergencyTarget = histAvg * 3;
  const emergencyCoverage = emergencyTarget > 0 ? Math.min(totalGoalSaved/emergencyTarget,1) : (totalGoalSaved>0?1:0.5);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysElapsed = now.getDate();
  const dailyBurn = daysElapsed > 0 ? exp/daysElapsed : 0;
  const projectedExp = dailyBurn * daysInMonth;
  const totalBudget = S.budgets.reduce((s,b)=>s+b.amount,0);

  let score = 0;
  score += Math.max(0, Math.min(1, savingsRate/0.2)) * 35;
  score += (S.budgets.length ? budgetScorePct/100 : 0.7) * 30;
  score += Math.max(0, 1 - Math.min(volatilityRatio,1)) * 20;
  score += emergencyCoverage * 15;
  score = Math.round(Math.max(0, Math.min(100, score)));

  let grade, gradeColor;
  if (score>=90){grade='A+';gradeColor='var(--income)';}
  else if (score>=80){grade='A';gradeColor='var(--income)';}
  else if (score>=70){grade='B';gradeColor='var(--income)';}
  else if (score>=60){grade='C';gradeColor='var(--gold)';}
  else if (score>=45){grade='D';gradeColor='var(--gold)';}
  else {grade='E';gradeColor='var(--expense)';}

  const strengths = [], risks = [], tips = [];

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
  countUp('stat-bal', bal, v => fmt(v));
  countUp('stat-inc', inc, v => fmt(v));
  countUp('stat-exp', exp, v => fmt(v));
  countUp('stat-sr', Number(sr), v => v.toFixed(1) + '%');

  const recentEl = document.getElementById('dash-recent');
  recentEl.innerHTML = recent.length ? recent.map((t, i) => {
    const c = catObj(t.categoryId);
    return `<div class="txn-row-enter" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);animation-delay:${i*.04}s">
      <div style="width:36px;height:36px;border-radius:10px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${c.icon}"></i></div>
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.description)}</div><div style="font-size:10.5px;color:var(--txm)">${new Date(t.date).toLocaleDateString('id-ID',{day:'numeric',month:'short'})} · ${esc(accObj(t.accountId).name)}</div></div>
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
      const d=new Date(); d.setMonth(d.getMonth()-i);
      labels.push(MO[d.getMonth()]);
      const tx=filterReal(monthTxns(i));
      incD.push(sumType(tx,'income')); expD.push(sumType(tx,'expense'));
    }
    _charts.bar = new Chart(bc, {
      type:'bar',
      data:{ labels, datasets:[
        {label:'Pemasukan',data:incD,backgroundColor:'rgba(61,219,160,.6)',borderColor:'var(--income)',borderWidth:1,borderRadius:6,barPercentage:.42},
        {label:'Pengeluaran',data:expD,backgroundColor:'rgba(255,112,104,.6)',borderColor:'var(--expense)',borderWidth:1,borderRadius:6,barPercentage:.42}
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
    cells.push({ day: d, type: 'current', dateStr, txns, inc, exp, hasDebtFlow });
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
        ${c.hasDebtFlow ? `<div title="Ada arus kas Hutang/Piutang di hari ini" style="width:5px;height:5px;border-radius:50%;background:#8A90A8;margin:3px auto 0"></div>` : ''}
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
  const inc   = sumType(txns,'income');
  const exp   = sumType(txns,'expense');
  const net   = inc - exp;

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
        <div class="empty-state" style="padding:24px 0">
          <i class="fa-solid fa-calendar-xmark" style="font-size:36px;opacity:.3"></i>
          <p style="font-size:13px;margin-top:10px;color:var(--txm)">Tidak ada transaksi pada tanggal ini</p>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" onclick="closeModal()">Tutup</button>
        <button class="btn btn-primary" onclick="closeModal();openTxnModal()">
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

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:18px">
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
      <button class="btn btn-primary" onclick="closeModal();openTxnModal()">
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

function fillTxnTable() {
  let txns = [...S.transactions].sort((a,b) => new Date(b.date)-new Date(a.date));
  if (txnFilter.type !== 'all')  txns = txns.filter(t => t.type === txnFilter.type);
  if (txnFilter.month)           txns = txns.filter(t => t.date.startsWith(txnFilter.month));
  if (txnFilter.search)          txns = txns.filter(t =>
    t.description.toLowerCase().includes(txnFilter.search) ||
    catObj(t.categoryId).name.toLowerCase().includes(txnFilter.search) ||
    (t.note||'').toLowerCase().includes(txnFilter.search)
  );
  const tb = document.getElementById('txn-tb'); if (!tb) return;
  tb.innerHTML = txns.length ? txns.map(t => {
    const c=catObj(t.categoryId), a=accObj(t.accountId);
    return `<tr>
      <td style="white-space:nowrap;font-size:12px;color:var(--tx2)">${new Date(t.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</td>
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
window.openTxnModal = function(editId) {
  const t = editId ? S.transactions.find(x => x.id === editId) : null;
  if (t && t.transferId) { toast('Transaksi transfer diedit lewat menu Transfer','info'); }
  _txnType = t ? t.type : 'expense';

  openModal(`
  <div class="modal-header"><h3>${t?'Edit':'Tambah'} Transaksi</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Tipe</label>
      <div class="type-toggle" id="ttog">
        <button class="${_txnType==='income'?'sel-income':''}" data-t="income"><i class="fa-solid fa-arrow-down" style="margin-right:4px;font-size:10px"></i>Pemasukan</button>
        <button class="${_txnType==='expense'?'sel-expense':''}" data-t="expense"><i class="fa-solid fa-arrow-up" style="margin-right:4px;font-size:10px"></i>Pengeluaran</button>
      </div>
    </div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Tanggal</label><input type="date" class="form-input" id="tf-date" value="${t?t.date:today()}"></div>
      <div class="form-group"><label class="form-label">Jumlah</label><input type="text" class="form-input" id="tf-amt" placeholder="0" value="${t?groupInt(t.amount):''}" inputmode="numeric" oninput="liveFormatAmount(this)"></div>
    </div>
    <div class="form-group"><label class="form-label">Deskripsi</label><input type="text" class="form-input" id="tf-desc" placeholder="Contoh: Gaji bulanan" value="${esc(t?t.description:'')}" maxlength="120"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Kategori</label><select class="form-input" id="tf-cat"></select></div>
      <div class="form-group"><label class="form-label">Akun</label><select class="form-input" id="tf-acc">${S.accounts.map(a=>`<option value="${a.id}"${t&&t.accountId===a.id?' selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
    </div>
    <div class="form-group"><label class="form-label">Catatan <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="tf-note" placeholder="Catatan tambahan..." value="${esc(t?t.note||'':'')}" maxlength="200"></div>
  </div>
  <div class="modal-footer">
    <button class="btn" onclick="closeModal()">Batal</button>
    <button class="btn btn-primary" id="save-txn-btn" onclick="saveTxn('${editId||''}')">${t?'Simpan Perubahan':'Tambah Transaksi'}</button>
  </div>`);

  fillCatSelect(t ? t.categoryId : null);
  document.querySelectorAll('#ttog button').forEach(btn => {
    btn.onclick = () => {
      _txnType = btn.dataset.t;
      document.querySelectorAll('#ttog button').forEach(b => b.className = '');
      btn.className = _txnType === 'income' ? 'sel-income' : 'sel-expense';
      fillCatSelect(null);
    };
  });
  setTimeout(() => document.getElementById('tf-amt')?.focus(), 80);
};

function fillCatSelect(selId) {
  const sel = document.getElementById('tf-cat'); if (!sel) return;
  sel.innerHTML = S.categories.filter(c => c.type === _txnType)
    .map(c => `<option value="${c.id}"${selId===c.id?' selected':''}>${esc(c.name)}</option>`).join('');
}

function parseAmount(raw) {
  const digits = String(raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return null;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
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

  const btn = document.getElementById('save-txn-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...'; }
  try {
    const data = editId
      ? { date, description:desc, amount, categoryId:catId, accountId:accId, note, type:_txnType }
      : { date, description:desc, amount, categoryId:catId, accountId:accId, note, type:_txnType, flow:'real' };
    if (editId) { await fbUpdateTxn(editId, data); toast('Transaksi diperbarui'); }
    else        { await fbAddTxn(data); toast('Transaksi ditambahkan'); }
    closeModal(); renderPage(); checkBudgetAlerts();
  } catch(e) { toast('Gagal menyimpan: ' + e.message, 'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan Perubahan':'Tambah Transaksi';} }
};

window.delTxn = function(id) {
  const t = S.transactions.find(x=>x.id===id);
  const msg = t && t.transferId ? 'Ini adalah transaksi transfer — kedua sisi transfer akan ikut terhapus. Lanjutkan?' : 'Yakin ingin menghapus transaksi ini?';
  confirmDel(msg, async () => {
    try { await fbDelTxn(id); toast('Transaksi dihapus','info'); renderPage(); checkBudgetAlerts(); }
    catch(e) { toast('Gagal menghapus','error'); }
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
  const catExp = S.categories.find(c=>c.name==='Transfer'&&c.type==='expense') || S.categories.find(c=>c.type==='expense');
  const catInc = S.categories.find(c=>c.type==='income');
  const btn = document.getElementById('tr-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Memproses...'; }
  try {
    await fbAddTxn({ date, description:`Transfer ke ${accObj(to).name}`, amount, categoryId:catExp.id, accountId:from, note, type:'expense', transferId, flow:'transfer' });
    await fbAddTxn({ date, description:`Transfer dari ${accObj(from).name}`, amount, categoryId:catInc.id, accountId:to, note, type:'income', transferId, flow:'transfer' });
    toast('Transfer berhasil'); closeModal(); renderPage();
  } catch(e) { toast('Gagal transfer: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent='Transfer';} }
};

/* ── BUDGETS ── */
function rBud(el) {
  const tm = monthTxns(0).filter(t => t.type === 'expense');
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:10px">
    <div><h3 style="font-size:17px;font-weight:700">Anggaran Bulan Ini</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Kelola batas pengeluaran per kategori</p></div>
    <button class="btn btn-primary btn-sm" onclick="openBudModal()"><i class="fa-solid fa-plus"></i> Tambah Anggaran</button>
  </div>
  <div class="grid-auto" id="bud-grid"></div>`;

  const grid = document.getElementById('bud-grid');
  if (!S.budgets.length) {
    grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-wallet"></i><p>Belum ada anggaran. Tambahkan untuk memantau pengeluaran.</p></div>'; return;
  }
  grid.innerHTML = S.budgets.map(b => {
    const c = catObj(b.categoryId);
    const spent = tm.filter(t => t.categoryId === b.categoryId).reduce((s,t) => s+t.amount, 0);
    const pct   = Math.min((spent/b.amount)*100, 100);
    const over  = spent > b.amount;
    const bc    = over ? 'var(--expense)' : pct>75 ? 'var(--gold)' : c.color;
    return `<div class="card${over?' pulse-red':''}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;border-radius:10px;background:${c.color}18;color:${c.color};display:flex;align-items:center;justify-content:center;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${c.icon}"></i></div>
          <div>
            <div style="font-weight:600;font-size:13.5px">${esc(c.name)}</div>
            <div style="font-size:11px;color:${over?'var(--expense)':pct>75?'var(--gold)':'var(--txm)'}">${over?'⚠ Melebihi anggaran!':pct>75?'Hati-hati, hampir batas':'Aman'}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px">
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
    </div>`;
  }).join('');
}

window.openBudModal = function(editId) {
  const b = editId ? S.budgets.find(x=>x.id===editId) : null;
  const existing = S.budgets.filter(x=>x.id!==editId).map(x=>x.categoryId);
  const avail = S.categories.filter(c=>c.type==='expense'&&!existing.includes(c.id));
  if (!avail.length && !b) { toast('Semua kategori sudah memiliki anggaran','info'); return; }
  const opts = b ? S.categories.filter(c=>c.type==='expense') : avail;
  openModal(`
  <div class="modal-header"><h3>${b?'Edit':'Tambah'} Anggaran</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Kategori</label><select class="form-input" id="bf-cat">${opts.map(c=>`<option value="${c.id}"${b&&b.categoryId===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Jumlah Anggaran per Bulan</label><input type="text" class="form-input" id="bf-amt" placeholder="0" inputmode="numeric" value="${b?groupInt(b.amount):''}" oninput="liveFormatAmount(this)"></div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="bf-save-btn" onclick="saveBud('${editId||''}')">${b?'Simpan':'Tambah'}</button></div>`);
};
window.saveBud = async function(editId) {
  const categoryId = document.getElementById('bf-cat').value;
  const amount = parseAmount(document.getElementById('bf-amt').value);
  if (!categoryId||!amount) { toast('Harap isi dengan benar','error'); return; }
  const btn = document.getElementById('bf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try { await fbSaveBud({categoryId,amount}, editId||null); toast(editId?'Anggaran diperbarui':'Anggaran ditambahkan'); closeModal(); renderPage(); checkBudgetAlerts(); }
  catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delBud = function(id) {
  confirmDel('Hapus anggaran ini?', async () => { await fbDelBud(id); toast('Anggaran dihapus','info'); renderPage(); checkBudgetAlerts(); });
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

  <div class="grid-auto" id="debt-grid"></div>`;

  document.querySelectorAll('#debt-ftog button').forEach(b => {
    b.onclick = () => { debtFilter = b.dataset.f; renderPage(); };
  });
  fillDebtGrid();
}

window.flipDebt3D = function() {
  const card = document.getElementById('debt3d-card');
  if (card) card.classList.toggle('flipped');
};

function fillDebtGrid() {
  const grid = document.getElementById('debt-grid'); if (!grid) return;
  let list = [...S.debts];
  if (debtFilter !== 'all') list = list.filter(d => d.type === debtFilter);
  list.sort((a,b) => debtRemaining(b) - debtRemaining(a));

  if (!list.length) { grid.innerHTML = '<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-hand-holding-dollar"></i><p>Belum ada catatan hutang/piutang.</p></div>'; return; }

  const todayStr = today();
  grid.innerHTML = list.map(d => {
    const remaining = debtRemaining(d);
    const isLunas   = remaining <= 0;
    const isOverdue = !isLunas && d.dueDate && d.dueDate < todayStr;
    const pct = d.amount>0 ? Math.min(((d.paid||0)/d.amount)*100,100) : 0;
    const isHutang = d.type === 'hutang';
    const color = isHutang ? 'var(--expense)' : 'var(--income)';
    const statusBadge = isLunas
      ? `<span class="badge" style="background:var(--income-l);color:var(--income)"><i class="fa-solid fa-check"></i> Lunas</span>`
      : isOverdue
      ? `<span class="badge" style="background:var(--expense-l);color:var(--expense)"><i class="fa-solid fa-triangle-exclamation"></i> Jatuh Tempo</span>`
      : `<span class="badge" style="background:${color}18;color:${color}">Berjalan</span>`;
    return `<div class="card${isOverdue?' pulse-red':''}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;border-radius:10px;background:${color}18;color:${color};display:flex;align-items:center;justify-content:center;box-shadow:var(--neu-pressed-sm)">
            <i class="fa-solid ${isHutang?'fa-arrow-up-from-bracket':'fa-arrow-down-to-bracket'}"></i>
          </div>
          <div>
            <div style="font-weight:700;font-size:14px">${esc(d.person)}</div>
            <div style="font-size:11px;color:var(--txm)">${isHutang?'Saya berhutang':'Berhutang ke saya'}${d.dueDate?' · Jatuh tempo '+new Date(d.dueDate).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):''}</div>
          </div>
        </div>
        <div style="display:flex;gap:4px">
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
  }).join('');
}

const DEBT_TYPE_LABEL = { hutang: 'Hutang (Saya Berhutang)', piutang: 'Piutang (Orang Berhutang ke Saya)' };
window.openDebtModal = function(editId) {
  const d = editId ? S.debts.find(x=>x.id===editId) : null;
  const type = d ? d.type : 'hutang';
  openModal(`
  <div class="modal-header"><h3>${d?'Edit':'Catat'} Hutang / Piutang</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Jenis</label>
      <div class="type-toggle" id="dtog">
        <button class="${type==='hutang'?'sel-expense':''}" data-t="hutang"><i class="fa-solid fa-arrow-up-from-bracket" style="margin-right:4px;font-size:10px"></i>Hutang Saya</button>
        <button class="${type==='piutang'?'sel-income':''}" data-t="piutang"><i class="fa-solid fa-arrow-down-to-bracket" style="margin-right:4px;font-size:10px"></i>Piutang Saya</button>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Nama Orang / Pihak</label><input type="text" class="form-input" id="df-person" placeholder="Contoh: Budi" value="${esc(d?d.person:'')}" maxlength="60"></div>
    <div class="grid-2">
      <div class="form-group"><label class="form-label">Jumlah Pokok</label><input type="text" class="form-input" id="df-amt" placeholder="0" inputmode="numeric" value="${d?groupInt(d.amount):''}" oninput="liveFormatAmount(this)"></div>
      <div class="form-group"><label class="form-label">Sudah Dibayar</label><input type="text" class="form-input" id="df-paid" placeholder="0" inputmode="numeric" value="${d?groupInt(d.paid||0):'0'}" ${d?'':'disabled'} oninput="liveFormatAmount(this)"></div>
    </div>
    <div class="form-group"><label class="form-label">Jatuh Tempo <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="date" class="form-input" id="df-due" value="${d?d.dueDate||'':''}"></div>
    <div class="form-group"><label class="form-label">Catatan <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="df-note" placeholder="Contoh: Pinjam untuk modal usaha" value="${esc(d?d.note||'':'')}" maxlength="200"></div>
    ${!d ? `
    <div style="padding:12px;border-radius:10px;background:var(--bg2);border:1px solid var(--border);margin-top:6px">
      <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--tx2);cursor:pointer;margin-bottom:0">
        <input type="checkbox" id="df-astxn" checked style="width:16px;height:16px" onchange="document.getElementById('df-astxn-fields').style.display=this.checked?'':'none'">
        <span id="df-astxn-label">Catat juga penerimaan dana ke akun (uang benar-benar masuk ke dompet saya)</span>
      </label>
      <div id="df-astxn-fields" style="margin-top:10px">
        <div class="grid-2">
          <div class="form-group" style="margin-bottom:0"><label class="form-label">Akun</label><select class="form-input" id="df-acc">${S.accounts.map(a=>`<option value="${a.id}">${esc(a.name)}</option>`).join('')}</select></div>
          <div class="form-group" style="margin-bottom:0"><label class="form-label">Tanggal</label><input type="date" class="form-input" id="df-date" value="${today()}"></div>
        </div>
      </div>
      <p style="font-size:10.5px;color:var(--txm);margin-top:8px;margin-bottom:0">Dana ini <b>tidak</b> dihitung sebagai pendapatan/pengeluaran di Dashboard & Laporan — cuma pergerakan kas nyata.</p>
    </div>` : ''}
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="df-save-btn" onclick="saveDebt('${editId||''}')">${d?'Simpan':'Catat'}</button></div>`);

  let _dType = type;
  const updateAstxnLabel = () => {
    const lbl = document.getElementById('df-astxn-label');
    if (lbl) lbl.textContent = _dType === 'hutang'
      ? 'Catat juga penerimaan dana ke akun (uang benar-benar masuk ke dompet saya)'
      : 'Catat juga pengeluaran dana dari akun (uang benar-benar keluar dari dompet saya)';
  };
  document.querySelectorAll('#dtog button').forEach(btn => {
    btn.onclick = () => {
      _dType = btn.dataset.t;
      document.querySelectorAll('#dtog button').forEach(b => b.className = '');
      btn.className = _dType === 'hutang' ? 'sel-expense' : 'sel-income';
      updateAstxnLabel();
    };
  });
  window._dtypeGetter = () => _dType;
};
window.saveDebt = async function(editId) {
  const type   = window._dtypeGetter ? window._dtypeGetter() : 'hutang';
  const person = document.getElementById('df-person').value.trim();
  const amount = parseAmount(document.getElementById('df-amt').value);
  const paid   = parseAmount(document.getElementById('df-paid').value) ?? 0;
  const dueDate= document.getElementById('df-due').value || null;
  const note   = document.getElementById('df-note').value.trim();
  if (!person || !amount) { toast('Harap isi nama & jumlah dengan benar','error'); return; }
  if (paid > amount) { toast('Jumlah terbayar tidak boleh melebihi total','error'); return; }
  const btn = document.getElementById('df-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try {
    const newId = await fbSaveDebt({ type, person, amount, paid, dueDate, note }, editId||null);

    // Kalau ini pencatatan BARU dan user centang "catat penerimaan/pengeluaran dana",
    // buat transaksi arus-kas bertanda flow:'hutang' — supaya saldo akun akurat TAPI
    // tidak mencemari statistik pendapatan/pengeluaran riil.
    const astxnBox = document.getElementById('df-astxn');
    if (!editId && astxnBox && astxnBox.checked) {
      const accId = document.getElementById('df-acc').value;
      const date  = document.getElementById('df-date').value || today();
      const isHutang = type === 'hutang';
      const cat = await ensureDebtCategory(isHutang ? 'income' : 'expense');
      await fbAddTxn({
        date, amount, categoryId: cat.id, accountId: accId,
        description: (isHutang ? 'Menerima pinjaman dari ' : 'Memberi pinjaman ke ') + person,
        note: '', type: isHutang ? 'income' : 'expense', flow: 'hutang', debtId: newId
      });
    }
    toast(editId?'Data diperbarui':'Dicatat'); closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Catat';} }
};
window.delDebt = function(id) {
  confirmDel('Hapus catatan hutang/piutang ini? Riwayat pembayaran juga akan hilang (transaksi terkait tidak otomatis terhapus).', async () => {
    await fbDelDebt(id); toast('Data dihapus','info'); renderPage();
  });
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
      <input type="checkbox" id="pd-astxn" checked style="width:16px;height:16px">
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
  const btn = document.getElementById('pd-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try {
    const newPaid = (d.paid||0) + amt;
    await fbSaveDebt({ paid: newPaid }, id);
    if (asTxn) {
      const isHutang = d.type === 'hutang';
      // Pokok → flow:'hutang' (cuma pergerakan kas, dikecualikan dari statistik)
      const debtCat = await ensureDebtCategory(isHutang ? 'expense' : 'income');
      await fbAddTxn({
        date, description: (isHutang?'Bayar pokok hutang ke ':'Terima pokok piutang dari ')+d.person,
        amount: amt, categoryId: debtCat.id, accountId: accId, note: '',
        type: isHutang?'expense':'income', flow:'hutang', debtId: id
      });
      // Bunga/biaya (kalau diisi) → flow:'real' (memang pendapatan/pengeluaran riil)
      if (interest > 0) {
        const realCat = isHutang
          ? (S.categories.find(c=>c.type==='expense') )
          : (S.categories.find(c=>c.type==='income'));
        await fbAddTxn({
          date, description: (isHutang?'Bunga/denda hutang ke ':'Bunga/keuntungan piutang dari ')+d.person,
          amount: interest, categoryId: realCat.id, accountId: accId, note: '',
          type: isHutang?'expense':'income', flow:'real', debtId: id
        });
      }
    }
    toast('Pembayaran dicatat'); closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent='Simpan';} }
};

/* ── ACCOUNTS ── */
function rAcc(el) {
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <div><h3 style="font-size:17px;font-weight:700">Akun Keuangan</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Kelola dompet, bank, dan e-wallet</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="openTransferModal()"><i class="fa-solid fa-right-left"></i> Transfer</button>
      <button class="btn btn-primary btn-sm" onclick="openAccModal()"><i class="fa-solid fa-plus"></i> Tambah Akun</button>
    </div>
  </div>
  <div class="grid-auto">${S.accounts.map(a => {
    const b = accBal(a.id);
    const tl = a.type==='cash'?'Tunai':a.type==='bank'?'Bank':'E-Wallet';
    return `<div class="card" style="position:relative;overflow:hidden">
      <div style="position:absolute;top:-20px;right:-20px;width:80px;height:80px;border-radius:50%;background:${a.color}0a"></div>
      <div style="display:flex;justify-content:space-between;align-items:start;position:relative;z-index:1">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:46px;height:46px;border-radius:13px;background:${a.color}18;color:${a.color};display:flex;align-items:center;justify-content:center;font-size:19px;box-shadow:var(--neu-pressed-sm)"><i class="fa-solid ${a.icon}"></i></div>
          <div><div style="font-weight:700;font-size:15px">${esc(a.name)}</div><div style="font-size:11px;color:var(--txm)">${tl}</div></div>
        </div>
        <div style="display:flex;gap:4px">
          <button class="btn-icon" style="width:27px;height:27px" onclick="openAccModal('${a.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
          <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delAcc('${a.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
        </div>
      </div>
      <div style="margin-top:14px;font-family:'Outfit';font-size:24px;font-weight:800;color:${b>=0?'var(--income)':'var(--expense)'};position:relative;z-index:1">${fmt(b)}</div>
    </div>`;
  }).join('')}</div>`;
}

const ACC_COLORS = ['#4ADE80','#22D3EE','#A78BFA','#FFB830','#FF7068','#EC4899','#FB923C','#7B9EF8'];
const ACC_ICONS  = [['fa-money-bill-wave','Tunai'],['fa-building-columns','Bank'],['fa-mobile-screen','E-Wallet'],['fa-credit-card','Kartu Kredit'],['fa-piggy-bank','Tabungan']];
let _accColor = '#4ADE80';

window.openAccModal = function(editId) {
  const a = editId ? S.accounts.find(x=>x.id===editId) : null;
  _accColor = a ? a.color : ACC_COLORS[0];
  openModal(`
  <div class="modal-header"><h3>${a?'Edit':'Tambah'} Akun</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Nama Akun</label><input type="text" class="form-input" id="af-name" placeholder="Contoh: Bank Mandiri" value="${esc(a?a.name:'')}" maxlength="40"></div>
    <div class="form-group"><label class="form-label">Tipe</label><select class="form-input" id="af-icon">${ACC_ICONS.map(([ic,lb])=>`<option value="${ic}"${a&&a.icon===ic?' selected':''}>${lb}</option>`).join('')}</select></div>
    <div class="form-group"><label class="form-label">Warna</label><div style="display:flex;gap:7px;flex-wrap:wrap" id="af-colors">${ACC_COLORS.map(cl=>`<div style="width:30px;height:30px;border-radius:8px;background:${cl};cursor:pointer;border:3px solid ${_accColor===cl?'white':'transparent'};transition:all .15s;box-shadow:var(--neu-raised-sm)" onclick="pickAccC(this,'${cl}')"></div>`).join('')}</div></div>
  </div>
  <div class="modal-footer"><button class="btn" onclick="closeModal()">Batal</button><button class="btn btn-primary" id="af-save-btn" onclick="saveAcc('${editId||''}')">${a?'Simpan':'Tambah'}</button></div>`);
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
  if (!name) { toast('Nama akun harus diisi','error'); return; }
  const btn = document.getElementById('af-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try { await fbSaveAcc({name,icon,color:_accColor,type}, editId||null); toast(editId?'Akun diperbarui':'Akun ditambahkan'); closeModal(); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delAcc = function(id) {
  if (S.accounts.length <= 1) { toast('Minimal harus ada 1 akun','error'); return; }
  if (S.transactions.some(t => t.accountId === id)) { toast('Tidak bisa menghapus akun yang memiliki transaksi','error'); return; }
  confirmDel('Hapus akun ini?', async () => { try { await fbDelAcc(id); toast('Akun dihapus','info'); renderPage(); } catch(e) { toast('Gagal','error'); } });
};

/* ── GOALS ── */
function rGoal(el) {
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
    <div><h3 style="font-size:17px;font-weight:700">Target Tabungan</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Pantau progres tujuan keuangan</p></div>
    <button class="btn btn-primary btn-sm" onclick="openGoalModal()"><i class="fa-solid fa-plus"></i> Tambah Target</button>
  </div>
  <div class="grid-auto" id="goal-grid"></div>`;

  const grid = document.getElementById('goal-grid');
  if (!S.goals.length) { grid.innerHTML='<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-bullseye"></i><p>Belum ada target tabungan. Mulai rencanakan sekarang!</p></div>'; return; }

  grid.innerHTML = S.goals.map(g => {
    const pct  = Math.min((g.current/g.target)*100, 100);
    const rem  = g.target - g.current;
    const dl   = Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / 864e5));
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
            <div style="font-size:11px;color:var(--txm);margin-top:2px">Sisa ${fmt(rem)} · ${dl} hari lagi</div>
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
  if(!name||!target||!deadline){toast('Harap isi semua field','error');return}
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
    const newCur=Math.min(g.current+amt,g.target);
    const justReached = g.current < g.target && newCur >= g.target;
    await fbSaveGoal({...g,current:newCur},id);
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
  { id:'harian',  label:'Harian',  icon:'fa-sun' },
  { id:'bulanan', label:'Bulanan', icon:'fa-calendar-week' },
  { id:'tahunan', label:'Tahunan', icon:'fa-calendar-days' }
];
function rTargets(el) {
  el.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
    <div><h3 style="font-size:17px;font-weight:700">Target Berkala</h3><p style="font-size:12.5px;color:var(--tx2);margin-top:3px">Rencanakan target harian, bulanan, dan tahunan Anda sendiri</p></div>
    <button class="btn btn-primary btn-sm" onclick="openTargetModal()"><i class="fa-solid fa-plus"></i> Tambah Target</button>
  </div>
  <div class="type-toggle" id="target-tabs" style="max-width:420px;margin-bottom:18px">
    ${TARGET_TABS.map(t=>`<button class="${_targetTab===t.id?'sel-active':''}" data-tab="${t.id}"><i class="fa-solid ${t.icon}" style="margin-right:5px;font-size:10px"></i>${t.label}</button>`).join('')}
  </div>
  <div class="grid-auto" id="target-grid"></div>`;

  document.querySelectorAll('#target-tabs button').forEach(b => {
    b.onclick = () => { _targetTab = b.dataset.tab; renderPage(); };
  });
  fillTargetGrid();
}

function fillTargetGrid() {
  const grid = document.getElementById('target-grid'); if (!grid) return;
  const list = S.targets.filter(t => t.period === _targetTab);
  if (!list.length) {
    grid.innerHTML = `<div class="card empty-state" style="grid-column:1/-1"><i class="fa-solid fa-list-check"></i><p>Belum ada target ${_targetTab}. Tambahkan target Anda sendiri — bisa nominal (otomatis sinkron dengan transaksi) atau checklist kebiasaan.</p></div>`;
    return;
  }
  const pKey = currentPeriodKey(_targetTab);
  grid.innerHTML = list.map(t => {
    if (t.mode === 'nominal') {
      const p = targetProgress(t);
      const achieved = t.goalType === 'hemat' ? p.actual >= p.target : p.actual <= p.target;
      const color = achieved ? 'var(--income)' : (p.pct>=80 ? 'var(--gold)' : 'var(--acc)');
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:10px">
          <div>
            <div style="font-weight:700;font-size:14px">${esc(t.title)}</div>
            <div style="font-size:11px;color:var(--txm)">${t.goalType==='hemat'?'Target hemat (pemasukan − pengeluaran)':'Batas maksimal pengeluaran'} · Otomatis dari transaksi</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn-icon" style="width:27px;height:27px" onclick="openTargetModal('${t.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
            <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delTarget('${t.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
          </div>
        </div>
        <div class="progress-bar"><div class="progress-fill" style="width:${p.pct}%;background:${color}"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:7px;font-size:12.5px">
          <span style="color:${color};font-weight:600">${fmt(p.actual)}</span>
          <span style="color:var(--txm)">target ${fmt(p.target)}</span>
        </div>
        ${achieved?`<div style="margin-top:8px"><span class="badge" style="background:var(--income-l);color:var(--income)"><i class="fa-solid fa-check"></i> Tercapai</span></div>`:''}
      </div>`;
    } else {
      const done = (t.completedPeriods||[]).includes(pKey);
      return `<div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
          <div>
            <div style="font-weight:700;font-size:14px">${esc(t.title)}</div>
            ${t.description?`<div style="font-size:11.5px;color:var(--tx2);margin-top:3px">${esc(t.description)}</div>`:''}
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn-icon" style="width:27px;height:27px" onclick="openTargetModal('${t.id}')"><i class="fa-solid fa-pen" style="font-size:9px"></i></button>
            <button class="btn-icon" style="width:27px;height:27px;color:var(--expense)" onclick="delTarget('${t.id}')"><i class="fa-solid fa-trash" style="font-size:9px"></i></button>
          </div>
        </div>
        <button class="btn ${done?'btn-primary':''} btn-sm" style="width:100%;justify-content:center" onclick="toggleTargetDone('${t.id}')">
          <i class="fa-solid ${done?'fa-check-circle':'fa-circle'}"></i> ${done?'Selesai periode ini':'Tandai Selesai'}
        </button>
      </div>`;
    }
  }).join('');
}

let _targetMode = 'nominal';
window.openTargetModal = function(editId) {
  const t = editId ? S.targets.find(x=>x.id===editId) : null;
  _targetMode = t ? t.mode : 'nominal';
  const period = t ? t.period : _targetTab;
  openModal(`
  <div class="modal-header"><h3>${t?'Edit':'Tambah'} Target ${TARGET_TABS.find(x=>x.id===period)?.label||''}</h3><button class="btn-icon" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
  <div class="modal-body">
    <div class="form-group"><label class="form-label">Periode</label>
      <select class="form-input" id="tf-period">${TARGET_TABS.map(x=>`<option value="${x.id}"${period===x.id?' selected':''}>${x.label}</option>`).join('')}</select>
    </div>
    <div class="form-group"><label class="form-label">Mode</label>
      <div class="type-toggle" id="tmtog">
        <button class="${_targetMode==='nominal'?'sel-active':''}" data-m="nominal">Nominal (Otomatis)</button>
        <button class="${_targetMode==='checklist'?'sel-active':''}" data-m="checklist">Checklist (Manual)</button>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Judul Target</label><input type="text" class="form-input" id="tf-title" placeholder="Contoh: Hemat harian / Olahraga rutin" value="${esc(t?t.title:'')}" maxlength="60"></div>

    <div id="tf-nominal-fields" style="${_targetMode!=='nominal'?'display:none':''}">
      <div class="form-group"><label class="form-label">Jenis</label>
        <select class="form-input" id="tf-goaltype">
          <option value="hemat"${t&&t.goalType==='hemat'?' selected':''}>Target Hemat (pemasukan − pengeluaran ≥ nominal)</option>
          <option value="batas"${t&&t.goalType==='batas'?' selected':''}>Batas Pengeluaran (pengeluaran ≤ nominal)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Jumlah Target</label><input type="text" class="form-input" id="tf-amount" placeholder="0" inputmode="numeric" value="${t&&t.amount?groupInt(t.amount):''}" oninput="liveFormatAmount(this)"></div>
    </div>
    <div id="tf-checklist-fields" style="${_targetMode!=='checklist'?'display:none':''}">
      <div class="form-group"><label class="form-label">Deskripsi <span style="font-weight:400;color:var(--txm)">(opsional)</span></label><input type="text" class="form-input" id="tf-desc" placeholder="Contoh: Jalan kaki 30 menit" value="${esc(t?t.description||'':'')}" maxlength="150"></div>
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
    };
  });
};
window.saveTarget = async function(editId) {
  const period = document.getElementById('tf-period').value;
  const title  = document.getElementById('tf-title').value.trim();
  if (!title) { toast('Judul target harus diisi','error'); return; }
  let data = { period, mode:_targetMode, title };
  if (_targetMode === 'nominal') {
    const amount = parseAmount(document.getElementById('tf-amount').value);
    if (!amount) { toast('Isi jumlah target dengan benar','error'); return; }
    data.goalType = document.getElementById('tf-goaltype').value;
    data.amount = amount;
  } else {
    data.description = document.getElementById('tf-desc').value.trim();
    data.completedPeriods = editId ? (S.targets.find(x=>x.id===editId)?.completedPeriods || []) : [];
  }
  const btn = document.getElementById('tf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try {
    await fbSaveTarget(data, editId||null);
    _targetTab = period;
    toast(editId?'Target diperbarui':'Target ditambahkan'); closeModal(); renderPage();
  } catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delTarget = function(id) {
  confirmDel('Hapus target ini?', async ()=>{ await fbDelTarget(id); toast('Target dihapus','info'); renderPage(); });
};
window.toggleTargetDone = async function(id) {
  const t = S.targets.find(x=>x.id===id); if (!t) return;
  const pKey = currentPeriodKey(t.period);
  const list = new Set(t.completedPeriods || []);
  if (list.has(pKey)) list.delete(pKey); else list.add(pKey);
  try { await fbSaveTarget({ completedPeriods: [...list] }, id); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); }
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
      <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.description)}</div><div style="font-size:10.5px;color:var(--txm)">${new Date(t.date).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</div></div>
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
    for(let i=reportRange-1;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);lbs.push(MO[d.getMonth()]+" '"+d.getFullYear().toString().slice(2));const tx=filterReal(monthTxns(i));const inc=sumType(tx,'income'),exp=sumType(tx,'expense');incD.push(inc);expD.push(exp);rb+=(inc-exp);balD.push(rb)}
    _charts.rLine=new Chart(c1,{type:'line',data:{labels:lbs,datasets:[
      {label:'Pemasukan',data:incD,borderColor:'var(--income)',backgroundColor:'rgba(61,219,160,.08)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'var(--income)',borderWidth:2},
      {label:'Pengeluaran',data:expD,borderColor:'var(--expense)',backgroundColor:'rgba(255,112,104,.08)',fill:true,tension:.4,pointRadius:4,pointBackgroundColor:'var(--expense)',borderWidth:2},
      {label:'Saldo',data:balD,borderColor:'var(--gold)',backgroundColor:'transparent',borderDash:[5,5],tension:.4,pointRadius:3,pointBackgroundColor:'var(--gold)',borderWidth:2}
    ]},options:chartBaseOpts({tooltipCallbacks:{label:ctx=>ctx.dataset.label+': '+fmt(ctx.raw)}})});
  }
  if(c2){const txns=[];for(let i=0;i<reportRange;i++)txns.push(...filterReal(monthTxns(i)));const ec={};txns.filter(t=>t.type==='expense').forEach(t=>{const c=catObj(t.categoryId);ec[c.name]=(ec[c.name]||0)+t.amount});const lbs=Object.keys(ec),vals=Object.values(ec);if(lbs.length)_charts.rPie=new Chart(c2,{type:'pie',data:{labels:lbs,datasets:[{data:vals,backgroundColor:CHART_COLORS.slice(0,lbs.length),borderWidth:0}]},options:chartBaseOpts({noScales:true,legend:{position:'bottom'},tooltipCallbacks:{label:ctx=>ctx.label+': '+fmt(ctx.raw)}})})}
  if(c3){const txns=[];for(let i=0;i<reportRange;i++)txns.push(...filterReal(monthTxns(i)));const am={};txns.filter(t=>t.type==='expense').forEach(t=>{const a=accObj(t.accountId);am[a.name]=(am[a.name]||0)+t.amount});const lbs=Object.keys(am),vals=Object.values(am);const cls=S.accounts.filter(a=>am[a.name]).map(a=>a.color);if(lbs.length)_charts.rAcc=new Chart(c3,{type:'doughnut',data:{labels:lbs,datasets:[{data:vals,backgroundColor:cls,borderWidth:0}]},options:chartBaseOpts({noScales:true,legend:{position:'bottom'},tooltipCallbacks:{label:ctx=>ctx.label+': '+fmt(ctx.raw)},chartExtra:{cutout:'62%'}})})}
}

/* ── SETTINGS ── */
function rSet(el) {
  el.innerHTML = `
  <div style="max-width:580px">
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
      <h4 style="font-size:15px;margin-bottom:14px">Mata Uang</h4>
      <select class="form-input" id="sf-cur" style="width:190px" onchange="S.settings.currency=this.value;saveSettings();renderPage()">
        <option value="Rp"${S.settings.currency==='Rp'?' selected':''}>Rp — Rupiah</option>
        <option value="$"${S.settings.currency==='$'?' selected':''}>$ — Dollar</option>
        <option value="€"${S.settings.currency==='€'?' selected':''}>€ — Euro</option>
        <option value="¥"${S.settings.currency==='¥'?' selected':''}>¥ — Yen</option>
        <option value="£"${S.settings.currency==='£'?' selected':''}>£ — Pound</option>
      </select>
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
      <h4 style="font-size:15px;margin-bottom:14px">Data & Sinkronisasi</h4>
      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn btn-sm" onclick="exportCSV()"><i class="fa-solid fa-download"></i> Ekspor CSV</button>
        <button class="btn btn-sm" onclick="exportJSON()"><i class="fa-solid fa-file-export"></i> Ekspor JSON</button>
        <button class="btn btn-sm" onclick="importData()"><i class="fa-solid fa-upload"></i> Impor Data</button>
      </div>
      <button class="btn btn-sm btn-danger" onclick="resetAll()"><i class="fa-solid fa-trash"></i> Hapus Semua Data Akun Ini</button>
      <p style="font-size:10.5px;color:var(--txm);margin-top:8px">Tindakan ini menghapus seluruh data di cloud (Firebase) untuk akun yang sedang login — bukan sekadar cache lokal — dan tidak dapat dibatalkan.</p>
    </div>

    <div class="card">
      <h4 style="font-size:15px;margin-bottom:8px">Tentang Money Management</h4>
      <p style="font-size:12.5px;color:var(--tx2)">Pencatat keuangan pribadi dengan sinkronisasi Firebase Firestore dan tampilan Kalender interaktif.</p>
      <p style="font-size:11px;color:var(--txm);margin-top:6px">Versi 5.0 · Firebase Realtime Sync · Neumorphism UI · Kalender · AI Analysis Pro</p>
      <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--txm)">
        <i class="fa-solid fa-dollar-sign" style="color:var(--gold);margin-right:5px"></i>
        Diproduksi oleh <strong style="color:var(--gold)">AL-HAZA Production</strong>
      </div>
    </div>
  </div>`;
  fillSetCats();
}

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
  const btn = document.getElementById('cf-save-btn');
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i>'; }
  try { await fbSaveCat({name,type,icon:_catIcon,color:_catColor}, editId||null); toast(editId?'Kategori diperbarui':'Kategori ditambahkan'); closeModal(); renderPage(); }
  catch(e) { toast('Gagal: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent=editId?'Simpan':'Tambah';} }
};
window.delCat = function(id) {
  if (S.transactions.some(t=>t.categoryId===id)) { toast('Tidak bisa menghapus kategori yang memiliki transaksi','error'); return; }
  if (S.budgets.some(b=>b.categoryId===id)) { toast('Tidak bisa menghapus kategori yang masih dipakai di anggaran. Hapus anggarannya dahulu.','error'); return; }
  confirmDel('Hapus kategori ini?', async ()=>{ await fbDelCat(id); toast('Kategori dihapus','info'); renderPage(); });
};

/* ── EXPORT / IMPORT ── */
window.exportCSV = function() {
  const h=['Tanggal','Tipe','Kategori','Akun','Deskripsi','Jumlah','Catatan'];
  const r=S.transactions.sort((a,b)=>new Date(b.date)-new Date(a.date)).map(t=>
    [t.date,t.type==='income'?'Pemasukan':'Pengeluaran',catObj(t.categoryId).name,accObj(t.accountId).name,t.description,t.amount,t.note||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')
  );
  const csv='\uFEFF'+[h.join(','),...r].join('\n');
  const b=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`fintrack_${today()}.csv`; a.click(); URL.revokeObjectURL(u);
  toast('Data diekspor ke CSV');
};
window.exportJSON = function() {
  const d=JSON.stringify({accounts:S.accounts,categories:S.categories,transactions:S.transactions,budgets:S.budgets,goals:S.goals,settings:S.settings},null,2);
  const b=new Blob([d],{type:'application/json'});
  const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download=`fintrack_backup_${today()}.json`; a.click(); URL.revokeObjectURL(u);
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
  if (btn) { btn.disabled=true; btn.innerHTML='<i class="fa-solid fa-spinner fa-spin"></i> Mengimpor...'; }
  try {
    if (Array.isArray(d.accounts))   for (const a of d.accounts)   await fbSaveAcc({name:a.name,type:a.type,icon:a.icon,color:a.color});
    if (Array.isArray(d.categories)) for (const c of d.categories) await fbSaveCat({name:c.name,type:c.type,icon:c.icon,color:c.color});
    if (Array.isArray(d.transactions)) for (const t of d.transactions) await fbAddTxn({date:t.date,description:t.description,amount:t.amount,categoryId:t.categoryId,accountId:t.accountId,note:t.note||'',type:t.type});
    if (Array.isArray(d.budgets))    for (const b of d.budgets)    await fbSaveBud({categoryId:b.categoryId,amount:b.amount});
    if (Array.isArray(d.goals))      for (const g of d.goals)      await fbSaveGoal({name:g.name,target:g.target,current:g.current,deadline:g.deadline,icon:g.icon,color:g.color});
    closeModal(); toast('Data berhasil diimpor & tersinkron'); renderPage(); renderNav();
  } catch(e) { toast('Gagal impor: '+e.message,'error'); if(btn){btn.disabled=false;btn.textContent='Impor';} }
};
window.resetAll = function() {
  confirmDel('Yakin ingin menghapus SEMUA data akun ini secara permanen dari cloud (transaksi, anggaran, target, akun, kategori)? Tindakan ini tidak bisa dibatalkan!', async () => {
    setSyncDot('syncing');
    try {
      for (const name of ['transactions','budgets','goals','accounts','categories']) {
        const snap = await getDocs(col(name));
        for (const d of snap.docs) await deleteDoc(doc(db, `users/${currentUser.uid}/${name}/${d.id}`));
      }
      S.transactions=[]; S.budgets=[]; S.goals=[];
      S.accounts=JSON.parse(JSON.stringify(DEF_ACCS));
      S.categories=JSON.parse(JSON.stringify(DEF_CATS));
      for (const a of DEF_ACCS) await addDoc(col('accounts'), {name:a.name,type:a.type,icon:a.icon,color:a.color});
      for (const c of DEF_CATS) await addDoc(col('categories'), {name:c.name,type:c.type,icon:c.icon,color:c.color});
      await loadAllData();
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
  if (e.key==='n' && !document.querySelector('#modal-overlay.show') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
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
