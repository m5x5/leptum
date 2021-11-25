import { PlusIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";
import EditableListItem from "./Item";

interface IProps {
  name: string;
  stored: Boolean;
  children?: JSX.Element[] | JSX.Element;
  remove: (name: string) => void;
  id: string;
}

export default function EditableList({
  name = "",
  stored = false,
  children,
  remove,
  id,
}: IProps) {
  const [list, setList] = useState([]);

  const removeItem = (index) => {
    delete list[index];
    setList([...list.filter((i) => i)]);
    remove?.(index);
  };

  const addItem = () => {
    const name = prompt("What item do you want to add?");
    if (!name) return;

    const item = { name };

    list.push(item);
    setList([...list]);
  };

  if (stored && typeof window !== "undefined") {
    // Restore list once window object is loaded
    useEffect(() => {
      const items = JSON.parse(localStorage.getItem("leptum-list-" + name));
      if (items) setList(items);
    }, [typeof window]);

    // Save on list change
    useEffect(() => {
      localStorage.setItem("leptum-list-" + name, JSON.stringify(list));
      console.log("Saved list", list);
    }, [JSON.stringify(list)]);
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
