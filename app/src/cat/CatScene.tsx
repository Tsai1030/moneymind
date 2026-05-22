import { useEffect } from 'react';
import { useLottie } from 'lottie-react';
import catAnim from './cat-anim.json';
import type { Mood } from './constants';

interface CatSceneProps {
  height?: number;
  mood?: Mood;
}

const MOOD_SPEED: Record<Mood, number> = {
  excited: 1.5,
  happy: 1,
  worried: 0.6,
  sleeping: 0.4,
};

/**
 * Lottie-driven 2D cat. Uses useLottie hook (instead of default <Lottie /> component)
 * because the default export has React 19 / Vite ESM interop issues.
 */
export function CatScene({ height = 200, mood = 'happy' }: CatSceneProps) {
  const { View, setSpeed } = useLottie(
    {
      animationData: catAnim,
      loop: true,
      autoplay: true,
      // Anchor to top instead of middle so the cat sits higher in its container
      rendererSettings: { preserveAspectRatio: 'xMidYMin meet' },
    },
    { width: '100%', height: '100%' },
  );

  useEffect(() => {
    setSpeed(MOOD_SPEED[mood]);
  }, [mood, setSpeed]);

  return (
    <div style={{ width: '100%', height, position: 'relative' }}>
      {View}
    </div>
  );
}
