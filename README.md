# Frontiera Stellare

Gioco d'azione nel browser in due fasi, scritto in JavaScript puro su canvas, senza librerie e senza compilazione.

**Fase 1 · Spazio.** Pilota la nave verso il pianeta. Lungo la rotta incontri ribelli, rocce, relitti e meteoriti. Intorno al pianeta aspettano una flotta nemica e una cintura rocciosa, e all'ingresso nell'atmosfera arriva una pioggia di meteoriti. Fermati in orbita per conquistarla.

**Fase 2 · Libera la colonia.** La nave atterra e il pilota avanza a piedi contro i ribelli del Fronte Ombra. Lungo la strada libera i coloni prigionieri e alla fine distrugge il robot che tiene in ostaggio la colonia. Ogni pianeta ha il suo ambiente e il suo boss.

## Come si gioca

- **Online:** se GitHub Pages è attivo, apri `https://f4310m.github.io/frontiera-stellare/`.
- **Sul PC (Windows):** fai doppio clic su `Avvia-Frontiera-Stellare.bat`. Serve Python installato.
- **Su qualsiasi sistema:** dalla cartella `dist` esegui `python -m http.server 4173` e apri `http://localhost:4173`.

### Comandi

| | Fase 1 · Spazio | Fase 2 · A terra |
|---|---|---|
| Movimento | Frecce / WASD | A / D |
| Mira | Mouse (la prua segue il cursore) | Mouse |
| Fuoco | Clic sinistro o Spazio | Clic sinistro |
| Speciale | Rotella: missile · Shift destro: post-bruciatore · F: freno | Rotella o E: granata · W/Spazio: salto, in aria **jetpack** |
| Scudo | Tasto destro del mouse | Tasto destro del mouse |
| Pausa | P | P |

## Regole principali

- **Vite:** 3 in tutto il gioco, condivise tra le due fasi. La pillola **1UP**, rarissima, regala una vita (massimo 5). Senza vite è **GAME OVER**: crediti, potenziamenti e pianeti liberati si azzerano.
- **Crediti:** ogni colpo, missile, granata e unità di carburante (jetpack compreso) costa crediti. Si guadagnano con le taglie sui nemici e con il premio della missione, pagato solo distruggendo il boss.
- **Mercato:** dalla mappa si comprano potenziamenti: lanciatore multiplo, laser potenziato, doppio laser, barriera, motori, iniettori e granate.
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
node tests/finale.test.cjs
```
