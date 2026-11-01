// Stellar Frontier — PUNTEGGIO e CLASSIFICA.
// I punti si accumulano in tutta la partita (nemici, coloni, orbite, colonie liberate) e crescono con la minaccia del pianeta.
// Alla fine del gioco (GAME OVER o vittoria su OMEGA) il giocatore scrive il nome (massimo 10 lettere).
// La classifica tiene i primi 100 punteggi: mondiale su Firebase (firebase-config.js) e, come riserva, nel browser.

const SCORE_MAX_NAME=10,BOARD_SIZE=100,SCORE_PTS={nemico:100,roccia:10,orbita:1500,ribelle:150,colono:500,colonia:4000,vita:1000,finale:25000};
function scoreLoad(){const v=parseInt(localStorage.getItem('stellarPunti'),10);return Number.isFinite(v)&&v>0?v:0}
let score=scoreLoad(),scorePending=0;
function scoreFmt(n){return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g,'.')}
function scoreSave(){localStorage.setItem('stellarPunti',String(score));scoreHud()}
function scoreAdd(n){if(n>0){score+=Math.round(n);scoreSave()}}
function scoreDiff(p){return Math.max(1,(p&&p.difficulty)||1)}
function scoreHud(){
 if(typeof document==='undefined'||!document.createElement)return;
 let h=$('scoreHud');
 if(!h&&$('ecoHud')&&$('ecoHud').appendChild){h=document.createElement('small');h.id='scoreHud';h.className='score-hud';$('ecoHud').appendChild(h)}
 if(h)h.textContent='PUNTI '+scoreFmt(score);
 let m=$('mapScore');
 const mc=$('mapCredits');
 if(!m&&mc&&mc.parentNode&&mc.parentNode.appendChild){m=document.createElement('span');m.id='mapScore';m.className='map-score';mc.parentNode.appendChild(m)}
 if(m)m.textContent='PUNTI '+scoreFmt(score);
}

// ---- classifica salvata nel browser
function boardLoad(){try{const b=JSON.parse(localStorage.getItem('stellarClassifica')||'[]');return Array.isArray(b)?b.filter(r=>r&&typeof r.n==='string'&&Number.isFinite(r.s)):[]}catch(e){return[]}}
function boardSave(b){localStorage.setItem('stellarClassifica',JSON.stringify(b))}
function cleanName(s){return String(s||'').replace(/[^\p{L}\p{N} ]/gu,'').replace(/\s+/g,' ').trim().slice(0,SCORE_MAX_NAME)}
// Inserisce un punteggio e restituisce la posizione (1..100), oppure 0 se resta fuori dai primi 100.
function boardAdd(name,points){
 const n=cleanName(name);if(!n)return -1;
 const b=boardLoad(),row={n,s:Math.round(points),d:new Date().toISOString().slice(0,10)};
 let i=b.findIndex(r=>r.s<row.s);if(i<0)i=b.length;
 b.splice(i,0,row);const top=b.slice(0,BOARD_SIZE);boardSave(top);
 return i<BOARD_SIZE?i+1:0;
}

// ---- interfaccia: pulsante, finestra della classifica e inserimento del nome
function boardBuild(){
 if(typeof document==='undefined'||!document.createElement||!document.body||!document.body.appendChild)return;
 if($('settingsBtn')&&$('settingsBtn').parentNode&&!$('boardBtn')){
  const b=document.createElement('button');b.id='boardBtn';b.className='settings-btn board-btn';b.setAttribute('aria-label','Apri la classifica');
  b.innerHTML='🏆 <span>CLASSIFICA</span>';b.onclick=()=>boardOpen();
  $('settingsBtn').parentNode.insertBefore(b,$('settingsBtn'));
 }
 if(!$('boardOverlay')){
  const o=document.createElement('section');o.id='boardOverlay';o.className='overlay hidden';o.setAttribute('aria-label','CLASSIFICA');
  o.innerHTML='<div class="brief-card board-card"><div class="settings-head"><div><p class="eyebrow">STELLAR FRONTIER</p><h2>CLASSIFICA</h2></div><button id="closeBoardX" class="close-btn" aria-label="Chiudi classifica">×</button></div>'+
   '<p class="board-sub">I PRIMI 100 PILOTI</p><div id="boardTabs" class="board-tabs hidden"><button data-view="mondo">🌍 MONDO</button><button data-view="locale">QUESTO BROWSER</button></div><div id="boardList" class="board-list"></div>'+
   '<p class="board-note">Punti: nemici abbattuti, coloni salvati, orbite conquistate e colonie liberate. Più alta la minaccia, più punti.</p><p id="boardWhere" class="board-note">La classifica è salvata in questo browser.</p>'+
   '<button id="closeBoard" class="launch-btn"><span>CHIUDI</span><b>✓</b></button></div>';
  document.body.appendChild(o);
  $('closeBoard').onclick=$('closeBoardX').onclick=()=>show('boardOverlay',false);
  for(const b of o.querySelectorAll('#boardTabs button'))b.onclick=()=>{coView=b.dataset.view;boardRender()};
 }
 const card=document.querySelector('.result-card'),land=$('landBtn');
 if(card&&land&&!$('scoreEntry')){
  const e=document.createElement('div');e.id='scoreEntry';e.className='score-entry hidden';
  e.innerHTML='<p class="eyebrow">PUNTEGGIO FINALE</p><b id="scoreFinal" class="score-final">0</b>'+
   '<label for="scoreName">INSERISCI IL TUO NOME</label><div class="score-row"><input id="scoreName" maxlength="10" autocomplete="off" spellcheck="false" placeholder="Massimo 10 lettere"><button id="scoreSaveBtn" class="launch-btn"><span>SALVA IN CLASSIFICA</span><b>🏆</b></button></div><p id="scoreMsg" class="score-msg"></p>';
  card.insertBefore(e,land);
  const inp=$('scoreName');
  inp.addEventListener('keydown',ev=>{ev.stopPropagation();if(ev.key==='Enter')scoreSubmit()});
  inp.addEventListener('keyup',ev=>ev.stopPropagation());
  inp.addEventListener('input',()=>{const c=inp.value.replace(/[^\p{L}\p{N} ]/gu,'').slice(0,SCORE_MAX_NAME);if(c!==inp.value)inp.value=c});
  $('scoreSaveBtn').onclick=()=>scoreSubmit();
 }
}
let boardHighlight=-1;
function boardRows(b,hi){
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 return '<div class="board-row head"><span>POS.</span><span>NOME</span><span>PUNTI</span><span>DATA</span></div>'+
  b.map((r,i)=>`<div class="board-row${hi(r,i)?' me':''}${i<3?' podium':''}"><span>${i+1}</span><span>${esc(r.n)}</span><span>${scoreFmt(r.s)}</span><span>${esc(r.d||'')}</span></div>`).join('');
}
function boardShow(list,b,hi,emptyMsg){
 if(!b.length){list.innerHTML='<p class="board-empty">'+(emptyMsg||'Nessun punteggio ancora: completa una partita per entrare in classifica.')+'</p>';return}
 list.innerHTML=boardRows(b,hi);
 const me=list.querySelector('.me');if(me&&me.scrollIntoView)me.scrollIntoView({block:'center'});
}
function boardRenderLocal(list){boardShow(list,boardLoad(),(r,i)=>i+1===boardHighlight)}

// ---- classifica MONDIALE (Firebase Firestore, senza librerie: API REST)
// La configurazione è in firebase-config.js. Se manca, o se la rete non risponde, si usa la classifica di questo browser.
// I punteggi che non si riescono a inviare restano in attesa (stellarInAttesa) e partono alla prossima occasione.
const CO=(typeof CLASSIFICA_ONLINE==='object'&&CLASSIFICA_ONLINE)||{};
const coOn=!!(CO.projectId&&CO.apiKey)&&typeof fetch==='function';
let coView=coOn?'mondo':'locale',coCache=null,coCacheT=0,coMyId='',coBusy=0;
function coUrl(path){return 'https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(CO.projectId)+'/databases/(default)/documents'+path+'?key='+encodeURIComponent(CO.apiKey)}
async function coReq(path,body){
 const ctl=typeof AbortController==='function'?new AbortController():null,t=ctl?setTimeout(()=>ctl.abort(),8000):0;
 try{
  const r=await fetch(coUrl(path),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl?ctl.signal:undefined});
  if(!r.ok)throw new Error('firestore '+r.status);
  return await r.json();
 }finally{clearTimeout(t)}
}
function coRow(doc){
 const f=(doc&&doc.fields)||{},s=Number(f.s&&f.s.integerValue);
 return{n:cleanName(f.n&&f.n.stringValue),s,d:String((f.d&&f.d.stringValue)||'').slice(0,10),id:String(doc.name||'').split('/').pop()};
}
async function coTop(force){
 if(!force&&coCache&&Date.now()-coCacheT<60000)return coCache;
 const j=await coReq(':runQuery',{structuredQuery:{from:[{collectionId:'classifica'}],orderBy:[{field:{fieldPath:'s'},direction:'DESCENDING'}],limit:BOARD_SIZE}});
 coCache=(Array.isArray(j)?j:[]).filter(x=>x&&x.document).map(x=>coRow(x.document)).filter(r=>r.n&&Number.isFinite(r.s));
 coCacheT=Date.now();return coCache;
}
async function coSend(row){
 const j=await coReq('/classifica',{fields:{n:{stringValue:row.n},s:{integerValue:String(row.s)},d:{stringValue:row.d}}});
 coCache=null;return String(j&&j.name||'').split('/').pop();
}
function coPending(){try{const q=JSON.parse(localStorage.getItem('stellarInAttesa')||'[]');return Array.isArray(q)?q:[]}catch(e){return[]}}
function coPendingSave(q){localStorage.setItem('stellarInAttesa',JSON.stringify(q.slice(-20)))}
async function coFlush(){
 if(!coOn||coBusy)return;coBusy=1;
 try{let q=coPending();while(q.length){await coSend(q[0]);q=q.slice(1);coPendingSave(q)}}catch(e){}
 coBusy=0;
}
function boardTabs(){
 const t=$('boardTabs');if(!t)return;
 t.classList.toggle('hidden',!coOn);
 for(const b of t.querySelectorAll('button'))b.classList.toggle('on',b.dataset.view===coView);
 const note=$('boardWhere');if(note)note.textContent=coView==='mondo'?'La classifica mondiale è condivisa da tutti i giocatori.':'La classifica è salvata in questo browser.';
}
async function boardRender(){
 const list=$('boardList');if(!list)return;
 boardTabs();
 if(coView!=='mondo'){boardRenderLocal(list);return}
 if(!coCache)list.innerHTML='<p class="board-empty">CARICAMENTO…</p>';
 try{
  await coFlush();
  const b=await coTop(false);
  if(coView==='mondo')boardShow(list,b,r=>coMyId&&r.id===coMyId,'Nessun punteggio ancora: completa una partita per entrare in classifica.');
 }catch(e){
  if(coView!=='mondo')return;
  boardRenderLocal(list);
  list.insertAdjacentHTML('afterbegin','<p class="board-offline">OFFLINE · CLASSIFICA DI QUESTO BROWSER</p>');
 }
}
function boardOpen(){boardRender();show('boardOverlay',true)}
// Fine del gioco: si mostra il punteggio e si chiede il nome. La partita successiva riparte da 0 punti.
function scoreEnd(){
 scorePending=score;score=0;scoreSave();
 if(!$('scoreEntry'))return;
 $('scoreFinal').textContent=scoreFmt(scorePending);$('scoreMsg').textContent='';
 $('scoreName').value=localStorage.getItem('stellarUltimoNome')||'';$('scoreName').disabled=false;$('scoreSaveBtn').disabled=false;
 show('scoreEntry',scorePending>0);
 if(scorePending>0)setTimeout(()=>{try{$('scoreName').focus()}catch(e){}},60);
}
async function scoreSubmit(){
 if(scorePending<=0)return;
 const name=cleanName($('scoreName').value);
 if(!name){$('scoreMsg').textContent='Scrivi un nome';return}
 const pts=Math.round(scorePending),pos=boardAdd(name,pts);localStorage.setItem('stellarUltimoNome',name);
 scorePending=0;$('scoreName').disabled=true;$('scoreSaveBtn').disabled=true;
 boardHighlight=pos;coMyId='';
 if(coOn){
  $('scoreMsg').textContent='INVIO ALLA CLASSIFICA MONDIALE…';
  const row={n:name,s:pts,d:new Date().toISOString().slice(0,10)};
  try{
   await coFlush();
   coMyId=await coSend(row);
   const b=await coTop(true),i=b.findIndex(r=>r.id===coMyId);
   $('scoreMsg').textContent=i>=0?'CLASSIFICA MONDIALE · POSIZIONE '+(i+1):'FUORI DAI PRIMI 100';
   coView='mondo';
  }catch(e){
   coPendingSave(coPending().concat([row]));
   $('scoreMsg').textContent='OFFLINE · SALVATO IN QUESTO BROWSER, VERRÀ INVIATO PIÙ TARDI';
   coView='locale';
  }
 }else $('scoreMsg').textContent=pos>0?'PUNTEGGIO SALVATO · POSIZIONE '+pos:'FUORI DAI PRIMI 100';
 boardOpen();
}

// ---- da dove arrivano i punti
const sOrig={dropSupply,finish,pfHitEnemy,pfUpdateHostages,pfFinish,viteGameOver};
dropSupply=function(e){sOrig.dropSupply(e);if(e&&state==='play')scoreAdd((e.type?SCORE_PTS.nemico:SCORE_PTS.roccia)*scoreDiff(world&&world.p))};
finish=function(win){
 const before=state,p=world&&world.p;if($('scoreEntry'))show('scoreEntry',false);
 sOrig.finish(win);if(state!==before&&win)scoreAdd(SCORE_PTS.orbita*scoreDiff(p));
};
pfHitEnemy=function(e,n){const was=e.hp;sOrig.pfHitEnemy(e,n);if(was>0&&e.hp<=0)scoreAdd(SCORE_PTS.ribelle*scoreDiff(pf&&pf.p))};
pfUpdateHostages=function(dt){const r=pf?pf.rescued:0;sOrig.pfUpdateHostages(dt);if(pf&&pf.rescued>r)scoreAdd((pf.rescued-r)*SCORE_PTS.colono*scoreDiff(pf.p))};
pfFinish=function(win){
 const before=state,p=pf&&pf.p;if($('scoreEntry'))show('scoreEntry',false);
 sOrig.pfFinish(win);
 if(state===before||!win||!p)return;
 scoreAdd(SCORE_PTS.colonia*scoreDiff(p)+(p.final?SCORE_PTS.finale+vite*SCORE_PTS.vita:0));
 if(p.final)scoreEnd();
};
viteGameOver=function(){sOrig.viteGameOver();scoreEnd()};

boardBuild();scoreHud();if(coOn)setTimeout(coFlush,3000);
