// Stellar Frontier — configurazione della CLASSIFICA MONDIALE (Firebase Firestore).
// Se projectId e apiKey sono vuoti, il gioco usa solo la classifica salvata nel browser.
// La apiKey di Firebase per il web non è segreta: la protezione sta nelle regole (file firestore.rules).
const CLASSIFICA_ONLINE={
 projectId:'stellar-frontier-f6387',
 apiKey:'AIzaSyA8X02k-GO4gSsTmtVuRtMzYlYru7S1-58',
 // SFIDA ONLINE (arena.js): indirizzo della Realtime Database, es. https://stellar-frontier-f6387-default-rtdb.europe-west1.firebasedatabase.app
 // Vuoto = la sfida funziona solo tra finestre dello stesso browser.
 databaseURL:''
};
