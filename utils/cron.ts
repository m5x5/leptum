import parser from "cron-parser";
import cronstrue from "cronstrue";
import prettyMilliseconds from "pretty-ms";

const warnedInvalidCrons = new Set<string>();
const warnInvalidCron = (cron: string, err: unknown) => {
  const key = String(cron);
  if (warnedInvalidCrons.has(key)) return;
  warnedInvalidCrons.add(key);
  console.warn(`Invalid cron expression "${key}":`, err instanceof Error ? err.message : err);
};

// Throws on an invalid expression — used by isCronValid.
const parseNextOccurrence = (cron: string): Date => parser.parseExpression(cron).next().toDate();

/** Next occurrence as a Date, or null if the expression is invalid. */
export const getNextOccurrence = (cron: string): Date | null => {
  try {
    return parseNextOccurrence(cron);
  } catch (err) {
    warnInvalidCron(cron, err);
    return null;
  }
};

/** Milliseconds until the next occurrence, or null if the expression is invalid. */
const timeTillNextOccurrence = (cron: string): number | null => {
  const nextOccurrence = getNextOccurrence(cron);
  if (!nextOccurrence) return null;
  return nextOccurrence.getTime() - Date.now();
};

export const getPrettyTimeTillNextOccurrence = (cron: string): string => {
  const time = timeTillNextOccurrence(cron);
  if (time === null) return "";
  return prettyMilliseconds(time, {
    secondsDecimalDigits: 0,
    unitCount: 2,
  });
};

export const getDescription = (cron: string, options: { use24Hour?: boolean } = {}): string => {
  try {
    let descriptiveName = cronstrue.toString(cron, {
      use24HourTimeFormat: options.use24Hour ?? false,
    });
    const unwantedString = "At 0 minutes past the hour, ";
    if (descriptiveName.startsWith(unwantedString)) {
      descriptiveName = descriptiveName.replace(unwantedString, "");
      descriptiveName = descriptiveName.charAt(0).toUpperCase() + descriptiveName.slice(1);
    }
    return descriptiveName;
  } catch {
    return "";
  }
};

interface Scheduled {
  cron: string;
  status?: string;
}


const isCronValid = (obj: { cron: string }): boolean => {
  try {
    parseNextOccurrence(obj.cron);
    return true;
  } catch {
    return false;
  }
};
