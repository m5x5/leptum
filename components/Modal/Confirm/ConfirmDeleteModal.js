import Modal from "..";

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
          <button
            onClick={cancel}
            className="text-white px-4 py-2 rounded-md outline-none focus-within:ring-2 focus-within:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex justify-center px-4 py-2 text-md font-medium text-blue-100 bg-red-700 border border-transparent rounded-md hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black focus-visible:ring-blue-500"
            onClick={confirm}
          >
            Delete
          </button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmDeleteModal;
