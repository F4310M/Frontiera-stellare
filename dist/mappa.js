// Stellar Frontier — MAPPA: pianeti liberati e pianeta OMEGA in lontananza.
// - Un pianeta liberato mostra la scritta FREE e la sua missione non si può ripetere.
// - OMEGA si vede sempre, piccolo e lontano, ma resta bloccato finché tutti e cinque i pianeti non sono liberi.
// - Sconfitto IMPERATORE OMEGA anche OMEGA diventa FREE: dalla mappa si può iniziare una nuova partita.
// Va caricato dopo finale.js e classifica.js (usa liberati(), finalUnlocked(), FINAL_PLANET).

function omegaLibero(){return localStorage.getItem('frontieraOmegaLibero')==='yes'}
function mapFreed(p){return!!p&&(p.final?omegaLibero():liberati().includes(p.code))}
function mapLocked(p){return!!p&&!!p.final&&!finalUnlocked()}
function mapPlayable(p){return!!p&&!mapFreed(p)&&!mapLocked(p)}
function mapAllDone(){return planets.every(mapFreed)}
function mapFirstPlayable(){const i=planets.findIndex(mapPlayable);return i<0?0:i}

const mOrig={initMap,selectPlanet,brief,beginWarp,pfFinish,viteGameOver};

// OMEGA sta sempre sulla mappa; se è bloccato si vede solo in lontananza.
finalLock=function(){
 if(!planets.includes(FINAL_PLANET))planets.push(FINAL_PLANET);
 if(selected>=planets.length)selected=0;
 if($('starMap')&&$('starMap').appendChild)initMap();
};

initMap=function(){
 if(!mapPlayable(planets[selected])&&!mapAllDone())selected=mapFirstPlayable();
 mOrig.initMap();
 const nodes=document.querySelectorAll('.planet-node');
 nodes.forEach((n,j)=>{
  const p=planets[j];if(!p||!n.classList)return;
  const freed=mapFreed(p),locked=mapLocked(p);
  n.classList.toggle('freed',freed);n.classList.toggle('distant',locked);
  if(freed&&n.insertAdjacentHTML)n.insertAdjacentHTML('beforeend','<span class="free-tag">FREE</span>');
  if(locked){const r=n.querySelector('.risk');if(r)r.textContent='BLOCCATO'}
 });
};

selectPlanet=function(i){
 mOrig.selectPlanet(i);
 const p=planets[i],btn=$('launchBtn');if(!p||!btn)return;
 const label=btn.querySelector&&btn.querySelector('span');
 const freed=mapFreed(p),locked=mapLocked(p),done=mapAllDone();
 let text='INIZIA LA MISSIONE';
 if(done)text='NUOVA PARTITA';else if(freed)text='PIANETA LIBERATO';else if(locked)text='LIBERA TUTTI I PIANETI';
 if(label)label.textContent=text;
 btn.disabled=!done&&(freed||locked);
 if(btn.classList)btn.classList.toggle('done',!done&&(freed||locked));
 if(freed)$('planetDesc').textContent=p.desc+' '+'Colonia liberata: questa missione è conclusa e non si può ripetere.';
 else if(locked){
  $('planetDesc').textContent='Avvistato in lontananza. Libera tutti e cinque i pianeti per aprire la rotta verso OMEGA.';
  $('planetDistance').textContent='???';$('planetReward').textContent='???';
 }
};

// Nuova partita a gioco finito: si azzerano progressi, vite, crediti e potenziamenti.
function mapNewGame(){
 for(const k of ['frontieraPhaseOneComplete','frontieraPhaseTwoComplete','frontieraPianetiLiberati','frontieraOmegaLibero'])localStorage.setItem(k,'');
 phaseOneComplete=false;phaseTwoComplete=false;
 vite=VITE_START;viteSave();
 if(typeof eco!=='undefined'){eco.balance=ECO_START;eco.upgrades={};ecoSave();ecoHud()}
 selected=0;finalLock();
}

// Missioni bloccate o già concluse non partono, nemmeno con scorciatoie.
brief=function(){
 const p=planets[selected];
 if(mapAllDone()){mapNewGame();return}
 if(!mapPlayable(p))return;
 mOrig.brief();
};
beginWarp=function(){if(!mapPlayable(planets[selected]))return;mOrig.beginWarp()};

// A fine missione la mappa si aggiorna subito: al ritorno c'è già la scritta FREE.
pfFinish=function(win){
 const before=state,p=pf&&pf.p;mOrig.pfFinish(win);
 if(state===before)return;
 if(win&&p&&p.final)localStorage.setItem('frontieraOmegaLibero','yes');
 if($('starMap')&&$('starMap').appendChild)initMap();
};
viteGameOver=function(){localStorage.setItem('frontieraOmegaLibero','');mOrig.viteGameOver();finalLock()};

finalLock();
