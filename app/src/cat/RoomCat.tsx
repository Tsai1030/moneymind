import type { PetStateKind } from './petState';

interface Props {
  state: PetStateKind;
  className?: string;
}

/**
 * Hand-coded SVG cat for the Pet diorama.
 * Animation classes (rc-body / rc-tail / rc-eyes) live in src/index.css;
 * tempo is driven by the rc-state-{kind} class on the wrapper.
 * Wrap in a parent that sizes/positions this component (it fills 100% w/h).
 */
export function RoomCat({ state, className = '' }: Props) {
  return (
    <div
      className={`rc-state-${state} ${className}`}
      style={{ width: '100%', height: '100%', color: 'var(--pet-color)' }}
    >
      <svg viewBox="0 0 200 240" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {/* Tail (behind body) */}
        <g className="rc-tail">
          <path
            d="M 148 180 Q 188 148 178 92 Q 170 64 154 70"
            stroke="currentColor"
            strokeWidth={18}
            strokeLinecap="round"
            fill="none"
          />
          <circle cx={154} cy={70} r={9} fill="var(--pet-pink)" opacity={0.5} />
        </g>

        {/* Body & head (breathes) */}
        <g className="rc-body">
          {/* Body */}
          <ellipse cx={100} cy={172} rx={58} ry={60} fill="currentColor" />
          {/* Belly */}
          <ellipse cx={100} cy={186} rx={30} ry={40} fill="var(--pet-belly)" />

          {/* Head */}
          <ellipse cx={100} cy={100} rx={52} ry={46} fill="currentColor" />

          {/* Outer ears */}
          <path d="M 64 78 L 58 32 L 96 62 Z" fill="currentColor" />
          <path d="M 136 78 L 142 32 L 104 62 Z" fill="currentColor" />
          {/* Inner ears */}
          <path d="M 70 72 L 67 44 L 88 62 Z" fill="var(--pet-pink)" />
          <path d="M 130 72 L 133 44 L 112 62 Z" fill="var(--pet-pink)" />

          {/* Whiskers */}
          <g stroke="currentColor" strokeWidth={1.2} opacity={0.45} strokeLinecap="round">
            <line x1={60} y1={112} x2={38} y2={108} />
            <line x1={60} y1={120} x2={38} y2={122} />
            <line x1={140} y1={112} x2={162} y2={108} />
            <line x1={140} y1={120} x2={162} y2={122} />
          </g>

          {/* Eyes */}
          <g className="rc-eyes">
            <ellipse cx={82} cy={102} rx={6} ry={9} fill="var(--pet-eye)" />
            <ellipse cx={118} cy={102} rx={6} ry={9} fill="var(--pet-eye)" />
            <ellipse cx={82} cy={102} rx={1.7} ry={7} fill="#0A0A0A" />
            <ellipse cx={118} cy={102} rx={1.7} ry={7} fill="#0A0A0A" />
            <circle cx={84} cy={98} r={1.4} fill="white" opacity={0.95} />
            <circle cx={120} cy={98} r={1.4} fill="white" opacity={0.95} />
          </g>

          {/* Nose */}
          <path d="M 95 118 L 105 118 L 100 124 Z" fill="var(--pet-nose)" />
          {/* Mouth (ω) */}
          <path d="M 100 124 Q 94 132 89 126" stroke="var(--pet-mouth)" strokeWidth={2} strokeLinecap="round" fill="none" />
          <path d="M 100 124 Q 106 132 111 126" stroke="var(--pet-mouth)" strokeWidth={2} strokeLinecap="round" fill="none" />

          {/* Front paws */}
          <ellipse cx={76} cy={220} rx={14} ry={10} fill="currentColor" />
          <ellipse cx={124} cy={220} rx={14} ry={10} fill="currentColor" />
          <ellipse cx={76} cy={218} rx={3} ry={2} fill="var(--pet-pink)" opacity={0.7} />
          <ellipse cx={124} cy={218} rx={3} ry={2} fill="var(--pet-pink)" opacity={0.7} />
        </g>
      </svg>
    </div>
  );
}
