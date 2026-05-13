# aide-knight: Didaktischer Master-Plan — vom Prompt zur Anwendung

Versionierter Plan für den schrittweisen Aufbau der Knight's-Tour-App aus `knight.md`, als Lehrbeispiel für AI-gestützte Software-Entwicklung.

## Context

Der Autor möchte einen **wiederholbaren professionellen Prozess** demonstrieren — möglicherweise live oder online vor Mischpublikum — wie ein nicht-trivialer Software-Anwendungsfall mit AI-Unterstützung gelöst wird, **wenn man bei null Code startet und nur seine Gedanken so gut wie möglich verschriftlicht hat** (`knight.md`, 33 Zeilen). Die ursprüngliche, funktionierende Implementation (8 Dateien, ~890 Zeilen) wurde vor Beginn dieses Plans hart gelöscht; sie existiert nur noch im Git-Objektspeicher unter dem Tag `pre-rebuild-2026-05-13`. Während der gesamten Übung ist sie tabu — sie würde den Reinheitsanspruch und damit die didaktische Aussage zerstören.

Zielgruppe der Lehrunterlage: **Mischpublikum** — Programmierer mit AI-Einsteiger-Niveau bis hin zu AI-erfahrenen Praktikern, die methodisch besser werden wollen. Aufzeichnungsstil: **verbatim** während der Arbeit, **didaktische Aufbereitung erst am Ende** als separater Schritt.

**Zwei Deliverables am Ende:**
1. Die laufende Anwendung (Multi-File-HTML, lokal via `file://` ausführbar, alle Features aus `knight.md`).
2. Eine **Lehrunterlage** mit Präambel (Argumente für das stufenweise Vorgehen) plus redigiertem Verlauf des Mensch-AI-Dialogs.

`knight.md` selbst bleibt unverändert — sie ist die "Eingabe" des Lehrbeispiels.

---

## Präambel-Material für die spätere Aufbereitung

Sammelpunkte, die in die Lehr-Präambel gehören. Bewusst hier festgehalten, damit sie im Aufbereitungsschritt nicht verloren gehen:

1. **Warum Spec ≠ Spezifikation.** Eine 33-Zeilen-`knight.md` ist eine **Intentionsskizze**, kein vollständiger Auftrag. Pro Spec-Zeile entsteht im Schnitt ein bis zwei **Mikro-Entscheidungen**, die nur im Dialog beantwortbar sind (Wo platziert sich ein Button? Was bedeutet "Re-Klick" exakt? Welche Form von Symmetrie?). Eine "Ein-Rutsch"-Generation muss diese Mikro-Entscheidungen raten; die Wahrscheinlichkeit, alle simultan richtig zu raten, sinkt geometrisch mit der Featurezahl.

2. **Warum Stufen.** Jede Stufe = genau ein Feature + genau eine User-Validierung. Mikro-Entscheidung wird **vor** der Implementierung adressiert, **getestet** nach der Implementierung, **committet** wenn akzeptiert. Vorteile: (a) Rollback ist günstig, (b) Folgefehler-Kaskaden bleiben aus, (c) Performance-Probleme zeigen sich rechtzeitig (vor der nächsten Stufe), (d) der User behält jederzeit die Steuerung statt am Ende vor einem fait accompli zu stehen.

3. **Warum "Mensch an die Hand nehmen".** AI-Pair-Programming funktioniert nicht durch Auftrag-und-Abholen, sondern durch Mikro-Dialog: AI schlägt vor → User korrigiert/erweitert → AI implementiert → User testet → Commit. Der Lehrwert liegt **in der Reibung**, nicht im glatten Ergebnis. Wir zeigen die Reibung, indem wir den Dialog erhalten.

4. **Was Profis anders machen.** AI-Disziplin: Spec lesen, kritisch hinterfragen, eigene Annahmen kennzeichnen, Test-Disziplin halten, kommunikative Klarheit erzwingen. Diese Haltungen werden im Prozess sichtbar — nicht durch Erklären, sondern durch Tun.

---

## Phase 0 — Säuberung & Selbst-Verpflichtung

**Ziel:** Garantierte Tabula rasa. Der existierende Code wird gesichert und entfernt, bevor irgendetwas Neues entsteht.

| Schritt | Aktion |
|---|---|
| 0.1 | `git tag pre-rebuild-2026-05-13` auf einen Initial-Commit der existierenden Implementation gesetzt — der alte Code ist im Git-Objektspeicher auffindbar, falls didaktisch später ein Vergleich gewünscht ist. |
| 0.2 | `git rm app.js board.js solver.js ui.js index.html style.css` plus `knight_plan.md` durch diese neue Version ersetzen — Working-Tree enthält nur noch `knight.md`, den neuen `knight_plan.md` und `.git/`. Commit als `Phase 0: tabula rasa for didactic rebuild`. |
| 0.3 | **Selbst-Verpflichtung**, hier in Stein gemeißelt: während aller folgenden Phasen konsultiert der AI-Assistent (Claude) **weder** via `Read` noch via `Bash` noch über andere Werkzeuge den vor-existierenden Code. Er existiert nur noch im Git-Objektspeicher unter `pre-rebuild-2026-05-13` und ist für die Übung tot. |
| 0.4 | Diesen Master-Plan als `aide-knight/knight_plan.md` versioniert — gleiche Datei, neuer Inhalt, sodass die Plan-Evolution ab dem ersten Schritt mit-protokolliert wird. |

---

## Phasen 1–11 — Schrittweiser Aufbau

Jede Phase folgt demselben Vier-Schritt-Rhythmus:

```
  a) Mikrofragen klären   →   b) Implementierung   →   c) User-Test   →   d) Commit
```

Pro Phase: **1–3 vorgelagerte Fragen** an den User (Mikro-Entscheidungen), klare Akzeptanzkriterien, ein einziger Commit am Ende. Die "Mikrofragen-Vorab"-Spalte enthält Beispiele — die Liste wird im Live-Dialog kürzer oder länger ausfallen.

| Phase | Ziel (eine Aussage) | Lieferumfang | Verifikation | Vorab-Mikrofragen-Beispiele |
|---|---|---|---|---|
| **1** | Brett rendert, Klick erkennbar | `index.html`, `style.css`, `app.js` (alles inline; Multi-File später) — 8×8 Schachbrett, Schachbrettfarben, Klick auf Feld zeigt im Status seine Koordinaten | Browser per Doppelklick auf `index.html` öffnen, Brett sichtbar, Klick gibt Koord-Status | Welche Schachbrett-Farben — klassisch braun/beige, Holzimitat, schwarz/weiß? Cursor-Style auf Feldern? |
| **2** | Knight's-Tour-Solver-Kern für 8×8 | `solver.js` mit iterativem DFS + Warnsdorff; Klick auf Feld startet Solve; Pfad wird als Linie + Felder-Nummern gerendert | 8×8 Springer-Tour löst in <100 ms; Linie + Nummern sichtbar | Linienfarbe? Strichstärke proportional zur Brettgröße? Wo wird "Zugversuche: N" angezeigt? |
| **3** | Variable Brettmaße + Performance-Fundament | W- und H-Eingaben, dynamische Canvas-Größe, **Padding-Bordüre** statt Bounds-Check (zukunftssicher für ungewöhnliche Move-Sets) | 100×200 löst noch (mit Warnsdorff) im einstelligen Sekundenbereich; 5×5 verweigert sinnvoll wenn keine Lösung existiert | Maximale Brettgröße eingrenzen? Wie viele Padding-Felder pro Seite (max move-radius)? |
| **4** | Drei Heuristiken, vier Figuren, Mix-Button | Dropdown Heuristik (Warnsdorff / Outside-In / Brute Force); Dropdown Figur (1,2)/(1,4)/(2,3)/(3,4); Button "Reihenfolge mischen" mit Tooltip, der die aktuelle Definitionsreihenfolge zeigt | Wechsel der Figur lädt Brett neu; Outside-In zeigt erkennbar andere Tour-Geometrie als Warnsdorff; Mix-Button erzeugt sichtbar andere Tour bei sonst gleichen Settings | Wo sitzt der Mix-Button? Permutiert er pro Klick neu oder bei jedem Reload? Persistent in localStorage? |
| **5** | Sichtbarkeits-Toggles | Checkbox "Nummern", Checkbox "Linien"; beide unabhängig | An/aus jeweils sofort sichtbar; auch bei großen Boards lesbar (Schriftgröße passt sich an?) | Schriftgröße fix oder adaptiv? Bei sehr kleinen Feldern Nummern nicht zeigen, auch wenn Checkbox an? |
| **6** | Geschlossene Touren via Beide-Enden-Verfahren | Checkbox "Geschlossen"; Solver baut alternierend an Front und Tail des Pfads an; abschließende Linie vom letzten zum ersten Feld im Render | 8×8 Springer geschlossen löst; Closing-Linie ist sichtbar deutlich (anders gestrichelt? andere Farbe?) | Wenn Closing-Linie diagonal über das Brett geht — wie wird sie visuell von der normalen Tour unterschieden? |
| **7** | Symmetrien (Achse, Punkt, Rotation-90° für Quadrate) | Dropdown oder Checkbox-Gruppe; Solver respektiert Constraint; Rotationssymmetrie wirklich nur ein Viertel der Tour suchend | Bei axisV auf 8×8 Springer Lösung sichtbar; bei point-Symmetrie ebenso; Rotation auf 6×6 Springer (falls Lösung existiert) | UI-Element: ein Dropdown mit allen Optionen, oder mehrere Checkboxes? Was passiert bei inkompatibler Kombination (Rotation auf nicht-quadratischem Brett)? |
| **8** | Blockierbare Felder via Rechtsklick | Rechtsklick togglet Feld blockiert/frei; blockierte Felder sind sichtbar anders dargestellt; Solver respektiert sie | Beliebige Form aus blockierten Feldern; Solver findet Tour um sie herum oder meldet "keine Lösung" | Rechtsklick-Visualisierung: Diagonal-Strich, anderer Farbton, X-Symbol? Browser-Kontextmenü unterdrücken? |
| **9** | Suchsteuerung: 5-s-Confirm + Re-Klick = nächste Lösung | Solver fragt alle 5 s per `confirm()`, ob weitergesucht werden soll; Re-Klick auf dasselbe Startfeld setzt die Suche von der aktuellen Lösung aus fort (nicht von vorn) | Beim langen Lauf (100×200) erscheint Dialog; "Ja" sucht weiter, "Nein" bricht ab; Re-Klick liefert sichtbar andere Tour, Zugversuche-Zähler läuft weiter | Was bedeutet "dasselbe Startfeld" konkret — Cell-Koordinaten, oder Tour-ID-Erkennung? Re-Klick nach Heuristik-Wechsel — neu von vorn oder weiter? |
| **10** | Startfeld-Sensitivität-Button | Button erscheint **erst** nach erster Lösung; Klick startet Erstlösungs-Suche von jedem Startfeld; Zugzahl pro Startfeld wird in das jeweilige Feld geschrieben (statt der Tour-Nummer) | Auf 8×8 Springer Sensitivität-Lauf liefert 64 Zahlen, die Ecken-Felder zeigen typischerweise höhere Werte (mathematisch erwartet) | Farbcodierung der Zahlen (Heatmap)? Persistiert die Anzeige beim nächsten Tour-Start oder wird sie überschrieben? Klick auf eine Zelle danach — startet Tour mit altem Verhalten? |
| **11** | Code-Hygiene & 100×200-Stresstest | Falls Phase 1–10 alles in einer Datei zusammenhäuft: aufteilen in `board.js`, `solver.js`, `ui.js`, `app.js` (vier Module). OO-Sauberkeit (Klassen, klare Schnittstellen). 100×200-Lauf mit jeder Heuristik als Akzeptanztest | Code-Review-tauglich: jede Datei < 250 Zeilen, klare Verantwortungstrennung, kein globaler State außerhalb der Modul-Klassen | — (keine Mikrofragen; Refaktor folgt aus dem bisherigen Code) |

---

## Phase 12 — Aufbereitung der Lehrunterlage

**Ziel:** Aus dem verbatim aufgezeichneten Mensch-AI-Dialog wird zusammen mit dem User eine konsumierbare Lehrunterlage destilliert.

Schritte:
- 12.1 **Transkript sichten.** Wir lesen den vollständigen Dialog der Phasen 0–11. Markieren der besonders aufschlussreichen Stellen (Mikrofragen, korrigierte Annahmen, Aha-Momente).
- 12.2 **Präambel schreiben.** Aufbauend auf den vier Punkten aus diesem Plan (Spec ≠ Spezifikation; Warum Stufen; Mensch-an-die-Hand; Was Profis anders machen) + konkreten Beispielen aus dem realen Transkript.
- 12.3 **Verlauf redigieren.** Pro Phase: Kurzfassung (3–5 Sätze) + 1–2 ausgewählte Original-Dialogausschnitte als Illustration. Längen-Ziel pro Phase ≤ 1 Seite.
- 12.4 **Cross-Referenz.** Wo eine Mikro-Entscheidung später korrigiert wurde, im Text rückwärts verlinken — das ist gerade für AI-erfahrene Praktiker wertvoll: "Hier hätte ich besser direkt anders entschieden".
- 12.5 **Formatwahl.** Ein PDF? Ein Markdown-Repository? Eine Notion-Page? — wird im Live-Dialog mit dem User vereinbart, nicht jetzt vorbestimmt.

Phase 12 ist eine **Co-Redaktion** zwischen User und AI, kein Solo-Output.

---

## Was strikt nicht passiert

- **Kein heimliches Konsultieren** des gelöschten Codes über `git show pre-rebuild-2026-05-13:...` oder ähnliche Tricks. Self-Verpflichtung aus Phase 0 ist bindend.
- **Keine Phasen-Bündelung** — auch wenn zwei kleine Features zusammen "in 10 Minuten gemacht" wären, bleibt jede Phase ein eigener Commit. Sonst geht der didaktische Schritt-für-Schritt-Charakter verloren.
- **Keine späten Komplett-Rewrites** zur Code-Schönheit. Sollten in Phase 11 strukturelle Probleme sichtbar werden, brechen wir in eine kleine, scharf umrissene Refaktor-Phase ab. Großflächiges "Ich mach das mal eben sauber" wäre genau die Anti-These zum Plan.
- **Kein Vorgriff auf knight.md-Erweiterungen.** Was nicht in der `knight.md` steht, ist nicht Teil dieser Übung. Bei Fund neuer Wünsche im Verlauf: User entscheidet, ob die `knight.md` ergänzt wird (und damit ein neuer Item im Plan entsteht) oder ob der Wunsch geparkt wird.

---

## Erfolgs-Indikatoren

Am Ende von Phase 11 sind erfüllt:
- Alle 14 Features aus `knight.md` funktionieren (gegen die Spec durchexerziert).
- 100×200-Test grün mit Warnsdorff und Outside-In; Brute Force darf "no result in time"-mäßig abbrechen.
- App startet aus `file://` ohne Server/Node-Abhängigkeit.
- Code ist multi-file, OO-strukturiert, jede Datei kohärent.

Am Ende von Phase 12 ist die Lehrunterlage in vom User gewähltem Format vorhanden, mit Präambel + redigiertem Verlauf der Phasen 0–11.

---

## Plan-Evolution

Diese Datei ist versioniert. Jede zukünftige Anpassung des Plans (z.B. wenn sich im Verlauf der Phasen herausstellt, dass eine Phase aufgespalten oder umgeordnet werden muss) entsteht als eigener Commit. `git log -- knight_plan.md` zeigt damit die historische Entwicklung des Plans selbst — ein Sekundär-Lehrmaterial: wie ein Plan unter Realität reagiert.
