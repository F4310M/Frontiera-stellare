// Conex — pulsante "OFFRIMI UN CAFFÈ" nel menu principale (2026-11-08).
// Metti qui il link della pagina donazioni (Buy Me a Coffee, Ko-fi, PayPal.me...).
// Vuoto = il pulsante non compare.
const CAFFE_LINK='https://ko-fi.com/mfsoftcreator';
const CAFFE_HOSTS=['buymeacoffee.com','www.buymeacoffee.com','ko-fi.com','www.ko-fi.com','paypal.me','www.paypal.me','www.paypal.com','paypal.com','liberapay.com','github.com','patreon.com','www.patreon.com'];
function caffeOk(u){try{const x=new URL(u);return x.protocol==='https:'&&CAFFE_HOSTS.includes(x.hostname)}catch(e){return false}}
function caffeButton(){
 if(typeof document==='undefined'||!document.querySelector||!caffeOk(CAFFE_LINK)||document.getElementById('caffeBtn'))return null;
 const top=document.querySelector('.top-actions');if(!top)return null;
 const a=document.createElement('a');a.id='caffeBtn';a.className='settings-btn caffe-btn';a.href=CAFFE_LINK;a.target='_blank';a.rel='noopener noreferrer';
 a.setAttribute('aria-label','Offrimi un caffè');a.title='Offrimi un caffè';
 a.innerHTML='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h13v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6z"/><path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17"/><path d="M8 2.5c0 1.5 1.5 1.5 1.5 3M12 2.5c0 1.5 1.5 1.5 1.5 3"/></svg> <span>OFFRIMI UN CAFFÈ</span>';
 const st=document.getElementById('settingsBtn');top.insertBefore(a,st||null);
 return a;
}
if(typeof I18N_ROWS!=='undefined'){
 for(const r of [
  ["OFFRIMI UN CAFFÈ","BUY ME A COFFEE","OFFRE-MOI UN CAFÉ","INVÍTAME A UN CAFÉ","УГОСТИ МЕНЯ КОФЕ","请我喝杯咖啡","コーヒーをおごる"],
  ["Offrimi un caffè","Buy me a coffee","Offre-moi un café","Invítame a un café","Угости меня кофе","请我喝杯咖啡","コーヒーをおごる"]
 ])if(!I18N_ROWS.some(x=>x[0]===r[0]))I18N_ROWS.push(r);
 if(typeof i18nBuild==='function')i18nBuild();
}
caffeButton();
