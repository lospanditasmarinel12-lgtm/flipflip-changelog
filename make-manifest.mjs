// Changelog FlipFlip+ — site index builder
// Scans ./posts/*.md, derives title/date/excerpt, writes manifest.json.
// Run from the repo root:  node make-manifest.mjs

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const postsDir = join(root, "posts");

// --- optional frontmatter: title / date / description at the top between --- ---
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { meta: {}, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: text };
  const meta = {};
  for (const line of text.slice(3, end).split("\n")) {
    const i = line.indexOf(":");
    if (i === -1) continue;
    const key = line.slice(0, i).trim().toLowerCase();
    meta[key] = line
      .slice(i + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
  return { meta, body: text.slice(end + 4) };
}

function titleOf(body) {
  const m = body.match(/^\s*#{1,2}\s+(.+)/m);
  return m ? m[1].trim() : "";
}

function excerptOf(body) {
  const noHeading = body.replace(/^\s*#.*$/m, "");
  const first = noHeading.split(/\n\s*\n/).find((p) => p.trim().length > 0) || "";
  const flat = first.replace(/[#*_`>\[\]()!]/g, "").replace(/\s+/g, " ").trim();
  return flat.length > 180 ? flat.slice(0, 180).trim() + "…" : flat;
}

// Newest-first ordering: dated posts, then version-numbered, then everything else.
function sortKey(p) {
  const date =
    p.date ||
    (p.file.match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] ||
    "";
  if (date) return { rank: 0, key: date };
  if (/^\d/.test(p.file))
    return { rank: 1, key: p.file.replace(/\d+/g, (n) => n.padStart(10, "0")) };
  return { rank: 2, key: p.file };
}

const files = readdirSync(postsDir)
  .filter((f) => f.endsWith(".md") && !f.startsWith("."))
  .sort();

const posts = files.map((file) => {
  const text = readFileSync(join(postsDir, file), "utf8");
  const { meta, body } = parseFrontmatter(text);
  return {
    file,
    title: meta.title || titleOf(body) || file.replace(/\.md$/, ""),
    date: meta.date || "",
    excerpt: meta.description || meta.excerpt || excerptOf(body),
  };
});

posts.sort((a, b) => {
  const ka = sortKey(a);
  const kb = sortKey(b);
  if (ka.rank !== kb.rank) return ka.rank - kb.rank;
  return kb.key.localeCompare(ka.key, undefined, { numeric: true });
});

writeFileSync(join(root, "manifest.json"), JSON.stringify({ posts }, null, 2) + "\n");
console.log(`manifest.json written: ${posts.length} post(s)`);
posts.forEach((p) => console.log(`  - ${p.file}  (${p.date || "undated"})`));