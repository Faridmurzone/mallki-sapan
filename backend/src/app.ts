import express from 'express';
import cors from 'cors';
import 'express-async-errors';

import { errorHandler } from './middleware/error-handler.js';
import { LOCAL_STORAGE_DIR } from './services/storage.js';
import sensorsRouter from './routes/sensors.js';
import calibrationRouter from './routes/calibration.js';
import cropsRouter from './routes/crops.js';
import alertsRouter from './routes/alerts.js';
import photosRouter from './routes/photos.js';
import camerasRouter from './routes/cameras.js';
import irrigationRouter from './routes/irrigation.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Sólo parsea application/json: el body binario de la ingesta de imágenes lo
// toma express.raw() en su propia ruta y este middleware no lo toca.
app.use(express.json());

// Imágenes ingestadas por las cámaras, servidas desde el driver de storage
// local. Con un bucket real esto lo reemplaza la URL del bucket.
app.use('/storage', express.static(LOCAL_STORAGE_DIR, {
  maxAge: '1d',
  index: false,
  dotfiles: 'deny',
}));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/sensors', sensorsRouter);
app.use('/api/calibration', calibrationRouter);
app.use('/api/crops', cropsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/cameras', camerasRouter);
app.use('/api/irrigation', irrigationRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handler
app.use(errorHandler);

export default app;
