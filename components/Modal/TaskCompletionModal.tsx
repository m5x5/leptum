import { useState } from "react";
import Modal from ".";
import EmotionSelector, { Emotion } from "../ui/emotion-selector";
import { Button } from "../ui/button";
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
              <Button
                variant="secondary"
                onClick={handleSkip}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1"
              >
                Complete
              </Button>
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
          <Button
            variant="secondary"
            onClick={handleSkip}
          >
            Skip
          </Button>
          <Button
            onClick={handleComplete}
          >
            Complete
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
