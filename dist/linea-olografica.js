// LINEA OLOGRAFICA PIANETA → PANNELLO (2026-11-12) — dalla v5 solo pianeta selezionato ingrandito con anello che ruota e pulsa
// Nella home, il pianeta selezionato è collegato al pannello OBIETTIVO SELEZIONATO da un fascio olografico:
// una linea di energia con impulsi dal pianeta all'angolo in alto del pannello (v3: niente cono né linea inferiore),
// anello che ruota attorno al pianeta e barra luminosa sul bordo del pannello.
// Al cambio di pianeta il fascio si ridisegna partendo dal pianeta.
// Solo SVG e CSS: niente filtri o ombre ricalcolati a ogni fotogramma (regola prestazioni PC).
(function(){
 if(typeof document==='undefined'||!document.createElementNS)return;
 const NS='http://www.w3.org/2000/svg';
 const mk=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e};
 let svg=null,el={},lastNode=null,t0=0,lastKey='',accent='';

 function build(){
  const scr=document.getElementById('mapScreen');if(!scr)return false;
  svg=mk('svg',{id:'lineaOlo',class:'linea-olo','aria-hidden':'true'});
  const defs=mk('defs',{},svg);
  const g=mk('linearGradient',{id:'loCono',gradientUnits:'userSpaceOnUse'},defs);
  el.s1=mk('stop',{offset:'0','stop-opacity':'.03'},g);
  el.s2=mk('stop',{offset:'.55','stop-opacity':'.08'},g);
  el.s3=mk('stop',{offset:'1','stop-opacity':'.20'},g);
  el.grad=g;
  el.cono=mk('polygon',{fill:'url(#loCono)'},svg);
  // i due bordi del fascio: alone, linea e flusso di energia con impulsi
  el.bordi=[0,1].map(()=>({
   alone:mk('path',{class:'lo-alone',fill:'none'},svg),
   linea:mk('path',{class:'lo-linea',fill:'none'},svg),
   flusso:mk('path',{class:'lo-flusso',fill:'none'},svg),
   impulsi:[0,1].map(()=>mk('circle',{class:'lo-impulso',r:'2.4'},svg)),
   len:0
  }));
  el.anello=mk('g',{class:'lo-anello'},svg);
  el.ring=mk('circle',{class:'lo-ring',fill:'none'},el.anello);
  el.ping=mk('circle',{class:'lo-ping',fill:'none'},svg);
  el.attacco=mk('line',{class:'lo-attacco'},svg);
  el.tacche=[0,1].map(()=>mk('line',{class:'lo-tacca'},svg));
  el.punti=[0,1].map(()=>mk('circle',{class:'lo-punto',r:'3.2'},svg));
  // 2026-11-12 (Fabio): niente fascio di luce, solo la linea superiore verso il margine alto del pannello
  // 2026-11-12 (Fabio, v5): niente linea; il pianeta selezionato è più grande e resta l'anello che ruota e pulsa
  const via=[el.cono,el.attacco,...el.tacche,...el.punti,...el.bordi.flatMap(b=>[b.alone,b.linea,b.flusso,...b.impulsi])];
  for(const e of via)e.setAttribute('display','none');
  scr.appendChild(svg);
  return true;
 }
 const vis=e=>{if(!e)return null;const r=e.getBoundingClientRect();return r.width>0&&r.height>0?r:null};
 function colore(panel){
  let c='';try{c=getComputedStyle(panel).getPropertyValue('--panel-accent').trim()}catch(e){}
  return c||'#7ddce8';
 }
 function nascondi(){if(svg)svg.classList.remove('on');lastKey=''}
 const dist2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;

 function frame(now){
  requestAnimationFrame(frame);
  const scr=document.getElementById('mapScreen');
  if(!scr||!scr.classList.contains('active')||(typeof state!=='undefined'&&state!=='map'))return nascondi();
  if(!svg&&!build())return;
  const node=document.querySelector('#starMap .planet-node.selected');
  const panel=document.getElementById('planetPanel');
  const rn=vis(node),rp=vis(panel),rs=scr.getBoundingClientRect();
  if(!rn||!rp)return nascondi();
  if(node!==lastNode){lastNode=node;t0=now}
  const ox=rs.left,oy=rs.top;
  const nx=rn.left+rn.width/2-ox,ny=rn.top+rn.height/2-oy,nr=rn.width/2+7;
  // il fascio copre tutto il pannello: tutta l'altezza (PC, pannello a destra) o tutta la larghezza (telefono, pannello sotto)
  const side=rp.left>rn.right+30;
  let a1,a2,tx,ty;
  if(side){tx=rp.left-ox-3;a1=[tx,rp.top-oy+10];a2=[tx,rp.bottom-oy-10];ty=(a1[1]+a2[1])/2}
  else{ty=rp.top-oy-3;a1=[rp.left-ox+10,ty];a2=[rp.right-ox-10,ty];tx=(a1[0]+a2[0])/2}
  // partenza dai lati del pianeta (perpendicolare alla direzione del pannello)
  const L=Math.hypot(tx-nx,ty-ny)||1,ux=(tx-nx)/L,uy=(ty-ny)/L;
  let s1=[nx+uy*nr,ny-ux*nr],s2=[nx-uy*nr,ny+ux*nr];
  if(dist2(s1,a1)+dist2(s2,a2)>dist2(s1,a2)+dist2(s2,a1)){const t=s1;s1=s2;s2=t}
  const key=[nx,ny,a1[0],a1[1],a2[0],a2[1]].map(v=>Math.round(v)).join(',');
  const p=Math.min(1,(now-t0)/560),e=1-Math.pow(1-p,3);
  if(key!==lastKey||p<1){
   lastKey=key;
   const c=colore(panel);
   if(c!==accent){accent=c;svg.style.setProperty('--lo',c);for(const s of [el.s1,el.s2,el.s3])s.setAttribute('stop-color',c)}
   el.grad.setAttribute('x1',nx);el.grad.setAttribute('y1',ny);el.grad.setAttribute('x2',tx);el.grad.setAttribute('y2',ty);
   // i bordi si allungano dal pianeta al pannello, il cono li segue
   const ends=[[s1,a1],[s2,a2]].map(([s,a])=>[s,[s[0]+(a[0]-s[0])*e,s[1]+(a[1]-s[1])*e]]);
   el.cono.setAttribute('points',[ends[0][0],ends[0][1],ends[1][1],ends[1][0]].map(q=>q[0].toFixed(1)+','+q[1].toFixed(1)).join(' '));
   el.cono.style.opacity=e;
   el.bordi.forEach((b,i)=>{
    const [s,a]=[[s1,a1],[s2,a2]][i];
    const d=`M${s[0].toFixed(1)} ${s[1].toFixed(1)} L${a[0].toFixed(1)} ${a[1].toFixed(1)}`;
    for(const k of ['alone','linea','flusso'])b[k].setAttribute('d',d);
    b.len=Math.hypot(a[0]-s[0],a[1]-s[1]);b.s=s;b.a=a;
    for(const k of ['alone','linea']){b[k].style.strokeDasharray=b.len;b[k].style.strokeDashoffset=b.len*(1-e)}
    b.flusso.style.opacity=e;
   });
   // barra sul bordo del pannello, per tutta la sua lunghezza
   el.attacco.setAttribute('x1',a1[0]);el.attacco.setAttribute('y1',a1[1]);el.attacco.setAttribute('x2',a2[0]);el.attacco.setAttribute('y2',a2[1]);
   el.attacco.style.opacity=e;
   const tk=side?[[a1[0],a1[1],a1[0]+7,a1[1]],[a2[0],a2[1],a2[0]+7,a2[1]]]:[[a1[0],a1[1],a1[0],a1[1]+7],[a2[0],a2[1],a2[0],a2[1]+7]];
   el.tacche.forEach((t,i)=>{t.setAttribute('x1',tk[i][0]);t.setAttribute('y1',tk[i][1]);t.setAttribute('x2',tk[i][2]);t.setAttribute('y2',tk[i][3]);t.style.opacity=e});
   el.punti.forEach((pt,i)=>{const a=i?a2:a1;pt.setAttribute('cx',a[0]);pt.setAttribute('cy',a[1]);pt.style.opacity=e});
   el.ring.setAttribute('cx',nx);el.ring.setAttribute('cy',ny);el.ring.setAttribute('r',nr);
   el.anello.style.transformOrigin=nx+'px '+ny+'px';
   el.ping.setAttribute('cx',nx);el.ping.setAttribute('cy',ny);el.ping.setAttribute('r',nr);
   el.ping.style.transformOrigin=nx+'px '+ny+'px';
  }
  // impulsi di energia che corrono sui bordi dal pianeta al pannello
  el.bordi.forEach((b,j)=>b.impulsi.forEach((c,i)=>{
   if(p<1||!b.s){c.style.opacity=0;return}
   const f=((now/1500)+i/2+j*.25)%1;
   c.setAttribute('cx',(b.s[0]+(b.a[0]-b.s[0])*f).toFixed(1));c.setAttribute('cy',(b.s[1]+(b.a[1]-b.s[1])*f).toFixed(1));
   c.style.opacity=(Math.sin(f*Math.PI)*.5).toFixed(2);
  }));
  svg.classList.add('on');
 }

 const css=document.createElement('style');
 css.textContent=
  '.linea-olo{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0;transition:opacity .3s;--lo:#7ddce8;overflow:visible}'+
  '.linea-olo.on{opacity:1}'+
  '#starMap .planet-node.selected{scale:1.55;z-index:3;transition:scale .35s cubic-bezier(.2,.9,.3,1.2)}'+
  '#starMap .planet-node{transition:scale .25s ease}'+
  '@media(max-width:850px){#starMap .planet-node.selected{scale:1.3}}'+
    '.linea-olo .lo-alone{stroke:var(--lo);stroke-width:6;stroke-opacity:.05;stroke-linecap:round}'+
  '.linea-olo .lo-linea{stroke:var(--lo);stroke-width:1.2;stroke-opacity:.38;stroke-linecap:round}'+
  '.linea-olo .lo-flusso{stroke:#e8fdff;stroke-width:1;stroke-opacity:.25;stroke-dasharray:3 13;animation:loFlusso 1.1s linear infinite}'+
  '.linea-olo .lo-impulso{fill:#f2feff;stroke:var(--lo);stroke-width:3;stroke-opacity:.35}'+
  '.linea-olo .lo-ring{stroke:var(--lo);stroke-width:1.2;stroke-opacity:.75;stroke-dasharray:10 6 2 6}'+
  '.linea-olo .lo-anello{animation:loGira 9s linear infinite}'+
  '.linea-olo .lo-ping{stroke:var(--lo);stroke-width:1;animation:loPing 2.2s ease-out infinite}'+
  '.linea-olo .lo-attacco{stroke:var(--lo);stroke-width:2.5;stroke-opacity:.9;stroke-linecap:round}'+
  '.linea-olo .lo-tacca{stroke:var(--lo);stroke-width:1.5;stroke-opacity:.9}'+
  '.linea-olo .lo-punto{fill:#f2feff;fill-opacity:.5;stroke:var(--lo);stroke-width:3;stroke-opacity:.25;animation:loBatte 1.4s ease-in-out infinite}'+
  '@keyframes loFlusso{to{stroke-dashoffset:-32}}'+
  '@keyframes loGira{to{transform:rotate(360deg)}}'+
  '@keyframes loPing{0%{transform:scale(1);stroke-opacity:.6}100%{transform:scale(1.7);stroke-opacity:0}}'+
  '@keyframes loBatte{50%{stroke-opacity:.1}}'+
  '@media (prefers-reduced-motion:reduce){.linea-olo .lo-flusso,.linea-olo .lo-anello,.linea-olo .lo-ping,.linea-olo .lo-punto{animation:none}}';
 (document.head||document.documentElement).appendChild(css);
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(frame);
 if(typeof window!=='undefined')window.lineaOlografica={frame};
})();
