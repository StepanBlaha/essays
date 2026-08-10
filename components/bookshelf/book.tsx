"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { Color } from "three";
import type { Group } from "three";
import type { BookData } from "./books-data";

const W = 1.3;
const H = 1.9;
const PAGE_DEPTH = 0.22;
const COVER = 0.05;
const INK = "#2b2b2b";
const MUTED = "#8a8175";
const PAGE = "#f4f1ea";
const SPINE_OUT = Math.PI / 2;

const REDUCED_MOTION =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function damp(current: number, target: number, lambda: number, dt: number) {
  if (REDUCED_MOTION) return target;
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

// Deterministic per-id hash → seeded PRNG, so every render (and every
// remount) produces the exact same "natural" variation for a given book.
function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type BookProps = {
  book: BookData;
  x: number;
  isOpen: boolean;
  isHovered: boolean;
  anyOpen: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
};
export function Book({
  book,
  x,
  isOpen,
  isHovered,
  anyOpen,
  onHover,
  onSelect,
}: BookProps) {
  const groupRef = useRef<Group>(null);
  const coverRef = useRef<Group>(null);
  const tiltRef = useRef<Group>(null);

  // Natural shelf variation, deterministic per book id: height, thickness,
  // a slight lean, and a faint cover-color shading so the row doesn't read
  // as identical, machine-stamped copies.
  const variant = useMemo(() => {
    const rand = mulberry32(hashId(book.id));
    const heightScale = 0.93 + rand() * 0.12; // 0.93 – 1.05
    const thickScale = 0.82 + rand() * 0.4; // 0.82 – 1.22
    const leanY = (rand() - 0.5) * 0.11; // ± ~3.1°, twisted on the shelf
    const leanZ = (rand() - 0.5) * 0.07; // ± ~2°, leaning against neighbors
    const shade = (rand() - 0.5) * 0.16; // subtle lighten/darken
    const roughness = 0.58 + rand() * 0.16;

    const h = H * heightScale;
    const pageDepth = PAGE_DEPTH * thickScale;
    const thickness = pageDepth + COVER * 2;
    const yOffset = (h - H) / 2; // keep every spine resting on the same floor line

    const base = new Color(book.color);
    const hsl = { h: 0, s: 0, l: 0 };
    base.getHSL(hsl);
    const cover = new Color().setHSL(
      hsl.h,
      hsl.s,
      Math.min(0.92, Math.max(0.05, hsl.l + shade)),
    );

    return {
      h,
      pageDepth,
      thickness,
      yOffset,
      leanY,
      leanZ,
      roughness,
      cover: `#${cover.getHexString()}`,
    };
  }, [book.id, book.color]);

  useFrame((_, dtRaw) => {
    const g = groupRef.current;
    const c = coverRef.current;
    const t = tiltRef.current;
    if (!g || !c || !t) return;
    // Clamp dt so background-tab / hitch spikes don't cause overshoot pops.
    const dt = Math.min(dtRaw, 1 / 30);

    // On open: slide to the middle, lift, zoom forward, face the camera and
    // swing the cover fully open. Off the shelf otherwise.
    const targetX = isOpen ? 0 : x;
    const targetY = isOpen ? 0.12 : isHovered ? 0.1 : 0;
    const targetZ = isOpen ? 1.4 : isHovered ? 0.14 : 0;
    const targetScale = isOpen ? 1.2 : anyOpen ? 0.92 : 1;

    // Gentler, slightly staggered lambdas per axis keep the open motion
    // reading as one continuous glide instead of independently-arriving parts.
    g.position.x = damp(g.position.x, targetX, 5.5, dt);
    g.position.y = damp(g.position.y, targetY, 6, dt);
    g.position.z = damp(g.position.z, targetZ, 5, dt);
    const s = damp(g.scale.x, targetScale, 5.5, dt);
    g.scale.setScalar(s);
    g.rotation.y = damp(
      g.rotation.y,
      isOpen ? 0 : SPINE_OUT + variant.leanY,
      5,
      dt,
    );
    // Fully open (cover lies flat to the left) — slightly slower than the
    // body motion so the cover feels like it trails the turn.
    c.rotation.y = damp(c.rotation.y, isOpen ? -Math.PI : 0, 4.2, dt);

    // Subtle secondary motion: a light forward tilt on hover, eased away
    // the moment the book opens or loses hover — layered on top of the
    // book's static resting lean.
    const targetTiltX = !isOpen && isHovered ? -0.06 : 0;
    const targetTiltZ = (!isOpen ? variant.leanZ : 0) + (!isOpen && isHovered ? 0.015 : 0);
    t.rotation.x = damp(t.rotation.x, targetTiltX, 6, dt);
    t.rotation.z = damp(t.rotation.z, targetTiltZ, 6, dt);
  });

  const { h, pageDepth, thickness, yOffset, roughness, cover } = variant;

  return (
    <group
      ref={groupRef}
      position={[x, 0, 0]}
      rotation={[0, SPINE_OUT + variant.leanY, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(book.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onHover(null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(book.id);
      }}
    >
      <group ref={tiltRef} rotation={[0, 0, variant.leanZ]}>
        <group position={[0, yOffset, 0]}>
          {/* Back cover */}
          <mesh
            position={[0, 0, -pageDepth / 2 - COVER / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[W, h, COVER]} />
            <meshStandardMaterial
              color={cover}
              roughness={roughness}
              metalness={0.015}
            />
          </mesh>
          {/* Spine */}
          <mesh position={[-W / 2 - COVER / 2, 0, 0]} castShadow>
            <boxGeometry args={[COVER, h, thickness]} />
            <meshStandardMaterial
              color={cover}
              roughness={roughness}
              metalness={0.015}
            />
          </mesh>
          {/* Spine title */}
          <group
            position={[-W / 2 - COVER - 0.001, 0, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          >
            <Text
              fontWeight={700}
              fontSize={0.11}
              color={PAGE}
              anchorX="center"
              anchorY="middle"
              rotation={[0, 0, -Math.PI / 2]}
              maxWidth={h - 0.4}
              textAlign="center"
            >
              {book.title}
            </Text>
          </group>
          {/* Page block */}
          <mesh position={[0, 0, 0]} castShadow receiveShadow>
            <boxGeometry args={[W - 0.04, h - 0.06, pageDepth]} />
            <meshStandardMaterial color={PAGE} roughness={0.92} metalness={0} />
          </mesh>
          {/* Inside title page — revealed as the cover swings open */}
          <group position={[0, 0, pageDepth / 2 + 0.001]}>
            <Text
              fontWeight={700}
              fontSize={0.12}
              color={INK}
              anchorX="center"
              anchorY="top"
              position={[0, h / 2 - 0.32, 0]}
              maxWidth={W - 0.3}
              textAlign="center"
            >
              {book.title}
            </Text>
            {book.author && (
              <Text
                fontSize={0.075}
                color={MUTED}
                anchorX="center"
                anchorY="top"
                position={[0, h / 2 - 0.56, 0]}
              >
                {book.author}
              </Text>
            )}
            {book.description && (
              <Text
                fontSize={0.078}
                color={INK}
                anchorX="center"
                anchorY="top"
                position={[0, h / 2 - 0.86, 0]}
                maxWidth={W - 0.3}
                textAlign="center"
                lineHeight={1.45}
              >
                {book.description}
              </Text>
            )}
          </group>
          {/* Front cover — hinged on the spine */}
          <group
            ref={coverRef}
            position={[-W / 2, 0, pageDepth / 2 + COVER / 2]}
          >
            <mesh position={[W / 2, 0, 0]} castShadow receiveShadow>
              <boxGeometry args={[W, h, COVER]} />
              <meshStandardMaterial
                color={cover}
                roughness={roughness}
                metalness={0.015}
              />
            </mesh>
            {!isOpen && (
              <>
                <Text
                  fontWeight={700}
                  fontSize={0.12}
                  color={PAGE}
                  anchorX="center"
                  anchorY="middle"
                  position={[W / 2, 0.15, COVER / 2 + 0.001]}
                  maxWidth={W - 0.3}
                  textAlign="center"
                >
                  {book.title}
                </Text>
                <Text
                  fontSize={0.07}
                  color={PAGE}
                  anchorX="center"
                  anchorY="middle"
                  position={[W / 2, -0.55, COVER / 2 + 0.001]}
                >
                  {book.author}
                </Text>
              </>
            )}
          </group>
        </group>
      </group>
    </group>
  );
}
