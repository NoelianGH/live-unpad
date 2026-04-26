import express from 'express';
import dotenv from 'dotenv';
import { config } from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createRequire } from 'module';
import chatbotRoutes from './routes/chatbotRoutes.js';
import { connectDB } from './config/db.js';
import { disconnectDB } from './config/db.js';

config();
connectDB();

const require = createRequire(import.meta.url);
const swaggerFile = require('../swagger-output.json'); // ✅ auto-generated file

const app = express();
app.use(express.json());

app.use("/chatbot", chatbotRoutes);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  await disconnectDB();
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  await disconnectDB();
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await disconnectDB();
  process.exit(0);
});

export default server;