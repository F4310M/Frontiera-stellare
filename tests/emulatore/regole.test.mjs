// Regole Firestore + Realtime Database nell'emulatore Firebase (2026-11-11).
// Serve Java. Dalla cartella tests/emulatore:
//   npm install
//   npx firebase emulators:exec --project demo-conex --only firestore,database "node regole.test.mjs"
// Poi, con lo stesso comando, anche "node client.test.cjs" (codice vero del gioco) e "node rtdb.test.cjs".
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,writeBatch,serverTimestamp,deleteDoc} from 'firebase/firestore';
import {ref,set,update,remove,get} from 'firebase/database';
import fs from 'fs';import crypto from 'crypto';
const dir=new URL('../../',import.meta.url).pathname;
const sha=k=>crypto.createHash('sha256').update(k).digest('hex');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const env=await initializeTestEnvironment({projectId:'demo-conex',
 firestore:{rules:fs.readFileSync(dir+'firestore.rules','utf8'),host:'127.0.0.1',port:8085},
 database:{rules:fs.readFileSync(dir+'database.rules.json','utf8'),host:'127.0.0.1',port:9005}});
const ok=(m,p)=>p.then(()=>console.log('ok  ',m)),
      no=(m,p)=>assertFails(p).then(()=>console.log('ok  ',m,'(rifiutato)'));
const A=env.authenticatedContext('utenteA').firestore(),B=env.authenticatedContext('utenteB').firestore(),A2=env.authenticatedContext('utenteA2').firestore();
const anon=env.unauthenticatedContext().firestore();
const oggi=new Date().toISOString().slice(0,10);
const kA='a'.repeat(48),kB='b'.repeat(48);
// prenotazione di un nome: nomi/{key} + nomi/{key}/piloti/{uid} nella stessa scrittura
function prenota(db,uid,n,k){const b=writeBatch(db);b.set(doc(db,'nomi',n.toLowerCase()),{n,h:sha(k),t:serverTimestamp()});b.set(doc(db,'nomi',n.toLowerCase(),'piloti',uid),{k,t:serverTimestamp()});return b.commit()}
function riga(n,s,extra){return Object.assign({n,s,d:oggi,t:serverTimestamp(),c:serverTimestamp()},extra||{})}

// ---- NOMI
await no('senza accesso non si prenota',prenota(anon,'x','Fabio',kA));
await assertSucceeds(prenota(A,'utenteA','Fabio Mutone',kA));console.log('ok   A prenota "Fabio Mutone"');
await no('B non può prendere lo stesso nome (anche in minuscolo)',prenota(B,'utenteB','fabio mutone',kB));
await no('B non può aggiungersi senza la chiave',setDoc(doc(B,'nomi','fabio mutone','piloti','utenteB'),{k:kB,t:serverTimestamp()}));
await no('B non può registrarsi a nome di A',setDoc(doc(B,'nomi','fabio mutone','piloti','utenteA'),{k:kA,t:serverTimestamp()}));
await ok('A2 (altro PC con il backup) si aggiunge con la chiave',assertSucceeds(setDoc(doc(A2,'nomi','fabio mutone','piloti','utenteA2'),{k:kA,t:serverTimestamp()})));
await no('la chiave non si legge',getDoc(doc(B,'nomi','fabio mutone','piloti','utenteA')));
await ok('il nome si legge',assertSucceeds(getDoc(doc(anon,'nomi','fabio mutone'))));
await no('il nome non si cancella',deleteDoc(doc(A,'nomi','fabio mutone')));
await no('id diverso dal nome in minuscolo',setDoc(doc(B,'nomi','pippo'),{n:'Pluto',h:sha(kB),t:serverTimestamp()}));
await no('nome con caratteri strani',prenota(B,'utenteB','<img>',kB));
await assertSucceeds(prenota(B,'utenteB','Bianca',kB));

// ---- CLASSIFICA
await no('senza accesso niente punti',setDoc(doc(anon,'classifica','r0'),riga('Fabio Mutone',1000)));
await no('B non scrive col nome di A',setDoc(doc(B,'classifica','r1'),riga('Fabio Mutone',1000)));
await no('creazione oltre 80.000',setDoc(doc(A,'classifica','r2'),riga('Fabio Mutone',80001)));
await no('3.000.000 in un colpo',setDoc(doc(A,'classifica','r2'),riga('Fabio Mutone',3000000)));
await no('ora inventata dal client',setDoc(doc(A,'classifica','r2'),riga('Fabio Mutone',1000,{t:new Date(),c:new Date()})));
await no('campi in più',setDoc(doc(A,'classifica','r2'),riga('Fabio Mutone',1000,{h:sha('x')})));
await ok('A crea la riga della partita',assertSucceeds(setDoc(doc(A,'classifica','r2'),riga('Fabio Mutone',5000))));
await ok('lo stesso pilota da un altro PC crea una riga',assertSucceeds(setDoc(doc(A2,'classifica','r3'),riga('Fabio Mutone',4000))));
await ok('chiunque legge',assertSucceeds(getDoc(doc(anon,'classifica','r2'))));
await no('aggiornamento subito dopo (meno di 15 s)',updateDoc(doc(A,'classifica','r2'),{s:9000,t:serverTimestamp()}));
console.log('...   aspetto 16 secondi');await wait(16000);
await no('B non aggiorna la riga di A',updateDoc(doc(B,'classifica','r2'),{s:9000,t:serverTimestamp()}));
await no('più di 80.000 + 150 al secondo',updateDoc(doc(A,'classifica','r2'),{s:90000,t:serverTimestamp()}));
await no('punti che scendono',updateDoc(doc(A,'classifica','r2'),{s:4000,t:serverTimestamp()}));
await no('cambio di nome',updateDoc(doc(A,'classifica','r2'),{n:'Bianca',s:9000,t:serverTimestamp()}));
await no('cambio della creazione',updateDoc(doc(A,'classifica','r2'),{s:9000,c:serverTimestamp(),t:serverTimestamp()}));
await ok('aggiornamento dopo 16 s nei limiti',assertSucceeds(updateDoc(doc(A,'classifica','r2'),{s:82000,t:serverTimestamp()})));
// 2026-11-12: % di gioco (g) e ×N (r); restano i 3 migliori record del pilota: il proprietario del nome cancella le sue righe
await ok('riga con % e ciclo',assertSucceeds(setDoc(doc(A,'classifica','r4'),riga('Fabio Mutone',3000,{g:42,r:2}))));
await no('% oltre 100',setDoc(doc(A,'classifica','r5'),riga('Fabio Mutone',3000,{g:101})));
await no('ciclo 0',setDoc(doc(A,'classifica','r5'),riga('Fabio Mutone',3000,{r:0})));
await no('% non intera',setDoc(doc(A,'classifica','r5'),riga('Fabio Mutone',3000,{g:'50'})));
await no('senza accesso non si cancella',deleteDoc(doc(anon,'classifica','r4')));
await no('B non cancella le righe di A',deleteDoc(doc(B,'classifica','r4')));
await ok('A cancella una sua riga',assertSucceeds(deleteDoc(doc(A,'classifica','r4'))));
await ok('A2 (stesso nome, altro PC) cancella una sua riga',assertSucceeds(deleteDoc(doc(A2,'classifica','r3'))));

// ---- ARENA
const ar=(n,m,v,b,extra)=>Object.assign({n,m,v,b,p:b*100+v*500+m*50,t:serverTimestamp()},extra||{});
// vecchia riga con chiave segreta (scritta dall'amministratore come se fosse di prima)
const kOld='c'.repeat(48);
await env.withSecurityRulesDisabled(async c=>{await setDoc(doc(c.firestore(),'arena','vecchia1'),{n:'Fabio Mutone',m:40,v:12,b:200,p:200*100+12*500+40*50,h:sha(kOld)})});
await no('senza accesso',setDoc(doc(anon,'arena','bianca'),ar('Bianca',1,1,5)));
await no('id diverso dal nome',setDoc(doc(B,'arena','xyz'),ar('Bianca',1,1,5)));
await no('nome di un altro',setDoc(doc(B,'arena','fabio mutone'),ar('Fabio Mutone',1,1,5)));
await no('più di 5 sfide alla creazione',setDoc(doc(B,'arena','bianca'),ar('Bianca',6,1,5)));
await no('più di 15 abbattimenti a sfida',setDoc(doc(B,'arena','bianca'),ar('Bianca',1,1,16)));
await no('punti che non tornano',setDoc(doc(B,'arena','bianca'),Object.assign(ar('Bianca',1,1,5),{p:999999})));
await ok('B crea la sua riga',assertSucceeds(setDoc(doc(B,'arena','bianca'),ar('Bianca',2,1,20))));
await no('aggiornamento subito dopo',updateDoc(doc(B,'arena','bianca'),ar('Bianca',3,1,20)));
// migrazione: la vecchia riga si chiude, i totali passano nella nuova
const mig=(db,k,tot)=>{const b=writeBatch(db);b.set(doc(db,'arena','vecchia1'),{n:'Fabio Mutone',p:0,x:'fabio mutone',k});b.set(doc(db,'arena','fabio mutone'),ar('Fabio Mutone',tot.m,tot.v,tot.b,{o:'vecchia1'}));return b.commit()};
await no('migrazione con chiave sbagliata',mig(A,'d'.repeat(48),{m:40,v:12,b:200}));
await no('migrazione con totali gonfiati',mig(A,kOld,{m:400,v:120,b:2000}));
await no('migrazione da chi non ha il nome',mig(B,kOld,{m:40,v:12,b:200}));
await ok('migrazione giusta',assertSucceeds(mig(A,kOld,{m:40,v:12,b:200})));
await no('la vecchia riga non si riapre',updateDoc(doc(A,'arena','vecchia1'),{p:5000}));
await no('seconda migrazione dalla stessa riga',(()=>{const b=writeBatch(A2);b.set(doc(A2,'arena','vecchia1'),{n:'Fabio Mutone',p:0,x:'fabio mutone',k:kOld});return b.commit()})());
console.log('...   aspetto 31 secondi');await wait(31000);
await no('2 sfide in 31 s (servono 60)',updateDoc(doc(B,'arena','bianca'),ar('Bianca',4,1,20)));
await no('B non tocca la riga di A',updateDoc(doc(B,'arena','fabio mutone'),ar('Fabio Mutone',41,12,200,{o:'vecchia1'})));
await ok('1 sfida dopo 31 s',assertSucceeds(updateDoc(doc(B,'arena','bianca'),ar('Bianca',3,2,35))));
await ok('A2 aggiorna la riga del suo nome',assertSucceeds(updateDoc(doc(A2,'arena','fabio mutone'),ar('Fabio Mutone',41,13,215,{o:'vecchia1'}))));

// ---- REALTIME DATABASE (sfida online)
const dA=env.authenticatedContext('utenteA').database(),dB=env.authenticatedContext('utenteB').database(),dN=env.unauthenticatedContext().database();
const nodo=(u,x)=>({n:'Fabio',j:1,x,y:0,t:{'.sv':'timestamp'},u});
await no('rtdb: senza accesso non si entra',set(ref(dN,'arena/ALFA/p/aaaaaaaaaa'),nodo('x',0)));
await no('rtdb: senza accesso non si legge',get(ref(dN,'arena/ALFA')));
await ok('rtdb: A entra nella stanza',assertSucceeds(set(ref(dA,'arena/ALFA/p/aaaaaaaaaa'),nodo('utenteA',0))));
await no('rtdb: A con u di un altro',set(ref(dA,'arena/ALFA/p/cccccccccc'),nodo('utenteB',0)));
await ok('rtdb: A si muove',assertSucceeds(update(ref(dA,'arena/ALFA/p/aaaaaaaaaa'),{x:50,t:{'.sv':'timestamp'}})));
await no('rtdb: B sposta A',update(ref(dB,'arena/ALFA/p/aaaaaaaaaa'),{x:999,t:{'.sv':'timestamp'}}));
await no('rtdb: B sovrascrive A',set(ref(dB,'arena/ALFA/p/aaaaaaaaaa'),nodo('utenteB',0)));
await no('rtdb: B caccia A che è attivo',remove(ref(dB,'arena/ALFA/p/aaaaaaaaaa')));
await no('rtdb: foto con codice',update(ref(dA,'arena/ALFA/p/aaaaaaaaaa'),{a:'data:image/x" onerror="alert(1)',t:{'.sv':'timestamp'}}));
await ok('rtdb: foto vera',assertSucceeds(update(ref(dA,'arena/ALFA/p/aaaaaaaaaa'),{a:'data:image/jpeg;base64,'+Buffer.alloc(30,1).toString('base64'),t:{'.sv':'timestamp'}})));
await no('rtdb: colpi con dati enormi',update(ref(dA,'arena/ALFA/p/aaaaaaaaaa'),{sh:{0:{0:'x'.repeat(500)}},t:{'.sv':'timestamp'}}));
await no('rtdb: troppi colpi',update(ref(dA,'arena/ALFA/p/aaaaaaaaaa'),{sh:Object.fromEntries(Array.from({length:120},(_,i)=>[i,[i,1,2]])),t:{'.sv':'timestamp'}}));
await ok('rtdb: colpi normali',assertSucceeds(update(ref(dA,'arena/ALFA/p/aaaaaaaaaa'),{sh:[[1,2,3,4,5,10,3,0],[2,2,3,4,5,10,3,0,'bbbbbbbbbb']],t:{'.sv':'timestamp'}})));
console.log('...   aspetto 6 secondi');await wait(6000);
await ok('rtdb: B toglie A dopo 6 s fermo (pilota uscito)',assertSucceeds(remove(ref(dB,'arena/ALFA/p/aaaaaaaaaa'))));
await ok('rtdb: ora del server',assertSucceeds(set(ref(dB,'arena/_t/abcdefghij'),{'.sv':'timestamp'})));
await env.cleanup();console.log('TUTTE LE REGOLE PASSANO');process.exit(0);
