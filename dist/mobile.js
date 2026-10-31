// Stellar Frontier — MODALITÀ MOBILE.
// Se il browser è su un cellulare o un tablet compaiono un pad semitrasparente e i pulsanti.
// Fase 1 (spazio): il pad muove la nave e ne orienta la prua; pulsanti LASER, MISSILE, BARRIERA, POST-BRUCIATORE, FRENO.
// Fase 2 (a terra): il pad muove il pilota (su = salto, giù = abbassati); pulsanti FUOCO (mira automatica), SALTO/JETPACK, GRANATA, SCUDO.
// I comandi scrivono negli stessi ingressi di tastiera e mouse (keys, mouse), quindi il gioco non cambia.

function touchDetect(){
 try{if(/[?&]touch=1/.test(location.search))return true}catch(e){}
 const coarse=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches;
 const ua=typeof navigator!=='undefined'&&/Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(navigator.userAgent||'');
 const tp=typeof navigator!=='undefined'&&navigator.maxTouchPoints>0;
 return ua||coarse&&tp;
}
const touch={on:false,pad:{id:null,x:0,y:0,cx:0,cy:0,r:60},btn:{},mine:new Set(),mouseMine:{down:false,right:false}};
const TOUCH_SPACE=[['fire','LASER','✸'],['missile','MISSILE','➶'],['shield','BARRIERA','◎'],['boost','POST-BRUCIATORE','»'],['brake','FRENO','‖']];
const TOUCH_GROUND=[['fire','FUOCO','✸'],['jump','SALTO','⤒'],['grenade','GRANATA','●'],['shield','SCUDO','◎']];

function touchBuild(){
 if(typeof document==='undefined'||!document.createElement||!document.body||$('touchUi'))return;
 const ui=document.createElement('div');ui.id='touchUi';ui.className='touch-ui hidden';
 const btns=(list,id)=>`<div id="${id}" class="touch-btns">`+list.map(([k,label,icon])=>`<button class="touch-btn tb-${k}" data-k="${k}" aria-label="${label}"><b>${icon}</b><span>${label}</span></button>`).join('')+'</div>';
 ui.innerHTML='<div id="touchPad" class="touch-pad"><i id="touchKnob" class="touch-knob"></i></div>'+btns(TOUCH_SPACE,'touchSpace')+btns(TOUCH_GROUND,'touchGround');
 document.body.appendChild(ui);
 const rot=document.createElement('div');rot.id='touchRotate';rot.className='touch-rotate hidden';rot.innerHTML='<b>⟳</b><span>Ruota il telefono in orizzontale</span>';document.body.appendChild(rot);
 // pad
 const pad=$('touchPad');
 const padMove=e=>{const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2;let dx=e.clientX-cx,dy=e.clientY-cy;const d=Math.hypot(dx,dy);if(d>R){dx=dx/d*R;dy=dy/d*R}touch.pad.x=dx/R;touch.pad.y=dy/R;$('touchKnob').style.transform=`translate(${dx}px,${dy}px)`};
 pad.addEventListener('pointerdown',e=>{e.preventDefault();touch.pad.id=e.pointerId;try{pad.setPointerCapture(e.pointerId)}catch(_){}padMove(e)});
 pad.addEventListener('pointermove',e=>{if(e.pointerId===touch.pad.id){e.preventDefault();padMove(e)}});
 const padEnd=e=>{if(e.pointerId!==touch.pad.id)return;touch.pad.id=null;touch.pad.x=touch.pad.y=0;$('touchKnob').style.transform=''};
 pad.addEventListener('pointerup',padEnd);pad.addEventListener('pointercancel',padEnd);
 // pulsanti: tenuti premuti finché il dito resta sopra
 for(const b of ui.querySelectorAll('.touch-btn')){
  const k=b.dataset.k;
  b.addEventListener('pointerdown',e=>{e.preventDefault();try{b.setPointerCapture(e.pointerId)}catch(_){}touch.btn[k]=true;b.classList.add('on');touchPress(k)});
  const up=e=>{touch.btn[k]=false;b.classList.remove('on')};
  b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);
  b.addEventListener('contextmenu',e=>e.preventDefault());
 }
 ui.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});
}
// azioni una tantum
function touchPress(k){
 if(paused)return;
 if(k==='missile'&&state==='play'&&typeof launchMissile==='function')launchMissile();
 if(k==='grenade'&&state==='platform'&&typeof pfThrowGrenade==='function')pfThrowGrenade();
}
function touchKey(k,on){if(on){keys[k]=true;touch.mine.add(k)}else if(touch.mine.has(k)){keys[k]=false;touch.mine.delete(k)}}
function touchMouse(k,on){if(on){mouse[k]=true;touch.mouseMine[k]=true}else if(touch.mouseMine[k]){mouse[k]=false;touch.mouseMine[k]=false}}
// Mira automatica a terra: il ribelle vivo più vicino davanti al pilota, oppure il boss.
function touchGroundTarget(){
 const P=pf.pilot,s=pfScale(),VW=W/s;let best=null,bd=1e9;
 const consider=(x,y)=>{if(x<pf.cam.x-20||x>pf.cam.x+VW+20)return;const d=Math.hypot(x-P.x,(y-P.y)*1.4)+(Math.sign(x-P.x)===P.face?0:160);if(d<bd){bd=d;best={x,y}}};
 for(const e of pf.enemies||[])if(e.hp>0)consider(e.x,e.y-(e.h||30)/2);
 if(pf.boss&&!pf.boss.dead&&!pf.boss.gone&&pf.boss.hp>0)consider(pf.boss.x,pf.boss.y-pf.boss.h*.55);
 return best;
}
function touchApply(){
 const play=state==='play'||state==='platform',show_=touch.on&&play&&!paused;
 const ui=$('touchUi');if(!ui)return;
 ui.classList.toggle('hidden',!show_);
 $('touchSpace').classList.toggle('hidden',state!=='play');$('touchGround').classList.toggle('hidden',state!=='platform');
 const portrait=touch.on&&play&&innerHeight>innerWidth*1.05;$('touchRotate').classList.toggle('hidden',!portrait);
 if(portrait&&!paused&&typeof togglePause==='function')togglePause(); // in verticale il gioco si mette in pausa
 const px=touch.pad.x,py=touch.pad.y,mag=Math.hypot(px,py),T=.35;
 const active=show_&&touch.pad.id!==null;
 if(!show_){for(const k of [...touch.mine])touchKey(k,false);touchMouse('down',false);touchMouse('right',false);return}
 if(state==='play'){
  touchKey('ArrowLeft',active&&px<-T);touchKey('ArrowRight',active&&px>T);touchKey('ArrowUp',active&&py<-T);touchKey('ArrowDown',active&&py>T);
  // La prua segue la direzione del pad.
  if(active&&mag>.3){mouse.x=W/2+px/mag*240;mouse.y=H/2+py/mag*240;if(typeof placeCrosshair==='function')placeCrosshair()}
  touchKey('ShiftRight',!!touch.btn.boost);touchKey('KeyF',!!touch.btn.brake);
  touchMouse('down',!!touch.btn.fire);touchMouse('right',!!touch.btn.shield);
 }else if(typeof pf!=='undefined'&&pf&&pf.pilot){
  touchKey('ArrowLeft',active&&px<-T);touchKey('ArrowRight',active&&px>T);touchKey('ArrowDown',active&&py>.6);
  touchKey('Space',!!touch.btn.jump||active&&py<-.6);
  touchMouse('down',!!touch.btn.fire);touchMouse('right',!!touch.btn.shield);
  const P=pf.pilot,s=pfScale(),t=touchGroundTarget(),aim=t||{x:P.x+P.face*300,y:P.y-34};
  mouse.x=(aim.x-pf.cam.x)*s;mouse.y=aim.y*s;
 }
}
function touchEnable(){if(touch.on)return;touch.on=true;document.body.classList.add('touch');touchBuild()}
if(typeof document!=='undefined'&&document.body&&document.createElement){
 if(touchDetect())touchEnable();
 addEventListener('touchstart',()=>touchEnable(),{once:true,passive:true});
 (function loop(){try{if(touch.on)touchApply()}catch(e){}requestAnimationFrame(loop)})();
}
