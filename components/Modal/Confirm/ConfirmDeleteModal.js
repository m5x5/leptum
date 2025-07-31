import Modal from "..";
import {Button} from "../../ui/button";

const ConfirmDeleteModal = ({
  onConfirm,
  onCancel = () => {},
  isOpen,
  onHide,
  title,
  description,
}) => {
  function closeModal() {
    onHide();
  }

  function confirm() {
    onConfirm();
    onHide();
  }

  function cancel() {
    onCancel();
    onHide();
  }

  return (
    <Modal isOpen={isOpen} closeModal={closeModal}>
      <Modal.Title>{title}</Modal.Title>
      <Modal.Body>{description}</Modal.Body>
      <Modal.Footer>
        <div className="flex justify-between">
          <Button variant="outline"
            onClick={cancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
          >
            Delete
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDeleteModal;
