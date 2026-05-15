# Knight's Tour mit AI-Pair-Programming — eine Lehrunterlage

Das Dokument zeigt, wie eine gut strukturierte Software-Anwendung in einem Mensch-AI-Dialog entstehen kann, wenn man bei null Code startet und nur eine 33-Zeilen-Spec hat.

---

## 0. An wen richtet sich das Dokument?

**Zielgruppe.** Mischpublikum — Programmierer mit AI-Einsteiger-Niveau bis hin zu AI-erfahrenen Praktikern, die methodisch besser werden wollen. Wer noch nie mit einem AI-Assistenten paar-programmiert hat, findet hier ein Vorgehen mit klaren Schritten. Wer es regelmäßig tut, findet hier Reibungspunkte und Anti-Patterns aus der Praxis.

**Was du mitbringst.** Ein Software-Problem mittlerer Größe — komplex genug für mehrere Sub-Features, klein genug für überschaubaren Code-Umfang. Einen AI-Assistenten. Bereitschaft zum stufenweisen Vorgehen statt "alles in einem Rutsch".

**Was du herausbekommst.** Einen *wiederholbaren* Prozess für AI-Pair-Programming an realistischen Anwendungen. Konkrete Beispiele, wie er in echt schief- und gutgeht. Eine Sammlung methodischer Prinzipien, die sich auf andere Projekte übertragen lassen.

**Quell-Artefakte im Repo.**
- [`knight.md`](knight.md) — der F-Contract: 33 Zeilen FACHLICHE User-Wünsche.
- [`T_CONTRACT.md`](T_CONTRACT.md) — der T-Contract: TECHNISCHE Anforderungen.
- [`knight_plan.md`](knight_plan.md) — der Master-Plan, der die **12 Phasen** vorzeichnet.
- [`PROTOKOLL.md`](PROTOKOLL.md) — die verbatim-nahe Aufzeichnung des kompletten Dialog-Verlaufs (1200+ Zeilen). Diese Lehrunterlage ist seine Destillation.

**Empfohlene Begleit-Aktion.** Öffne `aide-knight/index.html` lokal im Browser (Doppelklick reicht, kein Webserver nötig). Wenn ein Beispiel im Text eine URL-Konfiguration nennt, paste sie in den Browser — der Replay-Mechanismus aus Phase 7.5 macht jeden im Text genannten Zustand sofort reproduzierbar.

**Lesezeit-Schätzung.** 30–45 Minuten für den Hauptteil; offenes Stöbern im Lehrmomente-Anhang (Kapitel 3) je nach Interesse.

---

## 1. Präambel

Vier methodische Kern-Punkte, die das gesamte Projekt prägen. Jeder mit konkretem Verlauf-Beispiel illustriert.

### 1.1 Warum Spec ≠ Spezifikation

Eine 33-Zeilen-`knight.md` ist eine **Intentionsskizze**, kein vollständiger Auftrag. Sie hält fest, *was* der User will — sie sagt aber nicht *wie* das im Detail aussehen soll. Pro Spec-Zeile entstehen typischerweise ein bis zwei **Mikro-Entscheidungen**, die nur im Dialog beantwortbar sind: Wo platziert sich ein Button? Was bedeutet "Re-Klick" exakt? Welche Farbe für die Tour-Linie? Welche Heuristik-Reihenfolge bei Gleichstand?

Konkret aus Phase 1 — "Schachbrett rendern, Klick erkennbar": Eine einzige Spec-Zeile ("typische Schachbrett-Farben"), aber vier Mikrofragen auf dem Tisch:

> Welche Farben für das Schachbrett? — Klassisches Schach-Schema (chess.com / lichess-Defaults).
> Schwarzer Text auf dunklen Feldern — kontraststark genug? — Mischung "weiß auf dunkel / schwarz auf hell" wäre unruhig. Lösung: *eine* Tintenfarbe für alles.
> Wo soll die Klick-Koordinate erscheinen? — Status-Zeile unter dem Brett, Format `<col> / <row>`.
> Inline (HTML+CSS+JS in einer Datei) oder schon jetzt mehrere Dateien? — Drei getrennte Dateien.

Vier Mikrofragen für eine Zeile Spec. Eine "Ein-Rutsch"-Generation müsste alle vier raten — die Wahrscheinlichkeit, alle simultan richtig zu raten, sinkt geometrisch mit der Featurezahl. Eine vollständige Knight's-Tour-App umfasst rund 14 Features aus der Spec. Bei 1–2 Mikrofragen pro Feature und 50 % Trefferquote pro Frage liegt die Erfolgsrate eines One-Shot-Generierens unter 1 ‰. Die Stufung in Mikro-Dialoge ist nicht Vorsicht — sie ist Mathematik.

Übrigens: die vierte Frage bezieht sich auf eine TECHNISCHE Anforderung, die in der FACHLICHEN SPEC eigentlich nichts zu suchen hat. Hintergrund ist, dass die Notwendigkeit eines separaten T-Contracts erst in Phase 7 erkannt wurde.

### 1.2 Warum Stufen

Jede Phase = genau ein Feature + genau eine User-Validierung. Mikro-Entscheidungen werden *vor* der Implementierung geklärt, getestet *nach* der Implementierung, committet *wenn* akzeptiert. Der Vier-Schritt-Rhythmus

```
   Mikrofragen klären   →   Implementierung   →   User-Test   →   Commit
```

zieht sich durch alle 12 Phasen. Vorteile:

1. **Rollback ist billig.** Jede Phase ist ein einzelner (manchmal mehrere) Commit. Wenn eine Mikro-Entscheidung sich später als falsch herausstellt, ist sie isoliert revertierbar.
2. **Folgefehler-Kaskaden bleiben aus.** Ein falsches Detail in Phase 3 würde sich ohne stufenweise Validierung erst in Phase 7 als bizarrer Bug zeigen. So fängt es der User-Test sofort.
3. **Performance-Probleme zeigen sich rechtzeitig.** Phase 3 hat das 100×200-Bord als Akzeptanztest. Hätte der Solver dort gehakt, wäre es vor dem 5-Feature-Stack der späteren Phasen aufgefallen — nicht erst beim Phase-11-Stresstest.
4. **Der User behält die Steuerung.** Statt am Ende vor einem fait accompli zu stehen, sieht er nach jeder Phase das Zwischenergebnis und kann umschwenken.

Punkt 4 wird in dieser Übung mehrfach zum Tragen kommen — z.B. wenn der User mid-Phase 4 darauf besteht, dass UI komplett auf Englisch sein soll, oder wenn er mid-Phase 6 einen besseren Algorithmus vorschlägt.

### 1.3 Warum "Mensch an die Hand nehmen"

*AI-Pair-Programming funktioniert nicht durch Auftrag-und-Abholen.* Es funktioniert durch **Mikro-Dialog**: AI schlägt vor, User korrigiert oder bestätigt, AI implementiert, User testet, gemeinsam wird committet. Der Lehrwert dieser Übung liegt **in der Reibung**, nicht im glatten Ergebnis.

Glatte Ergebnisse lassen sich auch ohne Reibung produzieren — sie überzeugen aber niemanden, der die Übung nachvollziehen will. Das `PROTOKOLL.md` dokumentiert deshalb verbatim-nahe, *wo* es Reibung gab. Drei besonders dichte Stellen:

- **Phase 3 Resize-Nachzügler.** User-Halbsatz: *"Wenn wir auf einem Android Device sind und das Gerät von Portrait nach Landscape drehen muss es auch klappen ..."* — eine Korrektur an der AI, die zu einer projektübergreifenden Regel in `~/.claude/CLAUDE.md` wurde.
- **Phase 7.5 NFR-Diagnose.** Der User stellte fest, dass die ersten sieben Phasen an einem strukturellen Designmangel litten. Mehr dazu in Kapitel 2.8 — das ist der wahrscheinlich wichtigste einzelne Moment des Projekts.
- **Phase 6 Schwenk-Bias.** Der User schlug mitten in der Implementierung eines schwierigeren Algorithmus einen einfacheren vor — und damit eine Code-Ersparnis von rund 70 Zeilen.

Wer den Verlauf glättet, glättet auch das didaktisch Wertvollste heraus. Diese Lehrunterlage versucht das Gegenteil: die Stolperstellen sichtbar zu lassen.

### 1.4 Was Profis anders machen

Vier Haltungen, die im Projekt-Verlauf praktisch geworden sind:

**1. F-Contract und T-Contract gleichzeitig.** Die "Spec" deckt nur die Funktionalität ab (`knight.md` = F-Contract). Daneben braucht jedes nicht-triviale Projekt einen **T-Contract** (Technical Platform / Non-Functional Requirements): Architekturstil, i18n als Architektur, Replay-Testbarkeit, Accessibility, Resize/Reflow, Browser-Kompat, Performance-Limits. Beide Verträge gehören auf den Tisch *bevor* die erste Zeile Code entsteht. Wir haben es im Verlauf *nicht* getan und dafür mit einem 686-Zeilen-Monolith-Refactor in Phase 7.5 bezahlt.

**2. Baseline-Verhalten ist kein Feature.** Resize-Reaktion, Hover-States, Keyboard-Bedienbarkeit, Focus-Indikatoren, sensible Default-Größen — das sind keine Features, das ist Hygiene des Mediums. YAGNI darf das nicht aushebeln. (Lehrstück aus Phase 3.)

**3. Dependency Injection statt Singleton.** `static getInstance()` ist globaler State in Klassen-Hülle. `const theX = new X(...)` am Entry-Point + explizite Weiterreichung macht die Abhängigkeitsstruktur sichtbar. (Erkenntnis aus dem Architektur-Cluster vor Phase 9.)

**4. Detektor-vor-Fix.** Wenn ein Bug entdeckt wird, den die Software bisher nicht erkannt hat: erst der Software das Erkennen beibringen, am echten Bug validieren, *dann* fixen. Phase 8 hat das praktisch exerciert — ein Test hing, der User schickte eine Replay-URL, die AI reproduzierte mit dem Node-Probe, der Test wurde durch eine bessere Konfiguration ersetzt.

Diese vier Haltungen sind keine "AI-spezifischen" Regeln. Sie sind ganz normale Software-Disziplin — sie werden im AI-Pair-Programming nur *sichtbarer*, weil die AI ohne sie zuverlässig versagt und der Schaden früh auftritt.

---

## 2. Verlauf — Phasen-Chronologie

Pro Phase: Ziel, wichtigste Mikrofragen, ggf. Originalzitat, Was-hat-man-gelernt.

### 2.0 Phase 0 — Tabula rasa & Self-Commitment

**Ziel.** Vor Beginn des didaktischen Aufbaus garantiert sicherstellen, dass *kein* Vorwissen aus einer früheren Implementierung den Verlauf verfälscht.

**Aktion.** Die bestehende, lauffähige Implementation (8 Dateien, ~890 Zeilen) wurde per `git tag pre-rebuild-2026-05-13` gesichert und dann per `git rm` aus dem Working Tree entfernt. Nur `knight.md` und `.git/` blieben übrig. Zusätzlich **Self-Commitment der AI:** während aller folgenden Phasen wird der alte Code *nicht* konsultiert — weder per `Read`, noch per `Bash`, noch per `git show pre-rebuild-...`. Diese Selbst-Verpflichtung ist Teil der didaktischen Reinheit.

**Was hat man gelernt?**
- Reproduzierbare AI-Pair-Programming-Übungen verlangen einen sauberen Start. Heimliches "Spicken" wäre für die AI technisch möglich, für die Übung aber verlogen.
- Ein Master-Plan als versioniertes Dokument im Repo (statt im ephemeren Claude-Plan-File) macht den Plan-Verlauf nachverfolgbar.

### 2.1 Phase 1 — Brett rendert, Klick erkennbar

**Ziel.** 8×8 Schachbrett anzeigen, Klick auf ein Feld zeigt dessen Koordinaten unten an.

**Mikrofragen.** Vier — siehe Präambel-Beispiel oben. Bemerkenswert: keine einzige war "wie soll das aussehen?" generisch. Alle waren konkret: Farbschema (chess.com), Textfarbe-Konsistenz (eine Tinte für alles), Status-Format (`col / row`), Datei-Aufteilung (3 Dateien sofort).

**Was hat man gelernt?**
- Die Anzahl der Mikrofragen *vor der ersten Codezeile* ist überraschend hoch. Wer das im Voraus nicht plant, gerät unter Druck und entscheidet im Dialog-Stress, was später korrigiert werden muss.
- Eine "Klassische Schach-Farbe"-Antwort entlastet von späteren Streitigkeiten. Defaults aus etablierten Vorbildern (chess.com, lichess) sind wertvoll.

![Phase 1 — leeres 8×8 Brett, Klick-Echo in der Status-Zeile](_assets/phase-1-board.png)

### 2.2 Phase 2 — Solver-Kern (DFS + Warnsdorff)

**Ziel.** Klick auf ein Feld startet die Tour-Suche; gefundene Tour wird als Linie + Nummern dargestellt.

**Mikrofragen vorab.** Linienfarbe (kräftiges Rot `#c0392b`), Schritt-Zähler-Position (zweite Status-Zeile), Wortlaut "Lösung nach N Schritten." (User-Diktion: *Schritten*, nicht *Zugversuchen*).

**Mid-Phase-Korrekturen.** Während der Implementierung gab es zwei wichtige User-Eingriffe:

> "Das UI soll komplett in Englisch sein. Wäre es schwierig, wenn du alles so vorbereitest, dass wir später weitere Sprachen hinzufügen können?"
>
> "Du zeichnest zuerst die Feldnummern und danach die roten Linien. Ich glaube, umgekehrt wäre es besser."

Beide Korrekturen wanderten direkt in den Phase-2-Commit — die i18n-Architektur als STRINGS-Map und die Layer-Reihenfolge per CSS-Variable + Z-Index.

**Was hat man gelernt?**
- **Mid-Phase-Korrekturen sind Methode, nicht Versagen.** Wenn der User mid-Phase eine bessere Idee hat, gehört sie *in dieselbe Phase*, nicht in eine Nachfolge-Phase mit "Polish" im Titel.
- Die kleine i18n-Vorbereitung (STRINGS-Map, auch wenn vorerst nur `en` aktiv) zahlt sich später vielfach zurück (Phase 7.5).

![Phase 2 — erste gelöste Knight's Tour mit Linien und Nummern](_assets/phase-2-solution.png)

### 2.3 Phase 3 — Variable Brettmaße + Padding-Fundament

**Ziel.** W- und H-Eingaben, dynamische Brettgröße, Padding-Bordüre im Solver (statt Out-of-Bounds-Check pro Move).

**Mikrofragen vorab.** Padding-Tiefe (dynamisch pro Figur — wird `max(|dx|, |dy|)`), Brettgrößen-Cap (keiner — User akzeptiert Crash-Risiko), W/H-Apply-Verhalten (auto auf blur/Enter).

**Lehrreiche Befunde im User-Test.** Drei algorithmische Phänomene wurden sichtbar:

| Konfig | Schritte | Bemerkung |
|---|---|---|
| 8×4 Warnsdorff von Ecke | **13.4 Mio** | Warnsdorff *kann* auf schmalen Rechtecken in Sackgassen geraten. Bekannte Eigenheit; Tie-Breaker-Regeln (Pohl 1967) würden helfen — out of scope. |
| 200×100 Warnsdorff | 19 999 | Praktisch perfekt — keine Backtracks. |
| 5×5 von hellem Feld | `null` | **Paritätsbeweis:** 13 dunkle + 12 helle Felder, Tour alterniert Farben → von hellem Start unmöglich. *Schöne mathematische Mikro-Anekdote.* |

**Der Resize-Nachzügler — DER Lehrmoment der Phase.**

> "Dieses Resize Verhalten ist etwas, von dem ich erwartet hätte, dass du es auch dann automatisch einbaust, wenn ich es nicht explizit vorgebe. Ist da meine Erwartung zu hoch? Wenn wir auf einem Android Device sind und das Gerät von Portrait nach Landscape drehen, muss sich das UI ebenfalls anpassen."

Die ehrliche Antwort: nein, die Erwartung ist nicht zu hoch — sie ist die richtige. Es folgte ein eigener Nachzügler-Commit mit Resize-Listener (trailing-edge debounced via `setTimeout`) und eine **neue Sektion in `~/.claude/CLAUDE.md`**:

> **Baseline-Verhalten ist kein Feature.** Resize/Reflow auf Viewport-Änderungen, Hover-States auf klickbaren Elementen, Keyboard-Bedienbarkeit, lesbare Defaults — das sind Dinge, die ein Profi automatisch einbaut, ohne dass der User sie im Brief erwähnen muss.

**Was hat man gelernt?**
- **Der User korrigiert die AI** — und manchmal entsteht aus *einer* Korrektur eine projektübergreifende Regel.
- Performance-pathologische Konfigurationen (8×4 Warnsdorff) zeigen sich am natürlichen Brett-Test. Ohne stufenweise Validierung würden sie erst beim Phase-11-Stresstest auffallen.

![Phase 3 — 8×4 Warnsdorff: 13.4M Schritte zeigen die Pathologie des Verfahrens auf schmalen Rechtecken](_assets/phase-3-8x4.png)

![Phase 3 — 200×100 Warnsdorff: 19 999 Schritte, praktisch perfekt](_assets/phase-3-200x100.png)

### 2.4 Phase 4 — Heuristiken, Figuren, Mix-Button, localStorage

**Ziel.** Heuristik-Dropdown (Warnsdorff / Outside-In / Brute Force), Figur-Dropdown ((1,2)/(1,4)/(2,3)/(3,4)), Mix-Button mit Tooltip, voller State in localStorage.

**Mikrofragen vorab.** Layout (eigene Reihe unter W/H), Mix-Trigger (würfeln + sofort re-solvieren von letztem Startfeld), Persistenz (voller State).

**Status-Feedback-Bug, mid-phase.**

> "Wenn ich ein Feld anklicke, wird es nicht sofort in der Fußleiste gezeigt; als Rückmeldung wäre es aber nötig, dies zu tun, bevor die Suche beginnt."

Ursache: JS ist single-threaded — der Click-Handler aktualisiert den Status, ruft dann aber synchron `solve()` auf, das den Main-Thread blockiert; der Browser kommt vor dem Block nicht zum Repaint. Fix: **Double-`requestAnimationFrame`** zwischen Statusupdate und `solve()`. Per globaler `CLAUDE.md`-Regel sind `setTimeout(0)` als Timing-Workarounds grundsätzlich unerwünscht.

**Re-Klick-Frage abgegrenzt.** Im selben Atemzug stellte der User die Frage, ob "Re-Klick = weitersuchen" zu dieser Phase gehört. Antwort: nein, zu Phase 9 — denn die "Continue from current solution"-Logik braucht eine speicherbare Search-State-Struktur, die in Phase 9 sowieso aufgebaut werden muss.

**Was hat man gelernt?**
- Selbst die AI muss daran erinnert werden, dass synchrone Solver vor dem Repaint blockieren. Die Mid-Phase-Korrektur deckte eine Lücke in der eigenen JS-Disziplin auf.
- **Phasen-Grenzen verteidigen** — Re-Klick gehört nicht hierher, auch wenn der User danach fragt. Phasen-Bündelung würde Master-Plan-Klarheit zerstören.

![Phase 4 — Heuristik-Wechsel produziert sichtbar andere Tour-Geometrie bei gleichem Startfeld](_assets/phase-4-heuristic.png)

### 2.5 Phase 5 — Sichtbarkeits-Toggles

**Ziel.** Checkboxen "Numbers" und "Lines", unabhängig schaltbar.

**Mikrofragen vorab.** Eigene dritte Reihe; Auto-Hide für Nummern, wenn Font < 9 px (z.B. auf 200×100 mit 4-px-Zellen).

**Implementierung.** Beide Toggles via CSS-Variable `--num-display` / `--overlay-display`. Flippen einer Checkbox schreibt nur die CSS-Variable um — kein DOM-Eingriff, gerenderte Tour bleibt unangetastet.

**Was hat man gelernt?**
- CSS-Variablen als Toggle-Mechanismus sind angenehm leicht.
- Eine *dynamische* Schwelle (auto-hide bei Font < 9 px) ist erklärungsbedürftiger als eine feste, aber UX-mäßig richtiger. Die Mikrofrage zwingt zur bewussten Entscheidung.

![Phase 5 — nur Linien sichtbar, Nummern ausgeblendet](_assets/phase-5-lines-only.png)

![Phase 5 — nur Nummern sichtbar, Linien ausgeblendet](_assets/phase-5-numbers-only.png)

### 2.6 Phase 6 — Geschlossene Touren via Schwenk-Bias

**Ziel.** Checkbox "Closed". Wenn aktiv, sucht der Solver geschlossene Touren. Bei Erfolg: zusätzliche gestrichelte Linie vom letzten zum ersten Feld.

**Mikrofragen vorab.** Closing-Linie (gestrichelt, gleiche Farbe), Checkbox-Platzierung (Reihe 3).

**Der User-Vorschlag mit Algorithmus-Verbesserung — Höhepunkt der Phase.**

Der Master-Plan hatte das Verfahren "abwechselnd an beiden Enden des Pfades anbauen" aus `knight.md` skizziert. Die AI begann mit der Implementierung. Mitten drin kam der User mit einer einfacheren Idee:

> "Noch eine Idee zur geschlossenen Tour: Wenn du z.B. in einer Ecke beginnst und dann das nächste Feld erreichst, dann musst du dafür sorgen, dass das andere Feld, von dem man aus das Startfeld erreichen kann, solange wie nur irgend möglich NICHT benutzt wird. Wenn du ihm eine künstlich verfälschte hohe Zahl von Freiheitsgraden gibst (oder es algorithmisch bei der Suche bis zum vorletzten Zug aussparst), dann sollte das ein ganz effektives Verfahren sein, um geschlossene Pfade zu finden."

Das ist **die klassische Schwenk-Technik** in einer extrem einfachen Implementations-Form: Startnachbarn mit `+1000`-Penalty im Warnsdorff-Score, damit sie erst spät platziert werden; der letzte Zug landet dann automatisch auf einem davon. Vorteile gegenüber dem alternierenden Anbauen:

- **Eindimensional**, kein Deque, ein Pfad-Array
- **~10 Zeilen** Code-Erweiterung statt ~80
- **Bei Warnsdorff/Outside-In hocheffektiv**: 8×8 Knight closed löst in 85 Schritten (gegenüber 63 für offen, also nur 35 % Overhead)

**Was hat man gelernt?**
- **Der User verbessert den Algorithmus, nicht die AI.** Der Master-Plan-Vorschlag war plausibel, aber nicht der eleganteste. Die AI hat ihn zunächst übernommen — der User hatte den klareren Blick.
- **Spec-Vorschläge sind nicht heilig.** `knight.md` schlug ein konkretes Verfahren vor; der User hat mid-implementation eine bessere Version vorgeschlagen, und dieser Vorschlag landete in der App.

![Phase 6 — geschlossene Tour via Schwenk-Bias, gestrichelte Closing-Linie zwischen Start und Ende](_assets/phase-6-closed.png)

### 2.7 Phase 7 — Symmetrien (axisV / point / rot90)

**Ziel.** Symmetrie-Dropdown; Solver respektiert das Constraint; rotationssymmetrische Suche tatsächlich nur ein Viertel der Tour.

**Scope-Erweiterung.** `knight.md` Z. 24 nennt nur Rotationssymmetrie. Der Master-Plan generalisierte auf 3 Typen. User-Entscheid: "Auch Achse + Punkt mitnehmen". Plus User-Bestätigung der Auto-Orbit-Logik (Klick auf eine Zelle unter rot90 → 4 Zellen werden gemeinsam visited/blocked).

**Bias-Bug, mid-implementation.** Erste Smoke-Tests zeigten: AxisV auf 8×8 abortierte nach 50.000.000 Schritten ohne Lösung — obwohl axis-symmetrische Touren existieren sollten. Ursache: der Schwenk-Bias aus Phase 6 brauchte unter Symmetrie eine Erweiterung. Wenn der Solver `(1,2)` platziert, wird der Spiegel `(6,2)` *automatisch* mitbesucht (Orbit-Mate). Wenn `(6,2)` zur Closure-Klasse gehört ("save for last"), ist sie damit unwiederbringlich verbraucht. Fix: die Bias-Menge umfasst Bridge-Neighbors *und ihre Orbit-Mates*.

**Mathematische Restriktion.** Die Farbparitäts-Analyse zeigte: der Algorithmus findet symmetrische Touren *nicht* universell, sondern nur unter Brett-Geometrien, die die Shift-by-Quarter-Struktur unterstützen. Konkret:
- `axisV`: W gerade *und* W·H ≡ 2 mod 4 → 6×3, 6×5, 10×3, 10×5 ✓ — 8×8 ✗
- `point`: W gerade *und* H gerade → 8×8 ✓
- `rot90`: W=H gerade *und* N² ≡ 4 mod 8 → 6×6, 10×10 ✓ — 8×8 ✗

Das ist eine *Eigenschaft des Algorithmus*, nicht eine mathematische Unmöglichkeit — auf 8×8 *existieren* rot90-symmetrische Touren, sie haben aber eine andere Pfad-Struktur, die ein verfeinerter Solver bräuchte.

**Was hat man gelernt?**
- **Algorithmus-Restriktionen transparent dokumentieren statt verstecken.** Die Validitäts-Regeln in `isSymTypeValid` sind absichtlich strikter als die mathematischen.
- **Bias unter Symmetrie ist subtil.** Orbit-Mates müssen mitbedacht werden — sonst leakt der "save-for-last"-Effekt.

![Phase 7 — 6×6 Knight Outside-In mit Rotation 90°: rotationssymmetrische geschlossene Tour, gefunden in 10 Schritten](_assets/phase-7-rot90.png)

### 2.8 Phase 7.5 — T-Contract & Architektur-Retrofit (DER Höhepunkt)

**Was vorher passierte.** Phase 7 wurde implementiert und protokolliert. Die AI war zufrieden, der User auch — *fachlich*. Dann kam der Halbsatz:

> "Wir kommen fachlich gut voran. Trotzdem hab ich Sorgenfalten im Gesicht. Ahnst du warum?"

Die AI ratete viermal falsch (didaktische Tiefe vs. Mischpublikum, Code-Aufblähung, `knight.md`-Vorgriff in Phase 7, Zeitbudget). Erst auf User-Seite kam das Stichwort:

> "Ich helf dir mit einem Stichwort: NFR"

Und dann die volle Diagnose:

> "Unser gesamtes Vorgehen hat einen Designmangel. Wir hätten von Anfang an einen T-Contract (Technical Platform, NFRs) haben sollen und parallel dazu den F-Contract mit der Funktionalität. Ein guter T-Contract hätte replay-fähige Tests gefordert und du hättest daraufhin automatisch (hoffe ich) URL-Args eingeführt, über die zusammen mit CURL eine Automatisierung möglich ist. Wir hätten von Anfang an die i18n-Frage geklärt und Device-Rotation-Fragen und andere Ergonomie-Basics nicht im Rahmen des F-Contracts diskutiert."

Plus die schärfere Variante:

> "Ich hatte von guter objektorientierter Architektur gesprochen. Und du baust einen großen Wald aus lauter globalen Functions."

**Was die AI konkret übersehen hatte.**
- `knight.md` Z. 18 ("Code soll sehr gut objektorientiert strukturiert sein") wurde fälschlich als "Phase-11-Refactor" interpretiert → 686 Zeilen monolithisches `app.js` mit globalen `let`-Variablen.
- Replay-Tests via URL-Args + headless Chromium fehlten komplett.
- i18n war halb-implementiert.
- Resize/Reflow kam erst als Nachzügler nach User-Hinweis in Phase 3.
- Accessibility nach sieben Phasen weiterhin null.

**Retrofit-Block (7 Commits).**

1. `T_CONTRACT.md` als eigenes Dokument schreiben (Sektion 1 Architektur, 2 Plattform-Constraints, 3 Replay-Testbarkeit, 4 Responsivität, 5 i18n, 6 a11y, 7 Performance & Robustheit, 8 Code-Qualität).
2. OO-Split der 686-Zeilen-`app.js` in 8 Module (i18n, figures, solver, state, board, renderer, ui, app).
3. URL-Hash für vollständig replay-baren State.
4. i18n-Konsolidierung + sichtbarer Sprach-Switcher.
5. a11y-Basics (Keyboard-Nav, ARIA, Focus-Ringe, aria-live).
6. Browser-basiertes Test-Skelett unter `tests/`.
7. PROTOKOLL-Eintrag + `CLAUDE.md`-Erweiterung *"F-Contract und T-Contract gehören gleichzeitig an den Anfang"*.

**Plus: T_CONTRACT ergänzt die CLAUDE.md**

 Der T-Contract fordert die *grobe* Trennung "Domain-Logik vs. State vs. View vs. Orchestrierung"; die konkrete Modul-Liste reift während der Implementierung. Außerdem erbt er Prinzipien, die bereits in der `CLAUDE.md` beschrieben sind. Der Klarheit halber haben wir einige dieser Prinzipien, die im Projekt operativ wirken, aber normalerweise nicht im T_CONTRACT stehen müssten, explizit am Ende des T_CONTRACT angehängt.

**Was hat man gelernt?**

- **F-Contract und T-Contract gehören gleichzeitig an den Anfang.** Genau eine Spec-Zeile zur OO-Struktur ("sehr gut objektorientiert strukturiert") wurde als Feature behandelt statt als plattform-prägendes T-Item — und kostete am Ende einen 686-Zeilen-Refactor in einer eigenen Phase.
- **Der Retrofit ist Heilung, kein Geheimnis.** Die Übung dokumentiert den Fehler offen. Das ist der vermutlich didaktisch wertvollste Moment des ganzen Projekts — *gerade weil* die AI in vier Vermutungen falsch lag, bevor der User das Stichwort lieferte.
- **Anti-Pattern explizit benannt:** Eine Spec-Nebenbemerkung "Code soll OO sein" als gleichwertiges Feature behandeln statt als T-Contract-Item.

### 2.9 Phase 8 — Blockierbare Felder + die "Hängender-Test"-Geschichte

**Ziel.** Rechtsklick togglet ein Feld blockiert/frei; blockierte Felder sichtbar anders; Solver respektiert sie.

**Mikrofragen vorab.** Visuelle Darstellung (dunkelgrau + Diagonal-Schraffur), Touch-/Tastatur-Substitut (Long-Press + Shift+Enter), Symmetrie-Interaktion (auto-orbit-extension).

**Drei Eingabewege im selben Handler.**
- Maus: Rechtsklick (`contextmenu`, Default unterdrückt)
- Touch: 500-ms-Long-Press
- Keyboard: Shift+Enter auf fokussierter Zelle

**Die hängende Test-Geschichte.** Bei den Test-Erweiterungen schrieb die AI:

```js
test('Solver: 8x8 knight (0,0) with one blocked cell still solves', () => {
  const r = Solver.solve(8, 8, moves, 0, 0, {
    heuristic: 'warnsdorff',
    blocked: new Set(['4,4']),
  });
  // ...
});
```

User-Reaktion: "Der Test hängt sich auf." Node-Probe bestätigte: **Warnsdorff allein auf 8×8 mit einer einzelnen zentralen blockierten Zelle terminiert nicht in 5 Sekunden** — wahrscheinlich nie. Die Heuristik gerät in eine pathologische Backtracking-Region.

User-Hinweis war direkt + nützlich:

> "Du kannst das Muster nehmen, das ich verwendet habe, die Lösung ist sofort da ..."

Mit einer vollständigen URL als Reproduktions-Recipe (**Replay-Test in Action!**):

```
…#heur=outsideIn&sym=point&mix=…&start=7,7&block=6,6;1,1;1,6;6,1;3,4;4,3;4,4;3,3
```

Ersetzt durch Outside-In + Point-Symmetrie + 8 symmetrische Blöcke, Start `(0,1)`: findet die 56-Zell-geschlossene Tour in 45 Schritten. Phase-7.5-Replay-Architektur trägt sofort: die AI konnte die User-Konfiguration in einer Zeile vom User-Browser zum Node-Probe übertragen.

**Was hat man gelernt?**

- **Ein Test ist nicht "richtig", nur weil er Code prüft.** Er ist erst dann richtig, wenn er auch *terminiert*.
- **Pathologische Eingaben für Heuristiken finden ist nicht-trivial.** Die einfachste Vorsichtsmaßnahme: echte User-Konfigurationen testen, nicht erfundene.
- **Detektor-vor-Fix-Prinzip praktisch.** Erst den Hänger isoliert reproduzieren (Node-Probe), dann durch eine robuste Konfiguration ersetzen.

![Phase 8 — Punkt-Symmetrie mit 8 blockierten Feldern, Outside-In findet 56-Zell-Tour um die Blocks herum](_assets/phase-8-blocks-point.png)

### 2.10 Phase 9 — Architektur-Cluster (DI) + Time-Budget + Stop + Re-Click-Continue

**Vorgelagerte User-Frage** (zwischen Phase 8 und Phase 9):

> "Provokant gefragt: Welchen Nachteil hätte es, wenn wir grundsätzlich mit Instances hantieren. Dort wo wir Singletons nutzen, instanziieren wir einmalig ein Objekt, das per Konvention mit 'the' beginnt und arbeiten dann nur noch damit. Also z.B. class Solver, const theSolver = new Solver();"

Antwort nach Abwägung: **fast keine Nachteile, mehrere Vorteile.** Singleton ist globaler State in Klassen-Hülle und unterläuft `T_CONTRACT`-Sektion 1 ("kein globaler State außerhalb von Klassen"). Konsequenzen:
- Neue `CLAUDE.md`-Sektion *"Dependency Injection bevorzugt vor Singleton-Pattern"*.
- `T_CONTRACT.md` Sektion 1 umformuliert: `static getInstance()` nicht zugelassen.
- Code-Refactor: `I18n` und `AppState` haben kein `getInstance` mehr; Konstruktoren nehmen ihre Abhängigkeiten explizit; `app.js` ist der einzige Ort, der `new` aufruft; Variablen-Konvention `theX`.

**Re-Framing des `knight.md`-5-Sekunden-Confirm-Patterns.**

`knight.md` Z. 20 schlug vor: "alle 5 Sekunden per `confirm()` fragen, ob weitergesucht werden soll". Mid-Phase 9 hat der User das neu sortiert mit zwei Use-Cases:

> "1) Es kann sein, dass ich absichtlich will, dass ein JOB eine halbe Stunde lang sucht (beispielsweise gibt es eine zebra solution (2/3-Figur) für ein 10x10 Board, das die App bislang einfach nicht findet). Und da will ich nicht immer wieder vom Browser Protector unterbrochen werden, der mich nach ca. 15 Sekunden fragt, ob ich noch länger warten will!
> 
> 2) Es gibt den Fall, dass ich absichtlich nur 1-2 Sekunden warten will, etwa wenn ich mehrere Startfelder durchprobieren will und vor allem an denjenigen interessiert bin, die schnell zu einer Lösung führen."

Beide Use-Cases mit **einem Mechanismus** bedient: user-konfiguriertes **Time-Budget pro Suche** (Sekunden, Default 10). Plus Stop-Button. Plus chunked Async-Execution via `setTimeout(0)`-Yields — Browser bleibt responsiv, kein Browser-Protector-Pop-up.

**Re-Click-Continue.** Solver-Instanz lebt zwischen Klicks; bei gleichem Start + gleichen Settings setzt die zweite `.search()`-Call die Suche von der gefundenen Tour fort. Schritt-Counter wächst über alle Klicks.

**Was hat man gelernt?**

- **User-getriebene Architektur-Verbesserung.** Die "DI statt Singleton"-Frage war eine *provokante* User-Frage — die AI hatte den Singleton-Mischzustand als gegeben hingenommen. Eine Architektur-Regel landete in `CLAUDE.md` mit globaler Wirkung.
- **`knight.md`-Spec ist nicht heilig.** Der 5-Sekunden-Confirm war ein Workaround für fehlende Cancel-Möglichkeit. Mit chunked async + Time-Budget + Stop-Button gibt es eine bessere Lösung — und sie subsumiert beide Use-Cases.

### 2.11 Phase 10 — Startfeld-Sensitivität (Heatmap)

**Ziel.** Button "Sensitivity" erscheint *nach* erster Lösung. Klick startet pro nicht-blockiertem Startfeld eine eigene Erstlösungs-Suche; Schritt-Zahl wird als Heatmap+Zahl ins Feld geschrieben.

**Mikrofragen vorab.** Visuelle Darstellung (Heatmap + Zahl), Klick-Verhalten nach Sensitivität (sofort reguläre Tour), Symmetrie/Closed-Settings (mitnehmen wie aktuelle Settings). Plus User-Klärung: "Das Zeitbudget gilt für jede Einzelsuche, ok?" — exakt so geplant.

**Implementations-Architektur.** `SensitivityScan`-Klasse neben `SearchDriver` in `driver.js`, gleiche Token-basierte Cancellation. Heatmap-Rendering in `renderer.js`: log-Skala HSL-Ramp grün→rot, kompakte Step-Labels (`12k`, `1.2M`, `—` für no-solution-in-budget).

**Das visuelle Lehrstück.** Auf 8×8 Knight mit Outside-In zeigt die Sensitivitäts-Heatmap eine *sehr* heterogene Difficulty-Landschaft:
- Viele grüne Zellen mit `63` Schritten (Outside-In findet hier sauber durch)
- Mehrere rote Zellen mit `547` Schritten (8.7× mehr Arbeit)
- Eine gelb-grüne Mittelschicht

Zum Vergleich: Warnsdorff produziert auf 8×8 Knight eine *fast einheitliche* Landschaft (alle Felder ≈ 63 Schritte). **Outside-In ist deutlich uneinheitlicher**, und die Heatmap macht diesen Unterschied zwischen Heuristiken auf einen Blick erfassbar.

**Was hat man gelernt?**
- **Daten visualisieren beweist eine algorithmische Eigenschaft besser als Prosa.** Niemand hätte aus *Worten* gespürt, wie heterogen Outside-In ist. Die Heatmap zeigt es in einem Bild.
- **Eine ‚Pro-Cell-Search'-Variante eines bestehenden Solvers ist günstig**, wenn die Solver-Klasse von Anfang als Instance gebaut ist (Phase 9). Die Phase-10-Sensitivitäts-Funktionalität ist im Wesentlichen "Solver in der Schleife mit fortlaufendem UI-Update".

![Phase 10 — Sensitivitäts-Heatmap auf 8×8 Outside-In: heterogene Difficulty-Landschaft, grün=leicht, rot=schwierig](_assets/phase-10-sensitivity.png)

### 2.12 Phase 11 — Code-Hygiene + 100×200-Stresstest

**Ziel.** Code-Review-Tauglichkeit + Stresstest auf großem Brett.

**Master-Plan-Tilt.** Phase 11 sollte ursprünglich die Strukturierungs-Phase sein (Modul-Aufteilung). Das Phase-7.5-DI-Retrofit hatte das schon vorweggenommen. Phase 11 wurde damit zum **Validierungs- und Politur-Pass**.

**100×200-Stresstest-Tabelle.**

| Konfiguration | Ergebnis | Schritte | Zeit |
|---|---|---|---|
| Warnsdorff (open) | ✓ found | 19 999 | **86 ms** |
| Outside-In (open) | timeout | 286 M | 60 s |
| Brute Force (open) | timeout | 491 M | 60 s |
| Warnsdorff CLOSED | timeout | 298 M | 60 s |

Akzeptanzziel war "einstellige Sekunden mit Warnsdorff". 86 ms ist 60× besser. Outside-In skaliert katastrophal auf große Bretter; Brute Force unbenutzbar; Closed-Warnsdorff schafft 100×200 nicht in 60 s (bekannte Schwenk-Bias-Limitation).

**Polish-Items** (CSS-Variablen für Akzent-Farbe, Focus-Ring auf `#search-controls`-Buttons, eine redundante Regel entfernt).

**T-Contract-Verifikation Section-by-Section.** Alle 8 + die geerbte Section 9 ✓.

**Was hat man gelernt?**
- **Wenn die Architektur stimmt, wird die Hygiene-Phase ein Validierungs-Pass.** Das Phase-7.5-Retrofit zahlt sich hier konkret aus.
- **Erfolgsindikatoren explizit machen** (Master-Plan-Kriterium "einstellige Sekunden") und am Ende messen — vermeidet das Gefühl "wir sind irgendwo fertig".

---

## 3. Lehrmomente-Index (Anhang)

Querverweise nach Thema. Wenn dich das Thema interessiert, schau die Phase an.

### 3.1 Methode

- **Mikrofragen vor Code.** Vier auf 1 Spec-Zeile in [Phase 1](#21-phase-1--brett-rendert-klick-erkennbar). Drei vor Phase 8 (Visualisierung, Touch-Substitut, Symmetrie-Interaktion). Drei vor Phase 9, drei vor Phase 10. Die Regelhaftigkeit zeigt sich erst nach mehreren Phasen.
- **Vier-Schritt-Rhythmus** (Klären → Implementieren → Testen → Commit) — Master-Plan-Vorgabe, durchgängig eingehalten.
- **Mid-Phase-Korrekturen sind Methode.** [Phase 2](#22-phase-2--solver-kern-dfs--warnsdorff) (i18n + Z-Order), [Phase 4](#24-phase-4--heuristiken-figuren-mix-button-localstorage) (Status-Feedback-Bug), [Phase 7](#27-phase-7--symmetrien-axisv--point--rot90) (Bias-Fix), [Phase 9](#210-phase-9--architektur-cluster-di--time-budget--stop--re-click-continue) (Re-Framing der 5-Sekunden-Idee).
- **Phasen-Grenzen verteidigen.** Re-Klick-Continue wurde in Phase 4 angefragt, aber auf Phase 9 verschoben.

### 3.2 Verträge (Contracts)

- **F-Contract / T-Contract gleichzeitig.** Lehrstück [Phase 7.5](#28-phase-75--t-contract--architektur-retrofit-der-höhepunkt). Diese Sektion ist *der* Höhepunkt des Projekts.
- **`knight.md` als Intentionsskizze.** Durchgängig — siehe Mikrofragen-Beispiele in jeder Phase.
- **`T_CONTRACT.md` retrograd geschrieben + Sektion 9.** Der erste Entwurf war zu spezifisch (8 Modul-Namen); User-Korrektur → abstrahiertere Form + Sektion 9 für die "geerbten Globalen".
- **Hierarchie der Dokumente:** `CLAUDE.md` global → `T_CONTRACT.md` projektlokal → `LEHRUNTERLAGE.md` (diese Datei) destilliert.

### 3.3 Architektur

- **DI statt Singleton, `theX`-Konvention.** Architektur-Cluster vor [Phase 9](#210-phase-9--architektur-cluster-di--time-budget--stop--re-click-continue). User-getrieben.
- **Modulgröße < 250.** T-Contract-Pflicht. Extraktion bei Überschreitung: `Sym` aus `Solver`, `SearchDriver` aus `app`, `SensitivityScan` aus `app`, Heatmap-Rendering von `Board` nach `Renderer`.
- **OO-Schnittführung erst während der Arbeit präzisierbar.** T_CONTRACT-Korrektur nach User-Hinweis "Liste der Module retrograd".
- **Baseline-Verhalten ist kein Feature.** `CLAUDE.md` (Resize, Hover, Keyboard, sensible Defaults) — Erkenntnis aus [Phase 3](#23-phase-3--variable-brettmaße--padding-fundament).

### 3.4 Algorithmus

- **Warnsdorff: brillant, aber nicht infallible.** [Phase 3](#23-phase-3--variable-brettmaße--padding-fundament) (8×4 = 13.4M Schritte). Tie-Breaker-Regeln (Pohl 1967) wären die Lösung — bewusst nicht im Scope.
- **Schwenk-Bias für geschlossene Touren.** User-Beitrag — siehe [Phase 6](#26-phase-6--geschlossene-touren-via-schwenk-bias). Eine der elegantesten Mid-Phase-Verbesserungen des Projekts.
- **Farbparitäts-Argumente.** 5×5 nur von dunklen Feldern lösbar — [Phase 3](#23-phase-3--variable-brettmaße--padding-fundament). Rot90 nur N mod 4 = 2 — [Phase 7](#27-phase-7--symmetrien-axisv--point--rot90).
- **Outside-In-Heterogenität sichtbar gemacht.** [Phase 10](#211-phase-10--startfeld-sensitivität-heatmap) Heatmap.

### 3.5 Werkzeuge

- **URL-Hash als Replay-Mechanismus.** [Phase 7.5](#28-phase-75--t-contract--architektur-retrofit-der-höhepunkt) B2. Wurde in [Phase 8](#29-phase-8--blockierbare-felder--die-hängender-test-geschichte) zur direkten Bug-Reproduktion (User schickt URL, AI repliziert mit Node-Probe).
- **Browser-basierte Pure-Function-Tests** in `tests/test.html`. [Phase 7.5](#28-phase-75--t-contract--architektur-retrofit-der-höhepunkt) B5.
- **Token-Cancellation für chunked Async.** [Phase 9](#210-phase-9--architektur-cluster-di--time-budget--stop--re-click-continue) `SearchDriver`, [Phase 10](#211-phase-10--startfeld-sensitivität-heatmap) `SensitivityScan`.
- **Time-Budget statt Browser-Protector.** [Phase 9](#210-phase-9--architektur-cluster-di--time-budget--stop--re-click-continue) — Re-Framing der `knight.md`-Z.20-Idee.

### 3.6 Anti-Patterns (was vermieden wurde, oft nach Fehler)

- **Heimliches Konsultieren des gelöschten Codes** — [Phase 0](#20-phase-0--tabula-rasa--self-commitment) Self-Commitment.
- **Phasen-Bündelung.** Master-Plan-Regel: jede Phase ein Commit-Set, auch wenn "zwei kleine Features zusammen in 10 Minuten" gehen würden.
- **Späte Komplett-Rewrites zur Code-Schönheit.** Vermieden. Closed-Warnsdorff-Bias-Limitation auf 100×200 bleibt als bekannte Eigenheit dokumentiert, statt überschrieben.
- **Retrograde Spezifität im T-Contract.** Korrigiert durch User-Hinweis.
- **Stille Auslassung.** `CLAUDE.md`-Pflicht. Lieber krachend abbrechen als falsche Ergebnisse produzieren.
- **Tests, die nicht terminieren.** [Phase 8](#29-phase-8--blockierbare-felder--die-hängender-test-geschichte) — Detektor-vor-Fix-Anwendung.

---

## 4. Referenz-Anhänge

### 4.1 Architektur-Übersicht

10 Module, alle < 250 Zeilen, in dieser Lade-Reihenfolge in `index.html`:

| Modul | Verantwortung | Größe |
|---|---|---|
| `js/i18n.js` | Strings-Map, aktuelle Sprache, `t(key)`-Lookup, Listener | 111 |
| `js/figures.js` | `generateBaseMoves`, `computePad` (statische Helper) | 21 |
| `js/sym.js` | Symmetrie-Helper: isValid, orbit, transform, expand | 60 |
| `js/solver.js` | Iterativer DFS + Heuristik + Closure-Bias + Symmetrie; chunked `search(maxMs)` | 238 |
| `js/state.js` | Single source of truth aller Einstellungen; localStorage + URL-Hash | 230 |
| `js/board.js` | Cell-DOM, Click/Long-Press/Keyboard, ARIA, Resize-Listener | 234 |
| `js/renderer.js` | Tour-Linie + Nummern + Closing-Linie + Heatmap | 127 |
| `js/driver.js` | `SearchDriver` (chunked Single-Search) + `SensitivityScan` | 182 |
| `js/ui.js` | DOM-Controls-Lookup, applyI18n, applyState, bindHandlers | 196 |
| `js/app.js` | Orchestrierung: instanziiert alles, verdrahtet Event-Handler, steuert den Lifecycle | 247 |

**Dependency-Graph** (im Entry-Point `app.js` sichtbar gemacht):

```
   theI18n = new I18n()
   theState = new AppState(theI18n)
   theUI = new UI(theI18n, theState)
   theBoard = new Board(theUI.boardEl, theI18n, theState)
   theRenderer = new Renderer(theBoard)
   theDriver = new SearchDriver(theState, theI18n, theUI, theRenderer)
   theSensitivity = new SensitivityScan(theState, theI18n, theUI, theRenderer)
```

Keine `static getInstance()` mehr. Jede Klasse deklariert ihre Abhängigkeiten in der Konstruktor-Signatur.

### 4.2 Akzeptanztests-Übersicht

**Automatisiert** (Browser-Test-Runner `tests/test.html`, 12 Cases):
- `Figures.generateBaseMoves(1,2)` / `(3,4)`: 8 distinct moves
- `Figures.computePad`
- `Sym.isValid` Truth Table
- `Sym.orbit` rot90 on 8×8 = 4 distinct
- `Sym.transform` rot90 4× = identity
- `Solver.solve` 8×8 knight Warnsdorff: 63 steps
- `Solver.solve` 8×8 knight (3,3) closed Warnsdorff
- `Solver.solve` 6×6 knight rot90: closed + rotational invariance
- `Solver.solve` 5×5 knight light square → null
- `Solver.solve` blocked start → null
- `Solver.solve` 8×8 Outside-In Point + 8 blocks (User-Pattern from Phase 8)
- `Solver.solve` asymmetric block on 6×5 axisV → null
- `Solver.solve` 10×10 Warnsdorff + Outside-In

**Manuell pro Phase** in `PROTOKOLL.md` dokumentiert, mit Screenshots in `_assets/`:
- Phase 1: 8×8 Brett rendert
- Phase 2: Solver-Kern + Outside-In Tour
- Phase 3: 8×4 13M-Schritte + 200×100 stress
- Phase 4: 8×6 Zebra "no solution after 371M steps"
- Phase 5: 7×7 Lines-only + 40×25 Numbers-only
- Phase 6: 9×8 closed mit Schwenk-Bias
- Phase 7: 6×6 Rot-90° Outside-In (10 steps!)
- Phase 8: 8×8 Point + 8 Blöcke, Outside-In, 56-Zell-Tour
- Phase 10: 8×8 Outside-In Sensitivitäts-Heatmap

### 4.3 Master-Plan-Erfolgsindikatoren

Alle erfüllt:
- ✓ 14 Features aus `knight.md` umgesetzt
- ✓ 100×200 mit Warnsdorff in 86 ms (Ziel: einstellige Sekunden — übererfüllt)
- ✓ App startet aus `file://` ohne Server/Node-Abhängigkeit
- ✓ Multi-File, OO-strukturiert, jede Datei kohärent und < 250 Zeilen

### 4.4 Was im Projekt-Umfang NICHT behandelt wurde

Transparent dokumentiert in `T_CONTRACT.md`-Sektion "Deferred":
- Color-blind-safe Heatmap-Palette (optional, niedrige Priorität)
- Mobile-Portrait-spezifisches Layout
- Cross-Browser-Lauf (Firefox / Safari manuell)
- Touch-Substitut umfassender Geräte-Test
- Warnsdorff-Tie-Breaker-Regel (Pohl 1967) für 8×4-Pathologie
- Closed-Tour-Suche-Verbesserung jenseits Schwenk-Bias (für 100×200)

Diese Items sind keine Geheimnisse — sie liegen offen. Wer die App auf einem dieser Punkte stresst, weiß *vorher*, was nicht funktioniert.

---

## Schluss

Diese Lehrunterlage ist das Ergebnis von Phase 12 des Master-Plans, geschrieben im Anschluss an die Phasen 0–11 als co-redaktionelle Destillation des PROTOKOLLs. Sie versucht, *die Reibung* sichtbar zu lassen, *nicht das glatte Ergebnis*. Wer den Eindruck hat, dass Phase 7.5 (NFR-Diagnose) mehr Raum bekommt als andere Phasen — der hat den Punkt verstanden. Die methodischen Lehrstücke verteilen sich nicht gleichmäßig. Sie konzentrieren sich dort, wo der User den Mut hatte, eine grundlegende Designfrage zu stellen, und die AI den Mut hatte, sie ehrlich zu beantworten.

Wer Knight's Tour als Knight's Tour interessant findet — wunderbar, im Repo läuft die App. Wer den Prozess interessant findet — willkommen im PROTOKOLL, willkommen in dieser Destillation.
