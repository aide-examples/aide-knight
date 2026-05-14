# Technical Contract (T-Contract)

Plattform- und Qualitäts-Verpflichtungen für aide-knight, parallel zum funktionalen Vertrag (`knight.md`) und zum Vorgehensplan (`knight_plan.md`).

> **Hinweis zur Entstehung:** Dieser Vertrag wurde **zu spät** geschrieben — erst nach Phase 7, auf User-Hinweis hin. Sieben Phasen lang wurde die Software nur gegen `knight.md` (F-Contract) gebaut; Plattform-Qualitäten wuchsen ad hoc oder fehlten ganz. Phase 7.5 ist das Retrofit. Dass dieser Vertrag fehlte, ist als didaktisches Lehrstück offen festgehalten — siehe `PROTOKOLL.md` Phase 7.5 und den Eintrag *"F-Contract und T-Contract gehören gleichzeitig an den Anfang"* in `~/.claude/CLAUDE.md`.

---

## 1. Architektur

- **Objektorientiert ab Tag 1** (`knight.md` Z. 18). Klassen mit klaren Verantwortungen, kein globaler State außerhalb von Klassen.
- **Multi-File von Anfang an.** Die Code-Basis wird in folgende Module gegliedert; jede Datei < 250 Zeilen:
  - `js/i18n.js` — `I18n`-Klasse: Strings-Map, aktuelle Sprache, `t(key)`-Lookup, Listener für Sprach-Wechsel.
  - `js/figures.js` — Statische Helper: `generateBaseMoves(figureKey)`, Figur-Liste, Padding-Berechnung.
  - `js/solver.js` — `Solver`-Klasse: pure (keine DOM-Abhängigkeit), iteratives DFS, Heuristiken, Closure-Bias, Symmetrie-Bridge.
  - `js/board.js` — `Board`-Klasse: Geometrie (W, H, cellPx), Cell-Render, Resize-Reaktion, Click-/Keyboard-Events.
  - `js/renderer.js` — `Renderer`-Klasse: SVG-Overlay, Tour-Linie, Nummern, Schließungslinie.
  - `js/state.js` — `AppState`-Klasse: Single Source of Truth aller Einstellungen, Serialisierung nach URL-Hash und localStorage.
  - `js/ui.js` — `UI`-Klasse: Dropdown-/Checkbox-/Button-Wiring, ARIA-Updates.
  - `js/app.js` — Orchestrierung: instanziiert + verdrahtet alle Module beim Laden.
- **Pure Functions** für alle berechnenden Operationen. DOM-Zugriff strikt lokalisiert auf `board.js`, `renderer.js`, `ui.js`, `app.js`.
- **Singletons via `getInstance()`** dort wo nötig (`I18n`, `AppState`). Direkte Imports/Module-Globals sind keine Architektur.

## 2. Plattform-Constraints

- **`file://`-lauffähig** ohne Webserver, ohne Node.js (`knight.md` Z. 16). Keine Build-Schritte, keine npm-Dependencies, keine ES-Module-`import`-Syntax (file:// + CORS-Restriktionen). Klassische `<script>`-Tags in Reihenfolge.
- **Browser-Kompat:** Modern Chromium, Firefox, Safari (jeweils ≥ 2 Jahre). Keine experimentellen APIs ohne Fallback.

## 3. Replay-Testbarkeit

- **State als URL-Hash** deep-linkbar: jeder relevante Einstellungs-Zustand ist in einem URL-Hash kodiert, der per Copy/Paste oder Bookmark wiederherstellbar ist. Format:
  ```
  index.html#lang=en&W=8&H=8&fig=1,2&heur=warnsdorff&sym=none&closed=0&numbers=1&lines=1&mix=1,2;2,1;...&start=3,3
  ```
  - Beim Laden: Hash parsen → State setzen → Brett rendern. Wenn `start` gesetzt: Solver auto-trigger.
  - Bei jeder State-Änderung: Hash aktualisieren (via `history.replaceState`, damit Browser-Verlauf nicht zugemüllt wird).
- **Headless-CI-tauglich:** Mit `chrome --headless --screenshot` (oder Playwright/Puppeteer) und einer URL aus dem Hash lässt sich jeder Phase-Zustand reproduzieren und gegen ein Referenz-Bild diffen. Diese Möglichkeit muss ohne Code-Änderung existieren — sie ist die *Definition* von Replay-Testbarkeit.
- **Pure-Function-Tests browserbasiert** in `tests/test.html` (lädt `js/solver.js`, `js/figures.js` und führt Assertions aus, ohne DOM). Mensch-lesbare Pass/Fail-Liste; CI-tauglich, weil `headless` mit Exit-Code arbeiten kann.

## 4. Responsivität / Plattform-Ergonomie

- **Reflow bei Viewport-Änderung** (Resize, Device-Rotation, Tab-Splitting): Baseline-Verhalten, kein Feature. Tour bleibt während Resize erhalten — nur die Geometrie wird aktualisiert.
- **Touch-Eingabe** wird *vor* mausspezifischen Gesten geprüft. Konkret für Phase 8: Rechtsklick zum Blockieren braucht ein Touch-Substitut (z.B. Long-Press oder Toggle-Modus-Button). Diese Mikrofrage gehört explizit in die Phase-8-Vorab-Klärung.
- **Hover-States** und `cursor: pointer` auf klickbaren Elementen.
- **Lang laufende Operationen:** Progress-Indikation und Abbruchmöglichkeit. Im F-Plan formal als Phase 9, konzeptuell ein T-Contract-Item.

## 5. Internationalisierung

- **i18n ist Architektur**, kein Feature. Zentrale Quelle in `js/i18n.js`. Alle UI-Texte — inklusive Dropdown-Option-Werte (Figuren-Namen, Heuristik-Namen, Symmetrie-Namen) — sind übersetzbar.
- **Sprach-Switcher** als sichtbares Plattform-Element in der UI (Reihe 1). Persistiert via URL-Hash und localStorage.
- **Gepflegte Sprachen:** Englisch (Default), Deutsch. Neue Sprache hinzufügen = ein Eintrag in der STRINGS-Map.

## 6. Accessibility (a11y)

- **Keyboard-Navigation** aller Controls. Brett: Pfeile bewegen Fokus von Zelle zu Zelle, Enter/Space löst Solve aus.
- **ARIA-Rollen:** `role="grid"` auf `#board`, `role="gridcell"` auf jeder Zelle, `aria-label="Column X, Row Y"` (i18n'd) auf jeder Zelle. Status-Zeilen mit `aria-live="polite"`.
- **Sichtbare Focus-Indikatoren** auf allen Custom-Controls (Inputs, Selects, Buttons, Cells).
- **Keine Information rein farblich kodiert.** Tour-Linie + Nummern parallel als Signal; Numbers-Toggle ist Teil-Lösung.
- **Lighthouse-Accessibility-Score** ≥ 90 als Akzeptanzkriterium für Phase 7.5 und für jede Folgephase.

## 7. Performance & Robustheit

- **Soft-Step-Limit** als Schutz vor Endlos-Such-Hängern, bis Phase 9 das richtige Cancel-Dialog liefert.
- **Defensive Parsing** aller localStorage-Lese-Pfade und URL-Hash-Werte; graceful Degradation wenn Storage oder Hash fehlt.
- **"Kein Cap" auf Brettgröße** bleibt User-Entscheidung, aber als bewusster Trade-off dokumentiert.
- **Stille Auslassung ist verboten** (globale CLAUDE.md-Regel): keine Fehler werden stillschweigend ignoriert — lieber krachend abbrechen als falsche Ergebnisse produzieren.

## 8. Code-Qualität

- **Test-Skelett browserbasiert:** `tests/test.html` + `tests/tests.js` mit einfachem `assert()`-Helfer; Pass/Fail visuell und im Konsolen-Log.
- **Beschreibungssatz** nach `#`-Header in jeder Markdown-Datei (globale CLAUDE.md-Regel).
- **Modulgröße:** Jede Datei in `js/` < 250 Zeilen (entspricht der `knight_plan.md`-Vorgabe für Phase 11, hier aber von Tag 1 an).

---

## Erfolgs-Indikatoren

Am Ende einer Phase, die diesen T-Contract respektiert, ist erfüllt:

- ✓ Alle berührten Module < 250 Zeilen.
- ✓ Neue Funktionalität durch URL-Hash deep-linkbar.
- ✓ Neue UI-Elemente Keyboard-bedienbar und mit ARIA-Labels versehen.
- ✓ Neue UI-Texte in STRINGS gepflegt (en + de).
- ✓ Tests im `tests/test.html`-Skelett für jede neu hinzugekommene Pure Function.
- ✓ Lighthouse-Accessibility-Score ≥ 90.

---

## Deferred / nicht im 7.5-Retrofit

- **Touch-Substitut für Rechtsklick** → Mikrofrage in Phase 8.
- **Cancel-Dialog für lange Suchen** → Phase 9.
- **Cross-Browser-Lauf** (Firefox, Safari manuell) → vor Phase 12.
- **Farb-Blind-Safe Palette** (alternativer Farb-Modus) → optional, niedrige Priorität.
- **Mobile-Portrait-spezifisches Layout** → optional, niedrige Priorität.

Diese Items sind transparent dokumentiert, nicht versteckt. Wenn ein zukünftiger Phase-Kontext sie braucht, werden sie als Mikrofrage gehoben.
