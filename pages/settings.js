export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl pb-2">Settings</h1>
      <p className="pb-3">This is the settings page.</p>
      <div className="grid grid-cols-2 w-full md:w-auto">
        <div className="card flex-col">
          <h2 className="text-xl">Account</h2>
          <p className="pb-2">Connect to Google</p>
          <button className="btn-success px-3">Connect</button>
        </div>
      </div>
    </div>
  );
}
