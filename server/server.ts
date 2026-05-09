import express, { Request, Response } from 'express';
import cors from "cors";
import 'dotenv/config';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth.js';
import userRouter from './routes/userRoutes.js';
import projectRouter from './routes/projectRoutes.js';
import { stripeWebhook } from './controllers/webhookControllers.js';

const app = express();
const port = process.env.PORT || 3000;

// CORS Configuration
const corsOptions = {
  origin: ['http://localhost:5173', 'https://ai-site-builder-nmc2.onrender.com'],
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization',
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));

app.all('/api/auth/{*any}', toNodeHandler(auth));



app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json({ limit: '50mb' }));

// Hooked up the user routes to the /api/user path
app.use('/api/user', userRouter);
app.use('/api/project', projectRouter);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.send('Server is Live!');
});

// Start Server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});