import fs from 'fs';
const files = process.argv.slice(2);
const app = fs.readFileSync(files[0],'utf8');
const html = files[1] ? fs.readFileSync(files[1],'utf8') : '';
const topNames = new Set();
for (const m of app.matchAll(/^(?:async\s+)?function\s+([\w$]+)/gm)) topNames.add(m[1]);
for (const m of app.matchAll(/^(?:const|let|var)\s+([\w$]+)/gm)) topNames.add(m[1]);
const winNames = new Set();
for (const m of app.matchAll(/window\.([\w$]+)\s*=/g)) winNames.add(m[1]);
// kandidat bukan-window yang aman karena memang global browser
const ok = new Set(['nav','toast','closeModal']);
const handlerRe = /\son(?:click|change|input|submit|keydown|keyup|mouseover|mouseout)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
let bad = 0, total = 0;
for (const [label, src] of [['app.js',app],['index.html',html]]) {
  for (const m of src.matchAll(handlerRe)) {
    total++;
    const txt = (m[1] ?? m[2]).replace(/\$\{[^}]*\}/g,'X');
    // buang string literal agar kata di dalam string tidak ikut dicek
    const code = txt.replace(/'[^']*'/g,"''").replace(/"[^"]*"/g,'""');
    for (const name of topNames) {
      if (winNames.has(name)) continue;
      if (new RegExp('(^|[^\\w$.])'+name.replace(/\$/g,'\\$')+'(?![\\w$])').test(code)) {
        bad++; console.log(`[${label}] handler memakai "${name}" yg TIDAK ada di window:\n   ${txt.slice(0,160)}`);
      }
    }
    // panggilan fungsi yg tidak terdaftar di window
    for (const c of code.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const n = c[2];
      if (['if','return','event','this','document','window','alert','confirm','parseInt','Number','String','JSON','Math'].includes(n)) continue;
      if (!winNames.has(n)) { bad++; console.log(`[${label}] pemanggilan "${n}()" tidak terdefinisi di window:\n   ${txt.slice(0,160)}`); }
    }
  }
}
console.log(`\nTotal inline handler dicek: ${total}, masalah: ${bad}`);
process.exit(bad?1:0);
