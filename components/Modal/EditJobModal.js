import { useEffect, useState } from "react";
import Modal from ".";
import { useJobContext } from "../Job/Context";

const EditJobModal = ({ isOpen, onHide, prevCron, prevName }) => {
  let [cron, setCRON] = useState(prevCron);
  let [name, setName] = useState(prevName);
  const { updateJob } = useJobContext();

  function closeModal() {
    onHide(false);
  }

  function onSubmit() {
    updateJob({ name, cron });
    closeModal();
  }

  useEffect(() => {
    setCRON(prevCron);
    console.log(prevCron);
  }, [prevCron]);

  useEffect(() => {
    setName(prevName);
  }, [prevName]);

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>Routine</Modal.Title>
      <Modal.Body>
        <label>CRON</label>
        <input
          type="text"
          value={cron || ""}
          onChange={(e) => setCRON(e.target.value)}
        />
        <a href="https://crontab.guru/" className="text-sm text-gray-600">
          Create your CRON string here
        </a>
        <br />
        <label>Name</label>
        <input
          type="text"
          value={name || ""}
          onChange={(e) => setName(e.target.value)}
        />
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-100 bg-blue-700 border border-transparent rounded-md hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-blue-500"
          onClick={onSubmit}
        >
          Save
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default EditJobModal;
