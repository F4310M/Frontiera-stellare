// Conex — RECORD A FINE MISSIONE (2026-11-04).
// Ogni volta che una missione finisce (spazio o terra, vinta o persa) i punti della partita
// vanno nella classifica mondiale e la schermata del risultato mostra la posizione mondiale
// del pilota, con la sua foto.
// Una sola riga per partita: nasce alla prima missione e poi si aggiorna. Le regole di Firebase
// lasciano aggiornare la riga solo a chi conosce la sua chiave segreta (k), che cambia ogni volta:
// sulla riga resta solo l'impronta (h) della chiave successiva.
// Se su Firebase ci sono ancora le regole vecchie, la posizione si vede lo stesso e il punteggio
// parte a fine gioco, come prima.

const REC_KEY='stellarRecord';
let recOld=false,recQ=Promise.resolve(),recEnded=false;
function recLoad(){try{const r=JSON.parse(localStorage.getItem(REC_KEY)||'null');return r&&typeof r.id==='string'&&/^[A-Za-z0-9]{1,40}$/.test(r.id)&&typeof r.k==='string'&&typeof r.n==='string'?r:null}catch(e){return null}}
function recSave(r){if(r)localStorage.setItem(REC_KEY,JSON.stringify(r));else localStorage.removeItem(REC_KEY)}
function recSecret(){const b=new Uint8Array(24);crypto.getRandomValues(b);return Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')}
async function recHash(k){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(k));return Array.from(new Uint8Array(d),x=>x.toString(16).padStart(2,'0')).join('')}
function recName(){return(typeof prof!=='undefined'&&prof&&prof.nome)||''}
function recMini(n){return typeof prof!=='undefined'&&prof&&prof.nome===n&&prof.mini?prof.mini:''}
function recToday(){return new Date().toISOString().slice(0,10)}
function recFields(n,s,extra){
 const f={n:{stringValue:n},s:{integerValue:String(s)},d:{stringValue:recToday()}},a=recMini(n);
 if(a&&(typeof profImgOk!=='function'||profImgOk(a,typeof PROF_MINI_MAX!=='undefined'?PROF_MINI_MAX:8000)))f.a={stringValue:a};
 for(const k in extra)f[k]={stringValue:extra[k]};
 return f;
}
function recIs403(e){return /firestore 4\d\d/.test(String(e&&e.message))}
async function recPatch(id,fields){
 const ctl=typeof AbortController==='function'?new AbortController():null,t=ctl?setTimeout(()=>ctl.abort(),8000):0;
 try{
  const r=await fetch(coUrl('/classifica/'+encodeURIComponent(id))+'&currentDocument.exists=true',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields}),signal:ctl?ctl.signal:undefined});
  if(!r.ok)throw new Error('firestore '+r.status);
  return await r.json();
 }finally{clearTimeout(t)}
}
// Scrive i punti della partita sulla riga del pilota (la crea se serve). Restituisce l'id della riga, oppure '' se non si può.
async function recWrite(n,pts){
 let r=recLoad();
 if(r&&r.n!==n){recSave(null);r=null}
 if(r){
  if(pts<=r.s)return r.id;
  const k2=recSecret(),h2=await recHash(k2);
  try{await recPatch(r.id,recFields(n,pts,{k:r.k,h:h2}));recSave({id:r.id,k:k2,n,s:pts});coCache=null;return r.id}
  catch(e){if(!recIs403(e))throw e;recSave(null)}   // chiave non più valida (es. backup vecchio): si riparte con una riga nuova
 }
 if(recOld)return '';
 const k=recSecret(),h=await recHash(k);
 try{
  const j=await coReq('/classifica',{fields:recFields(n,pts,{h})});
  const id=String(j&&j.name||'').split('/').pop();
  if(id)recSave({id,k,n,s:pts});coCache=null;return id;
 }catch(e){if(recIs403(e)){recOld=true;return ''}throw e}
}

// ---- riquadro nella schermata del risultato: foto, posizione mondiale, punti
function recBox(){
 if(typeof document==='undefined'||!document.createElement||!document.querySelector)return null;
 let b=$('worldRank');if(b)return b;
 const side=document.querySelector('.result-card .result-side');if(!side||!side.insertBefore)return null;
 b=document.createElement('div');b.id='worldRank';b.className='world-rank hidden';
 b.innerHTML='<span class="world-rank-ava"></span><div class="world-rank-txt"><small><i class="world-rank-globe"></i> CLASSIFICA MONDIALE</small><b class="world-rank-pos">…</b><span class="world-rank-sub"></span></div>';
 const g=b.querySelector('.world-rank-globe');if(g&&typeof ico==='function')g.outerHTML=ico('globe');
 side.insertBefore(b,side.firstChild);return b;
}
function recShow(o){
 const b=recBox();if(!b)return;
 if(!o){b.classList.add('hidden');return}
 b.classList.remove('hidden');b.classList.toggle('top3',!!(o.rank&&o.rank<=3));
 const n=o.name||recName(),av=b.querySelector('.world-rank-ava');
 if(av)av.innerHTML=typeof profAva==='function'?profAva(recMini(n),'world-rank-img',n):'';
 b.querySelector('.world-rank-pos').textContent=o.rank?'POSIZIONE '+scoreFmt(o.rank):o.pos||'—';
 b.querySelector('.world-rank-sub').textContent=o.sub||'';
}
// Fine di una missione: si salva il record e si mostra la posizione.
function recMission(){
 if(recEnded){recEnded=false;return}   // fine partita: ci pensa l'invio finale (scoreSubmit)
 myAdd(score);
 if(!coOn){recShow(null);return}
 const pts=Math.round(score),n=recName();
 if(!(pts>0)){recShow({name:n,pos:'—',sub:'NESSUN PUNTO ANCORA'});return}
 recShow({name:n,pos:'…',sub:'PUNTI '+scoreFmt(pts)+' · CALCOLO DELLA POSIZIONE…'});
 recQ=recQ.then(async()=>{
  try{
   const rank=await coRank(pts);
   let saved=false;
   if(n&&(rank<=WORLD_SIZE||recLoad())){const id=await recWrite(n,pts);if(id){coMyId=id;saved=true}}
   const sub='PUNTI '+scoreFmt(pts)+' · '+(saved?'RECORD SALVATO':n?'VERRÀ SALVATO A FINE PARTITA':'CREA IL PILOTA PER SALVARLO');
   if(rank>WORLD_SIZE&&!saved)recShow({name:n,pos:'FUORI DAI PRIMI 10.000',sub:'PUNTI '+scoreFmt(pts)});
   else recShow({name:n,rank,sub});
   if(saved&&typeof mapBoardTick==='function')setTimeout(mapBoardTick,500);
  }catch(e){recShow({name:n,pos:'OFFLINE',sub:'PUNTI '+scoreFmt(pts)+' · POSIZIONE NON DISPONIBILE'})}
 });
 return recQ;
}

// ---- dove finiscono le missioni
{
 const f=finish;finish=function(win){const before=state;const r=f.apply(this,arguments);if(state!==before&&(state==='won'||state==='lost'))recMission();return r};
 const pff=pfFinish;pfFinish=function(win){const before=state;const r=pff.apply(this,arguments);if(state!==before&&(state==='won'||state==='lost'))recMission();return r};
 const se=scoreEnd;scoreEnd=function(){recEnded=true;myAdd(score);myRunEnd();if(coOn)recShow({name:recName(),pos:'…',sub:'PUNTI '+scoreFmt(score)});return se.apply(this,arguments)};
}
// Fine partita (GAME OVER o OMEGA): la riga della partita riceve il punteggio finale, senza crearne un'altra.
{
 const sub=scoreSubmit;
 scoreSubmit=async function(){
  await recQ.catch(()=>{});
  const pts=Math.round(scorePending),inp=$('scoreName'),name=cleanName(inp&&inp.value),r=recLoad();
  let out;
  if(coOn&&pts>0&&r&&name&&r.n===name){
   try{
    await recWrite(name,pts);
    const pos=boardAdd(name,pts);localStorage.setItem('stellarUltimoNome',name);
    scorePending=0;inp.disabled=true;$('scoreSaveBtn').disabled=true;boardHighlight=pos>0?{n:name,s:pts}:null;coMyId=r.id;
    const rank=await coRank(pts);
    $('scoreMsg').textContent='CLASSIFICA MONDIALE · POSIZIONE '+scoreFmt(rank);
    await coTop(true);
    while(rank<=300&&coMore&&!coCache.some(x=>x.id===coMyId))await coNext();
    coView='mondo';recSave(null);
    recShow({name,rank,sub:'PUNTI '+scoreFmt(pts)+' · RECORD SALVATO'});
    boardOpen();coCache=null;if(typeof mapBoardTick==='function')setTimeout(mapBoardTick,500);
    return;
   }catch(e){}
  }
  recSave(null);
  out=await sub.apply(this,arguments);
  // posizione nel riquadro anche con l'invio classico
  if(coOn&&pts>0&&scorePending===0){try{recShow({name,rank:await coRank(pts),sub:'PUNTI '+scoreFmt(pts)})}catch(e){recShow({name,pos:'OFFLINE',sub:'PUNTI '+scoreFmt(pts)})}}
  return out;
 };
}
// Una nuova missione nasconde il riquadro della precedente.
if(typeof brief==='function'){const b=brief;brief=function(){recEnded=false;recShow(null);return b.apply(this,arguments)}}
recBox();

// ---- IL TUO MIGLIOR RECORD: i 5 punteggi migliori del pilota (scheda accanto a MONDO)
// Ogni partita è una riga che cresce missione dopo missione; si tengono le 5 migliori.
const MY_KEY='stellarMieiRecord',MY_RUN='stellarPartita',MY_MAX=5;
function myLoad(){try{const b=JSON.parse(localStorage.getItem(MY_KEY)||'null');return Array.isArray(b)?b.filter(r=>r&&Number.isFinite(r.s)&&r.s>0&&typeof r.p==='string'):null}catch(e){return null}}
function mySave(b){localStorage.setItem(MY_KEY,JSON.stringify(b))}
function myRun(){let id=localStorage.getItem(MY_RUN);if(!id){id=Date.now().toString(36)+Math.random().toString(36).slice(2,6);localStorage.setItem(MY_RUN,id)}return id}
function myRunEnd(){localStorage.removeItem(MY_RUN)}
// Prima volta: si parte dai punteggi del pilota già nella classifica di questo browser.
function myList(){
 let b=myLoad();
 if(!b){const n=recName();b=n?boardLoad().filter(r=>r.n===n).slice(0,MY_MAX).map((r,i)=>({p:'old'+i,s:r.s,d:r.d||''})):[];mySave(b)}
 return b;
}
function myAdd(points){
 const pts=Math.round(points);if(!(pts>0))return;
 const b=myList(),p=myRun(),r=b.find(x=>x.p===p),d=new Date().toISOString().slice(0,10);
 if(r){if(pts>r.s){r.s=pts;r.d=d}}else b.push({p,s:pts,d});
 b.sort((x,y)=>y.s-x.s);mySave(b.slice(0,MY_MAX));
}
function myRender(list){
 const b=myList(),n=recName()||cleanName(localStorage.getItem('stellarUltimoNome'))||'—',cur=localStorage.getItem(MY_RUN);
 boardShow(list,b.map(r=>({n,s:r.s,d:r.d,p:r.p})),r=>!!cur&&r.p===cur,'Nessun record ancora: completa una missione per registrare il tuo primo record.');
}
{
 const brl=boardRenderLocal;
 boardRenderLocal=function(list){if(coOn&&coView==='locale')return myRender(list);return brl.apply(this,arguments)};
 const bt=boardTabs;
 boardTabs=function(){
  const r=bt.apply(this,arguments);
  if(coOn&&coView==='locale'){
   const sub=$('boardSub');if(sub)sub.textContent='I TUOI 5 MIGLIORI RECORD';
   const note=$('boardWhere');if(note)note.textContent='Ogni partita conta come un record e cresce a ogni missione. Restano i tuoi 5 migliori.';
  }
  return r;
 };
 if(typeof document!=='undefined'&&document.querySelector){const t=document.querySelector('#boardTabs button[data-view="locale"]');if(t)t.textContent='IL TUO MIGLIOR RECORD'}
}
