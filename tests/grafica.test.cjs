// Preset grafici BASSO / MEDIO / ALTO / ULTRA (2026-11-14, dist/grafica.js).
// Eseguire dalla cartella principale: node tests/grafica.test.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dist=path.join(__dirname,'..','dist'),src=f=>fs.readFileSync(path.join(dist,f),'utf8');
{
 const html=src('index.html'),at=f=>html.indexOf(`src="${f}`);
 assert.ok(at('grafica.js')>at('caffe.js')&&at('caffe.js')>at('impostazioni.js')&&at('impostazioni.js')>at('game.js'),'grafica.js dopo game.js, impostazioni.js e caffe.js');
 assert.match(src('game.js'),/let PIXEL_BUDGET=4\.2e6;/,'PIXEL_BUDGET modificabile dai preset');
 assert.match(src('impostazioni.css'),/\.grfx-opt\{/,'stile del pannello');
 console.log('PASS: file');
}
function storage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
function load(ua,saved){
 const ls=storage();if(saved)ls.setItem('stellarGrafica',JSON.stringify(saved));
 const sb={localStorage:ls,navigator:{userAgent:ua},console,Math,JSON,setTimeout:()=>0};vm.createContext(sb);
 vm.runInContext(`let PIXEL_BUDGET=4.2e6,renderQuality=.6,frameSamples=[1],qualityDrops=2,qualityGood=1,W=1920,H=1080,devicePixelRatio=1,applied=0,canvas={width:0,height:0};
 function targetDpr(){return 1}function adaptQuality(){return 'orig'}function applyCanvasScale(){applied++;const d=targetDpr();canvas.width=Math.round(W*d);canvas.height=Math.round(H*d)}
 `+src('grafica.js')+`;this.T={grfx,gfxDpr,gfxApply,GRAFICA_PRESET,get budget(){return PIXEL_BUDGET},get rq(){return renderQuality},get canvas(){return canvas},adaptQuality:(...a)=>adaptQuality(...a),targetDpr:()=>targetDpr(),set W(v){W=v},set H(v){H=v},set dpr(v){devicePixelRatio=v}}`,sb);
 return sb.T;
}
{
 const T=load('Mozilla/5.0 Chrome/130');
 assert.strictEqual(T.grfx.p,'alto','nel browser si parte da ALTO (come prima)');
 assert.strictEqual(T.budget,4.2e6);assert.strictEqual(T.rq,1,'qualità ripristinata');
 assert.strictEqual(T.adaptQuality(16),'orig','ALTO: qualità automatica attiva');
 // 1080p: ALTO disegna ~2730x1537, ULTRA il 4K vero
 const px=p=>{const d=T.gfxDpr(p,1920,1080,1,1);return [Math.round(1920*d),Math.round(1080*d)]};
 assert.deepStrictEqual(px('ultra'),[3840,2160],'ULTRA su 1080p: 3840x2160');
 assert.deepStrictEqual(px('basso'),[1920,1080],'BASSO: risoluzione dello schermo');
 assert.ok(px('alto')[0]<3840&&px('alto')[0]>px('medio')[0]&&px('medio')[0]>1920,'ALTO > MEDIO > BASSO');
 // schermo 4K a 150% (2560x1440 CSS): ULTRA arriva almeno al 4K nativo
 const d4=T.gfxDpr('ultra',2560,1440,1.5,1);assert.ok(2560*d4>=3840,'ULTRA su schermo 4K: almeno 3840 di larghezza');
 // ULTRA non scende con la qualità automatica
 assert.strictEqual(T.gfxDpr('ultra',1920,1080,1,.5),2);assert.ok(T.gfxDpr('alto',1920,1080,1,.5)<1.5);
}
{
 const T=load('Mozilla/5.0 CONEX/1.5.1 Chrome/130 Electron/39.0.0');
 assert.strictEqual(T.grfx.p,'ultra','nell’app desktop si parte da ULTRA');
 assert.strictEqual(T.budget,9e6);assert.strictEqual(T.adaptQuality(16),undefined,'ULTRA: niente abbassamento automatico');
 assert.deepStrictEqual([T.canvas.width,T.canvas.height],[3840,2160],'canvas in 4K');
 const S=load('Electron/39',{p:'medio',fps:60,mostra:true});
 assert.strictEqual(S.grfx.p,'medio','la scelta salvata vince');assert.strictEqual(S.grfx.fps,60);assert.strictEqual(S.grfx.mostra,true);
 console.log('PASS: preset, 4K e scelta salvata');
}
