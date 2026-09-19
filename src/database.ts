import fs from 'fs';
import path from 'path';
import { createClient, type Client, type InArgs } from '@libsql/client';
import { config } from './config.js';
import type { Job, JobStatus } from './types.js';

export { type Job, type JobStatus } from './types.js';

class DatabaseService {
  private client: Client;

  constructor() {
    let dbUrl = config.databasePath;
    if (!dbUrl.startsWith('file:') && !dbUrl.startsWith('libsql:') && !dbUrl.startsWith('http:') && !dbUrl.startsWith('https:')) {
      const absPath = path.resolve(process.cwd(), dbUrl);
      const dir = path.dirname(absPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      dbUrl = `file:${absPath}`;
    }

    this.client = createClient({ url: dbUrl });
    this.init().catch((err) => {
      console.error('[Database] Failed to initialize database schema', err);
    });
  }

  public async init(): Promise<void> {
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_chat_id TEXT NOT NULL,
        telegram_message_id INTEGER NOT NULL,
        sender_user_id TEXT NOT NULL,
        original_file_id TEXT NOT NULL,
        local_file_path TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'processing', 'waiting_transcription', 'completed', 'failed')),
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        transcription TEXT,
        error TEXT,
        transcriber_message_id INTEGER,
        outgoing_mtproto_message_id INTEGER,
        bot_reply_message_id INTEGER,
        delete_status TEXT NOT NULL DEFAULT 'pending',
        deleted_at TEXT,
        delete_error TEXT,
        attempts INTEGER NOT NULL DEFAULT 0
      );
    `;
    await this.client.execute(createTableSql);
  }

  private mapRow(row: Record<string, unknown>): Job {
    return {
      id: Number(row.id),
      telegram_chat_id: String(row.telegram_chat_id || ''),
      telegram_message_id: Number(row.telegram_message_id || 0),
      sender_user_id: String(row.sender_user_id || ''),
      original_file_id: String(row.original_file_id || ''),
      local_file_path: String(row.local_file_path || ''),
      status: (row.status as JobStatus) || 'pending',
      created_at: String(row.created_at || ''),
      started_at: row.started_at ? String(row.started_at) : null,
      completed_at: row.completed_at ? String(row.completed_at) : null,
      transcription: row.transcription ? String(row.transcription) : null,
      error: row.error ? String(row.error) : null,
      transcriber_message_id: row.transcriber_message_id != null ? Number(row.transcriber_message_id) : null,
      outgoing_mtproto_message_id: row.outgoing_mtproto_message_id != null ? Number(row.outgoing_mtproto_message_id) : null,
      bot_reply_message_id: row.bot_reply_message_id != null ? Number(row.bot_reply_message_id) : null,
      delete_status: (row.delete_status as Job['delete_status']) || 'pending',
      deleted_at: row.deleted_at ? String(row.deleted_at) : null,
      delete_error: row.delete_error ? String(row.delete_error) : null,
      attempts: Number(row.attempts || 0),
    };
  }

  public async getRecentJobs(limit = 50, status?: string): Promise<Job[]> {
    let sql = 'SELECT * FROM jobs';
    const args: unknown[] = [];

    if (status && status !== 'all') {
      sql += ' WHERE status = ?';
      args.push(status);
    }

    sql += ' ORDER BY id DESC LIMIT ?';
    args.push(limit);

    const rs = await this.client.execute({ sql, args: args as InArgs });
    return rs.rows.map((r) => this.mapRow(r as unknown as Record<string, unknown>));
  }

  public async getJobById(id: number): Promise<Job | null> {
    const rs = await this.client.execute({
      sql: 'SELECT * FROM jobs WHERE id = ? LIMIT 1',
      args: [id],
    });
    if (rs.rows.length === 0) return null;
    return this.mapRow(rs.rows[0] as unknown as Record<string, unknown>);
  }

  public async createJob(jobData: Partial<Job>): Promise<Job> {
    const now = new Date().toISOString();
    const telegram_chat_id = String(jobData.telegram_chat_id || '');
    const telegram_message_id = Number(jobData.telegram_message_id || 0);
    const sender_user_id = String(jobData.sender_user_id || 'unknown');
    const original_file_id = String(jobData.original_file_id || '');
    const local_file_path = String(jobData.local_file_path || '');
    const status: JobStatus = jobData.status || 'pending';
    const created_at = jobData.created_at || now;
    const transcription = jobData.transcription || null;
    const error = jobData.error || null;
    const attempts = Number(jobData.attempts || 0);

    const rs = await this.client.execute({
      sql: `
        INSERT INTO jobs (
          telegram_chat_id,
          telegram_message_id,
          sender_user_id,
          original_file_id,
          local_file_path,
          status,
          created_at,
          transcription,
          error,
          attempts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        telegram_chat_id,
        telegram_message_id,
        sender_user_id,
        original_file_id,
        local_file_path,
        status,
        created_at,
        transcription,
        error,
        attempts,
      ],
    });

    const newId = Number(rs.lastInsertRowid);
    const created = await this.getJobById(newId);
    if (!created) {
      throw new Error(`Failed to retrieve newly inserted job #${newId}`);
    }
    return created;
  }

  public async updateJob(id: number, updates: Record<string, unknown>): Promise<Job | null> {
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return this.getJobById(id);
    }

    const setClauses: string[] = [];
    const args: unknown[] = [];

    for (const key of keys) {
      setClauses.push(`${key} = ?`);
      args.push(updates[key]);
    }

    args.push(id);
    const sql = `UPDATE jobs SET ${setClauses.join(', ')} WHERE id = ?`;
    await this.client.execute({ sql, args: args as InArgs });

    return this.getJobById(id);
  }

  public async getJobsCount(): Promise<number> {
    const rs = await this.client.execute('SELECT COUNT(*) as count FROM jobs');
    return Number(rs.rows[0]?.count || 0);
  }

  public async getJobsCountByStatus(): Promise<Record<JobStatus, number>> {
    const counts: Record<JobStatus, number> = {
      pending: 0,
      processing: 0,
      waiting_transcription: 0,
      completed: 0,
      failed: 0,
    };

    const rs = await this.client.execute(
      'SELECT status, COUNT(*) as count FROM jobs GROUP BY status'
    );

    for (const row of rs.rows) {
      const st = row.status as JobStatus;
      if (counts[st] !== undefined) {
        counts[st] = Number(row.count || 0);
      }
    }

    return counts;
  }

  public async getFailedJobs(limit = 50): Promise<Job[]> {
    return this.getRecentJobs(limit, 'failed');
  }
}

export const db = new DatabaseService();
