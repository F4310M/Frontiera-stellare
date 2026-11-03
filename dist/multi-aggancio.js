// Lanciatore multiplo (2026-11-03): con 2 o 3 missili ogni missile aggancia un bersaglio diverso.
// Il bersaglio principale resta lockTarget di game.js; gli altri stanno in MA.extra.
// Va caricato dopo missili-nemici.js (riusa il suo mirino).
const MA={extra:[]};
function maSlots(){return typeof upg==='function'?upg('salvo'):0}

// Aggancio: oltre al principale, agganci i nemici visibili più vicini, uno per missile in più.
const maUpdateLock=updateTargetLock;
updateTargetLock=function(dt){
 maUpdateLock(dt);
 const n=maSlots();
 if(!n||state!=='play'||!lockTarget){if(MA.extra.length){MA.extra.length=0;updateMissileHud()}return}
 MA.extra=MA.extra.filter(x=>x.t!==lockTarget&&targetVisible(x.t)).slice(0,n);
 if(MA.extra.length<n){
  const taken=new Set([lockTarget,...MA.extra.map(x=>x.t)]),d=e=>(e.x-player.x)**2+(e.y-player.y)**2;
  const free=enemies.filter(e=>!taken.has(e)&&targetVisible(e)).sort((a,b)=>d(a)-d(b));
  for(const t of free.slice(0,n-MA.extra.length))MA.extra.push({t,p:0,snd:false});
 }
 for(const x of MA.extra){x.p=Math.min(1,x.p+dt/LOCK_SECONDS);if(x.p>=1&&!x.snd){x.snd=true;sfx('lock')}}
 updateMissileHud();
};

// Scritta del missile: quanti bersagli sono agganciati su quanti.
const maHud=updateMissileHud;
updateMissileHud=function(){
 maHud();
 if(missile||wingMissiles.length||!MA.extra.length||!lockTarget)return;
 const all=[lockProgress,...MA.extra.map(x=>x.p)],done=all.filter(p=>p>=1).length;
 if(!done)return;
 const el=$('missileStatus');el.textContent='BERSAGLI AGGANCIATI '+done+'/'+all.length+' · CLIC ROTELLA';el.classList.add('locked');
};

// Lancio: ogni missile laterale va sul suo bersaglio agganciato; se non ce l'ha segue il principale.
const maLaunch=launchMissile;
launchMissile=function(){
 const before=missile;maLaunch();
 if(!missile||missile===before)return;
 let many=0;
 wingMissiles.forEach((m,i)=>{const x=MA.extra[i];if(x&&x.p>=1&&targetVisible(x.t)){m.target=x.t;many++}});
 if(!missile.target&&many)missile.target=wingMissiles.find(m=>m.target).target;
 if(many)status(1+wingMissiles.length+' MISSILI AUTOGUIDATI SU BERSAGLI DIVERSI');
};

// Mirino: lo stesso del principale, disegnato anche su ogni bersaglio in più.
const maDraw=drawTargetLock;
drawTargetLock=function(){
 maDraw();
 if(state!=='play'||!MA.extra.length)return;
 const t0=lockTarget,p0=lockProgress;
 try{for(const x of MA.extra){if(x.t.hp<=0)continue;lockTarget=x.t;lockProgress=x.p;maDraw()}}
 finally{lockTarget=t0;lockProgress=p0}
};
