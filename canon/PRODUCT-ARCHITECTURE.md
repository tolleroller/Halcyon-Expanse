# Halcyon Expanse — product architecture (EP-facing)

Living doc for Joshua (executive producer / player). No plot spoilers.

## Lock (Joshua)

1. **Story / first chapter first.** Look, feel, and tone alignment before anything else.
2. **Engagement is deferred** until Joshua places it — when Eli faces a real decision. Not forced early for product reasons.
3. **Season shape still stands** as design (~rooms + eventual hinges). Timing of when a hinge appears is deferred, not cancelled.
4. **Current live:** Chapter 1 *Arrival* (~12 pages). Early hinge parked (`afterPage: __deferred__`). Last page ends the chapter cleanly.

## What the product is

A mobile painted graphic novel you speak into once or twice a season — when the story earns it.

- About 90% novel. About 10% agency (when placed).
- Not a game: no episodes menu, XP, levels, quizzes, choice menus, or speech balloons.
- Player is Eli Hale, Systems Engineer on RSV Vesper over Halden-4 — not command.
- Cover promise (painted on the plate): “A portal into another world.” / “A graphic novel that hears you.”
- Button: BEGIN. Trailer optional and skippable.

## Who does what

| Role | Who | Owns |
|---|---|---|
| Executive producer / player | Joshua | Vision, feel, go/no-go, playtesting. Does not read full script. |
| Director / architect | Director Of Halcyon | Product architecture, PWA, engineering, team coordination, shipping. |
| Writer | Halcyon Writer | Prose, character, season arcs. Delivers page JSON. Spoiler-safe summaries for Joshua. |
| Art | Halcyon Art | Plates, cover polish, visual continuity. Candidates before live replace. |
| Media (later) | TBD | Trailer, sound, music, VO when we open that lane. |

## How a chapter feels

1. Full-bleed painting.
2. Optional italic scene line on the art.
3. Story lives in a bottom pull-panel (not a fixed caption strip).
4. Tap / swipe turns pages. One painting may carry one finished beat — not three thin repeats.
5. At a hinge (when live): empty field, quiet Send. Band is never printed. Story always continues.
6. Aftermath is a short colored beat, then the book is the book again.

## Season shape (non-spoiler)

Season 1 is roughly ten rooms and eventual hinges — design intent, not a ship-now checklist.

- Hinges appear when Eli faces a real decision; Joshua places them.
- Weak answers do not ruin the season; crew covers the necessary next step; Eli lives with a short aftermath.
- Season ends when the clinic opens honest or opens late with the truth on the record. The Expanse continues later.

Exact room contents stay with Writer + Director. Joshua confirms direction from spoiler-free briefs and optional tone samples only.

## Current live slice

Shipped at https://tolleroller.github.io/Halcyon-Expanse/

- Cover + trailer + BEGIN
- Chapter 1 *Arrival* (~12 pages): faces, ship life, briefing, down to the clinic first look
- Early hinge parked — reader treats deferred / missing / unknown `afterPage` as inactive
- Chapter ends on the last page (no empty join, no forced engagement)

Repo: https://github.com/tolleroller/Halcyon-Expanse  
Host: GitHub Pages (`gh-pages`). Source on `main`. App under `/workspace/halcyon-expanse/app`.

## Deferred: engagement pipeline (future)

When Joshua places a hinge:

1. Voice / text box (player speaks or types as Eli).
2. Model grades with boxed story context (no free-form chat UI).
3. Classify into 2–3 bands (strong / adequate / weak — labels never shown to the player).
4. Short reaction slides (aftermath), then the book continues.

Hinge UI code paths stay in the reader, gated off until `afterPage` points at a real live page id.

## Build rules we keep

- Joshua feeds notes; hold until he says go when he asks for hold. Otherwise ship reversible playtest fixes.
- One visual language. No second art style, cream paper, or balloons.
- Dialogue: name on its own line, (action), quoted speech.
- Clues are sci-fi systems mismatches (two clocks, stuttering power, paper vs board). No earth field-kit mysteries.
- New paintings only when Joshua sends or accepts a candidate.
- Save key bumps when page list changes so old saves don’t skip chapters.

## Next steps

1. Playtest Chapter 1 feel (look / tone / pacing) with Joshua.
2. Art plate gaps (see `CHAPTER-1-PLATE-GAPS.md`).
3. Place engagement when Joshua says — not before.
4. Rest of season later (outline, art, later hinges) after Chapter 1 feels right.

## Terminology (parked)

Episode / chapter / room / scene — we’ll pick player-facing words later so we don’t confuse the book with a game. Internally we can say “rooms” until then.
