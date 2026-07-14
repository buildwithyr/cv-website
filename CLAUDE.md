# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt-Übersicht

Persönliche Bewerbungs-Website von Yannick Reiter (Tischler / CNC-Programmierer bei F-List).
Reines Vanilla-Stack — kein Framework, kein Build-Step, kein npm. Direkt im Browser öffnen oder per Mini-Server:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

**Live:** https://buildwithyr.github.io/cv-website/ (GitHub Pages, Branch `main`, Root `/`)

## Dateistruktur

```
index.html          Startseite mit Hero, Stats und Preview-Cards
ueber-mich.html     Über mich (fachlich, with .about-layout grid + Foto-Placeholder)
werdegang.html      Timeline-basierter Beruflicher Werdegang
skills.html         Skills & Kenntnisse (.skills-grid)
kontakt.html        Kontakt + Lebenslauf-Download
style.css           Einzige CSS-Datei — alle Styles inkl. responsive Breakpoints
script.js           Einzige JS-Datei — nur Mobile-Nav Toggle
hero-cnc.webp       Hintergrundbild für Hero-Section (per CSS eingebunden)
Lebenslauf_Yannick_Reiter.pdf   Direkt verlinkt auf der Kontaktseite
```

## Design-System / Tokens

Alle Farben sind CSS Custom Properties in `:root` (oben in `style.css`):

| Token | Wert | Einsatz |
|---|---|---|
| `--wood-dark` | `#3D2B1F` | Hauptfarbe, Buttons, Überschriften |
| `--wood-mid` | `#6B4F3B` | Sekundärtext, Nav-Links |
| `--oak` | `#E8DCC8` | Card-Hintergründe |
| `--oak-light` | `#F4EDE0` | Page-Background |
| `--brass` | `#B08D57` | Akzent, Labels, Divider |
| `--brass-light` | `#D4B483` | Hover-States |
| `--ink` | `#2A2A28` | Fließtext |

**Schriften** (Google Fonts, inline geladen):
- `Archivo` (wdth 125, wght 700/800) — Display/Headlines
- `Inter` — Body
- `JetBrains Mono` — Labels, Tags, Mono-Details

## Architektur-Konventionen

- **Alle Seiten teilen denselben Header/Footer-HTML-Block** — kein Template-System, also bei Nav-Änderungen alle 5 HTML-Dateien anfassen.
- **`aria-current="page"`** muss auf dem aktiven Nav-Link der jeweiligen Seite gesetzt sein.
- **Blueprint-Divider** (`.bp-divider`) ist ein wiederkehrendes Gestaltungselement zwischen Content-Sektionen — kein reiner Trennstrich, sondern Teil der Werkstatt-Ästhetik.
- **Skill-Cards** nutzen `.skill-meta` statt Prozentbalken — bewusste Design-Entscheidung ("honest since-meta").
- `--max-width: 1140px` und `padding: 0 1.5rem` ist der Standard-Content-Rahmen, den alle Sektionen nutzen.

## Responsive

Zwei Breakpoints:
- `≤ 860px` — Mobile Nav (Hamburger), einspaltige Layouts
- `≤ 480px` — Stats auf 2×2

## Bekannte Offene Baustellen

- Kein Analytics, kein Cookie-Banner, kein Kontaktformular (nur statische Kontaktangaben).

## Was NICHT ohne Rückfrage ändern

- `Lebenslauf_Yannick_Reiter.pdf` — Dateiname ist hart in `kontakt.html` verlinkt, Umbenennen bricht den Download-Link.
- Die Design-Token-Namen in `:root` — sie werden überall im CSS referenziert, Umbenennung erfordert globales Find & Replace.
- GitHub Pages Deployment läuft automatisch von `main` — direkt auf `main` pushen deployt sofort live.
