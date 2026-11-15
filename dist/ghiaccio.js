// Conex — NIMBUS DIVENTA UN PIANETA DI NEVE E GHIACCI (2026-11-15, richiesta di Fabio).
// Nuovo tema 'ghiaccio' per NIMBUS, costruito come 'abisso' di OMEGA: è una copia del tema 'tempesta'
// (stesse regole di gioco: piattaforme sopra il vuoto, boss sfera sentinella, bestie dei sotterranei)
// con colori, materiali e testi nuovi. Così tutto ciò che si aspetta 'tempesta' continua a funzionare
// (pf.theme.id resta 'tempesta', il boss resta quello di NIMBUS grazie a p.boss).
// - Missione a terra: cielo gelido, neve sui bordi, corpo di ghiaccio azzurro, crepacci, neve che cade.
// - Pianeta nello spazio (pianeta.js): terre bianche e celesti, ghiacciai, mare di ghiaccio, nubi sottili,
//   atmosfera azzurra.
// - Globo della home (pianeti-dettaglio.js) e pianeta del menu (menu-pianeti.js): stessi colori.
// Va caricato dopo game.js, fase2.js, grafica2.js, pianeta.js, pianeti-dettaglio.js, menu-pianeti.js,
// finale.js e i18n.js.

const GH={
 nome:'NIMBUS',
 desc:'Pianeta di nevi eterne e ghiacciai, con una base scavata nel ghiaccio.',
 brief:'La colonia è aggrappata ai ghiacciai di un pianeta gelato: sotto le piattaforme c’è il vuoto.',
 banner:'BASE DEI GHIACCI · LIBERA GLI OSTAGGI',
 fall:'PRECIPITATO IN UN CREPACCIO'
};

// ---------------------------------------------------------------- pianeta nella lista
if(typeof planets!=='undefined'){
 const p=planets.find(q=>q.name===GH.nome);
 if(p)Object.assign(p,{theme:'ghiaccio',boss:p.boss||'tempesta',color:'#8fcfee',glow:'#c8f2ff',desc:GH.desc});
}

// ---------------------------------------------------------------- missione a terra
if(typeof PF_THEMES!=='undefined'&&PF_THEMES.tempesta){
 PF_THEMES.ghiaccio=Object.assign({},PF_THEMES.tempesta,{mat:'ghiaccio',name:'GHIACCIO',brief:GH.brief,banner:GH.banner,
  sky:['#0c1a2e','#3a6a96','#bfe3f6'],far:'#9fc4dc',near:'#6f9cbc',rim:'#f2fbff',top:'#f4fbff',body:['#7fb2d4','#2a557a'],edge:'#ffffff',haze:'#d6efff',
  fall:GH.fall,ambient:'neve',splash:['#ffffff','#9fd4f2']});
}
if(typeof G_MAT!=='undefined'&&G_MAT.tempesta){
 G_MAT.ghiaccio=Object.assign({},G_MAT.tempesta,{dark:[46,86,120],mid:[118,170,206],light:[214,238,252],strata:.35,ridge:0,speck:[255,255,255],
  top:[236,248,255],top2:[255,255,255],lip:[150,200,232],rim:'#ffffff',liquid:['rgba(200,235,255,.0)','#6fa8cc','#1c3e5c'],foam:'rgba(255,255,255,.9)',
  grade:['#f2fbff','#9fbdd2'],sun:[240,250,255],sunPos:[.7,.16],rays:.12});
}
// neve che cade (al posto della pioggia della tempesta): fiocchi lenti che ondeggiano
if(typeof pfUpdateAmbient==='function'){
 const orig=pfUpdateAmbient;
 pfUpdateAmbient=function(dt){
  const r=orig.apply(this,arguments);
  try{const th=pf.theme;if(th&&th.ambient==='neve'&&pf.ambient){
   const VW=pfViewW();let n=70*dt;
   while(n>0){if(Math.random()<n){const s=Math.random();pf.ambient.push({kind:'fiocco',x:Math.random()*(VW+200)-100,y:-12,vx:-18-s*30,vy:40+s*70,life:12,rot:0,spin:0,seed:Math.random()*9,r:.8+s*2.2})}n-=1}
  }}catch(e){}
  return r;
 };
}
if(typeof pfDrawAmbient==='function'){
 const orig=pfDrawAmbient;
 pfDrawAmbient=function(now){
  const A=pf.ambient;if(!A||!A.some(a=>a.kind==='fiocco'))return orig.apply(this,arguments);
  const rest=A.filter(a=>a.kind!=='fiocco');pf.ambient=rest;
  try{orig.apply(this,arguments)}finally{pf.ambient=A}
  ctx.save();ctx.fillStyle='rgba(255,255,255,.85)';
  for(const a of A)if(a.kind==='fiocco'){const x=a.x+Math.sin(now*1.3+a.seed)*8;ctx.globalAlpha=.45+.4*Math.min(1,a.r/2.5);ctx.beginPath();ctx.arc(x,a.y,a.r,0,6.28);ctx.fill()}
  ctx.restore();
 };
}

// ---------------------------------------------------------------- pianeta nello spazio (pianeta.js)
if(typeof PL_THEMES!=='undefined'){
 // tutto coperto di neve e ghiaccio, niente mari (richiesta di Fabio del 15/11): il livello del mare è 0,
 // quindi tutta la superficie è "terra"; i colori vanno dalle valli di ghiaccio grigio-azzurro (basse)
 // ai campi di neve bianchi, ai ghiacciai celesti e alle creste bianche (alte). Il rilievo resta.
 PL_THEMES.ghiaccio={sea:0,water:['#9fbfd4','#c8e0ee','#e8f4fa'],
  land:[[.3,'#8aa6bb'],[.42,'#b7cfdf'],[.52,'#eef6fb'],[.64,'#cfe5f2'],[.74,'#9cc4dd'],[.86,'#f4fbff'],[1,'#dbeaf4'],[1.2,'#ffffff']],
  clouds:.66,cloudAmt:.35,ice:.8,atm:[170,225,255]};
}
// ---------------------------------------------------------------- globo della home (pianeti-dettaglio.js)
if(typeof PD_THEMES!=='undefined'){
 const st=typeof pdStops==='function'?pdStops:(a=>a);
 // come nello spazio: niente mare, solo neve e ghiaccio
 PD_THEMES.ghiaccio={sea:0,deep:'#9fbfd4',shallow:'#c8e0ee',coast:'#e8f4fa',
  land:st([[.3,'#8aa6bb'],[.44,'#b7cfdf'],[.56,'#eef6fb'],[.68,'#cfe5f2'],[.8,'#9cc4dd'],[.94,'#f4fbff'],[1.1,'#dbeaf4'],[1.3,'#ffffff']]),
  ice:.8,cloud:[.64,.32,'#ffffff'],atm:'#aee6ff',glow:'#dff6ff',cities:.12,craters:4};
}
// ---------------------------------------------------------------- pianeta del menu (menu-pianeti.js)
if(typeof mpTexture==='function'&&typeof MP!=='undefined'){
 const orig=mpTexture;
 mpTexture=function(p){
  if(!p||p.theme!=='ghiaccio')return orig.apply(this,arguments);
  const key=p.code||p.name;if(MP.tex.has(key))return MP.tex.get(key);
  const o=mpCanvas(MP_TW,MP_TH);let url='';
  if(o){const g=o.g,s=(p.name||'').length*97+(p.difficulty||1)*13;
   // tutto neve: base bianca, ghiacciai celesti e valli grigio-azzurre, niente mare
   g.fillStyle='#e6f2f9';g.fillRect(0,0,MP_TW,MP_TH);
   for(let i=0;i<8;i++)mpBand(g,i*16,7,`rgba(${i%2?'150,185,210':'255,255,255'},${i%2?.22:.35})`,4,s+i);
   mpLand(g,s,4,'rgba(170,200,222,.45)','rgba(255,255,255,.5)');
   for(let i=0;i<10;i++)mpBlob(g,mpHash(s+i*7)*MP_TW,mpHash(s+i*7+1)*MP_TH,4+mpHash(s+i*7+2)*10,'rgba(255,255,255,.4)',.4);
   try{url=o.c.toDataURL('image/png')}catch(e){url=''}}
  MP.tex.set(key,url);return url;
 };
}

// ---------------------------------------------------------------- traduzioni dei testi nuovi
if(typeof I18N_ROWS!=='undefined'){
 for(const r of [
  [GH.desc,'A world of eternal snow and glaciers, with a base carved into the ice.','Un monde de neiges éternelles et de glaciers, avec une base creusée dans la glace.','Un mundo de nieves eternas y glaciares, con una base excavada en el hielo.','Мир вечных снегов и ледников с базой, вырубленной во льду.','终年积雪与冰川的世界，冰中凿出了一座基地。','万年雪と氷河の世界。氷を掘って作った基地がある。'],
  [GH.brief,'The colony clings to the glaciers of a frozen planet: below the platforms there is only the void.','La colonie s’accroche aux glaciers d’une planète gelée : sous les plateformes, c’est le vide.','La colonia se aferra a los glaciares de un planeta helado: bajo las plataformas está el vacío.','Колония держится за ледники замёрзшей планеты: под платформами — пустота.','殖民地紧附在冰封星球的冰川上：平台下方是虚空。','植民地は凍った惑星の氷河にしがみついている。足場の下は虚空だ。'],
  [GH.banner,'ICE BASE · FREE THE HOSTAGES','BASE DES GLACES · LIBÈRE LES OTAGES','BASE DE HIELO · LIBERA A LOS REHENES','ЛЕДЯНАЯ БАЗА · ОСВОБОДИ ЗАЛОЖНИКОВ','冰之基地 · 解救人质','氷の基地 · 人質を解放せよ'],
  [GH.fall,'FELL INTO A CREVASSE','TOMBÉ DANS UNE CREVASSE','CAÍSTE EN UNA GRIETA','ПРОВАЛИЛСЯ В РАСЩЕЛИНУ','坠入冰裂缝','クレバスに転落'],
  ['GHIACCIO','ICE','GLACE','HIELO','ЛЁД','冰','氷']
 ])if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')try{i18nBuild()}catch(e){}
}
// globo e pianeta del menu: le immagini di NIMBUS (e il worker che le prepara) possono essere già state fatte
// con i colori di prima: si buttano, così si rifanno con il tema nuovo
try{const p=planets.find(q=>q.name===GH.nome),k=p&&(p.code||p.name);
 if(k&&typeof PD!=='undefined'){PD.tex&&PD.tex.delete(k);PD.views&&PD.views.delete&&PD.views.delete(k);if(PD.wurl){try{URL.revokeObjectURL(PD.wurl)}catch(e){}}PD.wurl=undefined}
 if(k&&typeof MP!=='undefined'&&MP.tex)MP.tex.delete(k);
}catch(e){}
// la mappa iniziale era già stata costruita con i colori di prima: si ricostruisce (come fa godmode.js)
try{if(typeof initMap==='function'&&typeof state!=='undefined'&&state==='map'&&$('starMap')&&$('starMap').appendChild){initMap();if(typeof selectPlanet==='function')selectPlanet(selected)}}catch(e){}
