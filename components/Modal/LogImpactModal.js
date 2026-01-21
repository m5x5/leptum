import {useState} from "react";
import Modal from ".";
import EmotionSelector, { Emotion } from "../ui/emotion-selector";
import { remoteStorageClient } from "../../lib/remoteStorage";

const LogImpactModal = ({onCreate, isOpen, name}) => {
    const [selectedEmotions, setSelectedEmotions] = useState([]);

    function closeModal() {
        setSelectedEmotions([]);
        onCreate();
    }

    async function onLog() {
        try {
            // Get current impacts from RemoteStorage
            const impacts = await remoteStorageClient.getImpacts();
            
            // Add new impact with emotions
            const newImpact = {
                activity: name,
                emotions: selectedEmotions,
                date: Date.now()
            };
            
            const updatedImpacts = [...impacts, newImpact];
            await remoteStorageClient.saveImpacts(updatedImpacts);
            
            closeModal();
        } catch (error) {
            console.error("Failed to save impact:", error);
        }
    }

    return (
        <Modal isOpen={isOpen} closeModal={closeModal}>
            <Modal.Title>How was "{name}"?</Modal.Title>
            <Modal.Body className="w-full">
                <EmotionSelector
                    selectedEmotions={selectedEmotions}
                    onChange={setSelectedEmotions}
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
