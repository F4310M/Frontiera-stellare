// Conex — IMPOSTAZIONI IN UNA PAGINA (2026-11-08).
// Le impostazioni non sono più una finestra sopra la mappa: sono una pagina intera, con le sezioni
// a sinistra (COMANDI, JOYPAD, AUDIO, GIOCO) e il contenuto a destra (sui telefoni le sezioni vanno in alto).
// La pagina resta la stessa sezione #settingsOverlay: gli altri script (lingua, ricomincia, god mode,
// comandi) continuano a trovare .settings-main e .settings-side. Ogni blocco che qualcuno aggiunge
// più tardi in .settings-side finisce nella sezione GIOCO.
// Stile in impostazioni.css. Va caricato dopo comandi.js e prima di joypad.js e vetrina.js.

const IMP_TAB_KEY='stellarImpostazioniSezione';
const IMP_TABS=[
 {id:'comandi',icon:'keyboard',name:'COMANDI',sub:'Tastiera e mouse'},
 {id:'joypad',icon:'gamepad',name:'JOYPAD',sub:'Controller e tasti'},
 {id:'audio',icon:'sound',name:'AUDIO',sub:'Effetti e musica'},
 {id:'gioco',icon:'gear',name:'GIOCO',sub:'Lingua, god mode, partita'}
];
if(typeof ICONS!=='undefined'){
 ICONS.gamepad=ICONS.gamepad||'<path d="M7 8h10a4 4 0 0 1 4 4.2l-.4 3.6a2.6 2.6 0 0 1-4.6 1.4L14.5 15h-5L8 17.2a2.6 2.6 0 0 1-4.6-1.4L3 12.2A4 4 0 0 1 7 8z"/><path d="M8 10.5v3M6.5 12h3"/><circle cx="15.5" cy="11" r=".6"/><circle cx="17.3" cy="13" r=".6"/>';
 ICONS.keyboard=ICONS.keyboard||'<rect x="2.5" y="6" width="19" height="12" rx="2"/><path d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M7 14h10"/>';
 ICONS.sound=ICONS.sound||'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>';
}
const imp={tab:'comandi',built:false};
function impIco(n){return typeof ico==='function'?ico(n):''}
function impTabOk(id){
 if(!IMP_TABS.some(t=>t.id===id))return false;
 return !(id==='comandi'&&typeof document!=='undefined'&&document.body&&document.body.classList.contains('touch'));
}
function impLoadTab(){let t=null;try{t=localStorage.getItem(IMP_TAB_KEY)}catch(e){}return impTabOk(t)?t:null}
function impShow(id,save=true){
 if(!impTabOk(id))id=IMP_TABS.find(t=>impTabOk(t.id)).id;
 imp.tab=id;
 if(typeof document==='undefined'||!document.querySelectorAll)return id;
 for(const b of document.querySelectorAll('#settingsOverlay .sp-tab')){const on=b.dataset.tab===id;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1}
 for(const p of document.querySelectorAll('#settingsOverlay .sp-panel'))p.hidden=p.dataset.tab!==id;
 const body=document.querySelector('#settingsOverlay .sp-body');if(body)body.scrollTop=0;
 if(save)try{localStorage.setItem(IMP_TAB_KEY,id)}catch(e){}
 return id;
}
// Sezione precedente o successiva (LB / RB del joypad, frecce sulle linguette).
function impStep(d){
 const ok=IMP_TABS.filter(t=>impTabOk(t.id)),i=Math.max(0,ok.findIndex(t=>t.id===imp.tab));
 return impShow(ok[(i+d+ok.length)%ok.length].id);
}
function impBlockOf(id){const el=typeof $==='function'?$(id):null;return el&&el.closest?el.closest('.setting-block'):null}
// Sposta i blocchi della vecchia finestra nelle sezioni della pagina.
function impSort(){
 const side=document.querySelector('#settingsOverlay .sp-panel[data-tab="gioco"]');
 const audio=document.querySelector('#settingsOverlay .sp-panel[data-tab="audio"] .sp-stack');
 if(!side||!audio)return;
 for(const id of['soundToggle','musicToggle']){const b=impBlockOf(id);if(b&&b.parentNode!==audio)audio.appendChild(b)}
 const joy=$('joypadBlock'),jp=document.querySelector('#settingsOverlay .sp-panel[data-tab="joypad"] .sp-stack');
 if(joy&&jp&&joy.parentNode!==jp)jp.appendChild(joy);
}
function impBuild(){
 if(imp.built||typeof document==='undefined'||!document.querySelector||!document.createElement)return;
 const ov=$('settingsOverlay'),card=ov&&ov.querySelector('.settings-card'),cols=card&&card.querySelector('.settings-cols');
 if(!card||!cols)return;
 imp.built=true;
 ov.classList.add('settings-page');ov.setAttribute('role','dialog');
 const main=cols.querySelector('.settings-main'),side=cols.querySelector('.settings-side');
 // testata: torna al menu a sinistra, titolo, X a destra
 const head=card.querySelector('.settings-head');
 if(head&&!$('settingsBack')){
  const back=document.createElement('button');back.id='settingsBack';back.type='button';back.className='sp-back';back.setAttribute('aria-label','Torna al menu');
  back.innerHTML=impIco('arrow-left')+' <span>TORNA AL MENU</span>';
  back.onclick=()=>{const c=$('closeSettings');if(c&&c.onclick)c.onclick();else if(typeof closeSettings==='function')closeSettings()};
  head.insertBefore(back,head.firstChild);
 }
 const body=document.createElement('div');body.className='sp-wrap';
 const nav=document.createElement('nav');nav.className='sp-nav';nav.setAttribute('role','tablist');nav.setAttribute('aria-label','Sezioni delle impostazioni');
 nav.innerHTML=IMP_TABS.map(t=>`<button type="button" class="sp-tab" role="tab" data-tab="${t.id}" aria-controls="spPanel-${t.id}">${impIco(t.icon)}<span><b>${t.name}</b><small>${t.sub}</small></span></button>`).join('');
 const panels=document.createElement('div');panels.className='sp-body';
 const panel=(id,title,text)=>{const p=document.createElement('section');p.className='sp-panel';p.id='spPanel-'+id;p.dataset.tab=id;p.setAttribute('role','tabpanel');p.innerHTML=`<header class="sp-panel-head"><h3>${title}</h3><p>${text}</p></header>`;panels.appendChild(p);return p};
 const pc=panel('comandi','COMANDI DI TASTIERA E MOUSE','Ogni comando può avere due tasti. Il mouse punta la prua della nave e il fucile del pilota.');
 const pj=panel('joypad','JOYPAD','Collega un controller (Xbox, PlayStation o compatibile) via USB o Bluetooth e premi un suo tasto.');
 const pa=panel('audio','AUDIO','Volume degli effetti di bordo e della colonna sonora.');
 const pg=panel('gioco','GIOCO','Lingua, modalità di gioco e partita.');
 if(main)pc.appendChild(main);
 for(const p of[pj,pa]){const s=document.createElement('div');s.className='sp-stack';p.appendChild(s)}
 // GIOCO usa proprio .settings-side: i blocchi aggiunti dopo da altri script arrivano qui
 if(side){side.classList.add('sp-stack');pg.appendChild(side)}
 body.appendChild(nav);body.appendChild(panels);
 cols.replaceWith(body);
 impSort();
 for(const b of nav.querySelectorAll('.sp-tab')){
  b.onclick=()=>{impShow(b.dataset.tab);if(typeof sfx==='function')try{sfx('ui')}catch(e){}};
  b.onkeydown=e=>{const k={ArrowDown:1,ArrowRight:1,ArrowUp:-1,ArrowLeft:-1}[e.code];if(!k)return;e.preventDefault();e.stopPropagation();impStep(k);const a=nav.querySelector('.sp-tab.active');if(a)a.focus()};
 }
 impShow(impLoadTab()||'comandi',false);
 // apre sempre dall'ultima sezione scelta
 const s=$('settingsBtn');
 if(s){const o=s.onclick;s.onclick=function(){impSort();impShow(imp.tab,false);const r=o&&o.apply(this,arguments);const a=document.querySelector('#settingsOverlay .sp-tab.active');if(a&&a.focus)a.focus();return r}}
 if(typeof MutationObserver==='function')new MutationObserver(()=>impSort()).observe(card,{childList:true,subtree:true});
}
try{impBuild()}catch(e){}

if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["TORNA AL MENU","BACK TO MENU","RETOUR AU MENU","VOLVER AL MENÚ","В МЕНЮ","返回菜单","メニューに戻る"],
  ["Torna al menu","Back to menu","Retour au menu","Volver al menú","В меню","返回菜单","メニューに戻る"],
  ["COMANDI","CONTROLS","COMMANDES","CONTROLES","УПРАВЛЕНИЕ","操作","操作"],
  ["Tastiera e mouse","Keyboard and mouse","Clavier et souris","Teclado y ratón","Клавиатура и мышь","键盘和鼠标","キーボードとマウス"],
  ["JOYPAD","GAMEPAD","MANETTE","MANDO","ГЕЙМПАД","手柄","ゲームパッド"],
  ["Controller e tasti","Controller and buttons","Manette et boutons","Mando y botones","Контроллер и кнопки","手柄和按键","コントローラーとボタン"],
  ["AUDIO","AUDIO","AUDIO","AUDIO","ЗВУК","音频","オーディオ"],
  ["Effetti e musica","Effects and music","Effets et musique","Efectos y música","Эффекты и музыка","音效和音乐","効果音と音楽"],
  ["GIOCO","GAME","JEU","JUEGO","ИГРА","游戏","ゲーム"],
  ["Lingua, god mode, partita","Language, god mode, game","Langue, god mode, partie","Idioma, god mode, partida","Язык, god mode, партия","语言、上帝模式、游戏进度","言語、ゴッドモード、ゲーム"],
  ["Sezioni delle impostazioni","Settings sections","Sections des paramètres","Secciones de ajustes","Разделы настроек","设置分区","設定のセクション"],
  ["COMANDI DI TASTIERA E MOUSE","KEYBOARD AND MOUSE CONTROLS","COMMANDES CLAVIER ET SOURIS","CONTROLES DE TECLADO Y RATÓN","УПРАВЛЕНИЕ КЛАВИАТУРОЙ И МЫШЬЮ","键盘和鼠标操作","キーボードとマウスの操作"],
  ["Ogni comando può avere due tasti. Il mouse punta la prua della nave e il fucile del pilota.","Each command can have two keys. The mouse points the ship’s bow and the pilot’s rifle.","Chaque commande peut avoir deux touches. La souris oriente la proue du vaisseau et le fusil du pilote.","Cada comando puede tener dos teclas. El ratón apunta la proa de la nave y el fusil del piloto.","У каждой команды до двух клавиш. Мышь наводит нос корабля и оружие пилота.","每个命令可设两个按键。鼠标控制飞船船头和驾驶员的枪口方向。","各コマンドに2つまでキーを設定できます。マウスで船首とパイロットの銃を向けます。"],
  ["Collega un controller (Xbox, PlayStation o compatibile) via USB o Bluetooth e premi un suo tasto.","Connect a controller (Xbox, PlayStation or compatible) via USB or Bluetooth and press one of its buttons.","Branche une manette (Xbox, PlayStation ou compatible) en USB ou Bluetooth et appuie sur un de ses boutons.","Conecta un mando (Xbox, PlayStation o compatible) por USB o Bluetooth y pulsa uno de sus botones.","Подключи контроллер (Xbox, PlayStation или совместимый) по USB или Bluetooth и нажми любую его кнопку.","通过 USB 或蓝牙连接手柄（Xbox、PlayStation 或兼容手柄），然后按下任意按键。","コントローラー（Xbox、PlayStation または互換品）をUSBかBluetoothで接続し、いずれかのボタンを押してください。"],
  ["Volume degli effetti di bordo e della colonna sonora.","Volume of the on-board effects and the soundtrack.","Volume des effets de bord et de la bande-son.","Volumen de los efectos de a bordo y de la banda sonora.","Громкость бортовых эффектов и музыки.","机载音效和背景音乐的音量。","機内効果音とサウンドトラックの音量。"],
  ["Lingua, modalità di gioco e partita.","Language, game mode and saved game.","Langue, mode de jeu et partie.","Idioma, modo de juego y partida.","Язык, режим игры и партия.","语言、游戏模式和游戏进度。","言語、ゲームモード、ゲームの進行。"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function'){i18nBuild();if(typeof i18nApply==='function')i18nApply()}
}
