/**
 * 3D model registry. To add a new model:
 *   1. Drop GLB into `glb/<name>/source/<file>.glb`
 *   2. Compress to `app/public/<name>.glb`:
 *      bunx @gltf-transform/cli optimize <input> app/public/<name>.glb --compress draco --texture-compress webp
 *   3. Add an entry below.
 */
export interface ModelEntry {
  id: string;
  label: string;
  emoji: string;
  url: string;
  /** Per-model size multiplier. 1.0 = default, 1.5 = 50% bigger, 0.7 = 30% smaller */
  scale?: number;
}

export const MODELS: ModelEntry[] = [
  { id: 'cat',       label: 'Cat',          emoji: '🐱', url: '/sleeping-cat.glb', scale: 1.2 },
  { id: 'jerry',     label: 'Jerry',        emoji: '🐭', url: '/jerry.glb',         scale: 0.9 },
  { id: 'kuromi',    label: 'Kuromi',       emoji: '👹', url: '/kuromi.glb',        scale: 1.0 },
  { id: 'patrick',   label: 'Patrick',      emoji: '⭐', url: '/patrick.glb',       scale: 1.0 },
  { id: 'spongebob', label: 'SpongeBob',    emoji: '🟨', url: '/spongebob.glb',     scale: 1.0 },
];
