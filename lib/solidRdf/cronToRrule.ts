// Converts Leptum's 5-field cron strings ("minute hour dom month dow") to an
// iCalendar RRULE value string (RFC 5545), so Routine recurrence is expressed
// in the vocabulary every calendar/RDF tool already understands instead of a
// cron string nothing outside Leptum can read.
//
// This is best-effort: cron's fields are ANDed (e.g. "day 15 AND Friday"
// means only when both are true), while RRULE's BYMONTHDAY/BYDAY combine as
// OR within a MONTHLY rule. When that mismatch happens, `lossy` is set and
// `note` explains it — the caller decides whether to surface that.

type FieldSpec =
  | { kind: 'wildcard' }
  | { kind: 'stepAll'; step: number }
  | { kind: 'stepRange'; start: number; end: number; step: number }
  | { kind: 'range'; start: number; end: number }
  | { kind: 'list'; values: number[] }
  | { kind: 'single'; value: number };

function parseCronField(raw: string): FieldSpec {
  const f = raw.trim();
  if (f === '*') return { kind: 'wildcard' };
  if (f.includes(',')) return { kind: 'list', values: f.split(',').map((v) => parseInt(v, 10)) };
  if (f.includes('/')) {
    const [base, stepStr] = f.split('/');
    const step = parseInt(stepStr, 10);
    if (base === '*') return { kind: 'stepAll', step };
    if (base.includes('-')) {
      const [start, end] = base.split('-').map((v) => parseInt(v, 10));
      return { kind: 'stepRange', start, end, step };
    }
    return { kind: 'stepAll', step };
  }
  if (f.includes('-')) {
    const [start, end] = f.split('-').map((v) => parseInt(v, 10));
    return { kind: 'range', start, end };
  }
  return { kind: 'single', value: parseInt(f, 10) };
}

/** Fully expands a field to the concrete values it matches, or null for "unconstrained". */
function expandField(spec: FieldSpec, min: number, max: number): number[] | null {
  switch (spec.kind) {
    case 'wildcard':
      return null;
    case 'single':
      return [spec.value];
    case 'list':
      return spec.values;
    case 'range': {
      const out: number[] = [];
      for (let i = spec.start; i <= spec.end; i++) out.push(i);
      return out;
    }
    case 'stepRange': {
      const out: number[] = [];
      for (let i = spec.start; i <= spec.end; i += spec.step) out.push(i);
      return out;
    }
    case 'stepAll': {
      const out: number[] = [];
      for (let i = min; i <= max; i += spec.step) out.push(i);
      return out;
    }
  }
}

const DOW_ICAL = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
function dowToIcal(n: number): string {
  return DOW_ICAL[((n % 7) + 7) % 7];
}

export interface CronToRRuleResult {
  rrule: string;
  /** True when the RRULE is an approximation of the original cron semantics. */
  lossy: boolean;
  note?: string;
}

export function cronToRRule(cronExpr: string): CronToRRuleResult {
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length !== 5) {
    return {
      rrule: 'FREQ=DAILY',
      lossy: true,
      note: `Unrecognized cron format "${cronExpr}" (expected 5 fields); defaulted to FREQ=DAILY.`,
    };
  }
  const [minRaw, hourRaw, domRaw, monthRaw, dowRaw] = parts;
  const minute = parseCronField(minRaw);
  const hour = parseCronField(hourRaw);
  const dom = parseCronField(domRaw);
  const month = parseCronField(monthRaw);
  const dow = parseCronField(dowRaw);

  const minuteVals = expandField(minute, 0, 59);
  const hourVals = expandField(hour, 0, 23);
  const domVals = expandField(dom, 1, 31);
  const monthVals = expandField(month, 1, 12);
  const dowVals = expandField(dow, 0, 6);

  const byParts: string[] = [];
  let freq: string;
  let interval: number | null = null;
  let lossy = false;
  const notes: string[] = [];
  let addHour = true;
  let addMinute = true;

  if (dowVals !== null && domVals === null) {
    freq = 'WEEKLY';
    byParts.push(`BYDAY=${dowVals.map(dowToIcal).join(',')}`);
  } else if (domVals !== null && dowVals === null) {
    freq = 'MONTHLY';
    byParts.push(`BYMONTHDAY=${domVals.join(',')}`);
  } else if (domVals !== null && dowVals !== null) {
    freq = 'MONTHLY';
    byParts.push(`BYMONTHDAY=${domVals.join(',')}`);
    byParts.push(`BYDAY=${dowVals.map(dowToIcal).join(',')}`);
    lossy = true;
    notes.push(
      'cron ANDs day-of-month with day-of-week; RRULE ORs BYMONTHDAY/BYDAY here, which widens the match.'
    );
  } else if (hour.kind === 'stepAll') {
    freq = 'HOURLY';
    interval = hour.step;
    addHour = false;
  } else if (hourVals === null && minute.kind === 'stepAll') {
    freq = 'MINUTELY';
    interval = minute.step;
    addHour = false;
    addMinute = false;
  } else {
    freq = 'DAILY';
  }

  if (addHour && hourVals !== null) byParts.push(`BYHOUR=${hourVals.join(',')}`);
  if (addMinute) byParts.push(`BYMINUTE=${minuteVals !== null ? minuteVals.join(',') : '0'}`);
  if (monthVals !== null) byParts.push(`BYMONTH=${monthVals.join(',')}`);

  const rule = [`FREQ=${freq}`, interval !== null ? `INTERVAL=${interval}` : null, ...byParts]
    .filter((x): x is string => x !== null)
    .join(';');

  return { rrule: rule, lossy, note: notes.length ? notes.join(' ') : undefined };
}

const ICAL_DOW: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
const dowFromIcal = (s: string) =>
  s
    .split(',')
    .map((d) => ICAL_DOW[d])
    .filter((n) => n !== undefined)
    .join(',');

/**
 * Inverse of cronToRRule(), scoped to exactly the RRULE shapes that function
 * produces — not a general RRULE parser. Reads a Solid-authored Routine's
 * ical:rrule back into the 5-field cron string useRoutineScheduler() needs.
 * Returns undefined for FREQ values cronToRRule never emits (YEARLY, etc.).
 */
export function rruleToCron(rrule: string): string | undefined {
  const parts: Record<string, string> = {};
  for (const p of rrule.split(';')) {
    const [k, v] = p.split('=');
    if (k && v) parts[k] = v;
  }
  const { FREQ: freq, INTERVAL: intervalRaw, BYMINUTE: byMinute, BYHOUR: byHour, BYMONTHDAY: byMonthDay, BYDAY: byDay, BYMONTH: byMonth } = parts;
  const interval = intervalRaw ? parseInt(intervalRaw, 10) : undefined;
  const month = byMonth ?? '*';

  switch (freq) {
    case 'MINUTELY':
      return `*/${interval ?? 1} * * * *`;
    case 'HOURLY':
      return `${byMinute ?? '0'} */${interval ?? 1} * * *`;
    case 'WEEKLY':
      return byDay ? `${byMinute ?? '0'} ${byHour ?? '*'} * ${month} ${dowFromIcal(byDay)}` : undefined;
    case 'MONTHLY':
      return byMonthDay
        ? `${byMinute ?? '0'} ${byHour ?? '*'} ${byMonthDay} ${month} ${byDay ? dowFromIcal(byDay) : '*'}`
        : undefined;
    case 'DAILY':
      return `${byMinute ?? '0'} ${byHour ?? '*'} * ${month} *`;
    default:
      return undefined;
  }
}
