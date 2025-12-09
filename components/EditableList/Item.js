import { TrashIcon } from "@heroicons/react/outline";

export default function EditableListItem({ id, item, onDelete = (id) => {}, onEdit = null }) {
  const handleDelete = () => onDelete(id);
  const handleClick = () => {
    if (onEdit) {
      onEdit(id, item);
    }
  };

  return (
    <div className="bg-card border border-border p-3 rounded-xl flex items-center justify-between gap-3" key={item.name + id}>
      <div
        className={`flex items-center gap-2 flex-1 ${onEdit ? 'cursor-pointer' : ''}`}
        onClick={handleClick}
      >
        {item.color && (
          <div className={`w-3 h-3 rounded-full ${item.color} flex-shrink-0`}></div>
        )}
        <h3 className={`text-lg font-bold text-foreground ${onEdit ? 'hover:text-primary transition' : ''}`}>
          {item.name}
        </h3>
      </div>
      <div className="bg-muted p-1 rounded-xl">
        <TrashIcon
          className="w-5 h-5 text-muted-foreground hover:text-red-500 transition cursor-pointer"
          onClick={handleDelete}
        />
      </div>
    </div>
  );
}
