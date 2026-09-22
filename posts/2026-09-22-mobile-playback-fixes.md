---
title: FlipFlip+ Mobile — Playback & Transition Fixes
date: 2026-09-22
description: Local and Optimized media now play to the end in the mobile WebView, and scene transitions no longer flash white between items.
---

# FlipFlip+ Mobile — Playback & Transition Fixes

*Applies to flipflip-capacitor 6.0.0 (iOS / Android)*

## Local and Optimized media now play to the end

Previewing local or Optimized files inside the app used to stall after the first video
fragment (~4 s) or fail entirely for files with their moov atom at the end. The app now
serves local files to the WebView as a single progressive stream:

- every local/file request, including browser Range requests, returns one full `200` body
- `Content-Length` reflects the whole file and the server no longer advertises range seek
- verified on device: a moov-at-end `.mp4` plays to the end (~9 s), and a fragmented
  optimized file jumps from ~3.5 s of playback to its full ~18.5 s duration, single
  request, no playback errors

## No more white flash between scene media

When a scene advanced past an image or video, the old media was torn down the moment the
next item was scheduled, leaving a blank frame over the app's light background on
Android. The current image/video now stays on screen until its successor is actually
ready, so transitions are seamless instead of flashing white.

## Also in this working tree

- drag-and-drop removed from library lists — stable ordering, no accidental reorders, and
  a fix for a VirtualList crash on mobile
- Play / preview entries added to source and audio context menus
- the media Optimization/transcoding pipeline (encode library media into Optimized fMP4
  files with progress and state tracking)
- mobile file import and conversion-state handling
- audio library loading/tagging and metadata refinements for mobile
- Android/iOS runtime config, network security policy, and plugin wiring for the mobile build