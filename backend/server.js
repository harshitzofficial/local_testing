// backend/server.js
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { gameRoutes } from './routes/gameRoutes.js'; // Import the routes!

const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors({ 
  origin: 'http://localhost:5173'
}));

app.use(express.json());

// Mount your routes to the root
app.use('/', gameRoutes);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});