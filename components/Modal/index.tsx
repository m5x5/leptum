import { useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";

const Title = ({ children }: { children: React.ReactNode }) => {
  return (
    <DialogTitle className="text-2xl font-medium leading-6 text-foreground">
      {children}
    </DialogTitle>
  );
};

const Body = ({ children }: { children: React.ReactNode }) => {
  return (
    <div
      className="mt-2 min-h-0 min-w-0 flex-1 overflow-y-auto px-2.5 py-1.5 text-md text-muted-foreground [scrollbar-gutter:stable]"
    >
      {children}
    </div>
  );
};

const Footer = ({ children }: { children: React.ReactNode }) => {
  return <div className="mt-4">{children}</div>;
};

type ModalProps = {
  children: React.ReactNode;
  isOpen: boolean;
  closeModal: () => void;
  onSave?: () => void;
  className?: string;
};

const Modal = ({ children, isOpen, closeModal, onSave, className }: ModalProps) => {
  // Radix Dialog sets pointer-events: none on body when open but sometimes
  // fails to clean it up on close. Ensure it's removed when modal closes.
  useEffect(() => {
    if (!isOpen) {
      const cleanup = setTimeout(() => {
        if (document.body.style.pointerEvents === 'none') {
          document.body.style.pointerEvents = '';
        }
      }, 300);
      return () => clearTimeout(cleanup);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
      <DialogContent className={className} onSave={onSave}>
        {children}
      </DialogContent>
    </Dialog>
  );
};

Modal.Title = Title;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
