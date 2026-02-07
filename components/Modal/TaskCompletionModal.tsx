import { useState } from "react";
import Modal from ".";
import EmotionSelector, { Emotion } from "../ui/emotion-selector";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";

interface TaskCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  onComplete: (emotions: Emotion[]) => void;
  isMobile?: boolean;
}

export default function TaskCompletionModal({
  isOpen,
  onClose,
  taskName,
  onComplete,
  isMobile = false,
}: TaskCompletionModalProps) {
  const [selectedEmotions, setSelectedEmotions] = useState<Emotion[]>([]);

  const handleComplete = () => {
    onComplete(selectedEmotions);
    setSelectedEmotions([]);
    onClose();
  };

  const handleSkip = () => {
    onComplete([]);
    setSelectedEmotions([]);
    onClose();
  };

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Task Completed!</DrawerTitle>
            <p className="text-sm text-muted-foreground mt-1">
              &quot;{taskName}&quot;
            </p>
          </DrawerHeader>
          <div className="px-4 pb-8 overflow-y-auto">
            <EmotionSelector
              selectedEmotions={selectedEmotions}
              onChange={setSelectedEmotions}
              className="mb-6"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSkip}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
              >
                Skip
              </button>
              <button
                onClick={handleComplete}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
              >
                Complete
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} closeModal={onClose}>
      <Modal.Title>Task Completed!</Modal.Title>
      <Modal.Body>
        <p className="text-sm text-muted-foreground mb-4">
          &quot;{taskName}&quot;
        </p>
        <EmotionSelector
          selectedEmotions={selectedEmotions}
          onChange={setSelectedEmotions}
        />
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-end w-full">
          <button
            onClick={handleSkip}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:opacity-80"
          >
            Skip
          </button>
          <button
            onClick={handleComplete}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-semibold"
          >
            Complete
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
