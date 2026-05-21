import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export function BottomSheet({ open, onClose, children, title }: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: 'rgba(10,10,10,0.55)', backdropFilter: 'blur(4px)' }} />
      <div className="relative w-full max-w-[480px] flex items-end">
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full rounded-t-3xl px-5 pt-2.5 pb-7 flex flex-col"
          style={{ background: 'var(--bg-base)', boxShadow: '0 -20px 60px -10px rgba(0,0,0,0.25)', maxHeight: '90dvh' }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-3.5" style={{ background: 'var(--hairline-2)' }} />
          {title && <div className="text-center text-[15px] font-bold mb-4">{title}</div>}
          {children}
        </div>
      </div>
    </div>
  );
}
