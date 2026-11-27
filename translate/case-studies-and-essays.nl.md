Language: nl

---

## `work/dither-studio/index.html`

**Dither Studio**

[h1] Dither Studio
[lede] Een ditherpers voor afbeeldingen en video die volledig draait op de machine waarop je hem opent: geen account, geen upload, geen build-stap.
[spec · Role] Onafhankelijk project
[spec · Stack] Vanilla JS, Canvas 2D
[spec · Status] Uitgebracht, web en desktop
[alt] De Dither Studio-editor met een geditherd kunstwerk op een donker canvas en bedieningselementen voor algoritme, palet en effecten in het linkerpaneel.
[caption] De editor in rust: een geordende dither op het canvas, met het algoritme, het palet en de effectenstapel in de linkerkolom.

### Section 1 — "De opdracht"
[h2] De opdracht
[p] Dithering is de stap tussen een afbeelding en de machine die hem afdrukt: eerst het palet verkleinen, dan beslissen welke pixels welke tint mogen houden. Het is de uitstraling van krantenpapier, vroege Macintosh-schermen, pixel art en talloze platenhoezen. De tools die dit doen zijn meestal óf een plug-in in een groter bewerkingsprogramma, óf een webconverter die je bestand uploadt en een JPEG teruggeeft.
[p] Dither Studio draait dat om. Je opent een map, sleept er een afbeelding of video in, stelt het resultaat bij en exporteert. Niets verlaat de machine, en de dither is het product zelf in plaats van een effect weggestopt achter drie menu's.

### Section 2 — "Twee regels die alles bepaalden"
[h2] Twee regels die alles bepaalden
[li] Geen build-stap. De webversie opent direct vanuit `index.html`: gewone scripts uit de map, geen bundler, geen framework-runtime die eerst moet opstarten voordat de eerste pixel verschijnt.
[li] Geen runtime-afhankelijkheden in de webversies. Elk algoritme, palet en exportpad is code in de map zelf. Er gaat niets stuk omdat een pakket verdwijnt. De enige runtime-afhankelijkheid van de desktopversie is Electron.
[p] Dankzij die regels kun je de app gewoon als map doorgeven. Ze bepalen ook het plafond: alles wat de app nodig heeft, moet zelf geschreven worden, niet geïnstalleerd.

### Section 3 — "Wat er daadwerkelijk in zit"
[h2] Wat er daadwerkelijk in zit
[li] 46 ditheralgoritmes, van geordende patronen tot foutdiffusie.
[li] 30 ingebouwde inktsets, plus vijf installeerbare paletpakketten die 25 extra paletten toevoegen.
[li] Lagen per object in de desktopversie, zodat onderwerp en achtergrond elk anders geditherd kunnen worden.
[li] Een stapel van maximaal 25 effecten, elk met eigen sterkte en modus.
[li] Tekstmodus, om een afbeelding om te zetten in een raster van tekens.
[li] Video erin, WebM eruit, met dezelfde stapel toegepast op elk frame.
[li] Exports: PNG tot 8×, tekstrasters, WebM en een JSON-recept van de hele opstelling.
[alt] Vier Dither Studio-bewerkingen van hetzelfde portret: radiale gloed, verticale CRT-halftoon, thermische posterisatie en grove warme geordende dither.
[caption] Vier bewerkingen van hetzelfde portret — radiale gloed, verticale CRT-halftoon, thermische posterisatie en grove warme geordende dither — gemaakt met het algoritme, het inktpalet en de effectenstapel van Dither Studio.
[alt] 1:1-uitsnedevergelijking van drie structuurbewuste rasters op dezelfde foto: Matrix Rain, Ice Dot Field en Smooth Diffusion.
[caption] 1:1-uitsnedevergelijking van drie structuurbewuste rasters op dezelfde foto — Matrix Rain, Ice Dot Field en Smooth Diffusion.

### Section 4 — "Drie keuzes"
[h2] Drie keuzes
[h3] Canvas 2D, geen WebGL
[p] De engine is gewone JavaScript die op pixelbuffers werkt: `process()` neemt een bronafbeelding en instellingen aan en geeft het geditherde resultaat als data terug. Canvas 2D is alleen het oppervlak waarop dat getekend wordt — één canvaspixel per werkpixel, met `putImageData`, en zoomen via CSS zodat een render één enkele plakbewerking is. Geen shaders, geen GPU-specifiek pad. Daardoor draait precies hetzelfde engine-bestand ongewijzigd in de webdemo, de launcher en de desktop-app.
[alt] Diagram van de pixelbuffer-pijplijn van PREPARE (RGBA-bron, tooncorrecties, vervagen/verscherpen, downsampling) via PRESS (dither en tonemap) naar FINISH (effectenstapel, gloed, alpha, nearest-neighbour-upscaling).
[caption] De pixelbuffer-pijplijn (PREPARE → PRESS → FINISH) binnen `process()`, van toonvoorbereiding en downsampling tot dithering en de nabewerkingseffecten.
[h3] Een recept is een bestand
[p] De instellingen worden geserialiseerd naar een gewoon JSON-recept: algoritme, palet, laaggeometrie en de effectenstapel. Daardoor is een resultaat reproduceerbaar zonder schermafbeeldingen of notities, en kun je de status van de app gewoon in een teksteditor bekijken. Recepten zijn ook het dichtste dat de app bij een presetformaat komt — er is geen account of cloudbibliotheek om ze mee te synchroniseren.
[h3] Drie builds, één engine
[p] De webdemo, de launcher en de desktop-app delen de engine, de voorbeeldtabel en de videoklok byte voor byte, en een sync-script laat de build falen als een kopie afwijkt. De schillen zijn gescheiden: de demo is afgestemd op de browser en bevat zes recepten zonder plug-ins of import van eigen paletten, terwijl de desktop-app native menu's en dialoogvensters, de volledige catalogus en de handleiding toevoegt. Dezelfde engine, met een andere hoeveelheid app eromheen.
[alt] De Electron-desktop-app van Dither Studio met Bayer 8×8 op een 4-kleuren Game Boy-palet, inclusief native applicatiemenu's en het inspectiepaneel met 21 recepten.
[caption] De Electron-desktopschil die dezelfde engine draait met native menu's, Bayer 8×8 op een 4-kleuren Game Boy-inktset en de inspector met 21 recepten.

### Section 5 — "Wat lokaal werken kost"
[h2] Wat lokaal werken kost
[p] Geen synchronisatie, geen gedeelde presetbibliotheek, niet samen bewerken. Dat zijn functies waar ik bewust niet voor gekozen heb, maar gratis zijn ze niet: stuk voor stuk zijn het dingen die een gebruiker zelf moet doen, meestal door een bestand door te sturen. Daar staat tegenover dat de app direct opent, in de trein werkt en je werk nooit kan kwijtraken door een verlopen sessie.
[p] De lanceringsfilm was de beste test voor die belofte: 40 seconden op 1080p en 24 fps, direct gerenderd uit echte engine-exports in plaats van een mock-up. Als het exportpad een zwak frame had gehad, had dat in de film gezeten.

### Section 6 — "Probeer het"
[h2] Probeer het
[p] De webapp opent met een voorbeeldafbeelding en zonder inloggen. De broncode is openbaar en de lanceringsfilm laat het hele videopad van begin tot eind zien.
[p] Lees De hero is geditherd, niet vervaagd voor hoe de geordende dither-pass op deze site werkt — 8×8 Bayer, twaalf niveaus, blokken van twee CSS-pixels.

### Pager titles
[pager] Geselecteerd werk
[pager] Cortex

---

## `work/cortex/index.html`

**Cortex**

[h1] Cortex
[lede] Een local-first browser die een map met Markdown ter plekke leest en zes verschillende weergaven van dezelfde notities toont. Geen database, geen import, geen account.
[spec · Role] Onafhankelijk project
[spec · Stack] Rust, axum, WebGL2
[spec · Status] Windows-desktop-app, statische webdemo
[outcome] Een kluis van 500 notities met 5,000 links.
[alt] De Brain-weergave van Cortex met een kluis van 328 notities weergegeven als een 3D-hersenschors met mapclusters en wikilink-banen.
[caption] De Brain-weergave: een kluis van 328 notities gevouwen tot een hersenschors, met mappen als clusters en wikilinks als banen ertussen.

### Section 1 — "Notities ontgroeien mappen"
[h2] Notities ontgroeien mappen
[p] Een kluis met een paar honderd Markdown-bestanden heeft structuur, maar niet de structuur die de mappenboom doet vermoeden. Notities die maanden uit elkaar zijn geschreven raken met elkaar verbonden; mappen zijn alleen maar de plek waar ze toevallig zijn opgeslagen. De meeste tools lossen dit op met een zoekfunctie, of met een graaf die óf een decoratieve haarbal is óf een betaalde cloudfunctie.
[p] Cortex kiest de derde optie: lees de map zoals hij is, parse de links en geef dezelfde data meerdere vormen. Er wordt niets geïmporteerd en niets gekopieerd. Als je de app verwijdert, staan je notities nog precies waar ze stonden.

### Section 2 — "Ter plekke lezen, één keer opbouwen"
[h2] Ter plekke lezen, één keer opbouwen
[p] Cortex wijst naar een kluis en parset die rechtstreeks: Markdown-bestanden, frontmatter, wikilinks. Dat vormt één in-memory model voor de sessie. Er is geen database om te migreren en geen index om opnieuw op te bouwen — de map is de bron van waarheid.
[p] De lay-out is deterministisch. Dezelfde kluis levert dezelfde kaart op, en dat is belangrijker dan het klinkt: een kaart die bij elke start opnieuw schudt is een screensaver, geen manier om te onthouden waar iets ligt. De stresstest-kluis bevat 5,523 notities verspreid over 41 mappen, met 24,151 links.
[alt] De Graph-weergave van Cortex met de kluis van 5,523 notities en 24,151 links over 41 mappen, live gerenderd in WebGL2.
[caption] De Graph-weergave van de stresstest-kluis met 5,523 notities en 24,151 links (41 mappen), live gerenderd in WebGL2.

### Section 3 — "Zes weergaven, één model"
[h2] Zes weergaven, één model
[p] Graph, brain, timeline, atlas, bento en decisions zijn projecties van dezelfde geparste kluis, geen zes losse tools:
[li] Graph — wat waarnaar linkt, zonder de mappenboom in de weg.
[li] Brain — de kluis als een gevouwen oppervlak, met mappen als regio's.
[li] Timeline — wanneer de notities zijn geschreven en wat zich in de tijd groepeert.
[li] Atlas — mappen als landen, notities als plaatsen, links als wegen, op een kaart die elke keer op dezelfde manier groeit.
[li] Bento — elke map als een vak, geschaald naar het aandeel in de kluis, met de sterkste notities erin.
[li] Decisions — het redeneerspoor achter een keuze, bewaard naast de keuze zelf.
[alt] De Atlas-weergave van Cortex waarin de kluis van 5,523 notities wordt getekend als een landkaart met 41 gelabelde maplanden verbonden door routes.
[caption] De Atlas-weergave van dezelfde kluis van 5,523 notities — mappen deterministisch neergelegd als 41 landen, notities als plaatsen en links als routes.
[alt] De Bento-weergave van Cortex waarin elke map naar verhouding is geschaald, met Journal op 20%, Research op 3% en Systems op 2% naast de belangrijkste notities.
[caption] De Bento-weergave die elke map naar verhouding schaalt (Journal 20%, Research 3%, Systems 2%) en de sterkste notities naar voren haalt.
[p] De decisions-weergave is de weergave die verandert hoe je de kluis gebruikt. Een notitie die een besluit vastlegt is alleen nuttig als de alternatieven en de reden mee bewaard blijven, en dat is eerst een datastructuurprobleem voordat het een visueel probleem is.
[alt] Het Decisions-bord van Cortex naast een geopend beslisspoor met YAML-frontmatter dat status, vertrouwen, vervangen notities en dragende aannames toont.
[caption] Het Decisions-bord naast een geopend beslisspoor met YAML-frontmatter, met status, vertrouwen, vervangen notities en dragende aannames.

### Section 4 — "Rust, WebGL2 en een lokale server"
[h2] Rust, WebGL2 en een lokale server
[p] De Rust-kern doet het zware werk: scannen, parsen, links oplossen en de lay-out berekenen. Een axum-server stelt dat beschikbaar aan een handgeschreven WebGL2-interface, waardoor duizenden knooppunten interactief blijven in plaats van een statisch plaatje. De app is een lokale server die opent in je browser, standaard gebonden aan loopback, en de Windows-build verpakt het geheel in een installer.
[code] left as is
[p] De GitHub Pages-build is een statische export van een gevulde voorbeeldkluis, zodat je de weergaven kunt uitproberen zonder iets te installeren.

### Section 5 — "Wat lokaal werken kost"
[h2] Wat lokaal werken kost
[p] De installer is alleen voor Windows, er is geen mobiele app en er is geen synchronisatie tussen machines: daarvoor heb je iCloud, Dropbox, Syncthing of git nodig. Dat zijn echte beperkingen. Het is ook de reden dat de app binnen een seconde opent, nooit om een account vraagt en dat een kluis verplaatst, geback-upt of geversioneerd kan worden zoals elke andere map. Het bredere verhaal, over alle vier de projecten heen, staat in Platte bestanden, geen accounts.

### Section 6 — "Probeer het"
[h2] Probeer het
[p] Open de live demo om met de voorbeeldkluis door de zes weergaven te bewegen, of bekijk de broncode.

### Pager titles
[pager] Dither Studio
[pager] W3Plan

---

## `work/w3plan/index.html`

**W3Plan**

[h1] W3Plan
[lede] Een studie- en toetsplanner die begint vanuit het echte toetsrooster van de school in plaats van een lege week — gestart als basisapp door ons drieën met Yannis Raijmakers en Billie, en daarna verder ontwikkeld door Yannis en mij voor leerlingen van Were Di Drie.
[spec · Role] Teamproject · basisapp gebouwd met Yannis Raijmakers & Billie; voortgezet door Yannis & mij
[spec · Stack] React 19, TypeScript, Electron
[spec · Status] Gebouwd voor leerlingen van Were Di Drie
[outcome] Gebruikt door 8+ examenleerlingen en geprezen door docenten.
[alt] De weekkalender van W3Plan met ingeplande schooltoetsen, domeinstudieblokken en aankomende toetskaarten in de linkerzijbalk.
[caption] Een week waarop de schooltoetsen al staan: domeinstudieblokken in de kalender, en in de zijbalk de toetsen en hoeveel studie-uren er al zijn ingepland.

### Section 1 — "Algemene planners beginnen te laat"
[h2] Algemene planners beginnen te laat
[p] Een planner-app gaat ervan uit dat je al weet wat er moet gebeuren. Op school zit het lastigste stuk daarvoor: het toetsrooster wordt door de school gepubliceerd, de studie-uren moeten over vakken worden verdeeld, en die twee staan op verschillende plekken. De meeste leerlingen lossen dat op met een papieren agenda en een screenshot.
[p] W3Plan begint bij de PTA-data van de school en bouwt de week daaromheen: toetsen, domeinuren, checklists per toets en cijfercalculators op één plek.

### Section 2 — "Openbare schooldata, persoonlijke leerlingdata"
[h2] Openbare schooldata, persoonlijke leerlingdata
[p] Die scheiding is bewust. PTA-data wordt door de school gepubliceerd en zit daarom als alleen-lezen lokale JSON-dataset bij de app inbegrepen. De eigen planning van een leerling verlaat het apparaat nooit en er zijn geen leerlingaccounts, wat zowel de inlogflow als elke reden om gegevens centraal op te slaan overbodig maakt.
[p] De import omvat 643 PTA-onderdelen over 29 vakken, waarvan 291 met een datum; een apart SE-overzicht voegt nog eens 133 toetsmomenten toe. Klein genoeg om als alleen-lezen dataset mee te leveren, en groot genoeg dat handmatig overtypen nooit realistisch was.
[alt] Het Periode 2-overzicht van W3Plan van week 42 tot en met 49 met een wekelijkse drukte-indicator boven chronologische PTA-toetsrijen.
[caption] Periode 2-overzicht (wk 42–wk 49) dat een wekelijkse druktebalk (druk) combineert met chronologische PTA-toetsmomenten, wegingen en laatste kans-markeringen.

### Section 3 — "Hoe een week eruitziet"
[h2] Hoe een week eruitziet
[li] Een weekkalender met schooltoetsen en studieblokken naast elkaar.
[li] Domeinuren, zodat tijd over vakken wordt verdeeld in plaats van op gevoel.
[li] Checklists per toets voor wat er daadwerkelijk geleerd moet worden.
[li] Cijfercalculators, want de eerste vraag na een toets is wat het met je gemiddelde doet.
[alt] De toetsmodal van W3Plan voor SE3 Straling, Quantum en Kern- en deeltjesprocessen (PTA 1605) met studievoortgang en gesplitste Doen- en Kennen-checklists.
[caption] Een werkruimte per toets (SE3: Straling, Quantum en Kern- en deeltjesprocessen, PTA 1605) met voortgangsregistratie en gesplitste Doen- (oefenen) en Kennen- (theorie) checklists.
[alt] Het tabblad Cijfers van W3Plan met aanbevolen herkansingen gerangschikt op hoeveel elk punt het SE-gemiddelde verhoogt, boven de gewogen streefcijfercalculator.
[caption] Het tabblad Cijfers dat aanbevolen herkansingen rangschikt op hoeveel elk punt het SE-gemiddelde verhoogt (+0,35 voor Nederlands, +0,25 voor Wiskunde B), boven de gewogen streefcijfercalculator.

### Section 4 — "Twee keuzes"
[h2] Twee keuzes
[h3] Builds die zichzelf bijwerken
[p] De desktopbuilds updaten automatisch en worden geleverd als Windows-installer en als DMG of ZIP op macOS (de ZIP wordt door de updater gebruikt). Distributie is het minst glamoureuze en meest kwetsbare deel van een desktop-app: installers, updatekanalen en twee platformen die elk op hun eigen manier stukgaan. Het is ook het deel dat van een project iets maakt wat klasgenoten echt kunnen gebruiken.
[p] Meer over waarom distributie het lastigste deel was →
[h3] Een brug, geen automatische piloot
[p] W3Plan bevat een lokale MCP-brug zodat een assistent de week kan lezen en studieblokken kan voorstellen. De voorstellen verschijnen in de kalender, waar een leerling ze net als elke andere afspraak kan beoordelen — de planner blijft de plek waar de beslissing valt.
[alt] De weergave Vandaag van W3Plan met gestippelde Voorstel-studieblokken en knoppen voor bevestiging met één klik (Zet erin) naast actuele studieonderwerpen.
[caption] De weergave Vandaag met voorgestelde studieblokken (Voorstel) die wachten op goedkeuring met één klik (✓ Zet erin) voordat ze in de kalender komen.

### Section 5 — "Wat het niet kan"
[h2] Wat het niet kan
[p] Er is geen account en geen synchronisatie: een planning leeft op de machine waarop de app draait. Dat is de ruil om leerlinggegevens van een server te houden — geen login, geen cloudkopie, niets dat kan verlopen — maar het betekent ook dat de week niet meereist naar een andere computer.
[p] De PTA-dataset is die van Were Di Drie: 643 onderdelen over 29 vakken, alleen-lezen meegebundeld met de build. Een andere school betekent een andere dataset, en een nieuw schooljaar betekent een nieuwe build met de bijgewerkte gegevens.
[p] De MCP-brug is bewust geen automatische piloot. Hij kan de week lezen en studieblokken voorstellen, maar ze niet zelf in de kalender zetten; een leerling keurt elk blok nog altijd zelf goed.

### Section 6 — "In gebruik"
[h2] In gebruik
[p] W3Plan is een teamproject. Billie, Yannis Raijmakers en ik bouwden samen als drietal de basisapp, en Yannis en ik ontwikkelden die verder voor bovenbouwleerlingen van Were Di Drie — wat betekende dat het datamodel bestand moest zijn tegen een echt schoolrooster in plaats van een voorbeeldrooster.
[blockquote] “Dit heeft mijn hele planningsworkflow vervangen, en het is nu nog makkelijker.”
[caption] Yannis Raijmakers Medemaker
[blockquote] “Je merkt dat dit gebouwd is op zes jaar leren plannen. Het zit allemaal in één app.”
[caption] Docent wiskunde Were Di Drie

### Section 7 — "Probeer het"
[h2] Probeer het
[p] Bekijk de walkthrough of haal de builds uit de installers-repository.

### Pager titles
[pager] Cortex
[pager] PapersPlease

---

## `work/papersplease/index.html`

**PapersPlease**

[h1] PapersPlease
[lede] Een literatuurcrawler die vijf academische API's doorzoekt, de abstracts leest en de artikelen bewaart die de vraag daadwerkelijk beantwoorden — voor mensen én voor coding agents.
[spec · Role] Onafhankelijk project
[spec · Stack] Python 3.10+, standaardbibliotheek
[spec · Status] Open source
[alt] De terminal-UI van PapersPlease met zes relevante onderzoeksartikelen, relevantiescores, open-access- en Sci-Hub-links en het detailpaneel met het abstract.
[caption] De terminalbrowser: artikelen binnen scope met relevantiescores, toegangslinks en het abstract steeds in beeld tijdens het beoordelen.

### Section 1 — "Zoeken is geen screenen"
[h2] Zoeken is geen screenen
[p] Academische zoekmachines zijn goed in het vinden van artikelen die dezelfde woorden gebruiken als je zoekopdracht, maar slecht in begrijpen wat je bedoelde. Een zoekopdracht naar krachttraining bij ouderen levert onderzoek op naar spierkracht bij kinderen, onderzoek waarbij kracht een uitkomst is in plaats van een interventie, en overzichtsartikelen die de studies citeren die je eigenlijk zocht.
[p] PapersPlease voegt de stap toe die normaal met de hand gebeurt: titel en abstract lezen, bepalen of het artikel binnen scope valt, aangrenzend is of irrelevant, en pas daarna de link volgen.

### Section 2 — "Eén pijplijn, vier interfaces"
[h2] Eén pijplijn, vier interfaces
[p] Dezelfde kern zit achter vier manieren om de tool te gebruiken:
[li] Een CLI voor één enkele zoekopdracht, met vlaggen voor aantallen en interactiviteit.
[li] Een TUI om door resultaten en abstracts te bladeren zonder de terminal te verlaten.
[li] Een Python-bibliotheek om de pijplijn in een ander script op te nemen.
[li] Een MCP-server zodat een coding agent literatuur kan doorzoeken als tool-aanroep.
[p] Vier interfaces is een ontwerpbeperking: de screeninglogica kan niet in de uitvoeropmaak van de CLI of in de widgets van de TUI wonen, dus staat die op één plek en geeft elke interface exact hetzelfde oordeel weer.
[alt] De live terminalpijplijn van PapersPlease met binnenkomende kandidaataantallen uit epmc, crossref, openalex en arxiv vóór het screenen van de abstracts.
[caption] Live voortgang over de vijf pijplijnstadia terwijl epmc, crossref, openalex en arxiv kandidaten teruggeven vóór de abstract-screening.

### Section 3 — "Lezen vóór downloaden"
[h2] Lezen vóór downloaden
[p] PapersPlease bevraagt Europe PMC, Crossref, arXiv, Semantic Scholar en OpenAlex, en screent vervolgens de titel en het abstract van elke kandidaat op scope: onderzoekt het de populatie, interventie en uitkomst waar de vraag over ging, en klopt de causale richting? Resultaten worden ingedeeld als binnen scope, aangrenzend of afgewezen, voorzien van een relevantiescore.
[p] Voor de artikelen die overblijven zoekt het open-access-links op en controleert het of een download ook echt een PDF is in plaats van een landingspagina. Een link die een 404 geeft is erger dan geen link, want hij kost evenveel aandacht en levert niets op.
[code] left as is
[alt] Uitvoer van papersplease explain met uitgebreide synoniemfacetten voor unhealthy diet en type 1 diabetes, dekkingsdrempel en causale richting.
[caption] `papersplease explain` inspecteert het offline scope-contract — uitgebreide synoniemfacetten, dekkingsgrens (≥ 0.70) en causale richting (unhealthy diet → type 1 diabetes).

### Section 4 — "Nul afhankelijkheden"
[h2] Nul afhankelijkheden
[p] De kern draait op de standaardbibliotheek van Python: HTTP, JSON, de CLI en de terminalinterface. De enige optionele uitbreiding is tekstextractie uit PDF's. Daardoor is de tool overal te installeren waar Python staat, zonder lockfile die veroudert en zonder transitieve verrassingen. De afweging is reëel — HTTP-retries, terminallay-out en argumentparsing zijn zelf geschreven in plaats van geïmporteerd — maar de tool blijft klein genoeg om in één middag door te lezen.

### Section 5 — "Wat het niet kan"
[h2] Wat het niet kan
[p] Dit is een hulpmiddel bij het screenen, geen systematische review. Abstracts laten methodes weg, overdrijven resultaten en zitten er soms naast; de heuristiek zal weleens een relevant artikel in de afgewezen groep plaatsen. De dekking blijft beperkt tot de vijf bronnen die worden bevraagd, en het eindoordeel is nog altijd zelf het artikel lezen. De taak van de tool is om die stapel kleiner en beter gelabeld te maken, niet om hem te vervangen.
[alt] Volledig CLI-scoperapport van PapersPlease dat kandidaten indeelt in IN SCOPE, ADJACENT en REJECTED met toelichtingen voor domeinspecifieke uitsluitingen.
[caption] Het volledige CLI-scoperapport dat kandidaten scheidt in IN SCOPE, ADJACENT en REJECTED — inclusief domeinspecifieke afwijzingen zoals het wegfilteren van harthypertrofie bij een zoekopdracht naar spierhypertrofie.
[p] Waarom een tool als deze niets naar een dienst schrijft, en wat dat oplevert en kost, lees je in Platte bestanden, geen accounts.

### Section 6 — "Probeer het"
[h2] Probeer het
[p] In de repository staan de installatieregel, het gebruik van de CLI en TUI en de MCP-configuratie.

### Pager titles
[pager] W3Plan
[pager] Hoe de hero wordt geditherd

---

## `writing/school-planner-distribution/index.html`

**Een schoolplanner is een distributieprobleem**

[crumb topic] Desktop · W3Plan
[kind] Essay
[h1] Een schoolplanner is een distributieprobleem
[lede] De kalender is het stuk dat je ziet. Wat W3Plan bruikbaar maakte waren de gegevens van de school, een installer die zichzelf bijwerkt en een grens die leerlingplanningen op het apparaat houdt.
[spec · Published] 27 nov 2026
[spec · Reading] 4 minuten
[spec · Topics] Desktop, distributie
[spec · Project] W3Plan

### Section 1 — "De kalender is het makkelijke deel"
[h2] De kalender is het makkelijke deel
[p] Een planner-app gaat ervan uit dat je al weet wat er moet gebeuren. Op school komt de moeilijkste vraag eerder: welke toetsen komen eraan, bij welke vakken horen ze en hoeveel studie-uren verdient elk vak? De school publiceert een toetsrooster, de studie-uren moeten over vakken worden verdeeld, en die twee staan op verschillende plekken. De meeste leerlingen lossen dat op met een papieren agenda en een screenshot.
[p] W3Plan vertrekt in plaats daarvan vanuit de PTA-export van de school. Toetsen, domeinuren, checklists per toets en cijfercalculators staan allemaal op één kalender, omdat de kalender nu eenmaal de vorm is die een week heeft. De interface is het zichtbare deel. Het is niet het deel waar de meeste zorg in ging zitten.

### Section 2 — "De import is het product"
[h2] De import is het product
[p] De huidige import omvat 643 PTA-onderdelen over 29 vakken. Daarvan hebben er 291 een datum; een apart SE-overzicht voegt nog 133 toetsmomenten toe. Dat is te veel om met de hand in te voeren en klein genoeg om als alleen-lezen dataset mee te leveren. De app laadt die rechtstreeks vanuit een meegebundelde lokale JSON-dataset.
[p] Dat is het verschil tussen een demoweek en een echte week. Zodra de schooltoetsen op de kalender staan, heeft een studieblok iets om over te verdelen. Zonder de import is de planner een mooiere lege bladzijde; mét import kent het eerste scherm de week al.

### Section 3 — "De privacygrens vereenvoudigt de architectuur"
[h2] De privacygrens vereenvoudigt de architectuur
[p] PTA-data wordt door de school gepubliceerd en dus behandeld als openbaar en alleen-lezen. De eigen planning van een leerling is dat niet. Die blijft op het apparaat, en er zijn geen leerlingaccounts. Die ene keuze schrapt de inlogflow, sessieverloop, wachtwoordherstel en elke reden om een kopie van iemands week op een server te bewaren.
[p] Het schrapt ook een functie: er is geen accountsynchronisatie tussen apparaten, dus de planning blijft op het apparaat waarop hij is gemaakt. Dat is een echte prijs, maar wel het soort prijs dat je in één zin kunt uitleggen. Een planner voor een schoolweek heeft geen multi-tenant backend nodig om nuttig te zijn.

### Section 4 — "Distributie is de functie"
[h2] Distributie is de functie
[p] De desktopbuilds updaten zichzelf. Ze worden geleverd als Windows-installer en als DMG of ZIP op macOS; de ZIP is wat de updater gebruikt. Installeren en bijwerken bleken het minst glamoureuze en meest kwetsbare deel van de app: twee platformen, twee reeksen manieren waarop iets mis kan gaan, en geen mogelijkheid om een slechte release op te lossen door iets op een server aan te passen.
[p] Een webversie vermijdt installers, maar neemt de datagrens niet weg: de planning moet nog steeds op het apparaat blijven in plaats van een serversessie te worden. De desktopbuild is de versie die een klaslokaallaptop bereikt en zijn bestanden daar houdt. De prijs is dat distributie zelf het product wordt.

### Section 5 — "Acht leerlingen is een echte test"
[h2] Acht leerlingen is een echte test
[p] W3Plan is gebouwd voor bovenbouwleerlingen van Were Di Drie. De app wordt gebruikt door 8+ examenleerlingen en is geprezen door docenten. Dat is geen massamarkt, maar genoeg om de onderdelen te testen die een voorbeeldweek nooit raakt: een echte PTA-export, een echte toetsweek en een echte leerling die bepaalt of de planning te vertrouwen is.
[p] Het project is teamwerk. Billie, Yannis Raijmakers en ik bouwden samen de eerste basisapp, en Yannis en ik ontwikkelden hem verder voor de school. De taakverdeling deed er minder toe dan de gezamenlijke voorwaarde: het datamodel moest overleven zodra het een echt schoolrooster tegenkwam.

### Section 6 — "Wat er nog ontbreekt"
[h2] Wat er nog ontbreekt
[p] Er is geen mobiele app, geen accountsynchronisatie en de import is gevormd naar de data van één school. Dat zijn dezelfde grenzen als de local-first-keuze, maar dan vanaf de andere kant bekeken. Een andere school toevoegen zou betekenen dat je een andere export in kaart brengt, niet dat je nog een extra weergave aan de kalender toevoegt.
[p] Dat is de les die het waard is om te onthouden: begin bij een tool rond een instelling met de data en de installatie. De kalender is het laatste dat je oppoetst, niet het eerste. W3Plan is op zijn best wanneer de schooldata er al staat en de leerling alleen nog hoeft te beslissen wat er met de week gebeurt.

### Pager titles
[pager] Platte bestanden, geen accounts
[pager] De hero is geditherd, niet vervaagd

---

## `writing/dithering-the-hero/index.html`

**De hero is geditherd, niet vervaagd**

[crumb topic] Rendering
[kind] Essay
[h1] De hero is geditherd, niet vervaagd
[lede] De scène op de homepagina is een gewone Three.js-render die daarna per kanaal wordt gekwantiseerd naar twaalf niveaus met een 8×8 Bayer-patroon. Die ene pass bepaalt het grootste deel van de uitstraling.
[spec · Published] 27 nov 2026
[spec · Reading] 8 minuten
[spec · Topics] GLSL, rendering, Three.js
[spec · Source] GitHub ↗
[alt] De homepagina om middernacht: een geditherde hemel met een volle maan, een laptop op een bureau aan het water en de naam Thijn Köhne in grote witte letters.
[caption] Middernacht op de homepagina. In de lucht is de dither het duidelijkst te zien: een verloop dat normaal strepen zou vertonen wordt in plaats daarvan opgebroken in een patroon.

### Section 1 — "Waarom überhaupt ditheren"
[h2] Waarom überhaupt ditheren
[p] Een vloeiend kleurverloop is een van de moeilijkste dingen om op een 8-bit scherm weer te geven. Loop langzaam genoeg door een lucht en de afrondingsfouten vormen zichtbare banden. De gebruikelijke oplossing is ruis toevoegen, waarmee je banding inruilt voor korrel.
[p] Dithering maakt die ruil met opzet. Breng het palet terug tot een bewust klein aantal niveaus en kies vervolgens welk niveau elke pixel krijgt op basis van zijn helderheid en een drempelpatroon. Van een afstand middelt het oog het patroon weer tot een tint; van dichtbij is het een textuur. Die textuur is het doel, geen bijwerking.
[p] De hero gebruikt twaalf niveaus. Weinig genoeg om het patroon zichtbaar te houden, genoeg om huid, hout en water nog als zichzelf te laten lezen.

### Section 2 — "Bayer, zonder opzoektabel"
[h2] Bayer, zonder opzoektabel
[p] Geordende dithering gebruikt een vaste matrix van drempelwaarden: een 8×8-raster van getallen dat zich over het scherm herhaalt. De gebruikelijke implementatie slaat 64 getallen op in een array of een textuur. De shader bouwt ditzelfde patroon in plaats daarvan recursief op, vanuit één twee-bij-twee-functie:
[code] left as is
[p] Elke stap halveert de coördinaat, evalueert het kleinere patroon en vouwt het met een kwart van het gewicht terug. Het resultaat is een drempelveld van 64 waarden tussen 0 en 1, opgebouwd uit een paar instructies en zonder geheugen. Door 0.5 af te trekken krijg je de positieve of negatieve verschuiving die de kwantiseerder nodig heeft.
[p] Het patroon is de reden dat het resultaat oogt als drukwerk in plaats van televisieruis. Ruis verschilt per pixel en per frame; Bayer herhaalt zich, waardoor het oog houvast krijgt en het beeld stil blijft staan, zelfs als de camera beweegt.

### Section 3 — "Eén pass, na de tone map"
[h2] Eén pass, na de tone map
[p] De scène wordt normaal gerenderd, getone-mapped en door een `OutputPass` naar weergaveruimte omgezet, en pas daarna aan de dither-pass doorgegeven. Zo worden de niveaus gekwantificeerd in weergaveruimte in plaats van in de lineaire ruimte waarin de scène is belicht.
[p] De pass bemonstert niet elke pixel afzonderlijk. Hij klikt eerst vast op een blok en bemonstert daarna het midden van dat blok:
[code] left as is
[p] Dat detail telt. Als elke pixel zijn eigen kleur zou bemonsteren en daarna kwantiseren, zou het patroon bovenop het volledige resolutiebeeld liggen en zouden randen veranderen in brij. Door eerst het blokmidden te bemonsteren deelt het hele blok één invoerkleur, zodat het ditherraster zelf de resolutie van het beeld wordt. Het is een bewuste inlevering van ruimtelijk detail om een stabiele, scherpe textuur te winnen.

### Section 4 — "Het raster is twee CSS-pixels breed"
[h2] Het raster is twee CSS-pixels breed
[p] De blokgrootte wordt ingesteld in apparaatpixels en geschaald met de device pixel ratio, omdat `gl_FragCoord` ook in apparaatpixels wordt gemeten. Zonder die schaling zou dezelfde shader op een retinascherm een half zo breed raster opleveren en zou de dither bijna verdwijnen.
[p] De pixelratio van de renderer is begrensd op 1.5, en het blok staat op `2.0 × dpr` (2.2 op smalle schermen). Zo blijft het raster ruwweg twee CSS-pixels breed op een telefoon, een laptop en een 4K-monitor.

### Section 5 — "Het palet beweegt mee met de scène"
[h2] Het palet beweegt mee met de scène
[p] Dithering is maar de helft van de uitstraling. De andere helft is dat de twaalf niveaus geen vaste kleuren zijn: de atmosfeer van de scène wordt gesampled over vier keyframes — daglicht op 0, gouden schemering op 0.46, avondschemering op 0.66, middernacht op 1 — en elke kleur in de scène wordt daartussen geïnterpoleerd met een smoothstep.
[p] Dezelfde scalar stuurt de pagina aan. Een apart paar lichte en donkere paletten wordt op de CPU gesampled en naar CSS custom properties geschreven, zodat het papier, de inkt en de accentkleur van de secties onder de hero meebewegen met de lucht. Ook het favicon en de themakleur van de browser veranderen mee. Eén getal, één licht.
[p] Dat is ook waarom je aan de knop kunt draaien in plaats van een thema om te schakelen. Er is geen aparte donkere modus om aan te zetten: er is een tijdstip op de dag, en alles bemonstert dat tijdstip.

### Section 6 — "Wat het kost"
[h2] Wat het kost
[p] De nabewerkingspass is goedkoop; de scène niet. Een volledige Three.js-scène met een eigen rimpelvlak, deeltjes en een composer is veel werk voor een achtergrond. Daarom wordt de module pas geladen wanneer de browser rust heeft in plaats van in de eerste payload, pauzeert de renderer zodra de hero uit beeld scrolt of het tabblad verborgen is, en krijgen bezoekers met Save-Data een statische achtergrond. Met `prefers-reduced-motion` stopt de klok: geen drift, geen intrede, geen rimpelingen, maar de dither blijft.
[p] Eén anti-flikkerdetail dat de moeite waard is om te onthouden: de papierkorrel die na het kwantiseren wordt toegevoegd wordt gehasht op basis van de blokcoördinaat, niet op basis van tijd. Ruis per frame op een statisch patroon gaat vonken; ruis per blok voelt als de vezel van papier.

### Section 7 — "Lees de code"
[h2] Lees de code
[p] De pass staat in `src/hero/dither.js`, het palet in `src/hero/atmosphere.js` en de volgorde van de passes in `src/hero/HeroScene.js`. De broncode van de site staat op GitHub.

### Pager titles
[pager] Een schoolplanner is een distributieprobleem
[pager] Platte bestanden, geen accounts

---

## `writing/plain-files/index.html`

**Platte bestanden, geen accounts**

[crumb topic] Local-first
[kind] Essay
[h1] Platte bestanden, geen accounts
[lede] Vier projecten, één regel: de data hoort in een map die de gebruiker kan inzien, verplaatsen en back-uppen zonder een server om toestemming te vragen.
[spec · Published] 27 nov 2026
[spec · Reading] 7 minuten
[spec · Topics] Local-first, bestandsformaten
[spec · Projects] Vier

### Section 1 — "De standaard is de computer van iemand anders"
[h2] De standaard is de computer van iemand anders
[p] De meeste software gaat tegenwoordig uit van een account. Notities, afbeeldingen, planningen en onderzoek leven in een dienst, in een formaat dat die dienst bepaalt, bereikbaar zolang de dienst bereikbaar is. Dat is een goede deal voor synchronisatie en een slechte voor al het andere: de tool kan verdwijnen, het formaat kan veranderen, de prijs kan stijgen en de data gaat niet open zonder de app die haar schreef.
[p] De vier projecten op deze site wijzen de andere kant op. Niet omdat de cloud slecht is, maar omdat de lokale versie voor precies deze tools eenvoudiger, sneller en makkelijker te vertrouwen is. Het bestand is de interface.

### Section 2 — "Hoe dat er in de praktijk uitziet"
[h2] Hoe dat er in de praktijk uitziet
[li] De webversie van Dither Studio opent vanuit zijn eigen map, zonder build-stap en zonder runtime-afhankelijkheden. Een afgewerkt beeld exporteert als PNG, tekst, WebM of een JSON-recept; dat recept is de hele opstelling, leesbaar in elke editor.
[li] Cortex leest een kluis met Markdown op de plek waar die al staat. Er is geen import, geen database en geen kopie. Als de app wordt verwijderd, blijven de notities onaangeraakt.
[li] W3Plan houdt de planning van een leerling op het apparaat. De PTA-data van de school wordt meegeleverd als alleen-lezen JSON-dataset, los van het eigen rooster van de leerling.
[li] PapersPlease schrijft überhaupt niets naar een dienst. Het bevraagt openbare API's, linkt naar open-access-artikelen en laat het lezen aan jou.

### Section 3 — "Wat het oplevert"
[h2] Wat het oplevert
[p] Het gaat open. Geen sessiecontrole, geen laadscherm, geen "neem contact op met je beheerder". Een map met statische bestanden is de snelste soort app die er bestaat.
[p] Het werkt offline. In de trein, in een kelder, op een schoolnetwerk dat alles blokkeert. De tool merkt er niets van, omdat niets essentieels op afstand staat.
[p] De bestanden overleven de app. Markdown, PNG, WebM en JSON blijven leesbaar zonder deze codebase. Dat is het echte exitplan: geen data-exportfunctie, maar data die nooit geëxporteerd hoefde te worden.
[p] Back-ups zijn saai. Een map kun je kopiëren, zippen, in git zetten of op een USB-stick slepen. Er is geen herstelflow om te testen en geen accountherstel om kwijt te raken.
[p] Er is geen rechtenmodel. Geen deelinstellingen, geen rollen, geen link die per ongeluk openbaar staat. Toegang is simpelweg wat het bestandssysteem zegt dat het is.

### Section 4 — "Wat het kost"
[h2] Wat het kost
[p] Geen synchronisatie. Twee machines betekent twee kopieën, en die samenvoegen is het probleem van de gebruiker. Dit is de grootste prijs en degene die sommige producten volledig uitsluit.
[p] Niet samenwerken. Twee mensen die tegelijk hetzelfde bestand bewerken is een lastig probleem, en "zet het in een gedeelde map" is geen oplossing. Een tool die realtime samenwerking nodig heeft, heeft een server nodig; doen alsof dat niet zo is verschuift alleen het conflict.
[p] Je bent zelf eigenaar van je back-ups. Local-first betekent dat het ook lokaal misgaat. Een verwijderde map is weg, tenzij iemand zelf een kopie maakte.
[p] Distributie komt op jouw bord. Installers, updates en code signing zijn de ondankbare belasting op desktopsoftware. W3Plan levert automatisch bijwerkende builds voor Windows en macOS, en dat mechanisme vroeg meer zorg dan sommige functies.
[p] Lokale rekenkracht heeft een plafond. Alles wat een groot model of veel CPU vraagt is lastiger zonder server, en soms simpelweg niet de moeite waard om lokaal te doen.

### Section 5 — "Waar de cloud zijn plek verdient"
[h2] Waar de cloud zijn plek verdient
[p] W3Plan is een helder voorbeeld van die grens. Het PTA-rooster van de school is gepubliceerde data die elke leerling nodig heeft en die geen enkele leerling mag aanpassen. Door het mee te leveren als alleen-lezen JSON-dataset — gescheiden van de eigen planning van de leerling en bijgewerkt zodra de school een nieuwe export publiceert — blijft de scheiding scherp omdat de data een eigenaar en een richting heeft: gepubliceerd door de school, gelezen door de app, nooit teruggeschreven.
[p] Dat is een bruikbare vuistregel. Data die iemand zelf maakt blijft lokaal. Data die een instelling publiceert kan worden opgehaald. Data die twee mensen tegelijk moeten bewerken heeft een echt synchronisatiemodel nodig, en het product moet dat eerlijk zeggen in plaats van te doen alsof een map dat is.

### Section 6 — "De test"
[h2] De test
[p] Eén simpele vraag beslist de meeste van deze gevallen: als de dienst morgen verdween, wat heeft de gebruiker dan nog? Als het antwoord "een map met bestanden die overal in opengaan" is, klopt het ontwerp waarschijnlijk. Als het antwoord "een inlogscherm" is, is het de moeite waard om je af te vragen wat dat account nu eigenlijk oplevert.
[p] De projecten zijn gelinkt vanuit de sectie werk; elk project heeft een uitgebreider verhaal, inclusief de plekken waar local-first de moeilijkere keuze was.

### Pager titles
[pager] De hero is geditherd, niet vervaagd
[pager] Een schoolplanner is een distributieprobleem