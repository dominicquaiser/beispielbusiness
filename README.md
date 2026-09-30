# beispielbusiness.de

Statische Website der **fiktiven** Beispielbusiness GmbH – einem erfundenen Hersteller von Präzisionskomponenten
und modularer Spanntechnik. Die Website dient als öffentlich zugängliche Test- und Scraping-Sandbox für
Web-Scraping, Company-Data-Enrichment und Datenaggregation.

Alle Unternehmens-, Personen-, Produkt- und Kontaktdaten sind frei erfunden. Echt sind nur die Angaben zum
Anbieter der Website: Sie stehen auf jeder Seite in einer eigenen Leiste unten im Footer (Krake-Design). Die
ausführliche Kennzeichnung als Sandbox steht im Impressum.

- Nur HTML, CSS und Vanilla JavaScript – keine Frameworks, kein Build-Schritt
- Alle Inhalte stehen im initialen HTML; JavaScript ergänzt nur mobile Navigation, FAQ-Anker und Formularprüfung
- Keine Cookies, kein Tracking, keine externen Ressourcen (Schriften lokal)
- Nicht in Suchmaschinen-Indizes: `<meta name="robots" content="noindex, follow">` auf jeder Seite und
  `X-Robots-Tag: noindex, follow` für alle Antworten. Crawling bleibt erlaubt (`robots.txt`), Scraper sind nicht betroffen

## Start

```bash
docker compose up -d
```

Die Website ist danach unter <http://localhost:8080> erreichbar. Den Host-Port legt `HTTP_PORT` fest:

```bash
HTTP_PORT=80 docker compose up -d
```

Stoppen: `docker compose down`. Nach Änderungen an Inhalten neu bauen: `docker compose up -d --build`.

## Deployment unter beispielbusiness.de

Der Container spricht nur HTTP. TLS übernimmt ein vorgeschalteter Reverse Proxy, zum Beispiel Caddy:

```caddyfile
beispielbusiness.de, www.beispielbusiness.de {
    reverse_proxy 127.0.0.1:8080
}
```

Anfragen an `www.beispielbusiness.de` leitet nginx per 301 auf `https://beispielbusiness.de` um. Sobald die Domain
dauerhaft per HTTPS läuft, kann in `nginx.conf` der vorbereitete HSTS-Header aktiviert werden.

**Rechtliches:** Die echten Anbieterangaben nach § 5 DDG (Dominic M. Quaiser, Chemnitz) stehen in der Leiste
„Anbieter dieser Website“ am Ende jeder Seite (Anker `#anbieter`). Im Impressum heißen die erfundenen Firmendaten
„Fiktive Unternehmensangaben (Testdaten)“ und sind ausdrücklich keine Anbieterangaben. Die Datenschutzerklärung nennt
den echten Verantwortlichen. Sie gibt eine Log-Aufbewahrung von höchstens 14 Tagen an; das muss zum Hosting passen.

## Aufbau

```text
.
├── index.html                      Startseite
├── unternehmen/index.html          Profil, Geschichte, Werte, Fertigung, Standort
├── unternehmen/team/index.html     6 Ansprechpartner
├── produkte/beispielclamp-200/     Produktseite BC-200 (technische Daten, Varianten, FAQ)
├── branchen/index.html             Maschinenbau, Anlagenbau, Automatisierungstechnik, Fördertechnik
├── karriere/index.html             3 Stellenanzeigen
├── news/index.html                 4 Meldungen, davon 2 mit Detailseite:
│   ├── beispielclamp-200-startet-in-serienfertigung/
│   └── neues-5-achs-bearbeitungszentrum/
├── kontakt/index.html              Adresse, Zeiten, Ansprechpartner, Formular (reine Frontend-Demo)
├── impressum/index.html            inkl. Sandbox-Hinweis
├── datenschutz/index.html
├── 404.html
├── robots.txt, sitemap.xml, favicon.ico
├── assets/css/style.css, assets/css/noscript.css
├── assets/js/main.js
├── assets/img/                     Logo, Favicons, Open-Graph-Bild, Produktzeichnung (SVG)
├── assets/fonts/                   Barlow / Barlow Semi Condensed (OFL.txt), Roboto Mono (OFL-RobotoMono.txt), SIL OFL 1.1
├── Dockerfile, docker-compose.yml, nginx.conf
```

`/produkte/` hat keine eigene Seite und leitet per 301 auf `/produkte/beispielclamp-200/` weiter.

## nginx

- statische Auslieferung, `index.html` in Unterverzeichnissen, 301 auf Pfade mit abschließendem Slash
- Gzip für HTML, CSS, JS, SVG, XML, JSON
- Cache-Header: HTML `no-cache`, CSS/JS/Bilder 30 Tage (CSS/JS über `?v=` versioniert), Schriften 1 Jahr
- Security-Header: CSP (nur `'self'`), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, `Cross-Origin-Opener-Policy`
- `X-Robots-Tag: noindex, follow` für alle Antworten
- eigene 404-Seite, auch für Verzeichnisse ohne Index; versteckte Dateien werden nicht ausgeliefert
- Zugriffsprotokoll mit gekürzter IP-Adresse und ohne Query-String
- `POST /kontakt/` (Formular ohne JavaScript) wird nicht verarbeitet, sondern per 303 zurück zum Formular geleitet
- `/healthz` für den Docker-Healthcheck
- Container läuft mit schreibgeschütztem Dateisystem (`read_only`) und `no-new-privileges`

## Structured Data

Jede Seite enthält JSON-LD (`@graph`) mit stabilen `@id`s, die seitenübergreifend auf dieselben Entitäten zeigen:

| Typ | Seiten |
| --- | --- |
| `Organization` (`/#organization`) | alle Seiten; vollständig auf Start, Unternehmen, Kontakt, Impressum |
| `Person` (`/unternehmen/team/#<name>`) | Team (alle 6, ausführlich), dazu Start, Unternehmen, Produkt, Kontakt, Impressum, News |
| `Product` (`/produkte/beispielclamp-200/#product`) mit `ProductModel`-Varianten | Produkt; Referenzen auf Start, Branchen, News |
| `Article` | News-Übersicht (alle 4), News-Detailseiten |
| `JobPosting` | Karriere (3) |
| `WebSite`, `WebPage`/`AboutPage`/`ItemPage`/`ContactPage`/`CollectionPage`, `BreadcrumbList`, `ItemList` | je nach Seite |

## Referenzdaten (Ground Truth)

Diese Werte sind die „richtigen“ Antworten, gegen die Scraper- und Enrichment-Ergebnisse geprüft werden können.

### Unternehmen

| Feld | Wert |
| --- | --- |
| Firma | Beispielbusiness GmbH |
| Rechtsform | GmbH (Gesellschaft mit beschränkter Haftung) |
| Branche | Maschinenbau – Spanntechnik und Präzisionskomponenten |
| Gründung | März 2017, Ostenfurt |
| Gründer / Geschäftsführung | Dr.-Ing. Katrin Wendeler, Markus Hollenbach |
| Mitarbeitende | 85 (Stand 2026), davon 7 Auszubildende |
| Hauptsitz & Produktion | Walzmühlenstraße 14, 43219 Ostenfurt, Nordrhein-Westfalen, DE |
| Standorte | 1 Produktionsstandort |
| Produktionsfläche | 2.800 m² |
| Telefon / Fax | +49 221 4710100 / +49 221 4710199 |
| E-Mail | info@beispielbusiness.de (Vertrieb: vertrieb@, Bewerbungen: karriere@) |
| Handelsregister | HRB 30817, Amtsgericht Ostenfurt (fiktiv) |
| USt-IdNr. | DE318406725 (fiktiv, Prüfziffer bewusst ungültig) |
| Zertifizierung | DIN EN ISO 9001:2015 seit 2019 |
| Maschinenpark | 11 CNC-Bearbeitungszentren (4 × 5-Achs), 3 CNC-Dreh-Fräszentren |
| Vertriebsregion | DE, AT, CH direkt; NL, BE, LU, DK, SE, PL, CZ über Partner (10 Länder) |
| Kernprodukt | BeispielClamp 200 (BC-200) |

### Geschichte

| Jahr | Ereignis | Mitarbeitende |
| --- | --- | --- |
| 2017 | Gründung, angemietete Halle 900 m² | 9 |
| 2019 | eigenes Werk Walzmühlenstraße, 1.600 m², ISO 9001 | 24 |
| 2021 | Entwicklungsstart Spannsystem, Aufbau Anwendungstechnik | 41 |
| 2024 | Serienstart BeispielClamp 200 (16.04.2024) | 68 |
| 2025 | Hallenanbau +1.200 m² auf 2.800 m² (06/2025), 5-Achs-BAZ (11/2025) | – |

### Personen

| Name | Position | Abteilung | E-Mail | Telefon |
| --- | --- | --- | --- | --- |
| Dr.-Ing. Katrin Wendeler | Geschäftsführerin Technik & Produktion | Geschäftsführung | katrin.wendeler@beispielbusiness.de | +49 221 4710110 |
| Markus Hollenbach | Geschäftsführer Kaufmännische Leitung & Vertrieb | Geschäftsführung | markus.hollenbach@beispielbusiness.de | +49 221 4710120 |
| Tobias Kemmerling | Key Account Manager Technischer Vertrieb | Vertrieb | tobias.kemmerling@beispielbusiness.de | +49 221 4710231 |
| Sabine Oltmanns | Leiterin Anwendungstechnik | Technische Beratung | sabine.oltmanns@beispielbusiness.de | +49 221 4710242 |
| Florian Dreesen | Leiter Produktion & Qualitätssicherung | Produktion / Qualität | florian.dreesen@beispielbusiness.de | +49 221 4710310 |
| Aylin Karaca | Teamleiterin Einkauf & Materialwirtschaft | Einkauf | aylin.karaca@beispielbusiness.de | +49 221 4710410 |

Alle Personen arbeiten am Standort Ostenfurt. Produkt-Ansprechpartner: Kemmerling (Vertrieb), Oltmanns (Technik).

### Produkt BeispielClamp 200 (BC-200)

| Merkmal | BC-200-A-080 | BC-200-A-125 | BC-200-S-125 | BC-200-S-160 |
| --- | --- | --- | --- | --- |
| Werkstoff | Aluminium EN AW-7075 | Aluminium EN AW-7075 | Stahl 16MnCr5 | Stahl 16MnCr5 |
| L × B × H (mm) | 180 × 80 × 72 | 240 × 125 × 88 | 240 × 125 × 88 | 300 × 160 × 104 |
| Spannkraft 6 bar | 5,0 kN | 9,0 kN | 12,0 kN | 20,0 kN |
| Spannkraft mechanisch max. | 8 kN | 14 kN | 20 kN | 32 kN |
| Wiederholgenauigkeit | ≤ 0,01 mm | ≤ 0,01 mm | ≤ 0,005 mm | ≤ 0,005 mm |
| Gewicht | 2,1 kg | 4,9 kg | 13,2 kg | 24,5 kg |

Bestellschlüssel `BC-200-<A|S>-<080|125|160>-<P|M|F>`; 10 Standardartikel, Federspeicher (F) nur Stahl,
lieferbar ab November 2026. Schnittstellenraster 50 mm, 4–8 bar, Schließzeit < 0,4 s, +5 bis +70 °C.

### Stellen

| Ref.-Nr. | Titel | Vergütung | Ansprechpartner | veröffentlicht / gültig bis |
| --- | --- | --- | --- | --- |
| BB-26-011 | CNC-Zerspanungsmechaniker (m/w/d) Fräsen | 3.400–4.100 €/Monat | Florian Dreesen | 2026-08-17 / 2026-11-30 |
| BB-26-014 | Technischer Vertriebsmitarbeiter (m/w/d) im Außendienst – Süddeutschland | 62.000–74.000 €/Jahr | Markus Hollenbach | 2026-09-02 / 2026-12-15 |
| BB-26-016 | Industriemechaniker (m/w/d) Montage Spannsysteme | 3.200–3.800 €/Monat | Florian Dreesen | 2026-09-15 / 2026-12-31 |

### News

| Datum | Kategorie | Titel | Detailseite |
| --- | --- | --- | --- |
| 2026-09-08 | Messe | BeispielClamp 200 auf der MONTAVIA 2026 (fiktive Messe) | nein |
| 2025-11-18 | Fertigung | Neues 5-Achs-Bearbeitungszentrum erweitert Fertigungskapazität | ja |
| 2025-06-03 | Unternehmen | Hallenerweiterung abgeschlossen: Produktionsfläche wächst auf 2.800 m² | nein |
| 2024-04-16 | Produkt | BeispielClamp 200 startet in Serienfertigung | ja |

### Bewusste Schreibvarianten (Normalisierung / Entity Resolution)

- Mitarbeitende: „85 Mitarbeitende“, „rund 85 Beschäftigten“, „85 Mitarbeiterinnen und Mitarbeiter“; historisch 68 (Pressetext 04/2024)
- Telefon: `+49 221 4710-100`, `+49 (0) 221 / 4710 - 100`, `0221 4710-100`, `+49 221 4710 100`, `(0221) 4710-410`, `+49 (0)221 4710 231`, `+49 221 4710310`
- Adresse: `Walzmühlenstraße 14, 43219 Ostenfurt` und `Walzmühlenstr. 14 · D-43219 Ostenfurt`
- Namen: „Dr.-Ing. Katrin Wendeler“ / „Katrin Wendeler“; Firma „Beispielbusiness GmbH“ / „Beispielbusiness“ / „Gesellschaft mit beschränkter Haftung (GmbH)“
- Produkt: „BeispielClamp 200“, „BC-200“, Artikelnummern `BC-200-S-125-P` usw.
- Fläche: „2.800 m²“ (sichtbar) und `2800` mit `unitCode MTK` (JSON-LD)
- Datumsformate: `08.09.2026`, `8. September 2026`, ISO 8601 in `datetime` und JSON-LD

### Warum die Daten niemanden treffen

- Telefonnummern aus dem von der Bundesnetzagentur für Medien reservierten Bereich 0221 4710 000–999
- Postleitzahlen mit 43 sind in Deutschland nicht vergeben; Ostenfurt ist ein erfundener Ort
- USt-IdNr. besteht die amtliche Prüfziffernberechnung nicht
- Personen, Messe (MONTAVIA) und Registergericht sind erfunden
