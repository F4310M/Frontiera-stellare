// NUOVA PARTITA nella home: tolto dal pannello del pianeta e messo accanto a STORIA.
// Stesso pulsante (#saveNewBtn): resta il comportamento di partita.js
// (si vede solo se c'e una partita da chiudere, apre la conferma NUOVA PARTITA).
const NPH_CSS=`
#mapScreen #saveNewBtn.nuova-btn{position:absolute;left:400px;top:calc(100% + 14px);z-index:40;display:flex;align-items:center;gap:8px;
 width:auto;height:34px;margin:0;padding:0 16px 0 12px;border:1px solid #a585ff99;border-radius:0;
 background:linear-gradient(135deg,#2c1a52e6,#140b29e6);color:#d9ccff;cursor:pointer;box-shadow:none;transform:none;filter:none;
 font:700 11px 'Chakra Petch',sans-serif;letter-spacing:3px;white-space:nowrap;
 clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);transition:.2s}
#mapScreen #saveNewBtn.nuova-btn .ico{width:15px;height:15px;flex:none;margin:0}
#mapScreen #saveNewBtn.nuova-btn:hover{background:linear-gradient(135deg,#5b3a9e,#2c1a52);color:#fff;border-color:#c9b6ff;box-shadow:0 0 18px #a585ff55}
#mapScreen #saveNewBtn.nuova-btn:focus-visible{outline:2px solid #d9ccff;outline-offset:3px}
#mapScreen #saveNewBtn.nuova-btn.hidden{display:none!important}
@media(max-width:850px){#mapScreen #saveNewBtn.nuova-btn{top:calc(100% + 8px);height:30px;font-size:10px;padding:0 12px 0 9px}}
@media(max-height:520px){#mapScreen #saveNewBtn.nuova-btn{top:calc(100% + 6px);height:26px;font-size:9px;letter-spacing:2px;padding:0 10px 0 8px}#mapScreen #saveNewBtn.nuova-btn .ico{width:12px;height:12px}}
`;
function nphSposta(){
 if(typeof document==='undefined'||!document.querySelector)return;
 const b=document.getElementById('saveNewBtn'),brand=document.querySelector('#mapScreen .brand');
 if(!b||!brand||!brand.parentNode)return;
 if(!document.getElementById('nuovaPartitaCss')&&document.head){const s=document.createElement('style');s.id='nuovaPartitaCss';s.textContent=NPH_CSS;document.head.appendChild(s)}
 if(b.parentNode!==brand.parentNode){
  b.classList.remove('text-btn','save-new');b.classList.add('nuova-btn');
  // il testo resta lo stesso nodo, cosi la traduzione continua a funzionare
  brand.parentNode.appendChild(b);
 }
 nphPosiziona();
}
// sempre subito a destra di STORIA (che a sua volta segue ESCI DAL GIOCO)
function nphPosiziona(){
 const s=document.getElementById('storiaBtn')||document.getElementById('exitBtn'),b=document.getElementById('saveNewBtn');
 if(!s||!b||!b.classList.contains('nuova-btn'))return;
 if(!s.offsetWidth){if(typeof requestAnimationFrame==='function')requestAnimationFrame(nphPosiziona);return}
 b.style.left=(s.offsetLeft+s.offsetWidth+10)+'px';b.style.top=s.offsetTop+'px';
}
if(typeof document!=='undefined'&&document.querySelector&&document.body){
 nphSposta();
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(nphPosiziona)));
 addEventListener('load',()=>setTimeout(nphPosiziona,0));addEventListener('resize',()=>setTimeout(nphPosiziona,0));
 if(typeof setLang==='function'){const o=setLang;setLang=function(){const r=o.apply(this,arguments);setTimeout(nphPosiziona,0);return r}}
 if(typeof ResizeObserver!=='undefined')setTimeout(()=>{for(const id of ['exitBtn','storiaBtn']){const s=document.getElementById(id);if(s)new ResizeObserver(()=>setTimeout(nphPosiziona,0)).observe(s)}
  const b=document.getElementById('saveNewBtn');if(b)new ResizeObserver(()=>setTimeout(nphPosiziona,0)).observe(b)},0);
}
