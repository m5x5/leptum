import parser from "cron-parser";
import cronstrue from "cronstrue";
import prettyMilliseconds from "pretty-ms";

export const getNextOccurrence = (cron) => {
  const cronTime = parser.parseExpression(cron);
  const nextOccurrence = cronTime.next().toDate();
  return nextOccurrence;
};

export const timeTillNextOccurrence = (cron) => {
  const nextOccurrence = getNextOccurrence(cron);
  const timeTillNextOccurrence = nextOccurrence - Date.now();
  return timeTillNextOccurrence;
};

export const getPrettyTimeTillNextOccurrence = (cron) => {
  const time = timeTillNextOccurrence(cron);
  const prettyTimeTillNextOccurrence = prettyMilliseconds(time, {
    secondsDecimalDigits: 0,
    unitCount: 2,
  });
  return prettyTimeTillNextOccurrence;
};

export const getDescription = (cron) => {
  let descriptiveName;
  try {
    descriptiveName = cronstrue.toString(cron);
    const unwantedString = "At 0 minutes past the hour, ";
    if (descriptiveName.startsWith(unwantedString)) {
      descriptiveName = descriptiveName.replace(unwantedString, "");
      const arr = descriptiveName.split("");
      arr[0] = arr[0].toUpperCase();
      descriptiveName = arr.join("");
    }
    return descriptiveName;
  } catch {
    return "";
  }
};

export const sortObjectsByDueDate = (a, b) => {
  const aDueDate = getNextOccurrence(a.cron);
  const bDueDate = getNextOccurrence(b.cron);
  if (aDueDate < bDueDate) {
    return -1;
  }
  if (aDueDate > bDueDate) {
    return 1;
  }
  return 0;
};

export const filterInvalidCron = (obj) => {
  try {
    getNextOccurrence(obj.cron);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
