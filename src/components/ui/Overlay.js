'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useDialogBehaviour(open, onClose, panelRef) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const panel = panelRef.current;
    const first = panel && (panel.querySelector('[data-autofocus]') || panel.querySelector(FOCUSABLE));
    if (first) first.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (prev && prev.focus) prev.focus();
    };
  }, [open, onClose, panelRef]);
}

/**
 * Modal / sheet with scrim (charcoal 45%), focus trap, Esc to close, focus restore.
 * placement: 'center' (Figma D02 modal) | 'right' (tablet slide-over) | 'bottom' (mobile bottom sheet)
 */
export function Dialog({ open, onClose, label, placement = 'center', className, children }) {
  const panelRef = useRef(null);
  useDialogBehaviour(open, onClose, panelRef);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-charcoal-900/45" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={clsx(
          'absolute flex flex-col',
          placement === 'center' && 'left-1/2 top-4 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-[880px] -translate-x-1/2 animate-fade-in overflow-y-auto md:top-24 md:max-h-[calc(100dvh-120px)]',
          placement === 'right' && 'right-0 top-0 h-full w-[460px] max-w-full animate-sheet-left overflow-y-auto border-l border-line bg-ivory-100 p-5 shadow-lg',
          placement === 'bottom' && 'bottom-0 left-0 right-0 h-[720px] max-h-[calc(100dvh-24px)] animate-sheet-up overflow-y-auto rounded-t-sheet bg-ivory-100 px-4 pb-6 pt-2 shadow-lg',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function SheetHandle() {
  return (
    <div className="flex justify-center py-1" aria-hidden="true">
      <span className="h-1 w-10 rounded-full bg-stone-200" />
    </div>
  );
}
