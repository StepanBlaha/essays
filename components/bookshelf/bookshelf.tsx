"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { Plus, X, Trash2, Check } from "lucide-react";
import type { Group } from "three";
import type { BookData } from "./books-data";
import { Book } from "./book";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const SPACING = 0.42;
const DRAG_THRESHOLD = 6;

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function damp(current: number, target: number, lambda: number, dt: number) {
  if (REDUCED_MOTION) return target;
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function Shelf({
  books,
  hovered,
  setHovered,
  onSelect,
  dragDistRef,
}: {
  books: BookData[];
  hovered: string | null;
  setHovered: (id: string | null) => void;
  onSelect: (id: string) => void;
  dragDistRef: React.MutableRefObject<number>;
}) {
  const group = useRef<Group>(null);
  const offsetTarget = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const velocity = useRef(0);
  const { gl } = useThree();

  const basePositions = books.map(
    (_, i) => (i - (books.length - 1) / 2) * SPACING,
  );
  const maxPan = ((books.length - 1) * SPACING) / 2;

  useEffect(() => {
    const el = gl.domElement;
    const clamp = (v: number) => Math.max(-maxPan, Math.min(maxPan, v));
    const onDown = (e: PointerEvent) => {
      dragging.current = true;
      lastX.current = e.clientX;
      dragDistRef.current = 0;
      velocity.current = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      dragDistRef.current += Math.abs(dx);
      const delta = dx * 0.0055;
      velocity.current = delta;
      offsetTarget.current = clamp(offsetTarget.current + delta);
    };
    const onUp = () => {
      dragging.current = false;
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [gl, maxPan, dragDistRef]);

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(dtRaw, 1 / 30);
    // Gentle inertial drift after release, decaying into the damped follow —
    // reads as a soft coast rather than an abrupt stop.
    if (!dragging.current && Math.abs(velocity.current) > 0.0002) {
      offsetTarget.current = Math.max(
        -maxPan,
        Math.min(maxPan, offsetTarget.current + velocity.current),
      );
      velocity.current *= 0.9;
    }
    g.position.x = damp(g.position.x, offsetTarget.current, 6, dt);
  });

  return (
    <group ref={group}>
      {books.map((book, i) => (
        <Book
          key={book.id}
          book={book}
          x={basePositions[i]}
          isOpen={false}
          isHovered={hovered === book.id}
          anyOpen={false}
          onHover={setHovered}
          onSelect={onSelect}
        />
      ))}
    </group>
  );
}

export function Bookshelf({
  books,
  onEnterReader,
  onNewBook,
  onDeleteBook,
  onClose,
}: {
  books: BookData[];
  onEnterReader: (id: string) => void;
  onNewBook: (title: string) => void;
  onDeleteBook: (id: string) => void;
  onClose: () => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const dragDistRef = useRef(0);

  const handleSelect = (id: string) => {
    if (dragDistRef.current > DRAG_THRESHOLD) return;
    // Straight into the full-open reader (smooth entrance handled there).
    onEnterReader(id);
  };

  const confirmCreate = () => {
    const title = newTitle.trim();
    if (!title) return;
    onNewBook(title);
    setNewTitle("");
    setCreating(false);
  };
  const cancelCreate = () => {
    setNewTitle("");
    setCreating(false);
  };

  const createForm = (
    <div className="flex items-center gap-2">
      <Input
        autoFocus
        type="text"
        placeholder="Book title…"
        value={newTitle}
        onChange={(e) => setNewTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") confirmCreate();
          else if (e.key === "Escape") cancelCreate();
        }}
        className="h-8 w-44 rounded-full bg-white/70 font-sans text-xs"
      />
      <Button
        type="button"
        size="icon"
        variant="default"
        onClick={confirmCreate}
        disabled={!newTitle.trim()}
        aria-label="Create book"
      >
        <Check />
      </Button>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={cancelCreate}
        aria-label="Cancel"
        className="bg-white/50"
      >
        <X />
      </Button>
    </div>
  );

  const hoveredBook = books.find((b) => b.id === hovered) ?? null;

  return (
    <div className="fixed inset-0 z-100 animate-in fade-in bg-[#eceae4] font-sans duration-300 motion-reduce:animate-none">
      <div className="absolute inset-0 size-full touch-none">
        {/* Faint vignette so the scene reads as a place, not a void. */}
        <div className="pointer-events-none absolute inset-0 z-1 bg-[radial-gradient(ellipse_at_50%_38%,transparent_0%,transparent_45%,rgba(0,0,0,0.05)_100%)]" />
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 0.32, 4.65], fov: 40 }}
        >
          <color attach="background" args={["#eceae4"]} />
          <fog attach="fog" args={["#eceae4", 7, 13]} />
          <hemisphereLight
            args={["#f5f2ea", "#c9c2b2", 0.55]}
          />
          {/* Key light — warm, soft-shadowed, from front-above. */}
          <directionalLight
            position={[3.2, 5.2, 4.4]}
            intensity={1.15}
            color="#fff6e8"
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
          >
            <orthographicCamera
              attach="shadow-camera"
              args={[-4, 4, 4, -4, 0.5, 14]}
            />
          </directionalLight>
          {/* Fill — cool, low, opposite side, keeps shadow side legible. */}
          <directionalLight position={[-4.5, 1.6, 2.2]} intensity={0.28} color="#dce6f0" />
          {/* Rim — behind the row, separates spines from the backdrop. */}
          <directionalLight position={[0, 2.4, -4]} intensity={0.4} color="#fffaf0" />
          <Suspense fallback={null}>
            <Shelf
              books={books}
              hovered={hovered}
              setHovered={setHovered}
              onSelect={handleSelect}
              dragDistRef={dragDistRef}
            />
            {/* Shelf surface the books rest on. */}
            <mesh
              position={[0, -1.18, 0.15]}
              rotation={[-Math.PI / 2, 0, 0]}
              receiveShadow
            >
              <planeGeometry args={[24, 6]} />
              <meshStandardMaterial color="#e2ded3" roughness={0.95} metalness={0} />
            </mesh>
            {/* Soft backdrop wall for depth. */}
            <mesh position={[0, 1.6, -3.4]} receiveShadow>
              <planeGeometry args={[26, 9]} />
              <meshStandardMaterial color="#e9e6dd" roughness={1} metalness={0} />
            </mesh>
            <ContactShadows
              position={[0, -1.15, 0]}
              opacity={0.45}
              scale={16}
              blur={2.6}
              far={4}
              resolution={1024}
            />
            <Environment preset="apartment" environmentIntensity={0.35} />
          </Suspense>
        </Canvas>
      </div>

      {/* HTML chrome over the canvas */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-2 flex items-center justify-between gap-4 p-6">
        <span className="pointer-events-auto font-sans text-lg font-medium text-foreground">
          Library
        </span>
        <div className="pointer-events-auto flex items-center gap-2">
          {books.length > 0 &&
            (creating ? (
              createForm
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => setCreating(true)}
              >
                <Plus data-icon="inline-start" />
                New book
              </Button>
            ))}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onClose}
                  aria-label="Close library"
                  className="bg-white/40"
                >
                  <X />
                </Button>
              }
            />
            <TooltipContent>Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {books.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-1 flex flex-col items-center justify-center gap-4 text-center">
          <div className="pointer-events-auto flex flex-col items-center gap-3">
            <div className="font-sans text-2xl font-semibold text-foreground">
              Your library is empty
            </div>
            <div className="mb-1 text-sm text-muted-foreground">
              Start your collection with your first book.
            </div>
            {creating ? (
              createForm
            ) : (
              <Button type="button" size="lg" onClick={() => setCreating(true)}>
                <Plus data-icon="inline-start" />
                New book
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Shelf hover caption */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-2 flex items-center justify-center gap-4 px-6 pb-8 pt-6 text-center">
        {hoveredBook ? (
          <div className="pointer-events-auto flex items-center gap-4">
            <div className="font-sans text-base text-foreground">
              <span className="font-semibold">{hoveredBook.title}</span>
              {hoveredBook.author && (
                <span className="text-muted-foreground"> · {hoveredBook.author}</span>
              )}
            </div>
            <Button
              type="button"
              variant={confirmDelete === hoveredBook.id ? "destructive" : "ghost"}
              size="sm"
              onClick={() => {
                if (confirmDelete === hoveredBook.id) {
                  onDeleteBook(hoveredBook.id);
                  setConfirmDelete(null);
                } else {
                  setConfirmDelete(hoveredBook.id);
                }
              }}
              className={cn(
                confirmDelete !== hoveredBook.id &&
                  "text-destructive hover:bg-destructive/10 hover:text-destructive",
              )}
            >
              <Trash2 data-icon="inline-start" />
              {confirmDelete === hoveredBook.id ? "Confirm delete" : "Delete book"}
            </Button>
          </div>
        ) : (
          <span className="pointer-events-auto text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            Drag to browse · click a book to read
          </span>
        )}
      </div>
    </div>
  );
}
