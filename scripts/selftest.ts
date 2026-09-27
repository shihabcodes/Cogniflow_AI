/**
 * Dependency-free sanity checks for the retrieval core (no API key needed):
 *   npm run selftest
 */
import { chunkText, chunkTranscript, CHUNK_TARGET_CHARS } from "../lib/chunk";
import { bm25, cosineSim, topK } from "../lib/vector";
import { answerToMarkdown, linkCitations, parseCitations } from "../lib/citations";
import type { Source } from "../lib/types";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

// --- chunkText ---
const long = Array.from({ length: 40 }, (_, i) => `Paragraph ${i}. ${"Lorem ipsum dolor sit amet. ".repeat(8)}`).join("\n\n");
const chunks = chunkText(long);
check("chunkText splits long text", chunks.length > 1, `got ${chunks.length}`);
check("chunks stay near target size", chunks.every((c) => c.length <= CHUNK_TARGET_CHARS * 2), `max ${Math.max(...chunks.map((c) => c.length))}`);
check("short text stays one chunk", chunkText("hello world").length === 1);
check("empty text yields no chunks", chunkText("   ").length === 0);
const joined = chunks.join(" ");
check("no content lost to overlap trimming", joined.includes("Paragraph 39."), "");

// --- chunkTranscript ---
const entries = Array.from({ length: 30 }, (_, i) => ({
  text: `line ${i} of the talk. `.repeat(4),
  offset: i * 4000,
}));
const tchunks = chunkTranscript(entries);
check("chunkTranscript groups entries", tchunks.length > 1 && tchunks.length < 30);
check("chunk start times are ascending seconds", tchunks.every((c, i) => i === 0 || c.startTimeSec > tchunks[i - 1].startTimeSec));
check("start time is seconds not ms", tchunks[0].startTimeSec === 0);

// --- cosine / topK ---
check("identical vectors → 1", Math.abs(cosineSim([1, 2, 3], [1, 2, 3]) - 1) < 1e-9);
check("orthogonal vectors → 0", Math.abs(cosineSim([1, 0], [0, 1])) < 1e-9);
const sources: Source[] = [
  {
    id: "a", type: "text", title: "A", addedAt: 1,
    chunks: [
      { text: "close", vector: [1, 0] },
      { text: "far", vector: [0, 1] },
    ],
  },
];
const hits = topK([0.9, 0.1], "", sources, 1);
check("topK ranks by similarity", hits[0].chunk.text === "close");

// --- keyword (BM25) + hybrid fusion ---
const docs: Source[] = [
  {
    id: "b", type: "text", title: "B", addedAt: 1,
    chunks: [
      { text: "General notes about sleep and routines.", vector: [1, 0] },
      { text: "Adenosine builds up while awake; caffeine blocks adenosine receptors.", vector: [0, 1] },
      { text: "Morning light exposure helps set circadian rhythm.", vector: [0.9, 0.1] },
    ],
  },
];
const kw = bm25("adenosine", docs[0].chunks);
check("bm25 scores only chunks containing the term", kw[1] > 0 && kw[0] === 0 && kw[2] === 0);
check("bm25 is case-insensitive", bm25("ADENOSINE", docs[0].chunks)[1] === kw[1]);
const hybrid = topK([1, 0], "adenosine", docs, 2);
check("hybrid surfaces an exact keyword match the vector missed", hybrid.some((h) => h.chunk.text.includes("Adenosine")));
check("hybrid keeps the best semantic match too", hybrid.some((h) => h.chunk.text.startsWith("General")));

// --- citations ---
const tokens = parseCitations("The sky is blue [1]. Water is wet [2][3].");
check("citations parsed", tokens.filter((t) => t.kind === "cite").length === 3);
check("text preserved around citations", tokens[0].kind === "text" && tokens[0].value.includes("The sky is blue"));
check(
  "citations become markdown links without breaking lists",
  linkCitations("- **Fast** setup [1]\n- Cheap [2][3]") ===
    "- **Fast** setup [1](#cite-1)\n- Cheap [2](#cite-2)[3](#cite-3)"
);

const md = answerToMarkdown("Caffeine blocks adenosine [2].", [
  { n: 1, text: "", sourceTitle: "Unused", sourceType: "text" },
  { n: 2, text: "", sourceTitle: "Sleep Talk", sourceType: "youtube", videoId: "abcdefghijk", startTimeSec: 75 },
]);
check("markdown export lists only cited sources", md.includes("[2] [Sleep Talk @ 1:15](https://www.youtube.com/watch?v=abcdefghijk&t=75s)") && !md.includes("Unused"));

console.log(failures === 0 ? "\nAll checks passed ✅" : `\n${failures} check(s) FAILED ❌`);
process.exit(failures === 0 ? 0 : 1);
