const STORAGE_KEY = 'scooter_debug_logs';

export function isDebugEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function setDebugEnabled(enabled: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
}

export function logDebug(...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.log(...args);
  }
}

export function warnDebug(...args: unknown[]): void {
  if (isDebugEnabled()) {
    console.warn(...args);
  }
}