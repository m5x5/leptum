/**
 * Returns current time in ms. Use in event handlers/callbacks only, not during render.
 */
export function getCurrentTime(): number {
  return Date.now();
}

/**
 * Returns a short random id. Use in event handlers/callbacks only, not during render.
 */
export function getRandomId(): string {
  return Math.random().toString(36).substr(2, 9);
}
