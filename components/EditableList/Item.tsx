import { TrashIcon } from "@heroicons/react/outline";

export interface EditableListItemData {
  name: string;
  /** Tailwind background class for the colour dot, e.g. "bg-red-500". */
  color?: string;
}

interface EditableListItemProps<T extends EditableListItemData> {
  id: string;
  item: T;
  onDelete?: (id: string) => void;
  onEdit?: ((id: string, item: T) => void) | null;
}

export default function EditableListItem<T extends EditableListItemData>({
  id,
  item,
  onDelete,
  onEdit = null,
}: EditableListItemProps<T>) {
  const handleDelete = () => onDelete?.(id);
  const handleClick = () => {
    if (onEdit) onEdit(id, item);
  };

  return (
    <div className="bg-card border border-border p-3 rounded-card flex items-center justify-between gap-3" key={item.name + id}>
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
      <div className="bg-muted p-1 rounded-card">
        <TrashIcon
          className="w-5 h-5 text-muted-foreground hover:text-red-500 transition cursor-pointer"
          onClick={handleDelete}
        />
      </div>
    </div>
  );
}
