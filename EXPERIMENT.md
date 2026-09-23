# Horizontale Holzreise — Experiment

Branch: `feature/horizontal-wood-journey`  
Basis: `main` bei `1eea07da424d427bf1f96fab8e81400dd358da05`.

Kein Deployment und keine Änderung der Live-Seite. Zum Testen `index.html` lokal im Browser öffnen. Alternativ diesen Ordner mit einem statischen Entwicklungsserver bereitstellen. Kein Build erforderlich.

## Aufbau

- `index.html`: alle sechs Originalbereiche in einer horizontalen Seitenbahn.
- `journey.css`: gleiche große Hero-Höhe für alle Bereiche, mobile Gestaltung, Fräsungen und Bewegungsreduktion.
- `journey.js`: Hash-Navigation, History, Fokus, aktive Bereiche, Höhenanpassung und dezente Licht-/Mausbewegung.
- `journey-oak.webp`: eine gemeinsame Eichentextur (ca. 200 KB). Gespiegelte Texturabschnitte schließen an identischen Bildkanten an. Eine gemeinsame Holzfläche trägt alle sechs Fräsbegriffe.
- Die bisherigen Einzelseiten leiten auf den jeweiligen Abschnitt weiter. Ohne JavaScript bleiben ihre ursprünglichen Inhalte verfügbar; die Startseite zeigt alle Inhalte untereinander.
- Texte, Fotos, Video, Formularziel und Lebenslauf bleiben aus der bestehenden Website übernommen. Die Fräsungen verwenden SVG-Typografie mit inneren Schatten und Fasen auf der fotografischen Holzoberfläche. Es handelt sich um einen räumlichen 2D-Prototyp, nicht um ein geometrisches CNC-Modell.

Normales vertikales Scrollen liest den aktiven Abschnitt. Die Navigation bewegt die gesamte Seitenbahn horizontal in 850 ms. Es werden keine Mausrad- oder Touch-Scrollgesten abgefangen. Bei `prefers-reduced-motion` entfallen Übergang, Parallax und Idle-Bewegung. Animation pausiert außerhalb des sichtbaren Holzbereichs und im inaktiven Tab. Lichtupdates sind auf 10 pro Sekunde begrenzt. Es gibt keine WebGL-Abhängigkeit oder GPU-Textur in Retina-Auflösung.

## Prüfung

Erfolgreich lokal geprüft: JavaScript-Syntax; identischer Textinhalt aller sechs Originalbereiche; eindeutige IDs; lokale Dateiverweise; sechs Beschriftungen; genau eine Holzfläche; direkte Abschnittslinks; alle Navigationswechsel; Zurück/Vorwärts; aktive Navigation und inaktive Fokusbereiche; Höhenanpassung; mobiles Menü; Datenschutzdialog; Formularzustand; Routing mit reduzierter Bewegung. Die Interaktion wurde mit einer DOM-Simulation geprüft. Kein Kontaktformular wurde abgeschickt.

Noch am echten Gerät zu prüfen: visuelle Darstellung in Safari/iPhone und Chrome/Edge, Mauswirkung, Lighthouse und tatsächliche Bildrate. Der verfügbare Testbrowser konnte die lokale Vorschau nicht öffnen. Es werden daher keine gemessenen 60 FPS oder Lighthouse-Werte behauptet.

Die separate HTML-Vorschau enthält Fotos, Eichentextur und PDF direkt in der Datei. Google Fonts, YouTube und das bestehende Kontaktformular benötigen Internet.
