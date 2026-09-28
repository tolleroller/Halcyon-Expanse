export type ProseBlock =
  | { kind: "prose"; text: string }
  | { kind: "line"; name: string; action?: string; speech: string };

/** Chat house line: NAME (action) then quoted speech on the next line(s). */
const SPEAKER = /^([A-Z][A-Z0-9'’-]{0,24})(?:\s*\(([^)]*)\))?\s*$/;
const QUOTED = /^["“](.+)["”]\s*$/;

/**
 * Parse a story band. Dialogue is Chat form:
 *   NAME (action)
 *   "spoken words"
 * Prose paragraphs stay prose. Blank lines separate blocks.
 */
export function parseBand(band: string): ProseBlock[] {
  const blocks: ProseBlock[] = [];
  const lines = band.split("\n");
  let prose: string[] = [];
  let i = 0;

  const flushProse = () => {
    if (!prose.length) return;
    const text = prose.join(" ").replace(/\s+/g, " ").trim();
    if (text) blocks.push({ kind: "prose", text });
    prose = [];
  };

  while (i < lines.length) {
    const line = lines[i]?.trim() ?? "";
    if (!line) {
      flushProse();
      i += 1;
      continue;
    }

    const speaker = SPEAKER.exec(line);
    if (speaker) {
      const speechLines: string[] = [];
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j]?.trim() ?? "";
        if (!next) break;
        if (SPEAKER.test(next)) break;
        speechLines.push(next);
        j += 1;
      }
      if (speechLines.length) {
        flushProse();
        const joined = speechLines.join(" ");
        const quoted = QUOTED.exec(joined);
        const speech = quoted ? quoted[1].trim() : joined.replace(/^["“]|["”]$/g, "").trim();
        const action = speaker[2]?.trim();
        blocks.push({
          kind: "line",
          name: speaker[1].trim(),
          action: action || undefined,
          speech,
        });
        i = j;
        continue;
      }
    }

    prose.push(line);
    i += 1;
  }

  flushProse();
  return blocks;
}
