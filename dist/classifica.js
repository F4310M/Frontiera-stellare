// Stellar Frontier — PUNTEGGIO e CLASSIFICA.
// I punti si accumulano in tutta la partita (nemici, coloni, orbite, colonie liberate) e crescono con la minaccia del pianeta.
// Alla fine del gioco (GAME OVER o vittoria su OMEGA) il giocatore scrive il nome (massimo 10 lettere).
// La classifica tiene i primi 100 punteggi ed è salvata nel browser.

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
   '<p class="board-sub">I PRIMI 100 PILOTI</p><div id="boardList" class="board-list"></div>'+
   '<p class="board-note">Punti: nemici abbattuti, coloni salvati, orbite conquistate e colonie liberate. Più alta la minaccia, più punti. La classifica è salvata in questo browser.</p>'+
   '<button id="closeBoard" class="launch-btn"><span>CHIUDI</span><b>✓</b></button></div>';
  document.body.appendChild(o);
  $('closeBoard').onclick=$('closeBoardX').onclick=()=>show('boardOverlay',false);
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
function boardRender(){
 const list=$('boardList');if(!list)return;
 const b=boardLoad();
 if(!b.length){list.innerHTML='<p class="board-empty">Nessun punteggio ancora: completa una partita per entrare in classifica.</p>';return}
 const esc=s=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 list.innerHTML='<div class="board-row head"><span>POS.</span><span>NOME</span><span>PUNTI</span><span>DATA</span></div>'+
  b.map((r,i)=>`<div class="board-row${i+1===boardHighlight?' me':''}${i<3?' podium':''}"><span>${i+1}</span><span>${esc(r.n)}</span><span>${scoreFmt(r.s)}</span><span>${esc(r.d||'')}</span></div>`).join('');
 const me=list.querySelector('.me');if(me&&me.scrollIntoView)me.scrollIntoView({block:'center'});
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
function scoreSubmit(){
 if(scorePending<=0)return;
 const name=cleanName($('scoreName').value);
 if(!name){$('scoreMsg').textContent='Scrivi un nome';return}
 const pos=boardAdd(name,scorePending);localStorage.setItem('stellarUltimoNome',name);
 scorePending=0;$('scoreName').disabled=true;$('scoreSaveBtn').disabled=true;
 $('scoreMsg').textContent=pos>0?'PUNTEGGIO SALVATO · POSIZIONE '+pos:'FUORI DAI PRIMI 100';
 boardHighlight=pos;boardOpen();
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

boardBuild();scoreHud();
