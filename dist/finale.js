// Frontiera Stellare — VITE, PILLOLA LIFEUP e PIANETA FINALE.
// Le vite sono 3 in tutto il gioco (massimo 5), valgono in entrambe le fasi e restano salvate.
// Una pillola LifeUP, rarissima, regala una vita. Senza vite è GAME OVER: si riparte da capo.
// Liberati tutti e cinque i pianeti si sblocca OMEGA, il pianeta finale con IMPERATORE OMEGA.

const VITE_START=3,VITE_MAX=5,LIFEUP_CHANCE={nemico:.008,roccia:.002,meteorite:.04,ribelle:.012};
function viteLoad(){const v=parseInt(localStorage.getItem('frontieraVite'),10);return Number.isFinite(v)&&v>0?Math.min(VITE_MAX,v):VITE_START}
let vite=viteLoad();
function viteSave(){localStorage.setItem('frontieraVite',String(vite));viteHud()}
function viteHud(){
 const txt='♥'.repeat(vite)+'♡'.repeat(Math.max(0,VITE_START-vite));
 let h=$('viteHud');
 if(!h&&$('hud')&&document.createElement){h=document.createElement('div');h.id='viteHud';h.style.cssText='position:absolute;left:28px;top:84px;font:700 13px "Chakra Petch",sans-serif;letter-spacing:.12em;color:#ff7a8a;text-shadow:0 0 8px rgba(255,80,100,.6);pointer-events:none';if($('hud').appendChild)$('hud').appendChild(h)}
 if(h)h.textContent='VITE '+txt;
 let m=$('mapVite');
 const mc=$('mapCredits');
 if(!m&&mc&&mc.parentNode&&document.createElement){m=document.createElement('span');m.id='mapVite';m.style.cssText='margin-left:14px;color:#ff7a8a;font-weight:700;letter-spacing:.1em';mc.parentNode.appendChild(m)}
 if(m)m.textContent='VITE '+txt;
}
// Fine delle vite: si recupera il 20% dei guadagni della partita.
function gameOverCarry(){return typeof eco!=='undefined'?Math.round(eco.earned*.2):0}
function viteGameOver(){
 const carry=gameOverCarry();
 vite=VITE_START;viteSave();
 if(typeof ecoReset==='function')ecoReset(carry);
 for(const k of ['frontieraPhaseOneComplete','frontieraPhaseTwoComplete','frontieraPianetiLiberati'])localStorage.setItem(k,'');
 phaseOneComplete=false;phaseTwoComplete=false;selected=0;
 finalLock();
 $('resultEyebrow').textContent='GAME OVER';$('resultTitle').textContent='HAI PERSO TUTTE LE VITE';
 $('resultText').textContent='L’Impero ha vinto questa guerra. Recuperi solo il 20% dei crediti guadagnati in questa partita. Potenziamenti e pianeti liberati sono azzerati e hai di nuovo 3 vite.';
 show('landBtn',false);$('returnBtn').querySelector('span').textContent='TORNA ALLA HOME';
}
function viteLose(){vite=Math.max(0,vite-1);viteSave();return vite}
function viteGain(){if(vite>=VITE_MAX)return false;vite++;viteSave();return true}

// ---- fase 1: una vita persa se la nave viene distrutta
const vOrig={finish,dropSupply,updateSupplies,drawSupplies,shatterMeteor,startPlatform,pfLoseLife,pfFinish,pfHitEnemy,pfUpdatePickups,pfDrawPickup,initMap};
finish=function(win){
 const before=state;vOrig.finish(win);if(state===before||win)return;
 if(viteLose()<=0)viteGameOver();else $('resultText').textContent+=` Hai perso una vita: ne restano ${vite}.`;
};
dropSupply=function(e){vOrig.dropSupply(e);if(vite<VITE_MAX&&Math.random()<(e.rock?LIFEUP_CHANCE.roccia:LIFEUP_CHANCE.nemico))pickups.push({x:e.x+16,y:e.y,kind:'vita',life:30,r:13})};
shatterMeteor=function(){if(meteor&&vite<VITE_MAX&&Math.random()<LIFEUP_CHANCE.meteorite)pickups.push({x:meteor.x,y:meteor.y,kind:'vita',life:30,r:13});vOrig.shatterMeteor()};
updateSupplies=function(dt){
 const v=[];
 for(const p of pickups){if(p.kind!=='vita')continue;p.life-=dt;const dx=player.x-p.x,dy=player.y-p.y,d=Math.hypot(dx,dy);if(d<150&&d>1){p.x+=dx/d*220*dt;p.y+=dy/d*220*dt}
  if(d<player.r+p.r){p.life=0;viteGain();status('LIFEUP · VITA EXTRA · VITE '+vite,2400);sfx('shield');tone(523,.12,'sine',.03);tone(784,.12,'sine',.03,0,.1);tone(1046,.3,'sine',.03,0,.2)}
  if(p.life>0)v.push(p)}
 pickups=pickups.filter(p=>p.kind!=='vita');vOrig.updateSupplies(dt);pickups.push(...v);
};
function lifeUpPill(c,x,y,t,s=1){
 c.save();c.translate(x,y);c.scale(s,s);c.rotate(Math.sin(t*2)*.3);
 c.shadowBlur=18;c.shadowColor='#7dff9a';
 const g=c.createLinearGradient(-14,0,14,0);g.addColorStop(0,'#2bd86a');g.addColorStop(.5,'#c8ffd8');g.addColorStop(.5,'#ff5a7a');g.addColorStop(1,'#c8183e');
 c.fillStyle=g;c.beginPath();c.moveTo(-6,-7);c.lineTo(6,-7);c.arc(6,0,7,-Math.PI/2,Math.PI/2);c.lineTo(-6,7);c.arc(-6,0,7,Math.PI/2,Math.PI*1.5);c.fill();
 c.shadowBlur=0;c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1.2;c.stroke();
 c.fillStyle='rgba(255,255,255,.7)';c.fillRect(-8,-5,10,2);
 c.restore();
 c.save();c.fillStyle='#d8ffe2';c.font='700 10px "Chakra Petch",sans-serif';c.textAlign='center';c.fillText('1UP',x,y-15*s);c.restore();
}
drawSupplies=function(){
 const v=pickups.filter(p=>p.kind==='vita');pickups=pickups.filter(p=>p.kind!=='vita');vOrig.drawSupplies();pickups.push(...v);
 const t=performance.now()/1000;for(const p of v)lifeUpPill(ctx,p.x,p.y,t,1.3);
};

// ---- fase 2: le vite del pilota sono le stesse del gioco
startPlatform=function(...a){vOrig.startPlatform(...a);if(typeof pf!=='undefined'&&pf)pf.lives=vite};
pfLoseLife=function(...args){vOrig.pfLoseLife(...args);if(pf){vite=Math.max(0,pf.lives);viteSave()}};
pfHitEnemy=function(e,n){const was=e.hp;vOrig.pfHitEnemy(e,n);if(was>0&&e.hp<=0&&vite<VITE_MAX&&Math.random()<LIFEUP_CHANCE.ribelle)pf.pickups.push({x:e.x,y:e.y-30,vy:-260,kind:'vita',life:25,ground:false})};
pfUpdatePickups=function(dt){
 const P=pf.pilot;
 if(P.visible&&P.hp>0){const pr=pfRect(P);for(const k of pf.pickups)if(k.kind==='vita'&&k.life>0&&pfOverlap(pr,{l:k.x-14,r:k.x+14,t:k.y-14,b:k.y+14})){k.life=0;viteGain();pf.lives=vite;pfStatus('LIFEUP · VITA EXTRA',2200);pfText(k.x,k.y-20,'+1 VITA','#8df1ad');sfx('shield');tone(523,.12,'sine',.03);tone(784,.12,'sine',.03,0,.1);tone(1046,.3,'sine',.03,0,.2)}}
 pf.pickups=pf.pickups.filter(k=>k.life>0);vOrig.pfUpdatePickups(dt);
};
pfDrawPickup=function(k,now){if(k.kind==='vita')lifeUpPill(ctx,k.x,k.y-4,now,1.15);else vOrig.pfDrawPickup(k,now)};

// ---- pianeta finale
const FINAL_PLANET={name:'OMEGA',code:'Ω–00',x:90,y:16,color:'#7a1438',glow:'#ff2a6a',theme:'abisso',boss:'omega',difficulty:7,distance:720000,threat:'APOCALITTICA',reward:'40.000 CR',desc:'La cittadella dell’Impero, sospesa sopra un abisso cremisi. Qui si decide il destino della Repubblica.',final:true};
const BASE_PLANETS=planets.filter(p=>!p.final).map(p=>p.code);
function liberati(){return(localStorage.getItem('frontieraPianetiLiberati')||'').split(',').filter(Boolean)}
function finalUnlocked(){const l=liberati();return BASE_PLANETS.every(c=>l.includes(c))}
function finalLock(){
 const i=planets.indexOf(FINAL_PLANET),want=finalUnlocked();
 if(want&&i<0)planets.push(FINAL_PLANET);
 if(!want&&i>=0){planets.splice(i,1);if(selected>=planets.length)selected=0}
 if(typeof initMap==='function'&&$('starMap')&&$('starMap').appendChild)vOrig.initMap();
}
pfFinish=function(win){
 const before=state,p=pf&&pf.p;vOrig.pfFinish(win);if(state===before)return;
 if(!win){if(vite<=0)viteGameOver();return}
 const wasOpen=finalUnlocked(),l=liberati();if(p&&!l.includes(p.code)&&!p.final){l.push(p.code);localStorage.setItem('frontieraPianetiLiberati',l.join(','))}
 if(p&&p.final){$('resultEyebrow').textContent='LA REPUBBLICA È SALVA';$('resultText').textContent='IMPERATORE OMEGA è caduto e l’Impero è sconfitto. La Repubblica Intergalattica è salva: sei una leggenda.'}
 else if(!wasOpen&&finalUnlocked()){finalLock();$('resultText').textContent+=' TUTTI I PIANETI SONO LIBERI: SI È SBLOCCATO IL PIANETA FINALE OMEGA.'}
 else $('resultText').textContent+=` Pianeti liberati: ${l.filter(c=>BASE_PLANETS.includes(c)).length} su ${BASE_PLANETS.length}.`;
};

// Tema del pianeta finale: stessi effetti della tempesta, colori cremisi.
PF_THEMES.abisso=Object.assign({},PF_THEMES.tempesta,{mat:'abisso',name:'ABISSO',brief:'La cittadella dell’Impero galleggia sopra un abisso cremisi: sotto le piattaforme c’è il vuoto.',banner:'CITTADELLA OMEGA · ULTIMA BATTAGLIA',
 sky:['#12020a','#3a0a1e','#8a1a3a'],far:'#2a0614',near:'#3a0a1c',rim:'#ff8aa8',top:'#a02048',body:['#3a0a1c','#10020a'],edge:'#ffb0c4',haze:'#ff5a7a',fall:'PRECIPITATO NELL’ABISSO',splash:['#ffd0dc','#c8183e']});
if(typeof G_MAT!=='undefined')G_MAT.abisso=Object.assign({},G_MAT.tempesta,{dark:[30,8,16],mid:[74,22,38],light:[146,54,78],speck:[255,200,214],top:[150,30,62],top2:[255,120,146],lip:[90,20,42],rim:'#ff8aa8',liquid:['rgba(240,80,120,0)','#5a0f2a','#12020a'],foam:'rgba(255,190,210,.5)',grade:['#ffe2e8','#8a6070'],sun:[255,150,170]});
if(typeof PL_THEMES!=='undefined')PL_THEMES.abisso={gas:true,bands:['#1a0610','#5a0f2a','#a0204a','#ff5a7a','#3a0a1a','#7a1838','#e0406a'],clouds:.66,cloudAmt:.3,ice:2,atm:[255,80,120]};
PF_BOSS.omega={id:'omega',name:'IMPERATORE OMEGA',sub:'SIGNORE DELL’IMPERO',brief:'il signore dell’Impero nella sua armatura da guerra',w:150,h:240,hp:1.6,speed:1.45,dmg:1.5,gun:{x:44,y:178,len:76},pod:{x:-34,y:250},moves:['raffica','carica','missili','onda','passi']};

// IMPERATORE OMEGA: armatura nera e oro, ali di energia, aureola, lancia al plasma, scudo.
function bOmega(c,B,now){
 const walk=B.legT,black='#272b43',gold='#e4b951',crim='#ff2a5a',jump=B.state==='onda'&&B.t<.5?B.t*16:0,rage=B.rage;
 c.save();c.translate(0,jump);
 // Alette del propulsore a disco, aperte durante la raffica e in modalità furia.
 const spread=(rage?.32:.09)+Math.sin(now*2)*.07+bRecoil(B)*.15;
 for(const [x,side] of [[-48,-1],[36,1]]){
  c.save();c.translate(x,-207);c.scale(side,1);c.rotate(-spread);
  bArmor(c,[[0,-14],[40,-48],[96,-34],[79,3],[36,37],[3,20]],
   [[14,-11],[45,-37],[82,-29],[71,-2],[37,25],[15,14]],'#232742','#5c6089','#e2d7a8');
  bPlate(c,[[48,-30],[81,-27],[70,-6],[51,4],[35,-3]],bMetal(c,45,-30,74,7,'#9c2849'),'#431731','#ff9b9b');
  bVents(c,22,1,3,19,crim,rage?.92:.55);
  c.restore();
 }
 // ali di energia dietro le spalle
 c.save();c.globalCompositeOperation='lighter';
 for(let i=0;i<4;i++){const a=-2.2-i*.32+Math.sin(now*2+i)*.06,l=150-i*18,ox=-18,oy=-212;c.save();c.translate(ox,oy);c.rotate(a);const g=c.createLinearGradient(0,0,l,0);g.addColorStop(0,rage?'rgba(255,60,90,.75)':'rgba(255,60,110,.55)');g.addColorStop(1,'rgba(255,60,110,0)');c.fillStyle=g;c.beginPath();c.moveTo(0,-5);c.quadraticCurveTo(l*.5,-16,l,0);c.quadraticCurveTo(l*.5,6,0,5);c.closePath();c.fill();c.restore()}
 c.restore();
 // Aureola a doppio anello con segmenti che ruotano in senso opposto.
 c.save();c.translate(36,-282);c.rotate(now*.8);c.strokeStyle='rgba(255,210,120,.85)';c.lineWidth=3;c.shadowBlur=18;c.shadowColor='#ffcf6a';c.beginPath();c.arc(0,0,30,0,6.28);c.stroke();c.lineWidth=2;for(let i=0;i<12;i++){c.rotate(Math.PI/6);c.beginPath();c.moveTo(34,0);c.lineTo(42,0);c.stroke()}c.restore();
 c.save();c.translate(36,-282);c.rotate(-now*.55);
 for(let i=0;i<4;i++){
  const a=i*Math.PI*.5;
  c.beginPath();c.arc(0,0,24,a,a+1.15);
  c.lineWidth=2;c.strokeStyle=rage?'#ff9aa9':'#ffe5a8';c.stroke();
 }
 c.restore();
 // mantello
 const wv=Math.sin(now*3)*8;c.fillStyle=bGrad(c,0,-220,0,-50,['#5a0a20','#2a0410']);c.beginPath();c.moveTo(-40,-214);c.lineTo(10,-220);c.quadraticCurveTo(-20+wv,-130,-30+wv,-50);c.lineTo(-90+wv*1.4,-46);c.quadraticCurveTo(-70,-140,-40,-214);c.fill();c.strokeStyle='rgba(255,90,120,.5)';c.lineWidth=1.5;c.stroke();
 // scudo (braccio posteriore)
 c.save();c.translate(-46,-150);c.rotate(.12+Math.sin(walk)*.05);
 bPlate(c,[[-22,-40],[22,-44],[26,30],[0,56],[-26,30]],bMetal(c,-22,-44,26,56,black,.05),gold,'rgba(255,230,170,.5)');
 bPlate(c,[[-15,-32],[15,-35],[18,25],[0,45],[-18,25]],bMetal(c,-15,-35,18,45,'#353143'),gold);
 bPlate(c,[[0,-23],[12,4],[0,29],[-12,4]],bGrad(c,0,-23,0,29,['#ffe0a0',crim,'#551531']),gold);
 bTrace(c,[[-13,-15],[-7,-6],[-13,4],[-9,17]],'#e9b456',1.2);
 bTrace(c,[[13,-15],[7,-6],[13,4],[9,17]],'#e9b456',1.2);
 bRivets(c,[[-15,-32],[15,-35],[18,25],[-18,25],[0,43]]);
 c.restore();
 // gambe digitigrade
 for(const side of [-1,1]){const k=side<0?-.4:0,sw=Math.sin(walk+(side<0?Math.PI:0))*12,hx=side*20,kx=hx+20+sw*.4,ky=-64,ax=hx-8+sw,ay=-22;
  bPlate(c,[[hx-12,-118],[hx+14,-114],[kx+10,ky-4],[kx-8,ky+6]],bMetal(c,hx,-118,kx,ky,black,k),gShade(gold,k-.1),'rgba(255,230,170,.35)');
  bPlate(c,[[kx-8,ky],[kx+8,ky-2],[ax+8,ay],[ax-8,ay+2]],bMetal(c,kx,ky,ax,ay,black,k-.05),gShade(gold,k-.1));
  bGlow(c,kx,ky,3,crim,10);
  bPlate(c,[[ax-26,0],[ax-18,-16],[ax+16,-18],[ax+34,-4],[ax+40,0]],bMetal(c,ax,-18,ax,0,black,k-.1),gShade(gold,k));
  c.fillStyle=gShade(gold,k-.2);for(const tx of [ax+30,ax+40]){c.beginPath();c.moveTo(tx-6,-2);c.lineTo(tx+8,0);c.lineTo(tx-6,2);c.fill()}}
 // busto a V
 const torso=[[-44,-222],[54,-230],[64,-190],[34,-120],[-30,-116],[-56,-180]];
 bPlate(c,torso,bMetal(c,-44,-230,40,-116,black),gold);
 bPlate(c,[[-34,-214],[46,-220],[52,-196],[-42,-188]],bMetal(c,-34,-220,52,-188,black,.12),'rgba(0,0,0,.5)','rgba(255,240,200,.4)');
 c.strokeStyle=gold;c.lineWidth=2.4;c.beginPath();c.moveTo(-40,-180);c.lineTo(4,-128);c.lineTo(50,-192);c.stroke();
 c.lineWidth=1.2;for(let i=0;i<3;i++){c.beginPath();c.moveTo(-30+i*6,-170+i*14);c.lineTo(40-i*6,-182+i*14);c.stroke()}
 for(const side of [-1,1]){
  const x=side*27;
  bTrace(c,[[x,-213],[x+side*9,-203],[x+side*7,-192],[x,-187]],'#ffd99a',1.6);
  bGlow(c,x,-187,2,rage?'#fff0e2':'#ff6383',7);
 }
 // nucleo cremisi a diamante
 const pulse=.6+.4*Math.sin(now*(B.state==='stordito'?16:5)),s=14+pulse*4+(B.state==='stordito'?5:0),cx=6,cy=-172;
 c.save();c.shadowBlur=26;c.shadowColor=crim;const cg=c.createRadialGradient(cx,cy,1,cx,cy,s);cg.addColorStop(0,'#ffffff');cg.addColorStop(.35,'#ffb0c4');cg.addColorStop(1,'#8a0a28');c.fillStyle=cg;c.beginPath();c.moveTo(cx,cy-s);c.lineTo(cx+s*.75,cy);c.lineTo(cx,cy+s);c.lineTo(cx-s*.75,cy);c.closePath();c.fill();c.restore();
 c.strokeStyle=gold;c.lineWidth=2;c.beginPath();c.moveTo(cx,cy-s-5);c.lineTo(cx+s*.75+5,cy);c.lineTo(cx,cy+s+5);c.lineTo(cx-s*.75-5,cy);c.closePath();c.stroke();
 // spallacci con punte
 for(const [x,k] of [[-40,-.3],[50,0]]){
  bArmor(c,[[x-25,-219],[x-13,-236],[x+15,-239],[x+34,-222],[x+27,-200],[x-23,-197]],
   [[x-19,-218],[x-9,-231],[x+12,-232],[x+26,-220],[x+20,-207],[x-15,-206]],
   black,'#798aa9','#fae9bc',k);
  bTrace(c,[[x-17,-208],[x-2,-222],[x+21,-214]],gold,2.3);
 }
 // pod missilistico sulla schiena
 bPod(c,-50,-262,3,B.state==='missili',black);
 // elmo con corona
 bPlate(c,[[16,-262],[58,-258],[64,-236],[56,-226],[20,-226]],bMetal(c,16,-262,64,-226,black,.08),gold,'rgba(255,240,200,.45)');
 // Corna ricurve, casco a piastre e maschera triangolare.
 for(const side of [-1,1]){
  c.save();c.translate(38,-254);c.scale(side,1);
  c.beginPath();c.moveTo(13,6);c.quadraticCurveTo(32,-2,40,-39);
  c.quadraticCurveTo(26,-27,19,-22);c.quadraticCurveTo(24,-14,9,-8);c.closePath();
  c.fillStyle=bMetal(c,16,-34,31,2,gold);c.fill();
  c.strokeStyle='#ffe2a0';c.lineWidth=1.5;c.stroke();c.restore();
 }
 bGlow(c,36,-286,3,'#ffe08a',10);
 c.fillStyle='#05050a';c.fillRect(30,-250,32,8);
 c.save();c.shadowBlur=16;c.shadowColor=crim;c.fillStyle=B.state==='carica'&&B.t<.8&&Math.floor(now*16)%2?'#ffffff':(rage?'#ffd0dc':crim);c.fillRect(32,-248,28,3.5);c.restore();
 bPlate(c,[[32,-240],[43,-243],[58,-240],[51,-227],[37,-228]],bMetal(c,34,-244,57,-225,'#8a9ab1'),'#1d2842','#f3ead6');
 bTrace(c,[[42,-239],[44,-232],[51,-231]],'#323952',1.4);
 // lancia al plasma (segue la mira)
 c.save();c.translate(44,-178);c.rotate(bArmAngle(B));c.translate(-10*bRecoil(B),0);
 bEllipse(c,0,0,17,17,bMetal(c,-17,-17,17,17,black,.1),gold);
 bPlate(c,[[8,-9],[52,-8],[60,-12],[78,-4],[78,4],[60,12],[52,8],[8,9]],bMetal(c,8,-12,8,12,black,.12),gold,'rgba(255,240,200,.45)');
 c.strokeStyle=crim;c.lineWidth=2;for(let i=0;i<4;i++){c.beginPath();c.moveTo(20+i*8,-8);c.lineTo(24+i*8,8);c.stroke()}
 const h=B.state==='raffica'?Math.min(1,B.t/.45):.3+.2*Math.sin(now*6);
 c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(255,80,120,${.4+h*.5})`;c.shadowBlur=14+h*20;c.shadowColor=crim;c.beginPath();c.moveTo(78,-5);c.lineTo(96+h*10,0);c.lineTo(78,5);c.closePath();c.fill();c.restore();
 c.restore();
 // braci che si staccano dalle ali
 if(pf?.boss===B&&Math.random()<.4)pf.fx.push({x:B.x+(-30+Math.random()*-80)*B.face,y:B.y-200-Math.random()*60,vx:(Math.random()-.5)*30,vy:-20-Math.random()*40,life:.9,max:.9,color:Math.random()<.5?'#ff5a7a':'#ffd08a',r:1.5+Math.random()*1.5});
 c.restore();
}
if(typeof BOSS_DRAW!=='undefined')BOSS_DRAW.omega=bOmega;

finalLock();viteHud();
