import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './utils/db';
import minesRoutes from './routes/mines';
import diceRoutes from './routes/dice';
import blackjackRoutes from './routes/blackjack';
import forkRoutes from './routes/fork';
import userRoutes from './routes/user';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import { initWebSocket } from './utils/websocket';
import { Server } from 'http';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/games/mines', minesRoutes);
app.use('/api/games/dice', diceRoutes);
app.use('/api/games/blackjack', blackjackRoutes);
app.use('/api/games/fork', forkRoutes);
app.use('/api/user', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Database connection
connectDB()
  .then(() => {
    const server = app.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });

    // Initialize WebSocket server
    initWebSocket(server as Server);
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
