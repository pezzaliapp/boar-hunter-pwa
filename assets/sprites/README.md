# sprites/

Riservata agli sprite sheet.

Nella **v0.1** tutti gli sprite (cacciatore, cinghiali, jeep, alberi, rocce,
cespugli) sono **disegnati a runtime su `<canvas>`** dai moduli in `src/game/`
(vedi `player.js`, `boar.js`, `jeep.js`, `world.js`). Non servono immagini
esterne, così il gioco resta leggero e completamente offline.

Dalla **v0.3** questa cartella potrà contenere sprite sheet PNG esportati che
sostituiranno il disegno procedurale.
