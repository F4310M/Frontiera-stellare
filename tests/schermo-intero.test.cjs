// Schermo intero forzato (2026-11-09): ogni gesto rientra a schermo intero, la fine missione non ne esce,
// il pulsante FINESTRA tiene la finestra fino al prossimo avvio di missione, iPhone riceve l'avviso.
// Eseguire dalla cartella principale: node tests/schermo-intero.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const src=fs.readFileSync(path.join(__dirname,'..','dist','schermo-intero.js'),'utf8');
function make(ua,withApi=true){
 const listeners={},docL={},m=new Map();let requests=0,exits=0,locks=0;
 const btn={onclick:null,attrs:{},querySelector:s=>s==='b'?btn.ic:btn.tx,ic:{innerHTML:''},tx:{textContent:''},setAttribute(k,v){btn.attrs[k]=v}};
 const body={kids:[],appendChild(n){n.parentNode=body;body.kids.push(n)}};
 const doc={fullscreenElement:null,body,head:{appendChild(){}},
  documentElement:withApi?{requestFullscreen(){requests++;doc.fullscreenElement=doc.documentElement;return Promise.resolve()}}:{},
  exitFullscreen(){exits++;doc.fullscreenElement=null;return Promise.resolve()},
  addEventListener(ev,f){(docL[ev]=docL[ev]||[]).push(f)},
  getElementById(id){return body.kids.find(k=>k.id===id)||null},
  createElement(){const n={id:'',remove(){body.kids=body.kids.filter(k=>k!==n);n.parentNode=null}};return n}};
 const sb={document:doc,navigator:{userAgent:ua,keyboard:{lock(){locks++;return Promise.resolve()}}},
  localStorage:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))},
  matchMedia:()=>({matches:false}),setTimeout:(f)=>{sb._t.push(f);return 0},_t:[],
  $:id=>id==='fullscreenBtn'?btn:null,ico:n=>'<'+n+'>',
  addEventListener(ev,f){(listeners[ev]=listeners[ev]||[]).push(f)}};
 vm.createContext(sb);vm.runInContext(src,sb);
 const fire=(ev,e={})=>{for(const f of listeners[ev]||[])f(Object.assign({type:ev,target:{closest:()=>null}},e))};
 return {sb,doc,btn,fire,get requests(){return requests},get exits(){return exits},get locks(){return locks}};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const g=make('Mozilla/5.0 (Windows NT 10.0) Chrome/130');
 assert.equal(g.btn.onclick,g.sb.toggleFullscreen,'il pulsante usa il nuovo comando');
 g.fire('pointerdown');await tick();
 assert.equal(g.requests,1,'primo clic: schermo intero');assert.ok(g.doc.fullscreenElement);assert.equal(g.locks,1,'Esc bloccato su Chrome');
 assert.equal(g.btn.tx.textContent,'FINESTRA');
 vm.runInContext('leaveGameFullscreen()',g.sb);await tick();
 assert.equal(g.exits,0,'fine missione: resta a schermo intero');
 g.doc.fullscreenElement=null; // il giocatore esce con Esc
 g.fire('keydown',{key:'Escape',code:'Escape'});await tick();assert.equal(g.requests,1,'Esc non rientra');
 g.fire('keydown',{key:'w',code:'KeyW'});await tick();assert.equal(g.requests,2,'tasto successivo: rientra');
 // pulsante FINESTRA: resta in finestra
 g.fire('pointerdown',{target:{closest:s=>s==='#fullscreenBtn'?{}:null}});g.btn.onclick();await tick();
 assert.equal(g.exits,1);assert.equal(g.doc.fullscreenElement,null);
 g.fire('pointerdown');g.fire('touchend');await tick();assert.equal(g.requests,2,'dopo FINESTRA i clic non rientrano');
 vm.runInContext('enterGameFullscreen()',g.sb);await tick();assert.equal(g.requests,3,'nuova missione: di nuovo schermo intero');
 // iPhone: niente API, compare l'avviso (max 3 volte)
 const i=make('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari',false);
 i.fire('pointerdown');await tick();assert.equal(i.requests,0);
 for(const f of i.sb._t.splice(0))f();
 assert.ok(i.doc.getElementById('siHint'),'avviso Aggiungi alla schermata Home');
 assert.match(i.doc.getElementById('siHint').innerHTML,/Aggiungi alla schermata Home/);
 // PC: nessun avviso
 for(const f of g.sb._t.splice(0))f();assert.equal(g.doc.getElementById('siHint'),null);
 console.log('PASS: schermo intero forzato');
})().catch(e=>{console.error(e);process.exit(1)});
