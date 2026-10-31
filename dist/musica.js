// Frontiera Stellare — COLONNA SONORA procedurale (dal motore "NEXUS-V" di Fabio).
// Basso, arpeggiatore, batteria e pad generati in tempo reale con Web Audio.
// Tre intensità che seguono il gioco: CALMA (mappa e atterraggio), BATTAGLIA (volo e missione a terra),
// BOSS (ingresso nell'atmosfera e scontro con il robot finale). Ogni pianeta ha una tonalità diversa.
// Usa lo stesso audio del gioco: se l'audio di bordo è spento, tace anche la musica.

const MUS_SCALE={
 bass:[55,65.41,73.42,82.41,92.5,110],
 arp:[220,246.94,261.63,293.66,329.63,349.23,392,440,523.25,659.25],
 pad:[110,164.81,220,329.63,440]
};
const MUS_BPM={calm:104,battle:130,boss:152};
const MUS_VOL={calm:.16,battle:.2,boss:.22};
const mus={on:localStorage.getItem('frontieraMusica')!=='off',bus:null,noise:null,step:0,next:0,level:'calm',timer:null,key:1};

function musCtx(){
 if(!mus.on||typeof audio!=='function')return null;
 const a=audio();if(!a)return null;
 if(!mus.bus){mus.bus=a.createGain();mus.bus.gain.value=0;mus.bus.connect(a.destination);
  const n=a.createBuffer(1,a.sampleRate,a.sampleRate),d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;mus.noise=n}
 return a;
}
// Intensità decisa dallo stato del gioco.
function musLevel(){
 if(state==='platform'&&typeof pf!=='undefined'&&pf){if(pf.phase==='boss')return'boss';if(pf.phase==='atterraggio'||pf.phase==='vittoria')return'calm';return'battle'}
 if(state==='play'||state==='dying'){if(typeof nearAtmosphere==='function'&&nearAtmosphere())return'boss';return'battle'}
 if(state==='orbit')return'battle';
 return'calm';
}
function musKey(){const p=typeof planets!=='undefined'&&planets[selected];const i=p?planets.indexOf(p):0;return Math.pow(2,[0,3,-2,5,-4,1][i%6]/12)}

// ---- strumenti (tutti programmati a un istante t preciso)
function musOsc(a,type,f0,t,dur,vol,f1,filter){
 const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f0,t);if(f1)o.frequency.exponentialRampToValueAtTime(f1,t+dur*.8);
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
 if(filter){filter.connect(g)}g.connect(mus.bus);(filter?o.connect(filter):o.connect(g));o.start(t);o.stop(t+dur+.02);
}
function musNoise(a,t,dur,vol,type,freq){
 const s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain();s.buffer=mus.noise;f.type=type;f.frequency.value=freq;
 g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(mus.bus);s.start(t,Math.random()*.5,dur+.02);
}
function musKick(a,t,mul){musOsc(a,'sine',150*mul,t,.15,.9,35)}
function musBass(a,t,f,level){const flt=a.createBiquadFilter();flt.type='lowpass';flt.Q.value=6;flt.frequency.setValueAtTime(level==='boss'?1200:500,t);flt.frequency.exponentialRampToValueAtTime(150,t+.2);musOsc(a,level==='boss'?'sawtooth':'square',f,t,.25,.35,0,flt)}
function musArp(a,t,f){musOsc(a,'sawtooth',f,t,.12,.12)}
function musPad(a,t,f){const o=a.createOscillator(),g=a.createGain();o.type='sine';o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.2,t+1);g.gain.linearRampToValueAtTime(.001,t+3.5);o.connect(g);g.connect(mus.bus);o.start(t);o.stop(t+3.6)}

// Un passo del sequencer (sedicesimi, ciclo di 32), come nel motore originale.
function musStep(a,step,t,level){
 const k=mus.key;
 if(step%4===0||(level!=='calm'&&(step%4===2||step===14||step===30)))musKick(a,t,level==='boss'?1.2:.8);
 if(level!=='calm'&&(step%8===4||(level==='boss'&&step%2===1)))musNoise(a,t,.1,.4,'highpass',800);
 if(step%2===0||level==='boss')musNoise(a,t,.04,.15,'bandpass',7000);
 if(step%2===0)musBass(a,t,MUS_SCALE.bass[Math.floor((step/2)%MUS_SCALE.bass.length)]*k,level);
 if(level!=='calm'&&(step%2===0||level==='boss'))musArp(a,t,MUS_SCALE.arp[Math.floor(Math.random()*MUS_SCALE.arp.length)]*k);
 if(step===0||step===16)musPad(a,t,MUS_SCALE.pad[Math.floor(Math.random()*MUS_SCALE.pad.length)]*k);
}
// Programma le note con un piccolo anticipo: il ritmo resta stabile anche se il gioco rallenta.
function musTick(){
 const a=musCtx(),quiet=!a||paused||document.hidden;
 if(!a)return;
 const level=musLevel(),target=quiet?0:MUS_VOL[level];
 if(level!==mus.level){mus.level=level}
 mus.bus.gain.setTargetAtTime(target,a.currentTime,.4);
 if(quiet){mus.next=0;return}
 mus.key=musKey();
 const dt=60/MUS_BPM[level]/4;
 if(mus.next<a.currentTime)mus.next=a.currentTime+.05;
 while(mus.next<a.currentTime+.15){musStep(a,mus.step,mus.next,level);mus.step=(mus.step+1)%32;mus.next+=dt}
}
function setMusic(on){
 mus.on=on;localStorage.setItem('frontieraMusica',on?'on':'off');
 const b=$('musicToggle');if(b){b.classList.toggle('active',on);b.setAttribute('aria-checked',String(on));const s=b.querySelector('span');if(s)s.textContent=on?'ATTIVA':'DISATTIVATA'}
 if(!on&&mus.bus&&audioCtx)mus.bus.gain.setTargetAtTime(0,audioCtx.currentTime,.1);
}
{const b=$('musicToggle');if(b)b.onclick=()=>setMusic(!mus.on)}
addEventListener('keydown',e=>{if(e.code==='KeyM'&&!e.repeat){setMusic(!mus.on);if(typeof status==='function'&&state==='play')status(mus.on?'MUSICA ATTIVA':'MUSICA DISATTIVATA',1200)}});
setMusic(mus.on);
mus.timer=setInterval(musTick,25);
