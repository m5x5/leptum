export default function TasksActions() {
  const { updateJob } = useJobContext();
  const [setLogging] = useState(false);

  const onDone = () => {
    updateJob({
      status: "due",
    });
  };

  return (
    <>
      <button className="mt-8 w-50 btn-success" onClick={onDone}>
        Done
      </button>
      <button
        className="mt-8 w-50 btn-success"
        onClick={() => setLogging(true)}
      >
        Track
      </button>
    </>
  );
}
