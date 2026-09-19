export type JobStatus =
  | 'pending'
  | 'processing'
  | 'waiting_transcription'
  | 'completed'
  | 'failed';

export interface Job {
  id: number;
  telegram_chat_id: string;
  telegram_message_id: number;
  sender_user_id: string;
  original_file_id: string;
  local_file_path: string;
  status: JobStatus;
  created_at: string;
  started_at?: string | null;
  completed_at?: string | null;
  transcription?: string | null;
  error?: string | null;
  transcriber_message_id?: number | null;
  outgoing_mtproto_message_id?: number | null;
  bot_reply_message_id?: number | null;
  delete_status?: 'pending' | 'deleted' | 'failed' | null;
  deleted_at?: string | null;
  delete_error?: string | null;
  attempts: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  meta?: Record<string, unknown>;
}

export interface MetricsResponse {
  app: {
    status: string;
    uptime: string;
    uptime_seconds: number;
    node_version: string;
    memory: {
      rss: string;
      heap_total: string;
      heap_used: string;
    };
  };
  database: {
    status: string;
    path: string;
    total_jobs: number;
    by_status: Record<JobStatus, number>;
  };
  worker: {
    status: string;
    active: boolean;
    diagnostics?: unknown;
  };
  jobs: {
    total: number;
    recent: Job[];
    by_status: Record<JobStatus, number>;
  };
  errors: {
    failed_jobs: Job[];
    error_logs: LogEntry[];
  };
  logs: LogEntry[];
}
