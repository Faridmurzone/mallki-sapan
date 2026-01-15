import express from 'express';
import cors from 'cors';
import 'express-async-errors';

import { errorHandler } from './middleware/error-handler.js';
import sensorsRouter from './routes/sensors.js';
import cropsRouter from './routes/crops.js';
import alertsRouter from './routes/alerts.js';
import photosRouter from './routes/photos.js';
import irrigationRouter from './routes/irrigation.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/sensors', sensorsRouter);
app.use('/api/crops', cropsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/irrigation', irrigationRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handler
app.use(errorHandler);

export default app;
