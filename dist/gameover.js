// Conex — scritta GAME OVER in stile sala giochi anni '80.
// Quando finiscono tutte le vite (nello spazio o a terra) appare a tutto schermo una grande scritta
// GAME OVER a pixel, con i colori al neon, le righe del vecchio monitor e una griglia che scorre.
// Le lettere cadono una alla volta, poi lampeggia "PREMI UN TASTO". Dopo qualche secondo (o con un
// tasto / un tocco) la scritta sparisce e resta la schermata di fine partita di sempre.
// La logica del GAME OVER non cambia: questo file avvolge solo viteGameOver per mostrare la scritta.

const GO_CFG={durata:6500,minimo:1300,pixel:8};
// Lettere 5×7 a pixel, come nei cabinati
const GO_FONT={
 G:['01110','10001','10000','10111','10001','10001','01111'],
 A:['01110','10001','10001','11111','10001','10001','10001'],
 M:['10001','11011','10101','10101','10001','10001','10001'],
 E:['11111','10000','10000','11110','10000','10000','11111'],
 O:['01110','10001','10001','10001','10001','10001','01110'],
 V:['10001','10001','10001','10001','10001','01010','00100'],
 R:['11110','10001','10001','11110','10100','10010','10001']
};
// Disegna una lettera su una piccola tela: bordo viola scuro, sfumatura giallo → arancio → magenta.
function goLetter(ch,px){
 const rows=GO_FONT[ch],m=Math.round(px/2),w=5*px+2*m,h=7*px+2*m;
 const c=document.createElement('canvas');c.width=w;c.height=h;c.className='go-letter';
 const g=c.getContext&&c.getContext('2d');if(!g||!rows)return c;
 const on=(x,y)=>y>=0&&y<7&&x>=0&&x<5&&rows[y][x]==='1';
 g.fillStyle='#2a0640';
 for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(on(x,y))g.fillRect(x*px,y*px,px+2*m,px+2*m);
 const gr=g.createLinearGradient(0,m,0,m+7*px);
 gr.addColorStop(0,'#fff6a8');gr.addColorStop(.3,'#ffd23a');gr.addColorStop(.55,'#ff7a1a');gr.addColorStop(.8,'#ff2a8a');gr.addColorStop(1,'#c21aff');
 g.fillStyle=gr;for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(on(x,y))g.fillRect(m+x*px,m+y*px,px,px);
 // riflesso sui bordi alti, come i fosfori del monitor
 g.fillStyle='rgba(255,255,255,.55)';for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(on(x,y)&&!on(x,y-1))g.fillRect(m+x*px,m+y*px,px,Math.max(1,Math.round(px/4)));
 return c;
}
function goBuild(){
 let o=$('gameOverArcade');if(o)return o;
 if(!document.createElement||!document.body||!document.body.appendChild)return null;
 o=document.createElement('section');o.id='gameOverArcade';o.className='go-arcade hidden';o.setAttribute('aria-label','GAME OVER');
 o.innerHTML='<div class="go-sky"></div><div class="go-sun"></div><div class="go-grid"></div><div class="go-word"><div class="go-row" id="goRow1"></div><div class="go-row" id="goRow2"></div></div><p class="go-press">PREMI UN TASTO</p><div class="go-scan"></div>';
 document.body.appendChild(o);
 let i=0;
 for(const [id,word] of [['goRow1','GAME'],['goRow2','OVER']]){
  const row=$(id);if(!row||!row.appendChild)continue;
  for(const ch of word){const l=goLetter(ch,GO_CFG.pixel);if(l.style&&l.style.setProperty)l.style.setProperty('--i',String(i++));row.appendChild(l)}
 }
 const chiudi=e=>{if(!goShown||performance.now()-goShown<GO_CFG.minimo)return;if(e&&e.stopPropagation)e.stopPropagation();goHide()};
 o.addEventListener('pointerdown',chiudi);
 addEventListener('keydown',e=>{if(!goShown)return;e.stopPropagation();if(e.preventDefault)e.preventDefault();chiudi(e)},true);
 return o;
}
let goShown=0,goTimer=0;
// Jingle discendente da cabinato (onde quadre), se l'audio del gioco è disponibile
function goJingle(){
 if(typeof tone!=='function')return;
 try{[[784,0],[659,.16],[523,.32],[392,.48],[330,.66],[262,.86]].forEach(([f,d],k)=>tone(f,k===5?.6:.15,'square',.03,k===5?-80:0,d))}catch(e){}
}
function goShow(){
 const o=goBuild();if(!o)return;
 o.classList.remove('hidden');o.classList.remove('go-on');void o.offsetWidth;o.classList.add('go-on');
 goShown=performance.now()||1;
 const pr=o.querySelector&&o.querySelector('.go-press');if(pr)pr.textContent=(typeof touch!=='undefined'&&touch&&touch.on)?'TOCCA LO SCHERMO':'PREMI UN TASTO';
 if(typeof musHush==='function')try{musHush()}catch(e){}
 goJingle();
 clearTimeout(goTimer);goTimer=setTimeout(goHide,GO_CFG.durata);
}
function goHide(){
 goShown=0;clearTimeout(goTimer);
 const o=$('gameOverArcade');if(o){o.classList.remove('go-on');o.classList.add('hidden')}
 if($('scoreEntry')&&!$('scoreEntry').classList.contains('hidden'))setTimeout(()=>{try{$('scoreName').focus()}catch(e){}},60);
}
if(typeof viteGameOver==='function'){const goVg=viteGameOver;viteGameOver=function(){const r=goVg.apply(this,arguments);goShow();return r}}

// Traduzione della scritta sotto (GAME OVER resta uguale in tutte le lingue)
if(typeof I18N_ROWS!=='undefined'){
 for(const r of [["PREMI UN TASTO","PRESS ANY KEY","APPUIE SUR UNE TOUCHE","PULSA UNA TECLA","НАЖМИ ЛЮБУЮ КЛАВИШУ","按任意键","いずれかのキーを押してください"],
  ["TOCCA LO SCHERMO","TAP THE SCREEN","TOUCHE L’ÉCRAN","TOCA LA PANTALLA","КОСНИСЬ ЭКРАНА","点击屏幕","画面をタップ"]])
  if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function'){i18nBuild();if(typeof i18nApply==='function')i18nApply()}
}
