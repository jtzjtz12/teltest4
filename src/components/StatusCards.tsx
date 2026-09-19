import {
  Activity,
  Database,
  Cpu,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import type { MetricsResponse, JobStatus } from '../types.js';

interface StatusCardsProps {
  data: MetricsResponse;
  selectedStatus: string | null;
  onSelectStatus: (status: string | null) => void;
}

export function StatusCards({ data, selectedStatus, onSelectStatus }: StatusCardsProps) {
  const statusItems: Array<{ status: JobStatus; label: string; count: number; color: string; border: string }> = [
    {
      status: 'pending',
      label: 'Pending',
      count: data.jobs.by_status.pending || 0,
      color: 'bg-amber-50 text-amber-700',
      border: 'border-amber-200',
    },
    {
      status: 'processing',
      label: 'Processing',
      count: data.jobs.by_status.processing || 0,
      color: 'bg-blue-50 text-blue-700',
      border: 'border-blue-200',
    },
    {
      status: 'waiting_transcription',
      label: 'Waiting MTProto',
      count: data.jobs.by_status.waiting_transcription || 0,
      color: 'bg-purple-50 text-purple-700',
      border: 'border-purple-200',
    },
    {
      status: 'completed',
      label: 'Completed',
      count: data.jobs.by_status.completed || 0,
      color: 'bg-emerald-50 text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      status: 'failed',
      label: 'Failed',
      count: data.jobs.by_status.failed || 0,
      color: 'bg-rose-50 text-rose-700',
      border: 'border-rose-200',
    },
  ];

  return (
    <div id="status-overview-section" className="space-y-4">
      {/* Top System Health Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* App Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Application Health</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-base font-bold text-slate-900 capitalize">
                {data.app.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Uptime: {data.app.uptime}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        {/* Database Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">SQLite Database</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-base font-bold text-slate-900 capitalize">
                {data.database.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total: {data.jobs.total} voice jobs</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Worker Status */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Transcriber Worker</p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  data.worker.active ? 'bg-indigo-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              <span className="text-base font-bold text-slate-900 capitalize">
                {data.worker.status}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Queue & MTProto Listener</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Cpu className="w-5 h-5" />
          </div>
        </div>

        {/* System Memory / Env */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500 font-medium">Node.js Runtime</p>
            <p className="text-base font-bold text-slate-900 mt-1">{data.app.node_version}</p>
            <p className="text-[11px] text-slate-400 mt-1">Heap: {data.app.memory.heap_used}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Radio className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filterable Job Status Pills */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-600" />
            <h3 className="text-xs font-semibold text-slate-800">Job Pipeline Status Breakdown</h3>
          </div>
          {selectedStatus && (
            <button
              onClick={() => onSelectStatus(null)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Reset filter (Show all {data.jobs.total})
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {statusItems.map((item) => {
            const isSelected = selectedStatus === item.status;
            return (
              <button
                key={item.status}
                id={`status-card-${item.status}`}
                onClick={() => onSelectStatus(isSelected ? null : item.status)}
                className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 border-indigo-500 ' + item.color
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">{item.label}</span>
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-xl font-bold text-slate-900">{item.count}</span>
                  <span className="text-[10px] text-slate-400">jobs</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
