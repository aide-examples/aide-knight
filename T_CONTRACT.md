# Technical Contract (T-Contract)

Plattform- und Qualitäts-Verpflichtungen für aide-knight, parallel zum funktionalen Vertrag (`knight.md`) und zum Vorgehensplan (`knight_plan.md`).

> **Hinweis zur Entstehung:** Dieser Vertrag wurde **zu spät** geschrieben — erst nach Phase 7, auf User-Hinweis hin. Sieben Phasen lang wurde die Software nur gegen `knight.md` (F-Contract) gebaut; Plattform-Qualitäten wuchsen ad hoc oder fehlten ganz. Phase 7.5 ist das Retrofit. Dass dieser Vertrag fehlte, ist als didaktisches Lehrstück offen festgehalten — siehe `PROTOKOLL.md` Phase 7.5 und den Eintrag *"F-Contract und T-Contract gehören gleichzeitig an den Anfang"* in `~/.claude/CLAUDE.md`.

---

## 1. Architektur

- **Objektorientiert ab Tag 1** (`knight.md` Z. 18). Klassen mit klar abgegrenzten Verantwortungen; **kein globaler State außerhalb von Klassen**; kein "wir refactoren das später".
- **Multi-File von Anfang an.** Mindestens die *grobe* Trennung Domain-Logik vs. State vs. View vs. Orchestrierung muss vor der ersten Codezeile stehen; die genaue Modul-Liste reift während der Implementierung. Anti-Pattern: alles in `app.js` mit Vermerk "Phase 11 splittet das später". **Jede Datei < 250 Zeilen** als harte Obergrenze — wenn überschritten, ist die Schnittführung schon falsch und gehört nachgezogen, nicht aufgeschoben.
- **Reine Funktionen** für alle berechnenden Operationen (Solver, Move-Generierung, Symmetrie-Helfer). **DOM-Zugriff strikt lokalisiert** auf die View-/Wiring-Module.
- **Single Source of Truth** für State: ein zentrales Modul kennt alle Einstellungen; UI- und Persistenz-Schichten kennen es einseitig. **Singletons via `getInstance()`** dort wo natürliche Einzigartigkeit besteht (i18n, App-State). Direkte Modul-Globals sind keine Architektur.

## 2. Plattform-Constraints

- **`file://`-lauffähig** ohne Webserver, ohne Node.js (`knight.md` Z. 16). Keine Build-Schritte, keine npm-Dependencies, keine ES-Module-`import`-Syntax (file:// + CORS-Restriktionen). Klassische `<script>`-Tags in Reihenfolge.
- **Browser-Kompat:** Modern Chromium, Firefox, Safari (jeweils ≥ 2 Jahre). Keine experimentellen APIs ohne Fallback.

## 3. Replay-Testbarkeit

- **State als URL-Hash** deep-linkbar: jeder relevante Einstellungs-Zustand ist im URL-Fragment kodiert und per Copy/Paste oder Bookmark wiederherstellbar. Das konkrete Schema (Parameter-Namen + Encoding) wird im State-Modul-Header dokumentiert und stabil gehalten.
  - Beim Laden: Hash parsen → State setzen → Brett rendern. Ein Start-Cell-Parameter im Hash triggert Auto-Solve.
  - Bei jeder State-Änderung: Hash aktualisieren via `history.replaceState`, damit der Browser-Verlauf nicht zugemüllt wird.
- **Headless-CI-tauglich:** Mit `chrome --headless --screenshot` (oder Playwright/Puppeteer) plus einer State-tragenden URL lässt sich jeder Anwendungs-Zustand reproduzieren und gegen ein Referenz-Bild diffen. Diese Möglichkeit muss ohne Code-Änderung existieren — sie ist die *Definition* von Replay-Testbarkeit.
- **Pure-Function-Tests browserbasiert:** ein dedizierter Test-Bereich lädt nur die DOM-freien Module und führt Assertions aus. Mensch-lesbare Pass/Fail-Liste; CI-tauglich, weil `headless` mit Exit-Code arbeiten kann.

## 4. Responsivität / Plattform-Ergonomie

- **Reflow bei Viewport-Änderung** (Resize, Device-Rotation, Tab-Splitting): Baseline-Verhalten, kein Feature. Tour bleibt während Resize erhalten — nur die Geometrie wird aktualisiert.
- **Touch-Eingabe** wird *vor* mausspezifischen Gesten geprüft. Konkret für Phase 8: Rechtsklick zum Blockieren braucht ein Touch-Substitut (z.B. Long-Press oder Toggle-Modus-Button). Diese Mikrofrage gehört explizit in die Phase-8-Vorab-Klärung.
- **Hover-States** und `cursor: pointer` auf klickbaren Elementen.
- **Lang laufende Operationen:** Progress-Indikation und Abbruchmöglichkeit. Im F-Plan formal als Phase 9, konzeptuell ein T-Contract-Item.

## 5. Internationalisierung

- **i18n ist Architektur**, kein Feature. Zentrale STRINGS-Quelle in einem dedizierten i18n-Modul. Alle UI-Texte — inklusive Dropdown-Option-Werte (Figuren-, Heuristik-, Symmetrie-Namen) — sind übersetzbar; das Bestehen *einer* Sprache bedeutet noch keine i18n-Architektur.
- **Sprach-Switcher** als sichtbares Plattform-Element in der UI. Persistiert via URL-Hash und localStorage.
- **Gepflegte Sprachen:** Englisch (Default), Deutsch. Neue Sprache = ein Eintrag in der STRINGS-Map.

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

- **Test-Skelett browserbasiert** in einem dedizierten Test-Bereich, mit einfachem `assert()`-Helfer; Pass/Fail visuell und im Konsolen-Log. Tests laufen ohne Node-/npm-Abhängigkeiten — siehe Plattform-Constraint.
- **Beschreibungssatz** nach `#`-Header in jeder Markdown-Datei (globale `CLAUDE.md`-Regel).
- **Modulgröße:** Jede Code-Datei < 250 Zeilen (entspricht der `knight_plan.md`-Vorgabe für Phase 11, hier aber von Tag 1 an).

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
