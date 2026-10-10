import { $, setVals } from './dom.mjs';
import * as FB from './fake-firebase.mjs';
import { checkStore } from './rules-port.mjs';
const target = process.argv[2] || './app.test.mjs';
const mod = await import(target);
const X = mod.__x;
const toasts = [];
const origToast = window.toast; window.toast = (m,t) => toasts.push([t||'success', m]);
let pass = 0, fail = 0; const failures = [];
const ok = (cond, name, extra='') => { if (cond) pass++; else { fail++; failures.push(name + (extra?` → ${extra}`:'')); } };
const eq = (a, b, name) => ok(JSON.stringify(a) === JSON.stringify(b), name, `didapat ${JSON.stringify(a)}, harap ${JSON.stringify(b)}`);
const S = () => X.S();
const last = () => toasts[toasts.length-1];
async function login(uid='u1') { await globalThis.__authCb({ uid, email: uid+'@t.id', displayName: uid }); await new Promise(r=>setTimeout(r,20)); }
const D = (off=0) => { const d=new Date(); d.setDate(d.getDate()+off); return X.localDateStr(d); };
const which = process.argv[3] || 'all';

async function addTxn({type='expense', date=D(), desc='tes', amt='10.000', cat, acc, note=''}) {
  window.openTxnModal(null, date); X.setTxnType(type);
  const c = cat || S().categories.find(c=>c.type===type && c.name!=='Hutang/Piutang').id;
  setVals({'tf-date':date,'tf-desc':desc,'tf-amt':amt,'tf-cat':c,'tf-acc':acc||S().accounts[0].id,'tf-note':note});
  await window.saveTxn('');
}

// ───────── 0. LOGIN ─────────
await login('u1');
eq(S().accounts.length, 3, 'login: 3 akun default dibuat');
eq(S().categories.length, 16, 'login: 16 kategori default dibuat');

// ───────── 1. ZONA WAKTU: transaksi tanggal terakhir/awal bulan ─────────
{
  const n = new Date(), y = n.getFullYear(), m = n.getMonth();
  const lastDay = X.localDateStr(new Date(y, m+1, 0)), firstDay = X.localDateStr(new Date(y, m, 1));
  await addTxn({date:lastDay, desc:'akhir bulan', amt:'1.000'});
  await addTxn({date:firstDay, desc:'awal bulan', amt:'2.000'});
  const got = X.monthTxns(0).map(t=>t.description);
  ok(got.includes('akhir bulan'), 'monthTxns memuat transaksi TANGGAL TERAKHIR bulan (TZ='+process.env.TZ+')');
  ok(got.includes('awal bulan'), 'monthTxns memuat transaksi TANGGAL PERTAMA bulan');
}
if (which === 'tz') { console.log(`TZ=${process.env.TZ}  lulus=${pass} gagal=${fail}`); failures.forEach(f=>console.log(' ✗',f)); process.exit(fail?1:0); }

// ───────── 2. HUTANG: catat → saldo & statistik ─────────
const bal0 = X.totalBal();
const real0 = X.sumType(X.filterReal(X.monthTxns(0)), 'expense');
window.openDebtModal();
setVals({'df-person':'Budi','df-amt':'1.000.000','df-paid':'0','df-borrowdate':D(-5),'df-due':D(-1),'df-note':'modal','df-iskpr':false,'df-astxn':true,'df-acc':S().accounts[1].id});
await window.saveDebt('');
const debt = S().debts[0];
ok(!!debt && debt.person==='Budi' && debt.paid===0, 'hutang tercatat');
const disb = S().transactions.find(t=>t.debtId===debt.id);
ok(disb && disb.flow==='hutang' && disb.debtRole==='disburse' && disb.type==='income', 'pencairan: flow hutang + role disburse');
eq(X.totalBal(), bal0+1000000, 'saldo naik sebesar pinjaman');
eq(X.sumType(X.filterReal(X.monthTxns(0)),'expense'), real0, 'statistik pengeluaran riil TIDAK berubah');
eq(X.netWorth(), bal0, 'kekayaan bersih tetap (saldo +1jt, hutang −1jt)');
eq(X.accBal(S().accounts[1].id), 1000000, 'saldo akun tujuan benar');

// ───────── 3. BAYAR LEWAT MODAL HUTANG (pokok + bunga) ─────────
window.openPayDebtModal(debt.id);
setVals({'pd-amt':'300.000','pd-interest':'20.000','pd-date':D(),'pd-acc':S().accounts[1].id,'pd-astxn':true});
await window.savePayDebt(debt.id);
let d1 = S().debts[0];
eq(d1.paid, 300000, 'cicilan: paid bertambah 300rb');
eq(X.debtRemaining(d1), 700000, 'sisa hutang 700rb');
const pay = S().transactions.find(t=>t.debtId===d1.id && t.debtRole==='payment');
const intr = S().transactions.find(t=>t.debtId===d1.id && t.debtRole==='interest');
ok(pay && pay.flow==='hutang', 'cicilan pokok = flow hutang');
ok(intr && intr.flow==='real' && S().categories.find(c=>c.id===intr.categoryId)?.name==='Bunga/Denda', 'bunga = pengeluaran riil kategori Bunga/Denda');
eq(X.sumType(X.filterReal(X.monthTxns(0)),'expense'), real0+20000, 'hanya BUNGA masuk statistik riil');
eq(X.accBal(S().accounts[1].id), 1000000-300000-20000, 'saldo akun = pinjaman − cicilan − bunga');
// Firestore sama dengan memori
const cloudDebt = [...FB.store.entries()].find(([p])=>p.includes('/debts/'))[1];
eq(cloudDebt.paid, 300000, 'cloud: paid = 300rb (sinkron memori↔cloud)');

// ───────── 4. HAPUS cicilan → sisa hutang kembali ─────────
let confirmCb;
const origConfirm = window.confirmDel; window.confirmDel = (m, cb) => { confirmCb = cb; };
window.delTxn(pay.id); await confirmCb();
d1 = S().debts[0];
eq(d1.paid, 0, 'hapus transaksi cicilan → paid kembali 0');
eq(X.debtRemaining(d1), 1000000, 'sisa hutang kembali 1jt');
ok(!S().transactions.find(t=>t.id===pay.id), 'transaksi cicilan terhapus');
window.confirmDel = origConfirm;

// ───────── 5. BAYAR LEWAT MODAL TRANSAKSI (tautan) + EDIT jumlah ─────────
window.openTxnModal(null, D()); X.setTxnType('expense');
setVals({'tf-date':D(),'tf-desc':'Cicil Budi','tf-amt':'400.000','tf-cat':S().categories[6].id,'tf-acc':S().accounts[1].id,'tf-note':''});
$('tf-debtlink-chk').checked = true; $('tf-debtlink-debtid').value = d1.id;
await window.saveTxn('');
d1 = S().debts[0];
eq(d1.paid, 400000, 'transaksi tertaut: paid = 400rb');
const linkedTx = S().transactions.find(t=>t.debtId===d1.id && t.debtRole==='payment');
ok(linkedTx && linkedTx.flow==='hutang', 'transaksi tertaut bertanda flow hutang');
// edit jumlah 400rb → 500rb
window.openTxnModal(linkedTx.id);
setVals({'tf-date':linkedTx.date,'tf-desc':'Cicil Budi','tf-amt':'500.000','tf-cat':linkedTx.categoryId,'tf-acc':linkedTx.accountId,'tf-note':''});
await window.saveTxn(linkedTx.id);
eq(S().debts[0].paid, 500000, 'edit jumlah transaksi → paid ikut 500rb');
// edit melebihi pokok → ditolak
window.openTxnModal(linkedTx.id);
setVals({'tf-date':linkedTx.date,'tf-desc':'Cicil Budi','tf-amt':'2.000.000','tf-cat':linkedTx.categoryId,'tf-acc':linkedTx.accountId,'tf-note':''});
await window.saveTxn(linkedTx.id);
eq(S().debts[0].paid, 500000, 'edit melebihi pokok ditolak (paid tetap)');
ok(toasts.some(t=>t[0]==='error' && /melebihi/.test(t[1])), 'ada pesan error yg jelas');
eq(S().transactions.find(t=>t.id===linkedTx.id).amount, 500000, 'jumlah transaksi tetap 500rb setelah penolakan');
// melebihi sisa saat tautan baru
window.openTxnModal(null, D()); X.setTxnType('expense');
setVals({'tf-date':D(),'tf-desc':'terlalu besar','tf-amt':'600.000','tf-cat':S().categories[6].id,'tf-acc':S().accounts[1].id});
$('tf-debtlink-chk').checked = true; $('tf-debtlink-debtid').value = d1.id;
const nBefore = S().transactions.length;
await window.saveTxn('');
eq(S().transactions.length, nBefore, 'cicilan melebihi sisa ditolak (tidak ada transaksi baru)');

// ───────── 6. Lunas → masuk riwayat ─────────
window.openPayDebtModal(d1.id);
setVals({'pd-amt':'500.000','pd-interest':'0','pd-date':D(),'pd-acc':S().accounts[1].id,'pd-astxn':true});
await window.savePayDebt(d1.id);
eq(X.debtRemaining(S().debts[0]), 0, 'pelunasan: sisa 0 (lunas)');
eq(X.totalHutang(), 0, 'total hutang 0');

// ───────── 7. ATOMISITAS: jaringan gagal di tengah → tidak ada yang berubah ─────────
window.openDebtModal();
setVals({'df-person':'Sari','df-amt':'200.000','df-paid':'0','df-borrowdate':D(),'df-due':'','df-note':'','df-iskpr':false,'df-astxn':true,'df-acc':S().accounts[0].id});
await window.saveDebt('');
const sari = S().debts.find(d=>d.person==='Sari');
const cloudPaidBefore = [...FB.store.entries()].find(([p,v])=>p.includes('/debts/')&&v.person==='Sari')[1].paid;
const txBefore = S().transactions.length, cloudTxBefore = [...FB.store.keys()].filter(k=>k.includes('/transactions/')).length;
FB.failNext.n = 1;
window.openPayDebtModal(sari.id);
setVals({'pd-amt':'50.000','pd-interest':'0','pd-date':D(),'pd-acc':S().accounts[0].id,'pd-astxn':true});
await window.savePayDebt(sari.id);
eq(S().debts.find(d=>d.person==='Sari').paid, 0, 'gagal jaringan: paid di memori TIDAK berubah');
eq([...FB.store.entries()].find(([p,v])=>p.includes('/debts/')&&v.person==='Sari')[1].paid, cloudPaidBefore, 'gagal jaringan: paid di cloud TIDAK berubah');
eq(S().transactions.length, txBefore, 'gagal jaringan: tidak ada transaksi setengah jadi (memori)');
eq([...FB.store.keys()].filter(k=>k.includes('/transactions/')).length, cloudTxBefore, 'gagal jaringan: tidak ada transaksi setengah jadi (cloud)');

// ───────── 8. EDIT hutang → transaksi pencairan ikut ─────────
window.openDebtModal(sari.id);
setVals({'df-person':'Sari B','df-amt':'250.000','df-paid':'0','df-borrowdate':D(-2),'df-due':'','df-note':'','df-iskpr':false});
await window.saveDebt(sari.id);
const sd = S().transactions.find(t=>t.debtId===sari.id && X.txnDebtRole(t)==='disburse');
eq([sd.amount, sd.date, sd.description], [250000, D(-2), 'Menerima pinjaman dari Sari B'], 'edit hutang → transaksi pencairan (jumlah/tanggal/nama) ikut berubah');

// ───────── 9. TRANSFER ─────────
const totalBefore = X.totalBal();
window.openTransferModal();
setVals({'tr-from':S().accounts[0].id,'tr-to':S().accounts[1].id,'tr-date':D(),'tr-amt':'75.000','tr-note':''});
await window.saveTransfer();
const trs = S().transactions.filter(t=>t.flow==='transfer');
eq(trs.length, 2, 'transfer: 2 sisi tercatat');
eq(X.totalBal(), totalBefore, 'transfer tidak mengubah total saldo');
ok(S().categories.some(c=>c.name==='Transfer'&&c.type==='income'), 'kategori Transfer (pemasukan) otomatis ada');
ok(X.filterReal(trs).length===0, 'transfer tidak masuk statistik riil');
const realBefore = X.sumType(X.filterReal(X.monthTxns(0)),'income');
window.confirmDel = (m, cb) => { confirmCb = cb; };
window.delTxn(trs[0].id); await confirmCb();
eq(S().transactions.filter(t=>t.flow==='transfer').length, 0, 'hapus satu sisi transfer → kedua sisi terhapus');
window.confirmDel = origConfirm;
// edit transfer diblokir
const trCount = S().transactions.length;
await addTxn({type:'expense', desc:'x', amt:'1.000'});
window.openTransferModal(); setVals({'tr-from':S().accounts[0].id,'tr-to':S().accounts[2].id,'tr-date':D(),'tr-amt':'1.000','tr-note':''}); await window.saveTransfer();
const tr2 = S().transactions.find(t=>t.flow==='transfer');
toasts.length = 0; window.openTxnModal(tr2.id);
ok(toasts.some(t=>/tidak bisa diedit/.test(t[1])), 'edit satu sisi transfer diblokir dengan pesan jelas');

// ───────── 10. Hapus hutang + transaksi terhubung ─────────
const sariTx = S().transactions.filter(t=>t.debtId===sari.id).length;
const balBeforeDel = X.accBal(S().accounts[0].id);
await window.doDelDebt(sari.id, true);
ok(!S().debts.some(d=>d.id===sari.id), 'hutang terhapus');
eq(S().transactions.filter(t=>t.debtId===sari.id).length, 0, 'transaksi terhubung ikut terhapus ('+sariTx+')');
eq(X.accBal(S().accounts[0].id), balBeforeDel - 250000 + 0 , 'saldo akun kembali bersih (pencairan ikut hilang)');

// ───────── 11. Piutang: arah berlawanan ─────────
window.openDebtModal(); 
setVals({'df-person':'Andi','df-amt':'500.000','df-paid':'0','df-borrowdate':D(),'df-due':'','df-note':'','df-iskpr':false,'df-astxn':true,'df-acc':S().accounts[0].id});
// ubah ke piutang lewat getter modul (tombol toggle tidak ada di DOM palsu)
window._dtypeGetter = () => 'piutang';
const accB = X.accBal(S().accounts[0].id);
await window.saveDebt('');
const andi = S().debts.find(d=>d.person==='Andi');
eq(andi.type, 'piutang', 'piutang tercatat');
eq(X.accBal(S().accounts[0].id), accB - 500000, 'beri pinjaman → saldo akun turun');
eq(X.totalPiutang(), 500000, 'total piutang 500rb');
window.openPayDebtModal(andi.id);
setVals({'pd-amt':'500.000','pd-interest':'0','pd-date':D(),'pd-acc':S().accounts[0].id,'pd-astxn':true});
await window.savePayDebt(andi.id);
eq(X.accBal(S().accounts[0].id), accB, 'piutang dilunasi → saldo kembali');
eq(X.totalPiutang(), 0, 'piutang 0');

// ───────── 12. Target & rekap ─────────
S().targets.length = 0;
const mkT = o => { const id='t'+Math.random().toString(36).slice(2); const t = { id, ...o }; S().targets.push(t); FB.store.set('users/u1/targets/'+id, JSON.parse(JSON.stringify(o))); return t; };
const tomorrow = D(1), today = D(0), yday = D(-1);
const batas = mkT({period:'harian', mode:'nominal', title:'batas', basis:'total', goalType:'batas', amount:50000});
const hemat = mkT({period:'harian', mode:'nominal', title:'hemat', basis:'total', goalType:'hemat', amount:1000});
const cek   = mkT({period:'harian', mode:'checklist', title:'gym', completedPeriods:[yday]});
let ev = X.targetEvalForKey(batas, tomorrow);
ok(ev.state==='future' && !(ev.achieved && ev.counts), 'batas pengeluaran: HARI DEPAN tidak dihitung tercapai (bug lama: dianggap tercapai)');
const emptyDay = D(-40);
ev = X.targetEvalForKey(batas, emptyDay);
ok(!(ev.achieved && ev.counts), 'batas pengeluaran: hari tanpa data tidak dihitung tercapai');
await addTxn({type:'expense', date:yday, desc:'makan', amt:'20.000'});
ev = X.targetEvalForKey(batas, yday); ok(ev.achieved && ev.counts, 'batas: 20rb ≤ 50rb tercapai');
await addTxn({type:'expense', date:yday, desc:'boros', amt:'40.000'});
ev = X.targetEvalForKey(batas, yday); ok(!ev.achieved, 'batas: 60rb > 50rb gagal');
ev = X.targetEvalForKey(cek, yday); ok(ev.achieved, 'checklist: sudah dicentang');
const rk = X.recapFor('harian', [yday, tomorrow]);
ok(rk && rk.total===3, 'rekap: hari depan tidak ikut dihitung (3 = 3 target × 1 hari kemarin)', JSON.stringify(rk));
eq(rk.done, 1, 'rekap: hanya checklist yang tercapai kemarin');

// jadwal
const j = mkT({period:'harian', mode:'jadwal', title:'jadwal', schedules:{weekday:[{start:'05:00',end:'07:00',activity:'A'},{start:'07:00',end:'09:00',activity:'B'}], saturday:[], sunday:[]}});
const wk = new Date(today+'T00:00:00').getDay();
const jad = X.targetEvalForKey(j, today);
ok(jad.blocksTotal === (wk===0||wk===6?0:2), 'jadwal: jumlah blok sesuai varian hari');
const pr = X.parseScheduleStrict('05:00-07:00 Mandi\nasal salah\n25:00-26:00 X\n18:40-00:00 Belajar');
eq(pr.blocks.length, 2, 'parse jadwal: 2 baris valid');
eq(pr.bad.length, 2, 'parse jadwal: baris salah DILAPORKAN (bukan dibuang diam-diam)');
if (!(wk===0||wk===6)) {
  await window.toggleScheduleBlock(j.id, 0, today);
  eq(S().targets.find(t=>t.id===j.id).completedBlocks[today], ['05:00-07:00'], 'centang blok disimpan sebagai kunci jam (bukan indeks)');
}

// ───────── 13. AI & anggaran multi-periode ─────────
S().budgets.push({id:'b1', categoryId:S().categories.find(c=>c.name==='Makanan').id, amount:30000, period:'harian'});
S().budgets.push({id:'b2', categoryId:S().categories.find(c=>c.name==='Transportasi').id, amount:1000000, period:'bulanan'});
const ai = X.computeAIAnalysis();
ok(ai.totalBudget === 30000*30 + 1000000, 'AI: total anggaran disetarakan per-bulan (harian×30 + bulanan)', String(ai.totalBudget));
ok(Number.isFinite(ai.score), 'AI: skor valid');
const full = X.computeFullAIReport(); ok(full.priorities.length>0, 'Laporan AI: ada prioritas');

// ───────── 14. fmt ─────────
eq(X.fmt(-50000), '−Rp 50.000', 'fmt: angka negatif punya tanda minus');
eq(X.fmt(0), 'Rp 0', 'fmt: nol'); eq(X.fmtS(-2500000), '−2.5Jt', 'fmtS: negatif');

// ───────── 15. SMOKE render semua halaman ─────────
for (const pg of ['dashboard','calendar','transactions','budgets','debts','accounts','goals','targets','reports','aireport','settings']) {
  let err=null; try { window.nav(pg); } catch(e) { err=e; }
  ok(!err, 'render halaman '+pg, err && err.stack.split('\n').slice(0,3).join(' | '));
}
for (const tab of ['mingguan','bulanan','tahunan','harian']) { window.nav('dashboard'); window.nav('targets'); }
{ let err=null; try { window.calDayClick(D()); window.calDayClick(D(-30)); window.openBudgetDetailModal('b1'); window.budDetailShiftYear('b1',-1); } catch(e){err=e;} ok(!err,'modal kalender & anggaran', err&&err.stack.split('\n').slice(0,3).join(' | ')); }

// ───────── 16. Filter transaksi presisi ─────────
window.goToTransaksiFiltered(S().categories.find(c=>c.name==='Makanan').id, 'harian', {date:yday});
eq([X.txnFilter().from, X.txnFilter().to], [yday, yday], 'drill-down anggaran harian → rentang tepat 1 hari');
X.fillTxnTable();

// ───────── 17. EKSPOR → IMPOR ke akun baru ─────────
const snapshot = JSON.parse(JSON.stringify({accounts:S().accounts,categories:S().categories,transactions:S().transactions,budgets:S().budgets,goals:S().goals,debts:S().debts,targets:S().targets.filter(t=>t.mode!=='jadwal' || true)}));
const countTx = S().transactions.length;
await globalThis.__authCb(null);
eq([S().transactions.length, S().debts.length, S().targets.length], [0,0,0], 'logout: seluruh data di memori dibersihkan');
await login('u2');
eq(S().transactions.length, 0, 'akun kedua mulai kosong (tidak mewarisi data akun pertama)');
$('imp-json').value = JSON.stringify(snapshot); await window.doImport();
eq(S().transactions.length, countTx, 'impor: jumlah transaksi sama dengan backup', `${S().transactions.length} vs ${countTx}`);
ok(S().transactions.every(t => S().categories.some(c=>c.id===t.categoryId) && S().accounts.some(a=>a.id===t.accountId)), 'impor: SEMUA transaksi menunjuk kategori & akun yang ada (ID terpetakan)');
const dImp = S().debts.find(d=>d.person==='Budi');
ok(dImp && S().transactions.some(t=>t.debtId===dImp.id), 'impor: transaksi hutang tetap tertaut ke hutang hasil impor');
eq(S().accounts.length, 3, 'impor: akun tidak digandakan'); eq(S().categories.length, snapshot.categories.length, 'impor: kategori tidak digandakan (sama dgn backup)');
const n1 = S().transactions.length;
$('imp-json').value = JSON.stringify(snapshot); await window.doImport();
eq(S().transactions.length, n1, 'impor ulang file yang sama: tidak ada duplikat');
$('imp-json').value = JSON.stringify({transactions:[{date:'bukan-tanggal',type:'expense',amount:5,description:'x'}]}); const nb=S().transactions.length; await window.doImport();
eq(S().transactions.length, nb, 'impor data rusak ditolak seluruhnya');

// ───────── 17b. SEMUA dokumen yang ditulis lolos aturan Firestore ─────────
{ const r = checkStore(FB.store); ok(r.bad.length===0, `aturan Firestore: ${r.n} dokumen divalidasi`, r.bad.slice(0,3).join(' || ')); }

// ───────── 18. Reset total ─────────
window.confirmDel = (m, cb) => { confirmCb = cb; };
window.resetAll(); await confirmCb(); await new Promise(r=>setTimeout(r,20));
eq([S().transactions.length, S().debts.length, S().targets.length, S().goals.length], [0,0,0,0], 'reset: transaksi, hutang, target, impian semuanya terhapus');
ok([...FB.store.keys()].filter(k=>k.startsWith('users/u2/')&&/\/(debts|targets|transactions)\//.test(k)).length===0, 'reset: cloud juga bersih (hutang & target tidak ketinggalan)');

console.log(`\nHASIL: lulus=${pass} gagal=${fail}`);
failures.forEach(f=>console.log(' ✗', f));
const errs = toasts.filter(t=>t[0]==='error' && /Gagal (menyimpan|memuat|impor|reset)/.test(t[1]) && !/SIMULASI/.test(t[1]));
if (errs.length) console.log('Toast error tak terduga:', errs.map(e=>e[1]));
process.exit(fail ? 1 : 0);
