// Conex — scritta GAME OVER in stile sala giochi anni '80.
// Quando finiscono tutte le vite (nello spazio o a terra) appare a tutto schermo una grande scritta
// GAME OVER a pixel, con i colori al neon, le righe del vecchio monitor e una griglia che scorre.
// Le lettere cadono una alla volta, poi lampeggia "PREMI UN TASTO". Dopo qualche secondo (o con un
// tasto / un tocco) la scritta sparisce e resta la schermata di fine partita di sempre.
// Dietro la scritta una navicella arriva dal fondo ed esplode in frammenti al neon (GO_NAVE).
// La logica del GAME OVER non cambia: questo file avvolge solo viteGameOver per mostrare la scritta.

const GO_CFG={durata:7500,minimo:1800,pixel:8};
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
 o.innerHTML='<div class="go-sky"></div><div class="go-sun"></div><div class="go-grid"></div><canvas class="go-boom" id="goBoom"></canvas><div class="go-word"><div class="go-row" id="goRow1"></div><div class="go-row" id="goRow2"></div></div><p class="go-press">PREMI UN TASTO</p><div class="go-scan"></div>';
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
 try{[[784,0],[659,.16],[523,.32],[392,.48],[330,.66],[262,.86]].forEach(([f,d],k)=>tone(f,k===5?.6:.15,'square',.03,k===5?-80:0,d+.9))}catch(e){}
}

// ---- navicella che esplode dietro la scritta (una tela a metà risoluzione, solo mentre la scritta è visibile)
const GO_NAVE={arrivo:.75,scala:.5};
// sagoma della navicella (caccia a punta), coordinate in unità: muso in alto
const GO_SHIP=[[0,-1],[.22,-.35],[.9,.35],[.95,.6],[.3,.45],[.18,.75],[-.18,.75],[-.3,.45],[-.95,.6],[-.9,.35],[-.22,-.35]];
let goAnim=null;
function goBoomStart(){
 const c=$('goBoom');if(!c||!c.getContext)return;
 const w=Math.max(1,Math.round(innerWidth*GO_NAVE.scala)),h=Math.max(1,Math.round(innerHeight*GO_NAVE.scala));c.width=w;c.height=h;
 const g=c.getContext('2d');if(!g)return;
 const R=Math.min(w,h)*.16,cx=w/2,cy=h*.47;
 // frammenti: ogni triangolo della sagoma diventa un pezzo che vola via ruotando
 const shards=[];for(let i=0;i<GO_SHIP.length;i++){const a=GO_SHIP[i],b=GO_SHIP[(i+1)%GO_SHIP.length],mx=(a[0]+b[0])/3,my=(a[1]+b[1])/3,d=Math.hypot(mx,my)||1;
  shards.push({pts:[[0-mx,0-my],[a[0]-mx,a[1]-my],[b[0]-mx,b[1]-my]],x:mx,y:my,vx:mx/d*(1.2+Math.random()*1.6),vy:my/d*(1.2+Math.random()*1.6)-.4,r:0,vr:(Math.random()-.5)*9})}
 const sparks=[];for(let i=0;i<90;i++){const a=Math.random()*Math.PI*2,v=.8+Math.random()*3.4;sparks.push({x:0,y:0,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.6+Math.random()*1.4,col:['#fff6a8','#ffd23a','#ff7a1a','#ff2a8a','#7df9ff'][i%5],s:1+Math.random()*2.5})}
 const blasts=[{x:0,y:0,s:1.6,d:0,t:1.5},{x:.7,y:-.3,s:.8,d:.25,t:.9},{x:-.8,y:.2,s:.9,d:.45,t:1},{x:.2,y:.6,s:.7,d:.7,t:.9}],embers=[];
 const t0=performance.now();let last=t0,boomed=false;
 const frame=now=>{
  if(!goShown){goAnim=null;g.clearRect(0,0,w,h);return}
  const t=(now-t0)/1000,dt=Math.min(.05,(now-last)/1000);last=now;
  g.clearRect(0,0,w,h);
  if(t<GO_NAVE.arrivo){
   // la navicella sale dal fondo, cresce e trema: è colpita
   const k=t/GO_NAVE.arrivo,sc=R*(.35+.65*k),x=cx+Math.sin(t*40)*k*R*.05,y=cy+(1-k)*h*.4;
   g.save();g.translate(x,y);g.scale(sc,sc);
   g.beginPath();GO_SHIP.forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py));g.closePath();
   g.fillStyle='#1a0433';g.fill();g.lineWidth=2.5/sc;g.strokeStyle='#7df9ff';g.stroke();
   g.globalCompositeOperation='lighter';g.lineWidth=7/sc;g.strokeStyle='rgba(125,249,255,.25)';g.stroke();
   // motore e cabina
   g.fillStyle='#ff7a1a';g.beginPath();g.moveTo(-.15,.75);g.lineTo(.15,.75);g.lineTo(0,.75+.4+Math.random()*.3);g.fill();
   g.fillStyle='#ff2a8a';g.beginPath();g.ellipse(0,-.15,.1,.22,0,0,Math.PI*2);g.fill();
   if(k>.6&&Math.random()<.5){g.fillStyle='#fff6a8';g.fillRect((Math.random()-.5)*1.2,(Math.random()-.5),.12,.12)}
   g.restore();g.globalCompositeOperation='source-over';
  }else{
   if(!boomed){boomed=true;if(typeof sfx==='function')try{sfx('boom')}catch(e){}}
   const e=t-GO_NAVE.arrivo;
   g.globalCompositeOperation='lighter';
   // lampo bianco, palla di fuoco principale e tre scoppi secondari
   if(e<.12){g.fillStyle=`rgba(255,255,240,${.8*(1-e/.12)})`;g.fillRect(0,0,w,h)}
   for(const b of blasts){const be=e-b.d;if(be<0||be>b.t)continue;const k=be/b.t,r=R*b.s*(.4+Math.sqrt(k)*1.6),a=1-k,bx=cx+b.x*R,by=cy+b.y*R,fg=g.createRadialGradient(bx,by,0,bx,by,r);
    fg.addColorStop(0,`rgba(255,255,230,${a})`);fg.addColorStop(.25,`rgba(255,220,90,${a})`);fg.addColorStop(.55,`rgba(255,110,40,${a*.8})`);fg.addColorStop(.8,`rgba(255,40,140,${a*.45})`);fg.addColorStop(1,'rgba(120,20,255,0)');
    g.fillStyle=fg;g.beginPath();g.arc(bx,by,r,0,Math.PI*2);g.fill()}
   // il relitto continua a bruciare: bagliore che pulsa e braci che salgono dietro la scritta
   {const a=Math.min(1,e/.8)*(.55+.12*Math.sin(t*9)),fg=g.createRadialGradient(cx,cy+R*.6,0,cx,cy+R*.6,R*2.2);
    fg.addColorStop(0,`rgba(255,150,50,${a})`);fg.addColorStop(.5,`rgba(255,40,120,${a*.45})`);fg.addColorStop(1,'rgba(120,20,255,0)');g.fillStyle=fg;g.fillRect(cx-R*2.2,cy-R*1.6,R*4.4,R*4.4)}
   if(embers.length<130&&e>.3)for(let i=0;i<3;i++)embers.push({x:cx+(Math.random()-.5)*R*1.6,y:cy+R*.7,vy:-(20+Math.random()*50)*(w/640),vx:(Math.random()-.5)*20,life:1.5+Math.random()*2,col:Math.random()<.5?'#ffd23a':'#ff7a1a'});
   for(const p of embers){p.life-=dt;p.x+=p.vx*dt+Math.sin(t*3+p.y*.05)*.3;p.y+=p.vy*dt;g.globalAlpha=Math.max(0,Math.min(1,p.life));g.fillStyle=p.col;const q=2+w/450;g.fillRect(p.x,p.y,q,q)}
   g.globalAlpha=1;for(let i=embers.length-1;i>=0;i--)if(embers[i].life<=0)embers.splice(i,1);
   // onda d'urto
   if(e<1.6){g.strokeStyle=`rgba(125,249,255,${1-e/1.6})`;g.lineWidth=3;g.beginPath();g.ellipse(cx,cy,R*(.5+e*5),R*(.5+e*5)*.42,0,0,Math.PI*2);g.stroke()}
   // scintille quadrate (a pixel)
   for(const p of sparks){if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=.9*dt;p.vx*=.985;
    g.globalAlpha=Math.min(1,p.life*1.5);g.fillStyle=p.col;const q=p.s*(w/900+.5);g.fillRect(cx+p.x*R-q/2,cy+p.y*R-q/2,q,q)}
   g.globalAlpha=1;g.globalCompositeOperation='source-over';
   // frammenti dello scafo che ruotano e si allontanano
   for(const s of shards){s.x+=s.vx*dt;s.y+=s.vy*dt;s.vy+=.35*dt;s.r+=s.vr*dt;
    g.save();g.translate(cx+s.x*R,cy+s.y*R);g.rotate(s.r);g.scale(R,R);g.beginPath();s.pts.forEach(([px,py],i)=>i?g.lineTo(px,py):g.moveTo(px,py));g.closePath();
    g.fillStyle='#1a0433';g.fill();g.lineWidth=4/R;g.strokeStyle=e<.5?'#fff6a8':e<1.2?'#ff7a1a':'#7df9ff';g.stroke();g.restore()}
  }
  goAnim=requestAnimationFrame(frame);
 };
 if(goAnim)cancelAnimationFrame(goAnim);goAnim=requestAnimationFrame(frame);
}
function goShow(){
 const o=goBuild();if(!o)return;
 o.classList.remove('hidden');o.classList.remove('go-on');void o.offsetWidth;o.classList.add('go-on');
 goShown=performance.now()||1;
 const pr=o.querySelector&&o.querySelector('.go-press');if(pr)pr.textContent=(typeof touch!=='undefined'&&touch&&touch.on)?'TOCCA LO SCHERMO':'PREMI UN TASTO';
 if(typeof musHush==='function')try{musHush()}catch(e){}
 goJingle();goBoomStart();
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
