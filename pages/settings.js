import { useActivityWatch } from '../utils/useActivityWatch';

export default function SettingsPage() {
  const { duplicateCount } = useActivityWatch();

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-6">Manage your application preferences and data.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Account</h2>
          <p className="text-sm text-muted-foreground mb-4">Connect your account services.</p>
          <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
            Connect to Google
          </button>
        </div>

        {duplicateCount > 0 && (
          <div className="border border-yellow-500/30 bg-yellow-500/10 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-600 dark:text-yellow-500 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Data Quality
            </h2>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-2">
              We detected <strong>{duplicateCount}</strong> duplicate events in your timeline data.
            </p>
            <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80">
              These duplicates are automatically hidden from your timeline view to keep it clean.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
