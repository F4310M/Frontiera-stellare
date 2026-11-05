// Conex — COMANDI PERSONALIZZABILI (2026-11-05).
// Nelle impostazioni ogni comando della tastiera si può cambiare: clic sul tasto, poi premi quello nuovo
// (Esc annulla, Canc o Backspace svuota). Ogni comando ha due tasti. I comandi del mouse restano fissi.
// Il gioco continua a leggere i tasti di sempre: questo file traduce il tasto premuto in quello originale
// prima che lo vedano gli altri script (ascolto in fase di cattura su window).
// Salvato in localStorage stellarComandi (anche nel backup del profilo). Va caricato per ultimo.

const CMD_KEY='stellarComandi';
// code: il tasto che il gioco conosce già. def: i due tasti predefiniti. mouse: comando del mouse fisso.
const CMD_ACTIONS=[
 {id:'up',code:'KeyW',def:['KeyW','ArrowUp'],name:'SU',desc:'Verso l’alto dello schermo · a terra: salto'},
 {id:'down',code:'KeyS',def:['KeyS','ArrowDown'],name:'GIÙ',desc:'Verso il basso dello schermo · a terra: abbassati'},
 {id:'left',code:'KeyA',def:['KeyA','ArrowLeft'],name:'SINISTRA',desc:'Verso sinistra, qualunque sia la prua'},
 {id:'right',code:'KeyD',def:['KeyD','ArrowRight'],name:'DESTRA',desc:'Verso destra, qualunque sia la prua'},
 {id:'fire',code:'Space',def:['Space',null],mouse:'CLIC',name:'FUOCO',desc:'Cannoni principali · a terra il tasto fa saltare'},
 {id:'missile',code:'KeyE',def:['KeyE','KeyG'],mouse:'ROTELLA',name:'MISSILE · GRANATA',desc:'Clic centrale · uno in volo · guidato se agganciato · a terra: granata'},
 {id:'special',code:'KeyQ',def:['KeyQ',null],name:'COLPO SPECIALE',desc:'Una volta per fase: trottola laser nello spazio, bombardamento a terra'},
 {id:'brake',code:'KeyF',def:['KeyF',null],name:'FRENO',desc:'Rallenta per conquistare l’orbita'},
 {id:'boost',code:'ShiftRight',def:['ShiftRight',null],name:'POST-BRUCIATORE',desc:'Si riattiva solo al 100%'},
 {id:'shield',code:null,def:[null,null],mouse:'MOUSE DX',name:'BARRIERA · SCUDO',desc:'Resta attiva negli urti, che consumano energia; capsule azzurre: +35%'},
 {id:'pause',code:'KeyP',def:['KeyP',null],mouse:'ESC',name:'PAUSA',desc:'Sospendi la missione'},
 {id:'music',code:'KeyM',def:['KeyM',null],name:'MUSICA',desc:'Accendi o spegni la colonna sonora'}
];
const CMD_FIXED=new Set(['Escape','F11','F12','F5']);
let cmdBind=cmdLoad(),cmdMap=new Map(),cmdDefaults=new Set(),cmdWait=null;
function cmdDefault(){const o={};for(const a of CMD_ACTIONS)o[a.id]=a.def.slice();return o}
function cmdLoad(){
 const d=cmdDefault();
 try{
  const s=JSON.parse(localStorage.getItem(CMD_KEY)||'null');
  if(s&&typeof s==='object')for(const a of CMD_ACTIONS){const v=s[a.id];if(Array.isArray(v))d[a.id]=[0,1].map(i=>typeof v[i]==='string'&&v[i]&&!CMD_FIXED.has(v[i])?v[i]:null)}
 }catch(e){}
 return d;
}
function cmdSave(){
 try{if(cmdIsDefault())localStorage.removeItem(CMD_KEY);else localStorage.setItem(CMD_KEY,JSON.stringify(cmdBind))}catch(e){}
 cmdIndex();
}
function cmdIsDefault(){const d=cmdDefault();return CMD_ACTIONS.every(a=>d[a.id][0]===cmdBind[a.id][0]&&d[a.id][1]===cmdBind[a.id][1])}
function cmdIndex(){
 cmdMap=new Map();cmdDefaults=new Set();
 for(const a of CMD_ACTIONS){for(const c of a.def)if(c)cmdDefaults.add(c);for(const c of cmdBind[a.id])if(c&&!cmdMap.has(c))cmdMap.set(c,a)}
}
cmdIndex();
// Assegna un tasto: se lo usava un altro comando, lì si libera.
function cmdSet(id,slot,code){
 if(code)for(const a of CMD_ACTIONS)for(let i=0;i<2;i++)if(cmdBind[a.id][i]===code)cmdBind[a.id][i]=null;
 cmdBind[id][slot]=code||null;cmdSave();
}
function cmdReset(){cmdBind=cmdDefault();cmdSave()}
// Tasto principale di un comando, per i suggerimenti a schermo.
function cmdLabelOf(id){const b=cmdBind[id]||[];return b[0]?cmdLabel(b[0]):b[1]?cmdLabel(b[1]):'—'}

// ---- nomi dei tasti
const CMD_NAMES={Space:'SPAZIO',ShiftRight:'SHIFT DX',ShiftLeft:'SHIFT SX',ControlLeft:'CTRL SX',ControlRight:'CTRL DX',AltLeft:'ALT',AltRight:'ALT GR',
 Enter:'INVIO',NumpadEnter:'INVIO NUM',Tab:'TAB',CapsLock:'BLOC MAIUSC',Backquote:'\\',Minus:"'",Equal:'Ì',BracketLeft:'È',BracketRight:'+',
 Semicolon:'Ò',Quote:'À',Backslash:'Ù',Comma:',',Period:'.',Slash:'-',IntlBackslash:'<',Insert:'INS',Home:'HOME',End:'FINE',PageUp:'PAG SU',PageDown:'PAG GIÙ',
 MetaLeft:'WIN',MetaRight:'WIN',ContextMenu:'MENU',NumpadAdd:'NUM +',NumpadSubtract:'NUM -',NumpadMultiply:'NUM *',NumpadDivide:'NUM /',NumpadDecimal:'NUM .'};
const CMD_ARROWS={ArrowUp:'arrow-up',ArrowDown:'arrow-down',ArrowLeft:'arrow-left',ArrowRight:'arrow-right'};
function cmdLabel(code){
 if(!code)return '';
 if(CMD_NAMES[code])return CMD_NAMES[code];
 let m=/^Key([A-Z])$/.exec(code);if(m)return m[1];
 m=/^Digit(\d)$/.exec(code);if(m)return m[1];
 m=/^Numpad(\d)$/.exec(code);if(m)return 'NUM '+m[1];
 if(/^F\d+$/.test(code))return code;
 if(CMD_ARROWS[code])return({ArrowUp:'FRECCIA SU',ArrowDown:'FRECCIA GIÙ',ArrowLeft:'FRECCIA SINISTRA',ArrowRight:'FRECCIA DESTRA'})[code];
 return code.toUpperCase();
}
function cmdKeyHtml(code){
 if(CMD_ARROWS[code]&&typeof ico==='function')return ico(CMD_ARROWS[code]);
 return String(cmdLabel(code)).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

// ---- traduzione dei tasti premuti
function cmdTyping(t){return!!t&&(t.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(t.nodeName||''))}
function cmdInGame(){return typeof state!=='undefined'&&(state==='play'||state==='platform')}
function cmdShield(on){
 if(typeof mouse==='undefined')return;
 if(on&&(!cmdInGame()||(typeof paused!=='undefined'&&paused)))return;
 mouse.right=on;
}
function cmdFilter(e){
 if(!e.isTrusted||cmdWait||cmdTyping(e.target)||CMD_FIXED.has(e.code))return;
 const a=cmdMap.get(e.code);
 if(!a){
  // tasto predefinito che ora non fa più nulla (spostato su un altro tasto)
  if(cmdDefaults.has(e.code)){e.stopImmediatePropagation();if(cmdInGame())e.preventDefault()}
  return;
 }
 if(cmdInGame()||e.code==='Space'||CMD_ARROWS[e.code])e.preventDefault();
 if(a.id==='shield'){e.stopImmediatePropagation();if(!e.repeat)cmdShield(e.type==='keydown');return}
 if(a.code===e.code||a.def.includes(e.code))return;   // tasto originale del comando: passa così com'è
 e.stopImmediatePropagation();
 let ev;
 try{ev=new KeyboardEvent(e.type,{code:a.code,key:e.key,repeat:e.repeat,bubbles:true,cancelable:true})}catch(x){return}
 (e.target&&e.target.dispatchEvent?e.target:window).dispatchEvent(ev);
}
if(typeof addEventListener==='function'){
 addEventListener('keydown',cmdFilter,true);
 addEventListener('keyup',cmdFilter,true);
 addEventListener('blur',()=>{if(typeof mouse!=='undefined'&&cmdBind.shield.some(Boolean))mouse.right=false});
 // Il tasto E (o quello scelto) lancia il missile anche nello spazio, come il clic centrale.
 addEventListener('keydown',e=>{if(e.code==='KeyE'&&!e.repeat&&typeof state!=='undefined'&&state==='play'&&!paused&&typeof launchMissile==='function')launchMissile()});
}

// ---- impostazioni: griglia dei comandi
function cmdRender(){
 const grid=typeof document!=='undefined'&&document.querySelector?document.querySelector('#settingsOverlay .control-grid'):null;if(!grid)return;
 grid.classList.add('cmd-grid');
 grid.innerHTML=CMD_ACTIONS.map(a=>{
  const keys=[0,1].map(i=>{
   const c=cmdBind[a.id][i],w=cmdWait&&cmdWait.id===a.id&&cmdWait.slot===i;
   return `<button type="button" class="cmd-key${c?'':' empty'}${w?' wait':''}" data-id="${a.id}" data-slot="${i}" aria-label="Cambia tasto: ${a.name}">${w?'PREMI UN TASTO':c?cmdKeyHtml(c):'+'}</button>`;
  }).join('');
  return `<div class="cmd-row" data-id="${a.id}"><span>${a.mouse?'<kbd class="cmd-fixed">'+a.mouse+'</kbd>':''}${keys}</span><b>${a.name}</b><small>${a.desc}</small></div>`;
 }).join('');
 for(const b of grid.querySelectorAll('.cmd-key'))b.onclick=ev=>{ev.preventDefault();cmdWait={id:b.dataset.id,slot:+b.dataset.slot};cmdRender()};
 const r=$('cmdReset');if(r)r.disabled=cmdIsDefault();
}
// Attesa del nuovo tasto: prende il primo tasto premuto prima di tutti gli altri script.
function cmdCatch(e){
 if(!cmdWait)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(e.type!=='keydown')return;
 const w=cmdWait;cmdWait=null;
 if(e.code==='Escape'){cmdRender();return}
 if(e.code==='Backspace'||e.code==='Delete'){cmdSet(w.id,w.slot,null);cmdRender();return}
 if(CMD_FIXED.has(e.code)||!e.code){cmdRender();return}
 cmdSet(w.id,w.slot,e.code);cmdRender();
 if(typeof sfx==='function')try{sfx('ui')}catch(x){}
}
function cmdBuild(){
 if(typeof document==='undefined'||!document.querySelector||!document.createElement)return;
 addEventListener('keydown',cmdCatch,true);addEventListener('keyup',cmdCatch,true);
 // clic fuori dal tasto: annulla l'attesa
 addEventListener('pointerdown',e=>{if(cmdWait&&!(e.target&&e.target.closest&&e.target.closest('.cmd-key'))){cmdWait=null;cmdRender()}},true);
 const main=document.querySelector('#settingsOverlay .settings-main');
 if(main){
  const t=main.querySelector('.setting-title');
  if(t&&!$('cmdReset')){
   const b=document.createElement('button');b.id='cmdReset';b.type='button';b.className='cmd-reset';b.textContent='RIPRISTINA PREDEFINITI';
   b.onclick=()=>{cmdWait=null;cmdReset();cmdRender()};t.appendChild(b);
  }
  const p=main.querySelector('p');
  if(p&&!$('cmdHint')){const h=document.createElement('p');h.id='cmdHint';h.className='cmd-hint';h.textContent='Clicca su un tasto per cambiarlo, poi premi quello nuovo. Esc annulla, Canc lo toglie. Ogni comando può avere due tasti.';p.after(h)}
 }
 cmdRender();
 const s=$('settingsBtn');if(s){const o=s.onclick;s.onclick=function(){cmdWait=null;cmdRender();return o&&o.apply(this,arguments)}}
 for(const id of['closeSettings','closeSettingsX']){const b=$(id);if(b){const o=b.onclick;b.onclick=function(){cmdWait=null;cmdRender();return o&&o.apply(this,arguments)}}}
}
cmdBuild();

// ---- backup del profilo: anche i comandi
if(typeof PROF_SETTINGS!=='undefined'&&Array.isArray(PROF_SETTINGS)&&!PROF_SETTINGS.includes(CMD_KEY))PROF_SETTINGS.push(CMD_KEY);

// ---- traduzioni
if(typeof I18N_ROWS!=='undefined'){
 const rows=[
  ["RIPRISTINA PREDEFINITI","RESTORE DEFAULTS","RÉTABLIR PAR DÉFAUT","RESTABLECER PREDETERMINADOS","СБРОСИТЬ ПО УМОЛЧАНИЮ","恢复默认","初期設定に戻す"],
  ["Clicca su un tasto per cambiarlo, poi premi quello nuovo. Esc annulla, Canc lo toglie. Ogni comando può avere due tasti.","Click a key to change it, then press the new one. Esc cancels, Delete clears it. Each command can have two keys.","Clique sur une touche pour la changer, puis appuie sur la nouvelle. Échap annule, Suppr l’efface. Chaque commande peut avoir deux touches.","Haz clic en una tecla para cambiarla y pulsa la nueva. Esc cancela, Supr la borra. Cada comando puede tener dos teclas.","Нажми на клавишу, чтобы сменить её, затем нажми новую. Esc — отмена, Delete — очистить. У каждой команды до двух клавиш.","点击按键进行更改，然后按下新键。Esc 取消，Delete 清除。每个命令可设两个按键。","キーをクリックして新しいキーを押すと変更できます。Escで取消、Deleteで解除。各コマンドに2つまで設定できます。"],
  ["PREMI UN TASTO","PRESS A KEY","APPUIE SUR UNE TOUCHE","PULSA UNA TECLA","НАЖМИ КЛАВИШУ","按下按键","キーを押す"],
  ["Cambia tasto: ","Change key: ","Changer la touche : ","Cambiar tecla: ","Сменить клавишу: ","更改按键：","キー変更："],
  ["MISSILE · GRANATA","MISSILE · GRENADE","MISSILE · GRENADE","MISIL · GRANADA","РАКЕТА · ГРАНАТА","导弹 · 手雷","ミサイル · グレネード"],
  ["BARRIERA · SCUDO","BARRIER · SHIELD","BARRIÈRE · BOUCLIER","BARRERA · ESCUDO","БАРЬЕР · ЩИТ","屏障 · 护盾","バリア · シールド"],
  ["MUSICA","MUSIC","MUSIQUE","MÚSICA","МУЗЫКА","音乐","音楽"],
  ["Verso l’alto dello schermo · a terra: salto","Toward the top of the screen · on the ground: jump","Vers le haut de l’écran · au sol : saut","Hacia arriba de la pantalla · en tierra: salto","К верху экрана · на земле: прыжок","向屏幕上方 · 地面：跳跃","画面の上へ · 地上：ジャンプ"],
  ["Verso il basso dello schermo · a terra: abbassati","Toward the bottom of the screen · on the ground: crouch","Vers le bas de l’écran · au sol : s’accroupir","Hacia abajo de la pantalla · en tierra: agacharse","К низу экрана · на земле: пригнуться","向屏幕下方 · 地面：蹲下","画面の下へ · 地上：しゃがむ"],
  ["Cannoni principali · a terra il tasto fa saltare","Main cannons · on the ground the key jumps","Canons principaux · au sol la touche fait sauter","Cañones principales · en tierra la tecla salta","Основные пушки · на земле клавиша — прыжок","主炮 · 地面上该键为跳跃","主砲 · 地上ではジャンプ"],
  ["Clic centrale · uno in volo · guidato se agganciato · a terra: granata","Middle click · one in flight · homing if locked · on the ground: grenade","Clic central · un en vol · guidé si verrouillé · au sol : grenade","Clic central · uno en vuelo · guiado si está fijado · en tierra: granada","Средний клик · одна в полёте · самонаведение при захвате · на земле: граната","中键 · 同时一枚 · 锁定后追踪 · 地面：手雷","中クリック · 同時に1発 · ロック時は誘導 · 地上：グレネード"],
  ["Una volta per fase: trottola laser nello spazio, bombardamento a terra","Once per phase: laser spin in space, airstrike on the ground","Une fois par phase : toupie laser dans l’espace, bombardement au sol","Una vez por fase: peonza láser en el espacio, bombardeo en tierra","Раз за фазу: лазерный волчок в космосе, бомбардировка на земле","每阶段一次：太空中激光旋风，地面上空袭","各フェーズ1回：宇宙ではレーザースピン、地上では爆撃"],
  ["Accendi o spegni la colonna sonora","Turn the soundtrack on or off","Active ou coupe la bande-son","Activa o desactiva la banda sonora","Включить или выключить музыку","开关背景音乐","サウンドトラックのオン・オフ"],
  ["FRECCIA SU","UP ARROW","FLÈCHE HAUT","FLECHA ARRIBA","СТРЕЛКА ВВЕРХ","上箭头","上矢印"],
  ["FRECCIA GIÙ","DOWN ARROW","FLÈCHE BAS","FLECHA ABAJO","СТРЕЛКА ВНИЗ","下箭头","下矢印"],
  ["FRECCIA SINISTRA","LEFT ARROW","FLÈCHE GAUCHE","FLECHA IZQUIERDA","СТРЕЛКА ВЛЕВО","左箭头","左矢印"],
  ["FRECCIA DESTRA","RIGHT ARROW","FLÈCHE DROITE","FLECHA DERECHA","СТРЕЛКА ВПРАВО","右箭头","右矢印"],
  ["SHIFT SX","LEFT SHIFT","MAJ GAUCHE","SHIFT IZQ","ЛЕВЫЙ SHIFT","左 SHIFT","左SHIFT"],
  ["CTRL SX","LEFT CTRL","CTRL GAUCHE","CTRL IZQ","ЛЕВЫЙ CTRL","左 CTRL","左CTRL"],
  ["CTRL DX","RIGHT CTRL","CTRL DROIT","CTRL DER","ПРАВЫЙ CTRL","右 CTRL","右CTRL"],
  ["BLOC MAIUSC","CAPS LOCK","VERR MAJ","BLOQ MAYÚS","CAPS LOCK","大写锁定","CAPS LOCK"],
  ["INVIO NUM","NUM ENTER","ENTRÉE NUM","INTRO NUM","NUM ENTER","小键盘回车","テンキーENTER"],
  ["INVIO","ENTER","ENTRÉE","INTRO","ENTER","回车","ENTER"],
  ["PAG GIÙ","PAGE DOWN","PAGE BAS","AV PÁG","PAGE DOWN","下翻页","PAGE DOWN"],
  ["PAG SU","PAGE UP","PAGE HAUT","RE PÁG","PAGE UP","上翻页","PAGE UP"]
 ];
 for(const r of rows)if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function'){i18nBuild();if(typeof i18nApply==='function')i18nApply()}
}
