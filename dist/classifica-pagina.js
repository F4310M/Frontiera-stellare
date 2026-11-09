// Conex — CLASSIFICA A PAGINA INTERA (2026-11-09): la classifica non è più un pannello in mezzo
// allo schermo ma una pagina come quella della SFIDA ONLINE: barra in alto con TORNA ALLA MAPPA,
// a sinistra le schede MONDO / ONLINE SCORE con la lista, a destra il riquadro del pilota
// (posizione mondiale e punti online) e come si fanno i punti.
// Gli elementi della vecchia finestra (#boardList, #boardTabs, #boardSub, note...) restano gli stessi:
// vengono solo spostati, così classifica.js, record.js e classifica-arena.js continuano a funzionare.
// Va caricato dopo classifica-arena.js.

const BP={ico:n=>typeof ico==='function'?ico(n):''};

function bpBuild(){
 if(typeof document==='undefined'||!document.getElementById||!document.createElement)return false;
 const o=document.getElementById('boardOverlay'),card=o&&typeof o.querySelector==='function'&&o.querySelector('.board-card');
 if(!card||!o.classList||typeof o.classList.contains!=='function'||typeof card.querySelectorAll!=='function')return false;   // DOM finto dei test
 if(o.classList.contains('board-page'))return !!(o&&o.classList.contains('board-page'));
 o.classList.add('board-page');
 const pick=sel=>card.querySelector(sel);
 const reload=pick('#boardReload'),sub=pick('#boardSub'),tabs=pick('#boardTabs'),res=pick('.board-results'),
  notes=[...card.querySelectorAll('.board-note')],head=pick('.settings-head'),close=pick('#closeBoard');
 const top=document.createElement('header');top.className='bp-top';
 top.innerHTML='<button id="boardBack" type="button" class="text-btn">'+BP.ico('arrow-left')+' <span>TORNA ALLA MAPPA</span></button>'+
  '<p class="eyebrow">CLASSIFICA</p><p class="bp-pilot"><span>PILOTA</span> <b id="bpPilot"></b></p>';
 const body=document.createElement('div');body.className='bp-body';
 const main=document.createElement('section');main.className='bp-main';
 const title=document.createElement('div');title.className='bp-title';title.innerHTML='<h2>CLASSIFICA</h2>';
 if(reload)title.appendChild(reload);
 main.appendChild(title);
 for(const e of [sub,tabs,res])if(e)main.appendChild(e);
 const side=document.createElement('aside');side.className='bp-side';
 side.innerHTML='<p class="bp-sec">IL TUO PILOTA</p>'+
  '<div class="bp-me">'+
   '<div class="bp-stat"><span>'+BP.ico('globe')+' MONDO</span><b id="bpWorldRank">—</b><small><span>MIGLIOR PUNTEGGIO</span> <i id="bpWorldPts">0</i></small></div>'+
   '<div class="bp-stat bp-online"><span>'+BP.ico('laser')+' ONLINE SCORE</span><b id="bpOnlineRank">—</b><small><span>PUNTI TOTALI</span> <i id="bpOnlinePts">0</i></small></div>'+
   '<dl class="bp-online-detail"><div><dt id="bpOnlineM">0</dt><dd>SFIDE</dd></div><div><dt id="bpOnlineV">0</dt><dd>VITTORIE</dd></div><div><dt id="bpOnlineB">0</dt><dd>ABBATTIMENTI</dd></div></dl>'+
  '</div>'+
  '<p class="bp-sec">COME SI FANNO I PUNTI</p>';
 const how=document.createElement('div');how.className='bp-how';
 for(const n of notes)how.appendChild(n);
 side.appendChild(how);
 body.appendChild(main);body.appendChild(side);
 card.insertBefore(top,card.firstChild);
 card.insertBefore(body,top.nextSibling);
 if(head)head.classList.add('hidden');
 if(close)close.classList.add('hidden');
 document.getElementById('boardBack').onclick=()=>show('boardOverlay',false);
 return true;
}

// Riquadro del pilota: posizione e punti nelle due classifiche.
let bpBusy=false;
async function bpMe(){
 if(bpBusy||typeof document==='undefined')return;
 const $$=id=>document.getElementById(id);if(!$$('bpWorldRank'))return;
 bpBusy=true;
 try{
  const n=typeof arkName==='function'?arkName():(typeof recName==='function'?recName():'');
  if($$('bpPilot'))$$('bpPilot').textContent=n||'—';
  // MONDO: miglior punteggio della campagna
  const best=typeof mapBestScore==='function'?mapBestScore():0;
  $$('bpWorldPts').textContent=scoreFmt(best);
  let wr=0;
  if(best>0){
   if(typeof coOn!=='undefined'&&coOn&&typeof coRank==='function'){
    if(typeof mapMeCache!=='undefined'&&mapMeCache.s===best&&Date.now()-mapMeCache.t<60000)wr=mapMeCache.rank;
    else{try{wr=await coRank(best);if(typeof mapMeCache!=='undefined')mapMeCache={s:best,rank:wr,t:Date.now()}}catch(e){wr=0}}
   }else if(typeof boardLoad==='function'){const b=boardLoad(),i=b.findIndex(r=>r.s<=best);wr=i<0?b.length+1:i+1}
  }
  $$('bpWorldRank').textContent=wr?'N° '+scoreFmt(wr):'—';
  // ONLINE SCORE: punti sommati di tutte le sfide online
  const on=document.querySelector('#boardOverlay .bp-online'),det=document.querySelector('#boardOverlay .bp-online-detail');
  const ok=typeof arkLoad==='function';
  if(on)on.classList.toggle('hidden',!ok);if(det)det.classList.toggle('hidden',!ok);
  if(!ok)return;
  const r=arkLoad(),mine=r&&(!n||r.n===n)?r:null,pts=mine?arkPoints(mine):0;
  $$('bpOnlinePts').textContent=scoreFmt(pts);
  $$('bpOnlineM').textContent=scoreFmt(mine?mine.m:0);
  $$('bpOnlineV').textContent=scoreFmt(mine?mine.v:0);
  $$('bpOnlineB').textContent=scoreFmt(mine?mine.b:0);
  let or=0;
  if(pts>0&&typeof coOn!=='undefined'&&coOn&&typeof arkRank==='function'){try{or=await arkRank(pts)}catch(e){or=0}}
  $$('bpOnlineRank').textContent=or?'N° '+scoreFmt(or):'—';
 }finally{bpBusy=false}
}

if(typeof boardOpen==='function'){
 const bo=boardOpen;
 boardOpen=function(){bpBuild();const r=bo.apply(this,arguments);bpMe();return r};
}
// ESC chiude la pagina (prima che il gioco la prenda come pausa)
if(typeof addEventListener==='function'){
 addEventListener('keydown',e=>{
  if(e.code!=='Escape'&&e.key!=='Escape')return;
  const o=typeof document!=='undefined'&&document.getElementById&&document.getElementById('boardOverlay');
  if(!o||o.classList.contains('hidden')||!o.classList.contains('board-page'))return;
  e.preventDefault();e.stopImmediatePropagation();show('boardOverlay',false);
 },true);
}

function bpStyle(){
 if(typeof document==='undefined'||!document.createElement||!document.head||document.getElementById('bpStyle'))return;
 const s=document.createElement('style');s.id='bpStyle';
 s.textContent=
 '#boardOverlay.board-page{padding:0;display:block;background:#020813}'+
 '#boardOverlay.board-page.hidden{display:none}'+
 '#boardOverlay.board-page .board-card{position:absolute;inset:0;width:auto!important;height:auto!important;max-width:none!important;max-height:none!important;margin:0;padding:0!important;border:0;border-radius:0;clip-path:none;box-shadow:none;transform:none;zoom:1;display:flex;flex-direction:column;overflow:auto;'+
  'background:radial-gradient(ellipse at 70% 30%,rgba(37,112,183,.16),transparent 60%),linear-gradient(90deg,rgba(2,7,14,.97),rgba(2,7,14,.86) 50%,rgba(2,7,14,.95));animation:bp-in .35s ease-out}'+
 '#boardOverlay.board-page .board-card::before,#boardOverlay.board-page .board-card::after{display:none}'+
 '.bp-top{display:flex;align-items:center;justify-content:space-between;gap:16px;height:76px;flex:none;padding:0 42px;border-bottom:1px solid var(--line)}'+
 '.bp-top .eyebrow{margin:0;font-size:12px;letter-spacing:5px}'+
 '.bp-top .text-btn{margin:0;width:auto;flex:none;padding-left:22px;padding-right:22px}'+
 '.bp-pilot{margin:0;font-size:12px;letter-spacing:1.5px;color:var(--muted)}.bp-pilot b{color:var(--cyan);font-size:15px;margin-left:6px}'+
 '.bp-body{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:48px;width:min(1280px,100%);margin:0 auto;padding:34px 42px 32px}'+
 '.bp-main{display:flex;flex-direction:column;min-height:0}'+
 '.bp-main>*{flex-shrink:0}'+
 '.bp-title{display:flex;align-items:center;gap:14px;margin:0 0 8px}'+
 '.bp-title h2{margin:0;font:600 clamp(32px,4vw,58px)/1 "Chakra Petch",sans-serif;letter-spacing:4px;text-transform:uppercase}'+
 '#boardOverlay.board-page .board-sub{font-size:12px;letter-spacing:3px;margin:0 0 16px}'+
 '#boardOverlay.board-page .board-tabs{margin:0 0 14px;gap:10px}'+
 '#boardOverlay.board-page .board-tabs button{height:46px;font-size:12px;letter-spacing:2.5px;border-radius:8px}'+
 '#boardOverlay.board-page .board-results{flex:1 1 auto;min-height:260px}'+
 '#boardOverlay.board-page .board-row{grid-template-columns:70px 1fr 150px 190px;padding:11px 20px;font-size:14px}'+
 '#boardOverlay.board-page .board-row.head{font-size:10px;padding-top:12px;padding-bottom:12px}'+
 '#boardOverlay.board-page .board-row:not(.head) span:nth-child(4){font-size:12px}'+
 '.bp-side{display:flex;flex-direction:column;gap:0;align-self:start;padding:26px;border:1px solid rgba(81,230,255,.28);background:linear-gradient(145deg,rgba(7,19,33,.92),rgba(3,9,17,.88));clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))}'+
 '.bp-sec{margin:0 0 12px;font:600 10px "Chakra Petch",sans-serif;letter-spacing:3px;color:var(--cyan)}'+
 '.bp-me{display:grid;gap:10px;margin:0 0 26px}'+
 '.bp-stat{display:grid;grid-template-columns:1fr auto;align-items:baseline;gap:2px 10px;padding:14px 16px;border:1px solid var(--line);background:rgba(4,12,22,.55)}'+
 '.bp-stat span{font:600 10px "Chakra Petch",sans-serif;letter-spacing:2px;color:var(--muted);display:flex;align-items:center;gap:6px}'+
 '.bp-stat b{grid-row:1/3;grid-column:2;align-self:center;font:700 26px "Chakra Petch",sans-serif;letter-spacing:1px;color:#fff}'+
 '.bp-stat small span{display:inline;font:inherit;letter-spacing:inherit;color:inherit}.bp-stat small i{font-style:normal}'+
 '.bp-stat small{font:500 10px "Chakra Petch",sans-serif;letter-spacing:1.5px;color:var(--cyan)}'+
 '.bp-online{border-color:rgba(255,179,64,.35)}.bp-online b{color:#ffd27a}.bp-online small{color:#ffb340}'+
 '.bp-online-detail{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0}'+
 '.bp-online-detail div{padding:8px 6px;border-bottom:1px solid rgba(100,170,220,.12);text-align:center}'+
 '.bp-online-detail dt{font:700 17px "Chakra Petch",sans-serif;color:var(--text)}'+
 '.bp-online-detail dd{margin:2px 0 0;font:600 8.5px "Chakra Petch",sans-serif;letter-spacing:1.5px;color:var(--muted)}'+
 '.bp-how .board-note{padding:0 0 10px;font-size:12px;line-height:1.65}'+
 '.bp-how .board-note.hidden{display:none}'+
 '@keyframes bp-in{from{opacity:0}to{opacity:1}}'+
 '@media (max-width:900px){'+
  '.bp-top{padding:0 16px;height:60px}.bp-top .eyebrow{display:none}'+
  '.bp-body{grid-template-columns:1fr;gap:22px;padding:20px 16px 28px}'+
  '.bp-main{min-height:70vh}'+
  '.bp-side{padding:20px}'+
  '#boardOverlay.board-page .board-row{grid-template-columns:44px 1fr 100px;padding:9px 12px;font-size:13px}'+
  '#boardOverlay.board-page .board-arena .board-row{grid-template-columns:34px 1fr 76px 64px;gap:6px;padding:9px 10px}'+
  '#boardOverlay.board-page .board-arena .board-row:not(.head) span:nth-child(4){font-size:11px}'+
 '}'+
 '@media(prefers-reduced-motion:reduce){#boardOverlay.board-page .board-card{animation:none}}';
 document.head.appendChild(s);
}
bpStyle();
bpBuild();

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["IL TUO PILOTA","YOUR PILOT","TON PILOTE","TU PILOTO","ТВОЙ ПИЛОТ","你的飞行员","あなたのパイロット"],
  ["COME SI FANNO I PUNTI","HOW TO SCORE POINTS","COMMENT MARQUER DES POINTS","CÓMO SE CONSIGUEN PUNTOS","КАК НАБРАТЬ ОЧКИ","如何得分","ポイントの獲得方法"],
  ["MIGLIOR PUNTEGGIO","BEST SCORE","MEILLEUR SCORE","MEJOR PUNTUACIÓN","ЛУЧШИЙ СЧЁТ","最高分","ベストスコア"],
  ["PUNTI TOTALI","TOTAL POINTS","POINTS TOTAUX","PUNTOS TOTALES","ВСЕГО ОЧКОВ","总积分","合計ポイント"],
  ["SFIDE","BATTLES","DÉFIS","DESAFÍOS","БИТВЫ","对战","対戦"],
  ["VITTORIE","WINS","VICTOIRES","VICTORIAS","ПОБЕДЫ","胜场","勝利"],
  ["ABBATTIMENTI","KILLS","ABATTUS","DERRIBOS","СБИТО","击落","撃墜"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}
