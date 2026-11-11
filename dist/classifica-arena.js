// Conex — CLASSIFICA ARENA (2026-11-08): il secondo ranking, quello delle battaglie online.
// Nella classifica la scheda IL TUO MIGLIOR RECORD lascia il posto a ONLINE SCORE (2026-11-09, prima ARENA ONLINE):
// MONDO = punti della campagna, ONLINE SCORE = punti sommati di tutte le sfide online (arena.js).
// Punti arena: 100 per abbattimento, 500 per ogni sfida vinta, 50 per ogni sfida giocata.
// Conta solo una sfida vera: giocata online (Realtime Database) e finita con almeno 2 piloti.
// Una riga per pilota nella raccolta Firestore `arena` (stesse regole di classifica: chiave segreta
// che cambia a ogni aggiornamento, sulla riga resta solo la sua impronta h). I totali restano
// anche in questo browser (stellarArena) e partono appena la rete risponde.

const ARK={KEY:'stellarArena',kill:100,win:500,play:50,maxKills:15,maxBatch:5,size:100};
function arkPoints(t){return ARK.kill*(t.b||0)+ARK.win*(t.v||0)+ARK.play*(t.m||0)}
// stellarArena = {n, v, b, m (totali di questo browser, per mostrarli subito), pm, pv, pb (sfide non ancora inviate),
//   id, k (vecchia riga con chiave segreta, da chiudere passando i totali alla riga nuova), d}
function arkLoad(){
 try{const r=JSON.parse(localStorage.getItem(ARK.KEY)||'null');
  if(r&&typeof r.n==='string'&&[r.v,r.b,r.m].every(x=>Number.isInteger(x)&&x>=0)){
   const o=Object.assign({id:'',k:'',sm:0,sv:0,sb:0},r);
   if(!Number.isInteger(o.pm)){o.pm=Math.max(0,o.m-o.sm);o.pv=Math.max(0,o.v-o.sv);o.pb=Math.max(0,o.b-o.sb)}   // formato di prima
   o.pv=Number.isInteger(o.pv)?Math.max(0,o.pv):0;o.pb=Number.isInteger(o.pb)?Math.max(0,o.pb):0;o.pm=Math.max(0,o.pm);
   return o;
  }
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
 let r=arkLoad();if(!r||r.n!==n)r={n,id:'',k:'',v:0,b:0,m:0,pm:0,pv:0,pb:0};
 r.m++;r.v+=res.v;r.b+=res.b;r.pm++;r.pv+=res.v;r.pb+=res.b;r.d=new Date().toISOString().slice(0,10);
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
function arkFields(t,extra){
 const f={n:{stringValue:t.n},p:{integerValue:String(arkPoints(t))},v:{integerValue:String(t.v)},b:{integerValue:String(t.b)},m:{integerValue:String(t.m)}},a=arkMini(t.n);
 if(a)f.a={stringValue:a};
 for(const k in extra)f[k]={stringValue:extra[k]};
 return f;
}
let arkQ=Promise.resolve(),arkCache=null,arkCacheT=0,arkMyId='',arkTimer=0;
const arkNum=(d,k)=>Number(d&&d.fields&&d.fields[k]&&d.fields[k].integerValue)||0;
const arkWait=30000;   // le regole vogliono almeno 30 secondi per ogni sfida aggiunta
// riprova più tardi (troppo presto per le regole, oppure rete giù)
function arkLater(ms){if(arkTimer||typeof setTimeout!=='function')return;arkTimer=setTimeout(()=>{arkTimer=0;arkSync()},ms)}
// Porta online le sfide non ancora inviate: la riga del pilota ha id = nome in minuscolo.
// La prima volta chiude la vecchia riga (con chiave segreta) e ne porta i totali nella nuova.
function arkSync(){
 arkQ=arkQ.then(async()=>{
  let r=arkLoad();
  if(!coOn||!r||typeof CX==='undefined'||!CX.on)return r;
  const own=await CX.nomeMio(r.n);
  if(own==='altrui'){if(typeof recAltrui==='function')recAltrui(r.n);return r}
  if(own!=='mio'){arkLater(60000);return r}
  const key=CX.chiaveNome(r.n);
  for(let i=0;i<8;i++){
   r=arkLoad();if(!r||!(r.pm>0))break;
   let doc=await CX.leggi('arena',key);
   if(!doc&&r.id&&r.k&&r.id!==key){
    // la vecchia riga di questo pilota: si chiude e i suoi totali passano nella riga nuova
    const old=await CX.leggi('arena',r.id).catch(()=>null),f=old&&old.fields;
    if(f&&f.n&&f.n.stringValue===r.n&&!f.x&&!f.t){
     try{
      await CX.commit([{col:'arena',id:r.id,fields:{n:{stringValue:r.n},p:{integerValue:'0'},x:{stringValue:key},k:{stringValue:r.k}},tempo:false},
                       {col:'arena',id:key,fields:arkFields({n:r.n,v:arkNum(old,'v'),b:arkNum(old,'b'),m:arkNum(old,'m')},{o:r.id}),nuovo:true}]);
      // le sfide già inviate alla vecchia riga sono nel totale portato: restano da inviare solo quelle dopo
      Object.assign(r,{pm:Math.max(0,r.m-arkNum(old,'m')),pv:Math.max(0,r.v-arkNum(old,'v')),pb:Math.max(0,r.b-arkNum(old,'b'))});
     }catch(e){if(!/firestore 4\d\d/.test(String(e&&e.message)))throw e}
    }
    r.id='';r.k='';arkSave(r);arkMyId=key;arkCache=null;arkLater(arkWait+5000);
    continue;
   }
   const dm0=Math.min(ARK.maxBatch,r.pm);
   if(!doc){
    const t={n:r.n,m:dm0,v:Math.min(dm0,r.pv),b:Math.min(ARK.maxKills*dm0,r.pb)};
    try{await CX.commit([{col:'arena',id:key,fields:arkFields(t),nuovo:true}])}
    catch(e){if(/firestore 4\d\d/.test(String(e&&e.message))){arkLater(arkWait);break}throw e}   // creata intanto da un altro PC: si riprova
    Object.assign(r,{pm:r.pm-t.m,pv:r.pv-t.v,pb:r.pb-t.b,id:'',k:''});arkSave(r);arkMyId=key;arkCache=null;
    if(r.pm>0)arkLater(arkWait+5000);
    break;
   }
   // quante sfide si possono aggiungere adesso (30 secondi ciascuna dall'ultima scrittura)
   const last=Date.parse(doc.fields&&doc.fields.t&&doc.fields.t.timestampValue||'')||0;
   const dm=Math.min(dm0,Math.floor((Date.now()-last-3000)/arkWait));
   if(!(dm>=1)){arkLater(Math.max(5000,last+arkWait+3000-Date.now()));break}
   const cur={n:r.n,m:arkNum(doc,'m'),v:arkNum(doc,'v'),b:arkNum(doc,'b')};
   const t={n:r.n,m:cur.m+dm,v:cur.v+Math.min(dm,r.pv),b:cur.b+Math.min(ARK.maxKills*dm,r.pb)};
   try{await CX.commit([{col:'arena',id:key,fields:arkFields(t),nuovo:false,maschera:true}])}
   catch(e){if(/firestore 4\d\d/.test(String(e&&e.message))){arkLater(arkWait);break}throw e}
   Object.assign(r,{pm:r.pm-dm,pv:r.pv-(t.v-cur.v),pb:r.pb-(t.b-cur.b)});arkSave(r);arkMyId=key;arkCache=null;
   if(r.pm>0)arkLater(arkWait+5000);
   break;
  }
  return arkLoad();
 }).catch(()=>{arkLater(60000);return arkLoad()});
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
function arkIsMe(r){const l=arkLoad();return !!(arkMyId&&r.id===arkMyId)||!!(l&&l.id&&r.id===l.id)||!!(l&&typeof CX!=='undefined'&&r.id===CX.chiaveNome(l.n))}
function arkRows(b){
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 return '<div class="board-row head"><span>POS.</span><span>NOME</span><span>PUNTI</span><span>VITTORIE · ABBATTIMENTI</span></div>'+
  b.map((r,i)=>{const mine=arkIsMe(r);
   return `<div class="board-row${mine?' me':''}${i<3?' podium':''}"><span>${boardRank(i+1)}</span><span class="board-name">${boardName(r,esc(r.n))}</span><span>${scoreFmt(r.p)}</span><span>${r.v} · ${r.b}</span></div>`}).join('');
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

// ---- schede della classifica: MONDO | ONLINE SCORE
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
   const sub=$('boardSub');if(sub)sub.textContent='I PRIMI 100 PILOTI ONLINE';
   const note=$('boardWhere');if(note)note.textContent='Online Score: i punti si fanno solo nelle sfide online con almeno 2 piloti e si sommano partita dopo partita. 100 punti per abbattimento, 500 per ogni vittoria, 50 per ogni sfida giocata.';
  }
  return r;
 };
 if(typeof document!=='undefined'&&document.querySelector){
  const t=document.querySelector('#boardTabs button[data-view="locale"]');
  if(t&&coOn){t.dataset.view='arena';t.innerHTML=(typeof ico==='function'?ico('laser')+' ':'')+'ONLINE SCORE'}
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
  if(!s||s.pm>0){arkLine(base+' · '+AR_T('VERRÀ SALVATO PIÙ TARDI'));return}
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
if(typeof coOn!=='undefined'&&coOn&&typeof setTimeout==='function')setTimeout(()=>{const r=arkLoad();if(r&&r.pm>0)arkSync()},4000);

// traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["ONLINE SCORE","ONLINE SCORE","SCORE EN LIGNE","PUNTUACIÓN ONLINE","ОНЛАЙН-ОЧКИ","在线积分","オンラインスコア"],
  ["I PRIMI 100 PILOTI ONLINE","TOP 100 ONLINE PILOTS","LES 100 MEILLEURS PILOTES EN LIGNE","LOS 100 MEJORES PILOTOS ONLINE","ТОП-100 ОНЛАЙН-ПИЛОТОВ","在线前 100 名飞行员","オンライン上位100人のパイロット"],
  ["Online Score: i punti si fanno solo nelle sfide online con almeno 2 piloti e si sommano partita dopo partita. 100 punti per abbattimento, 500 per ogni vittoria, 50 per ogni sfida giocata.","Online Score: points are earned only in online battles with at least 2 pilots and add up match after match. 100 points per kill, 500 per win, 50 for every battle played.","Score en ligne : les points se gagnent seulement dans les défis en ligne avec au moins 2 pilotes et s’additionnent d’un match à l’autre. 100 points par abattu, 500 par victoire, 50 par défi joué.","Puntuación online: los puntos solo se consiguen en desafíos online con al menos 2 pilotos y se suman partida tras partida. 100 puntos por derribo, 500 por victoria, 50 por cada desafío jugado.","Онлайн-очки: очки даются только в онлайн-битвах минимум с 2 пилотами и суммируются от матча к матчу. 100 очков за сбитого, 500 за победу, 50 за каждую сыгранную битву.","在线积分：只有在至少 2 名飞行员的在线对战中才能得分，每场累计。每击落一架 100 分，每场胜利 500 分，每参加一场 50 分。","オンラインスコア：ポイントは2人以上のオンライン対戦でのみ獲得でき、試合ごとに加算されます。撃墜1機100点、勝利500点、参加1回50点。"],
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
