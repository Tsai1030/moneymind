import { useLottie } from 'lottie-react';
import anim from './cat-in-box.json';

/** Empty-state decorative animation. */
export function CatInBox({ size = 200 }: { size?: number }) {
  const { View } = useLottie(
    {
      animationData: anim,
      loop: true,
      autoplay: true,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
    },
    { width: size, height: size },
  );
  return <div className="mx-auto pointer-events-none select-none" style={{ width: size, height: size }}>{View}</div>;
}
