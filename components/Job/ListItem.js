import { useJobContext } from "./Context";

// Create tailwind list item
export default function JobListItem({ job } = { job: {} }) {
  const { setSelected } = useJobContext();
  const onClick = () => {
    setSelected(job.cron);
  };

  return (
    <div className="flex justify-between" onClick={onClick}>
      <h3 className="inline">{job.cron}</h3>
      <p className="text-sm text-gray-500 inline">{job.status}</p>
    </div>
  );
}
