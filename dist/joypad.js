// Conex — JOYPAD (2026-11-08).
// Supporto per i controller (Xbox, PlayStation e compatibili) con la Gamepad API del browser.
// Nel gioco: levetta sinistra o croce = movimento, levetta destra = mira (prua della nave, fucile del
// pilota; a terra senza levetta destra il fucile punta da solo il nemico più vicino).
// Nei menu: croce o levetta sinistra scelgono il pulsante, A conferma, B torna indietro,
// LB / RB cambiano sezione nelle impostazioni.
// I tasti delle azioni si cambiano nella pagina delle impostazioni, sezione JOYPAD (due tasti per azione).
// Come mobile.js, scrive negli stessi ingressi di tastiera e mouse (keys, mouse), quindi il gioco non cambia.
// Salvato in localStorage stellarJoypad (anche nel backup del profilo). Va caricato dopo impostazioni.js.

const GP_KEY='stellarJoypad';
// ctx: dove vale l'azione. Due azioni possono usare lo stesso tasto solo se non valgono nello stesso posto
// (es. A = post-bruciatore nello spazio e salto a terra).
const GP_ACTIONS=[
 {id:'fire',ctx:'all',def:[7,2],name:'FUOCO',desc:'Spazio: tieni premuto per il mega colpo · a terra: spara dove miri'},
 {id:'shield',ctx:'all',def:[6,null],name:'BARRIERA · SCUDO',desc:'Resta attiva finché tieni premuto'},
 {id:'missile',ctx:'all',def:[5,null],name:'MISSILE · GRANATA',desc:'Missile nello spazio, granata a terra'},
 {id:'special',ctx:'all',def:[3,null],name:'COLPO SPECIALE',desc:'Una volta per fase'},
 {id:'boost',ctx:'space',def:[0,10],name:'POST-BRUCIATORE',desc:'Solo nello spazio · si riattiva al 100%'},
 {id:'brake',ctx:'space',def:[1,4],name:'FRENO',desc:'Solo nello spazio · rallenta per conquistare l’orbita'},
 {id:'jump',ctx:'ground',def:[0,null],name:'SALTO · JETPACK',desc:'Solo a terra · in aria tieni premuto per il jetpack'},
 {id:'crouch',ctx:'ground',def:[1,null],name:'ABBASSATI',desc:'Solo a terra · anche levetta giù'},
 {id:'pause',ctx:'all',def:[9,null],name:'PAUSA',desc:'Sospendi o riprendi la missione'},
 {id:'music',ctx:'all',def:[8,null],name:'MUSICA',desc:'Accendi o spegni la colonna sonora'}
];
const GP_CTX={all:'',space:'NELLO SPAZIO',ground:'A TERRA'};
const GP_NOREMAP=new Set([12,13,14,15,16]);   // croce e tasto centrale: restano per muoversi
const GP_XBOX=['A','B','X','Y','LB','RB','LT','RT','VIEW','MENU','L3','R3','CROCE SU','CROCE GIÙ','CROCE SINISTRA','CROCE DESTRA','HOME'];
const GP_PS=['CROCE','CERCHIO','QUADRATO','TRIANGOLO','L1','R1','L2','R2','CREATE','OPTIONS','L3','R3','CROCE SU','CROCE GIÙ','CROCE SINISTRA','CROCE DESTRA','PS'];
const GP={dead:.24,aimDead:.32,aimR:240,move:.35,crouch:.6,jump:.75,nav:.55,rep1:.38,rep:.13,fireRep:.18,waitMax:8};
const gp={on:true,rumble:true,bind:null,index:null,id:'',ps:false,prev:[],mine:new Set(),mouseMine:{down:false,right:false},
 wait:null,waitT:0,useT:-1e9,mouseT:0,aimT:-1e9,navDir:null,navT:0,fireT:0,focus:null,layer:null,layerT:0,hp:null,rumbleT:0,mode:false,last:0};

// ---------------------------------------------------------------- impostazioni salvate
function gpDefault(){const o={};for(const a of GP_ACTIONS)o[a.id]=a.def.slice();return o}
function gpLoad(){
 gp.bind=gpDefault();
 try{
  const s=JSON.parse(localStorage.getItem(GP_KEY)||'null');
  if(s&&typeof s==='object'){
   if(s.on===false)gp.on=false;if(s.rumble===false)gp.rumble=false;
   if(s.bind&&typeof s.bind==='object')for(const a of GP_ACTIONS){const v=s.bind[a.id];if(Array.isArray(v))gp.bind[a.id]=[0,1].map(i=>Number.isInteger(v[i])&&v[i]>=0&&v[i]<32&&!GP_NOREMAP.has(v[i])?v[i]:null)}
  }
 }catch(e){}
}
function gpIsDefault(){const d=gpDefault();return GP_ACTIONS.every(a=>d[a.id][0]===gp.bind[a.id][0]&&d[a.id][1]===gp.bind[a.id][1])}
function gpSave(){
 try{if(gp.on&&gp.rumble&&gpIsDefault())localStorage.removeItem(GP_KEY);else localStorage.setItem(GP_KEY,JSON.stringify({on:gp.on,rumble:gp.rumble,bind:gp.bind}))}catch(e){}
}
gpLoad();
function gpOverlap(a,b){return a.ctx==='all'||b.ctx==='all'||a.ctx===b.ctx}
// Assegna un tasto: se lo usava un'altra azione che vale nello stesso posto, lì si libera.
function gpSet(id,slot,b){
 const me=GP_ACTIONS.find(a=>a.id===id);if(!me)return;
 if(b!=null)for(const a of GP_ACTIONS)if(gpOverlap(a,me))for(let i=0;i<2;i++)if(gp.bind[a.id][i]===b)gp.bind[a.id][i]=null;
 gp.bind[id][slot]=b==null?null:b;gpSave();
}
function gpReset(){gp.bind=gpDefault();gpSave()}
function gpName(i){if(i==null)return '';const n=(gp.ps?GP_PS:GP_XBOX)[i];return n||('TASTO '+i)}

// ---------------------------------------------------------------- lettura del controller
function gpList(){try{return typeof navigator!=='undefined'&&navigator.getGamepads?[...navigator.getGamepads()].filter(p=>p&&p.connected!==false):[]}catch(e){return[]}}
function gpRead(){
 const list=gpList();if(!list.length)return null;
 let p=list.find(x=>x.index===gp.index);
 if(!p){p=list.find(x=>x.mapping==='standard')||list[0];gp.index=p.index}
 const b=[];for(let i=0;i<p.buttons.length;i++){const x=p.buttons[i];b[i]=!!x&&(x.pressed||(+x.value||0)>(i===6||i===7?.35:.5))}
 const ax=i=>{const v=+p.axes[i]||0;return Math.abs(v)<.04?0:Math.max(-1,Math.min(1,v))};
 return{p,b,lx:ax(0),ly:ax(1),rx:ax(2),ry:ax(3)};
}
function gpStick(x,y,dead){const m=Math.hypot(x,y);if(m<dead)return{x:0,y:0,m:0};const k=Math.min(1,(m-dead)/(1-dead))/m;return{x:x*k,y:y*k,m:Math.min(1,(m-dead)/(1-dead))}}
function gpPretty(id){
 const s=String(id||'').replace(/\s*\([^)]*(STANDARD GAMEPAD|Vendor:)[^)]*\)\s*/gi,' ').replace(/\s+/g,' ').trim();
 return s.length>58?s.slice(0,56)+'…':s||'JOYPAD';
}
function gpIsPs(id){const s=String(id||'');return/054c|playstation|dualshock|dualsense/i.test(s)||/wireless controller/i.test(s)&&!/xbox|045e/i.test(s)}

// ---------------------------------------------------------------- ingressi del gioco
function gpKey(k,on){if(typeof keys==='undefined')return;if(on){keys[k]=true;gp.mine.add(k)}else if(gp.mine.has(k)){keys[k]=false;gp.mine.delete(k)}}
function gpMouse(k,on){if(typeof mouse==='undefined')return;if(on){mouse[k]=true;gp.mouseMine[k]=true}else if(gp.mouseMine[k]){mouse[k]=false;gp.mouseMine[k]=false}}
function gpRelease(){for(const k of[...gp.mine])gpKey(k,false);gpMouse('down',false);gpMouse('right',false)}
function gpAct(s,id){return gp.bind[id].some(b=>b!=null&&s.b[b])}
function gpEdge(s,id){return gp.bind[id].some(b=>b!=null&&s.b[b]&&!gp.prev[b])}
function gpPlaying(){return typeof state!=='undefined'&&(state==='play'||state==='platform')}
// Il joypad muove il mirino solo se è stato usato dopo il mouse.
function gpLeads(){return gp.useT>gp.mouseT}
// Mira a terra: il nemico più vicino davanti al pilota (come sul telefono), altrimenti davanti a sé.
function gpGroundTarget(){
 const P=pf.pilot;
 if(typeof touchGroundTarget==='function'){try{const t=touchGroundTarget();if(t)return t}catch(e){}}
 return{x:P.x+P.face*300,y:P.y-34};
}
function gpGame(s,dt,now){
 const L=gpStick(s.lx,s.ly,GP.dead),R=gpStick(s.rx,s.ry,GP.aimDead);
 const x=(s.b[15]?1:0)-(s.b[14]?1:0)||L.x,y=(s.b[13]?1:0)-(s.b[12]?1:0)||L.y;
 if(R.m>0)gp.aimT=now;
 if(state==='play'){
  gpKey('ArrowLeft',x<-GP.move);gpKey('ArrowRight',x>GP.move);gpKey('ArrowUp',y<-GP.move);gpKey('ArrowDown',y>GP.move);
  gpKey('ShiftRight',gpAct(s,'boost'));gpKey('KeyF',gpAct(s,'brake'));
  gpMouse('down',gpAct(s,'fire'));gpMouse('right',gpAct(s,'shield'));
  // la prua segue la levetta destra; senza levetta destra (da più di mezzo secondo) segue il movimento
  let ax=0,ay=0;
  if(R.m>0){ax=R.x;ay=R.y}else if(gpLeads()&&now-gp.aimT>500&&Math.hypot(x,y)>.3){ax=x;ay=y}
  const m=Math.hypot(ax,ay);
  if(m>0&&typeof W!=='undefined'){mouse.x=W/2+ax/m*GP.aimR;mouse.y=H/2+ay/m*GP.aimR;if(typeof placeCrosshair==='function')placeCrosshair()}
  if(gpEdge(s,'missile')&&typeof launchMissile==='function')launchMissile();
 }else if(typeof pf!=='undefined'&&pf&&pf.pilot){
  const P=pf.pilot;
  gpKey('ArrowLeft',x<-GP.move);gpKey('ArrowRight',x>GP.move);
  gpKey('ArrowDown',y>GP.crouch||gpAct(s,'crouch'));
  gpKey('ArrowUp',gpAct(s,'jump')||!!s.b[12]||L.y<-GP.jump);
  gpMouse('right',gpAct(s,'shield'));
  let aim=null;
  if(R.m>0&&typeof pfShoulder==='function'){const sh=pfShoulder(P),m=Math.hypot(R.x,R.y);aim={x:sh.x+R.x/m*300,y:sh.y+R.y/m*300}}
  else if(gpLeads())aim=gpGroundTarget();
  if(aim&&typeof pfScale==='function'){const k=pfScale();mouse.x=(aim.x-pf.cam.x)*k;mouse.y=aim.y*k}
  gp.fireT-=dt;
  if(gpAct(s,'fire')&&(gpEdge(s,'fire')||gp.fireT<=0)&&typeof pfFireAt==='function'){
   const t=aim||(typeof pfScale==='function'?{x:pf.cam.x+mouse.x/pfScale(),y:mouse.y/pfScale()}:gpGroundTarget());
   pfFireAt(t.x,t.y);gp.fireT=GP.fireRep;
  }
  if(gpEdge(s,'missile')&&typeof pfThrowGrenade==='function')pfThrowGrenade();
 }
 if(gpEdge(s,'special')&&typeof spcUse==='function')spcUse();
}

// ---------------------------------------------------------------- vibrazione quando si subisce danno
function gpHp(){
 if(typeof state==='undefined')return null;
 if(state==='play'&&typeof player!=='undefined'&&player)return player.health;
 if(state==='platform'&&typeof pf!=='undefined'&&pf&&pf.pilot)return pf.pilot.hp;
 return null;
}
function gpRumble(p,strong,ms){
 const v=p&&p.vibrationActuator;if(!gp.rumble||!v||typeof v.playEffect!=='function')return;
 try{const r=v.playEffect('dual-rumble',{startDelay:0,duration:ms,strongMagnitude:strong,weakMagnitude:Math.min(1,strong+.2)});if(r&&r.catch)r.catch(()=>{})}catch(e){}
}
function gpCheckHit(s,now){
 const hp=gpHp();
 if(hp!=null&&gp.hp!=null&&hp<gp.hp&&now-gp.rumbleT>140){gp.rumbleT=now;const k=state==='platform'?(gp.hp-hp)/3:(gp.hp-hp)/30;gpRumble(s.p,Math.max(.25,Math.min(1,.25+k)),hp<=0?420:140)}
 gp.hp=hp;
}

// ---------------------------------------------------------------- menu: scegliere i pulsanti con la croce
const GP_FOCUSABLE='button,a[href],input:not([type=hidden]),select,[role=button],[role=tab]';
function gpVisible(el){
 if(!el||!el.getClientRects||!el.getClientRects().length)return false;
 if(el.disabled||el.closest('.hidden,[hidden],[aria-hidden="true"]'))return false;
 const cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity!==0;
}
// Il livello in primo piano: la finestra aperta più in alto, altrimenti la schermata attiva.
function gpLayer(){
 if(typeof document==='undefined'||!document.querySelectorAll)return null;
 let best=null,bz=-1e9;
 for(const el of document.querySelectorAll('.overlay:not(.hidden),.market-screen:not(.hidden),[role=dialog]:not(.hidden)')){
  if(!el.getClientRects().length||getComputedStyle(el).display==='none')continue;
  const z=parseInt(getComputedStyle(el).zIndex,10)||0;if(z>=bz){bz=z;best=el}
 }
 return best||document.querySelector('.screen.active')||document.body;
}
function gpCandidates(){const L=gpLayer();return L?[...L.querySelectorAll(GP_FOCUSABLE)].filter(gpVisible):[]}
function gpFocus(el){
 if(gp.focus&&gp.focus!==el&&gp.focus.classList)gp.focus.classList.remove('gp-focus');
 gp.focus=el||null;if(!el)return;
 el.classList.add('gp-focus');
 try{el.focus({preventScroll:true})}catch(e){}
 try{el.scrollIntoView({block:'nearest',inline:'nearest'})}catch(e){}
}
function gpDefaultFocus(list){
 const pick=sel=>list.find(el=>el.matches&&el.matches(sel));
 return pick('.sp-tab.active')||pick('.gp-key.wait')||pick('.launch-btn:not(.hidden)')||pick('.planet-node.selected')||list[0];
}
function gpNav(d){
 const list=gpCandidates();if(!list.length)return;
 const cur=gp.focus&&list.includes(gp.focus)?gp.focus:null;
 if(!cur){gpFocus(list.includes(document.activeElement)?document.activeElement:gpDefaultFocus(list));return}
 // cursori del volume e menu a tendina: destra e sinistra cambiano il valore
 if(d==='left'||d==='right'){
  const k=d==='right'?1:-1;
  if(cur.matches('input[type=range]')){
   const st=+cur.step||1,v=Math.max(+cur.min||0,Math.min(+cur.max||100,(+cur.value||0)+k*st));
   if(v!==+cur.value){cur.value=v;cur.dispatchEvent(new Event('input',{bubbles:true}));cur.dispatchEvent(new Event('change',{bubbles:true}))}
   return;
  }
  if(cur.nodeName==='SELECT'&&cur.options.length){
   cur.selectedIndex=(cur.selectedIndex+k+cur.options.length)%cur.options.length;cur.dispatchEvent(new Event('change',{bubbles:true}));return;
  }
 }
 const r=cur.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
 let best=null,bs=1e12;
 for(const el of list){
  if(el===cur)continue;
  const q=el.getBoundingClientRect(),ex=q.left+q.width/2,ey=q.top+q.height/2,dx=ex-cx,dy=ey-cy;
  const main=d==='right'?dx:d==='left'?-dx:d==='down'?dy:-dy,side=d==='left'||d==='right'?Math.abs(dy):Math.abs(dx);
  // deve stare davvero da quella parte (oltre il bordo, non solo il centro)
  const past=d==='right'?q.left>=r.right-r.width*.3:d==='left'?q.right<=r.left+r.width*.3:d==='down'?q.top>=r.bottom-r.height*.3:q.bottom<=r.top+r.height*.3;
  if(main<=1||!past)continue;
  const sc=main+side*2.4;if(sc<bs){bs=sc;best=el}
 }
 if(best){gpFocus(best);if(typeof sfx==='function')try{sfx('ui')}catch(e){}}
}
function gpPress(){
 const list=gpCandidates();
 if(!gp.focus||!list.includes(gp.focus)){if(list.length)gpFocus(gpDefaultFocus(list));return}
 const el=gp.focus;
 if(el.matches('input[type=range]'))return;
 if(el.matches('input[type=text],input:not([type]),textarea')){el.focus();return}
 el.click();
}
function gpKeyEvent(code){
 for(const t of['keydown','keyup']){try{dispatchEvent(new KeyboardEvent(t,{code,key:code==='Escape'?'Escape':code,bubbles:true,cancelable:true}))}catch(e){}}
}
function gpBack(){
 const L=gpLayer();
 if(L&&L!==document.body&&!L.classList.contains('screen')){
  for(const sel of['[data-gp-back]','#closeSettings','.sp-back','.close-btn','.brief-back','#closeMarket','[id^="close"]']){
   const b=[...L.querySelectorAll(sel)].find(gpVisible);if(b){b.click();return}
  }
 }
 gpKeyEvent('Escape');
}
function gpMenu(s,dt){
 const L=gpStick(s.lx,s.ly,GP.dead);
 let d=null;
 if(s.b[12])d='up';else if(s.b[13])d='down';else if(s.b[14])d='left';else if(s.b[15])d='right';
 else if(L.m>GP.nav)d=Math.abs(L.x)>Math.abs(L.y)?(L.x>0?'right':'left'):(L.y>0?'down':'up');
 if(d!==gp.navDir){gp.navDir=d;gp.navT=GP.rep1;if(d)gpNav(d)}
 else if(d){gp.navT-=dt;if(gp.navT<=0){gp.navT=GP.rep;gpNav(d)}}
 const e=i=>s.b[i]&&!gp.prev[i];
 if(e(0))gpPress();
 if(e(1))gpBack();
 if(e(9)&&!gpPlaying())gpPress();
 const sp=$('settingsOverlay');
 if(sp&&!sp.classList.contains('hidden')&&typeof impStep==='function'&&(e(4)||e(5))){
  impStep(e(5)?1:-1);const a=sp.querySelector('.sp-tab.active');if(a)gpFocus(a);
 }
}
// Quando si apre una nuova finestra il joypad sceglie subito il pulsante principale.
function gpWatchLayer(now){
 if(now-gp.layerT<200)return;gp.layerT=now;
 const L=gpLayer();
 if(L!==gp.layer){gp.layer=L;if(gp.focus&&gp.focus.classList)gp.focus.classList.remove('gp-focus');gp.focus=null;if(gp.mode&&!(gpPlaying()&&!paused)){const list=gpCandidates();if(list.length)gpFocus(gpDefaultFocus(list))}}
 else if(gp.focus&&!gpVisible(gp.focus)){gp.focus.classList.remove('gp-focus');gp.focus=null}
}
function gpSetMode(on){
 if(gp.mode===on)return;gp.mode=on;
 if(typeof document!=='undefined'&&document.body)document.body.classList.toggle('gp-mode',on);
 if(!on&&gp.focus&&gp.focus.classList){gp.focus.classList.remove('gp-focus');gp.focus=null}
}

// ---------------------------------------------------------------- ciclo principale
function gpFrame(now){
 const dt=Math.min(.1,Math.max(0,(now-(gp.last||now))/1000));gp.last=now;
 const s=gpRead();
 if(!s){if(gp.id){gp.id='';gp.index=null;gp.prev=[];gpRelease();gpSetMode(false);gpWait(null);gpStatus()}return}
 if(s.p.id!==gp.id){const first=!gp.id;gp.id=s.p.id;gp.ps=gpIsPs(s.p.id);gpStatus();gpRender();if(first)gpToast()}
 const any=s.b.some(Boolean)||Math.hypot(s.lx,s.ly)>.5||Math.hypot(s.rx,s.ry)>.5;
 if(any){gp.useT=now;if(gp.on)gpSetMode(true)}
 gpLive(s);
 // attesa del nuovo tasto per un'azione: il primo tasto premuto
 if(gp.wait){
  gp.waitT+=dt;
  let hit=null;for(let i=0;i<s.b.length;i++)if(s.b[i]&&!gp.prev[i]){hit=i;break}
  if(hit!=null){const w=gp.wait;gpWait(null);if(!GP_NOREMAP.has(hit)){gpSet(w.id,w.slot,hit);if(typeof sfx==='function')try{sfx('ui')}catch(e){}}gpRender()}
  else if(gp.waitT>GP.waitMax){gpWait(null);gpRender()}
  gp.prev=s.b.slice();return;
 }
 if(!gp.on){gpRelease();gp.prev=s.b.slice();return}
 const playing=gpPlaying()&&!(typeof paused!=='undefined'&&paused);
 if(playing)gpGame(s,dt,now);else{gpRelease();gp.fireT=0;gpWatchLayer(now);if(gp.mode)gpMenu(s,dt)}
 if(gpPlaying()&&gpEdge(s,'pause')&&typeof togglePause==='function')togglePause();
 if(gpEdge(s,'music')&&typeof setMusic==='function'&&typeof mus!=='undefined')setMusic(!mus.on);
 gpCheckHit(s,now);
 gp.prev=s.b.slice();
}

// ---------------------------------------------------------------- impostazioni: sezione JOYPAD
function gpWait(w){gp.wait=w;gp.waitT=0}
function gpToggleSync(id,on,yes,no){const t=typeof $==='function'?$(id):null;if(!t)return;t.classList.toggle('active',on);t.setAttribute('aria-checked',String(on));const s=t.querySelector('span');if(s)s.textContent=on?yes:no}
function gpStatus(){
 const box=typeof $==='function'?$('gpStatus'):null;if(!box)return;
 box.classList.toggle('on',!!gp.id);
 box.querySelector('b').textContent=gp.id?(gp.on?'JOYPAD COLLEGATO':'JOYPAD COLLEGATO · DISATTIVATO'):'NESSUN JOYPAD COLLEGATO';
 box.querySelector('small').textContent=gp.id?gpPretty(gp.id):'Collega il controller e premi un suo tasto qualsiasi: il browser lo vede solo dopo il primo tasto.';
}
function gpRender(){
 if(typeof document==='undefined'||!document.querySelector)return;
 const grid=$('gpGrid');if(!grid)return;
 grid.innerHTML=GP_ACTIONS.map(a=>{
  const keys_=[0,1].map(i=>{
   const b=gp.bind[a.id][i],w=gp.wait&&gp.wait.id===a.id&&gp.wait.slot===i;
   return `<button type="button" class="gp-key${b==null?' empty':''}${w?' wait':''}" data-id="${a.id}" data-slot="${i}" data-b="${b==null?'':b}" aria-label="Cambia tasto del joypad: ${a.name}">${w?'PREMI UN TASTO':b==null?'+':gpName(b)}</button>`;
  }).join('');
  return `<div class="gp-row" data-id="${a.id}"><span>${keys_}</span><b>${a.name}${GP_CTX[a.ctx]?'<em>'+GP_CTX[a.ctx]+'</em>':''}</b><small>${a.desc}</small></div>`;
 }).join('');
 for(const b of grid.querySelectorAll('.gp-key'))b.onclick=ev=>{ev.preventDefault();gpWait({id:b.dataset.id,slot:+b.dataset.slot});gpRender();const n=grid.querySelector('.gp-key.wait');if(n&&gp.mode)gpFocus(n)};
 const r=$('gpReset');if(r)r.disabled=gpIsDefault();
 const f=$('gpFixed');
 if(f)f.innerHTML=[
  ['LEVETTA SX','MUOVI · NEI MENU: SCEGLI'],['CROCE DIREZIONALE','MUOVI · NEI MENU: SCEGLI'],['LEVETTA DX','MIRA (PRUA E FUCILE)'],
  [gpName(0),'CONFERMA NEI MENU'],[gpName(1),'INDIETRO NEI MENU'],[gpName(4)+' · '+gpName(5),'SEZIONI DELLE IMPOSTAZIONI']
 ].map(([k,t])=>`<div><span><kbd>${k}</kbd></span><b>${t}</b></div>`).join('');
}
// tasti premuti in questo momento: si accendono nella griglia, così si vede se il controller risponde
function gpLive(s){
 const grid=typeof $==='function'?$('gpGrid'):null;if(!grid||!grid.offsetParent)return;
 for(const k of grid.querySelectorAll('.gp-key'))k.classList.toggle('down',k.dataset.b!==''&&!!s.b[+k.dataset.b]);
}
function gpToast(){
 if(typeof document==='undefined'||!document.createElement||!document.body)return;
 const old=document.querySelector('.gp-toast');if(old)old.remove();
 const t=document.createElement('div');t.className='gp-toast';t.innerHTML=(typeof ico==='function'?ico('gamepad'):'')+'<span>JOYPAD COLLEGATO</span>';
 document.body.appendChild(t);setTimeout(()=>t.remove(),3300);
}
function gpBuild(){
 if(typeof document==='undefined'||!document.querySelector||!document.createElement||$('joypadBlock'))return;
 const home=document.querySelector('#settingsOverlay .sp-panel[data-tab="joypad"] .sp-stack')||document.querySelector('#settingsOverlay .settings-side');
 if(!home)return;
 const b=document.createElement('div');b.id='joypadBlock';b.className='setting-block gp-block';
 b.innerHTML=
  '<div class="gp-top">'+`<div id="gpStatus" class="gp-status">${typeof ico==='function'?ico('gamepad'):''}<div><b></b><small></small></div></div>`+
  '<div class="gp-opts">'+
   '<div class="sound-row"><div><div class="setting-title"><span>JOYPAD</span></div><p>Usa il controller per giocare e per muoverti nei menu.</p></div><button id="gpToggle" class="toggle" role="switch" type="button"><i></i><span>ATTIVO</span></button></div>'+
   '<div class="sound-row"><div><div class="setting-title"><span>VIBRAZIONE</span></div><p>Il controller vibra quando la nave o il pilota vengono colpiti.</p></div><button id="gpRumble" class="toggle" role="switch" type="button"><i></i><span>ATTIVA</span></button></div>'+
  '</div></div>'+
  '<div id="gpFixed" class="gp-fixed"></div>'+
  '<div class="gp-head-row"><div class="setting-title"><span>TASTI DEL JOYPAD</span></div><button id="gpReset" type="button" class="cmd-reset">RIPRISTINA PREDEFINITI</button></div>'+
  '<p class="cmd-hint">Seleziona un tasto e premi quello nuovo sul joypad. La croce direzionale annulla, Canc lo toglie. Ogni azione può avere due tasti.</p>'+
  '<div id="gpGrid" class="gp-grid"></div>';
 home.appendChild(b);
 $('gpToggle').onclick=()=>{gp.on=!gp.on;if(!gp.on){gpRelease();gpSetMode(false)}gpSave();gpSync()};
 $('gpRumble').onclick=()=>{gp.rumble=!gp.rumble;gpSave();gpSync();if(gp.rumble){const s=gpRead();if(s)gpRumble(s.p,.5,160)}};
 $('gpReset').onclick=()=>{gpWait(null);gpReset();gpRender()};
 gpSync();gpRender();
}
function gpSync(){gpToggleSync('gpToggle',gp.on,'ATTIVO','DISATTIVATO');gpToggleSync('gpRumble',gp.rumble,'ATTIVA','DISATTIVATA');gpStatus()}

if(typeof addEventListener==='function'&&typeof document!=='undefined'&&document.body){
 try{gpBuild()}catch(e){}
 // Tastiera mentre si aspetta un tasto del joypad: Esc annulla, Canc o Backspace svuota.
 addEventListener('keydown',e=>{
  if(!gp.wait)return;
  if(e.code==='Escape'||e.code==='Delete'||e.code==='Backspace'){
   e.preventDefault();e.stopImmediatePropagation();
   const w=gp.wait;gpWait(null);if(e.code!=='Escape')gpSet(w.id,w.slot,null);gpRender();
  }
 },true);
 addEventListener('pointerdown',e=>{if(gp.wait&&!(e.target&&e.target.closest&&e.target.closest('.gp-key'))){gpWait(null);gpRender()}},true);
 // il mouse torna padrone del mirino appena si muove
 addEventListener('mousemove',e=>{if(!e.isTrusted)return;gp.mouseT=performance.now();if(gp.mode)gpSetMode(false)},true);
 addEventListener('gamepadconnected',()=>{gp.prev=[]});
 addEventListener('gamepaddisconnected',e=>{if(e.gamepad&&e.gamepad.index===gp.index){gp.index=null;gp.id='';gpRelease();gpSetMode(false);gpStatus()}});
 // chiudendo le impostazioni si annulla un'eventuale attesa
 for(const id of['closeSettings','closeSettingsX']){const b=$(id);if(b){const o=b.onclick;b.onclick=function(){if(gp.wait){gpWait(null);gpRender()}return o&&o.apply(this,arguments)}}}
 (function loop(t){try{gpFrame(t||performance.now())}catch(e){console.error(e)}requestAnimationFrame(loop)})();
}

// ---- backup del profilo: anche i tasti del joypad
if(typeof PROF_SETTINGS!=='undefined'&&Array.isArray(PROF_SETTINGS)&&!PROF_SETTINGS.includes(GP_KEY))PROF_SETTINGS.push(GP_KEY);

// ---- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["JOYPAD COLLEGATO","GAMEPAD CONNECTED","MANETTE CONNECTÉE","MANDO CONECTADO","ГЕЙМПАД ПОДКЛЮЧЁН","手柄已连接","ゲームパッド接続"],
  ["JOYPAD COLLEGATO · DISATTIVATO","GAMEPAD CONNECTED · OFF","MANETTE CONNECTÉE · DÉSACTIVÉE","MANDO CONECTADO · DESACTIVADO","ГЕЙМПАД ПОДКЛЮЧЁН · ВЫКЛЮЧЕН","手柄已连接 · 已关闭","ゲームパッド接続 · オフ"],
  ["NESSUN JOYPAD COLLEGATO","NO GAMEPAD CONNECTED","AUCUNE MANETTE CONNECTÉE","NINGÚN MANDO CONECTADO","ГЕЙМПАД НЕ ПОДКЛЮЧЁН","未连接手柄","ゲームパッド未接続"],
  ["Collega il controller e premi un suo tasto qualsiasi: il browser lo vede solo dopo il primo tasto.","Connect the controller and press any of its buttons: the browser only sees it after the first press.","Branche la manette et appuie sur n’importe quel bouton : le navigateur ne la voit qu’après le premier appui.","Conecta el mando y pulsa cualquier botón: el navegador solo lo ve tras la primera pulsación.","Подключи контроллер и нажми любую кнопку: браузер видит его только после первого нажатия.","连接手柄并按任意键：浏览器在第一次按键后才能识别它。","コントローラーを接続して任意のボタンを押してください。最初の入力の後にブラウザが認識します。"],
  ["Usa il controller per giocare e per muoverti nei menu.","Use the controller to play and to move through the menus.","Utilise la manette pour jouer et naviguer dans les menus.","Usa el mando para jugar y moverte por los menús.","Играй и управляй меню с помощью контроллера.","使用手柄游戏并浏览菜单。","コントローラーでプレイとメニュー操作ができます。"],
  ["VIBRAZIONE","VIBRATION","VIBRATION","VIBRACIÓN","ВИБРАЦИЯ","震动","振動"],
  ["Il controller vibra quando la nave o il pilota vengono colpiti.","The controller vibrates when the ship or the pilot is hit.","La manette vibre quand le vaisseau ou le pilote est touché.","El mando vibra cuando la nave o el piloto reciben un impacto.","Контроллер вибрирует, когда корабль или пилот получают урон.","飞船或驾驶员被击中时手柄会震动。","船やパイロットが攻撃を受けるとコントローラーが振動します。"],
  ["TASTI DEL JOYPAD","GAMEPAD BUTTONS","BOUTONS DE LA MANETTE","BOTONES DEL MANDO","КНОПКИ ГЕЙМПАДА","手柄按键","ゲームパッドのボタン"],
  ["Seleziona un tasto e premi quello nuovo sul joypad. La croce direzionale annulla, Canc lo toglie. Ogni azione può avere due tasti.","Select a button and press the new one on the gamepad. The D-pad cancels, Delete clears it. Each action can have two buttons.","Sélectionne un bouton et appuie sur le nouveau sur la manette. La croix annule, Suppr l’efface. Chaque action peut avoir deux boutons.","Selecciona un botón y pulsa el nuevo en el mando. La cruceta cancela, Supr lo borra. Cada acción puede tener dos botones.","Выбери кнопку и нажми новую на геймпаде. Крестовина — отмена, Delete — очистить. У каждого действия до двух кнопок.","选择一个按键，然后在手柄上按下新键。方向键取消，Delete 清除。每个动作可设两个按键。","ボタンを選んでゲームパッドの新しいボタンを押してください。十字キーで取消、Deleteで解除。各アクションに2つまで設定できます。"],
  ["Cambia tasto del joypad: ","Change gamepad button: ","Changer le bouton de la manette : ","Cambiar botón del mando: ","Сменить кнопку геймпада: ","更改手柄按键：","ゲームパッドのボタン変更："],
  ["LEVETTA SX","LEFT STICK","STICK GAUCHE","STICK IZQ","ЛЕВЫЙ СТИК","左摇杆","左スティック"],
  ["LEVETTA DX","RIGHT STICK","STICK DROIT","STICK DER","ПРАВЫЙ СТИК","右摇杆","右スティック"],
  ["CROCE","CROSS","CROIX","EQUIS","КРЕСТ","叉","バツ"],
  ["CROCE DIREZIONALE","D-PAD","CROIX DIRECTIONNELLE","CRUCETA","КРЕСТОВИНА","方向键","十字キー"],
  ["MUOVI · NEI MENU: SCEGLI","MOVE · IN MENUS: SELECT","DÉPLACER · MENUS : CHOISIR","MOVER · EN MENÚS: ELEGIR","ДВИЖЕНИЕ · В МЕНЮ: ВЫБОР","移动 · 菜单中：选择","移動 · メニュー：選択"],
  ["MIRA (PRUA E FUCILE)","AIM (BOW AND RIFLE)","VISÉE (PROUE ET FUSIL)","APUNTAR (PROA Y FUSIL)","ПРИЦЕЛ (НОС И ОРУЖИЕ)","瞄准（船头和枪）","照準（船首と銃）"],
  ["CONFERMA NEI MENU","CONFIRM IN MENUS","VALIDER DANS LES MENUS","CONFIRMAR EN MENÚS","ПОДТВЕРДИТЬ В МЕНЮ","菜单中确认","メニューで決定"],
  ["INDIETRO NEI MENU","BACK IN MENUS","RETOUR DANS LES MENUS","ATRÁS EN MENÚS","НАЗАД В МЕНЮ","菜单中返回","メニューで戻る"],
  ["SEZIONI DELLE IMPOSTAZIONI","SETTINGS SECTIONS","SECTIONS DES PARAMÈTRES","SECCIONES DE AJUSTES","РАЗДЕЛЫ НАСТРОЕК","设置分区","設定のセクション"],
  ["NELLO SPAZIO","IN SPACE","DANS L’ESPACE","EN EL ESPACIO","В КОСМОСЕ","太空中","宇宙"],
  ["A TERRA","ON THE GROUND","AU SOL","EN TIERRA","НА ЗЕМЛЕ","地面","地上"],
  ["SALTO · JETPACK","JUMP · JETPACK","SAUT · JETPACK","SALTO · JETPACK","ПРЫЖОК · ДЖЕТПАК","跳跃 · 喷气背包","ジャンプ · ジェットパック"],
  ["ABBASSATI","CROUCH","S’ACCROUPIR","AGACHARSE","ПРИГНУТЬСЯ","蹲下","しゃがむ"],
  ["Spazio: tieni premuto per il mega colpo · a terra: spara dove miri","Space: hold for the mega shot · ground: fires where you aim","Espace : maintiens pour le méga tir · au sol : tire où tu vises","Espacio: mantén para el mega disparo · en tierra: dispara donde apuntas","Космос: удерживай для мега-выстрела · на земле: стреляет туда, куда целишься","太空：按住蓄力超级炮 · 地面：朝瞄准方向射击","宇宙：長押しでメガショット · 地上：狙った方向に射撃"],
  ["Resta attiva finché tieni premuto","Stays on while you hold it","Reste active tant que tu maintiens","Activa mientras lo mantienes","Работает, пока удерживаешь","按住时保持开启","押している間オン"],
  ["Missile nello spazio, granata a terra","Missile in space, grenade on the ground","Missile dans l’espace, grenade au sol","Misil en el espacio, granada en tierra","Ракета в космосе, граната на земле","太空中导弹，地面上手雷","宇宙ではミサイル、地上ではグレネード"],
  ["Una volta per fase","Once per phase","Une fois par phase","Una vez por fase","Раз за фазу","每阶段一次","各フェーズ1回"],
  ["Solo nello spazio · si riattiva al 100%","Space only · reactivates at 100%","Espace uniquement · se réactive à 100 %","Solo en el espacio · se reactiva al 100%","Только в космосе · снова доступен при 100%","仅限太空 · 充满100%后可再用","宇宙のみ · 100%で再使用可"],
  ["Solo nello spazio · rallenta per conquistare l’orbita","Space only · slow down to capture the orbit","Espace uniquement · ralentis pour conquérir l’orbite","Solo en el espacio · frena para conquistar la órbita","Только в космосе · замедлись, чтобы занять орбиту","仅限太空 · 减速以占领轨道","宇宙のみ · 減速して軌道を確保"],
  ["Solo a terra · in aria tieni premuto per il jetpack","Ground only · hold in the air for the jetpack","Au sol uniquement · maintiens en l’air pour le jetpack","Solo en tierra · mantén en el aire para el jetpack","Только на земле · удерживай в воздухе для джетпака","仅限地面 · 空中按住使用喷气背包","地上のみ · 空中で長押しでジェットパック"],
  ["Solo a terra · anche levetta giù","Ground only · also stick down","Au sol uniquement · aussi stick vers le bas","Solo en tierra · también stick abajo","Только на земле · также стик вниз","仅限地面 · 也可摇杆向下","地上のみ · スティック下でも可"],
  ["Sospendi o riprendi la missione","Pause or resume the mission","Mets en pause ou reprends la mission","Pausa o reanuda la misión","Приостановить или продолжить миссию","暂停或继续任务","ミッションの一時停止・再開"],
  ["CERCHIO","CIRCLE","ROND","CÍRCULO","КРУГ","圆圈","マル"],
  ["QUADRATO","SQUARE","CARRÉ","CUADRADO","КВАДРАТ","方块","シカク"],
  ["TRIANGOLO","TRIANGLE","TRIANGLE","TRIÁNGULO","ТРЕУГОЛЬНИК","三角","サンカク"],
  ["CROCE SU","D-PAD UP","CROIX HAUT","CRUCETA ARRIBA","КРЕСТОВИНА ВВЕРХ","方向键上","十字キー上"],
  ["CROCE GIÙ","D-PAD DOWN","CROIX BAS","CRUCETA ABAJO","КРЕСТОВИНА ВНИЗ","方向键下","十字キー下"],
  ["CROCE SINISTRA","D-PAD LEFT","CROIX GAUCHE","CRUCETA IZQUIERDA","КРЕСТОВИНА ВЛЕВО","方向键左","十字キー左"],
  ["CROCE DESTRA","D-PAD RIGHT","CROIX DROITE","CRUCETA DERECHA","КРЕСТОВИНА ВПРАВО","方向键右","十字キー右"],
  ["ATTIVA","ON","ACTIVÉE","ACTIVADA","ВКЛ","开启","オン"],
  ["DISATTIVATA","OFF","DÉSACTIVÉE","DESACTIVADA","ВЫКЛ","关闭","オフ"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function'){i18nBuild();if(typeof i18nApply==='function')i18nApply()}
}
