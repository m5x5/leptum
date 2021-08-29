import { useJobContext } from "../Job/Context";

export default function TaskList({ children }) {
  const { updateJob } = useJobContext();

  const onDone = () => {
    updateJob({
      status: "due",
    });
  };

  return (
    <div className="mt-8">
      {children}
      <button
        className="bg-green-400 hover:bg-green-500 active:bg-green-600 rounded-xl py-2 w-full text-white mt-8 transition"
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
}
