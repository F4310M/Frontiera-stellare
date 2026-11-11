// Conex — SFIDA ONLINE (2026-11-08): arena spaziale multigiocatore, deathmatch tutti contro tutti.
// Rete: Firebase Realtime Database via REST + EventSource (nessun SDK, come la classifica).
// Se in firebase-config.js manca databaseURL (oppure con ?arena=local) la sfida funziona tra le
// finestre dello stesso browser (BroadcastChannel): serve per provarla sul PC.
// Ogni pilota scrive solo il proprio stato; chi viene colpito decide il danno sulla propria nave
// e, se muore, dice chi lo ha abbattuto. L'host (il primo entrato) guida le fasi della partita.
// TEAM BATTLE (2026-11-09): seconda modalità, IMPERIALI (navi nemiche) contro RIBELLI (la nave del gioco),
// 3 contro 3. La modalità della stanza la decide l'host; chi entra per primo sceglie la squadra,
// gli ultimi prendono i posti rimasti. Niente fuoco amico. Il nome di ogni pilota è sotto la sua nave.
// In team battle la fazione scelta nel menu è la squadra preferita; la squadra decide la fazione (fa).
const ARENA={R:5000,max:6,dur:300,win:10,respawn:3,hz:12,hp:100,dmg:10,bulletSpeed:1050,bulletLife:1.05,
 fireCd:.17,maxDmg:65,stale:7,rocks:96,inv:2,countdown:4,endTime:12,shipR:16,meteorR:74,meteorSpeed:1450,
 // (2026-11-09) meteoriti come quelli intorno ai pianeti ma più resistenti: si rompono, i frammenti fanno danno,
 // e dopo un po' ricompaiono. Decide l'host (bit rb0..rb5), i frammenti li calcola ognuno uguale (seme).
 rockHp:[1,1.6,2.4],rockBack:35,fragN:10,fragDmg:14,fragLife:2.6,cometFirst:8,cometNear:1100,cometEvery:[14,24],rockBits:6,
 colors:['#51e6ff','#ffb340','#ff5268','#9dff6a','#c38bff','#ff7ad9'],
 quick:['ALFA','BETA','VEGA','NOVA','ORSA','LIRA','SOLE','LUNA'],
 // team battle: stanze veloci a parte, 3 posti per squadra, vince la prima squadra a 15 abbattimenti
 quickTeam:['AURA','DUNA','ZETA','KAPA','RIGA','TERA','VOLT','ONDA'],teamMax:3,teamWin:15,teamWait:1.5,
 teams:{1:{n:'IMPERIALI',c:'#ff5268',fa:'I'},2:{n:'RIBELLI',c:'#51e6ff',fa:'R'}},
 // missili del LANCIATORE MULTIPLO (mercato): 1 + livello missili guidati sui nemici più vicini
 // (2026-11-11) come nel gioco in singolo: il mirino aggancia i nemici sullo schermo in lock secondi, il missile insegue solo chi è agganciato
 mis:{speed:560,turn:3.4,life:3,dmg:20,cd:6,range:1500,lock:.8}};
const AR_FACTIONS={R:{id:'R',name:'RIBELLI',color:'#51e6ff'},I:{id:'I',name:'IMPERO GALATTICO',color:'#ff5268'}};
function arFaction(v){
 if(v==='I'||v==='R')return v;
 if(v===1)return'I';if(v===2)return'R';// in rete la fazione viaggia come numero (le regole del database accettano solo numeri)
 try{const s=localStorage.getItem('stellarArenaFaction');if(s==='I'||s==='R')return s}catch(e){}
 return'R';
}
function arFaNum(v){return arFaction(v)==='I'?1:2}
function arFactionInfo(v){return AR_FACTIONS[arFaction(v)]}

// ---------------------------------------------------------------- utilità pure (testate)
function arHash(s){let h=2166136261;for(const ch of String(s)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function arRand(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function arCode(rnd=Math.random){const L='ABCDEFGHJKLMNPQRSTUVWXYZ';let s='';for(let i=0;i<4;i++)s+=L[Math.floor(rnd()*L.length)%L.length];return s}
function arCleanCode(c){return String(c||'').toUpperCase().replace(/[^A-Z]/g,'').slice(0,4)}
function arPid(){const L='abcdefghijklmnopqrstuvwxyz0123456789';let s='';for(let i=0;i<10;i++)s+=L[Math.floor(Math.random()*36)];return s}
function arCleanName(n){return String(n||'').replace(/[^\p{L}\p{N} ]/gu,'').trim().slice(0,16)||'PILOTA'}
// asteroidi uguali per tutti i piloti della stessa stanza
// materiali dei meteoriti della fascia intorno ai pianeti (game.js makeOrbitalBelt)
const AR_ROCK_MAT=[{fill:'#584435',edge:'#d7ac78'},{fill:'#294e56',edge:'#87d4cf'},{fill:'#503756',edge:'#d3a0ee'}];
function arRocks(code){
 const r=arRand(arHash('rocce'+code)),out=[];
 for(let tries=0;out.length<ARENA.rocks&&tries<4000;tries++){
  const a=r()*Math.PI*2,d=ARENA.R*(.1+r()*.84),rad=34+r()*86,x=Math.cos(a)*d,y=Math.sin(a)*d;
  if(out.some(o=>Math.hypot(o.x-x,o.y-y)<o.r+rad+120))continue;
  const n=9+Math.floor(r()*4),pts=[];for(let i=0;i<n;i++)pts.push(.78+r()*.22);
  const mat=out.length%3,hp=Math.round((60+rad)*ARENA.rockHp[mat]);
  out.push({x,y,r:rad,pts,rot:r()*6.28,shade:r(),mat,v:Math.floor(r()*8),hp,dmg:0,br:0,bt:0,n:0,fade:0});
 }
 return out;
}
// meteoriti rotti in 3 numeri da 19 bit (le regole del database accettano solo numeri sotto il milione)
function arRockMask(g){const m=Array(ARENA.rockBits).fill(0);g.rocks.forEach((o,i)=>{if(o.br&&i<ARENA.rockBits*19)m[Math.floor(i/19)]+=2**(i%19)});return m}
function arRockBroken(mask,i){return Math.floor((+mask[Math.floor(i/19)]||0)/2**(i%19))%2===1}
function arRockBreak(g,i){
 const o=g.rocks[i];if(!o||o.br)return;
 o.br=1;o.bt=g.time;o.n++;
 arBlast(g,o.x,o.y,AR_ROCK_MAT[o.mat||0].edge,34,1.3);arBlast(g,o.x,o.y,'#ffd099',18,.9);
 // frammenti uguali per tutti: stesso seme (stanza, meteorite, quante volte si è rotto)
 const r=arRand(arHash(g.room+'|frag|'+i+'|'+o.n));
 for(let k=0;k<ARENA.fragN;k++){const a=k/ARENA.fragN*6.283+r()*.4,sp=260+r()*300,off=o.r*.45;
  g.frags.push({x:o.x+Math.cos(a)*off,y:o.y+Math.sin(a)*off,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:6+r()*7,rot:a,spin:(r()-.5)*6,life:ARENA.fragLife,v:Math.floor(r()*10),hit:0})}
 if(g.frags.length>200)g.frags.splice(0,g.frags.length-200);
 g.events.push({type:'rock',x:o.x,y:o.y});
}
function arRockRestore(g,i){const o=g.rocks[i];if(!o||!o.br)return;o.br=0;o.dmg=0;o.fade=1}
// un colpo prende un meteorite: l'host tiene il conto vero, gli altri solo le crepe
function arRockHit(g,i,dmg){
 const o=g.rocks[i];if(!o||o.br)return;
 if(g.isHost){o.dmg+=dmg;if(o.dmg>=o.hp)arRockBreak(g,i)}else o.dmg=Math.min(o.hp*.92,o.dmg+dmg);
}
function arRockTick(g,dt){
 if(g.isHost){
  for(let i=0;i<g.rocks.length;i++){const o=g.rocks[i];
   if(o.br&&g.time-o.bt>ARENA.rockBack){// ricompare se non c'è nessuna nave sopra
    const busy=arActive(g).some(p=>p.s.al&&Math.hypot((+p.s.x||0)-o.x,(+p.s.y||0)-o.y)<o.r+80);if(!busy)arRockRestore(g,i)}}
 }else{
  const h=g.others[arHostPid(g)];
  if(h&&typeof h.s.rb0==='number'){const mask=Array.from({length:ARENA.rockBits},(_,k)=>+h.s['rb'+k]||0);
   g.rocks.forEach((o,i)=>{const b=arRockBroken(mask,i);if(b&&!o.br)arRockBreak(g,i);else if(!b&&o.br)arRockRestore(g,i)})}
 }
 for(const o of g.rocks)if(o.fade>0)o.fade=Math.max(0,o.fade-dt*1.5);
 // frammenti: volano, rallentano e fanno male a chi colpiscono
 const m=g.me;
 for(const f of g.frags){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=1-.45*dt;f.vy*=1-.45*dt;f.rot+=f.spin*dt;f.life-=dt;
  if(!f.hit&&m.al&&Math.hypot(m.x-f.x,m.y-f.y)<f.r+ARENA.shipR){f.hit=1;f.life=0;arBlast(g,f.x,f.y,'#ffbf7e',8,.5);g.events.push({type:'bump',p:.55});if(arHurt(g,ARENA.fragDmg,''))g.events.push({type:'hit'})}}
 g.frags=g.frags.filter(f=>f.life>0);
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
// potenziamenti comprati nel mercato che valgono anche in arena: laser, barriera, motori, doppio laser
// (2026-11-09) anche lanciatore multiplo (missili guidati) e iniettori (post-bruciatore che dura di più)
const AR_UPS=['laser','shield','speed','twin','salvo','fuel'];
function arUpgrades(get){const u={};for(const k of AR_UPS)u[k]=Math.max(0,Math.min(3,Math.floor(+(get?get(k):0)||0)));return u}
// i livelli viaggiano in rete in un solo numero (4 valori per potenziamento), così gli altri vedono i pezzi sulla nave
function arUgCode(up){let n=0;AR_UPS.forEach((k,i)=>{n+=Math.max(0,Math.min(3,(up&&up[k])|0))*4**i});return n}
function arUgDecode(n){n=Math.max(0,Math.floor(+n||0));const u={};AR_UPS.forEach((k,i)=>{u[k]=Math.floor(n/4**i)%4});return u}
function arDamage(up){return Math.round(ARENA.dmg*(1+.5*(up&&up.laser||0))*(up&&up.twin?.65:1))}
function arNew(pid,name,avatar,up,mode,faction){
 if(typeof mode==='string'){faction=mode;mode=0}// arNew(pid,nome,foto,pot,fazione) come prima
 const u=arUpgrades(k=>up&&up[k]),md=mode===1?1:0,fa=arFaction(faction);
 return {pid,up:u,mode:md,wantTeam:fa==='I'?1:2,room:'',rocks:[],time:0,phase:'L',rt:0,isHost:true,wantStart:false,
  me:{n:arCleanName(name),a:avatar||'',fa,j:Date.now(),x:0,y:0,vx:0,vy:0,r:0,f:0,s:0,h:ARENA.hp,sd:0,bo:0,iv:0,al:1,k:0,d:0,dz:0,by:'',sh:[],md,tm:0,tj:0,ug:arUgCode(u)},
  boost:100,shield:100,shieldHit:0,inv:0,respawnT:0,fireCd:0,misCd:0,fireHeld:false,charge:0,shotSeq:0,shots:[],sendT:0,
  meteor:null,meteorT:ARENA.cometFirst,meteorSeq:0,frags:[],
  others:{},bullets:[],parts:[],events:[],drop:[]};
}
function arActive(g){return [{pid:g.pid,s:g.me}].concat(Object.keys(g.others).map(pid=>({pid,s:g.others[pid].s})))}
function arHostPid(g){let best=null;for(const p of arActive(g)){const j=+p.s.j||0;if(!best||j<best.j||(j===best.j&&p.pid<best.pid))best={pid:p.pid,j}}return best?best.pid:g.pid}
// squadre: 1 imperiali, 2 ribelli, 0 nessuna (deathmatch o non ancora scelta)
function arTeamOf(g,pid){if(pid===g.pid)return +g.me.tm||0;const o=g.others[pid];return o?+o.s.tm||0:0}
function arAlly(g,a,b){if(g.mode!==1||!a||!b||a===b)return false;const t=arTeamOf(g,a);return t>0&&t===arTeamOf(g,b)}
function arTeamCount(g,tm,except){return arActive(g).filter(p=>p.pid!==except&&(+p.s.tm||0)===tm).length}
function arTeamFree(g,tm){return arTeamCount(g,tm,g.pid)<ARENA.teamMax}
// squadra da prendere: quella voluta se ha posto, altrimenti quella con meno piloti (i posti rimasti)
function arPickTeam(g,want){
 if((want===1||want===2)&&arTeamFree(g,want))return want;
 const c1=arTeamCount(g,1,g.pid),c2=arTeamCount(g,2,g.pid);
 return c1<c2?1:c2<c1?2:(want===1?1:2);
}
// scelta della squadra: solo in sala d'attesa e solo se c'è posto
function arTm(g,tm){g.me.tm=tm;g.me.tj=Math.round((Date.now()-g.me.j)/100)/10;if(ARENA.teams[tm])g.me.fa=ARENA.teams[tm].fa}
function arSetTeam(g,tm){
 if(g.mode!==1||(tm!==1&&tm!==2)||g.me.tm===tm)return false;
 if(g.me.tm&&g.phase!=='L')return false;
 if(!arTeamFree(g,tm))return false;
 arTm(g,tm);g.wantTeam=tm;
 if(g.me.al&&g.phase==='L')arSpawn(g);
 g.events.push({type:'team',tm});return true;
}
// ordine di arrivo nella squadra (per risolvere due scelte quasi contemporanee dell'ultimo posto)
function arTeamTime(s){return (+s.j||0)+(+s.tj||0)*1000}
function arTeamFix(g){
 if(g.mode!==1){if(g.me.tm){g.me.tm=0;g.me.tj=0;g.me.fa=g.wantTeam===1?'I':'R'}return}
 if(!g.me.tm){
  if(g.time<ARENA.teamWait)return;// aspetta di conoscere gli altri piloti della stanza
  arTm(g,arPickTeam(g,g.wantTeam||0));
  if(g.me.al&&g.phase!=='P')arSpawn(g);
  g.events.push({type:'team',tm:g.me.tm});return;
 }
 const mates=arActive(g).filter(p=>(+p.s.tm||0)===g.me.tm).sort((a,b)=>arTeamTime(a.s)-arTeamTime(b.s)||(a.pid<b.pid?-1:1));
 if(mates.length>ARENA.teamMax&&mates.findIndex(p=>p.pid===g.pid)>=ARENA.teamMax){
  const other=3-g.me.tm;
  if(arTeamFree(g,other)){arTm(g,other);if(g.phase!=='P')arSpawn(g);g.events.push({type:'team',tm:other,moved:true})}
 }
}
function arTeamScore(g){const t={1:0,2:0};for(const p of arActive(g)){const tm=+p.s.tm||0;if(t[tm]!==undefined)t[tm]+=+p.s.k||0}return t}
function arWinTeam(g){const t=arTeamScore(g);return t[1]>t[2]?1:t[2]>t[1]?2:0}
function arColor(g,pid){const p=pid===g.pid?g.me:g.others[pid]&&g.others[pid].s;return arFactionInfo(p&&p.fa).color}
function arScore(g){
 const ts=g.mode===1?arTeamScore(g):null,tv=p=>ts?(ts[p.tm]||0):0;// team battle: prima la squadra in testa
 return arActive(g).map(p=>({pid:p.pid,n:arCleanName(p.s.n),a:p.s.a||'',fa:arFaction(p.s.fa),k:+p.s.k||0,d:+p.s.d||0,j:+p.s.j||0,tm:+p.s.tm||0,me:p.pid===g.pid})).sort((a,b)=>tv(b)-tv(a)||b.k-a.k||a.d-b.d||a.j-b.j);
}
function arName(g,pid){if(pid===g.pid)return g.me.n;const o=g.others[pid];return o?arCleanName(o.s.n):'?'}
function arBlast(g,x,y,color,n=26,power=1){
 for(let i=0;i<n;i++){const a=Math.random()*6.28,s=(40+Math.random()*260)*power;g.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.5+Math.random()*.7,max:1.2,color,r:1.5+Math.random()*3.5})}
}
function arFree(g,x,y,r){return Math.hypot(x,y)<ARENA.R-80&&!g.rocks.some(o=>!o.br&&Math.hypot(o.x-x,o.y-y)<o.r+r+40)}
function arSpawn(g){
 let best=null,bestD=-1;const side=g.mode===1&&g.me.tm?(g.me.tm===1?Math.PI:0):null;// team battle: ogni squadra parte dal suo lato
 for(let i=0;i<30;i++){
  const a=side===null?Math.random()*6.28:side+(Math.random()-.5)*1.4,d=ARENA.R*(side===null?.25+Math.random()*.55:.5+Math.random()*.3),x=Math.cos(a)*d,y=Math.sin(a)*d;
  if(!arFree(g,x,y,40))continue;
  let near=1e9;for(const pid in g.others){if(arAlly(g,pid,g.pid))continue;const o=g.others[pid];near=Math.min(near,Math.hypot(o.x-x,o.y-y))}
  if(near>bestD){bestD=near;best={x,y}}
  if(near>900)break;
 }
 best=best||{x:0,y:0};
 Object.assign(g.me,{x:best.x,y:best.y,vx:0,vy:0,r:Math.atan2(-best.y,-best.x),h:ARENA.hp,al:1});
 g.inv=ARENA.inv;g.boost=100;g.shield=100;g.respawnT=0;
}
function arEnterPhase(g,ph){
 if(g.phase===ph)return;g.phase=ph;
 if(ph==='C'){g.me.k=0;g.me.d=0;g.rocks.forEach((o,i)=>{arRockRestore(g,i);o.dmg=0});g.frags=[];arSpawn(g);g.bullets=[]}
 g.events.push({type:'phase',ph});
}
function arHurt(g,amount,by){
 const m=g.me;if(!m.al||g.inv>0||g.phase==='C'||g.phase==='E')return false;
 if(m.sd){amount*=.3;g.shieldHit=.55}
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
   const dmg=Math.max(1,Math.min(ARENA.maxDmg,+sh[5]||ARENA.dmg));// danno dichiarato da chi spara, con un tetto
   const rad=Math.max(3,Math.min(12,+sh[6]||3)),power=Math.max(0,Math.min(1,+sh[7]||0));
   const tg=typeof sh[8]==='string'?sh[8].slice(0,10):null;// missile guidato: pilota bersaglio
   g.bullets.push({x:+sh[1],y:+sh[2],vx:+sh[3],vy:+sh[4],dmg,r:rad,power,o:pid,life:tg!==null?ARENA.mis.life:power?1.35:ARENA.bulletLife,c:col,big:power>0||dmg>ARENA.dmg*1.2,mis:tg!==null,tg});
   if(tg!==null&&tg===g.pid)g.events.push({type:'lock'})}
  // abbattimenti: chi è morto dice chi lo ha colpito
  const dz=+s.dz||0;
  if(dz>o.lastDz){o.lastDz=dz;
   arBlast(g,o.x,o.y,'#ffb340',46,1.4);arBlast(g,o.x,o.y,col,18,.8);
   if(s.by===g.pid){g.me.k++;g.events.push({type:'kill',victim:pid})}
   g.events.push({type:'death',by:s.by||'',victim:pid});
  }
 }
}
// missili del lanciatore multiplo: ogni missile va su un bersaglio agganciato (senza aggancio vola dritto)
function arTargets(g,n){
 const L=(g.locks||[]).filter(l=>l.p>=1).map(l=>l.pid),out=[];
 for(let i=0;i<n;i++)out.push(L.length?L[i%L.length]:'');return out;
}
// ---------------------------------------------------------------- aggancio dei missili guidati (2026-11-11)
// Chi aggancia manda lk0..lk2 = codice numerico del pilota agganciato (le regole del database accettano solo numeri):
// chi riceve il proprio codice sa di essere nel mirino e vede il bordo dello schermo rosso che pulsa.
function arLockCode(pid){return pid?arHash(pid)%999983+1:0}
function arLockView(){if(typeof W!=='number'||typeof H!=='number')return{w:1e9,h:1e9};const z=arZoom();return{w:W/2/z+30,h:H/2/z+30}}
function arLockOk(g,pid,v){const o=g.others[pid],m=g.me;if(!o||!o.s.al||o.s.iv||arAlly(g,pid,g.pid))return false;
 return Math.abs(o.x-m.x)<v.w&&Math.abs(o.y-m.y)<v.h&&Math.hypot(o.x-m.x,o.y-m.y)<ARENA.mis.range}
function arLockTick(g,dt){
 const m=g.me,n=1+(g.up.salvo|0);
 if(!m.al||g.phase==='C'||g.phase==='E')g.locks=[];
 else{
  const v=arLockView(),L=(g.locks||[]).filter(l=>arLockOk(g,l.pid,v));
  if(L.length<n){const taken=new Set(L.map(l=>l.pid)),free=[];
   for(const pid in g.others)if(!taken.has(pid)&&arLockOk(g,pid,v))free.push({pid,d:Math.hypot(g.others[pid].x-m.x,g.others[pid].y-m.y)});
   free.sort((a,b)=>a.d-b.d);for(const f of free.slice(0,n-L.length))L.push({pid:f.pid,p:0,snd:false})}
  g.locks=L.slice(0,n);
  for(const l of g.locks){l.p=Math.min(1,l.p+dt/ARENA.mis.lock);if(l.p>=1&&!l.snd){l.snd=true;g.events.push({type:'locked'})}}
 }
 // chi ha agganciato me, e i missili che mi inseguono
 const code=arLockCode(g.pid);let by=0;
 if(m.al)for(const pid in g.others){const s=g.others[pid].s;if(!s.al||arAlly(g,pid,g.pid))continue;if(+s.lk0===code||+s.lk1===code||+s.lk2===code)by++}
 const inc=m.al&&g.bullets.some(b=>b.mis&&b.tg===g.pid&&b.o!==g.pid);
 if((by>0||inc)&&!(g.lockedBy>0||g.misIn))g.events.push({type:'targeted'});
 g.lockedBy=by;g.misIn=inc;
}
function arLockSend(g){const L=(g.locks||[]).filter(l=>l.p>=1);return{lk0:L[0]?arLockCode(L[0].pid):0,lk1:L[1]?arLockCode(L[1].pid):0,lk2:L[2]?arLockCode(L[2].pid):0}}
function arLaunch(g){
 const lv=g.up.salvo|0;if(g.misCd>0)return false;
 const m=g.me,n=lv+1,tgs=arTargets(g,n);
 for(let i=0;i<n;i++){g.shotSeq++;
  const a=m.r+(i-(n-1)/2)*.45,c=Math.cos(a),s=Math.sin(a),sp=ARENA.mis.speed*.6;
  const sh=[g.shotSeq,Math.round(m.x+c*18),Math.round(m.y+s*18),Math.round(m.vx*.4+c*sp),Math.round(m.vy*.4+s*sp),ARENA.mis.dmg,4,0,tgs[i]];// [6]=raggio [7]=carica [8]=bersaglio
  g.shots.push({t:g.time,sh});
  g.bullets.push({x:sh[1],y:sh[2],vx:sh[3],vy:sh[4],dmg:ARENA.mis.dmg,o:g.pid,life:ARENA.mis.life,c:arColor(g,g.pid),mis:true,tg:tgs[i]});
 }
 g.misCd=ARENA.mis.cd;g.events.push({type:'missile'});return true;
}
function arShoot(g,power=0){
 power=Math.max(0,Math.min(1,+power||0));
 const m=g.me,c=Math.cos(m.r),s=Math.sin(m.r),base=arDamage(g.up),dmg=Math.min(ARENA.maxDmg,Math.round(base*(power?2+power*.6:1))),rad=power?7+power*5:3,offs=power?[0]:(g.up.twin?[-7,7]:[0]);
 for(const o of offs){g.shotSeq++;
  const speed=ARENA.bulletSpeed*(power?.88:1);
  const sh=[g.shotSeq,Math.round(m.x+c*24-s*o),Math.round(m.y+s*24+c*o),Math.round(m.vx*.5+c*speed),Math.round(m.vy*.5+s*speed),dmg,Math.round(rad*10)/10,Math.round(power*100)/100];
  g.shots.push({t:g.time,sh});
  g.bullets.push({x:sh[1],y:sh[2],vx:sh[3],vy:sh[4],dmg,r:rad,power,o:g.pid,life:power?1.35:ARENA.bulletLife,c:arColor(g,g.pid),big:power>0||g.up.laser});
 }
 if(power){m.vx-=c*(60+120*power);m.vy-=s*(60+120*power);arBlast(g,m.x+c*32,m.y+s*32,'#b8f6ff',6+Math.round(8*power),.6+power*.6)}
 g.fireCd=ARENA.fireCd;g.events.push({type:'shot',power});
}
// ---- effetti della nave come nel gioco in singolo (game.js exhaust, megacolpo.js)
const AR_FX={chargeStart:.28,chargeFull:1.25};
function arChargeLevel(ch){return Math.max(0,Math.min(1,(ch-AR_FX.chargeStart)/(AR_FX.chargeFull-AR_FX.chargeStart)))}
// fiammate morbide dei motori: stesse quantità, velocità e colori di exhaust() in game.js
function arExhaust(g,x,y,a,vx,vy,lx,ly,dx,dy,rate,color,dt){
 const n=Math.floor(rate*dt+Math.random());if(!n)return;
 const ca=Math.cos(a),sa=Math.sin(a),px=x+ca*lx-sa*ly,py=y+sa*lx+ca*ly,ex=ca*dx-sa*dy,ey=sa*dx+ca*dy;
 for(let i=0;i<n;i++){const life=.34+Math.random()*.5,sp=48+Math.random()*115;
  g.parts.push({x:px+(Math.random()-.5)*4,y:py+(Math.random()-.5)*4,vx:vx+ex*sp+(Math.random()-.5)*20,vy:vy+ey*sp+(Math.random()-.5)*20,life,max:life,color,r:1.6+Math.random()*3.8,soft:true})}
}
// particelle risucchiate verso la prua mentre si carica il mega colpo
function arChargeFx(g,x,y,a,vx,vy,L,dt){
 const nx=x+Math.cos(a)*30,ny=y+Math.sin(a)*30,n=Math.floor((10+30*L)*dt+Math.random());
 for(let i=0;i<n;i++){const q=Math.random()*6.28,d=34+Math.random()*30+L*24,life=.22+Math.random()*.12;
  g.parts.push({x:nx+Math.cos(q)*d,y:ny+Math.sin(q)*d,vx:-Math.cos(q)*d/life+vx,vy:-Math.sin(q)*d/life+vy,life,max:life,color:L>=1?'#e6d2ff':'#7cf2ff',r:1+Math.random()*1.6})}
}
function arShipFx(g,x,y,a,vx,vy,s,hostile,dt){
 const f=+s.f||0,st=+s.s||0,bo=!!+s.bo,col=hostile?'#ff5268':'#51e6ff',hot=hostile?'#ffd0d6':'#bff8ff';
 if(f>0)arExhaust(g,x,y,a,vx,vy,-15,0,-1,0,bo?145:42,bo?hot:col,dt);
 if(f<0)arExhaust(g,x,y,a,vx,vy,20,0,1,0,35,col,dt);
 if(st>0)arExhaust(g,x,y,a,vx,vy,0,-11,0,-1,34,col,dt);
 if(st<0)arExhaust(g,x,y,a,vx,vy,0,11,0,1,34,col,dt);
 if(+s.cg>0)arChargeFx(g,x,y,a,vx,vy,Math.min(1,+s.cg),dt);
}
function arShipsFx(g,dt){
 const m=g.me,L=m.al&&g.fireHeld&&g.charge>AR_FX.chargeStart?arChargeLevel(g.charge):-1;
 const prev=+m.cg||0;m.cg=L>=0?Math.max(.01,Math.round(L*100)/100):0;
 if(L>=0){g.cgTick=(g.cgTick||0)-dt;if(L<1&&g.cgTick<=0){g.cgTick=.11;g.events.push({type:'charge',L})}if(L>=1&&prev<1)g.events.push({type:'charged'})}else g.cgTick=0;
 if(m.al)arShipFx(g,m.x,m.y,m.r,m.vx,m.vy,m,arHostile(g,g.pid),dt);
 for(const pid in g.others){const o=g.others[pid],s=o.s;if(s.al)arShipFx(g,o.x,o.y,o.r,+s.vx||0,+s.vy||0,s,arHostile(g,pid),dt)}
}
// colpo che va a segno: il mega colpo esplode come in megacolpo.js
function arHitFx(g,b){
 if(b.mis)arBlast(g,b.x,b.y,'#ffb340',16,.8);
 else if(b.power>0){arBlast(g,b.x,b.y,'#d8f8ff',8,.8);arBlast(g,b.x,b.y,'#c9f7ff',16+Math.round(b.power*14),1+b.power*1.2);g.events.push({type:'mega',x:b.x,y:b.y,power:b.power})}
 else arBlast(g,b.x,b.y,b.c,6,.4);
}
function arPhysics(g,dt,inp){
 const m=g.me;
 if(!m.al){g.respawnT-=dt;m.f=0;m.s=0;m.bo=0;m.sd=0;if(g.respawnT<=0&&g.phase!=='E')arSpawn(g);return}
 const locked=g.phase==='C'||g.phase==='E';
 // prua verso la mira
 let da=((inp.aim-m.r+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
 m.r+=Math.max(-9*dt,Math.min(9*dt,da));
 const c=Math.cos(m.r),s=Math.sin(m.r);
 let wx=locked?0:(inp.wx!=null?inp.wx:inp.ax||0),wy=locked?0:(inp.wy!=null?inp.wy:-(inp.ay||0));
 const wl=Math.hypot(wx,wy);if(wl>1){wx/=wl;wy/=wl}
 const boosting=!locked&&inp.boost&&g.boost>5&&(wx||wy);
 g.boost=Math.max(0,Math.min(100,g.boost+(boosting?-38*(1-.2*Math.min(2,g.up.fuel||0)):16)*dt));
 const sp1=1+.12*(g.up.speed||0),acc=(boosting?560:430)*sp1,max=(boosting?590:240)*sp1;
 m.vx+=wx*acc*dt;m.vy+=wy*acc*dt;
 if(inp.brake){const brake=Math.max(0,1-4.8*dt);m.vx*=brake;m.vy*=brake}
 const sp=Math.hypot(m.vx,m.vy);if(sp>max){const k=max/sp;m.vx*=k+(1-k)*.85;m.vy*=k+(1-k)*.85}
 const drag=(wx||wy)?.25:.9;m.vx*=Math.max(0,1-drag*dt);m.vy*=Math.max(0,1-drag*dt);
 m.x+=m.vx*dt;m.y+=m.vy*dt;
 const forward=wx*c+wy*s,side=-wx*s+wy*c;m.f=forward>.15?1:forward<-.15?-1:0;m.s=side>.15?1:side<-.15?-1:0;m.bo=boosting?1:0;
 // barriera
 const shieldOn=!locked&&inp.shield&&g.shield>2;
 g.shield=Math.max(0,Math.min(100,g.shield+(shieldOn?-32/(1+.35*(g.up.shield||0)):12)*dt));m.sd=shieldOn?1:0;
 // asteroidi: rimbalzo
 for(const o of g.rocks){if(o.br)continue;const dx=m.x-o.x,dy=m.y-o.y,d=Math.hypot(dx,dy),min=o.r+ARENA.shipR;
  if(d<min&&d>0){const nx=dx/d,ny=dy/d;m.x=o.x+nx*min;m.y=o.y+ny*min;const vn=m.vx*nx+m.vy*ny;if(vn<0){m.vx-=1.6*vn*nx;m.vy-=1.6*vn*ny;if(vn<-25)g.events.push({type:'bump',p:Math.min(1,-vn/420)})}}}
 // bordo dell'arena: spinge dentro e brucia lo scafo
 const dist=Math.hypot(m.x,m.y);
 if(dist>ARENA.R){const nx=m.x/dist,ny=m.y/dist;m.vx-=nx*700*dt;m.vy-=ny*700*dt;if(dist>ARENA.R+300){m.x=nx*(ARENA.R+300);m.y=ny*(ARENA.R+300)}
  if(arHurt(g,22*dt,''))g.edge=.3}
 g.fireCd-=dt;g.misCd=Math.max(0,g.misCd-dt);
 const firing=!!inp.fire&&!locked;
 if(firing&&!g.fireHeld){g.fireHeld=true;g.charge=0;if(g.fireCd<=0)arShoot(g,0)}
 else if(firing&&g.fireHeld)g.charge=Math.min(1.25,g.charge+dt);
 else if(!firing&&g.fireHeld){if(g.charge>=.28&&g.fireCd<=0)arShoot(g,(g.charge-.28)/(.97));g.fireHeld=false;g.charge=0}
 if(locked){g.fireHeld=false;g.charge=0}
 if(inp.missile&&!locked)arLaunch(g);
}
function arMeteorSpawn(g){
 const r=arRand(arHash(g.room+'-meteor-'+(++g.meteorSeq))),a=r()*Math.PI*2,nx=Math.cos(a),ny=Math.sin(a);
 // come nel singolo la cometa passa dove ci sono i piloti: la traiettoria sfiora uno di loro
 const pil=[g.me,...Object.values(g.others).map(o=>o.s)].filter(p=>p&&+p.al),t=pil.length?pil[Math.floor(r()*pil.length)]:null;
 const px=t?Math.max(-ARENA.R,Math.min(ARENA.R,+t.x||0)):0,py=t?Math.max(-ARENA.R,Math.min(ARENA.R,+t.y||0)):0,off=t?(r()-.5)*500:(r()*1.2-.6)*ARENA.R;
 g.meteor={x:px+nx*(ARENA.R+700)-ny*off,y:py+ny*(ARENA.R+700)+nx*off,vx:-nx*ARENA.meteorSpeed,vy:-ny*ARENA.meteorSpeed,w:3,life:(ARENA.R*2+1800)/ARENA.meteorSpeed};
}
function arMeteorTick(g,dt,host){
 if(g.phase!=='P'&&g.phase!=='L'){if(host){g.meteor=null;g.meteorT=ARENA.cometFirst}return}
 if(host){
  if(!g.meteor){g.meteorT-=dt;if(g.meteorT<=0)arMeteorSpawn(g)}
  const m=g.meteor;if(m){if(m.w>0)m.w=Math.max(0,m.w-dt);else{m.x+=m.vx*dt;m.y+=m.vy*dt;m.life-=dt;if(m.life<=0){g.meteor=null;const E=ARENA.cometEvery;g.meteorT=E[0]+(g.meteorSeq%4)/3*(E[1]-E[0])}}
   // la cometa spazza via i meteoriti che incontra
   if(m&&m.w<=0)g.rocks.forEach((o,i)=>{if(!o.br&&Math.hypot(o.x-m.x,o.y-m.y)<ARENA.meteorR+o.r*.8)arRockBreak(g,i)})}
 }else{
  const h=g.others[arHostPid(g)],s=h&&h.s;
  g.meteor=s&&(+s.ml>0||+s.mw>0)?{x:+s.mx||0,y:+s.my||0,vx:+s.mvx||0,vy:+s.mvy||0,w:+s.mw||0,life:+s.ml||0}:null;
 }
 const m=g.meteor;if(m&&m.w>0&&g.cometWarn!==g.meteorSeq+'|'+Math.round(m.x)){g.cometWarn=g.meteorSeq+'|'+Math.round(m.x);if(!g.cometSeen||g.time-g.cometSeen>6){g.cometSeen=g.time;g.events.push({type:'comet'})}}
 if(!m||m.w>0||m.life<=0)return;
 for(const f of g.frags)if(Math.hypot(f.x-m.x,f.y-m.y)<ARENA.meteorR+f.r)f.life=0;
 for(const b of g.bullets)if(Math.hypot(b.x-m.x,b.y-m.y)<ARENA.meteorR+(b.r||3))b.life=0;
 if(g.me.al&&Math.hypot(g.me.x-m.x,g.me.y-m.y)<ARENA.meteorR+ARENA.shipR){g.inv=0;g.me.sd=0;arHurt(g,999,'')}
}
// un passo di gioco; restituisce lo stato da inviare (o null)
function arTick(g,dt,inp){
 g.time+=dt;g.inv=Math.max(0,g.inv-dt);g.edge=Math.max(0,(g.edge||0)-dt);g.shieldHit=Math.max(0,(g.shieldHit||0)-dt);
 // piloti spariti (finestra chiusa o rete caduta)
 for(const pid of Object.keys(g.others)){const o=g.others[pid];if(g.time-o.seen>ARENA.stale){g.events.push({type:'left',n:arCleanName(o.s.n)});delete g.others[pid];g.drop.push(pid)}}
 // fasi della partita: le decide l'host
 const host=arHostPid(g);g.isHost=host===g.pid;
 if(g.isHost){
  if(g.phase==='L'&&g.wantStart){g.wantStart=false;arEnterPhase(g,'C');g.rt=ARENA.countdown}
  else if(g.phase==='C'){g.rt-=dt;if(g.rt<=0){arEnterPhase(g,'P');g.rt=ARENA.dur}}
  else if(g.phase==='P'){g.rt-=dt;if(g.rt<=0||(g.mode===1?Math.max(...Object.values(arTeamScore(g)))>=ARENA.teamWin:arScore(g).some(p=>p.k>=ARENA.win))){arEnterPhase(g,'E');g.rt=ARENA.endTime}}
  else if(g.phase==='E'){g.rt-=dt;if(g.rt<=0){arEnterPhase(g,'L');g.rt=0}}
  g.wantStart=false;
 }else{
  const h=g.others[host];
  // la modalità della stanza è quella dell'host (chi entra con un codice si adegua)
  if(h&&(+h.s.md||0)!==g.mode){g.mode=+h.s.md===1?1:0;g.me.md=g.mode;g.events.push({type:'mode'})}
  if(h&&h.s.ph){if(h.s.ph!==g.phase)arEnterPhase(g,h.s.ph);g.rt=Math.max(0,(+h.s.rt||0)-(g.time-h.seen))}
 }
 g.me.ph=g.phase;g.me.rt=Math.round(g.rt*10)/10;g.me.md=g.mode;
 arTeamFix(g);
 arPhysics(g,dt,inp);
 arShipsFx(g,dt);
 arMeteorTick(g,dt,g.isHost);
 arRockTick(g,dt);
 g.me.iv=g.inv>0?1:0;
 // colpi
 for(const b of g.bullets){
  if(b.mis){// missile: punta il bersaglio a velocità costante
   const t=b.tg===g.pid?(g.me.al?g.me:null):(b.tg&&g.others[b.tg]&&g.others[b.tg].s.al?g.others[b.tg]:null);
   let a=Math.atan2(b.vy,b.vx);
   if(t){const da=((Math.atan2(t.y-b.y,t.x-b.x)-a+Math.PI*3)%(Math.PI*2))-Math.PI;a+=Math.max(-ARENA.mis.turn*dt,Math.min(ARENA.mis.turn*dt,da))}
   const sp=Math.min(ARENA.mis.speed,Math.hypot(b.vx,b.vy)+700*dt);b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp;
   if(Math.random()<.6)g.parts.push({x:b.x,y:b.y,vx:-b.vx*.1+(Math.random()-.5)*30,vy:-b.vy*.1+(Math.random()-.5)*30,life:.35,max:.5,color:'#ffb340',r:2+Math.random()*2});
  }
  b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
  if(b.power>0&&!b.mis){(b.tr||(b.tr=[])).push({x:b.x,y:b.y});if(b.tr.length>9)b.tr.shift();b.spin=(b.spin||Math.random()*6.28)+dt*9;
   if(Math.random()<.7)g.parts.push({x:b.x+(Math.random()-.5)*b.r*2,y:b.y+(Math.random()-.5)*b.r*2,vx:-b.vx*.08+(Math.random()-.5)*40,vy:-b.vy*.08+(Math.random()-.5)*40,life:.35,max:.35,color:'#9feaff',r:1.5+Math.random()*2});
   if(b.life<=0){arBlast(g,b.x,b.y,'#c9f7ff',16+Math.round(b.power*14),1+b.power*1.2);g.events.push({type:'mega',x:b.x,y:b.y,power:b.power});continue}}
  const hr=ARENA.shipR+(b.mis?7:(b.r||3));
  const ri=g.rocks.findIndex(o=>!o.br&&Math.hypot(o.x-b.x,o.y-b.y)<o.r);
  if(ri>=0){b.life=0;if(b.power>0)arHitFx(g,b);else arBlast(g,b.x,b.y,'#9aa7b8',5,.4);arRockHit(g,ri,b.dmg||ARENA.dmg);continue}
  if(b.o!==g.pid&&!arAlly(g,b.o,g.pid)&&g.me.al&&Math.hypot(g.me.x-b.x,g.me.y-b.y)<hr){
   b.life=0;arHitFx(g,b);if(arHurt(g,b.dmg||ARENA.dmg,b.o))g.events.push({type:'hit'});continue;
  }
  for(const pid in g.others){if(pid===b.o||arAlly(g,pid,b.o))continue;const o=g.others[pid];// niente fuoco amico
   if(o.s.al&&!o.s.iv&&Math.hypot(o.x-b.x,o.y-b.y)<hr){b.life=0;arHitFx(g,b);break}}
 }
 g.bullets=g.bullets.filter(b=>b.life>0);
 for(const p of g.parts){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=1-1.8*dt;p.vy*=1-1.8*dt;p.life-=dt}
 g.parts=g.parts.filter(p=>p.life>0);if(g.parts.length>1200)g.parts.splice(0,g.parts.length-1200);
 // gli altri piloti: posizione prevista dall'ultimo stato, raggiunta con dolcezza
 for(const pid in g.others){const o=g.others[pid],s=o.s,age=Math.min(.3,g.time-o.seen),tx=s.x+(+s.vx||0)*age,ty=s.y+(+s.vy||0)*age;
  if(Math.hypot(tx-o.x,ty-o.y)>320){o.x=tx;o.y=ty}else{const k=Math.min(1,dt*12);o.x+=(tx-o.x)*k;o.y+=(ty-o.y)*k}
  const da=((+s.r||0)-o.r+Math.PI*3)%(Math.PI*2)-Math.PI;o.r+=da*Math.min(1,dt*14)}
 arLockTick(g,dt);
 g.shots=g.shots.filter(s=>g.time-s.t<.6);
 g.sendT-=dt;
 if(g.sendT>0)return null;
 g.sendT=1/ARENA.hz;
 const m=g.me;
 const mt=g.isHost&&g.meteor?g.meteor:null;const rb=arRockMask(g);
 return {x:Math.round(m.x),y:Math.round(m.y),vx:Math.round(m.vx),vy:Math.round(m.vy),r:Math.round(m.r*100)/100,f:m.f,s:m.s,
  h:Math.round(m.h),sd:m.sd,bo:m.bo,iv:m.iv,al:m.al,k:m.k,d:m.d,dz:m.dz,by:m.by,sh:g.shots.map(s=>s.sh),ph:m.ph,rt:m.rt,
  mx:mt?Math.round(mt.x):0,my:mt?Math.round(mt.y):0,mvx:mt?Math.round(mt.vx):0,mvy:mt?Math.round(mt.vy):0,mw:mt?Math.round(mt.w*10)/10:0,ml:mt?Math.round(mt.life*10)/10:0,ms:g.meteorSeq,rb0:rb[0],rb1:rb[1],rb2:rb[2],rb3:rb[3],rb4:rb[4],rb5:rb[5],md:g.mode,tm:m.tm,tj:m.tj,ug:m.ug,fa:arFaNum(m.fa),cg:m.cg||0,...arLockSend(g)};
}
function arFull(g){const m=g.me,p=arTickSnapshot(g);return Object.assign({n:m.n,j:m.j,fa:arFaNum(m.fa)},m.a?{a:m.a}:{},p)}
function arTickSnapshot(g){const m=g.me;return {x:Math.round(m.x),y:Math.round(m.y),vx:0,vy:0,r:Math.round(m.r*100)/100,f:0,s:0,h:Math.round(m.h),sd:0,bo:0,iv:1,al:m.al,k:m.k,d:m.d,dz:m.dz,by:m.by,ph:m.ph,rt:m.rt,mx:0,my:0,mvx:0,mvy:0,mw:0,ml:0,ms:0,rb0:0,rb1:0,rb2:0,rb3:0,rb4:0,rb5:0,cg:0,md:g.mode,tm:m.tm,tj:m.tj,ug:m.ug,lk0:0,lk1:0,lk2:0}}

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
const arUI={on:false,mx:0,my:0,fire:false,shield:false,missile:false,mode:0,ngLv:null,cam:{x:0,y:0},sprites:null,feed:[],msg:'',msgT:0,busy:false};
let arFactionChoice=arFaction();
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
 <div id="arMenu" class="ar-page">
  <header class="ar-page-top">
   <button id="arBack" class="text-btn">${AR_ICO('arrow-left')} <span>TORNA ALLA MAPPA</span></button>
   <p class="eyebrow">SFIDA ONLINE</p>
   <p class="ar-pilot"><span>PILOTA</span> <b id="arName"></b></p>
  </header>
  <div class="ar-page-body">
   <section class="ar-page-col">
    <h2>ARENA SPAZIALE</h2>
    <p class="ar-lead">Battaglie tra piloti veri, fino a 6 per stanza, in un campo di meteoriti attraversato dalle comete.</p>
    <p class="ar-sec">MODALITÀ</p>
    <div class="ar-modes" role="radiogroup" aria-label="Modalità">
     <button id="arModeFfa" class="ar-mode" data-mode="0" role="radio"><b>DEATHMATCH</b><small>TUTTI CONTRO TUTTI</small></button>
     <button id="arModeTeam" class="ar-mode" data-mode="1" role="radio"><b>TEAM BATTLE</b><small>IMPERIALI CONTRO RIBELLI</small></button>
    </div>
    <p id="arDescFfa" class="ar-desc">Tutti contro tutti, fino a 6 piloti. Vince chi arriva per primo a 10 abbattimenti o chi ne ha di più dopo 5 minuti.</p>
    <p id="arDescTeam" class="ar-desc hidden">Due squadre da 3: gli IMPERIALI volano con le navi nemiche, i RIBELLI con la nave del gioco. Chi entra per primo sceglie la squadra, gli ultimi prendono i posti rimasti. Vince la prima squadra a 15 abbattimenti o quella che ne ha di più dopo 5 minuti.</p>
    <p class="ar-faction-label">SCEGLI LA FAZIONE <small id="arFactionHint">· IN TEAM BATTLE È LA SQUADRA CHE PREFERISCI</small></p>
    <div class="ar-factions" role="group" aria-label="Scegli la fazione">
     <button id="arRebels" type="button" data-faction="R"><i></i><span>RIBELLI</span><small>NAVI BLU</small></button>
     <button id="arEmpire" type="button" data-faction="I"><i></i><span>IMPERO GALATTICO</span><small>NAVI ROSSE</small></button>
    </div>
    <ul class="ar-feats">
     <li><b>METEORITI</b><span>Resistenti come quelli intorno ai pianeti: se li rompi, i frammenti colpiscono chi è vicino.</span></li>
     <li><b>COMETE</b><span>Attraversano l’arena e spazzano via navi, colpi e meteoriti: guarda l’avviso.</span></li>
     <li><b>MERCATO</b><span>I tuoi potenziamenti del mercato valgono anche qui: laser, barriera, motori, doppio laser, iniettori e lanciatore multiplo (missili guidati).</span></li>
    </ul>
   </section>
   <section class="ar-page-col ar-page-play">
    <p class="ar-sec">GIOCA</p>
    <button id="arQuick" class="launch-btn"><span>PARTITA VELOCE</span><b>${AR_ICO('play')}</b></button>
    <button id="arCreate" class="launch-btn ar-alt"><span>CREA UNA STANZA</span><b>${AR_ICO('user')}</b></button>
    <p class="ar-sec">HAI UN CODICE?</p>
    <div class="ar-join"><input id="arCode" maxlength="4" placeholder="CODICE" aria-label="Codice della stanza" autocomplete="off" spellcheck="false"><button id="arJoinBtn" class="settings-btn"><span>ENTRA</span></button></div>
    <p id="arNote" class="ar-note"></p>
    <p id="arErr" class="ar-err"></p>
    <p class="ar-sec">COMANDI</p>
    <dl class="ar-keys">
     <div><dt>WASD</dt><dd>MUOVI</dd></div><div><dt>MOUSE</dt><dd>PUNTA</dd></div>
     <div><dt>CLIC</dt><dd>SPARA · TIENI PREMUTO PER CARICARE</dd></div><div><dt>SHIFT</dt><dd>POST-BRUCIATORE</dd></div>
     <div><dt>MOUSE DX / E</dt><dd>BARRIERA</dd></div><div><dt>Q / ROTELLA</dt><dd>MISSILI</dd></div>
     <div><dt>F</dt><dd>FRENA</dd></div><div><dt>ESC</dt><dd>ESCI</dd></div>
    </dl>
   </section>
  </div>
 </div>
 <div id="arLobby" class="ar-lobby brief-card hidden">
  <p class="eyebrow"><span>STANZA</span> · <span id="arLobbyMode">DEATHMATCH</span></p><h2 id="arRoom"></h2>
  <p class="ar-desc">Condividi il codice con gli amici. Intanto puoi volare e allenarti.</p>
  <ol id="arList" class="ar-list"></ol>
  <div id="arTeams" class="ar-teams hidden"></div>
  <button id="arStart" class="launch-btn"><span>INIZIA LA SFIDA</span><b>${AR_ICO('chevrons')}</b></button>
  <p id="arWait" class="ar-note"></p>
  <button id="arLeave" class="text-btn">${AR_ICO('arrow-left')} <span>ESCI DALLA STANZA</span></button>
 </div>
 <div id="arHud" class="ar-hud hidden">
  <div class="ar-top"><span class="ar-chip"><small>STANZA</small><b id="arHudRoom"></b></span><span class="ar-chip"><small id="arPhaseLbl">ALLENAMENTO</small><b id="arTime">--:--</b></span><span class="ar-chip"><small>ABBATTIMENTI</small><b id="arKills">0</b></span><span id="arTeamChip" class="ar-chip ar-tchip hidden"><small><i class="t1">IMPERIALI</i> · <i class="t2">RIBELLI</i></small><b><i class="t1" id="arT1">0</i> – <i class="t2" id="arT2">0</i></b></span><span id="arMisChip" class="ar-chip hidden"><small>MISSILI</small><b id="arMis">PRONTI</b></span></div>
  <ol id="arBoard" class="ar-board"></ol>
  <div id="arFeed" class="ar-feed"></div>
  <div id="arMsg" class="ar-msg"></div>
  <div class="ar-bars">
   <div class="seg"><div class="seg-head"><span>SCAFO</span><b id="arHp">100%</b></div><div class="seg-track"><i id="arHpBar"></i></div></div>
   <div class="seg"><div class="seg-head"><span>POST-BRUCIATORE</span><b id="arBo">100%</b></div><div class="seg-track"><i id="arBoBar"></i></div></div>
   <div class="seg"><div class="seg-head"><span>BARRIERA</span><b id="arSh">100%</b></div><div class="seg-track"><i id="arShBar"></i></div></div>
  </div>
  <div class="ar-tip">WASD muovi · MOUSE punta · clic spara / tieni premuto carica · F frena · SHIFT post-bruciatore · MOUSE DX / E barriera · Q / ROTELLA missili · ESC esci</div>
 </div>
 <div id="arEnd" class="ar-end hidden"><div class="brief-card">
  <p class="eyebrow">FINE DELLA SFIDA</p><h2 id="arWinner"></h2>
  <p id="arTeamFinal" class="ar-team-final hidden"></p>
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
 for(const b of s.querySelectorAll('.ar-mode'))b.onclick=()=>arSetMode(+b.dataset.mode);
 arEl('arTeams').addEventListener('click',e=>{const b=e.target&&e.target.closest&&e.target.closest('button[data-team]');if(!b||!ar)return;
  if(arSetTeam(ar,+b.dataset.team))arSyncPanels(true);b.blur()});
 try{arUI.mode=localStorage.getItem('stellarArenaModo')==='1'?1:0}catch(e){}
 arSetMode(arUI.mode);
 for(const id of ['arRebels','arEmpire'])arEl(id).onclick=e=>arSetFaction(e.currentTarget.dataset.faction);
 // pulsante nel menu principale
 const top=document.querySelector('.top-actions'),mk=arEl('marketBtn');
 if(top&&!arEl('arenaBtn')){const b=document.createElement('button');b.id='arenaBtn';b.className='settings-btn arena-btn';b.setAttribute('aria-label','Sfida online');
  b.innerHTML=`${AR_ICO('globe')} <span>SFIDA ONLINE</span>`;b.onclick=()=>arOpen();top.insertBefore(b,mk||top.firstChild)}
}
function arSetMode(md){
 arUI.mode=md===1?1:0;try{localStorage.setItem('stellarArenaModo',String(arUI.mode))}catch(e){}
 for(const b of document.querySelectorAll('#arena .ar-mode')){const on=+b.dataset.mode===arUI.mode;b.classList.toggle('on',on);b.setAttribute('aria-checked',on?'true':'false')}
 arShow('arDescFfa',arUI.mode===0);arShow('arDescTeam',arUI.mode===1);arShow('arFactionHint',arUI.mode===1);
}
function arFactionSync(){
 for(const [id,fa] of [['arRebels','R'],['arEmpire','I']]){const b=arEl(id);if(b){const on=arFactionChoice===fa;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on))}}
}
function arSetFaction(fa){arFactionChoice=arFaction(fa);try{localStorage.setItem('stellarArenaFaction',arFactionChoice)}catch(e){}arFactionSync()}
function arOpen(){
 arBuildUI();if(typeof state!=='undefined'&&state!=='map')return;
 // Le sfide online sono competitive: entrando si disattiva sempre GOD MODE.
 if(typeof godMode!=='undefined'&&godMode&&typeof setGodMode==='function')setGodMode(false);
 const p=arProfile();arEl('arName').textContent=p.nome;
 arFactionChoice=arFaction();arFactionSync();
 arEl('arNote').textContent=arDbUrl()?AR_T('Partite online con piloti di tutto il mondo.'):AR_T('MODALITÀ PROVA: senza la Realtime Database di Firebase la sfida funziona solo tra finestre di questo browser.');
 arEl('arErr').textContent='';
 arUI.on=true;state='arena';document.body.classList.add('arena-on');
 const map=arEl('mapScreen');if(map)map.classList.remove('active');
 arShow('arena',true);arShow('arMenu',true);arShow('arLobby',false);arShow('arHud',false);arShow('arEnd',false);
}
function arExit(){
 if(ar)arLeaveRoom();
 arUI.on=false;if(typeof state!=='undefined'&&state==='arena')state='map';
 document.body.classList.remove('arena-on');arAimOff();arShow('arena',false);
 if(typeof leaveGameFullscreen==='function')try{leaveGameFullscreen()}catch(e){}
 const map=arEl('mapScreen');if(map)map.classList.add('active');
}
function arErr(t){const e=arEl('arErr');if(e)e.textContent=t}
async function arQuick(){
 const url=arDbUrl(),list=arUI.mode===1?ARENA.quickTeam:ARENA.quick;if(!url)return arJoin(list[0]);
 if(arUI.busy)return;arUI.busy=true;arErr(AR_T('RICERCA DI UNA STANZA…'));
 try{
  const counts=await Promise.all(list.map(c=>arRoomCount(url,c).catch(()=>ARENA.max)));
  let best=-1;for(let i=0;i<counts.length;i++)if(counts[i]<ARENA.max&&(best<0||(counts[i]>counts[best]&&counts[best]<ARENA.max)))best=i;
  arUI.busy=false;
  if(best<0)return arErr(AR_T('TUTTE LE STANZE SONO PIENE, CREANE UNA'));
  arJoin(list[best],true);
 }catch(e){arUI.busy=false;arErr(AR_T('RETE NON RAGGIUNGIBILE'))}
}
async function arJoin(code,checked=false){
 code=arCleanCode(code);if(code.length!==4)return arErr(AR_T('IL CODICE HA 4 LETTERE'));
 if(arUI.busy||ar)return;arUI.busy=true;arErr(AR_T('COLLEGAMENTO…'));
 const url=arDbUrl();
 try{
  if(url&&!checked){const n=await arRoomCount(url,code);if(n>=ARENA.max){arUI.busy=false;return arErr(AR_T('STANZA PIENA'))}}
  const p=arProfile(),pid=arPid(),g=arNew(pid,p.nome,p.mini,arUpgrades(typeof upg==='function'?upg:null),arUI.mode,arFactionChoice);g.room=code;g.rocks=arRocks(code);arSpawn(g);
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
 const c=arColor(g,p.pid),F=arFactionInfo(p.fa),tcls=g.mode===1&&p.tm?' t'+p.tm:'',ava=p.a?`<img src="${p.a}" alt="">`:`<em style="background:${c}">${arEsc(p.n[0]||'?')}</em>`;
 return `<li class="${p.me?'me':''}${tcls}"><span class="ar-pos">${i+1}</span>${ava}<span class="ar-n" style="color:${c}">${arEsc(p.n)}</span><span class="ar-fa" style="--fa:${c}" title="${AR_T(F.name)}">${F.id}</span><b>${p.k}</b><small>${p.d}</small></li>`;
}
function arTeamName(tm){const t=ARENA.teams[tm];return t?AR_T(t.n):''}
// sala d'attesa della team battle: due colonne, ognuna con i suoi 3 posti
function arTeamsHtml(g,sc){
 return [1,2].map(tm=>{
  const list=sc.filter(p=>p.tm===tm),mine=g.me.tm===tm,free=list.length<ARENA.teamMax,canMove=!mine&&free&&(g.phase==='L'||!g.me.tm);
  const rows=list.map((p,i)=>arPilotRow(g,p,i)).join('')+Array.from({length:Math.max(0,ARENA.teamMax-list.length)},()=>`<li class="ar-empty"><span class="ar-pos">·</span><span class="ar-n">${arEsc(AR_T('POSTO LIBERO'))}</span></li>`).join('');
  const btn=mine?`<p class="ar-tmine">${arEsc(AR_T('LA TUA SQUADRA'))}</p>`:`<button class="settings-btn" data-team="${tm}"${canMove?'':' disabled'}><span>${arEsc(free?AR_T('UNISCITI'):AR_T('SQUADRA COMPLETA'))}</span></button>`;
  return `<div class="ar-team t${tm}${mine?' mine':''}"><h3><span>${arEsc(arTeamName(tm))}</span><small>${list.length}/${ARENA.teamMax}</small></h3><ol class="ar-list">${rows}</ol>${btn}</div>`;
 }).join('');
}
function arSyncPanels(force){
 const g=ar;if(!g)return;
 const sc=arScore(g),key=g.phase+'|'+g.mode+'|'+g.me.tm+'|'+sc.map(p=>p.pid+p.k+'.'+p.d+'.'+p.tm).join(',')+'|'+g.isHost;
 if(!force&&key===arUI.key)return;arUI.key=key;
 arShow('arLobby',g.phase==='L');arShow('arEnd',g.phase==='E');
 const team=g.mode===1;
 const lm=arEl('arLobbyMode');if(lm)lm.textContent=team?'TEAM BATTLE':'DEATHMATCH';
 arShow('arTeamChip',team);arShow('arList',!team);arShow('arTeams',team);
 if(g.phase==='L'){
  if(team)arEl('arTeams').innerHTML=arTeamsHtml(g,sc);
  arEl('arList').innerHTML=sc.map((p,i)=>arPilotRow(g,p,i)).join('');
  arShow('arStart',g.isHost);
  arEl('arWait').textContent=g.isHost?(sc.length<2?AR_T('Sei solo: puoi iniziare per provare, o aspettare altri piloti.'):''):AR_T('IN ATTESA CHE L’HOST AVVII LA SFIDA')+' · '+arName(g,arHostPid(g));
 }
 arEl('arBoard').innerHTML=sc.map((p,i)=>arPilotRow(g,p,i)).join('');
 if(g.phase==='E'){
  const w=sc[0];
  if(team){
   const wt=arWinTeam(g),ts=arTeamScore(g);
   arEl('arWinner').textContent=wt===0?AR_T('PAREGGIO'):(wt===g.me.tm?AR_T('VITTORIA!')+' ':'')+(wt===1?AR_T('VINCONO GLI IMPERIALI'):AR_T('VINCONO I RIBELLI'));
   const tf=arEl('arTeamFinal');if(tf)tf.innerHTML=`<i class="t1">${arEsc(arTeamName(1))} ${ts[1]}</i> – <i class="t2">${ts[2]} ${arEsc(arTeamName(2))}</i>`;
  }else arEl('arWinner').textContent=w&&w.me?AR_T('VITTORIA!'):(w?AR_T('VINCE')+' '+w.n:'');
  arShow('arTeamFinal',team);
  arEl('arFinal').innerHTML=sc.map((p,i)=>arPilotRow(g,p,i)).join('');
 }
}
function arMessage(t,sec=2.2){arUI.msg=t;arUI.msgT=sec}
function arFeed(html){arUI.feed.unshift({html,t:5});arUI.feed.length=Math.min(arUI.feed.length,5)}
function arHandleEvents(g){
 for(const e of g.events){
  if(e.type==='phase'){
   if(e.ph==='C')arMessage(AR_T('LA SFIDA STA PER INIZIARE'),2.5);
   if(e.ph==='P'){arMessage(AR_T('VIA!')+(g.mode===1&&g.me.tm?' · '+arTeamName(g.me.tm):''),1.6);if(typeof sfx==='function')try{sfx('warp')}catch(x){}}
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
  else if(e.type==='team'){arMessage((e.moved?AR_T('SQUADRA COMPLETA')+' · ':'')+AR_T('LA TUA SQUADRA')+': '+arTeamName(e.tm),2.2);arSyncPanels(true)}
  else if(e.type==='mode')arSyncPanels(true);
  else if(e.type==='lock')arFeedLock(g);
  else if(e.type==='locked'){if(typeof sfx==='function')try{sfx('lock')}catch(x){}}
  else if(e.type==='targeted'){arMessage(AR_T('SEI AGGANCIATO!'),1.6);if(typeof tone==='function')try{tone(760,.12,'square',.03,1180)}catch(x){}}
  else if(e.type==='rock'){if(typeof sfx==='function'&&Math.hypot(e.x-g.me.x,e.y-g.me.y)<1400)try{sfx('boom')}catch(x){}}
  else if(e.type==='comet'){arMessage(AR_T('COMETA IN ARRIVO!'),2.4);if(typeof sfx==='function')try{sfx('ui')}catch(x){}}
  else if(e.type==='missile'){if(typeof sfx==='function')try{sfx('missile')}catch(x){}}
  else if(e.type==='shot'){if(typeof sfx==='function')try{sfx('shoot')}catch(x){}
   if(e.power>0)try{const L=e.power;if(typeof tone==='function')tone(180,.35+L*.2,'sawtooth',.03+L*.02,60);if(typeof noise==='function')noise(.3+L*.25,.03+L*.03,700+L*800)}catch(x){}}
  else if(e.type==='charge'){try{if(typeof tone==='function')tone(320+e.L*900,.09,'triangle',.012+e.L*.01,380+e.L*980)}catch(x){}}
  else if(e.type==='charged'){try{if(typeof tone==='function')tone(1240,.12,'sine',.03,1860)}catch(x){}}
  else if(e.type==='mega'){if(typeof sfx==='function'&&Math.hypot(e.x-g.me.x,e.y-g.me.y)<1400)try{sfx('boom',1+e.power)}catch(x){}}
  else if(e.type==='hit'){if(typeof sfx==='function')try{sfx('hit')}catch(x){}}
  else if(e.type==='bump'){if(typeof urtoSfx==='function')urtoSfx(e.p,'nave')}
 }
 g.events=[];
 for(const pid of g.drop)if(g.net)g.net.drop(pid);g.drop=[];
}
function arFeedLock(g){if(!arUI.lockT||g.time-arUI.lockT>2){arUI.lockT=g.time;arMessage(AR_T('MISSILE IN ARRIVO!'),1.4);if(typeof sfx==='function')try{sfx('ui')}catch(x){}}}
function arInput(g){
 const k=typeof keys!=='undefined'&&keys?keys:{},z=arZoom();
 const sx=W/2+(g.me.x-arUI.cam.x)*z,sy=H/2+(g.me.y-arUI.cam.y)*z;
 const inp={ax:(k.KeyD||k.ArrowRight?1:0)-(k.KeyA||k.ArrowLeft?1:0),ay:(k.KeyW||k.ArrowUp?1:0)-(k.KeyS||k.ArrowDown?1:0),
  aim:Math.atan2(arUI.my-sy,arUI.mx-sx),fire:arUI.fire||!!k.Space,missile:arUI.missile||arUI.misOnce||!!k.KeyQ,boost:!!(k.ShiftLeft||k.ShiftRight),shield:arUI.shield||!!k.KeyE,brake:!!k.KeyF};
 arUI.misOnce=false;
 inp.world=true;inp.wx=inp.ax;inp.wy=-inp.ay;
 if(Math.hypot(arUI.mx-sx,arUI.my-sy)<8)inp.aim=g.me.r;
 // touch: le frecce del pad muovono nella direzione indicata, la mira cerca il pilota più vicino
 if(typeof document!=='undefined'&&document.body&&document.body.classList.contains('touch')){
  const wx=(k.ArrowRight?1:0)-(k.ArrowLeft?1:0),wy=(k.ArrowDown?1:0)-(k.ArrowUp?1:0),l=Math.hypot(wx,wy)||1;
  inp.world=true;inp.wx=wx/l;inp.wy=wy/l;inp.aim=(wx||wy)?Math.atan2(wy,wx):g.me.r;
  let best=null,bd=750;for(const pid in g.others){const o=g.others[pid];if(!o.s.al||arAlly(g,pid,g.pid))continue;const d=Math.hypot(o.x-g.me.x,o.y-g.me.y);if(d<bd){bd=d;best=o}}
  if(best&&inp.fire)inp.aim=Math.atan2(best.y-g.me.y,best.x-g.me.x);
 }
 return inp;
}
function arUpdate(dt){
 const g=ar;if(!g){arAimOff();return}
 if(typeof document!=='undefined'&&document.body){const aim=arAimOn();if(document.body.classList.contains('ar-aim')!==aim){document.body.classList.toggle('ar-aim',aim);if(typeof canvas!=='undefined'&&canvas&&canvas.style)canvas.style.cursor=aim?'none':''}}
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
 if(g.mode===1){const ts=arTeamScore(g);set('arT1',String(ts[1]));set('arT2',String(ts[2]))}
 arShow('arMisChip',true);{const L=g.locks||[],done=L.filter(l=>l.p>=1).length;set('arMis',g.misCd>0?Math.ceil(g.misCd)+' s':done?AR_T('AGGANCIATI')+' '+done+'/'+(1+(g.up.salvo|0)):AR_T('PRONTI'))}
 // allarme: bip finché un nemico ti tiene agganciato, più fitto se il missile è già partito
 if(g.lockedBy>0||g.misIn){arUI.beep=(arUI.beep||0)-dt;if(arUI.beep<=0){arUI.beep=g.misIn?.24:.5;if(typeof tone==='function')try{tone(g.misIn?1240:920,.06,'square',.016)}catch(x){}}}else arUI.beep=0;
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
  try{const s=Math.ceil(o.r*2+10),dpr=2,c=document.createElement('canvas');c.width=c.height=s*dpr;const x=c.getContext('2d');x.scale(dpr,dpr);const h=s/2;
   const n=o.pts.length;x.beginPath();for(let i=0;i<n;i++){const a=o.rot+i/n*6.283,rr=o.r*o.pts[i];i?x.lineTo(h+Math.cos(a)*rr,h+Math.sin(a)*rr):x.moveTo(h+Math.cos(a)*rr,h+Math.sin(a)*rr)}x.closePath();
   const gr=x.createRadialGradient(h-o.r*.35,h-o.r*.4,o.r*.1,h,h,o.r);const t=Math.round(70+o.shade*30);
   gr.addColorStop(0,`rgb(${t+60},${t+58},${t+66})`);gr.addColorStop(.6,`rgb(${t},${t-4},${t+8})`);gr.addColorStop(1,'rgb(22,24,32)');
   x.fillStyle=gr;x.fill();x.strokeStyle='rgba(180,225,255,.24)';x.lineWidth=1.5;x.stroke();
   const r2=arRand(arHash(g.room+o.x));for(let i=0;i<9;i++){const a=r2()*6.28,d=r2()*o.r*.62,cr=o.r*(.045+r2()*.105),cx=h+Math.cos(a)*d,cy=h+Math.sin(a)*d;
    const cg=x.createRadialGradient(cx-cr*.35,cy-cr*.4,cr*.08,cx,cy,cr);cg.addColorStop(0,'rgba(155,160,176,.35)');cg.addColorStop(.38,'rgba(54,56,68,.7)');cg.addColorStop(1,'rgba(8,10,16,.18)');x.fillStyle=cg;x.beginPath();x.arc(cx,cy,cr,0,6.28);x.fill();
    if(i<4){x.strokeStyle='rgba(15,17,25,.42)';x.lineWidth=.8;x.beginPath();x.moveTo(cx,cy);let px=cx,py=cy;for(let q=0;q<3;q++){px+=Math.cos(a+q*.7)*(cr+r2()*cr);py+=Math.sin(a+q*.7)*(cr+r2()*cr);x.lineTo(px,py)}x.stroke()}}
   x.globalCompositeOperation='screen';x.strokeStyle='rgba(205,225,255,.09)';x.lineWidth=.8;for(let i=0;i<6;i++){x.beginPath();const a=r2()*6.28,d=r2()*o.r*.5;x.moveTo(h+Math.cos(a)*d,h+Math.sin(a)*d);x.lineTo(h+Math.cos(a+.35)*d*.6,h+Math.sin(a+.35)*d*.6);x.stroke()}x.globalCompositeOperation='source-over';
   return {c,s}}catch(e){return null}
 });
 arUI.sprites={room:g.room,list};return list;
}
function arShipObj(x,y,a,s){return {x,y,angle:a,forward:+s.f||0,strafe:+s.s||0,boostState:s.bo?'active':'ready',barrier:!!s.sd,vx:+s.vx||0,vy:+s.vy||0,health:+s.h||0,shield:100}}
// nave di un pilota: team battle → imperiali con la nave nemica, ribelli con la nave del gioco;
// deathmatch → io con la nave del gioco, gli altri con quella nemica. I pezzi dei potenziamenti
// (nave-gadget.js) compaiono sulle navi del gioco con i livelli di quel pilota.
function arHostile(g,pid){const s=pid===g.pid?g.me:(g.others[pid]&&g.others[pid].s);return arFaction(s&&s.fa)==='I'}
function arDrawPilot(g,pid,ship,s,color){
 const hostile=arHostile(g,pid);arUI.ngLv=hostile?null:arUgDecode(s.ug);
 try{arDrawShip(ship,hostile,color)}finally{arUI.ngLv=null}
}
function arDrawShip(ship,hostile,color){
 try{drawShip(ship,hostile)}catch(e){
  ctx.save();ctx.translate(ship.x,ship.y);ctx.rotate(ship.angle);ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(24,0);ctx.lineTo(-14,-13);ctx.lineTo(-8,0);ctx.lineTo(-14,13);ctx.closePath();ctx.fill();ctx.restore();
 }
}
// nome del pilota sotto la nave (con un contorno scuro per leggerlo sopra stelle e asteroidi)
function arDrawName(n,x,y,color,ally){
 ctx.save();ctx.textAlign='center';ctx.textBaseline='top';ctx.font="700 12px 'Chakra Petch',sans-serif";
 const t=(ally?'◆ ':'')+n;ctx.lineWidth=3.5;ctx.strokeStyle='rgba(2,6,12,.85)';ctx.lineJoin='round';ctx.strokeText(t,x,y+34);ctx.fillStyle=color;ctx.fillText(t,x,y+34);ctx.restore();
}
function arDrawBarrier(x,y,impact,now){
 const pulse=Math.max(0,Math.min(1,impact||0));
 if(typeof drawEnergyBubble==='function'){try{drawEnergyBubble(x,y,33+pulse*4,31+pulse*4,.65,now,pulse);return}catch(e){}}
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(100,225,255,${.65+pulse*.3})`;ctx.lineWidth=2.5+pulse*3;ctx.beginPath();ctx.arc(x,y,31+pulse*4,0,6.283);ctx.stroke();ctx.restore();
}
// sprite HD dei meteoriti della fascia (meteoriti.js): stesse varianti già pronte in cache
function arMtSprite(key,make){try{return typeof mtGet==='function'&&typeof mtBuild==='function'?mtGet(key,make):null}catch(e){return null}}
function arRockSprite(o){const M=AR_ROCK_MAT[o.mat||0];return arMtSprite('r|'+M.fill+'|'+M.edge+'|'+o.v,()=>mtBuild(MT_REF,o.v+1+M.fill.length*31,M.fill,M.edge))}
function arDrawRock(o,i,fallback,now){
 const sp=arRockSprite(o);ctx.save();if(o.fade>0)ctx.globalAlpha=1-o.fade;
 if(sp){const size=sp.size*o.r/MT_REF;ctx.translate(o.x,o.y);ctx.rotate(o.rot+now*.03*(i%2?1:-1));ctx.drawImage(sp.c,-size/2,-size/2,size,size)}
 else if(fallback){ctx.drawImage(fallback.c,o.x-fallback.s/2,o.y-fallback.s/2,fallback.s,fallback.s);ctx.translate(o.x,o.y)}
 else{ctx.translate(o.x,o.y);ctx.fillStyle='#555a66';ctx.beginPath();ctx.arc(0,0,o.r,0,6.28);ctx.fill()}
 // crepe che crescono con i colpi
 const dmg=o.hp?Math.min(1,o.dmg/o.hp):0;
 // crepe frastagliate con profondità e schegge (crepe.js); qui sotto le linee semplici di riserva
 if(dmg>.05&&!(typeof crDraw==='function'&&crDraw(o,dmg,o.r,o.v*7+i))){const r=arRand(arHash('crepe'+i)),n=Math.ceil(dmg*7);ctx.strokeStyle=`rgba(255,${190-dmg*90|0},120,${.35+dmg*.5})`;ctx.lineWidth=1.6+dmg*1.6;ctx.lineCap='round';
  for(let k=0;k<n;k++){let a=r()*6.283,d=o.r*.12;ctx.beginPath();ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d);for(let q=0;q<3;q++){a+=(r()-.5)*.9;d+=o.r*(.18+r()*.14)*Math.min(1,dmg*1.6);ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d)}ctx.stroke()}}
 ctx.restore();
}
function arDrawFrags(g){
 for(const f of g.frags){const sp=arMtSprite('f|'+f.v,()=>mtBuild(MT_FRAG_REF,f.v*17+5,'#725342','#ffbf7e',{angular:true,craters:1,hot:true}));
  ctx.save();ctx.globalAlpha=Math.min(1,f.life*2);ctx.translate(f.x,f.y);ctx.rotate(f.rot);
  if(sp){const size=sp.size*f.r/MT_FRAG_REF*1.15;ctx.drawImage(sp.c,-size/2,-size/2,size,size)}
  else{ctx.fillStyle='#725342';ctx.strokeStyle='#ffbf7e';ctx.beginPath();ctx.moveTo(f.r,0);ctx.lineTo(0,-f.r*.7);ctx.lineTo(-f.r*.8,0);ctx.lineTo(0,f.r*.7);ctx.closePath();ctx.fill();ctx.stroke()}
  ctx.restore()}
}
// laser come drawBullet() del gioco in singolo, nel colore del pilota
function arRgb(hex){const h=String(hex||'#51e6ff').replace('#','');const n=parseInt(h.length===3?h.replace(/./g,'$&$&'):h,16)||0x51e6ff;return ((n>>16)&255)+','+((n>>8)&255)+','+(n&255)}
function arDrawLaser(b){
 const sp=Math.hypot(b.vx,b.vy)||1,ux=b.vx/sp,uy=b.vy/sp,r=(b.r||3)*(b.big?1.15:1),len=Math.min(24,sp*.026)+r*3,glow=arRgb(b.c);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.globalAlpha=Math.min(1,b.life*3);
 ctx.beginPath();ctx.moveTo(b.x-ux*len,b.y-uy*len);ctx.lineTo(b.x,b.y);
 ctx.strokeStyle=`rgba(${glow},.22)`;ctx.lineWidth=r*4;ctx.stroke();ctx.strokeStyle=`rgba(${glow},.8)`;ctx.lineWidth=r*1.5;ctx.stroke();ctx.strokeStyle='#effdff';ctx.lineWidth=r*.65;ctx.stroke();ctx.restore();
}
// Stessa sfera di plasma e scia del laser caricato in singolo.
function arDrawMega(b,now){
 mcDrawProjectile(b,b.power,b.spin||now*9,b.tr||[]);
}
function arDrawCharge(x,y,a,L,now){
 mcDrawCharge(x+Math.cos(a)*34,y+Math.sin(a)*34,L,now);
}
// radar dell'arena: tutti i piloti, puntini azzurri (ribelli, nave del gioco) o rossi (imperiali, nave nemica)
function arRadarBox(){
 const touch=typeof document!=='undefined'&&document.body&&document.body.classList.contains('touch'),r=touch||Math.min(W,H)<620?50:74;
 return touch?{x:W/2,y:96+r,r}:{x:W-24-r,y:H-118-r,r};
}
function arDrawRadar(g,now){
 const {x:cx,y:cy,r}=arRadarBox(),k=r/(ARENA.R+300),me=g.me;
 const P=(x,y)=>{const d=Math.hypot(x,y),m=d*k>r-3?(r-3)/(d*k):1;return [cx+x*k*m,cy+y*k*m]};
 ctx.save();
 // fondo, anelli e bordo dell'arena
 ctx.fillStyle='rgba(3,10,20,.72)';ctx.beginPath();ctx.arc(cx,cy,r,0,6.283);ctx.fill();
 ctx.strokeStyle='rgba(81,230,255,.28)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(cx,cy,r,0,6.283);ctx.stroke();
 ctx.strokeStyle='rgba(81,230,255,.1)';for(const q of [.33,.66]){ctx.beginPath();ctx.arc(cx,cy,r*q,0,6.283);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
 ctx.setLineDash([4,3]);ctx.strokeStyle='rgba(81,230,255,.45)';ctx.beginPath();ctx.arc(cx,cy,ARENA.R*k,0,6.283);ctx.stroke();ctx.setLineDash([]);
 // fascio che gira
 const a=(now*1.6)%6.283,sw=ctx.createLinearGradient(cx,cy,cx+Math.cos(a)*r,cy+Math.sin(a)*r);sw.addColorStop(0,'rgba(81,230,255,.0)');sw.addColorStop(1,'rgba(81,230,255,.16)');
 ctx.fillStyle=sw;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a-.5,a);ctx.closePath();ctx.fill();
 // meteoriti e cometa
 ctx.fillStyle='rgba(190,160,120,.35)';for(const o of g.rocks){if(o.br)continue;const [x,y]=P(o.x,o.y);ctx.fillRect(x-.8,y-.8,1.6,1.6)}
 const m=g.meteor;if(m){const [x,y]=P(m.x,m.y);ctx.fillStyle=m.w>0?`rgba(255,120,60,${.4+.4*Math.sin(now*10)})`:'#ffb35a';ctx.beginPath();ctx.arc(x,y,m.w>0?3:4,0,6.283);ctx.fill()}
 // piloti
 const dot=(pid,s,x0,y0,mine)=>{const [x,y]=P(x0,y0),c=arHostile(g,pid)?'#ff5268':'#51e6ff';
  ctx.fillStyle=c;ctx.shadowColor=c;ctx.shadowBlur=6;ctx.beginPath();ctx.arc(x,y,mine?3.6:3,0,6.283);ctx.fill();ctx.shadowBlur=0;
  if(mine){ctx.strokeStyle='#fff';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(x,y,6+Math.sin(now*5),0,6.283);ctx.stroke();
   const h=+s.r||0;ctx.beginPath();ctx.moveTo(x+Math.cos(h)*11,y+Math.sin(h)*11);ctx.lineTo(x+Math.cos(h+2.5)*6,y+Math.sin(h+2.5)*6);ctx.lineTo(x+Math.cos(h-2.5)*6,y+Math.sin(h-2.5)*6);ctx.closePath();ctx.fillStyle='#fff';ctx.fill()}};
 for(const pid in g.others){const o=g.others[pid];if(o.s.al)dot(pid,o.s,o.x,o.y,false)}
 if(me.al)dot(g.pid,me,me.x,me.y,true);
 ctx.font="600 9px 'Chakra Petch',sans-serif";ctx.textAlign='center';ctx.fillStyle='rgba(81,230,255,.7)';ctx.fillText('RADAR',cx,cy+r+12);
 ctx.restore();
}
// cometa come quella del gioco in singolo: bagliore, coda di fuoco e nucleo di roccia
function arDrawMeteor(g,now){
 const m=g.meteor;if(!m)return;
 const a=Math.atan2(m.vy,m.vx),R=ARENA.meteorR;
 if(m.w>0){// preavviso come nel gioco in singolo: cerchio con "!" dal lato da cui arriva, solo se passa vicino a te
 const me=g.me;if(!me||!me.al)return;
 const ux=Math.cos(a),uy=Math.sin(a),rx=me.x-m.x,ry=me.y-m.y,along=rx*ux+ry*uy,side=Math.abs(rx*uy-ry*ux);
 if(along<0||side>ARENA.cometNear)return;
 const dist=Math.min(W,H)*.33/arZoom(),x=me.x-ux*dist,y=me.y-uy*dist;
 ctx.save();ctx.strokeStyle='#ff9d45';ctx.fillStyle='#ffbf80';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,30,0,Math.PI*2);ctx.moveTo(x,y-15);ctx.lineTo(x,y+6);ctx.stroke();
 ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText('!',x,y+19);ctx.fillText(AR_T('COMETA')+' · '+Math.ceil(m.w)+' s',x,y-42);ctx.restore();return}
 ctx.save();ctx.translate(m.x,m.y);ctx.rotate(a);ctx.globalCompositeOperation='lighter';
 const k=R/24;// la cometa del gioco ha raggio 24
 const glow=ctx.createRadialGradient(-20*k,0,4*k,-20*k,0,95*k);glow.addColorStop(0,'rgba(255,196,100,.38)');glow.addColorStop(1,'rgba(255,75,10,0)');ctx.fillStyle=glow;ctx.fillRect(-115*k,-95*k,190*k,190*k);
 for(let i=0;i<5;i++){const length=(190-i*22)*k*1.6,width=(22-i*3)*k,tail=ctx.createLinearGradient(-length,0,10*k,0);tail.addColorStop(0,'rgba(255,65,15,0)');tail.addColorStop(.65,`rgba(255,105,28,${.1+i*.035})`);tail.addColorStop(1,'rgba(255,235,177,.8)');ctx.fillStyle=tail;ctx.beginPath();ctx.moveTo(0,-width);ctx.quadraticCurveTo(-length*.35,-width*.9,-length,Math.sin(now*12+i)*5*k);ctx.quadraticCurveTo(-length*.35,width*.8,0,width);ctx.arc(0,0,width,Math.PI/2,-Math.PI/2,true);ctx.closePath();ctx.fill()}
 ctx.globalCompositeOperation='source-over';ctx.restore();
 const core={x:m.x,y:m.y,r:R*.78,rot:now*1.8,mat:0,v:3,hp:1,dmg:0,fade:0};
 const sp=arMtSprite('r|#665042|#ffc78d|3',()=>mtBuild(MT_REF,4+'#665042'.length*31,'#665042','#ffc78d'));
 ctx.save();ctx.translate(m.x,m.y);ctx.rotate(now*1.8);
 if(sp){const size=sp.size*core.r/MT_REF;ctx.drawImage(sp.c,-size/2,-size/2,size,size)}
 else{const rg=ctx.createRadialGradient(-22,-25,4,0,0,R);rg.addColorStop(0,'#eee0c4');rg.addColorStop(.35,'#9b7564');rg.addColorStop(1,'#241c25');ctx.fillStyle=rg;ctx.beginPath();ctx.arc(0,0,R*.85,0,6.283);ctx.fill()}
 ctx.restore();
 ctx.save();ctx.translate(m.x,m.y);ctx.rotate(a);ctx.strokeStyle='#ffe0a1';ctx.globalAlpha=.85;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,R*.82,-1.1,1.1);ctx.stroke();ctx.restore();
}
function arDraw(){
 const g=ar;
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#02060c';ctx.fillRect(0,0,W,H);
 const cam=arUI.cam;
 try{drawStarfield(cam.x*.012,cam.y*.012)}catch(e){}
 try{drawNebula(cam.x*.004,cam.y*.004)}catch(e){}
 if(!g){try{if(typeof drawHomeSpace==='function')drawHomeSpace(performance.now()/1000)}catch(e){}try{drawVignette()}catch(e){}return}
 const z=arZoom(),now=performance.now()/1000,me=g.me;
 try{if(typeof drawNearDust==='function')drawNearDust(cam.x*.82,cam.y*.82,me.vx||0,me.vy||0)}catch(e){}
 ctx.save();
 if(me.al&&me.bo){const ratio=Math.hypot(me.vx,me.vy)/590;if(ratio>.8){const k=.35+(ratio-.8)*2.6;ctx.translate((Math.random()-.5)*k,(Math.random()-.5)*k)}}
 ctx.translate(W/2,H/2);ctx.scale(z,z);ctx.translate(-cam.x,-cam.y);
 // bordo dell'arena
 ctx.lineWidth=600;ctx.strokeStyle='rgba(255,60,90,.07)';ctx.beginPath();ctx.arc(0,0,ARENA.R+300,0,6.283);ctx.stroke();
 ctx.lineWidth=5;ctx.strokeStyle=`rgba(81,230,255,${.35+.15*Math.sin(now*3)})`;ctx.setLineDash([46,26]);ctx.lineDashOffset=-now*40;ctx.beginPath();ctx.arc(0,0,ARENA.R,0,6.283);ctx.stroke();ctx.setLineDash([]);
 ctx.lineWidth=1.5;ctx.strokeStyle='rgba(81,230,255,.12)';ctx.beginPath();ctx.arc(0,0,ARENA.R*.5,0,6.283);ctx.stroke();
 // asteroidi
 const sp=arRockSprites(g),vw=(W/2)/z+160,vh=(H/2)/z+160;g.rocks.forEach((o,i)=>{if(o.br||Math.abs(o.x-cam.x)>vw+o.r||Math.abs(o.y-cam.y)>vh+o.r)return;arDrawRock(o,i,sp[i],now)});
 arDrawFrags(g);
 arDrawMeteor(g,now);
 // colpi
 ctx.lineCap='round';
 for(const b of g.bullets){
  if(b.mis){ctx.globalAlpha=1;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(Math.atan2(b.vy,b.vx));ctx.fillStyle='#dfe9ef';ctx.fillRect(-9,-2.2,15,4.4);ctx.fillStyle=b.c;ctx.beginPath();ctx.moveTo(6,-2.2);ctx.lineTo(11,0);ctx.lineTo(6,2.2);ctx.closePath();ctx.fill();ctx.fillRect(-9,-4,4,8);ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(-10,0,2.6+Math.random()*1.5,0,6.283);ctx.fill();ctx.restore();continue}
  if(b.power>0)arDrawMega(b,now);else arDrawLaser(b)}
 ctx.globalAlpha=1;
 // altri piloti
 ctx.textAlign='center';ctx.font="600 12px 'Chakra Petch',sans-serif";
 for(const pid in g.others){const o=g.others[pid],s=o.s;if(!s.al)continue;const c=arColor(g,pid);
  if(s.iv&&Math.floor(now*10)%2)ctx.globalAlpha=.4;
  ctx.strokeStyle=c;ctx.globalAlpha*=.5;ctx.lineWidth=2;ctx.beginPath();ctx.arc(o.x,o.y,27,0,6.283);ctx.stroke();ctx.globalAlpha=s.iv&&Math.floor(now*10)%2?.4:1;
  arDrawPilot(g,pid,arShipObj(o.x,o.y,o.r,s),s,c);ctx.globalAlpha=1;
  if(s.sd)arDrawBarrier(o.x,o.y,0,now);
  if(+s.cg>0)arDrawCharge(o.x,o.y,o.r,Math.min(1,+s.cg),now);
  arDrawName(arCleanName(s.n),o.x,o.y,c,arAlly(g,pid,g.pid));
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(o.x-20,o.y-38,40,4);ctx.fillStyle=typeof hpColor==='function'?hpColor(+s.h||0):'#9dff6a';ctx.fillRect(o.x-20,o.y-38,40*Math.max(0,Math.min(1,(+s.h||0)/100)),4);
 }
 // la mia nave
 const m=g.me;
 if(m.al){if(g.inv>0&&Math.floor(now*10)%2)ctx.globalAlpha=.45;arDrawPilot(g,g.pid,arShipObj(m.x,m.y,m.r,m),m,arColor(g,g.pid));ctx.globalAlpha=1;
  if(m.sd)arDrawBarrier(m.x,m.y,g.shieldHit/.55,now);
  arDrawName(m.n,m.x,m.y,arColor(g,g.pid),false);
  if(m.cg>0)arDrawCharge(m.x,m.y,m.r,Math.min(1,m.cg),now)}
 arDrawLocks(g,now);
 // particelle
 const dp=typeof drawParticle==='function'?drawParticle:null;
 ctx.globalCompositeOperation='lighter';
 for(const p of g.parts){if(dp){try{dp(p);continue}catch(e){}}ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.283);ctx.fill()}
 ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 ctx.restore();
 // indicatori ai bordi per i piloti fuori schermo
 for(const pid in g.others){const o=g.others[pid];if(!o.s.al)continue;const sx=W/2+(o.x-cam.x)*z,sy=H/2+(o.y-cam.y)*z;if(sx>0&&sx<W&&sy>0&&sy<H)continue;
  const a=Math.atan2(sy-H/2,sx-W/2),ex=Math.max(26,Math.min(W-26,W/2+Math.cos(a)*W)),ey=Math.max(26,Math.min(H-26,H/2+Math.sin(a)*H));
  const k=Math.min((W/2-26)/Math.abs(Math.cos(a)||1e-6),(H/2-26)/Math.abs(Math.sin(a)||1e-6)),px=W/2+Math.cos(a)*k,py=H/2+Math.sin(a)*k;
  ctx.save();ctx.translate(isFinite(px)?px:ex,isFinite(py)?py:ey);ctx.rotate(a);ctx.fillStyle=arColor(g,pid);ctx.globalAlpha=.85;ctx.beginPath();ctx.moveTo(12,0);ctx.lineTo(-8,-8);ctx.lineTo(-4,0);ctx.lineTo(-8,8);ctx.closePath();ctx.fill();ctx.restore()}
 try{arDrawRadar(g,now)}catch(e){}
 if(g.edge>0){ctx.fillStyle=`rgba(255,40,70,${g.edge*.5})`;ctx.fillRect(0,0,W,H)}
 try{drawVignette()}catch(e){}
 arDrawLockWarn(g,now);
 arDrawCrosshair();
}
// mirini di aggancio sui nemici (come drawTargetLock di missili-nemici.js, senza shadowBlur)
function arDrawLocks(g,now){
 const m=g.me;if(!m.al)return;
 for(const l of g.locks||[]){const o=g.others[l.pid];if(!o)continue;
  const p=l.p,sm=p*p*(3-2*p),x=m.x+(o.x-m.x)*sm,y=m.y+(o.y-m.y)*sm,locked=p>=1,beat=locked?.5+.5*Math.sin(now*14):0,blink=locked&&Math.floor(now*5)%2===0;
  const r=ARENA.shipR+16+(1-p)*16+beat*5;
  ctx.save();ctx.strokeStyle=locked?(blink?'#ff6a4d':'#ffb567'):'#8ce9ec';ctx.fillStyle=ctx.strokeStyle;
  ctx.lineWidth=locked?2+beat:1.5;ctx.globalAlpha=locked?.6+.4*beat:.85;
  ctx.beginPath();for(const sx of [-1,1])for(const sy of [-1,1]){ctx.moveTo(x+sx*r,y+sy*(r-10));ctx.lineTo(x+sx*r,y+sy*r);ctx.lineTo(x+sx*(r-10),y+sy*r)}ctx.stroke();
  ctx.beginPath();ctx.arc(x,y,r+6,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.stroke();
  if(locked){const w=(now*1.6)%1;ctx.globalAlpha=(1-w)*.6;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,r+6+w*26,0,6.283);ctx.stroke();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x,y,2.5,0,6.283);ctx.fill()}
  ctx.globalAlpha=locked?(blink?1:.45):.85;ctx.font="600 10px 'Chakra Petch',sans-serif";ctx.textAlign='center';ctx.fillText(AR_T(locked?'AGGANCIATO':'AGGANCIO'),x,y-r-14);
  ctx.restore()}
}
// sei nel mirino di un nemico: il bordo dello schermo diventa rosso e pulsa (più veloce col missile in arrivo)
function arDrawLockWarn(g,now){
 if(!g||!g.me.al||!(g.lockedBy>0||g.misIn))return;
 const k=.5+.5*Math.sin(now*(g.misIn?17:9)),a=.32+.48*k,t=Math.max(40,Math.min(W,H)*(.07+.03*k));
 ctx.save();
 const edge=(x0,y0,x1,y1,rx,ry,rw,rh)=>{const gr=ctx.createLinearGradient(x0,y0,x1,y1);gr.addColorStop(0,`rgba(255,28,48,${a})`);gr.addColorStop(1,'rgba(255,28,48,0)');ctx.fillStyle=gr;ctx.fillRect(rx,ry,rw,rh)};
 edge(0,0,0,t,0,0,W,t);edge(0,H,0,H-t,0,H-t,W,t);edge(0,0,t,0,0,0,t,H);edge(W,0,W-t,0,W-t,0,t,H);
 ctx.strokeStyle=`rgba(255,60,76,${.45+.5*k})`;ctx.lineWidth=3+3*k;ctx.strokeRect(2,2,W-4,H-4);
 ctx.globalAlpha=.55+.45*k;ctx.fillStyle='#ff4a5e';ctx.font="700 15px 'Chakra Petch',sans-serif";ctx.textAlign='center';
 ctx.fillText(AR_T(g.misIn?'MISSILE IN ARRIVO!':'SEI AGGANCIATO!'),W/2,Math.max(70,H*.13));
 ctx.restore();
}
// mirino come nel gioco in singolo (.crosshair di style.css), disegnato sulla posizione del mouse
function arAimOn(){return !!(ar&&arUI.on&&!(typeof document!=='undefined'&&document.body&&document.body.classList.contains('touch')))}
function arAimOff(){if(typeof document!=='undefined'&&document.body)document.body.classList.remove('ar-aim');if(typeof canvas!=='undefined'&&canvas&&canvas.style)canvas.style.cursor=''}
function arDrawCrosshair(){
 if(!arAimOn()||!arUI.over)return;
 const x=Math.round(arUI.mx)+.5,y=Math.round(arUI.my)+.5;
 ctx.save();ctx.lineWidth=1;
 ctx.strokeStyle='rgba(81,230,255,.18)';ctx.beginPath();ctx.arc(x,y,23,0,6.283);ctx.stroke();
 ctx.strokeStyle='rgba(81,230,255,.55)';ctx.beginPath();ctx.arc(x,y,16,0,6.283);ctx.stroke();
 ctx.strokeStyle='#51e6ff';ctx.beginPath();ctx.moveTo(x-4,y);ctx.lineTo(x+4,y);ctx.moveTo(x,y-4);ctx.lineTo(x,y+4);ctx.stroke();
 ctx.restore();
}

// pezzi dei potenziamenti sulle navi degli altri piloti: una coppia di immagini per ogni combinazione di livelli
if(typeof ngSprites==='function'&&typeof ngPaint==='function'&&typeof ngUnder==='function'&&typeof ngOver==='function'&&typeof NG_IDS!=='undefined'){
 const ngBase=ngSprites,ngAr=new Map();
 ngSprites=function(){
  const lv=arUI.on&&ar?arUI.ngLv:null;if(!lv)return ngBase.apply(this,arguments);
  const k=typeof ngRes==='function'?ngRes():2.5,key=NG_IDS.map(id=>lv[id]|0).join('')+'@'+k.toFixed(2);
  let c=ngAr.get(key);if(c)return c;
  c={key,lv,under:null,over:null,empty:NG_IDS.every(id=>!(lv[id]|0))};
  if(!c.empty)try{c.under=ngPaint(k,x=>ngUnder(x,lv));c.over=ngPaint(k,x=>ngOver(x,lv))}catch(e){c.empty=true}
  if(ngAr.size>24)ngAr.clear();ngAr.set(key,c);return c;
 };
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
 // il mirino del gioco al posto della freccia del mouse: si vede solo sopra la zona di gioco (non sui pannelli)
 addEventListener('mousemove',e=>{arUI.mx=e.clientX;arUI.my=e.clientY;arUI.over=typeof canvas!=='undefined'&&e.target===canvas});
 document.addEventListener('mouseleave',()=>{arUI.over=false});
 addEventListener('mousedown',e=>{if(!arUI.on||!ar)return;const t=e.target;if(t&&t.closest&&t.closest('button,input,a,select'))return;if(e.button===0)arUI.fire=true;if(e.button===1){arUI.missile=true;e.preventDefault()}if(e.button===2)arUI.shield=true});
 // anche girare la rotella lancia i missili
 addEventListener('wheel',e=>{if(!arUI.on||!ar)return;if(typeof canvas!=='undefined'&&e.target!==canvas)return;arUI.misOnce=true},{passive:true});
 addEventListener('mouseup',e=>{if(e.button===0)arUI.fire=false;if(e.button===1)arUI.missile=false;if(e.button===2)arUI.shield=false});
 addEventListener('blur',()=>{arUI.fire=false;arUI.shield=false;arUI.missile=false});
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
  ["COMETA","COMET","COMÈTE","COMETA","КОМЕТА","彗星","彗星"],
  ["SFIDA ONLINE","ONLINE BATTLE","DÉFI EN LIGNE","DESAFÍO ONLINE","ОНЛАЙН-БИТВА","在线对战","オンライン対戦"],
  ["Sfida online","Online battle","Défi en ligne","Desafío online","Онлайн-битва","在线对战","オンライン対戦"],
  ["SFIDA ONLINE · DEATHMATCH","ONLINE BATTLE · DEATHMATCH","DÉFI EN LIGNE · DEATHMATCH","DESAFÍO ONLINE · DEATHMATCH","ОНЛАЙН-БИТВА · ДЕЗМАТЧ","在线对战 · 死亡竞赛","オンライン対戦 · デスマッチ"],
  ["SCEGLI LA FAZIONE","CHOOSE YOUR FACTION","CHOISIS TA FACTION","ELIGE TU FACCIÓN","ВЫБЕРИ ФРАКЦИЮ","选择阵营","陣営を選択"],
  ["RIBELLI","REBELS","REBELLES","REBELDES","ПОВСТАНЦЫ","反抗军","反乱軍"],
  ["IMPERO GALATTICO","GALACTIC EMPIRE","EMPIRE GALACTIQUE","IMPERIO GALÁCTICO","ГАЛАКТИЧЕСКАЯ ИМПЕРИЯ","银河帝国","銀河帝国"],
  ["NAVI BLU","BLUE SHIPS","VAISSEAUX BLEUS","NAVES AZULES","СИНИЕ КОРАБЛИ","蓝色飞船","青い船"],
  ["NAVI ROSSE","RED SHIPS","VAISSEAUX ROUGES","NAVES ROJAS","КРАСНЫЕ КОРАБЛИ","红色飞船","赤い船"],
  ["ARENA SPAZIALE","SPACE ARENA","ARÈNE SPATIALE","ARENA ESPACIAL","КОСМИЧЕСКАЯ АРЕНА","太空竞技场","宇宙アリーナ"],
  ["Tutti contro tutti, fino a 6 piloti. Vince chi arriva per primo a 10 abbattimenti o chi ne ha di più dopo 5 minuti.","Free for all, up to 6 pilots. The first to reach 10 kills wins, or whoever has the most after 5 minutes.","Chacun pour soi, jusqu’à 6 pilotes. Le premier à 10 victoires gagne, ou celui qui en a le plus après 5 minutes.","Todos contra todos, hasta 6 pilotos. Gana el primero en llegar a 10 derribos o quien tenga más tras 5 minutos.","Каждый сам за себя, до 6 пилотов. Побеждает первый, кто сбьёт 10 врагов, или тот, у кого больше побед через 5 минут.","混战模式，最多 6 名飞行员。率先击落 10 架者获胜，或 5 分钟后击落最多者获胜。","最大6人のバトルロイヤル。先に10機撃墜するか、5分後に撃墜数が最も多いパイロットの勝利。"],
  ["I tuoi potenziamenti del mercato valgono anche qui: laser, barriera, motori, doppio laser, iniettori e lanciatore multiplo (missili guidati).","Your market upgrades work here too: laser, barrier, engines, twin laser, injectors and multi-launcher (homing missiles).","Tes améliorations du marché valent aussi ici : laser, barrière, moteurs, double laser, injecteurs et lanceur multiple (missiles guidés).","Tus mejoras del mercado también valen aquí: láser, barrera, motores, doble láser, inyectores y lanzador múltiple (misiles guiados).","Улучшения из магазина действуют и здесь: лазер, барьер, двигатели, двойной лазер, инжекторы и мультипусковая установка (самонаводящиеся ракеты).","你在商店购买的升级在这里同样有效：激光、护盾、引擎、双激光、喷射器和多联发射器（追踪导弹）。","マーケットで買った強化はここでも有効：レーザー、バリア、エンジン、ダブルレーザー、インジェクター、マルチランチャー（誘導ミサイル）。"],
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
  ["WASD muovi · MOUSE punta · clic spara / tieni premuto carica · F frena · SHIFT post-bruciatore · MOUSE DX / E barriera · Q / ROTELLA missili · ESC esci","WASD move · MOUSE aim · click fire / hold to charge · F brake · SHIFT afterburner · RIGHT MOUSE / E barrier · Q / WHEEL missiles · ESC leave","WASD bouger · SOURIS viser · clic tirer / maintenir pour charger · F freiner · MAJ postcombustion · CLIC DROIT / E barrière · Q / MOLETTE missiles · ÉCHAP quitter","WASD mover · RATÓN apuntar · clic disparar / mantén para cargar · F frenar · MAYÚS poscombustor · CLIC DCHO / E barrera · Q / RUEDA misiles · ESC salir","WASD движение · МЫШЬ прицел · клик огонь / удерживай для заряда · F тормоз · SHIFT форсаж · ПКМ / E барьер · Q / КОЛЕСО ракеты · ESC выход","WASD 移动 · 鼠标 瞄准 · 点击 射击 / 按住 蓄力 · F 刹车 · SHIFT 加力 · 右键 / E 护盾 · Q / 滚轮 导弹 · ESC 离开","WASD 移動 · マウス 照準 · クリック 射撃 / 長押し チャージ · F ブレーキ · SHIFT アフターバーナー · 右クリック / E バリア · Q / ホイール ミサイル · ESC 退出"],
  ["· IN TEAM BATTLE È LA SQUADRA CHE PREFERISCI","· IN TEAM BATTLE IT IS YOUR PREFERRED TEAM","· EN TEAM BATTLE C’EST TON ÉQUIPE PRÉFÉRÉE","· EN TEAM BATTLE ES TU EQUIPO PREFERIDO","· В КОМАНДНОЙ БИТВЕ ЭТО ЖЕЛАЕМАЯ КОМАНДА","· 团队战中即你想加入的队伍","· チームバトルでは希望するチーム"],
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
  ["STANZA PIENA","ROOM FULL","SALON PLEIN","SALA LLENA","КОМНАТА ЗАПОЛНЕНА","房间已满","ルームは満員です"],
  // team battle (2026-11-09)
  ["Battaglie tra piloti veri, fino a 6 per stanza, in un campo di meteoriti attraversato dalle comete.","Battles between real pilots, up to 6 per room, in a meteor field crossed by comets.","Des combats entre vrais pilotes, jusqu’à 6 par salon, dans un champ de météorites traversé par des comètes.","Batallas entre pilotos reales, hasta 6 por sala, en un campo de meteoritos atravesado por cometas.","Бои между настоящими пилотами, до 6 в комнате, в поле метеоритов, которое пересекают кометы.","真人飞行员对战，每个房间最多 6 人，战场布满陨石并有彗星划过。","本物のパイロット同士の対戦。1ルーム最大6人、彗星が横切る隕石帯で戦います。"],
  ["MODALITÀ","MODE","MODE","MODO","РЕЖИМ","模式","モード"],
  ["METEORITI","METEORS","MÉTÉORITES","METEORITOS","МЕТЕОРИТЫ","陨石","隕石"],
  ["Resistenti come quelli intorno ai pianeti: se li rompi, i frammenti colpiscono chi è vicino.","Tough like the ones around the planets: break them and the fragments hit anyone nearby.","Solides comme ceux autour des planètes : si tu les brises, les fragments frappent ceux qui sont proches.","Resistentes como los que rodean los planetas: si los rompes, los fragmentos golpean a quien esté cerca.","Прочные, как у планет: если разбить, осколки бьют всех рядом.","像行星周围的陨石一样坚固：击碎后，碎片会击中附近的人。","惑星の周りの隕石のように頑丈：壊すと破片が近くの機体に当たります。"],
  ["COMETE","COMETS","COMÈTES","COMETAS","КОМЕТЫ","彗星","彗星"],
  ["Attraversano l’arena e spazzano via navi, colpi e meteoriti: guarda l’avviso.","They cross the arena sweeping away ships, shots and meteors: watch the warning.","Elles traversent l’arène et balaient vaisseaux, tirs et météorites : surveille l’alerte.","Cruzan la arena y barren naves, disparos y meteoritos: fíjate en el aviso.","Пролетают через арену, сметая корабли, выстрелы и метеориты: следи за предупреждением.","彗星会横穿竞技场，扫除飞船、子弹和陨石：注意预警。","アリーナを横切り、機体・弾・隕石を一掃します。警告に注意。"],
  ["MERCATO","MARKET","MARCHÉ","MERCADO","РЫНОК","商店","マーケット"],
  ["GIOCA","PLAY","JOUER","JUGAR","ИГРАТЬ","开始","プレイ"],
  ["HAI UN CODICE?","GOT A CODE?","TU AS UN CODE ?","¿TIENES UN CÓDIGO?","ЕСТЬ КОД?","有代码吗？","コードはある？"],
  ["COMANDI","CONTROLS","COMMANDES","CONTROLES","УПРАВЛЕНИЕ","操作","操作"],
  ["MUOVI","MOVE","BOUGER","MOVER","ДВИЖЕНИЕ","移动","移動"],
  ["PUNTA","AIM","VISER","APUNTAR","ПРИЦЕЛ","瞄准","照準"],
  ["CLIC","CLICK","CLIC","CLIC","КЛИК","点击","クリック"],
  ["SPARA · TIENI PREMUTO PER CARICARE","FIRE · HOLD TO CHARGE","TIRER · MAINTIENS POUR CHARGER","DISPARAR · MANTÉN PARA CARGAR","ОГОНЬ · УДЕРЖИВАЙ ДЛЯ ЗАРЯДА","射击 · 按住蓄力","射撃 · 長押しでチャージ"],
  ["MOUSE DX / E","RIGHT MOUSE / E","CLIC DROIT / E","CLIC DCHO / E","ПКМ / E","右键 / E","右クリック / E"],
  ["Q / ROTELLA","Q / WHEEL","Q / MOLETTE","Q / RUEDA","Q / КОЛЕСО","Q / 滚轮","Q / ホイール"],
  ["FRENA","BRAKE","FREINER","FRENAR","ТОРМОЗ","刹车","ブレーキ"],
  ["ESCI","LEAVE","QUITTER","SALIR","ВЫХОД","离开","退出"],
  ["COMETA IN ARRIVO!","INCOMING COMET!","COMÈTE EN APPROCHE !","¡COMETA ENTRANTE!","КОМЕТА НА ПОДЛЁТЕ!","彗星来袭！","彗星接近！"],
  ["Modalità","Mode","Mode","Modo","Режим","模式","モード"],
  ["TUTTI CONTRO TUTTI","FREE FOR ALL","CHACUN POUR SOI","TODOS CONTRA TODOS","КАЖДЫЙ САМ ЗА СЕБЯ","混战","バトルロイヤル"],
  ["IMPERIALI CONTRO RIBELLI","IMPERIALS VS REBELS","IMPÉRIAUX CONTRE REBELLES","IMPERIALES CONTRA REBELDES","ИМПЕРЦЫ ПРОТИВ МЯТЕЖНИКОВ","帝国军对叛军","帝国軍 対 反乱軍"],
  ["IMPERIALI","IMPERIALS","IMPÉRIAUX","IMPERIALES","ИМПЕРЦЫ","帝国军","帝国軍"],
  ["Due squadre da 3: gli IMPERIALI volano con le navi nemiche, i RIBELLI con la nave del gioco. Chi entra per primo sceglie la squadra, gli ultimi prendono i posti rimasti. Vince la prima squadra a 15 abbattimenti o quella che ne ha di più dopo 5 minuti.","Two teams of 3: the IMPERIALS fly the enemy ships, the REBELS fly the game's ship. The first to join pick their team, latecomers take the remaining seats. The first team to 15 kills wins, or the team with the most after 5 minutes.","Deux équipes de 3 : les IMPÉRIAUX pilotent les vaisseaux ennemis, les REBELLES le vaisseau du jeu. Les premiers arrivés choisissent leur équipe, les derniers prennent les places restantes. La première équipe à 15 victoires gagne, ou celle qui en a le plus après 5 minutes.","Dos equipos de 3: los IMPERIALES vuelan con las naves enemigas, los REBELDES con la nave del juego. Los primeros en entrar eligen equipo, los últimos ocupan los puestos libres. Gana el primer equipo en llegar a 15 derribos o el que tenga más tras 5 minutos.","Две команды по 3: ИМПЕРЦЫ летают на вражеских кораблях, МЯТЕЖНИКИ — на корабле игры. Кто вошёл первым, выбирает команду, опоздавшие занимают оставшиеся места. Побеждает команда, первой сбившая 15 врагов, или та, у кого больше побед через 5 минут.","两队各 3 人：帝国军驾驶敌方战舰，叛军驾驶游戏中的飞船。先进入的玩家选择队伍，后来者只能接受剩余位置。率先击落 15 架的队伍获胜，或 5 分钟后击落最多的队伍获胜。","3人ずつの2チーム：帝国軍は敵の艦、反乱軍はゲームの機体で飛びます。先に入った人がチームを選び、後から来た人は残りの席に入ります。先に15機撃墜したチーム、または5分後に撃墜数が多いチームの勝利。"],
  ["POSTO LIBERO","FREE SEAT","PLACE LIBRE","PUESTO LIBRE","СВОБОДНОЕ МЕСТО","空位","空き席"],
  ["LA TUA SQUADRA","YOUR TEAM","TON ÉQUIPE","TU EQUIPO","ТВОЯ КОМАНДА","你的队伍","あなたのチーム"],
  ["UNISCITI","JOIN","REJOINDRE","UNIRSE","ВСТУПИТЬ","加入","参加する"],
  ["SQUADRA COMPLETA","TEAM FULL","ÉQUIPE COMPLÈTE","EQUIPO COMPLETO","КОМАНДА ЗАПОЛНЕНА","队伍已满","チームは満員"],
  ["PAREGGIO","DRAW","ÉGALITÉ","EMPATE","НИЧЬЯ","平局","引き分け"],
  ["VINCONO GLI IMPERIALI","THE IMPERIALS WIN","LES IMPÉRIAUX GAGNENT","GANAN LOS IMPERIALES","ПОБЕДИЛИ ИМПЕРЦЫ","帝国军获胜","帝国軍の勝利"],
  ["VINCONO I RIBELLI","THE REBELS WIN","LES REBELLES GAGNENT","GANAN LOS REBELDES","ПОБЕДИЛИ МЯТЕЖНИКИ","叛军获胜","反乱軍の勝利"],
  ["MISSILI","MISSILES","MISSILES","MISILES","РАКЕТЫ","导弹","ミサイル"],
  ["PRONTI","READY","PRÊTS","LISTOS","ГОТОВЫ","就绪","準備完了"],
  ["SEI AGGANCIATO!","YOU ARE LOCKED ON!","TU ES VERROUILLÉ !","¡TE HAN FIJADO!","ТЕБЯ ЗАХВАТИЛИ!","你已被锁定！","ロックオンされた！"],
  ["AGGANCIATI","LOCKED","VERROUILLÉS","FIJADOS","ЗАХВАЧЕНО","已锁定","ロック"],
  ["MISSILE IN ARRIVO!","INCOMING MISSILE!","MISSILE EN APPROCHE !","¡MISIL ENTRANTE!","РАКЕТА НА ПОДЛЁТЕ!","导弹来袭！","ミサイル接近！"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
 if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)try{i18nApply()}catch(e){}
}
