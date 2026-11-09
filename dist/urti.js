// Urti 2026-11-09: suono d'impatto quando la nave (o il pilota a terra) sbatte contro qualcosa.
// - nello spazio: rocce, relitti, mostri (tutto ciò che passa da bounce() di game.js)
// - a terra: il pilota che sbatte contro un muro o atterra pesante (pfMoveBody di fase2.js)
// - nella sfida online: arena.js chiama urtoSfx() quando la nave rimbalza su una roccia o la colpisce un frammento
// Il suono passa da tone()/noise() di game.js, quindi segue il volume EFFETTI delle impostazioni.
// Va caricato dopo battaglia.js e prima di arena.js.

const URTI={
 gap:.12,        // s minimi tra due suoni d'urto
 minSpace:25,    // velocità di avvicinamento minima (px/s) per sentire l'urto nello spazio
 fullSpace:420,  // velocità a cui l'urto nello spazio suona al massimo
 wallMin:150,    // a terra: velocità orizzontale minima contro un muro
 landMin:560,    // a terra: velocità di caduta minima per l'atterraggio pesante
 fullGround:980  // a terra: velocità a cui l'urto suona al massimo
};
const urti={t:-1};

// p: forza dell'urto da 0 a 1. kind: 'nave' (scafo metallico) o 'pilota' (stivali e armatura)
function urtoSfx(p=.6,kind='nave'){
 if(typeof soundEnabled!=='undefined'&&!soundEnabled)return;
 if(typeof tone!=='function'||typeof noise!=='function')return;
 const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
 if(now-urti.t<URTI.gap)return;
 urti.t=now;
 p=Math.max(0,Math.min(1,+p||0));const v=.45+.55*p;
 try{
  if(kind==='pilota'){
   tone(88,.2,'sine',.055*v,42);            // tonfo
   noise(.11,.05*v,650+500*p);              // polvere e ghiaia
   tone(430,.06,'square',.006*v,300);       // tintinnio dell'armatura
  }else{
   tone(92,.3,'sine',.06*v,34);             // botta sorda sullo scafo
   noise(.18,.06*v,900+1500*p);             // schianto
   tone(250,.2,'triangle',.022*v,140);      // lamiera che vibra
   tone(640,.14,'square',.006*v,390,.012);  // squillo metallico
  }
 }catch(e){}
}

// ---------------------------------------------------------------- spazio (single player)
if(typeof bounce==='function'){
 const urtiBounce=bounce;
 bounce=function(entity,entityRadius){
  try{
   let dx=player.x-entity.x,dy=player.y-entity.y,d=Math.hypot(dx,dy);if(d<.001){dx=1;dy=0;d=1}
   const closing=(player.vx-(entity.vx||0))*dx/d+(player.vy-(entity.vy||0))*dy/d;
   if(closing<-URTI.minSpace)urtoSfx(-closing/URTI.fullSpace,'nave');
  }catch(e){}
  return urtiBounce.apply(this,arguments);
 };
}

// ---------------------------------------------------------------- terra (pilota)
if(typeof pfMoveBody==='function'){
 const urtiMove=pfMoveBody;
 pfMoveBody=function(b,dt){
  const me=typeof pf!=='undefined'&&pf&&b===pf.pilot&&b.visible!==false;
  const vx=b.vx,vy=b.vy,wall=b.wall,ground=b.ground;
  const r=urtiMove.apply(this,arguments);
  if(me)try{
   if(b.wall&&!wall&&Math.abs(vx)>URTI.wallMin)urtoSfx(Math.abs(vx)/URTI.fullGround,'pilota');
   else if(b.ground&&!ground&&vy>URTI.landMin)urtoSfx(vy/URTI.fullGround,'pilota');
  }catch(e){}
  return r;
 };
}
