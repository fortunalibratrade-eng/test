// Port JS dari validator di firestore.rules (versi baru) — dipakai memeriksa SEMUA dokumen yang ditulis aplikasi saat tes.
const has = (d,k)=>Object.prototype.hasOwnProperty.call(d,k);
const num = v => typeof v==='number' && Number.isFinite(v);
const str = v => typeof v==='string';
const opt = (d,k,f) => !has(d,k) || f(d[k]);
export const V = {
  transactions: d => ['date','description','amount','categoryId','accountId','type'].every(k=>has(d,k))
    && ['income','expense'].includes(d.type) && num(d.amount) && d.amount>0 && d.amount<999999999999
    && str(d.description) && d.description.length<=200 && str(d.date) && d.date.length===10
    && str(d.categoryId) && d.categoryId.length>0 && str(d.accountId) && d.accountId.length>0
    && opt(d,'note',v=>str(v)&&v.length<=300) && opt(d,'transferId',str) && opt(d,'flow',v=>['real','hutang','transfer'].includes(v))
    && opt(d,'debtId',str) && opt(d,'debtRole',v=>['disburse','payment','interest'].includes(v)),
  budgets: d => has(d,'categoryId')&&has(d,'amount') && str(d.categoryId)&&d.categoryId.length>0 && num(d.amount)&&d.amount>0&&d.amount<999999999999
    && opt(d,'period',v=>['harian','mingguan','bulanan','tahunan'].includes(v)),
  goals: d => ['name','target','current','deadline','icon','color'].every(k=>has(d,k)) && str(d.name)&&d.name.length>0&&d.name.length<=60
    && num(d.target)&&d.target>=0&&d.target<999999999999 && num(d.current)&&d.current>=0&&d.current<999999999999 && str(d.deadline)&&str(d.icon)&&str(d.color)
    && opt(d,'ladderStep',v=>num(v)&&v>=1&&v<=7) && opt(d,'autoTrack',v=>typeof v==='boolean'),
  categories: d => ['name','type','icon','color'].every(k=>has(d,k)) && str(d.name)&&d.name.length>0&&d.name.length<=40 && ['income','expense'].includes(d.type)&&str(d.icon)&&str(d.color),
  accounts: d => ['name','type','icon','color'].every(k=>has(d,k)) && str(d.name)&&d.name.length>0&&d.name.length<=50 && ['cash','bank','ewallet'].includes(d.type)&&str(d.icon)&&str(d.color)
    && opt(d,'purpose',v=>['transaksi','tabungan','lainnya'].includes(v)) && opt(d,'bankName',v=>str(v)&&v.length<=30) && opt(d,'accountNumber',v=>str(v)&&v.length<=30),
  debts: d => ['type','person','amount','paid'].every(k=>has(d,k)) && ['hutang','piutang'].includes(d.type) && str(d.person)&&d.person.length>0&&d.person.length<=60
    && num(d.amount)&&d.amount>0&&d.amount<999999999999 && num(d.paid)&&d.paid>=0&&d.paid<999999999999 && d.paid<=d.amount
    && opt(d,'borrowDate',str) && opt(d,'dueDate',v=>v===null||str(v)) && opt(d,'note',v=>str(v)&&v.length<=200) && opt(d,'isKPR',v=>typeof v==='boolean'),
  targets: d => ['period','mode','title'].every(k=>has(d,k)) && ['harian','mingguan','bulanan','tahunan'].includes(d.period) && ['nominal','checklist','jadwal'].includes(d.mode)
    && str(d.title)&&d.title.length>0&&d.title.length<=60 && opt(d,'description',v=>str(v)&&v.length<=150) && opt(d,'goalType',v=>['hemat','batas'].includes(v))
    && opt(d,'basis',v=>['total','kategori'].includes(v)) && opt(d,'incomeCatId',str) && opt(d,'expenseCatId',str)
    && opt(d,'amount',v=>num(v)&&v>0&&v<999999999999) && opt(d,'completedPeriods',Array.isArray) && opt(d,'daysOfWeek',v=>v===null||Array.isArray(v))
    && opt(d,'specificDate',v=>v===null||str(v)) && opt(d,'schedules',v=>v&&typeof v==='object'&&!Array.isArray(v)) && opt(d,'overrides',v=>v&&typeof v==='object'&&!Array.isArray(v))
    && opt(d,'completedBlocks',v=>v&&typeof v==='object'&&!Array.isArray(v)),
  settings: d => opt(d,'theme',v=>['dark','light'].includes(v)) && opt(d,'currency',v=>['Rp','$','€','¥','£'].includes(v)) && opt(d,'wealthLadder',v=>v&&typeof v==='object'&&!Array.isArray(v)),
};
export function checkStore(store) {
  const bad = []; let n = 0;
  for (const [path, data] of store) {
    const m = path.match(/^users\/[^/]+\/(\w+)\/[^/]+$/); if (!m) { bad.push('path di luar whitelist: '+path); continue; }
    const f = V[m[1]]; if (!f) { bad.push('koleksi tak dikenal: '+m[1]); continue; }
    n++; if (!f(data)) bad.push(`${m[1]} ditolak aturan: ${JSON.stringify(data).slice(0,220)}`);
  }
  return { n, bad };
}
