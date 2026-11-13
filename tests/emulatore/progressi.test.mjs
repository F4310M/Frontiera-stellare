// Regole Firestore dei PROGRESSI VERIFICATI (2026-11-13) nell'emulatore Firebase. Dura circa 5 minuti
// (aspetta il tempo minimo di un passo). Serve Java. Dalla cartella tests/emulatore:
//   npm install
//   npx firebase emulators:exec --project demo-conex --only firestore "node progressi.test.mjs"
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
import fs from 'fs';
const dir=process.env.CONEX_DIR||new URL('../../',import.meta.url).pathname;
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const env=await initializeTestEnvironment({projectId:'demo-conex',
 firestore:{rules:fs.readFileSync(dir+'firestore.rules','utf8'),host:'127.0.0.1',port:8085}});
const ok=(m,p)=>assertSucceeds(p).then(()=>console.log('ok  ',m)),
      no=(m,p)=>assertFails(p).then(()=>console.log('ok  ',m,'(rifiutato)'));
const A=env.authenticatedContext('utenteA').firestore(),B=env.authenticatedContext('utenteB').firestore();
const anon=env.unauthenticatedContext().firestore();
const P=(db,u)=>doc(db,'progressi',u);

await no('senza accesso niente livello',setDoc(P(anon,'utenteA'),{l:1,t:serverTimestamp()}));
await no('B non scrive il livello di A',setDoc(P(B,'utenteA'),{l:1,t:serverTimestamp()}));
await no('creazione oltre il livello 1',setDoc(P(A,'utenteA'),{l:2,t:serverTimestamp()}));
await no('ora inventata dal client',setDoc(P(A,'utenteA'),{l:1,t:new Date()}));
await no('campi in più',setDoc(P(A,'utenteA'),{l:1,t:serverTimestamp(),crediti:999999}));
await no('livello non intero',setDoc(P(A,'utenteA'),{l:0.5,t:serverTimestamp()}));
await ok('A crea il livello 1',setDoc(P(A,'utenteA'),{l:1,t:serverTimestamp()}));
await ok('chiunque legge il livello',getDoc(P(anon,'utenteA')));
await no('subito un altro passo (meno di 5 minuti)',updateDoc(P(A,'utenteA'),{l:2,t:serverTimestamp()}));
await no('livello che scende',updateDoc(P(A,'utenteA'),{l:0,t:serverTimestamp()}));
await no('B non aggiorna il livello di A',updateDoc(P(B,'utenteA'),{l:2,t:serverTimestamp()}));
await no('il livello non si cancella',deleteDoc(P(A,'utenteA')));
console.log('...   aspetto 5 minuti e 2 secondi');await wait(302000);
await no('dopo 5 minuti non si salgono 2 passi',updateDoc(P(A,'utenteA'),{l:3,t:serverTimestamp()}));
await no('più di 10 passi in un colpo',updateDoc(P(A,'utenteA'),{l:12,t:serverTimestamp()}));
await ok('dopo 5 minuti sale di 1',updateDoc(P(A,'utenteA'),{l:2,t:serverTimestamp()}));
await no('e poi di nuovo aspetta',updateDoc(P(A,'utenteA'),{l:3,t:serverTimestamp()}));
await env.cleanup();console.log('TUTTE LE REGOLE DEI PROGRESSI PASSANO');process.exit(0);
