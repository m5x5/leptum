"use client";

import Modal from "../Modal";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "./drawer";
import { useIsMobile } from "../../hooks/use-mobile";

type ResponsiveDialogProps = {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  /** Action row; rendered right-aligned in both shells. */
  footer?: React.ReactNode;
};

/**
 * Centred dialog on pointer-sized screens, bottom sheet on phones — a centred
 * dialog is awkward there once the keyboard is up. Same content either way.
 */
export function ResponsiveDialog({ open, onClose, title, children, footer }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{children}</div>
          {footer && (
            <DrawerFooter className="flex-row justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {footer}
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={open} closeModal={onClose}>
      <Modal.Title>{title}</Modal.Title>
      <Modal.Body>
        <div className="mt-4">{children}</div>
      </Modal.Body>
      {footer && (
        <Modal.Footer>
          <div className="flex gap-2 justify-end">{footer}</div>
        </Modal.Footer>
      )}
    </Modal>
  );
}
