// Create tailwind list item
export default function JobListItem({ job } = { job: {} }) {
  return (
    <div className="flex justify-between">
      <h3 className="inline">{job.cron}</h3>
      <p className="text-sm text-gray-500 inline">{job.status}</p>
    </div>
  );
}
