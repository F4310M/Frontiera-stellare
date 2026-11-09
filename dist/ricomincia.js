// Conex — RICOMINCIA IL GIOCO (2026-11-04).
// Nelle impostazioni: azzera la partita (pianeti liberati, OMEGA, vite, crediti, potenziamenti, punti)
// e riparte dal primo pianeta. Restano il pilota, le impostazioni, la classifica e i tuoi migliori record:
// i punti della partita sono già in classifica, salvati alla fine dell'ultima missione.

function gameRestart(balance){
 if(typeof state!=='undefined'&&state!=='map'&&typeof abort==='function')abort();
 if(typeof mapNewGame==='function')mapNewGame(balance);
 localStorage.setItem('frontieraOmegaLibero','');
 if(typeof score!=='undefined'){score=0;scorePending=0;scoreSave()}
 if(typeof myRunEnd==='function')myRunEnd();
 if(typeof recSave==='function')recSave(null);
 if(typeof initMap==='function'&&$('starMap')&&$('starMap').appendChild)initMap();
 if(typeof selectPlanet==='function'){try{selectPlanet(0)}catch(e){}}
 if(typeof profToast==='function')profToast('PARTITA RICOMINCIATA · SI RIPARTE DAL PRIMO PIANETA');
}

function restartBuild(){
 if(typeof document==='undefined'||!document.createElement||!document.querySelector)return;
 const side=document.querySelector('#settingsOverlay .settings-side');
 if(side&&!$('restartBlock')){
  const b=document.createElement('div');b.id='restartBlock';b.className='setting-block sound-row restart-row';
  b.innerHTML='<div><div class="setting-title"><span>RICOMINCIA IL GIOCO</span></div><p>Nuova partita dal primo pianeta: vite, crediti, potenziamenti, pianeti liberati e punti tornano all’inizio. Pilota, impostazioni e record restano.</p></div>'+
   '<button id="restartBtn" class="restart-btn" type="button">RICOMINCIA</button>';
  side.appendChild(b);
  $('restartBtn').onclick=()=>{show('settingsOverlay',false);show('restartOverlay',true)};
 }
 if(!$('restartOverlay')&&document.body){
  const o=document.createElement('section');o.id='restartOverlay';o.className='overlay hidden';o.setAttribute('aria-label','RICOMINCIA IL GIOCO');
  o.innerHTML='<div class="brief-card compact restart-card"><p class="eyebrow">NUOVA PARTITA</p><h2>RICOMINCIARE?</h2>'+
   '<p>Perderai i pianeti liberati, le vite, i crediti e i potenziamenti di questa partita. Recuperi solo il 20% dei crediti guadagnati in questa partita.</p>'+
   '<button id="restartYes" class="launch-btn restart-yes"><span>SÌ, RICOMINCIA</span><b>'+(typeof ico==='function'?ico('check'):'')+'</b></button>'+
   '<button id="restartNo" class="text-btn">ANNULLA</button></div>';
  document.body.appendChild(o);
  $('restartYes').onclick=()=>{show('restartOverlay',false);gameRestart(typeof gameOverCarry==='function'?gameOverCarry():undefined)};
  $('restartNo').onclick=()=>show('restartOverlay',false);
 }
}
restartBuild();
