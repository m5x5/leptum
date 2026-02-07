import { useState, useEffect } from "react";
import Modal from ".";
import { Input } from "../ui/input";
import { RichTextEditor } from "../ui/rich-text-editor";

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

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>
        {isEdit ? "Edit Goal Category" : "Add Goal Category"}
      </Modal.Title>
      <Modal.Body>
        <div className="space-y-4 mt-4">
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
            onClick={handleSubmit}
          >
            {isEdit ? "Save Changes" : "Add Category"}
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default AddGoalTypeModal;
