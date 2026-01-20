# AIDE - Knight

Finde einen Springerpfad auf einem Schachbrett, der jedes Feld genau einmal berührt.

Dieses Projekt ist Teil von [AIDE examples](https://github.com/aide-examples) – einer Reihe von Anwendungen, die fast vollständig mit agentenbasierter Programmierung erstellt wurden.

<img src="Thomasson_symmetric_closed_knights_tour.svg.png"/>

# Hintergrund

Die Suche nach einem Pfad, auf dem ein Springer jedes Feld eines Schachbretts genau einmal besucht, ist ein Standardproblem, das häufig im Unterricht verwendet wird, um Rekursion als Programmiertechnik zu vermitteln.

Im Internet existieren unzählige Lösungen, die dieses Problem in verschiedenen Programmiersprachen lösen.

Kann agentenbasierte Programmierung hier einen Mehrwert bieten? Wir glauben, es hängt davon ab, was das spezifische Lernziel ist.


# Ausgangssituation

Es wird erwartet, dass die Grundlagen der Programmierung bekannt sind – insbesondere imperative Anweisungen, Arrays, Funktionen und Parameterübergabe (by value und by reference).


# Der klassische Ansatz

Die Aufgabe besteht darin, eine systematische Baumsuche mittels Rekursion zu programmieren, um reines Backtracking zu implementieren. Man stellt dann fest, dass ein 6x6-Feld auf diese Weise handhabbar ist, aber ein 8x8-Feld eine zusätzliche Heuristik erfordert, die im Wesentlichen besagt: „Wenn du dich eingeengt fühlst, gehe frühzeitig in den engen Pfad." Das Lernziel ist erreicht, wenn die technische Fertigkeit vorhanden ist, die rekursive Suche von Grund auf zu implementieren und den nächsten Zug nach dieser Regel auszuwählen.

Typischerweise werden die Studierenden drei oder vier Funktionen schreiben. Objektorientierung gilt als „zu kompliziert für den Anfang" und wird einem „späteren Reifegrad" der Studierenden vorbehalten.

Bei der Besprechung der Details einer rekursiven Funktion wird das Konzept des Aufrufstapels klar werden. Es wird üblicherweise darauf hingewiesen, dass viele Laufzeitumgebungen aufgrund ihrer „Speichermodelle" technische Beschränkungen für den Aufrufstapel haben, was manchmal die Notwendigkeit einer eigenen Stapelverwaltung innerhalb der Anwendung selbst aufwirft. Ambitionierte Studierende werden dies manchmal selbst implementieren.

Je nach gewählter Sprache – die für alle Studierenden identisch sein wird – werden sie mit Fragen der dynamischen Speicherverwaltung konfrontiert oder nicht.


# Wie könnte ein KI-gestützter Ansatz funktionieren?

Kurz gesagt: Er wird weniger code-zentriert und mehr problem-zentriert sein. Die Motivation wird nicht aus dem **Schreiben von korrektem Code** kommen, sondern aus dem **Formulieren der richtigen Anweisungen, die relativ guten Code zur Lösung eines Problems produzieren**. Für Praktiker und fortgeschrittene Studierende ist dies genau das, was gebraucht wird. Für Anfänger vielleicht nicht, aber vielleicht ein Einblick?

## Schritt 1

Das Problem wird vorgestellt und es wird darauf hingewiesen, dass Menschen nicht besonders gut darin sind, systematisch alle denkbaren Züge durchzuspielen, aber Maschinen dies perfekt können, wenn man ihnen genau erklärt, wie sie vorgehen sollen. Die Begriffe „Suchbaum" und „Tiefensuche" werden eingeführt, zusammen mit einem Hinweis, dass Eckfelder problematisch sein könnten. Frage: Ist ein Computer schnell genug, um alle denkbaren Zugfolgen auszuprobieren? Ungefähr wie viele Schritte wird es brauchen, um eine Lösung zu finden?

Es folgt eine Gruppendiskussion, in der systematische Suche und ein Mechanismus zum „Ausprobieren guter Züge zuerst" als zwei Lösungselemente erkannt werden, die offensichtlich kombiniert werden müssen. Dies beinhaltet Schätzungen zur Komplexität, die durch eigene Überlegungen untermauert und dann durch Webrecherche validiert werden sollten. Die Diskussion kann auch Aspekte der CPU-Taktfrequenz und der Anzahl der Zyklen beinhalten, die für einen einzelnen Zug notwendig sein könnten. Der Lehrer kann diese Punkte später vertiefen. Die Studierenden verstehen, dass selbst eine gute Heuristik keine kurzen Laufzeiten garantiert und überhaupt nicht hilft, wenn das Problem keine Lösung hat. So konzentrieren sie sich mehr auf den *Charakter des Problems* als auf die *Implementierung der Baumsuche*.

Die Gruppen werden aufgefordert, ein Programm mit einfacher Tiefensuche (Depth First Search, DFS) und eine verbesserte, effizientere Version zu liefern. Der Lehrer erklärt, dass verschiedene Programmiersprachen zu unterschiedlichen Laufzeiten für denselben Algorithmus führen können und dass eines der Bewertungskriterien die Ausführungszeit für große Bretter sein wird. Ein Wettbewerbselement ist oft gut für die Motivation.


## Schritt 2

Jede Gruppe bittet einen oder mehrere KI-Agenten, ein Programm (einschließlich Quellcode) im Web zu finden oder selbst zu erstellen.
Es ist die **Aufgabe der Studierenden, einen geeigneten Prompt zu formulieren**. Sie könnten beispielsweise folgende Kriterien verwenden:

- Funktionale Anforderungen
  - Wir suchen ein Programm, das das Springerproblem auf dem Schachbrett löst.
  - Es soll stoppen, nachdem es eine Lösung gefunden hat.
  - Wir wollen messen, wie effizient das Programm das Problem löst (Ausführungszeit, evtl. andere Indikatoren?)
  - Das Ergebnis muss auf der Konsole ausgegeben werden.
  - Die Eingabe erfolgt über die Kommandozeile.
  - Beim Aufruf des Programms kann die Größe des Spielfelds (x, y) angegeben werden.
  - Wir brauchen zuerst eine einfache Version mit reiner systematischer Suche.
  - Wir wollen sie mit eigenen Ideen erweitern.
  - OPTIONAL: Wir kennen die Warnsdorff-Heuristik. Kannst du auch ein Programm liefern oder finden, das diese verwendet?

- Nicht-funktionale Anforderungen
  - Das Programm sollte gut strukturiert und dokumentiert sein.
  - Wir akzeptieren nur englischen Code und englische Kommentare.
  - Das Programm muss lokal ausführbar sein.

- Steuerung des Suchprozesses
  - Suche nach guten Kandidaten im Web und biete die Möglichkeit, ein solches Programm selbst zu erstellen.
  - Zeige mindestens drei potenzielle existierende Kandidaten und deine eigene Lösung, auch wenn sie nicht alle unsere Kriterien erfüllen.
  - Erstelle eine Rangliste, die für externe bereits existierende Lösungen Links zu den jeweiligen Webressourcen enthält.


Es liegt an den Studierenden – und ist ein Kernbestandteil ihrer Lernerfahrung – einen solchen Prompt zu erstellen. Es könnte klug sein, einen solchen Prompt nicht als einzelne Transaktion zu formulieren. Sie könnten auch eine Diskussion mit der KI beginnen, in der sie ihre Absichten erklären, bevor sie ihre Erwartungen eingrenzen. Idealerweise werden sie die Vor- und Nachteile von „make vs. buy" verstehen. Vielleicht kommen sie auch darauf, das Problem zu erkunden, bevor sie sich auf „gib mir ein Programm" konzentrieren, hoffentlich denken sie an die Situation, die sie erwartet, nachdem sie ihr „Code-Geschenk" erhalten haben ...

- „Gib mir ein gutes konzeptionelles Dokument zum *Springerproblem*, das systematische Suche und Verbesserungsideen erklärt." Die Antwort könnte auf einen Artikel wie diesen verweisen: https://medium.com/@danielfrost_3076/implementing-a-heuristic-solution-to-the-knights-tour-problem-513a73cc7e20
- „Angenommen, ich bitte dich, das Programm selbst zu erstellen – wirst du dann besonders gut darin sein, zu erklären, wie es funktioniert?"
- „Oder kannst du die gleiche Art von Analyse und Erklärung für jedes Programm machen, das wir aus den anderen Kandidaten wählen würden?"
- „Ich möchte die Laufzeit minimieren und werde versuchen, den Suchalgorithmus später zu optimieren."

Vielleicht wird eine kluge Diskussion mit der KI folgende Aspekte aufbringen:
- Die Entwicklung guter Suchstrategien und ihre optimierte Implementierung können entkoppelt werden.
- Wir können mit einer typlosen Skriptsprache beginnen und die KI unseren Code später nach C++ übersetzen lassen, wenn wir fertig sind.
- Wenn wir eine optimierte Version im Web finden (oder die KI initial eine erstellt), könnte der Code schwerer zu verstehen sein. Gefällt uns diese größere Herausforderung? Letztendlich landen wir vielleicht sowieso bei einer Low-Level-Sprache wie C oder einer komplexen objektorientierten Sprache wie C++. Ist es nicht besser, diesen Weg von Anfang an zu gehen?
- Es ist wichtig, ein präzises Maß für die *Qualität unseres Algorithmus* zu haben. Neben der absoluten Ausführungszeit sollten wir die Anzahl der Versuche zeigen, die zur Lösung des Problems benötigt werden.
- Komplexere Algorithmen werden mehr Ausführungszeit pro Schritt benötigen, daher sollten wir auch die durchschnittliche Zeit für einen einzelnen Suchschritt berechnen.
- Werden wir am Ende zwei Programme haben oder kann es ein Programm sein, bei dem wir die Verbesserungsheuristik ein- und ausschalten können?

All diese Überlegungen befassen sich mehr mit WAS und WARUM als mit WIE.


## Schritt 3

Ein oder mehrere Kandidaten werden von jeder Gruppe installiert, ausgeführt und getestet. Dann wird ihr Code 5 Minuten lang untersucht (300 Sekunden, tatsächlich), wobei vielleicht ein paar Kommentare hinzugefügt oder einige Anweisungen auf einer gedruckten Kopie des Quellcodes hervorgehoben werden.

Vielleicht beginnen einige Gruppen die Arbeit mit einer Sammlung von Funktionen, während andere eine Lösung mit einem Klassendesign gefunden haben. Die weitere Erweiterung der Programme wird unweigerlich die **Notwendigkeit des Wechsels zu objektorientiertem Design** aufwerfen. Es ist wichtig, dass der Lehrer die Grundidee von OO jetzt oder während der frühen nächsten Schritte einführt. *Nur die Wahrnehmung von Funktion und Daten als logische Einheit.* Nichts anderes.


## Schritt 4

Nun tauschen die Gruppen ihre Erfahrungen aus und erhalten Feedback vom Lehrer. Dann beginnt die eigentliche Arbeit, wobei die meisten Änderungen an den Programmen von Agenten ausgeführt werden.

---

Um potenzielle Artefakte zu illustrieren, die während Schritt 4 erstellt werden, finden Sie **eine Sammlung von Python-Skripten in diesem Repository**.
Die *HTML-Datei* wurde von Version 8 der Skripte erstellt. Die *Python-Skripte* enthalten auch Informationen über den *Prompt*, der zur Erstellung des Skripts verwendet wurde. Die beiden *Markdown-Dateien* zeigen Antworten eines KI-Agenten (in diesem Fall: ChatGPT) während eines wichtigen Designschritts.

---

- Wir beginnen damit, die KI zu bitten, zu **erklären**, wie die systematische Baumsuche funktioniert.

- Wo ist die Stelle im Code, die vielversprechende Züge identifiziert? Wie werden sie sortiert? Ist der Sortierschritt „stabil" bezüglich der ursprünglichen Reihenfolge der möglichen Züge, die erkannt wurden?

- Dann **führen wir das Programm** für ein wirklich großes Brett aus (80x80 statt 8x8). Programme, die mit direkter Rekursion arbeiten, werden hier auf Schwierigkeiten mit Stapelbegrenzungen stoßen. Betroffene Studentengruppen müssen nach einer Lösung suchen.
  - Sie können dies naiv tun („Ich möchte wirklich große Bretter lösen")
  - Oder sie bitten um **Re-Engineering** ihres aktuellen Codes mit expliziter Stapelverwaltung.
  - Die Inspektion dieser Änderungen auf Code-Ebene sollte durchgeführt werden. Die Ergebnisse der ursprünglichen und der verbesserten Version müssen für kleinere Brettgrößen verglichen werden. Wenn die Studierenden eine hochintegrierte Agenten-UI verwenden (wie VS Code und Claude Code), können sie das Testen möglicherweise vollständig an den Agenten delegieren.

- Nun denken wir über die **Warnsdorff-Heuristik** nach. Die Reihenfolge, in der Felder mit gleichem Rang ausprobiert werden, könnte eine Rolle spielen. Normalerweise werden Züge in kreisförmiger Reihenfolge erkannt. Ändert sich die Ausführungszeit, wenn eine andere (aber immer dieselbe) Reihenfolge verwendet wird?

- Wir beobachten unsere Art, das Programm zu ändern: Offensichtlich ist es eine schlechte Strategie, ein neues Programm per Copy/Paste zu erstellen, um diese Änderungen vorzunehmen. Einfach die aktuelle Version zu ändern und *git* den langweiligen Teil machen zu lassen, ist auch nicht so gut (warum?). Daher führen wir Kommandozeilenoptionen ein, um die neuen Funktionen zu aktivieren/deaktivieren.

- Wir **testen weitere Hypothesen**, z.B. Könnte es vorteilhaft sein, von außen nach innen vorzugehen – d.h. „Bei gleichwertigen Zügen immer denjenigen wählen, der uns näher an den Rand des Spielfelds führt."

- Was ist mit dem **Startpunkt** in der oberen linken Ecke? Kann es vorteilhaft sein, genau einen Zug von diesem Feld entfernt zu starten? Oder ist es vielversprechender, in der Mitte zu beginnen?

- Höchstwahrscheinlich wird die **wachsende Anzahl von Kommandozeilenoptionen** den Wunsch wecken, sie sauber zu handhaben und dem Benutzer zu erklären. Also könnten wir einen Prompt formulieren wie „Unser Programm braucht eine professionelle Handhabung von Kommandozeilenoptionen und Erklärungen, was der Benutzer tun kann."

- Der nächste Schritt könnte ein Lehrerinput über einen typischen Weg der **Mikro-Optimierung** sein: Das einfache Stück Code, das testet, ob ein Zielfeld innerhalb oder außerhalb des Bretts liegt, muss offensichtlich vier Bedingungen prüfen! Dies kann vermieden werden, wenn wir das Brett mit *zwei Streifen blockierter Felder* umgeben. Es macht am meisten Sinn, solche Strategien in Kombination mit einer Sprache wie C zu verwenden. Aber es wird auch in Skriptumgebungen helfen. Lass uns ausprobieren und den Leistungsgewinn mit dem DFS-Algorithmus messen. Einige Studierende könnten versuchen, dies manuell zu implementieren, aber wir würden nicht von allen verlangen, es so zu machen. Vielleicht könnten sie „Extrapunkte" dafür bekommen, es ohne KI zu machen.

- Der nächste Schritt ist eine obligatorische manuelle Änderung für alle Gruppen: **KI hat Urlaub.** Ihr müsst eine neue Option hinzufügen, die **geschlossene Touren** erzwingt. Warum diese? Weil man eine kleine Reihe von Änderungen an verschiedenen Stellen im Code vornehmen muss. Werden die Studierenden verstehen, dass eine geschlossene Tour auf einem 7x7-Brett absolut unmöglich ist? Werden sie eine Prüfung und eine Antwort an den Benutzer für ungerade Brettgrößen integrieren?

- Der nächste ist ebenfalls ein manueller Schritt, aber mehr auf konzeptueller Ebene: Wenn wir eine **symmetrische Tour** finden wollten: Würden wir sie auf die gleiche Weise implementieren, d.h. am Ende der Tour prüfen, ob sie symmetrisch ist? Warum ist das eine wirklich schlechte Idee? Was könnte besser funktionieren? Wie wäre es, mit zwei oder vier Feldern gleichzeitig zu beginnen (abhängig von der Art der gewünschten Symmetrie) und einen Zug auf dem ersten Pfad zwangsweise auf die anderen Pfade zu spiegeln? Wie gehen wir mit Zügen um, die Pfadabschnitte verbinden? Das ist wirklich eine interessante Aufgabe für Studierende mit „etwas mentaler Energie übrig". Wir werden wahrscheinlich unterschiedliche Geschwindigkeiten zwischen den Gruppen sehen und sollten sie akzeptieren.

- Wir bitten um eine **grafische Visualisierung der Ergebnisse**. Mehrere technische Alternativen wie die Erstellung animierter GIFs oder die Verwendung spezialisierter Tools für Graphenvisualisierung sollten in der Gruppe und mit KI-Agenten diskutiert werden. In unserem Fall ging die KI auf komplizierte und plattformabhängige Lösungen ein, bis wir sie direkt auf die Möglichkeit hinwiesen, HTML mit SVG und etwas Javascript für Animation zu generieren. Als sie gebeten wurde, die Alternativen zu vergleichen, bevorzugte sie unseren Vorschlag und „bewies" dessen Überlegenheit. Lasst uns **extrem misstrauisch gegenüber solchen Tendenzen von KI-Agenten sein, ihren Benutzern zu gefallen**! Was auch immer ihr wählt, ihr werdet fast sicher denken: „KI soll diese Arbeit machen und ich kümmere mich überhaupt nicht darum, wie sie den Graphen erstellt und wie der Code aussieht, den sie dafür verwendet. Ich werde mein Feedback basierend auf dem Ergebnis geben und hoffentlich kann ich die KI präzise genug steuern, um das zu produzieren, was ich im Sinn habe." In unserem Fall hat Claude Code (Anthropic) gute Arbeit geleistet und es dauerte weniger als 20 Minuten, um bei einem gut aussehenden HTML mit Animationsfunktionen anzukommen.

- Weitere Schritte könnten sein, **blockierte Felder** einzuführen – eine gerade Anzahl von Feldern (die Hälfte schwarz, die andere Hälfte weiß! Warum?), die vom Springer nicht berührt werden können. Wir speichern einige Anordnungen solcher Felder im Code und erlauben, diese Beispiele über die Kommandozeile auszuwählen. Vielleicht sollten wir auch anbieten, blockierte Felder über die Kommandozeile anzugeben...

- Wenn wir spezifische Anordnungen blockierter Felder verwenden (wie das Blockieren eines der beiden Eingangspunkte für jedes Eckfeld), wird ein Mensch leicht sehen, dass eine Lösung definitiv unmöglich ist, weil wir vier Sackgassen haben. Unser Programm könnte stattdessen Stunden an CPU-Zeit in solch einem Fall verbrennen. Können wir eine Fähigkeit hinzufügen, **nicht lösbare Probleme zu identifizieren**? Zumindest für diese Art von nicht machbaren Brettern?

- Schließlich der Ausblick: Wenn wir sehr große Spielflächen haben (z.B. 1.000 x 1.000), sollte es möglich sein, mit **Kachelung** zu arbeiten! Forschung zeigt, dass andere dies vor uns getan haben. Wir entwickeln unsere eigenen Gedanken zu den „Bausteinen", die wir für die Kachelung benötigen würden, und suchen dann nach Quellen, wie dieses (sicherlich nicht-triviale) Problem gelöst wurde. Wir akzeptieren, dass es **jenseits unserer Möglichkeiten** liegt, dieses Rad neu zu erfinden.


## Schritt 5

Dokumentiere deine Erfahrungen in einem Papier von fünf Seiten. *Zuerst* sammle alles, was du sagen möchtest, in einer Liste von Stichpunkten. *Erst danach* bitte die KI, einen ähnlichen Text selbst zu erstellen „über die Erfahrungen, die wir zusammen gemacht haben, über das Problem selbst und über die Lösung, die wir schließlich erstellt haben". Dann bitte die KI, deine Punkte in ihren Text zu integrieren, ohne über fünf Seiten hinauszugehen. Bist du mit dem Ergebnis zufrieden? Ist es „deins"?
Wie unterschiedlich ist es von dem, was die anderen Gruppen produziert haben?

---

# Beispielskripte

Wie bereits gesagt, bieten wir Beispielskripte, Markdown-Dateien und das produzierte HTML an, um mögliche Ergebnisse eines KI-zentrierten Ansatzes zu illustrieren.
Erwarte, dass deine Gruppen ihren eigenen Weg durch den Dschungel der Möglichkeiten finden werden. Wir bieten kein Ergebnis für Schritt 5 an.
Du möchtest vielleicht einige Qualitätsmetriken auf die Skripte und das in Schritt 5 erstellte Dokument anwenden.


# Zusammenfassung

Durch den Einsatz von Agenten gewinnt das Verständnis des Anwendungsbereichs Dominanz über die technische Implementierung. Dies wird besonders deutlich beim Wechsel von der rekursiv programmierten Version zu einem selbst verwalteten Stapel der Zughistorie.
Bei einer festen Zeitspanne für Lehrer und Lernende muss man entscheiden, ob diese Art der Programmänderung ein Kernziel der Ausbildung ist oder ob es ausreicht zu wissen, dass „es technische Probleme mit Rekursion und Baumsuche geben kann, aber sie irgendwie gelöst werden können".

**Es wird keine universelle Antwort darauf geben.** Einige Informatiker müssen in der Lage sein, mit allen Facetten der Rekursivität umzugehen; viele andere werden in ihrem Berufsleben niemals ein System entwerfen oder warten, in dem Rekursion vorkommt. Einige müssen hochoptimierte Kernalgorithmen entwerfen, die ein gründliches Verständnis von Zeigern, von expliziter Allokation und Freigabe dynamischen Speichers erfordern. Glücklicherweise können sich die meisten Softwareingenieure heutzutage auf Garbage Collection verlassen.

---

Agentenbasierte Programmierung kann die Komplexität eines Programms schnell erhöhen. Manchmal führt dies zu neuen Horizonten, die vom traditionellen Lehransatz nicht berührt worden wären: In unserem Beispiel könnten die Studierenden lernen, wie Kommandozeilenoptionen professionell gehandhabt werden. Die KI wird wahrscheinlich eine Bibliothek dafür einführen. So werden die Studierenden die Nützlichkeit verstehen, sich auf „Bausteine" zu verlassen, anstatt improvisiertes Kommandozeilen-Parsing von Hand zu programmieren. Die Einführung agentenbasierter Programmierung wird es talentierten Studierenden ermöglichen, komplexe Erweiterungen wie Symmetrie zu erkunden, während andere mit den Grundlagen kämpfen. Das ist eine Herausforderung für den Lehrer – und es ist seine Belohnung dafür, eine gruppenzentrierte, wettbewerbsorientierte Lernerfahrung für die Studierenden zu arrangieren.

Auf die Spitze getrieben, könnte man das Prinzip des „umgedrehten Klassenzimmers" anwenden. Bei diesem Ansatz würde die Unterrichtsstunde damit beginnen, dass jede Gruppe **bereits die Schritte 1, 2 und 3 selbständig durchlaufen hat**. Schritt 3 (Code-Lesen) könnte bei diesem Ansatz mehr Zeit bekommen.
Die ersten Minuten von Schritt 4 würden genutzt, um Erfahrungen strukturiert auszutauschen, mit Fokus auf
- die **Reihenfolge und Qualität der ausgegebenen KI-Prompts**
- die **Qualität der erhaltenen Vorschläge** (abhängig vom Kenntnisstand der Studierenden!)
  - Waren die Programme einfach zu installieren?
  - Haben die Programme korrekt funktioniert?
  - Sehen wir globale Variablen?
  - Haben wir nur einen Haufen Funktionen oder haben wir ein objektorientiertes System bekommen?
  - Wie viel Code-Duplikation hat die KI eingeführt, als sie gebeten wurde, die Warnsdorff-Regel hinzuzufügen?
  - Ist Vererbung ein guter Ansatz, um verschiedene Algorithmen zu trennen?
  - Sehen wir „if (algo=='xx') .." an vielen Stellen im Code?
  - Wie steht es mit der Übergabe von Funktionen als Parameter? Was ist Dependency Injection?
  - Wie wäre es, solche architektonischen Fragen mit der KI zu diskutieren?
- den **Grad des Vertrauens**, den die Gruppen in ihre gewählte Lösung für weitere Erweiterungen haben

Dann könnte die **gemeinsame Arbeit mit Schritt 4 beginnen**. Ja, das wird eine harte Zeit für den Lehrer. Besser zwei oder drei davon für sechs gleichzeitig arbeitende Gruppen haben.

---

Kontinuierliches Arbeiten mit agentenbasierter Programmierung verbessert die Fähigkeit, Wünsche und Ideen zu formulieren, Anfragen zu definieren, Fehler zu melden, Verbesserungen in Betracht zu ziehen, Vorschläge und Erklärungen zu fordern, das Ergebnis zu dokumentieren und die produzierten Artefakte kritisch zu betrachten. *Wie bereits erwähnt, halten wir dies für einen wichtigen Aspekt der IT-Ausbildung.*
