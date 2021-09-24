import { useState } from "react";
import Modal from ".";

const LogImpactModal = ({ onCreate, isOpen, name }) => {
  let [motivation, setMotivation] = useState("");
  let [stress, setStress] = useState("");
  let [cleanliness, setCleanliness] = useState("");
  let [fulfillment, setFulfillment] = useState("");

  function closeModal() {
    onCreate();
  }

  function onLog() {
    const data = JSON.parse(localStorage.getItem("leptum-impacts")) || {};
    data.impacts.push({
      activity: name,
      motivation,
      stress,
      cleanliness,
      fulfillment,
    });
    localStorage.setItem("leptum-impacts", JSON.stringify(data));
    closeModal();
  }

  const onChange = (e) => {
    if (e.target.name === "motivation") {
      setMotivation(e.target.value);
    } else if (e.target.name === "stress") {
      setStress(e.target.value);
    } else if (e.target.name === "cleanliness") {
      setCleanliness(e.target.value);
    } else if (e.target.name === "fulfillment") {
      setFulfillment(e.target.value);
    }
  };

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>How was "{name}"?</Modal.Title>
      <Modal.Body>
        <label>Motivation</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          name="motivation"
          value={motivation}
          onChange={onChange}
          className="block"
        />
        <label>Stress</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          name="stress"
          value={stress}
          onChange={onChange}
          className="block"
        />
        <label>Cleanliness</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          name="cleanliness"
          value={cleanliness}
          onChange={onChange}
          className="block"
        />
        <label>Fulfillment</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          name="fulfillment"
          value={fulfillment}
          onChange={onChange}
          className="block"
        />
      </Modal.Body>
      <Modal.Footer>
        <button
          type="button"
          className="inline-flex justify-center px-4 py-2 text-sm font-medium text-blue-100 bg-blue-700 border border-transparent rounded-md hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-blue-500"
          onClick={onLog}
        >
          Glad to be here!
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default LogImpactModal;
