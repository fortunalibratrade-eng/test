import fs from 'fs';
const src = process.argv[2], out = process.argv[3];
let s = fs.readFileSync(src,'utf8');
s = s.replace(/import \{ auth, db, googleProvider \} from '\.\/firebase\.js';/, "import { auth, db, googleProvider } from './fake-firebase.mjs';");
s = s.replace(/from "https:\/\/www\.gstatic\.com\/firebasejs\/10\.12\.0\/firebase-(auth|firestore)\.js";/g, 'from "./fake-firebase.mjs";');
s += `
export const __x = { S: ()=>S, setTxnType:v=>{_txnType=v}, monthTxns, txnDebtRole: typeof txnDebtRole!=='undefined'?txnDebtRole:null,
  targetEvalForKey: typeof targetEvalForKey!=='undefined'?targetEvalForKey:null, recapFor: typeof recapFor!=='undefined'?recapFor:null,
  parseScheduleStrict: typeof parseScheduleStrict!=='undefined'?parseScheduleStrict:null, computeAIAnalysis, computeFullAIReport, fmt, fmtS,
  totalBal, accBal, netWorth, totalHutang, totalPiutang, filterReal, sumType, periodState: typeof periodState!=='undefined'?periodState:null,
  weeksInMonth, loadFxChart, fetchFxRates, fillFxChartWidget, fxState:()=>_fxChartState, fxMem:_fxChartMem, FX_CHART_TF, today, debtRemaining, txnFilter:()=>txnFilter, budgetNativeSpent, fillTxnTable, localDateStr, weekStartOf };
`;
fs.writeFileSync(out, s);
