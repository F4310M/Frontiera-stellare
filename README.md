# Stellar Frontier

*(in origine "Frontiera Stellare")*

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
| Scudo | Tasto destro del mouse | Tasto destro del mouse |
| Pausa | P | P |
| Musica | M | M |

## Regole principali

- **Vite:** 3 in tutto il gioco, condivise tra le due fasi. La pillola **1UP**, rarissima, regala una vita (massimo 5). Senza vite è **GAME OVER**: crediti, potenziamenti e pianeti liberati si azzerano.
- **Crediti:** ogni colpo, missile, granata e unità di carburante (jetpack compreso) costa crediti. Si guadagnano con le taglie sui nemici e con il premio della missione, pagato solo distruggendo il boss.
- **Mercato:** dalla mappa si comprano potenziamenti: lanciatore multiplo, laser potenziato, doppio laser, barriera, motori, iniettori e granate.
- **Missioni:** scegliendo un pianeta dalla mappa si parte sempre dallo spazio; la fase a terra si raggiunge solo conquistando l'orbita.
- **Lingue:** inglese (predefinito), italiano, francese, spagnolo, russo, cinese e giapponese. Si sceglie dal menu in alto nella mappa o nelle impostazioni.
- **Punteggio e classifica:** i punti arrivano da nemici abbattuti, coloni salvati, orbite conquistate e colonie liberate, e crescono con la minaccia del pianeta. Alla fine del gioco (GAME OVER o vittoria su OMEGA) si scrive il nome (massimo 10 lettere). La classifica mostra i primi 100 ed è salvata nel browser.
- **Colonna sonora:** ogni scena ha il suo brano e si passa dall'uno all'altro in dissolvenza: *Oltre le Stelle* sulla mappa, *Assalto Orbitale* in volo, *Soglia Ostile* vicino al pianeta, *Fuoco sul Pianeta* a terra e *Soglia Ostile (boss)* contro i boss e IMPERATORE OMEGA. Alla vittoria suona un'orchestra procedurale, che fa anche da riserva se i brani non si caricano (per esempio aprendo il gioco direttamente da disco). Si attiva o spegne nelle impostazioni o con il tasto M. Nelle impostazioni ci sono anche due cursori, per il volume della musica (40% di partenza) e per quello degli effetti sonori.
- **Pianeti:** LYRA (mare), VESPER (deserto), NIMBUS (tempesta), KHEPRI (foresta) e UMBRA (lava), ognuno con il suo boss. Liberati tutti e cinque, si sblocca **OMEGA**, il pianeta finale con IMPERATORE OMEGA.

## Struttura

```
dist/            il gioco (apri dist/index.html tramite un server locale)
  game.js        fase 1: volo, nemici, rocce, meteoriti, orbita
  pianeta.js     pianeta di destinazione generato a ogni missione
  fase2.js       fase 2: livello a piattaforme, pilota, ribelli, coloni, boss
  grafica2.js    grafica a terra: sfondi, terreno, luci, personaggi
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
  godmode.js     GOD MODE dalle impostazioni: pilota e nave indistruttibili, tutti i pianeti giocabili
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
node tests/lingue.test.cjs
node tests/nave3d.test.cjs
```

## Classifica mondiale

La classifica (primi 10.000, mostrati 100 alla volta, nomi di massimo 20 lettere) è condivisa da tutti i giocatori tramite Firebase Firestore, senza librerie: il gioco usa direttamente le API REST.

- La configurazione è in `dist/firebase-config.js` (`projectId` e `apiKey`). Se è vuota, il gioco usa solo la classifica salvata nel browser.
- Le regole di sicurezza sono in `firestore.rules`: chiunque può leggere e aggiungere un punteggio valido, nessuno può modificare o cancellare quelli esistenti.
- Senza rete il punteggio viene salvato nel browser e inviato alla classifica mondiale appena possibile.
