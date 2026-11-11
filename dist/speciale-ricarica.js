// Conex — COLPO SPECIALE SEMPRE CARICO (2026-11-11).
// - All'inizio di ogni missione, nello spazio e a terra (anche ripartendo dall'inizio della fase): colpo speciale pieno.
// - Quando perdi una vita (nave di riserva nello spazio, pilota di riserva a terra): colpo speciale pieno.
// - Il colpo speciale non costa crediti: la trottola laser e il bombardamento non pagano nulla.
// Va caricato dopo speciale.js, vite.js e rientro.js (avvolge le versioni più esterne delle funzioni).

function srRicaricaSpazio(){
 if(typeof spc==='undefined')return;
 spc.space=false;spc.spin=null;spc.beams=[];
 if(typeof spcBadge==='function')try{spcBadge()}catch(e){}
}
// a terra: se una bomba sta ancora cadendo finisce il suo giro, ma il colpo è di nuovo disponibile
function srRicaricaTerra(){
 if(typeof spc==='undefined')return;
 spc.ground=false;
 if(typeof spcBadge==='function')try{spcBadge()}catch(e){}
}
function srAvvolgi(nome,dopo){
 const orig=globalThis[nome];if(typeof orig!=='function')return;
 globalThis[nome]=function(){const r=orig.apply(this,arguments);try{dopo()}catch(e){}return r};
}
// inizio missione nello spazio e a terra
srAvvolgi('startGame',()=>{srRicaricaSpazio();srRicaricaTerra()});
srAvvolgi('startPlatform',()=>{srRicaricaTerra()});
// vita persa nello spazio: la nave di riserva riparte col colpo speciale carico (vite.js)
srAvvolgi('vtRespawnSpace',srRicaricaSpazio);
// vita persa a terra: carico subito, e di nuovo quando il pilota di riserva tocca terra (rientro.js)
srAvvolgi('pfLoseLife',srRicaricaTerra);
