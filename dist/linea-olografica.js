// LINEA OLOGRAFICA PIANETA → PANNELLO (2026-11-12)
// Nella home, il pianeta selezionato è collegato al pannello OBIETTIVO SELEZIONATO da un fascio olografico:
// cono di proiezione dal pianeta al riquadro dell'anteprima, linea centrale con impulsi che scorrono,
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
  el.s1=mk('stop',{offset:'0','stop-opacity':'.02'},g);
  el.s2=mk('stop',{offset:'.55','stop-opacity':'.07'},g);
  el.s3=mk('stop',{offset:'1','stop-opacity':'.20'},g);
  el.grad=g;
  el.cono=mk('polygon',{fill:'url(#loCono)'},svg);
  el.bordoA=mk('line',{class:'lo-bordo'},svg);
  el.bordoB=mk('line',{class:'lo-bordo'},svg);
  el.alone=mk('path',{class:'lo-alone',fill:'none'},svg);
  el.linea=mk('path',{class:'lo-linea',fill:'none'},svg);
  el.flusso=mk('path',{class:'lo-flusso',fill:'none'},svg);
  el.impulsi=[0,1,2].map(()=>mk('circle',{class:'lo-impulso',r:'2.6'},svg));
  el.anello=mk('g',{class:'lo-anello'},svg);
  el.ring=mk('circle',{class:'lo-ring',fill:'none'},el.anello);
  el.ping=mk('circle',{class:'lo-ping',fill:'none'},svg);
  el.attacco=mk('line',{class:'lo-attacco'},svg);
  el.tacche=[0,1].map(()=>mk('line',{class:'lo-tacca'},svg));
  el.punto=mk('circle',{class:'lo-punto',r:'3.5'},svg);
  scr.appendChild(svg);
  return true;
 }
 const vis=e=>{if(!e)return null;const r=e.getBoundingClientRect();return r.width>0&&r.height>0?r:null};
 function colore(panel){
  let c='';try{c=getComputedStyle(panel).getPropertyValue('--panel-accent').trim()}catch(e){}
  return c||'#7ddce8';
 }
 function nascondi(){if(svg)svg.classList.remove('on');lastKey=''}

 function frame(now){
  requestAnimationFrame(frame);
  const scr=document.getElementById('mapScreen');
  if(!scr||!scr.classList.contains('active')||(typeof state!=='undefined'&&state!=='map'))return nascondi();
  if(!svg&&!build())return;
  const node=document.querySelector('#starMap .planet-node.selected');
  const panel=document.getElementById('planetPanel');
  const prev=panel&&panel.querySelector('.planet-preview');
  const rn=vis(node),rp=vis(panel),rv=vis(prev)||rp,rs=scr.getBoundingClientRect();
  if(!rn||!rp)return nascondi();
  if(node!==lastNode){lastNode=node;t0=now}
  const ox=rs.left,oy=rs.top;
  const nx=rn.left+rn.width/2-ox,ny=rn.top+rn.height/2-oy,nr=rn.width/2+7;
  // pannello a destra (PC) o sotto (telefono)
  const side=rp.left>rn.right+30;
  let tx,ty,a1,a2,cx1,cy1,cx2,cy2;
  if(side){
   tx=rp.left-ox-3;ty=rv.top+rv.height/2-oy;
   a1=[tx,rv.top-oy+4];a2=[tx,rv.bottom-oy-4];
   const dx=tx-nx;cx1=nx+dx*.45;cy1=ny;cx2=tx-dx*.35;cy2=ty;
  }else{
   tx=rv.left+rv.width/2-ox;ty=rp.top-oy;
   a1=[rv.left-ox+4,ty];a2=[rv.right-ox-4,ty];
   const dy=ty-ny;cx1=nx;cy1=ny+dy*.45;cx2=tx;cy2=ty-dy*.35;
  }
  // partenza sul bordo dell'anello, verso il pannello
  const ang=Math.atan2(ty-ny,tx-nx),sx=nx+Math.cos(ang)*nr,sy=ny+Math.sin(ang)*nr;
  const key=[nx,ny,tx,ty,a1[0],a1[1],a2[0],a2[1]].map(v=>Math.round(v)).join(',');
  const p=Math.min(1,(now-t0)/520),e=1-Math.pow(1-p,3);
  const d=`M${sx.toFixed(1)} ${sy.toFixed(1)} C${cx1.toFixed(1)} ${cy1.toFixed(1)} ${cx2.toFixed(1)} ${cy2.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}`;
  if(key!==lastKey||p<1){
   lastKey=key;
   const c=colore(panel);
   if(c!==accent){accent=c;svg.style.setProperty('--lo',c);for(const s of [el.s1,el.s2,el.s3])s.setAttribute('stop-color',c)}
   el.grad.setAttribute('x1',nx);el.grad.setAttribute('y1',ny);el.grad.setAttribute('x2',tx);el.grad.setAttribute('y2',ty);
   for(const k of ['alone','linea','flusso'])el[k].setAttribute('d',d);
   const len=el.linea.getTotalLength?el.linea.getTotalLength():600;
   el.len=len;
   // disegno progressivo all'arrivo
   el.linea.style.strokeDasharray=len;el.linea.style.strokeDashoffset=len*(1-e);
   el.alone.style.strokeDasharray=len;el.alone.style.strokeDashoffset=len*(1-e);
   el.flusso.style.opacity=e;
   // cono: dal pianeta al riquadro, si apre mentre la linea arriva
   const k2=Math.max(0,(p-.35)/.65),q=1-Math.pow(1-k2,2);
   const ax=nx+(a1[0]-nx)*q,ay=ny+(a1[1]-ny)*q,bx=nx+(a2[0]-nx)*q,by=ny+(a2[1]-ny)*q;
   el.cono.setAttribute('points',`${nx},${ny} ${ax},${ay} ${bx},${by}`);
   el.cono.style.opacity=q;
   for(const [ln,pt] of [[el.bordoA,[ax,ay]],[el.bordoB,[bx,by]]]){ln.setAttribute('x1',nx);ln.setAttribute('y1',ny);ln.setAttribute('x2',pt[0]);ln.setAttribute('y2',pt[1]);ln.style.opacity=q}
   // barra sul bordo del pannello
   el.attacco.setAttribute('x1',a1[0]);el.attacco.setAttribute('y1',a1[1]);el.attacco.setAttribute('x2',a2[0]);el.attacco.setAttribute('y2',a2[1]);
   el.attacco.style.opacity=q;
   const tk=side?[[a1[0],a1[1],a1[0]+7,a1[1]],[a2[0],a2[1],a2[0]+7,a2[1]]]:[[a1[0],a1[1],a1[0],a1[1]+7],[a2[0],a2[1],a2[0],a2[1]+7]];
   el.tacche.forEach((t,i)=>{t.setAttribute('x1',tk[i][0]);t.setAttribute('y1',tk[i][1]);t.setAttribute('x2',tk[i][2]);t.setAttribute('y2',tk[i][3]);t.style.opacity=q});
   el.punto.setAttribute('cx',tx);el.punto.setAttribute('cy',ty);el.punto.style.opacity=e;
   el.ring.setAttribute('cx',nx);el.ring.setAttribute('cy',ny);el.ring.setAttribute('r',nr);
   el.anello.style.transformOrigin=nx+'px '+ny+'px';
   el.ping.setAttribute('cx',nx);el.ping.setAttribute('cy',ny);el.ping.setAttribute('r',nr);
   el.ping.style.transformOrigin=nx+'px '+ny+'px';
  }
  // impulsi che viaggiano dal pianeta al pannello
  if(el.len&&el.linea.getPointAtLength){
   el.impulsi.forEach((c,i)=>{
    const f=((now/1400)+i/3)%1;
    if(p<1){c.style.opacity=0;return}
    const pt=el.linea.getPointAtLength(f*el.len);
    c.setAttribute('cx',pt.x.toFixed(1));c.setAttribute('cy',pt.y.toFixed(1));
    c.style.opacity=(Math.sin(f*Math.PI)*.95).toFixed(2);
   });
  }
  svg.classList.add('on');
 }

 const css=document.createElement('style');
 css.textContent=
  '.linea-olo{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:0;transition:opacity .3s;--lo:#7ddce8;overflow:visible}'+
  '.linea-olo.on{opacity:1}'+
  '.linea-olo .lo-bordo{stroke:var(--lo);stroke-width:1;stroke-opacity:.28;stroke-dasharray:2 5}'+
  '.linea-olo .lo-alone{stroke:var(--lo);stroke-width:7;stroke-opacity:.10;stroke-linecap:round}'+
  '.linea-olo .lo-linea{stroke:var(--lo);stroke-width:1.4;stroke-opacity:.85;stroke-linecap:round}'+
  '.linea-olo .lo-flusso{stroke:#e8fdff;stroke-width:1.2;stroke-opacity:.55;stroke-dasharray:3 13;animation:loFlusso 1.1s linear infinite}'+
  '.linea-olo .lo-impulso{fill:#f2feff;stroke:var(--lo);stroke-width:3;stroke-opacity:.35}'+
  '.linea-olo .lo-ring{stroke:var(--lo);stroke-width:1.2;stroke-opacity:.75;stroke-dasharray:10 6 2 6}'+
  '.linea-olo .lo-anello{animation:loGira 9s linear infinite}'+
  '.linea-olo .lo-ping{stroke:var(--lo);stroke-width:1;animation:loPing 2.2s ease-out infinite}'+
  '.linea-olo .lo-attacco{stroke:var(--lo);stroke-width:2.5;stroke-opacity:.9;stroke-linecap:round}'+
  '.linea-olo .lo-tacca{stroke:var(--lo);stroke-width:1.5;stroke-opacity:.9}'+
  '.linea-olo .lo-punto{fill:#f2feff;stroke:var(--lo);stroke-width:3;stroke-opacity:.45;animation:loBatte 1.4s ease-in-out infinite}'+
  '@keyframes loFlusso{to{stroke-dashoffset:-32}}'+
  '@keyframes loGira{to{transform:rotate(360deg)}}'+
  '@keyframes loPing{0%{transform:scale(1);stroke-opacity:.6}100%{transform:scale(1.7);stroke-opacity:0}}'+
  '@keyframes loBatte{50%{stroke-opacity:.1}}'+
  '@media (prefers-reduced-motion:reduce){.linea-olo .lo-flusso,.linea-olo .lo-anello,.linea-olo .lo-ping,.linea-olo .lo-punto{animation:none}}';
 (document.head||document.documentElement).appendChild(css);
 if(typeof requestAnimationFrame==='function')requestAnimationFrame(frame);
 if(typeof window!=='undefined')window.lineaOlografica={frame};
})();
