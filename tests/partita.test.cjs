// Comandi personalizzabili e partita salvata (2026-11-05).
// Eseguire dalla cartella principale: node tests/partita.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
function storage(){const m=new Map();return{m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}

// ---- 1) comandi: traduzione dei tasti
{
 const ls=storage(),listeners=[];
 const sb={localStorage:ls,$:()=>null,state:'play',paused:false,mouse:{right:false},keys:{},launched:0,
  launchMissile(){sb.launched++},
  addEventListener(t,f,cap){listeners.push({t,f,cap:!!cap})}};
 sb.window={dispatchEvent(ev){for(const l of listeners)if(l.t===ev.type&&!l.cap){l.f(ev);if(ev.stop)break}}};
 sb.KeyboardEvent=function(type,o){return{type,code:o.code,repeat:!!o.repeat,isTrusted:false,target:null,preventDefault(){},stopImmediatePropagation(){this.stop=true}}};
 vm.createContext(sb);
 vm.runInContext(fs.readFileSync(path.join(dist,'comandi.js'),'utf8'),sb);
 // il gioco: come game.js, ascolta su window senza cattura
 sb.addEventListener('keydown',e=>{sb.keys[e.code]=true});sb.addEventListener('keyup',e=>{sb.keys[e.code]=false});
 const press=(code,type='keydown')=>{const e={type,code,repeat:false,isTrusted:true,target:null,stop:false,preventDefault(){},stopImmediatePropagation(){this.stop=true}};
  for(const l of listeners.filter(l=>l.cap&&l.t===type))l.f(e);
  if(!e.stop)for(const l of listeners.filter(l=>!l.cap&&l.t===type)){l.f(e);if(e.stop)break}};
 const run=s=>vm.runInContext(s,sb);
 press('Space');assert.equal(sb.keys.Space,true,'predefinito: SPAZIO spara');press('Space','keyup');
 press('ArrowUp');assert.equal(sb.keys.ArrowUp,true,'predefinito: la freccia passa così com\'è');press('ArrowUp','keyup');
 run("cmdSet('fire',0,'KeyJ')");
 press('KeyJ');assert.equal(sb.keys.Space,true,'J diventa SPAZIO');press('KeyJ','keyup');assert.equal(sb.keys.Space,false);
 sb.keys={};press('Space');assert.ok(!sb.keys.Space,'SPAZIO non spara più');
 run("cmdSet('up',1,'KeyJ')");
 assert.equal(run("cmdBind.fire[0]"),null,'un tasto sta su un solo comando');
 press('KeyJ');assert.equal(sb.keys.KeyW,true,'J ora va su');
 run("cmdSet('shield',0,'KeyC')");press('KeyC');assert.equal(sb.mouse.right,true,'tasto per la barriera');press('KeyC','keyup');assert.equal(sb.mouse.right,false);
 press('KeyE');assert.equal(sb.launched,1,'E lancia il missile nello spazio');
 const saved=JSON.parse(ls.getItem('stellarComandi'));assert.equal(saved.shield[0],'KeyC','comandi salvati');
 run('cmdReset()');assert.equal(ls.getItem('stellarComandi'),null,'predefiniti: niente da salvare');
 assert.equal(run("cmdLabel('ShiftRight')"),'SHIFT DX');assert.equal(run("cmdLabel('KeyQ')"),'Q');
 assert.equal(run("CMD_ACTIONS.find(a=>a.id==='special').def[0]"),'KeyQ','Q è nei comandi');
 console.log('PASS: comandi personalizzabili');
}

// ---- 2) partita salvata e chiusura
(async()=>{
 const ls=storage();let aborted=0,restarted=0,warped=0,platform=0,toast='',written=null;
 const sb={localStorage:ls,$:()=>null,show(){},state:'platform',paused:false,score:4200,selected:0,phaseOneComplete:false,godMode:false,
  planets:[{code:'A1',name:'LYRA'},{code:'B2',name:'VESPER'}],pf:{p:{code:'B2',name:'VESPER'}},
  abort(){aborted++;sb.state='map'},gameRestart(){restarted++;sb.score=0},selectPlanet(i){sb.selected=i},mapPlayable:()=>true,
  beginWarp(){warped++},startPlatform(){platform++},profToast(s){toast=s},scoreFmt:n=>String(n),
  recName:()=>'Fabio',recLoad:()=>null,recWrite:async(n,s)=>{written={n,s};return 'run1'},coOn:true,coRank:async()=>42,WORLD_SIZE:10000,coMyId:'',
  myAdd(){},boardAdd(){},setTimeout:(f)=>f(),Date};
 vm.createContext(sb);
 vm.runInContext('var score=4200;'+fs.readFileSync(path.join(dist,'partita.js'),'utf8'),sb);
 const run=s=>vm.runInContext(s,sb);
 run('saveForLater()');
 const s=JSON.parse(ls.getItem('stellarPartitaSalvata'));
 assert.equal(s.code,'B2');assert.equal(s.fase,2,'salvata la fase a terra');assert.equal(aborted,1);assert.match(toast,/PARTITA SALVATA/);
 run('saveResume()');
 assert.equal(sb.selected,1);assert.equal(platform,1,'riprende a terra');assert.equal(ls.getItem('stellarPartitaSalvata'),null,'salvataggio usato');
 sb.state='play';run('saveForLater()');assert.equal(JSON.parse(ls.getItem('stellarPartitaSalvata')).fase,1);
 run('saveResume()');assert.equal(warped,1,'riprende nello spazio');
 sb.state='play';run('score=4200');await run('closeRun()');
 assert.deepEqual(written,{n:'Fabio',s:4200},'punteggio in classifica');assert.equal(restarted,1,'progressi azzerati');
 assert.match(toast,/POSIZIONE 42/);
 console.log('PASS: riprendi più tardi / chiudi partita');
})().catch(e=>{console.error(e);process.exit(1)});
