import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { connectDB } from './config/database';
import authRoutes from './routes/authRoutes';
import videoRoutes from './routes/videoRoutes';
import adminRoutes from './routes/adminRoutes';

const app = express();

connectDB();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'MongoDB Atlas',
      storage: 'Supabase'
    },
    version: '1.0.0'
  };
  res.status(200).json(healthCheck);
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

export default app;
