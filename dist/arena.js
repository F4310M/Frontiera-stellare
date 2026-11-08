// Conex — SFIDA ONLINE (2026-11-08): arena spaziale multigiocatore, deathmatch tutti contro tutti.
// Rete: Firebase Realtime Database via REST + EventSource (nessun SDK, come la classifica).
// Se in firebase-config.js manca databaseURL (oppure con ?arena=local) la sfida funziona tra le
// finestre dello stesso browser (BroadcastChannel): serve per provarla sul PC.
// Ogni pilota scrive solo il proprio stato; chi viene colpito decide il danno sulla propria nave
// e, se muore, dice chi lo ha abbattuto. L'host (il primo entrato) guida le fasi della partita.
const ARENA={R:2200,max:6,dur:300,win:10,respawn:3,hz:12,hp:100,dmg:10,bulletSpeed:1050,bulletLife:1.05,
 fireCd:.17,stale:7,rocks:16,inv:2,countdown:4,endTime:12,shipR:16,
 colors:['#51e6ff','#ffb340','#ff5268','#9dff6a','#c38bff','#ff7ad9'],
 quick:['ALFA','BETA','VEGA','NOVA','ORSA','LIRA','SOLE','LUNA']};

// ---------------------------------------------------------------- utilità pure (testate)
function arHash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function arRand(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function arCode(rnd=Math.random){const L='ABCDEFGHJKLMNPQRSTUVWXYZ';let s='';for(let i=0;i<4;i++)s+=L[Math.floor(rnd()*L.length)%L.length];return s}
function arCleanCode(c){return String(c||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4)}
function arPid(){const L='abcdefghijklmnopqrstuvwxyz0123456789';let s='';for(let i=0;i<10;i++)s+=L[Math.floor(Math.random()*36)];return s}
function arCleanName(n){return String(n||'').replace(/[^\p{L}\p{N} ]/gu,'').trim().slice(0,16)||'PILOTA'}
// asteroidi uguali per tutti i piloti della stessa stanza
function arRocks(code){
 const r=arRand(arHash('rocce'+code)),out=[];
 for(let tries=0;out.length<ARENA.rocks&&tries<400;tries++){
  const a=r()*Math.PI*2,d=ARENA.R*(.22+r()*.7),rad=45+r()*75,x=Math.cos(a)*d,y=Math.sin(a)*d;
  if(out.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+rad+160))continue;
  const n=9+Math.floor(r()*4),pts=[];for(let i=0;i<n;i++)pts.push(.78+r()*.22);
  out.push({x,y,r:rad,pts,rot:r()*6.28,shade:r()});
 }
 return out;
}
// applica un evento della Realtime Database (put/patch) all'albero locale; dice quali piloti sono cambiati
function arSet(tree,parts,val){
 let o=tree;for(let i=0;i<parts.length-1;i++){if(!o[parts[i]]||typeof o[parts[i]]!=='object')o[parts[i]]={};o=o[parts[i]]}
 const k=parts[parts.length-1];if(val===null||val===undefined)delete o[k];else o[k]=val;
}
function arApply(tree,path,data,patch){
 const parts=String(path||'/').split('/').filter(Boolean),changed=new Set();
 if(!parts.length){
  if(patch){for(const k in (data||{})){const sub=k.split('/').filter(Boolean);if(!sub.length)continue;changed.add(sub[0]);arSet(tree,sub,data[k])}}
  else{for(const k in tree){changed.add(k);delete tree[k]}if(data&&typeof data==='object')for(const k in data){tree[k]=data[k];changed.add(k)}}
  return changed;
 }
 changed.add(parts[0]);
 if(patch&&data&&typeof data==='object'){for(const k in data)arSet(tree,parts.concat(k.split('/').filter(Boolean)),data[k])}
 else arSet(tree,parts,data);
 return changed;
}
function arList(v){return Array.isArray(v)?v:(v&&typeof v==='object'?Object.values(v):[])}

// ---------------------------------------------------------------- partita (un'istanza per pilota)
function arNew(pid,name,avatar){
 return {pid,room:'',rocks:[],time:0,phase:'L',rt:0,isHost:true,wantStart:false,
  me:{n:arCleanName(name),a:avatar||'',j:Date.now(),x:0,y:0,vx:0,vy:0,r:0,f:0,s:0,h:ARENA.hp,sd:0,bo:0,iv:0,al:1,k:0,d:0,dz:0,by:'',sh:[]},
  boost:100,shield:100,inv:0,respawnT:0,fireCd:0,shotSeq:0,shots:[],sendT:0,
  others:{},bullets:[],parts:[],events:[],drop:[]};
}
function arActive(g){return [{pid:g.pid,s:g.me}].concat(Object.keys(g.others).map(pid=>({pid,s:g.others[pid].s})))}
function arHostPid(g){let best=null;for(const p of arActive(g)){const j=+p.s.j||0;if(!best||j<best.j||(j===best.j&&p.pid<best.pid))best={pid:p.pid,j}}return best?best.pid:g.pid}
function arColor(g,pid){const l=arActive(g).sort((a,b)=>(+a.s.j||0)-(+b.s.j||0)||(a.pid<b.pid?-1:1));const i=l.findIndex(p=>p.pid===pid);return ARENA.colors[(i<0?0:i)%ARENA.colors.length]}
function arScore(g){return arActive(g).map(p=>({pid:p.pid,n:arCleanName(p.s.n),a:p.s.a||'',k:+p.s.k||0,d:+p.s.d||0,j:+p.s.j||0,me:p.pid===g.pid})).sort((a,b)=>b.k-a.k||a.d-b.d||a.j-b.j)}
function arName(g,pid){if(pid===g.pid)return g.me.n;const o=g.others[pid];return o?arCleanName(o.s.n):'?'}
function arBlast(g,x,y,color,n=26,power=1){
 for(let i=0;i<n;i++){const a=Math.random()*6.28,s=(40+Math.random()*260)*power;g.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.7,max:1.2,color,r:1.5+Math.random()*3.5})}
}
function arFree(g,x,y,r){return Math.hypot(x,y)<ARENA.R-80&&!g.rocks.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+r+40)}
function arSpawn(g){
 let best=null,bestD=-1;
 for(let i=0;i<30;i++){
  const a=Math.random()*6.28,d=ARENA.R*(.25+Math.random()*.55),x=Math.cos(a)*d,y=Math.sin(a)*d;
  if(!arFree(g,x,y,40))continue;
  let near=1e9;for(const pid in g.others){const o=g.others[pid];near=Math.min(near,Math.hypot(o.x-x,o.y-y))}
  if(near>bestD){bestD=near;best={x,y}}
  if(near>900)break;
 }
 best=best||{x:0,y:0};
 Object.assign(g.me,{x:best.x,y:best.y,vx:0,vy:0,r:Math.atan2(-best.y,-best.x),h:ARENA.hp,al:1});
 g.inv=ARENA.inv;g.boost=100;g.shield=100;g.respawnT=0;
}
function arEnterPhase(g,ph){
 if(g.phase===ph)return;g.phase=ph;
 if(ph==='C'){g.me.k=0;g.me.d=0;arSpawn(g);g.bullets=[]}
 g.events.push({type:'phase',ph});
}
function arHurt(g,amount,by){
 const m=g.me;if(!m.al||g.inv>0||g.phase==='C'||g.phase==='E')return false;
 if(m.sd)amount*=.3;
 m.h=Math.max(0,m.h-amount);
 if(m.h<=0){
  m.al=0;m.d++;m.dz++;m.by=by||'';g.respawnT=ARENA.respawn;
  arBlast(g,m.x,m.y,'#ffb340',46,1.4);arBlast(g,m.x,m.y,'#51e6ff',20,.8);
  g.events.push({type:'death',by:m.by,victim:g.pid});
 }
 return true;
}
// nuovo stato ricevuto dalla rete (tree: tutti i piloti della stanza, changed: chi è cambiato)
function arOnState(g,tree,changed){
 for(const pid of changed){
  if(pid===g.pid)continue;
  const s=tree[pid];
  if(!s||typeof s!=='object'||typeof s.x!=='number'){
   if(g.others[pid]){g.events.push({type:'left',n:arName(g,pid)});delete g.others[pid]}
   continue;
  }
  let o=g.others[pid];
  if(!o){o=g.others[pid]={s,x:s.x,y:s.y,r:+s.r||0,seen:g.time,lastShot:0,lastDz:+s.dz||0};
   for(const sh of arList(s.sh))o.lastShot=Math.max(o.lastShot,+arList(sh)[0]||0);
   g.events.push({type:'join',n:arCleanName(s.n)});
  }
  o.s=s;o.seen=g.time;
  // colpi nuovi
  const col=arColor(g,pid);
  for(const raw of arList(s.sh)){const sh=arList(raw);const i=+sh[0]||0;if(i<=o.lastShot)continue;o.lastShot=i;
   g.bullets.push({x:+sh[1],y:+sh[2],vx:+sh[3],vy:+sh[4],o:pid,life:ARENA.bulletLife,c:col})}
  // abbattimenti: chi è morto dice chi lo ha colpito
  const dz=+s.dz||0;
  if(dz>o.lastDz){o.lastDz=dz;
   arBlast(g,o.x,o.y,'#ffb340',46,1.4);arBlast(g,o.x,o.y,col,18,.8);
   if(s.by===g.pid){g.me.k++;g.events.push({type:'kill',victim:pid})}
   g.events.push({type:'death',by:s.by||'',victim:pid});
  }
 }
}
function arShoot(g){
 const m=g.me,c=Math.cos(m.r),s=Math.sin(m.r);g.shotSeq++;
 const sh=[g.shotSeq,Math.round(m.x+c*24),Math.round(m.y+s*24),Math.round(m.vx*.5+c*ARENA.bulletSpeed),Math.round(m.vy*.5+s*ARENA.bulletSpeed)];
 g.shots.push({t:g.time,sh});
 g.bullets.push({x:sh[1],y:sh[2],vx:sh[3],vy:sh[4],o:g.pid,life:ARENA.bulletLife,c:arColor(g,g.pid)});
 g.fireCd=ARENA.fireCd;g.events.push({type:'shot'});
}
function arPhysics(g,dt,inp){
 const m=g.me;
 if(!m.al){g.respawnT-=dt;m.f=0;m.s=0;m.bo=0;m.sd=0;if(g.respawnT<=0&&g.phase!=='E')arSpawn(g);return}
 const locked=g.phase==='C'||g.phase==='E';
 // prua verso la mira
 let da=((inp.aim-m.r+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
 m.r+=Math.max(-9*dt,Math.min(9*dt,da));
 const c=Math.cos(m.r),s=Math.sin(m.r);
 let fx=locked?0:inp.ay,sx=locked?0:inp.ax;
 if(inp.world&&!locked){fx=0;sx=0}
 const boosting=!locked&&inp.boost&&g.boost>5&&(fx>0||inp.world&&(inp.wx||inp.wy));
 g.boost=Math.max(0,Math.min(100,g.boost+(boosting?-38:16)*dt));
 const acc=boosting?950:520,max=boosting?620:340;
 if(inp.world&&!locked){m.vx+=inp.wx*acc*dt;m.vy+=inp.wy*acc*dt}
 else{m.vx+=(c*fx-s*sx*.8)*acc*dt;m.vy+=(s*fx+c*sx*.8)*acc*dt}
 const sp=Math.hypot(m.vx,m.vy);if(sp>max){const k=max/sp;m.vx*=k+(1-k)*.85;m.vy*=k+(1-k)*.85}
 const drag=(fx||sx||inp.world&&(inp.wx||inp.wy))?.25:.9;m.vx*=Math.max(0,1-drag*dt);m.vy*=Math.max(0,1-drag*dt);
 m.x+=m.vx*dt;m.y+=m.vy*dt;
 m.f=fx>0||(inp.world&&(inp.wx||inp.wy))?1:fx<0?-1:0;m.s=sx>0?1:sx<0?-1:0;m.bo=boosting?1:0;
 // barriera
 const shieldOn=!locked&&inp.shield&&g.shield>2;
 g.shield=Math.max(0,Math.min(100,g.shield+(shieldOn?-32:12)*dt));m.sd=shieldOn?1:0;
 // asteroidi: rimbalzo
 for(const o of g.rocks){const dx=m.x-o.x,dy=m.y-o.y,d=Math.hypot(dx,dy),min=o.r+ARENA.shipR;
  if(d<min&&d>0){const nx=dx/d,ny=dy/d;m.x=o.x+nx*min;m.y=o.y+ny*min;const vn=m.vx*nx+m.vy*ny;if(vn<0){m.vx-=1.6*vn*nx;m.vy-=1.6*vn*ny}}}
 // bordo dell'arena: spinge dentro e brucia lo scafo
 const dist=Math.hypot(m.x,m.y);
 if(dist>ARENA.R){const nx=m.x/dist,ny=m.y/dist;m.vx-=nx*700*dt;m.vy-=ny*700*dt;if(dist>ARENA.R+300){m.x=nx*(ARENA.R+300);m.y=ny*(ARENA.R+300)}
  if(arHurt(g,22*dt,''))g.edge=.3}
 g.fireCd-=dt;
 if(inp.fire&&!locked&&g.fireCd<=0)arShoot(g);
}
// un passo di gioco; restituisce lo stato da inviare (o null)
function arTick(g,dt,inp){
 g.time+=dt;g.inv=Math.max(0,g.inv-dt);g.edge=Math.max(0,(g.edge||0)-dt);
 // piloti spariti (finestra chiusa o rete caduta)
 for(const pid of Object.keys(g.others)){const o=g.others[pid];if(g.time-o.seen>ARENA.stale){g.events.push({type:'left',n:arCleanName(o.s.n)});delete g.others[pid];g.drop.push(pid)}}
 // fasi della partita: le decide l'host
 const host=arHostPid(g);g.isHost=host===g.pid;
 if(g.isHost){
  if(g.phase==='L'&&g.wantStart){g.wantStart=false;arEnterPhase(g,'C');g.rt=ARENA.countdown}
  else if(g.phase==='C'){g.rt-=dt;if(g.rt<=0){arEnterPhase(g,'P');g.rt=ARENA.dur}}
  else if(g.phase==='P'){g.rt-=dt;if(g.rt<=0||arScore(g).some(p=>p.k>=ARENA.win)){arEnterPhase(g,'E');g.rt=ARENA.endTime}}
  else if(g.phase==='E'){g.rt-=dt;if(g.rt<=0){arEnterPhase(g,'L');g.rt=0}}
  g.wantStart=false;
 }else{
  const h=g.others[host];
  if(h&&h.s.ph){if(h.s.ph!==g.phase)arEnterPhase(g,h.s.ph);g.rt=Math.max(0,(+h.s.rt||0)-(g.time-h.seen))}
 }
 g.me.ph=g.phase;g.me.rt=Math.round(g.rt*10)/10;
 arPhysics(g,dt,inp);
 g.me.iv=g.inv>0?1:0;
 // colpi
 for(const b of g.bullets){
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(g.rocks.some(o=>Math.hypot(o.x-b.x,o.y-b.y)<o.r)){b.life=0;arBlast(g,b.x,b.y,'#9aa7b8',4,.35);continue}
  if(b.o!==g.pid&&g.me.al&&Math.hypot(g.me.x-b.x,g.me.y-b.y)<ARENA.shipR+3){
   b.life=0;arBlast(g,b.x,b.y,b.c,6,.4);if(arHurt(g,ARENA.dmg,b.o))g.events.push({type:'hit'});continue;
  }
  for(const pid in g.others){if(pid===b.o)continue;const o=g.others[pid];
   if(o.s.al&&!o.s.iv&&Math.hypot(o.x-b.x,o.y-b.y)<ARENA.shipR+3){b.life=0;arBlast(g,b.x,b.y,b.c,6,.4);break}}
 }
 g.bullets=g.bullets.filter(b=>b.life>0);
 for(const p of g.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-1.8*dt;p.vy*=1-1.8*dt;p.life-=dt}
 g.parts=g.parts.filter(p=>p.life>0);if(g.parts.length>700)g.parts.splice(0,g.parts.length-700);
 // gli altri piloti: posizione prevista dall'ultimo stato, raggiunta con dolcezza
 for(const pid in g.others){const o=g.others[pid],s=o.s,age=Math.min(.3,g.time-o.seen),tx=s.x+(+s.vx||0)*age,ty=s.y+(+s.vy||0)*age;
  if(Math.hypot(tx-o.x,ty-o.y)>320){o.x=tx;o.y=ty}else{const k=Math.min(1,dt*12);o.x+=(tx-o.x)*k;o.y+=(ty-o.y)*k}
  const da=((+s.r||0)-o.r+Math.PI*3)%(Math.PI*2)-Math.PI;o.r+=da*Math.min(1,dt*14)}
 g.shots=g.shots.filter(s=>g.time-s.t<.6);
 g.sendT-=dt;
 if(g.sendT>0)return null;
 g.sendT=1/ARENA.hz;
 const m=g.me;
 return {x:Math.round(m.x),y:Math.round(m.y),vx:Math.round(m.vx),vy:Math.round(m.vy),r:Math.round(m.r*100)/100,f:m.f,s:m.s,
  h:Math.round(m.h),sd:m.sd,bo:m.bo,iv:m.iv,al:m.al,k:m.k,d:m.d,dz:m.dz,by:m.by,sh:g.shots.map(s=>s.sh),ph:m.ph,rt:m.rt};
}
function arFull(g){const m=g.me,p=arTickSnapshot(g);return Object.assign({n:m.n,j:m.j},m.a?{a:m.a}:{},p)}
function arTickSnapshot(g){const m=g.me;return {x:Math.round(m.x),y:Math.round(m.y),vx:0,vy:0,r:Math.round(m.r*100)/100,f:0,s:0,h:Math.round(m.h),sd:0,bo:0,iv:1,al:m.al,k:m.k,d:m.d,dz:m.dz,by:m.by,ph:m.ph,rt:m.rt}}

// ---------------------------------------------------------------- rete
function arDbUrl(){
 try{if(/[?&]arena=local/.test(location.search))return''}catch(e){}
 const c=typeof CLASSIFICA_ONLINE!=='undefined'?CLASSIFICA_ONLINE:null,u=(c&&c.databaseURL)||'';
 return /^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/.test(u)?u.replace(/\/$/,''):'';
}
function arNetFirebase(url,room,pid,onState){
 const base=`${url}/arena/${room}/p`,tree={};let es=null,busy=false,pending=null,closed=false,full=null;
 const net={tree,mode:'online',
  async join(f){full=f;const r=await fetch(`${base}/${pid}.json`,{method:'PUT',body:JSON.stringify(Object.assign({},f,{t:{'.sv':'timestamp'}}))});
   if(!r.ok)throw new Error('rete '+r.status);
   if(es)return;
   es=new EventSource(`${base}.json`);
   const on=patch=>e=>{try{const m=JSON.parse(e.data);if(!m)return;const ch=arApply(tree,m.path,m.data,patch);
    if(ch.has(pid)&&!tree[pid]&&!closed&&full)net.join(Object.assign({},full,net.last||{})).catch(()=>{});// cancellato per errore: rientra
    onState(tree,ch)}catch(err){}};
   es.addEventListener('put',on(false));es.addEventListener('patch',on(true));
   es.addEventListener('cancel',()=>{if(net.onError)net.onError('cancel')});
  },
  send(p){net.last=p;pending=Object.assign(pending||{},p);flush()},
  leave(){closed=true;if(es)es.close();try{fetch(`${base}/${pid}.json`,{method:'DELETE',keepalive:true}).catch(()=>{})}catch(e){}},
  drop(other){fetch(`${base}/${other}.json`,{method:'DELETE'}).catch(()=>{})}
 };
 async function flush(){
  if(busy||!pending||closed)return;busy=true;const body=pending;pending=null;body.t={'.sv':'timestamp'};
  try{await fetch(`${base}/${pid}.json`,{method:'PATCH',body:JSON.stringify(body)})}catch(e){}
  busy=false;if(pending)flush();
 }
 return net;
}
function arNetLocal(room,pid,onState){
 const ch=new BroadcastChannel('conex-arena-'+room),tree={};let me=null;
 ch.onmessage=e=>{const m=e.data;if(!m||m.pid===pid)return;
  if(m.leave)delete tree[m.pid];
  else if(m.full)tree[m.pid]=Object.assign({},m.full);
  else if(m.patch){if(!tree[m.pid]){ch.postMessage({pid,ask:1});return}Object.assign(tree[m.pid],m.patch)}
  if((m.hello||m.ask)&&me)ch.postMessage({pid,full:me});
  onState(tree,new Set([m.pid]));
 };
 return {tree,mode:'local',
  async join(f){me=Object.assign({},f);ch.postMessage({pid,full:me,hello:1})},
  send(p){if(me)Object.assign(me,p);ch.postMessage({pid,patch:p})},
  leave(){try{ch.postMessage({pid,leave:1});ch.close()}catch(e){}},
  drop(){}};
}
// piloti attivi in una stanza online (prima di entrare)
async function arRoomCount(url,code){
 let srv=Date.now();
 try{const id=arPid(),r=await fetch(`${url}/arena/_t/${id}.json`,{method:'PUT',body:JSON.stringify({'.sv':'timestamp'})});const v=await r.json();if(typeof v==='number')srv=v;fetch(`${url}/arena/_t/${id}.json`,{method:'DELETE'}).catch(()=>{})}catch(e){}
 const r=await fetch(`${url}/arena/${code}/p.json`);if(!r.ok)throw new Error('rete '+r.status);
 const d=await r.json()||{};return Object.values(d).filter(p=>p&&typeof p.t==='number'&&p.t>srv-15000).length;
}

// ---------------------------------------------------------------- interfaccia e disegno
const AR_T=s=>typeof tr==='function'?tr(s):s;
const AR_ICO=n=>typeof ico==='function'?ico(n):'';
let ar=null;
const arUI={on:false,mx:0,my:0,fire:false,shield:false,cam:{x:0,y:0},sprites:null,feed:[],msg:'',msgT:0,busy:false};
function arEsc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function arEl(id){return typeof document!=='undefined'?document.getElementById(id):null}
function arShow(id,on){const e=arEl(id);if(e)e.classList.toggle('hidden',!on)}
function arProfile(){
 let p=null;try{p=typeof profLoad==='function'?profLoad():JSON.parse(localStorage.getItem('stellarProfilo')||'null')}catch(e){}
 const mini=p&&typeof p.mini==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(p.mini)&&p.mini.length<6000?p.mini:'';
 return {nome:arCleanName(p&&p.nome),mini};
}
function arBuildUI(){
 if(arEl('arena')||typeof document==='undefined'||!document.body)return;
 const s=document.createElement('section');s.id='arena';s.className='arena hidden';s.setAttribute('aria-label','Sfida online');
 s.innerHTML=`
 <div id="arMenu" class="ar-card brief-card">
  <p class="eyebrow">SFIDA ONLINE · DEATHMATCH</p>
  <h2>ARENA SPAZIALE</h2>
  <p class="ar-desc">Tutti contro tutti, fino a 6 piloti. Vince chi arriva per primo a 10 abbattimenti o chi ne ha di più dopo 5 minuti.</p>
  <p class="ar-pilot"><span>PILOTA</span> <b id="arName"></b></p>
  <button id="arQuick" class="launch-btn"><span>PARTITA VELOCE</span><b>${AR_ICO('play')}</b></button>
  <button id="arCreate" class="launch-btn ar-alt"><span>CREA UNA STANZA</span><b>${AR_ICO('user')}</b></button>
  <div class="ar-join"><input id="arCode" maxlength="4" placeholder="CODICE" aria-label="Codice della stanza" autocomplete="off" spellcheck="false"><button id="arJoinBtn" class="settings-btn"><span>ENTRA</span></button></div>
  <p id="arNote" class="ar-note"></p>
  <p id="arErr" class="ar-err"></p>
  <button id="arBack" class="text-btn">${AR_ICO('arrow-left')} <span>TORNA ALLA MAPPA</span></button>
 </div>
 <div id="arLobby" class="ar-lobby brief-card hidden">
  <p class="eyebrow">STANZA</p><h2 id="arRoom"></h2>
  <p class="ar-desc">Condividi il codice con gli amici. Intanto puoi volare e allenarti.</p>
  <ol id="arList" class="ar-list"></ol>
  <button id="arStart" class="launch-btn"><span>INIZIA LA SFIDA</span><b>${AR_ICO('chevrons')}</b></button>
  <p id="arWait" class="ar-note"></p>
  <button id="arLeave" class="text-btn">${AR_ICO('arrow-left')} <span>ESCI DALLA STANZA</span></button>
 </div>
 <div id="arHud" class="ar-hud hidden">
  <div class="ar-top"><span class="ar-chip"><small>STANZA</small><b id="arHudRoom"></b></span><span class="ar-chip"><small id="arPhaseLbl">ALLENAMENTO</small><b id="arTime">--:--</b></span><span class="ar-chip"><small>ABBATTIMENTI</small><b id="arKills">0</b></span></div>
  <ol id="arBoard" class="ar-board"></ol>
  <div id="arFeed" class="ar-feed"></div>
  <div id="arMsg" class="ar-msg"></div>
  <div class="ar-bars">
   <div class="seg"><div class="seg-head"><span>SCAFO</span><b id="arHp">100%</b></div><div class="seg-track"><i id="arHpBar"></i></div></div>
   <div class="seg"><div class="seg-head"><span>POST-BRUCIATORE</span><b id="arBo">100%</b></div><div class="seg-track"><i id="arBoBar"></i></div></div>
   <div class="seg"><div class="seg-head"><span>BARRIERA</span><b id="arSh">100%</b></div><div class="seg-track"><i id="arShBar"></i></div></div>
  </div>
  <div class="ar-tip">WASD muovi · MOUSE punta · clic / SPAZIO spara · SHIFT post-bruciatore · MOUSE DX / E barriera · ESC esci</div>
 </div>
 <div id="arEnd" class="ar-end hidden"><div class="brief-card">
  <p class="eyebrow">FINE DELLA SFIDA</p><h2 id="arWinner"></h2>
  <ol id="arFinal" class="ar-list ar-final"></ol>
  <p id="arNext" class="ar-note"></p>
  <button id="arEndLeave" class="text-btn">${AR_ICO('arrow-left')} <span>ESCI DALLA STANZA</span></button>
 </div></div>`;
 document.body.appendChild(s);
 arEl('arQuick').onclick=()=>arQuick();
 arEl('arCreate').onclick=()=>arJoin(arCode());
 arEl('arJoinBtn').onclick=()=>arJoin(arEl('arCode').value);
 arEl('arCode').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')arJoin(arEl('arCode').value)});
 arEl('arCode').addEventListener('input',e=>{e.target.value=arCleanCode(e.target.value)});
 arEl('arBack').onclick=()=>arExit();
 arEl('arLeave').onclick=()=>arLeaveRoom();
 arEl('arEndLeave').onclick=()=>arLeaveRoom();
 arEl('arStart').onclick=()=>{if(ar)ar.wantStart=true;arEl('arStart').blur()};
 // pulsante nel menu principale
 const top=document.querySelector('.top-actions'),mk=arEl('marketBtn');
 if(top&&!arEl('arenaBtn')){const b=document.createElement('button');b.id='arenaBtn';b.className='settings-btn arena-btn';b.setAttribute('aria-label','Sfida online');
  b.innerHTML=`${AR_ICO('globe')} <span>SFIDA ONLINE</span>`;b.onclick=()=>arOpen();top.insertBefore(b,mk||top.firstChild)}
}
function arOpen(){
 arBuildUI();if(typeof state!=='undefined'&&state!=='map')return;
 const p=arProfile();arEl('arName').textContent=p.nome;
 arEl('arNote').textContent=arDbUrl()?AR_T('Partite online con piloti di tutto il mondo.'):AR_T('MODALITÀ PROVA: senza la Realtime Database di Firebase la sfida funziona solo tra finestre di questo browser.');
 arEl('arErr').textContent='';
 arUI.on=true;state='arena';document.body.classList.add('arena-on');
 const map=arEl('mapScreen');if(map)map.classList.remove('active');
 arShow('arena',true);arShow('arMenu',true);arShow('arLobby',false);arShow('arHud',false);arShow('arEnd',false);
}
function arExit(){
 if(ar)arLeaveRoom();
 arUI.on=false;if(typeof state!=='undefined'&&state==='arena')state='map';
 document.body.classList.remove('arena-on');arShow('arena',false);
 if(typeof leaveGameFullscreen==='function')try{leaveGameFullscreen()}catch(e){}
 const map=arEl('mapScreen');if(map)map.classList.add('active');
}
function arErr(t){const e=arEl('arErr');if(e)e.textContent=t}
async function arQuick(){
 const url=arDbUrl();if(!url)return arJoin(ARENA.quick[0]);
 if(arUI.busy)return;arUI.busy=true;arErr(AR_T('RICERCA DI UNA STANZA…'));
 try{
  const counts=await Promise.all(ARENA.quick.map(c=>arRoomCount(url,c).catch(()=>ARENA.max)));
  let best=-1;for(let i=0;i<counts.length;i++)if(counts[i]<ARENA.max&&(best<0||(counts[i]>counts[best]&&counts[best]<ARENA.max)))best=i;
  arUI.busy=false;
  if(best<0)return arErr(AR_T('TUTTE LE STANZE SONO PIENE, CREANE UNA'));
  arJoin(ARENA.quick[best],true);
 }catch(e){arUI.busy=false;arErr(AR_T('RETE NON RAGGIUNGIBILE'))}
}
async function arJoin(code,checked=false){
 code=arCleanCode(code);if(code.length!==4)return arErr(AR_T('IL CODICE HA 4 LETTERE'));
 if(arUI.busy||ar)return;arUI.busy=true;arErr(AR_T('COLLEGAMENTO…'));
 const url=arDbUrl();
 try{
  if(url&&!checked){const n=await arRoomCount(url,code);if(n>=ARENA.max){arUI.busy=false;return arErr(AR_T('STANZA PIENA'))}}
  const p=arProfile(),pid=arPid(),g=arNew(pid,p.nome,p.mini);g.room=code;g.rocks=arRocks(code);arSpawn(g);
  const net=url?arNetFirebase(url,code,pid,(t,ch)=>{if(ar===g)arOnState(g,t,ch)}):arNetLocal(code,pid,(t,ch)=>{if(ar===g)arOnState(g,t,ch)});
  g.net=net;ar=g;
  await net.join(arFull(g));
  arUI.busy=false;arErr('');arUI.cam={x:g.me.x,y:g.me.y};arUI.feed=[];
  arShow('arMenu',false);arShow('arHud',true);arEl('arRoom').textContent=code;arEl('arHudRoom').textContent=code;
  arSyncPanels(true);
  if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
  if(typeof enterGameFullscreen==='function')try{enterGameFullscreen()}catch(e){}
  if(typeof sfx==='function')try{sfx('warp')}catch(e){}
 }catch(e){arUI.busy=false;if(ar&&ar.net)ar.net.leave();ar=null;arErr(AR_T('RETE NON RAGGIUNGIBILE'))}
}
function arLeaveRoom(){
 if(ar&&ar.net)ar.net.leave();ar=null;
 if(!arUI.on)return;
 arShow('arMenu',true);arShow('arLobby',false);arShow('arHud',false);arShow('arEnd',false);
}
function arFmt(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')}
function arPilotRow(g,p,i){
 const c=arColor(g,p.pid),ava=p.a?`<img src="${p.a}" alt="">`:`<em style="background:${c}">${arEsc(p.n[0]||'?')}</em>`;
 return `<li class="${p.me?'me':''}"><span class="ar-pos">${i+1}</span>${ava}<span class="ar-n" style="color:${c}">${arEsc(p.n)}</span><b>${p.k}</b><small>${p.d}</small></li>`;
}
function arSyncPanels(force){
 const g=ar;if(!g)return;
 const sc=arScore(g),key=g.phase+'|'+sc.map(p=>p.pid+p.k+'.'+p.d).join(',')+'|'+g.isHost;
 if(!force&&key===arUI.key)return;arUI.key=key;
 arShow('arLobby',g.phase==='L');arShow('arEnd',g.phase==='E');
 if(g.phase==='L'){
  arEl('arList').innerHTML=sc.map((p,i)=>arPilotRow(g,p,i)).join('');
  arShow('arStart',g.isHost);
  arEl('arWait').textContent=g.isHost?(sc.length<2?AR_T('Sei solo: puoi iniziare per provare, o aspettare altri piloti.'):''):AR_T('IN ATTESA CHE L’HOST AVVII LA SFIDA')+' · '+arName(g,arHostPid(g));
 }
 arEl('arBoard').innerHTML=sc.map((p,i)=>arPilotRow(g,p,i)).join('');
 if(g.phase==='E'){
  const w=sc[0];arEl('arWinner').textContent=w&&w.me?AR_T('VITTORIA!'):(w?AR_T('VINCE')+' '+w.n:'');
  arEl('arFinal').innerHTML=sc.map((p,i)=>arPilotRow(g,p,i)).join('');
 }
}
function arMessage(t,sec=2.2){arUI.msg=t;arUI.msgT=sec}
function arFeed(html){arUI.feed.unshift({html,t:5});arUI.feed.length=Math.min(arUI.feed.length,5)}
function arHandleEvents(g){
 for(const e of g.events){
  if(e.type==='phase'){
   if(e.ph==='C')arMessage(AR_T('LA SFIDA STA PER INIZIARE'),2.5);
   if(e.ph==='P'){arMessage(AR_T('VIA!'),1.4);if(typeof sfx==='function')try{sfx('warp')}catch(x){}}
   if(e.ph==='L')arMessage(AR_T('ALLENAMENTO LIBERO'),2);
  }
  else if(e.type==='death'){
   const v=`<b style="color:${arColor(g,e.victim)}">${arEsc(arName(g,e.victim))}</b>`;
   if(e.by)arFeed(`<b style="color:${arColor(g,e.by)}">${arEsc(arName(g,e.by))}</b> ${AR_ICO('laser')} ${v}`);else arFeed(`${v} ${AR_ICO('warning')} ${arEsc(AR_T('BORDO DELL’ARENA'))}`);
   if(e.victim===g.pid)arMessage(e.by?AR_T('ABBATTUTO DA')+' '+arName(g,e.by):AR_T('DISTRUTTO DAL BORDO DELL’ARENA'),ARENA.respawn);
   if(typeof sfx==='function')try{sfx('boom')}catch(x){}
  }
  else if(e.type==='kill'){arMessage(AR_T('BERSAGLIO ABBATTUTO')+' · '+arName(g,e.victim),1.6)}
  else if(e.type==='join')arFeed(`<i>${arEsc(e.n)}</i> ${arEsc(AR_T('È ENTRATO NELL’ARENA'))}`);
  else if(e.type==='left')arFeed(`<i>${arEsc(e.n)}</i> ${arEsc(AR_T('HA LASCIATO L’ARENA'))}`);
  else if(e.type==='shot'){if(typeof sfx==='function')try{sfx('shoot')}catch(x){}}
  else if(e.type==='hit'){if(typeof sfx==='function')try{sfx('hit')}catch(x){}}
 }
 g.events=[];
 for(const pid of g.drop)if(g.net)g.net.drop(pid);g.drop=[];
}
function arInput(g){
 const k=typeof keys!=='undefined'&&keys?keys:{},z=arZoom();
 const sx=W/2+(g.me.x-arUI.cam.x)*z,sy=H/2+(g.me.y-arUI.cam.y)*z;
 const inp={ax:(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),ay:(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),
  aim:Math.atan2(arUI.my-sy,arUI.mx-sx),fire:arUI.fire||!!k.Space,boost:!!(k.ShiftLeft||k.ShiftRight),shield:arUI.shield||!!k.KeyE};
 if(Math.hypot(arUI.mx-sx,arUI.my-sy)<8)inp.aim=g.me.r;
 // touch: le frecce del pad muovono nella direzione indicata, la mira cerca il pilota più vicino
 if(typeof document!=='undefined'&&document.body&&document.body.classList.contains('touch')){
  const wx=(k.ArrowRight?1:0)-(k.ArrowLeft?1:0),wy=(k.ArrowDown?1:0)-(k.ArrowUp?1:0),l=Math.hypot(wx,wy)||1;
  inp.world=true;inp.wx=wx/l;inp.wy=wy/l;inp.aim=(wx||wy)?Math.atan2(wy,wx):g.me.r;
  let best=null,bd=750;for(const pid in g.others){const o=g.others[pid];if(!o.s.al)continue;const d=Math.hypot(o.x-g.me.x,o.y-g.me.y);if(d<bd){bd=d;best=o}}
  if(best&&inp.fire)inp.aim=Math.atan2(best.y-g.me.y,best.x-g.me.x);
 }
 return inp;
}
function arUpdate(dt){
 const g=ar;if(!g)return;
 const patch=arTick(g,dt,arInput(g));
 if(patch&&g.net)g.net.send(patch);
 arHandleEvents(g);
 const m=g.me,lx=m.x+m.vx*.18,ly=m.y+m.vy*.18,k=Math.min(1,dt*6);
 arUI.cam.x+=(lx-arUI.cam.x)*k;arUI.cam.y+=(ly-arUI.cam.y)*k;
 arUI.msgT-=dt;for(const f of arUI.feed)f.t-=dt;arUI.feed=arUI.feed.filter(f=>f.t>0);
 // HUD
 arSyncPanels(false);
 const set=(id,v)=>{const e=arEl(id);if(e&&e.textContent!==v)e.textContent=v};
 const bar=(id,v)=>{const e=arEl(id);if(e)e.style.width=Math.max(0,Math.min(100,v))+'%'};
 set('arPhaseLbl',AR_T(g.phase==='P'?'TEMPO':g.phase==='C'?'VIA TRA':g.phase==='E'?'NUOVA SFIDA TRA':'ALLENAMENTO'));
 set('arTime',g.phase==='L'?'--:--':arFmt(g.rt));set('arKills',String(m.k));
 set('arHp',Math.round(m.h)+'%');bar('arHpBar',m.h);set('arBo',Math.round(ar.boost)+'%');bar('arBoBar',ar.boost);set('arSh',Math.round(ar.shield)+'%');bar('arShBar',ar.shield);
 const hb=arEl('arHpBar');if(hb&&typeof hpColor==='function')try{hb.style.background=hpColor(m.h)}catch(e){}
 if(g.phase==='E')set('arNext',AR_T('NUOVA SFIDA TRA')+' '+Math.ceil(g.rt)+' s');
 let msg=arUI.msgT>0?arUI.msg:'';
 if(!m.al&&g.phase!=='E')msg=(arUI.msgT>0?arUI.msg+' · ':'')+AR_T('RINASCITA TRA')+' '+Math.max(0,Math.ceil(g.respawnT));
 if(g.phase==='C')msg=AR_T('LA SFIDA STA PER INIZIARE')+' · '+Math.ceil(g.rt);
 set('arMsg',msg);
 const fh=arUI.feed.map(f=>`<p>${f.html}</p>`).join('');const fe=arEl('arFeed');if(fe&&fe.innerHTML!==fh)fe.innerHTML=fh;
}
function arZoom(){return Math.min(W,H)<620?.68:Math.min(W,H)<820?.85:1}
function arRockSprites(g){
 if(arUI.sprites&&arUI.sprites.room===g.room)return arUI.sprites.list;
 const list=g.rocks.map(o=>{
  try{const s=Math.ceil(o.r*2+8),c=document.createElement('canvas');c.width=c.height=s;const x=c.getContext('2d'),h=s/2;
   const n=o.pts.length;x.beginPath();for(let i=0;i<n;i++){const a=o.rot+i/n*6.283,rr=o.r*o.pts[i];i?x.lineTo(h+Math.cos(a)*rr,h+Math.sin(a)*rr):x.moveTo(h+Math.cos(a)*rr,h+Math.sin(a)*rr)}x.closePath();
   const gr=x.createRadialGradient(h-o.r*.35,h-o.r*.4,o.r*.1,h,h,o.r);const t=Math.round(70+o.shade*30);
   gr.addColorStop(0,`rgb(${t+60},${t+58},${t+66})`);gr.addColorStop(.6,`rgb(${t},${t-4},${t+8})`);gr.addColorStop(1,'rgb(22,24,32)');
   x.fillStyle=gr;x.fill();x.strokeStyle='rgba(150,220,255,.18)';x.lineWidth=2;x.stroke();
   const r2=arRand(arHash(g.room+o.x));for(let i=0;i<5;i++){const a=r2()*6.28,d=r2()*o.r*.55,cr=o.r*(.08+r2()*.12);x.fillStyle='rgba(10,12,20,.35)';x.beginPath();x.arc(h+Math.cos(a)*d,h+Math.sin(a)*d,cr,0,6.28);x.fill()}
   return {c,s}}catch(e){return null}
 });
 arUI.sprites={room:g.room,list};return list;
}
function arShipObj(x,y,a,s){return {x,y,angle:a,forward:+s.f||0,strafe:+s.s||0,boostState:s.bo?'active':'ready',barrier:!!s.sd,vx:+s.vx||0,vy:+s.vy||0,health:+s.h||0,shield:100}}
function arDrawShip(ship,hostile,color){
 try{drawShip(ship,hostile)}catch(e){
  ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-14,-13);ctx.lineTo(-8,0);ctx.lineTo(-14,13);ctx.closePath();ctx.fill();ctx.restore();
 }
}
function arDraw(){
 const g=ar;
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#02060c';ctx.fillRect(0,0,W,H);
 const cam=arUI.cam;
 try{drawStarfield(cam.x*.012,cam.y*.012)}catch(e){}
 try{drawNebula(cam.x*.004,cam.y*.004)}catch(e){}
 if(!g){try{if(typeof drawHomeSpace==='function')drawHomeSpace(performance.now()/1000)}catch(e){}try{drawVignette()}catch(e){}return}
 const z=arZoom(),now=performance.now()/1000;
 ctx.save();ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-cam.x,-cam.y);
 // bordo dell'arena
 ctx.lineWidth=600;ctx.strokeStyle='rgba(255,60,90,.07)';ctx.beginPath();ctx.arc(0,0,ARENA.R+300,0,6.283);ctx.stroke();
 ctx.lineWidth=5;ctx.strokeStyle=`rgba(81,230,255,${.35+.15*Math.sin(now*3)})`;ctx.setLineDash([46,26]);ctx.lineDashOffset=-now*40;ctx.beginPath();ctx.arc(0,0,ARENA.R,0,6.283);ctx.stroke();ctx.setLineDash([]);
 ctx.lineWidth=1.5;ctx.strokeStyle='rgba(81,230,255,.12)';ctx.beginPath();ctx.arc(0,0,ARENA.R*.5,0,6.283);ctx.stroke();
 // asteroidi
 const sp=arRockSprites(g);g.rocks.forEach((o,i)=>{const s=sp[i];if(s)ctx.drawImage(s.c,o.x-s.s/2,o.y-s.s/2);else{ctx.fillStyle='#555a66';ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,6.28);ctx.fill()}});
 // colpi
 ctx.lineCap='round';
 for(const b of g.bullets){const l=Math.hypot(b.vx,b.vy)||1;ctx.strokeStyle=b.c;ctx.globalAlpha=Math.min(1,b.life*3);ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx/l*22,b.y-b.vy/l*22);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-b.vx/l*12,b.y-b.vy/l*12);ctx.stroke()}
 ctx.globalAlpha=1;
 // altri piloti
 ctx.textAlign='center';ctx.font="600 12px 'Chakra Petch',sans-serif";
 for(const pid in g.others){const o=g.others[pid],s=o.s;if(!s.al)continue;const c=arColor(g,pid);
  if(s.iv&&Math.floor(now*10)%2)ctx.globalAlpha=.4;
  ctx.strokeStyle=c;ctx.globalAlpha*=.5;ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,o.y,27,0,6.283);ctx.stroke();ctx.globalAlpha=s.iv&&Math.floor(now*10)%2?.4:1;
  arDrawShip(arShipObj(o.x,o.y,o.r,s),true,c);ctx.globalAlpha=1;
  if(s.sd){ctx.strokeStyle='rgba(120,220,255,.7)';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(o.x,o.y,30,0,6.283);ctx.stroke()}
  ctx.fillStyle=c;ctx.fillText(arCleanName(s.n),o.x,o.y-40);
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(o.x-20,o.y-34,40,4);ctx.fillStyle=typeof hpColor==='function'?hpColor(+s.h||0):'#9dff6a';ctx.fillRect(o.x-20,o.y-34,40*Math.max(0,Math.min(1,(+s.h||0)/100)),4);
 }
 // la mia nave
 const m=g.me;
 if(m.al){if(g.inv>0&&Math.floor(now*10)%2)ctx.globalAlpha=.45;arDrawShip(arShipObj(m.x,m.y,m.r,m),false,'#51e6ff');ctx.globalAlpha=1;
  if(m.sd){ctx.strokeStyle='rgba(120,220,255,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(m.x,m.y,31,0,6.283);ctx.stroke()}}
 // particelle
 ctx.globalCompositeOperation='lighter';
 for(const p of g.parts){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.283);ctx.fill()}
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 ctx.restore();
 // indicatori ai bordi per i piloti fuori schermo
 for(const pid in g.others){const o=g.others[pid];if(!o.s.al)continue;const sx=W/2+(o.x-cam.x)*z,sy=H/2+(o.y-cam.y)*z;if(sx>0&&sx<W&&sy>0&&sy<H)continue;
  const a=Math.atan2(sy-H/2,sx-W/2),ex=Math.max(26,Math.min(W-26,W/2+Math.cos(a)*W)),ey=Math.max(26,Math.min(H-26,H/2+Math.sin(a)*H));
  const k=Math.min((W/2-26)/Math.abs(Math.cos(a)||1e-6),(H/2-26)/Math.abs(Math.sin(a)||1e-6)),px=W/2+Math.cos(a)*k,py=H/2+Math.sin(a)*k;
  ctx.save();ctx.translate(isFinite(px)?px:ex,isFinite(py)?py:ey);ctx.rotate(a);ctx.fillStyle=arColor(g,pid);ctx.globalAlpha=.85;ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-8);ctx.lineTo(-4,0);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.restore()}
 if(g.edge>0){ctx.fillStyle=`rgba(255,40,70,${g.edge*.5})`;ctx.fillRect(0,0,W,H)}
 try{drawVignette()}catch(e){}
}

// ---------------------------------------------------------------- aggancio al gioco
if(typeof update==='function'&&typeof draw==='function'){
 const arOrig={update,draw};
 update=function(dt){if(arUI.on){arUpdate(dt);return}return arOrig.update.apply(this,arguments)};
 draw=function(){if(arUI.on){arDraw();return}return arOrig.draw.apply(this,arguments)};
}
if(typeof musLevel==='function'){const o=musLevel;musLevel=function(){return arUI.on&&ar?'battle':o()}}
if(typeof musTheme==='function'){const o=musTheme;musTheme=function(l){return arUI.on&&ar?'spazio':o(l)}}
if(typeof addEventListener==='function'&&typeof document!=='undefined'){
 addEventListener('mousemove',e=>{arUI.mx=e.clientX;arUI.my=e.clientY});
 addEventListener('mousedown',e=>{if(!arUI.on||!ar)return;const t=e.target;if(t&&t.closest&&t.closest('button,input,a,select'))return;if(e.button===0)arUI.fire=true;if(e.button===2)arUI.shield=true});
 addEventListener('mouseup',e=>{if(e.button===0)arUI.fire=false;if(e.button===2)arUI.shield=false});
 addEventListener('blur',()=>{arUI.fire=false;arUI.shield=false});
 addEventListener('keydown',e=>{if(!arUI.on)return;
  if(e.code==='Escape'){if(ar)arLeaveRoom();else arExit();return}
  const t=e.target;if(t&&t.tagName==='INPUT')return;
  if(ar&&['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftRight','ShiftLeft'].includes(e.code))e.preventDefault()});
 addEventListener('pagehide',()=>{if(ar&&ar.net)ar.net.leave()});
 if(document.body)arBuildUI();
}
// traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["SFIDA ONLINE","ONLINE BATTLE","DÉFI EN LIGNE","DESAFÍO ONLINE","ОНЛАЙН-БИТВА","在线对战","オンライン対戦"],
  ["Sfida online","Online battle","Défi en ligne","Desafío online","Онлайн-битва","在线对战","オンライン対戦"],
  ["SFIDA ONLINE · DEATHMATCH","ONLINE BATTLE · DEATHMATCH","DÉFI EN LIGNE · DEATHMATCH","DESAFÍO ONLINE · DEATHMATCH","ОНЛАЙН-БИТВА · ДЕЗМАТЧ","在线对战 · 死亡竞赛","オンライン対戦 · デスマッチ"],
  ["ARENA SPAZIALE","SPACE ARENA","ARÈNE SPATIALE","ARENA ESPACIAL","КОСМИЧЕСКАЯ АРЕНА","太空竞技场","宇宙アリーナ"],
  ["Tutti contro tutti, fino a 6 piloti. Vince chi arriva per primo a 10 abbattimenti o chi ne ha di più dopo 5 minuti.","Free for all, up to 6 pilots. The first to reach 10 kills wins, or whoever has the most after 5 minutes.","Chacun pour soi, jusqu’à 6 pilotes. Le premier à 10 victoires gagne, ou celui qui en a le plus après 5 minutes.","Todos contra todos, hasta 6 pilotos. Gana el primero en llegar a 10 derribos o quien tenga más tras 5 minutos.","Каждый сам за себя, до 6 пилотов. Побеждает первый, кто сбьёт 10 врагов, или тот, у кого больше побед через 5 минут.","混战模式，最多 6 名飞行员。率先击落 10 架者获胜，或 5 分钟后击落最多者获胜。","最大6人のバトルロイヤル。先に10機撃墜するか、5分後に撃墜数が最も多いパイロットの勝利。"],
  ["PILOTA","PILOT","PILOTE","PILOTO","ПИЛОТ","飞行员","パイロット"],
  ["PARTITA VELOCE","QUICK MATCH","PARTIE RAPIDE","PARTIDA RÁPIDA","БЫСТРАЯ ИГРА","快速匹配","クイックマッチ"],
  ["CREA UNA STANZA","CREATE A ROOM","CRÉER UN SALON","CREAR UNA SALA","СОЗДАТЬ КОМНАТУ","创建房间","ルームを作成"],
  ["CODICE","CODE","CODE","CÓDIGO","КОД","代码","コード"],
  ["Codice della stanza","Room code","Code du salon","Código de la sala","Код комнаты","房间代码","ルームコード"],
  ["ENTRA","JOIN","ENTRER","ENTRAR","ВОЙТИ","加入","参加"],
  ["Partite online con piloti di tutto il mondo.","Online matches with pilots from all over the world.","Parties en ligne avec des pilotes du monde entier.","Partidas online con pilotos de todo el mundo.","Онлайн-матчи с пилотами со всего мира.","与世界各地的飞行员在线对战。","世界中のパイロットとオンライン対戦。"],
  ["MODALITÀ PROVA: senza la Realtime Database di Firebase la sfida funziona solo tra finestre di questo browser.","TEST MODE: without the Firebase Realtime Database the battle only works between windows of this browser.","MODE TEST : sans la Realtime Database de Firebase, le défi ne fonctionne qu’entre les fenêtres de ce navigateur.","MODO PRUEBA: sin la Realtime Database de Firebase el desafío solo funciona entre ventanas de este navegador.","ТЕСТОВЫЙ РЕЖИМ: без Firebase Realtime Database битва работает только между окнами этого браузера.","测试模式：没有 Firebase 实时数据库时，对战只能在本浏览器的窗口之间进行。","テストモード：Firebase Realtime Database がない場合、このブラウザのウィンドウ間でのみ対戦できます。"],
  ["STANZA","ROOM","SALON","SALA","КОМНАТА","房间","ルーム"],
  ["Condividi il codice con gli amici. Intanto puoi volare e allenarti.","Share the code with your friends. Meanwhile you can fly and practise.","Partage le code avec tes amis. En attendant, tu peux voler et t’entraîner.","Comparte el código con tus amigos. Mientras tanto puedes volar y entrenar.","Поделись кодом с друзьями. А пока можно летать и тренироваться.","把代码分享给朋友。等待时可以自由飞行练习。","コードを友だちに共有しよう。待つ間は自由に飛んで練習できます。"],
  ["INIZIA LA SFIDA","START THE BATTLE","LANCER LE DÉFI","EMPEZAR EL DESAFÍO","НАЧАТЬ БИТВУ","开始对战","対戦開始"],
  ["ESCI DALLA STANZA","LEAVE THE ROOM","QUITTER LE SALON","SALIR DE LA SALA","ВЫЙТИ ИЗ КОМНАТЫ","离开房间","ルームを出る"],
  ["ALLENAMENTO","PRACTICE","ENTRAÎNEMENT","ENTRENAMIENTO","ТРЕНИРОВКА","练习","練習"],
  ["ALLENAMENTO LIBERO","FREE PRACTICE","ENTRAÎNEMENT LIBRE","ENTRENAMIENTO LIBRE","СВОБОДНАЯ ТРЕНИРОВКА","自由练习","フリー練習"],
  ["ABBATTIMENTI","KILLS","VICTOIRES","DERRIBOS","СБИТО","击落","撃墜"],
  ["SCAFO","HULL","COQUE","CASCO","КОРПУС","船体","船体"],
  ["POST-BRUCIATORE","AFTERBURNER","POSTCOMBUSTION","POSCOMBUSTOR","ФОРСАЖ","加力燃烧","アフターバーナー"],
  ["BARRIERA","BARRIER","BARRIÈRE","BARRERA","БАРЬЕР","护盾","バリア"],
  ["WASD muovi · MOUSE punta · clic / SPAZIO spara · SHIFT post-bruciatore · MOUSE DX / E barriera · ESC esci","WASD move · MOUSE aim · click / SPACE fire · SHIFT afterburner · RIGHT MOUSE / E barrier · ESC leave","WASD bouger · SOURIS viser · clic / ESPACE tirer · MAJ postcombustion · CLIC DROIT / E barrière · ÉCHAP quitter","WASD mover · RATÓN apuntar · clic / ESPACIO disparar · MAYÚS poscombustor · CLIC DCHO / E barrera · ESC salir","WASD движение · МЫШЬ прицел · клик / ПРОБЕЛ огонь · SHIFT форсаж · ПКМ / E барьер · ESC выход","WASD 移动 · 鼠标 瞄准 · 点击 / 空格 射击 · SHIFT 加力 · 右键 / E 护盾 · ESC 离开","WASD 移動 · マウス 照準 · クリック / スペース 射撃 · SHIFT アフターバーナー · 右クリック / E バリア · ESC 退出"],
  ["FINE DELLA SFIDA","END OF THE BATTLE","FIN DU DÉFI","FIN DEL DESAFÍO","КОНЕЦ БИТВЫ","对战结束","対戦終了"],
  ["VITTORIA!","VICTORY!","VICTOIRE !","¡VICTORIA!","ПОБЕДА!","胜利！","勝利！"],
  ["VINCE","WINNER:","VAINQUEUR :","GANA","ПОБЕДИТЕЛЬ:","获胜者：","勝者："],
  ["TEMPO","TIME","TEMPS","TIEMPO","ВРЕМЯ","时间","時間"],
  ["VIA TRA","START IN","DÉPART DANS","SALIDA EN","СТАРТ ЧЕРЕЗ","开始倒计时","開始まで"],
  ["NUOVA SFIDA TRA","NEW BATTLE IN","NOUVEAU DÉFI DANS","NUEVO DESAFÍO EN","НОВАЯ БИТВА ЧЕРЕЗ","下一场对战倒计时","次の対戦まで"],
  ["LA SFIDA STA PER INIZIARE","THE BATTLE IS ABOUT TO START","LE DÉFI VA COMMENCER","EL DESAFÍO ESTÁ A PUNTO DE EMPEZAR","БИТВА СЕЙЧАС НАЧНЁТСЯ","对战即将开始","まもなく対戦開始"],
  ["VIA!","GO!","PARTEZ !","¡YA!","ВПЕРЁД!","开始！","スタート！"],
  ["ABBATTUTO DA","SHOT DOWN BY","ABATTU PAR","DERRIBADO POR","СБИТ ПИЛОТОМ","被击落，攻击者：","撃墜された："],
  ["DISTRUTTO DAL BORDO DELL’ARENA","DESTROYED BY THE ARENA EDGE","DÉTRUIT PAR LE BORD DE L’ARÈNE","DESTRUIDO POR EL BORDE DE LA ARENA","УНИЧТОЖЕН ГРАНИЦЕЙ АРЕНЫ","被竞技场边界摧毁","アリーナの境界で撃破"],
  ["BORDO DELL’ARENA","ARENA EDGE","BORD DE L’ARÈNE","BORDE DE LA ARENA","ГРАНИЦА АРЕНЫ","竞技场边界","アリーナの境界"],
  ["BERSAGLIO ABBATTUTO","TARGET DOWN","CIBLE ABATTUE","OBJETIVO DERRIBADO","ЦЕЛЬ СБИТА","目标已击落","目標撃墜"],
  ["RINASCITA TRA","RESPAWN IN","RETOUR DANS","REAPARICIÓN EN","ВОЗРОЖДЕНИЕ ЧЕРЕЗ","重生倒计时","復帰まで"],
  ["È ENTRATO NELL’ARENA","JOINED THE ARENA","A REJOINT L’ARÈNE","HA ENTRADO EN LA ARENA","ВОШЁЛ НА АРЕНУ","进入了竞技场","がアリーナに参加"],
  ["HA LASCIATO L’ARENA","LEFT THE ARENA","A QUITTÉ L’ARÈNE","HA SALIDO DE LA ARENA","ПОКИНУЛ АРЕНУ","离开了竞技场","がアリーナを退出"],
  ["IN ATTESA CHE L’HOST AVVII LA SFIDA","WAITING FOR THE HOST TO START","EN ATTENTE DU LANCEMENT PAR L’HÔTE","ESPERANDO A QUE EL ANFITRIÓN EMPIECE","ЖДЁМ, КОГДА ХОСТ НАЧНЁТ БИТВУ","等待房主开始对战","ホストの開始を待っています"],
  ["Sei solo: puoi iniziare per provare, o aspettare altri piloti.","You are alone: you can start to try it out, or wait for other pilots.","Tu es seul : tu peux lancer pour essayer, ou attendre d’autres pilotes.","Estás solo: puedes empezar para probar o esperar a otros pilotos.","Ты один: можно начать для пробы или подождать других пилотов.","只有你一人：可以先开始试玩，或等待其他飞行员。","1人だけです：試しに開始するか、他のパイロットを待ちましょう。"],
  ["RICERCA DI UNA STANZA…","LOOKING FOR A ROOM…","RECHERCHE D’UN SALON…","BUSCANDO UNA SALA…","ПОИСК КОМНАТЫ…","正在寻找房间…","ルームを検索中…"],
  ["TUTTE LE STANZE SONO PIENE, CREANE UNA","ALL ROOMS ARE FULL, CREATE ONE","TOUS LES SALONS SONT PLEINS, CRÉES-EN UN","TODAS LAS SALAS ESTÁN LLENAS, CREA UNA","ВСЕ КОМНАТЫ ЗАНЯТЫ, СОЗДАЙ СВОЮ","所有房间已满，请创建一个","すべてのルームが満員です。作成してください"],
  ["RETE NON RAGGIUNGIBILE","NETWORK UNREACHABLE","RÉSEAU INACCESSIBLE","RED NO DISPONIBLE","СЕТЬ НЕДОСТУПНА","无法连接网络","ネットワークに接続できません"],
  ["IL CODICE HA 4 LETTERE","THE CODE HAS 4 LETTERS","LE CODE A 4 LETTRES","EL CÓDIGO TIENE 4 LETRAS","В КОДЕ 4 БУКВЫ","代码为 4 个字母","コードは4文字です"],
  ["COLLEGAMENTO…","CONNECTING…","CONNEXION…","CONECTANDO…","ПОДКЛЮЧЕНИЕ…","正在连接…","接続中…"],
  ["STANZA PIENA","ROOM FULL","SALON PLEIN","SALA LLENA","КОМНАТА ЗАПОЛНЕНА","房间已满","ルームは満員です"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
 if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)try{i18nApply()}catch(e){}
}
