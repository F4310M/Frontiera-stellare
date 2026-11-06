// Menu dei pianeti (2026-11-06): pianeti che ruotano, ombra colorata del pannello, boss finale nelle info, cielo più scuro.
// Eseguire dalla cartella principale: node tests/menu-pianeti.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist');
const src=f=>fs.readFileSync(path.join(dist,f),'utf8');

// ---- 1) ordine dei file e testi tradotti
{
 const html=src('index.html'),at=f=>html.indexOf(`src="${f}"`);
 assert.ok(at('menu-pianeti.js')>0,'menu-pianeti.js è caricato');
 for(const f of ['boss.js','finale.js','home.js','mappa.js','i18n.js'])assert.ok(at(f)<at('menu-pianeti.js'),f+' prima di menu-pianeti.js');
 const i18n=src('i18n.js');
 for(const s of ['BOSS FINALE','SCONFITTO'])assert.ok(i18n.includes(`["${s}",`),'riga di traduzione per '+s);
 const css=src('mappa.css');
 assert.ok(/planet-panel\{box-shadow:[^}]*var\(--panel-accent/.test(css),'ombra del pannello nel colore del pianeta');
 assert.ok(css.includes('@keyframes mp-spin'),'animazione di rotazione');
 console.log('PASS: file, traduzioni e CSS');
}

// ---- 2) logica con un DOM finto
{
 function el(id){
  const e={id,style:{props:{},setProperty(k,v){this.props[k]=v}},classes:new Set(),children:[],textContent:'',attrs:{},
   classList:{add:c=>e.classes.add(c),toggle:(c,on)=>{on?e.classes.add(c):e.classes.delete(c)},contains:c=>e.classes.has(c)},
   setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},
   insertAdjacentHTML(_,h){this.children.push(h);if(h.includes('planetBossRow'))for(const k of ['planetBossRow','planetBossImg','planetBossName','planetBossSub'])els[k]=el(k)},
   querySelector(q){if(q==='dl')return els.dl;if(q==='.mp-surf')return this.children.length?(this.surf||(this.surf=el('surf'))):null;return null}};
  return e;
 }
 const els={planetPanel:el('planetPanel'),previewPlanet:el('previewPlanet'),dl:el('dl')};
 els.planetPanel.querySelector=q=>q==='dl'?els.dl:null;
 const planets=[
  {name:'LYRA',code:'HX–01',glow:'#39c8ff',theme:'mare'},
  {name:'VESPER',code:'KQ–17',glow:'#ffcf4a',theme:'deserto'},
  {name:'OMEGA',code:'Ω–00',glow:'#ff2a6a',theme:'abisso',boss:'omega',final:true}];
 const PF_BOSS={mare:{name:'LEVIATANO K-3',sub:'GRANCHIO CORAZZATO DEL FRONTE OMBRA'},deserto:{name:'SCORPIONE S-5',sub:'CACCIATORE DELLE DUNE'},omega:{name:'IMPERATORE OMEGA',sub:'SIGNORE DEL FRONTE OMBRA'}};
 let freed=[],sel=-1,orig={stars:0,nebula:0};
 const sb={planets,PF_BOSS,state:'map',W:800,H:600,ctx:{canvas:{width:800,height:600},save(){},restore(){},fillRect(){},drawImage(){}},
  $:id=>els[id]||null,document:{querySelectorAll:()=>[]},
  pfBossInfo:p=>PF_BOSS[p.boss||p.theme],mapLocked:p=>!!p.final,mapFreed:p=>freed.includes(p.code),
  initMap(){},selectPlanet(i){sel=i},drawHomeSpace(){},drawStarfield(){orig.stars++},drawNebula(){orig.nebula++}};
 vm.createContext(sb);
 vm.runInContext(src('menu-pianeti.js'),sb);
 const run=s=>vm.runInContext(s,sb);
 assert.equal(new Set(run('MP.spin')).size,6,'6 pianeti, 6 velocità diverse');
 run('selectPlanet(0)');
 assert.equal(sel,0,'chiama la selezione originale');
 assert.equal(els.planetPanel.style.props['--panel-accent'],'#39c8ff','ombra del pannello: colore di LYRA');
 assert.ok(els.previewPlanet.classes.has('mp-rot'),'il pianeta del pannello ruota');
 assert.equal(els.planetBossName.textContent,'LEVIATANO K-3','boss finale di LYRA');
 assert.equal(els.planetBossSub.textContent,'GRANCHIO CORAZZATO DEL FRONTE OMBRA');
 freed=['KQ–17'];run('selectPlanet(1)');
 assert.equal(els.planetPanel.style.props['--panel-accent'],'#ffcf4a','ombra: colore di VESPER');
 assert.equal(els.planetBossSub.textContent,'SCONFITTO','pianeta liberato: boss sconfitto');
 assert.ok(els.planetBossRow.classes.has('beaten'));
 run('selectPlanet(2)');
 assert.equal(els.planetBossName.textContent,'???','OMEGA bloccato: boss nascosto');
 assert.ok(els.planetBossRow.classes.has('locked'));
 // senza canvas (test) il cielo del gioco resta quello originale
 run('drawStarfield();drawNebula();drawHomeSpace(1)');
 assert.equal(orig.stars,1);assert.equal(orig.nebula,1);
 console.log('PASS: rotazione, ombra colorata, boss finale, cielo');
}
