import { ArrowLeftIcon, ArrowRightIcon } from "@heroicons/react/solid";

export default function ActivitySelector({ impacts, index, onChange }) {
  const activities = impacts.map((impact) => impact.activity);

  const next = () => {
    if (activities.length > 0) {
      index = (index + 1) % activities.length;
      onChange(index);
    }
  };

  const prev = () => {
    if (activities.length > 0) {
      index = (index - 1 + activities.length) % activities.length;
      onChange(index);
    }
  };

  // Don't render if there are no activities
  if (activities.length === 0) {
    return (
      <div className="w-full flex justify-center items-center mb-4">
        <div className="text-lg text-muted-foreground">No activities yet</div>
      </div>
    );
  }

  return (
    <div className="w-full flex text-foreground justify-between items-center mb-4">
      <button onClick={prev} className="p-2">
        <ArrowLeftIcon className="h-5" />
      </button>
      <div className="text-lg">{activities[index] || "No activity"}</div>
      <button onClick={next} className="p-2">
        <ArrowRightIcon className="h-5" />
      </button>
    </div>
  );
}
