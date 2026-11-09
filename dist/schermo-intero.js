// Schermo intero forzato (2026-11-09).
// Il browser permette lo schermo intero solo dopo un gesto del giocatore (clic, tocco o tasto),
// quindi il gioco lo chiede al primo gesto e lo richiede a ogni gesto successivo se si è usciti
// (per esempio con Esc o con il gesto di sistema del telefono).
// - Fine missione, ritorno alla mappa e uscita dall'arena NON escono più dallo schermo intero.
// - Il pulsante FINESTRA resta: se il giocatore lo usa, il gioco resta in finestra fino al
//   prossimo avvio di una missione (o finché non si preme di nuovo SCHERMO INTERO).
// - Chrome/Edge su PC: Esc viene "bloccato" (Keyboard Lock) così mette in pausa invece di uscire;
//   per uscire si tiene premuto Esc.
// - iPhone: Safari non ha lo schermo intero per le pagine; con "Aggiungi alla schermata Home"
//   il gioco si apre senza barre del browser (manifest + meta in index.html). Un avviso lo spiega.
// I segnali del joypad non contano come gesto per il browser: serve un tocco, un clic o un tasto.

const SI={auto:true,pending:false,fails:0,hintKey:'stellarAvvisoSchermo'};

function siDoc(){return typeof document!=='undefined'?document:null}
function siFull(){const d=siDoc();return !!(d&&(d.fullscreenElement||d.webkitFullscreenElement))}
function siCan(){const d=siDoc(),el=d&&d.documentElement;return !!(el&&(el.requestFullscreen||el.webkitRequestFullscreen))}
function siStandalone(){
 try{if(typeof navigator!=='undefined'&&navigator.standalone)return true;
  return typeof matchMedia==='function'&&(matchMedia('(display-mode: fullscreen)').matches||matchMedia('(display-mode: standalone)').matches)}catch(e){return false}
}

function siLockKeys(){
 try{if(typeof navigator!=='undefined'&&navigator.keyboard&&navigator.keyboard.lock)navigator.keyboard.lock(['Escape']).catch(()=>{})}catch(e){}
}
function siSync(){try{if(typeof syncFullscreenButton==='function')syncFullscreenButton()}catch(e){}}

// Chiede lo schermo intero. manual=true solo quando il giocatore ha premuto il pulsante.
function siEnter(manual){
 if(siFull()){siLockKeys();siSync();return}
 if(SI.pending||!siCan()){if(manual&&!siCan())siTell();return}
 const el=siDoc().documentElement;
 let p;
 try{p=el.requestFullscreen?el.requestFullscreen({navigationUI:'hide'}):el.webkitRequestFullscreen()}catch(e){p=null}
 if(!p||typeof p.then!=='function'){setTimeout(()=>{if(siFull())siLockKeys();siSync()},120);return}
 SI.pending=true;setTimeout(()=>{SI.pending=false},1500); // se il browser non risponde, si riprova al gesto dopo
 p.then(()=>{SI.pending=false;SI.fails=0;siLockKeys();siSync()})
  .catch(()=>{SI.pending=false;SI.fails++;siSync();
   if(manual&&typeof status==='function')try{status('SCHERMO INTERO NON DISPONIBILE',1800)}catch(e){}});
}
function siLeave(){
 const d=siDoc();if(!d)return;
 try{if(typeof navigator!=='undefined'&&navigator.keyboard&&navigator.keyboard.unlock)navigator.keyboard.unlock()}catch(e){}
 try{const p=d.exitFullscreen?d.exitFullscreen():d.webkitExitFullscreen?d.webkitExitFullscreen():null;
  if(p&&p.then)p.then(siSync,siSync);else siSync()}catch(e){siSync()}
}

// Sostituisce le funzioni di game.js (usate anche da fase2.js, partita.js, arena.js).
function syncFullscreenButton(){
 const full=siFull(),b=typeof $==='function'?$('fullscreenBtn'):null;if(!b)return;
 const ic=b.querySelector('b'),tx=b.querySelector('span');
 if(ic&&typeof ico==='function')ic.innerHTML=ico(full?'minimize':'maximize');
 if(tx)tx.textContent=full?'FINESTRA':'SCHERMO INTERO';
 b.setAttribute('aria-label',full?'Ripristina visuale Windows':'Passa a schermo intero');
}
function enterGameFullscreen(){SI.auto=true;siEnter(false)}
function leaveGameFullscreen(){siSync()} // non esce più da solo: resta a schermo intero
function toggleFullscreen(){if(siFull()){SI.auto=false;siLeave()}else{SI.auto=true;siEnter(true)}}

// Ogni gesto del giocatore (catturato prima di tutti gli altri gestori) rientra a schermo intero.
function siGesture(e){
 if(!SI.auto||siFull()||SI.fails>=6)return;
 // col dito il browser concede il permesso solo quando il dito si alza (pointerup/touchend)
 if(e&&e.type==='pointerdown'&&e.pointerType&&e.pointerType!=='mouse')return;
 if(e&&e.type==='keydown'&&(e.key==='Escape'||e.code==='Escape'))return; // Esc non vale come gesto
 const t=e&&e.target;
 if(t&&t.closest&&t.closest('#fullscreenBtn'))return; // ci pensa il pulsante
 siEnter(false);
}

// Avviso per iPhone: lo schermo intero si ottiene aggiungendo il gioco alla schermata Home.
function siIOS(){
 if(typeof navigator==='undefined')return false;
 const ua=navigator.userAgent||'';
 return /iPhone|iPod/.test(ua)||(/iPad/.test(ua)&&!siCan());
}
function siTell(){
 const d=siDoc();if(!d||!d.body||d.getElementById('siHint'))return;
 if(!d.getElementById('siHintCss')){const st=d.createElement('style');st.id='siHintCss';st.textContent='.si-hint{position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:10px;max-width:min(92vw,520px);padding:11px 15px;border:1px solid rgba(81,230,255,.5);border-radius:6px;background:rgba(3,12,21,.94);color:#bff6ff;font:600 13px/1.35 "Chakra Petch",sans-serif;letter-spacing:.4px;box-shadow:0 0 22px rgba(81,230,255,.18);cursor:pointer}.si-hint b{display:inline-flex;flex:none}.si-hint .ico{width:18px;height:18px}';d.head.appendChild(st)}
 const box=d.createElement('div');box.id='siHint';box.className='si-hint';
 box.innerHTML='<b>'+(typeof ico==='function'?ico('maximize'):'')+'</b><span>Per giocare a schermo intero tocca Condividi e poi «Aggiungi alla schermata Home»</span>';
 box.onclick=()=>box.remove();
 d.body.appendChild(box);
 try{if(typeof i18nApply==='function')i18nApply()}catch(e){}
 setTimeout(()=>{if(box.parentNode)box.remove()},9000);
}
function siMaybeTell(){
 if(!siIOS()||siStandalone())return;
 let n=0;try{n=+(localStorage.getItem(SI.hintKey)||0)}catch(e){}
 if(n>=3)return;
 try{localStorage.setItem(SI.hintKey,String(n+1))}catch(e){}
 siTell();
}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["Per giocare a schermo intero tocca Condividi e poi «Aggiungi alla schermata Home»","To play full screen tap Share, then “Add to Home Screen”","Pour jouer en plein écran, touche Partager puis « Sur l’écran d’accueil »","Para jugar a pantalla completa toca Compartir y luego «Añadir a pantalla de inicio»","Чтобы играть на весь экран, нажми «Поделиться», затем «На экран „Домой“»","要全屏游戏，请点击“分享”，然后选择“添加到主屏幕”","全画面で遊ぶには「共有」をタップして「ホーム画面に追加」を選んでね"],
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
}

if(typeof addEventListener==='function'&&siDoc()){
 for(const ev of ['pointerdown','pointerup','mousedown','touchend','keydown','click'])addEventListener(ev,siGesture,{capture:true,passive:true});
 for(const ev of ['fullscreenchange','webkitfullscreenchange'])siDoc().addEventListener(ev,siSync);
 try{const b=$('fullscreenBtn');if(b)b.onclick=toggleFullscreen}catch(e){}
 siSync();
 setTimeout(siMaybeTell,2500);
}
