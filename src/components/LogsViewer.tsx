import { useState } from 'react';
import { Terminal, RefreshCw, Filter, Search } from 'lucide-react';
import type { LogEntry } from '../types.js';

interface LogsViewerProps {
  logs: LogEntry[];
  onRefresh: () => void;
}

export function LogsViewer({ logs, onRefresh }: LogsViewerProps) {
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const inMsg = log.message.toLowerCase().includes(q);
      const inMeta = log.meta ? JSON.stringify(log.meta).toLowerCase().includes(q) : false;
      return inMsg || inMeta;
    }
    return true;
  });

  const getLevelBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-rose-950 text-rose-400 border border-rose-800';
      case 'warn':
        return 'bg-amber-950 text-amber-400 border border-amber-800';
      case 'info':
        return 'bg-indigo-950 text-indigo-300 border border-indigo-800';
      case 'debug':
        return 'bg-slate-800 text-slate-400 border border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  return (
    <div id="logs-viewer-container" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 sm:px-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Structured Application Logs</h3>
          <p className="text-xs text-slate-500">Live in-memory stream with timestamps and structured JSON metadata</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            {(['all', 'info', 'warn', 'error', 'debug'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevelFilter(lvl)}
                className={`px-2 py-1 rounded capitalize font-medium transition cursor-pointer ${
                  levelFilter === lvl ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs..."
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal log output */}
      <div className="bg-slate-950 p-4 font-mono text-xs overflow-y-auto max-h-[500px] space-y-2">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No matching logs found</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={index} className="border-b border-slate-900/80 pb-2 leading-relaxed">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-slate-500">{log.timestamp}</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${getLevelBadge(log.level)}`}>
                  {log.level}
                </span>
                <span className="text-slate-200">{log.message}</span>
              </div>
              {log.meta && (
                <pre className="mt-1 ml-4 text-[11px] text-slate-400 bg-slate-900/60 p-2 rounded overflow-x-auto border border-slate-900">
                  {JSON.stringify(log.meta, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
