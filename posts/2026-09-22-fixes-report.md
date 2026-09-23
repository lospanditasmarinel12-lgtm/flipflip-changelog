---
title: FlipFlip — Reported Issues Fixed (09/22/2026)
date: 2026-09-22
description: Every fix from the release-feedback thread plus the full list of mobile (flipflip-capacitor) changes — packaged as 6.1.
---

# FlipFlip — Reported Issues Fixed (09/22/2026)

*Applies to the 6.1 release: **Flip-Electron** (desktop) and **flipflip-capacitor** (iOS / Android).*

## 1. Desktop fixes — from the release-feedback thread

Issues reported in the community release thread, now fixed and committed on the
Flip-Electron branch:

- **Duplicate "File" / "View" menu bars** (Windows and macOS) — the menu was rebuilt on
  Electron's default template, so the app now ships exactly one of each (the old code
  re-spliced duplicate menus at hard-coded indices).
- **Audio import crash** — `ENOENT: no such file or directory, mkdir
  AppData\Roaming\flipflip\imageCache\thumbs`. The `imageCache/thumbs` folder is now
  created recursively on the first audio import, so no manual folder creation is needed.
- **GIFs only looping, never advancing** — the player now reads the real GIF duration
  (`gif-info`) and progresses through the scene according to the gif timing option
  (full/partial) instead of looping forever.
- **Back button loading new images** — going back now follows the real history of shown
  items, so it always displays the media that was actually displayed before.
- **Play button dead after using Back** — the previous media is kept alive (destroyed
  only when a new one commits), so playback reliably continues after stepping back.
- **Instagram connection error ("React error #31")** — the Instagram private API is
  unmaintained and leaked memory; Instagram and Reddit scrapers were removed, which also
  deleted ~3,000 lines of dead code.
- **`pactl` spawn error on exit** — PulseAudio commands are now gated to the Linux
  system-audio capture path with error handling, so Windows no longer throws
  `spawn pactl enoent` on program exit.

## 2. Mobile changes — flipflip-capacitor

The mobile working tree shipped in 7 commits (`c7a2100..d5733a4`, 43 source files,
+3,519 / −931).

### 2.1 Local media previews play to the end

Local and Optimized files served to the WebView used to stall after the first video
fragment (~4 s) or fail entirely for moov-at-end files. Every local/file request
(including browser Range requests) is now answered as a **single 200 progressive stream**
with `Content-Length` and `Accept-Ranges: none`. Verified on device (Samsung S9+):

- fragmented optimized fMP4: plays the full ~18.45 s (was ~3.5 s), no errors.
- raw moov-at-end MP4: plays to the end (~8.82 s), no errors.

Trade-off: a seek beyond buffered data rebuffers from scratch instead of issuing a
byte-range fetch (fine for previews).

### 2.2 No white flash between scene media

`advance()` no longer clears the current media the moment the next one is scheduled. The
previously shown image/video stays on screen until its successor commits, so transitions
are an opaque swap — no blank frames (previously longest for videos, which are never
preloaded and decode slowly on older devices).

### 2.3 Drag-and-drop removed (all lists)

`react-sortable-hoc`/`react-sortablejs` usage removed from source/audio/script lists, tag
rows, scene picker and playlists — stable ordering, no accidental reorders. The VirtualList
converted to an arrow class field, fixing a `TypeError: Cannot read properties of
undefined (reading 'props')` crash on mobile.

### 2.4 List item UX — icon-click preview + Play menu

Clicking an item's icon opens its media preview; a new "Play" menu entry was added to
source/audio list rows, ahead of "Preview".

### 2.5 Media Optimization / transcoding pipeline

The native `flipflip-transcoder` plugin (Android + iOS) encodes library media into
Optimized fMP4 files (SDR 1080p, portrait/landscape) with progress/state reporting, file
validation and a durable optimization service; the renderer sides drive the optimization
card, per-source settings, conversion state and the conversion dialog.

### 2.6 Audio, meta and misc UI

Audio library loading/tagging and metadata handling refinements plus meta tag/action
plumbing for the mobile flow.

### 2.7 File import plumbing

Native file-picker wiring (`@capawesome/capacitor-file-picker`) vs web fallback for
importing sources on phones.

### 2.8 App / plugin / config plumbing

Android & iOS runtime configuration, network security policy
(`network_security_config.xml` cleartext/localhost), native plugin registration and
iOS `Info.plist`/`AppDelegate` wiring for the mobile build.