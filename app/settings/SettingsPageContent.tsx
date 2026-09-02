"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useActivityWatch } from '../../utils/useActivityWatch';
import { remoteStorageClient } from '../../lib/remoteStorage';
import { solidHandleRedirect, solidRestore, solidLogin, solidLogout, getLastSolidIdp, consumeSolidReturnPath } from '../../lib/solidAuth';
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { Spinner } from '../../components/ui/spinner';
import { Button } from '../../components/ui/button';
import { serviceWorkerManager, isOfflineModeEnabled, setOfflineModeEnabled, ServiceWorkerState } from '../../utils/serviceWorker';
import { likelyWithKeyboard } from 'keyux';
import { useEntities, Entity } from '../../utils/useEntities';
import { useMentions } from '../../utils/useMentions';
import { extractMentionedEntityIds } from '../../components/ui/mention-input';
import { Separator } from '../../components/ui/separator';
import Modal from '../../components/Modal';
import { ContactSourcesPicker } from '../../components/Settings/ContactSourcesPicker';
import { Switch } from '../../components/ui/switch';
import { isHapticsEnabled, setHapticsEnabled } from '../../utils/haptics';
import { getStoredTimeFormat, setStoredTimeFormat, resolveUse24Hour } from '../../utils/useTimeFormat';
import type { ThemePreference, TimeFormat } from '../../lib/remoteStorage';
import { EXPERIMENTS, getEnabledExperiments, setEnabledExperimentsLocal, type ExperimentId } from '../../lib/experiments';
import { fetchSolidProfile } from '../../utils/solidProfile';
import {
  DownloadIcon,
  RefreshIcon,
  ExclamationIcon,
  DotsVerticalIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  PlusIcon,
  UserCircleIcon,
  CloudUploadIcon,
  ExternalLinkIcon,
  LogoutIcon,
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
  const [developerMode, setDeveloperMode] = useState(false);
  const [enabledExperiments, setEnabledExperimentsState] = useState<ExperimentId[]>([]);
  const [hapticsEnabled, setHapticsEnabledState] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>('system');
  const [dob, setDob] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  // Solid Pod connection state
  const solidSessionRef = useRef<SolidSessionInstance | null>(null);
  const [solidWebId, setSolidWebId] = useState<string | null>(null);
  const [solidIdpInput, setSolidIdpInput] = useState('');
  const [solidConnecting, setSolidConnecting] = useState(false);
  const [solidError, setSolidError] = useState<string | null>(null);
  const [solidSyncing, setSolidSyncing] = useState(false);
  const [solidSyncMessage, setSolidSyncMessage] = useState<string | null>(null);
  const [solidProfileName, setSolidProfileName] = useState<string | null>(null);
  const [solidProfilePhoto, setSolidProfilePhoto] = useState<string | null>(null);
  const [solidModalOpen, setSolidModalOpen] = useState(false);

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
      setShowKeyboardShortcutsState(storedKb !== null ? storedKb === 'true' : false);
      setEnabledExperimentsState(getEnabledExperiments());
      setDob(localStorage.getItem('leptum_dob') ?? '');
      setThemePreference((localStorage.getItem('theme') as ThemePreference | null) ?? 'system');
      // Load settings from Solid (overrides localStorage if present)
      remoteStorageClient.getUserSettings().then(settings => {
        if (settings.dateOfBirth) {
          setDob(settings.dateOfBirth);
          localStorage.setItem('leptum_dob', settings.dateOfBirth);
        }
        if (settings.showKeyboardShortcuts != null) {
          setShowKeyboardShortcutsState(settings.showKeyboardShortcuts);
          localStorage.setItem('showKeyboardShortcuts', settings.showKeyboardShortcuts.toString());
          window.dispatchEvent(new Event('keyboardShortcutsChanged'));
        }
        if (settings.enabledExperiments != null) {
          setEnabledExperimentsState(settings.enabledExperiments);
          setEnabledExperimentsLocal(settings.enabledExperiments);
        }
        if (settings.developerMode != null) {
          setDeveloperMode(settings.developerMode);
          localStorage.setItem('developerMode', settings.developerMode.toString());
          window.dispatchEvent(new Event('developerModeChanged'));
        }
        if (settings.theme) {
          setThemePreference(settings.theme);
          localStorage.setItem('theme', settings.theme);
          window.dispatchEvent(new Event('themeChanged'));
        }
        if (settings.timeFormat) {
          setTimeFormatState(settings.timeFormat);
          localStorage.setItem('timeFormat', settings.timeFormat);
          window.dispatchEvent(new Event('timeFormatChanged'));
        }
      });
      setGoogleClientId(localStorage.getItem('leptum_google_client_id') ?? '');
      setHapticsEnabledState(isHapticsEnabled());
      setTimeFormatState(getStoredTimeFormat());
    });

    const unsubscribe = serviceWorkerManager.subscribe((state) => {
      setSwState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Solid Pod session init: consume the OIDC redirect if we just came back from
  // login, otherwise try to restore a previous session via the refresh token grant.
  useEffect(() => {
    queueMicrotask(() => setSolidIdpInput(getLastSolidIdp()));
    let cancelled = false;
    const cameFromLogin =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('code');
    (async () => {
      try {
        const session = await solidHandleRedirect();
        if (!session.isActive) {
          await solidRestore();
        }
        if (cancelled) return;
        solidSessionRef.current = session;
        setSolidWebId(session.isActive ? session.webId ?? null : null);
        session.addEventListener('sessionStateChange', () => {
          setSolidWebId(session.isActive ? session.webId ?? null : null);
        });
        // If we just consumed a login redirect and the user started the
        // connect flow from another route, send them back there.
        if (cameFromLogin && session.isActive) {
          const returnTo = consumeSolidReturnPath();
          if (returnTo && returnTo !== '/settings') {
            window.location.replace(returnTo);
            return;
          }
        }
      } catch (error) {
        console.error('Failed to initialize Solid session:', error);
        if (!cancelled) setSolidError(error instanceof Error ? error.message : String(error));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the WebID profile document for the pod owner's real name/photo —
  // falls back to the URL-derived display name / generic icon when a field
  // is missing or the document doesn't parse (profile docs vary a lot).
  useEffect(() => {
    let cancelled = false;
    if (!solidWebId) {
      queueMicrotask(() => {
        if (cancelled) return;
        setSolidProfileName(null);
        setSolidProfilePhoto(null);
      });
      return () => {
        cancelled = true;
      };
    }
    (async () => {
      const { name, photo, birthDate } = await fetchSolidProfile(solidWebId, solidSessionRef.current);
      if (cancelled) return;
      setSolidProfileName(name);
      setSolidProfilePhoto(photo);
      if (birthDate) {
        setDob(birthDate);
        localStorage.setItem('leptum_dob', birthDate);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [solidWebId]);

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

  const handleToggleKeyboardShortcuts = async (enabled: boolean) => {
    localStorage.setItem('showKeyboardShortcuts', enabled.toString());
    setShowKeyboardShortcutsState(enabled);
    window.dispatchEvent(new Event('keyboardShortcutsChanged'));
    const settings = await remoteStorageClient.getUserSettings();
    await remoteStorageClient.saveUserSettings({ ...settings, showKeyboardShortcuts: enabled });
  };

  const handleToggleExperiment = async (id: ExperimentId, enabled: boolean) => {
    const next = enabled
      ? [...enabledExperiments.filter((e) => e !== id), id]
      : enabledExperiments.filter((e) => e !== id);
    setEnabledExperimentsState(next);
    setEnabledExperimentsLocal(next);
    const settings = await remoteStorageClient.getUserSettings();
    await remoteStorageClient.saveUserSettings({ ...settings, enabledExperiments: next });
  };

  const handleToggleDeveloperMode = async (enabled: boolean) => {
    localStorage.setItem('developerMode', enabled.toString());
    setDeveloperMode(enabled);
    window.dispatchEvent(new Event('developerModeChanged'));
    const settings = await remoteStorageClient.getUserSettings();
    await remoteStorageClient.saveUserSettings({ ...settings, developerMode: enabled });
  };

  const handleThemeChange = async (value: ThemePreference) => {
    localStorage.setItem('theme', value);
    setThemePreference(value);
    window.dispatchEvent(new Event('themeChanged'));
    const settings = await remoteStorageClient.getUserSettings();
    await remoteStorageClient.saveUserSettings({ ...settings, theme: value });
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
        goals, goalTypes, impacts, routines,
        standaloneTasks, routineCompletions, activityWatchData
      ] = await Promise.all([
        remoteStorageClient.getGoals(),
        remoteStorageClient.getGoalTypes(),
        remoteStorageClient.getImpacts(),
        remoteStorageClient.getRoutines(),
        remoteStorageClient.getStandaloneTasks(),
        remoteStorageClient.getRoutineCompletions(),
        remoteStorageClient.getActivityWatchData(),
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: { goals, goalTypes, impacts, routines, standaloneTasks, routineCompletions, activityWatchData },
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

  const handleOpenSolidModal = () => {
    setSolidError(null);
    setSolidModalOpen(true);
  };

  const handleSolidConnect = async () => {
    const idp = solidIdpInput.trim();
    if (!idp) {
      setSolidError('Enter your Solid Identity Provider URL (e.g. https://your-pod-server/)');
      return;
    }
    setSolidError(null);
    setSolidConnecting(true);
    try {
      await solidLogin(idp); // redirects the page to the IDP; does not return on success
    } catch (error) {
      console.error('Solid login failed:', error);
      setSolidError(error instanceof Error ? error.message : String(error));
      setSolidConnecting(false);
    }
  };

  const handleSolidDisconnect = async () => {
    try {
      await solidLogout();
    } finally {
      setSolidWebId(null);
      setSolidSyncMessage(null);
    }
  };

  // Pod root is derived from the WebID's first path segment, e.g.
  // https://pod.example/alice/profile/card#me -> https://pod.example/alice/
  const solidPodRoot = (webId: string): string => {
    const url = new URL(webId);
    const firstSegment = url.pathname.split('/').filter(Boolean)[0] ?? '';
    return `${url.origin}/${firstSegment}/`;
  };

  // Same first-path-segment as solidPodRoot, title-cased for display in place
  // of a generic "Solid Pod" label — falls back to the hostname if the WebID
  // has no path segment (e.g. https://pod.example/#me).
  const solidDisplayName = (webId: string): string => {
    const url = new URL(webId);
    const firstSegment = url.pathname.split('/').filter(Boolean)[0];
    const raw = firstSegment || url.hostname;
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  const handleSolidBackup = async () => {
    const session = solidSessionRef.current;
    if (!session || !solidWebId) return;
    setSolidSyncing(true);
    setSolidSyncMessage(null);
    try {
      const [
        goals, goalTypes, impacts, routines,
        standaloneTasks, routineCompletions
      ] = await Promise.all([
        remoteStorageClient.getGoals(),
        remoteStorageClient.getGoalTypes(),
        remoteStorageClient.getImpacts(),
        remoteStorageClient.getRoutines(),
        remoteStorageClient.getStandaloneTasks(),
        remoteStorageClient.getRoutineCompletions(),
      ]);

      const backup = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        data: { goals, goalTypes, impacts, routines, standaloneTasks, routineCompletions },
      };

      const resourceUrl = `${solidPodRoot(solidWebId)}leptum/backup.json`;
      const putRes = await session.authFetch(resourceUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup, null, 2),
      });
      if (!putRes.ok) {
        throw new Error(`Pod responded ${putRes.status} ${putRes.statusText}`);
      }

      // Read back to confirm the write actually landed on the pod.
      const getRes = await session.authFetch(resourceUrl);
      const savedText = await getRes.text();
      setSolidSyncMessage(`Saved ${savedText.length} bytes to ${resourceUrl}`);
    } catch (error) {
      console.error('Solid backup failed:', error);
      setSolidSyncMessage(error instanceof Error ? `Failed: ${error.message}` : 'Failed to save to pod');
    } finally {
      setSolidSyncing(false);
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
            <div className="border border-border rounded-control p-3 bg-muted/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  {mounted && solidWebId && solidProfilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={solidProfilePhoto}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <UserCircleIcon className="h-8 w-8 text-muted-foreground shrink-0" aria-hidden="true" />
                  )}
                  <div className="flex flex-col min-w-0">
                    <span
                      className="text-sm font-medium text-foreground truncate"
                      title={mounted && solidWebId ? solidWebId : undefined}
                    >
                      {mounted && solidWebId ? (solidProfileName ?? solidDisplayName(solidWebId)) : 'Solid Pod'}
                    </span>
                    {developerMode && mounted && solidWebId && (
                      <span className="text-xs text-muted-foreground break-all">{solidWebId}</span>
                    )}
                    {mounted && !solidWebId && (
                      <span className="text-xs text-muted-foreground">Not connected</span>
                    )}
                  </div>
                </div>
                {mounted && solidWebId ? (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <a
                      href={solidWebId}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
                    >
                      Open profile
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleSolidDisconnect}
                      aria-label="Disconnect"
                      title="Disconnect"
                    >
                      <LogoutIcon aria-hidden="true" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleOpenSolidModal}
                    className="shrink-0"
                  >
                    Connect
                  </Button>
                )}
              </div>

              {/* Session errors surface on the card while the connect dialog is closed. */}
              {mounted && !solidWebId && !solidModalOpen && solidError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">{solidError}</p>
              )}
            </div>

            <button
              onClick={handleExportData}
              className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors text-left group"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-sm text-foreground group-hover:text-primary transition-colors">Export Data</span>
                <span className="text-xs text-muted-foreground">Download all your data as a JSON file</span>
              </div>
              <DownloadIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </button>

            {mounted && solidWebId && (
              <div>
                <button
                  onClick={handleSolidBackup}
                  disabled={solidSyncing}
                  className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors text-left group disabled:opacity-50"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                      {solidSyncing ? 'Saving…' : 'Save backup to Pod'}
                    </span>
                    <span className="text-xs text-muted-foreground">Write a full backup of your data to your Solid pod</span>
                  </div>
                  <CloudUploadIcon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </button>
                {solidSyncMessage && (
                  <p className="text-xs text-muted-foreground break-all px-1">{solidSyncMessage}</p>
                )}
              </div>
            )}

          </div>
        </div>

        <Separator />

        {/* Application Section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Application</h2>
          <div className="space-y-4">
            {!mounted ? (
              <div className="py-2 h-10 animate-pulse bg-muted/20 rounded-control" />
            ) : (
              <div className="space-y-4">
                <div
                  onClick={() => handleToggleKeyboardShortcuts(!showKeyboardShortcuts)}
                  className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors cursor-pointer"
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
                  onClick={() => handleToggleDeveloperMode(!developerMode)}
                  className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors cursor-pointer"
                >
                  <span className="text-sm text-foreground">Use Leptum as a developer</span>
                  <span className="pointer-events-none shrink-0">
                    <Switch
                      checked={developerMode}
                      onCheckedChange={handleToggleDeveloperMode}
                    />
                  </span>
                </div>

                <div
                  onClick={() => { setHapticsEnabled(!hapticsEnabled); setHapticsEnabledState(!hapticsEnabled); }}
                  className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors cursor-pointer"
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
                    <span className="text-sm text-foreground">Theme</span>
                    <span className="text-xs text-muted-foreground">Choose light, dark, or system appearance</span>
                  </div>
                  <select
                    value={themePreference}
                    onChange={(e) => handleThemeChange(e.target.value as ThemePreference)}
                    className="px-2 py-1.5 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>

                <div className="flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">Time format</span>
                    <span className="text-xs text-muted-foreground">
                      System uses your locale ({resolveUse24Hour('system') ? '24-hour' : '12-hour'})
                    </span>
                  </div>
                  <select
                    value={timeFormat}
                    onChange={(e) => {
                      const value = e.target.value as TimeFormat;
                      setTimeFormatState(value);
                      setStoredTimeFormat(value);
                    }}
                    className="px-2 py-1.5 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="system">System</option>
                    <option value="12h">12-hour (1:30 PM)</option>
                    <option value="24h">24-hour (13:30)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-foreground">Date of birth</span>
                    <span className="text-xs text-muted-foreground">Used to calculate your Life in Weeks view</span>
                  </div>
                  {mounted && solidWebId ? (
                    <a
                      href={solidWebId}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-full font-medium hover:bg-accent transition-colors text-foreground"
                    >
                      Edit in profile
                      <ExternalLinkIcon className="h-4 w-4" />
                    </a>
                  ) : (
                    <input
                      type="date"
                      value={dob}
                      onChange={e => {
                        setDob(e.target.value);
                        localStorage.setItem('leptum_dob', e.target.value);
                      }}
                      className="px-2 py-1.5 border border-input rounded bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  )}
                </div>

                {isServiceWorkerSupported ? (
                  <>
                    <div
                      onClick={() => !isChecking && handleToggleOfflineMode(!offlineModeEnabled)}
                      className={`w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors cursor-pointer ${isChecking ? 'opacity-70 pointer-events-none' : ''}`}
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
                      <div className="border border-blue-500/30 bg-blue-500/10 rounded-control p-3">
                        <p className="text-sm text-blue-700 dark:text-blue-400 mb-2">
                          <strong>Update available!</strong> A new version of the application is ready to install.
                        </p>
                        <Button onClick={handleUpdateApp}>
                          Update Now
                        </Button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleCheckForUpdates}
                      disabled={isChecking || !offlineModeEnabled}
                      className="w-full flex items-center justify-between min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div id="experiments">
          <h2 className="text-lg font-semibold mb-1">Experiments</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Features still in development. They&apos;re off by default and hidden from navigation until enabled.
          </p>
          {!mounted ? (
            <div className="py-2 h-10 animate-pulse bg-muted/20 rounded-control" />
          ) : (
            <div className="space-y-4">
              {EXPERIMENTS.map((experiment) => {
                const isOn = enabledExperiments.includes(experiment.id);
                return (
                  <div
                    key={experiment.id}
                    onClick={() => handleToggleExperiment(experiment.id, !isOn)}
                    className="w-full flex items-center justify-between gap-4 min-h-[44px] py-3 px-1 -mx-1 hover:bg-accent/50 rounded-full transition-colors cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground">{experiment.label}</span>
                      <span className="block text-xs text-muted-foreground">{experiment.description}</span>
                    </span>
                    <span className="pointer-events-none shrink-0">
                      <Switch
                        checked={isOn}
                        onCheckedChange={(checked) => handleToggleExperiment(experiment.id, checked)}
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        <div>
          <h2 className="text-lg font-semibold mb-4">Integrations</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
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
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { localStorage.setItem('leptum_google_client_id', googleClientId.trim()); }}
                >
                  Save
                </Button>
                {googleClientId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setGoogleClientId('');
                      localStorage.removeItem('leptum_google_client_id');
                      sessionStorage.removeItem('leptum_google_token');
                      sessionStorage.removeItem('leptum_google_token_exp');
                    }}
                    aria-label="Clear"
                  >
                    <XIcon />
                  </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleMigrateMentions}
                className="gap-1.5"
                title="Extract mentions from existing insights"
              >
                <RefreshIcon />
                Migrate Mentions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenEntityModal()}
                className="gap-1.5"
              >
                <PlusIcon />
                Add Entity
              </Button>
            </div>
          </div>

          {/* Which Solid address books / groups feed @mention suggestions */}
          {mounted && solidWebId && (
            <div className="mb-4">
              <ContactSourcesPicker />
            </div>
          )}

          {/* Type Filter Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {(['all', 'person', 'project', 'context', 'untyped'] as const).map(type => (
              <button
                key={type}
                onClick={() => setEntityTypeFilter(type)}
                className={`px-3 py-1 rounded-full font-medium text-sm transition-colors border ${
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
            <Spinner className="h-5 w-5 text-muted-foreground my-2" />
          ) : filteredEntities.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No entities found. Add your first entity to start using @mentions!
            </p>
          ) : (
            <div className="space-y-2">
              {filteredEntities.map(entity => (
                <div
                  key={entity.id}
                  className="border border-border rounded-control p-3 bg-background hover:bg-accent/50 transition-colors"
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setOpenMenuId(openMenuId === entity.id ? null : entity.id)}
                        className="text-muted-foreground"
                        aria-label="More options"
                      >
                        <DotsVerticalIcon />
                      </Button>
                      {openMenuId === entity.id && (
                        <div className="absolute right-0 top-8 z-10 bg-popover border border-border rounded-control shadow-lg py-1 min-w-[120px]">
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
              Leptum is an open-source personal productivity tracker with local-first, user-owned data storage.{' '}
              <Link href="/about" className="underline text-foreground">Where your data lives</Link>
            </p>
            <a
              href="https://github.com/m5x5/leptum"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-full font-medium hover:bg-accent transition-colors text-sm"
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

      {/* Solid Pod connect dialog — the card only exposes a Connect button. */}
      <Modal isOpen={solidModalOpen} closeModal={() => setSolidModalOpen(false)}>
        <Modal.Title>Connect Solid Pod</Modal.Title>
        <Modal.Body>
          <div className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Leptum stores your data in your own Solid pod. Enter the Identity Provider that hosts it
              and you&apos;ll be sent there to sign in.
            </p>
            <div className="space-y-2">
              <label htmlFor="solid-idp" className="text-sm font-medium text-foreground block">
                Identity Provider URL
              </label>
              <input
                id="solid-idp"
                type="text"
                value={solidIdpInput}
                onChange={(e) => setSolidIdpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !solidConnecting) handleSolidConnect();
                }}
                placeholder="https://your-pod-server/"
                autoFocus
                className="px-3 py-2.5 w-full h-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-900 text-inherit outline-none focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-solid focus:outline-gray-900 dark:focus:outline-white box-border text-sm"
              />
              {solidError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">{solidError}</p>
              )}
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSolidModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSolidConnect}
              disabled={solidConnecting}
            >
              {solidConnecting ? 'Connecting…' : 'Connect with Solid'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Entity Add/Edit Modal */}
      {entityModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-card p-5 max-w-md w-full max-h-[90dvh] overflow-y-auto">
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
                  className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
                  className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
                  className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
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
                  className="flex h-10 w-full rounded-chip border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  placeholder="comma, separated, tags"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter tags separated by commas</p>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleSaveEntity} className="flex-1">
                {editingEntity ? 'Update' : 'Add'}
              </Button>
              <Button variant="outline" onClick={handleCloseEntityModal} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
