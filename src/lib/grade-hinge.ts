import story from "../content/story.json";

export type HingeBand = "strong" | "adequate" | "weak";

export type HingeGrade = {
  band: HingeBand;
  note: string;
};

const strongHints = (story.hinge.strongHints ?? []).filter(
  (hint) => !["slate", "board", "paper", "occupancy"].includes(hint.toLowerCase()),
);
const adequateHints = story.hinge.adequateHints ?? [];

/**
 * Stub classifier for Hinge A. Same signature when a model is swapped in later.
 * Never shown to the player. Empty or nonsense is weak. The story continues.
 * Bands follow the hint lists in the live story.json.
 */
export function gradeHinge(id: string, text: string): HingeGrade {
  const raw = text.trim();
  if (!raw || !/[a-z0-9]/i.test(raw)) {
    return { band: "weak", note: `${id}: empty or nonsense.` };
  }

  const t = raw.toLowerCase();

  if (mentions(t, strongHints)) {
    return { band: "strong", note: `${id}: names the mismatch. The slate is not the board.` };
  }

  if (mentions(t, adequateHints) && !blessesSlate(t)) {
    return { band: "adequate", note: `${id}: wants to look without saying the slate is wrong.` };
  }

  return {
    band: "weak",
    note: blessesSlate(t) ? `${id}: trusts the slate.` : `${id}: nothing useful about the bus or the paper.`,
  };
}

function mentions(text: string, hints: string[]): boolean {
  return hints.some((hint) => {
    const word = hint.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!word) return false;
    return new RegExp(`(?:^|[^a-z0-9])${word}(?=$|[^a-z0-9])`, "i").test(text);
  });
}

function blessesSlate(t: string): boolean {
  return (
    /\b(trust|trusts|trusting|believe|believes|agree|agrees)\b[^.]{0,48}\b(slate|file|paper)\b/.test(t) ||
    /\b(slate|file|paper)\b[^.]{0,48}\b(is|looks|seems)\s+(right|correct|clean|fine|good|true|accurate|okay|ok|stable|ready)\b/.test(
      t,
    ) ||
    /\bbus is stable\b/.test(t) ||
    /\bgo ahead and open\b/.test(t)
  );
}
