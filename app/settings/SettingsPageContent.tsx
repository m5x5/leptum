"use client";

import { useEffect, useRef, useState } from 'react';
import { useActivityWatch } from '../../utils/useActivityWatch';
import { remoteStorageClient } from '../../lib/remoteStorage';
import { LoginButtons } from '../../lib/remotestorage-widget';
import { serviceWorkerManager, isOfflineModeEnabled, setOfflineModeEnabled, ServiceWorkerState } from '../../utils/serviceWorker';
import { likelyWithKeyboard } from 'keyux';
import { useEntities, Entity } from '../../utils/useEntities';
import { useMentions } from '../../utils/useMentions';
import { extractMentionedEntityIds } from '../../components/ui/mention-input';
import { Separator } from '../../components/ui/separator';
import { Switch } from '../../components/ui/switch';
import { isHapticsEnabled, setHapticsEnabled } from '../../utils/haptics';
import {
  DownloadIcon,
  UploadIcon,
  RefreshIcon,
  ExclamationIcon,
  DotsVerticalIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  PlusIcon,
} from '@heroicons/react/solid';

export default function SettingsPageContent() {
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
  const [showKeyboardShortcuts, setShowKeyboardShortcutsState] = useState(false);
  const [hapticsEnabled, setHapticsEnabledState] = useState(false);
  const [dob, setDob] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');

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

  // 3-dot context menu state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
      setIsServiceWorkerSupported('serviceWorker' in navigator);
      setOfflineModeEnabledState(isOfflineModeEnabled());
      const storedKb = localStorage.getItem('showKeyboardShortcuts');
      setShowKeyboardShortcutsState(storedKb !== null ? storedKb === 'true' : likelyWithKeyboard(window));
      setDob(localStorage.getItem('leptum_dob') ?? '');
      setGoogleClientId(localStorage.getItem('leptum_google_client_id') ?? '');
      setHapticsEnabledState(isHapticsEnabled());
    });

    const unsubscribe = serviceWorkerManager.subscribe((state) => {
      setSwState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

  const handleCheckForUpdates = async () => {
    setIsChecking(true);
    try {
      await serviceWorkerManager.checkForUpdates();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
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
      await serviceWorkerManager.register();
      setOfflineModeEnabled(true);
      setOfflineModeEnabledState(true);
    } else {
      await serviceWorkerManager.unregister();
      setOfflineModeEnabled(false);
      setOfflineModeEnabledState(false);
      window.location.reload();
    }
  };

  const handleToggleKeyboardShortcuts = (enabled: boolean) => {
    localStorage.setItem('showKeyboardShortcuts', enabled.toString());
    setShowKeyboardShortcutsState(enabled);
    window.dispatchEvent(new Event('keyboardShortcutsChanged'));
  };

  const handleMigrateMentions = async () => {
    if (!confirm('This will scan all insights and extract mentions. Continue?')) return;
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
      const [
        jobs, goals, goalTypes, impacts, stacks, routines,
        standaloneTasks, routineCompletions, weeklyGoals, activityWatchData
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
        remoteStorageClient.getActivityWatchData(),
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: { jobs, goals, goalTypes, impacts, stacks, routines, standaloneTasks, routineCompletions, weeklyGoals, activityWatchData },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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
      setEntityFormData({ name: '', type: null, description: '', tags: '' });
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
      await updateEntity(editingEntity.id, {
        name: entityFormData.name,
        type: entityFormData.type,
        description: entityFormData.description,
        tags: tagsArray,
      });
    } else {
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
    setOpenMenuId(null);
    const mentionCount = getMentionCountForEntity(entityId);
    const message = mentionCount > 0
      ? `This entity is mentioned ${mentionCount} time(s). Are you sure you want to delete it?`
      : 'Are you sure you want to delete this entity?';
    if (!confirm(message)) return;
    await deleteMentionsForEntity(entityId);
    await deleteEntity(entityId);
  };

  const filteredEntities = entities.filter(entity => {
    if (entityTypeFilter === 'all') return true;
    if (entityTypeFilter === 'untyped') return !entity.type;
    return entity.type === entityTypeFilter;
  });

  return (
    <>
      <div className="space-y-6">
        {/* Storage Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Storage</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">Connect your RemoteStorage account to sync your data across devices.</p>
              {mounted && remoteStorageClient.getRS() && (
                <LoginButtons rs={remoteStorageClient.getRS()!} />
              )}
            </div>

            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-lg transition-colors text-left group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">Export Data</span>
                <span className="text-xs text-muted-foreground">Download all your data as a JSON file</span>
              </div>
              <DownloadIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>

            <button
              onClick={handleImportFromTodonna}
              className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-lg transition-colors text-left group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">Import from Todonna</span>
                <span className="text-xs text-muted-foreground">One-time import of tasks from your Todonna storage</span>
              </div>
              <UploadIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
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
                <div
                  onClick={() => handleToggleKeyboardShortcuts(!showKeyboardShortcuts)}
                  className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-sm text-foreground">Show keyboard shortcut hints</span>
                  <span className="pointer-events-none shrink-0">
                    <Switch
                      checked={showKeyboardShortcuts}
                      onCheckedChange={handleToggleKeyboardShortcuts}
                    />
                  </span>
                </div>

                <div
                  onClick={() => { setHapticsEnabled(!hapticsEnabled); setHapticsEnabledState(!hapticsEnabled); }}
                  className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-lg transition-colors cursor-pointer"
                >
                  <span className="text-sm text-foreground">Haptic feedback on task completion</span>
                  <span className="pointer-events-none shrink-0">
                    <Switch
                      checked={hapticsEnabled}
                      onCheckedChange={(v) => { setHapticsEnabled(v); setHapticsEnabledState(v); }}
                    />
                  </span>
                </div>

                <div className="flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">Date of birth</span>
                    <span className="text-xs text-muted-foreground">Used to calculate your Life in Weeks view</span>
                  </div>
                  <input
                    type="date"
                    value={dob}
                    onChange={e => {
                      setDob(e.target.value);
                      localStorage.setItem('leptum_dob', e.target.value);
                    }}
                    className="px-2 py-1.5 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {isServiceWorkerSupported ? (
                  <>
                    <div
                      onClick={() => !isChecking && handleToggleOfflineMode(!offlineModeEnabled)}
                      className={`w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-lg transition-colors cursor-pointer ${isChecking ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-foreground">Application ready for offline use</span>
                        {swState.active && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <span className="text-xs text-muted-foreground">Active</span>
                          </div>
                        )}
                      </div>
                      <span className="pointer-events-none shrink-0">
                        <Switch
                          checked={offlineModeEnabled}
                          onCheckedChange={handleToggleOfflineMode}
                          disabled={isChecking}
                        />
                      </span>
                    </div>

                    {swState.updateAvailable && (
                      <div className="border border-blue-500/30 bg-blue-500/10 rounded-lg p-3">
                        <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                          <strong>Update available!</strong> A new version of the application is ready to install.
                        </p>
                        <button
                          onClick={handleUpdateApp}
                          className="min-h-[44px] px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm"
                        >
                          Update Now
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCheckForUpdates}
                      disabled={isChecking || !offlineModeEnabled}
                      className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-lg transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-sm text-foreground">Check for updates</span>
                      <span className="text-sm text-muted-foreground">
                        {isChecking ? 'Checking...' : 'Check'}
                      </span>
                    </button>
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

        {/* Integrations Section */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Integrations</h2>
          <p className="text-sm text-muted-foreground mb-4">Connect third-party services to import data.</p>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-sm font-medium">Google Calendar</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Paste your OAuth 2.0 Client ID (Web application) from{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground transition-colors"
                >
                  Google Cloud Console
                </a>
                . Make sure <code className="text-xs bg-muted px-1 py-0.5 rounded">{typeof window !== 'undefined' ? window.location.origin : 'your app origin'}</code> is listed under &quot;Authorized JavaScript origins&quot; and the Google Calendar API is enabled.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={googleClientId}
                  onChange={e => setGoogleClientId(e.target.value)}
                  placeholder="xxxx.apps.googleusercontent.com"
                  className="flex-1 text-sm px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <button
                  type="button"
                  onClick={() => { localStorage.setItem('leptum_google_client_id', googleClientId.trim()); }}
                  className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  Save
                </button>
                {googleClientId && (
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleClientId('');
                      localStorage.removeItem('leptum_google_client_id');
                      sessionStorage.removeItem('leptum_google_token');
                      sessionStorage.removeItem('leptum_google_token_exp');
                    }}
                    className="px-3 py-2 text-sm border border-border rounded hover:bg-muted transition-colors text-muted-foreground"
                    aria-label="Clear"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
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
                className="flex items-center gap-1.5 px-3 py-2 border border-border text-foreground text-sm rounded hover:bg-accent transition-colors"
                title="Extract mentions from existing insights"
              >
                <RefreshIcon className="h-4 w-4" />
                Migrate Mentions
              </button>
              <button
                onClick={() => handleOpenEntityModal()}
                className="flex items-center gap-1.5 px-4 py-2 border border-border text-foreground rounded hover:bg-accent transition-colors text-sm"
              >
                <PlusIcon className="h-4 w-4" />
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
                className={`px-3 py-1 rounded text-sm transition-colors border ${
                  entityTypeFilter === type
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-foreground hover:bg-accent'
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

                    {/* 3-dot context menu */}
                    <div className="relative shrink-0" ref={openMenuId === entity.id ? menuRef : null}>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === entity.id ? null : entity.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                        aria-label="More options"
                      >
                        <DotsVerticalIcon className="h-4 w-4" />
                      </button>
                      {openMenuId === entity.id && (
                        <div className="absolute right-0 top-8 z-10 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                          <button
                            onClick={() => { setOpenMenuId(null); handleOpenEntityModal(entity); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors text-left"
                          >
                            <PencilIcon className="h-4 w-4 text-muted-foreground" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEntity(entity.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors text-left"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      )}
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
              Leptum is an open-source personal productivity tracker with local-first, user-owned data storage.
            </p>
            <a
              href="https://github.com/m5x5/leptum"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded hover:bg-accent transition-colors text-sm"
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
                <ExclamationIcon className="h-5 w-5" />
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
                    type: e.target.value === '' ? null : e.target.value as 'person' | 'project' | 'context',
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
                <p className="text-xs text-muted-foreground mt-1">Enter tags separated by commas</p>
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
                className="flex-1 px-4 py-2 border border-border text-foreground rounded hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
