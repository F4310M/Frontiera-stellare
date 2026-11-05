// Stellar Frontier — NAVE DELLA FASE A TERRA = STESSA NAVE DELLO SPAZIO.
// Nella fase a terra la visuale è di lato: la nave dello spazio (stesso scafo, cupola, motori e colori di game.js)
// viene mostrata inclinata di tre quarti con lo stesso rilievo 3D "a fette" del rollio in volo (shipRoll3D in terra.js).
// Per la fluidità su PC lo scafo si disegna UNA volta in una piccola immagine (con i suoi bagliori) e poi si copia:
// a ogni fotogramma restano solo le fiamme dei motori. Le misure valgono per la scala 2.3 di pfDrawShipOnPad
// e della navetta di riserva di terra.js (il pilota esce da sotto la prua, le fiamme di sostegno escono dal ventre).

const n3Orig={drawShip},N3_SCALE=1.2;
// vista di tre quarti dall'alto: c schiaccia le ali, s mostra lo spessore (y' = y*c - z*s)
const N3_C=.56,N3_S=.83,N3_PX=7;// N3_PX = pixel dell'immagine per unità della nave
const N3_HULL=[[29,0],[8,-7],[-7,-16],[-13,-9],[-22,-12],[-17,0],[-22,12],[-13,9],[-7,16],[8,7]];
const N3_KEEL=[[26,0],[10,-5],[-15,-5.5],[-19,0],[-15,5.5],[10,5]];
const N3_CANOPY=[[15,0],[4,-5],[-5,-4],[-8,0],[-5,4],[4,5]];
let n3Sprite=null;
function n3Poly(g,pts){g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath()}
// solido "a fette": la stessa sagoma ripetuta dalla quota z0 alla quota z1
function n3Slab(g,pts,z0,z1,col){
 const n=Math.min(40,Math.max(2,Math.ceil(Math.abs((z1-z0)*N3_S)*N3_PX)+1));
 for(let i=0;i<n;i++){const k=i/(n-1),z=z0+(z1-z0)*k;g.save();g.transform(1,0,0,N3_C,0,-z*N3_S);g.fillStyle=col(k);n3Poly(g,pts);g.fill();if(i===0){g.strokeStyle='rgba(4,10,18,.9)';g.lineWidth=.8;g.stroke()}g.restore()}
}
// superficie superiore: lo stesso disegno della nave del giocatore nello spazio (game.js), senza fiamme
function n3Top(g){
 if(typeof flHostileBody==='function')return flHostileBody(g,false,false);
 g.fillStyle='#8daab8';g.strokeStyle='#d8fbff';g.lineWidth=1.25;n3Poly(g,N3_HULL);g.fill();g.stroke();
 g.fillStyle='#17364d';g.strokeStyle='#63dcff';n3Poly(g,N3_CANOPY);g.fill();g.stroke();
 for(const y of [-7,7]){g.fillStyle='#142d3c';g.strokeStyle='#6edfff';g.fillRect(-20,y-3,8,6);g.strokeRect(-20,y-3,8,6);g.fillStyle='#53dfff';g.fillRect(-21.5,y-2,2.5,4)}
}
function n3Body(g){
 // ventre della fusoliera e gondole dei motori, sotto le ali
 n3Slab(g,N3_KEEL,-9,-2,k=>`rgb(${26+k*30|0},${40+k*40|0},${54+k*46|0})`);
 for(const py of [-7,7])n3Slab(g,[[-20,py-3],[-12,py-3],[-12,py+3],[-20,py+3]],-7,-1,k=>`rgb(${16+k*20|0},${34+k*26|0},${48+k*30|0})`);
 // spessore di ali e scafo: metallo scuro in basso, più chiaro verso il bordo superiore
 n3Slab(g,N3_HULL,-4,-.3,k=>`rgb(${58+k*60|0},${78+k*70|0},${94+k*72|0})`);
 g.save();g.transform(1,0,0,N3_C,0,2.2*N3_S);g.strokeStyle='rgba(10,22,32,.75)';g.lineWidth=.7;n3Poly(g,N3_HULL);g.stroke();g.restore();
 g.save();g.transform(1,0,0,N3_C,0,.3*N3_S);g.strokeStyle='rgba(140,233,236,.6)';g.lineWidth=.9;n3Poly(g,N3_HULL);g.stroke();g.restore();
 // superficie superiore schiacciata dalla prospettiva
 g.save();g.transform(1,0,0,N3_C,0,0);n3Top(g);g.shadowBlur=0;g.restore();
 // luce dall'alto: l'ala lontana prende luce, quella vicina va un po' in ombra
 g.save();g.transform(1,0,0,N3_C,0,0);const l=g.createLinearGradient(0,-16,0,16);
 l.addColorStop(0,'rgba(230,250,255,.2)');l.addColorStop(.5,'rgba(0,0,0,0)');l.addColorStop(1,'rgba(0,6,14,.36)');g.fillStyle=l;n3Poly(g,N3_HULL);g.fill();g.restore();
 // cupola della cabina in rilievo
 n3Slab(g,N3_CANOPY,0,2.6,k=>`rgb(${14+k*14|0},${44+k*40|0},${66+k*50|0})`);
 g.save();g.transform(1,0,0,N3_C,0,-2.6*N3_S);g.fillStyle='rgba(140,242,255,.85)';g.beginPath();g.ellipse(4,-1,5,2.2,0,0,6.28);g.fill();
 g.fillStyle='rgba(255,255,255,.7)';g.beginPath();g.ellipse(6,-2.2,2,.8,0,0,6.28);g.fill();g.restore();
}
function n3GetSprite(){
 if(n3Sprite!==null)return n3Sprite||null;
 n3Sprite=false;
 try{const c=document.createElement('canvas');if(!c||typeof c.getContext!=='function')return null;
  const L=-46,T=-32,w=94,h=62;c.width=Math.ceil(w*N3_PX);c.height=Math.ceil(h*N3_PX);const g=c.getContext('2d');if(!g||!g.createLinearGradient)return null;
  g.setTransform(N3_PX,0,0,N3_PX,-L*N3_PX,-T*N3_PX);g.lineJoin='round';n3Body(g);
  n3Sprite={c,L,T,w,h}}catch(e){n3Sprite=false}
 return n3Sprite||null;
}
function n3DrawShip(ship){
 const sp=n3GetSprite();if(!sp)return false;
 const now=performance.now()/1000,go=ship.forward>0;
 ctx.save();ctx.translate(ship.x||0,ship.y||0);
 ctx.rotate(Math.sin(now*1.3)*.025);// leggero dondolio in volo
 ctx.scale(N3_SCALE,N3_SCALE);
 // fiamme dagli ugelli posteriori (come nello spazio): lunghe in arrivo, corte in sospensione
 for(const py of [-7,7])drawPlume(-21.5,py*N3_C+4*N3_S,-1,0,go?38:12+Math.random()*3,go?4:2.6,'#51e6ff');
 ctx.drawImage(sp.c,sp.L,sp.T,sp.w,sp.h);
 ctx.restore();
 return true;
}
drawShip=function(ship,hostile=false){
 if(state==='platform'&&!hostile&&typeof ctx!=='undefined'&&ctx.drawImage){try{if(n3DrawShip(ship))return}catch(e){console.error(e)}}
 return n3Orig.drawShip(ship,hostile);
};
