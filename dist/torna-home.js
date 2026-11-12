// Conex — TORNA ALLA HOME nella schermata del risultato (2026-11-12)
// Il pulsante che riporta alla mappa (prima RICOMINCIA DALLA MAPPA / TORNA ALLA MAPPA) si chiama
// TORNA ALLA HOME, ha l'icona della casa, è più grande, ha un bordo luminoso che gira ed è l'ultimo
// in basso, sotto APRI IL MERCATO. Le scritte sono cambiate in finale.js e fase2.js.
(function(){
 if(typeof ICONS!=='undefined'&&!ICONS.home)ICONS.home='<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h5v-5.5h3V20h5V9.5"/>';
 if(typeof document==='undefined'||!document.getElementById||!document.createElement)return;
 const btn=document.getElementById('returnBtn');if(!btn)return;
 btn.classList.add('th-home');
 const b=btn.querySelector('b');if(b&&typeof ico==='function'){const s=ico('home');if(s)b.innerHTML=s}
 // sempre ultimo nella colonna dei pulsanti (altri script aggiungono riquadri dopo)
 const side=btn.parentNode;
 const inFondo=()=>{if(side&&side.lastElementChild!==btn)side.appendChild(btn)};
 inFondo();
 if(side&&typeof MutationObserver!=='undefined')new MutationObserver(inFondo).observe(side,{childList:true});
 const css=document.createElement('style');
 css.textContent='@property --th-a{syntax:"<angle>";inherits:false;initial-value:0deg}'+
  '.result-card #returnBtn.th-home{position:relative;isolation:isolate;height:64px;margin-top:6px!important;font-size:13px;letter-spacing:.14em;border-color:transparent;border-radius:8px;background:linear-gradient(110deg,#e4fff8,#86e9ff)}'+
  '.result-card #returnBtn.th-home b{font-size:24px;display:flex}.result-card #returnBtn.th-home b svg{width:24px;height:24px}'+
  '.result-card #returnBtn.th-home:before{content:"";position:absolute;inset:-3px;border-radius:10px;padding:3px;background:conic-gradient(from var(--th-a),#51e6ff,#fff 8%,#51e6ff 16%,transparent 30%,#51e6ff 50%,#fff 58%,#51e6ff 66%,transparent 80%,#51e6ff);'+
  '-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);z-index:-1;pointer-events:none;animation:th-giro 3s linear infinite}'+
  '.result-card #returnBtn.th-home:after{content:"";position:absolute;inset:-3px;border-radius:10px;box-shadow:0 0 18px 3px #51e6ffb0;z-index:-2;pointer-events:none;opacity:.35;animation:th-pulsa 1.4s ease-in-out infinite alternate}'+
  '@keyframes th-giro{to{--th-a:360deg}}@keyframes th-pulsa{to{opacity:1}}'+
  '@media(prefers-reduced-motion:reduce){.result-card #returnBtn.th-home:before,.result-card #returnBtn.th-home:after{animation:none}}';
 if(document.head)document.head.appendChild(css);
 if(typeof I18N_ROWS!=='undefined'){
  const r=['TORNA ALLA HOME','BACK TO HOME','RETOUR À L’ACCUEIL','VOLVER AL INICIO','НА ГЛАВНУЮ','返回主页','ホームに戻る'];
  if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
  if(typeof i18nBuild==='function')try{i18nBuild();if(typeof i18nApply==='function')i18nApply()}catch(e){}
 }
})();
