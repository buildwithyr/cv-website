# Bewerbungs-Homepage — Yannick Reiter

Persönliche Bewerbungs-Website von Yannick Reiter (Tischler / CNC-Programmierer).
Statische Seite ohne Framework — Vanilla HTML, CSS und JavaScript.

**Live:** https://buildwithyr.github.io/cv-website/

## Seiten

| Datei | Inhalt |
|-------|--------|
| `index.html` | Startseite |
| `ueber-mich.html` | Über mich (rein fachlich) |
| `werdegang.html` | Beruflicher Werdegang als Timeline |
| `skills.html` | Skills & Kenntnisse |
| `kontakt.html` | Kontakt + Lebenslauf-Download |

`Lebenslauf_Yannick_Reiter.pdf` liegt im Repo-Root und wird auf der Kontaktseite verlinkt.

## Gestaltung

Handwerks-/Werkstatt-Ästhetik: warmes Walnussbraun, Eichenholz-Beige und Messing-Akzente,
mit einer technischen Bemaßungs-/Blueprint-Optik als wiederkehrendem Element. Schriften:
Archivo (Display), Inter (Fließtext), JetBrains Mono (technische Labels) via Google Fonts.

- Responsive bis Mobile
- Sichtbarer Tastatur-Fokus und Skip-Link
- `prefers-reduced-motion` wird berücksichtigt

## Lokal ansehen

Einfach `index.html` im Browser öffnen oder einen kleinen Server starten:

```bash
python3 -m http.server 8000
# http://localhost:8000
```

## Veröffentlichung (GitHub Pages)

Quelle: Branch `main`, Verzeichnis `/ (root)`.
