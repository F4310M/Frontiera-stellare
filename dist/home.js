// Ambient home scene. Independent of combat, damage, sound and mission timers.
const homeAnimations=[];
function drawHomeSpace(t){
 const reduced=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 ctx.save();
 const mist=ctx.createRadialGradient(W*.53,H*.49,0,W*.53,H*.49,W*.6);
 mist.addColorStop(0,'rgba(32,92,133,.15)');mist.addColorStop(.48,'rgba(69,38,121,.12)');mist.addColorStop(1,'rgba(4,10,20,0)');ctx.fillStyle=mist;ctx.fillRect(0,0,W,H);
 if(reduced){ctx.restore();return}
 for(let i=0;i<65;i++){
  const x=((i*173.13-t*(.6+i%3*.35))%W+W)%W,y=(i*97.71)%H;
  ctx.globalAlpha=.035+.32*(.5+.5*Math.sin(t*(.35+i%5*.09)+i*1.73))**2;ctx.fillStyle=i%13===0?'#ffd4a0':'#b9d8f5';ctx.fillRect(x,y,i%9===0?2:1,i%9===0?2:1);
 }
 ctx.globalAlpha=1;
 // Occasional shooting stars, each with its own timing and direction.
 for(let i=0;i<5;i++){
  const age=(t+i*2.73)%(9+i*.7);if(age>1.05)continue;
  const progress=age/1.05,x=(.18+i*.19)%1*W+progress*W*.37,y=(.1+i*.17)%1*H+progress*H*.28;
  const dx=W*.12,dy=H*.09,trail=ctx.createLinearGradient(x-dx,y-dy,x,y);
  trail.addColorStop(0,'rgba(140,205,255,0)');trail.addColorStop(1,`rgba(215,242,255,${Math.sin(progress*Math.PI)*.8})`);ctx.strokeStyle=trail;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(x-dx,y-dy);ctx.lineTo(x,y);ctx.stroke();
 }
 // Large, distant meteors cross the scene instead of heading toward the player.
 for(let i=0;i<3;i++){
  const cycle=15+i*4,age=(t+i*6)%cycle;if(age>3.8)continue;
  const p=age/3.8,x=W*(1.2-p*1.5),y=H*(.12+i*.28+p*.36),tail=ctx.createLinearGradient(x+95,y-27,x,y);
  tail.addColorStop(0,'rgba(255,106,35,0)');tail.addColorStop(.7,'rgba(255,158,74,.2)');tail.addColorStop(1,'rgba(255,215,154,.8)');ctx.strokeStyle=tail;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x+95,y-27);ctx.lineTo(x,y);ctx.stroke();
  ctx.save();ctx.translate(x,y);ctx.rotate(t+i);ctx.shadowColor='#ff9d55';ctx.shadowBlur=12;ctx.fillStyle='#b58866';ctx.beginPath();for(let j=0;j<7;j++){const a=j/7*Math.PI*2,r=3.5+(j%3);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.restore();
 }
 // Soft, distant explosions; no full-screen flashes or gameplay shockwaves.
 for(let i=0;i<3;i++){
  const age=(t+i*4.9)%(12+i*3);if(age>1.8)continue;
  const p=age/1.8,x=W*(.35+i*.22),y=H*(.22+i*.27),radius=12+p*56,fade=(1-p)*.38;
  const flash=ctx.createRadialGradient(x,y,0,x,y,radius);flash.addColorStop(0,`rgba(255,229,179,${fade})`);flash.addColorStop(.25,`rgba(255,146,75,${fade*.8})`);flash.addColorStop(1,'rgba(137,66,29,0)');ctx.fillStyle=flash;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);
  ctx.strokeStyle=`rgba(255,186,128,${fade*.6})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y,radius*.7,0,Math.PI*2);ctx.stroke();
  for(let j=0;j<12;j++){const a=j*2.399,d=p*(30+j%4*12);ctx.fillStyle=`rgba(255,197,123,${fade})`;ctx.fillRect(x+Math.cos(a)*d,y+Math.sin(a)*d,1.5,1.5)}
 }
 ctx.restore();
}
const homeSelectPlanet=selectPlanet;
selectPlanet=function(i){
 homeSelectPlanet(i);
 const panel=$('planetPanel'),p=planets[i];panel.style.setProperty('--panel-accent',p.glow);
 document.querySelectorAll('.planet-node').forEach((node,j)=>{node.setAttribute('aria-pressed',String(j===i));node.setAttribute('aria-label',planets[j].name+' · minaccia '+planets[j].threat.toLowerCase())});
 while(homeAnimations.length)homeAnimations.pop().cancel();
 if(typeof panel.animate!=='function'||typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 homeAnimations.push(panel.animate([{opacity:.25,transform:'translateX(22px) scale(.985)'},{opacity:1,transform:'translateX(0) scale(1)'}],{duration:480,easing:'cubic-bezier(.16,1,.3,1)'}));
 panel.querySelectorAll('.planet-preview,h2,#planetDesc,dl,.threat-bars,.launch-btn').forEach((el,j)=>homeAnimations.push(el.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:360,delay:45+j*38,easing:'cubic-bezier(.2,.8,.2,1)',fill:'backwards'})));
};
selectPlanet(selected);
