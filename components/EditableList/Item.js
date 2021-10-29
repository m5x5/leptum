import { XIcon } from "@heroicons/react/solid";

export default function EditableListItem({ id, item, onDelete = () => {} }) {
  const handleDelete = () => onDelete(id);

  return (
    <div className="card" key={item.name + id}>
      <h3 className="text-lg text-gray-300">{item.name}</h3>
      <XIcon
        className="w-4 text-gray-400 cursor-pointer"
        onClick={handleDelete}
      />
    </div>
  );
}
