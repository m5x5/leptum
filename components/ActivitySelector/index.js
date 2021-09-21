import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/solid";

export default function ActivitySelector({ impacts, index, onChange }) {
  const activities = impacts.map((impact) => impact.activity);

  const next = () => {
    index = (index + 1) % activities.length;
    onChange(index);
  };

  const prev = () => {
    index = (index - 1 + activities.length) % activities.length;
    onChange(index);
  };

  return (
    <div className="w-full flex text-white justify-between items-center mb-4">
      <button onClick={prev} className="p-2">
        <ArrowLeftIcon className="h-5" />
      </button>
      <div className="text-lg">{activities[index]}</div>
      <button onClick={next} className="p-2">
        <ArrowRightIcon className="h-5" />
      </button>
    </div>
  );
}
