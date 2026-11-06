// Original ambient score: layered pads, deep roots and a sparse orbital melody.
// Notes are scheduled on the audio clock, independent of rendering frame rate.
let musicEnabled=localStorage.getItem('frontieraMusic')!=='off';
let musicGain=null,musicNext=0,musicStep=0,musicRunning=false;
const MUSIC_STEP=60/76/2;
const MUSIC_CHORDS=[[52,55,59,66],[48,52,55,62],[45,48,52,59],[50,54,57,64]];
function musicNote(midi,start,duration,volume,kind='sine'){
 const oscillator=audioCtx.createOscillator(),gain=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();
 oscillator.type=kind;oscillator.frequency.setValueAtTime(440*2**((midi-69)/12),start);
 filter.type='lowpass';filter.frequency.value=kind==='triangle'?950:1800;
 gain.gain.setValueAtTime(.0001,start);
 gain.gain.linearRampToValueAtTime(volume,start+Math.min(.9,duration*.25));
 gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
 oscillator.connect(filter);filter.connect(gain);gain.connect(musicGain);
 oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect()};
 oscillator.start(start);oscillator.stop(start+duration+.04);
}
function updateSoundtrack(){
 if(!audioCtx)return;
 if(!musicGain){musicGain=audioCtx.createGain();musicGain.gain.value=0;musicGain.connect(audioBus)}
 const audible=musicEnabled&&soundEnabled&&!document.hidden;
 musicGain.gain.setTargetAtTime(audible?(paused?.15:state==='map'?.52:state==='play'||state==='platform'?.32:.4):0,audioCtx.currentTime,.35);
 if(!audible){musicRunning=false;return}
 if(!musicRunning||musicNext<audioCtx.currentTime-.2){musicNext=audioCtx.currentTime+.05;musicRunning=true}
 while(musicNext<audioCtx.currentTime+.25){
  const chord=MUSIC_CHORDS[Math.floor(musicStep/16)%MUSIC_CHORDS.length],within=musicStep%16;
  if(within===0){chord.forEach((note,i)=>musicNote(note,musicNext+i*.035,MUSIC_STEP*17,.008,i%2?'triangle':'sine'));musicNote(chord[0]-12,musicNext,MUSIC_STEP*15,.012)}
  if(within%4===2){const melody=[2,3,1,2][Math.floor(within/4)];musicNote(chord[melody]+12,musicNext,MUSIC_STEP*3.6,.012)}
  musicStep++;musicNext+=MUSIC_STEP;
 }
}
function syncMusicToggle(){const button=$('musicToggle');if(!button)return;button.classList.toggle('active',musicEnabled);button.setAttribute('aria-checked',String(musicEnabled));button.querySelector('span').textContent=musicEnabled?'ATTIVA':'DISATTIVATA'}
function toggleMusic(){musicEnabled=!musicEnabled;localStorage.setItem('frontieraMusic',musicEnabled?'on':'off');if(musicEnabled&&soundEnabled)audio();syncMusicToggle();updateSoundtrack()}
const musicButton=$('musicToggle');if(musicButton)musicButton.onclick=toggleMusic;
syncMusicToggle();
addEventListener('pointerdown',()=>{if(musicEnabled&&soundEnabled){audio();updateSoundtrack()}},{once:true});
document.addEventListener('visibilitychange',()=>updateSoundtrack());
