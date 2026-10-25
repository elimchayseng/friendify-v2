# Friendify

Your friends’ five most-played Spotify songs, presented as a collection of interactive 3D music players.

Each friend chooses a model and an authentic finish. The click wheel browses their top five; the center button shows song details, and play opens Spotify. Color-screen models display album artwork. Turn a device over to see its back, including the nano camera or Shuffle clip.

## Run locally

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. Visitors sign in with Spotify before loading the collection. There is no anonymous demo, sample music, or demo persistence path.

For real accounts, copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Enable Spotify in Supabase Auth and allow the app’s origin as a redirect URL. The existing OAuth flow requests `user-top-read` and `user-read-email`.

## Choosing an iPod

**Choose your iPod** opens a live, interactive preview with six designs:

| Model | Screen and hardware |
| --- | --- |
| iPod, 4th generation (2004) | White polycarbonate, monochrome LCD, stainless back |
| iPod mini, 2nd generation (2005) | Rounded anodized aluminum, plastic end caps, blue-white LCD |
| iPod nano, 3rd generation (2007) | Short body, landscape color display, steel back |
| iPod nano, 5th generation (2009) | Slim curved aluminum, portrait color display, rear camera |
| iPod classic, 160 GB (2009) | Aluminum front, steel back, landscape color display |
| iPod shuffle, 2nd generation (2006) | Screenless aluminum control pad, status LED, raised clip |

The procedural models use a common millimeter-to-world scale. Proportions, screens, ports, finishes, and backs vary by model. References are linked in the picker and in [the model registry](src/lib/ipods.ts). These are procedural reconstructions, rather than manufacturer CAD assets.

The Shuffle stays screenless. Its companion panel exposes the top five, the center opens Spotify, and its physical switch toggles shuffle order. Volume is controlled in Spotify. Selections are saved to the signed-in account and shared with friends through Supabase. Cancel discards a draft, and failed saves leave the previous device unchanged.

### Account persistence migration

Apply [20261025000000_create_ipod_preferences.sql](supabase/migrations/20261025000000_create_ipod_preferences.sql) to your Supabase database before deploying account saving. With the project linked, run `supabase db push`, or run that migration in the Supabase SQL editor. Production and preview environments both need this migration and their own configured Supabase variables.

The migration creates `ipod_preferences` separately from existing user profiles. Reads are available with the collection; writes require both the authenticated owner and a Spotify identity matching the profile. It checks trusted `auth.identities`, not editable user metadata, because profile UUIDs and authentication UUIDs differ in this application. Model/finish combinations are constrained in PostgreSQL.

Artwork comes from the existing Spotify `tracks.image_url`. Missing or blocked images have an explicit artwork-unavailable fallback.

## Controls

- Scroll over a click wheel, drag around its ring, or press its left/right areas to browse songs.
- Press the center to inspect a song. Press it again, or use play, to open Spotify. MENU returns to the list.
- Drag the body to rotate an iPod. Flick it to send it spinning; angular momentum decays slowly. Each device gently drifts and tumbles while idle. **Turn over** shows the back, and R stops and resets the active device.
- Scroll outside the wheel, pinch with two fingers, or use +/− to zoom. Drag empty space to pan. Click a name to move closer; **Fit all** restores the overview.
- With the collection focused, ↑/↓ browse songs, Enter selects, Escape returns, I flips, R resets, and ←/→ jump between friends. +/− zoom and 0 fits everyone. A native keyboard control bar appears on focus.
- There is a single 3D collection view. Browsers without WebGL 2, or those that lose their graphics context, get a keyboard-accessible song list with direct Spotify links.
- Click-wheel sound is optional and off by default. Reduced-motion preferences are respected.

Search, shared-song filtering, friend selection, individual/visible-track copying, and invite links are available in both views. Track-of-the-day and reaction functionality remains behind its existing disabled feature flag.

## Rendering

The app uses React 18, TypeScript, Vite, React Query, Supabase, Three.js, React Three Fiber 8, and Drei 9. The 3D scene is loaded separately from the application shell.

- Reusable geometry per hardware model constructs the players, including capsule sections, beveled fronts, end caps, rear clips, cameras, and model-specific controls.
- Studio lighting, physical materials, and an environment generated locally give the objects depth without downloading external models or HDR images. An SVG star field, staggered glimmers, and occasional shooting stars sit behind both renderers. Background motion stops when reduced motion is enabled.
- The orthographic camera preserves device positions while zooming and panning.
- Each LCD is a dynamic canvas texture driven by the shared React player state. The mini uses a monochrome display; the nano and later classic use landscape or portrait color layouts with asynchronously loaded album art.
- Raycasting handles screen selection, circular wheel gestures, and body rotation. Pointer capture keeps drags stable outside a model’s bounds.
- The scene renders on demand, continuing frames while devices float or spin. The main collection pauses while the picker or help dialog is open. Idle motion and inertial spin stop for reduced-motion users. All devices remain in the shared space as the camera zooms and pans.

## Checks

```sh
npm run typecheck
npm run lint
npm test
npm run build
```

See [deployment notes](docs/deployment.md) for migration order, environment variables, staging checks, and the pre-existing profile-security audit required before production promotion.
