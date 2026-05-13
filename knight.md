Dies ist die Anweisung, eine App zu erstellen, die das knight´s tour problem löst und die Lösung visualisiert.

Es geht darum, einen Springer auf einem Schachbrett so zu bewegen, dass er jedes Feld genau einmal betritt.

Die App soll das Problem möglichst effektiv lösen, durch eine Kombination aus DFS Baumsuche und einer Heuristik, die günstig erscheinende Wege bevorzugt (Warnsdorff oder ähnlich).

Es soll ein einfaches Web-UI geben, bei dem man die Brettabmessungen (Breite und Höhe) unabhängig voneinander ändern und den Startpunkt festlegen kann. Die Felder sollen in den typischen Fraben dargesetllt werden, die man bei Schachbrettern verwendet, die Zugfolge wird durch einen Linienzug visualsiert, welcher die Felder miteinander verbindet. Das erste Feld der Tour erhält die Nummer 1, das letzte die 64 (bzw. die höchste Nummer bei Boards, die nicht 8x8 als Dimension haben). Der User kann über eine Checkbox die Anzeige der Feldnummern oder der Linien an- und ausschalten. Bedenke, dass ich auch Brettgrößen mit z.B. 100 X 200 Feldern ausprobieren möchte.
Teste das Programm mit 100x200!

Es wird gezeigt, wie viele Zugversuche das Program benötigt hat, bis es die dargestellte Lösung gefunden hat. Dabei gilt auch das Zurücknehmen eines vorherigen Zugs als (weiterer) Zug.

Normalerweise wird die erste gefundene Lösung gezeigt, Wenn man jedoch erneit auf dasselbe Startfeld klickt, wird von der aktuell gefundenen Lösung aus weitergesucht.

Wenn eine Lösung gefunden wurde, soll ein Button erscheinen, der "Starfeld-Sensitivität" heißt. Ein Klick auf diesen Button führt die Suche nach der jeweils ersten Lösung von jedem Startfeld einzeln aus und schreibt in das Startfeld die Anzahl der Züge, die jeweils bis zur ersten Lösung benötigt werden.  

Es soll möglich sein, die App lokal auszuführen, ohne dass man extra einen Webserver installieren oder nodeJS installieren muss. Benutze dennoch mehrere Dateien und nutze das file:// Protokoll.

Der Code (HTML, CSS, JS) soll sehr gut objektorientiert strukturiert sein.

Manchmal gibt es keine gültige Tour - dann würde eine vollständige Suche durchgeführt. Das wollen wir nicht. Frag grundsätzlich alle 5 Sekunden nach, ob du noch weiter suchen sollst.

Wir wollen eine zusätzliche Ckeckbox haben, die nur geschlossene Touren produziert. Überleg dir ein intelligentes Verfahren! Du könntest z.B. abwechselnd an beiden Enden des Pfades anbauen. Wenn eine Tour geschlossen ist, dann trage in der grafischen Darstellung zusätzlich eine Linie vom letzten zum ersten Feld ein.

Analog wollen wir optional verlangen können, dass die Tour rotationssymmetrisch ist, sofern das Spielfeld quadratisch ist. Wenn du clever agierst, musst du nur ein Viertel der ganzen Wegstrecke prüfen.

Um die Performance zu verbessern, solltest du bei der Ermittlung der zulässigen nächsten Felder *nicht* x und y auf die Überschreitung der Board-Dimensionen überprüfen. Es ist deutlich besser, wenn du einen breiten Streifen mit vorab blockierten Feldern um das Board herum legst.

Das Einführen blockierter Felder erlaubt es uns auch, beliebige Formen als Spielfläche zu verwenden, in dem wir durch Mausklick (rechte Maus?) Felder manuell individuell blockieren bzw. wieder freigeben.

Neben der Warnsdorff Regel soll alternativ "brute force" und "outside in" als Heuristik anwählbar sein. DIe letztere Regel bevorzugt Felder mit möglichst großem euklidischen Abstand zum Zentrum der Spielfläche.

Es soll weiterhin (für DFS und für alle Heuristiken) die Möglichkeit geben, die Definitionsfreihenfolge der ZUgmöglichkeiten der Figur su durchmischen. Diese Reihenfolge spielt fast immer eine ergebliche Rolle. Im Tooltip su dem Button, über den man die Definitionsreihenfpoöge mischt, soll die aktuell gültiger Reihenfolge gezeigt werden.   

Zusätzlich zu dem Springer-Zug wollen wir mit anderen Zugarten experimentieren können. Wenn wir den Springer als (1,2) charakterisieren, dann sollen aucgh (1,4), (2,3) und (3,4) als "Figuren" angeboten werden.