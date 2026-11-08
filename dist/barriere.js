// Conex — BARRIERE D'ENERGIA E RICHIAMO DELL'ATTERRAGGIO (2026-11-08).
// 1) Spazio: a metà rotta due navi generatrici tendono una barriera d'energia di traverso alla rotta.
//    La barriera non si attraversa (si rimbalza indietro): bisogna distruggere le due navi per proseguire.
//    Le navi seguono di lato il giocatore, così non si può aggirare la barriera.
// 2) Spazio: vicino al pianeta lampeggia ENTRA NEL PIANETA PER L'ATTERRAGGIO finché non sei nell'anello.
// 3) Terra: a caso arriva un soldato che accende una barriera d'energia davanti a te: finché è vivo
//    non si passa. I colpi attraversano la barriera, il pilota no.
// Tutti i numeri sono in BARR. Va caricato in fondo a index.html (dopo vite.js).

const BARR={
 // spazio
 at:.5,                // posizione della barriera lungo la rotta (0 = partenza, 1 = pianeta)
 warn:1700,            // a che distanza compaiono le due navi
 gap:900,              // distanza tra le due navi generatrici
 follow:230,           // velocità con cui le navi seguono il giocatore di lato
 hp:16,hpDiff:4,       // colpi per abbattere una nave generatrice (+ per difficoltà)
 bump:6,               // danno quando sbatti contro la barriera
 call:2400,            // a che distanza dal bordo del pianeta compare la scritta dell'atterraggio
 // terra
 groundCount:[1,2],    // quante barriere per livello (a caso tra i due numeri)
 groundFrom:.22,groundTo:.8, // tratto del livello dove possono comparire
 ahead:520,            // a che distanza davanti al pilota si accende
 soldierHp:7,soldierHpDiff:1
};
const BAR={sp:null,wall:null,plan:[],callOn:false,bumpCd:0,zapCd:0};
const barOrig={startGame,update,drawSupplies,drawEnemy,startPlatform,updatePlatform,pfDrawEnemy,gEnemy:typeof gEnemy==='function'?gEnemy:null};
function barDiff(){return(world&&world.p&&world.p.difficulty)||1}
function barTr(s){return typeof tr==='function'?tr(s):s}

// ================================================================ 1) spazio
function barSpReset(){
 BAR.sp=world?{along:world.dist*BARR.at,c:0,gens:null,on:false,done:false,t:0}:null;
}
function barAxes(){const ax=Math.cos(approachAngle),ay=Math.sin(approachAngle);return{ax,ay}}
function barPos(along,side){const{ax,ay}=barAxes();return{x:along*ax-side*ay,y:along*ay+side*ax}}
function barSpSpawn(S,side){
 S.c=side;S.gens=[];
 const hp=BARR.hp+BARR.hpDiff*barDiff();
 for(const k of[-1,1]){
  const p=barPos(S.along,side+k*BARR.gap/2),before=enemies.length;
  spawnEnemy(p.x,p.y,false);
  const e=enemies[before];if(!e)continue;
  Object.assign(e,{x:p.x,y:p.y,vx:0,vy:0,gen:true,slot:k,type:'sniper',r:26,hp,maxHp:hp,alerted:true,fire:1.5+Math.random(),guard:false,missileer:false});
  S.gens.push(e);
 }
 S.on=S.gens.length>0;
 if(S.on){status('BARRIERA D’ENERGIA · DISTRUGGI LE DUE NAVI GENERATRICI',3600);tone(120,.6,'sawtooth',.03,240);tone(180,.5,'square',.015,90,.2)}
}
function barSpUpdate(dt){
 const S=BAR.sp;if(!S||S.done||!player||!world)return;
 S.t+=dt;BAR.bumpCd=Math.max(0,BAR.bumpCd-dt);
 const{ax,ay}=barAxes(),along=player.x*ax+player.y*ay,side=-player.x*ay+player.y*ax;
 if(!S.gens){if(along>S.along-BARR.warn&&along<S.along)barSpSpawn(S,side);return}
 const alive=S.gens.filter(e=>e.hp>0&&enemies.includes(e));
 if(!alive.length){
  S.on=false;S.done=true;
  status('BARRIERA DISATTIVATA · VIA LIBERA',2600);
  tone(660,.14,'sine',.03,990);tone(990,.3,'sine',.025,1320,.12);
  for(let i=-6;i<=6;i++){const p=barPos(S.along,S.c+i*BARR.gap/8);burst(p.x,p.y,'#8cf2ff',4,.8)}
  return;
 }
 if(alive.length<S.gens.length&&!S.half){S.half=true;status('UN GENERATORE ABBATTUTO · DISTRUGGI ANCHE L’ALTRO',2400)}
 // le navi restano sulla linea della barriera e seguono il giocatore di lato
 if(state==='play'){const d=side-S.c;S.c+=Math.max(-BARR.follow*dt,Math.min(BARR.follow*dt,d))}
 for(const e of alive){const p=barPos(S.along,S.c+e.slot*BARR.gap/2);e.x=p.x;e.y=p.y;e.vx=e.vy=0}
 // la barriera non si attraversa
 if(state!=='play'||player.destroyed)return;
 const lim=S.along-player.r-8;
 if(along>lim&&along<S.along+260){
  const va=player.vx*ax+player.vy*ay,push=lim-along;
  player.x+=ax*push;player.y+=ay*push;
  const nv=-Math.max(140,Math.abs(va)*.6);player.vx+=ax*(nv-va);player.vy+=ay*(nv-va);
  if(BAR.bumpCd<=0){
   BAR.bumpCd=.7;burst(player.x+ax*14,player.y+ay*14,'#8cf2ff',14,1);
   noise(.25,.04,2600);tone(90,.25,'sawtooth',.03,50);
   status('BARRIERA D’ENERGIA · DISTRUGGI LE NAVI GENERATRICI',1800);
   damage(BARR.bump,false);
  }
 }
}
// disegno della barriera (nel mondo, sotto le navi)
function barSpDraw(){
 const S=BAR.sp;if(!S||!S.on||!S.gens)return;
 const alive=S.gens.filter(e=>e.hp>0&&enemies.includes(e));if(!alive.length)return;
 const now=performance.now()/1000,{ax,ay}=barAxes();
 const center=barPos(S.along,S.c),span=BARR.gap/2+2200;
 ctx.save();ctx.translate(center.x,center.y);ctx.rotate(Math.atan2(ay,ax));
 barDrawField(0,-span,span,now,alive.length<2?.42+.22*Math.abs(Math.sin(now*17)):1);
 ctx.restore();
}
// le navi generatrici: più grandi, con l'emettitore che pulsa
function barDrawGen(e){
 const now=performance.now()/1000,p=.5+.5*Math.sin(now*6+e.slot);
 ctx.save();ctx.translate(e.x,e.y);
 ctx.globalCompositeOperation='lighter';
 const g=ctx.createRadialGradient(0,0,4,0,0,58);g.addColorStop(0,`rgba(180,245,255,${.65+.3*p})`);g.addColorStop(.35,`rgba(80,200,255,${.28+.2*p})`);g.addColorStop(1,'rgba(80,200,255,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,58,0,6.283);ctx.fill();
 ctx.globalCompositeOperation='source-over';
 ctx.strokeStyle=`rgba(140,242,255,${.5+.4*p})`;ctx.lineWidth=2;
 for(let k=0;k<3;k++){const a=now*1.6+k*2.094;ctx.beginPath();ctx.arc(0,0,40,a,a+1.2);ctx.stroke()}
 ctx.restore();
 ctx.save();ctx.translate(e.x,e.y);ctx.scale(1.45,1.45);ctx.translate(-e.x,-e.y);
 barOrig.drawEnemy(e);
 ctx.restore();
 ctx.save();ctx.fillStyle='#9fefff';ctx.font='700 11px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.fillText('GENERATORE',e.x,e.y-62);ctx.restore();
}

// ================================================================ 2) scritta dell'atterraggio
let barCall=null;
function barCallEl(){
 if(barCall||typeof document==='undefined'||!document.createElement||!document.body)return barCall;
 barCall=document.createElement('div');barCall.id='landCall';barCall.className='land-call hidden';
 barCall.innerHTML='<b></b><small></small>';document.body.appendChild(barCall);return barCall;
}
function barCallUpdate(){
 let on=false,d=0;
 if(state==='play'&&!paused&&world&&player&&!player.destroyed&&!(arrivalRemaining>0)){
  d=Math.hypot(world.x-player.x,world.y-player.y);
  const zone=world.r+(typeof GUIDA!=='undefined'?GUIDA.zone:160);
  on=d<world.r+BARR.call&&d>zone;
 }
 const el=barCallEl();if(!el)return;
 if(on!==BAR.callOn){
  BAR.callOn=on;el.classList.toggle('hidden',!on);
  if(on){
   el.querySelector('b').textContent=barTr('ENTRA NEL PIANETA PER L’ATTERRAGGIO');
   tone(880,.1,'sine',.02);tone(1175,.16,'sine',.02,0,.12);
  }
 }
 if(on){const t=el.querySelector('small'),txt=Math.max(0,Math.round((d-world.r)*18)).toLocaleString('it-IT')+' KM';if(t.textContent!==txt)t.textContent=txt}
}

// ================================================================ 3) terra
function barGroundOk(x){
 if(typeof pfGroundAt!=='function')return false;
 const g=pfGroundAt(x);if(g===null)return false;
 for(const dx of[-110,-60,40,90]){const h=pfGroundAt(x+dx);if(h===null||Math.abs(h-g)>4)return false}
 return true;
}
function barPlan(){
 BAR.wall=null;BAR.plan=[];
 if(!pf||!pf.arenaX)return;
 const[a,b]=BARR.groundCount,n=a+Math.floor(Math.random()*(b-a+1)),L=pf.arenaX;
 for(let i=0;i<n;i++){
  const lo=BARR.groundFrom+(BARR.groundTo-BARR.groundFrom)*i/n,hi=BARR.groundFrom+(BARR.groundTo-BARR.groundFrom)*(i+1)/n;
  BAR.plan.push(L*(lo+Math.random()*(hi-lo)*.8));
 }
}
function barGroundSpawn(at){
 const P=pf.pilot;
 let x=P.x+BARR.ahead;const pg=pfGroundAt(P.x)??P.y;
 for(let k=0;k<30&&x<pf.arenaX-500;k++,x+=40){
  if(!barGroundOk(x)||!barGroundOk(x-80)||Math.abs(pfGroundAt(x)-pg)>40)continue;
  const g=pfGroundAt(x),ex=x-80,hp=BARR.soldierHp+BARR.soldierHpDiff*pf.p.difficulty;
  const e={type:'soldato',x:ex,y:g,w:22,h:48,vx:0,vy:0,ground:true,hp,max:hp,fire:1.4,range:1e9,speed:0,run:0,hit:0,face:-1,aim:Math.PI,locked:null,barr:true};
  pf.enemies.push(e);
  BAR.wall={x,g,on:true,t:0,e};
  pfStatus('SOLDATO DELLA BARRIERA · ELIMINALO PER PASSARE',3200);
  pfText(ex,g-80,'BARRIERA D’ENERGIA','#8cf2ff');
  tone(140,.5,'sawtooth',.03,280);noise(.4,.03,1800);
  return true;
 }
 return false;
}
function barGroundUpdate(dt){
 if(!pf||state!=='platform'||pf.phase==='vittoria')return;
 const P=pf.pilot,W0=BAR.wall;
 BAR.zapCd=Math.max(0,BAR.zapCd-dt);
 if(!W0){
  if(pf.phase==='missione'&&!pf.under&&P.visible&&BAR.plan.length&&P.x>BAR.plan[0]-BARR.ahead-200){
   const at=BAR.plan.shift();
   // terreno non adatto (burroni, pareti): si riprova un po' più avanti
   if(!barGroundSpawn(at)&&P.x+1300<pf.arenaX-500)BAR.plan.unshift(P.x+900);
  }
  return;
 }
 W0.t+=dt;
 if(W0.on&&(W0.e.hp<=0||!pf.enemies.includes(W0.e))){
  W0.on=false;
  for(let y=W0.g-20;y>W0.g-560;y-=50)pfBurst(W0.x,y,'#8cf2ff',4,.9);
  pfStatus('BARRIERA DISATTIVATA · AVANTI',2200);tone(660,.14,'sine',.03,990);tone(990,.3,'sine',.025,1320,.12);
  BAR.wall=null;return;
 }
 if(pf.under)return;
 // il pilota non passa (né a piedi né col jetpack)
 if(P.visible&&P.x>W0.x-18&&P.x<W0.x+120){
  P.x=W0.x-18;if(P.vx>0)P.vx=-160;
  if(BAR.zapCd<=0){BAR.zapCd=.8;pfBurst(W0.x,P.y-30,'#8cf2ff',10,.9);noise(.2,.035,2600);tone(90,.2,'sawtooth',.025,50);pfStatus('BARRIERA D’ENERGIA · ELIMINA IL SOLDATO',1600)}
 }
}
function barDrawField(x,top,bottom,now,strength=1){
 const fl=(.8+.2*Math.sin(now*11))*strength;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createLinearGradient(x-48,0,x+48,0);g.addColorStop(0,'rgba(60,180,255,0)');g.addColorStop(.3,`rgba(80,200,255,${.22*fl})`);g.addColorStop(.5,`rgba(140,235,255,${.62*fl})`);g.addColorStop(.7,`rgba(80,200,255,${.22*fl})`);g.addColorStop(1,'rgba(60,180,255,0)');
 ctx.fillStyle=g;ctx.fillRect(x-48,top,96,bottom-top);
 // trama esagonale leggera (righe oblique che scorrono)
 ctx.strokeStyle=`rgba(160,240,255,${.22*fl})`;ctx.lineWidth=1;ctx.beginPath();
 for(let yy=bottom-((now*40)%24);yy>top;yy-=24){ctx.moveTo(x-22,yy);ctx.lineTo(x,yy-12);ctx.lineTo(x+22,yy)}
 ctx.stroke();
 ctx.fillStyle=`rgba(235,255,255,${.95*fl})`;ctx.fillRect(x-2.5,top,5,bottom-top);
 // scariche
 ctx.strokeStyle=`rgba(190,250,255,${.7*fl})`;ctx.lineWidth=1.4;
 ctx.beginPath();let y=bottom;ctx.moveTo(x,y);while(y>top){y=Math.max(top,y-24);ctx.lineTo(x+Math.sin(y*.27+now*37)*10,y)}ctx.stroke();
 // anelli che salgono
 for(let i=0;i<4;i++){const t=(now*.5+i/4)%1,yy=bottom-(bottom-top)*t;ctx.fillStyle=`rgba(200,250,255,${.5*(1-t)})`;ctx.fillRect(x-14,yy-2,28,4)}
 ctx.restore();
}
function barDrawWall(W0,now){
 const k=Math.min(1,W0.t/.5),top=W0.g-(W0.g+40)*k,x=W0.x;
 barDrawField(x,top,W0.g,now);
 ctx.save();ctx.fillStyle='#1c2a36';ctx.fillRect(x-16,W0.g-12,32,12);
 ctx.fillStyle='#8cf2ff';ctx.fillRect(x-12,W0.g-14,24,3);ctx.restore();
}
function barDrawSoldierPack(e,now){
 const p=.5+.5*Math.sin(now*7);
 ctx.save();ctx.globalCompositeOperation='lighter';
 const x=e.x+8,y=e.y-34,g=ctx.createRadialGradient(x,y,1,x,y,18);g.addColorStop(0,`rgba(200,250,255,${.8*p+.2})`);g.addColorStop(1,'rgba(80,200,255,0)');
 ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,18,0,6.283);ctx.fill();
 // filo d'energia tra lo zaino e la barriera
 const W0=BAR.wall;if(W0&&W0.on&&W0.e===e&&pf.phase!=='vittoria'){ctx.strokeStyle=`rgba(140,242,255,${.35+.4*p})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo((x+W0.x)/2,y-30,W0.x,W0.g-120);ctx.stroke()}
 ctx.restore();
}

// ================================================================ aggancio
startGame=function(...a){const r=barOrig.startGame.apply(this,a);try{barSpReset()}catch(e){console.error(e)}return r};
startPlatform=function(...a){const r=barOrig.startPlatform.apply(this,a);try{barPlan()}catch(e){console.error(e)}return r};
update=function(dt){
 const r=barOrig.update.apply(this,arguments);
 try{if((state==='play'||state==='dying')&&!paused)barSpUpdate(dt);barCallUpdate()}catch(e){console.error(e)}
 return r;
};
updatePlatform=function(dt){
 const r=barOrig.updatePlatform.apply(this,arguments);
 try{barGroundUpdate(dt)}catch(e){console.error(e)}
 return r;
};
drawSupplies=function(){try{barSpDraw()}catch(e){console.error(e)}return barOrig.drawSupplies.apply(this,arguments)};
drawEnemy=function(e){if(e&&e.gen){try{return barDrawGen(e)}catch(err){console.error(err)}}return barOrig.drawEnemy(e)};
// a terra i nemici si disegnano con gEnemy (grafica2.js) o, senza quella, con pfDrawEnemy
function barWrapDraw(orig){
 return function(e,now){
  if(e&&e.barr&&!barWrapDraw.busy){
   barWrapDraw.busy=true;
   try{
    try{const W0=BAR.wall;if(W0&&W0.on&&W0.e===e&&pf.phase!=='vittoria')barDrawWall(W0,now)}catch(err){console.error(err)}
    const r=orig.call(this,e,now);
    try{barDrawSoldierPack(e,now)}catch(err){console.error(err)}
    return r;
   }finally{barWrapDraw.busy=false}
  }
  return orig.call(this,e,now);
 };
}
pfDrawEnemy=barWrapDraw(barOrig.pfDrawEnemy);
if(barOrig.gEnemy)gEnemy=barWrapDraw(barOrig.gEnemy);

try{
 if(typeof document!=='undefined'&&document.head&&document.createElement){
  const st=document.createElement('style');
  st.textContent='.land-call{position:fixed;left:50%;top:63%;transform:translateX(-50%);z-index:6;pointer-events:none;text-align:center;font-family:"Chakra Petch",sans-serif;animation:barBlink 1s steps(1,end) infinite}'+
   '.land-call.hidden{display:none}.land-call b{display:block;padding:9px 22px;border:1px solid rgba(125,255,170,.7);background:rgba(3,26,18,.72);color:#b9ffd2;font-size:clamp(14px,2.2vw,24px);letter-spacing:3px;text-shadow:0 0 12px rgba(125,255,170,.9)}'+
   '.land-call small{display:block;margin-top:5px;font-size:11px;letter-spacing:3px;color:#8cf2c4}'+
   '@keyframes barBlink{0%{opacity:1}50%{opacity:.18}}'+
   'body.touch .land-call{top:60%}body.touch .land-call b{font-size:12px;padding:5px 12px;letter-spacing:2px}';
  document.head.appendChild(st);
 }
}catch(e){}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["BARRIERA D’ENERGIA · DISTRUGGI LE DUE NAVI GENERATRICI","ENERGY BARRIER · DESTROY BOTH GENERATOR SHIPS","BARRIÈRE D’ÉNERGIE · DÉTRUIS LES DEUX VAISSEAUX GÉNÉRATEURS","BARRERA DE ENERGÍA · DESTRUYE LAS DOS NAVES GENERADORAS","ЭНЕРГОБАРЬЕР · УНИЧТОЖЬ ОБА КОРАБЛЯ-ГЕНЕРАТОРА","能量屏障 · 摧毁两艘发生器飞船","エネルギー障壁 · 発生艦を2隻とも破壊せよ"],
  ["BARRIERA D’ENERGIA · DISTRUGGI LE NAVI GENERATRICI","ENERGY BARRIER · DESTROY THE GENERATOR SHIPS","BARRIÈRE D’ÉNERGIE · DÉTRUIS LES VAISSEAUX GÉNÉRATEURS","BARRERA DE ENERGÍA · DESTRUYE LAS NAVES GENERADORAS","ЭНЕРГОБАРЬЕР · УНИЧТОЖЬ КОРАБЛИ-ГЕНЕРАТОРЫ","能量屏障 · 摧毁发生器飞船","エネルギー障壁 · 発生艦を破壊せよ"],
  ["UN GENERATORE ABBATTUTO · DISTRUGGI ANCHE L’ALTRO","ONE GENERATOR DOWN · DESTROY THE OTHER ONE","UN GÉNÉRATEUR ABATTU · DÉTRUIS L’AUTRE","UN GENERADOR DERRIBADO · DESTRUYE EL OTRO","ОДИН ГЕНЕРАТОР СБИТ · УНИЧТОЖЬ ВТОРОЙ","一个发生器已击毁 · 摧毁另一个","発生艦1隻撃破 · もう1隻も破壊せよ"],
  ["BARRIERA DISATTIVATA · VIA LIBERA","BARRIER DOWN · PATH CLEAR","BARRIÈRE DÉSACTIVÉE · VOIE LIBRE","BARRERA DESACTIVADA · VÍA LIBRE","БАРЬЕР ОТКЛЮЧЁН · ПУТЬ СВОБОДЕН","屏障已解除 · 道路畅通","障壁解除 · 進路クリア"],
  ["BARRIERA DISATTIVATA · AVANTI","BARRIER DOWN · MOVE ON","BARRIÈRE DÉSACTIVÉE · AVANCE","BARRERA DESACTIVADA · ADELANTE","БАРЬЕР ОТКЛЮЧЁН · ВПЕРЁД","屏障已解除 · 前进","障壁解除 · 前進せよ"],
  ["SOLDATO DELLA BARRIERA · ELIMINALO PER PASSARE","BARRIER SOLDIER · TAKE HIM OUT TO GET THROUGH","SOLDAT DE LA BARRIÈRE · ÉLIMINE-LE POUR PASSER","SOLDADO DE LA BARRERA · ELIMÍNALO PARA PASAR","СОЛДАТ С БАРЬЕРОМ · УБЕЙ ЕГО, ЧТОБЫ ПРОЙТИ","屏障士兵 · 消灭他才能通过","障壁兵 · 倒さないと進めない"],
  ["BARRIERA D’ENERGIA · ELIMINA IL SOLDATO","ENERGY BARRIER · TAKE OUT THE SOLDIER","BARRIÈRE D’ÉNERGIE · ÉLIMINE LE SOLDAT","BARRERA DE ENERGÍA · ELIMINA AL SOLDADO","ЭНЕРГОБАРЬЕР · УБЕЙ СОЛДАТА","能量屏障 · 消灭士兵","エネルギー障壁 · 兵士を倒せ"],
  ["BARRIERA D’ENERGIA","ENERGY BARRIER","BARRIÈRE D’ÉNERGIE","BARRERA DE ENERGÍA","ЭНЕРГОБАРЬЕР","能量屏障","エネルギー障壁"],
  ["ENTRA NEL PIANETA PER L’ATTERRAGGIO","ENTER THE PLANET TO LAND","ENTRE DANS LA PLANÈTE POUR ATTERRIR","ENTRA EN EL PLANETA PARA ATERRIZAR","ВОЙДИ В ПЛАНЕТУ ДЛЯ ПОСАДКИ","进入行星进行着陆","惑星に入って着陸せよ"],
  ["GENERATORE","GENERATOR","GÉNÉRATEUR","GENERADOR","ГЕНЕРАТОР","发生器","発生装置"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}
