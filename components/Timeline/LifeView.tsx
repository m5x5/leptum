"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useWeekReflections, WeekReflection } from '../../utils/useWeekReflections';
import { useQuickNotes } from '../../utils/useQuickNotes';
import { usePhotoAttachments } from '../../utils/usePhotoAttachments';
import { AudioPlayer } from '../ui/audio-player';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';

interface Impact {
  id?: string;
  activity: string;
  date: number;
  endTime?: number;
}

interface LifeViewProps {
  impacts: Impact[];
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toWeekKey(monday: Date): string {
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatYear(date: Date): string {
  return date.getFullYear().toString();
}

const TOTAL_YEARS = 90;
const WEEKS_PER_YEAR = 52;

// ─── WeekRow ─────────────────────────────────────────────────────────────────
// Memoized so only the 1-2 rows containing old/new selected week re-render
// on click, and only the row containing a saved reflection re-renders on save.

interface WeekRowProps {
  yearIdx: number;
  birthMonday: Date;
  todayKey: string;
  /** The selected weekKey if it belongs to this row, otherwise null. */
  rowSelectedKey: string | null;
  /** Set of weekKeys in this row that have a reflection saved. */
  rowReflectionKeys: ReadonlySet<string>;
  onSelect: (weekKey: string) => void;
}

const WeekRow = memo(function WeekRow({
  yearIdx,
  birthMonday,
  todayKey,
  rowSelectedKey,
  rowReflectionKeys,
  onSelect,
}: WeekRowProps) {
  return (
    <div className="flex items-center gap-0.5 mb-0.5">
      <div
        className="w-10 shrink-0 text-right text-xs text-muted-foreground pr-1.5 select-none"
        style={{ lineHeight: '10px' }}
      >
        {yearIdx % 5 === 0 ? yearIdx : ''}
      </div>
      {Array.from({ length: WEEKS_PER_YEAR }, (_, weekIdx) => {
        const cellN = yearIdx * WEEKS_PER_YEAR + weekIdx;
        const cellMonday = addDays(birthMonday, cellN * 7);
        const weekKey = toWeekKey(cellMonday);
        const isPast = cellMonday.getTime() <= new Date(todayKey).getTime();
        const isCurrent = weekKey === todayKey;
        const hasReflection = rowReflectionKeys.has(weekKey);
        const isSelected = weekKey === rowSelectedKey;

        let cls = 'w-2.5 h-2.5 rounded-[1px] cursor-pointer transition-all hover:scale-125 hover:z-10 relative';
        if (isCurrent) cls += ' ring-1 ring-primary bg-primary/40';
        else if (isPast && hasReflection) cls += ' bg-primary/60';
        else if (isPast) cls += ' bg-primary/25';
        else cls += ' bg-muted/30';
        if (isSelected) cls += ' ring-2 ring-offset-1 ring-primary/80';

        const tooltip = `${formatDateShort(cellMonday)} – ${formatDateShort(addDays(cellMonday, 6))}, ${formatYear(cellMonday)} · Age ${yearIdx}`;

        return (
          <button
            key={weekIdx}
            type="button"
            title={tooltip}
            aria-label={tooltip}
            className={cls}
            onClick={() => onSelect(weekKey)}
          />
        );
      })}
    </div>
  );
});

// ─── WeekDetailPanel ─────────────────────────────────────────────────────────
// Isolated component: owns notes/photos/audio state so their updates
// never propagate up to the grid.

interface WeekDetailPanelProps {
  weekKey: string;
  weekStart: Date;
  weekEnd: Date;
  age: number;
  impacts: Impact[];
  initialText: string;
  saveReflection: (weekKey: string, text: string) => void;
  onClose: () => void;
  inDrawer?: boolean;
}

function WeekDetailPanel({
  weekKey,
  weekStart,
  weekEnd,
  age,
  impacts,
  initialText,
  saveReflection,
  onClose,
  inDrawer,
}: WeekDetailPanelProps) {
  const { notes, getAudio } = useQuickNotes();
  const { photos } = usePhotoAttachments();

  // Audio blob URLs — updates stay inside this component
  const [audioBlobUrls, setAudioBlobUrls] = useState<Record<string, string>>({});
  const audioUrlRef = useRef<Record<string, string>>({});

  // Stable refs so the textarea handler is always (() => void) with no deps
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weekKeyRef = useRef(weekKey);
  const saveRef = useRef(saveReflection);
  saveRef.current = saveReflection;

  // Load audio for notes in this week
  useEffect(() => {
    const ws = weekStart.getTime();
    const we = weekEnd.getTime();
    const weekNotes = notes.filter(n => n.createdAt >= ws && n.createdAt < we);

    weekNotes.filter(n => n.audioPath).forEach(async (note) => {
      if (audioUrlRef.current[note.id]) return;
      const blob = await getAudio(note);
      if (blob) {
        const url = URL.createObjectURL(blob);
        audioUrlRef.current[note.id] = url;
        setAudioBlobUrls(prev => ({ ...prev, [note.id]: url }));
      }
    });
  }, [notes, getAudio, weekStart, weekEnd]);

  // Revoke blob URLs when this panel unmounts (week changed or closed)
  useEffect(() => {
    const urls = audioUrlRef.current;
    return () => {
      Object.values(urls).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  // Stable onChange — zero dependencies, never re-created
  const handleChange = useCallback((text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      saveRef.current(weekKeyRef.current, text);
    }, 800);
  }, []);

  const ws = weekStart.getTime();
  const we = weekEnd.getTime();
  const weekNotes = notes.filter(n => n.createdAt >= ws && n.createdAt < we);
  const weekImpacts = impacts.filter(imp => imp.date >= ws && imp.date < we);

  return (
    <div className={inDrawer ? 'space-y-4' : 'lg:w-80 xl:w-96 shrink-0 border border-border rounded-lg p-4 space-y-4 overflow-y-auto max-h-[70vh] lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]'}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-sm">
            {formatDateShort(weekStart)} – {formatDateShort(addDays(weekStart, 6))}, {formatYear(weekStart)}
          </h3>
          {age >= 0 && (
            <p className="text-xs text-muted-foreground">Age {age}</p>
          )}
        </div>
        {!inDrawer && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none mt-0.5"
            aria-label="Close panel"
          >
            ×
          </button>
        )}
      </div>

      {/* Reflection — uncontrolled textarea, no state, no re-renders on keystrokes */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Weekly reflection
        </label>
        <textarea
          ref={textareaRef}
          defaultValue={initialText}
          onChange={e => handleChange(e.target.value)}
          placeholder="What happened this week? How did it feel?"
          className="w-full text-sm px-3 py-2 border border-input rounded bg-background text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          rows={4}
        />
      </div>

      {/* Quick notes */}
      {weekNotes.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Quick notes ({weekNotes.length})
          </h4>
          <div className="space-y-2">
            {weekNotes.map(note => {
              const notePhotos = photos.filter(p => p.impactId === note.id);
              const audioUrl = audioBlobUrls[note.id];
              return (
                <div key={note.id} className="border border-border rounded p-2.5 bg-card space-y-1.5">
                  {note.text && (
                    <p className="text-sm text-foreground">{note.text}</p>
                  )}
                  {notePhotos.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {notePhotos.map(photo => (
                        <img
                          key={photo.id}
                          src={photo.thumbnail}
                          alt=""
                          className="w-16 h-16 object-cover rounded border border-border"
                        />
                      ))}
                    </div>
                  )}
                  {note.audioPath && audioUrl && (
                    <AudioPlayer src={audioUrl} compact />
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' · '}
                    {new Date(note.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Timeline impacts */}
      {weekImpacts.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">
            Activities ({weekImpacts.length})
          </h4>
          <div className="space-y-1">
            {weekImpacts.map((imp, i) => (
              <div key={imp.id ?? i} className="flex items-baseline gap-2 text-sm">
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(imp.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
                <span className="text-foreground truncate">{imp.activity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {weekNotes.length === 0 && weekImpacts.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No notes or activities recorded for this week.</p>
      )}
    </div>
  );
}

// ─── LifeView ────────────────────────────────────────────────────────────────
// Owns only: dob, selectedWeekKey, reflections (for grid cell colors).
// All heavy data (notes/photos/audio) stays inside WeekDetailPanel.

export function LifeView({ impacts }: LifeViewProps) {
  const [dob, setDob] = useState<Date | null>(null);
  const [dobMissing, setDobMissing] = useState(false);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);

  const { reflections, saveReflection } = useWeekReflections();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('leptum_dob') : null;
    if (!raw) { setDobMissing(true); return; }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) { setDobMissing(true); return; }
    setDob(parsed);
    setDobMissing(false);
  }, []);

  // All hooks must be declared before any early return.
  const birthMonday = useMemo(() => dob ? getMondayOfWeek(dob) : null, [dob]);
  const todayKey = useMemo(() => toWeekKey(getMondayOfWeek(new Date())), []);

  // Stable select handler — empty deps, never recreated
  const handleSelect = useCallback((weekKey: string) => {
    setSelectedWeekKey(prev => prev === weekKey ? null : weekKey);
  }, []);

  // Which row contains the selected week — only that row gets rowSelectedKey != null
  const selectedYearIdx = useMemo(() => {
    if (!selectedWeekKey || !birthMonday) return -1;
    const diffMs = new Date(selectedWeekKey).getTime() - birthMonday.getTime();
    const cellN = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.floor(cellN / WEEKS_PER_YEAR);
  }, [selectedWeekKey, birthMonday]);

  // Per-row sets of weekKeys that have reflections
  const reflectionKeysByRow = useMemo(() => {
    const rows: Set<string>[] = Array.from({ length: TOTAL_YEARS }, () => new Set<string>());
    if (!birthMonday) return rows;
    for (const key of Object.keys(reflections)) {
      if (!(reflections[key] as WeekReflection | undefined)?.text) continue;
      const diffMs = new Date(key).getTime() - birthMonday.getTime();
      const cellN = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
      const yi = Math.floor(cellN / WEEKS_PER_YEAR);
      if (yi >= 0 && yi < TOTAL_YEARS) rows[yi].add(key);
    }
    return rows;
  }, [reflections, birthMonday]);

  // Detail panel props
  const panelProps = useMemo(() => {
    if (!selectedWeekKey || !dob) return null;
    const weekStart = new Date(selectedWeekKey);
    const weekEnd = addDays(weekStart, 7);
    const age = Math.floor(
      (weekStart.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return { weekStart, weekEnd, age, initialText: reflections[selectedWeekKey]?.text ?? '' };
  }, [selectedWeekKey, dob, reflections]);

  // ── Early returns after all hooks ──
  if (dobMissing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="text-4xl">📅</div>
        <h2 className="text-xl font-semibold">Date of Birth Required</h2>
        <p className="text-muted-foreground max-w-sm">
          To show your Life in Weeks, please set your date of birth in Settings.
        </p>
        <a
          href="/settings"
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm"
        >
          Go to Settings
        </a>
      </div>
    );
  }

  if (!birthMonday) return null;

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-4 min-h-0">
      {/* Grid — each WeekRow is memoized; clicking re-renders only 2 rows */}
      <div className="flex-1 min-w-0 overflow-auto">
        <div className="inline-block min-w-max">
          <div className="flex items-start gap-0.5">
            <div className="w-10 shrink-0" />
            <div>
              {Array.from({ length: TOTAL_YEARS }, (_, yearIdx) => (
                <WeekRow
                  key={yearIdx}
                  yearIdx={yearIdx}
                  birthMonday={birthMonday}
                  todayKey={todayKey}
                  rowSelectedKey={yearIdx === selectedYearIdx ? selectedWeekKey : null}
                  rowReflectionKeys={reflectionKeysByRow[yearIdx]}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop side panel */}
      {!isMobile && selectedWeekKey && panelProps && (
        <WeekDetailPanel
          key={selectedWeekKey}
          weekKey={selectedWeekKey}
          weekStart={panelProps.weekStart}
          weekEnd={panelProps.weekEnd}
          age={panelProps.age}
          impacts={impacts}
          initialText={panelProps.initialText}
          saveReflection={saveReflection}
          onClose={() => setSelectedWeekKey(null)}
        />
      )}
    </div>

    {/* Mobile bottom drawer */}
    <Drawer
      open={isMobile && !!selectedWeekKey}
      onOpenChange={open => { if (!open) setSelectedWeekKey(null); }}
    >
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Week detail</DrawerTitle>
        </DrawerHeader>
        {isMobile && selectedWeekKey && panelProps && (
          <div className="overflow-y-auto px-4 pb-6">
            <WeekDetailPanel
              key={selectedWeekKey}
              weekKey={selectedWeekKey}
              weekStart={panelProps.weekStart}
              weekEnd={panelProps.weekEnd}
              age={panelProps.age}
              impacts={impacts}
              initialText={panelProps.initialText}
              saveReflection={saveReflection}
              onClose={() => setSelectedWeekKey(null)}
              inDrawer
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
    </>
  );
}
