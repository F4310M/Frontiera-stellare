// Conex — ABBANDONA MISSIONE: RIPRENDI PIÙ TARDI o CHIUDI LA PARTITA (2026-11-05).
// Dalla pausa, ABBANDONA MISSIONE apre una scelta:
// - RIPRENDI IN UN ALTRO MOMENTO: la partita resta salvata (pianeta e fase della missione, crediti, vite,
//   potenziamenti, punti). Nella home compaiono RIPRENDI PARTITA e NUOVA PARTITA.
//   RIPRENDI PARTITA riparte dall'inizio della fase interrotta (spazio o terra) dello stesso pianeta.
// - CHIUDI LA PARTITA: tutti i progressi si perdono; il punteggio attuale va in classifica
//   (se rientra nei primi 10.000) e si riparte dal primo pianeta.
// Salvataggio in localStorage stellarPartitaSalvata (anche nel backup del profilo).
// Va caricato dopo ricomincia.js.

const SAVE_KEY='stellarPartitaSalvata';
function saveLoad(){
 try{const s=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return s&&typeof s.code==='string'&&(s.fase===1||s.fase===2)?s:null}catch(e){return null}
}
function saveClear(){try{localStorage.removeItem(SAVE_KEY)}catch(e){}saveHome()}
function savePlanetIndex(s){return s&&typeof planets!=='undefined'?planets.findIndex(p=>p&&p.code===s.code):-1}

// ---- RIPRENDI IN UN ALTRO MOMENTO
function saveForLater(){
 const inGround=typeof state!=='undefined'&&state==='platform'&&typeof pf!=='undefined'&&pf&&pf.p;
 const p=inGround?pf.p:(typeof planets!=='undefined'?planets[selected]:null);
 if(p){
  const s={code:p.code,name:p.name,fase:inGround?2:1,s:Math.round(typeof score==='number'?score:0),d:new Date().toISOString()};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(s))}catch(e){}
 }
 show('abandonOverlay',false);
 if(typeof abort==='function')abort();
 saveHome();
 if(typeof profToast==='function')profToast('PARTITA SALVATA · RIPRENDILA DALLA HOME QUANDO VUOI');
}
function saveResume(){
 const s=saveLoad();if(!s)return;
 const i=savePlanetIndex(s);
 if(i<0||(typeof mapPlayable==='function'&&!mapPlayable(planets[i]))){saveClear();return}
 saveClear();
 if(typeof selectPlanet==='function')selectPlanet(i);else selected=i;
 if(typeof sfx==='function')try{sfx('ui')}catch(e){}
 if(s.fase===2&&typeof startPlatform==='function'){
  phaseOneComplete=true;
  if(typeof enterGameFullscreen==='function')enterGameFullscreen();
  startPlatform();
 }else if(typeof beginWarp==='function')beginWarp();
}

// ---- CHIUDI LA PARTITA: punteggio in classifica, poi si riparte da zero
let closeBusy=false;
async function closeRun(){
 if(closeBusy)return;closeBusy=true;
 show('abandonOverlay',false);show('newGameOverlay',false);
 if(typeof state!=='undefined'&&state!=='map'&&typeof abort==='function')abort();
 const pts=Math.round(typeof score==='number'?score:0),n=typeof recName==='function'?recName():'';
 const god=typeof godMode!=='undefined'&&godMode;
 let msg='PARTITA CHIUSA · SI RIPARTE DAL PRIMO PIANETA';
 if(pts>0&&!god){
  if(typeof profToast==='function')profToast('SALVATAGGIO DEL PUNTEGGIO IN CLASSIFICA…');
  if(typeof myAdd==='function')myAdd(pts);
  if(n&&typeof boardAdd==='function')boardAdd(n,pts);
  if(typeof coOn!=='undefined'&&coOn&&n){
   try{
    if(typeof recQ!=='undefined')await recQ.catch(()=>{});
    const rank=await coRank(pts);
    let saved=false;
    if(rank<=WORLD_SIZE||(typeof recLoad==='function'&&recLoad())){
     if(typeof recWrite==='function'){const id=await recWrite(n,pts);if(id){coMyId=id;saved=true}}
     else{coMyId=await coSend({n,s:pts,d:new Date().toISOString().slice(0,10)});saved=true}
    }
    msg=saved&&rank<=WORLD_SIZE?'PARTITA CHIUSA · CLASSIFICA MONDIALE · POSIZIONE '+scoreFmt(rank):'PARTITA CHIUSA · FUORI DAI PRIMI 10.000';
   }catch(e){
    if(typeof coPending==='function')coPendingSave(coPending().concat([{n,s:pts,d:new Date().toISOString().slice(0,10)}]));
    msg='PARTITA CHIUSA · OFFLINE: IL PUNTEGGIO VERRÀ INVIATO PIÙ TARDI';
   }
  }
 }
 if(typeof gameRestart==='function')gameRestart();
 saveClear();
 if(typeof coCache!=='undefined')coCache=null;
 if(typeof mapMeCache!=='undefined')mapMeCache={s:-1,rank:0,t:0};
 if(typeof mapBoardTick==='function')setTimeout(mapBoardTick,300);
 if(typeof profToast==='function')setTimeout(()=>profToast(msg),400);
 closeBusy=false;
}

// ---- finestre
function saveBuild(){
 if(typeof document==='undefined'||!document.createElement||!document.body||!document.body.appendChild)return;
 const I=n=>typeof ico==='function'?ico(n):'';
 if(!$('abandonOverlay')){
  const o=document.createElement('section');o.id='abandonOverlay';o.className='overlay hidden';o.setAttribute('aria-label','ABBANDONA MISSIONE');
  o.innerHTML='<div class="brief-card abandon-card"><p class="eyebrow">ABBANDONA MISSIONE</p><h2>COSA VUOI FARE?</h2>'+
   '<button id="abandonLater" class="abandon-opt later" type="button"><b>'+I('save')+'</b><span><strong>RIPRENDI PARTITA IN UN ALTRO MOMENTO</strong><small>I progressi restano salvati. Nella home troverai RIPRENDI PARTITA o NUOVA PARTITA.</small></span></button>'+
   '<button id="abandonClose" class="abandon-opt close" type="button"><b>'+I('close')+'</b><span><strong>CHIUDI PARTITA</strong><small>Tutti i progressi verranno persi e il punteggio attuale verrà salvato in classifica (se rientri nei primi 10.000).</small></span></button>'+
   '<button id="abandonBack" class="text-btn" type="button">TORNA ALLA PAUSA</button></div>';
  document.body.appendChild(o);
  $('abandonLater').onclick=saveForLater;
  $('abandonClose').onclick=()=>closeRun();
  $('abandonBack').onclick=()=>{show('abandonOverlay',false);show('pauseOverlay',true)};
 }
 if(!$('newGameOverlay')){
  const o=document.createElement('section');o.id='newGameOverlay';o.className='overlay hidden';o.setAttribute('aria-label','NUOVA PARTITA');
  o.innerHTML='<div class="brief-card compact restart-card"><p class="eyebrow">NUOVA PARTITA</p><h2>CHIUDERE LA PARTITA?</h2>'+
   '<p>Tutti i progressi verranno persi e il punteggio attuale verrà salvato in classifica (se rientri nei primi 10.000).</p>'+
   '<button id="newGameYes" class="launch-btn restart-yes"><span>SÌ, NUOVA PARTITA</span><b>'+I('check')+'</b></button>'+
   '<button id="newGameNo" class="text-btn">ANNULLA</button></div>';
  document.body.appendChild(o);
  $('newGameYes').onclick=()=>closeRun();
  $('newGameNo').onclick=()=>show('newGameOverlay',false);
 }
 // pausa: ABBANDONA MISSIONE apre la scelta
 const ab=$('abortBtn');
 if(ab)ab.onclick=()=>{show('pauseOverlay',false);show('abandonOverlay',true);if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
 // home: riquadro della partita salvata, sopra INIZIA LA MISSIONE
 const launch=$('launchBtn');
 if(launch&&launch.parentNode&&!$('saveBox')){
  const b=document.createElement('div');b.id='saveBox';b.className='save-box hidden';
  b.innerHTML='<p class="save-box-label">'+I('save')+' PARTITA SALVATA</p><p id="saveBoxInfo" class="save-box-info"></p>'+
   '<button id="saveResumeBtn" class="launch-btn save-resume"><span>RIPRENDI PARTITA</span><b>'+I('play')+'</b></button>'+
   '<button id="saveNewBtn" class="save-new" type="button">NUOVA PARTITA</button>';
  launch.parentNode.insertBefore(b,launch);
  $('saveResumeBtn').onclick=saveResume;
  $('saveNewBtn').onclick=()=>{show('newGameOverlay',true);if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
 }
 saveHome();
 // all'avvio la mappa mostra il pianeta della partita salvata
 const s=saveLoad(),i=savePlanetIndex(s);
 if(s&&i>=0&&typeof selectPlanet==='function'&&typeof state!=='undefined'&&state==='map'){try{selectPlanet(i)}catch(e){}}
}
function saveHome(){
 const b=typeof $==='function'?$('saveBox'):null;if(!b)return;
 const s=saveLoad(),on=!!s;
 b.classList.toggle('hidden',!on);
 if(typeof document!=='undefined'&&document.body&&document.body.classList)document.body.classList.toggle('has-save',on);
 if(on){
  const info=$('saveBoxInfo');
  if(info)info.textContent=(s.name||s.code)+' · '+(s.fase===2?'FASE 2 · A TERRA':'FASE 1 · NELLO SPAZIO')+' · PUNTI '+(typeof scoreFmt==='function'?scoreFmt(s.s||0):s.s||0);
 }
}

// ---- una nuova missione dalla mappa (o la fine del gioco) sostituisce la partita salvata
if(typeof beginWarp==='function'){const bw=beginWarp;beginWarp=function(){const st=typeof state!=='undefined'?state:'';const r=bw.apply(this,arguments);if(typeof state!=='undefined'&&state!==st)saveClear();return r}}
if(typeof gameRestart==='function'){const gr=gameRestart;gameRestart=function(){const r=gr.apply(this,arguments);saveClear();return r}}
if(typeof viteGameOver==='function'){const vg=viteGameOver;viteGameOver=function(){saveClear();return vg.apply(this,arguments)}}

// ---- backup del profilo
if(typeof PROF_PROGRESS!=='undefined'&&Array.isArray(PROF_PROGRESS)&&!PROF_PROGRESS.includes(SAVE_KEY))PROF_PROGRESS.push(SAVE_KEY);

// ---- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["COSA VUOI FARE?","WHAT DO YOU WANT TO DO?","QUE VEUX-TU FAIRE ?","¿QUÉ QUIERES HACER?","ЧТО БУДЕШЬ ДЕЛАТЬ?","你想怎么做？","どうする？"],
  ["RIPRENDI PARTITA IN UN ALTRO MOMENTO","RESUME THE GAME ANOTHER TIME","REPRENDRE LA PARTIE PLUS TARD","REANUDAR LA PARTIDA EN OTRO MOMENTO","ПРОДОЛЖИТЬ ИГРУ ПОЗЖЕ","稍后继续游戏","後でゲームを再開"],
  ["I progressi restano salvati. Nella home troverai RIPRENDI PARTITA o NUOVA PARTITA.","Your progress stays saved. On the home screen you will find RESUME GAME or NEW GAME.","Ta progression reste sauvegardée. Sur l’accueil tu trouveras REPRENDRE LA PARTIE ou NOUVELLE PARTIE.","Tu progreso queda guardado. En el inicio encontrarás REANUDAR PARTIDA o NUEVA PARTIDA.","Прогресс сохранится. На главном экране будут ПРОДОЛЖИТЬ ИГРУ и НОВАЯ ИГРА.","进度将被保存。主页上会出现「继续游戏」或「新游戏」。","進行状況は保存されます。ホームに「ゲームを再開」と「新しいゲーム」が表示されます。"],
  ["CHIUDI PARTITA","CLOSE THE GAME","FERMER LA PARTIE","CERRAR LA PARTIDA","ЗАВЕРШИТЬ ИГРУ","结束游戏","ゲームを終了"],
  ["Tutti i progressi verranno persi e il punteggio attuale verrà salvato in classifica (se rientri nei primi 10.000).","All progress will be lost and your current score will be saved to the leaderboard (if you make the top 10,000).","Toute la progression sera perdue et ton score actuel sera enregistré au classement (si tu es dans les 10 000 premiers).","Se perderá todo el progreso y tu puntuación actual se guardará en la clasificación (si entras entre los 10.000 primeros).","Весь прогресс будет потерян, а текущий счёт попадёт в рейтинг (если ты в первых 10 000).","所有进度将丢失，当前分数将存入排行榜（若进入前 10,000 名）。","進行状況はすべて失われ、現在のスコアはランキングに保存されます（上位10,000位以内の場合）。"],
  ["TORNA ALLA PAUSA","BACK TO PAUSE","RETOUR À LA PAUSE","VOLVER A LA PAUSA","НАЗАД К ПАУЗЕ","返回暂停","ポーズに戻る"],
  ["CHIUDERE LA PARTITA?","CLOSE THE GAME?","FERMER LA PARTIE ?","¿CERRAR LA PARTIDA?","ЗАВЕРШИТЬ ИГРУ?","结束游戏？","ゲームを終了する？"],
  ["SÌ, NUOVA PARTITA","YES, NEW GAME","OUI, NOUVELLE PARTIE","SÍ, NUEVA PARTIDA","ДА, НОВАЯ ИГРА","是，新游戏","はい、新しいゲーム"],
  ["PARTITA SALVATA · RIPRENDILA DALLA HOME QUANDO VUOI","GAME SAVED · RESUME IT FROM THE HOME SCREEN WHENEVER YOU WANT","PARTIE SAUVEGARDÉE · REPRENDS-LA DEPUIS L’ACCUEIL QUAND TU VEUX","PARTIDA GUARDADA · REANÚDALA DESDE EL INICIO CUANDO QUIERAS","ИГРА СОХРАНЕНА · ПРОДОЛЖИ С ГЛАВНОГО ЭКРАНА, КОГДА ЗАХОЧЕШЬ","游戏已保存 · 随时可从主页继续","ゲームを保存 · いつでもホームから再開できます"],
  ["PARTITA SALVATA","GAME SAVED","PARTIE SAUVEGARDÉE","PARTIDA GUARDADA","ИГРА СОХРАНЕНА","游戏已保存","保存済みゲーム"],
  ["RIPRENDI PARTITA","RESUME GAME","REPRENDRE LA PARTIE","REANUDAR PARTIDA","ПРОДОЛЖИТЬ ИГРУ","继续游戏","ゲームを再開"],
  ["FASE 1 · NELLO SPAZIO","PHASE 1 · IN SPACE","PHASE 1 · DANS L’ESPACE","FASE 1 · EN EL ESPACIO","ФАЗА 1 · В КОСМОСЕ","第 1 阶段 · 太空","フェーズ1 · 宇宙"],
  ["FASE 2 · A TERRA","PHASE 2 · ON THE GROUND","PHASE 2 · AU SOL","FASE 2 · EN TIERRA","ФАЗА 2 · НА ЗЕМЛЕ","第 2 阶段 · 地面","フェーズ2 · 地上"],
  ["SALVATAGGIO DEL PUNTEGGIO IN CLASSIFICA…","SAVING YOUR SCORE TO THE LEADERBOARD…","ENREGISTREMENT DU SCORE AU CLASSEMENT…","GUARDANDO LA PUNTUACIÓN EN LA CLASIFICACIÓN…","СОХРАНЕНИЕ СЧЁТА В РЕЙТИНГЕ…","正在把分数存入排行榜…","スコアをランキングに保存中…"],
  ["PARTITA CHIUSA · SI RIPARTE DAL PRIMO PIANETA","GAME CLOSED · STARTING AGAIN FROM THE FIRST PLANET","PARTIE FERMÉE · RETOUR AU PREMIER PLANÈTE","PARTIDA CERRADA · SE EMPIEZA DESDE EL PRIMER PLANETA","ИГРА ЗАВЕРШЕНА · СНОВА С ПЕРВОЙ ПЛАНЕТЫ","游戏已结束 · 从第一颗星球重新开始","ゲーム終了 · 最初の惑星から再スタート"],
  ["PARTITA CHIUSA · OFFLINE: IL PUNTEGGIO VERRÀ INVIATO PIÙ TARDI","GAME CLOSED · OFFLINE: THE SCORE WILL BE SENT LATER","PARTIE FERMÉE · HORS LIGNE : LE SCORE SERA ENVOYÉ PLUS TARD","PARTIDA CERRADA · SIN CONEXIÓN: LA PUNTUACIÓN SE ENVIARÁ MÁS TARDE","ИГРА ЗАВЕРШЕНА · ОФЛАЙН: СЧЁТ ОТПРАВИТСЯ ПОЗЖЕ","游戏已结束 · 离线：分数稍后发送","ゲーム終了 · オフライン：スコアは後で送信"],
  ["PARTITA CHIUSA","GAME CLOSED","PARTIE FERMÉE","PARTIDA CERRADA","ИГРА ЗАВЕРШЕНА","游戏已结束","ゲーム終了"],
  ["TU N° ","YOU #","TOI N° ","TÚ N.º ","ТЫ № ","你 #","あなた #"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function'){i18nBuild();if(typeof i18nApply==='function')i18nApply()}
}
saveBuild();
