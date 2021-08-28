export default function JobList({ children }) {
  return (
    <div>
      <form>
        <input type="text" placeholder="CRON" />
        <button>Add Job</button>
      </form>
      <h1>Jobs</h1>
      {children}
    </div>
  );
}
