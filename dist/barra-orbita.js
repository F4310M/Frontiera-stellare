// Barra dell'orbita 2026-11-09 (richiesta di Fabio): il riquadro "RAGGIUNGI L'ORBITA · FRENO: F" con la barra
// della conquista compare solo quando il pianeta obiettivo entra nello schermo.
// Va caricato dopo rifiniture.js (avvolge rfCapture, chiamata a ogni passo di gioco).

function boPlanetOnScreen(){
 if(typeof world==='undefined'||!world||typeof player==='undefined'||!player)return false;
 const z=typeof camZoom==='number'&&camZoom>0?camZoom:1;
 const hw=W/2/z+world.r,hh=H/2/z+world.r;
 return Math.abs(world.x-player.x)<hw&&Math.abs(world.y-player.y)<hh;
}
function boSync(){
 const box=typeof document!=='undefined'&&document.querySelector?document.querySelector('.capture-status'):null;
 if(!box||!box.style)return;
 // visibile se il pianeta si vede, o se la conquista è già iniziata
 const on=state!=='play'||boPlanetOnScreen()||(typeof capture==='number'&&capture>0);
 const v=on?'':'hidden';
 if(box.style.visibility!==v)box.style.visibility=v;
}
if(typeof rfCapture==='function'){
 const boOrig=rfCapture;
 rfCapture=function(){const r=boOrig.apply(this,arguments);try{boSync()}catch(e){}return r};
}
