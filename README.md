# Leaf Garden 🌿🎶

A standalone web app that turns **plants into music**. Point your phone's camera at foliage:
the app detects leaves (OpenCV), measures how **round vs. pointy** they are, and morphs a
live generative soundscape:

- **Round leaves** → spacey, dark, ambient
- **Pointy / sharp leaves** → bright, high-frequency shimmer

Thin tracking boxes draw over each detected leaf (great on screen recordings), and a
minimalist DAW-style dial panel lets you pick sound banks, shift pitch, and shape the mood
in real time. Built to run **fully offline on a phone** (installable PWA) — perfect for a
walk in the park.

## Features
- **OpenCV leaf tracking** with an automatic pure-JS fallback if OpenCV can't load.
- **12 sound banks** in 4 groups (Spacey / Organic / Crystalline / Electronic).
- **Rotary dials**: Bank, Mode, Pitch, Freq (timbre), Space (reverb), Density, Tempo,
  Sensitivity, Volume. Drag to turn, wheel on desktop, double-tap to reset.
- **Spatial mapping**: leaf count → note density, position → stereo pan, size → octave.
- **Loop capture**: record a few bars, loop them live, and download the clip.
- **Installable PWA**: add to home screen, launches fullscreen, works with no signal.
- Screen **wake lock** so the phone stays awake in the field.

## Run locally
Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev      # HTTPS dev server on your LAN (open the Network URL on a phone)
# or
npm run build && npm run preview   # test the production/PWA build
```

Camera needs HTTPS on a phone; the dev server uses a self-signed cert (accept the browser
warning). On `localhost` (desktop) it's already a secure context.

## Deploy to GitHub Pages (automatic)
1. Create a GitHub repo and push this project to the `main` branch.
2. In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml`, which builds and publishes.
   The live URL is `https://<you>.github.io/<repo>/`.

The workflow sets `BASE_PATH=/<repo>/` so asset and service-worker paths resolve under the
project subpath — no manual config needed.

## Using it in the park
1. Open the Pages URL on your phone (over Wi-Fi or 4G) once.
2. Tap the browser menu → **Add to Home Screen**. Launch from that icon for a fullscreen,
   offline-capable app (the first load caches OpenCV + everything else).
3. Tap **Start**, allow camera + mic, point the rear camera at plants.
4. **Tap the screen** to reveal/hide the dials.

## Tuning
- Detection thresholds & sensitivity curve: top of `src/sensors/leafSensor.ts`.
- Contour pointiness math: `src/vision/leafShapeCv.ts`.
- Sound banks (voices/modes/effects): `src/audio/banks.ts`.
- Engine mapping (crossfade, filter, spatial): `src/audio/leafscape.ts`.
- Palette & layout: `style.css` (`:root` CSS variables).

Palette: `#00E0BA` teal · `#91008D` purple · `#FF3483` pink · `#FFCF00` yellow.
