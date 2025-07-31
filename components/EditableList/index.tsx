import { PlusIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import EditableListItem from "./Item";

interface IProps {
  name: string;
  stored: Boolean;
  children?: JSX.Element[] | JSX.Element;
  remove: (index: number) => void;
  id: string;
  items: any[];
}

interface ListItem {
  name: string;
}

export default function EditableList({
  name = "",
  stored = false,
  children,
  remove,
  id,
  items,
}: IProps) {
  const [list, setList] = useState<ListItem[]>([]);

  const removeItem = (index: number) => {
    delete list[index];
    setList([...list.filter((i) => i)]);
    remove?.(index);
  };

  const addItem = () => {
    const name = prompt("What item do you want to add?");
    if (!name) return;

    const item = { name };

    setList([...list, item]);
    setList([...list]);
  };

  if (stored && typeof window !== "undefined") {
    // Note: EditableList now should use RemoteStorage instead of localStorage
    // This component should be updated to use the RemoteStorage client
    // For now, keeping local state only
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-xl text-white">{name}</h2>
        <div className="flex-row flex text-gray-400 gap-1">
          {children}
          <PlusIcon className="w-5 cursor-pointer" onClick={() => addItem()} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {list.map((item, index) => (
          <EditableListItem id={index} item={item} onDelete={removeItem} />
        ))}
        {list?.[0] ? null : <p className="text-gray-600">No items.</p>}
      </div>
    </div>
  );
}
