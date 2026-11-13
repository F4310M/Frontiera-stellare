// Conex — PROGRESSI VERIFICATI (2026-11-13): gli upgrade del mercato valgono nella SFIDA ONLINE solo fino
// al livello che il pilota ha davvero raggiunto nella campagna.
// - Ogni missione vinta (fase nello spazio o fase a terra, senza god mode) è un "passo".
// - I passi vanno su Firestore in progressi/{utente} = { l: livello, t: ora del server }. Le regole lasciano
//   salire il livello solo di pochi passi alla volta e solo dopo PV_PASSO secondi per passo, misurati con
//   l'ora del server: chi si regala crediti sul PC non può regalarsi anche il livello.
// - Nell'arena il livello decide quanti livelli di upgrade si possono usare in tutto (PV.budget). La propria
//   nave si limita da sola; i colpi che arrivano dagli altri si tagliano al massimo permesso dal LORO livello.
// - Gratis: niente Cloud Function, solo regole del piano gratuito di Firebase.
// Va caricato dopo economia.js, accesso.js e arena.js.
const PV_PASSO=300;          // secondi minimi per ogni passo (le stesse 5 minuti stanno in firestore.rules)
const PV_LOTTO=10;           // passi al massimo in una sola scrittura
const PV_BASE=2,PV_MAX=14;   // livelli di upgrade concessi a livello 0, e il massimo (tutti gli upgrade dell'arena)
const PV=(function(){
'use strict';
const G=typeof window!=='undefined'?window:globalThis;
const KEY='cxLivello';
const on=typeof CX!=='undefined'&&!!CX&&!!CX.on;
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}};
const lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
// cxLivello = { p: passi vinti non ancora inviati, l: livello confermato dal server, u: utente di quel livello }
function stato(){try{const o=JSON.parse(lsGet(KEY)||'null');if(o&&typeof o==='object')return{p:Math.max(0,Math.min(999,o.p|0)),l:Math.max(0,o.l|0),u:typeof o.u==='string'?o.u:''}}catch(e){}return{p:0,l:0,u:''}}
function salva(s){lsSet(KEY,JSON.stringify(s))}

// livelli di upgrade usabili in arena con il livello l (l sconosciuto = null: nessun limite, es. senza Firebase)
function budget(l){if(typeof l!=='number'||!isFinite(l))return null;return Math.min(PV_MAX,PV_BASE+Math.max(0,Math.floor(l)))}

// ---------------------------------------------------------------- livello letto dal server
const cache=new Map();// utente -> {l, quando, inCorso}
function numero(doc){const f=doc&&doc.fields&&doc.fields.l;if(!f)return 0;const v=parseInt(f.integerValue!=null?f.integerValue:f.doubleValue,10);return isFinite(v)?Math.max(0,v):0}
function ora(doc){const f=doc&&doc.fields&&doc.fields.t;const v=f&&Date.parse(f.timestampValue);return isFinite(v)?v:0}
async function leggi(u){const d=await CX.leggi('progressi',u);return d?{l:numero(d),t:ora(d),c:true}:{l:0,t:0,c:false}}
// livello di un altro pilota (dal suo utente): subito il valore in memoria, intanto lo aggiorna;
// undefined finché non si sa (chi lo usa lo tratta come livello 0)
function di(u){
 if(!on||typeof u!=='string'||!u)return undefined;
 let c=cache.get(u);
 if(!c){c={l:undefined,quando:0,inCorso:false};cache.set(u,c)}
 if(!c.inCorso&&Date.now()-c.quando>60000){
  c.inCorso=true;c.quando=Date.now();
  leggi(u).then(r=>{c.l=r.l}).catch(()=>{c.quando=Date.now()-45000}).finally(()=>{c.inCorso=false});
 }
 return c.l;
}
// il mio livello confermato (dall'ultima lettura o scrittura riuscita)
function mio(){
 if(!on)return undefined;
 const u=CX.uid&&CX.uid(),s=stato();
 if(u){const c=cache.get(u);if(c&&typeof c.l==='number')return Math.max(c.l,s.u===u?s.l:0);return s.u===u?s.l:undefined}
 return s.u?s.l:undefined;
}

// ---------------------------------------------------------------- passi vinti
function passo(){const s=stato();s.p=Math.min(999,s.p+1);salva(s);invia()}
let invio=null,prossimo=0,scarto=0;// scarto = quanto l'orologio del PC è avanti rispetto al server (ms)
// rilegge lo stato salvato e lo cambia (un passo vinto può arrivare mentre l'invio è in corso)
function cambia(fn){const s=stato();fn(s);salva(s);return s}
function invia(){
 if(!on||invio)return invio;
 invio=(async()=>{
  try{
   const t=await CX.token();const u=CX.uid&&CX.uid();if(!t||!u)return;
   const r=await leggi(u);
   const s=cambia(x=>{if(x.u!==u){x.u=u;x.l=r.l}else x.l=Math.max(x.l,r.l)});
   const c=cache.get(u)||{l:undefined,quando:0,inCorso:false};c.l=r.l;c.quando=Date.now();cache.set(u,c);
   if(s.p<=0)return;
   let n;
   if(!r.c)n=1;                                                  // prima volta: un passo subito
   else n=Math.min(s.p,PV_LOTTO,Math.floor((Date.now()-scarto-r.t)/1000/PV_PASSO));
   if(n<=0){prossimo=r.t+scarto+PV_PASSO*1000+5000;return}
   const l=r.l+n;
   try{
    const ok=await CX.commit([{col:'progressi',id:u,fields:{l:{integerValue:String(l)}},nuovo:!r.c}]);
    const ct=ok&&Date.parse(ok.commitTime);if(isFinite(ct))scarto=Date.now()-ct;
    cambia(x=>{x.p=Math.max(0,x.p-n);x.l=l;x.u=u});c.l=l;c.quando=Date.now();
   }catch(e){                                                      // rifiutato (orologio del PC avanti?) o rete giù: si riprova
    if(/firestore 403/.test(String(e&&e.message)))scarto+=60000;
    prossimo=Date.now()+60000;
   }
  }catch(e){prossimo=Date.now()+30000}
  finally{invio=null}
 })();
 return invio;
}
if(on&&typeof setInterval==='function')setInterval(()=>{const s=stato();if(s.p>0&&Date.now()>=prossimo)invia()},30000);
if(on&&typeof setTimeout==='function')setTimeout(invia,4000);

// ogni fase vinta (spazio o terra) senza god mode è un passo
if(typeof ecoEndPhase==='function'){
 const orig=ecoEndPhase;
 ecoEndPhase=function(phase,win,info){
  const run=typeof eco!=='undefined'&&eco?eco.run:null;
  const r=orig.apply(this,arguments);
  try{if(win&&run&&run.phase===phase&&!(typeof godMode!=='undefined'&&godMode))passo()}catch(e){}
  return r;
 };
}

// il backup .sfsave porta con sé i passi non ancora inviati
if(typeof G.addEventListener==='function')G.addEventListener('load',()=>{
 if(typeof PROF_PROGRESS!=='undefined'&&Array.isArray(PROF_PROGRESS)&&!PROF_PROGRESS.includes(KEY))PROF_PROGRESS.push(KEY);
});

return {on,budget,di,mio,passo,invia,stato};
})();

// traduzioni
(function(){
 if(typeof I18N_ROWS==='undefined')return;
 const rows=[
  ["UPGRADE LIMITATI DAL LIVELLO DELLA CAMPAGNA","UPGRADES LIMITED BY CAMPAIGN LEVEL","AMÉLIORATIONS LIMITÉES PAR LE NIVEAU DE CAMPAGNE","MEJORAS LIMITADAS POR EL NIVEL DE CAMPAÑA","УЛУЧШЕНИЯ ОГРАНИЧЕНЫ УРОВНЕМ КАМПАНИИ","升级受战役等级限制","強化はキャンペーンのレベルで制限"],
  ["Nella sfida online gli upgrade valgono fino al livello raggiunto nella campagna: ogni missione vinta lo alza.","In online battles upgrades work up to the level reached in the campaign: every mission won raises it.","En ligne, les améliorations valent jusqu’au niveau atteint dans la campagne : chaque mission gagnée l’augmente.","En línea las mejoras valen hasta el nivel alcanzado en la campaña: cada misión ganada lo sube.","В онлайн-бою улучшения действуют до уровня, достигнутого в кампании: каждая выигранная миссия его повышает.","在线对战中，升级只在战役达到的等级内有效：每赢一场任务等级就会提升。","オンライン対戦では強化はキャンペーンで到達したレベルまで有効：ミッションに勝つたびに上がる。"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild();if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)i18nApply()}catch(e){}
})();
