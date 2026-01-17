import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import designRoutes from './routes/design.routes';
import { config } from './config';

const app = express();

/* ===== Middlewares ===== */
app.use(
  cors({
    origin: [
      'https://new.express.adobe.com',
      'http://localhost:5241', // Adobe local dev
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '50mb' })); // Increased limit for PNG base64 uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});

/* ===== Basic Routes ===== */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'running',
    service: 'Version Control for Adobe Express',
    endpoints: {
      health: '/health',
      versions: '/api/versions',
    },
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.send('OK');
});

/* ===== Version Control Routes ===== */
app.use('/api', designRoutes);

/* ===== 404 ===== */
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

/* ===== Start Server ===== */
app.listen(config.port, () => {
  console.log(`🚀 Server running on the http://localhost:${config.port}`);
});
