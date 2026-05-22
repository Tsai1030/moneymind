import { useLottie } from 'lottie-react';
import anim from './cute-cat.json';

export function CuteCat({ size = 160 }: { size?: number }) {
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
