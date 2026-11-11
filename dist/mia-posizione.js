// Conex — LA TUA POSIZIONE IN CLASSIFICA (2026-11-11, chiesto da Fabio).
// Quando si apre la pagina CLASSIFICA (o si cambia scheda MONDO / ONLINE SCORE) la lista scorre da sola
// fino alla riga del pilota, quella del suo MIGLIOR punteggio (la stessa del "TU N°"), e la fa brillare.
// Se la riga è oltre i primi 100 della classifica MONDO, carica le pagine successive (fino al N° 1000).
// Se il pilota non è in classifica la lista resta in cima.
// Lo scorrimento muove solo la lista, non la pagina: titolo e schede restano al loro posto.
// Va caricato dopo miglior-punteggio.js.

const MPOS={maxRank:1000,wait:6000};
let mpos={key:'',want:false,until:0,last:null,lastView:'',busy:false,user:false};

// Ricorda quali righe sono state disegnate, nello stesso ordine della lista
if(typeof boardShow==='function'){
 const bs=boardShow;
 boardShow=function(list,b){mpos.last=Array.isArray(b)?b:null;mpos.lastView='mondo';return bs.apply(this,arguments)};
}
if(typeof arkRows==='function'){
 const ar=arkRows;
 arkRows=function(b){mpos.last=Array.isArray(b)?b:null;mpos.lastView='arena';return ar.apply(this,arguments)};
}

function mposName(){
 if(typeof recName==='function')return recName()||'';
 return typeof arkName==='function'?arkName()||'':'';
}
// Indice della riga del pilota nelle righe disegnate (-1 = non c'è)
function mposIndex(rows,view){
 if(!Array.isArray(rows)||!rows.length)return -1;
 if(view==='arena'){
  const n=typeof arkName==='function'?arkName():mposName(),best=typeof arkBestPoints==='function'?arkBestPoints():0;
  let i=n?rows.findIndex(r=>r&&r.n===n&&Math.round(r.p)===best):-1;
  if(i<0&&typeof arkIsMe==='function')i=rows.findIndex(r=>r&&arkIsMe(r));
  if(i<0&&n)i=rows.findIndex(r=>r&&r.n===n);
  return i;
 }
 const n=mposName(),best=typeof mapBestScore==='function'?mapBestScore():0;
 if(!n||!(best>0))return -1;
 return rows.findIndex(r=>r&&r.n===n&&Math.round(r.s)===best);
}
function mposOpen(){
 const o=typeof document!=='undefined'&&document.getElementById&&document.getElementById('boardOverlay');
 return !!(o&&o.classList&&!o.classList.contains('hidden'));
}
// Porta la riga al centro della lista (solo la lista scorre)
function mposScroll(list,row){
 if(!list)return;
 if(!row){list.scrollTop=0;return}
 const lr=list.getBoundingClientRect(),rr=row.getBoundingClientRect(),head=list.querySelector('.board-row.head');
 const hh=head?head.getBoundingClientRect().height:0;
 const y=list.scrollTop+(rr.top-lr.top)-hh-Math.max(0,(list.clientHeight-hh-rr.height)/2);
 list.scrollTop=Math.max(0,y);
}
// Se la classifica MONDO non arriva ancora alla posizione del pilota, carica le pagine successive
async function mposMore(){
 if(mpos.lastView!=='mondo'||typeof coOn==='undefined'||!coOn||typeof coNext!=='function'||mpos.busy)return false;
 if(typeof coCache==='undefined'||!coCache||mpos.last!==coCache||!coMore)return false;
 const best=typeof mapBestScore==='function'?mapBestScore():0;if(!(best>0))return false;
 let rank=0;
 if(typeof mapMeCache!=='undefined'&&mapMeCache.s===best&&mapMeCache.rank)rank=mapMeCache.rank;
 else if(typeof coRank==='function'){try{rank=await coRank(best)}catch(e){rank=0}}
 if(!rank||rank>MPOS.maxRank||coCache.length>=rank+5)return false;
 mpos.busy=true;
 try{
  while(coMore&&coCache.length<Math.min(rank+5,MPOS.maxRank)){const before=coCache.length;await coNext();if(coCache.length<=before)break}
 }catch(e){}finally{mpos.busy=false}
 return true;
}
// Miglior punteggio usato per trovare la riga (se cambia, si cerca di nuovo)
function mposKey(){return (typeof mapBestScore==='function'?mapBestScore():0)+'|'+(typeof arkBestPoints==='function'?arkBestPoints():0)}
async function mposFocus(){
 if(!mpos.want||!mposOpen())return;
 mpos.key=mposKey();
 const list=typeof document!=='undefined'&&document.getElementById('boardList');if(!list||!list.querySelectorAll)return;
 const i=mposIndex(mpos.last,mpos.lastView);
 if(i<0&&await mposMore()){if(mpos.want&&mposOpen())return boardRender()}
 const rows=list.querySelectorAll('.board-row:not(.head)');
 for(const r of rows)if(r.classList)r.classList.remove('bp-mine');
 const row=i>=0?rows[i]:null;
 if(row&&row.classList){row.classList.add('me','bp-mine');row.setAttribute&&row.setAttribute('aria-current','true')}
 if(!mpos.user)mposScroll(list,row);
 // trovata: basta così. Non trovata: si riprova se dalla rete arriva il miglior punteggio
 if(row||Date.now()>mpos.until)mpos.want=false;
}
function mposStart(){mpos.want=true;mpos.user=false;mpos.until=Date.now()+MPOS.wait}

// Dopo ogni disegno della lista: la pagina non si sposta, la lista va sulla riga del pilota
if(typeof boardRender==='function'){
 const br=boardRender;
 boardRender=async function(){
  const card=typeof document!=='undefined'&&document.querySelector&&document.querySelector('#boardOverlay.board-page .board-card');
  const top=card?card.scrollTop:0;
  const r=await br.apply(this,arguments);
  if(card&&mpos.want)card.scrollTop=top;
  if(mpos.want){
   if(typeof requestAnimationFrame==='function')await new Promise(ok=>requestAnimationFrame(()=>ok()));
   await mposFocus();
  }
  return r;
 };
}
if(typeof boardOpen==='function'){
 const bo=boardOpen;
 boardOpen=function(){mposStart();return bo.apply(this,arguments)};
}
// Il miglior punteggio arrivato dalla rete dopo l'apertura: si ridisegna e si riprova
if(typeof bpMe==='function'){
 const bm=bpMe;
 bpMe=async function(){
  const r=await bm.apply(this,arguments),k=mposKey();
  if(k!==mpos.key&&!mpos.user&&mposOpen()&&Date.now()<mpos.until&&typeof boardRender==='function'){mpos.want=true;boardRender()}
  return r;
 };
}
if(typeof document!=='undefined'&&document.getElementById){
 const tabs=document.getElementById('boardTabs');
 if(tabs&&tabs.addEventListener)tabs.addEventListener('click',e=>{if(e.target&&e.target.closest&&e.target.closest('button'))mposStart()},true);
 const list=document.getElementById('boardList');
 // se il giocatore scorre da solo, non lo si riporta più alla sua riga
 if(list&&list.addEventListener)for(const ev of ['wheel','touchstart','mousedown','keydown'])list.addEventListener(ev,()=>{mpos.user=true},{passive:true});
}
if(typeof document!=='undefined'&&document.createElement&&document.head&&!document.getElementById('mposStyle')){
 const s=document.createElement('style');s.id='mposStyle';
 s.textContent='#boardOverlay .board-row.bp-mine{animation:mpos-glow 1.6s ease-out 2}'+
  '@keyframes mpos-glow{0%{box-shadow:inset 3px 0 0 var(--cyan),0 0 0 1px rgba(81,230,255,.6),0 0 0 rgba(81,230,255,0)}35%{box-shadow:inset 3px 0 0 var(--cyan),0 0 0 2px rgba(81,230,255,.95),0 0 26px rgba(81,230,255,.55)}100%{box-shadow:inset 3px 0 0 var(--cyan),0 0 0 1px rgba(81,230,255,.6),0 0 0 rgba(81,230,255,0)}}'+
  '@media(prefers-reduced-motion:reduce){#boardOverlay .board-row.bp-mine{animation:none}}';
 document.head.appendChild(s);
}
