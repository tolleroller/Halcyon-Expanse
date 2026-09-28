import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { assetUrl, book, type PlateBeat } from "../lib/book";
import { gradeHinge, type HingeBand } from "../lib/grade-hinge";
import { parseBand } from "../lib/prose";

const SAVE_KEY = "halcyon-expanse-v8";

const MAX_LIFT = 0.9;
const PEEK_FALLBACK = 60;

type Phase =
  | { kind: "opening" }
  | { kind: "page"; index: number }
  | { kind: "hinge" }
  | { kind: "aftermath"; index: number; band: HingeBand }
  | { kind: "join"; index: number; band: HingeBand };

function isBand(value: unknown): value is HingeBand {
  return value === "strong" || value === "adequate" || value === "weak";
}

function loadPhase(): Phase | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Phase>;
    if (data.kind === "page" && typeof data.index === "number") {
      if (data.index >= 0 && data.index < book.pages.length) return { kind: "page", index: data.index };
    }
    if (data.kind === "hinge") {
      // Parked / inactive hinge: never resume into hinge UI from an old save.
      if (!isHingeActive()) return { kind: "page", index: Math.max(0, book.pages.length - 1) };
      return { kind: "hinge" };
    }
    if (
      (data.kind === "aftermath" || data.kind === "join") &&
      isBand(data.band) &&
      typeof data.index === "number"
    ) {
      if (!isHingeActive()) return { kind: "page", index: Math.max(0, book.pages.length - 1) };
      const list = data.kind === "aftermath" ? book.aftermath[data.band] : book.join;
      if (data.index >= 0 && data.index < list.length) {
        return { kind: data.kind, index: data.index, band: data.band };
      }
    }
  } catch {
    /* ignore a bad save; the book starts at the cover */
  }
  return null;
}

function useKeyboardInset() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const sync = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      document.documentElement.style.setProperty("--kb", `${inset}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    return () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
      document.documentElement.style.removeProperty("--kb");
    };
  }, []);
}

export function Reader() {
  const [hydrated, setHydrated] = useState(false);
  const [phase, setPhase] = useState<Phase>({ kind: "opening" });
  useKeyboardInset();

  useEffect(() => {
    const saved = loadPhase();
    if (saved) setPhase(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (phase.kind === "opening") {
      localStorage.removeItem(SAVE_KEY);
      return;
    }
    localStorage.setItem(SAVE_KEY, JSON.stringify(phase));
  }, [hydrated, phase]);

  if (!hydrated || phase.kind === "opening") {
    return <Opening onBegin={() => setPhase({ kind: "page", index: 0 })} />;
  }

  return <Book phase={phase} onPhase={setPhase} />;
}

function Opening({ onBegin }: { onBegin: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  function enterBook() {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
    setPlaying(false);
    onBegin();
  }

  async function playTrailer() {
    const video = videoRef.current;
    if (!video) return;
    video.playsInline = true;
    video.muted = false;
    try {
      video.currentTime = 0;
    } catch {
      /* the reel can start wherever it is */
    }
    try {
      await video.play();
      setMuted(false);
      setPlaying(true);
    } catch {
      video.muted = true;
      try {
        await video.play();
        setMuted(true);
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    }
  }

  function unmute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    void video.play().catch(() => {});
  }

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onEnded = () => setPlaying(false);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("ended", onEnded);
      video.pause();
    };
  }, []);

  const cover = assetUrl(book.cover);
  const trailer = assetUrl(book.trailer);

  return (
    <main className="stage" aria-label={book.title}>
      <img className="plate cover" src={cover} alt="" />
      <video
        ref={videoRef}
        className={playing ? "plate cover video on" : "plate cover video"}
        src={trailer}
        poster={cover}
        playsInline
        preload="metadata"
      />
      {playing ? <button type="button" className="hit" aria-label="Leave the reel" onClick={enterBook} /> : null}
      {playing && muted ? (
        <button type="button" className="sound-hint" onClick={unmute}>
          Tap for sound
        </button>
      ) : null}
      {playing ? (
        <button type="button" className="skip" onClick={enterBook}>
          Skip
        </button>
      ) : (
        <button type="button" className="skip" onClick={playTrailer}>
          Play
        </button>
      )}
      <button type="button" className="begin on" onClick={enterBook}>
        {book.beginLabel}
      </button>
    </main>
  );
}

function isChromeTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest("textarea, .field, .send, .back, .sheet"));
}

function Book({ phase, onPhase }: { phase: Exclude<Phase, { kind: "opening" }>; onPhase: (next: Phase) => void }) {
  const beat = currentBeat(phase);
  const canTurn = phase.kind !== "hinge" && !isLast(phase);
  const sheetRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const gripDrag = useRef<{ y: number; lift: number; max: number; peek: number; id: number } | null>(null);
  const [lift, setLift] = useState(0);
  const [draggingSheet, setDraggingSheet] = useState(false);
  const liftRef = useRef(0);
  liftRef.current = lift;
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const swallowClick = useRef(false);

  function turn() {
    if (phase.kind === "page") {
      const page = book.pages[phase.index];
      const hingePage = hingeAfterPageId();
      // Only enter hinge when afterPage is a real live page id (not deferred/missing).
      if (hingePage && page?.id === hingePage) {
        onPhase({ kind: "hinge" });
        return;
      }
      if (phase.index < book.pages.length - 1) onPhase({ kind: "page", index: phase.index + 1 });
      return;
    }
    if (phase.kind === "aftermath") {
      const list = book.aftermath[phase.band];
      if (phase.index < list.length - 1) {
        onPhase({ kind: "aftermath", index: phase.index + 1, band: phase.band });
      } else if (book.join.length > 0) {
        onPhase({ kind: "join", index: 0, band: phase.band });
      }
      return;
    }
    if (phase.kind === "join" && book.join.length > 0 && phase.index < book.join.length - 1) {
      onPhase({ kind: "join", index: phase.index + 1, band: phase.band });
    }
  }

  function back() {
    if (phase.kind === "page") {
      if (phase.index > 0) onPhase({ kind: "page", index: phase.index - 1 });
      else onPhase({ kind: "opening" });
      return;
    }
    if (phase.kind === "hinge") {
      onPhase({ kind: "page", index: afterPageIndex() });
      return;
    }
    if (phase.kind === "aftermath") {
      if (phase.index > 0) onPhase({ kind: "aftermath", index: phase.index - 1, band: phase.band });
      else onPhase({ kind: "hinge" });
      return;
    }
    if (phase.index > 0) onPhase({ kind: "join", index: phase.index - 1, band: phase.band });
    else onPhase({ kind: "aftermath", index: book.aftermath[phase.band].length - 1, band: phase.band });
  }

  function send(text: string) {
    const grade = gradeHinge(book.hinge.id, text);
    console.info("[hinge]", grade.note);
    onPhase({ kind: "aftermath", index: 0, band: grade.band });
  }

  function sheetMetrics(fromLift: number) {
    const sheet = sheetRef.current;
    const stage = sheet?.parentElement;
    const stageH = stage?.getBoundingClientRect().height ?? window.innerHeight;
    const kb = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--kb")) || 0;
    const max = Math.max(80, stageH - kb);
    const current = sheet?.getBoundingClientRect().height ?? PEEK_FALLBACK;
    // height = peek + lift * (max - peek)  =>  peek = (current - lift * max) / (1 - lift)
    const peek = (current - fromLift * max) / Math.max(0.001, 1 - fromLift);
    return { max, peek: Number.isFinite(peek) && peek > 20 ? peek : PEEK_FALLBACK };
  }

  function onGripPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const { max, peek } = sheetMetrics(liftRef.current);
    gripDrag.current = { y: event.clientY, lift: liftRef.current, max, peek, id: event.pointerId };
    setDraggingSheet(true);
  }

  function onGripPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = gripDrag.current;
    if (!start || start.id !== event.pointerId) return;
    const range = Math.max(1, start.max - start.peek);
    const next = start.lift + (start.y - event.clientY) / range;
    setLift(Math.min(MAX_LIFT, Math.max(0, next)));
  }

  function onGripPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const start = gripDrag.current;
    gripDrag.current = null;
    setDraggingSheet(false);
    if (!start || start.id !== event.pointerId) return;
    if (Math.abs(start.y - event.clientY) < 8) {
      setLift(start.lift < 0.08 ? 0.58 : 0);
      return;
    }
    setLift((value) => {
      if (value < 0.08) return 0;
      if (value > 0.72) return MAX_LIFT;
      return value;
    });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest("textarea, input")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        turn();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.button !== 0 || isChromeTarget(event.target)) {
      drag.current = null;
      return;
    }
    drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
  }

  function onPointerUp(event: ReactPointerEvent<HTMLElement>) {
    const start = drag.current;
    drag.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.15) return;
    swallowClick.current = true;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 400);
    if (dx > 0) back();
    else turn();
  }

  function onStageClick(event: ReactMouseEvent<HTMLElement>) {
    if (swallowClick.current) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(".hit, .back, .send, textarea, .field, .sheet")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX - rect.left < rect.width * 0.34) back();
    else turn();
  }

  const beatId =
    phase.kind === "page" ? `page-${phase.index}` : phase.kind === "hinge" ? "hinge" : `${phase.kind}-${phase.index}`;

  useEffect(() => {
    setLift(0);
    const body = bodyRef.current;
    if (body) body.scrollTop = 0;
  }, [beatId]);

  useEffect(() => {
    const veil = bodyRef.current;
    if (!veil) return;
    let startY = 0;
    let startLift = 0;
    let collapsing = false;

    const onStart = (event: TouchEvent) => {
      if (liftRef.current < 0.08 || event.touches.length !== 1) return;
      startY = event.touches[0].clientY;
      startLift = liftRef.current;
      collapsing = false;
    };

    const onMove = (event: TouchEvent) => {
      if (liftRef.current < 0.08 || event.touches.length !== 1) return;
      const dy = event.touches[0].clientY - startY;
      if (veil.scrollTop <= 0 && dy > 0) {
        collapsing = true;
        event.preventDefault();
        const { max, peek } = sheetMetrics(startLift);
        const range = Math.max(1, max - peek);
        setLift(Math.min(MAX_LIFT, Math.max(0, startLift - dy / range)));
      } else if (collapsing) {
        collapsing = false;
        startY = event.touches[0].clientY;
        startLift = liftRef.current;
      }
    };

    const settle = () => {
      if (!collapsing) return;
      collapsing = false;
      setLift((value) => {
        if (value < 0.08) return 0;
        if (value > 0.72) return MAX_LIFT;
        return value;
      });
    };

    veil.addEventListener("touchstart", onStart, { passive: true });
    veil.addEventListener("touchmove", onMove, { passive: false });
    veil.addEventListener("touchend", settle);
    veil.addEventListener("touchcancel", settle);
    return () => {
      veil.removeEventListener("touchstart", onStart);
      veil.removeEventListener("touchmove", onMove);
      veil.removeEventListener("touchend", settle);
      veil.removeEventListener("touchcancel", settle);
    };
  });

  return (
    <main
      className="stage"
      aria-label={book.title}
      data-beat={beatId}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onClickCapture={(event) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={onStageClick}
    >
      <img key={beat.plate} className="plate" src={assetUrl(beat.plate)} alt="" />
      <div className="hits">
        <button type="button" className="hit hit-back" aria-label="Previous" onClick={back} />
        {canTurn ? <button type="button" className="hit hit-forward" aria-label="Continue" onClick={turn} /> : null}
      </div>
      <button type="button" className="back" onClick={back} aria-label="Back">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M14.5 5.5 8 12l6.5 6.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {beat.top ? <p className="top">{beat.top}</p> : null}
      <section
        ref={sheetRef}
        className={["sheet", draggingSheet ? "dragging" : "", lift < 0.1 ? "peek" : ""].filter(Boolean).join(" ")}
        style={{ "--lift": lift } as CSSProperties}
        aria-label="Story"
      >
        <button
          type="button"
          className="sheet-grip"
          aria-expanded={lift > 0.08}
          aria-label={lift < 0.08 ? "Open the story" : "Resize the story"}
          onPointerDown={onGripPointerDown}
          onPointerMove={onGripPointerMove}
          onPointerUp={onGripPointerUp}
          onPointerCancel={() => {
            gripDrag.current = null;
            setDraggingSheet(false);
          }}
        >
          <span className="sheet-rail" aria-hidden="true" />
          <span className="grip" />
          <span className="sheet-tag">STORY</span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d={lift > MAX_LIFT * 0.85 ? "M6 10.5 12 16.5l6-6" : "M6 14.5 12 8.5l6 6"}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="veil" ref={bodyRef}>
          {phase.kind === "hinge" ? (
            <HingeField placeholder={book.hinge.placeholder ?? ""} onSend={send} />
          ) : beat.band ? (
            <BandText key={`${phase.kind}-${"index" in phase ? phase.index : 0}-${beat.band}`} band={beat.band} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

/** Active hinge target, or null when parked / invalid (never fire from turn). */
function hingeAfterPageId(): string | null {
  const id = book.hinge.afterPage?.trim() ?? "";
  if (!id || id === "__deferred__") return null;
  return book.pages.some((page) => page.id === id) ? id : null;
}

function isHingeActive(): boolean {
  return hingeAfterPageId() !== null;
}

function afterPageIndex(): number {
  const id = hingeAfterPageId();
  if (!id) return Math.max(0, book.pages.length - 1);
  const index = book.pages.findIndex((page) => page.id === id);
  return index >= 0 ? index : Math.max(0, book.pages.length - 1);
}

function currentBeat(phase: Exclude<Phase, { kind: "opening" }>): PlateBeat {
  if (phase.kind === "page") return book.pages[phase.index];
  if (phase.kind === "hinge") return { plate: book.hinge.plate, top: book.pages[afterPageIndex()]?.top };
  if (phase.kind === "aftermath") return book.aftermath[phase.band][phase.index];
  return book.join[phase.index];
}

function isLast(phase: Phase): boolean {
  if (phase.kind === "page") {
    if (phase.index < book.pages.length - 1) return false;
    // Last page ends the chapter cleanly when hinge is inactive (no empty join).
    return !isHingeActive();
  }
  if (phase.kind === "join") {
    return book.join.length === 0 || phase.index >= book.join.length - 1;
  }
  if (phase.kind === "aftermath") {
    const list = book.aftermath[phase.band];
    return phase.index >= list.length - 1 && book.join.length === 0;
  }
  return false;
}

function BandText({ band }: { band: string }) {
  const blocks = parseBand(band);
  return (
    <div className="veil-inner">
      {blocks.map((block, index) =>
        block.kind === "prose" ? (
          <p key={index} className="prose">
            {block.text}
          </p>
        ) : (
          <p key={index} className="dlg">
            <span className="who">{block.name}</span>
            {block.action ? <em className="act">({block.action})</em> : null}
            <span className="speech">“{block.speech}”</span>
          </p>
        ),
      )}
    </div>
  );
}

function HingeField({ placeholder, onSend }: { placeholder: string; onSend: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  return (
    <form
      className="field"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(draft);
      }}
    >
      <textarea
        value={draft}
        placeholder={placeholder}
        aria-label="What you see"
        rows={3}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="field-row">
        <button type="submit" className="send">
          Send
        </button>
      </div>
    </form>
  );
}
