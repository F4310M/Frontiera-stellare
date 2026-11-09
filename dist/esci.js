// Conex — tasto ESCI nella home (2026-11-09): sta sotto il marchio CONEX e chiude il gioco.
// Il browser lascia chiudere la scheda a uno script solo se la scheda ha una sola pagina
// nella cronologia (come quando la apre Avvia-Frontiera-Stellare.bat) o se l'ha aperta uno script.
// Chrome/Edge di solito la chiudono; Firefox e le schede con altre pagine nella cronologia no:
// in quel caso il gioco si spegne (musica ferma, schermo intero chiuso) e mostra una
// schermata che spiega come chiudere la scheda (Ctrl+W o Alt+F4), con TORNA AL GIOCO.
// I progressi sono già salvati nel browser, quindi chiudere non perde nulla.

const ESCI={done:false};

if(typeof ICONS!=='undefined'&&!ICONS.power)ICONS.power='<path d="M12 3v9"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>';

function esciIco(n){return typeof ico==='function'?ico(n):''}
function esciShow(id,on){const o=$(id);if(o)o.classList.toggle('hidden',!on)}

// Ferma musica, effetti e schermo intero: il gioco resta "spento" anche se la scheda non si chiude.
function esciSpegni(){
 try{if(typeof mus!=='undefined'&&mus.tracks)for(const T of Object.values(mus.tracks))for(const el of T.els||[])el.pause()}catch(e){}
 try{if(typeof audioCtx!=='undefined'&&audioCtx&&audioCtx.suspend)audioCtx.suspend()}catch(e){}
 try{if(typeof SI!=='undefined')SI.auto=false}catch(e){}
 try{if(typeof siLeave==='function')siLeave();else if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen()}catch(e){}
}

function esciChiudi(){
 ESCI.done=true;
 esciShow('exitOverlay',false);
 esciSpegni();
 try{window.close()}catch(e){}
 // se dopo un attimo la pagina c'è ancora, il browser ha bloccato la chiusura
 setTimeout(()=>{if(!window.closed)esciShow('exitDone',true)},350);
}

function esciBuild(){
 if(typeof document==='undefined'||!document.body)return;
 const brand=document.querySelector('#mapScreen .brand');
 if(brand&&!$('exitBtn')){
  const b=document.createElement('button');
  b.type='button';b.id='exitBtn';b.className='exit-btn';
  b.setAttribute('aria-label','Esci dal gioco');
  b.innerHTML=esciIco('power')+'<span>ESCI DAL GIOCO</span>';
  b.onclick=()=>{esciShow('exitOverlay',true);const y=$('exitYes');if(y)y.focus()};
  brand.parentNode.appendChild(b);
 }
 if(!$('exitOverlay')){
  const o=document.createElement('section');o.id='exitOverlay';o.className='overlay hidden';o.setAttribute('aria-label','ESCI DAL GIOCO');
  o.innerHTML='<div class="brief-card compact exit-card"><p class="eyebrow">CONEX</p><h2>ESCI DAL GIOCO?</h2>'+
   '<p>I progressi sono salvati: alla prossima partita riparti da dove eri.</p>'+
   '<button id="exitYes" class="launch-btn exit-yes"><span>SÌ, ESCI</span><b>'+esciIco('power')+'</b></button>'+
   '<button id="exitNo" class="text-btn">ANNULLA</button></div>';
  document.body.appendChild(o);
  $('exitYes').onclick=esciChiudi;
  $('exitNo').onclick=()=>esciShow('exitOverlay',false);
 }
 if(!$('exitDone')){
  const d=document.createElement('section');d.id='exitDone';d.className='exit-done hidden';d.setAttribute('aria-label','GIOCO CHIUSO');
  d.innerHTML='<div class="exit-done-card"><span class="exit-done-ico">'+esciIco('power')+'</span><h2>GIOCO CHIUSO</h2>'+
   '<p>Il browser non permette al gioco di chiudere questa scheda da solo.</p>'+
   '<p>Chiudila con <b>Ctrl+W</b> oppure con <b>Alt+F4</b>.</p>'+
   '<button id="exitBack" class="text-btn">TORNA AL GIOCO</button></div>';
  document.body.appendChild(d);
  $('exitBack').onclick=()=>location.reload();
 }
}

const ESCI_CSS=`
#mapScreen .topbar{position:relative}
.exit-btn{position:absolute;left:0;top:calc(100% + 14px);z-index:40;display:flex;align-items:center;gap:8px;height:34px;padding:0 16px 0 12px;
 border:1px solid #ff6b6b99;background:linear-gradient(135deg,#3a0d12e6,#1a0609e6);color:#ffb3b3;cursor:pointer;
 font:700 11px 'Chakra Petch',sans-serif;letter-spacing:3px;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);transition:.2s}
.exit-btn .ico{width:15px;height:15px;flex:none}
.exit-btn:hover{background:linear-gradient(135deg,#7a1a22,#3a0d12);color:#fff;border-color:#ff8a8a;box-shadow:0 0 18px #ff4d5a55}
.exit-btn:focus-visible{outline:2px solid #ffb3b3;outline-offset:3px}
.exit-yes{background:#ff5c66!important;border-color:#ff5c66!important;color:#1a0306!important}
.exit-yes:hover{background:#ff8a91!important;box-shadow:0 0 24px #ff5c6655!important}
.exit-yes .ico{width:18px;height:18px}
.exit-done{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:#010309;text-align:center}
.exit-done.hidden{display:none}
.exit-done-card{max-width:440px;padding:30px;font-family:'Chakra Petch',sans-serif;color:#cfe3f5}
.exit-done-ico{display:inline-grid;place-items:center;width:64px;height:64px;border-radius:50%;border:1px solid #ff6b6b88;color:#ff8a8a;margin-bottom:14px}
.exit-done-ico .ico{width:30px;height:30px}
.exit-done h2{font:600 30px 'Chakra Petch';letter-spacing:4px;margin:0 0 14px;color:#fff}
.exit-done p{font-size:13px;line-height:1.6;color:#8fa6bd;margin:6px 0}
.exit-done p b{color:#e9f4ff}
#mapScreen .mission-copy .eyebrow:before{display:none}
@media(max-width:850px){.exit-btn{top:calc(100% + 8px);height:30px;font-size:10px;padding:0 12px 0 9px}}
@media(max-height:520px){.exit-btn{left:0;top:calc(100% + 6px);height:26px;font-size:9px;letter-spacing:2px;padding:0 10px 0 8px}.exit-btn .ico{width:12px;height:12px}}
`;

if(typeof document!=='undefined'&&document.querySelector){
 if(document.head&&!$('esciCss')){const st=document.createElement('style');st.id='esciCss';st.textContent=ESCI_CSS;document.head.appendChild(st)}
 esciBuild();
 addEventListener('keydown',e=>{
  if(e.code==='Escape'&&$('exitOverlay')&&!$('exitOverlay').classList.contains('hidden')){esciShow('exitOverlay',false);e.preventDefault()}
 });
}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["Esci dal gioco","Exit the game","Quitter le jeu","Salir del juego","Выйти из игры","退出游戏","ゲームを終了"],
  ["ESCI DAL GIOCO","EXIT THE GAME","QUITTER LE JEU","SALIR DEL JUEGO","ВЫЙТИ ИЗ ИГРЫ","退出游戏","ゲームを終了"],
  ["ESCI DAL GIOCO?","EXIT THE GAME?","QUITTER LE JEU ?","¿SALIR DEL JUEGO?","ВЫЙТИ ИЗ ИГРЫ?","要退出游戏吗？","ゲームを終了しますか？"],
  ["I progressi sono salvati: alla prossima partita riparti da dove eri.","Your progress is saved: next time you pick up where you left off.","Ta progression est sauvegardée : la prochaine fois, tu reprends là où tu t’es arrêté.","Tu progreso está guardado: la próxima vez sigues donde lo dejaste.","Прогресс сохранён: в следующий раз продолжишь с того же места.","进度已保存：下次从离开的地方继续。","進行状況は保存済み：次回は続きから再開できます。"],
  ["SÌ, ESCI","YES, EXIT","OUI, QUITTER","SÍ, SALIR","ДА, ВЫЙТИ","是，退出","はい、終了"],
  ["GIOCO CHIUSO","GAME CLOSED","JEU FERMÉ","JUEGO CERRADO","ИГРА ЗАКРЫТА","游戏已关闭","ゲーム終了"],
  ["Il browser non permette al gioco di chiudere questa scheda da solo.","The browser doesn't let the game close this tab by itself.","Le navigateur ne permet pas au jeu de fermer cet onglet tout seul.","El navegador no permite que el juego cierre esta pestaña por sí solo.","Браузер не позволяет игре самой закрыть эту вкладку.","浏览器不允许游戏自行关闭此标签页。","ブラウザの制限により、ゲームからこのタブを閉じられません。"],
  ["Chiudila con","Close it with","Ferme-le avec","Ciérrala con","Закрой её клавишами","请按以下按键关闭：","次のキーで閉じてください："],
  ["oppure con","or with","ou avec","o con","или","或","または"],
  ["TORNA AL GIOCO","BACK TO THE GAME","RETOUR AU JEU","VOLVER AL JUEGO","ВЕРНУТЬСЯ В ИГРУ","返回游戏","ゲームに戻る"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
 if(typeof i18nApply==='function'&&typeof document!=='undefined'&&document.body)try{i18nApply()}catch(e){}
}
