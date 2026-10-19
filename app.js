import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { taskRouter } from './task-routes.js';
import { errorHandler } from './errors.js';

export function createApp({ store = createStore(), logging = true, origins } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null } } }));
  const allowed = origins ?? (process.env.CORS_ORIGINS || 'https://kaushiki809.github.io,http://localhost:5000,http://127.0.0.1:5000').split(',').map(value => value.trim()).filter(Boolean);
  app.use(cors({ origin: allowed, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
  if (logging) app.use(morgan(':method :url :status :response-time ms'));
  app.use(express.json({ limit: '10kb' }));
  app.get('/health', (req, res) => res.json({ status: 'ok', service: 'taskflow-api', storage: 'memory' }));
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api/tasks', taskRouter(store));
  // Only these browser assets are public; source, tests, and .env are never served.
  for (const name of ['index.html', 'styles.css', 'icon.svg', 'client.js', 'render.js', 'model.js']) {
    const path = fileURLToPath(new URL(name, import.meta.url));
    app.get(name === 'index.html' ? '/' : `/${name}`, (req, res) => res.sendFile(path, { dotfiles: 'allow' }));
  }
  app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
  app.use(errorHandler);
  return app;
}
