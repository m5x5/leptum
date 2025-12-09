import { PlusIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import EditableListItem from "./Item";

interface IProps {
  name: string;
  stored?: Boolean;
  children?: JSX.Element[] | JSX.Element;
  remove?: (index: number) => void;
  id?: string;
  items?: any[];
  onAddItem?: () => void;
  onRemoveItem?: (id: string) => void;
}

interface ListItem {
  name: string;
  id: string;
}

export default function EditableList({
  name = "",
  stored = false,
  children,
  remove,
  id,
  items = [],
  onAddItem,
  onRemoveItem,
}: IProps) {
  const handleAddItem = () => {
    if (onAddItem) {
      onAddItem();
    }
  };

  const handleRemoveItem = (itemId: string) => {
    if (onRemoveItem) {
      onRemoveItem(itemId);
    }
  };

  return (
    <div className="p-4 bg-card border border-border rounded-lg">
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-xl text-foreground">{name}</h2>
        <div className="flex-row flex text-muted-foreground gap-1">
          {children}
          <PlusIcon className="w-5 cursor-pointer" onClick={handleAddItem} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <EditableListItem
            key={item.id}
            id={item.id}
            item={item}
            onDelete={handleRemoveItem}
          />
        ))}
        {items.length === 0 && <p className="text-muted-foreground">No habits yet.</p>}
      </div>
    </div>
  );
}
