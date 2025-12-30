import { useState } from "react";
import Modal from ".";
import { Input } from "../ui/input";

const CreateStackModal = ({ onCreate, isOpen, onHide }) => {
  let [title, setTitle] = useState("");

  function closeModal() {
    onHide();
  }

  function createStack() {
    onCreate(title);
    setTitle("");
    onHide();
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      createStack();
    }
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>Create Stack</Modal.Title>
      <Modal.Body>
        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Stack Name
          </label>
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., Morning Routine, Evening Routine..."
            autoFocus
          />
        </div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
            onClick={closeModal}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
            onClick={createStack}
          >
            Create Stack
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateStackModal;
