// Conex — CLASSIFICA ARENA (2026-11-08): il secondo ranking, quello delle battaglie online.
// Nella classifica la scheda IL TUO MIGLIOR RECORD lascia il posto ad ARENA ONLINE:
// MONDO = punti della campagna, ARENA ONLINE = punti delle sfide online (arena.js).
// Punti arena: 100 per abbattimento, 500 per ogni sfida vinta, 50 per ogni sfida giocata.
// Conta solo una sfida vera: giocata online (Realtime Database) e finita con almeno 2 piloti.
// Una riga per pilota nella raccolta Firestore `arena` (stesse regole di classifica: chiave segreta
// che cambia a ogni aggiornamento, sulla riga resta solo la sua impronta h). I totali restano
// anche in questo browser (stellarArena) e partono appena la rete risponde.

const ARK={KEY:'stellarArena',kill:100,win:500,play:50,maxKills:15,maxBatch:5,size:100};
function arkPoints(t){return ARK.kill*(t.b||0)+ARK.win*(t.v||0)+ARK.play*(t.m||0)}
function arkLoad(){
 try{const r=JSON.parse(localStorage.getItem(ARK.KEY)||'null');
  if(r&&typeof r.n==='string'&&[r.v,r.b,r.m].every(x=>Number.isInteger(x)&&x>=0))return Object.assign({id:'',k:'',sm:0,sv:0,sb:0},r);
 }catch(e){}
 return null;
}
function arkSave(r){if(r)localStorage.setItem(ARK.KEY,JSON.stringify(r));else localStorage.removeItem(ARK.KEY)}
// Esito di una sfida per questo pilota, dal punteggio finale della stanza (arScore). null = non conta.
function arkResult(sc){
 if(!Array.isArray(sc)||sc.length<2)return null;
 const me=sc.find(p=>p.me);if(!me)return null;
 const b=Math.max(0,Math.min(ARK.maxKills,Math.floor(+me.k||0)));
 return {b,v:sc[0]===me&&b>0?1:0};
}
// Aggiunge la sfida ai totali locali del pilota (riga nuova se il nome del pilota è cambiato).
function arkAdd(name,res){
 const n=typeof cleanName==='function'?cleanName(name):String(name||'');if(!n||!res)return null;
 let r=arkLoad();if(!r||r.n!==n)r={n,id:'',k:'',v:0,b:0,m:0,sm:0,sv:0,sb:0};
 r.m++;r.v+=res.v;r.b+=res.b;r.d=new Date().toISOString().slice(0,10);
 arkSave(r);return r;
}
function arkName(){
 if(typeof prof!=='undefined'&&prof&&prof.nome)return prof.nome;
 try{const p=typeof profLoad==='function'?profLoad():null;if(p&&p.nome)return p.nome}catch(e){}
 return '';
}
function arkMini(n){
 const p=typeof prof!=='undefined'&&prof?prof:null,a=p&&p.nome===n&&p.mini?p.mini:'';
 return a&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(a)&&a.length<=8000?a:'';
}
function arkFields(r,extra){
 const f={n:{stringValue:r.n},p:{integerValue:String(arkPoints(r))},v:{integerValue:String(r.v)},b:{integerValue:String(r.b)},m:{integerValue:String(r.m)}},a=arkMini(r.n);
 if(a)f.a={stringValue:a};
 for(const k in extra)f[k]={stringValue:extra[k]};
 return f;
}
function arkSecret(){return typeof recSecret==='function'?recSecret():Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('')}
async function arkHash(k){return typeof recHash==='function'?recHash(k):Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(k))),x=>x.toString(16).padStart(2,'0')).join('')}
async function arkPatch(id,fields){
 const ctl=typeof AbortController==='function'?new AbortController():null,t=ctl?setTimeout(()=>ctl.abort(),8000):0;
 try{
  const r=await fetch(coUrl('/arena/'+encodeURIComponent(id))+'&currentDocument.exists=true',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields}),signal:ctl?ctl.signal:undefined});
  if(!r.ok)throw new Error('firestore '+r.status);
  return await r.json();
 }finally{clearTimeout(t)}
}
let arkQ=Promise.resolve(),arkCache=null,arkCacheT=0,arkMyId='';
// Prossimo blocco da inviare: le regole accettano al massimo 5 sfide nuove per volta
// (con 15 abbattimenti e 1 vittoria al massimo per sfida). Il resto parte col blocco dopo.
function arkBatch(r){
 const dm=Math.min(ARK.maxBatch,r.m-r.sm);
 return {n:r.n,m:r.sm+dm,v:r.sv+Math.min(dm,r.v-r.sv),b:r.sb+Math.min(ARK.maxKills*dm,r.b-r.sb)};
}
// Porta online i totali locali: crea la riga la prima volta, poi la aggiorna con la chiave.
function arkSync(){
 arkQ=arkQ.then(async()=>{
  let r=arkLoad();
  for(let i=0;coOn&&r&&r.m>r.sm&&i<20;i++){
   if(r.id){
    const s=arkBatch(r),k2=arkSecret(),h2=await arkHash(k2);
    try{await arkPatch(r.id,arkFields(s,{k:r.k,h:h2}));Object.assign(r,{k:k2,sm:s.m,sv:s.v,sb:s.b});arkSave(r);arkMyId=r.id;arkCache=null;continue}
    catch(e){if(!/firestore 4\d\d/.test(String(e&&e.message)))throw e;Object.assign(r,{id:'',k:'',sm:0,sv:0,sb:0});arkSave(r)}   // chiave non più valida (es. backup vecchio): riga nuova
   }
   const s=arkBatch(r),k=arkSecret(),h=await arkHash(k);
   const j=await coReq('/arena',{fields:arkFields(s,{h})});
   const id=String(j&&j.name||'').split('/').pop();if(!id)break;
   Object.assign(r,{id,k,sm:s.m,sv:s.v,sb:s.b});arkSave(r);arkMyId=id;arkCache=null;
  }
  return r;
 }).catch(()=>arkLoad());
 return arkQ;
}
function arkRow(doc){
 const f=(doc&&doc.fields)||{},num=x=>Number(x&&x.integerValue)||0;
 return {n:cleanName(f.n&&f.n.stringValue),a:String((f.a&&f.a.stringValue)||''),p:num(f.p),v:num(f.v),b:num(f.b),m:num(f.m),id:String(doc.name||'').split('/').pop()};
}
async function arkTop(force){
 if(!force&&arkCache&&Date.now()-arkCacheT<60000)return arkCache;
 const j=await coReq(':runQuery',{structuredQuery:{from:[{collectionId:'arena'}],orderBy:[{field:{fieldPath:'p'},direction:'DESCENDING'}],limit:ARK.size}});
 arkCache=(Array.isArray(j)?j:[]).filter(x=>x&&x.document).map(x=>arkRow(x.document)).filter(r=>r.n&&r.p>0);arkCacheT=Date.now();
 return arkCache;
}
async function arkRank(points){
 const j=await coReq(':runAggregationQuery',{structuredAggregationQuery:{structuredQuery:{from:[{collectionId:'arena'}],
  where:{fieldFilter:{field:{fieldPath:'p'},op:'GREATER_THAN',value:{integerValue:String(Math.round(points))}}}},aggregations:[{alias:'c',count:{}}]}});
 const r=Array.isArray(j)?j.find(x=>x&&x.result):null,c=Number(r&&r.result.aggregateFields&&r.result.aggregateFields.c&&r.result.aggregateFields.c.integerValue);
 if(!Number.isFinite(c))throw new Error('conteggio');
 return c+1;
}
function arkIsMe(r){const l=arkLoad();return !!(arkMyId&&r.id===arkMyId)||!!(l&&l.id&&r.id===l.id)}
function arkRows(b){
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 return '<div class="board-row head"><span>POS.</span><span>NOME</span><span>PUNTI</span><span>VITTORIE · ABBATTIMENTI</span></div>'+
  b.map((r,i)=>{const mine=arkIsMe(r);
   return `<div class="board-row${mine?' me':''}${i<3?' podium':''}"><span>${i+1}</span><span class="board-name">${boardName(r,esc(r.n),mine?i+1:0)}</span><span>${scoreFmt(r.p)}</span><span>${r.v} · ${r.b}</span></div>`}).join('');
}
async function arkRender(list,force,isCurrent){
 if(!arkCache&&!force)list.innerHTML='<p class="board-empty board-loading">CARICAMENTO…</p>';
 const empty='Nessuna sfida ancora: gioca una SFIDA ONLINE per entrare nella classifica dell’arena.';
 try{
  await arkSync();if(!isCurrent())return;
  const b=await arkTop(force);if(!isCurrent())return;
  if(!b.length){list.innerHTML='<p class="board-empty">'+empty+'</p>';return}
  list.innerHTML=arkRows(b);
  const me=list.querySelector&&list.querySelector('.me');if(me&&me.scrollIntoView)me.scrollIntoView({block:'center'});
 }catch(e){
  if(!isCurrent())return;
  list.innerHTML=(arkCache&&arkCache.length?arkRows(arkCache):'<p class="board-empty">'+empty+'</p>');
  list.insertAdjacentHTML('afterbegin','<p class="board-offline">OFFLINE · ULTIMI DATI DISPONIBILI</p>');
 }
}

// ---- schede della classifica: MONDO | ARENA ONLINE
{
 const br=boardRender;
 boardRender=async function(force=false){
  const list=$('boardList');if(list&&list.classList)list.classList.toggle('board-arena',coOn&&coView==='arena');
  if(!(coOn&&coView==='arena'))return br.apply(this,arguments);
  if(!list)return;
  const id=++boardRenderId;boardTabs();
  return arkRender(list,force,()=>id===boardRenderId);
 };
 const bt=boardTabs;
 boardTabs=function(){
  const r=bt.apply(this,arguments),on=coOn&&coView==='arena';
  // la nota sui punti della campagna non vale per l'arena
  const pts=typeof document!=='undefined'&&document.querySelector&&document.querySelector('#boardOverlay .board-note:not(#boardWhere)');if(pts&&pts.classList)pts.classList.toggle('hidden',on);
  if(on){
   const sub=$('boardSub');if(sub)sub.textContent='I PRIMI 100 PILOTI DELL’ARENA';
   const note=$('boardWhere');if(note)note.textContent='Classifica delle sfide online: 100 punti per abbattimento, 500 per ogni vittoria, 50 per ogni sfida giocata.';
  }
  return r;
 };
 if(typeof document!=='undefined'&&document.querySelector){
  const t=document.querySelector('#boardTabs button[data-view="locale"]');
  if(t&&coOn){t.dataset.view='arena';t.innerHTML=(typeof ico==='function'?ico('laser')+' ':'')+'ARENA ONLINE'}
 }
}

// ---- fine di una sfida online: si aggiornano i totali e la schermata finale mostra la posizione
function arkLine(t){
 if(typeof document==='undefined')return;
 let e=arEl('arRank');
 if(!e){const next=arEl('arNext');if(!next||!next.parentNode||!document.createElement)return;e=document.createElement('p');e.id='arRank';e.className='ar-note ar-rank';next.parentNode.insertBefore(e,next)}
 e.textContent=t;e.classList.toggle('hidden',!t);
}
function arkMatchEnd(g){
 if(!g||!g.arkPlayed||g.arkDone)return;g.arkDone=true;
 const online=typeof arDbUrl==='function'&&!!arDbUrl();
 if(!online){arkLine('');return}
 const res=arkResult(arScore(g)),n=arkName();
 if(!res){arkLine(AR_T('SFIDA NON VALIDA PER LA CLASSIFICA: SERVONO ALMENO 2 PILOTI'));return}
 if(!n){arkLine(AR_T('CREA IL PILOTA PER ENTRARE NELLA CLASSIFICA DELL’ARENA'));return}
 const gain=ARK.kill*res.b+ARK.win*res.v+ARK.play,r=arkAdd(n,res);
 const base=AR_T('PUNTI ARENA')+' +'+gain+' · '+AR_T('TOTALE')+' '+scoreFmt(arkPoints(r));
 arkLine(base);
 if(!coOn)return;
 arkSync().then(async s=>{
  if(!s||s.m>s.sm){arkLine(base+' · '+AR_T('VERRÀ SALVATO PIÙ TARDI'));return}
  try{const rank=await arkRank(arkPoints(s));arkLine(base+' · '+AR_T('CLASSIFICA ARENA')+' '+AR_T('POSIZIONE')+' '+scoreFmt(rank))}catch(e){}
 });
}
if(typeof arEnterPhase==='function'){
 const ep=arEnterPhase;
 arEnterPhase=function(g,ph){
  const before=g&&g.phase,out=ep.apply(this,arguments);
  if(g&&before!==ph){
   if(ph==='C'||ph==='P'){g.arkPlayed=true;g.arkDone=false;arkLine('')}
   if(ph==='L'){g.arkPlayed=false;arkLine('')}
   // gli ultimi abbattimenti possono arrivare dalla rete un attimo dopo: si aspetta un secondo e mezzo
   if(ph==='E'&&before==='P'&&g.arkPlayed){arkLine('…');const t=typeof setTimeout==='function'?setTimeout:f=>f();t(()=>arkMatchEnd(g),1500)}
  }
  return out;
 };
}
// all'avvio: se ci sono sfide non ancora inviate, partono
if(typeof coOn!=='undefined'&&coOn&&typeof setTimeout==='function')setTimeout(()=>{const r=arkLoad();if(r&&r.m>r.sm)arkSync()},4000);

// traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["ARENA ONLINE","ONLINE ARENA","ARÈNE EN LIGNE","ARENA ONLINE","ОНЛАЙН-АРЕНА","在线竞技场","オンラインアリーナ"],
  ["I PRIMI 100 PILOTI DELL’ARENA","TOP 100 ARENA PILOTS","LES 100 MEILLEURS PILOTES DE L’ARÈNE","LOS 100 MEJORES PILOTOS DE LA ARENA","ТОП-100 ПИЛОТОВ АРЕНЫ","竞技场前 100 名飞行员","アリーナ上位100人のパイロット"],
  ["Classifica delle sfide online: 100 punti per abbattimento, 500 per ogni vittoria, 50 per ogni sfida giocata.","Online battle ranking: 100 points per kill, 500 per win, 50 for every battle played.","Classement des défis en ligne : 100 points par victoire aérienne, 500 par défi gagné, 50 par défi joué.","Clasificación de los desafíos online: 100 puntos por derribo, 500 por victoria, 50 por cada desafío jugado.","Рейтинг онлайн-битв: 100 очков за сбитого, 500 за победу, 50 за каждую сыгранную битву.","在线对战排名：每击落一架得 100 分，每场胜利得 500 分，每参加一场得 50 分。","オンライン対戦ランキング：撃墜1機100点、勝利500点、参加1回50点。"],
  ["VITTORIE · ABBATTIMENTI","WINS · KILLS","VICTOIRES · ABATTUS","VICTORIAS · DERRIBOS","ПОБЕДЫ · СБИТО","胜场 · 击落","勝利 · 撃墜"],
  ["Nessuna sfida ancora: gioca una SFIDA ONLINE per entrare nella classifica dell’arena.","No battles yet: play an ONLINE BATTLE to enter the arena ranking.","Aucun défi pour l’instant : joue un DÉFI EN LIGNE pour entrer dans le classement de l’arène.","Aún no hay desafíos: juega un DESAFÍO ONLINE para entrar en la clasificación de la arena.","Битв пока нет: сыграй ОНЛАЙН-БИТВУ, чтобы попасть в рейтинг арены.","还没有对战：参加一场在线对战即可进入竞技场排名。","まだ対戦がありません：オンライン対戦をプレイしてアリーナランキングに入ろう。"],
  ["SFIDA NON VALIDA PER LA CLASSIFICA: SERVONO ALMENO 2 PILOTI","NOT VALID FOR THE RANKING: AT LEAST 2 PILOTS NEEDED","NON VALABLE POUR LE CLASSEMENT : IL FAUT AU MOINS 2 PILOTES","NO VÁLIDO PARA LA CLASIFICACIÓN: SE NECESITAN AL MENOS 2 PILOTOS","НЕ ЗАСЧИТАНО В РЕЙТИНГ: НУЖНО МИНИМУМ 2 ПИЛОТА","不计入排名：至少需要 2 名飞行员","ランキング対象外：2人以上のパイロットが必要です"],
  ["CREA IL PILOTA PER ENTRARE NELLA CLASSIFICA DELL’ARENA","CREATE YOUR PILOT TO ENTER THE ARENA RANKING","CRÉE TON PILOTE POUR ENTRER DANS LE CLASSEMENT DE L’ARÈNE","CREA TU PILOTO PARA ENTRAR EN LA CLASIFICACIÓN DE LA ARENA","СОЗДАЙ ПИЛОТА, ЧТОБЫ ПОПАСТЬ В РЕЙТИНГ АРЕНЫ","创建飞行员以进入竞技场排名","アリーナランキングに入るにはパイロットを作成してください"],
  ["PUNTI ARENA","ARENA POINTS","POINTS D’ARÈNE","PUNTOS DE ARENA","ОЧКИ АРЕНЫ","竞技场积分","アリーナポイント"],
  ["TOTALE","TOTAL","TOTAL","TOTAL","ВСЕГО","总计","合計"],
  ["CLASSIFICA ARENA","ARENA RANKING","CLASSEMENT DE L’ARÈNE","CLASIFICACIÓN DE LA ARENA","РЕЙТИНГ АРЕНЫ","竞技场排名","アリーナランキング"],
  ["POSIZIONE","POSITION","POSITION","POSICIÓN","МЕСТО","名次","順位"],
  ["VERRÀ SALVATO PIÙ TARDI","WILL BE SAVED LATER","SERA ENREGISTRÉ PLUS TARD","SE GUARDARÁ MÁS TARDE","БУДЕТ СОХРАНЕНО ПОЗЖЕ","稍后保存","後で保存されます"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
 if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)try{i18nApply()}catch(e){}
}
