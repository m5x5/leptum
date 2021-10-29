import { useState } from "react";
import Modal from ".";

const WelcomeModal = () => {
  let [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  function openModal() {
    setIsOpen(true);
  }

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>Welcome to the Modal!</Modal.Title>
      <Modal.Body>
        This is a modal component that can be used to display information to the
        user.
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-100 bg-blue-700 border border-transparent rounded-md hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-blue-500"
          onClick={closeModal}
        >
          Glad to be here!
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default WelcomeModal;
