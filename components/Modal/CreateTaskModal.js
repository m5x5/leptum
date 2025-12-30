import { useState } from "react";
import Modal from ".";
import { Input } from "../ui/input";

const CreateTaskModal = ({ onCreate, isOpen, onHide }) => {
  let [title, setTitle] = useState("");
  let [description, setDescription] = useState("");

  function closeModal() {
    onHide();
  }

  function createTask() {
    onCreate(title, description);
    setTitle("");
    setDescription("");
    onHide();
  }

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>Create Task</Modal.Title>
      <Modal.Body>
        <label className="mt-5 block uppercase font-semibold text-sm">
          Title
        </label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1"
        />
        <label className="mt-5 block uppercase font-semibold text-sm">
          Description
        </label>
        <Input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1"
        />
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="inline-flex justify-center px-4 py-2 text-md font-medium text-blue-100 bg-blue-700 border border-transparent rounded-md hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-blue-500"
          onClick={createTask}
        >
          Create
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default CreateTaskModal;
