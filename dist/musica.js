// Stellar Frontier — COLONNA SONORA.
// 1) Brani registrati di Fabio (cartella musica/, vedi MUS_TRACKS): menu, volo, avvicinamento al pianeta,
//    fase a terra e boss. Si alternano in dissolvenza seguendo il gioco.
// 2) Orchestra procedurale (Web Audio, nessun file): suona dove non c'è un brano (vittoria) e fa da riserva
//    se i file non si caricano o se il gioco è aperto direttamente da disco (file://).
// L'orchestra nasce dal motore "NEXUS-V" di Fabio: stesso sequencer a sedicesimi, ma ora con un'orchestra sintetica
// (archi, ottoni, corni, coro, arpa, taiko, timpani, piatti) e sei brani composti, legati da un tema
// principale ("l'Eroe") che ritorna in più brani:
//   menu      INNO DELLA REPUBBLICA  mappa e schermate (lento e solenne, corno e coro)
//   spazio    ROTTA DI FUOCO         fase 1 in volo (ostinato d'archi, taiko, ottoni; coro vicino al pianeta)
//   terra     MARCIA DELLA COLONIA   fase 2 a terra (rullante da marcia, ottoni)
//   boss      IL TITANO              scontro con il boss di ogni pianeta
//   omega     ABISSO CREMISI         pianeta finale OMEGA: atmosfera e IMPERATORE OMEGA
//   vittoria  GLORIA                 colonia liberata e missione vinta
// Tre intensità (calm, battle, boss) aggiungono o tolgono strumenti dentro lo stesso brano.
// I cambi di brano sfumano in dissolvenza; ogni pianeta suona in una tonalità diversa.
// Usa lo stesso audio del gioco: se l'audio di bordo è spento, tace anche la musica.

const MUS_MASTER=.34;
const MUS_VOL={calm:.75,battle:.9,boss:1};
const MUS_CHORD={m:[0,3,7],M:[0,4,7],s:[0,5,7]};
const MUS_SHIFT=[0,3,-2,5,-4,1];

// Melodie: coppie [semitoni sopra la tonica, durata in ottavi]. Ognuna copre 8 battute (64 ottavi).
const MUS_MOTIF={
 eroe:[[7,2],[12,3],[14,1],[15,2], [15,3],[12,1],[8,4], [7,3],[10,1],[15,4], [14,6],[10,2],
       [7,2],[12,3],[14,1],[15,2], [17,3],[15,1],[20,4], [22,2],[19,2],[17,2],[14,2], [11,4],[7,4]],
 marcia:[[7,3],[7,1],[10,2],[12,2], [14,3],[12,1],[10,4], [12,2],[15,2],[20,2],[19,2], [17,6],[14,2],
         [7,3],[7,1],[10,2],[12,2], [14,3],[15,1],[17,4], [19,3],[17,1],[15,2],[12,2], [14,2],[11,2],[7,4]],
 titano:[[0,1],[0,1],[3,1],[0,1],[7,2],[6,2], [8,2],[7,2],[3,2],[0,2], [5,1],[5,1],[8,1],[5,1],[12,2],[10,2], [11,4],[7,4],
         [12,2],[15,2],[14,2],[12,2], [13,4],[8,4], [12,2],[7,2],[3,2],[0,2], [11,2],[14,2],[19,4]],
 abisso:[[15,2],[14,2],[15,2],[12,2], [14,2],[10,2],[12,4], [15,3],[17,1],[15,2],[12,2], [11,4],[7,4],
         [15,2],[14,2],[15,2],[12,2], [13,4],[8,4], [12,2],[15,2],[20,4], [19,4],[11,4]],
 gloria:[[7,1],[7,1],[7,1],[12,5], [11,2],[14,2],[19,4], [16,3],[14,1],[12,2],[9,2], [12,6],[9,2],
         [7,1],[7,1],[7,1],[12,3],[16,2], [17,4],[21,4], [19,3],[17,1],[14,2],[11,2], [12,8]]
};

// Brani. prog: 8 accordi [semitoni dalla tonica, tipo], uno per battuta.
// pat: 16 sedicesimi per battuta. Tamburi: X forte, x piano. ost/basso/arpa: cifra = nota dell'accordo
// (0 fondamentale, 1 terza, 2 quinta, 3 ottava, 4 terza all'ottava). fill: variante nell'ultima battuta.
// layers: strumenti attivi per intensità. mel: 'sempre' oppure 'alterna' (giri dispari, sempre in intensità boss).
const MUS_EROE=[[0,'m'],[8,'M'],[3,'M'],[10,'M'],[0,'m'],[8,'M'],[10,'M'],[7,'M']];
const MUS_SONGS={
 menu:{bpm:72,root:57,mo:0,prog:MUS_EROE,motif:'eroe',leads:['corno','violini'],mel:'sempre',
  pat:{taiko:'X...............',basso:'0.......2.......',arpa:'0.1.2.3.4.3.2.1.'},
  layers:{calm:['archi','coro','basso','arpa','taiko','melodia']}},
 spazio:{bpm:124,root:50,prog:MUS_EROE,motif:'eroe',leads:['ottoni','violini'],mel:'alterna',
  pat:{taiko:'X..x..X...X..x..',rullante:'....x.......x...',charleston:'x.x.x.x.x.x.x.x.',ost:'0102010301020103',basso:'0..0..0.0..0..0.'},
  fill:{taiko:'X.x.X.x.XxXxXXXX',rullante:'....x...x.xxXXXX'},
  layers:{calm:['archi','ost','basso','swell'],battle:['archi','ost','basso','taiko','charleston','melodia','fanfara','swell'],
   boss:['archi','coro','ost','basso','taiko','rullante','charleston','melodia','fanfara','braam','swell']}},
 terra:{bpm:136,root:52,prog:[[0,'m'],[10,'M'],[8,'M'],[10,'M'],[0,'m'],[10,'M'],[8,'M'],[7,'M']],motif:'marcia',leads:['ottoni','violini'],mel:'sempre',
  pat:{taiko:'X.......X.x.....',rullante:'X.xx..x.X.xx.xxx',ost:'0.0.2.0.3.0.2.0.',basso:'0.0.0.0.0.0.0.2.',arpa:'0...2...3...2...'},
  fill:{taiko:'X...X...X.X.XXXX',rullante:'XxxxXxxxXxXxXXXX'},
  layers:{calm:['archi','arpa','basso','melodia'],battle:['archi','ost','basso','taiko','rullante','melodia','fanfara','swell'],
   boss:['archi','coro','ost','basso','taiko','rullante','melodia','fanfara','braam','swell']}},
 boss:{bpm:152,root:48,prog:[[0,'m'],[8,'M'],[5,'m'],[7,'M'],[0,'m'],[1,'M'],[0,'m'],[7,'M']],motif:'titano',leads:['ottoni','coro'],mel:'sempre',
  pat:{taiko:'X.x.X.x.X.x.X.xx',rullante:'....X.......X...',charleston:'xxxxxxxxxxxxxxxx',ost:'0003000200030002',basso:'0.00.00.0.00.00.'},
  fill:{taiko:'XxXxXxXxXXXXXXXX',rullante:'....X...XxXxXXXX'},
  layers:{boss:['archi','coro','ost','basso','taiko','rullante','charleston','melodia','fanfara','braam','swell']}},
 omega:{bpm:92,root:46,prog:[[0,'m'],[10,'M'],[8,'M'],[7,'M'],[0,'m'],[1,'M'],[8,'M'],[7,'M']],motif:'abisso',leads:['coro','ottoni'],mel:'sempre',
  pat:{taiko:'X.....X...X.....',rullante:'....X.......X...',charleston:'..x...x...x...x.',ost:'0101010101010101',basso:'0.....0...0.....'},
  fill:{taiko:'X.X.X.X.XXXXXXXX'},
  layers:{boss:['archi','coro','ost','basso','taiko','rullante','charleston','melodia','fanfara','braam','swell']}},
 vittoria:{bpm:100,root:48,prog:[[0,'M'],[7,'M'],[9,'m'],[5,'M'],[0,'M'],[5,'M'],[7,'M'],[0,'M']],motif:'gloria',leads:['ottoni','violini'],mel:'sempre',
  pat:{taiko:'X.......X.......',rullante:'....x.......x...',basso:'0...2...0...2...',arpa:'0.1.2.3.4.3.2.1.'},
  layers:{calm:['archi','coro','basso','arpa','taiko','rullante','melodia','fanfara']}}
};
// Melodie indicizzate per ottavo, calcolate una volta.
for(const S of Object.values(MUS_SONGS)){S.melMap={};let e=0;for(const[n,d]of MUS_MOTIF[S.motif]){S.melMap[e]=[n,d];e+=d}S.melLen=e}

const mus={on:localStorage.getItem('frontieraMusica')!=='off',bus:null,noise:null,voice:null,song:null,step:0,loop:0,next:0,level:'calm',shift:0,timer:null,tracks:{},track:null,quiet:false};

function musCtx(){
 if(!mus.on||typeof audio!=='function')return null;
 const a=audio();if(!a)return null;
 if(!mus.bus)musBuild(a);
 return a;
}
// Volume generale → uscita. La musica sintetica passa da compressore e riverbero da sala da concerto;
// i brani registrati arrivano direttamente al volume generale.
function musBuild(a){
 mus.bus=a.createGain();mus.bus.gain.value=0;mus.bus.connect(a.destination);
 const comp=a.createDynamicsCompressor();comp.threshold.value=-18;comp.ratio.value=4;comp.attack.value=.01;comp.release.value=.3;comp.connect(mus.bus);
 mus.synth=a.createGain();mus.synth.connect(comp);
 const n=a.createBuffer(1,a.sampleRate*2,a.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;mus.noise=n;
 if(a.createConvolver){
  const len=Math.floor(a.sampleRate*3.2),ir=a.createBuffer(2,len,a.sampleRate);
  for(let c=0;c<2;c++){const x=ir.getChannelData(c);for(let i=0;i<len;i++)x[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}
  const verb=a.createConvolver(),wet=a.createGain();verb.buffer=ir;wet.gain.value=.32;mus.synth.connect(verb);verb.connect(wet);wet.connect(comp);
 }
 mus.a=a;
}

// ---- brani registrati di Fabio (cartella musica/). Ogni scena ha il suo; dove manca, o se un file
// non si carica, suona la musica sintetica qui sotto. Ogni brano gira in loop con una dissolvenza incrociata.
const MUS_TRACKS={
 menu:'musica/oltre-le-stelle.mp3',      // Oltre le Stelle: mappa e schermate
 spazio:'musica/assalto-orbitale.mp3',   // Assalto Orbitale: fase 1 in volo
 soglia:'musica/soglia-ostile.mp3',      // Soglia Ostile: vicino al pianeta, flotta di guardia e meteoriti
 terra:'musica/fuoco-sul-pianeta.mp3',   // Fuoco sul Pianeta: fase 2 a terra
 boss:'musica/boss-soglia-ostile.mp3'    // Soglia Ostile (boss): boss di ogni pianeta e IMPERATORE OMEGA
};
const MUS_TRACK_GAIN=2.2,MUS_XFADE=1.2;
function musTrackId(song,level){
 if(song==='spazio')return level==='boss'?'soglia':'spazio';
 if(song==='omega')return'boss';
 return MUS_TRACKS[song]?song:null;
}
function musTracksOk(){return typeof Audio==='function'&&typeof location!=='undefined'&&location.protocol!=='file:'}
// Due lettori per brano: mentre uno finisce, l'altro riparte da capo in dissolvenza.
function musTrack(a,id){
 const T=mus.tracks[id];if(T)return T;
 if(!musTracksOk()||!a.createMediaElementSource)return null;
 const t={id,els:[],gains:[],cur:0,ready:false,failed:false,born:performance.now()};
 for(let i=0;i<2;i++){
  const el=new Audio();el.preload='auto';el.src=MUS_TRACKS[id];
  try{const src=a.createMediaElementSource(el),g=a.createGain();g.gain.value=0;src.connect(g);g.connect(mus.bus);t.els.push(el);t.gains.push(g)}catch(e){t.failed=true}
  el.addEventListener('canplaythrough',()=>{t.ready=true});el.addEventListener('error',()=>{t.failed=true});
 }
 return mus.tracks[id]=t;
}
function musTrackPlay(a,T){
 const el=T.els[T.cur],g=T.gains[T.cur];
 g.gain.cancelScheduledValues(a.currentTime);g.gain.setTargetAtTime(MUS_TRACK_GAIN,a.currentTime,.35);
 if(el.paused){T.blocked=false;const p=el.play();if(p&&p.catch)p.catch(()=>{T.blocked=true})}
}
function musTrackStop(a,T,fade=.4){
 for(let i=0;i<T.els.length;i++){const g=T.gains[i],el=T.els[i];g.gain.cancelScheduledValues(a.currentTime);g.gain.setTargetAtTime(0,a.currentTime,fade);
  clearTimeout(el._stop);el._stop=setTimeout(()=>{if(mus.track!==T||mus.quiet)el.pause()},fade*6000)}
}
// Loop: poco prima della fine parte l'altro lettore dall'inizio.
function musTrackLoop(a,T){
 const el=T.els[T.cur];if(!el.duration||el.paused)return;
 if(el.currentTime>el.duration-MUS_XFADE){
  const old=T.gains[T.cur];old.gain.setTargetAtTime(0,a.currentTime,MUS_XFADE/3);
  T.cur=1-T.cur;const nx=T.els[T.cur];clearTimeout(nx._stop);nx.currentTime=0;musTrackPlay(a,T);
 }
}
// Su telefono i lettori vanno "sbloccati" da un tocco: al primo gesto si preparano tutti i brani.
function musUnlock(){
 const a=musCtx();if(!a)return;
 // Un brano bloccato dal browser riparte al gesto successivo.
 if(mus.track&&mus.track.blocked&&!mus.quiet)musTrackPlay(a,mus.track);
 for(const id in MUS_TRACKS){const T=musTrack(a,id);if(!T||T.unlocked)continue;T.unlocked=true;
  for(const el of T.els){if(!el.paused)continue;const p=el.play();if(p&&p.then)p.then(()=>{if(mus.track!==T||el!==T.els[T.cur])el.pause()}).catch(()=>{})}}
}
for(const ev of['pointerdown','keydown','touchend'])addEventListener(ev,musUnlock,{passive:true});

// Intensità decisa dallo stato del gioco.
function musLevel(){
 if(state==='platform'&&typeof pf!=='undefined'&&pf){if(pf.phase==='boss')return'boss';if(pf.phase==='atterraggio'||pf.phase==='vittoria'||pf.phase==='sconfitta')return'calm';return'battle'}
 if(state==='play'||state==='dying'){if(typeof nearAtmosphere==='function'&&nearAtmosphere())return'boss';return'battle'}
 if(state==='orbit')return'battle';
 return'calm';
}
// Brano deciso dallo stato del gioco.
function musTheme(level=musLevel()){
 const p=typeof planets!=='undefined'&&planets[selected],fin=!!(p&&p.final);
 if(state==='platform'&&typeof pf!=='undefined'&&pf){if(pf.phase==='vittoria')return'vittoria';if(pf.phase==='boss')return fin?'omega':'boss';return'terra'}
 if(state==='won')return'vittoria';
 if(state==='play'||state==='dying'||state==='orbit'||state==='warp')return fin&&level==='boss'?'omega':'spazio';
 return'menu';
}
// Tonalità: ogni pianeta sposta il brano di qualche semitono (menu e OMEGA restano fissi).
function musShift(song){
 if(song==='menu'||song==='omega'||typeof planets==='undefined')return 0;
 const p=planets[selected];if(!p||p.final)return 0;
 return MUS_SHIFT[planets.indexOf(p)%MUS_SHIFT.length]||0;
}

// ---- strumenti: ogni nota è programmata a un istante t preciso e finisce nel brano corrente (mus.voice)
const musHz=n=>440*Math.pow(2,(n-69)/12);
function musGain(a,t,att,peak,hold,rel,dest){
 const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(peak,t+att);
 g.gain.setValueAtTime(peak,t+Math.max(att,hold));g.gain.exponentialRampToValueAtTime(.0001,t+Math.max(att,hold)+rel);g.connect(dest||mus.voice);
 g.end=t+Math.max(att,hold)+rel+.05;return g;
}
function musOscTo(a,type,n,t,end,dest,detune=0){
 const o=a.createOscillator();o.type=type;o.frequency.setValueAtTime(musHz(n),t);o.detune.setValueAtTime(detune,t);o.connect(dest);o.start(t);o.stop(end);return o;
}
function musFilter(a,type,freq,q,dest){const f=a.createBiquadFilter();f.type=type;f.frequency.value=freq;f.Q.value=q;f.connect(dest);return f}
function musVibrato(a,t,end,rate,cents,oscs){const l=a.createOscillator(),g=a.createGain();l.frequency.value=rate;g.gain.value=cents;l.connect(g);for(const o of oscs)g.connect(o.detune);l.start(t);l.stop(end)}
function musNoiseTo(a,t,dur,dest){const s=a.createBufferSource();s.buffer=mus.noise;s.connect(dest);s.start(t,Math.random()*.8,dur+.05)}

// Archi: accordo tenuto, due seghe leggermente scordate per voce.
function musStrings(a,t,notes,dur,vol){
 const g=musGain(a,t,.45,vol,dur,.9),f=musFilter(a,'lowpass',2100,.6,g),os=[];
 for(const n of notes){os.push(musOscTo(a,'sawtooth',n,t,g.end,f,-9),musOscTo(a,'sawtooth',n,t,g.end,f,9))}
 musVibrato(a,t,g.end,4.6,6,os);
}
// Coro "aah": seghe filtrate da due formanti vocali.
function musChoir(a,t,notes,dur,vol){
 const g=musGain(a,t,.6,vol*3.2,dur,1.2),f1=musFilter(a,'bandpass',720,5,g),f2=musFilter(a,'bandpass',1150,6,g),os=[];
 for(const n of notes)for(const d of[-11,11]){const o=musOscTo(a,'sawtooth',n,t,g.end,f1,d);o.connect(f2);os.push(o)}
 musVibrato(a,t,g.end,4.9,12,os);
}
// Ottoni: filtro che si apre all'attacco, come un ottone che "squilla".
function musBrass(a,t,notes,dur,vol){
 const g=musGain(a,t,.035,vol,dur,.22),f=musFilter(a,'lowpass',400,2,g);
 f.frequency.setValueAtTime(380,t);f.frequency.exponentialRampToValueAtTime(2800,t+.07);f.frequency.exponentialRampToValueAtTime(1300,t+.07+Math.min(dur,.6));
 const os=[];for(const n of notes){os.push(musOscTo(a,'sawtooth',n,t,g.end,f,-6),musOscTo(a,'sawtooth',n,t,g.end,f,6),musOscTo(a,'square',n-12,t,g.end,f))}
 if(dur>.4)musVibrato(a,t+.25,g.end,5.2,8,os);
}
// Corno: più morbido e rotondo degli ottoni.
function musHorn(a,t,n,dur,vol){
 const g=musGain(a,t,.12,vol,dur,.45),f=musFilter(a,'lowpass',900,1,g);f.frequency.setValueAtTime(700,t);f.frequency.linearRampToValueAtTime(1500,t+.2);
 const os=[musOscTo(a,'triangle',n,t,g.end,f),musOscTo(a,'sawtooth',n,t,g.end,f,4)];musVibrato(a,t+.3,g.end,5,9,os);
}
// Violini solisti: archi all'ottava con vibrato espressivo.
function musViolins(a,t,n,dur,vol){
 const g=musGain(a,t,.09,vol*.8,dur,.3),f=musFilter(a,'lowpass',3200,.7,g);
 const hi=n<72?n+12:n,lo=n<72?n:n-12,os=[musOscTo(a,'sawtooth',hi,t,g.end,f,-7),musOscTo(a,'sawtooth',hi,t,g.end,f,7),musOscTo(a,'sawtooth',lo,t,g.end,f)];musVibrato(a,t+.15,g.end,5.6,14,os);
}
function musLead(a,kind,t,n,dur,vol){
 if(kind==='corno')musHorn(a,t,n,dur,vol);else if(kind==='violini')musViolins(a,t,n,dur,vol);else if(kind==='coro')musChoir(a,t,[n],dur,vol*1.3);else musBrass(a,t,[n],dur,vol*.75);
}
// Ostinato d'archi staccato.
function musSpiccato(a,t,n,dur,vol){const g=musGain(a,t,.006,vol,.01,dur*.9),f=musFilter(a,'lowpass',1900,1,g);musOscTo(a,'sawtooth',n,t,g.end,f,-5);musOscTo(a,'sawtooth',n,t,g.end,f,5)}
function musHarp(a,t,n,vol){const g=musGain(a,t,.004,vol,.01,1.4);musOscTo(a,'triangle',n,t,g.end,g);const h=a.createGain();h.gain.value=.35;h.connect(g);musOscTo(a,'sine',n+12,t,g.end,h)}
function musBassNote(a,t,n,dur,vol){const g=musGain(a,t,.01,vol,dur*.6,dur*.5),f=musFilter(a,'lowpass',420,3,g);musOscTo(a,'sawtooth',n,t,g.end,f);musOscTo(a,'sine',n-12,t,g.end,g)}
// "Braam" da trailer: muro di ottoni gravi con il filtro che si apre e si richiude.
function musBraam(a,t,n,dur,vol){
 const g=musGain(a,t,.08,vol,dur*.5,dur*.6),f=musFilter(a,'lowpass',150,4,g);
 f.frequency.setValueAtTime(140,t);f.frequency.exponentialRampToValueAtTime(1700,t+.35);f.frequency.exponentialRampToValueAtTime(260,t+dur);
 for(const d of[-14,0,14])musOscTo(a,'sawtooth',n,t,g.end,f,d);musOscTo(a,'sawtooth',n+7,t,g.end,f);musOscTo(a,'square',n-12,t,g.end,f);
}
// Percussioni.
function musTaiko(a,t,vol,deep){
 const g=musGain(a,t,.003,vol,.01,deep?.75:.45),o=a.createOscillator();o.type='sine';o.frequency.setValueAtTime(deep?95:140,t);o.frequency.exponentialRampToValueAtTime(deep?38:60,t+.3);o.connect(g);o.start(t);o.stop(g.end);
 const n=musGain(a,t,.002,vol*.6,.01,.12);musNoiseTo(a,t,.14,musFilter(a,'lowpass',deep?380:700,1,n));
}
function musTimpani(a,t,n,vol){const g=musGain(a,t,.004,vol,.02,1.7),o=musOscTo(a,'sine',n,t,g.end,g);o.frequency.exponentialRampToValueAtTime(musHz(n)*.97,t+1.2);musOscTo(a,'sine',n+12,t,g.end,g,-8);const s=musGain(a,t,.002,vol*.4,.01,.15);musNoiseTo(a,t,.18,musFilter(a,'bandpass',220,1,s))}
function musSnare(a,t,vol){const g=musGain(a,t,.002,vol,.01,.16);musNoiseTo(a,t,.18,musFilter(a,'bandpass',2600,.8,g));const b=musGain(a,t,.002,vol*.7,.01,.07);musOscTo(a,'triangle',54,t,b.end,b)}
function musHat(a,t,vol){const g=musGain(a,t,.001,vol,.005,.035);musNoiseTo(a,t,.05,musFilter(a,'highpass',8000,.7,g))}
function musCrash(a,t,vol){const g=musGain(a,t,.003,vol,.02,2.4);musNoiseTo(a,t,1.95,musFilter(a,'highpass',4500,.5,g))}
// Piatto "al contrario" che cresce fino al giro successivo.
function musSwell(a,t,dur,vol){
 const g=a.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+dur);g.gain.linearRampToValueAtTime(.0001,t+dur+.03);g.connect(mus.voice);
 const f=musFilter(a,'highpass',1500,.7,g);f.frequency.setValueAtTime(1500,t);f.frequency.exponentialRampToValueAtTime(7000,t+dur);musNoiseTo(a,t,Math.min(dur,1.9),f);
}

// Un passo del sequencer (sedicesimi; un giro = 8 battute).
function musStep(a,step,t,song,level,loop){
 const S=MUS_SONGS[song],L=S.layers[level]||S.layers.battle||S.layers.boss||S.layers.calm,on=k=>L.includes(k);
 const bar=Math.floor(step/16),b=step%16,dt=60/S.bpm/4,barDur=dt*16,lastBar=bar===S.prog.length-1;
 const[cr,q]=S.prog[bar],root=S.root+mus.shift+cr,ch=MUS_CHORD[q],tone=i=>root+[0,ch[1],ch[2],12,ch[1]+12][i];
 const hit=k=>{const p=(lastBar&&S.fill&&S.fill[k])||S.pat[k]||'';return p[b]||'.'};
 const boss=level==='boss';
 if(b===0){
  if(step===0&&loop===0){if(on('taiko'))musTimpani(a,t,S.root+mus.shift-12,.5);if(song!=='menu')musCrash(a,t,.16)}
  else if(step===0&&on('taiko')&&level!=='calm')musCrash(a,t,.12);
  if(on('archi'))musStrings(a,t,[root,root+ch[1],root+ch[2],root+12],barDur,boss?.09:.075);
  if(on('coro'))musChoir(a,t,[root+12,root+12+ch[1],root+12+ch[2]],barDur,boss?.07:.05);
  if(on('fanfara')&&level!=='calm'&&(bar%2===0||boss))musBrass(a,t,[root,root+ch[1],root+ch[2]],dt*3,.06);
  if(on('braam')&&boss&&bar%4===0)musBraam(a,t,root-12,barDur*1.6,.12);
  if(lastBar&&on('swell'))musSwell(a,t,barDur,.1);
 }
 if(on('taiko')){const h=hit('taiko');if(h!=='.')musTaiko(a,t,(h==='X'?.55:.3)*(level==='calm'?.6:1),h==='X'&&b%8===0)}
 if(on('rullante')){const h=hit('rullante');if(h!=='.')musSnare(a,t,h==='X'?.22:.1)}
 if(on('charleston')&&hit('charleston')!=='.')musHat(a,t,.05);
 if(on('ost')){const h=S.pat.ost[b];if(h&&h!=='.')musSpiccato(a,t,tone(+h),dt,boss?.06:.045)}
 if(on('basso')){const h=S.pat.basso[b];if(h&&h!=='.')musBassNote(a,t,tone(+h)-12,dt*(S.bpm<90?6:2),.14)}
 if(on('arpa')&&S.pat.arpa){const h=S.pat.arpa[b];if(h&&h!=='.')musHarp(a,t,tone(+h)+12,.07)}
 // Melodia: sugli ottavi, a giri alterni per i brani d'azione (sempre al massimo dell'intensità).
 if(on('melodia')&&b%2===0&&(S.mel==='sempre'||boss||loop%2===1)){
  const m=S.melMap[bar*8+b/2];
  if(m){const kind=S.leads[loop%S.leads.length];musLead(a,kind,t,S.root+mus.shift+(S.mo??12)+m[0],m[1]*dt*2*.92,level==='calm'?.1:.12)}
 }
}

function musStart(a,song){
 if(mus.voice){const v=mus.voice;v.gain.setTargetAtTime(.0001,a.currentTime,.45);setTimeout(()=>{try{v.disconnect()}catch(e){}},4000)}
 mus.voice=a.createGain();mus.voice.gain.value=1;mus.voice.connect(mus.synth);
 mus.song=song;mus.step=0;mus.loop=0;mus.shift=musShift(song);
}
// Programma le note con un piccolo anticipo: il ritmo resta stabile anche se il gioco rallenta.
function musTick(){
 const a=musCtx();
 if(!a){if(mus.bus&&mus.a){mus.bus.gain.setTargetAtTime(0,mus.a.currentTime,.1);if(mus.track){musTrackStop(mus.a,mus.track,.1);mus.track=null}}return}
 const quiet=paused||document.hidden,level=musLevel(),song=musTheme(level);
 mus.level=level;
 mus.bus.gain.setTargetAtTime(quiet?0:MUS_MASTER*MUS_VOL[level],a.currentTime,.5);
 if(quiet!==mus.quiet){mus.quiet=quiet;if(mus.track){if(quiet)musTrackStop(a,mus.track,.3);else musTrackPlay(a,mus.track)}}
 if(quiet){mus.next=0;return}
 // Brano registrato, se c'è ed è pronto.
 const id=musTrackId(song,level),T=id&&musTrack(a,id),ok=T&&!T.failed;
 if(ok){
  // Tra volo e "soglia" si cambia al massimo ogni 4 secondi, per non saltare avanti e indietro.
  const now=a.currentTime,space=mus.track&&(mus.track.id==='spazio'||mus.track.id==='soglia')&&(id==='spazio'||id==='soglia');
  if(mus.track!==T&&!(space&&now-mus.switchAt<4)){if(mus.track)musTrackStop(a,mus.track,.5);mus.track=T;mus.switchAt=now;musTrackPlay(a,T)}
  if(mus.track){musTrackLoop(a,mus.track);if(mus.song){mus.voice.gain.setTargetAtTime(.0001,now,.4);mus.song=null}return}
 }
 if(mus.track){musTrackStop(a,mus.track,.5);mus.track=null}
 if(song!==mus.song){musStart(a,song);mus.next=Math.max(mus.next,a.currentTime+.08)}
 const S=MUS_SONGS[mus.song],dt=60/S.bpm/4,len=S.prog.length*16;
 if(mus.next<a.currentTime)mus.next=a.currentTime+.06;
 while(mus.next<a.currentTime+.2){musStep(a,mus.step,mus.next,mus.song,level,mus.loop);mus.step++;if(mus.step>=len){mus.step=0;mus.loop++}mus.next+=dt}
}
function setMusic(on){
 mus.on=on;localStorage.setItem('frontieraMusica',on?'on':'off');
 const b=$('musicToggle');if(b){b.classList.toggle('active',on);b.setAttribute('aria-checked',String(on));const s=b.querySelector('span');if(s)s.textContent=on?'ATTIVA':'DISATTIVATA'}
 if(!on&&mus.bus&&mus.a){mus.bus.gain.setTargetAtTime(0,mus.a.currentTime,.1);mus.song=null;if(mus.track){musTrackStop(mus.a,mus.track,.1);mus.track=null}}
}
{const b=$('musicToggle');if(b)b.onclick=()=>setMusic(!mus.on)}
addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat){setMusic(!mus.on);if(typeof status==='function'&&state==='play')status(mus.on?'MUSICA ATTIVA':'MUSICA DISATTIVATA',1200)}});
setMusic(mus.on);
mus.timer=setInterval(musTick,25);
