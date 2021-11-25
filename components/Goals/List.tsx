import { PlusIcon } from "@heroicons/react/solid";
import { useGoals } from "../../utils/useGoals";
import EditableListItem from "../EditableList/Item";

interface IProps {
  name: string;
  stored: Boolean;
  children?: JSX.Element[] | JSX.Element;
  remove: (name: string) => void;
  id: string;
  items: any[];
}

export default function GoalList({ name = "", children, id }: IProps) {
  const { goals, deleteGoal, addGoal } = useGoals();

  const addItem = () => {
    const name = prompt("What item do you want to add?");
    if (!name) return;

    addGoal(name);
  };

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <div className="flex flex-row justify-between items-center mb-4">
        <h2 className="text-xl text-white">{name}</h2>
        <div className="flex-row flex text-gray-400 gap-1">
          {children}
          <PlusIcon className="w-5 cursor-pointer" onClick={addItem} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {goals.map((item) => (
          <EditableListItem id={item.id} item={item} onDelete={deleteGoal} />
        ))}
        {goals?.[0] ? null : <p className="text-gray-600">No items.</p>}
      </div>
    </div>
  );
}
