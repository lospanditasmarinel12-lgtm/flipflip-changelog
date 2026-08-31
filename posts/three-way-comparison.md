# FlipFlip — Three-Way Comparison: Master vs Electron vs Capacitor

*Doc-based audit built from the design/plan/report md files in each repo (no code parse).*

**Repos compared**
| Repo | Version | Stack snapshot |
|---|---|---|
| `flipflip-master` (baseline) | 3.2.2 (06/2023) | Electron 4.2.12, Chromium 69, Node 10, React 17, MUI 5.10.3 (+`@mui/styles`), Webpack 4, TS 4.1.5, react-spring v8, class components |
| `Flip-Electron` | 6.0.0 | Electron 43.3.0, Chromium ~120+, React 18, MUI 6.5, Webpack 5.109, TS 5.9, @react-spring/web 10, Zustand + Immer |
| `flipflip-capacitor` | 6.0.0 | React 18, MUI 6.5, Webpack 5, TS 5.5, @react-spring/web 9, Zustand + Immer, @capacitor/core 8.4 |

Everything below is what **Electron** and/or **Capacitor** have that **master does not**.

---

## 1. Shared Upgrades — both forks over master

### 1.1 Runtime / framework
- **Electron 4.2.12 → 43.3.0** (Electron) / **→ 28.3.3** (Capacitor baseline): Chromium 69→120+, Node 10→18, removed `remote` replaced by `@electron/remote` (Electron) or IPC-less services (Capacitor).
- **React 17 → 18** (`createRoot`, automatic batching, `@types/react` 18).
- **MUI 5 → 6**: removed `@mui/styles` (makeStyles/withStyles/createStyles ~62–64 files) → `styled()` / `sx`; `@mui/icons-material` 6.x.
- **Webpack 4 → 5**: asset modules replace `file-loader`; `path-browserify` for workers; `global`/`require` shims for renderer + `nodeIntegrationInWorker:true`.
- **TypeScript 4.1 → 5.5+**.
- **react-spring v8 → v9** (`@react-spring/web`, hooks API; `Spin`/`VSpin`/`Jiggle` rewritten off `Keyframes`).
- **request → wretch** (deprecated HTTP lib removed).
- **xmldom → @xmldom/xmldom** (unmaintained/security-risk package swapped).
- **moment removed** → native `Date` / helpers.
- **Minor bumps**: emotion 11.14, core-js 3.49, codemirror 5.65, react-select 5.10, sortablejs 1.15, clsx 2.x, rimraf 5, fs-extra 11, file-url 4, get-folder-size 4, music-metadata 11, etc.

### 1.2 Architecture
- **State layer**: clean app container → **Zustand store** + **Immer immutable `produce`** (fast `===` in `shouldComponentUpdate`; `Meta.tsx` shrinks to ~30 lines of providers).
- **New Live Show playback engine** (replaces classic `ImagePlayer` + `PictureGrid`):
  - `LiveShowPlayer.tsx` — single prebuilt queue, one live media element, **destroy-on-advance** decoding, preload exactly 1 image ahead.
  - `getLiveShowList.ts` — source- vs image-weighted aware, global Fisher–Yates shuffle for random order, `filterPathsToJustPlayable`.
  - Record-only history mirror (`rec.url/source/post`) feeding bars/context menu — no classic `decodeHack`, offline cache-hit path, `continueVideo`, `_playedURLs` download tracking, or Strobe/`backForthTF` sequencer.
- **Canvas-based grid cells** in `ImageView.tsx` (cloneNode removed), `_applyGen` stale-loop guards, rAF scheduling; `[VideoTransition]` timing telemetry.
- **Batched URL updates** in `SourceScraper.tsx` (`_queueURLUpdate`/`_flushURLBatch`, 200 ms) — cuts React churn.
- **`dirOfSources` subdirectory splitting removed** → recursive scan keeps root-level files.
- **Scrapers monolith split**: Electron + Capacitor both now use a **430-line flat `Scrapers.ts`** + per-source modules (`scrapers/booru.ts`, `scrapers/other.ts`) instead of the 3,400-line workerized monolith; dead-OAuth scraper branches dropped.
- **Assets metadata**: video duration/resolution detection (`updateVideoMetadata`) + binary-header **local image dimension reader**; `PR.mediaAnalysis`.

### 1.3 Performance & memory fixes (from PERFORMANCE_REVIEW / CROSS_PLATFORM)
- Web workers **terminated on unmount**; worker refs moved from module globals → instance properties.
- **`removeEventListener`/`.bind()` listener-leak** fixed (stored bound refs / arrow props).
- **Unbounded `_playedURLs`/`_loadedURLs` arrays capped**.
- rAF `setTimeout` fallback ID stored + cleared on unmount.
- `JSON.parse(JSON.stringify(...))` deep-copies (~40 sites) → **shallow spreads / `structuredClone` / Immer**.
- `deepClone` recursive traversal → **`structuredClone`** (≈40× faster, per upgrade report).
- Filter **regex pre-compilation cache**; `flatten` → native `Array.flat()`.
- **getEffects/applyEffects base64 pipeline** (80+ `.shift()` fields) → declarative `EFFECT_KEYS` object spread.
- Cache write `Buffer.from(arrayBuffer)` (kills byte-copy loop); **`getFolderSize` cached (60 s TTL)** instead of per-write directory walk.
- **`updateTags` O(n²)→O(1)** via `Map<id,Tag>`.
- `componentDidMount` called from `componentDidUpdate` anti-pattern → React `key` prop remount.
- `Scrapers.ts` `processAllURLs` Map clone churn reduced.
- **Build/CI portability**: import `'../audio/index'` (disambiguates `Audio.tsx` vs `audio/` dir on case-insensitive FS), `.npmrc legacy-peer-deps`, Terser parallelism capped for low-RAM prod builds.

### 1.4 Operational tooling (ported to both)
- **`logging.ts`** — namespaced console gating + `window.__fflogs` dev API; **`LoggingCard`**/`LogSettings` toggles.
- **`MemoryMonitor.ts`** — hardware memory governor (zone classification GREEN/YELLOW/ORANGE/RED, cold-storage freeze/thaw/purge, preload-off/gc pressure actions).
- **`MediaBudget.ts`** — global cap on live decoded media (`perPlayerCap`, `evictColdest`).
- **`MediaInfo.ts`**, **`AutoConfig.ts`** — auto-tuning entry (Capacitor has real mobile heuristics; Electron keeps system-capability inputs).
- **`MemoryDebug.ts`** — `window.__ffdebug` telemetry.
- **`SystemCapabilities`** → IPC `system:capabilities` (Electron) / `@capacitor/device` (Capacitor).
- New `Config` keys: `maxDecodedImages`, `autoConfigEnabled`, `renderingMode`; Haptic + LogSettings namespaces; backfill migration (fully additive).

### 1.5 Haptics / audio-reactive vibrations (entirely new — no master equivalent)
- Full stack: `data/haptics/{types,index,AudioAnalyzer,HapticManager,HapticService}.ts`, `standardized-audio-context`, `@zendrex/buttplug.js`, `buttplug-wasm-blob` (embedded WASM server — no Intiface Central on desktop/Android).
- Patterns: Direct (RMS), Bass, Beat, Melody; per-motor intensity; `HapticCard`, `HapticTransportCard`, `HapticIndicator`, `@keyframes hapticPulse`; per-scene fields (`hapticsEnabled`, `hapticIntensity`, `hapticPattern`, `hapticActiveDevice`).
- **HapticService hardening (universal, from CROSS_PLATFORM_CHANGES.md):**
  - Source status tracked from raw `rmsRaw` (no LIVE/"No audio" flapping on sparse Beat/Melody).
  - **Watchdog** (5 s stuck-latch force-clear) + 3 s command timeout (stops permanent feedback death from hung Buttplug promises).
  - **Throttle** (delta 0.05 / 200 ms heartbeat) — kills ~31 cmd/s BLE flooding.
  - **Release-on-zero** — toy stops on pause/pattern dips instead of holding last level.
  - **Adaptive melody** — 2–10 kHz band with auto-gain (sample-rate aware so 48 kHz Windows loopback works); `FFT_SIZE`/`sampleRate` stamped on frames.
  - `setConfig` resets drive state on pattern switch + `stopAll()` (no stale beat history).

---

## 2. Electron-only (over master)

### 2.1 New features
- **System audio capture for haptics** — any app's output drives the toy: Win = WASAPI loopback (`desktopCapturer` + `setDisplayMediaRequestHandler`, no picker), macOS = BlackHole routing + IPC (`ElectronMacCapture`), Linux = PipeWire/PulseAudio monitor (`ElectronLinuxCapture`, `pactl`). Dormant handlers included for build parity. (iOS system-audio on desktop tooling is documented as **not feasible** — sandbox limitation.)
- **`flipflip://` custom protocol** — privileged scheme, media MIME map, Range/Content-Length byte-range seeking; `WindowManager` loads via `flipflip://./index.html`.
- **Bluetooth device picker** (`BluetoothDevicePicker`) IPC flow (`ble:show`/`ble:selected`) with 30 s auto-cancel.
- **`@electron/remote`** retained for dialogs/getPath compatibility (Capacitor drops this layer entirely).

### 2.2 Wider/Higher-trim stack
- Electron **43.3.0 + `@react-spring/web` 10** (Capacitor is on 28.3.3 / spring 9 at measurement time).
- ~1.5–2.7 GB RAM budget, `--max-old-space-size`, `webFrame.clearCache()`, optional `global.gc()` — desktop-only capabilities (documented as no-ops on mobile).

### 2.3 Still-pending (from `Flip-Electron/pending.md` / CHANGES caveats)
- `@mui/styles` remnants (only ListItem→ListItemButton done).
- `generateScenes` quadratic, `updateTags`, `processAllURLs` Map copying, `componentDidMount-from-DidUpdate`, byte-copy cache write, sync `getFolderSize` not all landed in Electron.
- `MediaBudget`/governor consumers not yet hooked into live playback in Electron.

---

## 3. Capacitor-only (over master)

### 3.1 Mobile platforms
- **`ios/` + `android/`** native projects; `@capacitor/core` 8.4, filesystem, device; `cap sync` w/ 9 plugins; SafeArea handling, splash screen, Capacitor save/restore; content-addressed imports (`imported/<sha256-prefix><ext>`) with dedupe.

### 3.2 Native plugins (new, built in `plugins/`)
- **`flipflip-transcoder`** — media optimizer: on **new imports only**, heavy camera media (HDR / >1080–1920 px / HEIC-HEIF / >8 MB) converted to **SDR 1080p** (iOS `CGImageSourceCreateThumbnailAtIndex` + `AVAssetExportSessionPreset1920x1080`; Android `ImageDecoder`/`BitmapFactory` + `MediaCodec`/`MediaMuxer` H.264), with a native progress overlay. Also fixed its pre-existing Android/iOS compile errors.
- **`flipflip-system-audio`** — mobile system-audio capture via a **native meter sidecar** (webs/WebView have no `getDisplayMedia` loopback):
  - Android **Visualizer (session 0)** — global output-mix RMS/FFT/waveform, RECORD_AUDIO prompt only.
  - Android **MediaProjection fallback** — `AudioPlaybackCaptureConfiguration` + `AudioRecord` foreground service (API-34 machinery, system consent dialog).
  - iOS **ReplayKit Broadcast Upload Extension** — `.audioApp` → vDSP FFT/RMS → compact JSON via App Group; app-side plugin polls 30 Hz (red banner/user-initiated only).
  - Feeds existing haptic pipeline via new **`AudioAnalyzer.startFromMeter()`** (no AudioContext; EMA + synthetic frames) and `NativeMeterCapture` implementing `ISystemAudioCapture`.

### 3.3 Platform abstraction layer
- **`src/renderer/services/`** replaces every Node/Electron API: `filesystem`, `filepicker`, `storage`, `save-file`, `links`, `clipboard`, `sleep`, `window`, `fonts`, `local-paths`, `audio-metadata`, `path`, `platform`; `isCapacitor()` gates.

### 3.4 Remote scrapers — working subset only (rewired but smaller)
- Ported live: **Guillula e621, danbooru, booruScrape/booruAPI (incl. safebooru), gelbooru, rule34, ehentai, luscious, bdsmlr, hydrus, piwigo** — `wretch`/`DOMParser`, wired into `SourceScraper.scrapeFiles` paging dispatch with cache-dir preload; brand SVGs in `SourceIcon`.
- **`PiwigoDialog`** + "From Piwigo" import; new compact **`RemoteSourcesCard`** (Piwigo/Hydrus test-and-save, Rule34/Gelbooru keys).
- Explicitly **skipped**: Reddit (403), Instagram private-api, Twitter/X (paid), RedGIFs, Imgur (purged), imagefap/sexcom, Gooninator, Tumblr/DeviantArt OAuth (would need app registration).

### 3.5 Mobile UX
- **Web `<input type=file>` picker** as primary import path (opens OS Photo Library/Files chooser; native picker kept as fallback).
- **Responsive overhaul** (`MOBILE_RESPONSIVE_PLAN`): PlayerBars default drawer `min(380, 100vw−48)`, wrapping toolbars/icon clusters, `{xs,sm}` responsive titles + search clamps, overlay/temporary drawers on <sm, dialog/papers clamped, long-URL ellipsis, `height:100%`→`position:absolute; inset:0` (AutoSizer fix).

### 3.6 Real-device fixes (iPhone 15 Pro / Galaxy S9+)
- ScenePicker crash on text/comment nodes (`className.baseVal` guarded).
- iOS haptics: `auto` transport now includes `capacitor-ios` (WASM + `BleClient`/CoreBluetooth) instead of localhost WS error; guarded LAN-Intiface WS retry; `HapticTransportCard` explains LAN-IP requirement.
- VideoControl `isFinite()` NaN guards (WebKit duration NaN while loading); ErrorBoundary logs React stack.

### 3.7 Release readiness
- **v6 production plan executed**: signed APK + AAB (keystore gitignored), dev-signed sideloadable `.ipa`, macOS arm64/x64 `.app` zips (ad-hoc signed, boot-verified); versioned to 6.0.0 on both repos; Electron's `SourceScraper.tsx` refactored to the non-worker Capacitor dispatch (keeping Node local/video/playlist/nimja + `flipflip://`).

---

## 4. Quick "what master lacks" summary

| Capability | Master | Electron | Capacitor |
|---|:---:|:---:|:---:|
| Modern Electron (≥22) | — | 43.3.0 | n/a (mobile) |
| React 18 / MUI 6 / TS 5 / Webpack 5 | — | ✅ | ✅ |
| Zustand + Immer state | — | ✅ | ✅ |
| Live Show engine (LiveShowPlayer) | — | ✅ | ✅ |
| Haptics (Buttplug/BLE) | — | ✅ | ✅ |
| System-audio capture | — | ✅ (loopback) | ✅ (native meter) |
| Mobile apps (iOS/Android) | — | — | ✅ |
| Memory governor / MediaBudget / logging | — | ✅ | ✅ |
| Canvas-grid rendering | — | ✅ | ✅ |
| Worker lifecycle fixes / perf pass | — | ✅ | ✅ |
| `flipflip://` protocol + byte-range | — | ✅ | — |
| Native transcoder (SDR 1080p on import) | — | — | ✅ |
| Responsive mobile UI | — | — | ✅ |
| Remote sources (working subset) | many (broken) | full (ported subset) | subset refit |

---

## 5. Notes / gaps consumers should know
- **`logs.md`** (iOS Capacitor run log) shows app boots on-device (FlipAudioPlayer, Filesystem reads, `data.json` load) — used to drive the Phase-6 device fixes, not a feature list.
- The Capacitor port intentionally **does not include** `src/main/*` multi-window, `webFrame`/`global.gc`, RenderingMode semantics, OAuth1 flows, deep-link scene auto-start, or MD5 thumbnail cache (keeps djb2); Electron retains desktop-only concepts (portable-mode override is a stub on mobile).
- **Windows build session** (`CROSS_PLATFORM_CHANGES.md`) fixes are marked `[UNIVERSAL]`/`[WINDOWS]`/`[BUILD]` and apply to both forks (import path, frame plumbing, HapticService hardening, main.ts handler, caption, build env).