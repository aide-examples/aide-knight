# Knight's Tour App — Implementierungsplan

Plan für eine lokale Web-App, die das Springerproblem löst und visualisiert.

## Context

Die Aufgabe stammt aus [knight.md](knight.md). Ziel: Eine Multi-File HTML-App (kein Server, kein Node.js — klassische `<script>`-Tags), die per DFS + wählbarer Heuristik eine Tour berechnet und grafisch darstellt. Unterstützt vier verschiedene Figuren, blockierbare Felder und Symmetrie-Optionen.

## Dateien

| # | Datei | Inhalt |
|---|-------|--------|
| 1 | `board.js` | `Board` — Datenmodell mit dynamischem Padding, blockierbaren Feldern, konfigurierbaren Figuren |
| 2 | `solver.js` | `Solver` — iterativer DFS, 3 Heuristiken (Warnsdorff, Outside-In, Brute Force), Symmetrie, closed |
| 3 | `ui.js` | `UI` — Canvas-Rendering (Schachbrett, Pfad, Nummern, blockierte Felder, Closing-Linie) |
| 4 | `app.js` | Event-Wiring (Linksklick = Tour, Rechtsklick = blockieren) |
| 5 | `style.css` | Layout & Styling |
| 6 | `index.html` | HTML-Struktur mit Controls für alle Optionen |

## Architektur

- **Figuren**: Jede Figur wird durch ein (a,b)-Paar definiert. `Board.makeOffsets(a,b)` erzeugt alle 8 Richtungsvarianten. Vier Figuren: Springer (1,2), Langspringer (1,4), Kamel (2,3), Zebra (3,4).
- **Dynamisches Padding**: Der Padding-Rand passt sich automatisch an den maximalen Offset der gewählten Figur an.
- **Heuristiken**: Warnsdorff (wenigste Ausgänge), Outside-In (maximaler Zentrumsabstand), Brute Force (keine Sortierung).
- **Symmetrie**: Halbe Tour + Spiegelfeld-Mitbelegung + Rekonstruktion.
- **Solver**: Iterativer DFS (Stack-Overflow-sicher). 5-Sekunden-Timeout per `confirm()`.

## Verifikation

1. `index.html` per Doppelklick öffnen
2. 8×8 Springer mit Warnsdorff → schnelle Lösung
3. Figur wechseln → Board wird neu initialisiert
4. 100×200 testen
5. Rechtsklick → Felder blockieren → beliebige Formen
6. Geschlossene Tour → Closing-Linie sichtbar
7. Symmetrie mit passenden Dimensionen testen
