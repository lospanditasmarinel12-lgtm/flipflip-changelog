# FlipFlip — Everything We Built Together

*What changed versus the original FlipFlip `master` (v3.2.2, 2023)*

This is a plain-language account of all the upgrades, fixes, improvements and brand-new
features we shipped together across two branches:

- **Flip-Electron** — the modern desktop app (Windows / macOS / Linux)
- **flipflip-capacitor** — the new mobile app (iOS / Android)

Everything below is work that does **not exist in the original master branch**. Both
branches are versioned **6.0.0**.

---

## In one paragraph

We took FlipFlip out of a 2019-era toolchain (Electron 4, React 17, Webpack 4) and rebuilt it
on modern foundations (Electron 28–43 / React 18 / MUI 6 / Webpack 5 / TypeScript 5), added a
whole new audio-reactive **haptic feedback** system, rewrote the playback engine to be far
lighter on memory, took the app to **real phone apps** for iOS and Android, reworked the
scrapers to the ones that still work today, and fixed a long list of leaks and performance
bugs along the way.

---

## 1. The modernization (what we upgraded the stack to)

These are the foundation changes that made everything else possible.

**Both platforms**
| Piece | Master (old) | Now |
|---|---|---|
| Desktop runtime | Electron 4.2.12 (Chromium 69) | Electron 28→43 (Chromium 120+) |
| UI framework | React 17 | React 18 (`createRoot`, automatic batching) |
| Component library | MUI 5 + deprecated `@mui/styles` | MUI 6 (all 60+ files rewritten to `styled`/`sx`, `@mui/styles` removed) |
| Build tool | Webpack 4 | Webpack 5 (asset modules, no more `file-loader`/Sass) |
| Language | TypeScript 4.1 | TypeScript 5.5+ |
| Animations | react-spring v8 (render-props) | `@react-spring/web` v9 hooks (`useSpring`/`useTransition`) |
| HTTP | deprecated `request` | `wretch` |
| XML | abandoned `xmldom` (security risk) | `@xmldom/xmldom` |
| Dates | `moment` | native `Date` helpers |
| State | one giant mutable app class | **Zustand** store + **Immer** immutable updates |
| Other deps | — | emotion, core-js, codemirror, sortablejs, clsx, rimraf, fs-extra, music-metadata and ~20 more bumped to current minor/major |

---

## 2. Brand-new playback engine ("Live Show")

We replaced the classic `ImagePlayer`/`PictureGrid` preloading pipeline with a new engine:

- **One live media element** walks a single prebuilt queue — no more hoarding decoded images.
- **Destroy-on-advance** decoding: the moment an item is shown, its decoded buffer is released so memory becomes garbage-collectable.
- **Preload exactly one image ahead** (videos/nimja never), with token-guarded decode.
- **Back/forth** keeps only the immediately-previous item alive; older ones rebuild from the URL queue.
- A **record-only history mirror** (URL / source / post, capped) feeds the player bars and context menu instead of holding live elements.
- Smarter queue rules: image-weighted play order, one global shuffle for random playback (no more `flipflip://` directory errors), and every entry filtered to playable files up front.
- Folder sources now **scan recursively including root-level files** (the old code silently dropped files in the root folder).
- **Canvas-based grid cells** (no re-decoding cloned video/image per cell), with stale-loop guards and rAF-driven drawing.

---

## 3. Haptic feedback (big new feature)

Haptic devices (any BLE toy that speaks the Buttplug protocol) now vibrate **in sync with audio**.

- Works straight from the app on desktop and Android (embedded WASM server) or via the phone's Bluetooth (iOS uses the Web Bluetooth polyfill over CoreBluetooth).
- Four response patterns: **Direct** (loudness), **Bass**, **Beat**, and **Melody**.
- **Per-motor intensity sliders** and a device/status indicator in the player.
- System-audio mode drives haptics from **whatever your computer plays** (YouTube, a game, any media app) — not just FlipFlip's own tracks:
  - Windows: output loopback (WASAPI), no picker dialog.
  - macOS: routes output through BlackHole and back to your speakers.
  - Linux: PipeWire/PulseAudio monitor.
- Reliability fixes that matter in real use:
  - Watchdog + command timeout so a hung Bluetooth write can never freeze feedback permanently.
  - Command throttling so we don't flood the toy (~31 commands/sec → 5/sec heartbeats).
  - **Release-on-zero** — pausing or a beat gap actually stops the toy (BLE toys hold their last intensity forever otherwise).
  - Adaptive melody with auto-gain, so low system volume still reads with full dynamics; source-status no longer flaps between "LIVE" and "No audio detected".

---

## 4. Mobile — FlipFlip is now an iPhone and Android app

The Capacitor branch turned the desktop app into real mobile apps.

- **iOS and Android projects** wired to the web app, with safe-area handling, splash screen and proper app storage.
- **Native media optimizer** (`flipflip-transcoder`, iOS + Android): heavy camera files (HDR, >1080p, HEIC/HEIF, >8 MB) are converted to **SDR 1080p** on import so slideshows run smooth on a phone — and only the converted copy is kept.
- **Native audio player plugin** (`flipflip-audio-player`) for reliable on-device playback.
- **Import UX built for phones**: picks open the OS photo library / Files chooser directly; imports are content-addressed, so re-picking the same file never duplicates storage.
- **System-audio capture on mobile** via a native sidecar meter that feeds the same haptic pipeline:
  - Android: global output-mix **Visualizer** (one audio permission prompt) with a **MediaProjection** fallback for apps the visualizer can't see.
  - iOS: a **ReplayKit Broadcast extension** computes RMS/spectrum in a native process and feeds it back via an App Group.

---

## 5. Remote sources — kept working, cut the dead weight

The internet changed a lot since master; we kept the scrapers that still work and removed the ones that died.

- **Ported and re-tested:** e621, Danbooru, Safebooru/Booru API, Gelbooru, Rule34, EHentai, Luscious, BDSMlr, Hydrus, Piwigo (+ Piwigo import dialog and a new compact Remote Sources settings card).
- The old giant scraper file was split into clean per-source modules that are far easier to maintain.
- **Removed (dead APIs in 2026):** Reddit (HTTP 403), Twitter/X (paid), Instagram private API (unmaintained), RedGIFs, Imgur (purged), imagefap/sex.com, Gooninator. This also deleted ~3,000 lines and a bevy of abandoned npm packages.

---

## 6. Memory governor & developer tooling

- **`MemoryMonitor`** — a real memory governor that watches RAM/heap/GPU pressure, classifies into GREEN/YELLOW/ORANGE/RED zones, and reacts: it freezes/purges cold images first (`cold storage`, ~8 MB freed per 1080p image), limits preloading, and can force GC. Tuning is mobile-aware (tighter thresholds, no VRAM polling).
- **`MediaBudget`** — a global cap on how many live decoded images can exist across players (`evictColdest`).
- **`MediaInfo` / `AutoConfig` / `SystemCapabilities`** — the app inspects its machine (desktop) or device (mobile) and tunes itself: `maxDecodedImages` default, auto-config toggle, rendering mode.
- **Namespaced logging & diagnostics** — settings toggles per subsystem (imagePlayer, memory, audio, haptics, ble, storage…) plus a `window.__fflogs` debug API and Settings → Logging & Diagnostics UI.
- **Video + local-image metadata analysis** with a binary-header dimension reader (no ffprobe subprocess needed).

---

## 7. Long list of bug fixes and performance fixes

Things that were leaking, freezing, or slow in master, now fixed:

**Memory leaks (the big ones)**
- Web workers created on every scene switch were **never terminated** → now `.terminate()` on every path, and workers are no longer shared module globals.
- Listeners attached with `.bind(this)` were accumulating forever (removeEventListener couldn't match) → stored bound refs.
- `_playedURLs` / `_loadedURLs` arrays grew without bound on long slideshows → capped.
- Instagram client/session globals leaked across scenes → cleanup on transition.
- rAF fallback `setTimeout` fired after unmount → cleared on unmount.

**Performance**
- ~40 `JSON.parse(JSON.stringify())` deep copies replaced with spreads / `structuredClone` (~40× faster) / Immer.
- Gigantic effect serialization (base64 CSV with 80+ comma fields) replaced with a clean object spread.
- Filter regexes pre-compiled instead of rebuilt in hot loops; `flatten` → native `Array.flat()`.
- Tag updates changed from O(n²) nested lookups to a hash map.
- Cache folder size no longer re-walks the disk on every write (60 s cache); cache writes use `Buffer.from()`.
- Scene re-generation debounced; `setState` calls from scraper loops batched (200 ms).
- Slider/video guards added (`isFinite()` on NaN durations) and capture card never regresses on invalid values.

**Cross-platform / build fixes**
- Import path fix so the same code compiles on case-sensitive (mac/Linux) and case-insensitive (Windows) filesystems.
- Windows-only system-audio fix (`getDisplayMedia` handler in main process).
- Production build no longer OOMs on 8 GB machines (Terser parallelism capped); `legacy-peer-deps` support.

**Real-device mobile fixes**
- ScenePicker crash on text/comment nodes (WebKit `className.baseVal` errors).
- iOS haptics now uses the phone's own Bluetooth instead of a wrong localhost websocket; a clear message when Bluetooth is off.
- Error boundaries now log the React stack to the console for readable device failures.

---

## 8. A note on version history

Master's own changelog ends at v3.2.2 (June 2023). All of the above is what we added on top —
running through **6.0.0** on both branches, with signed Android APK/AAB, a sideloadable iOS
`.ipa`, and packaged macOS arm64/x64 apps.

---

## Known limitations (honest disclosure)

- A few legacy relics remain: some `@mui/styles` leftovers in the Electron branch, and the
  Ionic `system-font-families` native module needs an ABI rebuild for packaging.
- Scene generation with huge libraries can still block the main thread briefly (a worker
  offload is on the roadmap).
- iOS system-audio capture only works while the user starts a screen Broadcast (Apple
  sandbox limitation — no app can silently capture another app's audio on iOS).
- Haptic toys are a nice-to-have: everything degrades gracefully with no device connected.

---

*Work done together across the Flip-Electron and flipflip-capacitor branches. Both are version
6.0.0 and share the same feature set where the platform allows it.*