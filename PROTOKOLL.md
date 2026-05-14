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

---

## Phase 3 — Variable Brettmaße, dynamisches Padding, Performance-Fundament

### Mikrofragen & Antworten

**Q: Wieviel Padding um das Brett (ersetzt den Bounds-Check im Solver)?**
A: Dynamisch pro Figur — beim Solver-Start aus der aktiven Move-Liste berechnet: `pad = max(|dx|, |dy|)`. Für den Springer ergibt das 2; für die in `knight.md` Zeile 33 genannten zukünftigen Figuren (1,4)/(2,3)/(3,4) entsprechend 4, 3, 4. Cleanere Abstraktion als ein hartcodierter Wert; trägt automatisch durch alle späteren Phasen.

**Q: Maximale Brettgröße?**
A: Kein Cap. Der User darf eintragen, was er will — auch Werte, bei denen der Browser ins Schwitzen kommt. Phase 9 bringt mit dem 5-Sekunden-`confirm()` einen Abbruch-Mechanismus für lange Läufe.

**Q: Wie soll das W/H-Eingabe-UI sich verhalten?**
A: Zwei Number-Inputs oben über dem Brett, Auto-Apply auf `blur` oder Enter. Minimal-UI, kein extra Apply-Button.

### Implementation

- **`buildBoard()`** ersetzt den früheren Top-Level-Build-Loop. Wird beim Start und bei jeder Dimensionsänderung neu aufgerufen.
  - Berechnet die Zellgröße `cellPx = clamp(2, min(viewport / W, viewport / H), 60)` — passt sich an die Viewport-Größe an, damit auch 200×100 ohne Scrollen sichtbar bleibt.
  - Grid-Spaltenanzahl, Brettgröße, Zellgröße werden inline auf `boardEl.style` gesetzt — `repeat(var(--...), ...)` wäre eleganter, aber Browser-Support für `var()` als Repeat-Count ist uneinheitlich.
- **Padding-Solver:** `visited` ist jetzt `Int32Array((W+2·pad) · (H+2·pad))`. Padding-Felder werden vor dem DFS auf `-1` gesetzt; die Kandidaten-Schleife schaut nur noch auf `visited === 0` und fängt damit gleichzeitig Out-of-Bounds und bereits besuchte Felder ab — eine Verzweigung pro Move-Test weniger.
- **State-Refactor:** `BOARD_SIZE` ist weg. `W`, `H`, `cellByIdx`, `overlay` sind nun `let`-Variablen auf Modul-Ebene, von `buildBoard()` neu gesetzt. Multi-File-OO-Refactor kommt erst in Phase 11 — bewusst nicht jetzt.

### Smoke-Tests (Solver-Kern, Node-Standalone)

| Brett | Startfeld | Schritte | Zeit |
|---|---|---|---|
| 8×8 | (0,0) | 63 | 2 ms |
| 8×8 | (3,3) | 63 | 10 ms |
| 5×5 | (0,0) dunkel | 24 | 1 ms |
| 5×5 | (2,2) dunkel | 24 | 0 ms |
| 100×200 | (0,0) | 19 999 | 101 ms |
| 100×200 | (50,100) | 19 999 | 53 ms |

100×200 löst weit unter der "einstellige Sekunden"-Akzeptanzschwelle.

### User-Test (Browser) — zwei lehrreiche Befunde

**1) 200×100 — der erwartete Stresstest.**

![Phase 3: 200×100 Brett, Warnsdorff löst sauber durch](_assets/phase-3-200x100.png)

`Solution found after 19999 steps.` Das sind `W·H − 1` Schritte und **0 Backtracks** — Warnsdorff "läuft hier durch", ohne ein einziges Mal in eine Sackgasse zu geraten. Die roten Tour-Linien überlagern sich so dicht, dass kaum ein einzelner Sprung sichtbar bleibt — das Brett wirkt fast einfarbig. Für große, breite Bretter ist Warnsdorff praktisch perfekt.

**2) 8×4 — der überraschende Pathologie-Fall.**

![Phase 3: 8×4 Brett, 13.4 Millionen Schritte](_assets/phase-3-8x4.png)

`Solution found after 13450907 steps.` Bei nur 32 Feldern. Das DFS hat 13.45 Millionen Versuche gebraucht — davon ≈ 6.7 Millionen Backtracks (jeder Backtrack zählt als 1, jeder Vorwärtszug als 1).

**Warum?** Reine Warnsdorff-Heuristik ist auf schmalen Rechteck-Brettern bekannt-unzuverlässig. Bei Gleichstand des Onward-Count entscheidet die Move-Definitionsreihenfolge willkürlich, und auf 8×4 führt diese willkürliche Wahl die Suche in eine Sackgassen-Region — DFS rettet das Ergebnis am Ende, aber mühsam.

Standard-Fix in der Literatur (Pohl 1967, später Roth, Squirrel/Cull): **Tie-Breaker-Regel** bei gleichem Onward-Count, z. B. das Feld bevorzugen, das näher an einer Brett-Ecke liegt. Das ist hier *nicht* eingebaut und gehört auch nicht in Phase 3. Phase 4 wird zusätzliche Heuristiken (Outside-In, Brute Force) und einen Mix-Button bringen — ggf. wäre danach der richtige Zeitpunkt für einen Warnsdorff-Tie-Breaker als bewusste Phase.

**3) 5×5 — die Paritäts-Beobachtung des Users.**

Auf 5×5 existiert eine offene Springertour nur, wenn das **Startfeld dunkel** ist. Reine Färbungs-Mathematik:

- 5×5 = 25 Felder, davon 13 dunkel (Konvention `(row+col)%2===0`) und 12 hell.
- Ein Springerzug wechselt immer die Feldfarbe → Tour der Länge 25 alterniert `Start-Farbe, andere, Start-Farbe, …` = 13 × Start-Farbe + 12 × andere.
- Start = hell ⇒ 13 helle Felder nötig, aber es gibt nur 12 ⇒ unmöglich.

Damit hat das `5×5 verweigert sinnvoll`-Akzeptanzkriterium aus dem Master-Plan ein konkretes, mathematisch sauberes Beispiel: Klick auf z. B. `(0,1)` (hell) liefert eine echte "No solution found"-Antwort. Schöne Mini-Anekdote für Phase 12.

### Commit

`fe74bf2 — Phase 3: variable W*H boards, padded solver, dynamic cell size`

### Nachzügler: Resize-Listener (didaktisch relevant!)

User-Hinweis direkt nach Phase-3-Akzeptanz:

> "Das Board muss auf einen window resize event reagieren und sich anpassen, auch wenn keine zusätzliche User-Interaktion erfolgt. Wenn wir auf einem Android-Device sind und das Gerät von Portrait nach Landscape drehen, muss es auch klappen … ist da meine Erwartung zu hoch?"

**Technische Korrektur:** `applyCellSize()` ist als Pure-CSS-Resize-Pfad aus `buildBoard()` herausgezogen — verändert nur `--board-cell` und die inline Grid-Geometrie auf `boardEl.style`, keine DOM-Rekonstruktion. Resize-Listener auf `window` mit Trailing-Edge-Debounce (80 ms). Die gerenderte Tour bleibt erhalten: SVG-Overlay skaliert über seine `viewBox`, Schriftgrößen folgen der CSS-Variable.

**Meta-Erkenntnis (wichtiger als die Code-Korrektur):** Die Erwartung des Users war nicht zu hoch. Resize-Reaktion gehört bei einer Webapp, deren ganzer Sinn aus der visuellen Darstellung kommt, zum **Baseline-Verhalten** — wie Hover-States, sensible Defaults, Keyboard-Bedienbarkeit. YAGNI-Disziplin gegen Featuritis darf das nicht aushebeln; "der Plan erwähnt es nicht" ist kein Argument, sondern eine Lücke im Plan.

Diese Erkenntnis ist als neue Sektion **"Baseline-Verhalten ist kein Feature"** in `~/.claude/CLAUDE.md` verankert, damit sie auch zukünftige Projekte prägt. Konkretes Anti-Pattern, das ich hier zeige: Plan-Wortlaut zu eng auslegen ("dynamische Canvas-Größe" auf "passt sich an W/H an" reduzieren, statt auch "passt sich an Viewport-Änderungen an" mitzudenken).

Sehr relevanter Punkt für die Phase-12-Lehrunterlage unter "Was Profis anders machen" — gerade weil hier der **User** den Profistandard setzt und die AI das nachholt.

### Nachzügler-Commit

`94e018d — Phase 3 follow-up: window resize listener, preserves rendered tour`
