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

---

## Phase 4 — Heuristik-Wahl, Figuren, Mix-Button, Persistenz

### Mikrofragen & Antworten (vorab)

**Q: Wo sollen die drei neuen Controls (Heuristik-Dropdown, Figur-Dropdown, Mix-Button) sitzen?**
A: Eigene Reihe unter W/H. Klar gegliedert, keine Platzprobleme auf schmalen Screens (mit `flex-wrap`).

**Q: Was passiert beim Klick auf den Mix-Button?**
A: Reihenfolge neu permutiert + automatisch erneuter Solve vom letzten Startfeld. User sieht den Effekt sofort. Falls noch kein Startfeld geklickt wurde: nur würfeln, kein Solve.

**Q: Was soll über Reloads hinweg in localStorage überleben?**
A: Vollständiger State — W, H, Heuristik, Figur und Mix-Order. Beim Reload Settings wiederhergestellt; Tour selbst wird nicht persistiert (nur Konfiguration).

### Mikrofragen & Antworten (während der Implementierung)

**Q (vom User mid-phase): Beim Klick auf ein Feld erscheint die Koordinate nicht sofort in der Fußleiste — als visuelle Rückmeldung wäre das aber nötig, bevor die Suche beginnt.**
A: Bug bestätigt. Ursache: JS ist single-threaded — der Click-Handler setzt `statusEl.textContent = "X / Y"`, ruft dann aber synchron `solve()` auf, das den Main-Thread blockiert; der Browser kommt vor dem Block nicht zum Repaint. Bei 8×8 Knight (1 ms) sieht man's nicht, bei längeren Suchen schon. **Fix:** Double-`requestAnimationFrame` zwischen Statusupdate und `solve()`. Eine einzelne rAF läuft *vor* dem nächsten Paint; zwei rAFs hintereinander garantieren, dass der Browser dazwischen einen Paint einlegt. `setTimeout(fn,0)` würde es auch tun, ist aber per globaler CLAUDE.md-Regel verpönt — `requestAnimationFrame` ist der saubere Weg.

**Q (vom User mid-phase): In der Spec gibt es das Feature, dass Re-Klick auf dasselbe Startfeld die Suche von der aktuellen Lösung aus fortsetzt. Gehört das zu dieser Phase?**
A: Nein — gehört zu **Phase 9** zusammen mit dem 5-Sekunden-Confirm-Dialog. Begründung: die "Continue from current solution"-Logik braucht eine speicherbare Search-State-Struktur (Stack + visited), die in Phase 9 sowieso aufgebaut werden muss, damit der Cancel-Dialog dazwischenfunken kann.

### Implementation

- **Heuristiken** als String-Konstanten (`'warnsdorff'`, `'outsideIn'`, `'bruteForce'`), zentral in `pickCandidates()` ausgewertet:
  - Warnsdorff: Onward-Count pro Kandidat, aufsteigend.
  - Outside-In: euklidischer Quadrat-Abstand zum Brett-Zentrum, *negiert* (damit "größer = weiter draußen = bevorzugt" mit derselben aufsteigenden Sort-Funktion klappt).
  - Brute Force: keine Sortierung, Reihenfolge = aktuelle Move-Definitionsreihenfolge.
  - Für alle drei: stabile Sortierung (ES2019+) hält bei Gleichstand die aktuelle Move-Order — der Mix-Button hat damit auch für Warnsdorff/Outside-In als Tie-Breaker einen sichtbaren Effekt.
- **Figuren** als `"a,b"`-Keys (`'1,2'` Knight, `'1,4'` Camel, `'2,3'` Zebra, `'3,4'` Giraffe). `generateBaseMoves(figureKey)` erzeugt acht Move-Vektoren als sign+swap-Permutationen von (a, b).
- **Mix-Button:** Fisher-Yates auf der aktiven Move-Liste, Tooltip via `mixBtn.title` zeigt die aktuelle Reihenfolge als `(dx,dy)`-Paare. Auto-Resolve vom letzten Startfeld via `resolveLast()`.
- **State + localStorage:** Modul-globale `let`-Variablen für `W`, `H`, `heuristic`, `figure`, `activeMoves`. `saveState()` schreibt nach jedem Setting-Change. `loadState()` validiert beim Reload (`isValidMoveOrder` prüft, dass die gespeicherte Order eine Permutation der Basis-Moves ist) und fällt sonst auf Defaults zurück. Storage-Key: `aide-knight-state-v1` — das `v1` lässt Schema-Migrationen später zu.
- **i18n** erweitert um `heuristicLabel`, `figureLabel`, `mixBtn` (für `en` und `de`).

### Smoke-Tests (Node-Standalone, Step-Budget 50 M)

| Config | Schritte | Zeit | Bemerkung |
|---|---|---|---|
| 8×8 (1,2) Warnsdorff | 63 | 1 ms | Sauber durch (Regression-Check) |
| 8×8 (1,2) Outside-In | 113 | 1 ms | ~50 Backtracks, andere Geometrie |
| 8×8 (1,2) Brute Force | 16 501 401 | 1 028 ms | Bekannte Schwere |
| 8×8 (1,4) Camel Warnsdorff | >50 M | abgebrochen | Vermutlich keine Hamilton-Tour |
| 8×8 (1,4) Camel Outside-In | >50 M | abgebrochen | Dito |
| 8×8 (2,3) Zebra Warnsdorff | >50 M | abgebrochen | Dito |
| 8×8 (3,4) Giraffe Warnsdorff | 3 420 213 | 303 ms | Sauber "no solution" |
| 10×10 (1,2) Warnsdorff | 99 | 0 ms | Sauber |
| 10×10 (1,2) Outside-In | 13 973 | 1 ms | Outside-In braucht hier deutlich mehr Backtracking |

Bemerkenswert: Outside-In auf 10×10 produziert 13 973 Schritte vs. 99 für Warnsdorff — dramatischer Heuristik-Unterschied. Und die größeren Figuren (Camel, Zebra) haben auf 8×8 vermutlich gar keine Hamilton-Tour; die Giraffe beweist's binnen 300 ms.

### User-Test

![Phase 4: 8×6 Zebra mit Warnsdorff, sauber widerlegt nach 371 M Schritten](_assets/phase-4-heuristic.png)

User hat den schwersten denkbaren Fall ausgewählt: **8×6 Brett, Figur (2,3) Zebra, Heuristik Warnsdorff, Startfeld (0,5)**. Ergebnis nach ≈70 Sekunden Browser-Pause: `No solution found after 371280573 steps.` — der Solver hat den kompletten Suchbaum erschöpft und damit *bewiesen*, dass auf 8×6 keine offene Zebra-Tour von (0,5) existiert. Genau das gewünschte Verhalten: keine willkürliche Abbruchgrenze, sondern echtes Erschöpfen des Suchraums. Phase 9 wird mit dem 5-Sekunden-Confirm-Dialog die Geduldsanforderung an den User entschärfen.

Bestätigt funktionierende Features:
- Heuristik-Umschaltung mit Auto-Resolve vom letzten Startfeld
- Figur-Wechsel mit Brett-Reset und passendem Padding (für (2,3) wird `pad=3` gerechnet)
- Mix-Button mit Tooltip-Anzeige der aktuellen Reihenfolge
- Status-Feedback-Fix (Koordinate erscheint sofort, bevor der Solver blockiert)
- localStorage-Persistenz über Reload hinweg

### Commit

`bec8718 — Phase 4: heuristic + figure + mix-button + full-state localStorage`

---

## Phase 5 — Sichtbarkeits-Toggles

### Mikrofragen & Antworten

**Q: Wo sollen die beiden Checkboxen sitzen?**
A: Eigene dritte Reihe — Reihe 1 W/H, Reihe 2 Heuristik/Figur/Mix, Reihe 3 Numbers/Lines. Klar gegliedert.

**Q: Sollen Nummern automatisch unsichtbar werden, wenn die Schrift sowieso unlesbar wäre?**
A: Ja, dynamisch nach Lesbarkeit — Schwelle bei Font ≥ 9 px (entspricht Zellgröße ≥ 28 px, weil Font = 0.32 · Zellgröße). Die Checkbox bleibt aktiv, nur der Render wird unterdrückt.

### Implementation

- **CSS-Custom-Properties als Toggle-Mechanismus:** `--num-display` und `--overlay-display` steuern `display:` der entsprechenden Elemente. Flippen einer Checkbox schreibt nur die CSS-Variable um — kein DOM-Eingriff, gerenderte Tour bleibt unangetastet.
- **Auto-Hide-Logik** in `applyVisibility()` — wird aus `applyCellSize()` mitaufgerufen, damit beim Resize die Schwelle automatisch nachgezogen wird:
  ```js
  const numbersUsable = showNumbers && (currentCellPx * 0.32) >= NUM_FONT_MIN_PX;
  ```
  Wenn der User das Fenster verkleinert und die Zellgröße unter 28 px fällt: Nummern verschwinden, Checkbox bleibt aktiv.
- **Persistenz:** `showNumbers` und `showLines` werden mit dem übrigen State in `localStorage` gespeichert.
- **i18n:** zwei neue Strings (`numbersLabel`, `linesLabel`), in `en` und `de` mitgepflegt.

### User-Test

**Test 1 — Lines-only auf 7×7 Knight (Warnsdorff):**

![Phase 5: 7×7 Tour nur als Liniengeometrie](_assets/phase-5-lines-only.png)

Bei deaktivierter "Numbers"-Checkbox erscheint die Tour ausschließlich als rote Liniengeometrie. Lehrreich für die visuelle Symmetriebetrachtung: jeder Schnittpunkt erzählt etwas über die Springer-Bewegungsstruktur.

**Test 2 — Numbers-only auf 40×25 Knight (Warnsdorff):**

![Phase 5: 40×25 Tour nur mit durchnummerierten Feldern (1000 Schritte)](_assets/phase-5-numbers-only.png)

Brett knapp am Render-Limit: 40 × 25 = 1000 Felder, Zellgröße ≈ 30 px (begrenzt durch Viewport-Höhe), Font ≈ 9.6 px — gerade noch über der 9-px-Schwelle, Nummern werden also gerendert und sind klein-aber-lesbar. Würde der User auf 41×25 erhöhen, fiele die Schrift unter 9 px und die Nummern würden auto-hidden, ohne dass er die Checkbox ändert. Sauberes Beispiel für die dynamische Schwelle.

Zugzähler 999 von 1000 — Warnsdorff durch, 0 Backtracks.

### Commit

`72f15cd — Phase 5: visibility toggles for numbers and tour line`

---

## Phase 6 — Geschlossene Touren

### Mikrofragen & Antworten (vorab)

**Q: Wo soll die "Closed"-Checkbox sitzen?**
A: An Reihe 3 angehängt — neben Numbers und Lines.

**Q: Wie soll die Schließungslinie sich von der normalen Tour-Linie unterscheiden?**
A: Gestrichelt, gleiche Farbe (rot). Klares Signal "gleicher Tour-Bestandteil, sondiert die Schließung".

### Mikrofragen & Antworten (während der Implementierung — wichtig!)

**Q (vom User mid-phase, kurz nach Start der Implementierung): Noch eine Idee für die geschlossene Tour: wenn man im Startfeld beginnt, dann müsste das *andere* Feld, von dem aus das Startfeld erreichbar ist, so lange wie möglich nicht benutzt werden. Künstlich verschlechterte "hohe Freiheitsgrade"-Zahl, oder algorithmisches Aussparen bis zum vorletzten Zug.**

**A: Das ist *exakt* die klassische Schwenk-Technik in praktischer Form — und didaktisch der wertvollste Moment der bisherigen Übung.** Statt des in `knight.md` Zeile 21 skizzierten Beide-Enden-Verfahrens (alternating ends) liefert die Bias-Idee dasselbe Ziel mit dramatisch weniger Code:

- Vor der Suche: Maske der Startnachbarn berechnen (Felder, von denen aus der Springer das Startfeld erreichen kann).
- In Warnsdorff/Outside-In: diesen Startnachbarn einen Strafwert von 1000 auf den Onward-Count addieren (alle realen Counts ≤ 8) — Stable-Sort schiebt sie ans Ende.
- Bei Path-Vollständigkeit: prüfen, ob der letzte Pfad-Eintrag in der Startnachbar-Maske liegt. Wenn ja, geschlossen, fertig. Wenn nein, Backtrack via normaler exhausted-path Logik.

**Vorteile gegenüber Alternating-Ends:**
- Eindimensional, kein Deque, ein Pfad-Array
- Code-Erweiterung: ~10 Zeilen statt ~80
- Bei Warnsdorff/Outside-In hocheffektiv (Smoke-Tests unten)

Für Brute Force greift der Bias nicht (kein Scoring) — der Solver verlässt sich dort allein auf das Schließungs-Backtracking, ist also langsam wie offene Brute-Force, aber korrekt.

Das ist ein lehrreicher Moment für Phase 12: **der User hat den Algorithmus verbessert**. Nicht der AI-Assistent. Das Beide-Enden-Verfahren war ein plausibler, aber unnötig schwerer Vorschlag in der Spec; im Live-Dialog kam der User auf die elegantere Variante und hat damit auch demonstriert, dass die in `knight.md` notierten Ideen nicht heilig sind.

### Implementation

- **State:** `wantClosed: boolean`, persistiert in `localStorage`.
- **Solver:** `solve(startCol, startRow, closed)` — der `closed`-Parameter aktiviert die Bias-Logik.
  - `startNbrs: Uint8Array` markiert Startnachbar-Felder vor dem DFS.
  - `pickCandidates` addiert `CLOSURE_PENALTY = 1000` auf Startnachbar-Scores (für Warnsdorff und Outside-In; für Brute Force kein Bias).
  - Auf `path.length === total`: Wenn `closed`, zusätzlich prüfen ob `startNbrs[at(last)]`; nur dann Erfolg. Sonst fällt der Loop durch zum normalen Backtrack-Pfad (top frame ist leer, weil alle Felder besucht).
- **Rendering:** `renderTour(path, isClosed)` — bei `isClosed` zusätzlich ein `<line>` von `path[N-1]` zu `path[0]` als Dashed-Stroke (`stroke-dasharray='0.18 0.12'`). Liegt im selben `#overlay`, wird also vom Lines-Checkbox-Toggle automatisch mitversteckt.
- **i18n:** neuer String `closedLabel` (en: "Closed", de: "Geschlossen").

### Smoke-Tests (Node-Standalone)

| Konfig | Schritte | Zeit | Bemerkung |
|---|---|---|---|
| 8×8 Knight (0,0) Warnsdorff CLOSED | 85 | 1 ms | 22 Backtracks — Bias greift, geschlossene Tour |
| 8×8 Knight (3,3) Warnsdorff CLOSED | 63 | 8 ms | **0 Backtracks** — gerader Lauf direkt zur geschlossenen Tour |
| 6×6 Knight (0,0) Warnsdorff CLOSED | 35 | 0 ms | 0 Backtracks |
| 10×10 Knight (0,0) Warnsdorff CLOSED | 99 | 0 ms | 0 Backtracks |
| 5×5 Knight (0,0) Warnsdorff CLOSED | 3 470 157 | 425 ms | Beweist exhaustiv: keine geschlossene Tour |
| 5×5 Knight (2,2) Warnsdorff CLOSED | 1 283 153 | 146 ms | Dito, vom Zentrum |
| 8×8 Knight (0,0) Outside-In CLOSED | 77 | 1 ms | Auch mit anderer Heuristik effektiv |
| 8×8 Knight (0,0) Warnsdorff OPEN | 63 | 0 ms | Regression-Check: Open-Mode unverändert |

Der Bias kostet auf lösbaren Konfigurationen typischerweise 10-40 % zusätzliche Schritte gegenüber Open-Mode. Auf nicht-lösbaren beweist die Suche die Nicht-Existenz in unter einer Sekunde (5×5).

**Mathematischer Hintergrund 5×5 nicht-geschlossen:** Auf 5×5 hat das Brett 13 dunkle + 12 helle Felder. Eine geschlossene Tour müsste Länge 25 sein, dabei abwechselnd Farben besuchen, *und* zum Startfeld zurückkehren. Aus dem Startfeld der Farbe X folgt: 13 × X + 12 × ¬X, der letzte Zug (Zug Nr. 25, Farbe X) müsste sich aber mit dem ersten Zug (Farbe X) per Springerzug verbinden — Springerzug wechselt aber die Farbe. Widerspruch. Keine 5×5-Tour ist geschlossen.

### User-Test

![Phase 6: 9×8 Knight (Warnsdorff) geschlossene Tour mit gestrichelter Schließungslinie](_assets/phase-6-closed.png)

Test: **9×8 Brett, Knight, Warnsdorff, Closed-Modus, Start (0,7)**. Lines an, Numbers aus (Geometrie-Sicht). Solver liefert in 71 Schritten eine geschlossene Tour über alle 72 Felder. Die gestrichelte rote Schließungslinie ist oben links sichtbar — verbindet das letzte Tour-Feld mit dem Startfeld.

Bestätigt funktionierende Features:
- Closed-Checkbox in Reihe 3 zwischen Lines und (nichts) — siehe Header
- Solver mit Bias findet geschlossene Touren mit minimaler Mehrarbeit
- Schließungslinie visuell deutlich (gestrichelt) von der Tour-Linie unterscheidbar
- Lines-Toggle versteckt auch die Schließungslinie (gemeinsamer `#overlay`)
- localStorage-Persistenz der Closed-Flag

### Commit

`8025365 — Phase 6: closed-tour mode via start-neighbour bias (Schwenk technique)`
