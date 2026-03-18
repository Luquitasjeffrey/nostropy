import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './utils/db';
import minesRoutes from './routes/mines';
import diceRoutes from './routes/dice';
import blackjackRoutes from './routes/blackjack';
import userRoutes from './routes/user';

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
app.use('/api/user', userRoutes);

// Database connection
connectDB()
  .then(() => {
    app.listen(port, host, () => {
      console.log(`Server is running on http://${host}:${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });
