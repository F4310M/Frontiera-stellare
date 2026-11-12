// Firebase finto per i test (2026-11-11): accesso anonimo, Firestore REST (GET, :commit, :runQuery,
// :runAggregationQuery) con le stesse condizioni di firestore.rules, in versione semplice.
// Le regole vere si provano nell'emulatore: tests/emulatore/regole.test.mjs.
// Ha un orologio suo (S.clock) che vale per il server e per il gioco (FakeDate e setTimeout veloce).
const crypto=require('crypto');
const sha=k=>crypto.createHash('sha256').update(k).digest('hex');

function firebaseFinto(){
 const S={clock:Date.UTC(2026,10,11,10,0,0),docs:new Map(),online:true,regole:true,uid:0,log:[]};
 const ok=j=>({ok:true,status:200,json:async()=>j}),no=s=>({ok:false,status:s,json:async()=>({error:{code:s}})});
 const ts=()=>new Date(S.clock).toISOString();
 const I=f=>f&&f.integerValue!==undefined?+f.integerValue:NaN;
 const str=f=>f&&typeof f.stringValue==='string'?f.stringValue:undefined;
 const msOf=f=>f&&f.timestampValue?Date.parse(f.timestampValue):NaN;
 const nomeOk=n=>typeof n==='string'&&n.length>=1&&n.length<=20&&/^[\p{L}\p{N} ]+$/u.test(n);
 const keyOf=name=>name.split('/documents/')[1];
 function doc(path){return S.docs.get(path)||null}

 function controlla(path,old,f,after,uid){
  const parts=path.split('/'),col=parts[0];
  const mio=n=>!!after.get('nomi/'+String(n).toLowerCase()+'/piloti/'+uid);
  const keys=o=>Object.keys(o);
  if(col==='nomi'&&parts.length===2){
   if(old)return false;
   return keys(f).every(k=>'nht'.includes(k))&&nomeOk(str(f.n))&&parts[1]===str(f.n).toLowerCase()&&/^[0-9a-f]{64}$/.test(str(f.h)||'');
  }
  if(col==='nomi'&&parts[2]==='piloti'){
   const nm=after.get('nomi/'+parts[1]);
   return parts[3]===uid&&!!nm&&typeof str(f.k)==='string'&&sha(str(f.k))===str(nm.fields.h);
  }
  if(f===null)return col==='classifica'&&!!old&&mio(str(old.fields.n));   // cancellazione: solo righe della classifica del proprietario del nome (2026-11-12)
  if(col==='classifica'){
   const n=str(f.n),s=I(f.s);
   const g=f.g?I(f.g):0,r=f.r?I(f.r):1;
   if(!(g>=0&&g<=100&&r>=1&&r<=999))return false;
   if(!(keys(f).every(k=>['n','s','d','a','t','c','g','r'].includes(k))&&nomeOk(n)&&s>0&&s<=3000000&&/^\d{4}-\d\d-\d\d$/.test(str(f.d)||'')&&mio(n)))return false;
   if(!old)return s<=80000;
   const of=old.fields;
   if(!of.c||!of.t||str(of.n)!==n||msOf(f.c)!==msOf(of.c))return false;
   return S.clock>=msOf(of.t)+15000&&s>=I(of.s)&&s-I(of.s)<=120000&&s<=80000+(S.clock-msOf(of.c))/1000*150;
  }
  if(col==='arena'){
   const n=str(f.n),m=I(f.m),v=I(f.v),b=I(f.b),p=I(f.p);
   if(old&&!old.fields.t){ // vecchia riga: si chiude soltanto
    const of=old.fields;
    return !of.x&&!!of.h&&keys(f).every(k=>['n','p','x','k'].includes(k))&&n===str(of.n)&&p===0&&str(f.x)===n.toLowerCase()&&sha(str(f.k)||'')===str(of.h)
     &&!!after.get('arena/'+str(f.x))&&str(after.get('arena/'+str(f.x)).fields.o)===parts[1];
   }
   if(!(keys(f).every(k=>['n','p','v','b','m','a','t','o'].includes(k))&&nomeOk(n)&&m>=1&&v>=0&&b>=0&&p===b*100+v*500+m*50&&mio(n)))return false;
   if(!old){
    if(parts[1]!==n.toLowerCase())return false;
    if(!f.o)return m<=5&&v<=m&&b<=m*15;
    const vec=doc('arena/'+str(f.o)),va=after.get('arena/'+str(f.o));
    return !!vec&&!vec.fields.t&&!vec.fields.x&&str(vec.fields.n)===n&&!!va&&str(va.fields.x)===n.toLowerCase()&&m===I(vec.fields.m)&&v===I(vec.fields.v)&&b===I(vec.fields.b);
   }
   const of=old.fields,dm=m-I(of.m);
   return str(of.n)===n&&str(f.o)===str(of.o)&&dm>=1&&dm<=5&&v>=I(of.v)&&v-I(of.v)<=dm&&b>=I(of.b)&&b-I(of.b)<=dm*15&&S.clock>=msOf(of.t)+30000*dm;
  }
  return false;
 }

 async function fetch(url,o){
  o=o||{};
  if(!S.online)throw new Error('rete');
  S.log.push((o.method||'GET')+' '+url.split('?')[0].split('/').slice(-2).join('/'));
  if(url.includes('identitytoolkit')){const u='utente'+(++S.uid);return ok({idToken:'T.'+u,refreshToken:'R.'+u,localId:u,expiresIn:'3600'})}
  if(url.includes('securetoken')){const u=decodeURIComponent(String(o.body).split('refresh_token=')[1]).slice(2);return ok({id_token:'T.'+u,refresh_token:'R.'+u,user_id:u,expires_in:'3600'})}
  const h=o.headers||{},auth=String(h.Authorization||''),uid=auth.startsWith('Bearer T.')?auth.slice(9):'';
  const body=o.body?JSON.parse(o.body):null,all=[...S.docs.entries()];
  if(url.includes(':runAggregationQuery')){
   const q=body.structuredAggregationQuery.structuredQuery,c=q.from[0].collectionId,ff=q.where.fieldFilter,v=+ff.value.integerValue;
   return ok([{result:{aggregateFields:{c:{integerValue:String(all.filter(([k,d])=>k.split('/')[0]===c&&k.split('/').length===2&&I(d.fields[ff.field.fieldPath])>v).length)}}}}]);
  }
  if(url.includes(':runQuery')){
   const q=body.structuredQuery,c=q.from[0].collectionId,fld=q.orderBy?q.orderBy[0].field.fieldPath:'s',ff=q.where&&q.where.fieldFilter;
   const eq=d=>!ff||(ff.op==='EQUAL'&&str(d.fields[ff.field.fieldPath])===ff.value.stringValue);
   return ok(all.filter(([k])=>k.split('/')[0]===c&&k.split('/').length===2).map(([,d])=>d).filter(eq).sort((x,y)=>I(y.fields[fld])-I(x.fields[fld])).slice(0,q.limit||100).map(d=>({document:d})));
  }
  if(url.includes(':commit')){
   if(!S.regole||!uid)return no(403);
   const after=new Map(S.docs);
   const ws=body.writes.map(w=>{
    if(w.delete){const path=keyOf(w.delete),old=after.get(path)||null;if(!old)return {path,old:null,fields:null,del:true};after.delete(path);return {path,old,fields:null,del:true}}
    const path=keyOf(w.update.name),old=after.get(path)||null;let fields;
    if(w.currentDocument&&w.currentDocument.exists===false&&old)return {err:409};
    if(w.currentDocument&&w.currentDocument.exists===true&&!old)return {err:404};
    if(w.updateMask&&old){fields=Object.assign({},old.fields);for(const k of w.updateMask.fieldPaths){if(w.update.fields[k])fields[k]=w.update.fields[k];else delete fields[k]}}
    else fields=Object.assign({},w.update.fields);
    for(const t of w.updateTransforms||[])fields[t.fieldPath]={timestampValue:ts()};
    const d={name:w.update.name,fields};after.set(path,d);return {path,old,fields};
   });
   const e=ws.find(w=>w.err);if(e)return no(e.err);
   for(const w of ws)if(!(w.del&&!w.old)&&!controlla(w.path,w.old,w.fields,after,uid))return no(403);
   S.docs=after;return ok({writeResults:ws.map(()=>({updateTime:ts()}))});
  }
  // GET di un documento
  const path=decodeURIComponent(url.split('/documents/')[1].split('?')[0]);
  if(/\/piloti\//.test(path))return no(403);
  const d=doc(path);return d?ok(d):no(404);
 }
 // orologio condiviso dal gioco: Date e setTimeout che fanno passare il tempo subito
 const Real=Date;
 class FakeDate extends Real{constructor(...a){if(a.length)super(...a);else super(S.clock)}static now(){return S.clock}}
 const setTimeoutVeloce=(f,ms)=>{S.clock+=Math.max(0,+ms||0);setImmediate(f);return 1};
 // aggiunge un documento come se fosse già nel database (righe di prima delle regole nuove)
 function metti(path,fields){S.docs.set(path,{name:'projects/p/databases/(default)/documents/'+path,fields})}
 return {S,fetch,FakeDate,setTimeout:setTimeoutVeloce,metti,docs:col=>[...S.docs.entries()].filter(([k])=>k.split('/')[0]===col&&k.split('/').length===2).map(([k,d])=>Object.assign({id:k.split('/')[1]},d)),sha};
}
module.exports={firebaseFinto,sha};
