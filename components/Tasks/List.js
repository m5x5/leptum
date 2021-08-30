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
      <button className="w-full mt-8 btn-success" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
