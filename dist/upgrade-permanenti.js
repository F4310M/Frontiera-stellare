// Conex — POTENZIAMENTI PERMANENTI (2026-11-11, richiesta di Fabio).
// I potenziamenti comprati al mercato restano anche quando la partita ricomincia:
// NUOVA PARTITA, RICOMINCIA IL GIOCO (impostazioni) e GAME OVER.
// Tutto il resto si azzera come prima: pianeti liberati, OMEGA, vite, punti; dei crediti resta il 20%.
// Va caricato subito dopo economia.js (così vale anche per il GAME OVER controllato all'avvio da partita.js).

if(typeof ecoReset==='function'&&typeof eco!=='undefined'){
 const upPermReset=ecoReset;
 ecoReset=function(balance){
  const keep=Object.assign({},eco.upgrades);
  const r=upPermReset.apply(this,arguments);
  eco.upgrades=keep;
  if(typeof ecoSave==='function')ecoSave();
  if(typeof ecoHud==='function')try{ecoHud()}catch(e){}
  return r;
 };
}

// Testi aggiornati (italiano + traduzioni, frasi intere come in I18N_ROWS)
const UP_PERM_ROWS=[
 ["Pianeti liberati, vite e punti verranno persi. I potenziamenti comprati restano.","Freed planets, lives and points will be lost. The upgrades you bought stay.","Les planètes libérées, les vies et les points seront perdus. Les améliorations achetées restent.","Se perderán los planetas liberados, las vidas y los puntos. Las mejoras compradas se quedan.","Освобождённые планеты, жизни и очки будут потеряны. Купленные улучшения остаются.","已解放的星球、生命和分数将会丢失。已购买的升级会保留。","解放した惑星、ライフ、ポイントは失われます。購入したアップグレードは残ります。"],
 ["Perderai i pianeti liberati, le vite e i crediti di questa partita. I potenziamenti comprati restano.","You will lose this game's freed planets, lives and credits. The upgrades you bought stay.","Tu perdras les planètes libérées, les vies et les crédits de cette partie. Les améliorations achetées restent.","Perderás los planetas liberados, las vidas y los créditos de esta partida. Las mejoras compradas se quedan.","Ты потеряешь освобождённые планеты, жизни и кредиты этой игры. Купленные улучшения остаются.","你将失去本局已解放的星球、生命和信用点。已购买的升级会保留。","このゲームで解放した惑星、ライフ、クレジットは失われます。購入したアップグレードは残ります。"],
 ["Nuova partita dal primo pianeta: vite, crediti, pianeti liberati e punti tornano all’inizio. Pilota, impostazioni, potenziamenti comprati e record restano.","New game from the first planet: lives, credits, freed planets and points go back to the start. Pilot, settings, bought upgrades and records stay.","Nouvelle partie depuis la première planète : vies, crédits, planètes libérées et points reviennent au départ. Pilote, réglages, améliorations achetées et records restent.","Nueva partida desde el primer planeta: vidas, créditos, planetas liberados y puntos vuelven al inicio. Piloto, ajustes, mejoras compradas y récords se quedan.","Новая игра с первой планеты: жизни, кредиты, освобождённые планеты и очки сбрасываются. Пилот, настройки, купленные улучшения и рекорды остаются.","从第一颗星球开始新游戏：生命、信用点、已解放的星球和分数回到初始。飞行员、设置、已购买的升级和纪录保留。","最初の惑星から新しいゲーム：ライフ、クレジット、解放した惑星、ポイントは最初に戻ります。パイロット、設定、購入したアップグレード、記録は残ります。"],
 ["Pianeti liberati, vite e crediti verranno persi (i potenziamenti comprati restano) e il punteggio attuale verrà salvato in classifica (se rientri nei primi 10.000).","Freed planets, lives and credits will be lost (the upgrades you bought stay) and your current score will be saved to the leaderboard (if you are in the top 10,000).","Les planètes libérées, les vies et les crédits seront perdus (les améliorations achetées restent) et ton score actuel sera enregistré au classement (si tu es dans les 10 000 premiers).","Se perderán los planetas liberados, las vidas y los créditos (las mejoras compradas se quedan) y tu puntuación actual se guardará en la clasificación (si estás entre los 10.000 primeros).","Освобождённые планеты, жизни и кредиты будут потеряны (купленные улучшения остаются), а текущий счёт попадёт в таблицу рекордов (если ты в первых 10 000).","已解放的星球、生命和信用点将会丢失（已购买的升级会保留），当前分数将保存到排行榜（如果你在前 10,000 名内）。","解放した惑星、ライフ、クレジットは失われ（購入したアップグレードは残ります）、現在のスコアはランキングに保存されます（上位10,000位以内の場合）。"],
 ["I pianeti liberati sono azzerati, i potenziamenti comprati restano e hai di nuovo 3 vite.","Freed planets are reset, the upgrades you bought stay and you have 3 lives again.","Les planètes libérées sont remises à zéro, les améliorations achetées restent et tu as de nouveau 3 vies.","Los planetas liberados se reinician, las mejoras compradas se quedan y vuelves a tener 3 vidas.","Освобождённые планеты сброшены, купленные улучшения остаются, и у тебя снова 3 жизни.","已解放的星球被重置，已购买的升级会保留，你再次拥有 3 条生命。","解放した惑星はリセットされ、購入したアップグレードは残り、ライフは再び3つになります。"]
];
const UP_PERM_20='Recuperi solo il 20% dei crediti guadagnati in questa partita.';
const UP_PERM_GO_OLD='Potenziamenti e pianeti liberati sono azzerati e hai di nuovo 3 vite.';

function upPermTesti(){
 if(typeof document==='undefined'||!document.querySelector)return;
 const set=(sel,txt)=>{const el=document.querySelector(sel);if(el&&el.textContent!==txt)el.textContent=txt};
 set('#newGameOverlay .restart-card > p:not(.eyebrow)',UP_PERM_ROWS[0][0]+' '+UP_PERM_20);
 set('#restartOverlay .restart-card > p:not(.eyebrow)',UP_PERM_ROWS[1][0]+' '+UP_PERM_20);
 set('#restartBlock p',UP_PERM_ROWS[2][0]);
 set('#abandonClose small',UP_PERM_ROWS[3][0]);
}

function upPermAvvio(){
 if(typeof I18N_ROWS!=='undefined'){
  for(const r of UP_PERM_ROWS)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
  if(typeof i18nBuild==='function'){i18nBuild();if(typeof i18nApply==='function')i18nApply()}
 }
 upPermTesti();
 // GAME OVER: stessa logica, solo la frase dei potenziamenti cambia
 if(typeof viteGameOver==='function'){
  const vg=viteGameOver;
  viteGameOver=function(){
   const r=vg.apply(this,arguments);
   const t=typeof $==='function'?$('resultText'):null;
   if(t&&t.textContent.includes(UP_PERM_GO_OLD))t.textContent=t.textContent.replace(UP_PERM_GO_OLD,UP_PERM_ROWS[4][0]);
   return r;
  };
 }
 // NUOVA PARTITA nella home compare solo se c'è una partita in corso: i potenziamenti da soli non contano più
 if(typeof saveHome==='function'&&typeof eco!=='undefined'){
  const sh=saveHome;
  saveHome=function(){
   const u=eco.upgrades;eco.upgrades={};
   try{return sh.apply(this,arguments)}finally{eco.upgrades=u}
  };
  try{saveHome()}catch(e){}
 }
}
if(typeof document!=='undefined'&&document.readyState==='loading'&&document.addEventListener)document.addEventListener('DOMContentLoaded',upPermAvvio);
else upPermAvvio();
