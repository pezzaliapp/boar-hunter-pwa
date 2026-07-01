# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate in questo file.
Il formato segue [Keep a Changelog](https://keepachangelog.com/it/1.1.0/) e il
progetto adotta il [Semantic Versioning](https://semver.org/lang/it/).

## [0.2.1] — 2026-07-01
### Best score persistente
#### Aggiunto
- Salvataggio del **miglior punteggio** in `localStorage` (`boarhunter.bestScore`),
  con wrapper sicuro (try/catch) per ambienti senza storage.
- Riga **🏆 Record** nella schermata Risultato e badge **"NUOVO RECORD!"** quando
  il punteggio supera il precedente migliore.
- Record mostrato anche nel **menu** iniziale.
#### Modificato
- Bump `CACHE_VERSION` del service worker a `boar-hunter-v0.2.1`.

## [0.2.0] — 2026-07-01
### Punteggio, timer e schermata risultato
#### Aggiunto
- **HUD esteso**: timer di partita e punteggio, oltre a vita, munizioni e
  contatore cinghiali/obiettivo.
- **Timer** che parte alla pressione di *Gioca* e conta il tempo di gioco.
- **Sistema di punteggio**: +100 per cinghiale abbattuto, +250 per cinghiale
  caricato sulla jeep, +500 bonus di completamento livello e **bonus tempo**
  (+10 punti per ogni secondo rimasto sotto il tempo limite, `config.timeLimit`).
- **Schermata "Risultato"** sia per *Livello completato* sia per *Game Over*,
  con: punteggio finale, tempo impiegato, cinghiali abbattuti, cinghiali
  caricati, **precisione tiro %** e pulsante *Rigioca*.
- Tracciamento colpi sparati/andati a segno per calcolare la precisione.
#### Modificato
- Bump `CACHE_VERSION` del service worker a `boar-hunter-v0.2.0` per aggiornare
  la cache offline.

## [0.1.0] — 2026-07-01
### Prototipo giocabile iniziale (PWA)
#### Aggiunto
- Struttura del progetto modulare a scene (boot / menu / game).
- Motore isometrico su `<canvas>` con proiezione, camera che segue il
  giocatore e **ordinamento per profondità** (gli oggetti più in basso coprono
  quelli più in alto).
- Terreno forestale generato proceduralmente: erba, sentiero, alberi, rocce e
  cespugli, tutti con **ombre**.
- **Cacciatore** dettagliato (cappello, giacca hi-vis, fucile orientato verso
  la mira/movimento) con movimento fluido.
- Controlli **desktop** (WASD/frecce, Spazio spara, R ricarica, E carica) e
  **touch** (joystick sinistro, pulsante spara, pulsante ricarica, pulsante
  contestuale "Carica sulla jeep").
- Sparo con **proiettile visibile** (tracciante), **munizioni** e **ricarica**.
- **Cinghiali** con IA a stati: i timidi scappano, gli aggressivi caricano e
  infliggono danni al contatto.
- **Vita** del giocatore, i-frame dopo un colpo, e schermata **Game Over** con
  Restart.
- Cinghiale abbattuto che resta a terra e si può **caricare sulla jeep**;
  **jeep** isometrica con cassone che si riempie e **contatore** cinghiali.
- Obiettivo livello (**3 cinghiali**) e schermata **Livello completato**.
- **PWA**: `manifest.json`, service worker con precache dell'app shell e
  fallback offline, icone 192/512 (+ maskable, apple-touch, favicon) generate
  localmente.
- **Audio** procedurale (WebAudio): sparo, colpo, grugnito, carica, ricarica,
  vittoria, game over.
- HUD DOM (vita, munizioni, contatore), toast e overlay con stile coerente.

## [Unreleased]
- Vedi la roadmap nel README per v0.2 / v0.3.
