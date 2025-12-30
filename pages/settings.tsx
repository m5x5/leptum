import { useEffect, useState } from 'react';
import { useActivityWatch } from '../utils/useActivityWatch';
import { remoteStorageClient } from '../lib/remoteStorage';
import { serviceWorkerManager, ServiceWorkerState } from '../utils/serviceWorker';

export default function SettingsPage() {
  const { duplicateCount } = useActivityWatch();
  const [swState, setSwState] = useState<ServiceWorkerState>({
    registration: null,
    updateAvailable: false,
    installing: false,
    waiting: false,
    active: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Attach RemoteStorage widget when settings page mounts
    remoteStorageClient.attachWidget('remotestorage-widget');

    // Subscribe to service worker state changes
    const unsubscribe = serviceWorkerManager.subscribe((state) => {
      setSwState(state);
    });

    // Cleanup on unmount
    return () => {
      remoteStorageClient.detachWidget();
      unsubscribe();
    };
  }, []);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      await serviceWorkerManager.checkForUpdates();

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }

      // Reload the page to get fresh content
      window.location.reload();
    } catch (error) {
      console.error('Error checking for updates:', error);
      setIsChecking(false);
    }
  };

  const handleUpdateApp = async () => {
    await serviceWorkerManager.skipWaiting();
  };

  const handleExportData = async () => {
    try {
      // Collect all data from RemoteStorage
      const [
        jobs,
        goals,
        goalTypes,
        impacts,
        stacks,
        routines,
        standaloneTasks,
        routineCompletions,
        weeklyGoals,
        activityWatchData
      ] = await Promise.all([
        remoteStorageClient.getJobs(),
        remoteStorageClient.getGoals(),
        remoteStorageClient.getGoalTypes(),
        remoteStorageClient.getImpacts(),
        remoteStorageClient.getStacks(),
        remoteStorageClient.getRoutines(),
        remoteStorageClient.getStandaloneTasks(),
        remoteStorageClient.getRoutineCompletions(),
        remoteStorageClient.getAllWeeklyGoals(),
        remoteStorageClient.getActivityWatchData()
      ]);

      // Create export object
      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: {
          jobs,
          goals,
          goalTypes,
          impacts,
          stacks,
          routines,
          standaloneTasks,
          routineCompletions,
          weeklyGoals,
          activityWatchData
        }
      };

      // Convert to JSON
      const jsonString = JSON.stringify(exportData, null, 2);

      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `leptum-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  const isServiceWorkerSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;

  return (
    <div className="max-w-4xl mx-auto pb-32 md:pb-0">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your application preferences and data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Application</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manage application updates and offline functionality.
          </p>
          
          {isServiceWorkerSupported ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${swState.active ? 'bg-green-500' : 'bg-gray-400'}`} />
                <span className="text-muted-foreground">
                  {swState.active ? 'Offline mode enabled' : 'Offline mode not active'}
                </span>
              </div>
              
              {swState.updateAvailable && (
                <div className="border border-blue-500/30 bg-blue-500/10 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                    <strong>Update available!</strong> A new version of the application is ready to install.
                  </p>
                  <button
                    onClick={handleUpdateApp}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                  >
                    Update Now
                  </button>
                </div>
              )}
              
              <button
                onClick={handleCheckForUpdates}
                disabled={isChecking}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {isChecking ? 'Checking...' : 'Check for Updates'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Service Workers are not supported in this browser. Offline functionality is not available.
            </p>
          )}
        </div>

        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Storage</h2>
          <p className="text-sm text-muted-foreground mb-4">Connect your RemoteStorage account to sync your data across devices.</p>
          {/* RemoteStorage Widget Container */}
          <div id="remotestorage-widget"></div>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">Data Export</h2>
          <p className="text-sm text-muted-foreground mb-4">Export all your data as a JSON file for backup or migration.</p>
          <button
            onClick={handleExportData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Export all data as JSON
          </button>
        </div>

        <div className="border border-border rounded-lg p-6 bg-card">
          <h2 className="text-xl font-semibold mb-4">About</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Leptum is an open-source personal productivity tracker with offline-first, user-owned data storage.
          </p>
          <a
            href="https://github.com/m5x5/leptum"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-sm"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            View on GitHub
          </a>
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
