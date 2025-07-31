import { useState } from "react";
import Modal from ".";
import { useJobContext } from "../Job/Context";
import {Input} from "../ui/input";

type Props = {
  isOpen: boolean;
  onHide: (value: boolean) => void;
}

const CreateJobModal = ({ isOpen, onHide }: Props) => {
  let [cron, setCRON] = useState("");
  let [name, setName] = useState("");
  const { addJob } = useJobContext();

  function closeModal() {
    onHide(false);
    addJob(cron, name);
  }

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>Create a new Job</Modal.Title>
      <Modal.Body>
        <label>CRON</label>
        <Input
            title="CRON"
            type="text"
            value={cron}
            onChange={(e) => setCRON(e.target.value)}
        />
        <a href="https://crontab.guru/">Create your CRON string here</a>
        <br />
        <label>Name</label>
        <Input
          title="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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

export default CreateJobModal;
