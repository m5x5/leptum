import {useState} from "react";
import Modal from ".";
import {Slider} from "../ui/slider";
import { remoteStorageClient } from "../../lib/remoteStorage";

const LogImpactModal = ({onCreate, isOpen, name}) => {
    let [motivation, setMotivation] = useState("");
    let [stress, setStress] = useState("");
    let [cleanliness, setCleanliness] = useState("");
    let [fulfillment, setFulfillment] = useState(0);

    function closeModal() {
        onCreate();
    }

    async function onLog() {
        try {
            // Get current impacts from RemoteStorage
            const impacts = await remoteStorageClient.getImpacts();
            
            // Add new impact
            const newImpact = {
                activity: name,
                motivation,
                stress,
                cleanliness,
                fulfillment,
                date: Date.now()
            };
            
            const updatedImpacts = [...impacts, newImpact];
            await remoteStorageClient.saveImpacts(updatedImpacts);
            
            closeModal();
        } catch (error) {
            console.error("Failed to save impact:", error);
        }
    }

    const onChange = (e, name) => {
        name = name || e.target.name;
        const value = typeof e ===  "number"? e : e.target.value;
        if (name === "motivation") {
            setMotivation(value);
        } else if (name === "stress") {
            setStress(value);
        } else if (name === "cleanliness") {
            setCleanliness(value);
        } else if (name === "fulfillment") {
            setFulfillment(value);
        }
    };

    return (
        <Modal isOpen={isOpen} closeModal={closeModal}>
            <Modal.Title>How was "{name}"?</Modal.Title>
            <Modal.Body className="w-full flex">
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
                <Slider
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    name="fulfillment"
                    onValueChange={(values) => onChange(values[0], "fulfillment")}
                    className="w-full"
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
