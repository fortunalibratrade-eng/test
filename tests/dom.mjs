// DOM palsu minimal (Proxy): elemen apa pun bisa diambil lewat getElementById dan nilainya bisa diatur oleh tes.
const els = new Map();
function mk(id) {
  const t = { id, value:'', checked:false, disabled:false, innerHTML:'', textContent:'', style:{}, dataset:{}, children:[], className:'',
    classList:{ _s:new Set(), add(c){this._s.add(c)}, remove(c){this._s.delete(c)}, toggle(c,f){ (f===undefined? !this._s.has(c): f)? this._s.add(c):this._s.delete(c) }, contains(c){return this._s.has(c)} },
    appendChild(c){ this.children.push(c); return c }, remove(){}, addEventListener(){}, removeEventListener(){}, querySelector(){return null}, querySelectorAll(){return []},
    getBoundingClientRect(){return {left:0,top:0,width:1,height:1}}, setAttribute(){}, getAttribute(){return null}, focus(){}, click(){}, offsetWidth:1, parentElement:null };
  return new Proxy(t, { get:(o,k)=> k in o ? o[k] : (typeof k==='string' ? (()=>{}) : undefined), set:(o,k,v)=>{o[k]=v;return true} });
}
globalThis.window = globalThis; globalThis.addEventListener = () => {};
globalThis.document = {
  getElementById: id => { if(!els.has(id)) els.set(id, mk(id)); return els.get(id); },
  createElement: () => mk('new'), querySelector: () => null, querySelectorAll: () => [], addEventListener(){},
  body: mk('body'), documentElement: { setAttribute(){}, getAttribute(){ return 'dark' } }, activeElement: { tagName:'BODY' }
};
globalThis.getComputedStyle = () => ({ getPropertyValue: n => ({'--income':'#3DDBA0','--expense':'#FF7068'}[n] || '#7B9EF8') });
globalThis.requestAnimationFrame = () => 0;
globalThis.localStorage = { _d:{}, getItem(k){return this._d[k]??null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]}, key(i){return Object.keys(this._d)[i]??null}, get length(){return Object.keys(this._d).length}, clear(){this._d={}} };
const _si = globalThis.setInterval; globalThis.setInterval = () => 0; globalThis.clearInterval = () => {};
globalThis.fetch = async () => { throw new Error('offline'); };
export const $ = id => document.getElementById(id);
export const setVals = o => Object.entries(o).forEach(([k,v]) => { const e=$(k); if (typeof v==='boolean') e.checked=v; else e.value=v; });
export const toasts = []; 
