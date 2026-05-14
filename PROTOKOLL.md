# Protokoll

Verbatim-nahe Aufzeichnung des aide-knight-Aufbaus pro Phase, als Quelle für die didaktische Destillation in Phase 12 (siehe `knight_plan.md`).

---

## Phase 0 — Tabula rasa & Self-Commitment

### Kontext

Vor Phase 0 lag im Verzeichnis eine vollständige, lauffähige Knight's-Tour-Implementierung (8 Dateien, ~890 Zeilen). Diese wurde **vor Beginn der didaktischen Übung hart entfernt**, damit der Aufbau aus der reinen `knight.md`-Spezifikation heraus tatsächlich bei Null beginnt.

### Aktionen

1. **Sicherung des Alt-Codes** als Git-Tag `pre-rebuild-2026-05-13` — der alte Code bleibt im Git-Objekt-Store auffindbar, falls didaktisch später ein Vergleich gewünscht ist.
2. **Hartes Löschen** der bestehenden Quelldateien (`app.js`, `board.js`, `solver.js`, `ui.js`, `index.html`, `style.css`, `knight_plan.md`) per `git rm`. Im Working-Tree blieb nur `knight.md`.
3. **Self-Commitment des AI-Assistenten:** Während aller folgenden Phasen wird der alte Code **nicht** konsultiert — weder per `Read`, noch per `Bash` (`git show pre-rebuild-2026-05-13:...`), noch über andere Werkzeuge. Diese Selbst-Verpflichtung ist Teil der didaktischen Reinheit: würde im Hintergrund "abgeschrieben", verlöre der Lehrwert seine Substanz.
4. **Master-Plan persistiert** als neuer `aide-knight/knight_plan.md` — der ephemere Plan aus `~/.claude/plans/` wäre für die spätere Phase-12-Destillation nicht verlässlich verfügbar; jetzt ist er versioniert im Repo.

### Commit

`51ee975 — Phase 0: tabula rasa for didactic rebuild`

---

## Phase 1 — 8×8-Brett rendert, Klick erkennbar

### Mikrofragen & Antworten

**Q: Welche Farben für das Schachbrett?**
A: Klassisches Schach-Schema (chess.com / lichess-Defaults): `#f0d9b5` (hell, beige) und `#b58863` (dunkel, braun).

**Q: Schwarzer Text auf dunklen Feldern — kontraststark genug? Und führt eine Mischung "weiß auf dunkel / schwarz auf hell" zu visueller Unruhe?**
A: Ja, Mischung ist unruhig. Empfohlene Lösung: **eine** Tintenfarbe für alles, dunkelbraun `#3a2410` — auf hell hochkontrastiv, auf dunkel noch lesbar. Akzeptiert.

**Q: Wo soll die Klick-Koordinate erscheinen, und wie?**
A: Status-Zeile unter dem Brett. Format: `<col> / <row>` (also `4 / 7`), sehr schlicht. Menü-Elemente kommen später oben.

**Q: Inline (HTML+CSS+JS in einer Datei) oder schon jetzt mehrere Dateien?**
A: Empfehlung: drei getrennte Dateien (`index.html`, `style.css`, `app.js`) ab Anfang — der echte Multi-File-Refactor (board.js / solver.js / ui.js) kommt in Phase 11. Akzeptiert.

### Implementation

- `index.html` — Minimalskelett (`<div id="board">` + `<div id="status">`), kein Framework, kein Build-Schritt.
- `style.css` — CSS-Variablen für Zellgröße (60px) und Farben, CSS-Grid für das Brett, Hover-Effekt per `filter: brightness(1.07)`. Tintenfarbe als `--color-ink`.
- `app.js` — Build-Loop von `row = 7` (oben sichtbar) bis `row = 0` (unten), um die Schach-Konvention `a1 = (0,0)` einzuhalten. Feldfarbe folgt `(row + col) % 2 === 0 → dark` (macht `a1` zu einem dunklen Feld, regelkonform).

### User-Test

Doppelklick auf `index.html` öffnet das Brett im Browser. Klick auf ein Feld zeigt unten `<col> / <row>`. User-Bestätigung per Screenshot:

![Phase 1: gerendertes 8×8-Brett](_assets/phase-1-board.png)

### Commit

`dbe9358 — Phase 1: 8x8 chessboard renders, click reports cell coordinates`

---

## Phase 2 — Solver-Kern (DFS + Warnsdorff), Linie + Nummern

### Mikrofragen & Antworten (vorab)

**Q: Welche Farbe für die Tour-Linie?**
A: Kräftiges Rot `#c0392b`. Kontrastiert gut auf beigem und braunem Feld.

**Q: Wo soll der Schritt-Zähler erscheinen, und in welcher Wortwahl?**
A: Zweite Status-Zeile unter dem Brett, Wortlaut `Lösung nach N Schritten.` bzw. `Keine Lösung nach N Schritten.` — User-Diktion: "Schritte", nicht "Zugversuche" (obwohl knight.md letzteren Begriff verwendet).

### Mikrofragen & Antworten (während der Implementierung)

**Q (vom User mid-phase): Soll das UI komplett auf Englisch sein, mit Vorbereitung für weitere Sprachen?**
A: Ja. Eingebaut: `STRINGS`-Objekt mit Spracheinträgen (`en` als aktiv, `de` mitgepflegt) und `LANG`-Konstante am Kopf von `app.js`. Neue Sprache hinzufügen = ein weiterer Eintrag im Objekt.

**Q (vom User mid-phase): Können die Tour-Nummern nicht oberhalb der roten Linie liegen statt darunter?**
A: Ja. Z-Index-Layering: Felder unten, Linie (`#overlay`) `z-index: 1`, Nummern (`.num`) `z-index: 2`. Stacking-Kontext wird über `#board { z-index: 0 }` erzwungen, damit die Reihenfolge nicht aus dem äußeren Kontext gestört werden kann.

**Q (vom User mid-phase): Sollte ich nicht schon jetzt zwischen DFS und Warnsdorff wählen können?**
A: Begriffsklärung erforderlich. DFS ist *der* Suchalgorithmus, Warnsdorff eine Heuristik *innerhalb* des DFS für die Reihenfolge der Kandidaten. `knight.md` (Z. 30) sieht drei Heuristik-*Optionen* vor (Warnsdorff / Brute Force / Outside-In), alle auf DFS-Basis. Entscheidung: bei Plan bleiben — Heuristik-Auswahl kommt in **Phase 4**, Phase 2 fährt mit Warnsdorff fest verdrahtet.

### Implementation

- **Solver** (iterativ, Stack-basiert):
  - `visited` als `Int32Array(W*H)` — 0 = unbesucht, sonst Tour-Nummer. Cache-freundlich, vorbereitet für große Bretter.
  - Pro Stack-Frame: bereits Warnsdorff-sortierte Kandidatenliste + Cursor. Auf Backtrack: Frame poppen, `visited` und `path` zurücksetzen.
  - **Schritt-Counter:** jeder Forward-Versuch UND jeder Backtrack zählen je +1.
- **Render** (im selben `app.js`, Multi-File kommt in Phase 11):
  - SVG-Overlay als Kind von `#board`, `viewBox="0 0 8 8"` (eine Einheit pro Zelle, automatisch skalierend).
  - Tour-Pfad als einzelne `<polyline>`, `stroke="#c0392b"`, `stroke-width="0.08"` (≈ 4.8 px bei 60-px-Zellen).
  - Y-Achse gespiegelt für die SVG-Koordinaten, weil row=0 logisch unten, SVG-Y aber von oben zählt: `y = BOARD_SIZE - 1 - row + 0.5`.
  - Nummern als `<div class="num">N</div>` in der jeweiligen Zelle, font-size proportional zur Zellgröße (CSS-Variable).
  - Bei jedem neuen Klick: alle alten Nummern entfernen, SVG leeren.
- **i18n-Scaffold:** `STRINGS = { en: {...}, de: {...} }`, `LANG = 'en'`, alle UI-Strings über das `T`-Alias. `<html lang>`, `document.title`, h1 und Status-Zeilen werden zur Laufzeit gesetzt.

### User-Test

8×8-Klick auf beliebiges Feld liefert in unter 100 ms eine vollständige Tour. Die ersten Sprünge prüfen sich visuell als gültige `(±1, ±2)`-Bewegungen. UI komplett auf Englisch. Layer-Reihenfolge sichtbar: Linie unter den Nummern.

![Phase 2: gelöste Tour mit roter Linie und Nummern](_assets/phase-2-solution.png)

### Commit

`1d9f19c — Phase 2: knight's tour solver core (iterative DFS + Warnsdorff) with line and number render`
