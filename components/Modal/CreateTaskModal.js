import { useState } from "react";
import Modal from ".";

const CreateTaskModal = ({ onCreate, isOpen, onHide }) => {
  let [title, setTitle] = useState("");
  let [description, setDescription] = useState("");

  function closeModal() {
    onHide(false);
    onCreate(title, description);
  }

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>Welcome to the Modal!</Modal.Title>
      <Modal.Body>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-2"
        />
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

export default CreateTaskModal;
