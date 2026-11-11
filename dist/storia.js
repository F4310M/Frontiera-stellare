// Conex — LA STORIA DI CONEX (2026-11-10): introduzione cinematografica in stile fantascienza anni '80.
// 1) Subito dopo aver creato il pilota compare la scelta STORIA / VAI AL GIOCO (solo quella volta).
// 2) Nella home, accanto a ESCI DAL GIOCO, il pulsante STORIA la fa rivedere quando vuoi.
// La scena: frase d'apertura, marchio CONEX che si allontana, testo che scorre in prospettiva
// sopra un cielo stellato, frase finale. Musica "Last Light From The Cockpit" e voce narrante del browser
// (Web Speech API) nella lingua del gioco; il testo segue il ritmo della voce. Se il browser non
// ha una voce per quella lingua, o se la voce è spenta (tasto VOCE), il testo scorre a tempo di lettura.
// Prestazioni: stelle, nebulosa e pianeta sono disegnati una volta sola su canvas di appoggio;
// a ogni fotogramma solo drawImage e un transform CSS sul testo (niente filter o shadowBlur).

const STORIA={on:false,tok:0,fase:'',voce:false,parla:false,raf:0,ratio:1,cr:null,bg:null,last:0,y:0,yT:0};
const STORIA_VOCE_KEY='stellarStoriaVoce';
// Voce narrante spenta per default (richiesta di Fabio 10/11): si accende con il tasto VOCE.
try{STORIA.voce=localStorage.getItem(STORIA_VOCE_KEY)==='on'}catch(e){STORIA.voce=false}

// Testo di Fabio "La Caduta e l’Ascesa di CONEX" (10/11/2026); le traduzioni stanno in I18N_ROWS come frasi intere.
// Indici: 0 apertura, 1 titolo, 2–5 testo che scorre, 6 frase finale.
const STORIA_TESTO=[
 ["Molto tempo fa, l’universo era un luogo oscuro e pericoloso.", "Long ago, the universe was a dark and dangerous place.", "Il y a très longtemps, l’univers était un lieu sombre et dangereux.", "Hace mucho tiempo, el universo era un lugar oscuro y peligroso.", "Давным-давно вселенная была тёмным и опасным местом.", "很久很久以前，宇宙是一个黑暗而危险的地方。", "遥か昔、宇宙は暗く危険な場所だった。"],
 ["La Caduta e l’Ascesa di CONEX", "The Fall and Rise of CONEX", "La Chute et l’Ascension de CONEX", "La Caída y el Ascenso de CONEX", "Падение и возвышение CONEX", "CONEX 的陨落与崛起", "CONEXの没落と再起"],
 ["Le civiltà combattevano senza sosta: alcune per difendersi, altre per sottomettere i mondi più deboli. Fino a quando i popoli vessati decisero di unire le forze e fondare CONEX, una squadra d’élite composta dai più grandi guerrieri della galassia. Grazie al loro intervento la pace e la stabilità furono ristabilite, dando vita alla gloriosa Repubblica Galattica.", "Civilizations fought without end: some to defend themselves, others to subjugate weaker worlds. Until the oppressed peoples decided to join forces and founded CONEX, an elite squad made up of the greatest warriors in the galaxy. Thanks to them, peace and stability were restored, giving birth to the glorious Galactic Republic.", "Les civilisations se battaient sans relâche : certaines pour se défendre, d’autres pour asservir les mondes plus faibles. Jusqu’au jour où les peuples opprimés décidèrent d’unir leurs forces et fondèrent CONEX, une escouade d’élite composée des plus grands guerriers de la galaxie. Grâce à leur intervention, la paix et la stabilité furent rétablies, donnant naissance à la glorieuse République galactique.", "Las civilizaciones luchaban sin descanso: algunas para defenderse, otras para someter a los mundos más débiles. Hasta que los pueblos oprimidos decidieron unir sus fuerzas y fundar CONEX, un escuadrón de élite formado por los mayores guerreros de la galaxia. Gracias a su intervención se restablecieron la paz y la estabilidad, y nació la gloriosa República Galáctica.", "Цивилизации воевали без конца: одни — чтобы защитить себя, другие — чтобы покорить более слабые миры. Пока угнетённые народы не решили объединить силы и создать CONEX — элитный отряд из величайших воинов галактики. Благодаря им мир и порядок были восстановлены, и родилась славная Галактическая Республика.", "各个文明战火不断：有的为了自保，有的为了征服更弱小的世界。直到饱受压迫的人民决定联合起来，创立了 CONEX——一支由银河系最伟大的战士组成的精英小队。在他们的努力下，和平与稳定得以恢复，光荣的银河共和国由此诞生。", "文明同士は絶え間なく戦い続けた。ある者は身を守るために、ある者は弱い世界を支配するために。やがて虐げられた人々は力を合わせ、銀河最強の戦士たちからなる精鋭部隊CONEXを創設した。彼らの活躍によって平和と秩序が取り戻され、栄光ある銀河共和国が誕生した。"],
 ["La pace durò a lungo, ma nell’ombra la minaccia covava ancora. Alcuni senatori della Repubblica — discendenti diretti delle antiche fazioni conquistatrici — tramavano in segreto. Progettarono armi robotiche di distruzione di massa, concepite unicamente per la sottomissione, e le scagliarono di sorpresa contro il quartier generale dei CONEX, polverizzandolo.", "Peace lasted a long time, but in the shadows the threat still smoldered. Some senators of the Republic — direct descendants of the ancient conquering factions — were plotting in secret. They designed robotic weapons of mass destruction, built for one purpose only: subjugation. Then they unleashed them in a surprise attack on the CONEX headquarters, pulverizing it.", "La paix dura longtemps, mais dans l’ombre la menace couvait encore. Certains sénateurs de la République — descendants directs des anciennes factions conquérantes — complotaient en secret. Ils conçurent des armes robotiques de destruction massive, créées dans le seul but d’asservir, et les lancèrent par surprise contre le quartier général de CONEX, qui fut pulvérisé.", "La paz duró mucho tiempo, pero en la sombra la amenaza seguía latente. Algunos senadores de la República —descendientes directos de las antiguas facciones conquistadoras— conspiraban en secreto. Diseñaron armas robóticas de destrucción masiva, creadas solo para someter, y las lanzaron por sorpresa contra el cuartel general de CONEX, pulverizándolo.", "Мир длился долго, но в тени угроза всё ещё тлела. Некоторые сенаторы Республики — прямые потомки древних фракций завоевателей — тайно плели заговор. Они создали роботизированное оружие массового уничтожения, предназначенное лишь для порабощения, и внезапно обрушили его на штаб CONEX, стерев его в пыль.", "和平延续了很久，但威胁仍在暗处酝酿。共和国的一些参议员——古代征服派系的直系后裔——在秘密策划阴谋。他们设计出专为奴役而生的机器人大规模杀伤性武器，并突然袭击了 CONEX 总部，将其夷为平地。", "平和は長く続いた。だが影の中では、脅威がなおくすぶっていた。かつての征服者たちの直系の子孫である一部の元老院議員が、密かに陰謀を企てていたのだ。彼らは支配のためだけに作られたロボット大量破壊兵器を開発し、CONEXの本部に奇襲を仕掛けて跡形もなく破壊した。"],
 ["Eliminato l’unico vero ostacolo al loro potere, i senatori attuarono un colpo di stato: la Repubblica si trasformò in un Impero tirannico. I pianeti liberi furono ridotti in catene, e su ognuno di essi l’Impero schierò la stessa arma robotica che aveva distrutto i CONEX, usandola per tenere in ostaggio intere popolazioni.", "With the only real obstacle to their power gone, the senators staged a coup: the Republic became a tyrannical Empire. The free planets were put in chains, and on each of them the Empire deployed the same robotic weapon that had destroyed CONEX, using it to hold entire populations hostage.", "Le seul véritable obstacle à leur pouvoir éliminé, les sénateurs firent un coup d’État : la République devint un Empire tyrannique. Les planètes libres furent enchaînées, et sur chacune d’elles l’Empire déploya la même arme robotique qui avait détruit CONEX, pour tenir en otage des populations entières.", "Eliminado el único obstáculo real para su poder, los senadores dieron un golpe de Estado: la República se convirtió en un Imperio tiránico. Los planetas libres fueron encadenados, y en cada uno de ellos el Imperio desplegó la misma arma robótica que había destruido a CONEX, para mantener como rehenes a poblaciones enteras.", "Устранив единственное настоящее препятствие на пути к власти, сенаторы совершили переворот: Республика превратилась в тираническую Империю. Свободные планеты были закованы в цепи, и на каждой из них Империя разместила то самое роботизированное оружие, что уничтожило CONEX, держа в заложниках целые народы.", "除掉了通往权力的唯一真正障碍后，参议员们发动政变：共和国沦为暴虐的帝国。自由的星球被套上枷锁，帝国在每一颗星球上都部署了当初摧毁 CONEX 的同一种机器人武器，以此将整个星球的人民扣为人质。", "権力への唯一の障害を取り除いた議員たちはクーデターを起こし、共和国は暴虐な帝国へと姿を変えた。自由な惑星は鎖につながれ、帝国はCONEXを滅ぼしたのと同じロボット兵器をすべての惑星に配備し、住民全体を人質に取った。"],
 ["Ma l’Impero non era a conoscenza di un dettaglio fatale: una piccola squadra di CONEX era sopravvissuta. Quel giorno, infatti, i guerrieri si trovavano lontani dal quartier generale, impegnati in una pericolosa missione di soccorso.", "But the Empire was unaware of one fatal detail: a small CONEX squad had survived. That day, the warriors were far from headquarters, on a dangerous rescue mission.", "Mais l’Empire ignorait un détail fatal : une petite escouade de CONEX avait survécu. Ce jour-là, ses guerriers étaient loin du quartier général, en pleine mission de sauvetage périlleuse.", "Pero el Imperio desconocía un detalle fatal: un pequeño escuadrón de CONEX había sobrevivido. Aquel día, sus guerreros estaban lejos del cuartel general, en una peligrosa misión de rescate.", "Но Империя не знала об одной роковой детали: небольшой отряд CONEX выжил. В тот день его воины были далеко от штаба, на опасной спасательной миссии.", "然而帝国并不知道一个致命的细节：一支 CONEX 小队幸存了下来。那一天，这些战士远离总部，正在执行一项危险的救援任务。", "しかし帝国は、ひとつの致命的な事実を知らなかった。CONEXの小部隊が生き残っていたのだ。その日、戦士たちは本部から遠く離れ、危険な救出任務に就いていた。"],
 ["Ora, i pochi CONEX rimasti sono l’ultima speranza della galassia: pronti a combattere, a distruggere le macchine di distruzione imperiali e a restituire la libertà a tutti i mondi colonizzati.", "Now the last few CONEX are the galaxy’s final hope: ready to fight, to destroy the Empire’s machines of destruction and to give freedom back to every colonized world.", "Aujourd’hui, les derniers CONEX sont l’ultime espoir de la galaxie : prêts à combattre, à détruire les machines de destruction impériales et à rendre la liberté à tous les mondes colonisés.", "Ahora, los pocos CONEX que quedan son la última esperanza de la galaxia: listos para luchar, destruir las máquinas de destrucción imperiales y devolver la libertad a todos los mundos colonizados.", "Теперь последние CONEX — последняя надежда галактики: они готовы сражаться, уничтожить имперские машины разрушения и вернуть свободу всем колонизированным мирам.", "如今，仅存的 CONEX 成员是银河系最后的希望：他们准备投入战斗，摧毁帝国的毁灭机器，让所有殖民世界重获自由。", "今、残されたわずかなCONEXこそが銀河最後の希望だ。彼らは戦う覚悟を決めた。帝国の破壊兵器を打ち砕き、すべての植民世界に自由を取り戻すために。"]
];
const STORIA_UI=[
 ["LA STORIA DI CONEX","THE STORY OF CONEX","L’HISTOIRE DE CONEX","LA HISTORIA DE CONEX","ИСТОРИЯ CONEX","CONEX 的故事","CONEXの物語"],
 ["STORIA","STORY","HISTOIRE","HISTORIA","ИСТОРИЯ","故事","ストーリー"],
 ["VAI AL GIOCO","GO TO THE GAME","ALLER AU JEU","IR AL JUEGO","К ИГРЕ","进入游戏","ゲームへ"],
 ["BENVENUTO, PILOTA","WELCOME, PILOT","BIENVENUE, PILOTE","BIENVENIDO, PILOTO","ДОБРО ПОЖАЛОВАТЬ, ПИЛОТ","欢迎你，飞行员","ようこそ、パイロット"],
 ["Prima di partire, vuoi conoscere la storia di Conex?","Before you set off, do you want to hear the story of Conex?","Avant de partir, veux-tu découvrir l’histoire de Conex ?","Antes de partir, ¿quieres conocer la historia de Conex?","Перед вылетом хочешь узнать историю Conex?","出发之前，想了解 Conex 的故事吗？","出撃の前に、Conexの物語を聞きますか？"],
 ["Potrai rivederla quando vuoi con il pulsante STORIA nella home.","You can watch it again anytime with the STORY button on the home screen.","Tu pourras la revoir à tout moment avec le bouton HISTOIRE de l’accueil.","Podrás volver a verla cuando quieras con el botón HISTORIA de la pantalla principal.","Её можно пересмотреть в любой момент кнопкой ИСТОРИЯ на главном экране.","之后随时可以通过主页的“故事”按钮重新观看。","ホーム画面の「ストーリー」ボタンからいつでも見直せます。"],
 ["SALTA","SKIP","PASSER","SALTAR","ПРОПУСТИТЬ","跳过","スキップ"],
 ["VOCE","VOICE","VOIX","VOZ","ГОЛОС","语音","ナレーション"],
 ["Voce narrante","Narrator voice","Voix du narrateur","Voz del narrador","Голос рассказчика","旁白语音","ナレーション音声"],
 ["RIVEDI LA STORIA","WATCH IT AGAIN","REVOIR L’HISTOIRE","VER DE NUEVO","ПОСМОТРЕТЬ СНОВА","重新观看","もう一度見る"]
];
if(typeof I18N_ROWS!=='undefined'){
 for(const r of [...STORIA_TESTO,...STORIA_UI])if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}

if(typeof ICONS!=='undefined'){
 if(!ICONS.book)ICONS.book='<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h7M9 11.5h5"/>';
 if(!ICONS.voice)ICONS.voice='<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.3 5.8a9 9 0 0 1 0 12.4"/>';
 if(!ICONS.mute)ICONS.mute='<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>';
 if(!ICONS.skip)ICONS.skip='<path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>';
}

const stTr=s=>typeof tr==='function'?tr(s):s;
const stLang=()=>typeof lang==='string'?lang:'it';
const stIco=n=>typeof ico==='function'?ico(n):'';
const stNow=()=>typeof performance!=='undefined'&&performance.now?performance.now():Date.now();
const stSleep=ms=>new Promise(r=>setTimeout(r,ms));

// ---- voce narrante (Web Speech API del browser)
const ST_TAG={it:'it-IT',en:'en-US',fr:'fr-FR',es:'es-ES',ru:'ru-RU',zh:'zh-CN',ja:'ja-JP'};
// Nomi di voci maschili profonde, adatte a un narratore (Windows/Edge, Chrome, macOS).
const ST_NARRATORI=/diego|giuseppe|cosimo|benigno|guy|davis|christopher|eric|roger|ryan|thomas|uk english male|daniel|henri|remy|claude|alvaro|jorge|pablo|dmitry|pavel|yunxi|yunyang|kangkang|keita|ichiro|otoya|male/i;
function stSynth(){return typeof window!=='undefined'&&window.speechSynthesis&&typeof SpeechSynthesisUtterance!=='undefined'?window.speechSynthesis:null}
function stVoce(l){
 const s=stSynth();if(!s)return null;
 const tag=ST_TAG[l]||'en-US',base=tag.slice(0,2);
 const vs=(s.getVoices()||[]).filter(v=>v&&v.lang&&v.lang.replace('_','-').toLowerCase().startsWith(base));
 if(!vs.length)return null;
 const score=v=>(/natural|online|neural/i.test(v.name)?6:0)+(ST_NARRATORI.test(v.name)?3:0)+(/google/i.test(v.name)?2:0)+(v.lang.replace('_','-').toLowerCase()===tag.toLowerCase()?1:0);
 return vs.sort((a,b)=>score(b)-score(a))[0];
}
function stVoceOk(){return !!stVoce(stLang())}
// Le frasi lunghe si leggono a pezzi: Chrome a volte interrompe le voci dopo 15 secondi.
function stPezzi(t){return (t.match(/[^.!?:;。！？：；]+[.!?:;。！？：；…]*/g)||[t]).map(x=>x.trim()).filter(Boolean)}
// Tempo stimato di una frase: lettere al secondo diverse per cinese e giapponese.
function stStima(t,voce){
 const l=stLang(),cps=l==='zh'?(voce?4.6:6):l==='ja'?(voce?6.5:8):(voce?13.5:16);
 return Math.max(voce?1800:3600,t.length/cps*1000*(voce?STORIA.ratio:1)+(voce?0:1200));
}
// Pronuncia la frase n; si risolve quando ha finito (o, senza voce, dopo il tempo di lettura).
function stDi(n,tok){
 const testo=stTr(STORIA_TESTO[n][0]),s=stSynth(),v=STORIA.voce?stVoce(stLang()):null,t0=stNow();
 const est=stStima(testo,!!v);
 STORIA.cur={n,t0,est};
 return new Promise(res=>{
  let fatto=false;const fine=()=>{if(fatto)return;fatto=true;STORIA.parla=false;clearTimeout(w);clearInterval(sw);res()};
  // senza voce (o voce spenta a metà frase): aspetta il tempo di lettura che resta
  const aTempo=()=>{clearTimeout(w);w=setTimeout(fine,Math.max(400,est-(stNow()-t0)))};
  let w=0,sw=0;
  STORIA.salta=()=>{try{s&&s.cancel()}catch(e){}fine()};
  STORIA.zitto=()=>{STORIA.parla=false;try{s&&s.cancel()}catch(e){}if(!fatto)aTempo()};
  if(!v){aTempo();return}
  const pezzi=stPezzi(testo);let i=0;
  const dici=()=>{
   if(tok!==STORIA.tok||!STORIA.voce)return;
   if(i>=pezzi.length){
    // la voce misura il ritmo vero: le frasi dopo scorrono alla sua velocità
    const r=(stNow()-t0)/Math.max(1,stStima(testo,true)/STORIA.ratio);STORIA.ratio=Math.max(.6,Math.min(1.8,r));
    return fine();
   }
   const u=new SpeechSynthesisUtterance(pezzi[i++]);
   u.voice=v;u.lang=v.lang;u.rate=.94;u.pitch=.88;u.volume=1;
   u.onend=()=>setTimeout(dici,120);u.onerror=()=>{if(!fatto&&STORIA.parla){STORIA.parla=false;aTempo()}};
   STORIA.parla=true;s.speak(u);
  };
  try{s.cancel()}catch(e){}
  // se la voce si blocca, il racconto va avanti lo stesso
  w=setTimeout(()=>{try{s.cancel()}catch(e){}fine()},est*2.6+5000);
  // Chrome: una voce in pausa per troppo tempo va "svegliata"
  sw=setInterval(()=>{try{if(s.paused)s.resume()}catch(e){}},2000);
  dici();
 });
}

// ---- cielo stellato pre-disegnato
function stRnd(seed){let x=seed>>>0||1;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}}
function stLayer(w,h,n,rmin,rmax,amin,seed,col){
 const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');if(!g)return c;
 const R=stRnd(seed);
 for(let i=0;i<n;i++){
  const r=rmin+R()*(rmax-rmin),a=amin+R()*(1-amin);
  g.globalAlpha=a;g.fillStyle=R()<.12?col:'#ffffff';
  g.beginPath();g.arc(R()*w,R()*h,r,0,Math.PI*2);g.fill();
 }
 g.globalAlpha=1;return c;
}
function stSfondo(w,h){
 const d=Math.min(1.25,(typeof devicePixelRatio==='number'?devicePixelRatio:1)||1),W=Math.round(w*d),H=Math.round(h*d);
 const base=document.createElement('canvas');base.width=W;base.height=H;const g=base.getContext('2d');
 if(g){
  g.fillStyle='#010309';g.fillRect(0,0,W,H);
  // nebulose: due chiazze morbide, fredde, disegnate una volta
  for(const [x,y,r,c] of [[.18,.28,.55,'rgba(40,90,170,.16)'],[.82,.7,.6,'rgba(120,40,110,.12)'],[.55,.12,.35,'rgba(30,140,160,.08)']]){
   const gr=g.createRadialGradient(x*W,y*H,0,x*W,y*H,r*Math.max(W,H));gr.addColorStop(0,c);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
  }
 }
 // pianeta scuro con il bordo illuminato, in basso a destra
 const P=Math.round(Math.min(W,H)*.9),pl=document.createElement('canvas');pl.width=P;pl.height=P;const p=pl.getContext('2d');
 if(p){
  const r=P*.42,cx=P/2,cy=P/2;
  const halo=p.createRadialGradient(cx,cy,r*.9,cx,cy,r*1.18);halo.addColorStop(0,'rgba(80,200,255,.22)');halo.addColorStop(1,'rgba(80,200,255,0)');
  p.fillStyle=halo;p.fillRect(0,0,P,P);
  const body=p.createRadialGradient(cx-r*.45,cy-r*.5,r*.1,cx,cy,r);body.addColorStop(0,'#1b3346');body.addColorStop(.55,'#0a1420');body.addColorStop(1,'#03070c');
  p.fillStyle=body;p.beginPath();p.arc(cx,cy,r,0,Math.PI*2);p.fill();
  p.save();p.beginPath();p.arc(cx,cy,r,0,Math.PI*2);p.clip();
  const R=stRnd(77);p.globalAlpha=.10;
  for(let i=0;i<26;i++){p.fillStyle=R()<.5?'#2c5d78':'#0c1b28';p.beginPath();p.ellipse(cx+(R()-.5)*r*2,cy+(R()-.5)*r*2,r*(.2+R()*.5),r*(.03+R()*.06),-.25,0,Math.PI*2);p.fill()}
  p.globalAlpha=1;
  const night=p.createRadialGradient(cx+r*.55,cy+r*.6,r*.2,cx+r*.3,cy+r*.35,r*1.25);night.addColorStop(0,'rgba(1,3,9,.95)');night.addColorStop(1,'rgba(1,3,9,0)');
  p.fillStyle=night;p.fillRect(0,0,P,P);p.restore();
  p.strokeStyle='rgba(120,220,255,.55)';p.lineWidth=Math.max(1,P*.004);p.beginPath();p.arc(cx,cy,r-p.lineWidth/2,Math.PI*.95,Math.PI*1.6);p.stroke();
 }
 return{W,H,d,base,pl,
  far:stLayer(W,H,Math.round(W*H/2600),.4*d,1*d,.25,11,'#9fd8ff'),
  mid:stLayer(W,H,Math.round(W*H/9000),.7*d,1.5*d,.35,23,'#ffd7a0'),
  near:stLayer(W,H,Math.round(W*H/32000),1.1*d,2.2*d,.5,37,'#bfe8ff')};
}
// ---- LYRA dettagliata (2026-11-11): il pianeta in sottofondo è LYRA, una sfera vera come nella home
// (stessa superficie di pianeti-dettaglio.js: oceani, continenti, montagne, nuvole, luci delle città),
// ma con una mappa molto più grande (2560x1280) e dettagli fini in più, perché qui il pianeta è enorme.
// La mappa si calcola UNA volta, divisa fra più worker (il gioco non scatta), e resta in memoria
// per le volte successive. Il pianeta gira piano: si ridisegna 8 volte al secondo con una tabella
// già pronta (solo putImageData + drawImage, niente filter o shadowBlur).
// Finché la mappa non è pronta resta il pianeta scuro di prima, poi LYRA compare in dissolvenza.
const ST_LYRA={TW:2560,TH:1280,tex:null,busy:false,secs:360,fps:8,maxD:1400,lut:null};
function stLyraP(){
 const p=typeof planets!=='undefined'&&planets&&planets.find?planets.find(q=>q&&q.name==='LYRA'):null;
 return p||{name:'LYRA',code:'HX–01',theme:'mare'};
}
function stLyraOk(){return typeof pdTexStart==='function'&&typeof pdTexel==='function'&&typeof pdNoise==='function'&&typeof PD_THEMES!=='undefined'}
// righe [a,b) della mappa, con un po' di dettaglio fine in più (rocce, coste, filamenti delle nuvole)
function stLyraRows(g,a,b){
 const TW=g.TW,TH=g.TH,n=(b-a)*TW,col=new Uint8ClampedArray(n*4),emit=new Uint8Array(n),cloud=new Uint8Array(n),N=g.N;
 for(let v=a;v<b;v++){
  g.prevH=undefined;const lat=(.5-(v+.5)/TH)*Math.PI,cl=Math.cos(lat),y=Math.sin(lat);
  for(let u=0;u<TW;u++){
   const lon=(u+.5)/TW*Math.PI*2,x=cl*Math.cos(lon),z=cl*Math.sin(lon),o=pdTexel(g,x,y,z,lat,lon),i=(v-a)*TW+u;
   let f=1;
   if(o[3]<.5){f=1+(N.n3(x*170+3,y*170,z*170)-.5)*.14+(N.n3(x*420,y*420+7,z*420)-.5)*.05*(1-o[0]/320)}
   else f=1+(N.n3(x*140,y*140,z*140+5)-.5)*.05;
   let c=o[5];if(c>0)c*=.7+.6*N.fbm(x*16+11,y*26,z*16,3);
   col[i*4]=o[0]*f;col[i*4+1]=o[1]*f;col[i*4+2]=o[2]*f;col[i*4+3]=o[3]*255;
   emit[i]=Math.min(255,o[4]*255);cloud[i]=Math.min(255,c*255);
  }
 }
 return{col,emit,cloud};
}
function stLyraTex(){
 if(ST_LYRA.tex||ST_LYRA.busy||!stLyraOk())return;
 const P=stLyraP(),p={theme:P.theme||'mare',code:P.code,name:P.name},TW=ST_LYRA.TW,TH=ST_LYRA.TH;
 let url=null;
 try{
  if(typeof Worker==='function'&&typeof Blob==='function'&&typeof URL!=='undefined'&&URL.createObjectURL){
   const src=[`const PD={TW:${TW},TH:${TH}};`,`const PD_THEMES=${JSON.stringify(PD_THEMES)};`,
    'const pdHex='+pdHex,'const pdMix='+pdMix,'const pdSmooth='+pdSmooth,
    pdNoise,pdRamp,pdSeed,pdTexStart,pdTexel,stLyraRows,
    'onmessage=e=>{const g=pdTexStart(e.data.p);g.col=g.emit=g.cloud=null;const r=stLyraRows(g,e.data.a,e.data.b);postMessage({a:e.data.a,b:e.data.b,col:r.col,emit:r.emit,cloud:r.cloud},[r.col.buffer,r.emit.buffer,r.cloud.buffer])};'].join('\n');
   url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));
  }
 }catch(e){url=null}
 if(!url)return;
 const hc=typeof navigator!=='undefined'&&navigator.hardwareConcurrency||4,nw=Math.max(2,Math.min(6,hc-1));
 const T=PD_THEMES[p.theme]||PD_THEMES.mare;
 const tex={TW,TH,T,col:new Uint8ClampedArray(TW*TH*4),emit:new Uint8Array(TW*TH),cloud:new Uint8Array(TW*TH),cc:pdHex(T.cloud[2]),atm:pdHex(T.atm),glow:pdHex(T.glow),ready:false};
 let left=nw;const ws=[];ST_LYRA.busy=true;
 const finito=ok=>{for(const w of ws)try{w.terminate()}catch(e){}ws.length=0;ST_LYRA.busy=false;try{URL.revokeObjectURL(url)}catch(e){}if(ok){tex.ready=true;ST_LYRA.tex=tex}};
 for(let k=0;k<nw;k++){
  const a=Math.floor(TH*k/nw),b=Math.floor(TH*(k+1)/nw);let w;
  try{w=new Worker(url)}catch(e){finito(false);return}
  ws.push(w);
  w.onmessage=e=>{const d=e.data,o=d.a*TW;tex.col.set(d.col,o*4);tex.emit.set(d.emit,o);tex.cloud.set(d.cloud,o);if(--left===0)finito(true)};
  w.onerror=e=>{if(e&&e.preventDefault)e.preventDefault();finito(false)};
  w.postMessage({p,a,b});
 }
}
// mappa da usare: quella grande, altrimenti quella della home (più piccola) se è già pronta
function stLyraUsa(){
 if(ST_LYRA.tex)return ST_LYRA.tex;
 if(typeof PD==='undefined'||!PD.tex)return null;
 const P=stLyraP(),g=PD.tex.get(P.code||P.name);
 if(!g||!g.ready||ST_LYRA.busy)return null;
 return{TW:PD.TW,TH:PD.TH,T:g.T,col:g.col,emit:g.emit,cloud:g.cloud,cc:g.cc,atm:pdHex(g.T.atm),glow:pdHex(g.T.glow),ready:true};
}
// tabella per ogni pixel del disco (luce da in alto a sinistra: la notte resta in basso a destra, come prima)
function stLyraLut(D,TW,TH){
 const k=D+'x'+TW;if(ST_LYRA.lut&&ST_LYRA.lut.k===k)return ST_LYRA.lut;
 const R=D/2,L0=[-.66,-.6,.45],ln=Math.hypot(...L0),L=L0.map(v=>v/ln),H0=[L[0],L[1],L[2]+1],hn=Math.hypot(...H0),H=H0.map(v=>v/hn);
 const tilt=.42,ct=Math.cos(tilt),st=Math.sin(tilt),lean=-.32,cl=Math.cos(lean),sl=Math.sin(lean);
 let n=0;for(let py=0;py<D;py++){const ny=(py+.5-R)/R;for(let px=0;px<D;px++){const nx=(px+.5-R)/R;if(nx*nx+ny*ny<=1)n++}}
 const idx=new Uint32Array(n),vrow=new Uint32Array(n),lon0=new Float32Array(n),lit=new Float32Array(n),spc=new Float32Array(n),rim=new Float32Array(n),night=new Float32Array(n),edge=new Float32Array(n);
 let j=0;
 for(let py=0;py<D;py++)for(let px=0;px<D;px++){
  const nx=(px+.5-R)/R,ny=(py+.5-R)/R,q=nx*nx+ny*ny;if(q>1)continue;
  const nz=Math.sqrt(1-q);
  let x=nx*cl-ny*sl,y=nx*sl+ny*cl,z=nz;const y2=y*ct-z*st,z2=y*st+z*ct;y=y2;z=z2;
  const lat=Math.asin(Math.max(-1,Math.min(1,-y))),lon=Math.atan2(z,x);
  const dl=nx*L[0]+ny*L[1]+nz*L[2],day=pdSmooth(-.1,.3,dl);
  idx[j]=py*D+px;vrow[j]=Math.min(TH-1,Math.max(0,Math.floor((.5-lat/Math.PI)*TH)))*TW;
  lon0[j]=((lon/(Math.PI*2))*TW+TW)%TW;
  lit[j]=.025+.975*day*(.45+.55*Math.max(0,dl));
  spc[j]=Math.pow(Math.max(0,nx*H[0]+ny*H[1]+nz*H[2]),110)*day*.6;
  rim[j]=Math.pow(1-nz,2.6)*(.12+.88*day);
  night[j]=1-day;edge[j]=Math.min(1,(1-Math.sqrt(q))*R/1.3);
  j++;
 }
 ST_LYRA.lut={k,D,n,idx,vrow,lon0,lit,spc,rim,night,edge};
 return ST_LYRA.lut;
}
function stLyraRender(B,t){
 const X=B.ly,tex=X.tex,D=X.D,TW=tex.TW,U=stLyraLut(D,TW,tex.TH);
 const {n,idx,vrow,lon0,lit,spc,rim,night,edge}=U,col=tex.col,em=tex.emit,cld=tex.cloud,out=X.img.data,cc=tex.cc,atm=tex.atm,glow=tex.glow;
 const turn=(t/ST_LYRA.secs)%1,offG=(1-turn)*TW+TW*.62,offC=(1-(turn*1.18%1))*TW+TW*.3,sh=TW*.004;
 for(let j=0;j<n;j++){
  const row=vrow[j],l0=lon0[j];
  const u=((l0+offG)|0)%TW,w=((l0+offC)|0)%TW,ws=((l0+offC+sh)|0)%TW,ti=row+u,k=ti*4;
  let r=col[k],gg=col[k+1],b=col[k+2];
  const c=cld[row+w]/255,cs=cld[row+ws]/255,shade=1-cs*.45;r*=shade;gg*=shade;b*=shade;
  r+=(cc[0]-r)*c;gg+=(cc[1]-gg)*c;b+=(cc[2]-b)*c;
  const Lt=lit[j];r*=Lt;gg*=Lt;b*=Lt;
  const sp=spc[j]*col[k+3]/255*(1-c);if(sp>0){r+=255*sp*.9;gg+=245*sp*.9;b+=225*sp*.9}
  const e=em[ti]/255*(1-c*.8)*night[j];if(e>0){r+=glow[0]*e;gg+=glow[1]*e;b+=glow[2]*e}
  const a=rim[j]*.8;r+=(atm[0]-r)*a;gg+=(atm[1]-gg)*a;b+=(atm[2]-b)*a;
  const o=idx[j]*4;out[o]=r;out[o+1]=gg;out[o+2]=b;out[o+3]=255*edge[j];
 }
 X.ctx.putImageData(X.img,0,0);X.drawn=true;
}
// prepara (una volta per dimensione) la tela del disco e l'alone, poi aggiorna la rotazione
function stLyraDisegna(g,B,px,py,dt){
 if(!B.ly){
  const tex=stLyraUsa();if(!tex)return 0;
  const P=B.pl.width,r=P*.42,D=Math.max(8,Math.min(ST_LYRA.maxD,Math.round(r*2)));
  const cv=document.createElement('canvas');cv.width=cv.height=D;const ctx=cv.getContext('2d');
  if(!ctx||!ctx.createImageData)return 0;
  const halo=document.createElement('canvas');halo.width=halo.height=P;const h=halo.getContext('2d');
  if(h){const A=tex.atm,cx=P/2;
   const gr=h.createRadialGradient(cx,cx,r*.94,cx,cx,r*1.19);
   gr.addColorStop(0,'rgba('+A+',.34)');gr.addColorStop(.35,'rgba('+A+',.12)');gr.addColorStop(1,'rgba('+A+',0)');
   h.fillStyle=gr;h.fillRect(0,0,P,P);
   // bordo illuminato sottile dal lato del sole
   h.strokeStyle='rgba(170,230,255,.5)';h.lineWidth=Math.max(1,P*.003);h.beginPath();h.arc(cx,cx,r-h.lineWidth*.6,Math.PI*.92,Math.PI*1.62);h.stroke();
  }
  B.ly={tex,D,cv,ctx,img:ctx.createImageData(D,D),halo,r,a:0,t:0,last:-1,drawn:false};
 }
 const X=B.ly;
 // se nel frattempo è arrivata la mappa grande, si passa a quella
 if(ST_LYRA.tex&&X.tex!==ST_LYRA.tex){X.tex=ST_LYRA.tex;X.last=-1}
 X.t+=dt;
 if(X.last<0||X.t-X.last>=1/ST_LYRA.fps){X.last=X.t;stLyraRender(B,X.t+40)}
 if(!X.drawn)return 0;
 X.a=Math.min(1,X.a+dt/1.6);
 const P=B.pl.width,c=P/2;
 g.globalAlpha=X.a;g.drawImage(X.halo,px,py);g.drawImage(X.cv,px+c-X.r,py+c-X.r,X.r*2,X.r*2);g.globalAlpha=1;
 return X.a;
}
function stDisegna(dt){
 const c=$('storiaCanvas');if(!c||!c.getContext)return;
 const w=innerWidth,h=innerHeight;
 if(!STORIA.bg||STORIA.bg.cw!==w||STORIA.bg.ch!==h){STORIA.bg=stSfondo(w,h);STORIA.bg.cw=w;STORIA.bg.ch=h;STORIA.bg.t=0;c.width=STORIA.bg.W;c.height=STORIA.bg.H}
 const B=STORIA.bg,g=c.getContext('2d');if(!g)return;
 B.t+=dt;
 g.drawImage(B.base,0,0);
 // ogni strato scende piano a velocità diversa (parallasse), ripetuto in verticale
 for(const [L,v] of [[B.far,4],[B.mid,9],[B.near,18]]){
  const y=(B.t*v*B.d)%B.H;g.drawImage(L,0,y-B.H);g.drawImage(L,0,y);
 }
 const P=B.pl.width,px=B.W-P*.62,py=B.H-P*.4-Math.min(B.t,150)*1.1*B.d;
 // LYRA dettagliata sopra il pianeta scuro: quando è del tutto visibile il vecchio non si disegna più
 const la=B.ly&&B.ly.drawn?B.ly.a:0;
 if(la<1)g.drawImage(B.pl,px,py);
 try{stLyraDisegna(g,B,px,py,dt)}catch(e){}
}

// ---- testo che scorre: la posizione segue la frase che la voce sta leggendo
function stScorri(dt){
 const cr=STORIA.cr;if(!cr)return;
 const H=cr.tilt.clientHeight||innerHeight,a=H*.34;
 if(STORIA.fase==='crawl'&&STORIA.cur&&cr.idx>=0){
  const k=cr.idx,t=cr.tops,next=k+1<t.length?t[k+1]:cr.fine;
  const f=cr.attesa?1:Math.min(.97,(stNow()-STORIA.cur.t0)/STORIA.cur.est);
  STORIA.yT=t[k]+a+f*(next-t[k]);
 }else if(STORIA.fase==='crawl'&&cr.idx<0)STORIA.yT=(cr.tops[0]||0)+a;
 else if(STORIA.fase==='uscita')STORIA.yT+=dt*H*.09;
 STORIA.y+=(STORIA.yT-STORIA.y)*Math.min(1,dt*2.2);
 cr.el.style.transform='translate3d(0,'+(-STORIA.y).toFixed(1)+'px,0)';
}
function stLoop(){
 if(!STORIA.on)return;
 const n=stNow(),dt=Math.min(.1,(n-(STORIA.last||n))/1000);STORIA.last=n;
 stDisegna(dt);stScorri(dt);
 STORIA.raf=requestAnimationFrame(stLoop);
}

// ---- costruzione della pagina
function stBuild(){
 if(typeof document==='undefined'||!document.body||!document.createElement)return;
 if(!$('storiaCss')&&document.head){const st=document.createElement('style');st.id='storiaCss';st.textContent=STORIA_CSS;document.head.appendChild(st)}
 // pulsante STORIA nella home, accanto a ESCI DAL GIOCO
 const brand=document.querySelector('#mapScreen .brand');
 if(brand&&!$('storiaBtn')){
  const b=document.createElement('button');b.type='button';b.id='storiaBtn';b.className='storia-btn';
  b.setAttribute('aria-label','LA STORIA DI CONEX');
  b.innerHTML=stIco('book')+'<span>STORIA</span>';
  b.onclick=()=>storiaApri();
  brand.parentNode.appendChild(b);
 }
 // scelta dopo la creazione del pilota
 if(!$('storiaScelta')){
  const o=document.createElement('section');o.id='storiaScelta';o.className='overlay storia-scelta hidden';
  o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-label','LA STORIA DI CONEX');
  o.innerHTML='<div class="brief-card storia-card"><p class="eyebrow">BENVENUTO, PILOTA</p><h2>LA STORIA DI CONEX</h2>'+
   '<p>Prima di partire, vuoi conoscere la storia di Conex?</p>'+
   '<div class="storia-scelte"><button id="storiaSi" class="launch-btn storia-si" type="button"><span>STORIA</span><b>'+stIco('book')+'</b></button>'+
   '<button id="storiaNo" class="launch-btn storia-no" type="button"><span>VAI AL GIOCO</span><b>'+stIco('arrow-right')+'</b></button></div>'+
   '<p class="storia-nota">Potrai rivederla quando vuoi con il pulsante STORIA nella home.</p></div>';
  document.body.appendChild(o);
  $('storiaSi').onclick=()=>{show('storiaScelta',false);storiaApri()};
  $('storiaNo').onclick=()=>show('storiaScelta',false);
 }
 // la scena
 if(!$('storiaScreen')){
  const s=document.createElement('section');s.id='storiaScreen';s.className='storia hidden';s.setAttribute('aria-label','LA STORIA DI CONEX');
  const crawl=[2,3,4,5].map(n=>'<p data-n="'+n+'">'+STORIA_TESTO[n][0]+'</p>').join('');
  s.innerHTML='<canvas id="storiaCanvas" aria-hidden="true"></canvas>'+
   '<p id="storiaApertura" class="st-apertura">'+STORIA_TESTO[0][0]+'</p>'+
   '<div id="storiaLogo" class="st-logo" aria-hidden="true">CON<b>EX</b></div>'+
   '<p id="storiaTitolo" class="st-titolo">'+STORIA_TESTO[1][0]+'</p>'+
   '<div id="storiaCrawl" class="st-crawl-wrap"><div class="st-tilt"><div class="st-crawl">'+crawl+'</div></div></div>'+
   '<div id="storiaFine" class="st-fine"><p>'+STORIA_TESTO[6][0]+'</p>'+
    '<div class="st-fine-btns"><button id="storiaGioca" class="launch-btn" type="button"><span>VAI AL GIOCO</span><b>'+stIco('arrow-right')+'</b></button>'+
    '<button id="storiaAncora" class="text-btn" type="button">'+stIco('rotate')+' <span>RIVEDI LA STORIA</span></button></div></div>'+
   '<div class="st-ctrl"><button id="storiaVoce" class="st-btn" type="button" aria-label="Voce narrante" aria-pressed="true"></button>'+
   '<button id="storiaSalta" class="st-btn" type="button">'+stIco('skip')+'<span>SALTA</span></button></div>';
  document.body.appendChild(s);
  $('storiaSalta').onclick=()=>storiaChiudi();
  $('storiaGioca').onclick=()=>storiaChiudi();
  $('storiaAncora').onclick=()=>storiaApri();
  $('storiaVoce').onclick=()=>stVoceSet(!STORIA.voce);
  stVoceBtn();
 }
}
function stVoceBtn(){
 const b=$('storiaVoce');if(!b)return;
 const ok=stVoceOk();b.classList.toggle('hidden',!ok);
 b.classList.toggle('off',!STORIA.voce);b.setAttribute('aria-pressed',String(STORIA.voce));
 b.innerHTML=stIco(STORIA.voce?'voice':'mute')+'<span>VOCE</span>';
}
function stVoceSet(on){
 STORIA.voce=on;try{localStorage.setItem(STORIA_VOCE_KEY,on?'on':'off')}catch(e){}
 if(!on&&STORIA.zitto)STORIA.zitto();
 stVoceBtn();
}
// ESCI DAL GIOCO cambia larghezza con la lingua: STORIA gli sta sempre accanto
function stPosiziona(){
 const e=$('exitBtn'),b=$('storiaBtn');if(!e||!b||!e.offsetWidth)return;
 b.style.left=(e.offsetLeft+e.offsetWidth+10)+'px';b.style.top=e.offsetTop+'px';
}

// ---- svolgimento
function stFase(f){
 STORIA.fase=f;const s=$('storiaScreen');if(s)s.dataset.fase=f;
}
async function stRacconta(tok){
 const ok=()=>tok===STORIA.tok&&STORIA.on;
 // le voci del browser arrivano dopo qualche istante
 const s=stSynth();
 if(s&&STORIA.voce&&!stVoce(stLang()))for(let i=0;i<10&&!stVoce(stLang());i++)await stSleep(100);
 stVoceBtn();
 stFase('buio');await stSleep(900);if(!ok())return;
 stFase('apertura');await stSleep(700);if(!ok())return;
 await stDi(0,tok);if(!ok())return;
 await stSleep(1300);if(!ok())return;
 stFase('logo');await stSleep(4700);if(!ok())return;
 // titolo: "La Caduta e l’Ascesa di CONEX"
 stFase('titolo');await stSleep(500);if(!ok())return;
 await stDi(1,tok);if(!ok())return;
 await stSleep(1600);if(!ok())return;
 // testo che scorre
 const cr=STORIA.cr;cr.idx=-1;STORIA.y=STORIA.yT=0;stMisura();
 stFase('crawl');await stSleep(2600);if(!ok())return;
 for(let k=0;k<cr.tops.length;k++){
  cr.idx=k;cr.attesa=false;
  await stDi(k+2,tok);if(!ok())return;
  cr.attesa=true;await stSleep(550);if(!ok())return;
 }
 stFase('uscita');await stSleep(2400);if(!ok())return;
 stFase('fine');await stSleep(900);if(!ok())return;
 await stDi(6,tok);if(!ok())return;
 stFase('fine-btn');
 const g=$('storiaGioca');if(g)try{g.focus()}catch(e){}
}
function stMisura(){
 const cr=STORIA.cr;if(!cr)return;
 const ps=[...cr.el.querySelectorAll('p')];
 cr.tops=ps.map(p=>p.offsetTop);
 const l=ps[ps.length-1];cr.fine=l?l.offsetTop+l.offsetHeight+40:0;
}
function storiaApri(){
 stBuild();
 const s=$('storiaScreen');if(!s)return;
 if(STORIA.on)storiaStop();
 try{stLyraTex()}catch(e){}
 STORIA.on=true;const tok=++STORIA.tok;STORIA.ratio=1;STORIA.last=0;
 show('storiaScelta',false);
 STORIA.cr={el:s.querySelector('.st-crawl'),tilt:s.querySelector('.st-tilt'),idx:-1,tops:[],fine:0,attesa:false};
 STORIA.y=STORIA.yT=0;STORIA.cr.el.style.transform='translate3d(0,0,0)';
 stFase('buio');s.classList.remove('hidden','st-via');
 if(typeof i18nApply==='function')try{i18nApply()}catch(e){}
 // la musica della storia parte subito (vedi musTheme qui sotto)
 // e riparte sempre dall'inizio
 {const T=typeof mus!=='undefined'&&mus&&mus.tracks&&mus.tracks.storia;if(T&&T.els){if(mus.track===T)mus.track=null;T.cur=0;for(const el of T.els){try{el.pause();el.currentTime=0}catch(e){}}}}
 if(typeof musTick==='function')try{musTick()}catch(e){}
 cancelAnimationFrame(STORIA.raf);STORIA.raf=requestAnimationFrame(stLoop);
 const sk=$('storiaSalta');if(sk)try{sk.focus()}catch(e){}
 stRacconta(tok);
}
function storiaStop(){
 STORIA.tok++;STORIA.parla=false;STORIA.cur=null;
 const s=stSynth();if(s)try{s.cancel()}catch(e){}
 cancelAnimationFrame(STORIA.raf);
}
function storiaChiudi(){
 if(!STORIA.on)return;
 storiaStop();STORIA.on=false;
 const s=$('storiaScreen');if(!s)return;
 s.classList.add('st-via');
 setTimeout(()=>{if(!STORIA.on){s.classList.add('hidden');s.classList.remove('st-via');STORIA.bg=null}},600);
}
// Dopo la creazione del pilota: la scelta STORIA / VAI AL GIOCO (solo per un pilota nuovo).
function storiaScelta(){
 stBuild();
 setTimeout(()=>{
  if(typeof state!=='undefined'&&state!=='map')return;
  show('storiaScelta',true);const b=$('storiaSi');if(b)try{b.focus()}catch(e){}
 },650);
}

// ---- musica: brano "Last Light From The Cockpit" (scelto da Fabio) mentre la storia è aperta, voce più alta della musica
if(typeof MUS_TRACKS!=='undefined')MUS_TRACKS.storia='musica/last-light-from-the-cockpit.mp3';
if(typeof musTheme==='function'){const t=musTheme;musTheme=function(){
 if(STORIA.on){const T=typeof mus!=='undefined'&&mus&&mus.tracks&&mus.tracks.storia;if(!(T&&T.failed))return'storia'}
 return t.apply(this,arguments);
}}
if(typeof volumeLevel==='function'){const v=volumeLevel;volumeLevel=function(kind){
 const r=v.apply(this,arguments);
 // colonna sonora della storia più alta del resto del gioco; un po' più bassa solo mentre parla la voce
 return kind==='music'&&STORIA.on?Math.min(2,Math.max(r,.5)*2)*(STORIA.parla?.6:1):r;
}}

// ---- profilo: dopo CREA IL PILOTA arriva la scelta
if(typeof profCreateClick==='function'){
 const o=profCreateClick;
 profCreateClick=async function(){
  const prima=typeof prof!=='undefined'&&!!prof;
  const r=await o.apply(this,arguments);
  if(!prima&&typeof prof!=='undefined'&&prof)storiaScelta();
  return r;
 };
 // anche il tasto Invio nei campi del nuovo pilota passa dalla nuova funzione
 if(typeof profKeys==='function'&&typeof $==='function')for(const id of['profName','profPw','profPw2'])profKeys($(id),()=>profCreateClick());
}

const STORIA_CSS=`
.storia-btn{position:absolute;left:200px;top:calc(100% + 14px);z-index:40;display:flex;align-items:center;gap:8px;height:34px;padding:0 16px 0 12px;
 border:1px solid #f5c55a99;background:linear-gradient(135deg,#3a2a0ae6,#1a1206e6);color:#ffe2a3;cursor:pointer;
 font:700 11px 'Chakra Petch',sans-serif;letter-spacing:3px;clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%);transition:.2s}
.storia-btn .ico{width:15px;height:15px;flex:none}
.storia-btn:hover{background:linear-gradient(135deg,#7a5a1a,#3a2a0a);color:#fff;border-color:#ffd77a;box-shadow:0 0 18px #f5c55a55}
.storia-btn:focus-visible{outline:2px solid #ffe2a3;outline-offset:3px}
@media(max-width:850px){.storia-btn{top:calc(100% + 8px);height:30px;font-size:10px;padding:0 12px 0 9px}}
@media(max-height:520px){.storia-btn{top:calc(100% + 6px);height:26px;font-size:9px;letter-spacing:2px;padding:0 10px 0 8px}.storia-btn .ico{width:12px;height:12px}}
.storia-scelta{z-index:70}
.storia-card{width:min(560px,92vw)}
.storia-card h2{color:#ffe2a3}
.storia-scelte{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:26px}
.storia-scelte .launch-btn{margin:0}
.storia-si{background:linear-gradient(110deg,#ffe08a,#f5b942)!important;border-color:#ffe6a6!important;color:#1f1403!important}
.storia-si:hover{background:#ffe9ad!important;box-shadow:0 6px 26px #f5c55a44!important}
.storia-nota{font-size:11px!important;margin:18px 0 0}
.launch-btn .ico{width:18px;height:18px}
@media(max-width:520px){.storia-scelte{grid-template-columns:1fr}}
.storia{position:fixed;inset:0;z-index:9000;background:#010309;overflow:hidden;opacity:1;transition:opacity .6s;font-family:'Chakra Petch',Inter,sans-serif;color:#e9f4ff}
.storia.st-via{opacity:0;pointer-events:none}
#storiaCanvas{position:absolute;inset:0;width:100%;height:100%}
.st-apertura{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(900px,86vw);margin:0;text-align:center;
 font:500 clamp(20px,2.6vw,38px)/1.5 'Chakra Petch',sans-serif;letter-spacing:1px;color:#7fe3ff;opacity:0;transition:opacity 1.4s}
.storia[data-fase=apertura] .st-apertura{opacity:1}
.st-logo{position:absolute;left:50%;top:50%;font:700 clamp(70px,13vw,220px)/1 'Chakra Petch',sans-serif;letter-spacing:.12em;color:transparent;
 -webkit-text-stroke:2px #ffd36a;opacity:0;transform:translate(-50%,-50%) scale(2.6);pointer-events:none;white-space:nowrap}
.st-logo b{-webkit-text-stroke-color:#7fe3ff}
.st-titolo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1000px,88vw);margin:0;text-align:center;
 font:700 clamp(26px,4.2vw,64px)/1.2 'Chakra Petch',sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#ffd36a;opacity:0;transition:opacity 1.2s}
.storia[data-fase=titolo] .st-titolo{opacity:1}
.storia[data-fase=logo] .st-logo{animation:stLogo 5.2s cubic-bezier(.3,.1,.6,1) forwards}
@keyframes stLogo{0%{opacity:0;transform:translate(-50%,-50%) scale(2.6)}8%{opacity:1}75%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(.12)}}
.st-crawl-wrap{position:absolute;inset:0;perspective:560px;perspective-origin:50% 22%;overflow:hidden;opacity:0;transition:opacity 1.6s;
 -webkit-mask-image:linear-gradient(to bottom,transparent 0,transparent 8%,#000 52%);mask-image:linear-gradient(to bottom,transparent 0,transparent 8%,#000 52%)}
.storia[data-fase=crawl] .st-crawl-wrap,.storia[data-fase=uscita] .st-crawl-wrap{opacity:1}
.storia[data-fase=uscita] .st-crawl-wrap{transition:opacity 2.4s}
.storia[data-fase=uscita] .st-crawl-wrap{opacity:0}
.st-tilt{position:absolute;left:50%;bottom:0;width:min(840px,90vw,150vh);height:100%;transform:translateX(-50%) rotateX(25deg);transform-origin:50% 100%}
.st-crawl{position:absolute;left:0;right:0;top:100%;will-change:transform}
.st-crawl p{margin:0 0 1.1em;text-align:justify;hyphens:auto;font:600 clamp(19px,2.25vw,36px)/1.45 'Chakra Petch',sans-serif;letter-spacing:.5px;color:#ffd36a;text-shadow:0 0 18px rgba(255,190,70,.25)}
html[lang=zh-Hans] .st-crawl p,html[lang=ja] .st-crawl p{letter-spacing:0;text-align:left}
.st-fine{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;opacity:0;pointer-events:none;transition:opacity 1.4s}
.st-fine>p{margin:0;width:min(1000px,88vw);text-align:center;font:600 clamp(19px,2.5vw,38px)/1.4 'Chakra Petch',sans-serif;letter-spacing:2px;color:#ffe2a3}
.storia[data-fase=fine] .st-fine,.storia[data-fase=fine-btn] .st-fine{opacity:1;pointer-events:auto}
.st-fine-btns{display:flex;flex-direction:column;align-items:center;opacity:0;transition:opacity .8s}
.storia[data-fase=fine-btn] .st-fine-btns{opacity:1}
.st-fine-btns .launch-btn{width:min(320px,80vw)}
.st-fine-btns .text-btn{display:flex;align-items:center;gap:8px;font-size:11px;color:#a9bad0}
.st-fine-btns .text-btn .ico{width:14px;height:14px}
.st-ctrl{position:absolute;right:22px;top:20px;display:flex;gap:10px;z-index:2}
.st-btn{display:flex;align-items:center;gap:8px;height:36px;padding:0 14px;border:1px solid rgba(127,227,255,.35);background:rgba(3,11,20,.6);color:#bfefff;cursor:pointer;
 font:600 10px 'Chakra Petch',sans-serif;letter-spacing:2px;transition:.2s}
.st-btn:hover{border-color:#7fe3ff;color:#fff}
.storia[data-fase=fine-btn] .st-ctrl{opacity:0;pointer-events:none}
.st-btn.off{color:#7d8b99;border-color:rgba(255,255,255,.15)}
.st-btn .ico{width:15px;height:15px}
@media(max-height:520px){.st-ctrl{top:10px;right:12px}.st-btn{height:30px;padding:0 10px;font-size:9px}.st-fine{gap:18px}}
`;

if(typeof document!=='undefined'&&document.querySelector&&document.body){
 stBuild();
 if(typeof i18nApply==='function')try{i18nApply()}catch(e){}
 const st=stSynth();
 if(st){try{st.getVoices()}catch(e){}if('onvoiceschanged' in st)st.addEventListener?st.addEventListener('voiceschanged',stVoceBtn):(st.onvoiceschanged=stVoceBtn)}
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(stPosiziona));
 addEventListener('load',stPosiziona);addEventListener('resize',stPosiziona);
 if(typeof setLang==='function'){const o=setLang;setLang=function(){const r=o.apply(this,arguments);stPosiziona();stVoceBtn();return r}}
 if(typeof ResizeObserver!=='undefined')setTimeout(()=>{const e=$('exitBtn');if(e)new ResizeObserver(stPosiziona).observe(e)},0);
 // tastiera: ESC chiude, Invio sul finale va al gioco; i tasti non arrivano al gioco sotto
 addEventListener('keydown',e=>{
  if(!STORIA.on)return;
  if(e.code==='Escape'){storiaChiudi();e.preventDefault()}
  else if(e.code==='Enter'&&STORIA.fase==='fine-btn'&&document.activeElement===document.body){storiaChiudi();e.preventDefault()}
  e.stopPropagation();
 },true);
 addEventListener('resize',()=>{if(STORIA.on)stMisura()});
}

// ---- NEMESI, la fortezza-pianeta dell'Impero (2026-11-11)
// Una stazione da battaglia grande come una luna, disegnata solo per questo gioco: scafo a piastre
// esagonali, cintura equatoriale scavata con le luci, due solchi paralleli, corona di torri al polo
// nord e l'"Iride", il cannone a forma di cratere esagonale con sei lame che si carica di rosso.
// Prestazioni: la stazione si disegna UNA volta su una tela in memoria (per dimensione dello schermo);
// a ogni fotogramma si copia l'immagine e si aggiunge il bagliore dell'Iride (altra tela in memoria)
// con qualche linea per i raggi. Niente ctx.filter né shadowBlur.
const ST_STAZ={giro:18,carica:13.6,raggi:2.4,fuoco:.9,entra:0};
function stStazVec(lat,lon){return[Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)]}
function stStazSprite(R){
 R=Math.max(8,Math.round(R));
 const S=R*2+6,c=document.createElement('canvas');c.width=c.height=S;const g=c.getContext('2d');
 const cx=S/2,cy=S/2,E=.36,cE=Math.cos(E),sE=Math.sin(E),L=[-.58,-.52,.62];
 const Ln=Math.hypot(L[0],L[1],L[2]);L[0]/=Ln;L[1]/=Ln;L[2]/=Ln;
 // modello (y in alto) -> vista (z verso chi guarda) -> schermo
 const V=m=>[m[0],m[1]*cE-m[2]*sE,m[1]*sE+m[2]*cE];
 const P=v=>[cx+R*v[0],cy-R*v[1]];
 const luce=v=>v[0]*L[0]-v[1]*L[1]+v[2]*L[2];
 const add=(a,b,k)=>[a[0]+b[0]*k,a[1]+b[1]*k,a[2]+b[2]*k];
 const nor=a=>{const n=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/n,a[1]/n,a[2]/n]};
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 // l'Iride: centro, e due direzioni sulla superficie per costruire l'esagono
 const DL=.72,DO=-.42,DA=.25,dc=stStazVec(DL,DO);
 const est=nor(cross([0,1,0],dc)),nord=cross(dc,est);
 const suDisco=(a,ang)=>{const s=Math.sin(a),k=Math.cos(a);return[dc[0]*k+(est[0]*Math.cos(ang)+nord[0]*Math.sin(ang))*s,dc[1]*k+(est[1]*Math.cos(ang)+nord[1]*Math.sin(ang))*s,dc[2]*k+(est[2]*Math.cos(ang)+nord[2]*Math.sin(ang))*s]};
 const angD=m=>Math.acos(Math.max(-1,Math.min(1,m[0]*dc[0]+m[1]*dc[1]+m[2]*dc[2])));
 const meta={S,R,cx,cy};
 if(!g)return{cv:c,...meta,glow:c,gx:cx,gy:cy,vx:[],fx:cx,fy:cy};
 const rnd=stRnd(4242);
 // fondo metallico
 g.save();g.beginPath();g.arc(cx,cy,R,0,Math.PI*2);g.clip();
 g.fillStyle='#0b0f15';g.fillRect(0,0,S,S);
 const col=(v,k)=>{const l=Math.max(0,luce(v)),a=.06+Math.pow(l,.9)*.94;return'rgb('+Math.round(150*a*k)+','+Math.round(160*a*k)+','+Math.round(174*a*k)+')'};
 // piastre: fasce di latitudine, piastre di larghezza simile, ognuna con la sua luce (effetto sfaccettato)
 const dLat=Math.max(.032,Math.min(.075,.075*170/R)),luci=[];
 for(let la=-Math.PI/2+dLat*.5;la<Math.PI/2-dLat*.4;la+=dLat){
  const n=Math.max(6,Math.round(Math.PI*2*Math.cos(la)/dLat)),dLon=Math.PI*2/n,off=rnd()*dLon;
  for(let i=0;i<n;i++){
   const lo=off+i*dLon,mc=stStazVec(la,lo+dLon/2),vc=V(mc);if(vc[2]<-.05)continue;
   if(Math.abs(la)<.05)continue; // la cintura scavata
   if(angD(mc)<DA*.86)continue; // l'Iride
   const g1=.035,lst=[[la-dLat/2+g1*dLat,lo+g1*dLon],[la-dLat/2+g1*dLat,lo+dLon-g1*dLon],[la+dLat/2-g1*dLat,lo+dLon-g1*dLon],[la+dLat/2-g1*dLat,lo+g1*dLon]];
   const k=.72+rnd()*.42+(rnd()<.06?.25:0);
   g.fillStyle=col(vc,k);g.beginPath();
   lst.forEach((q,j)=>{const p=P(V(stStazVec(q[0],q[1])));j?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])});g.fill();
   // ogni tanto una piastra con un pannello più scuro dentro
   if(rnd()<.18){const ql=la+(rnd()-.5)*dLat*.4,qo=lo+dLon*(.3+rnd()*.4),p=P(V(stStazVec(ql,qo)));
    g.fillStyle='rgba(0,0,0,.35)';const w=R*dLat*.35*Math.max(.2,vc[2]);g.fillRect(p[0]-w,p[1]-w*.5,w*2,w)}
   if(R>220&&rnd()<.3){const p=P(V(stStazVec(la+(rnd()-.5)*dLat*.5,lo+dLon*(.2+rnd()*.6)))),w=R*dLat*.5*Math.max(.25,vc[2]);
    g.fillStyle=rnd()<.5?'rgba(0,0,0,.28)':'rgba(255,255,255,.07)';g.fillRect(p[0]-w*.5,p[1]-w*.12,w,w*.24)}
   if(rnd()<.11)luci.push(stStazVec(la+(rnd()-.5)*dLat*.7,lo+rnd()*dLon));
  }
 }
 // solchi paralleli a nord e a sud (linee scure con il bordo chiaro)
 const solco=(lat,w,scuro)=>{
  g.lineCap='round';
  for(const [d,st] of [[0,scuro],[1,'rgba(190,205,225,.22)']]){
   g.strokeStyle=st;g.lineWidth=Math.max(1,w*(d?.35:1));g.beginPath();let on=false;
   for(let lo=-Math.PI;lo<=Math.PI+.01;lo+=.03){const m=stStazVec(lat+(d?w/R*.9:0),lo),v=V(m);
    if(v[2]<0||angD(m)<DA*1.02){on=false;continue}const p=P(v);on?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]);on=true}
   g.stroke();
  }
 };
 solco(.43,R*.012,'#040609');solco(-.43,R*.012,'#040609');solco(.86,R*.008,'#05070a');
 // cintura equatoriale: una trincea profonda con file di luci
 {
  const w=.05;g.fillStyle='#030508';g.beginPath();let first=true;
  const up=[],dn=[];for(let lo=-Math.PI;lo<=Math.PI+.01;lo+=.03){const a=V(stStazVec(w,lo)),b=V(stStazVec(-w,lo));if(a[2]>-.02)up.push(P(a));if(b[2]>-.02)dn.push(P(b))}
  for(const p of up){first?g.moveTo(p[0],p[1]):g.lineTo(p[0],p[1]);first=false}for(let i=dn.length-1;i>=0;i--)g.lineTo(dn[i][0],dn[i][1]);g.closePath();g.fill();
  // parete interna in ombra, più chiara verso la luce
  for(let lo=-Math.PI;lo<=Math.PI;lo+=.045){const m=stStazVec(-w*.2,lo),v=V(m);if(v[2]<.05)continue;const p=P(v);
   const a=.25+Math.max(0,luce(v))*.6;g.fillStyle='rgba(90,100,115,'+a.toFixed(2)+')';g.fillRect(p[0]-R*.006,p[1]-R*.012,R*.012*Math.max(.3,v[2]),R*.02)}
  for(let lo=-Math.PI;lo<=Math.PI;lo+=.02){const v=V(stStazVec(rnd()<.5?w*.55:-w*.55,lo));if(v[2]<.08||rnd()<.35)continue;const p=P(v),s=Math.max(.6,R*.0055*v[2]);
   g.fillStyle=rnd()<.8?'rgba(255,214,150,.9)':'rgba(140,220,255,.9)';g.fillRect(p[0]-s,p[1]-s*.5,s*2,s)}
 }
 // corona di torri al polo nord
 for(let i=0;i<9;i++){const lo=i/9*Math.PI*2,m=stStazVec(1.28,lo),v=V(m);if(v[2]<.05)continue;
  const p=P(v),q=P(V(stStazVec(1.36,lo))),hgt=R*.06*v[2],wd=R*.013;
  g.fillStyle=col(v,1.15);g.fillRect(p[0]-wd/2,p[1]-hgt,wd,hgt);g.fillStyle='#0a0d12';g.fillRect(p[0]-wd/2,p[1]-hgt*.25,wd,hgt*.25);
  g.fillStyle='rgba(255,90,70,.95)';g.fillRect(p[0]-wd*.3,p[1]-hgt-wd*.6,wd*.6,wd*.6);void q;}
 // l'Iride: cratere esagonale con anelli, sei lame e l'emettitore al centro
 const esa=(a,rot)=>{const pts=[];for(let k=0;k<6;k++){const a0=rot+k*Math.PI/3,a1=a0+Math.PI/3;
  for(let s=0;s<8;s++){const t=s/8,an=a0+(a1-a0)*t,ca=Math.cos(a0),sa=Math.sin(a0),cb=Math.cos(a1),sb=Math.sin(a1);
   const x=ca+(cb-ca)*t,y=sa+(sb-sa)*t,rr=Math.hypot(x,y);pts.push(P(V(suDisco(a*rr,Math.atan2(y,x)))));void an}}return pts};
 const poly=(pts)=>{g.beginPath();pts.forEach((p,j)=>j?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()};
 const rot=.25,dv=V(dc),lD=luce(dv);
 poly(esa(DA*1.05,rot));g.fillStyle=col(dv,1.25);g.fill();                 // bordo rialzato
 poly(esa(DA*.97,rot));g.fillStyle='#07090d';g.fill();
 for(let i=0;i<7;i++){const a=DA*(.93-i*.12);poly(esa(a,rot));
  // cratere concavo: il lato opposto alla luce è quello illuminato
  const lp=P(V(suDisco(a*.6,Math.PI*1.25))),dp=P(V(suDisco(a*.6,Math.PI*.25)));
  const gr=g.createLinearGradient(dp[0],dp[1],lp[0],lp[1]);const b=Math.round(40+i*7+lD*30);
  gr.addColorStop(0,'rgb('+(b+40)+','+(b+44)+','+(b+52)+')');gr.addColorStop(1,'rgb('+(b*.35|0)+','+(b*.37|0)+','+(b*.42|0)+')');
  g.fillStyle=gr;g.fill();g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=Math.max(1,R*.004);g.stroke()}
 const vx=[];
 for(let k=0;k<6;k++){const an=rot+k*Math.PI/3,a=P(V(suDisco(DA*.95,an))),b=P(V(suDisco(DA*.16,an)));vx.push(a);
  g.strokeStyle='#05070a';g.lineWidth=Math.max(1.5,R*.016);g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
  g.strokeStyle='rgba(200,215,235,.35)';g.lineWidth=Math.max(1,R*.005);g.stroke();
  g.fillStyle='rgba(255,70,50,.95)';const s=Math.max(1,R*.009);g.fillRect(a[0]-s,a[1]-s,s*2,s*2)}
 const ec=P(dv);
 {const r0=R*DA*.17;const gr=g.createRadialGradient(ec[0],ec[1],0,ec[0],ec[1],r0);gr.addColorStop(0,'#ffd0b0');gr.addColorStop(.35,'#ff3a24');gr.addColorStop(1,'#3a0705');
  g.fillStyle=gr;g.beginPath();g.ellipse(ec[0],ec[1],r0,r0*Math.max(.35,dv[2]),Math.atan2(dv[1],-dv[0])+Math.PI/2,0,Math.PI*2);g.fill()}
 // ombra morbida verso il lato notte + riflesso sul lato del sole
 {const gr=g.createRadialGradient(cx-R*.45,cy-R*.4,R*.05,cx-R*.1,cy-R*.05,R*1.45);
  gr.addColorStop(0,'rgba(220,235,255,.16)');gr.addColorStop(.45,'rgba(0,0,0,0)');gr.addColorStop(.8,'rgba(1,3,8,.55)');gr.addColorStop(1,'rgba(1,3,8,.9)');
  g.fillStyle=gr;g.fillRect(0,0,S,S)}
 // luci delle finestre sul lato in ombra
 for(const m of luci){const v=V(m);if(v[2]<.12||luce(v)>.12)continue;const p=P(v),s=Math.max(.5,R*.004*v[2]);
  g.fillStyle=rnd()<.85?'rgba(255,205,140,.85)':'rgba(150,215,255,.85)';g.fillRect(p[0]-s,p[1]-s,s*2,s*2)}
 g.restore();
 // bordo illuminato sottile dal lato del sole
 g.strokeStyle='rgba(205,225,245,.55)';g.lineWidth=Math.max(1,R*.012);g.beginPath();g.arc(cx,cy,R-g.lineWidth/2,Math.PI*.9,Math.PI*1.62);g.stroke();
 g.strokeStyle='rgba(205,225,245,.18)';g.lineWidth=Math.max(1,R*.006);g.beginPath();g.arc(cx,cy,R-g.lineWidth/2,Math.PI*.7,Math.PI*1.85);g.stroke();
 // bagliore dell'Iride (tela a parte, si accende piano mentre carica)
 const GR=Math.max(8,Math.round(Math.min(R*.75,90+R*.25))),gl=document.createElement('canvas');gl.width=gl.height=GR*2;const h=gl.getContext('2d');
 if(h){const gr=h.createRadialGradient(GR,GR,0,GR,GR,GR);gr.addColorStop(0,'rgba(255,220,190,.95)');gr.addColorStop(.12,'rgba(255,70,40,.75)');gr.addColorStop(.4,'rgba(200,20,10,.22)');gr.addColorStop(1,'rgba(120,0,0,0)');h.fillStyle=gr;h.fillRect(0,0,GR*2,GR*2)}
 // punto focale dei sei raggi, davanti al cratere (lungo la sua normale)
 const fv=add(dv,dv,.28),fp=[cx+R*fv[0],cy-R*fv[1]];
 return{cv:c,...meta,glow:gl,GR,gx:ec[0],gy:ec[1],vx,fx:fp[0],fy:fp[1],dir:nor([dv[0],-dv[1]])};
}
// stato della carica in un ciclo: 0..1 mentre carica, poi i raggi convergono e parte il colpo
function stStazFase(t){
 const T=ST_STAZ,c=((t%T.giro)+T.giro)%T.giro;
 if(c<T.carica)return{c:Math.pow(c/T.carica,1.6),raggi:0,fuoco:0};
 if(c<T.carica+T.raggi)return{c:1,raggi:(c-T.carica)/T.raggi,fuoco:0};
 const f=(c-T.carica-T.raggi)/T.fuoco;
 if(f<1)return{c:1,raggi:1,fuoco:f};
 return{c:Math.max(0,1-(f-1)*T.fuoco/(T.giro-T.carica-T.raggi-T.fuoco)),raggi:0,fuoco:0};
}
function stStazDisegna(g,B,dt){
 if(!B.sz){
  const R=B.pl.width*.42;
  B.sz={sp:stStazSprite(R),t:0};
 }
 const Z=B.sz,sp=Z.sp;Z.t+=dt;
 const a=Math.max(0,Math.min(1,(Z.t-ST_STAZ.entra)/1.2));if(a<=0)return;
 // dove prima c'era LYRA: in basso a destra, sale piano
 const P=B.pl.width,x=B.W-P*.62+P/2-sp.S/2,y=B.H-P*.4-Math.min(B.t,150)*1.1*B.d+P/2-sp.S/2;
 g.globalAlpha=a;g.drawImage(sp.cv,x,y);
 const F=stStazFase(Z.t-ST_STAZ.entra-3);
 g.globalCompositeOperation='lighter';
 const pul=.85+.15*Math.sin(Z.t*7),s=(.35+F.c*.9)*pul;
 g.globalAlpha=a*Math.min(1,.18+F.c*.8);g.drawImage(sp.glow,x+sp.gx-sp.GR*s,y+sp.gy-sp.GR*s,sp.GR*2*s,sp.GR*2*s);
 if(F.raggi>0){
  const fx=x+sp.fx,fy=y+sp.fy,k=Math.min(1,F.raggi*1.4);
  const Rb=Math.min(sp.R,200);
  for(const [w,al] of [[Rb*.03,.18],[Rb*.009,.9]]){g.strokeStyle='rgba(255,'+(al>.5?150:60)+','+(al>.5?110:40)+','+(al*a).toFixed(2)+')';g.lineWidth=Math.max(1,w);
   g.beginPath();for(const v of sp.vx){const vx=x+v[0],vy=y+v[1];g.moveTo(vx,vy);g.lineTo(vx+(fx-vx)*k,vy+(fy-vy)*k)}g.stroke()}
  if(F.raggi>.6){const q=(F.raggi-.6)/.4*sp.GR*.5;g.globalAlpha=a;g.drawImage(sp.glow,fx-q,fy-q,q*2,q*2)}
 }
 if(F.fuoco>0){
  // il colpo: un raggio rosso che parte dal fuoco e sparisce oltre il bordo dello schermo
  const fx=x+sp.fx,fy=y+sp.fy,d=sp.dir,len=Math.max(B.W,B.H)*1.5,e=Math.sin(Math.PI*Math.min(1,F.fuoco));
  const ex=fx+d[0]*len*Math.min(1,F.fuoco*3),ey=fy+d[1]*len*Math.min(1,F.fuoco*3);
  const Rb=Math.min(sp.R,200);
  for(const [w,c] of [[Rb*.09,'rgba(255,40,20,'],[Rb*.04,'rgba(255,110,70,'],[Rb*.012,'rgba(255,235,220,']]){
   g.strokeStyle=c+(.85*e*a).toFixed(2)+')';g.lineWidth=Math.max(1,w*(.6+.4*e));g.lineCap='round';g.beginPath();g.moveTo(fx,fy);g.lineTo(ex,ey);g.stroke()}
  const q=sp.GR*(.6+e*.5);g.globalAlpha=a*e;g.drawImage(sp.glow,fx-q,fy-q,q*2,q*2);
 }
 g.globalCompositeOperation='source-over';g.globalAlpha=1;
}
// NEMESI prende il posto di LYRA in basso a destra (Fabio, 11-11): stesso punto, stessa grandezza,
// sale piano come faceva il pianeta. LYRA qui non si disegna e la sua mappa non si calcola più
// (il codice di LYRA resta sopra, pronto se servisse di nuovo).
stLyraTex=function(){};
stDisegna=function(dt){
 const c=$('storiaCanvas');if(!c||!c.getContext)return;
 const w=innerWidth,h=innerHeight;
 if(!STORIA.bg||STORIA.bg.cw!==w||STORIA.bg.ch!==h){STORIA.bg=stSfondo(w,h);STORIA.bg.cw=w;STORIA.bg.ch=h;STORIA.bg.t=0;c.width=STORIA.bg.W;c.height=STORIA.bg.H}
 const B=STORIA.bg,g=c.getContext('2d');if(!g)return;
 B.t+=dt;
 g.drawImage(B.base,0,0);
 for(const [L,v] of [[B.far,4],[B.mid,9],[B.near,18]]){
  const y=(B.t*v*B.d)%B.H;g.drawImage(L,0,y-B.H);g.drawImage(L,0,y);
 }
 try{stStazDisegna(g,B,dt)}catch(e){}
};
