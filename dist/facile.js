// Stellar Frontier — difficoltà più bassa (2026-11-03).
// Tutti i numeri sono qui in FACILE: per rendere il gioco più facile o più difficile basta cambiarli.
// - Fase 1 (spazio): la nave subisce meno danni da colpi, missili, urti e meteoriti.
// - Fase 2 (a terra): il pilota subisce meno danni da colpi, contatti, boss e cadute nel burrone.
// - Nemici (spazio e terra): sparano meno spesso (il tempo di ricarica di ogni colpo è più lungo).
// - Boss a terra: meno salute.
// Va caricato dopo godmode.js e i18n.js (avvolge le loro versioni delle funzioni).

const FACILE={
 danniNave:.6,     // danni alla nave nello spazio: 60% di prima (meteorite grande −75% → −45%)
 danniPilota:.6,   // danni al pilota a terra: 60% di prima (caduta −25 → −15)
 ricaricaNemici:1.35, // i nemici aspettano il 35% in più tra un colpo e l'altro
 saluteBoss:.8     // salute dei boss a terra: 80% di prima
};
const fcScale=(n,k)=>n>0?Math.max(1,Math.round(n*k)):n;
const gOrigFacile={damage,pfDamage,pfFell,pfSpawnBoss,update,status};

// ---- danni
damage=function(n,piercing=false,shieldFirst=false){return gOrigFacile.damage(fcScale(n,FACILE.danniNave),piercing,shieldFirst)};
pfDamage=function(n,dir=1,piercing=false){return gOrigFacile.pfDamage(fcScale(n,FACILE.danniPilota),dir,piercing)};
pfFell=function(){
 const th=pf&&(pf.theme||(typeof pfTheme==='function'?pfTheme(pf.p):null));
 if(!th||typeof th.fallDamage!=='number')return gOrigFacile.pfFell();
 const fd=th.fallDamage;th.fallDamage=fcScale(fd,FACILE.danniPilota);
 try{return gOrigFacile.pfFell()}finally{th.fallDamage=fd}
};

// ---- i messaggi dei meteoriti mostrano il danno vero
const FC_TESTI=[['IMPATTO METEORITE · SCAFO −75%',75],['IMPATTO METEORITE · SCAFO −16%',16]].map(([t,n])=>[t,t.replace('−'+n+'%','−'+fcScale(n,FACILE.danniNave)+'%'),n]);
status=function(t,...a){
 if(typeof t==='string')for(const [da,a2] of FC_TESTI)if(t===da){t=a2;break}
 return gOrigFacile.status(t,...a);
};
if(typeof I18N_ROWS!=='undefined'){
 for(const [da,a2,n] of FC_TESTI){
  const row=I18N_ROWS.find(r=>r[0]===da);
  if(row&&!I18N_ROWS.some(r=>r[0]===a2))I18N_ROWS.push(row.map(s=>s.replace('−'+n+'%','−'+fcScale(n,FACILE.danniNave)+'%')));
 }
 if(typeof i18nBuild==='function')i18nBuild();
}

// ---- boss con meno salute
pfSpawnBoss=function(...a){
 const r=gOrigFacile.pfSpawnBoss(...a),B=pf&&pf.boss;
 if(B&&B.max>0){B.max=Math.max(1,Math.round(B.max*FACILE.saluteBoss));B.hp=Math.min(B.hp,B.max)}
 return r;
};

// ---- i nemici ricaricano più lentamente
// Dopo ogni fotogramma: se il timer di sparo di un nemico è risalito (ha appena sparato), la ricarica si allunga.
function fcRicarica(list){
 if(!list)return;
 for(const e of list){
  if(!e||typeof e.fire!=='number')continue;
  if(typeof e.fcFire==='number'&&e.fire>e.fcFire+.02){const b=Math.max(0,e.fcFire);e.fire=b+(e.fire-b)*FACILE.ricaricaNemici}
  e.fcFire=e.fire;
 }
}
update=function(dt){
 const r=gOrigFacile.update(dt);
 if(typeof enemies!=='undefined')fcRicarica(enemies);
 if(typeof pf!=='undefined'&&pf)fcRicarica(pf.enemies);
 return r;
};
