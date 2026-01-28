export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
}

const LOG_STORAGE_KEY = 'stylefusion_logs';
const MAX_LOGS = 500;
const logs: LogEntry[] = [];

function getTimestamp(): string {
  return new Date().toISOString();
}

function safeStringify(data: unknown): string {
  try {
    return JSON.stringify(data);
  } catch {
    return '[unserializable]';
  }
}

function persistToStorage(): void {
  try {
    const storedLogs = logs.slice(-MAX_LOGS);
    localStorage.setItem(LOG_STORAGE_KEY, safeStringify(storedLogs));
  } catch (e) {
    console.warn('Failed to persist logs to localStorage:', e);
  }
}

function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      logs.length = 0; // Clear existing to prevent duplicates on hot reload
      logs.push(...parsed);
      // Cap in-memory logs after loading
      if (logs.length > MAX_LOGS) {
        logs.splice(0, logs.length - MAX_LOGS);
      }
    }
  } catch (e) {
    console.warn('Failed to load logs from localStorage:', e);
  }
}

loadFromStorage();

export function log(level: LogLevel, message: string, data?: unknown): void {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    data
  };

  logs.push(entry);

  // Trim in-memory array to prevent unbounded growth
  if (logs.length > MAX_LOGS) {
    logs.splice(0, logs.length - MAX_LOGS);
  }

  const consoleMethod = level === LogLevel.ERROR ? console.error
    : level === LogLevel.WARN ? console.warn
    : console.log;
  consoleMethod(`[${entry.timestamp}] [${level}] ${message}`, data ?? '');

  persistToStorage();
}

export const logger = {
  debug: (msg: string, data?: unknown) => log(LogLevel.DEBUG, msg, data),
  info: (msg: string, data?: unknown) => log(LogLevel.INFO, msg, data),
  warn: (msg: string, data?: unknown) => log(LogLevel.WARN, msg, data),
  error: (msg: string, data?: unknown) => log(LogLevel.ERROR, msg, data),
};

export function downloadLogs(): void {
  const logText = logs.map(entry => {
    const dataStr = entry.data ? ` | ${safeStringify(entry.data)}` : '';
    return `[${entry.timestamp}] [${entry.level}] ${entry.message}${dataStr}`;
  }).join('\n');

  const blob = new Blob([logText || 'No logs recorded yet.'], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stylefusion-logs-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function clearLogs(): void {
  logs.length = 0;
  localStorage.removeItem(LOG_STORAGE_KEY);
}

export function getLogCount(): number {
  return logs.length;
}
