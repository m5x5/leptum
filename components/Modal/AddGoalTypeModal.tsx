import { useState, useEffect } from "react";
import Modal from ".";
import { Input } from "../ui/input";
import { RichTextEditor } from "../ui/rich-text-editor";
import { Button } from "../ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "../ui/drawer";
import { useIsMobile } from "../../hooks/use-mobile";

interface AddGoalTypeModalProps {
  onAdd: (name: string, description?: string) => void;
  isOpen: boolean;
  onHide: () => void;
  initialName?: string;
  initialDescription?: string;
  isEdit?: boolean;
}

const AddGoalTypeModal = ({
  onAdd,
  isOpen,
  onHide,
  initialName = "",
  initialDescription = "",
  isEdit = false,
}: AddGoalTypeModalProps) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const isMobile = useIsMobile();

  // Update state when initial values change (for edit mode)
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    queueMicrotask(() => {
      setName(initialName);
      setDescription(initialDescription);
    });
  }, [isOpen, isEdit, initialName, initialDescription]);

  function resetForm() {
    setName("");
    setDescription("");
  }

  function closeModal() {
    if (!isEdit) {
      resetForm();
    }
    onHide();
  }

  function handleSubmit() {
    if (!name.trim()) return;

    onAdd(name.trim(), description.trim() || undefined);
    
    if (!isEdit) {
      resetForm();
    }
    onHide();
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.target instanceof HTMLInputElement) {
      handleSubmit();
    }
  };

  const title = isEdit ? "Edit Goal Category" : "Add Goal Category";

  const fields = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Category Name
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., Health, Career, Personal..."
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Describe what this category represents and what types of goals belong here..."
          minHeight="120px"
        />
      </div>
    </div>
  );

  const actions = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={closeModal}
      >
        Cancel
      </Button>
      <Button
        type="button"
        onClick={handleSubmit}
      >
        {isEdit ? "Save Changes" : "Add Category"}
      </Button>
    </>
  );

  // A centred dialog is awkward on a phone with the keyboard up — use a bottom
  // sheet there and keep the dialog for pointer-sized screens.
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DrawerContent className="max-h-[90dvh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{title}</DrawerTitle>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">{fields}</div>
          <DrawerFooter className="flex-row justify-end gap-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {actions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>{title}</Modal.Title>
      <Modal.Body>
        <div className="mt-4">{fields}</div>
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 justify-end">{actions}</div>
      </Modal.Footer>
    </Modal>
  );
};

export default AddGoalTypeModal;
