// Conex — "TU N° 24" sempre col MIGLIOR punteggio del pilota (2026-11-10, chiesto da Fabio).
// Nella classifica MONDO la posizione del pilota (titolo della classifica in home, pagina CLASSIFICA)
// non usa più i punti della partita in corso: usa il miglior punteggio mai ottenuto, preso da
// - i suoi 5 migliori record salvati in questo browser (record.js),
// - le sue righe nella classifica di questo browser,
// - le sue righe nella classifica mondiale online (stesso nome del pilota), per i record fatti
//   su un altro browser o persi con un backup vecchio.
// Lo stesso per ONLINE SCORE: il totale più alto tra quello di questo browser e le righe online col suo nome.
// Va caricato dopo classifica-pagina.js.

const MPUNTI={ttl:60000,max:300};
let mpWorld={n:'',s:0,t:0,busy:false},mpOnline={n:'',p:0,t:0,busy:false};
function mpName(){return typeof recName==='function'?recName():(typeof prof!=='undefined'&&prof&&prof.nome)||''}
function mpWhere(col,n){return{structuredQuery:{from:[{collectionId:col}],where:{fieldFilter:{field:{fieldPath:'n'},op:'EQUAL',value:{stringValue:n}}},limit:MPUNTI.max}}}
// Ridisegna i riquadri quando arriva dalla rete un record più alto
function mpRefresh(){
 if(typeof mapMeCache!=='undefined')mapMeCache={s:-1,rank:0,t:0};
 if(typeof vetMeOn!=='undefined')vetMeOn={p:-1,rank:0,t:0};
 if(typeof setTimeout!=='function')return;
 if(typeof mapBoardTick==='function')setTimeout(mapBoardTick,50);
 if(typeof bpMe==='function'){const o=typeof document!=='undefined'&&document.getElementById&&document.getElementById('boardOverlay');if(o&&!o.classList.contains('hidden'))setTimeout(bpMe,80)}
}
function mpFetchWorld(n){
 if(!n||typeof coOn==='undefined'||!coOn||typeof coReq!=='function'||mpWorld.busy)return;
 if(mpWorld.n===n&&Date.now()-mpWorld.t<MPUNTI.ttl)return;
 mpWorld.busy=true;
 coReq(':runQuery',mpWhere('classifica',n)).then(j=>{
  let s=0;for(const x of Array.isArray(j)?j:[]){if(!x||!x.document)continue;const r=coRow(x.document);if(r.n===n&&Number.isFinite(r.s)&&r.s>s)s=Math.round(r.s)}
  const up=mpWorld.n!==n||s>mpWorld.s;mpWorld={n,s:mpWorld.n===n?Math.max(s,mpWorld.s):s,t:Date.now(),busy:false};
  if(up&&s>mpLocalBest(n))mpRefresh();
 }).catch(()=>{mpWorld.busy=false;mpWorld.t=Date.now();if(mpWorld.n!==n)mpWorld={n,s:0,t:Date.now(),busy:false}});
}
function mpFetchOnline(n){
 if(!n||typeof coOn==='undefined'||!coOn||typeof coReq!=='function'||typeof arkRow!=='function'||mpOnline.busy)return;
 if(mpOnline.n===n&&Date.now()-mpOnline.t<MPUNTI.ttl)return;
 mpOnline.busy=true;
 coReq(':runQuery',mpWhere('arena',n)).then(j=>{
  let p=0;for(const x of Array.isArray(j)?j:[]){if(!x||!x.document)continue;const r=arkRow(x.document);if(r.n===n&&r.p>p)p=r.p}
  const before=arkLocalPoints(n),up=mpOnline.n!==n||p>mpOnline.p;mpOnline={n,p:mpOnline.n===n?Math.max(p,mpOnline.p):p,t:Date.now(),busy:false};
  if(up&&p>before)mpRefresh();
 }).catch(()=>{mpOnline.busy=false;mpOnline.t=Date.now();if(mpOnline.n!==n)mpOnline={n,p:0,t:Date.now(),busy:false}});
}
// Miglior punteggio salvato in questo browser (mai la partita in corso)
function mpLocalBest(n){
 let best=0;
 if(typeof myList==='function'){try{for(const r of myList())if(r.s>best)best=Math.round(r.s)}catch(e){}}
 if(n&&typeof boardLoad==='function'){try{for(const r of boardLoad())if(r.n===n&&r.s>best)best=Math.round(r.s)}catch(e){}}
 return best;
}
// MONDO: il miglior punteggio del pilota
mapBestScore=function(){
 const n=mpName();mpFetchWorld(n);
 return Math.max(mpLocalBest(n),n&&mpWorld.n===n?mpWorld.s:0);
};
// ONLINE SCORE: il totale più alto del pilota
function arkLocalPoints(n){
 const r=typeof arkLoad==='function'?arkLoad():null;
 return r&&(!n||r.n===n)&&typeof arkPoints==='function'?arkPoints(r):0;
}
function arkBestPoints(){
 const n=typeof arkName==='function'?arkName():mpName();mpFetchOnline(n);
 return Math.max(arkLocalPoints(n),n&&mpOnline.n===n?mpOnline.p:0);
}
