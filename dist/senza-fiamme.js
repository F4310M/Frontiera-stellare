// Conex — relitto del robot SENZA FIAMME (2026-11-11).
// Le fiamme sul robot distrutto rallentavano troppo il gioco: restano solo i rottami, il fumo e le braci.
// Sostituisce sia le fiamme di battaglia.js sia quelle di fiamme-relitto.js (che non viene più caricato).
// Va caricato dopo battaglia.js.
if(typeof battDrawFire==='function')battDrawFire=function(){};
