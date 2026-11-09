// Conex — GAME OVER con l'immagine e la musica di Fabio (2026-11-09).
// Quando finiscono tutte le vite:
// - a tutto schermo appare l'immagine di Fabio: la nave distrutta se sei caduto nello spazio
//   (gameover/spazio.jpg), il pilota a terra se sei caduto sul pianeta (gameover/terra.jpg);
// - parte il brano "Orbit of the Fallen" (musica/orbit-of-the-fallen.mp3), che resta per tutta la
//   schermata di fine partita e lascia il posto alla musica del menu quando torni alla mappa.
// La scritta sotto l'immagine ("PREMI UN TASTO" / "TOCCA LO SCHERMO") è tradotta come il resto del gioco.
// Va caricato dopo gameover.js: sostituisce la sua scritta a pixel con l'immagine; la logica del
// GAME OVER (vite, crediti, classifica) resta quella di sempre.

const GOI={
 img:{spazio:'gameover/spazio.jpg',terra:'gameover/terra.jpg'},
 brano:'musica/orbit-of-the-fallen.mp3',
 minimo:1200,     // ms prima che un tasto o un tocco possano chiudere l'immagine
 dove:'spazio',   // dove si è perso l'ultima vita
 musica:false     // true dal GAME OVER finché si resta sulla schermata di fine partita
};

// Le due immagini si caricano subito, così al GAME OVER compaiono senza attesa.
const goiPics={};
if(typeof Image!=='undefined')for(const k in GOI.img){const im=new Image();im.decoding='async';im.src=GOI.img[k];goiPics[k]=im}

// ---- dove si è perso: nello spazio (finish) o a terra (pfFinish)
if(typeof finish==='function'){const f=finish;finish=function(win){if(!win)GOI.dove='spazio';return f.apply(this,arguments)}}
if(typeof pfFinish==='function'){const f=pfFinish;pfFinish=function(win){if(!win)GOI.dove='terra';return f.apply(this,arguments)}}

// ---- musica: un brano in più per musica.js, scelto solo sulla schermata del GAME OVER
if(typeof MUS_TRACKS!=='undefined')MUS_TRACKS.caduta=GOI.brano;
// Tornando alla mappa o iniziando una nuova missione il brano finisce
for(const n of ['abort','startGame','startPlatform'])if(typeof globalThis[n]==='function'){const f=globalThis[n];globalThis[n]=function(){GOI.musica=false;return f.apply(this,arguments)}}
function goiMusicaOk(){
 if(typeof musTracksOk!=='function'||!musTracksOk())return false;
 const T=typeof mus!=='undefined'&&mus&&mus.tracks&&mus.tracks.caduta;
 return !(T&&T.failed);
}
if(typeof musTheme==='function'){const t=musTheme;musTheme=function(l){
 if(GOI.musica&&state!=='lost')GOI.musica=false;
 return GOI.musica&&goiMusicaOk()?'caduta':t.apply(this,arguments);
}}
// Il brano riparte sempre dall'inizio
function goiMusicaDaCapo(){
 const T=typeof mus!=='undefined'&&mus&&mus.tracks&&mus.tracks.caduta;if(!T)return;
 T.cur=0;for(const el of T.els){try{el.pause();el.currentTime=0}catch(e){}}
}

// ---- schermata con l'immagine
function goiBuild(){
 let o=$('gameOverImage');if(o)return o;
 if(!document.createElement||!document.body||!document.body.appendChild)return null;
 o=document.createElement('section');o.id='gameOverImage';o.className='goi hidden';o.setAttribute('aria-label','GAME OVER');
 o.innerHTML='<div class="goi-box"><img class="goi-img" alt="GAME OVER"><p class="goi-press">PREMI UN TASTO</p></div><div class="goi-scan"></div>';
 document.body.appendChild(o);
 const chiudi=e=>{if(!goiShown||performance.now()-goiShown<GOI.minimo)return;if(e&&e.stopPropagation)e.stopPropagation();goiHide()};
 o.addEventListener('pointerdown',chiudi);
 addEventListener('keydown',e=>{if(!goiShown)return;e.stopPropagation();if(e.preventDefault)e.preventDefault();chiudi(e)},true);
 return o;
}
let goiShown=0;
function goiShow(){
 const o=goiBuild();if(!o)return;
 const im=o.querySelector&&o.querySelector('.goi-img');if(im)im.src=GOI.img[GOI.dove]||GOI.img.spazio;
 o.classList.toggle('goi-terra',GOI.dove==='terra');
 o.classList.remove('hidden');o.classList.remove('goi-on');void o.offsetWidth;o.classList.add('goi-on');
 goiShown=performance.now()||1;
 const pr=o.querySelector&&o.querySelector('.goi-press');
 if(pr){pr.textContent=(typeof touch!=='undefined'&&touch&&touch.on)?'TOCCA LO SCHERMO':'PREMI UN TASTO'}
 goiMusicaDaCapo();GOI.musica=true;
 if(typeof musTick==='function')try{musTick()}catch(e){}
}
function goiHide(){
 goiShown=0;
 const o=$('gameOverImage');if(o){o.classList.remove('goi-on');o.classList.add('hidden')}
 if($('scoreEntry')&&!$('scoreEntry').classList.contains('hidden'))setTimeout(()=>{try{$('scoreName').focus()}catch(e){}},60);
}
// La scritta a pixel di gameover.js lascia il posto all'immagine (senza il jingle: c'è il brano).
if(typeof goShow==='function')goShow=goiShow;
else if(typeof viteGameOver==='function'){const vg=viteGameOver;viteGameOver=function(){const r=vg.apply(this,arguments);goiShow();return r}}
