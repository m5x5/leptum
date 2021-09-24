import { PlusIcon, XIcon } from "@heroicons/react/solid";
import { useEffect, useState } from "react";

export default function EditableList({ name = "", stored = false }) {
  const [list, setList] = useState([]);
  const removeItem = (index) => {
    const item = list[index];
    const newItems = list.filter((i) => i.name !== item.name);
    list[stackIndex] = newItems;
    setList([...list]);
  };

  const addItem = () => {
    const name = prompt("What item do you want to add?");
    if (!name) return;

    const item = { name };

    list.push(item);
    setList([...list]);
  };

  if (stored && typeof window !== "undefined") {
    // Save on list change
    useEffect(() => {
      localStorage.setItem("list", JSON.stringify(list));
    }, [JSON.stringify(list)]);

    // Restore list once window object is loaded
    useEffect(() => {
      const items = JSON.parse(localStorage.getItem("list"));
      if (items) setList(items);
    }, [typeof window]);
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-xl text-white">{name}</h2>
        <PlusIcon className="w-5 cursor-pointer" onClick={() => addItem()} />
      </div>
      <div className="flex flex-col gap-2">
        {list.map((habit, index) => (
          <div
            className="py-2 px-3 bg-gray-700 flex flex-row items-center justify-between rounded-lg"
            key={habit.name + index}
          >
            <h3 className="text-lg text-gray-300">{habit.name}</h3>
            <XIcon
              className="w-4 text-gray-400 cursor-pointer"
              onClick={() => removeItem(index)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
