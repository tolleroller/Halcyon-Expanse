# Halcyon Expanse

A mobile painted graphic novel PWA. Eli Hale, systems engineer, RSV Vesper.

Not a game. No Episode, Level, XP, quiz, or choices menu.

## Run

```bash
cd /workspace/halcyon-expanse/app
npm install
npm run dev
```

Dev server: http://localhost:8080

```bash
npm run build
npm run preview
```

## Phone testing

Serve over HTTPS or localhost. On a phone on the same network, use the machine’s LAN IP with the Vite host flag (already `host: true`). Add to Home Screen from Safari/Chrome for the standalone shell. Theme color is `#120e0b`.

Save key: `halcyon-expanse-v4` (pages p01–p07 + hinge after p07).

## Content

- Script: `src/content/story.json` (Chat live copy)
- Plates: `public/art/`
- Trailer: `public/video/trailer-v5.mp4`
