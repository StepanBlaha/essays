"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ChevronLeft, ChevronRight, Pencil, X } from "lucide-react";
import type { Book, Essay } from "@/lib/db";
import { readingTime } from "@/lib/export";
import Editor from "@/components/Editor";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import styles from "./Collection.module.css";

type Face =
  | { kind: "cover-front" }
  | { kind: "title" }
  | { kind: "essay"; essay: Essay; index: number }
  | { kind: "blank" }
  | { kind: "colophon" }
  | { kind: "cover-back" };

type Leaf = { front: Face; back: Face };

function buildLeaves(essays: Essay[]): Leaf[] {
  const leaves: Leaf[] = [];

  // Leaf 0: front cover / inside-front title page
  leaves.push({ front: { kind: "cover-front" }, back: { kind: "title" } });

  // Essay faces, one essay per face, padded to an even count
  const essayFaces: Face[] = essays.map((essay, index) => ({
    kind: "essay",
    essay,
    index,
  }));
  if (essayFaces.length % 2 !== 0) essayFaces.push({ kind: "blank" });

  for (let i = 0; i < essayFaces.length; i += 2) {
    leaves.push({ front: essayFaces[i], back: essayFaces[i + 1] });
  }

  // Closing leaf: colophon front, back cover on the back
  leaves.push({ front: { kind: "colophon" }, back: { kind: "cover-back" } });

  return leaves;
}

function faceLabel(face: Face, total: number): string {
  switch (face.kind) {
    case "cover-front":
      return "Front cover";
    case "title":
      return "Title page";
    case "essay":
      return `Essay ${face.index + 1} of ${total}`;
    case "colophon":
      return "Colophon";
    case "cover-back":
      return "Back cover";
    default:
      return "";
  }
}

const FLIP_MS = 720;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
function getReducedMotionServerSnapshot() {
  return false;
}

export default function Collection({
  book,
  essays,
  onClose,
}: {
  book: Book;
  essays: Essay[];
  onClose: () => void;
}) {
  const bookTitle = book.title.trim() || "The Collection";
  const bookAuthor = book.author.trim();
  const leaves = useMemo(() => buildLeaves(essays), [essays]);
  const L = leaves.length;

  // Mount already open on the first interior spread (the user just opened
  // this book in the 3D shelf) — the front cover is still reachable via prev().
  const [flipped, setFlipped] = useState(1);
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingEssay = editingId
    ? (essays.find((e) => e.id === editingId) ?? null)
    : null;
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const next = useCallback(() => {
    if (busy) return;
    if (flipped >= L) return;
    setBusy(true);
    setFlipped((f) => f + 1);
    timeoutRef.current = setTimeout(
      () => setBusy(false),
      reduced ? 0 : FLIP_MS,
    );
  }, [busy, flipped, L, reduced]);

  const prev = useCallback(() => {
    if (busy) return;
    if (flipped <= 0) return;
    setBusy(true);
    setFlipped((f) => f - 1);
    timeoutRef.current = setTimeout(
      () => setBusy(false),
      reduced ? 0 : FLIP_MS,
    );
  }, [busy, flipped, reduced]);

  const handleClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setFlipped(0);
    timeoutRef.current = setTimeout(
      () => {
        onClose();
      },
      reduced ? 0 : FLIP_MS,
    );
  }, [closing, onClose, reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) {
        if (e.key === "Escape") setEditingId(null);
        return;
      }
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, next, prev, editingId]);

  const canNext = flipped < L && !busy;
  const canPrev = flipped > 0 && !busy;

  const renderFace = (face: Face, side: "left" | "right") => {
    if (face.kind === "essay") {
      const essay = face.essay;
      const text = essay.text.trim();
      return (
        <div className={`${styles.page} ${styles[side]}`} title="Turn page">
          <div className={styles.pageInner}>
            <h3 className={styles.pageTitle}>
              {essay.title.trim() || "Untitled"}
            </h3>
            <div className={styles.pageMeta}>
              {text ? `${readingTime(text)} min read` : "Empty page"}
            </div>
            <div className={styles.pageText}>{text}</div>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={styles.editBtn}
                  aria-label="Edit essay"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(essay.id);
                  }}
                >
                  <Pencil />
                </Button>
              }
            />
            <TooltipContent>Edit essay</TooltipContent>
          </Tooltip>
          <span className={styles.pageNum}>{face.index + 1}</span>
        </div>
      );
    }

    if (face.kind === "blank") {
      return (
        <div className={`${styles.page} ${styles[side]} ${styles.blank}`}>
          <span className={styles.blankMark}>❦</span>
        </div>
      );
    }

    if (face.kind === "title") {
      return (
        <div className={`${styles.page} ${styles[side]} ${styles.contents}`}>
          <div className={styles.contentsInner}>
            <div className={styles.contentsBookTitle}>{bookTitle}</div>
            {bookAuthor && (
              <div className={styles.contentsBookAuthor}>{bookAuthor}</div>
            )}
            <h2 className={styles.contentsHeading}>Contents</h2>
            {essays.length === 0 ? (
              <div className={styles.contentsEmpty}>No essays yet.</div>
            ) : (
              <ol className={styles.contentsList}>
                {essays.map((essay, index) => (
                  <li key={essay.id} className={styles.contentsRow}>
                    <span className={styles.contentsNum}>{index + 1}</span>
                    <span className={styles.contentsTitle}>
                      {essay.title.trim() || "Untitled"}
                    </span>
                    <span className={styles.contentsMeta}>
                      {essay.text.trim()
                        ? `${readingTime(essay.text)} min`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      );
    }

    if (face.kind === "colophon") {
      return (
        <div
          className={`${styles.page} ${styles[side]} ${styles.titlePage}`}
        >
          <div className={styles.titleCount}>End</div>
        </div>
      );
    }

    if (face.kind === "cover-front") {
      return (
        <div
          className={`${styles.page} ${styles[side]} ${styles.cover}`}
          title="Open"
        >
          <span className={styles.coverMark}>❦</span>
          <h2 className={styles.coverTitle}>{bookTitle}</h2>
          {bookAuthor && <div className={styles.coverAuthor}>{bookAuthor}</div>}
          <div className={styles.coverCount}>
            {essays.length} {essays.length === 1 ? "essay" : "essays"}
          </div>
          <div className={styles.coverHint}>Open</div>
        </div>
      );
    }

    // cover-back
    return (
      <div
        className={`${styles.page} ${styles[side]} ${styles.cover} ${styles.coverBack}`}
      >
        <span className={styles.coverMark}>❦</span>
      </div>
    );
  };

  const counterText = (() => {
    if (essays.length === 0 && flipped === 0) return "Your collection is empty";
    if (flipped === 0) return "Closed";
    if (flipped === L) return "Back cover";
    const leftFace = leaves[flipped - 1].back;
    const rightFace = leaves[flipped].front;
    const left = faceLabel(leftFace, essays.length);
    const right = faceLabel(rightFace, essays.length);
    return [left, right].filter(Boolean).join("  ·  ");
  })();

  return (
    <div
      className={`${styles.overlay} ${closing ? styles.closing : ""} dark`}
      onClick={handleClose}
    >
      <div className={styles.header} onClick={(e) => e.stopPropagation()}>
        <span className={`${styles.brand} text-foreground`}>{bookTitle}</span>
        <Button type="button" variant="outline" size="sm" onClick={handleClose}>
          <X data-icon="inline-start" />
          Close
        </Button>
      </div>

      <div className={styles.stage} onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={styles.arrow}
                onClick={prev}
                disabled={!canPrev}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
            }
          />
          <TooltipContent>Previous page</TooltipContent>
        </Tooltip>

        <div className={styles.book}>
          {leaves.map((leaf, i) => {
            const isFlipped = i < flipped;
            const zIndex = isFlipped ? i : L - i;
            return (
              <div
                key={i}
                className={`${styles.leaf} ${isFlipped ? styles.leafFlipped : ""} ${
                  reduced ? styles.noTransition : ""
                }`}
                style={{ zIndex }}
              >
                <div
                  className={styles.leafFace}
                  role="button"
                  tabIndex={0}
                  onClick={next}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") next();
                  }}
                >
                  {renderFace(leaf.front, "right")}
                </div>
                <div
                  className={`${styles.leafFace} ${styles.leafBack}`}
                  role="button"
                  tabIndex={0}
                  onClick={prev}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") prev();
                  }}
                >
                  {renderFace(leaf.back, "left")}
                </div>
              </div>
            );
          })}
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={styles.arrow}
                onClick={next}
                disabled={!canNext}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            }
          />
          <TooltipContent>Next page</TooltipContent>
        </Tooltip>
      </div>

      <div className={styles.counter} onClick={(e) => e.stopPropagation()}>
        {counterText}
      </div>

      {editingEssay && (
        <div
          className={`${styles.editPanel} bg-background`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`${styles.editBar} border-b border-border bg-background`}>
            <span className={`${styles.editBarTitle} text-foreground`}>
              {editingEssay.title.trim() || "Untitled"}
            </span>
            <Button
              type="button"
              variant="default"
              onClick={() => setEditingId(null)}
            >
              Done ✓
            </Button>
          </div>
          <div className={styles.editBody}>
            <Editor key={editingEssay.id} essay={editingEssay} />
          </div>
        </div>
      )}
    </div>
  );
}
