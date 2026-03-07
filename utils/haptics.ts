const STORAGE_KEY = 'leptum_haptics';

export function isHapticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  // Default on — only disabled if explicitly set to 'false'
  return stored !== 'false';
}

export function setHapticsEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(enabled));
}

/** Short tap — use when checking off a task */
export function hapticTap(): void {
  if (!isHapticsEnabled()) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(30);
  }
}
