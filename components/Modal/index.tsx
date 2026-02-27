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
    <div className="mt-2 text-muted-foreground text-md">
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
  className?: string;
};

const Modal = ({ children, isOpen, closeModal, className }: ModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
      <DialogContent className={className}>
        {children}
      </DialogContent>
    </Dialog>
  );
};

Modal.Title = Title;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
