// Conex — CLASSIFICHE: % DI GIOCO, PERSONAL SCORE, 3 RECORD MONDIALI (2026-11-12, chiesto da Fabio).
// 1) Accanto ai punti c'è la percentuale di gioco completata della partita: 5 pianeti + OMEGA,
//    2 fasi ciascuno (spazio e terra) = 12 passi. Se il gioco è già stato finito e si ricomincia,
//    si scrive "45% ×2" (×N = quante volte stai giocando la campagna: finita una volta, la seconda è ×2).
// 2) PERSONAL SCORE: i 100 migliori punteggi del pilota, solo nel file di salvataggio (stellarMieiRecord),
//    nella pagina CLASSIFICA accanto a MONDO e ONLINE SCORE. Una partita = una riga che si aggiorna.
// 3) MONDO: al massimo 3 righe per pilota (i suoi 3 migliori). Una partita nuova entra nella classifica
//    mondiale solo quando supera il terzo record del pilota; allora la riga più bassa viene cancellata.
//    All'avvio si puliscono le righe in più rimaste dalle partite di prima.
//    (Le regole di Firebase devono permettere al proprietario del nome di cancellare le sue righe
//    e i campi g e r: firestore.rules aggiornato lo stesso giorno.)
// 4) Nel file .sfsave vanno anche ciclo, classifica locale, punteggi in attesa e righe da completare.
// Va caricato dopo record.js, classifica-arena.js, classifica-pagina.js e miglior-punteggio.js.

const CP={max:100,mondo:3,passi:12,key:'stellarCiclo'};

// ---------------------------------------------------------------- % di gioco e ciclo N
function cpGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function cpSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
// stellarCiclo = {n: numero della campagna (1 la prima volta), f: 1 se questa campagna è già finita (OMEGA libero)}
function cpCicloLoad(){try{const o=JSON.parse(cpGet(CP.key)||'null');if(o&&Number.isFinite(o.n)&&o.n>=1)return{n:Math.min(999,Math.floor(o.n)),f:o.f?1:0}}catch(e){}return{n:1,f:0}}
function cpCiclo(){
 const c=cpCicloLoad(),omega=cpGet('frontieraOmegaLibero')==='yes';
 let ch=false;
 if(omega&&!c.f){c.f=1;ch=true}                    // campagna finita: la prossima sarà la N+1
 else if(!omega&&c.f){c.n=Math.min(999,c.n+1);c.f=0;ch=true}   // si è ricominciato dopo averla finita
 if(ch||cpGet(CP.key)===null)cpSet(CP.key,JSON.stringify(c));
 return c.n;
}
// missioni nello spazio vinte in questa partita: stellarSpazioVinti = {p: id partita, c: [codici pianeta]}
function cpSpazio(){
 const run=cpGet('stellarPartita')||'';
 try{const o=JSON.parse(cpGet('stellarSpazioVinti')||'null');if(o&&o.p===run&&Array.isArray(o.c))return o.c.filter(x=>typeof x==='string')}catch(e){}
 return [];
}
function cpSpazioVinto(code){
 if(typeof code!=='string'||!code)return;
 const run=typeof myRun==='function'?myRun():(cpGet('stellarPartita')||'');
 const c=cpSpazio();if(!c.includes(code)){c.push(code);cpSet('stellarSpazioVinti',JSON.stringify({p:run,c:c.slice(-20)}))}
}
if(typeof finish==='function'){
 const fi=finish;
 finish=function(win){
  // segnato PRIMA del punteggio, così la riga della partita ha già la % giusta
  try{if(win&&typeof state!=='undefined'&&(state==='orbit'||state==='play')&&typeof planets!=='undefined'&&planets[selected])cpSpazioVinto(planets[selected].code)}catch(e){}
  return fi.apply(this,arguments);
 };
}
function cpLiberati(){return(cpGet('frontieraPianetiLiberati')||'').split(',').filter(Boolean)}
function cpPercento(){
 const base=typeof BASE_PLANETS!=='undefined'&&Array.isArray(BASE_PLANETS)?BASE_PLANETS:null;
 const lib=cpLiberati().filter(c=>!base||base.includes(c));
 let passi=Math.min(5,lib.length)*2;
 // OMEGA appena sconfitto (il segno sul pianeta arriva un attimo dopo la fine della partita)
 const omegaOra=typeof state!=='undefined'&&state==='won'&&typeof pf!=='undefined'&&pf&&pf.p&&pf.p.final;
 const omega=cpGet('frontieraOmegaLibero')==='yes'||!!omegaOra;
 if(omega)passi+=2;
 else{
  // pianeta in corso con la fase nello spazio già vinta (salvataggio all'inizio della fase a terra)
  // + ogni missione nello spazio vinta in questa partita su un pianeta non ancora liberato
  let s=null;try{s=typeof saveLoad==='function'?saveLoad():null}catch(e){}
  const sp=new Set(cpSpazio().filter(c=>!lib.includes(c)));
  if(s&&s.fase===2&&!lib.includes(s.code))sp.add(s.code);
  passi+=sp.size;
 }
 passi=Math.min(CP.passi,passi);
 let g=Math.max(0,Math.min(100,Math.round(passi/CP.passi*100)));
 // nella stessa partita la % non torna indietro (al GAME OVER i pianeti liberati si azzerano prima del punteggio)
 const run=cpGet('stellarPartita')||'';
 if(run){
  let m=null;try{m=JSON.parse(cpGet('stellarPercento')||'null')}catch(e){}
  if(m&&m.p===run&&Number.isFinite(m.g)&&m.g>g)g=Math.min(100,m.g);
  else if(!m||m.p!==run||m.g!==g)cpSet('stellarPercento',JSON.stringify({p:run,g}));
 }
 return g;
}
function cpFmt(g,r){
 if(!Number.isFinite(g))return '—';
 return g+'%'+(Number.isFinite(r)&&r>1?' ×'+r:'');
}

// ---------------------------------------------------------------- PERSONAL SCORE: 100 migliori del pilota
// stellarMieiRecord = [{p: id della partita, s: punti, g: %, r: ciclo, d: data}]
myAdd=function(points){
 const pts=Math.round(points);if(!(pts>0))return;
 const b=myList(),p=myRun(),r=b.find(x=>x.p===p),d=new Date().toISOString().slice(0,10),g=cpPercento(),n=cpCiclo();
 if(r){if(pts>=r.s){r.s=pts;r.d=d;r.r=n}r.g=Math.max(Number.isFinite(r.g)?r.g:0,g)}else b.push({p,s:pts,d,g,r:n});
 b.sort((x,y)=>y.s-x.s);mySave(b.slice(0,CP.max));
};
function cpPersonalRows(){
 const n=recName()||cleanName(cpGet('stellarUltimoNome'))||'—';
 return myList().slice(0,CP.max).map(r=>({n,s:r.s,d:r.d,p:r.p,g:Number.isFinite(r.g)?r.g:undefined,r:Number.isFinite(r.r)?r.r:undefined,a:typeof prof!=='undefined'&&prof&&prof.mini?prof.mini:''}));
}

// ---------------------------------------------------------------- colonna % nelle liste
{
 const cr=coRow;
 coRow=function(doc){
  const r=cr.apply(this,arguments),f=(doc&&doc.fields)||{};
  const g=Number(f.g&&f.g.integerValue),c=Number(f.r&&f.r.integerValue);
  if(Number.isFinite(g)&&g>=0&&g<=100)r.g=g;
  if(Number.isFinite(c)&&c>=1)r.r=c;
  return r;
 };
}
boardRows=function(b,hi){
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 return '<div class="board-row head cp-row"><span>POS.</span><span>NOME</span><span>PUNTI</span><span class="cp-gioco">GIOCO</span><span>DATA</span></div>'+
  b.map((r,i)=>{
   const mine=hi(r,i);
   return `<div class="board-row cp-row${mine?' me':''}${i<3?' podium':''}"><span>${boardRank(i+1)}</span><span class="board-name">${boardName(r,esc(r.n))}</span><span>${scoreFmt(r.s)}</span><span class="cp-gioco">${esc(cpFmt(r.g,r.r))}</span><span>${esc(r.d||'')}</span></div>`;
  }).join('');
};

// ---------------------------------------------------------------- MONDO: g e r sulle righe, massimo 3 per pilota
let cpNoExtra=false;   // regole di Firebase ancora vecchie: si scrive senza g e r
{
 const rf=recFields;
 recFields=function(){
  const f=rf.apply(this,arguments);
  if(!cpNoExtra){f.g={integerValue:String(cpPercento())};f.r={integerValue:String(cpCiclo())}}
  return f;
 };
 // se Firebase rifiuta i campi nuovi si riprova senza (una volta sola per sessione)
 if(typeof CX!=='undefined'&&CX&&typeof CX.commit==='function'){
  const cm=CX.commit;
  CX.commit=async function(ws){
   try{return await cm.apply(this,arguments)}
   catch(e){
    const extra=!cpNoExtra&&Array.isArray(ws)&&ws.some(w=>w&&w.col==='classifica'&&w.fields&&('g' in w.fields||'r' in w.fields));
    if(!extra||!/firestore 403/.test(String(e&&e.message)))throw e;
    cpNoExtra=true;
    const ws2=ws.map(w=>{if(!w||w.col!=='classifica'||!w.fields)return w;const f=Object.assign({},w.fields);delete f.g;delete f.r;return Object.assign({},w,{fields:f})});
    return cm.call(this,ws2);
   }
  };
 }
}
// righe mondiali del pilota, dalla più alta
async function cpMieRighe(n){
 const j=await coReq(':runQuery',{structuredQuery:{from:[{collectionId:'classifica'}],where:{fieldFilter:{field:{fieldPath:'n'},op:'EQUAL',value:{stringValue:n}}},limit:300}});
 return (Array.isArray(j)?j:[]).filter(x=>x&&x.document).map(x=>coRow(x.document)).filter(r=>r.n===n&&Number.isFinite(r.s)).sort((a,b)=>b.s-a.s);
}
// la partita può entrare nella classifica mondiale? (meno di 3 righe, o più punti della terza)
async function cpEntra(n,pts){
 const rows=await cpMieRighe(n);
 return rows.length<CP.mondo||pts>rows[CP.mondo-1].s;
}
// cancella le righe del pilota oltre le 3 migliori (mai quella della partita in corso)
let cpPulendo=false;
async function cpPulisci(n){
 if(cpPulendo||!n||typeof coOn==='undefined'||!coOn)return 0;
 cpPulendo=true;
 try{
  const cur=recLoad(),rows=await cpMieRighe(n);
  const keep=[],via=[];
  for(const r of rows){if(keep.length<CP.mondo||(cur&&cur.id===r.id))keep.push(r);else via.push(r)}
  // con la riga in corso fuori dalle prime 3, resta comunque al massimo 3: si toglie la più bassa delle altre
  while(keep.length>CP.mondo){const i=keep.map((r,k)=>k).reverse().find(k=>!(cur&&keep[k].id===cur.id));if(i===undefined)break;via.push(keep.splice(i,1)[0])}
  if(!via.length)return 0;
  await coReq(':commit',{writes:via.filter(r=>r.ref).map(r=>({delete:r.ref}))});
  if(typeof coCache!=='undefined')coCache=null;
  return via.length;
 }catch(e){return 0}
 finally{cpPulendo=false}
}
{
 const rw=recWrite;
 recWrite=async function(n,pts){
  pts=Math.round(pts);
  const r=recLoad();
  // riga nuova: solo se la partita è tra i 3 migliori record del pilota
  if(!(r&&r.n===n)){
   if(!(await recOwn(n)))return '';
   if(!(await cpEntra(n,pts)))return '';
  }
  const id=await rw.apply(this,arguments);
  if(id&&!(r&&r.n===n))await cpPulisci(n);
  return id;
 };
}
// invio classico (fine partita senza riga, punteggi rimasti in attesa)
if(typeof coSend==='function'){
 const cs=coSend;
 coSend=async function(row){
  if(row&&row.n&&!(await cpEntra(row.n,Math.round(row.s))))return '';
  const id=await cs.apply(this,arguments);
  if(id&&row&&row.n)cpPulisci(row.n);
  return id;
 };
}
// fine partita: se i punti non superano il terzo record mondiale del pilota non si crea nessuna riga
{
 const sub=scoreSubmit;
 scoreSubmit=async function(){
  if(typeof recQ!=='undefined'&&recQ&&recQ.catch)await recQ.catch(()=>{});
  const pts=Math.round(scorePending),inp=$('scoreName'),name=cleanName(inp&&inp.value),r=recLoad();
  if(coOn&&pts>0&&name&&!(r&&r.n===name)){
   let entra=true;try{entra=await cpEntra(name,pts)}catch(e){}
   if(!entra){
    boardAdd(name,pts);cpSet('stellarUltimoNome',name);
    scorePending=0;if(inp)inp.disabled=true;if($('scoreSaveBtn'))$('scoreSaveBtn').disabled=true;
    $('scoreMsg').textContent='NON SUPERA I TUOI 3 RECORD MONDIALI · SALVATO NEL PERSONAL SCORE';
    coView='personale';boardOpen();return;
   }
  }
  return sub.apply(this,arguments);
 };
}
// risultato della missione: messaggio giusto quando la partita non entra (ancora) tra i 3 record mondiali
{
 const rs=recShow;
 recShow=function(o){
  if(o&&typeof o.sub==='string'&&o.sub.includes('VERRÀ SALVATO A FINE PARTITA')&&recName())o=Object.assign({},o,{sub:o.sub.replace('VERRÀ SALVATO A FINE PARTITA','NON ANCORA TRA I TUOI 3 RECORD MONDIALI')});
  return rs.call(this,o);
 };
}
// all'avvio (dopo l'accesso): via le righe in più delle partite di prima
if(typeof setTimeout==='function'&&typeof coOn!=='undefined'&&coOn)setTimeout(async()=>{
 const n=recName();if(!n)return;
 try{if(typeof recOwn==='function'&&!(await recOwn(n)))return}catch(e){return}
 cpPulisci(n);
},6000);

// ---------------------------------------------------------------- scheda PERSONAL SCORE
{
 const br=boardRender;
 boardRender=async function(force=false){
  const list=$('boardList');
  if(coView!=='personale')return br.apply(this,arguments);
  if(list&&list.classList)list.classList.remove('board-arena');
  boardTabs();
  if(!list)return;
  const cur=cpGet(MY_RUN);
  boardShow(list,cpPersonalRows(),r=>!!cur&&r.p===cur,'Nessun punteggio ancora: completa una missione per registrare il tuo primo punteggio.');
 };
 const bt=boardTabs;
 boardTabs=function(){
  const r=bt.apply(this,arguments);
  if(coView==='personale'){
   const sub=$('boardSub');if(sub)sub.textContent='I TUOI 100 MIGLIORI PUNTEGGI';
   const note=$('boardWhere');if(note)note.textContent='Personal Score: i 100 migliori punteggi del tuo pilota, salvati solo nel tuo file di salvataggio. Ogni partita è una riga che si aggiorna a ogni missione. Nella classifica mondiale restano solo i tuoi 3 migliori.';
   const pts=typeof document!=='undefined'&&document.querySelector&&document.querySelector('#boardOverlay .board-note:not(#boardWhere)');if(pts&&pts.classList)pts.classList.remove('hidden');
  }else if(coView==='mondo'){
   const note=$('boardWhere');if(note)note.textContent='La classifica mondiale è condivisa da tutti i giocatori. Per ogni pilota restano i suoi 3 migliori record. GIOCO = percentuale della campagna completata (×2, ×3… se l’hai già finita e la stai rigiocando).';
  }
  return r;
 };
 if(typeof document!=='undefined'&&document.querySelector&&document.createElement){
  const tabs=$('boardTabs');
  if(tabs&&tabs.appendChild&&!tabs.querySelector('button[data-view="personale"]')){
   const b=document.createElement('button');b.dataset.view='personale';
   b.innerHTML=(typeof ico==='function'?ico('trophy')+' ':'')+'PERSONAL SCORE';
   b.onclick=()=>{coView='personale';boardRender()};
   tabs.appendChild(b);
  }
 }
}

// ---------------------------------------------------------------- barra di caricamento 0-100% (2026-11-12)
// MONDO e ONLINE SCORE arrivano dalla rete: mentre si caricano compare la barra con la percentuale
// (la stessa di AGGIORNA), che sale fino a 95% e arriva a 100% quando la lista è pronta.
{
 const br=boardRender;
 let cpLoadId=0;
 boardRender=async function(){
  const bar=$('boardRefresh'),value=$('boardRefreshValue'),fill=$('boardRefreshFill');
  const net=coView==='mondo'||coView==='arena';
  const busy=bar&&bar.classList&&!bar.classList.contains('hidden');
  if(!net||!bar||!value||!fill||busy||typeof requestAnimationFrame!=='function'||typeof performance==='undefined')return br.apply(this,arguments);
  const id=++cpLoadId,start=performance.now();let cur=0,frame=0,shown=false;
  const draw=a=>{cur=Math.round(a);value.textContent=cur+'%';fill.style.width=cur+'%';bar.setAttribute('aria-valuenow',cur)};
  const tick=now=>{
   if(id!==cpLoadId)return;
   if(!shown&&now-start>120){shown=true;show('boardRefresh',true)}
   draw(95*(1-Math.exp(-(now-start)/700)));
   frame=requestAnimationFrame(tick);
  };
  draw(0);frame=requestAnimationFrame(tick);
  try{return await br.apply(this,arguments)}
  finally{
   cancelAnimationFrame(frame);
   if(id===cpLoadId&&shown){
    const from=cur,t0=performance.now();
    await new Promise(res=>{const f=now=>{const k=Math.min(1,(now-t0)/260);draw(from+(100-from)*k);if(k<1)requestAnimationFrame(f);else res()};requestAnimationFrame(f)});
    await new Promise(res=>setTimeout(res,150));
    if(id===cpLoadId)show('boardRefresh',false);
   }
  }
 };
}

// ---------------------------------------------------------------- tutto nel file di salvataggio
if(typeof PROF_PROGRESS!=='undefined'&&Array.isArray(PROF_PROGRESS))
 for(const k of [CP.key,'stellarPercento','stellarSpazioVinti','stellarRecordResto','stellarClassifica','stellarInAttesa','stellarUltimoNome'])if(!PROF_PROGRESS.includes(k))PROF_PROGRESS.push(k);
cpCiclo();
if(typeof setInterval==='function')setInterval(cpCiclo,4000);

// ---------------------------------------------------------------- stile e traduzioni
if(typeof document!=='undefined'&&document.createElement&&document.head){
 const css=document.createElement('style');
 css.textContent='#boardList:not(.board-arena) .board-row.cp-row{grid-template-columns:54px 1fr 110px 100px 120px}'+
  '.board-row.cp-row .cp-gioco{color:#9fe7ff;font-size:11px;text-align:right;white-space:nowrap}'+
  '.board-row.cp-row.head .cp-gioco,.board-row.cp-row.head span:nth-child(4){color:var(--muted);text-align:right}'+
  '.board-row.cp-row span:nth-child(3),.board-row.cp-row span:nth-child(5){text-align:right}'+
  '#boardTabs{flex-wrap:wrap}'+
  '@media(max-width:850px){#boardList:not(.board-arena) .board-row.cp-row{grid-template-columns:30px 1fr 66px 64px;gap:6px;padding:8px 10px}'+
  '#boardList .board-row.cp-row>span:nth-child(5){display:none}#boardList .board-row.cp-row>span.cp-gioco{display:block;font-size:10px}}';
 document.head.appendChild(css);
}
(function(){
 if(typeof I18N_ROWS==='undefined')return;
 const rows=[
  ['PERSONAL SCORE','PERSONAL SCORE','PERSONAL SCORE','PERSONAL SCORE','PERSONAL SCORE','PERSONAL SCORE','PERSONAL SCORE'],
  ['GIOCO','GAME','JEU','JUEGO','ИГРА','进度','進行'],
  ['I TUOI 100 MIGLIORI PUNTEGGI','YOUR 100 BEST SCORES','TES 100 MEILLEURS SCORES','TUS 100 MEJORES PUNTUACIONES','ТВОИ 100 ЛУЧШИХ РЕЗУЛЬТАТОВ','你的 100 个最佳分数','あなたのベストスコア100'],
  ['Nessun punteggio ancora: completa una missione per registrare il tuo primo punteggio.','No scores yet: complete a mission to record your first score.','Aucun score pour l’instant : termine une mission pour enregistrer ton premier score.','Aún no hay puntuaciones: completa una misión para registrar tu primera puntuación.','Пока нет результатов: заверши миссию, чтобы записать первый результат.','还没有分数：完成一次任务来记录你的第一个分数。','まだスコアがありません。ミッションをクリアして最初のスコアを記録しよう。'],
  ['Personal Score: i 100 migliori punteggi del tuo pilota, salvati solo nel tuo file di salvataggio. Ogni partita è una riga che si aggiorna a ogni missione. Nella classifica mondiale restano solo i tuoi 3 migliori.','Personal Score: your pilot’s 100 best scores, saved only in your save file. Each game is one row that updates after every mission. Only your 3 best stay in the world leaderboard.','Personal Score : les 100 meilleurs scores de ton pilote, enregistrés seulement dans ton fichier de sauvegarde. Chaque partie est une ligne mise à jour à chaque mission. Seuls tes 3 meilleurs restent dans le classement mondial.','Personal Score: las 100 mejores puntuaciones de tu piloto, guardadas solo en tu archivo de guardado. Cada partida es una fila que se actualiza en cada misión. En la clasificación mundial solo quedan tus 3 mejores.','Personal Score: 100 лучших результатов твоего пилота, только в твоём файле сохранения. Каждая игра — одна строка, она обновляется после каждой миссии. В мировом рейтинге остаются только твои 3 лучших.','Personal Score：你的飞行员的 100 个最佳分数，只保存在你的存档文件中。每局游戏是一行，每次任务后更新。世界排行榜只保留你最好的 3 个。','Personal Score：パイロットのベストスコア100件。セーブファイルだけに保存されます。1ゲーム1行で、ミッションごとに更新されます。世界ランキングに残るのはベスト3だけです。'],
  ['La classifica mondiale è condivisa da tutti i giocatori. Per ogni pilota restano i suoi 3 migliori record. GIOCO = percentuale della campagna completata (×2, ×3… se l’hai già finita e la stai rigiocando).','The world leaderboard is shared by all players. Each pilot keeps only their 3 best records. GAME = percentage of the campaign completed (×2, ×3… if you already finished it and are playing it again).','Le classement mondial est partagé par tous les joueurs. Chaque pilote garde seulement ses 3 meilleurs records. JEU = pourcentage de la campagne terminé (×2, ×3… si tu l’as déjà finie et que tu la rejoues).','La clasificación mundial la comparten todos los jugadores. Cada piloto conserva solo sus 3 mejores récords. JUEGO = porcentaje de la campaña completado (×2, ×3… si ya la terminaste y la vuelves a jugar).','Мировой рейтинг общий для всех игроков. У каждого пилота остаются только 3 лучших рекорда. ИГРА = процент пройденной кампании (×2, ×3…, если ты уже прошёл её и играешь снова).','世界排行榜由所有玩家共享。每位飞行员只保留最好的 3 个记录。进度 = 战役完成百分比（如果已经通关并重玩，则显示 ×2、×3…）。','世界ランキングは全プレイヤー共通です。各パイロットはベスト3の記録だけが残ります。進行 = キャンペーンの達成率（クリア後に再プレイ中なら ×2、×3…）。'],
  ['NON SUPERA I TUOI 3 RECORD MONDIALI · SALVATO NEL PERSONAL SCORE','DOES NOT BEAT YOUR 3 WORLD RECORDS · SAVED IN PERSONAL SCORE','NE BAT PAS TES 3 RECORDS MONDIAUX · ENREGISTRÉ DANS PERSONAL SCORE','NO SUPERA TUS 3 RÉCORDS MUNDIALES · GUARDADO EN PERSONAL SCORE','НЕ ПРЕВЫШАЕТ ТВОИ 3 МИРОВЫХ РЕКОРДА · СОХРАНЕНО В PERSONAL SCORE','未超过你的 3 个世界纪录 · 已保存到 PERSONAL SCORE','世界記録ベスト3に届かず · PERSONAL SCOREに保存'],
  ['NON ANCORA TRA I TUOI 3 RECORD MONDIALI','NOT YET AMONG YOUR 3 WORLD RECORDS','PAS ENCORE PARMI TES 3 RECORDS MONDIAUX','AÚN NO ESTÁ ENTRE TUS 3 RÉCORDS MUNDIALES','ПОКА НЕ СРЕДИ ТВОИХ 3 МИРОВЫХ РЕКОРДОВ','尚未进入你的 3 个世界纪录','まだ世界記録ベスト3に入っていません']
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 // i18n.js ha già preparato le traduzioni: si rifanno con le righe nuove
 if(typeof i18nBuild==='function')try{i18nBuild();if(typeof i18nApply==='function')i18nApply()}catch(e){}
})();
