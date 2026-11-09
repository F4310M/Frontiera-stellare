// Conex — UPGRADE DISPONIBILI: quando i crediti bastano per almeno un potenziamento
// del mercato, i pulsanti del mercato diventano "UPGRADE DISPONIBILI" (evidenziati)
// e nel menu principale compare un messaggio lampeggiante sotto il pulsante MERCATO.
// Caricato per ultimo. Usa eco / ECO_ITEMS / ecoUpgrade di economia.js.

const UD={on:null,banner:null};
const UD_TEXT='UPGRADE DISPONIBILI';
const UD_BTNS=['marketBtn','marketBtnResult'];

// Potenziamenti che si possono comprare adesso con il saldo attuale.
function udAffordable(){
 if(typeof eco==='undefined'||typeof ECO_ITEMS==='undefined')return[];
 return ECO_ITEMS.filter(it=>{
  const lv=ecoUpgrade(it.id);
  return lv<it.levels.length&&eco.balance>=it.prices[lv];
 });
}
// Il contenuto originale del pulsante resta dov'è: con la classe ud-on il CSS lo nasconde
// e mostra icona + scritta UPGRADE DISPONIBILI (in italiano: la traduce i18n.js).
function udSetButton(id,on){
 const b=$(id);if(!b)return;
 if(!b.querySelector('.ud-label')){
  const s=document.createElement('span');s.className='ud-label';s.textContent=UD_TEXT;
  b.insertAdjacentHTML('afterbegin',ico('arrow-up','ud-ico'));
  b.querySelector('.ud-ico').after(s);
 }
 b.classList.toggle('ud-on',on);
}
function udPlaceBanner(){
 const bn=UD.banner,btn=$('marketBtn'),bar=bn&&bn.parentNode;
 if(!bn||!btn||!bar||bn.classList.contains('hidden'))return;
 const r=btn.getBoundingClientRect(),rb=bar.getBoundingClientRect();
 if(!r.width){bn.style.left='';bn.style.right='0';return}
 const w=bn.offsetWidth,vw=innerWidth;
 // centrato sotto il pulsante MERCATO, senza uscire dallo schermo
 let x=r.left+r.width/2-w/2;x=Math.max(8,Math.min(vw-w-8,x));
 bn.style.right='auto';bn.style.left=(x-rb.left)+'px';
 bn.style.setProperty('--ud-tip',Math.max(14,Math.min(w-14,r.left+r.width/2-x))+'px');
}
function udBuildBanner(){
 if(UD.banner)return UD.banner;
 const bar=document.querySelector('#mapScreen .topbar');if(!bar)return null;
 const b=document.createElement('button');
 b.type='button';b.id='udBanner';b.className='ud-banner hidden';
 b.setAttribute('aria-label','Upgrade disponibili · apri il mercato');
 b.innerHTML=`<span class="ud-badge">${ico('arrow-up')}</span><span class="ud-copy"><b>${UD_TEXT}</b><small>HAI CREDITI PER POTENZIARE LA NAVE</small></span>`;
 b.onclick=e=>{if(typeof ecoOpenMarket==='function')ecoOpenMarket({currentTarget:$('marketBtn')})};
 bar.appendChild(b);
 UD.banner=b;return b;
}
function udRefresh(force){
 const on=udAffordable().length>0;
 if(on!==UD.on||force){
  UD.on=on;
  for(const id of UD_BTNS)udSetButton(id,on);
  const bn=udBuildBanner();if(bn)bn.classList.toggle('hidden',!on);
 }
 if(on)udPlaceBanner();
}

const UD_CSS=`
.ud-ico,.ud-label{display:none}
.ud-on>:not(.ud-ico):not(.ud-label){display:none!important}
.ud-on>.ud-ico{display:inline-block;width:14px;height:14px;flex:none}
.ud-on>.ud-label{display:inline;color:#1d1203!important}
.ud-on{background:linear-gradient(135deg,#ffe08a,#ffb238 55%,#ff8a1f)!important;color:#1d1203!important;border-color:#fff0b8!important;
 font-weight:700!important;text-shadow:none!important;animation:udGlow 1.6s ease-in-out infinite}
.ud-on:hover{filter:brightness(1.08)}
.ud-on>.ud-ico{animation:udUp 1s ease-in-out infinite}
#marketBtnResult.ud-on{font-size:12px;letter-spacing:2px}
@media(max-width:1250px){#mapScreen .top-actions .ud-on>.ud-label{display:none}}
@keyframes udGlow{0%,100%{box-shadow:0 0 0 1px #ffd36b66,0 0 12px #ffb2385c}50%{box-shadow:0 0 0 2px #fff0b8,0 0 28px #ffb238c2}}
@keyframes udUp{0%,100%{transform:translateY(1px)}50%{transform:translateY(-2px)}}
#mapScreen .topbar{position:relative}
.ud-banner{position:absolute;top:calc(100% + 12px);right:0;z-index:40;display:flex;align-items:center;gap:12px;
 padding:9px 18px 9px 10px;border:1px solid #ffd36b;border-radius:12px;cursor:pointer;text-align:left;
 background:linear-gradient(135deg,#3a2606f2,#1c1305f2);color:#ffd36b;font-family:'Chakra Petch',sans-serif;
 animation:udGlow 1.6s ease-in-out infinite,udIn .45s cubic-bezier(.2,1.4,.4,1) both}
.ud-banner.hidden{display:none}
.ud-banner:before{content:'';position:absolute;top:-7px;left:var(--ud-tip,50%);width:12px;height:12px;margin-left:-6px;
 background:#3a2606;border-left:1px solid #ffd36b;border-top:1px solid #ffd36b;transform:rotate(45deg)}
.ud-banner:hover{filter:brightness(1.15)}
.ud-banner:focus-visible{outline:2px solid #fff0b8;outline-offset:3px}
.ud-badge{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;flex:none;color:#1d1203;
 background:radial-gradient(circle at 35% 30%,#fff3c4,#ffb238 60%,#e07a10)}
.ud-badge svg{width:18px;height:18px;animation:udUp 1s ease-in-out infinite}
.ud-copy{display:flex;flex-direction:column;gap:2px}
.ud-copy b{font-size:15px;font-weight:700;letter-spacing:2.5px;color:#ffe08a;text-shadow:0 0 12px #ffb238aa;white-space:nowrap}
.ud-copy small{font-size:9px;letter-spacing:1.5px;color:#f3d9a0;opacity:.85;white-space:nowrap}
@keyframes udIn{from{opacity:0;transform:translateY(-8px) scale(.9)}to{opacity:1;transform:none}}
@media(max-width:850px){.ud-banner{top:calc(100% + 8px);padding:7px 14px 7px 8px;gap:9px}.ud-badge{width:28px;height:28px}
 .ud-copy b{font-size:12px;letter-spacing:1.8px}.ud-copy small{font-size:8px}}
@media(prefers-reduced-motion:reduce){.ud-on,.ud-banner,.ud-on>.ud-ico,.ud-badge svg{animation:none}}
`;

if(typeof document!=='undefined'&&document.querySelector){
 if(document.head&&!$('udCss')){const st=document.createElement('style');st.id='udCss';st.textContent=UD_CSS;document.head.appendChild(st)}
 // ogni volta che cambia il saldo (fine fase, acquisti, spese)
 if(typeof ecoHud==='function'){
  const orig=ecoHud;
  ecoHud=function(...a){const r=orig.apply(this,a);try{udRefresh()}catch(e){}return r};
 }
 udRefresh(true);
 addEventListener('resize',()=>udPlaceBanner());
 // controllo leggero di sicurezza: il saldo può cambiare anche da altri file
 setInterval(()=>{try{udRefresh()}catch(e){}},800);
}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["UPGRADE DISPONIBILI","UPGRADES AVAILABLE","AMÉLIORATIONS DISPONIBLES","MEJORAS DISPONIBLES","ДОСТУПНЫ УЛУЧШЕНИЯ","有可用升级","強化可能"],
  ["HAI CREDITI PER POTENZIARE LA NAVE","YOU HAVE CREDITS TO UPGRADE YOUR SHIP","TU AS DES CRÉDITS POUR AMÉLIORER TON VAISSEAU","TIENES CRÉDITOS PARA MEJORAR TU NAVE","ХВАТАЕТ КРЕДИТОВ НА УЛУЧШЕНИЕ КОРАБЛЯ","你有足够的积分升级飞船","艦を強化できるクレジットがあります"],
  ["Upgrade disponibili · apri il mercato","Upgrades available · open the market","Améliorations disponibles · ouvrir le marché","Mejoras disponibles · abrir el mercado","Доступны улучшения · открыть рынок","有可用升级 · 打开商店","強化可能 · マーケットを開く"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
 if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)try{i18nApply()}catch(e){}
}
