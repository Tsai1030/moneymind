import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import { Box3, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { MODELS } from './models';

// Target size for normalized models (max bbox dimension after scaling)
const TARGET_SIZE = 1.0;
// Fixed camera distance — combined with FOV, determines apparent model size
const CAMERA_POS: [number, number, number] = [1.6, 1.0, 2.2];
const TARGET: [number, number, number] = [0, 0, 0];

export function Viewer3D() {
  const [activeId, setActiveId] = useState(MODELS[0].id);
  const active = MODELS.find((m) => m.id === activeId) ?? MODELS[0];

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', touchAction: 'none' }}>
      <Canvas
        camera={{ position: CAMERA_POS, fov: 35 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[3, 5, 2]} intensity={1.3} color="#FFE9CF" />
          <directionalLight position={[-3, 2, -1]} intensity={0.5} color="#B8E6DA" />

          <Model key={active.url} url={active.url} sizeMultiplier={active.scale ?? 1} />

          <Environment preset="apartment" />
        </Suspense>

        <OrbitControls
          target={TARGET}
          enablePan={false}
          enableZoom
          minDistance={0.8}
          maxDistance={6}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2 + 0.15}
          enableDamping
          dampingFactor={0.08}
          // Touch: ONE finger = ROTATE only, TWO fingers = DOLLY (zoom only, no pan)
          touches={{ ONE: 0, TWO: 1 }}
          mouseButtons={{ LEFT: 0, MIDDLE: 1, RIGHT: -1 }}
        />
      </Canvas>

      <ModelPicker activeId={activeId} onPick={setActiveId} />
    </div>
  );
}

function ModelPicker({ activeId, onPick }: { activeId: string; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = MODELS.find((m) => m.id === activeId) ?? MODELS[0];

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  return (
    <div ref={ref} className="absolute top-4 right-4 z-10">
      <button
        onClick={() => setOpen((s) => !s)}
        className="px-3 py-2 rounded-full text-[12px] font-semibold flex items-center gap-1.5"
        style={{
          background: 'var(--bg-base)',
          color: 'var(--text-ink)',
          border: `1px solid var(--hairline)`,
          boxShadow: '0 4px 12px -2px rgba(0,0,0,0.10)',
        }}
      >
        <span className="text-[16px] leading-none">{active.emoji}</span>
        <span>{active.label}</span>
        <span
          className="inline-block w-1.5 h-1.5 border-r-[1.5px] border-b-[1.5px] -translate-y-[1px] ml-0.5 transition-transform"
          style={{
            borderColor: 'var(--text-ink-2)',
            transform: open ? 'rotate(225deg) translateY(2px)' : 'rotate(45deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 py-1.5 rounded-2xl min-w-[140px]"
          style={{
            background: 'var(--bg-base)',
            border: `1px solid var(--hairline)`,
            boxShadow: '0 8px 24px -4px rgba(0,0,0,0.18)',
          }}
        >
          {MODELS.map((m) => {
            const selected = m.id === activeId;
            return (
              <button
                key={m.id}
                onClick={() => { onPick(m.id); setOpen(false); }}
                className="w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors"
                style={{
                  background: selected ? 'var(--bg-subtle)' : 'transparent',
                  color: selected ? 'var(--text-ink)' : 'var(--text-ink-2)',
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'var(--bg-subtle)'; }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
              >
                <span className="text-[18px] leading-none">{m.emoji}</span>
                <span className="text-[13px] font-semibold flex-1">{m.label}</span>
                {selected && <span className="text-[11px]" style={{ color: 'var(--color-brand-deep)' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Normalizes any GLB model:
 *   1. Scales so largest bbox dimension = TARGET_SIZE * sizeMultiplier
 *   2. Translates so the visual center sits at (0, 0, 0)
 * Result: every model orbits cleanly around the world origin.
 */
function Model({ url, sizeMultiplier = 1 }: { url: string; sizeMultiplier?: number }) {
  const { scene } = useGLTF(url);
  const [visible, setVisible] = useState(false);

  // Fix common GLB bug: textures wrongly assigned to emissiveMap → swap to map
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mat = (obj as Mesh).material as MeshStandardMaterial | undefined;
        if (!mat) return;
        if (mat.emissiveMap && !mat.map) {
          mat.map = mat.emissiveMap;
          mat.emissiveMap = null;
          mat.color?.setHex(0xFFFFFF);
          mat.emissive?.setHex(0x000000);
          mat.needsUpdate = true;
        }
      }
    });
  }, [scene]);

  // Compute uniform scale + center offset
  const { scale, position } = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = (TARGET_SIZE * sizeMultiplier) / maxDim;
    const center = box.getCenter(new Vector3());
    return {
      scale: s,
      position: [-center.x * s, -center.y * s, -center.z * s] as [number, number, number],
    };
  }, [scene, sizeMultiplier]);

  // Show after one frame so the user never sees the unscaled "snap"
  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [scene]);

  return (
    <group position={position} scale={scale} visible={visible}>
      <primitive object={scene} />
    </group>
  );
}

MODELS.forEach((m) => useGLTF.preload(m.url));
