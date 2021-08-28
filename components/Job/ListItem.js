// Create tailwind list item
export default function JobListItem({ job } = { job: {} }) {
  return (
    <div>
      <h3>{job.cron}</h3>
    </div>
  );
}
