"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { ISLAND_D, ISLAND_W, blocked, nearestStreet } from "@/lib/cityplan";

export type CamMode = "tour" | "fly" | "walk";
export interface Focus {
  ticker: string;
  x: number;
  z: number;
  h: number;
}

const EYE = 0.13; // about 2 m at this scale, where an avenue is ~30 m wide
const MOVE_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "KeyQ", "KeyE", "ArrowUp", "ArrowDown"]);
const PITCH = { fly: [-1.45, 0.7], walk: [-0.6, 1.35] } as const;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const typing = (t: EventTarget | null) => {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
};

/**
 * Three ways to see the city:
 * tour  – a slow circle around the island until you touch anything
 * fly   – WASD to move, Q/E for down/up, drag to look, scroll to dive, Shift to go faster
 * walk  – the same keys at street level, with buildings in the way
 */
export function CameraRig({ mode, onMode, focus, centerZ }: { mode: CamMode; onMode: (m: CamMode) => void; focus: Focus | null; centerZ: number }) {
  const get = useThree((s) => s.get);
  const yaw = useRef(0);
  const pitch = useRef(-0.5);
  const keys = useRef(new Set<string>());
  const glide = useRef<{ pos: THREE.Vector3 | null; look: THREE.Vector3 } | null>(null);
  const tourT = useRef(0.6);
  const bob = useRef(0);
  const modeRef = useRef(mode);
  const onModeRef = useRef(onMode);
  const focusRef = useRef(focus);

  useEffect(() => {
    modeRef.current = mode;
    onModeRef.current = onMode;
    focusRef.current = focus;
  });

  /** Leave the tour from wherever the camera is, keeping its current view direction. */
  const takeOver = useRef<() => void>(() => {});
  useEffect(() => {
    takeOver.current = () => {
      if (modeRef.current !== "tour") return;
      const dir = get().camera.getWorldDirection(new THREE.Vector3());
      yaw.current = Math.atan2(-dir.x, -dir.z);
      pitch.current = Math.asin(clamp(dir.y, -1, 1));
      modeRef.current = "fly";
      onModeRef.current("fly");
    };
  }, [get]);

  useEffect(() => {
    const { camera, gl } = get();
    camera.rotation.order = "YXZ";
    const el = gl.domElement;
    let down = false;
    let lx = 0;
    let ly = 0;
    const onDown = (e: PointerEvent) => {
      down = true;
      lx = e.clientX;
      ly = e.clientY;
    };
    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - lx;
      const dy = e.clientY - ly;
      lx = e.clientX;
      ly = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) < 1) return;
      takeOver.current();
      glide.current = null;
      const m = modeRef.current === "walk" ? "walk" : "fly";
      yaw.current -= dx * 0.0042;
      pitch.current = clamp(pitch.current - dy * 0.0042, PITCH[m][0], PITCH[m][1]);
    };
    const onUp = () => (down = false);
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      takeOver.current();
      glide.current = null;
      const step = clamp(-e.deltaY * 0.03, -6, 6);
      if (modeRef.current === "walk") return;
      const dir = camera.getWorldDirection(new THREE.Vector3());
      camera.position.addScaledVector(dir, step);
      camera.position.y = clamp(camera.position.y, 1.2, 140);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e.target)) return;
      if (MOVE_KEYS.has(e.code) || e.code.startsWith("Shift")) {
        if (e.code.startsWith("Arrow")) e.preventDefault();
        keys.current.add(e.code);
        if (MOVE_KEYS.has(e.code)) {
          takeOver.current();
          glide.current = null;
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => keys.current.delete(e.code);
    const onBlur = () => keys.current.clear();
    const noMenu = (e: Event) => e.preventDefault();

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", noMenu);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", noMenu);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [get]);

  // Switching between flying and walking.
  const prevMode = useRef(mode);
  useEffect(() => {
    const prev = prevMode.current;
    prevMode.current = mode;
    if (mode === prev) return;
    const camera = get().camera;
    if (mode === "walk") {
      const f = focusRef.current;
      const from = f ? { x: f.x, z: f.z + 2.6 } : { x: camera.position.x, z: camera.position.z };
      const p = nearestStreet(from.x, from.z);
      camera.position.set(p.x, EYE, p.z);
      if (f) yaw.current = Math.atan2(-(f.x - p.x), -(f.z - p.z));
      else {
        // Face down the street you landed on, in whichever direction is closest to where you were looking.
        const options = p.axis === "avenue" ? [0, Math.PI] : [Math.PI / 2, -Math.PI / 2];
        const diff = (a: number) => Math.abs(Math.atan2(Math.sin(a - yaw.current), Math.cos(a - yaw.current)));
        yaw.current = diff(options[0]) < diff(options[1]) ? options[0] : options[1];
      }
      pitch.current = f ? 0.35 : 0.12;
      glide.current = null;
    } else if (mode === "fly" && prev === "walk") {
      const p = camera.position;
      glide.current = { pos: new THREE.Vector3(p.x, 24, p.z + 20), look: new THREE.Vector3(p.x, 2, p.z - 6) };
    }
  }, [mode, get]);

  // Clicking a building (or a holding) glides the camera to it.
  const ticker = focus?.ticker ?? null;
  useEffect(() => {
    const f = focusRef.current;
    if (!f || !ticker) return;
    if (modeRef.current === "walk") {
      glide.current = { pos: null, look: new THREE.Vector3(f.x, Math.min(f.h, 12), f.z) };
      return;
    }
    takeOver.current();
    glide.current = {
      pos: new THREE.Vector3(f.x + 8 + f.h * 0.15, f.h * 0.75 + 6, f.z + 12 + f.h * 0.35),
      look: new THREE.Vector3(f.x, f.h * 0.6, f.z),
    };
  }, [ticker]);

  useFrame((state, raw) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const dt = Math.min(raw, 0.05);
    const mode = modeRef.current;

    if (mode === "tour") {
      tourT.current += dt * 0.045;
      const r = 70;
      const target = new THREE.Vector3(Math.sin(tourT.current) * r, 36, centerZ + Math.cos(tourT.current) * r);
      camera.position.lerp(target, 1 - Math.exp(-dt * 1.5));
      camera.lookAt(0, 3, centerZ);
      return;
    }

    if (glide.current) {
      const g = glide.current;
      const k = 1 - Math.exp(-dt * 3);
      if (g.pos) camera.position.lerp(g.pos, k);
      const d = g.look.clone().sub(camera.position);
      const ty = Math.atan2(-d.x, -d.z);
      const tp = Math.atan2(d.y, Math.hypot(d.x, d.z));
      let dy = ty - yaw.current;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      yaw.current += dy * k;
      pitch.current += (tp - pitch.current) * k;
      if ((!g.pos || camera.position.distanceTo(g.pos) < 0.25) && Math.abs(dy) < 0.01 && Math.abs(tp - pitch.current) < 0.01) glide.current = null;
    }

    const K = keys.current;
    const fwd = (K.has("KeyW") || K.has("ArrowUp") ? 1 : 0) - (K.has("KeyS") || K.has("ArrowDown") ? 1 : 0);
    const side = (K.has("KeyD") ? 1 : 0) - (K.has("KeyA") ? 1 : 0);
    const lift = (K.has("KeyE") ? 1 : 0) - (K.has("KeyQ") ? 1 : 0);
    const fast = K.has("ShiftLeft") || K.has("ShiftRight");
    const sy = Math.sin(yaw.current);
    const cy = Math.cos(yaw.current);
    let vx = -sy * fwd + cy * side;
    let vz = -cy * fwd - sy * side;
    const len = Math.hypot(vx, vz) || 1;
    vx /= len;
    vz /= len;
    const p = camera.position;

    if (mode === "fly") {
      const speed = (fast ? 55 : 20) * clamp(p.y / 25, 0.5, 1.6);
      p.x = clamp(p.x + vx * speed * dt * (fwd || side ? 1 : 0), -ISLAND_W - 90, ISLAND_W + 90);
      p.z = clamp(p.z + vz * speed * dt * (fwd || side ? 1 : 0), -ISLAND_D / 2 - 90, ISLAND_D / 2 + 90);
      p.y = clamp(p.y + lift * speed * 0.7 * dt, 1.2, 140);
    } else {
      const moving = fwd || side;
      const speed = fast ? 3.2 : 1.3;
      if (moving) {
        const nx = p.x + vx * speed * dt;
        const nz = p.z + vz * speed * dt;
        if (!blocked(nx, p.z)) p.x = nx;
        if (!blocked(p.x, nz)) p.z = nz;
        bob.current += dt * (fast ? 14 : 9);
      }
      p.y = EYE + (moving ? Math.sin(bob.current) * 0.004 : 0);
    }
    camera.rotation.set(pitch.current, yaw.current, 0);
    const fov = mode === "walk" ? 64 : 45;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * (1 - Math.exp(-dt * 6));
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
