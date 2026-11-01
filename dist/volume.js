// Volume di musica ed effetti sonori, regolabile nelle impostazioni e salvato nel browser.
// La musica parte più bassa (40%) per non coprire gli effetti.
const VOLUME_DEFAULT={music:40,sfx:100};
const VOLUME_KEY={music:'stellarVolumeMusica',sfx:'stellarVolumeEffetti'};
function volumePercent(kind){
 let v=null;try{v=localStorage.getItem(VOLUME_KEY[kind])}catch(e){}
 const n=v===null?NaN:Number(v);return Number.isFinite(n)?Math.max(0,Math.min(100,n)):VOLUME_DEFAULT[kind];
}
function volumeLevel(kind){return volumePercent(kind)/100}
function setVolume(kind,percent){
 percent=Math.max(0,Math.min(100,Math.round(+percent||0)));
 try{localStorage.setItem(VOLUME_KEY[kind],String(percent))}catch(e){}
 const id=kind==='music'?'music':'sfx',input=$(id+'Volume'),out=$(id+'VolumeVal');
 if(input&&+input.value!==percent)input.value=String(percent);if(out)out.textContent=percent+'%';
 if(input&&input.style)input.style.setProperty('--fill',percent+'%');
 // Effetti: subito sul volume generale degli effetti. Musica: la applica musTick al prossimo giro.
 if(kind==='sfx'&&typeof sfxOutput!=='undefined'&&sfxOutput&&typeof audioCtx!=='undefined'&&audioCtx)sfxOutput.gain.setTargetAtTime(.75*percent/100,audioCtx.currentTime,.05);
}
for(const kind of['music','sfx']){
 const input=$(kind+'Volume');setVolume(kind,volumePercent(kind));
 if(input){input.oninput=()=>setVolume(kind,input.value);if(kind==='sfx')input.onchange=()=>{if(typeof sfx==='function')sfx('ui')}}
}
