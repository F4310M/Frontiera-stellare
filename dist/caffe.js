// Conex — pulsante "OFFRIMI UN CAFFÈ" nel menu principale (2026-11-08) e sezione INFO nelle impostazioni (2026-11-09).
// Il pulsante apre una finestra con tre scelte: MANDA UNA MAIL, OFFRIMI UN CAFFÈ, CHIUDI.
// Nelle impostazioni, sotto GIOCO, la sezione INFO mostra la versione del gioco, la mail e il link del caffè.
// Metti qui il link della pagina donazioni (Buy Me a Coffee, Ko-fi, PayPal.me...).
// Vuoto = il pulsante non compare.
const CAFFE_LINK='https://ko-fi.com/mfsoftcreator';
const CAFFE_MAIL='mfsoft@protonmail.com';
const GIOCO_VERSIONE='1.5.1';
const CAFFE_HOSTS=['buymeacoffee.com','www.buymeacoffee.com','ko-fi.com','www.ko-fi.com','paypal.me','www.paypal.me','www.paypal.com','paypal.com','liberapay.com','github.com','patreon.com','www.patreon.com'];
function caffeOk(u){try{const x=new URL(u);return x.protocol==='https:'&&CAFFE_HOSTS.includes(x.hostname)}catch(e){return false}}
function caffeMailOk(m){return typeof m==='string'&&/^[^\s@<>"']+@[^\s@<>"']+\.[a-z]{2,}$/i.test(m)}
function caffeMailto(){return caffeMailOk(CAFFE_MAIL)?'mailto:'+CAFFE_MAIL:''}

const CAFFE_SVG='<path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5c0 1.5 1.5 1.5 1.5 3M12 2.5c0 1.5 1.5 1.5 1.5 3"/>';
if(typeof ICONS!=='undefined'){
 ICONS.coffee=ICONS.coffee||CAFFE_SVG;
 ICONS.mail=ICONS.mail||'<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7l8.5 6.5L20.5 7"/>';
 ICONS.info=ICONS.info||'<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5h.01"/>';
}
function caffeIco(n){return typeof ico==='function'?ico(n):''}

// ---- finestra con le tre scelte
function caffeDialog(){
 if(typeof document==='undefined'||!document.createElement||!document.body)return null;
 let o=document.getElementById('caffeOverlay');if(o)return o;
 o=document.createElement('section');o.id='caffeOverlay';o.className='overlay hidden caffe-overlay';
 o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','Offrimi un caffè');
 const mail=caffeMailto(),cafe=caffeOk(CAFFE_LINK);
 o.innerHTML='<div class="brief-card compact caffe-card">'+
  '<div class="caffe-cup">'+caffeIco('coffee')+'</div>'+
  '<p class="eyebrow">SOSTIENI CONEX</p><h2>OFFRIMI UN CAFFÈ</h2>'+
  '<p>Ti piace il gioco? Scrivimi per idee e problemi, oppure offrimi un caffè per sostenere lo sviluppo.</p>'+
  '<div class="caffe-actions">'+
  (mail?'<a id="caffeMail" class="launch-btn caffe-opt caffe-opt-mail" href="'+mail+'"><span>MANDA UNA MAIL</span><b>'+caffeIco('mail')+'</b></a>':'')+
  (cafe?'<a id="caffeKofi" class="launch-btn caffe-opt caffe-opt-cafe" href="'+CAFFE_LINK+'" target="_blank" rel="noopener noreferrer"><span>OFFRIMI UN CAFFÈ</span><b>'+caffeIco('coffee')+'</b></a>':'')+
  '<button id="caffeClose" type="button" class="caffe-close">'+caffeIco('close')+' <span>CHIUDI</span></button>'+
  '</div></div>';
 document.body.appendChild(o);
 const close=()=>caffeShow(false);
 document.getElementById('caffeClose').onclick=close;
 for(const id of['caffeMail','caffeKofi']){const a=document.getElementById(id);if(a)a.addEventListener('click',()=>setTimeout(close,0))}
 o.addEventListener('click',e=>{if(e.target===o)close()});
 return o;
}
function caffeOpen(){return!!(document.getElementById('caffeOverlay')&&!document.getElementById('caffeOverlay').classList.contains('hidden'))}
function caffeShow(on){
 const o=caffeDialog();if(!o)return;
 o.classList.toggle('hidden',!on);
 if(typeof sfx==='function')try{sfx('ui')}catch(e){}
 if(on){const f=document.getElementById('caffeMail')||document.getElementById('caffeKofi')||document.getElementById('caffeClose');if(f&&f.focus)f.focus()}
 else{const b=document.getElementById('caffeBtn');if(b&&b.focus)b.focus()}
}
if(typeof addEventListener==='function')addEventListener('keydown',e=>{
 if(e.code!=='Escape'&&e.key!=='Escape')return;
 if(typeof document==='undefined'||!caffeOpen())return;
 e.preventDefault();e.stopImmediatePropagation();caffeShow(false);
},true);

// ---- pulsante nel menu principale
function caffeButton(){
 if(typeof document==='undefined'||!document.querySelector||!caffeOk(CAFFE_LINK)||document.getElementById('caffeBtn'))return null;
 const top=document.querySelector('.top-actions');if(!top)return null;
 const a=document.createElement('a');a.id='caffeBtn';a.className='settings-btn caffe-btn';a.href=CAFFE_LINK;a.target='_blank';a.rel='noopener noreferrer';
 a.setAttribute('aria-label','Offrimi un caffè');a.title='Offrimi un caffè';a.setAttribute('aria-haspopup','dialog');
 a.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+CAFFE_SVG+'</svg> <span>OFFRIMI UN CAFFÈ</span>';
 a.addEventListener('click',e=>{e.preventDefault();caffeShow(true)});
 const st=document.getElementById('settingsBtn');top.insertBefore(a,st||null);
 return a;
}

// ---- sezione INFO nelle impostazioni, subito sotto GIOCO
function caffeInfoHtml(){
 const mail=caffeMailto(),cafe=caffeOk(CAFFE_LINK);
 return '<div class="setting-block info-block"><div class="setting-title"><span>VERSIONE DEL GIOCO</span></div>'+
   '<p class="info-ver"><b>CONEX</b> <span id="infoVersion">'+GIOCO_VERSIONE+'</span></p></div>'+
  (mail?'<div class="setting-block info-block"><div class="setting-title"><span>CONTATTI</span></div><p>Domande, idee o problemi? Scrivimi una mail.</p>'+
   '<a id="infoMail" class="info-link" href="'+mail+'">'+caffeIco('mail')+'<span><b>MANDA UNA MAIL</b><small>'+CAFFE_MAIL+'</small></span></a></div>':'')+
  (cafe?'<div class="setting-block info-block"><div class="setting-title"><span>OFFRIMI UN CAFFÈ</span></div><p>Ti piace il gioco? Puoi sostenerlo con un caffè.</p>'+
   '<a id="infoKofi" class="info-link info-cafe" href="'+CAFFE_LINK+'" target="_blank" rel="noopener noreferrer">'+caffeIco('coffee')+'<span><b>OFFRIMI UN CAFFÈ</b><small>ko-fi.com</small></span></a></div>':'');
}
function caffeInfo(){
 if(typeof document==='undefined'||!document.querySelector||!document.createElement||document.getElementById('infoBlock')||document.getElementById('spPanel-info'))return null;
 const nav=document.querySelector('#settingsOverlay .sp-nav'),body=document.querySelector('#settingsOverlay .sp-body');
 if(nav&&body){
  if(typeof IMP_TABS!=='undefined'&&!IMP_TABS.some(t=>t.id==='info'))IMP_TABS.push({id:'info',icon:'info',name:'INFO',sub:'Versione e contatti'});
  const b=document.createElement('button');b.type='button';b.className='sp-tab';b.setAttribute('role','tab');b.dataset.tab='info';b.setAttribute('aria-controls','spPanel-info');
  b.setAttribute('aria-selected','false');b.tabIndex=-1;
  b.innerHTML=caffeIco('info')+'<span><b>INFO</b><small>Versione e contatti</small></span>';
  const gioco=nav.querySelector('.sp-tab[data-tab="gioco"]');nav.insertBefore(b,gioco?gioco.nextSibling:null);
  b.onclick=()=>{if(typeof impShow==='function')impShow('info');if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
  b.onkeydown=e=>{const k={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.code];if(!k||typeof impStep!=='function')return;e.preventDefault();e.stopPropagation();impStep(k);const a=nav.querySelector('.sp-tab.active');if(a)a.focus()};
  const p=document.createElement('section');p.className='sp-panel';p.id='spPanel-info';p.dataset.tab='info';p.setAttribute('role','tabpanel');p.hidden=true;
  p.innerHTML='<header class="sp-panel-head"><h3>INFO</h3><p>Versione del gioco e contatti dello sviluppatore.</p></header><div class="sp-stack info-stack">'+caffeInfoHtml()+'</div>';
  body.appendChild(p);
  // se l'ultima sezione aperta era INFO, riaprila lì
  let last=null;try{last=localStorage.getItem(typeof IMP_TAB_KEY!=='undefined'?IMP_TAB_KEY:'')}catch(e){}
  if(last==='info'&&typeof impShow==='function')impShow('info',false);
  return p;
 }
 // impostazioni senza sezioni: blocco in fondo alla colonna laterale
 const side=document.querySelector('#settingsOverlay .settings-side');if(!side)return null;
 const d=document.createElement('div');d.id='infoBlock';d.className='info-stack';d.innerHTML=caffeInfoHtml();side.appendChild(d);
 return d;
}

if(typeof I18N_ROWS!=='undefined'){
 for(const r of [
  ["OFFRIMI UN CAFFÈ","BUY ME A COFFEE","OFFRE-MOI UN CAFÉ","INVÍTAME A UN CAFÉ","УГОСТИ МЕНЯ КОФЕ","请我喝杯咖啡","コーヒーをおごる"],
  ["Offrimi un caffè","Buy me a coffee","Offre-moi un café","Invítame a un café","Угости меня кофе","请我喝杯咖啡","コーヒーをおごる"],
  ["SOSTIENI CONEX","SUPPORT CONEX","SOUTIENS CONEX","APOYA CONEX","ПОДДЕРЖИ CONEX","支持 CONEX","CONEX を応援"],
  ["Ti piace il gioco? Scrivimi per idee e problemi, oppure offrimi un caffè per sostenere lo sviluppo.","Enjoying the game? Write to me with ideas or problems, or buy me a coffee to support development.","Le jeu te plaît ? Écris-moi pour tes idées ou problèmes, ou offre-moi un café pour soutenir le développement.","¿Te gusta el juego? Escríbeme con ideas o problemas, o invítame a un café para apoyar el desarrollo.","Нравится игра? Напиши мне об идеях или проблемах или угости кофе, чтобы поддержать разработку.","喜欢这款游戏吗？欢迎写信告诉我你的想法或遇到的问题，也可以请我喝杯咖啡支持开发。","ゲームを気に入ってくれた？アイデアや不具合はメールで、開発の応援にはコーヒーをおごってください。"],
  ["MANDA UNA MAIL","SEND AN EMAIL","ENVOYER UN E-MAIL","ENVIAR UN CORREO","НАПИСАТЬ ПИСЬМО","发送邮件","メールを送る"],
  ["CHIUDI","CLOSE","FERMER","CERRAR","ЗАКРЫТЬ","关闭","閉じる"],
  ["INFO","INFO","INFOS","INFO","ИНФО","信息","情報"],
  ["Versione e contatti","Version and contacts","Version et contacts","Versión y contacto","Версия и контакты","版本和联系方式","バージョンと連絡先"],
  ["Versione del gioco e contatti dello sviluppatore.","Game version and developer contacts.","Version du jeu et contacts du développeur.","Versión del juego y contacto del desarrollador.","Версия игры и контакты разработчика.","游戏版本和开发者联系方式。","ゲームのバージョンと開発者の連絡先。"],
  ["VERSIONE DEL GIOCO","GAME VERSION","VERSION DU JEU","VERSIÓN DEL JUEGO","ВЕРСИЯ ИГРЫ","游戏版本","ゲームのバージョン"],
  ["CONTATTI","CONTACTS","CONTACTS","CONTACTO","КОНТАКТЫ","联系方式","連絡先"],
  ["Domande, idee o problemi? Scrivimi una mail.","Questions, ideas or problems? Send me an email.","Questions, idées ou problèmes ? Écris-moi un e-mail.","¿Preguntas, ideas o problemas? Escríbeme un correo.","Вопросы, идеи или проблемы? Напиши мне письмо.","有问题、想法或遇到故障？给我发邮件吧。","質問、アイデア、不具合はメールでどうぞ。"],
  ["Ti piace il gioco? Puoi sostenerlo con un caffè.","Enjoying the game? You can support it with a coffee.","Le jeu te plaît ? Tu peux le soutenir avec un café.","¿Te gusta el juego? Puedes apoyarlo con un café.","Нравится игра? Поддержи её чашкой кофе.","喜欢这款游戏吗？可以请我喝杯咖啡来支持它。","ゲームを気に入ったら、コーヒー1杯で応援できます。"]
 ])if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}
caffeButton();
try{caffeDialog();caffeInfo()}catch(e){}
if(typeof I18N_ROWS!=='undefined'&&typeof i18nApply==='function')try{i18nApply()}catch(e){}
