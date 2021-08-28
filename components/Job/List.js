export default function JobList({ children }) {
  return (
    <div>
      <input type="text" placeholder="CRON" />
      <button>Add Job</button>
      <h1>Jobs</h1>
      {children}
    </div>
  );
}
