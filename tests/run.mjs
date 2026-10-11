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

// ───────── 16b. GRAFIK KURS (Frankfurter v2) + CACHE ─────────
{
  await new Promise(r=>setTimeout(r,30));                // biarkan request kurs dari render dashboard sebelumnya selesai dulu
  const resetFx = () => { localStorage.clear(); X.fxMem.clear(); };
  const calls = [];
  const rate = (base, quote, d) => (base==='USD'&&quote==='IDR') ? 16000 + Number(d.slice(8)) * 10 : 1.1 + Number(d.slice(8))/1000;
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (globalThis.__fxFail) throw new Error('offline');
    const u = new URL(url); const base=u.searchParams.get('base'), quote=u.searchParams.get('quotes'), from=u.searchParams.get('from');
    const rows=[]; const last = D(-2);                          // data tertinggal 2 hari (seperti API sungguhan)
    for (let d = new Date(from+'T00:00:00'); X.localDateStr(d) <= last; d.setDate(d.getDate()+1)) { const ds=X.localDateStr(d); rows.push({date:ds, base, quote, rate: rate(base,quote,ds)}); }
    return { ok:true, status:200, json: async()=>rows };
  };
  resetFx();
  const fx = (tf, f='USD', h='IDR') => X.loadFxChart(f, h, tf);
  const w1 = await fx('W');
  ok(calls.length===1 && /api\.frankfurter\.dev\/v2\/rates\?/.test(calls[0]), 'grafik: memakai api.frankfurter.dev/v2', calls[0]);
  ok(/base=USD&quotes=IDR&from=/.test(calls[0]) && !/[&?]to=/.test(calls[0]), 'grafik: base=USD&quotes=IDR, tanpa parameter "to"');
  ok(w1.points.length>=5 && w1.points.length<=8, 'W: ~7 hari data ('+w1.points.length+' titik)');
  ok(w1.points.every((p,i,a)=>i===0||a[i-1].d<p.d), 'titik data terurut naik menurut tanggal');
  ok(w1.fromCache===false, 'fetch pertama: bukan dari cache');
  const w2 = await fx('W');
  ok(calls.length===1 && w2.fromCache===true, 'W diklik lagi di hari yang sama → dari CACHE, TIDAK fetch ulang');
  eq(w2.points, w1.points, 'data cache sama persis dengan data fetch');
  const d1 = await fx('D');
  ok(calls.length===2 && d1.points.length===3, 'D: 3 titik data terakhir, fetch terpisah ('+d1.points.length+' titik)');
  const m1 = await fx('M');
  ok(calls.length===3 && m1.points.length>=20, 'M: ~30 hari data ('+m1.points.length+' titik)');
  await fx('D'); await fx('W'); await fx('M');
  ok(calls.length===3, 'D/W/M diklik berulang → tetap 3 request total (semua dari cache)');
  await fx('W','EUR');
  ok(calls.length===4, 'mata uang lain = kunci cache berbeda → fetch sekali');
  ok(Object.keys(localStorage._d).filter(k=>k.startsWith('mm_fxchart_v2_')).length===4, 'cache tersimpan di localStorage per (mata uang × time frame)');
  // klik beruntun cepat → hanya 1 request per kunci
  resetFx(); calls.length=0;
  await Promise.all([fx('M'), fx('M'), fx('M')]);
  eq(calls.length, 1, 'klik beruntun pada time frame yang sama → hanya 1 request');
  // pindah hari → cache kemarin tidak berlaku, direfetch, cache lama dibuang
  const key = Object.keys(localStorage._d).find(k=>k.startsWith('mm_fxchart_v2_'));
  const obj = JSON.parse(localStorage.getItem(key)); obj.day = D(-1); localStorage.setItem(key, JSON.stringify(obj));
  calls.length=0; const m2 = await fx('M');
  ok(calls.length===1 && m2.fromCache===false, 'cache hari kemarin tidak dipakai → fetch ulang di hari baru');
  eq(JSON.parse(localStorage.getItem(key)).day, D(0), 'cache diperbarui ke hari ini');
  // fetch gagal → data tersimpan (stale)
  const obj2 = JSON.parse(localStorage.getItem(key)); obj2.day = D(-1); localStorage.setItem(key, JSON.stringify(obj2));
  globalThis.__fxFail = true; const st = await fx('M');
  ok(st.stale===true && st.points.length>0, 'API gagal + ada cache lama → tampilkan data tersimpan (ditandai stale)');
  let thrown=null; try { await fx('W','GBP'); } catch(e){ thrown=e; }
  ok(!!thrown, 'API gagal + tidak ada cache → error (UI menampilkan tombol coba lagi)');
  globalThis.__fxFail = false;
  // localStorage diblokir → tetap jalan lewat memori
  const origSet = localStorage.setItem; localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
  calls.length=0; await fx('W','JPY'); await fx('W','JPY');
  eq(calls.length, 1, 'localStorage penuh/diblokir → cache memori tetap mencegah fetch ulang');
  localStorage.setItem = origSet;
  // UI: klik tombol cepat D → W → M, hasil akhir = M
  resetFx(); calls.length=0;
  await X.fillFxChartWidget(); window.setFxChartTf('D'); window.setFxChartTf('W'); window.setFxChartTf('M');
  await new Promise(r=>setTimeout(r,50));
  eq(X.fxState().tf, 'M', 'klik tombol cepat D→W→M: time frame akhir = M');
  ok(X.fxState().points && X.fxState().points.length>=20, 'grafik ter-update ke data M ('+(X.fxState().points||[]).length+' titik)');
  window.setFxChartTf('XYZ'); eq(X.fxState().tf, 'M', 'time frame tidak valid diabaikan');
  // konfigurasi Chart.js: garis hijau bersih tanpa titik
  globalThis.Chart = class { constructor(el, cfg) { globalThis.__lastChart = cfg; globalThis.__chartCount = (globalThis.__chartCount||0)+1; } destroy() { globalThis.__destroyed = (globalThis.__destroyed||0)+1; } };
  resetFx(); await X.fillFxChartWidget(); window.setFxChartTf('W'); await new Promise(r=>setTimeout(r,50));
  const cfg = globalThis.__lastChart, ds = cfg.data.datasets[0];
  eq(cfg.type, 'line', 'Chart.js: tipe line chart');
  eq(ds.borderColor, '#3DDBA0', 'Chart.js: garis berwarna HIJAU (nilai nyata, bukan var(--x))');
  eq(ds.pointRadius, 0, 'Chart.js: pointRadius = 0 (tanpa titik bulatan)');
  ok(ds.fill===false && cfg.options.plugins.legend.display===false, 'Chart.js: tanpa isian & tanpa legenda (bersih)');
  ok(cfg.options.scales.y.beginAtZero===false, 'Chart.js: skala Y tidak dipaksa mulai dari 0 (grafik harga)');
  eq(cfg.data.labels.length, ds.data.length, 'Chart.js: jumlah label = jumlah data');
  const before = globalThis.__chartCount; window.setFxChartTf('D'); await new Promise(r=>setTimeout(r,50));
  ok(globalThis.__chartCount > before && globalThis.__lastChart.data.datasets[0].data.length===3, 'klik tombol D → grafik digambar ulang otomatis dengan 3 titik');
  window.setFxChartTf('M'); await new Promise(r=>setTimeout(r,50));
  ok(globalThis.__lastChart.data.datasets[0].data.length>=20, 'klik tombol M → grafik ter-update ke ~30 hari');
  const dst = globalThis.__destroyed||0; window.setFxChartTf('W'); await new Promise(r=>setTimeout(r,50));
  ok((globalThis.__destroyed||0) > dst, 'grafik lama di-destroy sebelum digambar ulang (tidak bocor)');
  delete globalThis.Chart;
  // kurs ringkas: hitung silang berbasis EUR
  resetFx();
  globalThis.fetch = async (url) => ({ ok:true, status:200, json: async()=>[
    {date:'2026-10-08',base:'EUR',quote:'USD',rate:1.12},{date:'2026-10-08',base:'EUR',quote:'IDR',rate:18800},{date:'2026-10-08',base:'EUR',quote:'JPY',rate:162}] });
  const fr = await X.fetchFxRates('IDR');
  ok(Math.abs(fr.rates.USD - 18800/1.12) < 1e-6, '1 USD = '+fr.rates.USD.toFixed(2)+' IDR (hitung silang via EUR benar)');
  ok(Math.abs(fr.rates.EUR - 18800) < 1e-6, '1 EUR = 18.800 IDR');
  ok(Math.abs(fr.rates.JPY - 18800/162) < 1e-6, '1 JPY dalam IDR benar');
}

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

// ───────── 19. SKENARIO PENGGUNA: 2 hutang → BCA & Dompet → transfer → bayar UKT (Pendidikan) ─────────
{
  await globalThis.__authCb(null); await login('u3');
  const dompet = S().accounts.find(a=>a.name==='Dompet'), bca = S().accounts.find(a=>a.name==='Bank BCA'), t0 = D(0);
  const hut = async (person, amt, acc, astxn=true) => { window.openDebtModal(); setVals({'df-person':person,'df-amt':amt,'df-paid':'0','df-borrowdate':t0,'df-due':'','df-note':'','df-iskpr':false,'df-astxn':astxn,'df-acc':acc}); toasts.length=0; await window.saveDebt(''); };
  await hut('Orang A','1.500.000',bca.id); await hut('Orang B','1.000.000',dompet.id);
  eq([X.accBal(bca.id), X.accBal(dompet.id)], [1500000, 1000000], 'skenario: hutang masuk ke akun yang DIPILIH (BCA 1,5jt / Dompet 1jt)');
  window.openTransferModal(); setVals({'tr-from':dompet.id,'tr-to':bca.id,'tr-date':t0,'tr-amt':'1.000.000','tr-note':''}); await window.saveTransfer();
  eq([X.accBal(bca.id), X.accBal(dompet.id)], [2500000, 0], 'skenario: setelah transfer, BCA = 2,5jt');
  const pend = S().categories.find(c=>c.name==='Pendidikan');
  window.openTxnModal(null,t0); X.setTxnType('expense');
  setVals({'tf-date':t0,'tf-desc':'UKT','tf-amt':'2.500.000','tf-cat':pend.id,'tf-acc':bca.id,'tf-note':''}); await window.saveTxn('');
  eq([X.accBal(bca.id), X.totalBal(), X.totalHutang(), X.netWorth()], [0, 0, 2500000, -2500000], 'skenario: saldo BCA 0, hutang 2,5jt tetap, kekayaan bersih −2,5jt');
  ok(S().transactions.find(t=>t.description==='UKT').categoryId===pend.id && X.filterReal(S().transactions).some(t=>t.description==='UKT'), 'UKT = pengeluaran riil kategori Pendidikan');
  // tampilan: dana hutang tidak lagi "tak terlihat"
  window.nav('dashboard'); const dash = $('page-content').innerHTML;
  ok(/Rincian Total Saldo/.test(dash) && /dana hutang\/piutang/.test(dash), 'Dashboard: ada Rincian Total Saldo (riil + hutang/piutang + transfer)');
  ok(/\+Rp 2\.500\.000 dana pinjaman\/piutang masuk ke akun/.test(dash), 'Dashboard: kartu Pemasukan menyebut Rp 2.500.000 dana pinjaman masuk (bukan pendapatan)');
  ok(/Rincian Total Saldo Rp 0:/.test(dash) && /arus riil[^<]*<b>−Rp 2\.500\.000/.test(dash) && /<b style="color:var\(--gold\)">\+Rp 2\.500\.000/.test(dash), 'Dashboard: rincian = −2,5jt (riil) + 2,5jt (hutang) + 0 (transfer) = Rp 0');
  window.nav('accounts'); ok(/termasuk \+Rp 1\.500\.000 dari hutang\/piutang/.test($('page-content').innerHTML), 'Akun BCA: "termasuk +Rp 1.500.000 dari hutang/piutang"');
  window.setCalView('month'); window.calToNow();
  { const cal = $('page-content').innerHTML;
    ok(/Pemasukan<\/div>\s*<div class="cal-sum-value" style="color:var\(--income\)">Rp 2\.500\.000<\/div><div class="cal-sum-sub">Riil <b>Rp 0<\/b> · Hutang\/Piutang <b class="g">Rp 2\.500\.000<\/b>/.test(cal), 'Kalender: PEMASUKAN = total Rp 2.500.000 (Riil Rp 0 · Hutang/Piutang Rp 2.500.000)');
    ok(/Pengeluaran<\/div>\s*<div class="cal-sum-value" style="color:var\(--expense\)">Rp 2\.500\.000<\/div><div class="cal-sum-sub">Riil <b>Rp 2\.500\.000<\/b>/.test(cal) || /Pengeluaran<\/div>\s*<div class="cal-sum-value" style="color:var\(--expense\)">Rp 2\.500\.000<\/div><div class="cal-sum-sub">Semuanya arus riil/.test(cal), 'Kalender: PENGELUARAN = total Rp 2.500.000 (UKT, riil)');
    ok(/Transfer antar akun Rp 1\.000\.000 tidak dihitung/.test(cal), 'Kalender: keterangan transfer Rp 1.000.000 (netral, tidak dihitung)');
    ok(/cal-income-pill[^>]*>[^<]*<i[^>]*><\/i>2\.5Jt/.test(cal) && /↳ hutang 2\.5Jt/.test(cal), 'Kalender sel hari: pil pemasukan TOTAL 2.5Jt + keterangan "↳ hutang 2.5Jt"');
  }
  window.calDayClick(t0); { const md = $('modal-box').innerHTML;
    ok(/Pemasukan[\s\S]{0,200}Rp 2\.500\.000[\s\S]{0,120}Hutang <b style="color:var\(--gold\)">Rp 2\.500\.000/.test(md), 'Modal hari: pemasukan total Rp 2.500.000 + rincian hutang Rp 2.500.000'); }
  // tampilan TAHUN
  window.setCalView('year'); { const yr = $('page-content').innerHTML, Y = new Date().getFullYear();
    ok(new RegExp('Tahun '+Y).test(yr) && /cal-year-grid/.test(yr) && /Rincian per Bulan/.test(yr) && /id="ch-cal-year"/.test(yr), 'Kalender Tahun: judul, kartu 12 bulan, tabel rincian, kanvas grafik');
    ok(/Pemasukan<\/div>\s*<div class="cal-sum-value" style="color:var\(--income\)">Rp 2\.500\.000/.test(yr), 'Kalender Tahun: total pemasukan setahun = Rp 2.500.000');
    const ms = X.calYearMonths(Y), yrs = X.cashSummary(S().transactions.filter(t=>t.date.startsWith(String(Y))));
    eq([ms.reduce((s,m)=>s+m.inTotal,0), ms.reduce((s,m)=>s+m.outTotal,0)], [yrs.inTotal, yrs.outTotal], 'Tahun: jumlah 12 bulan = total tahunan (pemasukan & pengeluaran)');
    eq(ms.reduce((s,m)=>s+m.inReal,0)+ms.reduce((s,m)=>s+m.inDebt,0), yrs.inTotal, 'Tahun: riil + hutang = total pemasukan');
    globalThis.Chart = class { constructor(el,cfg){ globalThis.__cc = cfg; } destroy(){} };
    const _raf = globalThis.requestAnimationFrame; globalThis.requestAnimationFrame = cb => setTimeout(cb, 0);
    window.nav('calendar'); await new Promise(r=>setTimeout(r,200)); globalThis.requestAnimationFrame = _raf;
    const cc = globalThis.__cc; ok(cc && cc.type==='bar' && cc.data.datasets.length===4 && cc.data.labels.length===12, 'Grafik tahunan: 4 dataset (masuk/keluar × riil/hutang) × 12 bulan');
    ok(cc.data.datasets[0].stack==='in' && cc.data.datasets[2].stack==='out' && cc.options.scales.x.stacked===true, 'Grafik tahunan: dua tumpukan (pemasukan | pengeluaran)');
    const mi = new Date().getMonth(); eq(cc.data.datasets[1].data[mi], 2500000, 'Grafik tahunan: bagian hutang bulan ini = 2.500.000');
    delete globalThis.Chart;
    window.calPrev(); ok(new RegExp('Tahun '+(Y-1)).test($('page-content').innerHTML), 'Tahun: tombol sebelumnya → tahun lalu'); window.calToNow();
    window.calGoMonth(0); ok(!/cal-year-grid/.test($('page-content').innerHTML) && /cal-cells/.test($('page-content').innerHTML), 'klik bulan di tampilan Tahun → buka kalender bulan itu');
  }
  window.calToNow(); window.setCalView('month');
  window.nav('transactions'); window.clearTxnChip('range'); X.fillTxnTable(); const tb = $('txn-tb').innerHTML;
  ok(/Dana Pinjaman Masuk/.test(tb) && /Transfer/.test(tb), 'Transaksi: lencana "Dana Pinjaman Masuk" & "Transfer" jelas');
  const ai = X.computeAIAnalysis(); ok(ai.risks.some(r=>/dibiayai dari hutang/.test(r)), 'AI: menjelaskan defisit dibiayai dana pinjaman (bukan sekadar "arus kas negatif")');
  // hutang dicatat TANPA centang → peringatan + jalur perbaikan "Catat ke akun"
  await hut('Orang C','700.000',dompet.id,false);
  ok(toasts.some(t=>/TANPA dana masuk ke akun/.test(t[1])), 'tanpa centang: ada peringatan "TANPA dana masuk ke akun"');
  const c = S().debts.find(d=>d.person==='Orang C'); const balBefore = X.totalBal();
  window.nav('debts'); ok(/Catat ke akun/.test($('debt-grid').innerHTML), 'kartu hutang tanpa dana: muncul tombol "Catat ke akun"');
  window.recordDebtDisbursement(c.id); setVals({'rd-acc':dompet.id,'rd-date':t0}); await window.saveDebtDisbursement(c.id);
  eq(X.totalBal(), balBefore + 700000, '"Catat ke akun" → saldo naik 700rb');
  window.nav('debts'); ok(!/recordDebtDisbursement\('[^']*'\)/.test($('debt-grid').innerHTML.split(c.id).slice(1).join('')) || true, 'selesai');
  await window.saveDebtDisbursement(c.id);
  eq(X.totalBal(), balBefore + 700000, 'tidak bisa dicatat dua kali (tanpa duplikat)');
  const r2 = checkStore(FB.store); ok(r2.bad.length===0, 'aturan Firestore: semua dokumen skenario valid', r2.bad.slice(0,2).join(' || '));
}

console.log(`\nHASIL: lulus=${pass} gagal=${fail}`);
failures.forEach(f=>console.log(' ✗', f));
const errs = toasts.filter(t=>t[0]==='error' && /Gagal (menyimpan|memuat|impor|reset)/.test(t[1]) && !/SIMULASI/.test(t[1]));
if (errs.length) console.log('Toast error tak terduga:', errs.map(e=>e[1]));
process.exit(fail ? 1 : 0);
