# audio/

Riservata ai file audio.

Nella **v0.1** tutti gli effetti sonori (sparo, colpo, grugnito del cinghiale,
carica sulla jeep, ricarica, vittoria, game over) sono **sintetizzati a runtime
con la Web Audio API** (vedi `BH.audio` in `src/main.js`). Nessun file audio
esterno è richiesto: il gioco funziona offline senza asset a pagamento.

Dalla **v0.2/0.3** questa cartella potrà ospitare musica di sottofondo e SFX
registrati (es. `.ogg` / `.mp3`).
