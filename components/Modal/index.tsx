import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const Title = ({ children }: { children: React.ReactNode }) => {
  return (
    <Dialog.Title
      as="h3"
      className="text-2xl font-medium leading-6 text-foreground"
    >
      {children}
    </Dialog.Title>
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
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className={"fixed inset-0 z-50 overflow-y-auto " + className}
          onClose={closeModal}
        >
          <div className="min-h-screen px-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-25"
              leave="ease-in duration-200"
              leaveFrom="opacity-25"
              leaveTo="opacity-0"
              entered="opacity-25"
            >
              <Dialog.Overlay className="fixed inset-0 bg-background/80 backdrop-blur-sm" />
            </Transition.Child>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span
              className="inline-block h-screen align-middle"
              aria-hidden="true"
            >
              &#8203;
            </span>
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-card border border-border shadow-xl rounded-xl">
                {children}
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

Modal.Title = Title;
Modal.Body = Body;
Modal.Footer = Footer;

export default Modal;
