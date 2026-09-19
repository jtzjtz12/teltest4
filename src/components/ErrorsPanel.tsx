import { useState } from 'react';
import { AlertTriangle, RefreshCw, Terminal, CheckCircle2 } from 'lucide-react';
import type { Job, LogEntry } from '../types.js';

interface ErrorsPanelProps {
  failedJobs: Job[];
  errorLogs: LogEntry[];
  onRefresh: () => void;
}

export function ErrorsPanel({ failedJobs, errorLogs, onRefresh }: ErrorsPanelProps) {
  const [retryingId, setRetryingId] = useState<number | null>(null);

  const handleRetry = async (jobId: number) => {
    setRetryingId(jobId);
    try {
      await fetch(`/api/jobs/${jobId}/retry`, { method: 'POST' });
      onRefresh();
    } catch (err) {
      console.error('Failed to retry job', err);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div id="errors-panel-container" className="space-y-6">
      {/* Failed Jobs Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">Failed Voice Jobs ({failedJobs.length})</h3>
              <p className="text-xs text-slate-500">Tasks that failed during audio download or MTProto transcription</p>
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {failedJobs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">No failed jobs recorded</p>
            <p className="text-slate-400 mt-0.5">All voice jobs processed cleanly without exceptions</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {failedJobs.map((job) => (
              <div key={job.id} className="p-4 hover:bg-slate-50/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">Job #{job.id}</span>
                    <span className="text-[11px] text-slate-400">Chat {job.telegram_chat_id} • Msg {job.telegram_message_id}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-semibold">
                      {job.attempts} attempts
                    </span>
                  </div>
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 text-xs font-mono p-2 rounded-lg max-w-2xl break-words">
                    {job.error || 'Unknown failure occurred'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Failed at: {job.completed_at || job.created_at}
                  </div>
                </div>

                <button
                  id={`retry-failed-job-${job.id}`}
                  onClick={() => handleRetry(job.id)}
                  disabled={retryingId === job.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs transition self-start sm:self-center disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${retryingId === job.id ? 'animate-spin' : ''}`} />
                  <span>Re-queue Job</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Error Logs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-slate-600" />
            <div>
              <h3 className="text-base font-semibold text-slate-900">Application Error Logs ({errorLogs.length})</h3>
              <p className="text-xs text-slate-500">Filtered structured exceptions and diagnostic stack traces</p>
            </div>
          </div>
        </div>

        {errorLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">No error logs captured</p>
          </div>
        ) : (
          <div className="p-4 bg-slate-950 font-mono text-xs overflow-x-auto max-h-96 space-y-2">
            {errorLogs.map((log, index) => (
              <div key={index} className="border-b border-slate-900 pb-2 text-rose-400">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>{log.timestamp}</span>
                  <span className="px-1 bg-rose-950 text-rose-400 rounded font-bold uppercase">{log.level}</span>
                </div>
                <div className="mt-1 text-slate-100 font-semibold">{log.message}</div>
                {log.meta && (
                  <pre className="mt-1 text-[11px] text-rose-300 overflow-x-auto bg-slate-900 p-2 rounded">
                    {JSON.stringify(log.meta, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
