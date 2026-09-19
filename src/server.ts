import express, { type Request, type Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { config } from './config.js';
import { logger } from './logger.js';
import { db } from './database.js';
import { jobsRouter } from './routes/jobs.js';
import { telegramRouter } from './routes/telegram.js';
import { transcriberWorker } from './transcriber/worker.js';
import type { MetricsResponse } from './types.js';

const app = express();
const PORT = 3000;
const serverStartTime = Date.now();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  if (!req.path.startsWith('/@') && !req.path.includes('.') && req.path !== '/health') {
    logger.debug(`${req.method} ${req.path}`);
  }
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Helper for uptime string
function getFormattedUptime(): string {
  const seconds = Math.floor((Date.now() - serverStartTime) / 1000);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  return `${m}m ${s}s`;
}

// System Status endpoint
app.get('/api/status', async (_req: Request, res: Response) => {
  try {
    const totalJobs = await db.getJobsCount();
    const countsByStatus = await db.getJobsCountByStatus();
    const workerDiag = transcriberWorker.getDiagnostics();
    const mem = process.memoryUsage();

    res.status(200).json({
      app: {
        status: 'healthy',
        uptime: getFormattedUptime(),
        uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
        node_version: process.version,
        memory: {
          rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
          heap_total: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
          heap_used: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        },
      },
      database: {
        status: 'connected',
        path: config.databasePath,
        total_jobs: totalJobs,
        by_status: countsByStatus,
      },
      worker: {
        status: workerDiag.running ? 'active' : 'idle',
        active: workerDiag.running,
        diagnostics: workerDiag,
      },
    });
  } catch (err) {
    logger.error('Error serving /api/status', err);
    res.status(500).json({ error: 'Failed to retrieve system status' });
  }
});

// Admin login endpoint
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body || {};
  const expectedUser = config.adminUsername || 'admin';
  const expectedPassword = config.adminPassword;

  if (username !== expectedUser) {
    return res.status(401).json({ error: 'Неверное имя пользователя' });
  }

  if (expectedPassword && password !== expectedPassword) {
    return res.status(401).json({ error: 'Неверный пароль администратора' });
  }

  const token = 'admin_session_' + Buffer.from(`${username}:${Date.now()}`).toString('base64');
  logger.info(`Admin user "${username}" logged in successfully`);
  res.status(200).json({ success: true, token });
});

// Admin metrics endpoint
app.get('/api/admin/metrics', async (_req: Request, res: Response) => {
  try {
    const [totalJobs, countsByStatus, recentJobs, failedJobs] = await Promise.all([
      db.getJobsCount(),
      db.getJobsCountByStatus(),
      db.getRecentJobs(100),
      db.getFailedJobs(50),
    ]);

    const mem = process.memoryUsage();
    const workerDiag = transcriberWorker.getDiagnostics();

    const response: MetricsResponse = {
      app: {
        status: 'healthy',
        uptime: getFormattedUptime(),
        uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
        node_version: process.version,
        memory: {
          rss: `${Math.round(mem.rss / 1024 / 1024)} MB`,
          heap_total: `${Math.round(mem.heapTotal / 1024 / 1024)} MB`,
          heap_used: `${Math.round(mem.heapUsed / 1024 / 1024)} MB`,
        },
      },
      database: {
        status: 'connected',
        path: config.databasePath,
        total_jobs: totalJobs,
        by_status: countsByStatus,
      },
      worker: {
        status: workerDiag.running ? 'active' : 'idle',
        active: workerDiag.running,
        diagnostics: workerDiag,
      },
      jobs: {
        total: totalJobs,
        recent: recentJobs,
        by_status: countsByStatus,
      },
      errors: {
        failed_jobs: failedJobs,
        error_logs: logger.getErrorLogs(50),
      },
      logs: logger.getRecentLogs(100),
    };

    res.status(200).json(response);
  } catch (err) {
    logger.error('Error generating admin metrics', err);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

// Mount modular sub-routers
app.use('/api/jobs', jobsRouter);
app.use('/api/telegram', telegramRouter);

// Start async server routine
async function startServer() {
  try {
    // 1. Initialize SQLite Database
    await db.init();
    logger.info('SQLite database schema verified');

    // 2. Start Transcriber Worker Queue
    await transcriberWorker.start();
    logger.info('Transcriber background worker initialized');

    // 3. Vite middleware for development or static serving for production
    if (process.env.NODE_ENV !== 'production') {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
      logger.info(`Telegram Voice Transcriber running on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    logger.error('Server failed to start', err);
    process.exit(1);
  }
}

startServer();
