import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

const Title = ({ children }) => {
  return (
    <Dialog.Title
      as="h3"
      className="text-2xl font-medium leading-6 text-gray-200"
    >
      {children}
    </Dialog.Title>
  );
};

const Body = ({ children }) => {
  return (
    <div className="mt-2">
      <p className="text-gray-400 text-md">{children}</p>
    </div>
  );
};

const Footer = ({ children }) => {
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
          className={"fixed inset-0 z-10 overflow-y-auto " + className}
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
              <Dialog.Overlay className="fixed inset-0 bg-black opacity-25" />
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
              <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-gray-800 shadow-xl rounded-xl">
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
