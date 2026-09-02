"use client";

import Image from 'next/image';
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useWeekReflections, WeekReflection } from '../../utils/useWeekReflections';
import { useQuickNotes } from '../../utils/useQuickNotes';
import { usePhotoAttachments } from '../../utils/usePhotoAttachments';
import { useLifeEvents, LifeEvent } from '../../utils/useLifeEvents';
import dynamic from 'next/dynamic';
// wavesurfer is ~200KB and only needed when a note actually has audio.
const AudioPlayer = dynamic(() => import('../ui/audio-player').then((m) => m.AudioPlayer), {
  ssr: false,
  loading: () => <div className="h-10 rounded-full bg-muted/40 animate-pulse" aria-hidden />,
});
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { ImportGoogleCalendarModal } from '../Modal/ImportGoogleCalendarModal';
import { GCalBadge } from '../ui/gcal-badge';
import { ImportSourceButton } from '../ui/import-source-button';
import { Button } from '../ui/button';
import { remoteStorageClient } from '../../lib/remoteStorage';
import { CalendarIcon } from '@heroicons/react/outline';

interface Impact {
  id?: string;
  activity: string;
  date: number;
  endTime?: number;
  sourceUrl?: string;
}

interface LifeViewProps {
  impacts: Impact[];
  onImportAW?: () => void;
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

function addWeeks(weekKey: string, n: number): string {
  return toWeekKey(addDays(new Date(weekKey), n * 7));
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatYear(date: Date): string {
  return date.getFullYear().toString();
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const TOTAL_YEARS = 90;
const WEEKS_PER_YEAR = 52;

// Preset colors for life events
const EVENT_COLORS = [
  { label: 'Red',    value: '#ef4444' },
  { label: 'Orange', value: '#f97316' },
  { label: 'Amber',  value: '#f59e0b' },
  { label: 'Yellow', value: '#eab308' },
  { label: 'Lime',   value: '#84cc16' },
  { label: 'Green',  value: '#22c55e' },
  { label: 'Teal',   value: '#14b8a6' },
  { label: 'Cyan',   value: '#06b6d4' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Indigo', value: '#6366f1' },
  { label: 'Purple', value: '#a855f7' },
  { label: 'Pink',   value: '#ec4899' },
  { label: 'Rose',   value: '#f43f5e' },
];

// ─── WeekRow ─────────────────────────────────────────────────────────────────

interface WeekRowProps {
  yearIdx: number;
  birthMonday: Date;
  todayKey: string;
  rowSelectedKey: string | null;
  rowReflectionKeys: ReadonlySet<string>;
  rowEventColors: ReadonlyMap<string, string>;
  showEvents: boolean;
  showDiary: boolean;
  onSelect: (weekKey: string) => void;
}

const WeekRow = memo(function WeekRow({
  yearIdx,
  birthMonday,
  todayKey,
  rowSelectedKey,
  rowReflectionKeys,
  rowEventColors,
  showEvents,
  showDiary,
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
        const eventColor = showEvents ? rowEventColors.get(weekKey) : undefined;

        let cls = 'w-2.5 h-2.5 rounded-[1px] cursor-pointer transition-all hover:scale-125 hover:z-10 relative';
        if (isSelected) cls += ' ring-2 ring-offset-1 ring-primary/80';
        if (isCurrent) cls += ' ring-1 ring-primary';

        const tooltip = `${formatDateShort(cellMonday)} – ${formatDateShort(addDays(cellMonday, 6))}, ${formatYear(cellMonday)} · Age ${yearIdx}`;

        // Resolve background: event color > diary highlight > baseline
        let bgCls = '';
        const bgStyle: React.CSSProperties = {};

        if (eventColor) {
          bgStyle.backgroundColor = eventColor;
          bgStyle.opacity = isPast ? 0.75 : 0.35;
        } else if (isCurrent) {
          bgCls = ' bg-primary/40';
        } else if (isPast && showDiary && hasReflection) {
          bgCls = ' bg-primary/60';
        } else if (isPast) {
          bgCls = showDiary ? ' bg-primary/20' : ' bg-foreground/20';
        } else {
          bgCls = ' bg-muted/20';
        }

        return (
          <button
            key={weekIdx}
            type="button"
            title={tooltip}
            aria-label={tooltip}
            className={cls + bgCls}
            style={bgStyle}
            onClick={() => onSelect(weekKey)}
          />
        );
      })}
    </div>
  );
});

// ─── LifeEventForm ────────────────────────────────────────────────────────────

interface LifeEventFormProps {
  initial?: Partial<LifeEvent>;
  currentWeekKey: string;
  onSave: (e: LifeEvent) => void;
  onCancel: () => void;
}

function LifeEventForm({ initial, currentWeekKey, onSave, onCancel }: LifeEventFormProps) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [startWeek, setStartWeek] = useState(initial?.startWeek ?? currentWeekKey);
  const [endWeek, setEndWeek] = useState(initial?.endWeek ?? currentWeekKey);
  const [color, setColor] = useState(initial?.color ?? EVENT_COLORS[0].value);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    const start = startWeek <= endWeek ? startWeek : endWeek;
    const end   = startWeek <= endWeek ? endWeek   : startWeek;
    onSave({
      id: initial?.id ?? generateId(),
      label: label.trim(),
      startWeek: start,
      endWeek: end,
      color,
      createdAt: initial?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 bg-muted/20 rounded-control p-3 border border-border">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">Label</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="e.g. University, First job, Travel year…"
          className="w-full text-sm px-2.5 py-1.5 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Start week</label>
          <input
            type="date"
            value={startWeek}
            onChange={e => setStartWeek(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">End week</label>
          <input
            type="date"
            value={endWeek}
            onChange={e => setEndWeek(e.target.value)}
            className="w-full text-xs px-2 py-1.5 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Color</label>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              title={c.label}
              onClick={() => setColor(c.value)}
              className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: c.value,
                borderColor: color === c.value ? 'white' : 'transparent',
                outline: color === c.value ? `2px solid ${c.value}` : 'none',
              }}
            />
          ))}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          size="sm"
          className="flex-1"
        >
          {initial?.id ? 'Save changes' : 'Add event'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── WeekDetailPanel ─────────────────────────────────────────────────────────

interface WeekDetailPanelProps {
  weekKey: string;
  weekStart: Date;
  weekEnd: Date;
  age: number;
  impacts: Impact[];
  initialText: string;
  saveReflection: (weekKey: string, text: string) => void;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  events: LifeEvent[];
  onSaveEvent: (e: LifeEvent) => void;
  onDeleteEvent: (id: string) => void;
  onImportAW: () => void;
  onImportGCal: () => void;
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
  onNavigate,
  events,
  onSaveEvent,
  onDeleteEvent,
  onImportAW,
  onImportGCal,
  inDrawer,
}: WeekDetailPanelProps) {
  const { notes, getAudio } = useQuickNotes();
  const { photos } = usePhotoAttachments();

  const [audioBlobUrls, setAudioBlobUrls] = useState<Record<string, string>>({});
  const audioUrlRef = useRef<Record<string, string>>({});

  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weekKeyRef = useRef(weekKey);
  const saveRef = useRef(saveReflection);
  useEffect(() => {
    saveRef.current = saveReflection;
  });

  // Keep weekKeyRef up to date when weekKey changes (navigation)
  useEffect(() => {
    weekKeyRef.current = weekKey;
    // Reset textarea value when navigating
    if (textareaRef.current) {
      textareaRef.current.value = initialText;
    }
  }, [weekKey, initialText]);

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

  useEffect(() => {
    const urls = audioUrlRef.current;
    return () => {
      Object.values(urls).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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

  // Events that overlap this week
  const weekEvents = events.filter(e => e.startWeek <= weekKey && e.endWeek >= weekKey);

  return (
    <div className={inDrawer ? 'space-y-4' : 'lg:w-80 xl:w-96 shrink-0 border border-border rounded-control p-4 space-y-4 overflow-y-auto max-h-[70vh] lg:sticky lg:top-4 lg:max-h-[calc(100vh-8rem)]'}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          {/* Prev/Next navigation */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('prev')}
            className="text-muted-foreground shrink-0"
            aria-label="Previous week"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight">
              {formatDateShort(weekStart)} – {formatDateShort(addDays(weekStart, 6))}, {formatYear(weekStart)}
            </h3>
            {age >= 0 && (
              <p className="text-xs text-muted-foreground">Age {age}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onNavigate('next')}
            className="text-muted-foreground shrink-0"
            aria-label="Next week"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
        {!inDrawer && (
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none mt-0.5 shrink-0"
            aria-label="Close panel"
          >
            ×
          </button>
        )}
      </div>

      {/* Life events for this week */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="text-xs font-medium text-muted-foreground">Life events</h4>
          {!showEventForm && !editingEvent && (
            <button
              type="button"
              onClick={() => setShowEventForm(true)}
              className="text-xs text-primary hover:underline"
            >
              + Add
            </button>
          )}
        </div>

        {showEventForm && (
          <LifeEventForm
            currentWeekKey={weekKey}
            onSave={e => { onSaveEvent(e); setShowEventForm(false); }}
            onCancel={() => setShowEventForm(false)}
          />
        )}

        {weekEvents.length > 0 && (
          <div className="space-y-1.5">
            {weekEvents.map(event => (
              editingEvent?.id === event.id ? (
                <LifeEventForm
                  key={event.id}
                  initial={event}
                  currentWeekKey={weekKey}
                  onSave={e => { onSaveEvent(e); setEditingEvent(null); }}
                  onCancel={() => setEditingEvent(null)}
                />
              ) : (
                <div
                  key={event.id}
                  className="flex items-center gap-2 text-sm group"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: event.color }}
                  />
                  <span className="flex-1 truncate text-xs">
                    <span className="font-medium">{event.label}</span>
                    <span className="text-muted-foreground ml-1.5">
                      {event.startWeek === event.endWeek
                        ? formatDateShort(new Date(event.startWeek))
                        : `${formatDateShort(new Date(event.startWeek))} – ${formatDateShort(new Date(event.endWeek))}`}
                    </span>
                  </span>
                  <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 group-focus-within:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingEvent(event)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      aria-label="Edit event"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEvent(event.id)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      aria-label="Delete event"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {weekEvents.length === 0 && !showEventForm && (
          <p className="text-xs text-muted-foreground italic">No events for this period.</p>
        )}
      </div>

      {/* Reflection */}
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
                        <Image
                          key={photo.id}
                          src={photo.thumbnail}
                          alt=""
                          width={64}
                          height={64}
                          unoptimized
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
      <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-medium text-muted-foreground">
              Activities{weekImpacts.length > 0 ? ` (${weekImpacts.length})` : ''}
            </h4>
            <ImportSourceButton
              size="sm"
              onActivityWatch={onImportAW}
              onGoogleCalendar={onImportGCal}
            />
          </div>
          {weekImpacts.length > 0 ? (
            <div className="space-y-1">
              {weekImpacts.map((imp, i) => (
                <div key={imp.id ?? i} className="flex items-baseline gap-2 text-sm">
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(imp.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <span className="text-foreground truncate flex items-center gap-1">
                    {imp.id?.startsWith('gcal-') && <GCalBadge href={imp.sourceUrl} />}
                    {imp.activity}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No activities recorded for this week.</p>
          )}
        </div>
      
    </div>
  );
}

// ─── LifeView ────────────────────────────────────────────────────────────────

export function LifeView({ impacts, onImportAW }: LifeViewProps) {
  const [dob, setDob] = useState<Date | null>(null);
  const [dobMissing, setDobMissing] = useState(false);
  const [selectedWeekKey, setSelectedWeekKey] = useState<string | null>(null);
  const [showEvents, setShowEvents] = useState(true);
  const [showDiary, setShowDiary] = useState(true);

  const { reflections, saveReflection } = useWeekReflections();
  const { events, saveEvent, deleteEvent } = useLifeEvents();

  const [gcalOpen, setGcalOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const applyDob = (raw: string | null) => {
      if (!raw) { setDobMissing(true); return; }
      const parsed = new Date(raw);
      if (isNaN(parsed.getTime())) { setDobMissing(true); return; }
      setDob(parsed);
      setDobMissing(false);
    };

    // Try localStorage first for instant render
    const localDob = typeof window !== 'undefined' ? localStorage.getItem('leptum_dob') : null;
    applyDob(localDob);

    // Then check Solid storage (may have been set on another device)
    remoteStorageClient.getUserSettings().then(settings => {
      if (settings.dateOfBirth) {
        localStorage.setItem('leptum_dob', settings.dateOfBirth);
        applyDob(settings.dateOfBirth);
      }
    });
  }, []);

  const birthMonday = useMemo(() => dob ? getMondayOfWeek(dob) : null, [dob]);
  const todayKey = useMemo(() => toWeekKey(getMondayOfWeek(new Date())), []);

  const handleSelect = useCallback((weekKey: string) => {
    setSelectedWeekKey(prev => prev === weekKey ? null : weekKey);
  }, []);

  const handleNavigate = useCallback((direction: 'prev' | 'next') => {
    setSelectedWeekKey(prev => prev ? addWeeks(prev, direction === 'next' ? 1 : -1) : prev);
  }, []);

  const selectedYearIdx = useMemo(() => {
    if (!selectedWeekKey || !birthMonday) return -1;
    const diffMs = new Date(selectedWeekKey).getTime() - birthMonday.getTime();
    const cellN = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    return Math.floor(cellN / WEEKS_PER_YEAR);
  }, [selectedWeekKey, birthMonday]);

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

  // Build per-row event color maps: rowEventColorsByRow[yearIdx] -> Map<weekKey, color>
  const eventColorsByRow = useMemo(() => {
    const rows: Map<string, string>[] = Array.from({ length: TOTAL_YEARS }, () => new Map<string, string>());
    if (!birthMonday || events.length === 0) return rows;

    for (const event of events) {
      let cur = new Date(event.startWeek);
      const end = new Date(event.endWeek);
      while (cur <= end) {
        const wk = toWeekKey(cur);
        const diffMs = cur.getTime() - birthMonday.getTime();
        const cellN = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
        const yi = Math.floor(cellN / WEEKS_PER_YEAR);
        if (yi >= 0 && yi < TOTAL_YEARS) {
          rows[yi].set(wk, event.color);
        }
        cur = addDays(cur, 7);
      }
    }
    return rows;
  }, [events, birthMonday]);

  const panelProps = useMemo(() => {
    if (!selectedWeekKey || !dob) return null;
    const weekStart = new Date(selectedWeekKey);
    const weekEnd = addDays(weekStart, 7);
    const age = Math.floor(
      (weekStart.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return { weekStart, weekEnd, age, initialText: reflections[selectedWeekKey]?.text ?? '' };
  }, [selectedWeekKey, dob, reflections]);

  if (dobMissing) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <CalendarIcon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
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

  const detailPanel = selectedWeekKey && panelProps ? (
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
      onNavigate={handleNavigate}
      events={events}
      onSaveEvent={saveEvent}
      onDeleteEvent={deleteEvent}
      onImportAW={() => onImportAW?.()}
      onImportGCal={() => setGcalOpen(true)}
    />
  ) : null;

  return (
    <>
    <div className="flex flex-col lg:flex-row gap-4 min-h-0">
      {/* Grid */}
      <div className="flex-1 min-w-0 overflow-auto">
        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => setShowEvents(v => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              showEvents
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            Life events
          </button>
          <button
            type="button"
            onClick={() => setShowDiary(v => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              showDiary
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'bg-transparent border-border text-muted-foreground hover:border-muted-foreground/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current opacity-80" />
            Diary
          </button>
        </div>

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
                  rowEventColors={eventColorsByRow[yearIdx]}
                  showEvents={showEvents}
                  showDiary={showDiary}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop side panel */}
      {!isMobile && detailPanel}
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
              onNavigate={handleNavigate}
              events={events}
              onSaveEvent={saveEvent}
              onDeleteEvent={deleteEvent}
              onImportAW={() => onImportAW?.()}
              onImportGCal={() => setGcalOpen(true)}
              inDrawer
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>

    {/* Google Calendar import modal */}
    <ImportGoogleCalendarModal
      isOpen={gcalOpen}
      closeModal={() => setGcalOpen(false)}
      weekStart={panelProps?.weekStart}
      weekEnd={panelProps?.weekEnd}
    />
    </>
  );
}
