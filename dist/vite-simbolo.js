// Conex — SIMBOLO DELLE VITE (2026-11-12)
// Accanto a "VITE × N" non c'è più la foto del pilota: nello spazio e nella mappa il simbolo della
// nave, nella missione a terra (state 'platform') l'omino pilota con la tuta bianca.
// Va caricato subito dopo vite.js (sostituisce vtFoto, che vite.js chiama per nome).
(function(){
 if(typeof vtFoto!=='function')return;
 const svg=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'+
  '<defs><radialGradient id="f" cx=".5" cy=".42" r=".7"><stop offset="0" stop-color="#123b52"/><stop offset="1" stop-color="#040c16"/></radialGradient></defs>'+
  '<rect width="64" height="64" fill="url(#f)"/>'+s+'</svg>');
 // nave vista dall'alto, muso in alto, motori accesi
 const NAVE=svg(
  '<path d="M27 50l-2 8h4zM37 50l2 8h-4z" fill="#ffb347" opacity=".9"/>'+
  '<path d="M32 7c3 6 5 14 5.5 22L52 41v6l-14-4-1.5 7h-9L26 43l-14 4v-6l14.5-12C27 21 29 13 32 7z" fill="#d9f6ff" stroke="#8cf2ff" stroke-width="1.5" stroke-linejoin="round"/>'+
  '<path d="M32 15c1.8 3.4 2.6 7.6 2.6 11h-5.2c0-3.4.8-7.6 2.6-11z" fill="#1b9fd0"/>'+
  '<path d="M18 42l8-7M46 42l-8-7" stroke="#ff4d5e" stroke-width="2" stroke-linecap="round"/>');
 // omino pilota: casco con visiera, tuta bianca, zaino jetpack
 const PILOTA=svg(
  '<rect x="18" y="26" width="7" height="16" rx="2.5" fill="#7d8ea0"/>'+
  '<path d="M23 26h18a4 4 0 0 1 4 4v12h-6v15h-6V46h-2v11h-6V42h-6V30a4 4 0 0 1 4-4z" fill="#eef7ff" stroke="#8cf2ff" stroke-width="1.3" stroke-linejoin="round"/>'+
  '<circle cx="32" cy="16" r="9" fill="#eef7ff" stroke="#8cf2ff" stroke-width="1.3"/>'+
  '<path d="M25.5 15.5c0-3.5 2.9-5.5 6.5-5.5s6.5 2 6.5 5.5c0 2.6-2.9 3.8-6.5 3.8s-6.5-1.2-6.5-3.8z" fill="#1b9fd0"/>'+
  '<path d="M28 13.5c1-1.2 2.4-1.8 4-1.8" stroke="#bff6ff" stroke-width="1.2" fill="none" stroke-linecap="round"/>'+
  '<rect x="28" y="31" width="8" height="5" rx="1" fill="#ff7a3c"/>');
 const aTerra=()=>typeof state!=='undefined'&&state==='platform';
 vtFoto=function(){return aTerra()?PILOTA:NAVE};
 globalThis.viteSimbolo={NAVE,PILOTA,aTerra};
 // il simbolo cambia appena si atterra o si riparte (vite.js aggiorna il riquadro solo quando cambia)
 let ultimo='';
 if(typeof setInterval==='function')setInterval(()=>{
  const f=vtFoto();if(f===ultimo)return;ultimo=f;
  try{if(typeof viteHud==='function')viteHud()}catch(e){}
 },400);
 // niente bordo tondo da foto: il simbolo si vede intero
 if(typeof document!=='undefined'&&document.createElement&&document.head){
  const css=document.createElement('style');
  css.textContent='.lives-hud img,#mapVite .pb-val img{object-fit:contain;background:#040c16}';
  document.head.appendChild(css);
 }
})();
