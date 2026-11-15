// Piante di VESPER e fossili dalle immagini di Fabio (immagini-terra.js)
const fs=require('fs'),path=require('path'),assert=require('assert');
const root=path.join(__dirname,'..'),d=f=>path.join(root,'dist',f);
const html=fs.readFileSync(d('index.html'),'utf8'),at=s=>html.indexOf('src="'+s);
assert(at('immagini-terra.js')>at('cristalli.js')&&at('cristalli.js')>at('fossili.js')&&at('fossili.js')>at('fase2.js'),'immagini-terra.js dopo fase2, fossili e cristalli');
for(let i=0;i<8;i++){assert(fs.existsSync(d('piante/cactus'+i+'.webp')),'cactus '+i);assert(fs.existsSync(d('fossili/fossile'+i+'.webp')),'fossile '+i)}
const src=fs.readFileSync(d('immagini-terra.js'),'utf8');
assert(!/\.filter\s*=|\.shadowBlur\s*=/.test(src),'niente filter/shadowBlur per frame');
// fosSprite usa le immagini quando sono caricate, il disegno di prima altrimenti
const vm=require('vm');const img=()=>({complete:true,naturalWidth:240,naturalHeight:200});
const sb={Image:function(){return img()},FOS_KINDS:{ammonite:{w:72,h:72},rettile:{w:300,h:150},cranio:{w:92,h:76},trilobite:{w:70,h:48},pesce:{w:124,h:56},felce:{w:84,h:96}},
 fosSprite:()=>'vecchio',pfDrawFlora:()=>{},ctx:{}};vm.createContext(sb);vm.runInContext(src,sb);
const s=sb.fosSprite({}, {kind:'rettile',v:3});assert(s&&s.c&&s.w>100&&s.h>80,'fossile grande dall\'immagine');
const t=sb.fosSprite({}, {kind:'ammonite',v:1});assert(t.w<=80&&t.w>50,'fossile piccolo nel suo riquadro');
console.log('immagini-terra: ok');
