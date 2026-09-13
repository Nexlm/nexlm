import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { startScheduler } from './jobs/scheduler.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { initSocket } from './socket/index.js';
import { platformKeypair } from './stellar/client.js';

const app = createApp();
const server = http.createServer(app);
const io = initSocket(server);
const stopScheduler = startScheduler();

server.listen(env.PORT, () => {
  logger.info(`Nexlm API listening on :${env.PORT} (${env.NODE_ENV}, Stellar ${env.STELLAR_NETWORK})`);
  logger.info(`Platform escrow signer: ${platformKeypair().publicKey()}`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received, shutting down`);
  stopScheduler();
  io.close();
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => logger.error('Unhandled rejection', { err }));
