import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import type { LogEntry } from './types.js';

class Logger {
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 500;
  private logFilePath: string;

  constructor() {
    this.logFilePath = config.logFilePath;
    try {
      const dir = path.dirname(this.logFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch {
      // Ignore directory creation failure
    }
  }

  private append(level: LogEntry['level'], message: string, meta?: unknown) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      meta: typeof meta === 'object' && meta !== null ? (meta as Record<string, unknown>) : meta ? { data: meta } : undefined,
    };

    this.logBuffer.unshift(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.pop();
    }

    const logLine = `[${entry.timestamp}] [${level.toUpperCase()}] ${message}${
      meta ? ' ' + JSON.stringify(meta) : ''
    }`;

    if (level === 'error') {
      console.error(logLine);
    } else if (level === 'warn') {
      console.warn(logLine);
    } else if (level === 'debug') {
      console.debug(logLine);
    } else {
      console.log(logLine);
    }

    try {
      fs.appendFileSync(this.logFilePath, logLine + '\n', 'utf8');
    } catch {
      // Ignore file write errors
    }
  }

  public info(message: string, meta?: unknown) {
    this.append('info', message, meta);
  }

  public warn(message: string, meta?: unknown) {
    this.append('warn', message, meta);
  }

  public error(message: string, err?: unknown, meta?: unknown) {
    let combinedMeta: Record<string, unknown> = {};
    if (err instanceof Error) {
      combinedMeta.error = err.message;
      combinedMeta.stack = err.stack;
    } else if (err) {
      combinedMeta.error = String(err);
    }
    if (typeof meta === 'object' && meta !== null) {
      combinedMeta = { ...combinedMeta, ...(meta as Record<string, unknown>) };
    }
    this.append('error', message, Object.keys(combinedMeta).length > 0 ? combinedMeta : undefined);
  }

  public debug(message: string, meta?: unknown) {
    this.append('debug', message, meta);
  }

  public getRecentLogs(limit = 100): LogEntry[] {
    return this.logBuffer.slice(0, limit);
  }

  public getErrorLogs(limit = 50): LogEntry[] {
    return this.logBuffer.filter((l) => l.level === 'error').slice(0, limit);
  }
}

export const logger = new Logger();
