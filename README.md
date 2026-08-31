# Changelog FlipFlip+

A simple, self-hosted changelog site for FlipFlip. Every version or notable change is a
single markdown file in [`posts/`](./posts/); the site lists them automatically and renders
them with GitHub-style formatting.

Live site: `https://lospanditasmarinel12-lgtm.github.io/flipflip-changelog/`

---

## How to add a new version / entry (the whole point)

1. Create a new markdown file in [`posts/`](./posts/).
2. Name it so it sorts where you want:
   - Version-prefixed: `6-0-0-changelog.md`, `7-0-0-updates.md`
   - Or date-prefixed: `2026-09-01-fixes.md`
3. (Optional) add frontmatter at the very top for a nicer listing:

   ```markdown
   ---
   title: FlipFlip 7.0.0
   date: 2026-09-01
   description: One-line summary shown on the post list.
   ---
   ```

4. Commit and push:

   ```bash
   git add -A
   git commit -m "Add 7.0.0 changelog"
   git push
   ```

That's it. The GitHub Actions workflow rebuilds `manifest.json` and the new post appears on
the site in ~1 minute (watch the **Actions** tab for the green "Deploy changelog site" run).

## How to edit

- Edit a post: change the file in `posts/`, commit, push — the page updates.
- You can also click **"Edit on GitHub"** at the bottom of any post page and edit it right in
  the browser (GitHub commits the change itself).

## How to publish a new release (app downloads)

The site has a **Download** button → `#/downloads` page with a "Downloads" and "Install & Use"
tab. The page reads the release tagged `latest` via the GitHub API and links each platform to
stable URLs (`…/releases/latest/download/<file>`), so **attaching the same filenames on every
release keeps the download buttons working with zero site edits**.

1. Build your artefacts and give them the standard names (see table below).
2. Create the release (run from this repo folder):

   ```bash
   STAGE=/tmp/ff-release && mkdir -p "$STAGE" && cd "$STAGE"

   # copy your artefacts here with the standard names, then:
   shasum -a 256 *.zip *.AppImage *.apk *.ipa > SHA256SUMS

   cd "$HOME/Desktop/Changelog FlipFlip+"
   gh release create v7.0.0 \
     --title "FlipFlip 7.0.0" \
     --notes "...summary + checksums..." \
     /tmp/ff-release/FlipFlip-macOS-arm64.zip \
     /tmp/ff-release/FlipFlip-macOS-x64.zip \
     /tmp/ff-release/FlipFlip-Windows-x64.zip \
     /tmp/ff-release/FlipFlip-Linux-x86_64.AppImage \
     /tmp/ff-release/FlipFlip-Audio-Setup-macOS.zip \
     /tmp/ff-release/FlipFlip-Android.apk \
     /tmp/ff-release/FlipFlip-iOS.ipa \
     /tmp/ff-release/SHA256SUMS
   ```

   (`gh release create <tag> <files…>` — files become assets with their basename.)

3. The Downloads page updates automatically: the release bar shows the new tag/date and the
   card buttons already point at `/releases/latest/download/<file>`.

**Standard asset names (keep these identical every release):**

| Platform | Asset name |
|---|---|
| macOS Apple Silicon | `FlipFlip-macOS-arm64.zip` |
| macOS Intel | `FlipFlip-macOS-x64.zip` |
| Windows x64 | `FlipFlip-Windows-x64.zip` |
| Linux x86_64 | `FlipFlip-Linux-x86_64.AppImage` |
| macOS utility | `FlipFlip-Audio-Setup-macOS.zip` |
| Android | `FlipFlip-Android.apk` |
| iOS | `FlipFlip-iOS.ipa` |
| checksums | `SHA256SUMS` |

**Remember:** binaries live **only** in GitHub Releases (the `.gitignore` blocks them from the
repo). GitHub cap is 2 GB per asset; release assets do not bloat the repo or the Pages build.

## How to preview locally

Needs a tiny local server (fetch won't work from `file://`):

```bash
cd "Changelog FlipFlip+"
node make-manifest.mjs          # regenerate the index
python3 -m http.server 8000
# open http://localhost:8000
```

## Files

| Path | Purpose |
|------|---------|
| `index.html` | The whole site: post list (filterable) + markdown rendering + hash URLs |
| `posts/*.md` | Your changelog entries — edit/add freely |
| `make-manifest.mjs` | Scans `posts/` → writes `manifest.json` (run by CI and locally) |
| `manifest.json` | Generated post index (don't edit by hand) |
| `marked.min.js` | Vendored markdown renderer (MIT) |
| `github-markdown.min.css` | GitHub's stylesheet (MIT) |
| `.github/workflows/pages.yml` | Rebuilds the index and deploys to Pages on every push |