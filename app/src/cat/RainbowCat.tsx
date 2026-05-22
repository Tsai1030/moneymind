import { useLottie } from 'lottie-react';
import anim from './rainbow-cat.json';

/**
 * Decorative Lottie at the bottom of a list. Pure cosmetic, no interaction.
 */
export function RainbowCat({ height = 140 }: { height?: number }) {
  const { View } = useLottie(
    {
      animationData: anim,
      loop: true,
      autoplay: true,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    },
    { width: '100%', height: '100%' },
  );

  return (
    <div
      className="w-full mt-4 pointer-events-none select-none"
      style={{ height }}
    >
      {View}
    </div>
  );
}
