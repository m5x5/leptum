import { PlusIcon, TrashIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import EditableList from "../components/EditableList";
import ConfirmDeleteModal from "../components/Modal/Confirm/ConfirmDeleteModal";
import CreateStackModal from "../components/Modal/CreateStackModal";

const defaultStacks = [
  {
    name: "Enter Home",
  },
  {
    name: "Eat Dinner",
  },
];

export default function StacksPage() {
  const [stacks, setStacks] = useState(defaultStacks);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStack, setSelectedStack] = useState(null);

  useEffect(() => {
    const storedStacks = localStorage.getItem("leptum-stacks");
    if (storedStacks) {
      setStacks(JSON.parse(storedStacks));
    }
  }, [typeof window]);

  useEffect(() => {
    localStorage.setItem("leptum-stacks", JSON.stringify(stacks));
  }, [JSON.stringify(stacks)]);

  const createStack = (name) => {
    setStacks([...stacks, { name }]);
  };

  const hideModal = () => {
    setShowModal(false);
  };

  const deleteStack = () => {
    const newStacks = [...stacks];
    newStacks.splice(selectedStack, 1);
    setStacks(newStacks);
  };

  const openDeleteModal = (index) => {
    setSelectedStack(index);
    setShowDeleteModal(true);
    setShowModal(false);
  };

  return (
    <>
      <div className="flex flex-row w-full justify-between items-center mb-5">
        <h1 className="text-2xl ">Stacks</h1>
        <PlusIcon
          className="h-5 w-5 cursor-pointer"
          onClick={() => setShowModal(true)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {stacks.map((stack, stackIndex) => (
          <EditableList
            name={stack.name}
            key={stack.name + stackIndex}
            stored={true}
          >
            <TrashIcon
              className="cursor-pointer h-5 w-5"
              onClick={() => openDeleteModal(stackIndex)}
            />
          </EditableList>
        ))}
      </div>
      <CreateStackModal
        onCreate={createStack}
        isOpen={showModal}
        onHide={hideModal}
      />
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onConfirm={deleteStack}
        title="Delete Stack"
        description="Are you sure you want to delete this stack?"
      />
    </>
  );
}
