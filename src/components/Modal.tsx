import { useEffect, type ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  titleId: string;
  children: ReactNode;
  className?: string;
  preventClose?: boolean;
}

export function Modal({ open, onClose, titleId, children, className = "", preventClose = false }: ModalProps) {
  useEffect(() => {
    if (!open || preventClose) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, preventClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(event) => !preventClose && event.currentTarget === event.target && onClose()}>
      <section className={`modal ${className}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        {children}
      </section>
    </div>
  );
}
