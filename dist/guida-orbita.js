// Conex — GUIDA ALLA CONQUISTA DELL'ORBITA (2026-11-07).
// Vicino al pianeta chi non conosce il gioco non sa cosa fare. Qui si aggiunge:
// 1) un pannello con i tre passi (entra nell'anello, elimina le guardie, frena e resta fermo):
//    il passo da fare si illumina, quelli fatti hanno la spunta;
// 2) un anello tratteggiato attorno al pianeta che mostra la zona di conquista;
// 3) un mirino rosso sulle guardie orbitali che bloccano la conquista.
// Il pannello si vede nelle prime GUIDA.volte conquiste, poi restano solo anello e mirini.
// Usa le stesse regole di updateCapture in game.js. Va caricato dopo i18n.js e comandi.js (in fondo a index.html).

const GUIDA={zone:160,guards:520,slow:140,near:1600,volte:3,key:'stellarGuidaOrbita'};
const guOrig={drawSupplies,beginOrbit};
let guBox=null,guRows=null,guShown=false;

function guCount(){try{return+(localStorage.getItem(GUIDA.key)||0)||0}catch(e){return 0}}
function guSave(n){try{localStorage.setItem(GUIDA.key,String(n))}catch(e){}}
function guTr(s){return typeof tr==='function'?tr(s):s}
function guTouch(){return typeof touch!=='undefined'&&touch&&touch.on}
function guBrakeKey(){
 if(guTouch())return guTr('FRENO');
 return typeof cmdLabelOf==='function'?cmdLabelOf('brake'):'F';
}

// Lo stato della conquista, calcolato come in updateCapture.
function guState(){
 if(state!=='play'||!world||!player)return null;
 const d=Math.hypot(world.x-player.x,world.y-player.y);
 if(d>world.r+GUIDA.near)return null;
 const guards=enemies.filter(e=>e.hp>0&&Math.hypot(e.x-world.x,e.y-world.y)<world.r+GUIDA.guards);
 const inside=d<world.r+GUIDA.zone,stable=Math.hypot(player.vx,player.vy)<GUIDA.slow;
 const step=!inside?0:guards.length?1:2;
 return{d,inside,stable,guards,step};
}

// ---------------------------------------------------------------- pannello
function guBuild(){
 if(guBox||typeof document==='undefined')return guBox;
 try{
  const box=document.createElement('div');box.id='orbitGuide';box.className='orbit-guide hidden';
  const head=document.createElement('b'),list=document.createElement('ol');
  guRows=[0,1,2].map(()=>{const li=document.createElement('li');list.appendChild(li);return li});
  box.appendChild(head);box.appendChild(list);box.guHead=head;
  const ref=document.getElementById('captureText'),host=ref&&ref.parentNode&&ref.parentNode.parentNode;
  (host&&host.appendChild?host:document.body).appendChild(box);
  guBox=box;
 }catch(e){guBox=null}
 return guBox;
}
function guTexts(s){
 const n=s.guards.length;
 return[
  'ENTRA NELL’ANELLO ATTORNO AL PIANETA',
  'ELIMINA LE GUARDIE ORBITALI'+(s.inside&&n?' · '+n:''),
  'FRENA E RESTA FERMO FINCHÉ LA BARRA È PIENA · '+guBrakeKey()
 ];
}
function guPanel(s){
 const want=!!s&&guCount()<GUIDA.volte;
 if(!want){if(guShown&&guBox){guBox.classList.add('hidden');guShown=false}return}
 const box=guBuild();if(!box)return;
 if(!guShown){box.classList.remove('hidden');guShown=true}
 const head=box.guHead;
 if(head)head.textContent=guTr('COME CONQUISTARE IL PIANETA');
 const t=guTexts(s);
 for(let i=0;i<3&&guRows&&guRows[i];i++){
  const li=guRows[i],cls=i<s.step?'done':i===s.step?'now':'';
  // il passo 2 è fatto solo quando si è dentro l'anello e non ci sono guardie
  li.textContent=(i<s.step?'✓ ':(i+1)+'. ')+guTr(t[i]);
  if(li.className!==cls)li.className=cls;
 }
}

// ---------------------------------------------------------------- anello e mirini (nel mondo)
function guDrawWorld(s){
 const now=performance.now()/1000,R=world.r+GUIDA.zone,pulse=.5+.5*Math.sin(now*3);
 const ok=s.inside&&!s.guards.length,col=ok?'120,255,170':'110,215,255';
 ctx.save();
 ctx.setLineDash&&ctx.setLineDash([18,14]);ctx.lineDashOffset=-now*30;
 ctx.strokeStyle=`rgba(${col},${.35+.35*pulse})`;ctx.lineWidth=3;
 ctx.beginPath();ctx.arc(world.x,world.y,R,0,6.283);ctx.stroke();
 ctx.setLineDash&&ctx.setLineDash([]);
 // scritta sopra l'anello, solo finché si è fuori
 if(!s.inside){
  const a=Math.atan2(player.y-world.y,player.x-world.x),lx=world.x+Math.cos(a)*(R+34),ly=world.y+Math.sin(a)*(R+34);
  ctx.font='700 15px "Chakra Petch",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle=`rgba(${col},${.6+.4*pulse})`;ctx.fillText('ZONA DI CONQUISTA',lx,ly);
 }
 // mirino rosso sulle guardie che bloccano la conquista
 if(s.d<world.r+GUIDA.guards+400)for(const e of s.guards){
  const r=(e.r||22)+14+pulse*4;
  ctx.strokeStyle=`rgba(255,80,90,${.55+.35*pulse})`;ctx.lineWidth=2;
  for(let k=0;k<4;k++){const a=k*Math.PI/2+.785;ctx.beginPath();ctx.arc(e.x,e.y,r,a-.35,a+.35);ctx.stroke()}
 }
 ctx.restore();
}

drawSupplies=function(...a){
 try{const s=guState();if(s)guDrawWorld(s)}catch(e){console.error(e)}
 return guOrig.drawSupplies.apply(this,a);
};
// il pannello si aggiorna una volta per fotogramma insieme alla HUD
const guUpd=update;
update=function(dt){
 const r=guUpd.call(this,dt);
 try{guPanel(guState())}catch(e){console.error(e)}
 return r;
};
beginOrbit=function(...a){
 const was=state;const r=guOrig.beginOrbit.apply(this,a);
 if(was==='play'&&state==='orbit'){guSave(guCount()+1);guPanel(null)}
 return r;
};

// stile del pannello
try{
 if(typeof document!=='undefined'&&document.head&&document.createElement){
  const st=document.createElement('style');
  st.textContent='.orbit-guide{position:absolute;top:172px;left:50%;transform:translateX(-50%);width:min(380px,85vw);padding:9px 14px;background:rgba(3,11,20,.82);border:1px solid var(--line);border-radius:6px;pointer-events:none;font:11px "Chakra Petch",sans-serif;letter-spacing:1px;color:#8aa6bd}'+
   '.orbit-guide.hidden{display:none}.orbit-guide b{display:block;margin-bottom:6px;color:var(--cyan);font-size:11px}'+
   '.orbit-guide ol{margin:0;padding:0;list-style:none}.orbit-guide li{padding:2px 0;opacity:.55}'+
   '.orbit-guide li.now{opacity:1;color:#fff;text-shadow:0 0 8px rgba(110,215,255,.8)}.orbit-guide li.done{opacity:.8;color:#7dffaa}'+
   'body.touch .orbit-guide{top:82px;width:min(260px,44vw);padding:4px 8px;font-size:8px}body.touch .orbit-guide b{font-size:8px;margin-bottom:2px}';
  document.head.appendChild(st);
 }
}catch(e){}
