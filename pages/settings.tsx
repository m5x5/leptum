import { useEffect, useState } from 'react';
import { useActivityWatch } from '../utils/useActivityWatch';
import { remoteStorageClient } from '../lib/remoteStorage';
import { serviceWorkerManager, isOfflineModeEnabled, setOfflineModeEnabled, ServiceWorkerState } from '../utils/serviceWorker';
import { useEntities, Entity } from '../utils/useEntities';
import { useMentions } from '../utils/useMentions';
import { extractMentionedEntityIds } from '../components/ui/mention-input';
import { Separator } from '../components/ui/separator';
import { Switch } from '../components/ui/switch';

export default function SettingsPage() {
  const { duplicateCount } = useActivityWatch();
  const { entities, loading: entitiesLoading, addEntity, updateEntity, deleteEntity } = useEntities();
  const { getMentionCountForEntity, deleteMentionsForEntity, updateMentionsForSource } = useMentions();

  const [swState, setSwState] = useState<ServiceWorkerState>({
    registration: null,
    updateAvailable: false,
    installing: false,
    waiting: false,
    active: false,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isServiceWorkerSupported, setIsServiceWorkerSupported] = useState(false);
  const [offlineModeEnabled, setOfflineModeEnabledState] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Entity management state
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [entityTypeFilter, setEntityTypeFilter] = useState<'all' | 'person' | 'project' | 'context' | 'untyped'>('all');
  const [entityFormData, setEntityFormData] = useState({
    name: '',
    type: null as 'person' | 'project' | 'context' | null,
    description: '',
    tags: '',
  });

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setIsServiceWorkerSupported('serviceWorker' in navigator);
      setOfflineModeEnabledState(isOfflineModeEnabled());
    });

    // Attach RemoteStorage widget when settings page mounts
    remoteStorageClient.attachWidget('remotestorage-widget');

    // Subscribe to service worker state changes
    const unsubscribe = serviceWorkerManager.subscribe((state) => {
      setSwState(state);
    });

    // Listen for RemoteStorage errors (including authorization failures)
    const handleError = (error: Error) => {
      console.error('RemoteStorage error:', error);
      if (error.message?.includes('access denied') || error.message?.includes('Authorization failed')) {
        setAuthError('Authorization failed. Please try connecting again.');
      } else {
        setAuthError(error.message || 'An error occurred with RemoteStorage.');
      }
    };

    remoteStorageClient.onError(handleError);

    // Clear error when connected successfully
    const handleConnect = () => {
      setAuthError(null);
    };
    remoteStorageClient.onConnect(handleConnect);

    // Cleanup on unmount
    return () => {
      remoteStorageClient.detachWidget();
      remoteStorageClient.offError(handleError);
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

  const handleToggleOfflineMode = async (enabled: boolean) => {
    if (enabled) {
      // Enable offline mode - register service worker
      await serviceWorkerManager.register();
      setOfflineModeEnabled(true); // Save to localStorage
      setOfflineModeEnabledState(true); // Update React state
    } else {
      // Disable offline mode - unregister service worker
      await serviceWorkerManager.unregister();
      setOfflineModeEnabled(false); // Save to localStorage
      setOfflineModeEnabledState(false); // Update React state
      // Reload page to ensure service worker is fully removed
      window.location.reload();
    }
  };

  const handleMigrateMentions = async () => {
    if (!confirm('This will scan all insights and extract mentions. Continue?')) {
      return;
    }

    try {
      const insights = await remoteStorageClient.getInsights();
      let migratedCount = 0;

      for (const insight of insights) {
        if (insight.notes) {
          const entityIds = extractMentionedEntityIds(insight.notes);
          if (entityIds.length > 0) {
            await updateMentionsForSource('insight', insight.id, 'notes', entityIds, insight.notes);
            migratedCount++;
          }
        }
      }

      alert(`Migration complete! Extracted mentions from ${migratedCount} insights.`);
    } catch (error) {
      console.error('Failed to migrate mentions:', error);
      alert('Failed to migrate mentions. Check console for details.');
    }
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

  const handleImportFromTodonna = async () => {
    if (!confirm('Import tasks from Todonna into Leptum?')) return;
    try {
      const { importedCount } = await remoteStorageClient.importFromTodonna();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tasksUpdated'));
      }
      if (importedCount > 0) {
        alert(`Imported ${importedCount} task(s) from Todonna.`);
      } else {
        alert('No new tasks found in Todonna.');
      }
    } catch (error) {
      console.error('Failed to import from Todonna:', error);
      alert('Failed to import from Todonna. Please try again.');
    }
  };

  const handleOpenEntityModal = (entity?: Entity) => {
    if (entity) {
      setEditingEntity(entity);
      setEntityFormData({
        name: entity.name,
        type: entity.type || null,
        description: entity.description || '',
        tags: entity.tags?.join(', ') || '',
      });
    } else {
      setEditingEntity(null);
      setEntityFormData({
        name: '',
        type: null,
        description: '',
        tags: '',
      });
    }
    setEntityModalOpen(true);
  };

  const handleCloseEntityModal = () => {
    setEntityModalOpen(false);
    setEditingEntity(null);
  };

  const handleSaveEntity = async () => {
    if (!entityFormData.name.trim()) {
      alert('Entity name is required');
      return;
    }

    const tagsArray = entityFormData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    if (editingEntity) {
      // Update existing entity
      await updateEntity(editingEntity.id, {
        name: entityFormData.name,
        type: entityFormData.type,
        description: entityFormData.description,
        tags: tagsArray,
      });
    } else {
      // Add new entity
      await addEntity({
        name: entityFormData.name,
        type: entityFormData.type,
        description: entityFormData.description,
        tags: tagsArray,
      });
    }

    handleCloseEntityModal();
  };

  const handleDeleteEntity = async (entityId: string) => {
    const mentionCount = getMentionCountForEntity(entityId);

    if (mentionCount > 0) {
      if (!confirm(`This entity is mentioned ${mentionCount} time(s). Are you sure you want to delete it?`)) {
        return;
      }
    } else {
      if (!confirm('Are you sure you want to delete this entity?')) {
        return;
      }
    }

    await deleteMentionsForEntity(entityId);
    await deleteEntity(entityId);
  };

  const filteredEntities = entities.filter(entity => {
    if (entityTypeFilter === 'all') return true;
    if (entityTypeFilter === 'untyped') return !entity.type;
    return entity.type === entityTypeFilter;
  });

  return (
    <div className="max-w-4xl mx-auto pb-32 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your application preferences and data
        </p>
      </div>

      <div className="space-y-6">
        {/* Storage Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Storage</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">Connect your RemoteStorage account to sync your data across devices.</p>
              <div id="remotestorage-widget"></div>
              {authError && (
                <div className="mt-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium">Connection Error</p>
                      <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">{authError}</p>
                      <button
                        onClick={() => setAuthError(null)}
                        className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between py-2 hover:bg-accent/50 pr-2 rounded-lg transition-colors text-left group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">Export Data</span>
                <span className="text-xs text-muted-foreground">Download all your data as a JSON file</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            <button
              onClick={handleImportFromTodonna}
              className="w-full flex items-center justify-between py-2 hover:bg-accent/50 pr-2 rounded-lg transition-colors text-left group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">Import from Todonna</span>
                <span className="text-xs text-muted-foreground">One-time import of tasks from your Todonna storage</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M17 3a1 1 0 00-1 1v9.586l-2.293-2.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 00-1.414-1.414L18 13.586V4a1 1 0 00-1-1zM4 3a1 1 0 000 2h8a1 1 0 100-2H4z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <Separator />

        {/* Application Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Application</h2>
          <div className="space-y-4">
            {!mounted ? (
              <div className="py-2 h-10 animate-pulse bg-muted/20 rounded-lg" />
            ) : (
              <div className="space-y-4">
                {isServiceWorkerSupported ? (
                  <>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground">Application ready for offline use</span>
                        {swState.active && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground">Active</span>
                          </div>
                        )}
                      </div>
                      <Switch
                        checked={offlineModeEnabled}
                        onCheckedChange={handleToggleOfflineMode}
                        disabled={isChecking}
                      />
                    </div>
                    
                    {swState.updateAvailable && (
                      <div className="border border-blue-500/30 bg-blue-500/10 rounded-lg p-3">
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
                    
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-foreground">Check for updates</span>
                      <button
                        onClick={handleCheckForUpdates}
                        disabled={isChecking || !offlineModeEnabled}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {isChecking ? 'Checking...' : 'Check'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground">
                      Service Workers are not supported in this browser. Offline functionality is not available.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Entity Management Section */}
        <div>
          <div className="flex flex-wrap gap-y-2 justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Entity Management</h2>
            <div className="flex gap-2">
              <button
                onClick={handleMigrateMentions}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                title="Extract mentions from existing insights"
              >
                Migrate Mentions
              </button>
              <button
                onClick={() => handleOpenEntityModal()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm"
              >
                Add Entity
              </button>
            </div>
          </div>

          {/* Type Filter Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'person', 'project', 'context', 'untyped'] as const).map(type => (
              <button
                key={type}
                onClick={() => setEntityTypeFilter(type)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  entityTypeFilter === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Entity List */}
          {entitiesLoading ? (
            <p className="text-sm text-muted-foreground py-2">Loading entities...</p>
          ) : filteredEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No entities found. Add your first entity to start using @mentions!
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEntities.map(entity => (
                <div
                  key={entity.id}
                  className="border border-border rounded-lg p-3 bg-background hover:bg-accent/50 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">{entity.name}</h3>
                        {entity.type && (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs">
                            {entity.type}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                          {getMentionCountForEntity(entity.id)} mentions
                        </span>
                      </div>
                      {entity.description && (
                        <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                          {entity.description}
                        </p>
                      )}
                      {entity.tags && entity.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {entity.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenEntityModal(entity)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteEntity(entity.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* About Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">About</h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
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
        </div>

        {duplicateCount > 0 && (
          <>
            <Separator />
            <div>
              <h2 className="text-lg font-semibold text-yellow-600 dark:text-yellow-500 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Data Quality
              </h2>
              <div className="space-y-2">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  We detected <strong>{duplicateCount}</strong> duplicate events in your timeline data.
                </p>
                <p className="text-xs text-yellow-600/80 dark:text-yellow-500/80">
                  These duplicates are automatically hidden from your timeline view to keep it clean.
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Entity Add/Edit Modal */}
      {entityModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              {editingEntity ? 'Edit Entity' : 'Add Entity'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={entityFormData.name}
                  onChange={(e) => setEntityFormData({ ...entityFormData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm"
                  placeholder="e.g., John Doe, Leptum, Work"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={entityFormData.type || ''}
                  onChange={(e) => setEntityFormData({
                    ...entityFormData,
                    type: e.target.value === '' ? null : e.target.value as 'person' | 'project' | 'context'
                  })}
                  className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm"
                >
                  <option value="">Untyped</option>
                  <option value="person">Person</option>
                  <option value="project">Project</option>
                  <option value="context">Context</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={entityFormData.description}
                  onChange={(e) => setEntityFormData({ ...entityFormData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm"
                  placeholder="Optional description..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags</label>
                <input
                  type="text"
                  value={entityFormData.tags}
                  onChange={(e) => setEntityFormData({ ...entityFormData, tags: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded bg-background text-foreground text-sm"
                  placeholder="comma, separated, tags"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter tags separated by commas
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleSaveEntity}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                {editingEntity ? 'Update' : 'Add'}
              </button>
              <button
                onClick={handleCloseEntityModal}
                className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
