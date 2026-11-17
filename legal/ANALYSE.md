# Paketverzeichnis auf what3var.github.io – rechtliche Einordnung (Notiz)

> **Interne Notiz, wird nicht veröffentlicht** (keine Front Matter, `build.mjs` rendert sie nicht).
> Keine Rechtsberatung. Stand: 17.11.2026. Die GitHub-Dokumente ändern sich; vor dem Start die
> aktuellen Fassungen lesen (Links unten) und die Entwürfe in diesem Ordner von einer Anwältin
> oder einem Anwalt (IT-/Urheberrecht) prüfen lassen.

## Ausgangslage

- Der Betreiber (Maintainer) lädt **alle** Pakete selbst hoch. Es gibt keine Konten, kein
  Self-Service-Upload und keinen PR-Weg für Dritte. Dritte melden ein Paket per Issue; der
  Maintainer prüft und veröffentlicht es mit `scripts/publish-package.mjs` bzw. dem Workflow
  *publish-package*.
- Folge: Rechtlich ist das Verzeichnis kein Plattformdienst mit fremden Uploads, sondern der
  Maintainer **verbreitet fremde Werke selbst** (Vervielfältigung und öffentliche Zugänglichmachung,
  §§ 16, 19a UrhG). Das ist erlaubt, soweit die Lizenz des Pakets es erlaubt – und nur dann.
  Ein separater „Publisher-Vertrag“ ist dafür nicht nötig; die Grundlage ist die Open-Source-Lizenz
  des Pakets. (Wer ein Paket einreicht, ohne die Rechte zu haben, haftet dem Rechteinhaber; der
  Maintainer haftet als Verbreiter trotzdem selbst – daher die Prüfung vor dem Hochladen.)

## 1. GitHub: Nutzungsbedingungen, Acceptable Use, Pages

| Regel (GitHub) | Bedeutung für das Verzeichnis |
| --- | --- |
| Pages ist für statische Seiten, v. a. als Schaufenster für persönliche und Organisations-Projekte; **nicht** als kostenloses Hosting für Unternehmen, nicht für Seiten, deren Hauptzweck kommerzielle Transaktionen oder kommerzielles SaaS ist. | Ein nichtkommerzielles Paketverzeichnis eines Open-Source-Projekts passt zum Zweck. Kein Verkauf, keine Bezahlpakete, keine Werbung über Pages. |
| Limits (Pages): veröffentlichte Seite höchstens **1 GB**, weiches Bandbreitenlimit **100 GB/Monat**, weiches Limit 10 Builds/Stunde (gilt nicht bei eigenem Actions-Workflow), Deployment-Timeout 10 Minuten, Rate-Limits (HTTP 429) möglich. | fire-Pakete sind reiner Quelltext (typisch wenige kB). 1 GB reicht für zehntausende Versionen. Bei 100 GB/Monat und 50 kB je Paket ≈ 2 Mio. Downloads/Monat. `publish-package.mjs` lehnt Pakete über 5 MB ab. |
| Dateien im Git-Repository: Warnung ab 50 MB, Sperre ab **100 MB**; Repository-Empfehlung < 1 GB (Dateien bleiben in der Historie!). | Pakete liegen in `registry/files/` und wachsen die Historie dauerhaft. Bei Wachstum auf Release-Assets umstellen (s. u.). |
| Release-Assets: je Datei **< 2 GiB**, bis **1000 Assets je Release**; laut GitHub keine Grenze für Gesamtgröße oder Bandbreite. | Skaliert besser: ein Release je Paket (`pkg-<name>`), je Version ein Asset. Der Workflow kann das (`storage: release`) mit dem normalen `GITHUB_TOKEN`. |
| Acceptable Use: kein Malware-/Exploit-Hosting zu schädlichen Zwecken, keine Rechtsverletzungen (Urheber-, Marken-, Persönlichkeitsrechte), keine übermäßige Bandbreite („significantly excessive“ → Drosselung/Sperre), kein Spam/Bulk-Missbrauch. | Malware-Prüfung vor Veröffentlichung, Takedown-Prozess, kein „CDN für Fremdes“. Bei starkem Traffic: CDN vor die Seite oder eigenes Hosting (GitHub nennt das selbst als Ausweg). |
| GitHub DMCA-Takedown-Policy: Rechteinhaber können sich direkt an GitHub wenden; GitHub entfernt dann ggf. Inhalte bzw. das Repo. | Eigener, schneller Takedown-Kontakt verhindert, dass es so weit kommt (Repo-Sperre träfe die ganze Website). |

Quellen (vor Start aktuell lesen): GitHub Pages limits
(docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), GitHub Acceptable
Use Policies (docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies),
About releases (docs.github.com/en/repositories/releasing-projects-on-github/about-releases),
About large files on GitHub, GitHub Terms of Service, GitHub Privacy Statement, DMCA Takedown Policy.
Die Zahlen oben stammen aus diesen Seiten (per Websuche geprüft am 17.11.2026; ein direkter Abruf
von docs.github.com war aus der Arbeitsumgebung nicht möglich – bitte einmal selbst gegenlesen).

## 2. Weitergabe fremder Pakete (Lizenzen)

Pflicht je Paket (technisch erzwungen bzw. geprüft von `publish-package.mjs`):

1. **Lizenz angegeben** (`license` im `package.json`, SPDX-Kennung). Ohne Lizenz kein Recht zur
   Weitergabe → wird abgelehnt.
2. **Lizenz erlaubt Weitergabe**: Die Liste `REDISTRIBUTABLE` in `scripts/registry.mjs` (MIT, BSD,
   Apache-2.0, MPL-2.0, (L)GPL, AGPL, EUPL, …). Andere Lizenzen nur mit `--allow-license`, nachdem der
   Maintainer sie gelesen hat (z. B. „Non-Commercial“-Lizenzen: Weitergabe auf einer nichtkommerziellen
   Seite meist erlaubt, aber prüfen; „All rights reserved“/proprietär: **nein**).
3. **Lizenztext und Hinweise mitgeben**: MIT/BSD/Apache verlangen, dass Lizenztext bzw.
   Copyright-Hinweis (Apache: auch `NOTICE`) jede Kopie begleiten. Darum nimmt `ember forge` jetzt
   `LICENSE`/`NOTICE`/`README` neben der Beschreibung ins Paket auf, und die Paketseite zeigt den
   Lizenztext. Fehlt er im Paket, warnt das Skript; dann den Autor um ein Paket mit Lizenzdatei bitten
   oder `--license-file` (Text wird auf der Seite gezeigt – die `.fpk` selbst bleibt unverändert).
4. **GPL/AGPL/LGPL/MPL/EUPL**: Weitergabe des Quelltexts ist erfüllt, weil fire-Pakete reiner
   Quelltext sind. Trotzdem `--source` (Repository-Link) angeben. Keine Binaries im Paket (das Skript
   warnt bei `.dll/.so/.exe` …).
5. **Unverändert weitergeben**: Das Skript speichert die Datei bitgenau (SHA-256). Wer ein Paket
   ändert, wird Bearbeiter – dann gelten die Pflichten der Lizenz für Änderungen.
6. **Namensnennung**: Autor, Lizenz, Homepage/Quelle stehen auf jeder Paketseite und im Index.
7. **Marken/Namen**: Keine Pakete unter fremden Marken- oder Projektnamen (Verwechslungsgefahr);
   reservierte Namen (`fire-*`, Importnamen des Compilers) lehnt das Skript ab. Bei Namensstreit
   entscheidet der Maintainer; ein entferntes Paket bleibt in `registry/removed.json` gesperrt.
8. **Herkunft dokumentieren**: Woher das Paket kam (URL, SHA-256 des Autors, Datum) – der Workflow
   schreibt das in die Commit-Nachricht.

## 3. Haftung, Malware, Entfernung

- **Gewährleistung/Haftung**: Open-Source-Lizenzen schließen Gewährleistung meist aus; zusätzlich
  in den Nutzungsbedingungen: unentgeltliche Bereitstellung, Haftung nur nach Gesetz für Vorsatz und
  grobe Fahrlässigkeit, Verletzung von Leben/Körper/Gesundheit und nach ProdHaftG. (Bei
  unentgeltlichen Leistungen ist ein weitergehender Ausschluss in AGB in Deutschland unwirksam,
  § 309 Nr. 7 BGB – deshalb so formulieren, nicht „jede Haftung ausgeschlossen“.)
- **Neue EU-Produkthaftungsrichtlinie (RL (EU) 2024/2853)**: erfasst Software ausdrücklich; Umsetzung
  bis 9.12.2026. Freie Open-Source-Software, die *außerhalb einer Geschäftstätigkeit* bereitgestellt
  wird, ist ausgenommen. Das Verzeichnis daher nichtkommerziell halten (keine Bezahlung, keine
  Werbung, kein Verkauf von Support über das Verzeichnis).
- **Cyber Resilience Act (VO (EU) 2024/2847)**: gilt für Produkte, die *im Rahmen einer
  Geschäftstätigkeit* bereitgestellt werden; nichtkommerzielle FOSS-Verteilung fällt nicht darunter.
  Ab 11.12.2027 voll anwendbar; Meldepflichten ab 11.9.2026 – nur relevant, falls das Projekt
  kommerziell wird (dann neu prüfen; ggf. Rolle „Open-Source-Steward“).
- **Malware-Politik**: Vor Veröffentlichung Quelltext durchsehen (Natives in C/C++ besonders:
  Netzwerk, Prozessstart, Dateisystem außerhalb des Programms). Bei Verdacht sofort `--yank` oder
  `--remove`. ember prüft SHA-256 und Größe, lädt Fremdes nur über https und installiert keine
  Datei ohne Prüfsumme – das schützt vor Manipulation unterwegs, nicht vor einem bösartigen Paket.
- **Entfernung**: Der Maintainer darf jedes Paket jederzeit ohne Angabe von Gründen entfernen
  (steht in den Bedingungen). Ablauf: `node scripts/publish-package.mjs --remove name --reason "…"`,
  Commit, Deploy. Achtung: Die Datei bleibt in der Git-Historie (bei echten Rechtsverletzungen ggf.
  Historie bereinigen, z. B. `git filter-repo`, und GitHub-Support für Caches) und als Release-Asset
  (manuell löschen).
- **Takedown/Notice-and-Action**: Kontaktadresse auf der Seite (Impressum/Bedingungen), Reaktion
  „unverzüglich“ nach Kenntnis. Für einen Dienst ohne fremde Uploads greift das Haftungsprivileg der
  Hostprovider (Art. 6 DSA) nicht direkt – der Maintainer ist selbst Anbieter der Inhalte; umso
  wichtiger ist die Prüfung vorab und schnelles Entfernen. Der DSA (Melde- und Abhilfeverfahren
  usw.) betrifft Hosting fremder Inhalte; da Dritte nichts selbst hochladen, ist das Verzeichnis
  kein Hostingdienst im Sinne des DSA (Einschätzung, prüfen lassen).

## 4. Datenschutz (DSGVO)

- Die Seite ist statisch, setzt **keine Cookies**, hat kein Tracking, keine Formulare, keine
  externen Schriften/CDNs. `localStorage` speichert nur das gewählte Farbschema (technisch nicht
  notwendig im engeren Sinn, aber rein lokal; § 25 Abs. 2 Nr. 2 TDDDG: vom Nutzer ausdrücklich
  gewünschte Funktion – im Hinweis erwähnen).
- **GitHub (Hoster)** verarbeitet beim Abruf die IP-Adresse und Zugriffsdaten (Logs zu
  Sicherheitszwecken). GitHub Inc. sitzt in den USA; GitHub ist unter dem EU-US Data Privacy
  Framework zertifiziert (Stand prüfen). Rechtsgrundlage für den Betreiber: Art. 6 Abs. 1 lit. f
  DSGVO (berechtigtes Interesse an einer sicheren, verfügbaren Seite).
- Auftragsverarbeitung: Ob für das Konto ein Data Protection Agreement (DPA/AVV) von GitHub greift
  und ob GitHub die Pages-Logs als Auftragsverarbeiter oder als eigener Verantwortlicher verarbeitet,
  ist nicht eindeutig dokumentiert – prüfen lassen. In jedem Fall im Hinweis transparent machen und
  auf das GitHub Privacy Statement verweisen.
- ember lädt `index.json` und Pakete direkt von GitHub Pages bzw. GitHub Releases: dieselben
  Logs, keine eigene Telemetrie. Im Hinweis erwähnen.
- Paketseiten zeigen Bilder aus Readmes nur von https-Adressen (mit `referrerpolicy="no-referrer"`);
  jedes externe Bild überträgt die IP an Dritte. Strenger: externe Bilder ganz abschalten
  (`renderReadme` in `src/packages.mjs`) – Empfehlung, falls Readmes Bilder Dritter enthalten.
- Entwurf: `legal/datenschutz.md`.

## 5. Impressum (§ 5 DDG)

- Seit 14.5.2024 § 5 DDG (vorher § 5 TMG). Pflicht für „geschäftsmäßige, in der Regel gegen
  Entgelt angebotene“ digitale Dienste; nach herrschender Auslegung genügt eine nachhaltige,
  nicht rein private Tätigkeit – Werbung, Sponsoring, Spenden-Links oder Verbindung zu einem
  Unternehmen sprechen für die Pflicht. Ein Projekt-Auftritt mit Paketverzeichnis für die
  Öffentlichkeit ist ein Grenzfall; **Empfehlung: Impressum angeben** (geringer Aufwand, schützt vor
  Abmahnung). Zusätzlich § 18 Abs. 2 MStV (journalistisch-redaktionelle Inhalte, z. B. News) –
  Verantwortlicher mit Anschrift.
- Inhalt: Name, ladungsfähige Anschrift (kein Postfach), schnelle elektronische Kontaktaufnahme
  (E-Mail; Telefon oder Kontaktformular). Ggf. USt-ID. Entwurf mit Platzhaltern:
  `legal/impressum.md`. Wer die Privatanschrift nicht veröffentlichen will: Impressum-/Anschrift-
  Service (c/o-Adresse mit Zustellbarkeit) – rechtlich prüfen lassen.

## 6. Eigene Nutzungsbedingungen

Entwurf: `legal/paketverzeichnis.md` („Entwurf – rechtlich prüfen lassen“). Inhalt: wer betreibt,
dass der Maintainer allein veröffentlicht, Lizenzen der Autoren gelten, keine Gewährleistung,
Haftung nach Gesetz, Recht zur Entfernung, Takedown-Kontakt, Namensregeln, Malware-Politik,
Prüfsummen, Änderungen der Bedingungen, deutsches Recht.

Für Einreichende (statt Publisher-Vertrag): ein kurzer Hinweis „Paket per Issue vorschlagen – mit
Link zum Quelltext, Lizenz, SHA-256; mit dem Einreichen bestätigst du, dass du die Rechte hast bzw.
das Paket unter der angegebenen Lizenz steht“. Das ist kein Vertrag, sondern dokumentiert die
Zusicherung; die Prüfung bleibt beim Maintainer.

## 7. Was vor dem Start zu tun ist

1. Entwürfe prüfen lassen, Platzhalter ausfüllen, dann in `legal/*.md` `draft: false` setzen
   (erst dann rendert `build.mjs` die Seiten und verlinkt sie im Footer).
2. Kontakt-E-Mail für Takedowns einrichten (in Impressum und Bedingungen).
3. Entscheiden: Dateien auf Pages (Standard) oder Release-Assets (Workflow-Eingabe `storage`).
4. Kein Werbung/Sponsoring über die Seite, solange die Nicht-Kommerzialität wichtig ist (PLD, CRA,
   Pages-Regeln).
