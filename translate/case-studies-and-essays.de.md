Language: de

---

## `work/dither-studio/index.html`

**Dither Studio**

[h1] Dither Studio
[lede] Eine Dithering-Presse für Bilder und Videos, die vollständig auf dem Gerät läuft, auf dem sie geöffnet wird: kein Account, kein Upload, kein Build-Schritt.
[spec · Role] Eigenständiges Projekt
[spec · Stack] Vanilla JS, Canvas 2D
[spec · Status] Veröffentlicht, Web und Desktop
[alt] Der Dither Studio-Editor mit einem geditherten Kunstwerk auf dunkler Zeichenfläche sowie Steuerungen für Algorithmus, Palette und Effekte im linken Panel.
[caption] Der Editor im Ruhezustand: ein geordnetes Dithering auf der Zeichenfläche, mit Algorithmus, Palette und Effektstapel in der linken Leiste.

### Section 1 — "Die Aufgabe"
[h2] Die Aufgabe
[p] Dithering ist der Schritt zwischen einem Bild und der Maschine, die es druckt: erst die Palette reduzieren, dann entscheiden, welche Pixel welchen Tonwert behalten dürfen. Es ist der Look von Zeitungspapier, frühen Macintosh-Bildschirmen, Pixel Art und unzähligen Plattencovern. Die Werkzeuge dafür sind meist entweder ein Plug-in in einem größeren Bildbearbeitungsprogramm oder ein Web-Konverter, der die Datei hochlädt und ein JPEG zurückgibt.
[p] Dither Studio kehrt das um. Man öffnet einen Ordner, zieht ein Bild oder Video hinein, justiert das Ergebnis und exportiert. Nichts verlässt den Rechner, und das Dithering ist das eigentliche Produkt statt eines Effekts, der drei Menüs tief vergraben liegt.

### Section 2 — "Zwei Regeln, die alles geprägt haben"
[h2] Zwei Regeln, die alles geprägt haben
[li] Kein Build-Schritt. Die Web-Version startet direkt aus der `index.html`: einfache Skripte aus dem Ordner, kein Bundler, keine Framework-Runtime, die erst hochfahren muss, bevor das erste Pixel erscheint.
[li] Keine Laufzeitabhängigkeiten in den Web-Builds. Jeder Algorithmus, jede Palette und jeder Exportpfad ist Code im Ordner. Nichts bricht weg, weil ein Paket verschwindet. Die einzige Laufzeitabhängigkeit des Desktop-Builds ist Electron.
[p] Wegen dieser Regeln lässt sich die App einfach als Ordner weitergeben. Sie setzen aber auch die Obergrenze: Alles, was die App braucht, muss selbst geschrieben werden, nicht installiert.

### Section 3 — "Was tatsächlich drinsteckt"
[h2] Was tatsächlich drinsteckt
[li] 46 Dither-Algorithmen, von geordneten Mustern bis zur Fehlerdiffusion.
[li] 30 integrierte Farbsets sowie fünf installierbare Palettenpakete mit 25 weiteren Paletten.
[li] Ebenen pro Objekt im Desktop-Build, sodass Motiv und Hintergrund unterschiedlich gedithert werden können.
[li] Ein Stapel aus bis zu 25 Effekten, jeweils mit eigener Stärke und eigenem Modus.
[li] Textmodus, um ein Bild in ein Zeichenraster zu verwandeln.
[li] Video rein, WebM raus – mit demselben Effektstapel auf jedem einzelnen Frame.
[li] Exporte: PNG bis 8×, Textraster, WebM und ein JSON-Rezept der gesamten Einstellung.
[alt] Vier Dither Studio-Durchläufe desselben Porträts: radiales Leuchten, vertikales CRT-Halbtonraster, thermische Posterisierung und grobes warmes geordnetes Dithering.
[caption] Vier Durchläufe desselben Porträts – radiales Leuchten, vertikales CRT-Halbtonraster, thermische Posterisierung und grobes warmes geordnetes Dithering – erzeugt mit Algorithmus, Farbpalette und Effektstapel von Dither Studio.
[alt] 1:1-Ausschnittsvergleich dreier struktur sensitiver Raster auf demselben Foto: Matrix Rain, Ice Dot Field und Smooth Diffusion.
[caption] 1:1-Ausschnittsvergleich dreier struktursensitiver Raster auf demselben Foto – Matrix Rain, Ice Dot Field und Smooth Diffusion.

### Section 4 — "Drei Entscheidungen"
[h2] Drei Entscheidungen
[h3] Canvas 2D statt WebGL
[p] Die Engine ist reines JavaScript, das auf Pixelpuffern arbeitet: `process()` nimmt ein Quellbild und Einstellungen entgegen und gibt das geditherte Ergebnis als Daten zurück. Canvas 2D ist lediglich die Fläche, auf die gezeichnet wird – ein Canvas-Pixel pro Arbeitspixel mit `putImageData`, während der Zoom über CSS läuft, sodass ein Rendervorgang ein einziges Einfügen ist. Kein Shader, kein GPU-spezifischer Pfad. Genau deshalb läuft dieselbe Engine-Datei unverändert in der Web-Demo, im Launcher und in der Desktop-App.
[alt] Diagramm der Pixelpuffer-Pipeline von PREPARE (RGBA-Quelle, Tonwertanpassungen, Weichzeichnen/Schärfen, Downsampling) über PRESS (Dither und Tonemapping) bis FINISH (Effektstapel, Leuchten, Alpha, Nearest-Neighbour-Upscaling).
[caption] Die Pixelpuffer-Pipeline (PREPARE → PRESS → FINISH) innerhalb von `process()`, von der Tonwertvorbereitung und dem Downsampling über das Dithering bis zum Post-Effektstapel.
[h3] Ein Rezept ist eine Datei
[p] Die Einstellungen werden in ein einfaches JSON-Rezept serialisiert: Algorithmus, Palette, Ebenengeometrie und Effektstapel. Dadurch bleibt ein Ergebnis ohne Screenshots oder Notizen reproduzierbar, und der Zustand der App lässt sich in jedem Texteditor prüfen. Rezepte sind zugleich das, was in der App einem Preset-Format am nächsten kommt – es gibt keinen Account und keine Cloud-Bibliothek zum Synchronisieren.
[h3] Drei Builds, eine Engine
[p] Web-Demo, Launcher und Desktop-App teilen sich Engine, Beispieltabelle und Videotakt Byte für Byte, und ein Sync-Skript lässt den Build fehlschlagen, sobald eine Kopie abweicht. Die Hüllen sind getrennt: Die Demo ist auf den Browser zugeschnitten und bringt sechs Rezepte ohne Plug-ins oder eigenen Palettenimport mit, während die Desktop-App native Menüs und Dialoge, den vollständigen Katalog und das Tutorial ergänzt. Dieselbe Engine, unterschiedlich viel App drumherum.
[alt] Die Electron-Desktop-App von Dither Studio mit Bayer 8×8 auf einer 4-Farben-Game-Boy-Palette, nativen Anwendungsmenüs und dem Inspektionspanel mit 21 Rezepten.
[caption] Die Electron-Desktop-Hülle mit derselben Engine, nativen Menüs, Bayer 8×8 auf einem 4-Farben-Game-Boy-Farbset und dem 21-Rezepte-Inspektor.

### Section 5 — "Was rein lokal kostet"
[h2] Was rein lokal kostet
[p] Keine Synchronisation, keine geteilte Preset-Bibliothek, kein gemeinsames Bearbeiten. Das sind Funktionen, auf die ich bewusst verzichtet habe, aber umsonst ist das nicht: Jede einzelne davon muss von Hand erledigt werden, meist indem man eine Datei verschickt. Der Ausgleich ist, dass die App sofort startet, im Zug funktioniert und keine Arbeit durch eine abgelaufene Sitzung verlieren kann.
[p] Der Launch-Film war der beste Test für dieses Versprechen: 40 Sekunden in 1080p und 24 fps, direkt aus echten Engine-Exporten gerendert statt aus einem Mock-up. Hätte der Exportpfad ein schwaches Frame gehabt, wäre es im Film gelandet.

### Section 6 — "Ausprobieren"
[h2] Ausprobieren
[p] Die Web-App öffnet mit einem Beispielbild und ohne Anmeldung. Der Quellcode ist öffentlich, und der Launch-Film zeigt den gesamten Videopfad von Anfang bis Ende.
[p] Wie der geordnete Dither-Pass auf dieser Website funktioniert – 8×8 Bayer, zwölf Stufen, Blöcke von zwei CSS-Pixeln –, steht in Der Hero ist gedithert, nicht weichgezeichnet.

### Pager titles
[pager] Ausgewählte Arbeiten
[pager] Cortex

---

## `work/cortex/index.html`

**Cortex**

[h1] Cortex
[lede] Ein Local-first-Browser, der einen Ordner mit Markdown direkt an Ort und Stelle liest und sechs verschiedene Ansichten derselben Notizen zeigt. Keine Datenbank, kein Import, kein Account.
[spec · Role] Eigenständiges Projekt
[spec · Stack] Rust, axum, WebGL2
[spec · Status] Windows-Desktop-App, statische Web-Demo
[outcome] Ein Vault mit 500 Notizen und 5,000 Links.
[alt] Die Brain-Ansicht von Cortex mit einem 328-Notizen-Vault als 3D-Kortexoberfläche mit Ordnerclustern und Wikilink-Bahnen.
[caption] Die Brain-Ansicht: ein 328-Notizen-Vault, gefaltet zu einer Kortexoberfläche, mit Ordnern als Clustern und Wikilinks als Bahnen dazwischen.

### Section 1 — "Notizen wachsen über Ordner hinaus"
[h2] Notizen wachsen über Ordner hinaus
[p] Ein Vault aus einigen hundert Markdown-Dateien hat Struktur, aber nicht die Struktur, die der Ordnerbaum vermuten lässt. Notizen, die Monate auseinanderliegen, greifen ineinander; Ordner sind bloß der Ort, an dem sie zufällig abgelegt wurden. Die meisten Tools antworten darauf mit einer Suche oder mit einem Graphen, der entweder ein dekorativer Haarknäuel ist oder Teil eines kostenpflichtigen Cloud-Dienstes.
[p] Cortex wählt die dritte Option: den Ordner so lesen, wie er ist, die Links parsen und denselben Daten mehrere Formen geben. Nichts wird importiert und nichts kopiert. Löscht man die App, liegen die Notizen noch exakt dort, wo sie immer waren.

### Section 2 — "Direkt lesen, einmal aufbauen"
[h2] Direkt lesen, einmal aufbauen
[p] Cortex zeigt auf einen Vault und parst ihn direkt: Markdown-Dateien, Frontmatter, Wikilinks. Daraus entsteht ein einziges In-Memory-Modell für die Sitzung. Es gibt keine Datenbank zu migrieren und keinen Index neu aufzubauen – der Ordner selbst ist die Quelle der Wahrheit.
[p] Das Layout ist deterministisch. Derselbe Vault erzeugt dieselbe Karte, und das ist wichtiger, als es klingt: Eine Karte, die bei jedem Start neu würfelt, ist ein Bildschirmschoner, keine Hilfe, um sich zu merken, wo etwas liegt. Der Stresstest-Vault umfasst 5,523 Notizen in 41 Ordnern mit 24,151 Links.
[alt] Die Graph-Ansicht von Cortex mit dem 5,523-Notizen- und 24,151-Links-Vault über 41 Ordner, live gerendert in WebGL2.
[caption] Die Graph-Ansicht des Stresstest-Vaults mit 5,523 Notizen und 24,151 Links (41 Ordner), live gerendert in WebGL2.

### Section 3 — "Sechs Ansichten, ein Modell"
[h2] Sechs Ansichten, ein Modell
[p] Graph, Brain, Timeline, Atlas, Bento und Decisions sind Projektionen desselben geparsten Vaults, keine sechs getrennten Werkzeuge:
[li] Graph – was womit verlinkt ist, ohne dass der Ordnerbaum im Weg steht.
[li] Brain – der Vault als gefaltete Oberfläche, Ordner als Regionen.
[li] Timeline – wann die Notizen geschrieben wurden und was sich zeitlich ballt.
[li] Atlas – Ordner als Länder, Notizen als Orte, Links als Straßen auf einer Karte, die jedes Mal auf dieselbe Weise wächst.
[li] Bento – jeder Ordner als Kachel, skaliert nach seinem Anteil am Vault, mit den stärksten Notizen darin.
[li] Decisions – die Begründungsspur hinter einer Entscheidung, direkt neben der Entscheidung aufbewahrt.
[alt] Die Atlas-Ansicht von Cortex, die den 5,523-Notizen-Vault als kartografische Karte aus 41 beschrifteten Ordner-Ländern mit Verbindungsrouten darstellt.
[caption] Die Atlas-Ansicht desselben 5,523-Notizen-Vaults – Ordner deterministisch als 41 Länder angelegt, Notizen als Orte und Links als Routen.
[alt] Die Bento-Ansicht von Cortex, in der jeder Ordner proportional skaliert ist, mit Journal bei 20%, Research bei 3% und Systems bei 2% neben den wichtigsten Notizen.
[caption] Die Bento-Ansicht skaliert jeden Ordner proportional (Journal 20%, Research 3%, Systems 2%) und hebt die stärksten Notizen darin hervor.
[p] Die Decisions-Ansicht ist diejenige, die verändert, wie der Vault genutzt wird. Eine Notiz, die eine Entscheidung festhält, nützt nur etwas, wenn die Alternativen und die Begründung mit ihr überleben – und das ist zunächst ein Datenstrukturproblem, bevor es ein visuelles Problem ist.
[alt] Das Decisions-Board von Cortex neben einer geöffneten Entscheidungsdokumentation mit YAML-Frontmatter, die Status, Sicherheit, abgelöste Notizen und tragende Annahmen zeigt.
[caption] Das Decisions-Board neben einer geöffneten Entscheidungsdokumentation mit YAML-Frontmatter, einschließlich Status, Sicherheit, abgelösten Notizen und tragenden Annahmen.

### Section 4 — "Rust, WebGL2 und ein lokaler Server"
[h2] Rust, WebGL2 und ein lokaler Server
[p] Der Rust-Kern übernimmt die rechenintensive Arbeit: Scannen, Parsen, Linkauflösung und Layout. Ein axum-Server stellt das einer handgeschriebenen WebGL2-Oberfläche bereit, wodurch Tausende Knoten interaktiv bleiben statt ein starres Bild zu sein. Die App ist ein lokaler Server, der im Browser geöffnet wird, standardmäßig an Loopback gebunden, und der Windows-Build verpackt ihn in einen Installer.
[code] left as is
[p] Der GitHub-Pages-Build ist ein statischer Export eines vorbereiteten Vaults, sodass sich die Ansichten ohne Installation ausprobieren lassen.

### Section 5 — "Was rein lokal kostet"
[h2] Was rein lokal kostet
[p] Der Installer ist nur für Windows verfügbar, es gibt keine mobile App und keine Synchronisation zwischen Geräten: Diesen Job müssen iCloud, Dropbox, Syncthing oder git übernehmen. Das sind echte Grenzen. Sie sind aber auch der Grund, warum die App in einer Sekunde startet, nie nach einem Account fragt und ein Vault wie jeder andere Ordner verschoben, gesichert oder versioniert werden kann. Das größere Bild über alle vier Projekte hinweg steht in Einfache Dateien, keine Accounts.

### Section 6 — "Ausprobieren"
[h2] Ausprobieren
[p] Öffne die Live-Demo, um dich mit dem Beispiel-Vault durch die sechs Ansichten zu bewegen, oder lies den Quellcode.

### Pager titles
[pager] Dither Studio
[pager] W3Plan

---

## `work/w3plan/index.html`

**W3Plan**

[h1] W3Plan
[lede] Ein Lern- und Prüfungsplaner, der mit dem echten Klausurplan der Schule beginnt statt mit einer leeren Woche – gestartet als Basis-App zu dritt mit Yannis Raijmakers und Billie, danach von Yannis und mir weiterentwickelt für Schülerinnen und Schüler von Were Di Drie.
[spec · Role] Teamprojekt · Basis-App mit Yannis Raijmakers & Billie; fortgeführt von Yannis & mir
[spec · Stack] React 19, TypeScript, Electron
[spec · Status] Gebaut für Schülerinnen und Schüler von Were Di Drie
[outcome] Von 8+ Abschlussjahrgangs-Schülerinnen und -Schülern genutzt und von Lehrkräften gelobt.
[alt] Der Wochenkalender von W3Plan mit eingetragenen Schulklausuren, Fachbereichs-Lernblöcken und anstehenden Prüfungskarten in der linken Seitenleiste.
[caption] Eine Woche, in der die Schulklausuren bereits stehen: Fachbereichs-Lernblöcke im Kalender, dazu in der Seitenleiste die Prüfungen und wie viele Lernstunden schon eingeplant sind.

### Section 1 — "Allgemeine Planer fangen zu spät an"
[h2] Allgemeine Planer fangen zu spät an
[p] Eine Planer-App setzt voraus, dass man schon weiß, was zu tun ist. In der Schule kommt der schwierigste Teil früher: Der Prüfungsplan wird von der Schule veröffentlicht, die Lernstunden sollen auf Fächer verteilt werden, und beides liegt an verschiedenen Orten. Die meisten Schülerinnen und Schüler lösen das mit einem Papierkalender und einem Screenshot.
[p] W3Plan startet stattdessen bei den PTA-Daten der Schule und baut die Woche darum herum auf: Klausuren, Fachbereichsstunden, Checklisten pro Prüfung und Notenrechner an einem Ort.

### Section 2 — "Öffentliche Schuldaten, private Schülerdaten"
[h2] Öffentliche Schuldaten, private Schülerdaten
[p] Diese Trennung ist Absicht. PTA-Daten werden von der Schule veröffentlicht und deshalb als schreibgeschützter lokaler JSON-Datensatz mit der App ausgeliefert. Der eigene Plan einer Schülerin oder eines Schülers verlässt das Gerät nie und es gibt keine Schüler-Accounts – damit entfallen sowohl der Login-Ablauf als auch jeder Grund, Daten zentral zu speichern.
[p] Der Import umfasst 643 PTA-Bestandteile aus 29 Fächern, von denen 291 ein Datum tragen; eine separate SE-Übersicht ergänzt 133 Prüfungstermine. Klein genug, um es als schreibgeschützten Datensatz mitzuliefern, und groß genug, dass manuelles Eintippen nie realistisch war.
[alt] Die Periode-2-Übersicht von W3Plan über die Wochen 42 bis 49 mit einer wöchentlichen Belastungsanzeige über chronologischen PTA-Prüfungszeilen.
[caption] Periode-2-Übersicht (wk 42–wk 49), die einen wöchentlichen Auslastungsbalken (druk – volle Wochen) mit chronologischen PTA-Prüfungsterminen, Gewichtungen und Markierungen für den letzten Versuch verbindet.

### Section 3 — "Wie eine Woche aussieht"
[h2] Wie eine Woche aussieht
[li] Ein Wochenkalender mit Schulklausuren und Lernblöcken Seite an Seite.
[li] Fachbereichsstunden, damit Zeit nach Fächern statt nach Stimmung verteilt wird.
[li] Checklisten pro Prüfung für das, was tatsächlich gelernt werden muss.
[li] Notenrechner, denn die erste Frage nach einer Klausur ist, was sie am Durchschnitt ändert.
[alt] Das Prüfungsmodal von W3Plan für SE3 Straling, Quantum en Kern- en deeltjesprocessen (PTA 1605) mit Lernfortschritt sowie getrennten Doen- und Kennen-Checklisten.
[caption] Ein Arbeitsbereich pro Prüfung (SE3: Straling, Quantum en Kern- en deeltjesprocessen, PTA 1605) mit Fortschrittsanzeige und getrennten Doen- (Üben) und Kennen- (Theorie) Checklisten.
[alt] Der Tab Cijfers in W3Plan mit empfohlenen Nachprüfungen, sortiert danach, wie stark jeder Punkt den SE-Durchschnitt hebt, über dem gewichteten Zielnotenrechner.
[caption] Der Tab Cijfers ordnet empfohlene Nachprüfungen danach, wie stark jeder Punkt den SE-Durchschnitt hebt (+0,35 für Nederlands, +0,25 für Wiskunde B), über dem gewichteten Zielnotenrechner.

### Section 4 — "Zwei Entscheidungen"
[h2] Zwei Entscheidungen
[h3] Builds, die sich selbst aktualisieren
[p] Die Desktop-Builds aktualisieren sich automatisch und erscheinen als Windows-Installer sowie als DMG oder ZIP für macOS (die ZIP nutzt der Updater). Verteilung ist der unglamouröseste und anfälligste Teil einer Desktop-App: Installer, Update-Kanäle und zwei Plattformen, die auf unterschiedliche Weise scheitern. Zugleich ist es der Teil, der aus einem Projekt etwas macht, das Mitschülerinnen und Mitschüler wirklich nutzen können.
[p] Mehr dazu, warum die Verteilung der schwierige Teil war →
[h3] Eine Brücke, kein Autopilot
[p] W3Plan bringt eine lokale MCP-Brücke mit, damit ein Assistent die Woche lesen und Lernblöcke vorschlagen kann. Die Vorschläge landen im Kalender, wo man sie wie jeden anderen Eintrag prüfen kann – der Planer bleibt der Ort, an dem die Entscheidung getroffen wird.
[alt] Die Ansicht Vandaag in W3Plan mit gestrichelten Voorstel-Lernblockvorschlägen und Ein-Klick-Bestätigungsschaltflächen (Zet erin) neben aktuellen Lernthemen.
[caption] Die Ansicht Vandaag mit vorgeschlagenen Lernblöcken (Voorstel), die auf eine Ein-Klick-Freigabe (✓ Zet erin) warten, bevor sie in den Kalender übernommen werden.

### Section 5 — "Was es nicht kann"
[h2] Was es nicht kann
[p] Es gibt keinen Account und keine Synchronisation: Ein Plan lebt auf dem Gerät, auf dem die App läuft. Das ist der Preis dafür, Schülerdaten von Servern fernzuhalten – kein Login, keine Cloud-Kopie, nichts, das ablaufen kann –, bedeutet aber auch, dass die Woche nicht auf einen anderen Computer mitwandert.
[p] Der PTA-Datensatz stammt von Were Di Drie: 643 Bestandteile über 29 Fächer, schreibgeschützt im Build gebündelt. Eine andere Schule bedeutet einen anderen Datensatz, und ein neues Schuljahr bedeutet eine neue Version der App mit den aktuellen Daten.
[p] Die MCP-Brücke ist bewusst kein Autopilot. Sie kann die Woche lesen und Lernblöcke vorschlagen, sie aber nicht selbst in den Kalender eintragen; jeden einzelnen Block gibt weiterhin der Schüler oder die Schülerin frei.

### Section 6 — "Im Einsatz"
[h2] Im Einsatz
[p] W3Plan ist ein Teamprojekt. Billie, Yannis Raijmakers und ich haben die Basis-App zu dritt gebaut, und Yannis und ich haben sie für Oberstufenschülerinnen und -schüler an Were Di Drie weiterentwickelt – was hieß, dass das Datenmodell dem Kontakt mit einem echten Schulkalender standhalten musste, nicht nur mit einem Beispielplan.
[blockquote] „Das hat meinen gesamten Planungs-Workflow ersetzt, und es ist jetzt sogar noch einfacher.“
[caption] Yannis Raijmakers Mitentwickler
[blockquote] „Man merkt, dass das auf sechs Jahren Planen-Lernen aufbaut. Alles ist in einer App.“
[caption] Mathelehrkraft Were Di Drie

### Section 7 — "Ausprobieren"
[h2] Ausprobieren
[p] Sieh dir das Walkthrough an oder lade die Builds aus dem Installers-Repository herunter.

### Pager titles
[pager] Cortex
[pager] PapersPlease

---

## `work/papersplease/index.html`

**PapersPlease**

[h1] PapersPlease
[lede] Ein Literatur-Crawler, der fünf akademische APIs durchsucht, die Abstracts liest und jene Paper behält, die die Frage tatsächlich beantworten – für Menschen und für Coding-Agents.
[spec · Role] Eigenständiges Projekt
[spec · Stack] Python 3.10+, Standardbibliothek
[spec · Status] Open Source
[alt] Die Terminal-UI von PapersPlease mit sechs passenden Forschungsartikeln, Relevanzwerten, Open-Access- und Sci-Hub-Links sowie dem Abstract-Detailbereich.
[caption] Der Terminal-Browser: relevante Paper im Scope mit Relevanzwerten, Zugangslinks und dem Abstract dauerhaft im Blick während der Entscheidung.

### Section 1 — "Suchen ist kein Screening"
[h2] Suchen ist kein Screening
[p] Akademische Suchen sind gut darin, Paper zu finden, die dasselbe Vokabular wie die Suchanfrage teilen, aber schlecht darin zu verstehen, was die Anfrage meinte. Eine Suche nach Krafttraining bei älteren Erwachsenen liefert Arbeiten über Kraft bei Kindern, Arbeiten, in denen Kraft Ergebnis statt Intervention ist, und Reviews, die jene Studien zitieren, die man eigentlich wollte.
[p] PapersPlease ergänzt den Schritt, der sonst von Hand passiert: Titel und Abstract lesen, entscheiden, ob das Paper im Scope liegt, angrenzend oder irrelevant ist, und erst dann dem Link folgen.

### Section 2 — "Eine Pipeline, vier Oberflächen"
[h2] Eine Pipeline, vier Oberflächen
[p] Derselbe Kern steckt hinter vier Arten, das Werkzeug zu nutzen:
[li] Eine CLI für einzelne Suchanfragen, mit Flags für Anzahl und Interaktivität.
[li] Eine TUI, um durch Treffer und Abstracts zu navigieren, ohne das Terminal zu verlassen.
[li] Eine Python-Bibliothek, um die Pipeline in ein anderes Skript einzubinden.
[li] Ein MCP-Server, damit ein Coding-Agent Literatur per Tool-Aufruf durchsuchen kann.
[p] Vier Oberflächen sind eine Entwurfsbedingung: Die Screening-Logik darf weder in der Ausgabeformatierung der CLI noch in den Widgets der TUI stecken; sie liegt an einer Stelle, und jede Oberfläche zeigt dieselben Urteile.
[alt] Die Live-Terminal-Pipeline von PapersPlease mit eingehenden Kandidatenzahlen von epmc, crossref, openalex und arxiv vor dem Abstract-Screening.
[caption] Live-Fortschritt über die fünf Pipeline-Stufen, während epmc, crossref, openalex und arxiv Kandidaten vor dem Abstract-Screening liefern.

### Section 3 — "Lesen vor dem Herunterladen"
[h2] Lesen vor dem Herunterladen
[p] PapersPlease fragt Europe PMC, Crossref, arXiv, Semantic Scholar und OpenAlex ab und prüft anschließend Titel und Abstract jedes Kandidaten auf den Scope: Werden Population, Intervention und Ergebnis untersucht, nach denen gefragt wurde, und stimmt die kausale Richtung? Ergebnisse werden als im Scope, angrenzend oder verworfen gruppiert, jeweils mit Relevanzwert.
[p] Für die übrigen Paper löst es Open-Access-Links auf und prüft, ob ein Download tatsächlich eine PDF-Datei ist und keine Landingpage. Ein Link mit 404 ist schlimmer als gar kein Link, weil er dieselbe Aufmerksamkeit kostet und nichts zurückgibt.
[code] left as is
[alt] Ausgabe von papersplease explain mit erweiterten Synonymfacetten für unhealthy diet und type 1 diabetes, Abdeckungsschwelle und kausaler Richtung.
[caption] `papersplease explain` prüft den Offline-Scope-Vertrag – erweiterte Synonymfacetten, Abdeckungsgrenze (≥ 0.70) und kausale Richtung (unhealthy diet → type 1 diabetes).

### Section 4 — "Null Abhängigkeiten"
[h2] Null Abhängigkeiten
[p] Der Kern läuft auf der Python-Standardbibliothek: HTTP, JSON, die CLI und die Terminal-Oberfläche. Die einzige optionale Ergänzung ist die PDF-Textextraktion. Dadurch lässt sich das Werkzeug überall installieren, wo Python läuft – ohne Lockfile, das veraltet, und ohne transitive Überraschungen. Der Kompromiss ist real – HTTP-Retries, Terminal-Layout und Argument-Parsing sind selbst geschrieben statt importiert –, aber das Tool bleibt klein genug, um es an einem Nachmittag zu lesen.

### Section 5 — "Was es nicht kann"
[h2] Was es nicht kann
[p] Das ist eine Screening-Hilfe, kein systematisches Review. Abstracts lassen Methoden weg, übertreiben Befunde und irren manchmal; die Heuristik wird auch mal ein relevantes Paper aussortieren. Die Abdeckung beschränkt sich auf die fünf abgefragten Quellen, und das letzte Urteil bleibt das Lesen des Papers. Aufgabe des Werkzeugs ist es, diesen Stapel kleiner und besser beschriftet zu machen, nicht ihn zu ersetzen.
[alt] Vollständiger CLI-Scope-Bericht von PapersPlease, der Kandidaten in IN SCOPE, ADJACENT und REJECTED einteilt und Begründungen für fachliche Ausschlüsse zeigt.
[caption] Der vollständige CLI-Scope-Bericht trennt Kandidaten in IN SCOPE, ADJACENT und REJECTED – einschließlich fachlicher Ausschlüsse wie dem Herausfiltern von Herzhypertrophie bei einer Suche nach Muskelhypertrophie.
[p] Warum ein Werkzeug wie dieses nichts an einen Dienst schreibt und was das bringt und kostet, steht in Einfache Dateien, keine Accounts.

### Section 6 — "Ausprobieren"
[h2] Ausprobieren
[p] Im Repository finden sich die Installationszeile, die Nutzung von CLI und TUI sowie die MCP-Konfiguration.

### Pager titles
[pager] W3Plan
[pager] Wie der Hero gedithert wird

---

## `writing/school-planner-distribution/index.html`

**Ein Schulplaner ist ein Verteilungsproblem**

[crumb topic] Desktop · W3Plan
[kind] Essay
[h1] Ein Schulplaner ist ein Verteilungsproblem
[lede] Der Kalender ist der Teil, den man sieht. Was W3Plan nutzbar machte, waren die Daten der Schule, ein Installer, der sich selbst aktualisiert, und eine Grenze, die Schülerpläne auf dem Gerät hält.
[spec · Published] 27. Nov. 2026
[spec · Reading] 4 Minuten
[spec · Topics] Desktop, Verteilung
[spec · Project] W3Plan

### Section 1 — "Der Kalender ist der einfache Teil"
[h2] Der Kalender ist der einfache Teil
[p] Eine Planer-App setzt voraus, dass man schon weiß, was zu tun ist. In der Schule kommt die schwierigste Frage früher: Welche Klausuren stehen an, zu welchen Fächern gehören sie und wie viele Lernstunden verdient jede einzelne? Die Schule veröffentlicht einen Prüfungsplan, die Lernstunden sollen auf Fächer verteilt werden, und beides liegt an verschiedenen Orten. Die meisten Schülerinnen und Schüler lösen das mit einem Papierkalender und einem Screenshot.
[p] W3Plan startet stattdessen beim PTA-Export der Schule. Klausuren, Fachbereichsstunden, Checklisten pro Prüfung und Notenrechner sitzen alle in einem Kalender, weil der Kalender nun einmal die Form ist, die eine Woche hat. Die Oberfläche ist der sichtbare Teil. Es ist nicht der Teil, der am meisten Sorgfalt verlangte.

### Section 2 — "Der Import ist das Produkt"
[h2] Der Import ist das Produkt
[p] Der aktuelle Import umfasst 643 PTA-Bestandteile aus 29 Fächern. 291 davon tragen ein Datum; eine separate SE-Übersicht ergänzt 133 Prüfungstermine. Das ist zu viel zum Eintippen von Hand und klein genug, um es als schreibgeschützten Datensatz mitzuliefern. Die App lädt ihn direkt aus einem gebündelten lokalen JSON-Datensatz.
[p] Genau das ist der Unterschied zwischen einer Demo-Woche und einer echten. Sobald die Schulklausuren im Kalender stehen, hat ein Lernblock etwas, worauf er sich verteilen lässt. Ohne den Import ist der Planer ein hübscheres leeres Blatt; mit ihm kennt der erste Bildschirm die Woche bereits.

### Section 3 — "Die Datenschutzgrenze vereinfacht die Architektur"
[h2] Die Datenschutzgrenze vereinfacht die Architektur
[p] PTA-Daten werden von der Schule veröffentlicht und daher als öffentlich und schreibgeschützt behandelt. Der eigene Plan eines Schülers ist es nicht. Er bleibt auf dem Gerät, und es gibt keine Schüler-Accounts. Diese eine Entscheidung streicht Login-Ablauf, Sitzungsablauf, Passwort-Reset und jeden Grund, eine Kopie fremder Wochen auf einem Server vorzuhalten.
[p] Sie streicht auch eine Funktion: Es gibt keine Account-Synchronisation zwischen Geräten, der Plan lebt also auf dem Gerät, auf dem er erstellt wurde. Das ist ein realer Preis, aber einer, der sich in einem Satz erklären lässt. Ein Planer für eine Schulwoche braucht kein mandantenfähiges Backend, um nützlich zu sein.

### Section 4 — "Verteilung ist das Feature"
[h2] Verteilung ist das Feature
[p] Die Desktop-Builds aktualisieren sich selbst. Sie erscheinen als Windows-Installer sowie als DMG oder ZIP auf macOS; die ZIP nutzt der Updater. Installieren und Aktualisieren erwiesen sich als der unglamouröseste und anfälligste Teil der App: zwei Plattformen, zwei Sätze an Fehlerbildern und keine Möglichkeit, ein kaputtes Release einfach auf einem Server zu korrigieren.
[p] Ein Web-Build vermeidet Installer, hebt aber die Datengrenze nicht auf: Der Plan muss trotzdem auf dem Gerät bleiben, statt zu einer Server-Sitzung zu werden. Der Desktop-Build ist die Version, die einen Klassenraum-Laptop erreicht und ihre Dateien dort behält. Der Preis ist, dass die Verteilung selbst zum Produkt wird.

### Section 5 — "Acht Schülerinnen und Schüler sind ein echter Test"
[h2] Acht Schülerinnen und Schüler sind ein echter Test
[p] W3Plan wurde für Oberstufenschülerinnen und -schüler an Were Di Drie gebaut. Es wird von 8+ Abschlussjahrgangs-Schülerinnen und -Schülern genutzt und von Lehrkräften gelobt. Das ist kein Massenmarkt, aber genug, um die Stellen zu prüfen, die eine Beispielwoche nie berührt: ein echter PTA-Export, eine echte Klausurphase und ein echter Mensch, der entscheidet, ob er dem Plan vertraut.
[p] Das Projekt ist Teamarbeit. Billie, Yannis Raijmakers und ich haben die erste Basis-App gemeinsam gebaut, und Yannis und ich haben sie für die Schule weiterentwickelt. Die Aufteilung war weniger wichtig als die gemeinsame Bedingung: Das Datenmodell musste den Kontakt mit einem echten Schulkalender überstehen.

### Section 6 — "Was noch fehlt"
[h2] Was noch fehlt
[p] Es gibt keine mobile App, keine Account-Synchronisation, und der Import ist von den Daten einer einzigen Schule geprägt. Das sind dieselben Grenzen wie bei der Local-first-Entscheidung, nur von der anderen Seite betrachtet. Eine weitere Schule aufzunehmen hieße, einen anderen Export abzubilden, nicht eine weitere Ansicht in den Kalender zu bauen.
[p] Das ist die Lehre, die sich lohnt zu behalten: Bei einem Werkzeug rund um eine Institution sollte man mit den Daten und der Installation beginnen. Der Kalender ist das Letzte, was man poliert, nicht das Erste. W3Plan ist dann am besten, wenn die Schuldaten schon da sind und man nur noch entscheiden muss, was man mit der Woche macht.

### Pager titles
[pager] Einfache Dateien, keine Accounts
[pager] Der Hero ist gedithert, nicht weichgezeichnet

---

## `writing/dithering-the-hero/index.html`

**Der Hero ist gedithert, nicht weichgezeichnet**

[crumb topic] Rendering
[kind] Essay
[h1] Der Hero ist gedithert, nicht weichgezeichnet
[lede] Die Szene auf der Startseite ist ein normaler Three.js-Render, der anschließend mit einem 8×8-Bayer-Muster auf zwölf Stufen pro Kanal quantisiert wird. Dieser eine Pass macht den größten Teil des Looks aus.
[spec · Published] 27. Nov. 2026
[spec · Reading] 8 Minuten
[spec · Topics] GLSL, Rendering, Three.js
[spec · Source] GitHub ↗
[alt] Die Startseite um Mitternacht: ein geditherter Himmel mit Vollmond, ein Laptop auf einem Schreibtisch am Wasser und der Name Thijn Köhne in großer weißer Schrift.
[caption] Mitternacht auf der Startseite. Am Himmel ist das Dithering am deutlichsten zu sehen: Ein Verlauf, der normalerweise Stufen bilden würde, bricht stattdessen in ein Muster auf.

### Section 1 — "Warum überhaupt dithern"
[h2] Warum überhaupt dithern
[p] Ein weicher Farbverlauf gehört zu den schwierigsten Dingen auf einem 8-Bit-Display. Geht man langsam genug durch einen Himmel, reihen sich die Rundungsfehler zu sichtbaren Bändern auf. Die übliche Lösung ist Rauschen, das Banding gegen Körnung eintauscht.
[p] Dithering geht diesen Tausch absichtlich ein. Man reduziert die Palette auf eine bewusst kleine Zahl von Stufen und entscheidet dann anhand von Helligkeit und Schwellenmuster, welche Stufe jedes Pixel bekommt. Aus der Ferne mittelt das Auge das Muster wieder zu einem Tonwert; aus der Nähe ist es eine Textur. Diese Textur ist der Sinn der Sache, kein Nebeneffekt.
[p] Der Hero nutzt zwölf Stufen. Wenig genug, damit das Muster sichtbar bleibt, und genug, damit Haut, Holz und Wasser weiterhin als solche erkennbar sind.

### Section 2 — "Bayer, ganz ohne Nachschlagetabelle"
[h2] Bayer, ganz ohne Nachschlagetabelle
[p] Geordnetes Dithering nutzt eine feste Schwellenmatrix: ein 8×8-Raster aus Werten, das sich über den Bildschirm wiederholt. Üblicherweise speichert man 64 Zahlen in einem Array oder einer Textur. Der Shader baut dasselbe Muster stattdessen rekursiv auf, aus einer einzigen Zwei-mal-zwei-Funktion:
[code] left as is
[p] Jeder Schritt halbiert die Koordinate, wertet das kleinere Muster aus und faltet es mit einem Viertel Gewicht wieder ein. Das Ergebnis ist ein Schwellenfeld mit 64 Werten im Bereich 0–1, erzeugt aus wenigen Instruktionen und ohne Speicher. Zieht man 0.5 ab, entsteht der vorzeichenbehaftete Versatz, den der Quantisierer braucht.
[p] Das Muster ist der Grund, warum das Ergebnis wie Druckgrafik wirkt statt wie Fernsehrauschen. Rauschen ändert sich pro Pixel und pro Frame; Bayer wiederholt sich, sodass das Auge Halt findet und das Bild ruhig bleibt, selbst wenn sich die Kamera bewegt.

### Section 3 — "Ein Pass, nach dem Tonemapping"
[h2] Ein Pass, nach dem Tonemapping
[p] Die Szene wird normal gerendert, per Tonemapping angepasst und durch einen `OutputPass` in den Darstellungsfarbraum überführt; erst danach übernimmt der Dither-Pass, sodass die Stufen im Darstellungsraum quantisiert werden statt im linearen Raum, in dem die Szene beleuchtet wurde.
[p] Der Pass tastet nicht jedes Pixel einzeln ab. Er rastet zuerst auf einen Block ein und liest dann die Mitte dieses Blocks:
[code] left as is
[p] Dieses Detail zählt. Würde jedes Pixel seine eigene Farbe abtasten und dann quantisieren, läge das Muster über dem voll aufgelösten Bild und Kanten würden zu Brei. Indem zuerst die Blockmitte abgetastet wird, teilt sich der gesamte Block eine Eingabefarbe, sodass das Dither-Raster selbst zur Auflösung des Bildes wird. Es ist ein bewusster Verzicht auf räumliches Detail zugunsten einer stabilen, scharfen Textur.

### Section 4 — "Das Raster ist zwei CSS-Pixel breit"
[h2] Das Raster ist zwei CSS-Pixel breit
[p] Die Blockgröße wird in Gerätepixeln gesetzt und mit der Device Pixel Ratio skaliert, weil auch `gl_FragCoord` in Gerätepixeln misst. Ohne diese Skalierung würde derselbe Shader auf einem Retina-Display ein halb so breites Raster erzeugen und das Dithering fast verschwinden.
[p] Das vom Renderer genutzte Pixelverhältnis ist bei 1.5 gedeckelt, und der Block liegt bei `2.0 × dpr` (2.2 auf schmalen Bildschirmen). So bleibt das Raster auf dem Smartphone, dem Laptop und dem 4K-Monitor ungefähr zwei CSS-Pixel breit.

### Section 5 — "Die Palette bewegt sich mit der Szene"
[h2] Die Palette bewegt sich mit der Szene
[p] Dithering ist nur die halbe Optik. Die andere Hälfte ist, dass die zwölf Stufen keine festen Farben sind: Die Atmosphäre der Szene wird über vier Keyframes abgetastet – Tageslicht bei 0, goldene Abenddämmerung bei 0.46, Zwielicht bei 0.66, Mitternacht bei 1 – und jede Farbe der Szene wird per Smoothstep dazwischen interpoliert.
[p] Derselbe Skalar steuert die Seite. Ein eigenes Paar aus heller und dunkler Palette wird auf der CPU abgetastet und in CSS Custom Properties geschrieben, sodass Papier, Tinte und Akzentfarbe der Abschnitte unterhalb des Hero mit dem Himmel mitwandern. Auch Favicon und Browser-Themefarbe ändern sich mit. Eine Zahl, ein Licht.
[p] Deshalb lässt sich auch der Regler ziehen, statt ein Theme umzuschalten. Es gibt keinen diskreten Dark Mode zum Aktivieren: Es gibt eine Tageszeit, und alles tastet sie ab.

### Section 6 — "Was es kostet"
[h2] Was es kostet
[p] Der Post-Pass ist günstig; die Szene nicht. Eine komplette Three.js-Szene mit eigener Wellenfläche, Partikeln und Composer ist viel Arbeit für einen Hintergrund. Deshalb wird das Modul erst im Leerlauf geladen statt im ersten Payload, der Renderer pausiert, sobald der Hero aus dem Sichtfeld scrollt oder der Tab verborgen ist, und Besucher mit Save-Data erhalten stattdessen einen statischen Hintergrund. Bei `prefers-reduced-motion` bleibt die Uhr stehen: kein Driften, kein Einblenden, keine Wellen, aber das Dithering bleibt.
[p] Ein Anti-Flimmer-Detail, das sich zu merken lohnt: Die Papierkörnung nach der Quantisierung wird aus der Blockkoordinate gehasht, nicht aus der Zeit. Rauschen pro Frame auf einem statischen Muster funkelt; Rauschen pro Block wirkt wie Papierstruktur.

### Section 7 — "Nachlesen"
[h2] Nachlesen
[p] Der Pass liegt in `src/hero/dither.js`, die Palette in `src/hero/atmosphere.js` und die Reihenfolge der Passes in `src/hero/HeroScene.js`. Der Quellcode der Website liegt auf GitHub.

### Pager titles
[pager] Ein Schulplaner ist ein Verteilungsproblem
[pager] Einfache Dateien, keine Accounts

---

## `writing/plain-files/index.html`

**Einfache Dateien, keine Accounts**

[crumb topic] Local-first
[kind] Essay
[h1] Einfache Dateien, keine Accounts
[lede] Vier Projekte, eine Regel: Die Daten gehören in einen Ordner, den man prüfen, verschieben und sichern kann, ohne einen Server um Erlaubnis zu fragen.
[spec · Published] 27. Nov. 2026
[spec · Reading] 7 Minuten
[spec · Topics] Local-first, Dateiformate
[spec · Projects] Vier

### Section 1 — "Der Standard ist der Computer von jemand anderem"
[h2] Der Standard ist der Computer von jemand anderem
[p] Die meiste Software setzt heute einen Account voraus. Notizen, Bilder, Pläne und Recherchen leben in einem Dienst, in einem Format, das dieser Dienst bestimmt, erreichbar solange der Dienst erreichbar ist. Das ist ein gutes Geschäft für die Synchronisation und ein schlechtes für alles andere: Das Werkzeug kann verschwinden, das Format sich ändern, der Preis steigen, und die Daten lassen sich ohne die App, die sie geschrieben hat, nicht öffnen.
[p] Die vier Projekte auf dieser Seite zeigen in die andere Richtung. Nicht weil die Cloud böse wäre, sondern weil die lokale Version für genau diese Werkzeuge einfacher, schneller und leichter vertrauenswürdig ist. Die Datei ist die Oberfläche.

### Section 2 — "Wie das in der Praxis aussieht"
[h2] Wie das in der Praxis aussieht
[li] Der Web-Build von Dither Studio öffnet direkt aus seinem eigenen Ordner, ohne Build-Schritt und ohne Laufzeitabhängigkeiten. Ein fertiges Bild wird als PNG, Text, WebM oder JSON-Rezept exportiert; das Rezept ist das gesamte Setup, lesbar in jedem Editor.
[li] Cortex liest einen Markdown-Vault dort, wo er bereits liegt. Es gibt keinen Import, keine Datenbank und keine Kopie. Wird die App gelöscht, bleiben die Notizen unberührt.
[li] W3Plan hält den Plan einer Schülerin oder eines Schülers auf dem Gerät. Die PTA-Daten der Schule werden als schreibgeschützter JSON-Datensatz mitgeliefert, getrennt vom eigenen Plan.
[li] PapersPlease schreibt überhaupt nichts an einen Dienst. Es fragt öffentliche APIs ab, verlinkt Open-Access-Paper und überlässt das Lesen dir.

### Section 3 — "Was das einbringt"
[h2] Was das einbringt
[p] Es geht einfach auf. Keine Sitzungsprüfung, kein Ladezustand, kein „Wenden Sie sich an Ihren Administrator“. Ein Ordner mit statischen Dateien ist die schnellste Art App, die es gibt.
[p] Es funktioniert offline. Im Zug, im Keller, in einem Schulnetz, das alles blockiert. Dem Werkzeug ist das egal, weil nichts Wesentliches auf einem entfernten Server liegt.
[p] Die Dateien überleben die App. Markdown, PNG, WebM und JSON bleiben ohne diese Codebasis lesbar. Das ist der eigentliche Exit-Plan: keine Datenexport-Funktion, sondern Daten, die nie exportiert werden mussten.
[p] Backups sind langweilig. Ein Ordner lässt sich kopieren, zippen, in git legen oder auf einen USB-Stick ziehen. Es gibt keinen Wiederherstellungsablauf zu testen und keine Account-Wiederherstellung zu verlieren.
[p] Es gibt kein Berechtigungsmodell. Keine Freigabeeinstellungen, keine Rollen, kein Link, der versehentlich öffentlich ist. Zugriff ist schlicht das, was das Dateisystem sagt.

### Section 4 — "Was es kostet"
[h2] Was es kostet
[p] Keine Synchronisation. Zwei Geräte bedeuten zwei Kopien, und sie zusammenzuführen ist Sache des Nutzers. Das ist der größte Preis und derjenige, der manche Produkte vollständig ausschließt.
[p] Keine Zusammenarbeit. Zwei Menschen, die gleichzeitig dieselbe Datei bearbeiten, sind ein hartes Problem, und „leg es in einen geteilten Ordner“ ist keine Lösung. Ein Werkzeug, das Echtzeit-Zusammenarbeit braucht, braucht einen Server; etwas anderes vorzugeben verschiebt nur den Konflikt.
[p] Die Backups liegen bei dir. Local-first bedeutet, dass auch der Fehlerfall lokal ist. Ein gelöschter Ordner ist weg, sofern man selbst keine Kopie angelegt hat.
[p] Verteilung ist dein Problem. Installer, Updates und Code-Signing sind die unglamouröse Steuer auf Desktop-Software. W3Plan liefert automatisch aktualisierende Builds für Windows und macOS, und diese Maschinerie verlangte mehr Sorgfalt als so manches Feature.
[p] Lokale Rechenleistung hat eine Obergrenze. Alles, was ein großes Modell oder viel CPU braucht, ist ohne Server schwerer – und manchmal lokal schlicht nicht sinnvoll.

### Section 5 — "Wo die Cloud ihren Platz verdient"
[h2] Wo die Cloud ihren Platz verdient
[p] W3Plan ist ein sauberes Beispiel für diese Grenze. Der PTA-Kalender der Schule besteht aus veröffentlichten Daten, die alle Schülerinnen und Schüler brauchen und niemand verändern darf. Ihn als schreibgeschützten JSON-Datensatz auszuliefern – getrennt vom eigenen Plan und aktualisiert, sobald die Schule einen neuen Export veröffentlicht – hält die Trennung klar, weil die Daten einen Eigentümer und eine Richtung haben: von der Schule veröffentlicht, von der App gelesen, nie zurückgeschrieben.
[p] Das ist eine brauchbare Faustregel. Daten, die eine Person selbst erstellt, bleiben lokal. Daten, die eine Institution veröffentlicht, können abgerufen werden. Daten, die zwei Menschen gleichzeitig bearbeiten müssen, brauchen ein echtes Synchronisationsmodell – und das Produkt sollte das offen sagen, statt so zu tun, als wäre ein Ordner eines.

### Section 6 — "Der Test"
[h2] Der Test
[p] Eine einfache Frage entscheidet die meisten dieser Fälle: Wenn der Dienst morgen verschwände, was hätte der Nutzer noch? Lautet die Antwort „einen Ordner mit Dateien, die sich überall öffnen lassen“, stimmt das Design wahrscheinlich. Lautet die Antwort „einen Anmeldebildschirm“, lohnt sich die Frage, was der Account eigentlich bringt.
[p] Die Projekte sind über den Arbeitsbereich verlinkt; jedes hat eine ausführlichere Beschreibung, einschließlich der Stellen, an denen Local-first die schwierigere Wahl war.

### Pager titles
[pager] Der Hero ist gedithert, nicht weichgezeichnet
[pager] Ein Schulplaner ist ein Verteilungsproblem