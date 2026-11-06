# Conex

*(in origine "Frontiera Stellare", poi "Stellar Frontier")*

Gioco d'azione nel browser in due fasi, scritto in JavaScript puro su canvas, senza librerie e senza compilazione.

**Fase 1 · Spazio.** Pilota la nave verso il pianeta. Lungo la rotta incontri ribelli, rocce, relitti e meteoriti. Intorno al pianeta aspettano una flotta nemica e una cintura rocciosa, e all'ingresso nell'atmosfera arriva una pioggia di meteoriti. Fermati in orbita per conquistarla.

**Fase 2 · Libera la colonia.** La nave resta sospesa in aria e il pilota scende col jetpack, poi avanza a piedi contro i ribelli del Fronte Ombra. Alcuni ribelli sparano da dietro un muretto: si alzano per sparare e si riabbassano, e se li superi senza abbatterli ti sparano alle spalle. In ogni livello c'è almeno un passaggio col jetpack: una parete rocciosa da scalare in volo e subito dopo un burrone da attraversare planando. Lungo la strada libera i coloni prigionieri e alla fine distrugge il robot che tiene in ostaggio la colonia: quando cade esplode a catena, con rallentatore e onda d'urto, e parte la musica di vittoria. Ogni pianeta ha il suo ambiente e il suo boss.

## Come si gioca

- **Online:** se GitHub Pages è attivo, apri `https://f4310m.github.io/frontiera-stellare/`.
- **Sul PC (Windows):** fai doppio clic su `Avvia-Frontiera-Stellare.bat`. Serve Python installato.
- **Su cellulare e tablet:** compaiono da soli un pad semitrasparente e i pulsanti touch. Il telefono va tenuto in orizzontale.
- **Su qualsiasi sistema:** dalla cartella `dist` esegui `python -m http.server 4173` e apri `http://localhost:4173`.

### Comandi

| | Fase 1 · Spazio | Fase 2 · A terra |
|---|---|---|
| Movimento | Frecce / WASD | A / D |
| Mira | Mouse (la prua segue il cursore) | Mouse |
| Fuoco | Clic sinistro o Spazio | Clic sinistro |
| Speciale | Rotella: missile · Shift destro: post-bruciatore · F: freno | Rotella o E: granata · W/Spazio: salto, in aria **jetpack** · in volo col jetpack tieni S per planare |
| Colpo speciale (1 per fase) | Q: trottola laser | Q: bombardamento via radio |
| Scudo | Tasto destro del mouse | Tasto destro del mouse |
| Pausa | P | P |
| Musica | M | M |

## Regole principali

- **Vite:** 3 in tutto il gioco, condivise tra le due fasi. La pillola **1UP**, rarissima, regala una vita (massimo 5). Senza vite è **GAME OVER**: crediti, potenziamenti e pianeti liberati si azzerano.
- **Crediti:** ogni colpo, missile, granata e unità di carburante (jetpack compreso) costa crediti. Si guadagnano con le taglie sui nemici e con il premio della missione, pagato solo distruggendo il boss.
- **Mercato:** dalla mappa si comprano potenziamenti: lanciatore multiplo, laser potenziato, doppio laser, barriera, motori, iniettori e granate.
- **Lanciatore multiplo:** con 2 o 3 missili ogni missile aggancia un nemico diverso (il mirino compare su ognuno) e lo insegue. Se c'è un solo nemico in vista, vanno tutti su di lui.
- **Menu:** ogni finestra si adatta alla risoluzione dello schermo, su PC e su telefono, così si vede tutta senza scorrere (fa eccezione la lista della classifica).
- **Colpo speciale:** una sola volta nello spazio e una sola volta a terra in ogni missione (tasto Q, sul telefono il pulsante SPECIALE). Nello spazio la nave gira velocissima su sé stessa sparando laser e distrugge tutti i nemici sullo schermo. A terra il pilota chiama la nave via radio: passa sopra e sgancia una bomba che distrugge tutti i nemici sullo schermo e toglie 1/4 dell'energia al boss.
- **Boss:** prima dello scontro il robot si costruisce da solo, sfiata vapore e accumula energia nel nucleo; in quei secondi non si può colpire.
- **Missioni:** scegliendo un pianeta dalla mappa si parte sempre dallo spazio; la fase a terra si raggiunge solo conquistando l'orbita.
- **Lingue:** inglese (predefinito), italiano, francese, spagnolo, russo, cinese e giapponese. Si sceglie dal menu in alto nella mappa o nelle impostazioni.
- **Punteggio e classifica:** i punti arrivano da nemici abbattuti, coloni salvati, orbite conquistate e colonie liberate, e crescono con la minaccia del pianeta. Alla fine del gioco (GAME OVER o vittoria su OMEGA) si scrive il nome (massimo 10 lettere). La classifica mostra i primi 100 ed è salvata nel browser.
- **Colonna sonora:** ogni scena ha il suo brano e si passa dall'uno all'altro in dissolvenza: *Monolith at the Edge* nel menu principale (mappa), *Titan's Last Stand* nella guerra nello spazio, *The Final Maneuver* vicino al pianeta e durante l'ingresso in orbita, *Kinetic Front* a terra e *Titan's Final Strike* contro i boss e IMPERATORE OMEGA. Alla vittoria suona un'orchestra procedurale, che fa anche da riserva se i brani non si caricano (per esempio aprendo il gioco direttamente da disco). Si attiva o spegne nelle impostazioni o con il tasto M. Nelle impostazioni ci sono anche due cursori, per il volume della musica (40% di partenza) e per quello degli effetti sonori.
- **Pianeti:** LYRA (mare), VESPER (deserto), NIMBUS (tempesta), KHEPRI (foresta) e UMBRA (lava), ognuno con il suo boss. Liberati tutti e cinque, si sblocca **OMEGA**, il pianeta finale con IMPERATORE OMEGA.

## Struttura

```
dist/            il gioco (apri dist/index.html tramite un server locale)
  game.js        fase 1: volo, nemici, rocce, meteoriti, orbita
  pianeta.js     pianeta di destinazione generato a ogni missione
  fase2.js       fase 2: livello a piattaforme, pilota, ribelli, coloni, boss
  grafica2.js    grafica a terra: sfondi, terreno, luci, personaggi
  palazzi.js     a terra: palazzi della colonia in lontananza in alta qualità e skyline nella nebbia
  nave-gadget.js nello spazio: la nave cambia aspetto con i potenziamenti comprati (cannoni, missili, motori...)
  boss.js        disegno dei boss di ogni pianeta
  economia.js    crediti, spese, premi e mercato
  finale.js      vite, pillola 1UP, game over e pianeta finale
  musica.js      colonna sonora: brani registrati e orchestra procedurale di riserva
  musica/        i brani della colonna sonora (MP3)
  volume.js      volume di musica ed effetti sonori
  iperspazio.js  viaggio nell'iperspazio: grafica e suono del salto
  home.js        animazioni della schermata iniziale
  classifica.js  punteggio e classifica dei primi 100
  i18n.js        lingue e traduzioni
  mobile.js      comandi touch per cellulare e tablet
  camera.js      zoom morbido della telecamera in volo
  battaglia.js   fase a terra: discesa col jetpack, nemici al riparo, passaggi col jetpack, esplosione del boss
  icone.js       icone SVG di frecce e pulsanti (caricato per primo)
  sotterranei.js fase a terra più lunga: ponte di colonne col jetpack e gallerie sotterranee alternative
  godmode.js     GOD MODE dalle impostazioni: pilota e nave indistruttibili, tutti i pianeti giocabili
  facile.js      difficoltà: meno danni, nemici più lenti a sparare, boss e nemici con meno salute (numeri in FACILE)
  assalto.js     a terra: più ribelli al riparo, spinta nello scontro, scena quando il pilota perde una vita
  spirale.js     ingresso in orbita: la nave scende a spirale verso il pianeta, rimpicciolendo e arroventandosi
  montaggio.js   entrata in scena del boss (si costruisce, vapore, energia) e texture metalliche migliori
  speciale.js    colpo speciale (tasto Q): trottola laser nello spazio, bombardamento via radio a terra
tests/           test automatici (Node.js)
```

## Test

Dalla cartella principale, con Node.js 18 o successivo:

```
node tests/game-mechanics.test.cjs
node tests/fase2.test.cjs
node tests/grafica2.test.cjs
node tests/economia.test.cjs
node tests/arrivo.test.cjs
node tests/musica.test.cjs
node tests/finale.test.cjs
node tests/battaglia.test.cjs
node tests/godmode.test.cjs
node tests/sotterranei.test.cjs
node tests/multi-aggancio.test.cjs
node tests/facile.test.cjs
node tests/speciale.test.cjs
node tests/lingue.test.cjs
node tests/nave3d.test.cjs
node tests/palazzi-nave.test.cjs
```

## Classifica mondiale

La classifica (primi 10.000, mostrati 100 alla volta, nomi di massimo 20 lettere) è condivisa da tutti i giocatori tramite Firebase Firestore, senza librerie: il gioco usa direttamente le API REST.

- La configurazione è in `dist/firebase-config.js` (`projectId` e `apiKey`). Se è vuota, il gioco usa solo la classifica salvata nel browser.
- Le regole di sicurezza sono in `firestore.rules`: chiunque può leggere e aggiungere un punteggio valido, nessuno può modificare o cancellare quelli esistenti.
- Senza rete il punteggio viene salvato nel browser e inviato alla classifica mondiale appena possibile.
